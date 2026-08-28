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

## 使用

- 装好后，打开 **设置 → Cheeco的小功能 → 声音提示音**。
- **开/关**：点「关闭声音 / 开启声音」。
- **换声音**：点「选择声音文件」选一个音频（存为 data URI，无需服务器）。
- **试听**：点「试听」立即播当前声音。
- **恢复默认**：点「恢复默认」回到默认"叮咚"。
- AI 回复**结束时响一声**（回合收尾才响，过程中不响）。

## 说明
- 两个插件通过 `localStorage["dsh-msg-sound-enabled"]` 联动。
- 只装声音插件 = 有声（默认开）但没设置开关；只装界面 = 有开关但无声；装两个 = 最完整。

## 常见问题 / 经验
- **卡启动 / 92% / `SyntaxError`**：常见原因是**编辑了 profile 的 `package.json` 或 `desktop-plugins.lock.json` 时，文件开头带了 UTF-8 BOM**（字节 EF BB BF）。DSH 用严格 JSON 解析，**BOM 会直接导致 `SyntaxError`、全量启动失败**。
  - 正确做法：用 **不带 BOM 的 UTF-8** 写这些 JSON（例如 PowerShell 用 `[System.Text.UTF8Encoding]::new($false)`），或用文本编辑器保存为"UTF-8 无 BOM"。
  - 这条经验也适用于任何往 DSH profile 里加配置 / 记插件清单的场景。
- **卸载后重装**：从本仓库装回，`dsh plugin add ./子目录` 即可；配置文件保持"无 BOM"就不会崩。


