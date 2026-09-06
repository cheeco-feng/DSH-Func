# dsh-web-ui-WindowSlot-Panel（槽位窗口管理面板）

独立插件：在聊天输入框工具行注入一个「引用」按钮（点击弹出「引用」窗口），并在对话视图区新增一个「监控」tab。

## 功能描述

> 插件名：`dsh-web-ui-WindowSlot-Panel`
> 中文名：**槽位窗口管理面板**

**功能总览**：

1. **显示/隐藏开关** —— 在设置页 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）→ 功能管理** 里，提供了三个显示/隐藏开关：
   - **「引用功能按钮」**（`features.showQuoteButton`）：打开时主界面输入框底部显示「引用」按钮；关闭时隐藏。
   - **「显示监控面版」**（`features.showMonitorPanel`）：打开时对话视图区显示「监控」tab；关闭时隐藏。
   - **「显示会话的『更多』菜单」**（`features.showMoreMenu`）：打开时在会话「…」菜单底部显示「更多」菜单项及其弹出页；关闭时隐藏。
   - 开关读写功能包自己的配置文件（`DSH-Func-config.json`），与「显示会话搜索」等开关同机制，默认开。

2. **「引用」按钮** —— 在主界面聊天输入框底部（工具行）显示一个「引用」按钮。点击后弹出一个**大尺寸的空白弹出页**（tab 结构）。

3. **「监控」对话视图 tab** —— 在对话视图区（`conversation.view`，与「对话 / 轨迹 / 调度」并列）新增一个「**监控**」tab，排在「调度」（order 30）右侧（order 40）。内页为「子 tab」结构，缺省页显示「当前未安装相关的面板」。

4. **「更多」菜单 + 卡片页** —— 在会话「…」下拉菜单**最底部**新增一项「**更多**」（参考 meow-memory「跳过梦境整理记忆」的 DOM 注入做法，因为该菜单是 DSH 内建硬编码、无插件可追加的 slot）。点击「更多」弹出一个与「引用」相同的弹出页，但里面**不放 tab，而是放卡片**。卡片**注册在 `cheeco-registry.json` 的 `installed[].menus`**（**按插件分组**）：每条已装插件记录 = `{name, folder, version, installedAt, menus:[...]}`，`menus` = 该插件在 package.json `dsh.cheecoMoreCards` 声明的卡。WindowSlot-Panel 每次同步时**扫描已装插件的声明 → 重建 `installed`（各条目挂自己的菜单）→ 菜单=installed[].menus 并集**，用通用行为渲染：
   - 每张卡的 `url` 是**写死结构 + 变量占位符**：`{origin}`=当前实例基址、`{session}`=当前会话 id，点击时由 `fillUrl` 填成实际值。例：`{origin}/?session={session}`。
   - 现分配：「**复制链接**」（copy-url）由 `dsh-web-ui-WebAppPackagePanel`（服务商应用包）提供；「**打开当前会话**」（open，新窗口打开）由 `dsh-client-ui-session-deeplink`（深链接插件）提供。WindowSlot-Panel 只做宿主、不自带卡。
   - **装进删出**：装上声明卡的插件 → 该插件条目(连带菜单)出现；卸载 → 插件目录没了 → 条目(连带菜单)自动删除，系统自然知道"卸载它要删它那条及其菜单"。没有卡时显示「**暂无更多可用菜单**」。

**一句话定位**：它是一个「弹窗 + 视图 + 菜单扩展」的**界面接口宿主**；「更多」菜单卡片按插件**分组注册进 `cheeco-registry.json` 的 `installed[].menus`**、由它同步渲染。

## 如何添加 / 移除「更多」菜单（卡片）

卡片是**声明驱动、注册进 `cheeco-registry.json`** 的，所以：

- **添加一张卡**：在提供该卡的那个插件(非 WindowSlot-Panel)的 `package.json` 里加 `dsh.cheecoMoreCards` 数组，每条 `{ id, label, desc, type, url, order }`：
  - `type`: `copy-url`（点击复制 url）/ `open`（点击新窗口打开 url）。
  - `url`: 写死结构 + 占位符，如 `{origin}/?session={session}`（`{origin}`=当前实例基址、`{session}`=当前会话 id，点击时自动填实际值）。
  - 例（WebAppPackagePanel 声明「复制链接」卡）：
    ```json
    "dsh": {
      "cheecoMoreCards": [
        { "id": "copy-current-url", "label": "复制链接", "desc": "把当前页面的网址复制到剪贴板", "type": "copy-url", "url": "{origin}/?session={session}", "order": 0 }
      ]
    }
    ```
  然后重装/重启该插件 → WindowSlot-Panel 下次读取 `/more-cards/config` 时会扫到它、在该插件条目下挂出这张卡。
