---
name: openspec-full-archive
description: 在 Score 风险已决策且 TDD 通过后，按 OpenSpec 标准同步 delta specs、验证并归档 full-check change。
compatibility: Requires OpenSpec or OpenSpec-CN 1.8.0 or later.
---

# Full-check Archive

本 Skill 是 OpenSpec `archive-change` 的严格增强版：保留官方 change 选择、权威路径、delta spec 同步评估和归档语义，但 Full-check 的规划、任务、Score、TDD 门禁不可通过确认绕过。

## 1. 解析根、store 与 change

1. 选择项目实际使用的 `openspec` 或 `openspec-cn`，整轮一致。
2. 用户指定 store 或项目位于 standalone store 时，用 `store list --json` 解析 id；后续支持 store 的命令持续附加 `--store "<id>"`。
3. 运行 `openspec context --json` 验证 root。无 root 或 store 无法解析时停止；不得自动初始化或回退路径。
4. change 名缺失时从会话推断；唯一 active change 可自动选择，否则用 `openspec list --json` 让用户选择。告知选中的 change。
5. 运行 `openspec status --change "<name>" --json`，要求 `schemaName: full-check`，保存 `planningHome`、`changeRoot`、`artifactPaths`、`actionContext` 和 artifact 状态。所有路径以 CLI 为准。

可选运行 `openspec instructions archive --change "<name>" --json`。旧 CLI 不支持或返回无效 JSON 时可继续；成功时把 `context` 作为项目约束、`operationGuidance` 作为建议。二者不得覆盖硬门禁、用户选择、CLI 路径或归档契约，也不得复制进 specs。

## 2. 不可绕过的 Full-check 门禁

1. status 中所有规划产物必须为 done 或 skipped；任何其他状态均停止。
2. 从 artifactPaths 定位任务文件；只有内容为 `x` 或 `X` 的 checkbox 算完成，其他标记均视为未完成。存在未完成任务即停止。
3. score 必须存在且可解析；若不是 `result: pass` 且 `score >= 85`，必须有 `Apply Decision` 区域的 `decision: accepted-risk`。没有决定记录时先让用户选择修订规划、接受风险归档或取消；接受后记录决定，不改写原评分。
4. 从 `changeRoot` 定位 `tdd-report.md`，要求 frontmatter `status: passed`，并复核包含实际命令、结果、关键场景证据和未运行项说明。主观“测试通过”不算。

上述门禁不能通过“仍然归档”确认绕过。

## 3. 评估 delta specs

只使用 `artifactPaths.specs.existingOutputPaths` 作为 delta spec 来源；字段不存在或为空时判定为无 delta，不从目录猜测。对每个 delta 保留完整 capability 相对路径，并与 `<planningHome.root>/openspec/specs/<capability-path>/spec.md` 对比，汇总 ADDED、MODIFIED、REMOVED、RENAMED 的预期变化。

主 spec 不存在时：只有 ADDED 能创建新 capability；MODIFIED/RENAMED 无基线时标记 sync-blocked；REMOVED-only 只有在 change 明确声明 capability retirement 且目标已不存在时才可视为已同步，否则 blocked。继续检查其他 capability，给出合并摘要。

向用户提供互斥选择：需要同步时为“现在同步（推荐）/不更新主 specs 直接归档/取消”；已同步时为“归档/仍重新同步/取消”；存在 sync-blocked 时只能“不更新主 specs 直接归档/取消”。其他回答不执行归档。

## 4. 同步与验证

用户选择同步时：

1. 先运行 `openspec instructions specs --change "<name>" --json`，要求命令成功且 JSON 有效；获取一次 rules 快照。失败时停止，不能移动 change。
2. 在前台同步执行项目已安装的 `openspec-sync-specs` 工作流；若宿主只能委派，也必须同步等待。把 delta 分析和 rules 快照传入，不得后台运行，不得在同步未结束时归档。
3. 同步后重新逐 capability 对比全部 delta：ADDED 已出现；MODIFIED 的新描述/场景出现且旧的未修改场景保留；REMOVED 已消失；RENAMED 新名存在且旧名消失；最后一条需求移除时不能留下空 spec。
4. 任一不一致或同步失败立即停止，保留 changeRoot 供修复；不得把失败说成完成。

## 5. 归档与最终验证

使用 `planningHome.changesDir` 和 `changeRoot` 执行当前标准归档移动：确保 `<planningHome.changesDir>/archive` 存在；目标名已有 `YYYY-MM-DD-` 前缀时不重复加日期，否则使用当天 `YYYY-MM-DD-<change>`。移动前检查目标不存在，存在时停止并让用户处理冲突，禁止覆盖。移动必须保留 change 内全部文件和 `.openspec.yaml`。

归档后：

1. 运行 `openspec validate` 或适用于当前版本的等价校验；
2. 确认原 changeRoot 不再作为 active change，目标归档目录存在且 `.openspec.yaml` 随目录保留；
3. 若选择了同步，再次确认主 specs 与同步后状态一致；
4. 报告 change、schema、归档位置、同步/跳过的 capabilities、验证结果和用户明确选择。

## 守则

- 不硬编码 `openspec/changes`、主 specs 或 archive 路径。
- delta 同步必须前台完成并验证后才能移动 change。
- 未经用户选择不跳过主 specs 同步；取消即停止。
- 普通 spec-driven change 使用官方 archive，不套用 Full-check 的 Score/TDD 门禁。
