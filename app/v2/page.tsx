"use client";

import { useMemo, useState } from "react";
import VersionDock from "../version-dock";
import { BASE_PATH } from "../base-path";

type Lang = "ru" | "ky" | "uz" | "zh";

const words = {
  ru:{label:"Русский",nav:["Каталог","Поставщики","Доставка","Гарантии"],eyebrow:"Закупки напрямую из Китая",title:"Хороший товар начинается с хорошей закупки.",lead:"Фабричные цены, понятная минимальная партия и доставка по железной дороге — в одном месте для продавцов Центральной Азии.",find:"Найти товар",quote:"Получить цену",search:"Что вы хотите закупить?",popular:"Выбирают продавцы рядом с вами",popularSub:"Проверенные товары с понятной экономикой",all:"Весь каталог",route:"Рассчитать доставку",trust:"Проверено платформой",moq:"от",days:"дней"},
  ky:{label:"Кыргызча",nav:["Каталог","Жеткирүүчүлөр","Жеткирүү","Кепилдик"],eyebrow:"Кытайдан түз сатып алуу",title:"Жакшы товар жакшы сатып алуудан башталат.",lead:"Фабрика баасы, түшүнүктүү минималдуу партия жана темир жол жеткирүүсү — Борбор Азиядагы сатуучулар үчүн бир жерде.",find:"Товар табуу",quote:"Баасын алуу",search:"Эмне сатып алгыңыз келет?",popular:"Жаныңыздагы сатуучулар тандашат",popularSub:"Экономикасы түшүнүктүү текшерилген товарлар",all:"Толук каталог",route:"Жеткирүүнү эсептөө",trust:"Платформа текшерген",moq:"баштап",days:"күн"},
  uz:{label:"O‘zbekcha",nav:["Katalog","Yetkazuvchilar","Yetkazish","Kafolatlar"],eyebrow:"Xitoydan to‘g‘ridan-to‘g‘ri xarid",title:"Yaxshi mahsulot yaxshi xariddan boshlanadi.",lead:"Fabrika narxi, aniq minimal partiya va temir yo‘l yetkazib berish — Markaziy Osiyo sotuvchilari uchun bir joyda.",find:"Mahsulot topish",quote:"Narx olish",search:"Nima xarid qilmoqchisiz?",popular:"Yaqiningizdagi sotuvchilar tanlaydi",popularSub:"Iqtisodi aniq tekshirilgan mahsulotlar",all:"To‘liq katalog",route:"Yetkazishni hisoblash",trust:"Platforma tekshirgan",moq:"dan",days:"kun"},
  zh:{label:"中文",nav:["商品货源","认证供应商","跨境物流","采购保障"],eyebrow:"中国源头直接采购",title:"好生意，从一次更好的进货开始。",lead:"源头工厂价、清楚的起订量和铁路运输，为吉尔吉斯斯坦与乌兹别克斯坦商贩集中到一个平台。",find:"开始找货",quote:"获取报价",search:"你想采购什么商品？",popular:"当地商贩正在采购",popularSub:"真实货品、透明成本、可信供应商",all:"查看完整目录",route:"测算运输成本",trust:"平台实地核验",moq:"起订",days:"天"}
} as const;

const goods = [
  {names:{ru:"Электрочайник из нержавеющей стали",ky:"Дат баспас болот чайнек",uz:"Zanglamaydigan elektr choynak",zh:"不锈钢电热水壶"},price:"¥23.80",moq:"24",orders:"836",pos:"p1",image:`${BASE_PATH}/product-kettle.webp`},
  {names:{ru:"Удлинённая зимняя куртка",ky:"Узун кышкы күрмө",uz:"Uzun qishki kurtka",zh:"基础加厚长棉服"},price:"¥72.50",moq:"30",orders:"708",pos:"p2",image:`${BASE_PATH}/product-coat.webp`},
  {names:{ru:"Аккумуляторная дрель 21 В",ky:"21V аккумулятордук дрель",uz:"21V akkumulyatorli drel",zh:"21V 充电式电钻"},price:"¥68.00",moq:"10",orders:"462",pos:"p3",image:`${BASE_PATH}/product-drill.webp`},
  {names:{ru:"Прозрачный набор органайзеров",ky:"Тунук сактоо кутулары",uz:"Shaffof saqlash qutilari",zh:"透明家居收纳套装"},price:"¥11.60",moq:"20",orders:"1294",pos:"p4",image:`${BASE_PATH}/product-storage.webp`},
];

