# StartControllers

一个基于 **.NET Framework 4.0 WinForms** 的桌面托盘工具，用于**一键管理多个 DSH 工作台**（dsh web 实例）以及 **NPS 内网穿透（npc 客户端）**。主要面向 DeepSeek Harness（dsh）运行环境的本地化管理。

> 本工具**不依赖、不改动 dsh 本体**；用系统自带 `csc.exe` 编译（见 `build.bat`），**无外部 NuGet 依赖**。

---

## 特性

- **多工作台统一管理**：总览 / 分页 / 系统托盘都可开关、查看状态、打开网页、重启、复制链接。
- **「一键启动/停止」**：按勾选的「一键开关控制」批量启停工作台 + NPS 外网。
- **配置化**：所有机器专属路径与工作台列表从同目录 `config.json` 读取，**不再硬编码**。
- **去敏**：公开版本二进制不内嵌任何机器专属路径；机器信息只存本地 `config.json`，并已 gitignore。
- **设置页（两个子 tab）**：「运行环境」（路径配置 + 一键检测）；「其它设置」（实时监测）。
- **环境自动检测**：一键探测 `node.exe`、`DSH_HOME`、profiles，并回填/自动反推路径。
- **工作台动态管理**：`DSH智能体管理` 页可 **新增工作台 / 从 profiles 导入 / 删除当前**，改动即时写回 config 并**实时重建工作台 tab**。
- **「一键开关控制」小勾状态持久化**：勾选改变即自动写入 config.json，重开后恢复上次状态。
- **实时监测**：勾选后每 3 秒检查各工作台/NPS 端口并刷新界面，**感知外部开启/关闭**；不勾则不监听；底部状态栏显示「实时监听 / 未实时监听」。
- **重启**：每个工作台提供「重启」（先停后启），日志拆成「关闭 / 开启」两条。
- **NPS**：未配置/未启用时优雅禁用，不因缺路径而崩溃。

---

## 目录结构

```
exe-tool-start-controllers/
├─ StartControllers.cs      源码（依赖 System.Web.Extensions，用于 JSON 配置）
├─ build.bat                编译脚本（csc）
├─ app.manifest             WinForms 清单（DPI 感知）
├─ greenC.ico               程序图标
├─ config.example.json      配置示例（空占位，公开模板）
├─ config.json              你的本地实际配置（机器专属，通常不入库，已 gitignore）
├─ start-controllers.log    运行日志（运行时生成，已 gitignore）
├─ npc/                     本地运行资源：npc.exe(第三方 NPS 客户端) + conf/npc.conf(含真 vkey) —— 不入库
├─ npc.conf.example         公开示例：NPS 配置模板（vkey/IP 为空占位）
└─ README.md                说明文档
```

---

## 构建

