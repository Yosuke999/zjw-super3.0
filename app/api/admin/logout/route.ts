import { NextResponse } from "next/server";
import { beginAdminMutation, clearedPendingMfaCookie, clearedSessionCookie, revokeCurrentSession } from "../../../backend/auth";
import { recordAdminAuditSafe } from "../../../backend/admin-identity";
import { logError } from "../../../backend/http";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const mutation = await beginAdminMutation(request, requestId, "admin.logout");
  if (!mutation.ok) return NextResponse.json({ error: mutation.error }, { status: mutation.status });
  const { auditContext, session } = mutation;
  try {
    await revokeCurrentSession();
    if (session) await recordAdminAuditSafe({ actor: session, action: "admin.logout", targetType: "admin_session", targetId: session.sessionId, context: auditContext });
  } catch (error) {
    await recordAdminAuditSafe({ actor: session, action: "admin.logout", targetType: "admin_session", targetId: session?.sessionId ?? "", outcome: "failure", metadata: { reason: "revoke_failed" }, context: auditContext });
    logError("admin.logout", error, { requestId });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearedSessionCookie());
  response.cookies.set(clearedPendingMfaCookie());
  return response;
}
