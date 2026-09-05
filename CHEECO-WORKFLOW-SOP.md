# Cheeco 插件 统一工作流 SOP（任何 AI 执行插件相关工作，先读本文件）

> 目的：让 cheeco 插件的「**设计 / 安装 / 上传 / 版本管理 / 维护**」全流程可复现、可统一。
> 任何 agent 在本机/本仓库维护 cheeco 插件前，**必须先读本文件**，并严格按其执行。

---

## 0. 环境硬事实（先对齐，否则必踩坑）
- `DSH_HOME` = `F:\DeepSeekHarnessDataOriginal`
- **唯一真源** = `F:\DeepSeekHarnessDataOriginal\DSH-Func`（git，remote = `github.com/cheeco-feng/DSH-Func`）
- profile 工作台：`profiles\{web,test,mobile}`（web=49982 / test=49984 / mobile=49983），各自独立（独立 node_modules + config）。
- **pnpm store 必须一致**：所有 profile 的 `node_modules` 必须链接到 **`F:\.pnpm-store`**。
  - 若 `.modules.yaml` 的 `storeDir` = `F:\DeepSeekHarnessDataOriginal\.pnpm-store` → 与 pnpm 默认不一致 → 一切走 pnpm 的操作报 `ERR_PNPM_UNEXPECTED_STORE`。
  - 修复：备份 `node_modules/@cheeco/cheeco-config.json` + `cheeco-registry.json` → 删 `node_modules` → `pnpm install`（默认 store）→ 还原两文件 → 重启工作台。

---

## 1. 唯一真源（严禁副本散落）
- 源码只在 `DSH-Func`（所有插件，含 `lib/`、`cordis.patch.yml`、`package.json`）。**无 `src/`（AI 直接改 `lib/` 正式代码，不需要 TS 源）。**
- 禁止副本：`DSH-Src`、`dsh-switch-search-src`、engine `node_modules\@cheeco`、profile `link:`、`downloads` 里的旧 tgz、`_tmp_*` 临时产物。发现即清理。
- **版本 + 最新下载地址唯一真源 = `DSH-Func/cheeco-dsh-plugins.json`**（仓库根单文件）。

---

## 2. 设计规范（怎么设计/改插件）
- **宿主（host，`lib/index.js`）**：Cordis 插件（class 形状），用 `webServer` 注册 HTTP 路由（`/cheeco-style/*`）；用 `require.resolve` 定位官方 dsh 跑 `dsh plugin`；config 读写走文件。
- **浏览器端（client，`lib/client.js`）**：`window.__ModuleLoader__.load`，用 `slots`（`settings.section`、`settings.plugins.tab`）注册；用 `react_jsx_runtime.jsx` 写 JSX（已打包、**不是**手写 .tsx）。
- **插件声明**：`package.json` 里 `dsh.bundle.patch`（指向 `cordis.patch.yml`）+ `dsh.client.inject`（声明 client 依赖的服务）。
- **功能推荐列表（数据源，关键）**：插件中心页（`dsh-client-ui-plugin-push`）的 `featureList()` **优先读外部清单** = GitHub main 上的仓库根 `cheeco-dsh-plugins.json`（`MANIFEST_URL = raw.githubusercontent.com/cheeco-feng/DSH-Func/main/cheeco-dsh-plugins.json`），只有取不到才回退内置 `CHEECO_FEATURES`（手写元数据：id/name/pkg/folder/install/url）+ `DSH_OFFICIAL`（官方条目，仅列出）。每个条目每条目都要有稳定 `id`。
  - **所以新增/更新插件必须 `git push` 到 GitHub 让该清单文件更新，功能推荐才会显示**；仅改本地内置 `CHEECO_FEATURES` 或本地清单文件而不 push，面板看不到。且 `getManifest()` 每 60s 缓存 + raw.githubusercontent 有 CDN 缓存滞后（新条目要等 CDN 刷新才出现，验证用 GitHub API `contents?ref=main` 读 base64 解码而非 raw）。
- **版本显示**：当前版本读本地 `node_modules/@cheeco/<folder>/package.json`；最新版本读清单 `cheeco-dsh-plugins.json`（`latestVersionOf`）。
- **启用/停用**：只读显示（从 `/pmgr/list` 的 `enabled` 读取），开关放 plugin-manager。
- **按钮/文案**：主操作（我要安装）用主题蓝 `#3498db` 白字；文本用中文；删除括号等冗余说明。

---

## 3. 发布&更新版本 标准流程（每发一版）
**0. 新插件必须先在 `publish.mjs` 的 `META` 表注册**（`folder -> { id, label, pkg }`），否则 `node publish.mjs <folder>` 会直接报「未知插件 folder」。`id` 必须与该插件在功能推荐清单 `CHEECO_FEATURES` 里的条目 `id` **一致**（publish.mjs 靠 `meta.id` 去刷新该条目的 install URL、并给 release 起名）。发布**已有**插件无需此步；只有**新增**插件要。→ 此坑我实踩：`system-info` / `user-center` 两次报「未知插件 folder」才补上。

