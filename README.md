# 经典游戏图鉴 · Classic Games Atlas

一份中文静态图鉴：介绍 72 个代表作品、系列与玩法谱系，按 10 个主题组织。不是销量榜、评分榜或完整游戏史；**本阶段未实现任何游戏复刻**。

**在线图鉴：[https://yydshly.github.io/classic-games-atlas/](https://yydshly.github.io/classic-games-atlas/)**

本项目独立于其他仓库。只包含原创介绍、原创 HTML/CSS/JavaScript、原创 SVG、资料链接与开发/验证脚本。没有账户、后端、模型调用、统计追踪、外部字体或运行时第三方依赖。不提供 ROM、模拟器、游戏音画或游戏下载。

## 本阶段目标与已实现内容

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
- 根据兴趣另行评估适合原创实现的小型玩法实验；**不承诺全面复刻，也不在本阶段开发游戏**。

游戏名称与商标属于各权利人。原创几何图案只表现游戏玩法的抽象意象，不表示官方合作或原游戏画面。
