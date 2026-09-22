import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

import { doctor, installOrUpdate, uninstall } from "../src/installer.mjs";

const extension = JSON.parse(
  readFileSync(new URL("../extension.json", import.meta.url), "utf8"),
);

function fixture() {
  const project = mkdtempSync(join(tmpdir(), "openspec-full-check-"));
  mkdirSync(join(project, "openspec"), { recursive: true });
  writeFileSync(join(project, "openspec", "config.yaml"), "schema: spec-driven\n", "utf8");
  return project;
}

function manifest(project) {
  return JSON.parse(
    readFileSync(
      join(project, ".openspec-extensions", "full-check", "manifest.json"),
      "utf8",
    ),
  );
}

function runOpenSpec(command, args, cwd) {
  if (process.platform === "win32") {
    return spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `${command}.cmd`, ...args], {
      cwd,
      encoding: "utf8",
      shell: false,
    });
  }
  return spawnSync(command, args, { cwd, encoding: "utf8", shell: false });
}

test("prints package help and version from top-level flags", () => {
  const executable = fileURLToPath(new URL("../bin/openspec-full-check.mjs", import.meta.url));
  const version = spawnSync(process.execPath, [executable, "--version"], { encoding: "utf8" });
  const help = spawnSync(process.execPath, [executable, "--help"], { encoding: "utf8" });

  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout.trim(), extension.version);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, new RegExp(`OpenSpec Full Check ${extension.version.replaceAll(".", "\\.")}`));
});

test("installs Codex and Claude adapters without changing the default schema", () => {
  const project = fixture();
  const result = installOrUpdate({
    project,
    tools: ["codex", "claude"],
    validate: false,
  });

  assert.ok(result.writes.length > 20);
  assert.equal(readFileSync(join(project, "openspec", "config.yaml"), "utf8"), "schema: spec-driven\n");
  assert.ok(existsSync(join(project, "openspec", "schemas", "full-check", "schema.yaml")));
  assert.ok(
    existsSync(
      join(project, ".agents", "skills", "openspec-full-prd-review", "SKILL.md"),
    ),
  );
  assert.ok(
    existsSync(join(project, ".codex", "agents", "openspec-code-reviewer.toml")),
  );
  assert.ok(
    existsSync(
      join(project, ".codex", "agents", "openspec-task-implementation-reviewer.toml"),
    ),
  );
  assert.ok(
    existsSync(
      join(project, ".claude", "agents", "openspec-task-implementation-reviewer.md"),
    ),
  );
  assert.ok(
    existsSync(join(project, ".claude", "commands", "opsx-full", "score.md")),
  );
  assert.deepEqual(manifest(project).tools, ["claude", "codex"]);
});

test("installs the implementation-ready planning review contract", () => {
  const project = fixture();
  installOrUpdate({
    project,
    tools: ["codex", "claude"],
    validate: false,
  });

  const codexReviewer = readFileSync(
    join(project, ".codex", "agents", "openspec-planning-reviewer.toml"),
    "utf8",
  );
  const claudeReviewer = readFileSync(
    join(project, ".claude", "agents", "openspec-planning-reviewer.md"),
    "utf8",
  );
  const scoreTemplate = readFileSync(
    join(project, "openspec", "schemas", "full-check", "templates", "score.md"),
    "utf8",
  );

  for (const reviewer of [codexReviewer, claudeReviewer]) {
    assert.match(reviewer, /来源与追踪/);
    assert.match(reviewer, /产品可落地检查/);
    assert.match(reviewer, /AGENTS\.md/);
    assert.match(reviewer, /用户需要确认的问题/);
  }
  assert.match(scoreTemplate, /评审范围与材料/);
  assert.match(scoreTemplate, /Task\/验证/);
  assert.match(scoreTemplate, /AGENTS\.md 约束注入/);
});

