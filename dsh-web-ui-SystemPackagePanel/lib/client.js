/** @cheeco/dsh-web-ui-SystemPackagePanel client half（浏览器侧）。
 *
 *  在设置对话框侧边栏注册一个**新增槽位**「DSH系统包」，放在「Cheeco的小功能」下方
 *  （order 用 -0.5，介于 cheeco-style 的 -1 与 general 的 0 之间）。
 *  内页是一个 tab 结构，仅 2 个 tab：
 *    - 「功能表」：占位卡片「当前页面 正在维护中」（先做成空的）；
 *    - 「面版管理」：唯一小卡片「面版改名」，可修改该设置页在侧边栏的名字。
 *
 *  配置文件：宿主端 /dsh-system/config 读写的 @cheeco/setting/DSH-System-config.json
 *  （**不使用** cheeco-config.json）。 */
window.__ModuleLoader__.load({
  id: "@cheeco/dsh-web-ui-SystemPackagePanel",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");
    let slots = require("@deepseek-ai/dsh-client-ui-slots");
    let locale = require("@deepseek-ai/dsh-client-locale");

    // 注入卡片样式（幂等），使设置卡片跨主题一致。
    (function () {
      if (typeof document === "undefined" || document.querySelector('style[data-plugin="dsh-web-ui-system-package"]')) return;
      var css = ".dsh-sys{display:flex;flex-direction:column;gap:16px;}"
        + ".dsh-sys-card{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:12px;padding:16px 18px;box-shadow:0 1px 2px rgba(0,0,0,.04);}"
        + ".dsh-sys-card h3{margin:0 0 10px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#1a1a1a);}"
        + ".dsh-sys-state{margin:0 0 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#666);}"
        + ".dsh-sys-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:4px;}"
        + ".dsh-sys-action{box-sizing:border-box;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);font-family:inherit;font-size:13px;line-height:20px;border-radius:8px;padding:6px 14px;transition:background .15s,border-color .15s,box-shadow .15s;}"
        + ".dsh-sys-action:hover{background:var(--dsw-alias-interactive-bg-hover,#f5f5f5);border-color:var(--dsw-alias-state-business-primary,#3498db);}"
        + ".dsh-sys-action:active{background:var(--dsw-alias-interactive-bg-active,#ececec);}"
        + ".dsh-sys-actions input{box-sizing:border-box;flex:1;min-width:180px;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);border-radius:8px;padding:6px 12px;font-family:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,#1a1a1a);background:var(--dsw-alias-bg-base,#fff);outline:none;}"
        + ".dsh-sys-actions input:focus{border-color:var(--dsw-alias-state-business-primary,#3498db);box-shadow:0 0 0 2px rgba(52,152,219,.15);}";
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-web-ui-system-package";
      tag.textContent = css;
      document.head.appendChild(tag);
    })();

    /** 本插件字典命名空间。 */
    const NS = "dsh-web-ui-system-package";
    const zh = {
      "nav": "DSH系统包"
    };
    const DEFAULT_LABEL = "DSH系统包";

    /** 宿主端点：读/写 DSH-System-config.json。 */
    const CONFIG_ENDPOINT = "/dsh-system/config";

    /** 文件配置的内存缓存（浏览器端唯一真源），GET 载入、POST 持久化。
     *  与 cheeco-style 一致：仅读/写文件配置，改名靠重启后重新读取生效。 */
    let config = { label: "", dsh: {} };
    let configLoad = null;
    function loadConfig() {
      if (configLoad) return configLoad;
      configLoad = (async () => {
        try {
          const res = await fetch(CONFIG_ENDPOINT, { cache: "no-store" });
          if (res.ok) {
            const data = (await res.json()) || {};
            config = {
              label: typeof data.label === "string" ? data.label : "",
              dsh: (typeof data.dsh === "object" && data.dsh) ? data.dsh : {}
            };
          }
        } catch (e) {}
      })();
      return configLoad;
    }
    /** 合并 patch 并 POST 全量到宿主，写入 DSH-System-config.json（与 cheeco-style 相同，纯写配置）。 */
    async function saveConfig(patch = {}) {
      config = { ...config, ...patch };
      try {
        await fetch(CONFIG_ENDPOINT, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(config)
        });
      } catch (e) {}
    }

    /** 「当前页面 正在维护中」占位卡片（功能表 tab）。 */
    function MaintenanceCard() {
      return react_jsx_runtime.jsx("div", {
        className: "dsh-sys-card",
        children: react_jsx_runtime.jsx("p", {
          className: "dsh-sys-state",
          children: "当前页面 正在维护中"
        })
      });
    }

    /** 「面版改名」卡片：修改该设置页在侧边栏的名字。 */
    function RenameCard() {
      const [name, setName] = react.useState(() => config.label || "");
      react.useEffect(() => {
        let cancelled = false;
        (async () => {
          await loadConfig();
          if (cancelled) return;
          setName(config.label || "");
        })();
        return () => { cancelled = true; };
      }, []);
      const save = async () => {
        const next = name.trim();
        await saveConfig({ label: next });
        alert("已保存「" + (next || DEFAULT_LABEL) + "」；重启后生效");
      };
      return react_jsx_runtime.jsx("div", {
        className: "dsh-sys-card",
        children: [
          react_jsx_runtime.jsx("h3", { children: "面版改名" }),
          react_jsx_runtime.jsx("p", { className: "dsh-sys-state", children: "给这个设置页在侧边栏的名字改名。" }),
          react_jsx_runtime.jsx("div", { className: "dsh-sys-actions", children: [
            react_jsx_runtime.jsx("input", { type: "text", value: name, placeholder: "输入面板名称", onChange: (e) => setName(e.target.value), style: { flex: "1", minWidth: "160px", padding: "6px 10px" } }),
            react_jsx_runtime.jsx("button", { type: "button", className: "dsh-sys-action", onClick: save, children: "保存" })
          ] })
        ]
      });
    }

    /** 内页：tab 结构，仅有「功能表」「面版管理」两个 tab。 */
    function Section() {
      const [tab, setTab] = react.useState("functions");
      const tabs = [
        { id: "functions", label: "功能表" },
        { id: "panel", label: "面版管理" }
      ];
      const tabBtn = (key, label) => react_jsx_runtime.jsx("button", {
        type: "button",
        onClick: (e) => {
          setTab(key);
          const el = e && e.currentTarget;
          if (el) requestAnimationFrame(() => {
            try { el.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" }); } catch (err) { /* ignore */ }
          });
        },
        style: {
          padding: "6px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "inherit",
          font: "inherit",
          fontWeight: tab === key ? 600 : 400,
          borderBottom: tab === key ? "2px solid #4a90d9" : "2px solid transparent",
          opacity: tab === key ? 1 : 0.6,
          flex: "0 0 auto"
        },
        children: label
      });
      let content = null;
      if (tab === "functions") {
        content = react_jsx_runtime.jsx(MaintenanceCard, {});
      } else {
        content = react_jsx_runtime.jsx(RenameCard, {});
      }
      return react_jsx_runtime.jsx("div", { className: "dsh-sys", children: [
        react_jsx_runtime.jsx("div", { style: { display: "flex", gap: "8px", borderBottom: "1px solid rgba(128,128,128,0.3)", marginBottom: "14px", overflowX: "auto", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }, children: tabs.map((t) => tabBtn(t.id, t.label)) }),
        content
      ] });
    }

    /** 所需服务（cordis fiber inject）：slot 系统与 locale。 */
    const inject = ["slots", "locale"];

    /** 将本插件注册为设置侧边栏的一个 settings.section 槽位。
     *  与 cheeco-style 一致：label 用 `() => config.label || t("nav")`（thunk）。
     *  关键：必须在 `loadConfig()` 完成后再注册，否则侧边栏在 config.label 尚未从文件读出时
     *  就对其求值（读到空 -> 显示默认名），且此后 settings.section 版本不再变化、侧边栏 label
     *  定格在空值，导致"改名后重启也不生效"。cheeco-style 靠异步取 panel-config 附带达成此时序，
     *  这里显式 `await loadConfig()` 保证同样效果。 */
    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, { zh, en: zh }), "dsh-web-ui-system-package: dictionaries");
      const registerSection = () => ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "dsh-system-package",
        order: -0.5,              // 放在「Cheeco的小功能」(-1) 之后、通用设置(0) 之前
        label: () => config.label || t("nav"),
        locale: NS
      }, Section));
      // 等配置加载完成再注册，保证侧边栏 label 读到文件里的值。
      loadConfig().then(() => registerSection());
    }

    exports.apply = apply;
    exports.inject = inject;
    // 提前载入文件配置，使侧边栏 label 一上来就按文件显示。
    loadConfig();
    return module.exports;
  }
});
