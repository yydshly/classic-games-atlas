import assert from 'node:assert/strict';
import {rememberPlayReturn,consumePlayReturn} from '../play-return.mjs';
const base='https://example.test/atlas/',state={query:'邮差',version:'all',limit:12,y:240,slug:'post'},now=1000;
const store=()=>({v:new Map(),setItem(k,v){this.v.set(k,v)},getItem(k){return this.v.get(k)??null},removeItem(k){this.v.delete(k)}});
for(const path of['games/post/','versions/v2/games/post/','versions/v3/games/post/','versions/v3/games/post/cup/','versions/v3/games/post/cup/index.html']){const s=store(),href=base+path;assert(rememberPlayReturn(s,base,href,state,now));const r=consumePlayReturn(s,base,href,now+1);assert.equal(r.slug,'post');assert.equal(r.href,href);assert.equal(r.query,'邮差');assert.equal(consumePlayReturn(s,base,href,now+2),null);}
for(const path of['versions/v3/games/other/cup/','versions/v3/games/post/unknown/','https://elsewhere.test/atlas/versions/v3/games/post/cup/'])assert.equal(rememberPlayReturn(store(),base,path,state,now),false);
const wrong=store();assert.equal(rememberPlayReturn(wrong,base,'versions/v3/games/post/cup/',{...state,slug:'other'},now),false);
console.log(JSON.stringify({passed:true,scope:'Five old/new Post paths retain one-use directory receipt; unrelated nested/foreign paths and wrong slug rejected. No game save changes.'}));
