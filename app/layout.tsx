import type { Metadata } from "next";
import "./globals.css";
import { BASE_PATH } from "./base-path";

export const metadata: Metadata = {
  metadataBase: new URL("https://yosuke999.github.io/zjw-super3.0"),
  title: "中亚商机网｜中国商品直达中亚",
  description: "面向吉尔吉斯斯坦与乌兹别克斯坦商贩的中国源头商品采购平台。",
  openGraph: { title: "中亚商机网｜中国商品直达中亚", description: "中国源头好货，通向中亚生意。" },
  twitter: {
    card: "summary_large_image",
    title: "中亚商机网｜中国商品直达中亚",
    description: "中国源头好货，通向中亚生意。",
  },
  icons: { icon: `${BASE_PATH}/favicon.svg`, shortcut: `${BASE_PATH}/favicon.svg` },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="ru"><body>{children}</body></html>;
}
