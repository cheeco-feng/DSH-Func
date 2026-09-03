# cheeco-dsh-plugins

Cheeco 的 DSH 插件集合。本仓库包含**五个独立插件**（各自是独立的 DSH 插件包）：可整仓一键安装，也可按需单个装。

## 包含

| 子目录 | 包名 | 作用 |
|---|---|---|
| `dsh-client-ui-message-sound` | `@cheeco/dsh-client-ui-message-sound` | **AI 回复提示音**（回合结束时响一声） |
| `dsh-web-ui-cheeco-style` | `@cheeco/dsh-web-ui-cheeco-style` | **Cheeco的小功能** 设置页（含声音开关卡片） |
| `dsh-client-ui-session-search` | `@cheeco/dsh-client-ui-session-search` | **会话内容检索**（标题/内容切换，按用户/回复/工具筛选） |
| `dsh-tool-dsh-plugin-exec` | `@cheeco/dsh-tool-dsh-plugin-exec` | **`dsh_plugin_exec` agent 工具**（执行 `dsh plugin` 管理命令：装/卸/列/查某 profile 的插件） |
| `dsh-client-ui-plugin-manager` | `@cheeco/dsh-client-ui-plugin-manager` | **插件管理（Cheeco 插件管理器）**（列出内置/三方插件，支持安装、卸载、启动、停用，并直跳三方插件 GitHub 仓库） |
| `dsh-client-ui-schedule-panel` | `@cheeco/dsh-client-ui-schedule-panel` | **多AI调度执行面板**（对话页新增「调度」Tab，可视化主控 AI 派单的子代理/后台任务进度、状态、归属与明细，并支持按会话指定压缩用模型） |
| `dsh-web-ui-FuncPackagePanel` | `@cheeco/dsh-web-ui-FuncPackagePanel` | **DSH功能包**（设置侧边栏新增槽位，内页含「功能表」维护中占位与「面版管理」面版改名两个 tab；配置用独立的 DSH-Func-config.json） |
| `dsh-web-ui-SystemPackagePanel` | `@cheeco/dsh-web-ui-SystemPackagePanel` | **DSH系统包**（设置侧边栏新增槽位，内页含「功能表」维护中占位与「面版管理」面版改名两个 tab；配置用独立的 DSH-System-config.json） |

## 安装（先克隆，再按需添加子目录）

推荐：**一条命令装整个仓库的插件（5合1）**

```bash
git clone <本仓库地址>
cd <仓库目录>

# 一条命令把 DSH-Func 的全部插件装进 <profile>
dsh plugin --profile <profile> add \
  ./dsh-client-ui-message-sound \
  ./dsh-client-ui-session-search \
  ./dsh-web-ui-cheeco-style \
  ./dsh-tool-dsh-plugin-exec \
  ./dsh-client-ui-plugin-manager \
  ./dsh-client-ui-schedule-panel \
  ./dsh-web-ui-FuncPackagePanel \
  ./dsh-web-ui-SystemPackagePanel
```

### 按插件单独安装（各插件独立的 GitHub Release 下载 URL）

每个插件一条命令，`dsh plugin add` 会直接从这个 GitHub Release 资产 URL 下载真实的 `.tgz`：

```bash
# AI 回复提示音
dsh plugin --profile <profile> add https://github.com/cheeco-feng/DSH-Func/releases/download/v0.3.0/cheeco-dsh-client-ui-message-sound-0.3.0.tgz

# 会话内容检索
dsh plugin --profile <profile> add https://github.com/cheeco-feng/DSH-Func/releases/download/v0.2.0/cheeco-dsh-client-ui-session-search-0.2.0.tgz

# Cheeco的小功能设置页
dsh plugin --profile <profile> add https://github.com/cheeco-feng/DSH-Func/releases/download/v0.7.5/cheeco-dsh-web-ui-cheeco-style-0.7.5.tgz

# dsh_plugin_exec agent 工具
dsh plugin --profile <profile> add https://github.com/cheeco-feng/DSH-Func/releases/download/v0.1.6/cheeco-dsh-tool-dsh-plugin-exec-0.1.6.tgz

# 插件管理（Cheeco 插件管理器）
dsh plugin --profile <profile> add https://github.com/cheeco-feng/DSH-Func/releases/download/v0.1.0/cheeco-dsh-client-ui-plugin-manager-0.1.0.tgz

# 多AI调度执行面板
dsh plugin --profile <profile> add https://github.com/cheeco-feng/DSH-Func/releases/download/v0.1.1/cheeco-dsh-client-ui-schedule-panel-0.1.1.tgz

# DSH功能包
dsh plugin --profile <profile> add https://github.com/cheeco-feng/DSH-Func/releases/download/v0.1.1/cheeco-dsh-web-ui-FuncPackagePanel-0.1.1.tgz

# DSH系统包
dsh plugin --profile <profile> add https://github.com/cheeco-feng/DSH-Func/releases/download/v0.1.0/cheeco-dsh-web-ui-SystemPackagePanel-0.1.0.tgz
```

