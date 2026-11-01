// 雾港查单：原创航务货单推理。固定案例，所有处罚规则在当班规则板上公开。
export const SAVE_KEY = 'classic-games-atlas:fog-harbor-ledger:v1';
export const REASONS = {
  none: '无矛盾', expiry: '航证过期', route: '航路关闭', seal: '封签不符',
  cargo: '特货缺蓝签', weight: '超过登记载重',
};
const item = (name, route, cargo, until, shownSeal, actualSeal, registeredSeal, weight = 2, capacity = 3, blue = false) => ({
  name, route, cargo, until, shownSeal, actualSeal, registeredSeal, weight, capacity, blue,
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
];
const copy = value => JSON.parse(JSON.stringify(value));
const integer = (value, min, max = Infinity) => Number.isInteger(value) && value >= min && value <= max;
function fresh(stage, unlocked = stage, records = [null, null, null]) {
  return { version: 1, stage, unlocked, records: copy(records), phase: 'ready', resumePhase: null,
    minute: 0, scans: SHIFTS[stage].scans, cursor: 0, revealed: false, evidence: null, correct: 0, errors: 0,
    released: 0, copies: 0, scansUsed: 0, log: [],
    message: '先阅读当班规则；核对船单与港务底册，再决定放行或暂扣。' };
}
export const createGame = () => fresh(0, 0);
export const currentCase = s => SHIFTS[s.stage].cases[s.cursor] ?? null;
export function reasonsFor(s, entry = currentCase(s)) {
  if (!entry) return [];
  const rules = SHIFTS[s.stage], reasons = [];
  if (entry.until < rules.day) reasons.push('expiry');
  if (entry.route === '北礁' || entry.route === '东汐' && rules.closeAt !== null && s.minute >= rules.closeAt) reasons.push('route');
  if (entry.actualSeal !== entry.registeredSeal) reasons.push('seal');
  if (rules.day >= 2 && entry.cargo === '光石' && !entry.blue) reasons.push('cargo');
  if (rules.day >= 3 && entry.weight > entry.capacity) reasons.push('weight');
  return reasons;
}
function finish(s) {
  const rules = SHIFTS[s.stage];
  if (s.errors <= rules.maxErrors && s.cursor === rules.cases.length && s.correct >= rules.quota && s.minute <= rules.limit) {
    s.phase = 'won'; s.unlocked = Math.max(s.unlocked, Math.min(2, s.stage + 1));
    const record = { minute: s.minute, correct: s.correct, errors: s.errors, released: s.released, scansUsed: s.scansUsed, copies: s.copies };
    if (!s.records[s.stage] || record.correct > s.records[s.stage].correct ||
      record.correct === s.records[s.stage].correct && record.minute < s.records[s.stage].minute) s.records[s.stage] = record;
    s.message = `${rules.name}完成：核对 ${s.cursor} 艘，正确 ${s.correct} 艘，误判 ${s.errors} 艘；放行 ${s.released} 艘。`;
  } else if (s.errors > rules.maxErrors || s.minute >= rules.limit || s.cursor === rules.cases.length) {
    s.phase = 'lost'; s.message = `${rules.name}未达标：正确 ${s.correct}/${rules.quota}、误判 ${s.errors}/${rules.maxErrors}、用时 ${s.minute}/${rules.limit}。可重试本班。`;
  }
}
export function start(s) {
  if (s.phase !== 'ready') return false;
  s.phase = 'active'; s.message = '第一份船单已上台。规则和港务底册可随时查看；判定每艘船耗时 1 分钟。'; return true;
}
export function chooseEvidence(s, reason) {
  if (s.phase !== 'active' || !Object.hasOwn(REASONS, reason) ||
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
  const entry = currentCase(s), rules = SHIFTS[s.stage];
  if (!entry || s.minute >= rules.limit) return false;
  const actual = reasonsFor(s, entry), right = verdict === 'release' ? actual.length === 0 : actual.includes(reason);
  s.minute++; s.cursor++; s.revealed = false; s.evidence = null;
  if (right) s.correct++; else s.errors++;
  if (verdict === 'release') s.released++;
  s.log.push({ name: entry.name, verdict, reason, right, actual: [...actual], at: s.minute });
  s.message = `${entry.name}${right ? '判定正确' : '判定有误'}；${actual.length ? `实际应暂扣：${actual.map(r => REASONS[r]).join('、')}` : '实际可放行'}。本单耗时 1 分钟。`;
  finish(s); return true;
}
export function pause(s) { if (s.phase !== 'active') return false; s.phase = 'paused'; s.resumePhase = 'active'; s.message = '已暂停；当前船单、查验资源和已核记录保持。'; return true; }
export function resume(s) { if (s.phase !== 'paused') return false; s.phase = 'active'; s.resumePhase = null; s.message = '继续核单。'; return true; }
export function restart(s) { Object.assign(s, fresh(s.stage, s.unlocked, s.records)); return true; }
export function selectShift(s, stage) {
  if (!integer(stage, 0, 2) || stage > s.unlocked || !['ready', 'won', 'lost'].includes(s.phase)) return false;
  Object.assign(s, fresh(stage, s.unlocked, s.records)); return true;
}
export function nextShift(s) { if (s.phase !== 'won' || s.stage >= 2) return false; return selectShift(s, s.stage + 1); }
export const checkpoint = s => copy(s);
export function restore(raw) {
  if (!raw || raw.version !== 1 || !integer(raw.stage, 0, 2) || !integer(raw.unlocked, raw.stage, 2) ||
      !['ready', 'active', 'paused', 'won', 'lost'].includes(raw.phase) ||
      !integer(raw.minute, 0, SHIFTS[raw.stage].limit) || !integer(raw.cursor, 0, SHIFTS[raw.stage].cases.length) ||
      !integer(raw.scans, 0, SHIFTS[raw.stage].scans) || typeof raw.revealed !== 'boolean' ||
      (Object.hasOwn(raw, 'evidence') && raw.evidence !== null && !Object.hasOwn(REASONS, raw.evidence)) ||
      !integer(raw.correct, 0, raw.cursor) || !integer(raw.errors, 0, raw.cursor) ||
      raw.correct + raw.errors !== raw.cursor || !integer(raw.released, 0, raw.cursor) ||
      !integer(raw.copies, 0) || !integer(raw.scansUsed, 0, SHIFTS[raw.stage].scans) ||
      !Array.isArray(raw.records) || raw.records.length !== 3 ||
      raw.records.some(r => r !== null && (!r || !integer(r.minute, 0) || !integer(r.correct, 0) ||
        !integer(r.errors, 0) || !integer(r.released, 0) || !integer(r.scansUsed, 0) || !integer(r.copies, 0))) ||
      !Array.isArray(raw.log) || raw.log.length !== raw.cursor ||
      raw.log.some(r => !r || typeof r.name !== 'string' || !['release', 'hold'].includes(r.verdict) ||
        !Object.hasOwn(REASONS, r.reason) || typeof r.right !== 'boolean' || !Array.isArray(r.actual) ||
        r.actual.some(reason => !Object.hasOwn(REASONS, reason) || reason === 'none') || !integer(r.at, 1, SHIFTS[raw.stage].limit)) ||
      typeof raw.message !== 'string') return null;
  const s = copy(raw), legacyEvidence = !Object.hasOwn(raw, 'evidence');
  if (legacyEvidence) s.evidence = null;
  if (s.phase === 'active') { s.phase = 'paused'; s.resumePhase = 'active'; s.message = '刷新后先暂停；船单、时间、查验次数与记录均已保留。'; }
  if (legacyEvidence && ['active', 'paused'].includes(s.phase)) s.message += ' 旧档未保存本船证据，请重新选择后再签发。';
  return s;
}
