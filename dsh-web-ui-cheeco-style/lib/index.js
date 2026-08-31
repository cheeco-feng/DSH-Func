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
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
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

/** The four DSH-Func (cheeco) plugins this page manages (folder + package name + label). */
const CHEECO_PLUGINS = [
	{ folder: "dsh-web-ui-cheeco-style", name: "@cheeco/dsh-web-ui-cheeco-style", label: "界面/声音设置（本页）" },
	{ folder: "dsh-client-ui-message-sound", name: "@cheeco/dsh-client-ui-message-sound", label: "AI 回复提示音" },
	{ folder: "dsh-client-ui-session-search", name: "@cheeco/dsh-client-ui-session-search", label: "会话内容检索" },
	{ folder: "dsh-tool-dsh-plugin-exec", name: "@cheeco/dsh-tool-dsh-plugin-exec", label: "dsh_plugin_exec 工具" },
	{ folder: "dsh-client-ui-plugin-manager", name: "@cheeco/dsh-client-ui-plugin-manager", label: "插件管理" }
];
/** GitHub 仓库（raw package.json on main）用于“检查更新”。 */
const GITHUB_RAW = "https://raw.githubusercontent.com/cheeco-feng/DSH-Func/main";
/** 客户端操作的宿主路由。 */
const UPDATE_PATH = "/cheeco-style/plugin/update-check";
const UNINSTALL_PATH = "/cheeco-style/plugin/uninstall";
const FEATURES_PATH = "/cheeco-style/features";
const FEATURES_INSTALL_PATH = "/cheeco-style/features/install";
const FEATURES_PLAN_PATH = "/cheeco-style/features/plan";
const FEATURES_DOWNLOAD_PATH = "/cheeco-style/features/download";
const RESTART_PATH = "/cheeco-style/plugin/restart";
/** 功能推荐：手写的列表（以后有新插件/推荐插件直接加到这里）。
 *  `pkg` 判断是否已安装；`install` 为**可安装来源**（真实下载 URL，`dsh plugin add <此URL>` 即从 GitHub release 下载安装）；
 *  `url` 为“查看介绍”跳转；`folder` 为本机 release tgz 的子目录名（开发便利）。 */
const CHEECO_FEATURES = [
	{ id: "style", name: "界面/声音设置", pkg: "@cheeco/dsh-web-ui-cheeco-style", install: "https://github.com/cheeco-feng/DSH-Func/releases/download/v0.8.6/cheeco-dsh-web-ui-cheeco-style-0.8.6.tgz", folder: "dsh-web-ui-cheeco-style", url: "https://github.com/cheeco-feng/DSH-Func" },
	{ id: "sound", name: "AI 回复提示音", pkg: "@cheeco/dsh-client-ui-message-sound", install: "https://github.com/cheeco-feng/DSH-Func/releases/download/v0.3.0/cheeco-dsh-client-ui-message-sound-0.3.0.tgz", folder: "dsh-client-ui-message-sound", url: "https://github.com/cheeco-feng/DSH-Func" },
	{ id: "search", name: "会话内容检索", pkg: "@cheeco/dsh-client-ui-session-search", install: "https://github.com/cheeco-feng/DSH-Func/releases/download/v0.2.0/cheeco-dsh-client-ui-session-search-0.2.0.tgz", folder: "dsh-client-ui-session-search", url: "https://github.com/cheeco-feng/DSH-Func" },
	{ id: "dshcmd", name: "DSH功能命令", pkg: "@cheeco/dsh-tool-dsh-plugin-exec", install: "https://github.com/cheeco-feng/DSH-Func/releases/download/v0.1.6/cheeco-dsh-tool-dsh-plugin-exec-0.1.6.tgz", folder: "dsh-tool-dsh-plugin-exec", url: "https://github.com/cheeco-feng/DSH-Func" },
	{ id: "pmgr", name: "插件管理（cheeco 插件管理器）", pkg: "@cheeco/dsh-client-ui-plugin-manager", install: "https://github.com/cheeco-feng/DSH-Func/releases/download/v0.1.0/cheeco-dsh-client-ui-plugin-manager-0.1.0.tgz", folder: "dsh-client-ui-plugin-manager", url: "https://github.com/cheeco-feng/DSH-Func" }
];
/** DSH 官方程序（功能推荐列表最上方，仅列出 + 查看介绍，不提供安装）。
 *  以后有新官方程序/官方插件直接加到这里；发布时也可顺手更新。 */
