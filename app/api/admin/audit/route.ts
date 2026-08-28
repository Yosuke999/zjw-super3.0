import { NextResponse } from "next/server";
import { readSession, requireAdminRole } from "../../../backend/auth";
import { adminAuditContext, listAdminAudit, recordAdminAuditSafe } from "../../../backend/admin-identity";
import { logError, publicError, text } from "../../../backend/http";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const context = await adminAuditContext(request, requestId);
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  if (!requireAdminRole(session, "owner")) {
    await recordAdminAuditSafe({ actor: session, action: "admin.identity.view", outcome: "denied", metadata: { resource: "audit_log" }, context });
    return NextResponse.json({ error: "仅系统所有者可查看审计日志" }, { status: 403 });
  }
  try {
    const parameters = new URL(request.url).searchParams;
    const result = await listAdminAudit({
      actorId: text(parameters.get("administrator"), 100),
      action: text(parameters.get("action"), 100),
      from: text(parameters.get("from"), 10),
      to: text(parameters.get("to"), 10),
      page: Number(parameters.get("page") ?? 1),
      pageSize: Number(parameters.get("pageSize") ?? 50),
    });
    await recordAdminAuditSafe({ actor: session, action: "admin.identity.view", metadata: { resource: "audit_log", records: result.events.length }, context });
    return NextResponse.json({ ok: true, result }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    await recordAdminAuditSafe({ actor: session, action: "admin.identity.view", outcome: "failure", metadata: { resource: "audit_log" }, context });
    const failure = publicError(error, "审计日志暂时不可用");
    logError("admin.audit.list", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}
