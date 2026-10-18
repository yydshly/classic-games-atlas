import assert from 'node:assert/strict';
import {createGame, start, step, action, pause, resume, snapshot, shootingInfo, LEVELS, FIXED_DT} from '../../versions/v2/games/court/engine.mjs';
import * as baseline from '../../preview/court/engine.mjs';

// Fixture tests can arrange geometry or possession; the full-match replays below
// use only discrete normal controls. Neither category proves human play feel.
let checks = 0;
const test = (name, fn) => { fn(); checks++; console.log(`PASS ${name}`); };
const advance = (s, n, controls={}) => { for(let i=0;i<n;i++) step(s, FIXED_DT, controls); };
const near = (a,b,eps=1e-10) => assert.ok(Math.abs(a-b)<eps, `${a} != ${b}`);
function own(s,id){ s.ball={...s.ball,owner:id,mode:'held',lastTeam:id<2?0:1}; s.possession=id<2?0:1; s.players.forEach(p=>p.hasBall=p.id===id); }
function quiet(s){ for(const p of s.players) {p.cooldown=100;p.windup=100;p.intent='';p.vx=p.vy=0;} }
function mirror(s){
  const t=snapshot(s);
  t.players=s.players.map((_,id)=>({...s.players[id^2], id, team:id<2?0:1, x:1000-s.players[id^2].x, vx:-s.players[id^2].vx, faceX:-s.players[id^2].faceX}));
  t.ball.owner=s.ball.owner===null?null:s.ball.owner^2;t.ball.lastTeam=1-s.ball.lastTeam;t.possession=1-s.possession;t.controlled=s.controlled^2;
  return t;
}
function physics(s){const c=snapshot(s);delete c.feedback;delete c.feedbackSeq;for(const p of c.players){delete p.visualAction;delete p.visualT;delete p.contactT;}return c;}
function shotState(team=0,distance=180){
  const s=start(createGame());const id=team*2;own(s,id);s.controlled=id;
  Object.assign(s.players[id],{x:team?70+distance:930-distance,y:280});
  Object.assign(s.players[id^1],{x:500,y:450});
  for(const p of s.players)if(p.team!==team)Object.assign(p,{x:team?850:150,y:p.id%2?490:70});
  return s;
}

