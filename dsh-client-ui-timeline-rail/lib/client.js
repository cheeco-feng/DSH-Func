window.__ModuleLoader__.load({ id: "@cheeco/dsh-client-ui-timeline-rail", factory: (require) => {
var module = { exports: {} }; var exports = module.exports;
//#region rolldown:runtime
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
	if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
		key = keys[i];
		if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
			get: ((k) => from[k]).bind(null, key),
			enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
		});
	}
	return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", {
	value: mod,
	enumerable: true
}) : target, mod));

//#endregion
const react = __toESM(require("react"));
const react_jsx_runtime = __toESM(require("react/jsx-runtime"));

//#region src/client/locales.ts
const NS = "dsh-timeline-rail";
const zh = {
	"marker.aria": "跳转到第 {n} 条消息",
	"tip.user": "用户",
	"tip.assistant": "助手",
	"tip.tool": "工具",
	"tip.nth": "第 {n} 条",
	"tip.attachment": "（附件消息）",
	"tip.image": "（图片消息）",
	"rail.aria": "消息时间轴"
};
const en = {
	"marker.aria": "Jump to message {n}",
	"tip.user": "User",
	"tip.assistant": "Assistant",
	"tip.tool": "Tool",
	"tip.nth": "#{n}",
	"tip.attachment": "(attachment)",
	"tip.image": "(image)",
	"rail.aria": "Message timeline"
};

//#endregion
//#region src/client/user-message.ts
/**
* Join the text of a user message's content into a preview string.
* @param content - the raw `data.content` (block list, string, or absent).
* @returns the concatenated text blocks, or an empty string.
*/
function textOfContent(content) {
	if (typeof content === "string") return content;
	if (Array.isArray(content)) {
		let text = "";
		for (const block of content) {
			const b = block;
			if (b?.type === "text" && typeof b.text === "string") text += b.text;
		}
		return text;
	}
	return "";
}
/**
* Whether a user message's content carries at least one image block.
* @param content - the raw `data.content` (block list).
* @returns true when any block is an image.
*/
function hasImageContent(content) {
	if (!Array.isArray(content)) return false;
	return content.some((block) => block?.type === "image");
}
/**
* Join the text of an assistant message's blocks into a preview string.
* Assistant nodes carry `blocks: AssistantBlock[]` (not `content`), where
* text blocks are `{ kind: 'text', text }` and reasoning blocks are skipped.
* @param blocks - the assistant node's `data.blocks`.
* @returns the concatenated text, or an empty string.
*/
function textOfAssistantBlocks(blocks) {
	if (blocks === void 0) return "";
	let text = "";
	for (const block of blocks) if (block.kind === "text") text += block.text;
	return text;
}
/** Extract assistant text from either the runtime node or UI conversation wrapper. */
function textOfAssistantNode(data) {
	if (data === null || typeof data !== "object") return "";
	const value = data;
	return textOfAssistantBlocks(value.blocks ?? value.finalNode?.blocks);
}