> 上面 URL 均为**各插件最新的 GitHub Release 资产**。`dsh plugin add` 会自动把每个带 `dsh.bundle.patch` 的插件写进该 profile 的 `dsh.profile.bundles`。

**卸载（与上面安装对应）**——一条命令卸掉这些插件（用安装后的 package 名）：

```bash
dsh plugin --profile <profile> remove \
  @cheeco/dsh-client-ui-message-sound \
  @cheeco/dsh-client-ui-session-search \
  @cheeco/dsh-web-ui-cheeco-style \
  @cheeco/dsh-tool-dsh-plugin-exec \
  @cheeco/dsh-client-ui-plugin-manager \
  @cheeco/dsh-client-ui-schedule-panel \
  @cheeco/dsh-web-ui-FuncPackagePanel \
  @cheeco/dsh-web-ui-SystemPackagePanel
```
> `dsh plugin remove` 会同时把它们从 `dsh.profile.bundles` 移除。

> **⚠️ 多 profile / `dsh` 不在 PATH 时**：上面用到 `dsh plugin`，前提是 shell 能直接调用 `dsh`。如果你的环境里 `dsh` 不在 PATH 上（`dsh_plugin_exec` 正是为此而做），直接跑 `dsh plugin ...` 会报「无法识别 dsh」。此时**先安装 `dsh-tool-dsh-plugin-exec`**：它内部用 `require.resolve` 定位官方 `@deepseek-ai/dsh` 入口来执行 `dsh plugin`，**无需 PATH**。装好后，让 agent 调用 `dsh_plugin_exec(profile="<目标profile>", command="add ...")` 即可给任意 profile 装/管插件。首次安装该工具而 `dsh` 又不可用时，可用 `pnpm --dir <profile> add file:.../cheeco-dsh-tool-dsh-plugin-exec-0.1.5.tgz`、或引擎绝对路径 `node "<引擎>/node_modules/@deepseek-ai/dsh/lib/bin.js" plugin --profile <p> add ...`、或在 **设置 → 插件 → 用户插件** 里粘贴路径。

按需单个装（参考）：

```bash
# 只装提示音（声音+默认开启，但无设置开关）
dsh plugin --profile <profile> add ./dsh-client-ui-message-sound

# 只装界面（有设置开关，但需配合声音插件才有声）
dsh plugin --profile <profile> add ./dsh-web-ui-cheeco-style

# 只装 dsh_plugin_exec 工具
dsh plugin --profile <profile> add ./dsh-tool-dsh-plugin-exec

# 只装插件管理器
dsh plugin --profile <profile> add ./dsh-client-ui-plugin-manager

# 只装多AI调度执行面板
dsh plugin --profile <profile> add ./dsh-client-ui-schedule-panel

# 只装 DSH功能包
dsh plugin --profile <profile> add ./dsh-web-ui-FuncPackagePanel

# 只装 DSH系统包
dsh plugin --profile <profile> add ./dsh-web-ui-SystemPackagePanel
```

> `dsh plugin` 也可换成在 **设置 → 插件 → 用户插件** 的安装框里粘贴对应的本地/仓库路径。

## 从零开始（新手向）

**第 0 步：先装 DSH（官方源）**

DSH（DeepSeek Harness）官方仓库：<https://github.com/deepseek-ai/deepseek-harness>
- 官方是 **Web 版**（通过 `dsh web` 启动浏览器界面），安装方式有 **npx 一键启动 Web UI**、**源码构建** 等，具体以**官方 README** 为准（新手优先照官方 README 装）。
- **官方没有桌面版**；网上流传的"桌面版"多为第三方，**不推荐**。
- 装好后跑起 `dsh web`（Web UI），即可继续。（本机 DSH 装在官方仓库目录。）

**第 1 步：拿到本插件仓库**

