# OpenSpec Full Check

面向复杂需求的 OpenSpec 全流程质量门禁扩展：

```text
PRD 评审 → 规划提案 → 独立评分 → 代码实现 → 测试门禁 → 归档
prd-review → propose → score → apply → tdd → archive
```

它不会修改 OpenSpec 默认的 `spec-driven` 工作流，而是在当前项目中额外安装：

- 一个项目级 `full-check` schema；
- 六个不会被 `openspec update` 覆盖的 `openspec-full-*` Skill；
- 中文 Codex / Claude Code 专精评审 Agent；
- Claude Code 的 `/opsx-full:*` 命令；
- 支持安装、更新、诊断和安全卸载的 CLI。

## 适用场景

建议对以下变更使用 `full-check`：

- 需求边界多、参与角色或权限复杂；
- 涉及跨模块、共享 API、数据迁移、安全或兼容性；
- 希望在实现前执行独立产品/架构评分；
- 希望在实现后建立 spec 场景到测试的质量门禁。

普通小改动继续使用 OpenSpec 官方 `spec-driven` 即可。

## 安装前提

- Node.js 20 或更高版本；
- 目标项目已经初始化 OpenSpec；
- 项目中存在 `openspec/config.yaml` 或 `openspec/config.yml`。

尚未初始化时，先在目标项目运行 `openspec init`；使用 OpenSpec 中文版时运行 `openspec-cn init`。

## 安装

先进入需要安装扩展的项目根目录。建议固定版本，避免安装结果随主分支变化。

### PowerShell

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.0 `
  install --project . --tools codex,claude
```

PowerShell 的续行符是反引号 `` ` ``，不是 Bash 的反斜杠 `\`。也可以写成一行：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.0 install --project . --tools codex,claude
```

### Bash / Zsh

```bash
npx --yes github:chujiulaile/openspec-full-check#v0.1.0 \
  install --project . --tools codex,claude
```

安装完成后请重启 Codex 或 Claude Code，让工具重新扫描 Skill、Agent 和命令。

## 项目级影响范围

`--project .` 表示只安装到当前目录。安装器可能创建：

```text
openspec/schemas/full-check/
openspec/FULL_CHECK_WORKFLOW.md
.agents/skills/openspec-full-*/
.codex/agents/
.claude/skills/
.claude/agents/
.claude/commands/opsx-full/
.openspec-extensions/full-check/manifest.json
```

安装器不会修改用户级 Codex/Claude 配置、全局 OpenSpec schema、其他项目或项目的默认 schema，也不会全局安装本 npm 包。`npx` 可能在系统 npm 缓存中保留下载缓存，这是 npm 自身行为。

## 选择工具

```bash
# 同时安装 Codex 和 Claude Code
--tools codex,claude

# 只安装 Codex
--tools codex

# 只安装 Claude Code
--tools claude

# 只安装通用 .agents/skills
--tools shared-agents
```

即使 `.codex` 或 `.claude` 目录不存在，显式指定对应工具后也会自动创建。若省略 `--tools`，安装器会检测已有 `.codex`、`.claude`；两者都不存在时默认选择 Codex。

## 建议先预览

`--dry-run` 只显示计划，不写入文件：

```powershell
npx --yes github:chujiulaile/openspec-full-check#v0.1.0 `
  install --project . --tools codex,claude --dry-run
```

如果目标项目已有同名 schema、Skill 或 Agent，且内容不同，安装器会安全停止，不会静默覆盖。请先核对冲突；只有确认可以覆盖时才使用 `--force`。

## 使用流程

### Codex

```text
$openspec-full-prd-review <change-name> <PRD 或链接>
$openspec-full-propose <change-name>
$openspec-full-score <change-name>
$openspec-full-apply <change-name>
$openspec-full-tdd <change-name>
$openspec-full-archive <change-name>
```

### Claude Code

```text
/opsx-full:prd-review <change-name> <PRD 或链接>
/opsx-full:propose <change-name>
/opsx-full:score <change-name>
/opsx-full:apply <change-name>
/opsx-full:tdd <change-name>
/opsx-full:archive <change-name>
```

## 阶段门禁

| 阶段入口 | 必须满足 | 未通过时 |
|---|---|---|
| propose | 已完成 PRD Review；非 ready 时用户已知情接受风险 | 先澄清，或记录接受的风险 |
| apply | `score.md` 为 `result: pass` 且分数至少 85 | 修订规划并重新评分 |
| archive | `tdd-report.md` 为 `status: passed` | 修复测试/实现并重新执行 TDD |

PRD Reviewer、规划 Reviewer 和代码 Reviewer 都是只读角色，只返回结论、问题与证据。主 Agent 负责核验、落盘、修复、运行测试和推进阶段。

## 管理命令

```bash
npx --yes github:chujiulaile/openspec-full-check#v0.1.0 update --project .
npx --yes github:chujiulaile/openspec-full-check#v0.1.0 doctor --project .
npx --yes github:chujiulaile/openspec-full-check#v0.1.0 uninstall --project .
```

- `update`：根据安装清单安全更新。
- `doctor`：检查缺失文件、用户修改和 schema 有效性。
- `uninstall`：只删除内容未被用户修改的托管文件。
- `--force`：覆盖或移除冲突文件前会先备份，请谨慎使用。

安装清单位于 `.openspec-extensions/full-check/manifest.json`。安装器通过 SHA-256 判断文件是否被用户修改，默认不会覆盖或删除已修改文件。

## 从 Release 安装包使用

也可以下载 [v0.1.0 Release](https://github.com/chujiulaile/openspec-full-check/releases/tag/v0.1.0) 中的 `.tgz`：

```bash
npx ./openspec-full-check-0.1.0.tgz install --project . --tools codex,claude
```

## 本地开发

```bash
npm ci
npm test
npm run check
npm run pack:dry-run
```

项目没有运行时第三方依赖。CI 会在 Windows 和 Linux、Node.js 20/22 上执行测试与打包检查。

## 许可证

[MIT](LICENSE)
