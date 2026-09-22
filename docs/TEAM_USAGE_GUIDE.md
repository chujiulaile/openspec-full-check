# OpenSpec Full Check 团队使用指南

本文面向产品、研发、测试和技术负责人，说明如何在项目中使用 OpenSpec Full Check 完成：

```text
PRD 评审 → 规划提案 → 独立评分 → 实现 → 测试门禁 → 归档
```

对应阶段为：

```text
prd-review → propose → score → apply → tdd → archive
```

## 1. 什么时候使用 Full Check

建议在以下变更中使用：

- 需求涉及多个角色、权限、状态或异常流程；
- 涉及跨模块、共享 API、数据库迁移、兼容性或安全风险；
- 产品规则需要在编码前充分澄清；
- 希望实现前进行独立规划评审，实现后进行场景测试验收。

简单文案、局部样式或低风险小修改可以继续使用 OpenSpec 默认的 `spec-driven` 流程。

## 2. 环境要求

- Node.js 20 或更高版本；
- OpenSpec 或 OpenSpec-CN 1.8.0 或更高版本；
- 项目已经执行过 `openspec init` 或 `openspec-cn init`；
- 项目根目录存在 `openspec/config.yaml` 或 `openspec/config.yml`。

检查版本：

```powershell
node --version
openspec --version
```

使用 OpenSpec-CN 时：

```powershell
openspec-cn --version
```

## 3. 项目负责人首次安装

在项目根目录执行：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.2 install --project . --tools codex,claude
```

只使用 Codex：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.2 install --project . --tools codex
```

只使用 Claude Code：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.2 install --project . --tools claude
```

安装完成后重启 Codex 或 Claude Code，让工具重新扫描 Skill、Agent 和命令。

安装文件通常应提交到项目仓库。其他成员拉取代码后不需要重复安装；如果安装文件未提交，或者需要升级，再执行安装或更新命令。

检查安装状态：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.2 doctor --project .
```

升级已安装版本：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.2 update --project .
```

安装器发现团队成员修改过托管文件时会停止，不会静默覆盖。不要直接使用 `--force`，应先检查冲突内容并确认可以覆盖。

## 4. 一次完整需求怎么做

以下示例使用 change 名称 `add-order-refund`。名称使用简短的 kebab-case，并在整个流程中保持一致。

### 4.1 PRD 评审

准备需求描述、PRD 文件路径或链接，然后执行：

Codex：

```text
$openspec-full-prd-review add-order-refund <PRD 文件、链接或需求说明>
```

Claude Code：

```text
/opsx-full:prd-review add-order-refund <PRD 文件、链接或需求说明>
```

本阶段会检查：

- 目标、范围和非目标；
- 用户、角色和权限；
- 主流程、状态变化、异常和边界；
- 数据口径、依赖、兼容性和非功能要求；
- 验收标准是否可观察、可测试。

主要产物：

```text
openspec/changes/add-order-refund/prd-review.md
```

可能结论：

- `ready`：需求足够明确，可以进入规划；
- `needs-clarification`：存在会改变行为或验收的问题，需要产品确认；
- `insufficient-material`：材料不足，暂时无法完成评审；
- `fail`：存在明确冲突或当前需求不可落地。

非 `ready` 不会被工具静默放行。团队可以先补充需求，也可以在看过风险后由需求负责人明确接受风险继续。

### 4.2 生成规划提案

Codex：

```text
$openspec-full-propose add-order-refund
```

Claude Code：

```text
/opsx-full:propose add-order-refund
```

主要产物：

```text
proposal.md           为什么做、做什么、影响范围
specs/**/*.md         可测试的外部行为契约
design.md             技术设计；仅在确实需要时创建
tasks.md              按依赖排序、带验证方式的实现任务
```

注意：

- Spec 描述系统必须表现出的行为，不写具体类名或逐行实现；
- Design 只记录必要的技术决策，不重复 Proposal 和 Spec；
- Tasks 必须是 `- [ ] X.Y 描述` 格式，否则 Apply 无法追踪；
- 影响行为的未决问题不能留到编码阶段再猜。

### 4.3 独立规划评分

Codex：

```text
$openspec-full-score add-order-refund
```

Claude Code：

```text
/opsx-full:score add-order-refund
```

主要产物：

```text
score.md
```

评分会核对原始需求、PRD Review、Proposal、Specs、Design、Tasks、项目规则和必要代码事实，重点判断方案是否能直接实现和验收。

评分结果的处理方式：

- `result: pass` 且 `score >= 85`：展示摘要后可以进入实现；
- 低于 85 或非 `pass`：不会自动实现，用户需要选择修订规划、明确接受风险继续或取消；
- 分数只是风险信号，不是不可绕过的绝对门槛；
- 用户接受风险后，决定写入独立的 `apply-decision.md`，不会修改原始 `score.md`。

如果 Score 后来发生变化，原来的风险接受记录会因为 SHA-256 不匹配而失效，需要重新确认。

### 4.4 实现任务

Codex：

```text
$openspec-full-apply add-order-refund
```

Claude Code：

```text
/opsx-full:apply add-order-refund
```

Apply 会保留标准 OpenSpec Apply 行为，并额外执行：

- 读取 Score 和风险决定；
- 根据任务依赖、文件所有权和共享资源组织实现批次；
- 只并行执行真正互不冲突的任务；
- 每批实现后由一个全新、只读的 Reviewer 统一审查；
- Reviewer 通过且验证证据完整后，才由主 Agent 勾选任务；
- 全部任务完成后停止，不会直接归档。

执行过程中遇到需求歧义、设计问题、范围扩大、验证失败或环境阻塞时，流程会暂停并说明原因，不会自行缩减需求。

如果只安装了 `shared-agents`：

- 宿主支持子 Agent 时，会创建全新只读上下文执行评审；
- 宿主不支持独立 Agent 时会暂停；
- 用户可以安装 Codex/Claude adapter，或明确接受非独立复核降级；
- 主 Agent 不会把自评伪装成独立 Reviewer。

### 4.5 测试门禁

Codex：

```text
$openspec-full-tdd add-order-refund
```

Claude Code：

```text
/opsx-full:tdd add-order-refund
```

这里的 TDD 是 Apply 后的行为测试门禁，不表示“先写测试再写实现”。它会：

- 从全部 Spec Requirement/Scenario 建立场景到测试的映射；
- 运行相关测试取得本轮基线；
- 补充主流程、异常、边界、权限、隔离、并发和兼容性测试；
- 发现实现偏离 Spec 时进行最小修复；
- 执行与风险相称的回归测试；
- 生成 `tdd-report.md`。

只有关键场景有证据、相关测试通过且没有 Blocker 时，报告才会是：

```yaml
status: passed
```

### 4.6 归档

Codex：

```text
$openspec-full-archive add-order-refund
```

Claude Code：

```text
/opsx-full:archive add-order-refund
```

Archive 会检查：

- 规划产物是否完成；
- Tasks 是否全部勾选；
- 低分规划是否存在与当前 Score 匹配的风险接受记录；
- `tdd-report.md` 是否为 `status: passed`；
- Delta Specs 是否需要同步到主 Specs；
- 同步和归档后的 OpenSpec 状态是否有效。

需要同步主 Specs 时，工具会让用户选择：

- 现在同步，推荐；
- 不更新主 Specs 直接归档；
- 取消。

归档完成后，change 会移动到 OpenSpec 的 archive 目录，完整保留规划、评分、决定和测试报告。

## 5. 常见产物目录

典型 change 目录如下：

```text
openspec/changes/add-order-refund/
├── .openspec.yaml
├── prd-review.md
├── proposal.md
├── specs/
│   └── order-refund/
│       └── spec.md
├── design.md
├── tasks.md
├── score.md
├── apply-decision.md      # 仅低分或非 pass 后接受风险时需要
└── tdd-report.md
```

`score.md` 是独立评审证据，不应在 Apply 阶段修改。`apply-decision.md` 是用户授权记录，二者职责不同。

## 6. 团队职责建议

| 角色 | 主要职责 |
|---|---|
| 产品/需求负责人 | 提供来源材料，确认范围、业务规则、验收标准和风险接受决定 |
| 技术负责人 | 确认架构、接口、数据、迁移、安全和兼容性方案 |
| 实现人员 | 按 Tasks 和 Spec 实现，不擅自改变产品行为 |
| Reviewer | 只读审查证据、行为、边界、风险和任务完成度 |
| 测试人员 | 核对 Scenario 到测试的映射、回归范围和未测试风险 |

风险接受、跳过主 Specs 同步等决定应由有权限的负责人做出，不建议由执行 Agent 代替团队决定。

## 7. 常见问题

### 找不到 `$openspec-full-*` 或 `/opsx-full:*`

确认已安装对应工具 adapter，并重启 Codex 或 Claude Code：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.2 doctor --project .
```

