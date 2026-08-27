"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { BASE_PATH } from "./base-path";
import { catalogProducts, type ProductBadge } from "./catalog";
import { buildProductHref, currencyOptions, formatCurrency, formatExchangeRate, formatUnitCurrency, supportedCurrencies, type Currency } from "./currency";
import { kyrgyzProductNames } from "./product-localization";
import CustomerServiceDock from "./components/CustomerServiceDock";
import { customerServiceCopy, type ContactMethod } from "./customer-service";
import { getClientContext } from "./lib/analytics-client";
import inquiryCopy from "./content/inquiry-copy.json";
import logisticsNews from "./content/logistics-news.json";

type Lang = "ru" | "ky" | "uz" | "zh";
type CategoryId = "home" | "fashion" | "tools" | "digital" | "auto" | "beauty";
type LogoVariant = 1 | 2 | 3 | 4 | 5 | 6;

const preferenceStorageKey = "central-asia-trade.preferences";
const supportedLanguages: Lang[] = ["ru", "ky", "uz", "zh"];
type Preferences = { lang: Lang; currency: Currency };

const defaultPreferences: Preferences = { lang: "ru", currency: "KGS" };
const preferenceSubscribers = new Set<() => void>();
let currentPreferences = defaultPreferences;
let cachedStoredPreferences: string | null | undefined;

function parseStoredPreferences(raw: string | null): Preferences {
  if (!raw) return defaultPreferences;
  try {
    const parsed = JSON.parse(raw) as { lang?: string; currency?: string };
    return {
      lang: supportedLanguages.includes(parsed.lang as Lang) ? parsed.lang as Lang : defaultPreferences.lang,
      currency: supportedCurrencies.includes(parsed.currency as Currency) ? parsed.currency as Currency : defaultPreferences.currency,
    };
  } catch {
    return defaultPreferences;
  }
}

function getPreferencesSnapshot() {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const stored = window.localStorage.getItem(preferenceStorageKey);
    if (stored !== cachedStoredPreferences) {
      cachedStoredPreferences = stored;
      currentPreferences = parseStoredPreferences(stored);
    }
  } catch {
    // Keep the in-memory preference when browser storage is unavailable.
  }
  return currentPreferences;
}

function subscribeToPreferences(callback: () => void) {
  preferenceSubscribers.add(callback);
  const syncFromAnotherTab = (event: StorageEvent) => {
    if (event.key !== preferenceStorageKey) return;
    cachedStoredPreferences = undefined;
    callback();
  };
  window.addEventListener("storage", syncFromAnotherTab);
  return () => {
    preferenceSubscribers.delete(callback);
    window.removeEventListener("storage", syncFromAnotherTab);
  };
}

function savePreferences(preferences: Preferences) {
  currentPreferences = preferences;
  cachedStoredPreferences = JSON.stringify(preferences);
  try {
    window.localStorage.setItem(preferenceStorageKey, cachedStoredPreferences);
  } catch {
    // The preference still works for the current page when storage is blocked.
  }
  preferenceSubscribers.forEach((notifyPreferenceChange) => notifyPreferenceChange());
}

const logoOptions: Array<{ id: LogoVariant; name: string; idea: string; fit: string; file: string }> = [
  { id: 1, name: "丝路门廊", idea: "门廊与铁路合一，延续第一版最完整的丝路文化记忆。", fit: "综合推荐 · 品牌官网", file: "logo-01-silk-gate" },
  { id: 2, name: "三站商路", idea: "三枚节点连接中国、吉尔吉斯斯坦与乌兹别克斯坦。", fit: "路线识别 · 国际业务", file: "logo-02-three-stations" },
  { id: 3, name: "丝路经纬", idea: "经纬框架中嵌入上升商路，表达跨境市场网络。", fit: "平台感 · 移动端", file: "logo-03-silk-grid" },
  { id: 4, name: "双向货路", idea: "两条货路交汇，强调货源与市场信息的双向流动。", fit: "交易感 · 按钮图标", file: "logo-04-trade-flow" },
  { id: 5, name: "中枢方印", idea: "以“中”的结构形成可信方印，底部金线代表铁路。", fit: "中文识别 · Favicon", file: "logo-05-central-seal" },
  { id: 6, name: "可信通关", idea: "盾形包裹三个运输节点，强调验厂、履约与保障。", fit: "采购保障 · 商务后台", file: "logo-06-trusted-route" },
];

const copy = {
  ru: {
    label: "Русский",
    nav: ["Категории", "Новинки", "Логистика", "Защита покупателя"],
    search: "Поиск товаров, фабрик и категорий",
    quote: "Запросы",
    eyebrow: "Прямые поставки из Китая",
    title: "Закупайте дешевле.\nПродавайте выгоднее.",
    subtitle: "Оптовые цены китайских фабрик, проверенные поставщики и железнодорожная доставка в Кыргызстан и Узбекистан.",
    cta: "Найти товар", logistics: "Рассчитать доставку", verified: "Поставщики проверены",
    route: "Железнодорожный маршрут", days: "12–18 дней", arrival: "до Бишкека / Ташкента",
    market: "Популярно на вашем рынке", marketSub: "Цены с фабрики · минимальная партия от 10 шт.", all: "Смотреть все",
    unit: "за шт.", moq: "Мин. заказ", pieces: "шт.", orders: "заказов", categories: "Категории", country: "Рынок", rail: "По ж/д", chinaPrice: "Цена закупки в Китае", localPrice: "Розница на месте",
  },
  ky: {
    label: "Кыргызча",
    nav: ["Категориялар", "Жаңы өнүмдөр", "Логистика", "Сатып алуучуну коргоо"],
    search: "Өнүмдөрдү, фабрикаларды жана категорияларды издөө",
    quote: "Сурамдар", eyebrow: "Кытайдан түз жеткирүү", title: "Арзан сатып алыңыз.\nКөбүрөөк пайда табыңыз.",
    subtitle: "Кытай фабрикаларынын дүң баалары, текшерилген жеткирүүчүлөр жана Кыргызстан менен Өзбекстанга темир жол аркылуу жеткирүү.",
    cta: "Өнүм табуу", logistics: "Жеткирүүнү эсептөө", verified: "Жеткирүүчүлөр текшерилген",
    route: "Темир жол багыты", days: "12–18 күн", arrival: "Бишкекке / Ташкентке чейин",
    market: "Сиздин базарда популярдуу", marketSub: "Фабрика баасы · 10 даанадан баштап", all: "Баарын көрүү",
    unit: "даанасы", moq: "Эң аз буйрутма", pieces: "даана", orders: "буйрутма", categories: "Категориялар", country: "Базар", rail: "Темир жол", chinaPrice: "Кытайдагы сатып алуу баасы", localPrice: "Жергиликтүү сатуу баасы",
  },
  uz: {
    label: "O‘zbekcha",
    nav: ["Kategoriyalar", "Yangi mahsulotlar", "Logistika", "Xaridor himoyasi"],
    search: "Mahsulot, fabrika va toifalarni qidiring", quote: "So‘rovlar", eyebrow: "Xitoydan to‘g‘ridan-to‘g‘ri",
    title: "Arzonroq xarid qiling.\nKo‘proq foyda oling.",
    subtitle: "Xitoy fabrikalarining ulgurji narxlari, tekshirilgan yetkazib beruvchilar va Qirg‘iziston hamda O‘zbekistonga temir yo‘l yetkazib berish.",
    cta: "Mahsulot topish", logistics: "Yetkazishni hisoblash", verified: "Yetkazib beruvchilar tekshirilgan",
    route: "Temir yo‘l yo‘nalishi", days: "12–18 kun", arrival: "Bishkek / Toshkentgacha",
    market: "Bozoringizda ommabop", marketSub: "Fabrika narxi · 10 donadan boshlab", all: "Barchasini ko‘rish",
    unit: "dona", moq: "Min. buyurtma", pieces: "dona", orders: "buyurtma", categories: "Kategoriyalar", country: "Bozor", rail: "Temir yo‘l", chinaPrice: "Xitoy xarid narxi", localPrice: "Mahalliy sotuv narxi",
  },
  zh: {
    label: "中文",
    nav: ["商品分类", "新品货源", "跨境物流", "采购保障"], search: "搜索商品、工厂或品类", quote: "询价单", eyebrow: "中国源头直供",
    title: "更低成本进货。\n让每一单更赚钱。",
    subtitle: "连接中国源头工厂、可信供应商与中吉乌铁路运输，为吉尔吉斯斯坦和乌兹别克斯坦商贩提供更高效的采购渠道。",
    cta: "开始找货", logistics: "测算物流", verified: "供应商实地核验", route: "中吉乌铁路专线", days: "12–18 天", arrival: "抵达比什凯克 / 塔什干",
    market: "当地市场热销", marketSub: "源头工厂价 · 最低 10 件起批", all: "查看全部", unit: "每件", moq: "起订量", pieces: "件", orders: "笔订单", categories: "商品分类", country: "目标市场", rail: "铁路运输", chinaPrice: "中国进货价", localPrice: "当地售价",
  },
} as const;


