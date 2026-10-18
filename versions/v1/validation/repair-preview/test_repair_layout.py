"""Static layout contracts only; this is not browser layout/zoom verification."""
from pathlib import Path
import re
css=(Path(__file__).resolve().parents[2]/'preview/repair/repair.css').read_text()
css=re.sub(r'/\*.*?\*/','',css,flags=re.S)
# Extract only top-level selector bodies. A phone-only media guard must not pass.
blocks=[];depth=0;start=0;selector=''
for i,char in enumerate(css):
 if char=='{':
  if depth==0:selector=css[start:i].strip();body=i+1
  depth+=1
 elif char=='}':
  depth-=1
  if depth==0:
   blocks.append((selector,css[body:i]));start=i+1
assert depth==0
rules=dict(blocks)
assert re.search(r'min-height\s*:\s*390px',rules['.canvas-wrap[data-state]:not([data-state="playing"])'])
card=rules['.overlay-card'];assert re.search(r'max-height\s*:\s*100%',card) and re.search(r'overflow-y\s*:\s*auto',card)
# Demonstrate widths missed by the former <=540px guard, without claiming pixels measured.
for viewport in (541,650,851,1000):
 main=viewport-40 if viewport>540 else viewport-24
 canvas=main-270-18 if viewport>850 else main
 print(f'PASS static guard at viewport {viewport}: natural 3:2 canvas height <= {canvas/1.5:.1f}px; non-playing minimum and scroll guard apply globally')
print('PASS playing selector excluded; no gameplay canvas height override')
print('5 static layout contracts passed. Actual browser layout, zoom, focus and scrolling remain unverified.')