//#endregion
//#region \0dsh-css:/Volumes/GM7/code/dsh-timeline-rail/src/client/timeline-rail.module.css.mjs
const css = "._3EMJWG_rail{z-index:80;pointer-events:none;justify-content:center;width:28px;display:flex;position:fixed}._3EMJWG_viewport{pointer-events:auto;scrollbar-width:none;width:100%;height:100%;position:relative;overflow:visible auto}._3EMJWG_viewport::-webkit-scrollbar{display:none}._3EMJWG_content{width:100%;min-height:100%;position:relative}._3EMJWG_track{background:var(--dsw-alias-border-l1,#80808033);opacity:.7;border-radius:1px;width:1px;position:absolute;top:12px;bottom:12px;left:50%;transform:translate(-50%)}._3EMJWG_tick{box-sizing:border-box;cursor:pointer;pointer-events:auto;transform-origin:50%;background:var(--dsw-alias-label-tertiary,#888);border:none;border-radius:1px;width:14px;height:2px;margin:0;padding:0;transition:top .24s ease-out,transform .18s cubic-bezier(.25,.46,.45,.94),background-color .12s,box-shadow .15s;animation:.24s ease-out both _3EMJWG_tickAppear;position:absolute;left:50%}._3EMJWG_tick:hover,._3EMJWG_tick:focus-visible{outline:none;box-shadow:0 0 6px #4d6bfe4d}._3EMJWG_tickActive{box-shadow:0 0 4px #4d6bfe40;background:var(--dsw-alias-label-primary,#111)!important}@keyframes _3EMJWG_tickAppear{0%{opacity:0;scale:.55}to{opacity:1;scale:1}}._3EMJWG_tip{box-sizing:border-box;background:var(--dsw-alias-bg-overlay,#fff);border:1px solid var(--dsw-alias-border-l2,#8080804d);width:max-content;min-width:170px;max-width:min(320px,46vw);box-shadow:var(--dsw-shadow-lv2,0 6px 18px #0000001f);text-align:left;pointer-events:none;word-break:break-word;z-index:81;border-radius:10px;padding:10px 12px;position:fixed}._3EMJWG_tipNth{color:var(--dsw-alias-label-tertiary,#808080cc);margin-right:4px;font-size:11px;line-height:14px}._3EMJWG_tipUser{color:var(--dsw-alias-label-primary,#111);white-space:pre-wrap;-webkit-line-clamp:2;-webkit-box-orient:vertical;margin:0 0 4px;font-size:13px;font-weight:600;line-height:20px;display:-webkit-box;overflow:hidden}._3EMJWG_tipReply{border-top:1px solid var(--dsw-alias-border-l1,#80808026);color:var(--dsw-alias-label-secondary,#808080a6);white-space:pre-wrap;-webkit-line-clamp:3;-webkit-box-orient:vertical;margin:0;padding-top:4px;font-size:12px;line-height:18px;display:-webkit-box;overflow:hidden}";
const tagId = "@cheeco/dsh-client-ui-timeline-rail/timeline-rail.module.css";
if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
	const tag = document.createElement("style");
	tag.dataset.plugin = "@cheeco/dsh-client-ui-timeline-rail";
	tag.dataset.pluginCss = tagId;
	tag.textContent = css;
	document.head.appendChild(tag);
}
var timeline_rail_module_css_default = {
	"content": "_3EMJWG_content",
	"tipNth": "_3EMJWG_tipNth",
	"track": "_3EMJWG_track",
	"rail": "_3EMJWG_rail",
	"tickAppear": "_3EMJWG_tickAppear",
	"tip": "_3EMJWG_tip",
	"tipReply": "_3EMJWG_tipReply",
	"tipUser": "_3EMJWG_tipUser",
	"viewport": "_3EMJWG_viewport",
	"tick": "_3EMJWG_tick",
	"tickActive": "_3EMJWG_tickActive"
};

