import {createGame,input,partner,SPECIES,trialElement,trialIntent} from './model.mjs';
const copy=x=>JSON.parse(JSON.stringify(x));
const actions={trialAttack:'轻击',trialSkill:'技能',trialGuard:'守息',trialHeal:'露莓',trialSwitch:'换位'};

// A display-only replay advances with new commands, once per command. It never
// changes the current game or record and keeps only the latest three beat rows.
export function createTrialFeedbackReader(){
 let owner=null,replay=null,processed=0,rows=[],failed=false;
 return state=>{
  try{
   if(state?.version!==3||!state.origin||!Array.isArray(state.commands)||state.commands.length>4000)return {valid:false,attempt:0,rows:[]};
   if(owner!==state||processed>state.commands.length){owner=state;replay=createGame(undefined,state.origin);processed=0;rows=[];failed=!replay;}
   if(failed)return {valid:false,attempt:0,rows:[]};
   while(processed<state.commands.length){
    const command=state.commands[processed],t=replay.trial,kind=command.kind;
    let before=null;
    if(t&&actions[kind]){
     const id=kind==='trialSwitch'?command.arg:replay.base.active,p=partner(replay.base,id);
     before={id,leader:replay.base.active,beat:t.turn+1,attempt:replay.journey.attempts,element:trialElement(replay),intent:trialIntent(replay),hp:p.hp,energy:p.energy,surplus:t.hp,calm:t.calm,berries:t.berries};
    }
    if(!input(replay,command)){failed=true;return {valid:false,attempt:0,rows:[]};}
    processed++;
    if(kind==='trialStart')rows=[];
    if(before){
     const p=partner(replay.base,before.id),afterTrial=replay.trial||replay.journey.lastAttempt;
     const response=replay.base.notice.match(/回响的(?:试探|回涌)造成\d+伤害(?:，护盾吸收\d+)?。/)?.[0]||(replay.base.notice.includes('回响正在蓄势，没有来招。')?'回响正在蓄势，没有来招。':'');
     rows.push({revision:replay.revision,kind,...before,after:{hp:p.hp,energy:p.energy,surplus:replay.trial?afterTrial.hp:afterTrial.remainingHP,calm:afterTrial.calm,berries:replay.trial?afterTrial.berries:afterTrial.berriesLeft,leader:replay.base.active},response});
     rows=rows.slice(-3);
    }
   }
   return {valid:true,attempt:replay.journey.attempts,rows:copy(rows)};
  }catch{failed=true;return {valid:false,attempt:0,rows:[]};}
 };
}
export function trialFeedbackText(row){
 const name=SPECIES[row.id].name,a=row.after;
 const label=row.kind==='trialSwitch'?'换位 '+SPECIES[row.leader].name+' → '+name:name+' · '+(row.kind==='trialSkill'?SPECIES[row.id].skill:actions[row.kind]);
 const parts=[name+'能量 '+row.energy+'→'+a.energy,'体力净值 '+row.hp+'→'+a.hp,'余势 '+row.surplus+'→'+a.surplus];
 if(row.calm!==a.calm)parts.push('安心 '+row.calm+'→'+a.calm);
 if(row.berries!==a.berries)parts.push('露莓 '+row.berries+'→'+a.berries);
 if(row.kind!=='trialSwitch'&&row.leader!==a.leader)parts.push('前方变为'+SPECIES[a.leader].name);
 return {label,changes:parts.join('；'),response:row.response};
}
export function trialNotice(state,feedback){
 const latest=feedback.rows.at(-1),notice=state.base.notice;
 return latest?.revision===state.revision&&latest.kind==='trialGuard'&&latest.energy===latest.after.energy?notice.replace('能量+1','能量+0（已达上限）'):notice;
}
