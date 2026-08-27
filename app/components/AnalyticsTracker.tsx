"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { trackAnalytics } from "../lib/analytics-client";

function metricRating(name: string, value: number) {
  const limits: Record<string, [number, number]> = { LCP: [2500, 4000], CLS: [0.1, 0.25], FCP: [1800, 3000], TTFB: [800, 1800] };
  const [good, poor] = limits[name] ?? [Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY];
  return value <= good ? "good" : value <= poor ? "needs-improvement" : "poor";
}

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
    void trackAnalytics("page_view", {}, { path });
    if (pathname.startsWith("/products/")) void trackAnalytics("product_view", { productKind: pathname.split("/")[2] ?? "" }, { path });
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const path = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;
    const startedAt = performance.now();
    let maximumScrollDepth = 0;
    let sent = false;
    const updateScroll = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      maximumScrollDepth = Math.max(maximumScrollDepth, Math.min(100, Math.round(window.scrollY / scrollable * 100)));
    };
    const sendEngagement = () => {
      if (sent) return;
      const durationMs = Math.round(performance.now() - startedAt);
      if (durationMs < 1000) return;
      sent = true;
      updateScroll();
      void trackAnalytics("page_engagement", { durationMs, scrollDepth: maximumScrollDepth }, { path });
    };
    const visibility = () => { if (document.visibilityState === "hidden") sendEngagement(); };
    window.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("pagehide", sendEngagement);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      sendEngagement();
      window.removeEventListener("scroll", updateScroll);
      window.removeEventListener("pagehide", sendEngagement);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pathname, searchParams]);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const onError = (event: ErrorEvent) => {
      const target = event.target instanceof Element ? event.target.tagName.toLowerCase() : "runtime";
      void trackAnalytics("page_error", { errorType: event.target instanceof Element ? "resource" : "runtime", target });
    };
    const onRejection = () => void trackAnalytics("page_error", { errorType: "promise", target: "window" });
    window.addEventListener("error", onError, true);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError, true);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [pathname]);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || typeof PerformanceObserver === "undefined") return;
    const sent = new Set<string>();
    const report = (metricName: string, value: number) => {
      const key = `${pathname}:${metricName}`;
      if (sent.has(key) || !Number.isFinite(value)) return;
      sent.add(key);
      void trackAnalytics("web_vital", { metricName, value: Math.round(value * 1000) / 1000, rating: metricRating(metricName, value) });
    };
    const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    if (navigation) report("TTFB", navigation.responseStart);
    const firstPaint = performance.getEntriesByName("first-contentful-paint")[0];
    if (firstPaint) report("FCP", firstPaint.startTime);

    let lcp = 0;
    let cls = 0;
    const observers: PerformanceObserver[] = [];
    if (PerformanceObserver.supportedEntryTypes.includes("largest-contentful-paint")) {
      const observer = new PerformanceObserver((list) => { const entries = list.getEntries(); lcp = entries.at(-1)?.startTime ?? lcp; });
      observer.observe({ type: "largest-contentful-paint", buffered: true });
      observers.push(observer);
    }
    if (PerformanceObserver.supportedEntryTypes.includes("layout-shift")) {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
          if (!shift.hadRecentInput) cls += shift.value ?? 0;
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
      observers.push(observer);
    }
    const flush = () => { if (lcp) report("LCP", lcp); report("CLS", cls); };
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      observers.forEach((observer) => observer.disconnect());
    };
  }, [pathname]);

  return null;
}
