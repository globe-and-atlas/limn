# API Contracts — Sentinel Explorer

## Sentinel Hub WMS

**Endpoint**: `https://sh.dataspace.copernicus.eu/ogc/wms/{INSTANCE_ID}`

Key params sent by `getWMSLayer()`:
- `layers`: `'AGRICULTURE'` (default), `'SENTINEL1-GRD'` (SAR), or `'SENTINEL-2-L2A,LANDSAT-8-L2A'` (HLS)
- `evalscript`: base64-encoded script (URL-encoded first, then base64)
- `time`: `'YYYY-MM-DD'` or range `'YYYY-MM-DD/YYYY-MM-DD'`
- `maxcc`: cloud cover % (20 for normal, 100 for scan/highlight)
- `version`: `'1.3.0'`
- `format`: `'image/png'`
- `transparent`: `true`

**Encoding pattern** (strip comments, trim lines, then encode):
```javascript
btoa(unescape(encodeURIComponent(
    scriptContent
        .replace(/\/\*[\s\S]*?\*\/|([^\:]|^)\/\/.*$/gm, '$1')
        .split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n')
)))
```

**Multi-source fusion (APEX, HPWI)**: Must use a date range `'YYYY-MM-DD/YYYY-MM-DD'` even in single mode. Single-day ORBIT requests return 0 scenes. Use 30-day lookback.

## Sentinel Hub Statistics API

**Endpoint**: `https://sh.dataspace.copernicus.eu/api/v1/statistics`

**Auth**: Bearer token from CDSE OAuth2 (see auth section below).

Used by: 1-year AOI scan (`btn-scan-aoi`), `probeAcquisitions()`, `generateReport()`.

Response structure:
```javascript
data.data[i].interval.from       // ISO date string
data.data[i].outputs.default.bands.B0.stats.mean   // per-band stats
data.data[i].outputs.default.bands.B0.stats.sampleCount  // 0 = no valid pixels (cloudy)
```

**Resolution**: 60m used for scan (speed), 10m used for report charts.

## CDSE OAuth2 Authentication (`auth.js`)

**Token endpoint**: `https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token`
**Routing**: Via `corsproxy.io` (Copernicus Keycloak blocks direct frontend CORS)
**Grant type**: `client_credentials`
**Caching**: Token cached in module-level variables; auto-refreshed 60s before expiry

**Config source**: `window.CONFIG.CDSE_CLIENT_ID` and `window.CONFIG.CDSE_CLIENT_SECRET` (set by `config-v1.js`).

⚠️ Credentials are currently hardcoded in `config-v1.js`. This file must NOT be committed. Add to `.gitignore` and use `config.example.js` as the template.

## Nominatim Geocoding (Location Search)

**Endpoint**: `https://nominatim.openstreetmap.org/search?format=json&limit=1&q={query}`
**Used by**: Location search in sidebar (`handleLocationSearch`)
**Note**: No auth required. Rate-limited; not suitable for batch use.

## RRC Spill Data

**Source**: `./data/rrc_spills.json` (local GeoJSON file)
**Schema**: Standard GeoJSON FeatureCollection with properties: `operator`, `county`, `district`, `date`, `volume_bbl`, `incident_type`, `description`
**Cached**: On first fetch into `state.rrcSpillData`; reload page to refresh.
