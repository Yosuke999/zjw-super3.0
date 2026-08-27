import { NextResponse } from "next/server";
import { isBot, readJson, text } from "../../backend/http";
import { recordAnalytics } from "../../backend/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    if (request.headers.get("dnt") === "1" || isBot(request)) return new NextResponse(null, { status: 204 });
    const body = await readJson(request, 8_000);
    const path = text(body.path, 300);
    if (!path.startsWith("/") || path.startsWith("/admin")) return NextResponse.json({ error: "无效页面" }, { status: 400 });
    await recordAnalytics({
      name: "page_view",
      visitorId: text(body.visitorId, 80),
      sessionId: text(body.sessionId, 80),
      path,
      referrer: text(body.referrer, 500),
      utmSource: text(body.utmSource, 80),
      utmMedium: text(body.utmMedium, 80),
      utmCampaign: text(body.utmCampaign, 120),
      language: text(body.language, 16),
      deviceType: text(body.deviceType, 16) === "mobile" ? "mobile" : "desktop",
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("analytics error", error);
    return NextResponse.json({ error: "统计暂时不可用" }, { status: 503 });
  }
}
