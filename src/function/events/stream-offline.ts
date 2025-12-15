import { supabase } from "@/lib/supabase";
import type { TwitchApi } from "@/services/twitchApi";
import type { StreamOfflineEvent } from "@/types/twitch-eventsub";
import { syncTwitch } from "@/function/sync-twitch";

export const handleStreamOffline = async (event: StreamOfflineEvent, TwitchAPI: TwitchApi) => {
  const { data: user, error: userError } = await supabase
    .from("integrations_twitch")
    .select("user_id")
    .eq("twitch_user_id", event.broadcaster_user_id)
    .single();

  if (userError || !user) throw new Error("User not found");

  // check the user preferences if they want to sync twitch clips when the stream goes offline
  const { data: preferences, error: preferencesError } = await supabase
    .from("user_preferences")
    .select("sync_clips_on_end")
    .eq("user_id", user.user_id)
    .single();

  if (preferencesError || !preferences) throw new Error("Preferences not found");

  if (!preferences.sync_clips_on_end) return;

  // Use the reusable syncTwitch function
  await syncTwitch(event.broadcaster_user_id, TwitchAPI);
};
