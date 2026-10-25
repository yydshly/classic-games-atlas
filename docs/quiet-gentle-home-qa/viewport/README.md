# r3：固定 viewport 镜头稳定与手册按钮

本轮真实 P2 来源为根的 r2 桌面复验：
- 页面 DOM 已确认 r2；固定699×650，正常 canvas699.33×544.41为正俯视，Up 真实撞醒后 canvas699.33×480.64、结果条63.77px，镜头/工作位突然换侧；Enter 重试恢复544.41再换回。viewport 全程不变。
- 699×900 暂停641.15→528.74→641.15仅缩放未换侧。
- 390×844放大/边缘/控制/暂停失败重试通过；1280×720原镜头保持。
- 手册“知道了”文本 rgb52,73,75，背景rgb54,76,80，实际难以辨认。

r3 最小修复：
- live view 读取与 CSS 完全相同的 matchMedia('(max-width:700px) and (orientation:portrait)')。该结果显式传给 fit；canvas宽高变化只重算投影，不再决定镜头布局/工作位。媒体结果改变时即使canvas尺寸相同也会重新fit，保留真实旋转/resize行为。700px包含关系与CSS一致。
- scene.fit 的无显式参数默认仅供现有离线投影调用；产品每次由view传入viewport结果。没有引入ResizeObserver、尺寸锁、迟滞、计时器或新的状态机。
- “知道了”加入既有主按钮配色组：#fff6df文字、#3b6158底色，计算对比度6.421:1。既有focus-visible和原生可关闭行为保持。
- r3版本链 gentle-home-d9246fd-r3。除上述两点，运行文件仅更新版本引用和说明；物理、控制器、角色装饰与几何、玩法不变。

验证：
node --test tests/quiet-gentle-home.test.mjs tests/quiet-lamp-envelope.test.mjs tests/quiet-temporal.test.mjs tests/quiet-readability.test.mjs tests/quiet-portrait.test.mjs tests/quiet-viewport-layout.test.mjs

新增测试使用真实控制器/Cannon/Three和给定真实小数矩形，renderer与matchMedia为夹具：
- 合法ArrowUp产生woke，真实尺寸544.41→480.64→544.41；视口699×650不变，布局切换0次。没有直接写state/position。
- 699×900暂停641.15→528.74→641.15与手册打开/关闭，布局切换0次，关闭后返回帮助按钮焦点，仍暂停。
- 390×844下跨旧280.8高度阈值、699.49小数canvas与700px inclusive viewport，均由媒体条件保持模式。
- 真正viewport媒体变化/旋转在canvas相同尺寸时仍更新布局，1280×720桌面位置保持。
- 按钮声明覆盖dialog继承色，对比度有界，focus-visible保留。

这些是针对真实复验结果的程序回归，不是本环境新执行的浏览器/UI验收。r3仍需根用已恢复的辅助桌面复验699×650终局/Enter、699×900暂停/手册、390×844及1280×720；保留未UI验收标记。本环境没有重试cloud浏览器或proxy403。

旧r2几何/图像资料保持；本轮没有新增摆件、玩法、网站入口或图像。

