/** dsh-web-ui-cheeco-style host half — a minimal Cordis plugin (class shape).
    Cordis loads a plugin whose default export is a class by `new Class(ctx, config)`
    (see cordis Fiber execute: `isConstructor(runtime.callback)` -> `new`). This is
    the same shape official @deepseek-ai host plugins use (e.g. dsh-host-webserver),
    so it is guaranteed to load.

    Host responsibilities:
      - Expose a shared config file to the browser half over an HTTP route served
        by the `webServer` service:
            GET  /cheeco-style/config  -> read config/cheeco-config.json
            POST /cheeco-style/config  -> write config/cheeco-config.json
      - Store user-picked local resources (logo image, custom sound) as real files
        in the plugin's assets/ directory, so nothing heavy ends up in the browser
        cache as base64:
            POST /cheeco-style/assets?name=<file>  -> write assets/<file>
            GET  /cheeco-style/assets/<file>       -> serve it back (for <img>/<audio>)
      - All browser-UI work lives in the browser half (lib/client.js). */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";

/** Route the browser half fetches (same-origin, served by our own webServer). */
const CONFIG_PATH = "/cheeco-style/config";
/** Prefix serving / receiving the plugin's uploaded assets (images + audio). */
const ASSETS_PREFIX = "/cheeco-style/assets";

/** Resolve config/cheeco-config.json relative to this plugin's install root.
    lib/index.js -> plugin root (one level up) -> config/cheeco-config.json. */
function resolveConfigFile() {
	const here = dirname(fileURLToPath(import.meta.url));
	const root = dirname(here);
	return join(root, "config", "cheeco-config.json");
}

/** Resolve the plugin's assets/ resource directory. */
function resolveAssetsDir() {
	const here = dirname(fileURLToPath(import.meta.url));
	const root = dirname(here);
	return join(root, "assets");
}

/** Guess a content-type from a file extension (images + common audio). */
function contentTypeOf(name) {
	const ext = basename(name).slice(basename(name).lastIndexOf(".")).toLowerCase();
	const map = {
		".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
		".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
		".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".oga": "audio/ogg",
		".m4a": "audio/mp4", ".aac": "audio/aac", ".webm": "audio/webm", ".flac": "audio/flac", ".caf": "audio/x-caf"
	};
	return map[ext] || "application/octet-stream";
}

/** Read the full request body as a string. */
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => {
			data += chunk;
		});
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}

/** Read the full request body as a Buffer (for binary uploads). */
function readBodyBuffer(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => {
			chunks.push(chunk);
		});
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

/** Keep only safe filename characters and never allow path traversal. */
function sanitizeName(name) {
	const base = basename(String(name || ""));
	const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
	// Random/date prefix avoids a same-named upload clobbering an earlier asset.
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}_${cleaned}`;
}

/** Strip JSONC comments (full-line `//` or `#`, and `/* ... */` blocks) so the
 *  commented config file can still be parsed as plain JSON. Values never start a
 *  line with `//` (e.g. a `https://...` URL is mid-line), so this is safe. */
