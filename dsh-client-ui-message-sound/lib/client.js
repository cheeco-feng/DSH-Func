window.__ModuleLoader__.load({
	id: "@cheeco/dsh-client-ui-message-sound",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region message-sound config
		/**
		* Sound settings come from the shared config file served by the host plugin
		* `dsh-web-ui-cheeco-style` (GET /cheeco-style/config): the on/off flag plus
		* the chosen sound (served from /cheeco-style/assets/<file>). They are read
		* into `cfg` on load and refreshed whenever `cheeco-config-change` fires.
		* Nothing lives in localStorage anymore.
		*/
		var CFG_ENDPOINT = "/cheeco-style/config";
		var CFG_CHANGE_EVENT = "cheeco-config-change";
		/** In-memory config: enabled flag + custom sound URL ("" = use the chime). */
		var cfg = { soundEnabled: true, soundSrc: "" };
		/** Fetch the config and refresh `cfg`. Best-effort; never throws. */
		function refreshConfig() {
			try {
				fetch(CFG_ENDPOINT, { cache: "no-store" })
					.then(function (r) { return r.ok ? r.json() : {}; })
					.then(function (d) {
						cfg.soundEnabled = d && d.soundEnabled !== false;
						cfg.soundSrc = d && typeof d.soundSrc === "string" ? d.soundSrc : "";
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

		function apply() {
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

		exports.apply = apply;
		exports.inject = [];
		return module.exports;
	}
});
