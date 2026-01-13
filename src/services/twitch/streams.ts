import { TwitchApiBaseClient } from "./base-client";

export interface Stream {
  id: string;
  user_id: string;
  user_login: string;
  user_name: string;
  game_id: string;
  game_name: string;
  type: string;
  title: string;
  tags: string[];
  viewer_count: number;
  started_at: string;
  language: string;
  thumbnail_url: string;
  tag_ids: string[];
  is_mature: boolean;
}

export interface GetStreamResponse {
  data: Stream[];
  pagination: {
    cursor?: string;
  };
}

export interface GetStreamOptions {
  type?: "live" | "all";
}

export class TwitchStreamsClient extends TwitchApiBaseClient {
  constructor(broadcaster_id: string | null = null) {
    super(broadcaster_id);
  }

  async getStream({ type = "live" }: GetStreamOptions): Promise<Stream> {

    const response = await this.clientApi().get(`/streams`, {
      params: {
        user_id: this.broadcaster_id,
        type: type,
      },
    });
    return response.data.data[0];
  }
}
