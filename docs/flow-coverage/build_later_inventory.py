import json
from pathlib import Path
from html import escape
P=Path(__file__).resolve().parent;D=json.loads((P/'coverage.json').read_text(encoding='utf-8'));E=D['items']
# Evidence inventory, not a gameplay test or a claim that every variant won.
scopes={
'fortress':(2,'第二短图双车胜；第一短图单车自然基地败',[],['首图单车成功未见证据；不是后续解锁链']),
'maze':(2,'第一图自然胜利',[2],[]),
'starline':(2,'两图清场',[],[]),
'prism':(12,'正常连续1–12胜利及末关终局',[],[]),
'crate':(3,'三题正常完成与推进',[],[]),
'pass':(1,'一短图缚索四波胜；重弩失败保留',[],['其它塔组合未穷尽，非后续关段']),
'trail':(3,'三程正常连续胜利及第三程结局',[],[]),
'lantern':(2,'首图41/41胜；第二图38/46失败',[2],[]),
'cloud':(2,'首图胜；第二图自然败',[2],[]),
'garden':(2,'两题正常完成',[],[]),
'vine':(2,'两图收齐后归门胜',[],[]),
'petal':(20,'原生提示辅助连续1–20完成',[],[]),
'sand':(2,'浅深两档提示辅助解完安全格',[],['不证明全部种子']),
'pinfall':(2,'两庭普通参考角度胜',[],[]),
'gale':(2,'两段清装置并实际归出口；同引擎历史通关',[],['后续控制器修补只复核生命周期，不冒称新跑两段']),
'post':(3,'单赛道三场；仅第一场合法第三名完赛并解锁第二场',[2,3],['第一场第一名未见证据；完赛即可推进，不把第三名当胜利']),
'beacon':(1,'21天全航程归港结局',[],[]),
'chime':(3,'第一题成功；第二第三题已有失败尝试',[2,3],[]),
'brook':(2,'两场各有自然胜利；非同一新档连续双场',[],[]),
'tide':(2,'首图原生滑杆与暂停规划强辅助胜',[2],['原鼠标瞄准路径受工具延迟混杂，未以此改难度']),
'paper':(None,'阶段保留，不重启路线',[],[]),
'harbor':(3,'三关实际回合目标完成，第三关最终反馈',[],[]),
'farm':(3,'三章携带资源推进至11天结局',[],[]),
'ruins':(3,'三室机关/钥匙/敌人与最终归门E',[],[]),
'orchard':(2,'两场各60活动秒自然结束；无分数胜门槛',[],['误核短分支不影响已覆盖主流程']),
'courier':(2,'两段跑完并正确转弯',[],[]),
'venture':(3,'8/10/12轮三场均自然终局，两胜一负；修后只定向回归交易',[],['灯会获胜未见证据；已有自然失败结局不记为通关；修前整局与修后专项分列']),
'island':(3,'双路线均跨三章完成；非新增第二地区',[],[]),
'orbit':(1,'180秒自然终局与重新开始；不是分关卡作品',[],[]),
'duel':(8,'首庭正常命中与胜利，第二庭解锁',[2,3,4,5,6,7,8],[]),
'expedition':(3,'三段分别正常胜利120/140/160秒',[],[]),
'feather':(1,'v3浅滩短冒险终挑战结局及自由出行',[],['v2承接与新旅途另列，不要求扩第二地区']),
'echo':(3,'首段既有成功；本轮自由选第二段后正常推进第三段均撤离',[],['强暂停与只读原生记录重放辅助，非同一新档连续三段']),
'escort':(3,'三街实际护送成功及最后街区终局',[],[]),
'court':(None,'用户暂停路线',[],[]),'repair':(None,'用户暂停路线',[],[]),'civic':(None,'用户暂停路线',[],[]),
'coaster':(8,'正常按钮连续八园试车/有限载客达标与最终反馈',[],['离线合法方案搜索仅策略参考；真实班次另有浏览器记录']),
'kart':(8,'首赛道使用页面内可选转向辅助正常获胜',[2,3,4,5,6,7,8],['无辅助手动首胜未验，不能借此降低难度']),
'meadow':(8,'首场脚本辅助普通UI完整4:0胜',[2,3,4,5,6,7,8],[])}
assert set(scopes)=={e['slug']for e in E}
rows=[]
for e in E:
 total,covered,pending,branches=scopes[e['slug']];stopped=e['acceptance']in['paused','frozen_scope'];rows.append({'number':e['number'],'slug':e['slug'],'title':e['title'],'recommendedVersion':e['recommendedVersion'],'playUrl':e['playUrl'],'authoredFiniteUnits':total,'scopeDescription':covered,'pendingLaterUnits':pending,'otherEvidenceBoundaries':branches,'excludedFromActiveDebt':stopped,'status':'paused_or_frozen'if stopped else 'later_units_pending'if pending else 'no_listed_later_gap','evidence':e['evidence']})