//#endregion
//#region src/client/TimelineRail.tsx
const GAP = 12;
const RAIL_PADDING = 12;
const SCROLL_OFFSET = 16;
const HOVER_SIGMA = 2.5;
const AUTO_LOAD_RETRY_MS = 250;
function scrollToMessage(key, host) {
	if (host === null) return;
	const scroll = host.closest("[data-conversation-scroll]");
	if (scroll === null) return;
	const flow = scroll.querySelector("[data-chat-flow]");
	const rows = flow === null ? scroll.querySelectorAll("[data-chat-anchor-key]") : flow.querySelectorAll("[data-chat-anchor-key]");
	for (const row of rows) {
		if (row instanceof HTMLElement && row.dataset.chatAnchorKey !== key) continue;
		if (!(row instanceof HTMLElement)) continue;
		const sr = scroll.getBoundingClientRect();
		scroll.scrollTop += row.getBoundingClientRect().top - sr.top - SCROLL_OFFSET;
		return;
	}
}
function selectMessages(chat) {
	if (chat === void 0) return [];
	const out = [];
	const order = chat.order;
	for (let i = 0; i < order.length; i++) {
		const key = order[i];
		const node = chat.nodes.get(key);
		if (node === void 0 || node.kind !== "user") continue;
		const data = node.data;
		let reply = "";
		for (let j = i + 1; j < order.length; j++) {
			const next = chat.nodes.get(order[j]);
			if (next === void 0) continue;
			if (next.kind === "user") break;
			if (next.kind !== "assistant" && next.kind !== "assistant-step") continue;
			reply += textOfAssistantNode(next.data);
		}
		out.push({
			key,
			text: textOfContent(data?.content),
			hasImage: hasImageContent(data?.content),
			reply
		});
	}
	return out;
}
/** Gaussian decay: smooth magnifying-glass scale based on distance from mouse. */
function hoverScale(index, hoverPos) {
	if (hoverPos === null) return 1;
	const d = index - hoverPos;
	const factor = Math.exp(-(d * d) / (2 * HOVER_SIGMA * HOVER_SIGMA));
	return 1 + .7 * factor;
}
function layoutFor(count, height) {
	const marksHeight = Math.max(0, count - 1) * GAP;
	const contentHeight = Math.max(height, RAIL_PADDING * 2 + marksHeight);
	const start = contentHeight === height ? (height - marksHeight) / 2 : RAIL_PADDING;
	return {
		contentHeight,
		start,
		gap: count <= 1 ? 0 : GAP
	};
}
function TimelineRail({ useSession, t, loadOlder }) {
	const hostRef = (0, react.useRef)(null);
	const autoLoadInFlight = (0, react.useRef)(false);
	const autoLoadStopped = (0, react.useRef)(false);
	const retryTimerRef = (0, react.useRef)(null);
	const disposedRef = (0, react.useRef)(false);
	const sessionStateRef = (0, react.useRef)({
		openState: "cold",
		hasMore: false,
		loadingOlder: false
	});
	const pendingScrollRestore = (0, react.useRef)(null);
	const railViewportRef = (0, react.useRef)(null);
	const railContentHeight = (0, react.useRef)(null);
	const railPinnedBottom = (0, react.useRef)(true);
	const [geometry, setGeometry] = (0, react.useState)(null);
	const [conversationVisible, setConversationVisible] = (0, react.useState)(false);
	const [hover, setHover] = (0, react.useState)(null);
	const [activeKey, setActiveKey] = (0, react.useState)(null);
	const chat = useSession((s) => s.chat);
	const order = useSession((s) => s.chat.order);
	const openState = useSession((s) => s.openState);
	const hasMore = useSession((s) => s.hasMore);
	const loadingOlder = useSession((s) => s.loadingOlder);
	const allMessages = (0, react.useMemo)(() => selectMessages(chat), [chat]);
	const count = allMessages.length;
	sessionStateRef.current = {
		openState,
		hasMore,
		loadingOlder
	};
	(0, react.useLayoutEffect)(() => {
		const restore = pendingScrollRestore.current;
		if (restore === null) return;
		const delta = restore.scroll.scrollHeight - restore.height;
		restore.scroll.scrollTop = restore.top + delta;
		pendingScrollRestore.current = null;
	}, [order]);
	(0, react.useEffect)(() => {
		if (!conversationVisible) return;
		disposedRef.current = false;
		const schedule = () => {
			if (disposedRef.current || retryTimerRef.current !== null) return;
			retryTimerRef.current = setTimeout(() => {
				retryTimerRef.current = null;
				drain();
			}, AUTO_LOAD_RETRY_MS);
		};
		const drain = async () => {
			if (disposedRef.current || autoLoadInFlight.current || autoLoadStopped.current) return;
			const state = sessionStateRef.current;
			if (state.openState !== "open" || !state.hasMore || state.loadingOlder) {
				if (state.openState === "open" && !state.hasMore) autoLoadStopped.current = true;
				else schedule();
				return;
			}
			const host = hostRef.current;
			const scroll = host?.closest("[data-conversation-scroll]");
			if (scroll instanceof HTMLElement) pendingScrollRestore.current = {
				scroll,
				height: scroll.scrollHeight,
				top: scroll.scrollTop
			};
			autoLoadInFlight.current = true;
			try {
				await loadOlder();
			} catch (error) {
				console.error("[dsh-timeline-rail] automatic history loading failed:", error);
			} finally {
				autoLoadInFlight.current = false;
				schedule();
			}
		};
		drain();
		return () => {
			disposedRef.current = true;
			if (retryTimerRef.current !== null) {
				clearTimeout(retryTimerRef.current);
				retryTimerRef.current = null;
			}
		};
	}, [loadOlder, conversationVisible]);
	(0, react.useEffect)(() => {
		const updateVisibility = () => {
			const host$1 = hostRef.current;
			const scroll$1 = host$1?.closest("[data-conversation-scroll]");
			const composer$1 = scroll$1?.querySelector("[data-composer-seat]");
			const chatFlow$1 = scroll$1?.querySelector("[data-chat-flow]");
			const trajectoryScroll = scroll$1?.querySelector("[data-trajectory-scroll]");
			if (!(scroll$1 instanceof HTMLElement) || !(composer$1 instanceof HTMLElement) || !(chatFlow$1 instanceof HTMLElement) || trajectoryScroll !== null) {
				setConversationVisible(false);
				return;
			}
			const scrollRect = scroll$1.getBoundingClientRect();
			const composerRect = composer$1.getBoundingClientRect();
			const chatStyle = getComputedStyle(chatFlow$1);
			const scrollStyle = getComputedStyle(scroll$1);
			const composerStyle = getComputedStyle(composer$1);
			const visible = scrollRect.width > 0 && scrollRect.height > 0 && composerRect.width > 0 && composerRect.height > 0 && scrollStyle.display !== "none" && scrollStyle.visibility !== "hidden" && composerStyle.display !== "none" && composerStyle.visibility !== "hidden" && chatStyle.display !== "none" && chatStyle.visibility !== "hidden";
			setConversationVisible(visible);
			if (!visible) {
				setHover(null);
				setGeometry(null);
			}
		};
		updateVisibility();
		const mutationObserver = new MutationObserver(updateVisibility);
		mutationObserver.observe(document.body, {
			childList: true,
			subtree: true,
			attributes: true,
			attributeFilter: [
				"class",
				"style",
				"hidden"
			]
		});
		const resizeObserver = new ResizeObserver(updateVisibility);
		const host = hostRef.current;
		const scroll = host?.closest("[data-conversation-scroll]");
		const composer = scroll?.querySelector("[data-composer-seat]");
		const chatFlow = scroll?.querySelector("[data-chat-flow]");
		if (scroll instanceof HTMLElement) resizeObserver.observe(scroll);
		if (composer instanceof HTMLElement) resizeObserver.observe(composer);
		if (chatFlow instanceof HTMLElement) resizeObserver.observe(chatFlow);
		window.addEventListener("resize", updateVisibility);
		return () => {
			mutationObserver.disconnect();
			resizeObserver.disconnect();
			window.removeEventListener("resize", updateVisibility);
		};
	}, []);
	(0, react.useEffect)(() => {
		const host = hostRef.current;
		const scroll = host === null ? null : host.closest("[data-conversation-scroll]");
		if (!conversationVisible || count === 0 || scroll === null) return;
		let raf = 0;
		const measure = () => {
			try {
				const sr = scroll.getBoundingClientRect();
				const paddingTop = parseFloat(getComputedStyle(scroll).paddingTop) || 0;
				const composer$1 = scroll.querySelector("[data-composer-seat]");
				const cr = composer$1 === null ? null : composer$1.getBoundingClientRect();
				const top = Math.max(0, sr.top + paddingTop);
				const bottom = Math.min(window.innerHeight, sr.bottom, cr === null ? window.innerHeight : cr.top);
				const height = Math.max(0, bottom - top);
				const gutter = Math.max(0, scroll instanceof HTMLElement ? scroll.offsetWidth - scroll.clientWidth : 0);
				setGeometry({
					top,
					height,
					right: Math.max(0, window.innerWidth - sr.right) + gutter + 4
				});
			} catch {}
		};
		measure();
		const ro = new ResizeObserver(() => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(measure);
		});
		ro.observe(scroll);
		const composer = scroll.querySelector("[data-composer-seat]");
		if (composer !== null) ro.observe(composer);
		const flow = scroll.querySelector("[data-chat-flow]");
		if (flow !== null) ro.observe(flow);
		const onWin = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(measure);
		};
		const onScroll = () => {
			cancelAnimationFrame(raf);
			raf = requestAnimationFrame(measure);
		};
		window.addEventListener("resize", onWin);
		scroll.addEventListener("scroll", onScroll, { passive: true });
		return () => {
			ro.disconnect();
			window.removeEventListener("resize", onWin);
			scroll.removeEventListener("scroll", onScroll);
			cancelAnimationFrame(raf);
		};
	}, [count, conversationVisible]);
	(0, react.useEffect)(() => {
		const host = hostRef.current;
		const scroll = host === null ? null : host.closest("[data-conversation-scroll]");
		if (!conversationVisible || scroll === null || allMessages.length === 0) return;
		const keys = new Set(allMessages.map((m) => m.key));
		const flow = scroll.querySelector("[data-chat-flow]");
		const rows = (flow ?? scroll).querySelectorAll("[data-chat-anchor-key]");
		const visible = /* @__PURE__ */ new Map();
		const observer = new IntersectionObserver((entries) => {
			for (const e of entries) {
				const k = e.target.dataset.chatAnchorKey;
				if (k === void 0) continue;
				if (e.isIntersecting) visible.set(k, e.intersectionRatio);
				else visible.delete(k);
			}
			let best = null;
			let bestRatio = -1;
			for (const [k, r] of visible) {
				if (!keys.has(k)) continue;
				if (r > bestRatio) {
					bestRatio = r;
					best = k;
				}
			}
			setActiveKey(best);
		}, {
			root: scroll,
			threshold: [
				0,
				.1,
				.25,
				.5,
				.75,
				1
			]
		});
		for (const row of rows) if (row instanceof HTMLElement) observer.observe(row);
		return () => observer.disconnect();
	}, [allMessages]);
	const ready = conversationVisible && count > 0 && geometry !== null;
	const railStyle = geometry === null || !conversationVisible ? {
		top: 0,
		height: 0,
		right: 0,
		opacity: 0,
		pointerEvents: "none"
	} : {
		top: geometry.top,
		height: geometry.height,
		right: geometry.right,
		opacity: 1,
		pointerEvents: "auto"
	};
	const layout = geometry === null ? null : layoutFor(count, geometry.height);
	const tickTop = (index) => layout === null ? 0 : layout.start + index * layout.gap;
	(0, react.useLayoutEffect)(() => {
		const viewport = railViewportRef.current;
		if (viewport === null || layout === null) return;
		const contentHeight = layout.contentHeight;
		if (railContentHeight.current === contentHeight && !railPinnedBottom.current) return;
		railContentHeight.current = contentHeight;
		if (railPinnedBottom.current) viewport.scrollTop = viewport.scrollHeight;
	}, [layout?.contentHeight, count]);
	const onRailScroll = (e) => {
		const viewport = e.currentTarget;
		railPinnedBottom.current = viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight <= 1;
	};
	const tip = (() => {
		if (!ready || hover === null || layout === null || geometry === null) return null;
		const idx = Math.round(hover);
		const message = allMessages[idx];
		if (message === void 0) return null;
		const viewport = railViewportRef.current;
		const scrollTop = viewport?.scrollTop ?? 0;
		const viewportTop = geometry.top;
		const top = viewportTop + tickTop(idx) - scrollTop;
		const right = geometry.right + 28 + 10;
		return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
			className: timeline_rail_module_css_default.tip,
			style: {
				top,
				right,
				transform: "translateY(-50%)"
			},
			children: [/* @__PURE__ */ (0, react_jsx_runtime.jsxs)("p", {
				className: timeline_rail_module_css_default.tipUser,
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("span", {
					className: timeline_rail_module_css_default.tipNth,
					children: t("tip.nth", { n: idx + 1 })
				}), message.text.length > 0 ? message.text : message.hasImage ? t("tip.image") : t("tip.attachment")]
			}), message.reply.length > 0 && /* @__PURE__ */ (0, react_jsx_runtime.jsx)("p", {
				className: timeline_rail_module_css_default.tipReply,
				children: message.reply
			})]
		}, "tip");
	})();
	/** Track nearest tick position from mouse Y — includes the rail viewport scroll offset. */
	const onRailMouseMove = (e) => {
		if (!ready || layout === null || layout.gap === 0) return;
		const viewport = e.currentTarget;
		const mouseY = e.clientY - viewport.getBoundingClientRect().top + viewport.scrollTop;
		const rawIndex = (mouseY - layout.start) / layout.gap;
		const clamped = Math.max(0, Math.min(count - 1, rawIndex));
		setHover(clamped);
	};
	const onRailMouseLeave = () => setHover(null);
	return /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
		ref: hostRef,
		className: timeline_rail_module_css_default.rail,
		style: railStyle,
		role: "navigation",
		"aria-label": t("rail.aria"),
		children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", {
			ref: railViewportRef,
			className: timeline_rail_module_css_default.viewport,
			onScroll: onRailScroll,
			onMouseMove: onRailMouseMove,
			onMouseLeave: onRailMouseLeave,
			children: /* @__PURE__ */ (0, react_jsx_runtime.jsxs)("div", {
				className: timeline_rail_module_css_default.content,
				style: { height: layout?.contentHeight ?? 0 },
				children: [/* @__PURE__ */ (0, react_jsx_runtime.jsx)("div", { className: timeline_rail_module_css_default.track }), ready && allMessages.map((message, index) => {
					const scale = hoverScale(index, hover);
					const activeClass = activeKey === message.key ? timeline_rail_module_css_default.tickActive : "";
					return /* @__PURE__ */ (0, react_jsx_runtime.jsx)("button", {
						type: "button",
						className: `${timeline_rail_module_css_default.tick} ${activeClass}`,
						style: {
							top: tickTop(index),
							transform: `translate(-50%, -50%) scaleX(${scale})`
						},
						"aria-label": t("marker.aria", { n: index + 1 }),
						onClick: () => scrollToMessage(message.key, hostRef.current)
					}, message.key);
				})]
			})
		}), tip]
	});
}

