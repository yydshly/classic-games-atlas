"""Encode existing art for delivery with the installed Chromium; source PNGs retained."""
import asyncio,base64,json,hashlib
from pathlib import Path
from PIL import Image,ImageChops
from playwright.async_api import async_playwright
ROOT=Path(__file__).resolve().parents[1]
async def main():
 records=[]
 async with async_playwright() as pw:
  b=await pw.chromium.launch();p=await b.new_page();await p.goto('about:blank')
  for name in ['guardian','rivals','scenery','cart']:
   src=ROOT/'assets/escort/art'/(name+'.png');d=await p.evaluate('''async(uri)=>{const im=new Image();im.src=uri;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);return{data:c.toDataURL('image/webp',.94).split(',')[1]}}''','data:image/png;base64,'+base64.b64encode(src.read_bytes()).decode());dst=src.with_suffix('.webp');dst.write_bytes(base64.b64decode(d['data']));a=Image.open(src).convert('RGBA');z=Image.open(dst).convert('RGBA');assert a.size==z.size;delta=ImageChops.difference(a.getchannel('A'),z.getchannel('A')).getextrema()[1];assert delta<=1;records.append({'source':src.relative_to(ROOT).as_posix(),'file':dst.relative_to(ROOT).as_posix(),'dimensions':list(a.size),'sourceBytes':src.stat().st_size,'webBytes':dst.stat().st_size,'maximumAlphaDifference':delta,'sha256':hashlib.sha256(dst.read_bytes()).hexdigest()})
  await b.close()
 report={'passed':True,'method':'Installed Chromium Canvas WebP encoder, quality0.94; same content/dimensions, original PNGs retained. Pillow only inspects dimensions and alpha difference.','files':records,'sourceTotalBytes':sum(r['sourceBytes'] for r in records),'webTotalBytes':sum(r['webBytes'] for r in records)};report['reductionPercent']=round(100*(1-report['webTotalBytes']/report['sourceTotalBytes']),2);(ROOT/'docs/escort-qa/web-encoding.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf8');print(json.dumps(report))
asyncio.run(main())
