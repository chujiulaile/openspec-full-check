---
name: openspec-full-prd-review
description: 在 full-check propose 前独立评审产品需求，使用 OpenSpec 权威路径生成可追踪的 prd-review.md；默认 spec-driven 不使用。
compatibility: Requires OpenSpec or OpenSpec-CN 1.8.0 or later.
---

# Full-check PRD Review

本阶段只创建需求评审产物，不创建 proposal/spec/design/tasks，不修改代码，也不自动进入下一阶段。

## 1. 解析根、store 与 change

1. 选择项目实际使用的 `openspec` 或 `openspec-cn`，整轮一致。用户指定 store 或工作位于 standalone store 时，先用 `store list --json` 解析 id，并在后续支持的命令上持续携带 `--store "<id>"`。
2. 写入前运行 `openspec context --json`，以 `root.path` 为权威根。无 root 或 store 声明无法解析时停止；不得自动 init、手建 openspec 目录或回退当前目录。
3. 输入应包含 change 名和 PRD/需求来源。名称缺失时可从明确需求推导 kebab-case 名；实质歧义先问。已有多个候选时运行 `openspec list --json` 让用户选择。
4. change 不存在时运行 `openspec new change "<name>" --schema full-check`；同名已存在时询问继续还是换名，不覆盖。告知选中的 change。
5. 运行 `openspec status --change "<name>" --json`，要求 `schemaName: full-check`；保存 `planningHome`、`changeRoot`、`artifactPaths`、`actionContext`。不得迁移其他 schema。

## 2. 获取 artifact 指令

运行 `openspec instructions prd-review --change "<name>" --json`，解析 `resolvedOutputPath`、dependencies、context、rules、template、instruction、skipped/warning。blocked、路径不可解析或 CLI 不允许创建时停止。只写 resolvedOutputPath，不猜 `changeRoot/prd-review.md`。

context 是项目背景，rules 是本 artifact 约束；二者不得覆盖用户授权、CLI 状态和输出路径，也不得原样复制进产物。重新从磁盘读取依赖路径，并读取 PRD、用户资料、已确认决定、适用 AGENTS.md，以及验证需求边界所需的最小主 specs、代码、接口、数据模型和配置事实。不可访问的来源列为材料缺口，不猜测。

## 3. 独立产品评审

若宿主支持自定义 Agent，使用只读 `openspec_prd_architect`；否则建立新的只读 reviewer 上下文。Reviewer 只返回结论、问题与证据，不编辑 PRD、代码或 artifact。主 Agent 必须核验引用后才能落盘。

按 R1..Rn 建立来源追踪，并检查：

- 目标、用户价值、成功标准、范围与非目标；
- 用户、角色、权限、租户/数据隔离；
- 触发条件、主流程、状态变化、分支、失败和恢复；
- 输入输出、字段语义、数据口径、依赖、空值、重复请求与并发；
- 兼容、迁移、回滚、安全、性能和其他非功能约束；
- 每条关键行为能否形成可观察、可测试的验收标准。

每轮只保留最高影响的 5 个必须澄清问题，同主题合并；每项包含来源证据、为何必须确认、互斥选项、影响和推荐。其余非阻塞问题进入延期问题。不得把技术偏好擅自变成产品规则。

## 4. 写入与完成

严格使用 template 和 instruction 写 resolvedOutputPath，结论只能是：

- `ready`：不存在会改变范围、行为、兼容或验收的未决问题；
- `needs-clarification`：仍需用户决策；
- `insufficient-material`：关键来源缺失或版本不可确定。

写后复读，并重新运行 status 确认 prd-review 由 CLI 判定完成。输出 change、实际材料、结论、关键问题和文件位置。非 ready 时默认不建议继续；用户以后可在看过风险后显式要求 `$openspec-full-propose`。本轮停止，不自动 propose。

## 守则

- 只写当前 prd-review artifact，不修改原 PRD 或项目代码。
- 路径、状态和依赖均来自 CLI JSON；不依赖固定目录。
- 用户中断、材料缺口、路径冲突或 CLI error 时停止，不制造“已评审”结论。
