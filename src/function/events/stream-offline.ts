import { env } from "@/lib/env";
import { supabase } from "@/lib/supabase";
import type { TwitchApi } from "@/services/twitchApi";
import type { Database } from "@/types/supabase";
import type { StreamOfflineEvent } from "@/types/twitch-eventsub";

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

  // check if the last sync was more than an hour ago
  const { data: lastSync } = await supabase.from("twitch_clip_syncs").select("last_sync, sync_status").eq("user_id", user.user_id).single();

  const now = new Date();
  if (lastSync && lastSync.last_sync) {
    const lastSyncDate = new Date(lastSync.last_sync);
    const diffTime = Math.abs(now.getTime() - lastSyncDate.getTime());
    const diffHours = diffTime / (1000 * 60 * 60);

    if (diffHours < 1 && lastSync.sync_status === "completed" && env.NODE_ENV === "production" ) {
      console.log("last sync was less than an hour ago, skipping sync");
      return;
    }
  }

  // create a new sync or update existing one
  if (lastSync) {
    const { error: syncError } = await supabase
      .from("twitch_clip_syncs")
      .update({
        last_sync: now.toISOString(),
        sync_status: "syncing",
      })
      .eq("user_id", user.user_id);

    if (syncError) {
      console.error("Failed to start sync:", syncError);
      return;
    }
  } else {
    const { error: syncError } = await supabase.from("twitch_clip_syncs").insert({
      user_id: user.user_id,
      last_sync: now.toISOString(),
      sync_status: "syncing",
      clip_count: 0,
    });

    if (syncError) {
      console.error("Failed to start sync:", syncError);
      return;
    }
  }

  try {
    // start the sync
    const totalClips = await syncTwitchClips(user.user_id, TwitchAPI);

    // mark as completed
    await supabase.from("twitch_clip_syncs").update({ sync_status: "completed", clip_count: totalClips }).eq("user_id", user.user_id);
  } catch (error) {
    console.error("Sync failed:", error);
    // mark as failed
    await supabase.from("twitch_clip_syncs").update({ sync_status: "failed" }).eq("user_id", user.user_id);
  }
};

export async function syncTwitchClips(user_id: string, TwitchAPI: TwitchApi) {
  let hasMoreClips = true;
  let cursor: string | undefined;
  let totalClips = 0;
  let iterationCount = 0;
  const MAX_ITERATIONS = 1000; // Safety limit: max 100,000 clips (1000 * 100)
  const seenCursors = new Set<string | undefined>(); // Track cursors to detect infinite loops

  const { data: integration, error } = await supabase
    .from("integrations_twitch")
    .select("access_token, twitch_user_id, user_id")
    .eq("user_id", user_id)
    .single();

  if (error || !integration || !integration.access_token || !integration.twitch_user_id) {
    console.error(error);
    throw new Error("Twitch integration not found for user");
  }

  console.log("Starting sync for user:", integration.user_id);
  // loop until there are no more clips
  while (hasMoreClips) {
    // Safety check: prevent infinite loops
    if (iterationCount >= MAX_ITERATIONS) {
      console.warn(`Sync stopped at ${MAX_ITERATIONS} iterations (${totalClips} clips synced). Possible infinite loop detected.`);
      break;
    }

    // Safety check: detect duplicate cursors (infinite loop protection)
    if (seenCursors.has(cursor)) {
      console.warn(`Duplicate cursor detected: ${cursor}. Stopping sync to prevent infinite loop.`);
      break;
    }
    seenCursors.add(cursor);

    iterationCount++;

    try {
      const clipsResponse = await fetchAndFormatTwitchClips(integration.twitch_user_id, TwitchAPI, cursor);

      if (!clipsResponse) {
        break;
      }

      const { clips, pagination } = clipsResponse;

      if (!clips.length) {
        break;
      }

      // format the clips for the database
      const formattedClips = formatClipsForDB(clips, integration.user_id);

      // upsert the clips into the database
      const { error: upsertError } = await supabase.from("clips").upsert(formattedClips, {
        onConflict: "twitch_clip_id",
        ignoreDuplicates: false,
      });

      if (upsertError) {
        throw new Error(`Failed to insert clips: ${upsertError.message}`);
      }

      // increment the total number of clips
      totalClips += clips.length;
      cursor = pagination.cursor;
      hasMoreClips = !!cursor;

      // Clear the formatted clips array reference to help GC
      // (formattedClips will be garbage collected after upsert completes)
    } catch (error) {
      console.error(`Error during clip sync iteration ${iterationCount}:`, error);
      throw error;
    }
  }

  // Clear the Set to free memory
  seenCursors.clear();

  console.log("Sync completed for user:", integration.user_id);

  // return the total number of clips
  return totalClips;
}

export async function fetchAndFormatTwitchClips(broadcasterId: string, TwitchAPI: TwitchApi, cursor?: string) {
  // total number of clips to fetch
  const batchSize = 100;

  // fetch the clips
  const res = await TwitchAPI.clips.getClips({
    broadcaster_id: broadcasterId,
    first: batchSize,
    after: cursor,
  });

  // return the clips and pagination
  return {
    clips: res.data,
    pagination: res.pagination,
  };
}

export type TwitchClip = {
  id: string;
  url: string;
  embed_url: string;
  broadcaster_id: string;
  broadcaster_name: string;
  creator_id: string;
  creator_name: string;
  video_id: string;
  game_id: string;
  language: string;
  title: string;
  view_count: number;
  created_at: string;
  thumbnail_url: string;
  duration: number;
  vod_offset: number | null;
  is_featured: boolean;
};

// format the clips for the database
export function formatClipsForDB(clips: TwitchClip[], userId: string): Database["public"]["Tables"]["clips"]["Insert"][] {
  return clips.map((clip) => ({
    twitch_clip_id: clip.id,
    url: clip.url,
    embed_url: clip.embed_url,
    broadcaster_id: clip.broadcaster_id,
    broadcaster_name: clip.broadcaster_name,
    creator_id: clip.creator_id,
    creator_name: clip.creator_name,
    video_id: clip.video_id || null,
    game_id: clip.game_id,
    language: clip.language,
    title: clip.title,
    view_count: clip.view_count,
    created_at_twitch: clip.created_at,
    thumbnail_url: clip.thumbnail_url,
    duration: clip.duration,
    vod_offset: clip.vod_offset,
    is_featured: clip.is_featured,
    user_id: userId,
  }));
}
