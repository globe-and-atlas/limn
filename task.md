# Task: Sentinel Explorer Novelty Claims Review

## Objective

Review the help page and index library so only truly original Sentinel Explorer composites carry Bally/original-work attribution.

## Context

- Target page: `http://localhost:4180/help.html`
- Primary files: `help.html`, `SENTINEL_SCIENCE_GUIDE.md`, `README.md`, `src/indices.js`
- Directive reviewed: `directives/pwi_spec.md`
- Execution scripts: none intended for research edits

## Acceptance Criteria

- [x] `knowledge/SESSION.md` records the active goal before implementation work begins.
- [x] Every `✧` index in `help.html` is listed in the review notes.
- [x] Every index described as `Original composite` in `src/indices.js` is listed in the review notes.
- [x] Every listed acronym is checked for public prior usage.
- [x] Every listed display name is checked for public prior usage.
- [x] Every listed formula is checked when formula text is present.
- [x] Each index with public prior usage has exclusive authorship wording removed.
- [x] Each index retaining exclusive authorship wording has no identified public prior usage.
- [x] `http://localhost:4180/help.html` is reviewed after edits.
- [x] `node tests/test.js` runs before completion. Attempted; blocked by missing `puppeteer-core`.

## Steps

- [x] Enumerate claimed novel/original indices.
- [x] Research public prior usage.
- [x] Edit claims and symbols.
- [x] Review the local help page.
- [x] Run tests. Attempted; blocked by pre-existing harness issues.

## Progress Log

### 2026-05-07 23:05 — Governance baseline
- Project was brought into the workspace audit baseline.
- Next: replace this maintenance objective with the next real project milestone.

### 2026-05-20 22:53 — Novelty claims review started
- Loaded project instructions and knowledge session state.
- Added binary acceptance criteria for acronym, display-name, and formula prior-use checks.

### 2026-05-20 23:13 — Novelty claims review completed
- Removed `✧`/`✧✧`, `Bally Index`, and `Original composite by Daniel Bally` wording from public docs and runtime metadata.
- Added `knowledge/domain/novelty-review.md` with the enumerated review outcomes and source checks.
- Browser check of `http://localhost:4180/help.html` passed for the removed terms.
- Tests attempted but blocked by missing `puppeteer-core`, missing `node-fetch`, and stale `app.js` path in the existing harness.
