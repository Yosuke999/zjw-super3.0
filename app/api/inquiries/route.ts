import { after, NextResponse } from "next/server";
import type { InquiryRecord } from "../../backend/contracts";
import { analyticsIdentifier, clientIp, fingerprint, logError, publicError, readJson, text, trackablePath } from "../../backend/http";
import { idempotencyKey, normalizeInquiryItems, totalInquiryCny } from "../../backend/inquiry-validation";
import { isSameOrigin } from "../../backend/auth";
import { allowRequest, createInquiry, normalizeSource, notifyNewInquiry } from "../../backend/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任", requestId }, { status: 403 });
    const body = await readJson(request);
    if (text(body.website, 120)) return NextResponse.json({ ok: true, id: "received" });
    const ipHash = await fingerprint(clientIp(request), "inquiry");
    if (!(await allowRequest(`inquiry:${ipHash}`, 8, 60 * 60))) {
      return NextResponse.json({ error: "提交过于频繁，请稍后再试", requestId }, { status: 429 });
    }

    const phone = text(body.phone, 40).replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ").trim();
    const email = text(body.email, 180);
    if (phone.replace(/\D/g, "").length < 6) return NextResponse.json({ error: "请填写有效联系电话", requestId }, { status: 400 });
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return NextResponse.json({ error: "邮箱格式不正确", requestId }, { status: 400 });
    const language = text(body.language, 16);
    const items = normalizeInquiryItems(body.items, language);
    const utmSource = text(body.utmSource, 80);
    const referrer = text(body.referrer, 500);
    const preferred = text(body.preferredContact, 16);
    const input: Omit<InquiryRecord, "id" | "status" | "createdAt" | "updatedAt"> = {
      destination: text(body.destination, 120),
      phone,
      whatsapp: text(body.whatsapp, 40).replace(/[^\d+()\-\s]/g, "").replace(/\s+/g, " ").trim(),
      email,
      preferredContact: (["phone", "whatsapp", "email"].includes(preferred) ? preferred : "phone") as InquiryRecord["preferredContact"],
      note: text(body.note, 1_500),
      language,
      currency: text(body.currency, 16),
      market: text(body.market, 16),
      sourcePath: trackablePath(body.sourcePath) || "/",
      source: normalizeSource(utmSource, referrer),
      referrer,
      utmSource,
      utmMedium: text(body.utmMedium, 80),
      utmCampaign: text(body.utmCampaign, 120),
      visitorId: analyticsIdentifier(body.visitorId, "vis"),
      sessionId: analyticsIdentifier(body.sessionId, "ses"),
      items,
      totalCny: totalInquiryCny(items),
    };
    const key = idempotencyKey(request.headers.get("idempotency-key")) || `server_${crypto.randomUUID().replaceAll("-", "")}`;
    const result = await createInquiry(input, key);
    if (result.created) after(() => notifyNewInquiry(result.inquiry));
    return NextResponse.json({ ok: true, id: result.inquiry.id, duplicate: !result.created }, { status: result.created ? 201 : 200 });
  } catch (error) {
    const failure = publicError(error, "询价暂时无法提交");
    logError("inquiry.create", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}
