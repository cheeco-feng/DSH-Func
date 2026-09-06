// dsh-web-ui-WindowSlot-Panel — node half.
// 职责：①空 apply（宿主 cordis row，让插件被识别）；②提供 /more-cards/config 路由。
// 「更多」菜单卡片**注册在 cheeco-registry.json 的 `moreCards` 字段**（与 cheeco-style 的
// syncRegistry 同思路）：扫描 node_modules/@cheeco 下每个已装插件的 package.json `dsh.cheecoMoreCards`
// 声明，重建 moreCards → 装进删出（卸载插件声明没了，卡自动消失，不残留）。
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_PATH = "/more-cards/config";

/** `node_modules/@cheeco` —— 本插件目录的上级。 */
const CHEECO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

/** 注册表文件（@cheeco/cheeco-registry.json，与 cheeco-style 共用同一份）。 */
const REGISTRY_FILE = "cheeco-registry.json";
function registryPath() { return join(CHEECO_DIR, REGISTRY_FILE); }

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
function readRegistry() {
	try { return JSON.parse(readFileSync(registryPath(), "utf8")) || {}; } catch (e) { return { profile: resolveProfileName(), installed: [], events: [], moreCards: [] }; }
}
function writeRegistry(reg) {
	reg.profile = resolveProfileName();
	reg.updatedAt = new Date().toISOString();
	mkdirSync(dirname(registryPath()), { recursive: true });
	writeFileSync(registryPath(), JSON.stringify(reg, null, 2), "utf8");
}

/**
 * 同步注册表：扫描 node_modules/@cheeco 下每个已装插件 package.json，重建 `installed` 数组——
 * 每条 = { name, folder, version, installedAt, menus:该插件的 dsh.cheecoMoreCards 声明 }。
 * 菜单**挂在插件条目下**（分组）：装上 → 该插件条目(含其菜单)出现；卸载 → 该插件目录没了 → 条目随之删除，
 * 系统自然知道"卸载某插件要删它那条(连带菜单)"。`installed` 即"已装插件清单 + 各自菜单"。
 */
function syncRegistry() {
	const prev = (readRegistry().installed || []).map((e) => [e.name, e]);
	const prevMap = new Map(prev);
	const installed = [];
	for (const dir of readdirSync(CHEECO_DIR, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		let pkg = null;
		try { pkg = JSON.parse(readFileSync(join(CHEECO_DIR, dir.name, "package.json"), "utf8")); } catch (e) { continue; }
		if (!pkg || typeof pkg.name !== "string" || !pkg.name) continue;
		const decl = (pkg.dsh && Array.isArray(pkg.dsh.cheecoMoreCards)) ? pkg.dsh.cheecoMoreCards : [];
		const before = prevMap.get(pkg.name);
		installed.push({
			name: pkg.name,
			folder: dir.name,
			version: pkg.version || "",
			installedAt: before ? before.installedAt : new Date().toISOString(),
			menus: decl.map((c) => ({ ...c, owner: pkg.name }))
		});
	}
	installed.sort((a, b) => a.name.localeCompare(b.name));
	const reg = readRegistry();
	reg.installed = installed;
	delete reg.moreCards; // 卡片不单独平铺 moreCards，统一挂在 installed[].menus（按插件分组）。
	writeRegistry(reg);
	return installed;
}

/** 「更多」菜单卡 = 所有已装插件条目下 menus 的并集。 */
function moreCardsFrom(installed) {
	const cards = (installed || []).flatMap((e) => Array.isArray(e.menus) ? e.menus : []);
	return cards.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
}

export default class DshWebUiWindowSlotPanel {
	static name = "web-ui-window-slot-panel";
	static inject = ["webServer"];

	constructor(ctx) {
		ctx.effect(() => {
			const dispose = ctx.webServer.register({
				kind: "exact",
				path: CONFIG_PATH,
				handler: (req, res) => {
					if (req.method === "GET") {
						// 每次读取都按当前已装插件声明重建（轻量），保证卸载插件后其条目(连带菜单)即时消失。
						const installed = syncRegistry();
						const cards = moreCardsFrom(installed);
						res.writeHead(200, {
							"content-type": "application/json; charset=utf-8",
							"cache-control": "no-store"
						});
						res.end(JSON.stringify({ cards }));
						return;
					}
					res.writeHead(405);
					res.end();
				}
			});
			return () => dispose();
		}, "dsh-web-ui-window-slot-panel: more-cards registry route");
	}
}
