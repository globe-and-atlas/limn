# Shareable Sentinel-Only Produced Water App

Last Updated: 2026-06-10

## Launch

Use either:

```text
share.html
index.html?share=sentinel-only
```

`share.html` is a small handoff page. It redirects into the normal Produced Water UI with the `share=sentinel-only` query parameter so the app logic remains centralized in `src/app.js`.

## Runtime Contract

- Share mode forces `IMAGE_PROVIDER` and `IMAGERY_PROVIDER` to `sentinelhub`.
- Share mode forces `ALLOW_SENTINEL_FALLBACK` to `true`.
- Share mode keeps `SENTINEL_CREDIT_GUARD` enabled.
- Share mode keeps `SENTINEL_LIVE_TILES` armed.
- Share mode locks the Sentinel toolbar switch on.
- Share mode still honors `SENTINEL_MIN_ZOOM`.
- Share mode uses the existing rate-limited Sentinel WMS loader in `src/map.js`.
- Share mode must not request `/api/cog/tiles` or `/api/gee/tiles` for analysis overlays.

## Verification

Run:

```bash
node tests/test_share_sentinel_only.mjs
node tests/test_gee_provider.mjs
```

The share smoke test serves a fake local WMS endpoint and intentionally configures the default provider as GEE. Passing means the share route overrode that config, requested WMS, and made zero GEE/COG tile requests.
