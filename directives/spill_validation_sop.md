# DIRECTIVE: Large-scale Validation of Spill Detection Indices

## Validation Contract

- [ ] The directive's expected output artifact or documented state change exists at the specified location.
- [ ] The documented command, script, or manual procedure completes without an unhandled error.
- [ ] The output satisfies the directive's acceptance criteria or documented success standard.
- [ ] Any deterministic error encountered during execution is recorded in `knowledge/ERRORS.md`.

**Mission:** Validate the empirical thresholds for Produced Water detection indices (FBC, HPWI, PWI) across a large dataset of Texas RRC geocoded spills (2022–present).

### Goals

1. Quantify the detection rate (Recall) of the current `app.js` logic.
2. Characterize the spectral signatures of verified produced water events.
3. Identify potential false-positive triggers in the Permian Basin environment.

### Inputs

- `data/rrc_spills.json`: FeatureCollection of incident sites.
- `config.js`: Sentinel Hub CDSE credentials.
- `app.js`: Reference logic for indices.

### Tools & Scripts

- `execution/batch_analyze_spills.py`: Fetches Sentinel Hub stats and calculates scores.
- `execution/evaluate_validation.py`: Performs statistical analysis on output CSV.

### Execution Procedure

1. Initialize Python environment with `requests`, `numpy`, and `pandas`.
2. Parse `data/rrc_spills.json`.
3. Filter for incidents since 2022-01-01.
4. For each site, request Statistical API data for the 5-day window centered on the incident date.
5. Calculate:
   - **FBC**: `sqrt(ironScore * brineScore) * noVeg * 25.0`
   - **HPWI**: `(ndoi + brineBoost) * normSmooth * 6.0`
   - **PWI**: `brineScore * hcaiScore * hmriScore`
6. Log all scores, spectral bands, and metadata to `.tmp/validation_raw.csv`.

### Expected Outputs

- `knowledge/procedural/validation-summary.md`: Final metrics including recall by volume and recommended threshold adjustments.
- `.tmp/validation_raw.csv`: Raw spectral signatures for further research.
