import{MODES}from'./seed.mjs';
import{start,pause,reveal,flag,chord,requestHint,update,view,checkpoint,restore,retry,MAX_LOG}from'./engine.mjs';
import{generateRound}from'./generator.mjs';import{Renderer}from'./renderer.mjs';import{cleanStore,STORAGE_KEY}from'./storage.mjs';
const $=s=>document.querySelector(s),board=$('#board'),renderer=new Renderer(board);
let storageOK=true,discarded=false,raw=null;
try{const text=localStorage.getItem(STORAGE_KEY);if(text&&text.length>1000000)throw Error('Oversize save');raw=JSON.parse(text||'null');}catch{discarded=true;}
const data=cleanStore(raw);for(const m of ['small','large'])if(raw?.slots?.[m]?.resume&&!data.slots[m].resume)discarded=true;
let lastClick={index:-1,time:-Infinity};
let mode=data.mode,game=null,cursor=0,input='reveal',controller=null,previous=performance.now(),lastSave=0,seenState='',busyCount=0;
const fmt=t=>String(Math.floor(t/60)).padStart(2,'0')+':'+String(Math.floor(t%60)).padStart(2,'0');
function randomSeed(){const a=new Uint32Array(1);crypto.getRandomValues(a);return a[0];}
function announce(t){$('#status').textContent=t;}
function store(){data.mode=mode;if(game)data.slots[mode]={seed:game.seed,resume:checkpoint(game)};try{localStorage.setItem(STORAGE_KEY,JSON.stringify(data));}catch{storageOK=false;}$('#save-note').textContent=storageOK?'本机独立保存两档种子、首格与合法操作日志。刷新后暂停恢复；不会上传数据。':'浏览器存储不可用；仍可游玩，但刷新后可能无法保留进度与纪录。';}
function blankView(){const c=MODES[mode];return{w:c.size,h:c.size,state:'waiting',cells:Array.from({length:c.size*c.size},()=>({state:'covered',number:null})),started:false,totalMines:c.mines,hint:null};}
function current(){return game?view(game):blankView();}
function render(){
 const v=current(),cfg=MODES[mode],state=controller?'generating':game?.state||'waiting';document.body.dataset.state=state;renderer.draw(v,cursor);
 $('#small').setAttribute('aria-pressed',String(mode==='small'));$('#large').setAttribute('aria-pressed',String(mode==='large'));
 $('#remaining').textContent=String(game?game.totalMines-game.flags:cfg.mines).padStart(2,'0');$('#revealed').textContent=(game?.revealed||0)+' / '+(cfg.size**2-cfg.mines);$('#time').textContent=fmt(game?.time||0);
 $('#round-title').textContent=cfg.name;$('#seed').textContent='SEED '+String(data.slots[mode].seed).padStart(10,'0')+(game?' · 首格 '+(Math.floor(game.start/game.w)+1)+'行'+(game.start%game.w+1)+'列':' · 等待首格');
 $('#retry').disabled=!game;$('#hint').disabled=state!=='playing';$('#jump').disabled=!game?.hint?.indices?.length;$('#pause').disabled=!['playing','paused','generating'].includes(state);$('#pause').textContent=controller?'取消生成':state==='paused'?'继续 P':'暂停 P';
 $('#open-mode').setAttribute('aria-pressed',String(input==='reveal'));$('#flag-mode').setAttribute('aria-pressed',String(input==='flag'));
 $('#curtain').hidden=!['paused','generating'].includes(state);$('#curtain-copy').textContent=controller?'正在筛选星图 · '+busyCount+' / 128':'观测暂停';$('#resume').textContent=controller?'取消生成':'继续勘探';
 $('#result').hidden=!['won','lost'].includes(state);if(state==='won'||state==='lost'){$('#result-title').textContent=state==='won'?'勘探完成。':'触雷，勘探结束。';$('#result-copy').textContent=(state==='won'?'全部安全格已揭开。':'雷位保持原样，红色菱晶标出触雷点；叉号是错误旗。')+'用时 '+fmt(game.time)+' · '+game.stats.hints+' 次提示。可重试本盘，或另开新盘。';}
 $('#explanation').textContent=game?.hint?.reason||'数字是周围八格的雷数。旗标只是你的判断；点已打开数字可快捷展开，但旗错也会触雷。';
 const best=data.best[mode];$('#best').textContent=best?'本档最佳 · '+best.hints+' 提示 / '+fmt(best.time):'本档纪录 · 等待第一次完成';
 if(state!==seenState){seenState=state;if(state==='won'||state==='lost')$('#result').focus?.();}
}
function cancelGeneration(){if(controller){controller.abort();controller=null;busyCount=0;announce('生成已取消。种子保留，重新点任意格即可开始。');render();}}
function loadMode(next){cancelGeneration();if(game?.state==='playing')pause(game);store();mode=next;data.mode=mode;const slot=data.slots[mode];if(slot.seed===undefined)slot.seed=randomSeed();game=slot.resume?restore(slot.resume):null;cursor=game?.start??Math.floor(MODES[mode].size**2/2);renderer.open.clear();input='reveal';store();render();announce(game?.state==='paused'?'已恢复同一雷图与开格，继续后计时。':game?'这一局已恢复，可重试同盘或另开新盘。':'点任意一格生成星图；该格和邻格安全。');}
async function first(index){
 if(controller)return;const token=new AbortController();controller=token;busyCount=0;render();announce('按种子筛选可由可见数字规则推进的布局…');
 try{const result=await generateRound(mode,data.slots[mode].seed,index,{signal:token.signal,onProgress:n=>{if(controller===token){busyCount=n;render();}}});
  if(controller!==token)return;controller=null;
  if(result.status==='ok'){game=result.game;start(game);reveal(game,index);cursor=index;announce('首格邻域已展开。雷图现在锁定，不会动态移动。');finishAction();}
  else{announce('128 次筛选未找到合适布局。没有替换成固定图；请另开新盘，或换一个首格再试。');render();}
 }catch{if(controller===token){controller=null;announce('这一局生成失败，请另开新盘重试。');render();}}
}
function finishAction(){
 if(game?.state==='won'){const score={hints:game.stats.hints,time:game.time},old=data.best[mode];if(!old||score.hints<old.hints||score.hints===old.hints&&score.time<old.time)data.best[mode]=score;}
 store();render();
}
function act(type,index){
 if(controller)return;if(!game){if(type==='reveal')first(index);else announce('先用揭开模式选择任意首格，生成后才能标旗。');return;}
 if(game.state!=='playing')return;if(game.log.length>=MAX_LOG){announce('本局已达到 5000 条操作日志上限。进度保留，可重试本盘或另开新盘。');return;}
 cursor=index;const before=game.revealed,ok=({reveal,flag,chord})[type](game,index);
 const events=game.events.splice(0);if(events.some(e=>e.type==='flag-limit'))announce('旗数已达总雷数，请先撤回一面旗。');else if(events.some(e=>e.type==='chord-blocked'))announce('邻旗数必须等于数字，且仍有未知邻格，才能快捷展开。');else if(ok)announce(type==='flag'?'旗标已更新，尚未核验。':game.state==='lost'?'触雷。旗标或展开没有安全兜底。':'本次揭开 '+(game.revealed-before)+' 格。');
 finishAction();
}
function activate(i){act(input==='flag'?'flag':game?.cells[i]?.state==='open'?'chord':'reveal',i);}
function togglePause(){if(controller){cancelGeneration();return;}if(game&&pause(game)){store();render();announce(game.state==='paused'?'已暂停，计时停止。':'继续按可见数字勘探。');}}
function hint(){if(game?.state!=='playing')return;if(game.log.length>=MAX_LOG){announce('已达操作日志上限，请重试或另开新盘。');return;}requestHint(game);game.events=[];announce('提示已标出依据和结论；它假设已有旗标正确，不核验隐藏雷位。');finishAction();}
$('#small').onclick=()=>{if(mode!=='small')loadMode('small');};$('#large').onclick=()=>{if(mode!=='large')loadMode('large');};
$('#new').onclick=()=>{cancelGeneration();let seed=randomSeed();if(seed===data.slots[mode].seed)seed=(seed+1)>>>0;data.slots[mode]={seed};game=null;cursor=Math.floor(MODES[mode].size**2/2);input='reveal';renderer.open.clear();store();render();announce('已换新种子。点任意格生成新的雷图。');};
$('#retry').onclick=()=>{if(!game)return;cancelGeneration();game=retry(game);renderer.open.clear();start(game);reveal(game,game.start);cursor=game.start;input='reveal';announce('原种子、首格、雷图已保留；操作和计时归零。');finishAction();};
$('#open-mode').onclick=()=>{input='reveal';render();announce('揭开模式：点未知格揭开，点数字快捷展开。');};$('#flag-mode').onclick=()=>{input='flag';render();announce('标旗模式：点格插旗或撤旗。旗标不会被自动纠正。');};$('#pause').onclick=togglePause;$('#resume').onclick=togglePause;$('#hint').onclick=hint;
$('#jump').onclick=()=>{const i=game?.hint?.indices?.[0];if(i!==undefined){cursor=i;render();board.querySelector('[data-index="'+i+'"]')?.focus({preventScroll:true});}};
board.addEventListener('click',e=>{const cell=e.target.closest('[data-index]');if(cell){const index=Number(cell.dataset.index),now=performance.now();if(lastClick.index===index&&now-lastClick.time<200)return;lastClick={index,time:now};activate(index);}});
board.addEventListener('contextmenu',e=>{const cell=e.target.closest('[data-index]');if(cell){e.preventDefault();act('flag',Number(cell.dataset.index));}});
board.addEventListener('keydown',e=>{if(e.repeat&&!e.key.startsWith('Arrow'))return;const w=MODES[mode].size;let next=cursor;if(e.key==='ArrowLeft')next=Math.max(Math.floor(cursor/w)*w,cursor-1);else if(e.key==='ArrowRight')next=Math.min(Math.floor(cursor/w)*w+w-1,cursor+1);else if(e.key==='ArrowUp')next=Math.max(0,cursor-w);else if(e.key==='ArrowDown')next=Math.min(w*w-1,cursor+w);else if(e.key===' '||e.key==='Enter'){e.preventDefault();activate(cursor);return;}else if(e.key.toLowerCase()==='f'){e.preventDefault();act('flag',cursor);return;}else if(e.key.toLowerCase()==='c'){e.preventDefault();act('chord',cursor);return;}else return;e.preventDefault();cursor=next;render();board.querySelector('[data-index="'+cursor+'"]')?.focus({preventScroll:true});});
document.addEventListener('keydown',e=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey)return;if(e.key.toLowerCase()==='p'){e.preventDefault();togglePause();}if(e.key.toLowerCase()==='h'){e.preventDefault();hint();}});
function suspend(){cancelGeneration();if(game?.state==='playing')pause(game);store();render();}document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();previous=performance.now();});window.addEventListener('pagehide',suspend);
loadMode(mode);if(discarded)announce('旧存档内容不合法，已拒绝恢复；可正常另开新盘。');
function frame(now){if(game)update(game,(now-previous)/1000);previous=now;$('#time').textContent=fmt(game?.time||0);if(now-lastSave>3000){lastSave=now;if(game?.state==='playing')store();}requestAnimationFrame(frame);}requestAnimationFrame(frame);
