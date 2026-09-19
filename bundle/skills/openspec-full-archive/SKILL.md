---
name: openspec-full-archive
description: 在 full-check 任务完成且 tdd-report.md 通过后同步并归档 OpenSpec 变更；默认 spec-driven 使用官方归档。
---

# Full-check Archive

## 门禁

1. 通过 `status --change "<name>" --json` 确认 `schemaName: full-check`，规划产物和 tasks 均完成。
2. `score.md` 必须为 `result: pass` 且 `score >= 85`。
3. change 根目录必须存在 `tdd-report.md`，且 frontmatter 为 `status: passed`。该门禁不能由确认绕过。
4. 复核报告包含实际命令、结果和关键场景证据；仅有主观“测试通过”描述不够。

## 归档

1. 检查 delta specs 与主 specs 的预期变化，并向用户展示归档摘要。
2. 使用当前 OpenSpec CLI 的归档命令归档指定 change；若 CLI 要求显式确认，保留确认点。
3. 归档后运行 `validate` 或等价校验，并确认 change 已移动到 archive、主 specs 已按预期更新。
4. 报告归档位置、同步的 capabilities 和验证结果。

普通 `spec-driven` 不提示 TDD 门禁，应使用官方 archive 工作流。
