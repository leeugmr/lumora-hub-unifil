"use client";

import { PEOPLE } from "@/lib/people";
import type { PersonId } from "@/lib/types";
import { Avatar, Wordmark } from "./brand";

export function WhoAreYou({ onPick }: { onPick: (p: PersonId) => void }) {
  return (
    <div className="on-ink grid min-h-dvh place-items-center bg-ink px-5 py-12 text-on-ink">
      <div className="w-full max-w-md">
        <div>
          <Wordmark />
        </div>
        <p className="kicker mt-14">Fundadores</p>
        <h1 className="mt-4 text-[clamp(36px,5vw,52px)] leading-[1.04] font-medium tracking-[-0.04em] text-on-ink">
          Quem está
          <br />
          <span className="text-lime-glow">usando agora?</span>
        </h1>
        <p className="mt-4 text-[17px] leading-relaxed text-fog">O HUB abre com os próximos passos de quem você escolher. Dá para trocar depois.</p>
        <ul className="mt-9 grid gap-3">
          {PEOPLE.map((p) => (
            <li key={p.id}>
              <button
                onClick={() => onPick(p.id)}
                className="flex w-full items-center gap-4 rounded-card bg-white/[0.04] px-4 py-3.5 text-left ring-1 ring-white/[0.12] ring-inset transition-shadow hover:shadow-glow-lime hover:ring-lime-glow/50"
              >
                <Avatar id={p.id} className="size-11 bg-on-ink text-sm text-ink dark:bg-on-ink" />
                <span>
                  <span className="block text-[17px] font-semibold text-on-ink">{p.name}</span>
                  <span className="block text-[15px] text-fog">{p.area}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
