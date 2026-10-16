# 堡垒防线：后续关卡真实输入补测与修复

本批单独修复首款，再开始第二款新增，遵循 [逐款交付规则](DELIVERY_POLICY.md)。

## 发现并修复

1. 敌人原先无目标持续前射，后段密集增援和瞬间对玩家开火造成难以读取的压力。现在只在破墙、可攻击目标附近射击；对玩家开火前停步蓄力并绘制瞄准环。后段增援间隔改为渐进、最多同时 3 辆，保留各关敌人总数；基地受击后短暂保护增加至 1.5 秒，耐久仍为 3。
2. 第 8 关发现真实几何卡住：偏离格心的重装车直接下转，车体挂在钢柱边缘。现在先对齐当前通道再转弯，并增加精确坐标回归用例。
3. 逻辑检查扩展至 [17 项](fortress-qa/logic-report.json)，包括近距离瞄准前不瞬发，以及钢柱旁偏心转向。全部通过。

[原始后段失败记录](fortress-qa/campaign-baseline/report.json)与中间调查记录均保留；失败操作不被伪装成通关。

## 后九关真实输入结果

独立测试存档仅开放选关菜单，进入关卡后只发送正常键盘方向与射击输入，没有设置胜利、清空敌人、改生命、改难度或加速时钟。每次成功均清除该关全部敌人。此为自动驾驶操作，不宣称人工连续战役通关。

| 关卡 | 清敌 | 游戏时间 | 基地耐久 | 剩余出击 | 证据/版本阶段 |
|---|---|---|---|---|---|
| 2 | 7/7 | 28.82s | 3 | 3 | [射击与节奏修复版](fortress-qa/campaign-fixed-early/report.json) |
| 3 | 8/8 | 35.27s | 3 | 3 | [射击与节奏修复版](fortress-qa/campaign-fixed-early/report.json) |
| 4 | 8/8 | 35.23s | 3 | 3 | [射击与节奏修复版](fortress-qa/campaign-fixed-early/report.json) |
| 5 | 9/9 | 46.22s | 3 | 1 | [射击与节奏修复版](fortress-qa/campaign-fixed-middle/report.json) |
| 6 | 10/10 | 40.47s | 3 | 3 | [含转角修复回归](fortress-qa/campaign-corner-regression/report.json) |
| 7 | 10/10 | 50.80s | 3 | 3 | [射击与节奏修复版](fortress-qa/campaign-fixed-middle/report.json) |
| 8 | 11/11 | 46.97s | 3 | 2 | [含转角修复回归](fortress-qa/campaign-corner-regression/report.json) |
| 9 | 12/12 | 54.28s | 3 | 1 | [含转角修复回归](fortress-qa/campaign-final-9/report.json) |
| 10 | 14/14 | 49.93s | 3 | 3 | [含转角修复回归](fortress-qa/campaign-corner-regression/report.json) |

第 2/3/4/5/7 关在射击与节奏修复版完成；第 6/8/10 关在最终转角修复后回归，第 9 关也在该版完成。没有将较早版本结果冒称最终版本逐关再次实玩。当前公共逻辑的边缘回归由 17 项测试覆盖，首关 [真实输入与教学/暂停/重开/存档/触屏回归](fortress-qa/fix-first-round/browser-report.json)通过。全部十关已各有实际输入通关证据，但并非同一存档一次连续打完。

各目录的 PNG 为对应真实结算画面；JSON 保存按秒状态及最终状态。测试脚本为 `scripts/test_fortress_campaign.py`，`--smart` 为额外只读规划器；成功表所列均使用正常方向与连续射击策略。

## 发布

此修复与第二款新增分开提交。提交后在实际 Pages 地址核对文件与首款核心路径，再记录部署证据。

## 限制

覆盖 Chromium 键盘输入和此前的触屏仿真，未覆盖实体设备或所有浏览器。后续仍需玩家反馈调整难度；未将审美检查称作用户验收。
