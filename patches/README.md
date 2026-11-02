# Vinext streamed-icon identity patch

`vinext@1.0.0-beta.5.patch` changes only the internal streamed-icon key generator.
The original `${pathname}:${metadataHash}` string appears in a `data-*` attribute
and embedded RSC. On `/news?page=3`, it exactly reproduced `/news:d9wvo1`, the
malformed URL reported by Google Search Console with that page as referrer.
This identifies the emitted token, **not proof of Google's extraction mechanism**.

The replacement is `vxi-` plus the framework's existing deterministic 64-bit hash
of the JSON tuple `[pathname, metadataHtml]`. It keeps route/metadata identity
without publishing a URL-shaped path. The `:order` suffix and the client-side
head reconciliation code are unchanged. This is not a security hash.

No public links, canonicals, news, measurements, redirects or crawl directives
are changed. Existing malformed URLs remain 404; this does not promise immediate
removal of historical Search Console entries.

## Reproduce

Use the pinned pnpm 11.25.0 and frozen `pnpm-lock.yaml`. The exact-version patch
is registered in `pnpm-workspace.yaml`; normal pnpm installation applies it and
fails if it cannot be applied. Do not edit installed `node_modules` manually.

```sh
pnpm install --frozen-lockfile
npm run test:metadata
npm run build
npm run test:metadata:build
```

Unit tests execute the installed patched generator and unchanged client
reconciliation against a minimal DOM double. The build regression starts only
a local Worker and inspects normal and mobile-Googlebot HTML/RSC, pagination,
canonicals, favicon, and malformed-URL 404 behavior. Neither is a real-browser
hydration/navigation test. Full browser acceptance remains required where a
permitted browser is available; the original investigation's local Chromium
launch was blocked by the sandbox (`socket() Operation not permitted`).

Before upgrading Vinext, review its streamed-icon implementation, regenerate or
remove this exact-version patch as appropriate, and rerun both regressions plus
browser forward/back navigation and head/favicon deduplication checks.
