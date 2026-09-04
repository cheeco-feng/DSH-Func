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
        + ".dsh-sys-actions input:focus{border-color:var(--dsw-alias-state-business-primary,#3498db);box-shadow:0 0 0 2px rgba(52,152,219,.15);}"
        + ".dsh-sys-brand-title{font-weight:600;letter-spacing:.04em;white-space:nowrap;}"
        + ".dsh-sys-brand-logo{display:block;}"
        + ".dsh-sys-brand-fallback{display:inline-block;border-radius:50%;background:var(--dsw-alias-bg-module-platform,#eee);}";
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
    /** 与 package.json 同步，供底部 footer 显示。 */
    const PLUGIN_VERSION = "0.1.6";

    /** 宿主端点：读/写 DSH-System-config.json。 */
    const CONFIG_ENDPOINT = "/dsh-system/config";

    /** 文件配置的内存缓存（浏览器端唯一真源），GET 载入、POST 持久化。
     *  与 cheeco-style 一致：仅读/写文件配置，改名靠重启后重新读取生效。
     *  注：config 里可能含其它插件写入的字段（sound/brand 等），必须全量保存回传，
     *  否则本插件改名/保存时会把那些字段清空。 */
    let config = { label: "", dsh: {}, sound: {}, brand: {} };
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
              sound: (typeof data.sound === "object" && data.sound) ? data.sound : {},
              brand: (typeof data.brand === "object" && data.brand) ? data.brand : {}
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

    /** 底部 footer：显示「系统包 | 插件版本 x.y.z | 当前 Profile」。 */
    function SectionFooter() {
      const getProfile = () => (typeof window !== "undefined" && window.__dshCheecoProfile) || "";
      const [profile, setProfile] = react.useState(getProfile);
      react.useEffect(() => {
        if (typeof window === "undefined") return;
        const upd = () => setProfile(getProfile());
        window.addEventListener("dsh-cheeco-profile", upd);
        return () => window.removeEventListener("dsh-cheeco-profile", upd);
      }, []);
      return react_jsx_runtime.jsx("p", { className: "dsh-sys-state", children: "系统包 | 插件版本 " + PLUGIN_VERSION + (profile ? " | 当前 Profile：" + profile : "") });
    }

    /** 顶部品牌显示（sidebar.brand 槽）：读取 /dsh-system/config 的 brand.title/logoUrl，监听
     *  cheeco-brand-change 即时刷新。未设置时回退到默认官品牌。原由 cheeco-style 提供，此处迁至系统包。 */
    const BRAND_EVENT = "cheeco-brand-change";
    const BRAND_CFG_ENDPOINT = "/dsh-system/config";
    function useBrand() {
      const [brand, setBrand] = react.useState({ title: "", logoUrl: "" });
      const load = () => {
        fetch(BRAND_CFG_ENDPOINT, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : {}))
          .then((d) => {
            const b = (d && typeof d.brand === "object" && d.brand) ? d.brand : {};
            const logo = (b.logoUrl || "").trim();
            setBrand({ title: typeof b.title === "string" ? b.title : "", logoUrl: logo.startsWith("data:") ? "" : logo });
          })
          .catch(() => {});
      };
      react.useEffect(() => {
        load();
        try { window.addEventListener(BRAND_EVENT, load); return () => window.removeEventListener(BRAND_EVENT, load); } catch (e) {}
      }, []);
      return brand;
    }
    function BrandName() {
      const brand = useBrand();
      if (brand.title) return react_jsx_runtime.jsx("span", { className: "dsh-sys-brand-title", children: brand.title });
      // 未设置标题 -> 回退到默认（留空让官方品牌显示；此处给个空占位避免报错）。
      return react_jsx_runtime.jsx("span", { className: "dsh-sys-brand-title", children: "DeepSeek Harness" });
    }
    function BrandMark({ size }) {
      const brand = useBrand();
      const s = size || 24;
      if (brand.logoUrl) return react_jsx_runtime.jsx("img", { src: brand.logoUrl, alt: "", className: "dsh-sys-brand-logo", style: { height: s, width: s, objectFit: "contain" } });
      return react_jsx_runtime.jsx("span", { className: "dsh-sys-brand-fallback", style: { width: s, height: s } });
    }

    /** 内页：tab 结构，「功能表」「系统信息」「声音管理」「品牌设置」「面版管理」五个 tab。
     *  「系统信息」由 dsh-client-ui-system-info 经子 slot `dsh-system-package.system-info` 注入；
     *  「声音管理」由 dsh-client-ui-message-sound 经子 slot `dsh-system-package.sound-manage` 注入；
     *  「品牌设置」(界面标题/Logo) 由 dsh-web-setting-BrandPanel 经子 slot `dsh-system-package.brand-panel`
     *  注入（均已声明），本页只负责渲染。 */
    function Section({ renderSlot }) {
      const [tab, setTab] = react.useState("functions");
      const tabs = [
        { id: "functions", label: "功能表" },
        { id: "system-info", label: "系统信息" },
        { id: "sound-manage", label: "声音管理" },
        { id: "brand-panel", label: "品牌设置" },
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
      } else if (tab === "system-info") {
        // 「系统信息」内容来自 system-info 注入的子 slot；判空用 react.Children.toArray，
        // 否则 slot 已有声明但无 occupant 时 renderSlot 返回的"空容器"会被误判为非空。
        const out = renderSlot ? renderSlot("dsh-system-package.system-info", {}) : null;
        const renderedChildren = (out === null || out === void 0) ? [] : react.Children.toArray(out);
        const empty = renderedChildren.length === 0;
        content = react_jsx_runtime.jsx("div", { children: [
          empty ? react_jsx_runtime.jsx("p", { style: { padding: "12px 0", color: "var(--dsw-alias-label-tertiary,#999)" }, children: "该插件未处于安装状态" }) : out
        ] });
      } else if (tab === "sound-manage") {
        // 「声音管理」内容来自 message-sound 注入的子 slot；判空同系统信息。
        const out = renderSlot ? renderSlot("dsh-system-package.sound-manage", {}) : null;
        const renderedChildren = (out === null || out === void 0) ? [] : react.Children.toArray(out);
        const empty = renderedChildren.length === 0;
        content = react_jsx_runtime.jsx("div", { children: [
          empty ? react_jsx_runtime.jsx("p", { style: { padding: "12px 0", color: "var(--dsw-alias-label-tertiary,#999)" }, children: "该插件未处于安装状态" }) : out
        ] });
      } else if (tab === "brand-panel") {
        // 「主面板修改」(界面标题/Logo) 内容来自 brand-panel 注入的子 slot；判空同系统信息。
        const out = renderSlot ? renderSlot("dsh-system-package.brand-panel", {}) : null;
        const renderedChildren = (out === null || out === void 0) ? [] : react.Children.toArray(out);
        const empty = renderedChildren.length === 0;
        content = react_jsx_runtime.jsx("div", { children: [
          empty ? react_jsx_runtime.jsx("p", { style: { padding: "12px 0", color: "var(--dsw-alias-label-tertiary,#999)" }, children: "该插件未处于安装状态" }) : out
        ] });
      } else {
        content = react_jsx_runtime.jsx(RenameCard, {});
      }
      return react_jsx_runtime.jsx("div", { className: "dsh-sys", children: [
        react_jsx_runtime.jsx("div", { style: { display: "flex", gap: "8px", borderBottom: "1px solid rgba(128,128,128,0.3)", marginBottom: "14px", overflowX: "auto", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }, children: tabs.map((t) => tabBtn(t.id, t.label)) }),
        content,
        react_jsx_runtime.jsx("div", { style: { marginTop: "30px", borderTop: "1px solid rgba(128,128,128,0.45)", paddingTop: "12px", textAlign: "center" }, children: [
          react_jsx_runtime.jsx(SectionFooter, {})
        ] })
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
      // 「系统信息」「声音管理」「主面板修改」tab 用到的基础子 slot，必须在此声明，
      // settings.section 才会把 renderSlot 传给 Section（否则 renderSlot(...) === undefined）。
      const baseChildren = {
        "dsh-system-package.system-info": { kind: "single", scope: "root" },
        "dsh-system-package.sound-manage": { kind: "single", scope: "root" },
        "dsh-system-package.brand-panel": { kind: "single", scope: "root" }
      };
      const registerSection = () => ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "dsh-system-package",
        order: -0.5,              // 放在「Cheeco的小功能」(-1) 之后、通用设置(0) 之前
        label: () => config.label || t("nav"),
        locale: NS,
        children: baseChildren
      }, Section));
      // 等配置加载完成再注册，保证侧边栏 label 读到文件里的值。
      loadConfig().then(() => registerSection());

      // 顶部品牌名/logo（sidebar.brand 槽）：接管原 cheeco-style 的顶部品牌显示。
      ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({
        name: "sidebar.brand.name",
        priority: -1
      }, BrandName));
      ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.register({
        name: "sidebar.brand.mark",
        priority: -1
      }, BrandMark));
    }

    exports.apply = apply;
    exports.inject = inject;
    // 提前载入文件配置，使侧边栏 label 一上来就按文件显示。
    loadConfig();
    return module.exports;
  }
});
