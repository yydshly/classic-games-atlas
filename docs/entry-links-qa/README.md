# 完整网页入口：只读审计与本地导航候选

发布基线main `2021c29536a60b0d0200cdb268c9cec4f9518e03` / tree `e8ad72f47fea1a4c42366dfaa9983c7ff5f0a5d1`。这是晨丘九关已批准20文件的独立发布；Pages run 40301921559的build/deploy/report-build-status均成功。以下入口补全是随后单独的本地工作，未公开保存或部署，不混入该次发布。

## 已确认的入口缺口

审计使用该部署源码树、根首页真实app.js的esbuild内存bundle和jsdom。加载本地的4份真实目录JSON，展开45款列表并打开每款对照，收集实际生成链接；再沿玩家HTML锚点导航检查文件和片段。没有启动浏览器、访问线上HTTP、读取用户存档或把合成DOM当真实UI。

- **作品与版本**：45款目录作品、99个非冻结版本地址，全部实际存在；这是版本地址数，不能称99款游戏。另有7个已部署实验地址，共106个非冻结游戏/实验index页面。QA网页、资源文件、about说明、冻结副本不算新作品。
- **5个真正导航孤岛**：`experiments/dawn-hill/`（九关）、`experiments/crate-courier/`（三关）、`experiments/quiet-workbench-preview/`、`experiments/inlet-deadline-preview/`、`experiments/windowlife-request-preview/`。根首页和目录数据没有入链，沿玩家HTML导航也无法进入。
- **4个非大厅直接版本入口**：`versions/v3/games/fortress/`、`versions/v3/games/post/`、`versions/v3/games/post/cup/`、`versions/v4/games/post/`。可由游戏内链接抵达，不是死链；完整索引将其明确列出。
- **文件死链**：所检查的首页、对照与玩家导航文件目标为0。未验证外部网站或线上HTTP可用性。
- **2个失效片段**：旧`preview/windowlife/`和`preview/glimmer/`返回`#play-library`，首页只有`#play`而无对应id。文件存在，滚动目标缺失，不能混称HTTP404。
- **过时状态**：首页“其余v2尚未开始”已与目录/实际v2页面不符，改为以大厅及完整索引为准。Inlet、Quiet修订页仍保留较宽泛的未UI验收提示；它们不等于完全没有有限流程证据。此次只在索引说明有限覆盖和待验范围，不改游戏运行页或提高质量认定。Windowlife叶影保留暂停实验状态，不因新增入口重启扩展。

完整机器结果见[audit.json](audit.json)。基线的rootDirectOrComparisonMissing含9个地址，其中4个可经游戏内导航到达；afterLocalPatch该字段仍表示“根页面本身没有直接列出”，不能忽略新增`play/`中转页。实际完整索引覆盖106个地址，根页到它们最多两次普通链接跳转，notReachableThroughPlayerHtml为空。

## 最小修补

1. 首页导航和首屏动作区链接到`play/`。保留原45款大厅、99条登记、冻结首页、原有所有链接和各游戏存档。
2. 新`play/index.html`为完整静态索引：先列7个独立实验/新版试玩，再按45作品列99个版本。晨丘九关、箱跃三关、Quiet新旧场景、Inlet修订、码头实验和暂停叶影均明确。它不是新增游戏入口或第46款作品登记；独立预览与旧正式版并列，不静默替换。
3. 首页标题内补`play-library`空锚点，修复两个旧返回链接，不改游戏页。只更新一处过时v2状态句，未合入55份玩法说明改动。
4. `play/entries.json`只维护7个独立地址的现有玩法与准确边界，未发布本地游戏不能加入。45/99从原登记与comparison数据生成；构建计数随数据推导，不硬锁历史数量。

页面关闭JavaScript仍有完整链接；不拉取运行时JSON，不写存档。窄屏用一列、链接至少44px高且可折行，有可见焦点，不加悬浮遮罩或新截图。源样式/合成DOM检查不是原生390/桌面像素验收，仍待发布后真实浏览器复验。

