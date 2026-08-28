import { NextResponse } from "next/server";
import { inquiryStatuses, type InquiryStatus } from "../../../../backend/contracts";
import { isSameOrigin, readSession, requireAdminRole } from "../../../../backend/auth";
import { adminAuditContext, recordAdminAuditSafe } from "../../../../backend/admin-identity";
import { logError, publicError, readJson, text } from "../../../../backend/http";
import { updateInquiryStatus } from "../../../../backend/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    const session = await readSession();
    if (!session) return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    if (!requireAdminRole(session, "operator")) {
      await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.status", outcome: "denied", context: await adminAuditContext(request, requestId) });
      return NextResponse.json({ error: "当前角色无权修改询价状态" }, { status: 403 });
    }
    const body = await readJson(request, 2_000);
    const status = text(body.status, 20) as InquiryStatus;
    if (!inquiryStatuses.includes(status)) return NextResponse.json({ error: "询价状态无效" }, { status: 400 });
    const { id } = await context.params;
    const inquiryId = text(id, 100);
    const inquiry = await updateInquiryStatus(inquiryId, status, session.email);
    if (!inquiry) return NextResponse.json({ error: "没有找到这条询价" }, { status: 404 });
    await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.status", targetType: "inquiry", targetId: inquiryId, metadata: { status }, context: await adminAuditContext(request, requestId) });
    return NextResponse.json({ ok: true, inquiry });
  } catch (error) {
    const failure = publicError(error, "询价状态暂时无法更新");
    logError("admin.inquiry-status", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}
