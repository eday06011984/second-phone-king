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
