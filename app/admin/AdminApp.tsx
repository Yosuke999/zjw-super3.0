"use client";

import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  inquiryStatuses,
  type AdminSnapshot,
  type InquiryRecord,
  type InquiryStatus,
  type RankedMetric,
} from "../backend/contracts";
import { currencyOptions, formatCurrency, supportedCurrencies, type Currency } from "../currency";
import {
  adminCopy,
  adminLanguageLabels,
  adminLanguages,
  adminLocales,
  adminStatusLabels,
  interpolate,
  type AdminCopy,
  type AdminLanguage,
} from "./i18n";

type IconName = "dashboard" | "inquiries" | "refresh" | "search" | "eye" | "users" | "quote" | "conversion" | "logout" | "arrow" | "close";
const adminPreferenceKey = "central-asia-trade.admin-preferences";

function Icon({ name }: { name: IconName }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, ReactNode> = {
    dashboard: <><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></>,
    inquiries: <><path d="M4 5h16v12H8l-4 4V5Z"/><path d="M8 9h8M8 13h5"/></>,
    refresh: <><path d="M20 7v5h-5"/><path d="M18.4 16a8 8 0 1 1 .5-8.5L20 12"/></>,
    search: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></>,
    eye: <><path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z"/><circle cx="12" cy="12" r="2.5"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M16 5.5a3 3 0 0 1 0 5.5M17 14c2.5.5 4 2.3 4 5"/></>,
    quote: <><path d="M4 5h16v12H8l-4 4V5Z"/><path d="m8 11 2 2 5-5"/></>,
    conversion: <><path d="M4 19 10 13l4 3 6-9"/><path d="M15 7h5v5"/></>,
    logout: <><path d="M10 5H4v14h6M14 8l4 4-4 4M18 12H8"/></>,
    arrow: <><path d="M5 12h14M14 7l5 5-5 5"/></>,
    close: <><path d="m6 6 12 12M18 6 6 18"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" {...common}>{paths[name]}</svg>;
}

function readPreferences() {
  const fallback = { language: "zh" as AdminLanguage, currency: "CNY" as Currency };
  if (typeof window === "undefined") return fallback;
  try {
    const value = JSON.parse(window.localStorage.getItem(adminPreferenceKey) ?? "null") as { language?: string; currency?: string } | null;
    if (!value) return fallback;
    return {
      language: adminLanguages.includes(value.language as AdminLanguage) ? value.language as AdminLanguage : fallback.language,
      currency: supportedCurrencies.includes(value.currency as Currency) ? value.currency as Currency : fallback.currency,
    };
  } catch {
    return fallback;
  }
}

function Brand({ copy, compact = false }: { copy: AdminCopy; compact?: boolean }) {
  return <div className={`admin-brand ${compact ? "compact" : ""}`}>
    <svg className="admin-logo" viewBox="0 0 48 48" aria-hidden="true">
      <g className="admin-logo-core"><path d="M7 37V18.5C7 12.7 11.7 8 17.5 8h13C36.3 8 41 12.7 41 18.5V37"/><path d="M15 37V21.5c0-3.6 2.9-6.5 6.5-6.5h5c3.6 0 6.5 2.9 6.5 6.5V37"/></g>
      <g className="admin-logo-accent"><path d="M24 18v19M18 37h12M14 42h20"/></g>
    </svg>
    {!compact && <span><strong>{copy.brandName}</strong><small>{copy.brandAdmin}</small></span>}
  </div>;
}

function LocaleControls({ language, currency, copy, onLanguage, onCurrency, compact = false }: {
  language: AdminLanguage;
  currency: Currency;
  copy: AdminCopy;
  onLanguage: (language: AdminLanguage) => void;
  onCurrency: (currency: Currency) => void;
  compact?: boolean;
}) {
  return <div className={`admin-locale-controls ${compact ? "compact" : ""}`}>
    <label><span>{copy.language}</span><select value={language} onChange={(event) => onLanguage(event.target.value as AdminLanguage)}>{adminLanguages.map((item) => <option key={item} value={item}>{adminLanguageLabels[item]}</option>)}</select></label>
    <label><span>{copy.currency}</span><select value={currency} onChange={(event) => onCurrency(event.target.value as Currency)}>{currencyOptions.map((item) => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label>
  </div>;
}

function formatNumber(value: number, language: AdminLanguage) {
  return new Intl.NumberFormat(adminLocales[language]).format(value);
}

function formatDate(value: string, language: AdminLanguage) {
  return new Intl.DateTimeFormat(adminLocales[language], {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false,
  }).format(new Date(value));
}

function shortPath(path: string, copy: AdminCopy) {
  if (path === "/") return copy.homePage;
  if (path.startsWith("/products/")) return interpolate(copy.productPage, { name: path.split("/")[2]?.split("?")[0] ?? "—" });
  return path;
}

function localizeSource(source: string, copy: AdminCopy) {
  return source === "直接访问" ? copy.directVisit : source;
}

function Login({ language, currency, copy, onLanguage, onCurrency, onSuccess }: {
  language: AdminLanguage;
  currency: Currency;
  copy: AdminCopy;
  onLanguage: (language: AdminLanguage) => void;
  onCurrency: (currency: Currency) => void;
  onSuccess: () => void;
}) {
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
      if (!response.ok) throw new Error(copy.loginFailed);
      onSuccess();
    } catch {
      setError(copy.loginFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return <main className="admin-login-shell" lang={language}>
    <section className="admin-login-story">
      <Brand copy={copy}/>
      <div><span>{copy.loginEyebrow}</span><h1>{copy.loginTitle}</h1><p>{copy.loginStory}</p></div>
      <footer><i/><span>{copy.sourceChina}</span><i/><span>{copy.centralAsiaMarket}</span><i/><span>{copy.inquiryConversion}</span></footer>
    </section>
    <section className="admin-login-panel">
      <div className="admin-login-locale"><LocaleControls language={language} currency={currency} copy={copy} onLanguage={onLanguage} onCurrency={onCurrency}/></div>
      <form onSubmit={submit}>
        <span className="admin-kicker">{copy.adminAccess}</span>
        <h2>{copy.loginHeading}</h2>
        <p>{copy.loginIntro}</p>
        <label><span>{copy.username}</span><input name="username" autoComplete="username" required placeholder={copy.usernamePlaceholder}/></label>
        <label><span>{copy.password}</span><input name="password" type="password" autoComplete="current-password" required placeholder={copy.passwordPlaceholder}/></label>
        {error && <div className="admin-form-error" role="alert">{error}</div>}
        <button type="submit" disabled={submitting}>{submitting ? copy.signingIn : <>{copy.secureLogin}<Icon name="arrow"/></>}</button>
        <small>{copy.hiddenEntry}</small>
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

function TrendChart({ snapshot, language, copy }: { snapshot: AdminSnapshot; language: AdminLanguage; copy: AdminCopy }) {
  const points = snapshot.trend;
  const visible = points.length > 31 ? points.filter((_, index) => index % 3 === 0 || index === points.length - 1) : points;
  const viewMaximum = Math.max(1, ...visible.map((point) => point.pageViews));
  const inquiryMaximum = Math.max(1, ...visible.map((point) => point.inquiries));
  return <section className="admin-card admin-trend-card">
    <header className="admin-card-heading"><div><span>{copy.trendEyebrow}</span><h2>{copy.trendTitle}</h2></div><div className="admin-legend"><span><i className="view"/>{copy.viewsLegend}</span><span><i className="inquiry"/>{copy.inquiriesLegend}</span></div></header>
    <div className="admin-trend-scroll"><div className="admin-trend" style={{ minWidth: `${Math.max(620, visible.length * 34)}px` }}>
      {visible.map((point, index) => <div className="admin-trend-column" key={point.date} title={interpolate(copy.trendTooltip, { date: point.date, views: formatNumber(point.pageViews, language), inquiries: formatNumber(point.inquiries, language) })}>
        <div className="admin-bars"><i className="view" style={{ height: `${Math.max(point.pageViews ? 8 : 2, point.pageViews / viewMaximum * 100)}%` }}/><i className="inquiry" style={{ height: `${Math.max(point.inquiries ? 8 : 2, point.inquiries / inquiryMaximum * 100)}%` }}/></div>
        <span>{index % Math.max(1, Math.ceil(visible.length / 7)) === 0 || index === visible.length - 1 ? point.date.slice(5).replace("-", "/") : ""}</span>
      </div>)}
    </div></div>
  </section>;
}

function Ranking({ title, subtitle, rows, kind, language, copy }: { title: string; subtitle: string; rows: RankedMetric[]; kind: "source" | "page"; language: AdminLanguage; copy: AdminCopy }) {
  const maximum = Math.max(1, ...rows.map((row) => row.pageViews));
  return <section className="admin-card admin-ranking">
    <header className="admin-card-heading"><div><span>{subtitle}</span><h2>{title}</h2></div></header>
    <div className="admin-ranking-list">
      {rows.length ? rows.map((row, index) => <article key={row.label}>
        <b>{String(index + 1).padStart(2, "0")}</b>
        <div><strong title={row.label}>{kind === "page" ? shortPath(row.label, copy) : localizeSource(row.label, copy)}</strong><i><span style={{ width: `${Math.max(4, row.pageViews / maximum * 100)}%` }}/></i></div>
        <span><b>{formatNumber(row.pageViews, language)}</b> {copy.viewsUnit}<small>{formatNumber(row.inquiries, language)} {copy.inquiryUnit}</small></span>
      </article>) : <div className="admin-empty-compact">{copy.noRankingData}</div>}
    </div>
  </section>;
}

function StatusBadge({ status, language }: { status: InquiryStatus; language: AdminLanguage }) {
  return <span className={`admin-status status-${status}`}><i/>{adminStatusLabels[language][status]}</span>;
}

function StatusSelect({ inquiry, language, onStatus }: { inquiry: InquiryRecord; language: AdminLanguage; onStatus: (id: string, status: InquiryStatus) => Promise<void> }) {
  return <select className={`admin-status-select status-${inquiry.status}`} value={inquiry.status} onChange={(event) => void onStatus(inquiry.id, event.target.value as InquiryStatus)}>{inquiryStatuses.map((status) => <option key={status} value={status}>{adminStatusLabels[language][status]}</option>)}</select>;
}

function InquiryDrawer({ inquiry, language, currency, copy, onClose, onStatus }: { inquiry: InquiryRecord; language: AdminLanguage; currency: Currency; copy: AdminCopy; onClose: () => void; onStatus: (id: string, status: InquiryStatus) => Promise<void> }) {
  const contactLabels = { phone: copy.contactPhone, whatsapp: "WhatsApp", email: copy.contactEmail };
  return <><button className="admin-drawer-backdrop" type="button" onClick={onClose} aria-label={copy.close}/><aside className="admin-inquiry-drawer" role="dialog" aria-modal="true" aria-labelledby="inquiry-detail-title">
    <header><div><span>{copy.inquiryManagement}</span><h2 id="inquiry-detail-title">{copy.inquiryDetail}</h2><small>{inquiry.id}</small></div><button type="button" onClick={onClose} aria-label={copy.close}><Icon name="close"/></button></header>
    <section className="admin-drawer-status"><div><span>{copy.currentProgress}</span><StatusBadge status={inquiry.status} language={language}/></div><StatusSelect inquiry={inquiry} language={language} onStatus={onStatus}/></section>
    <section className="admin-contact-grid">
      <div><span>{copy.phone}</span><strong>{inquiry.phone}</strong></div><div><span>WhatsApp</span><strong>{inquiry.whatsapp || copy.sameAsPhone}</strong></div>
      <div><span>{copy.email}</span><strong>{inquiry.email || copy.notProvided}</strong></div><div><span>{copy.destination}</span><strong>{inquiry.destination || copy.pendingConfirmation}</strong></div>
      <div><span>{copy.preferredContact}</span><strong>{contactLabels[inquiry.preferredContact]}</strong></div><div><span>{copy.submittedAt}</span><strong>{formatDate(inquiry.createdAt, language)}</strong></div>
    </section>
    <section className="admin-drawer-section"><header><span>{copy.inquiryProduct}</span><b>{interpolate(copy.itemCount, { count: formatNumber(inquiry.items.length, language) })}</b></header>{inquiry.items.length ? <div className="admin-item-list">{inquiry.items.map((item) => <article key={`${item.kind}-${item.name}`}><div><strong>{item.name}</strong><span>{item.kind}</span></div><b>× {formatNumber(item.quantity, language)}</b><strong>{formatCurrency(item.unitPriceCny * item.quantity, currency)}</strong></article>)}</div> : <p>{copy.noSpecifiedItems}</p>}<footer><span>{copy.referenceSubtotal}</span><strong>{formatCurrency(inquiry.totalCny, currency)}</strong></footer><small className="admin-rate-note">{copy.referenceRate}</small></section>
    <section className="admin-drawer-section"><header><span>{copy.customerNote}</span></header><p>{inquiry.note || copy.noCustomerNote}</p></section>
    <section className="admin-drawer-section admin-attribution"><header><span>{copy.attribution}</span></header><dl><div><dt>{copy.visitSource}</dt><dd>{localizeSource(inquiry.source, copy)}</dd></div><div><dt>{copy.submissionPage}</dt><dd>{inquiry.sourcePath}</dd></div><div><dt>{copy.campaign}</dt><dd>{inquiry.utmCampaign || "—"}</dd></div><div><dt>{copy.languageCurrency}</dt><dd>{inquiry.language || "—"} / {inquiry.currency || "—"}</dd></div></dl></section>
  </aside></>;
}

function InquiriesTable({ snapshot, language, copy, onOpen, onStatus }: { snapshot: AdminSnapshot; language: AdminLanguage; copy: AdminCopy; onOpen: (inquiry: InquiryRecord) => void; onStatus: (id: string, status: InquiryStatus) => Promise<void> }) {
  if (!snapshot.inquiries.length) return <section className="admin-card admin-inquiries-card" id="inquiries"><header className="admin-card-heading"><div><span>{copy.inquiryWorkspace}</span><h2>{copy.latestInquiries}</h2></div><b>{interpolate(copy.totalRecords, { count: formatNumber(snapshot.totalInquiries, language) })}</b></header><div className="admin-empty"><i><Icon name="inquiries"/></i><h3>{copy.noMatchingInquiry}</h3><p>{copy.inquiryWillAppear}</p></div></section>;
  return <section className="admin-card admin-inquiries-card" id="inquiries">
    <header className="admin-card-heading"><div><span>{copy.inquiryWorkspace}</span><h2>{copy.latestInquiries}</h2></div><b>{interpolate(copy.totalRecords, { count: formatNumber(snapshot.totalInquiries, language) })}</b></header>
    <div className="admin-table-scroll"><table><thead><tr><th>{copy.customerContact}</th><th>{copy.destination}</th><th>{copy.inquiryProduct}</th><th>{copy.source}</th><th>{copy.submittedAt}</th><th>{copy.status}</th><th/></tr></thead><tbody>
      {snapshot.inquiries.map((inquiry) => <tr key={inquiry.id}>
        <td><strong>{inquiry.phone}</strong><span>{inquiry.email || inquiry.whatsapp || copy.otherContactMissing}</span></td>
        <td><strong>{inquiry.destination || copy.pendingConfirmation}</strong><span>{inquiry.language.toUpperCase() || "—"} · {inquiry.currency || "—"}</span></td>
        <td><strong>{inquiry.items[0]?.name ?? copy.generalInquiry}</strong><span>{inquiry.items.length > 1 ? interpolate(copy.otherProducts, { count: formatNumber(inquiry.items.length - 1, language) }) : inquiry.items.length ? interpolate(copy.quantity, { count: formatNumber(inquiry.items[0].quantity, language) }) : copy.unspecifiedProduct}</span></td>
        <td><strong>{localizeSource(inquiry.source, copy)}</strong><span>{shortPath(inquiry.sourcePath, copy)}</span></td><td><strong>{formatDate(inquiry.createdAt, language)}</strong></td>
        <td><StatusSelect inquiry={inquiry} language={language} onStatus={onStatus}/></td><td><button className="admin-row-open" type="button" onClick={() => onOpen(inquiry)} aria-label={copy.viewDetails}><Icon name="arrow"/></button></td>
      </tr>)}
    </tbody></table></div>
    <div className="admin-inquiry-mobile-list">{snapshot.inquiries.map((inquiry) => <article key={inquiry.id}>
      <header><div><strong>{inquiry.phone}</strong><span>{inquiry.destination || copy.pendingConfirmation}</span></div><StatusSelect inquiry={inquiry} language={language} onStatus={onStatus}/></header>
      <section><span>{copy.inquiryProduct}</span><strong>{inquiry.items[0]?.name ?? copy.generalInquiry}</strong><small>{inquiry.items.length > 1 ? interpolate(copy.otherProducts, { count: formatNumber(inquiry.items.length - 1, language) }) : inquiry.items.length ? interpolate(copy.quantity, { count: formatNumber(inquiry.items[0].quantity, language) }) : copy.unspecifiedProduct}</small></section>
      <dl><div><dt>{copy.source}</dt><dd>{localizeSource(inquiry.source, copy)}</dd></div><div><dt>{copy.submittedAt}</dt><dd>{formatDate(inquiry.createdAt, language)}</dd></div></dl>
      <button type="button" onClick={() => onOpen(inquiry)}>{copy.openRecord}<Icon name="arrow"/></button>
    </article>)}</div>
  </section>;
}

export default function AdminApp() {
  const [preferences, setPreferences] = useState({ language: "zh" as AdminLanguage, currency: "CNY" as Currency });
  const [preferencesReady, setPreferencesReady] = useState(false);
  const { language, currency } = preferences;
  const copy = adminCopy[language];
  const [snapshot, setSnapshot] = useState<AdminSnapshot | null>(null);
  const [username, setUsername] = useState("");
  const [authState, setAuthState] = useState<"loading" | "signed-out" | "signed-in">("loading");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [days, setDays] = useState(30);
  const [status, setStatus] = useState<InquiryStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedInquiry, setSelectedInquiry] = useState<InquiryRecord | null>(null);
  const setLanguage = (nextLanguage: AdminLanguage) => setPreferences((current) => ({ ...current, language: nextLanguage }));
  const setCurrency = (nextCurrency: Currency) => setPreferences((current) => ({ ...current, currency: nextCurrency }));

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPreferences(readPreferences());
      setPreferencesReady(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!preferencesReady) return;
    try { window.localStorage.setItem(adminPreferenceKey, JSON.stringify(preferences)); } catch { /* Keep preferences for this session. */ }
    document.documentElement.lang = language === "zh" ? "zh-CN" : language;
  }, [language, preferences, preferencesReady]);

  const load = useCallback(async (options?: { days?: number; status?: InquiryStatus | "all"; search?: string; page?: number }) => {
    setLoading(true); setError("");
    const nextDays = options?.days ?? days; const nextStatus = options?.status ?? status; const nextSearch = options?.search ?? search; const nextPage = options?.page ?? page;
    try {
      const parameters = new URLSearchParams({ days: String(nextDays), status: nextStatus, search: nextSearch, page: String(nextPage), pageSize: "50" });
      const response = await fetch(`/api/admin/dashboard?${parameters}`, { cache: "no-store" });
      const result = await response.json() as { user?: { username: string }; snapshot?: AdminSnapshot };
      if (response.status === 401) { setAuthState("signed-out"); setSnapshot(null); return; }
      if (!response.ok || !result.snapshot) throw new Error(copy.dashboardLoadFailed);
      setUsername(result.user?.username ?? copy.administrator); setSnapshot(result.snapshot); setPage(result.snapshot.inquiryPage.page); setAuthState("signed-in");
    } catch {
      setError(copy.dashboardLoadFailed); if (authState === "loading") setAuthState("signed-out");
    } finally { setLoading(false); }
  }, [authState, copy, days, page, search, status]);

  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => window.clearTimeout(timer); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: string, nextStatus: InquiryStatus) => {
    const response = await fetch(`/api/admin/inquiries/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ status: nextStatus }) });
    const result = await response.json() as { inquiry?: InquiryRecord };
    if (!response.ok || !result.inquiry) { setError(copy.statusUpdateFailed); return; }
    setSnapshot((current) => current ? { ...current, inquiries: current.inquiries.map((item) => item.id === id ? result.inquiry! : item) } : current);
    setSelectedInquiry((current) => current?.id === id ? result.inquiry! : current);
  };
  const logout = async () => { await fetch("/api/admin/logout", { method: "POST" }); setAuthState("signed-out"); setSnapshot(null); };
  const submitSearch = (event: FormEvent) => { event.preventDefault(); setPage(1); void load({ search, page: 1 }); };
  const localeProps = { language, currency, copy, onLanguage: setLanguage, onCurrency: setCurrency };

  if (authState === "loading") return <div className="admin-loading" lang={language}><Brand copy={copy} compact/><span>{copy.loading}</span></div>;
  if (authState === "signed-out") return <Login {...localeProps} onSuccess={() => { setAuthState("signed-in"); void load(); }}/>;
  if (!snapshot) return <div className="admin-loading admin-loading-error" lang={language}><Brand copy={copy}/><p>{error || copy.unavailable}</p><button onClick={() => void load()}>{copy.retry}</button></div>;

  const trackingRate = Math.max(0, Math.min(100, snapshot.tracking.identifiedViewRate));
  return <main className="admin-shell" lang={language}>
    <aside className="admin-sidebar"><Brand copy={copy}/><nav><span>{copy.operationsWorkspace}</span><a className="active" href="#overview"><Icon name="dashboard"/><b>{copy.overview}</b></a><a href="#inquiries"><Icon name="inquiries"/><b>{copy.inquiryManagement}</b><em>{snapshot.metrics.inquiries}</em></a></nav><div className="admin-sidebar-foot"><span>{copy.currentAdmin}</span><strong>{username}</strong><button type="button" onClick={() => void logout()}><Icon name="logout"/>{copy.logout}</button></div></aside>
    <section className="admin-workspace">
      <header className="admin-topbar"><div><span>{copy.overviewEyebrow}</span><h1>{copy.overviewTitle}</h1><p>{copy.overviewIntro}</p></div><div className="admin-top-actions"><LocaleControls {...localeProps} compact/><label className="admin-period-control"><span>{copy.period}</span><select value={days} onChange={(event) => { const value = Number(event.target.value); setDays(value); setPage(1); void load({ days: value, page: 1 }); }}><option value={7}>{copy.last7Days}</option><option value={30}>{copy.last30Days}</option><option value={90}>{copy.last90Days}</option></select></label><button type="button" onClick={() => void load()} disabled={loading}><Icon name="refresh"/>{loading ? copy.refreshing : copy.refresh}</button></div></header>
      <div className="admin-content" id="overview">
        {error && <div className="admin-banner-error">{error}<button onClick={() => setError("")} aria-label={copy.close}>×</button></div>}
        <section className="admin-metrics"><MetricCard label={copy.pageViews} value={formatNumber(snapshot.metrics.pageViews, language)} note={interpolate(copy.dailyAverage, { count: formatNumber(Math.round(snapshot.metrics.pageViews / snapshot.periodDays), language) })} icon="eye"/><MetricCard label={copy.visitors} value={formatNumber(snapshot.metrics.visitors, language)} note={interpolate(copy.sessions, { count: formatNumber(snapshot.metrics.sessions, language) })} icon="users"/><MetricCard label={copy.inquiries} value={formatNumber(snapshot.metrics.inquiries, language)} note={interpolate(copy.inquiryVisitors, { count: formatNumber(snapshot.metrics.inquiryVisitors, language) })} icon="quote"/><MetricCard label={copy.conversionRate} value={`${snapshot.metrics.conversionRate.toFixed(1)}%`} note={interpolate(copy.validInquiryRate, { value: snapshot.metrics.validInquiryRate.toFixed(1) })} icon="conversion" accent/></section>
        <section className="admin-signal"><span>{copy.trackingQuality}</span><div><i style={{ width: `${trackingRate}%` }}/></div><p>{snapshot.metrics.pageViews ? interpolate(copy.trackingQualityNote, { value: trackingRate.toFixed(1) }) : copy.trackingNoSamples}</p></section>
        <TrendChart snapshot={snapshot} language={language} copy={copy}/>
        <section className="admin-rankings"><Ranking title={copy.sourceContribution} subtitle={copy.trafficSource} rows={snapshot.sources} kind="source" language={language} copy={copy}/><Ranking title={copy.popularPages} subtitle={copy.pageTraffic} rows={snapshot.pages} kind="page" language={language} copy={copy}/></section>
        <section className="admin-inquiry-toolbar"><div><span>{copy.inquiryWorkspace}</span><h2>{copy.followUpList}</h2></div><form onSubmit={submitSearch}><label><Icon name="search"/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={copy.searchPlaceholder}/></label><select value={status} onChange={(event) => { const value = event.target.value as InquiryStatus | "all"; setStatus(value); setPage(1); void load({ status: value, page: 1 }); }}><option value="all">{copy.allStatuses}</option>{inquiryStatuses.map((item) => <option key={item} value={item}>{adminStatusLabels[language][item]}</option>)}</select><button type="submit">{copy.search}</button><a className="admin-export" href={`/api/admin/export?status=${status}`}>{copy.exportCsv}</a></form></section>
        <InquiriesTable snapshot={snapshot} language={language} copy={copy} onOpen={setSelectedInquiry} onStatus={updateStatus}/>
        {snapshot.inquiryPage.totalPages > 1 && <nav className="admin-pagination" aria-label={copy.pagination}><button type="button" disabled={loading || page <= 1} onClick={() => void load({ page: page - 1 })}>{copy.previousPage}</button><span>{interpolate(copy.pageIndicator, { page, pages: snapshot.inquiryPage.totalPages })}</span><button type="button" disabled={loading || page >= snapshot.inquiryPage.totalPages} onClick={() => void load({ page: page + 1 })}>{copy.nextPage}</button></nav>}
        <footer className="admin-footer"><span>{copy.brandName} · {copy.brandAdmin}</span><small>{copy.privacyFooter}</small></footer>
      </div>
    </section>
    {selectedInquiry && <InquiryDrawer inquiry={selectedInquiry} language={language} currency={currency} copy={copy} onClose={() => setSelectedInquiry(null)} onStatus={updateStatus}/>}
  </main>;
}