//#endregion
//#region src/client/index.ts
/** Required service: the slot registry and the locale store. */
const inject = [
	"slots",
	"locale",
	"conversation",
	"sessions"
];
/**
* Register the timeline rail dock entry. Registration rides `slots.inject`,
* so it waits on the slot declaration, survives its redeclaration, and is
* removed together with this plugin.
* @param ctx - client root context.
*/
function apply(ctx) {
	ctx.effect(() => ctx.locale.register(NS, {
		zh,
		en
	}), "dsh-timeline-rail: dictionaries");
	ctx.slots.inject("conversation.input.dock", () => ctx.slots.register({
		name: "conversation.input.dock",
		id: "timeline-rail",
		order: 100,
		locale: NS,
		inject: (sessionId) => {
			const actx = ctx.sessions.scope(sessionId);
			if (actx === void 0) throw new Error(`dsh-timeline-rail: session "${sessionId}" resolved no scope`);
			const conversation = actx.get("conversation");
			if (conversation === void 0) throw new Error("dsh-timeline-rail: conversation service unavailable");
			return { loadOlder: () => conversation.loadOlder() };
		}
	}, TimelineRail));
}

//#endregion
exports.apply = apply;
exports.inject = inject;
return module.exports; } });
//# sourceMappingURL=client.js.map