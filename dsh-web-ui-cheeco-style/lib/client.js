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

		/** Official brand primitives (fish logo + wordmark). Best-effort require so a
		 *  missing module never breaks the plugin: we fall back to plain text/circle. */
		let _primitives = null;
		try {
			_primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		} catch (e) {
			_primitives = null;
		}

		// Inject card styles (idempotent) so the settings cards look consistent across themes.
		(function () {
			if (typeof document === "undefined" || document.querySelector('style[data-plugin="dsh-web-ui-cheeco-style"]')) return;
			var css = ".dsh-web-ui-cheeco-style{display:flex;flex-direction:column;gap:16px;}"
				+ ".dsh-web-ui-cheeco-style-section{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:12px;padding:16px 18px;box-shadow:0 1px 2px rgba(0,0,0,.04);}"
				+ ".dsh-web-ui-cheeco-style-section h3{margin:0 0 10px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#1a1a1a);}"
				+ ".dsh-web-ui-cheeco-style-state{margin:0 0 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#666);}"
				+ ".dsh-web-ui-cheeco-style-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:4px;}"
				+ ".dsh-web-ui-cheeco-style-action{box-sizing:border-box;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);font-family:inherit;font-size:13px;line-height:20px;border-radius:8px;padding:6px 14px;transition:background .15s,border-color .15s,box-shadow .15s;}"
				+ ".dsh-web-ui-cheeco-style-action:hover{background:var(--dsw-alias-interactive-bg-hover,#f5f5f5);border-color:var(--dsw-alias-state-business-primary,#3498db);}"
				+ ".dsh-web-ui-cheeco-style-action:active{background:var(--dsw-alias-interactive-bg-active,#ececec);}"
				+ ".dsh-web-ui-cheeco-style-actions input{box-sizing:border-box;flex:1;min-width:180px;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);border-radius:8px;padding:6px 12px;font-family:inherit;font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary,#1a1a1a);background:var(--dsw-alias-bg-base,#fff);outline:none;}"
				+ ".dsh-web-ui-cheeco-style-actions input:focus{border-color:var(--dsw-alias-state-business-primary,#3498db);box-shadow:0 0 0 2px rgba(52,152,219,.15);}"
				+ ".dsh-web-ui-cheeco-style-brand-title{font-weight:600;letter-spacing:.04em;white-space:nowrap;}"
				+ ".dsh-web-ui-cheeco-style-brand-logo{display:block;}"
				+ ".dsh-web-ui-cheeco-style-brand-fallback{display:inline-block;border-radius:50%;background:var(--dsw-alias-bg-module-platform,#eee);}"
				+ ".dsh-web-ui-cheeco-style-brand-preview{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:10px;}"
				+ ".dsh-web-ui-cheeco-style-preview-img{height:28px;width:28px;object-fit:contain;border-radius:6px;background:var(--dsw-alias-bg-module-platform,#f0f0f0);flex:none;}";
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-web-ui-cheeco-style";
			tag.textContent = css;
			document.head.appendChild(tag);
		})();

		/** Dictionary namespace owned by this plugin. */
		const NS = "dsh-web-ui-cheeco-style";
		const zh = {
			"nav": "Cheeco的小功能"
		};

		/** Shared on/off + sound-file keys (read by @cheeco/dsh-client-ui-message-sound). */
		const SOUND_KEY = "dsh-msg-sound-enabled";
		const SOUND_SRC_KEY = "dsh-msg-sound-src";
		const RENAME_KEY = "dsh-web-ui-cheeco-style:label";
		/** Brand customization: the top-left name + logo, plus a window event so the
		 *  brand row re-renders live when the user saves/resets in settings. */
		const BRAND_TITLE_KEY = "dsh-web-ui-cheeco-style:brand-title";
		const BRAND_LOGO_KEY = "dsh-web-ui-cheeco-style:brand-logo";
		const BRAND_LOGO_URL_KEY = "dsh-web-ui-cheeco-style:brand-logo-url";
		const BRAND_LOGO_DATA_KEY = "dsh-web-ui-cheeco-style:brand-logo-data";
		const BRAND_EVENT = "cheeco-brand-change";
		const DEFAULT_BRAND_TITLE = "DeepSeek Harness";
		/** Pre-filled logo URL for this instance (change or clear in the card; leave empty for the official brand). */
		const DEFAULT_LOGO_URL = "https://yc1971.com/ico.png";
		/** Bump this in sync with package.json version so the UI reflects the build. */
		const PLUGIN_VERSION = "0.3.0";

		/** localStorage helpers (best-effort; never throw). */
		function readKey(k) { try { return localStorage.getItem(k) || ""; } catch (e) { return ""; } }
		function writeKey(k, v) { try { if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (e) {} }
		function brandChanged() { try { window.dispatchEvent(new Event(BRAND_EVENT)); } catch (e) {} }
		function brandTitle() { return readKey(BRAND_TITLE_KEY).trim(); }
		/** Clean logo URL (never a base64 blob). */
		function brandLogoUrl() {
			const raw = (readKey(BRAND_LOGO_URL_KEY) || readKey(BRAND_LOGO_KEY)).trim();
			return raw.startsWith("data:") ? "" : raw;
		}
		/** Base64 logo from a picked local file — kept out of the URL field, shown as a preview. */
		function brandLogoData() {
			const raw = (readKey(BRAND_LOGO_DATA_KEY) || readKey(BRAND_LOGO_KEY)).trim();
			return raw.startsWith("data:") ? raw : "";
		}
		function brandLogo() { return brandLogoData() || brandLogoUrl(); }
		function soundEnabled() { try { return localStorage.getItem(SOUND_KEY) !== "0"; } catch (e) { return true; } }
		function soundName() { try { return localStorage.getItem(SOUND_SRC_KEY) ? "已选" : "默认提示音(叮咚)"; } catch (e) { return "默认提示音(叮咚)"; } }

		/** Re-render hook: bumps state on brand change so occupants update instantly. */
		function useBrandRefresh() {
			const [, setTick] = react.useState(0);
			react.useEffect(() => {
				const on = () => setTick(function (t) { return t + 1; });
				window.addEventListener(BRAND_EVENT, on);
				return () => window.removeEventListener(BRAND_EVENT, on);
			}, []);
		}

		/** The top-left brand-name cell: custom title, else the official wordmark. */
		function BrandName() {
			useBrandRefresh();
			const title = brandTitle();
			if (title !== "") {
				return react_jsx_runtime.jsx("span", {
					className: "dsh-web-ui-cheeco-style-brand-title",
					children: title
				});
			}
			if (_primitives && _primitives.BrandWordmark) {
				return react_jsx_runtime.jsx(_primitives.BrandWordmark, { includeMark: false });
			}
			return react_jsx_runtime.jsx("span", {
				className: "dsh-web-ui-cheeco-style-brand-title",
				children: DEFAULT_BRAND_TITLE
			});
		}

		/** The top-left brand-mark cell: custom logo image, else the official fish logo. */
		function BrandMark({ size }) {
			useBrandRefresh();
			const s = size || 24;
			const logo = brandLogo();
			if (logo !== "") {
				return react_jsx_runtime.jsx("img", {
					src: logo,
					alt: "",
					className: "dsh-web-ui-cheeco-style-brand-logo",
					style: { height: s, width: s, objectFit: "contain" }
				});
			}
			if (_primitives && _primitives.FishLogo) {
				return react_jsx_runtime.jsx(_primitives.FishLogo, { size: s });
			}
			return react_jsx_runtime.jsx("span", {
				className: "dsh-web-ui-cheeco-style-brand-fallback",
				style: { width: s, height: s }
			});
		}

		/** "声音提示音" card: on/off toggle + pick a custom sound file. */
		function SoundCard() {
			const [on, setOn] = react.useState(soundEnabled);
			const [sound, setSound] = react.useState(soundName);
			const fileRef = react.useRef(null);
			const toggle = () => { const next = !on; try { localStorage.setItem(SOUND_KEY, next ? "1" : "0"); } catch (e) {} setOn(next); };
			const choose = () => { if (fileRef.current) fileRef.current.click(); };
			const onFile = (e) => {
				const f = e.target.files && e.target.files[0];
				if (!f) return;
				const r = new FileReader();
				r.onload = () => { try { localStorage.setItem(SOUND_SRC_KEY, String(r.result)); } catch (err) {} setSound(f.name); };
				r.readAsDataURL(f);
				e.target.value = "";
			};
			const reset = () => { try { localStorage.removeItem(SOUND_SRC_KEY); } catch (e) {} setSound("默认提示音(叮咚)"); };
			const preview = () => {
				if (!on) { alert("声音已关闭，请先开启声音"); return; }
				try {
					const src = localStorage.getItem(SOUND_SRC_KEY);
					if (src) { const a = new Audio(src); a.volume = 0.6; a.play(); return; }
				} catch (e) {}
				try {
					const Ctx = window.AudioContext || window.webkitAudioContext;
					if (!Ctx) return;
					const ctx = new Ctx();
					if (ctx.state === "suspended" && ctx.resume) ctx.resume();
					const tone = (freq, off, dur) => {
						const osc = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + off;
						osc.type = "sine"; osc.frequency.setValueAtTime(freq, t0);
						g.gain.setValueAtTime(0.0001, t0);
						g.gain.exponentialRampToValueAtTime(0.6, t0 + 0.02);
						g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
						osc.connect(g); g.connect(ctx.destination);
						osc.start(t0); osc.stop(t0 + dur + 0.05);
					};
					tone(880, 0, 0.18); tone(1318.5, 0.12, 0.30);
					setTimeout(function () { try { ctx.close(); } catch (e) {} }, 700);
				} catch (e) {}
			};
			return react_jsx_runtime.jsx("div", {
				className: "dsh-web-ui-cheeco-style-section",
				children: [
					react_jsx_runtime.jsx("h3", { children: "声音提示音" }),
					react_jsx_runtime.jsx("p", {
						className: "dsh-web-ui-cheeco-style-state",
						children: on ? "已开启：AI 回复结束时播放提示音。" : "已关闭：AI 回复时不再播放提示音。"
					}),
					react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: "当前声音：" + sound }),
					react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-actions", children: [
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: toggle, children: on ? "关闭声音" : "开启声音" }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: choose, children: "选择声音文件" }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: preview, children: "试听" }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: reset, children: "恢复默认" })
					] }),
					react_jsx_runtime.jsx("input", { type: "file", accept: "audio/*", ref: fileRef, style: { display: "none" }, onChange: onFile })
				]
			});
		}

		/** "界面标题 / Logo" card: change the top-left name + logo, or keep the official brand.
		 *  The logo can be a clean URL (https://...) OR a locally picked image. A local file
		 *  is stored as a base64 data URI in a hidden localStorage key and only shown as a
		 *  preview thumbnail — the visible address field never fills with base64 code. */
		function BrandCard() {
			const [title, setTitle] = react.useState(brandTitle);
			const [url, setUrl] = react.useState(() => brandLogoUrl() || DEFAULT_LOGO_URL);
			const [data, setData] = react.useState(brandLogoData);
			const fileRef = react.useRef(null);
			const preview = data || url;
			const save = () => {
				writeKey(BRAND_TITLE_KEY, title.trim());
				writeKey(BRAND_LOGO_URL_KEY, url.trim());
				writeKey(BRAND_LOGO_DATA_KEY, data);
				writeKey(BRAND_LOGO_KEY, "");
				brandChanged();
				alert("已保存界面标题/Logo：左侧顶部即时生效。");
			};
			const reset = () => {
				setTitle(""); setUrl(""); setData("");
				writeKey(BRAND_TITLE_KEY, ""); writeKey(BRAND_LOGO_URL_KEY, ""); writeKey(BRAND_LOGO_DATA_KEY, ""); writeKey(BRAND_LOGO_KEY, "");
				brandChanged();
			};
			const pick = () => { if (fileRef.current) fileRef.current.click(); };
			const clearLocal = () => { setData(""); };
			const onFile = (e) => {
				const f = e.target.files && e.target.files[0];
				if (!f) return;
				const r = new FileReader();
				r.onload = () => { setData(String(r.result)); };
				r.readAsDataURL(f);
				e.target.value = "";
			};
			const children = [
				react_jsx_runtime.jsx("h3", { children: "界面标题 / Logo" }),
				react_jsx_runtime.jsx("p", {
					className: "dsh-web-ui-cheeco-style-state",
					children: "修改左侧顶部的名称与 logo；留空则显示官方默认品牌。"
				}),
				react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-actions", children: [
					react_jsx_runtime.jsx("input", { type: "text", value: title, placeholder: "页面标题（替代官方名称）", onChange: (e) => setTitle(e.target.value) }),
					react_jsx_runtime.jsx("input", { type: "text", value: url, placeholder: "Logo 图片网址（https://…）", onChange: (e) => setUrl(e.target.value), style: { flex: "2", minWidth: "220px" } }),
					react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: pick, children: "选择本地图片" }),
					react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: save, children: "保存" }),
					react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: reset, children: "恢复默认" })
				] })
			];
			if (preview !== "") {
				children.push(react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-brand-preview", children: [
					react_jsx_runtime.jsx("img", { src: preview, alt: "logo 预览", className: "dsh-web-ui-cheeco-style-preview-img" }),
					react_jsx_runtime.jsx("span", {
						className: "dsh-web-ui-cheeco-style-state",
						children: data !== "" ? "当前：本地图片（base64 存于 localStorage；可点「清除本地图片」）" : "当前：图片网址"
					}),
					data !== "" && react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: clearLocal, children: "清除本地图片" })
				] }));
			}
			children.push(react_jsx_runtime.jsx("input", { type: "file", accept: "image/*", ref: fileRef, style: { display: "none" }, onChange: onFile }));
			return react_jsx_runtime.jsx("div", {
				className: "dsh-web-ui-cheeco-style-section",
				children: children
			});
		}

		/** "面板改名" card: user renames the sidebar entry for this settings panel. */
		function RenameCard() {
			const [name, setName] = react.useState(() => { try { return localStorage.getItem(RENAME_KEY) || ""; } catch (e) { return ""; } });
			const save = () => {
				const next = name.trim();
				try { localStorage.setItem(RENAME_KEY, next); } catch (e) {}
				alert("已保存「" + (next || "Cheeco的小功能") + "」；重启后生效");
			};
			return react_jsx_runtime.jsx("div", {
				className: "dsh-web-ui-cheeco-style-section",
				children: [
					react_jsx_runtime.jsx("h3", { children: "面板改名" }),
					react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: "给这个设置页在侧边栏的名字改名。" }),
					react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-actions", children: [
						react_jsx_runtime.jsx("input", { type: "text", value: name, placeholder: "输入面板名称", onChange: (e) => setName(e.target.value), style: { flex: "1", minWidth: "160px", padding: "6px 10px" } }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: save, children: "保存" })
					] }),
					react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: "插件版本 " + PLUGIN_VERSION })
				]
			});
		}

		/** The section renders the sound + brand + rename cards. */
		function Section() {
			return react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style", children: [
				react_jsx_runtime.jsx(SoundCard, {}),
				react_jsx_runtime.jsx(BrandCard, {}),
				react_jsx_runtime.jsx(RenameCard, {})
			] });
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
				order: -1,
				label: () => { try { return localStorage.getItem(RENAME_KEY) || t("nav"); } catch (e) { return t("nav"); } },
				locale: NS
			}, Section));
			// Own the top-left brand row so the user can swap the title/logo from settings.
			// The shipped brand-official plugin occupies these single slots at priority 0;
			// registering at a LOWER priority makes this the winning occupant (lowest renders),
			// and the components fall back to the official brand when nothing is configured.
			ctx.slots.inject("sidebar.brand.name", () => ctx.slots.register({
				name: "sidebar.brand.name",
				priority: -1
			}, BrandName));
			ctx.slots.inject("sidebar.brand.mark", () => ctx.slots.register({
				name: "sidebar.brand.mark",
				priority: -1
			}, BrandMark));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
