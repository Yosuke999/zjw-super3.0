import { NextResponse } from "next/server";
import { inquiryStatuses, inquiryStatusLabels, type InquiryStatus } from "../../../backend/contracts";
import { readSession } from "../../../backend/auth";
import { getExportInquiries } from "../../../backend/server";

export const dynamic = "force-dynamic";

function cell(value: unknown) {
  let content = String(value ?? "").replaceAll('"', '""');
  if (/^[=+\-@]/.test(content)) content = `'${content}`;
  return `"${content}"`;
}

export async function GET(request: Request) {
  if (!(await readSession())) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  const requested = new URL(request.url).searchParams.get("status") ?? "all";
  const status = requested === "all" || inquiryStatuses.includes(requested as InquiryStatus) ? requested as InquiryStatus | "all" : "all";
  const inquiries = await getExportInquiries(status);
  const headers = ["询价编号", "状态", "联系电话", "WhatsApp", "邮箱", "收货城市", "优先联系方式", "商品", "参考小计(CNY)", "来源", "提交页面", "UTM来源", "UTM媒介", "UTM活动", "客户备注", "提交时间"];
  const rows = inquiries.map((inquiry) => [inquiry.id, inquiryStatusLabels[inquiry.status], inquiry.phone, inquiry.whatsapp, inquiry.email, inquiry.destination, inquiry.preferredContact, inquiry.items.map((item) => `${item.name} × ${item.quantity}`).join("；"), inquiry.totalCny, inquiry.source, inquiry.sourcePath, inquiry.utmSource, inquiry.utmMedium, inquiry.utmCampaign, inquiry.note, inquiry.createdAt]);
  const csv = `\uFEFF${[headers, ...rows].map((row) => row.map(cell).join(",")).join("\r\n")}`;
  return new NextResponse(csv, { headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="inquiries-${new Date().toISOString().slice(0, 10)}.csv"`, "cache-control": "no-store" } });
}
