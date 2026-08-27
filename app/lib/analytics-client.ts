import type { AnalyticsEventName, AnalyticsProperties } from "../backend/contracts";

export type ClientContext = {
  visitorId: string;
  sessionId: string;
  sourcePath: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

const publicPreferenceKey = "central-asia-trade.preferences";

function identifier(storage: Storage, key: string, prefix: string) {
  const value = `${prefix}_${crypto.randomUUID().replaceAll("-", "")}`;
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    storage.setItem(key, value);
  } catch { /* Use the one-page identifier when storage is unavailable. */ }
  return value;
}

export function getClientContext(): ClientContext {
  const parameters = new URLSearchParams(window.location.search);
  const firstTouchKey = "central-asia-trade.attribution";
  let attribution = { referrer: document.referrer, utmSource: parameters.get("utm_source") ?? "", utmMedium: parameters.get("utm_medium") ?? "", utmCampaign: parameters.get("utm_campaign") ?? "" };
  try {
    const stored = window.localStorage.getItem(firstTouchKey);
    if (stored) attribution = { ...attribution, ...JSON.parse(stored) };
    else window.localStorage.setItem(firstTouchKey, JSON.stringify(attribution));
  } catch { /* Attribution is best-effort. */ }
  return {
    visitorId: identifier(window.localStorage, "central-asia-trade.visitor", "vis"),
    sessionId: identifier(window.sessionStorage, "central-asia-trade.session", "ses"),
    sourcePath: `${window.location.pathname}${window.location.search}`.slice(0, 300),
    ...attribution,
  };
}

function getPublicPreferences() {
  const fallback = { language: document.documentElement.lang || "", currency: "", market: "" };
  try {
    const stored = JSON.parse(window.localStorage.getItem(publicPreferenceKey) ?? "null") as { lang?: string; currency?: string } | null;
    return { language: stored?.lang ?? fallback.language, currency: stored?.currency ?? "", market: "" };
  } catch {
    return fallback;
  }
}

export function trackAnalytics(name: AnalyticsEventName, properties: AnalyticsProperties = {}, options?: { path?: string; market?: string }) {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin")) return Promise.resolve();
  const context = getClientContext();
  const preferences = getPublicPreferences();
  const path = options?.path ?? `${window.location.pathname}${window.location.search}`;
  return fetch("/api/analytics", {
    method: "POST",
    headers: { "content-type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      name,
      ...context,
      path,
      language: preferences.language,
      currency: preferences.currency,
      market: options?.market ?? (typeof properties.market === "string" ? properties.market : preferences.market),
      deviceType: window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop",
      properties,
    }),
  }).then(() => undefined).catch(() => undefined);
}
