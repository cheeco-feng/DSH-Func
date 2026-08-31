# 仓库协作约定（Conventions）

> **任何 agent 在本仓库 / 本机维护 cheeco 插件前，必须先读并遵循 `CHEECO-WORKFLOW-SOP.md`。**

## 硬性约束
1. **唯一真源**：本仓库（`DSH-Func`）是 cheeco 插件的唯一源码源。禁止在别处（如 `DSH-Src`、`dsh-switch-search-src`、engine `node_modules`、profile `link:`、`downloads` 旧 tgz、`_tmp_*`）留副本。
2. **版本清单唯一真源**：`cheeco-dsh-plugins.json`（仓库根）记录各插件最新版本。发版只改它（+ `package.json` / `PLUGIN_VERSION` / 静态回退 URL），下载地址自动绑定最新版。
3. **版本 5 处同号**：`package.json`、`lib/index.js`、`lib/client.js` 的 `PLUGIN_VERSION`、`cheeco-dsh-plugins.json`、静态 `install` 回退 URL —— 发版必须同步，缺一即不一致。
4. **无 `src/`**：插件只有打包后的 `lib/` 产物，AI 直接改 `lib/` 正式代码，不引入 TypeScript 源码。
5. **config 保留**：`cheeco-config.json`（@cheeco 根）在安装/升级/卸载时**不覆盖**；`@cheeco` 目录不自动删除（用户手动删）。
6. **pnpm store**：各 profile 的 `node_modules` 必须链接 `F:\.pnpm-store`；不一致会导致 `ERR_PNPM_UNEXPECTED_STORE`（见 SOP §0）。
7. **改 `node_modules`/`package.json` 不跑 pnpm** 会造成三张皮不一致，除非是有意的独立卸载。

## 提交信息
- 中文，`feat/fix/refactor/chore(dsh-<plugin>): <说明>`。

## 发布
- 见 `CHEECO-WORKFLOW-SOP.md` §3（bump → npm pack → push → GitHub release + 资产）。
