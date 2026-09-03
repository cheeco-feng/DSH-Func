window.__ModuleLoader__.load({
	id: "@cheeco/dsh-client-ui-schedule-panel",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		let react = require("react");
		let _primitives = require("@deepseek-ai/dsh-client-ui-primitives");
		let react_jsx_runtime = require("react/jsx-runtime");
		//#region src/client/schedule-view.tsx
		/** Node half 只读状态路由（与 lib/index.mjs 的 STATE_PATH 一致）。 */
		const STATE_PATH = "/plugins/dsh-schedule-panel/state";
		/** Node half 输出读取路由（与 lib/index.mjs 的 OUTPUT_PATH 一致）。 */
		const OUTPUT_PATH = "/plugins/dsh-schedule-panel/output";
		/** 任务模型分配路由（与 lib/index.mjs 的 ASSIGN_PATH 一致）。 */
		const ASSIGN_PATH = "/plugins/dsh-schedule-panel/assign";
		/** 可用 provider/model 列表路由（与 lib/index.mjs 的 MODELS_PATH 一致）。 */
		const MODELS_PATH = "/plugins/dsh-schedule-panel/models";
		/** 最近压缩运行记录路由（与 lib/index.mjs 的 COMPACTION_RUNS_PATH 一致）。 */
		const COMPACTION_RUNS_PATH = "/plugins/dsh-schedule-panel/compaction-runs";
		/** 轮询间隔。 */
		const POLL_MS = 1e3;
		const NS = "schedule-panel";
		const zh = {
			"view.tab": "调度",
			"view.title": "多 AI 调度",
			"view.idle": "暂无调度任务",
			"view.hint": "让 AI 运行 run_in_background 后台任务、或 subagent/workflow 派单，这里会实时列出每个任务的进度、归属与输出。",
			"view.running": "{running} 运行中",
			"view.total": "共 {total} 个任务",
			"task.running": "运行中",
			"task.stopping": "停止中",
			"task.completed": "已完成",
			"task.killed": "已终止",
			"task.failed": "失败",
			"task.open": "展开",
			"task.close": "收起",
			"task.owner.current": "本会话",
			"task.owner.child": "子代理",
			"assign.title": "任务模型分配",
			"assign.default": "新会话默认（全局）用：",
			"assign.task": "会话压缩（compaction）用：",
			"assign.save": "保存",
			"assign.saved": "已设",
			"run.label": "最近压缩用"
		};
		const en = {
			"view.tab": "Dispatch",
			"view.title": "Multi-AI Dispatch",
			"view.idle": "No dispatch tasks",
			"view.hint": "Run background tasks (run_in_background) or dispatch subagents; each task's progress, ownership and output appears here live.",
			"view.running": "{running} running",
			"view.total": "{total} tasks",
			"task.running": "Running",
			"task.stopping": "Stopping",
			"task.completed": "Completed",
			"task.killed": "Killed",
			"task.failed": "Failed",
			"task.open": "Expand",
			"task.close": "Collapse",
			"task.owner.current": "this session",
			"task.owner.child": "subagent",
			"assign.title": "Model assignment",
			"assign.default": "New-session default:",
			"assign.task": "Compaction uses:",
			"assign.save": "Save",
			"assign.saved": "set",
			"run.label": "Last compaction used"
		};
		/** 每状态视觉：StateDot 的 state 值 + 文案 key。 */
		const STATUS_META = {
			running: { state: "ongoing", label: "task.running" },
			stopping: { state: "warning", label: "task.stopping" },
			completed: { state: "done", label: "task.completed" },
			killed: { state: "warning", label: "task.killed" },
			failed: { state: "error", label: "task.failed" }
		};
		/** 会话级轮询 hook：每 POLL_MS 拉取调度状态。 */
		function useScheduleState(sessionId) {
			const [state, setState] = (0, react.useState)({ tasks: [], groups: [] });
			(0, react.useEffect)(() => {
				let alive = true;
				const poll = async () => {
					try {
						const res = await fetch(STATE_PATH, { headers: { accept: "application/json" } });
						if (!res.ok) return;
						const data = await res.json();
						if (alive && Array.isArray(data.tasks)) setState({ tasks: data.tasks, groups: data.groups ?? [] });
					} catch {}
				};
				poll();
				const timer = setInterval(() => { poll(); }, POLL_MS);
				return () => {
					alive = false;
					clearInterval(timer);
				};
			}, [sessionId]);
			return state;
		}
		/** 任务输出 tail hook：展开任务时自动轮询输出路由（full:true 整段替换）。 */
		function useTaskOutput(taskId) {
			const [output, setOutput] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				if (taskId === null) {
					setOutput("");
					return;
				}
				let alive = true;
				const poll = async () => {
					try {
						const res = await fetch(`${OUTPUT_PATH}?id=${encodeURIComponent(taskId)}`, { headers: { accept: "application/json" } });
						if (!res.ok) return;
						const data = await res.json();
						if (!alive || typeof data.text !== "string") return;
						setOutput((prev) => data.full === true ? data.text : prev + data.text);
					} catch {}
				};
				poll();
				const timer = setInterval(() => { poll(); }, POLL_MS);
				return () => {
					alive = false;
					clearInterval(timer);
				};
			}, [taskId]);
			return output;
		}
		/** 短 owner 标签：当前会话标"本会话"，其余标"子代理·xxxx"。 */
		function ownerLabel(t, owner, currentSession) {
			if (owner === currentSession) return t("task.owner.current");
			return `${t("task.owner.child")}·${String(owner ?? "").slice(0, 8)}`;
		}
		/** 时间文案：开始 hh:mm:ss 起 → 结束 hh:mm。 */
		function timeText(task) {
			const start = new Date(task.startedAt);
			const pad = (n) => String(n).padStart(2, "0");
			const s = `${pad(start.getHours())}:${pad(start.getMinutes())}:${pad(start.getSeconds())}`;
			return task.finishedAt === void 0 ? `${s} 起` : `${s} → ${pad(new Date(task.finishedAt).getHours())}:${pad(new Date(task.finishedAt).getMinutes())}`;
		}
		/** 任务行：状态点 + label + owner + 时间 + 状态；点击展开 detail/输出。 */
		function TaskRow(props) {
			const { t, task, expanded, onToggle } = props;
			const meta = STATUS_META[task.status] ?? { state: "warning", label: task.status };
			return (0, react_jsx_runtime.jsxs)("div", { children: [
				(0, react_jsx_runtime.jsxs)("div", {
					style: {
						display: "flex",
						alignItems: "center",
						gap: 8,
						height: 40,
						padding: "0 14px",
						borderRadius: 8,
						cursor: "pointer",
						background: expanded ? "var(--dsw-alias-interactive-bg-hover)" : void 0
					},
					onClick: () => onToggle(expanded ? null : task.id),
					children: [
						(0, react_jsx_runtime.jsx)(_primitives.StateDot, { state: meta.state, size: 10 }),
						(0, react_jsx_runtime.jsx)("span", {
							style: {
								flex: 1,
								fontSize: 13,
								lineHeight: "20px",
								color: "var(--dsw-alias-label-secondary)",
								overflow: "hidden",
								textOverflow: "ellipsis",
								whiteSpace: "nowrap"
							},
							children: task.label
						}),
						(0, react_jsx_runtime.jsx)("span", {
							style: { fontSize: 12, color: "var(--dsw-alias-label-caption)", whiteSpace: "nowrap" },
							children: ownerLabel(t, task.ownerSession, props.currentSession)
						}),
						(0, react_jsx_runtime.jsx)("span", {
							style: { fontSize: 12, color: "var(--dsw-alias-label-caption)", whiteSpace: "nowrap" },
							children: timeText(task)
						}),
						(0, react_jsx_runtime.jsx)("span", {
							style: { fontSize: 12, color: meta.color, whiteSpace: "nowrap" },
							children: t(meta.label)
						})
					]
				}),
				expanded && (0, react_jsx_runtime.jsxs)("div", {
					style: {
						padding: "2px 14px 12px 34px",
						fontSize: 12,
						lineHeight: "18px",
						color: "var(--dsw-alias-label-tertiary)",
						display: "flex",
						flexDirection: "column",
						gap: 2
					},
					children: [
						task.detail !== void 0 && (0, react_jsx_runtime.jsxs)("span", { children: ["详情：", task.detail] }),
						props.output !== "" && (0, react_jsx_runtime.jsx)("div", {
							style: {
								margin: "2px 0 0",
								fontSize: 11,
								lineHeight: "16px",
								fontFamily: "var(--dsh-code-font-family, ui-monospace, monospace)",
								whiteSpace: "pre-wrap",
								wordBreak: "break-word",
								maxHeight: 200,
								overflowY: "auto"
							},
							children: props.output
						})
					]
				})
			] }, task.id);
		}
		/** 任务模型分配项：value 形如 "provider:model"，空串 = 跟随会话（默认）。 */
		const ASSIGN_OPTIONS = [
			{ value: "", label: "跟随会话（默认）" },
			{ value: "ollama:qwen3:14b-diy", label: "本地 qwen3:14b-diy" },
			{ value: "deepseek-official:deepseek-v4-flash-vision-exp", label: "云端 deepseek-v4-flash-vision-exp" },
			{ value: "deepseek-official:deepseek-v4-pro", label: "云端 deepseek-v4-pro" }
		];
		/** 读取当前会话"会话压缩"的模型分配。 */
		function useAssign(sessionId) {
			const [cur, setCur] = (0, react.useState)("");
			(0, react.useEffect)(() => {
				let alive = true;
				fetch(`${ASSIGN_PATH}?session=${encodeURIComponent(sessionId)}`, { headers: { accept: "application/json" } })
					.then((res) => res.json())
					.then((d) => {
						if (!alive) return;
						const a = d.assignment;
						if (a && a.provider && a.model) setCur(`${a.provider}||${a.model}`);
					})
					.catch(() => {});
				return () => { alive = false; };
			}, [sessionId]);
			return [cur, setCur];
		}
		/** 保存"会话压缩"的模型分配。 */
		function saveAssign(sessionId, value) {
			const [provider, model] = value.split("||");
			return fetch(`${ASSIGN_PATH}?session=${encodeURIComponent(sessionId)}`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ session: sessionId, task: "compaction", provider: provider ?? "", model: model ?? "" })
			}).then((r) => r.json()).catch(() => ({}));
		}
		/** 最近一次压缩实际用的模型（轮询 /compaction-runs）。 */
		function useCompactionRuns(sessionId) {
			const [run, setRun] = (0, react.useState)(null);
			(0, react.useEffect)(() => {
				let alive = true;
				const poll = async () => {
					try {
						const res = await fetch(`${COMPACTION_RUNS_PATH}?session=${encodeURIComponent(sessionId)}`, { headers: { accept: "application/json" } });
						if (!res.ok) return;
						const d = await res.json();
						if (alive && Array.isArray(d.runs) && d.runs.length > 0) setRun(d.runs[0]);
					} catch {}
				};
				poll();
				const t = setInterval(poll, 2e3);
				return () => { alive = false; clearInterval(t); };
			}, [sessionId]);
			return run;
		}
		/** 「任务模型分配」区：先做会话压缩，选 provider/model 写回；未配 = 跟随会话。 */
		function AssignPanel(props) {
			const { t, sessionId } = props;
			const [cur, setCur] = useAssign(sessionId);
			const [def, setDef] = useAssign("__default__");
			const [saved, setSaved] = (0, react.useState)("");
			const [options, setOptions] = (0, react.useState)([{ value: "", label: "跟随会话（默认）" }]);
			(0, react.useEffect)(() => {
				let alive = true;
				fetch(MODELS_PATH, { headers: { accept: "application/json" } })
					.then((res) => res.json())
					.then((d) => {
						if (!alive || !Array.isArray(d.models)) return;
						setOptions([{ value: "", label: "跟随会话（默认）" }, ...d.models.map((m) => ({ value: `${m.provider}||${m.model}`, label: `${m.provider} · ${m.model}` }))]);
					})
					.catch(() => {});
				return () => { alive = false; };
			}, []);
			const label = (v) => {
				const o = options.find((x) => x.value === v);
				return o ? o.label : v;
			};
			return (0, react_jsx_runtime.jsxs)("div", {
				style: { border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 12, padding: "12px 14px", background: "var(--dsw-specific-tip)", marginBottom: 12 },
				children: [
					(0, react_jsx_runtime.jsx)("div", {
						style: { fontSize: 13, fontWeight: 600, marginBottom: 8 },
						children: t("assign.title")
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 },
						children: [
							(0, react_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" }, children: t("assign.default") }),
							(0, react_jsx_runtime.jsx)("select", {
								value: def,
								onChange: (e) => { const v = e.target.value; setDef(v); saveAssign("__default__", v); },
								style: { fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l1)", background: "var(--dsw-specific-tip)" },
								children: options.map((o) => (0, react_jsx_runtime.jsx)("option", { value: o.value, children: o.label }, o.value))
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)" },
								children: `${t("assign.saved")}: ${label(def)}`
							})
						]
					}),
					(0, react_jsx_runtime.jsxs)("div", {
						style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
						children: [
							(0, react_jsx_runtime.jsx)("span", { style: { fontSize: 12, color: "var(--dsw-alias-label-secondary)" }, children: t("assign.task") }),
							(0, react_jsx_runtime.jsx)("select", {
								value: cur,
								onChange: (e) => { const v = e.target.value; setCur(v); setSaved(""); saveAssign(sessionId, v).then(() => setSaved(label(v))); },
								style: { fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid var(--dsw-alias-border-l1)", background: "var(--dsw-specific-tip)" },
								children: options.map((o) => (0, react_jsx_runtime.jsx)("option", { value: o.value, children: o.label }, o.value))
							}),
							(0, react_jsx_runtime.jsx)("span", {
								style: { fontSize: 12, color: "var(--dsw-alias-label-tertiary)" },
								children: `${t("assign.saved")}: ${label(cur)}`
							})
						]
					})
				]
			});
		}
		/** 调度视图页：新增「调度」Tab 的内容。 */
		function ScheduleView(props) {
			const { t } = props;
			const sessionId = props.sessionId ?? props.session?.sessionId;
			const state = useScheduleState(sessionId);
			const [expanded, setExpanded] = (0, react.useState)(null);
			const taskOutput = useTaskOutput(expanded);
			const tasks = state.tasks;
			const running = tasks.filter((task) => task.status === "running" || task.status === "stopping").length;
			const grouped = (0, react.useMemo)(() => {
				const map = {};
				for (const task of tasks) {
					const owner = task.ownerSession ?? "unowned";
					if (!map[owner]) map[owner] = [];
					map[owner].push(task);
				}
				return Object.entries(map);
			}, [tasks]);
			const root = {
				padding: "16px 20px 24px",
				fontFamily: "system-ui",
				fontSize: 13,
				color: "var(--dsw-alias-label-primary)"
			};
			const header = (0, react_jsx_runtime.jsxs)("div", {
				style: { display: "flex", alignItems: "baseline", gap: 10, marginBottom: 12 },
				children: [
					(0, react_jsx_runtime.jsx)("span", {
						style: { fontSize: 16, fontWeight: 600 },
						children: t("view.title")
					}),
					(0, react_jsx_runtime.jsx)("span", {
						style: { fontSize: 12, color: "var(--dsw-alias-label-caption)" },
						children: `${t("view.total", { total: tasks.length })} · ${t("view.running", { running })}`
					})
				]
			});
			const assignPanel = (0, react_jsx_runtime.jsx)(AssignPanel, { t, sessionId });
			const lastRun = useCompactionRuns(sessionId);
			const runLine = lastRun ? (0, react_jsx_runtime.jsx)("div", { style: { fontSize: 12, color: "var(--dsw-alias-label-caption)", marginBottom: 8, fontWeight: 500 }, children: `${t("run.label")}: ${lastRun.provider} · ${lastRun.model}` }) : null;
			if (tasks.length === 0) {
				return (0, react_jsx_runtime.jsxs)("div", { style: root, children: [
					header,
					assignPanel,
					runLine,
					(0, react_jsx_runtime.jsx)("div", {
						style: { fontSize: 13, color: "var(--dsw-alias-label-tertiary)", lineHeight: "20px" },
						children: t("view.hint")
					})
				] });
			}
			return (0, react_jsx_runtime.jsxs)("div", {
				"data-schedule-view": "",
				style: root,
				children: [
					header,
					assignPanel,
					runLine,
					(0, react_jsx_runtime.jsx)("div", {
						style: { display: "flex", flexDirection: "column", gap: 10 },
						children: grouped.map(([owner, ownerTasks]) => (0, react_jsx_runtime.jsxs)("div", {
							style: { border: "1px solid var(--dsw-alias-border-l1)", borderRadius: 12, overflow: "hidden", background: "var(--dsw-specific-tip)" },
							children: [
								(0, react_jsx_runtime.jsx)("div", {
									style: {
										padding: "6px 14px",
										fontSize: 11,
										fontWeight: 600,
										color: "var(--dsw-alias-label-tertiary)",
										letterSpacing: "0.02em",
										borderBottom: "1px solid var(--dsw-alias-border-l1)"
									},
									children: ownerLabel(t, owner, sessionId)
								}),
								(0, react_jsx_runtime.jsx)("div", {
									children: ownerTasks.map((task) => (0, react_jsx_runtime.jsx)(TaskRow, {
										t,
										task,
										expanded: expanded === task.id,
										onToggle: setExpanded,
										currentSession: sessionId,
										output: expanded === task.id ? taskOutput : ""
									}, task.id))
								})
							]
						}, owner))
					})
				]
			});
		}
		/** 需要此插件声明的服务：slots + locale。 */
		const inject = ["slots", "locale"];
		function apply(ctx) {
			ctx.effect(() => ctx.locale.register(NS, {
				zh,
				en
			}), "schedule-panel: dictionaries");
			// 注册一个新 Conversation View Tab（对话 / 轨迹 / 调度），id 用全新的 'schedule'，无替换风险。
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "schedule",
				order: 30,
				label: () => ctx.locale.bind(NS)("view.tab"),
				locale: NS
			}, ScheduleView));
		}
		//#endregion
		exports.ScheduleView = ScheduleView;
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
