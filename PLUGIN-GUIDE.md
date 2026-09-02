# DSH 插件开发指南（基于实战经验）

> 本文是手把手写一个 DSH **客户端插件**的完整说明，涵盖结构、注册、设置页、状态读写、
> **踩过的坑（BOM / pnpm / 兼容性）**、安装与发布。基于 `dsh-client-ui-message-sound`
> 和 `dsh-web-ui-cheeco-style` 的实战整理，帮你下次设计插件少走弯路。

---

## 一、一个"客户端插件"的最小结构

一个 DSH 客户端插件是一个 **双面（host + browser）的 cordis 包**：

```
my-plugin/
  package.json          # 声明 dsh.client / dsh.bundle.patch / dsh.compatibility
  cordis.patch.yml      # 把插件注册进 cordis 加载树（- insert: { id, name }）
  lib/
    index.js            # 宿主侧入口（可空 apply，或 default class）
    client.js           # 浏览器侧 bundle（window.__ModuleLoader__.load）
```

> 插件是 npm 风格包，但**不需要**真发到 npm；装到 profile 的 `node_modules`（link: 或 junction）即可。

## 二、`package.json` 关键字段

```jsonc
{
  "name": "@你的作用域/dsh-your-plugin",   // 用你自己的 scope，别用 @deepseek-ai
  "version": "0.1.0",
  "type": "module",                        // 必须是 module
  "main": "lib/index.js",                  // 宿主入口
  "exports": {
    ".":      { "default": "./lib/index.js" },
    "./client": { "default": "./lib/client.js" },   // 浏览器侧
    "./package.json": "./package.json"
  },
  "dsh": {
    "bundle":   { "patch": "./cordis.patch.yml" },
    "compatibility": {                      // 必填！否则兼容性检查报 invalid-manifest
      "desktop": { "range": ">=2.7.0 <4.0.0", "api": "^1.2.0" },
      "runtime": { "range": ">=0.1.1-rc.1 <0.2.0", "evidence": { /* ... */ } },
      "surfaces": ["main"]
    },
    "client": {
      "inject": ["@deepseek-ai/dsh-client-ui-settings"],  // 前置插件（提供 settingsScope 等）
      "platform": "web"
    }
  },
  "files": ["lib", "cordis.patch.yml", "README.md"]
}
```

- **`dsh.compatibility` 一定要有**：没有它，插件管理器的兼容性检查会让插件显示 `incompatible / invalid-manifest`。
- **`dsh.client.inject`**：列出你要用的前置客户端插件（如需要 `ctx.settingsScope` 就注入
  `@deepseek-ai/dsh-client-ui-settings`）。

## 三、宿主侧 `lib/index.js`

宿主侧要有东西让 cordis 加载。两种都行；**default class 更"官方"，最稳**：

```js
// 方式 A：命名导出 apply（本项目用这个）
export function apply() {}
```

```js
// 方式 B：default class（官方宿主插件同款）
export default class MyPlugin {
  static name = "my-plugin";
  static inject = [];
  constructor(ctx, config) {}
}
```

## 四、浏览器侧 `lib/client.js`（核心）

格式是 **`window.__ModuleLoader__.load({ id, factory })`**。`factory` 里用 `require(...)` 拿依赖、
`react_jsx_runtime.jsx(...)` 渲染（**不要写 JSX 语法**，要写 jsx 调用）。

```js
window.__ModuleLoader__.load({
  id: "@你的作用域/dsh-your-plugin",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");
    // ... 你的逻辑 / 组件
    function apply(ctx) {
      // 在这里注册设置页、订阅等
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section", id: "my-plugin", order: -1,
        label: () => "我的面板", locale: "my-plugin"
      }, MyComponent));
    }
    exports.apply = apply;
    exports.inject = ["slots", "locale"];   // 用到的服务
    return module.exports;
  }
});
```

> 注入 **CSS**：在 factory 顶层用 `<style data-plugin="...">` 插入（幂等：先判断已存在）。

## 五、`cordis.patch.yml`（注册成加载条目）

```yaml
# 只 ADD 一行，不动其它行
- insert:
    - id: my-plugin
      name: '@你的作用域/dsh-your-plugin'
```
`id` 全树唯一；`name` 指向包名（宿主入口）。

## 六、装到 profile（安装）

**标准方式（别人用）**：
```
dsh plugin --profile <profile> add ./my-plugin        # 或 git 地址
```

**手动方式（本地开发，等同上面的效果）**：
1. profile 的 `package.json` `dependencies` 加 `"@你的作用域/dsh-your-plugin": "link:F:/路径/my-plugin"`。
2. 加进 `dsh.profile.bundles`。
3. 在 `profiles/node_modules/@你的作用域/` 建 junction 指向插件目录。

## 七、设置页排序（`order`）

位置由 `ctx.slots.register({ ..., order })` 的 `order` 决定，**数值越小越靠前**：
- 通用设置 = 0、模型 = 1、插件 = 1。
- 想让你的排最前 → 设 `order: -1`；想靠后 → 设更大值。

## 七之二、新增一个插件页（重要：已动态化，无需改 cheeco-style）

要在「功能设置 / Cheeco的小功能」里新增一个插件 tab 页，**只用声明，不用碰 `dsh-web-ui-cheeco-style`**：

