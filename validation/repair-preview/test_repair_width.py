"""NEW regression contract after actual 500px browser overflow.
This checks CSS/HTML source contracts, not computed browser pixels or device QA.
Pass a CSS filename to demonstrate the original-source failure.
"""
from pathlib import Path
import re,sys
root=Path(__file__).resolve().parents[2]
path=Path(sys.argv[1]) if len(sys.argv)>1 else root/'preview/repair/repair.css'
css=re.sub(r'/\*.*?\*/','',path.read_text(),flags=re.S)
rules={};depth=0;start=0
for i,c in enumerate(css):
 if c=='{':
  if depth==0:selector=css[start:i].strip();body=i+1
  depth+=1
 elif c=='}':
  depth-=1
  if depth==0:
   for name in selector.split(','):rules[name.strip()]=rules.get(name.strip(),'')+';'+css[body:i]
   start=i+1
assert depth==0
wrap=rules['.canvas-wrap']
for prop,value in [('width','100%'),('min-width','0'),('max-width','100%')]:
 assert re.search(r'(?:^|;)\s*'+prop+r'\s*:\s*'+re.escape(value)+r'\s*(?:;|$)',wrap),f'.canvas-wrap needs definite {prop}:{value} to prevent minimum-height/aspect-ratio width transfer'
print('PASS explicit width, min-width and max-width bind the workshop to its containing column')
assert re.search(r'object-fit\s*:\s*contain',rules['canvas'])
print('PASS contain mapping applies globally when overlay minimum changes canvas proportions')
assert re.search(r'min-height\s*:\s*390px',rules['.canvas-wrap[data-state]:not([data-state="playing"])'])
assert not re.search(r'(?:^|;)\s*min-height\s*:',wrap)
print('PASS 390px guard remains non-playing-only; playing height keeps its authored aspect ratio')
card=rules['.overlay-card'];assert re.search(r'max-height\s*:\s*100%',card) and re.search(r'overflow-y\s*:\s*auto',card)
assert 'overflow-x: hidden' not in css and 'overflow-x:hidden' not in css
print('PASS card scroll protection retained; page overflow is not merely hidden')
if len(sys.argv)==1:
 html=(root/'preview/repair/index.html').read_text()
 assert 'href="./repair.css?v=20261018-width1"' in html
 assert 'src="./game.mjs?v=20261018-width1"' in html
 print('PASS entry HTML requests matching versioned CSS and controller artifacts')
print('Static source contract only. Actual browser width, focus, touch and scrolling need public-browser verification.')
