"use client";

// O mundo lá fora na tela Hoje: relógio, clima de São Paulo (Open-Meteo, sem chave)
// e notícias de tecnologia (rota /api/noticias, RSS com cache de 30 min).

import { useEffect, useState } from "react";
import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Moon, Sun, type LucideIcon } from "lucide-react";
import type { NewsItem, NewsResponse } from "@/app/api/noticias/route";
import { cn } from "@/lib/utils";
import { SectionTitle, Segmented } from "./ui-bits";

const CITY = { name: "São Paulo", lat: -23.55, lon: -46.63 };
const WEATHER_URL =
  `https://api.open-meteo.com/v1/forecast?latitude=${CITY.lat}&longitude=${CITY.lon}` +
  "&current=temperature_2m,weather_code,is_day&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
  "&timezone=America%2FSao_Paulo&forecast_days=1";

type Weather = { temp: number; code: number; day: boolean; max: number; min: number; rain: number | null };

/** Código WMO → texto e ícone. */
function describe(code: number, day: boolean): [string, LucideIcon] {
  if (code === 0) return ["Céu limpo", day ? Sun : Moon];
  if (code <= 2) return ["Poucas nuvens", day ? CloudSun : Cloud];
  if (code === 3) return ["Nublado", Cloud];
  if (code <= 48) return ["Neblina", CloudFog];
  if (code <= 57) return ["Garoa", CloudDrizzle];
  if (code <= 67 || (code >= 80 && code <= 82)) return ["Chuva", CloudRain];
  if (code <= 77 || code === 85 || code === 86) return ["Neve", CloudSnow];
  return ["Tempestade", CloudLightning];
}

function useNow() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return now;
}

function useWeather() {
  const [w, setW] = useState<Weather | null>(null);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch(WEATHER_URL);
        if (!r.ok) return;
        const j = await r.json();
        if (!alive) return;
        setW({
          temp: Math.round(j.current.temperature_2m),
          code: j.current.weather_code,
          day: j.current.is_day === 1,
          max: Math.round(j.daily.temperature_2m_max[0]),
          min: Math.round(j.daily.temperature_2m_min[0]),
          rain: j.daily.precipitation_probability_max?.[0] ?? null,
        });
      } catch {
        /* sem clima: o bloco some */
      }
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);
  return w;
}

/** Hora e clima de agora, para a seção escura da tela Hoje. */
export function ClockWeather() {
  const now = useNow();
  const w = useWeather();
  const time = now?.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  const [label, Icon] = w ? describe(w.code, w.day) : ["", Cloud];

  return (
    <div className="flex items-center gap-5 text-on-ink">
      <time
        dateTime={now?.toISOString()}
        className="min-w-[3.6ch] text-[28px] leading-none font-medium tracking-[-0.03em] tabular-nums md:text-[34px]"
        aria-label={time ? `Agora são ${time}` : undefined}
      >
        {time ?? "--:--"}
      </time>
      <span aria-hidden className="h-9 w-px bg-white/15" />
      {w ? (
        <div className="flex items-center gap-3" aria-label={`${CITY.name}: ${w.temp} graus, ${label.toLowerCase()}`}>
          <Icon className="size-7 shrink-0 text-lime-glow" strokeWidth={1.8} aria-hidden />
          <div aria-hidden>
            <p className="text-[22px] leading-none font-medium tracking-[-0.02em] tabular-nums">{w.temp}°</p>
            <p className="mt-1 text-[13px] leading-tight text-fog">
              {CITY.name}, {label.toLowerCase()}
              <br />
              máx {w.max}°, mín {w.min}°{w.rain != null && w.rain >= 20 ? `, chuva ${w.rain}%` : ""}
            </p>
          </div>
        </div>
      ) : (
        <span className="text-[13px] text-fog-dim">{CITY.name}</span>
      )}
    </div>
  );
}

function ago(iso: string | null, now: number) {
  if (!iso) return "";
  const min = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (min < 2) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "ontem" : `há ${d} dias`;
}

/** Manchetes de tecnologia, Brasil e mundo. */
export function TechNews({ className }: { className?: string }) {
  const [data, setData] = useState<NewsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<"brasil" | "mundo">("brasil");
  const [more, setMore] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await fetch("/api/noticias");
        if (!r.ok) throw new Error(String(r.status));
        const j: NewsResponse = await r.json();
        if (alive) {
          setData(j);
          setFailed(false);
          setNow(Date.now());
        }
      } catch {
        if (alive) setFailed(true);
      }
    };
    load();
    const id = setInterval(load, 30 * 60 * 1000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const items: NewsItem[] = data?.[tab] ?? [];
  const shown = more ? items : items.slice(0, 6);

  return (
    <section aria-labelledby="mundo-tech" className={className}>
      <SectionTitle id="mundo-tech">Mundo tech</SectionTitle>
      <div className="mt-3">
        <Segmented
          label="Origem das notícias"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setMore(false);
          }}
          options={[
            ["brasil", "Brasil"],
            ["mundo", "Mundo"],
          ]}
        />
      </div>

      {!data && !failed && (
        <ul className="mt-4" aria-busy="true" aria-label="Carregando notícias">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="border-b border-line py-4">
              <span className="block h-4 w-11/12 animate-pulse rounded-xs bg-surface-2" />
              <span className="mt-2 block h-4 w-2/3 animate-pulse rounded-xs bg-surface-2" />
            </li>
          ))}
        </ul>
      )}
      {failed && !data && <p className="mt-4 text-[15px] text-fg-muted">Não deu para carregar as notícias agora.</p>}
      {data && items.length === 0 && <p className="mt-4 text-[15px] text-fg-muted">Nenhuma notícia nas fontes agora.</p>}

      {shown.length > 0 && (
        <ul className="mt-2">
          {shown.map((n) => (
            <li key={n.link} className="border-b border-line last:border-b-0">
              <a
                href={n.link}
                target="_blank"
                rel="noopener noreferrer"
                lang={tab === "mundo" ? "en" : "pt-BR"}
                className="group block rounded-sm py-3.5 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-focus"
              >
                <span className="line-clamp-3 text-[15px] leading-snug font-medium text-fg group-hover:underline group-hover:decoration-lime-deep group-hover:decoration-2 group-hover:underline-offset-4">
                  {n.title}
                </span>
                <span className="mt-1 block text-[13px] text-fg-subtle" lang="pt-BR">
                  {n.source}
                  {n.date ? `, ${ago(n.date, now)}` : ""}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}

      {items.length > 6 && (
        <button
          onClick={() => setMore((m) => !m)}
          className={cn("mt-2 min-h-11 text-[15px] font-medium text-fg-muted hover:text-fg")}
        >
          {more ? "Mostrar menos" : `Ver mais ${items.length - 6}`}
        </button>
      )}
    </section>
  );
}
