# schedule-panel

多 AI 调度执行面板：对话页输入区上方常驻面板，可视化主控 AI 派单的子代理/后台任务进度、状态、归属与明细，让用户在主对话里直观看到调度与进度、把控方向。

## 能力

**UI**（对话页 dock 槽 `conversation.input.dock`）：

| 功能 | 说明 |
|---|---|
| 常驻面板 | 会话有任务即显示：`多 AI 调度 · 共 N 个任务 · M 运行中` |
| 按归属分组 | 按任务归属会话分组（本会话 / 子代理·短id）显示 |
| 任务行 | StateDot 状态点 + 任务 label + 归属 + 时间 + 状态 |
| 展开详情 | 点击任务行展开：状态/耗时/详情 + 实时输出 tail |
| 实时 tail | 展开时每 1s 轮询输出路由，整段替换渲染（镜像补丁，与官方 `task_output` 工具零竞争） |
| 仅对话页 | 非 Chat 视图自动隐藏 |

**路由**（Node half）：

| 路由 | 说明 |
|---|---|
| `/plugins/dsh-schedule-panel/state` | 调度状态：全部任务（只读，含归属/状态）+ 归属分组计数 |
| `/plugins/dsh-schedule-panel/output` | 任务输出 tail（`full:true` 累积全文；未知 id 404） |

## 安装

```sh
dsh plugin --profile web add <本目录>
```

装完 **重启 web** 生效；设置页「插件」面板可停用/启用。

## 使用

让主模型做一次多 AI 调度（例如跑后台任务 / subagent 派单），面板即在输入区上方出现，实时展示每个子任务的状态与进度。

## 许可

MIT License
