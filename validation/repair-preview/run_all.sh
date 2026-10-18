#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/../.."
node validation/repair-preview/test_repair.mjs
node validation/repair-preview/test_repair_progress.mjs
node validation/repair-preview/test_repair_controller.mjs
node validation/repair-preview/test_preview_isolation.mjs
python validation/repair-preview/test_repair_layout.py
python validation/repair-preview/test_repair_width.py
