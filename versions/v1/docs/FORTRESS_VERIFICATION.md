# 堡垒防线：首款原创玩法交付验收

**当前后九关补测与修复见 [FORTRESS_FOLLOWUP.md](FORTRESS_FOLLOWUP.md)，已覆盖每个关卡的独立真实输入通关。以下保留首交付阶段证据。**

范围依据：[FORTRESS_SPEC.md](FORTRESS_SPEC.md)。本轮仅交付《堡垒防线》，不继续实现其他游戏。原作《坦克大战》的介绍和可信来源仍保留在 72 条图鉴中；本项目游戏使用独立名称、原创关卡、美术和合成音效，不是原作或逐关复制。

## 完成功能

10 张原创地图；3 类敌人（侦察 / 突击 / 重装）；3 类道具（维修 / 速射 / 护盾）；砖墙破坏、钢障阻挡、水域、移动转向射击、基地保护、3 次出击、出生保护、命中/爆炸/补给反馈。包括首次教学、暂停恢复、重开、胜败结算、选关和解锁、本地战绩与声音偏好、键盘/触屏控件、失焦暂停。

本地存储保存已解锁关卡、选关位置、通关最佳分/星数和偏好，不保存战斗中途的位置。存储被禁用时仍可玩，并提示无法持久保存。无账户、联网玩法、后端、榜单、编辑器、新增运行依赖或付费服务。

## 自动逻辑模拟

[17 项 Node 测试报告](fortress-qa/logic-report.json)，命令：`node scripts/test_fortress.mjs`。

- 十关均为不同的 25×25 原创地图，出生点/玩家/基地有效，敌人配置有效，目标数量递增。
- 逐关检查玩家、补给与三个来袭入口的可达性；路线不穿越钢障与水域，允许摧毁砖墙。
- 移动碰撞、炮弹击毁砖墙、钢障阻弹、敌人耐久差异、敌人实际移动/射击、炮弹对消、玩家和基地受击、胜败、暂停和重开状态、道具效果与时效。
- 十关无人防守均能在 180 秒模拟时间内自然失败，没有发现永久停滞。
- [十关布局预览](fortress-qa/maps.png)仅用于检查地图差异，明确不代表逐关人工通关。

上述属于直接调用纯逻辑的模拟测试，不冒充浏览器操作或人工游玩。

## 真实浏览器输入

[本地浏览器报告](fortress-qa/local/browser-report.json)、[操作轨迹与结局](fortress-qa/local/round-trajectory.json)、[真实输入录像](fortress-qa/local/first-round-input.webm)。可重复命令：

```powershell
python scripts/test_fortress_browser.py --url http://127.0.0.1:4174/games/fortress/
```

测试操作者通过只读诊断观察位置，再发送真实键盘/鼠标输入；触屏使用 Chromium 的 touchStart / touchEnd 输入。没有改写生产游戏状态来制造胜利、解锁或道具。

- 首关完整通关：6/6 敌人、基地耐久 3、出击 3、得分 1560；实际游戏时间约 28.2 秒。下一关解锁，刷新后仍保留进度。
- 教学、1 关已解锁/9 关锁定、暂停冻结时间、恢复、声音切换、选关和 R 重开均通过。
- 通过正常移动将战车停在侧方，随后无人防守；敌人实际推进并损伤基地，最终失败。再次防守恢复本关完整状态。
- 手机控件按住移动和开火；六种宽度 320/360/390/768/1024/1440 无横向溢出；返回图鉴仍有 72 条，坦克大战条目可进入独立原创游戏。
- 本地浏览器测试：0 页面错误、0 控制台 error、0 请求失败、0 HTTP 4xx/5xx 资源。

截图：[桌面整备](fortress-qa/local/desktop-ready.png)、[实际交战](fortress-qa/local/desktop-combat.png)、[通关结算](fortress-qa/local/round-result.png)、[失败结算](fortress-qa/local/defeat.png)、[手机交战与控件](fortress-qa/local/mobile-combat.png)、[教学](fortress-qa/local/tutorial.png)。

## 性能、降级与原有图鉴回归

[独立性能记录](fortress-qa/performance-report.json)：无录像、1440×1100 视口、真实持续开火 5 秒的 Chromium 样本约 **60 FPS**，平均 Canvas 绘制约 **0.28ms**。带录像的完整首关样本约 **29 FPS**；录像开销和测试环境会影响结果，不能保证所有设备同样表现。

失焦暂停处理通过派发 blur 事件验证，暂停后时间不推进。无头浏览器未重现真实系统标签的可见性切换，未将该事件测试表述为物理切换标签的证据。存储写入被禁止的环境模拟验证仍可进入战斗，且提示无法保存。

[图鉴整套回归](fortress-qa/atlas/browser-report.json)：保留 72 条和 10 组，中英/别名搜索、组合筛选、空结果、全部详情、直达链接、键盘和六种视口通过，无页面/控制台/网络错误。

## 发布与线上验证

**已成功上线：[https://yydshly.github.io/classic-games-atlas/games/fortress/](https://yydshly.github.io/classic-games-atlas/games/fortress/)**

验证对应实现提交 `56dcfba02900800de817e5fad14e102d132bd1c5`，GitHub Pages 从公开仓库 `main` 根目录部署，HTTPS 已开启。

- [成功部署工作流](https://github.com/yydshly/classic-games-atlas/actions/runs/38845995593)，[部署元数据](fortress-qa/online/deployment.json)。
- [线上真实输入报告](fortress-qa/online/browser-report.json)：在真实 Pages 地址再次完整通关首关，6/6 敌人、基地耐久 3、剩余出击 2、得分 1510、约 29.82 秒；该次样本约 60 FPS，平均绘制约 0.17ms。通关解锁与刷新保留、暂停/恢复、重开、声音偏好、触屏按住移动和至少两次射击、返回 72 条图鉴及关联入口通过。
- [线上操作轨迹与结局](fortress-qa/online/round-trajectory.json)使用真实键盘输入，不改写状态。完整失败与基地受击路径见上文的本地真实输入记录；线上为核心路径复测，没有冒称再次覆盖全部失败场景。
- 六种宽度无横向溢出，线上测试为 0 页面错误、0 控制台 error、0 请求失败、0 HTTP 4xx/5xx 资源。
- [13 个运行资源 SHA-256 比较](fortress-qa/online-integrity.json)：图鉴与游戏的 HTML、CSS、JSON、MJS/JS、SVG 均 HTTP 200，并与上述提交逐字节一致。
- 线上截图：[交战](fortress-qa/online/desktop-combat.png)、[胜利](fortress-qa/online/round-result.png)、[手机控件](fortress-qa/online/mobile-combat.png)。

后续只保存本次线上证据的提交不改变运行文件。最终交付另外核对最新 `main` 与 Pages 构建提交相同、无查询参数的线上运行文件内容相同。

## 实际限制

初交付阶段仅首关有真实输入通关；其余九关现已补测，阶段和版本范围见上述后续记录。不宣称人工连续通关全部战役。浏览器验证目前覆盖 Chromium 与其触屏仿真，未做实体手机、Safari 或 Firefox 的完整验收。审美做过画面检查，不代表获得用户审美验收。图鉴原有的 7 个来源正文核读缺口仍如实保留。
