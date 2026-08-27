import {
  inquiryStatuses,
  type AnalyticsEventName,
  type AnalyticsProperties,
  type AdminSnapshot,
  type InquiryItem,
  type InquiryRecord,
  type InquiryStatus,
  type RankedMetric,
} from "./contracts.ts";
import { emptyBusinessDates, periodStart, shanghaiDate } from "./metrics.ts";
import { HttpError, logError } from "./http.ts";

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
  name: AnalyticsEventName;
  visitorId: string;
  sessionId: string;
  path: string;
  source: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  language: string;
  currency: string;
  market: string;
  deviceType: string;
  properties: AnalyticsProperties;
  createdAt: string;
};

type CreateInquiryInput = Omit<InquiryRecord, "id" | "status" | "createdAt" | "updatedAt">;

type MemoryStore = {
  inquiries: InquiryRecord[];
  events: AnalyticsEvent[];
  limits: Map<string, number[]>;
  idempotency: Map<string, string>;
};

type SupabaseConfig = { url: string; serviceRoleKey: string };

export const latestBackendMigration = "0003_admin_i18n_analytics" as const;

export class BackendMigrationError extends Error {
  readonly requiredMigration = latestBackendMigration;

  constructor(cause: unknown) {
    const details = cause instanceof Error ? cause.message : String(cause);
    super(`Required database migration ${latestBackendMigration} is incomplete: ${details}`);
    this.name = "BackendMigrationError";
  }
}

declare global {
  var __centralAsiaBackendMemory: MemoryStore | undefined;
}

function runtimeEnv() {
  return process.env as RuntimeEnv;
}

function memoryStore(): MemoryStore {
  globalThis.__centralAsiaBackendMemory ??= { inquiries: [], events: [], limits: new Map(), idempotency: new Map() };
  globalThis.__centralAsiaBackendMemory.idempotency ??= new Map();
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
  const response = await fetch(`${configured.url}/rest/v1/${path}`, { ...init, headers, signal: init.signal ?? AbortSignal.timeout(10_000) });
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

async function supabaseJson<T>(path: string, init: RequestInit = {}) {
  const response = await supabaseRequest(path, init);
  return await response.json() as T;
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

function inquiryToRow(inquiry: InquiryRecord, idempotencyKey?: string) {
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
    ...(idempotencyKey ? { idempotency_key: idempotencyKey } : {}),
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
    currency: event.currency,
    market: event.market,
    device_type: event.deviceType,
    properties: event.properties,
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

export async function createInquiry(input: CreateInquiryInput, idempotencyKey: string) {
  const now = new Date().toISOString();
  const inquiry: InquiryRecord = { ...input, id: newId("inq"), status: "new", createdAt: now, updatedAt: now };
  if (!supabaseConfig()) {
    const store = memoryStore();
    const existingId = store.idempotency.get(idempotencyKey);
    const existing = existingId ? store.inquiries.find((entry) => entry.id === existingId) : undefined;
    if (existing) return { inquiry: existing, created: false };
    store.inquiries.unshift(inquiry);
    store.idempotency.set(idempotencyKey, inquiry.id);
    store.events.push({
      id: newId("evt"), name: "inquiry_submitted", visitorId: inquiry.visitorId, sessionId: inquiry.sessionId,
      path: inquiry.sourcePath, source: inquiry.source, referrer: inquiry.referrer, utmSource: inquiry.utmSource,
      utmMedium: inquiry.utmMedium, utmCampaign: inquiry.utmCampaign, language: inquiry.language,
      currency: inquiry.currency, market: inquiry.market, deviceType: "unknown", properties: { itemCount: inquiry.items.length }, createdAt: now,
    });
    return { inquiry, created: true };
  }
  const createdRows = await supabaseRows<Record<string, unknown>>("inquiries?on_conflict=idempotency_key&select=*", {
    method: "POST",
    headers: { prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify(inquiryToRow(inquiry, idempotencyKey)),
  });
  if (!createdRows.length) {
    const existingRows = await supabaseRows<Record<string, unknown>>(`inquiries?idempotency_key=eq.${encodeURIComponent(idempotencyKey)}&select=*&limit=1`);
    if (!existingRows[0]) throw new Error("询价幂等记录读取失败");
    return { inquiry: rowToInquiry(existingRows[0]), created: false };
  }
  const createdInquiry = rowToInquiry(createdRows[0]);
  try {
    await recordAnalytics({
      name: "inquiry_submitted", visitorId: createdInquiry.visitorId, sessionId: createdInquiry.sessionId, path: createdInquiry.sourcePath,
      referrer: createdInquiry.referrer, utmSource: createdInquiry.utmSource, utmMedium: createdInquiry.utmMedium,
      utmCampaign: createdInquiry.utmCampaign, language: createdInquiry.language, currency: createdInquiry.currency,
      market: createdInquiry.market, deviceType: "unknown", properties: { itemCount: createdInquiry.items.length },
    });
  } catch (error) {
    logError("inquiry.conversion-event", error, { inquiryId: createdInquiry.id });
  }
  return { inquiry: createdInquiry, created: true };
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
}

async function fetchWithRetry(url: string, init: RequestInit, attempts = 3) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...init, signal: AbortSignal.timeout(5_000) });
      if (response.ok) return attempt;
      if (response.status < 500 && response.status !== 429) {
        const permanentError = new Error(`HTTP ${response.status}`);
        permanentError.name = "PermanentNotificationError";
        (permanentError as Error & { attempts?: number }).attempts = attempt;
        throw permanentError;
      }
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      if (error instanceof Error && error.name === "PermanentNotificationError") throw error;
      lastError = error;
    }
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, attempt * 250));
  }
  const failure = lastError instanceof Error ? lastError : new Error("notification delivery failed");
  (failure as Error & { attempts?: number }).attempts = attempts;
  throw failure;
}

