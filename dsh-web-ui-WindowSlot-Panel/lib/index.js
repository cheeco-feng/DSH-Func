// dsh-web-ui-WindowSlot-Panel — node half.
// 职责：①空 apply（宿主 cordis row，让插件被识别）；②提供 /more-cards/config 路由，读写
// @cheeco/setting/DSH-More-Cards-config.json（「更多」弹窗的卡片外置配置，不存在才创建）。
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_PATH = "/more-cards/config";

/** `node_modules/@cheeco` —— 本插件目录的上级。 */
const CHEECO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));

const CONFIG_FILENAME = "DSH-More-Cards-config.json";

function resolveConfigFile() {
	return join(CHEECO_DIR, "setting", CONFIG_FILENAME);
}

/** 默认卡片：①「复制链接」复制当前会话深链接；②「打开当前会话」新窗口打开该深链接。均可被用户改配置覆盖。 */
const DEFAULT_CARDS = [
	{ id: "copy-current-url", label: "复制链接", desc: "把当前页面的网址复制到剪贴板", type: "copy-url", url: "" },
	{ id: "open-current-session", label: "打开当前会话", desc: "在新窗口打开当前会话", type: "open", url: "" }
];

/** 渲染可人工编辑的 JSON 文档（保持缩进 + 说明注释）。 */
function renderConfigFile(v) {
	const cards = (Array.isArray(v.cards) && v.cards.length > 0) ? v.cards : DEFAULT_CARDS;
	const cardsStr = cards.map((c) => JSON.stringify({
		id: String(c.id || ""),
		label: String(c.label || ""),
		desc: String(c.desc || ""),
		type: String(c.type || "copy-url"),
		url: String(c.url || ""),
		order: Number(c.order || 0)
	})).join(",\n    ");
	return "{\n  // 更多菜单卡片（外置配置）：改 label/desc/url 无需改本插件，保存后刷新页面生效；\n  // 每张卡：id 唯一，label 标题，desc 说明，type=copy-url 点它复制 url、type=open 点它新窗口打开 url(留空则用当前会话深链接)，order 排序\n  \"cards\": [\n    " + cardsStr + "\n  ]\n}";
}

/** 确保配置文件存在（仅不存在时创建默认卡片）。 */
function ensureConfig() {
	const f = resolveConfigFile();
	if (existsSync(f)) return;
	mkdirSync(dirname(f), { recursive: true });
	writeFileSync(f, renderConfigFile({ cards: DEFAULT_CARDS }), "utf8");
}

function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => { data += chunk; });
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}

export default class DshWebUiWindowSlotPanel {
	static name = "web-ui-window-slot-panel";
	static inject = ["webServer"];

	constructor(ctx) {
		const configFile = resolveConfigFile();
		ensureConfig();
		ctx.effect(() => {
			const dispose = ctx.webServer.register({
				kind: "exact",
				path: CONFIG_PATH,
				handler: (req, res) => {
					if (req.method === "GET") {
						let value = {};
						try {
							value = JSON.parse(readFileSync(configFile, "utf8")) || {};
						} catch (e) {
							value = { cards: DEFAULT_CARDS };
						}
						res.writeHead(200, {
							"content-type": "application/json; charset=utf-8",
							"cache-control": "no-store"
						});
						res.end(JSON.stringify(value));
						return;
					}
					if (req.method === "POST") {
						readBody(req).then((raw) => {
							let data;
							try {
								data = JSON.parse(raw || "{}");
							} catch (e) {
								res.writeHead(400);
								res.end();
								return;
							}
							if (data === null || typeof data !== "object" || Array.isArray(data)) {
								res.writeHead(400);
								res.end();
								return;
							}
							mkdirSync(dirname(configFile), { recursive: true });
							writeFileSync(configFile, renderConfigFile(data), "utf8");
							res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
							res.end(JSON.stringify({ ok: true }));
							return;
						}).catch(() => {
							res.writeHead(500);
							res.end();
						});
						return;
					}
					res.writeHead(405);
					res.end();
				}
			});
			return () => dispose();
		}, "dsh-web-ui-window-slot-panel: more-cards config route");
	}
}
