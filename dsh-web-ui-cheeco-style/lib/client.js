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
				+ ".dsh-web-ui-cheeco-style-preview-img{height:28px;width:28px;object-fit:contain;border-radius:6px;background:var(--dsw-alias-bg-module-platform,#f0f0f0);flex:none;}"
				+ ".dsw-switch{appearance:none;-webkit-appearance:none;width:40px;height:22px;border-radius:11px;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:var(--dsw-alias-bg-layer-3,#d3d3d3);position:relative;cursor:pointer;transition:background .15s,border-color .15s;flex:none;margin:0;vertical-align:middle;}"
				+ ".dsw-switch::before{content:'';position:absolute;top:2px;left:2px;width:16px;height:16px;border-radius:50%;background:#fff;transition:left .15s;box-shadow:0 1px 2px rgba(0,0,0,.25);}"
				+ ".dsw-switch:checked{background:var(--dsw-alias-state-business-primary,#3498db);border-color:var(--dsw-alias-state-business-primary,#3498db);}"
				+ ".dsw-switch:checked::before{left:20px;}"
				+ ".dsw-switch:focus-visible{outline:2px solid var(--dsw-alias-state-business-primary,#3498db);outline-offset:2px;}";
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

		/** Broadcast events: brand row re-render (this plugin) and a fuller
		 *  "config changed" signal the sibling message-sound plugin listens for. */
		const BRAND_EVENT = "cheeco-brand-change";
		const CONFIG_CHANGE_EVENT = "cheeco-config-change";
		const DEFAULT_BRAND_TITLE = "DeepSeek Harness";
		/** Pre-filled logo URL for this instance (change or clear in the card; leave empty for the official brand). */
		const DEFAULT_LOGO_URL = "https://yc1971.com/ico.png";
		/** Bump this in sync with package.json version so the UI reflects the build. */
		const PLUGIN_VERSION = "0.8.17";

		/** Host endpoints (same-origin, served by our own webServer):
		 *    GET/POST /cheeco-style/config  -> read/write the config file
		 *    POST     /cheeco-style/assets?name=<file> -> upload a picked image/audio to assets/
		 *    GET      /cheeco-style/assets/<file>      -> serve it back (for <img>/<audio>)
		 *    GET      /cheeco-style/plugin/update-check -> compare installed vs GitHub latest
		 *    POST     /cheeco-style/plugin/uninstall { plugins:[...] } -> dsh plugin remove
		 *  The title/logo/label/sound no longer live in localStorage. */
		const CONFIG_ENDPOINT = "/cheeco-style/config";
		const ASSETS_ENDPOINT = "/cheeco-style/assets";

		/** In-memory cache of the file-backed config (the browser's source of truth).
		 *  Loaded once via GET, persisted via POST. */
		let config = {
			brandTitle: "", brandLogoUrl: "", brandLogoData: "", label: "",
			soundEnabled: true, soundSrc: "", soundName: "",
			dsh: {}, features: { sessionSearch: true, dshCommand: true }
		};
		let configLoad = null;
		/** Fetch the host config once (shared promise); later calls reuse the result. */
		function loadConfig() {
			if (configLoad) return configLoad;
			configLoad = (async () => {
				try {
					const res = await fetch(CONFIG_ENDPOINT, { cache: "no-store" });
					if (res.ok) {
						const data = (await res.json()) || {};
						config = {
							brandTitle: typeof data.brandTitle === "string" ? data.brandTitle : "",
							brandLogoUrl: typeof data.brandLogoUrl === "string" ? data.brandLogoUrl : "",
							brandLogoData: typeof data.brandLogoData === "string" ? data.brandLogoData : "",
							label: typeof data.label === "string" ? data.label : "",
							soundEnabled: data.soundEnabled !== false,
							soundSrc: typeof data.soundSrc === "string" ? data.soundSrc : "",
							soundName: typeof data.soundName === "string" ? data.soundName : "",
							dsh: (typeof data.dsh === "object" && data.dsh) ? data.dsh : {},
							features: (typeof data.features === "object" && data.features) ? data.features : { sessionSearch: true, dshCommand: true }
						};
					}
				} catch (e) {}
				brandChanged();
			})();
			return configLoad;
		}
		/** Merge `patch` into the in-memory config and POST the whole object to the host,
		 *  which writes it to config/cheeco-config.json. */
		async function saveConfig(patch = {}) {
			config = { ...config, ...patch };
			try {
				await fetch(CONFIG_ENDPOINT, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify(config)
				});
			} catch (e) {}
			brandChanged();
			configChanged();
		}
		/** Dispatch a "config changed" signal so the sibling message-sound plugin re-reads it. */
		function configChanged() { try { window.dispatchEvent(new Event(CONFIG_CHANGE_EVENT)); } catch (e) {} }
		/** True when a logo URL points at a locally-uploaded asset (not a remote https URL). */
		function isLocalAsset(url) { return (url || "").trim().startsWith(ASSETS_ENDPOINT + "/"); }

		function brandChanged() { try { window.dispatchEvent(new Event(BRAND_EVENT)); } catch (e) {} }
		function brandTitle() { return (config.brandTitle || "").trim(); }
		/** Clean logo URL (never a base64 blob). */
		function brandLogoUrl() {
			const raw = (config.brandLogoUrl || "").trim();
			return raw.startsWith("data:") ? "" : raw;
		}
		/** Base64 logo from a picked local file — kept out of the URL field, shown as a preview. */
		function brandLogoData() {
			const raw = (config.brandLogoData || config.brandLogoUrl || "").trim();
			return raw.startsWith("data:") ? raw : "";
		}
		function brandLogo() { return brandLogoData() || brandLogoUrl(); }
		/** Upload a picked local file (image or audio) to the plugin's assets/ dir and
		 *  return its served URL; "" on failure. Nothing base64 stays in the browser. */
		async function uploadAsset(file) {
			try {
				const res = await fetch(ASSETS_ENDPOINT + "?name=" + encodeURIComponent(file.name), {
					method: "POST",
					headers: { "content-type": file.type || "application/octet-stream" },
					body: file
				});
				const data = (await res.json()) || {};
				return data.ok && data.url ? data.url : "";
			} catch (e) { return ""; }
		}

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

		/** "声音提示音" card: on/off toggle + pick a custom sound file.
		 *  The picked file is uploaded to the plugin's assets/ dir and only its URL is
		 *  recorded in the config — nothing base64 lives in the browser anymore. */
		function SoundCard() {
			const [on, setOn] = react.useState(() => config.soundEnabled !== false);
			const [sound, setSound] = react.useState(() => config.soundName || "默认提示音(叮咚)");
			const fileRef = react.useRef(null);
			react.useEffect(() => {
				let cancelled = false;
				(async () => {
					await loadConfig();
					if (cancelled) return;
					setOn(config.soundEnabled !== false);
					setSound(config.soundName || "默认提示音(叮咚)");
				})();
				return () => { cancelled = true; };
			}, []);
			const toggle = async () => {
				const next = !on;
				setOn(next);
				await saveConfig({ soundEnabled: next });
			};
			const choose = () => { if (fileRef.current) fileRef.current.click(); };
			const onFile = async (e) => {
				const f = e.target.files && e.target.files[0];
				if (!f) return;
				const url = await uploadAsset(f);
				if (url) {
					setSound(f.name);
					await saveConfig({ soundSrc: url, soundName: f.name });
				}
				e.target.value = "";
			};
			const reset = async () => {
				setSound("默认提示音(叮咚)");
				await saveConfig({ soundSrc: "", soundName: "" });
			};
			const preview = () => {
				if (!on) { alert("声音已关闭，请先开启声音"); return; }
				if (config.soundSrc) {
					try {
						const a = new Audio(config.soundSrc);
						a.volume = 0.6;
						const p = a.play();
						if (p && p.catch) p.catch(() => {});
						return;
					} catch (e) {}
				}
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
		 *  is uploaded to the plugin's assets/ dir and stored as an asset URL — the field and
		 *  config never carry base64. */
		function BrandCard() {
			const [title, setTitle] = react.useState(brandTitle);
			const [url, setUrl] = react.useState(() => brandLogoUrl() || DEFAULT_LOGO_URL);
			const fileRef = react.useRef(null);
			const preview = url;
			const isLocal = isLocalAsset(url);
			// Load the file-backed config from the host once, then sync local state.
			react.useEffect(() => {
				let cancelled = false;
				(async () => {
					await loadConfig();
					if (cancelled) return;
					setTitle(config.brandTitle || "");
					setUrl(config.brandLogoUrl || DEFAULT_LOGO_URL);
				})();
				return () => { cancelled = true; };
			}, []);
			const save = async () => {
				await saveConfig({
					brandTitle: title.trim(),
					brandLogoUrl: url.trim(),
					brandLogoData: ""
				});
				alert("已保存界面标题/Logo：左侧顶部即时生效。");
			};
			const reset = async () => {
				setTitle(""); setUrl("");
				await saveConfig({ brandTitle: "", brandLogoUrl: "", brandLogoData: "" });
			};
			const pick = () => { if (fileRef.current) fileRef.current.click(); };
			const clearLocal = () => { setUrl(""); };
			const onFile = async (e) => {
				const f = e.target.files && e.target.files[0];
				if (!f) return;
				const assetUrl = await uploadAsset(f);
				if (assetUrl) setUrl(assetUrl);
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
						children: isLocal ? "当前：本地图片（已上传到资源目录 assets/）" : "当前：图片网址"
					}),
					isLocal && react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: clearLocal, children: "清除本地图片" })
				] }));
			}
			children.push(react_jsx_runtime.jsx("input", { type: "file", accept: "image/*", ref: fileRef, style: { display: "none" }, onChange: onFile }));
			return react_jsx_runtime.jsx("div", {
				className: "dsh-web-ui-cheeco-style-section",
				children: children
			});
		}

		/** "功能管理" tab：仅功能开关（会话搜索 / DSH功能命令）。
		 *  检查更新 / 卸载 已并入「功能推荐」每行。 */
		function PluginActions() {
			const [features, setFeatures] = react.useState(() => ({ sessionSearch: true, dshCommand: true }));
			react.useEffect(() => {
				let cancelled = false;
				(async () => { await loadConfig(); if (!cancelled) setFeatures({ ...config.features }); })();
				return () => { cancelled = true; };
			}, []);
			const toggleFeature = async (key, val) => {
				const next = { ...features, [key]: val };
				setFeatures(next);
				await saveConfig({ features: next });
			};
			return react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-section", children: [
				react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: "功能开关（切换后重启生效）" }),
				react_jsx_runtime.jsx("label", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }, children: [
					react_jsx_runtime.jsx("span", { children: "会话搜索功能（隐藏/显示）" }),
					react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsw-switch", checked: features.sessionSearch, onChange: (e) => toggleFeature("sessionSearch", e.target.checked) })
				] }),
				react_jsx_runtime.jsx("label", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 0" }, children: [
					react_jsx_runtime.jsx("span", { children: "DSH功能命令（停用/开启）" }),
					react_jsx_runtime.jsx("input", { type: "checkbox", className: "dsw-switch", checked: features.dshCommand, onChange: (e) => toggleFeature("dshCommand", e.target.checked) })
				] })
			] });
		}

		/** "面板改名" card: user renames the sidebar entry for this settings panel. */
		function RenameCard() {
			const [name, setName] = react.useState(() => config.label || "");
			react.useEffect(() => {
				let cancelled = false;
				(async () => {
					await loadConfig();
					if (cancelled) return;
					setName(config.label || "");
				})();
				return () => { cancelled = true; };
			}, []);
			const save = async () => {
				const next = name.trim();
				await saveConfig({ label: next });
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
					] })
				]
			});
		}

		/** 底部 footer：显示「cheeco的小功能 | 插件版本 x.y.z | 当前 Profile：xxx」。
		 *  profile 由 plugin-manager 在 /pmgr/list 加载成功后写入 window.__dshCheecoProfile 并派发
		 *  'dsh-cheeco-profile' 事件，这里订阅以刷新；plugin-manager 未安装/未加载时仅显示版本。 */
		function SectionFooter() {
			const getProfile = () => (typeof window !== "undefined" && window.__dshCheecoProfile) || "";
			const [profile, setProfile] = react.useState(getProfile);
			react.useEffect(() => {
				if (typeof window === "undefined") return;
				const upd = () => setProfile(getProfile());
				window.addEventListener("dsh-cheeco-profile", upd);
				return () => window.removeEventListener("dsh-cheeco-profile", upd);
			}, []);
			return react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: "cheeco的小功能 | 插件版本 " + PLUGIN_VERSION + (profile ? " | 当前 Profile：" + profile : "") });
		}

		/** 通用卡片：panel-config.json 里 `blocks[]` 的一条。type=text 显示一段说明文本。 */
		function PanelBlock({ block }) {
			const text = (block && block.text) || "";
			return react_jsx_runtime.jsx("div", {
				className: "dsh-web-ui-cheeco-style-section",
				children: react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: text })
			});
		}
		/** Pages are driven by /cheeco-style/panel-config (the single source of truth, rebuilt by
		 *  host syncPanelConfig from each plugin's dsh.cheecoPanel declaration). Built-in pages
		 *  ("cheeco-internal") render their built-in card components by id; plugin pages render
		 *  their `blocks`. No more hard-coded tab buttons / cheeco-style.tab slot / window.__slots.
		 *  The features / plugin-manager sub-slots are kept so those pages still inject content. */
		function Section({ renderSlot }) {
			const [tab, setTab] = react.useState("panel");
			const [panel, setPanel] = react.useState({ pages: [] });
			react.useEffect(() => {
				let cancelled = false;
				(async () => {
					try {
						const res = await fetch("/cheeco-style/panel-config", { cache: "no-store" });
						if (res.ok) {
							const data = (await res.json()) || {};
							if (!cancelled) setPanel({ pages: Array.isArray(data.pages) ? data.pages : [] });
						}
					} catch (e) {}
				})();
				return () => { cancelled = true; };
			}, []);
			const pages = panel.pages;
			const current = pages.find((p) => p.id === tab) || null;
			const tabBtn = (key, label) => react_jsx_runtime.jsx("button", {
				type: "button",
				onClick: (e) => {
					setTab(key);
					// 当前 tab 居中聚焦（横向滚动容器下滚动到中间）。
					const el = e && e.currentTarget;
					if (el) requestAnimationFrame(() => {
						try { el.scrollIntoView({ inline: "center", behavior: "smooth", block: "nearest" }); } catch (err) { /* ignore */ }
					});
				},
				style: {
					padding: "6px 14px",
					background: "transparent",
					border: "none",
					cursor: "pointer",
					color: "inherit",
					font: "inherit",
					fontWeight: tab === key ? 600 : 400,
					borderBottom: tab === key ? "2px solid #4a90d9" : "2px solid transparent",
					opacity: tab === key ? 1 : 0.6,
					flex: "0 0 auto"   // 横向滚动：不收缩
				},
				children: label
			});
			const footer = react_jsx_runtime.jsx("div", { style: { marginTop: "30px", borderTop: "1px solid rgba(128,128,128,0.45)", paddingTop: "12px", textAlign: "center" }, children: [
				react_jsx_runtime.jsx(SectionFooter, {})
			] });
			let content = null;
			if (current) {
				if (current.page === "cheeco-internal") {
					// 内置页：按 id 用本插件现有组件渲染。
					if (current.id === "panel") {
						content = react_jsx_runtime.jsx("div", { children: [
							react_jsx_runtime.jsx(SoundCard, {}),
							react_jsx_runtime.jsx(BrandCard, {}),
							react_jsx_runtime.jsx(RenameCard, {})
						] });
					} else if (current.id === "manage") {
						content = react_jsx_runtime.jsx("div", { children: [
							react_jsx_runtime.jsx(PluginActions, {})
						] });
					} else if (current.id === "features") {
						const out = renderSlot ? renderSlot("cheeco-style.features", {}) : null;
						// 判空：slot 返回的可能是 null/undefined/空数组，或一个包裹后仍无内容的 React 节点。
						// 用 React.Children.toArray 剥掉容器，取实际可渲染子节点数量，否则 empty 会漏判成"非空"。
						const renderedChildren = (out === null || out === void 0) ? [] : react.Children.toArray(out);
						const empty = renderedChildren.length === 0;
						content = react_jsx_runtime.jsx("div", { children: [
							empty ? react_jsx_runtime.jsx("p", { style: { padding: "12px 0", color: "var(--dsw-alias-label-tertiary,#999)" }, children: "该插件未处于安装状态" }) : out
						] });
					} else if (current.id === "pluginmanager") {
						const out = renderSlot ? renderSlot("cheeco-style.plugin-manager", {}) : null;
						const renderedChildren = (out === null || out === void 0) ? [] : react.Children.toArray(out);
						const empty = renderedChildren.length === 0;
						content = react_jsx_runtime.jsx("div", { children: [
							empty ? react_jsx_runtime.jsx("p", { style: { padding: "12px 0", color: "var(--dsw-alias-label-tertiary,#999)" }, children: "该插件未处于安装状态" }) : out
						] });
					}
				} else {
					// 插件页：先渲染插件注入的自有组件页（cheeco-style.page.<pageId>）作主体，
					// 再把本页的 blocks（额外强加的卡片）追加在后面。
					// 判空用 react.Children.toArray：即使 page slot 已声明但无 occupant、renderSlot
					// 返回"非空的空容器"，也会被剥成空 → 不渲染，避免盖住 blocks 导致空白。
					let pageSlot = null;
					try { pageSlot = renderSlot ? renderSlot("cheeco-style.page." + current.id, {}) : null; }
					catch (e) { pageSlot = null; }
					const pageChildren = (pageSlot === null || pageSlot === void 0) ? [] : react.Children.toArray(pageSlot);
					const blk = Array.isArray(current.blocks) ? current.blocks : [];
					const children = [];
					if (pageChildren.length > 0) children.push(pageSlot);
					for (const b of blk) children.push(react_jsx_runtime.jsx(PanelBlock, { block: b }));
					content = react_jsx_runtime.jsx("div", { children: children });
				}
			}
			return react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style", children: [
				react_jsx_runtime.jsx("div", { style: { display: "flex", gap: "8px", borderBottom: "1px solid rgba(128,128,128,0.3)", marginBottom: "14px", overflowX: "auto", whiteSpace: "nowrap", WebkitOverflowScrolling: "touch", scrollbarWidth: "thin" }, children: pages.map((p) => tabBtn(p.id, p.label)) }),
				content,
				footer
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
				label: () => config.label || t("nav"),
				locale: NS,
				// 声明「功能推荐/插件管理」两个 tab 用到的子 slot，否则 settings.section
				// 不会把 renderSlot 能力传给 Section，导致 renderSlot(...) === undefined。
				// 另外给「插件自有组件页」预留通用 slot：cheeco-style.page.<pageId>，
				// 插件用 dsh.cheecoPanel.addPage 声明页面后向它注入组件（如 system-info 的 /sysinfo 页）。
				children: {
					"cheeco-style.plugin-manager": { kind: "single", scope: "root" },
					"cheeco-style.features": { kind: "single", scope: "root" },
					"cheeco-style.page.system-info": { kind: "single", scope: "root" },
					"cheeco-style.page.user-center": { kind: "single", scope: "root" },
					"cheeco-style.page.model-settings": { kind: "single", scope: "root" }
				}
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
		// Kick off the initial config load so the top-left brand + label render from
		// the file as soon as the browser half is up.
		loadConfig();
		return module.exports;
	}
});
