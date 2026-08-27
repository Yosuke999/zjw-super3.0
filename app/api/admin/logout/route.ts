import { NextResponse } from "next/server";
import { clearedSessionCookie, isSameOrigin } from "../../../backend/auth";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任" }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(clearedSessionCookie());
  return response;
}