### 提示 OpenSpec 版本过低或找不到 CLI

升级到 OpenSpec/OpenSpec-CN 1.8.0 或更高版本，然后重新运行安装或 doctor。安装器会在写入文件前检查版本。

### 提示找不到 `full-check` schema

确认命令运行在正确的项目根目录，并执行：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.2 update --project .
npx --yes github:chujiulaile/openspec-full-check#v0.1.2 doctor --project .
```

使用 standalone store 时，必须确保 `full-check` schema 安装在 CLI 返回的权威 OpenSpec 根目录，并且当前宿主能够发现对应 Skill/Agent。

### 分数低于 85 是否一定不能实现

不是。系统会展示 Blocker、必改项、未确认事项和实现影响，由用户选择：

1. 修订规划后重新评分；
2. 明确接受列出的风险并继续；
3. 取消。

只有第二种选择会进入实现，并生成或更新 `apply-decision.md`。

### 为什么已经接受风险，又要求重新确认

因为 `score.md` 已经发生变化。风险决定绑定 Score SHA-256，确保用户接受的是当前版本的风险，而不是旧报告。

### Apply 为什么没有直接归档

Full Check 要求实现完成后显式运行 TDD 阶段，建立 Spec 场景到测试的证据，再由 Archive 验证并归档。

### 更新时提示 Refusing to overwrite

说明托管文件被本地修改。先查看差异并决定保留、迁移还是覆盖。`--force` 会在覆盖前备份，但只应在确认后使用。

## 8. 最短操作清单

Codex：

```text
$openspec-full-prd-review add-order-refund <需求材料>
$openspec-full-propose add-order-refund
$openspec-full-score add-order-refund
$openspec-full-apply add-order-refund
$openspec-full-tdd add-order-refund
$openspec-full-archive add-order-refund
```

Claude Code：

```text
/opsx-full:prd-review add-order-refund <需求材料>
/opsx-full:propose add-order-refund
/opsx-full:score add-order-refund
/opsx-full:apply add-order-refund
/opsx-full:tdd add-order-refund
/opsx-full:archive add-order-refund
```

每个阶段结束后先阅读结论、风险和下一步，不建议把六条命令一次性提交给 Agent 连续执行。
