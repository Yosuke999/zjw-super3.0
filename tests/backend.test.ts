import assert from "node:assert/strict";
import test from "node:test";
import { analyticsIdentifier, fingerprint, HttpError, readJson, trackablePath } from "../app/backend/http.ts";
import { idempotencyKey, normalizeInquiryItems, totalInquiryCny } from "../app/backend/inquiry-validation.ts";
import { emptyBusinessDates, periodStart, shanghaiDate } from "../app/backend/metrics.ts";
import { allowRequest, createInquiry, getAdminSnapshot, updateInquiryStatus } from "../app/backend/server.ts";

test("server rebuilds inquiry product names and prices from the catalog", () => {
  const items = normalizeInquiryItems([{ kind: "screen-protector", name: "tampered", quantity: 600, unitPriceCny: 0.01 }], "zh");
  assert.deepEqual(items, [{ kind: "screen-protector", name: "手机钢化膜", quantity: 600, unitPriceCny: 0.45 }]);
  assert.equal(totalInquiryCny(items), 270);
});

test("unknown catalog products are rejected", () => {
  assert.throws(
    () => normalizeInquiryItems([{ kind: "not-a-product", quantity: 1 }], "zh"),
    (error) => error instanceof HttpError && error.status === 400,
  );
  assert.throws(
    () => normalizeInquiryItems("not-an-array", "zh"),
    (error) => error instanceof HttpError && error.status === 400,
  );
});

test("analytics accepts only known paths and generated identifiers", () => {
  assert.equal(trackablePath("/products/screen-protector?lang=zh"), "/products/screen-protector?lang=zh");
  assert.equal(trackablePath("/admin"), "");
  assert.equal(trackablePath("https://attacker.example/products/a"), "");
  assert.equal(analyticsIdentifier(`vis_${"a".repeat(32)}`, "vis"), `vis_${"a".repeat(32)}`);
  assert.equal(analyticsIdentifier("arbitrary", "vis"), "");
});

test("request fingerprints are secret- and purpose-separated", async () => {
  const inquiry = await fingerprint("203.0.113.10", "inquiry");
  const analytics = await fingerprint("203.0.113.10", "analytics");
  assert.equal(inquiry.length, 32);
  assert.notEqual(inquiry, analytics);
  assert.equal(inquiry, await fingerprint("203.0.113.10", "inquiry"));
});

test("JSON reader reports malformed and oversized requests as client errors", async () => {
  await assert.rejects(
    readJson(new Request("https://example.test", { method: "POST", body: "{" })),
    (error) => error instanceof HttpError && error.status === 400,
  );
  await assert.rejects(
    readJson(new Request("https://example.test", { method: "POST", body: JSON.stringify({ value: "x".repeat(100) }) }), 20),
    (error) => error instanceof HttpError && error.status === 413,
  );
});

test("business metrics use Asia/Shanghai day boundaries", () => {
  assert.equal(shanghaiDate("2026-08-26T15:59:59.000Z"), "2026-08-26");
  assert.equal(shanghaiDate("2026-08-26T16:00:00.000Z"), "2026-08-27");
  assert.equal(periodStart(7, new Date("2026-08-27T10:00:00.000Z")).toISOString(), "2026-08-20T16:00:00.000Z");
  assert.deepEqual(emptyBusinessDates(3, new Date("2026-08-27T10:00:00.000Z")).map((point) => point.date), ["2026-08-25", "2026-08-26", "2026-08-27"]);
});

test("idempotency keys reject unsafe or undersized values", () => {
  assert.equal(idempotencyKey("request_12345678"), "request_12345678");
  assert.equal(idempotencyKey("short"), "");
  assert.equal(idempotencyKey("bad key with spaces"), "");
});

test("inquiry creation is idempotent in the development store", async () => {
  const key = `test_${crypto.randomUUID().replaceAll("-", "")}`;
  const input = {
    destination: "Bishkek",
    phone: "+996 555 000 000",
    whatsapp: "",
    email: "",
    preferredContact: "phone" as const,
    note: "",
    language: "zh",
    currency: "CNY",
    market: "kg",
    sourcePath: "/",
    source: "直接访问",
    referrer: "",
    utmSource: "",
    utmMedium: "",
    utmCampaign: "",
    visitorId: `vis_${"b".repeat(32)}`,
    sessionId: `ses_${"c".repeat(32)}`,
    items: normalizeInquiryItems([{ kind: "screen-protector", quantity: 500 }], "zh"),
    totalCny: 225,
  };
  const first = await createInquiry(input, key);
  const second = await createInquiry(input, key);
  assert.equal(first.created, true);
  assert.equal(second.created, false);
  assert.equal(second.inquiry.id, first.inquiry.id);

  const updated = await updateInquiryStatus(first.inquiry.id, "contacted", "test-admin");
  assert.equal(updated?.status, "contacted");
  const snapshot = await getAdminSnapshot(30, "all", first.inquiry.id, 1, 10);
  assert.equal(snapshot.totalInquiries, 1);
  assert.equal(snapshot.inquiries[0]?.id, first.inquiry.id);
});

test("development rate limiter enforces its configured window", async () => {
  const key = `test-rate:${crypto.randomUUID()}`;
  assert.equal(await allowRequest(key, 2, 60), true);
  assert.equal(await allowRequest(key, 2, 60), true);
  assert.equal(await allowRequest(key, 2, 60), false);
});
