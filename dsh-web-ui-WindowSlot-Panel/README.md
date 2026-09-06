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

4. **「更多」菜单 + 卡片宿主页** —— 在会话「…」下拉菜单**最底部**新增一项「**更多**」（参考 meow-memory「跳过梦境整理记忆」的 DOM 注入做法，因为该菜单是 DSH 内建硬编码、无插件可追加的 slot）。点击「更多」弹出一个与「引用」相同的弹出页，但里面**不放 tab，而是放卡片**：卡片由其它插件经子 slot `dswp-more.card`（list）注入；无卡片时显示「**暂无更多可用菜单**」（与「监控」缺省页同一套判空机制）。

**一句话定位**：它是一个「弹窗 + 视图 + 菜单扩展」宿主壳，本身不携带业务内容，只提供可被填入内容的 tab/卡片窗口；内容由其它插件按需注入。

## 设计

- 「引用」按钮只作为输入框的一个小工具按钮；「监控」作为一棵常驻对话视图 tab（不是弹出页）；「更多」是会话「…」菜单底部的一个扩展入口，弹出卡片宿主页。
- 三者都是**宿主**：声明子 slot（`dswp-ability` / `dswp-auto` / `dswp-monitor.default` / `dswp-more.card`），用 `renderSlot` 渲染注入的内容；子 slot 无内容时显示占位（「监控」显示「当前未安装相关的面板」，「更多」显示「暂无更多可用菜单」）。
- 「引用」「更多」弹窗内容由其它插件注入；「监控」内页缺省页预留由其它插件注入。
- 显隐由 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）** 「功能管理」的「引用功能按钮」「显示监控面版」「显示会话的『更多』菜单」三个开关控制。

## 结构

- `package.json`：`dsh.bundle.patch` → `cordis.patch.yml`，`client.platform=web`，`inject` 声明 runtime/slots/locale。
- `lib/index.js`：空 `apply`（纯 UI 宿主）。
- `lib/client.js`：`window.__ModuleLoader__.load` + `slots.inject('conversation.input.left')` 注册「引用」按钮与弹窗；`slots.inject('conversation.view')` 注册「监控」tab；`slots.inject('shell.overlay')` 注册「更多」卡片宿主页 + `ctx.effect(startMoreMenuManager)` 用 MutationObserver 把「更多」注入会话「…」菜单底部（参考 meow-memory）。三者都声明子 slot 并 `renderSlot` 渲染注入内容。
- `cordis.patch.yml`：注册 `web-ui-window-slot-panel` 到 profile roster。

## 版本

- **0.3.0**：新增「更多」会话菜单扩展 + 卡片宿主页 + `showMoreMenu` 开关。
- **0.2.3**：命令监视移入「监控」子 tab（缺省页按 occupant 显示）。
- **0.2.2**：监控 tab 缺省页占位修复 + 登记功能推荐。
- **0.1.x**：初版（「引用」按钮 + 弹窗）。

## 安装

```bash
dsh plugin --profile <profile> add ./dsh-web-ui-WindowSlot-Panel
```

> 因 `conversation.input.left` / `conversation.view` / `shell.overlay` 都是客户端 slot，安装后需重启对应实例（并刷新页面）才会出现「引用」按钮、「监控」tab 与「更多」菜单项。
