# dsh-web-ui-SystemPackagePanel

一个 DSH 客户端插件：在 **设置 → 侧边栏** 新增一个槽位 **「DSH系统包」**（放在「Cheeco的小功能」下方），内页是 tab 结构。功能与 dsh-web-ui-FuncPackagePanel（DSH功能包）完全一致，但使用**独立的配置文件** `DSH-System-config.json`，二者互不影响。

## 当前内容
- 内页仅 2 个 tab：
  - **功能表**：占位卡片 **「当前页面 正在维护中」**（先做成空的）；
  - **面版管理**：唯一小卡片 **「面版改名」**——给这个设置页在侧边栏的名字改名（留空用默认「DSH系统包」）。

## 配置（明确独立于 cheeco-config.json）
本插件**不使用** `cheeco-config.json`，而是新建并使用**独立的配置文件**：

- 配置文件：`DSH-System-config.json`
- 位置：`<home>/profiles/<profile>/node_modules/@cheeco/setting/DSH-System-config.json`
  （即 `@cheeco` 目录下新增 `setting/` 子目录）
- 内容形如：`{ "label": "DSH系统包", "dsh": { "profileName": "...", "dshHome": "...", "pluginVersion": "0.1.0", "dshVersion": "..." } }`
- 读写走宿主路由：`GET /dsh-system/config`（读） / `POST /dsh-system/config`（写，浏览器点「保存」时）。
- 该文件可手工编辑；首次预置空 `label`，缺失时以空配置回退默认「DSH系统包」。

### 配置文件保留约定（与 cheeco-config.json 一致）
`DSH-System-config.json` 位于 `@cheeco/setting/` **独立子目录**，**不属于**插件包目录 `@cheeco/dsh-web-ui-SystemPackagePanel/`。

- **安装 / 升级 / 卸载 都不会删除它**：`dsh plugin remove` 只移除 `node_modules/@cheeco/dsh-web-ui-SystemPackagePanel/` 这一个包目录，不触碰 `@cheeco/` 下的 `setting/` 子目录。
- 卸载后配置文件**原样保留**，留待**用户手动删除**（如需彻底清理，手动删 `node_modules/@cheeco/setting/DSH-System-config.json` 即可）。这也保证卸载后再装，之前改的面板名不丢失。

## 安装
```bash
dsh plugin --profile <profile> add ./dsh-web-ui-SystemPackagePanel
```

## 使用
装好后打开 **设置 → DSH系统包**：
- 切到「功能表」看到维护中占位卡片；
- 切到「面版管理」输入新名字点「保存」，改这个设置页在侧边栏的名字（重启后生效）。

> ⚠️ 该文件为「无 BOM 的 UTF-8」，手工编辑 JSON 时请保持无 BOM（DSH 严格 JSON 解析，BOM 会致启动失败）。
