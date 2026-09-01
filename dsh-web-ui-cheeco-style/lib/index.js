/** dsh-web-ui-cheeco-style host half — a minimal Cordis plugin (class shape).
    Host responsibilities：
      - GET  /cheeco-style/config   -> read config/cheeco-config.json
      - POST /cheeco-style/config   -> write config/cheeco-config.json
      - POST /cheeco-style/assets?name=<file>  -> write assets/<file>
      - GET  /cheeco-style/assets/<file>       -> serve it back (for <img>/<audio>)
    「功能推荐」页已独立为 @cheeco/dsh-client-ui-plugin-push（路由 /cheeco-push/*），
    本插件不再承载任何推荐/安装/卸载/更新逻辑。 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

/** Route the browser half fetches (same-origin, served by our own webServer). */
const CONFIG_PATH = "/cheeco-style/config";
/** Prefix serving / receiving the plugin's uploaded assets (images + audio). */
const ASSETS_PREFIX = "/cheeco-style/assets";

/** Resolve the runtime config file. It lives in the `@cheeco` install dir (alongside
 *  the registry) so it survives plugin re-installs/upgrades: <home>/profiles/<p>/node_modules/@cheeco/cheeco-config.json */
function resolveConfigFile() {
	return join(CHEECO_DIR, "cheeco-config.json");
}

/** Resolve the plugin's assets/ resource directory. */
function resolveAssetsDir() {
	const here = dirname(fileURLToPath(import.meta.url));
	const root = dirname(here);
	return join(root, "assets");
}

/** The cheeco plugins this page's registry tracks (folder + package name + label). */
const CHEECO_PLUGINS = [
	{ folder: "dsh-web-ui-cheeco-style", name: "@cheeco/dsh-web-ui-cheeco-style", label: "界面/声音设置（本页）" },
	{ folder: "dsh-client-ui-message-sound", name: "@cheeco/dsh-client-ui-message-sound", label: "AI 回复提示音" },
	{ folder: "dsh-client-ui-session-search", name: "@cheeco/dsh-client-ui-session-search", label: "会话内容检索" },
	{ folder: "dsh-tool-dsh-plugin-exec", name: "@cheeco/dsh-tool-dsh-plugin-exec", label: "dsh_plugin_exec 工具" },
	{ folder: "dsh-client-ui-plugin-manager", name: "@cheeco/dsh-client-ui-plugin-manager", label: "插件管理" },
	{ folder: "dsh-client-ui-session-deeplink", name: "@cheeco/dsh-client-ui-session-deeplink", label: "会话深链接" },
	{ folder: "dsh-client-ui-timeline-rail", name: "@cheeco/dsh-client-ui-timeline-rail", label: "会话时间轴" }
];
/** The `node_modules/@cheeco` dir — parent of this plugin's own folder. */
const CHEECO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** Reject a profile name that isn't a plain segment (defensive). */
function isSafeName(name) {
	return /^[A-Za-z0-9_-]+$/.test(name);
}
/** Resolve the current profile name from this plugin's install path. */
function resolveProfileName() {
	const here = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
	const parts = here.split("/");
	const idx = parts.lastIndexOf("profiles");
	const name = idx === -1 ? "" : parts[idx + 1];
	if (!idx || !isSafeName(name)) throw new Error("cheeco-style: 无法从安装路径确定当前 profile");
	return name;
}
/** Read a cheeco plugin folder's installed version from `node_modules/@cheeco/<folder>`. */
function installedVersion(folder) {
	try {
		const raw = readFileSync(join(CHEECO_DIR, folder, "package.json"), "utf8");
		return JSON.parse(raw).version || "";
	} catch (e) { return ""; }
}

/** 注册表：像"软件注册表"一样记录当前工作台装了哪些插件、以及安装/卸载事件。 */
const REGISTRY_FILE = "cheeco-registry.json";
function registryPath() { return join(CHEECO_DIR, REGISTRY_FILE); }
function readRegistry() {
	try { return JSON.parse(readFileSync(registryPath(), "utf8")) || {}; } catch (e) { return { profile: resolveProfileName(), installed: [], events: [] }; }
}
function writeRegistry(reg) {
	reg.profile = resolveProfileName();
	reg.updatedAt = new Date().toISOString();
	mkdirSync(dirname(registryPath()), { recursive: true });
	writeFileSync(registryPath(), JSON.stringify(reg, null, 2), "utf8");
}
function logEvent(reg, type, name, version) {
	reg.events = reg.events || [];
	reg.events.push({ ts: new Date().toISOString(), type, name, version });
	if (reg.events.length > 200) reg.events = reg.events.slice(-200);
}
/** 启动自同步：对比当前已装插件与注册表，更新 installed 列表。 */
function syncRegistry() {
	const reg = readRegistry();
	const prev = new Map((reg.installed || []).map((it) => [it.name, it]));
	const next = [];
	for (const p of CHEECO_PLUGINS) {
		const v = installedVersion(p.folder);
		if (!v) continue;
		const before = prev.get(p.name);
		next.push({ name: p.name, folder: p.folder, version: v, installedAt: before ? before.installedAt : new Date().toISOString() });
		if (!before) logEvent(reg, "install", p.name, v);
	}
	for (const it of reg.installed || []) {
		if (!next.some((n) => n.name === it.name)) logEvent(reg, "uninstall", it.name, it.version);
	}
	reg.installed = next;
	writeRegistry(reg);
}

