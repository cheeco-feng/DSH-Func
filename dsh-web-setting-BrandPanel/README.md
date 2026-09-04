# dsh-web-setting-BrandPanel

Cheeco「主面板修改」独立插件：界面标题 / Logo 设置页（改左侧顶部名称+logo，留空显官方默认）。

- 寄宿在 **DSH系统包**（`dsh-web-ui-SystemPackagePanel`）内页的「主面板修改」tab（经子 slot `dsh-system-package.brand-panel` 注入）。
- 配置读/写 `/cheeco-style/config`（`brandTitle`/`brandLogoUrl`），本地图片上传到 `/cheeco-style/assets/`。
- 顶部品牌名/logo 显示仍由 `dsh-web-ui-cheeco-style` 的 `sidebar.brand` 槽提供，保存后派发 `cheeco-brand-change` 事件即时刷新。

## 安装

```
dsh plugin --profile <profile> add ./dsh-web-setting-BrandPanel
```