function stripJsonComments(text) {
	let out = String(text || "").replace(/\/\*[\s\S]*?\*\//g, "");
	out = out
		.split("\n")
		.map((line) => {
			const t = line.trim();
			if (t.startsWith("//") || t.startsWith("#")) return "";
			return line;
		})
		.join("\n");
	return out;
}

/** Render the config as a human-editable, commented JSONC document. The comments
 *  are canonical documentation; only the values change between writes. */
function renderConfigFile(v) {
	const s = (x) => JSON.stringify(x ?? "");
	return [
		"{",
		"  // 左侧顶部标题；留空则显示官方品牌名",
		`  "brandTitle": ${s(v.brandTitle)},`,
		"  // Logo：远程图片网址；或选本地图后上传到 assets/ 得到的 URL（/cheeco-style/assets/…）；留空显示官方品牌",
		`  "brandLogoUrl": ${s(v.brandLogoUrl)},`,
		"  // 兼容用的旧版本地图片 base64（新版本不再写入，恒为空字符串）",
		`  "brandLogoData": ${s(v.brandLogoData)},`,
		"  // 侧边栏设置页的名字；留空用默认「Cheeco的小功能」",
		`  "label": ${s(v.label)},`,
		"  // AI 回复结束时是否响一声提示音（true/false）",
		`  "soundEnabled": ${v.soundEnabled === false ? "false" : "true"},`,
		"  // 自定义提示音文件的资源目录 URL（/cheeco-style/assets/…）；空则用默认双音提示音",
		`  "soundSrc": ${s(v.soundSrc)},`,
		"  // 自定义提示音文件名（仅作显示）",
		`  "soundName": ${s(v.soundName)}`,
		"}"
	].join("\n");
}

export default class DshWebUiPatches {
	static name = "web-ui-patches";
	static inject = ["webServer"];

	constructor(ctx, config) {
		const configFile = resolveConfigFile();
		const assetsDir = resolveAssetsDir();
		ctx.effect(() => {
			const disposeConfig = ctx.webServer.register({
				kind: "exact",
				path: CONFIG_PATH,
				handler: (req, res) => {
					this.handleConfig(ctx, configFile, req, res).catch((err) => {
						this.fail(ctx, res, err);
					});
				}
			});
			const disposeAssets = ctx.webServer.register({
				kind: "prefix",
				path: ASSETS_PREFIX,
				handler: (req, res) => {
					this.handleAssets(ctx, assetsDir, req, res).catch((err) => {
						this.fail(ctx, res, err);
					});
				}
			});
			return () => {
				disposeConfig();
				disposeAssets();
			};
		}, "cheeco-style: config + assets routes");
		// Register an agent tool that runs `dsh plugin` in the proper workbench
		// context (best-effort; never break the plugin if the tool can't load).
		this.setupTool(ctx);
	}

	/** Get an optional service without making it a required inject (never throws). */
	optService(ctx, name) {
		try { return ctx[name]; } catch (e) {}
		try { if (ctx.get) return ctx.get(name); } catch (e) {}
		return undefined;
	}

	/** Best-effort agent tool: run `dsh plugin --profile <p> <cmd>` and return output. */
	async setupTool(ctx) {
		try {
			const tools = this.optService(ctx, "tools");
			if (!tools) return;
			const { defineTool } = await import("@deepseek-ai/dsh-tools");
			tools.register(defineTool({
				name: "dsh_plugin_exec",
				description: "Run a `dsh plugin` command for a DSH workbench (profile) and return its stdout/stderr + exit code. Use to install/remove/list/enable plugins in a profile; `dsh plugin add <pkg|tgz>` installs the package AND auto-registers it into the profile's `dsh.profile.bundles`. Parameters: `profile` (the workbench, e.g. `web` / `test`), `command` (the args after `dsh plugin --profile <profile>`, e.g. `add file:F:/.../pkg.tgz`, `remove @cheeco/...`, `why @cheeco/...`).",
				parameters: {
					profile: { type: "string", required: true, description: "The DSH workbench/profile to target (e.g. web, test)." },
					command: { type: "string", required: true, description: "The dsh plugin arguments after `--profile <profile>` (e.g. `add file:F:/.../pkg.tgz`, `why @cheeco/...`)." },
					timeoutMs: { type: "number", description: "Max wait in ms. The executor applies its configured cap." }
				},
				output: {
					schema: { type: "object", additionalProperties: false, properties: {
						exitCode: { oneOf: [{ type: "integer" }, { type: "null" }], required: true },
						signal: { oneOf: [{ type: "string" }, { type: "null" }], required: true },
						timedOut: { type: "boolean", required: true },
						stdout: { type: "string", required: true },
						stderr: { type: "string", required: true }
					} },
					render: (_a, v) => [{ type: "text", text: (v.stdout || "(no output)") + (v.stderr ? "\n[stderr]\n" + v.stderr : "") + (v.exitCode !== 0 ? "\n[exit code: " + v.exitCode + "]" : "") }]
				},
				async execute(args, exec) {
					if (!args.profile || !args.profile.trim()) throw new Error("profile is required");
					if (!args.command || !args.command.trim()) throw new Error("command is required");
					const shell = (() => { try { return ctx.shell; } catch (e) {} try { if (ctx.get) return ctx.get("shell"); } catch (e) {} return undefined; })();
					if (!shell) throw new Error("dsh_plugin_exec: shell service unavailable");
					const cmd = "dsh plugin --profile " + args.profile.trim() + " " + args.command.trim();
					const result = await shell.run(shell.resolve({
						command: cmd,
						...args.timeoutMs ? { timeoutMs: args.timeoutMs } : {},
						signal: exec.signal
					}));
					if (result.aborted) { const e = new Error("tool call aborted"); e.name = "AbortError"; throw e; }
					return {
						exitCode: result.exitCode,
						signal: result.signal,
						timedOut: result.timedOut,
						stdout: result.stdout?.text ?? "",
						stderr: result.stderr?.text ?? ""
					};
				}
			}));
			ctx.logger.info("cheeco: registered agent tool dsh_plugin_exec");
		} catch (e) {
			ctx.logger.warn("cheeco: agent tool registration skipped: " + (e instanceof Error ? e.message : String(e)));
		}
	}

	fail(ctx, res, err) {
		ctx.logger.warn(err instanceof Error ? err : new Error(String(err)));
		if (!res.headersSent) {
			res.writeHead(500);
			res.end();
		}
	}

	async handleConfig(ctx, configFile, req, res) {
		const json = (code, payload) => {
			const body = JSON.stringify(payload);
			res.writeHead(code, {
				"content-type": "application/json; charset=utf-8",
				"cache-control": "no-store"
			});
			res.end(body);
		};
		if (req.method === "GET") {
			let value = {};
			try {
				value = JSON.parse(stripJsonComments(readFileSync(configFile, "utf8"))) || {};
			} catch (e) {
				value = {};
			}
			json(200, value);
			return;
		}
		if (req.method === "POST") {
			const raw = await readBody(req);
			let data;
			try {
				data = JSON.parse(raw || "{}");
			} catch (e) {
				json(400, { ok: false, error: "invalid json" });
				return;
			}
			if (data === null || typeof data !== "object" || Array.isArray(data)) {
				json(400, { ok: false, error: "expected a JSON object" });
				return;
			}
			mkdirSync(dirname(configFile), { recursive: true });
			writeFileSync(configFile, renderConfigFile(data), "utf8");
			json(200, { ok: true });
			return;
		}
		res.writeHead(405);
		res.end();
	}

	async handleAssets(ctx, assetsDir, req, res) {
		// POST /cheeco-style/assets?name=<file>  -> save uploaded bytes to assets/<file>
		if (req.method === "POST") {
			const url = new URL(req.url ?? "/", "http://x");
			const original = url.searchParams.get("name") || "asset";
			const stored = sanitizeName(original);
			const data = await readBodyBuffer(req);
			if (data.length === 0) {
				res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
				res.end(JSON.stringify({ ok: false, error: "empty upload" }));
				return;
			}
			mkdirSync(assetsDir, { recursive: true });
			writeFileSync(join(assetsDir, stored), data);
			res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
			res.end(JSON.stringify({ ok: true, url: `${ASSETS_PREFIX}/${encodeURIComponent(stored)}` }));
			return;
		}
		// GET /cheeco-style/assets/<file>  -> serve the stored asset
		if (req.method === "GET" || req.method === "HEAD") {
			const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
			const file = basename(pathname.slice(ASSETS_PREFIX.length).replace(/^\/+/, ""));
			if (file === "") {
				res.writeHead(404);
				res.end();
				return;
			}
			try {
				const body = readFileSync(join(assetsDir, file));
				res.writeHead(200, {
					"content-type": contentTypeOf(file),
					"cache-control": "no-store"
				});
				res.end(body);
			} catch (e) {
				res.writeHead(404);
				res.end();
			}
			return;
		}
		res.writeHead(405);
		res.end();
	}
}
