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
 * 同步「更多」菜单卡：扫描 node_modules/@cheeco 下每个已装插件的 package.json `dsh.cheecoMoreCards`
 * 声明，重建卡片列表并写进 cheeco-registry.json 的 `moreCards`。
 *  - 装上 → 声明在 → 卡出现；卸载 → 声明没了 → 卡被重建自然删掉，不残留。
 *  - 每张卡带 `owner` = 提供它的插件包名。
 */
function syncMoreCards() {
	const cards = [];
	for (const dir of readdirSync(CHEECO_DIR, { withFileTypes: true })) {
		if (!dir.isDirectory()) continue;
		let decl = null;
		try {
			const pkg = JSON.parse(readFileSync(join(CHEECO_DIR, dir.name, "package.json"), "utf8"));
			decl = (pkg.dsh && pkg.dsh.cheecoMoreCards) || null;
		} catch (e) { decl = null; }
		if (!decl) continue;
		for (const c of Array.isArray(decl) ? decl : []) {
			if (c && c.id && !cards.some((x) => x.id === c.id)) cards.push({ ...c, owner: "@cheeco/" + dir.name });
		}
	}
	cards.sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0));
	const reg = readRegistry();
	reg.moreCards = cards;
	writeRegistry(reg);
	return cards;
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
						// 每次读取都按当前已装插件声明重建（轻量），保证卸载插件后卡片即时消失。
						const cards = syncMoreCards();
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
