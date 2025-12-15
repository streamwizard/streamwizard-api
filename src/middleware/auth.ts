// middleware/auth.ts
import { Context, Next } from "hono";
import { compare } from "bcryptjs";
import { supabase } from "../lib/supabase";



// In-memory cache for validated keys (with TTL)
const keyCache = new Map<
  string,
  {
    data: ApiKeyData;
    expiresAt: number;
  }
>();

interface ApiKeyData {
  id: string;
  tenant_id: string;
  website_id: string | null;
  scopes: {
    read: boolean;
    write: boolean;
  };
  rate_limit: number;
  metadata: any;
}

export function apiKeyAuth() {
  return async (c: Context, next: Next) => {
    const authHeader = c.req.header("Authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey) {
      return c.json({ error: "API key required" }, 401);
    }

    // Validate key format
    if (!apiKey.startsWith("cms_live_") && !apiKey.startsWith("cms_test_")) {
      return c.json({ error: "Invalid API key format" }, 401);
    }

    // CRITICAL: Validate exact key length to prevent bcrypt truncation issues
    // Format: cms_live_ (9 chars) + base64url encoded 32 bytes (43 chars) = 52 chars total
    const expectedLength = 52; // Adjust based on your actual key generation
    if (apiKey.length !== expectedLength) {
      return c.json({ error: "Invalid API key" }, 401);
    }

    try {
      // Check cache first (5 minute TTL)
      const cached = keyCache.get(apiKey);
      if (cached && cached.expiresAt > Date.now()) {
        c.set("apiKey", cached.data);
        await next();
        return;
      }

      // Extract prefix to narrow down search
      const prefix = apiKey.split("_").slice(0, 2).join("_") + "_";

      // Fetch all active keys with this prefix (should be small set)
      const { data: keys, error } = await supabase
        .from("api_keys")
        .select("id, tenant_id, website_id, key_hash, scopes, rate_limit, metadata, expires_at")
        .eq("key_prefix", prefix)
        .eq("is_active", true)
        .is("revoked_at", null);

      if (error || !keys || keys.length === 0) {
        return c.json({ error: "Invalid API key" }, 401);
      }

      // Compare hashes (check all matching prefixes)
      let matchedKey: (typeof keys)[0] | null = null;
      for (const key of keys) {
        const isMatch = await compare(apiKey, key.key_hash);
        if (isMatch) {
          matchedKey = key;
          break;
        }
      }

      if (!matchedKey) {
        return c.json({ error: "Invalid API key" }, 401);
      }

      // Check expiration
      if (matchedKey.expires_at && new Date(matchedKey.expires_at) < new Date()) {
        return c.json({ error: "API key expired" }, 401);
      }

      // Update last_used_at (async, don't wait)
      supabase.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("id", matchedKey.id).then();

      const keyData: ApiKeyData = {
        id: matchedKey.id,
        tenant_id: matchedKey.tenant_id,
        website_id: matchedKey.website_id,
        scopes: matchedKey.scopes as any,
        rate_limit: matchedKey.rate_limit,
        metadata: matchedKey.metadata,
      };

      // Cache the validated key
      keyCache.set(apiKey, {
        data: keyData,
        expiresAt: Date.now() + 5 * 60 * 1000, // 5 minutes
      });

      // Set in context for downstream middleware/handlers
      c.set("apiKey", keyData);

      await next();
    } catch (error) {
      console.error("API key validation error:", error);
      return c.json({ error: "Authentication failed" }, 500);
    }
  };
}

// Scope checking middleware
export function requireScope(scope: "read" | "write") {
  return async (c: Context, next: Next) => {
    const keyData = c.get("apiKey") as ApiKeyData;

    if (!keyData.scopes[scope]) {
      return c.json(
        {
          error: `This API key does not have ${scope} permissions`,
        },
        403
      );
    }

    await next();
  };
}

// Website scope validation
export function validateWebsiteAccess() {
  return async (c: Context, next: Next) => {
    const keyData = c.get("apiKey") as ApiKeyData;
    const websiteId = c.req.param("websiteId") || c.req.query("website_id");

    // If key is scoped to a specific website, validate it
    if (keyData.website_id && keyData.website_id !== websiteId) {
      return c.json(
        {
          error: "This API key does not have access to this website",
        },
        403
      );
    }

    await next();
  };
}
