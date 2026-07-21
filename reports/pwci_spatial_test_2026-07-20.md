# PWCI Spatial (Per-Pixel) Test — Does the Flagship Show Localized Visual Signal?

Viewer PWCI (Permian preset) computed per pixel; box = ~500 m. Spill sites: 32. Background: 149.

Box-MEAN analysis found PWCI mean ≈ 0 on background and no separation. This asks the different, visual question: do bright *pixels* appear more at spills than on caliche?

## Coverage (fraction of pixels rendering, PWCI ≥ 0.05)

- **spill** (n=32): mean coverage 0.20%, median 0.00%, % of sites with ANY bright pixel: 6%, % with coverage >1%: 3%
- **background** (n=149): mean coverage 0.03%, median 0.00%, % of sites with ANY bright pixel: 12%, % with coverage >1%: 0%

## Spatial separation (spill vs background)

- **Coverage metric:** best Youden's J = 0.03 at coverage>0.73% → 3% of spills vs 0% of background.
- **Box-max metric:** best Youden's J = 0.02 at max>0.75 → 3% of spills vs 1% of background.

## Verdict

- **No spatial discrimination either** (best J=0.03). Bright pixels appear about as often on background as at spills — the visual differences seen in-app are not spill-specific.

_From execution/pwci_spatial.csv (spill n=32, background n=149)._
