# dsh-web-ui-WindowSlot-Panel（槽位窗口管理面板）

独立插件：在聊天输入框工具行注入一个「引用」按钮（点击弹出「引用」窗口），并在对话视图区新增一个「监控」tab。

## 功能描述

> 插件名：`dsh-web-ui-WindowSlot-Panel`
> 中文名：**槽位窗口管理面板**

**功能总览**：

1. **显示/隐藏开关** —— 在设置页 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）→ 功能管理** 里，提供了两个显示/隐藏开关：
   - **「引用功能按钮」**（`features.showQuoteButton`）：打开时主界面输入框底部显示「引用」按钮；关闭时隐藏。
   - **「显示监控面版」**（`features.showMonitorPanel`）：打开时对话视图区显示「监控」tab；关闭时隐藏。
   - 开关读写功能包自己的配置文件（`DSH-Func-config.json`），与「显示会话搜索」等开关同机制，默认开。

2. **「引用」按钮** —— 在主界面聊天输入框底部（工具行）显示一个「引用」按钮。点击后弹出一个**大尺寸的空白弹出页**（tab 结构）。

3. **「监控」对话视图 tab** —— 在对话视图区（`conversation.view`，与「对话 / 轨迹 / 调度」并列）新增一个「**监控**」tab，排在「调度」（order 30）右侧（order 40）。内页为「子 tab」结构，缺省页显示「当前未安装相关的面板」。

**一句话定位**：它是一个「弹窗 + 视图」宿主壳，本身不携带业务内容，只提供可被填入内容的 tab 窗口；内容由其它插件按需注入。

## 设计

- 「引用」按钮只作为输入框的一个小工具按钮；「监控」作为一棵常驻对话视图 tab（不是弹出页）。
- 二者都是**宿主**：声明子 slot（`dswp-ability` / `dswp-auto` / `dswp-monitor.default`），用 `renderSlot` 渲染注入的内容；子 slot 无内容时显示占位 tab（「监控」的缺省页显示「当前未安装相关的面板」）。
- 「引用」弹窗内容由其它插件注入（当前技能内容来自 **dsh-tool-skill-mcp-panel（技能/MCP 能力插件）**）；「监控」内页缺省页预留由其它插件注入（当前为空白占位）。
- 显隐由 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）** 「功能管理」的「引用功能按钮」「显示监控面版」两个开关控制。

## 结构

- `package.json`：`dsh.bundle.patch` → `cordis.patch.yml`，`client.platform=web`，`inject` 声明 runtime/slots/locale。
- `lib/index.js`：空 `apply`（纯 UI 宿主）。
- `lib/client.js`：`window.__ModuleLoader__.load` + `slots.inject('conversation.input.left')` 注册「引用」按钮与弹窗；`slots.inject('conversation.view')` 注册「监控」tab；两者都声明子 slot 并 `renderSlot` 渲染注入内容。
- `cordis.patch.yml`：注册 `web-ui-window-slot-panel` 到 profile roster。

## 安装

```bash
dsh plugin --profile <profile> add ./dsh-web-ui-WindowSlot-Panel
```

> 因 `conversation.input.left` / `conversation.view` 都是客户端 slot，安装后需重启对应实例（并刷新页面）才会出现「引用」按钮与「监控」tab。
