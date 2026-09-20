# OpenSpec Full-check 工作流

本扩展不会修改默认 `spec-driven`。复杂或高风险 change 显式使用：

```text
prd-review → propose → score → apply → tdd → archive
```

## 门禁

| 入口 | 条件 | 失败后 |
|---|---|---|
| propose | 已有 prd-review；非 ready 时用户已知情接受风险 | 先澄清，或记录接受风险 |
| apply | score 为 pass、分数至少 85，且需求来源到验证方式可追踪、无阻塞项 | 修订规划并重新评分 |
| archive | tdd-report 为 passed | 修复测试/实现并重新运行 TDD |

Reviewer 均只读，只返回结论、问题和证据。规划 Reviewer 会核对用户需求与资料、适用 AGENTS.md、PRD Review、proposal/spec/design/tasks 和必要代码事实，重点判断产品规则是否能直接指导实现与验收；主 Agent 负责核验、落盘、修复、测试和阶段推进。代码评审在同一轮完成规格符合性和代码质量检查；同一 diff 不重复评审。

OpenSpec schema 只管理规划产物和 apply 入口。TDD 是 apply 后的显式 Skill，归档 Skill 再检查其报告。这样可保留人工决策点，并避免失败时无限自动循环。

执行 `openspec update` 不会覆盖 `openspec-full-*` Skills；它们使用独立名称，不修改官方生成文件。