需要 .NET Framework 4.0 的 `csc.exe`（通常在
`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\` 或 `Framework\`）。

```bat
build.bat
```

- 生成的 exe 为 **`start-controllers.exe`**。
- 若你的 `csc` 路径不同，修改 `build.bat` 里的 `CSC`。
- 构建需引用 `System.Web.Extensions.dll`（`build.bat` 已含 `/r:System.Web.Extensions.dll`，用于 JSON 配置读写）。

---

## 配置说明（config.json 与 profiles-config.json）

把 `config.example.json` 复制为 `config.json`，按需填写。示例：

```json
{
  "paths": {
    "nodeExe": "C:\\Program Files\\nodejs\\node.exe",
    "engineHome": "…引擎根目录，可留空…",
    "binJs": "…dsh 的 bin.js 绝对路径…",
    "workDir": "…dsh 工作目录…",
    "dshHome": "…DSH 数据目录…",
    "npcDir": "…npc 客户端目录…",
    "profilesConfig": "F:\\DeepSeekHarnessDataOriginal\\profiles\\profiles-config.json"
  },
  "nps": { "enabled": true, "participate": true },
  "ui": { "realtimeMonitor": false }
}
```

字段说明：
- **paths**：各运行路径。
  - `binJs` 可直接指定；也可只填 `engineHome`，程序按
    `engineHome\node_modules\@deepseek-ai\dsh\lib\bin.js` 自动拼出。
  - `npcDir` 留空或 `nps.enabled=false` 时 NPS 功能禁用（不崩）。
  - **`profilesConfig`**：profile 统一档案路径（**唯一真源，必须填写**）。工具启动/导入时从这里读取所有工作台参数；为空时明确提示「未配置」，**绝不自动回退/猜测**。
- **工作台参数来自 `profiles-config.json`（规范档案）**，不是 config.json：
  - `profilesConfig` 指向的文件（如 `DSH_HOME\profiles\profiles-config.json`）是**只读规范定义**，数组形如：
    ```json
    [ { "name": "工作台 · web", "profile": "web", "port": "49982",
        "args": "{binJs} --profile {profile} --port {port} --no-open",
        "enabled": true, "participate": true }, … ]
    ```
  - `args` 支持占位符 `{binJs} / {profile} / {port}`；`enabled`（是否生成该 tab）；`participate`（是否参与「全部启动/停止」，勾选改变即自动保存）。
  - 工具运行时（增删改工作台）把**当前运行态列表**写入**自己的 config.json** 的 `workbenches` 字段；`profiles-config.json` 只读不改。
- **nps**：`enabled`（是否启用）、`participate`（是否参与一键批处理）。
- **ui**：`realtimeMonitor`（是否开启实时监测）。

> 大多数 path 留空时回退到内置默认（公开版默认是空占位，**不内嵌机器路径**）。
> `profilesConfig` 为空时，工具「从 profiles 导入」会**弹窗提示未配置**，不会自行补路径。

---

## 界面与用法

- **运行状态总览**：各工作台/NPS 的状态、开启/关闭/打开网页/重启/复制链接，以及「启动已勾选 / 关闭已勾选」批量操作。
- **DSH智能体管理**：每个工作台一个子 tab（开启/关闭/状态/打开网页/重启 + 操作日志）；底部 **新增工作台 / 从profiles导入 / 删除当前 / 全部启动 / 全部停止**。
- **NPS端口管理**：外网访问的开启/关闭/状态 + 日志。
- **设置**（子 tab）：
  - **运行环境**：编辑路径；「自动检测环境」一键填写；「保存配置」；「打开 config.json」。
  - **其它设置**：「实时监测」开关。

工作台列表可在「DSH智能体管理」页用 **新增/从profiles导入/删除** 动态管理，改动即时写回 config 并实时重建工作台 tab。

---

## 版本记录

- **v1.4**（2026-09）：
  - **NPS 自包含**：把 `npc.exe`(第三方) + `conf/npc.conf` 并入工具同目录 `npc/`，`npcDir` 支持在配置里指到该处，为空时默认用工具同目录 `npc`，不再依赖外部 E: 路径。
  - **NPS 配置对话框**：NPS 页新增「配置」按钮，弹窗显示全部参数（服务器地址、vkey、conn_type、auto_reconnection、crypt、compress、disconnect_timeout，字段名中英文）；`server_addr`/`vkey` 默认空（敏感项自行填写），其它显示默认值，确定后写入 `conf/npc.conf`。
  - **缺配置自动生成**：`conf/npc.conf` 缺失时自动生成**空白模板**（不复制旧值），配合配置对话框填写；不再自动找回被删/改名的旧配置。
  - 新增 `npc.conf.example` 公开模板（vkey/IP 占位）；`npc/`（真 vkey + 12MB exe）gitignore 不入库。
  - 底部状态栏新增「实时监听 / 未实时监听」指示。
- **v1.3**（2026-09）：
  - 工作台列表改为**配置驱动 + 动态管理**（新增 / 从 profiles 导入 / 删除当前，实时重建 tab）。
  - 新增「**重启**」按钮（先停后启，日志拆两条：关闭 / 开启）。
  - 新增「**实时监测**」（每 3 秒轮询端口感知外部启停；底部状态栏显示 实时监听/未实时监听）。
  - 「一键开关控制」小勾**改变即自动保存**到 config.json，重开恢复。
  - 设置页改为两个子 tab（运行环境 / 其它设置）；总览与子 tab 按钮统一走同一套逻辑并写日志。
  - 移除「强刷新」「写入示例模板」；全局异常捕获，不再弹崩溃框。
  - **去敏**：公开版二进制不内嵌机器路径；机器信息只存本地 config.json 并 gitignore。

---

## 注意事项

- `config.json` 与 `start-controllers.log` 含机器/环境信息，**不要提交到公开仓库**；公开用 `config.example.json`。
- 程序为**单实例运行**（命名互斥体 + 事件），重复启动会切到已有实例。
- 工作台状态通过**端口探测**（`IsPortOpen`，socket 连接 800ms 超时）判断；实时监测是轮询刷新显示，不影响 dsh 本体。
