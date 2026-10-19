import {fresh,act,aiTurn,scenarios,netWorth,rent,saleValue} from './engine.mjs?sale-rounding-r1';
import {loadAssets,render} from './renderer.mjs?sale-rounding-r1';
const $=id=>document.getElementById(id),KEY='atlas-venture-rivals-v2.1';
const newSeed=()=>crypto.getRandomValues(new Uint32Array(1))[0]||1;
let s,art={},motion=null,busy=false,aiTimer=null,motionTimer=null,storageOK=true;
try{const raw=JSON.parse(localStorage.getItem(KEY)||'null');if(raw?.version===2&&scenarios.some(x=>x.id===raw.scenario)&&raw.players?.length===2&&raw.shops?.length===12)s=raw;}catch{}
if(!s)s=fresh(0,newSeed());
function save(){try{localStorage.setItem(KEY,JSON.stringify(s));}catch{storageOK=false;}$('saveStatus').textContent=storageOK?'进度已自动保存':'无法保存：请勿刷新或关闭本页';}
function scene(){return scenarios.find(x=>x.id===s.scenario);}
function who(id){return id===0?'青旗':id===1?'朱旗':'街市';}
function eventText(e){
 if(e.type==='move')return `${who(e.actor)}${e.voucher?'用定步券':'掷骰'}走 ${e.steps} 格 → ${scene().board[e.to].name}`;
 if(e.type==='finish')return e.reason==='bankruptcy'?`${who(1-e.winner)}已清算产业但仍欠款，本局结束`:`完整轮数到达，${e.winner==='draw'?'双方平局':who(e.winner)+'胜出'}`;
 if(e.type==='transaction'){const name=Number.isInteger(e.index)?scene().board[e.index].name:'';return ({rent:`${who(e.from)} → ${who(e.to)}：支付${name}租金 ${e.amount}${e.unpaid?'，未清欠款 '+e.unpaid:''}`,buy:`${who(e.actor)}购入${name} −${e.amount}`,upgrade:`${who(e.actor)}升级${name} −${e.amount}`,sell:`${who(e.actor)}售出${name} +${e.amount}`,liquidate:`${who(e.actor)}为偿债清算${name} +${e.amount}`,tax:`${who(e.actor)}支付维护费 ${e.amount}`,'pass-start':`${who(e.actor)}经过街口 +${e.amount}`,park:`${who(e.actor)}茶歇收益 +${e.amount}`,market:`${who(e.actor)}集市收益 +${e.amount}`})[e.kind]||`${who(e.actor)}交易 ${e.amount}`;}
 return '';
}
function update(){
 const sc=scene(),p=s.players[0],cell=sc.board[p.position],shop=s.shops[p.position],ready=!busy&&s.turn===0&&s.phase==='ready',landed=!busy&&s.turn===0&&s.phase==='landed';
 $('level').value=scenarios.indexOf(sc);$('scene').textContent=sc.title;$('round').textContent=`第 ${Math.min(s.round,sc.rounds)} / ${sc.rounds} 轮`;$('turn').textContent=s.phase==='finished'?'本局已结算':s.turn===0?'青旗回合 · 你':'朱旗回合 · 对手';
 $('pCash').textContent=p.cash;$('aCash').textContent=s.players[1].cash;$('pWorth').textContent=`净资产 ${netWorth(s,0)} · 定步券 ${p.vouchers}`;$('aWorth').textContent=`净资产 ${netWorth(s,1)} · 定步券 ${s.players[1].vouchers}`;
 $('place').textContent=cell.name;$('phase').textContent=s.phase==='finished'?'本局结算':busy?'商人行进中':s.phase==='ready'?'出发前选择':'到达后经营';
 $('roll').disabled=!ready;$('voucher').disabled=!ready||p.vouchers===0;$('steps').disabled=!ready;$('voucher').textContent=`用定步券 ×${p.vouchers}`;
 $('buy').disabled=!landed||cell.type!=='shop'||shop.owner!==null||p.cash<cell.price;$('buy').textContent=cell.type==='shop'?`买入 ${cell.price}`:'买下店铺';
 $('upgrade').disabled=!landed||shop.owner!==0||shop.level>=2||p.cash<cell.upgradeCost;$('upgrade').textContent=shop.owner===0&&shop.level<2?`升级 ${cell.upgradeCost}`:'升级店铺';$('end').disabled=!landed;
 $('next').hidden=s.phase!=='finished'||scenarios.indexOf(sc)===2;
 $('notice').textContent=s.error|| (s.phase==='finished'?`${s.winner==='draw'?'双方平局':s.winner===0?'你赢下了这条街！':'本局朱旗领先。留住现金，再争好铺。'} 净资产 ${netWorth(s,0)} : ${netWorth(s,1)}`:s.turn===1?'对手遵循相同经营规则，正在行动。':s.phase==='ready'?'掷骰走 1–6 格，或先选定步券。两券用完便只能掷骰。':cell.type==='shop'?shop.owner===null?`空铺：购入 ${cell.price}，基础租金 ${cell.baseRent}。` :shop.owner===0?`你的 ${shop.level} 级店铺，当前租金 ${rent(s,p.position)}。`:`对手铺面，租金已结清。查看账簿，再结束回合。`:'公共地点收支已结算，可结束回合。');
 const list=$('portfolio');list.replaceChildren();s.shops.forEach((sh,i)=>{if(sh.owner!==0)return;const b=document.createElement('button');b.textContent=`${sc.board[i].name} · ${sh.level}级｜售 ${saleValue(s,i)}`;b.disabled=busy||s.turn!==0||s.phase==='finished';b.addEventListener('click',()=>{if(confirm(`出售${sc.board[i].name}，收回 ${saleValue(s,i)}？`))perform('sell',i);});list.append(b);});if(!list.childNodes.length)list.textContent='尚未置业。落在空铺后可以买入。';
 $('ledger').replaceChildren();[...s.log].reverse().slice(0,16).forEach(e=>{const li=document.createElement('li');li.textContent=`${e.round}轮 · ${eventText(e)}`;$('ledger').append(li);});
}
function animateEvents(){const e=(s.events||[]).find(e=>e.type==='move');if(!e){busy=false;update();scheduleAI();return;}busy=true;motion={...e,start:performance.now(),duration:e.steps*175+220};update();motionTimer=setTimeout(()=>{motionTimer=null;motion=null;busy=false;update();scheduleAI();},motion.duration);}
function perform(action,value){if(busy||s.turn!==0||s.phase==='finished')return;s=act(s,action,value);save();update();if(s.error)return;animateEvents();}
function scheduleAI(){if(s.turn!==1||s.phase==='finished'||busy||aiTimer)return;aiTimer=setTimeout(()=>{aiTimer=null;if(s.turn!==1||s.phase==='finished')return;s=aiTurn(s);save();animateEvents();},650);}
function restart(level){clearTimeout(aiTimer);clearTimeout(motionTimer);motionTimer=null;aiTimer=null;motion=null;busy=false;s=fresh(level,newSeed());save();update();}
$('roll').addEventListener('click',()=>perform('roll'));$('voucher').addEventListener('click',()=>perform('move',Number($('steps').value)));for(const key of ['buy','upgrade','end'])$(key).addEventListener('click',()=>perform(key));
$('restart').addEventListener('click',()=>{if(confirm('放弃当前对局并重新开局？'))restart(scenarios.indexOf(scene()));});$('level').addEventListener('change',()=>{const n=Number($('level').value);if(confirm('切换对局会放弃当前未完成进度，继续？'))restart(n);else update();});$('next').addEventListener('click',()=>restart(Math.min(2,scenarios.indexOf(scene())+1)));
const ctx=$('game').getContext('2d');function frame(t){render(ctx,s,art,motion,t);requestAnimationFrame(frame);}
update();save();try{art=await loadAssets();$('loading').hidden=true;}catch{ $('loading').textContent='画面素材加载失败，请检查网络后刷新。进度已保留。';}requestAnimationFrame(frame);scheduleAI();
