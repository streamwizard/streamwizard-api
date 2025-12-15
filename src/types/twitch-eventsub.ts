/**
 * Twitch EventSub Webhook Types
 * 
 * Type definitions for Twitch EventSub webhook payloads
 * @see https://dev.twitch.tv/docs/eventsub/handling-webhook-events/
 */

export interface EventSubSubscription {
  id: string;
  status: string;
  type: string;
  version: string;
  cost: number;
  condition: Record<string, any>;
  transport: {
    method: "webhook";
    callback: string;
  };
  created_at: string;
}

export interface EventSubVerificationPayload {
  challenge: string;
  subscription: EventSubSubscription;
}

export interface EventSubNotificationPayload<T = any> {
  subscription: EventSubSubscription;
  event: T;
}

export interface EventSubRevocationPayload {
  subscription: EventSubSubscription;
}

/**
 * Common EventSub event types
 */
export interface ChannelFollowEvent {
  user_id: string;
  user_login: string;
  user_name: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  followed_at: string;
}

export interface StreamOnlineEvent {
  id: string;
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
  type: string;
  started_at: string;
}

export interface StreamOfflineEvent {
  broadcaster_user_id: string;
  broadcaster_user_login: string;
  broadcaster_user_name: string;
}

/**
 * Union type for all possible EventSub events
 */
export type EventSubEvent =
  | ChannelFollowEvent
  | StreamOnlineEvent
  | StreamOfflineEvent
  | Record<string, any>; // Allow other event types

