---
name: openspec-full-prd-review
description: 在 full-check OpenSpec 变更的 propose 前独立评审 PRD，并生成可追踪的 prd-review.md；默认 spec-driven 不使用。
---

# Full-check PRD Review

只创建需求评审产物，不创建 proposal、spec、design、tasks 或代码。

## 工作流

1. 解析 change。不存在时运行 `openspec new change "<name>" --schema full-check`；使用 OpenSpec CN 时用 `openspec-cn`。存在时通过 `status --change "<name>" --json` 确认 `schemaName` 为 `full-check`，不迁移其他 schema。
2. 运行 `instructions prd-review --change "<name>" --json`，使用返回的路径、template、context 和 rules。
3. 读取 PRD、用户提供的关联材料，以及验证需求边界所需的最小现有 spec/代码事实。不可读取的来源列为材料缺口，不猜测。
4. 若宿主支持自定义 Agent，使用只读 `openspec_prd_architect`；否则使用全新只读 reviewer 上下文。Reviewer 只返回结论、问题和证据，不编辑文件。
5. 主 Agent 核验引用后写入 `prd-review.md`：检查目标、范围/非目标、角色权限、流程与状态、异常边界、数据与依赖、兼容性、非功能约束和验收标准，并建立 R1..Rn 追踪。
6. 每轮只列最高影响的 5 个必须澄清问题；每项包含证据、互斥选项、影响和推荐，其余进入延期问题。
7. 结论只能是 `ready`、`needs-clarification`、`insufficient-material`。非 ready 时默认不建议继续，但用户看过风险并明确接受后仍可显式运行 `$openspec-full-propose`。
8. 完成后停止，不自动启动下一阶段。

## 边界

- Reviewer 不改 PRD、不写产物、不启动工作流；主 Agent 负责核验、落盘和用户交互。
- 只对 full-check 使用本阶段；普通 `spec-driven` 保持官方流程。