pending=[e for e in rows if e['pendingLaterUnits']];assert len(pending)==9 and sum(len(e['pendingLaterUnits'])for e in pending)==29
summary={'catalog':40,'active':36,'laterUnitsMissingWorks':9,'laterUnitsMissingCount':29,'remainingLaterWorkSlugs':[e['slug']for e in pending],'noListedLaterGapIsNotAllVariantsWon':True,'separateSuccessBranches':['fortress:first-map single-player success','post:first-race first-place','venture:festival victory'],'humanBoundaries':['无辅助持续操作手感与读图','真实手机/多指/设备性能','已实现音频的听感与同步','审美、情绪价值和耐玩性']}
result={'schemaVersion':1,'reviewBaseline':'988562d8505c23e320779e6173b8d746c7086189','evidenceThrough':D['evidenceThrough'],'method':'Current recommended scopes and linked historical reports reviewed; no new gameplay test except the selected Trail/Echo/Coaster reports. Missing proof is not a defect. Historical engine/controller version boundaries remain. Paused/frozen items excluded, not deleted.','summary':summary,'items':rows}
(P/'later-stage-inventory.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
intro='40项保留，36项活动。本轮三款完成后，全局仍有9款、29个后续关段/赛场缺少正常UI成功或合法完赛证据。它们已有首目标和失败恢复证据，不代表后续不可完成，也不是本轮新增bug。独立胜利分支与真人验收另列。'
md='# 全局后续关段证据清单\n\n'+intro+'\n\n[覆盖索引](index.html) · [结构化清单](later-stage-inventory.json)\n\n|作品/当前范围|已有证据与具体边界|仍缺后续单元|\n|---|---|---|\n'
html='<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>全局后续关段证据清单</title><link rel="icon" href="../../assets/favicon.svg"><style>body{margin:24px auto;max-width:1350px;padding:0 16px;background:#f0f2e9;color:#1d373d;font:16px/1.7 system-ui}a{color:#155f71}.wrap{overflow:auto}table{border-collapse:collapse;min-width:850px;width:100%;background:white}td,th{padding:12px;border:1px solid #ced9d2;text-align:left;vertical-align:top}a:focus-visible,.wrap:focus-visible{outline:3px solid #ad8134;outline-offset:3px}</style><h1>全局后续关段证据清单</h1><p>'+escape(intro)+'</p><p><a href="index.html">覆盖索引</a> · <a href="later-stage-inventory.json">结构化清单</a> · <a href="later-stage-inventory.md">文字清单</a></p><div class="wrap" tabindex="0" aria-label="横向滚动全局后续关段清单"><table><thead><tr><th>作品 / 当前范围</th><th>已有证据与具体边界</th><th>仍缺后续单元</th></tr></thead><tbody>'
for e in rows:
 name=e['number']+' '+e['title']+' '+e['recommendedVersion']+((' · '+str(e['authoredFiniteUnits'])+'单元')if e['authoredFiniteUnits']else' · 停止/保留')
 missing='、'.join(map(str,e['pendingLaterUnits']))if e['pendingLaterUnits']else'停止/保留，不执行'if e['excludedFromActiveDebt']else'未列后续主链缺口（非全分支验收）';bounds=e['scopeDescription']+('；'+'；'.join(e['otherEvidenceBoundaries'])if e['otherEvidenceBoundaries']else'');links=' · '.join('<a href="../../'+escape(p)+'">证据'+str(i+1)+'</a>'for i,p in enumerate(e['evidence']));html+='<tr id="'+e['slug']+'"><td><a href="../../'+e['playUrl']+'">'+escape(name)+'</a></td><td>'+escape(bounds)+'<br>'+links+'</td><td>'+escape(missing)+'</td></tr>';md+='|'+name+'|'+bounds+' '+ ' / '.join('['+str(i+1)+'](../../'+p+')'for i,p in enumerate(e['evidence']))+'|'+missing+'|\n'
ending='此外：堡垒首图单车成功、邮差首场第一名、商旅灯会获胜仍无证据；它们不混入29个后续单元重复计数。Kart首场手动无辅助获胜也是操作分支，不是额外一关。真人持续手感、真手机/多指/性能、音频听感及审美仍需真人。此清单是文档覆盖审阅，不声称本轮重跑40项；Gale同引擎历史通关与Venture修前整局/修后交易专项的边界保留。'
html+='</tbody></table></div><p>'+escape(ending)+'</p><p>下一项建议：风铃绳旅第2–3题，两题有限主目标；保留失败尝试，不因工具时机困难调整规则。</p>'
md+='\n'+ending+'\n\n下一项建议：风铃绳旅第2–3题，两题有限主目标，先复用已有真实失败与说明制定普通输入策略。\n'
(P/'later-stage-inventory.html').write_text(html+'\n',encoding='utf-8');(P/'later-stage-inventory.md').write_text(md,encoding='utf-8');print(json.dumps(summary,ensure_ascii=False))
