import assert from 'node:assert/strict';
import {rememberPlayReturn,consumePlayReturn,PLAY_RETURN_KEY} from '../../play-return.mjs';
const base='https://example.test/atlas/',now=1900000000000;
const store=()=>{const d=new Map();return{getItem:k=>d.get(k)??null,setItem:(k,v)=>d.set(k,v),removeItem:k=>d.delete(k)}};
let tested=0;
for(const [href,slug]of [['versions/v4/games/fortress/','fortress'],['versions/v4/games/fortress/index.html','fortress'],['versions/v3/games/fortress/','fortress'],['versions/v2/games/fortress/','fortress'],['versions/v3/games/post/cup/','post'],['versions/v2/preview/ladder/','ladder'],['preview/ladder/','ladder']]){
 const s=store(),state={query:'堡垒',version:'all',limit:45,y:280,slug,entry:'featured'};
 assert(rememberPlayReturn(s,base,href,state,now));const r=consumePlayReturn(s,base,base+href,now+100);assert.equal(r.href,href);assert.equal(r.query,'堡垒');assert.equal(r.entry,'featured');assert.equal(s.getItem(PLAY_RETURN_KEY),null);tested++;
}
for(const href of ['versions/v4/games/other/','https://other.test/versions/v4/games/fortress/','../versions/v4/games/fortress/'])assert.equal(rememberPlayReturn(store(),base,href,{query:'',version:'all',limit:45,y:0,slug:'fortress'},now),false);
console.log(JSON.stringify({passed:true,recognizedRoutes:tested,rejectedOutsideScope:3,method:'Return receipt unit regression; ordinary keyboard focus separately verified in browser.'}));