**一致性检查点：以下 5 处版本必须同号，缺一即不一致：**
1. `package.json` 的 `version`
2. `lib/index.js` 的 `PLUGIN_VERSION`
3. `lib/client.js` 的 `PLUGIN_VERSION`
4. `cheeco-dsh-plugins.json` 里该插件 `version`
5. （兜底）`CHEECO_FEATURES` 里静态 `install` 回退 URL 的版本

**步骤：**
1. bump `package.json` → 同步 2、3、4、（5）。
2. 在插件目录 `npm pack` → 生成 `release/cheeco-<plugin>-<ver>.tgz`。
3. `git add` + `git commit`（中文、`feat/fix/refactor(dsh-xxx-…):…`）+ `git push origin main`。
4. 用 GitHub API（token 在 `_fixreleases.ps1` / 用户 .npmrc）建 release（`tag v<ver>`）+ 上传新 tgz。
5. 安装到目标 profile（§4）；若引用了最新版下载，**清单里版本已更新 → 下载地址自动指向新版本**（动态拼接）。

> **⚠️ 新增插件（非已有插件升级）四步缺一不可，否则功能推荐不显示 / 安装失败：**
> 1. 改 5 处版本 + 清单（`package.json`/`PLUGIN_VERSION`/`cheeco-dsh-plugins.json`/`CHEECO_FEATURES` 主副副本）+ `publish.mjs` 的 `META`；
> 2. `npm pack` 出 tgz；
> 3. **`git push` 到 GitHub**（功能推荐显示源 = GitHub main 上的 `cheeco-dsh-plugins.json`，不 push 面板看不到；见 §2）；
> 4. **建 GitHub release 并上传 tgz 资产**（否则"我要安装"的 download URL 无该 tgz → 下载失败）。
> 我实踩过：只改本地清单没 push → 面板看不到；只 push 源码不传 release 资产 → 安装失败。

### 3.5 版本号前缀规则（重要，防撞号 — 用户 2026-09-06 决策，务必遵守）

**背景**：GitHub 一个仓库的 release **tag 名全局唯一**（= `v` + 版本号）。不同插件如果版本号相同（如 push 和 plugin-manager 都到 `0.1.x`），就会撞同一个 tag，导致 `getOrCreateRelease` 复用别人的 release、把资产污染进去。此前 plugin-manager 用 `0.1.3` 就撞上了 push 的 `v0.1.3`，被塞进了"功能推荐（插件中心）0.1.3"。

**用户定的规则（保留原话）**：「如果版本号不能重复，那就直接在前面增加版本号的前缀如何。」
→ **所有 cheeco 插件发版一律用「前缀式」tag**：`v<插件id>-<版本号>`。`<插件id>` = 该插件在 `publish.mjs` `META` 里的 `id`（同时等于功能推荐清单条目 `id`）。

| 插件 | id（前缀） | 版本号示例 | release tag | 资产文件名 |
|---|---|---|---|---|
| dsh-client-ui-plugin-push | push | 0.1.10 | `vpush-0.1.10` | `cheeco-dsh-client-ui-plugin-push-0.1.10.tgz` |
| dsh-client-ui-plugin-manager | pmgr | 0.2.6 | `vpmgr-0.2.6` | `cheeco-dsh-client-ui-plugin-manager-0.2.6.tgz` |
| dsh-client-ui-message-sound | sound | 0.3.3 | `vsound-0.3.3` | `cheeco-dsh-client-ui-message-sound-0.3.3.tgz` |

**关键点**：
- **只有 release tag 加前缀**；资产文件名**不加前缀**（仍是 `cheeco-<folder>-<ver>.tgz`）。
- 下载 URL 形如 `https://github.com/cheeco-feng/DSH-Func/releases/download/v<id>-<版本>/cheeco-<folder>-<版本>.tgz`。
- `publish.mjs` 已支持：`getOrCreateRelease`/`refreshFeatureInstall` 均已改为 `v${meta.id}-${version}`；`dsh-client-ui-plugin-push` 的 `resolveDownloadUrl` 已按 `PREFIX_BY_FOLDER` 前缀拼接。
- **以后新增/升级插件，务必按前缀 tag 发版**，并与 `publish.mjs` `META`、功能清单 `id` 保持一致。旧的无前缀 tag（如 `v0.3.3`）保留不动，新版一律走前缀。

---

## 4. 安装到 profile
- 标准：`dsh plugin --profile <p> add file:<release tgz 全路径>`（走 pnpm）。
- 前提：store 已对齐 `F:\.pnpm-store`（§0）。
- 装完**必须重启**工作台（托盘 StartControllers → 关闭再开启），否则 bundle 不生效。
- `dsh plugin add` 会自动把带 `dsh.bundle.patch` 的插件写进 `dsh.profile.bundles`。

---

