# StartControllers

一个基于 .NET Framework 4.0 WinForms 的桌面托盘工具，用来**一键开关多个 DSH 工作台**（dsh web 实例）以及**NPS 内网穿透（npc 客户端）**。主要面向 DeepSeek Harness（dsh）运行环境的本地化管理。

> 本工具**不依赖、不改动 dsh 本体**；用 `csc.exe` 编译（见 `build.bat`），无外部 NuGet 依赖。

## 特性

- 多工作台统一管理：总览 / 分页 / 系统托盘都可开关、查看状态、打开网页、重启、复制链接。
- 支持「一键启动/停止」已勾选的工作台 + NPS 外网。
- **配置化**：所有机器专属路径和工作台列表从同目录 `config.json` 读取，不再硬编码。
- **设置页 + 环境自动检测**：一键探测 `node.exe`、`DSH_HOME`、profiles，回填配置。
- 「一键开关控制」小勾状态**持久化到 config.json**，重开后恢复到上次勾选状态。
- **设置页为两个子 tab**：「运行环境」（路径配置）+「其它设置」（实时监测）。
- **实时监测**：勾选后定时（每 3 秒）检查各工作台/NPS 端口状态并刷新界面，感知外部开启/关闭；不勾则不监听；状态持久化到 config.json。
- NPS 未配置/未启用时优雅禁用，不会因缺路径而崩溃。

## 目录结构

```
exe-tool-start-controllers/
├─ StartControllers.cs      源码（含依赖 System.Web.Extensions，用于 JSON 配置）
├─ build.bat                编译脚本（csc）
├─ app.manifest             WinForms 清单（DPI 感知）
├─ greenC.ico               程序图标
├─ config.example.json      配置示例（空占位，公开模板）
├─ config.json              你本地的实际配置（机器专属，通常不入库）
└─ start-controllers.log    运行日志（运行时生成）
```

## 构建

需要 .NET Framework 4.0 的 `csc.exe`（通常位于
`C:\Windows\Microsoft.NET\Framework64\v4.0.30319\` 或 `Framework\`）。

```bat
build.bat
```

生成的 exe 为 `start-controllers.exe`。若你的 `csc` 路径不同，修改 `build.bat` 中的 `CSC`。

## 配置说明（config.json）

把 `config.example.json` 复制为 `config.json`，按需填写。格式如下：

```json
{
  "paths": {
    "nodeExe": "C:\\Program Files\\nodejs\\node.exe",
    "engineHome": "…引擎根目录，可留空…",
    "binJs": "…dsh 的 bin.js 绝对路径…",
    "workDir": "…dsh 工作目录…",
    "dshHome": "…DSH 数据目录…",
    "npcDir": "…npc 客户端目录…"
  },
  "workbenches": [
    { "name": "工作台 1 · Web", "profile": "web", "port": "49982",
      "desc": "主工作台", "args": "{binJs} web --port {port} --no-open", "enabled": true }
  ],
  "nps": { "enabled": true }
}
```

- `paths.binJs` 可直接指定；也可只填 `paths.engineHome`，程序按
  `engineHome\node_modules\@deepseek-ai\dsh\lib\bin.js` 自动拼出。
- `workbenches[].args` 用占位符 `{binJs} / {profile} / {port}`，运行时展开。
- `paths.npcDir` 留空或 `nps.enabled=false` 时，NPS 功能禁用（不崩）。
- 大多数路径留空时回退到内置默认（公开版默认为空占位，不内嵌机器路径）。

## 设置页

运行后在「设置」页：
- 直接编辑各路径；
- 点「**自动检测环境**」一键填写所有项：探测 `node.exe`、`DSH_HOME`、profiles，
  并用当前 `bin.js` 反推「DSH 引擎目录」（`bin.js` 为空时也可由引擎目录派生，
  保存时若 `bin.js` 为空也会自动派生兜底）；
- 点「**保存配置**」写回 `config.json`，**重启程序**生效；
- 「**打开 config.json**」用记事本直接编辑。

> 工作台列表可在「DSH智能体管理」页点击 **新增工作台 / 从profiles导入 / 删除当前** 动态管理，
> 改动即写回 `config.json` 并实时重建工作台 tab。

## 注意事项

- `config.json` 和日志含机器/环境信息，**不要**提交到公开仓库；示例用
  `config.example.json`。
- 程序为单实例运行（互斥体 + 命名事件），重复启动会切到已有实例。
