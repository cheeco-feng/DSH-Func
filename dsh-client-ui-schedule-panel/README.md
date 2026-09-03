# schedule-panel

多 AI 调度执行面板：对话页新增「调度」Tab，可视化主控 AI 派单的子代理/后台任务进度、状态、归属与明细，并支持按会话/全局指定「会话压缩」用的模型，让用户在主对话里直观看到调度与进度、把控方向。

## 能力

**UI**（对话页新增 `conversation.view` 标签页，id=`schedule`、label=调度，与「对话 / 轨迹」并列）：

| 功能 | 说明 |
|---|---|
| 调度 Tab | 新增「调度」标签页，会话有任务即显示；顶部显示 `多 AI 调度 · 共 N 个任务 · M 运行中` |
| 按归属分组 | 按任务归属会话分组（本会话 / 子代理·短id）显示 |
| 任务行 | StateDot 状态点 + 任务 label + 归属 + 时间 + 状态 |
| 展开详情 | 点击任务行展开：状态/耗时/详情 + 实时输出 tail |
| 实时 tail | 展开时每 1s 轮询输出路由，整段替换渲染（镜像补丁，与官方 `task_output` 工具零竞争） |
| 任务模型分配 | 按会话指定「会话压缩（compaction）」用的 provider/model（含新会话默认 __default__），未配=跟随当前会话 |
| 最近压缩留痕 | 显示最近一次压缩实际用的 provider · model |

**路由**（Node half）：

| 路由 | 说明 |
|---|---|
| `/plugins/dsh-schedule-panel/state` | 调度状态：全部任务（只读，含归属/状态）+ 归属分组计数 |
| `/plugins/dsh-schedule-panel/output` | 任务输出 tail（`full:true` 累积全文；未知 id 404） |
| `/plugins/dsh-schedule-panel/assign` | 任务模型分配（GET 读 / POST 写，per-session + 全局默认） |
| `/plugins/dsh-schedule-panel/models` | 可用 provider/model 列表（从 settings.yaml 读） |
| `/plugins/dsh-schedule-panel/compaction-runs` | 最近压缩实际用的 provider/model（最多 50 条） |

**持久化**：任务模型分配写入 `@cheeco` 安装目录下的 `schedule-panel-assign.json`（即 `<profile>/node_modules/@cheeco/schedule-panel-assign.json`），随 cheeco 目录一起迁移，跨刷新/重启保留。

## 安装

```sh
dsh plugin --profile <profile> add <本目录>
```

装完 **重启 <profile>** 生效；设置页「插件」面板可停用/启用。

## 使用

让主模型做一次多 AI 调度（例如跑后台任务 / subagent 派单），切到「调度」Tab 即可看到每个子任务的状态与进度，并可在此为「会话压缩」指定一个专用模型。

## 许可

MIT License
