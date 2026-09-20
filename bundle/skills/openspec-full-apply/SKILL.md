---
name: openspec-full-apply
description: 在 score 通过后实现 full-check change；完整保留 OpenSpec apply 行为并增加安全并行、风险代码评审和 TDD 衔接。
compatibility: Requires OpenSpec or OpenSpec-CN 1.8.0 or later.
---

# Full-check Apply

本 Skill 是 OpenSpec `apply-change` 的增强版，不再调用普通 Apply；它必须保留普通 Apply 的 change 解析、动态 instructions、上下文文件、进度、暂停和完成语义，再叠加 Full-check 硬门禁。

## 1. 解析根、store 与 change

1. 选择项目实际使用的 `openspec` 或 `openspec-cn`，整轮保持一致。
2. 用户指定 store 或项目位于 standalone store 时，先用 `store list --json` 解析 id；后续所有支持 store 的命令持续附加 `--store "<id>"`。
3. 运行 `openspec context --json` 验证 root。无 root、store 声明无效或根无法解析时停止；不得自动 init、创建 openspec 目录或回退到当前目录。
4. change 名缺失时从会话推断；只有一个 active change 时可自动选择；否则运行 `openspec list --json` 让用户选择。告知正在使用的 change 及切换方式。
5. 运行 `openspec status --change "<name>" --json`，要求 `schemaName: full-check`，并保存 `planningHome`、`changeRoot`、`artifactPaths`、`actionContext` 和任务载体的权威路径。不得把普通 schema 改成 full-check。

## 2. Full-check 硬门禁

通过 `artifactPaths` 定位 score，不猜文件路径。复读 `score.md`；只有 `result: pass` 且数值 `score >= 85` 才可实现。缺失、格式无效、分数不足或非 pass 均停止，且不能由人工确认绕过。

## 3. 获取标准 Apply 输入

运行 `openspec instructions apply --change "<name>" --json`，解析：

- `state`、内置 `instruction`、progress 和任务列表；
- `contextFiles` 中每个 artifact 的全部具体路径；
- `missingArtifacts`；
- `context`（必须考虑的项目约束）；
- `operationGuidance`，以及旧 CLI 可能返回的等价 guidance 字段（仅建议）。

`state: blocked` 时显示原因并停止；有 missingArtifacts 时引导回到 `$openspec-full-propose` 或 `$openspec-full-score` 补齐，不能实现。`state: all_done` 时不再改代码，直接显示完成进度并提示 `$openspec-full-tdd`。其他状态才进入实现。

读取 `contextFiles` 的每个路径，不假设 proposal/spec/design/tasks 的固定位置。context 和 guidance 都不是完成证据，不能覆盖用户授权、CLI state、resolved paths、内置 instruction 或 score 门禁；冲突时保留控制值并说明。不得把它们逐字复制到代码或规划产物。

开始前展示 schema、change、N/M 进度、剩余任务概览和动态 instruction。

## 4. 实现循环

1. 从 CLI 任务列表和 tasks 文件建立依赖图与文件所有权。只有依赖完成、修改范围互斥、不共享 DTO/API/配置/迁移/生成物/测试文件且验证独立的任务才可并行；否则串行。
2. 每个任务开始时显示编号和描述；只做满足 spec/design/task 所需的最小聚焦修改，并执行任务指定或仓库事实支持的验证。
3. 只有指定行为完整实现且有本轮新鲜验证证据时，才在 CLI 指定的任务文件中把 `- [ ]` 改为 `- [x]`；部分实现、延期或未知标记不得算完成。勾选后复读并刷新 apply instructions/进度，避免陈旧状态。
4. 安全/权限/资金/数据迁移、跨模块、共享契约、并行批次或验证证据不足时，必须使用只读 `openspec_code_reviewer`。Reviewer 同轮先查规格符合性再查代码质量；主 Agent 核验并修复。P0/P1 或 must-fix 未解决不得继续。
5. 修复确实改变高风险路径时进行一次针对性复评；不对相同 diff 重复评审。低风险局部修改可主 Agent 自审，但需记录理由和验证证据。

以下情况立即暂停：任务歧义；实现暴露设计问题；需要超出 spec/tasks 的工作；准备收窄、延期或接受例外；命令错误或环境 blocker；用户中断。说明已完成任务、总进度、问题、影响和可选下一步，不能默默改变需求。

## 5. 完成

持续处理直至全部任务完成或出现 blocker。完成时再次运行 apply instructions，确认 `state: all_done` 和 N/N；输出本轮完成项、总体进度、验证与评审证据。随后提示 `$openspec-full-tdd <change>` 并停止，不得直接 archive。

## 守则

- actionContext 和权威路径限制所有编辑范围；不依赖会话记忆替代磁盘内容。
- CLI blocked/ready/all_done 和完成标准必须保留；guidance 不能绕过。
- “完成、通过、已修复”必须有本轮命令或可定位证据，不能只采信 Agent 自述。
