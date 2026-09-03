import * as fs from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
//#region src/index.mjs
/** 插件安装目录（`<profile>/node_modules/@cheeco`）：配置/分配持久化文件写在这，
 *  随 @cheeco 目录一起迁移（本目录是 dsh-client-ui-schedule-panel 的上级上级上级）。 */
const CHEECO_DIR = dirname(dirname(dirname(fileURLToPath(import.meta.url))));
/** 调度面板只读状态路由（client 轮询地址，与 client.js 一致）。 */
const STATE_PATH = "/plugins/dsh-schedule-panel/state";
/** 任务输出读取路由（tail：返回 shadow 缓冲累积全文，full: true 契约）。 */
const OUTPUT_PATH = "/plugins/dsh-schedule-panel/output";
/** 任务模型分配路由（每会话：任务类型 -> 指定的 provider/model）。 */
const ASSIGN_PATH = "/plugins/dsh-schedule-panel/assign";
/** sessionId -> { task: { provider, model } }（进程内运行时指定，不写死全局）。 */
const assignments = /* @__PURE__ */ new Map();
const DSH_HOME = process.env.DSH_HOME ?? "F:/DeepSeekHarnessDataOriginal";
const ASSIGN_FILE = join(CHEECO_DIR, "schedule-panel-assign.json");
const SETTINGS_FILE = `${DSH_HOME}/settings.yaml`;
const MODELS_PATH = "/plugins/dsh-schedule-panel/models";
/** 最近压缩运行记录（实际传给 llm 的 provider/model）。 */
const COMPACTION_RUNS_PATH = "/plugins/dsh-schedule-panel/compaction-runs";
const compactionRuns = [];
/** 启动时从磁盘加载分配（跨重启/刷新保留）。 */
function loadAssignments() {
	try {
		const raw = fs.readFileSync(ASSIGN_FILE, "utf8");
		const obj = JSON.parse(raw);
		for (const k of Object.keys(obj)) assignments.set(k, obj[k]);
	} catch {}
}
/** 每次设置后落盘。 */
function saveAssignments() {
	try {
		const obj = {};
		for (const [k, v] of assignments) obj[k] = v;
		fs.writeFileSync(ASSIGN_FILE, JSON.stringify(obj, null, 2));
	} catch {}
}
/** 从 settings.yaml 提取可用 provider/model（llm-pi-ai.providers 下的模型）。 */
function collectModels() {
	const out = [];
	try {
		const lines = fs.readFileSync(SETTINGS_FILE, "utf8").split("\n");
		let provider = "";
		for (const raw of lines) {
			const line = raw.replace(/\s+$/, "");
			const mProvider = line.match(/^    (\S[^:#]*):$/);
			if (mProvider) provider = mProvider[1].trim();
			const mModel = line.match(/^\s*-\s*id:\s*(.+)$/);
			if (mModel && provider !== "") out.push({ provider, model: mModel[1].trim() });
		}
	} catch {}
	return out;
}
/** 读取某会话某任务的模型分配；未分配返回 undefined。 */
function getAssignment(session, task, fallbackToDefault = true) {
	const per = assignments.get(session);
	if (per !== void 0 && per[task] !== void 0) return per[task];
	if (fallbackToDefault) {
		const def = assignments.get("__default__");
		if (def !== void 0 && def[task] !== void 0) return def[task];
	}
	return void 0;
}
/** 设置某会话某任务的模型分配（provider/model 空串 = 未指定/跟随默认）。 */
function setAssignment(session, task, provider, model) {
	if (typeof session !== "string" || session === "") return;
	if (session === "__default__" && (provider === "" || model === "")) {
		const def = assignments.get("__default__");
		if (def !== void 0) delete def[task];
		if (def === void 0 || Object.keys(def).length === 0) assignments.delete("__default__");
		saveAssignments();
		return;
	}
	const per = assignments.get(session) ?? {};
	per[task] = { provider, model };
	assignments.set(session, per);
	saveAssignments();
}
/** taskId -> 累积输出（已读增量的顺序累积：插件自读 + 官方直读）。 */
const outputBuffers = /* @__PURE__ */ new Map();
/** taskId -> 官方 read 已消费的缓冲长度（镜像游标，仅前移）。 */
const officialConsumed = /* @__PURE__ */ new Map();
/** 底层原始 jobs.read（apply 时绑定）。 */
let rawRead = void 0;
let rawLlmStream = void 0;
/** 把一段增量追加进 shadow 缓冲（保尾截断）。 */
function accumulate(id, text) {
	if (typeof text !== "string" || text.length === 0) return;
	const prev = outputBuffers.get(id) ?? "";
	outputBuffers.set(id, (prev + text).slice(-65536));
}
/** Cordis 插件名。 */
const name = "schedule-panel";
/** 所需服务：web 形状的 HTTP 载体 + 任务注册表 + agent 注册表。 */
const inject = [
	"webServer",
	"jobs",
	"agents",
	"llm"
];
/** 裁剪任务快照到 wire 视图（内部记账不跨线）。 */
function toWire(snapshot) {
	return {
		id: snapshot.id,
		kind: snapshot.kind,
		label: snapshot.label,
		status: snapshot.status,
		...snapshot.detail !== void 0 ? { detail: snapshot.detail } : {},
		startedAt: snapshot.startedAt,
		...snapshot.finishedAt !== void 0 ? { finishedAt: snapshot.finishedAt } : {},
		...snapshot.ownerSession !== void 0 ? { ownerSession: snapshot.ownerSession } : {}
	};
}
/** 收集宿主全部任务：owned（按 agent 遍历）+ unowned，按 id 去重。 */
function collectTasks(ctx) {
	const jobs = ctx.jobs;
	const seen = /* @__PURE__ */ new Set();
	const out = [];
	for (const agent of ctx.agents.list()) for (const snapshot of jobs.list(agent)) {
		if (snapshot.ownerSession === void 0 || seen.has(snapshot.id)) continue;
		seen.add(snapshot.id);
		out.push(toWire(snapshot));
	}
	for (const snapshot of jobs.list()) {
		if (seen.has(snapshot.id)) continue;
		seen.add(snapshot.id);
		out.push(toWire(snapshot));
	}
	return out;
}
/** 按归属会话分组的任务计数（面板分组用）。 */
function groupCounts(tasks) {
	const map = /* @__PURE__ */ new Map();
	for (const task of tasks) {
		const owner = task.ownerSession ?? "unowned";
		const entry = map.get(owner) ?? {
			total: 0,
			running: 0,
			finished: 0
		};
		entry.total += 1;
		if (task.status === "running" || task.status === "stopping") entry.running += 1;
		if (task.status === "completed" || task.status === "killed" || task.status === "failed") entry.finished += 1;
		map.set(owner, entry);
	}
	return Array.from(map, ([owner, stats]) => ({
		owner,
		...stats
	}));
}
/**
* 读取一个任务的输出 tail（镜像版）：与 task-status 同构，保证官方 read 与插件
* 自读看到同一增量序列（无重复无丢失）。返回累积全文（客户端整段替换）。
* @param ctx - host cordis context。
* @param id - 任务 id。
* @returns 累积 text 与读后快照；任务不存在返回 null。
*/
function readTaskOutput(ctx, id) {
	if (!collectTasks(ctx).some((snapshot) => snapshot.id === id)) return null;
	const jobs = ctx.jobs;
	let caller;
	for (const agent of ctx.agents.list()) if (jobs.list(agent).some((snapshot) => snapshot.id === id)) {
		caller = agent;
		break;
	}
	const read = caller === void 0 ? rawRead(id) : rawRead(id, caller);
	accumulate(id, read?.text);
	return {
		text: outputBuffers.get(id) ?? "",
		snapshot: read.snapshot
	};
}
/**
* 插件主体：打 read 镜像补丁 + 注册调度状态与输出读取路由。
* @param ctx - host cordis context。
*/
function apply(ctx) {
	ctx.effect(() => {
		loadAssignments();
		rawLlmStream = ctx.llm.stream.bind(ctx.llm);
		ctx.llm.stream = (options, ...rest) => {
			if (options != null && options.purpose === "compaction") {
				const assign = getAssignment(options.sessionId, "compaction");
				if (assign !== void 0 && assign.provider && assign.model) {
					options = { ...options, provider: assign.provider, model: assign.model };
				}
				compactionRuns.push({ sessionId: options.sessionId, provider: options.provider, model: options.model, at: Date.now() });
				if (compactionRuns.length > 50) compactionRuns.shift();
			}
			return rawLlmStream(options, ...rest);
		};
		rawRead = ctx.jobs.read.bind(ctx.jobs);
		ctx.jobs.read = (id, caller) => {
			const buf = outputBuffers.get(id);
			const consumed = officialConsumed.get(id) ?? 0;
			const mirror = buf !== void 0 && buf.length > consumed ? buf.slice(consumed) : "";
			const result = rawRead(id, caller);
			accumulate(id, result?.text);
			const text = mirror + (result?.text ?? "");
			officialConsumed.set(id, (buf?.length ?? 0) + (typeof result?.text === "string" ? result.text.length : 0));
			return {
				text,
				snapshot: result.snapshot
			};
		};
		const disposeState = ctx.webServer.register({
			kind: "exact",
			path: STATE_PATH,
			handler: async (_req, res) => {
				try {
					const tasks = collectTasks(ctx);
					res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({
						tasks,
						groups: groupCounts(tasks),
						generatedAt: Date.now()
					}));
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ error: message }));
				}
			}
		});
		const disposeOutput = ctx.webServer.register({
			kind: "exact",
			path: OUTPUT_PATH,
			handler: async (req, res) => {
				try {
					const id = new URL(req.url ?? "/", "http://dsh.internal").searchParams.get("id") ?? "";
					if (id === "") {
						res.writeHead(400, { "content-type": "application/json; charset=utf-8" });
						res.end(JSON.stringify({ error: "missing task id" }));
						return;
					}
					const read = readTaskOutput(ctx, id);
					if (read === null || read.snapshot === void 0) {
						res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
						res.end(JSON.stringify({ error: `task ${id} not found` }));
						return;
					}
					res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({
						text: read.text,
						full: true,
						snapshot: read.snapshot
					}));
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ error: message }));
				}
			}
		});
		const disposeAssign = ctx.webServer.register({
			kind: "exact",
			path: ASSIGN_PATH,
			handler: async (req, res) => {
				try {
					const url = new URL(req.url ?? "/", "http://dsh.internal");
					const session = url.searchParams.get("session") ?? "";
					if ((req.method ?? "GET") === "POST") {
						let body = "";
						for await (const chunk of req) body += chunk;
						let parsed = {};
						try { parsed = JSON.parse(body || "{}"); } catch {}
						const target = typeof parsed.session === "string" ? parsed.session : session;
						const task = typeof parsed.task === "string" ? parsed.task : "compaction";
						const provider = typeof parsed.provider === "string" ? parsed.provider : "";
						const model = typeof parsed.model === "string" ? parsed.model : "";
						setAssignment(target, task, provider, model);
						res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
						res.end(JSON.stringify({ ok: true, assignment: getAssignment(target, task) ?? null }));
						return;
					}
					res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ assignment: getAssignment(session, "compaction", session === "__default__" ? false : true) ?? null }));
				} catch (error) {
					const message = error instanceof Error ? error.message : String(error);
					res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ error: message }));
				}
			}
		});
		const disposeModels = ctx.webServer.register({
			kind: "exact",
			path: MODELS_PATH,
			handler: async (_req, res) => {
				try {
					res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ models: collectModels() }));
				} catch (error) {
					res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ error: String(error) }));
				}
			}
		});
		const disposeCompactionRuns = ctx.webServer.register({
			kind: "exact",
			path: COMPACTION_RUNS_PATH,
			handler: async (req, res) => {
				try {
					const url = new URL(req.url ?? "/", "http://dsh.internal");
					const sid = url.searchParams.get("session");
					let items = sid ? compactionRuns.filter((x) => x.sessionId === sid) : compactionRuns;
					items = items.slice(-10).reverse();
					res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ runs: items }));
				} catch (error) {
					res.writeHead(500, { "content-type": "application/json; charset=utf-8" });
					res.end(JSON.stringify({ error: String(error) }));
				}
			}
		});
		return () => {
			ctx.llm.stream = rawLlmStream;
			rawLlmStream = void 0;
			ctx.jobs.read = rawRead;
			rawRead = void 0;
			disposeState();
			disposeOutput();
			disposeAssign();
			disposeModels();
			disposeCompactionRuns();
		};
	}, "schedule-panel: mirror jobs.read + state/output routes");
}
//#endregion
export { OUTPUT_PATH, STATE_PATH, apply, inject, name };
