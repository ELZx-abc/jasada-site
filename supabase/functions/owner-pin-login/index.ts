import { createClient } from "npm:@supabase/supabase-js@2";

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const headersToAllow = "authorization, apikey, content-type, x-client-info";

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  origin: string | null,
): Response {
  const headers = new Headers({
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
    "Vary": "Origin",
  });
  if (origin && allowedOrigins.includes(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Headers", headersToAllow);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function constantTimeEqual(left: string, right: string): boolean {
  const encoder = new TextEncoder();
  const a = encoder.encode(left);
  const b = encoder.encode(right);
  let difference = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    difference |= (a[index] || 0) ^ (b[index] || 0);
  }
  return difference === 0;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) {
    return jsonResponse({ error: "Origin is not allowed" }, 403, null);
  }
  if (request.method === "OPTIONS") {
    if (!origin) return new Response(null, { status: 204 });
    const headers = new Headers({
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": headersToAllow,
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Cache-Control": "no-store",
      "Vary": "Origin",
    });
    return new Response(null, { status: 204, headers });
  }
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  const pinSecret = Deno.env.get("OWNER_PIN") || "";
  const ownerEmail = Deno.env.get("OWNER_EMAIL") || "";
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  let localSupabase = false;
  try {
    localSupabase = ["kong", "localhost", "127.0.0.1", "host.docker.internal"]
      .includes(new URL(supabaseUrl).hostname);
  } catch {
    localSupabase = false;
  }
  const allowShortTestPin =
    localSupabase && Deno.env.get("ALLOW_SHORT_PIN_FOR_LOCAL_TEST") === "true";
  if (
    !(/^[0-9]{10,12}$/.test(pinSecret) || (allowShortTestPin && /^[0-9]{4}$/.test(pinSecret))) ||
    !ownerEmail ||
    !supabaseUrl ||
    !serviceRoleKey ||
    allowedOrigins.length === 0
  ) {
    console.error("Owner PIN function is missing valid server configuration");
    return jsonResponse({ error: "Owner login is not configured" }, 503, origin);
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return jsonResponse({ error: "Invalid request" }, 400, origin);
  }
  const pin = (
    requestBody &&
    typeof requestBody === "object" &&
    "pin" in requestBody &&
    typeof requestBody.pin === "string"
  ) ? requestBody.pin : "";
  if (!(/^[0-9]{10,12}$/.test(pin) || (allowShortTestPin && /^[0-9]{4}$/.test(pin)))) {
    return jsonResponse({ error: "Invalid PIN" }, 400, origin);
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const clientAddress = forwardedFor?.split(",").at(-1)?.trim() || "unknown";
  const ipHash = await sha256(clientAddress);
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const rateLimit = await admin.rpc("owner_pin_check_attempt", { p_ip_hash: ipHash });
  if (rateLimit.error) {
    console.error("Owner PIN rate limit check failed:", rateLimit.error.message);
    return jsonResponse({ error: "Owner login is temporarily unavailable" }, 503, origin);
  }
  if (rateLimit.data !== true) {
    return jsonResponse({ error: "Too many attempts. Try again in 15 minutes." }, 429, origin);
  }

  if (!constantTimeEqual(pin, pinSecret)) {
    return jsonResponse({ error: "Invalid PIN" }, 401, origin);
  }

  const clearResult = await admin.rpc("owner_pin_clear_attempts", { p_ip_hash: ipHash });
  if (clearResult.error) {
    console.error("Owner PIN rate limit cleanup failed:", clearResult.error.message);
    return jsonResponse({ error: "Owner login is temporarily unavailable" }, 503, origin);
  }

  const redirectTo = new URL("/works.html", allowedOrigins[0]).toString();
  const linkResult = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: ownerEmail,
    options: { redirectTo },
  });
  if (linkResult.error || !linkResult.data.properties.hashed_token) {
    console.error("Could not create owner sign-in token:", linkResult.error?.message || "token missing");
    return jsonResponse({ error: "Owner login is temporarily unavailable" }, 503, origin);
  }

  return jsonResponse({ token_hash: linkResult.data.properties.hashed_token }, 200, origin);
});
