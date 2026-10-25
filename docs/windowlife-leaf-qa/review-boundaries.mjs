// Explicit local evidence generation. No browser, network or report side effects
// unless an output directory is supplied to this command.
import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {fixture} from '../../tests/helpers/windowlife-leaf-dom.mjs';
import {renderPaperSVG} from './export-paper.mjs';
import {renderRoomSVG} from './export-room.mjs';
const output=process.argv[2];if(!output)throw Error('usage: node review-boundaries.mjs OUTPUT_DIR [SOURCE_ROOT]');
const root=path.resolve(process.argv[3]||fileURLToPath(new URL('../../',import.meta.url)));
const source=path.join(root,'experiments/windowlife-request-preview/source');
const {mount}=await import(pathToFileURL(path.join(source,'controller.mjs')).href);
const {PaperRenderer,Renderer}=await import(pathToFileURL(path.join(source,'view.mjs')).href);
const make=()=>fixture(new Map(),mount);mkdirSync(output,{recursive:true});
const f=make();f.choose('now');f.pointer('pointerdown',80,180);f.pointer('pointermove',90,175);const preview=f.api.paper().draft;
writeFileSync(path.join(output,'short-draft.svg'),renderPaperSVG(f.api.snapshot(),'sketch',preview,PaperRenderer));
f.pointer('pointerup',90,175);const committed=f.api.snapshot().art.sketch.marks[0];
writeFileSync(path.join(output,'short-committed.svg'),renderPaperSVG(f.api.snapshot(),'sketch',null,PaperRenderer));
const right=make();right.choose('alone');let prevented=0;
right.pointer('pointerdown',80,180,{button:2,buttons:2,preventDefault(){prevented++;}});right.pointer('pointerup',100,100,{button:2});
const paused=make();paused.choose('now');paused.key('Enter');
writeFileSync(path.join(output,'drafting-room.svg'),renderRoomSVG(paused.api.snapshot(),{drawing:true},Renderer));
paused.click('toggle');const firstPaused=paused.api.snapshot(),firstOptions={drawing:paused.roomPictures.at(-1).drawing};paused.step();
writeFileSync(path.join(output,'paused-first-room.svg'),renderRoomSVG(firstPaused,firstOptions,Renderer));
const pausedFrames=paused.roomPictures.filter(p=>p.state==='paused'&&p.phase==='co-creating');
const hash=file=>createHash('sha256').update(readFileSync(path.join(source,file))).digest('hex');
const report={scope:'local synthetic input and real Canvas2D instruction recording; not browser or human QA',sourceRoot:root,sourceSHA256:Object.fromEntries(['controller.mjs','paper-controller.mjs','marks.mjs','view.mjs'].map(f=>[f,hash(f)])),short:{input:[['down',80,180],['move',90,175],['up',90,175]],preview,committed,exactGeometry:JSON.stringify(preview)===JSON.stringify(committed)},rightButton:{marks:right.api.snapshot().art.note.marks,prevented},pausedRoomFrames:pausedFrames,pausedPoseStable:pausedFrames.every(p=>!p.drawing)};
writeFileSync(path.join(output,'boundary-evidence.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
