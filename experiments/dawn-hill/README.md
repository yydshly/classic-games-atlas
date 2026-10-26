# 晨丘跃行 · 晨露坡首关

当前首关修正预览 `dawn-slice-2`。首版已随main `aecdf093a91968b85a63def00269e3195bc38c89` 发布；本轮修正画布焦点键盘过滤并统一缓存版本，准备部署后复验。原生键盘与完整首关尚未验收。图鉴参考项为 `super-mario-bros`。原创角色小岚、翻叶虫、晨露果、晨丘地图和程序绘图；不使用任天堂图像、声音、关卡或ROM，不冒充官方复刻。

玩家要走到右侧晨钟亭。价值在脚下的行动：走或跑影响水平距离，跳键持续时间改变高度，空中能收住或反向修正；下降踩虫和侧面碰虫结果不同。可以走低处，也可多跳几次登高取晨光籽和备用强化。收集不是钥匙，未收齐照样完成；等待不会替玩家过关。

## 官方机制参照与区别

- [任天堂初代原说明扫描](https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAAE.pdf)及[官方简明英文说明](https://www.nintendo.co.jp/clv/manuals/en/pdf/CLV-P-NAAAE_en.pdf)：Controls、Basic Play、Items 支持移动/跑/跳、从上方踩敌、强化及小体型碰敌失败等基础机制。
- [任天堂 Super Mario All-Stars Wii 重制合集说明](https://csassets.nintendo.com/noaext/image/private/t_KA_PDF/manual-wii_supermarioallstars?_a=BATCtdAA0)：印刷11–12页的SMB物品段明确从下方顶块出物、强化形态受敌接触后退回小形态；20页公共动作段说明长按跳得高。该项是重制合集补充依据，不能说成初代原始数值证据。
- 本作保留走跑、跳跃持续控制、空中修正、顶块生成可接住的移动强化、真实大小碰撞体、侧碰缩小/失败、下降踩敌反弹。物理数值、容错、敌人巡逻、地图、终点均原创，不声称逐帧复刻。
- 本关省略普通砖破砖、火焰、龟壳、星、游泳、密室、Boss、多人及世界地图。没有倒计时、生命库存或金币换命；无限重试，本作独立暂停存档。这些是改编区别。

## 操作与首关节奏

方向键/A D移动；Shift跑；空格/Z跳，短按低跳、长按高跳，每跳要松开再按；P暂停/继续，R从本关起点重试。触控提供左右、按住跑、跳，多指可组合，拖出/取消会释放。完成后再次重开须确认。开场在游戏内说明角色、目标、操作和胜败，不直接把玩家扔进场景。

安全草坡试走跑与跳高 → 叶纹匣下方顶开、等待果实完整冒出后接住 → 第一只翻叶虫可以练习从上方踩中反弹 → 90宽断口 → 低处直行或高处石台奖励 → 110宽断口 → 晨钟亭。低处有巡逻，不能把“低路”说成自动安全；大体型已受击的人可以考虑高路第二颗果实。大体型再吃果不叠加第二层护盾，晨光籽是额外收集记录，不解锁终点。

只有一个关卡。之后是否扩关、阶段关数及每关变化，须依据真实玩法与质量再定；三关曾是阶段建议，不是用户要求的永久上限。

## 运行与维护

纯静态ES模块；开发时由普通静态服务器提供本目录，在受支持浏览器进入 `experiments/dawn-hill/`。本轮未启动服务器/浏览器，未访问被拒的云浏览器或代理路径。维护测试复用仓库既有工具依赖，无新增包：

```
npm ci --offline --ignore-scripts --cache /workspace/scratch/windowlife-npm-cache --prefix tools/preview-bundles
node --test experiments/dawn-hill/*.test.mjs
node tools/dawn-hill/record-routes.mjs --check
node scripts/verify-dawn-hill.mjs
node tools/dawn-hill/export.mjs /workspace/scratch/dawn-hill/pixels-final
```

默认检查只读；只有显式 `record-routes.mjs --write` 生成文字路线夹具，export只写指定离线目录。没有运行bundle需要回写：HTML引用main、CSS，模块依赖统一 `v=dawn-slice-2`，应用测试用既有esbuild临时内存打包真实main。

存档只使用 `classic-games-atlas:dawn-hill:single:v1`，不读其他游戏的key。缺档从ready开始；刷新活动现场先暂停。受损/拒读原档保护不覆盖，另建须确认；写满保留上次字节并提供重试。快照有大小/字段边界，不按tick重放，不宣称防玩家改档。完整证据与局限见 [QA记录](../../docs/dawn-hill-qa/README.md)。
