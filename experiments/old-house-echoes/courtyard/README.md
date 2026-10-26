# 旧馆余声 · 庭院与档案翼（第二段已上线试玩）

阿遥已在第一段安全离馆，林芜独自回雨庭带出最后一册调度记录。须先有第一段合法完成档才能进入；本段只读取其完成状态，使用独立键 `classic-games-atlas:old-house-echoes:courtyard:v1`。第一段完成结果、地图和玩法引擎原样保留。第二段静态网页已上线试玩，线上体验验收中；六室不是后续上限。

从仓库根目录运行 `python3 -m http.server 4174 --bind 127.0.0.1`，先完成 `/experiments/old-house-echoes/`，再从结算链接或首页→`/play/`的续段卡进入 `/experiments/old-house-echoes/courtyard/`。如果本地已有第一段完成记录，直接进入续段页。键盘：方向键/WASD移动，E调查和过门；Shift按住举枪、方向调整、空格射击；B背包检查/使用/组合，M地图，P暂停。触控有方向、举枪、射击和调查；松手、取消、失焦会释放输入。

空间为庭院、石廊、花架小径、排水间、档案翼、干燥室。庭院铁柜起始存枪、三发备用弹、药叶和净布，林芜自带值守章和防潮套。六格限制按实际占格计，潮湿调度册占两格；检查章、与档案翼拓片组合开门，再把册与防潮套组合，带回庭院南侧接应台。满包不能拾取，材料留在原处，可回铁柜，不会丢关键物。庭院记录台保存本段重试点；加载先暂停，重试和重新开始均需确认，且只影响本段键。体力归零失败，交册完成。

石廊是短路，同类巡馆偶四次准确镇止弹命中后永久停下；花架与排水间长而安全。排水间可从内侧开庭院内闩，提供通往铁柜的回环。本地有限输入路线：清石廊4弹、约70米；绕行0弹、约120–135米；带满六格出发后两次拒拾、回柜腾位再交册0弹、约180–195米。绕行可不带枪，满包路线虽带枪也不必开火；短路可用初始4发，因此没有弹药不意味着必死。留空位、携药、携弹的选择会改变取册前是否需要组合或折返。

本作的人物、庭院、档案空间、道具和程序绘图原创。对初代《Resident Evil》只参考有限携带、储物、物品检查/组合、有限弹药与相连空间回访的核心；单人、固定镜头、无消耗续档和简化敌人是本作设定，不称完整复刻。没有原作商业素材。第一段来源区保留 [Capcom 手册公开镜像](https://retrogamer.biz/wp-content/uploads/2016/06/Resident-Evil-Manual.pdf) 与 [GOG 授权原版介绍](https://www.gog.com/en/game/resident_evil)。

本地验证：

```sh
node tests/old-house-echoes.test.mjs
node tests/old-house-courtyard.test.mjs
python3 scripts/test-old-house-courtyard-browser.py
node scripts/build-play-index.mjs
node scripts/audit-play-entry-links.mjs --check
```

浏览器脚本需要现有 Python Playwright、`/usr/bin/chromium` 和根目录4174静态服务。它通过合法第一段路线生成完成档，第二段以实际键盘、面板按钮重放三条有限路点；读取只用于断言和截图，不改状态。390视口触控用合成指针测试释放，不等于真实手机。截图和报告只放忽略的 `.local/old-house-qa/courtyard/`，不上传。真人趣味、未知浏览器和实体手机仍待独立验收。
