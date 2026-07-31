import { useState } from "react";

const PRESETS = [
  "Silly, wholesome, kid-friendly elephant puns with classic setup-and-punchline format.",
  "Extremely dry, deadpan one-liners. No puns. Understated and a little bleak.",
  "Nerdy programmer jokes about bugs, git, and production incidents.",
  "Absurdist surreal humour where the punchline barely relates to the setup.",
];

export function TrainingPanel({
  style,
  onSave,
  onAskJoke,
}: {
  style: string;
  onSave: (next: string) => void;
  onAskJoke: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(style);

  return (
    <div className="absolute right-4 top-4 z-20 w-[min(22rem,calc(100vw-2rem))]">
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onAskJoke}
          className="rounded-sm border-2 border-foreground bg-card px-3 py-2 font-pixel text-[9px] text-foreground shadow-[3px_3px_0_0_var(--color-foreground)] transition-transform active:translate-y-[2px]"
        >
          tell joke
        </button>
        <button
          type="button"
          onClick={() => {
            setDraft(style);
            setOpen((v) => !v);
          }}
          className="rounded-sm border-2 border-foreground bg-accent px-3 py-2 font-pixel text-[9px] text-accent-foreground shadow-[3px_3px_0_0_var(--color-foreground)] transition-transform active:translate-y-[2px]"
        >
          {open ? "close" : "train jokes"}
        </button>
      </div>

      {open && (
        <div className="mt-2 rounded-md border-2 border-foreground bg-card/95 p-3 shadow-[4px_4px_0_0_var(--color-foreground)] backdrop-blur">
          <p className="font-pixel text-[9px] leading-5 text-foreground">joke training</p>
          <p className="mt-2 text-xs text-muted-foreground">
            Describe exactly the kind of jokes you want. This is sent to the AI as its standing
            instructions and is saved on this device.
          </p>
          <textarea
            value={draft}
            onChange={(ev) => setDraft(ev.target.value)}
            rows={5}
            maxLength={600}
            placeholder={PRESETS[0]}
            className="mt-2 w-full resize-none rounded-sm border border-border bg-background p-2 text-xs text-foreground outline-none focus:border-primary"
          />
          <div className="mt-2 flex flex-wrap gap-1">
            {PRESETS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setDraft(p)}
                className="rounded-sm bg-secondary px-2 py-1 text-[10px] text-secondary-foreground transition-colors hover:bg-accent"
              >
                {p.split(",")[0].split(".")[0]}
              </button>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                onSave(draft);
                setOpen(false);
              }}
              className="rounded-sm border-2 border-foreground bg-primary px-3 py-2 font-pixel text-[9px] text-primary-foreground"
            >
              save
            </button>
            <button
              type="button"
              onClick={() => {
                setDraft("");
                onSave("");
              }}
              className="rounded-sm border-2 border-border px-3 py-2 font-pixel text-[9px] text-muted-foreground"
            >
              reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
