/**
 * @cheeco/dsh-client-ui-system-info client half（浏览器侧）
 *
 * 注册「系统信息」tab 到 dsh-web-ui-cheeco-style 的 cheeco-style.tab（list）槽位；
 * tab 内容 fetch 宿主 /sysinfo：显示 当前 profile / DSH_HOME / 端口 / dsh版本 / 已运行实例（心跳+存活）。
 */
window.__ModuleLoader__.load({
  id: "@cheeco/dsh-client-ui-system-info",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");
    let rx = require("react/jsx-runtime");

    const NS = "dsh-client-ui-system-info";
    const zh = {
      title: "系统信息",
      loading: "加载中…",
      error: "读取系统信息失败",
      currentProfile: "当前 profile",
      dshHome: "DSH_HOME",
      port: "端口",
      dshVersion: "DSH 版本",
      pluginVersion: "插件版本",
      running: "当前已运行实例",
      none: "未发现其它运行实例"
    };

    function cell(label, value) {
      return rx.jsx("div", {
        style: { padding: "10px 0", borderBottom: "1px solid rgba(128,128,128,0.2)" },
        children: [
          rx.jsx("div", { style: { fontSize: "12px", color: "#888", marginBottom: "2px" }, children: label }),
          rx.jsx("div", { style: { fontSize: "14px", wordBreak: "break-all" }, children: value })
        ]
      });
    }

    function SystemInfoTab() {
      var state = react.useState({ loading: true, error: null, data: null });
      var loading = state[0].loading, error = state[0].error, data = state[0].data;
      // 展开的 profile 名（点击「正在运行的实例」某一行展开/收起）。
      var openedPair = react.useState(null);
      var opened = openedPair[0], setOpened = openedPair[1];
      // 二次确认：待确认的动作 {op, profile}（避免误触，无需宿主原生 confirm）
      var armedPair = react.useState(null);
      var armed = armedPair[0], setArmed = armedPair[1];
      // 重启指令的提示文案
      var msgPair = react.useState("");
      var msg = msgPair[0], setMsg = msgPair[1];
      react.useEffect(function () {
        var cancelled = false;
        (async function () {
          try {
            var r = await fetch("/sysinfo", { cache: "no-store" });
            var j = await r.json();
            if (!cancelled) state[1]({ loading: false, data: j, error: null });
          } catch (e) {
            if (!cancelled) state[1]({ loading: false, error: String(e && e.message || e) });
          }
        })();
        return function () { cancelled = true; };
      }, []);

      // 重启/关闭指定实例：POST /sysinfo/close|restart 交给宿主 spawn 执行对应 .ps1。
      // 若操作的就是当前页面对应的实例，宿主会被脚本停掉、连接可能中断，故这里不依赖响应成功，只提示。
      function doAction(op, profile, port) {
        var isClose = op === "close";
        setMsg(isClose
          ? "正在关闭 " + profile + "（端口 " + port + "）…该实例进程将停止，不再自动拉起"
          : "正在重启 " + profile + "（端口 " + port + "）…请稍后刷新页面");
        fetch(isClose ? "/sysinfo/close" : "/sysinfo/restart", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile: profile, port: port })
        }).catch(function () { /* 操作当前实例时请求可能被断开，忽略 */ });
      }
      function onActionClick(op, profile, port) {
        if (armed && armed.op === op && armed.profile === profile) { setArmed(null); doAction(op, profile, port); }
        else { setArmed({ op: op, profile: profile }); setTimeout(function () { setArmed(null); }, 4000); }
      }

      if (loading) return rx.jsx("p", { children: zh.loading });
      if (error) return rx.jsx("p", { style: { color: "#c00" }, children: zh.error + "：" + error });
      var d = data || {};
      var inst = Array.isArray(d.instances) ? d.instances : [];
      // 只把「运行中」的实例按 profile 压成简洁行；点击某行再展开该 profile 的全部实例详情。
      var byProfile = inst.reduce(function (acc, h) {
        var key = h.profile || "未知";
        (acc[key] = acc[key] || []).push(h);
        return acc;
      }, {});
      var profileNames = Object.keys(byProfile).filter(function (k) {
        return byProfile[k].some(function (h) { return h.alive; });
      });
      return rx.jsx("div", {
        className: "dsh-web-ui-cheeco-style-section",
        children: [
          cell(zh.currentProfile + "（" + zh.port + " " + (d.port || "") + "）", d.profileName || "-"),
          cell(zh.dshHome, d.dshHome || "-"),
          cell(zh.dshVersion, d.dshVersion || "-"),
          cell(zh.pluginVersion, d.pluginVersion || "-"),
          rx.jsx("h3", { style: { marginTop: "18px" }, children: zh.running + "（" + profileNames.length + "）" }),
          msg ? rx.jsx("div", { style: { padding: "6px 0", fontFamily: "monospace", fontSize: "12px", color: "#1a73e8" }, children: msg }) : null,
          profileNames.length === 0
            ? rx.jsx("p", { style: { color: "#999" }, children: zh.none })
            : rx.jsx("div", { children: profileNames.map(function (k) {
                var alive = byProfile[k].filter(function (h) { return h.alive; });
                var collapsed = opened !== k;
                return rx.jsx("div", { key: k, style: { padding: "8px 0", borderBottom: "1px solid rgba(128,128,128,0.15)" }, children: [
                  rx.jsx("div", {
                    onClick: function () { setOpened(collapsed ? k : null); },
                    style: { cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", fontFamily: "monospace", fontSize: "13px" },
                    children: [
                      rx.jsx("span", { children: alive[0].port + " | " + k + " | " + alive[0].dshHome }),
                      rx.jsx("span", { style: { display: "inline-flex", alignItems: "center", gap: "8px" }, children: [
                        rx.jsx("span", { style: { fontSize: "12px", color: "#888" }, children: "运行中（" + alive.length + "） " + (collapsed ? "▸" : "▾") }),
                        rx.jsx("button", {
                          onClick: function (e) { e.stopPropagation(); onActionClick("restart", k, alive[0].port); },
                          style: {
                            padding: "2px 10px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
                            background: (armed && armed.op === "restart" && armed.profile === k) ? "rgba(255,0,0,0.12)" : "rgba(0,122,255,0.12)",
                            border: (armed && armed.op === "restart" && armed.profile === k) ? "1px solid rgba(255,0,0,0.5)" : "1px solid rgba(0,122,255,0.4)",
                            borderRadius: "4px",
                            color: (armed && armed.op === "restart" && armed.profile === k) ? "#d93025" : "#1a73e8"
                          },
                          children: (armed && armed.op === "restart" && armed.profile === k) ? "确认重启？" : "重启"
                        }),
                        rx.jsx("button", {
                          onClick: function (e) { e.stopPropagation(); onActionClick("close", k, alive[0].port); },
                          style: {
                            padding: "2px 10px", fontSize: "12px", cursor: "pointer", fontFamily: "inherit",
                            background: (armed && armed.op === "close" && armed.profile === k) ? "rgba(255,0,0,0.2)" : "rgba(255,0,0,0.08)",
                            border: (armed && armed.op === "close" && armed.profile === k) ? "1px solid rgba(255,0,0,0.7)" : "1px solid rgba(255,0,0,0.4)",
                            borderRadius: "4px",
                            color: "#d93025"
                          },
                          children: (armed && armed.op === "close" && armed.profile === k) ? "确认关闭？" : "关闭"
                        })
                      ]})
                    ]
                  }),
                  collapsed ? null : rx.jsx("div", { style: { marginTop: "6px", paddingLeft: "10px", fontFamily: "monospace", fontSize: "12px" }, children: alive.map(function (h) {
                    return rx.jsx("div", { key: String(h.pid), style: { padding: "4px 0", color: "#666" }, children: "PID " + (h.pid ?? "-") + " | 端口 " + (h.port ?? "-") + " | " + (h.startedAt || "-") + " | " + (h.alive ? "运行中" : "失效") });
                  }) })
                ] });
              }) })
        ]
      });
    }

    function apply(ctx) {
      // 向 cheeco 内页的「插件自有组件页」槽位注入：内页选中 system-info 页时
      // 通过 renderSlot("cheeco-style.page.system-info") 渲染本组件（/sysinfo 内容）。
      ctx.slots.inject("cheeco-style.page.system-info", function () {
        return ctx.slots.register({ name: "cheeco-style.page.system-info", id: "sysinfo", label: "系统信息" }, SystemInfoTab);
      });
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
