-- Additive migration only. Apply only to the existing production DB after approval.
CREATE TABLE IF NOT EXISTS traffic_daily_pageviews (
  day TEXT NOT NULL,
  path TEXT NOT NULL,
  views INTEGER NOT NULL CHECK(views > 0),
  PRIMARY KEY (day, path)
);
CREATE TABLE IF NOT EXISTS traffic_qa_health (
  day TEXT PRIMARY KEY,
  successful_probes INTEGER NOT NULL CHECK(successful_probes > 0),
  last_success_at TEXT NOT NULL
);
