/** dsh_plugin_exec — DSH 独立工具插件。
 *
 *  非官方、可复用的 agent 工具：在指定 workbench（profile）上下文执行
 *  `dsh plugin --profile <p> <cmd>`，并返回 stdout/stderr + 退出码。
 *  独立于 cheeco-style，避免 cheeco 更新覆盖它。
 *
 *  形态参照 @deepseek-ai/dsh-tool-bash（输出为带 `kind: "foreground"` 的对象，
 *  并有 presentCall/presentResult），这样工具运行时把它当成普通前台工具，
 *  不会落入 code-dispatch 调度器。 */
import { defineTool } from "@deepseek-ai/dsh-tools";
import { createRequire } from "node:module";
import fs from "node:fs";
import { execPath } from "node:process";

const name = "tool-dsh-plugin-exec";
/** 需要的 cordis 服务：工具注册表 + shell 执行器。 */
const inject = ["tools", "shell"];

/** 定位当前 DSH 运行时提供的 `dsh` CLI，不依赖 PATH。
 *
 *  首选：`require.resolve` 官方 `@deepseek-ai/dsh` 入口。DSH 会把该包的
 *  `@deepseek-ai` 依赖暴露给 profile 插件（正是本插件能 `import { defineTool }`
 *  自 `@deepseek-ai/dsh-tools` 的同一解析链），因此任何标准 DSH 安装都成立
 *  （引擎的 `@deepseek-ai` 包通过共享 node_modules 暴露给各 profile）。
 *  所以无需硬编码绝对路径、无需改 PATH/环境变量；且总是自检文件是否存在。
 *
 *  兜底：当 `dsh` 确实在全局 PATH 上时，直接用裸 `dsh`。 */
function resolveDsh() {
	try {
		const require = createRequire(import.meta.url);
		const bin = require.resolve("@deepseek-ai/dsh/lib/bin.js");
		if (fs.existsSync(bin)) return { viaNode: true, bin };
	} catch (e) { /* 此处解析不到 —— 落到 PATH 兜底 */ }
	return { viaNode: false, bin: "dsh" };
}

function apply(ctx, config = {}) {
	ctx.tools.register(defineTool({
		name: "dsh_plugin_exec",
		description: "Run a `dsh plugin` command for a DSH workbench (profile) and return its stdout/stderr + exit code. Use to install/remove/list/enable/disable plugins in a profile. `dsh plugin add <pkg|tgz>` installs the package AND auto-registers it into the profile's `dsh.profile.bundles`. Parameters: `profile` (the workbench, e.g. `web` / `test`), `command` (the args after `dsh plugin --profile <profile>`, e.g. `why @cheeco/...`, `add file:F:/.../pkg.tgz`, `remove @cheeco/...`).",
		parameters: {
			profile: { type: "string", required: true, description: "The DSH workbench/profile to target (e.g. web, test)." },
			command: { type: "string", required: true, description: "The dsh plugin arguments after `--profile <profile>` (e.g. `why @cheeco/...`)." },
			timeoutMs: { type: "number", description: "Max wait in ms. The executor applies its configured cap." }
		},
		output: {
			schema: { type: "object", additionalProperties: false, properties: {
				kind: { type: "string", required: true, const: "foreground" },
				exitCode: { oneOf: [{ type: "integer" }, { type: "null" }], required: true },
				signal: { oneOf: [{ type: "string" }, { type: "null" }], required: true },
				timedOut: { type: "boolean", required: true },
				aborted: { type: "boolean", required: true },
				timeoutMs: { type: "number", required: true },
				stdout: { type: "string", required: true },
				stderr: { type: "string", required: true }
			} },
			render: (_a, v) => [{ type: "text", text: (v.stdout || "(no output)") + (v.stderr ? "\n[stderr]\n" + v.stderr : "") + (v.exitCode !== 0 ? "\n[exit code: " + v.exitCode + "]" : "") }]
		},
		presentCall: (args) => ({ card: "terminal", title: "dsh plugin --profile " + args.profile, description: args.command }),
		presentResult: (args, result) => ({ card: "generic", content: [{ type: "text", text: result }] }),
		async execute(args, exec) {
			if (!args.profile || !args.profile.trim()) throw new Error("profile is required");
			if (!args.command || !args.command.trim()) throw new Error("command is required");
			const profile = args.profile.trim();
			const command = args.command.trim();
			const dsh = resolveDsh();
			const cmd = dsh.viaNode
				? `& "${execPath}" "${dsh.bin}" plugin --profile ${profile} ${command}`
				: `dsh plugin --profile ${profile} ${command}`;
			const result = await ctx.shell.run(ctx.shell.resolve({
				command: cmd,
				...args.timeoutMs ? { timeoutMs: args.timeoutMs } : {},
				signal: exec.signal
			}));
			if (result.aborted) { const e = new Error("tool call aborted"); e.name = "AbortError"; throw e; }
			return {
				kind: "foreground",
				exitCode: result.exitCode,
				signal: result.signal,
				timedOut: result.timedOut,
				aborted: result.aborted,
				timeoutMs: result.timeoutMs ?? 0,
				stdout: result.stdout?.text ?? "",
				stderr: result.stderr?.text ?? ""
			};
		}
	}));
}

export { apply, inject, name };
