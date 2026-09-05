// @cheeco/dsh-web-ui-PowerPackagePanel — browser half（「能力」包）。
//
// 在设置侧边栏注册一个「能力」槽位（settings.section，id = dsh-power-package）。
// 内页是一个 tab 结构，tab 由**能力插件**经子 slot 注入：
//    - dsh-power-package.skill  -> 技能（选择/调用技能）
//    - dsh-power-package.auto   -> 常驻技能列表（默认启用）
//    - dsh-power-package.mcp    -> MCP 管理
// 行为（按用户要求）：
//    - 若**没有任何**能力子 slot 被注入 -> 显示默认空白页「未安装相关能力」；
//    - 一旦有字段被注入（renderSlot 非空）-> 隐藏空白页，直接显示已注入的 tab
//      （技能 + 常驻技能列表，像 系统包 的 system-info/sound 那样）。
window.__ModuleLoader__.load({
  id: "@cheeco/dsh-web-ui-PowerPackagePanel",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");
    let slots = require("@deepseek-ai/dsh-client-ui-slots");
    let locale = require("@deepseek-ai/dsh-client-locale");

    // 注入卡片样式（幂等），使能力卡片跨主题一致。
    (function () {
      if (typeof document === "undefined" || document.querySelector('style[data-plugin="dsh-web-ui-power-package"]')) return;
      var css = ".dsh-power{display:flex;flex-direction:column;gap:16px;}"
        + ".dsh-power-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;padding:56px 16px;color:var(--dsw-alias-label-tertiary,#999);text-align:center;}"
        + ".dsh-power-empty-ico{font-size:40px;line-height:1;opacity:.5;}"
        + ".dsh-power-empty-tip{font-size:14px;line-height:22px;}"
        + ".dsh-power-empty-sub{font-size:12px;line-height:18px;}"
        + ".dsh-power-hint{margin:0 0 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#666);}";
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-web-ui-power-package";
      tag.textContent = css;
      document.head.appendChild(tag);
    })();

    /** 本插件字典命名空间。 */
    const NS = "dsh-web-ui-power-package";
    const zh = { nav: "能力" };
    /** 与 package.json 同步，供底部 footer 显示。 */
    const PLUGIN_VERSION = "0.1.0";

    /** 能力插件可注入的子 slot（契约名，与 dsh-tool-skill-mcp-panel 保持一致）。
     *  label 用于 tab 标题；未注入（无 occupant）的 tab 会被隐藏。 */
    const SLOT_TABS = [
      { slot: "dsh-power-package.skill", label: "技能" },
      { slot: "dsh-power-package.auto", label: "常驻技能列表" },
      { slot: "dsh-power-package.mcp", label: "MCP 管理" }
    ];

    /** 底部 footer：显示「能力包 | 插件版本 x.y.z | 当前 Profile」。 */
    function SectionFooter() {
      const getProfile = () => (typeof window !== "undefined" && window.__dshCheecoProfile) || "";
      const [profile, setProfile] = react.useState(getProfile);
      react.useEffect(() => {
        if (typeof window === "undefined") return;
        const upd = () => setProfile(getProfile());
        window.addEventListener("dsh-cheeco-profile", upd);
        return () => window.removeEventListener("dsh-cheeco-profile", upd);
      }, []);
      return react_jsx_runtime.jsx("p", { className: "dsh-power-hint", children: "能力包 | 插件版本 " + PLUGIN_VERSION + (profile ? " | 当前 Profile：" + profile : "") });
    }

    /** 默认空白页：没有能力子 slot 被注入时显示。 */
    function EmptyPage() {
      return react_jsx_runtime.jsxs("div", { className: "dsh-power-empty", children: [
        react_jsx_runtime.jsx("span", { className: "dsh-power-empty-ico", children: "\u26a1" }),
        react_jsx_runtime.jsx("div", { className: "dsh-power-empty-tip", children: "未安装相关能力" }),
        react_jsx_runtime.jsx("div", { className: "dsh-power-empty-sub", children: "安装「技能 / 常驻技能 / MCP」等能力插件后，此处将显示对应功能。" })
      ] });
    }

    /** 内页：动态 tab（来自子 slot 是否被注入）+ 空白默认页兜底。 */
    function Section({ renderSlot }) {
      // 逐个子 slot 渲染，仅保留有 occupant 的 tab（否则 slot 已声明但无 occupant 时
      // renderSlot 返回的“空容器”会被误判为非空——用 Children.toArray 判空）。
      const [active, setActive] = react.useState("");
      const rendered = SLOT_TABS.map((t) => {
        const out = renderSlot ? renderSlot(t.slot, {}) : null;
        const children = (out === null || out === void 0) ? [] : react.Children.toArray(out);
        return { slot: t.slot, label: t.label, out, has: children.length > 0 };
      });
      const filled = rendered.filter((r) => r.has);
      // 无任何能力注入 -> 空白默认页。
      if (filled.length === 0) {
        return react_jsx_runtime.jsxs("div", { className: "dsh-power", children: [
          react_jsx_runtime.jsx(EmptyPage, {}),
          react_jsx_runtime.jsx("div", { style: { marginTop: "30px", borderTop: "1px solid rgba(128,128,128,0.45)", paddingTop: "12px", textAlign: "center" }, children: [ react_jsx_runtime.jsx(SectionFooter, {}) ] })
        ] });
      }
      // 有注入 -> 隐藏空白页，直接显示已注入 tab（默认选中第一个）。
      const current = active && rendered.find((r) => r.slot === active && r.has) ? active : filled[0].slot;
      const tabBtn = (key, label) => react_jsx_runtime.jsx("button", {
        type: "button",
        onClick: (e) => {
          setActive(key);
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
          fontWeight: current === key ? 600 : 400,
          borderBottom: current === key ? "2px solid #4a90d9" : "2px solid transparent",
          opacity: current === key ? 1 : 0.6,
          flex: "0 0 auto"
        },
        children: label
      });
      const activeTab = rendered.find((r) => r.slot === current);
      return react_jsx_runtime.jsxs("div", { className: "dsh-power", children: [
        react_jsx_runtime.jsxs("div", { style: { display: "flex", gap: "8px", borderBottom: "1px solid rgba(128,128,128,0.3)", marginBottom: "14px", overflowX: "auto", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }, children: filled.map((r) => tabBtn(r.slot, r.label)) }),
        activeTab ? activeTab.out : null,
        react_jsx_runtime.jsx("div", { style: { marginTop: "30px", borderTop: "1px solid rgba(128,128,128,0.45)", paddingTop: "12px", textAlign: "center" }, children: [ react_jsx_runtime.jsx(SectionFooter, {}) ] })
      ] });
    }

    /** 所需服务（cordis fiber inject）：slot 系统与 locale。 */
    const inject = ["slots", "locale"];

    /** 注册「能力」设置槽位。label 用 thunk（读文件配置），顺序放在 Cheeco 系包之间。 */
    function apply(ctx) {
      const t = ctx.locale.bind(NS);
      ctx.effect(() => ctx.locale.register(NS, { zh, en: zh }), "dsh-web-ui-power-package: dictionaries");
      // 能力插件注入用的子 slot 必须在此声明，settings.section 才会把 renderSlot 传给
      // Section（否则 renderSlot(...) === undefined）。
      const baseChildren = {
        "dsh-power-package.skill": { kind: "single", scope: "root" },
        "dsh-power-package.auto": { kind: "single", scope: "root" },
        "dsh-power-package.mcp": { kind: "single", scope: "root" }
      };
      ctx.slots.inject("settings.section", () => ctx.slots.register({
        name: "settings.section",
        id: "dsh-power-package",
        order: -0.25,           // 放在「DSH系统包」(-0.5) 之后、通用设置(0) 之前
        label: () => t("nav"),
        locale: NS,
        children: baseChildren
      }, Section));
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