test("installs full-check skills with the standard OpenSpec runtime contract", () => {
  const project = fixture();
  installOrUpdate({
    project,
    tools: ["codex"],
    validate: false,
  });

  const skillRoot = join(project, ".agents", "skills");
  const skillNames = [
    "openspec-full-prd-review",
    "openspec-full-propose",
    "openspec-full-score",
    "openspec-full-apply",
    "openspec-full-tdd",
    "openspec-full-archive",
  ];
  const skills = Object.fromEntries(
    skillNames.map((name) => [
      name,
      readFileSync(join(skillRoot, name, "SKILL.md"), "utf8"),
    ]),
  );

  for (const content of Object.values(skills)) {
    assert.match(content, /compatibility: Requires OpenSpec or OpenSpec-CN 1\.8\.0 or later\./);
    assert.match(content, /store list --json/);
    assert.match(content, /context --json/);
    assert.match(content, /root/);
  }

  assert.match(skills["openspec-full-propose"], /resolvedOutputPath/);
  assert.match(skills["openspec-full-propose"], /artifact 依赖图/);
  assert.match(skills["openspec-full-apply"], /missingArtifacts/);
  assert.match(skills["openspec-full-apply"], /state: all_done/);
  assert.match(skills["openspec-full-apply"], /Score 风险确认/);
  assert.match(skills["openspec-full-apply"], /实现卡片/);
  assert.match(skills["openspec-full-apply"], /文件所有权/);
  assert.match(skills["openspec-full-apply"], /openspec_task_implementation_reviewer/);
  assert.match(skills["openspec-full-apply"], /openspec-task-implementation-reviewer/);
  assert.match(skills["openspec-full-tdd"], /contextFiles/);
  assert.match(skills["openspec-full-archive"], /existingOutputPaths/);
  assert.match(skills["openspec-full-archive"], /前台同步执行/);
  assert.match(skills["openspec-full-archive"], /changeRoot/);
  assert.equal(extension.requirements.openspec, ">=1.8.0");
});

test("records low planning scores as an explicit user decision instead of a hard apply gate", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["codex"], validate: false });

  const applySkill = readFileSync(
    join(project, ".agents", "skills", "openspec-full-apply", "SKILL.md"),
    "utf8",
  );
  const decisionTemplate = readFileSync(
    join(project, "openspec", "schemas", "full-check", "templates", "apply-decision.md"),
    "utf8",
  );
  const reviewer = readFileSync(
    join(
      project,
      ".codex",
      "agents",
      "openspec-task-implementation-reviewer.toml",
    ),
    "utf8",
  );

  assert.match(applySkill, /接受列出的规划风险并继续实现/);
  assert.doesNotMatch(applySkill, /不能由人工确认绕过/);
  assert.match(applySkill, /不得修改独立 Reviewer 生成的 score\.md/);
  assert.match(applySkill, /score 文件 SHA-256/);
  assert.match(decisionTemplate, /decision: pending/);
  assert.match(decisionTemplate, /score_sha256:/);
  assert.match(decisionTemplate, /accepted_risks: \[\]/);
  assert.match(reviewer, /pass、must-fix 或 blocked/);
  assert.match(reviewer, /不得修改代码、测试、spec、design、tasks/);
});

test("keeps every Claude reviewer technically read-only", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["claude"], validate: false });

  const agentRoot = join(project, ".claude", "agents");
  const agents = readdirSync(agentRoot)
    .filter((name) => name.endsWith(".md"))
    .map((name) => readFileSync(join(agentRoot, name), "utf8"));

  assert.ok(agents.length > 0);
  for (const agent of agents) {
    assert.match(agent, /^tools: Read, Grep, Glob$/m);
    assert.match(agent, /^permissionMode: plan$/m);
    assert.doesNotMatch(agent, /^tools:.*\bBash\b/m);
  }
});

test("documents a safe independent-review fallback for shared skills", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["shared-agents"], validate: false });
  const applySkill = readFileSync(
    join(project, ".agents", "skills", "openspec-full-apply", "SKILL.md"),
    "utf8",
  );

  assert.match(applySkill, /命名 Reviewer 未安装/);
  assert.match(applySkill, /仅有读取\/搜索权限的通用子 Agent/);
  assert.match(applySkill, /不得静默把主 Agent 自评伪装成独立评审/);
});

test("requires subagent completion before Score or Apply may advance", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["codex"], validate: false });
  const skillRoot = join(project, ".agents", "skills");
  const scoreSkill = readFileSync(join(skillRoot, "openspec-full-score", "SKILL.md"), "utf8");
  const applySkill = readFileSync(join(skillRoot, "openspec-full-apply", "SKILL.md"), "utf8");

  assert.match(scoreSkill, /阻塞等待/);
  assert.match(scoreSkill, /不得在有未终态句柄时结束主回合/);
  assert.match(scoreSkill, /fire-and-forget/);
  assert.match(applySkill, /任务台账/);
  assert.match(applySkill, /不得结束主回合、输出最终答复、勾选任务、派发下一批或启动 Reviewer/);
  assert.match(applySkill, /任何委派句柄未终态时，主 Agent 不得结束本轮/);
});

test("installs every Codex agent with medium reasoning effort", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["codex"], validate: false });

  const agentRoot = join(project, ".codex", "agents");
  const agents = readdirSync(agentRoot)
    .filter((name) => name.endsWith(".toml"))
    .map((name) => readFileSync(join(agentRoot, name), "utf8"));

  assert.ok(agents.length > 0);
  for (const agent of agents) {
    assert.match(agent, /model_reasoning_effort = "medium"/);
    assert.doesNotMatch(agent, /model_reasoning_effort = "high"/);
  }
});