const siteCopy = {
  ru: {
    brand: "ТОРГОВЛЯ С ЦЕНТРАЛЬНОЙ АЗИЕЙ", brandSub: "ПРЯМЫЕ ПОСТАВКИ", top: ["Закупочный центр Иу", "Железнодорожная линия Китай–Кыргызстан–Узбекистан", "Официальная проверка фабрик"],
    stops: ["Китай", "Урумчи", "Бишкек", "Ташкент"], verifiedDetail: "100% подтверждено документами", china: "Китай", kgCountry: "Кыргызстан", uzCountry: "Узбекистан",
    kgCity: "Бишкек", uzCity: "Ташкент", badge: "ХИТ", trend: "ТРЕНД", empty: "Товары не найдены", footerTagline: "Товары из Китая — новые возможности для бизнеса в Центральной Азии.", copyright: "© 2026 Торговля с Центральной Азией",
    save: "Сохранить товар", logisticsNotice: "Расчёт доставки будет доступен на следующем этапе.", languageLabel: "Язык", currencyLabel: "Валюта", navLabel: "Основная навигация",
  },
  ky: {
    brand: "БОРБОР АЗИЯ СООДАСЫ", brandSub: "ТҮЗ ЖЕТКИРҮҮ", top: ["Иу сатып алуу борбору", "Кытай–Кыргызстан–Өзбекстан темир жолу", "Фабрикаларды расмий текшерүү"],
    stops: ["Кытай", "Үрүмчү", "Бишкек", "Ташкент"], verifiedDetail: "Документтер менен 100% тастыкталган", china: "Кытай", kgCountry: "Кыргызстан", uzCountry: "Өзбекстан",
    kgCity: "Бишкек", uzCity: "Ташкент", badge: "МЫКТЫ", trend: "ТРЕНД", empty: "Товар табылган жок", footerTagline: "Кытайдын сапаттуу товарлары — Борбор Азиядагы жаңы бизнес мүмкүнчүлүктөрү.", copyright: "© 2026 Борбор Азия соодасы",
    save: "Өнүмдү сактоо", logisticsNotice: "Жеткирүүнү эсептөө кийинки этапта жеткиликтүү болот.", languageLabel: "Тил", currencyLabel: "Акча бирдиги", navLabel: "Негизги багыттоо",
  },
  uz: {
    brand: "MARKAZIY OSIYO SAVDOSI", brandSub: "TO‘G‘RIDAN-TO‘G‘RI YETKAZISH", top: ["Iu xarid markazi", "Xitoy–Qirg‘iziston–O‘zbekiston temir yo‘li", "Fabrikalarni rasmiy tekshirish"],
    stops: ["Xitoy", "Urumchi", "Bishkek", "Toshkent"], verifiedDetail: "Hujjatlar bilan 100% tasdiqlangan", china: "Xitoy", kgCountry: "Qirg‘iziston", uzCountry: "O‘zbekiston",
    kgCity: "Bishkek", uzCity: "Toshkent", badge: "OMMABOP", trend: "TREND", empty: "Mahsulot topilmadi", footerTagline: "Xitoyning sifatli mahsulotlari — Markaziy Osiyodagi yangi biznes imkoniyatlari.", copyright: "© 2026 Markaziy Osiyo savdosi",
    save: "Mahsulotni saqlash", logisticsNotice: "Yetkazib berish hisobi keyingi bosqichda mavjud bo‘ladi.", languageLabel: "Til", currencyLabel: "Valyuta", navLabel: "Asosiy navigatsiya",
  },
  zh: {
    brand: "中亚商机网", brandSub: "中国源头直供", top: ["义乌集采中心", "中吉乌铁路专线", "官方验厂"],
    stops: ["中国", "乌鲁木齐", "比什凯克", "塔什干"], verifiedDetail: "100% 文件核验", china: "中国", kgCountry: "吉尔吉斯斯坦", uzCountry: "乌兹别克斯坦",
    kgCity: "比什凯克", uzCity: "塔什干", badge: "热销", trend: "趋势", empty: "暂无匹配商品", footerTagline: "中国源头好货，通向中亚生意。", copyright: "© 2026 中亚商机网",
    save: "收藏商品", logisticsNotice: "物流测算将在下一步采购流程中开放。", languageLabel: "语言", currencyLabel: "货币", navLabel: "主导航",
  },
} as const;

const productBadgeCopy: Record<Lang, Record<ProductBadge, string>> = {
  ru: { hot: "ХИТ", "low-moq": "МАЛАЯ ПАРТИЯ" },
  ky: { hot: "СУРОО-ТАЛАПТА", "low-moq": "АЗ ПАРТИЯ" },
  uz: { hot: "OMMABOP", "low-moq": "KAM PARTIYA" },
  zh: { hot: "热销", "low-moq": "低起订量" },
};

const heroComparisonCopy = {
  ru: {
    label: "Сравнение цен сегодня", source: "Закупка в Китае", local: "Розница", gap: "Разница в цене",
    disclaimer: "Без доставки и других расходов. Итоговая цена — после расчёта.", verified: "Цена поставщика проверена", reference: "Рыночная цена — ориентир",
    show: "Показать товар", carousel: "Сравнение цен на популярные товары",
  },
  ky: {
    label: "Бүгүнкү бааларды салыштыруу", source: "Кытайдагы сатып алуу", local: "Жергиликтүү чекене баа", gap: "Баалардын айырмасы",
    disclaimer: "Жеткирүү жана башка чыгымдар кирбейт. Акыркы баа эсептен кийин аныкталат.", verified: "Жеткирүүчүнүн баасы текшерилди", reference: "Базар баасы — маалымат үчүн",
    show: "Өнүмдү көрсөтүү", carousel: "Популярдуу өнүмдөрдүн бааларын салыштыруу",
  },
  uz: {
    label: "Bugungi narxlar taqqoslanishi", source: "Xitoydagi xarid", local: "Mahalliy chakana narx", gap: "Narxlar farqi",
    disclaimer: "Yetkazish va boshqa xarajatlar kiritilmagan. Yakuniy narx hisob-kitobdan keyin aniqlanadi.", verified: "Yetkazib beruvchi narxi tekshirildi", reference: "Bozor narxi — ma’lumot uchun",
    show: "Mahsulotni ko‘rsatish", carousel: "Ommabop mahsulotlar narxlarini taqqoslash",
  },
  zh: {
    label: "今日价格对比", source: "中国进货参考价", local: "当地零售参考价", gap: "单件理论价差",
    disclaimer: "未包含运输及其他费用，以最终报价为准。", verified: "中国供应商价格已核对", reference: "当地市场价格仅作参考",
    show: "显示商品", carousel: "热销商品价格对比",
  },
} as const;

const newsCopy = {
  ru: {
    eyebrow: "ТРАНСПОРТНАЯ СВОДКА", title: "Железная дорога и логистика", verified: "Только официальные источники",
    source: "Первоисточник", photo: "Документальное фото", open: "Открыть материал", close: "Закрыть материал", detail: "Подробности",
  },
  ky: {
    eyebrow: "ТРАНСПОРТ КАБАРЛАРЫ", title: "Темир жол жана логистика", verified: "Расмий булактар гана",
    source: "Баштапкы булак", photo: "Чыныгы сүрөт", open: "Материалды ачуу", close: "Материалды жабуу", detail: "Толук маалымат",
  },
  uz: {
    eyebrow: "TRANSPORT DAYJESTI", title: "Temir yo‘l va logistika", verified: "Faqat rasmiy manbalar",
    source: "Asl manba", photo: "Haqiqiy surat", open: "Maqolani ochish", close: "Maqolani yopish", detail: "Batafsil",
  },
  zh: {
    eyebrow: "运输简报", title: "铁路与物流动态", verified: "仅采用官方信息源",
    source: "原始来源", photo: "真实资料图", open: "查看官方原文", close: "关闭详情", detail: "详细信息",
  },
} as const;


