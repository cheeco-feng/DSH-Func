window.__ModuleLoader__.load({
	id: "@cheeco/dsh-web-ui-cheeco-style",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let slots = require("@deepseek-ai/dsh-client-ui-slots");
		let locale = require("@deepseek-ai/dsh-client-locale");

		/** Dictionary namespace owned by this plugin. */
		const NS = "dsh-web-ui-cheeco-style";
		const zh = {
			"nav": "Cheeco的小功能"
		};

		/** Shared on/off key for the message sound (read by @deepseek-ai/dsh-client-ui-message-sound). */
		const SOUND_KEY = "dsh-msg-sound-enabled";
		function soundEnabled() { try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; } }

		/** "声音提示音" card: toggles the AI-reply notification sound. */
		function SoundCard() {
			const [on, setOn] = react.useState(soundEnabled);
			const toggle = () => {
				const next = !on;
				try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch (e) {}
				setOn(next);
			};
			return react_jsx_runtime.jsx("div", {
				className: "dsh-web-ui-cheeco-style-section",
				children: [
					react_jsx_runtime.jsx("h3", { children: "声音提示音" }),
					react_jsx_runtime.jsx("p", {
						className: "dsh-web-ui-cheeco-style-state",
						children: on ? "已开启：AI 回复结束时播放提示音。" : "已关闭：AI 回复时不再播放提示音。"
					}),
					react_jsx_runtime.jsx("button", {
						type: "button",
						className: "dsh-web-ui-cheeco-style-action",
						onClick: toggle,
						children: on ? "关闭声音" : "开启声音"
					})
				]
			});
		}

		/** Required services (cordis fiber inject): the slot system and locale. */
		const inject = ["slots", "locale"];

		/** Register the section into the Settings panel's settings.section slot. */
		function apply(ctx) {
			const t = ctx.locale.bind(NS);
			ctx.effect(() => ctx.locale.register(NS, { zh, en: zh }), "dsh-web-ui-cheeco-style: dictionaries");
			ctx.slots.inject("settings.section", () => ctx.slots.register({
				name: "settings.section",
				id: "cheeco-style",
				order: 100,
				label: () => t("nav"),
				locale: NS
			}, SoundCard));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
