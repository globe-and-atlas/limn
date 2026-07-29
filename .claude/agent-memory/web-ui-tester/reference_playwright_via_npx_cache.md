---
name: reference_playwright_via_npx_cache
description: How to run real-browser (Chromium) QA via Playwright when the target project has no playwright devDependency, using the machine's npx cache instead of installing anything.
metadata:
  type: reference
---

This machine already has Playwright's Chromium binaries cached at `~/Library/Caches/ms-playwright/` (from prior `npx playwright` usage elsewhere), and the `playwright` npm package itself is cached under `~/.npm/_npx/<hash>/node_modules/playwright` from previous `npx -y playwright --version` invocations.

To drive a real browser against a project with no local playwright install (e.g. limn, which is a static-file-served vanilla JS app with no npm playwright dependency):

1. Confirm the cache exists: `ls ~/Library/Caches/ms-playwright` and `find ~/.npm/_npx -maxdepth 4 -iname playwright`.
2. Write a plain Node script (not a `playwright test` file — no test runner needed) that does `const { chromium } = require('playwright'); ...`.
3. Run it with `NODE_PATH` pointed at one of the cached npx module dirs, e.g.:
   ```bash
   export NODE_PATH="/Users/danielbally/.npm/_npx/e41f203b7505f1fb/node_modules"
   node qa_test.js
   ```
   This lets Node resolve `require('playwright')` without any local `node_modules` or `package.json` in the target project or the scratchpad dir.
4. Write scripts to the session scratchpad dir, not the target repo — keeps the target project untouched.
5. For console/error capture: attach `page.on('console', ...)` (filter `msg.type() === 'error'`) and `page.on('pageerror', ...)` before `page.goto`.
6. Screenshots (`page.screenshot({ path })`) are the most reliable way to confirm visual claims (marker color, tooltip text, invalid-input border styling) — don't rely solely on DOM assertions for "does this look right" questions. Cropping+upscaling a screenshot region with PIL (`python3 -c "from PIL import Image; ..."`) helps verify subtle styling like a reddish invalid-border on a dark theme that's hard to see at full-page thumbnail size.
7. `page.waitForTimeout` after `flyTo`/animated map transitions (~1.5-2s) is necessary before asserting marker DOM state — Leaflet's `flyTo` animates asynchronously.

Caveat: `NODE_PATH` cache dirs are keyed by a content hash and could theoretically be pruned by npm's cache GC. If `require('playwright')` fails, re-run `npx -y playwright --version` once to repopulate, then retry.

Related: the workspace lists an active `browser-qa` skill (`/Users/danielbally/Git/.agent/skills/browser-qa/SKILL.md`) describing this same workflow at a high level (start dev server, open browser, check console, verify primary flow, check responsive layout, verify visual surfaces), but in at least one subagent invocation the `Skill` tool returned "Unknown skill: browser-qa" even though the skill file exists on disk and is listed as active in CLAUDE.md — the skill wasn't in the current subagent's available-skills listing. If that happens again, fall back to this manual Playwright-via-npx-cache approach and follow `references/qa-checklist.md` in that skill directory manually.
