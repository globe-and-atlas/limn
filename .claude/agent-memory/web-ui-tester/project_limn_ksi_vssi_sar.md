---
name: project_limn_ksi_vssi_sar
description: Verified live-browser behavior of the new KSI/VSSI index pills and the improved SAR Δ screening button on limn's index.html, tested 2026-07-23.
metadata:
  type: project
---

Feature: two new spectral index pill buttons (`data-index="ksi"`, `data-index="vssi"`) added to the "Gate diagnostics · component responses" `<details class="triage-gate-details">` section, plus an improved "New Liquid Surface (SAR Δ)" button (`.sar-action[data-index="s1_sar"]`) in "Investigation actions".

Key gotcha: `data-index="ksi"` / `data-index="vssi"` appear TWICE in the DOM — once as `.triage-tag-pill` (default "Screen" layout, `focused-triage`) and once as `button.index-btn` (the `suite-grid` layout's index grid, "Legacy Surface-Contrast Components" section at index.html ~line 352). A bare `page.$('[data-index="ksi"]')` selector grabs the `.index-btn` copy first (hidden by default since suite-grid pane is `display:none`), causing a Playwright click timeout ("element is not visible"). Always scope the selector: `.triage-tag-pill[data-index="ksi"]` vs `button.index-btn[data-index="ksi"]`.

Layout-switcher label mismatch: the three `.ui-mode-btn` buttons are, in DOM order, `data-layout="suite-grid"` → labeled **"Compare"**, `data-layout="focused-triage"` → labeled **"Screen"** (default active), `data-layout="command-console"` → labeled **"Investigate"**. So "Investigate tab" in casual language does NOT map to `data-layout="suite-grid"` — that selector is actually the "Compare" tab, which is the one that contains the index grid with "Legacy Surface-Contrast Components". If a future task says "click Investigate" meaning `data-layout="suite-grid"`, treat the given data-attribute selector as authoritative over the English label. Similarly the grid's default-active sub-tab (`data-tab="detection"`, class `active` by default) is visibly labeled **"LENSES"**, not "Detection" — the `data-tab` value is the stable identifier, the button text has been re-skinned.

Verified 2026-07-23, all pass:
- `window.state.map` initializes correctly on load (default "Screen"/focused-triage layout).
- Gate diagnostics `<details>` expands via `summary` click; KSI and VSSI pills present, positioned next to SI/HCAI as expected, text "KSI"/"VSSI".
- Clicking KSI pill → `window.state.activeIndex === 'ksi'`, `#workflow-lens` text updates to "KSI". Same for VSSI → `'vssi'` / "VSSI".
- SAR Δ button (`.sar-action[data-index="s1_sar"]`) is disabled by default (COG is default provider). `title` attribute: `Sentinel-1 context requires the guarded Sentinel provider. Arm "Sentinel" in the header to enable.` It also carries a richer `data-tooltip` (custom tooltip, not native `title`) with the full VV-backscatter description: `<strong>New Liquid Surface (SAR Δ)</strong><br>Compares Sentinel-1 VV backscatter between two dates. A new dark/smooth patch can indicate a new standing-liquid surface — an established SAR change-detection method, cloud/weather-independent. It is a screening signal, not a chemical produced-water measurement.` — so this app uses `data-tooltip` (custom JS-driven tooltip) as the primary UX affordance, `title` as a shorter native-browser fallback/gating message. Worth remembering when future tasks ask to "check the tooltip" — check both attributes.
- Checking `#toggle-sentinel-live` in the header enables the SAR button (`disabled` flips false) within <1s.
- Clicking the now-enabled SAR button sets `window.state.mode === 'compare'`, `window.state.compareType === 'diff'`, `window.state.activeIndex === 's1_sar'` — all correct.
- Suite-grid pane (mislabeled "Investigate" in casual task language, actually the "Compare" `.ui-mode-btn`) contains `button.index-btn[data-index="ksi"]` and `[data-index="vssi"]` under "Legacy Surface-Contrast Components" (h3 at index.html ~352); both clickable, both correctly update `window.state.activeIndex`.
- Zero `pageerror` events across the entire session (KSI/VSSI/SAR clicks, Sentinel toggle, layout switch).
- Console DOES show real HTTP 400/403 `Auth Error` messages from `getCDSEToken`/`probeAcquisitions` in `src/report.js` — these are Copernicus/Sentinel Hub OAuth calls failing because this static local server has no real backend credentials. Confirmed via `grep` that `probeAcquisitions()` fires unconditionally on page init (`src/app.js:1283`) and after almost any index/date change (`setTimeout(() => probeAcquisitions(), 1600)` at several call sites) — so these errors are pre-existing infra noise, NOT caused specifically by the new KSI/VSSI/SAR wiring, and match the same "expected backend absence" category as the documented COG-tile-404 noise. Filter both `[COG]`/404 tile noise AND `getCDSEToken`/`Auth Error`/400/403 report.js noise as expected when doing future console-error triage on this app's local static server.

Related: [[project_limn_coord_marker]], [[reference_playwright_via_npx_cache]].
