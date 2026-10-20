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
doc += '<h2>本轮有限流程</h2><p>' + escape(D.get('roundSummary', '普通UI、模型及辅助限制在各自证据中分列。')) + '</p>'
doc += '''<div class="toolbar"><label for="filter">筛选编号、名称、版本或待验词
<input id="filter" type="search" placeholder="例如：失败、maze、40"></label>
<span id="count" aria-live="polite">40 / 40 项</span></div>
<div class="table-wrap" tabindex="0" aria-label="横向滚动关键流程覆盖表"><table><caption>当前候选版本与有限关键流程证据</caption>
<thead><tr><th scope="col">作品 / 推荐版本</th><th scope="col">启动</th>
<th scope="col">核心目标</th><th scope="col">失败与重试</th><th scope="col">终局 / 衔接及证据</th>
</tr></thead><tbody>'''
md = '# 40项关键流程覆盖与剩余交付清单\n\n' + intro + '\n\n' + boundary + '\n\n'
md += '[可筛选网页](index.html) · [结构化数据](coverage.json) · [来源Git对象清单](source-manifest.json)\n\n'
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
    ('分支及后续内容', f'尚有{len(fail_gaps)}项失败/重试链仅局部或未验：' + '、'.join(fail_gaps) + '。上表保留具体范围。Post第一名、Kart手动胜利及未测后段仍缺UI证据；先固定有界交付范围，再逐条关闭，不自动跑全部组合。'),
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
