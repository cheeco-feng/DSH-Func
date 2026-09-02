/**
 * @cheeco/dsh-client-ui-system-info host half
 *
 * 职责：
 *  1. 实例启动时向 <DSH_HOME>\.dsh-runtime\<pid>.json 写「心跳」（供多实例/多 profile 互检）；
 *  2. 进程退出时删除自己的心跳；
 *  3. 暴露 /sysinfo 接口：返回当前 profile、DSH_HOME、dsh/插件版本、以及「当前已运行实例」列表
 *     （读所有心跳 + process.kill(pid,0) 存活检测，崩溃残留自动忽略）。
 *
 * 心跳目录放在 DSH_HOME 下（跨实例可读），是「系统信息」与后续「会话互斥」共同的地基。
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync, existsSync, appendFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import { spawn } from "node:child_process";

const HERE = dirname(fileURLToPath(import.meta.url)).replace(/\\/g, "/");

/** 当前 profile 名：从安装路径推断 ……\profiles\<name>\…… */
function resolveProfileName() {
	const parts = HERE.split("/");
	const idx = parts.lastIndexOf("profiles");
	return idx === -1 ? "" : parts[idx + 1] || "";
}

/** DSH_HOME：优先环境变量；否则从安装路径上溯（…\profiles\<name>\… 取 profiles 之前的部分）。 */
function resolveDshHome() {
	if (process.env.DSH_HOME) return process.env.DSH_HOME.replace(/\\$/, "");
	const parts = HERE.split("/");
	const idx = parts.lastIndexOf("profiles");
	if (idx === -1) return "";
	return parts.slice(0, idx).join("/");
}

/** 从命令行解析端口（bin.js web --port 49982 / --profile test --port 49984）。 */
function resolvePort() {
	const a = process.argv;
	for (let i = 0; i < a.length - 1; i++) {
		if (a[i] === "--port") {
			const v = Number(a[i + 1]);
			if (Number.isFinite(v) && v > 0) return v;
		}
	}
	return null;
}

/** 读 dsh CLI 包版本。 */
function dshVersion() {
	try {
		const require = createRequire(import.meta.url);
		return JSON.parse(readFileSync(require.resolve("@deepseek-ai/dsh/package.json"), "utf8")).version || "";
	} catch (e) { return ""; }
}

/** 读取并解析所有心跳，进程已死/损坏的直接忽略。 */
function readHeartbeatDir(dir) {
	if (!dir) return [];
	try {
		return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => {
			try { return JSON.parse(readFileSync(join(dir, f), "utf8")); }
			catch (e) { return null; }
		}).filter(Boolean);
	} catch (e) { return []; }
}

/** 存活检测：pid 存在且非本进程；本进程自己永远判为「运行中」。 */
function isAlive(pid, selfPid) {
	if (pid === selfPid) return true;
	try { process.kill(pid, 0); return true; }
	catch (e) { return e.code === "EPERM"; }
}

/** 读请求体（POST JSON）。 */
function readBody(req) {
	return new Promise((resolve, reject) => {
		let data = "";
		req.on("data", (c) => { data += c; });
		req.on("end", () => resolve(data));
		req.on("error", reject);
	});
}

export default class DshClientUiSystemInfo {
	static name = "dsh-client-ui-system-info";
	static inject = ["webServer"];

