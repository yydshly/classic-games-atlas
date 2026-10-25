# 统一候选的源码与运行包检查

从同一 `cloud/quiet-gentle-home` 分支开发三个已有预览，无须切回旧分支找源模块。此工具仅用于开发与检查，不部署，不启动浏览器，不改 main。已有 `index.html` 是页面标记的源文件；它的 CSS 和脚本由同目录 `source/` 重建，不另建网页模板或入口。

## 运行

使用 Node 18 或更新版本，在仓库根目录：

```sh
npm ci --prefix tools/preview-bundles --ignore-scripts --cache /tmp/atlas-preview-npm-cache
npm test --prefix tools/preview-bundles
```

开发依赖仅 `esbuild@0.25.12`，版本和官方 npm 包完整性由 package-lock.json 固定。`node_modules` 被忽略，不提交原生二进制，不引入游戏运行时网络依赖。`--ignore-scripts` 使用 npm 提供的对应平台可选包，避免安装生命周期脚本。

快速一致性检查：`node tools/preview-bundles/check.mjs`。完整检查串起来源记录、两个包的依赖图和逐字节一致性、五份集中专项测试、Quiet r3 viewport 回归、Inlet 内联 bundle 的合成 DOM/隔离存档检查，以及有限合法路线的 forecast audit。所有夹具、Cannon 和 mock-canvas 检查均不是浏览器或玩家验收。

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

生成文件仅写到指定的仓库外目录。检查默认只比较，绝不自动改运行 HTML；开发者审查生成差异后，只替换现有 HTML 的对应生成区，并再次运行完整检查。页面标记直接在既有 index.html 修改，无第二份模板；不得把旧分支的页面、CSS 或整棵树覆盖回来。

本轮验证记录见 [verification.json](verification.json)。main 网站、三个运行预览和正式路径在本次集中前后均保持原字节；发布仍需单独选择已检查的运行 diff。线上布局真实 QA 由已有电脑任务完成，本工具不作 UI 通过结论。

## 仍留在历史分支的资料

Windowlife 的离线图、render-offscreen.mjs、旧 model-report/测试日志，以及 Inlet 的原 boundaries.json/旧 forecast-audit.json 等旧版本档案没有复制；原分支和固定来源链接仍保留。本分支已有全部当前运行必需源码、专项测试、可运行审计及其新结果。Quiet 原 fall-marker 的旧 view/feedback 不重新导入，当前预览已有对应能力且继续改进。
