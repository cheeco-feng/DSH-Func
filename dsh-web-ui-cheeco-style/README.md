# @cheeco/dsh-web-ui-cheeco-style · Cheeco的小功能

一个 DSH 客户端插件：在 **设置 → Cheeco的小功能** 里提供一个设置页。

## 当前内容
- **AI 回复提示音**开关卡片：开/关"回复结束响一声"。

## 需要配合
- 需同时安装 **`@cheeco/dsh-client-ui-message-sound`**（声音插件）：
  - 本插件提供**开关界面**；
  - 声音插件负责**检测与播放**。
- 两者通过 `localStorage["dsh-msg-sound-enabled"]` 联动。

> 只装本插件 = 有开关界面，但没有声音；只装声音插件 = 有声（默认开）但没开关界面。

## 安装
```
dsh plugin --profile <profile> add <本仓库git地址>
```
或粘贴 git 地址到 **设置 → 插件 → 用户插件** 的安装框。

