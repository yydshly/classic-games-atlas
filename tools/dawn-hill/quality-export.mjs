// Actual Canvas functions, normal input checkpoints, offline SVG/Inkscape pixels only.
import {mkdirSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import {recordingCanvas} from '../crate-courier/svg-context.mjs';
import {Renderer} from '../../experiments/dawn-hill/view.mjs';
import {qualityLowRoute,qualityHighRoute,runner} from '../../experiments/dawn-hill/routes.mjs';
const out=path.resolve(process.argv[2]||'/workspace/scratch/dawn-hill/quality-r4/pixels');mkdirSync(out,{recursive:true});
const dir=mkdtempSync(path.join(tmpdir(),'dawn-r3-pixels-'));
try{
 for(const p of ['engine.mjs','level.mjs','view.mjs'])writeFileSync(path.join(dir,p),execFileSync('git',['show','4226fc811d51e036caa8568993f75a5ca3c6e85d:experiments/dawn-hill/'+p]));
 const old=await import(pathToFileURL(path.join(dir,'engine.mjs')).href),{Renderer:BeforeRenderer}=await import(pathToFileURL(path.join(dir,'view.mjs')).href);
 const low=qualityLowRoute(),high=qualityHighRoute(),bank=low.observations.find(o=>o.label==='quality-low-bank').game,prior=old.command(old.createGame(),'start');
 outer:for(const run of low.runs){if(run.command)old.command(prior,run.command);else for(let n=0;n<run.frames;n++){if(prior.stageIndex===2&&prior.tick===bank.tick)break outer;old.step(prior,JSON.parse(run.keys));}}
 if(prior.player.x!==bank.player.x||prior.player.y!==bank.player.y)throw Error('comparison camera/state mismatch');
 const fruit=runner();fruit.until(g=>g.player.x>=362,{right:true});fruit.advance({},24);fruit.advance({jump:true},14);fruit.advance({right:true},36);fruit.advance({},20);
 const scenes=[['bank-before',prior,BeforeRenderer],['bank-after',bank,Renderer],['island-rest',low.observations.find(o=>o.label==='quality-island-rest').game,Renderer],['high-launch',high.observations.find(o=>o.label==='quality-high-launch').game,Renderer],['fruit-before',fruit.game,BeforeRenderer],['fruit-after',fruit.game,Renderer]];
 for(const [label,g,Draw]of scenes)for(const [layout,w,h]of [['desktop',960,500],['portrait',370,447]]){
  const canvas=recordingCanvas(w,h),draw=new Draw(canvas);draw.fit(w,h,1);const frozen=JSON.stringify(g);draw.draw(g);if(JSON.stringify(g)!==frozen)throw Error('draw mutated game');
  const target=path.join(out,label+'-'+layout);writeFileSync(target+'.svg',canvas.svg());execFileSync('inkscape',[target+'.svg','--export-type=png','--export-filename='+target+'.png'],{stdio:['ignore','ignore','pipe']});
 }
 writeFileSync(path.join(out,'states.json'),JSON.stringify({scope:'offline Canvas-to-SVG-to-Inkscape, not browser screenshots or DOM/input/performance acceptance',states:scenes.map(([label,g])=>({label,stageIndex:g.stageIndex,tick:g.tick,layoutRevision:g.layoutRevision??1,player:g.player}))},null,2)+'\n');
 console.log(JSON.stringify({directory:out,scenes:scenes.map(([label])=>label),sameBankCamera:true,comparisonBaselineTree:'4226fc811d51e036caa8568993f75a5ca3c6e85d'},null,2));
}finally{rmSync(dir,{recursive:true,force:true});}
