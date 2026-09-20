# OpenSpec Full-check 工作流

本扩展不会修改默认 `spec-driven`。复杂或高风险 change 显式使用：

```text
prd-review → propose → score → apply → tdd → archive
```

## 门禁

| 入口 | 条件 | 失败后 |
|---|---|---|
| propose | 已有 prd-review；非 ready 时用户已知情接受风险 | 先澄清，或记录接受风险 |
| apply | 已完成 score；低于 85 或非 pass 时用户已选择修订规划或接受风险继续 | 展示风险，由用户决定修订或继续 |
| archive | tdd-report 为 passed | 修复测试/实现并重新运行 TDD |

Reviewer 均只读，只返回结论、问题和证据。规划 Reviewer 会核对用户需求与资料、适用 AGENTS.md、PRD Review、proposal/spec/design/tasks 和必要代码事实，重点判断产品规则是否能直接指导实现与验收；主 Agent 负责核验、落盘、修复、测试和阶段推进。代码评审在同一轮完成规格符合性和代码质量检查；同一 diff 不重复评审。

Full-check Skills 保留标准 OpenSpec 的 root/store 解析、权威路径、动态 instructions、阻塞状态和进度语义。`full-propose`、`full-apply`、`full-archive` 分别在官方 Propose、Apply、Archive 行为上叠加 PRD、Score、Reviewer 和 TDD 检查；不会通过简化流程绕开标准的 artifact 依赖或 delta spec 同步验证。Score 是风险报告：低分或非 pass 会阻止自动继续，但用户看过风险后可以明确接受并进入实现。

OpenSpec schema 只管理规划产物和 apply 入口。TDD 是 apply 后的显式 Skill，归档 Skill 再检查其报告。这样可保留人工决策点，并避免失败时无限自动循环。

执行 `openspec update` 不会覆盖 `openspec-full-*` Skills；它们使用独立名称，不修改官方生成文件。
