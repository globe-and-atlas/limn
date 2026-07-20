"""Score the SHIPPED VIEWER calibration on background samples for false-positive analysis.

The pipeline-calibration false-positive floor (summarize_false_positives.py) is
catastrophic (PWCI 96.7%). But the live map viewer does NOT use the pipeline math —
it ships stricter basin-preset thresholds, hard masks, steeper stretch, and hardened
dry-brine gates. This script measures the viewer calibration's own false-positive
floor by faithfully porting the src/indices.js evalscripts (PWCI/ASAI/OBEC) at the
default runtime state and scoring them against the same background_raw.csv points.

Default runtime state ported (from src/app.js):
  activeBasin = 'permian'  -> PWCI tau = 0.10 / 0.30 / 2.0, BSI mask = -0.3
  sensitivity = 0          -> DETECTION_SENSITIVITY = 0.0
  visualFilter = 0         -> VISUAL_FILTER = 0 (no extra visual gate)

A pixel "renders" (counts as a detection/false-positive) when its mapped score
clears the evalscript's internal blank gate AND exceeds the test threshold. Requires
raw band columns (B02,B03,B04,B08,B11,B12) in the CSV — re-run sample_background.py
after the raw-band change if they are absent.

Usage:
    python3 execution/score_viewer_calibration.py
"""
from __future__ import annotations

import argparse
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[1]

# Permian preset (src/indices.js CALIBRATION_PRESETS.permian) + default runtime globals.
PWI_SALINITY_OFFSET = 0.10
PWI_HC_OFFSET = 0.30
PWI_HMRI_OFFSET = 2.0
BSI_MASK = -0.3
DETECTION_SENSITIVITY = 0.0

VALIDATION_THRESHOLD = 0.01  # apples-to-apples with the pipeline FP table
APP_THRESHOLDS = {"PWCI": 0.10, "ASAI": 0.05, "OBEC": 0.05}  # HIGHLIGHT_THRESHOLDS

# Internal evalscript blank gates (below these the viewer returns transparent).
PWCI_BLANK = 0.05
ASAI_FLOOR = 0.60   # ASAI returns transparent below 0.60
OBEC_BLANK = 0.08


def clamp(x: float, lo: float = 0.0, hi: float = 1.0) -> float:
    return max(lo, min(hi, x))


def viewer_pwci(b: dict) -> float:
    """Port of src/indices.js `pwi` evalscript at Permian preset."""
    bsi_bot = (b["B11"] + b["B04"]) + (b["B08"] + b["B02"])
    if bsi_bot == 0:
        return 0.0
    bsi = ((b["B11"] + b["B04"]) - (b["B08"] + b["B02"])) / bsi_bot
    if bsi <= BSI_MASK:
        return 0.0
    s_brine = b["B11"] + b["B12"]
    if s_brine == 0:
        return 0.0
    brine = (b["B11"] - b["B12"]) / s_brine
    s_hcai = b["B11"] + b["B04"]
    if s_hcai == 0:
        return 0.0
    hcai = (b["B11"] - b["B04"]) / s_hcai
    if b["B03"] == 0:
        return 0.0
    hmri = b["B12"] / b["B03"]
    brine_score = max(0.0, brine - PWI_SALINITY_OFFSET)
    hcai_score = max(0.0, (hcai - PWI_HC_OFFSET) * 2)
    hmri_score = max(0.0, (hmri - PWI_HMRI_OFFSET) * 2)
    pwi = brine_score * hcai_score * hmri_score
    mapped = min(1.0, (pwi * 20.0) ** 3.0)
    return mapped if mapped >= PWCI_BLANK else 0.0


def viewer_asai(b: dict) -> float:
    """Port of src/indices.js `pwoi` evalscript (wet + dry paths, 0.60 floor)."""
    s = b["B03"] + b["B11"]
    o_val = 0.0 if s == 0 else (b["B03"] - b["B11"]) / s
    radar_proxy = clamp((o_val + 0.3) / 0.6, 0.0, 1.0)
    ndsi_den = b["B11"] + b["B12"]
    ndsi_val = 0.0 if ndsi_den == 0 else (b["B11"] - b["B12"]) / ndsi_den
    salinity_gate = clamp((ndsi_val - 0.035) / 0.16, 0.0, 1.0)
    wet = 0.0
    if radar_proxy > 0.58 and salinity_gate > 0:
        wet = min(1.0, radar_proxy * 0.42 + salinity_gate * 0.58)
    bsi_den = (b["B11"] + b["B04"]) + (b["B08"] + b["B02"])
    bsi_dry = 0.0 if bsi_den == 0 else ((b["B11"] + b["B04"]) - (b["B08"] + b["B02"])) / bsi_den
    dry = 0.0
    if o_val < -0.42 and ndsi_val > 0.15 and bsi_dry > 0.52:
        dry = clamp((ndsi_val - 0.15) / 0.16 * 0.45 + 0.55, 0.0, 1.0)
    final = clamp(max(max(wet, 0.0), dry), 0.0, 1.0)
    return final if final >= ASAI_FLOOR else 0.0


