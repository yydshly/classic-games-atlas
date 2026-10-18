# 35 · 晴湾篮场阶段验收

日期：2026-10-18。实测时段：2026-10-18 12:00–12:30 UTC。

状态：首场闭环已验证。仍为独立预览，不计入已发布34款。游戏提供8场，本记录不代表全部实玩通过。

[预览入口](../../preview/court/) · [可视化归档](./index.html#court)

## 实际通过范围

- 首场自然结束，8:6 获胜；第二场解锁，刷新保留最佳分差 +2。
- 宽屏与桌面 400 CSS px 布局回归通过；投篮按钮失焦取消通过。
- 实测移动、传球、换人、蓄力投篮、暂停与帮助。比赛中打开帮助会暂停，关闭后继续。
- 当前比赛不存档；刷新回准备状态，解锁与最佳分差独立保留，符合页面说明。
- 宽屏 1181×757 CSS px，HUD、完整球场、蓄力条和工具栏同屏。桌面 400×606 CSS px 无横向溢出，方向与动作按钮可见。
- 真实投篮按钮持按期间失焦后蓄力归零，后续松键未误投。

## 待验证与限制

- 第 2–8 场完整比赛、加时、失败重试、pointercancel 与多指触控尚未实玩。
- 真实手机、移动浏览器、多指触控和人工美术验收未完成。
- 400 CSS px 是桌面窗口缩窄与正常浏览器缩放；不得写成真实手机通过。
- 程序模型和自动化测试没有计入真实游玩通关。

## 代码提交

- 独立预览：[99814b283c6bf03094499f176308cfa66121f8b8](https://github.com/yydshly/classic-games-atlas/commit/99814b283c6bf03094499f176308cfa66121f8b8)
- 布局修复：[f19a1e1ca6b903ad3ab37a3ec68435a6c0fe8250](https://github.com/yydshly/classic-games-atlas/commit/f19a1e1ca6b903ad3ab37a3ec68435a6c0fe8250)
- 资产版本更新：[6a43b6169237818c3d27c7b8d2ed1f1d31e6ff94](https://github.com/yydshly/classic-games-atlas/commit/6a43b6169237818c3d27c7b8d2ed1f1d31e6ff94)

## 截图

[完整桌面截图](../../assets/current-preview/court-desktop.webp)

桌面截图 · 布局修复后，完整球场与控件。截图仅转码压缩，原尺寸、原内容完整保留，无裁切或重绘。来源文件名与SHA-256见[截图清单](./screenshot-manifest.json)。
