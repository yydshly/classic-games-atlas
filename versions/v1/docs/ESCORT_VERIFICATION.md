# 街巷护送 · 验收记录

本轮先打磨质感，保留8关原创纵深清关护送规则。[视觉评审与真实对比](ESCORT_VISUAL_REVIEW.md)记录角色、四环境、灯车、反馈、界面和实际迭代。截图不是原商业游戏画面；原创素材由imagegen辅助制作，[提示和文件指纹](escort-qa/art-prompts.json)明确来源。技术通过不等于用户认可质感，本轮完成后交回评审，不开始第35款。

## 保留的有效规则证据

- [39组核心](escort-qa/logic.json)与[8关原始资源模型](escort-qa/strategy.json)：纵深、连击窗口、每目标一次接触、预警、闪步中段保护/有限耐力/包围脱离、有限恢复、灯车路径/路口、双方死亡、110秒、暂停、存档、30/60/144Hz及长帧限幅。隔离规则夹具与正常战役分开。
- 规则引擎与关卡数据保持功能提交`5df2624f7fb67986e34bb4afb12c4d1aecedbf11`原样。原始公开版[8关真实输入](escort-qa/public-browser/report.json)、[24组界面](escort-qa/public-ui/report.json)、[24字段重放](escort-qa/public-replay.json)、[直接刷新](escort-qa/public-refresh.json)和[248文件核对](escort-qa/public-integrity.json)保留。
- 首次界面等待断言和发布回归中一次旧Prism脚本503均保留[迭代记录](escort-qa/iteration-notes.json)、原报告与200/哈希匹配复查。没有删除失败尝试或伪称首次全部通过。

## 当前美术版本的本地验证

- [首轮美术8关/触屏](escort-qa/visual-v2/report.json)及[24组界面](escort-qa/visual-v2/ui-report.json)通过；实景审视发现标题断行和灯车风格问题后继续修改。
- [最终本地实景流程](escort-qa/visual-v3/report.json)：普通120自身/100灯车/100耐力/2灯露、60Hz实时1倍速、自然下一关与解锁，8关全胜、24段/59名来敌，141次出手、1149条实际输入，最低游戏/实耗比0.970。截图过程中游戏照常推进，无暂停规划、战斗值或时间/结果写入。15项不变量逐次成立；[24字段独立精确重放](escort-qa/visual-v3/replay.json)一致。
- 实际开场、晨街战斗、雨巷、夜岸、终章与手机画面已人工审视；图集、透明边缘、脚下位置、前后遮挡、标题、控件和灯车材质已有两轮迭代。[实景对比图](escort-qa/visual-v3/review-board.png)及原始截图完整保留。
- [保留与隐私](escort-qa/retention.json)：旧33款代码、72项/10组/71来源保留；34款/398关章，253运行文件。无新增软件、付费、账户、凭据、外部运行依赖或商业素材。

## 公开部署

真实试玩：[街巷护送](https://yydshly.github.io/classic-games-atlas/games/escort/)。美术功能提交`8415cfbe824b2179fa03218bbef93ac9d9edbffc`，[Pages构建38997734294](https://github.com/yydshly/classic-games-atlas/actions/runs/38997734294)成功，HTTPS与main根目录发布。仅更新本项目，GitHub noreply署名。

- [公网实景与8关实际操作](escort-qa/public-final/report.json)确认4张WebP正式美术素材已真实加载，普通120/100/100/2资源、实时60Hz1倍速、自然解锁，8关全胜，136次出手/155次命中/967条输入，24段/59名来敌，最低游戏/实耗比0.962。没有战斗值/时钟/结果写入或暂停规划，15项不变量成立，[24字段独立精确重放](escort-qa/public-final-replay.json)一致。
- [公网24组界面](escort-qa/public-final-ui/report.json)检查教程/锁关、三连、有限闪步/恢复/车修复、死亡/终态/重试、暂停/失焦、坏/伪造/拒绝存储、键盘与多指、6种屏宽。真实触屏首关与素材加载一起验证。
- [公网直接刷新](escort-qa/public-final-refresh.json)：实际方向闪步消耗20耐力，在攻击阶段刻度51附近重载，实际保存66；24字段与生产引擎独立重放一致，旧按住操作释放，暂停不推进，续玩获胜。
- [公网34入口与发布回归](escort-qa/public-final-release.json)通过，前作回声走廊首关剩92光息/8光匣；本作精确恢复与原生多指方向闪步后正常获胜。[72项图鉴](escort-qa/public-final-atlas.json)搜索/别名/类型与分组/空结果/全部详情/键盘/6宽度通过；此报告复用37ab85a下已完成的根页验收，编码改动后根页/数据/封面字节未变，并由最终文件核对确认。
- 发布回归的末段新页面进入曾有30秒超时；[完整初次报告](escort-qa/initial-final-release.json)保留34入口、前作和恢复的已通过记录，仅续验未完成的[390×844原生多指场景](escort-qa/public-final-native-followup.json)，确认4图加载并普通通关。未重复或丢弃前面已通过的流程。
- [253运行文件](escort-qa/public-final-integrity.json)全部HTTP200、SHA-256与美术功能提交逐一相同；本次核对网络事件0。上述本轮浏览器报告没有控制台错误、失败请求或HTTP4xx/5xx资源。

[公网开场](escort-qa/public-final/opening-desktop.png)、[晨街](escort-qa/public-final/dawn-combat.png)、[雨巷](escort-qa/public-final/rain-combat.png)、[夜岸](escort-qa/public-final/night-canal.png)、[终章](escort-qa/public-final/night-gate.png)、[手机](escort-qa/public-final/mobile-combat.png)均来自实际网站普通输入，已经逐张审视。生成素材不替代游戏实景；本地实景对比图另保留在视觉评审页。

最终证据提交补充文档/公开产物和测试中的素材加载断言，253运行文件保持美术功能提交原样。交付前继续核对最终远端/main/Pages完整SHA，以及253运行文件与文档/实景图的线上实际字节。功能验收复用本次字节完全相同的运行版本，避免重复已通过的游戏流程；最终完整SHA与构建链接随交付提供。


## 实际边界

现有Windows Chromium、Node与Python Playwright。实体手机、Safari/Firefox、读屏认证与人工难度研究未覆盖；旧33款完整战役未全部重跑，保留代码、入口及前作首关回归。采用有限姿态精灵和分层绘画场景，并非商业规模逐帧动画或完整3D；无跳跃、投技、装备经济或联网。经典资料既有核读缺口按图鉴标注。风格与手感是否达到期待，待主对话/用户评审。
