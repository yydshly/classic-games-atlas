# 经典游戏图鉴 · Classic Games Atlas

一份中文静态图鉴：介绍 72 个代表作品、系列与玩法谱系，按 10 个主题组织。不是销量榜、评分榜或完整游戏史。另有独立的原创玩法实验，《堡垒防线》和《爆破迷宫》各提供 10 张原创关卡。

**在线图鉴：[https://yydshly.github.io/classic-games-atlas/](https://yydshly.github.io/classic-games-atlas/)**

本项目独立于其他仓库。只包含原创介绍、原创 HTML/CSS/JavaScript、原创 SVG、资料链接与开发/验证脚本。没有账户、后端、模型调用、统计追踪、外部字体或运行时第三方依赖。不提供 ROM、模拟器、原作音画或原游戏下载。原创游戏在浏览器内直接运行。

## 图鉴功能

- 覆盖原始清单全部条目；实际核算为 **72 条**，没有为凑数重复拆分系列。
- 中文、英文、常见别名搜索；忽略大小写、空格、标点和兼容字符差异。
- 10 个主题分组筛选、独立玩法类型筛选，可与搜索叠加；实时结果计数和空结果重置。
- 每条都有代表平台、时代语境、玩法、经典特点、版本边界与参考链接。
- 详情弹窗、可复制的 `#game=contra` 等直达链接、键盘 Enter / Escape / Tab 操作；`/` 聚焦搜索。
- 桌面三列、平板两列、手机单列布局；减少动态效果偏好支持。
- 米白、墨绿与朱橙的编辑式排版；原创几何海报与图标，**不是原游戏截图**。

主题分组混合时代、场景与类型，不是游戏平台分类。平台标签表示代表性历史平台，不是穷尽所有移植版的兼容清单；时代是阅读语境，不宣称精确发行日期。

| 主题 | 条目数 |
|---|---:|
| 红白机时代 | 8 |
| 街机厅 | 8 |
| 益智与解谜 | 8 |
| 休闲与塔防 | 6 |
| 策略与战术 | 8 |
| RPG 与冒险 | 8 |
| 经营与养成 | 6 |
| 射击与动作 | 6 |
| 赛车与体育 | 6 |
| 手机与网络 | 8 |
| **合计** | **72** |

## 原创玩法实验 01：堡垒防线

**[立即试玩堡垒防线](https://yydshly.github.io/classic-games-atlas/games/fortress/) · [需求与验收范围](docs/FORTRESS_SPEC.md) · [测试与部署证据](docs/FORTRESS_VERIFICATION.md)**

参考坦克移动射击、砖墙破坏与基地保护机制的原创单人游戏，不是《坦克大战》原作或逐关复制。名称、十张地图、Canvas 美术与 Web Audio 音效均为本项目原创；图鉴原作介绍与我们的游戏入口分开标识。

- 10 张各有布局、敌人组合与逐步难度变化的地图；3 类敌人（侦察车 / 突击炮 / 重装车）。
- 可破砖墙、不可破钢障、水域；基地 3 格耐久，玩家 3 次出击；3 类补给（维修 / 速射 / 护盾）。
- 初次教学、暂停/恢复、重开、胜败结算、关卡解锁、本地进度、声音偏好；切出标签自动暂停。
- 方向键 / WASD 移动，空格 / J 开火，P / Esc 暂停，R 重新整备。手机按住方向与开火控件。
- 无新增运行依赖、账户、联网玩法、后端、排行榜服务或关卡编辑器。首款的补充修复与线上终关证据见 [后续验收](docs/FORTRESS_FOLLOWUP.md)。

核心逻辑在 `games/fortress/engine.mjs`，地图数据在 `levels.mjs`，原创绘制在 `renderer.mjs`，界面、输入和存储在 `game.mjs`。诊断函数只提供状态副本，不提供改写游戏状态的作弊接口。

验证命令（使用环境中已有工具；不会自动安装）：

```powershell
node scripts/test_fortress.mjs
python scripts/test_fortress_browser.py --url http://127.0.0.1:4174/games/fortress/
```

Node 报告属于逻辑模拟；浏览器报告、实际首关录像和触屏事件属于真实输入证据，不宣称所有十关均由人工通关。部署后可将命令 URL 换为公开游戏地址复查。

## 原创玩法实验 02：爆破迷宫

**[立即试玩爆破迷宫](https://yydshly.github.io/classic-games-atlas/games/maze/) · [固定范围](docs/MAZE_SPEC.md) · [测试与部署证据](docs/MAZE_VERIFICATION.md)**

十张原创地图的单人定时爆破迷宫：十字爆风、可破木箱、固定石柱、连锁引爆、三类巡逻机、容量/范围/速度强化。三格护甲与短暂保护；清空目标后进入出口才通关。原创 Canvas 画面与合成音效，不使用原作素材或地图。

- 方向键 / WASD 移动，空格 / J 每按一次放一枚炸弹，P / Esc 暂停，R 重新整备；手机点按放置，按住方向移动。
- 教学、暂停、胜败/重试、十关解锁、最佳纪录与声音偏好。强化仅在本关生效；两个游戏存档分别保存。
- 数据清单 [data/experiments.json](data/experiments.json)统一管理已发布两款和第三款待开发候选；待开发项没有试玩链接，也不会附到原作详情作为已发布游戏。
- 代码分离为 `games/maze/levels.mjs`、`engine.mjs`、`renderer.mjs`、`game.mjs`。只读诊断返回副本，不提供修改战斗的接口。

```powershell
node scripts/test_maze.mjs
python scripts/test_maze_ui.py
python scripts/test_maze_browser.py --stage 1
python scripts/test_maze_browser.py --stage 10 --out docs/maze-qa/final-check
```

真实输入报告保留成功与失败尝试，明确选关夹具与未覆盖项。后续继续按[逐款交付规则](docs/DELIVERY_POLICY.md)推进，不承诺一次复刻全部图鉴作品。本轮第二款交付后结束当前工作，由主对话安排第三款。

## 内容和来源

运行数据是 [data/games.json](data/games.json)，编辑源为 [scripts/make_data.py](scripts/make_data.py)。每条有独立 `id`、中英文名、别名、主题、条目范围、代表平台、时代语境、玩法类型、原创玩法说明、原创特点说明、版本边界和来源键。来源注册表标记官方资料、发行方商店、博物馆、开源项目与二手百科，记录其与原作的关系。

优先使用开发商/发行商与官方商店资料，包括 [Konami 魂斗罗合集](https://www.konami.com/games/50th/ac/contra/asia/en/)、[Ironhide 游戏目录](https://www.ironhidegames.com/Games)；[The Strong 名人堂](https://www.worldvideogamehalloffame.org/exhibits/world-video-game-hall-of-fame/)作为历史阅读背景，**不表示本项目所有游戏均入选名人堂**。[OpenTTD About](https://www.openttd.org/about)仅说明受 TTD 启发的开源项目，不冒称原版《运输大亨》的发行页。

原作、系列、合集、资料片、移植、重制与后继品牌在详情中注明。例：FC《冒险岛》和《冒险岛 Online》是不同作品；Capcom《吞食天地Ⅱ》不同于光荣《三国志》；现代 Story of Seasons 与英文 Harvest Moon 品牌需要区分。

[data/source-audit.json](data/source-audit.json)保存实际 HTTP/标题/可读性检查元数据。**“页面可读”仅说明成功获取可用标题及正文，不代表所有玩法和历史事实逐条独立验证。**“未能读取”“访问受限或失效”意味着此次未取得可用正文，详情会原样提示。动态页面、地区限制和证书环境可能影响检查。部分早期作品目前以百科作补充，官方历史档案仍待补；没有编造发行年份、销量、评分或宣称全部来源核实。来源检查基于 2026-10-16 的一次性状态，不是持续监控。

## 本地运行

直接用任意静态 HTTP 服务。只需已有 Python 3：

```powershell
python -m http.server 4174 --bind 127.0.0.1
```

打开 `http://127.0.0.1:4174/`。通过 HTTP 访问以允许读取 JSON，不要用 `file://` 直接双击。

修改编辑源后重新生成并检查：

```powershell
python scripts/make_data.py
python scripts/validate_data.py
node --check app.js
```

可选来源检查使用 Python `requests`；可选浏览器验收使用 Python `playwright` 和已安装的 Chromium。项目没有自动安装流程，不需要为了访问网站安装这些开发工具。

```powershell
python scripts/audit_sources.py
python scripts/make_data.py
python scripts/test_browser.py --url http://127.0.0.1:4174/
```

浏览器脚本覆盖全部条目详情、中英文及别名搜索、组合筛选、空结果、键盘焦点和 320–1440px 响应式视口，输出在忽略的 `.local/qa/`。来源脚本可传来源键只复查指定项，例如 `python scripts/audit_sources.py contra`。抓取正文片段仅写入忽略的 `.local/`，不发布第三方完整资料。

## 发布与状态

目标仓库：`yydshly/classic-games-atlas`，默认分支 `main`。目标部署方案为 GitHub Pages 从 `main` 根目录发布；`.nojekyll`关闭 Jekyll 处理，所有资源使用相对路径，适配 `/classic-games-atlas/` 项目路径。

**当前：已取得明确公开许可，仅将此新库设为 public，并成功部署 GitHub Pages。**网站通过 HTTPS 访问；Pages 从 `main` 根目录发布。线上全部 72 条详情、搜索与组合筛选、空结果、键盘、直达链接重载及六种屏宽验收通过；运行文件内容与部署提交一致。公开和部署仅作用于本项目，未改变其他仓库。

线上验收报告、截图和资源哈希见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。复查线上文件可运行 `python scripts/verify_deployment.py --commit HEAD`；完整线上浏览器复查使用 `python scripts/test_browser.py --url https://yydshly.github.io/classic-games-atlas/ --out .local/online`。

提交使用账号 `yydshly` 与 GitHub noreply 邮箱，不写入个人邮箱或凭据。验证证据见 [docs/VERIFICATION.md](docs/VERIFICATION.md)。

## 后续候选

- 补充早期作品的官方档案与更细的版本资料，提高来源覆盖。
- 扩展别名、键盘导航说明及更多浏览器的无障碍验证。
- 后续批次候选为炸弹人式闯关、泡泡龙式解谜；由后续任务安排，不在本轮继续开发，也不承诺全面复刻。

游戏名称与商标属于各权利人。原创几何图案只表现游戏玩法的抽象意象，不表示官方合作或原游戏画面。
