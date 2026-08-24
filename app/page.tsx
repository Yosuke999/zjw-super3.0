"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { BASE_PATH } from "./base-path";

type Lang = "ru" | "ky" | "uz" | "zh";
type Currency = "CNY" | "KGS" | "UZS" | "RUB";
type LogoVariant = 1 | 2 | 3 | 4 | 5 | 6;

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

const inquiryCopy = {
  ru: {
    add: "Добавить в запрос", added: "Добавлено", list: "Запрос", title: "Получить точную цену с доставкой",
    subtitle: "Выберите количество и оставьте номер — менеджер уточнит закупочную цену, доставку и расходы.", empty: "Добавьте товары, чтобы получить расчёт.",
    quantity: "Количество", remove: "Удалить", destination: "Город доставки", phone: "Контактный телефон", whatsapp: "WhatsApp",
    sameWhatsapp: "WhatsApp совпадает с контактным телефоном", email: "Эл. почта", emailHint: "Для получения полного коммерческого предложения",
    preferred: "Предпочтительный способ связи", phoneFirst: "Телефон", whatsappFirst: "WhatsApp", emailFirst: "Почта", note: "Комментарий",
    notePlaceholder: "Нужные модели, цвета, сроки или другие пожелания", submit: "Отправить запрос и ждать звонка",
    response: "В рабочее время свяжемся с вами в течение 30 минут.", free: "Бесплатный расчёт · без обязательства заказывать",
    success: "Запрос подготовлен. Мы свяжемся с вами по телефону.", close: "Закрыть", exchange: "Ориентировочный пересчёт",
  },
  ky: {
    add: "Сурамга кошуу", added: "Кошулду", list: "Сурам", title: "Жеткирүү менен так бааны алыңыз",
    subtitle: "Санын тандап, телефон номериңизди калтырыңыз — адис өнүмдү, жеткирүүнү жана чыгымдарды эсептейт.", empty: "Эсептөө үчүн өнүмдөрдү кошуңуз.",
    quantity: "Саны", remove: "Өчүрүү", destination: "Жеткирүү шаары", phone: "Байланыш телефону", whatsapp: "WhatsApp",
    sameWhatsapp: "WhatsApp номери байланыш телефону менен бирдей", email: "Электрондук дарек", emailHint: "Толук сунушту алуу үчүн",
    preferred: "Байланыштын ыңгайлуу жолу", phoneFirst: "Телефон", whatsappFirst: "WhatsApp", emailFirst: "Электрондук дарек", note: "Кошумча маалымат",
    notePlaceholder: "Модель, түс, мөөнөт же башка каалоолор", submit: "Сурам жөнөтүп, чалууну күтүү",
    response: "Иш убактысында 30 мүнөттүн ичинде байланышабыз.", free: "Акысыз эсеп · сатып алуу милдеттүү эмес",
    success: "Сурам даяр. Биз сизге телефон аркылуу байланышабыз.", close: "Жабуу", exchange: "Болжолдуу курс",
  },
  uz: {
    add: "So‘rovga qo‘shish", added: "Qo‘shildi", list: "So‘rov", title: "Yetkazib berish bilan aniq narxni oling",
    subtitle: "Miqdorni tanlang va telefon raqamingizni qoldiring — menejer mahsulot, yetkazish va xarajatlarni hisoblaydi.", empty: "Hisob-kitob olish uchun mahsulot qo‘shing.",
    quantity: "Miqdor", remove: "O‘chirish", destination: "Yetkazib berish shahri", phone: "Aloqa telefoni", whatsapp: "WhatsApp",
    sameWhatsapp: "WhatsApp raqami aloqa telefoni bilan bir xil", email: "E-pochta", emailHint: "To‘liq tijorat taklifini olish uchun",
    preferred: "Afzal aloqa usuli", phoneFirst: "Telefon", whatsappFirst: "WhatsApp", emailFirst: "E-pochta", note: "Izoh",
    notePlaceholder: "Model, rang, muddat yoki boshqa istaklar", submit: "So‘rov yuborish va qo‘ng‘iroqni kutish",
    response: "Ish vaqtida 30 daqiqa ichida bog‘lanamiz.", free: "Bepul hisob-kitob · buyurtma majburiy emas",
    success: "So‘rov tayyor. Siz bilan telefon orqali bog‘lanamiz.", close: "Yopish", exchange: "Taxminiy kurs",
  },
  zh: {
    add: "加入询价单", added: "已加入", list: "询价单", title: "获取准确到货价",
    subtitle: "选择采购数量并留下电话，采购经理将核算商品、物流及相关费用。", empty: "添加商品后即可获取采购报价。",
    quantity: "采购数量", remove: "删除", destination: "收货城市", phone: "联系电话", whatsapp: "WhatsApp",
    sameWhatsapp: "WhatsApp 与联系电话相同", email: "邮箱", emailHint: "用于接收完整报价单",
    preferred: "优先联系方式", phoneFirst: "电话优先", whatsappFirst: "WhatsApp", emailFirst: "邮箱", note: "备注",
    notePlaceholder: "需要的型号、颜色、交期或其他要求", submit: "提交询价，等待电话联系",
    response: "工作时间内，我们将在 30 分钟内与您联系。", free: "免费报价 · 不产生订购义务",
    success: "询价信息已准备，我们会优先通过电话与您联系。", close: "关闭", exchange: "参考汇率换算",
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

const kyrgyzProductNames: Record<string, string> = {
  "screen-protector": "Смартфон үчүн коргоочу айнек", "phone-case": "Тунук соккуга чыдамдуу кап", "usb-c-cable": "Өрүлгөн USB-C тез кубаттоо кабели",
  "phone-stand": "Бүктөлүүчү үстөл телефон кармагычы", "car-holder": "Унаанын желдеткичине телефон кармагыч", "selfie-stick": "Штативдүү селфи таякчасы",
  "cable-organizer": "Кабель коргоочу жана иреттегич топтом", "hair-set": "Чач кыскычтар жана резинкалар топтому", "makeup-sponge": "Макияж губкасы жана пуф топтому",
  "curling-ribbon": "Жылуулуксуз чач тармалдатуучу лента", "nail-set": "Тырмак чаптамалары жана жасалма тырмактар", "scarf-clasp": "Жоолук үчүн магниттик илгичтер жана брошкалар",
  "jewelry-box": "Саякаттык зер буюмдар кутусу", "adhesive-hooks": "Тешпей жабыштырылуучу илгичтер", "drain-strainer": "Суу агызгыч чыпкалар топтому",
  "vacuum-bags": "Вакуумдук кысуучу баштыктар топтому", "drawer-organizer": "Тартма бөлгүч жана ич кийим иреттегич", "travel-organizer": "Бут кийим кабы жана саякат иреттегичтери",
  "gap-strip": "Раковина жана меш үчүн силикон тилкелер", "car-towels": "Унаа үчүн микрофибра сүлгүлөр", "seat-organizer": "Унаа отургуч аралыгына иреттегич",
  "sunshade": "Алдыңкы айнекке бүктөлүүчү күн калкалоочу чатыр", "frost-cover": "Алдыңкы айнекке кышкы кар капкак", "uv-set": "Күндөн коргоочу жеңдер жана бет кап",
  "winter-gloves": "Сенсордук экранга кышкы мээлейлер", "lint-remover": "USB-C түк тазалагыч", "bag-sealer": "USB-C кичи пакет жапкыч",
  "usb-fan": "Колго жана үстөлгө USB-C желдеткич", "sensor-light": "Кыймыл сенсорлуу магниттик чырак", "shoe-dryer": "PTC бут кийим кургаткыч",
};

const deliveryCities: Record<"kg" | "uz", Record<Lang, string[]>> = {
  kg: {
    ru: ["Бишкек", "Ош", "Каракол"], ky: ["Бишкек", "Ош", "Каракол"], uz: ["Bishkek", "O‘sh", "Qorako‘l"], zh: ["比什凯克", "奥什", "卡拉科尔"],
  },
  uz: {
    ru: ["Ташкент", "Самарканд", "Андижан"], ky: ["Ташкент", "Самарканд", "Анжиян"], uz: ["Toshkent", "Samarqand", "Andijon"], zh: ["塔什干", "撒马尔罕", "安集延"],
  },
};

const currencyOptions: Array<{ code: Currency; label: string; perCny: number; locale: string; digits: number }> = [
  { code: "CNY", label: "CNY ¥", perCny: 1, locale: "zh-CN", digits: 2 },
  { code: "KGS", label: "KGS", perCny: 12.2, locale: "ru-RU", digits: 0 },
  { code: "UZS", label: "UZS", perCny: 1750, locale: "uz-UZ", digits: 0 },
  { code: "RUB", label: "RUB ₽", perCny: 11.3, locale: "ru-RU", digits: 0 },
];

const priceNumber = (value: string) => Number(value.replace(/[^\d.]/g, ""));

function formatCurrency(cnyValue: number, currency: Currency) {
  const option = currencyOptions.find((item) => item.code === currency) ?? currencyOptions[0];
  const value = cnyValue * option.perCny;
  const formatted = new Intl.NumberFormat(option.locale, { maximumFractionDigits: option.digits, minimumFractionDigits: option.digits }).format(value);
  if (currency === "CNY") return `¥ ${formatted}`;
  if (currency === "RUB") return `₽ ${formatted}`;
  return `${currency} ${formatted}`;
}

const productName = (ru: string, uz: string, zh: string) => ({ ru, ky: ru, uz, zh });

const products = [
  { name: productName("Защитное стекло для смартфона", "Telefon uchun himoya oynasi", "手机钢化膜"), image: "/products/01-tempered-glass-screen-protectors.jpg", cost: "¥ 0.45", retail: { kg: "120 сом", uz: "17 000 so‘m" }, moq: 500, orders: 2358, kind: "screen-protector" },
  { name: productName("Прозрачный противоударный чехол", "Shaffof zarbaga chidamli g‘ilof", "透明防摔手机壳"), image: "/products/02-clear-shockproof-phone-case.jpg", cost: "¥ 2.80", retail: { kg: "350 сом", uz: "49 000 so‘m" }, moq: 100, orders: 1846, kind: "phone-case" },
  { name: productName("Плетёный кабель быстрой зарядки USB-C", "O‘ralgan USB-C tezkor quvvat kabeli", "编织USB-C快充线"), image: "/products/03-braided-usb-c-fast-charge-cable.jpg", cost: "¥ 5.60", retail: { kg: "550 сом", uz: "75 000 so‘m" }, moq: 100, orders: 1527, kind: "usb-c-cable" },
  { name: productName("Складная настольная подставка", "Buklanadigan stol telefon tagligi", "折叠桌面手机支架"), image: "/products/04-folding-desktop-phone-stand.jpg", cost: "¥ 3.20", retail: { kg: "350 сом", uz: "49 000 so‘m" }, moq: 100, orders: 1326, kind: "phone-stand" },
  { name: productName("Автомобильный держатель на дефлектор", "Avtomobil havo panjarasi telefon ushlagichi", "车载出风口手机支架"), image: "/products/05-car-air-vent-phone-holder.jpg", cost: "¥ 6.80", retail: { kg: "650 сом", uz: "89 000 so‘m" }, moq: 100, orders: 1098, kind: "car-holder" },
  { name: productName("Селфи-палка со штативом", "Tripodli selfi tayoqchasi", "自拍杆三脚架"), image: "/products/06-selfie-stick-tripod.jpg", cost: "¥ 11.50", retail: { kg: "1 200 сом", uz: "165 000 so‘m" }, moq: 50, orders: 987, kind: "selfie-stick" },
  { name: productName("Набор защиты и органайзеров для кабеля", "Kabel himoyasi va tartiblagich to‘plami", "数据线保护整理套装"), image: "/products/07-cable-protector-organizer-set.jpg", cost: "¥ 1.80", retail: { kg: "250 сом", uz: "35 000 so‘m" }, moq: 200, orders: 1642, kind: "cable-organizer" },
  { name: productName("Заколки-крабы и резинки для волос", "Soch qisqichi va rezinka to‘plami", "抓夹发圈组合"), image: "/products/08-hair-claw-and-hair-tie-set.jpg", cost: "¥ 4.20", retail: { kg: "450 сом", uz: "62 000 so‘m" }, moq: 100, orders: 1435, kind: "hair-set" },
  { name: productName("Спонжи и пуховки для макияжа", "Makiyaj gubkasi va puff to‘plami", "美妆蛋粉扑套装"), image: "/products/09-makeup-sponge-and-puff-set.jpg", cost: "¥ 3.80", retail: { kg: "420 сом", uz: "58 000 so‘m" }, moq: 100, orders: 1719, kind: "makeup-sponge" },
  { name: productName("Лента для завивки без нагрева", "Issiqliksiz soch jingalak lentasi", "免热卷发带套装"), image: "/products/10-heatless-curling-ribbon-set.jpg", cost: "¥ 3.50", retail: { kg: "390 сом", uz: "54 000 so‘m" }, moq: 100, orders: 1268, kind: "curling-ribbon" },
  { name: productName("Наклейки и накладные ногти", "Tirnoq stikerlari va sun’iy tirnoqlar", "美甲贴片甲套装"), image: "/products/11-nail-stickers-and-press-on-nails.jpg", cost: "¥ 2.90", retail: { kg: "350 сом", uz: "48 000 so‘m" }, moq: 200, orders: 1883, kind: "nail-set" },
  { name: productName("Магнитные застёжки и броши для платка", "Ro‘mol uchun magnit qisqich va brosh", "围巾磁扣胸针套装"), image: "/products/12-scarf-magnetic-clasps-and-brooches.jpg", cost: "¥ 3.20", retail: { kg: "380 сом", uz: "52 000 so‘m" }, moq: 100, orders: 932, kind: "scarf-clasp" },
  { name: productName("Дорожная шкатулка для украшений", "Sayohat zargarlik qutisi", "旅行首饰盒"), image: "/products/13-travel-jewelry-box-and-roll.jpg", cost: "¥ 12.80", retail: { kg: "1 300 сом", uz: "180 000 so‘m" }, moq: 50, orders: 864, kind: "jewelry-box" },
  { name: productName("Самоклеящиеся крючки без сверления", "Teshmasdan yopishtiriladigan ilgaklar", "免打孔粘钩套装"), image: "/products/14-no-drill-adhesive-hook-set.jpg", cost: "¥ 3.60", retail: { kg: "420 сом", uz: "58 000 so‘m" }, moq: 100, orders: 1496, kind: "adhesive-hooks" },
  { name: productName("Набор ситечек для слива", "Drenaj filtri to‘plami", "下水口过滤网套装"), image: "/products/15-drain-strainer-set.jpg", cost: "¥ 4.80", retail: { kg: "520 сом", uz: "72 000 so‘m" }, moq: 100, orders: 1107, kind: "drain-strainer" },
  { name: productName("Набор вакуумных пакетов", "Vakuum siqish paketlari", "真空压缩袋套装"), image: "/products/16-vacuum-compression-bag-set.jpg", cost: "¥ 15.50", retail: { kg: "1 550 сом", uz: "215 000 so‘m" }, moq: 30, orders: 1254, kind: "vacuum-bags" },
  { name: productName("Разделители и органайзер для белья", "Tortma ajratgich va ichki kiyim tartiblagichi", "抽屉分隔内衣收纳盒"), image: "/products/17-drawer-divider-and-underwear-organizer.jpg", cost: "¥ 9.80", retail: { kg: "980 сом", uz: "136 000 so‘m" }, moq: 50, orders: 876, kind: "drawer-organizer" },
  { name: productName("Чехлы для обуви и дорожные органайзеры", "Poyabzal qopi va sayohat tartiblagichi", "鞋子防尘旅行收纳袋"), image: "/products/18-shoe-dust-bag-and-travel-organizer-set.jpg", cost: "¥ 13.60", retail: { kg: "1 350 сом", uz: "188 000 so‘m" }, moq: 50, orders: 798, kind: "travel-organizer" },
  { name: productName("Силиконовые планки для зазоров", "Rakovina va plita uchun silikon tirqish tasmasi", "水槽灶台缝隙条"), image: "/products/19-silicone-sink-and-stove-gap-strips.jpg", cost: "¥ 5.20", retail: { kg: "590 сом", uz: "82 000 so‘m" }, moq: 100, orders: 1034, kind: "gap-strip" },
  { name: productName("Салфетки из микрофибры для автомобиля", "Avtomobil uchun mikrofiber sochiqlar", "汽车超细纤维毛巾套装"), image: "/products/20-car-microfiber-towel-set.jpg", cost: "¥ 6.30", retail: { kg: "720 сом", uz: "99 000 so‘m" }, moq: 100, orders: 1186, kind: "car-towels" },
  { name: productName("Органайзеры в щель автомобильного сиденья", "Avtomobil o‘rindig‘i oralig‘i organayzeri", "汽车座椅缝隙收纳盒"), image: "/products/21-car-seat-gap-filler-and-storage-boxes.jpg", cost: "¥ 18.50", retail: { kg: "1 850 сом", uz: "255 000 so‘m" }, moq: 30, orders: 694, kind: "seat-organizer" },
  { name: productName("Складной зонт-шторка на лобовое стекло", "Buklanadigan old oyna soyabon soyasi", "折叠式汽车遮阳伞"), image: "/products/22-folding-windshield-sunshade-umbrella.jpg", cost: "¥ 16.80", retail: { kg: "1 680 сом", uz: "235 000 so‘m" }, moq: 30, orders: 905, kind: "sunshade" },
  { name: productName("Зимний чехол на лобовое стекло", "Old oyna uchun qor va muz qopqog‘i", "汽车挡风玻璃防雪罩"), image: "/products/23-windshield-snow-frost-cover.jpg", cost: "¥ 21.50", retail: { kg: "2 100 сом", uz: "295 000 so‘m" }, moq: 30, orders: 642, kind: "frost-cover" },
  { name: productName("Нарукавники и маска от солнца", "UV qo‘l yenglari va yuz niqobi", "防晒冰袖面罩套装"), image: "/products/24-uv-arm-sleeves-and-face-cover.jpg", cost: "¥ 5.90", retail: { kg: "650 сом", uz: "90 000 so‘m" }, moq: 100, orders: 1378, kind: "uv-set" },
  { name: productName("Зимние перчатки для сенсорного экрана", "Sensorli ekran uchun qishki qo‘lqop", "触屏保暖手套"), image: "/products/25-touchscreen-winter-gloves.jpg", cost: "¥ 8.80", retail: { kg: "890 сом", uz: "125 000 so‘m" }, moq: 100, orders: 1594, kind: "winter-gloves" },
  { name: productName("Машинка для удаления катышков USB-C", "USB-C tuk tozalagich", "USB-C充电毛球修剪器"), image: "/products/26-usb-c-lint-remover.jpg", cost: "¥ 17.80", retail: { kg: "1 750 сом", uz: "245 000 so‘m" }, moq: 30, orders: 763, kind: "lint-remover" },
  { name: productName("Мини-запайщик пакетов USB-C", "USB-C mini paket yopishtirgich", "USB-C迷你封口机"), image: "/products/27-usb-c-mini-bag-sealer.jpg", cost: "¥ 9.60", retail: { kg: "980 сом", uz: "136 000 so‘m" }, moq: 50, orders: 1129, kind: "bag-sealer" },
  { name: productName("Ручной настольный вентилятор USB-C", "Qo‘l va stol uchun USB-C ventilyator", "USB-C手持桌面风扇"), image: "/products/28-handheld-tabletop-usb-c-fan.jpg", cost: "¥ 18.50", retail: { kg: "1 850 сом", uz: "255 000 so‘m" }, moq: 30, orders: 821, kind: "usb-fan" },
  { name: productName("Магнитный светильник с датчиком движения", "Harakat sensorli magnit shkaf chirog‘i", "人体感应磁吸柜灯"), image: "/products/29-motion-sensor-magnetic-cabinet-light.jpg", cost: "¥ 15.80", retail: { kg: "1 580 сом", uz: "218 000 so‘m" }, moq: 30, orders: 746, kind: "sensor-light" },
  { name: productName("PTC-сушилка для обуви", "PTC poyabzal quritgichi", "PTC恒温烘鞋器"), image: "/products/30-ptc-shoe-dryer.jpg", cost: "¥ 28.50", retail: { kg: "2 850 сом", uz: "395 000 so‘m" }, moq: 20, orders: 584, kind: "shoe-dryer" },
];

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

function ProductVisual({ kind }: { kind: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 180 150" aria-hidden="true" {...common}>
    {kind === "kettle" && <><path d="M61 54h57l6 60H55l6-60Z"/><path d="M70 54V40h38v14M118 64c24-5 30 12 20 27-4 6-10 9-16 10M77 40c-10-24 32-24 25 0"/><path d="M68 91h42"/></>}
    {kind === "box" && <><path d="M42 55h96v67H42z"/><path d="m42 55 14-20h68l14 20M56 35l18 20M124 35l-18 20M78 82h24M90 55v67"/></>}
    {kind === "drill" && <><path d="M45 56h81l12 12-12 18H93v-9H45V56Z"/><path d="M92 86v36H68l-9-45M126 64h17M143 59v10M106 69h12"/><circle cx="78" cy="97" r="5"/></>}
    {kind === "coat" && <><path d="m70 34 20 12 20-12 27 20-16 25-11-7v52H70V72l-11 7-16-25 27-20Z"/><path d="M90 46v78M72 34c2 16 34 16 36 0M70 87h20M110 87H90"/></>}
  </svg>;
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
  const [lang, setLang] = useState<Lang>("ru");
  const [currency, setCurrency] = useState<Currency>("KGS");
  const [market, setMarket] = useState<"kg" | "uz">("kg");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [quoteItems, setQuoteItems] = useState<Record<string, number>>({});
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sameWhatsapp, setSameWhatsapp] = useState(true);
  const [preferredContact, setPreferredContact] = useState<"phone" | "whatsapp" | "email">("phone");
  const [submitted, setSubmitted] = useState(false);
  const [showBrand, setShowBrand] = useState(false);
  const [logoVariant, setLogoVariant] = useState<LogoVariant>(1);
  const t = copy[lang];
  const iq = inquiryCopy[lang];
  const s = siteCopy[lang];
  const productLabel = (product: (typeof products)[number]) => lang === "ky" ? kyrgyzProductNames[product.kind] : product.name[lang];
  const shownProducts = useMemo(() => products.filter((product) => !query || (lang === "ky" ? kyrgyzProductNames[product.kind] : product.name[lang]).toLowerCase().includes(query.toLowerCase())), [query, lang]);
  const selectedProducts = products.filter((product) => quoteItems[product.kind]);
  const quoteCount = selectedProducts.length;
  const destinationOptions = deliveryCities[market][lang];

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : lang;
    document.title = s.brand;
  }, [lang, s.brand]);

  useEffect(() => {
    document.body.style.overflow = drawerOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [drawerOpen]);

  const retailInCny = (product: (typeof products)[number]) => {
    const sourceCurrency: Currency = market === "kg" ? "KGS" : "UZS";
    const sourceRate = currencyOptions.find((item) => item.code === sourceCurrency)?.perCny ?? 1;
    return priceNumber(product.retail[market]) / sourceRate;
  };

  const addToQuote = (product: (typeof products)[number]) => {
    if (quoteItems[product.kind]) {
      setDrawerOpen(true);
      return;
    }
    setQuoteItems((current) => ({ ...current, [product.kind]: product.moq }));
    setSubmitted(false);
    if (quoteCount === 0) setDrawerOpen(true);
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

  const submitInquiry = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return <main className="market-shell">
    <div className="top-strip"><span>{s.top[0]}</span><i/><span>{s.top[1]}</span><i/><span>{s.top[2]}</span><div className="strip-route"><b>{s.stops[0]}</b><span>{s.stops[1]}</span><span>{s.stops[2]}</span><span>{s.stops[3]}</span></div></div>
    <header className="site-header">
      <Logo variant={logoVariant} lang={lang}/>
      <nav aria-label={s.navLabel}>{t.nav.map((item, i) => <a href={i === 0 ? "#categories" : i === 2 ? "#route" : "#products"} key={item}>{item}</a>)}</nav>
      <div className="header-actions">
        <label className="language-select"><span className="sr-only">{s.languageLabel}</span><select value={lang} onChange={(e) => { setLang(e.target.value as Lang); setNotice(""); }}>{(Object.keys(copy) as Lang[]).map((key) => <option key={key} value={key}>{copy[key].label}</option>)}</select></label>
        <label className="currency-select"><span className="sr-only">{s.currencyLabel}</span><select value={currency} onChange={(e) => setCurrency(e.target.value as Currency)}>{currencyOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
        <button className="quote-button" onClick={() => setDrawerOpen(true)} aria-expanded={drawerOpen} aria-controls="inquiry-drawer"><Icon name="cart"/>{iq.list}<span>{quoteCount}</span></button>
      </div>
    </header>
    {notice && <button className="toast" onClick={() => setNotice("")}>{notice}<b>×</b></button>}
    {showBrand ? <BrandGuide onClose={() => setShowBrand(false)} selected={logoVariant} onSelect={setLogoVariant}/> : <>
    <section className="workspace">
      <aside className="category-panel" id="categories">
        <div className="panel-heading"><strong>{t.categories}</strong><span>☰</span></div>
        <div className="category-list">{categories.map(([icon, names]) => <button key={icon}><span className="category-icon"><Icon name={icon}/></span><span>{names[lang]}</span><b>›</b></button>)}</div>
        <div className="buyer-note"><Icon name="shield"/><div><strong>{t.verified}</strong><span>{s.verifiedDetail}</span></div></div>
      </aside>

      <div className="hero" id="route">
        <div className="hero-copy"><span className="eyebrow"><i/>{t.eyebrow}</span><h1>{t.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1><p>{t.subtitle}</p>
          <div className="hero-actions"><a className="primary-cta" href="#products">{t.cta}<Icon name="arrow"/></a><button className="secondary-cta" onClick={() => setNotice(s.logisticsNotice)}>{t.logistics}</button></div>
        </div>
        <div className="route-visual" aria-label={t.route}><div className="sun-disc"/><div className="route-card"><span>{t.route}</span><strong>{t.days}</strong><small>{t.arrival}</small></div>
          <svg viewBox="0 0 430 260" aria-hidden="true"><path className="land" d="M28 197c48-62 92-67 139-30 45-75 101-91 159-35 24-22 51-23 77-4v97H28Z"/><path className="rail" d="M32 214C139 189 237 189 405 151"/><path className="rail rail-two" d="M34 225c111-25 212-26 373-62"/><path className="track" d="m74 205 7 11m44-23 7 11m48-22 7 11m49-21 7 11m49-24 7 11m48-23 7 11"/><g className="train"><path d="M265 129h69l18 20-5 20-77 16-13-16Z"/><path d="M277 139h18v13h-22M302 139h23l11 13h-34Z"/><circle cx="280" cy="176" r="7"/><circle cx="330" cy="166" r="7"/></g></svg>
          <div className="route-cities"><span className="china">{s.china}</span><span className="kg">KG</span><span className="uz">UZ</span></div>
        </div>
      </div>
    </section>

    <section className="search-band"><div className="search-box"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search}/><button onClick={() => document.querySelector("#products")?.scrollIntoView({behavior:"smooth"})}>{t.cta}</button></div><div className="market-toggle"><span>{t.country}</span><button className={market === "kg" ? "active" : ""} onClick={() => setMarket("kg")}>🇰🇬 {s.kgCountry}</button><button className={market === "uz" ? "active" : ""} onClick={() => setMarket("uz")}>🇺🇿 {s.uzCountry}</button></div></section>

    <section className="products-section" id="products">
      <div className="section-title"><div><span>2026 · {s.trend}</span><h2>{t.market}</h2><p>{t.marketSub}</p></div><a href="#products">{t.all}<Icon name="arrow"/></a></div>
      <div className="product-grid">{shownProducts.map((product) => {
        const isAdded = Boolean(quoteItems[product.kind]);
        return <article className={`product-card ${isAdded ? "in-quote" : ""}`} key={product.kind}>
          <div className="product-image"><span className="product-badge">{market === "kg" ? "KG" : "UZ"} {s.badge}</span><img src={`${BASE_PATH}${product.image}`} alt={productLabel(product)}/><button aria-label={s.save}>♡</button></div>
          <div className="product-info">
            <h3>{productLabel(product)}</h3>
            <div className="product-pricing">
              <div className="price-block purchase"><span>{t.chinaPrice}</span><strong>{formatCurrency(priceNumber(product.cost), currency)}</strong></div>
              <div className="price-block retail"><span>{t.localPrice}</span><strong>{formatCurrency(retailInCny(product), currency)}</strong></div>
            </div>
            <div className="product-meta"><span>{t.moq} {product.moq} {t.pieces}</span><span>{product.orders} {t.orders}</span></div>
            <div className="product-footer">
              <span><i/>{t.rail} → {market === "kg" ? s.kgCity : s.uzCity}</span>
              <button className={isAdded ? "added" : ""} onClick={() => addToQuote(product)} aria-pressed={isAdded}>{isAdded ? <><b>✓</b>{iq.added}</> : iq.add}</button>
            </div>
          </div>
        </article>;
      })}
        {shownProducts.length === 0 && <div className="empty-state">{s.empty}</div>}</div>
    </section>
    </>}

    {quoteCount > 0 && <button className={`quote-tab ${drawerOpen ? "open" : ""}`} onClick={() => setDrawerOpen((open) => !open)} aria-label={`${iq.list}: ${quoteCount}`}>
      <Icon name="cart"/><span>{iq.list}</span><b>{quoteCount}</b>
    </button>}

    {drawerOpen && <button className="drawer-backdrop" onClick={() => setDrawerOpen(false)} aria-label={iq.close}/>}
    <aside id="inquiry-drawer" className={`inquiry-drawer ${drawerOpen ? "open" : ""}`} role="dialog" aria-modal="true" aria-labelledby="inquiry-title" aria-hidden={!drawerOpen}>
      <header className="drawer-header">
        <div><span>{iq.list} · {quoteCount}</span><h2 id="inquiry-title">{iq.title}</h2><p>{iq.subtitle}</p></div>
        <button onClick={() => setDrawerOpen(false)} aria-label={iq.close}>×</button>
      </header>

      {quoteCount === 0 ? <div className="drawer-empty"><Icon name="cart"/><p>{iq.empty}</p><button onClick={() => { setDrawerOpen(false); document.querySelector("#products")?.scrollIntoView({ behavior: "smooth" }); }}>{t.cta}</button></div> : <>
        <div className="inquiry-products">
          {selectedProducts.map((product) => <article key={product.kind}>
            <img src={`${BASE_PATH}${product.image}`} alt=""/>
            <div className="inquiry-product-copy">
              <h3>{productLabel(product)}</h3>
              <span>{formatCurrency(priceNumber(product.cost), currency)} / {t.pieces}</span>
              <label>{iq.quantity}<input type="number" min={product.moq} step="1" value={quoteItems[product.kind]} onChange={(event) => updateQuantity(product.kind, Number(event.target.value), product.moq)}/></label>
            </div>
            <div className="inquiry-product-side"><strong>{formatCurrency(priceNumber(product.cost) * quoteItems[product.kind], currency)}</strong><button onClick={() => removeFromQuote(product.kind)}>{iq.remove}</button></div>
          </article>)}
          <p className="exchange-note">{iq.exchange} · {currency}</p>
        </div>

        <form className="contact-form" onSubmit={submitInquiry}>
          <label className="field full"><span>{iq.destination}</span><select name="destination" defaultValue={destinationOptions[0]}>{destinationOptions.map((city) => <option key={city}>{city}</option>)}</select></label>
          <label className="field full"><span>{iq.phone} *</span><div className="phone-field"><select name="phoneCountryCode" key={market} defaultValue={market === "kg" ? "+996" : "+998"}><option>+996</option><option>+998</option><option>+7</option><option>+86</option></select><input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="000 000 000"/></div></label>
          <label className="check-field full"><input type="checkbox" checked={sameWhatsapp} onChange={(event) => setSameWhatsapp(event.target.checked)}/><span>{iq.sameWhatsapp}</span></label>
          {!sameWhatsapp && <label className="field full"><span>{iq.whatsapp}</span><div className="phone-field"><select name="whatsappCountryCode" defaultValue={market === "kg" ? "+996" : "+998"}><option>+996</option><option>+998</option><option>+7</option><option>+86</option></select><input name="whatsapp" type="tel" inputMode="tel" placeholder="000 000 000"/></div></label>}
          <label className="field full"><span>{iq.email}</span><input name="email" type="email" autoComplete="email" placeholder="name@company.com"/><small>{iq.emailHint}</small></label>
          <fieldset className="contact-preference full"><legend>{iq.preferred}</legend><div>
            {(["phone", "whatsapp", "email"] as const).map((method) => <button type="button" key={method} className={preferredContact === method ? "active" : ""} onClick={() => setPreferredContact(method)}>{method === "phone" ? iq.phoneFirst : method === "whatsapp" ? iq.whatsappFirst : iq.emailFirst}</button>)}
          </div><input type="hidden" name="preferredContact" value={preferredContact}/></fieldset>
          <label className="field full"><span>{iq.note}</span><textarea name="note" rows={3} placeholder={iq.notePlaceholder}/></label>
          <button className="submit-inquiry full" type="submit">{iq.submit}<Icon name="arrow"/></button>
          <p className="response-note full">{iq.response}<span>{iq.free}</span></p>
          {submitted && <div className="inquiry-success full" role="status">✓ {iq.success}</div>}
        </form>
      </>}
    </aside>

    <footer><Logo variant={logoVariant} lang={lang}/><p>{s.footerTagline}</p><span>{s.copyright}</span></footer>
  </main>;
}
