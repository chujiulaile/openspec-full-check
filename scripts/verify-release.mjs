import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const json = (path) => JSON.parse(readFileSync(join(root, path), "utf8"));
const pkg = json("package.json");
const lock = json("package-lock.json");
const extension = json("extension.json");
const expected = pkg.version;
const errors = [];

if (lock.version !== expected || lock.packages?.[""]?.version !== expected) {
  errors.push("package-lock.json version does not match package.json");
}
if (extension.version !== expected) errors.push("extension.json version does not match package.json");

const read = (path) => readFileSync(join(root, path), "utf8");
const readme = read("README.md");
for (const marker of [`#v${expected}`, `v${expected} Release`, `openspec-full-check-${expected}.tgz`]) {
  if (!readme.includes(marker)) errors.push(`README.md is missing current release marker: ${marker}`);
}

const tag = process.env.GITHUB_REF_NAME;
if (tag?.startsWith("v") && tag !== `v${expected}`) {
  errors.push(`tag ${tag} does not match package version v${expected}`);
}

const claudeAgents = join(root, "bundle", "adapters", "claude", "agents");
for (const name of readdirSync(claudeAgents)) {
  const content = readFileSync(join(claudeAgents, name), "utf8");
  if (/^tools:.*\bBash\b/m.test(content)) errors.push(`${name} grants Bash to a read-only reviewer`);
  if (!/^permissionMode: plan$/m.test(content)) errors.push(`${name} lacks permissionMode: plan`);
}

for (const path of [
  "bundle/schema/full-check/templates/apply-decision.md",
  "bundle/schema/full-check/templates/tdd-report.md",
]) {
  if (!existsSync(join(root, path))) errors.push(`missing packaged operational template: ${path}`);
}

for (const path of [
  "bundle/skills/openspec-full-apply/SKILL.md",
  "bundle/skills/openspec-full-tdd/SKILL.md",
  "bundle/skills/openspec-full-archive/SKILL.md",
]) {
  if (read(path).includes("不能由人工确认绕过")) {
    errors.push(`${path} still contains the obsolete score gate`);
  }
}

if (errors.length) throw new Error(`Release verification failed:\n- ${errors.join("\n- ")}`);
console.log(`Release metadata and bundle verified for v${expected}.`);
