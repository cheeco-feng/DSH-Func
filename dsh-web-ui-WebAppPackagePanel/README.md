# dsh-web-ui-WebAppPackagePanel（服务商应用包）

一个 DSH 客户端插件：在 **设置 → 侧边栏** 新增一个槽位 **「服务商应用包」**（放在「Cheeco的小功能」下方），内页是 tab 结构。功能与 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）** 大致一致，但使用**独立的配置文件** `DSH-WebApp-config.json`，二者互不影响。

## 功能描述

> 插件名：`dsh-web-ui-WebAppPackagePanel`
> 中文名：**服务商应用包**

**功能总览**：

1. **设置侧边栏独立槽位** —— 在设置页侧边栏新增「服务商应用包」入口，内页是 tab 结构。
2. **内页 tab** —— 当前 3 个 tab：
   - **功能表**：占位卡片「当前页面 正在维护中」。
   - **用户中心**：占位卡片（由原「用户中心」插件迁移而来，内容为维护中占位；后续可在此插入卡片）。
   - **面版管理**：给这个设置页在侧边栏的名字改名（留空用默认「服务商应用包」）。
3. **独立配置文件** —— 使用 `DSH-WebApp-config.json`（`@cheeco/setting/` 下），**不使用** `cheeco-config.json`，与其它包互不影响。

**一句话定位**：与 **功能包（dsh-web-ui-FuncPackagePanel，DSH功能包）** 同构的「设置侧边栏包」，只是配置独立、侧边栏入口名为「服务商应用包」。

### 版本

**当前版本**：`0.1.1`

**版本历史**：

| 版本 | 日期 | 变更 |
| --- | --- | --- |
| 0.1.1 | 2026-09 | 对齐最新架构；「用户中心」tab 迁入并作为占位卡展示。 |
| 0.1.0 | 2026-09 | 初版：侧边栏槽位 + 功能表/面版管理 两个 tab + 独立配置 `DSH-WebApp-config.json`。 |

> 以后每次改版，在此表上方追加一行（版本号 / 日期 / 变更要点），并同步更新「当前版本」。

## 配置（明确独立于 cheeco-config.json）
本插件**不使用** `cheeco-config.json`，而是新建并使用**独立的配置文件**：

- 配置文件：`DSH-WebApp-config.json`
- 位置：`<home>/profiles/<profile>/node_modules/@cheeco/setting/DSH-WebApp-config.json`
  （即 `@cheeco` 目录下新增 `setting/` 子目录）
- 内容形如：`{ "label": "服务商应用包", "dsh": { "profileName": "...", "dshHome": "...", "pluginVersion": "0.1.0", "dshVersion": "..." } }`
- 读写走宿主路由：`GET /dsh-webapp/config`（读） / `POST /dsh-webapp/config`（写，浏览器点「保存」时）。
- 该文件可手工编辑；首次预置空 `label`，缺失时以空配置回退默认「服务商应用包」。

### 配置文件保留约定（与 cheeco-config.json 一致）
`DSH-WebApp-config.json` 位于 `@cheeco/setting/` **独立子目录**，**不属于**插件包目录 `@cheeco/dsh-web-ui-WebAppPackagePanel/`。

- **安装 / 升级 / 卸载 都不会删除它**：`dsh plugin remove` 只移除 `node_modules/@cheeco/dsh-web-ui-WebAppPackagePanel/` 这一个包目录，不触碰 `@cheeco/` 下的 `setting/` 子目录。
- 卸载后配置文件**原样保留**，留待**用户手动删除**（如需彻底清理，手动删 `node_modules/@cheeco/setting/DSH-WebApp-config.json` 即可）。这也保证卸载后再装，之前改的面板名不丢失。

## 安装
```bash
dsh plugin --profile <profile> add ./dsh-web-ui-WebAppPackagePanel
```

## 使用
装好后打开 **设置 → 服务商应用包**：
- 切到「功能表」看到维护中占位卡片；
- 切到「用户中心」看到维护中占位卡片（后续可在此插入卡片）；
- 切到「面版管理」输入新名字点「保存」，改这个设置页在侧边栏的名字（重启后生效）。

> ⚠️ 该文件为「无 BOM 的 UTF-8」，手工编辑 JSON 时请保持无 BOM（DSH 严格 JSON 解析，BOM 会致启动失败）。
