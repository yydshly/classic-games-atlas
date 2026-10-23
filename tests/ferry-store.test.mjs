import assert from 'node:assert/strict';
import {KEY,validRecord,checkpointStore} from '../experiments/kinetic/storage.mjs';
const start={schema:2,dockStage:'near',crateStableOnPlate:false,completed:false,falls:0,jumps:0};
const arranged={...start,crateStableOnPlate:true};
assert.ok(validRecord(start));assert.ok(validRecord(arranged));
assert.equal(validRecord({...start,completed:true}),false);
assert.equal(validRecord({...start,schema:1}),false);
assert.equal(validRecord({...start,falls:-1}),false);
const bytes=new Map([['classic-atlas.kinetic.prototype.v1','old linear prototype'],['some-other-game','unchanged']]);let fail=false;
const io={getItem:k=>bytes.get(k)??null,setItem:(k,v)=>{if(fail)throw new Error('quota');bytes.set(k,v);}};
const store=checkpointStore(io);assert.equal(store.record,null);assert.ok(store.write(start));const old=bytes.get(KEY);
fail=true;assert.equal(store.write(arranged),false);assert.equal(bytes.get(KEY),old);assert.equal(store.status().failed,true);
fail=false;assert.ok(store.write(arranged));assert.equal(store.status().failed,false);assert.deepEqual(checkpointStore(io).record,arranged);
assert.equal(bytes.get('classic-atlas.kinetic.prototype.v1'),'old linear prototype');assert.equal(bytes.get('some-other-game'),'unchanged');
for(const raw of ['{broken',JSON.stringify({...start,schema:1}),JSON.stringify({...start,completed:true})]){bytes.set(KEY,raw);const protectedStore=checkpointStore(io);assert.ok(protectedStore.status().blocked);assert.equal(protectedStore.write(start),false);assert.equal(bytes.get(KEY),raw);}
const deniedRead=checkpointStore({getItem(){throw Error('denied');},setItem(){throw Error('must not write');}});assert.ok(deniedRead.status().blocked);assert.equal(deniedRead.write(start),false);
console.log(JSON.stringify({passed:true,scope:'isolated ferry schema, old prototype/game keys protected, corrupt bytes retained, failed write retains prior bytes, recovery clears error'}));
