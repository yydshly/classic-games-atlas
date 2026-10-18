import assert from 'node:assert/strict';
import {Renderer} from '../versions/v2/games/post/renderer.mjs';
import {createGame,start,update,pause} from '../versions/v2/games/post/engine.mjs';
let images=0,backgrounds=0,draws=0;const ctx=new Proxy({},{get:(o,k)=>o[k]??(()=>{if(k==='drawImage')draws++}),set:(o,k,v)=>(o[k]=v,true)});
globalThis.Image=class{constructor(){images++;this.complete=true;this.naturalWidth=96;}};
globalThis.document={createElement(type){assert.equal(type,'canvas');backgrounds++;return {getContext:()=>ctx}}};
const canvas={getContext:()=>ctx},r=new Renderer(canvas),g=createGame();assert.equal(images,3);r.draw(g);assert.equal(backgrounds,1);start(g);for(let i=0;i<100;i++){update(g,.05,{gas:1});r.draw(g);}pause(g);r.draw(g);r.draw(createGame(2));assert.equal(images,3);assert.equal(backgrounds,1);assert.equal(canvas.width,1800);assert.equal(canvas.height,1280);assert(draws>300);console.log('PASS renderer command-only test: ready/countdown/playing/paused/stage-switch; exactly 3 cached car images and 1 cached background canvas across 103 draws. Not a pixel/browser validation.');
