import {SAVE_KEY,LEGACY_SAVE_KEY,SPECIES,ELEMENTS,TRIAL,V2,createGame,input,checkpoint,restore,allowed,phase,progress,readiness,active,partner,maxHP,power,trialElement,trialIntent,trialIncoming,trialHit,invariants} from './model.mjs';
import {render,hitNode} from './renderer.mjs';
import {skillFeedback} from './skill-feedback.mjs';
import {journeyObjective} from './objective-feedback.mjs';
import {campSkillInfo} from './camp-feedback.mjs';
import {completedSummary} from './summary-review.mjs';
const $=q=>document.querySelector(q),canvas=$('#scene'),ctx=canvas.getContext('2d');
const ART='../../../v2/games/feather/assets/',assets={};
let state,paused=false,showPaths=true,storage=true,saveBlocked=false,lastInput=-1000,previousFocus=null,legacy=null,assetsReady=false;
try {
 const raw=localStorage.getItem(SAVE_KEY);
 if(raw!==null){try{state=restore(JSON.parse(raw));if(!state)saveBlocked=true;}catch{saveBlocked=true;}}
 const older=localStorage.getItem(LEGACY_SAVE_KEY);
 if(older!==null){try{const cp=JSON.parse(older);if(V2.restore(cp))legacy=cp;}catch{}}
} catch {storage=false;}
const resumed=!!state;state??=createGame();
if(saveBlocked)state.base.notice='原有v3记录无法恢复，已保留原值。本次临时游玩不保存；只有确认新旅途后才会替换。';
function persist(){
 if(saveBlocked){$('#save-status').textContent='旧v3记录未覆盖 · 本次不保存';return;}
 try{localStorage.setItem(SAVE_KEY,JSON.stringify(checkpoint(state)));}catch{storage=false;}
 $('#save-status').textContent=storage?'v3独立记录 · 只在本机':'存储不可用 · 本页仍可游玩';
}
const art=id=>ART+SPECIES[id].art+'.webp';
function imageLoad(name,url){return new Promise(resolve=>{const im=new Image();im.onload=()=>{assets[name]=im;resolve(true);};im.onerror=()=>resolve(false);im.src=url;});}
function button(kind,arg,label,sub='',css=''){
 const error=allowed(state,kind,arg);
 return '<button data-action="'+kind+'"'+(arg?' data-arg="'+arg+'"':'')+' data-revision="'+state.revision+'" class="'+css+'"'+(error?' disabled title="'+error+'"':'')+'>'+label+(sub?'<small>'+sub+'</small>':'')+'</button>';
}
function skillButton(kind,label){
 const f=skillFeedback(state);
 return button(kind,null,label,f.cost+'<br>'+f.effect+(f.reason?'<span class="skill-blocked">暂不可用：'+f.reason+'</span>':''),'skill-action');
}
function card(p,camp=false){
 const b=state.base,sp=SPECIES[p.id],selected=b.team.includes(p.id);
 const skill=camp?campSkillInfo(p):null;
 return '<article class="partner-card '+(selected?'selected':'')+'"><img src="'+art(p.id)+'" alt="'+sp.name+'的已有原创形象"><div class="partner-info"><strong>'+sp.name+' <span class="tiny">'+ELEMENTS[sp.element].name+'</span></strong><small>'+(camp?sp.role:'体力 '+p.hp+'/'+maxHP(p)+' · 能量 '+p.energy+'/3')+'</small><small>'+(p.rank?'已成长 · 上限+8 / '+(camp?'轻击威力':'威力')+'+2':'经历 '+p.xp+'/2 · 两次相遇后成长一次')+'</small>'+(skill?'<div class="camp-skill"><strong>'+skill.name+' · '+skill.cost+'</strong><span>'+skill.effect+'</span></div>':'')+'</div>'+(camp?button('team',p.id,selected?'留营':'同行'):phase(state)==='explore'?button('leadField',p.id,p.id===b.active?'领队':'换领队'):'')+'</article>';
}
function campPanel(){
 const b=state.base,p=progress(state),last=state.journey.lastAttempt,reason=readiness(state);
 const recap=last&&last.outcome!=='completed'?'<div class="recap">上次回响：'+({defeated:'体力耗尽',timeout:'24拍结束',retreated:'主动回营'}[last.outcome])+'。伙伴与成长保留，下一次免费整备。</div>':'';
 return '<h2 tabindex="-1">归羽营地</h2><p class="intro">两个出行位。先让一位留营，再换入新朋友；领队影响属性、技能与来招。</p><p class="tiny">技能列出基础作用；实际效果在相遇或回响中预览。</p>'+recap+
 (b.report?.recruited.length?'<div class="recap">'+b.report.recruited.map(id=>SPECIES[id].name).join('、')+'已经加入营地，可自由编队。</div>':'')+
 b.roster.map(q=>card(q,true)).join('')+'<div class="leader-row">领队 '+b.team.map(id=>button('lead',id,SPECIES[id].name,'',b.active===id?'chosen':'')).join('')+'</div>'+
 button('depart',null,p.completed?'自由出行':'整备并出行','', 'primary wide')+
 '<div class="trial-card"><strong>'+(p.completed?'浅滩冒险已完成':'终挑战 · 浅滩回响')+'</strong><p>'+(reason||'准备就绪。可任选两位伙伴；免费回满体力与能量，带2露莓。')+'</p>'+
 (!p.completed?button('trialStart',null,'迎接浅滩回响','24拍 · 属性与来招公开预告','primary'):'<p>旅途总结已记下；还可以结识另一位伙伴、自由探索。</p><button id="review-summary" class="quiet" type="button">重读旅途总结</button>')+'</div>'+
 '<p class="tiny">出行免费回满体力、能量和背包。2羽结、2露莓、24日光；成长仍只发生一次。</p>';
}
function explorePanel(){
 const b=state.base;
 return '<h2 tabindex="-1">沿浅滩走一小段</h2><p class="intro">方向键/WASD、下方方向按钮，或点击身边亮色步点。每步消耗1日光。</p>'+
 b.team.map(id=>card(partner(b,id))).join('')+'<div class="objective"><strong>同一片浅滩，三个去处</strong><br>左侧露莓丛：绕路多采1颗<br>上方晶芽草间：遇见晶雾芽<br>右侧回声浅湾：遇见露纹鳍</div><div class="intent">'+
 (b.pending.length?'新朋友正在同行：'+b.pending.map(p=>SPECIES[p.id].name).join('、')+'。回营后可编队。':'每个相遇点本次只触发一次。回营、失败或日光尽，都可免费重整。')+'</div><p class="tiny">风克苔、苔克泉、泉克风：顺向1.5倍，逆向0.75倍。终挑战从营地开始。</p>';
}
function encounterPanel(){
 const b=state.base,w=b.wild,p=active(b),other=b.team.find(id=>id!==b.active),chance=V2.captureChance(b),owned=!!partner(b,w.id)||b.pending.some(p=>p.id===w.id);
 return '<div class="encounter-heading"><h2 tabindex="-1">'+SPECIES[w.id].name+'</h2><div class="chance"><small>羽结回应率</small><strong>'+chance+'%</strong></div></div><p class="intro">'+
 (owned?'已在名册中，可切磋或安心道别。':'打到0会错过本次招募。羽结失败也会消耗。')+'</p><p class="wild-status">野外体力 <strong>'+w.hp+'/'+w.maxHP+'</strong> · 安心 <strong>'+w.calm+'/60</strong></p><div class="intent">下次：'+V2.nextIntent(b)+' · 预计'+V2.incoming(b)+'伤害<br>警觉 '+w.wariness+'；安心≥30时来招减弱。</div><div class="action-grid">'+
 button('attack',null,'轻击 · '+V2.estimateHit(b)+'伤害','警觉+4，击倒后本次不能招募')+
 button('soothe',null,'分享露莓','消耗1露莓；安心+'+Math.min(60-w.calm,20+SPECIES[p.id].soothe))+
 skillButton('skill',SPECIES[p.id].skill)+button('guard',null,'守息','回复1能量 / 本次16护盾')+
 button('heal',null,'吃颗露莓','消耗1露莓 / 恢复26体力')+
 button('switch',other,'换 '+SPECIES[other].name,'换位消耗一次行动并承受来招')+
 button('capture',null,'系羽结 · '+chance+'%','消耗1羽结；回营后编队','primary wide')+
 (w.calm>=60?button('farewell',null,'安心道别','获得经历，不会加入队伍','wide'):'')+'</div><div class="statline"><span>'+SPECIES[p.id].name+' '+p.hp+'/'+maxHP(p)+'</span><span>能量 '+p.energy+'/3</span></div>'+
 button('leave',null,'退回步道','','quiet')+' '+button('home',null,'安全回营','','quiet');
}
function trialPanel(){
 const b=state.base,t=state.trial,p=active(b),other=b.team.find(id=>id!==b.active);
 const nextElement=['moss','moss','water','water','wind','wind'][(t.turn+1)%6],next=['试探','蓄势','回涌'][(t.turn+1)%3];
 return '<h2 tabindex="-1">终挑战 · 浅滩回响</h2><p class="intro">24拍内消去'+TRIAL.hp+'余势。不是捕捉新物种；这是伙伴共同平息的自然回响。</p><div class="trial-readout"><span>余势 <strong>'+t.hp+'/'+TRIAL.hp+'</strong></span><span>合奏安心 <strong>'+t.calm+'/60</strong></span><span>这一拍 <strong>'+ELEMENTS[trialElement(state)].name+' / '+trialIntent(state)+'</strong></span><span>预计来招 <strong>'+trialIncoming(state)+'</strong></span></div><div class="intent">下一拍：'+ELEMENTS[nextElement].name+' / '+next+'<br>回涌较强，蓄势不攻击。安心≥30时来招×0.65；属性相克和弱化仍有效。</div><div class="action-grid">'+
 button('trialAttack',null,'1 · 轻击 '+trialHit(state),'伤害随本拍属性变化')+
 skillButton('trialSkill','2 · '+SPECIES[p.id].skill)+
 button('trialGuard',null,'3 · 守息','能量+1 / 本次16护盾')+
 button('trialHeal',null,'4 · 吃颗露莓','恢复26 / 剩余'+t.berries+'颗')+
 button('trialSwitch',other,'5 · 换 '+SPECIES[other].name,'换位占一拍；新领队承受本次来招','wide')+'</div>'+
 '<div class="trial-team">'+b.team.map(id=>{const q=partner(b,id);return SPECIES[id].name+(id===b.active?'（前方）':'')+'：'+q.hp+'/'+maxHP(q)+'体力，'+q.energy+'/3能量';}).join('<br>')+'</div><p class="tiny">技能仍是原来的五种；没有指定伙伴钥匙。成长增加上限与威力。回营保留已结识伙伴和成长。</p>'+
 button('trialRetreat',null,'回营再准备','','quiet');
}
function endingDetails(e){
 const names=e.team.map(id=>SPECIES[id].name).join('、'),newcomers=e.companions.filter(id=>['bud','fin'].includes(id)).map(id=>SPECIES[id].name).join('、');
 return '<p class="ending-story">潮声重新变得轻柔，回响散成细小星光。'+names+'并肩回到归羽营地。曾经陌生的'+newcomers+'，如今也在这条归途上。</p><ul class="summary-list"><li>完成出行：'+e.outings+'次</li><li>营地伙伴：'+e.companions.length+'/5</li><li>已成长：'+e.grown.map(id=>SPECIES[id].name).join('、')+'</li><li>浅滩回响：第'+e.attempt+'次挑战，'+e.turns+'拍完成</li><li>使用技能 '+(e.actions.trialSkill||0)+'次 · 守息 '+(e.actions.trialGuard||0)+'次 · 主动换位 '+(e.actions.trialSwitch||0)+'次</li></ul>';
}
function endingPanel(){
 return '<p class="eyebrow">浅滩冒险 · 完成</p><h2 tabindex="-1" id="ending-title">新的同行，也是归途</h2>'+endingDetails(state.ending)+'<p class="intro">这段短冒险到此结束。伙伴、成长与这份总结会保存；之后仍可自由出行，不会开启第二地区。</p>'+button('continue',null,'带着故事，回营自由出行','','primary wide');
}
function draw(){
 const b=state.base,mode=phase(state),p=progress(state);
 render(ctx,state,assets,{showPaths,viewportWidth:canvas.getBoundingClientRect().width});
 $('#phase').textContent={camp:'归羽营地',explore:'短出行 · '+b.outing,encounter:'相遇中',trial:'浅滩回响',ending:'浅滩冒险完成'}[mode];
 $('#daylight').textContent=state.trial?'第'+(state.trial.turn+1)+'/24拍':'日光 '+b.daylight+'/24';
 $('#knots').textContent=state.trial?'余势 '+state.trial.hp:'羽结 '+b.bag.knots+'/2';
 $('#berries').textContent='露莓 '+(state.trial?state.trial.berries:b.bag.berries);
 $('#collection').textContent='伙伴 '+b.roster.length+'/5';
 $('#notice').textContent=b.notice;$('#field-controls').hidden=mode!=='explore';
 $('#panel').innerHTML=mode==='camp'?campPanel():mode==='explore'?explorePanel():mode==='encounter'?encounterPanel():mode==='trial'?trialPanel():endingPanel();
 $('#progress-list').innerHTML=[['discovered','01 · 结识新伙伴'],['adjusted','02 · 调整出行队伍'],['grown','03 · 成长与准备'],['completed','04 · 完成浅滩冒险']].map(([key,label])=>'<li data-done="'+p[key]+'">'+(p[key]?'✓ ':'')+label+'</li>').join('');
 $('#progress-hint').textContent=journeyObjective(state);
 $('#journal-count').textContent=' · '+b.journal.length+'条';
 $('#journal').replaceChildren(...[...b.journal].reverse().map(e=>{const li=document.createElement('li');li.textContent='第'+e.outing+'次 · '+e.text;return li;}));
 document.querySelectorAll('.field-controls [data-action]').forEach(el=>{el.dataset.revision=state.revision;el.disabled=!!allowed(state,el.dataset.action,el.dataset.arg);});
 $('#import-v2').disabled=!legacy||saveBlocked||state.commands.length>0;
 $('#restore-note').textContent=legacy?'可在开始新行动前承接本机v2档：只读原记录，另存v3。已开始的v3需先确认新旅途才能重新承接。':'v1/v2入口与记录独立保留。本机没有可承接的v2记录。';
 document.body.dataset.phase=mode;
}
function command(kind,arg,revision=state.revision){
 if(paused||performance.now()-lastInput<150)return;
 if(!input(state,{kind,arg,revision}))return;lastInput=performance.now();persist();draw();
 const target=[...document.querySelectorAll('[data-action]')].find(el=>el.dataset.action===kind&&(el.dataset.arg||undefined)===(arg||undefined)&&!el.disabled);
 (target||$('#panel h2'))?.focus({preventScroll:true});
}
function openDialog(title,body,reset=false){
 previousFocus=document.activeElement;paused=true;$('#dialog-title').textContent=title;$('#dialog-body').innerHTML=body;$('#confirm-reset').hidden=!reset;$('#resume').textContent=reset?'保留当前旅途':'继续';$('#overlay').hidden=false;$('#resume').focus();
}
function resume(){paused=false;$('#overlay').hidden=true;(previousFocus?.isConnected?previousFocus:$('#pause')).focus();}
$('#help').onclick=()=>openDialog('从相遇到一段完整归途','<ol><li>选两位出行，沿原有步道发现伙伴。削弱和露莓能提高羽结回应率，最高88%，失败仍消耗；回营后才入册。</li><li>把任意新伙伴换入队伍。任意伙伴经历两次有结果的相遇即可成长一次；随后回营准备。</li><li>终挑战可选任意两位。24拍内平息余势，注意属性、试探/蓄势/回涌的预告。守息回能量并提供16护盾；五种技能和换位各有用途。</li><li>失败回营仍保留伙伴与成长，可免费整备重试；完成后有旅途总结，再自由出行。</li></ol><p>没有现实倒计时。移动用方向键/WASD；所有按钮支持Tab/Enter。终挑战1轻击、2技能、3守息、4露莓、5换位；P/Esc暂停。</p><p>这是独立v3候选。v2的旧命令仍按原规则重放，承接只读旧档并另存。仍是一片浅滩、五位伙伴、一次有限成长，无新地区或联网。既有原创美术沿用静态关键姿态。</p>');
$('#pause').onclick=()=>paused?resume():openDialog('在这里歇一会儿','<p>没有时间自动流逝；有效行动才推进日光或终挑战拍数。</p>');
$('#resume').onclick=resume;
$('#new-record').onclick=()=>openDialog('开始一份新的v3旅途？','<p>确认后清空当前v3候选的旅途、成长与结局。v1/v2记录不变，可重新只读承接v2。此操作无法撤销。</p>',true);
$('#confirm-reset').onclick=()=>{saveBlocked=false;state=createGame();resume();persist();draw();};
$('#import-v2').onclick=()=>{if(!legacy||saveBlocked||state.commands.length)return;state=createGame(undefined,legacy);persist();draw();openDialog('已承接v2旅途','<p>队伍、背包、相遇和原羽结结果均从原命令重放恢复。之后另存为v3，原v2记录没有被覆盖。</p>');};
document.addEventListener('click',e=>{const el=e.target.closest('button[data-action]');if(el&&!el.disabled)command(el.dataset.action,el.dataset.arg,Number(el.dataset.revision));});
document.addEventListener('click',e=>{
 if(!e.target.closest('#review-summary')||paused||phase(state)!=='camp')return;
 const summary=completedSummary(state);
 openDialog(summary?'新的同行，也是归途':'总结暂时无法读取',summary?endingDetails(summary)+'<p>这是完成当时的记录。重读不消耗行动，也不会再次结算。</p>':'<p>原记录保持不变，本次没有找到可重读的完成总结。</p>');
 $('#resume').textContent='回到营地';
});
canvas.addEventListener('click',e=>{if(phase(state)!=='explore'||paused)return;const dir=hitNode(e.clientX,e.clientY,canvas.getBoundingClientRect(),state.base);if(dir)command('move',dir);});
$('#path-toggle').onclick=()=>{showPaths=!showPaths;$('#path-toggle').textContent='步道提示：'+(showPaths?'开':'关');$('#path-toggle').setAttribute('aria-pressed',String(showPaths));render(ctx,state,assets,{showPaths,viewportWidth:canvas.getBoundingClientRect().width});};
document.addEventListener('keydown',e=>{
 if(e.key==='Escape'||e.key.toLowerCase()==='p'){e.preventDefault();paused?resume():$('#pause').click();return;}
 if(paused){if(e.key==='Tab'){const all=[...$('#overlay').querySelectorAll('button:not([hidden])')],first=all[0],last=all.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}return;}
 const dir={ArrowUp:'up',w:'up',ArrowDown:'down',s:'down',ArrowLeft:'left',a:'left',ArrowRight:'right',d:'right'}[e.key];
 if(dir&&phase(state)==='explore'&&!e.ctrlKey&&!e.metaKey&&!e.altKey){e.preventDefault();command('move',dir);}
 if(phase(state)==='trial'){const kind={1:'trialAttack',2:'trialSkill',3:'trialGuard',4:'trialHeal',5:'trialSwitch'}[e.key];if(kind){e.preventDefault();const el=$('[data-action="'+kind+'"]');if(el&&!el.disabled)el.click();}}
});
window.addEventListener('resize',()=>render(ctx,state,assets,{showPaths,viewportWidth:canvas.getBoundingClientRect().width}));
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!paused&&phase(state)!=='camp')openDialog('旅途已暂停','<p>队伍、行动和结局都留在原处，没有离线推进。</p>');});
Object.defineProperty(window,'featherJourneySnapshot',{value:()=>JSON.parse(JSON.stringify({...state,phase:phase(state),progress:progress(state),invariants:invariants(state),assetsReady})),writable:false});
draw();persist();if(resumed)openDialog('欢迎回来','<p>已恢复本版旅途，伙伴、行动结果和冒险完成状态保持不变。</p>');
Promise.all([imageLoad('background',ART+'echo-shoal.webp'),...Object.keys(SPECIES).map(id=>imageLoad(id,art(id)))]).then(ok=>{assetsReady=ok.every(Boolean);$('#asset-error').hidden=assetsReady;draw();});
