---
name: openspec-full-propose
description: 为 full-check OpenSpec 变更在 PRD 评审后生成 proposal、specs、design 和 tasks，并提示独立评分；不用于默认 spec-driven。
---

# Full-check Propose

为已经完成 PRD Review 的 full-check change 生成规划产物，不自动评分或实现。

## 前置检查

1. 通过 `status --change "<name>" --json` 确认 `schemaName: full-check`。
2. `prd-review.md` 必须存在。若 `result: ready`，继续；若为其他结论，向用户展示未决风险，只有用户已经明确接受继续时才执行，并把接受项写入 proposal 的 `Accepted PRD Risks`。缺失评审不得绕过。
3. 运行 `status` 获取 ready artifact，并对每个 artifact 运行 `instructions "<artifact-id>" --change "<name>" --json`，只使用 CLI 返回的目标路径和模板。

## 生成顺序

1. 写 proposal：Why、What Changes、Capabilities、Impact，以及需要时的 Accepted PRD Risks。
2. 根据 proposal 中每个 capability 写 delta spec；有外部行为变化时不得使用 `skip_specs`。
3. 在存在跨模块、数据、安全、性能、迁移或实质技术决策时写 design；若 CLI/schema 允许跳过且确实不需要，记录理由。
4. 写 tasks：按依赖排序，每项使用可追踪复选框并包含验证方式。
5. 每写一个产物后复读并运行 `status`，确保下游 ready 状态来自 CLI，而不是主观推断。
6. 所有规划产物完成后停止，提示显式运行 `$openspec-full-score <change>`；不得自动评分或 apply。

## 边界

- 不改 `prd-review.md` 的结论来消除风险。
- 不因实现方便而收窄 spec、隐藏兼容性变化或弱化验收。
- 默认 `spec-driven` 应继续使用官方 `$openspec-propose`。
