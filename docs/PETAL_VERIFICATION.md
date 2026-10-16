# 花笺连线 · 验收与证据

这是第十二款原创玩法实验，固定范围见 [PETAL_SPEC.md](PETAL_SPEC.md)。20 关、三种归拢规则、固定石印与留白；十二种原创 SVG 以图案和编号辅助辨识。只参考连连看机制，不使用既有游戏图案、关卡、声音或截图。

## 规则与默认布局

- [逻辑报告](petal-qa/logic-report.json)：12 组通过。覆盖相邻/直线/一折/两折、外圈、遮挡、三折拒绝、同格取消、异图案改选、四次错连失败、输入锁、最后一对、归拢顺序、自动洗牌与次数耗尽、暂停、存档与损坏校验。
- [默认布局证书](petal-qa/authored-board-certificates.json)：20 份固定布局均用生产路径与归拢规则完整求解；生成源为 `scripts/make_petal_boards.mjs`，运行时不重新生成默认棋盘。
- [正常策略模拟](petal-qa/simulations.json)：20 关通过。只读取当前棋盘求解下一对，再调用生产 `select` 和 `update`；没有删除真实棋子、增加资源或写入胜利。每次归拢后的状态再次验证完整可解。
- 60 个完整/部分棋盘重排样本通过数量、固定地形、完整清空校验。运行时随机重排候选必须经过完整求解；预算不足不能当作“无解证明”，会继续候选或进入相邻对备用布局。备用布局同样需认证。

自动洗牌、耗尽失败、特殊通路、最后一对资源为零等边界由隔离规则夹具验证；这部分不是浏览器自然通关证据。夹具不修改发布棋盘。默认关卡完整策略与实际输入另行记录，不混算。

## 实际浏览器与界面

[首/中/末三关](petal-qa/local-first/report.json)与[其余十七关](petal-qa/local-rest/report.json)构成本地全部 20 关。每关创建新上下文，经实际菜单进入；后期只设置菜单解锁、教学和声音偏好，活动棋盘、分数、资源、速度和胜利状态不写入。每一对都由正常 DOM 点击触发，保留点击索引、图案、实际路径、结算快照和存档复查。所有默认关均不使用提示/洗牌、不消耗容错，正常清空并记录最佳、解锁与重新开始。

[界面验收](petal-qa/local-ui/report.json)共 20 项：初次教学、键盘焦点与 Enter/空格、同格/异图案、提示扣分与路径、动画中重复输入、连线中暂停、重开取消旧流程、动画刷新回滚、稳态棋盘/RNG/资源/声音恢复、自然胜利存档、四次自然错连失败重试、两次有限洗牌后正常清场、两折外圈提示、对话框暂停、实际触屏点选与暂停、窄屏按钮边界、320px 八列末关、存储受限、图鉴入口/原作关联与前十一款回归。无页面错误、控制台错误、资源 HTTP 错误或失败请求。

视口覆盖 320、360、390、768、1280px。既检查页面无横向溢出，也检查结算卡和两个按钮实际在棋盘范围内。截图包括 [外圈两折](petal-qa/local-ui/outer-ring-two-turn-hint.png)、[手机暂停](petal-qa/local-ui/mobile-paused-390.png)、[末关 320px](petal-qa/local-ui/late-board-320.png)、[自然失败](petal-qa/local-ui/natural-blocked-attempt-failure.png)。图鉴全部 72 条详情、搜索/组合筛选、空结果、键盘与六种尺寸另用原有 `scripts/test_browser.py` 回归。

## 发现与修正记录

1. 最初第二关手工草案 `abca / debd / fcef` 未通过完整清空认证，未发布。改为固定种子生成并认证的外圈教学布局；初始所有合法对均需两折，且存在完整清空序列。
2. 开发时修正恢复校验的总对数，使用原始纸格数量而不是剩余牌数，保证配对后的正常存档可恢复；逻辑与真实刷新回归通过。
3. 首次 UI 验收在最后原作返回检查处使用了不存在的 `.detail-dialog` 测试选择器而超时。实际图鉴弹窗为 `#game-dialog`；修正测试选择器后完整 20 项通过，产品运行代码未因此改变。

## 公开部署

代码提交：`51edf934bc286402d96f619340566ad720cc3633`。GitHub Pages [部署任务 38884573628](https://github.com/yydshly/classic-games-atlas/actions/runs/38884573628)成功，精确 SHA 与任务元数据见 [pages-code.json](petal-qa/pages-code.json)。

公开试玩：[花笺连线](https://yydshly.github.io/classic-games-atlas/games/petal/)。[A 组](petal-qa/live-a/report.json)、[B 组](petal-qa/live-b/report.json)、[C 组](petal-qa/live-c/report.json)覆盖全部 20 关，共 267 次正常配对、534 次牌面点击。逐关清空、解锁/最佳保存、全新重玩均通过；终态棋盘、RNG、分数、资源与统计和生产模拟逐项一致，用时不作跨环境相等要求。

[公开界面 20 项](petal-qa/live-ui/report.json)和[图鉴完整回归](petal-qa/live-atlas/report.json)全部通过，含前十一款入口和手机布局。此次公开浏览器检查无页面/控制台错误、失败请求或 HTTP 4xx/5xx 资源。[92 文件完整性](petal-qa/live-integrity.json)逐项 HTTP 200、SHA-256 与代码提交一致，完成标志为 true，无网络重试。[汇总](petal-qa/live-summary.json)列出证据边界。

随后证据提交仅补充报告、截图、文档及两处更严格的 UI 断言（暂停用时冻结、错连保留原棋盘），不改变运行文件。最终 main 将再次等待 Pages 成功并复查 92 文件及首关正常操作；最终提交 SHA 在交付消息中报告。

## 可复查命令与限制

```powershell
node scripts/test_petal.mjs
python scripts/test_petal_browser.py --stages 1,10,20
python scripts/test_petal_ui.py
python scripts/test_browser.py --url http://127.0.0.1:4174/
python scripts/verify_deployment.py --commit HEAD
```

这些是固定默认布局的可复验解法与 Chromium 自动化真实输入，不是人工熟练度测试，也不保证所有任意随机排列均可解。随机候选不通过完整认证便不进入游玩。触屏使用 Chromium 触摸设备模拟，没有实体手机、Safari、Firefox 或完整屏幕阅读器验收。自动洗牌触发/耗尽与三折阻挡的极端状态使用隔离逻辑夹具；浏览器中额外验证了正常主动洗牌及其完整清场。无新增运行依赖、凭据、账户或付费服务；前十一款运行目录保持不变。
