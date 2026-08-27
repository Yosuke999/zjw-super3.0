import { getProduct } from "../catalog.ts";
import type { InquiryItem } from "./contracts.ts";
import { HttpError, text } from "./http.ts";

function productPriceCny(cost: string) {
  const price = Number(cost.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(price) || price < 0) throw new Error(`商品价格配置无效：${cost}`);
  return price;
}

function localizedProductName(kind: string, language: string) {
  const product = getProduct(kind);
  if (!product) return "";
  const locale = (["ru", "ky", "uz", "zh"].includes(language) ? language : "zh") as keyof typeof product.name;
  return product.name[locale] || product.name.zh;
}

export function normalizeInquiryItems(value: unknown, language: string): InquiryItem[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new HttpError(400, "询价商品格式无效");
  if (value.length > 20) throw new HttpError(400, "一次询价最多包含 20 种商品");

  return value.map((entry) => {
    if (!entry || typeof entry !== "object") throw new HttpError(400, "询价商品格式无效");
    const row = entry as Record<string, unknown>;
    const kind = text(row.kind, 80);
    const product = getProduct(kind);
    if (!product) throw new HttpError(400, `询价中包含不存在的商品：${kind || "未知商品"}`);
    const quantity = Math.max(1, Math.min(10_000_000, Math.round(Number(row.quantity) || 1)));
    return {
      kind: product.kind,
      name: localizedProductName(product.kind, language),
      quantity,
      unitPriceCny: productPriceCny(product.cost),
    };
  });
}

export function totalInquiryCny(items: InquiryItem[]) {
  return Math.round(items.reduce((total, item) => total + item.quantity * item.unitPriceCny, 0) * 100) / 100;
}

export function idempotencyKey(value: unknown) {
  const candidate = text(value, 100);
  return /^[A-Za-z0-9_-]{8,100}$/.test(candidate) ? candidate : "";
}
