export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}

export function text(value: unknown, maximum = 300) {
  return typeof value === "string" ? value.trim().slice(0, maximum) : "";
}

export function clientIp(request: Request) {
  return text(request.headers.get("cf-connecting-ip") || request.headers.get("x-forwarded-for")?.split(",")[0] || "local", 80);
}

function fingerprintSecret() {
  const secret = process.env.IP_HASH_SECRET || process.env.ADMIN_SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") throw new Error("IP fingerprint secret is not configured");
  return "local-development-ip-fingerprint-secret";
}

export async function fingerprint(value: string, purpose = "request") {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(fingerprintSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(`${purpose}:${value}`)));
  return Array.from(digest.slice(0, 16), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function isBot(request: Request) {
  const agent = request.headers.get("user-agent") ?? "";
  return !agent || /bot|crawler|spider|slurp|headless|preview|facebookexternalhit|monitoring/i.test(agent);
}

export function analyticsIdentifier(value: unknown, prefix: "vis" | "ses") {
  const candidate = text(value, 80);
  return new RegExp(`^${prefix}_[a-f0-9]{32}$`, "i").test(candidate) ? candidate.toLowerCase() : "";
}

const trackedStaticPaths = new Set(["/", "/company", "/privacy"]);

export function trackablePath(value: unknown) {
  const candidate = text(value, 300);
  if (!candidate.startsWith("/") || /[\u0000-\u001f]/.test(candidate)) return "";
  try {
    const parsed = new URL(candidate, "https://analytics.invalid");
    if (parsed.origin !== "https://analytics.invalid") return "";
    const pathname = parsed.pathname.replace(/\/$/, "") || "/";
    if (!trackedStaticPaths.has(pathname) && !pathname.startsWith("/products/")) return "";
    return `${pathname}${parsed.search}`.slice(0, 300);
  } catch {
    return "";
  }
}

export function publicError(error: unknown, fallback: string) {
  if (error instanceof HttpError) return { status: error.status, message: error.message };
  return { status: 503, message: fallback };
}

export function logError(event: string, error: unknown, context: Record<string, unknown> = {}) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(JSON.stringify({ level: "error", event, message, ...context, at: new Date().toISOString() }));
}

export async function readJson(request: Request, maximumBytes = 32_000) {
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) throw new HttpError(413, "请求内容过大");
  if (!request.body) throw new HttpError(400, "请求内容不能为空");

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new HttpError(413, "请求内容过大");
    }
    chunks.push(value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    const parsed = JSON.parse(new TextDecoder().decode(bytes)) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("JSON object required");
    return parsed as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "请求内容不是有效的 JSON 对象");
  }
}
