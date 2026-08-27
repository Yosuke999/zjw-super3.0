import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { BASE_PATH } from "../../base-path";
import { catalogProducts, getProduct, type Product } from "../../catalog";
import { currencyRates, supportedCurrencies, type Currency } from "../../currency";
import { kyrgyzProductNames } from "../../product-localization";
import ProductInquiryActions from "../../components/ProductInquiryActions";

type Lang = "ru" | "ky" | "uz" | "zh";
type SearchValue = string | string[] | undefined;
type PageProps = {
  params: Promise<{ kind: string }>;
  searchParams: Promise<{ lang?: SearchValue; currency?: SearchValue }>;
};

const supportedLanguages: Lang[] = ["ru", "ky", "uz", "zh"];
const localeByLanguage: Record<Lang, string> = { ru: "ru-RU", ky: "ky-KG", uz: "uz-UZ", zh: "zh-CN" };

const detailCopy = {
  ru: {
    brand: "ТОРГОВЛЯ С ЦЕНТРАЛЬНОЙ АЗИЕЙ", brandSub: "ПРЯМЫЕ ПОСТАВКИ", back: "← Назад к товарам",
    kicker: "Закупка напрямую из Китая · Проверенный товар", sourcePrice: "Закупочная цена в Китае", unitNote: "за штуку · без доставки и других расходов",
    retailPrice: "Розничная цена на рынке", kgMarket: "Кыргызстан", uzMarket: "Узбекистан", moq: "Минимальная партия", pieces: "шт.",
    inquiries: "Запросов на платформе", inquiriesUnit: "запросов", destination: "Направление доставки", cities: "Бишкек / Ташкент",
    transport: "Способ доставки", transportValue: "Преимущественно по железной дороге, по подтверждённой смете",
    noticeTitle: "Пояснение к цене", notice: "Цены на странице являются ориентировочными и предназначены для первичного сравнения товаров. Характеристики, упаковка, наличие, сроки, доставка, налоги и итоговая цена подтверждаются ручным расчётом и официальным предложением.",
    cta: "Вернуться к списку и добавить в запрос →", assurances: [
      ["Подтверждение характеристик", "До заказа отдельно подтверждаем модель, цвет, материал, упаковку и количество."],
      ["Проверка поставщика", "До начала сотрудничества проверяем регистрационные данные, возможности поставки и образцы."],
      ["Прозрачная смета", "Закупочная цена, доставка и связанные расходы указываются отдельными строками в итоговом предложении."],
    ],
    notFound: "Товар не найден",
  },
  ky: {
    brand: "БОРБОР АЗИЯ СООДАСЫ", brandSub: "ТҮЗ ЖЕТКИРҮҮ", back: "← Товарлар тизмесине кайтуу",
    kicker: "Кытайдан түз сатып алуу · Текшерилген товар", sourcePrice: "Кытайдагы сатып алуу баасы", unitNote: "бир даана үчүн · жеткирүү жана башка чыгымдарсыз",
    retailPrice: "Жергиликтүү чекене баа", kgMarket: "Кыргызстан", uzMarket: "Өзбекстан", moq: "Эң аз буйрутма", pieces: "даана",
    inquiries: "Платформадагы сурамдар", inquiriesUnit: "сурам", destination: "Жеткирүү багыты", cities: "Бишкек / Ташкент",
    transport: "Жеткирүү жолу", transportValue: "Негизинен темир жол менен, тастыкталган эсеп боюнча",
    noticeTitle: "Баага түшүндүрмө", notice: "Барактагы баалар товарларды алгачкы салыштыруу үчүн берилген болжолдуу маалымат. Мүнөздөмөлөр, таңгак, кампа, мөөнөт, жеткирүү, салыктар жана акыркы баа кол менен эсептелип, расмий сунушта ырасталат.",
    cta: "Тизмеге кайтып, сурамга кошуу →", assurances: [
      ["Мүнөздөмөлөрдү ырастоо", "Буйрутмага чейин модель, түс, материал, таңгак жана сан өзүнчө такталат."],
      ["Жеткирүүчүнү текшерүү", "Кызматташууга чейин каттоо маалыматтары, жеткирүү мүмкүнчүлүгү жана үлгүлөр текшерилет."],
      ["Ачык эсеп", "Сатып алуу, жеткирүү жана тиешелүү чыгымдар акыркы сунушта өзүнчө көрсөтүлөт."],
    ],
    notFound: "Товар табылган жок",
  },
  uz: {
    brand: "MARKAZIY OSIYO SAVDOSI", brandSub: "TO‘G‘RIDAN-TO‘G‘RI YETKAZISH", back: "← Mahsulotlar ro‘yxatiga qaytish",
    kicker: "Xitoydan to‘g‘ridan-to‘g‘ri xarid · Tekshirilgan mahsulot", sourcePrice: "Xitoydagi xarid narxi", unitNote: "har dona uchun · yetkazish va boshqa xarajatlarsiz",
    retailPrice: "Mahalliy chakana narx", kgMarket: "Qirg‘iziston", uzMarket: "O‘zbekiston", moq: "Minimal buyurtma", pieces: "dona",
    inquiries: "Platformadagi so‘rovlar", inquiriesUnit: "so‘rov", destination: "Yetkazish yo‘nalishi", cities: "Bishkek / Toshkent",
    transport: "Yetkazish usuli", transportValue: "Asosan temir yo‘l orqali, tasdiqlangan hisob bo‘yicha",
    noticeTitle: "Narx izohi", notice: "Sahifadagi narxlar mahsulotlarni dastlabki taqqoslash uchun berilgan taxminiy ma’lumotlardir. Xususiyatlar, qadoq, mavjudlik, muddat, yetkazish, soliqlar va yakuniy narx qo‘lda hisoblanib, rasmiy taklifda tasdiqlanadi.",
    cta: "Ro‘yxatga qaytib, so‘rovga qo‘shish →", assurances: [
      ["Xususiyatlarni tasdiqlash", "Buyurtmadan oldin model, rang, material, qadoq va miqdor alohida tasdiqlanadi."],
      ["Yetkazib beruvchini tekshirish", "Hamkorlikdan oldin ro‘yxat ma’lumotlari, yetkazish imkoniyati va namunalar tekshiriladi."],
      ["Shaffof hisob", "Xarid, yetkazish va tegishli xarajatlar yakuniy taklifda alohida ko‘rsatiladi."],
    ],
    notFound: "Mahsulot topilmadi",
  },
  zh: {
    brand: "中亚商机网", brandSub: "中国源头直供", back: "← 返回商品列表",
    kicker: "中国源头采购 · 已核验商品", sourcePrice: "中国采购参考价", unitNote: "每件 · 不含物流及其他费用",
    retailPrice: "当地零售参考", kgMarket: "吉尔吉斯斯坦", uzMarket: "乌兹别克斯坦", moq: "最低起订量", pieces: "件",
    inquiries: "平台询价记录", inquiriesUnit: "次", destination: "运输目的地", cities: "比什凯克 / 塔什干",
    transport: "运输方式", transportValue: "铁路为主，按确认报价执行",
    noticeTitle: "报价说明", notice: "页面价格为选品参考价，用于初步比较。实际规格、包装、库存、交期、物流、税费及最终到货价，以人工核价和正式报价单为准。",
    cta: "返回列表并加入询价单 →", assurances: [
      ["规格确认", "下单前逐项确认型号、颜色、材质、包装和数量。"],
      ["供应商核验", "正式合作前核验营业资质、供货能力与样品记录。"],
      ["透明报价", "采购、运输及相关费用在最终报价单中单独列明。"],
    ],
    notFound: "商品未找到",
  },
} as const;

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
