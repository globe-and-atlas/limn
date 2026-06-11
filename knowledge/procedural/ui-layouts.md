# UI Layout Notes

## 2026-05-24 — Top Bookmark Rail Retired

- The sidebar no longer renders the original top-level `#spill-bookmark-list` block between Analysis Location and the layout selector.
- Bookmark/calibration targets are embedded where they are used: focused triage cards render inline `triage-bookmarks`, and command console keeps `#hud-bookmark-results`.
- `renderSpillBookmarks()` still safely returns when the retired top-level container is absent, so existing index-selection calls do not need to be removed solely for this layout change.
- Verification used browser inspection of `http://localhost:4180/index.html`, `node tests/test_pwi.js`, and `node tests/test_evalscript.js`.

## 2026-06-08 — Produced Water Guided Flow

- The Produced Water app is desktop-first. Do not spend design effort optimizing the default workflow for mobile unless specifically requested.
- The desktop default should open on a calmer domain-relevant detection lens. Current default is OBEC (`hpwi`) with Lake Boehmer as the selected continuous brine target; ASAI (`pwoi`) remains available as the high-sensitivity salt-crust lens but should not be the first screen.
- Layout selector labels should stay short and outcome-based: Compare, Screen, Investigate.
- Focused triage must keep lens, site, date, and evidence/date-role context synchronized so the first screen reads as a guided investigation.
- The Screen Spill pane should stay flat: one compact workflow summary, one detection-lens row, then verified sites. Avoid nested cards, explanatory panels, and formula/code text in the default map view.
- EHC belongs on the Screen tab as a morphology/context lens. Label it as false-color shape reading, not a standalone proof score, because its RGB composite paints a full tile rather than a transparent scalar detection mask.
- Screen tab lens taxonomy: OBEC/ASAI/LBI are promoted proof-workflow lenses; PWCI is globally validated but often blank on current visual proof targets; BPI/FBC/VSI are support or impact lenses; EHC is morphology context; MVPI is adjacent oilfield-gas context.
- Screen tab demo order should optimize for helpfulness plus visual impact: OBEC → LBI → ASAI → PWCI → EHC → BPI → FBC → VSI → MVPI. Helpfulness, impact, and proof do not perfectly align because stricter proof lenses can be visually blank; use the sequence as a colleague-friendly story from clear signal to strict confirmation to context/aftermath.
