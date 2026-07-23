# Filter Sentinel Dates

## Validation Contract

- [x] In Limn (`index.html`), every `<option>` remaining in `#date-single`, `#date-t1`, and `#date-t2` after a successful catalog probe corresponds to a date with a real Sentinel-1 or Sentinel-2 scene (per CDSE STAC catalog) within the probed AOI/date range.
- [x] Every remaining valid-date `<option>` in those three selects has its label suffixed with ` [S]`.
- [x] No `<option>` for a date with zero S1/S2 scenes (e.g. Landsat-only, or genuinely no coverage) remains selectable in those three selects after a successful probe resolves.
- [x] `date-single`'s `<option value>` still equals the correct index into the global `window.ALL_DATES` array after filtering (not an index into the filtered subset) — verified by cross-checking a filtered option's value against `window.ALL_DATES[value].value`.
- [x] Selecting a spill bookmark whose "closest date" falls on a filtered-out (invalid) date snaps `date-single` to the nearest date that IS present in the filtered list, not to a missing option value.
- [x] Before the first catalog probe resolves (or if the probe fails/auth is unavailable), the selectors still show a usable, non-empty date list (fail open, not fail empty).
- [x] In Limn Atlas (`atlas.html`), the date control is a grouped `<select>` (not a native `<input type="date">`), matching the Limn pattern.
- [x] Limn Atlas's date `<select>` is populated from a real CDSE STAC catalog query scoped to the current AOI, with the same S1/S2-only validity rule and ` [S]` tagging as Limn.
- [x] Catalog queries for a given AOI/date-range/collection combination are cached client-side so repeat views of the same location do not re-issue identical STAC requests within the session.
- [x] Catalog queries page through all STAC results for the full probed date range (not silently truncated at one 100-item page).
- [x] `node tests/test.js`, `node tests/test_fetch.js`, and `node tests/test_pwi.js` all exit 0 after the change.

## Scope Decisions (locked in with user 2026-07-23)

- "Sentinel collections" = Sentinel-1 GRD + Sentinel-2 L2A only. Landsat does NOT count toward date validity (dropped from the probe entirely).
- Invalid dates are **removed** from the selector, not shown-disabled.
- Limn Atlas's native `<input type="date">` is replaced with a custom dropdown so it can support tagging/filtering like Limn.
- Full pagination + client-side caching is in scope (no bounded recent-window shortcut).

## Known constraints this touches

- `date-single` stores an **index into `window.ALL_DATES`** (full 2020→today synthetic daily array), while `date-t1`/`date-t2` store the date string directly (see `knowledge/domain/architecture.md` "Date Selector Inconsistency"). Filtering must preserve this contract — `populateGroupedDates` must compute `idx` against `window.ALL_DATES`, not against whatever filtered subset it's rendering.
- `setClosestDateValue()` (`src/app.js`) sets `dateSingleEl.value = closestIdx.toString()` without checking whether that option still exists post-filter. Must add a snap-to-nearest-valid-index fallback.
- `probeAcquisitions()` (`src/report.js`) currently queries only `sentinel-2-l2a` + `landsat-ot-l1`, caps at 100 results, and explicitly never hides options (comment: "Hiding them would truncate the selector when catalog limit < full date range") — this comment's premise is fixed by adding pagination.

## Learnings

### 2026-07-23

- `app.js`'s `probeAcquisitions()` wrapper had `if (isGeeProviderActive()) return;`, which silently disabled catalog probing (and therefore all date tagging, old or new) under every provider except `sentinelhub` — i.e. under the actual default (`cog`). This directive's feature would have been dead on arrival without noticing and removing this gate; see `knowledge/DECISIONS.md` for the full reasoning.
- Sentinel Hub Catalog (STAC) API pagination was implemented against an assumed cursor shape (top-level `next` token echoed back in the next POST body, with a `links[rel=next].body.next` fallback). This was never exercised against a live CDSE token in this session (no CDSE credentials configured in the working environment) — flagged as an open item in `knowledge/DECISIONS.md` and `architecture.md`.
- `date-single`'s "value is an index into `ALL_DATES`" contract is easy to accidentally break when filtering: the original code computed the index via `dates.indexOf(dateObj)` against whatever array was being iterated. Once that array becomes a filtered subset, the index must instead be computed against the global `ALL_DATES`/`window.ALL_DATES`, or every downstream consumer of `date-single`'s value silently breaks.
- Two other call sites besides `setClosestDateValue()` directly set `date-single`'s `.value` to a computed index (FIS trend-chart click handler) — both needed the same snap-to-nearest-valid-date treatment, not just the one the user's request obviously implied (spill bookmarks).
