"""Generate a bounded delivery index from explicit evidence rows, without dependencies."""
import json
from html import escape
from pathlib import Path

P = Path(__file__).resolve().parent
D = json.loads((P / 'coverage.json').read_text(encoding='utf-8'))
E = D['items']
assert len(E) == 40 and len({e['slug'] for e in E}) == 40
LABEL = {'verified': '已验有限流程', 'partial': '仅局部',
         'not_evidenced': '缺普通UI证据', 'not_applicable': '设计不适用'}
active = [e for e in E if e['acceptance'] not in ['paused', 'frozen_scope']]
core_gaps = [e['slug'] for e in active if e['coverage']['coreGoal'] != 'verified']
fail_gaps = [e['slug'] for e in active if e['coverage']['failureRetry'] not in ['verified', 'not_applicable']]
summary = {'catalog': 40, 'activeScope': len(active), 'paused': 3, 'frozen': 1,
           'activeWithFirstCoreEvidence': len(active) - len(core_gaps),
           'coreGaps': core_gaps, 'failureRetryGaps': fail_gaps}
if D.get('independentSuccessSummary'):summary['independentSuccessSummary']=D['independentSuccessSummary']
if D.get('laterStageTargets'):
    summary['laterStageTargets'] = D['laterStageTargets']
if D.get('globalLaterStageSummary'):
    summary['globalLaterStageSummary'] = D['globalLaterStageSummary']
