// app/sitemap.ts

import { MetadataRoute } from "next";
import { productSeo } from "@/lib/seoMap";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = "https://ecominex.net";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${baseUrl}/shop`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.6,
    },
  ];

  // Dynamic product pages from your seoMap
  const productPages: MetadataRoute.Sitemap = Object.keys(productSeo).map(
    (slug) => ({
      url: `${baseUrl}/shop/${slug}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })
  );

  // Optional: Fetch products from API/database
  // const res = await fetch("https://your-api.com/machines");
  // const machines = await res.json();
  // const apiProductPages = machines.map((machine) => ({
  //   url: `${baseUrl}/shop/${machine.machineName.toLowerCase().replace(/\s+/g, "-")}`,
  //   lastModified: new Date(machine.updatedAt),
  //   changeFrequency: "weekly" as const,
  //   priority: 0.8,
  // }));

  return [...staticPages, ...productPages];
}