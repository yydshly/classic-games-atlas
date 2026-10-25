import { createScene, command, update, snapshot, summary, canCancel, canResume,activePaper } from './scene.mjs';
import { readSave, writeSave, warning } from './storage.mjs';
import {mountPaper} from './paper-controller.mjs';

const PHASE = { ready: '尚未开始', playing: '下午进行中', paused: '时间已暂停', settled: '各自的小事都完成了', closed: '这一段已收好' };
export function mount({ document, window, storage, requestFrame, Renderer, PaperRenderer }) {
  const $ = id => document.getElementById(id), text = (id, s) => { if ($(id).textContent !== s) $(id).textContent = s; };
  const loaded = readSave(storage); let g = loaded.game, protection = loaded.protection, lastStamp = null, lastSave = 0, previous = g.state, pendingSave = false;
  const renderer = new Renderer($('room'));
  let paper=null;
  const speak = message => text('feedback', message);
  function save() {
    const ok = writeSave(storage, g, protection);
    // Retry a transient write failure even when no more simulation ticks run.
    // Protected unreadable/invalid bytes must never enter this retry path.
    pendingSave = !ok && !protection;
    $('storage-warning').hidden = ok;
    if (!ok) text('storage-warning', warning(protection));
    text('save-status', ok ? '仅保存这段下午 · 原三日存档不变' : '本次为临时进度 · 原三日存档不变');
    return ok;
  }
  function describe() {
    const a = g.actors[0], b = g.actors[1];
    if (g.phase === 'offered') return '禾禾坐在书桌旁，留下半页手记；阿沐在长座边举起未完的速写。';
    const where = actor => actor.current?.phase === 'walking' ? '正在小屋里走动' : actor.current?.kind === 'work' ? '正在书桌旁写手记' : actor.current?.kind === 'sketch' ? '正在长座旁完成速写' : actor.current?.kind === 'chat' ? g.phase === 'sharing' ? '正在分享成品' : g.phase === 'co-creating' ? '正在一起添笔' : '在长座旁等对方就位' : '暂时歇一会';
    return `禾禾${where(a)}；阿沐${where(b)}。${g.state === 'paused' ? '画面与时间都已暂停。' : ''}`;
  }
  function render() {
    const offered = g.phase === 'offered', done = ['settled', 'closed'].includes(g.state);
    const resumeBlocked = g.state === 'paused' && !offered && !canResume(g);
    $('request').hidden = !offered; $('toggle').hidden = offered || done;
    $('toggle').disabled = resumeBlocked;
    text('toggle', resumeBlocked ? '已暂停 · 操作记录已满' : g.state === 'ready' ? '走进这段下午' : g.state === 'playing' ? '暂停一下' : '继续这段下午');
    $('cancel').hidden = !canCancel(g); text('phase', PHASE[g.state]);
    $('legacy-note').hidden=g.version!==1;
    text('legacy-note','当前恢复的是旧版自动片段，按原安排继续。重新安排后才进入亲手画叶影的新片段。');
    text('choice-now-copy',g.version===1?'按旧安排到长座一起完成速写，回来续写手记。':'到长座亲手画叶影，阿沐顺着你的落点添枝线。半页手记保留。');
    text('choice-later-copy',g.version===1?'按旧安排各自完成，再交换手记与速写。':'先在手记里画自己的叶影，再带着作品到长座分享。');
    text('choice-alone-copy',g.version===1?'按旧安排各自完成，不需要分享。':'在手记上按自己的构图画好，安静收起，不必安排分享。');
    text('scene-description', describe());
    const note = g.art.note, art = g.art.sketch;
    text('note-status', note.finished ? note.location === 'bench' ? '手记已完成，放在长座边分享。' : note.location === 'carried' ? '手记已完成，禾禾正带着它走动。' : '最后一页已经写好。' : `还有半页没写完${g.choice === 'now' && ['meeting-now','co-creating','returning'].includes(g.phase) ? '，暂时搁在书桌上，回来接着写' : ''}。`);
    text('sketch-status', art.mode === 'together' ? '两种笔色一起完成了这张速写。' : art.mode === 'mixed' ? '阿沐独自收尾，纸上保留着禾禾先前的笔迹。' : art.mode === 'solo' ? '阿沐独自完成了速写。' : art.contributors.includes('a') ? '两种笔色已经落在纸上，速写还没画完。' : '速写已有轮廓，最后几笔还没有收好。');
    if(g.version===2&&!g.paper.note.done&&(g.choice!=='now'||g.request.status==='cancelled')&&!done)text('note-status',note.marks.length?'叶影已经落在手记上，等你决定是否收笔。':'手记里留了一处空白，等你亲手放一枚叶影。');
    $('result').hidden = !done; $('close').hidden = g.state === 'closed'; $('closed-note').hidden = g.state !== 'closed';
    if (done) {
      const result = summary(g), copies = {
        'shared-drawing': ['留在同一张纸上的两种笔色', '你先放下半页手记，和阿沐一起完成速写，再回到书桌继续。两件小事都完成了。'],
        exchanged: ['各自写好，再讲给你听', '禾禾先写完手记，阿沐先画完速写。你们带着两份成品坐到一起，轮流分享。'],
        'kept-mark': ['先前的笔迹还留在纸上', '共同安排中途停下了。阿沐独自收尾，速写留下禾禾已经画下的笔迹；手记也接着写完了。'],
        'separate-works': ['同一间小屋，各自的小事', result.cancelled ? '共同安排取消后，你们各自完成了手记与速写。这也是这段下午的一种安排。' : '禾禾写好了手记，阿沐画好了速写。没有一起完成的任务，也没有谁因此被扣分。']
      };
      if(g.version===2) {
        copies['shared-drawing']=['顺着你的叶影，接上一段枝线','叶影的位置与朝向由你留下，阿沐的枝线顺着它长过来。手记也续写完成了。'];
        copies.exchanged=['先画好，再拿给你看','手记里的叶影由你亲手安排。两份各自完成的作品，一起放到了长座边。'];
        copies['separate-works']=['同一间小屋，各自留下的叶影','你的手记与阿沐的窗景都已经完成，各自留在熟悉的位置。今天可以安静收好。'];
      }
      text('result-title', copies[result.outcome][0]); text('result-copy', copies[result.outcome][1]);
    }
    const lines = g.events.map(e => e.text); const list = $('events');
    if (list.dataset.events !== JSON.stringify(lines)) {
      list.replaceChildren(...lines.map(line => { const li = document.createElement('li'); li.textContent = line; return li; }));
      list.dataset.events = JSON.stringify(lines);
    }
    renderer.draw(g, g.time,{drawing:paper?.drawing});
    paper?.sync(g);
  }
  function act(type,payload) {
    const result = command(g, type,payload); speak(result.message);
    if(result.ok&&['pause','cancel'].includes(type))paper?.cancelDraft();
    if (result.ok) { save(); if(!['mark','undo-mark','finish-paper'].includes(type))lastStamp = null; render(); if (type === 'start') $('request-title').focus({ preventScroll: true }); else if (['now','later','alone','cancel'].includes(type)) $(g.version===2&&activePaper(g)?'paper-input':'toggle').focus({ preventScroll: true });else if(type==='finish-paper')$('toggle').focus({preventScroll:true});else if (type === 'close') $('result').focus({ preventScroll: true }); }
    return result;
  }
  function toggle() { act(g.state === 'ready' ? 'start' : g.state === 'playing' ? 'pause' : 'resume'); }
  $('toggle').addEventListener('click', toggle);
  for (const [id, type] of [['choose-now','now'],['choose-later','later'],['choose-alone','alone'],['dismiss','alone'],['cancel','cancel'],['close','close']]) $(id).addEventListener('click', () => act(type));
  $('retry').addEventListener('click', () => {
    paper?.cancelDraft();
    // Native confirm must never allow the scene to keep advancing behind it.
    const wasPlaying = g.state === 'playing'; if (wasPlaying) command(g, 'pause'); save(); render(); lastStamp = null;
    if (!window.confirm('重新安排这一段下午？只重置本候选，原来的三日日常和存档都保留。')) { speak('保留当前安排，仍暂停在这里。'); return; }
    g = createScene(); previous = g.state; save(); render(); speak('回到下午开头。可以重新决定这次邀请。'); $('toggle').focus({ preventScroll: true });
  });
  const interrupt = () => { paper?.cancelDraft();if (g.state === 'playing') { command(g, 'pause'); save(); render(); speak(canResume(g) ? '已自动暂停。回来后点继续，才会继续走动和创作。' : g.message); } else if (pendingSave) save(); lastStamp = null; };
  window.addEventListener('blur', interrupt); window.addEventListener('pagehide', interrupt);
  document.addEventListener('visibilitychange', () => { if (document.hidden) interrupt(); });
  document.addEventListener('keydown', e => { if (e.repeat || e.ctrlKey || e.metaKey || e.altKey || e.target?.closest?.('a,button,input,select,textarea,summary,[contenteditable]')) return; if (e.key?.toLowerCase() === 'p' && ['ready','playing','paused'].includes(g.state) && g.phase !== 'offered') { e.preventDefault(); toggle(); } });
  function frame(stamp) {
    const elapsed = lastStamp === null ? 0 : (stamp - lastStamp) / 1000; lastStamp = stamp;
    if (elapsed > 1 && g.state === 'playing') interrupt(); else update(g, Math.max(0, elapsed));
    if (g.state !== previous) { previous = g.state; save(); if (g.state === 'settled') { speak(g.message); render(); $('result').focus({ preventScroll: true }); } }
    if (!protection && (g.state === 'playing' || pendingSave) && stamp - lastSave > 1000) { save(); lastSave = stamp; }
    render(); requestFrame(frame);
  }
  paper=mountPaper({document,getScene:()=>g,act,render,PaperRenderer});
  $('load-status').hidden = true; $('app').hidden = false; render();
  if (protection) { $('storage-warning').hidden = false; text('storage-warning', warning(protection)); text('save-status', '原候选存档已保护 · 本次临时游玩'); }
  else text('save-status', g.state === 'ready' ? '尚未开始 · 原三日存档不会读取或修改' : '已恢复这段下午 · 活动恢复后先暂停');
  speak(g.state==='paused'&&g.phase!=='offered'&&!canResume(g)?g.message:g.version===1?'已恢复旧版片段，仍按原安排继续。点“重新安排”才会开始亲手留叶影的新片段。':g.state === 'paused' && g.phase !== 'offered' && canResume(g) ? '已恢复这段下午。当前暂停，继续后接着原来的安排。' : g.message);
  if (['settled','closed'].includes(g.state)) $('result').focus({ preventScroll: true });
  else if (g.phase === 'offered') $('request-title').focus({ preventScroll: true });
  requestFrame(frame);
  return { snapshot: () => snapshot(g), summary: () => summary(g), storage: () => ({ protection }),paper:()=>paper?.diagnostics() };
}
