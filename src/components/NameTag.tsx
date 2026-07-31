import { useEffect, useRef, useState } from "react";

export function NameTag({ name, onRename }: { name: string; onRename: (next: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => setDraft(name), [name]);
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const commit = () => {
    onRename(draft);
    setEditing(false);
  };

  return (
    <div className="mb-1 select-none">
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          maxLength={20}
          onChange={(ev) => setDraft(ev.target.value)}
          onBlur={commit}
          onKeyDown={(ev) => {
            if (ev.key === "Enter") commit();
            if (ev.key === "Escape") setEditing(false);
          }}
          className="w-36 rounded-sm border border-primary/40 bg-card/70 px-2 py-1 text-center font-pixel text-[9px] text-foreground outline-none backdrop-blur-sm"
        />
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded-sm bg-foreground/25 px-2 py-1 font-pixel text-[9px] text-card backdrop-blur-[2px] transition-colors hover:bg-foreground/40"
        >
          {name}
        </button>
      )}
    </div>
  );
}
