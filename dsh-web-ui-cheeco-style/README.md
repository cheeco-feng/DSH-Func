# dsh-web-ui-cheeco-style · Cheeco的小功能

一个 DSH 客户端插件：在 **设置 → Cheeco的小功能** 里提供一个设置页。

## 当前内容
- **AI 回复提示音**卡片：
  - 开/关"回复结束响一声"；
  - **选择声音文件**（选一个音频当提示音）+ 恢复默认。
- **界面标题 / Logo**卡片（修改**左侧顶部**的名称与 logo）：
  - 填 **页面标题** → 替代官方名称（logo 保持不变）；
  - 填 **Logo 图片网址**（`https://…`）→ 直接用远程图片作为顶部 logo（推荐，干净）；
  - 或点 **选择本地图片** → 图片会**上传到插件的 `assets/` 资源目录**，配置里只记它的 URL（如 `/cheeco-style/assets/<文件>`），**不再把 base64 长串写进配置或地址框**；
  - 保存后**即时生效**；「恢复默认」回到官方品牌。<br>
  > 原理：本插件以更低 priority 占用官方品牌的 `sidebar.brand.name` / `sidebar.brand.mark` 单插槽（最低 priority 渲染），未设置时回退到官方品牌。

## 配置 + 资源存储（都改为文件，不再是 localStorage）
标题 / Logo / 面板名 / 声音设置**都不再写进浏览器 `localStorage`**，改存插件目录下的专有配置文件：

- 配置文件：`dsh-web-ui-cheeco-style/config/cheeco-config.json`
  - 内容形如：`{ "brandTitle": "DSH标准版", "brandLogoUrl": "https://yc1971.com/ico.png", "label": "小功能", "soundEnabled": true, "soundSrc": "", "soundName": "" }`
  - 每次点「保存」浏览器 **POST** 到宿主路由 `/cheeco-style/config`，宿主写入该文件；打开页面时浏览器 **GET** 同一路由读回。
  - 该文件可手工编辑；首次预置空白文件 `{}`，缺失时以空配置回退官方品牌/默认提示音。
- 资源目录：`dsh-web-ui-cheeco-style/assets/`（存放选中的**本地 Logo 图片**与**自定义提示音文件**）
  - 上传：`POST /cheeco-style/assets?name=<文件名>`（请求体为文件字节）
  - 读取：`GET /cheeco-style/assets/<文件名>`（供 `<img>` / `new Audio(url)` 使用）

### 声音联动说明
- 本插件提供**开关界面 + 上传音频文件**；
- 声音插件 `@cheeco/dsh-client-ui-message-sound` 负责**检测与播放**，现改为从 `/cheeco-style/config` 读取 `soundEnabled` / `soundSrc`（监听 `cheeco-config-change` 事件刷新），不再读 localStorage。

> 只装本插件 = 有开关界面，但没声音；只装声音插件 = 有声（默认开）但没开关界面。
