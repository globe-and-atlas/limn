# Fix Atlas Lead QC Findings

Follow-up to the 2026-07-23 G&A Lead QC report (`directives/` sibling work; report published as an artifact, not committed to the repo). Fixes the issues found while auditing the 6 G&A article leads (BH-DFSI, LFMPI, PETI, EPDI, EC-ACI, TDR-ASI) for scientific soundness, visual quality, and editorial readiness.

## Validation Contract

- [x] `ecaci` has a `FORMULA_V2_OVERRIDES` entry in `src/atlas-indices.js`, matching the honesty pattern of its 5 sibling leads (hedged physics with an explicit "does not..." disclaimer sentence, corrected `platform` dropping the unused ECOSTRESS claim, `benefit` that doesn't claim to map heat-island intensity).
- [x] EC-ACI's in-app info panel (`#info-platform`, `#info-physics`, `#info-benefit`) reflects the corrected text after the override — verified live in a browser, not just in source.
- [x] EC-ACI's generated LinkedIn Ground Truth observation no longer states "urban heat islands form" as fact — verified live.
- [x] `linkedinGroundTruthForIndex()`'s `observation` string is grammatically correct for all 6 leads when checked live in a browser (no "to make [full sentence]" splice).
- [x] The fixed template still reads naturally for at least 2 non-lead entries spot-checked (regression check against the other ~85 catalog entries the template also drives).
- [x] EPDI and EC-ACI either get a replacement bookmark date (found via a bounded sweep, still event-relevant) that avoids the black no-data rectangle, or — if no better date exists within a reasonable window — the finding is documented as accepted with a reason, not silently dropped. **EC-ACI: fixed, moved to 2021-07-05.** **EPDI: investigated, kept at 2023-03-17 — every pre-breach candidate broke the event narrative and both tested post-breach alternatives still showed a gap; documented in-code and here.**
- [x] `node --check src/atlas-indices.js && node --check src/atlas-app.js` pass.
- [x] `node tests/test_atlas_formula_v2.mjs`, `node tests/test_atlas_capability_families.mjs`, and `node tests/test_atlas_sentinel_toggle.mjs` pass after the change.
- [x] Browser smoke: no console errors across all 6 leads after the fix (matches `knowledge/procedural/atlas_viewer_validation.md` check 5's bar).

## Learnings

### 2026-07-23 (verifier follow-up)

Independent verifier flagged two legitimate gaps in the first pass, both fixed:

- The base (pre-override) `ecaci` object's `justification` field still said "peak heat period of July 20, 2021" after the bookmark date moved to 2021-07-05 — a stale, dead field (never read by `atlas-app.js`, confirmed by the verifier's own grep) but confusing to a future source reader. Rewrote it to state the actual current date and point at the override for the honest framing.
- The claim that 2021-07-05 renders without the no-data gap had no in-repo evidence — only prose in this directive and a screenshot in my own scratchpad, outside the repo. Re-ran the project's own `execution/qc_atlas_bookmarks.py` (`--sweep-days 0`, full 91-entry catalog) to refresh `.tmp/atlas_bookmark_qc.json`/`.md`, the project's standard verification artifact. Confirms EC-ACI now scores `visible=95.07% high=83.79%` at the new date (matches the earlier ad hoc fetch almost exactly: 95.066/83.793 vs my scratchpad's 95%/84%) and EPDI is unchanged at `visible=4.68% high=3.02%` — both persisted in the standard, gitignored `.tmp/` location this project's other tooling already expects.
- The verifier separately noted the repo's *own* automated QC (both the stale 2026-07-21 baseline and my first scoped run) rated the original 2021-07-20 bookmark "strong" — its own strongest-tested-date. That's not a contradiction: `qc_index()` only sweeps alternate dates when the verdict is already `blank`/`weak`/`moderate` (see `should_sweep` in `execution/qc_atlas_bookmarks.py`), so a single-date "strong" pass never compares against neighbors. The anomaly only surfaces by deliberately forcing a multi-date comparison, which the standard audit doesn't do for already-passing entries. Real archived screenshots the verifier found at `.tmp/atlas_article_captures/20260720-v2-audit/ecaci/` (predating this session) independently confirm the visible no-data block at the original date.

### 2026-07-23

- EC-ACI's real acquisition timestamp for the new 2021-07-05 bookmark date could not be verified from this environment: `corsproxy.io` (the CDSE OAuth CORS workaround, see `knowledge/domain/api-contracts.md`) returned an HTTP 403 challenge page to a server-side Node fetch, even with real credentials present in `config-v1.js` — it appears to specifically block non-browser requests. Rather than invent a plausible-looking timestamp, `acquisitionTimestamp`/`acquisitionCloudCover` were set to `null`, which the app already renders as an honest "Resolve the exact acquisition timestamp from CDSE STAC when capturing an article image" message (`src/atlas-app.js`, `selectIndex()`) — this fallback already existed and needed no new code.
- The WMS bookmark QC script's numeric score is not a proxy for "no compositional artifact." EC-ACI's original date scored roughly half of every neighboring candidate (35 vs 60-85), which in hindsight was itself a signal something was wrong with that specific date/window — worth checking outlier-low scores among otherwise-strong dates as a cheap first pass before assuming a bookmark is fine because it clears the pass/fail bar.

## Explicitly out of scope for this pass

- TDR-ASI and LFMPI's "needs an editor's crop" notes are presentation/editorial guidance for whoever builds the actual post (Atlas already has Capture mode's split/crop tools for this) — not a code defect, no fix here.
- The other ~85 non-lead catalog entries are not being re-audited for scientific soundness in this pass (out of the original QC's agreed scope); only the LinkedIn template fix touches them, and only incidentally.
