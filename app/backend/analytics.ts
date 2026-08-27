import {
  analyticsEventNames,
  type AnalyticsEventName,
  type AnalyticsProperties,
  type AnalyticsPropertyValue,
} from "./contracts.ts";

const allowedPropertyKeys = new Set([
  "productKind",
  "category",
  "queryLength",
  "resultCount",
  "field",
  "method",
  "fromLanguage",
  "toLanguage",
  "fromCurrency",
  "toCurrency",
  "market",
  "itemCount",
  "durationMs",
  "scrollDepth",
  "errorType",
  "target",
  "metricName",
  "rating",
  "value",
  "entryType",
]);

export function analyticsEventName(value: unknown): AnalyticsEventName | "" {
  const name = typeof value === "string" ? value : "";
  return analyticsEventNames.includes(name as AnalyticsEventName) ? name as AnalyticsEventName : "";
}

function safePropertyValue(value: unknown): AnalyticsPropertyValue | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return Number.isFinite(value) ? Math.max(-1_000_000_000, Math.min(1_000_000_000, value)) : undefined;
  if (typeof value !== "string") return undefined;
  return value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 80);
}

export function sanitizeAnalyticsProperties(value: unknown): AnalyticsProperties {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output: AnalyticsProperties = {};
  for (const [key, rawValue] of Object.entries(value).slice(0, 24)) {
    if (!allowedPropertyKeys.has(key)) continue;
    const safeValue = safePropertyValue(rawValue);
    if (safeValue !== undefined) output[key] = safeValue;
  }
  return output;
}