const processCopy = {
  ru: {
    eyebrow: "КАК ЭТО РАБОТАЕТ", title: "От выбранного товара до доставки", subtitle: "Один менеджер сопровождает запрос от проверки фабрики до прибытия груза в ваш город.",
    steps: [
      ["Выберите товары", "Добавьте интересующие позиции в запрос и укажите нужное количество."],
      ["Оставьте контакты", "Укажите телефон, WhatsApp или почту — приоритет остаётся за звонком."],
      ["Подтвердите расчёт", "Мы уточним цену фабрики, доставку и сопутствующие расходы."],
      ["Получите товар", "После подтверждения заказ отправляется железной дорогой в ваш город."],
    ],
    choose: "Выбрать товары", quote: "Получить расчёт", facts: ["Проверенные поставщики", "Расчёт до оплаты", "12–18 дней в пути"],
  },
  ky: {
    eyebrow: "КАНТИП ИШТЕЙТ", title: "Өнүм тандоодон жеткирүүгө чейин", subtitle: "Бир адис фабриканы текшерүүдөн тартып жүк шаарыңызга жеткенге чейин сурамды коштойт.",
    steps: [
      ["Өнүмдөрдү тандаңыз", "Керектүү өнүмдөрдү сурамга кошуп, санын көрсөтүңүз."],
      ["Байланыш калтырыңыз", "Телефон, WhatsApp же электрондук даректи көрсөтүңүз — биринчи кезекте чалабыз."],
      ["Эсепти ырастаңыз", "Фабрика баасын, жеткирүүнү жана кошумча чыгымдарды тактайбыз."],
      ["Жүктү алыңыз", "Ырасталгандан кийин жүк темир жол менен шаарыңызга жөнөтүлөт."],
    ],
    choose: "Өнүм тандоо", quote: "Эсеп алуу", facts: ["Текшерилген жеткирүүчүлөр", "Төлөөгө чейин эсеп", "Жолдо 12–18 күн"],
  },
  uz: {
    eyebrow: "QANDAY ISHLAYDI", title: "Mahsulot tanlashdan yetkazishgacha", subtitle: "Bitta menejer fabrikani tekshirishdan yuk shahringizga yetib kelguniga qadar so‘rovni kuzatib boradi.",
    steps: [
      ["Mahsulotlarni tanlang", "Kerakli mahsulotlarni so‘rovga qo‘shing va miqdorini ko‘rsating."],
      ["Aloqa qoldiring", "Telefon, WhatsApp yoki e-pochtani kiriting — birinchi navbatda qo‘ng‘iroq qilamiz."],
      ["Hisobni tasdiqlang", "Fabrika narxi, yetkazish va qo‘shimcha xarajatlarni aniqlaymiz."],
      ["Yukni qabul qiling", "Tasdiqlangandan so‘ng buyurtma temir yo‘l orqali shahringizga yuboriladi."],
    ],
    choose: "Mahsulot tanlash", quote: "Hisob-kitob olish", facts: ["Tekshirilgan yetkazib beruvchilar", "To‘lovdan oldin hisob", "Yo‘lda 12–18 kun"],
  },
  zh: {
    eyebrow: "采购流程", title: "从选中商品，到货物抵达", subtitle: "一位采购经理全程跟进，从核验工厂、确认报价到货物抵达你的城市。",
    steps: [
      ["选择商品", "把感兴趣的商品加入询价单，并填写预计采购数量。"],
      ["留下联系方式", "填写电话、WhatsApp 或邮箱，我们将优先电话沟通。"],
      ["确认完整报价", "我们核实工厂价格、运输方案和相关费用。"],
      ["铁路运输到货", "确认采购后安排铁路运输，货物送达你的城市。"],
    ],
    choose: "选择商品", quote: "获取采购报价", facts: ["供应商文件核验", "付款前确认费用", "铁路运输约 12–18 天"],
  },
} as const;

const trustStoryCopy = {
  ru: {
    eyebrow: "ПРОЗРАЧНЫЙ ПУТЬ ПОСТАВКИ", title: "От первого разговора до двери магазина", photo: "Реальная деловая сцена", stage: "Этап",
    slides: [
      ["Переговоры и закупка", "Менеджер уточняет модель, количество, цену и условия поставки по телефону или WhatsApp."],
      ["Профессиональный подбор", "Специалисты проверяют товар на месте и подбирают позиции с учётом спроса вашего рынка."],
      ["Железнодорожная доставка", "После упаковки груз отправляется по железной дороге в Кыргызстан или Узбекистан."],
      ["Отправка с местного склада", "По прибытии груз принимается на местном складе, сверяется и готовится к последней доставке."],
      ["Получение у двери", "Согласованный груз доставляется по адресу — предприниматель принимает и проверяет товар."],
    ],
  },
  ky: {
    eyebrow: "ЖЕТКИРҮҮНҮН АЧЫК ЖОЛУ", title: "Биринчи сүйлөшүүдөн дүкөндүн эшигине чейин", photo: "Чыныгы ишкердик көрүнүш", stage: "Этап",
    slides: [
      ["Сүйлөшүү жана сатып алуу", "Менеджер телефон же WhatsApp аркылуу модель, сан, баа жана жеткирүү шарттарын тактайт."],
      ["Адистердин тандоосу", "Адистер товарды жеринде текшерип, сиздин базардын суроо-талабына ылайык позицияларды тандашат."],
      ["Темир жол менен жеткирүү", "Таңгакталгандан кийин жүк Кыргызстанга же Өзбекстанга темир жол аркылуу жөнөтүлөт."],
      ["Жергиликтүү кампадан жөнөтүү", "Жүк келгенде жергиликтүү кампада кабыл алынып, текшерилип, акыркы жеткирүүгө даярдалат."],
      ["Эшиктен кабыл алуу", "Макулдашылган жүк көрсөтүлгөн дарекке жеткирилип, ишкер товарды кабыл алып текшерет."],
    ],
  },
  uz: {
    eyebrow: "SHAFFOF YETKAZIB BERISH YO‘LI", title: "Birinchi suhbatdan do‘kon eshigigacha", photo: "Haqiqiy biznes jarayoni", stage: "Bosqich",
    slides: [
      ["Muzokara va xarid", "Menejer telefon yoki WhatsApp orqali model, miqdor, narx va yetkazish shartlarini aniqlaydi."],
      ["Mutaxassislar tanlovi", "Mutaxassislar mahsulotni joyida tekshiradi va bozoringiz talabiga mos pozitsiyalarni tanlaydi."],
      ["Temir yo‘l orqali yetkazish", "Qadoqlangach, yuk Qirg‘iziston yoki O‘zbekistonga temir yo‘l orqali jo‘natiladi."],
      ["Mahalliy ombordan jo‘natish", "Yuk kelgach, mahalliy omborda qabul qilinadi, tekshiriladi va so‘nggi yetkazishga tayyorlanadi."],
      ["Eshik oldida qabul qilish", "Kelishilgan yuk ko‘rsatilgan manzilga yetkaziladi, tadbirkor mahsulotni qabul qilib tekshiradi."],
    ],
  },
  zh: {
    eyebrow: "看得见的采购履约", title: "从第一次沟通，到商户门前收货", photo: "真实业务场景图", stage: "采购阶段",
    slides: [
      ["沟通谈判，确认采购合作", "采购经理通过电话或 WhatsApp 确认商品型号、数量、价格与交付条件。"],
      ["专业人员，实地选品", "专业人员在当地实地查看商品，并结合目标市场需求筛选更合适的货品。"],
      ["铁路物流，跨境送货", "完成核验与装箱后，货物通过铁路运往吉尔吉斯斯坦或乌兹别克斯坦。"],
      ["抵达当地，仓库发货", "货物到达当地仓库后完成入库核对，并按商户订单安排最后一段配送。"],
      ["送到门前，商户收货", "货物送至约定地址，商户可在门前完成接收并核对商品。"],
    ],
  },
} as const;

const trustStoryImages = [
  "/trust/01-negotiation.jpg",
  "/trust/02-sourcing.jpg",
  "/trust/03-rail.jpg",
  "/trust/04-warehouse.jpg",
  "/trust/05-delivery.jpg",
] as const;

const deliveryCities: Record<"kg" | "uz", Record<Lang, string[]>> = {
  kg: {
    ru: ["Бишкек", "Ош", "Каракол"], ky: ["Бишкек", "Ош", "Каракол"], uz: ["Bishkek", "O‘sh", "Qorako‘l"], zh: ["比什凯克", "奥什", "卡拉科尔"],
  },
  uz: {
    ru: ["Ташкент", "Самарканд", "Андижан"], ky: ["Ташкент", "Самарканд", "Анжиян"], uz: ["Toshkent", "Samarqand", "Andijon"], zh: ["塔什干", "撒马尔罕", "安集延"],
  },
};

const localePanelCopy: Record<Lang, { title: string; done: string; close: string }> = {
  ru: { title: "Язык и валюта", done: "Готово", close: "Закрыть" },
  ky: { title: "Тил жана акча бирдиги", done: "Даяр", close: "Жабуу" },
  uz: { title: "Til va valyuta", done: "Tayyor", close: "Yopish" },
  zh: { title: "语言与货币", done: "完成", close: "关闭" },
};

const mobileTopCopy: Record<Lang, string> = {
  ru: "Закупки в Иу · Ж/д КНР–КР–УЗ",
  ky: "Иу сатып алуу · КЭР–КР–ӨзР темир жолу",
  uz: "Iu xaridi · XXR–QR–O‘zR temir yo‘li",
  zh: "义乌集采 · 中吉乌铁路专线",
};

const priceNumber = (value: string) => Number(value.replace(/[^\d.]/g, ""));

function supportsPreciseHover() {
  return typeof window !== "undefined" && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
}