async function recordNotificationDelivery(inquiryId: string, channel: "webhook" | "email", status: "delivered" | "failed", attempts: number, error = "") {
  if (!supabaseConfig()) return;
  try {
    await supabaseRequest("notification_delivery_log", {
      method: "POST",
      headers: { prefer: "return=minimal" },
      body: JSON.stringify({ inquiry_id: inquiryId, channel, status, attempts, error: error.slice(0, 500) }),
    });
  } catch (loggingError) {
    logError("notification.delivery-log", loggingError, { inquiryId, channel });
  }
}

async function deliverNotification(inquiryId: string, channel: "webhook" | "email", url: string, init: RequestInit) {
  try {
    const attempts = await fetchWithRetry(url, init);
    await recordNotificationDelivery(inquiryId, channel, "delivered", attempts);
  } catch (error) {
    const attempts = error instanceof Error ? (error as Error & { attempts?: number }).attempts ?? 1 : 1;
    await recordNotificationDelivery(inquiryId, channel, "failed", attempts, error instanceof Error ? error.message : String(error));
    throw error;
  }
}

export async function notifyNewInquiry(inquiry: InquiryRecord) {
  const configured = runtimeEnv();
  const jobs: Promise<unknown>[] = [];
  if (configured.INQUIRY_WEBHOOK_URL) {
    jobs.push(deliverNotification(inquiry.id, "webhook", configured.INQUIRY_WEBHOOK_URL, {
      method: "POST", headers: { "content-type": "application/json", "x-idempotency-key": inquiry.id },
      body: JSON.stringify({ event: "inquiry.created", inquiry }),
    }));
  }
  if (configured.RESEND_API_KEY && configured.INQUIRY_NOTIFICATION_EMAIL) {
    const products = inquiry.items.length ? inquiry.items.map((item) => `<li>${escapeHtml(item.name)} × ${item.quantity}</li>`).join("") : "<li>通用采购咨询</li>";
    jobs.push(deliverNotification(inquiry.id, "email", "https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${configured.RESEND_API_KEY}`, "content-type": "application/json", "idempotency-key": inquiry.id },
      body: JSON.stringify({
        from: configured.INQUIRY_NOTIFICATION_FROM ?? "中亚商机网 <onboarding@resend.dev>",
        to: [configured.INQUIRY_NOTIFICATION_EMAIL],
        subject: `新询价 · ${inquiry.destination || "待确认城市"} · ${inquiry.phone}`,
        html: `<h2>收到一条新询价</h2><p><b>电话：</b>${escapeHtml(inquiry.phone)}</p><p><b>城市：</b>${escapeHtml(inquiry.destination)}</p><p><b>来源：</b>${escapeHtml(inquiry.source)}</p><ul>${products}</ul>`,
      }),
    }));
  }
  if (!jobs.length) return;
  const results = await Promise.allSettled(jobs);
  for (const result of results) if (result.status === "rejected") logError("notification.delivery", result.reason, { inquiryId: inquiry.id });
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

