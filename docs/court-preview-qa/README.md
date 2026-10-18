# 晴湾篮场 · 独立预览35验证记录

状态：预览候选，尚未完成真实浏览器与移动端验收。页面使用 `noindex, nofollow`；它仅提示搜索引擎，不是访问控制。

本次仅新增 `preview/court/`、`docs/court-preview-qa/` 和 `validation/court-preview/`。不改首页、目录数据、原34款游戏或已有38/39预览。页面沿用原球场美术、奶油白/墨绿布局和八场对决。

## 运行与复测

在仓库根目录启动普通静态HTTP服务：

```
python -m http.server 4185 --bind 127.0.0.1
```

访问 `http://127.0.0.1:4185/preview/court/`。游戏无需安装或构建，不能直接用file协议打开。游戏使用独立键 `atlas-preview-court-20261018-v1` 保存解锁、最佳分差和声音偏好；不读取、迁移或删除正式键 `atlas-court-v1`，刷新会重新开场。

从仓库根目录复测：

```
node validation/court-preview/test_court.mjs
node validation/court-preview/test_court_progress.mjs
node validation/court-preview/test_court_controller.mjs
node validation/court-preview/test_court_recovery.mjs
node validation/court-preview/test_preview_isolation.mjs
```

真实浏览器脚本 `validation/court-preview/test_court_browser.py` 使用Playwright，本次仅完成语法编译，没有执行浏览器。它只是基础烟测，仍须补完整8场实操、取消手势和人工视觉检查。

## 本次通过

- 原引擎21项回归，覆盖8场、球权、碰撞边界、投篮/传球/抢断、篮板、20秒违例、压哨球、加时、暂停和确定性。
- 原存档测试：坏数据回退、解锁上限、最佳分差、单调解锁、失败拒绝、声音与进度序列化。
- 控制器模型27项：实际控制器/引擎配合模拟DOM和事件；覆盖键盘、按钮Space/Enter、多指输入集合、取消/丢失捕获、失焦、帮助重复开关、暂停与恢复时钟、重开、完整8场推进/保存及失败重试。
- 其中3项以同一存储模型内的正式存档和无关存档作为哨兵，确认只读写预览键、刷新只恢复预览进度、存储失败时不回退正式键。
- 恢复专项7项、预览独立性与导航源码契约通过；所有MJS语法检查和Python脚本编译通过。
- 模型化完整8场通关比分为15–0、8–0、12–0、12–5、10–0、12–8、12–4、10–4。它仅从公开快照选择方向、蓄力/释放和传球/抢断键；没有改写比分、位置、计时或胜负。

日志见 `logs/`。模型测试不证明真实浏览器布局、原生输入、设备可读性或游戏手感。

## 恢复和新修复的区别

详细来源见 `RECOVERY_PROVENANCE.md` 和 `source-manifest.json`。完整早期包的23个文件、后期源码记录的6个文件，均已与归档Git blob核对。

新兼容修复只有引擎的 `cancel-shot` 动作：后期控制器已有取消调用，而早期完整引擎缺少处理，导致三种取消路径误出手。`logs/controller-before-cancel-fix.txt` 记录修复前3项失败；当前测试全部通过。补丁在 `cancel-shot-new-fix.patch`。该修复是新写代码，不声称恢复了缺失的历史引擎终版。

## 后续验收清单

1. 真浏览器键盘、按钮和原生多指触控：按住/松开/取消、抢断/传球/换人、暂停/恢复、切出/回来、帮助重复打开与关闭。
2. 320、390、768、1024、1280、1440px布局，重点检查小屏ready/paused/won/lost面板、操作键可达性、对话框和人物可读性；记录截图和短录像。
3. 网页完整8场通关、逐场解锁及刷新恢复；人工检查节奏与图鉴原风格一致性。
4. 检查控制台、favicon、返回图鉴和上一款街巷护送导航。相对链接分别是 `../../#experiments`、`../../games/escort/` 和 `../../assets/favicon.svg`，均指向现有图鉴资源。

尚无本次真实网页截图或录像；历史离屏渲染不作为网页验收证据。
