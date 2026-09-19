---
name: openspec-full-score
description: 独立评分 full-check 的 PRD Review、proposal、specs、design 和 tasks，生成 score.md 作为 apply 门禁。
---

# Full-check Planning Score

评分是用户显式触发的独立阶段。Reviewer 只读；主 Agent 只写 `score.md`，同一轮不修复规划产物。

## 工作流

1. 通过 `status --change "<name>" --json` 确认 `schemaName: full-check`，并确认 prd-review、proposal、specs、design（或已记录的合法跳过）和 tasks 已完成。
2. 运行 `instructions score --change "<name>" --json` 获取目标路径和模板。
3. 使用只读 `openspec_planning_reviewer` 或等价的全新只读上下文，加载上述产物、相关主 specs、必要代码事实和项目规则。
4. 建立 R1..Rn 从 PRD Review 到 proposal/spec/design/tasks 的双向追踪，识别遗漏需求、孤儿任务和冲突。
5. 按权重评分：需求完整性与边界 25；跨产物一致性与追踪 25；技术可实现性与风险 20；可测试性与验收清晰度 20；任务可执行性 10。
6. 总分 `>= 85` 且无 blocker、材料缺口、关键未决事项、不可追踪需求或实现/验收冲突时，才能 `result: pass`。
7. 主 Agent 核验 reviewer 的引用、算分和门禁判断后写入并复读 `score.md`。
8. 未通过时提示先修订规划并显式重跑评分；通过时提示 `$openspec-full-apply <change>`。不得自动循环或启动 apply。

## 分级

- Blocker：方向、契约、安全、兼容性或验收不可确定。
- 必改：结论明确但产物缺失、冲突、不可实现或不可测试。
- 建议：不影响正确实现与验收，不阻塞通过。
