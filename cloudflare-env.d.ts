declare namespace Cloudflare {
  interface Env {
    LINE_CHANNEL_SECRET?: string;
    DB?: D1Database;
    BUCKET?: R2Bucket;
  }
}
