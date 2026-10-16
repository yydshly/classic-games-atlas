const $ = (selector) => document.querySelector(selector);
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalize = (text) => String(text).normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const icons = {
  fc: '<path d="M7 36h34M10 32V22h9v-9h10V5h9M8 10h5M10.5 7.5v5M27 37v-8h9v8"/><circle cx="34" cy="15" r="4"/>',
  arcade: '<path d="M13 5h23l-4 19 7 6v13H9V30l8-6zM17 10h13l-2 10H15M16 28h15M15 36h5M17.5 33.5v5"/><circle cx="31" cy="36" r="1.5"/>',
  puzzle: '<path d="M5 26h11v11H5zM16 26h11v11H16zM27 26h11v11H27zM16 15h11v11H16zM29 3h11v11H29z"/>',
  casual: '<path d="M8 40h32M13 39V22h22v17M10 22h28l-4-8H14zM24 5v9M19 8h10M20 29h8v10"/><circle cx="8" cy="9" r="3"/>',
  strategy: '<path d="m24 4 15 8v24l-15 8-15-8V12zM9 12l15 8 15-8M24 20v24M15 28l9 5 9-5M24 4v9"/>',
  rpg: '<path d="m10 39 9-9m0 0 19-24 4 4-23 20zm-5-5 10 10M5 42l5-5 3 3-5 5M7 9l3-3 3 3-3 3zM28 38h10M33 33v10"/>',
  sim: '<path d="M6 42h36M9 42V20h12v22M21 42V8h14v34M35 42V27h6v15M13 26h4M13 32h4M25 14h5M25 21h5M25 28h5M25 35h5"/>',
  action: '<circle cx="24" cy="24" r="15"/><circle cx="24" cy="24" r="6"/><path d="M24 3v10M24 35v10M3 24h10M35 24h10"/>',
  sports: '<path d="M8 35v-9l5-8h21l6 8v9M6 35h36M16 18l4-8h8l6 8M10 27h5M33 27h5M11 35v5h5v-5M33 35v5h5v-5"/>',
  online: '<rect x="13" y="4" width="24" height="40" rx="4"/><path d="M13 11h24M13 35h24M22 40h6M18 19h7M21.5 15.5v7"/><circle cx="29" cy="27" r="2"/>',
};
const emblem = (group) => `<span class="game-emblem" aria-hidden="true"><svg viewBox="0 0 48 48">${icons[group]}</svg></span>`;
const sourceNames = {official:'官方资料', 'publisher-store':'发行方资料', museum:'博物馆资料', project:'项目资料', secondary:'百科参考'};
const dialog = $('#game-dialog');
let data;
let selectedGroup = 'all';
let returnFocus;

function renderExperiments(experiments) {
  $('#experiments-grid').innerHTML = experiments.map((e) => `<article class="lab-card ${e.status === 'planned' ? 'lab-planned' : ''}">${e.cover ? `<img src="${escapeHtml(e.cover)}" width="500" height="300" alt="${escapeHtml(e.title)}原创几何插画">` : '<div class="planned-art" aria-hidden="true"><span>03</span><i>○ ○ ○<br>　○ ○<br>　　○</i></div>'}<div class="lab-card-copy"><p class="eyebrow">PLAY LAB ${escapeHtml(e.number)} <span>${e.status === 'published' ? '现已可玩' : '待开发'}</span></p><h3>${escapeHtml(e.title)}</h3><p class="lab-english">${escapeHtml(e.english)}</p><p>${escapeHtml(e.description)}</p>${e.status === 'published' ? `<div class="experiment-tags"><span>单人 · ${e.levels}关</span><span>键盘 / 触屏</span><span>本地进度</span></div><a class="primary-link" href="${escapeHtml(e.url)}">进入原创战场 <span>↗</span></a>` : '<p class="planned-label">等待后续独立交付</p>'}</div></article>`).join('');
}

function tags(game) {
  return `<div class="platform-tags">${game.platforms.map((platform) => `<span>${escapeHtml(platform)}</span>`).join('')}<span class="era-tag">${escapeHtml(game.era)}</span></div>`;
}