function memorySnapshot(days: number, status: InquiryStatus | "all", search: string, page: number, pageSize: number): AdminSnapshot {
  const sinceIso = periodStart(days).toISOString();
  const store = memoryStore();
  const events = store.events.filter((entry) => entry.createdAt >= sinceIso);
  const inquiriesInPeriod = store.inquiries.filter((entry) => entry.createdAt >= sinceIso);
  const views = events.filter((entry) => entry.name === "page_view");
  const visitors = new Set(views.map((entry) => entry.visitorId).filter(Boolean)).size;
  const sessions = new Set(views.map((entry) => entry.sessionId).filter(Boolean)).size;
  const visitorIds = new Set(views.map((entry) => entry.visitorId).filter(Boolean));
  const identifiedViews = views.filter((entry) => entry.visitorId).length;
  const inquiryVisitors = new Set(inquiriesInPeriod.map((entry) => entry.visitorId).filter((id) => id && visitorIds.has(id))).size;
  const trend = emptyBusinessDates(days);
  const trendMap = new Map(trend.map((point) => [point.date, point]));
  const dailyVisitors = new Map<string, Set<string>>();
  for (const view of views) {
    const date = shanghaiDate(view.createdAt);
    const point = trendMap.get(date);
    if (!point) continue;
    point.pageViews += 1;
    const set = dailyVisitors.get(date) ?? new Set<string>();
    if (view.visitorId) set.add(view.visitorId);
    dailyVisitors.set(date, set);
  }
  for (const [date, set] of dailyVisitors) trendMap.get(date)!.visitors = set.size;
  for (const inquiry of inquiriesInPeriod) {
    const point = trendMap.get(shanghaiDate(inquiry.createdAt));
    if (point) point.inquiries += 1;
  }
  const needle = search.toLowerCase();
  const filtered = store.inquiries.filter((entry) => (status === "all" || entry.status === status) && (!needle || `${entry.phone} ${entry.email} ${entry.destination} ${entry.id}`.toLowerCase().includes(needle)));
  const funnel: Partial<Record<AnalyticsEventName, number>> = {};
  for (const event of events) funnel[event.name] = (funnel[event.name] ?? 0) + 1;
  return {
    periodDays: days,
    metrics: {
      pageViews: views.length, visitors, sessions, inquiries: inquiriesInPeriod.length, inquiryVisitors,
      conversionRate: visitors ? inquiryVisitors / visitors * 100 : 0,
      validInquiryRate: inquiriesInPeriod.length ? inquiriesInPeriod.filter((entry) => entry.status !== "invalid").length / inquiriesInPeriod.length * 100 : 0,
    },
    trend, sources: rankedFromMemory(events, inquiriesInPeriod, "source"), pages: rankedFromMemory(events, inquiriesInPeriod, "path"),
    tracking: {
      eventCount: events.length,
      identifiedViewRate: views.length ? identifiedViews / views.length * 100 : 0,
      lastEventAt: events.reduce((latest, event) => event.createdAt > latest ? event.createdAt : latest, ""),
      funnel,
    },
    inquiries: filtered.slice((page - 1) * pageSize, page * pageSize),
    totalInquiries: filtered.length,
    inquiryPage: { page, pageSize, totalPages: Math.max(1, Math.ceil(filtered.length / pageSize)) },
  };
}

