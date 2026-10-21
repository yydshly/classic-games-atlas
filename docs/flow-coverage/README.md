# 40项关键流程覆盖与剩余交付清单

40项总目录；本轮活动范围36项，35/36/37暂停、纸翼保留既有阶段。活动项中36项有至少一条核心目标证据；这不是全部关卡或成品通过率。

“已验”只指附证据中的有限流程；缺证据不等于有bug。推荐版本是当前优先检查的候选入口，全部仍未完成整体品质验收。历史报告的提交、操作辅助及未验范围保持原样，不声称今天重跑了40款；旧v1、模型、DOM桩、故障注入及离屏图不移作当前UI成绩。

[可筛选网页](index.html) · [结构化数据](coverage.json) · [来源Git对象清单](source-manifest.json)

[本轮截图时序与执行恢复说明](return-navigation-notes.md)

[全局后续关段清单](later-stage-inventory.html) · [清单数据](later-stage-inventory.json)；仍缺0款0个后续关段/赛场的成功或合法完赛证据，独立分支另列。

[此前五款参考与体验差距](reference-experience.html)

|编号/作品及推荐版本|启动|核心目标|失败/重试|终局/下一关与证据|
|---|---|---|---|---|
|01 堡垒防线 [v2 候选](../../versions/v2/games/fortress/)|已验有限流程|已验有限流程：旧首图基地败/次图双车胜保留；当前首图单车普通UI66.6833秒清六敌1860分，基地3/出击3|已验有限流程：失败整备复位；刷新仅留选择和最好|已验有限流程：首图单车自然胜利、0-1最好原生保存；刷新仅回整备且纪录保留，短重赛正常；坐标策略非真人手感 [1](../../docs/fortress-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/fortress-independent-qa/) / [3](../../docs/fortress-pause-followup-qa/) / [4](../../docs/new-player-journey-qa/)|
|02 爆破迷宫 [v2 候选](../../versions/v2/games/maze/)|已验有限流程|已验有限流程：两原创短图均有自然胜利；此前第二图64.85秒/48我方弹/36连锁，强只读策略辅助|已验有限流程：胜场刷新保持，干净新局通过；既有三败/重试保留|已验有限流程：第二图自然胜利/原生纪录刷新/同图空弹火新局通过；首图既有成功，非多人体验或全策略验收 [1](../../docs/maze-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/maze-v2-qa/LAYOUT_PUBLIC.md) / [3](../../docs/maze-first-win-qa/) / [4](../../docs/maze-later-qa/) / [5](../../docs/return-navigation-qa/)|
|03 星泡航线 [v2 候选](../../versions/v2/games/starline/)|已验有限流程|已验有限流程：两图清场1260/1460分|已验有限流程：主动低效触底后重试，最好保留|已验有限流程：两图开放，恢复飞行回出手前 [1](../../docs/starline-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/return-navigation-qa/)|
|04 光轨砖阵 [v2 候选](../../versions/v2/games/prism/)|已验有限流程|已验有限流程：正常鼠标强辅助顺序完成原12关；第1关为必要解锁前置，2–12此前补证|已验有限流程：自然失球失败与重试；首胜解锁第二关|已验有限流程：2–12逐关自然胜利与干净下一关；第12关最终反馈/无第13关/重试刷新及12关纪录保留通过 [1](../../docs/prism-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/prism-first-win-qa/) / [3](../../docs/prism-later-qa/) / [4](../../docs/return-navigation-qa/)|
|05 仓格计划 [v2 候选](../../versions/v2/games/crate/)|已验有限流程|已验有限流程：三题正常解到2/2，15/19/15步|设计不适用：无失败弹窗；胜后撤销重做/重玩已验|已验有限流程：继续下一仓和跨刷新撤销已验 [1](../../docs/crate-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/return-navigation-qa/)|
|06 山口守望 [v2 候选](../../versions/v2/games/pass/)|已验有限流程|已验有限流程：缚索四波胜；重弩第二波败|已验有限流程：重新布防230金/12城门/空场|已验有限流程：只有一短图，刷新保留最好不续战 [1](../../docs/pass-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/return-navigation-qa/)|
|07 风行小径 [v2 候选](../../versions/v2/games/trail/)|已验有限流程|已验有限流程：正常 UI 连续三程胜利；第2/3程各18.09秒、3生命、3果实|已验有限流程：另一个新局43.223秒自然体力总失败→重试与暂停刷新|已验有限流程：三段正常胜利与逐段结算刷新、下一程清场、末段无第四程、重试第3程通过；固定辅助路线，非全收集/真机验收 [1](../../docs/trail-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/trail-save-qa/) / [3](../../docs/trail-main-flow-qa/) / [4](../../docs/trail-later-qa/) / [5](../../docs/return-navigation-qa/)|
|08 夜航拾光 [v2 候选](../../versions/v2/games/lantern/)|已验有限流程|已验有限流程：两图各有自然胜利；此前第二图13.3244秒/46点/3命/2反制/0死亡|已验有限流程：次图失败重试3命，刷新回该图准备|已验有限流程：第二图收齐成功、刷新保留最好/所选图、同图干净重试与两图菜单通过；策略脚本辅助 [1](../../docs/lantern-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/lantern-later-qa/) / [3](../../docs/lantern-pause-semantics-qa/) / [4](../../docs/return-navigation-qa/)|
|09 云隙巡航 [v2 候选](../../versions/v2/games/cloud/)|已验有限流程|已验有限流程：两段各有自然胜利；此前第二段53.4313秒/6060分/14敌/3血，集中火力鼠标策略辅助|已验有限流程：失败重试3命2风幕/0分|已验有限流程：第二段真实清编队精英、刷新最好/干净重试/两段菜单通过；本次未切换散射 [1](../../docs/cloud-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/cloud-later-qa/) / [3](../../docs/cloud-pause-followup-qa/) / [4](../../docs/return-navigation-qa/)|
|10 晶簇花园 [v2 候选](../../versions/v2/games/garden/)|已验有限流程|已验有限流程：两题公开解各2步成功|已验有限流程：自然6步耗尽180分败；重试原盘且460纪录留|已验有限流程：两题开放，无解锁链；动画刷新未验 [1](../../docs/garden-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/garden-loss-qa/) / [3](../../docs/return-navigation-qa/)|
|11 青藤回廊 [v2 候选](../../versions/v2/games/vine/)|已验有限流程|已验有限流程：两图8/8与10/10后归门胜|已验有限流程：首图自然撞壁后同种子重试0步，身体/青芽/rng复位，暂停刷新和新方向通过|已验有限流程：两图开放，非16关全通 [1](../../docs/vine-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/vine-loss-qa/) / [3](../../docs/return-navigation-qa/)|
|12 花笺连线 [v1 既有原型](../../games/petal/)|已验有限流程|已验有限流程：原生提示/正常点击顺序完成1–20；1–9作必要前置，10–20此前补证|已验有限流程：v1第2页正常4次无通路同图案配对耗错失败；重写资源/棋盘复位，原生首纪录与2页解锁跨刷新保留|已验有限流程：10–20全部自然清页；下落/左移模式、稳定刷新、20页终局/无21页/重读与原生纪录保留通过 [1](../../docs/petal-v1-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/petal-loss-qa/) / [3](../../docs/petal-later-qa/) / [4](../../docs/petal-pause-followup-qa/) / [5](../../docs/return-navigation-qa/)|
|13 星砂勘探 [v2 候选](../../versions/v2/games/sand/)|已验有限流程|已验有限流程：浅/深两盘有提示解完安全格|已验有限流程：主动点已推知雷格失败，同盘重试/另开新盘|已验有限流程：两档独立进度，非全部种子证明 [1](../../docs/sand-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/return-navigation-qa/)|
|14 落星弹庭 [v2 候选](../../versions/v2/games/pinfall/)|已验有限流程|已验有限流程：两庭参考角度自然胜1555/1485|已验有限流程：首庭6球自然耗尽/余3目标，直接重试5发2能力0分，1555原生最好跨刷新保留|已验有限流程：能力整球回退及最好保留，两庭开放 [1](../../docs/pinfall-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/pinfall-loss-qa/) / [3](../../docs/return-navigation-qa/)|
|15 钢岚突进 [v2 候选](../../versions/v2/games/gale/)|已验有限流程|已验有限流程：两场清装置走出口200分|已验有限流程：首图原地承受15命中/3死亡自然败；重试3命5甲2脉冲、满敌/空弹体，暂停刷新再继续通过|已验有限流程：修后只复验生命周期，通关属修前同引擎 [1](../../docs/gale-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/gale-loss-qa/) / [3](../../docs/return-navigation-qa/)|
|16 弯道邮差 [v2 候选](../../versions/v2/games/post/)|已验有限流程|已验有限流程：此前三场合法完赛第2/3/3名保留；当前普通UI三场各一次rank1自然胜，14.90/18.9917/17.775秒|已验有限流程：自然95秒超时面板直接重赛：新倒计时/0用时/零结算，暂停刷新与新起跑通过，超时不解锁|已验有限流程：三场严格第一名/16闸两圈/零复位、三纪录与末场第一名刷新通过；50ms只读避车策略非人手驾驶 [1](../../docs/post-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/post-main-flow-qa/) / [3](../../docs/post-loss-qa/) / [4](../../docs/post-later-qa/) / [5](../../docs/post-independent-qa/) / [6](../../docs/return-navigation-qa/)|
|17 灯塔小队 [v2 候选](../../versions/v2/games/beacon/)|已验有限流程|已验有限流程：21天归港7地点/3遭遇胜|已验有限流程：付代价撤退与透镜遗失败→确认重开已验|已验有限流程：航程总结及刷新/再次行动已验 [1](../../docs/beacon-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/beacon-v2-loss-qa/) / [3](../../docs/return-navigation-qa/)|
|18 风铃绳旅 [v2 候选](../../versions/v2/games/chime/)|已验有限流程|已验有限流程：既有首题成功；此前正常第2/3题10.1375/8.1000秒，各3星|已验有限流程：自然失败及重试初态已见|已验有限流程：三题均已有自然成功；此前第2→3清场/刷新、末题无第4/重走与2份原生纪录保留；时窗脚本辅助 [1](../../docs/chime-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/chime-later-qa/) / [3](../../docs/return-navigation-qa/)|
|19 溪谷守芽 [v2 候选](../../versions/v2/games/brook/)|已验有限流程|已验有限流程：已有首场1070分；此前第二场1×70.983秒1043分10/10，3次根触发|已验有限流程：此前两场自然败；失败重试空场230露|已验有限流程：两场各有自然胜利；第二场最终反馈/无第三场/重玩刷新与新纪录保留通过，非全部策略验收 [1](../../docs/brook-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/brook-first-win-qa/) / [3](../../docs/brook-later-qa/) / [4](../../docs/return-navigation-qa/)|
|20 潮汐珠径 [v2 候选](../../versions/v2/games/tide/)|已验有限流程|已验有限流程：两图各有自然成功；此前第二图70.2333秒/1657分/61发/潮量42/余珠0，原生滑杆与暂停强辅助|已验有限流程：失败重试初盘及暂停飞珠刷新已验|已验有限流程：第二图封口一次/清余珠/单结算与刷新原生最好保留通过；首图已有证据，原鼠标路径与无辅助手感未验 [1](../../docs/tide-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/tide-first-win-qa/) / [3](../../docs/tide-later-qa/) / [4](../../docs/return-navigation-qa/)|
|21 纸翼投递 [v2 阶段保留](../../versions/v2/games/paper/)|已验有限流程|已验有限流程：q2首关一发及第二关多次低效后重试成功|已验有限流程：保留既有失败与重试证据，不重启路线|已验有限流程：当前阶段保留，不追加细节验收 [1](../../docs/paper-quality-qa/PUBLIC_BROWSER_QA.md)|
|22 云港调度 [v2 候选](../../versions/v2/games/harbor/)|已验有限流程|已验有限流程：三关逐回合胜，二关两方案|已验有限流程：首关23回合货物逾期败→重试|已验有限流程：三关后无第四；终局清会话为设计 [1](../../docs/harbor-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/harbor-storage-qa/) / [3](../../docs/return-navigation-qa/)|
|23 四季小田 [v2 候选](../../versions/v2/games/farm/)|已验有限流程|已验有限流程：连续三章携带至11天30币结局|已验有限流程：第二章超期败→章首重试不丢前章|已验有限流程：终局刷新与查看农场；动画多用正常跳过 [1](../../docs/farm-v2/PUBLIC_BROWSER_QA.md) / [2](../../docs/farm-storage-qa/) / [3](../../docs/return-navigation-qa/)|
|24 遗迹灯火 [v2 候选](../../versions/v2/games/ruins/)|已验有限流程|已验有限流程：三房取钥/机关/破甲并实际归门|已验有限流程：首房自然0血败→房间重试/刷新|已验有限流程：第三房清怪后仍须归途E才结算 [1](../../docs/ruins-v2/PUBLIC_BROWSER_QA.md) / [2](../../docs/ruins-v2-qa/LAYOUT_PUBLIC.md) / [3](../../docs/return-navigation-qa/)|
|25 节拍果园 [v2 候选](../../versions/v2/games/orchard/)|已验有限流程|已验有限流程：两场各60活动秒自然完成，无分数胜门槛|设计不适用：设计无失败；再来一场重置，最好分独立|已验有限流程：39分霜中恢复和自然结束已验，误核未验 [1](../../docs/orchard-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/orchard-frost-recovery-qa/) / [3](../../docs/return-navigation-qa/)|
|26 山径快递 [v2 候选](../../versions/v2/games/courier/)|已验有限流程|已验有限流程：两路360/432米成功并正确转弯|已验有限流程：首路金色窗口正常按错right，96米自然败；重跑清来信/伤害/转向锁，暂停刷新再继续通过|已验有限流程：转向锁定跨刷新，两路开放 [1](../../docs/courier-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/courier-loss-qa/) / [3](../../docs/return-navigation-qa/)|
|27 街角商旅 [v2 候选](../../versions/v2/games/venture/)|已验有限流程|已验有限流程：历史三场两胜一负保留；当前修后灯会正常UI12轮净资产1955:625胜，含rng只读规划强辅助|已验有限流程：负局终态刷新与确认/取消重开已验|已验有限流程：当前灯会完整胜利、终态原生JSON精确刷新、确认重开干净；旧三场修前与当前单场分开 [1](../../docs/venture-v2/PUBLIC_BROWSER_QA.md) / [2](../../docs/venture-storage-qa/) / [3](../../docs/venture-independent-qa/) / [4](../../docs/venture-player-ux-qa/) / [5](../../docs/return-navigation-qa/)|
|28 云岛工坊 [v2 候选](../../versions/v2/games/island/)|已验有限流程|已验有限流程：同地图两桥路线各完成三章|已验有限流程：第三章需求失衡败→章首恢复城市|已验有限流程：跨章库存/拨款不重复，终局已验 [1](../../docs/island-v2/PUBLIC_BROWSER_QA.md) / [2](../../docs/island-storage-qa/) / [3](../../docs/island-pause-semantics-qa/) / [4](../../docs/return-navigation-qa/)|
|29 星环落块 [v2 候选](../../versions/v2/games/orbit/)|已验有限流程|已验有限流程：自然180秒6106分/38行/80枚一次结算|已验有限流程：原井满失败重开；新局空盘/0分/0结算|已验有限流程：终局刷新回ready，最好保留；非终局面板持久 [1](../../docs/orbit-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/orbit-natural-end-qa/) / [3](../../docs/orbit-first-speed-qa/) / [4](../../docs/return-navigation-qa/)|
|30 风庭对决 [v2 候选](../../versions/v2/games/duel/)|已验有限流程|已验有限流程：纠正输入驱动后正常连续八庭胜利，2–8各一次；旧首庭两次辅助驱动败局保留|已验有限流程：自然失败与重赛资源重置|已验有限流程：八庭自然胜利/逐庭干净衔接/终庭无第9/8份原生纪录与终庭重赛刷新通过；强反应策略非真人手感 [1](../../docs/duel-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/duel-first-win-qa/) / [3](../../docs/duel-later-qa/) / [4](../../docs/return-navigation-qa/)|
|31 苔原远征 [v2 候选](../../versions/v2/games/expedition/)|已验有限流程|已验有限流程：三段正常UI120/140/160秒连续胜|已验有限流程：此前120秒自然失守/含未完成建设招募，终态刷新和直接/确认重开复位通过|已验有限流程：已有三段胜与终态保存；新补首段失守/取消重开，后两段失败未验 [1](../../docs/expedition-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/expedition-v2-end-qa/) / [3](../../docs/expedition-loss-qa/) / [4](../../docs/expedition-pause-semantics-qa/) / [5](../../docs/return-navigation-qa/)|
|32 星羽同伴 [v3 候选](../../versions/v3/games/feather/)|已验有限流程|已验有限流程：v3新旅途至固定终挑战结局，两种策略|已验有限流程：失败回营可再准备，成长保留|已验有限流程：结局总结/自由出行/刷新及v2承接已验 [1](../../docs/feather-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/feather-journey-qa/) / [3](../../docs/return-navigation-qa/)|
|33 回声走廊 [v2 候选](../../versions/v2/games/echo/)|已验有限流程|已验有限流程：既有首段成功；此前自由选第2段后正常下一段到第3段，均持钥撤离100光息/余2匣|已验有限流程：第二段败刷新/当前段重试不回首段|已验有限流程：后两段真实撤离、结算刷新、第三段无第四段、重试第三段/刷新/新行动通过；强暂停只读重放辅助，非连续无暂停三段 [1](../../docs/echo-v2-qa/PUBLIC_BROWSER_QA.md) / [2](../../docs/echo-continuity-qa/) / [3](../../docs/echo-later-qa/) / [4](../../docs/echo-player-ux-qa/) / [5](../../docs/return-navigation-qa/)|
|34 街巷护送 [v2 候选](../../versions/v2/games/escort/)|已验有限流程|已验有限流程：首/次/末街段护送胜1643/2040/1445|已验有限流程：第二段修前自然车0败→重试；标记修后胜|已验有限流程：第三段需护车到100%，结局刷新/从晨街重玩 [1](../../docs/escort-v2/PUBLIC_BROWSER_QA.md) / [2](../../docs/escort-storage-qa/) / [3](../../docs/return-navigation-qa/)|
|35 晴湾篮场 [v2 暂停回看](../../versions/v2/games/court/)|仅局部|仅局部：v2仅有限开局；v1首场8:6不能冒充v2|缺普通UI证据：v2完整失败/重试未验|缺普通UI证据：暂停开发，不补完整比赛 [1](../../docs/court-v2/README.md)|
|36 雨街修理所 [v2 暂停回看](../../versions/v2/games/repair/)|仅局部|仅局部：v2仅有限诊断/动作开局；v1两天不能移植|缺普通UI证据：v2完整经营日/失败待验|缺普通UI证据：停止追加优化，不重启 [1](../../docs/repair-v2-qa/README.md)|
|37 潮原纪事 [v2 暂停回看](../../versions/v2/games/civic/)|已验有限流程|已验有限流程：v2首章两种建田方案自然胜|已验有限流程：首章缺粮败/重试/刷新与第2章解锁|已验有限流程：已停止路线；2–8章未验，不继续执行 [1](../../versions/v2/games/civic/about.html)|
|38 云岬游乐园 [v2 候选](../../versions/v2/games/coaster/)|已验有限流程|已验有限流程：正常UI连续八园试车及20班载客全部达标；首园仅必要解锁前置|已验有限流程：首园原UI安全但低刺激方案，3班21人/收入336/口碑60自然败；重试与刷新恢复设计台，新试车无旧收益|已验有限流程：2–8园正常衔接到八园终局，无第9园；下一园空方案/刷新与8份原生纪录/重访通过；离线配方只参考 [1](../../versions/v2/games/coaster/comparison.html) / [2](../../docs/coaster-loss-qa/) / [3](../../docs/coaster-later-qa/) / [4](../../docs/return-navigation-qa/)|
|39 林野杯赛 [v2 候选](../../versions/v2/games/kart/)|已验有限流程|已验有限流程：既有原生赛程逐站选关，关闭游戏内弯道辅助后八站普通键盘脚本各一次第1；外部只读策略仍辅助|已验有限流程：v2首站辅助关/按住刹车，92秒自然超时；面板重试清旧结果/刹车，暂停刷新后新倒计时与加速通过|已验有限流程：八站assist=false/result.assisted=false，8新best与8旧assistedBest分离、末站重试刷新保持；非新档关闭辅助解锁链或人手无辅助 [1](../../versions/v2/games/kart/about.html) / [2](../../docs/kart-loss-qa/) / [3](../../docs/kart-later-qa/) / [4](../../docs/kart-independent-qa/) / [5](../../docs/return-navigation-qa/)|
|40 草甸联赛 [v2 候选](../../versions/v2/games/meadow/)|已验有限流程|已验有限流程：新原生档案普通输入连续八场自然终哨领先；比分7:1/3:1/10:1/7:1/5:0/8:1/13:1/6:3|已验有限流程：次场不输入74秒自然1:1平局失利→当前场重赛，首场纪录保留|已验有限流程：八场完整自然胜利、逐场干净衔接、最终冠军无第9、8份纪录及末场重赛暂停刷新通过；100ms作者策略非真人手感 [1](../../versions/v2/games/meadow/about.html) / [2](../../docs/meadow-main-flow-qa/) / [3](../../docs/meadow-later-qa/) / [4](../../docs/meadow-player-ux-qa/) / [5](../../docs/return-navigation-qa/)|

