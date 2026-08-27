import {
  inquiryStatuses,
  type AdminSnapshot,
  type InquiryItem,
  type InquiryRecord,
  type InquiryStatus,
  type RankedMetric,
  type TrendPoint,
} from "./contracts";

type RuntimeEnv = {
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  ADMIN_USERNAME?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_SESSION_SECRET?: string;
  RESEND_API_KEY?: string;
  INQUIRY_NOTIFICATION_EMAIL?: string;
  INQUIRY_NOTIFICATION_FROM?: string;
  INQUIRY_WEBHOOK_URL?: string;
};

type AnalyticsEvent = {
  id: string;
  name: "page_view" | "inquiry_submitted";
  visitorId: string;
  sessionId: string;
  path: string;
  source: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  language: string;
  deviceType: string;
  createdAt: string;
};

type CreateInquiryInput = Omit<InquiryRecord, "id" | "status" | "createdAt" | "updatedAt">;

type MemoryStore = {
  inquiries: InquiryRecord[];
  events: AnalyticsEvent[];
  limits: Map<string, number[]>;
};

type SupabaseConfig = { url: string; serviceRoleKey: string };

declare global {
  var __centralAsiaBackendMemory: MemoryStore | undefined;
}

function runtimeEnv() {
  return process.env as RuntimeEnv;
}

function memoryStore(): MemoryStore {
  globalThis.__centralAsiaBackendMemory ??= { inquiries: [], events: [], limits: new Map() };
  return globalThis.__centralAsiaBackendMemory;
}

function supabaseConfig(): SupabaseConfig | null {
  const configured = runtimeEnv();
  const url = configured.SUPABASE_URL;
  const serviceRoleKey = configured.SUPABASE_SERVICE_ROLE_KEY;
  if (url && serviceRoleKey) return { url: url.replace(/\/$/, ""), serviceRoleKey };
  if (process.env.NODE_ENV === "production") {
    throw new Error("Supabase 尚未配置。请设置 SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY。");
  }
  return null;
}

async function supabaseRequest(path: string, init: RequestInit = {}) {
  const configured = supabaseConfig();
  if (!configured) throw new Error("Supabase is unavailable in local fallback mode");
  const headers = new Headers(init.headers);
  headers.set("apikey", configured.serviceRoleKey);
  headers.set("authorization", `Bearer ${configured.serviceRoleKey}`);
  headers.set("content-type", "application/json");
  const response = await fetch(`${configured.url}/rest/v1/${path}`, { ...init, headers });
  if (!response.ok) {
    const details = (await response.text()).slice(0, 800);
    throw new Error(`Supabase ${response.status}: ${details || response.statusText}`);
  }
  return response;
}

async function supabaseRows<T>(path: string, init: RequestInit = {}) {
  const response = await supabaseRequest(path, init);
  return await response.json() as T[];
}

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
}

function clean(value: unknown, maximum = 500) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function normalizeSource(utmSource: string, referrer: string) {
  if (utmSource) return utmSource.slice(0, 80);
  if (!referrer) return "直接访问";
  try {
    const hostname = new URL(referrer).hostname.replace(/^www\./, "");
    if (/google\./i.test(hostname)) return "Google";
    if (/yandex\./i.test(hostname)) return "Yandex";
    if (/facebook|instagram/i.test(hostname)) return "Meta";
    if (/t\.me|telegram/i.test(hostname)) return "Telegram";
    return hostname || "其他引荐";
  } catch {
    return "其他引荐";
  }
}

function inquiryToRow(inquiry: InquiryRecord) {
  return {
    id: inquiry.id,
    status: inquiry.status,
    destination: inquiry.destination,
    phone: inquiry.phone,
    whatsapp: inquiry.whatsapp,
    email: inquiry.email,
    preferred_contact: inquiry.preferredContact,
    note: inquiry.note,
    language: inquiry.language,
    currency: inquiry.currency,
    market: inquiry.market,
    source_path: inquiry.sourcePath,
    source: inquiry.source,
    referrer: inquiry.referrer,
    utm_source: inquiry.utmSource,
    utm_medium: inquiry.utmMedium,
    utm_campaign: inquiry.utmCampaign,
    visitor_id: inquiry.visitorId,
    session_id: inquiry.sessionId,
    items_json: inquiry.items,
    total_cny: inquiry.totalCny,
    created_at: inquiry.createdAt,
    updated_at: inquiry.updatedAt,
  };
}

