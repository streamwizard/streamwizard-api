import { z } from "zod";

export const envSchema = z.object({
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),
  TWITCH_CLIENT_ID: z.string(),
  TWITCH_CLIENT_SECRET: z.string(),
  TWITCH_WEBHOOK_SECRET: z.string(),

  NODE_ENV: z.enum(['development', 'production']),
});

export const env = envSchema.parse(process.env);