function card(game) {
  const source = data.sources[game.sources[0]];
  const index = String(data.games.indexOf(game) + 1).padStart(3, '0');
  return `<article class="game-card" data-game="${game.id}">
    <div class="card-topline"><span class="card-index">NO. ${index}</span><span class="scope-label">${escapeHtml(game.scope)}</span></div>
    <div class="card-heading">${emblem(game.group)}<div class="card-title"><h4>${escapeHtml(game.title)}</h4><p class="english-name" lang="en">${escapeHtml(game.english)}</p></div></div>
    ${tags(game)}<p class="card-play">${escapeHtml(game.play)}</p><p class="classic-note"><strong>经典之处</strong>${escapeHtml(game.classic)}</p>
    ${game.experiment ? `<a class="lab-mini" href="${escapeHtml(game.experiment.url)}">本项目原创 · ${escapeHtml(game.experiment.title)} <span>可游玩 ↗</span></a>` : ''}
    <div class="card-bottom"><a class="source-quick" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(game.title)}：${escapeHtml(source.label)}（新窗口）">${sourceNames[source.kind]} ↗</a><button class="details-button" data-open="${game.id}" type="button" aria-label="查看${escapeHtml(game.title)}详情">翻开条目 <span aria-hidden="true">↗</span></button></div>
  </article>`;
}

function filterGames() {
  const query = normalize($('#search').value);
  const genre = $('#genre').value;
  return data.games.filter((game) => (selectedGroup === 'all' || game.group === selectedGroup)
    && (genre === 'all' || game.genres.includes(genre))
    && (!query || normalize([game.title, game.english, ...game.aliases].join(' ')).includes(query)));
}

function render() {
  const games = filterGames();
  $('#catalogue').innerHTML = data.groups.map((group) => {
    const entries = games.filter((game) => game.group === group.id);
    if (!entries.length) return '';
    return `<section class="game-group" aria-labelledby="group-${group.id}"><div class="group-heading"><span class="group-number" aria-hidden="true">${group.number}</span><div class="group-title"><h3 id="group-${group.id}">${escapeHtml(group.title)}</h3><p>${escapeHtml(group.tagline)}</p></div><span class="group-rule" aria-hidden="true"></span><span class="group-count">${entries.length} ENTRIES</span></div><div class="game-grid">${entries.map(card).join('')}</div></section>`;
  }).join('');
  const filtered = selectedGroup !== 'all' || $('#genre').value !== 'all' || $('#search').value.length > 0;
  $('#result-count').textContent = `找到 ${games.length} / ${data.games.length} 个作品与系列`;
  $('#reset').hidden = !filtered;
  $('#empty-state').hidden = games.length > 0;
  $('#catalogue').setAttribute('aria-busy', 'false');
  document.querySelectorAll('[data-group]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.group === selectedGroup)));
}

function resetFilters() {
  selectedGroup = 'all';
  $('#search').value = '';
  $('#genre').value = 'all';
  render();
}

function openGame(id) {
  const game = data.games.find((entry) => entry.id === id);
  if (!game) return;
  const group = data.groups.find((entry) => entry.id === game.group);
  const sources = game.sources.map((key) => {
    const source = data.sources[key];
    const warning = ['待核读','未能读取','访问受限或失效'].includes(source.status);
    return `<div class="source-item"><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} ↗<span class="sr-only">（新窗口）</span></a><p>资料关系：${escapeHtml(source.relation)}</p><p><span class="source-state${warning ? ' warning' : ''}">${escapeHtml(source.status)}</span>${source.checkedAt ? ` · 检查于 ${escapeHtml(source.checkedAt)}` : ''}<br>${escapeHtml(source.note)}</p></div>`;
  }).join('');
  $('#detail-content').innerHTML = `<p class="detail-eyebrow">${group.number} / ${escapeHtml(group.title)} <span class="scope-label">${escapeHtml(game.scope)}</span></p><div class="detail-header">${emblem(game.group)}<div><h2 id="detail-title">${escapeHtml(game.title)}</h2><p class="english-name" lang="en">${escapeHtml(game.english)}</p></div></div>${tags(game)}<p class="detail-aliases">玩法类型：${game.genres.map(escapeHtml).join(' / ')}<br>常见别名：${game.aliases.map(escapeHtml).join('、')}</p><div class="detail-body"><h3>怎么玩</h3><p>${escapeHtml(game.play)}</p><h3>为什么值得记住</h3><p>${escapeHtml(game.classic)}</p><h3>版本与边界</h3><p class="edition-note">${escapeHtml(game.edition)}</p><h3>参考资料</h3>${sources}<p class="detail-footnote">介绍与插画为本项目原创。资料中的重制版、合集、后继产品可能与历史原作不同。本站独立提供原创玩法实验，不冒称原作完整复刻，也不提供原游戏资源。</p></div>`;
  if (game.experiment) $('#detail-content').insertAdjacentHTML('beforeend', `<section class="lab-detail"><p class="eyebrow">本项目原创玩法实验 · 可游玩</p><h3>${escapeHtml(game.experiment.title)}</h3><p>${escapeHtml(game.experiment.relation)}${game.experiment.levels} 张原创地图，键盘与触屏均可操作。</p><a class="primary-link" href="${escapeHtml(game.experiment.url)}">进入原创战场 <span>↗</span></a></section>`);
  if (!dialog.open) {
    returnFocus = document.activeElement;
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }
  dialog.scrollTop = 0;
  $('.dialog-close').focus({ preventScroll: true });
}

function handleRoute() {
  const match = location.hash.match(/^#game=([a-z0-9-]+)$/);
  if (match) openGame(match[1]);
  else if (dialog.open) dialog.close();
}

function closeGame() {
  // Update the route synchronously: a queued close event may arrive after reopening.
  if (location.hash.startsWith('#game=')) history.replaceState(null, '', `${location.pathname}${location.search}#collection`);
  dialog.close();
}

$('#reload').addEventListener('click', () => location.reload());
$('.dialog-close').addEventListener('click', closeGame);
dialog.addEventListener('cancel', (event) => { event.preventDefault(); closeGame(); });
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeGame();
});
dialog.addEventListener('close', () => {
  if (dialog.open) return;
  document.body.classList.remove('dialog-open');
  if (returnFocus?.isConnected) returnFocus.focus({ preventScroll:true });
});
dialog.addEventListener('keydown', (event) => {
  if (event.key !== 'Tab') return;
  const focusable = [...dialog.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')].filter((element) => element.getClientRects().length);
  const first = focusable[0];
  const last = focusable.at(-1);
  if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
    event.preventDefault();
    last?.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first?.focus();
  }
});

