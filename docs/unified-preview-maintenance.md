# 同一主干中的游戏、源码与维护检查

本文件记录发布前主干拟合入状态，不构成线上部署声明。基线main为`efc55fa253cbc0bc1435a4b69537bcc55d23a95b`，来源候选为`cda0ee3a43224eb6eab432ed3b64fc4e784dcea3`。用户要求所有已开发游戏留在同一主干，临时候选仅用于开发；不是要求每次改进新增入口或改存档key。当前未更新远端main、未部署。

## 本次累积整合范围

main原有8189个文件全部保留。仅现有`experiments/windowlife-request-preview/index.html`更新为叶影玩法；另外加入维护必需源码、构建、测试、审计及文字夹具。首页、目录数据、45款/99登记入口、其他游戏的全部文件和冻结v1档案保持原blob。完整增改清单见 [integration-scope.json](../tools/preview-bundles/integration-scope.json)，执行证据见 [主干拟合入检查](main-integration-qa/README.md)。不使用旧候选整棵树覆盖main。

| 项目 | 当前运行与源码 | 来源及维护状态 |
| --- | --- | --- |
| Inlet期限/ETA | `experiments/inlet-deadline-preview/index.html`与同目录`source/` | 固定来源[01dd7d48](https://github.com/yydshly/classic-games-atlas/commit/01dd7d48430a740a13170be703232567a4ba9e10)；期限、布局与合法路线检查均集中，运行HTML保持main原字节，正式v3不改。 |
| Windowlife叶影 | `experiments/windowlife-request-preview/index.html`与同目录`source/` | 原请求片段来源[c416a7e2](https://github.com/yydshly/classic-games-atlas/commit/c416a7e25b0117e2a80c287181a02c8e22e2b86c)，叶影/长等待保存/Esc修复来源[7ec39bd9](https://github.com/yydshly/classic-games-atlas/commit/7ec39bd9d83d899d17439681c443ccc1e246e1e7)。保留同一游戏、同一隔离key与v1旧档恢复；正式三日日常不改。 |
| Quiet轻轻回窝 | `experiments/quiet-workbench-preview/`中的运行模块直接为源码 | 落点来源[dcd3f4e2](https://github.com/yydshly/classic-games-atlas/commit/dcd3f4e2cffe2dab467af9b4082f46f6817043bc)，当前r3运行内容不变。全部新增测试及所需历史源码片段/JSON纳入；不复制旧physics/view覆盖当前版本。 |

逐文件原始来源及导入适配见 [sources.json](../tools/preview-bundles/sources.json)，当前运行命令见 [构建检查说明](../tools/preview-bundles/README.md)。旧`verification.json`、`regression-status.json`与各早期QA报告是有固定基线的历史证据，不是当前全部UI验收状态。正常开发只要求当前源码/JS/CSS一致和行为回归；历史SHA锁单独运行。

## 留存与可发现性

必要维护材料随运行代码一起进入最终main；不把临时候选当成长期唯一源码库。历史离线PNG、动画、压缩轨迹和日志不在本次main范围，仍可按 [统一候选固定提交](https://github.com/yydshly/classic-games-atlas/tree/cda0ee3a43224eb6eab432ed3b64fc4e784dcea3/docs/quiet-gentle-home-qa) 追溯。测试所需文字源码片段及JSON已选择性带入。

三项近期实验的HTML已存在于main，各自可通过直接URL定位，但未登记在45款/99入口清单，也未找到main本地HTML/Markdown的入链：`experiments/inlet-deadline-preview/`、`experiments/windowlife-request-preview/`、`experiments/quiet-workbench-preview/`。后续应建立清楚的实验导航，保留全部现有作品入口，不增加游戏计数；本次不随意改首页。

## 已有证据与剩余质量门槛

根已提供Inlet布局及第二/第三湾真实电脑UI通关证据；频繁暂停与预测不证明连续实时难度。Quiet r3的两项桌面问题已有真实复验。叶影的模型、DOM、存档、Canvas指令与离线图审查仍不能代替原生浏览器输入/滚动、实体手机或陌生玩家体验。云浏览器和代理拒绝路径未重试。