## 有界剩余清单

- **首条核心目标证据：**活动范围36项均已有至少一条核心目标证据。它只统计有限首条，包含明确标注的强辅助操作，不代表全部关卡、无辅助水平或成品验收。
- **分支及后续内容：**此前原列8项代表性失败/重试链均已逐项补证。每款仅验证记录所列路径，不代表全部失败原因或后段。
- **保留的覆盖边界：**13个指定独立胜利目标：已完成13，未完成0（其中具体工具阻塞0、尚未执行0）。本轮列出的四组13目标均已补证。所有完成均须按各报告的普通UI与强辅助边界判读，不等于真人或全模式成品验收。真实手机多指/性能、持续手感与策略自然性、音频听感/同步及审美耐玩性仍需真人；35/36/37暂停与纸翼保留不变。
- **必须真人确认：**连续操作手感、读图与策略是否自然、难度与耐玩性、审美/情绪价值。有音频实现的作品需真实听感与音画同步；无音频作品不因此判缺陷。真实手机触控、多指和设备差异须真机验证，桌面400CSS或脚本事件不能替代。
- **已知非阻断表现：**原报告中的残留提示、字号/滚动、未验动画等保留。果园前后端点/转角样式不同、Trail失败0命但体力显示72、Post终局下一闸提示仍在均如实记录，不借此重开零碎美术/存档专项。
- **暂停边界：**35/36/37不继续执行；纸翼不重启。保留在40项中，不能为提高通过数移除，也不计入本轮活动测试债。

启动、核心目标、失败/重试、终局/下一关分别记录。无失败条件标设计不适用。本阶段最低工具门槛：至少一条可完成主流程；有设计时的失败重试；结算/衔接及保存符合说明。达到工具门槛仍须真人验收，不是全关卡或40款成品交付，也不承诺穷尽所有组合。

编辑coverage.json后运行python build_index.py，追加新证据与精确范围，不覆盖旧报告或失败结果。基线与本轮证据提交见结构化数据。运行代码、旧版、目录及用户存档均保留。
