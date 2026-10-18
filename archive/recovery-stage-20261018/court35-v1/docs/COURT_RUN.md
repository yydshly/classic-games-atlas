# 晴湾篮场本地候选运行说明

这是第35款独立候选，尚未推送、部署或完成浏览器验收。原仓库34款运行文件保持不变。

1. 将候选包按原目录结构合并到 classic-games-atlas 仓库根目录。推荐基线 c22235a38c3663866b4b949876b9743c7a0ee4fa；先核对现有工作区无同名court文件。
2. 在仓库根目录使用已有Python：

   python -m http.server 4185 --bind 127.0.0.1

3. 打开 http://127.0.0.1:4185/games/court/ 。需要HTTP，不能直接双击HTML；没有安装或构建步骤。
4. 引擎检查：node scripts/test_court.mjs
5. 保存检查：node scripts/test_court_progress.mjs
6. 语法检查：node --check games/court/game.mjs

方向键/WASD移动；J/空格按住蓄力、松开投篮；K传球/抢断；L换人；P/Esc暂停；R重开。帮助中说明20秒进攻与加时。仅保存通关解锁、最佳分差和声音偏好，刷新会重开本场。

scripts/render_court_preview.mjs 是可选离屏渲染证据生成器，使用当前环境已有的原生Canvas库；它不是游戏依赖，也不是浏览器测试。其输出视频是引擎输入模拟，不能冒称真人或网页录屏。

下一步必须在可访问本地HTTP的真实浏览器进行：启动/暂停/恢复/帮助/重试、完整8场、键鼠/多指、移动端320–1440px、截图和短视频；视觉评审通过后才考虑目录集成。此包不修改共享首页、目录数据或任何发布状态。
