/**
 * @cheeco/dsh-web-ui-web_user_center client half（浏览器侧）
 *
 * 注册「用户中心」tab 到 dsh-web-ui-cheeco-style 的 cheeco-style.tab 槽位；内容为占位页。
 */
window.__ModuleLoader__.load({
  id: "@cheeco/dsh-web-ui-web_user_center",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    let react = require("react");
    let rx = require("react/jsx-runtime");

    function UserCenterTab() {
      return rx.jsx("div", {
        className: "dsh-web-ui-cheeco-style-section",
        children: rx.jsx("p", { style: { padding: "16px 0", color: "#666", fontSize: "14px" }, children: "当前页面 正在维护中" })
      });
    }

    function apply(ctx) {
      ctx.slots.inject("cheeco-style.tab", function () {
        return ctx.slots.register({ name: "cheeco-style.tab", id: "web-user-center", order: 300, label: "用户中心" }, UserCenterTab);
      });
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
