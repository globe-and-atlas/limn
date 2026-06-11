# Directive: find_hotspots

**Goal:** Use a Karpathy Loop (baseline score → tweak → rerun → measure → iterate) to
discover more *illustrative* bookmark hotspots — the (lat, lng, zoom, date) where each
renderable Atlas index shows its clearest, most recognizable signal.

**Owner note:** The bookmark/QC layer is Codex's. This directive is written to be picked up
by Codex from a cold start. Coordinate with any running loop (see "Single-writer rule").

---

## 1. Why this exists / what decision it supports

Many Atlas bookmarks render a weak, speckly, or blank signal. A human picked the current
locations by hand. The signal-strength question is *quantitative and searchable*, so it is a
textbook Karpathy Loop: there is already a scorer, so we can hill-climb toward stronger,
more legible hotspots instead of guessing.

The output is an updated set of `bookmark` (and where useful `maxcc` / window) values in the
index definitions, each justified by a score that beats the prior bookmark.

---

## 2. The key insight — a scorer already exists

`execution/qc_atlas_bookmarks.py` already:
- renders a bookmark against the **public** Atlas WMS endpoint (no secrets, no `config-v1.js`),
- computes pixel metrics (`visible %`, `high-signal %`, `p99 luma`) → a `best score`,
- classifies each as **strong / moderate / weak / blank / error**,
- supports a 1-D **date sweep** (`--sweep-days`, `--step-days`, `--sweep-targets`),
- writes `.tmp/atlas_bookmark_qc.json` and `.tmp/atlas_bookmark_qc.md`.

That is the loop's `evaluate.py`. The loop generalizes its date sweep into a multi-dimensional
search.

---

## 3. The loop

1. **Baseline** — score the current bookmark.
2. **Tweak** — generate candidates by perturbing `lat × lng × zoom × date` (optionally `maxcc`,
   window days). Use a coarse grid first, then refine around the best cell.
3. **Rerun** — render each candidate via WMS, score with the QC metrics.
4. **Measure** — keep the best candidate that beats the baseline verdict/score.
5. **Iterate** — hill-climb until the index reaches `strong`, or the per-index budget is spent.

Hokusai "100 Views" framing: same index, many vantage points on the same signal.

---

## 4. The single most important design rule: the metric is the loop's god

**"Illustrative" ≠ "most bright pixels."** A naive maximizer of `visible %` or `high-signal %`
will walk straight into known failure modes:

- **The opaque-everywhere trap.** An evalscript that paints every pixel (no transparency gate)
  scores ~100% "visible" while showing *nothing* — this was the real KCDSI bug (a `cb()` ramp
  with no `if (val < t) return [0,0,0,0]` gate painted all land). A score maximizer would *love*
  it. Reject candidates whose signal fills the whole frame uniformly.
- **Speckle over structure.** Scattered bright specks can out-score a clean, coherent feature.

So the scoring function must reward **spatial coherence and contrast** — a legible
plume / bloom / city / burn scar against a quiet background — not raw signal fraction. The
existing QC was already tightened to reject "tiny bright specks"; keep that bias and consider
adding a connected-component / edge-contrast term.

**Robust design = hybrid.** Let the loop *shortlist* the top-N high-scoring candidates, then have
a human (or a vision model in the loop) pick the most illustrative one. The loop does the search;
judgment makes the final call. Do not auto-commit a new bookmark on score alone.

---

## 5. Validation Contract (binary, pass/fail — define "done")

- [ ] The loop runs read-only against the public WMS endpoint; it never reads `config-v1.js`,
      `.env`, or any secret.
- [ ] For each target index, the loop emits ≥1 candidate with its score, verdict, and a saved
      thumbnail.
- [ ] A candidate is only promoted to a bookmark if its verdict ≥ the prior verdict **and** a
      reviewer (human or vision model) confirms it is more illustrative.
- [ ] No promoted candidate fills the whole frame uniformly (opaque-everywhere guard).
- [ ] Every changed `bookmark` keeps a valid `date` (post-Sentinel-2 for S2 indices; event-window
      for S1/S5P) and a `zoom` appropriate to the sensor resolution (S5P coarse → low zoom).
- [ ] `node --check` passes for any edited `src/*.js`; catalog still has 91 novel + the demos.
- [ ] Results are logged to a single `results.tsv` (see single-writer rule).

---

## 6. Inputs, tools, outputs (3-layer architecture)

**Layer 1 — this directive.**
**Layer 2 — orchestration (the agent):** decide targets, set budget, run the execution script,
review shortlisted thumbnails, promote winners, update bookmarks.
**Layer 3 — execution (deterministic Python in `execution/`):**
- Reuse `qc_atlas_bookmarks.py` as the scorer (import or shell out).
- Add a candidate generator + iteration driver (e.g. `execution/hotspot_loop.py`): grid/anneal
  over `lat,lng,zoom,date`, call the scorer, write `results.tsv` + thumbnails to `.tmp/`.

