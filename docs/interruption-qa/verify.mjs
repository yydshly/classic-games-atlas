import {launch,sleep} from './native-cdp.mjs';
import {writeFile,mkdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const out=process.argv[2]||'.local/interruption-round/public',base='https://yydshly.github.io/classic-games-atlas/';
await mkdir(out,{recursive:true});
const browser=await launch('interrupt-ui'),results=[];
const observed=`window.__interruptEvents=[];for(const type of ['blur','focus','visibilitychange'])addEventListener(type,event=>__interruptEvents.push({type,trusted:event.isTrusted,hidden:document.hidden,focused:document.hasFocus(),at:performance.now()}));`;
async function until(fn,message,ms=15000){const start=Date.now();while(Date.now()-start<ms){try{if(await fn())return;}catch{}await sleep(100);}throw Error('Timed out: '+message);}
async function key(p,code,type='keyDown'){
 const map={ArrowLeft:['ArrowLeft',37],Space:[' ',32],KeyP:['p',80]};const [name,v]=map[code];
 await p.call('Input.dispatchKeyEvent',{type,key:name,code,windowsVirtualKeyCode:v,nativeVirtualKeyCode:v});
}
async function press(p,code){await key(p,code);await key(p,code,'keyUp');}
async function point(p,selector,xRatio=.5){return p.evaluate(`(()=>{const e=document.querySelector(${JSON.stringify(selector)});if(!e)throw Error('missing element');e.scrollIntoView({block:'center'});const r=e.getBoundingClientRect();return{x:r.x+r.width*${xRatio},y:r.y+r.height/2};})()`);}
async function move(p,selector,xRatio=.5){const pos=await point(p,selector,xRatio);await p.call('Input.dispatchMouseEvent',{type:'mouseMoved',...pos});return pos;}
async function click(p,selector){const pos=await move(p,selector);await p.call('Input.dispatchMouseEvent',{type:'mousePressed',button:'left',clickCount:1,...pos});await p.call('Input.dispatchMouseEvent',{type:'mouseReleased',button:'left',clickCount:1,...pos});await sleep(100);}
async function diag(p){return p.evaluate(`(async()=>{const s=[...document.scripts].find(s=>s.type==='module'&&/game\\.mjs/.test(s.src));return (await import(s.src)).diagnostics();})()`);}
const physical=d=>Object.fromEntries(Object.entries(d).filter(([key])=>!['fps','meanRenderMs'].includes(key)));
const control=(slug,d)=>slug==='starline'?d.angle:slug==='tide'?d.aim:d.paddle.x;
async function frame(p,path){const x=await p.call('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});await writeFile(path,Buffer.from(x.data,'base64'));}
try{
 for(const slug of ['starline','prism','tide']){
  const file=out+'/'+slug+'.json';
  try{const old=JSON.parse(await readFile(file,'utf8'));if(old.passed){results.push(old);continue;}}catch{}
  const p=await browser.page();await p.call('Emulation.setDeviceMetricsOverride',{width:1440,height:1050,deviceScaleFactor:1,mobile:false});
  await p.call('Page.addScriptToEvaluateOnNewDocument',{source:observed});await p.call('Network.enable');
  const errors=[],http=[],steps=[];browser.on(e=>{if(e.sessionId!==p.sessionId)return;if(e.method==='Runtime.exceptionThrown')errors.push(e.params.exceptionDetails);if(e.method==='Network.responseReceived'&&e.params.response.status>=400)http.push({url:e.params.response.url,status:e.params.response.status});});
  await p.call('Page.navigate',{url:base+'versions/v2/games/'+slug+'/'});await p.front();await until(async()=>!!(await diag(p))?.state,'controller loaded');
  const q=await browser.page();await p.front();
  const result={slug,url:base+'versions/v2/games/'+slug+'/',environment:'Installed Chromium headless=new, independent profile, native CDP without Playwright focus emulation; desktop 1440x1050. No device claims.',steps,passed:false};
  async function switchCycle(label,expected,held=false){
   const before=await diag(p);assert.equal(before.state,expected);
   const eventStart=await p.evaluate('__interruptEvents.length');await q.front();await until(()=>p.evaluate('document.hidden&&!document.hasFocus()'),'native hidden/blur');
   if(held)await key(q,'ArrowLeft','keyUp');
   await sleep(120);const hidden=await diag(p),stableStart=physical(hidden);await sleep(1100);const afterWait=await diag(p);assert.deepEqual(physical(afterWait),stableStart,'background state advanced');
   assert.equal(hidden.state,expected==='playing'?'paused':expected);
   await p.front();await until(()=>p.evaluate('!document.hidden&&document.hasFocus()'),'native visible/focus');await sleep(220);const returned=await diag(p);assert.deepEqual(physical(returned),stableStart,'return implicitly resumed or altered state');
   const events=await p.evaluate(`__interruptEvents.slice(${eventStart})`);assert.ok(events.some(e=>e.type==='blur'&&e.trusted));assert.ok(events.some(e=>e.type==='visibilitychange'&&e.trusted&&e.hidden));assert.ok(events.some(e=>e.type==='visibilitychange'&&e.trusted&&!e.hidden));
   steps.push({label,before:physical(before),hidden:physical(hidden),afterWait:physical(afterWait),returned:physical(returned),events});
   console.log(slug,label,'passed',returned.state,'time',returned.time);
  }
  try{
   assert.equal((await diag(p)).state,'ready');await switchCycle('ready stays ready','ready');
   await click(p,'#primary-action');if(await p.evaluate('document.querySelector("#help-dialog").open'))await click(p,'#help-confirm');await until(async()=>(await diag(p)).state==='playing','normal start');
   const canvas=slug==='tide'?'#battle':'#battlefield';
   const initial=await diag(p);await key(p,'ArrowLeft');await sleep(160);const moved=await diag(p);assert.notEqual(control(slug,moved),control(slug,initial),'held key did not act before loss of focus');
   await switchCycle('held key released in another tab','playing',true);await frame(p,out+'/'+slug+'-paused.png');
   assert.equal(await p.evaluate('document.querySelectorAll(".pressed").length'),0);
   await click(p,'#primary-action');assert.equal((await diag(p)).state,'playing');await sleep(200);const resumed=await diag(p);await sleep(500);const later=await diag(p);assert.ok(Math.abs(control(slug,later)-control(slug,resumed))<.001,'stale held direction continued after explicit resume');steps.push({label:'explicit resume has no stale direction',before:physical(resumed),after:physical(later)});
   await press(p,'KeyP');assert.equal((await diag(p)).state,'paused');await switchCycle('manual pause survives repeated switch','paused');await click(p,'#primary-action');
   if(slug==='prism'){await press(p,'Space');}else await click(p,slug==='tide'?'#fire':'#shoot');
   await sleep(100);assert.equal((await diag(p)).state,'playing');await switchCycle('active projectile and clock freeze','playing');await frame(p,out+'/'+slug+'-projectile-paused.png');await click(p,'#primary-action');
   const terminalStart=Date.now();let nextLog=0;
   if(slug==='starline'){
    await click(p,'#levels');await click(p,'[data-level="2"]');await click(p,'#primary-action');
    while((await diag(p)).state==='playing'&&Date.now()-terminalStart<70000){const d=await diag(p);if(!d.flight)await click(p,'#shoot');await sleep(100);}
   }else if(slug==='prism'){
    while((await diag(p)).state==='playing'&&Date.now()-terminalStart<120000){const d=await diag(p);if(d.serving){await move(p,canvas,.1);await sleep(200);await press(p,'Space');}else{const x=d.balls[0]?.x??300;await move(p,canvas,x<300?.9:.1);}await sleep(200);if(Date.now()-terminalStart>nextLog){console.log(slug,'natural terminal wait',Math.round((Date.now()-terminalStart)/1000),'s lives',(await diag(p)).lives);nextLog+=20000;}}
   }else{
    while((await diag(p)).state==='playing'&&Date.now()-terminalStart<160000){await sleep(2000);if(Date.now()-terminalStart>nextLog){console.log(slug,'natural terminal wait',Math.round((Date.now()-terminalStart)/1000),'s time',(await diag(p)).time);nextLog+=20000;}}
   }
   const terminal=await diag(p);assert.ok(['won','lost'].includes(terminal.state),'finite natural terminal attempt did not reach a result');result.terminalMethod=slug==='starline'?'Normal second-map repeated low-efficiency shoot button; no solver/state injection':slug==='prism'?'Normal mouse moves deliberately away from read-only ball positions, Space serves; intentional natural ball losses':'Real elapsed activity and no extra shots; existing tide time/pressure rule';
   await switchCycle('terminal survives switch without restart',terminal.state);await frame(p,out+'/'+slug+'-terminal.png');assert.equal(errors.length,0);assert.equal(http.length,0);result.passed=true;
  }catch(e){result.error=e.stack;console.error(slug,'FAILED',e.message);}
  result.pageErrors=errors;result.httpErrors=http;result.events=await p.evaluate('__interruptEvents');
  await writeFile(file,JSON.stringify(result,null,2));results.push(result);await writeFile(out+'/report.json',JSON.stringify({cases:results},null,2));
  await browser.send('Target.closeTarget',{targetId:p.targetId});await browser.send('Target.closeTarget',{targetId:q.targetId});
 }
 await writeFile(out+'/report.json',JSON.stringify({cases:results},null,2));assert.ok(results.every(r=>r.passed),'One or more bounded scenarios failed');
}finally{await browser.close();}
