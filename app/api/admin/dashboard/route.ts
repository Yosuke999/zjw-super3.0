import { NextResponse } from "next/server";
import { inquiryStatuses, type InquiryStatus } from "../../../backend/contracts";
import { readSession } from "../../../backend/auth";
import { getAdminSnapshot } from "../../../backend/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const session = await readSession();
  if (!session) return NextResponse.json({ error: "请先登录" }, { status: 401 });
  try {
    const parameters = new URL(request.url).searchParams;
    const days = Number(parameters.get("days") ?? 30);
    const requestedStatus = parameters.get("status") ?? "all";
    const status = (requestedStatus === "all" || inquiryStatuses.includes(requestedStatus as InquiryStatus)) ? requestedStatus as InquiryStatus | "all" : "all";
    const snapshot = await getAdminSnapshot(days, status, (parameters.get("search") ?? "").slice(0, 80));
    return NextResponse.json({ ok: true, user: session, snapshot });
  } catch (error) {
    console.error("admin dashboard error", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "后台数据暂时不可用" }, { status: 503 });
  }
}
