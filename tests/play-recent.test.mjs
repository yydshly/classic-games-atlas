import assert from 'node:assert/strict';
import {PLAY_ENTRIES,resolvePlayEntry} from '../play-entries.mjs';
import {RECENT_PLAY_KEY,readRecentPlays,rememberRecentPlay,clearRecentPlays} from '../play-recent.mjs';
import {rememberPlayReturn,consumePlayReturn,PLAY_RETURN_KEY} from '../play-return.mjs';
const BASE='https://example.test/atlas/',now=1800000000000,results=[];
function test(name,fn){fn();results.push(name);}
function store(seed={}){const data=new Map(Object.entries(seed)),calls=[];return{data,calls,getItem(k){calls.push(['read',k]);return data.get(k)??null;},setItem(k,v){calls.push(['write',k]);data.set(k,v);},removeItem(k){calls.push(['remove',k]);data.delete(k);}};}
test('Registry has45 games, exact entry paths and trustworthy version/chapters; no report or frozen mirror guesses',()=>{
 assert.equal(new Set(PLAY_ENTRIES.map(e=>e.slug)).size,45);assert.equal(new Set(PLAY_ENTRIES.map(e=>e.path)).size,PLAY_ENTRIES.length);
 for(const e of PLAY_ENTRIES){assert.equal(resolvePlayEntry(new URL(e.path,BASE).href,BASE)?.path,e.path);assert.equal(resolvePlayEntry(e.path+'index.html',BASE)?.path,e.path);assert(e.title&&e.version&&e.chapter);assert(!e.path.startsWith('versions/v1/'));}
 assert.equal(resolvePlayEntry('versions/v3/games/post/cup/',BASE).chapter,'双站杯赛');assert.equal(resolvePlayEntry('versions/v4/games/post/cup/',BASE).version,'v4');
});
test('External, credential, script, escaped and unknown URLs cannot read/write recent storage',()=>{
 const s=store();for(const u of ['https://evil.test/atlas/games/post/','//evil.test/atlas/games/post/','https://user:pass@example.test/atlas/games/post/','javascript:alert(1)','data:text/html,a','../games/post/','games/not-a-game/','docs/featured-audio-qa/','#compare=post','games%2fpost/','games\\post/']){assert(!rememberRecentPlay(s,u,BASE,now).ok,u);}assert.equal(s.calls.length,0);
});
test('No records until an actual entry recorder writes; missing history is empty',()=>{
 const s=store();assert.deepEqual(readRecentPlays(s,BASE,now).items,[]);assert.equal(s.calls.filter(c=>c[0]==='write').length,0);
});
test('Maximum five distinct games, newest first, repeated version replaces same game and exact path survives refresh',()=>{
 const s=store(),slugs=['fortress','brook','post','ladder','windowlife','glimmer'];
 slugs.forEach((slug,i)=>{assert(rememberRecentPlay(s,PLAY_ENTRIES.find(e=>e.slug===slug).path,BASE,now+i*100).ok);});
 let rows=readRecentPlays(s,BASE,now+1000).items;assert.equal(rows.length,5);assert.deepEqual(rows.map(e=>e.slug),slugs.slice(1).reverse());
 assert(rememberRecentPlay(s,'versions/v3/games/post/cup/',BASE,now+1100).ok);assert(rememberRecentPlay(s,'versions/v4/games/post/cup/?v=fixed#race',BASE,now+1200).ok);
 rows=readRecentPlays(s,BASE,now+1300).items;assert.equal(rows.length,5);assert.equal(rows[0].path,'versions/v4/games/post/cup/');assert.equal(rows[0].at,now+1200);assert.equal(rows.filter(e=>e.slug==='post').length,1);
 assert.deepEqual(JSON.parse(s.data.get(RECENT_PLAY_KEY)).items[0],{path:'versions/v4/games/post/cup/',at:now+1200});
});
test('Stored metadata cannot forge names, URLs or progress; invalid/future records are filtered',()=>{
 const raw={schema:1,items:[{path:'https://evil.test/',at:now},{path:'games/post/',at:now+999999},{path:'games/post/',at:now,title:'FORGED',continue:true},{path:'games/post/',at:now-10},{path:'games/brook/',at:NaN}]};
 const s=store({[RECENT_PLAY_KEY]:JSON.stringify(raw)}),rows=readRecentPlays(s,BASE,now).items;assert.equal(rows.length,1);assert.equal(rows[0].title,'弯道邮差');assert.equal(rows[0].continue,undefined);
});
test('Only the recent key is cleared; game saves, sound choices and return receipts are preserved',()=>{
 const seed={'game.save':'exact old bytes','classic-atlas.audio.preferences.v1':'sound', [PLAY_RETURN_KEY]:'receipt',[RECENT_PLAY_KEY]:'visits'},s=store(seed);assert(clearRecentPlays(s));for(const k of Object.keys(seed).filter(k=>k!==RECENT_PLAY_KEY))assert.equal(s.data.get(k),seed[k]);assert.deepEqual(s.calls,[['remove',RECENT_PLAY_KEY]]);
});
test('Read/write/remove failures are non-blocking, failed writes preserve previous bytes and later recovery works',()=>{
 const s=store();rememberRecentPlay(s,'games/post/',BASE,now);const bytes=s.data.get(RECENT_PLAY_KEY),write=s.setItem;s.setItem=()=>{throw Error('quota');};assert.equal(rememberRecentPlay(s,'games/brook/',BASE,now+100).reason,'write');assert.equal(s.data.get(RECENT_PLAY_KEY),bytes);s.setItem=write;assert(rememberRecentPlay(s,'games/brook/',BASE,now+100).ok);
 assert.equal(readRecentPlays(undefined,BASE,now).reason,'read');assert.equal(rememberRecentPlay(undefined,'games/post/',BASE,now).reason,'read');assert.equal(clearRecentPlays({removeItem(){throw Error('denied');}}),false);
});
test('Corrupt recent bytes never affect other keys; next actual visit can replace this isolated ledger',()=>{
 const s=store({[RECENT_PLAY_KEY]:'broken','game.save':'preserved'});assert.equal(readRecentPlays(s,BASE,now).reason,'corrupt');assert(rememberRecentPlay(s,'games/post/',BASE,now).ok);assert.equal(s.data.get('game.save'),'preserved');
});
test('Recent and old return receipts preserve query/filter/limit plus optional visible anchor position',()=>{
 for(const entry of ['recent','featured',undefined]){const s=store(),href=new URL('versions/v4/games/post/cup/',BASE).href,state={query:'post',version:'all',limit:45,y:540,slug:'post',...(entry?{entry,viewportTop:230}:{})};assert(rememberPlayReturn(s,BASE,href,state,now));const receipt=consumePlayReturn(s,BASE,href,now+100);assert.equal(receipt.query,'post');assert.equal(receipt.limit,45);assert.equal(receipt.viewportTop,entry?230:undefined);assert.equal(s.data.has(PLAY_RETURN_KEY),false);}
});
test('Stopped or retained entry visits stay honestly labelled and never imply a valid save',()=>{
 const s=store();for(const slug of ['court','repair','civic','paper']){const e=PLAY_ENTRIES.find(e=>e.slug===slug);assert(e.state);rememberRecentPlay(s,e.path,BASE,now);}for(const row of readRecentPlays(s,BASE,now).items)assert(!('progress'in row)&&!('continue'in row));
});
console.log(JSON.stringify({passed:true,groups:results.length,registryEntries:PLAY_ENTRIES.length,tests:results,method:'Pure registry/storage/receipt fixtures; no gameplay or real-device claim'},null,2));
