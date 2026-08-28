# dsh-client-ui-message-sound

给 DSH Web 界面加一个"AI 回复完成时播放提示音"的客户端插件。

## 原理

- 这是一个 `dsh.client` 双面客户端插件（`package.json` 里 `dsh.client` 声明）。
- `lib/client.js`（浏览器侧 bundle）在 `apply(ctx)` 里用 `MutationObserver` 监听会话滚动区。
- **只在回合收尾节点 `[data-chat-flow-kind="turn-tail"]` 出现的那一刻响一次**——即"我发完所有内容"的时刻。
- 某一段回复停顿、工具运行、用户消息、加载旧消息、重复渲染都**不会**触发（靠启动宽限期 4 秒 + 节点去重 + 4 秒冷却）。

## 如何更换提示音（声音文件）

打开 `lib/client.js`，顶部有一段配置：

```js
var SOUND_SRC = "";          // 留空 = 使用内置 Web Audio 双音提示
var VOLUME = 0.6;            // 音量 0..1
var STARTUP_GRACE_MS = 4000; // 启动宽限：加载后多少毫秒才开始监听（避免旧消息响）
var PLAY_COOLDOWN_MS = 4000; // 两次响声之间最短间隔（毫秒）
var TAIL_DELAY_MS = 400;     // 收尾节点出现后延迟多少毫秒再响
```

- **用内置提示音**：`SOUND_SRC` 留空。默认是一声清脆的"叮咚"（Web Audio 合成，无需文件）。
- **换成你自己的声音文件**：把 `SOUND_SRC` 设为一个 `data:` URI 或一个该应用能访问的 URL，例如：

  ```js
  var SOUND_SRC = "data:audio/mp3;base64,//uQx...";
  ```

  生成 data URI 的方法（浏览器控制台）：

  ```js
  const f = await fetch("你的文件.mp3").then(r => r.blob());
  const b64 = await new Promise(r => { const x = new FileReader(); x.onload = () => r(x.result); x.readAsDataURL(f); });
  console.log(b64); // 拷贝这个 data:... 字符串填到 SOUND_SRC
  ```

改完后**重启 DSH**（开发模式则重载页面）生效。

> 注意：DSH 的客户端模块服务器只提供 `/plugins/<id>/client.js`，不会单独托管包里的静态资源，
> 所以请用 `data:` URI 或一个 DSH 自己能返回的 URL。

## 安装 / 启用

1. 该包位于 `F:\DeepSeekHarnessData\patches\dsh-client-ui-message-sound\`。
2. 已在 `profiles\desktop\package.json` 中：
   - `dependencies` 加了 `"@deepseek-ai/dsh-client-ui-message-sound": "link:F:/DeepSeekHarnessData/patches/dsh-client-ui-message-sound"`；
   - `dsh.profile.bundles` 加了 `"@deepseek-ai/dsh-client-ui-message-sound"`。
3. 在 `profiles\node_modules\@deepseek-ai\` 下创建了指向该包的 junction / link。
4. **重启 DSH** 后生效（插件集改动需要重启才会重新扫描）。

## 卸载 / 回滚

- 从 `profiles\desktop\package.json` 移除上面的 dependency 与 bundles 条目。
- 删除 `profiles\node_modules\@deepseek-ai\dsh-client-ui-message-sound` 链接。
- 若改坏了启动，可以用备份文件还原：
  `profiles\desktop\package.json.bak-dsh-msg-sound`（本次操作前的备份）。
- 桌面端有自动修复与配置备份，通常也能自动兜底。
