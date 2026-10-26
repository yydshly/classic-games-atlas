# 晨丘跃行 · 六关内容阶段（本地）

本地内容版本 `dawn-slice-5`，未公开或部署。基线r4 main `8057f1826070f6850d596aed98e2dfed87847c04` 已由父线程真实IAB完成三关、一次顶匣后向右让开接果、第三关低路落洲停稳再过右岸和回顾刷新；使用分段暂停，不是连续手感/真人乐趣认可，原生高路直越与取消仍未验。本轮保留前三关地图与手感，新添草穗阶谷、钟影望台、双径归庭，旧三关完成档可保留记录继续第四关。图鉴参照 `super-mario-bros`，角色小岚、地图、敌人和程序绘图原创，无任天堂素材或原关卡，非官方复刻。完整设计/证据/边界见 [六关内容记录](../../docs/dawn-hill-qa/six-stage.md)。

玩家要走到当前关右侧的亭驿，第一关是晨钟亭。价值在脚下的行动：走或跑影响水平距离，跳键持续时间改变高度，空中能收住或反向修正；下降踩虫和侧面碰虫结果不同。每关按地形和巡逻选择避敌路线或取奖励：首关奖励偏高，第二关果实在树下。收集不是钥匙，未收齐照样完成；等待不会替玩家过关。

## 官方机制参照与区别

- [任天堂初代原说明扫描](https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAAE.pdf)及[官方简明英文说明](https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAAE_en.pdf)：Controls、Basic Play、Items 支持移动/跑/跳、从上方踩敌、强化及小体型碰敌失败等基础机制。
- [任天堂 Super Mario All-Stars Wii 重制合集说明](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-wii_supermarioallstars?_a=BATCtdAA0)：印刷11–12页的SMB物品段明确从下方顶块出物、强化形态受敌接触后退回小形态；20页公共动作段说明长按跳得高。该项是重制合集补充依据，不能说成初代原始数值证据。
- 本作保留走跑、跳跃持续控制、空中修正、顶块生成可接住的移动强化、真实大小碰撞体、侧碰缩小/失败、下降踩敌反弹。物理数值、容错、敌人巡逻、地图、终点均原创，不声称逐帧复刻。
- 本关省略普通砖破砖、火焰、龟壳、星、游泳、密室、Boss、多人及世界地图。没有倒计时、生命库存或金币换命；无限重试，本作独立暂停存档。这些是改编区别。

## 操作与首关节奏

方向键/A D移动；Shift跑；空格/Z跳，短按低跳、长按高跳，每跳要松开再按；P暂停/继续，R从本关起点重试。触控提供左右、按住跑、跳，多指可组合，拖出/取消会释放。到站后主动进入下一关；沿用到站体型。本关R重试保留入关体型及前关记录；已完成本关重试要确认。旧第三关终点能先回顾三行，再主动保留记录续第四关；新终点回顾六行，从第一关重走须另确认。开场在游戏内说明角色、目标、操作和胜败，不直接把玩家扔进场景。

安全草坡试走跑与跳高 → 叶纹匣下方顶开、等待果实完整冒出后接住 → 第一只翻叶虫可以练习从上方踩中反弹 → 90宽断口 → 低处直行或高处石台奖励 → 110宽断口 → 晨钟亭。低处有巡逻，不能把“低路”说成自动安全；大体型已受击的人可以考虑高路第二颗果实。大体型再吃果不叠加第二层护盾，晨光籽是额外收集记录，不解锁终点。

当前六关：晨露坡学落点；露渠果园选避敌/取果；晚风归坡选落洲/直越；草穗阶谷将阶梯、低棚短跳、开阔长跳连起来；钟影望台先观察再处理不同高度巡逻；双径归庭两处分路可以混合选择并重汇。奖励不解锁终点，两种体型都有正常路线。之后是否扩关及关数依据新判断与质量决定，不是用户要求的永久三关上限。

## 运行与维护

纯静态ES模块；开发时由普通静态服务器提供本目录，在受支持浏览器进入 `experiments/dawn-hill/`。本轮未启动服务器/浏览器，未访问被拒的云浏览器或代理路径。维护测试复用仓库既有工具依赖，无新增包：

```
npm ci --offline --ignore-scripts --cache /workspace/scratch/windowlife-npm-cache --prefix tools/preview-bundles
node --test experiments/dawn-hill/*.test.mjs
node tools/dawn-hill/record-routes.mjs --check
node tools/dawn-hill/record-routes.mjs --stage --check
node tools/dawn-hill/record-routes.mjs --quality --check
node tools/dawn-hill/record-routes.mjs --six --check
node scripts/verify-dawn-hill.mjs
node tools/dawn-hill/six-export.mjs /workspace/scratch/dawn-hill/six-stage/pixels
```

默认检查只读；只有显式 `record-routes.mjs --write` 生成文字路线夹具，export只写指定离线目录。没有运行bundle需要回写：HTML引用main、CSS，模块依赖统一 `v=dawn-slice-5`，应用测试用既有esbuild临时内存打包真实main。

存档只使用 `classic-games-atlas:dawn-hill:single:v1`，不读其他游戏的key。缺档从ready开始；刷新活动现场先暂停。受损/拒读原档保护不覆盖，另建须确认；写满保留上次字节并提供重试。快照有大小/字段边界，不按tick重放，不宣称防玩家改档。保存格式升级为V2，仍用原key；V1缺档/途中/暂停/失败/完成均有明确转换，不自动清档，也不按历史帧重放。缺少layoutRevision的旧档按原地图继续、重试不换地形。原三槽旅程不会加载时自动改成六槽；只有主动续第四关才扩槽，保留原记录与入关体型；新缺档直接开始六关。确认从头重走才换新版前三关并替换现有记录。完整历史阶段证据与局限见 [阶段记录](../../docs/dawn-hill-qa/stage.md)，首关历史见 [原QA记录](../../docs/dawn-hill-qa/README.md)。