const products = catalogProducts;

const heroProductKinds = ["phone-case", "screen-protector", "bag-sealer"] as const;
const productBadgeByKind = new Map(catalogProducts.map((product) => [product.kind, product.badge]));

const productCategories: Record<string, CategoryId> = {
  "screen-protector": "digital", "phone-case": "digital", "usb-c-cable": "digital", "phone-stand": "digital",
  "car-holder": "auto", "selfie-stick": "digital", "cable-organizer": "digital",
  "hair-set": "beauty", "makeup-sponge": "beauty", "curling-ribbon": "beauty", "nail-set": "beauty",
  "scarf-clasp": "fashion", "jewelry-box": "fashion",
  "adhesive-hooks": "home", "drain-strainer": "home", "vacuum-bags": "home", "drawer-organizer": "home", "travel-organizer": "home", "gap-strip": "home",
  "car-towels": "auto", "seat-organizer": "auto", "sunshade": "auto", "frost-cover": "auto",
  "uv-set": "fashion", "winter-gloves": "fashion",
  "lint-remover": "tools", "bag-sealer": "tools", "usb-fan": "digital", "sensor-light": "digital", "shoe-dryer": "tools",
};

const categories = [
  ["home", { ru: "Товары для дома", ky: "Үй буюмдары", uz: "Uy-ro‘zg‘or", zh: "家居日用" }],
  ["fashion", { ru: "Одежда и обувь", ky: "Кийим жана бут кийим", uz: "Kiyim va poyabzal", zh: "服装鞋靴" }],
  ["tools", { ru: "Инструменты", ky: "Куралдар", uz: "Asbob-uskunalar", zh: "五金工具" }],
  ["digital", { ru: "Электроника", ky: "Электроника", uz: "Elektronika", zh: "数码电器" }],
  ["auto", { ru: "Автотовары", ky: "Унаа буюмдары", uz: "Avto tovarlar", zh: "汽车用品" }],
  ["beauty", { ru: "Красота", ky: "Сулуулук", uz: "Go‘zallik", zh: "个护美妆" }],
] as const;

function LogoMark({ variant }: { variant: LogoVariant }) {
  return <svg className={`logo-mark logo-variant-${variant}`} viewBox="0 0 48 48" role="img" aria-hidden="true">
    {variant === 1 && <><g className="logo-core"><path d="M7 37V18.5C7 12.7 11.7 8 17.5 8h13C36.3 8 41 12.7 41 18.5V37"/><path d="M15 37V21.5c0-3.6 2.9-6.5 6.5-6.5h5c3.6 0 6.5 2.9 6.5 6.5V37"/></g><g className="logo-accent"><path d="M24 18v19M18 37h12M14 42h20"/></g></>}
    {variant === 2 && <><g className="logo-core"><path d="M8 36C11 23 17 13 24 8c7 5 13 15 16 28"/><path d="M15 36c2-8 5-14 9-18 4 4 7 10 9 18"/><path d="M7 40h34"/></g><g className="logo-accent"><circle className="logo-node" cx="8" cy="36" r="2.4"/><circle className="logo-node" cx="24" cy="18" r="2.4"/><circle className="logo-node" cx="40" cy="36" r="2.4"/></g></>}
    {variant === 3 && <><g className="logo-core"><rect x="7.5" y="7.5" width="33" height="33" rx="9"/><path d="M14 9c3.5 4.5 5.5 9.5 5.5 15S17.5 35 14 39M34 9c-3.5 4.5-5.5 9.5-5.5 15S30.5 35 34 39"/></g><g className="logo-accent"><path d="M10 32c7-1 9-10 16-10 5 0 7 4 12-3"/><circle className="logo-node" cx="10" cy="32" r="2"/><circle className="logo-node" cx="26" cy="22" r="2"/><circle className="logo-node" cx="38" cy="19" r="2"/></g></>}
    {variant === 4 && <><g className="logo-core"><path d="M7 13h10c5 0 7 3 11 9l4 6c2 3 4 6 9 6"/><path d="M7 35h10c5 0 7-3 11-9l4-6c2-3 4-6 9-6"/></g><g className="logo-accent"><path d="m36 9 5 5-5 5M36 29l5 5-5 5"/><circle className="logo-node" cx="24" cy="24" r="2.4"/></g></>}
    {variant === 5 && <><g className="logo-core"><rect x="7.5" y="7.5" width="33" height="33" rx="8"/><path d="M14 17h20v15H14zM24 11v26"/></g><g className="logo-accent"><path d="M11 37h26"/><circle className="logo-node" cx="14" cy="37" r="1.8"/><circle className="logo-node" cx="24" cy="37" r="1.8"/><circle className="logo-node" cx="34" cy="37" r="1.8"/></g></>}
    {variant === 6 && <><g className="logo-core"><path d="M24 6 39 12v10c0 9.5-5.5 15.5-15 20-9.5-4.5-15-10.5-15-20V12L24 6Z"/></g><g className="logo-accent"><path d="M15 28h5l4-7 4 7h5"/><circle className="logo-node" cx="15" cy="28" r="2"/><circle className="logo-node" cx="24" cy="21" r="2"/><circle className="logo-node" cx="33" cy="28" r="2"/></g></>}
  </svg>;
}

function Logo({ compact = false, variant = 1, lang = "zh" }: { compact?: boolean; variant?: LogoVariant; lang?: Lang }) {
  const brand = siteCopy[lang];
  return <div className={`brand-lockup ${compact ? "compact" : ""}`} aria-label={brand.brand}>
    <LogoMark variant={variant}/>
    {!compact && <span className="brand-words"><strong>{brand.brand}</strong><small>{brand.brandSub}</small></span>}
  </div>;
}

function Icon({ name }: { name: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="M4 11 12 4l8 7"/><path d="M6 10v10h12V10M10 20v-6h4v6"/></>,
    fashion: <path d="m8 5 4-2 4 2 4 3-3 4-2-2v11H9V10l-2 2-3-4 4-3Z"/>,
    tools: <><path d="m14 5 5-2-2 5-3 1-5 10-4-4L15 5Z"/><path d="m5 15 4 4"/></>,
    digital: <><rect x="4" y="5" width="16" height="12" rx="2"/><path d="M9 21h6M12 17v4"/></>,
    auto: <><path d="m5 16 1-6 2-3h8l2 3 1 6"/><path d="M3 16h18v4h-3v-2H6v2H3v-4ZM7 13h.01M17 13h.01"/></>,
    beauty: <><path d="M9 3h6v5l3 4v9H6v-9l3-4V3Z"/><path d="M9 8h6M6 14h12"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    shield: <><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6l-8-3Z"/><path d="m8.5 12 2.3 2.3 4.7-5"/></>,
    cart: <><path d="M3 5h2l2 11h10l2-8H6"/><circle cx="9" cy="20" r="1"/><circle cx="17" cy="20" r="1"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name]}</svg>;
}