/** Read the full request body as a string. */
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => { data += chunk; });
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}
/** Read the full request body as a Buffer (for binary uploads). */
function readBodyBuffer(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => { chunks.push(chunk); });
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}
/** Keep only safe filename characters and never allow path traversal. */
function sanitizeName(name) {
	const base = name.split(/[\\/]/).pop() || "";
	const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}_${cleaned}`;
}
/** Guess a content-type from a file extension (images + common audio). */
function contentTypeOf(name) {
	const ext = (name.split(/[\\/]/).pop() || "").slice((name.split(/[\\/]/).pop() || "").lastIndexOf(".")).toLowerCase();
	const map = {
		".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg",
		".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".ico": "image/x-icon",
		".wav": "audio/wav", ".mp3": "audio/mpeg", ".ogg": "audio/ogg", ".oga": "audio/ogg",
		".m4a": "audio/mp4", ".aac": "audio/aac", ".webm": "audio/webm", ".flac": "audio/flac", ".caf": "audio/x-caf"
	};
	return map[ext] || "application/octet-stream";
}
/** Strip JSONC comments: full-line "//" or "#" lines, and block comments. */
function stripJsonComments(text) {
	let out = String(text || "").replace(/\/\*[\s\S]*?\*\//g, "");
	out = out.split("\n").map((line) => {
		const t = line.trim();
		if (t.startsWith("//") || t.startsWith("#")) return "";
		return line;
	}).join("\n");
	return out;
}
/** Render the config as a human-editable, commented JSONC document. */
function renderConfigFile(v) {
	const s = (x) => JSON.stringify(x ?? "");
	const dsh = (typeof v.dsh === "object" && v.dsh) ? v.dsh : {};
	const feat = (typeof v.features === "object" && v.features) ? v.features : {};
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
		`  "soundName": ${s(v.soundName)},`,
		"  // DSH 信息（宿主自动维护：当前工作台名 / DSH_HOME / 插件与 dsh 版本；用于识别与排查）",
		`  "dsh": { "profileName": ${s(dsh.profileName)}, "dshHome": ${s(dsh.dshHome)}, "pluginVersion": ${s(dsh.pluginVersion)}, "dshVersion": ${s(dsh.dshVersion)} },`,
		"  // 功能开关（面版管理：会话搜索/DSH功能命令）",
		`  "features": { "sessionSearch": ${feat.sessionSearch === false ? "false" : "true"}, "dshCommand": ${feat.dshCommand === false ? "false" : "true"} }`,
		"}"
	].join("\n");
}

/** In sync with package.json so the config records which plugin version produced it. */
const PLUGIN_VERSION = "0.8.10";
/** Resolve the dsh CLI package version (from @deepseek-ai/dsh/package.json). */
function dshVersion() {
	try {
		const require = createRequire(import.meta.url);
		return JSON.parse(readFileSync(require.resolve("@deepseek-ai/dsh/package.json"), "utf8")).version || "";
	} catch (e) { return ""; }
}
/** Ensure config/cheeco-config.json exists and carries DSH metadata. */
function ensureConfigMetadata(configFile) {
	if (existsSync(configFile)) return;
	let value = {};
	const dsh = {};
	dsh.profileName = resolveProfileName();
	dsh.dshHome = process.env.DSH_HOME || "";
	dsh.pluginVersion = PLUGIN_VERSION;
	dsh.dshVersion = dshVersion();
	value.dsh = dsh;
	value.features = { sessionSearch: true, dshCommand: true };
	mkdirSync(dirname(configFile), { recursive: true });
	writeFileSync(configFile, renderConfigFile(value), "utf8");
	return value;
}

export default class DshWebUiPatches {
	static name = "web-ui-patches";
	static inject = ["webServer"];

	constructor(ctx, config) {
		const configFile = resolveConfigFile();
		ensureConfigMetadata(configFile);
		syncRegistry();
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
			const file = pathname.slice(ASSETS_PREFIX.length).replace(/^\/+/, "").split(/[\\/]/).pop() || "";
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
