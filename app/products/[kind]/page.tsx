import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BASE_PATH } from "../../base-path";
import { catalogProducts, getProduct, type Product } from "../../catalog";
import { currencyRates, supportedCurrencies, type Currency } from "../../currency";
import { kyrgyzProductNames } from "../../product-localization";
import ProductInquiryActions from "../../components/ProductInquiryActions";
import detailCopy from "../../content/product-detail-copy.json";

type Lang = "ru" | "ky" | "uz" | "zh";
type SearchValue = string | string[] | undefined;
type PageProps = {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ lang?: SearchValue; currency?: SearchValue }>;
};

const supportedLanguages: Lang[] = ["ru", "ky", "uz", "zh"];
const localeByLanguage: Record<Lang, string> = { ru: "ru-RU", ky: "ky-KG", uz: "uz-UZ", zh: "zh-CN" };


function firstValue(value: SearchValue) {
  return Array.isArray(value) ? value[0] : value;
}

function resolveLanguage(value: SearchValue): Lang {
  const candidate = firstValue(value);
  return supportedLanguages.includes(candidate as Lang) ? candidate as Lang : "ru";
}

function resolveCurrency(value: SearchValue): Currency {
  const candidate = firstValue(value);
  return supportedCurrencies.includes(candidate as Currency) ? candidate as Currency : "KGS";
}

function productName(product: Product, lang: Lang) {
  return lang === "ky" ? kyrgyzProductNames[product.kind] ?? product.name.ru : product.name[lang];
}

function numberFromPrice(value: string) {
  return Number(value.replace(/[^\d.]/g, ""));
}

function formatSelectedCurrency(cnyValue: number, currency: Currency, lang: Lang) {
  const digits = currency === "UZS" ? 0 : 2;
  const formatted = new Intl.NumberFormat(localeByLanguage[lang], { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(cnyValue * currencyRates[currency]);
  return currency === "CNY" ? `¥ ${formatted}` : `${currency} ${formatted}`;
}

function formatMarketCurrency(value: string, currency: "KGS" | "UZS", lang: Lang) {
  return `${currency} ${new Intl.NumberFormat(localeByLanguage[lang]).format(numberFromPrice(value))}`;
}

export function generateStaticParams() {
  return catalogProducts.map((product) => ({ kind: product.kind }));
}

export async function generateMetadata({ params, searchParams }: PageProps): Promise<Metadata> {
  const [{ kind }, query] = await Promise.all([params, searchParams]);
  const lang = resolveLanguage(query.lang);
  const product = getProduct(kind);
  const copy = detailCopy[lang];
  if (!product) return { title: { absolute: `${copy.notFound} | ${copy.brand}` }, robots: { index: false, follow: false } };
  const name = productName(product, lang);
  const description = `${name} · ${copy.sourcePrice} ${product.cost} · ${copy.moq} ${product.moq} ${copy.pieces} · ${copy.cities}`;
  return {
    title: { absolute: `${name} | ${copy.brand}` },
    description,
    alternates: { canonical: `/products/${product.kind}` },
    openGraph: { title: name, description, type: "website", images: [{ url: product.image, alt: name }] },
    twitter: { card: "summary_large_image", title: name, description, images: [product.image] },
  };
}

export default async function ProductPage({ params, searchParams }: PageProps) {
  const [{ kind }, query] = await Promise.all([params, searchParams]);
  const lang = resolveLanguage(query.lang);
  const currency = resolveCurrency(query.currency);
  const product = getProduct(kind);
  if (!product) notFound();

  const copy = detailCopy[lang];
  const name = productName(product, lang);
  const returnUrl = `/?lang=${lang}&currency=${currency}#products`;
  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    alternateName: Object.values(product.name),
    image: product.image,
    description: `${name} · ${copy.sourcePrice} · ${copy.moq} ${product.moq} ${copy.pieces}`,
    sku: product.kind,
    inLanguage: lang === "zh" ? "zh-CN" : lang,
    offers: {
      "@type": "Offer",
      priceCurrency: "CNY",
      price: numberFromPrice(product.cost),
      url: `/products/${product.kind}`,
    },
  };

  return <main className="detail-shell" lang={lang === "zh" ? "zh-CN" : lang}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }} />
    <header className="detail-header"><a href={`/?lang=${lang}&currency=${currency}`}>{copy.brand}<small>{copy.brandSub}</small></a><a href={returnUrl}>{copy.back}</a></header>
    <article className="product-detail">
      <div className="product-detail-photo"><Image src={`${BASE_PATH}${product.image}`} alt={name} fill priority sizes="(max-width: 760px) 100vw, 50vw" /></div>
      <div className="product-detail-copy">
        <span>{copy.kicker}</span>
        <h1>{name}</h1>
        <div className="detail-prices"><section><small>{copy.sourcePrice}</small><strong>{formatSelectedCurrency(numberFromPrice(product.cost), currency, lang)}</strong><span>{copy.unitNote}</span></section><section><small>{copy.retailPrice}</small><b>{copy.kgMarket} · {formatMarketCurrency(product.retail.kg, "KGS", lang)}</b><b>{copy.uzMarket} · {formatMarketCurrency(product.retail.uz, "UZS", lang)}</b></section></div>
        <dl><div><dt>{copy.moq}</dt><dd>{product.moq} {copy.pieces}</dd></div><div><dt>{copy.inquiries}</dt><dd>{product.orders.toLocaleString(localeByLanguage[lang])} {copy.inquiriesUnit}</dd></div><div><dt>{copy.destination}</dt><dd>{copy.cities}</dd></div><div><dt>{copy.transport}</dt><dd>{copy.transportValue}</dd></div></dl>
        <ProductInquiryActions
          lang={lang}
          currency={currency}
          product={{ kind: product.kind, name, image: product.image, moq: product.moq, costCny: numberFromPrice(product.cost) }}
        />
        <div className="detail-notice"><b>{copy.noticeTitle}</b><p>{copy.notice}</p></div>
        <a className="detail-list-link" href={returnUrl}>{copy.back}</a>
      </div>
    </article>
    <section className="detail-assurance">{copy.assurances.map(([title, description], index) => <article key={title}><b>{String(index + 1).padStart(2, "0")}</b><h2>{title}</h2><p>{description}</p></article>)}</section>
  </main>;
}
