import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import "./additions.css";
import AnalyticsTracker from "./components/AnalyticsTracker";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
const title = "中亚商机网｜中国商品直达中亚";
const description = "面向吉尔吉斯斯坦与乌兹别克斯坦商贩的中国源头商品采购平台。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s｜中亚商机网" },
  description,
  keywords: ["中国采购", "中亚贸易", "吉尔吉斯斯坦", "乌兹别克斯坦", "铁路物流", "批发商品"],
  alternates: { canonical: "/" },
  robots: { index: true, follow: true },
  openGraph: {
    title,
    description: "中国源头好货，通向中亚生意。",
    type: "website",
    locale: "ru_RU",
    alternateLocale: ["zh_CN", "uz_UZ"],
    images: [{ url: "/og.png", width: 1731, height: 909, alt: "中亚商机网——中国源头好货，直达中亚" }],
  },
  twitter: { card: "summary_large_image", title, description, images: ["/og.png"] },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "中亚商机网",
  url: siteUrl,
  description,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" suppressHydrationWarning>
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
        {children}
        <Suspense fallback={null}><AnalyticsTracker /></Suspense>
      </body>
    </html>
  );
}
