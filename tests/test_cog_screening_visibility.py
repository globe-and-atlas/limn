#!/usr/bin/env python3
"""Regression checks for visible-negative COG screening overlays."""

from __future__ import annotations

import importlib.util
import sys
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "execution" / "render_cog_tile.py"
SPEC = importlib.util.spec_from_file_location("limn_cog_renderer_test", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)


score = np.array([[0.0, 0.3, 0.8, 0.8]], dtype="float32")
valid = np.array([[True, True, True, False]])
rgba = MODULE.colorize_screening(
    score,
    valid,
    [(0, 85, 255), (0, 210, 255), (255, 255, 255)],
    0.6,
)

assert list(rgba[0, :, 3]) == [38, 55, 170, 0]
assert tuple(rgba[0, 0, :3]) == (35, 43, 54), "zero response should use neutral screened color"
assert tuple(rgba[0, 2, :3]) != (35, 43, 54), "candidate should retain index palette color"

print("COG screening visibility contract OK")
