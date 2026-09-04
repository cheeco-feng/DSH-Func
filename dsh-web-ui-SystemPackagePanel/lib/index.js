/** dsh-web-ui-SystemPackagePanel host half — 一个最小 Cordis 插件（class 形状）。
 *  职责：
 *    - GET  /dsh-system/config   -> 读取 @cheeco/setting/DSH-System-config.json
 *    - POST /dsh-system/config   -> 写入 @cheeco/setting/DSH-System-config.json
 *
 *  与 cheeco-style 不同（按用户要求）：不使用 cheeco-config.json，而是新建
 *  DSH-System-config.json，放在 <home>/profiles/<p>/node_modules/@cheeco/setting/
 *  目录下（@cheeco 根下新增 setting/ 子目录），安装/升级/卸载均不覆盖。 */
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

/** 浏览器端 fetch 的宿主路由（同源，由我们的 webServer 提供）。 */
const CONFIG_PATH = "/dsh-system/config";
/** 资源路由前缀：上传/读取自定义提示音文件、品牌 Logo 图片。 */
const ASSETS_PREFIX = "/dsh-system/assets";

/** `node_modules/@cheeco` —— 本插件目录的上级。 */
const CHEECO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** 本插件资源目录：<@cheeco>/dsh-web-ui-SystemPackagePanel/assets */
function resolveAssetsDir() {
	const here = dirname(fileURLToPath(import.meta.url));
	const root = dirname(here);
	return join(root, "assets");
}

