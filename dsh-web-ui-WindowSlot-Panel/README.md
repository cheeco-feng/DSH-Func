# dsh-web-ui-WindowSlot-Panel（槽位窗口管理面板）

独立插件：在聊天输入框工具行注入一个「引用」按钮，点击弹出「引用」窗口。

## 功能描述

> 插件名：`dsh-web-ui-WindowSlot-Panel`
> 中文名：**槽位窗口管理面板**

**功能总览**：

1. **显示/隐藏开关** —— 在设置页 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）→ 功能管理** 里，提供一个「**引用功能按钮**」的显示/隐藏开关。
   - 打开时：主界面输入框底部显示「引用」按钮。
   - 关闭时：隐藏「引用」按钮。
   - 开关读写功能包自己的配置文件（`DSH-Func-config.json`），与「显示会话搜索」等开关同机制，默认开。

2. **「引用」按钮** —— 在主界面聊天输入框底部（工具行）显示一个「引用」按钮。点击后弹出一个**大尺寸的空白弹出页**。

3. **空白弹出页（tab 结构）** —— 弹出页是一个**空白 tab 页**：
   - 在没有内容时，显示一个**占位的空白 tab**。
   - 在有内容时，显示**相关内容**（由其它插件注入，当前已接入「技能」「常驻技能列表」，内容来自技能能力插件 **dsh-tool-skill-mcp-panel（技能/MCP 能力）**）。

**一句话定位**：它是一个「弹窗壳」，本身不携带业务内容，只提供可被填入内容的 tab 弹窗；内容由其它插件按需注入。

## 设计

- 不注册设置侧边栏，**只**作为输入框的一个小工具按钮。
- 作为**宿主弹窗壳**：声明子 slot（`dswp-ability` / `dswp-auto`），用 `renderSlot` 渲染注入的内容；子 slot 无内容时显示占位 tab。
- 内容由其它插件注入（当前技能内容来自 **dsh-tool-skill-mcp-panel（技能/MCP 能力插件）**，它把技能选择/常驻技能列表注入上面的子 slot）。
- 显隐由 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）** 「功能管理」的「引用功能按钮」开关控制（`features.showQuoteButton`）。

## 结构

- `package.json`：`dsh.bundle.patch` → `cordis.patch.yml`，`client.platform=web`，`inject` 声明 runtime/slots/locale。
- `lib/index.js`：空 `apply`（纯 UI 宿主）。
- `lib/client.js`：`window.__ModuleLoader__.load` + `slots.inject('conversation.input.left')`，注册「引用」按钮与弹窗；声明子 slot 并 `renderSlot` 渲染注入内容。
- `cordis.patch.yml`：注册 `web-ui-window-slot-panel` 到 profile roster。

## 安装

```bash
dsh plugin --profile <profile> add ./dsh-web-ui-WindowSlot-Panel
```

> 因 `conversation.input.left` 是客户端 slot，安装后需重启对应实例（并刷新页面）才会在输入框出现「引用」按钮。