	constructor(ctx, config) {
		const self = this;
		const dshHome = resolveDshHome();
		const profileName = resolveProfileName();
		const port = resolvePort();
		const pid = process.pid;
		const heartbeatDir = dshHome ? join(dshHome, ".dsh-runtime") : "";

		// 写心跳 + 退出清理。
		let heartbeatPath = "";
		if (heartbeatDir) {
			try {
				mkdirSync(heartbeatDir, { recursive: true });
				heartbeatPath = join(heartbeatDir, `${pid}.json`);
				writeFileSync(heartbeatPath, JSON.stringify({
					pid,
					port,
					profile: profileName,
					dshHome,
					startedAt: new Date().toISOString()
				}, null, 2), "utf8");
				process.on("exit", () => {
					try { rmSync(heartbeatPath, { force: true }); } catch (e) { /* ignore */ }
				});
			} catch (e) {
				// 写不进去（权限/目录异常）则不拦截启动，仅提供 /sysinfo 的静态信息。
				heartbeatPath = "";
			}
		}

		// /sysinfo 数据接口 + /sysinfo/restart 重启命令路由。
		ctx.effect(() => {
			const disposeSysinfo = ctx.webServer.register({
				kind: "exact",
				path: "/sysinfo",
				handler: (req, res) => {
					const instances = readHeartbeatDir(heartbeatDir).map((h) => ({
						pid: h.pid,
						port: h.port,
						profile: h.profile,
						dshHome: h.dshHome,
						startedAt: h.startedAt,
						alive: typeof h.pid === "number" ? isAlive(h.pid, pid) : false
					}))/* 只保留「运行中」的实例：每个 profile 唯一，最多 3 台（mobile/test/web）。
					   失效的残留心跳（Stop-Process 强杀导致 exit 清理未跑）不再返回，避免列表被一堆旧 PID 占满。*/
					.filter((h) => h.alive)
					.sort((a, b) => String(a.port).localeCompare(String(b.port)));
					const body = JSON.stringify({
						ok: true,
						profileName,
						dshHome,
						port,
						pid,
						dshVersion: dshVersion(),
						pluginVersion: "0.2.2",
						instances
					});
					res.statusCode = 200;
					res.setHeader("Content-Type", "application/json; charset=utf-8");
					res.setHeader("Cache-Control", "no-store");
					res.end(body);
				}
			});

			// 重启/关闭命令：前端传 {profile, port} → spawn 调用 <DSH_HOME>\profiles\<script>。
			// restart：停旧+起新；close：仅停（不拉起）。detached + unref，立即返回。
			// 每次请求写日志 logs\dsh-systeminfo-action.log，并把结构化的「状态返回」给前端，便于确认「点击了什么、返回了什么」。
			const actionLog = (line) => {
				try { appendFileSync(join(dshHome, "logs", "dsh-systeminfo-action.log"), new Date().toISOString() + " " + line + "\n", "utf8"); } catch (e) { /* ignore */ }
			};
			const actionHandler = (scriptName, actionLabel) => async (req, res) => {
				const send = (code, payload) => {
					const b = JSON.stringify(payload);
					res.writeHead(code, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
					res.end(b);
				};
				let body = {};
				try { body = JSON.parse((await readBody(req)) || "{}"); } catch (e) { body = {}; }
				const targetProfile = typeof body.profile === "string" ? body.profile.trim() : "";
				const targetPort = Number(body.port);
				if (!targetProfile || !(Number.isFinite(targetPort) && targetPort > 0)) {
					actionLog(`[${actionLabel}] 参数错误 profile=${JSON.stringify(targetProfile)} port=${body.port}`);
					send(400, { ok: false, action: actionLabel, error: "缺少 profile 或 port 参数" });
					return;
				}
				// 步骤 2：检查功能是否可用（脚本存在 + 目标实例是否登记在运行）
				const script = join(dshHome, "profiles", scriptName);
				if (!existsSync(script)) {
					actionLog(`[${actionLabel}] 功能不可用：脚本缺失 ${script}`);
					send(500, { ok: false, action: actionLabel, error: "功能不可用：未找到脚本 " + script });
					return;
				}
				const target = readHeartbeatDir(heartbeatDir).find((h) => Number(h.port) === targetPort && h.profile === targetProfile);
				if (!target) {
					actionLog(`[${actionLabel}] 功能不可用：未发现运行实例 profile=${targetProfile} port=${targetPort}`);
					send(200, { ok: false, action: actionLabel, error: "功能不可用：未发现运行中的 " + targetProfile + "（端口 " + targetPort + "）" });
					return;
				}
				// 步骤 3：先返回「功能可用」
				const verb = actionLabel === "close" ? "关闭" : "重启";
				const message = "功能可用，正在" + verb + " " + targetProfile + "（端口 " + targetPort + "）…" + (actionLabel === "close" ? "该实例进程将停止，不再自动拉起" : "请稍后刷新页面");
				actionLog(`[${actionLabel}] 功能可用 profile=${targetProfile} port=${targetPort} script=${scriptName} targetAlive=true`);
				send(202, { ok: true, status: "available", action: actionLabel, profile: targetProfile, port: targetPort, script: scriptName, message });
				// 步骤 4：再异步执行（detached，不阻塞已返回的响应）
				try {
					const child = spawn("powershell", [
						"-NoProfile", "-ExecutionPolicy", "Bypass", "-File", script,
						"-Profile", targetProfile, "-Port", String(targetPort)
					], { detached: true, stdio: "ignore" });
					child.unref();
					child.on("error", (e) => actionLog(`[${actionLabel}] spawn error profile=${targetProfile} port=${targetPort}: ${e && e.message || e}`));
					child.on("exit", (code) => actionLog(`[${actionLabel}] exit code=${code} profile=${targetProfile} port=${targetPort}`));
					actionLog(`[${actionLabel}] 已发起 pid=${child.pid}`);
				} catch (e) {
					actionLog(`[${actionLabel}] spawn throw profile=${targetProfile} port=${targetPort}: ${e && e.message || e}`);
				}
			};

			const disposeRestart = ctx.webServer.register({
				kind: "exact",
				path: "/sysinfo/restart",
				handler: actionHandler("restart-dsh-profile.ps1", "restart")
			});
			const disposeClose = ctx.webServer.register({
				kind: "exact",
				path: "/sysinfo/close",
				handler: actionHandler("close-dsh-profile.ps1", "close")
			});

			// 功能可用性检查：打开页面时前端 GET 本接口，依据 restart/close 脚本是否存在决定按钮是否置灰。
			const disposeStatus = ctx.webServer.register({
				kind: "exact",
				path: "/sysinfo/actions/status",
				handler: (req, res) => {
					const probe = (name) => ({ available: existsSync(join(dshHome, "profiles", name)), script: join(dshHome, "profiles", name) });
					const body = JSON.stringify({ ok: true, restart: probe("restart-dsh-profile.ps1"), close: probe("close-dsh-profile.ps1") });
					res.writeHead(200, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
					res.end(body);
				}
			});

			return () => { disposeSysinfo(); disposeStatus(); disposeRestart(); disposeClose(); };
		}, "dsh-client-ui-system-info: /sysinfo");
	}
}
