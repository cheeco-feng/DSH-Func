/** @cheeco/dsh-web-setting-BrandPanel host half — 最小 Cordis 插件（class 形状）。
 *  本插件只在浏览器侧提供「主面板修改」（界面标题/Logo）设置页，经子 slot
 *  dsh-system-package.brand-panel 注入到 DSH系统包内页。配置读写 cheeco-style 提供的
 *  /cheeco-style/config（brandTitle/brandLogoUrl）与 /cheeco-style/assets，因此无需宿主路由。 */
export default class DshWebSettingBrandPanel {
	static name = "web-ui-setting-brand-panel";
	static inject = [];

	constructor(ctx, config) {
		ctx.effect(() => () => {}, "dsh-web-setting-brand-panel: noop");
	}
}
