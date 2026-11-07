# Minimal private traffic measurement (not activated)

This change prepares collection only. `TRAFFIC_ENABLED` must equal `1` and the existing `DB` must contain the additive tables before any write succeeds. No new database, credential, account scope, scheduled job, or production activation is included.

## What is measured

- Browser-submitted pageview events grouped by Asia/Taipei day and allowlisted public pathname. A visible route visit is attempted once; transport failures are not retried because an uncertain write could double count.
- No browser ID, fingerprint, IP, user agent, cookies, query string, referrer, account identifier, or event-level visitor record is stored. This cannot report unique browsers, people, sessions, or time on site.
- Normal events and explicit QA probes use separate tables. QA probes report collection health, never public PV. Probes are point-in-time evidence, not proof of uninterrupted daily coverage.
- Counts can include bots which execute JavaScript or forged requests. These are recorded pageviews, not verified human visits. Origin checks prevent normal cross-site browser submissions, not arbitrary non-browser abuse. Existing rate limiting must be reviewed before enabling at scale.
- Historical missing data cannot be reconstructed. Empty rows remain `unknown`, not zero visitors. Days with recorded events also do not prove complete coverage.

## Activation checklist (owner approval and authenticated Cloudflare access required)

1. Check existing Cloudflare Web Analytics first. If it already supplies suitable private reports, prefer it rather than activating a duplicate collector.
2. Verify the production Worker and its existing `DB` binding. Do not create a new database or alter other bindings. Apply `migration/traffic-schema.sql` additively to the approved database; it does not alter store/listing records.
3. Review and release the exact tested commit through the normal authorized process. Preserve fresh news and other pending PR changes. Do not interpret a preview pass as approval to merge.
4. Set the non-secret `TRAFFIC_ENABLED=1` only for the production Worker after approval. Preview hosts are rejected; leave their flag absent.
5. Open a public page with `?analytics_qa=1`. Confirm `/api/traffic` returns 204 and a `traffic_qa_health` row increments while `traffic_daily_pageviews` does not. Follow another page in the same tab and confirm it remains QA. If sessionStorage is blocked, append the QA parameter to every test URL.
6. Open `?analytics_qa=0` to clear the tab flag. This control page is also QA; subsequent normal navigation counts. For a real acceptance PV, use a predetermined path/time and record it as an operator-generated event in the report. Do not silently treat it as organic traffic or delete it to hide testing.
7. Review a private SQL export for the first full day. Do not claim collection works merely because a build or migration passed. Disable the flag if errors occur; do not remove historic rows.

## Private reporting

Read the existing D1 database through the approved dashboard/export path. Do not expose a public statistics endpoint, commit exports or add secrets to this repository.

```sql
SELECT day, path, views FROM traffic_daily_pageviews
WHERE day BETWEEN '2026-11-01' AND '2026-11-07' ORDER BY day, path;
SELECT day, successful_probes, last_success_at FROM traffic_qa_health
WHERE day BETWEEN '2026-11-01' AND '2026-11-07' ORDER BY day;
```

Pass the first result as a plain rows array or Wrangler D1 JSON to:

```sh
node scripts/report-traffic.mjs migration/traffic.local.json 2026-11-01 2026-11-07
```

The JSON keeps `recordedPageviews`, `browserIdentifiers` and `people` distinct; empty input produces `recordedPageviews: null` and `status: unknown`. Add deployment start, known outages and operator-test attribution to the daily narrative. Google clicks/impressions and AI observations remain separate datasets and cannot be filled from this collector.

## Tests

`npm run test:traffic` runs pure policy, handler/mock-D1, QA exclusion and report tests with no production writes. `npm test`, TypeScript, focused ESLint and build should be run against the final source. Real browser/network/D1 activation is a separate acceptance step.

## Daily operating procedure

Use the previous complete **Asia/Taipei** calendar day (00:00–24:00); today's report is partial. Export the two queries above privately for that date, retain the raw export and retrieval time in owner-controlled storage, then run `report-traffic.mjs` with that date as both START and END. For a multi-day range, `daily` includes every date, page-level counts, and explicit null/unknown gaps. Never publish the raw exports in GitHub.

Each daily report must state: date/timezone; source and export time; recorded PV; unknown unique visitors and time on site; QA probe count and last success (separate from PV); activation time/known outages; and the number/path/time of any operator-generated acceptance PV. A successful QA probe is only point-in-time evidence. Do not infer zero from absent rows, full-day coverage from positive counts, or organic growth from operator tests. Malformed or duplicate export rows fail the report rather than silently undercounting or double-counting.

If Cloudflare Analytics is selected instead, first verify the exact property, metric definition, timezone, retention/export availability, sampling and reporting delay. HTTP requests, visits and unique visitors must not be relabeled as pageviews. Record which source is authoritative and leave the other collector disabled.

## Revalidation — 2026-11-07

Merged latest main `e038eb4a038e43d2e06e5c78b4d8630cb0dc31af` into the existing PR branch without rewriting history. All 139 news entries are identical to main. The merge changed only `content/news.json`; no store, product or SEO source data was changed by synchronization. Production D1 was not accessed or modified.

Cloudflare dashboard in this session redirects to login. Existing Analytics suitability, production DB binding/schema, rate limits and live collection remain unverified. No merge to main, production deployment, migration or flag activation has been performed. Obtain authenticated access first; finish the activation checklist and explicit production authorization before collecting. The updated report supports daily gaps, but is not evidence of live traffic.

Current local checks: 32 traffic, 50 news, 9 SEO-link and 20 retailer-price tests passed; publication validation passed against the main SHA above; SQLite additive/idempotent schema test and whitespace checks passed. After dependency installation completed, full npm test (including authentication), TypeScript, focused ESLint for traffic code and production build all passed. Full-repository lint was not rerun; no claim is made that existing lint debt is resolved. Remote preview and production browser-to-D1 acceptance are separate checks.
