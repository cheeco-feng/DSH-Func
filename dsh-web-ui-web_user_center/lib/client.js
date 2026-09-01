/**
 * @cheeco/dsh-web-ui-web_user_center client half（浏览器侧）
 *
 * 用户中心页的展示由 panel-config 驱动：此插件在 package.json 的
 * `dsh.cheecoPanel.addPage` 声明一个「用户中心」页面 + 其 blocks，
 * host 的 syncPanelConfig 重建 panel-config.json 后，cheeco 内页
 * fetch 该配置并 for 循环渲染 pages/blocks。
 * 因此这里不再需要往任何系统槽位注入 tab，仅保留可加载的空客户端。
 */
window.__ModuleLoader__.load({
  id: "@cheeco/dsh-web-ui-web_user_center",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    function apply(ctx) {}

    exports.apply = apply;
    exports.inject = [];
    return module.exports;
  }
});
