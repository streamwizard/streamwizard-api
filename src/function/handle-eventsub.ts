import { handlers } from "@/handlers/eventHandler";
import type { EventSubNotificationPayload } from "../types/twitch-eventsub";
import type { subscription_type } from "@/types/twitch";

const handleEventsub = async (payload: EventSubNotificationPayload) => {
  const { subscription, event } = payload;

  await handlers.processTwitchEvent(subscription.type as subscription_type, event);
};

export default handleEventsub;
