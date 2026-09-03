/**
 * @cheeco/dsh-llm-model-settings client half（浏览器侧）
 *
 * 注册「模型设置」tab 到 dsh-web-ui-cheeco-style 的 cheeco-style.page.model-settings 槽位。
 * 内容 fetch 宿主 /model-settings：返回可配置提供方(llm-pi-ai.providers)及其模型，
 * 编辑每模型参数（temperature/topP/topK/maxTokens/contextWindow/推理等级），保存写回 settings.yaml。
 *
 * 交互：顶部「提供方」下拉作过滤；下方直接平铺**所有**提供方的全部模型（与对话框模型选择器一致），
 * 每个模型一行（显示 提供方/模型名），点击行头展开/收起参数表单，含「保存」「取消更改（收起）」。
 */
window.__ModuleLoader__.load({
  id: "@cheeco/dsh-llm-model-settings",
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
    var react = require("react");
    var rx = require("react/jsx-runtime");

    var NS = "dsh-llm-model-settings";
    var API = "/model-settings";

    // 数字输入：空 -> undefined；非法 -> 不提交。
    function num(v) {
      if (v === "" || v === null || v === undefined) return undefined;
      var n = Number(v);
      return Number.isFinite(n) ? n : undefined;
    }

    // 推理档位中文标签（模型级 + 提供方级共用）。
    var EFFORTS = [
      { value: "", label: "跟随提供方默认" },
      { value: "off", label: "关闭思考（off）" },
      { value: "low", label: "低（low）" },
      { value: "medium", label: "中（medium）" },
      { value: "high", label: "高（high）" }
    ];

    // 数值输入框：中文标签 + 详细说明。
    function field(label, value, onChange, placeholder, desc) {
      return rx.jsx("label", { style: { display: "block", marginBottom: "14px" }, children: [
        rx.jsx("span", { style: { display: "block", fontSize: "13px", fontWeight: "600", color: "#1a1a1a", marginBottom: "4px" }, children: label }),
        rx.jsx("input", {
          type: "text",
          inputMode: "decimal",
          value: value === undefined ? "" : String(value),
          placeholder: placeholder || "留空使用默认",
          onChange: function (e) { onChange(e.target.value); },
          style: { boxSizing: "border-box", width: "100%", border: "1px solid #d9d9d9", borderRadius: "8px", padding: "6px 12px", fontFamily: "inherit", fontSize: "13px", color: "#1a1a1a", background: "#fff", outline: "none" }
        }),
        desc ? rx.jsx("span", { style: { display: "block", fontSize: "11px", color: "#888", marginTop: "3px", lineHeight: "16px" }, children: desc }) : null
      ] });
    }

    // 下拉框：中文标签 + 详细说明。
    function selectField(label, value, options, onChange, desc) {
      return rx.jsx("label", { style: { display: "block", marginBottom: "14px" }, children: [
        rx.jsx("span", { style: { display: "block", fontSize: "13px", fontWeight: "600", color: "#1a1a1a", marginBottom: "4px" }, children: label }),
        rx.jsx("select", {
          value: value || "",
          onChange: function (e) { onChange(e.target.value); },
          style: { boxSizing: "border-box", width: "100%", border: "1px solid #d9d9d9", borderRadius: "8px", padding: "6px 10px", fontFamily: "inherit", fontSize: "13px", color: "#1a1a1a", background: "#fff", outline: "none" }
        }, options.map(function (o) { return rx.jsx("option", { key: String(o.value), value: o.value }, o.label); })),
        desc ? rx.jsx("span", { style: { display: "block", fontSize: "11px", color: "#888", marginTop: "3px", lineHeight: "16px" }, children: desc }) : null
      ] });
    }

    // 从模型导出推理档位初值：支持推理且配了档位的模型，回显提供方默认档（否则中）。
    function effortOf(model, providerReasoning) {
      if (!model) return "";
      if (model.reasoningEfforts === false) return "off";
      if (model.reasoningEfforts && typeof model.reasoningEfforts === "object") {
        return providerReasoning || "medium";
      }
      return "";
    }

    function ModelSettingsTab() {
      var st = react.useState({ loading: true, error: null, providers: [] });
      var loading = st[0].loading, error = st[0].error, providers = st[0].providers;
      var filterProvider = react.useState(""); // 空 = 全部；非空 = 只看该提供方。
      var selModel = react.useState("");       // 当前展开编辑的模型（provider + '|' + modelId）。
      var draft = react.useState(null);
      var saving = react.useState(false);
      var msg = react.useState("");

      function refresh() {
        fetch(API, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (j) {
          var list = (j && Array.isArray(j.providers)) ? j.providers : [];
          st[1]({ loading: false, error: null, providers: list });
        }).catch(function (e) {
          st[1]({ loading: false, error: String(e && e.message || e), providers: [] });
        });
      }

      react.useEffect(function () { refresh(); }, []);

      // 展开的模型标识：provider + '/' + modelId。
      function modelKey(p, m) { return (p || "") + "\u0001" + (m || ""); }

      // 找当前展开模型对应的 provider/model。分析当前 draft。
      var cur = null;
      if (selModel[0]) {
        var parts = selModel[0].split("\u0001");
        var cp = providers.find(function (p) { return p.name === parts[0]; }) || null;
        var cm = cp ? cp.models.find(function (m) { return m.id === parts[1]; }) : null;
        cur = { provider: cp, model: cm };
      }

      react.useEffect(function () {
        if (!cur) { draft[1](null); return; }
        draft[1]({
          temperature: cur.model.temperature,
          topP: cur.model.topP,
          topK: cur.model.topK,
          maxTokens: cur.model.maxTokens,
          contextWindow: cur.model.contextWindow,
          effort: effortOf(cur.model, cur.provider.reasoning)
        });
      }, [selModel[0], providers]);

      function saveModel(p, m) {
        if (!p || !m || !draft[0]) return;
        var d = draft[0];
        var patch = {
          temperature: num(d.temperature),
          topP: num(d.topP),
          topK: num(d.topK),
          maxTokens: num(d.maxTokens),
          contextWindow: num(d.contextWindow)
        };
        if (d.effort === "off") patch.reasoningEfforts = false;
        else if (d.effort === "low" || d.effort === "medium" || d.effort === "high") patch.reasoningEfforts = { off: "none", low: "low", medium: "medium", high: "high" };
        saving[1](true); msg[1]("");
        fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ provider: p, model: m, patch: patch }) })
          .then(function (r) { return r.json(); })
          .then(function (j) {
            saving[1](false);
            if (j && j.ok === false) { msg[1]("保存失败：" + (j.error || "未知")); return; }
            msg[1]("已保存 " + m + " 到 settings.yaml"); refresh();
          })
          .catch(function (e) { saving[1](false); msg[1]("保存失败：" + String(e && e.message || e)); });
      }

      function toggleModel(key) {
        selModel[1](selModel[0] === key ? "" : key);
      }

      if (loading) return rx.jsx("p", { children: "正在加载模型设置…" });
      if (error) return rx.jsx("p", { style: { color: "#c00" }, children: "读取失败：" + error });
      if (providers.length === 0) return rx.jsx("p", { style: { color: "#999" }, children: "没有可配置的提供方（llm-pi-ai.providers）" });

      var providerOpts = [{ value: "", label: "全部提供方" }].concat(providers.map(function (p) { return { value: p.name, label: (p.displayName || p.name) + "（" + p.name + "）" }; }));

      // 按过滤汇总模型。
      var visProviders = providers.filter(function (p) { return filterProvider[0] === "" || p.name === filterProvider[0]; });
      var totalModels = visProviders.reduce(function (a, p) { return a + p.models.length; }, 0);

      var btnPrimary = {
        boxSizing: "border-box", cursor: "pointer", border: "1px solid #4a90d9", background: "rgba(74,144,217,.1)", color: "#1a73e8",
        fontFamily: "inherit", fontSize: "13px", lineHeight: "20px", borderRadius: "8px", padding: "6px 14px", marginTop: "4px", marginRight: "8px"
      };
      var btnGhost = {
        boxSizing: "border-box", cursor: "pointer", border: "1px solid #d9d9d9", background: "#fff", color: "#555",
        fontFamily: "inherit", fontSize: "13px", lineHeight: "20px", borderRadius: "8px", padding: "6px 14px", marginTop: "4px"
      };

      return rx.jsx("div", { className: "dsh-web-ui-cheeco-style-section", children: [
        rx.jsx("h3", { children: "模型设置" }),
        rx.jsx("p", { style: { fontSize: "12px", color: "#888", margin: "0 0 12px", lineHeight: "17px" }, children: "管理可配置提供方（llm-pi-ai.providers）的所有模型参数，改动保存到 settings.yaml。图片输入由模型能力自动判定，无需手动开关。" }),

        // 提供方筛选按钮组：直接用渲染模型分组同一个 providers 数组生成，天然列出全部供应商。
        rx.jsx("div", { style: { marginBottom: "14px" }, children: [
          rx.jsx("div", { style: { display: "block", fontSize: "13px", fontWeight: "600", color: "#1a1a1a", marginBottom: "6px" }, children: "提供方（筛选）" }),
          rx.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px" }, children: providerOpts.map(function (o) {
            var sel = filterProvider[0] === o.value;
            return rx.jsx("button", {
              key: String(o.value),
              type: "button",
              onClick: function () { filterProvider[1](o.value); },
              style: {
                boxSizing: "border-box", cursor: "pointer", fontFamily: "inherit", fontSize: "13px", lineHeight: "20px",
                borderRadius: "16px", padding: "6px 14px", border: "1px solid " + (sel ? "#4a90d9" : "#d9d9d9"),
                background: sel ? "rgba(74,144,217,.12)" : "#fff", color: sel ? "#1a73e8" : "#555"
              },
              children: o.label
            });
          }) })
        ] }),

        rx.jsx("h3", { style: { marginTop: "20px" }, children: "模型（共 " + totalModels + " 个）" }),
        totalModels === 0 ? rx.jsx("p", { style: { color: "#999" }, children: "当前没有可配置的模型" }) : null,

        rx.jsx("div", { children: visProviders.map(function (p) {
          return rx.jsx("div", { key: p.name, children: [
            rx.jsx("div", { style: { fontSize: "13px", fontWeight: "600", color: "#555", margin: "12px 0 6px" }, children: "■ " + (p.displayName || p.name) + "（" + p.name + "） · " + p.models.length + " 个模型" }),
            rx.jsx("div", { children: p.models.map(function (m) {
              var key = modelKey(p.name, m.id);
              var active = selModel[0] === key;
              var activeIsThis = cur && cur.provider && cur.provider.name === p.name && cur.model && cur.model.id === m.id && active;
              return rx.jsx("div", { key: m.id, style: { marginBottom: "8px" }, children: [
                rx.jsx("div", {
                  style: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderRadius: "8px", border: active ? "1px solid #4a90d9" : "1px solid #d9d9d9", background: active ? "rgba(74,144,217,.08)" : "#fff", cursor: "pointer" },
                  onClick: function () { toggleModel(key); },
                  children: [
                    rx.jsx("span", { style: { fontFamily: "inherit", fontSize: "14px", color: "#1a1a1a" }, children: (m.name || m.id) }),
                    rx.jsx("span", { style: { fontSize: "12px", color: active ? "#1a73e8" : "#999" }, children: active ? "▾ 收起" : "▸ 展开/收起" })
                  ]
                }),
                activeIsThis && draft[0] ? rx.jsx("div", { style: { padding: "12px", border: "1px solid #e0e0e0", borderRadius: "8px", marginTop: "4px" }, children: [
                  field("温度 (temperature)", draft[0].temperature, function (v) { draft[1]({ ...draft[0], temperature: v }); }, "0~2", "控制输出的随机性。越低越稳定、越确定；越高越有创意。常用 0.3~0.8，留空用提供方默认。"),
                  field("Top P（核采样）", draft[0].topP, function (v) { draft[1]({ ...draft[0], topP: v }); }, "0~1", "核采样（nucleus sampling）：只在累计概率达到 P 的最小候选集合里选。越小越保守、越确定；0~1，常用 0.9。"),
                  field("Top K", draft[0].topK, function (v) { draft[1]({ ...draft[0], topK: v }); }, "1~100", "Top-K 采样：每次只从前 K 个概率最高的候选里抽取。越小越保守；一般不要同时调 Top P 和 Top K。"),
                  field("最大输出 token (maxTokens)", draft[0].maxTokens, function (v) { draft[1]({ ...draft[0], maxTokens: v }); }, "如 8192", "单次回复允许的最大 token 数。越小越省资源、越不容易超时；太大则长文本/思考会明显变慢。"),
                  field("上下文窗口 (contextWindow)", draft[0].contextWindow, function (v) { draft[1]({ ...draft[0], contextWindow: v }); }, "如 40960", "允许的上下文 token 总量（输入+输出）。超过会截断或拒绝；一般按模型实际能力填。"),
                  rx.jsx("div", { style: { marginBottom: "14px" }, children: [
                    rx.jsx("span", { style: { display: "block", fontSize: "13px", fontWeight: "600", color: "#1a1a1a", marginBottom: "6px" }, children: "推理等级" }),
                    rx.jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: "8px" }, children: EFFORTS.map(function (o) {
                      var sel = (draft[0].effort || "") === o.value;
                      return rx.jsx("button", {
                        key: String(o.value),
                        type: "button",
                        onClick: function () { draft[1]({ ...draft[0], effort: o.value }); },
                        style: {
                          boxSizing: "border-box", cursor: "pointer", fontFamily: "inherit", fontSize: "12px", lineHeight: "20px",
                          borderRadius: "14px", padding: "4px 12px", border: "1px solid " + (sel ? "#4a90d9" : "#d9d9d9"),
                          background: sel ? "rgba(74,144,217,.12)" : "#fff", color: sel ? "#1a73e8" : "#555"
                        },
                        children: o.label
                      });
                    }) }),
                    rx.jsx("span", { style: { display: "block", fontSize: "11px", color: "#888", marginTop: "4px", lineHeight: "16px" }, children: "思考模式档位：关闭=不思考（最快最省）；高=深度思考（最耗资源）。默认档在提供方层设置，会话里也可临时改。" })
                  ] }),
                  rx.jsx("div", { style: { display: "flex", gap: "8px", marginTop: "2px" }, children: [
                    rx.jsx("button", { type: "button", onClick: function () { saveModel(p.name, m.id); }, disabled: saving[0], style: btnPrimary, children: saving[0] ? "保存中…" : "保存" + (m.name || m.id) }),
                    rx.jsx("button", { type: "button", onClick: function () { toggleModel(key); }, style: btnGhost, children: "取消更改（收起）" })
                  ] })
                ] }) : null
              ] });
            }) })
          ] });
        }) }),

        msg[0] ? rx.jsx("p", { style: { marginTop: "8px", fontSize: "12px", color: "#1a73e8" }, children: msg[0] }) : null
      ] });
    }

    function apply(ctx) {
      // 向 DSH功能包（设置侧边栏）的「模型设置」页槽位注入：内页选中 model-settings 页时
      // 通过 renderSlot("dsh-func-package.model-settings") 渲染本组件。
      ctx.slots.inject("dsh-func-package.model-settings", function () {
        return ctx.slots.register({ name: "dsh-func-package.model-settings", id: "model-settings", label: "模型设置" }, ModelSettingsTab);
      });
    }

    exports.apply = apply;
    exports.inject = ["slots"];
    return module.exports;
  }
});