test("reinstall is idempotent", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["codex"], validate: false });
  const second = installOrUpdate({
    project,
    tools: ["codex"],
    validate: false,
    requireInstalled: true,
  });

  assert.equal(second.writes.length, 0);
  assert.ok(second.unchanged.length > 10);
  assert.equal(second.removals.length, 0);
});

test("refuses to overwrite a modified managed file unless forced", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["codex"], validate: false });
  const target = join(project, ".codex", "agents", "openspec-code-reviewer.toml");
  writeFileSync(target, `${readFileSync(target, "utf8")}\n# local edit\n`, "utf8");

  assert.throws(
    () =>
      installOrUpdate({
        project,
        tools: ["codex"],
        validate: false,
        requireInstalled: true,
      }),
    /Refusing to overwrite/,
  );

  const forced = installOrUpdate({
    project,
    tools: ["codex"],
    validate: false,
    requireInstalled: true,
    force: true,
  });
  assert.ok(forced.writes.includes(".codex/agents/openspec-code-reviewer.toml"));
  const backups = join(project, ".openspec-extensions", "full-check", "backups");
  assert.ok(readdirSync(backups).length >= 1);
});

test("uninstall preserves locally modified files and records a partial uninstall", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["codex"], validate: false });
  const target = join(
    project,
    ".agents",
    "skills",
    "openspec-full-score",
    "SKILL.md",
  );
  writeFileSync(target, `${readFileSync(target, "utf8")}\nLocal note.\n`, "utf8");

  const result = uninstall({ project });
  assert.deepEqual(result.preserved, [".agents/skills/openspec-full-score/SKILL.md"]);
  assert.ok(existsSync(target));
  assert.equal(manifest(project).status, "partial-uninstall");
  assert.equal(manifest(project).files.length, 1);
});

test("doctor detects missing and modified managed files", () => {
  const project = fixture();
  installOrUpdate({ project, tools: ["codex"], validate: false });
  const modified = join(project, ".codex", "agents", "openspec-prd-architect.toml");
  writeFileSync(modified, "changed\n", "utf8");
  const missing = join(project, ".codex", "agents", "openspec-code-reviewer.toml");
  rmSync(missing);

  const result = doctor({ project, validate: false });
  assert.deepEqual(result.modified, [".codex/agents/openspec-prd-architect.toml"]);
  assert.deepEqual(result.missing, [".codex/agents/openspec-code-reviewer.toml"]);
});

test("installed schema passes the available OpenSpec CLI validator", () => {
  const project = fixture();
  const result = installOrUpdate({ project, tools: ["codex"], validate: true });
  assert.ok(result.validation, "expected openspec or openspec-cn to be available in this environment");
  assert.match(result.validation.command, /^openspec(?:-cn)?$/);
  assert.match(result.validation.version, /^\d+\.\d+\.\d+$/);
});

test("fails before writing when no compatible OpenSpec CLI is available", () => {
  const project = fixture();
  const executable = new URL("../bin/openspec-full-check.mjs", import.meta.url);
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(executable), "install", "--project", project, "--tools", "codex"],
    {
      encoding: "utf8",
      env: { ...process.env, PATH: "" },
    },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /OpenSpec or OpenSpec-CN 1\.8\.0 or later is required/);
  assert.equal(existsSync(join(project, ".openspec-extensions")), false);
});

test("runs a real full-check change through OpenSpec status resolution", () => {
  const project = fixture();
  const installed = installOrUpdate({ project, tools: ["codex"], validate: true });
  const command = installed.validation.command;
  const created = runOpenSpec(
    command,
    ["new", "change", "workflow-smoke", "--schema", "full-check", "--json"],
    project,
  );
  assert.equal(created.status, 0, created.stderr || created.stdout);

  const status = runOpenSpec(
    command,
    ["status", "--change", "workflow-smoke", "--json"],
    project,
  );
  assert.equal(status.status, 0, status.stderr || status.stdout);
  const state = JSON.parse(status.stdout);
  assert.equal(state.schemaName, "full-check");
  assert.deepEqual(state.applyRequires, ["score"]);
  assert.equal(state.artifacts[0].id, "prd-review");
  assert.equal(state.artifacts[0].status, "ready");
  assert.equal(state.artifacts.at(-1).id, "score");
});

test("refuses install targets that traverse a linked project directory", (t) => {
  const project = fixture();
  const outside = mkdtempSync(join(tmpdir(), "openspec-full-check-outside-"));
  try {
    symlinkSync(outside, join(project, ".agents"), "junction");
  } catch (error) {
    t.skip(`symbolic links unavailable: ${error.message}`);
    return;
  }
  assert.throws(
    () => installOrUpdate({ project, tools: ["shared-agents"], validate: false }),
    /Refusing linked path inside project/,
  );
});
