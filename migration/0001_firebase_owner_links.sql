-- Apply only on the new Cloudflare D1 database after the original data import.
-- Insert links only after verifying both account ownerships; no public claim API.
CREATE TABLE firebase_owner_links (
 firebase_uid TEXT PRIMARY KEY NOT NULL,
 legacy_owner TEXT NOT NULL UNIQUE REFERENCES stores(owner),
 verified_at TEXT NOT NULL
);