function eventToRow(event: AnalyticsEvent) {
  return {
    id: event.id,
    event_name: event.name,
    visitor_id: event.visitorId,
    session_id: event.sessionId,
    path: event.path,
    source: event.source,
    referrer: event.referrer,
    utm_source: event.utmSource,
    utm_medium: event.utmMedium,
    utm_campaign: event.utmCampaign,
    language: event.language,
    device_type: event.deviceType,
    created_at: event.createdAt,
  };
}

function rowToInquiry(row: Record<string, unknown>): InquiryRecord {
  let items: InquiryItem[] = [];
  if (Array.isArray(row.items_json)) items = row.items_json as InquiryItem[];
  else {
    try { items = JSON.parse(String(row.items_json ?? "[]")) as InquiryItem[]; } catch { /* keep empty */ }
  }
  return {
    id: String(row.id),
    status: inquiryStatuses.includes(row.status as InquiryStatus) ? row.status as InquiryStatus : "new",
    destination: String(row.destination ?? ""),
    phone: String(row.phone ?? ""),
    whatsapp: String(row.whatsapp ?? ""),
    email: String(row.email ?? ""),
    preferredContact: (row.preferred_contact as InquiryRecord["preferredContact"]) ?? "phone",
    note: String(row.note ?? ""),
    language: String(row.language ?? ""),
    currency: String(row.currency ?? ""),
    market: String(row.market ?? ""),
    sourcePath: String(row.source_path ?? "/"),
    source: String(row.source ?? "直接访问"),
    referrer: String(row.referrer ?? ""),
    utmSource: String(row.utm_source ?? ""),
    utmMedium: String(row.utm_medium ?? ""),
    utmCampaign: String(row.utm_campaign ?? ""),
    visitorId: String(row.visitor_id ?? ""),
    sessionId: String(row.session_id ?? ""),
    items,
    totalCny: Number(row.total_cny ?? 0),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export async function recordAnalytics(input: Omit<AnalyticsEvent, "id" | "createdAt" | "source">) {
  const event: AnalyticsEvent = {
    ...input,
    id: newId("evt"),
    source: normalizeSource(input.utmSource, input.referrer),
    createdAt: new Date().toISOString(),
  };
  if (!supabaseConfig()) {
    memoryStore().events.push(event);
    return;
  }
  await supabaseRequest("analytics_events", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(eventToRow(event)),
  });
}

export async function createInquiry(input: CreateInquiryInput) {
  const now = new Date().toISOString();
  const inquiry: InquiryRecord = { ...input, id: newId("inq"), status: "new", createdAt: now, updatedAt: now };
  if (!supabaseConfig()) {
    const store = memoryStore();
    store.inquiries.unshift(inquiry);
    store.events.push({
      id: newId("evt"), name: "inquiry_submitted", visitorId: inquiry.visitorId, sessionId: inquiry.sessionId,
      path: inquiry.sourcePath, source: inquiry.source, referrer: inquiry.referrer, utmSource: inquiry.utmSource,
      utmMedium: inquiry.utmMedium, utmCampaign: inquiry.utmCampaign, language: inquiry.language,
      deviceType: "unknown", createdAt: now,
    });
    return inquiry;
  }
  await supabaseRequest("inquiries", {
    method: "POST",
    headers: { prefer: "return=minimal" },
    body: JSON.stringify(inquiryToRow(inquiry)),
  });
  try {
    await recordAnalytics({
      name: "inquiry_submitted", visitorId: inquiry.visitorId, sessionId: inquiry.sessionId, path: inquiry.sourcePath,
      referrer: inquiry.referrer, utmSource: inquiry.utmSource, utmMedium: inquiry.utmMedium,
      utmCampaign: inquiry.utmCampaign, language: inquiry.language, deviceType: "unknown",
    });
  } catch (error) {
    console.error("inquiry conversion event error", error);
  }
  return inquiry;
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

export async function notifyNewInquiry(inquiry: InquiryRecord) {
  const configured = runtimeEnv();
  const jobs: Promise<unknown>[] = [];
  if (configured.INQUIRY_WEBHOOK_URL) {
    jobs.push(fetch(configured.INQUIRY_WEBHOOK_URL, {
      method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ event: "inquiry.created", inquiry }),
    }).then((response) => { if (!response.ok) throw new Error(`webhook ${response.status}`); }));
  }
  if (configured.RESEND_API_KEY && configured.INQUIRY_NOTIFICATION_EMAIL) {
    const products = inquiry.items.length ? inquiry.items.map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity}</li>`).join("") : "<li>通用采购咨询</li>";
    jobs.push(fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${configured.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: configured.INQUIRY_NOTIFICATION_FROM ?? "中亚商机网 <onboarding@resend.dev>",
        to: [configured.INQUIRY_NOTIFICATION_EMAIL],
        subject: `新询价 · ${inquiry.destination || "待确认城市"} · ${inquiry.phone}`,
        html: `<h2>收到一条新询价</h2><p><b>电话：</b>${escapeHtml(inquiry.phone)}</p><p><b>城市：</b>${escapeHtml(inquiry.destination)}</p><p><b>来源：</b>${escapeHtml(inquiry.source)}</p><ul>${products}</ul>`,
      }),
    }).then((response) => { if (!response.ok) throw new Error(`email ${response.status}`); }));
  }
  if (!jobs.length) return;
  const results = await Promise.allSettled(jobs);
  for (const result of results) if (result.status === "rejected") console.error("inquiry notification error", result.reason);
}

function emptyDates(days: number): TrendPoint[] {
  const output: TrendPoint[] = [];
  const today = new Date();
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() - offset);
    output.push({ date: date.toISOString().slice(0, 10), pageViews: 0, visitors: 0, inquiries: 0 });
  }
  return output;
}

function rankedFromMemory(events: AnalyticsEvent[], inquiries: InquiryRecord[], key: "source" | "path") {
  const result = new Map<string, RankedMetric>();
  const labelOf = (value: AnalyticsEvent | InquiryRecord) => key === "source" ? value.source : "path" in value ? value.path : value.sourcePath;
  for (const event of events.filter((entry) => entry.name === "page_view")) {
    const label = labelOf(event) || (key === "source" ? "直接访问" : "/");
    const current = result.get(label) ?? { label, pageViews: 0, inquiries: 0 };
    current.pageViews += 1;
    result.set(label, current);
  }
  for (const inquiry of inquiries) {
    const label = labelOf(inquiry) || (key === "source" ? "直接访问" : "/");
    const current = result.get(label) ?? { label, pageViews: 0, inquiries: 0 };
    current.inquiries += 1;
    result.set(label, current);
  }
  return [...result.values()].sort((a, b) => b.pageViews + b.inquiries - a.pageViews - a.inquiries).slice(0, 6);
}

function memorySnapshot(days: number, status: InquiryStatus | "all", search: string): AdminSnapshot {
  const since = new Date(Date.now() - (days - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const sinceIso = since.toISOString();
  const store = memoryStore();
  const events = store.events.filter((entry) => entry.createdAt >= sinceIso);
  const inquiriesInPeriod = store.inquiries.filter((entry) => entry.createdAt >= sinceIso);
  const views = events.filter((entry) => entry.name === "page_view");
  const visitors = new Set(views.map((entry) => entry.visitorId).filter(Boolean)).size;
  const sessions = new Set(views.map((entry) => entry.sessionId).filter(Boolean)).size;
  const inquiryVisitors = new Set(inquiriesInPeriod.map((entry) => entry.visitorId).filter(Boolean)).size;
  const trend = emptyDates(days);
  const trendMap = new Map(trend.map((point) => [point.date, point]));
  const dailyVisitors = new Map<string, Set<string>>();
  for (const view of views) {
    const date = view.createdAt.slice(0, 10);
    const point = trendMap.get(date);
    if (!point) continue;
    point.pageViews += 1;
    const set = dailyVisitors.get(date) ?? new Set<string>();
    if (view.visitorId) set.add(view.visitorId);
    dailyVisitors.set(date, set);
  }
  for (const [date, set] of dailyVisitors) trendMap.get(date)!.visitors = set.size;
  for (const inquiry of inquiriesInPeriod) {
    const point = trendMap.get(inquiry.createdAt.slice(0, 10));
    if (point) point.inquiries += 1;
  }
  const needle = search.toLowerCase();
  const filtered = store.inquiries.filter((entry) => (status === "all" || entry.status === status) && (!needle || `${entry.phone} ${entry.email} ${entry.destination} ${entry.id}`.toLowerCase().includes(needle)));
  return {
    periodDays: days,
    metrics: {
      pageViews: views.length, visitors, sessions, inquiries: inquiriesInPeriod.length, inquiryVisitors,
      conversionRate: visitors ? inquiryVisitors / visitors * 100 : 0,
      validInquiryRate: inquiriesInPeriod.length ? inquiriesInPeriod.filter((entry) => entry.status !== "invalid").length / inquiriesInPeriod.length * 100 : 0,
    },
    trend, sources: rankedFromMemory(events, inquiriesInPeriod, "source"), pages: rankedFromMemory(events, inquiriesInPeriod, "path"),
    inquiries: filtered.slice(0, 100), totalInquiries: filtered.length,
  };
}

function mergeTrend(days: number, rows: Array<Record<string, unknown>>) {
  const trend = emptyDates(days);
  const map = new Map(trend.map((point) => [point.date, point]));
  for (const row of rows) {
    const point = map.get(String(row.date).slice(0, 10));
    if (!point) continue;
    point.pageViews = Number(row.page_views ?? 0);
    point.visitors = Number(row.visitors ?? 0);
    point.inquiries = Number(row.inquiries ?? 0);
  }
  return trend;
}

function rankRows(rows: Array<Record<string, unknown>>): RankedMetric[] {
  return rows.map((row) => ({ label: String(row.label || "—"), pageViews: Number(row.page_views ?? 0), inquiries: Number(row.inquiries ?? 0) }));
}

export async function getAdminSnapshot(days: number, status: InquiryStatus | "all", search: string): Promise<AdminSnapshot> {
  const periodDays = [7, 30, 90].includes(days) ? days : 30;
  if (!supabaseConfig()) return memorySnapshot(periodDays, status, search);
  const since = new Date(Date.now() - (periodDays - 1) * 86_400_000);
  since.setUTCHours(0, 0, 0, 0);
  const rpcBody = JSON.stringify({ p_since: since.toISOString() });
  const [metricRows, trendRows, sourceRows, pageRows] = await Promise.all([
    supabaseRows<Record<string, unknown>>("rpc/admin_metrics", { method: "POST", body: rpcBody }),
    supabaseRows<Record<string, unknown>>("rpc/admin_trend", { method: "POST", body: rpcBody }),
    supabaseRows<Record<string, unknown>>("rpc/admin_rank_sources", { method: "POST", body: rpcBody }),
    supabaseRows<Record<string, unknown>>("rpc/admin_rank_pages", { method: "POST", body: rpcBody }),
  ]);

  const parameters = new URLSearchParams({ select: "*", order: "created_at.desc", limit: "100" });
  if (status !== "all") parameters.set("status", `eq.${status}`);
  const safeSearch = clean(search, 80).replace(/[,%()]/g, "");
  if (safeSearch) parameters.set("or", `(phone.ilike.*${safeSearch}*,email.ilike.*${safeSearch}*,destination.ilike.*${safeSearch}*,id.ilike.*${safeSearch}*)`);
  const inquiryResponse = await supabaseRequest(`inquiries?${parameters}`, { headers: { prefer: "count=exact" } });
  const inquiryRows = await inquiryResponse.json() as Array<Record<string, unknown>>;
  const contentRange = inquiryResponse.headers.get("content-range") ?? "*/0";
  const totalInquiries = Number(contentRange.split("/")[1] ?? inquiryRows.length) || inquiryRows.length;
  const metrics = metricRows[0] ?? {};
  const pageViews = Number(metrics.page_views ?? 0);
  const visitors = Number(metrics.visitors ?? 0);
  const sessions = Number(metrics.sessions ?? 0);
  const inquiries = Number(metrics.inquiries ?? 0);
  const inquiryVisitors = Number(metrics.inquiry_visitors ?? 0);
  const validInquiries = Number(metrics.valid_inquiries ?? 0);
  return {
    periodDays,
    metrics: { pageViews, visitors, sessions, inquiries, inquiryVisitors, conversionRate: visitors ? inquiryVisitors / visitors * 100 : 0, validInquiryRate: inquiries ? validInquiries / inquiries * 100 : 0 },
    trend: mergeTrend(periodDays, trendRows), sources: rankRows(sourceRows), pages: rankRows(pageRows),
    inquiries: inquiryRows.map(rowToInquiry), totalInquiries,
  };
}

export async function updateInquiryStatus(id: string, status: InquiryStatus) {
  if (!inquiryStatuses.includes(status)) return null;
  const updatedAt = new Date().toISOString();
  if (!supabaseConfig()) {
    const inquiry = memoryStore().inquiries.find((entry) => entry.id === id);
    if (!inquiry) return null;
    inquiry.status = status;
    inquiry.updatedAt = updatedAt;
    return inquiry;
  }
  const rows = await supabaseRows<Record<string, unknown>>(`inquiries?id=eq.${encodeURIComponent(id)}&select=*`, {
    method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ status, updated_at: updatedAt }),
  });
  return rows[0] ? rowToInquiry(rows[0]) : null;
}

export async function getExportInquiries(status: InquiryStatus | "all") {
  if (!supabaseConfig()) return memoryStore().inquiries.filter((inquiry) => status === "all" || inquiry.status === status).slice(0, 5_000);
  const parameters = new URLSearchParams({ select: "*", order: "created_at.desc", limit: "5000" });
  if (status !== "all") parameters.set("status", `eq.${status}`);
  const rows = await supabaseRows<Record<string, unknown>>(`inquiries?${parameters}`);
  return rows.map(rowToInquiry);
}

export async function allowRequest(rateKey: string, maximum: number, windowSeconds: number) {
  const cutoff = new Date(Date.now() - windowSeconds * 1000).toISOString();
  if (!supabaseConfig()) {
    const limits = memoryStore().limits;
    const now = Date.now();
    const recent = (limits.get(rateKey) ?? []).filter((timestamp) => timestamp >= now - windowSeconds * 1000);
    if (recent.length >= maximum) return false;
    recent.push(now);
    limits.set(rateKey, recent);
    return true;
  }
  const parameters = new URLSearchParams({ select: "created_at", rate_key: `eq.${rateKey}`, created_at: `gte.${cutoff}`, limit: String(maximum) });
  const recent = await supabaseRows<Record<string, unknown>>(`request_limits?${parameters}`);
  if (recent.length >= maximum) return false;
  await supabaseRequest("request_limits", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify({ rate_key: rateKey, created_at: new Date().toISOString() }) });
  return true;
}

export async function backendHealth() {
  if (!supabaseConfig()) return { database: "development-memory" as const };
  await supabaseRequest("inquiries?select=id&limit=1", { method: "GET" });
  return { database: "supabase" as const };
}

export function getAdminCredentials() {
  const configured = runtimeEnv();
  const username = configured.ADMIN_USERNAME;
  const password = configured.ADMIN_PASSWORD;
  const secret = configured.ADMIN_SESSION_SECRET;
  if (username && password && secret) return { username, password, secret };
  if (process.env.NODE_ENV !== "production") return { username: "admin", password: "change-me-now", secret: "local-development-session-secret-change-before-deploy" };
  return null;
}
