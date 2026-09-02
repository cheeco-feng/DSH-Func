# @cheeco/dsh-llm-model-settings

Cheeco「模型设置」插件：在「功能设置」页新增「模型设置」tab，管理可配置提供方（`llm-pi-ai.providers.*`，含本地 Ollama / 自定义提供方）的模型参数，读写 `settings.yaml`。

## 功能
- 列出提供方及其模型。
- 每模型可编辑：`temperature` / `topP` / `topK` / `maxTokens` / `contextWindow` / `reasoningEfforts`。
- 提供方级：默认推理档 `reasoning`。
- 视觉能力不做手动开关（由模型能力自动判定）。

## 说明
- 只管理走 `settings.yaml` 的可配置提供方；内置 catalog provider（如 deepseek-official）不在此列。
- 保存即写回 `settings.yaml`；`temperature/topP/topK` 需适配器支持才会真正生效（见 dsh-llm-pi-ai 的 profileOptions 传输）。