(P / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
intro = (f"40项总目录；本轮活动范围{len(active)}项，35/36/37暂停、纸翼保留既有阶段。"
         f"活动项中{summary['activeWithFirstCoreEvidence']}项有至少一条核心目标证据；"
         "这不是全部关卡或成品通过率。")
boundary = ('“已验”只指附证据中的有限流程；缺证据不等于有bug。推荐版本是当前优先检查的候选入口，'
            '全部仍未完成整体品质验收。历史报告的提交、操作辅助及未验范围保持原样，'
            '不声称今天重跑了40款；旧v1、模型、DOM桩、故障注入及离屏图不移作当前UI成绩。')

def link(path, label):
    return '<a href="../../' + escape(path, quote=True) + '">' + escape(label) + '</a>'

doc = '''<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>40项关键流程覆盖与交付差距</title><link rel="icon" href="../../assets/favicon.svg"><style>
:root{font-family:system-ui,sans-serif;color:#1d373d;background:#f0f2e9}
body{max-width:1500px;margin:30px auto;padding:0 18px;line-height:1.7}
a{color:#155f71;text-underline-offset:3px}h1{font-size:clamp(24px,4vw,38px)}
.note{background:#fff8d7;border-left:4px solid #ad8134;padding:14px}
.toolbar{display:flex;gap:15px;flex-wrap:wrap;margin:22px 0}input{font:inherit;padding:10px;max-width:100%}
.table-wrap{overflow-x:auto;border:1px solid #b7c8c1;background:#fff}
table{border-collapse:collapse;width:100%;min-width:1050px;font-size:14px}
th,td{border-bottom:1px solid #dce3de;padding:12px;vertical-align:top;text-align:left}
thead{background:#dce7df}td:first-child{min-width:155px}td:nth-child(n+3){min-width:205px}
.state{display:block;font-size:12px;font-weight:700}.partial,.not_evidenced{color:#96600a}
.verified{color:#19624f}small{display:block;color:#52676b}.stopped{background:#f6eeeb}
li{margin:8px 0}[hidden]{display:none!important}:focus-visible{outline:3px solid #ad8134;outline-offset:3px}
</style></head><body><p><a href="../../">返回游戏图鉴</a> ·
<a href="coverage.json">结构化40行数据</a> · <a href="README.md">文字索引</a> ·
<a href="source-manifest.json">来源对象清单</a></p><h1>关键流程覆盖与剩余交付清单</h1>'''
doc += '<p>' + escape(intro) + '</p><p class="note">' + escape(boundary) + '</p>'
if D.get('globalLaterStageSummary'):
    doc += '<p class="note">全局仍缺后续成功/合法完赛证据：' + str(D['globalLaterStageSummary']['laterUnitsMissingWorks']) + '款、' + str(D['globalLaterStageSummary']['laterUnitsMissingCount']) + '个关段/赛场。<a href="later-stage-inventory.html">逐款全局清单与独立分支</a></p>'
if D.get('referenceExperienceNote'):
    doc += '<p><a href="' + escape(D['referenceExperienceNote'],quote=True) + '">此前五款：经典来源、已实现核心与产品差距</a></p>'
doc += '<h2>本轮有限流程</h2><p>' + escape(D.get('roundSummary', '普通UI、模型及辅助限制在各自证据中分列。')) + '</p>'
if D.get('roundEvidenceNotes'):
    doc += '<p><a href="' + escape(D['roundEvidenceNotes'], quote=True) + '">本轮截图时序与执行恢复说明</a></p>'
if D.get('firstLoadReview'):
    doc += '<p><a href="' + escape(D['firstLoadReview']['evidence'], quote=True) + '">首次加载：正常样本、故障注入与两项首页修复</a>（局部技术证据，非全站或真机性能验收）</p>'

if D.get('interruptionReview'):
    doc += '<p><a href="' + escape(D['interruptionReview']['evidence'], quote=True) + '">三款实时游戏：失焦、后台与返回</a>（15次原生切换，无运行代码改动，非真机验收）</p>'

if D.get('fortressFeedbackReview'):
    doc += '<p><a href="' + escape(D['fortressFeedbackReview']['evidence'], quote=True) + '">堡垒v2：基地受击反馈前后对比</a>（一项可见改进，战斗规则不改）</p>'

if D.get('featherCapFeedbackReview'):
    doc += '<p><a href="' + escape(D['featherCapFeedbackReview']['evidence'], quote=True) + '">星羽v3：安心封顶按实际增量反馈</a>（普通UI确认，显示修复与本轮收束）</p>'

if D.get('featherRecentFeedbackReview'):
    doc += '<p><a href="' + escape(D['featherRecentFeedbackReview']['evidence'], quote=True) + '">星羽v3：只读最近三拍与实际守息反馈</a>（最多三条，规则和存档不变）</p>'

if D.get('featherSummaryReview'):
    doc += '<p><a href="' + escape(D['featherSummaryReview']['evidence'], quote=True) + '">星羽v3：回营后只读重读通关总结</a>（实际通关确认，后续队伍/旅行不改历史）</p>'

if D.get('featherTeamReview'):
    doc += '<p><a href="' + escape(D['featherTeamReview']['evidence'], quote=True) + '">星羽v3：营地选队前比较技能</a>（固定基础作用，原编队/规则不变）</p>'

if D.get('featherObjectiveReview'):
    doc += '<p><a href="' + escape(D['featherObjectiveReview']['evidence'], quote=True) + '">星羽v3：旅途中当前目标连续性</a>（目标显示单项改进，原任务/存档不变）</p>'

if D.get('featherSkillFeedbackReview'):
    doc += '<p><a href="' + escape(D['featherSkillFeedbackReview']['evidence'], quote=True) + '">星羽v3：当前技能效果、能量与不可用原因</a>（单项反馈改进，三条有证据等级的后续候选）</p>'

if D.get('coasterFeedbackReview'):
    doc += '<p><a href="' + escape(D['coasterFeedbackReview']['evidence'], quote=True) + '">云岬v2：诊断直达对应修改面板</a>（一项定位改进，两尺寸有限失败→修正→营业链）</p>'
if D.get('pinfallFocusReview'):
    doc += '<p><a href="' + escape(D['pinfallFocusReview']['evidence'], quote=True) + '">弹庭v2：查看失利后的可见重试焦点</a>（修复上轮窄屏候选，规则不改）</p>'
if D.get('resultReturnAudit'):
    doc += '<p><a href="' + escape(D['resultReturnAudit']['evidence'], quote=True) + '">结果关闭路径有限同类排查</a>（无运行改动，另记弹庭窄屏焦点候选）</p>'
if D.get('postResultReview'):
    doc += '<p><a href="' + escape(D['postResultReview']['evidence'], quote=True) + '">邮差v2：查看赛场后返回结算</a>（键盘入口与焦点，不重复结算/保存）</p>'
if D.get('postFeedbackReview'):
    doc += '<p><a href="' + escape(D['postFeedbackReview']['evidence'], quote=True) + '">邮差v2：下一合法闸门地图反馈前后对比</a>（一项只读标记，不改驾驶与过闸规则）</p>'
if D.get('brookFeedbackReview'):
    doc += '<p><a href="' + escape(D['brookFeedbackReview']['evidence'], quote=True) + '">溪谷v2：左岸行号提醒前后对比</a>（一项只读提示，非真人注意力验收）</p>'

doc += '''<div class="toolbar"><label for="filter">筛选编号、名称、版本或待验词
<input id="filter" type="search" placeholder="例如：失败、maze、40"></label>
<span id="count" aria-live="polite">40 / 40 项</span></div>
<div class="table-wrap" tabindex="0" aria-label="横向滚动关键流程覆盖表"><table><caption>当前候选版本与有限关键流程证据</caption>
<thead><tr><th scope="col">作品 / 推荐版本</th><th scope="col">启动</th>
<th scope="col">核心目标</th><th scope="col">失败与重试</th><th scope="col">终局 / 衔接及证据</th>
</tr></thead><tbody>'''
md = '# 40项关键流程覆盖与剩余交付清单\n\n' + intro + '\n\n' + boundary + '\n\n'
md += '[可筛选网页](index.html) · [结构化数据](coverage.json) · [来源Git对象清单](source-manifest.json)\n\n'
if D.get('roundEvidenceNotes'):
    md += '[本轮截图时序与执行恢复说明](' + D['roundEvidenceNotes'] + ')\n\n'
if D.get('globalLaterStageSummary'):
    md += '[全局后续关段清单](later-stage-inventory.html) · [清单数据](later-stage-inventory.json)；仍缺' + str(D['globalLaterStageSummary']['laterUnitsMissingWorks']) + '款' + str(D['globalLaterStageSummary']['laterUnitsMissingCount']) + '个后续关段/赛场的成功或合法完赛证据，独立分支另列。\n\n'
if D.get('referenceExperienceNote'):
    md += '[此前五款参考与体验差距](' + D['referenceExperienceNote'] + ')\n\n'
if D.get('firstLoadReview'):
    md += '[首次加载可靠性与两项首页修复](' + D['firstLoadReview']['evidence'] + ')；局部技术证据，非全站或真机性能验收。\n\n'
if D.get('interruptionReview'):
    md += '[三款中断恢复普通UI证据](' + D['interruptionReview']['evidence'] + ')；15次原生切换，无运行代码改动，非真机验收。\n\n'
if D.get('fortressFeedbackReview'):
    md += '[堡垒基地受击反馈前后实图](' + D['fortressFeedbackReview']['evidence'] + ')；一项可见改进，战斗规则不改。\n\n'
if D.get('featherCapFeedbackReview'):
    md += '[星羽安心封顶实际增量](' + D['featherCapFeedbackReview']['evidence'] + ')：普通UI确认，显示修复与本轮收束。\n\n'

if D.get('featherRecentFeedbackReview'):
    md += '[星羽最近三拍与实际守息反馈](' + D['featherRecentFeedbackReview']['evidence'] + ')；仅三条状态对照，原生profile短流程与模型边界分列。\n\n'

if D.get('featherSummaryReview'):
    md += '[星羽回营后只读重读通关总结](' + D['featherSummaryReview']['evidence'] + ')；真实完成会话、原生profile复用，历史事实不随新旅程改变。\n\n'

if D.get('featherTeamReview'):
    md += '[星羽营地选队前比较技能](' + D['featherTeamReview']['evidence'] + ')；基础作用与战斗预览分开，保留原生键盘与编队顺序。\n\n'

if D.get('featherObjectiveReview'):
    md += '[星羽旅途中当前目标连续性](' + D['featherObjectiveReview']['evidence'] + ')；仅目标显示，普通UI与已完成模型fixture分列。\n\n'

if D.get('featherSkillFeedbackReview'):
    md += '[星羽当前技能效果、能量与不可用原因](' + D['featherSkillFeedbackReview']['evidence'] + ')；一项反馈改进，三条后续品质候选已标证据等级。\n\n'

if D.get('coasterFeedbackReview'):
    md += '[云岬诊断直达对应修改面板](' + D['coasterFeedbackReview']['evidence'] + ')；一项定位改进，两尺寸有限失败→修正→营业链。\n\n'
if D.get('pinfallFocusReview'):
    md += '[弹庭查看失利后的可见重试焦点](' + D['pinfallFocusReview']['evidence'] + ')；修复上轮窄屏候选，规则不改。\n\n'
if D.get('resultReturnAudit'):
    md += '[结果关闭路径有限同类排查](' + D['resultReturnAudit']['evidence'] + ')；无运行改动，另记弹庭窄屏焦点候选。\n\n'
if D.get('postResultReview'):
    md += '[邮差查看赛场后返回结算](' + D['postResultReview']['evidence'] + ')；键盘入口与焦点，不重复结算/保存。\n\n'
if D.get('postFeedbackReview'):
    md += '[邮差下一合法闸门地图反馈前后实图](' + D['postFeedbackReview']['evidence'] + ')；一项只读标记，不改驾驶与过闸规则。\n\n'
if D.get('brookFeedbackReview'):
    md += '[溪谷左岸行号提醒前后实图](' + D['brookFeedbackReview']['evidence'] + ')；一项只读提示，非真人注意力验收。\n\n'
md += '|编号/作品及推荐版本|启动|核心目标|失败/重试|终局/下一关与证据|\n|---|---|---|---|---|\n'
for e in E:
    c = e['coverage']
    paused = e['acceptance'] == 'paused'
    name = e['number'] + ' ' + e['title']
    suffix = (' 暂停回看' if paused else ' 阶段保留' if e['acceptance'] == 'frozen_scope'
              else ' 候选' if e['recommendedVersion'] != 'v1' else ' 既有原型')
    version = e['recommendedVersion'] + suffix
    evidence = ' · '.join(link(p, '证据' + str(i + 1)) for i, p in enumerate(e['evidence']))
    doc += '<tr id="' + escape(e['slug']) + '"' + (' class="stopped"' if paused else '') + '>'
    doc += '<td><b>' + escape(name) + '</b>' + link(e['playUrl'], version) + '<small>' + escape(e['slug']) + '</small></td>'
    doc += '<td><span class="state ' + c['startup'] + '">' + LABEL[c['startup']] + '</span></td>'
    for key, text in [('coreGoal', e['observedCore']), ('failureRetry', e['observedRetry']), ('endingNext', e['endingBoundary'])]:
        doc += '<td><span class="state ' + c[key] + '">' + LABEL[c[key]] + '</span>' + escape(text)
        doc += ('<small>' + evidence + '</small>') if key == 'endingNext' else ''
        doc += '</td>'
    doc += '</tr>'
    ev = ' / '.join('[' + str(i + 1) + '](../../' + p + ')' for i, p in enumerate(e['evidence']))
    md += ('|' + name + ' [' + version + '](../../' + e['playUrl'] + ')|' + LABEL[c['startup']]
           + '|' + LABEL[c['coreGoal']] + '：' + e['observedCore']
           + '|' + LABEL[c['failureRetry']] + '：' + e['observedRetry']
           + '|' + LABEL[c['endingNext']] + '：' + e['endingBoundary'] + ' ' + ev + '|\n')
doc += '</tbody></table></div><p id="empty" hidden>没有匹配项。清除筛选可查看40项。</p>'
remaining = [
    ('首条核心目标证据', ('、'.join(core_gaps) + '仍缺首条完整目标证据。失败或工具延迟不证明不可通关，不据此调难度。') if core_gaps else '活动范围36项均已有至少一条核心目标证据。它只统计有限首条，包含明确标注的强辅助操作，不代表全部关卡、无辅助水平或成品验收。'),
    ('分支及后续内容', (f'尚有{len(fail_gaps)}项失败/重试链仅局部或未验：' + '、'.join(fail_gaps) + '。上表保留具体范围。') if fail_gaps else '此前原列8项代表性失败/重试链均已逐项补证。每款仅验证记录所列路径，不代表全部失败原因或后段。') ,
    ('保留的覆盖边界', D.get('independentBranchNote','全局后续及独立胜利范围见逐款清单，缺证据不是bug。')),
    ('必须真人确认', '连续操作手感、读图与策略是否自然、难度与耐玩性、审美/情绪价值。有音频实现的作品需真实听感与音画同步；无音频作品不因此判缺陷。真实手机触控、多指和设备差异须真机验证，桌面400CSS或脚本事件不能替代。'),
    ('已知非阻断表现', '原报告中的残留提示、字号/滚动、未验动画等保留。果园前后端点/转角样式不同、Trail失败0命但体力显示72、Post终局下一闸提示仍在均如实记录，不借此重开零碎美术/存档专项。'),
    ('暂停边界', '35/36/37不继续执行；纸翼不重启。保留在40项中，不能为提高通过数移除，也不计入本轮活动测试债。'),
]
doc += '<h2>距本阶段可交付还差什么</h2><ul>'
md += '\n## 有界剩余清单\n\n'
for title, text in remaining:
    doc += '<li><b>' + escape(title) + '：</b>' + escape(text) + '</li>'
    md += '- **' + title + '：**' + text + '\n'
doc += '</ul><h2>判读与维护</h2>'
rule = ('启动、核心目标、失败/重试、终局/下一关分别记录。无失败条件标设计不适用。'
        '本阶段最低工具门槛：至少一条可完成主流程；有设计时的失败重试；结算/衔接及保存符合说明。'
        '达到工具门槛仍须真人验收，不是全关卡或40款成品交付，也不承诺穷尽所有组合。')
maintenance = ('编辑coverage.json后运行python build_index.py，追加新证据与精确范围，不覆盖旧报告或失败结果。'
               '基线与本轮证据提交见结构化数据。运行代码、旧版、目录及用户存档均保留。')
doc += '<p>' + escape(rule) + '</p><p>' + escape(maintenance) + '</p>'
doc += '''<script>const f=document.querySelector('#filter'),rows=[...document.querySelectorAll('tbody tr')];
f.addEventListener('input',()=>{const q=f.value.trim().toLowerCase();let n=0;for(const r of rows){
r.hidden=!r.textContent.toLowerCase().includes(q);if(!r.hidden)n++;}
document.querySelector('#count').textContent=n+' / 40 项';document.querySelector('#empty').hidden=n!==0;});
</script></body></html>'''
md += '\n' + rule + '\n\n' + maintenance + '\n'
(P / 'index.html').write_text(doc + '\n', encoding='utf-8')
(P / 'README.md').write_text(md, encoding='utf-8')
print(json.dumps(summary, ensure_ascii=False))
