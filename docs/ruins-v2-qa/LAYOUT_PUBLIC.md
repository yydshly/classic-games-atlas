# 归火石室 v2 布局发布记录

运行修复提交：`581c22667f3488c8db18bfe641aa8a19bd566dc8`。对应 [Pages 部署](https://github.com/yydshly/classic-games-atlas/actions/runs/39445394323) 已成功，随后在 [公开网站](https://yydshly.github.io/classic-games-atlas/versions/v2/games/ruins/) 执行实际 Chromium 页面回归。

5 个视口检查通过；通过正常操作进入第一守卫房；在 5 个窗口移动/攻击/暂停/继续，执行 1 次检查点重试，并检查旧版入口。回声未解锁，仅验证按钮可达。 控制台错误、HTTP 错误、请求失败均为空。另对 118 个限定范围文件执行 HTTP 200 与提交字节核对，全部匹配。

[线上前后对照与原图](layout-public.html) · [浏览器报告](public/report.json) · [文件核对](public/files.json) · [发布元数据](PUBLICATION.json)。前后截图来自不同的短时场景，不声称逐帧相同战局。

[本地阶段原始证据](layout/)完整保留，标题“未发布”说明原始记录生成时的状态。游戏规则、素材和旧版沿用原实现；本次只发布既有布局修复。自动化短流程，不代表真人、移动端、三关完整通关、Safari 或整体质量验收。
