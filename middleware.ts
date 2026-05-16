import { NextResponse, type NextRequest } from "next/server";

/**
 * Per-customer rate limit on /api/capture/start. Each capture costs ~1.18 € of
 * Marble credits, so we cap to one submission per customer per 24 h. Very small
 * scale (single admin, ~25 customers), so an in-memory Map is enough — Vercel's
 * lambdas are usually warm long enough to enforce the window for a session.
 *
 * For multi-region or large scale, swap this for an Edge Config / KV-backed
 * implementation. The current one is intentionally simple: it never blocks a
 * legitimate user, only spammy retries.
 */
const RATE_WINDOW_MS = 24 * 60 * 60 * 1000;
const recentSubmissions = new Map<string, number>();

export const config = {
  matcher: ["/api/capture/start"],
};

export function middleware(req: NextRequest) {
  if (req.method !== "POST") return NextResponse.next();
  // We can't read FormData in middleware (would consume the stream); the
  // customerId is duplicated as a custom header by guided-capture for the
  // sole purpose of rate-limiting. Missing header → let it through; the route
  // itself still validates everything.
  const customerId = req.headers.get("x-stammkunden-customer-id");
  if (!customerId) return NextResponse.next();

  const now = Date.now();
  const last = recentSubmissions.get(customerId) ?? 0;
  if (now - last < RATE_WINDOW_MS) {
    const retryAfterSec = Math.ceil((RATE_WINDOW_MS - (now - last)) / 1000);
    return new NextResponse(
      JSON.stringify({ error: "Rate limit: max 1 capture per customer per 24 h." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
        },
      },
    );
  }
  recentSubmissions.set(customerId, now);
  return NextResponse.next();
}
