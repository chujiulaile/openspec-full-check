---
name: openspec-full-tdd
description: 在 full-check apply 完成后，使用 OpenSpec 权威上下文建立 spec 场景测试映射、补强测试、最小修复并生成 tdd-report.md。
metadata:
  compatibility: Requires OpenSpec or OpenSpec-CN 1.8.0 or later.
---

# Full-check TDD Quality Gate

这是 apply 后的行为测试门禁，不伪称经典的“先测试后实现”TDD。它不归档 change。

## 1. 解析根、store、change 与上下文

1. 选择项目实际使用的 `openspec` 或 `openspec-cn`。用户指定 store 或工作位于 standalone store 时，用 `store list --json` 解析 id，并在后续支持的命令上持续携带 `--store "<id>"`。
2. 运行 `openspec context --json` 验证 root；无 root、store 无效或根不明确时停止，不自动 init 或回退路径。
3. change 名缺失时从会话推断；唯一 active change 可选择，否则通过 `openspec list --json` 让用户选择。告知选中的 change。
4. 运行 `openspec status --change "<name>" --json`，要求 `schemaName: full-check`，保存 `planningHome`、`changeRoot`、`artifactPaths`、`actionContext`。
5. 运行 `openspec instructions apply --change "<name>" --json` 获取当前 `contextFiles`、任务状态、context 和 operationGuidance。读取全部 contextFiles；context 是必须考虑的约束，guidance 仅建议，二者不得覆盖 CLI 状态、用户授权或 spec，也不得复制进报告。

## 2. 前置条件

从 artifactPaths 定位 score 和 tasks，不猜路径。score 必须存在且可解析；若不是 `result: pass` 且 `score >= 85`，则 `<changeRoot>/apply-decision.md` 必须为 `decision: accepted-risk`，且其中记录的 score SHA-256 必须匹配当前 score。决定缺失、无效或评分已变化时停止并要求返回 Apply 重新确认，不得在 TDD 阶段补做追认，也不得修改分数/result。apply state 必须为 `all_done`，全部任务 checkbox 必须完成，否则停止并返回 Apply。读取实际 diff、相关测试和构建配置；测试命令必须来自仓库事实，不能凭通用习惯编造。

## 3. 场景驱动测试循环

1. 从 contextFiles 中的全部 delta specs 提取每个 Requirement/Scenario，建立“场景 -> 测试/证据”矩阵，标记已覆盖、缺失、不适用及理由。行覆盖率不能替代行为覆盖。
2. 先运行最小相关测试取得基线，保存准确命令、工作目录、退出码和关键输出；区分环境/依赖错误与断言失败。
3. 补充主流程、关键业务规则、异常、边界、权限/隔离、重复/并发和兼容性测试，优先观察外部行为，避免锁死实现细节。
4. 新测试失败且证明确实偏离 spec 时，最小修改生产代码；失败源于 spec/design 歧义或需要扩大范围时停止并要求回到规划；环境阻塞时记录证据，不伪造通过。
5. 最多执行 3 轮“测试 -> 最小修复 -> 重跑”。每轮只修复当前失败证据指向的问题，不做无关重构。仍失败则终态为 failed/blocked。
6. 相关测试通过后，执行与变更风险相称的模块或全量回归；不能运行的测试必须说明原因和风险。

## 4. 报告与完成

将 `tdd-report.md` 写到 CLI 返回的 `changeRoot`，使用随扩展安装的 `templates/tdd-report.md` 结构，不得写到当前工作目录。frontmatter 包含 `status: passed|failed|blocked`、`tested_at`、`commands`、`passed`、`failed`；正文包含场景映射、测试与代码改动、每条命令结果、未运行项和理由、剩余风险。

只有关键场景均有证据、相关测试通过且无 blocker 时才可 `status: passed`。写后复读报告并验证命令/计数与本轮输出一致。passed 时提示 `$openspec-full-archive <change>`；failed/blocked 时明确下一步并停止，不自动归档。

## 守则

- actionContext 限制修改范围；不修改规划来迁就实现。
- 不弱化断言、删除有效测试、隐藏失败或以旧结果代替本轮证据。
- 用户中断、命令错误、范围扩大或需求歧义时暂停，不猜测继续。
