# 开始／暂停／继续的有限同类风险审查

只读检查暂停相关分支后，普通UI仅选苔原远征、夜航拾光、云岛工坊三款。截图先行；不遍历重测全部通关。

- expedition：普通UI确认并最小修复。 [证据](../../docs/expedition-pause-semantics-qa/)
- lantern：普通UI确认并最小修复。 [证据](../../docs/lantern-pause-semantics-qa/)
- island：渲染器已有保护；普通UI确认正常，保留实现。 [证据](../../docs/island-pause-semantics-qa/)

已核验 expedition `fb63691ec8e947be23e72799fe813c483748fed5`：[部署记录](pause-expedition-release.json)。

[公开短回归 expedition](pause-expedition-online-ui.json)。

已核验 lantern `b42d551513a629c1c21c7e271ab05e08a741b9c2`：[部署记录](pause-lantern-release.json)。

[公开短回归 lantern](pause-lantern-online-ui.json)。

只读定位覆盖32个控制器；普通UI仅三款。其余作品不凭源码推断算通过或算bug。cloud/petal的触屏暂停、fortress的非活动态暂停仍只有源码线索，未做本轮普通UI复现，不计确认缺陷，也不自动扩为下一轮。

终态Node夹具、桌面自然终局、窄屏短回归和真人/真机未验分开。仅当前三款结论，未声称全40项体验通过；旧版、停项和规则来源保全。