try {
  const response = await fetch('./data/games.json');
  if (!response.ok) throw new Error(`Catalogue HTTP ${response.status}`);
  data = await response.json();
  if (!Array.isArray(data.games) || !data.games.length) throw new Error('Catalogue is empty');
  $('#group-filter').innerHTML = `<button class="filter-chip" type="button" data-group="all" aria-pressed="true">全部图鉴 <span>${data.games.length}</span></button>${data.groups.map((group) => `<button class="filter-chip" type="button" data-group="${group.id}" aria-pressed="false">${escapeHtml(group.title)} <span>${data.games.filter((game) => game.group === group.id).length}</span></button>`).join('')}`;
  const genres = [...new Set(data.games.flatMap((game) => game.genres))].sort((a,b) => a.localeCompare(b,'zh-CN'));
  $('#genre').insertAdjacentHTML('beforeend', genres.map((genre) => `<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`).join(''));
  $('#search').addEventListener('input', render);
  $('#genre').addEventListener('change', render);
  $('#reset').addEventListener('click', resetFilters);
  $('#empty-reset').addEventListener('click', () => { resetFilters(); $('#search').focus(); });
  $('#group-filter').addEventListener('click', (event) => {
    const button = event.target.closest('[data-group]');
    if (!button) return;
    selectedGroup = button.dataset.group;
    render();
  });
  $('#catalogue').addEventListener('click', (event) => {
    const button = event.target.closest('[data-open]');
    if (!button) return;
    const hash = `#game=${button.dataset.open}`;
    if (location.hash === hash) openGame(button.dataset.open);
    else location.hash = hash;
  });
  document.addEventListener('keydown', (event) => {
    const editing = event.target instanceof HTMLElement && (event.target.matches('input,textarea,select') || event.target.isContentEditable);
    if (event.key === '/' && !editing && !event.isComposing && !event.ctrlKey && !event.metaKey && !event.altKey && !dialog.open) {
      event.preventDefault();
      $('#search').focus();
    }
  });
  window.addEventListener('hashchange', handleRoute);
  renderExperiments(data.experiments);
  render();
  handleRoute();
} catch (error) {
  $('#load-error').hidden = false;
  $('#catalogue').setAttribute('aria-busy','false');
  $('#result-count').textContent = '图鉴读取失败';
  $('#search').disabled = true;
  $('#genre').disabled = true;
  console.error(error);
}
