import type { Metadata } from 'next';
import { headers } from 'next/headers';
import './globals.css';

const title = '中亚商机网｜中国商品直达中亚';
const description = '面向吉尔吉斯斯坦与乌兹别克斯坦商贩的中国源头商品采购平台。';

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get('host') ?? '';
  const hostname = host.split(':')[0].toLowerCase();
  const trustedHost = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('zhongya-shangji.');
  const origin = trustedHost ? `${hostname === 'localhost' || hostname === '127.0.0.1' ? 'http' : 'https'}://${host}` : 'http://localhost:3001';
  const socialImage = `${origin}/og.png`;

  return {
    title,
    description,
    openGraph: { title, description: '中国源头好货，通向中亚生意。', type: 'website', locale: 'ru_RU', images: [{ url: socialImage, width: 1731, height: 909, alt: '中亚商机网——中国源头好货，直达中亚' }] },
    twitter: { card: 'summary_large_image', title, description, images: [socialImage] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
