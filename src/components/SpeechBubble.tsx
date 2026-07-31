export function SpeechBubble({ text }: { text: string }) {
  return (
    <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 w-64 -translate-x-1/2">
      <div className="rounded-md border-2 border-foreground bg-card px-3 py-2 font-pixel text-[9px] leading-[1.7] text-card-foreground shadow-[4px_4px_0_0_var(--color-foreground)]">
        {text || "..."}
      </div>
      <div className="mx-auto h-0 w-0 border-x-8 border-t-8 border-x-transparent border-t-foreground" />
    </div>
  );
}
