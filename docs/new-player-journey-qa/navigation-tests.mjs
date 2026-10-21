import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {rememberPlayReturn,consumePlayReturn,PLAY_RETURN_KEY} from '../../play-return.mjs';
// Run from repository root; this private harness is copied with a root-relative import for QA.
const base='https://yydshly.github.io/classic-games-atlas/index.html';
const href='https://yydshly.github.io/classic-games-atlas/versions/v2/games/fortress/';
const state={query:'堡垒',version:'v2',limit:40,y:321,slug:'fortress'};
const memory=()=>{const map=new Map([['existing-game-save','unchanged']]);return {map,getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)}};
const cases=[];
function test(name,fn){fn();cases.push({name,status:'passed',method:'isolated module/controller fixture; not browser play'});}
test('same-tab one-use receipt preserves exact state without touching game saves',()=>{const s=memory();assert(rememberPlayReturn(s,base,href,state,100));assert.deepEqual(consumePlayReturn(s,base,href,101),{...state,href,schema:1,at:100});assert.equal(s.getItem('existing-game-save'),'unchanged');assert.equal(consumePlayReturn(s,base,href,102),null)});
test('non-game/external/other-project destinations never write',()=>{for(const target of['https://example.org/games/fortress/','https://yydshly.github.io/other/games/fortress/','./docs/flow-coverage/']){const s=memory();assert.equal(rememberPlayReturn(s,base,target,state,100),false);assert.equal(s.map.size,1)}});
test('unrelated entry and other game do not consume receipt',()=>{const s=memory();rememberPlayReturn(s,base,href,state,100);for(const ref of['','https://example.org/','https://yydshly.github.io/classic-games-atlas/games/petal/'])assert.equal(consumePlayReturn(s,base,ref,101),null);assert(s.getItem(PLAY_RETURN_KEY))});
test('old-version detour of same game can return to directory context',()=>{const s=memory();rememberPlayReturn(s,base,href,state,100);assert(consumePlayReturn(s,base,'https://yydshly.github.io/classic-games-atlas/games/fortress/',101))});
test('malformed, expired, invalid-filter and extreme-position receipts ignored',()=>{for(const raw of['broken',JSON.stringify({...state,href,schema:99,at:100}),JSON.stringify({...state,href,schema:1,at:100,version:'evil'}),JSON.stringify({...state,href,schema:1,at:100,y:-1}),JSON.stringify({...state,href,schema:1,at:100})]){const s=memory();s.setItem(PLAY_RETURN_KEY,raw);assert.equal(consumePlayReturn(s,base,href,raw===JSON.stringify({...state,href,schema:1,at:100})?86400101:101),null);assert.equal(s.getItem(PLAY_RETURN_KEY),raw)}});
test('denied storage and quota failures do not throw or erase valid game data',()=>{const denied={getItem(){throw Error('SecurityError')},setItem(){throw Error('QuotaExceededError')},removeItem(){throw Error('SecurityError')}};assert.equal(rememberPlayReturn(denied,base,href,state,100),false);assert.equal(consumePlayReturn(denied,base,href,101),null)});
const source=fs.readFileSync('app.js','utf8');const intro=source.slice(source.indexOf('function comparisonIntro('),source.indexOf('function versionLinks('));
const definitions=source.slice(source.indexOf('const hasCandidate ='),source.indexOf('function journeyLink('));
const items=JSON.parse(fs.readFileSync('data/comparisons.json','utf8')).items;
test('all current v1/v2/v3 and stopped comparison introductions match recommendation class',()=>{for(const item of items){const scope={item};const text=vm.runInNewContext(definitions+'\n'+intro+'\ncomparisonIntro(item)',scope);if(item.journey_version?.status==='candidate_unaccepted')assert(text.includes('v3'));else if(['candidate_unaccepted','paused_unaccepted'].includes(item.next_version?.status)&&item.next_version.url){assert(text.includes('首页入口为 v2'));assert(!text.includes('当前为 v1'))}else assert(text.includes('首页入口为 v1'));}assert.equal(items.length,40)});
fs.mkdirSync('.local/new-player-journey',{recursive:true});
const report={status:'passed',cases,normalUiNotInjected:true};fs.writeFileSync('.local/new-player-journey/navigation-tests.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({status:'passed',cases:cases.length,currentComparisonItems:items.length}));
