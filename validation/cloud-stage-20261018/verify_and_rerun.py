#!/usr/bin/env python3
"""Verify archived Game 38/39 runtime hashes and rerun their Node suites.

Only writes new logs to --output. Does not modify source or call a remote service.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import sys

HERE = Path(__file__).resolve().parent
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument('--repo', type=Path, default=HERE.parents[1], help='Repository checkout root')
parser.add_argument('--output', type=Path, default=HERE / 'latest-run', help='New test log directory')
args = parser.parse_args()
repo = args.repo.resolve()
manifest = json.loads((HERE / 'runtime-manifest.json').read_text())
roots = {}

def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

for game in ('coaster', 'kart'):
    expected = [x for x in manifest['files'] if x['game'] == game]
    roots[game] = []
    for engine in repo.rglob(f'games/{game}/engine.mjs'):
        root = engine.parents[2]
        if not (root / f'scripts/test_{game}.mjs').is_file():
            continue
        if all((root / x['relative_path']).is_file() and sha256(root / x['relative_path']) == x['sha256'] for x in expected):
            roots[game].append(root)
    roots[game] = sorted(set(roots[game]))
    if len(roots[game]) != 1:
        sys.exit(f'{game}: expected one hash-matching recovered source root, found {len(roots[game])}. Refusing an ambiguous or changed source.')
    roots[game] = roots[game][0]
    print(f'{game}: verified {len(expected)} runtime files in {roots[game].relative_to(repo)}', flush=True)

output = args.output.resolve()
output.mkdir(parents=True, exist_ok=True)
for game, root in roots.items():
    for suffix in ('', '_progress', '_events'):
        script = f'test_{game}{suffix}.mjs'
        command = ['node', f'scripts/{script}']
        print('Running', ' '.join(command), flush=True)
        result = subprocess.run(command, cwd=root, text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        (output / f'{Path(script).stem}.log').write_text(result.stdout)
        print(result.stdout, end='', flush=True)
        if result.returncode:
            sys.exit(f'{script} failed with exit {result.returncode}; see {output}')
    for item in [x for x in manifest['files'] if x['game'] == game]:
        if sha256(root / item['relative_path']) != item['sha256']:
            sys.exit(f'Runtime changed during tests: {item["relative_path"]}')
print('All six Node suites passed; all 14 runtime hashes still match. Real-browser acceptance remains separate.')
