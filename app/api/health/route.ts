import { NextResponse } from "next/server";
import { backendHealth, BackendMigrationError } from "../../backend/server";
import { logError } from "../../backend/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const health = await backendHealth();
    return NextResponse.json({ ok: true, ...health, checkedAt: new Date().toISOString() }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const requestId = crypto.randomUUID();
    logError("backend.health", error, { requestId });
    const failure = error instanceof BackendMigrationError
      ? { error: "database migration is incomplete", requiredMigration: error.requiredMigration }
      : { error: "backend unavailable" };
    return NextResponse.json({ ok: false, ...failure, requestId }, { status: 503, headers: { "cache-control": "no-store" } });
  }
}
