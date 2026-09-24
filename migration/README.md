# Cloudflare migration checkpoint — 2026-09-24

This branch is preparation only. Production Sites remains unchanged. Firebase Google authentication is implemented in this branch; deployment and real-account acceptance testing remain pending.

Source base: c81a9de58554ab591d4726693ca9acf21464ea15, Site version 7.
Target resources are recorded in cloudflare-target.json from owner screenshots. This is not a complete Wrangler deployment config.

## Data

Read-only live inventory: 4 stores, 35 listings (29 active, 6 sold), 208 unique referenced image keys. Private snapshot and generated SQL are ignored by git, outside public assets. No photos downloaded yet; no target database writes performed.

Run `node migration/prepare-data.mjs` with a fresh complete snapshot.local.json. Output is for an EMPTY D1 database only and fails rather than replacing existing tables. Preserve store IDs, listing IDs, owner IDs, statuses, image keys and timestamps. Refresh the snapshot at final cutover; current live changes may continue.

## Required before deployment/cutover

1. Obtain an authorized deployment connection to the owner's Cloudflare account (OAuth login or connected repository); never request passwords/API token values in chat.
2. Replace ALL Sites identity-header use with verified Firebase identity/session handling. Include management API, seller UI, hidden listing pages, image access and logout. Verify signature, issuer, audience, expiry and auth_time server-side; reject forged headers. Use secure HttpOnly cookies, CSRF checks and server-side authorization.
3. Link existing store ownership only after proof of both old and new identity or verified administrative recovery. Never match unverified email or expose claim tokens publicly.
4. Obtain exact Firebase web configuration; Google provider is enabled by screenshot. Add the workers.dev hostname to authorized domains. LINE/Apple require their own provider setup and cannot be marked ready yet.
5. Download and checksum all 208 referenced photos, including all non-public records using authorized access when present. Import with original keys/content types, verify target counts and hashes. Do not use a proxy back to the old hostname as a completed migration.
6. Produce a Worker build; merge the target bindings into its generated config, preserving asset/module declarations. Test login, logout, access isolation, six-photo upload, editing, sold/hidden/delete behavior and existing store linkage on staging.
7. Keep staging noindex; preserve production canonical URLs, news content, metadata and sitemap. Compare data again before cutover. Keep rollback available.
8. Switch DNS only after tests pass. Update the daily news automation publishing target at cutover so it does not keep deploying to Sites.

## Implementation checkpoint

Firebase configuration received from owner and integrated. Removed Sites header authentication and the mock-auth build plugin. All protected consumers use server-verified Firebase RS256 ID tokens, strict project/issuer/expiry/auth_time/provider checks, secure HttpOnly cookies and same-origin login/logout checks. Existing owners require an administrator-verified entry in firebase_owner_links; there is no automatic email-based claim. Apply 0001_firebase_owner_links.sql after importing the empty target DB.

Google popup login and logout UI implemented. Sessions expire with the ID token (at most one hour); disabled-user/revocation lookup is not implemented. Real Google sign-in, popup behavior on mobile and existing-owner migration must be tested on staging before cutover. LINE, Apple and phone providers are not implemented.

Verified: TypeScript check, production Worker build and token/origin policy tests pass. Local Worker returns seller 200 with Google login, news 200 and staging noindex headers; cross-origin session creation returns 403. Sitemap currently returns 500 against the empty local DB: repeat after data import. No successful end-to-end login or full-site acceptance is claimed.

Current blocker: CLI has no authenticated Cloudflare deployment connection; cloud browser is stopped at Cloudflare security verification. Photo transfer and target data import are still pending. Original production and DNS remain unchanged.
