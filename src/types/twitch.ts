export interface TwitchEventSubMessage {
  metadata: {
    message_id: string;
    message_type: string;
    message_timestamp: string;
    subscription_type?: string;
    subscription_version?: string;
  };
  payload: {
    session?: {
      id: string;
      status: string;
      connected_at: string;
      keepalive_timeout_seconds: number;
      reconnect_url?: string;
    };
    subscription?: {
      id: string;
      status: string;
      type: string;
      version: string;
      condition: Record<string, any>;
      transport: {
        method: string;
        session_id?: string;
        callback?: string;
      };
      created_at: string;
    };
    event?: Record<string, any>;
  };
}

export interface TwitchWebhookEvent {
  subscription: {
    id: string;
    type: string;
    version: string;
    status: string;
    cost: number;
    condition: Record<string, any>;
    transport: {
      method: string;
      callback: string;
    };
    created_at: string;
  };
  event?: Record<string, any>;
  challenge?: string;
}


export interface EventSubscription {
  type: string;
  version: string;
  condition: Record<string, any>;
}


export type subscription_type =
  // Automod Topics
  | "automod.message.hold"
  | "automod.message.update"
  | "automod.settings.update"
  | "automod.terms.update"

  // Channel Topics
  | "channel.update"
  | "channel.follow"
  | "channel.ad_break.begin"
  | "channel.chat.clear"
  | "channel.chat.clear_user_messages"
  | "channel.chat.message"
  | "channel.chat.message_delete"
  | "channel.chat.notification"
  | "channel.chat_settings.update"
  | "channel.chat.user_message_hold"
  | "channel.chat.user_message_update"
  | "channel.shared_chat.begin"
  | "channel.shared_chat.update"
  | "channel.shared_chat.end"
  | "channel.subscribe"
  | "channel.subscription.end"
  | "channel.subscription.gift"
  | "channel.subscription.message"
  | "channel.cheer"
  | "channel.raid"
  | "channel.ban"
  | "channel.unban"
  | "channel.unban_request.create"
  | "channel.unban_request.resolve"
  | "channel.moderate"
  | "channel.moderator.add"
  | "channel.moderator.remove"
  
  // Guest Star Topics (BETA)
  | "channel.guest_star_session.begin"
  | "channel.guest_star_session.end"
  | "channel.guest_star_guest.update"
  | "channel.guest_star_settings.update"

  // Channel Points Topics
  | "channel.channel_points_automatic_reward_redemption.add"
  | "channel.channel_points_custom_reward.add"
  | "channel.channel_points_custom_reward.update"
  | "channel.channel_points_custom_reward.remove"
  | "channel.channel_points_custom_reward_redemption.add"
  | "channel.channel_points_custom_reward_redemption.update"

  // Poll/Prediction Topics
  | "channel.poll.begin"
  | "channel.poll.progress"
  | "channel.poll.end"
  | "channel.prediction.begin"
  | "channel.prediction.progress"
  | "channel.prediction.lock"
  | "channel.prediction.end"

  // Moderation & Safety Topics
  | "channel.suspicious_user.message"
  | "channel.suspicious_user.update"
  | "channel.vip.add"
  | "channel.vip.remove"
  | "channel.warning.acknowledge"
  | "channel.warning.send"

  // Charity Topics
  | "channel.charity_campaign.donate"
  | "channel.charity_campaign.start"
  | "channel.charity_campaign.progress"
  | "channel.charity_campaign.stop"

  // Infrastructure Topics
  | "conduit.shard.disabled"

  // Drops & Extensions
  | "drop.entitlement.grant"
  | "extension.bits_transaction.create"

  // Authorization & User Topics
  | "user.authorization.grant"
  | "user.authorization.revoke"
  | "user.update"
  | "user.whisper.message"

  // Stream Status Topics
  | "stream.online"
  | "stream.offline"

  // Hype Train Topics
  | "channel.hype_train.begin"
  | "channel.hype_train.progress"
  | "channel.hype_train.end"

  // Shield Mode Topics
  | "channel.shield_mode.begin"
  | "channel.shield_mode.end"

  // Shoutout Topics
  | "channel.shoutout.create"
  | "channel.shoutout.receive";


export type EventSubNotification = {
  metadata: {
    message_id: string;
    message_type: string;
    message_timestamp: string;
    subscription_type: string;
    subscription_version: string;
  };
  payload: {
    session: {
      id: string;
      status: string;
      keepalive_timeout_seconds: number;
      reconnect_url: string | null;
      connected_at: string;
    };

    subscription: {
      id: string;
      status: string;
      type: subscription_type
      version: string;
      cost: number;
      condition: {
        // The condition object structure depends on the specific subscription type
        // For example, if subscribing to broadcaster's new follower, it might contain broadcaster's ID
        [key: string]: any; // You might need to define a more specific type based on your subscription types
      };
      transport: {
        method: string;
        session_id: string;
        conduit_id: string
      };
      created_at: string;
    };
    event: {
      // The event object structure depends on the specific subscription type
      // For example, if subscribing to broadcaster's new follower, it might contain follower's information
      [key: string]: any; // You might need to define a more specific type based on your subscription types
    };
  };
};