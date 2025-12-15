import { handleStreamOffline } from "@/function/events/stream-offline";
import * as TwitchSchema from "../schema/twitch-schema";
import type { HandlerRegistry } from "./eventHandler";

export const registerTwitchHandlers = (handlers: HandlerRegistry) => {
  // chat message
  handlers.registerTwitchHandler(
    "stream.offline",
    async (event, twitchApi) => {
      handleStreamOffline(event, twitchApi);
    },
    TwitchSchema.StreamOfflineSchema
  );

  // stream online
  handlers.registerTwitchHandler("stream.online", async (event, twitchApi) => {}, TwitchSchema.StreamOnlineSchema);
};
