import { TwitchChatClient } from "./twitch/chat";
import { TwitchEventSubClient } from "./twitch/eventsub";
import { TwitchFollowersClient } from "./twitch/followers";
import { TwitchSubscriptionsClient } from "./twitch/subscriptions";
import { TwitchMarkersClient } from "./twitch/markers";
import { TwitchClipsClient } from "./twitch/clips";

export class TwitchApi {
  public chat: TwitchChatClient;	
  public eventsub: TwitchEventSubClient;
  public followers: TwitchFollowersClient;
  public subscriptions: TwitchSubscriptionsClient;
  public markers: TwitchMarkersClient;
  public clips: TwitchClipsClient;

  
  constructor(broadcaster_id: string | null = null) {
    this.chat = new TwitchChatClient(broadcaster_id);
    this.eventsub = new TwitchEventSubClient(broadcaster_id);
    this.followers = new TwitchFollowersClient(broadcaster_id);
    this.subscriptions = new TwitchSubscriptionsClient(broadcaster_id);
    this.markers = new TwitchMarkersClient(broadcaster_id);
    this.clips = new TwitchClipsClient(broadcaster_id);
  }
}
