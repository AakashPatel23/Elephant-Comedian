const TREES = [
  { left: "6%", scale: 1 },
  { left: "16%", scale: 0.75 },
  { left: "78%", scale: 0.85 },
  { left: "89%", scale: 1.1 },
];

function Tree({ left, scale }: { left: string; scale: number }) {
  return (
    <div
      className="pointer-events-none absolute bottom-24 origin-bottom"
      style={{ left, transform: `scale(${scale})` }}
    >
      <div className="mx-auto h-8 w-3 bg-[#8b5e34]" />
      <div className="absolute bottom-6 left-1/2 h-6 w-14 -translate-x-1/2 rounded-t-full bg-[#4c8c52]" />
      <div className="absolute bottom-10 left-1/2 h-6 w-10 -translate-x-1/2 rounded-t-full bg-[#5da364]" />
    </div>
  );
}

/** Grass, a couple of pixel trees, and a playpen fence along the ground and side edges. */
export function Scenery() {
  return (
    <>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-[#7fc26b] to-[#5aa752]" />

      {TREES.map((t) => (
        <Tree key={t.left} {...t} />
      ))}

      {/* fence rail along the top of the grass */}
      <div
        className="pointer-events-none absolute inset-x-0 bottom-24 h-4"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to right, #8b5e34 0 6px, transparent 6px 16px)",
        }}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-[6.75rem] h-1 bg-[#6b4423]" />

      {/* side fence posts, where the elephant bonks/climbs */}
      <div
        className="pointer-events-none absolute inset-y-0 left-0 w-3"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #8b5e34 0 14px, #6b4423 14px 16px)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 w-3"
        style={{
          backgroundImage:
            "repeating-linear-gradient(to bottom, #8b5e34 0 14px, #6b4423 14px 16px)",
        }}
      />
    </>
  );
}
