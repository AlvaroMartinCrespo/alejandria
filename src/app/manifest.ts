import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Alejandría",
    short_name: "Alejandría",
    description: "Alejandría, tu biblioteca personal siempre a mano.",
    start_url: "/",
    display: "standalone",
    background_color: "#0b0c0c",
    theme_color: "#b8f34a",
    lang: "es",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}