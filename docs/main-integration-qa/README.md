# 主干拟合入验证：所有作品保留

这是发布前本地拟合入记录。基线main `efc55fa253cbc0bc1435a4b69537bcc55d23a95b`，来源候选 `cda0ee3a43224eb6eab432ed3b64fc4e784dcea3`。远端main未更新，未触发Pages；早先被拒的单HTML更新不在本轮执行。

## 精确范围

仅修改现有Windowlife实验运行HTML；增加90个维护文件，包含17个集中source文件、21个测试/辅助文件、13个构建与范围检查文件、39个文字审计/夹具/维护记录。完整路径清单见 [integration-scope.json](../../tools/preview-bundles/integration-scope.json)。现有45作品、99登记版本入口、首页、目录、其他游戏及2693个冻结v1文件均保留。不新增入口、不改变游戏数量或存档key。

历史图片、动画、压缩轨迹与日志等67个候选文件未带入。测试所需历史源码片段和JSON已纳入；完整QA档案可从 [固定候选提交](https://github.com/yydshly/classic-games-atlas/tree/cda0ee3a43224eb6eab432ed3b64fc4e784dcea3/docs/quiet-gentle-home-qa) 查看。旧报告的图片hash/本地路径只描述当时证据，不是本次HTML依赖。

## 可复验命令

```sh
npm ci --prefix tools/preview-bundles --ignore-scripts --cache /tmp/atlas-preview-npm-cache
npm test --prefix tools/preview-bundles
node tests/play-recent.test.mjs
npm run audit:forecast --prefix tools/preview-bundles
npm run audit:routes --prefix tools/preview-bundles
npm run audit:layout-historical --prefix tools/preview-bundles
npm run audit:integration --prefix tools/preview-bundles -- --head HEAD
```

默认103项回归不写QA JSON；目录/近期记录测试共10组。forecast/routes默认只读，加`--write`才生成报告；历史layout审计会重写自身report.json，须按固定基线解读。integration审计只读本地Git对象，针对本次范围保护全部既有文件及登记入口，并用5种内存变异检查误删/替换会被拒绝；它独立于正常可持续源码回归，未来合法主干整合需重新评审范围。

额外5份Quiet专项测试及所需文字夹具也已纳入并独立运行：`node --test tests/quiet-gentle-home.test.mjs tests/quiet-lamp-envelope.test.mjs tests/quiet-portrait.test.mjs tests/quiet-readability.test.mjs tests/quiet-temporal.test.mjs`。不加`--write`，避免生成离线轨迹。

构建器在仓库外两个独立目录重建，比较两次JS/CSS/HTML及拟合入内容的SHA256。独立重建的是JS/CSS，HTML比较借用当前页面标记外壳，不代表独立验证页面设计。详细执行结果及hash见 [report.json](report.json)。

## 后续交付和质量边界

经明确批准将这棵累积树更新main后，现有自动Pages流程会公开发布运行更新与文本维护文件；本地准备本身不会触发Pages。不可只发布bundle而将必要源码/测试长期留在候选，亦不可用旧候选整树覆盖之后的main成果。若main变化，必须重新计算累积diff与保护检查。

三项实验已存在，但缺现有导航入链，列为后续可发现性问题；当前不改首页。新版Windowlife原生Tab/Esc、触控握柄、lostpointercapture、绘图与滚动仲裁、实体手机和创作体验仍待真实UI验收。模型/DOM/构建检查不证明好玩、审美达标或浏览器帧率。
