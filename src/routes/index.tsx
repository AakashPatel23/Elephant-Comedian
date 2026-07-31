import { createFileRoute } from "@tanstack/react-router";
import { ElephantWorld } from "@/components/ElephantWorld";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pixel Elephant Playpen — An 8-Bit Elephant On Your Screen" },
      {
        name: "description",
        content:
          "A pastel purple playpen where an animated 8-bit elephant walks, trumpets, sits, bonks into walls and tells AI-generated jokes you can train.",
      },
      { property: "og:title", content: "Pixel Elephant Playpen" },
      {
        property: "og:description",
        content:
          "An animated 8-bit elephant that walks, trumpets, and tells AI jokes you can train yourself.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return <ElephantWorld />;
}
