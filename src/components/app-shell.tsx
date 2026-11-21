"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, FolderKanban, ListChecks, MoreHorizontal, NotebookPen, Settings, Share2, Sparkle, Users, Wallet } from "lucide-react";
import { useData } from "@/lib/store";
import { PEOPLE, PERSON } from "@/lib/people";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { LoginScreen, NewPasswordScreen, OutsiderScreen } from "./login-screen";
import { WhoAreYou } from "./who-are-you";
import { Avatar, Wordmark } from "./brand";

const NAV = [
  { href: "/", label: "Hoje", icon: ListChecks },
  { href: "/claude", label: "Briefing do Claude", icon: Sparkle },
  { href: "/pipeline", label: "Pipeline", icon: Compass },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/dinheiro", label: "Dinheiro", icon: Wallet },
  { href: "/conteudo", label: "Conteúdo", icon: CalendarDays },
  { href: "/decisoes", label: "Decisões", icon: FolderKanban },
  { href: "/notas", label: "Anotações", icon: NotebookPen },
  { href: "/mapa", label: "Mapa", icon: Share2 },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

// Celular: 4 abas fixas + "Mais" com o resto.
const MOBILE_TABS = ["/", "/pipeline", "/notas", "/mapa"];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

function Splash() {
  return (
    <div className="on-ink grid min-h-dvh place-items-center bg-ink" aria-busy="true" aria-label="Carregando o HUB">
      <Wordmark />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, session, me, setMe, ready, signOut, access, recovering } = useData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  if (mode === "supabase") {
    // Login real: a pessoa é definida pelo e-mail (lista da equipe), sem seletor.
    if (recovering && session) return <NewPasswordScreen />;
    if (!session) return ready ? <LoginScreen /> : <Splash />;
    if (access === "outsider") return <OutsiderScreen />;
    if (access === "unknown" || !me) return <Splash />;
  } else if (!me) {
    return <WhoAreYou onPick={setMe} />;
  }

  const person = PERSON[me!];

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[248px_1fr]">
      {/* Trilho lateral (desktop): seção escura, fixa em qualquer modo */}
      <aside className="on-ink sticky top-0 hidden h-dvh flex-col bg-ink px-5 py-7 text-on-ink md:flex">
        <Link href="/" className="rounded-sm px-2">
          <Wordmark />
        </Link>
        <nav aria-label="Principal" className="mt-12 flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-pill px-4 text-[15px] text-fog transition-colors hover:bg-white/[0.06] hover:text-on-ink",
                  active && "bg-lime/12 text-on-ink ring-1 ring-lime-glow/70 ring-inset",
                )}
              >
                <Icon className={cn("size-[18px]", active && "text-lime-glow")} strokeWidth={2.2} aria-hidden />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto space-y-3">
          {mode === "local" && (
            <p className="rounded-field bg-white/[0.04] px-4 py-3 text-[13px] leading-relaxed text-fog ring-1 ring-white/10 ring-inset">
              Modo local: os dados ficam só neste navegador até o Supabase ser ligado.
            </p>
          )}
          {mode === "supabase" ? (
            <div className="rounded-card bg-white/[0.04] p-3 ring-1 ring-white/10 ring-inset">
              <div className="flex items-center gap-3">
                <Avatar id={me!} className="size-10 bg-on-ink text-sm text-ink dark:bg-on-ink" />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-on-ink">{person.name}</p>
                  <p className="truncate text-[13px] text-fog">{session?.user.email}</p>
                </div>
              </div>
              <button onClick={signOut} className="mt-2 min-h-11 w-full rounded-pill text-[15px] text-fog ring-1 ring-white/15 ring-inset transition-colors hover:text-on-ink hover:ring-white/30">
                Sair da conta
              </button>
            </div>
          ) : (
            <PersonSwitcher />
          )}
        </div>
      </aside>

      {/* Barra superior (celular) */}
      <header className="on-ink sticky top-0 z-30 flex items-center justify-between bg-ink px-5 pt-[max(env(safe-area-inset-top),0.75rem)] pb-3 text-on-ink md:hidden">
        <Link href="/" className="rounded-sm">
          <Wordmark />
        </Link>
        <div className="relative">
          <button
            onClick={() => (mode === "supabase" ? setMenuOpen((o) => !o) : setMe(null))}
            aria-expanded={mode === "supabase" ? menuOpen : undefined}
            className="flex min-h-11 items-center gap-2 rounded-pill bg-white/[0.06] py-1 pr-4 pl-1.5 text-[15px] ring-1 ring-white/15 ring-inset"
            aria-label={mode === "supabase" ? `Conta de ${person.short}` : `Você está como ${person.short}. Trocar pessoa`}
          >
            <Avatar id={me!} className="size-8 bg-on-ink text-xs text-ink dark:bg-on-ink" />
            {person.short}
          </button>
          {mode === "supabase" && menuOpen && (
            <div className="absolute top-full right-0 z-40 mt-2 w-64 rounded-card bg-ink-raised p-3 shadow-card ring-1 ring-white/10 ring-inset">
              <p className="truncate px-1 text-[15px] font-semibold text-on-ink">{person.name}</p>
              <p className="truncate px-1 text-[13px] text-fog">{session?.user.email}</p>
              <button onClick={signOut} className="mt-3 min-h-11 w-full rounded-pill bg-white text-[15px] font-semibold text-ink">
                Sair da conta
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="min-w-0 pb-28 md:pb-16">{children}</main>

      {/* Abas (celular) */}
      <nav
        aria-label="Principal"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-raised/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
      >
        {NAV.filter((n) => MOBILE_TABS.includes(n.href)).map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              aria-current={active ? "page" : undefined}
              className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[12px] text-fg-subtle", active && "font-semibold text-fg")}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-pill transition-colors", active && "bg-lime text-navy")}>
                <Icon className="size-[18px]" strokeWidth={2.2} aria-hidden />
              </span>
              {label === "Anotações" ? "Notas" : label}
            </Link>
          );
        })}
        {(() => {
          const moreActive = NAV.some((n) => !MOBILE_TABS.includes(n.href) && isActive(pathname, n.href));
          return (
            <button
              onClick={() => setMoreOpen((o) => !o)}
              aria-expanded={moreOpen}
              className={cn("flex min-h-14 flex-col items-center justify-center gap-1 text-[12px] text-fg-subtle", (moreActive || moreOpen) && "font-semibold text-fg")}
            >
              <span className={cn("grid h-7 w-12 place-items-center rounded-pill transition-colors", moreActive && "bg-lime text-navy", moreOpen && !moreActive && "bg-surface-2")}>
                <MoreHorizontal className="size-[18px]" strokeWidth={2.2} aria-hidden />
              </span>
              Mais
            </button>
          );
        })()}
      </nav>

      {moreOpen && (
        <div className="fixed inset-x-3 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-40 rounded-card bg-raised p-2 shadow-card ring-1 ring-line ring-inset md:hidden">
          {NAV.filter((n) => !MOBILE_TABS.includes(n.href)).map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMoreOpen(false)}
              aria-current={isActive(pathname, href) ? "page" : undefined}
              className={cn("flex min-h-12 items-center gap-3 rounded-field px-4 text-base text-fg hover:bg-surface-2", isActive(pathname, href) && "bg-lime/12 font-semibold ring-2 ring-lime-deep ring-inset")}
            >
              <Icon className="size-5 text-fg-muted" strokeWidth={2.2} aria-hidden />
              {label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function PersonSwitcher() {
  const { me, setMe } = useData();
  return (
    <label className="block">
      <span className="mb-1.5 block px-1 text-[13px] text-fog-dim">Você está como</span>
      <select
        value={me ?? ""}
        onChange={(e) => setMe((e.target.value || null) as never)}
        className="field min-h-11 w-full rounded-pill border-0 bg-white/[0.06] px-4 text-[15px] text-on-ink ring-1 ring-white/15 ring-inset"
      >
        {PEOPLE.map((p) => (
          <option key={p.id} value={p.id} className="bg-ink text-on-ink">
            {p.short}, {p.area.toLowerCase()}
          </option>
        ))}
      </select>
    </label>
  );
}
