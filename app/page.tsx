"use client";

import { useMemo, useState } from "react";
import { BASE_PATH } from "./base-path";

type Lang = "ru" | "ky" | "uz" | "zh";
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
    unit: "за шт.", moq: "Мин. заказ", pieces: "шт.", orders: "заказов", categories: "Категории", country: "Рынок", rail: "По ж/д",
  },
  ky: {
    label: "Кыргызча",
    nav: ["Категориялар", "Жаңы товарлар", "Логистика", "Сатып алуучуну коргоо"],
    search: "Товарларды, фабрикаларды жана категорияларды издөө",
    quote: "Сурамдар", eyebrow: "Кытайдан түз жеткирүү", title: "Арзан сатып алыңыз.\nКөбүрөөк пайда табыңыз.",
    subtitle: "Кытай фабрикаларынын дүң баалары, текшерилген жеткирүүчүлөр жана Кыргызстан менен Өзбекстанга темир жол аркылуу жеткирүү.",
    cta: "Товар табуу", logistics: "Жеткирүүнү эсептөө", verified: "Жеткирүүчүлөр текшерилген",
    route: "Темир жол багыты", days: "12–18 күн", arrival: "Бишкекке / Ташкентке чейин",
    market: "Сиздин рынокто популярдуу", marketSub: "Фабрика баасы · 10 даанадан баштап", all: "Баарын көрүү",
    unit: "даана", moq: "Мин. заказ", pieces: "даана", orders: "заказ", categories: "Категориялар", country: "Рынок", rail: "Темир жол",
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
    unit: "dona", moq: "Min. buyurtma", pieces: "dona", orders: "buyurtma", categories: "Kategoriyalar", country: "Bozor", rail: "Temir yo‘l",
  },
  zh: {
    label: "中文",
    nav: ["商品分类", "新品货源", "跨境物流", "采购保障"], search: "搜索商品、工厂或品类", quote: "询价单", eyebrow: "中国源头直供",
    title: "更低成本进货。\n让每一单更赚钱。",
    subtitle: "连接中国源头工厂、可信供应商与中吉乌铁路运输，为吉尔吉斯斯坦和乌兹别克斯坦商贩提供更高效的采购渠道。",
    cta: "开始找货", logistics: "测算物流", verified: "供应商实地核验", route: "中吉乌铁路专线", days: "12–18 天", arrival: "抵达比什凯克 / 塔什干",
    market: "当地市场热销", marketSub: "源头工厂价 · 最低 10 件起批", all: "查看全部", unit: "每件", moq: "起订量", pieces: "件", orders: "笔订单", categories: "商品分类", country: "目标市场", rail: "铁路运输",
  },
} as const;

const products = [
  { name: { ru: "Электрочайник 2 л", ky: "Электр чайнек 2 л", uz: "Elektr choynak 2 l", zh: "2L 家用电热水壶" }, price: "¥ 23.80", moq: 24, orders: 836, kind: "kettle", color: "clay" },
  { name: { ru: "Складной органайзер", ky: "Бүктөлүүчү органайзер", uz: "Buklanadigan organayzer", zh: "折叠衣物收纳箱" }, price: "¥ 11.60", moq: 20, orders: 1294, kind: "box", color: "sage" },
  { name: { ru: "Аккумуляторная дрель", ky: "Аккумулятордук дрель", uz: "Akkumulyatorli drel", zh: "充电式家用电钻" }, price: "¥ 68.00", moq: 10, orders: 462, kind: "drill", color: "gold" },
  { name: { ru: "Зимняя куртка унисекс", ky: "Кышкы унисекс куртка", uz: "Uniseks qishki kurtka", zh: "基础款加厚长棉服" }, price: "¥ 72.50", moq: 30, orders: 708, kind: "coat", color: "blue" },
];

