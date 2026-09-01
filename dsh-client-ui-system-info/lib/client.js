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

      if (loading) return rx.jsx("p", { children: zh.loading });
      if (error) return rx.jsx("p", { style: { color: "#c00" }, children: zh.error + "：" + error });
      var d = data || {};
      var inst = Array.isArray(d.instances) ? d.instances : [];
      return rx.jsx("div", {
        className: "dsh-web-ui-cheeco-style-section",
        children: [
          cell(zh.currentProfile + "（" + zh.port + " " + (d.port || "") + "）", d.profileName || "-"),
          cell(zh.dshHome, d.dshHome || "-"),
          cell(zh.dshVersion, d.dshVersion || "-"),
          cell(zh.pluginVersion, d.pluginVersion || "-"),
          rx.jsx("h3", { style: { marginTop: "18px" }, children: zh.running + "（" + inst.length + "）" }),
          inst.length === 0
            ? rx.jsx("p", { style: { color: "#999" }, children: zh.none })
            : rx.jsx("div", { children: inst.map(function (h) {
                return rx.jsx("div", {
                  key: String(h.pid),
                  style: { padding: "8px 0", borderBottom: "1px solid rgba(128,128,128,0.15)", fontFamily: "monospace", fontSize: "12px" },
                  children: "PID " + (h.pid ?? "-") + " | 端口 " + (h.port ?? "-") + " | " + (h.profile || "-") + " | " + (h.dshHome || "-") + " | " + (h.startedAt || "-") + " | " + (h.alive ? "运行中" : "失效")
                });
              }) })
        ]
      });
    }

    function apply(ctx) {
      ctx.slots.inject("cheeco-style.tab", function () {
        return ctx.slots.register({ name: "cheeco-style.tab", id: "sysinfo", order: 200, label: "系统信息" }, SystemInfoTab);
      });
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