const DSH_OFFICIAL = [
	{ id: "dsh-main", name: "DeepSeek Harness（官方主程序）", url: "https://github.com/deepseek-ai/deepseek-harness", folder: "" },
	{ id: "dsh-web", name: "DSH Web 官方网页版", url: "https://github.com/deepseek-ai/deepseek-harness", folder: "" }
];
/** The `node_modules/@cheeco` dir — parent of this plugin's own folder. */
const CHEECO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** Reject a profile name that isn't a plain segment (defensive). */
function isSafeName(name) {
	return /^[A-Za-z0-9_-]+$/.test(name);
}
/** Resolve the current profile name from this plugin's install path:
 *    <home>/profiles/<profile>/node_modules/@cheeco/dsh-web-ui-cheeco-style/lib
 *  -> the segment right after `profiles/`. */
function resolveProfileName() {
	const here = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
	const parts = here.split("/");
	const idx = parts.lastIndexOf("profiles");
	const name = idx === -1 ? "" : parts[idx + 1];
	if (!idx || !isSafeName(name)) throw new Error("cheeco-style: 无法从安装路径确定当前 profile");
	return name;
}
/** Resolve the official `dsh` CLI entry the running harness provides (so we can
 *  run `dsh plugin` without depending on PATH). */
function resolveDshBin() {
	const require = createRequire(import.meta.url);
	return require.resolve("@deepseek-ai/dsh/lib/bin.js");
}
/** Run `dsh plugin --profile <p> <args...>` via the resolved engine dsh. */
function runDsh(args) {
	const bin = resolveDshBin();
	const res = spawnSync(process.execPath, [bin, "plugin", "--profile", resolveProfileName(), ...args], {
		encoding: "utf8",
		timeout: 120000
	});
	return { exitCode: res.status, stdout: res.stdout || "", stderr: res.stderr || "" };
}
/** Read a DSH-Func plugin folder's installed version from `node_modules/@cheeco/<folder>`. */
function installedVersion(folder) {
	try {
		const raw = readFileSync(join(CHEECO_DIR, folder, "package.json"), "utf8");
		return JSON.parse(raw).version || "";
	} catch (e) { return ""; }
}
/** 实时从 GitHub 仓库读某插件 latest 版本（<repo>/<folder>/package.json 的 version）。
 *  失败/无网络返回 ""，绝不抛错。 */
async function latestFromGitHub(folder) {
	if (!folder) return "";
	try {
		const r = await fetch(`${GITHUB_RAW}/${folder}/package.json`, { signal: AbortSignal.timeout(4000) });
		if (!r.ok) return "";
		return ((await r.json()) || {}).version || "";
	} catch (e) { return ""; }
}
/** 仓库维护的“版本清单”唯一真源文件（含各插件最新版本 + dsh 官方程序）。
 *  发版时只需更新这个文件 + 推送，下载地址/版本显示自动跟上。 */
