window.__ModuleLoader__.load({
	id: "@cheeco/dsh-client-ui-message-sound",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		//#region message-sound config
		/**
		* Sound source. Leave "" to use the built-in Web Audio chime.
		* To play your own sound file, set this to a data: URI (no server needed) or
		* to any URL the running app serves, for example:
		*   var SOUND_SRC = "data:audio/mp3;base64,....";
		* After editing, restart DSH (or reload the page) for it to take effect.
		*/
		var SOUND_SRC = "";
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
		function playTone(freq, offset, dur) {
			try {
				var Ctx = window.AudioContext || window.webkitAudioContext;
				if (!Ctx) { log("AudioContext not supported"); return false; }
				var ctx = new Ctx();
				if (ctx.state === "suspended" && ctx.resume) { try { ctx.resume(); } catch (e) {} }
				var osc = ctx.createOscillator();
				var gain = ctx.createGain();
				var t0 = ctx.currentTime + offset;
				osc.type = "sine";
				osc.frequency.setValueAtTime(freq, t0);
				gain.gain.setValueAtTime(0.0001, t0);
				gain.gain.exponentialRampToValueAtTime(VOLUME, t0 + 0.02);
				gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
				osc.connect(gain);
				gain.connect(ctx.destination);
				osc.start(t0);
				osc.stop(t0 + dur + 0.05);
				setTimeout(function () { try { ctx.close(); } catch (e) {} }, dur * 1000 + 400);
				return true;
			} catch (e) { log("playTone error:", e); return false; }
		}
		function playBeep() {
			var a = playTone(880, 0, 0.18);
			var b = playTone(1318.5, 0.12, 0.30);
			log("web-audio beep ok=", a, b);
		}
		function playFile() {
			try {
				var a = new Audio(SOUND_SRC);
				a.volume = VOLUME;
				var p = a.play();
				if (p && p.then) p.then(function(){ log("file audio playing"); }).catch(function(err){ log("file audio play rejected:", err && err.message); });
				else log("file audio play() called");
			} catch (e) { log("file audio error:", e); }
		}
		function play() {
			if (SOUND_SRC) playFile(); else playBeep();
		}
		window.__dshMsgSoundTest = function () { log("manual test invoked"); play(); return "played"; };
		//#endregion

		//#region ring once when a turn closes
		var mainObserver = null;
		var lastPlay = 0;
		var seenKeys = new Set();
		// Shared on/off toggle (set by the "改风格" settings card). Default on.
		var ENABLED_KEY = "dsh-msg-sound-enabled";
		function soundEnabled() {
			try { return localStorage.getItem(ENABLED_KEY) !== "0"; } catch (e) { return true; }
		}

		// The turn-tail node is the closing footer appended at the end of a turn.
		// Its appearance is exactly the "I finished sending everything" moment.
		function watchTurnTail(el) {
			if (!el || !el.getAttribute) return;
			var key = el.getAttribute("data-chat-flow-key") || el.getAttribute("data-chat-anchor-key") || "";
			if (key && seenKeys.has(key)) return;
			if (key) seenKeys.add(key);
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

		function apply() {
			if (mainObserver) return;
			// The plugin can be instantiated more than once; keep a single observer.
			if (window.__dshMsgSoundInstalled) return;
			window.__dshMsgSoundInstalled = true;
			log("apply() run; document.readyState=", document.readyState);
			// Wait for the conversation's initial render to settle before observing,
			// so already-rendered (existing) messages never trigger a ring on load.
			setTimeout(function () {
				// Snapshot keys of nodes that already exist, so a later re-render of the
				// same message is treated as seen and does not ring.
				var existing = document.querySelectorAll(FLOW_SELECTOR);
				for (var i = 0; i < existing.length; i++) {
					var k = existing[i].getAttribute("data-chat-flow-key") || existing[i].getAttribute("data-chat-anchor-key");
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
			}, STARTUP_GRACE_MS);
		}
		//#endregion

		exports.apply = apply;
		exports.inject = [];
		return module.exports;
	}
});
