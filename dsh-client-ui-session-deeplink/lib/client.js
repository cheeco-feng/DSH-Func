window.__ModuleLoader__.load({ id: "@cheeco/dsh-client-ui-session-deeplink", factory: (require) => { var module = { exports: {} }; var exports = module.exports;
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
//#region src/client/index.ts
/**
* 客户端半边：按 URL 参数在会话列表就绪后执行对应动作（传了哪个就改哪个，没传保持默认）。
*   - ?session=<id>    打开指定会话
*   - ?workspace=<id>  连接/打开指定工作区
*   - ?cwd=<path>      把路径注册为工作区后再打开
* 多个参数可同时拼接（& 连接）。处理顺序：先 workspace/cwd（定位工作区），再 session（作为最终显式首选）。
* 依赖客户端运行时 `sessions` 与 `workspaces` 服务。
*
* 此外，本插件加载时把自己提供的「打开当前会话」卡片 **写进外置卡片配置**
* /more-cards/config（DSH-More-Cards-config.json）——卡片是**静态配置**、由本插件提供，
* url 是**写死的结构 + 变量占位符**（{origin}/{session}），WindowSlot-Panel 读 json 后用通用
* 「打开」行为渲染，点击时把占位符填成实际值。而不是弹出菜单后再动态注入组件。
*/
/** 激活前所需服务（由客户端运行时提供）。 */
const inject = ["sessions", "workspaces"];
const SESSION_KEY = "session";
const WORKSPACE_KEY = "workspace";
const CWD_KEY = "cwd";
/** 深链接插件提供的「更多」卡片（静态写入外置配置；url 用占位符，{origin}=当前实例基址、{session}=当前会话id）。 */
const CARD_BASE = "{origin}/?session={session}";
const OWN_CARD = { id: "open-current-session", label: "打开当前会话", desc: "在新窗口打开当前会话", type: "open", url: CARD_BASE, order: 1 };
/** 把当前会话 id 同步进地址栏（无会话则删掉该参数），保留其余 query 与 hash。 */
function syncSessionQuery(sessionId) {
	const url = new URL(window.location.href);
	if (sessionId === void 0) url.searchParams.delete(SESSION_KEY);
	else url.searchParams.set(SESSION_KEY, sessionId);
	const next = `${url.pathname}${url.search}${url.hash}`;
	if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
	window.history.replaceState(window.history.state, "", next);
}
/** 把本插件提供的「打开当前会话」卡片写进外置卡片配置（已存在则不动，幂等）。 */
function ensureOwnCard() {
	(async () => {
		try {
			const r = await fetch("/more-cards/config", { cache: "no-store" });
			if (!r.ok) return;
			const j = await r.json();
			const cards = Array.isArray(j.cards) ? j.cards.slice() : [];
			if (cards.some((c) => c && c.id === OWN_CARD.id)) return;
			cards.push(OWN_CARD);
			await fetch("/more-cards/config", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ cards })
			});
		} catch (e) { /* 静默：Endpoint 不存在等 */ }
	})();
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
/**
* 客户端插件体：会话列表就绪后一次性应用 URL 参数，随后让 URL 与当前会话保持同步，
* 并把本插件提供的「打开当前会话」卡片写进外置卡片配置。
* @param ctx - 客户端 cordis 上下文。
*/
function apply(ctx) {
	const search = new URLSearchParams(window.location.search);
	const sessionId = search.get(SESSION_KEY) || void 0;
	const workspaceId = search.get(WORKSPACE_KEY) || "";
	const cwd = search.get(CWD_KEY) || "";
	ensureOwnCard();
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
}
//#endregion
exports.apply = apply;
exports.inject = inject;

return module.exports; } });
