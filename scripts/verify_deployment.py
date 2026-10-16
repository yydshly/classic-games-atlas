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
         'assets/garden-cover.svg','games/garden/index.html','games/garden/garden.css','games/garden/levels.mjs','games/garden/engine.mjs','games/garden/renderer.mjs','games/garden/game.mjs',
         'assets/vine-cover.svg','games/vine/index.html','games/vine/vine.css','games/vine/levels.mjs','games/vine/engine.mjs','games/vine/renderer.mjs','games/vine/game.mjs',
         'assets/petal-cover.svg','games/petal/index.html','games/petal/petal.css','games/petal/boards.mjs','games/petal/levels.mjs','games/petal/engine.mjs','games/petal/renderer.mjs','games/petal/game.mjs',
         'assets/sand-cover.svg','games/sand/index.html','games/sand/sand.css','games/sand/boards.mjs','games/sand/levels.mjs','games/sand/deduction.mjs','games/sand/engine.mjs','games/sand/renderer.mjs','games/sand/game.mjs',
         'assets/pinfall-cover.svg','games/pinfall/index.html','games/pinfall/pinfall.css','games/pinfall/levels.mjs','games/pinfall/engine.mjs','games/pinfall/renderer.mjs','games/pinfall/game.mjs',
         'assets/gale-cover.svg','games/gale/index.html','games/gale/gale.css','games/gale/levels.mjs','games/gale/engine.mjs','games/gale/renderer.mjs','games/gale/game.mjs',
         'assets/post-cover.svg','games/post/index.html','games/post/post.css','games/post/tracks.mjs','games/post/engine.mjs','games/post/renderer.mjs','games/post/game.mjs',
         'assets/beacon-cover.svg','games/beacon/index.html','games/beacon/beacon.css','games/beacon/levels.mjs','games/beacon/engine.mjs','games/beacon/game.mjs',
         'assets/chime-cover.svg','games/chime/index.html','games/chime/chime.css','games/chime/levels.mjs','games/chime/engine.mjs','games/chime/renderer.mjs','games/chime/game.mjs',
         'assets/brook-cover.svg','games/brook/index.html','games/brook/brook.css','games/brook/levels.mjs','games/brook/engine.mjs','games/brook/renderer.mjs','games/brook/game.mjs',
         'assets/tide-cover.svg','games/tide/index.html','games/tide/tide.css','games/tide/levels.mjs','games/tide/geometry.mjs','games/tide/engine.mjs','games/tide/renderer.mjs','games/tide/game.mjs',
         'assets/paper-cover.svg','games/paper/index.html','games/paper/paper.css','games/paper/levels.mjs','games/paper/engine.mjs','games/paper/renderer.mjs','games/paper/game.mjs']

if __name__ == '__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('--url',default='https://yydshly.github.io/classic-games-atlas/')
    parser.add_argument('--commit',default='HEAD')
    parser.add_argument('--out',default='.local/deployment-integrity.json')
    parser.add_argument('--resume',action='store_true',help='Continue the verified prefix of an incomplete report for the same commit and URL')
    args=parser.parse_args()
    commit=subprocess.check_output(['git','rev-parse',args.commit],cwd=ROOT,text=True).strip()
    records=[]
    network_events=[]
    output=ROOT/args.out
    output.parent.mkdir(parents=True,exist_ok=True)
    resumed_prefix=0
    if args.resume:
        previous=json.loads(output.read_text(encoding='utf-8'))
        assert previous['commit']==commit and previous['url'].rstrip('/')==args.url.rstrip('/') and not previous['completed']
        records=previous['files']
        assert len(records)<len(FILES)
        for name,record in zip(FILES,records):
            expected=subprocess.check_output(['git','show',f'{commit}:{name}'],cwd=ROOT)
            digest=hashlib.sha256(expected).hexdigest()
            assert record['file']==name and record['httpStatus']==200 and record['match'] and record['commitSHA256']==record['liveSHA256']==digest
        network_events=previous.get('networkEvents',[])
        resumed_prefix=len(records)
    session=requests.Session()
    def save_report(completed=False,error=None):
        report=dict(checkedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),url=args.url,commit=commit,completed=completed,
                    allMatch=completed and all(record['match'] for record in records),files=records,networkEvents=network_events,
                    transport='Persistent requests.Session; normal TLS certificate validation; at most one retry on connection/timeout errors per invocation',resumedVerifiedPrefix=resumed_prefix)
        if error: report['error']=error
        output.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        return report
    for name in FILES[len(records):]:
        expected=subprocess.check_output(['git','show',f'{commit}:{name}'],cwd=ROOT)
        path='' if name=='index.html' else name
        for attempt in range(2):
            try:
                response=session.get(args.url.rstrip('/')+'/'+path,params={'verify':commit},timeout=30)
                response.raise_for_status()
                break
            except (requests.exceptions.ConnectionError,requests.exceptions.Timeout) as error:
                network_events.append(dict(file=name,attempt=attempt+1,errorType=type(error).__name__,message=str(error)[:600]))
                session.close()
                session=requests.Session()
                save_report(error='Transport error; retrying once' if attempt==0 else 'Transport error after bounded retry')
                if attempt==1: raise
            except requests.exceptions.RequestException as error:
                save_report(error=type(error).__name__+': '+str(error)[:600])
                raise
        local_hash=hashlib.sha256(expected).hexdigest()
        live_hash=hashlib.sha256(response.content).hexdigest()
        records.append(dict(file=name,httpStatus=response.status_code,bytes=len(response.content),commitSHA256=local_hash,liveSHA256=live_hash,match=local_hash==live_hash))
        save_report()
    session.close()
    report=save_report(completed=True)
    print(json.dumps(report,ensure_ascii=False,indent=2))
    assert report['allMatch'], 'Live content differs from the expected Git commit'
