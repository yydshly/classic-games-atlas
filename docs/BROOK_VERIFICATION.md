# 溪谷守芽 · 验收记录

本款为固定五行八格、初期逐步开放的原创分路布防，和已有自由路径塔防分别实现。正常策略只读可见战场与完整预告，使用正式预算、普通部署/收集命令；无资源、生命、冷却、波次、时钟或结算改写。提供的 2× 是普通游戏控件，模拟规则与 1× 相同。

## 规则和初轮策略

`scripts/test_brook.mjs` 的 22 组边界覆盖原子扣款、全局冷却、版本/重复指令、格子/溪石/来敌占格、撤收不退款、资源生产/过期/ID收集/上限、同一行选敌、第一目标扫掠碰撞、护甲/减速、接触阻挡/摧毁、波间不结算、突破优先、自然失败、暂停、帧分区、精确日志恢复和坏记录拒绝。明确边界夹具可以设置独立测试世界；正常策略与自然失败不使用这些改写。

十关正常生产预算模拟均通过，总共 160 个来敌。后期四类装置实际组合，苔垒受击、雾环减速与装置损失均有统计；第九关策略预算最低达到 0，不是无限资源。初稿虽通过但阻挡作用较弱，随后增加少量同路快速组合并调整策略阻挡阈值；没有为了过测改变资源或敌人血量。原始初稿结果保留。

第一次真实界面测试在首关失败。逐步诊断发现 `select_option('1')` 会同时匹配选项显示标签和值，把显示第1行（内部值0）选为目标内部行1；本环境中明确的 `value=` 仍发生同样偏移；捕获的原生 input/change 事件在进入游戏处理前就已为0。按选项索引选择，经指定行1列2的实际部署及扣费断言通过；正常游戏代码不为此改资源/战斗。两次原失败结果与接受/拒绝操作全部保留，后续以索引及原生键盘选择复核。

## 浏览器与公开部署

- 功能 / 最终运行代码提交：[`52c9e7b1b40908d0e0d0fd0fba26004499d41dec`](https://github.com/yydshly/classic-games-atlas/commit/52c9e7b1b40908d0e0d0fd0fba26004499d41dec)。[Pages run 38921302304](https://github.com/yydshly/classic-games-atlas/actions/runs/38921302304) 成功，原始元数据在 [code-pages.json](brook-qa/code-pages.json)。
- [直接试玩](https://yydshly.github.io/classic-games-atlas/games/brook/) · [图鉴首页](https://yydshly.github.io/classic-games-atlas/) · [仓库](https://github.com/yydshly/classic-games-atlas)。后续证据提交只改变文档、报告、截图及测试，运行代码保持相同；最终 main 的 Pages 和142运行文件在交付时另行核对，SHA见交付消息。
- [公网十关真实输入](brook-qa/public-browser/report.json)：普通卡片点击、行列选择、部署与收露按钮，正常预算和正式2×速度；10/10过关，全部160个来敌清除。后关隔离夹具仅解锁菜单/教学/静音，不改战场资源、血量、冷却、时钟、波次或胜利。没有把自动策略称作人工体验。
- [实际操作重放](brook-qa/public-replay.json)：网页实际产生的 **348** 条普通指令逐条通过正式预算、冷却和占格校验。资源、每项统计、已出敌人数、成绩与公网结果完全相同。脚本 `scripts/test_brook_replay.mjs` 可重做该核对；没有为匹配结果改写状态。
- [公网22项界面检查](brook-qa/public-ui/report.json)：原子扣费、重复操作、行列预览、原生Tab/Home/方向键、C收露、鼠标点资源、十四秒过期、暂停/失焦/菜单、波中刷新精确恢复再赢、自然不布防失败/重试、最佳与声音/速度保存、锁关/溪石、坏存档/禁用存储、六种宽度。原生touch完整首关以卡片、画布格、部署和收露大按钮操作；只有滚动定位使用测试辅助。
- [142文件校验](brook-qa/public-integrity.json)全部HTTP200、SHA-256与功能提交相同，无连接重试。[图鉴公网回归](brook-qa/public-atlas.json)覆盖72条详情、10组、搜索/筛选/空结果/键盘与320–1440px；控制台、失败请求及HTTP资源错误均为零。
- [保留验证](brook-qa/retention.json)：前18款运行文件、72条原作介绍、10组和71条来源记录未改。现为19款、238关。正常策略和UI夹具、两次选择工具失败、初稿平衡结果均在本目录保留。

本轮公网实际结果：

| 关卡 | 秒 | 清除 | 余露 | 装置损失 | 苔垒受击 | 减速命中 |
|---|---:|---:|---:|---:|---:|---:|
| 01 | 41.667 | 6 | 285 | 0 | 0 | 0 |
| 02 | 50.917 | 12 | 180 | 0 | 0 | 0 |
| 03 | 60.667 | 12 | 150 | 0 | 0 | 13 |
| 04 | 59.667 | 14 | 90 | 0 | 6 | 14 |
| 05 | 67.800 | 17 | 45 | 0 | 3 | 16 |
| 06 | 67.667 | 18 | 0 | 0 | 2 | 14 |
| 07 | 68.100 | 16 | 35 | 1 | 15 | 23 |
| 08 | 70.700 | 17 | 15 | 0 | 0 | 15 |
| 09 | 68.800 | 21 | 0 | 0 | 16 | 14 |
| 10 | 81.983 | 27 | 135 | 0 | 5 | 25 |

第6/9关本轮余露达到0，第7关损失一座装置但正常守住；不因损失改判失败，不把无损当作通关门槛。实际输入时刻会改变布防选择，所以不同运行的剩余资源/用时/损失可以不同。只有本轮实际日志的重放才要求逐项相同。

截图：[中段战场](brook-qa/public-browser/level-05-field.png) · [终关胜利](brook-qa/public-browser/level-10-won.png) · [手机准备](brook-qa/public-ui/mobile-ready.png) · [原生触屏首关胜利](brook-qa/public-ui/mobile-won.png)。

复查命令：

```powershell
node scripts/test_brook.mjs
node scripts/test_brook_strategy.mjs
python scripts/test_brook_browser.py --url https://yydshly.github.io/classic-games-atlas/games/brook/
python scripts/test_brook_ui.py --url https://yydshly.github.io/classic-games-atlas/games/brook/
node scripts/test_brook_replay.mjs docs/brook-qa/public-browser/report.json
python scripts/verify_deployment.py --commit HEAD
```

## 范围与限制

自动策略和正式预算通关证据不是人工难度体验研究。主要环境为当前 Windows 的 Chromium / Playwright，含原生 Chromium touch；iOS Safari、Firefox、低端实体设备与屏幕阅读器尚未全面验收。使用离散固定行与保守几何碰撞，不模拟自由寻路、弹道抛物线或无限升级。存档本机保存并按普通操作确定性重放，不是防恶意本机改分系统。

所有装置、来敌、美术、关卡和合成音原创；无 PvZ 角色/图形/音频/地图、ROM、外部运行资源、付费、新账户或凭据。前十八款与72条图鉴保留。本款部署验收完成交回主对话，不自行开始第二十款。