def viewer_obec(b: dict) -> float:
    """Port of src/indices.js `hpwi` evalscript at default sensitivity."""
    s_ndoi = b["B02"] + b["B12"]
    if s_ndoi == 0:
        return 0.0
    ndoi = max(0.0, (b["B02"] - b["B12"]) / s_ndoi)
    ndsi_sum = b["B11"] + b["B12"]
    ndsi = 0.0 if ndsi_sum == 0 else (b["B11"] - b["B12"]) / ndsi_sum
    brine_threshold = max(0.04, 0.06 - (DETECTION_SENSITIVITY * 0.03))
    brine_boost = max(0.0, ndsi - brine_threshold) * 0.8
    chem_signal = min(1.0, ndoi + brine_boost)
    s_smooth = b["B03"] + b["B11"]
    smoothness = 0.0 if s_smooth == 0 else (b["B03"] - b["B11"]) / s_smooth
    norm_smooth = clamp((smoothness + 0.3) / 0.6, 0.0, 1.0)
    mapped = clamp(chem_signal * norm_smooth * 6.0, 0.0, 1.0)
    return mapped if mapped >= OBEC_BLANK else 0.0


SCORERS = {"PWCI": viewer_pwci, "ASAI": viewer_asai, "OBEC": viewer_obec}
RECALL = {"PWCI": 0.815, "ASAI": 0.778, "OBEC": 0.667}
PIPELINE_FP = {"PWCI": 0.967, "ASAI": 0.713, "OBEC": 0.713}
REQUIRED_BANDS = ["B02", "B03", "B04", "B08", "B11", "B12"]


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--background", default=str(REPO / "execution" / "background_raw.csv"))
    ap.add_argument("--output", default=str(REPO / "execution" / "viewer_false_positive_summary.md"))
    args = ap.parse_args()

    df = pd.read_csv(args.background)
    missing = [c for c in REQUIRED_BANDS if c not in df.columns]
    if missing:
        raise SystemExit(
            f"ERROR: background CSV lacks raw band columns {missing}. "
            "Re-run sample_background.py (raw-band persistence) first."
        )

    n = len(df)
    rows = []
    for name, fn in SCORERS.items():
        scores = df.apply(lambda r: fn({b: float(r[b]) for b in REQUIRED_BANDS}), axis=1)
        fp_val = float((scores > VALIDATION_THRESHOLD).mean())
        fp_app = float((scores > APP_THRESHOLDS[name]).mean())
        rows.append((name, scores, fp_val, fp_app))

    lines = ["# Limn False-Positive Floor — SHIPPED VIEWER Calibration", "",
             f"Background points: **{n}** (same set as the pipeline FP study).", "",
             "Faithful Python port of the src/indices.js PWCI/ASAI/OBEC evalscripts at the "
             "default runtime state (Permian preset, sensitivity 0). A point counts as a "
             "false positive when the viewer's mapped score clears its internal blank gate "
             "and exceeds the threshold.", "",
             "| Composite | Recall | Pipeline FP @0.01 | **Viewer FP @0.01** | **Viewer FP @app** | App threshold |",
             "|---|---|---|---|---|---|"]
    console = []
    for name, scores, fp_val, fp_app in rows:
        appt = APP_THRESHOLDS[name]
        lines.append(f"| {name} | {RECALL[name]*100:.1f}% | {PIPELINE_FP[name]*100:.1f}% | "
                     f"**{fp_val*100:.1f}%** | **{fp_app*100:.1f}%** | {appt:g} |")
        console.append((name, fp_val, fp_app, scores))

    lines += ["", "## Interpretation", "",
              "- **Viewer FP** is the number that describes what users actually see in the app — "
              "the pipeline FP column is the loose research calibration used only for recall.",
              "- If viewer FP is low while recall stays usable, the multi-gate suppression claim "
              "holds for the shipped product and the whitepaper should lead with these numbers.",
              "- Recall here is still the pipeline recall; viewer recall against the 27-record "
              "set / 11-site set is a separate measurement (viewer thresholds will lower it).", "",
              f"_Generated by execution/score_viewer_calibration.py from {Path(args.background).name} (n={n})._"]

    Path(args.output).write_text("\n".join(lines) + "\n")

    print(f"Background points: {n}  (viewer calibration: Permian preset, sensitivity 0)\n")
    hdr = f"{'Index':6} {'Recall':>7} {'PipeFP':>7} {'ViewFP@.01':>11} {'ViewFP@app':>11}"
    print(hdr); print("-" * len(hdr))
    for name, fp_val, fp_app, scores in console:
        print(f"{name:6} {RECALL[name]*100:6.1f}% {PIPELINE_FP[name]*100:6.1f}% "
              f"{fp_val*100:10.1f}% {fp_app*100:10.1f}%   (mean {scores.mean():.3f})")
    print(f"\nWrote {args.output}")


if __name__ == "__main__":
    main()
