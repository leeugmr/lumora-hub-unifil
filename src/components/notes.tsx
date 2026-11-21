"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useData } from "@/lib/store";
import { newId, shortDate } from "@/lib/dates";
import { personShort } from "@/lib/people";
import type { RefType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SecondaryButton, inputClass } from "./ui-bits";

export function Notes({ refType, refId }: { refType: RefType; refId: string }) {
  const { db, insert, me } = useData();
  const [body, setBody] = useState("");
  const notes = useMemo(
    () => db.notes.filter((n) => n.ref_type === refType && n.ref_id === refId).sort((a, b) => b.created_at.localeCompare(a.created_at)),
    [db.notes, refType, refId],
  );

  function add() {
    const text = body.trim();
    if (!text) return;
    insert("notes", { id: newId("n"), ref_type: refType, ref_id: refId, body: text, author: me, created_at: new Date().toISOString() });
    setBody("");
    toast.success("Anotação salva");
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-3">
        <textarea
          rows={3}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          aria-label="Nova anotação"
          placeholder="O que aconteceu? Ligação, reunião, mensagem, ideia…"
          className={cn(inputClass, "min-h-[96px] resize-y")}
        />
        {body.trim() && (
          <SecondaryButton onClick={add} className="justify-self-end">
            Salvar anotação
          </SecondaryButton>
        )}
      </div>
      {notes.length > 0 && (
        <ol className="relative grid gap-5 border-l-2 border-line pl-5">
          {notes.map((n) => (
            <li key={n.id} className="relative">
              <span aria-hidden className="module absolute top-1.5 -left-[27px] size-3 bg-lime-deep" />
              <p className="text-[13px] text-fg-subtle">
                {shortDate(n.created_at)}
                {n.author ? `, ${personShort(n.author)}` : ""}
              </p>
              <p className="mt-1 text-base leading-relaxed whitespace-pre-line text-fg">{n.body}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
