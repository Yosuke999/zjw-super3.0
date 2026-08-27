import { NextResponse } from "next/server";
import { inquiryStatuses, type InquiryStatus } from "../../../../backend/contracts";
import { isSameOrigin, readSession } from "../../../../backend/auth";
import { logError, publicError, readJson, text } from "../../../../backend/http";
import { updateInquiryStatus } from "../../../../backend/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    const body = await readJson(request, 2_000);
    const status = text(body.status, 20) as InquiryStatus;
    if (!inquiryStatuses.includes(status)) return NextResponse.json({ error: "询价状态无效" }, { status: 400 });
    const { id } = await context.params;
    const inquiry = await updateInquiryStatus(text(id, 100), status, session.username);
    if (!inquiry) return NextResponse.json({ error: "没有找到这条询价" }, { status: 404 });
    return NextResponse.json({ ok: true, inquiry });
  } catch (error) {
    const failure = publicError(error, "询价状态暂时无法更新");
    logError("admin.inquiry-status", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}
