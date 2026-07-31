import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const JokeInput = z.object({
  style: z.string().max(600).optional(),
  recent: z.array(z.string()).max(10).optional(),
  name: z.string().max(40).optional(),
});

export const tellJoke = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => JokeInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const style =
      data.style?.trim() ||
      "Silly, wholesome, kid-friendly elephant puns. Classic setup-and-punchline format.";

    const system = [
      `You are ${data.name || "an"} 8-bit pixel elephant who tells one short joke at a time.`,
      "TRAINING / STYLE INSTRUCTIONS FROM THE OWNER (follow these strictly):",
      style,
      "Rules: reply with ONLY the joke text. Max 180 characters. No quotes, no emoji, no preamble, no explanation.",
    ].join("\n");

    const avoid = data.recent?.length
      ? `Do not repeat or closely rework any of these: ${data.recent.join(" | ")}`
      : "Tell a fresh joke.";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
      },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: avoid },
        ],
      }),
    });

    if (res.status === 429) throw new Error("RATE_LIMIT");
    if (res.status === 402) throw new Error("NO_CREDITS");
    if (!res.ok) throw new Error(`AI error ${res.status}`);

    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const joke = json.choices?.[0]?.message?.content?.trim().replace(/^["']|["']$/g, "");
    if (!joke) throw new Error("Empty joke");
    return { joke: joke.slice(0, 240) };
  });
