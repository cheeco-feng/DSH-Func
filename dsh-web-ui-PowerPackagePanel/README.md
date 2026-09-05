# dsh-web-ui-PowerPackagePanel（能力包）

Cheeco 「能力」包：在设置侧边栏注册一个「能力」槽位（settings.section，id = `dsh-power-package`），
内页是一个动态 tab 结构，tab 由**能力插件**经子 slot 注入。未安装任何能力时显示默认空白页「未安装相关能力」。

## 子 slot 契约（能力插件注入点）

| 子 slot | 含义 | 默认注入者 |
| --- | --- | --- |
| `dsh-power-package.skill` | 技能（选择/调用技能） | dsh-tool-skill-mcp-panel |
| `dsh-power-package.auto` | 常驻技能列表（默认启用） | dsh-tool-skill-mcp-panel |
| `dsh-power-package.mcp` | MCP 管理 | dsh-tool-skill-mcp-panel |

## 行为

- 没有任何能力子 slot 被注入 → 显示「未安装相关能力」空白页。
- 有字段被注入 → 隐藏空白页，直接显示已注入的 tab（技能 / 常驻技能列表 / MCP 管理），像系统包那样。

## 声明

- `package.json` 里 `dsh.bundle.patch` 指向 `cordis.patch.yml`。
- 宿主侧 `lib/index.js` 为空 `apply`（纯 UI 包），浏览器侧经 `exports["./client"]` 提供。

## 其它同构包

系统包（`dsh-web-ui-SystemPackagePanel`）、功能包（`dsh-web-ui-FuncPackagePanel`）、插件包、补丁包等均同构。
发布/升级流程见仓库根 `CHEECO-WORKFLOW-SOP.md`。