**Outputs:** `.tmp/hotspot_loop/results.tsv`, per-candidate PNG thumbnails, and a ranked
shortlist `.md` per target index. Bookmark edits are applied only after review.

---

## 7. Where to point it first

- **The flagged weak/blank bookmarks:** BH-DFSI, DWCI, GMCPI, MDSPI, SPEI, SCSPI, TRSI, CCRBI,
  IERPI, SPSRI, FEDGI, SLSDI.
- **The new live S1/S5P indices** (find more dramatic events): FGDCI, SACI, plus the
  demonstrators S1-OWF, S1-URB, S1-VVS, S5P-NO2, S5P-SO2 — e.g. a bigger fire for SACI, a
  stronger NO₂ episode, another eruption for SO₂.

---

## 8. Catalog facts the loop must know (cold-start context)

- **Three index sources** now exist:
  - `src/atlas-indices.js` — the 91 novel indices (Codex's QC already reads this).
  - `src/atlas-sar-demos.js` — live Sentinel-1 demonstrators (VV/VH).
  - `src/atlas-s5p-demos.js` — live Sentinel-5P demonstrators (NO₂, SO₂).
  If the loop scores demos, extend the scorer to read all three.
- **Per-index render config** that affects scoring:
  - `wmsLayer`: S2 indices use the default optical layer; S1 indices use `SENTINEL1-GRD`
    (bands `VV`,`VH`); S5P indices use dedicated layers — `SENTINEL-5P-NO` (NO₂),
    `S5P-AER` (`AER_AI_340_380`), `SP5-SO2` (SO₂).
  - `minZoom`: per-index. S2 = 10, S1 = 6, S5P = 3. The scorer must request at/above the
    index's `minZoom` or it gets a blank tile (Leaflet hides the layer below `minZoom`).
  - One WMS layer = one collection — **no S2+S1 fusion in a single request.** Fusion indices
    can't be scored live; skip them (they stay sensor-limited).
- **Coverage tiers** (only some are scorable live):
  - `live` (canRender) — scorable.
  - `pending` (S2-capable, no proof target) — scorable; these are prime loop targets.
  - `sensor` (needs EMIT/PACE/TROPOMI/etc.) — **not** scorable on S2; leave alone.
- **Time windows:** the viewer renders a lookback window ending at the bookmark date (default 15
  days). Score with a comparable window so loop scores match what users see. S5P is daily-swath
  and gappy — use wider windows to fill orbit gaps.

---

## 9. Constraints (read before running)

- **Copernicus credits.** Every candidate render burns processing units. A wide
  `lat×lng×date×zoom` grid is expensive. Bound it: coarse grid → refine around the winner; cap
  candidates per index; prefer date sweeps (cheap, high-yield) before spatial sweeps.
- **Single-writer rule.** Only one loop process writes `results.tsv` at a time. Check for a
  running loop before starting (avoid corrupting the shared file). The bookmark/QC layer is
  Codex's — do not run a competing loop in parallel.
- **It cannot manufacture signal.** Genuinely faint phenomena (thin kelp, wispy plumes) may have
  no `strong` hotspot anywhere. The loop finds the best available, not a miracle — accept
  `moderate` where the physics caps it, and say so in the justification.
- **Transparency first.** Before trusting a low score, confirm the index's evalscript has a
  transparency gate. An opaque-everywhere index produces misleading scores (see §4).

---

## 10. Edge cases

- Index renders a proxy (e.g. FGDCI instantaneous VV−VH; SACI UV aerosol index) — score the
  proxy, and keep the `justification` honest about it.
- Bookmark date predates the sensor (S2 ≥ 2015, S5P ≥ 2018, EMIT ≥ 2022) — reject.
- All-cloud / no-coverage window — raise `maxcc` or widen the window before declaring blank.
- Demoted `pending` index turns out to score `strong` somewhere — promote it back to `canRender`
  and add the required `source` / `sourceUrl` / `justification` fields.

---

## 11. Suggested first run

```bash
# (illustrative — build execution/hotspot_loop.py to wrap the existing scorer)
python3 execution/qc_atlas_bookmarks.py --size 512 --sweep-days 60 --step-days 15 \
  --sweep-targets needs-work        # cheap date-only baseline pass first
# then: spatial refine around the best date for the still-weak targets, log to results.tsv,
# save thumbnails, review the shortlist, promote winners.
```

Start cheap (date-only), review what the metric rewards vs. what *looks* illustrative, then
tune the scoring function before spending credits on a full spatial search.
