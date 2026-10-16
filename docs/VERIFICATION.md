# 图鉴验收记录

检查日期：2026-10-16。验收对象是静态中文图鉴，流程为：浏览器加载 HTML/CSS/JS → 获取本地 JSON → 展示 72 条 → 搜索、主题和玩法类型组合筛选 → 打开详情及其资料链接。

## 本地验收通过

使用环境中已有的 Python Playwright 与 Chromium，没有安装软件。预览绑定 `127.0.0.1`。完整机器可读报告：[qa/browser-report.json](qa/browser-report.json)。

| 验收项 | 证据与结果 |
|---|---|
| 数据覆盖 | 72 条、72 个唯一 ID、72 个唯一标题、10 组；数量 8/8/8/6/8/8/6/6/6/8 |
| 实际渲染 | 浏览器读取 JSON 后显示 72 张卡片与 10 个分组 |
| 搜索 | 魂斗罗、HALF LIFE、超级玛丽、CS 1.6、帝国时代Ⅱ、Pokemon、冒险岛Online 均返回对应结果；冒险岛返回两个不同作品 |
| 筛选 | 10 组计数全部匹配；街机 + 格斗得到 3 条，再叠加 KOF 得到 1 条 |
| 空结果 | 无匹配时显示 0/72 和空结果说明，重置恢复全部并返回搜索焦点 |
| 详情 | 逐一打开全部 72 条，验证标题、版本边界、来源链接与关闭 |
| 键盘 | `/` 聚焦搜索，Enter 打开，Tab / Shift+Tab 在弹窗内循环，Escape 关闭并返回触发按钮 |
| 直达链接 | `#game=adventure-island` 打开正确条目；重新加载保持详情可访问 |
| 窄屏 | 320、360、390、768、1024、1440px 均无横向页面溢出；手机详情无横向溢出 |
| 链接与资源 | 本地资源文件存在；全部链接格式有效；新窗口链接具备 noopener/noreferrer |
| 控制台与网络 | 测试过程中 0 页面错误、0 控制台 error、0 请求失败、0 HTTP 4xx/5xx 资源 |
| 静态检查 | `python scripts/validate_data.py` 与 `node --check app.js` 通过 |

测试中发现并修复弹窗反向 Tab 焦点越界，修复后整体验收通过。截图已人工查看，排版未发现遮挡：

- [桌面首页](qa/desktop.png)、[桌面目录](qa/desktop-catalogue.png)、[桌面详情](qa/desktop-detail.png)
- [手机首页](qa/mobile.png)、[手机目录](qa/mobile-catalogue.png)、[手机详情](qa/mobile-detail.png)
- [空结果](qa/empty-state.png)

## 来源检查的实际范围

71 个来源记录（部分 URL 复用），64 个取得可用 HTTP 正文及标题；7 个本次未能取得可用正文。具体元数据在 [source-audit.json](../data/source-audit.json)，详情页同步显示状态。**HTTP 可读性检查不是逐条事实核验，也不是对第三方网站永久可用性的保证。**

- 马力欧历史、塞尔达、马力欧卡丁车引用的任天堂页面：本环境 HTTP 客户端出现证书错误；网页工具再次读取出现超时。马力欧历史搜索索引可以读取，但未将索引摘要冒称完整页面核验。
- 魔兽争霸III、Story of Seasons、MapleStory：HTTP 200，但抓取仅得到很短的动态页面外壳，正文未核读。
- 泡泡堂韩国站：本次跳转到 Nexon 入口，未取得该游戏正文。
- 冒险岛 FC、恐龙快打、泡泡龙、金庸群侠传、NBA Jam 目前引用二手百科，官方历史档案待补。其他资料优先官方、发行方商店、博物馆或相关项目。

已替换检查中发现的错链和失效路径，例如热血错误商店 ID、俄罗斯方块旧路径、The Strong FIFA 路径及 Imangi 目录路径。没有下载或发布第三方游戏图像、音频、ROM。

## 线上发布与验收

账号持有者已明确确认仅公开此新项目。仓库 [yydshly/classic-games-atlas](https://github.com/yydshly/classic-games-atlas) 已设为 **PUBLIC**，默认分支为 `main`。GitHub Pages 使用 `legacy` 分支发布，从 `main` 的 `/` 根目录部署，HTTPS 已启用。没有改变其他仓库、添加凭据、安装软件或付费。提交保留完整历史，署名使用 `yydshly` 与 GitHub noreply 邮箱。

**真实网站：[https://yydshly.github.io/classic-games-atlas/](https://yydshly.github.io/classic-games-atlas/)**

线上验收对应运行代码提交 `5c1958967bb07e12ef55b88c837e8fe495ab319d`：

- [Pages 成功工作流](https://github.com/yydshly/classic-games-atlas/actions/runs/38842357088)，状态 `completed / success`，与上述提交对应。
- [部署设置和构建证据](qa-online/deployment.json)：Pages 状态 `built`，构建无错误。
- [线上完整浏览器报告](qa-online/browser-report.json)：实际访问 GitHub Pages 项目地址，72 个详情逐条通过；中英文/别名搜索、全部主题、玩法组合筛选、空结果、键盘焦点及直达链接重载通过。
- 320、360、390、768、1024、1440px 六种视口无页面横向溢出；手机详情无横向溢出。测试期间 **0 页面错误、0 控制台 error、0 请求失败、0 HTTP 4xx/5xx 资源**。
- [线上资源内容核对](qa-online/integrity-report.json)：HTML、JS、CSS、JSON、海报 SVG 与图标 SVG 六个运行文件均 HTTP 200，SHA-256 与提交文件逐一相同。
- 线上截图：[桌面首页](qa-online/desktop.png)、[目录](qa-online/desktop-catalogue.png)、[详情](qa-online/desktop-detail.png)、[手机首页](qa-online/mobile.png)、[手机目录](qa-online/mobile-catalogue.png)、[手机详情](qa-online/mobile-detail.png)、[空结果](qa-online/empty-state.png)。

线上测试复现了快速关闭再打开详情时，旧关闭事件覆盖新直达链接的竞态。修复改为同步更新关闭路由，并忽略重新打开后抵达的旧关闭事件；重跑上述整套线上验收通过。

本记录及线上截图的后续提交只更新文档和证据，不改变六个运行文件。交付时另外核对最新 Pages 构建提交与 `main` 一致，及最终提交的线上资源哈希一致。

实际剩余限制为上文列出的来源核读缺口，以及浏览器验收目前覆盖 Chromium；没有未解决的发布或网站功能阻塞。本项目仍仅为作品图鉴，未实现任何游戏复刻。
