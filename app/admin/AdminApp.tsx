"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  inquiryStatuses,
  inquiryStatusLabels,
  type AdminSnapshot,
  type InquiryRecord,
  type InquiryStatus,
  type RankedMetric,
} from "../backend/contracts";

type IconName = "dashboard" | "inquiries" | "refresh" | "search" | "eye" | "users" | "session" | "quote" | "conversion" | "check" | "logout" | "arrow" | "close";

function Icon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    inquiries: <><path d="M4 5h16v12H8l-4 4V5Z"/><path d="M8 9h8M8 13h5"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M18.4 16a8 8 0 1 1 .5-8.5L20 12"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M16 5.5a3 3 0 0 1 0 5.5M17 14c2.5.5 4 2.3 4 5"/></>,
    session: <><path d="M4 5h16v14H4z"/><path d="M4 9h16M8 7h.01M12 7h.01"/></>,
    quote: <><path d="M4 5h16v12H8l-4 4V5Z"/><path d="m8 11 2 2 5-5"/></>,
    conversion: <><path d="M4 19 10 13l4 3 6-9"/><path d="M15 7h5v5"/></>,
    check: <><path d="m4 12 5 5L20 6"/></>,
    logout: <><path d="M10 5H4v14h6M14 8l4 4-4 4M18 12H8"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name]}</svg>;
}

function Brand({ compact = false }: { compact?: boolean }) {
  return <div className={`admin-brand ${compact ? "compact" : ""}`}>
    <svg className="admin-logo" viewBox="0 0 48 48" aria-hidden="true">
      <g className="admin-logo-core"><path d="M7 37V18.5C7 12.7 11.7 8 17.5 8h13C36.3 8 41 12.7 41 18.5V37"/><path d="M15 37V21.5c0-3.6 2.9-6.5 6.5-6.5h5c3.6 0 6.5 2.9 6.5 6.5V37"/></g>
      <g className="admin-logo-accent"><path d="M24 18v19M18 37h12M14 42h20"/></g>
    </svg>
    {!compact && <span><strong>中亚商机网</strong><small>运营管理后台</small></span>}
  </div>;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatDate(value: string, withTime = true) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai", month: "2-digit", day: "2-digit",
    ...(withTime ? { hour: "2-digit", minute: "2-digit", hour12: false } : {}),
  }).format(new Date(value));
}

function shortPath(path: string) {
  if (path === "/") return "网站首页";
  if (path.startsWith("/products/")) return `商品 · ${path.split("/")[2]?.split("?")[0] ?? "详情"}`;
  return path;
}

function Login({ onSuccess }: { onSuccess: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error ?? "无法登录");
      onSuccess();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "无法登录");
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="admin-login-shell">
    <section className="admin-login-story">
      <Brand />
      <div><span>BUSINESS OPERATIONS · 01</span><h1>让每一条询价，<br/>都被及时看见。</h1><p>集中管理客户需求、访问趋势与来源转化，为中亚采购业务提供清晰、可信的数据依据。</p></div>
      <footer><i/><span>中国货源</span><i/><span>中亚市场</span><i/><span>询价转化</span></footer>
    </section>
    <section className="admin-login-panel">
      <form onSubmit={submit}>
        <span className="admin-kicker">ADMIN ACCESS</span>
        <h2>管理员登录</h2>
        <p>使用运营管理员账号进入后台</p>
        <label><span>管理员账号</span><input name="username" autoComplete="username" required placeholder="请输入账号" /></label>
        <label><span>登录密码</span><input name="password" type="password" autoComplete="current-password" required placeholder="请输入密码" /></label>
        {error && <div className="admin-form-error" role="alert">{error}</div>}
        <button type="submit" disabled={submitting}>{submitting ? "正在验证…" : <>安全登录 <Icon name="arrow"/></>}</button>
        <small>后台入口不会展示在公开网站导航中</small>
      </form>
    </section>
  </main>;
}

function MetricCard({ label, value, note, icon, accent }: { label: string; value: string; note: string; icon: IconName; accent?: boolean }) {
  return <article className={`admin-metric ${accent ? "accent" : ""}`}>
    <header><span>{label}</span><i><Icon name={icon}/></i></header>
    <strong>{value}</strong>
    <small>{note}</small>
  </article>;
}