1. 在插件 `package.json` 里声明：
   ```jsonc
   "dsh": {
     "cheecoPanel": {
       "addPage": {
         "id": "你的页面id",
         "label": "页面标题",
         "page": "@你的作用域/dsh-你的插件",
         "blocks": []      // 可选：静态文字卡片；复杂交互页留空，改用下面的 page slot
       }
     }
   }
   ```
2. 客户端 `lib/client.js` 里，往 `cheeco-style.page.<页面id>` 这个 **slot** 注入组件（复杂交互页用这个；纯静态文字页用 `blocks` 即可）：
   ```js
   ctx.slots.inject("cheeco-style.page.<页面id>", () => ctx.slots.register({
     name: "cheeco-style.page.<页面id>", id: "<页面id>", label: "<页面标题>"
   }, YourTabComponent));
   ```

**核心约定（cheeco-style ≥ 0.8.18）**：
- cheeco-style **从 `/cheeco-style/panel-config` 动态读取所有插件页**，自动为每个 `cheeco-style.page.<id>` 声明好子 slot 并渲染。
- 所以**新增/卸载任何插件页**，cheeco-style **自动识别**，**不需要为每个插件升级 cheeco-style**，也不需要在 cheeco-style 里硬编码页面。
- 若新页不显示，先确认 `panel-config.json` 里已出现对应 page（说明 `addPage` 声明生效、profile 已重启）；客户端 slot 名必须是 `cheeco-style.page.<页面id>`，与 `page.id` 完全一致。

## 八、读写用户状态
> 这里如实说明：**只有 `localStorage` 是实测跑通的**；DSH 设置系统那套我**试过但没成功**，下方如实标注。

- **`localStorage`（推荐，实测可靠）**：存 on/off、自定义声音等简单开关。**缺点**：绑定源（host:port），且不在 `settings.yaml`。
  - 例：`localStorage.getItem("dsh-msg-sound-enabled")` / `.setItem(...)`。本项目的开关+声音都是这么存的。
- **DSH 设置系统（`settings.yaml`）——⚠️ 实验性，未完全跑通**：
  - 思路：宿主侧 `settings.register(namespace, schema)` 注册命名空间；客户端用 `ctx.settingsScope.bind({ namespace })` 读/写。
  - **踩过的坑（务必注意）**：
    1. **宿主导入依赖失败**：宿主 `lib/index.js` 里 `import ... from "@deepseek-ai/schemastery"` / `"dsh-settings"`
       在 **patches 目录的插件包**里会 **`ERR_MODULE_NOT_FOUND`**（这些包没装在插件目录下）。要能解析，得把这些依赖
       安装/链接进插件包目录，或确保插件放在能解析到它们的 node_modules 下。
    2. **客户端 API 要说准**：`settingsScope.bind(...)` 返回 scope 的读法是 **`getSnapshot().value.<字段>`**，
       写是 **`set("字段", 值)`**，订阅是 **`subscribe(cb)`**（**不是** `.get()` / `.update()`，我之前写错过）。
  - **建议**：简单开关就用 `localStorage`（省事、已验证）；真要写 `settings.yaml`，先确保插件能解析到
    `@deepseek-ai/schemastery` 等依赖，再按上面 API 实现并**实测**。


## 九、⚠️ 最重要的坑：**BOM**
DSH 用**严格 JSON 解析**。**只要 `package.json` 或 `desktop-plugins.lock.json` 开头带 UTF-8 BOM**，
`JSON.parse` 直接报 `SyntaxError` → **全量 profile 启动失败/卡 92%**。

- 写这些 JSON 时**务必用"无 BOM"的 UTF-8**：
  - PowerShell：`[System.Text.UTF8Encoding]::new($false)`
  - 编辑器：另存为"UTF-8 无 BOM"。
- 这是本次调试最久、最隐蔽的坑，**给别人/给下次插件务必记住**。

## 十、其它坑
- **不要用 pnpm 的 `plugin-manager` 卸载**：它会跑 pnpm，可能把其它包（如 `@linxin666/dsh-web-ui-patches`）
  的 link 弄成断链，导致启动时兼容性检查 `SyntaxError`。
- **CRLF 不是问题**：之前以为是，实际是 BOM。
- **断链**：清理 `node_modules` 里的悬空 symlink（指向不存在目录），用 `Remove-Item -LiteralPath -Force`。
- **跨盘 junction**：装插件尽量与 DSH 同盘（F:→F:），跨盘（F:→E:）个别情况会出问题。

## 十一、调试技巧
- 看运行时日志：`C:\Users\<你>\AppData\Roaming\@deepseek-ai\dsh-desktop\logs\runtime.log`。
- 组合错误：`dsh --profile <profile> --dump-config`（会输出组合结果或报错）。
- `[plugins] compatibility inspection skipped: SyntaxError` → 说明某个文件有 BOM/坏编码。

## 十二、发布 / 给别人装
- 每个插件**独立仓库**最省事（`dsh plugin add <git-url>` 直接装一个包）；
  或用 **monorepo**（一个仓库多子目录），别人克隆后 `dsh plugin add ./子目录`（不能直接 add 仓库根）。
- README 写清：安装步骤 + 使用 + 常见坑（尤其是 BOM）。

---

希望这份指南帮你下次写插件更顺。遇到新坑随时补充。
