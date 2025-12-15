import { env } from "@/lib/env";
import type { RefreshTwitchTokenResponse } from "@/types/twitch-api";
import { getChannelAccessToken, getChannelRefreshToken, getTwitchAppToken, updateChannelAccessToken } from "@/utils/supabase";
import type { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import axios from "axios";

export abstract class TwitchApiBaseClient {
  private readonly MAX_RETRIES = 2;
  protected broadcaster_id: string | null = null;

  constructor(broadcaster_id: string | null = null) {
    this.broadcaster_id = broadcaster_id;
  }

  protected clientApi(): AxiosInstance {
    const api = axios.create({
      baseURL: "https://api.twitch.tv/helix",
    });
    this.clientInterceptor(api);
    return api;
  }

  // This interceptor is used to intercept the request and add the token to the request
  protected clientInterceptor(api: AxiosInstance): void {
    api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        if (!this.broadcaster_id) {
          throw new Error("Broadcaster ID is required in Twitch client interceptor");
        }

        // Maybe we should redis cache for caching the token?

        const token = await getChannelAccessToken(this.broadcaster_id);

        config.headers["Client-Id"] = env.TWITCH_CLIENT_ID;
        config.headers["Content-Type"] = "application/json";
        config.headers["Authorization"] = `Bearer ${token}`;

        return config;
      },
      (error) => Promise.reject(error)
    );

    // This interceptor is used to intercept the response and check if the token is expired and refresh it if it is
    api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const config = error.config as InternalAxiosRequestConfig & { __retryCount?: number };
        if (!config) return Promise.reject(error);

        const statusCode = error.response?.status;
        const currentRetryCount = config.__retryCount || 0;

        if (statusCode === 401 && currentRetryCount < this.MAX_RETRIES) {
          config.__retryCount = currentRetryCount + 1;
          try {
            if (!this.broadcaster_id) {
              throw new Error("Broadcaster ID is required in Twitch client interceptor");
            }
            console.log("🔄 Token expired, attempting to refresh for broadcaster:", this.broadcaster_id);
            const newToken = await this.refreshTokenAndRetry(this.broadcaster_id);
            if (!newToken) {
              return Promise.reject(error);
            }
            config.headers = config.headers || {};
            config.headers["Authorization"] = `Bearer ${newToken}`;
            console.log("✅ Token refreshed, retrying request");
            return api(config);
          } catch (refreshError) {
            console.error("❌ Token refresh failed:", refreshError);
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  protected appApi(): AxiosInstance {
    const api = axios.create({
      baseURL: "https://api.twitch.tv/helix",
    });
    this.appInterceptor(api);
    return api;
  }

  protected appInterceptor(api: AxiosInstance): void {
    api.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        const token = await getTwitchAppToken();

        config.headers["Client-Id"] = env.TWITCH_CLIENT_ID;
        config.headers["Content-Type"] = "application/json";
        config.headers["Authorization"] = `Bearer ${token}`;
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );
  }

  private async refreshTokenAndRetry(broadcaster_id: string): Promise<string | null> {
    try {
      // get the refresh token from the database
      const refreshToken = await getChannelRefreshToken(broadcaster_id);
      if (!refreshToken) {
        throw new Error("No refresh token found for channel");
      }
      // refresh the token
      const response = await axios.post<RefreshTwitchTokenResponse>("https://id.twitch.tv/oauth2/token", null, {
        params: {
          client_id: env.TWITCH_CLIENT_ID,
          client_secret: env.TWITCH_CLIENT_SECRET,
          grant_type: "refresh_token",
          refresh_token: refreshToken,
        },
      });
      // update the token in the database
      await updateChannelAccessToken(response.data, broadcaster_id);
      return response.data.access_token;
    } catch (error) {
      console.error("❌ Token refresh failed:", error);
      throw error;
    }
  }
}
