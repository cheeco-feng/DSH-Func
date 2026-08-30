/** dsh_plugin_exec — a standalone DSH tool plugin.
 *
 *  Non-official, reusable agent tool: runs `dsh plugin --profile <p> <cmd>` in
 *  the correct workbench context and returns stdout/stderr + exit code. Kept out
 *  of cheeco-style so cheeco updates never overwrite it.
 *
 *  Shape mirrors @deepseek-ai/dsh-tool-bash (object output with `kind:
 *  "foreground"` + presentCall/presentResult) so the tool runtime treats it as a
 *  normal foreground tool and never falls into the code-dispatch scheduler. */
import { defineTool } from "@deepseek-ai/dsh-tools";

const name = "tool-dsh-plugin-exec";
/** Required services (cordis): the tool registry and the shell executor. */
const inject = ["tools", "shell"];

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
			const cmd = "dsh plugin --profile " + args.profile.trim() + " " + args.command.trim();
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
