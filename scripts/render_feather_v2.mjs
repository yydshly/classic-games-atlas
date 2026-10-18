import {createRequire} from 'node:module';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {createGame,input,invariants} from '../versions/v2/games/feather/model.mjs';
import {render,ANCHORS} from '../versions/v2/games/feather/renderer.mjs';
const require=createRequire(import.meta.url),{createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
GlobalFonts.registerFromPath('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc','sans-serif');
const dir=new URL('../versions/v2/games/feather/assets/',import.meta.url),out=new URL('../docs/feather-v2-qa/',import.meta.url);mkdirSync(out,{recursive:true});
const assets={background:await loadImage(new URL('echo-shoal.webp',dir).pathname)};
for(const[id,file]of Object.entries({a:'lanling',b:'taideng',c:'chengxi',bud:'bud',fin:'fin'}))assets[id]=await loadImage(new URL(file+'.webp',dir).pathname);
const cp=JSON.parse(readFileSync(new URL('ordinary-campaign.json',out))),g=createGame(cp.seed),shots={0:'camp-before',1:'explore-first',6:'encounter-before',7:'capture-failed',19:'capture-success-pending',20:'camp-recruited',22:'team-changed',50:'growth-bud',75:'growth-fin',86:'final-camp'};
const results=[];
function shot(tag){for(const[width,height,suffix]of [[1200,675,'wide'],[400,225,'phone-scene']]){const c=createCanvas(width,height),ctx=c.getContext('2d');ctx.scale(width/1200,height/675);const before=JSON.stringify(g);render(ctx,g,assets,{showPaths:true,viewportWidth:width});if(before!==JSON.stringify(g))throw Error('Renderer mutated model');writeFileSync(new URL(`renderer-${tag}-${suffix}.png`,out),c.toBuffer('image/png'));}writeFileSync(new URL(`${tag}-snapshot.json`,out),JSON.stringify(g,null,2));results.push({tag,revision:g.revision,phase:g.phase,invariants:invariants(g)});}
let finShot=false;shot(shots[0]);for(const c of cp.commands){if(!input(g,c))throw Error('Bad replay');if(shots[g.revision])shot(shots[g.revision]);if(!finShot&&g.wild?.id==='fin'){shot('encounter-fin');finShot=true;}}
const map=createGame();input(map,{kind:'depart',revision:0});const c=createCanvas(1200,675),ctx=c.getContext('2d');render(ctx,map,assets,{showPaths:true});ctx.font='18px sans-serif';for(const[key,[x,y]]of Object.entries(ANCHORS)){ctx.fillStyle='#fff';ctx.strokeStyle='#153a2b';ctx.lineWidth=4;ctx.strokeText(key,x*1200+8,y*675-5);ctx.fillText(key,x*1200+8,y*675-5);}writeFileSync(new URL('path-anchor-review.png',out),c.toBuffer('image/png'));
writeFileSync(new URL('renderer-report.json',out),JSON.stringify({kind:'actual-runtime-renderer-offscreen-not-browser',shots:results,dimensions:[[1200,675],[400,225]],note:'Calls the shipped renderer on ordinary-input replay states. Phone images cover only the canvas, not DOM layout, input or browser rendering.'},null,2));console.log(JSON.stringify(results.map(({tag,revision,phase})=>({tag,revision,phase})),null,2));
