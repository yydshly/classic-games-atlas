import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {mountPaper} from '../experiments/windowlife-request-preview/source/paper-controller.mjs';
import * as E from '../experiments/windowlife-request-preview/source/scene.mjs';
const {JSDOM}=createRequire(new URL('../tools/preview-bundles/package.json',import.meta.url))('jsdom');
const html=readFileSync(new URL('../experiments/windowlife-request-preview/index.html',import.meta.url),'utf8');

for(const id of ['paper-handle-start','paper-handle-end'])test(`Escape from ${id} bubbles through actual markup and returns focus to the paper`,t=>{
  // jsdom implements DOM events/focus; it has no browser layout or native Tab.
  // Do not execute the page bundle, load resources, or launch any browser.
  const dom=new JSDOM(html),{document,KeyboardEvent,HTMLElement}=dom.window;t.after(()=>dom.window.close());
  const g=E.createScene();E.command(g,'start');E.command(g,'alone');
  document.getElementById('app').hidden=false;
  let paper;paper=mountPaper({document,getScene:()=>g,act:(type,payload)=>{const r=E.command(g,type,payload);paper.sync(g);return r;},render:()=>paper.sync(g)});paper.sync(g);
  const surface=document.getElementById('paper-input'),handle=document.getElementById(id);
  assert(surface instanceof HTMLElement);assert(handle instanceof HTMLElement);assert(surface.contains(handle));
  surface.focus();surface.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));
  assert.equal(handle.hidden,false);handle.focus();assert.equal(document.activeElement,handle);
  const escape=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true});handle.dispatchEvent(escape);
  assert.equal(escape.defaultPrevented,true);assert.equal(handle.hidden,true);assert.equal(paper.diagnostics().draft,null);
  assert.equal(document.activeElement,surface);assert.equal(surface.tabIndex,0);assert.equal(surface.getAttribute('aria-disabled'),'false');
  surface.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}));assert(paper.diagnostics().draft);
  assert.equal(g.art.note.marks.length,0);
});
