# cheeco-dsh-plugins

Cheeco 的 DSH 插件集合。本仓库包含**两个独立插件**（各自是独立的 DSH 插件包）：装配时按需选择。

## 包含

| 子目录 | 包名 | 作用 |
|---|---|---|
| `dsh-client-ui-message-sound` | `@cheeco/dsh-client-ui-message-sound` | **AI 回复提示音**（回合结束时响一声） |
| `dsh-web-ui-cheeco-style` | `@cheeco/dsh-web-ui-cheeco-style` | **Cheeco的小功能** 设置页（含声音开关卡片） |

## 安装（先克隆，再按需添加子目录）

```bash
git clone <本仓库地址>
cd <仓库目录>

# 只装提示音（声音+默认开启，但无设置开关）
dsh plugin --profile <profile> add ./dsh-client-ui-message-sound

# 只装界面（有设置开关，但需配合声音插件才有声）
dsh plugin --profile <profile> add ./dsh-web-ui-cheeco-style

# 两个都要（推荐，声音 + 设置开关齐全）
dsh plugin --profile <profile> add ./dsh-client-ui-message-sound
dsh plugin --profile <profile> add ./dsh-web-ui-cheeco-style
```

> `dsh plugin` 也可换成在 **设置 → 插件 → 用户插件** 的安装框里粘贴对应的本地/仓库路径。

## 说明
- 两个插件通过 `localStorage["dsh-msg-sound-enabled"]` 联动。
- 只装声音插件 = 有声（默认开）但没设置开关；只装界面 = 有开关但无声；装两个 = 最完整。
- 其它功能（AbortSignal polyfill / CSS 覆盖 / 隐藏关机按钮等）由独立的 `CheecoStyleTool` 工具完成，不在本仓库。
