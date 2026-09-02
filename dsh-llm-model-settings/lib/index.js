/**
 * @cheeco/dsh-llm-model-settings host half
 *
 * 「模型设置」tab 的宿主端：
 *   GET  /model-settings            -> 返回当前 settings.yaml 里 llm-pi-ai.providers（可配置提供方+模型）
 *   POST /model-settings            -> 按 provider / provider+model 定向合并参数，写回 settings.yaml
 *
 * 说明：
 *   - 只管理「可配置提供方」llm-pi-ai.providers.*（含本地 Ollama / 自定义提供方），这些模型的参数
 *     就存在 settings.yaml；内置 catalog provider（如 deepseek-official）不走 settings.yaml，不在本页范围。
 *   - 通用字段：temperature / topP / topK / maxTokens / contextWindow / reasoning 默认档 / reasoningEfforts。
 *   - 视觉能力不做手动开关，由模型自身能力决定（服务端按 input 自动判定）。
 */
import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/** 从安装路径推断 DSH_HOME（…\profiles\<name>\… 取 profiles 之前的部分）。 */
function resolveDshHome() {
	if (process.env.DSH_HOME) return process.env.DSH_HOME.replace(/\\$/, "");
	const here = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");
	const idx = here.lastIndexOf("profiles");
	return idx === -1 ? "" : here.slice(0, idx);
}

/** 读请求体（POST JSON）。 */
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (chunk) => { data += chunk; });
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}

export default class DshLlmModelSettingsHost {
	static name = "dsh-llm-model-settings-host";
	static inject = ["webServer"];

	constructor(ctx, config) {
		const dshHome = resolveDshHome();
		const settingsFile = join(dshHome, "settings.yaml");

		/** 读 settings.yaml；解析失败返回空对象（绝不写坏）。 */
		const readSettings = () => {
			try {
				const doc = yamlLoad(readFileSync(settingsFile, "utf8"));
				return (doc && typeof doc === "object") ? doc : {};
			} catch (e) {
				return {};
			}
		};

		/** 原子写回：先 mkdir（防止目录缺失），dump 整个文档（保留非 llm-pi-ai 的其他 section）。 */
		const writeSettings = (doc) => {
			mkdirSync(dirname(settingsFile), { recursive: true });
			writeFileSync(settingsFile, yamlDump(doc, { lineWidth: 120 }), "utf8");
		};

		/** 归一化一个 provider 模型的显示对象。 */
		const modelView = (id, m) => ({
			id,
			name: m && typeof m.name === "string" ? m.name : undefined,
			contextWindow: m && typeof m.contextWindow === "number" ? m.contextWindow : undefined,
			maxTokens: m && typeof m.maxTokens === "number" ? m.maxTokens : undefined,
			temperature: m && typeof m.temperature === "number" ? m.temperature : undefined,
			topP: m && typeof m.topP === "number" ? m.topP : undefined,
			topK: m && typeof m.topK === "number" ? m.topK : undefined,
			reasoningEfforts: m && m.reasoningEfforts ? m.reasoningEfforts : undefined
		});

		/** 归一化一个 provider 的显示对象（provider 级 + 模型列表）。 */
		const providerView = (name, p) => {
			const models = (Array.isArray(p && p.models) ? p.models : []).map((m) => modelView(m && m.id, m));
			return {
				name,
				displayName: (p && typeof p.displayName === "string") ? p.displayName : name,
				api: p && p.api ? p.api : undefined,
				baseURL: p && p.baseURL ? p.baseURL : undefined,
				reasoning: p && typeof p.reasoning === "string" ? p.reasoning : undefined,
				thinkingBudgets: p && p.thinkingBudgets ? p.thinkingBudgets : undefined,
				compat: p && p.compat ? p.compat : undefined,
				models
			};
		};

		/** 返回给前端的配置：llm-pi-ai.providers 的归一化视图。 */
		const getState = () => {
			const doc = readSettings();
			const providers = (doc["llm-pi-ai"] && doc["llm-pi-ai"].providers) || {};
			const list = Object.entries(providers).map(([name, p]) => providerView(name, p));
			return { ok: true, settingsFile, providers: list };
		};

		ctx.effect(() => {
			const dispose = ctx.webServer.register({
				kind: "exact",
				path: "/model-settings",
				handler: async (req, res) => {
					const json = (code, payload) => {
						const body = JSON.stringify(payload);
						res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
						res.end(body);
					};

					if (req.method === "GET") {
						json(200, getState());
						return;
					}

					if (req.method === "POST") {
						let data;
						try { data = JSON.parse((await readBody(req)) || "{}"); } catch (e) { data = {}; }
						if (!data || typeof data !== "object") { json(400, { ok: false, error: "expected JSON object" }); return; }
						const provider = typeof data.provider === "string" ? data.provider : "";
						if (!provider) { json(400, { ok: false, error: "missing provider" }); return; }

						const doc = readSettings();
						const providers = (doc["llm-pi-ai"] || { providers: {} });
						doc["llm-pi-ai"] = providers;
						const route = providers.providers[provider] || (providers.providers[provider] = {});
						const patch = data.patch && typeof data.patch === "object" ? data.patch : {};

						if (typeof data.model === "string" && data.model) {
							// 更新某个模型。
							const models = Array.isArray(route.models) ? route.models : (route.models = []);
							let entry = models.find((m) => m && m.id === data.model);
							if (!entry) { entry = { id: data.model }; models.push(entry); }
							for (const [k, v] of Object.entries(patch)) {
								if (v === undefined || v === null || v === "") delete entry[k];
								else entry[k] = v;
							}
						} else {
							// 更新 provider 级字段。
							for (const [k, v] of Object.entries(patch)) {
								if (v === undefined || v === null || v === "") delete route[k];
								else route[k] = v;
							}
						}

						try {
							writeSettings(doc);
							json(200, { ok: true, ...getState() });
						} catch (e) {
							json(500, { ok: false, error: "write failed: " + String(e && e.message || e) });
						}
						return;
					}

					res.writeHead(405);
					res.end();
				}
			});
			return () => { dispose(); };
		}, "dsh-llm-model-settings: /model-settings");
	}
}
