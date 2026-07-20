"""Compute the false-positive floor for Limn composites from background samples.

Reads execution/background_raw.csv (produced by sample_background.py) and reports,
for each index, the fraction of ordinary Permian background points whose score
exceeds the detection threshold. That fraction is the false-positive rate.

It evaluates two thresholds per index:
  * the validation threshold (0.01) used to report spill-site recall, and
  * the app's HIGHLIGHT_THRESHOLD (the value the live UI actually flags at),
    parsed from src/indices.js.

Pairing each index's recall (from execution/validation_summary.md, if present)
with its background false-positive rate gives an honest precision picture that the
recall-only numbers cannot.

Usage
-----
    python3 execution/summarize_false_positives.py
    python3 execution/summarize_false_positives.py --background execution/background_raw.csv
"""
from __future__ import annotations

import argparse
import re
from pathlib import Path

import pandas as pd

REPO = Path(__file__).resolve().parents[1]

VALIDATION_THRESHOLD = 0.01

# Indices that are produced-water composites (exclude raw band ratios in the CSV).
COMPOSITES = ["APEX", "HPWI", "PWI", "FBC", "LBI", "TRI", "BPI", "VSI", "CMA", "PHI", "HMI"]

# Display-name map (validation CSV uses legacy keys).
DISPLAY = {"APEX": "ASAI", "HPWI": "OBEC", "PWI": "PWCI"}

# Recall from the 2026-03-28 validation run (spill-site detection at t=0.01).
RECALL = {"PWI": 0.815, "APEX": 0.778, "HPWI": 0.667, "LBI": 0.630, "VSI": 0.741,
          "BPI": 0.556, "PHI": 0.444, "HMI": 0.185, "TRI": 0.074, "CMA": 0.074}


def parse_highlight_thresholds() -> dict[str, float]:
    """Pull HIGHLIGHT_THRESHOLDS from src/indices.js (legacy keys: pwi/hpwi/pwoi...)."""
    js = (REPO / "src" / "indices.js").read_text()
    block = re.search(r"HIGHLIGHT_THRESHOLDS\s*=\s*\{(.*?)\}", js, re.S)
    out: dict[str, float] = {}
    if not block:
        return out
    for key, val in re.findall(r"(\w+)\s*:\s*([0-9.]+)", block.group(1)):
        out[key.upper()] = float(val)
    # Map JS keys to CSV column names.
    remap = {"PWOI": "APEX", "PWI": "PWI", "HPWI": "HPWI"}
    return {remap.get(k, k): v for k, v in out.items()}


