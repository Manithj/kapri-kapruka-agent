// Lightweight, dependency-free client for the public Kapruka MCP server.
// Speaks the MCP "Streamable HTTP" transport (JSON-RPC over POST, SSE responses)
// and manages the session id + initialized handshake transparently.

const MCP_URL = process.env.KAPRUKA_MCP_URL || "https://mcp.kapruka.com/mcp";

let sessionId: string | null = null;
let rpcId = 1;
let initLock: Promise<string> | null = null;

const COMMON_HEADERS = {
  "Content-Type": "application/json",
  Accept: "application/json, text/event-stream",
};

async function initSession(): Promise<string> {
  if (initLock) return initLock;
  initLock = (async () => {
    const res = await fetch(MCP_URL, {
      method: "POST",
      headers: COMMON_HEADERS,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: rpcId++,
        method: "initialize",
        params: {
          protocolVersion: "2024-11-05",
          capabilities: {},
          clientInfo: { name: "kapri", version: "1.0" },
        },
      }),
    });
    const sid = res.headers.get("mcp-session-id");
    await res.text(); // drain
    if (!sid) throw new Error("Kapruka MCP did not return a session id");
    // Required "initialized" notification.
    await fetch(MCP_URL, {
      method: "POST",
      headers: { ...COMMON_HEADERS, "mcp-session-id": sid },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    sessionId = sid;
    return sid;
  })();
  try {
    return await initLock;
  } finally {
    initLock = null;
  }
}

function parseSSE(text: string): any {
  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith("data:")) {
      const payload = line.slice(5).trim();
      if (payload) return JSON.parse(payload);
    }
  }
  // Some responses may be plain JSON.
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return JSON.parse(trimmed);
  throw new Error("Unexpected MCP response: " + text.slice(0, 200));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const jitter = (base: number) => base + Math.floor(Math.random() * 500);

export class RateLimitError extends Error {}

async function rpcCall(name: string, args: Record<string, any>, attempt = 0): Promise<string> {
  if (!sessionId) await initSession();
  let res: Response;
  try {
    res = await fetch(MCP_URL, {
      method: "POST",
      headers: { ...COMMON_HEADERS, "mcp-session-id": sessionId! },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: rpcId++,
        method: "tools/call",
        params: { name, arguments: { params: args } },
      }),
    });
  } catch (e) {
    // Network failure — re-init the session and retry with a little backoff.
    if (attempt < 2) {
      sessionId = null;
      await sleep(jitter(400 * (attempt + 1)));
      return rpcCall(name, args, attempt + 1);
    }
    throw e;
  }

  if ((res.status === 404 || res.status === 400) && attempt < 2) {
    // Session likely expired — re-init once.
    sessionId = null;
    return rpcCall(name, args, attempt + 1);
  }

  if (res.status === 429) {
    if (attempt < 1) {
      await sleep(jitter(700));
      return rpcCall(name, args, attempt + 1);
    }
    throw new RateLimitError("Kapruka is briefly rate-limiting requests. Please try again in a moment.");
  }

  if (res.status >= 500 && attempt < 2) {
    await sleep(jitter(400 * (attempt + 1)));
    return rpcCall(name, args, attempt + 1);
  }

  const text = await res.text();
  const data = parseSSE(text);
  if (data.error) {
    if (/rate.?limit|too many requests/i.test(data.error.message || "")) {
      throw new RateLimitError("Kapruka is briefly rate-limiting requests. Please try again in a moment.");
    }
    throw new Error(data.error.message || "Kapruka MCP error");
  }
  const content = data.result?.content?.[0]?.text;
  if (content == null) throw new Error("Empty result from Kapruka MCP tool " + name);
  return content as string;
}

// ---- tiny TTL cache for read-only tools ----
type CacheEntry = { value: any; expires: number };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 5 * 60 * 1000;

function cacheGet(key: string) {
  const hit = cache.get(key);
  if (hit && hit.expires > Date.now()) return hit.value;
  return undefined; // keep expired entries around for stale-on-error fallback
}
function cacheGetStale(key: string) {
  return cache.get(key)?.value;
}
function cacheSet(key: string, value: any) {
  cache.set(key, { value, expires: Date.now() + TTL_MS });
}

export type ToolResult<T = any> =
  | { ok: true; data: T }
  | { ok: false; message: string };

// Calls a tool requesting JSON, then parses. Plain-text replies (errors,
// "No products found") come back as { ok: false, message }.
async function callJson<T = any>(
  name: string,
  args: Record<string, any>,
  opts: { cache?: boolean } = {}
): Promise<ToolResult<T>> {
  const key = opts.cache ? name + ":" + JSON.stringify(args) : "";
  if (key) {
    const cached = cacheGet(key);
    if (cached !== undefined) return cached;
  }

  let raw: string;
  try {
    raw = await rpcCall(name, { ...args, response_format: "json" });
  } catch (e: any) {
    // Stale-on-error: if we have a previously cached value for this call, serve it
    // rather than failing outright (the agent can note results may be slightly old).
    if (key) {
      const stale = cacheGetStale(key);
      if (stale !== undefined) return stale;
    }
    return { ok: false, message: e?.message || "Kapruka request failed" };
  }

  const trimmed = raw.trim();
  let result: ToolResult<T>;
  if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
    try {
      result = { ok: true, data: JSON.parse(trimmed) as T };
    } catch {
      result = { ok: false, message: raw };
    }
  } else {
    result = { ok: false, message: raw };
  }

  if (key && result.ok) cacheSet(key, result);
  return result;
}

// ---- image helper: request a larger, crisper image from the Kapruka CDN ----
export function upsizeImage(url: string | null | undefined, width = 600): string | null {
  if (!url) return null;
  // The CDN encodes transform params like ".../width=330,quality=93,f=auto/<orig>"
  return url.replace(/width=\d+/, `width=${width}`);
}

// ---- typed wrappers ----
export const kapruka = {
  searchProducts: (args: {
    q: string;
    category?: string | null;
    limit?: number;
    cursor?: string | null;
    currency?: string;
    min_price?: number | null;
    max_price?: number | null;
    in_stock_only?: boolean;
    sort?: string;
  }) => callJson("kapruka_search_products", args, { cache: true }),

  getProduct: (args: { product_id: string; currency?: string }) =>
    callJson("kapruka_get_product", args, { cache: true }),

  listCategories: (args: { depth?: number } = {}) =>
    callJson("kapruka_list_categories", args, { cache: true }),

  listDeliveryCities: (args: { query?: string; limit?: number }) =>
    callJson("kapruka_list_delivery_cities", args, { cache: true }),

  checkDelivery: (args: { city: string; delivery_date?: string; product_id?: string }) =>
    callJson("kapruka_check_delivery", args),

  createOrder: (args: Record<string, any>) => callJson("kapruka_create_order", args),

  trackOrder: (args: { order_number: string }) => callJson("kapruka_track_order", args),
};
