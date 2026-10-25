import * as Legacy from './legacy-scene.mjs';
import {LIMIT,RESPONSE_TIME,validMark,clone} from './marks.mjs';
const STEP=.1,MAX_COMMANDS=4096;
export function createScene() {
  const g=Legacy.createScene();g.version=2;
  g.art.note.marks=[];g.art.sketch.marks=[];g.art.sketch.responses=[];
  g.paper={note:{done:false},sketch:{done:false}};
  return g;
}
export function activePaper(g) {
  if(g.version!==2||g.state!=='playing'||g.history.length>=MAX_COMMANDS)return null;
  if(g.phase==='co-creating'&&!g.paper.sketch.done)return 'sketch';
  if(g.phase==='separate'&&!g.paper.note.done&&(g.choice!=='now'||g.request.status==='cancelled'))return 'note';
  return null;
}
export function command(g,type,payload) {
  if(g.version===1)return Legacy.command(g,type);
  if(!['mark','undo-mark','finish-paper'].includes(type)) {
    const result=Legacy.command(g,type);
    if(result.ok&&type==='now')g.art.sketch.inputDriven=true;
    return result;
  }
  const target=activePaper(g);
  if(g.history.length>=MAX_COMMANDS)return {ok:false,message:'本次操作记录已满，笔迹会保留；请暂停后重新安排这个片段。'};
  if(!target)return {ok:false,message:'现在不能落墨；已落下的笔迹会保留。'};
  const marks=g.art[target].marks;
  if(type==='mark') {
    if(!validMark(payload)||marks.length>=LIMIT)return {ok:false,message:'纸上最多留两笔；可以撤回最近一笔，或收笔留白。'};
    marks.push(clone(payload));
    if(target==='sketch') {
      g.art.sketch.responses.push(0);g.art.sketch.inkProgress.a=marks.length*3;
      if(!g.art.sketch.contributors.includes('a'))g.art.sketch.contributors.push('a');
    }
    Legacy.event(g,target==='sketch'?'叶影落下了，阿沐顺着你的叶柄补一段枝线。':'这枚叶影留在了手记上。可以再添一笔，也可以收笔留白。');
  } else if(type==='undo-mark') {
    if(!marks.length)return {ok:false,message:'纸上还没有需要撤回的笔。'};
    marks.pop();if(target==='sketch'){g.art.sketch.responses.pop();g.art.sketch.inkProgress.a=marks.length*3;if(!marks.length)g.art.sketch.contributors=['b'];}
    Legacy.event(g,'最近一组笔迹已撤回，留白也回来了。');
  } else {
    if(!marks.length)return {ok:false,message:'先亲手留下一笔，再收笔。没有时间限制。'};
    g.paper[target].done=true;
    if(target==='note')g.art.note.creationComplete=true;
    Legacy.event(g,target==='sketch'?'你收起了笔，等这段枝线接好，再回去续写手记。':'手记的小图已经收好。');
  }
  g.history.push({tick:g.ticks,type,...(type==='mark'?{mark:clone(payload)}:{})});
  return {ok:true,message:g.message};
}
export const canCancel=Legacy.canCancel;
export const canResume=Legacy.canResume;
function tick(g) {
  if(g.state!=='playing')return false;
  g.ticks++;g.time=Legacy.round(g.ticks*STEP);
  if(['meeting-now','meeting-later'].includes(g.phase)) {
    if(Legacy.walk(g.actors[0])) {
      const later=g.phase==='meeting-later';g.phase=later?'sharing':'co-creating';
      if(later)g.art.note.location='bench';
      for(const a of g.actors)a.current=Legacy.job('chat','working',6,6,'bench');
      Legacy.event(g,later?'两份作品放到一起，叶影还在你亲手安排的位置。':'纸已经摊好。拖出你的叶影，阿沐会顺着它补画。');
    }
  } else if(g.phase==='co-creating') {
    const next=g.art.sketch.responses.findIndex(p=>p<1);
    if(next>=0)g.art.sketch.responses[next]=Math.min(1,Math.round((g.art.sketch.responses[next]+STEP/RESPONSE_TIME)*1000)/1000);
    if(g.paper.sketch.done&&g.art.sketch.responses.every(p=>p===1)) {
      g.art.sketch.mode='together';g.art.sketch.progress=6;g.art.sketch.inkProgress.b=6;
      Legacy.occupy(g,'bench',null);Legacy.returnToDesk(g);
    }
  } else if(g.phase==='sharing') {
    g.art.share.progress=Math.min(6,Legacy.round(g.art.share.progress+STEP));
    for(const a of g.actors)a.current.remaining=6-g.art.share.progress;
    if(g.art.share.progress>=6){g.art.share.completed=true;Legacy.settle(g);}
  } else if(g.phase==='returning') {
    Legacy.sketch(g,false);
    if(g.actors[1].current)g.actors[1].current.remaining=Math.max(0,6-g.art.sketch.progress);
    if(Legacy.walk(g.actors[0])) {g.art.note.location='desk';g.phase='separate';Legacy.ownActivities(g);}
  } else if(g.phase==='separate') {
    Legacy.workNote(g);Legacy.sketch(g,false);
    const needsPersonal=g.choice!=='now'||g.request.status==='cancelled';
    if(needsPersonal&&!g.paper.note.done)g.actors[0].current=Legacy.job('work','working',1,1,'desk');
    if(g.actors[1].current)g.actors[1].current.remaining=Math.max(0,6-g.art.sketch.progress);
    if(g.art.note.finished&&g.art.sketch.progress>=6&&(!needsPersonal||g.paper.note.done)) {
      g.art.note.creationComplete=true;
      if(g.choice==='later'&&g.request.status!=='cancelled')Legacy.meet(g,true);else Legacy.settle(g);
    }
  }
  return true;
}
export function update(g,dt) {
  if(g.version===1)return Legacy.update(g,dt);
  if(g.state!=='playing'||!Number.isFinite(dt)||dt<=0)return;
  g.accumulator+=Math.min(.5,dt);
  while(g.accumulator+1e-9>=STEP&&g.state==='playing'){g.accumulator=Math.max(0,g.accumulator-STEP);tick(g);}
  if(g.state!=='playing')g.accumulator=0;
}
export const snapshot=Legacy.snapshot;
export function summary(g) {
  const result=Legacy.summary(g);
  if(g.version===2)result.noteFinished=result.noteFinished&&!!g.art.note.creationComplete;
  return result;
}
export function checkpoint(g) {
  if(g.version===1)return Legacy.checkpoint(g);
  return {format:'windowlife-request-checkpoint',version:2,ticks:g.ticks,accumulator:g.accumulator,commands:clone(g.history)};
}
export function restore(cp) {
  if(cp?.version===1)return Legacy.restore(cp);
  try {
    if(cp?.format!=='windowlife-request-checkpoint'||cp.version!==2||!Number.isInteger(cp.ticks)||cp.ticks<0||cp.ticks>100000||!Number.isFinite(cp.accumulator)||cp.accumulator<0||cp.accumulator>=STEP+1e-8||!Array.isArray(cp.commands)||cp.commands.length>MAX_COMMANDS+1)return null;
    const g=createScene();
    for(const c of cp.commands) {
      const expected=c?.type==='mark'?'mark,tick,type':'tick,type';
      if(!c||Object.keys(c).sort().join(',')!==expected||!Number.isInteger(c.tick)||c.tick<g.ticks||c.tick>cp.ticks)return null;
      while(g.ticks<c.tick)if(!tick(g))return null;
      if(!command(g,c.type,c.mark).ok)return null;
    }
    while(g.ticks<cp.ticks)if(!tick(g))return null;
    if(!['playing','paused'].includes(g.state)&&cp.accumulator!==0)return null;
    g.accumulator=cp.accumulator;
    if(g.state==='playing'&&!command(g,'pause').ok)return null;
    return g;
  } catch{return null;}
}
