window.__ModuleLoader__.load({
	id: "@cheeco/dsh-client-ui-webgate",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/webgate.tsx
		/**
		 * 会话控制台 —— 浏览器端 cheeco 面板页（注入 cheeco-style.page.webgate 槽位）。
		 *
		 * 用到的客户端 API（均来自 @deepseek-ai/dsh-client-runtime）：
		 *   - ctx.sessions.list            : SnapshotStore<SessionListState>，getSnapshot()/subscribe()；
		 *                                     state 含 current / ids / byId / phase（见 sessions/service.d.ts）
		 *   - ctx.sessions.binding(id)     : SessionBinding | undefined，其 .session 即 SessionFace（identity 稳定）
		 *   - ctx.sessions.open(id)        : 把某会话置为当前（= staged，其窗口随之打开，历史 + 流式才可用）
		 *   - SessionFace.getSnapshot()    : 读 ConversationSnapshot（nodes / partial / openState / promptError ...）
		 *   - SessionFace.subscribe(cb)    : 实时刷新；回调里再 getSnapshot() 取最新引用
		 *   - SessionFace.prompt([{type:'text',text}], 'queue') : 发送消息（见 contract/session.d.ts 的 ISession.prompt）
		 *
		 * 渲染约定（快照结构见 sessions/conversation.d.ts）：
		 *   - nodes 逐个遍历：kind==='user' 取 content 文本；kind==='assistant' 取 blocks 里 kind==='text' 拼接，
		 *     跳过 kind==='reasoning'；steering / context 等同 user 取 content 文本降级显示。
		 *   - nodes 之外若 snapshot.partial 存在，追加为"流式中"文本（partial.blocks 里 kind==='text'）。
		 *
		 * ⚠️ 可能需要装包后实测的点：
		 *   1) binding(id).session 对「非当前会话」的 getSnapshot() 可能 openState==='cold'（历史未拉取）。
		 *      本实现采用"打开时若不在当前则 ctx.sessions.open(id)"，让它进入 staged 才有真实历史与流式；
		 *      若实测发现 open() 会改变全局当前会话造成干扰，可改为仅允许查看当前会话。
		 *   2) prompt() 返回的 RpcResult 形状：按 DSH 惯例为 {ok:true,value}|{ok:false,error}，代码按 res.ok 判断。
		 *   3) 会话不在 list.byId 时 binding 可能返回 undefined，此时显示"会话不存在"。
		 */
		const PLUGIN_VERSION = "0.1.0";
		/** localStorage 键：记住上次打开的会话 id。 */
		const LS_KEY = "dsh-webgate:sessionId";
		/** 灰白风格常量。 */
		const PALETTE = {
			pageBg: "#fafafa",
			cardBg: "#ffffff",
			border: "#e2e2e2",
			muted: "#8a8a8a",
			text: "#222222",
			userBg: "#f1f1f1",
			assistantBg: "#ffffff",
			infoBg: "#f6f6f6",
			partialBg: "#fbfbfb"
		};
		/** 容错提取 ContentBlock[] 里的文本（user/steering/context 的 content）。 */
		function textOfContent(content) {
			return (content || []).map((c) => {
				if (typeof c === "string") return c;
				if (!c) return "";
				if (c.type === "text" && typeof c.text === "string") return c.text;
				if (c.kind === "text" && typeof c.text === "string") return c.text;
				if (typeof c.text === "string") return c.text;
				return "";
			}).join("");
		}
		/** AssistantBlock[] 拼出正文：只取 kind==='text'，跳过 reasoning。 */
		function textOfBlocks(blocks) {
			return (blocks || []).map((b) => b.kind === "text" && typeof b.text === "string" ? b.text : "").join("");
		}
		/** 初始目标会话：优先 URL ?session=，其次 localStorage，最后当前会话。 */
		function readInitialTarget(ctx) {
			const qs = new URLSearchParams(window.location.search).get("session");
			if (qs) return qs;
			const cached = localStorage.getItem(LS_KEY);
			if (cached) return cached;
			return ctx.sessions.list.getSnapshot().current || "";
		}
		/**
		 * 订阅指定会话：targetId 变化时重新绑定 SessionFace 并订阅其快照；
		 * 同时订阅列表 store 以在会话列表就绪/变化时重绑并反映在选择框里。
		 * @returns { view, face, list }：view=ConversationSnapshot|undefined，face=SessionFace|undefined，list=SessionListState
		 */
		function useConversation(ctx, targetId) {
			const bind = () => targetId ? ctx.sessions.binding(targetId)?.session : void 0;
			const [view, setView] = (0, react.useState)(() => bind()?.getSnapshot());
			const [list, setList] = (0, react.useState)(() => ctx.sessions.list.getSnapshot());
			// 会话列表就绪/变化 → 重绑目标并同步选择框
			(0, react.useEffect)(() => {
				const unsub = ctx.sessions.list.subscribe(() => {
					const s = ctx.sessions.list.getSnapshot();
					setList(s);
					const face = bind();
					setView(face ? face.getSnapshot() : void 0);
				});
				return () => { unsub(); };
			}, [targetId]);
			// 绑定目标 face 并订阅其实时快照
			(0, react.useEffect)(() => {
				const face = bind();
				setView(face ? face.getSnapshot() : void 0);
				if (!face) return;
				const unsub = face.subscribe(() => setView(face.getSnapshot()));
				return () => { unsub(); };
			}, [targetId]);
			// targetId 没变但列表引用变化（如重新连接重建）时也要反映最新所选会话
			(0, react.useEffect)(() => {
				const face = bind();
				setView(face ? face.getSnapshot() : void 0);
			}, [targetId, list]);
			return { view, face: bind(), list };
		}
		/** 组装一条对话行。 */
		function rowEl(key, role, text) {
			const bg = role === "user" ? PALETTE.userBg : role === "partial" ? PALETTE.partialBg : role === "info" ? PALETTE.infoBg : PALETTE.assistantBg;
			return (0, react_jsx_runtime.jsx)("div", {
				key,
				style: {
					display: "flex",
					gap: 8,
					margin: "4px 0",
					padding: "6px 10px",
					borderRadius: 6,
					background: bg,
					border: "1px solid " + PALETTE.border,
					whiteSpace: "pre-wrap",
					wordBreak: "break-word",
					fontSize: 13,
					lineHeight: "20px",
					color: role === "partial" ? PALETTE.muted : PALETTE.text
				},
				children: text
			});
		}
		/** 渲染历史主体：遍历 nodes + 追加 partial。 */
		function renderBody(view) {
			if (!view) return (0, react_jsx_runtime.jsx)("div", { style: { color: PALETTE.muted, padding: 16 }, children: "请先打开一个会话（默认取当前会话，或 ?session=/上次使用）" });
			if (view.openState === "loading") return (0, react_jsx_runtime.jsx)("div", { style: { color: PALETTE.muted, padding: 16 }, children: "会话加载中…" });
			if (view.openState === "error") return (0, react_jsx_runtime.jsx)("div", { style: { color: PALETTE.muted, padding: 16 }, children: "会话加载失败：" + ((view.openError && view.openError.message) || "") });
			const rows = [];
			(view.nodes || []).forEach((node) => {
				if (node.kind === "user") {
					const text = textOfContent(node.content);
					if (!text) return;
					rows.push(rowEl(node.seq, "user", text));
				} else if (node.kind === "assistant") {
					const text = textOfBlocks(node.blocks);
					if (!text) return;
					rows.push(rowEl(node.seq, "assistant", text));
				} else if (node.kind === "steering" || node.kind === "context") {
					const text = textOfContent(node.content);
					if (!text) return;
					rows.push(rowEl(node.seq, "info", text));
				}
			});
			if (view.partial) {
				const pt = textOfBlocks(view.partial.blocks);
				if (pt) rows.push(rowEl("partial", "partial", "（流式中）" + pt));
			}
			if (rows.length === 0) return (0, react_jsx_runtime.jsx)("div", { style: { color: PALETTE.muted, padding: 16 }, children: "（暂无消息，可在下方发送）" });
			return (0, react_jsx_runtime.jsxs)("div", { children: rows });
		}
		/** 需要此插件声明的服务：sessions + slots。 */
		const inject = ["sessions", "slots"];
		function apply(ctx) {
			/** 会话控制台面板页组件（在 apply 内定义以闭包拿到 ctx；真正 React 组件）。 */
			function WebgatePage() {
				const [idInput, setIdInput] = (0, react.useState)(() => readInitialTarget(ctx) || "");
				const [targetId, setTargetId] = (0, react.useState)(idInput);
				const [sendText, setSendText] = (0, react.useState)("");
				const [status, setStatus] = (0, react.useState)("");
				const { view, face, list } = useConversation(ctx, targetId);
				const open = (id) => {
					const sid = (id || "").trim();
					if (!sid) return;
					const st = ctx.sessions.list.getSnapshot();
					if (st.byId[sid] === void 0) {
						setStatus("会话不存在：" + sid);
						return;
					}
					if (st.current !== sid) ctx.sessions.open(sid);
					setTargetId(sid);
					try { localStorage.setItem(LS_KEY, sid); } catch {}
					setStatus("");
				};
				const onChangeSelect = (e) => {
					const v = e.target.value;
					setIdInput(v);
					if (v) open(v);
				};
				const onSend = async () => {
					const text = (sendText || "").trim();
					if (!text) return;
					const f = face;
					if (!f) {
						setStatus("请先打开一个会话");
						return;
					}
					try {
						const res = await f.prompt([{ type: "text", text }], "queue");
						if (res && res.ok === false) setStatus("发送失败：" + ((res.error && res.error.message) || "未知错误"));
						else {
							setSendText("");
							setStatus("已发送（queue），等待回复…");
						}
					} catch (err) {
						setStatus("发送异常：" + ((err && err.message) || String(err)));
					}
				};
				const opts = (list.ids || []).map((id) => (0, react_jsx_runtime.jsx)("option", {
					key: id,
					value: id,
					children: (list.byId[id] && list.byId[id].displayTitle) || id
				}));
				return (0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						flexDirection: "column",
						height: "100%",
						minHeight: 360,
						background: PALETTE.pageBg,
						color: PALETTE.text,
						fontFamily: "system-ui, -apple-system, sans-serif",
						fontSize: 14
					},
					children: [
						/* 头部：选择会话 + 打开 */
						(0, react_jsx_runtime.jsxs)("div", {
							style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderBottom: "1px solid " + PALETTE.border, background: PALETTE.cardBg },
							children: [
								(0, react_jsx_runtime.jsxs)("select", {
									value: targetId || "",
									onChange: onChangeSelect,
									style: { maxWidth: 220, padding: "4px 6px", border: "1px solid " + PALETTE.border, borderRadius: 6, background: PALETTE.cardBg },
									children: opts
								}, "select"),
								(0, react_jsx_runtime.jsx)("input", {
									placeholder: "会话 id",
									value: idInput,
									onChange: (e) => setIdInput(e.target.value),
									style: { flex: 1, minWidth: 120, padding: "6px 8px", border: "1px solid " + PALETTE.border, borderRadius: 6, fontFamily: "inherit" }
								}, "input"),
								(0, react_jsx_runtime.jsx)("button", {
									onClick: () => open(idInput),
									style: { padding: "6px 12px", border: "1px solid " + PALETTE.border, borderRadius: 6, background: PALETTE.cardBg, cursor: "pointer" },
									children: "打开"
								}, "openBtn")
							]
						}),
						/* 状态行 */
						status && (0, react_jsx_runtime.jsx)("div", {
							style: { padding: "4px 12px", color: PALETTE.muted, background: PALETTE.cardBg, borderBottom: "1px solid " + PALETTE.border },
							children: status
						}),
						/* 历史区 */
						(0, react_jsx_runtime.jsx)("div", {
							style: { flex: 1, overflowY: "auto", padding: "8px 12px" },
							children: renderBody(view)
						}, "history"),
						/* 底部：发送 */
						(0, react_jsx_runtime.jsxs)("div", {
							style: { display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", borderTop: "1px solid " + PALETTE.border, background: PALETTE.cardBg },
							children: [
								(0, react_jsx_runtime.jsx)("input", {
									placeholder: "输入消息…（Enter 发送）",
									value: sendText,
									onChange: (e) => setSendText(e.target.value),
									onKeyDown: (e) => { if (e.key === "Enter") void onSend(); },
									style: { flex: 1, padding: "6px 8px", border: "1px solid " + PALETTE.border, borderRadius: 6, fontFamily: "inherit" }
								}, "sendInput"),
								(0, react_jsx_runtime.jsx)("button", {
									onClick: () => void onSend(),
									style: { padding: "6px 12px", border: "1px solid " + PALETTE.border, borderRadius: 6, background: PALETTE.cardBg, cursor: "pointer" },
									children: "发送"
								}, "sendBtn")
							]
						})
					]
				});
			}
			ctx.slots.inject("cheeco-style.page.webgate", () => ctx.slots.register({
				name: "cheeco-style.page.webgate",
				id: "webgate",
				label: "会话控制台"
			}, WebgatePage));
		}
		//#endregion
		exports.PLUGIN_VERSION = PLUGIN_VERSION;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
