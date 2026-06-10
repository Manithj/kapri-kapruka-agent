import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Kapri · Kapruka gift concierge",
    short_name: "Kapri",
    description: "Sri Lanka's warmest AI shopping concierge. Chat your way to the perfect gift.",
    start_url: "/",
    display: "standalone",
    background_color: "#FBF7F0",
    theme_color: "#0E5B4A",
    lang: "en",
    categories: ["shopping", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