```bash
git clone https://github.com/cheeco-feng/DSH-Func.git
cd DSH-Func
```
> 仓库地址确认：`https://github.com/cheeco-feng/DSH-Func.git`

**第 2 步：安装环境检查（一次性自检，确认环境 OK 再继续）**

在终端依次跑下面几条，对照"预期结果"：

| 检查项 | 命令 | 预期 | 若不通过 |
|---|---|---|---|
| Node.js | `node -v` | 打印出版本号 | 先装 Node.js（DSH 依赖它） |
| git | `git --version` | 打印出版本号 | 先装 git |
| dsh（DSH CLI） | `dsh --version` | 打印出版本号 | 🟡 见下方"dsh 不可用"兜底 |
| pnpm | `pnpm -v` | 打印出版本号 | 先装 pnpm（部分安装用） |

> **🟡 `dsh` 不在 PATH 时**：先 `where dsh`（cmd）或 `command -v dsh`（bash）确认确实找不到（防止 shell 没刷新/路径没配对）。若确认没有 → **先装 `dsh-tool-dsh-plugin-exec`**（它内部用 `require.resolve` 定位官方 `@deepseek-ai/dsh`，**无需 PATH**），再装其余插件。

**第 3 步：安装本仓库插件**

能直接用 `dsh` 就按上方「安装」一节的 **5合1** 一键装齐；若第 2 步确认 `dsh` 不可用，则**先装 `dsh-tool-dsh-plugin-exec`**、再用它执行 `dsh plugin` 装其余（见下）。

**或者：直接让 AI 帮你装（推荐新手）**

在 DSH 里让 AI 执行（AI 自己 clone + 安装）：

```bash
git clone https://github.com/cheeco-feng/DSH-Func.git
cd DSH-Func
dsh plugin --profile <profile> add ./dsh-client-ui-message-sound ./dsh-client-ui-session-search ./dsh-web-ui-cheeco-style ./dsh-tool-dsh-plugin-exec ./dsh-client-ui-plugin-manager
```

若 `dsh` 在当前环境不可用，让 AI 先把 `dsh-tool-dsh-plugin-exec` 装上（上面 ⚠️ 提示里有替代入口），再让 AI 用 `dsh_plugin_exec(profile="<profile>", command="add ...")` 装其余插件。

## 进阶：用多个 profile 安全测试/安装陌生插件

**核心概念**：DSH 的一切都是"profile"（工作台）。一个 profile = `$DSH_HOME/profiles/<名字>` 目录，是一个**独立的 pnpm 工作区**，自带：

- `package.json`（含 `dsh.profile.bundles` = 该工作台的插件列表）
- `cordis.patch.yml`（用户补丁层）
- `pnpm-workspace.yaml`、`node_modules`

不同 profile 完全独立：各自插件、配置、node_modules 互不影响；同一台机器可**同时跑多个 profile**，各占一个端口。这就是"装陌生插件最稳"的沙盒。

**怎么建多个 profile**

1. profile 目录**首次使用会自动初始化**：跑 `dsh --profile <名字> ...` 或 `dsh plugin --profile <名字> add ...` 都会自动生成上面那些文件。
   - 自定义名字（如 `test`/`mobile`）初始只有 `@deepseek-ai/dsh-base`；内置模板 `web`/`headless` 自带 `@deepseek-ai/dsh-web-app` / `@deepseek-ai/dsh-headless`。
2. 启动指定 profile：`dsh --profile <名字> --port <端口>`（或 Web 面 `dsh web --port <端口>`）。
3. 装插件：`dsh plugin --profile <名字> add <包|tgz>`（会自动写进该 profile 的 `dsh.profile.bundles`）。

**用多 profile 测试陌生插件的技巧（安全隔离）**

1. **别动主 profile**（如 `web`），先建/用**专用测试 profile**（如 `test`）。
2. 在测试 profile 里装：`dsh plugin --profile test add <陌生插件>`。
3. **先验证能否加载**：`dsh --profile test --dump-config` 看组合树是否报错、插件是否注册。
4. **验证功能**：若插件是工具，先在 test 上跑通（如 `dsh_plugin_exec` 先 `list`/`why`）。
5. 确认 OK 再装到主 profile；若陌生插件有问题，只影响 `test`、不影响 `web`/主环境，可随时 `dsh plugin --profile test remove <它>`。
6. **多版本并存**：不同 profile 可用不同插件版本，互不干扰（每个工作台是独立真副本）。

