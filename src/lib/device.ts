"use client";

// O aparelho: app instalado (PWA), avisos (Web Push) e o pedido de instalação do navegador.

import { getSupabase } from "./supabase";
import type { PersonId } from "./types";

/** Chave pública VAPID (a privada fica no Vault do Supabase, usada pela função notify). */
export const VAPID_PUBLIC_KEY = "BBeEPMuUTDTV8x8cXG0R7Ae-O8u9D0Z5asXXiyEFLVl0x8mG6RrlMvm-2H29ojpPUJDHRPIKTBK1e-tZ3l7nW78";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };
let installEvent: InstallEvent | null = null;
const listeners = new Set<() => void>();

/** Registra o service worker e guarda o pedido de instalação para a tela Ajustes. */
let started = false;

export function setupDevice() {
  if (typeof window === "undefined" || started) return;
  started = true;
  if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch((e) => console.error("service worker", e));
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    installEvent = e as InstallEvent;
    listeners.forEach((l) => l());
  });
  window.addEventListener("appinstalled", () => {
    installEvent = null;
    listeners.forEach((l) => l());
  });
}

export function onInstallChange(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function canPromptInstall() {
  return installEvent !== null;
}

export async function promptInstall() {
  if (!installEvent) return false;
  await installEvent.prompt();
  const { outcome } = await installEvent.userChoice;
  installEvent = null;
  listeners.forEach((l) => l());
  return outcome === "accepted";
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export function isIOS() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function pushSupported() {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function keyBytes(base64url: string) {
  const pad = "=".repeat((4 - (base64url.length % 4)) % 4);
  const raw = atob((base64url + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export async function currentSubscription() {
  if (!pushSupported()) return null;
  const reg = await navigator.serviceWorker.ready;
  return reg.pushManager.getSubscription();
}

/** Pede permissão, inscreve o aparelho e guarda a inscrição no Supabase (só o dono vê). */
export async function enablePush(person: PersonId): Promise<"ok" | "denied" | "unsupported" | "error"> {
  if (!pushSupported()) return "unsupported";
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return "denied";
  try {
    const reg = await navigator.serviceWorker.ready;
    const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC_KEY) }));
    const json = sub.toJSON();
    const sb = getSupabase();
    if (!sb) return "error";
    const { error } = await sb
      .from("push_subscriptions")
      .upsert({ endpoint: sub.endpoint, person, p256dh: json.keys?.p256dh ?? "", auth: json.keys?.auth ?? "" });
    if (error) throw error;
    return "ok";
  } catch (e) {
    console.error(e);
    return "error";
  }
}

export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  await getSupabase()?.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

export async function sendTestPush() {
  const { error } = (await getSupabase()?.rpc("hub_test_push")) ?? { error: new Error("sem Supabase") };
  return !error;
}
