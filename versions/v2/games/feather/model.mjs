// Independent v2 model. The legacy eight-chapter engine and storage are not imported or changed.
export const SAVE_KEY = 'classic-atlas.feather.expedition.v2';
export const SPECIES = Object.freeze({
  a: {id:'a',name:'岚翎',element:'wind',role:'风羽向导',hp:84,power:16,soothe:8,skill:'缠风',skillHint:'2能量 · 10威力，来招减半2次',art:'lanling'},
  b: {id:'b',name:'苔灯',element:'moss',role:'苔息医者',hp:100,power:14,soothe:12,skill:'苔息',skillHint:'2能量 · 自身恢复28体力',art:'taideng'},
  c: {id:'c',name:'澄汐',element:'water',role:'泉声旅人',hp:88,power:16,soothe:9,skill:'澄心',skillHint:'2能量 · 自身恢复18，安心+10',art:'chengxi'},
  bud: {id:'bud',name:'晶雾芽',element:'moss',role:'草间倾听者',hp:70,power:12,soothe:15,skill:'晶雾',skillHint:'2能量 · 安心+22，来招减半1次',art:'bud'},
  fin: {id:'fin',name:'露纹鳍',element:'water',role:'浅湾守望者',hp:76,power:18,soothe:7,skill:'潮护',skillHint:'2能量 · 10威力，自身获得18护盾',art:'fin'}
});
export const ELEMENTS={wind:{name:'风',color:'#f1cc77'},moss:{name:'苔',color:'#a6d4a2'},water:{name:'泉',color:'#90d4eb'}};
export const WALKABLE = [[1,3],[2,3],[3,3],[4,3],[5,3],[6,3],[7,3],[1,2],[1,1],[2,1],[3,1],[3,2],[4,1],[5,1],[5,2],[7,2],[7,1]];
export const SITES={camp:{x:1,y:3,name:'归羽营地'},berry:{x:1,y:1,name:'露莓丛'},bud:{x:4,y:1,name:'晶芽草间'},fin:{x:7,y:1,name:'回声浅湾'}};
export const WILD={bud:{hp:42,power:12,element:'moss'},fin:{hp:54,power:15,element:'water'}};
const copy=x=>JSON.parse(JSON.stringify(x));
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export const factor=(a,b)=>({wind:'moss',moss:'water',water:'wind'}[a]===b?1.5:{wind:'water',moss:'wind',water:'moss'}[a]===b?.75:1);
export const maxHP=p=>SPECIES[p.id].hp+(p.rank?8:0);
export const power=p=>SPECIES[p.id].power+(p.rank?2:0);
export const partner=(s,id)=>s.roster.find(p=>p.id===id);
export const active=s=>partner(s,s.active);
const fresh=id=>({id,hp:SPECIES[id].hp,energy:3,shield:0,xp:0,rank:0,encounters:0});
export function createGame(seed=0x51f7ac9){return {version:2,seed:seed>>>0||1,rng:seed>>>0||1,revision:0,phase:'camp',outing:0,roster:['a','b','c'].map(fresh),team:['a','b'],active:'a',pos:{x:1,y:3},daylight:24,bag:{knots:2,berries:2},sites:{berry:false,bud:false,fin:false},seen:[],pending:[],wild:null,report:null,journal:[],log:[],stats:{moves:0,captures:0,failedCaptures:0,won:0,calmed:0,returned:0,exhausted:0},notice:'从三位老朋友中选两位出行。每次出行补满体力、能量和背包。'};}
function note(s,text,type='info'){s.notice=text;s.journal.push({n:s.revision+1,outing:s.outing,type,text});if(s.journal.length>70)s.journal.shift();}
function random(s){let x=s.rng>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;s.rng=x>>>0;return s.rng/4294967296;}
export function captureChance(s){if(!s.wild)return 0;const w=s.wild;return clamp(22+Math.floor(50*(1-w.hp/w.maxHP))+w.calm-w.wariness,5,88);}
export function nextIntent(s){if(!s.wild)return '';return s.wild.turn%3===1?'观察':s.wild.turn%3===2?'重击':'试探';}
export function estimateHit(s,special=false){if(!s.wild)return 0;return Math.min(s.wild.hp,Math.floor((special?10:power(active(s)))*factor(SPECIES[s.active].element,s.wild.element)));}
export function incoming(s){if(!s.wild||nextIntent(s)==='观察')return 0;const w=s.wild;return Math.floor(w.power*(nextIntent(s)==='重击'?1.4:1)*factor(w.element,SPECIES[s.active].element)*(w.weak>0?.5:1)*(w.calm>=30?.65:1));}
function reward(s,outcome){const w=s.wild;if(!w)return;const grown=[];for(const id of w.participants){const p=partner(s,id);p.encounters++;p.xp=Math.min(2,p.xp+1);if(p.xp>=2&&!p.rank){p.rank=1;p.hp=Math.min(maxHP(p),p.hp+8);grown.push(SPECIES[id].name);}}
if(outcome==='captured'){s.pending.push(fresh(w.id));s.stats.captures++;}else if(outcome==='won')s.stats.won++;else if(outcome==='calmed')s.stats.calmed++;
s.report.resolved++;s.report.outcomes.push({id:w.id,outcome});s.report.grown.push(...grown);s.wild=null;s.phase='explore';if(grown.length)note(s,grown.join('、')+'获得一次成长：体力上限+8，基础威力+2。本版成长到此为止。','growth');}
function home(s,reason){if(s.phase==='camp')return;s.report.reason=reason;s.report.remaining=copy(s.bag);s.report.daylight=s.daylight;s.report.recruited=s.pending.map(p=>p.id);for(const p of s.pending)if(!partner(s,p.id))s.roster.push(p);s.pending=[];s.wild=null;s.phase='camp';s.pos={x:1,y:3};s.stats.returned++;note(s,reason+(s.report.recruited.length?' 新伙伴已在营地等你，可换入下一次队伍。':' 可免费整备，再试一次。'),'return');}
function endTurn(s,respond=true){if(s.phase==='encounter'&&respond){const w=s.wild,p=active(s),intent=nextIntent(s),raw=incoming(s),absorbed=Math.min(p.shield,raw),dmg=Math.min(p.hp,raw-absorbed);p.shield=0;p.hp-=dmg;if(w.weak&&intent!=='观察')w.weak--;w.turn++;note(s,s.notice+' '+SPECIES[w.id].name+(intent==='观察'?'正在观察，没有出手。':`的${intent}造成${dmg}伤害${absorbed?'，护盾挡住'+absorbed:''}。`));if(p.hp===0){const other=s.team.map(id=>partner(s,id)).find(q=>q.hp>0);if(other){s.active=other.id;w.participants.push(other.id);w.participants=[...new Set(w.participants)];note(s,s.notice+' '+SPECIES[p.id].name+'需要休息，'+SPECIES[other.id].name+'接替。');}else{home(s,'两位同伴都累倒了，已安全回营。');return;}}}
if(s.phase!=='camp'&&s.daylight<=0){s.stats.exhausted++;home(s,'暮色到了，已沿安全路回营。');}}
function startEncounter(s,id){const w=WILD[id];s.wild={id,hp:w.hp,maxHP:w.hp,power:w.power,element:w.element,calm:0,wariness:0,weak:0,turn:0,participants:[s.active]};s.sites[id]=true;s.seen=[...new Set([...s.seen,id])];s.phase='encounter';note(s,'发现'+SPECIES[id].name+'！可切磋削弱，或用露莓安抚。羽结并非必定成功。','discover');}
export function allowed(s,kind,arg){
if(s.log.length>=4000)return '这份试验记录已满，请在页底选择“新旅途记录”重新开始。';
if(kind==='team'){if(s.phase!=='camp'||!partner(s,arg))return '只能在营地调整已有伙伴';if(s.team.includes(arg)&&s.team.length<=1)return '至少保留一位伙伴';if(!s.team.includes(arg)&&s.team.length>=2)return '先让一位留营，再换入新伙伴';return '';}
if(kind==='lead'){return s.phase==='camp'&&s.team.includes(arg)?'':'只能选择出行队伍的领队';}
if(kind==='depart')return s.phase==='camp'&&s.team.length===2?'':'请选好两位出行伙伴';
if(kind==='home')return ['explore','encounter'].includes(s.phase)?'':'已经在营地';
if(kind==='move'){if(s.phase!=='explore'||!['up','down','left','right'].includes(arg))return '现在不能移动';const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[arg];return WALKABLE.some(([x,y])=>x===s.pos.x+d[0]&&y===s.pos.y+d[1])?'':'这里没有步道';}
if(kind==='leadField')return s.phase==='explore'&&s.team.includes(arg)&&partner(s,arg).hp>0&&s.active!==arg?'':'现在不能更换领队';
if(s.phase!=='encounter')return '当前没有相遇';
if(kind==='attack'||kind==='guard'||kind==='leave')return '';
if(kind==='soothe')return s.bag.berries<=0?'露莓用完了':s.wild.calm>=60?'已经很安心了':'';
if(kind==='heal')return s.bag.berries<=0?'露莓用完了':active(s).hp>=maxHP(active(s))?'当前伙伴体力已满':'';
if(kind==='skill')return active(s).energy>=2?'':'需要2能量，守息可回1';
if(kind==='capture')return partner(s,s.wild.id)||s.pending.some(p=>p.id===s.wild.id)?'这类伙伴已经加入过，可切磋或安心道别':s.bag.knots>0?'':'羽结用完了，回营可补满';
if(kind==='farewell')return s.wild.calm>=60?'':'安心达到60后可和平道别';
if(kind==='switch')return s.team.includes(arg)&&arg!==s.active&&partner(s,arg).hp>0?'':'请选择另一位仍有体力的同伴';
return '未知行动';}
export function input(s,c){if(!c||c.revision!==s.revision||typeof c.kind!=='string'||allowed(s,c.kind,c.arg))return false;const {kind,arg}=c;
if(kind==='team'){s.team=s.team.includes(arg)?s.team.filter(id=>id!==arg):[...s.team,arg];if(!s.team.includes(s.active))s.active=s.team[0];note(s,'出行队伍：'+s.team.map(id=>SPECIES[id].name).join('、')+'。');}
else if(kind==='lead'){s.active=arg;note(s,SPECIES[arg].name+'会走在队伍前面。');}
else if(kind==='depart'){s.outing++;s.phase='explore';s.daylight=24;s.bag={knots:2,berries:2};s.sites={berry:false,bud:false,fin:false};s.pos={x:1,y:3};s.pending=[];s.report={outing:s.outing,recruited:[],outcomes:[],grown:[],resolved:0,reason:''};for(const p of s.roster){p.hp=maxHP(p);p.energy=3;p.shield=0;}note(s,'第'+s.outing+'次短出行。每走一格或做一次相遇行动消耗1日光；随时可以免费回营。');}
else if(kind==='home')home(s,'你选择提前回营。');
else if(kind==='leadField'){s.active=arg;note(s,SPECIES[arg].name+'换到队伍前方。');}
else if(kind==='move'){const d={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]}[arg];s.pos.x+=d[0];s.pos.y+=d[1];s.daylight--;s.stats.moves++;note(s,'沿步道前进，剩余'+s.daylight+'日光。');for(const[id,site]of Object.entries(SITES))if(s.pos.x===site.x&&s.pos.y===site.y){if(id==='camp'){home(s,'你走回了归羽营地。');break;}if(id==='berry'&&!s.sites.berry){s.sites.berry=true;s.bag.berries=Math.min(4,s.bag.berries+1);note(s,'采到1颗露莓。绕路用了日光，但安抚和治疗多了一次选择。','gather');}if(WILD[id]&&!s.sites[id]&&s.daylight>0)startEncounter(s,id);}endTurn(s,false);}
else {s.daylight--;const w=s.wild,p=active(s),name=SPECIES[p.id].name;let respond=true;
if(kind==='attack'){const dmg=estimateHit(s);w.hp-=dmg;w.wariness=Math.min(30,w.wariness+4);note(s,`${name}轻击造成${dmg}伤害；警觉+4。`,'attack');if(w.hp===0){note(s,SPECIES[w.id].name+'退回栖息地，本次无法招募。切磋经验已记下。','won');reward(s,'won');respond=false;}}
else if(kind==='skill'){p.energy-=2;if(p.id==='a'){const dmg=estimateHit(s,true);w.hp-=dmg;w.weak=2;w.wariness=Math.min(30,w.wariness+2);note(s,'缠风造成'+dmg+'伤害，接下来2次来招减半。','skill');}if(p.id==='b'){const heal=Math.min(28,maxHP(p)-p.hp);p.hp+=heal;note(s,'苔息恢复'+heal+'体力。','skill');}if(p.id==='c'){const heal=Math.min(18,maxHP(p)-p.hp);p.hp+=heal;w.calm=Math.min(60,w.calm+10);note(s,'澄心恢复'+heal+'体力，安心+10。','skill');}if(p.id==='bud'){w.calm=Math.min(60,w.calm+22);w.weak=1;note(s,'晶雾让安心+22，下一次来招减半。','skill');}if(p.id==='fin'){const dmg=estimateHit(s,true);w.hp-=dmg;p.shield=18;w.wariness=Math.min(30,w.wariness+2);note(s,'潮护造成'+dmg+'伤害，获得18护盾。','skill');}if(w.hp===0){note(s,SPECIES[w.id].name+'退回栖息地，本次无法招募。','won');reward(s,'won');respond=false;}}
else if(kind==='soothe'){s.bag.berries--;const gain=Math.min(60-w.calm,20+SPECIES[p.id].soothe);w.calm+=gain;note(s,'分享1颗露莓，安心+'+gain+'。露莓也可用来治疗，不能两边都用。','soothe');}
else if(kind==='heal'){s.bag.berries--;const heal=Math.min(26,maxHP(p)-p.hp);p.hp+=heal;note(s,'消耗1颗露莓，恢复'+heal+'体力。','heal');}
else if(kind==='guard'){p.energy=Math.min(3,p.energy+1);p.shield=16;note(s,name+'守息：能量+1（最多3），本次16护盾。','guard');}
else if(kind==='capture'){const chance=captureChance(s),roll=Math.floor(random(s)*100)+1;s.bag.knots--;if(roll<=chance){note(s,`羽结回应了！${SPECIES[w.id].name}愿意同行。成功率${chance}%，本次判定${roll}。回营后可换入队伍。`,'captured');reward(s,'captured');respond=false;}else {s.stats.failedCaptures++;w.wariness=Math.min(30,w.wariness+8);w.calm=Math.max(0,w.calm-10);note(s,`羽结未能连起回应（${chance}% / 判定${roll}）。已消耗1羽结；安心−10，警觉+8。`,'capture-failed');}}
else if(kind==='switch'){s.active=arg;w.participants=[...new Set([...w.participants,arg])];note(s,SPECIES[arg].name+'接替前方，换位消耗一次行动。','switch');}
else if(kind==='farewell'){note(s,SPECIES[w.id].name+'安心地道别。记下切磋经验，但没有加入队伍。','calmed');reward(s,'calmed');respond=false;}
else if(kind==='leave'){s.wild=null;s.phase='explore';note(s,'你退回步道，这次相遇已结束；下次出行可重试。','leave');respond=false;}
endTurn(s,respond);}
s.log.push(copy(c));s.revision++;return true;}
export function checkpoint(s){return {version:2,seed:s.seed,commands:copy(s.log)};}
export function restore(cp){try{if(!cp||cp.version!==2||!Number.isInteger(cp.seed)||cp.seed<1||cp.seed>4294967295||!Array.isArray(cp.commands)||cp.commands.length>4000)return null;const s=createGame(cp.seed);for(const c of cp.commands)if(!input(s,c))return null;return s;}catch{return null;}}
export function invariants(s){return {uniqueRoster:new Set(s.roster.map(p=>p.id)).size===s.roster.length,knownSpecies:s.roster.every(p=>!!SPECIES[p.id]),hp:s.roster.every(p=>Number.isInteger(p.hp)&&p.hp>=0&&p.hp<=maxHP(p)),energy:s.roster.every(p=>p.energy>=0&&p.energy<=3),growth:s.roster.every(p=>p.xp>=0&&p.xp<=2&&p.rank===Number(p.xp===2)),team:s.team.length>=1&&s.team.length<=2&&new Set(s.team).size===s.team.length&&s.team.every(id=>partner(s,id)),active:s.team.includes(s.active),bag:s.bag.knots>=0&&s.bag.knots<=2&&s.bag.berries>=0&&s.bag.berries<=4,daylight:s.daylight>=0&&s.daylight<=24,position:WALKABLE.some(([x,y])=>x===s.pos.x&&y===s.pos.y),phase:['camp','explore','encounter'].includes(s.phase)&&((s.phase==='encounter')===!!s.wild),wild:!s.wild||(s.wild.hp>0&&s.wild.hp<=s.wild.maxHP&&s.wild.calm>=0&&s.wild.calm<=60&&s.wild.wariness>=0&&s.wild.wariness<=30),pending:new Set(s.pending.map(p=>p.id)).size===s.pending.length&&s.pending.every(p=>!partner(s,p.id)),revision:s.revision===s.log.length};}
