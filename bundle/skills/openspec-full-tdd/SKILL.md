---
name: openspec-full-tdd
description: 在 full-check apply 完成后建立 spec 场景测试映射、补强测试、最小修复实现并生成 tdd-report.md。
---

# Full-check TDD Quality Gate

这是 apply 后的测试驱动质量门禁，不伪称为经典的先测试后实现 TDD。

## 前置条件

1. 确认 change 为 `full-check`、score 已通过且 tasks 全部完成。
2. 读取 apply 的 `contextFiles`、实际 diff、测试与构建配置；测试命令必须来自仓库事实。

## 流程

1. 为每条 spec 场景建立“场景 → 测试”映射，标记已覆盖、缺失和不适用；行覆盖率不能替代行为覆盖。
2. 先运行最小相关测试取得基线，区分环境/依赖错误与断言失败。
3. 补充关键行为、异常、边界、权限/隔离和兼容性测试，避免只验证实现细节。
4. 新测试失败且证明实现偏离 spec 时，最小修改生产代码；失败源于 spec 歧义时停止并要求修订规划；环境阻塞时记录命令与错误，不伪造通过。
5. 最多执行 3 轮“测试 → 最小修复 → 重跑”。仍失败则停止为 failed/blocked。
6. 相关测试通过后，执行与风险相称的模块或全量回归。
7. 在 change 根目录写 `tdd-report.md`，frontmatter 包含 `status: passed|failed|blocked`、`tested_at`、`commands`、`passed`、`failed`；正文包含场景映射、测试/代码改动、结果、未运行项和理由。
8. 只有关键场景都有证据、相关测试通过且没有 blocker 时才能 `status: passed`。随后提示 `$openspec-full-archive`，不自动归档。

不得为通过而弱化断言、删除有效测试、改变 spec 行为或做与失败证据无关的重构。
