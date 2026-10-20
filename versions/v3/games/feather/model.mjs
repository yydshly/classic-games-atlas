import * as V2 from '../../../v2/games/feather/model.mjs';
export const SAVE_KEY = 'classic-atlas.feather.journey.v3';
export const LEGACY_SAVE_KEY = V2.SAVE_KEY;
export const {SPECIES, ELEMENTS, maxHP, power, partner, active, factor} = V2;
const copy = value => JSON.parse(JSON.stringify(value));
export const TRIAL = Object.freeze({name:'浅滩回响',hp:190,turns:24,probe:20,surge:64});

// A v3 record is a frozen v2 origin plus v3 commands, never a modified v2 replay.
export function createGame(seed, origin = null) {
  const base = origin ? V2.restore(origin) : V2.createGame(seed);
  if (!base) return null;
  const adjusted = base.log.some(c => c.kind === 'team' && ['bud','fin'].includes(c.arg));
  return {version:3, origin:copy(origin || V2.checkpoint(base)), revision:0, commands:[], base,
    journey:{adjusted,attempts:0,completed:false,lastAttempt:null}, trial:null, ending:null};
}
export const phase = s => s.ending ? 'ending' : s.trial ? 'trial' : s.base.phase;
export function progress(s) {
  const b=s.base;
  return {discovered:b.roster.some(p=>['bud','fin'].includes(p.id)), adjusted:s.journey.adjusted,
    grown:b.roster.some(p=>p.rank===1), completed:s.journey.completed};
}
export function readiness(s) {
  if (s.journey.completed) return '浅滩冒险已完成，可以自由出行。';
  if (phase(s)!=='camp') return '先回营，再一起准备。';
  const p=progress(s);
  if (!p.discovered) return '先结识任意一位野外新伙伴，并一起回营。';
  if (!p.adjusted) return '在营地把任意一位新伙伴换入队伍，试试不同的搭配。';
  if (!p.grown) return '让任意伙伴参与两次有结果的相遇，获得一次成长，再回营。';
  if (s.base.team.length!==2) return '选好两位同行伙伴。终挑战不限定哪一位。';
  return '';
}
export const trialElement = s => ['moss','moss','water','water','wind','wind'][s.trial.turn%6];
export const trialIntent = s => ['试探','蓄势','回涌'][s.trial.turn%3];
export function trialIncoming(s) {
  if (!s.trial || trialIntent(s)==='蓄势') return 0;
  const t=s.trial, raw=trialIntent(s)==='回涌'?TRIAL.surge:TRIAL.probe;
  return Math.floor(raw*factor(trialElement(s),SPECIES[s.base.active].element)*(t.weak>0?.5:1)*(t.calm>=30?.65:1));
}
export function trialHit(s, special=false) {
  return Math.min(s.trial.hp,Math.floor((special?10:power(active(s.base)))*factor(SPECIES[s.base.active].element,trialElement(s))));
}
export function allowed(s, kind, arg) {
  if (s.commands.length>=4000) return '本版记录已满，请在页底确认新旅途。旧版记录不会变化。';
  if (kind==='continue') return s.ending?'':'当前没有结局总结';
  if (kind==='trialStart') return readiness(s);
  if (s.ending) return '先读完旅途总结，回营后可自由出行';
  if (!s.trial) return V2.allowed(s.base,kind,arg);
  const b=s.base,p=active(b);
  if (['trialAttack','trialGuard','trialRetreat'].includes(kind)) return '';
  if (kind==='trialSkill') return p.energy>=2?'':'需要2能量；守息可回复1';
  if (kind==='trialHeal') return s.trial.berries<=0?'两颗露莓已用尽':p.hp>=maxHP(p)?'当前伙伴体力已满':'';
  if (kind==='trialSwitch') return b.team.includes(arg)&&arg!==b.active&&partner(b,arg).hp>0?'':'请选择另一位仍有体力的伙伴';
  return '终挑战中请使用当前行动，或安全回营';
}
function notice(s,text) { s.base.notice=text; }
function finishTrial(s, outcome) {
  const t=s.trial,b=s.base,grown=[];
  if (outcome!=='retreated') for (const id of t.participants) {
    const p=partner(b,id);p.encounters++;p.xp=Math.min(2,p.xp+1);
    if (p.xp===2&&!p.rank) {p.rank=1;p.hp=Math.min(maxHP(p),p.hp+8);grown.push(id);}
  }
  const result={attempt:s.journey.attempts,outcome,turns:t.turn,team:copy(t.team),participants:copy(t.participants),
    actions:copy(t.actions),calm:t.calm,remainingHP:t.hp,grown,berriesLeft:t.berries};
  s.journey.lastAttempt=result;s.trial=null;
  if (outcome==='completed') {
    s.journey.completed=true;
    s.ending={...copy(result),outings:b.outing,companions:b.roster.map(p=>p.id),grown:b.roster.filter(p=>p.rank).map(p=>p.id)};
    notice(s,'回响散成细小星光。你们一起完成了这段浅滩冒险，新的同行已经成为归途。');
  } else notice(s,(outcome==='defeated'?'两位伙伴都需要休息，已经安全回营。':outcome==='timeout'?'24拍结束，回响仍未平息，已经回营。':'你们选择回营重新准备。')+' 已结识的伙伴和成长全部保留；整备免费，不必重新招募。');
}
function actTrial(s, kind, arg) {
  const b=s.base,t=s.trial;let p=active(b);t.actions[kind]=(t.actions[kind]||0)+1;
  if (kind==='trialRetreat') {finishTrial(s,'retreated');return;}
  let text='';
  if (kind==='trialAttack') {const hit=trialHit(s);t.hp-=hit;text=SPECIES[p.id].name+'轻击，消去'+hit+'点余势。';}
  if (kind==='trialGuard') {p.energy=Math.min(3,p.energy+1);p.shield=16;text=SPECIES[p.id].name+'守息：能量+1、本次16护盾。';}
  if (kind==='trialHeal') {t.berries--;const hp=Math.min(26,maxHP(p)-p.hp);p.hp+=hp;text='分享露莓恢复'+hp+'体力。';}
  if (kind==='trialSwitch') {b.active=arg;p=active(b);t.participants=[...new Set([...t.participants,arg])];text=SPECIES[arg].name+'换到前方；换位也占一拍。';}
  if (kind==='trialSkill') {
    p.energy-=2;
    if (p.id==='a') {const hit=trialHit(s,true);t.hp-=hit;t.weak=2;text='缠风消去'+hit+'点余势，接下来两次来招减半。';}
    if (p.id==='b') {const hp=Math.min(28,maxHP(p)-p.hp);p.hp+=hp;text='苔息恢复'+hp+'体力。';}
    if (p.id==='c') {const hp=Math.min(18,maxHP(p)-p.hp);p.hp+=hp;t.calm=Math.min(60,t.calm+10);text='澄心恢复'+hp+'体力，合奏安心+10。';}
    if (p.id==='bud') {t.calm=Math.min(60,t.calm+22);t.weak=1;text='晶雾让合奏安心+22，下一次来招减半。';}
    if (p.id==='fin') {const hit=trialHit(s,true);t.hp-=hit;p.shield=18;text='潮护消去'+hit+'点余势，并获得18护盾。';}
  }
  const intent=trialIntent(s),raw=trialIncoming(s);t.turn++;
  if (t.hp===0) {notice(s,text+' 浅滩回响平息了。');finishTrial(s,'completed');return;}
  const absorbed=Math.min(p.shield,raw),damage=Math.min(p.hp,raw-absorbed);p.shield=0;p.hp-=damage;
  if (t.weak>0&&intent!=='蓄势') t.weak--;
  notice(s,text+(intent==='蓄势'?' 回响正在蓄势，没有来招。':' 回响的'+intent+'造成'+damage+'伤害'+(absorbed?'，护盾吸收'+absorbed:'')+'。'));
  if (p.hp===0) {
    const other=b.team.map(id=>partner(b,id)).find(q=>q.hp>0);
    if (!other) {finishTrial(s,'defeated');return;}
    b.active=other.id;t.participants=[...new Set([...t.participants,other.id])];notice(s,b.notice+' '+SPECIES[other.id].name+'接替前方。');
  }
  if (t.turn>=TRIAL.turns) finishTrial(s,'timeout');
}
export function input(s,c) {
  if (!c||c.revision!==s.revision||typeof c.kind!=='string'||allowed(s,c.kind,c.arg)) return false;
  const {kind,arg}=c;
  if (kind==='continue') {s.ending=null;notice(s,'浅滩冒险已经完成。仍可自由出行、结识另一位伙伴；不再增加地区或成长等级。');}
  else if (kind==='trialStart') {
    const b=s.base;s.journey.attempts++;
    for (const p of b.roster) {p.hp=maxHP(p);p.energy=3;p.shield=0;}
    s.trial={hp:TRIAL.hp,maxHP:TRIAL.hp,turn:0,calm:0,weak:0,berries:2,team:copy(b.team),participants:[b.active],actions:{}};
    notice(s,'浅滩回响开始：24拍内消去'+TRIAL.hp+'余势。属性每两拍变化；试探、蓄势、回涌循环。看清预告，再决定换位、守息或技能。');
  } else if (s.trial) actTrial(s,kind,arg);
  else {
    if (!V2.input(s.base,{kind,arg,revision:s.base.revision})) return false;
    if (kind==='team'&&['bud','fin'].includes(arg)&&s.base.team.includes(arg)) s.journey.adjusted=true;
  }
  s.commands.push(copy(c));s.revision++;return true;
}
export const checkpoint=s=>({version:3,origin:copy(s.origin),commands:copy(s.commands)});
export function restore(cp) {
  try {
    if (!cp||cp.version!==3||!cp.origin||!Array.isArray(cp.commands)||cp.commands.length>4000) return null;
    const s=createGame(undefined,cp.origin);if (!s) return null;
    for (const c of cp.commands) if (!input(s,c)) return null;
    return s;
  } catch {return null;}
}
export function invariants(s) {
  const b=s.base,t=s.trial;
  return {...V2.invariants(b),version:s.version===3,journeyRevision:s.revision===s.commands.length,
    terminal:!s.ending||s.journey.completed,trialPhase:!t||(!s.ending&&b.phase==='camp'&&b.team.length===2),
    trial:!t||(t.hp>0&&t.hp<=TRIAL.hp&&t.turn>=0&&t.turn<TRIAL.turns&&t.calm>=0&&t.calm<=60&&t.berries>=0&&t.berries<=2),
    completed:s.journey.completed===!!(s.ending||s.journey.lastAttempt?.outcome==='completed')};
}
export {V2};
