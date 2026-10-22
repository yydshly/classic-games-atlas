import assert from'node:assert/strict';import fs from'node:fs';
import * as M from'../../versions/v2/games/orchard/engine.mjs';
import{createStrokeFeedback,strokeMark}from'../../versions/v2/games/orchard/stroke-feedback.mjs';
const R='docs/orchard-stroke-feedback-qa/',read=p=>JSON.parse(fs.readFileSync(R+p,'utf8')),base=read('before-1440.json'),local=read('local-390.json');
const checks=[],check=(name,fn)=>{fn();checks.push(name);};
function act(g,f,c){const before=strokeMark(g),ok=M.input(g,c);f.record(g,c,before,ok);return ok;}
function replay(cp){const g=M.createGame(cp.level-1),f=createStrokeFeedback(),trace=[];for(const c of cp.commands){while(g.ticks<c.at)assert(M.step(g));assert(act(g,f,c));trace.push({kind:c.kind,feedback:f.read(g),cuts:g.stats.cuts,bombs:g.stats.bombs});}while(g.ticks<cp.ticks)assert(M.step(g));return{g,f,trace};}
function scene(){const g=M.createGame(1),f=createStrokeFeedback();assert(act(g,f,{kind:'start'}));for(let i=0;i<190;i++)M.step(g);return{g,f};}
function line(g,f,x,X){assert(act(g,f,{kind:'down',x,y:270}));assert(act(g,f,{kind:'move',x:X,y:270}));assert(act(g,f,{kind:'up'}));}
check('Actual ordinaryUI trace reports real cuts, clipped penalty and final score without game/save mutation',()=>{
 for(const d of [base,read('before-390.json'),read('local-1440.json'),local]){const{g,f}=replay(d.thorn.progress.resume),old=structuredClone(g),cp=M.checkpoint(g),text=f.read(g).text;assert.match(text,/误核1枚/);assert(text.includes('实扣'+g.stats.penalties+'分'));assert(text.includes('分数0→'+g.score));assert.deepEqual(g,old);assert.deepEqual(M.checkpoint(g),cp);}
});
check('Later fruit in same real stroke cannot replace the thorn/chain-break result',()=>{
 const{trace,f,g}=replay(base.thorn.progress.resume);const first=trace.findIndex(x=>x.bombs===1);assert(trace.slice(first+1).some(x=>x.cuts>trace[first].cuts));assert.equal(f.read(g).kind,'bad');assert.match(f.read(g).text,/连切已中断/);
});
check('Next real safe stroke replaces old warning with its own actual gain',()=>{
 for(const d of [base,local]){const{g,f}=replay(d.recovered.progress.resume);assert.equal(f.read(g).kind,'good');assert.match(f.read(g).text,/获得10分/);assert(!f.read(g).text.includes('误核'));}
});
check('Zero-score thorn uses actual0, not nominal20 (LEGAL OFFLINE MODEL)',()=>{
 const{g,f}=scene();line(g,f,250,325);assert.equal(g.stats.bombs,1);assert.equal(g.stats.penalties,0);assert.equal(g.score,0);assert.match(f.read(g).text,/实扣0分/);
});
check('Two safe strokes then thorn use actual20 and reset current stroke feedback (LEGAL OFFLINE MODEL)',()=>{
 const{g,f}=scene();line(g,f,170,225);line(g,f,390,450);assert.equal(g.score,20);line(g,f,250,325);assert.equal(g.stats.penalties,20);assert.equal(g.score,0);assert.match(f.read(g).text,/切中0果、误核1枚 · 实扣20分/);
});
check('Invalid input and empty stroke cannot invent a hit or penalty',()=>{
 const g=M.createGame(),f=createStrokeFeedback(),old=structuredClone(g);assert.equal(act(g,f,{kind:'up'}),false);assert.deepEqual(g,old);assert(act(g,f,{kind:'start'}));line(g,f,20,40);assert.equal(g.stats.cuts,0);assert.match(f.read(g).text,/未切中/);const cp=M.checkpoint(g),text=f.read(g);assert.equal(act(g,f,{kind:'move',x:20,y:270}),false);assert.deepEqual(f.read(g),text);assert.deepEqual(M.checkpoint(g),cp);
});
check('New journey/field clears old warning; restored record states known cumulative facts',()=>{
 const{g,f}=replay(base.thorn.progress.resume);assert.equal(f.read(g).kind,'bad');const restored=M.restore(M.checkpoint(g));assert.match(f.read(restored).text,/本场已切2果、误核1枚，累计扣10分/);assert(!f.read(restored).text.includes('最近一刀'));const fresh=M.createGame(0);assert.equal(f.read(fresh).kind,'neutral');assert(!f.read(fresh).text.includes('误核1'));
});
check('Pause/cancel clears active gesture and does not resurrect a held blade',()=>{
 const g=M.createGame(),f=createStrokeFeedback();act(g,f,{kind:'start'});act(g,f,{kind:'down',x:30,y:30});assert.equal(f.read(g).kind,'active');M.pause(g);assert.equal(g.stroke,null);assert.match(f.read(g).text,/划切已取消/);M.pause(g);assert.equal(g.stroke,null);assert.equal(f.read(g).kind,'neutral');
});
check('Completed state reports totals and repeated reads do not settle again (LEGAL OFFLINE MODEL)',()=>{
 const{g,f}=replay(base.recovered.progress.resume);while(g.state==='playing')M.step(g);const old=structuredClone(g);assert.equal(g.stats.settlements,1);for(let i=0;i<20;i++)assert.match(f.read(g).text,/本场完成/);assert.deepEqual(g,old);
});
check('Repeated reads, marks and returned-copy edits never change game/checkpoint',()=>{
 const{g,f}=replay(base.thorn.progress.resume),old=structuredClone(g),cp=M.checkpoint(g);for(let i=0;i<20;i++){const text=f.read(g);text.text='changed';const mark=strokeMark(g);mark.score=999;assert.deepEqual(g,old);assert.deepEqual(M.checkpoint(g),cp);assert.match(f.read(g).text,/实扣10分/);}
});
console.log(JSON.stringify({passed:true,groups:checks.length,checks,method:'Actual UI-earned command replays plus separately labelled legal offline boundary sequences; presentation tracker never changes game, score, timing or checkpoint.'},null,2));
