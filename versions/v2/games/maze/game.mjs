import {createGame,start,pause,update,snapshot,LIMIT} from './engine.mjs';
import {LEVELS} from './levels.mjs';
import {Renderer} from './renderer.mjs';
const $=s=>document.querySelector(s),KEY='classic-atlas.ember-duel.v2';
let storageOK=true,record={won:0,lost:0,draw:0},soundOn=true;
try{const data=JSON.parse(localStorage.getItem(KEY)||'{}');for(const k of Object.keys(record))if(Number.isSafeInteger(data[k])&&data[k]>=0)record[k]=data[k];soundOn=data.sound!==false;}catch{storageOK=false;}
let game=createGame(),renderer=new Renderer($('#battlefield')),lastState='',audio,last=performance.now(),accumulator=0,lastHud=0,bombQueued=false,queuedDirection=null,sequence=0,feedbackUntil=0;
const keys=new Map(),touch=new Map(),directions={ArrowUp:0,KeyW:0,ArrowRight:1,KeyD:1,ArrowDown:2,KeyS:2,ArrowLeft:3,KeyA:3};
function clear(){keys.clear();touch.clear();bombQueued=false;queuedDirection=null;document.querySelectorAll('.pressed').forEach(b=>b.classList.remove('pressed'));}
function persist(){try{localStorage.setItem(KEY,JSON.stringify({...record,sound:soundOn}));}catch{storageOK=false;}$('#save-note').textContent=storageOK?'仅保存结果。刷新将重新开场；失焦自动暂停。':'本机存储不可用，仍可游玩；刷新将清除本次记录。';$('#record').textContent=`胜 ${record.won} · 负 ${record.lost} · 平 ${record.draw}`;}
function unlock(){if(!soundOn)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();if(audio.state==='suspended')audio.resume().catch(()=>{});}catch{}}
function tone(f,d=.1,type='triangle'){if(!soundOn||audio?.state!=='running')return;const o=audio.createOscillator(),v=audio.createGain(),t=audio.currentTime;o.type=type;o.frequency.setValueAtTime(f,t);o.frequency.exponentialRampToValueAtTime(Math.max(35,f*.45),t+d);v.gain.setValueAtTime(.035,t);v.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(v);v.connect(audio.destination);o.start();o.stop(t+d);o.onended=()=>{o.disconnect();v.disconnect();};}
function load(index){clear();game=createGame(index);lastState='';feedbackUntil=0;accumulator=0;last=performance.now();hud();sync();renderer.draw(game,game.time);}
function begin(){unlock();clear();if(game.state==='ready')start(game);else if(game.state==='paused')pause(game);else{load(game.level-1);start(game);}sync();$('#battlefield').focus({preventScroll:true});}
function togglePause(){if(!['paused','playing'].includes(game.state))return;clear();pause(game);sync();}
function sync(){
 if(lastState===game.state)return;lastState=game.state;$('#pause').disabled=!['playing','paused'].includes(game.state);$('#pause').textContent=game.state==='paused'?'继续 P':'暂停 P';$('#overlay').hidden=game.state==='playing';
 if(game.state==='playing'){$('#status').textContent='引信 2.4 秒 · 爆风三格 · 自己的炸弹也致命。';return;}
 clear();const l=LEVELS[game.level-1];$('#overlay-tag').textContent=l.tag;$('#other-map').textContent=`换到${LEVELS[game.level===1?1:0].name}`;
 const result=['won','lost','draw'].includes(game.state);
 $('#overlay-title').textContent=game.state==='ready'?l.name:game.state==='paused'?'引线已暂停':game.state==='won'?'对决获胜':game.state==='lost'?'再留一条退路':game.reason==='同归于尽'?'同归于尽':'时间到 · 平局';
 $('#overlay-copy').textContent=game.state==='ready'?l.tip:game.state==='paused'?'计时、引信和对手机都已冻结。准备好再继续。':game.state==='won'?'铜箱后的交战线，属于最后站着的你。':game.state==='lost'?'所有爆风都致命。放弹前，先找好拐角外的安全格。':game.reason==='同归于尽'?'同一轮火线击破双方，本场记为平局。':'90 秒结束，双方仍然存活，本场记为平局。';
 $('#result-detail').textContent=result?`${game.time.toFixed(1)} 秒 · 破箱 ${game.stats.crates} · 连锁 ${game.stats.chains} 次`:'90 秒 · 每方 2 枚 · 爆风 3 格';
 $('#primary').textContent=game.state==='ready'?'开始对决 ↗':game.state==='paused'?'继续对决 ↗':'再来一场 ↗';
 if(result){record[game.state]++;persist();$('#status').textContent=game.reason+'。可以重试或直接切换另一张地图。';}hud();
}
function hud(){const l=LEVELS[game.level-1];$('#map-name').textContent=`0${game.level} / ${l.name}`;$('#map-tip').textContent=l.tip;const left=Math.max(0,Math.ceil(LIMIT-game.time));$('#clock').textContent=`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`;$('#clock').style.color=left<=15?'#ffa17f':'';for(const id of ['player','rival']){$('#'+id+'-state').textContent=game[id].alive?'存活':'击破';$('#'+id+'-bombs').textContent=`${game.bombs.filter(b=>b.owner===id).length} / 2`;}document.querySelectorAll('[data-map]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.map)===game.level-1)));}
$('#primary').onclick=begin;$('#other-map').onclick=()=>load(game.level===1?1:0);$('#pause').onclick=togglePause;$('#restart').onclick=()=>load(game.level-1);document.querySelectorAll('[data-map]').forEach(b=>b.onclick=()=>load(Number(b.dataset.map)));
function soundLabel(){$('#sound').textContent=`声音 ${soundOn?'开':'关'}`;$('#sound').setAttribute('aria-pressed',String(soundOn));}
$('#sound').onclick=()=>{soundOn=!soundOn;unlock();soundLabel();persist();tone(500);};
document.addEventListener('keydown',e=>{if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches('input,textarea,select'))return;if(e.code in directions){e.preventDefault();if(game.state==='playing'&&!keys.has(e.code)){keys.set(e.code,{dir:directions[e.code],order:++sequence});queuedDirection=directions[e.code];}}
 if(['Space','KeyJ'].includes(e.code)&&e.target.tagName!=='BUTTON'){e.preventDefault();if(!e.repeat&&game.state==='playing'){unlock();bombQueued=true;}}
 if(!e.repeat&&['KeyP','Escape'].includes(e.code)){e.preventDefault();togglePause();}if(!e.repeat&&e.code==='KeyR'){e.preventDefault();load(game.level-1);}});
document.addEventListener('keyup',e=>keys.delete(e.code));
for(const b of document.querySelectorAll('[data-dir]')){b.addEventListener('pointerdown',e=>{e.preventDefault();if(game.state!=='playing')return;b.setPointerCapture(e.pointerId);touch.set(e.pointerId,{dir:Number(b.dataset.dir),order:++sequence});queuedDirection=Number(b.dataset.dir);b.classList.add('pressed');});for(const ev of ['pointerup','pointercancel','lostpointercapture'])b.addEventListener(ev,e=>{touch.delete(e.pointerId);b.classList.remove('pressed');});}
$('#bomb').addEventListener('pointerdown',e=>{e.preventDefault();if(game.state!=='playing')return;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.classList.add('pressed');unlock();bombQueued=true;});
for(const ev of ['pointerup','pointercancel','lostpointercapture'])$('#bomb').addEventListener(ev,e=>e.currentTarget.classList.remove('pressed'));
// Keyboard accessibility for the touch-only control, without pointer click double-planting.
$('#bomb').addEventListener('click',e=>{if(e.detail===0&&game.state==='playing'){unlock();bombQueued=true;}});
function autoPause(){clear();if(game.state==='playing'){pause(game);sync();}}
window.addEventListener('blur',autoPause);document.addEventListener('visibilitychange',()=>{if(document.hidden)autoPause();});
function frame(now){const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;accumulator+=dt;while(accumulator>=1/60){const active=[...keys.values(),...touch.values()].sort((a,b)=>b.order-a.order)[0];const consume=game.player.cooldown<=1/60;update(game,1/60,{direction:active?.dir??queuedDirection,bomb:bombQueued});bombQueued=false;if(consume)queuedDirection=null;accumulator-=1/60;}
 for(const e of game.events.splice(0)){if(e.type==='plant')tone(e.owner==='player'?320:220,.065,'square');if(e.type==='explode')tone(90,.2,'sawtooth');if(e.type==='chain'){tone(170,.16,'square');$('#status').textContent='连锁引爆！相邻炸弹的引信已被提前点燃。';feedbackUntil=game.time+2;}if(e.type==='eliminate')tone(70,.35,'sawtooth');if(e.type==='result'&&e.state==='won')tone(680,.35);}
 if(game.state==='playing'&&feedbackUntil&&game.time>=feedbackUntil){$('#status').textContent='引信 2.4 秒 · 爆风三格 · 自己的炸弹也致命。';feedbackUntil=0;}
 renderer.draw(game,game.time);sync();if(now-lastHud>100){hud();lastHud=now;}requestAnimationFrame(frame);
}
export function diagnostics(){return {...snapshot(game),record:{...record},storageOK,soundOn};}
soundLabel();persist();hud();sync();renderer.draw(game,0);requestAnimationFrame(frame);
