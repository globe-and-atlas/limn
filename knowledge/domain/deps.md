# Dependency Notes

Last updated: 2026-06-09

## Sentinel-2 COG Tile Renderer

- Added `execution/render_cog_tile.py` using the existing local Python geospatial stack: `rasterio`, `pystac_client`, `numpy`, `Pillow`, and `pyproj`.
- No new Python packages were installed for the first COG milestone.
- The renderer reads public Sentinel-2 L2A COG band windows through STAC and GDAL `/vsicurl` behavior; keep `GDAL_DISABLE_READDIR_ON_OPEN=EMPTY_DIR`, `CPL_VSIL_CURL_ALLOWED_EXTENSIONS=.tif,.TIF,.tiff,.TIFF`, and `AWS_NO_SIGN_REQUEST=YES` available in the server environment.
- Rendered COG PNG tiles are cached under `.tmp/cog_tile_cache/`; do not commit this cache.
- STAC item selection metadata is cached under `.tmp/cog_item_cache/`; do not commit this cache.
- COG tile cache keys include a renderer-version string so presentation or formula changes do not reuse stale PNGs.
- The local tile server can prewarm demo COG tiles on startup through `/api/cog/prewarm`; use `COG_PREWARM_ON_START=0` to disable this during pure backend testing.

## Google Earth Engine Tile Server

- Added `@google/earthengine` for server-side Earth Engine authentication, Sentinel-2 mosaic construction, map ID creation, and tile URL generation.
- Added `dotenv` so `server/gee_tile_server.mjs` can load `.env` locally without committing secrets.
- Do not put service-account JSON, private keys, or access tokens in tracked files. Use `.env` or an absolute `GEE_SERVICE_ACCOUNT_JSON_PATH` outside the repo.
- npm currently reports 4 moderate vulnerabilities from the Earth Engine dependency tree. Do not run broad `npm audit fix --force` without review because it may introduce breaking dependency churn.

## Node Browser Test Harness

- Added `package.json` and `package-lock.json` so the project has explicit local Node test dependencies.
- Added `puppeteer-core` as a dev dependency for `tests/test.js`.
- `tests/test.js` launches the local macOS Chrome app and starts an in-process static server on a random localhost port.
- The test server stubs `config-v1.js` as `window.CONFIG = window.CONFIG || {};` so browser smoke tests do not read secret runtime config.
- Keep `package.json` without `"type": "module"` unless the CommonJS test files are migrated; the app uses browser ES modules, while the Node tests currently use CommonJS.
