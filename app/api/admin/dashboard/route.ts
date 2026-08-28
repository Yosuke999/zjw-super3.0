import { NextResponse } from "next/server";
import { inquiryStatuses, type InquiryStatus } from "../../../backend/contracts";
import { readSession } from "../../../backend/auth";
import { getAdminSnapshot } from "../../../backend/server";
import { logError } from "../../../backend/http";
import { adminAuditContext, isProductionIdentityConfigured, recordAdminAuditSafe } from "../../../backend/admin-identity";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const parameters = new URL(request.url).searchParams;
    const days = Number(parameters.get("days") ?? 30);
    const requestedStatus = parameters.get("status") ?? "all";
    const status = (requestedStatus === "all" || inquiryStatuses.includes(requestedStatus as InquiryStatus)) ? requestedStatus as InquiryStatus | "all" : "all";
    const page = Number(parameters.get("page") ?? 1);
    const pageSize = Number(parameters.get("pageSize") ?? 50);
    const snapshot = await getAdminSnapshot(days, status, (parameters.get("search") ?? "").slice(0, 80), page, pageSize);
    await recordAdminAuditSafe({ actor: session, action: "admin.dashboard.view", context: await adminAuditContext(request, requestId), metadata: { days: snapshot.periodDays } });
    return NextResponse.json({ ok: true, user: { ...session, username: session.displayName || session.email, identityConfigured: isProductionIdentityConfigured() }, snapshot }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    logError("admin.dashboard", error, { requestId });
    return NextResponse.json({ error: "后台数据暂时不可用", requestId }, { status: 503 });
  }
}
