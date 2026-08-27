export type ClientContext = {
  visitorId: string;
  sessionId: string;
  sourcePath: string;
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
};

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
