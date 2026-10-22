# 堡垒v3两段短战役

[实际页面与结果](index.html) · [可选战役](../../versions/v3/games/fortress/) · [v2仍保留](../../versions/v2/games/fortress/)

基线8985dc4b837eeb20f465c1c55e19e8bf50e01a5f。原两图和引擎不改；独立阶段存档，不读写v1/v2；活动刷新回当前图整备，关间/失利/完成保留。普通UI单人强策略两胜，中间一次自然无输入失利和当前图重试；390CSS、双人短时输入、触控仿真与存储故障分别记录，不能当作真人合作或真机验收。没有固定五分钟保证。

本地普通UI用Python 3.10、已安装的Playwright与Chromium 147，模型用Node 22。仅使用原有环境，无新增依赖或服务。引擎快照只读，策略在测试进程中计算后发送真实键盘WASD/J；没有运行时AI、状态注入、改时间/伤害/血量、存档解锁或注入完成态。

在仓库根目录执行：

~~~powershell
node docs/fortress-campaign-qa/test-campaign.mjs
python docs/fortress-campaign-qa/verify-flow.py --online
~~~

模型含10组；最后一组双人结算形状是显式fixture，不是自然双人胜利。普通UI脚本默认本地预览http://127.0.0.1:58251/，加--online使用公开页面；本地包含一次刻意无输入自然失利，线上只重复两图成功链和刷新/返回/重开，不为追全分支反复通关。脚本只在新浏览器profile中游玩，留下独立记录；不会改既有用户profile。输出保存在.local/fortress-campaign-round/。

~~~powershell
python docs/fortress-campaign-qa/verify-input-storage.py
~~~

此脚本使用本地预览，复用此前已公开的原生触控辅助类，不安装新软件。双人短键盘输入由一名执行者发送；touch由CDP发送真实浏览器触控事件，非真实手指。故障测试只在自己的新profile中模拟配额拒绝或种入非法字节，不注入完成进度。故障与正常业务数据分别标注。

最初本地完整链两图已真实完成，尾部截图工具误调用BrowserContext.set_viewport_size；修正为Page接口后复用同一真实完成会话续验尾部，没有重刷或注入完成档。第一次触控检查用整车对象比较取消前后，包含仍自然变化的计时字段；改为位置和射击计数后通过，未改产品逻辑。这两项是测试工具问题，不是玩法缺陷。

原所有历史报告和版本保留。本地证据已提交，线上最终SHA、Pages构建和实际普通操作由交付回报单独确认；此目录不虚称本地画面来自线上。仍未涵盖真人合作、真实手机、无辅助手感、审美或全策略组合。