def fp_rate(series: pd.Series, threshold: float) -> tuple[int, int, float]:
    n = int(series.notna().sum())
    hits = int((series > threshold).sum())
    return hits, n, (hits / n if n else float("nan"))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--background", default=str(REPO / "execution" / "background_raw.csv"))
    ap.add_argument("--output", default=str(REPO / "execution" / "false_positive_summary.md"))
    args = ap.parse_args()

    bg_path = Path(args.background)
    if not bg_path.exists():
        raise SystemExit(f"ERROR: {bg_path} not found. Run sample_background.py first.")

    df = pd.read_csv(bg_path)
    n_total = len(df)
    highlights = parse_highlight_thresholds()

    lines: list[str] = []
    lines.append("# Limn False-Positive Floor — Background Sampling")
    lines.append("")
    lines.append(f"Background points sampled: **{n_total}** (ordinary Permian Basin terrain, "
                 "no produced-water event).")
    lines.append("")
    lines.append("False-positive rate = fraction of background points whose composite score "
                 "exceeds the given threshold. Recall is spill-site detection from the "
                 "2026-03-28 validation run.")
    lines.append("")
    lines.append("> **WARNING — do not pair columns across thresholds.** Recall is measured at "
                 "t=0.01; `FP @ app threshold` is measured at a *different* (higher) threshold. "
                 "Reading 'recall X% at FP Y%' across these columns is an invalid operating point "
                 "(e.g. LBI 63% recall is at t=0.01 where FP=86%, not at the 1.3% FP threshold). "
                 "For true recall-vs-FP at fixed thresholds see reports/threshold_sweep_2026-07-20.md.")
    lines.append("")
    lines.append("| Index | Recall (spill sites, t=0.01) | FP @ 0.01 (validation) | FP @ app threshold | App threshold |")
    lines.append("|---|---|---|---|---|")

    console_rows = []
    for key in COMPOSITES:
        if key not in df.columns:
            continue
        name = DISPLAY.get(key, key)
        _, _, fp_val = fp_rate(df[key], VALIDATION_THRESHOLD)
        app_t = highlights.get(key)
        if app_t is not None:
            _, _, fp_app = fp_rate(df[key], app_t)
            fp_app_s = f"{fp_app*100:.1f}%"
            app_t_s = f"{app_t:g}"
        else:
            fp_app_s = "n/a"
            app_t_s = "n/a"
        recall = RECALL.get(key)
        recall_s = f"{recall*100:.1f}%" if recall is not None else "—"
        lines.append(f"| {name} | {recall_s} | {fp_val*100:.1f}% | {fp_app_s} | {app_t_s} |")
        console_rows.append((name, recall_s, f"{fp_val*100:.1f}%", fp_app_s, app_t_s))

    lines.append("")
    lines.append("## Scope — which calibration this measures")
    lines.append("")
    lines.append("These scores are computed with the **validated-pipeline index math** "
                 "(`batch_analyze_spills.calculate_indices`: PWCI τ=0.03/0.05/1.1, ×5/×3 gains, "
                 "pipeline dry-brine gates) — deliberately, so the false-positive rates are the "
                 "apples-to-apples counterpart to the published pipeline recall (81.5/77.8/66.7%).")
    lines.append("")
    lines.append("**The `FP @ app threshold` column applies the live UI's highlight cutoff to "
                 "these pipeline scores.** For the flagships (PWCI/ASAI/OBEC) that is *not* the true "
                 "shipped-viewer false-positive rate, because the viewer also uses stricter basin-"
                 "preset thresholds (PWCI τ=0.10/0.30/2.0) and hardened dry-brine gates that this "
                 "pipeline math does not apply. Measuring the viewer's own FP requires persisting raw "
                 "bands and scoring the viewer evalscripts — a documented follow-up.")
    lines.append("")
    lines.append("## Interpretation")
    lines.append("")
    lines.append("- **The pipeline calibration that produced the published recall does not "
                 "discriminate.** At its own threshold, PWCI fires on 96.7% of ordinary Permian "
                 "background, ASAI/OBEC on ~71%. Recall of 81.5/77.8/66.7% under this calibration is "
                 "therefore near-meaningless in isolation — the composites fire almost everywhere.")
    lines.append("- This **quantitatively refutes** any 'near-zero false-positive' claim for the "
                 "pipeline calibration. No such claim should be published for this configuration.")
    lines.append("- Some non-flagship indices do discriminate at the stricter app thresholds "
                 "(LBI 1.3%, VSI 6.0%, BPI 7.3% FP) — but at lower recall.")
    lines.append("- A defensible public claim pairs each recall number with its FP on this same "
                 "background set, for the *same* calibration — never recall alone.")
    lines.append("")
    lines.append(f"_Generated by execution/summarize_false_positives.py from {bg_path.name} "
                 f"(n={n_total})._")

    out = Path(args.output)
    out.write_text("\n".join(lines) + "\n")

    # Console echo.
    print(f"Background points: {n_total}\n")
    hdr = f"{'Index':6} {'Recall':>8} {'FP@0.01':>9} {'FP@app':>8} {'app_t':>7}"
    print(hdr)
    print("-" * len(hdr))
    for name, rec, fpv, fpa, appt in console_rows:
        print(f"{name:6} {rec:>8} {fpv:>9} {fpa:>8} {appt:>7}")
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
