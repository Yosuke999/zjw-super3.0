import assert from "node:assert/strict";
import test from "node:test";
import { catalogProducts, productBadgeRules } from "../app/catalog.ts";
import { buildProductHref, convertFromCny, formatUnitCurrency, supportedCurrencies, type Currency } from "../app/currency.ts";

const expectedUnitPrice: Record<Currency, string> = {
  CNY: "¥ 0.45",
  KGS: "KGS 5,49",
  UZS: "UZS 788",
  RUB: "₽ 5,09",
};

test("all supported currencies convert the same CNY product price", () => {
  assert.deepEqual(supportedCurrencies, ["CNY", "KGS", "UZS", "RUB"]);
  assert.equal(convertFromCny(0.45, "CNY"), 0.45);
  assert.equal(convertFromCny(0.45, "KGS"), 5.49);
  assert.equal(convertFromCny(0.45, "UZS"), 787.5);
  assert.ok(Math.abs(convertFromCny(0.45, "RUB") - 5.085) < Number.EPSILON * 8);
});

test("currency switching renders the expected unit price and preserves the selection in detail links", () => {
  for (const currency of supportedCurrencies) {
    assert.equal(formatUnitCurrency(0.45, currency), expectedUnitPrice[currency]);
    assert.equal(
      buildProductHref("screen-protector", "zh", currency),
      `/products/screen-protector?lang=zh&currency=${currency}`,
    );
  }
});

test("badge operations assign hot only to the top sellers and low MOQ only to eligible remaining products", () => {
  const hotProducts = catalogProducts.filter((product) => product.badge === "hot");
  const sortedByOrders = [...catalogProducts].sort((first, second) => second.orders - first.orders);
  assert.deepEqual(
    hotProducts.map((product) => product.kind).sort(),
    sortedByOrders.slice(0, productBadgeRules.hotProductCount).map((product) => product.kind).sort(),
  );

  const lowMoqProducts = catalogProducts.filter((product) => product.badge === "low-moq");
  assert.ok(lowMoqProducts.length > 0);
  assert.ok(lowMoqProducts.every((product) => product.moq <= productBadgeRules.lowMoqMaximum));
  assert.ok(catalogProducts.some((product) => product.badge === null));
});
