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
      // 操作指令的提示文案
      var msgPair = react.useState("");
      var msg = msgPair[0], setMsg = msgPair[1];
      // 功能可用性：restart/close 脚本是否可用（决定按钮是否置灰）。默认可用，避免未取到前误灰。
      var featPair = react.useState({ restart: true, close: true });
      var feat = featPair[0], setFeat = featPair[1];
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
          // 功能可用性检查：依据 host 探测 restart/close 脚本是否存在，设置按钮可用/置灰。
          try {
            var rs = await fetch("/sysinfo/actions/status", { cache: "no-store" });
            var js = await rs.json();
            if (!cancelled && js) setFeat({ restart: js.restart ? js.restart.available !== false : true, close: js.close ? js.close.available !== false : true });
          } catch (e) { /* 拿不到则保持默认可用 */ }
        })();
        return function () { cancelled = true; };
      }, []);

      // 重启/关闭指定实例：POST /sysinfo/close|restart 交给宿主 spawn 执行对应 .ps1。
      // 宿主会先「检查是否可用」并返回状态（功能可用 / 错误），前端据此显示，便于定位问题在哪一环。
      function doAction(op, profile, port) {
        var isClose = op === "close";
        var endpoint = isClose ? "/sysinfo/close" : "/sysinfo/restart";
        var verb = isClose ? "关闭" : "重启";
        setMsg("正在" + verb + " " + profile + "（端口 " + port + "）…");
        fetch(endpoint, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ profile: profile, port: port })
        }).then(function (r) {
          return r.json().catch(function () { return {}; }).then(function (j) {
            if (j && j.ok === false && j.error) { setMsg("失败：" + j.error); return; }
            if (j && j.message) { setMsg(j.message); return; }
            setMsg("已发送：HTTP " + r.status);
          });
        }).catch(function () {
          setMsg(isClose
            ? "已发送关闭指令；若关闭的是当前实例，本页会断开，刷新即可确认"
            : "请求可能被断开（重启当前实例时），请稍后刷新");
        });
      }
      // 一次点击即执行（重启/关闭）。
      function onActionClick(op, profile, port) {
        doAction(op, profile, port);
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
                          disabled: !feat.restart,
                          style: {
                            padding: "2px 10px", fontSize: "12px", cursor: feat.restart ? "pointer" : "not-allowed", fontFamily: "inherit",
                            background: feat.restart ? "rgba(0,122,255,0.12)" : "rgba(128,128,128,0.12)",
                            border: feat.restart ? "1px solid rgba(0,122,255,0.4)" : "1px solid rgba(128,128,128,0.4)",
                            borderRadius: "4px",
                            color: feat.restart ? "#1a73e8" : "#999"
                          },
                          children: "重启"
                        }),
                        rx.jsx("button", {
                          onClick: function (e) { e.stopPropagation(); onActionClick("close", k, alive[0].port); },
                          disabled: !feat.close,
                          style: {
                            padding: "2px 10px", fontSize: "12px", cursor: feat.close ? "pointer" : "not-allowed", fontFamily: "inherit",
                            background: feat.close ? "rgba(255,0,0,0.08)" : "rgba(128,128,128,0.12)",
                            border: feat.close ? "1px solid rgba(255,0,0,0.4)" : "1px solid rgba(128,128,128,0.4)",
                            borderRadius: "4px",
                            color: feat.close ? "#d93025" : "#999"
                          },
                          children: "关闭"
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
      // 向 DSH系统包（设置侧边栏）的「系统信息」页槽位注入：内页选中 system-info 页时
      // 通过 renderSlot("dsh-system-package.system-info") 渲染本组件（/sysinfo 内容）。
      ctx.slots.inject("dsh-system-package.system-info", function () {
        return ctx.slots.register({ name: "dsh-system-package.system-info", id: "sysinfo", label: "系统信息" }, SystemInfoTab);
      });
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
