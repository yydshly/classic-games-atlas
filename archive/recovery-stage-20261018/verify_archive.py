"""Verify imported bytes and rerun selected Node logic suites; never browser acceptance."""
from pathlib import Path
import datetime,hashlib,json,subprocess
ROOT=Path(__file__).resolve().parent
report={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'nodeVersion':subprocess.check_output(['node','--version'],text=True).strip(),'boundary':'Node engine/progress and simulated DOM controller tests only; no browser, layout, mobile, visual, or human difficulty acceptance','tests':[]}
inventory=json.loads((ROOT/'ARCHIVE_INTEGRITY.json').read_text(encoding='utf-8'))
def verify_bytes():
 count=0
 for archive in inventory['archives']:
  for f in archive['files']:
   data=(ROOT/f['path']).read_bytes()
   assert len(data)==f['bytes'] and hashlib.sha256(data).hexdigest()==f['sha256'],f['path']
   count+=1
 return count
report['importedFilesVerifiedBefore']=verify_bytes()
report['historicalRuntimeHashes']={}
for game in ['coaster','kart']:
 base=ROOT/'recovery-v9'/game
 manifest=json.loads((base/'RECOVERY_RUNTIME_HASH_CHECK.json').read_text(encoding='utf-8'))
 for f in manifest['files']:
  assert hashlib.sha256((base/f['file']).read_bytes()).hexdigest()==f['expectedHistoricalSha256']
 report['historicalRuntimeHashes'][game]=len(manifest['files'])
cases=[('court35-v1','court',['','_progress']),('recovery-v9/repair','repair',['','_progress']),('recovery-v9/civic','civic',['_progress']),('recovery-v9/coaster','coaster',['','_progress','_events']),('recovery-v9/kart','kart',['','_progress','_events'])]
out=ROOT/'verification';out.mkdir(exist_ok=True)
for folder,game,suffixes in cases:
 for suffix in suffixes:
  script=f'scripts/test_{game}{suffix}.mjs'
  p=subprocess.run(['node',script],cwd=ROOT/folder,capture_output=True,timeout=120)
  log=f'{game}{suffix or "_engine"}.log'
  (out/log).write_bytes(p.stdout+b'\n'+p.stderr)
  report['tests'].append({'game':game,'cwd':folder,'command':['node',script],'exitCode':p.returncode,'log':log})
  print(game,suffix or '_engine',p.returncode,flush=True)
report['importedFilesVerifiedAfter']=verify_bytes()
report['allSelectedSuitesPassed']=all(t['exitCode']==0 for t in report['tests'])
(out/'LOCAL_VALIDATION.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'fileCount':report['importedFilesVerifiedAfter'],'suites':len(report['tests']),'passed':report['allSelectedSuitesPassed']}))