## 可重建与只读检查

```
node scripts/build-play-index.mjs
node scripts/audit-play-entry-links.mjs --check
node --test tests/play-recent.test.mjs
```

两个默认命令只读；显式`build-play-index.mjs --write`才重建HTML，显式`audit-play-entry-links.mjs --output PATH`才写报告。审计`--tree TREE`仅选择游戏页面清单的Git树；导航代码/页面仍来自当前工作区，不能拿它冒充旧树完整回放。源码报告保留阶段身份，最终commit/hash见云本地manifest。

静态生成页不需要新包；构建/合成DOM复用已有`tools/preview-bundles`工具依赖。链接检查包含目标文件、实际目录app所生成入口和片段、索引覆盖、孤岛与版本token。此轮不改任何106个游戏/实验HTML、其脚本/CSS、原数据登记或其他项目；不上传图片、大包或Library材料，不重试旧proxy403、云浏览器拒绝或CLI认证。

本地检查后：106个非冻结运行页面均可经首页完整索引到达；99原登记和7实验全部列出，文件/片段死链与导航孤岛均为0。这个结果只对应本地导航候选，线上首页尚未变化。

## 发布前补充：离线像素与独立复核

本地补充审查已收口，范围仍是原8文件。原390离线图中计数说明占据前半屏，晨丘/箱跃链接约在y573/y757；现将两款动作试玩的明确直达按钮放到计数说明前，保留九关候选/三关试玩状态。390画面两按钮均在y193–269，宽屏亦在首屏；没有把99历史版本搬到主要试玩前。首页新增导航短为“全入口”，保持完整aria-label且禁止自身折字，首屏hero完整入口文字保留。

默认构建、实际根app合成DOM链接审计和既有最近记录检查通过。未参与实现的独审者交叉核对45个“大厅当前入口”逐项相同、7个实验确实存在于发布基线、晨丘9/箱跃3双向返回闭环、旧play-library锚点、过时v2句与前后4张离线关键图，未发现明确P1/P2。新quick按钮与原卡的目标和版本完全一致，数量仍为45作品、99版本、7地址。

离线像素使用scratch隔离安装的WeasyPrint70/Pango HTML/CSS排版成PDF，再由MuPDF输出390×844、1280×720 PNG；没有浏览器或远程页面访问，也没向项目新增依赖。WeasyPrint不执行宽度媒体特性，渲染脚本仅按真实源CSS的min/max-width条件选分支；使用单张长PDF、按首屏区域裁图，避免分页把卡片挪到下一页。索引排版无告警。首页原有复杂CSS存在不支持选择器/属性，且不执行app.js，所以首页图只用于新增静态链接附近的有限观察，动态大厅由独立jsdom检查，不是完整首页原生CSS验收。

同一尺寸、同一源状态的前后PNG/PDF/展开CSS和记录保留在`/workspace/scratch/entry-index-review/pixels-before/`、`pixels-final/`（`pixels-after/`保留中间版）；独审记录为同目录的`independent-source-dom-review.json`、`independent-pixel-followup-review.json`。图片与工具依赖不入Git。源文件哈希与最终渲染记录吻合，默认检查只读。原生390/桌面、键盘焦点、真触摸与浏览器滚动仍需后续真实UI验证；不得把这些离线图称浏览器截图。未上传或部署本导航补丁，未改游戏代码或合入55份说明改动。

本轮末母线程转交九关真实UI：7–9均到站，终局刷新保留前6记录；7大破/小不破与砖保存/重试、8局部破砖留邻砖地面通、9开底后缩小走地面均覆盖，390地形/按钮/回顾可读。索引仅同步“九关候选 · 分段流程已覆盖”，不提升为完整品质或全分路验收。完整高廊、返程果及连续手感未验；路牌字小、8一次回桥不稳、9要多拆一砖加宽，是下一阶段定向体验问题，尚非确证阻断，本轮不改游戏或扩入口范围。
