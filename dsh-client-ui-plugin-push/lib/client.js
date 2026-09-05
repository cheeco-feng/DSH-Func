window.__ModuleLoader__.load({
	id: "@cheeco/dsh-client-ui-plugin-push",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		let slots = require("@deepseek-ai/dsh-client-ui-slots");
		let locale = require("@deepseek-ai/dsh-client-locale");

		// Inject card styles (idempotent) so the recommendation page looks consistent.
		(function () {
			if (typeof document === "undefined" || document.querySelector('style[data-plugin="dsh-client-ui-plugin-push"]')) return;
			var css = ".dsh-web-ui-cheeco-style{display:flex;flex-direction:column;gap:16px;}"
				+ ".dsh-web-ui-cheeco-style-section{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:12px;padding:16px 18px;box-shadow:0 1px 2px rgba(0,0,0,.04);}"
				+ ".dsh-web-ui-cheeco-style-section h3{margin:0 0 10px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#1a1a1a);}"
				+ ".dsh-web-ui-cheeco-style-state{margin:0 0 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#666);}"
				+ ".dsh-web-ui-cheeco-style-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:4px;}"
				+ ".dsh-web-ui-cheeco-style-action{box-sizing:border-box;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);font-family:inherit;font-size:13px;line-height:20px;border-radius:8px;padding:6px 14px;transition:background .15s,border-color .15s,box-shadow .15s;}"
				+ ".dsh-web-ui-cheeco-style-action:hover{background:var(--dsw-alias-interactive-bg-hover,#f5f5f5);border-color:var(--dsw-alias-state-business-primary,#3498db);}"
				+ ".dsh-web-ui-cheeco-style-action:active{background:var(--dsw-alias-interactive-bg-active,#ececec);}";
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-client-ui-plugin-push";
			tag.textContent = css;
			document.head.appendChild(tag);
		})();

		const NS = "dsh-client-ui-plugin-push";
		const FEATURES_ENDPOINT = "/cheeco-push/features";
		const FEATURES_INSTALL_ENDPOINT = "/cheeco-push/features/install";
		const FEATURES_PLAN_ENDPOINT = "/cheeco-push/features/plan";
		const FEATURES_DOWNLOAD_ENDPOINT = "/cheeco-push/features/download";
		const UNINSTALL_ENDPOINT = "/cheeco-push/plugin/uninstall";
		const RESTART_ENDPOINT = "/cheeco-push/plugin/restart";

		/** 安装/更新向导弹窗：确认 → 下载/检查 → 安装 → 成功(重启提示)。 */
		function InstallWizard({ feature, onClose }) {
			const isUpdate = !!feature.installed;
			const [step, setStep] = react.useState(0);
			const [plan, setPlan] = react.useState(null);
			const [log, setLog] = react.useState([]);
			const [busy, setBusy] = react.useState(false);
			const [done, setDone] = react.useState("");
			const [countdown, setCountdown] = react.useState(null);
			react.useEffect(() => {
				if (countdown === null) return;
				if (countdown <= 0) {
					try { window.location.reload(); } catch (e) {}
					setCountdown(null);
					return;
				}
				const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
				return () => clearTimeout(timer);
			}, [countdown]);
			react.useEffect(() => {
				(async () => {
					try {
						const p = await (await fetch(FEATURES_PLAN_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: feature.id, force: true }) })).json();
						if (p.ok) setPlan(p);
					} catch (e) {}
				})();
			}, []);
			const planLines = plan ? [
				"● 安装计划：",
				"    下载/来源：" + (plan.downloadUrl || plan.source || "-"),
				"    安装包名：" + (plan.fileName || "-"),
				"    目标目录：" + (plan.targetDir || "-"),
				"    安装路径：" + (plan.installPath || "-"),
				"    下载目录：" + (plan.downloadDir || "-")
			] : ["正在加载安装计划…"];
			const [autoRestart, setAutoRestart] = react.useState(true);
			const addLog = (s) => setLog((l) => [...l, s]);
			const run = async () => {
				setStep(1); setBusy(true); setLog([]); setDone("");
				addLog("▶ 开始" + (isUpdate ? "更新" : "安装") + "「" + feature.name + "」");
				try {
					const p = await (await fetch(FEATURES_PLAN_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: feature.id, force: true }) })).json();
					if (!p.ok) { addLog("✗ " + (p.error || "未找到安装包")); setDone("安装失败"); setStep(3); setBusy(false); return; }
					setPlan(p);
					addLog("● 步骤 1/3  安装计划：");
					addLog("    下载/来源：" + (p.downloadUrl || p.source || "-"));
					addLog("    安装包名：" + p.fileName);
					addLog("    目标目录：" + (p.targetDir || "-"));
					addLog("    安装路径：" + (p.installPath || "-"));
					addLog("    下载目录：" + (p.downloadDir || "-"));
					addLog("● 步骤 2/3  下载（到下载目录，检查同名文件）…");
					setStep(2);
					const dl = await (await fetch(FEATURES_DOWNLOAD_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: feature.id, force: true }) })).json();
					addLog(dl.ok ? ("    " + (dl.skipped ? "已跳过下载：" : "") + dl.source + (dl.downloadDir ? "（目录：" + dl.downloadDir + "，" + (dl.bytes || 0) + " 字节）" : "")) : ("    ✗ 下载失败：" + (dl.error || "")));
					if (!dl.ok) { addLog("✗ 无法下载安装包，流程中止"); setDone("安装失败"); setStep(3); setBusy(false); return; }
					addLog("● 步骤 3/3  安装（dsh plugin add）…");
					const i = await (await fetch(FEATURES_INSTALL_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: feature.id, force: true }) })).json();
					if (i.stdout) addLog("—— pnpm 安装日志 ——\n" + i.stdout.trim());
					if (i.stderr) addLog("—— 错误输出 ——\n" + i.stderr.trim());
					addLog(i.ok ? ("✓ 安装成功，已安装到：" + (i.installPath || "")) : ("✗ 安装失败：" + (i.stderr || i.error || "")));
					if (i.ok && autoRestart) {
						addLog("● 正在自动重启当前 DSH…");
						try {
							const rr = await (await fetch(RESTART_ENDPOINT, { method: "POST" })).json();
							if (rr.ok) {
								addLog("✓ 已触发自动重启，约 10 秒后刷新页面生效。");
								setCountdown(10);
							} else {
								addLog("未能成功重启，本次执行，须手动重启后生效。");
							}
						} catch (e) { addLog("未能成功重启，本次执行，须手动重启后生效。"); }
					}
					addLog(i.ok ? "✓ 完成" : "✗ 未完成，请查看上方错误");
					setDone(i.ok ? (autoRestart ? "安装成功，已触发自动重启" : "安装成功（重启后生效）") : "安装失败");
				} catch (e) { addLog("✗ 安装失败：" + e.message); setDone("安装失败"); }
				setBusy(false); setStep(3);
			};
			return react_jsx_runtime.jsx("div", { style: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 }, children: [
				react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-section", style: { width: "85vw", height: "85vh", maxWidth: "1080px", display: "flex", flexDirection: "column" }, children: [
					react_jsx_runtime.jsx("h3", { children: (isUpdate ? "更新「" : "安装「") + feature.name + "」" }),
					react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: "流程：确认 → 下载/检查 → 安装 → 完成（当前：" + step + (done ? "　结果：" + done : "") + "）" }),
					react_jsx_runtime.jsx("div", { style: { flex: 1, overflow: "auto", border: "1px solid var(--dsw-alias-border-l1,#e5e5e5)", borderRadius: "8px", background: "var(--dsw-alias-bg-layer-1,#fff)", padding: "10px 12px", fontFamily: "ui-monospace, monospace", fontSize: "12.5px", lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-all", color: "var(--dsw-alias-label-secondary,#555)" }, children: [
						(step === 0 ? [...planLines, "将下载并安装到当前 profile，完成后需重启 DSH 生效。点击下方「开始安装」。"] : log).map((l, i) => react_jsx_runtime.jsx("div", { key: i, children: l }))
					] }),
					react_jsx_runtime.jsx("label", { style: { display: "flex", alignItems: "center", gap: "8px", marginTop: "10px", fontSize: "13px", color: "var(--dsw-alias-label-secondary,#666)" }, children: [
						react_jsx_runtime.jsx("input", { type: "checkbox", checked: autoRestart, onChange: (e) => setAutoRestart(e.target.checked) }),
						"安装后自动重启"
					] }),
					countdown !== null ? react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", style: { marginTop: "8px", color: "var(--dsw-alias-state-business-primary,#3498db)" }, children: "已触发自动重启，" + countdown + " 秒后自动刷新页面…" }) : null,
					react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-actions", style: { marginTop: "10px" }, children: [
						step === 0 ? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: run, children: "开始安装" }) : null,
						step === 3 ? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: onClose, children: "完成" }) : react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: onClose, children: "取消" })
					] })
				] })
			] });
		}

		/** "功能推荐" 一体化插件中心 —— 最上方 dsh 官方程序，下面每个插件一行。 */
		function FeaturesCard() {
			const [items, setItems] = react.useState([]);
			const [msg, setMsg] = react.useState("");
			const [loading, setLoading] = react.useState(true);
			const [wizard, setWizard] = react.useState(null);
			const [busyId, setBusyId] = react.useState("");
			const [enabledMap, setEnabledMap] = react.useState({});
			const [countdown, setCountdown] = react.useState(null);
			react.useEffect(() => {
				if (countdown === null) return;
				if (countdown <= 0) {
					try { window.location.reload(); } catch (e) {}
					setCountdown(null);
					return;
				}
				const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
				return () => clearTimeout(timer);
			}, [countdown]);
			const load = async () => {
				try {
					const r = await fetch(FEATURES_ENDPOINT, { cache: "no-store" });
					const j = await r.json();
					setItems(j.items || []);
				} catch (e) { setMsg("加载失败：" + e.message); }
				try {
					const pm = await (await fetch("/pmgr/list", { cache: "no-store" })).json();
					if (pm && Array.isArray(pm.plugins)) {
						const m = {};
						for (const p of pm.plugins) m[p.name] = !!p.enabled;
						setEnabledMap(m);
					}
				} catch (e) {}
				setLoading(false);
			};
			react.useEffect(() => { load(); }, []);
			const checkUpdate = async (f) => {
				setBusyId(f.id); setMsg("正在检查更新…");
				try {
					const r = await fetch(FEATURES_ENDPOINT, { cache: "no-store" });
					const j = await r.json();
					setItems(j.items || []);
					setMsg("已刷新实时最新版本。（安装/卸载后需重启 DSH 生效）");
				} catch (e) { setMsg("检查更新失败：" + e.message); }
				setBusyId("");
			};
			const uninstall = async (f) => {
				if (!window.confirm("确定卸载「" + f.name + "」吗？卸载后需重启 DSH 生效。")) return;
				setBusyId(f.id); setMsg("正在卸载…");
				try {
					const r = await fetch(UNINSTALL_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ plugins: [f.pkg] }) });
					const data = await r.json();
					const errItem = data.results && data.results.find((x) => !x.ok);
					if (data.ok) {
						setMsg("卸载成功，正在自动重启 DSH…");
						try {
							const rr = await (await fetch(RESTART_ENDPOINT, { method: "POST" })).json();
							if (rr.ok) setCountdown(10);
							else setMsg("卸载成功（重启后生效）");
						} catch (e) { setMsg("卸载成功（重启后生效）"); }
					} else {
						setMsg("卸载失败：" + (errItem ? errItem.error : (data.error || "未知")));
					}
				} catch (e) { setMsg("卸载失败：" + e.message); }
				setBusyId(""); load();
			};
			const row = (f) => {
				const isOff = !!f.official;
				const enabled = isOff ? true : (enabledMap[f.pkg] !== void 0 ? enabledMap[f.pkg] : f.enabled);
				const ver = isOff ? "dsh 版本 " + (f.current || "") : "当前 " + (f.current || "(未装)") + (f.latest ? " / 最新 " + f.latest : "") + (f.hasUpdate ? "　（有更新）" : (f.installed ? "　（已是最新）" : ""));
				const depErr = f.depErr || "";
				return react_jsx_runtime.jsx("div", { key: f.id, className: "dsh-web-ui-cheeco-style-section", style: { padding: "10px 14px", marginBottom: "8px" }, children: [
					react_jsx_runtime.jsx("div", { style: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }, children: [
						react_jsx_runtime.jsx("span", { style: { fontWeight: 600 }, children: [f.name, isOff ? react_jsx_runtime.jsx("span", { style: { marginLeft: "8px", fontSize: "12px", color: "#8e44ad" }, children: "官方" }) : null] }),
						react_jsx_runtime.jsx("span", { style: { fontSize: "12.5px", color: enabled ? "#2ecc71" : "#999" }, children: enabled ? "● 启用" : "● 停用" })
					] }),
					react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", style: { marginBottom: "6px" }, children: ver }),
					depErr ? react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", style: { marginBottom: "6px", color: "#e67e22" }, children: "⚠ " + depErr }) : null,
					react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-actions", children: [
						!isOff && (f.installed ? react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: () => uninstall(f), disabled: busyId === f.id, children: "卸载" }) : react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: () => setWizard(f), disabled: busyId === f.id || !!depErr, style: { background: "#3498db", borderColor: "#3498db", color: "#fff" }, children: "我要安装" })),
						react_jsx_runtime.jsx("a", { href: f.url, target: "_blank", rel: "noreferrer", className: "dsh-web-ui-cheeco-style-action", style: { textDecoration: "none" }, children: "查看介绍" }),
						!isOff && react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: () => checkUpdate(f), disabled: busyId === f.id, children: "检查更新" }),
						!isOff && f.installed && f.hasUpdate && react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: () => setWizard(f), disabled: busyId === f.id || !!depErr, style: { background: "#3498db", borderColor: "#3498db", color: "#fff" }, children: "更新" })
					] })
				] });
			};
			return react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-section", children: [
				items.length === 0 && loading && !msg && !wizard
					? react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: "加载中…" })
					: null,
				items.map(row),
				msg ? react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: msg }) : null,
				countdown !== null ? react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", style: { color: "var(--dsw-alias-state-business-primary,#3498db)" }, children: "已触发自动重启，" + countdown + " 秒后自动刷新页面…" }) : null,
				wizard ? react_jsx_runtime.jsx(InstallWizard, { feature: wizard, onClose: () => { setWizard(null); load(); } }) : null
			] });
		}

		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, { zh: {}, en: {} }), "cheeco-push: dictionaries");
			// 注册进 dsh-web-ui-PluginPackagePanel（DSH插件包）预留的「功能推荐」子 slot。
			ctx.slots.inject("dsh-plugin-package.features", () => ctx.slots.register({
				name: "dsh-plugin-package.features",
				id: "push",
				order: 100,
				locale: NS
			}, FeaturesCard));
		}
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
