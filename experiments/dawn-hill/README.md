# 晨丘跃行 · 九关内容阶段（本地候选）

本地版本`dawn-slice-6`，尚未公开保存或部署。线上六关基线main `c65cd76020d403c98b46104ace40fc97b4a12841` / tree `2c9e7c78746492242af6ee5ce7592b16d9bd8cb6`。母线程已真实UI完成第4低棚/重试、第5观察踩绕/暂停刷新、第6先高后低与六关回顾，390终局可读；只覆盖一条混合路线、分段暂停，不是所有分路、连续手感或真人乐趣认可。第5足迹清晰度本地修正保留在本候选，尚未真实UI复验。旧六关地图、跑跳、果实规则和档案保留，新增7至9关与一种交互：大体型从下方顶破无内容普通砖，打开可选入口。

玩家是园路员小岚，自己控制走跑、长短跳、空中修正，下降踩虫与侧碰有不同后果。本段让强化不只是受击容错：可主动改变地形，但不取强化、不破砖或中途缩小，地面主路仍通；不要求收齐奖励。角色、地图、美术和数值原创，非官方复刻，不使用任天堂资产。阶段以九关为当前范围，不是最终硬上限。

## 参考与原创差异

- [任天堂初代介绍](https://www.nintendo.com/jp/famicom/software/smb1/index.html)的道具段明确大体型可承受一次伤害并破坏砖块。
- [任天堂3DS VC手册第10节](https://www.nintendo.co.jp/data/software/manual/man_taaj.pdf)（PDF17页）区分普通砖与问号块；部分砖也藏道具。[官方Wii VC说明](https://www.nintendo.co.jp/wii/vc/vc_smb/vc_smb_02.html)明确从下敲问号块出物，其他块也可能出物。这些不是本作逐帧物理依据。
- [日文原说明扫描](https://www.nintendo.co.jp/clv/manuals/ja/pdf/CLV-P-HAAAJ.pdf)PDF9页为大小跳高相同的原作依据。本作自由跳的大小脚底高度相同，碰撞体不同；不改基本跑速/跳速来给大体型额外通行能力。
- **本作明确设计**：红色砌缝砖全部无内容，大体型仅从下顶破；小体型顶时弹动不破。上升撞砖后此次跳跃停止，先落稳再跳过开口。不能从这些官方文字推出小体型弹动/碎片轨迹/精确状态机已被完整原文证实。碎片只是无伤害视觉，不是可踩物。叶纹金色奖励匣仍按原规则冒果、滚落、实际接住。
- 省略砖藏物、顶砖震击砖上敌、破坏侧碰、火焰、龟壳、星、游泳、密室、Boss、多人和世界地图；无倒计时、生命库存或金币换命。无限本关重试，不自动通关。历史Controls/Items与All-Stars补充参照保留在[首关记录](../../docs/dawn-hill-qa/README.md)，不冒称重制说明为原作数值。

## 操作、目标与变化

方向键/A D移动；Shift跑；空格/Z跳，短按低、长按高，空中可修正，每跳松开再按；P暂停/继续，R重试本关。左右/跑/跳触控组合沿用原输入，未新增按钮。大体型侧碰缩小，小体型侧碰或落坑失败；下降踩中反弹。到当前关右侧目的地并落稳即完成，不要求奖励。开场和就近路牌说明目标、规则与选择。

1至6关保留原地形与记录：落点、果园路线、石洲、高低跳节奏、观察巡逻、混合分路。

- **7 陶拱初开**：地面安全试顶，分清红砖和叶纹匣；破开拱底、踩邻砖上廊，避开一段地面巡逻与断口；小体型主路同样可通，亦可取本关果再上廊。
- **8 青檐留桥**：可以早走左阶，或先沿地面观察，到了桥底再开一个口而不折返。保留邻砖作落脚；若拆空，可回地面。不是宣称破砖必然更快，三种入口强调何时改计划。高廊有独立巡逻和奖励。
- **9 窑灯归廊**：先在宽阶停看，从较高起点开口上廊，结合既有踩敌与落脚；高廊受击缩小不会封闭已开的口，主路也可绕过。到窑灯广场回顾九关。

## 保存与兼容

只用原key`classic-games-atlas:dawn-hill:single:v1`，V2有界快照，不重放历史tick。不读写其他作品。旧三槽/六槽加载不改槽数、不自动写或清档；主动续第四时三扩六，主动续第七时六扩九，原记录/体型/布局保留。新旅程九槽。老六关根对象不增加空砖字段；砖状态仅在7至9关存在，按id/broken/bump严格校验。

暂停刷新先冻结，重试恢复本关完整砖/入关体型且保留前关记录。已完成关重试、从头重走均须确认；取消保持字节。整场景替换会删除新场景不存在的根字段，防止第9关重开残留砖、导致首关保存失败。受损或拒读原档保护不覆盖，写满保留上次档并可重试。校验是字段/边界验证，不宣称防改档真实性。

## 本地验证与限制

```
node --test experiments/dawn-hill/*.test.mjs
node tools/dawn-hill/record-routes.mjs --check
node tools/dawn-hill/record-routes.mjs --stage --check
node tools/dawn-hill/record-routes.mjs --quality --check
node tools/dawn-hill/record-routes.mjs --six --check
node tools/dawn-hill/record-routes.mjs --nine --check
node scripts/verify-dawn-hill.mjs
node tools/dawn-hill/brick-export.mjs /workspace/scratch/dawn-hill/brick-stage/pixels
```

默认检查只读。仅显式`--nine --write`生成本段文字输入；历史四份夹具原字节保留。应用测试用已有esbuild/jsdom内存打包真实main，输入检查调用实际控制器，不是原生键盘/触摸验收。运行HTML+CSS/模块版本链统一`v=dawn-slice-6`，无需新依赖、账户或资产；既有工具依赖见`tools/preview-bundles`。

详见[九关本地记录](../../docs/dawn-hill-qa/nine-stage.md)与[精确范围](../../docs/dawn-hill-qa/nine-scope.json)。离线PNG在scratch，不入Git。旧[六关记录](../../docs/dawn-hill-qa/six-stage.md)保留当时阶段身份，发布及真实UI范围以本README和本次记录为准。当前7至9关未原生UI验收，连续难度、真实手机、玩家理解/乐趣待验；模拟完成与回归数量不能代替这些结论。不公开上传或部署，不碰指南55、其他游戏或用户存档。
