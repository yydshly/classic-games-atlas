# 统一候选的源码与运行包检查

从同一 `cloud/quiet-gentle-home` 分支开发三个已有预览，无须切回旧分支找源模块。此工具仅用于开发与检查，不部署，不启动浏览器，不改 main。已有 `index.html` 是页面标记的源文件；它的 CSS 和脚本由同目录 `source/` 重建，不另建网页模板或入口。

## 运行

使用 Node 18 或更新版本，在仓库根目录：

```sh
npm ci --prefix tools/preview-bundles --ignore-scripts --cache /tmp/atlas-preview-npm-cache
npm test --prefix tools/preview-bundles
```

开发依赖仅 `esbuild@0.25.12`，版本和官方 npm 包完整性由 package-lock.json 固定。`node_modules` 被忽略，不提交原生二进制，不引入游戏运行时网络依赖。`--ignore-scripts` 使用 npm 提供的对应平台可选包，避免安装生命周期脚本。

快速一致性检查：`node tools/preview-bundles/check.mjs`。默认完整检查只读，串起来源、两个包的依赖图和 JS/CSS 一致性、专项测试、Quiet r3、当前 Inlet bundle 的合成 DOM/隔离存档与第二/三湾固定输入路线。不写 QA JSON，不锁历史脚本 SHA；有意编辑源码并生成匹配 bundle 后可以通过，旧 bundle/行为回退仍失败。夹具、Cannon 和 mock-canvas 均不是浏览器或玩家验收。

## 可维护的源目录

| 当前预览 | 从本分支编辑的源文件 | 固定历史来源 |
| --- | --- | --- |
| `experiments/inlet-deadline-preview/index.html` | `source/{game,engine,renderer,journey,levels}.mjs`、`source/style.css`、`source/preview-layout.css`，页面标记仍在现有 index.html | `01dd7d48430a740a13170be703232567a4ba9e10`；当前布局附加 CSS 取自 main `efc55fa253cbc0bc1435a4b69537bcc55d23a95b` |
| `experiments/windowlife-request-preview/index.html` | `source/{main,controller,scene,storage,view,levels}.mjs`、`source/style.css`，页面标记仍在现有 index.html | `c416a7e25b0117e2a80c287181a02c8e22e2b86c`；levels 从该提交的 `preview/windowlife/levels.mjs` 固定复制 |
| `experiments/quiet-workbench-preview/` | 现有运行模块直接就是源码，继续保留 r3；没有再复制一套 | 落点机制源自 `dcd3f4e2cffe2dab467af9b4082f46f6817043bc`；当前表现与 r3 来自统一候选 |

`sources.json` 逐文件记录来源提交/路径/blob/SHA256、导入时 SHA256 与精确适配替换。导入时的反向替换可重构原 blob；后续有意修改保留于 Git，记录中的 importedSha256 和 runtimeAtImport 是历史基线，不能伪改为新的历史来源。检查会标注 unchangedSinceImport；源码一旦修改，仍必须与当前运行包逐字节一致，不能把过时 bundle 当作新源码的产物。

当前适配仅为：Inlet 专用试玩存档 key；Windowlife 将同 blob 的 levels 复制到本地并改 import；专项测试及审计策略改向集中源码。原测试断言未删除。Inlet 当前布局 CSS 单独保留且参与一致性检查，防止旧样式重建时回退。Quiet 只引入落点测试并改导入，不覆盖 physics、feedback、场景或 r3 文件。

## 修改源码后生成供审查的 HTML

```sh
node tools/preview-bundles/build.mjs --out-dir /tmp/atlas-previews
```

生成器在临时目录使用历史模块路径作为 esbuild 的规范化输入路径，以保留已发布包中的注释和字节；实际输入全部读取当前分支的 source，不读取旧分支或正式 v3。唯一的 staging import 改写恢复 Windowlife 的规范化 levels 路径，运行依赖图仍严格限定为本分支复制的六个模块。版本、编码、target、IIFE 名与换行也固定。

生成文件仅写到指定的仓库外目录。检查默认只比较，不自动改运行 HTML；审查生成差异后再替换对应生成区。独立重建的是 JS/CSS；完整 HTML 比较借用当前 index.html 标记外壳重新注入两者，不能独立验证页面标记或设计。页面标记直接在既有 index.html 修改，无第二份模板；不得用旧分支的页面、CSS 或整棵树覆盖。

首次源码集中的历史记录见 [verification.json](verification.json)，当前范围见 [regression-status.json](regression-status.json) 和 [关卡审查](../../docs/inlet-playability-qa/README.md)。本轮维护未改 main、预览运行文件或正式路径。根已提供 efc55fa 的真实电脑布局通过：390×844滚动无遮挡、1280×720初始地图/主控同屏、820×740展开说明/暂停正常。这不是第二/三湾真人通关、真实手机或全 UI 验收。

## 独立审计与报告副作用

- `npm run audit:forecast --prefix tools/preview-bundles` 默认只读输出并断言安全预测实际闭合；加 `-- --write` 写新 forecast-current.json，不覆盖历史 forecast-audit.json。旧字段 collision:326 是所有非 safe 分类，当前称 nonSafe，不能说326次真实碰撞。
- `npm run audit:routes --prefix tools/preview-bundles` 默认只读重放；加 `-- --write` 明确更新关卡 report.json。
- `npm run audit:layout-historical --prefix tools/preview-bundles` 复跑 efc55fa 布局修复的历史不变性审计，锁旧 SHA/属性/CSS且会重写其 report.json，已移出默认回归。未来合法开发改变 bundle 后，该历史审计失败是预期现象；旧 before-contract.json/report.json 原样保留。

## 仍留在历史分支的资料

Windowlife 的离线图、render-offscreen.mjs、旧 model-report/测试日志，以及 Inlet 的原 boundaries.json/旧 forecast-audit.json 等旧版本档案没有复制；原分支和固定来源链接仍保留。本分支已有全部当前运行必需源码、专项测试、可运行审计及其新结果。Quiet 原 fall-marker 的旧 view/feedback 不重新导入，当前预览已有对应能力且继续改进。
