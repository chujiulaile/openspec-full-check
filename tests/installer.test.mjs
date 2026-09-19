import assert from "node:assert/strict";
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { doctor, installOrUpdate, uninstall } from "../src/installer.mjs";

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
    existsSync(join(project, ".claude", "commands", "opsx-full", "score.md")),
  );
  assert.deepEqual(manifest(project).tools, ["claude", "codex"]);
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
});
