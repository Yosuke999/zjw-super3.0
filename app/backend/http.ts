export function text(value: unknown, maximum = 300) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function clientIp(request: Request) {
  return text(request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "local", 80);
}

export async function fingerprint(value: string) {
  const hash = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  return Array.from(hash.slice(0, 12), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isBot(request: Request) {
  const agent = request.headers.get("user-agent") ?? "";
  return !agent || /bot|crawler|spider|slurp|headless|preview|facebookexternalhit|monitoring/i.test(agent);
}

export async function readJson(request: Request, maximumBytes = 32_000) {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > maximumBytes) throw new Error("请求内容过大");
  const raw = await request.text();
  if (raw.length > maximumBytes) throw new Error("请求内容过大");
  return JSON.parse(raw) as Record<string, unknown>;
}
