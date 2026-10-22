import {createGame,build,upgrade,sell,nextWave,deploy,update,snapshot,checkpoint,restore,TYPES,WAVES,MAPS,sitesFor,point,mapFor} from './engine.mjs';
import {CampaignStore,fresh,enter,retry,settle} from './campaign.mjs';
import {Renderer} from './renderer.mjs';
const $=s=>document.querySelector(s);
let storage;try{storage=localStorage;}catch{}
const store=new CampaignStore(storage);let c=store.data,g=c.resume?restore(c.resume):createGame(c.mapIndex),selected=null,aim=false,sound=false,audio=null,previous=performance.now(),lastUI=0,lastSave=0,returnFocus=null;
if(c.phase==='battle'&&g.state==='playing')g.state='paused';
const renderer=new Renderer($('#field'));
function say(t){$('#status').textContent=t;}
function tone(hz=350){if(!sound)return;try{audio??=new AudioContext();audio.resume();const o=audio.createOscillator(),v=audio.createGain();o.connect(v);v.connect(audio.destination);o.frequency.value=hz;v.gain.setValueAtTime(.025,audio.currentTime);v.gain.exponentialRampToValueAtTime(.0001,audio.currentTime+.1);o.start();o.stop(audio.currentTime+.1);}catch{}}
function save(){if(c.phase!=='briefing')c.resume=checkpoint(g);store.save(c);saveHint();}
function saveHint(){const reason=store.reason;$('#save').classList.toggle('save-warning',!!reason);const message=reason==='corrupt'?'本战役旧档无法读取，已保留原始内容且禁止覆盖。仍可游玩，当前进度刷新后可能丢失。':reason==='read'?'无法读取本地存储；仍可游玩，刷新后可能丢失当前进度。':reason==='write'?'保存未成功：仍可游玩，但刷新可能丢失当前进度；旧的有效存档未删除。':'独立战役存档；活动局刷新先暂停，关间与最终战报保留。原单图纪录不受影响。';if($('#save').textContent!==message)$('#save').textContent=message;}
function mapUI(){const m=mapFor(g);$('#sites').innerHTML=sitesFor(g).map(s=>`<button data-site="${s.id}" aria-label="选择 ${s.id} 号塔位">${s.id}</button>`).join('');$('#map-note').textContent=m.hint;}
function hud(){
 const active=c.phase==='battle',running=active&&g.state==='playing',terminal=['won','lost'].includes(g.state),m=mapFor(g),t=g.towers.find(t=>t.id===selected);
 $('#progress').innerHTML=MAPS.map((m,i)=>`<li ${i===c.mapIndex?'aria-current="step"':''} class="${i<c.results.length?'done':''}">${i<c.results.length?'✓ ':''}${i+1} · ${m.name}</li>`).join('');
 $('#campaign-title').textContent=c.phase==='complete'?'三隘守住 · 战役完成':c.phase==='between'?`${m.name} 已守住`:`第 ${c.mapIndex+1} 隘 · ${m.name}`;
 $('#campaign-note').textContent=c.phase==='complete'?'守军穿过三道山口。下面是这次旅程的战报；可留在战场回看，或回大厅。新战役将重新从第一隘出发。':c.phase==='between'?`下一隘：${MAPS[c.mapIndex+1].name}。${MAPS[c.mapIndex+1].objective} 下一图从 230 金 / 12 城门重新布防，本图战报已经保留。`:c.phase==='briefing'?`${m.objective} 每图四波，守住城门后再出发。先开始本图，选择塔位建造。`:g.state==='lost'?'城门已失守。重试只重开当前图，前面完成的战报继续保留。':g.state==='paused'?'战斗已暂停。点“继续”后时间才推进；可以先查看塔位与说明。':m.objective;
 $('#advance').hidden=!['briefing','between'].includes(c.phase);$('#advance').textContent=c.phase==='between'?'前往下一隘 →':'开始第一隘';
 $('#summary').hidden=!c.results.length;$('#summary').innerHTML=c.results.map(r=>`<li>${MAPS[r.mapIndex].name}：城门 ${r.hp}/12 · 击退 ${r.kills} · ${Math.floor(r.time)} 秒（含布防）</li>`).join('');
 $('#gold').textContent=g.gold;$('#hp').textContent=`${g.hp}/12`;$('#wave').textContent=`${g.wave}/4`;$('#pause').textContent=g.state==='paused'?'继续':'暂停';$('#pause').disabled=!active||terminal;$('#speed').textContent=`${g.speed}×`;$('#speed').disabled=!active||terminal;
 const w=WAVES[g.phase==='build'?g.wave:g.wave-1];$('#wave-title').textContent=g.state==='won'?'四波全清 · 本隘守住':g.state==='lost'?'城门失守 · 可重新布防':`${g.phase==='build'?'下一波':'交战中'}：${w?.name||'已完成'}`;
 $('#wave-hint').textContent=terminal?g.state==='won'?`城门 ${g.hp}/12；${c.phase==='complete'?'三图战报见上方。':'上方可前往下一隘。'}`:'检查专精与盾卫位置，再试当前图。':w?.hint||'';
 $('#next').textContent=g.state==='won'?'本隘已完成':g.state==='lost'?'本隘已失守':g.phase==='wave'?'交战中':`开始第 ${Math.min(4,g.wave+1)} 波`;$('#next').disabled=!running||g.phase!=='build';
 $('#reinforce').textContent=terminal?'本隘战斗已结束':aim?'点道路落地 · 正在瞄准':`部署盾卫 · ${g.cooldown>0?Math.ceil(g.cooldown)+'秒':'就绪'}`;$('#reinforce').disabled=!running||g.phase!=='wave'||g.cooldown>0;$('#reinforce').setAttribute('aria-pressed',String(aim));$('#rally').hidden=!aim;
 $('#selection').textContent=t?`${t.id}号 · ${TYPES[t.type].name}`:selected?`${selected}号 · 空塔位`:'选择一个塔位';$('#details').textContent=t?`射程 ${TYPES[t.type].range} · 伤害 ${TYPES[t.type].damage} · 间隔 ${TYPES[t.type].interval} 秒。${t.type==='snare'?'最多3目标，降至38%速度1.8秒。':t.type==='heavy'?'无视护甲，留意快骑穿过射击空档。':t.type==='mortar'?'半径52范围伤害，配合减速聚敌。':'可花110金二选一专精。'}`:'点地图编号或下方按钮，选择后显示射程。战斗中也能建造。';
 $('#choices').hidden=!!t;$('#branches').hidden=!t||t.type!=='bolt';$('#sell').hidden=!t;$('#sell').disabled=!running;$('#sell').textContent=t?`出售 · 返还 ${Math.floor(t.invested*.7)} 金`:'';
 document.querySelectorAll('[data-build]').forEach(b=>b.disabled=!running||!selected||!!t||g.gold<TYPES[b.dataset.build].cost);document.querySelectorAll('[data-upgrade]').forEach(b=>b.disabled=!running||!t||t.type!=='bolt'||g.gold<110);document.querySelectorAll('[data-site]').forEach(b=>{const s=+b.dataset.site===selected;b.classList.toggle('selected',s);b.setAttribute('aria-pressed',String(s));});
 $('#retry').disabled=!active;$('#record').textContent=`已守住 ${c.results.length}/3 隘；重试当前图保留先前战报。`;saveHint();
}
function action(fn,text){if(c.phase!=='battle'||!fn())return;say(text);tone();save();hud();}
$('#sites').onclick=e=>{const b=e.target.closest('[data-site]');if(b){selected=+b.dataset.site;aim=false;hud();}};
$('#choices').onclick=e=>{const b=e.target.closest('[data-build]');if(b)action(()=>build(g,selected,b.dataset.build),`${selected}号建造${TYPES[b.dataset.build].name}。`);};
$('#branches').onclick=e=>{const b=e.target.closest('[data-upgrade]');if(b)action(()=>upgrade(g,selected,b.dataset.upgrade),`已选择${TYPES[b.dataset.upgrade].name}。`);};
$('#sell').onclick=()=>action(()=>sell(g,selected),'已出售，返还总投入的70%。');
$('#next').onclick=()=>action(()=>nextWave(g),`开始下一波，留意盾卫部署位置。`);
$('#reinforce').onclick=()=>{aim=!aim;say(aim?'点山路或前/中/后段按钮部署。':'已取消部署。');hud();};
function place(x,y){action(()=>deploy(g,x,y),'双盾卫已就位，接敌或11秒后撤退。');aim=false;hud();}
$('#rally').onclick=e=>{const b=e.target.closest('[data-rally]');if(b){const m=mapFor(g),p=point(m.length*[.3,.55,.8][+b.dataset.rally],g.mapIndex);place(p.x,p.y);}};
$('#cancel').onclick=()=>{aim=false;hud();};
$('#field').onclick=e=>{const r=e.currentTarget.getBoundingClientRect(),x=(e.clientX-r.left)*800/r.width,y=(e.clientY-r.top)*533/r.height;if(aim){place(x,y);return;}const s=sitesFor(g).find(s=>Math.hypot(s.x-x,s.y-y)<39);if(s){selected=s.id;hud();}};
function pause(){if(c.phase!=='battle'||!['playing','paused'].includes(g.state))return;g.state=g.state==='paused'?'playing':'paused';aim=false;previous=performance.now();save();hud();}
$('#pause').onclick=pause;$('#speed').onclick=()=>{g.speed=g.speed===1?2:1;save();hud();};
function focusHeading(){$('#campaign-title').focus();}
$('#advance').onclick=()=>{const next=enter(c);if(!next)return;g=next;selected=null;aim=false;previous=performance.now();mapUI();say('先选塔位建造，再开始第一波。');save();hud();focusHeading();};
$('#retry').onclick=()=>{const next=retry(c);if(!next)return;g=next;aim=false;selected=null;previous=performance.now();mapUI();say('当前图重新布防：230金、12城门；前图战报保留。');save();hud();};
$('#sound').onclick=()=>{sound=!sound;$('#sound').textContent=`声音 ${sound?'开':'关'}`;tone();};
function safePause(){if(c.phase==='battle'&&g.state==='playing'){g.state='paused';aim=false;say('已暂停，回来后点继续。');}save();hud();}
$('#help').onclick=()=>{safePause();$('#manual').showModal();};$('#close-help').onclick=()=>$('#manual').close();
$('#new-run').onclick=()=>{safePause();returnFocus=document.activeElement;$('#confirm-new').showModal();$('#cancel-new').focus();};
$('#cancel-new').onclick=()=>$('#confirm-new').close();$('#confirm-new').onclose=()=>returnFocus?.focus();
$('#confirm-reset').onclick=()=>{c=fresh();g=createGame(0);aim=false;selected=null;previous=performance.now();$('#confirm-new').close();mapUI();save();hud();say('新战役准备就绪。原单图纪录保留。');focusHeading();};
window.addEventListener('keydown',e=>{if($('#manual').open||$('#confirm-new').open||e.target.closest('a,button,input,select,textarea,[contenteditable="true"]'))return;if(e.key.toLowerCase()==='p'){e.preventDefault();pause();}if(e.key==='Escape'){if(aim){aim=false;hud();}else pause();}});
window.addEventListener('blur',safePause);document.addEventListener('visibilitychange',()=>{if(document.hidden)safePause();});window.addEventListener('pagehide',save);
Object.defineProperty(window,'passCampaign',{value:Object.freeze({snapshot:()=>({campaign:JSON.parse(JSON.stringify(c)),game:snapshot(g),storage:store.reason})}),writable:false});
function frame(now){
 if(c.phase==='battle'){
  update(g,Math.min(.1,(now-previous)/1000));
  if(settle(c,g)){aim=false;save();hud();say(c.phase==='complete'?'三隘全部守住，战报见上方。':'本隘守住，可前往下一隘。');focusHeading();}
  if(g.state==='lost')aim=false;
  if(now-lastSave>1000){save();lastSave=now;}
 }
 previous=now;if(now-lastUI>150){hud();lastUI=now;}renderer.draw(g,selected,aim);requestAnimationFrame(frame);
}
mapUI();hud();if(c.phase==='complete')say('战役完成，上方战报可随时回看。');else if(c.phase==='between')say('本隘已守住，上方可前往下一隘。');else if(g.state==='lost')say('城门失守，重试当前图保留前图战报。');else if(c.phase==='battle'&&g.state==='paused')say('已恢复本图，先暂停；点继续才会推进。');requestAnimationFrame(frame);
