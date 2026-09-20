---
name: openspec-full-score
description: 独立评审 full-check 的需求来源与全部规划产物，确认可实现、可验收、可追踪，并使用 OpenSpec 权威路径生成 score.md。
metadata:
  compatibility: Requires OpenSpec or OpenSpec-CN 1.8.0 or later.
---

# Full-check Planning Score

评分是用户显式触发的独立阶段。Reviewer 只读；主 Agent 本轮只允许写 score artifact，不修复其他规划产物、不实现代码、不自动复评。

## 1. 解析根、store 与 change

1. 选择项目实际使用的 `openspec` 或 `openspec-cn`。用户指定 store 或工作位于 standalone store 时，用 `store list --json` 解析 id，并在后续支持的命令上持续携带 `--store "<id>"`。
2. 运行 `openspec context --json` 验证权威 root；无 root、store 无效或根不明确时停止，不自动 init 或回退路径。
3. change 名缺失时从会话推断；唯一 active change 可选择，否则通过 `openspec list --json` 让用户选择。告知选中的 change。
4. 运行 `openspec status --change "<name>" --json`，要求 `schemaName: full-check`，保存 `planningHome`、`changeRoot`、`artifactPaths`、`actionContext` 和 artifact 依赖图。

## 2. 验证输入并获取 score 指令

按 artifactPaths 和 status 检查 prd-review、proposal、specs、design（done、skipped 或 instruction 明确的合法条件跳过）和 tasks；任何必要产物缺失、blocked 或路径不明时停止，不凭固定文件名补齐。

运行 `openspec instructions score --change "<name>" --json`，解析 `resolvedOutputPath`、dependencies、context、rules、template 和 instruction。context/rules 是评审约束，不能覆盖用户授权、CLI state/path 或评分硬门禁，也不得复制进 score。重新从磁盘读取所有 dependency 路径。

## 3. 独立评审

向只读 `openspec_planning_reviewer` 提供用户需求摘要、资料路径、已确认决策和风险接受记录；不复制长文。Reviewer 读取：全部 dependency 文件、适用 AGENTS.md、相关主 specs、必要代码事实、配置与 OpenSpec 元数据。

建立来源清单和 R1..Rn 双向追踪：需求来源 -> prd-review -> proposal/spec -> design -> tasks -> 验证方式。识别遗漏、错写、来源冲突、孤儿需求、孤儿设计、孤儿任务和未经授权规则。检查角色权限、触发与状态、业务规则、数据口径、异常边界、隔离并发、兼容迁移、非功能约束和验收证据是否足以实施。

按权重评分：需求完整性与边界 25；跨产物一致性与追踪 25；技术可实现性与风险 20；可测试性与验收清晰度 20；任务可执行性 10。

总分 `>= 85` 且没有 blocker、材料缺口、关键未决事项、来源冲突、不可追踪需求、未经授权规则或实现/验收冲突时，才能 `result: pass`。分数不能覆盖硬门禁。

## 4. 写入与完成

主 Agent 核验 Reviewer 的路径引用、证据、算分和门禁判断后，严格按 template/instruction 写 resolvedOutputPath，并复读文件、重跑 status。用户确认项按主题合并，只保留会改变行为、范围、契约或验收的问题；每项含互斥选项、影响和推荐。

未通过时提示修订规划并由用户显式重跑评分；通过时提示 `$openspec-full-apply <change>`。不得同轮修复—复评或启动 apply。

## 分级

- Blocker：方向、范围、契约、安全、兼容或验收不可确定。
- 必改：证据已确定唯一修正，但产物缺失、冲突、不可实现或不可测试。
- 建议：不影响正确实现与验收，不阻塞通过。
- 未确认事项：事实不足；影响实现、数据安全、接口契约或验收时升级为 Blocker。
