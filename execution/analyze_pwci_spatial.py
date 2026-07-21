"""Analyze per-pixel PWCI spatial test: is there localized visual discrimination?

Compares spill vs background boxes on the pixel-level metrics (coverage = fraction
of pixels rendering, and box max), which the box-MEAN analysis discarded. Answers:
does PWCI light up more at spill sites than on ordinary caliche, per pixel?

Usage:
    python3 execution/analyze_pwci_spatial.py
"""
from __future__ import annotations

from pathlib import Path

import numpy as np
import pandas as pd

REPO = Path(__file__).resolve().parents[1]


def roc_best(spill: np.ndarray, bg: np.ndarray):
    """Youden's J over thresholds on a metric; return (J, thr, recall, fp)."""
    thrs = np.unique(np.concatenate([spill, bg, [0.0]]))
    bestJ, best = -1.0, (0.0, 0.0, 0.0, 0.0)
    for t in thrs:
        recall = np.mean(spill > t)
        fp = np.mean(bg > t)
        j = recall - fp
        if j > bestJ:
            bestJ, best = j, (j, float(t), recall, fp)
    return best


def main() -> None:
    df = pd.read_csv(REPO / "execution" / "pwci_spatial.csv")
    sp = df[df.label == "spill"]
    bg = df[df.label == "background"]

    lines = ["# PWCI Spatial (Per-Pixel) Test — Does the Flagship Show Localized Visual Signal?", "",
             f"Viewer PWCI (Permian preset) computed per pixel; box = ~500 m. "
             f"Spill sites: {len(sp)}. Background: {len(bg)}.", "",
             "Box-MEAN analysis found PWCI mean ≈ 0 on background and no separation. This asks the "
             "different, visual question: do bright *pixels* appear more at spills than on caliche?", "",
             "## Coverage (fraction of pixels rendering, PWCI ≥ 0.05)", ""]

    for name, d in [("spill", sp), ("background", bg)]:
        hf = d.hit_frac.values * 100
        lines.append(f"- **{name}** (n={len(d)}): mean coverage {hf.mean():.2f}%, "
                     f"median {np.median(hf):.2f}%, "
                     f"% of sites with ANY bright pixel: {np.mean(d.hit_frac > 0)*100:.0f}%, "
                     f"% with coverage >1%: {np.mean(d.hit_frac > 0.01)*100:.0f}%")
    lines.append("")

    # Separation on coverage and on max.
    J_hf, t_hf, r_hf, fp_hf = roc_best(sp.hit_frac.values, bg.hit_frac.values)
    J_mx, t_mx, r_mx, fp_mx = roc_best(sp.pwci_max.values, bg.pwci_max.values)
    lines += ["## Spatial separation (spill vs background)", "",
              f"- **Coverage metric:** best Youden's J = {J_hf:.2f} at coverage>{t_hf*100:.2f}% "
              f"→ {r_hf*100:.0f}% of spills vs {fp_hf*100:.0f}% of background.",
              f"- **Box-max metric:** best Youden's J = {J_mx:.2f} at max>{t_mx:.2f} "
              f"→ {r_mx*100:.0f}% of spills vs {fp_mx*100:.0f}% of background.", ""]

    # Verdict.
    lines += ["## Verdict", ""]
    if max(J_hf, J_mx) >= 0.35:
        lines.append(f"- **PWCI DOES carry localized visual signal that the box-mean missed.** "
                     f"Best spatial separation J={max(J_hf,J_mx):.2f} — spills light up per-pixel "
                     f"more than caliche. This vindicates the 'visual differences' observation and "
                     f"means PWCI has value as a **visual anomaly highlighter**, distinct from an "
                     f"automated box-mean detector.")
    elif max(J_hf, J_mx) >= 0.15:
        lines.append(f"- **Weak/partial spatial signal** (best J={max(J_hf,J_mx):.2f}). Some spills "
                     f"show localized bright pixels, but background does too often enough that it is "
                     f"not a clean visual discriminator. Real but limited.")
    else:
        lines.append(f"- **No spatial discrimination either** (best J={max(J_hf,J_mx):.2f}). Bright "
                     f"pixels appear about as often on background as at spills — the visual "
                     f"differences seen in-app are not spill-specific.")
    lines.append("")
    lines.append(f"_From execution/pwci_spatial.csv (spill n={len(sp)}, background n={len(bg)})._")

    out = REPO / "reports" / "pwci_spatial_test_2026-07-20.md"
    out.write_text("\n".join(lines) + "\n")
    print("\n".join(lines))
    print(f"\nWrote {out}")


if __name__ == "__main__":
    main()
