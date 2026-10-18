import assert from 'node:assert/strict';
import {createGame,start,command,previewTurn,snapshot,BUILDINGS,RESEARCH} from '../games/civic/engine.mjs';
const action=(s,c)=>assert.equal(command(s,c).ok,true,JSON.stringify(c));
const a=start(createGame(4));action(a,{type:'assign',tileId:15,worker:true});action(a,{type:'assign',tileId:23,worker:true});action(a,{type:'build',tileId:14,building:'lumber'});action(a,{type:'endTurn'});action(a,{type:'assign',tileId:14,worker:true});
assert.equal(a.tiles.filter(t=>t.worker).length,3);assert.equal(previewTurn(a).production.insight,3);assert.equal(previewTurn(a).production.wood,3);
const before=snapshot(a);action(a,{type:'assign',tileId:23,worker:false});assert.equal(a.actions,before.actions-1);assert.equal(previewTurn(a).production.insight,0);assert.equal(a.population,3);assert.equal(previewTurn(a).consumption.food,3);
assert.deepEqual(BUILDINGS.village.cost,{food:8,wood:6,stone:4});assert.deepEqual(RESEARCH.navigation.cost,{insight:6});
console.log('PASS tradeoff: three productive residents exhaust population; withdrawing scholar costs one action and loses 3 insight per turn without lowering food upkeep. New village costs 8 food,6 wood,4 stone; navigation costs6 insight.');
