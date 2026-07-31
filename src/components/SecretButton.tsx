import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

const SECRET_PASSWORD = "00136789";

/** Top-right easter-egg trigger: a password-gated button that unlocks a special reaction. */
export function SecretButton({ onUnlock }: { onUnlock: () => void }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState(false);

  const submit = () => {
    if (draft === SECRET_PASSWORD) {
      setOpen(false);
      setDraft("");
      setError(false);
      onUnlock();
    } else {
      setError(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="absolute right-4 top-4 z-20 rounded-sm bg-foreground/15 px-2 py-1.5 font-pixel text-[7px] leading-relaxed text-foreground backdrop-blur-[2px] transition-colors hover:bg-foreground/25 sm:text-[8px]"
      >
        Click to hear something special
      </button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setDraft("");
            setError(false);
          }
        }}
      >
        <DialogContent className="font-pixel">
          <DialogHeader>
            <DialogTitle className="font-pixel text-sm">Enter the password</DialogTitle>
            <DialogDescription className="font-pixel text-[10px] leading-5">
              shh... this one&apos;s a secret.
            </DialogDescription>
          </DialogHeader>
          <Input
            type="password"
            value={draft}
            onChange={(ev) => {
              setDraft(ev.target.value);
              setError(false);
            }}
            onKeyDown={(ev) => {
              if (ev.key === "Enter") submit();
            }}
            autoFocus
            className="font-pixel text-xs"
          />
          {error && (
            <p className="font-pixel text-[10px] text-destructive">
              that&apos;s not it — try again.
            </p>
          )}
          <DialogFooter>
            <Button type="button" onClick={submit} className="font-pixel text-xs">
              Enter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