function BrandGuide({ onClose, selected, onSelect }: { onClose: () => void; selected: LogoVariant; onSelect: (variant: LogoVariant) => void }) {
  const current = logoOptions.find((item) => item.id === selected) ?? logoOptions[0];
  const colors = [
    ["商路墨绿", "#173A35", "主品牌 / 深色背景"],
    ["丝路青玉", "#1E695A", "按钮 / 可信状态"],
    ["鎏金沙黄", "#DFA23E", "铁路 / 利润 / 强调"],
    ["陶土赤", "#C65E3D", "商机 / 热销标签"],
    ["生丝米白", "#F5F0E7", "大面积品牌底色"],
  ];
  return <section className="brand-guide">
    <div className="guide-hero">
      <button className="guide-close" onClick={onClose}>← 返回采购界面</button>
      <span className="guide-kicker">BRAND IDENTITY · 01</span>
      <h1>让中国好货，<br/>通向每一门中亚生意。</h1>
      <p>中亚商机网不是传统外贸公司的冷硬形象，而是一个“可信的低价货源入口”。品牌视觉以丝路门廊为文化记忆，以铁路轨道为现代商业效率。</p>
      <div className="guide-version">VI 1.0 <span>2026.08</span></div>
    </div>

    <div className="guide-grid logo-section">
      <div className="guide-index"><b>01</b><span>Logo 候选</span></div>
      <div className="logo-choice-heading"><span>6 个网页适用方向</span><h2>点击切换，直接看真实使用效果。</h2><p>所有方案都按 24px 小图标、网页导航栏和深浅背景重新绘制，不使用复杂纹样与细碎装饰。</p></div>
      <div className="logo-options">{logoOptions.map((item) => <button className={selected === item.id ? "selected" : ""} onClick={() => onSelect(item.id)} key={item.id} aria-pressed={selected === item.id}><span className="logo-option-mark"><Logo compact variant={item.id}/></span><span className="logo-option-copy"><b>0{item.id} / {item.name}</b><em>{item.idea}</em><small>{item.fit}</small></span></button>)}</div>
      <div className="logo-preview-title"><span>当前预览</span><b>0{current.id} · {current.name}</b><small>点击上方候选后，页面导航栏与下方应用场景会同步切换</small></div>
      <div className="logo-showcase light"><Logo variant={selected}/><div className="clear-space"><i/><i/><i/><i/></div><small>标准组合 · 浅色导航</small></div>
      <div className="logo-showcase dark"><Logo variant={selected}/><small>反白组合 · 深色页脚</small></div>
      <div className="logo-story">
        <div><strong>意</strong><p>{current.idea}</p></div>
        <div><strong>屏</strong><p>{current.fit}；横向组合在 120px 宽度仍保持清楚。</p></div>
        <div><strong>小</strong><p>图形标在 24px 尺寸仍能辨认，可用于 favicon、App 图标与按钮。</p></div>
      </div>
      <div className="download-row"><a href={`${BASE_PATH}/${current.file}.svg`} download>下载 0{current.id} 标准组合 SVG</a><a href={`${BASE_PATH}/${current.file}-mark.svg`} download>下载图形标 SVG</a><span>最小使用宽度：组合标 120px · 图形标 24px</span></div>
    </div>

    <div className="guide-grid color-section">
      <div className="guide-index"><b>02</b><span>色彩系统</span></div>
      <div className="color-stack">{colors.map(([name,hex,use]) => <div className="color-chip" key={hex} style={{background:hex,color:hex === "#F5F0E7" ? "#173A35" : "white"}}><strong>{name}</strong><b>{hex}</b><span>{use}</span></div>)}</div>
      <p className="color-rule">推荐比例 <b>60%</b> 生丝米白 · <b>25%</b> 墨绿/青玉 · <b>10%</b> 沙黄 · <b>5%</b> 陶土赤</p>
    </div>

    <div className="guide-grid type-section">
      <div className="guide-index"><b>03</b><span>字体与语言</span></div>
      <div className="type-display"><span>品牌标题 / DISPLAY</span><strong>生意，不止一条路。</strong><em>Выгодный путь начинается здесь.</em></div>
      <div className="type-spec"><div><b>Noto Serif SC</b><span>中文品牌标题 / 文化感</span></div><div><b>Noto Serif</b><span>俄语、吉尔吉斯语、乌兹别克语标题</span></div><div><b>Noto Sans</b><span>四语正文、价格、按钮和数据</span></div></div>
      <div className="language-rule"><span>RU</span><span>КЫР</span><span>UZ</span><span>中</span><p>产品界面按用户语言完整切换，不在同一标题内混排四种语言；品牌中文名保持固定识别。</p></div>
    </div>

    <div className="guide-grid component-section">
      <div className="guide-index"><b>04</b><span>UI 组件</span></div>
      <div className="component-demo">
        <button className="demo-primary">Найти товар <Icon name="arrow"/></button>
        <button className="demo-secondary">Рассчитать доставку</button>
        <span className="demo-trust"><Icon name="shield"/>Поставщик проверен</span>
        <span className="demo-tag">KG TOP</span>
      </div>
      <div className="ui-principles"><article><b>01</b><strong>价格先行</strong><p>货价、起订量、到货城市保持在扫描路径前半段。</p></article><article><b>02</b><strong>信任可见</strong><p>验厂、物流节点和交易保障不藏在二级页面。</p></article><article><b>03</b><strong>操作直接</strong><p>每个页面只保留一个主动作：找货、询价或下单。</p></article></div>
    </div>

    <div className="guide-footer"><Logo variant={selected}/><p>品牌语气：直接、不夸张、信息透明。少说“全球领先”，多说“多少钱、几天到、谁负责”。</p></div>
  </section>;
}