function TradeRibbon({inverse=false}:{inverse?:boolean}){
  return <div className={`v2r-logo ${inverse?"inverse":""}`}><svg viewBox="0 0 56 48" aria-hidden="true"><path className="r1" d="M4 10h29V4l19 14-19 14v-7H19L4 10Z"/><path className="r2" d="M52 38H23v6L4 30l19-14v7h14l15 15Z"/><circle cx="28" cy="24" r="4"/></svg><span><b>中亚商机网</b><small>MARKAZIY OSIYO SAVDO · ЦЕНТРАЛЬНАЯ АЗИЯ</small></span></div>;
}

function V2Brand({close}:{close:()=>void}){
  const colors=[["商贸蓝","#173B57","稳定与信任"],["石榴红","#C95F3D","商机与行动"],["青瓷绿","#2D7B70","连接与服务"],["藏红花金","#E2AE50","利润与重点"],["生丝白","#F7F2E9","开放与亲和"]];
  return <div className="v2r-brand">
    <section className="v2r-brand-hero"><button onClick={close}>← 返回采购首页</button><span>CONCEPT 02 · CONTEMPORARY TRADE</span><h1>把“做生意的亲近感”，<br/>变成现代品牌。</h1><p>这套方向不强调宏大的铁路工程，而是站在当地商贩身边：好货看得见、价格说得清、沟通有人管。</p><b>VI / 02</b></section>
    <section className="v2r-brand-logo"><header><span>01</span><div><h2>双向商路标</h2><p>两条互相穿行的彩带，分别代表中国货源与中亚市场；中央交汇点代表平台完成撮合。</p></div></header><div className="v2r-logo-board light"><TradeRibbon/><i>安全区 = 图形中心圆直径 × 2</i></div><div className="v2r-logo-board dark"><TradeRibbon inverse/><i>深色背景反白组合</i></div><div className="v2r-logo-notes"><b>双向</b><span>不是单向出口，而是持续理解市场需求</span><b>交汇</b><span>工厂、商贩、物流在平台形成一条完整链路</span><b>彩带</b><span>来自中亚织物的色彩记忆，但保持现代克制</span></div><a href={`${BASE_PATH}/logo-v2r.svg`} download>下载方案二 Logo SVG ↓</a></section>
    <section className="v2r-brand-colors"><header><span>02</span><div><h2>色彩系统</h2><p>文化感来自材质与比例，不依赖花纹堆叠。</p></div></header><div>{colors.map(([n,c,u])=><article key={c} style={{background:c,color:c==="#F7F2E9"?"#173B57":"white"}}><b>{n}</b><code>{c}</code><small>{u}</small></article>)}</div><p>建议比例：生丝白 55% · 商贸蓝 25% · 青瓷绿 10% · 石榴红 7% · 藏红花金 3%</p></section>
    <section className="v2r-brand-type"><header><span>03</span><div><h2>字体与影像</h2><p>标题有人情味，正文保持跨语言清晰度。</p></div></header><div className="v2r-type-display"><small>DISPLAY / Noto Serif</small><b>每一件好货，<br/>都应该算得清利润。</b><em>Хороший товар. Честная цена.</em></div><div className="v2r-photo-rule"><img src={`${BASE_PATH}/v2-merchant-hero.webp`} alt="中亚采购商与中国供应商选品" width="1280" height="853" loading="lazy" decoding="async"/><p><b>影像原则</b>真实选品、看货、验货与装箱；人物处于工作状态。避免握手摆拍、民族服饰符号化和虚假的大型工厂场景。</p></div></section>
    <section className="v2r-brand-ui"><header><span>04</span><div><h2>UI 与品牌语言</h2><p>界面先回答商贩最关心的四件事：什么货、多少钱、多少件起订、多久到。</p></div></header><div><button>Получить цену</button><span>✓ Поставщик проверен</span><b>¥23.80</b><i>12–18 дней</i></div><blockquote>少说：“赋能全球贸易生态。”<br/>多说：“24 件起订，14 天到比什凯克，费用明细可查。”</blockquote></section>
  </div>;
}

