---
name: openspec-full-apply
description: 在用户确认规划评分风险后实现 full-check change；保留 OpenSpec apply 行为，并增加规则路由、依赖批次、文件所有权、独立任务审查和 TDD 衔接。
metadata:
  compatibility: Requires OpenSpec or OpenSpec-CN 1.8.0 or later.
---

# Full-check Apply

本 Skill 是 OpenSpec `apply-change` 的增强版，不再调用普通 Apply。它保留 change 解析、动态 instructions、上下文文件、进度、暂停和完成语义；Score 是必须读取的风险报告，但不是不可绕过的分数门禁。

## 1. 解析根、store 与 change

1. 选择项目实际使用的 `openspec` 或 `openspec-cn`，整轮保持一致。
2. 用户指定 store 或项目位于 standalone store 时，先用 `store list --json` 解析 id；后续所有支持 store 的命令持续附加 `--store "<id>"`。
3. 运行 `openspec context --json` 验证 root。无 root、store 声明无效或根无法解析时停止；不得自动 init、创建 openspec 目录或回退到当前目录。
4. change 名缺失时从会话推断；只有一个 active change 时可自动选择；否则运行 `openspec list --json` 让用户选择。告知正在使用的 change 及切换方式。
5. 运行 `openspec status --change "<name>" --json`，要求 `schemaName: full-check`，保存 `planningHome`、`changeRoot`、`artifactPaths`、`actionContext` 和任务载体的权威路径。不得把其他 schema 改成 full-check。

## 2. Score 风险确认

通过 `artifactPaths` 定位 score，不猜文件路径。score 缺失或无法解析时停止并要求重新评分。若 `result: pass` 且 `score >= 85`，展示摘要后继续；否则必须展示总分、结论、Blockers、必改、未确认事项和实现影响，并让用户明确选择：

1. 先修订规划并重新运行 `$openspec-full-score`（推荐）；
2. 接受列出的规划风险并继续实现；
3. 取消。

只有用户明确选择继续才能进入实现，不得替用户接受风险，也不得把低分改写成 pass。把决定写入 `<changeRoot>/apply-decision.md`，不得修改独立 Reviewer 生成的 score.md。决定文件使用随扩展安装的 `templates/apply-decision.md` 结构，记录 `decision: accepted-risk|revise-planning|cancelled`、`decided_at`、原始 `score_result`/`score`、score 文件 SHA-256、`accepted_risks` 和 `implementation_watch_items`。已有决定只有在它引用的 score SHA-256 与当前文件一致时才有效；评分变化后必须重新确认。选择修订或取消时停止。

## 3. 获取标准 Apply 输入

运行 `openspec instructions apply --change "<name>" --json`，解析 `state`、内置 `instruction`、progress、任务列表、`contextFiles`、`missingArtifacts`、`context` 和 `operationGuidance`（旧 CLI 的等价 guidance 字段也按建议处理）。

`state: blocked` 时显示原因并停止；有 missingArtifacts 时引导回到 Propose/Score 补齐。`state: all_done` 时不改代码，直接显示进度并提示 TDD。其他状态才进入实现。

读取 contextFiles 的每个路径，不假设固定 artifact 名或目录。context 和 guidance 不是完成证据，不能覆盖用户授权、CLI state、resolved paths 或内置 instruction；冲突时保留控制值并说明。不得把它们逐字复制到代码或规划产物。

## 4. 建立规则路由

开始编码前读取项目根 AGENTS.md，以及每个目标文件所在目录向上路径中适用的 AGENTS.md。先读取其中的规则路由与 `@` 引用，不预加载全部规则正文；再用 spec、design、tasks、目标代码和任务场景决定需要读取的最小规则章节。

若项目存在 `codingRule.md`、`projectRule.md`、`errorRule.md`、`operateLogRule.md` 等路由，分别在代码/DTO/Controller/Service、分层/包路径/调用链/事务、日期/空值/SQL/批量/异常/精度/错误码、写操作/授权/审批/操作日志场景触发；实际以 AGENTS.md 声明为准，不能硬套不存在的规则。多个场景取并集，纯查询且无副作用时通常不加载操作日志规则。

登记已加载规则的 ID、来源、适用任务和检查方式。规则引用不可读、适用性无法判断或工程规则与业务 spec 冲突时暂停；不得猜测继续。后续委派只传精简规则清单和来源路径，不复制规则全文。