test('the eight level records and full shared shooting formula remain unchanged',()=>{
  assert.deepEqual(LEVELS,baseline.LEVELS);assert.equal(LEVELS[0].duration,75);
  for(const team of [0,1])for(const d of [40,124,125,200,260,261,390,700])for(const charge of [0,0.2,0.65,1]){
    const s=shotState(team,d),p=s.players[team*2];p.vx=110;p.vy=-22;
    Object.assign(s.players[(team*2)^2],{x:p.x+(team?-50:50),y:300});
    assert.deepEqual(shootingInfo(s,p,charge),baseline.shootingInfo(s,p,charge));
    const m=mirror(s);assert.deepEqual(shootingInfo(s,p,charge),shootingInfo(m,m.players[p.id^2],charge));
  }
});
test('shot feedback consumes no RNG and changes neither release result nor stats',()=>{
  for(const team of [0,1])for(const seed of [1,7139,100000,96557]){
    const s=shotState(team),old=baseline.start(baseline.createGame());
    Object.assign(old,structuredClone(s));s.rng=old.rng=seed;
    action(s,'shoot');baseline.action(old,'shoot');
    assert.deepEqual(s.ball,old.ball);assert.equal(s.rng,old.rng);assert.deepEqual(s.stats,old.stats);
    assert.deepEqual(s.score,[0,0]);const e=s.feedback.find(e=>e.type==='shot');assert.equal(e.playerId,team*2);assert.equal(e.team,team);
    assert.ok(s.players.every(p=>p.role==='rebound'&&p.markId===null));
  }
});
test('unique pressure and off-ball denial cover all owners, levels and tie distances',()=>{
  for(let level=0;level<8;level++)for(let owner=0;owner<4;owner++)for(const dx of [0,10,90]){
    const s=start(createGame(level));own(s,owner);quiet(s);s.controlled=owner;
    const attackers=s.players.filter(p=>p.team===s.possession),guards=s.players.filter(p=>p.team!==s.possession);
    Object.assign(s.players[owner],{x:500,y:280});Object.assign(attackers.find(p=>p.id!==owner),{x:600,y:470});
    Object.assign(guards[0],{x:410-dx,y:220});Object.assign(guards[1],{x:590,y:220});
    step(s);assert.equal(guards.filter(p=>p.role==='pressure').length,1);assert.equal(guards.filter(p=>p.role==='deny').length,1);
    assert.equal(guards.find(p=>p.role==='pressure').markId,owner);assert.equal(guards.find(p=>p.role==='deny').markId,owner^1);
    assert.equal(new Set(guards.map(p=>p.markId)).size,2);
  }
});
test('defensive assignments mirror across teams including the exact-distance tie',()=>{
  for(const dx of [0,10,90]){
    const s=start(createGame());own(s,0);quiet(s);Object.assign(s.players[0],{x:500,y:280});Object.assign(s.players[1],{x:600,y:470});
    Object.assign(s.players[2],{x:410-dx,y:220});Object.assign(s.players[3],{x:590,y:220});
    const m=mirror(s);step(s);step(m);
    for(const p of s.players){const q=m.players[p.id^2];assert.equal(p.role,q.role);assert.equal(p.markId===null?null:p.markId^2,q.markId);}
  }
});
test('in-flight passes retain one receiver guard and one passer guard',()=>{
  const s=start(createGame());Object.assign(s.players[0],{x:200,y:180});Object.assign(s.players[1],{x:600,y:180});
  Object.assign(s.players[2],{x:850,y:420});Object.assign(s.players[3],{x:850,y:100});
  action(s,'pass');const g=s.players.slice(2);assert.equal(g.find(p=>p.role==='pressure').markId,1);assert.equal(g.find(p=>p.role==='deny').markId,0);
  step(s);assert.equal(g.filter(p=>p.role==='pressure').length,1);assert.deepEqual([...g.map(p=>p.markId)].sort(),[0,1]);
});
test('off-ball support moves into the opposite wing rather than crowding the owner',()=>{
  const s=start(createGame());Object.assign(s.players[0],{x:420,y:420});Object.assign(s.players[1],{x:455,y:380});
  Object.assign(s.players[2],{x:870,y:70});Object.assign(s.players[3],{x:870,y:500});step(s);
  assert.equal(s.players[1].role,'support');assert.ok(s.players[1].vx>0&&s.players[1].vy<0);
});
function cutFixture(team=0){
  const s=start(createGame());const id=team*2,sign=team?-1:1;own(s,id);s.controlled=id;
  Object.assign(s.players[id],{x:team?280:720,y:430});Object.assign(s.players[id^1],{x:team?450:550,y:120});
  for(const p of s.players)if(p.team!==team)Object.assign(p,{x:team?950:50,y:p.id%2?500:60,cooldown:100});
  action(s,'pass');return s;
}
test('successful user pass transfers control and launches a visible time-bounded cut',()=>{
  const s=cutFixture();const from={x:s.players[0].x,y:s.players[0].y};
  for(let i=0;i<70&&s.ball.owner!==1;i++)step(s);
  assert.equal(s.ball.owner,1);assert.equal(s.controlled,1);assert.ok(s.players[0].cutT>1.7);
  assert.equal(s.players[0].role,'cut');assert.ok(s.feedback.some(e=>e.type==='cut'&&e.playerId===0));assert.ok(s.feedback.some(e=>e.type==='receive'&&e.playerId===1));
  advance(s,25);assert.ok(s.players[0].x>from.x+35);assert.ok(s.players[0].y<from.y-15);
  assert.deepEqual(s.score,[0,0]);advance(s,100);assert.equal(s.players[0].cutT,0);
});
test('both AI teams can return the ball through the ordinary interceptable pass path',()=>{
  for(const team of [0,1]){
    const s=cutFixture(team),id=team*2;
    // Keep the controlled opponent away so both attackers can make decisions.
    s.controlled=(1-team)*2;s.pendingControl=null;
    let sawReturn=false,gotBack=false;
    for(let i=0;i<170;i++){
      step(s);
      if(s.ball.mode==='pass'&&s.ball.passer===(id^1)&&s.ball.receiver===id)sawReturn=true;
      if(sawReturn&&s.ball.owner===id){gotBack=true;break;}
    }
    assert.ok(sawReturn,`team ${team} should choose an open cutter`);assert.ok(gotBack,`team ${team} return should arrive`);
    assert.equal(s.stats.passes[team],2);assert.deepEqual(s.score,[0,0]);
  }
});
test('an expiring shot clock keeps the existing emergency shot ahead of a return pass',()=>{
  const s=start(createGame());own(s,2);s.shotClock=0.45;
  Object.assign(s.players[0],{x:900,y:100});Object.assign(s.players[1],{x:900,y:450});
  Object.assign(s.players[2],{x:500,y:280,hold:1,think:0});Object.assign(s.players[3],{x:300,y:280,cutT:1,cutX:300,cutY:280});
  step(s);assert.equal(s.players[2].intent,'shoot');advance(s,30);
  assert.equal(s.stats.shots[1],1);assert.equal(s.stats.passes[1],0);assert.equal(s.stats.turnovers[1],0);
});
test('intercepted pass emits the defender event and cancels the planned cut',()=>{
  const s=start(createGame());Object.assign(s.players[0],{x:300,y:280});Object.assign(s.players[1],{x:600,y:280});
  Object.assign(s.players[2],{x:450,y:280});Object.assign(s.players[3],{x:900,y:450});action(s,'pass');
  for(let i=0;i<40&&s.stats.steals[1]===0;i++)step(s);
  const e=s.feedback.find(e=>e.type==='intercept');assert.ok(e);assert.equal(e.playerId,2);assert.equal(e.team,1);
  assert.ok(s.players.every(p=>p.cutT===0));assert.deepEqual(s.score,[0,0]);assert.equal(s.stats.turnovers[0],1);
  const guards=s.players.filter(p=>p.team===0);assert.equal(guards.filter(p=>p.role==='pressure').length,1);
});
test('out-of-range steal gives failure feedback with no free possession or points',()=>{
  const s=start(createGame());own(s,2);quiet(s);s.players[0].windup=0;s.players[0].cooldown=0;
  Object.assign(s.players[0],{x:100,y:100});Object.assign(s.players[2],{x:700,y:280});
  action(s,'steal');advance(s,10);assert.equal(s.ball.owner,2);assert.equal(s.stats.steals[0],0);assert.deepEqual(s.score,[0,0]);
  assert.ok(s.feedback.some(e=>e.type==='steal-fail'&&e.playerId===0));assert.ok(s.players[0].cooldown>0);
});
test('successful steal uses the existing windup and emits the correct actor',()=>{
  const s=start(createGame());s.rng=1;own(s,2);Object.assign(s.players[0],{x:430,y:280});
  Object.assign(s.players[2],{x:470,y:280,windup:2,action:'windup'});Object.assign(s.players[1],{x:80,y:80});Object.assign(s.players[3],{x:800,y:500});
  action(s,'steal');assert.equal(s.feedback.filter(e=>e.type==='steal-success').length,0);advance(s,12,{x:1});
  assert.equal(s.ball.owner,0);assert.ok(s.feedback.some(e=>e.type==='steal-success'&&e.playerId===0&&e.team===0));assert.deepEqual(s.score,[0,0]);
});
test('contact feedback preserves the exact pre-existing soft collision displacement',()=>{
  const s=start(createGame());quiet(s);Object.assign(s.players[0],{x:450,y:280});Object.assign(s.players[2],{x:470,y:280});
  const old=snapshot(s);step(s,FIXED_DT,{x:1});baseline.step(old,FIXED_DT,{x:1});
  for(let i=0;i<4;i++){near(s.players[i].x,old.players[i].x);near(s.players[i].y,old.players[i].y);}
  assert.deepEqual(s.ball,old.ball);assert.ok(s.feedback.some(e=>e.type==='blocked'&&e.playerId===0));assert.deepEqual(s.score,[0,0]);
});
test('landing, score and celebration identify the shooter without extra score writes',()=>{
  for(const team of [0,1]){
    const s=shotState(team,80);s.rng=1;action(s,'shoot');assert.equal(s.ball.made,true);const duration=s.ball.duration;const id=team*2;
    advance(s,34);assert.ok(s.feedback.some(e=>e.type==='land'&&e.playerId===id));assert.deepEqual(s.score,[0,0]);
    advance(s,Math.ceil(duration*60)-34+1);assert.equal(s.score[team],2);assert.equal(s.stats.makes[team],1);
    const e=s.feedback.find(e=>e.type==='score');assert.equal(e.playerId,id);assert.equal(e.team,team);
    assert.ok(s.feedback.some(e=>e.type==='celebrate'&&e.playerId===id));assert.equal(s.players[id].visualAction,'celebrate');assert.ok(s.players[id].visualT>0);
    advance(s,20);assert.equal(s.score[team],2);assert.equal(s.stats.makes[team],1);
  }
});
test('both teams can collect real loose rebounds and receive the same clock reset',()=>{
  for(const team of [0,1]){
    const s=start(createGame());quiet(s);s.players.forEach(p=>p.hasBall=false);const id=team*2;Object.assign(s.players[id],{x:500,y:280});
    for(const p of s.players)if(p.id!==id)Object.assign(p,{x:p.id%2?900:100,y:p.id%2?480:80});
    s.shotClock=3;s.ball={x:500,y:280,z:0,vx:0,vy:0,vz:0,owner:null,mode:'loose',t:0.3,lastTeam:1-team,rebound:true};step(s);
    assert.equal(s.ball.owner,id);assert.equal(s.stats.rebounds[team],1);near(s.shotClock,20-FIXED_DT);assert.deepEqual(s.score,[0,0]);
    const e=s.feedback.find(e=>e.type==='rebound');assert.equal(e.playerId,id);assert.equal(e.team,team);
  }
});
test('miss event precedes collectable physical rebound, without awarding points',()=>{
  const s=shotState();s.rng=100000;action(s,'shoot');assert.equal(s.ball.made,false);let sawMiss=false,sawLoose=false;
  for(let i=0;i<240&&s.stats.rebounds.reduce((a,b)=>a+b,0)===0;i++){step(s);sawMiss||=s.feedback.some(e=>e.type==='miss'&&e.playerId===0);sawLoose||=s.ball.mode==='loose';}
  assert.ok(sawMiss&&sawLoose);assert.equal(s.stats.rebounds.reduce((a,b)=>a+b,0),1);assert.deepEqual(s.score,[0,0]);
});
test('feedback, cut timers and visual state freeze exactly while paused',()=>{
  const s=cutFixture();for(let i=0;i<70&&s.ball.owner!==1;i++)step(s);
  s.players[1].visualAction='celebrate';s.players[1].visualT=0.6;pause(s);const frozen=snapshot(s);
  advance(s,120,{x:1,shoot:true});action(s,'pass');action(s,'steal');assert.deepEqual(s,frozen);
  resume(s);step(s);assert.ok(s.players[0].cutT<frozen.players[0].cutT);assert.ok(s.players[1].visualT<frozen.players[1].visualT);
});
test('feedback event IDs are monotonic, bounded and expire solely on fixed ticks',()=>{
  const s=shotState();for(let i=0;i<40;i++){own(s,0);s.players[0].action='';action(s,'shoot');}
  assert.equal(s.feedbackSeq,40);assert.equal(s.feedback.length,24);assert.equal(new Set(s.feedback.map(e=>e.id)).size,24);
  assert.ok(s.feedback.every((e,i,a)=>i===0||e.id>a[i-1].id));const ttl=s.feedback[0].ttl;step(s,FIXED_DT/2);assert.equal(s.feedback[0].ttl,ttl);
  step(s,FIXED_DT/2);near(s.feedback[0].ttl,ttl-FIXED_DT);assert.ok(s.feedback.every(e=>e.ttl<=e.life&&e.ttl>0));
  const lastId=s.feedbackSeq;advance(s,90);assert.ok(!s.feedback.some(e=>e.id<=lastId));assert.ok(s.feedbackSeq>=lastId);
});
test('presentation state and feedback retention cannot alter gameplay or RNG',()=>{
  const a=start(createGame(5)),b=start(createGame(5));
  for(let i=0;i<2400;i++){
    const input={x:i%300<150?1:-1,y:i%240<120?1:-1,shoot:i%180<32};
    if(i%220===0){action(a,'pass');action(b,'pass');}
    if(i%113===0){action(a,'steal');action(b,'steal');}
    b.feedback=[];for(const p of b.players){p.visualAction='celebrate';p.visualT=2;p.contactT=4;}
    step(a,FIXED_DT,input);step(b,FIXED_DT,input);assert.deepEqual(physics(a),physics(b));
  }
});
const key=d=>Math.abs(d)<5?0:Math.sign(d);
function pilot(s){const p=s.players[s.controlled],b=s.ball;let tx=p.x,ty=p.y,shoot=false;
  if(b.owner===p.id){const info=shootingInfo(s);tx=875;ty=p.y<280?160:400;if(s.charging)shoot=s.charge<0.65;else if((info.distance<200&&info.chance>0.42&&p.hold>0.3)||s.shotClock<3)shoot=true;else if(info.contest>0.65&&p.hold>1)action(s,'pass');}
  else if(b.mode==='loose'){tx=b.x;ty=b.y;}else if(b.owner!==null&&s.players[b.owner].team===1){const o=s.players[b.owner];tx=o.x-25;ty=o.y;if(Math.hypot(p.x-o.x,p.y-o.y)<60)action(s,'steal');}else{tx=780;ty=400;}
  return{x:key(tx-p.x),y:key(ty-p.y),shoot};}
test('all eight matches replay identically, end normally and account every point to a make',()=>{
  for(let level=0;level<8;level++){
    const a=start(createGame(level)),b=start(createGame(level));let ticks=0;const types=new Set();
    while(a.state==='playing'&&ticks<18000){step(a,FIXED_DT,pilot(a));step(b,FIXED_DT,pilot(b));for(const e of a.feedback)types.add(e.type);
      assert.deepEqual(a,b);for(const team of [0,1])assert.ok(a.score[team]>=a.stats.makes[team]*2&&a.score[team]<=a.stats.makes[team]*3);ticks++;}
    assert.ok(['won','lost'].includes(a.state));assert.ok(a.stats.shots.every((v,i)=>v>=a.stats.makes[i]));assert.ok(a.feedback.length<=24);
    console.log(`  deterministic match ${level+1}: ${a.score.join('-')} ${a.state}; passes ${a.stats.passes.join('/')}; rebounds ${a.stats.rebounds.join('/')}; events ${[...types].sort().join(',')}`);
  }
});
console.log(`\n${checks} focused engine checks passed. Geometry fixtures and scripted replays are not human-play or browser acceptance.`);
