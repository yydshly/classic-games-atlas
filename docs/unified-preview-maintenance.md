# 统一预览开发主线：来源与最小整合计划

2026-10-25，维护整合已在同一候选实施：Inlet 与 Windowlife 源模块、专项测试和 Quiet 落点测试已选择性集中。运行 HTML、Quiet r3、正式路径与 main 不变；没有全量合旧分支或新增网页入口。实际开发命令、当前源目录与逐文件来源见 [统一检查工具](../tools/preview-bundles/README.md) 和 [来源 manifest](../tools/preview-bundles/sources.json)。下列树与缺口表保留为整合前基线。

## 当前树关系

- main `efc55fa253cbc0bc1435a4b69537bcc55d23a95b`，tree `6709d0807d98be31ad2164f5a7aa8a0addad552f`。
- 统一候选运行基线 `fef5739c9398ed36119a3b8143c4ed8b4dbf7cb5`，tree `c04808f5e4fa2cb878c161398e5eb0fde98030df`。
- 核对两个完整树：main 的 8189 个文件在候选均为同一 blob；候选额外有 95 个 QA/测试文件。本清单随后只增加候选文档，不改变运行文件。
- 因而三项预览的运行能力已经集中在 `cloud/quiet-gentle-home`；完整、可重建的源码与专项回归尚未全部集中。保留旧分支有助追溯，不代表应将旧树整体合入。

## 来源 → 当前运行路径 → 整合前源码与测试缺口

