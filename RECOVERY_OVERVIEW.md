# 当前阶段归档：第 35–40 款恢复材料

本页写于 2026-10-18 UTC，是本次归档说明，不是恢复出的历史验收报告。本分支仅保存候选源码、原始记录与新增校验结果，未合并或部署候选游戏。

## 主线与归档入口

- 本次实际核对远端 `main`：`c22235a38c3663866b4b949876b9743c7a0ee4fa`。
- 已发布目录仍为 **34 款、398 关**；主页、目录数据、既有游戏源码和素材均不修改。
- 阶段分支：`archive/recovery-stage-20261018`。GitHub Pages 发布源仍为 `main:/`。
- [阶段材料与复验方法](archive/recovery-stage-20261018/README.md)
- [恢复包原始总览（完整保留）](archive/recovery-stage-20261018/recovery-v9/RECOVERY_OVERVIEW.md)
- [逐文件导入完整性记录](archive/recovery-stage-20261018/ARCHIVE_INTEGRITY.json)

此前云端开发目录不可读，原因未确定。恢复版来自可追溯的原始写入/读取记录，不能视为原候选全部材料的完整副本。原始缺失材料未凭记忆补写，也未生成图片或视频替代旧证据。

## 逐款状态与缺失

| 编号 | 候选 | 本分支保存内容 | 未解决事项 / 验收门槛 |
| --- | --- | --- | --- |
| 35 | 晴湾篮场 court | [早版完整包](archive/recovery-stage-20261018/court35-v1/)；[后期无障碍读取记录](archive/recovery-stage-20261018/recovery-v9/accessibility/PROVENANCE.md)独立保存 | 后期键盘、小屏、焦点等变化尚未合并；最终完整 HTML、后期完整事件测试未恢复。早版不能代表中断前最终版本。 |
| 36 | 雨街修理所 repair | [七个 runtime 及来源说明](archive/recovery-stage-20261018/recovery-v9/repair/) | UI 是作者较早版本，后期 CSS 独立保存、未合并；部分事件测试、QA、文档、媒体和原 manifest 缺失。 |
| 37 | 潮原纪事 civic | [三份 runtime 与若干脚本](archive/recovery-stage-20261018/recovery-v9/civic/PROVENANCE.md) | 缺 levels、index、CSS、完整 renderer；不能完整运行，不加入可玩目录。 |
| 38 | 云岬游乐园 coaster | [七个 runtime](archive/recovery-stage-20261018/recovery-v9/coaster/RECOVERY_VALIDATION.md)，与记录的历史冻结 SHA 完全一致 | 原 random/layout/isolation 测试、完整文档、QA/媒体/manifest 缺失；真实浏览器和手机未验收。 |
| 39 | 林野杯赛 kart | [七个 runtime](archive/recovery-stage-20261018/recovery-v9/kart/RECOVERY_VALIDATION.md)，与记录的历史冻结 SHA 完全一致 | 与 38 相同类别的历史材料缺失；真实浏览器、设备输入、视觉和真人难度未验收。 |
| 40 | 草甸联赛 meadow | [未完成开发快照](archive/recovery-stage-20261018/recovery-v9/meadow/) | 历史恢复复验为 7/8 场胜，第四场 3:3 未达标、末关 16:0 偏易；守门/防守平衡和恢复边界待处理。不当作完工，不加入可玩目录。 |

## 本次验证边界

两份 ZIP 的字节数与 SHA-256 均匹配交接记录，全部 ZIP CRC 通过。恢复包 103 文件（102 清单项加 RECOVERY_STATUS.json），早版包 23 文件（22 manifest 项加 manifest 本身）；全部导入文件逐字节保留，使用独立属性规则禁止 Git 文本换行转换。

本次 Node 引擎、存档及模拟 DOM 控制器复验的实际命令、退出码、日志与执行时间见 [LOCAL_VALIDATION.json](archive/recovery-stage-20261018/verification/LOCAL_VALIDATION.json)。37 仅运行独立存档测试；40 未在本次重跑，表中结果明确来自恢复包记录。Node 替身不等于真实浏览器、触控设备、视觉或性能验收。

## 下一阶段

1. 35/36 逐条对照来源记录，处理后期 UI/无障碍改动，保留前后哈希和每条差异依据，完成新的完整候选冻结。
2. 37 继续找回缺失原文；如果另行重新实现，必须标为新实现，不能伪称恢复。40 修复策略失败、守门/防守平衡及恢复边界后重新评估。
3. 对完整候选逐款开展真实浏览器键盘/指针输入、自然解锁、胜负/重试、刷新恢复、暂停/焦点和横竖屏布局测试，保留控制台、资源检查与实际截图/录像；实体手机与模拟移动视口分别标注。
4. 报告可合并范围，由主任务协调合并。通过单款验收后才更新可玩目录/计数、合并主线并检查 Pages 发布；本分支不是发布批准。

独立分支保留主线祖先与全部原文件，可继续审核、逐款提取或撤回；本次未重写历史、未强推、未更改仓库可见性或授权。
