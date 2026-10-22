import { COLORS } from './levels.mjs';

const shapes = [
  'M32 5 39 17 52 12 49 26 61 32 49 39 52 52 39 49 32 61 25 49 12 52 15 39 3 32 15 25 12 12 25 16Z',
  'M32 4C53 15 63 36 46 51L32 61 17 50C1 36 10 15 32 4Z',
  'M32 3C37 17 55 30 55 42A23 21 0 0 1 9 42C9 30 27 17 32 3Z',
  'M32 4 59 48 32 60 5 48Z',
  'M32 59 9 37C-3 18 15 2 32 19 49 2 67 18 55 37Z',
  'M23 6H41V23H58V41H41V58H23V41H6V23H23Z',
];
const prismShape = 'M20 3H44L61 24 48 58H16L3 24Z';

export function gemSvg(color, kind = 'normal') {
  if (kind === 'prism') {
    return `<svg viewBox="0 0 64 64" class="prism-svg" aria-hidden="true"><path class="gem-shadow" d="${prismShape}" transform="translate(0 2)"/><path class="prism-body" d="${prismShape}"/><path d="M20 3H44L32 25Z" fill="#eab868"/><path d="M44 3 61 24 32 25Z" fill="#e5a1ad"/><path d="M61 24 48 58 32 25Z" fill="#baa4de"/><path d="M48 58H16L32 25Z" fill="#9fc8e4"/><path d="M16 58 3 24 32 25Z" fill="#9ed5be"/><path d="M3 24 20 3 32 25Z" fill="#e2e2a2"/><path class="prism-core" d="M23 11H41L50 25 41 49H23L14 25Z"/><path d="M32 15 35 26 45 30 35 34 32 45 29 34 19 30 29 26Z" fill="#fff"/><path class="prism-outline" d="${prismShape}"/></svg>`;
  }
  const c = COLORS[color] || COLORS[0];
  const shape = shapes[color] || shapes[0];
  const mark = kind === 'row' ? '↔' : kind === 'col' ? '↕' : kind === 'bloom' ? '✺' : c.symbol;
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path class="gem-shadow" d="${shape}" transform="translate(0 2)"/><path class="gem-body" d="${shape}" fill="${c.color}"/><path class="gem-facet" d="M32 12 18 32 32 51 46 32Z"/><text x="32" y="39" class="gem-symbol ${kind !== 'normal' ? 'special-symbol' : ''}">${mark}</text>${kind !== 'normal' ? '<circle class="special-ring" cx="32" cy="32" r="25"/>' : ''}</svg>`;
}

export class Renderer {
  constructor(board) { this.board = board; this.signature = ''; }

  draw(g, cursor) {
    const disabled = g.state !== 'playing' || g.phase !== 'stable';
    this.board.dataset.phase = g.phase;
    this.board.setAttribute('aria-busy', String(g.phase !== 'stable'));
    const signature = JSON.stringify([g.board.map(t => t ? [t.id, t.color, t.kind] : null), g.soil, g.phase, g.selection, g.hint, cursor]);
    if (signature === this.signature) {
      for (const b of this.board.children) b.disabled = disabled || !g.board[Number(b.dataset.index)];
      return;
    }
    this.signature = signature;
    const focused = document.activeElement?.closest?.('.cell')?.dataset.index;
    const style = getComputedStyle(this.board);
    const gap = parseFloat(style.gap) || 0;
    const step = (this.board.clientWidth - (parseFloat(style.paddingLeft) || 0) * 2 + gap) / 8;
    const old = new Map((g.transition?.before || []).flatMap((id, i) => id == null ? [] : [[id, i]]));
    const clearing = new Set(g.phase === 'clear' ? g.pending?.clear || [] : []);
    const creating = new Set(['clear', 'forge'].includes(g.phase) ? (g.pending?.creations || []).map(c => c.index) : []);
    const activated = new Set(g.phase === 'clear' ? g.pending?.activated || [] : []);
    const prismClear = (g.pending?.activated || []).some(i => g.board[i]?.kind === 'prism');
    this.board.style.setProperty('--clear-duration', prismClear ? '.65s' : '.4s');
    this.board.innerHTML = g.board.map((t, i) => {
      const prior = t ? old.get(t.id) : undefined;
      const dx = prior === undefined ? 0 : ((prior % 8) - (i % 8)) * step;
      const dy = prior === undefined ? (t && g.transition?.kind === 'fall' ? -(1 + (i / 8 | 0)) * step : 0) : ((prior / 8 | 0) - (i / 8 | 0)) * step;
      const classes = ['cell', g.soil[i] ? 'soil soil-' + g.soil[i] : '', !t ? 'is-empty' : '', clearing.has(i) ? 'is-clearing' : '', creating.has(i) ? 'is-creating' : '', activated.has(i) && t?.kind === 'prism' ? 'is-prism-trigger' : '', t?.kind === 'prism' ? 'has-prism' : '', g.selection === i ? 'is-selected' : '', g.hint?.includes(i) ? 'is-hint' : ''].filter(Boolean).join(' ');
      const name = !t ? '空格，等待下落' : t.kind === 'prism' ? '彩虹棱镜，可交换邻格选色' : COLORS[t.color]?.name || '晶簇';
      const special = !t || ['normal', 'prism'].includes(t.kind) ? '' : t.kind === 'row' ? '，清行晶簇' : t.kind === 'col' ? '，清列晶簇' : '，花蕊';
      const gem = t ? `<span class="gem ${g.transition ? 'is-moving' : ''} ${t.kind !== 'normal' ? 'is-special' : ''} ${t.kind === 'prism' ? 'is-prism' : ''}" style="--dx:${dx}px;--dy:${dy}px;--duration:${g.phase === 'fall' ? '.35s' : g.phase === 'shuffle' ? '.3s' : '.16s'}">${gemSvg(t.color, t.kind)}</span>` : '';
      return `<button type="button" role="gridcell" class="${classes}" data-index="${i}" tabindex="${i === cursor ? 0 : -1}" ${disabled || !t ? 'disabled' : ''} aria-selected="${g.selection === i}" aria-rowindex="${(i / 8 | 0) + 1}" aria-colindex="${i % 8 + 1}" aria-label="第${(i / 8 | 0) + 1}行第${i % 8 + 1}列，${name}${special}${g.soil[i] ? '，土层' + g.soil[i] : ''}"><span class="soil-marks" aria-hidden="true">${g.soil[i] === 2 ? 'Ⅱ' : g.soil[i] === 1 ? 'Ⅰ' : ''}</span>${gem}</button>`;
    }).join('');
    if (focused !== undefined && !disabled) this.board.querySelector(`[data-index="${cursor}"]`)?.focus({ preventScroll: true });
  }
}
