// 雾港查单：原创航务货单推理。固定案例，所有处罚规则在当班规则板上公开。
export const SAVE_KEY = 'classic-games-atlas:fog-harbor-ledger:v2';
export const REASONS = {
  none: '无矛盾', expiry: '航证过期', route: '航路关闭', seal: '封签不符',
  cargo: '特货缺蓝签', weight: '超过登记载重',
};
const item = (name, route, cargo, until, shownSeal, actualSeal, registeredSeal, weight = 2, capacity = 3, blue = false, berthUntil = null, priority = 1) => ({
  name, route, cargo, until, shownSeal, actualSeal, registeredSeal, weight, capacity, blue, berthUntil, priority,
});
export const SHIFTS = [
  { name: '潮门初班', day: 1, limit: 8, quota: 4, maxErrors: 1, scans: 0, closeAt: null,
    brief: '先核航证日期、封签与禁航的北礁。所有编号都清晰可读。',
    cases: [
      item('青梭号', '青湾', '补给箱', 2, '青-14', '青-14', '青-14'),
      item('苇帆号', '青湾', '镜片', 0, '苇-08', '苇-08', '苇-08'),
      item('沙鹭号', '雾门', '灯芯', 3, '沙-27', '沙-27', '沙-21'),
      item('星篷号', '北礁', '补给箱', 2, '星-04', '星-04', '星-04'),
      item('纸舟号', '雾门', '镜片', 1, '纸-19', '纸-19', '纸-19'),
    ] },
  { name: '雨汐换则', day: 2, limit: 9, quota: 5, maxErrors: 1, scans: 1, closeAt: 5,
    brief: '光石现在要蓝签；东汐从第 5 分钟起关闭。污损封签可用一次快检或花两分钟索取拓本。',
    cases: [
      item('云鲤号', '青湾', '镜片', 3, '云-12', '云-12', '云-12'),
      item('汀枝号', '雾门', '灯芯', 2, '墨渍遮号', '汀-18', '汀-18'),
      item('石星号', '青湾', '光石', 4, '石-02', '石-02', '石-02', 2, 3, false),
      item('晨渡号', '东汐', '补给箱', 3, '晨-31', '晨-31', '晨-31'),
      item('栗湾号', '雾门', '镜片', 1, '栗-05', '栗-05', '栗-05'),
      item('白潮号', '青湾', '光石', 2, '白-09', '白-09', '白-09', 2, 3, true),
    ] },
  { name: '封雾夜班', day: 3, limit: 10, quota: 5, maxErrors: 1, scans: 1, closeAt: 7,
    brief: '新增载重核验，东汐从第 7 分钟起关闭；两份封签污损，快检与索拓本要分配给更急的船。',
    cases: [
      item('月笺号', '青湾', '灯芯', 4, '墨渍遮号', '月-40', '月-40'),
      item('岩尾号', '雾门', '补给箱', 3, '岩-06', '岩-06', '岩-06', 4, 3),
      item('北花号', '青湾', '光石', 3, '北-11', '北-11', '北-11', 2, 3, true),
      item('苔歌号', '雾门', '镜片', 4, '墨渍遮号', '苔-17', '苔-19'),
      item('银蓬号', '东汐', '灯芯', 5, '银-22', '银-22', '银-22'),
      item('远荻号', '青湾', '镜片', 2, '远-13', '远-13', '远-13'),
    ] },
  { name: '抢汐泊位', day: 4, limit: 11, quota: 6, maxErrors: 1, scans: 1, closeAt: 7,
    brief: '两艘东汐船的临时泊位都在第 2 分钟关闭：先快检抢高优先分，或先放行明晰船单、节省快检留给后续污损船。',
    cases: [
      item('鱼灯号', '东汐', '灯芯', 6, '墨渍遮号', '鱼-14', '鱼-14', 2, 3, false, 2, 3),
      item('浅帆号', '东汐', '镜片', 6, '浅-08', '浅-08', '浅-08', 2, 3, false, 2, 1),
      item('篷花号', '青湾', '光石', 6, '篷-22', '篷-22', '篷-22', 2, 3, false),
      item('棠湾号', '雾门', '补给箱', 6, '棠-16', '棠-16', '棠-16'),
      item('沙雾号', '东汐', '镜片', 6, '沙-07', '沙-07', '沙-07', 2, 3, false, 6),
      item('青楂号', '青湾', '灯芯', 6, '墨渍遮号', '青-31', '青-31', 2, 3, false, null, 2),
      item('落湾号', '雾门', '光石', 6, '落-04', '落-04', '落-04', 4, 3, true),
    ] },
  { name: '双窗收官', day: 5, limit: 12, quota: 7, maxErrors: 1, scans: 1, closeAt: 6,
    brief: '两份船单可择先后；第 2 分钟临时泊位与第 6 分钟东汐总封路都已预告。快检只余一次，别把未看清封签的船当作必可放行。',
    cases: [
      item('眠灯号', '东汐', '灯芯', 7, '墨渍遮号', '眠-12', '眠-12', 2, 3, false, 2, 3),
      item('晴梭号', '东汐', '补给箱', 7, '晴-19', '晴-19', '晴-19', 2, 3, false, 2, 1),
      item('盐花号', '雾门', '镜片', 7, '盐-06', '盐-06', '盐-09'),
      item('长苇号', '东汐', '灯芯', 7, '长-26', '长-26', '长-26'),
      item('苔桥号', '青湾', '光石', 7, '墨渍遮号', '苔-35', '苔-35', 2, 3, true, null, 2),
      item('归雾号', '青湾', '镜片', 7, '归-05', '归-05', '归-05'),
      item('赤帆号', '雾门', '光石', 7, '赤-24', '赤-24', '赤-24', 2, 3, false),
      item('尾星号', '青湾', '补给箱', 7, '尾-11', '尾-11', '尾-11'),
    ] },
];
const copy = value => JSON.parse(JSON.stringify(value));
const integer = (value, min, max = Infinity) => Number.isInteger(value) && value >= min && value <= max;
function fresh(stage, unlocked = stage, records = Array(SHIFTS.length).fill(null)) {
  return { version: 2, stage, unlocked, records: copy(records), phase: 'ready', resumePhase: null,
    minute: 0, scans: SHIFTS[stage].scans, cursor: 0, selectedIndex: null, revealed: false, evidence: null, correct: 0, errors: 0,
    released: 0, delivered: 0, copies: 0, scansUsed: 0, log: [],
    message: '先阅读当班规则；核对船单与港务底册，再决定放行或暂扣。' };
}
export const createGame = () => fresh(0, 0);
export function availableCases(s) {
  const processed = new Set(s.log.map(row => row.caseIndex));
  return SHIFTS[s.stage].cases.map((entry, index) => ({ entry, index })).filter(({ index }) => !processed.has(index)).slice(0, 2);
}
export const currentCase = s => s.selectedIndex === null ? null : SHIFTS[s.stage].cases[s.selectedIndex] ?? null;
export function selectCase(s, index) {
  if (s.phase !== 'active' || s.revealed || !availableCases(s).some(item => item.index === index) || s.selectedIndex === index) return false;
  s.selectedIndex = index; s.evidence = null;
  s.message = `${currentCase(s).name}已摆上查验桌。核对规则和底册，再选证据。`;
  return true;
}
export function reasonsFor(s, entry = currentCase(s)) {
  if (!entry) return [];
  const rules = SHIFTS[s.stage], reasons = [];
  if (entry.until < rules.day) reasons.push('expiry');
  if (entry.route === '北礁' || entry.route === '东汐' && rules.closeAt !== null && s.minute >= rules.closeAt ||
      entry.berthUntil !== null && s.minute >= entry.berthUntil) reasons.push('route');
  if (entry.actualSeal !== entry.registeredSeal) reasons.push('seal');
  if (rules.day >= 2 && entry.cargo === '光石' && !entry.blue) reasons.push('cargo');
  if (rules.day >= 3 && entry.weight > entry.capacity) reasons.push('weight');
  return reasons;
}
function finish(s) {
  const rules = SHIFTS[s.stage];
  if (s.errors <= rules.maxErrors && s.cursor === rules.cases.length && s.correct >= rules.quota && s.minute <= rules.limit) {
    s.phase = 'won'; s.unlocked = Math.max(s.unlocked, Math.min(SHIFTS.length - 1, s.stage + 1));
    const record = { minute: s.minute, correct: s.correct, errors: s.errors, released: s.released, delivered: s.delivered, scansUsed: s.scansUsed, copies: s.copies };
    if (!s.records[s.stage] || record.correct > s.records[s.stage].correct ||
      record.correct === s.records[s.stage].correct && record.delivered > s.records[s.stage].delivered ||
      record.correct === s.records[s.stage].correct && record.delivered === s.records[s.stage].delivered && record.minute < s.records[s.stage].minute) s.records[s.stage] = record;
    s.message = `${rules.name}完成：核对 ${s.cursor} 艘，正确 ${s.correct} 艘，误判 ${s.errors} 艘；有效放行 ${s.released} 艘，港务优先分 ${s.delivered}。`;
  } else if (s.errors > rules.maxErrors || s.minute >= rules.limit || s.cursor === rules.cases.length) {
    s.phase = 'lost'; s.message = `${rules.name}未达标：正确 ${s.correct}/${rules.quota}、误判 ${s.errors}/${rules.maxErrors}、用时 ${s.minute}/${rules.limit}。可重试本班。`;
  }
}
export function start(s) {
  if (s.phase !== 'ready') return false;
  s.phase = 'active'; s.message = '从当前两份船单选一份先查。规则与底册随时可看；判定每艘耗时 1 分钟。'; return true;
}
export function chooseEvidence(s, reason) {
  if (s.phase !== 'active' || !currentCase(s) || !Object.hasOwn(REASONS, reason) ||
      reason === 'cargo' && s.stage < 1 || reason === 'weight' && s.stage < 2 || s.evidence === reason) return false;
  s.evidence = reason; return true;
}
export function inspect(s, method) {
  if (s.phase !== 'active' || s.revealed || currentCase(s)?.shownSeal !== '墨渍遮号' || !['scan', 'copy'].includes(method)) return false;
  const cost = method === 'scan' ? 1 : 2;
  if (method === 'scan' && s.scans < 1) { s.message = '快检次数已用尽；可花两分钟索取拓本。'; return false; }
  if (s.minute + cost >= SHIFTS[s.stage].limit) { s.message = '本班剩余时间不足以取证并作出判定；可直接根据已知内容决断或重试。'; return false; }
  s.minute += cost; s.revealed = true; s.evidence = null;
  if (method === 'scan') { s.scans--; s.scansUsed++; } else s.copies++;
  s.message = `${method === 'scan' ? '快检' : '索取拓本'}耗时 ${cost} 分钟：封签号 ${currentCase(s).actualSeal}。时间与信息已变化，请重新选择证据。`;
  return true;
}
export function decide(s, verdict, reason) {
  if (s.phase !== 'active' || s.evidence !== reason || !['release', 'hold'].includes(verdict) || !Object.hasOwn(REASONS, reason) ||
      verdict === 'release' && reason !== 'none' || verdict === 'hold' && reason === 'none') return false;
  const entry = currentCase(s), rules = SHIFTS[s.stage], caseIndex = s.selectedIndex;
  if (!entry || s.minute >= rules.limit) return false;
  const actual = reasonsFor(s, entry), right = verdict === 'release' ? actual.length === 0 : actual.includes(reason);
  s.minute++; s.cursor++; s.selectedIndex = null; s.revealed = false; s.evidence = null;
  if (right) s.correct++; else s.errors++;
  if (verdict === 'release') { s.released++; if (right) s.delivered += entry.priority; }
  s.log.push({ caseIndex, name: entry.name, verdict, reason, right, actual: [...actual], at: s.minute });
  s.message = `${entry.name}${right ? '判定正确' : '判定有误'}；${actual.length ? `实际应暂扣：${actual.map(r => REASONS[r]).join('、')}` : '实际可放行'}。${right && verdict === 'release' ? `港务优先分 +${entry.priority}；` : ''}本单耗时 1 分钟。`;
  finish(s); return true;
}
export function pause(s) { if (s.phase !== 'active') return false; s.phase = 'paused'; s.resumePhase = 'active'; s.message = '已暂停；当前船单、查验资源和已核记录保持。'; return true; }
export function resume(s) { if (s.phase !== 'paused') return false; s.phase = 'active'; s.resumePhase = null; s.message = '继续核单。'; return true; }
export function restart(s) { Object.assign(s, fresh(s.stage, s.unlocked, s.records)); return true; }
export function selectShift(s, stage) {
  if (!integer(stage, 0, SHIFTS.length - 1) || stage > s.unlocked || !['ready', 'won', 'lost'].includes(s.phase)) return false;
  Object.assign(s, fresh(stage, s.unlocked, s.records)); return true;
}
export function nextShift(s) { if (s.phase !== 'won' || s.stage >= SHIFTS.length - 1) return false; return selectShift(s, s.stage + 1); }
export const checkpoint = s => copy(s);
export function restore(raw) {
  if (!raw || raw.version !== 2 || !integer(raw.stage, 0, SHIFTS.length - 1) || !integer(raw.unlocked, raw.stage, SHIFTS.length - 1) ||
      !['ready', 'active', 'paused', 'won', 'lost'].includes(raw.phase) ||
      !integer(raw.minute, 0, SHIFTS[raw.stage].limit) || !integer(raw.cursor, 0, SHIFTS[raw.stage].cases.length) ||
      (raw.selectedIndex !== null && !integer(raw.selectedIndex, 0, SHIFTS[raw.stage].cases.length - 1)) ||
      !integer(raw.scans, 0, SHIFTS[raw.stage].scans) || typeof raw.revealed !== 'boolean' ||
      (Object.hasOwn(raw, 'evidence') && raw.evidence !== null && !Object.hasOwn(REASONS, raw.evidence)) ||
      !integer(raw.correct, 0, raw.cursor) || !integer(raw.errors, 0, raw.cursor) || !integer(raw.delivered, 0) ||
      raw.correct + raw.errors !== raw.cursor || !integer(raw.released, 0, raw.cursor) ||
      !integer(raw.copies, 0) || !integer(raw.scansUsed, 0, SHIFTS[raw.stage].scans) ||
      !Array.isArray(raw.records) || raw.records.length !== SHIFTS.length ||
      raw.records.some(r => r !== null && (!r || !integer(r.minute, 0) || !integer(r.correct, 0) ||
        !integer(r.errors, 0) || !integer(r.released, 0) || !integer(r.delivered, 0) || !integer(r.scansUsed, 0) || !integer(r.copies, 0))) ||
      !Array.isArray(raw.log) || raw.log.length !== raw.cursor ||
      raw.log.some(r => !r || !integer(r.caseIndex, 0, SHIFTS[raw.stage].cases.length - 1) ||
        typeof r.name !== 'string' || !['release', 'hold'].includes(r.verdict) ||
        !Object.hasOwn(REASONS, r.reason) || typeof r.right !== 'boolean' || !Array.isArray(r.actual) ||
        r.actual.some(reason => !Object.hasOwn(REASONS, reason) || reason === 'none') || !integer(r.at, 1, SHIFTS[raw.stage].limit)) ||
      typeof raw.message !== 'string' ||
      new Set(raw.log.map(r => r.caseIndex)).size !== raw.log.length ||
      raw.log.some(r => SHIFTS[raw.stage].cases[r.caseIndex].name !== r.name) ||
      (raw.selectedIndex !== null && !availableCases(raw).some(item => item.index === raw.selectedIndex)) ||
      (raw.selectedIndex === null && (raw.evidence !== null || raw.revealed))) return null;
  const s = copy(raw), legacyEvidence = !Object.hasOwn(raw, 'evidence');
  if (legacyEvidence) s.evidence = null;
  if (s.phase === 'active') { s.phase = 'paused'; s.resumePhase = 'active'; s.message = '刷新后先暂停；船单、时间、查验次数与记录均已保留。'; }
  if (legacyEvidence && ['active', 'paused'].includes(s.phase)) s.message += ' 旧档未保存本船证据，请重新选择后再签发。';
  return s;
}