/** 仅保留安全文件名字符，杜绝路径穿越。 */
function sanitizeName(name) {
	const base = name.split(/[\\/]/).pop() || "";
	const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_").replace(/^\.+/, "");
	return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}_${cleaned}`;
}
/** 按扩展名猜 content-type（图片 + 常见音频）。 */
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
/** 读取完整请求体为 Buffer（供二进制上传）。 */
function readBodyBuffer(req) {
	return new Promise((resolve, reject) => {
		const chunks = [];
		req.on("data", (chunk) => { chunks.push(chunk); });
		req.on("end", () => resolve(Buffer.concat(chunks)));
		req.on("error", reject);
	});
}

/** 配置文件名：按用户要求新建，不沿用 cheeco-config.json。 */
const CONFIG_FILENAME = "DSH-System-config.json";

/** 运行时配置文件：<@cheeco>/setting/DSH-System-config.json。 */
function resolveConfigFile() {
	return join(CHEECO_DIR, "setting", CONFIG_FILENAME);
}

/** 拒绝非纯段的 profile 名（防御）。 */
function isSafeName(name) {
	return /^[A-Za-z0-9_-]+$/.test(name);
}

/** 从本插件安装路径确定当前 profile 名。 */
function resolveProfileName() {
	const here = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
	const parts = here.split("/");
	const idx = parts.lastIndexOf("profiles");
	const name = idx === -1 ? "" : parts[idx + 1];
	if (!idx || !isSafeName(name)) return "";
	return name;
}

/** 读取完整请求体为字符串。 */
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => { data += chunk; });
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}

/** 剥离 JSONC 注释：整行 "//" 或 "#"，以及块注释。 */
function stripJsonComments(text) {
	let out = String(text || "").replace(/\/\*[\s\S]*?\*\//g, "");
	out = out.split("\n").map((line) => {
		const t = line.trim();
		if (t.startsWith("//") || t.startsWith("#")) return "";
		return line;
	}).join("\n");
	return out;
}

/** 渲染可人工编辑的带注释 JSONC 文档。 */
function renderConfigFile(v) {
	const s = (x) => JSON.stringify(x ?? "");
	const dsh = (typeof v.dsh === "object" && v.dsh) ? v.dsh : {};
	const sound = (typeof v.sound === "object" && v.sound) ? v.sound : {};
	const brand = (typeof v.brand === "object" && v.brand) ? v.brand : {};
	return [
		"{",
		"  // 该设置页（DSH系统包）在侧边栏的名字；留空用默认「DSH系统包」",
		`  "label": ${s(v.label)},`,
		"  // 提示音配置（message-sound 插件读写：开关 / 自定义声音文件）",
		`  "sound": { "enabled": ${sound.enabled !== false}, "src": ${s(sound.src)}, "name": ${s(sound.name)} },`,
		"  // 品牌配置（BrandPanel 插件读写：顶部名称 / Logo）",
		`  "brand": { "title": ${s(brand.title)}, "logoUrl": ${s(brand.logoUrl)}, "logoData": ${s(brand.logoData)} },`,
		"  // DSH 信息（宿主自动维护：当前工作台名 / DSH_HOME / 插件与 dsh 版本；用于识别与排查）",
		`  "dsh": { "profileName": ${s(dsh.profileName)}, "dshHome": ${s(dsh.dshHome)}, "pluginVersion": ${s(dsh.pluginVersion)}, "dshVersion": ${s(dsh.dshVersion)} }`,
		"}"
	].join("\n");
}

/** 与 package.json 同步，供 config 记录产生它的插件版本。 */
const PLUGIN_VERSION = "0.1.6";

/** 解析 dsh CLI 包版本（来自 @deepseek-ai/dsh/package.json）。 */
function dshVersion() {
	try {
		const require = createRequire(import.meta.url);
		return JSON.parse(readFileSync(require.resolve("@deepseek-ai/dsh/package.json"), "utf8")).version || "";
	} catch (e) { return ""; }
}

/** 确保 DSH-System-config.json 存在且带 DSH 元数据（仅不存在时创建）。 */
function ensureConfigMetadata(configFile) {
	if (existsSync(configFile)) return;
	const value = {
		label: "",
		sound: { enabled: true, src: "", name: "" },
		brand: { title: "", logoUrl: "", logoData: "" },
		dsh: {
			profileName: resolveProfileName(),
			dshHome: process.env.DSH_HOME || "",
			pluginVersion: PLUGIN_VERSION,
			dshVersion: dshVersion()
		}
	};
	mkdirSync(dirname(configFile), { recursive: true });
	writeFileSync(configFile, renderConfigFile(value), "utf8");
}

export default class DshWebUiSystemPackagePanel {
	static name = "web-ui-system-package-panel";
	static inject = ["webServer"];

	constructor(ctx, config) {
		const configFile = resolveConfigFile();
		const assetsDir = resolveAssetsDir();
		ensureConfigMetadata(configFile);
		ctx.effect(() => {
			const disposers = [];
			disposers.push(ctx.webServer.register({
				kind: "exact",
				path: CONFIG_PATH,
				handler: (req, res) => {
					this.handleConfig(ctx, configFile, req, res).catch((err) => {
						this.fail(ctx, res, err);
					});
				}
			}));
			disposers.push(ctx.webServer.register({
				kind: "prefix",
				path: ASSETS_PREFIX,
				handler: (req, res) => {
					this.handleAssets(ctx, assetsDir, req, res).catch((err) => {
						this.fail(ctx, res, err);
					});
				}
			}));
			return () => disposers.forEach((d) => d());
		}, "dsh-system-package: config + assets routes");
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

	/** 资源路由：POST 上传（提示音/logo 图片）、GET/HEAD 读取。 */
	async handleAssets(ctx, assetsDir, req, res) {
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
		if (req.method === "GET" || req.method === "HEAD") {
			const pathname = decodeURIComponent(new URL(req.url ?? "/", "http://x").pathname);
			const file = pathname.slice(ASSETS_PREFIX.length).replace(/^\/+/, "").split(/[\\/]/).pop() || "";
			if (file === "") { res.writeHead(404); res.end(); return; }
			try {
				const body = readFileSync(join(assetsDir, file));
				res.writeHead(200, { "content-type": contentTypeOf(file), "cache-control": "no-store" });
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
