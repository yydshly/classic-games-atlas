const $ = (selector) => document.querySelector(selector);
const escapeHtml = (text) => String(text ?? '').replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const normalize = (text) => String(text ?? '').normalize('NFKC').toLocaleLowerCase().replace(/[\s\p{P}\p{S}]/gu, '');
const arrow = '<svg class="inline-arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 13 13 3M3 3h10v10"/></svg>';
const sourceNames = {official:'官方资料', 'publisher-store':'发行方资料', museum:'博物馆资料', project:'项目资料', secondary:'百科参考'};
const dialog = $('#game-dialog');
const PAGE_SIZE = 12;
const DATA_REVISION = 'reference-review-r4-repair-20261018';
const BASELINE = '86bb3267f50c1970c97f0dc875b9e0e0e690a36f';
let data, comparisons = [], referenceMedia = [], selectedGroup = 'all', visibleLimit = PAGE_SIZE, returnFocus;
const candidateDefaults = [
 {number:'35',slug:'court',title:'晴湾篮场',play_url:'./preview/court/',levels:8},
 {number:'36',slug:'repair',title:'雨街修理所',play_url:'./preview/repair/',levels:8},
 {number:'38',slug:'coaster',title:'云岬游乐园',play_url:'./preview/coaster/',levels:8},
 {number:'39',slug:'kart',title:'林野杯赛',play_url:'./preview/kart/',levels:8}
];
const list = (items, className = '') => `<ul${className ? ` class="${className}"` : ''}>${(Array.isArray(items) ? items : items ? [items] : []).map(item => `<li>${escapeHtml(typeof item === 'string' ? item : JSON.stringify(item))}</li>`).join('')}</ul>`;
const mediaFor = (id) => referenceMedia.find(item => item.gameId === id);
const comparisonFor = (slug) => comparisons.find(item => item.slug === slug);
const comparisonForGame = (id) => comparisons.filter(item => item.reference_id === id && !String(item.reference_binding || '').includes('未绑定'));
const gameFor = (id) => data.games.find(game => game.id === id);
const localUrl = (url) => String(url || '').replace('https://yydshly.github.io/classic-games-atlas/','./');
const frozenUrl = (url) => './versions/v1/' + localUrl(url).replace(/^\.\//, '');
function safeUrl(url) { return /^(?:https:\/\/|\.\/|\.\.\/|#)/.test(String(url || '')) ? url : '#'; }
function mediaMarkup(game, {detail = false, compact = false} = {}) {
  const item = mediaFor(game.id);
  if (!item?.image || item.status !== 'verified') {
    const source = item?.sourcePage || data.sources[game.sources[0]]?.url;
    return `<div class="reference-pending"><span>${escapeHtml(item?.pendingLabel || '原作参考图待补')}</span>${!compact && source ? `<a href="${escapeHtml(safeUrl(source))}" target="_blank" rel="noopener noreferrer">原作资料 ${arrow}<span class="sr-only">（新窗口）</span></a>` : ''}</div>`;
  }
  return `<figure class="original-media${detail ? ' detail-media' : ''}${item.pixelArt ? ' pixel-art' : ''}"><a href="${escapeHtml(safeUrl(item.sourcePage))}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(game.title)}原作参考图来源（新窗口）"><img src="${escapeHtml(safeUrl(item.image))}" width="${Number(item.width) || 640}" height="${Number(item.height) || 400}" alt="${escapeHtml(item.alt || `${game.title}原作实机参考画面`)}" loading="lazy" decoding="async"></a><figcaption><span class="original-label">原作参考</span><span class="media-edition">${escapeHtml(item.exactEdition)}</span>${item.pixelArt ? `<span class="media-pixels">原图 ${item.width}×${item.height} 像素</span>` : ''}<span class="media-source"><a href="${escapeHtml(safeUrl(item.sourcePage))}" target="_blank" rel="noopener noreferrer">来源：${escapeHtml(item.sourceLabel || '原作资料页')} ${arrow}<span class="sr-only">（新窗口）</span></a> · ${escapeHtml(item.rightsHolder || '')}</span>${detail ? `<p>${escapeHtml(item.rightsNote || '仅用于介绍与比较。公开可访问不等于取得转载授权。')}</p>${item.requiredDisclaimer ? `<p lang="en">${escapeHtml(item.requiredDisclaimer)}</p>` : ''}` : ''}</figcaption></figure>`;
}
function tags(game) { return `<div class="platform-tags">${game.platforms.map(platform => `<span>${escapeHtml(platform)}</span>`).join('')}<span class="era-tag">${escapeHtml(game.era)}</span></div>`; }
const hasCandidate = item => ['candidate_unaccepted','paused_unaccepted'].includes(item.next_version?.status) && Boolean(item.next_version?.url);
const versionLabel = item => hasCandidate(item) ? (item.next_version.label || 'v2 首轮候选，未完成验收') : item.next_version?.status === 'in_progress' ? 'v2 开发中，尚未发布' : 'v2 尚未开始';
function versionLinks(item, compact = false) {
  const url = localUrl(item.play_url || item.url);
  return `<div class="version-links${compact ? ' compact' : ''}"><a href="${escapeHtml(safeUrl(url))}">试玩 v1 ${arrow}</a><a href="${escapeHtml(safeUrl(frozenUrl(url)))}">冻结 v1 ${arrow}</a>${hasCandidate(item) ? `<a class="v2-candidate-link" href="${escapeHtml(safeUrl(localUrl(item.next_version.url)))}">${item.next_version.status === 'paused_unaccepted' ? '回看 v2 阶段版本' : '试玩 v2 首轮候选'} ${arrow}</a>` : ''}<span>${escapeHtml(versionLabel(item))}</span></div>`;
}
function comparisonButton(item) { return `<a class="comparison-link" href="#compare=${escapeHtml(item.slug)}">查看对标与差异 ${arrow}</a>`; }
function renderExperiments(experiments) {
  $('#experiments-grid').innerHTML = experiments.map(e => {
    const item = comparisonFor(e.id) || {slug:e.id,title:e.title,play_url:e.url};
    return `<article class="lab-card"><div class="prototype-cover">${e.cover ? `<img src="${escapeHtml(e.cover)}" width="500" height="300" alt="${escapeHtml(e.title)}本项目原创原型封面，非原作截图" loading="lazy" decoding="async">` : ''}<span>本项目原创原型 · 非原作画面</span></div><div class="lab-card-copy"><p class="eyebrow">PLAY LAB ${escapeHtml(e.number)} <span>已有 v1 入口</span></p><h3>${escapeHtml(e.title)}</h3><p class="lab-english">${escapeHtml(e.english)}</p><p>${escapeHtml(e.description)}</p><p class="prototype-source">机制参考：${escapeHtml(item.original_title || gameFor(e.sourceGame)?.title || e.sourceGame)}</p>${comparisonButton(item)}${versionLinks({...item,play_url:e.url},true)}</div></article>`;
  }).join('');
  $('#preview-grid').innerHTML = candidateDefaults.map(e => {
    const item = {...e,...comparisonFor(e.slug)};
    return `<article class="preview-summary"><p class="eyebrow">PREVIEW ${e.number} <span>独立候选 / v1</span></p><h4>${escapeHtml(e.title)}</h4><p>8 关配置；尚未完成正式验收。</p><p class="prototype-source">${item.original_title && item.original_title !== '未明确' ? `参考：${escapeHtml(item.original_title)} · ${escapeHtml(item.reference_version || '具体版本未定')}` : '原作对标尚未明确绑定'}</p>${comparisonButton(item)}${versionLinks(item,true)}</article>`;
  }).join('');
}
function card(game) {
  const source = data.sources[game.sources[0]];
  const index = String(data.games.indexOf(game) + 1).padStart(3, '0');
  const related = comparisonForGame(game.id);
  return `<article class="game-card" data-game="${game.id}"><div class="card-topline"><span class="card-index">NO. ${index}</span><span class="scope-label">${escapeHtml(game.scope)}</span></div>${mediaMarkup(game,{compact:true})}<div class="card-heading"><div class="card-title"><h4>${escapeHtml(game.title)}</h4><p class="english-name" lang="en">${escapeHtml(game.english)}</p></div></div>${tags(game)}<p class="card-play">${escapeHtml(game.play)}</p><p class="classic-note"><strong>经典之处</strong>${escapeHtml(game.classic)}</p>${related.map(item=>`<div class="card-comparison"><span>本项目原型：${escapeHtml(item.title)}</span>${comparisonButton(item)}</div>`).join('')}<div class="card-bottom"><a class="source-quick" href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer" aria-label="${escapeHtml(game.title)}：${escapeHtml(source.label)}（新窗口）">${sourceNames[source.kind]} ${arrow}</a><button class="details-button" data-open="${game.id}" type="button" aria-label="查看${escapeHtml(game.title)}详情">原作详情 ${arrow}</button></div></article>`;
}
function renderShowcase() {
  const ids = ['nba-jam','theme-hospital','rollercoaster','mario-kart'];
  const verified = referenceMedia.filter(item => item.status === 'verified' && item.image && gameFor(item.gameId));
  $('#reference-image-count').textContent = String(verified.length);
  $('#comparison-count').textContent = String(comparisons.length);
  $('#reference-coverage-note').textContent = `${verified.length} / ${data.games.length} 个原作条目已补参考图；其余明确待补。图片版本与出处单独标注。`;
  $('#reference-showcase-grid').innerHTML = ids.map(id => {
    const game = gameFor(id); if (!game) return '';
    return `<article class="showcase-card">${mediaMarkup(game)}<div><h4>${escapeHtml(game.title)}</h4>${mediaFor(id)?.status === 'verified' ? '' : `<p class="pending-edition">${escapeHtml(mediaFor(id)?.exactEdition || game.edition)}</p>`}<a href="#game=${id}">查看原作条目 ${arrow}</a>${comparisonForGame(id).map(comparisonButton).join('')}</div></article>`;
  }).join('');
}
function filterGames() {
  const query = normalize($('#search').value), genre = $('#genre').value;
  return data.games.filter(game => (selectedGroup === 'all' || game.group === selectedGroup) && (genre === 'all' || game.genres.includes(genre)) && (!query || normalize([game.title,game.english,...game.aliases].join(' ')).includes(query)));
}
function render() {
  const games = filterGames(), visible = games.slice(0,visibleLimit);
  $('#catalogue').innerHTML = data.groups.map(group => {
    const entries = visible.filter(game => game.group === group.id); if (!entries.length) return '';
    return `<section class="game-group" aria-labelledby="group-${group.id}"><div class="group-heading"><span class="group-number" aria-hidden="true">${group.number}</span><div class="group-title"><h3 id="group-${group.id}">${escapeHtml(group.title)}</h3><p>${escapeHtml(group.tagline)}</p></div><span class="group-rule" aria-hidden="true"></span><span class="group-count">${games.filter(game=>game.group===group.id).length} ENTRIES</span></div><div class="game-grid">${entries.map(card).join('')}</div></section>`;
  }).join('');
  const filtered = selectedGroup !== 'all' || $('#genre').value !== 'all' || $('#search').value.length > 0;
  $('#result-count').textContent = `找到 ${games.length} / ${data.games.length} 个作品与系列`;
  $('#visible-count').textContent = games.length ? `已显示 ${visible.length} / ${games.length} 条` : '';
  $('#load-more').hidden = visible.length >= games.length;
  $('#load-more').textContent = `继续查看 ${Math.min(PAGE_SIZE,games.length-visible.length)} 个原作条目`;
  $('#reset').hidden = !filtered; $('#empty-state').hidden = games.length > 0;
  $('.reference-showcase').hidden = filtered;
  $('#catalogue').setAttribute('aria-busy','false');
  document.querySelectorAll('[data-group]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.group===selectedGroup)));
}
function resetFilters() { selectedGroup='all';visibleLimit=PAGE_SIZE;$('#search').value='';$('#genre').value='all';render(); }
function showDialog(content) {
  $('#detail-content').innerHTML = content;
  if (!dialog.open) { returnFocus=document.activeElement;dialog.showModal();document.body.classList.add('dialog-open'); }
  dialog.scrollTop=0;$('.dialog-close').focus({preventScroll:true});
}
function openGame(id) {
  const game=gameFor(id);if(!game)return;
  const group=data.groups.find(entry=>entry.id===game.group);
  const sources=game.sources.map(key=>{
    const source=data.sources[key],warning=['待核读','未能读取','访问受限或失效'].includes(source.status);
    return `<div class="source-item"><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)} ${arrow}<span class="sr-only">（新窗口）</span></a><p>资料关系：${escapeHtml(source.relation)}</p><p><span class="source-state${warning?' warning':''}">${escapeHtml(source.status)}</span>${source.checkedAt?` · 检查于 ${escapeHtml(source.checkedAt)}`:''}<br>${escapeHtml(source.note)}</p></div>`;
  }).join('');
  const related=comparisonForGame(id);
  showDialog(`<p class="detail-eyebrow">${group.number} / ${escapeHtml(group.title)} <span class="scope-label">${escapeHtml(game.scope)}</span></p><div class="detail-header"><div><h2 id="detail-title">${escapeHtml(game.title)}</h2><p class="english-name" lang="en">${escapeHtml(game.english)}</p></div></div>${mediaMarkup(game,{detail:true})}${tags(game)}<p class="detail-aliases">玩法类型：${game.genres.map(escapeHtml).join(' / ')}<br>常见别名：${game.aliases.map(escapeHtml).join('、')}</p><div class="detail-body"><h3>原作怎么玩</h3><p>${escapeHtml(game.play)}</p><h3>为什么值得记住</h3><p>${escapeHtml(game.classic)}</p><h3>版本与边界</h3><p class="edition-note">${escapeHtml(game.edition)}</p>${related.length?`<h3>本项目原型与它的差异</h3>${related.map(item=>`<section class="comparison-callout"><h4>${escapeHtml(item.title)} · v1</h4><p>${escapeHtml(item.validation_boundary || item.relation)}</p>${comparisonButton(item)}${versionLinks(item)}</section>`).join('')}`:''}<h3>参考资料</h3>${sources}<p class="detail-footnote">原作图像仅作介绍与比较，具体版本、来源及权利人见图注。网络可见不表示已获转载授权。原创原型另行标识；本站不提供 ROM、原作资源包或等价复刻。</p></div>`);
}
function openComparison(slug) {
  const item=comparisonFor(slug),fallback=data.experiments.find(e=>e.id===slug)||candidateDefaults.find(e=>e.slug===slug);
  if(!item && !fallback)return;
  if(!item){showDialog(`<p class="detail-eyebrow">PROTOTYPE / v1</p><h2 id="detail-title">${escapeHtml(fallback.title)} · 对照资料待补</h2><p>对照记录尚未载入，暂不陈述未核实的差异。</p>${versionLinks({...fallback,play_url:fallback.play_url||fallback.url})}`);return;}
  const original=gameFor(item.reference_id),binding=String(item.reference_binding||''),unbound=binding.includes('未绑定') || item.original_title==='未明确';
  const evidence=(item.evidence||[]).map(e=>`<li><a href="${escapeHtml(safeUrl(e.url||`https://github.com/yydshly/classic-games-atlas/blob/${BASELINE}/${e.path}`))}" target="_blank" rel="noopener noreferrer">${escapeHtml(e.claim||e.path)} ${arrow}<span class="sr-only">（新窗口）</span></a></li>`).join('');
  showDialog(`<p class="detail-eyebrow">REFERENCE / PROTOTYPE / VERSION</p><h2 id="detail-title">${escapeHtml(item.title)} · 对标与差异</h2><p class="comparison-version">当前为 v1 原创玩法原型。${escapeHtml(versionLabel(item))}。${hasCandidate(item) ? '下方截图和实测记录仍对应 v1；v2 变化另列。' : '此页不是 v2 发布说明。'}</p><div class="comparison-pair${item.current_screenshot ? ' has-current-preview' : ''}"><section><p class="eyebrow">原作参考</p><h3>${escapeHtml(item.original_title)}</h3><p>${escapeHtml(item.reference_version||'版本尚未明确')}</p>${original&&!unbound?mediaMarkup(original,{detail:true}):`<p class="binding-note">${escapeHtml(item.reference_binding||'原作尚未明确绑定')}。不把推测写成确定对标。</p>`}<p>${escapeHtml(item.version_note||'')}</p></section><section><p class="eyebrow">本项目实际实现</p><h3>${escapeHtml(item.title)} · v1</h3><p>${escapeHtml(item.levels)} 关配置 · ${Number(item.number)>34?'独立预览，尚未完成验收':'已有试玩入口，非成品认定'}</p>${item.current_screenshot?`<figure class="current-preview-media"><a href="${escapeHtml(item.current_screenshot.image)}" target="_blank" rel="noopener noreferrer" aria-label="打开完整桌面实测截图（新窗口）"><img src="${escapeHtml(item.current_screenshot.image)}" alt="${escapeHtml(item.title)}本项目v1真实桌面截图"></a><figcaption>${escapeHtml(item.current_screenshot.label)}<br>完整截图按比例展示，未裁切；保留画面内的状态、HUD及结算。<br><a href="${escapeHtml(item.current_screenshot.image)}" target="_blank" rel="noopener noreferrer">打开原尺寸完整证据 ${arrow}<span class="sr-only">（新窗口）</span></a></figcaption></figure>`:'<p>本条尚未补充当前版本真实截图；封面不作为实测画面证据。</p>'}<p class="validation-boundary">${escapeHtml(item.actual_qa_summary||item.validation_boundary||'验证范围以对应记录为准，不代表全部关卡实玩或美术验收。')}</p>${item.actual_qa_summary?`<p><a href="./docs/preview-review/#${escapeHtml(item.slug)}">查看实际验收记录 ${arrow}</a></p>`:''}</section></div><div class="detail-body comparison-detail"><h3>原作核心体验</h3>${list(item.original_core)}<h3>v1 已实现的部分</h3>${list(item.implemented)}<h3>与原作的差距 / 尚未实现</h3>${list(item.gaps,'gap-list')}<h3>关系与边界</h3><p>${escapeHtml(item.relation)}</p>${evidence?`<h3>项目证据</h3><ul class="comparison-evidence">${evidence}</ul>`:''}${hasCandidate(item) ? `<h3>${item.next_version.status === 'paused_unaccepted' ? 'v2 阶段版本与 v1 的差异' : 'v2 首轮候选与 v1 的差异'}</h3><p>${escapeHtml(item.next_version.validation_boundary)}</p>${list(item.next_version.changes)}<h3>本轮保留的部分</h3><p>${escapeHtml(item.next_version.preserved)}</p><p><a href="${escapeHtml(safeUrl(item.next_version.details_url))}">查看本轮改动与待验清单 ${arrow}</a></p>` : `<h3>下一版</h3><p>${escapeHtml(versionLabel(item))}。后续改进将保留 v1，另建版本目录，并记录具体改动与实测范围。</p>`}</div><section class="comparison-version-footer"><h3>本项目版本入口</h3><p>以下链接进入本项目原创原型，版本分别标注；候选发布不代表验收通过。</p>${versionLinks(item)}</section>`);
}
function handleRoute(){const gm=location.hash.match(/^#game=([a-z0-9-]+)$/),cm=location.hash.match(/^#compare=([a-z0-9-]+)$/);if(gm)openGame(gm[1]);else if(cm)openComparison(cm[1]);else if(dialog.open)dialog.close();}
function closeGame(){if(/^#(?:game|compare)=/.test(location.hash))history.replaceState(null,'',`${location.pathname}${location.search}#collection`);dialog.close();}
$('#reload').addEventListener('click',()=>location.reload());$('.dialog-close').addEventListener('click',closeGame);
dialog.addEventListener('cancel',event=>{event.preventDefault();closeGame();});
dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)closeGame();});
dialog.addEventListener('close',()=>{if(dialog.open)return;document.body.classList.remove('dialog-open');if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});});
dialog.addEventListener('keydown',event=>{if(event.key!=='Tab')return;const f=[...dialog.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(e=>e.getClientRects().length),first=f[0],last=f.at(-1);if(event.shiftKey&&(document.activeElement===first||!dialog.contains(document.activeElement))){event.preventDefault();last?.focus();}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}});
async function optionalJson(path,fallback){try{const response=await fetch(`${path}?v=${DATA_REVISION}`, {cache:'no-cache'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return await response.json();}catch(error){console.warn(`Supplemental catalogue unavailable: ${path}`,error);return fallback;}}
try{
 const response=await fetch(`./data/games.json?v=${DATA_REVISION}`, {cache:'no-cache'});if(!response.ok)throw new Error(`Catalogue HTTP ${response.status}`);data=await response.json();if(!Array.isArray(data.games)||!data.games.length)throw new Error('Catalogue is empty');
 const [comparisonData,mediaData]=await Promise.all([optionalJson('./data/comparisons.json',{items:[]}),optionalJson('./data/reference-media.json',{items:[]})]);
 comparisons=comparisonData.items||[];referenceMedia=mediaData.items||[];
 $('#group-filter').innerHTML=`<button class="filter-chip" type="button" data-group="all" aria-pressed="true">全部图鉴 <span>${data.games.length}</span></button>${data.groups.map(group=>`<button class="filter-chip" type="button" data-group="${group.id}" aria-pressed="false">${escapeHtml(group.title)} <span>${data.games.filter(game=>game.group===group.id).length}</span></button>`).join('')}`;
 const genres=[...new Set(data.games.flatMap(game=>game.genres))].sort((a,b)=>a.localeCompare(b,'zh-CN'));$('#genre').insertAdjacentHTML('beforeend',genres.map(genre=>`<option value="${escapeHtml(genre)}">${escapeHtml(genre)}</option>`).join(''));
 const refilter=()=>{visibleLimit=PAGE_SIZE;render();};$('#search').addEventListener('input',refilter);$('#genre').addEventListener('change',refilter);$('#reset').addEventListener('click',resetFilters);$('#empty-reset').addEventListener('click',()=>{resetFilters();$('#search').focus();});
 $('#load-more').addEventListener('click',()=>{const previous=visibleLimit;visibleLimit+=PAGE_SIZE;render();const added=document.querySelectorAll('#catalogue .game-card')[previous];if(added){added.setAttribute('tabindex','-1');added.focus({preventScroll:true});}});
 $('#group-filter').addEventListener('click',event=>{const button=event.target.closest('[data-group]');if(!button)return;selectedGroup=button.dataset.group;refilter();});
 document.addEventListener('click',event=>{const button=event.target.closest('[data-open]');if(button){const hash=`#game=${button.dataset.open}`;if(location.hash===hash)openGame(button.dataset.open);else location.hash=hash;}const sameRoute=event.target.closest('a[href^="#compare="],a[href^="#game="]');if(sameRoute&&sameRoute.getAttribute('href')===location.hash){event.preventDefault();handleRoute();}});
 document.addEventListener('keydown',event=>{const editing=event.target instanceof HTMLElement&&(event.target.matches('input,textarea,select')||event.target.isContentEditable);if(event.key==='/'&&!editing&&!event.isComposing&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!dialog.open){event.preventDefault();$('#search').focus();}});
 document.addEventListener('error',event=>{const img=event.target;if(img instanceof HTMLImageElement&&img.closest('.original-media')){const figure=img.closest('.original-media');const note=document.createElement('p');note.className='image-load-error';note.textContent='原作参考图暂时无法载入，请通过下方来源链接查看。';img.replaceWith(note);}},true);
 window.addEventListener('hashchange',handleRoute);renderExperiments(data.experiments);renderShowcase();render();handleRoute();
}catch(error){$('#load-error').hidden=false;$('#catalogue').setAttribute('aria-busy','false');$('#result-count').textContent='图鉴读取失败';$('#search').disabled=true;$('#genre').disabled=true;console.error(error);}
