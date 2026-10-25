# 箱跃货栈 · 单人三关旅程候选

状态：`crate-slice-3`三关本地候选，未公开保存或部署。已发布首关r2有父线程有限电脑QA；本轮三关、转关、保存与回顾尚须真实浏览器及玩家体验验收。不标第46款完成作品，不修改图鉴或计数，不开发第四关。离线图只保留本地。

玩家是递送员阿禾，沿雨后货栈→上层转运台→回湾灯港完成旅程。举起箱子投向巡逻机，结合跳跃跨水道和货台，也可借箱垫脚绕上层。箱子不是钥匙，终点不要求清敌或交箱。每跳一次松开再按，长按不会连跳；空中保持方向才能继续横移。

## 参考核对与范围

- 图鉴 `data/games.json` 的 `chip-dale` 指初代《松鼠大战》，说明为举物投掷、平台跳跃、合作闯关。
- [Capcom 合集官方介绍](https://news.capcomusa.com/lets/browse/90s-kids-rejoice-the-disney-afternoon-collection-revisits-ducktales-rescue-rangers-and-more-retro-classics-on-april-18)确认其平台动作与双人合作定位，并提到 crate throws。[初代说明书扫描件（第三方保存的原始文档）](https://www.thegameisafootarcade.com/wp-content/uploads/2017/02/Chip-n-Dale-Rescue-Rangers-Game-Manual.pdf)的公开检索文本确认 A 跳、B 举物/投掷及向上投掷。本轮未取得该 PDF 的本地副本：直接下载被云代理 `Tunnel connection failed: 403 Forbidden` 拒绝，未重试。
- 保留：单人移动/跳跃、举起实体箱子、向面朝方向投掷打敌、敌人接触受伤、连续平台推进。不会再把该核心替换成强制双人切换的搬箱解谜。
- 改编：原创人类递送员、货栈环境和几何美术；固定浅弧线、短轨迹提示、补箱节奏、箱子可垫脚、三点体力与本关布局。物件由当前角色举起，不显示虚假的第二名协作角色。
- 未做：双人合作、角色切换、向上投掷、藏进箱子、Boss、世界地图、声音。只有有界三关，不宣称完整复刻或协作已完成。
- 原作角色、美术、ROM、音效均未提取。本页无外部运行依赖，无登录、联网后端或付费服务。

## 三关范围与可见验收标准

开场安全区中只有木箱，巡逻机还在前方。先普通中文说明角色、目标、操作、成功/失败，点击“进入货栈”才启动。提示随实际位置/持物变化，玩家实际举箱后才提示投掷；不强制完成教学清单才开门。

首关保留原地图和规则。第二关以高低货台、发射高度和借箱/清路选择为主；第三关把水道、货台和投敌组合收束。到站主动转关，重试只重置当前关，最终回顾三段真实行动；重走三关需确认。详细目标、路线差异、存档范围和验收见[三关记录](../../docs/crate-courier-qa/journey.md)。

- 角色举箱时实体箱子在手上，抛出后才移走；虚线和空心箱形终点来自同一固定步模型，暂停仍可观察，既不改射程也不替玩家出手。脚、箱、真实承托边界必须一致。
- 接触受击扣一点，短暂无敌/退让可读；三次受击或落水保留现场，按钮/R 立即重试。暂停/切后台清输入，不能恢复后自己走下水。
- 桌面首屏直接看玩法和游戏；窄屏滚动跟随角色横向推进而不是把全关卡缩成小图。角色、木沿、箱子、前方危险应清楚，触屏按钮不覆盖场景。
- 已发布r2的暂停缩放和实际投掷对应已由父线程复验，本轮三关全流程、连续实时节奏、新关卡上下路线、刷新恢复、原生触摸及失焦仍待验证，不能将模型/合成DOM称试玩通过。

## 本地运行与检查

在仓库根运行 `python -m http.server 4174 --bind 127.0.0.1`，正常支持的浏览器打开 `/experiments/crate-courier/`。本云浏览器过去被拒绝，不重试或换控制路径，由父对话安排实际浏览器审查。独立key `classic-games-atlas:crate-courier:journey:v1`保存三关快照；旧首关原无存档，缺档从第一关开始。其他游戏key不读取或修改，损坏原档保护，刷新进行中现场先暂停。

```
node --test experiments/crate-courier/*.test.mjs
node scripts/verify-crate-courier.mjs --scope docs/crate-courier-qa/journey-scope.json
```

控制器测试通过仓库既有的 `tools/preview-bundles` 中固定版本 jsdom 运行；需要时使用该工具原有 `npm ci`，不引入新依赖。测试使用真实 DOM 结构和派发事件，但不是原生浏览器触摸/键盘验收。

```
node tools/crate-courier/export.mjs /workspace/scratch/crate-courier-review/journey/pixels --journey
```

此命令从实际合法按键路线取得状态，记录同一个 Canvas2D Renderer 的绘图命令为 SVG；可由已有 Inkscape 转 PNG。只写指定输出目录。它不是浏览器截图，未测 HTML/CSS、字体一致性、触摸、音频、性能或手感。不要将离线图片加入发布主干。
