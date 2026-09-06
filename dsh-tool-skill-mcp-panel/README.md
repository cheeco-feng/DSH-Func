# dsh-tool-skill-mcp-panel（技能 / MCP 能力面板）

DSH 插件，在 Web 设置页同时提供「技能」与「MCP」两个管理面板，并随包提供统一终端命令 `dsh-panel`（`skill` / `mcp` 两个子命令族）。

## 功能描述

> 插件名：`dsh-tool-skill-mcp-panel`
> 中文名：**技能 / MCP 能力面板**

**功能总览**：

1. **设置页管理面板** —— 在设置页 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）→ 技能 / MCP管理** 里，提供「技能」与「MCP」两个管理面板：
   - **技能管理**：查看、启用/停用、增删、搜索、按工作区分栏、批量迁移、技能分组。
   - **MCP 管理**：新增、编辑、启停、删除、测试 MCP 服务器（Stdio / HTTP），保存后 DSH HMR 热加载。

2. **输入框「引用」弹窗的注入内容** —— 本插件向 **槽位窗口管理面板（dsh-web-ui-WindowSlot-Panel，引用按钮）** 的弹出页注入「技能」「常驻技能列表」两个 tab：
   - 供用户在聊天输入框底部点击「引用」按钮后，快速**选择技能**（勾选自动往输入框草稿注入 `/技能名`）或设置**常驻技能列表**。
   - 这是面向**快速使用**的入口，与设置页的**管理**入口不冲突、同时存在。

3. **终端命令** —— 随包提供 `dsh-panel` 命令（`skill` / `mcp` 两个子命令族），可在终端管理技能与 MCP。

**一句话定位**：它既是「技能 / MCP 的**管理**面板（放设置页）」，也是「技能**快速使用**的内容源（注入引用弹窗）」。

### 版本

**当前版本**：`0.1.0`

**版本历史**：

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| 0.1.0 | 2026-09-06 | 基于上游 [Fishquito7/dsh-skill-mcp-panel](https://github.com/Fishquito7/dsh-skill-mcp-panel) （v2.0.2）封装进 Cheeco 插件库（ [github.com/cheeco-feng/DSH-Func](https://github.com/cheeco-feng/DSH-Func) ）。整合「技能(选择)/常驻技能列表」两个 tab；技能/MCP 作为 tab 并入 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）**；移除独立的「能力包」；向 **槽位窗口管理面板（dsh-web-ui-WindowSlot-Panel，引用按钮）** 的「引用」弹窗注入技能选择/常驻技能列表，输入框「能力」按钮移除。 |

> 以后每次改版，在此表上方追加一行（版本号 / 日期 / 变更要点），并同步更新「当前版本」。

## 安装

安装到某 profile（bundle 层自动挂载，无需编辑配置文件）：

```bash
dsh plugin --profile web add <本地/远端 tgz 或源码目录>
```

装到本仓库源码目录的开发方式：

```bash
dsh plugin --profile test add ./dsh-tool-skill-mcp-panel
```

> 因是客户端 bundle 改动，安装后需**重启对应实例**（并刷新页面）才生效。

## 工作原理

### 技能部分
页面和 `dsh-panel skill` 命令的每次操作，最终都是对磁盘上技能文件（`SKILL.md`）的改动，DSH 自带的文件监听器立刻发现变化——所以启用/停用、增删、迁移都热生效，无需重启。

- 技能实体直接存放在其工作区技能文件夹：全局 = `~/.dsh/skills`，工作区 = `<工作区>/.dsh/skills`；卸载插件后技能仍是普通文件，照常被 DSH 发现。
- 停用 = 把 `SKILL.md` 改名为 `SKILL.md.disabled`；启用 = 改回来。
- 改变所属位置 = 真实地把文件复制/移动到目标文件夹（先校验、失败回滚）。
- 随部署附带的技能（bundled）为只读，不可停用/删除。

### MCP 部分
负责把 MCP 服务器配置写进 profile 的 `cordis.patch.yml` 受管块；真正连接和注册工具的是 DSH 官方插件 `@deepseek-ai/dsh-mcp-client`，由 DSH 的 HMR 自动加载。

## 命令行

统一父命令为 `dsh-panel`。

### 技能子命令
```bash
dsh-panel skill --help
dsh-panel skill list                                  # 列出技能（含工作区：全局 / 工作区）
dsh-panel skill add <path>                            # 添加到全局（.md 文件、目录束或 .zip 压缩包）
dsh-panel skill add <path> --workspace D:\项目A       # 直接添加到指定工作区
dsh-panel skill scope <name> --global                  # 迁移单个技能到全局
dsh-panel skill scope <name> --workspace D:\项目A      # 迁移单个技能到指定工作区（--copy 复制）
dsh-panel skill migrate <name...|--all> --from <全局|路径> --to <全局|路径> [--copy] [--yes]
dsh-panel skill disable <name>       # 停用
dsh-panel skill enable <name>        # 启用
dsh-panel skill delete <name>        # 删除（需确认）
```

### MCP 子命令
```bash
dsh-panel mcp list [--profile <name>]
dsh-panel mcp add --name <serverName> --stdio --command <cmd> [--args <arg> ...] [--env KEY=VALUE ...] [--cwd <path>] [--profile <name>]
dsh-panel mcp add --name <serverName> --http --url <url> [--header KEY=VALUE ...] [--profile <name>]
dsh-panel mcp enable|disable <serverName> [--profile <name>]
dsh-panel mcp remove <serverName> [--yes] [--profile <name>]
dsh-panel mcp test <serverName> [--profile <name>]
dsh-panel mcp update [--yes] [--profile <name>]
dsh-panel update [--yes] [--profile <name>]      # 更新整个插件
```

MCP 配置写入目标 profile 的 `cordis.patch.yml` 受管块；网关在线时自动热加载。面板块由
`# >>> dsh-skill-mcp-panel:mcp:begin` / `# <<< ...end` 标记，请勿手改块内内容。

CLI 只扫描当前目录锚定的项目根与用户根；管理其他工作区的技能请加 `--cwd <工作区路径>`。
同名技能存在于多个作用域时，`enable` / `disable` / `delete` 需加 `--global` / `--project` / `--workspace` 指定操作哪一份。

## 卸载

```bash
dsh plugin --profile web remove @cheeco/dsh-tool-skill-mcp-panel
```

## License

MIT