const categories = [
  ["home", { ru: "Товары для дома", ky: "Үй товарлары", uz: "Uy-ro‘zg‘or", zh: "家居日用" }],
  ["fashion", { ru: "Одежда и обувь", ky: "Кийим жана бут кийим", uz: "Kiyim va poyabzal", zh: "服装鞋靴" }],
  ["tools", { ru: "Инструменты", ky: "Куралдар", uz: "Asbob-uskunalar", zh: "五金工具" }],
  ["digital", { ru: "Электроника", ky: "Электроника", uz: "Elektronika", zh: "数码电器" }],
  ["auto", { ru: "Автотовары", ky: "Авто товарлар", uz: "Avto tovarlar", zh: "汽车用品" }],
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

function Logo({ compact = false, variant = 1 }: { compact?: boolean; variant?: LogoVariant }) {
  return <div className={`brand-lockup ${compact ? "compact" : ""}`} aria-label="中亚商机网">
    <LogoMark variant={variant}/>
    {!compact && <span className="brand-words"><strong>中亚商机网</strong><small>CENTRAL ASIA TRADE</small></span>}
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
  const [market, setMarket] = useState<"kg" | "uz">("kg");
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState("");
  const [showBrand, setShowBrand] = useState(false);
  const [logoVariant, setLogoVariant] = useState<LogoVariant>(1);
  const t = copy[lang];
  const shownProducts = useMemo(() => products.filter((p) => !query || p.name[lang].toLowerCase().includes(query.toLowerCase())), [query, lang]);

  return <main className="market-shell">
    <div className="top-strip"><span>义乌集采中心</span><i/><span>中吉乌铁路专线</span><i/><span>官方验厂</span><div className="strip-route"><b>中国</b><span>乌鲁木齐</span><span>比什凯克</span><span>塔什干</span></div></div>
    <header className="site-header">
      <Logo variant={logoVariant}/>
      <nav aria-label="Primary navigation">{t.nav.map((item, i) => <a href={i === 0 ? "#categories" : i === 2 ? "#route" : "#products"} key={item}>{item}</a>)}</nav>
      <div className="header-actions">
        <label className="language-select"><span className="sr-only">Language</span><select value={lang} onChange={(e) => setLang(e.target.value as Lang)}>{(Object.keys(copy) as Lang[]).map((key) => <option key={key} value={key}>{copy[key].label}</option>)}</select></label>
        <button className="quote-button" onClick={() => setNotice(lang === "zh" ? "询价单功能将在采购流程中启用" : "Раздел запросов откроется в процессе закупки")}><Icon name="cart"/>{t.quote}<span>3</span></button>
      </div>
    </header>
    {notice && <button className="toast" onClick={() => setNotice("")}>{notice}<b>×</b></button>}
    {showBrand ? <BrandGuide onClose={() => setShowBrand(false)} selected={logoVariant} onSelect={setLogoVariant}/> : <>
    <section className="workspace">
      <aside className="category-panel" id="categories">
        <div className="panel-heading"><strong>{t.categories}</strong><span>☰</span></div>
        <div className="category-list">{categories.map(([icon, names]) => <button key={icon}><span className="category-icon"><Icon name={icon}/></span><span>{names[lang]}</span><b>›</b></button>)}</div>
        <div className="buyer-note"><Icon name="shield"/><div><strong>{t.verified}</strong><span>100% документально</span></div></div>
      </aside>

      <div className="hero" id="route">
        <div className="hero-copy"><span className="eyebrow"><i/>{t.eyebrow}</span><h1>{t.title.split("\n").map((line) => <span key={line}>{line}</span>)}</h1><p>{t.subtitle}</p>
          <div className="hero-actions"><a className="primary-cta" href="#products">{t.cta}<Icon name="arrow"/></a><button className="secondary-cta" onClick={() => setNotice(lang === "zh" ? "物流测算器已加入下一步产品流程" : "Калькулятор добавлен в следующий этап продукта")}>{t.logistics}</button></div>
        </div>
        <div className="route-visual" aria-label={t.route}><div className="sun-disc"/><div className="route-card"><span>{t.route}</span><strong>{t.days}</strong><small>{t.arrival}</small></div>
          <svg viewBox="0 0 430 260" aria-hidden="true"><path className="land" d="M28 197c48-62 92-67 139-30 45-75 101-91 159-35 24-22 51-23 77-4v97H28Z"/><path className="rail" d="M32 214C139 189 237 189 405 151"/><path className="rail rail-two" d="M34 225c111-25 212-26 373-62"/><path className="track" d="m74 205 7 11m44-23 7 11m48-22 7 11m49-21 7 11m49-24 7 11m48-23 7 11"/><g className="train"><path d="M265 129h69l18 20-5 20-77 16-13-16Z"/><path d="M277 139h18v13h-22M302 139h23l11 13h-34Z"/><circle cx="280" cy="176" r="7"/><circle cx="330" cy="166" r="7"/></g></svg>
          <div className="route-cities"><span className="china">中国</span><span className="kg">KG</span><span className="uz">UZ</span></div>
        </div>
      </div>
    </section>

    <section className="search-band"><div className="search-box"><Icon name="search"/><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t.search}/><button onClick={() => document.querySelector("#products")?.scrollIntoView({behavior:"smooth"})}>{t.cta}</button></div><div className="market-toggle"><span>{t.country}</span><button className={market === "kg" ? "active" : ""} onClick={() => setMarket("kg")}>🇰🇬 Кыргызстан</button><button className={market === "uz" ? "active" : ""} onClick={() => setMarket("uz")}>🇺🇿 O‘zbekiston</button></div></section>

    <section className="products-section" id="products">
      <div className="section-title"><div><span>2026 · TREND</span><h2>{t.market}</h2><p>{t.marketSub}</p></div><a href="#products">{t.all}<Icon name="arrow"/></a></div>
      <div className="product-grid">{shownProducts.map((product) => <article className="product-card" key={product.kind}><div className={`product-image ${product.color}`}><span className="product-badge">{market === "kg" ? "KG TOP" : "UZ TOP"}</span><ProductVisual kind={product.kind}/><button aria-label="Save product">♡</button></div><div className="product-info"><h3>{product.name[lang]}</h3><div className="product-price"><strong>{product.price}</strong><span>{t.unit}</span></div><div className="product-meta"><span>{t.moq} {product.moq} {t.pieces}</span><span>{product.orders} {t.orders}</span></div><div className="product-footer"><span><i/>{t.rail} {market === "kg" ? "→ Бишкек" : "→ Ташкент"}</span><button aria-label="Add to quote">+</button></div></div></article>)}
        {shownProducts.length === 0 && <div className="empty-state">Ничего не найдено / 暂无匹配商品</div>}</div>
    </section>
    </>}
    <footer><Logo variant={logoVariant}/><p>中国源头好货，通向中亚生意。</p><span>© 2026 中亚商机网</span></footer>
  </main>;
}
