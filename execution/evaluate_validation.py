#!/usr/bin/env python3
"""
Evaluate detection performance across all spectral indices.

Usage:
    python3 execution/evaluate_validation.py [--thresholds execution/best_thresholds.json]

Loads validation_raw.csv (written by batch_analyze_spills.py) and scores every
index. If best_thresholds.json exists (written by optimize_thresholds.py), uses
those; otherwise falls back to defaults. FBC excluded as primary metric — too
noisy (high false-positive rate on bare Permian Basin caliche).
"""
import argparse
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

# Default thresholds — overridden by best_thresholds.json if present.
# FBC kept for reference only (not in primary ranking).
DEFAULT_THRESHOLDS: dict[str, float] = {
    "APEX": 0.55,
    "HPWI": 0.10,
    "PWI":  0.05,
    "LBI":  0.08,
    "TRI":  0.05,
    "BPI":  0.05,
    "VSI":  0.05,
    "CMA":  0.05,
    "PHI":  0.05,
    "HMI":  0.05,
    "FBC":  0.10,   # reference only
}

# Trust weights for composite score (FBC excluded)
WEIGHTS: dict[str, float] = {
    "APEX": 1.5,
    "HPWI": 1.5,
    "PWI":  1.0,
    "LBI":  0.8,
    "TRI":  0.8,
    "BPI":  0.8,
    "VSI":  0.6,
    "CMA":  0.6,
    "PHI":  0.6,
    "HMI":  0.6,
}

PRIMARY_INDICES = list(WEIGHTS.keys())
VOLUME_BINS   = [0, 200, 500, 1000, 9999]
VOLUME_LABELS = ["Small (<200 BBL)", "Medium (200-500 BBL)", "Large (500-1000 BBL)", "Major (>1000 BBL)"]


def load_thresholds(path: Path | None) -> dict[str, float]:
    if path and path.exists():
        data = json.loads(path.read_text())
        best = data.get("best_per_index", {})
        out = dict(DEFAULT_THRESHOLDS)
        for idx, v in best.items():
            if idx in out:
                out[idx] = v["threshold"]
        print(f"Loaded optimized thresholds from {path}")
        return out
    return dict(DEFAULT_THRESHOLDS)


def detection_rate(df: pd.DataFrame, col: str, thresh: float) -> float:
    if col not in df.columns:
        return 0.0
    return (df[col] >= thresh).sum() / len(df)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--thresholds", default="execution/best_thresholds.json",
                        help="Path to JSON thresholds from optimize_thresholds.py")
    args = parser.parse_args()

    results_path = Path("execution/validation_raw.csv")
    if not results_path.exists():
        print("ERROR: validation_raw.csv not found. Run batch_analyze_spills.py first.")
        sys.exit(1)

    df = pd.read_csv(results_path)
    thresholds = load_thresholds(Path(args.thresholds))
    available = [idx for idx in PRIMARY_INDICES if idx in df.columns]
    missing = [idx for idx in PRIMARY_INDICES if idx not in df.columns]
    if missing:
        print(f"Note: indices not yet in CSV (re-run batch_analyze_spills.py): {missing}")

    print(f"\n=== Sentinel Explorer — Detection Validation ===")
    print(f"Sites: {len(df)}  |  Indices scored: {len(available)}")
    print("-" * 70)

    # ── Per-index summary ─────────────────────────────────────────────────────
    rows = []
    for idx in available:
        thresh = thresholds.get(idx, 0.1)
        rate = detection_rate(df, idx, thresh)
        col = df[idx]
        rows.append({
            "Index":      idx,
            "Threshold":  thresh,
            "Detected":   int((col >= thresh).sum()),
            "Rate":       f"{rate*100:.1f}%",
            "Mean":       f"{col.mean():.3f}",
            "p75":        f"{col.quantile(0.75):.3f}",
            "p90":        f"{col.quantile(0.90):.3f}",
            "Max":        f"{col.max():.3f}",
        })

    summary_df = pd.DataFrame(rows)
    print(summary_df.to_string(index=False))

    # FBC reference line
    if "FBC" in df.columns:
        fbc_thresh = thresholds.get("FBC", 0.10)
        fbc_rate = detection_rate(df, "FBC", fbc_thresh)
        print(f"\nFBC (reference only — excluded from composite, too noisy): "
              f"{fbc_rate*100:.1f}% at thresh {fbc_thresh:.2f}")

    # ── Composite score ───────────────────────────────────────────────────────
    total_w = sum(WEIGHTS[i] for i in available)
    composite = sum(detection_rate(df, i, thresholds.get(i, 0.1)) * WEIGHTS[i]
                    for i in available) / total_w if total_w > 0 else 0.0
    print(f"\nWeighted composite detection rate (primary indices): {composite*100:.1f}%")

    # ── Volume breakdown ─────────────────────────────────────────────────────
    if "volume_bbl" in df.columns:
        print("\n--- Detection by spill volume ---")
        df["vol_cat"] = pd.cut(df["volume_bbl"], bins=VOLUME_BINS, labels=VOLUME_LABELS)
        vol_cols = {idx: (lambda i: lambda x: (x >= thresholds.get(i, 0.1)).sum())(idx)
                    for idx in available}
        vol_grp = df.groupby("vol_cat", observed=False)
        vol_rows = []
        for cat, grp in vol_grp:
            n = len(grp)
            row = {"Volume": cat, "N": n}
            for idx in available:
                thresh = thresholds.get(idx, 0.1)
                row[idx] = f"{(grp[idx] >= thresh).sum()}/{n} ({(grp[idx]>=thresh).mean()*100:.0f}%)"
            vol_rows.append(row)
        print(pd.DataFrame(vol_rows).to_string(index=False))

    # ── Missed majors ─────────────────────────────────────────────────────────
    if "volume_bbl" in df.columns and available:
        top_idx = max(available, key=lambda i: detection_rate(df, i, thresholds.get(i, 0.1)))
        thresh = thresholds.get(top_idx, 0.1)
        missed = df[(df["volume_bbl"] > 500) & (df[top_idx] < thresh)]
        if not missed.empty:
            print(f"\nMajor spills (>500 BBL) missed by best index ({top_idx}):")
            cols = [c for c in ["operator", "date", "county", "volume_bbl"] + available if c in df.columns]
            print(missed[cols].to_string(index=False))

    # ── Write summary markdown ─────────────────────────────────────────────────
    out_path = Path("execution/validation_summary.md")
    lines = [
        "# Produced Water Detection Validation Summary",
        f"\n**Date:** {pd.Timestamp.now().strftime('%Y-%m-%d')}",
        f"**Sites:** {len(df)}  |  **Indices:** {len(available)}",
        f"\n## Overall Performance\n",
        summary_df.to_string(index=False),
        f"\n**Weighted composite:** {composite*100:.1f}%",
        "\n## Notes",
        "- FBC excluded from composite — high false-positive rate on bare caliche.",
        "- APEX and HPWI are primary trust indices.",
        "- Thresholds from optimize_thresholds.py where available.",
    ]
    if "volume_bbl" in df.columns:
        lines += ["\n## Volume Breakdown\n",
                  pd.DataFrame(vol_rows).to_string(index=False)]
    out_path.write_text("\n".join(lines))
    print(f"\nWrote summary to {out_path}")


if __name__ == "__main__":
    main()
