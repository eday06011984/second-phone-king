declare namespace Cloudflare {
  interface Env {
    TRAFFIC_ENABLED?: string;
    LINE_CHANNEL_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