## 5. 构建任务依赖图和批次

为每个 pending task 建立实现卡片：task ID、前置任务、关联 spec/design 章节、目标模块、预计修改文件、允许读取范围、已触发规则、定向验证、共享资源和风险等级。

只有以下条件全部满足时才能并行：无未完成前置；文件所有权不重叠；不修改同一 DTO/API/公共契约、配置、迁移、生成物或测试文件；不依赖同一未完成接口；验证可独立执行。共享契约、公共 DTO、配置、数据库迁移、生成代码、跨模块接线和最终集成默认串行。

按独立任务组决定实现 Agent 数量：1 组用 1 个；2–3 组最多 2 个；4–6 组最多 3 个；超过 6 组最多 4 个。实际数量取建议值、可用并发槽位和冲突约束的最小值，不为凑数拆任务。优先隔离 worktree；无法隔离时仍必须保持文件所有权互斥。宿主没有子 Agent 时按同一依赖图串行执行，不降低门禁。

每个实现 Agent 只接收一个互不冲突的任务组，以及 task ID、允许修改范围、关联产物章节、规则清单和验证方式。实现 Agent 不修改 tasks.md、不勾选任务、不处理其他 Agent 的代码。

## 6. 分批实现与独立审查

开始前展示 schema、change、N/M 进度、剩余任务、动态 instruction、当前批次、Agent 数量和文件所有权。

1. 实现 Agent 做满足 spec/design/task 的最小聚焦修改并执行定向验证，返回实际文件、命令、结果和未决问题；不以自评作为通过证据。
2. 主 Agent 等待当前批次全部返回，核对工作区 diff、文件所有权和冲突；有冲突先暂停协调。
3. 每个批次只启动一个全新上下文、只读的任务实现 Reviewer：Codex 优先使用 `openspec_task_implementation_reviewer`，Claude 优先使用 `openspec-task-implementation-reviewer`；集中审查该批次全部任务。若命名 Reviewer 未安装，但宿主支持新上下文子 Agent，则创建一个仅有读取/搜索权限的通用子 Agent，并把同一 Reviewer 契约、审查范围和输出格式传入；不得赋予写入权限。若宿主完全不支持独立 Agent，暂停并说明当前只能执行非独立复核，由用户选择安装 Codex/Claude adapter 或明确接受降级；不得静默把主 Agent 自评伪装成独立评审。Reviewer 只读取相关 task/spec/design、实际 diff、目标文件、验证证据和触发规则，独立检查行为、异常、边界、调用链、副作用、任务完成度和规则符合性；不修改代码或 tasks，只审一轮。
4. Reviewer 返回 pass、must-fix 或 blocked。建议项不阻塞；must-fix/blocked 不得勾选。主 Agent 可修复明确问题；只有 diff 已变化且问题已处理时允许一次针对性复评，禁止无限修复—复评循环。不依赖该任务的后续批次可继续，但最终集成前必须清零所有 must-fix/blocked。
5. 只有行为完整、定向验证有本轮证据、规则复核完成、Reviewer 通过且主 Agent 合并核对后，才由主 Agent 在权威任务文件中把 `- [ ]` 改为 `- [x]`。实现 Agent 和 Reviewer 均不得勾选。勾选后复读并刷新 apply instructions/进度。

任务歧义、设计问题、超出 spec/tasks 的工作、准备收窄/延期/接受例外、命令错误、环境 blocker 或用户中断时立即暂停，说明进度、影响和选项，不能默默改变需求。

## 7. 完成

最终集成前重新读取 AGENTS.md 路由、规则清单和完整 change diff，执行跨批次接线与风险相称的集成验证。存在未解决 reviewer 问题、规则冲突、触发但未读取的规则或无法验证的硬约束时保持暂停。

全部任务完成后再次运行 apply instructions，确认 `state: all_done` 和 N/N。输出本轮完成项、总体进度、Score 风险决定、每批 reviewer 结论、验证与规则复核证据。随后提示 `$openspec-full-tdd <change>` 并停止，不直接 archive。

## 守则

- actionContext 和权威路径限制所有编辑范围；磁盘内容优先于会话记忆。
- 保留 CLI blocked/ready/all_done 和完成标准；guidance 不能绕过。
- “完成、通过、已修复”必须有本轮命令或可定位证据。
- 一个批次只用一个独立 reviewer；不为每个实现 Agent 重复审查相同 diff。
