'use client';

import { useMemo, useState } from 'react';

const products = [
  { name: '电热水壶 2L', price: '¥23.80', moq: '24件起订', tone: 'copper', icon: '♨', orders: '836笔订单' },
  { name: '折叠收纳箱', price: '¥11.60', moq: '20件起订', tone: 'jade', icon: '▣', orders: '1,294笔订单' },
  { name: '锂电手电钻', price: '¥68.00', moq: '10件起订', tone: 'ink', icon: '⚙', orders: '462笔订单' },
  { name: '冬季保暖外套', price: '¥72.50', moq: '30件起订', tone: 'sand', icon: '◇', orders: '708笔订单' },
];

const categories = ['家居百货', '服装鞋履', '五金工具', '数码电器', '汽车用品', '美容个护'];

const suppliers = [
  { code: 'YH', city: '浙江 · 义乌', name: '益恒日用百货', category: '家居收纳 / 厨房用品', years: '11 年', rate: '98.6%' },
  { code: 'GD', city: '广东 · 佛山', name: '广达智能制造', category: '小家电 / 电动工具', years: '8 年', rate: '97.9%' },
  { code: 'HS', city: '河北 · 保定', name: '华盛保暖服饰', category: '冬装 / 户外服饰', years: '15 年', rate: '99.1%' },
];

