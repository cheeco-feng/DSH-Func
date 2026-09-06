// @cheeco/dsh-web-ui-WindowSlot-Panel — browser half（「引用」按钮 + 「监控」对话视图 tab）。
//
// 1) 在聊天输入框工具行注入一个「引用」按钮（conversation.input.left，order 110，
//    排在「能力」order 100 的右侧），点击弹出引用窗口。
// 2) 在对话视图区（conversation.view）注入「监控」tab（order 40，排在「调度」order 30 右侧），
//    内页为「子 tab」结构，与「引用」弹窗同一渲染机制（子 slot + renderSlot），未注入时显示「缺省页」占位。
//
// 「引用」弹窗与「监控」tab 均为宿主：内容由其它插件经子 slot 注入
//（dswp-ability：技能选择 / dswp-auto：常驻技能列表 / dswp-monitor.default：监控缺省页）。
//（技能内容由 dsh-tool-skill-mcp-panel 注入，见其 client.js。）
//
// 显隐由 DSH功能包「功能管理→功能开关」控制：读 /dsh-func/config 的
//   features.showQuoteButton（显示引用功能按钮）与 features.showMonitorPanel（显示监控）。
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
        + ".dswp-body{display:flex;flex-direction:column;gap:8px;flex:1;overflow:auto;color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;padding:8px 0}"
        + ".dswp-monitor{display:flex;flex-direction:column;gap:12px;flex:1;min-height:0;padding:16px 20px 24px;color:var(--dsw-alias-label-primary)}"
        + ".dswp-hint{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;padding:8px 0}"
        + ".dswp-more-body{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px;flex:1;min-height:0;overflow:auto;padding:8px 0;align-content:start}"
        + ".dswp-more-empty{color:var(--dsw-alias-label-secondary);font-size:13px;line-height:20px;padding:24px 8px;text-align:center}";
      var tag = document.createElement("style");
      tag.dataset.plugin = "dsh-web-ui-window-slot-panel";
      tag.textContent = css;
      document.head.appendChild(tag);
    })();

    /** 本插件字典命名空间。 */
    const NS = "dsh-web-ui-window-slot-panel";
    const zh = {
      quote: "引用",
      "monitor.tab": "监控",
      "more.menu": "更多",            // 会话「…」菜单底部注入的菜单项
      "more.title": "更多菜单",        // 「更多」弹出页标题
      "more.empty": "暂无更多可用菜单"  // 无卡片时的占位文案
    };

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

    /** 「监控」对话视图 tab 的内页子 tab（内容由其它插件经子 slot 注入，如「命令监视」）。
     *  「缺省页」不作为 tab——无任何 occupant 时直接显示「当前未安装相关的面板」文案。 */
    const MONITOR_TABS = [
      { slot: "dswp-monitor.cmdwatch", label: "命令监视" }
    ];

    /** 「监控」对话视图 tab 声明的子 slot：供其它插件向内页注入内容（同「引用」弹窗机制）。 */
    const MONITOR_CHILDREN = {
      "dswp-monitor.cmdwatch": { kind: "single", scope: "root" }
    };

    /** 判断 renderSlot 输出元素树里是否命中「空占位」标记（declared 但无 occupant 时 slot 系统的
     *  fallback 会带上此标记）。不能靠 react.Children.toArray 判空——空槽返回 <Fragment>{null}</Fragment>，
     *  toArray 长度 1 >0 会误判为有内容（实测）。 */
    function hasEmptyMark(node) {
      if (Array.isArray(node)) return node.some((n) => hasEmptyMark(n));
      if (!react.isValidElement(node)) return false;
      if (node.props && node.props["data-dswp-empty"] !== undefined) return true;
      return hasEmptyMark(node.props && node.props.children);
    }

    /** 「监控」对话视图 tab：内页为「子 tab」结构（同「引用」弹窗机制，用 renderSlot 渲染注入内容）。
     *  只显示**有 occupant** 的子 tab（如「命令监视」）；无任何 occupant 时**不显示 tab 栏**，直接显示
     *  「当前未安装相关的面板」文案。与「引用」弹出页不同——这是一棵常驻对话视图 tab，不是弹出页。 */
    function MonitorView(props) {
      const renderSlot = props && props.renderSlot;
      const [active, setActive] = react.useState(MONITOR_TABS[0] ? MONITOR_TABS[0].slot : "");
      const owner = props && props.sessionId ? { sessionId: props.sessionId } : {};
      // 判空标记：有 occupant 时其元素树不含此标记；空槽则含（据此判断哪个子 tab 有内容）。
      const emptyMark = react_jsx_runtime.jsx("span", { "data-dswp-empty": "", style: { display: "none" } });
      const rendered = MONITOR_TABS.map((t) => {
        const out = typeof renderSlot === "function" ? renderSlot(t.slot, owner, { fallback: emptyMark }) : emptyMark;
        return { slot: t.slot, label: t.label, out, occupied: !hasEmptyMark(out) };
      });
      const occupiedTabs = rendered.filter((r) => r.occupied);
      // 无任何占用的子 tab → 不显示 tab 栏，直接显示占位文案。
      if (occupiedTabs.length === 0) {
        return react_jsx_runtime.jsx("div", { className: "dswp-monitor", children: react_jsx_runtime.jsx("p", { className: "dswp-hint", children: "当前未安装相关的面板" }) });
      }
      const current = occupiedTabs.some((r) => r.slot === active) ? active : occupiedTabs[0].slot;
      const tabBtn = (key, label) => react_jsx_runtime.jsx("button", {
        type: "button",
        className: "dswp-tab",
        "data-on": current === key,
        onClick: () => setActive(key),
        children: label
      });
      const activeTab = occupiedTabs.find((r) => r.slot === current);
      return react_jsx_runtime.jsxs("div", {
        className: "dswp-monitor",
        children: [
          react_jsx_runtime.jsxs("div", { className: "dswp-tabs", children: occupiedTabs.map((r) => tabBtn(r.slot, r.label)) }),
          react_jsx_runtime.jsx("div", { className: "dswp-body", children: [
            activeTab ? activeTab.out : null
          ] })
        ]
      });
    }

    // ———————————————————————————————— 「更多」菜单扩展 ————————————————————————————————
    // 用户在会话「…」下拉菜单底部新增一项「更多」（放到最下面）。点击后弹出一个与「引用」相同的
    // 弹出页，但里面不放 tab，而是放**卡片**：卡片由其它插件经子 slot `dswp-more.card`（list）注入；
    // 无卡片时显示「暂无更多可用菜单」。这个判空逻辑与「监控」子 tab 相同（renderSlot + fallback 标记）。
    //
    // 注意：会话行「…」菜单是 DSH 内建（dsh-client-ui-workspace）**硬编码**的，没有供插件追加菜单项的
    // slot。因此参照 meow-memory「跳过梦境整理记忆」的做法，用 DOM + MutationObserver 把「更多」注入到
    // 打开的 `[role="menu"]` 里（克隆首个 menuitem 作模板、改标题、换图标、appendChild 到底部）。
    const MORE_ITEM_ATTR = "data-dswp-more-item";
    const ROW_ACTIONS_SEL = '[class*="_rowActions"]';
    const SESSION_ROW_SEL = '[role="treeitem"][class*="_sessionRow"]';
    const MENU_OPEN_ROW_SEL = '[role="treeitem"][class*="_menuOpen"]';
    const MENU_WINDOW_MS = 1500;
    const MORE_ICON_SVG = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><rect x="3" y="3" width="7.5" height="7.5" rx="1.8" fill="currentColor"/><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.8" fill="currentColor"/><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.8" fill="currentColor"/><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.8" fill="currentColor"/></svg>';

    /** 从 React fiber 里取会话行对应的 sessionId（同 meow-memory）。 */
    function readSessionId(row) {
      let fiber = null;
      for (const key of Object.keys(row)) {
        if (/^__reactFiber\$/.test(key)) { fiber = row[key]; break; }
      }
      let cur = fiber;
      for (let depth = 0; depth < 8 && cur != null; depth++) {
        const f = cur;
        if (typeof f.key === "string" && f.key.length > 0) return f.key;
        cur = f.return;
      }
      return null;
    }
    /** 若点击目标落在会话行「…」按钮区域，则返回对应 sessionId，否则 null。 */
    function captureSessionIdFromTarget(target) {
      const el = target;
      if (el == null || typeof el.closest !== "function") return null;
      if (el.closest(ROW_ACTIONS_SEL) == null) return null;
      const row = el.closest(SESSION_ROW_SEL);
      if (row == null) return null;
      return readSessionId(row);
    }
    function retitleLeaf(root, text) {
      let leaf = null;
      const walk = (el) => {
        let hasElementChild = false;
        for (const c of el.children) { hasElementChild = true; walk(c); }
        if (!hasElementChild && (el.textContent || "").trim().length > 0) leaf = el;
      };
      walk(root);
      if (leaf == null) return false;
      leaf.textContent = text;
      return true;
    }
    function resolveMenuSessionId(doc, fallback) {
      const openRow = doc.querySelector(MENU_OPEN_ROW_SEL);
      if (openRow != null) {
        const sid = readSessionId(openRow);
        if (sid != null) return sid;
      }
      return fallback;
    }
    /** 把「更多」菜单项克隆出来、改标题换图标、追加到 open 菜单底部。 */
    function injectMoreItem(menu, sessionId) {
      for (const old of Array.from(menu.querySelectorAll("[" + MORE_ITEM_ATTR + "]"))) old.remove();
      const template = menu.querySelector('[role="menuitem"]');
      if (template == null) return null;
      const item = template.cloneNode(true);
      item.removeAttribute("id");
      for (const el of Array.from(item.querySelectorAll("[id]"))) el.removeAttribute("id");
      item.setAttribute("role", "menuitem");
      if (!retitleLeaf(item, zh["more.menu"])) return null;
      item.setAttribute(MORE_ITEM_ATTR, "true");
      item.setAttribute("data-dswp-session-id", sessionId);
      const icon = item.querySelector("svg");
      if (icon != null) icon.outerHTML = MORE_ICON_SVG;
      const onClick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("dswp-more:open", { detail: { sessionId } }));
      };
      item.addEventListener("click", onClick, true);
      item.addEventListener("pointerdown", (e) => e.stopPropagation());
      menu.appendChild(item);
      return item;
    }
    /** 打开会话「…」菜单时注入「更多」项（MutationObserver 监听，同 meow-memory 的做法）。 */
    function startMoreMenuManager() {
      let pendingSid = null;
      let pendingAt = 0;
      let observerTimer = 0;
      const syncOpenMenus = () => {
        const withinWindow = pendingSid !== null && Date.now() - pendingAt <= MENU_WINDOW_MS;
        const sid = resolveMenuSessionId(document, withinWindow ? pendingSid : null);
        if (sid == null) return;
        for (const menu of Array.from(document.querySelectorAll('[role="menu"]'))) {
          injectMoreItem(menu, sid);
        }
      };
      const observer = new MutationObserver((muts) => {
        if (pendingSid !== null && Date.now() - pendingAt <= MENU_WINDOW_MS) {
          const sid = resolveMenuSessionId(document, pendingSid);
          if (sid !== null) {
            for (const menu of Array.from(document.querySelectorAll('[role="menu"]'))) {
              injectMoreItem(menu, sid);
            }
          }
        }
        window.clearTimeout(observerTimer);
        observerTimer = window.setTimeout(syncOpenMenus, 120);
      });
      const onPointerDown = (e) => {
        const sid = captureSessionIdFromTarget(e.target);
        if (sid === null) return;
        pendingSid = sid;
        pendingAt = Date.now();
      };
      document.addEventListener("pointerdown", onPointerDown, true);
      observer.observe(document.body, { childList: true, subtree: true });
      syncOpenMenus();
      return () => {
        document.removeEventListener("pointerdown", onPointerDown, true);
        observer.disconnect();
        window.clearTimeout(observerTimer);
        for (const item of Array.from(document.querySelectorAll("[" + MORE_ITEM_ATTR + "]"))) item.remove();
      };
    }

    /** 「更多」弹出页宿主：由会话「…」菜单的「更多」打开（window 'dswp-more:open' 事件）。
     *  注册进 conversation.input.left（与「引用」按钮同槽，关闭返回 null 不显示按钮），
     *  声明子 slot `dswp-more.card`（list），用 renderSlot 渲染卡片；
     *  无卡片时显示「暂无更多可用菜单」（与「监控」子 tab 相同的判空逻辑）。 */
    function MoreMenuHost(props) {
      const renderSlot = props && props.renderSlot;
      const [open, setOpen] = react.useState(false);
      const [sessionId, setSessionId] = react.useState(null);
      react.useEffect(() => {
        const onOpen = (e) => {
          setSessionId(e && e.detail ? e.detail.sessionId : null);
          setOpen(true);
        };
        window.addEventListener("dswp-more:open", onOpen);
        return () => window.removeEventListener("dswp-more:open", onOpen);
      }, []);
      if (!open) return null;
      // 卡片列表来自子 slot `dswp-more.card`（list）。list 槽为空时 slot 运行时会把 `opts.fallback`
      // 渲染出来（renderer renderOutletContent: list.length===0 → fallback），因此把「暂无更多可用菜单」
      // 直接作为 fallback 传入即可，无需再手动判空——这是与「监控」子 tab 同一套判空机制的更稳写法。
      const out = typeof renderSlot === "function"
        ? renderSlot("dswp-more.card", { sessionId }, {
            fallback: react_jsx_runtime.jsx("p", { className: "dswp-more-empty", children: zh["more.empty"] })
          })
        : react_jsx_runtime.jsx("p", { className: "dswp-more-empty", children: zh["more.empty"] });
      return react_jsx_runtime.jsxs("div", {
        className: "dswp-overlay",
        onClick: () => setOpen(false),
        children: [
          react_jsx_runtime.jsxs("div", {
            className: "dswp-panel",
            onClick: (e) => e.stopPropagation(),
            children: [
              react_jsx_runtime.jsxs("div", { className: "dswp-head", children: [
                react_jsx_runtime.jsx("span", { children: zh["more.title"] }),
                react_jsx_runtime.jsx("button", { className: "dswp-close", onClick: () => setOpen(false), children: "\u00d7" })
              ] }),
              react_jsx_runtime.jsx("div", { className: "dswp-more-body", children: [out] })
            ]
          })
        ]
      });
    }

    /** 所需服务（cordis fiber inject）：slot 系统与 locale。 */
    const inject = ["slots", "locale"];

    /** 注册「引用」按钮 + 「监控面版」对话视图 tab。
     *  显隐分别由功能包的 features.showQuoteButton / features.showMonitorPanel 决定。
     *  均声明子 slot children，使组件能拿到 renderSlot 渲染注入内容。 */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, { zh, en: zh }), "dsh-web-ui-window-slot-panel: dictionaries");
      const baseChildren = {
        "dswp-ability": { kind: "single", scope: "root" },
        "dswp-auto": { kind: "single", scope: "root" }
      };
      (async () => {
        let quote = true;
        let monitor = true;
        let more = true;
        try {
          const r = await fetch("/dsh-func/config", { cache: "no-store" });
          const j = await r.json();
          const f = j.features || {};
          quote = !(f.showQuoteButton === false);
          monitor = !(f.showMonitorPanel === false);
          more = !(f.showMoreMenu === false);
        } catch (e) { quote = true; monitor = true; more = true; }
        // 「引用」按钮：注入聊天输入框工具行（order 110，排「能力」右侧）。
        if (quote) ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
          name: "conversation.input.left",
          id: "window-slot-panel-quote",
          order: 110,
          children: baseChildren
        }, (props) => react_jsx_runtime.jsx(QuoteButton, { ...props })));
        // 「监控面版」对话视图 tab：注入 conversation.view，放在「调度」(order 30) 右侧（order 40）。
        // 内页为子 tab 结构，经子 slot 注入；无注入时显示占位子 tab。
        if (monitor) ctx.slots.inject("conversation.view", () => ctx.slots.register({
          name: "conversation.view",
          id: "monitor",
          order: 40,
          label: () => ctx.locale.bind(NS)("monitor.tab"),
          locale: NS,
          children: MONITOR_CHILDREN
        }, MonitorView));
        // 「更多」菜单扩展：在会话「…」菜单底部注入「更多」，点击弹出卡片宿主页。
        // 卡片由其它插件经子 slot `dswp-more.card` 注入；显隐由 features.showMoreMenu 控制。
        // 宿主挂到 `conversation.input.left`（与「引用」按钮同槽，已被证明能挂载并渲染固定定位弹窗）：
        // 关闭时返回 null，不显示任何按钮；打开时渲染 position:fixed 的全屏遮罩弹窗。
        if (more) {
          ctx.slots.inject("conversation.input.left", () => ctx.slots.register({
            name: "conversation.input.left",
            id: "window-slot-panel-more",
            order: 111,
            children: { "dswp-more.card": { kind: "list", scope: "root" } }
          }, (props) => react_jsx_runtime.jsx(MoreMenuHost, { ...props })));
          ctx.effect(startMoreMenuManager, "dsh-web-ui-window-slot-panel: more menu manager");
        }
      })();
    }

    exports.apply = apply;
    exports.inject = inject;
    return module.exports;
  }
});
