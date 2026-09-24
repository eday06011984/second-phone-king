-- Additive only: does not change stores, listings, or existing owner links.
CREATE TABLE IF NOT EXISTS line_identities (subject TEXT PRIMARY KEY, owner TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS line_sessions (token_hash TEXT PRIMARY KEY, subject TEXT NOT NULL REFERENCES line_identities(subject), expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS line_oauth_attempts (state TEXT PRIMARY KEY, browser_hash TEXT NOT NULL, verifier TEXT NOT NULL, nonce TEXT NOT NULL, origin TEXT NOT NULL, link_owner TEXT, expires INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS line_sessions_expiry ON line_sessions(expires);
CREATE INDEX IF NOT EXISTS line_attempts_expiry ON line_oauth_attempts(expires);
