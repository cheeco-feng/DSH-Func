/** @cheeco/dsh-web-setting-BrandPanel client half（浏览器侧）。
 *
 *  注册「主面板修改」（界面标题/Logo）设置页到 DSH系统包（dsh-web-ui-SystemPackagePanel）内页
 *  （经子 slot dsh-system-package.brand-panel，由系统包「主面板修改」tab 渲染）。
 *
 *  配置读/写：GET/POST /cheeco-style/config 的 brandTitle（顶部名称）、brandLogoUrl（logo 网址），
 *  本地图片上传 /cheeco-style/assets。保存后派发 cheeco-brand-change 事件，使顶部品牌
 *  （仍由 cheeco-style 的 sidebar.brand 槽提供）即时刷新。 */
window.__ModuleLoader__.load({
	id: "@cheeco/dsh-web-setting-BrandPanel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let slots = require("@deepseek-ai/dsh-client-ui-slots");
		let locale = require("@deepseek-ai/dsh-client-locale");

		// 注入卡片样式（幂等），类名与 cheeco-style 共用，样式由本插件自注入。
		(function () {
			if (typeof document === "undefined" || document.querySelector('style[data-plugin="dsh-web-setting-brand-panel"]')) return;
			var css = ".dsh-web-ui-cheeco-style-section{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:12px;padding:16px 18px;box-shadow:0 1px 2px rgba(0,0,0,.04);}"
				+ ".dsh-web-ui-cheeco-style-section h3{margin:0 0 10px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#1a1a1a);}"
				+ ".dsh-web-ui-cheeco-style-state{margin:0 0 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#666);}"
				+ ".dsh-web-ui-cheeco-style-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:4px;}"
				+ ".dsh-web-ui-cheeco-style-action{box-sizing:border-box;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);font-family:inherit;font-size:13px;line-height:20px;border-radius:8px;padding:6px 14px;transition:background .15s,border-color .15s,box-shadow .15s;}"
				+ ".dsh-web-ui-cheeco-style-action:hover{background:var(--dsw-alias-interactive-bg-hover,#f5f5f5);border-color:var(--dsw-alias-state-business-primary,#3498db);}"
				+ ".dsh-web-ui-cheeco-style-brand-preview{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin-top:10px;}"
				+ ".dsh-web-ui-cheeco-style-preview-img{height:28px;width:28px;object-fit:contain;border-radius:6px;background:var(--dsw-alias-bg-module-platform,#f0f0f0);flex:none;}";
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-web-setting-brand-panel";
			tag.textContent = css;
			document.head.appendChild(tag);
		})();

		const NS = "dsh-web-setting-brand-panel";
		const CONFIG_ENDPOINT = "/dsh-system/config";
		const ASSETS_ENDPOINT = "/dsh-system/assets";
		const BRAND_EVENT = "cheeco-brand-change";
		const DEFAULT_LOGO_URL = "https://yc1971.com/ico.png";

		function isLocalAsset(url) { return (url || "").trim().startsWith(ASSETS_ENDPOINT + "/"); }

		async function readConfig() {
			try {
				const res = await fetch(CONFIG_ENDPOINT, { cache: "no-store" });
				if (!res.ok) return {};
				return (await res.json()) || {};
			} catch (e) { return {}; }
		}
		async function writeConfig(patch) {
			try {
				const cur = await readConfig();
				const curBrand = (cur && typeof cur.brand === "object" && cur.brand) ? cur.brand : {};
				await fetch(CONFIG_ENDPOINT, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({ ...cur, brand: { ...curBrand, ...patch } })
				});
				try { window.dispatchEvent(new Event(BRAND_EVENT)); } catch (e) {}
			} catch (e) {}
		}
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

		/** 「主面板修改」设置页：改左侧顶部名称 + logo，留空显官方默认。 */
		function BrandTab() {
			const [title, setTitle] = react.useState("");
			const [url, setUrl] = react.useState(DEFAULT_LOGO_URL);
			const fileRef = react.useRef(null);
			react.useEffect(() => {
				let cancelled = false;
				(async () => {
					const cfg = await readConfig();
					if (cancelled) return;
					const b = (cfg && typeof cfg.brand === "object" && cfg.brand) ? cfg.brand : {};
					setTitle(b.title || "");
					const raw = (b.logoUrl || "").trim();
					setUrl(raw.startsWith("data:") ? DEFAULT_LOGO_URL : (raw || DEFAULT_LOGO_URL));
				})();
				return () => { cancelled = true; };
			}, []);
			const preview = (url || "").trim().startsWith("data:") ? "" : url;
			const isLocal = isLocalAsset(url);
			const save = async () => {
				await writeConfig({ title: title.trim(), logoUrl: (url || "").trim(), logoData: "" });
				alert("已保存界面标题/Logo：左侧顶部即时生效。");
			};
			const reset = async () => {
				setTitle(""); setUrl("");
				await writeConfig({ title: "", logoUrl: "", logoData: "" });
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

		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh: {}, en: {} }), "dsh-web-setting-brand-panel: dictionaries");
			// 注册进 dsh-web-ui-SystemPackagePanel（DSH系统包）预留的「主面板修改」子 slot。
			ctx.slots.inject("dsh-system-package.brand-panel", () => ctx.slots.register({
				name: "dsh-system-package.brand-panel",
				id: "brand-panel",
				order: 20,
				locale: NS
			}, BrandTab));
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
