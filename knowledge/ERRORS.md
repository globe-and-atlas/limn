# Error Log

## 2026-03-16: Basemap Visibility & Index TypeError

- **Deterministic error**: `Uncaught TypeError: Cannot read properties of undefined (reading 'hpwi')` in `map.js`.
- **Cause**: `getScriptContent` was destructuring `INDICES` from the `state` object, but `INDICES` resides in the `config` object.
- **Symptom**: Map overlays fail to render, and JS execution halts, preventing basemap initialization.
- **Fix**: Update `getScriptContent` to accept `config` or pass `INDICES` correctly.

- **Missing Logic**: Basemap initialization.
- **Cause**: During the Tier 1/Tier 2 refactor, the explicit `L.tileLayer(...).addTo(map)` for the initial basemap was lost or omitted in the new `DOMContentLoaded` flow.
- **Fix**: Add default basemap initialization in `app.js`.
