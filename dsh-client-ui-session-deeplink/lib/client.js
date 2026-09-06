window.__ModuleLoader__.load({ id: "@cheeco/dsh-client-ui-session-deeplink", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const react = require("react");
const react_jsx_runtime = require("react/jsx-runtime");
//#region src/client/index.ts
/**
* 客户端半边：按 URL 参数在会话列表就绪后执行对应动作（传了哪个就改哪个，没传保持默认）。
*   - ?session=<id>    打开指定会话
*   - ?workspace=<id>  连接/打开指定工作区
*   - ?cwd=<path>      把路径注册为工作区后再打开
* 多个参数可同时拼接（& 连接）。处理顺序：先 workspace/cwd（定位工作区），再 session（作为最终显式首选）。
* 依赖客户端运行时 `sessions` 与 `workspaces` 服务。
*/
/** 激活前所需服务（由客户端运行时提供）。 */
const inject = ["slots", "sessions", "workspaces"];
const SESSION_KEY = "session";
const WORKSPACE_KEY = "workspace";
const CWD_KEY = "cwd";
/** 把当前会话 id 同步进地址栏（无会话则删掉该参数），保留其余 query 与 hash。 */
function syncSessionQuery(sessionId) {
	const url = new URL(window.location.href);
	if (sessionId === void 0) url.searchParams.delete(SESSION_KEY);
	else url.searchParams.set(SESSION_KEY, sessionId);
	// 就在「会话 url」生成的地方，把「当前 url」（深链接）暴露成变量：其它插件/卡片（如「复制链接」）
	// 监听 dsh-session-deeplink:url 即可拿到带 ?session=<id> 的当前地址，无需自己再拼。
	try {
		window.dispatchEvent(new CustomEvent("dsh-session-deeplink:url", { detail: { url: url.href, sessionId } }));
	} catch (e) { /* ignore */ }
	const next = `${url.pathname}${url.search}${url.hash}`;
	if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
	window.history.replaceState(window.history.state, "", next);
}
/**
* 按传入参数执行初始动作：先 workspace/cwd（注册+连接工作区），再 session（最终显式首选）。
* 每个传入的参数都执行；没传的保持默认。失败仅告警，不影响页面。
*/
async function handleInitial(ctx, sessionId, workspaceId, cwd) {
	try {
		if (workspaceId || cwd) {
			let ws = workspaceId;
			if (!ws && cwd) {
				const created = await ctx.workspaces.create({ path: cwd });
				ws = created && created.id;
			}
			if (ws) {
				try {
					const sid = await ctx.workspaces.connectWorkspace(ws);
					if (sid && ctx.sessions.list.getSnapshot().current !== sid) ctx.sessions.open(sid);
				} catch (e) {
					console.warn("[session-deeplink] 工作区连接失败", e);
				}
			} else {
				console.warn("[session-deeplink] workspace/cwd 未能解析出工作区");
			}
		}
		if (sessionId) {
			const st = ctx.sessions.list.getSnapshot();
			if (st.byId[sessionId] === void 0) console.warn(`[session-deeplink] unknown session ${sessionId}`);
			else if (st.current !== sessionId) try {
				ctx.sessions.open(sessionId);
			} catch (e) {
				console.error(`[session-deeplink] failed to open ${sessionId}`, e);
			}
		}
	} catch (e) {
		console.error("[session-deeplink] 初始化处理失败", e);
	}
}
// ———————————————— 「更多」插件专属卡：打开当前会话 ————————————————
// 由本插件（深链接）经 WindowSlot-Panel 声明的子 slot `dswp-more.card` 注入一张「打开当前会话」卡，
// 点击用当前会话深链接新窗口打开。这样该卡由深链接插件提供，不需要 WindowSlot-Panel 自带。
const MORE_CARD_SLOT = "dswp-more.card";
/** 用会话 id 拼当前深链接（当前网页 + ?session=<id>）。 */
function composeDeepLink(sessionId) {
	try {
		const url = new URL(window.location.href);
		if (sessionId) url.searchParams.set(SESSION_KEY, sessionId);
		else url.searchParams.delete(SESSION_KEY);
		return url.href;
	} catch (e) { return window.location.href; }
}
/** 「打开当前会话」卡片：点击新窗口打开当前会话深链接。 */
function OpenSessionCard(ctx, props) {
	const sessionId = (props && props.sessionId) || (ctx.sessions && ctx.sessions.list ? ctx.sessions.list.getSnapshot().current : void 0);
	const target = composeDeepLink(sessionId);
	const onClick = () => { window.open(target, "_blank"); };
	return react_jsx_runtime.jsx("div", {
		className: "dmcard",
		onClick,
		children: [
			react_jsx_runtime.jsx("span", { className: "dmcard-t", children: "打开当前会话" }),
			react_jsx_runtime.jsx("span", { className: "dmcard-d", children: "在新窗口打开当前会话" })
		]
	});
}
/**
* 客户端插件体：会话列表就绪后一次性应用 URL 参数，随后让 URL 与当前会话保持同步，
* 并向 WindowSlot-Panel 的「更多」卡片槽注入本插件专属的「打开当前会话」卡。
* @param ctx - 客户端 cordis 上下文。
*/
function apply(ctx) {
	const search = new URLSearchParams(window.location.search);
	const sessionId = search.get(SESSION_KEY) || void 0;
	const workspaceId = search.get(WORKSPACE_KEY) || "";
	const cwd = search.get(CWD_KEY) || "";
	ctx.effect(() => {
		let done = false;
		let unsubscribe;
		const reconcile = () => {
			const state = ctx.sessions.list.getSnapshot();
			if (state.phase !== "ready") return;
			if (!done) {
				done = true;
				void handleInitial(ctx, sessionId, workspaceId, cwd);
			}
			syncSessionQuery(ctx.sessions.list.getSnapshot().current);
		};
		reconcile();
		unsubscribe = ctx.sessions.list.subscribe(reconcile);
		return () => {
			unsubscribe?.();
			unsubscribe = void 0;
		};
	}, "session-deeplink: apply url params (session/workspace/cwd)");
	// 向 WindowSlot-Panel 的「更多」卡片槽注入本插件专属的「打开当前会话」卡（任意插件均可如此注入自己的卡）。
	ctx.effect(() => ctx.slots.inject(MORE_CARD_SLOT, () => ctx.slots.register({
		name: MORE_CARD_SLOT,
		id: "session-deeplink-open-card",
		order: 1
	}, (props) => react_jsx_runtime.jsx(OpenSessionCard, { ctx, ...props }))), "session-deeplink: 更多卡片注入");
}
//#endregion
exports.apply = apply;
exports.inject = inject;

return module.exports; } });