function TrendChart({ snapshot }: { snapshot: AdminSnapshot }) {
  const points = snapshot.trend;
  const visible = points.length > 31 ? points.filter((_, index) => index % 3 === 0 || index === points.length - 1) : points;
  const maximum = Math.max(1, ...visible.map((point) => point.pageViews));
  return <section className="admin-card admin-trend-card">
    <header className="admin-card-heading"><div><span>访问与询价趋势</span><h2>业务热度变化</h2></div><div className="admin-legend"><span><i className="view"/>浏览量</span><span><i className="inquiry"/>询价</span></div></header>
    <div className="admin-trend-scroll"><div className="admin-trend" style={{ minWidth: `${Math.max(620, visible.length * 34)}px` }}>
      {visible.map((point, index) => <div className="admin-trend-column" key={point.date} title={`${point.date}：${point.pageViews} 次浏览，${point.inquiries} 条询价`}>
        <div className="admin-bars"><i className="view" style={{ height: `${Math.max(point.pageViews ? 8 : 2, point.pageViews / maximum * 100)}%` }}/><i className="inquiry" style={{ height: `${Math.max(point.inquiries ? 8 : 2, point.inquiries / maximum * 100)}%` }}/></div>
        <span>{index % Math.max(1, Math.ceil(visible.length / 7)) === 0 || index === visible.length - 1 ? point.date.slice(5).replace("-", "/") : ""}</span>
      </div>)}
    </div></div>
  </section>;
}

function Ranking({ title, subtitle, rows, kind }: { title: string; subtitle: string; rows: RankedMetric[]; kind: "source" | "page" }) {
  const maximum = Math.max(1, ...rows.map((row) => row.pageViews));
  return <section className="admin-card admin-ranking">
    <header className="admin-card-heading"><div><span>{subtitle}</span><h2>{title}</h2></div></header>
    <div className="admin-ranking-list">
      {rows.length ? rows.map((row, index) => <article key={row.label}>
        <b>{String(index + 1).padStart(2, "0")}</b>
        <div><strong title={row.label}>{kind === "page" ? shortPath(row.label) : row.label}</strong><i><span style={{ width: `${Math.max(4, row.pageViews / maximum * 100)}%` }}/></i></div>
        <span><b>{formatNumber(row.pageViews)}</b> 浏览<small>{row.inquiries} 询价</small></span>
      </article>) : <div className="admin-empty-compact">有访问数据后将在这里显示</div>}
    </div>
  </section>;
}

function StatusBadge({ status }: { status: InquiryStatus }) {
  return <span className={`admin-status status-${status}`}><i/>{inquiryStatusLabels[status]}</span>;
}

function InquiryDrawer({ inquiry, onClose, onStatus }: { inquiry: InquiryRecord; onClose: () => void; onStatus: (id: string, status: InquiryStatus) => Promise<void> }) {
  return <><button className="admin-drawer-backdrop" type="button" onClick={onClose} aria-label="关闭"/><aside className="admin-inquiry-drawer" role="dialog" aria-modal="true" aria-labelledby="inquiry-detail-title">
    <header><div><span>INQUIRY DETAIL</span><h2 id="inquiry-detail-title">询价详情</h2><small>{inquiry.id}</small></div><button type="button" onClick={onClose}><Icon name="close"/></button></header>
    <section className="admin-drawer-status"><div><span>当前进度</span><StatusBadge status={inquiry.status}/></div><select value={inquiry.status} onChange={(event) => void onStatus(inquiry.id, event.target.value as InquiryStatus)}>{inquiryStatuses.map((status) => <option key={status} value={status}>{inquiryStatusLabels[status]}</option>)}</select></section>
    <section className="admin-contact-grid">
      <div><span>联系电话</span><strong>{inquiry.phone}</strong></div>
      <div><span>WhatsApp</span><strong>{inquiry.whatsapp || "与电话相同"}</strong></div>
      <div><span>邮箱</span><strong>{inquiry.email || "未填写"}</strong></div>
      <div><span>收货城市</span><strong>{inquiry.destination || "待确认"}</strong></div>
      <div><span>优先联系</span><strong>{{ phone: "电话", whatsapp: "WhatsApp", email: "邮箱" }[inquiry.preferredContact]}</strong></div>
      <div><span>提交时间</span><strong>{formatDate(inquiry.createdAt)}</strong></div>
    </section>
    <section className="admin-drawer-section"><header><span>询价商品</span><b>{inquiry.items.length} 种</b></header>{inquiry.items.length ? <div className="admin-item-list">{inquiry.items.map((item) => <article key={`${item.kind}-${item.name}`}><div><strong>{item.name}</strong><span>{item.kind}</span></div><b>× {formatNumber(item.quantity)}</b><strong>¥ {formatNumber(item.unitPriceCny * item.quantity)}</strong></article>)}</div> : <p>客户发起了通用采购咨询，暂未指定商品。</p>}<footer><span>商品参考小计</span><strong>¥ {formatNumber(inquiry.totalCny)}</strong></footer></section>
    <section className="admin-drawer-section"><header><span>客户备注</span></header><p>{inquiry.note || "客户没有填写其他要求。"}</p></section>
    <section className="admin-drawer-section admin-attribution"><header><span>来源信息</span></header><dl><div><dt>访问来源</dt><dd>{inquiry.source}</dd></div><div><dt>提交页面</dt><dd>{inquiry.sourcePath}</dd></div><div><dt>营销活动</dt><dd>{inquiry.utmCampaign || "—"}</dd></div><div><dt>语言 / 币种</dt><dd>{inquiry.language || "—"} / {inquiry.currency || "—"}</dd></div></dl></section>
  </aside></>;
}