**注意**：改 profile 配置务必走 `pnpm` / `dsh plugin`（别手改 node_modules，防"package.json≠lockfile≠node_modules 三张皮不一致"）；不同 profile 用不同端口防冲突；`dsh` 不在 PATH 时，可用 `dsh-tool-dsh-plugin-exec`（`dsh_plugin_exec`）在某个 profile 里执行 `dsh plugin` 管理其它 profile。

## 使用

- 装好后，打开 **设置 → Cheeco的小功能 → 声音提示音**。
- **开/关**：点「关闭声音 / 开启声音」。
- **换声音**：点「选择声音文件」选一个音频（存为 data URI，无需服务器）。
- **试听**：点「试听」立即播当前声音；声音关闭时试听不响。
- **恢复默认**：点「恢复默认」回到默认"叮咚"。
- **面板改名**：输入新名字点「保存」，改这个面板在侧边栏的名字（下次打开生效）。
- **面板位置**：默认排在设置**第一位**（`order: -1`）；想改位置改 `lib/client.js` 的 `order` 值。
- AI 回复**结束时响一声**（回合收尾才响，过程中不响）。

## 说明
- 两个插件通过 `localStorage["dsh-msg-sound-enabled"]` 联动。
- 只装声音插件 = 有声（默认开）但没设置开关；只装界面 = 有开关但无声；装两个 = 最完整。

## 开发指南
想写自己的 DSH 插件？看 **`[PLUGIN-GUIDE.md](PLUGIN-GUIDE.md)`**（结构、注册、设置页、安装、BOM 等常见坑，基于实战整理）。

## 发布新版本（一键发布脚本）

改完代码要发新版时，一条命令搞定「升版本 → `npm pack` → 建/更 GitHub release → 上传 tgz 资产 → 刷新功能推荐的 install URL → git commit + push」：

```bash
cd DSH-Func

# 先看计划（不改任何文件、不发布）
node publish.mjs <插件目录> <新版本> --dry-run

# 正式发布（例：发布 cheeco-style 0.8.0）
node publish.mjs dsh-web-ui-cheeco-style 0.8.0
```

- `<插件目录>` 目前支持：`dsh-web-ui-cheeco-style` / `dsh-client-ui-message-sound` / `dsh-client-ui-session-search` / `dsh-tool-dsh-plugin-exec` / `dsh-client-ui-plugin-manager` / `dsh-client-ui-schedule-panel` / `dsh-web-ui-FuncPackagePanel` / `dsh-web-ui-SystemPackagePanel`。
- **安装源永远走 GitHub release 资产 URL，不走 npm**（产品「功能推荐」里每个功能的 `install` 就是 release 下载 URL）。
- 功能列表 `CHEECO_FEATURES` 是**手写**的（在 `dsh-web-ui-cheeco-style/lib/index.js`），发布某插件后脚本会把该功能的 `install` 指向新 release 资产 URL。
- 因为功能列表随 `dsh-web-ui-cheeco-style` 一起打包，**发布「非 style」插件时脚本默认会顺手把 `dsh-web-ui-cheeco-style` 升一个小 patch 并重发一次**（让新 install URL 真正送达用户）；不想要就加 `--no-ship-style`。
- GitHub token 读取顺序：`--token` > 环境变量 `GITHUB_TOKEN` / `GH_TOKEN` > `git credential fill`。
- `npm pack` 在 Windows 偶发假报退出码 1，脚本**以 tgz 是否落盘为准**，不必担心。

> 日常改完代码想装到本机测试：直接 `dsh plugin --profile <profile> add ./子目录`，不一定要走发布脚本。

## 常见问题 / 经验
- **卡启动 / 92% / `SyntaxError`**：常见原因是**编辑了 profile 的 `package.json` 或 `desktop-plugins.lock.json` 时，文件开头带了 UTF-8 BOM**（字节 EF BB BF）。DSH 用严格 JSON 解析，**BOM 会直接导致 `SyntaxError`、全量启动失败**。
  - 正确做法：用 **不带 BOM 的 UTF-8** 写这些 JSON（例如 PowerShell 用 `[System.Text.UTF8Encoding]::new($false)`），或用文本编辑器保存为"UTF-8 无 BOM"。
  - 这条经验也适用于任何往 DSH profile 里加配置 / 记插件清单的场景。
- **卸载后重装**：从本仓库装回，`dsh plugin add ./子目录` 即可；配置文件保持"无 BOM"就不会崩。



