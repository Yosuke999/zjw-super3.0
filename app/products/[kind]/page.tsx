/* eslint-disable @next/next/no-html-link-for-pages -- Vinext's local client router currently throws when returning to the client-rendered catalog; a document navigation is intentional here. */
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BASE_PATH } from "../../base-path";
import { catalogProducts, getProduct } from "../../catalog";

type PageProps = { params: Promise<{ kind: string }> };

export function generateStaticParams() {
  return catalogProducts.map((product) => ({ kind: product.kind }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { kind } = await params;
  const product = getProduct(kind);
  if (!product) return { title: "商品未找到", robots: { index: false, follow: false } };
  const description = `${product.name.zh}，中国采购参考价 ${product.cost}，最低 ${product.moq} 件起订，可发往吉尔吉斯斯坦与乌兹别克斯坦。`;
  return {
    title: product.name.zh,
    description,
    alternates: { canonical: `/products/${product.kind}` },
    openGraph: { title: product.name.zh, description, type: "website", images: [{ url: product.image, alt: product.name.zh }] },
    twitter: { card: "summary_large_image", title: product.name.zh, description, images: [product.image] },
  };
}

export default async function ProductPage({ params }: PageProps) {
  const { kind } = await params;
  const product = getProduct(kind);
  if (!product) notFound();

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name.zh,
    alternateName: [product.name.ru, product.name.uz],
    image: product.image,
    description: `${product.name.zh}，中国源头批发采购参考，最低 ${product.moq} 件起订。`,
    sku: product.kind,
    offers: {
      "@type": "Offer",
      priceCurrency: "CNY",
      price: product.cost.replace(/[^\d.]/g, ""),
      url: `/products/${product.kind}`,
    },
  };

  return <main className="detail-shell">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
    <header className="detail-header"><a href="/">中亚商机网 <small>ЦЕНТРАЛЬНАЯ АЗИЯ</small></a><a href="/#products">← 返回商品列表</a></header>
    <article className="product-detail">
      <div className="product-detail-photo"><Image src={`${BASE_PATH}${product.image}`} alt={product.name.zh} fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div>
      <div className="product-detail-copy">
        <span>中国源头采购 · ПРОВЕРЕННЫЙ ТОВАР</span>
        <h1>{product.name.zh}</h1>
        <p className="detail-local-names">{product.name.ru}<br />{product.name.uz}</p>
        <div className="detail-prices"><section><small>中国采购参考价</small><strong>{product.cost}</strong><span>每件 · 不含物流及其他费用</span></section><section><small>当地零售参考</small><b>KG {product.retail.kg}</b><b>UZ {product.retail.uz}</b></section></div>
        <dl><div><dt>最低起订量</dt><dd>{product.moq} 件</dd></div><div><dt>平台询价记录</dt><dd>{product.orders.toLocaleString("zh-CN")} 次</dd></div><div><dt>运输目的地</dt><dd>比什凯克 / 塔什干</dd></div><div><dt>运输方式</dt><dd>铁路为主，按报价确认</dd></div></dl>
        <div className="detail-notice"><b>报价说明</b><p>页面价格为本地演示数据，用于初步选品比较。实际规格、包装、库存、交期、物流、税费及最终到货价，以人工核价和正式报价单为准。</p></div>
        <a className="detail-cta" href="/#products">返回列表并加入询价单 →</a>
      </div>
    </article>
    <section className="detail-assurance"><article><b>01</b><h2>规格确认</h2><p>下单前逐项确认型号、颜色、材质、包装和数量。</p></article><article><b>02</b><h2>供应商核验</h2><p>正式合作前补充营业资质、产能与样品核验记录。</p></article><article><b>03</b><h2>透明报价</h2><p>采购、运输及相关费用按最终报价单单独列明。</p></article></section>
  </main>;
}
