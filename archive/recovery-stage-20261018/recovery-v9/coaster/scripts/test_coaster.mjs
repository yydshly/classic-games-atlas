import assert from 'node:assert/strict';
import {createGame,start,pause,resume,retry,command,canCommand,step,snapshot,checkpoint,restore,inspectDesign,LEVELS,MODULES,PHYSICS,FIXED_DT} from '../games/coaster/engine.mjs';
import {COASTER_PLANS,prepareCoaster,pilotCoaster,runPilot} from './coaster_pilot.mjs';
// Engine acceptance only. Browser rendering, physical device input and visible
// accessibility need their own checks; this file does not claim those passes.
let checks=0;
const test=(name,fn)=>{fn();checks++;console.log(`PASS ${name}`);};
const close=(a,b,epsilon=1e-9)=>assert.ok(Math.abs(a-b)<=epsilon,`${a} != ${b}`);
function settle(s,limit=20000){for(let n=0;n<limit&&['testing','operating'].includes(s.state);n++)step(s,FIXED_DT);assert.ok(!['testing','operating'].includes(s.state),'simulation must terminate');return s;}
function build(s,entries){for(const [segment,module]of entries)assert.ok(command(s,{type:'module',segment,module}).ok);return s;}
function certify(s){assert.ok(command(s,'test').ok);settle(s);assert.equal(s.state,'design');return s.report;}
function roundtrip(s){const cp=checkpoint(s);assert.ok(cp);const copy=restore(cp);assert.ok(copy);assert.deepEqual(snapshot(copy),snapshot(s));return copy;}
function invariant(s){
 assert.equal(s.cost,s.modules.reduce((n,id)=>n+MODULES[id].cost,0));assert.equal(s.cash,s.level.budget-s.cost);assert.ok(s.cash>=0);
 assert.equal(s.elapsed,s.tick*FIXED_DT);assert.ok(s.accumulator>=0&&s.accumulator<FIXED_DT+1e-10);
 assert.ok(s.train.segment>=0&&s.train.segment<12);assert.ok(s.train.t>=0&&s.train.t<=1);assert.ok(s.runProgress>=0&&s.runProgress<=1);
 for(const key of ['x','y','z','speed'])assert.ok(Number.isFinite(s.train[key]));
 assert.ok(s.runs>=0&&s.runs<=s.level.maxRuns);assert.ok(s.visitors>=0&&s.revenue>=0&&s.reputation>=0);
 const effective=s.state==='paused'?s.priorState:s.state;
 if(effective==='operating')assert.equal(s.aboard,s.report.riders);else assert.equal(s.aboard,0);
}
test('eight immutable authored closed alignments with distinct curricula and goals',()=>{
 assert.equal(LEVELS.length,8);assert.equal(Object.keys(MODULES).length,6);assert.equal(COASTER_PLANS.length,8);
 assert.equal(new Set(LEVELS.map(l=>JSON.stringify(l.points))).size,8);
 assert.equal(new Set(COASTER_PLANS.map(p=>p.join(','))).size,7); // Same repair pattern, different constrained budget in 6.
 for(const l of LEVELS){assert.ok(Object.isFrozen(l)&&Object.isFrozen(l.points)&&Object.isFrozen(l.segments));assert.equal(l.points.length,12);assert.equal(l.segments.length,12);assert.equal(l.segments[11].to,0);assert.equal(l.maxRuns,3);assert.ok(l.budget>0&&l.targetRevenue>0&&l.minThrill>0&&l.minComfort>0);for(const seg of l.segments){assert.equal(seg.from,seg.id);assert.equal(seg.to,(seg.id+1)%12);assert.ok(seg.length>0&&seg.turnRadius>0);}}
});
test('literal energy, lateral, comfort and thrill oracle on first hill',()=>{
 const s=build(createGame(0),[[0,'lift'],[11,'brake']]),r=inspectDesign(s),p=r.segments[1];
 // First descent: (140,300,28)→(240,140,8), geometric scale 0.15.
 const length=Math.sqrt(15**2+24**2+20**2);close(length,Math.sqrt(1201));
 const energy=64+19.6*20-.7*length;close(p.freeEnergy,energy);close(p.exitSpeed,Math.sqrt(energy));
 close(p.maxSpeed,Math.sqrt(energy));close(p.lateral,energy/(160*9.8));close(p.comfort,100);
 close(p.thrill,(8+Math.sqrt(energy))*.95+20*.36+energy/(160*9.8)*5);
 close(p.duration,2*length/(8+Math.sqrt(energy)));close(p.acceleration,(energy-64)/(2*length));
 assert.equal(s.report,null,'analysis does not issue a certificate');assert.equal(canCommand(s,'open').ok,false);
});
test('literal station braking oracle and budget boundary/refund',()=>{
 const s=build(createGame(0),[[0,'lift'],[3,'lift'],[11,'brake']]);assert.equal(s.cost,380);assert.equal(s.cash,0);
 const before=snapshot(s),rejected=command(s,{type:'module',segment:2,module:'bank'});assert.equal(rejected.ok,false);assert.match(rejected.reason,/预算/);assert.deepEqual(snapshot(s),before);
 assert.equal(canCommand(s,{type:'module',segment:3,module:'rail'}).cost,-160);assert.ok(command(s,{type:'module',segment:3,module:'rail'}).ok);assert.equal(s.cash,160);assert.equal(s.cost,220);
 const p=inspectDesign(s).segments[11];assert.equal(p.exitSpeed,10);close(p.deceleration,(p.entrySpeed**2-100)/(2*s.level.segments[11].length));
});
test('module placement laws and invalid commands preserve state exactly',()=>{
 const s=createGame(0);for(const c of [null,{},[],{type:'module',segment:-1,module:'bank'},{type:'module',segment:2.1,module:'rail'},{type:'module',segment:0,module:'__proto__'},{type:'module',segment:1,module:'lift'},{type:'module',segment:0,module:'drive'},{type:'module',segment:1,module:'drive'},{type:'module',segment:11,module:'drive'},{type:'select',segment:12},{type:'nope'}]){const before=snapshot(s);assert.equal(command(s,c).ok,false);assert.deepEqual(snapshot(s),before);}
});
test('empty track fails at first uphill; unvisited segments remain unmeasured',()=>{
 const s=createGame(0);certify(s);assert.equal(s.report.safe,false);assert.equal(s.report.firstFailure,0);assert.equal(s.report.testedSegments,1);assert.equal(s.report.diagnosis[0].code,'stall');assert.ok(s.train.t>0&&s.train.t<1);close(s.train.speed,4,1e-7);assert.equal(s.report.segments[0].exitReached,false);assert.equal(s.report.segments[0].measuredExitSpeed,4);assert.equal(s.report.minSpeed,4);
 assert.ok(s.report.segments.slice(1).every(p=>!p.measured&&p.status==='unreached'));assert.equal(s.revenue,0);assert.equal(s.runs,0);assert.equal(command(s,'open').ok,false);
});
test('unbraked safe route diagnoses the exact final station segment',()=>{
 const s=build(createGame(0),[[0,'lift']]);certify(s);assert.equal(s.report.firstFailure,11);assert.ok(s.report.diagnosis.some(d=>d.code==='station'&&d.segment===11));assert.equal(s.revenue,0);
});
test('tall descent overspeeds before downstream bends',()=>{
 const s=build(createGame(1),[[0,'lift'],[11,'brake']]);certify(s);assert.equal(s.report.firstFailure,1);assert.ok(s.report.diagnosis.some(d=>d.code==='overspeed'&&d.segment===1));assert.equal(s.report.testedSegments,2);
});
test('tight bend diagnosed as lateral force; banking preserves energy exactly',()=>{
 const s=build(createGame(2),[[0,'lift'],[11,'brake']]);const plain=inspectDesign(s);certify(s);assert.equal(s.report.firstFailure,2);assert.equal(s.report.diagnosis[0].code,'lateral');
 command(s,{type:'module',segment:2,module:'bank'});const banked=inspectDesign(s);close(banked.segments[2].exitSpeed,plain.segments[2].exitSpeed);close(banked.segments[2].lateral,plain.segments[2].lateral*.55);
});
test('second summit is not solvable by forbidden unlimited drive',()=>{
 const s=build(createGame(3),[[0,'lift'],[11,'brake']]);certify(s);assert.equal(s.report.firstFailure,3);assert.equal(s.report.diagnosis[0].code,'stall');assert.equal(command(s,{type:'module',segment:3,module:'drive'}).ok,false);assert.ok(command(s,{type:'module',segment:3,module:'lift'}).ok);assert.ok(certify(s).approved);
});
test('safe but dull passenger service exhausts its fixed schedule and loses',()=>{
 const s=build(createGame(0),[[0,'lift'],[1,'trim'],[11,'brake']]);const r=certify(s);assert.equal(r.safe,true);assert.equal(r.approved,false);assert.ok(r.diagnosis.some(d=>d.code==='dull'));assert.equal(r.rideReputation,27);assert.equal(r.riders,8);assert.equal(r.rideRevenue,128);
 assert.ok(command(s,'open').ok);settle(s);assert.equal(s.state,'lost');assert.equal(s.runs,3);assert.equal(s.revenue,384);assert.equal(s.reputation,81);assert.equal(s.visitors,24);assert.equal(s.aboard,0);assert.equal(command(s,'test').ok,false);
 const before=snapshot(s);step(s,1e9);assert.deepEqual(snapshot(s),before);roundtrip(s);
});
test('comfort is an independent binding requirement despite safe excitement',()=>{
 const s=createGame(6);build(s,[[0,'lift'],[2,'bank'],[3,'drive'],[5,'bank'],[9,'bank'],[11,'brake']]);const r=certify(s);assert.ok(r.safe&&r.thrill>=s.level.minThrill);assert.ok(r.comfort<s.level.minComfort);assert.equal(r.approved,false);assert.ok(r.diagnosis.some(d=>d.code==='comfort'));
});
for(let index=0;index<8;index++)test(`level ${index+1}: public commands build→test→passengers→won with live invariants`,()=>{
 let testTicks=0,operatingTicks=0;const {state:s,trace,results}=runPilot(index,{onStep:g=>{invariant(g);if(g.state==='testing')testTicks++;if(g.state==='operating')operatingTicks++;}});
 assert.ok(results.every(r=>r.ok));assert.equal(s.state,'won');assert.equal(s.runs,2);assert.equal(s.reputation,180);assert.ok(s.revenue>=s.level.targetRevenue);assert.ok(s.report.approved);assert.ok(s.cost<=s.level.budget);assert.ok(testTicks>0&&operatingTicks>0);
 assert.equal(trace.report.revenue,0);assert.equal(trace.report.reputation,0);assert.equal(trace.report.visitors,0);assert.equal(trace.report.runs,0);assert.equal(trace.report.aboard,0);
 assert.equal(trace.operating.aboard,s.level.seats);roundtrip(s);
 const before=snapshot(s);for(let j=0;j<20;j++)step(s,.25);assert.deepEqual(snapshot(s),before);
});
test('track edit invalidates certificate and blocks opening until retested',()=>{
 const s=createGame(0);prepareCoaster(s);certify(s);assert.ok(s.report.approved);assert.ok(command(s,{type:'module',segment:2,module:'bank'}).ok);assert.equal(s.report,null);assert.equal(command(s,'open').ok,false);assert.ok(certify(s).approved);
});
test('test, open, edit and abort guards never award duplicate or partial fares',()=>{
 const s=createGame(0);prepareCoaster(s);command(s,'test');step(s,.2);assert.equal(command(s,'open').ok,false);assert.equal(command(s,'test').ok,false);assert.equal(command(s,{type:'module',segment:2,module:'bank'}).ok,false);
 command(s,'design');assert.equal(s.runs,0);assert.equal(s.revenue,0);assert.equal(s.aboard,0);certify(s);command(s,'open');step(s,.25);pause(s);assert.equal(s.aboard,10);command(s,'design');assert.equal(s.aboard,0);assert.equal(s.revenue,0);assert.equal(s.runs,0);
 command(s,'open');for(let n=0;n<20000&&s.runs===0;n++)step(s,FIXED_DT);assert.equal(s.runs,1);assert.equal(s.revenue,160);command(s,'design');assert.equal(s.runs,1);assert.equal(s.revenue,160);command(s,'open');settle(s);assert.equal(s.state,'won');assert.equal(s.runs,2);assert.equal(s.revenue,320);
});
test('pause is exact, retains passenger state, resumes deterministically',()=>{
 const s=createGame(7);prepareCoaster(s);certify(s);command(s,'open');step(s,.012);pause(s);const paused=snapshot(s);for(let n=0;n<500;n++)step(s,100);assert.deepEqual(snapshot(s),paused);assert.equal(s.priorState,'operating');assert.equal(s.aboard,15);const copy=roundtrip(s);resume(s);resume(copy);for(let n=0;n<500;n++){step(s,.025);step(copy,.025);}assert.deepEqual(snapshot(s),snapshot(copy));
});
test('fixed-step composition and oversized frame cap do not grant offline progress',()=>{
 const a=createGame(0),b=createGame(0);prepareCoaster(a);prepareCoaster(b);command(a,'test');command(b,'test');
 for(let i=0;i<60;i++)step(a,FIXED_DT);for(let i=0;i<10;i++)step(b,.1);assert.equal(a.tick,b.tick);close(a.train.t,b.train.t);assert.equal(a.train.segment,b.train.segment);
 const before=a.tick;step(a,60*60*24);assert.equal(a.tick-before,15);for(const dt of [0,-1,NaN,Infinity]){const saved=snapshot(a);step(a,dt);assert.deepEqual(snapshot(a),saved);}
});
test('snapshot is recursively immutable and detached from runtime',()=>{
 const s=createGame(0),copy=snapshot(s);assert.ok(Object.isFrozen(copy)&&Object.isFrozen(copy.train)&&Object.isFrozen(copy.modules));assert.throws(()=>{copy.modules[0]='lift';},TypeError);assert.throws(()=>{copy.train.x=0;},TypeError);command(s,{type:'module',segment:0,module:'lift'});assert.equal(copy.modules[0],'rail');
});
test('checkpoint roundtrips design, fractional test, test report, operation and pause',()=>{
 const s=createGame(2);roundtrip(s);prepareCoaster(s);roundtrip(s);command(s,'test');step(s,.237);roundtrip(s);pause(s);roundtrip(s);resume(s);roundtrip(s);settle(s);roundtrip(s);command(s,'open');step(s,.212);const copy=roundtrip(s);settle(s);settle(copy);assert.deepEqual(snapshot(s),snapshot(copy));
});
test('checkpoint strict replay rejects impossible states, huge inputs and unsupported versions',()=>{
 const s=createGame(0);prepareCoaster(s);command(s,'test');step(s,.03);const cp=checkpoint(s),bad=fn=>{const x=structuredClone(cp);fn(x);assert.equal(restore(x),null);};
 bad(x=>x.version=2);bad(x=>x.levelIndex=8);bad(x=>x.levelIndex=1.5);bad(x=>x.accumulator=-1);bad(x=>x.accumulator=1);bad(x=>x.state='won');bad(x=>x.history=[{kind:'ticks',n:250001}]);bad(x=>x.history=[{kind:'ticks',n:1}]);bad(x=>x.history=[{kind:'resume'}]);bad(x=>x.history=[{kind:'pause'}]);bad(x=>x.history=[{kind:'command',command:{type:'open'}}]);bad(x=>x.history=[{kind:'command',command:{type:'module',segment:0,module:'hacked'}}]);bad(x=>x.history.push({kind:'ticks',n:.5}));bad(x=>x.history.push({kind:'ticks',n:1,extra:true}));bad(x=>x.history=Array.from({length:1025},()=>({kind:'command',command:{type:'select',segment:0}})));bad(x=>x.padding='x'.repeat(160001));
 assert.equal(restore(null),null);assert.equal(restore(''),null);assert.equal(restore([]),null);const circular={};circular.self=circular;assert.equal(restore(circular),null);
});
test('retry is a clean deterministic reconstruction with no inherited certificate or receipts',()=>{
 const s=runPilot(7).state;retry(s);assert.deepEqual(snapshot(s),snapshot(createGame(7)));assert.deepEqual(checkpoint(s).history,[]);assert.equal(start(s),s);
});
console.log(`\n${checks} coaster engine tests passed.`);
