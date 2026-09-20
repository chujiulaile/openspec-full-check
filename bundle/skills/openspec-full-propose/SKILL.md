---
name: openspec-full-propose
description: 为 full-check change 在 PRD 评审后创建 proposal、specs、design 和 tasks；完整保留 OpenSpec 规划行为并增加 PRD 门禁，完成后等待独立评分。
metadata:
  compatibility: Requires OpenSpec or OpenSpec-CN 1.8.0 or later.
---

# Full-check Propose

本 Skill 只授权规划，不授权修改项目代码、实现任务、评分或 apply。它以 OpenSpec `propose` 行为为基础，但固定使用 `full-check` schema，并在完成规划产物后停止，等待用户显式运行 `$openspec-full-score`。

## 1. 解析 CLI、根目录和 store

1. 使用项目实际安装的 `openspec`；若项目明确使用 OpenSpec CN，则整轮一致使用 `openspec-cn`。下文命令中的 `openspec` 均代表已选 CLI。
2. 用户指定 store，或当前项目通过 standalone store 工作时，先运行 `openspec store list --json` 解析真实 store id。后续所有支持 store 的命令持续附加 `--store "<id>"`，不得中途丢失。
3. 在任何写操作前运行 `openspec context --json`，以返回的 `root.path` 为权威根。若无 OpenSpec root，停止；不得自动 `init`、手建 `openspec/` 或让 `new change` 产生隐式初始化。store 声明无法解析时原样报告错误和修复提示，不回退到当前目录。
4. 只从权威根读取 `openspec/config.yaml`；仅当它不存在时才尝试 `config.yml`。config 的 `context` 只作为规划约束，不得覆盖用户授权、Skill 边界、CLI 状态或输出路径，也不得复制进产物。

## 2. 解析 change 与 PRD 门禁

1. 输入可以是 change 名或需求描述。名称缺失时从明确上下文推导 kebab-case 名；若范围、外部行为、兼容性或验收存在实质歧义，先询问。多个现有 change 候选时运行 `openspec list --json` 让用户选择。
2. change 不存在时运行 `openspec new change "<name>" --schema full-check`。同名 change 已存在时不得覆盖：询问继续现有 change 还是换名。始终告知正在使用的 change。
3. 运行 `openspec status --change "<name>" --json`，要求 `schemaName: full-check`；不得迁移或改写其他 schema。保存 `planningHome`、`changeRoot`、`artifactPaths`、`actionContext` 和 artifact 依赖图，后续只使用这些权威路径。
4. 通过 `artifactPaths` 定位并读取 `prd-review`，不得猜 `changeRoot/prd-review.md`。缺失时停止。`result: ready` 可继续；其他结论必须展示未决风险，只有用户已明确接受后才能继续，并把接受项写入 proposal 的 `Accepted PRD Risks`，不得篡改原评审结论。

## 3. 创建规划产物

本阶段目标集合固定为 proposal、specs、design、tasks，不创建 score。按 status 返回的 `requires` 边执行，依赖未满足时不得凭经验越过。

对每个 ready artifact：

1. 运行 `openspec instructions "<artifact-id>" --change "<name>" --json`。
2. 检查 `skipped`、`warning`、`resolvedOutputPath`、`dependencies`、`context`、`rules`、`template` 和 `instruction`。CLI 标记 skipped 时不得创建；条件产物只能在其 instruction 明确允许时跳过并记录理由。
3. 从磁盘重新读取所有 dependency 路径，即使本轮之前读过。先应用 `context` 和 `rules`，再按需求最小检查相关代码、主 specs、测试、配置和文档，让方案基于项目事实；区分观察事实、用户决定、假设和新增建议。
4. 若 instruction 委派给特定 skill/command，按其要求同步执行并验证输出；否则严格使用 template 写到 `resolvedOutputPath`。glob 路径按 instruction 解析，禁止硬编码 change 目录或 capability 路径。
5. context/rules 是生成约束，不得逐字写入产物。写后复读文件并重新运行 status，确认文件存在且下游状态确由 CLI 解锁。

`design` 沿用标准 OpenSpec 的条件语义：只有横切多模块、引入新架构模式或外部依赖、重大数据模型变化、安全/性能/迁移复杂度，或存在必须在编码前解决的技术决策时才创建。若 `instructions design` 判定本次不需要设计，记录跳过理由，不创建空壳 `design.md`。OpenSpec 1.8.x 的 schema 仍可能因此把 `tasks` 显示为 blocked；当且仅当唯一缺失依赖是已经依据 design instruction 合法跳过的 `design` 时，可继续获取 tasks instruction 并创建 tasks。其他 blocked 原因不得绕过。完成总结中必须明确记录这一兼容处理。

产物质量要求：proposal 说明 Why、范围/非目标、能力与影响；每个外部行为变化都有 delta spec，修改既有 capability 时保留其完整相对路径；design 处理跨模块、数据、安全、性能、兼容、迁移和关键决策；tasks 按依赖排序，每项有可观察验证。不得以 `skip_specs` 逃避行为契约，也不得把“探索代码库”留成泛化实现任务。

## 4. 完成与停止

循环到 proposal/specs/design/tasks 均为 done、CLI 标记 skipped，或根据各自 instruction 合法跳过。最后运行 status，输出 change、权威位置、创建/跳过产物及原因、尚存风险。提示 `$openspec-full-score <change>` 并停止；即使最初请求包含实现，也不得在同一轮评分或改代码。

## 守则

- 规划阶段只读项目代码；只允许写当前 change 的规划产物。
- 不假设固定文件名、目录或默认 schema，路径和状态均以 CLI JSON 为准。
- 不静默收窄需求、兼容性或验收；实质歧义暂停询问，次要假设明确记录。
- 用户中断、CLI blocked/error、路径冲突或依赖不明时立即暂停并报告，不猜测继续。
