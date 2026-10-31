import { SAVE_KEY, STAGES, FIGHTERS, STEP, createGame, setOrder, start, pause, step } from './engine.mjs';
import { createCampaign, chooseStage, retryStage, recordWin, checkpointCampaign, restoreCampaign } from './campaign.mjs';
import { render } from '../three-seats-arena/render.mjs?v=three-seats-dual-order-art-1';

const $ = id => document.getElementById(id);
let campaign = createCampaign(), blocked = false, note = '', last = performance.now(), accumulator = 0, lastSaveTick = -1, renderedSetup = '';
const keys = new Set(), touches = new Map(), pending = { light: false, heavy: false };
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
try {
  const raw = localStorage.getItem(SAVE_KEY);
  if (raw) { const loaded = restoreCampaign(JSON.parse(raw));
    if (loaded) { campaign = loaded; note = '已恢复本战役；继续前可查看当前场次。'; }
    else { blocked = true; note = '原战役记录不能读取，尚未覆盖。可确认重新开始。'; } }
} catch { blocked = true; note = '存储不可读取；原记录尚未覆盖，可确认重新开始。'; }
function save() {
  if (blocked) return;
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(checkpointCampaign(campaign))); lastSaveTick = campaign.game.tick; }
  catch { note = '本次可继续游玩，但关闭页面可能无法保留进度。'; }
}
function clearInput() {
  keys.clear(); touches.clear(); pending.light = false; pending.heavy = false;
  document.querySelectorAll('[data-control]').forEach(b => b.classList.remove('active'));
}
function isHeld(action) { return keys.has(action) || [...touches.values()].some(a => a === action); }
function renderSetup() {
  const g=campaign.game, key=`${campaign.stage}|${campaign.unlocked}|${campaign.cleared.map(Boolean).join('')}|${g.order.join(',')}|${g.status}|${blocked}`;
  if (key === renderedSetup) return; renderedSetup=key;
  $('stages').replaceChildren();
  STAGES.forEach((stage,i) => {
    const b=document.createElement('button'); b.textContent=`${stage.title}${campaign.cleared[i] ? ' · 已过' : i > campaign.unlocked ? ' · 未解锁' : ' · 可挑战'}`;
    b.disabled=blocked || i>campaign.unlocked || !['ready','won','lost'].includes(g.status);
    b.setAttribute('aria-pressed', String(i===campaign.stage));
    b.onclick=()=>{if(chooseStage(campaign,i)){note='';clearInput();accumulator=0;save();update();}};
    $('stages').append(b);
  });
  $('order').replaceChildren();
  g.order.forEach((id,index) => {
    const row=document.createElement('div');row.className='order-row';
    const badge=document.createElement('span');badge.className='badge';badge.textContent=index+1;
    const desc=document.createElement('div');const label=document.createElement('b');label.textContent=`${FIGHTERS[id].name} · ${FIGHTERS[id].title}`;
    const detail=document.createElement('small');detail.textContent=`${FIGHTERS[id].maxHp} 余血 · ${id==='swift'?'快步近攻':id==='reach'?'长袖牵制':'挡后重击'}`;
    desc.append(label,detail);const sort=document.createElement('div');sort.className='sort';
    for(const [symbol,delta] of [['↑',-1],['↓',1]]){
      const b=document.createElement('button');b.textContent=symbol;
      b.disabled=blocked || g.status!=='ready' || index+delta<0 || index+delta>2;
      b.setAttribute('aria-label',`将 ${FIGHTERS[id].name} ${delta<0?'提前':'后移'}一位`);
      b.onclick=()=>{const next=[...g.order];[next[index],next[index+delta]]=[next[index+delta],next[index]];
        if(setOrder(g,next)){note='';save();update();}};sort.append(b);
    }
    row.append(badge,desc,sort);$('order').append(row);
  });
}
function readout(){
  const g=campaign.game;if(blocked)return note;
  if(g.status==='ready')return `本场对手：${g.enemyOrder.map(id=>FIGHTERS[id].name).join(' → ')}。${STAGES[campaign.stage].pattern}`;
  if(g.status==='paused')return `已暂停，双方动作冻结。${STAGES[campaign.stage].pattern}`;
  if(g.status==='between')return '下一席入场；仍站立的拳手保留余血。';
  if(g.status==='won'||g.status==='lost')return g.result;
  const e=g.actors.enemy,p=g.actors.player;
  const cue=e.phase==='startup'?`对方${FIGHTERS[e.id].name}正在${e.move==='heavy'?'重击':'轻击'}蓄势；浅金线为这一击的距离。`:
    e.phase==='recovery'?`对方${FIGHTERS[e.id].name}正在收招，可以接近反击。`:
    e.guard?`对方${FIGHTERS[e.id].name}正在防守；可停手等其松开。`:`对方${FIGHTERS[e.id].name}尚可行动。`;
  const self=p.phase==='startup'?'己方出招蓄势中。':p.phase==='recovery'?'己方正在收招，暂不能防守。':p.phase==='stunned'?'己方受击短暂停顿。':p.guard?'己方正在防守。':'己方可移动、攻击或防守。';
  return `${cue}\n${self}`;
}
function update(){
  const g=campaign.game,stage=STAGES[campaign.stage];renderSetup();
  $('stage-title').textContent=stage.title;
  $('stage-brief').textContent=stage.goal;$('stage-pattern').textContent=stage.pattern;
  $('player-line').textContent=g.order.map((id,i)=>`${FIGHTERS[id].name}${g.teams.player[i].hp<=0?' ×':''}`).join(' → ');
  $('enemy-line').textContent=g.enemyOrder.map((id,i)=>`${FIGHTERS[id].name}${g.teams.enemy[i].hp<=0?' ×':''}`).join(' → ');
  $('player-hp').textContent=g.active.player<3?`当前 ${FIGHTERS[g.order[g.active.player]].name} ${g.teams.player[g.active.player].hp}/${FIGHTERS[g.order[g.active.player]].maxHp}`:'三席已退';
  $('enemy-hp').textContent=g.active.enemy<3?`当前 ${FIGHTERS[g.enemyOrder[g.active.enemy]].name} ${g.teams.enemy[g.active.enemy].hp}/${FIGHTERS[g.enemyOrder[g.active.enemy]].maxHp}`:'三席已退';
  $('seat-count').textContent=`己 ${Math.min(3,g.active.player+1)} · 对 ${Math.min(3,g.active.enemy+1)}`;
  $('match-state').textContent=({ready:'排阵',running:'交手',between:'换席',paused:'暂停',won:'过关',lost:'失利'})[g.status];
  $('event').textContent=note || g.events.at(-1) || '观察距离、前摇和收招。';
  $('combat-readout').textContent=readout();
  $('setup').hidden=!['ready','won','lost'].includes(g.status);
  $('start').hidden=g.status!=='ready';$('start').disabled=blocked;
  $('pause').disabled=blocked || !['running','between','paused'].includes(g.status);
  $('pause').textContent=g.status==='paused'?'继续':'暂停';
  const ended=g.status==='won'||g.status==='lost';$('result').hidden=!ended;
  $('result').textContent=ended?`${stage.title}${g.status==='won'?'过关':'失利'}：${g.result}`:'';
  $('result-actions').hidden=!ended || (g.status==='won' && campaign.stage===STAGES.length-1);
  $('retry').hidden=g.status!=='lost';$('next').hidden=g.status!=='won' || campaign.stage===STAGES.length-1;
  const allDone=campaign.cleared.every(Boolean);$('review').hidden=!allDone;
  if(allDone){$('review').replaceChildren();const h=document.createElement('h3');h.textContent='潮门三场回顾';$('review').append(h);
    campaign.cleared.forEach((item,i)=>{const p=document.createElement('p');p.textContent=`${STAGES[i].title} · ${item.order.map(id=>FIGHTERS[id].name).join('→')} · 余血 ${item.hp.join('/')} · ${item.seconds} 秒`;$('review').append(p);});}
  render($('arena'),g,{reduced:reduced.matches});
}
function showConfirm(mode){
  if(blocked)mode='all';
  if(campaign.game.status==='running'||campaign.game.status==='between'){pause(campaign.game);clearInput();save();}
  $('confirm').dataset.mode=mode;
  $('confirm-title').textContent=mode==='retry'?'重试当前场？':mode==='choose'?'返回场次选择？':'重新开始三场？';
  $('confirm-copy').textContent=mode==='retry'?'本场按原排阵满血重来；已过场次保留。':mode==='choose'?'放弃当前场内进度，返回已解锁场次；已过记录保留。':'清除这份战役进度，从第一场重新排阵；公开单场及其他游戏存档不变。';
  $('confirm').showModal();update();
}
function confirmReset(){
  const mode=$('confirm').dataset.mode;$('confirm').close();
  if(mode==='all'){campaign=createCampaign();blocked=false;}
  else if(mode==='retry')retryStage(campaign);
  else campaign.game=createGame(campaign.stage);
  note='';clearInput();accumulator=0;last=performance.now();save();update();
}
$('start').onclick=()=>{if(!blocked&&start(campaign.game)){note='';clearInput();save();update();document.querySelector('.arena-wrap').scrollIntoView({block:'start',behavior:'instant'});}};
$('pause').onclick=()=>{if(pause(campaign.game)){note='';clearInput();last=performance.now();save();update();}};
$('retry').onclick=()=>showConfirm('retry');$('restart').onclick=()=>showConfirm('retry');$('choose').onclick=()=>showConfirm('choose');
$('next').onclick=()=>{if(campaign.game.status==='won'&&chooseStage(campaign,campaign.stage+1)){note='';clearInput();save();update();}};
$('cancel-reset').onclick=()=>$('confirm').close();$('confirm-reset').onclick=confirmReset;
$('help').onclick=()=>{if(campaign.game.status==='running'||campaign.game.status==='between'){pause(campaign.game);clearInput();save();}$('manual').showModal();update();};
$('close-manual').onclick=()=>$('manual').close();
const map={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',KeyJ:'light',KeyK:'heavy',KeyL:'guard'};
window.addEventListener('keydown',e=>{if(e.code==='KeyP'&&!e.repeat){e.preventDefault();$('pause').click();return;}
  if(!map[e.code]||campaign.game.status!=='running'||$('confirm').open||$('manual').open)return;
  e.preventDefault();if(e.repeat)return;const action=map[e.code];if(action==='light'||action==='heavy')pending[action]=true;else keys.add(action);});
window.addEventListener('keyup',e=>{if(map[e.code]){e.preventDefault();keys.delete(map[e.code]);}});
document.querySelectorAll('[data-control]').forEach(b=>{const action=b.dataset.control;
  const release=e=>{if(touches.get(e.pointerId)===action){touches.delete(e.pointerId);if(![...touches.values()].includes(action))b.classList.remove('active');}};
  b.addEventListener('pointerdown',e=>{if(campaign.game.status!=='running'||$('confirm').open||$('manual').open)return;
    e.preventDefault();b.setPointerCapture(e.pointerId);touches.set(e.pointerId,action);b.classList.add('active');
    if(action==='light'||action==='heavy')pending[action]=true;});
  b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);
});
window.addEventListener('blur',()=>{clearInput();if(['running','between'].includes(campaign.game.status)){pause(campaign.game);save();update();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(['running','between'].includes(campaign.game.status)){pause(campaign.game);save();update();}}});
window.addEventListener('pagehide',()=>{clearInput();save();});
function frame(now){const delta=Math.min(.08,Math.max(0,(now-last)/1000));last=now;
  const g=campaign.game;
  if(['running','between'].includes(g.status)&&!$('confirm').open&&!$('manual').open){accumulator+=delta;
    while(accumulator>=STEP){const control={left:isHeld('left'),right:isHeld('right'),guard:isHeld('guard'),light:pending.light,heavy:pending.heavy};
      const previous=g.status;step(g,control,STEP);pending.light=false;pending.heavy=false;accumulator-=STEP;
      if(g.status==='won')recordWin(campaign);
      if(g.status!==previous||g.tick-lastSaveTick>=60)save();}
    update();}else accumulator=0;
  requestAnimationFrame(frame);
}
window.__threeCampaign=Object.freeze({state:()=>checkpointCampaign(campaign)});
update();requestAnimationFrame(frame);
