import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "FutureHR · İnsan ve Yetenek Karar Platformu",
    short_name: "FutureHR",
    description: "Performans, yetenek, gelişim, kariyer, halefiyet ve ücret kararları için People Intelligence platformu.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#07111B",
    theme_color: "#0D1925",
    lang: "tr-TR",
    orientation: "any",
    categories: ["business", "productivity"],
  };
}
