# 堡垒v2：原生键盘返回

基线 `5eea35188341e18b3b059a2ed2bd8bd44deade3e`。[精选试玩](../../#selected-play) · [堡垒v2](../../versions/v2/games/fortress/) · [前后实图](./)

公开页面普通UI复现：1440暂停、390准备态下，头部“游戏大厅”链接聚焦后Enter会开始/恢复游戏，页面没有离开。并非新增精选入口引起的规则回归。原始[结果](before.json)与上一批证据保留。

只修正生产keydown的优先级：已处理事件、Ctrl/Meta/Alt组合键及链接、输入/选择、文本区、手册摘要和可编辑区交还原生行为；按钮Enter/Space交还按钮本身。使用closest覆盖交互元素内的子节点。原有按钮上的P/Esc暂停快捷键（此前专门修过）、画布/普通游戏区的开始、暂停、方向、P2 Enter开火和keyup释放不变。不改引擎、数值、关卡、存档格式、布局或旧版。

## 必要验证

- 本地1440×1000和390×844，精选与旧目录各在准备/游玩/暂停返回，共12条普通键盘往返；实际Tab/ShiftTab找入口，Enter进出。查询词、对应来源卡片焦点与可见性通过，未注入状态、时间、胜负或保存字节。
- 两尺寸原生摘要Enter/Space、选择框方向/P、可见整备按钮Enter、开始按钮Enter/Space、画布Enter开始、P/Esc、暂停按钮P/Enter、P2 Enter开火后释放、刷新回整备并保留双人选择通过。只短运行，没有重跑结局。
- [50条控制器边界](controller-report.json)：真实生产keydown、实际engine start/pause和Controls；DOM为小型桩。won/lost、编辑区/子节点/修饰键属于显式模型边界，不冒充普通UI或真实设备验证。旧代码负对照重现Enter拦截。
- 本地首轮10条已通过后，窄屏旧目录坐标采样过早；等待原生滚动稳定后只续剩余3条。窄屏控制检查曾聚焦隐藏的operation整备按钮，改用原布局可见的overlay重试后只续该组。两次脚本差异均未改变产品，失败记录保存在本地。本地合并[报告](local-browser.json)明确列执行边界。

运行 `node docs/fortress-native-key-qa/test-controller.mjs`（Git checkout与Node）；已有Playwright/Chromium时，从仓库根运行 `python docs/fortress-native-key-qa/verify_browser.py`，默认自己的58251预览；加`--online`检查公开页面。每次使用新profile，原存档不删除。测试脚本仅通过普通输入产生新的浏览器进度，只读快照用于断言；没有注入完成态。

当前仅关闭已复现的堡垒键盘返回阻塞；不能从此推断真人手感、乐趣、真机触控、声音或全站无障碍已经验收。旧版、40目录、已有素材与历史证据保留。
