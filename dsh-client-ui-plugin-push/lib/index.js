/** dsh-client-ui-plugin-push host half — 承载「功能推荐」整页的独立插件。
 *  职责：提供推荐列表（数据 + 最新版本 + 检查更新 + 安装/更新/卸载）所需的一切宿主能力，
 *  路由用 /cheeco-push/*（独立于 dsh-web-ui-cheeco-style 的 /cheeco-style/*，二者不冲突）。
 *  这样以后加新插件只需改本插件里的 CHEECO_FEATURES / 外部清单，而不必更新 dsh-web-ui-cheeco-style。 */
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, statSync, rmSync } from "node:fs";
import { dirname, join, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { createRequire } from "node:module";
import { CHEECO_FEATURES } from "./cheeco-features.js";

/** 路由前缀（独立于 style）。 */
const FEATURES_PATH = "/cheeco-push/features";
const FEATURES_INSTALL_PATH = "/cheeco-push/features/install";
const FEATURES_PLAN_PATH = "/cheeco-push/features/plan";
const FEATURES_DOWNLOAD_PATH = "/cheeco-push/features/download";
const UNINSTALL_PATH = "/cheeco-push/plugin/uninstall";
const UPDATE_PATH = "/cheeco-push/plugin/update-check";
const RESTART_PATH = "/cheeco-push/plugin/restart";

/** The `node_modules/@cheeco` dir — parent of this plugin's own folder. */
const CHEECO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
/** GitHub 仓库（raw package.json on main）用于"检查更新"。 */
const GITHUB_RAW = "https://raw.githubusercontent.com/cheeco-feng/DSH-Func/main";

/** 重新组织：宿主依赖改为按功能 id 映射（见 HOST_DEP_MAP / HOST_DEP_MSG）。
 *  「功能推荐」「插件管理」寄宿 DSH插件包；「系统信息」寄宿 DSH系统包；「模型设置」寄宿 DSH功能包。
 *  这些插件安装前必须先装对应宿主包，否则没有宿主页面。 */
/** 依赖 DSH系宿主包 的功能映射（功能推荐列表里，这些 id 的插件安装前需已装对应宿主包侧边栏）。
 *  每个宿主包都需要先装，否则对应插件页没有宿主展示位置。 */
const HOST_DEP_MAP = {
	"push": "@cheeco/dsh-web-ui-PluginPackagePanel",
	"pmgr": "@cheeco/dsh-web-ui-PluginPackagePanel",
	"systeminfo": "@cheeco/dsh-web-ui-SystemPackagePanel",
	"model-settings": "@cheeco/dsh-web-ui-FuncPackagePanel",
	"brand": "@cheeco/dsh-web-ui-SystemPackagePanel"
};
/** 各宿主包对应的"先行安装"提示文案（面板名不同）。 */
const HOST_DEP_MSG = {
	"@cheeco/dsh-web-ui-PluginPackagePanel": "请先完成 DSH插件包 的面板安装",
	"@cheeco/dsh-web-ui-SystemPackagePanel": "请先完成 DSH系统包 的面板安装",
	"@cheeco/dsh-web-ui-FuncPackagePanel": "请先完成 DSH功能包 的面板安装"
};

/** 管理列表（内置兜底：更新检查/卸载/注册表同步用到；外部清单优先见 managedPlugins）。 */
const CHEECO_PLUGINS = [
	{ folder: "dsh-client-ui-message-sound", name: "@cheeco/dsh-client-ui-message-sound", label: "AI 回复提示音" },
	{ folder: "dsh-client-ui-session-search", name: "@cheeco/dsh-client-ui-session-search", label: "会话内容检索" },
	{ folder: "dsh-tool-dsh-plugin-exec", name: "@cheeco/dsh-tool-dsh-plugin-exec", label: "DSH功能命令" },
	{ folder: "dsh-client-ui-plugin-manager", name: "@cheeco/dsh-client-ui-plugin-manager", label: "插件管理" },
	{ folder: "dsh-client-ui-session-deeplink", name: "@cheeco/dsh-client-ui-session-deeplink", label: "会话深链接" },
	{ folder: "dsh-client-ui-timeline-rail", name: "@cheeco/dsh-client-ui-timeline-rail", label: "会话时间轴" }
];

/** folder -> 发布前缀(id)，与 publish.mjs 的 META、功能推荐清单的 id 一致。
 *  下载 URL 用 v<prefix>-<version>（避免不同插件版本号撞同一个 GitHub tag）。 */
const PREFIX_BY_FOLDER = {
	"dsh-client-ui-message-sound": "sound",
	"dsh-client-ui-session-search": "search",
	"dsh-tool-dsh-plugin-exec": "dshcmd",
	"dsh-client-ui-plugin-manager": "pmgr",
	"dsh-client-ui-session-deeplink": "deeplink",
	"dsh-client-ui-timeline-rail": "timeline",
	"dsh-client-ui-plugin-push": "push",
	"dsh-client-ui-task-status": "taskstatus",
	"dsh-cmdwatch": "cmdwatch",
	"dsh-client-ui-mobile": "mobile",
	"dsh-client-ui-system-info": "systeminfo",
	"dsh-web-ui-web_user_center": "usercenter",
	"dsh-llm-model-settings": "model-settings",
	"dsh-client-ui-schedule-panel": "schedule",
	"dsh-web-ui-FuncPackagePanel": "func-package",
	"dsh-web-ui-SystemPackagePanel": "system-package",
	"dsh-web-ui-patchPackagePanel": "patch-package",
	"dsh-web-ui-PluginPackagePanel": "plugin-package",
	"dsh-web-ui-WebAppPackagePanel": "webapp-package",
	"dsh-web-setting-BrandPanel": "brand",
	"dsh-tool-skill-mcp-panel": "skill-mcp"
};
function prefixOf(folder) { return PREFIX_BY_FOLDER[folder] || ""; }

/** DSH 官方程序（功能推荐列表最上方，仅列出 + 查看介绍，不提供安装）。 */
const DSH_OFFICIAL = [
	{ id: "dsh-main", name: "DeepSeek Harness（官方主程序）", url: "https://github.com/deepseek-ai/deepseek-harness", folder: "" },
	{ id: "dsh-web", name: "DSH Web 官方网页版", url: "https://github.com/deepseek-ai/deepseek-harness", folder: "" }
];

/** 仓库维护的"版本清单"唯一真源文件（含各插件最新版本 + dsh 官方程序）。 */
const MANIFEST_URL = `${GITHUB_RAW}/cheeco-dsh-plugins.json`;

/** Resolve the official `dsh` CLI entry the running harness provides. */
function resolveDshBin() {
	const require = createRequire(import.meta.url);
	return require.resolve("@deepseek-ai/dsh/lib/bin.js");
}
/** Resolve the current profile name from this plugin's install path. */
function resolveProfileName() {
	const here = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
	const parts = here.split("/");
	const idx = parts.lastIndexOf("profiles");
	const name = idx === -1 ? "" : parts[idx + 1];
	if (!idx || !/^[A-Za-z0-9_-]+$/.test(name)) throw new Error("cheeco-push: 无法从安装路径确定当前 profile");
	return name;
}
function runDsh(args) {
	const bin = resolveDshBin();
	const res = spawnSync(process.execPath, [bin, "plugin", "--profile", resolveProfileName(), ...args], {
		encoding: "utf8",
		timeout: 120000
	});
	return { exitCode: res.status, stdout: res.stdout || "", stderr: res.stderr || "" };
}
function installedVersion(folder) {
	try {
		const raw = readFileSync(join(CHEECO_DIR, folder, "package.json"), "utf8");
		return JSON.parse(raw).version || "";
	} catch (e) { return ""; }
}
async function latestFromGitHub(folder) {
	if (!folder) return "";
	try {
		const r = await fetch(`${GITHUB_RAW}/${folder}/package.json`, { signal: AbortSignal.timeout(4000) });
		if (!r.ok) return "";
		return ((await r.json()) || {}).version || "";
	} catch (e) { return ""; }
}
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
async function latestVersionOf(folder) {
	if (!folder) return "";
	const m = await getManifest();
	if (m && Array.isArray(m.plugins)) {
		const p = m.plugins.find((x) => x.folder === folder);
		if (p && p.version) return String(p.version);
	}
	return latestFromGitHub(folder);
}
async function resolveDownloadUrl(target) {
	if (target.folder) {
		const v = await latestVersionOf(target.folder);
		const prefix = prefixOf(target.folder);
		if (v) return `https://github.com/cheeco-feng/DSH-Func/releases/download/v${prefix ? prefix + "-" : ""}${v}/cheeco-${target.folder}-${v}.tgz`;
	}
	return target.install || "";
}
function isInstalled(pkg) {
	try {
		const parts = String(pkg).split("/");
		const p = parts.length > 1 ? join(dirname(CHEECO_DIR), parts[0], parts[1]) : join(dirname(CHEECO_DIR), parts[0]);
		return existsSync(join(p, "package.json"));
	} catch (e) { return false; }
}
/** 目标功能 id 若依赖某个 DSH系宿主包，返回对应宿主包名；否则返回 ""。 */
function hostPkgOf(target) {
	if (!target || !target.id) return "";
	return HOST_DEP_MAP[target.id] || "";
}
/** 安装前置条件：对应宿主包必须已安装。未满足返回错误文案，满足返回 ""。 */
function hostDependencyError(target) {
	const hostPkg = hostPkgOf(target);
	if (!hostPkg) return "";
	return isInstalled(hostPkg) ? "" : (HOST_DEP_MSG[hostPkg] || "请先完成对应宿主包 的面板安装");
}
function latestCheecoTgz(folder) {
	try {
		const dir = join(process.env.DSH_HOME || "", "release");
		const files = readdirSync(dir).filter((f) => f.startsWith(`cheeco-${folder}-`) && f.endsWith(".tgz")).sort();
		if (files.length === 0) return "";
		return `file:${join(dir, files[files.length - 1]).replace(/\\/g, "/")}`;
	} catch (e) { return ""; }
}
function pkgDir(pkg) {
	const parts = String(pkg).split("/");
	return parts.length > 1 ? join(dirname(CHEECO_DIR), parts[0], parts[1]) : join(dirname(CHEECO_DIR), parts[0]);
}
function profileDir() { return dirname(dirname(CHEECO_DIR)); }
function downloadDir() { return join(process.env.DSH_HOME || "", "downloads"); }

/** 功能推荐列表"统一外部加载"：优先外部清单，失败回退内置 CHEECO_FEATURES。 */
async function featureList() {
	const m = await getManifest();
	if (m && Array.isArray(m.plugins) && m.plugins.length) {
		return m.plugins.map((p) => ({ id: p.id, name: p.name, pkg: p.pkg, folder: p.folder || "", install: p.install || "", url: p.url, version: p.version || "" }));
	}
	return CHEECO_FEATURES;
}
/** 管理列表统一来源：外部清单优先，回退内置 CHEECO_PLUGINS。 */
async function managedPlugins() {
	const m = await getManifest();
	if (m && Array.isArray(m.plugins) && m.plugins.length) {
		return m.plugins.filter((p) => p.pkg && p.folder).map((p) => ({ folder: p.folder, name: p.pkg, label: p.name || p.pkg }));
	}
	return CHEECO_PLUGINS;
}
/** 一键重启当前 profile：用启动参数重新拉起同名 profile。
 *  跨平台：不用 /bin/bash / powershell 文本拼接（路径含空格/引号易坏），
 *  改为写一个 node 内联脚本，等 1.2s 杀掉旧进程、再等 4.5s 用 node 拉起同样参数的 dsh 实例。 */
function scheduleRestart() {
	try {
		const pid = process.pid;
		const bin = resolveDshBin();
		const args = process.argv.slice(2);
		const pi = args.indexOf("--profile");
		const profileArg = pi !== -1 && args[pi + 1] ? args[pi + 1] : "web";
		const ppi = args.indexOf("--port");
		const portArg = ppi !== -1 && args[ppi + 1] ? args[ppi + 1] : "";
		const relauncher = [
			"const { spawn } = require('node:child_process');",
			"setTimeout(function(){ try { process.kill(" + pid + "); } catch(e) {} }, 1200);",
			"setTimeout(function(){",
			"  const relaunchArgs = [" + JSON.stringify(bin) + ", '--profile', " + JSON.stringify(profileArg) + "];",
			"  if (" + JSON.stringify(portArg) + ") relaunchArgs.push('--port', " + JSON.stringify(portArg) + ");",
			"  relaunchArgs.push('--no-open');",
			"  const cp = spawn(" + JSON.stringify(process.execPath) + ", relaunchArgs, { detached: true, stdio: 'ignore', env: process.env });",
			"  cp.unref();",
			"}, 4500);"
		].join("\n");
		const relauncherPath = join(tmpdir(), `cheeco-push-relaunch-${pid}.cjs`);
		writeFileSync(relauncherPath, relauncher, "utf8");
		const child = spawn(process.execPath, [relauncherPath], { detached: true, stdio: "ignore", env: process.env });
		child.unref();
		return true;
	} catch (e) { return false; }
}
/** 下载/检查：先查本机同名文件，无则下载到缓存，返回来源/文件名/字节。 */
async function downloadFeature(target) {
	try {
		if (!target.folder) {
			return { ok: true, kind: "github", spec: target.install, source: "GitHub 源（" + target.install + "，pnpm 负责下载）", file: "", fileName: "(从源拉取)" };
		}
		const dir = downloadDir();
		mkdirSync(dir, { recursive: true });
		const install = await resolveDownloadUrl(target);
		let fileName = `${target.folder}.tgz`;
		try { const pn = new URL(install).pathname; if (pn) fileName = basename(pn) || fileName; } catch (e) {}
		const dest = join(dir, fileName);
		if (existsSync(dest) && statSync(dest).size > 0) {
			return { ok: true, file: dest, fileName, bytes: statSync(dest).size, downloadDir: dir, source: `本机已存在：${dest}，已跳过下载`, skipped: true };
		}
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
function readBody(req) {
	return new Promise((resolve, reject) => { let data = ""; req.on("data", (c) => { data += c; }); req.on("end", () => resolve(data)); req.on("error", reject); });
}

export default class DshClientUiPluginPush {
	static name = "web-ui-push";
	static inject = ["webServer"];

	constructor(ctx, config) {
		ctx.effect(() => {
			const routers = [
				{ kind: "exact", path: FEATURES_PATH, handler: (req, res) => this.handleFeatures(res).catch((e) => this.fail(ctx, res, e)) },
				{ kind: "exact", path: FEATURES_INSTALL_PATH, handler: (req, res) => this.handleFeatureInstall(req, res).catch((e) => this.fail(ctx, res, e)) },
				{ kind: "exact", path: FEATURES_PLAN_PATH, handler: (req, res) => this.handleFeaturePlan(req, res).catch((e) => this.fail(ctx, res, e)) },
				{ kind: "exact", path: FEATURES_DOWNLOAD_PATH, handler: (req, res) => this.handleFeatureDownload(req, res).catch((e) => this.fail(ctx, res, e)) },
				{ kind: "exact", path: UPDATE_PATH, handler: (req, res) => this.handleUpdateCheck(res).catch((e) => this.fail(ctx, res, e)) },
				{ kind: "exact", path: UNINSTALL_PATH, handler: (req, res) => this.handleUninstall(req, res).catch((e) => this.fail(ctx, res, e)) },
				{ kind: "exact", path: RESTART_PATH, handler: (req, res) => this.handleRestart(res).catch((e) => this.fail(ctx, res, e)) }
			];
			const dispose = routers.map((r) => ctx.webServer.register(r));
			return () => dispose.forEach((d) => d());
		}, "cheeco-push: feature routes");
	}

	fail(ctx, res, err) {
		ctx.logger.warn(err instanceof Error ? err : new Error(String(err)));
		if (!res.headersSent) { res.writeHead(500); res.end(); }
	}
	json(res, code, payload) {
		const body = JSON.stringify(payload);
		res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
		res.end(body);
	}

	async handleFeatures(res) {
		const dshVer = (() => {
			try { const require = createRequire(import.meta.url); return JSON.parse(readFileSync(require.resolve("@deepseek-ai/dsh/package.json"), "utf8")).version || ""; }
			catch (e) { return ""; }
		})();
		const manifest = await getManifest();
		const officialList = (manifest && Array.isArray(manifest.official) && manifest.official.length) ? manifest.official : DSH_OFFICIAL;
		const official = officialList.map((o) => ({ ...o, installed: true, installable: false, official: true, current: dshVer, latest: dshVer, hasUpdate: false, enabled: true }));
		const cheeco = await Promise.all((await featureList()).map(async (f) => {
			const installed = isInstalled(f.pkg);
			const current = installed ? installedVersion(f.folder) : "";
			const latest = f.folder ? await latestVersionOf(f.folder) : "";
			return { ...f, installed, installable: true, official: false, current, latest, hasUpdate: Boolean(current && latest && latest !== current), enabled: installed, depErr: hostDependencyError(f) };
		}));
		this.json(res, 200, { ok: true, items: [...cheeco, ...official] });
	}

	async handleFeatureInstall(req, res) {
		let body = {};
		try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
		const target = (await featureList()).find((f) => f.id === body.id);
		if (!target) { this.json(res, 400, { ok: false, error: "未知的功能 id" }); return; }
		const depErr = hostDependencyError(target);
		if (depErr) { this.json(res, 400, { ok: false, error: depErr }); return; }
		const force = body.force === true;
		if (!force && isInstalled(target.pkg)) { this.json(res, 200, { ok: true, alreadyInstalled: true }); return; }
		let spec;
		if (target.folder) {
			const d = await downloadFeature(target);
			if (!d.ok) { this.json(res, 500, { ok: false, error: d.error || "无法下载安装包" }); return; }
			spec = `file:${d.file.replace(/\\/g, "/")}`;
		} else {
			spec = target.install;
		}
		const out = runDsh(["add", spec]);
		this.json(res, 200, {
			ok: out.exitCode === 0, exitCode: out.exitCode, stdout: out.stdout, stderr: out.stderr,
			installPath: pkgDir(target.pkg), installed: isInstalled(target.pkg), source: spec
		});
	}

	async handleFeaturePlan(req, res) {
		let body = {};
		try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
		const target = (await featureList()).find((f) => f.id === body.id);
		if (!target) { this.json(res, 400, { ok: false, error: "未知的功能 id" }); return; }
		const depErr = hostDependencyError(target);
		if (depErr) { this.json(res, 400, { ok: false, error: depErr }); return; }
		const force = body.force === true;
		if (!force && isInstalled(target.pkg)) { this.json(res, 200, { ok: true, alreadyInstalled: true, installPath: pkgDir(target.pkg) }); return; }
		const install = await resolveDownloadUrl(target);
		const base = { targetDir: profileDir(), installPath: pkgDir(target.pkg), downloadUrl: install, source: install, downloadDir: downloadDir() };
		if (target.folder) {
			const tgz = latestCheecoTgz(target.folder);
			if (!tgz) { this.json(res, 200, { ok: true, kind: "tgz", downloadUrl: install, fileName: "(按安装源)", ...base, note: "本机无 release tgz，将从安装源下载" }); return; }
			this.json(res, 200, { ok: true, kind: "tgz", spec: tgz, file: tgz.replace("file:", ""), source: "本机 release 目录（" + install + "）", fileName: basename(tgz.replace("file:", "")), ...base });
		} else {
			this.json(res, 200, { ok: true, kind: "github", spec: install, source: install, fileName: "(从 " + install + " 拉取)", ...base });
		}
	}

	async handleFeatureDownload(req, res) {
		let body = {};
		try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
		const target = (await featureList()).find((f) => f.id === body.id);
		if (!target) { this.json(res, 400, { ok: false, error: "未知的功能 id" }); return; }
		const depErr = hostDependencyError(target);
		if (depErr) { this.json(res, 400, { ok: false, error: depErr }); return; }
		const force = body.force === true;
		if (!force && isInstalled(target.pkg)) { this.json(res, 200, { ok: true, alreadyInstalled: true }); return; }
		const d = await downloadFeature(target);
		this.json(res, 200, d);
	}

	async handleUpdateCheck(res) {
		const results = [];
		for (const p of await managedPlugins()) {
			const current = installedVersion(p.folder);
			let latest = "";
			let ok = false;
			for (let attempt = 0; attempt < 3 && !ok; attempt++) {
				try { const r = await fetch(`${GITHUB_RAW}/${p.folder}/package.json`); if (r.ok) { latest = ((await r.json()) || {}).version || ""; ok = true; } }
				catch (e) {}
				if (!ok && attempt < 2) await new Promise((x) => setTimeout(x, 400));
			}
			results.push({ folder: p.folder, name: p.name, label: p.label, current, latest, fetchFailed: !ok, hasUpdate: Boolean(current && latest && latest !== current) });
		}
		this.json(res, 200, { ok: true, results });
	}

	async handleUninstall(req, res) {
		let body = {};
		try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
		const wanted = Array.isArray(body.plugins) ? body.plugins : [];
		const managed = await managedPlugins();
		const names = wanted.filter((n) => typeof n === "string" && managed.some((p) => p.name === n));
		if (names.length === 0) { this.json(res, 400, { ok: false, error: "未选择要卸载的插件" }); return; }
		const results = [];
		for (const name of names) {
			const p = managed.find((c) => c.name === name);
			if (!p) { results.push({ name, ok: false, error: "未知插件" }); continue; }
			try {
				const pkgFile = join(profileDir(), "package.json");
				const pkg = JSON.parse(readFileSync(pkgFile, "utf8"));
				if (pkg.dependencies && pkg.dependencies[name]) delete pkg.dependencies[name];
				if (pkg.dsh && pkg.dsh.profile && Array.isArray(pkg.dsh.profile.bundles)) pkg.dsh.profile.bundles = pkg.dsh.profile.bundles.filter((b) => b !== name);
				writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + "\n", "utf8");
				const folderDir = join(CHEECO_DIR, p.folder);
				if (existsSync(folderDir)) rmSync(folderDir, { recursive: true, force: true });
				results.push({ name, ok: true });
			} catch (e) { results.push({ name, ok: false, error: String(e && e.message || e) }); }
		}
		this.json(res, 200, { ok: results.every((r) => r.ok), results });
	}

	async handleRestart(res) {
		const ok = scheduleRestart();
		this.json(res, 200, { ok, message: ok ? "正在重启当前 profile（约 10 秒后刷新页面生效）" : "未能成功重启，本次执行，须手动重启后生效。" });
	}
}
