#!/usr/bin/env python3
"""Formula-parity checks for Limn's COG gate-diagnostic displays."""

from __future__ import annotations

import importlib.util
import sys
import unittest
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location("render_cog_tile", ROOT / "execution" / "render_cog_tile.py")
COG = importlib.util.module_from_spec(SPEC)
assert SPEC.loader is not None
sys.modules[SPEC.name] = COG
SPEC.loader.exec_module(COG)


class CogGateDiagnosticParityTest(unittest.TestCase):
    def setUp(self) -> None:
        self.valid = np.array([[True, True], [True, False]])
        self.bands = {
            "B02": np.array([[0.30, 0.15], [0.08, 0.30]], dtype="float32"),
            "B03": np.array([[0.10, 0.20], [0.15, 0.10]], dtype="float32"),
            "B04": np.array([[0.08, 0.18], [0.12, 0.08]], dtype="float32"),
            "B08": np.array([[0.12, 0.30], [0.20, 0.12]], dtype="float32"),
            "B11": np.array([[0.30, 0.22], [0.18, 0.30]], dtype="float32"),
            "B12": np.array([[0.16, 0.28], [0.12, 0.16]], dtype="float32"),
        }

    def assert_render_matches(
        self,
        key: str,
        score: np.ndarray,
        palette: list[tuple[int, int, int]],
        positions: list[float] | None = None,
    ) -> None:
        actual = COG.render_index(key, self.bands, self.valid)
        expected = COG.colorize(COG.clamp01(score), self.valid, palette, 0.0, positions)
        np.testing.assert_array_equal(actual, expected)
        self.assertEqual(int(actual[1, 1, 3]), 0, f"{key} must preserve the clear-pixel validity mask")

    def test_gate_diagnostic_formula_and_palette_parity(self) -> None:
        b = self.bands
        cases = {
            "ndsi": (
                np.maximum(0, COG.normdiff(b["B11"], b["B12"]) * 2),
                [(10, 60, 100), (120, 100, 50), (240, 80, 30), (230, 20, 20)],
                [0, 0.35, 0.6, 1],
            ),
            "si": (
                np.maximum(0, COG.normdiff(b["B11"], b["B08"]) * 2),
                [(36, 51, 64), (180, 130, 40), (220, 140, 50), (240, 80, 30)],
                [0, 0.15, 0.3, 1],
            ),
            "csi": (
                (np.divide(b["B11"], b["B12"] + 0.0001) - 0.5) / 2.0,
                [(160, 120, 50), (100, 220, 80), (0, 255, 255)],
                None,
            ),
            "hcai": (
                np.maximum(0, (COG.normdiff(b["B11"], b["B04"]) - 0.30) * 3),
                [(245, 222, 179), (139, 69, 19), (0, 0, 0)],
                None,
            ),
            "hmri": (
                (np.divide(b["B12"], b["B03"] + 0.0001) - 2.0) / 3.0,
                [(230, 230, 250), (128, 0, 128), (255, 0, 255)],
                None,
            ),
            "ndoi": (
                np.maximum(0, COG.normdiff(b["B02"], b["B12"]) * 2),
                [(43, 62, 80), (127, 140, 141), (241, 196, 15), (231, 76, 60)],
                [0, 0.3, 0.7, 1],
            ),
        }
        for key, (score, palette, positions) in cases.items():
            with self.subTest(index=key):
                self.assert_render_matches(key, score, palette, positions)

    def test_renderer_band_contract_includes_each_diagnostic(self) -> None:
        self.assertEqual(COG.INDEX_BANDS["ndsi"], ["B11", "B12"])
        self.assertEqual(COG.INDEX_BANDS["si"], ["B11", "B08"])
        self.assertEqual(COG.INDEX_BANDS["csi"], ["B11", "B12"])
        self.assertEqual(COG.INDEX_BANDS["hcai"], ["B11", "B04"])
        self.assertEqual(COG.INDEX_BANDS["hmri"], ["B12", "B03"])
        self.assertEqual(COG.INDEX_BANDS["ndoi"], ["B02", "B12"])


if __name__ == "__main__":
    unittest.main()