const MANIFEST_URL = `${GITHUB_RAW}/cheeco-dsh-plugins.json`;
let manifestCache = { promise: null, at: 0 };
async function getManifest() {
	const now = Date.now();
	if (manifestCache.promise && now - manifestCache.at < 60000) return manifestCache.promise;
	const p = (async () => {
		try {
			const r = await fetch(MANIFEST_URL, { signal: AbortSignal.timeout(5000) });
			if (!r.ok) return null;
			return await r.json();
		} catch (e) { return null; }
	})();
	manifestCache = { promise: p, at: now };
	return p;
}
/** 优先从版本清单读某插件最新版；清单不可用/没有该项再逐个 fetch；仍失败返回 ""。 */
async function latestVersionOf(folder) {
	if (!folder) return "";
	const m = await getManifest();
	if (m && Array.isArray(m.plugins)) {
		const p = m.plugins.find((x) => x.folder === folder);
		if (p && p.version) return String(p.version);
	}
	return latestFromGitHub(folder);
}
/** 动态解析某功能的**最新版下载地址**（免维护）：按最新版本拼 release URL；
 *  拉不到最新版则回退到静态 `install` 字段。返回形如
 *  https://github.com/cheeco-feng/DSH-Func/releases/download/v0.8.6/cheeco-dsh-web-ui-cheeco-style-0.8.6.tgz */
async function resolveDownloadUrl(target) {
	if (target.folder) {
		const v = await latestVersionOf(target.folder);
		if (v) return `https://github.com/cheeco-feng/DSH-Func/releases/download/v${v}/cheeco-${target.folder}-${v}.tgz`;
	}
	return target.install || "";
}
/** Whether a package (e.g. `@webkong/dsh-plugin-manager`) is installed in this profile.
 *  `node_modules` is the parent of the @cheeco dir. */
function isInstalled(pkg) {
	try {
		const parts = String(pkg).split("/");
		const p = parts.length > 1
			? join(dirname(CHEECO_DIR), parts[0], parts[1])
			: join(dirname(CHEECO_DIR), parts[0]);
		return existsSync(join(p, "package.json"));
	} catch (e) { return false; }
}
/** 找到 release 目录里某插件最新的 tgz（如 cheeco-<folder>-0.6.0.tgz），返回 file: 全路径；找不到返回 "". */
function latestCheecoTgz(folder) {
	try {
		const dir = join(process.env.DSH_HOME || "", "release");
		const files = readdirSync(dir)
			.filter((f) => f.startsWith(`cheeco-${folder}-`) && f.endsWith(".tgz"))
			.sort();
		if (files.length === 0) return "";
		return `file:${join(dir, files[files.length - 1]).replace(/\\/g, "/")}`;
	} catch (e) { return ""; }
}
/** node_modules 下某包的目录路径（如 @webkong/dsh-plugin-manager）。 */
function pkgDir(pkg) {
	const parts = String(pkg).split("/");
	return parts.length > 1
		? join(dirname(CHEECO_DIR), parts[0], parts[1])
		: join(dirname(CHEECO_DIR), parts[0]);
}
/** The profile directory (…/profiles/<profile>) that owns this plugin. */
function profileDir() { return dirname(dirname(CHEECO_DIR)); }
/** Local download cache dir: ${DSH_HOME}/downloads (created on demand). */
function downloadDir() { return join(process.env.DSH_HOME || "", "downloads"); }
/** 一键重启当前 profile（参考 dsh-plugin-manager scheduleRestart）：用启动参数重新拉起同名 profile。
 *  跨平台：Windows 用 PowerShell，POSIX 用 /bin/sh。 */
function scheduleRestart() {
	try {
		const pid = process.pid;
		const bin = resolveDshBin();
		const relaunch = `"${process.execPath}" "${bin}" ${process.argv.slice(2).join(" ")}`;
		const log = join(downloadDir(), "dsh-restart.log");
		if (process.platform === "win32") {
			const scriptPath = join(tmpdir(), `cheeco-restart-${pid}.ps1`);
			const ps = `Start-Sleep -Seconds 1; Stop-Process -Id ${pid} -Force -ErrorAction SilentlyContinue; Start-Sleep -Seconds 2; & ${relaunch} *> "${log.replace(/"/g, '""')}"`;
			writeFileSync(scriptPath, ps, "utf8");
			const child = spawn("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", scriptPath], { detached: true, stdio: "ignore" });
			child.unref();
		} else {
			const scriptPath = join(tmpdir(), `cheeco-restart-${pid}.sh`);
			const sh = `#!/bin/sh\nsleep 1\nkill ${pid} 2>/dev/null\nsleep 2\nnohup ${relaunch} > "${log}" 2>&1 < /dev/null &\n`;
			writeFileSync(scriptPath, sh, "utf8");
			const child = spawn("/bin/sh", [scriptPath], { detached: true, stdio: "ignore" });
			child.unref();
		}
		return true;
	} catch (e) { return false; }
}
/** Download one feature's package to the cache and verify it exists. For @cheeco: fetch the recorded
 *  `download` URL, fall back to the local release tgz; returns { ok, file, fileName, bytes }. */
