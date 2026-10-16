"""Compare the public Pages runtime files byte-for-byte with a Git commit."""
import argparse
import datetime
import hashlib
import json
import subprocess
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
FILES = ['index.html','app.js','styles.css','data/games.json','assets/atlas-cover.svg','assets/favicon.svg','assets/fortress-cover.svg',
         'games/fortress/index.html','games/fortress/fortress.css','games/fortress/levels.mjs','games/fortress/engine.mjs','games/fortress/renderer.mjs','games/fortress/game.mjs',
         'assets/maze-cover.svg','data/experiments.json','games/maze/index.html','games/maze/maze.css','games/maze/levels.mjs','games/maze/engine.mjs','games/maze/renderer.mjs','games/maze/game.mjs',
         'assets/starline-cover.svg','games/starline/index.html','games/starline/starline.css','games/starline/levels.mjs','games/starline/engine.mjs','games/starline/renderer.mjs','games/starline/game.mjs',
         'assets/prism-cover.svg','games/prism/index.html','games/prism/prism.css','games/prism/levels.mjs','games/prism/engine.mjs','games/prism/renderer.mjs','games/prism/game.mjs',
         'assets/crate-cover.svg','games/crate/index.html','games/crate/crate.css','games/crate/levels.mjs','games/crate/engine.mjs','games/crate/renderer.mjs','games/crate/game.mjs',
         'assets/pass-cover.svg','games/pass/index.html','games/pass/pass.css','games/pass/levels.mjs','games/pass/engine.mjs','games/pass/renderer.mjs','games/pass/game.mjs',
         'assets/trail-cover.svg','games/trail/index.html','games/trail/trail.css','games/trail/levels.mjs','games/trail/engine.mjs','games/trail/renderer.mjs','games/trail/game.mjs',
         'assets/lantern-cover.svg','games/lantern/index.html','games/lantern/lantern.css','games/lantern/levels.mjs','games/lantern/engine.mjs','games/lantern/renderer.mjs','games/lantern/game.mjs',
         'assets/cloud-cover.svg','games/cloud/index.html','games/cloud/cloud.css','games/cloud/levels.mjs','games/cloud/engine.mjs','games/cloud/renderer.mjs','games/cloud/game.mjs',
         'assets/garden-cover.svg','games/garden/index.html','games/garden/garden.css','games/garden/levels.mjs','games/garden/engine.mjs','games/garden/renderer.mjs','games/garden/game.mjs']

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/')
    parser.add_argument('--commit',default='HEAD')
    parser.add_argument('--out',default='.local/deployment-integrity.json')
    args=parser.parse_args()
    commit=subprocess.check_output(['git','rev-parse',args.commit],cwd=ROOT,text=True).strip()
    records=[]
    for name in FILES:
        expected=subprocess.check_output(['git','show',f'{commit}:{name}'],cwd=ROOT)
        path='' if name=='index.html' else name
        response=requests.get(args.url.rstrip('/')+'/'+path,params={'verify':commit},timeout=30)
        response.raise_for_status()
        local_hash=hashlib.sha256(expected).hexdigest()
        live_hash=hashlib.sha256(response.content).hexdigest()
        records.append(dict(file=name,httpStatus=response.status_code,bytes=len(response.content),commitSHA256=local_hash,liveSHA256=live_hash,match=local_hash==live_hash))
    report=dict(checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),url=args.url,commit=commit,allMatch=all(record['match'] for record in records),files=records)
    output=ROOT/args.out
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report,ensure_ascii=False,indent=2))
    assert report['allMatch'], 'Live content differs from the expected Git commit'