export default function Home() {
  const [market, setMarket] = useState<'kg' | 'uz'>('kg');
  const [query, setQuery] = useState('');
  const [quoteCount, setQuoteCount] = useState(3);
  const [quoteOpen, setQuoteOpen] = useState(false);

  const destination = market === 'kg' ? '比什凯克' : '塔什干';
  const routeDays = market === 'kg' ? '12–15 天' : '15–18 天';
  const routeLabel = useMemo(() => `义乌集采 → 乌鲁木齐 → ${destination}`, [destination]);

  return (
    <main>
      <div className="trust-strip">
        <div className="shell trust-strip__inner">
          <span>义乌集采中心</span><i />
          <span>中吉乌铁路专线</span><i />
          <span>官方验厂</span>
          <div className="route-mini" aria-label="中国至中亚运输路线">
            <b>中国</b><em>—</em><b>乌鲁木齐</b><em>—</em><b>{destination}</b>
          </div>
        </div>
      </div>

      <header className="site-header">
        <div className="shell nav-row">
          <a className="brand" href="#top" aria-label="中亚商机网首页">
            <span className="brand-seal">中</span>
            <span><strong>中亚商机网</strong><small>CENTRAL ASIA TRADE</small></span>
          </a>
          <nav aria-label="主导航">
            <a href="#products">热门商品</a>
            <a href="#assurance">采购保障</a>
            <a href="#logistics">铁路物流</a>
            <a href="#suppliers">源头工厂</a>
          </nav>
          <div className="nav-actions">
            <button className="language" type="button">RU <span>⌄</span></button>
            <button className="quote-button" onClick={() => setQuoteOpen(true)} type="button">询价单 <b>{quoteCount}</b></button>
          </div>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="shell hero-grid">
          <aside className="category-card" aria-label="商品分类">
            <div className="category-title"><span>☰</span><strong>全部商品分类</strong></div>
            {categories.map((category, index) => (
              <a href="#products" key={category}><span className="category-number">0{index + 1}</span>{category}<b>›</b></a>
            ))}
            <div className="verified-note"><span>✓</span><div><strong>供应商已核验</strong><small>企业资质与生产能力双重审核</small></div></div>
          </aside>

          <div className="hero-copy">
            <div className="eyebrow"><span /> 中国源头直采 · 中亚专线送达</div>
            <h1>采购更省，<br /><em>生意更稳。</em></h1>
            <p>连接中国优质工厂与中亚批发商。从找货、验厂、支付到铁路运输，一站式完成跨境采购。</p>
            <form className="hero-search" onSubmit={(event) => event.preventDefault()}>
              <span>⌕</span>
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索商品、工厂或品类" aria-label="搜索商品、工厂或品类" />
              <button type="submit">搜索货源</button>
            </form>
            <div className="hero-meta"><span><b>2,800+</b>认证工厂</span><span><b>18,000+</b>在售商品</span><span><b>96.8%</b>准时交付</span></div>
          </div>

          <div className="route-card">
            <div className="route-card__top"><span>铁路运输实况</span><strong>班列每周 4 班</strong></div>
            <div className="route-map" aria-hidden="true">
              <span className="map-grid" /><span className="route-line" />
              <span className="city city--cn"><i>义乌</i><b>CN</b></span>
              <span className="city city--xj"><i>乌鲁木齐</i><b>URC</b></span>
              <span className="city city--ca"><i>{destination}</i><b>{market.toUpperCase()}</b></span>
              <span className="train">▰</span>
            </div>
            <div className="route-summary">
              <div><small>预计时效</small><strong>{routeDays}</strong></div>
              <div><small>当前线路</small><strong>{routeLabel}</strong></div>
            </div>
            <div className="market-toggle" aria-label="选择目标市场">
              <button className={market === 'kg' ? 'active' : ''} onClick={() => setMarket('kg')} type="button">🇰🇬 吉尔吉斯斯坦</button>
              <button className={market === 'uz' ? 'active' : ''} onClick={() => setMarket('uz')} type="button">🇺🇿 乌兹别克斯坦</button>
            </div>
          </div>
        </div>
      </section>

      <section className="products-section" id="products">
        <div className="shell">
          <div className="section-heading">
            <div><span className="kicker">2026 · 市场趋势</span><h2>中亚市场热销好货</h2><p>源头工厂价格，小批量也能直接采购。</p></div>
            <a href="#products">查看全部商品 <span>→</span></a>
          </div>
          <div className="product-grid">
            {products.map((product) => (
              <article className="product-card" key={product.name}>
                <div className={`product-visual product-visual--${product.tone}`}>
                  <span className="product-badge">{market === 'kg' ? 'KG' : 'UZ'} 热销</span>
                  <button className="heart" type="button" aria-label={`收藏${product.name}`}>♡</button>
                  <b aria-hidden="true">{product.icon}</b><i>源头工厂直供</i>
                </div>
                <div className="product-info">
                  <h3>{product.name}</h3>
                  <div className="price-row"><strong>{product.price}</strong><small>/ 件</small></div>
                  <p><span>{product.moq}</span><span>{product.orders}</span></p>
                  <div className="delivery"><span>铁路 → {destination}</span><button onClick={() => setQuoteCount((count) => count + 1)} type="button" aria-label={`将${product.name}加入询价单`}>＋</button></div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="assurance-section" id="assurance">
        <div className="shell assurance-grid">
          <div className="assurance-intro">
            <span className="kicker">TRUST · 采购保障</span>
            <h2>每一笔跨境生意，<br />都有清楚的保障。</h2>
            <p>平台从工厂资质、货物质量到交易资金建立三重保障，让第一次从中国采购也能有据可查、有责可追。</p>
            <div className="assurance-index"><strong>03</strong><span>道采购防线<br /><small>覆盖交易全流程</small></span></div>
          </div>
          <div className="assurance-steps">
            <article><span>01</span><div><h3>实地验厂</h3><p>核验营业资质、生产线与履约能力，验厂报告可随时查看。</p><small>FACTORY AUDIT</small></div><b>✓</b></article>
            <article><span>02</span><div><h3>资金托管</h3><p>确认订单后资金由平台托管，验货完成再向供应商放款。</p><small>SECURE PAYMENT</small></div><b>✓</b></article>
            <article><span>03</span><div><h3>到货保障</h3><p>异常货损、数量短缺或货不对版，由中俄双语团队协助处理。</p><small>DELIVERY PROTECTION</small></div><b>✓</b></article>
          </div>
          <aside className="protection-card">
            <div className="protection-card__head"><span>采购保障单</span><small>NO. 2026-0824</small></div>
            <div className="shield-mark">盾<small>BUYER PROTECTION</small></div>
            <dl><div><dt>保障额度</dt><dd>¥ 500,000</dd></div><div><dt>响应时间</dt><dd>24 小时内</dd></div><div><dt>服务语言</dt><dd>中文 · Русский</dd></div></dl>
            <button onClick={() => setQuoteOpen(true)} type="button">了解采购保障 <span>→</span></button>
          </aside>
        </div>
      </section>

      <section className="logistics-section" id="logistics">
        <div className="shell">
          <div className="logistics-heading">
            <div><span className="kicker kicker--gold">RAILWAY · 中亚专线</span><h2>从中国工厂，到你的仓库。</h2></div>
            <p>集货、报关、铁路运输、清关与末端派送一体化。每个运输节点在线可查。</p>
          </div>
          <div className="rail-board">
            <div className="rail-route">
              <div className="route-track" />
              <div className="route-stop active"><i>01</i><b>义乌集货仓</b><small>验货 · 打包 · 装箱</small></div>
              <div className="route-stop"><i>02</i><b>乌鲁木齐</b><small>铁路编组 · 报关</small></div>
              <div className="route-stop"><i>03</i><b>中亚口岸</b><small>换装 · 清关</small></div>
              <div className="route-stop active"><i>04</i><b>{destination}</b><small>仓库签收 · 城市配送</small></div>
            </div>
            <div className="rail-stats">
              <div><small>铁路运输时效</small><strong>{routeDays}</strong><span>比海运平均快 18 天</span></div>
              <div><small>每周固定班列</small><strong>4 班</strong><span>旺季舱位提前锁定</span></div>
              <div><small>全程节点追踪</small><strong>7×24</strong><span>中俄双语状态通知</span></div>
            </div>
          </div>
          <div className="freight-calculator">
            <div><span>运费试算</span><h3>你的货物要运到哪里？</h3></div>
            <label>目的地<select value={market} onChange={(event) => setMarket(event.target.value as 'kg' | 'uz')}><option value="kg">比什凯克 · KG</option><option value="uz">塔什干 · UZ</option></select></label>
            <label>货物类型<select defaultValue="general"><option value="general">普通货物</option><option value="electric">带电产品</option><option value="textile">纺织服装</option></select></label>
            <label>预计重量<div className="input-suffix"><input defaultValue="500" aria-label="预计重量" /><span>KG</span></div></label>
            <button onClick={() => setQuoteOpen(true)} type="button">获取准确报价</button>
          </div>
        </div>
      </section>

      <section className="suppliers-section" id="suppliers">
        <div className="shell">
          <div className="section-heading suppliers-heading">
            <div><span className="kicker">SOURCE · 源头供货</span><h2>正在被中亚买家选择的工厂</h2><p>只展示完成企业认证与生产能力核验的供应商。</p></div>
            <a href="#suppliers">申请找厂服务 <span>→</span></a>
          </div>
          <div className="supplier-list">
            {suppliers.map((supplier, index) => (
              <article className="supplier-row" key={supplier.name}>
                <div className={`supplier-avatar supplier-avatar--${index + 1}`}><span>{supplier.code}</span><i>VERIFIED</i></div>
                <div className="supplier-name"><small>{supplier.city}</small><h3>{supplier.name}</h3><p>{supplier.category}</p></div>
                <div className="supplier-data"><span><small>合作年限</small><b>{supplier.years}</b></span><span><small>准时交付</small><b>{supplier.rate}</b></span></div>
                <div className="supplier-tags"><span>✓ 企业认证</span><span>✓ 实地验厂</span></div>
                <button onClick={() => setQuoteOpen(true)} type="button">联系工厂 <span>↗</span></button>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="process-section">
        <div className="shell process-grid">
          <div className="process-title"><span className="kicker">HOW IT WORKS</span><h2>四步完成<br />中国采购</h2><p>专属采购顾问全程跟进，语言、支付和物流不再成为障碍。</p></div>
          <ol>
            <li><span>01</span><div><h3>提交采购需求</h3><p>告诉我们商品、数量与目的地。</p></div></li>
            <li><span>02</span><div><h3>匹配工厂报价</h3><p>24 小时内获得 3–5 家工厂方案。</p></div></li>
            <li><span>03</span><div><h3>确认样品下单</h3><p>平台托管货款，验货后放款。</p></div></li>
            <li><span>04</span><div><h3>铁路运输交付</h3><p>全程追踪，直达中亚目的仓。</p></div></li>
          </ol>
        </div>
      </section>

      <section className="final-cta">
        <div className="shell final-cta__inner">
          <div><span>下一批好货，从中国出发</span><h2>把你的采购清单交给我们。</h2><p>今天提交需求，最快 24 小时获得工厂报价。</p></div>
          <button onClick={() => setQuoteOpen(true)} type="button">免费提交采购需求 <span>→</span></button>
          <div className="cta-seal"><strong>中</strong><small>诚信通商</small></div>
        </div>
      </section>

      <footer>
        <div className="shell footer-grid">
          <div className="footer-brand"><a className="brand" href="#top"><span className="brand-seal">中</span><span><strong>中亚商机网</strong><small>CENTRAL ASIA TRADE</small></span></a><p>中国源头好货，通向中亚生意。</p></div>
          <div><strong>采购服务</strong><a href="#products">热销商品</a><a href="#suppliers">工厂直采</a><a href="#assurance">买家保障</a></div>
          <div><strong>物流服务</strong><a href="#logistics">铁路专线</a><a href="#logistics">运费试算</a><a href="#logistics">物流追踪</a></div>
          <div><strong>联系我们</strong><span>中国 · 义乌</span><span>吉尔吉斯斯坦 · 比什凯克</span><span>乌兹别克斯坦 · 塔什干</span></div>
        </div>
        <div className="shell footer-bottom"><span>© 2026 中亚商机网</span><span>服务市场：Кыргызстан · O‘zbekiston · Қазақстан</span></div>
      </footer>

      {quoteOpen && (
        <div className="drawer-backdrop" role="presentation" onClick={() => setQuoteOpen(false)}>
          <aside className="quote-drawer" role="dialog" aria-modal="true" aria-label="采购询价" onClick={(event) => event.stopPropagation()}>
            <button className="drawer-close" onClick={() => setQuoteOpen(false)} aria-label="关闭询价窗口" type="button">×</button>
            <span className="kicker">QUICK REQUEST</span><h2>提交采购需求</h2><p>留下基础信息，采购顾问将在 24 小时内联系你。</p>
            <label>采购商品<input placeholder="例如：电热水壶 500 件" /></label>
            <label>送达城市<select value={market} onChange={(event) => setMarket(event.target.value as 'kg' | 'uz')}><option value="kg">比什凯克</option><option value="uz">塔什干</option></select></label>
            <label>联系方式<input placeholder="WhatsApp / Telegram / 电话" /></label>
            <button className="drawer-submit" onClick={() => setQuoteOpen(false)} type="button">获取工厂报价 <span>→</span></button>
            <small>提交即表示同意由平台采购顾问联系。此为设计演示，不会发送数据。</small>
          </aside>
        </div>
      )}
    </main>
  );
}
