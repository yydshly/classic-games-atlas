import {activePaper} from './scene.mjs';
import {normalizeGesture} from './marks.mjs';

export function mountPaper({document,getScene,act,render,PaperRenderer}) {
  const $=id=>document.getElementById(id),surface=$('paper-input'),workspace=$('paper-workspace');
  const renderer=PaperRenderer?new PaperRenderer($('paper')):null;
  let draft=null,pointer=null,anchor=null,handle='end',lastTarget=null,lastEditable=null;
  const live=()=>activePaper(getScene());
  const cancelDraft=()=>{draft=null;pointer=null;anchor=null;};
  const point=e=>{const r=surface.getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*1000,y:(e.clientY-r.top)/r.height*1000};};
  const inside=e=>{const r=surface.getBoundingClientRect();return e.clientX>=r.left&&e.clientX<=r.right&&e.clientY>=r.top&&e.clientY<=r.bottom;};
  const updateEnd=(p,which='end')=>{
    const bound=n=>Math.max(80,Math.min(920,Math.round(n)));
    if(which==='end'&&anchor){draft.x1=bound(anchor.x);draft.y1=bound(anchor.y);}
    if(which==='start'){draft.x1=bound(p.x);draft.y1=bound(p.y);}else{draft.x2=bound(p.x);draft.y2=bound(p.y);}
    draft=normalizeGesture({x:draft.x1,y:draft.y1},{x:draft.x2,y:draft.y2});
  };
  const commit=()=>{if(!draft||!live())return;const mark=normalizeGesture({x:draft.x1,y:draft.y1},{x:draft.x2,y:draft.y2});cancelDraft();act('mark',mark);surface.focus({preventScroll:true});};
  surface.addEventListener('pointerdown',e=>{
    if(!live()||pointer!==null||e.isPrimary===false||(e.button!==undefined&&e.button!==0))return;
    const id=e.target?.closest?.('.paper-handle')?.id||e.target?.id;
    e.preventDefault();pointer=e.pointerId;surface.setPointerCapture?.(pointer);
    if(draft&&['paper-handle-start','paper-handle-end'].includes(id)){handle=id.endsWith('start')?'start':'end';anchor=null;}
    else{anchor=point(e);draft=normalizeGesture(anchor,anchor);handle='end';}
    render();
  });
  surface.addEventListener('pointermove',e=>{if(pointer!==e.pointerId||!draft||!live())return;e.preventDefault();updateEnd(point(e),handle);render();});
  surface.addEventListener('pointerup',e=>{if(pointer!==e.pointerId)return;e.preventDefault();if(inside(e)){if(draft)updateEnd(point(e),handle);commit();}else{cancelDraft();render();}});
  for(const type of ['pointercancel','lostpointercapture'])surface.addEventListener(type,e=>{if(pointer===e.pointerId){cancelDraft();render();}});
  function keyboard(e) {
    if(!live()||e.ctrlKey||e.metaKey||e.altKey)return;
    if(['Enter',' '].includes(e.key)) {
      e.preventDefault();if(e.repeat)return;
      if(draft)commit();else{draft={x1:350,y1:700,x2:510,y2:430};handle='end';render();}
    } else if(e.key==='Escape'){e.preventDefault();cancelDraft();render();surface.focus({preventScroll:true});}
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)) {
      e.preventDefault();if(!draft)draft={x1:350,y1:700,x2:510,y2:430};
      const selected=e.target?.id==='paper-handle-start'?'start':e.target?.id==='paper-handle-end'?'end':handle;
      const n=e.shiftKey?50:10,p={x:selected==='start'?draft.x1:draft.x2,y:selected==='start'?draft.y1:draft.y2};
      p.x+=(e.key==='ArrowRight'?n:e.key==='ArrowLeft'?-n:0);p.y+=(e.key==='ArrowDown'?n:e.key==='ArrowUp'?-n:0);
      updateEnd(p,selected);render();
    }
  }
  surface.addEventListener('keydown',keyboard);
  // Handle keydown bubbles to the surface in the real DOM; no duplicate handler.
  $('paper-undo').addEventListener('click',()=>{cancelDraft();act('undo-mark');});
  $('paper-finish').addEventListener('click',()=>{cancelDraft();act('finish-paper');});
  function sync(g) {
    const shown=g.version===2&&g.choice!==null;
    workspace.hidden=!shown;$('studio').classList?.toggle('has-paper',shown);
    if(!shown){cancelDraft();lastTarget=null;lastEditable=null;return;}
    const target=live()||(g.choice==='now'&&g.request.status!=='cancelled'?'sketch':'note');
    if(target!==lastTarget||g.state!=='playing')cancelDraft();lastTarget=target;
    const enabled=live()===target,marks=g.art[target].marks;
    surface.setAttribute?.('aria-disabled',String(!enabled));surface.tabIndex=enabled?0:-1;
    $('paper-title').textContent=['settled','closed'].includes(g.state)?'两份作品，都已经收好':target==='sketch'?'把叶影留到同一张纸上':'把窗边的小图留在手记里';
    $('paper-help').textContent=enabled?(marks.length>=2?'两笔已落墨。可以收笔，或撤回最近一组。':'在纸上按下、拖动、松开。落点、方向和大小由你决定；一笔后就可以收笔。'):
      g.history.length>=4096&&!['settled','closed'].includes(g.state)?'本次操作记录已满，笔迹保留；请暂停后重新安排这个片段。':g.state==='paused'?'纸面与人物都已暂停；继续后再落笔。':['settled','closed'].includes(g.state)?'这是你留下的构图，已经收好。':g.phase==='meeting-now'?'等人物在纸边坐好，就可以落笔。':'让手里的动作慢慢收尾，纸上的笔迹都会保留。';
    $('paper-keyboard').textContent='键盘：聚焦纸面后 Enter 起笔，方向键移动叶尖，Tab 可选叶柄/叶尖，Enter 落墨，Esc 放下草稿。';
    $('paper-undo').disabled=!enabled||!marks.length;$('paper-finish').disabled=!enabled||!marks.length;
    $('paper-tools').hidden=['settled','closed'].includes(g.state);
    for(const [id,x,y]of [['paper-handle-start',draft?.x1,draft?.y1],['paper-handle-end',draft?.x2,draft?.y2]]) {
      const node=$(id);node.hidden=!draft;
      if(draft){node.style.left=x/10+'%';node.style.top=y/10+'%';node.setAttribute?.('aria-label',(id.endsWith('start')?'叶柄':'叶尖')+'位置，横向'+Math.round(x/10)+'%，纵向'+Math.round(y/10)+'%，方向键调整，Enter落墨');}
    }
    renderer?.draw(g,target,draft);
    if(enabled&&lastEditable!==target){lastEditable=target;surface.focus({preventScroll:true});workspace.scrollIntoView?.({block:'nearest'});}
  }
  return {sync,cancelDraft,get drawing(){return !!draft;},diagnostics:()=>({draft:draft?{...draft}:null,pointer,target:live()})};
}
