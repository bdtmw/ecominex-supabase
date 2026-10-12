// app/shop/[id]/page.tsx

import { Metadata } from "next";
import { productSeo } from "@/lib/seoMap";
import ProductDetails from "./ProductDetails";

// ✅ List of share machine slugs for identification
const shareMachineSlugs = [
  "goldshell-kd-6-ii", // Share version has extra hyphen
  // Add more share machine slugs here
];

export async function generateMetadata({
  params,
}: {
  params: { id: string };
}): Promise<Metadata> {
  const slug = params.id;
  const baseUrl = "https://ecominex.net";

  // ✅ Check if it's a share machine by slug
  const isShareMachine = shareMachineSlugs.includes(slug);

  // ✅ Get SEO data from map
  const seo = productSeo[slug];

  // ✅ Default titles based on machine type
  const defaultTitle = isShareMachine
    ? "Mining Machine Shares | Fractional Investment | Ecominex"
    : "Mining Machine | Ecominex";

  const defaultDescription = isShareMachine
    ? "Invest in fractional mining shares. Low entry cost with proportional profits and secure checkout at Ecominex."
    : "Buy mining hardware with secure checkout and fast worldwide shipping at Ecominex.";

  const canonicalUrl = seo?.canonical || `${baseUrl}/shop/${slug}/`;

  return {
    title: seo?.title || defaultTitle,
    description: seo?.description || defaultDescription,
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: seo?.title || defaultTitle,
      description: seo?.description || defaultDescription,
      url: canonicalUrl,
      siteName: "Ecominex",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: seo?.title || defaultTitle,
      description: seo?.description || defaultDescription,
    },
  };
}

export default function ProductPage({ params }: { params: { id: string } }) {
  return <ProductDetails params={params} />;
}