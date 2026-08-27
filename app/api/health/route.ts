import { NextResponse } from "next/server";
import { backendHealth } from "../../backend/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await backendHealth();
    return NextResponse.json({ ok: true, ...health, checkedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error instanceof Error ? error.message : "backend unavailable" }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
