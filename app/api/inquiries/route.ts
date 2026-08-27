import { NextResponse } from "next/server";
import type { InquiryItem, InquiryRecord } from "../../backend/contracts";
import { clientIp, fingerprint, readJson, text } from "../../backend/http";
import { isSameOrigin } from "../../backend/auth";
import { allowRequest, createInquiry, normalizeSource, notifyNewInquiry } from "../../backend/server";

export const dynamic = "force-dynamic";

function parseItems(value: unknown): InquiryItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 20).flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    const quantity = Math.max(1, Math.min(10_000_000, Math.round(Number(row.quantity) || 1)));
    const unitPriceCny = Math.max(0, Math.min(10_000_000, Number(row.unitPriceCny) || 0));
    const kind = text(row.kind, 80);
    const name = text(row.name, 200);
    return kind && name ? [{ kind, name, quantity, unitPriceCny }] : [];
  });
}

export async function POST(request: Request) {
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    const body = await readJson(request);
    if (text(body.website, 120)) return NextResponse.json({ ok: true, id: "received" });
    const ipHash = await fingerprint(clientIp(request));
    if (!(await allowRequest(`inquiry:${ipHash}`, 8, 60 * 60))) {
      return NextResponse.json({ error: "提交过于频繁，请稍后再试" }, { status: 429 });
    }

    const phone = text(body.phone, 40).replace(/[^\d+()\-\s]/g, "");
    const email = text(body.email, 180);
    if (phone.replace(/\D/g, "").length < 6) return NextResponse.json({ error: "请填写有效联系电话" }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "邮箱格式不正确" }, { status: 400 });
    const items = parseItems(body.items);
    const utmSource = text(body.utmSource, 80);
    const referrer = text(body.referrer, 500);
    const preferred = text(body.preferredContact, 16);
    const input: Omit<InquiryRecord, "id" | "status" | "createdAt" | "updatedAt"> = {
      destination: text(body.destination, 120),
      phone,
      whatsapp: text(body.whatsapp, 40).replace(/[^\d+()\-\s]/g, ""),
      email,
      preferredContact: (["phone", "whatsapp", "email"].includes(preferred) ? preferred : "phone") as InquiryRecord["preferredContact"],
      note: text(body.note, 1_500),
      language: text(body.language, 16),
      currency: text(body.currency, 16),
      market: text(body.market, 16),
      sourcePath: text(body.sourcePath, 300) || "/",
      source: normalizeSource(utmSource, referrer),
      referrer,
      utmSource,
      utmMedium: text(body.utmMedium, 80),
      utmCampaign: text(body.utmCampaign, 120),
      visitorId: text(body.visitorId, 80),
      sessionId: text(body.sessionId, 80),
      items,
      totalCny: items.reduce((total, item) => total + item.quantity * item.unitPriceCny, 0),
    };
    const inquiry = await createInquiry(input);
    await notifyNewInquiry(inquiry);
    return NextResponse.json({ ok: true, id: inquiry.id }, { status: 201 });
  } catch (error) {
    console.error("inquiry error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "询价暂时无法提交" }, { status: 503 });
  }
}
