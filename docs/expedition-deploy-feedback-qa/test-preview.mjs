import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as M from '../../versions/v2/games/expedition/engine.mjs';
import {deploymentPreview} from '../../versions/v2/games/expedition/deployment-feedback.mjs';
const checks=[],check=(name,fn)=>{fn();checks.push(name);};
const cmd=(s,c)=>assert(M.command(s,c).ok),ready=()=>{const s=M.createGame();cmd(s,{type:'start'});return s;};
const deploy=(s,front,count=1)=>cmd(s,{type:'deploy',front,count});
const before=JSON.parse(fs.readFileSync('docs/expedition-deploy-feedback-qa/before-verification.json','utf8'));
const local=JSON.parse(fs.readFileSync('docs/expedition-deploy-feedback-qa/local-verification.json','utf8'));
check('Preview matches units actually selected in ten ordinaryUI-earned deployments',()=>{
 for(const action of [...before.actions,...local.actions]){const cp=action.after,last=cp.log.at(-1),s=M.restore({...cp,tick:last.tick,log:cp.log.slice(0,-1)}),plan=deploymentPreview(s,action.front),actual=M.restore(cp);assert(plan.ok);for(const move of plan.moves){const unit=actual.guards.find(u=>u.id===move.id);assert.equal(unit.front,'travel');assert.equal(unit.from,move.from);assert.equal(unit.target,move.to);assert.equal(unit.travelDuration,move.seconds);}assert.equal(plan.moves.length,1);}
});
check('Sufficient reserve shows one guard from camp,4seconds,2-to1',()=>{
 const s=ready(),p=deploymentPreview(s,'north');assert.deepEqual(p.moves,[{id:1,from:'reserve',to:'north',seconds:4}]);assert.deepEqual(p.costs,[{from:'reserve',before:2,after:1}]);assert.equal(p.stationed,0);
});
check('Insufficient reserve for batch request keeps engine camp-first and mixed4/7second costs (OFFLINE)',()=>{
 const s=ready();deploy(s,'north');M.step(s,16);assert.equal(deploymentPreview(s,'south').moves[0].id,2);const p=deploymentPreview(s,'south',2);assert.deepEqual(p.moves.map(x=>[x.id,x.from,x.seconds]).sort((a,b)=>a[0]-b[0]),[[1,'north',7],[2,'reserve',4]]);assert.deepEqual(p.costs.sort((a,b)=>a.from.localeCompare(b.from)),[{from:'north',before:1,after:0},{from:'reserve',before:1,after:0}]);
});
check('Equal front counts retain engine id tie-break and expose empty-source cost (OFFLINE)',()=>{
 const s=ready();deploy(s,'north');deploy(s,'south');M.step(s,16);const p=deploymentPreview(s,'reserve');assert.equal(p.moves[0].id,1);assert.equal(p.moves[0].from,'north');const q=deploymentPreview(s,'north');assert.equal(q.moves[0].id,2);assert.deepEqual(q.costs,[{from:'south',before:1,after:0}]);assert.equal(q.stationed,1);
});
check('Marching, destination-stationed and naturally defeated guards are excluded (OFFLINE)',()=>{
 const s=ready();deploy(s,'north');deploy(s,'north');assert.equal(deploymentPreview(s,'south').ok,false);M.step(s,16);assert.equal(deploymentPreview(s,'north').ok,false);
 const t=ready();deploy(t,'north');deploy(t,'south');M.step(t,400);assert(t.guards.find(x=>x.id===1).hp===0);assert.equal(deploymentPreview(t,'south').ok,false);assert.deepEqual(deploymentPreview(t,'reserve').moves.map(x=>x.id),[2]);
});
check('Unavailable and invalid requests expose engine reason without partial movement',()=>{
 const s=ready(),old=structuredClone(s);for(const[front,count]of [['north',3],['north',0],['none',1]]){const p=deploymentPreview(s,front,count);assert.equal(p.ok,false);assert(p.reason);assert.deepEqual(p.moves,[]);assert.deepEqual(s,old);}
});
check('Ready/terminal stay unavailable while paused can be read for planning (OFFLINE)',()=>{
 const s=M.createGame();assert.equal(deploymentPreview(s,'north').ok,false);cmd(s,{type:'start'});cmd(s,{type:'pause'});assert.equal(deploymentPreview(s,'north').ok,true);cmd(s,{type:'resume'});M.step(s,480);assert.equal(s.status,'lost');assert.equal(deploymentPreview(s,'north').ok,false);
});
check('Repeated previews and changed return data cannot mutate live state or legacy checkpoint',()=>{
 const cp=before.actions[2].before,s=M.restore(cp),old=structuredClone(s),record=M.checkpoint(s);for(let i=0;i<20;i++){const p=deploymentPreview(s,'south');if(p.moves[0])p.moves[0].id=999;assert.deepEqual(s,old);assert.deepEqual(M.checkpoint(s),record);}assert.deepEqual(M.checkpoint(M.restore(record)),record);
});
console.log(JSON.stringify({passed:true,groups:checks.length,checks,method:'Ten actualUI-earned deployment records plus separately labelled legal offline engine sequences. No browser state/save/time injection; original engine unchanged.'},null,2));
