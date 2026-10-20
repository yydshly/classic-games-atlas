# 回声走廊 v2：关段与结算刷新连续性

2026-10-20。本轮只补持久连续性，基线 `c48e128695c811bbfdbc84afa8b5c82d97e0a73d`；原控制器 blob `a2add39f6ff76f5db4497e015baa46a6df42b6c5`。现有缺口，不称为新回归。

[试玩](../../versions/v2/games/echo/) · [原图页](./) · [旧公开QA](../echo-v2-qa/PUBLIC_BROWSER_QA.md) · [保全记录](preservation.json)

## 修复前正常 UI 复现

公开旧页正常按键移动、射击、取钥匙、开门、撤离，100光息/9光匣，消耗5匣、平息1名守卫，剩111秒。等结算稳定再刷新，原会话键为空，返回第一段120秒/8匣初态。[原报告](before/report.json)与两张原图保留。已知地图指导路线，不称盲玩；没有注入状态、存档或资源。

## 最小兼容策略

新模块 `progress.mjs` 使用独立 `echo-v2-progress-r2` 键，记录版本1信封；不改引擎checkpoint/restore：

| kind | 保存 | 恢复 |
|---|---|---|
| ready | 当前level | 本段准备态 |
| active | level + 原version2 checkpoint | 原重放恢复，先暂停，清旧按键 |
| result | level + 校验后的终态摘要 | 独立只读结算视图；不向引擎塞终态，不伪造终点战场 |

摘要只含state、ticks、hp、ammo、weapon、keyCount、spent、kills、reason。关段、范围、字段和终态条件严格校验。恢复结算后场地/地图不重放，界面明确写“已恢复本段结算摘要”；HUD、结果、下一段/本段重试保留。继续后才新建下一仓段，重试只新建当前仓段。三段仍自由选关，没有成长、解锁或第四段。

优先读取新记录；新键不存在才读取旧 `echo-v2-session-r1` 活动会话。迁移只写新键，旧原始字符串不改写、不删除。任一正在读取的坏档/读取异常会保护原记录、停止覆盖；普通写失败可继续玩并明确警告刷新或关闭可能丢失当前进度，保留上次有效原文，后续定期成功写入会清除失败状态。提示仅变化时更新，不逐帧刷警告。

## 本地实际验证

- [15组记录层及真实控制器DOM桩检查](controller-report.json)：三段准备记录、活动重放、严格坏档校验、旧键保全迁移、优先级、读取/写入错误恢复、暂停清键、结算继续和本段重试。终态单元/控制器用明确夹具，不算自然胜利。
- [真实浏览器报告](local/report.json)中3组normalUI：正常首段撤离（ticks 548、100光息/9匣、消耗5匣、平息1守卫），刷新保留摘要、HUD与下一仓段；正常进入第二段、重试准备后刷新仍第二段；活动局按键移动后暂停并在按键未抬起时刷新，恢复先暂停，再继续不复活旧键；第二段自然战斗失败（ticks 823、0光息）后刷新仍第二段失败，本段重试保持第二段。
- 4组fixtures单列：明确注入QuotaExceededError并恢复原生写入方法；从上述真实UI的活动checkpoint构造旧格式迁移夹具，旧raw精确保留；坏新记录与有效旧记录共存夹具，两者都保全；第三段won摘要夹具验证无第四段、重试留第三段。第三段没有自然通关。
- [活动存档离线核对](checkpoint-audit.json)与[脚本](audit_active.mjs)只重放浏览器已捕获的日志核对位置/旧键，不算新增UI实玩。
- Chromium桌面1440×1050与390×844提示可见性；390无横向溢出。人工查看首段刷新摘要、窄屏失败提示。控制台/页面错误0、HTTP400+0、requestfailed0。

上述after原图和报告来自localhost候选，before来自公开旧站。部署后用同一脚本复验公开页面，最终线上SHA和回执随交付报告提供，不提前把本地预览称为上线。没有全三段通关、第三段自然结算、真机触屏、真实设备配额耗尽/权限设置、长期保存、声音或审美验收；本版原本没有声音。

```powershell
node scripts/test-echo-controller.mjs
python scripts/test_echo_continuity_browser.py --url https://yydshly.github.io/classic-games-atlas/versions/v2/games/echo/ --out .local/echo-public
node docs/echo-continuity-qa/audit_active.mjs
```

不新增依赖、账号、费用或运行时模型调用。引擎、三段内容、自由选关、v1、素材与其它游戏保持不变。
