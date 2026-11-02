export const BUILD='lighthouse-beats-five-1';
export const SAVE_KEY='classic-atlas.lighthouse-beats.v1';
const note=(at,lane,hold=0)=>({at,lane,hold});
export const SETS=[
 {name:'一 · 对岸回声',lesson:'先听两拍引子，再用左键应答四个等距木鼓。',bpm:90,notes:[2,3,4,5].map(x=>note(x,'left')),quota:3,holdQuota:0,maxErrors:2},
 {name:'二 · 双灯轮答',lesson:'左鼓与右铃交替。看颜色和方向，也要听两个音色。',bpm:90,notes:[note(2,'left'),note(3,'right'),note(4,'left'),note(5,'right'),note(6,'left'),note(7,'right')],quota:5,holdQuota:0,maxErrors:2},
 {name:'三 · 空拍传信',lesson:'中间留有空拍；等音符走到命中线再按，空拍乱按会记错。',bpm:88,notes:[note(2,'left'),note(3.5,'right'),note(5,'left'),note(6.5,'right'),note(8,'left'),note(9.5,'right')],quota:5,holdQuota:0,maxErrors:2},
 {name:'四 · 长灯不灭',lesson:'带尾巴的音符要按住一拍再松开；普通音符只需轻点。',bpm:86,notes:[note(2,'left',1),note(4,'right'),note(5,'left',1),note(7,'right'),note(8,'left')],quota:4,holdQuota:1,maxErrors:2},
 {name:'五 · 灯塔合奏',lesson:'结合左右轮答、半拍与长按，把最后一封信送到灯塔。',bpm:88,notes:[note(2,'left'),note(3,'right',1),note(5,'left'),note(5.5,'right'),note(7,'left',1),note(9,'right'),note(10,'left'),note(11,'right')],quota:6,holdQuota:1,maxErrors:3}
].map((x,i)=>({...x,id:i+1,beat:60/x.bpm}));
export const WINDOW=.20;
export function fresh(){return {schema:1,unlocked:1,completed:[],best:{},run:null};}
export function createRun(stage){const set=SETS[stage-1];if(!set)throw Error('unknown set');return {stage,set,phase:'ready',elapsed:0,grades:set.notes.map(()=>null),holding:null,hits:0,holds:0,errors:0,feedback:'先听两拍，再按键回应。'};}
export function durationOf(n,set){return n.hold*set.beat;}
export function dueOf(n,set){return n.at*set.beat;}
function finishIfNeeded(s){
  if(s.errors>s.set.maxErrors){s.phase='failed';s.feedback='失误超限。本段可重试，已完成曲段仍保留。';return;}
  const last=s.set.notes.at(-1),end=dueOf(last,s.set)+durationOf(last,s.set)+WINDOW+.35;
  if(s.elapsed<end)return;
  if(s.hits>=s.set.quota&&s.holds>=s.set.holdQuota){s.phase=s.stage===SETS.length?'complete':'won';s.feedback=s.phase==='complete'?'五段应答完成，灯塔收到回信。':'节拍送达，进入下一段。';}
  else{s.phase='failed';s.feedback=`命中 ${s.hits}/${s.set.quota}，长按 ${s.holds}/${s.set.holdQuota}，尚未达标。`;}
}
export function tick(s,dt){
  if(s.phase!=='running')return;
  s.elapsed+=Math.max(0,Math.min(.08,dt));
  s.set.notes.forEach((n,i)=>{if(s.grades[i]===null&&s.elapsed>dueOf(n,s.set)+WINDOW){s.grades[i]='miss';s.errors++;s.feedback='漏拍：留意下一个音符。';}});
  finishIfNeeded(s);
}
export function press(s,lane){
  if(s.phase!=='running'||!['left','right'].includes(lane))return false;
  if(s.holding){s.feedback='先松开长按音符。';return false;}
  const options=s.set.notes.map((n,i)=>({n,i,delta:Math.abs(s.elapsed-dueOf(n,s.set))})).filter(x=>s.grades[x.i]===null&&x.delta<=WINDOW).sort((a,b)=>a.delta-b.delta);
  const hit=options[0];if(!hit){s.errors++;s.feedback='空拍或时机未到。';finishIfNeeded(s);return false;}
  if(hit.n.lane!==lane){s.grades[hit.i]='miss';s.errors++;s.feedback='方向不对：看左鼓／右铃颜色。';finishIfNeeded(s);return false;}
  if(hit.n.hold){s.grades[hit.i]='holding';s.holding={index:hit.i,lane,start:s.elapsed};s.feedback='按住，等尾巴走完再松开。';return true;}
  s.grades[hit.i]='hit';s.hits++;s.feedback=hit.delta<.085?'正拍！':'接住了。';return true;
}
export function release(s,lane){
  if(!s.holding||s.holding.lane!==lane)return false;
  const h=s.holding,n=s.set.notes[h.index],held=s.elapsed-h.start,needed=durationOf(n,s.set);s.holding=null;
  if(s.phase!=='running'){s.grades[h.index]=null;return false;}
  if(held>=needed-.19&&held<=needed+.34){s.grades[h.index]='hit';s.hits++;s.holds++;s.feedback='长灯稳稳送达。';return true;}
  s.grades[h.index]='miss';s.errors++;s.feedback=held<needed-.19?'松得太早。':'按得太久。';finishIfNeeded(s);return false;
}
export function cancelHold(s,lane){if(!s.holding||s.holding.lane!==lane)return false;const h=s.holding;s.grades[h.index]=null;s.elapsed=Math.max(0,dueOf(s.set.notes[h.index],s.set)-.12);s.holding=null;s.feedback='触控中断，长按已取消；可重新对拍。';return true;}
export function pause(s){if(s.phase!=='running')return false;if(s.holding){const h=s.holding;s.grades[h.index]=null;s.elapsed=Math.max(0,dueOf(s.set.notes[h.index],s.set)-.12);s.holding=null;}s.phase='paused';s.feedback='已暂停；刷新后可从当前曲段继续。';return true;}
export function resume(s){if(s.phase!=='paused')return false;s.phase='running';s.feedback='继续听拍。';return true;}
export function finishRecord(r,s){if(!['won','complete'].includes(s.phase))return false;if(!r.completed.includes(s.stage))r.completed.push(s.stage);r.unlocked=Math.max(r.unlocked,Math.min(SETS.length,s.stage+1));const old=r.best[s.stage];if(!old||s.hits>old.hits||s.hits===old.hits&&s.errors<old.errors)r.best[s.stage]={hits:s.hits,errors:s.errors,holds:s.holds};r.run=s;return true;}
export function snapshot(s){if(!s)return null;return {stage:s.stage,phase:s.phase,elapsed:s.elapsed,grades:s.grades.map(g=>g==='holding'?null:g),hits:s.hits,holds:s.holds,errors:s.errors,holding:s.holding?{index:s.holding.index}:null};}
export function restore(raw){
  if(!raw||raw.schema!==1||!Number.isInteger(raw.unlocked)||raw.unlocked<1||raw.unlocked>SETS.length||!Array.isArray(raw.completed))return fresh();
  const r=fresh();r.unlocked=raw.unlocked;r.completed=[...new Set(raw.completed.filter(n=>Number.isInteger(n)&&n>=1&&n<=SETS.length))];r.best=raw.best&&typeof raw.best==='object'?raw.best:{};
  const src=raw.run;if(src&&Number.isInteger(src.stage)&&src.stage>=1&&src.stage<=r.unlocked&&['ready','running','paused','won','failed','complete'].includes(src.phase)){
    const s=createRun(src.stage);if(Array.isArray(src.grades)&&src.grades.length===s.grades.length&&src.grades.every(v=>v===null||v==='hit'||v==='miss'||v==='holding')){
      s.grades=src.grades.map(v=>v==='holding'?null:v);s.hits=s.grades.filter(x=>x==='hit').length;s.errors=Math.max(s.grades.filter(x=>x==='miss').length,Number(src.errors)||0);s.holds=Math.min(s.hits,Math.max(0,Number(src.holds)||0));
      s.elapsed=Math.max(0,Math.min(100,Number(src.elapsed)||0));if(src.holding&&Number.isInteger(src.holding.index)&&s.set.notes[src.holding.index])s.elapsed=Math.max(0,dueOf(s.set.notes[src.holding.index],s.set)-.12);
      s.phase=src.phase==='running'?'paused':src.phase;
      s.feedback=s.phase==='paused'?'从上次位置恢复，已自动暂停。':s.phase==='failed'?`本段失误 ${s.errors} 次，仍可重试。`:s.phase==='complete'?'五段合奏已完成，记录保持。':'已恢复本段。';r.run=s;
    }
  }return r;
}
