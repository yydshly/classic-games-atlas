"""Read-only guard: game37 must not alter published files or reviewed35/36 runtime."""
from pathlib import Path
import hashlib,json,subprocess
root=Path(__file__).resolve().parents[1]
base='c22235a38c3663866b4b949876b9743c7a0ee4fa'
assert subprocess.check_output(['git','rev-parse','HEAD'],cwd=root,text=True).strip()==base
assert not subprocess.check_output(['git','diff',base,'--'],cwd=root,text=True),'Published tracked files changed'
checked=[]
for game in ('court','repair'):
 m=json.loads((root/f'docs/{game}-qa/manifest.json').read_text());n=0
 for f in m['files']:
  if f['path'].startswith(f'games/{game}/'):
   p=root/f['path'];assert hashlib.sha256(p.read_bytes()).hexdigest()==f['sha256'],f['path'];checked.append(f['path']);n+=1
 assert n==7,(game,n)
print(json.dumps({'passed':True,'baseline':base,'publishedTrackedFilesUnchanged':True,'reviewed35And36RuntimeUnchanged':checked},ensure_ascii=False,indent=2))
