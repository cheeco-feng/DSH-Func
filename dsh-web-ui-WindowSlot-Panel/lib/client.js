// @cheeco/dsh-web-ui-WindowSlot-Panel — browser half（「引用」按钮 + 空宿主）。
//
// 在聊天输入框工具行注入一个「引用」按钮（conversation.input.left，order 110，
// 排在「能力」order 100 的右侧），点击弹出引用窗口。
//
// 本插件是一个「引用」弹窗宿主：弹窗为 tab 结构，tab 内容由其它插件经子 slot
// 注入（dswp-ability：技能选择 / dswp-auto：常驻技能列表）。未注入时显示空占位 tab。
// （技能内容由 dsh-tool-skill-mcp-panel 注入，见其 client.js。）
//
// 显隐由 DSH功能包「功能管理→功能开关」的「显示引用功能按钮」控制：
//   读 /dsh-func/config 的 features.showQuoteButton（与「显示会话搜索」同一机制）。
//   文件不存在 / 解析失败一律视为开启（默认显示）。
window.__ModuleLoader__.load({
  id: "@cheeco/dsh-web-ui-WindowSlot-Panel",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    let react = require("react");
    let react_jsx_runtime = require("react/jsx-runtime");
    let slots = require("@deepseek-ai/dsh-client-ui-slots");
    let locale = require("@deepseek-ai/dsh-client-locale");

    // 注入样式（幂等），使「引用」按钮与弹出宿主窗跨主题一致。
    (function () {
      if (typeof document === "undefined" || document.querySelector('style[data-plugin="dsh-web-ui-window-slot-panel"]')) return;
      var css = ".dswp-btn{cursor:pointer;height:32px;border-radius:10px;color:var(--dsw-alias-label-primary);background:0 0;border:1px solid var(--dsw-alias-border-l2);padding:0 10px;font-size:13px;line-height:20px;display:inline-flex;align-items:center;gap:6px;}"
        + ".dswp-btn:hover{background:var(--dsw-alias-interactive-bg-hover)}"
        + ".dswp-overlay{z-index:1000;position:fixed;inset:0;display:flex;justify-content:center;align-items:center;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur)}"
        + ".dswp-panel{background:var(--dsw-alias-bg-layer-2);width:90vw;max-width:90vw;height:90vh;max-height:90vh;display:flex;flex-direction:column;border-radius:16px;box-shadow:var(--dsw-shadow-lv3);padding:18px;gap:12px}"
        + ".dswp-head{display:flex;justify-content:space-between;align-items:center;font-size:15px;font-weight:600;color:var(--dsw-alias-label-primary)}"
        + ".dswp-close{cursor:pointer;border:none;background:0 0;color:var(--dsw-alias-label-primary);font-size:18px;line-height:1}"
        + ".dswp-tabs{display:flex;gap:4px;border-bottom:1px solid var(--dsw-alias-border-l2)}"
        + ".dswp-tab{cursor:pointer;padding:6px 14px;font-size:13px;color:var(--dsw-alias-label-secondary);background:0 0;border:none;border-bottom:2px solid transparent}"
        + ".dswp-tab[data-on=true]{color:var(--dsw-alias-label-primary);font-weight:600;border-bottom-color:var(--dsw-alias-state-business-primary)}"
        + ".dswp-body{display:flex;flex-direction:column;gap:8px;flex:1;overflow:auto;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;padding:8px 0}";
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-web-ui-window-slot-panel";
      tag.textContent = css;
      document.head.appendChild(tag);
    })();

    /** 本插件字典命名空间。 */
    const NS = "dsh-web-ui-window-slot-panel";
    const zh = { quote: "引用" };

    /** 本插件的「引用」弹窗 tab（占位，实际内容由子 slot 注入）。 */
    const TABS = [
      { slot: "dswp-ability", label: "技能" },
      { slot: "dswp-auto", label: "常驻技能列表" }
    ];

    /** 「引用」按钮 + 弹窗（宿主）：渲染子 slot 注入的 tab 内容；无注入则显示占位。 */
    function QuoteButton(props) {
      const renderSlot = props && props.renderSlot;
      const [open, setOpen] = react.useState(false);
      const [active, setActive] = react.useState(TABS[0].slot);
      // 逐个子 slot 渲染，仅保留有 occupant 的 tab。
      const rendered = TABS.map((t) => {
        const out = typeof renderSlot === "function" ? renderSlot(t.slot, {}) : null;
        const children = (out === null || out === void 0) ? [] : react.Children.toArray(out);
        return { slot: t.slot, label: t.label, out, has: children.length > 0 };
      });
      const filled = rendered.filter((r) => r.has);
      const current = filled.some((r) => r.slot === active) ? active : (filled[0] ? filled[0].slot : "");
      const tabBtn = (key, label) => react_jsx_runtime.jsx("button", {
        type: "button",
        className: "dswp-tab",
        "data-on": current === key,
        onClick: () => setActive(key),
        children: label
      });
      const activeTab = rendered.find((r) => r.slot === current);
      return react_jsx_runtime.jsxs(react.Fragment, {
        children: [
          react_jsx_runtime.jsx("button", { type: "button", className: "dswp-btn", onClick: () => setOpen(true), children: zh.quote }),
          open && react_jsx_runtime.jsxs("div", {
            className: "dswp-overlay",
            onClick: () => setOpen(false),
            children: [
              react_jsx_runtime.jsxs("div", {
                className: "dswp-panel",
                onClick: (e) => e.stopPropagation(),
                children: [
                  react_jsx_runtime.jsxs("div", { className: "dswp-head", children: [
                    react_jsx_runtime.jsx("span", { children: "引用" }),
                    react_jsx_runtime.jsx("button", { className: "dswp-close", onClick: () => setOpen(false), children: "\u00d7" })
                  ] }),
                  react_jsx_runtime.jsxs("div", { className: "dswp-tabs", children: rendered.map((r) => tabBtn(r.slot, r.label)) }),
                  react_jsx_runtime.jsx("div", { className: "dswp-body", children: [
                    activeTab ? activeTab.out : react_jsx_runtime.jsx("p", { children: "（未安装相关能力）" })
                  ] })
                ]
              })
            ]
          })
        ]
      });
    }

    /** 所需服务（cordis fiber inject）：slot 系统与 locale。 */
    const inject = ["slots", "locale"];

    /** 注册「引用」按钮。显隐由功能包的 features.showQuoteButton 决定。
     *  声明子 slot children，使本组件能拿到 renderSlot 渲染注入内容。 */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en: zh }), "dsh-web-ui-window-slot-panel: dictionaries");
      const baseChildren = {
        "dswp-ability": { kind: "single", scope: "root" },
        "dswp-auto": { kind: "single", scope: "root" }
      };
      (async () => {
        let enabled = true;
        try {
          const r = await fetch("/dsh-func/config", { cache: "no-store" });
          const j = await r.json();
          enabled = !(j.features && j.features.showQuoteButton === false);
        } catch (e) { enabled = true; }
        if (!enabled) return;
        ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
          name: "conversation.input.left",
          id: "window-slot-panel-quote",
          order: 110,
          children: baseChildren
        }, (props) => react_jsx_runtime.jsx(QuoteButton, { ...props })));
      })();
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
