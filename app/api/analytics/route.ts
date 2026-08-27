import { NextResponse } from "next/server";
import { isSameOrigin } from "../../backend/auth";
import { analyticsIdentifier, clientIp, fingerprint, isBot, logError, publicError, readJson, text, trackablePath } from "../../backend/http";
import { allowRequest, recordAnalytics } from "../../backend/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!isSameOrigin(request)) return NextResponse.json({ error: "请求来源不受信任", requestId }, { status: 403 });
    if (request.headers.get("dnt") === "1" || isBot(request)) return new NextResponse(null, { status: 204 });
    const ipHash = await fingerprint(clientIp(request), "analytics");
    if (!(await allowRequest(`analytics:${ipHash}`, 180, 60 * 60))) return new NextResponse(null, { status: 204 });
    const body = await readJson(request, 8_000);
    const path = trackablePath(body.path);
    if (!path) return NextResponse.json({ error: "无效页面", requestId }, { status: 400 });
    await recordAnalytics({
      name: "page_view",
      visitorId: analyticsIdentifier(body.visitorId, "vis"),
      sessionId: analyticsIdentifier(body.sessionId, "ses"),
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
    const failure = publicError(error, "统计暂时不可用");
    logError("analytics.record", error, { requestId });
    return NextResponse.json({ error: failure.message, requestId }, { status: failure.status });
  }
}
