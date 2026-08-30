/** dsh_plugin_exec — a standalone DSH tool plugin.
 *
 *  Non-official, reusable agent tool: runs `dsh plugin --profile <p> <cmd>` in
 *  the correct workbench context and returns stdout/stderr + exit code as text.
 *  Kept out of cheeco-style so cheeco updates never overwrite it.
 *
 *  Shape mirrors @deepseek-ai/dsh-tool-bash (a host-only tool bundle that is
 *  loaded by name into a profile's `dsh.profile.bundles`). */
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
			schema: { type: "string" },
			render: (_a, v) => [{ type: "text", text: typeof v === "string" ? v : String(v ?? "") }]
		},
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
			let out = result.stdout?.text ?? "";
			const err = result.stderr?.text ?? "";
			if (err.length > 0) { if (out.length > 0 && !out.endsWith("\n")) out += "\n"; out += "[stderr]\n" + err; }
			if (out.length === 0) out = "(no output)";
			if (result.exitCode !== 0) out += "\n[exit code: " + result.exitCode + "]";
			return out;
		}
	}));
	ctx.systemPrompt?.section?.({
		name: "tool:dsh_plugin_exec",
		order: 106,
		text: "Use dsh_plugin_exec to run `dsh plugin` for a workbench; check the [exit code: N] marker."
	});
}

export { apply, inject, name };