export default function ConceptTwo(){
  const [lang,setLang]=useState<Lang>("ru");
  const [market,setMarket]=useState<"kg"|"uz">("kg");
  const [guide,setGuide]=useState(false);
  const [rfq,setRfq]=useState(2);
  const [notice,setNotice]=useState("");
  const [query,setQuery]=useState("");
  const t=words[lang];
  const visible=useMemo(()=>goods.filter(g=>!query||g.names[lang].toLowerCase().includes(query.toLowerCase())),[query,lang]);
  const add=(name:string)=>{setRfq(v=>v+1);setNotice(`${name} · ${lang==="zh"?"已加入询价单":"добавлено в запрос"}`)};
  if(guide)return <main className="v2r-shell"><V2Brand close={()=>setGuide(false)}/><VersionDock active={2}/></main>;
  return <main className="v2r-shell">
    <div className="v2r-top"><span>中国源头工厂直采</span><span>12–18 天铁路运输</span><span>俄语 · 吉尔吉斯语 · 乌兹别克语 · 中文服务</span><b>采购热线 / +86 400 880 2608</b></div>
    <header className="v2r-header"><TradeRibbon/><nav>{t.nav.map((x,i)=><a href={i===0?"#v2r-goods":i===2?"#v2r-logistics":"#v2r-trust"} key={x}>{x}</a>)}</nav><div><button className="v2r-vi" onClick={()=>setGuide(true)}>查看 VI · 02</button><select value={lang} onChange={e=>setLang(e.target.value as Lang)} aria-label="Language">{(Object.keys(words) as Lang[]).map(k=><option value={k} key={k}>{words[k].label}</option>)}</select><button className="v2r-rfq" onClick={()=>setNotice(lang==="zh"?"询价单将在下一步进入供应商比价":"Запросы готовы к сравнению")}>{t.quote}<b>{rfq}</b></button></div></header>
    {notice&&<button className="v2r-toast" onClick={()=>setNotice("")}>{notice}<b>×</b></button>}
    <section className="v2r-hero"><div className="v2r-hero-copy"><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.lead}</p><div><a href="#v2r-goods">{t.find} →</a><button onClick={()=>document.querySelector("#v2r-logistics")?.scrollIntoView({behavior:"smooth"})}>{t.route}</button></div><aside><b>2,408</b><span>{t.trust}</span><b>¥1.84/kg</b><span>{market==="kg"?"до Бишкека":"до Ташкента"}</span></aside></div><div className="v2r-hero-photo"><img src={`${BASE_PATH}/v2-merchant-hero.webp`} alt="中亚采购商与中国供应商在义乌选品" width="1280" height="853" fetchPriority="high" decoding="async"/><span><b>真实选品服务</b><small>义乌 · 广州 · 深圳 · 泉州</small></span></div></section>
    <section className="v2r-search"><div><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder={t.search}/><button>{t.find}</button></div><aside><small>{lang==="zh"?"目标市场":"Рынок доставки"}</small><button className={market==="kg"?"active":""} onClick={()=>setMarket("kg")}>🇰🇬 Бишкек</button><button className={market==="uz"?"active":""} onClick={()=>setMarket("uz")}>🇺🇿 Ташкент</button></aside></section>
    <section className="v2r-cats"><button><b>01</b><span>家居日用<small>Дом и быт</small></span></button><button><b>02</b><span>服装鞋靴<small>Одежда</small></span></button><button><b>03</b><span>五金工具<small>Инструменты</small></span></button><button><b>04</b><span>数码电器<small>Электроника</small></span></button><button><b>05</b><span>汽车用品<small>Автотовары</small></span></button><button><b>06</b><span>餐厨用品<small>Кухня</small></span></button></section>
    <section className="v2r-goods" id="v2r-goods"><header><div><span>CURATED FOR {market.toUpperCase()} MARKET</span><h2>{t.popular}</h2><p>{t.popularSub}</p></div><a href="#v2r-goods">{t.all} →</a></header><div className="v2r-product-grid">{visible.map((g,i)=><article key={g.pos}><div className={`v2r-product-photo ${g.pos}`}><img src={g.image} alt={g.names[lang]} width="720" height="720" loading="lazy" decoding="async"/><span>{market.toUpperCase()} 热销</span><button aria-label="收藏">♡</button></div><div className="v2r-product-info"><small>#{String(i+1).padStart(2,"0")} · {t.trust}</small><h3>{g.names[lang]}</h3><div><b>{g.price}</b><span>{t.moq} {g.moq}</span></div><footer><span>{g.orders} {lang==="zh"?"笔采购":"заказов"}</span><button onClick={()=>add(g.names[lang])}>加入询价 +</button></footer></div></article>)}{visible.length===0&&<p className="v2r-empty">暂无匹配商品 / Ничего не найдено</p>}</div></section>
    <section className="v2r-process"><header><span>HOW IT WORKS</span><h2>从中国工厂，到你的店里。</h2></header><div><article><b>01</b><h3>提交商品</h3><p>发图片、链接或关键词，平台协助匹配源头工厂。</p></article><article><b>02</b><h3>确认样品与报价</h3><p>看到工厂信息、阶梯价、起订量和质检选项。</p></article><article><b>03</b><h3>集货验货</h3><p>多家货源统一送仓，核对数量与包装后合并发运。</p></article><article><b>04</b><h3>铁路抵达</h3><p>节点状态可查，到达比什凯克或塔什干后交付。</p></article></div></section>
    <section className="v2r-logistics" id="v2r-logistics"><div className="v2r-route-card"><span>中吉乌铁路 / CKU RAIL</span><h2>一条更稳定的进货路线。</h2><div className="v2r-route-line"><b>义乌<small>集货 · 2天</small></b><i/><b>乌鲁木齐<small>编组 · 3天</small></b><i/><b>喀什<small>换装 · 2天</small></b><i/><b>{market==="kg"?"比什凯克":"塔什干"}<small>预计 {market==="kg"?"14":"17"} 天</small></b></div><footer><span>铁路运输</span><span>节点追踪</span><span>中俄文单据</span><span>异常协助</span></footer></div><form onSubmit={e=>{e.preventDefault();setNotice(lang==="zh"?"运输成本估算已生成":"Расчёт доставки готов")}}><span>快速估算 / CALCULATOR</span><label>货物重量<input defaultValue="120"/><i>KG</i></label><label>货物体积<input defaultValue="0.86"/><i>M³</i></label><label>目的城市<select value={market} onChange={e=>setMarket(e.target.value as "kg"|"uz")}><option value="kg">Бишкек</option><option value="uz">Ташкент</option></select></label><div><small>参考运输费</small><b>{market==="kg"?"¥ 1,486":"¥ 1,728"}</b><span>约 {market==="kg"?"14":"17"} {t.days}</span></div><button type="submit">获取完整报价 →</button></form></section>
    <section className="v2r-trust" id="v2r-trust"><div><span>PLATFORM PROMISE</span><h2>不是把链接发给你，<br/>而是把进货这件事管到底。</h2></div><article><b>供应商核验</b><p>核对营业资质、生产地址、主营类目与历史履约。</p></article><article><b>价格透明</b><p>商品、质检、仓储和运输费用分开列明。</p></article><article><b>四语服务</b><p>俄语、吉尔吉斯语、乌兹别克语和中文协助沟通。</p></article></section>
    <footer className="v2r-footer"><TradeRibbon inverse/><p>让更好的中国货源，成为中亚商贩更稳定的利润。</p><span>© 2026 中亚商机网</span></footer>
    <VersionDock active={2}/>
  </main>;
}
