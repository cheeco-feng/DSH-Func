window.__ModuleLoader__.load({
	id: "@cheeco/dsh-client-ui-message-sound",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		// React for the「声音管理」设置页（渲染到系统包的 sound-manage 子 slot）。
		var react = require("react");
		var react_jsx_runtime = require("react/jsx-runtime");

		// 注入设置卡样式（幂等），类名与 cheeco-style 共用但样式由本插件自注入，不依赖其安装。
		(function () {
			if (typeof document === "undefined" || document.querySelector('style[data-plugin="dsh-client-ui-message-sound"]')) return;
			var css = ".dsh-web-ui-cheeco-style-section{box-sizing:border-box;background:var(--dsw-alias-bg-layer-2,#fff);border:1px solid var(--dsw-alias-border-l1,#e5e5e5);border-radius:12px;padding:16px 18px;box-shadow:0 1px 2px rgba(0,0,0,.04);}"
				+ ".dsh-web-ui-cheeco-style-section h3{margin:0 0 10px;font-size:16px;font-weight:600;color:var(--dsw-alias-label-primary,#1a1a1a);}"
				+ ".dsh-web-ui-cheeco-style-state{margin:0 0 10px;font-size:13px;line-height:20px;color:var(--dsw-alias-label-secondary,#666);}"
				+ ".dsh-web-ui-cheeco-style-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:4px;}"
				+ ".dsh-web-ui-cheeco-style-action{box-sizing:border-box;cursor:pointer;border:1px solid var(--dsw-alias-border-l2,#d9d9d9);background:var(--dsw-alias-bg-layer-3,#fff);color:var(--dsw-alias-label-primary,#1a1a1a);font-family:inherit;font-size:13px;line-height:20px;border-radius:8px;padding:6px 14px;transition:background .15s,border-color .15s,box-shadow .15s;}"
				+ ".dsh-web-ui-cheeco-style-action:hover{background:var(--dsw-alias-interactive-bg-hover,#f5f5f5);border-color:var(--dsw-alias-state-business-primary,#3498db);}";
			var tag = document.createElement("style");
			tag.dataset.plugin = "dsh-client-ui-message-sound";
			tag.textContent = css;
			document.head.appendChild(tag);
		})();

		//#region message-sound config
		/**
		* Sound settings live in the DSH系统包 config file (GET /dsh-system/config):
		* the on/off flag and chosen sound under the nested `sound` object.
		* (Moved off cheeco-style, which is deprecated/removed.)
		*/
		var CFG_ENDPOINT = "/dsh-system/config";
		var CFG_CHANGE_EVENT = "cheeco-config-change";
		/** In-memory config: enabled flag + custom sound URL ("" = use the chime). */
		var cfg = { soundEnabled: true, soundSrc: "" };
		/** Fetch the config and refresh `cfg`. Best-effort; never throws. */
		function refreshConfig() {
			try {
				fetch(CFG_ENDPOINT, { cache: "no-store" })
					.then(function (r) { return r.ok ? r.json() : {}; })
					.then(function (d) {
						var s = (d && typeof d.sound === "object" && d.sound) ? d.sound : {};
						cfg.soundEnabled = s.enabled !== false;
						cfg.soundSrc = typeof s.src === "string" ? s.src : "";
						log("config loaded:", cfg);
					})
					.catch(function (e) { log("config fetch error:", e); });
			} catch (e) { log("config load error:", e); }
		}
		if (typeof window !== "undefined") {
			try { window.addEventListener(CFG_CHANGE_EVENT, refreshConfig); } catch (e) {}
		}
		/** Volume 0..1. */
		var VOLUME = 0.6;
		/** Diagnostic logging to the browser console (DevTools). */
		var DEBUG = true;
		/** Delay (ms) before observing, so existing messages rendered on load don't ring. */
		var STARTUP_GRACE_MS = 4000;
		/** Minimum gap (ms) between two plays, so a re-render can't cause a double ring. */
		var PLAY_COOLDOWN_MS = 4000;
		/** Small beat (ms) after the closing footer appears before we ring. */
		var TAIL_DELAY_MS = 400;
		/** Match any DSH flow-item marker. */
		var FLOW_SELECTOR = '[data-chat-flow-kind]';
		//#endregion

		function log() {
			if (DEBUG) { try { console.log.apply(console, ["[message-sound]"].concat(Array.prototype.slice.call(arguments))); } catch (e) {} }
		}

		//#region sound playback
		// Chrome/Edge suspend an AudioContext created outside a user gesture, so a
		// fresh context created per beep can be silent. Reuse ONE persistent context
		// and unlock it on the first pointer/key/touch input so the chime audibly plays.
		var sharedCtx = null;
		function ensureCtx() {
			if (sharedCtx !== null) return sharedCtx;
			var Ctx = window.AudioContext || window.webkitAudioContext;
			if (!Ctx) { log("AudioContext not supported"); return null; }
			try { sharedCtx = new Ctx(); } catch (e) { log("AudioContext create error:", e); return null; }
			return sharedCtx;
		}
		function unlockAudio() {
			var ctx = ensureCtx();
			if (ctx && ctx.state === "suspended" && ctx.resume) {
				try {
					var p = ctx.resume();
					if (p && p.then) p.then(function () { log("audio unlocked"); }).catch(function (err) { log("audio resume rejected:", err && err.message); });
				} catch (e) {}
			}
		}
		function armAudioUnlock() {
			if (typeof document === "undefined" || !document.addEventListener) return;
			var opts = { once: true, capture: true };
			try { ["pointerdown", "mousedown", "keydown", "touchstart"].forEach(function (type) { document.addEventListener(type, unlockAudio, opts); }); } catch (e) { log("audio unlock arm error:", e); }
		}
		function playTone(freq, offset, dur) {
			var ctx = ensureCtx();
			if (!ctx) { log("AudioContext not available"); return false; }
			try {
				if (ctx.state === "suspended" && ctx.resume) { try { ctx.resume(); } catch (e) {} }
				var t0 = ctx.currentTime + offset;
				var osc = ctx.createOscillator();
				var gain = ctx.createGain();
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, t0);
				gain.gain.setValueAtTime(0.0001, t0);
				gain.gain.exponentialRampToValueAtTime(VOLUME, t0 + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(t0);
				osc.stop(t0 + dur + 0.05);
				return ctx.state !== "suspended";
			} catch (e) { log("playTone error:", e); return false; }
		}
		function playBeep() {
			var a = playTone(880, 0, 0.18);
			var b = playTone(1318.5, 0.12, 0.30);
			log("web-audio beep ok=", a, b);
		}
		function playFile(src) {
			try {
				var a = new Audio(src);
				a.volume = VOLUME;
				var p = a.play();
				if (p && p.then) p.then(function(){ log("custom sound playing"); }).catch(function(err){ log("custom sound play rejected:", err && err.message); });
				else log("custom sound play() called");
			} catch (e) { log("custom sound error:", e); }
		}
		// Custom sound file chosen in the settings card (hosted at /cheeco-style/assets/...).
		// Play it if set, else fall back to the Web Audio chime.
		function play() {
			var src = cfg.soundSrc || "";
			if (src) playFile(src); else playBeep();
		}
		window.__dshMsgSoundTest = function () { log("manual test invoked"); play(); return "played"; };
		//#endregion

		//#region ring once when a turn closes
		var mainObserver = null;
		var lastPlay = 0;
		var seenKeys = new Set();
		// Shared on/off toggle (set by the "改风格" settings card). Default on.
		function soundEnabled() {
			return cfg.soundEnabled;
		}

		// The turn-tail row carries data-turn-tail = the turn number, which is genuinely
		// unique per turn. The app can reuse the same flow key (data-chat-flow-key) for the
		// resident turn-tail row, so prefer the turn number for dedup to avoid suppressing
		// later turns; fall back to the flow key otherwise.
		function uniqueTurnKey(el) {
			if (!el || !el.getAttribute) return "";
			var direct = el.getAttribute("data-turn-tail");
			if (direct) return direct;
			var inner = el.querySelector ? el.querySelector("[data-turn-tail]") : null;
			if (inner && inner.getAttribute) {
				var turn = inner.getAttribute("data-turn-tail");
				if (turn) return turn;
			}
			return el.getAttribute("data-chat-flow-key") || el.getAttribute("data-chat-anchor-key") || "";
		}

		// The turn-tail node is the closing footer appended at the end of a turn.
		// Its appearance is exactly the "I finished sending everything" moment.
		function watchTurnTail(el) {
			if (!el || !el.getAttribute) return;
			var key = uniqueTurnKey(el);
			if (!key) return;
			if (seenKeys.has(key)) return;
			seenKeys.add(key);
			setTimeout(function () {
				if (soundEnabled() && Date.now() - lastPlay >= (PLAY_COOLDOWN_MS || 4000)) {
					lastPlay = Date.now();
					log("turn finished, playing sound");
					play();
				}
			}, TAIL_DELAY_MS);
		}

		function handleNode(n) {
			if (!n || n.nodeType !== 1) return;
			var kindEl = (n.matches && n.matches(FLOW_SELECTOR)) ? n : (n.querySelector ? n.querySelector(FLOW_SELECTOR) : null);
			if (kindEl && kindEl.getAttribute("data-chat-flow-kind") === "turn-tail") watchTurnTail(kindEl);
			if (n.querySelectorAll) {
				var all = n.querySelectorAll(FLOW_SELECTOR);
				for (var i = 0; i < all.length; i++) if (all[i].getAttribute("data-chat-flow-kind") === "turn-tail") watchTurnTail(all[i]);
			}
		}
		// Reliable safety-net: the conversation UI can add or update the turn-tail row in
		// ways the added-node observer misses (in-place React updates, virtualized lists).
		// Re-scan every turn-tail row and ring any we have not yet seen; the per-row key
		// dedup ensures each turn rings once, old rows never re-ring, and the cooldown
		// stops any near-duplicate within the same turn.
		function scanForTurnTail() {
			if (typeof document === "undefined" || !document.querySelectorAll) return;
			var all = document.querySelectorAll('[data-chat-flow-kind="turn-tail"]');
			for (var i = 0; i < all.length; i++) watchTurnTail(all[i]);
		}

		//#region 「声音管理」设置页（与播放共享同一份 DSH系统包配置）
		var ASSETS_ENDPOINT = "/dsh-system/assets";
		function uploadSound(file) {
			return fetch(ASSETS_ENDPOINT + "?name=" + encodeURIComponent(file.name), {
				method: "POST",
				headers: { "content-type": file.type || "application/octet-stream" },
				body: file
			}).then(function (r) { return r.json(); }).then(function (d) {
				return d && d.ok && d.url ? d.url : "";
			}).catch(function () { return ""; });
		}
		function readSoundConfig() {
			return fetch(CFG_ENDPOINT, { cache: "no-store" }).then(function (r) { return r.ok ? r.json() : {}; }).catch(function () { return {}; });
		}
		function writeSoundConfig(patch) {
			return readSoundConfig().then(function (cur) {
				var curSound = (cur && typeof cur.sound === "object" && cur.sound) ? cur.sound : {};
				return fetch(CFG_ENDPOINT, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(Object.assign({}, cur, { sound: Object.assign({}, curSound, patch) })) });
			}).then(function () {
				// 通知播放端刷新（本插件监听 cheeco-config-change）。设置改完即时生效。
				try { window.dispatchEvent(new Event(CFG_CHANGE_EVENT)); } catch (e) {}
			}).catch(function () {});
		}
		function SoundManageTab() {
			var onPair = react.useState(true);
			var soundPair = react.useState("默认提示音(叮咚)");
			var srcPair = react.useState("");
			var fileRef = react.useRef(null);
			react.useEffect(function () {
				var cancelled = false;
				readSoundConfig().then(function (cfg) {
					if (cancelled) return;
					var s = (cfg && typeof cfg.sound === "object" && cfg.sound) ? cfg.sound : {};
					onPair[1](s.enabled !== false);
					soundPair[1](s.name || "默认提示音(叮咚)");
					srcPair[1](s.src || "");
				});
				return function () { cancelled = true; };
			}, []);
			function toggle() {
				var next = !onPair[0];
				onPair[1](next);
				writeSoundConfig({ enabled: next });
			}
			function choose() { if (fileRef.current) fileRef.current.click(); }
			function onFile(e) {
				var f = e.target.files && e.target.files[0];
				if (!f) return;
				uploadSound(f).then(function (url) {
					if (url) { soundPair[1](f.name); srcPair[1](url); writeSoundConfig({ src: url, name: f.name }); }
				});
				e.target.value = "";
			}
			function reset() {
				soundPair[1]("默认提示音(叮咚)"); srcPair[1]("");
				writeSoundConfig({ src: "", name: "" });
			}
			function preview() {
				if (!onPair[0]) { alert("声音已关闭，请先开启声音"); return; }
				if (srcPair[0]) {
					try {
						var a = new Audio(srcPair[0]);
						a.volume = 0.6;
						var p = a.play();
						if (p && p.catch) p.catch(function () {});
						return;
					} catch (e) {}
				}
				try {
					var Ctx = window.AudioContext || window.webkitAudioContext;
					if (!Ctx) return;
					var actx = new Ctx();
					if (actx.state === "suspended" && actx.resume) actx.resume();
					function tone(freq, off, dur) {
						var osc = actx.createOscillator(), g = actx.createGain(), t0 = actx.currentTime + off;
						osc.type = "sine"; osc.frequency.setValueAtTime(freq, t0);
						g.gain.setValueAtTime(0.0001, t0);
						g.gain.exponentialRampToValueAtTime(0.6, t0 + 0.02);
						g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
						osc.connect(g); g.connect(actx.destination);
						osc.start(t0); osc.stop(t0 + dur + 0.05);
					}
					tone(880, 0, 0.18); tone(1318.5, 0.12, 0.30);
					setTimeout(function () { try { actx.close(); } catch (e) {} }, 700);
				} catch (e) {}
			}
			return react_jsx_runtime.jsx("div", {
				className: "dsh-web-ui-cheeco-style-section",
				children: [
					react_jsx_runtime.jsx("h3", { children: "声音提示音" }),
					react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: onPair[0] ? "已开启：AI 回复结束时播放提示音。" : "已关闭：AI 回复时不再播放提示音。" }),
					react_jsx_runtime.jsx("p", { className: "dsh-web-ui-cheeco-style-state", children: "当前声音：" + soundPair[0] }),
					react_jsx_runtime.jsx("div", { className: "dsh-web-ui-cheeco-style-actions", children: [
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: toggle, children: onPair[0] ? "关闭声音" : "开启声音" }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: choose, children: "选择声音文件" }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: preview, children: "试听" }),
						react_jsx_runtime.jsx("button", { type: "button", className: "dsh-web-ui-cheeco-style-action", onClick: reset, children: "恢复默认" })
					] }),
					react_jsx_runtime.jsx("input", { type: "file", accept: "audio/*", ref: fileRef, style: { display: "none" }, onChange: onFile })
				]
			});
		}
		//#endregion

		function Apply(ctx) {
			// 「声音管理」设置页：融合进本插件，注册到 DSH系统包（dsh-web-ui-SystemPackagePanel）
			// 预留的「声音管理」子 slot（由系统包内页「声音管理」tab 通过 renderSlot 渲染）。
			// 设置数据读/写 /cheeco-style/config 的 soundEnabled/soundSrc，自定义声音文件上传到
			// /cheeco-style/assets —— 与下方播放逻辑共享同一套配置，因此两者天然一体。
			try {
				ctx.slots.inject("dsh-system-package.sound-manage", function () {
					return ctx.slots.register({
						name: "dsh-system-package.sound-manage",
						id: "sound-manage",
						order: 10
					}, SoundManageTab);
				});
			} catch (e) { log("slot inject error:", e); }

			// 播放逻辑（原 apply 内容，window/document 驱动，与 ctx 无关）。
			if (mainObserver) return;
			// The plugin can be instantiated more than once; keep a single observer.
			if (window.__dshMsgSoundInstalled) return;
			window.__dshMsgSoundInstalled = true;
			log("apply() run; document.readyState=", document.readyState);
			// Read the current sound settings from the config file.
			refreshConfig();
			// Warm up the shared AudioContext on the first user gesture so browsers with
			// an autoplay policy don't keep the chime silent.
			armAudioUnlock();
			// Wait for the conversation's initial render to settle before observing,
			// so already-rendered (existing) messages never trigger a ring on load.
			setTimeout(function () {
				// Snapshot keys of nodes that already exist, so a later re-render of the
				// same message is treated as seen and does not ring.
				var existing = document.querySelectorAll(FLOW_SELECTOR);
				for (var i = 0; i < existing.length; i++) {
					var k = uniqueTurnKey(existing[i]);
					if (k) seenKeys.add(k);
				}
				// Watch only the conversation scrollport so pet/animation overlays elsewhere
				// do not produce false events.
				var container = document.querySelector("[data-conversation-scroll]") || document.body;
				mainObserver = new MutationObserver(function (muts) {
					for (var i = 0; i < muts.length; i++) {
						var added = muts[i].addedNodes;
						for (var j = 0; j < added.length; j++) handleNode(added[j]);
					}
				});
				try {
					mainObserver.observe(container, { childList: true, subtree: true });
					log("observer attached to", container.tagName + "." + (typeof container.className === "string" ? container.className : ""));
				} catch (e) { log("observer attach error:", e); }
				log("startup snapshot keys=", seenKeys.size);
				// Safety-net scan: catch turn-tail rows the added-node observer misses.
				if (window.__dshMsgSoundScan) clearInterval(window.__dshMsgSoundScan);
				window.__dshMsgSoundScan = setInterval(function () {
					try { scanForTurnTail(); } catch (e) { log("scan error:", e); }
				}, 1200);
			}, STARTUP_GRACE_MS);
		}
		//#endregion

		exports.apply = Apply;
		exports.inject = ["slots", "locale"];
		return module.exports;
	}
});
