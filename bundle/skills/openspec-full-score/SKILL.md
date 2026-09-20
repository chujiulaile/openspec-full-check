---
name: openspec-full-score
description: 独立评审 full-check 的需求来源、PRD Review、proposal、specs、design 和 tasks，确认产品方案可实现、可验收、可追踪，并生成 score.md 作为 apply 门禁。
---

# Full-check Planning Score

评分是用户显式触发的独立阶段。Reviewer 只读；主 Agent 只写 `score.md`，同一轮不修复规划产物。

## 工作流

1. 通过 `status --change "<name>" --json` 确认 `schemaName: full-check`，并确认 prd-review、proposal、specs、design（或已记录的合法跳过）和 tasks 已完成。
2. 运行 `instructions score --change "<name>" --json` 获取目标路径和模板。
3. 向只读 `openspec_planning_reviewer` 提供用户需求摘要、资料路径、已确认决策和风险接受记录；Reviewer 自行读取上述产物、适用 AGENTS.md、相关主 specs、必要代码事实和 OpenSpec 元数据，不把长文全文复制进委派 prompt。
4. 先建立来源清单，再建立 R1..Rn 从需求来源、PRD Review 到 proposal/spec/design/tasks/验证方式的双向追踪；同时识别遗漏、错写、来源冲突、孤儿需求、孤儿设计和孤儿任务。
5. 检查产品是否可落地：角色权限、触发条件、流程状态、业务规则、数据口径、异常边界、隔离与并发、兼容迁移、非功能约束和验收证据必须足以指导实现；设计依赖必须由代码事实或明确的新建任务支撑。
6. 按权重评分：需求完整性与边界 25；跨产物一致性与追踪 25；技术可实现性与风险 20；可测试性与验收清晰度 20；任务可执行性 10。
7. 总分 `>= 85` 且无 blocker、材料缺口、关键未决事项、来源冲突、不可追踪需求、未经授权的新增规则或实现/验收冲突时，才能 `result: pass`。
8. 主 Agent 核验 reviewer 的引用、算分和门禁判断后写入并复读 `score.md`。用户确认项按主题合并，只保留会改变行为、范围、契约或验收的最小问题。
9. 未通过时提示先修订规划并显式重跑评分；通过时提示 `$openspec-full-apply <change>`。不得自动循环或启动 apply。

## 分级

- Blocker：方向、契约、安全、兼容性或验收不可确定。
- 必改：结论明确但产物缺失、冲突、不可实现或不可测试。
- 建议：不影响正确实现与验收，不阻塞通过。
- 未确认事项：事实材料不足；影响实现、数据安全、接口契约或验收时升级为 Blocker。
