#!/usr/bin/env node
/**
 * Reproducible NATIVE OFFSCREEN Canvas evidence from actual public engine calls.
 * Not webpage, browser, device, interaction or accessibility verification.
 * Uses preinstalled @napi-rs/canvas and ffmpeg; no installs or network activity.
 * node scripts/render_coaster_preview.mjs [--video]
 */
import { createRequire } from 'node:module';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createGame, command, step, snapshot, pause, FIXED_DT } from '../games/coaster/engine.mjs';
import { runPilot, prepareCoaster } from './coaster_pilot.mjs';
import { render, projectPoint, projectTrackPoint, projectSegmentLabel, hitSegment, VIEW } from '../games/coaster/renderer.mjs';
const require=createRequire(import.meta.url),{createCanvas,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','Noto Sans CJK SC');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc','Noto Sans CJK SC');
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),out=join(root,'docs/coaster-qa');mkdirSync(out,{recursive:true});
const canvas=createCanvas(1200,800),ctx=canvas.getContext('2d'),checks={},captures=[];
const assert=(condition,message)=>{if(!condition)throw Error(message);};
const clone=o=>JSON.parse(JSON.stringify(o));
const digest=b=>createHash('sha256').update(b).digest('hex');
const sources={renderer:'games/coaster/renderer.mjs',engine:'games/coaster/engine.mjs',levels:'games/coaster/levels.mjs',pilot:'scripts/coaster_pilot.mjs',captureScript:'scripts/render_coaster_preview.mjs'};
const sourceHash=p=>digest(readFileSync(join(root,p)));
// A concurrent source edit invalidates the complete run. Hashes are captured
// before the first state is created and rechecked after the final video frame.
const sourceHashesAtStart=Object.fromEntries(Object.entries(sources).map(([k,p])=>[k,sourceHash(p)]));
function pixels(s,options={}){render(ctx,s,{width:1200,height:800,time:3000,...options});return canvas.toBuffer('image/png');}
function label(c,caption='原生离屏画布 · 非网页截图'){
 c.save();c.fillStyle='#31564ddd';c.beginPath();c.roundRect(452,674,296,20,7);c.fill();c.fillStyle='#f3e4bb';c.textAlign='center';c.textBaseline='middle';c.font='10px "Noto Sans CJK SC",sans-serif';c.fillText(caption,600,684);c.restore();
}
function summary(s){return{level:s.levelIndex+1,name:s.level.name,state:s.state,tick:s.tick,elapsed:s.elapsed,train:s.train,aboard:s.aboard,visitors:s.visitors,runs:s.runs,revenue:s.revenue,modules:s.modules,report:s.report&&{safe:s.report.safe,approved:s.report.approved,testedSegments:s.report.testedSegments,thrill:s.report.thrill,comfort:s.report.comfort,maxSpeed:s.report.maxSpeed,diagnosis:s.report.diagnosis}};}
function capture(s,file,options,note){const before=JSON.stringify(s);pixels(s,options);assert(JSON.stringify(s)===before,`Render mutated state: ${file}`);label(ctx);const data=canvas.toBuffer('image/png');writeFileSync(join(out,file),data);captures.push({file,note,evidence:'Native offscreen Canvas drawn from an immutable snapshot reached by public engine commands and fixed simulation ticks. Not browser or webpage evidence.',sha256:digest(data),snapshot:summary(s)});}
function simulate(s,seconds){const ticks=Math.round(seconds/FIXED_DT);for(let i=0;i<ticks;i++)step(s,FIXED_DT);return s;}
function finishTest(s){let ticks=0;while(s.state==='testing'&&ticks++<40000)step(s,FIXED_DT);assert(s.state==='design'&&s.report,'Test did not terminate');return s;}
function operatedState(index=7,seconds=6){const s=createGame(index);const r=prepareCoaster(s);assert(r.every(v=>v.ok),'Pilot installed an illegal module');assert(command(s,'test').ok,'Test denied');finishTest(s);assert(s.report.safe&&s.report.approved,'Authored plan failed certification');assert(command(s,'open').ok,'Open denied');simulate(s,seconds);return s;}
const pilotResults=[];
for(let index=0;index<8;index++){
 const result=runPilot(index),s=result.trace.final,before=JSON.stringify(s);assert(result.results.every(r=>r.ok)&&s.state==='won',`Pilot ${index+1} failed`);assert(Object.isFrozen(s)&&Object.isFrozen(s.level.points),'Snapshot is not frozen');pixels(s,{time:1456,selectedSegment:index});assert(JSON.stringify(s)===before,'Frozen pilot state mutated');pilotResults.push({level:index+1,state:s.state,ticks:s.tick,runs:s.runs,revenue:s.revenue,visitors:s.visitors});
}
checks.frozenActualPilotStates={passed:true,levels:pilotResults};
const design=runPilot(7).trace.design;
const test=createGame(7);prepareCoaster(test);assert(command(test,'test').ok,'Test command denied');simulate(test,3);
const failed=createGame(0);assert(command(failed,'test').ok,'Test command denied');finishTest(failed);assert(!failed.report.safe,'Unmodified track unexpectedly passed');
const operating=operatedState(7,6),active=snapshot(operating),winner=runPilot(7).trace.final;
capture(design,'renderer-design.png',{time:0,selectedSegment:3},'Chapter 8, legally installed pilot modules. No trial result and no passengers have been fabricated.');
capture(snapshot(test),'renderer-testing.png',{time:3000,selectedSegment:0},'Chapter 8, three actual seconds after starting an empty-car test. Train position follows segment/t, the test has not yet earned a report, and all seats are empty.');
capture(snapshot(failed),'renderer-warning.png',{time:0,selectedSegment:0},'Chapter 1, the unmodified first climb genuinely stalls. Only the engine-measured failed segment is diagnosed.');
capture(active,'renderer-operating.png',{time:6000,selectedSegment:2},'Chapter 8 after a full safe trial and six real seconds of passenger operation. Each visible rider represents one of the actual aboard passengers (up to six per carriage).');
capture(winner,'renderer-won.png',{time:9000,selectedSegment:11},'Chapter 8 after the public pilot earns the goal. Paid visitors and revenue are engine facts; decorative strolling figures are scenery and never counted as passengers.');
// Distinct real geometry/hills and all module combinations get independent
// visual evidence, instead of reusing one campaign map under eight captions.
capture(runPilot(3).trace.report,'renderer-double-peak.png',{time:0,selectedSegment:3},'Chapter 4, actual double-peak geometry after legal twin-lift certification.');
let hitChecks=0;
for(let index=0;index<8;index++){const s=createGame(index);for(let i=0;i<12;i++){
 for(const t of[.35,.5,.65]){const p=projectTrackPoint(s,i,t);assert(hitSegment(p.x,p.y,s)===i,`Rail hit mismatch: level ${index+1} segment ${i+1} t=${t}`);hitChecks++;}
 const p=projectSegmentLabel(s,i);for(const [dx,dy]of[[0,0],[-8,-6],[8,6]]){assert(hitSegment(p.x+dx,p.y+dy,s)===i,`Plaque hit mismatch: ${index+1}/${i+1}`);hitChecks++;}
 const a=s.level.points[i],b=s.level.points[(i+1)%12],expected=projectPoint((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2),actual=projectTrackPoint(s,i);assert(Math.abs(expected.x-actual.x)<1e-9&&Math.abs(expected.y-actual.y)<1e-9,'Projection changed the track elevation');
 }}
for(const [x,y]of[[NaN,200],[600,Infinity],[null,300],[1,1],[1199,799],[-20,450]]){assert(hitSegment(x,y,active)===null,'Invalid or off-map hit accepted');hitChecks++;}
checks.logicalHitTargets={passed:true,assertions:hitChecks,levels:8,segmentsPerLevel:12,geometry:VIEW,scope:'Logical native coordinates only. Number plaques and rail interiors tested. Does not establish physical browser touch-target size.'};
const a=pixels(active,{time:1234}),b=pixels(active,{time:1234});assert(a.equals(b),'Repeated rendering differs');checks.deterministicPixels=true;
const stillA=pixels(active,{time:1,reducedMotion:true}),stillB=pixels(active,{time:999999,reducedMotion:true});assert(stillA.equals(stillB),'Reduced motion depends on presentation time');checks.reducedMotionTimeInvariant=true;
const frozen=snapshot(operating),before=JSON.stringify(frozen);for(const time of[0,1000,999999])pixels(frozen,{time});assert(JSON.stringify(frozen)===before,'Presentation time advances simulation');checks.presentationTimeNeverMutatesSimulation=true;
const withoutRiders=clone(active);withoutRiders.aboard=0;assert(!pixels(active,{time:0}).equals(pixels(withoutRiders,{time:0})),'Actual onboard passengers do not affect image');checks.realPassengerOccupancyAffectsCarriages=true;
const moved=clone(active);moved.train.t=Math.min(.95,active.train.t+.2);if(moved.train.t===active.train.t)moved.train.t=.1;assert(!pixels(active,{time:0}).equals(pixels(moved,{time:0})),'Train progress does not affect image');checks.actualTrainProgressAffectsImage=true;
const paused=operatedState(7,6);pause(paused);capture(snapshot(paused),'renderer-paused.png',{time:6000,selectedSegment:2},'Actual public pause during passenger operation retains the occupied train at its exact current position.');
const phone=createCanvas(360,240);render(phone.getContext('2d'),active,{width:360,height:240,time:6000,selectedSegment:2});writeFileSync(join(out,'renderer-phone-scale.png'),phone.toBuffer('image/png'));checks.phoneScale={dimensions:[360,240],file:'renderer-phone-scale.png',sha256:digest(phone.toBuffer('image/png')),evidence:'Native Canvas scale inspection only; browser CSS, physical touch, real mobile device and accessibility have not been verified.'};
const start=performance.now();for(let i=0;i<50;i++)render(ctx,active,{time:i*33.333,selectedSegment:2});checks.nativeRenderBenchmark={frames:50,meanMs:(performance.now()-start)/50,evidence:'Native @napi-rs/canvas CPU rendering only, excludes PNG encoding. Not browser/device FPS.'};
let video=null;
if(process.argv.includes('--video')){
 const fps=20,seconds=10,frames=fps*seconds,temp=mkdtempSync(join(tmpdir(),'coaster-frames-')),s=operatedState(7,6),initial=summary(s),frameStates=[];
 try{
  for(let frame=0;frame<frames;frame++){
   if(frame>0)for(let tick=0;tick<3;tick++)step(s,FIXED_DT);
   const snap=snapshot(s),before=JSON.stringify(snap);render(ctx,snap,{time:(6000+frame/fps*1000),selectedSegment:s.train.segment});assert(JSON.stringify(snap)===before,'Video frame mutated engine state');label(ctx,'原生离屏模拟 · 真实引擎时间 · 非网页录屏');
   writeFileSync(join(temp,`${String(frame).padStart(4,'0')}.png`),canvas.toBuffer('image/png'));frameStates.push({frame,videoSecond:frame/fps,tick:s.tick,elapsed:s.elapsed,state:s.state,segment:s.train.segment,t:s.train.t,speed:s.train.speed,aboard:s.aboard,runs:s.runs});
  }
  const output=join(out,'renderer-simulation.mp4'),encode=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-framerate',String(fps),'-i',join(temp,'%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p','-crf','20','-movflags','+faststart',output],{encoding:'utf8'});assert(encode.status===0,encode.stderr||encode.error?.message||'Installed ffmpeg failed');
  const probe=spawnSync('ffprobe',['-v','error','-select_streams','v:0','-show_entries','stream=codec_name,width,height,r_frame_rate,nb_frames,duration','-of','json',output],{encoding:'utf8'});assert(probe.status===0,probe.stderr||'ffprobe failed');const info=JSON.parse(probe.stdout);assert(info.streams[0].nb_frames==='200'&&Number(info.streams[0].duration)===10,'Unexpected video length');
  assert(frameStates.at(-1).tick-frameStates[0].tick===597,'Video did not follow actual fixed simulation ticks');assert(new Set(frameStates.map(f=>f.segment)).size>=3,'Video does not show meaningful train movement');
  video={file:'renderer-simulation.mp4',evidence:'Ten seconds of native offscreen rendering, chronological actual passenger-operation engine snapshots at 20 frames/s. 3 physics ticks between frames. No time compression, prerecorded path or fabricated progress. Not browser/webpage recording.',fps,seconds,frames,simulationSecondsBetweenFirstAndLastFrame:9.95,initial,final:summary(s),probe:info,sha256:digest(readFileSync(output)),frameStates};
 }finally{rmSync(temp,{recursive:true,force:true});}
}
for(const [key,file]of Object.entries(sources))assert(sourceHash(file)===sourceHashesAtStart[key],`Source changed during capture: ${file}. Generated evidence is invalid; rerun after source freeze.`);
writeFileSync(join(out,'renderer-checks.json'),JSON.stringify({evidence:'OFFSCREEN SOURCE RENDER ONLY. No browser, authentication, network, installs, downloaded assets or old-game modifications.',browserVerified:false,sourceProvenance:{recordedBeforeFirstState:true,unchangedThroughLastFrame:true,files:sources,hashes:sourceHashesAtStart},checks,captures,video},null,2)+'\n');
console.log(JSON.stringify({out,captures:captures.map(c=>c.file),checks,sourceHashes:sourceHashesAtStart,video:video&&{file:video.file,seconds:video.seconds,frames:video.frames,segments:[...new Set(video.frameStates.map(f=>f.segment))]}},null,2));