| 项目 | 固定来源提交 | 当前运行路径 | 已集中与缺口 |
| --- | --- | --- | --- |
| Inlet 期限/ETA 预览 | [01dd7d48430a740a13170be703232567a4ba9e10](https://github.com/yydshly/classic-games-atlas/commit/01dd7d48430a740a13170be703232567a4ba9e10)，旧分支 `cloud/inlet-preview-deadline` | `experiments/inlet-deadline-preview/index.html`，独立内联 bundle；后续布局提交 b1d889b → efc55fa，均未改脚本 | 期限补丁原模块位于该来源的 `versions/v3/preview/inlet/{engine,game,renderer}.mjs` 与 `style.css`；配套 `journey.mjs`、`levels.mjs` 为依赖。候选仍保留正式 v3 原字节，不能用源补丁直接覆盖。缺 `tests/inlet-v3-preview-deadline.test.mjs` 与 `docs/inlet-deadline-qa/{README.md,forecast-audit.mjs,boundaries.json,forecast-audit.json}`。现有 `docs/inlet-deadline-layout-qa/{verify.mjs,before-contract.json,report.json,README.md,scroll-followup.md}` 仅覆盖内联脚本不变、接线、隔离存档及布局约束，不能代替期限专项测试。 |
| Windowlife 请求场景 | [c416a7e25b0117e2a80c287181a02c8e22e2b86c](https://github.com/yydshly/classic-games-atlas/commit/c416a7e25b0117e2a80c287181a02c8e22e2b86c)，旧分支 `cloud/windowlife-request-scene`；网页标注的本地 e6c8bae 与其同 tree | `experiments/windowlife-request-preview/index.html`，独立内联 bundle | 原源模块在该来源的 `experiments/windowlife-request/{main,controller,scene,storage,view}.mjs` 与 `style.css`，README 解释状态机/存储边界。缺 `tests/windowlife-request-{scene,controller,view}.test.mjs`。原场景依赖 `preview/windowlife/levels.mjs`；该文件在旧来源和当前候选同 blob `50b6395afaed1f7051b3a6d7007135ed6947a656`。不复制旧 index.html，不新增第二入口。旧离线图与报告可留原分支，以固定提交链接追溯。 |
| Quiet 落点与轻轻回窝 | [dcd3f4e2cffe2dab467af9b4082f46f6817043bc](https://github.com/yydshly/classic-games-atlas/commit/dcd3f4e2cffe2dab467af9b4082f46f6817043bc)，旧分支 `cloud/quiet-fall-marker` → main 7e58eb5 的隔离预览 → 统一候选的体验/竖屏/r3 修订 | `experiments/quiet-workbench-preview/`，当前缓存版本 `gentle-home-d9246fd-r3` | 模块源码已在运行目录：`boot,game,physics,feedback,view,scene,presentation,batch.mjs`，以及 `index.html/style.css/NOTES.md`。`physics.mjs` 与旧落点来源同 blob `6c85c2fe36191775c9ae9c74019b3c741302e5b0`；feedback 已继续改进，不能拿旧文件覆盖。现有 `tests/quiet-{gentle-home,lamp-envelope,temporal,readability,portrait,viewport-layout}.test.mjs` 等及 `docs/quiet-gentle-home-qa/` 已集中，但缺旧 `tests/quiet-workbench-fall-marker.test.mjs`。现有 `quiet-workbench-fall-feedback.test.mjs` 面向原实验，验证材质归因；它不是缺失落点测试的同义替代。 |

Inlet 当前完整内联脚本 SHA256 为 `e01a9c9af6f34bde262ca8904dfb370e8d20a4e8edc8182d1d0cbec46cf7eec5`，运行 HTML SHA256 为 `43491133c1f2cde452227a60f6b918ff49ef52c142b4028047f6e3114e03de1b`。本文没有将打包后脚本与原模块宣称为字节相同；仍须建立可重建检查。

## 原最小整合顺序（本轮已实施，详见工具说明）

1. 只在同一候选选择性集中源码。Inlet 放入现有预览下 `source/`，取固定来源的五个 mjs 依赖与 CSS；Windowlife 同样取五个 mjs 与 CSS。各自附来源 SHA、原路径、blob/SHA256 和隔离适配差异清单，不复制 index.html 或旧整棵树。任何路径重定位只改 import/入口接线，正式 `versions/v3/preview/inlet`、原 Windowlife 与 Quiet 均不改。
2. 引入对应期限/场景三套专项测试，明确改为导入上述预览 source；保留断言内容和来源。Inlet 的 UI 文案接线检查也改向新 source，不再误测未修的正式 v3。Windowlife 的共享 levels 必须固定来源哈希或复制到 source 并调整 import；不顺带改正式关卡。
3. 选择性移入 Quiet 落点专项测试，仅将两个导入重定向到现有 `quiet-workbench-preview` 模块。先验证真实 Cannon 的最后支撑点、复制隔离、终局稳定与 retry 清理，保留现有测试；不移入旧 physics/feedback/view。
4. 为两个单 HTML 预览建立显式、版本固定的生成命令。保留当前隔离 key、独立提示、页面结构与 Inlet 最新 CSS；先证明生成结果与当前运行脚本相同。若不能相同，列明包装/打包差异并补覆盖，不能用“有原源码”代替一致性证明。生成检查须在临时目录执行并在发现未提交运行差异时失败，不自动覆盖运行文件。
5. 用一个候选检查入口串起来源 manifest、依赖遍历、bundle 重建、专项测试与当前隔离存档检查。每次只把已验收的运行 diff 提交 main；源码/测试整理本身先留候选。合并前重新以最新 main 为基线计算累计差异，绝不用旧候选 tree 覆盖当前 main。

## 质量门槛

本次 Inlet Pages run [40169800044](https://github.com/yydshly/classic-games-atlas/actions/runs/40169800044) 的精确 head 为 efc55fa，build/report/deploy 均 success。仓库运行文件已逐字节核对，main 只有一个 HTML 差异；线上 HTTP 字节检查在本云端仍受原代理 403 限制，未重试。390×844 滚动遮挡与 1280×720 首屏仍须根的真实浏览器复验；Windowlife 的真人参与感也不能从模型测试得出。旧 QA 报告按其固定版本解释，不追认为当前版本已验收。