export default function Home() {
  const preferences = useSyncExternalStore(subscribeToPreferences, getPreferencesSnapshot, () => defaultPreferences);
  const { lang, currency } = preferences;
  const setLang = (nextLang: Lang) => savePreferences({ ...getPreferencesSnapshot(), lang: nextLang });
  const setCurrency = (nextCurrency: Currency) => savePreferences({ ...getPreferencesSnapshot(), currency: nextCurrency });
  const [market, setMarket] = useState<"kg" | "uz">("kg");
  const [selectedCategory, setSelectedCategory] = useState<CategoryId | null>(null);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [quoteItems, setQuoteItems] = useState<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [preferredContact, setPreferredContact] = useState<"phone" | "whatsapp" | "email">("phone");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const inquiryIdempotencyKey = useRef("");
  const [showBrand, setShowBrand] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);
  const [logoVariant, setLogoVariant] = useState<LogoVariant>(1);
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroPaused, setHeroPaused] = useState(false);
  const [heroTouchStart, setHeroTouchStart] = useState<number | null>(null);
  const [trustSlide, setTrustSlide] = useState(0);
  const [trustPaused, setTrustPaused] = useState(false);
  const [activeNewsId, setActiveNewsId] = useState<string | null>(null);
  const newsGesture = useRef({ pointerId: null as number | null, startX: 0, startY: 0, dragged: false });
  const [visibleCount, setVisibleCount] = useState(9);
  const t = copy[lang];
  const iq = inquiryCopy[lang];
  const s = siteCopy[lang];
  const pc = processCopy[lang];
  const tc = trustStoryCopy[lang];
  const hc = heroComparisonCopy[lang];
  const nc = newsCopy[lang];
  const sc = customerServiceCopy[lang];
  const localeUi = localePanelCopy[lang];
  const detailLabel = { ru: "Подробнее", ky: "Толугураак", uz: "Batafsil", zh: "查看详情" }[lang];
  const loadMoreLabel = { ru: "Показать ещё", ky: "Дагы көрсөтүү", uz: "Yana ko‘rsatish", zh: "加载更多" }[lang];
  const showingLabel = { ru: "Показано", ky: "Көрсөтүлдү", uz: "Ko‘rsatildi", zh: "已显示" }[lang];
  const productLabel = (product: (typeof products)[number]) => lang === "ky" ? kyrgyzProductNames[product.kind] : product.name[lang];
  const productHref = (kind: string) => buildProductHref(kind, lang, currency);
  const heroProducts = useMemo(() => heroProductKinds.map((kind) => products.find((product) => product.kind === kind)).filter((product): product is (typeof products)[number] => Boolean(product)), []);
  const filteredProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = !selectedCategory || productCategories[product.kind] === selectedCategory;
    const matchesQuery = !query || (lang === "ky" ? kyrgyzProductNames[product.kind] : product.name[lang]).toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  }), [query, lang, selectedCategory]);
  const shownProducts = filteredProducts.slice(0, visibleCount);
  const activeCategory = categories.find(([id]) => id === selectedCategory);
  const selectedProducts = products.filter((product) => quoteItems[product.kind]);
  const quoteCount = selectedProducts.length;
  const quoteSubtotalCny = selectedProducts.reduce((total, product) => total + priceNumber(product.cost) * quoteItems[product.kind], 0);
  const destinationOptions = deliveryCities[market][lang];
  const activeNews = logisticsNews.find((item) => item.id === activeNewsId);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
  }, [lang]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen || localeOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen, localeOpen]);

  useEffect(() => {
    if (heroPaused || drawerOpen || showBrand || activeNewsId || heroProducts.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setHeroSlide((current) => (current + 1) % heroProducts.length), 5000);
    return () => window.clearInterval(interval);
  }, [activeNewsId, drawerOpen, heroPaused, heroProducts.length, showBrand]);

  useEffect(() => {
    if (trustPaused || drawerOpen || showBrand || activeNewsId || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = window.setInterval(() => setTrustSlide((current) => (current + 1) % trustStoryImages.length), 5200);
    return () => window.clearInterval(interval);
  }, [activeNewsId, drawerOpen, showBrand, trustPaused]);

  useEffect(() => {
    const closeNews = (event: KeyboardEvent) => { if (event.key === "Escape") setActiveNewsId(null); };
    window.addEventListener("keydown", closeNews);
    return () => window.removeEventListener("keydown", closeNews);
  }, []);

  useEffect(() => {
    if (!localeOpen) return;
    const closeLocale = (event: KeyboardEvent) => { if (event.key === "Escape") setLocaleOpen(false); };
    window.addEventListener("keydown", closeLocale);
    return () => window.removeEventListener("keydown", closeLocale);
  }, [localeOpen]);

  const retailInCny = (product: (typeof products)[number]) => {
    const sourceCurrency: Currency = market === "kg" ? "KGS" : "UZS";
    const sourceRate = currencyOptions.find((item) => item.code === sourceCurrency)?.perCny ?? 1;
    return priceNumber(product.retail[market]) / sourceRate;
  };

  const changeHeroSlide = (direction: number) => {
    setHeroSlide((current) => (current + direction + heroProducts.length) % heroProducts.length);
  };

  const heroProduct = heroProducts[heroSlide % heroProducts.length];
  const heroRetailCny = heroProduct ? retailInCny(heroProduct) : 0;
  const heroCostCny = heroProduct ? priceNumber(heroProduct.cost) : 0;
  const heroGapCny = Math.max(0, heroRetailCny - heroCostCny);

  const animateProductToQuote = (source: HTMLElement | null) => {
    if (!source || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const sourceRect = source.getBoundingClientRect();

    window.requestAnimationFrame(() => window.requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>(".quote-tab");
      if (!target) return;
      const targetRect = target.getBoundingClientRect();
      const flyer = source.cloneNode(true) as HTMLElement;
      flyer.className = "product-card quote-flyer";
      flyer.setAttribute("aria-hidden", "true");
      flyer.style.left = `${sourceRect.left}px`;
      flyer.style.top = `${sourceRect.top}px`;
      flyer.style.width = `${sourceRect.width}px`;
      flyer.style.height = `${sourceRect.height}px`;
      document.body.appendChild(flyer);

      const dx = targetRect.left + targetRect.width / 2 - (sourceRect.left + sourceRect.width / 2);
      const dy = targetRect.top + targetRect.height / 2 - (sourceRect.top + sourceRect.height / 2);
      const finalScale = Math.max(.08, Math.min(.16, targetRect.width / sourceRect.width));
      const flight = flyer.animate([
        { transform: "translate3d(0,0,0) scale(1)", opacity: 1, offset: 0 },
        { transform: `translate3d(${dx * .68}px,${dy * .48 - 34}px,0) scale(.48) rotate(2deg)`, opacity: .88, offset: .58 },
        { transform: `translate3d(${dx}px,${dy}px,0) scale(${finalScale}) rotate(5deg)`, opacity: .08, offset: 1 },
      ], { duration: 720, easing: "cubic-bezier(.22,.8,.24,1)", fill: "forwards" });

      flight.finished.then(() => {
        flyer.remove();
        target.animate([
          { transform: "translateX(0) scale(1)" },
          { transform: "translateX(-4px) scale(1.13)" },
          { transform: "translateX(0) scale(1)" },
        ], { duration: 300, easing: "cubic-bezier(.2,.8,.3,1)" });
      }).catch(() => flyer.remove());
    }));
  };

  const addToQuote = (product: (typeof products)[number], source: HTMLElement | null = null) => {
    if (quoteItems[product.kind]) {
      setDrawerOpen(true);
      return;
    }
    setQuoteItems((current) => ({ ...current, [product.kind]: product.moq }));
    setSubmitted(false);
    animateProductToQuote(source);
  };

  const updateQuantity = (kind: string, quantity: number, minimum: number) => {
    setQuoteItems((current) => ({ ...current, [kind]: Math.max(minimum, quantity || minimum) }));
    setSubmitted(false);
  };

  const removeFromQuote = (kind: string) => {
    setQuoteItems((current) => {
      const next = { ...current };
      delete next[kind];
      return next;
    });
    setSubmitted(false);
  };

  const submitInquiry = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSubmitting(true);
    setSubmitted(false);
    setSubmitError("");
    try {
      const context = getClientContext();
      inquiryIdempotencyKey.current ||= crypto.randomUUID();
      const phone = `${String(data.get("phoneCountryCode") ?? "")} ${String(data.get("phone") ?? "")}`.trim();
      const whatsapp = sameWhatsapp ? phone : `${String(data.get("whatsappCountryCode") ?? "")} ${String(data.get("whatsapp") ?? "")}`.trim();
      const response = await fetch("/api/inquiries", {
        method: "POST",
        headers: { "content-type": "application/json", "idempotency-key": inquiryIdempotencyKey.current },
        body: JSON.stringify({
          ...context,
          website: data.get("website"),
          destination: data.get("destination"),
          phone,
          whatsapp,
          email: data.get("email"),
          preferredContact: data.get("preferredContact"),
          note: data.get("note"),
          language: lang,
          currency,
          market,
          items: selectedProducts.map((product) => ({ kind: product.kind, name: productLabel(product), quantity: quoteItems[product.kind], unitPriceCny: priceNumber(product.cost) })),
        }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "Inquiry submission failed");
      setSubmitted(true);
      inquiryIdempotencyKey.current = "";
    } catch (caught) {
      setSubmitError(caught instanceof Error ? caught.message : "Inquiry submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const openCustomerService = (method: ContactMethod) => {
    setPreferredContact(method);
    setSubmitted(false);
    setDrawerOpen(true);
  };

  return <main className={`market-shell currency-${currency.toLowerCase()} lang-${lang}`}>
    <div className="top-strip"><span className="top-copy-mobile">{mobileTopCopy[lang]}</span><span className="top-copy-desktop">{s.top[0]}</span><i/><span className="top-copy-desktop">{s.top[1]}</span><i/><span className="top-copy-desktop">{s.top[2]}</span><div className="strip-route"><b>{s.stops[0]}</b><span>{s.stops[1]}</span><span>{s.stops[2]}</span><span>{s.stops[3]}</span></div></div>
    <header className="site-header">
      <Logo variant={logoVariant} lang={lang}/>
      <nav aria-label={s.navLabel}>{t.nav.map((item, i) => <a href={i === 0 ? "#categories" : i === 2 ? "#route" : "#products"} key={item}>{item}</a>)}</nav>
      <div className="header-actions">
        <label className="language-select" data-code={lang === "zh" ? "中" : lang.toUpperCase()}><span className="sr-only">{s.languageLabel}</span><select value={lang} onChange={(e) => { setLang(e.target.value as Lang); setVisibleCount(9); setNotice(""); }}>{(Object.keys(copy) as Lang[]).map((key) => <option key={key} value={key}>{copy[key].label}</option>)}</select></label>
        <label className="currency-select"><span className="sr-only">{s.currencyLabel}</span><select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>{currencyOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
      </div>
      <button className="mobile-locale-trigger" type="button" onClick={() => { setLocaleOpen(true); setDrawerOpen(false); setActiveNewsId(null); }} aria-expanded={localeOpen} aria-controls="mobile-locale-panel" aria-label={`${s.languageLabel}: ${copy[lang].label}; ${s.currencyLabel}: ${currency}`}>
        <span>{lang === "zh" ? "中" : lang.toUpperCase()}</span><i aria-hidden="true"/><b>{currency}</b><small aria-hidden="true">⌄</small>
      </button>
    </header>
    {localeOpen && <>
      <button className="locale-backdrop" type="button" onClick={() => setLocaleOpen(false)} aria-label={localeUi.close}/>
      <section className="locale-panel" id="mobile-locale-panel" role="dialog" aria-modal="true" aria-labelledby="mobile-locale-title">
        <header className="locale-panel-header"><div><small>{s.languageLabel} · {s.currencyLabel}</small><h2 id="mobile-locale-title">{localeUi.title}</h2></div><button type="button" onClick={() => setLocaleOpen(false)} aria-label={localeUi.close}>×</button></header>
        <fieldset><legend>{s.languageLabel}</legend><div className="locale-options language-options">{(Object.keys(copy) as Lang[]).map((key) => <button type="button" className={lang === key ? "active" : ""} key={key} onClick={() => { setLang(key); setVisibleCount(9); setNotice(""); }}><b>{key === "zh" ? "中" : key.toUpperCase()}</b><span>{copy[key].label}</span></button>)}</div></fieldset>
        <fieldset><legend>{s.currencyLabel}</legend><div className="locale-options currency-options">{currencyOptions.map((item) => <button type="button" className={currency === item.code ? "active" : ""} key={item.code} onClick={() => setCurrency(item.code)}><b>{item.code}</b><span>{item.label}</span></button>)}</div></fieldset>
        <button className="locale-done" type="button" onClick={() => setLocaleOpen(false)}>{localeUi.done}</button>
      </section>
    </>}
    {notice && <button className="toast" onClick={() => setNotice("")}>{notice}<b>×</b></button>}
    {showBrand ? <BrandGuide onClose={() => setShowBrand(false)} selected={logoVariant} onSelect={setLogoVariant}/> : <>
    <section className="workspace">
      <aside className="news-rail" aria-label={nc.title} onPointerLeave={(event) => { if (event.pointerType === "mouse" && supportsPreciseHover()) setActiveNewsId(null); }}>
        <header className="news-rail-heading"><span>{nc.eyebrow}</span><h2>{nc.title}</h2><small><i/>{nc.verified}</small></header>
        <div className="news-list">
          {logisticsNews.map((item) => {
            const selected = item.id === activeNewsId;
            return <button
              className={`news-item ${selected ? "active" : ""}`}
              key={item.id}
              onPointerEnter={(event) => { if (event.pointerType === "mouse" && supportsPreciseHover()) setActiveNewsId(item.id); }}
              onPointerDown={(event) => {
                if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
                newsGesture.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, dragged: false };
              }}
              onPointerMove={(event) => {
                const gesture = newsGesture.current;
                if (gesture.pointerId !== event.pointerId || gesture.dragged) return;
                if (Math.abs(event.clientX - gesture.startX) > 10 || Math.abs(event.clientY - gesture.startY) > 10) gesture.dragged = true;
              }}
              onClick={(event) => {
                const wasDrag = event.detail > 0 && newsGesture.current.dragged;
                newsGesture.current = { pointerId: null, startX: 0, startY: 0, dragged: false };
                if (wasDrag) {
                  event.preventDefault();
                  return;
                }
                setActiveNewsId(item.id);
              }}
              aria-expanded={selected}
              aria-haspopup="dialog"
              aria-controls="news-detail"
            >
              <time dateTime={item.date}>{item.date.slice(5).replace("-", ".")}</time>
              <span><em>{item.tag[lang]}</em><strong>{item.title[lang]}</strong></span>
              <b aria-hidden="true">›</b>
            </button>;
          })}
        </div>
        {activeNews && <article className="news-detail" id="news-detail" aria-label={`${nc.detail}: ${activeNews.title[lang]}`}>
          <div className="news-detail-photo">
            <Image src={`${BASE_PATH}${activeNews.image}`} alt={activeNews.photoCaption[lang]} fill sizes="(max-width: 760px) 100vw, 420px"/>
            <span>{activeNews.tag[lang]}</span>
            <button onClick={() => setActiveNewsId(null)} aria-label={nc.close}>×</button>
          </div>
          <div className="news-detail-body">
            <div className="news-detail-meta"><time dateTime={activeNews.date}>{activeNews.date.replaceAll("-", ".")}</time><span>{nc.detail}</span></div>
            <h3>{activeNews.title[lang]}</h3>
            <p>{activeNews.summary[lang]}</p>
            <div className="news-detail-source"><span><small>{nc.source}</small><b>{activeNews.sourceName[lang]}</b></span><a href={activeNews.sourceUrl} target="_blank" rel="noreferrer">{nc.open}<i>↗</i></a></div>
            <a className="news-photo-credit" href={activeNews.photoUrl} target="_blank" rel="noreferrer"><small>{nc.photo} · {activeNews.photoCaption[lang]}</small><span>{activeNews.photoCredit[lang]}</span></a>
          </div>
        </article>}
      </aside>
      {activeNews && <button className="news-mobile-backdrop" onClick={() => setActiveNewsId(null)} aria-label={nc.close}/>}

      <div className="hero" id="route">
        <div className="hero-copy"><span className="eyebrow"><i/>{t.eyebrow}</span><h1>{t.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1><p>{t.subtitle}</p>
          <div className="hero-actions"><a className="primary-cta" href="#products">{t.cta}<Icon name="arrow"/></a><button className="hero-contact-cta" type="button" onClick={() => openCustomerService("whatsapp")}>{sc.heroContact}</button></div>
        </div>
        <div className="hero-price-shell">
          <section
            className="hero-price-carousel"
            role="region"
            aria-roledescription="carousel"
            aria-label={hc.carousel}
            onMouseEnter={() => setHeroPaused(true)}
            onMouseLeave={() => setHeroPaused(false)}
            onFocusCapture={() => setHeroPaused(true)}
            onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setHeroPaused(false); }}
            onTouchStart={(event) => setHeroTouchStart(event.touches[0]?.clientX ?? null)}
            onTouchEnd={(event) => {
              const end = event.changedTouches[0]?.clientX;
              if (heroTouchStart !== null && end !== undefined && Math.abs(end - heroTouchStart) > 40) changeHeroSlide(end > heroTouchStart ? -1 : 1);
              setHeroTouchStart(null);
            }}
          >
            <div className="hero-price-slide" key={`${heroProduct.kind}-${market}-${currency}-${lang}`} aria-live="polite">
              <header className="hero-price-head">
                <Image src={`${BASE_PATH}${heroProduct.image}`} alt={productLabel(heroProduct)} width={52} height={52} sizes="52px" priority={heroSlide === 0}/>
                <div><strong>{productLabel(heroProduct)}</strong><span>{hc.label} · {t.moq} {heroProduct.moq} {t.pieces}</span></div>
                <small>{market === "kg" ? s.kgCity : s.uzCity}</small>
              </header>
              <div className="hero-price-compare">
                <div className="hero-price-value"><span>{hc.source}</span><strong>{formatUnitCurrency(heroCostCny, currency)}</strong><small>{hc.verified}</small></div>
                <i aria-hidden="true">→</i>
                <div className="hero-price-value local"><span>{hc.local}</span><strong>{formatUnitCurrency(heroRetailCny, currency)}</strong><small>{hc.reference}</small></div>
              </div>
              <div className="hero-price-result">
                <div><span>{hc.gap}</span><strong>+{formatUnitCurrency(heroGapCny, currency)}</strong><small>{hc.disclaimer}</small></div>
                <b aria-hidden="true">{String(heroSlide + 1).padStart(2, "0")} / {String(heroProducts.length).padStart(2, "0")}</b>
              </div>
            </div>
            <div className="hero-carousel-dots">{heroProducts.map((product, index) => <button key={product.kind} className={index === heroSlide ? "active" : ""} onClick={() => setHeroSlide(index)} aria-label={`${hc.show} ${index + 1}`} aria-current={index === heroSlide ? "true" : undefined}/>)}</div>
          </section>
        </div>
      </div>
    </section>

    <section className="search-band"><div className="search-box"><Icon name="search"/><input value={query} onChange={(e) => { setQuery(e.target.value); setVisibleCount(9); }} placeholder={t.search}/><button onClick={() => document.querySelector("#products")?.scrollIntoView({behavior:"smooth"})}>{t.cta}</button></div><div className="market-toggle"><span>{t.country}</span><button className={market === "kg" ? "active" : ""} onClick={() => setMarket("kg")}>🇰🇬 {s.kgCountry}</button><button className={market === "uz" ? "active" : ""} onClick={() => setMarket("uz")}>🇺🇿 {s.uzCountry}</button></div></section>

    <div className="mobile-category-shell">
      <div className="mobile-category-filter" aria-label={t.categories}>
        <button className={!selectedCategory ? "active" : ""} onClick={() => { setSelectedCategory(null); setVisibleCount(9); }}>{t.all}<b>{products.length}</b></button>
        {categories.map(([icon, names]) => <button className={selectedCategory === icon ? "active" : ""} key={icon} onClick={() => { setSelectedCategory(icon); setVisibleCount(9); }}>{names[lang]}<b>{products.filter((product) => productCategories[product.kind] === icon).length}</b></button>)}
      </div>
    </div>

    <section className="products-section" id="products">
      <div className="section-title"><div><span>2026 · {s.trend}</span><h2>{activeCategory ? activeCategory[1][lang] : t.market}</h2><p>{t.marketSub}</p></div></div>
      <div className="catalog-layout">
      <aside className="category-panel" id="categories">
        <div className="panel-heading"><strong>{t.categories}</strong><button onClick={() => { setSelectedCategory(null); setVisibleCount(9); }} aria-label={t.all}>☰</button></div>
        <div className="category-list">{categories.map(([icon, names]) => {
          const count = products.filter((product) => productCategories[product.kind] === icon).length;
          return <button className={selectedCategory === icon ? "active" : ""} key={icon} onClick={() => { setSelectedCategory((current) => current === icon ? null : icon); setVisibleCount(9); }} aria-pressed={selectedCategory === icon}>
            <span className="category-icon"><Icon name={icon}/></span><span>{names[lang]}</span><b><em>{count}</em>›</b>
          </button>;
        })}</div>
        <div className="buyer-note"><Icon name="shield"/><div><strong>{t.verified}</strong><span>{s.verifiedDetail}</span></div></div>
      </aside>
      <div className="product-grid">{shownProducts.map((product) => {
        const isAdded = Boolean(quoteItems[product.kind]);
        const badge = productBadgeByKind.get(product.kind);
        return <article className={`product-card ${isAdded ? "in-quote" : ""}`} key={product.kind}>
          <Link className="product-image" href={productHref(product.kind)} aria-label={`${detailLabel}: ${productLabel(product)}`}>{badge && <span className={`product-badge ${badge}`}>{productBadgeCopy[lang][badge]}</span>}<Image src={`${BASE_PATH}${product.image}`} alt={productLabel(product)} fill loading="lazy" sizes="(max-width: 760px) 50vw, (max-width: 1050px) 50vw, 33vw"/></Link>
          <div className="product-info">
            <h3><Link href={productHref(product.kind)}>{productLabel(product)}</Link></h3>
            <div className="product-pricing">
              <div className="price-block purchase"><span>{t.chinaPrice}</span><strong>{formatUnitCurrency(priceNumber(product.cost), currency)}</strong></div>
              <div className="price-block retail"><span>{t.localPrice}</span><strong>{formatCurrency(retailInCny(product), currency)}</strong></div>
            </div>
            <div className="product-meta"><span>{t.moq} {product.moq} {t.pieces}</span><span>{product.orders} {t.orders}</span></div>
            <div className="product-footer">
              <span><i/>{t.rail} → {market === "kg" ? s.kgCity : s.uzCity}</span>
              <div><Link href={productHref(product.kind)}>{detailLabel} <b aria-hidden="true">→</b></Link><button className={isAdded ? "added" : ""} onClick={(event) => addToQuote(product, event.currentTarget.closest<HTMLElement>(".product-card"))} aria-pressed={isAdded}>{isAdded ? <><b>✓</b>{iq.added}</> : iq.add}</button></div>
            </div>
          </div>
        </article>;
      })}
        {shownProducts.length === 0 && <div className="empty-state">{s.empty}</div>}</div>
      </div>
      {filteredProducts.length > 0 && <div className="catalog-pagination" aria-live="polite"><span>{showingLabel} {shownProducts.length} / {filteredProducts.length}</span>{shownProducts.length < filteredProducts.length && <button onClick={() => setVisibleCount((count) => count + 9)}>{loadMoreLabel}<b>+{Math.min(9, filteredProducts.length - shownProducts.length)}</b></button>}</div>}
    </section>

    <section className="process-section" id="process">
      <header className="process-heading"><span>{pc.eyebrow}</span><h2>{pc.title}</h2><p>{pc.subtitle}</p></header>
      <div className="process-steps">
        {pc.steps.map(([title, description], index) => <article key={title}>
          <div><b>{String(index + 1).padStart(2, "0")}</b><i/></div>
          <h3>{title}</h3><p>{description}</p>
        </article>)}
      </div>
      <div className="process-action">
        <div>{pc.facts.map((fact) => <span key={fact}><i/> {fact}</span>)}</div>
        <button onClick={() => quoteCount > 0 ? setDrawerOpen(true) : document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" })}>{quoteCount > 0 ? pc.quote : pc.choose}<Icon name="arrow"/></button>
      </div>
    </section>

    <section className="trust-story-section" aria-label={tc.title}>
      <div
        className="trust-story"
        data-stage={trustSlide}
        role="region"
        aria-roledescription="carousel"
        onMouseEnter={() => setTrustPaused(true)}
        onMouseLeave={() => setTrustPaused(false)}
        onFocus={() => setTrustPaused(true)}
        onBlur={() => setTrustPaused(false)}
      >
        <Image key={`${lang}-${trustSlide}`} className="trust-story-image" src={`${BASE_PATH}${trustStoryImages[trustSlide]}`} alt={tc.slides[trustSlide][0]} fill sizes="100vw"/>
        <div className="trust-story-shade"/>
        <article className="trust-story-copy" key={`copy-${lang}-${trustSlide}`}>
          <span className="trust-story-eyebrow"><i/>{tc.eyebrow}</span>
          <small>{tc.stage} {String(trustSlide + 1).padStart(2, "0")} / {String(trustStoryImages.length).padStart(2, "0")}</small>
          <h2>{tc.title}</h2>
          <h3>{tc.slides[trustSlide][0]}</h3>
          <p>{tc.slides[trustSlide][1]}</p>
          <b><i/> {tc.photo}</b>
        </article>
        <div className="trust-story-nav" role="tablist" aria-label={tc.title}>
          {tc.slides.map(([title], index) => <button
            key={title}
            type="button"
            role="tab"
            aria-selected={index === trustSlide}
            className={index === trustSlide ? "active" : ""}
            onClick={() => setTrustSlide(index)}
          ><span>{String(index + 1).padStart(2, "0")}</span><strong>{title}</strong></button>)}
        </div>
      </div>
    </section>
    </>}

    <CustomerServiceDock lang={lang} onRequest={openCustomerService}/>

    {quoteCount > 0 && <button className={`quote-tab ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen((open) => !open)} aria-label={`${iq.list}: ${quoteCount}`} title={`${iq.list}: ${quoteCount}`}>
      <Icon name="cart"/><span>{iq.list}</span><b>{quoteCount}</b>
    </button>}

    {drawerOpen && <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label={iq.close}/>}
    <aside id="inquiry-drawer" className={`inquiry-drawer ${drawerOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="inquiry-title" aria-hidden={!drawerOpen}>
      <header className="drawer-header">
        <div><span>{quoteCount > 0 ? `${iq.list} · ${quoteCount}` : sc.manager}</span><h2 id="inquiry-title">{quoteCount > 0 ? iq.title : sc.genericTitle}</h2><p>{quoteCount > 0 ? iq.subtitle : sc.genericSubtitle}</p></div>
        <button onClick={() => setDrawerOpen(false)} aria-label={iq.close}>×</button>
      </header>

      {quoteCount === 0 ? <div className="drawer-contact-intro"><b>01</b><p>{sc.genericHint}</p><button type="button" onClick={() => { setDrawerOpen(false); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); }}>{t.cta}</button></div> :
        <div className="inquiry-products">
          {selectedProducts.map((product) => <article key={product.kind}>
            <Image src={`${BASE_PATH}${product.image}`} alt="" width={58} height={58} sizes="58px"/>
            <div className="inquiry-product-copy">
              <h3>{productLabel(product)}</h3>
              <span>{formatUnitCurrency(priceNumber(product.cost), currency)} / {t.pieces} × {quoteItems[product.kind]}</span>
              <label>{iq.quantity}<input type="number" min={product.moq} step="1" value={quoteItems[product.kind]} onChange={(event) => updateQuantity(product.kind, Number(event.target.value), product.moq)}/></label>
            </div>
            <div className="inquiry-product-side"><strong>{formatUnitCurrency(priceNumber(product.cost) * quoteItems[product.kind], currency)}</strong><button onClick={() => removeFromQuote(product.kind)}>{iq.remove}</button></div>
          </article>)}
          <section className="inquiry-breakdown" aria-label={iq.subtotal}>
            <div className="inquiry-subtotal"><span>{iq.subtotal}</span><strong>{formatUnitCurrency(quoteSubtotalCny, currency)}</strong></div>
            <dl>
              <div><dt>{iq.rate}</dt><dd>{formatExchangeRate(currency)}</dd></div>
              <div><dt>{iq.excluded}</dt><dd>{iq.excludedDetail}</dd></div>
            </dl>
            <p>{iq.exchange} · {currency}</p>
          </section>
        </div>}

      <form className="contact-form" onSubmit={submitInquiry}>
          <label className="form-honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
          <label className="field full"><span>{iq.destination}</span><select name="destination" defaultValue={destinationOptions[0]}>{destinationOptions.map((city) => <option key={city}>{city}</option>)}</select></label>
          <label className="field full"><span>{iq.phone} *</span><div className="phone-field"><select name="phoneCountryCode" key={market} defaultValue={market === "kg" ? "+996" : "+998"}><option>+996</option><option>+998</option><option>+7</option><option>+86</option></select><input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="000 000 000"/></div></label>
          <label className="check-field full"><input type="checkbox" checked={sameWhatsapp} onChange={(event) => setSameWhatsapp(event.target.checked)}/><span>{iq.sameWhatsapp}</span></label>
          {!sameWhatsapp && <label className="field full"><span>{iq.whatsapp}</span><div className="phone-field"><select name="whatsappCountryCode" defaultValue={market === "kg" ? "+996" : "+998"}><option>+996</option><option>+998</option><option>+7</option><option>+86</option></select><input name="whatsapp" type="tel" inputMode="tel" placeholder="000 000 000"/></div></label>}
          <label className="field full"><span>{iq.email}</span><input name="email" type="email" autoComplete="email" placeholder="name@company.com"/><small>{iq.emailHint}</small></label>
          <fieldset className="contact-preference full"><legend>{iq.preferred}</legend><div>
            {(["phone", "whatsapp", "email"] as const).map((method) => <button type="button" key={method} className={preferredContact === method ? "active" : ""} onClick={() => setPreferredContact(method)}>{method === "phone" ? iq.phoneFirst : method === "whatsapp" ? iq.whatsappFirst : iq.emailFirst}</button>)}
          </div><input type="hidden" name="preferredContact" value={preferredContact}/></fieldset>
          <label className="field full"><span>{iq.note}</span><textarea name="note" rows={3} placeholder={iq.notePlaceholder}/></label>
          <button className="submit-inquiry full" type="submit" disabled={submitting}>{submitting ? "…" : iq.submit}<Icon name="arrow"/></button>
          <p className="response-note full">{iq.response}<span>{iq.free}</span></p>
          {submitError && <div className="inquiry-error full" role="alert">{submitError}</div>}
          {submitted && <div className="inquiry-success full" role="status">✓ {iq.success}</div>}
      </form>
    </aside>

    <footer><Logo variant={logoVariant} lang={lang}/><p>{s.footerTagline}</p><nav aria-label="Legal"><Link href="/company">{lang === "zh" ? "公司信息" : "О компании"}</Link><Link href="/privacy">{lang === "zh" ? "隐私政策" : "Конфиденциальность"}</Link></nav><span>{s.copyright}</span></footer>
  </main>;
}
