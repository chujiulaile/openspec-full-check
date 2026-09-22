---
name: openspec-full-prd-review
description: 在 full-check propose 前独立评审产品需求，使用 OpenSpec 权威路径生成可追踪的 prd-review.md；默认 spec-driven 不使用。
metadata:
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

按 R1..Rn 建立来源追踪，并根据 PRD 实际出现的产品元素选择检查项；不得先按预设需求类别给需求贴标签，也不得为了“覆盖完整”强行补充 PRD 未出现的状态机、迁移方案、并发模型或其他业务概念。

通用检查项：

- 目标、用户价值、成功标准、范围与非目标；
- 输入输出、字段语义、数据口径、空值、重复数据和可观察验收条件；
- 只有 PRD 明确涉及用户角色、权限、租户/数据隔离时，才检查角色差异和权限边界；
- 只有 PRD 明确存在状态字段、状态变化或长流程时，才检查状态进入/退出条件、分支、失败和恢复；
- 只有 PRD 明确涉及外部依赖、兼容、迁移、安全、性能或并发时，才检查对应约束。

按实际内容启用的检查项：

- 出现“如果/则/否则”等条件规则时，检查条件—动作链是否断裂或矛盾；未出现条件规则时跳过；
- 出现多个名词可能指向同一对象，或同一名词在不同上下文可能含义不同，建立最小术语对照；否则跳过；
- 出现字段、输入输出或数据展示时，检查字段语义、取值口径、空值、重复数据、格式和可验收性；
- 出现接口行为时，检查触发条件、输入输出、成功/失败结果和边界；不因“接口”二字推导具体技术协议；
- 出现状态字段或状态变化时，检查进入/退出条件和状态覆盖；未出现状态概念时不构建状态机；
- 出现角色、权限、租户或数据隔离时，检查对应边界；未出现时不主动增加角色模型；
- 出现外部依赖、兼容、迁移、安全、性能或并发约束时，检查对应约束；未出现时将其视为实现阶段事项，而非 PRD 缺口。

边界检查：

- 用户明确只要求 PRD 检查时，仅依据 PRD 和用户明确决定判断产品边界；不得主动读取编码规范、项目配置或仓库规格来制造产品问题；
- 只有用户授权且确有必要时，才对照现有系统能力检查接口、模块或数据重叠；代码事实只能作为实现依赖或风险记录，不得自动升级为产品阻塞项；
- 明确记录“本次变更范围”和“不属于本次范围”。

问题分级门槛：

- 仅当未决问题会改变产品范围、业务行为、字段契约、数据口径、权限边界或可验收结果时，才列为“必须澄清”并阻塞 `propose`；
- 开发、系统设计和具体代码实现细节默认属于后续阶段或延期问题；只有 PRD 明确把某项内容定义为产品行为、业务约束或验收条件时才升级为必须澄清项；
- “缺少技术方案”不等于“材料不足”。只有关键产品来源不可访问、版本无法确定或核心业务语义无法建立时，才使用 `insufficient-material`；
- 最终 `ready` 的判断依据是：产品范围、关键行为、字段/数据口径和验收条件已足够明确，而不是所有后续实现决策均已完成。

每轮只保留最高影响的 5 个必须澄清问题，同主题合并；每项包含来源证据、为何必须确认、互斥选项、影响和推荐。其余问题进入延期问题，并注明“不阻塞 propose”。不得把技术偏好擅自变成产品规则。

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
