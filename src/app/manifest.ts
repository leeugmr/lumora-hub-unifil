import type { MetadataRoute } from "next";

// O HUB como app no celular (tela inicial, sem barra do navegador).
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Lumora HUB",
    short_name: "HUB",
    description: "A operação da Lumora em um só lugar.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#070e18",
    theme_color: "#070e18",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Hoje", url: "/", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Pipeline", url: "/pipeline", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Dinheiro", url: "/dinheiro", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
