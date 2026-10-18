#!/usr/bin/env node
/**
 * Native OFFSCREEN Canvas evidence from actual public game39 engine calls.
 * This is not a browser, webpage, device, interaction or accessibility test.
 * Uses installed @napi-rs/canvas and ffmpeg. No installs, auth or network.
 * After engine + pilot + renderer freeze:
 * node scripts/render_kart_preview.mjs --frozen --video
 */
import {createRequire} from 'node:module';
import {mkdirSync,mkdtempSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
if(!process.argv.includes('--frozen'))throw Error('Formal evidence requires explicit engine, pilot and renderer freeze; pass --frozen only after confirmation.');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'docs/kart-qa');mkdirSync(out,{recursive:true});
const assert=(v,m)=>{if(!v)throw Error(m);},digest=b=>createHash('sha256').update(b).digest('hex');
const sources={renderer:'games/kart/renderer.mjs',engine:'games/kart/engine.mjs',levels:'games/kart/levels.mjs',pilot:'scripts/kart_pilot.mjs',captureScript:'scripts/render_kart_preview.mjs'};
const hashFile=p=>digest(readFileSync(join(root,p)));
// Provenance is recorded BEFORE dynamic runtime imports and the first state.
// A concurrent edit to any of these five sources invalidates the full capture.
const sourceHashesAtStart=Object.fromEntries(Object.entries(sources).map(([k,p])=>[k,hashFile(p)]));
const {createGame,start,step,pause,snapshot,FIXED_DT,LEVELS,pointAt}=await import('../games/kart/engine.mjs');
const {pilotInput}=await import('./kart_pilot.mjs');
const {render,projectCar,projectPoint,projectTrackPoint,cameraFor}=await import('../games/kart/renderer.mjs');
const require=createRequire(import.meta.url),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Noto Sans CJK SC');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','Noto Sans CJK SC');
const canvas=createCanvas(1200,800),ctx=canvas.getContext('2d'),checks={},captures=[],effects={};
function summary(g){return{level:g.level,name:LEVELS[g.level-1].name,state:g.state,ticks:g.ticks,time:g.time,remaining:g.remaining,rank:g.rank,result:g.result,stats:g.stats,cars:g.cars.map(c=>({id:c.id,name:c.name,color:c.color,s:c.s,lateral:c.lateral,x:c.x,y:c.y,heading:c.heading,speed:c.speed,lap:c.lap,place:c.place,finishTime:c.finishTime,item:c.item,boost:c.boost,shield:c.shield,slow:c.slow,drifting:c.drifting,driftCharge:c.driftCharge,offroad:c.offroad,collisionCooldown:c.collisionCooldown,obstacleCooldown:c.obstacleCooldown})),boxes:g.boxes,effects:g.effects};}
function pixels(g,options={}){render(ctx,g,{width:1200,height:800,time:Math.round(g.time*1000),...options});return canvas.toBuffer('image/png');}
function label(context,caption='原生离屏画布 · 实际引擎状态 · 非网页截图'){context.save();context.fillStyle='#203b34d9';context.beginPath();context.roundRect(423,635,354,18,6);context.fill();context.fillStyle='#e9d49e';context.textAlign='center';context.textBaseline='middle';context.font='9px "Noto Sans CJK SC", sans-serif';context.fillText(caption,600,644);context.restore();}
function capture(g,file,note,options={}){assert(Object.isFrozen(g),'Only frozen actual snapshots can be captured');const before=JSON.stringify(g);pixels(g,options);assert(JSON.stringify(g)===before,`Renderer mutated state: ${file}`);label(ctx);const data=canvas.toBuffer('image/png');writeFileSync(join(out,file),data);captures.push({file,note,evidence:'Native offscreen Canvas from an immutable snapshot reached exclusively through public start/step/pause APIs. No fabricated position, item, effect or result; not webpage/browser evidence.',sha256:digest(data),snapshot:summary(g)});}
function runner(index=0){const game=createGame(index);assert(start(game),'Start denied');return{game,input:null,controlTick:0};}
function advance(r,ticks,observer){for(let i=0;i<ticks;i++){if(r.controlTick%6===0)r.input=pilotInput(r.game);const input=r.input;assert([-1,0,1].includes(input.steer),'Pilot bypasses digital steering');step(r.game,FIXED_DT,input);r.controlTick++;if(observer)observer(r.game,input);}return r.game;}
function scanEffects(g){if(g.state!=='playing')return;const p=g.cars[0];const flags={drift:p.drifting&&p.driftCharge>.6,boost:p.boost>0,shield:p.shield>0,hit:p.slow>0||p.collisionCooldown>0,pulse:g.effects.some(e=>e.kind==='pulse'&&e.life>0),item:p.item!==null};for(const[k,v]of Object.entries(flags))if(v&&!effects[k])effects[k]=snapshot(g);}
const trackStates=[],pilotResults=[];
// Eight authored tracks each get their own actual 8-second racing state and
// a complete two-lap public-input run. Controls are held for a real 100 ms.
for(let index=0;index<8;index++){
 const r=runner(index);let atEight=null,guard=0;
 while(!['won','lost'].includes(r.game.state)&&guard++<15000){advance(r,1,scanEffects);if(!atEight&&r.game.time>=8-1e-8)atEight=snapshot(r.game);}
 assert(r.game.state==='won',`Track ${index+1} pilot did not win`);assert(atEight&&Object.isFrozen(atEight.cars)&&atEight.cars.every(Object.isFrozen),'Snapshot is not deeply frozen');
 const final=snapshot(r.game),before=JSON.stringify(final);pixels(final);assert(JSON.stringify(final)===before,'Frozen final state mutated');
 trackStates.push(atEight);pilotResults.push({level:index+1,state:final.state,place:final.rank,time:final.time,ticks:final.ticks,stats:final.stats,finishOrder:final.cars.map(c=>({id:c.id,place:c.place,finishTime:c.finishTime}))});
 capture(atEight,`renderer-track-${String(index+1).padStart(2,'0')}.png`,'Eight actual racing seconds on this distinct authored circuit, reached by ordinary digital controls held 100 ms. All four kart positions and headings are engine state.');
 if(index===7)capture(final,'renderer-won.png','Actual champion-ring win after two laps. Rivals still racing when the player finishes remain explicitly marked unfinished; no finish times are fabricated.');
}
checks.eightFrozenActualTracks={passed:true,count:8,pilotControlHoldTicks:6,pilotControlHoldMilliseconds:100,results:pilotResults};
const ready=snapshot(createGame(0));capture(ready,'renderer-ready.png','Actual initial four-car grid before starting.');
const countdownRun=runner(0);advance(countdownRun,60);capture(snapshot(countdownRun.game),'renderer-countdown.png','Actual countdown after one second; no car has moved.');
for(const[k,g]of Object.entries(effects))capture(g,`renderer-${k}.png`,`First genuine ${k} state observed in the public-control eight-track runs. Effect is represented only when present in engine state.`);
assert(effects.drift&&effects.boost&&effects.shield&&effects.hit&&effects.pulse&&effects.item,'Missing actual effect coverage');
const pausedRun=runner(7);advance(pausedRun,60*11);assert(pause(pausedRun.game),'Pause denied');capture(snapshot(pausedRun.game),'renderer-paused.png','Actual public pause after eight racing seconds, preserving all four vehicle positions.');
const lost=createGame(0);start(lost);for(let n=0;n<15000&&!['won','lost'].includes(lost.state);n++)step(lost,FIXED_DT,{steer:0,brake:true,drift:false,item:false});assert(lost.state==='lost','Braking until timeout should lose');capture(snapshot(lost),'renderer-lost.png','Actual timeout while the player holds the brake. Rivals finish through their normal controls.');
const active=trackStates[7],a=pixels(active,{time:1234}),b=pixels(active,{time:1234});assert(a.equals(b),'Identical render inputs produce different pixels');checks.deterministicPixels=true;
const stillA=pixels(effects.drift,{time:1,reducedMotion:true}),stillB=pixels(effects.drift,{time:999999,reducedMotion:true});assert(stillA.equals(stillB),'Reduced motion depends on presentation time');checks.reducedMotionTimeInvariant=true;
for(const s of [...trackStates,...Object.values(effects)]){const before=JSON.stringify(s);for(const time of[0,1000,90000])pixels(s,{time});assert(JSON.stringify(s)===before,'Rendering advanced/mutated simulation');}checks.presentationTimeNeverChangesSimulation=true;
let poseChecks=0;
for(const s of trackStates){const cam=cameraFor(s),level=LEVELS[s.level-1];assert(Number.isFinite(cam.scale)&&cam.scale>0,'Invalid camera');for(const car of s.cars){const p=projectCar(s,car),expected=pointAt(level,car.s,car.lateral),q=projectPoint(s,expected.x,expected.y);assert(Math.abs(p.x-q.x)<1e-7&&Math.abs(p.y-q.y)<1e-7,'Kart projection does not match actual road pose');assert(p.heading===car.heading,'Kart heading was fabricated');assert(p.x>20&&p.x<1180&&p.y>130&&p.y<650,'Kart falls outside bounded overview');poseChecks++;}for(let i=0;i<100;i++){const at=level.track.length*i/100,p=projectTrackPoint(s,at),w=pointAt(level,at),q=projectPoint(s,w.x,w.y);assert(Math.hypot(p.x-q.x,p.y-q.y)<1e-7,'Road geometry projection mismatch');poseChecks++;}}
checks.actualPoseProjection={passed:true,assertions:poseChecks,carsPerTrack:4,tracks:8};
const phone=createCanvas(360,240);render(phone.getContext('2d'),active,{width:360,height:240,time:8000});const phoneData=phone.toBuffer('image/png');writeFileSync(join(out,'renderer-phone-scale.png'),phoneData);checks.phoneScale={dimensions:[360,240],file:'renderer-phone-scale.png',sha256:digest(phoneData),evidence:'Native Canvas scaling inspection only. HTML provides separate readable controls/status. Physical phone/browser CSS/touch/accessibility not established.'};
const performanceStart=performance.now();for(let i=0;i<50;i++)render(ctx,active,{time:i*50});checks.nativeRenderBenchmark={frames:50,meanMs:(performance.now()-performanceStart)/50,evidence:'Native CPU Canvas render time only; no PNG encoding. Not browser/device FPS.'};
let video=null;
if(process.argv.includes('--video')){
 const fps=20,seconds=10,frames=fps*seconds,temp=mkdtempSync(join(tmpdir(),'kart-frames-')),r=runner(7);advance(r,60*9);const initial=summary(r.game),frameStates=[],inputHistory=[];
 try{
  for(let frame=0;frame<frames;frame++){
   if(frame>0)advance(r,3,(g,input)=>inputHistory.push({tick:g.ticks,time:g.time,...input}));
   const snap=snapshot(r.game),before=JSON.stringify(snap);render(ctx,snap,{width:1200,height:800,time:Math.round(r.game.time*1000)});assert(JSON.stringify(snap)===before,'Video rendering mutated state');label(ctx,'原生离屏模拟 · 真实 20 fps 时间线 · 非网页录屏');
   writeFileSync(join(temp,`${String(frame).padStart(4,'0')}.png`),canvas.toBuffer('image/png'));frameStates.push({frame,videoSecond:frame/fps,ticks:r.game.ticks,time:r.game.time,state:r.game.state,rank:r.game.rank,heldInput:{...r.input},cars:summary(r.game).cars});
  }
  const output=join(out,'renderer-simulation.mp4'),encode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(fps),'-i',join(temp,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','20','-movflags','+faststart',output],{encoding:'utf8'});assert(encode.status===0,encode.stderr||encode.error?.message||'ffmpeg failed');
  const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_frames,duration','-of','json',output],{encoding:'utf8'});assert(probe.status===0,probe.stderr||'ffprobe failed');const info=JSON.parse(probe.stdout);assert(info.streams[0].nb_frames==='200'&&Number(info.streams[0].duration)===10,'Video duration/frame count mismatch');
  assert(frameStates.at(-1).ticks-frameStates[0].ticks===597,'Video did not use three physics ticks per frame');assert(Math.abs(frameStates.at(-1).time-frameStates[0].time-9.95)<1e-7,'Video time is not real 1× simulation time');assert(frameStates.every(f=>f.state==='playing'&&f.cars.length===4),'Video lacks four actual active racers');assert(frameStates.at(-1).cars[0].s-frameStates[0].cars[0].s>400,'Video lacks meaningful real movement');
  video={file:'renderer-simulation.mp4',evidence:'Ten-second chronological native offscreen rendering at 20 fps. Exactly three fixed physics ticks between frames. Actual digital steering/brake/drift/item controls held for 100 ms; no position edits, time compression or fabricated progress. Not browser recording.',fps,seconds,frames,simulationSecondsBetweenFirstAndLastFrame:9.95,initial,final:summary(r.game),probe:info,sha256:digest(readFileSync(output)),frameStates,inputHistory};
 }finally{rmSync(temp,{recursive:true,force:true});}
}
const sourceHashesAtEnd=Object.fromEntries(Object.entries(sources).map(([k,p])=>[k,hashFile(p)]));for(const key of Object.keys(sources))assert(sourceHashesAtStart[key]===sourceHashesAtEnd[key],`Source changed during capture: ${sources[key]}. Evidence is INVALID; rerun after freeze.`);
writeFileSync(join(out,'renderer-checks.json'),JSON.stringify({evidence:'OFFSCREEN SOURCE RENDER ONLY. No browser, authentication, network, installs, downloaded artwork, old-game edits or fabricated simulation state.',browserVerified:false,sourceProvenance:{recordedBeforeRuntimeImports:true,recordedBeforeFirstState:true,unchangedThroughLastFrame:true,files:sources,hashesAtStart:sourceHashesAtStart,hashesAtEnd:sourceHashesAtEnd},checks,captures,video},null,2)+'\n');
console.log(JSON.stringify({out,captures:captures.map(c=>c.file),checks,sourceHashes:sourceHashesAtStart,video:video&&{file:video.file,seconds:video.seconds,frames:video.frames,inputTicks:video.inputHistory.length}},null,2));
