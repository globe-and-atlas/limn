# UI Layout Notes

## 2026-05-24 — Top Bookmark Rail Retired

- The sidebar no longer renders the original top-level `#spill-bookmark-list` block between Analysis Location and the layout selector.
- Bookmark/calibration targets are embedded where they are used: focused triage cards render inline `triage-bookmarks`, and command console keeps `#hud-bookmark-results`.
- `renderSpillBookmarks()` still safely returns when the retired top-level container is absent, so existing index-selection calls do not need to be removed solely for this layout change.
- Verification used browser inspection of `http://localhost:4180/index.html`, `node tests/test_pwi.js`, and `node tests/test_evalscript.js`.
