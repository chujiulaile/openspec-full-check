---
name: openspec-full-apply
description: 在 score 通过后实现 full-check OpenSpec 任务，按依赖安全并行并按风险触发只读代码评审；完成后提示 TDD 阶段。
---

# Full-check Apply

## 门禁与上下文

1. 通过 `status --change "<name>" --json` 确认 `schemaName: full-check`。
2. 复读 `score.md`；只有 `result: pass` 且 `score >= 85` 才能开始，此门禁不能由人工确认绕过。
3. 运行 `instructions apply --change "<name>" --json`，读取全部 `contextFiles`、任务状态、context、guidance 和 CLI 动态指令。被阻塞时不得实现。

## 实现

1. 建立任务依赖图和文件所有权。只有无未完成依赖、修改范围互斥、不共享 DTO/API/配置/迁移/生成物/测试文件且验证独立的任务才可并行；否则串行。
2. 对每项任务做最小、聚焦的实现并执行其指定验证。只有行为完整实现且验证有新鲜证据后，才把 `- [ ]` 改为 `- [x]`。
3. 安全/权限/资金/数据迁移、跨模块、共享契约、并行批次或验证证据不足时，必须使用只读 `openspec_code_reviewer`。低风险局部修改可以由主 Agent 自审，但记录理由。
4. Reviewer 在同一轮先做规格符合性、再做代码质量，只返回 findings 与证据，不改代码、测试或 tasks。主 Agent 核验反馈并负责修复、验证和任务状态。
5. P0/P1 或 `must-fix` 未解决时不得继续。只有修复改变高风险路径时才进行一次针对性复评，不对相同 diff 重复评审。
6. 需求或设计不清时暂停并建议修订规划，不能在实现中默默改变范围或验收。
7. 全部 tasks 完成后停止，提示 `$openspec-full-tdd <change>`；不得直接归档。

任何“完成、通过、已修复”结论都必须引用本轮命令输出或可定位证据，不能只采信 Agent 自述。
