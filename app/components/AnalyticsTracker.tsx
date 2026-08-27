"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { getClientContext } from "../lib/analytics-client";

export default function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const path = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
    const lastKey = "central-asia-trade.last-page-view";
    try {
      const last = JSON.parse(sessionStorage.getItem(lastKey) ?? "null") as { path?: string; at?: number } | null;
      if (last?.path === path && Date.now() - (last.at ?? 0) < 1500) return;
      sessionStorage.setItem(lastKey, JSON.stringify({ path, at: Date.now() }));
    } catch { /* Tracking remains best-effort. */ }
    const context = getClientContext();
    void fetch("/api/analytics", {
      method: "POST",
      headers: { "content-type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        visitorId: context.visitorId,
        sessionId: context.sessionId,
        path,
        referrer: context.referrer,
        utmSource: context.utmSource,
        utmMedium: context.utmMedium,
        utmCampaign: context.utmCampaign,
        language: document.documentElement.lang,
        deviceType: window.matchMedia("(max-width: 760px)").matches ? "mobile" : "desktop",
      }),
    }).catch(() => undefined);
  }, [pathname, searchParams]);

  return null;
}