## 5. config 保留（cheeco-config.json）
- 位置：`node_modules/@cheeco/cheeco-config.json`（@cheeco 根，独立于插件包 → pnpm 删插件不删它）。
- 行为：安装/升级/卸载**都不覆盖**。`ensureConfigMetadata` 只在文件**不存在**时创建；已存在则跳过。
- **注意副作用**：跳过写入意味着 config 里的 `dsh` 元数据（profileName/pluginVersion）**不会自动刷新**；若工作台易名/升级，该块会偏旧（可接受，或由用户在设置里手动刷新）。
- `/cheeco-style/config` 的 GET/POST：用户改设置走 POST 写全量（此时会正常更新）。

---

## 6. 卸载（独立方法，不经 pnpm）
- `handleUninstall`：① 从 profile `package.json` 移除依赖 + `dsh.profile.bundles`；② 删 `node_modules/@cheeco/<folder>`（保留 @cheeco 根）；③ 更新 `cheeco-registry.json`（移除 + 记 uninstall 事件）。
- 返回 `{ ok, results }`。**保留 config**，@cheeco 目录不自动删。

---

## 7. 功能推荐（一体化插件中心）
- 最上方：dsh 官方程序（名称 + dsh 版本 + 查看介绍，无安装）。
- 每个插件一行：名称 + 版本(当前/最新) + 启用/停用(只读) + 已安装→卸载 / 未安装→我要安装 + 查看介绍 + 行下「检查更新」(实时)。
- 无顶部说明文字。

---

## 8. 一键重启与自动重启
- `handleRestart`：`scheduleRestart()` 起一个 detach 脚本 kill+relaunch 当前 profile。
- 客户端安装向导：重启**如实显示结果** —— 成功 「✓ 已触发自动重启…」；失败「未能成功重启，本次执行，须手动重启后生效。」（**不要**只报固定成功文案）。

---

## 9. 常见坑 / 你没想到但要注意的情况
1. **`ERR_PNPM_UNEXPECTED_STORE`** → §0 对齐 store。
2. **GitHub raw 限流** → `latestFromGitHub` 4s 超时返回 "" → `latestVersionOf` 回退清单 → 再回退静态 `install`。
3. **5 处版本不同号** → 界面显示"最新"与安装来源不一致 → 发版必须同步（§3）。
4. **config 元数据不刷新**（跳写副作用）→ §5。
5. **`/pmgr/list` 未装**：启用/停用显示就退化为"已安装=启用"；不要依赖 pmgr。
6. **`downloads` 缓存同名跳过**：下载文件可能停留在旧版本；发版后如需强制重新下载，先删 `downloads/cheeco-<folder>-<ver>.tgz`.
7. **多 profile**：web/test/mobile 各自独立（独立 node_modules/config/版本），改一个不影响其它。
8. **不要在 DSH 运行中删 node_modules 后不重启**（进程陈旧，必须重启）。
9. **手动改 node_modules/package.json 而不跑 pnpm** → 三张皮不一致（除非有意的独立卸载）。
10. **token 安全**：GitHub token 在 `_fixreleases.ps1`/`.npmrc` 里有，别写进公开 commit；用 API 时别回显。
11. **`cheeco-registry.json` 自愈**：`syncRegistry` 启动时按实际安装状态重建；被清也能自愈，无需手动维护。
12. **安装向导日志**：pnpm 日志标题不带「(英文为 pnpm 自身输出)」，保持干净。
13. **`我要安装`只对可安装项显示**：dsh 官方（`installable:false`）不出现安装按钮。
14. **`resolveDshBin`** 用 `require.resolve('@deepseek-ai/dsh/lib/bin.js')`（无需 PATH）；若 profile 内也装了 @deepseek-ai/dsh 会优先用它（注意版本是否一致）。
15. **npm pack 产物**不含 `config/`（那是运行时生成的默认配置模板）；`files` 只含 `lib`、`cordis.patch.yml`、`README.md`。
16. **功能推荐不显示新插件**：大多因为没 `git push`（显示源是 GitHub main 的 `cheeco-dsh-plugins.json`，见 §2/§3），或 raw CDN 缓存滞后（等几分钟刷新）；验证用 GitHub API `contents?ref=main` 读 base64 而非 raw。

---

## 10. 执行前/后 检查清单
**执行前**
- [ ] 读本 SOP。
- [ ] 确认各 profile store 都是 `F:\.pnpm-store`。
- [ ] 确认改动只落在 `DSH-Func`（唯一真源），无副本。
- [ ] （新增插件）该插件已注册进 `publish.mjs` 的 `META`，且 `id` 与功能推荐清单一致。
- [ ] （新增插件）四步齐：5 处版本+清单 / npm pack / **git push（让 GitHub 外部清单更新）** / **建 release + 上传 tgz 资产**（见 §3）。
**执行后**
- [ ] 版本 5 处同号。
- [ ] `cheeco-dsh-plugins.json` 已更新**并 push**（功能推荐显示源 = GitHub 上的该文件）。
- [ ] npm pack 生成新 tgz；GitHub release + 资产已建（"我要安装"依赖资产 URL 存在）。
- [ ] 目标 profile 已安装新版本；config 未丢失。
- [ ] 用户已重启工作台。
