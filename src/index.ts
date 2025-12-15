import { Hono } from "hono";
import { securityMiddleware } from "./middleware/security";
import { rawBodyMiddleware } from "./middleware/raw-body";
import { twitchEventSubVerification } from "./middleware/twitch-eventsub";
import { handleTwitchEventSub } from "./routes/twitch-eventsub";

const app = new Hono();

// ============================================
// SECURITY MIDDLEWARE (Applied in order)
// ============================================

app.use("*", securityMiddleware.requestId());

// 2. HTTPS enforcement (production only)
app.use("*", securityMiddleware.enforceHttps());

// 3. Security headers
app.use("*", securityMiddleware.securityHeaders());

// 6. Brute force protection (after auth, before routes)
app.use("*", securityMiddleware.bruteForceProtection());

// 10. Audit logging
// app.use("*", securityMiddleware.auditApiKeyUsage());

// 11. Safe error handler (should be last)
app.use("*", securityMiddleware.safeErrorHandler());

// ============================================
// ROUTES
// ============================================

app.get("/", (c) => {
  return c.json({ message: "StreamWizard API", version: "1.0.0" });
});

// Twitch EventSub Webhook Handler
// This endpoint receives webhook callbacks from Twitch EventSub
// Raw body middleware preserves the body for signature verification
// Verification middleware validates headers and HMAC signature
app.post(
  "/webhooks/twitch/eventsub",
  rawBodyMiddleware(),
  twitchEventSubVerification(),
  handleTwitchEventSub
);



Bun.serve({
  fetch: app.fetch,
  port: 8000,
});

console.log(`Server is running on port ${8000}`);


// 2C6suthvhco5IGojQc5G5MHJgN7xqggeLWueSub6Or1SHO5jJH1R9UqQMAZnorB12W5pJGZfJFQV4aSxSeYzy1ZcTrVMrZaPh5ba