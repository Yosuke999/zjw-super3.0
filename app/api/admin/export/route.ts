import { NextResponse } from "next/server";
import { inquiryStatuses, inquiryStatusLabels, type AdminSession, type InquiryStatus } from "../../../backend/contracts";
import { readSession, requireAdminRole } from "../../../backend/auth";
import { adminAuditContext, recordAdminAuditSafe } from "../../../backend/admin-identity";
import { getExportInquiries } from "../../../backend/server";
import { logError, publicError } from "../../../backend/http";

export const dynamic = "force-dynamic";

function cell(value: unknown) {
  let content = String(value ?? "").replaceAll('"', '""');
  if (/^[=+\-@]/.test(content)) content = `'${content}`;
  return `"${content}"`;
}

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();
  const auditContext = await adminAuditContext(request, requestId);
  let session: AdminSession | null = null;
  let status: InquiryStatus | "all" = "all";
  try {
    session = await readSession();
    if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
    if (!requireAdminRole(session, "manager")) {
      await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.csv_export", outcome: "denied", metadata: { reason: "insufficient_role" }, context: auditContext });
      return NextResponse.json({ error: "当前角色无权导出客户数据" }, { status: 403 });
    }
    const requested = new URL(request.url).searchParams.get("status") ?? "all";
    status = requested === "all" || inquiryStatuses.includes(requested as InquiryStatus) ? requested as InquiryStatus | "all" : "all";
    const inquiries = await getExportInquiries(status);
    const headers = ["询价编号", "状态", "联系电话", "WhatsApp", "邮箱", "收货城市", "优先联系方式", "商品", "参考小计(CNY)", "来源", "提交页面", "UTM来源", "UTM媒介", "UTM活动", "客户备注", "提交时间"];
    const rows = inquiries.map((inquiry) => [inquiry.id, inquiryStatusLabels[inquiry.status], inquiry.phone, inquiry.whatsapp, inquiry.email, inquiry.destination, inquiry.preferredContact, inquiry.items.map((item) => `${item.name} × ${item.quantity}`).join("；"), inquiry.totalCny, inquiry.source, inquiry.sourcePath, inquiry.utmSource, inquiry.utmMedium, inquiry.utmCampaign, inquiry.note, inquiry.createdAt]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
    await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.csv_export", targetType: "inquiry", metadata: { status, records: inquiries.length }, context: auditContext });
    return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="inquiries-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
  } catch (error) {
    await recordAdminAuditSafe({ actor: session, action: "admin.inquiry.csv_export", targetType: "inquiry", outcome: "failure", metadata: { status, reason: "export_failed" }, context: auditContext });
    const failure = publicError(error, "询价导出暂时不可用");
    logError("admin.export", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}