- **移除一张卡**：①只删某张卡 → 删掉该插件 `dsh.cheecoMoreCards` 里那一条并重启；②整个插件不再提供卡 → 卸载该插件 → 它那条 `installed` 记录(连带其 `menus`)自动删除（无需手动改任何配置）。

**注册表说明**：卡片**按插件分组**存在 `@cheeco/cheeco-registry.json` 的 `installed[].menus` 字段（`installed` 每条 = 一个已装插件：安装信息 + 它声明的菜单），`events` 记录安装/卸载事件同文件；它由「扫码已装插件声明 → 重建 installed」驱动，所以**注册表始终等于"所有已装插件(各自菜单)的集合"**，卸载某插件 = 删它那条(连带菜单)，不会残留、不会重复。

## 设计

- 「引用」按钮只作为输入框的一个小工具按钮；「监控」作为一棵常驻对话视图 tab（不是弹出页）；「更多」是会话「…」菜单底部的一个扩展入口，弹出卡片页。
- 「引用」是**宿主**（声明子 slot `dswp-ability`/`dswp-auto`，用 `renderSlot` 渲染注入内容）；「监控」内页为子 tab 结构（`dswp-monitor.cmdwatch`）。
- 「更多」卡片由 **WindowSlot-Panel 同步已装插件声明、读 `cheeco-registry.json` 的 `moreCards` 渲染**；卡片来源是各插件 package.json 的 `dsh.cheecoMoreCards` 声明。
- 显隐由 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）** 「功能管理」的「引用功能按钮」「显示监控面版」「显示会话的『更多』菜单」三个开关控制。

## 结构

- `package.json`：`dsh.bundle.patch` → `cordis.patch.yml`，`client.platform=web`，`inject` 声明 runtime/slots/locale。
- `lib/index.js`：node 半边，提供 `GET /more-cards/config`；每次调用都对 `node_modules/@cheeco` 下已装插件做 `dsh.cheecoMoreCards` 声明扫描 → 重建并写 `cheeco-registry.json` 的 `moreCards` → 返回。装进删出，不残留。
- `lib/client.js`：`window.__ModuleLoader__.load` + `slots.inject('conversation.input.left')` 注册「引用」按钮与弹窗；`slots.inject('conversation.view')` 注册「监控」tab；`slots.inject('conversation.input.left')` 注册「更多」卡片页（读 `/more-cards/config` 直接渲染卡片，含复制/新窗口打开行为）+ `ctx.effect(startMoreMenuManager)` 用 MutationObserver 把「更多」注入会话「…」菜单底部（参考 meow-memory）。
- `cordis.patch.yml`：注册 `web-ui-window-slot-panel` 到 profile roster。

## 版本

- **0.6.0**：注册表改为**按插件分组**——`installed[]` 每条挂 `menus`；「复制链接」移给 WebAppPackagePanel、「打开当前会话」留给深链接，WindowSlot-Panel 纯宿主。
- **0.5.0**：卡片改为**声明驱动-注册进 `cheeco-registry.json`**（各插件 `dsh.cheecoMoreCards` 声明，卸载自动清除，不残留）。
- **0.4.4**：修复配置读取未剥 `//` 注释致落回默认值；卡片 url 支持 `{origin}`/`{session}` 占位符（fillUrl 填实际值）。
- **0.4.1**：恢复子 slot `dswp-more.card` 供其它插件注入专属卡片（与配置通用卡并存），解决"新插件卡片需升级 WindowSlot-Panel"问题。
- **0.4.0**：把卡片功能并入本插件（读外置配置 `/more-cards/config` 直接渲染「复制链接」「打开当前会话」卡片），不再依赖独立卡片插件。
- **0.3.1**：修复「更多」卡片宿主页改挂到 `conversation.input.left`（原 `shell.overlay` 挂载不可靠导致点击不弹窗）。
- **0.3.0**：新增「更多」会话菜单扩展 + 卡片宿主页 + `showMoreMenu` 开关。
- **0.2.3**：命令监视移入「监控」子 tab（缺省页按 occupant 显示）。
- **0.2.2**：监控 tab 缺省页占位修复 + 登记功能推荐。
- **0.1.x**：初版（「引用」按钮 + 弹窗）。

## 安装

```bash
dsh plugin --profile <profile> add ./dsh-web-ui-WindowSlot-Panel
```

> 因 `conversation.input.left` / `conversation.view` 都是客户端 slot，安装后需重启对应实例（并刷新页面）才会出现「引用」按钮、「监控」tab 与「更多」菜单项。
