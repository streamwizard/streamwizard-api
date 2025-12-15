import type { EventSubNotification, subscription_type } from "../types/twitch";
// import type { IncommingMessageType } from "../types/websocket";
import { z } from "zod";
import { registerTwitchHandlers } from "./twitch";
import { TwitchApi } from "@/services/twitchApi";

export class HandlerRegistry {
  private twitchHandlers = new Map<string, (data: unknown, twitchApi: TwitchApi) => Promise<void>>();
  private clientHandlers = new Map<string, (data: unknown) => Promise<unknown>>();

  constructor() {
    registerTwitchHandlers(this);
  }

  // Register Twitch EventSub handler
  registerTwitchHandler<T = unknown>(eventType: subscription_type, handler: (data: T, twitchApi: TwitchApi) => Promise<void>, schema?: z.ZodType<T>) {
    this.twitchHandlers.set(eventType, async (data: unknown, twitchApi: TwitchApi) => {
      try {
        const parsedData = schema ? schema.parse(data) : data;
        await handler(parsedData as T, twitchApi);
      } catch (error) {
        console.log("Error in twitch handler");
        // console.log(error);
      }
    });
  }

  // Get client handler for WebSocket server
  getHandler(type: string): ((data: unknown) => Promise<unknown>) | undefined {
    return this.clientHandlers.get(type);
  }

  // Process Twitch EventSub events
  async processTwitchEvent(eventType: subscription_type, data: EventSubNotification): Promise<void> {
    const broadcasterId = extractReceivingBroadcasterId(data);

    if (!broadcasterId) {
      console.log("No broadcaster id found in event");
      throw new Error("No broadcaster id found in event");
    }

    const twitchApi = new TwitchApi(broadcasterId);

    const handler = this.twitchHandlers.get(eventType);

    if (!handler) {
      console.log("No handler found for event type:", eventType);
      return;
    }

    try {
      await handler(data, twitchApi);
    } catch (error) {
      console.log("error in twitch event handler");
      throw error;
    }
  }
}

export const handlers = new HandlerRegistry();

/**
 * Return the broadcaster id that RECEIVED the event (the channel the event is about),
 * or null if none of the common fields are present.
 *
 * Pass `event` = data.payload.event from the webhook body.
 */
function extractReceivingBroadcasterId(event: Record<string, any>): string | null {
  if (!event) return null;

  // 1) direct "to_" field (multi-channel events like raid)
  if (typeof event.to_broadcaster_user_id === "string" && event.to_broadcaster_user_id) {
    return event.to_broadcaster_user_id;
  }

  // 2) plain broadcaster_user_id (most channel-scoped events)
  if (typeof event.broadcaster_user_id === "string" && event.broadcaster_user_id) {
    return event.broadcaster_user_id;
  }

  // 3) some events put the payload inside event.data (array) — check first item
  if (Array.isArray(event.data) && event.data.length > 0) {
    const d0 = event.data[0];
    if (d0 && typeof d0.to_broadcaster_user_id === "string" && d0.to_broadcaster_user_id) {
      return d0.to_broadcaster_user_id;
    }
    if (d0 && typeof d0.broadcaster_user_id === "string" && d0.broadcaster_user_id) {
      return d0.broadcaster_user_id;
    }
  }

  // 4) fallback: some events include only from_ fields (rare) — we don't treat "from" as receiver.
  // If you *also* want to treat `from_broadcaster_user_id` as receiver in some contexts,
  // pass your own channel id and compare; otherwise return null.
  return null;
}
