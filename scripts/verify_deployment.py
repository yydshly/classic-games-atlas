"""Compare the public Pages runtime files byte-for-byte with a Git commit."""
import argparse
import datetime
import hashlib
import json
import subprocess
from pathlib import Path
import requests

ROOT = Path(__file__).resolve().parents[1]
FILES = ['index.html','app.js','styles.css','data/games.json','assets/atlas-cover.svg','assets/favicon.svg']

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
