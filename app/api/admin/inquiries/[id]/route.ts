import { NextResponse } from "next/server";
import { inquiryStatuses, type AdminSession, type InquiryStatus } from "../../../../backend/contracts";
import { isSameOrigin, readSession, requireAdminRole } from "../../../../backend/auth";
import { adminAuditContext, recordAdminAuditSafe } from "../../../../backend/admin-identity";
import { logError, publicError, readJson, text } from "../../../../backend/http";
import { updateInquiryStatus } from "../../../../backend/server";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const requestId = crypto.randomUUID();
  const auditContext = await adminAuditContext(request, requestId);
  let session: AdminSession | null = null;
  let inquiryId = "";
  try {
    if (!isSameOrigin(request)) {
      await recordAdminAuditSafe({ action: "admin.inquiry.status_change", outcome: "denied", metadata: { reason: "untrusted_origin" }, context: auditContext });
      return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
    }
    session = await readSession();
    if (!session) return NextResponse.json({ error: "登录已过期" }, { status: 401 });
    if (!requireAdminRole(session, "operator")) {
      await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.status_change", outcome: "denied", metadata: { reason: "insufficient_role" }, context: auditContext });
      return NextResponse.json({ error: "当前角色无权修改询价状态" }, { status: 403 });
    }
    const body = await readJson(request, 2_000);
    const status = text(body.status, 20) as InquiryStatus;
    if (!inquiryStatuses.includes(status)) {
      await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.status_change", outcome: "failure", metadata: { reason: "invalid_status" }, context: auditContext });
      return NextResponse.json({ error: "询价状态无效" }, { status: 400 });
    }
    const { id } = await context.params;
    inquiryId = text(id, 100);
    const inquiry = await updateInquiryStatus(inquiryId, status, session.email);
    if (!inquiry) {
      await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.status_change", targetType: "inquiry", targetId: inquiryId, outcome: "failure", metadata: { reason: "not_found" }, context: auditContext });
      return NextResponse.json({ error: "没有找到这条询价" }, { status: 404 });
    }
    await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.status_change", targetType: "inquiry", targetId: inquiryId, metadata: { status }, context: auditContext });
    return NextResponse.json({ ok: true, inquiry });
  } catch (error) {
    await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.status_change", targetType: "inquiry", targetId: inquiryId, outcome: "failure", metadata: { reason: "request_failed" }, context: auditContext });
    const failure = publicError(error, "询价状态暂时无法更新");
    logError("admin.inquiry-status", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}