function InquiriesTable({ snapshot, onOpen, onStatus }: { snapshot: AdminSnapshot; onOpen: (inquiry: InquiryRecord) => void; onStatus: (id: string, status: InquiryStatus) => Promise<void> }) {
  return <section className="admin-card admin-inquiries-card" id="inquiries">
    <header className="admin-card-heading"><div><span>LEAD MANAGEMENT</span><h2>最新询价</h2></div><b>共 {formatNumber(snapshot.totalInquiries)} 条</b></header>
    {snapshot.inquiries.length ? <div className="admin-table-scroll"><table><thead><tr><th>客户 / 联系方式</th><th>收货城市</th><th>询价商品</th><th>来源</th><th>提交时间</th><th>状态</th><th/></tr></thead><tbody>
      {snapshot.inquiries.map((inquiry) => <tr key={inquiry.id}>
        <td><strong>{inquiry.phone}</strong><span>{inquiry.email || inquiry.whatsapp || "未填写其他联系方式"}</span></td>
        <td><strong>{inquiry.destination || "待确认"}</strong><span>{inquiry.language.toUpperCase() || "—"} · {inquiry.currency || "—"}</span></td>
        <td><strong>{inquiry.items[0]?.name ?? "通用采购咨询"}</strong><span>{inquiry.items.length > 1 ? `另有 ${inquiry.items.length - 1} 种商品` : inquiry.items.length ? `数量 ${formatNumber(inquiry.items[0].quantity)}` : "未指定商品"}</span></td>
        <td><strong>{inquiry.source}</strong><span>{shortPath(inquiry.sourcePath)}</span></td>
        <td><strong>{formatDate(inquiry.createdAt)}</strong><span>{inquiry.createdAt.slice(0, 10)}</span></td>
        <td><select className={`admin-status-select status-${inquiry.status}`} value={inquiry.status} onChange={(event) => void onStatus(inquiry.id, event.target.value as InquiryStatus)}>{inquiryStatuses.map((status) => <option key={status} value={status}>{inquiryStatusLabels[status]}</option>)}</select></td>
        <td><button className="admin-row-open" type="button" onClick={() => onOpen(inquiry)} aria-label="查看询价详情"><Icon name="arrow"/></button></td>
      </tr>)}
    </tbody></table></div> : <div className="admin-empty"><i><Icon name="inquiries"/></i><h3>还没有符合条件的询价</h3><p>客户提交询价后会立即出现在这里。</p></div>}
  </section>;
}

