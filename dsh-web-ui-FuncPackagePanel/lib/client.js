/** @cheeco/dsh-web-ui-FuncPackagePanel client half（浏览器侧）。
 *
 *  在设置对话框侧边栏注册一个**新增槽位**「DSH功能包」，放在「Cheeco的小功能」下方
 *  （order 用 -0.5，介于 cheeco-style 的 -1 与 general 的 0 之间）。
 *  内页是一个 tab 结构，仅 2 个 tab：
 *    - 「功能表」：占位卡片「当前页面 正在维护中」（先做成空的）；
 *    - 「面版管理」：唯一小卡片「面版改名」，可修改该设置页在侧边栏的名字。
 *
 *  配置文件：宿主端 /dsh-func/config 读写的 @cheeco/setting/DSH-Func-config.json
 *  （**不使用** cheeco-config.json）。 */
window.__ModuleLoader__.load({
  id: "@cheeco/dsh-web-ui-FuncPackagePanel",
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
      if (typeof document === "undefined" || document.querySelector('style[data-plugin="dsh-web-ui-func-package"]')) return;
      var css = ".dsh-func{display:flex;flex-direction:column;gap:16px;}"
        + ".dsh-func-card{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:12px;padding:16px 18px;box-shadow:0 1px 2px rgba(0,0,0,.04);}"
        + ".dsh-func-card h3{margin:0 0 10px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#1a1a1a);}"
        + ".dsh-func-state{margin:0 0 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#666);}"
        + ".dsh-func-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:4px;}"
        + ".dsh-func-action{box-sizing:border-box;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);font-family:inherit;font-size:13px;line-height:20px;border-radius:8px;padding:6px 14px;transition:background .15s,border-color .15s,box-shadow .15s;}"
        + ".dsh-func-action:hover{background:var(--dsw-alias-interactive-bg-hover,#f5f5f5);border-color:var(--dsw-alias-state-business-primary,#3498db);}"
        + ".dsh-func-action:active{background:var(--dsw-alias-interactive-bg-active,#ececec);}"
        + ".dsh-func-actions input{box-sizing:border-box;flex:1;min-width:180px;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);border-radius:8px;padding:6px 12px;font-family:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,#1a1a1a);background:var(--dsw-alias-bg-base,#fff);outline:none;}"
        + ".dsh-func-actions input:focus{border-color:var(--dsw-alias-state-business-primary,#3498db);box-shadow:0 0 0 2px rgba(52,152,219,.15);}"
        + ".dsw-switch{appearance:none;-webkit-appearance:none;width:40px;height:22px;border-radius:11px;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:var(--dsw-alias-bg-layer-3,#d3d3d3);position:relative;cursor:pointer;transition:background .15s,border-color .15s;flex:none;margin:0;vertical-align:middle;}"
        + ".dsw-switch::before{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.25);}"
        + ".dsw-switch:checked{background:var(--dsw-alias-state-business-primary,#3498db);border-color:var(--dsw-alias-state-business-primary,#3498db);}"
        + ".dsw-switch:checked::before{left:20px;}";
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-web-ui-func-package";
      tag.textContent = css;
      document.head.appendChild(tag);
    })();

    /** 本插件字典命名空间。 */
    const NS = "dsh-web-ui-func-package";
    const zh = {
      "nav": "DSH功能包"
    };
    const DEFAULT_LABEL = "DSH功能包";

    /** 宿主端点：读/写 DSH-Func-config.json。 */
    const CONFIG_ENDPOINT = "/dsh-func/config";

    /** 文件配置的内存缓存（浏览器端唯一真源），GET 载入、POST 持久化。
     *  与 cheeco-style 一致：仅读/写文件配置，改名靠重启后重新读取生效。
     *  注：config 里可能含其它插件写入的字段（features 等），必须全量保存回传。 */
    let config = { label: "", dsh: {}, features: { sessionSearch: true, dshCommand: true } };
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
              dsh: (typeof data.dsh === "object" && data.dsh) ? data.dsh : {},
              features: (typeof data.features === "object" && data.features) ? data.features : { sessionSearch: true, dshCommand: true }
            };
          }
        } catch (e) {}
      })();
      return configLoad;
    }
    /** 合并 patch 并 POST 全量到宿主，写入 DSH-Func-config.json（与 cheeco-style 相同，纯写配置）。 */
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
        className: "dsh-func-card",
        children: react_jsx_runtime.jsx("p", {
          className: "dsh-func-state",
          children: "当前页面 正在维护中"
        })
      });
    }

    /** 「功能管理」功能开关：会话搜索 / DSH功能命令。
     *  由原 Cheeco的小功能 的「功能管理」内置页迁移而来。开关读写本插件(DSH功能包)自己
     *  DSH-Func-config.json 的 features 字段（控制对应功能插件的显隐），切换后重启生效。 */
    function FeatureManageCard() {
      const [features, setFeatures] = react.useState({ sessionSearch: true, dshCommand: true });
      react.useEffect(() => {
        let cancelled = false;
        (async () => {
          try {
            const res = await fetch("/dsh-func/config", { cache: "no-store" });
            if (res.ok) {
              const d = await res.json();
              if (!cancelled) setFeatures({
                sessionSearch: !(d.features && d.features.sessionSearch === false),
                dshCommand: !(d.features && d.features.dshCommand === false)
              });
            }
          } catch (e) {}
        })();
        return () => { cancelled = true; };
      }, []);
      const toggleFeature = async (key, val) => {
        const next = { ...features, [key]: val };
        setFeatures(next);
        try {
          const res = await fetch("/dsh-func/config", { cache: "no-store" });
          let cfg = {};
          if (res.ok) { try { cfg = await res.json(); } catch (e) {} }
          await fetch("/dsh-func/config", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...cfg, features: next })
          });
        } catch (e) {}
      };
      return react_jsx_runtime.jsx("div", { className: "dsh-func-card", children: [
        react_jsx_runtime.jsx("p", { className: "dsh-func-state", children: "功能开关（切换后重启生效）" }),
        react_jsx_runtime.jsx("label", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }, children: [
          react_jsx_runtime.jsx("span", { children: "会话搜索功能（隐藏/显示）" }),
          react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsw-switch", checked: features.sessionSearch, onChange: (e) => toggleFeature("sessionSearch", e.target.checked) })
        ] }),
        react_jsx_runtime.jsx("label", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }, children: [
          react_jsx_runtime.jsx("span", { children: "DSH功能命令（停用/开启）" }),
          react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsw-switch", checked: features.dshCommand, onChange: (e) => toggleFeature("dshCommand", e.target.checked) })
        ] })
      ] });
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
        className: "dsh-func-card",
        children: [
          react_jsx_runtime.jsx("h3", { children: "面版改名" }),
          react_jsx_runtime.jsx("p", { className: "dsh-func-state", children: "给这个设置页在侧边栏的名字改名。" }),
          react_jsx_runtime.jsx("div", { className: "dsh-func-actions", children: [
            react_jsx_runtime.jsx("input", { type: "text", value: name, placeholder: "输入面板名称", onChange: (e) => setName(e.target.value), style: { flex: "1", minWidth: "160px", padding: "6px 10px" } }),
            react_jsx_runtime.jsx("button", { type: "button", className: "dsh-func-action", onClick: save, children: "保存" })
          ] })
        ]
      });
    }

    /** 内页：tab 结构，「功能表」「功能管理」「模型设置」「面版管理」四个 tab。
     *  「模型设置」页内容由 dsh-llm-model-settings 经子 slot `dsh-func-package.model-settings`
     *  注入（已在 apply() 的 settings.section 注册里声明该子 slot），本页只负责渲染。
     *  「功能管理」由原 Cheeco的小功能 内置页迁移而来（功能开关：会话搜索/DSH功能命令）。 */
    function Section({ renderSlot }) {
      const [tab, setTab] = react.useState("functions");
      const tabs = [
        { id: "functions", label: "功能表" },
        { id: "manage", label: "功能管理" },
        { id: "model-settings", label: "模型设置" },
        { id: "skill", label: "技能" },
        { id: "mcp", label: "MCP管理" },
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
      } else if (tab === "manage") {
        // 「功能管理」：占位卡片（内容待细化，能力后续收回各插件）。
        content = react_jsx_runtime.jsx(FeatureManageCard, {});
      } else if (tab === "model-settings") {
        // 「模型设置」内容来自 model-settings 注入的子 slot；判空用 react.Children.toArray，
        // 否则 slot 已有声明但无 occupant 时 renderSlot 返回的"空容器"会被误判为非空。
        const out = renderSlot ? renderSlot("dsh-func-package.model-settings", {}) : null;
        const renderedChildren = (out === null || out === void 0) ? [] : react.Children.toArray(out);
        const empty = renderedChildren.length === 0;
        content = react_jsx_runtime.jsx("div", { children: [
          empty ? react_jsx_runtime.jsx("p", { style: { padding: "12px 0", color: "var(--dsw-alias-label-tertiary,#999)" }, children: "该插件未处于安装状态" }) : out
        ] });
      } else if (tab === "skill") {
        // 「技能」内容来自 dsh-tool-skill-mcp-panel 注入的子 slot dsh-func-package.skill。
        const out = renderSlot ? renderSlot("dsh-func-package.skill", {}) : null;
        const renderedChildren = (out === null || out === void 0) ? [] : react.Children.toArray(out);
        const empty = renderedChildren.length === 0;
        content = react_jsx_runtime.jsx("div", { children: [
          empty ? react_jsx_runtime.jsx("p", { style: { padding: "12px 0", color: "var(--dsw-alias-label-tertiary,#999)" }, children: "该插件未处于安装状态" }) : out
        ] });
      } else if (tab === "mcp") {
        // 「MCP管理」内容来自 dsh-tool-skill-mcp-panel 注入的子 slot dsh-func-package.mcp。
        const out = renderSlot ? renderSlot("dsh-func-package.mcp", {}) : null;
        const renderedChildren = (out === null || out === void 0) ? [] : react.Children.toArray(out);
        const empty = renderedChildren.length === 0;
        content = react_jsx_runtime.jsx("div", { children: [
          empty ? react_jsx_runtime.jsx("p", { style: { padding: "12px 0", color: "var(--dsw-alias-label-tertiary,#999)" }, children: "该插件未处于安装状态" }) : out
        ] });
      } else {
        content = react_jsx_runtime.jsx(RenameCard, {});
      }
      return react_jsx_runtime.jsx("div", { className: "dsh-func", children: [
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
      ctx.effect(() => ctx.locale.register(NS, { zh, en: zh }), "dsh-web-ui-func-package: dictionaries");
      // 「模型设置」tab 用到的基础子 slot，必须在此声明，settings.section 才会把 renderSlot
      // 传给 Section（否则 renderSlot(...) === undefined，内容渲染不出来）。
      const baseChildren = {
        "dsh-func-package.model-settings": { kind: "single", scope: "root" },
        "dsh-func-package.skill": { kind: "single", scope: "root" },
        "dsh-func-package.mcp": { kind: "single", scope: "root" }
      };
      const registerSection = () => ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "dsh-func-package",
        order: -0.5,              // 放在「Cheeco的小功能」(-1) 之后、通用设置(0) 之前
        label: () => config.label || t("nav"),
        locale: NS,
        children: baseChildren
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
