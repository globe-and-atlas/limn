#!/usr/bin/env python3
"""
Karpathy-loop threshold optimizer for Sentinel Explorer.

Loads validation_raw.csv and performs:
  1. Marginal sweep — best threshold per index independently
  2. APEX × HPWI grid search — find joint optimum for primary indices
  3. Score distribution stats — inform formula calibration

Output: execution/best_thresholds.json  (read by evaluate_validation.py)

Usage:
    python3 execution/optimize_thresholds.py [--top-n 10]

Loop pattern (Karpathy):
    batch_analyze_spills.py → optimize_thresholds.py → evaluate_validation.py
    → inspect missed sites → adjust formula coefficients in batch_analyze_spills.py
    → repeat
"""
import argparse
import itertools
import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

PRIMARY_INDICES = ["APEX", "HPWI", "PWI", "LBI", "TRI", "BPI", "VSI", "CMA", "PHI", "HMI"]
WEIGHTS = {"APEX": 1.5, "HPWI": 1.5, "PWI": 1.0, "LBI": 0.8, "TRI": 0.8,
           "BPI": 0.8, "VSI": 0.6, "CMA": 0.6, "PHI": 0.6, "HMI": 0.6}

# Threshold grid — fine-grained in low range where most indices live
GRID = [0.01, 0.02, 0.03, 0.05, 0.08, 0.10, 0.12, 0.15, 0.20, 0.25, 0.30, 0.40, 0.50]


def det_rate(df: pd.DataFrame, col: str, thresh: float) -> float:
    if col not in df.columns:
        return 0.0
    return float((df[col] >= thresh).sum()) / len(df)


def composite_score(df: pd.DataFrame, thresholds: dict[str, float]) -> float:
    total_w = sum(WEIGHTS.get(k, 1.0) for k in thresholds)
    if total_w == 0:
        return 0.0
    return sum(det_rate(df, k, v) * WEIGHTS.get(k, 1.0) for k, v in thresholds.items()) / total_w


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--top-n", type=int, default=10)
    parser.add_argument("--output", default="execution/best_thresholds.json")
    args = parser.parse_args()

    csv_path = Path("execution/validation_raw.csv")
    if not csv_path.exists():
        print("ERROR: validation_raw.csv not found. Run batch_analyze_spills.py first.")
        sys.exit(1)

    df = pd.read_csv(csv_path)
    available = [i for i in PRIMARY_INDICES if i in df.columns]
    print(f"Loaded {len(df)} sites. Indices available: {available}")

    # ── 1. Score distributions ────────────────────────────────────────────────
    print("\n── Score distributions ──────────────────────────────────────────────")
    print(f"{'Index':6s}  {'min':>6}  {'p25':>6}  {'p50':>6}  {'p75':>6}  {'p90':>6}  {'max':>6}")
    for idx in available:
        col = df[idx]
        q = col.quantile([0, 0.25, 0.50, 0.75, 0.90, 1.0])
        print(f"{idx:6s}  {q[0]:6.3f}  {q[0.25]:6.3f}  {q[0.50]:6.3f}  "
              f"{q[0.75]:6.3f}  {q[0.90]:6.3f}  {q[1.0]:6.3f}")

    # ── 2. Marginal sweep — best threshold per index ──────────────────────────
    print("\n── Marginal threshold sweep ─────────────────────────────────────────")
    print(f"{'Index':6s}  {'Best thresh':>12}  {'Detection':>10}  {'Note'}")
    best_per_index: dict[str, dict] = {}
    for idx in available:
        best_rate, best_thresh = 0.0, GRID[0]
        for t in GRID:
            r = det_rate(df, idx, t)
            if r > best_rate:
                best_rate, best_thresh = r, t
        mean_score = df[idx].mean()
        note = "★ primary" if idx in ("APEX", "HPWI") else ""
        print(f"{idx:6s}  {best_thresh:12.3f}  {best_rate*100:9.1f}%  mean={mean_score:.3f}  {note}")
        best_per_index[idx] = {"threshold": best_thresh, "detection_rate": round(best_rate, 4)}

    # ── 3. APEX × HPWI joint grid search ─────────────────────────────────────
    apex_avail = "APEX" in available
    hpwi_avail = "HPWI" in available
    if apex_avail and hpwi_avail:
        print("\n── APEX × HPWI joint search (top 10 combinations) ──────────────────")
        print(f"{'APEX thresh':>12}  {'HPWI thresh':>12}  {'APEX det':>10}  "
              f"{'HPWI det':>10}  {'Composite':>10}")
        pair_results = []
        for at, ht in itertools.product(GRID, GRID):
            apex_r = det_rate(df, "APEX", at)
            hpwi_r = det_rate(df, "HPWI", ht)
            comp = (apex_r * WEIGHTS["APEX"] + hpwi_r * WEIGHTS["HPWI"]) / (WEIGHTS["APEX"] + WEIGHTS["HPWI"])
            pair_results.append((at, ht, apex_r, hpwi_r, comp))
        pair_results.sort(key=lambda x: -x[4])
        for at, ht, ar, hr, comp in pair_results[:args.top_n]:
            print(f"{at:12.3f}  {ht:12.3f}  {ar*100:9.1f}%  {hr*100:9.1f}%  {comp*100:9.1f}%")
        # Update best thresholds with joint optimum
        best_at, best_ht = pair_results[0][0], pair_results[0][1]
        best_per_index["APEX"]["threshold"] = best_at
        best_per_index["APEX"]["detection_rate"] = round(det_rate(df, "APEX", best_at), 4)
        best_per_index["HPWI"]["threshold"] = best_ht
        best_per_index["HPWI"]["detection_rate"] = round(det_rate(df, "HPWI", best_ht), 4)

    # ── 4. Overall composite at best individual thresholds ───────────────────
    best_thresholds = {k: v["threshold"] for k, v in best_per_index.items()}
    comp = composite_score(df, {k: v for k, v in best_thresholds.items() if k in available})
    print(f"\nWeighted composite at optimized thresholds: {comp*100:.1f}%")

    # ── 5. Calibration hints ─────────────────────────────────────────────────
    print("\n── Calibration hints ────────────────────────────────────────────────")
    for idx in available:
        col = df[idx]
        thresh = best_per_index[idx]["threshold"]
        rate = best_per_index[idx]["detection_rate"]
        if rate < 0.30:
            p90 = col.quantile(0.90)
            print(f"  ⚠  {idx}: detection {rate*100:.0f}% — p90 score is {p90:.3f}. "
                  f"Consider lowering threshold to {p90*0.7:.3f} or boosting formula scale factor.")
        elif rate > 0.85 and idx not in ("APEX", "HPWI"):
            print(f"  ⚠  {idx}: detection {rate*100:.0f}% at thresh {thresh:.2f} — may be over-sensitive (noise).")

    # ── Write output ──────────────────────────────────────────────────────────
    out = {
        "optimized_at": pd.Timestamp.now().isoformat(),
        "sample_size": len(df),
        "composite_detection_rate": round(comp, 4),
        "best_per_index": best_per_index,
        "note": "FBC excluded — too noisy on bare caliche. APEX+HPWI are primary trust indices.",
    }
    out_path = Path(args.output)
    out_path.write_text(json.dumps(out, indent=2))
    print(f"\nWrote {out_path}")


if __name__ == "__main__":
    main()
