# @cheeco/dsh-client-ui-message-sound · AI 回复提示音

给 DSH Web 界面加一个「**AI 回复结束时播放提示音**」的客户端插件。

## 功能
- 监听会话**收尾节点**（`turn-tail`），回合结束时播放一声"叮咚"。
- 每回合只响一次；工具运行、段落停顿、加载旧消息**都不响**。
- 默认开启；可配合「Cheeco的小功能」开关卡片（或 `localStorage["dsh-msg-sound-enabled"]`）关闭。
- 声音可换成自己的音频（`lib/client.js` 里 `SOUND_SRC`）。

## 需要配合
- 若要在 **设置 → Cheeco的小功能** 里显示开关卡片，需同时安装 `@cheeco/dsh-web-ui-cheeco-style`。
- 只装本插件 = 有声音（默认开），但没有设置里的开关界面。

## 安装
```
dsh plugin --profile <profile> add <本仓库git地址>
```
或粘贴 git 地址到 **设置 → 插件 → 用户插件** 的安装框。

## 说明
- 声音是浏览器用 Web Audio 合成的（`SOUND_SRC` 留空时），无需音频文件。
- 页面级音频：窗口聚焦时响；窗口最小化/后台可能被节流静音。