function mergeTrend(days: number, rows: Array<Record<string, unknown>>) {
  const trend = emptyBusinessDates(days);
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

function funnelRows(rows: Array<Record<string, unknown>>) {
  return Object.fromEntries(rows.map((row) => [String(row.event_name), Number(row.event_count ?? 0)]));
}

export async function getAdminSnapshot(days: number, status: InquiryStatus | "all", search: string, requestedPage = 1, requestedPageSize = 50): Promise<AdminSnapshot> {
  const periodDays = [7, 30, 90].includes(days) ? days : 30;
  const page = Math.max(1, Math.min(10_000, Math.floor(requestedPage) || 1));
  const pageSize = Math.max(10, Math.min(100, Math.floor(requestedPageSize) || 50));
  if (!supabaseConfig()) return memorySnapshot(periodDays, status, search, page, pageSize);
  const since = periodStart(periodDays);
  const rpcBody = JSON.stringify({ p_since: since.toISOString() });
  const [metricRows, trendRows, sourceRows, pageRows, trackingRows, funnelMetricRows] = await Promise.all([
    supabaseRows<Record<string, unknown>>("rpc/admin_metrics", { method: "POST", body: rpcBody }),
    supabaseRows<Record<string, unknown>>("rpc/admin_trend", { method: "POST", body: rpcBody }),
    supabaseRows<Record<string, unknown>>("rpc/admin_rank_sources", { method: "POST", body: rpcBody }),
    supabaseRows<Record<string, unknown>>("rpc/admin_rank_pages", { method: "POST", body: rpcBody }),
    supabaseRows<Record<string, unknown>>("rpc/admin_tracking_health", { method: "POST", body: rpcBody }),
    supabaseRows<Record<string, unknown>>("rpc/admin_event_funnel", { method: "POST", body: rpcBody }),
  ]);

  const parameters = new URLSearchParams({ select: "*", order: "created_at.desc", limit: String(pageSize), offset: String((page - 1) * pageSize) });
  if (status !== "all") parameters.set("status", `eq.${status}`);
  const safeSearch = clean(search, 80).replace(/[^\p{L}\p{N}@+._\-\s]/gu, "");
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
  const tracking = trackingRows[0] ?? {};
  const trackedViews = Number(tracking.page_views ?? 0);
  const identifiedViews = Number(tracking.identified_views ?? 0);
  return {
    periodDays,
    metrics: { pageViews, visitors, sessions, inquiries, inquiryVisitors, conversionRate: visitors ? inquiryVisitors / visitors * 100 : 0, validInquiryRate: inquiries ? validInquiries / inquiries * 100 : 0 },
    trend: mergeTrend(periodDays, trendRows), sources: rankRows(sourceRows), pages: rankRows(pageRows),
    tracking: {
      eventCount: Number(tracking.event_count ?? 0),
      identifiedViewRate: trackedViews ? identifiedViews / trackedViews * 100 : 0,
      lastEventAt: String(tracking.last_event_at ?? ""),
      funnel: funnelRows(funnelMetricRows),
    },
    inquiries: inquiryRows.map(rowToInquiry), totalInquiries,
    inquiryPage: { page, pageSize, totalPages: Math.max(1, Math.ceil(totalInquiries / pageSize)) },
  };
}

export async function updateInquiryStatus(id: string, status: InquiryStatus, actor: string) {
  if (!inquiryStatuses.includes(status)) return null;
  const updatedAt = new Date().toISOString();
  if (!supabaseConfig()) {
    const inquiry = memoryStore().inquiries.find((entry) => entry.id === id);
    if (!inquiry) return null;
    inquiry.status = status;
    inquiry.updatedAt = updatedAt;
    return inquiry;
  }
  const rows = await supabaseRows<Record<string, unknown>>("rpc/admin_update_inquiry_status", {
    method: "POST",
    body: JSON.stringify({ p_id: id, p_status: status, p_actor: actor.slice(0, 100) }),
  });
  return rows[0] ? rowToInquiry(rows[0]) : null;
}

export async function getExportInquiries(status: InquiryStatus | "all") {
  if (!supabaseConfig()) return memoryStore().inquiries.filter((inquiry) => status === "all" || inquiry.status === status);
  const batchSize = 1_000;
  const maximum = 100_000;
  const output: InquiryRecord[] = [];
  for (let offset = 0; offset < maximum; offset += batchSize) {
    const parameters = new URLSearchParams({ select: "*", order: "created_at.desc", limit: String(batchSize), offset: String(offset) });
    if (status !== "all") parameters.set("status", `eq.${status}`);
    const rows = await supabaseRows<Record<string, unknown>>(`inquiries?${parameters}`);
    output.push(...rows.map(rowToInquiry));
    if (rows.length < batchSize) return output;
  }
  const overflowParameters = new URLSearchParams({ select: "id", order: "created_at.desc", limit: "1", offset: String(maximum) });
  if (status !== "all") overflowParameters.set("status", `eq.${status}`);
  const overflow = await supabaseRows<Record<string, unknown>>(`inquiries?${overflowParameters}`);
  if (!overflow.length) return output;
  throw new HttpError(422, "导出记录超过 100000 条，请缩小筛选范围");
}

export async function allowRequest(rateKey: string, maximum: number, windowSeconds: number) {
  if (!supabaseConfig()) {
    const limits = memoryStore().limits;
    const now = Date.now();
    const recent = (limits.get(rateKey) ?? []).filter((timestamp) => timestamp >= now - windowSeconds * 1000);
    if (recent.length >= maximum) return false;
    recent.push(now);
    limits.set(rateKey, recent);
    return true;
  }
  return await supabaseJson<boolean>("rpc/check_and_record_rate_limit", {
    method: "POST",
    body: JSON.stringify({ p_rate_key: rateKey, p_maximum: maximum, p_window_seconds: windowSeconds }),
  });
}

export async function backendHealth() {
  if (!supabaseConfig()) return { database: "development-memory" as const };
  await Promise.all([
    supabaseRequest("inquiries?select=id,idempotency_key&limit=1", { method: "GET" }),
    supabaseRequest("notification_delivery_log?select=id&limit=1", { method: "GET" }),
  ]);
  const migrationProbe = JSON.stringify({ p_since: new Date().toISOString() });
  try {
    await Promise.all([
      // 0003 adds these columns and RPCs. Probing both halves catches partial SQL runs too.
      supabaseRequest("analytics_events?select=id,currency,market,properties&limit=1", { method: "GET" }),
      supabaseRequest("rpc/admin_tracking_health", { method: "POST", body: migrationProbe }),
      supabaseRequest("rpc/admin_event_funnel", { method: "POST", body: migrationProbe }),
    ]);
  } catch (error) {
    throw new BackendMigrationError(error);
  }
  return {
    database: "supabase" as const,
    schema: "hardened-v3" as const,
    latestMigration: latestBackendMigration,
  };
}

export function getAdminCredentials() {
  const configured = runtimeEnv();
  const username = configured.ADMIN_USERNAME;
  const password = configured.ADMIN_PASSWORD;
  const secret = configured.ADMIN_SESSION_SECRET;
  if (username && password && secret) {
    if (process.env.NODE_ENV === "production" && (password.length < 16 || secret.length < 32)) return null;
    return { username, password, secret };
  }
  if (process.env.NODE_ENV !== "production") return { username: "admin", password: "change-me-now", secret: "local-development-session-secret-change-before-deploy" };
  return null;
}
