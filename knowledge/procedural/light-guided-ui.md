> Superseded 2026-10-29: user rejected this implementation; dark UI restored in b496902. Notes below describe the removed experiment.

# Light Guided Explorer — 2026-10-29

The default Limn interface is an ivory docked Place / Imagery / View panel. src/light-ui.js adapts existing site, date, mode, and lens controllers; src/light-ui.css scopes presentation under body.limn-light. Advanced tools exposes the original controls. Atlas is unaffected.

Dates are scene-search targets; acquisition IDs remain in a disclosure. Primary lenses use readable names with scientific index labels. Research lenses retain experimental qualification. Search locations show exploratory context rather than inheriting the selected incident caption.

Run npm run test:browser for the guided site/lens/compare/date/research/advanced route plus desktop and short-phone overflow coverage. Mock tiles in those screenshots are fixtures, not live satellite imagery. Verify the deployed real map separately.