async function downloadFeature(target) {
	try {
		// github 等“非 tgz 源”插件：无预下载文件，pnpm add 时自己从源下载；这里仅返回计划
		if (!target.folder) {
			return { ok: true, kind: "github", spec: target.install, source: "GitHub 源（" + target.install + "，pnpm 负责下载）", file: "", fileName: "(从源拉取)" };
		}
		const dir = downloadDir();
		mkdirSync(dir, { recursive: true });
		// 动态解析最新版下载地址（免维护）；失败回退到静态 install
		const install = await resolveDownloadUrl(target);
		// 文件名：优先从 release URL 取最后一段（即 tgz 名）
		let fileName = `${target.folder}.tgz`;
		try { const pn = new URL(install).pathname; if (pn) fileName = basename(pn) || fileName; } catch (e) {}
		const dest = join(dir, fileName);
		// 1) 本机已有同名文件 -> 跳过下载（信息可见：完整路径）
		if (existsSync(dest) && statSync(dest).size > 0) {
			return { ok: true, file: dest, fileName, bytes: statSync(dest).size, downloadDir: dir, source: `本机已存在：${dest}，已跳过下载`, skipped: true };
		}
		// 2) 从 release URL 下载
		if (install) {
			const r = await fetch(install);
			if (r.ok) {
				const buf = Buffer.from(await r.arrayBuffer());
				writeFileSync(dest, buf);
				return { ok: true, file: dest, fileName, bytes: buf.length, downloadDir: dir, source: "已从 " + install + " 下载", skipped: false };
			}
			return { ok: false, file: dest, fileName, downloadDir: dir, error: "下载失败（HTTP " + r.status + "）", source: install };
		}
		return { ok: false, file: dest, fileName, error: "未配置下载地址（install 字段）" };
	} catch (e) { return { ok: false, error: String(e && e.message || e) }; }
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
const PLUGIN_VERSION = "0.8.6";
/** Resolve the dsh CLI package version (from @deepseek-ai/dsh/package.json). */
function dshVersion() {
	try {
		const require = createRequire(import.meta.url);
		return JSON.parse(readFileSync(require.resolve("@deepseek-ai/dsh/package.json"), "utf8")).version || "";
	} catch (e) { return ""; }
}
/** Ensure config/cheeco-config.json exists and carries DSH metadata.
 *  若配置已存在（用户已配置过 / 上次卸载后保留的），**绝不覆盖** —— 直接原样保留，
 *  让用户在卸载/重装/升级前后都保有自己那份配置。只有首次（文件不存在时）才写一份
 *  默认配置 + DSH 元数据（当前工作台名 / DSH_HOME / 插件与 dsh 版本）。
 *  卸载时也**不删除 @cheeco 目录 / 该 config**（由用户手动删除）。 */
function ensureConfigMetadata(configFile) {
	if (existsSync(configFile)) return; // 已存在 -> 跳过，不覆盖
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

/** 注册表：像“软件注册表”一样记录当前工作台装了哪些插件、以及安装/卸载事件。
 *  放在 `node_modules/@cheeco/`（与它管理的插件同处一个目录），便于管理其下几个插件文件夹；
 *  启动时 `syncRegistry` 会按实际安装状态重建，被清也能自愈。 */
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
/** 启动自同步：对比当前已装插件与注册表，更新 installed 列表，并补 install/uninstall 事件。 */
function syncRegistry() {
	const reg = readRegistry();
	const prev = new Map((reg.installed || []).map((it) => [it.name, it]));
	const next = [];
	for (const p of CHEECO_PLUGINS) {
		const v = installedVersion(p.folder);
		if (!v) continue; // 未安装
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
			const disposeUpdate = ctx.webServer.register({
				kind: "exact",
				path: UPDATE_PATH,
				handler: (req, res) => {
					this.handleUpdateCheck(res).catch((err) => this.fail(ctx, res, err));
				}
			});
			const disposeUninstall = ctx.webServer.register({
				kind: "exact",
				path: UNINSTALL_PATH,
				handler: (req, res) => {
					this.handleUninstall(req, res).catch((err) => this.fail(ctx, res, err));
				}
			});
			const disposeFeatures = ctx.webServer.register({
				kind: "exact",
				path: FEATURES_PATH,
				handler: (req, res) => {
					this.handleFeatures(res).catch((err) => this.fail(ctx, res, err));
				}
			});
			const disposeFeatureInstall = ctx.webServer.register({
				kind: "exact",
				path: FEATURES_INSTALL_PATH,
				handler: (req, res) => {
					this.handleFeatureInstall(req, res).catch((err) => this.fail(ctx, res, err));
				}
			});
			const disposeFeaturePlan = ctx.webServer.register({
				kind: "exact",
				path: FEATURES_PLAN_PATH,
				handler: (req, res) => {
					this.handleFeaturePlan(req, res).catch((err) => this.fail(ctx, res, err));
				}
			});
			const disposeFeatureDownload = ctx.webServer.register({
				kind: "exact",
				path: FEATURES_DOWNLOAD_PATH,
				handler: (req, res) => {
					this.handleFeatureDownload(req, res).catch((err) => this.fail(ctx, res, err));
				}
			});
			const disposeRestart = ctx.webServer.register({
				kind: "exact",
				path: RESTART_PATH,
				handler: (req, res) => {
					this.handleRestart(res).catch((err) => this.fail(ctx, res, err));
				}
			});
			return () => {
				disposeConfig();
				disposeAssets();
				disposeUpdate();
				disposeUninstall();
				disposeFeatures();
				disposeFeatureInstall();
				disposeFeaturePlan();
				disposeFeatureDownload();
				disposeRestart();
			};
		}, "cheeco-style: config + assets + plugin routes");
	}

	fail(ctx, res, err) {
		ctx.logger.warn(err instanceof Error ? err : new Error(String(err)));
		if (!res.headersSent) {
			res.writeHead(500);
			res.end();
		}
	}

	/** Write a JSON response. */
	json(res, code, payload) {
		const body = JSON.stringify(payload);
		res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
		res.end(body);
	}

	/** 检查更新：对比本机已装版本 与 GitHub DSH-Func 仓库 main 的最新版本。 */
	async handleUpdateCheck(res) {
		const results = [];
		for (const p of CHEECO_PLUGINS) {
			const current = installedVersion(p.folder);
			let latest = "";
			let ok = false;
			// raw.githubusercontent.com 偶发网络抖动 —— 重试几次
			for (let attempt = 0; attempt < 3 && !ok; attempt++) {
				try {
					const r = await fetch(`${GITHUB_RAW}/${p.folder}/package.json`);
					if (r.ok) { latest = ((await r.json()) || {}).version || ""; ok = true; }
				} catch (e) { /* 重试 */ }
				if (!ok && attempt < 2) await new Promise((x) => setTimeout(x, 400));
			}
			results.push({
				folder: p.folder,
				name: p.name,
				label: p.label,
				current,
				latest,
				fetchFailed: !ok,
				hasUpdate: Boolean(current && latest && latest !== current)
			});
		}
		// 把“查到的最新版”写回注册表（@cheeco 文件夹）——相当于把这个文件夹的信息“拉更新”
		const reg = readRegistry();
		reg.updates = results.map((it) => ({ name: it.name, folder: it.folder, current: it.current, latest: it.latest, fetchedAt: new Date().toISOString() }));
		writeRegistry(reg);
		this.json(res, 200, { ok: true, results });
	}

	/** 卸载：按客户端传来的插件名，执行 `dsh plugin --profile <p> remove <names>`。 */
	/** 卸载（独立方法，不走 pnpm/dsh plugin remove，避免 store 不一致）：
	 *  ① 从 profile 的 package.json 移除该插件依赖 + bundle；
	 *  ② 删除 node_modules/@cheeco/<folder>（保留 @cheeco 根：cheeco-config.json / cheeco-registry.json）；
	 *  ③ 更新 cheeco-registry.json（移除 + 记 uninstall 事件）。 */
	async handleUninstall(req, res) {
		let body = {};
		try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
		const wanted = Array.isArray(body.plugins) ? body.plugins : [];
		const names = wanted.filter((n) => typeof n === "string" && CHEECO_PLUGINS.some((p) => p.name === n));
		if (names.length === 0) { this.json(res, 400, { ok: false, error: "未选择要卸载的插件" }); return; }
		const results = [];
		for (const name of names) {
			const p = CHEECO_PLUGINS.find((c) => c.name === name);
			if (!p) { results.push({ name, ok: false, error: "未知插件" }); continue; }
			try {
				// ① profile package.json：移除依赖 + bundle
				const pkgFile = join(profileDir(), "package.json");
				const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
				if (pkg.dependencies && pkg.dependencies[name]) delete pkg.dependencies[name];
				if (pkg.dsh && pkg.dsh.profile && Array.isArray(pkg.dsh.profile.bundles)) {
					pkg.dsh.profile.bundles = pkg.dsh.profile.bundles.filter((b) => b !== name);
				}
				writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n", "utf8");
				// ② 删 @cheeco/<folder>，保留 @cheeco 根
				const folderDir = join(CHEECO_DIR, p.folder);
				if (existsSync(folderDir)) rmSync(folderDir, { recursive: true, force: true });
				// ③ 注册表
				const reg = readRegistry();
				reg.installed = (reg.installed || []).filter((x) => x.name !== name);
				logEvent(reg, "uninstall", name, "");
				writeRegistry(reg);
				results.push({ name, ok: true });
			} catch (e) { results.push({ name, ok: false, error: String(e && e.message || e) }); }
		}
		this.json(res, 200, { ok: results.every((r) => r.ok), results });
	}

	/** 功能推荐列表：返回手写列表 + 每个插件的已安装状态。 */
	async handleFeatures(res) {
		const dshVer = dshVersion();
		// 从清单（唯一真源）读官方程序列表；清单不可用则回退到常量的 DSH_OFFICIAL
		const manifest = await getManifest();
		const officialList = (manifest && Array.isArray(manifest.official) && manifest.official.length) ? manifest.official : DSH_OFFICIAL;
		// dsh 官方程序：仅列出 + 查看介绍，不提供安装
		const official = officialList.map((o) => ({ ...o, installed: true, installable: false, official: true, current: dshVer, latest: dshVer, hasUpdate: false, enabled: true }));
		// cheeco 功能：已安装版本(本地) + 最新版本(清单优先/实时 GitHub) + 是否有更新
		const cheeco = await Promise.all(CHEECO_FEATURES.map(async (f) => {
			const installed = isInstalled(f.pkg);
			const current = installed ? installedVersion(f.folder) : "";
			const latest = f.folder ? await latestVersionOf(f.folder) : "";
			return { ...f, installed, installable: true, official: false, current, latest, hasUpdate: Boolean(current && latest && latest !== current), enabled: installed };
		}));
		this.json(res, 200, { ok: true, items: [...official, ...cheeco] });
	}

	/** 功能推荐：“我要安装 / 更新” —— 参考 dsh-plugin-manager：直接把安装源交给 `dsh plugin add`（pnpm 下载+安装）。
	 *  `force:true` 表示“更新”（覆盖安装在已装插件上，即原地升级）。 */
	async handleFeatureInstall(req, res) {
		let body = {};
		try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
		const target = CHEECO_FEATURES.find((f) => f.id === body.id);
		if (!target) { this.json(res, 400, { ok: false, error: "未知的功能 id" }); return; }
		const force = body.force === true;
		if (!force && isInstalled(target.pkg)) { this.json(res, 200, { ok: true, alreadyInstalled: true }); return; }
		// @cheeco：先下载 release URL 到 downloads 目录（同名跳过），再从下载文件装；github 等：直接 pnpm add 源
		let spec;
		if (target.folder) {
			const d = await downloadFeature(target);
			if (!d.ok) { this.json(res, 500, { ok: false, error: d.error || "无法下载安装包" }); return; }
			spec = `file:${d.file.replace(/\\/g, "/")}`;
		} else {
			spec = target.install;
		}
		const out = runDsh(["add", spec]);
		if (out.exitCode === 0) syncRegistry();
		this.json(res, 200, {
			ok: out.exitCode === 0, exitCode: out.exitCode, stdout: out.stdout, stderr: out.stderr,
			installPath: pkgDir(target.pkg), installed: isInstalled(target.pkg), source: spec
		});
	}

	/** 安装向导“下载/检查”：返回该功能的详细安装计划（来源/文件名/安装路径/安装目标目录）。 */
	async handleFeaturePlan(req, res) {
		let body = {};
		try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
		const target = CHEECO_FEATURES.find((f) => f.id === body.id);
		if (!target) { this.json(res, 400, { ok: false, error: "未知的功能 id" }); return; }
		const force = body.force === true;
		if (!force && isInstalled(target.pkg)) { this.json(res, 200, { ok: true, alreadyInstalled: true, installPath: pkgDir(target.pkg) }); return; }
		const install = await resolveDownloadUrl(target);
		const base = { targetDir: profileDir(), installPath: pkgDir(target.pkg), downloadUrl: install, source: install, downloadDir: downloadDir() };
		if (target.folder) {
			const tgz = latestCheecoTgz(target.folder);
			if (!tgz) { this.json(res, 200, { ok: true, kind: "tgz", downloadUrl: install, fileName: "(按安装源)", ...base, note: "本机无 release tgz，将从安装源下载" }); return; }
			this.json(res, 200, { ok: true, kind: "tgz", spec: tgz, file: tgz.replace("file:", ""), source: "本机 release 目录（" + install + "）", fileName: basename(tgz.replace("file:", "")), ...base });
		} else {
			// github 等：安装命令本身会下载；此处先给计划
			this.json(res, 200, { ok: true, kind: "github", spec: install, source: install, fileName: "(从 " + install + " 拉取)", ...base });
		}
	}

	/** 安装向导“下载/校验”：先查本机同名文件，无则下载到缓存，返回来源/文件名/字节。 */
	async handleFeatureDownload(req, res) {
		let body = {};
		try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
		const target = CHEECO_FEATURES.find((f) => f.id === body.id);
		if (!target) { this.json(res, 400, { ok: false, error: "未知的功能 id" }); return; }
		const force = body.force === true;
		if (!force && isInstalled(target.pkg)) { this.json(res, 200, { ok: true, alreadyInstalled: true }); return; }
		const d = await downloadFeature(target);
		this.json(res, 200, d);
	}

	/** 一键重启：用启动参数重新拉起当前 profile。 */
	async handleRestart(res) {
		const ok = scheduleRestart();
		this.json(res, 200, { ok, message: ok ? "正在重启当前 profile（约 10 秒后刷新页面生效）" : "未能成功重启，本次执行，须手动重启后生效。" });
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
