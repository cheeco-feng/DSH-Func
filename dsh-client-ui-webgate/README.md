# @cheeco/dsh-client-ui-webgate（会话控制台）

Cheeco 独立插件页：在「功能设置」面板新增**「会话控制台」**页，指定一个会话 id 即可
**查看对话历史、发消息、实时刷新**（用的 DSH 客户端会话服务，无需额外端口/服务）。

## 功能描述

- **功能名**：会话控制台（`dsh-client-ui-webgate`，会话控制台）。
- **展示入口**：功能设置面板新增「会话控制台」页。
- **行为**：下拉选择会话或粘贴会话 id → 打开；查看对话历史、发消息、实时刷新；assistant 回复流式显示。
- **说明**：仅展示 user / assistant 文本，跳过 reasoning（思考块）；打开"非当前会话"会把它切为当前会话。
- **当前版本**：`0.1.0`

**版本历史**

| 版本 | 变更 |
|---|---|
| 0.1.0 | 首次发布：独立插件页「会话控制台」。 |

## 安装

在 DSH 工作台命令行（或 Cheeco 插件中心）执行：

```
dsh plugin --profile <profile> add <本插件 tgz 路径>
```

装完**必须重启工作台**才生效（托盘 StartControllers → 关闭再开启）。

## 使用

1. 打开「功能设置 / Cheeco 的小功能」→ **会话控制台**。
2. 从下拉选择会话，或直接粘贴会话 id，点「打开」。
3. 输入消息点「发送」；对话实时刷新，assistant 回复流式显示。

## 说明与常见坑

- 仅显示 **user / assistant 文本**，跳过 reasoning（思考块）。
- 若面板空白：先确认 `panel-config.json` 里已出现 `page: webgate`（说明 `dsh.cheecoPanel.addPage` 生效），
  并且工作台已重启；客户端 slot 名必须是 `cheeco-style.page.webgate`（与 `addPage.id` 一致）。
- 打开"非当前会话"会调用 `ctx.sessions.open(id)` 把它切为当前，从而能拉到历史与流式（会影响当前工作台的当前会话选择）。
- **所有 `package.json` / `cordis.patch.yml` 必须 UTF-8 无 BOM**（DSH 严格 JSON 解析，带 BOM 会导致 profile 启动失败）。

## 版本

`0.1.0`
