# 统一候选的源码与运行包检查

运行能力、源码和维护检查应一起归入main；日常可用临时候选开发，但无需切回旧分支找源模块。此次发布前拟合入范围见 [主干整合记录](../../docs/main-integration-qa/README.md)。此工具仅用于开发与检查，不部署，不启动浏览器，不写Git引用。已有 `index.html` 是页面标记的源文件；它的 CSS 和脚本由同目录 `source/` 重建，不另建网页模板或入口。

Windowlife手动叶影切片、源码、测试与文字审查记录已保存到同一统一候选，保存边界和Esc焦点修复见 [7ec39bd9](https://github.com/yydshly/classic-games-atlas/commit/7ec39bd9d83d899d17439681c443ccc1e246e1e7) 与 [原型说明](../../docs/windowlife-leaf-qa/README.md)。离线图片仍留云本地；发布状态以main对应提交和Pages记录为准，本工具不执行发布。`paper-controller.mjs`处理绘图输入，`marks.mjs`提供确定性几何；scene.mjs为v2，legacy-scene.mjs保留v1旧档语义。原三份Windowlife测试明确验证v1兼容，新版模型/输入/画面测试另外运行，未把旧断言删掉来取得通过。

## 运行

使用 Node 18 或更新版本，在仓库根目录：

```sh
npm ci --prefix tools/preview-bundles --ignore-scripts --cache /tmp/atlas-preview-npm-cache
npm test --prefix tools/preview-bundles
```

直接开发依赖为 `esbuild@0.25.12` 与 `jsdom@26.1.0`，版本、传递依赖和官方 npm 包完整性由 package-lock.json 固定。esbuild重建bundle，jsdom只用于读取现有HTML、DOM事件冒泡与焦点测试，不执行页面脚本、加载页面资源或启动浏览器。两者不进入游戏运行包。`node_modules` 被忽略，不提交原生二进制，不引入游戏运行时网络依赖。`--ignore-scripts` 使用 npm 提供的对应平台可选包，避免安装生命周期脚本。

快速一致性检查：`node tools/preview-bundles/check.mjs`。默认完整检查只读，串起来源、两个包的依赖图和 JS/CSS 一致性、专项测试、Quiet r3、当前 Inlet bundle 的合成 DOM/隔离存档与第二/三湾固定输入路线，以及Windowlife长等待保存、旧档、纸面输入与真实标记DOM焦点检查。不写 QA JSON，不锁历史脚本 SHA；有意编辑源码并生成匹配 bundle 后可以通过，旧 bundle/行为回退仍失败。夹具、jsdom、Cannon 和 mock-canvas 均不是浏览器或玩家验收。

## 可维护的源目录

| 当前预览 | 从本分支编辑的源文件 | 固定历史来源 |
| --- | --- | --- |
| `experiments/inlet-deadline-preview/index.html` | `source/{game,engine,renderer,journey,levels}.mjs`、`source/style.css`、`source/preview-layout.css`，页面标记仍在现有 index.html | `01dd7d48430a740a13170be703232567a4ba9e10`；当前布局附加 CSS 取自 main `efc55fa253cbc0bc1435a4b69537bcc55d23a95b` |
| `experiments/windowlife-request-preview/index.html` | `source/{main,controller,paper-controller,scene,legacy-scene,marks,storage,view,levels}.mjs`、`source/style.css`，页面标记仍在现有 index.html | 原片段源自`c416a7e25b0117e2a80c287181a02c8e22e2b86c`；统一候选手动切片新增输入与几何，v1代码保留在legacy-scene |
| `experiments/quiet-workbench-preview/` | 现有运行模块直接就是源码，继续保留 r3；没有再复制一套 | 落点机制源自 `dcd3f4e2cffe2dab467af9b4082f46f6817043bc`；当前表现与 r3 来自统一候选 |

`sources.json` 逐文件记录来源提交/路径/blob/SHA256、导入时 SHA256 与精确适配替换。导入时的反向替换可重构原 blob；后续有意修改保留于 Git，记录中的 importedSha256 和 runtimeAtImport 是历史基线，不能伪改为新的历史来源。检查会标注 unchangedSinceImport；源码一旦修改，仍必须与当前运行包逐字节一致，不能把过时 bundle 当作新源码的产物。

首次源码集中的适配为：Inlet 专用试玩存档 key；Windowlife 将同 blob 的 levels 复制到本地并改 import；专项测试及审计策略改向集中源码。其后的Windowlife手动创作与保存修复由候选Git历史单独记录。原测试断言未删除。Inlet 当前布局 CSS 单独保留且参与一致性检查，防止旧样式重建时回退。Quiet 只引入落点测试并改导入，不覆盖 physics、feedback、场景或 r3 文件。

## 修改源码后生成供审查的 HTML

```sh
node tools/preview-bundles/build.mjs --out-dir /tmp/atlas-previews
```

生成器在临时目录使用历史模块路径作为 esbuild 的规范化输入路径；实际输入全部读取当前分支 source，不读取旧分支或正式v3。staging import改写恢复Windowlife的规范化levels路径（当前导入位于legacy-scene），依赖图严格限定为声明的模块集合。版本、编码、target、IIFE名与换行固定；有意修改源码后应生成并审查新的bundle，不能继续冒称与旧包相同。

生成文件仅写到指定的仓库外目录。检查默认只比较，不自动改运行 HTML；审查生成差异后再替换对应生成区。独立重建的是 JS/CSS；完整 HTML 比较借用当前 index.html 标记外壳重新注入两者，不能独立验证页面标记或设计。页面标记直接在既有 index.html 修改，无第二份模板；不得用旧分支的页面、CSS 或整棵树覆盖。

首次源码集中的历史记录见 [verification.json](verification.json)，导入/维护基线见 [regression-status.json](regression-status.json) 和 [关卡审查](../../docs/inlet-playability-qa/README.md)；这些记录不覆盖后续Windowlife功能修改，当前审查范围见 [save-duration-review.json](../../docs/windowlife-leaf-qa/save-duration-review.json)。根已提供efc55fa的真实电脑Inlet布局通过，并随后正常UI通关第二/第三湾、零损失零重试；使用了频繁暂停与预测，不能推断连续实时难度。真实手机、第三湾死亡重试与新版Windowlife原生输入/布局仍未验，不能称全UI通过。

## 独立审计与报告副作用

- `npm run audit:integration --prefix tools/preview-bundles -- --head <拟合入commit或tree>` 默认复核首次主干整合的历史范围。后续改动传入单独已审范围，例如 `--scope docs/moss-feedback-qa/scope.json`（路径相对仓库根），不改写历史integration-scope.json。检查只读保护全部既有文件、45款/99登记入口和未批准修改的游戏；只有明确列出的同游戏文件可更新，入口不能删除。它独立于默认可持续回归，不把旧tree锁用于阻止正常源码演进。
- `npm run audit:forecast --prefix tools/preview-bundles` 默认只读输出并断言安全预测实际闭合；加 `-- --write` 写新 forecast-current.json，不覆盖历史 forecast-audit.json。旧字段 collision:326 是所有非 safe 分类，当前称 nonSafe，不能说326次真实碰撞。
- `npm run audit:routes --prefix tools/preview-bundles` 默认只读重放；加 `-- --write` 明确更新关卡 report.json。
- `npm run audit:layout-historical --prefix tools/preview-bundles` 复跑 efc55fa 布局修复的历史不变性审计，锁旧 SHA/属性/CSS且会重写其 report.json，已移出默认回归。未来合法开发改变 bundle 后，该历史审计失败是预期现象；旧 before-contract.json/report.json 原样保留。

## 仍留在历史分支的资料

Windowlife 的离线图、render-offscreen.mjs、旧 model-report/测试日志，以及 Inlet 的原 boundaries.json/旧 forecast-audit.json 等旧版本档案没有复制；原分支和固定来源链接仍保留。主干拟合入树带齐当前运行所需源码、全部21份新增测试/辅助文件、构建工具、审计脚本与文字夹具。Quiet的历史对照只带测试所需源码片段与JSON，不带PNG/GIF/压缩轨迹/日志；完整公开档案保留在 [统一候选固定提交](https://github.com/yydshly/classic-games-atlas/tree/cda0ee3a43224eb6eab432ed3b64fc4e784dcea3/docs/quiet-gentle-home-qa)。Quiet 原 fall-marker 的旧 view/feedback 不重新导入，当前预览已有对应能力且继续改进。
