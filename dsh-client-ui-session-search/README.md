# dsh-client-ui-session-search

Cheeco 的 DSH 会话搜索小功能：给侧边栏加一个**会话内容检索**入口，标题搜索 ↔ 内容搜索一键切换，内容按会话聚合展示标题与命中片段，可筛选 **用户 / 回复 / 工具**。

## 安装（先克隆本仓库，再按子目录安装）

```bash
git clone <本仓库地址>
cd <仓库目录>

# 只装本插件
dsh plugin --profile <profile> add ./dsh-client-ui-session-search
```

> `dsh plugin` 也可换成在 **设置 → 插件 → 用户插件** 的安装框里粘贴对应的本地/仓库路径。

## 使用

- 装好后，侧边栏底部出现 **「搜索」** 按钮。
- 点击打开搜索面板：顶部 **标题 / 内容** 切换。
  - **标题**：按会话标题 / 工作区路径即时过滤。
  - **内容**：走 DSH 自带 SQLite FTS5 全文索引，搜会话消息正文；结果按会话聚合，显示标题 + 最强命中片段 + 类型标签，点击即打开该会话。
  - 内容模式顶部筛选 chip：**全部 / 用户 / 回复 / 工具**（工具可搜到工具调用参数与返回值）。
- **设置 → 通用 → 会话搜索**：启用开关 + 默认搜索模式，配置即写即生效。

## ⚠️ 前置：开启全文索引

内容搜索复用 DSH 自带的 `session-query-sqlite`（SQLite FTS5）派生索引。**DSH 官方 bundle 默认关闭它**（`session-query-sqlite` 的 `openAt: never`）。要内容搜索生效，需在你的 profile 的 `cordis.patch.yml` 或 overlay 里覆盖：

```yaml
- id: session-query-sqlite
  config:
    path: ':memory:'               # 或可持久化的绝对路径（重启不重建）
    openAt: first-search           # 或 startup
```

然后重启 DSH web。不开启时插件内容模式会显示配置指引，标题模式不受影响。

## 兼容性与隐私

- 需要已安装 DeepSeek Harness 并使用 web profile；数据全部经 DSH 现成的 `sessionQuery` 服务，不读、不上传会话内容以外的数据。
- 配置仅存于 DSH settings 命名空间与浏览器浮层状态。

## 许可证

MIT
