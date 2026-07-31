import { createFileRoute } from "@tanstack/react-router";
import { ElephantWorld } from "@/components/ElephantWorld";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Elephant Comedian Playpen" },
      {
        name: "description",
        content:
          "A pastel purple playpen where an animated 8-bit elephant walks, trumpets, sits, bonks into walls and tells AI-generated jokes",
      },
      { property: "og:title", content: "Elephant Comedian Playpen" },
      {
        property: "og:description"
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
