export type Currency = "CNY" | "KGS" | "UZS" | "RUB";

export const supportedCurrencies: Currency[] = ["CNY", "KGS", "UZS", "RUB"];

export const currencyOptions: Array<{ code: Currency; label: string; perCny: number; locale: string; digits: number }> = [
  { code: "CNY", label: "CNY ¥", perCny: 1, locale: "zh-CN", digits: 2 },
  { code: "KGS", label: "KGS", perCny: 12.2, locale: "ru-RU", digits: 0 },
  { code: "UZS", label: "UZS", perCny: 1750, locale: "uz-UZ", digits: 0 },
  { code: "RUB", label: "RUB ₽", perCny: 11.3, locale: "ru-RU", digits: 0 },
];

export const currencyRates = Object.fromEntries(currencyOptions.map(({ code, perCny }) => [code, perCny])) as Record<Currency, number>;

export function convertFromCny(cnyValue: number, currency: Currency) {
  return cnyValue * currencyRates[currency];
}

function currencyPrefix(currency: Currency) {
  if (currency === "CNY") return "¥";
  if (currency === "RUB") return "₽";
  return currency;
}

export function formatCurrency(cnyValue: number, currency: Currency) {
  const option = currencyOptions.find((item) => item.code === currency) ?? currencyOptions[0];
  const formatted = new Intl.NumberFormat(option.locale, {
    maximumFractionDigits: option.digits,
    minimumFractionDigits: option.digits,
  }).format(convertFromCny(cnyValue, currency));
  return `${currencyPrefix(currency)} ${formatted}`;
}

export function formatUnitCurrency(cnyValue: number, currency: Currency) {
  const option = currencyOptions.find((item) => item.code === currency) ?? currencyOptions[0];
  const digits = currency === "UZS" ? 0 : 2;
  const formatted = new Intl.NumberFormat(option.locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(convertFromCny(cnyValue, currency));
  return `${currencyPrefix(currency)} ${formatted}`;
}

export function formatExchangeRate(currency: Currency) {
  if (currency === "CNY") return "1 CNY = 1.00 CNY";
  const option = currencyOptions.find((item) => item.code === currency) ?? currencyOptions[0];
  const digits = currency === "UZS" ? 0 : 2;
  const formatted = new Intl.NumberFormat(option.locale, {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(option.perCny);
  return `1 CNY = ${formatted} ${currency}`;
}

export function buildProductHref(kind: string, lang: string, currency: Currency) {
  return `/products/${kind}?lang=${lang}&currency=${currency}`;
}
