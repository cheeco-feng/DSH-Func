# @cheeco/dsh-client-ui-session-deeplink（深链接）

Cheeco 的 DSH Web 客户端插件：**通过 URL 直接打开指定会话**，并让地址栏与当前会话保持同步。

- 打开 `http://127.0.0.1:<port>/?session=<会话id>`，会话列表就绪后自动跳到该会话。
- 切换会话时自动把 `?session=` 改成当前会话 id（`history.replaceState`，保留其它 query 与 hash，不堆历史）。
- 纯浏览器端运行，不加任何 host 服务；目标会话不存在时只告警、不打开。

## 安装（装进 web / test 等 profile）

```bash
dsh plugin --profile <profile> add ./dsh-client-ui-session-deeplink
```

装完需重启对应工作台（托盘 StartControllers 关闭再开启，或重新拉起该 profile）才生效。

## 说明

- 基于社区插件 [R3alloc/dsh-session-deeplink](https://github.com/R3alloc/dsh-session-deeplink) 移植为 Cheeco 独立插件（`@cheeco/dsh-client-ui-session-deeplink`），仅改包名/注释，功能与原版一致。
- 后续计划扩展：支持 `?workspace` / `?cwd` / `?prompt` / `?model` 等多参数预置。
