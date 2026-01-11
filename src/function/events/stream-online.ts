import { supabase } from "@/lib/supabase";
import type { TwitchApi } from "@/services/twitchApi";
import type { StreamOnlineEvent } from "@/types/twitch-eventsub";

export const handleStreamOnline = async (
  event: StreamOnlineEvent,
  TwitchAPI: TwitchApi
) => {
  //   check if the stream is of type "live"
  if (event.type !== "live") return;

  // get the stream data from the twitch api
  const stream = await TwitchAPI.streams.getStream({ type: "live" });

  if (!stream) {
    console.error("Stream not found", { event });
    return;
  }

  // update the database with the stream online event
  const { error } = await supabase.from("broadcaster_live_status").upsert(
    {
      broadcaster_id: event.broadcaster_user_id,
      broadcaster_name: event.broadcaster_user_name,
      is_live: true,
      stream_started_at: event.started_at,
      title: stream.title,
      stream_id: stream.id,
      category_id: stream.game_id,
      category_name: stream.game_name,
    },
    {
      onConflict: "broadcaster_id",
    }
  );

  if (error) {
    console.error("Error updating broadcaster live status", { error });
    throw error;
  }
};