export default function AdminApp() {
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [username, setUsername] = useState("");
  const [authState, setAuthState] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState<InquiryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);

  const load = useCallback(async (options?: { days?: number; status?: InquiryStatus | "all"; search?: string }) => {
    setLoading(true);
    setError("");
    const nextDays = options?.days ?? days;
    const nextStatus = options?.status ?? status;
    const nextSearch = options?.search ?? search;
    try {
      const parameters = new URLSearchParams({ days: String(nextDays), status: nextStatus, search: nextSearch });
      const response = await fetch(`/api/admin/dashboard?${parameters}`, { cache: "no-store" });
      const result = await response.json() as { error?: string; user?: { username: string }; snapshot?: AdminSnapshot };
      if (response.status === 401) { setAuthState("signed-out"); setSnapshot(null); return; }
      if (!response.ok || !result.snapshot) throw new Error(result.error ?? "后台数据加载失败");
      setUsername(result.user?.username ?? "管理员");
      setSnapshot(result.snapshot);
      setAuthState("signed-in");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "后台数据加载失败");
      if (authState === "loading") setAuthState("signed-out");
    } finally {
      setLoading(false);
    }
  }, [authState, days, search, status]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: string, nextStatus: InquiryStatus) => {
    const response = await fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    const result = await response.json() as { error?: string; inquiry?: InquiryRecord };
    if (!response.ok || !result.inquiry) { setError(result.error ?? "状态更新失败"); return; }
    setSnapshot((current) => current ? { ...current, inquiries: current.inquiries.map((item) => item.id === id ? result.inquiry! : item) } : current);
    setSelectedInquiry((current) => current?.id === id ? result.inquiry! : current);
  };

  const logout = async () => {
    await fetch("/api/admin/logout", { method: "POST" });
    setAuthState("signed-out");
    setSnapshot(null);
  };

  const submitSearch = (event: FormEvent) => { event.preventDefault(); void load({ search }); };
  const maxMetric = useMemo(() => snapshot ? Math.max(snapshot.metrics.pageViews, snapshot.metrics.visitors, 1) : 1, [snapshot]);

  if (authState === "loading") return <div className="admin-loading"><Brand compact/><span>正在进入运营后台…</span></div>;
  if (authState === "signed-out") return <Login onSuccess={() => { setAuthState("signed-in"); void load(); }} />;
  if (!snapshot) return <div className="admin-loading admin-loading-error"><Brand/><p>{error || "暂时无法读取后台数据"}</p><button onClick={() => void load()}>重新加载</button></div>;

  return <main className="admin-shell">
    <aside className="admin-sidebar">
      <Brand />
      <nav><span>运营工作台</span><a className="active" href="#overview"><Icon name="dashboard"/><b>数据概览</b></a><a href="#inquiries"><Icon name="inquiries"/><b>询价管理</b><em>{snapshot.metrics.inquiries}</em></a></nav>
      <div className="admin-sidebar-foot"><span>当前管理员</span><strong>{username}</strong><button type="button" onClick={() => void logout()}><Icon name="logout"/>退出登录</button></div>
    </aside>
    <section className="admin-workspace">
      <header className="admin-topbar"><div><span>OPERATIONS OVERVIEW</span><h1>运营数据概览</h1><p>查看访问表现、询价转化与客户跟进状态</p></div><div className="admin-top-actions"><label>统计周期<select value={days} onChange={(event) => { const value = Number(event.target.value); setDays(value); void load({ days: value }); }}><option value={7}>近 7 天</option><option value={30}>近 30 天</option><option value={90}>近 90 天</option></select></label><button type="button" onClick={() => void load()} disabled={loading}><Icon name="refresh"/>{loading ? "刷新中" : "刷新数据"}</button></div></header>
      <div className="admin-content" id="overview">
        {error && <div className="admin-banner-error">{error}<button onClick={() => setError("")}>×</button></div>}
        <section className="admin-metrics">
          <MetricCard label="页面浏览量 · PV" value={formatNumber(snapshot.metrics.pageViews)} note={`日均 ${formatNumber(Math.round(snapshot.metrics.pageViews / snapshot.periodDays))} 次浏览`} icon="eye" />
          <MetricCard label="独立访客 · UV" value={formatNumber(snapshot.metrics.visitors)} note={`${formatNumber(snapshot.metrics.sessions)} 个访问会话`} icon="users" />
          <MetricCard label="询价数量" value={formatNumber(snapshot.metrics.inquiries)} note={`${formatNumber(snapshot.metrics.inquiryVisitors)} 位客户发起`} icon="quote" />
          <MetricCard label="询价转化率" value={`${snapshot.metrics.conversionRate.toFixed(1)}%`} note={`有效询价率 ${snapshot.metrics.validInquiryRate.toFixed(1)}%`} icon="conversion" accent />
        </section>
        <section className="admin-signal"><span>数据健康度</span><div><i style={{ width: `${Math.min(100, snapshot.metrics.visitors / maxMetric * 100)}%` }}/></div><p>转化率按“发起询价的独立访客 ÷ 独立访客”计算，避免重复浏览导致指标失真。</p></section>
        <TrendChart snapshot={snapshot}/>
        <section className="admin-rankings"><Ranking title="渠道贡献" subtitle="TRAFFIC SOURCE" rows={snapshot.sources} kind="source"/><Ranking title="高价值页面" subtitle="TOP LANDING PAGE" rows={snapshot.pages} kind="page"/></section>
        <section className="admin-inquiry-toolbar"><div><span>询价工作台</span><h2>客户跟进列表</h2></div><form onSubmit={submitSearch}><label><Icon name="search"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜索电话、邮箱或城市"/></label><select value={status} onChange={(event) => { const value = event.target.value as InquiryStatus | "all"; setStatus(value); void load({ status: value }); }}><option value="all">全部状态</option>{inquiryStatuses.map((item) => <option key={item} value={item}>{inquiryStatusLabels[item]}</option>)}</select><button type="submit">搜索</button><a className="admin-export" href={`/api/admin/export?status=${status}`}>导出 CSV</a></form></section>
        <InquiriesTable snapshot={snapshot} onOpen={setSelectedInquiry} onStatus={updateStatus}/>
        <footer className="admin-footer"><span>中亚商机网 · 运营管理后台</span><small>访问统计不保存完整 IP 地址</small></footer>
      </div>
    </section>
    {selectedInquiry && (
      <InquiryDrawer inquiry={selectedInquiry} onClose={() => setSelectedInquiry(null)} onStatus={updateStatus} />
    )}
  </main>;
}
