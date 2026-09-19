import { createHash } from "node:crypto";
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const BUNDLE_ROOT = join(PACKAGE_ROOT, "bundle");
const PACKAGE_JSON = JSON.parse(readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"));
const MANIFEST_RELATIVE = ".openspec-extensions/full-check/manifest.json";
const SUPPORTED_TOOLS = new Set(["codex", "claude", "shared-agents"]);

function slash(path) {
  return path.split(sep).join("/");
}

function hash(content) {
  return createHash("sha256").update(content).digest("hex");
}

function readBuffer(path) {
  return readFileSync(path);
}

function listFiles(root) {
  if (!existsSync(root)) return [];
  const result = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(path));
    else if (entry.isFile()) result.push(path);
  }
  return result.sort();
}

function assertProject(project) {
  const configYaml = join(project, "openspec", "config.yaml");
  const configYml = join(project, "openspec", "config.yml");
  if (!existsSync(configYaml) && !existsSync(configYml)) {
    throw new Error(
      `OpenSpec is not initialized at ${project}. Run 'openspec init' (or 'openspec-cn init') first.`,
    );
  }
}

function safeTarget(project, relativePath) {
  const target = resolve(project, relativePath);
  const prefix = `${resolve(project)}${sep}`;
  if (!target.startsWith(prefix)) {
    throw new Error(`Refusing path outside project: ${relativePath}`);
  }
  return target;
}

function addTree(files, sourceRoot, destinationRoot) {
  for (const source of listFiles(sourceRoot)) {
    const nested = slash(relative(sourceRoot, source));
    const destination = slash(join(destinationRoot, nested));
    files.set(destination, { source, content: readBuffer(source) });
  }
}

function detectTools(project) {
  const tools = [];
  if (existsSync(join(project, ".codex"))) tools.push("codex");
  if (existsSync(join(project, ".claude"))) tools.push("claude");
  return tools.length ? tools : ["codex"];
}

function normalizeTools(tools) {
  const unique = [...new Set(tools)];
  for (const tool of unique) {
    if (!SUPPORTED_TOOLS.has(tool)) {
      throw new Error(`Unsupported tool '${tool}'. Choose codex, claude, or shared-agents.`);
    }
  }
  return unique.sort();
}

function buildDesiredFiles(project, tools) {
  const files = new Map();
  addTree(files, join(BUNDLE_ROOT, "schema", "full-check"), "openspec/schemas/full-check");
  addTree(files, join(BUNDLE_ROOT, "docs"), "openspec");

  if (tools.includes("codex") || tools.includes("shared-agents")) {
    addTree(files, join(BUNDLE_ROOT, "skills"), ".agents/skills");
  }
  if (tools.includes("codex")) {
    addTree(files, join(BUNDLE_ROOT, "adapters", "codex", "agents"), ".codex/agents");
  }
  if (tools.includes("claude")) {
    addTree(files, join(BUNDLE_ROOT, "skills"), ".claude/skills");
    addTree(files, join(BUNDLE_ROOT, "adapters", "claude", "agents"), ".claude/agents");
    addTree(
      files,
      join(BUNDLE_ROOT, "adapters", "claude", "commands"),
      ".claude/commands",
    );
  }

  for (const destination of files.keys()) safeTarget(project, destination);
  return files;
}

function manifestPath(project) {
  return safeTarget(project, MANIFEST_RELATIVE);
}

function readManifest(project, required = false) {
  const path = manifestPath(project);
  if (!existsSync(path)) {
    if (required) throw new Error("Full-check is not installed in this project.");
    return null;
  }
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    throw new Error(`Cannot parse ${MANIFEST_RELATIVE}: ${error.message}`);
  }
}

function timestamp() {
  return new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
}

function backupFile(project, relativePath, backupRoot) {
  const source = safeTarget(project, relativePath);
  if (!existsSync(source)) return;
  const target = safeTarget(project, slash(join(backupRoot, relativePath)));
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, readBuffer(source));
}

function pruneEmptyParents(project, filePath) {
  let current = dirname(filePath);
  const projectRoot = resolve(project);
  while (current.startsWith(`${projectRoot}${sep}`) && current !== projectRoot) {
    if (readdirSync(current).length) break;
    rmdirSync(current);
    current = dirname(current);
  }
}

function validateSchema(project) {
  const candidates = ["openspec-cn", "openspec"];
  const run = (command, args) => {
    if (process.platform === "win32") {
      return spawnSync(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", `${command}.cmd`, ...args], {
        cwd: project,
        encoding: "utf8",
        shell: false,
      });
    }
    return spawnSync(command, args, { cwd: project, encoding: "utf8", shell: false });
  };
  for (const command of candidates) {
    const probe = run(command, ["--version"]);
    if (probe.status !== 0) continue;
    const result = run(command, ["schema", "validate", "full-check"]);
    if (result.status !== 0) {
      const details = (result.stderr || result.stdout || "unknown validation error").trim();
      throw new Error(`${command} rejected the installed schema: ${details}`);
    }
    return { command, output: result.stdout.trim() };
  }
  return null;
}

function planBundle(project, tools, previous, force) {
  const desired = buildDesiredFiles(project, tools);
  const previousByPath = new Map((previous?.files || []).map((entry) => [entry.path, entry]));
  const writes = [];
  const unchanged = [];
  const conflicts = [];
  const removals = [];
  const preserved = [];

  for (const [path, file] of desired) {
    const target = safeTarget(project, path);
    const desiredHash = hash(file.content);
    if (!existsSync(target)) {
      writes.push({ path, ...file, sha256: desiredHash, reason: "new" });
      continue;
    }

    const currentHash = hash(readBuffer(target));
    if (currentHash === desiredHash) {
      unchanged.push({ path, source: file.source, sha256: desiredHash });
      continue;
    }

    const prior = previousByPath.get(path);
    const managedAndUnmodified = prior && prior.sha256 === currentHash;
    if (managedAndUnmodified || force) {
      writes.push({
        path,
        ...file,
        sha256: desiredHash,
        reason: managedAndUnmodified ? "update" : "forced",
      });
    } else {
      conflicts.push(path);
    }
  }

  for (const prior of previous?.files || []) {
    if (desired.has(prior.path)) continue;
    const target = safeTarget(project, prior.path);
    if (!existsSync(target)) continue;
    const currentHash = hash(readBuffer(target));
    if (currentHash === prior.sha256 || force) removals.push(prior.path);
    else preserved.push({ ...prior, preserved: true });
  }

  return { desired, writes, unchanged, conflicts, removals, preserved };
}

export function installOrUpdate({
  project = process.cwd(),
  tools,
  force = false,
  dryRun = false,
  validate = true,
  requireInstalled = false,
} = {}) {
  project = resolve(project);
  assertProject(project);
  const previous = readManifest(project, requireInstalled);
  const selectedTools = normalizeTools(
    tools?.length ? tools : previous?.tools?.length ? previous.tools : detectTools(project),
  );
  const plan = planBundle(project, selectedTools, previous, force);

  if (plan.conflicts.length) {
    throw new Error(
      `Refusing to overwrite ${plan.conflicts.length} unmanaged or modified file(s):\n- ${plan.conflicts.join("\n- ")}\nUse --force only after reviewing these files.`,
    );
  }

  const summary = {
    project,
    tools: selectedTools,
    writes: plan.writes.map((item) => item.path),
    unchanged: plan.unchanged.map((item) => item.path),
    removals: plan.removals,
    preserved: plan.preserved.map((item) => item.path),
    dryRun,
  };
  if (dryRun) return summary;

  const backupRoot = slash(
    join(".openspec-extensions", "full-check", "backups", timestamp()),
  );
  for (const item of plan.writes) {
    const target = safeTarget(project, item.path);
    if (existsSync(target)) backupFile(project, item.path, backupRoot);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, item.content);
  }
  for (const path of plan.removals) {
    const target = safeTarget(project, path);
    if (!existsSync(target)) continue;
    backupFile(project, path, backupRoot);
    rmSync(target);
    pruneEmptyParents(project, target);
  }

  const manifestFiles = [];
  for (const [path, file] of plan.desired) {
    const target = safeTarget(project, path);
    manifestFiles.push({
      path,
      sha256: hash(readBuffer(target)),
      source: slash(relative(PACKAGE_ROOT, file.source)),
    });
  }
  manifestFiles.push(...plan.preserved);
  manifestFiles.sort((a, b) => a.path.localeCompare(b.path));

  const manifest = {
    name: PACKAGE_JSON.name,
    version: PACKAGE_JSON.version,
    schema: "full-check",
    installedAt: new Date().toISOString(),
    tools: selectedTools,
    files: manifestFiles,
  };
  const targetManifest = manifestPath(project);
  mkdirSync(dirname(targetManifest), { recursive: true });
  writeFileSync(targetManifest, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

  if (validate) summary.validation = validateSchema(project);
  return summary;
}

export function doctor({ project = process.cwd(), validate = true } = {}) {
  project = resolve(project);
  assertProject(project);
  const manifest = readManifest(project, true);
  const missing = [];
  const modified = [];
  const ok = [];
  for (const entry of manifest.files || []) {
    const target = safeTarget(project, entry.path);
    if (!existsSync(target)) missing.push(entry.path);
    else if (hash(readBuffer(target)) !== entry.sha256) modified.push(entry.path);
    else ok.push(entry.path);
  }
  const result = { project, version: manifest.version, tools: manifest.tools, ok, missing, modified };
  if (validate && !missing.some((path) => path.startsWith("openspec/schemas/full-check/"))) {
    result.validation = validateSchema(project);
  }
  return result;
}

export function uninstall({ project = process.cwd(), force = false, dryRun = false } = {}) {
  project = resolve(project);
  const manifest = readManifest(project, true);
  const removals = [];
  const preserved = [];
  for (const entry of manifest.files || []) {
    const target = safeTarget(project, entry.path);
    if (!existsSync(target)) continue;
    const currentHash = hash(readBuffer(target));
    if (currentHash === entry.sha256 || force) removals.push(entry);
    else preserved.push({ ...entry, preserved: true });
  }
  const summary = {
    project,
    removals: removals.map((item) => item.path),
    preserved: preserved.map((item) => item.path),
    dryRun,
  };
  if (dryRun) return summary;

  const backupRoot = slash(
    join(".openspec-extensions", "full-check", "backups", `uninstall-${timestamp()}`),
  );
  for (const entry of removals) {
    const target = safeTarget(project, entry.path);
    if (force && hash(readBuffer(target)) !== entry.sha256) {
      backupFile(project, entry.path, backupRoot);
    }
    rmSync(target);
    pruneEmptyParents(project, target);
  }

  const targetManifest = manifestPath(project);
  if (preserved.length) {
    const partial = {
      ...manifest,
      status: "partial-uninstall",
      updatedAt: new Date().toISOString(),
      files: preserved,
    };
    writeFileSync(targetManifest, `${JSON.stringify(partial, null, 2)}\n`, "utf8");
  } else {
    rmSync(targetManifest);
    pruneEmptyParents(project, targetManifest);
  }
  return summary;
}

function parseArgs(argv) {
  const options = { command: argv[0] || "help", validate: true };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--project") options.project = argv[++index];
    else if (arg === "--tools") options.tools = argv[++index].split(",").filter(Boolean);
    else if (arg === "--force") options.force = true;
    else if (arg === "--dry-run") options.dryRun = true;
    else if (arg === "--no-validate") options.validate = false;
    else if (arg === "--help" || arg === "-h") options.command = "help";
    else if (arg === "--version" || arg === "-V") options.command = "version";
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (options.project === undefined) options.project = process.cwd();
  return options;
}

function printSummary(action, result) {
  console.log(`${action}: ${result.project}`);
  if (result.tools) console.log(`Tools: ${result.tools.join(", ")}`);
  if (result.writes) console.log(`Write: ${result.writes.length}`);
  if (result.unchanged) console.log(`Unchanged: ${result.unchanged.length}`);
  if (result.removals) console.log(`Remove: ${result.removals.length}`);
  if (result.preserved?.length) {
    console.log(`Preserved modified files: ${result.preserved.length}`);
    for (const path of result.preserved) console.log(`  - ${path}`);
  }
  if (result.missing) console.log(`Missing: ${result.missing.length}`);
  if (result.modified) console.log(`Modified: ${result.modified.length}`);
  if (result.validation) console.log(`Schema validation: ${result.validation.command} OK`);
  else if (action !== "uninstall") console.log("Schema validation: CLI not found or disabled");
  if (result.dryRun) console.log("Dry run: no files changed");
}

function usage() {
  return `OpenSpec Full Check ${PACKAGE_JSON.version}

Usage:
  openspec-full-check install [--project <path>] [--tools codex,claude] [--dry-run] [--force]
  openspec-full-check update [--project <path>] [--tools codex,claude] [--dry-run] [--force]
  openspec-full-check doctor [--project <path>] [--no-validate]
  openspec-full-check uninstall [--project <path>] [--dry-run] [--force]

The project must already be initialized with OpenSpec. Modified files are preserved unless --force is supplied.`;
}

export async function runCli(argv) {
  const options = parseArgs(argv);
  if (options.command === "help") return console.log(usage());
  if (options.command === "version") return console.log(PACKAGE_JSON.version);
  if (options.command === "install") {
    const result = installOrUpdate(options);
    printSummary("install", result);
    return;
  }
  if (options.command === "update") {
    const result = installOrUpdate({ ...options, requireInstalled: true });
    printSummary("update", result);
    return;
  }
  if (options.command === "doctor") {
    const result = doctor(options);
    printSummary("doctor", result);
    if (result.missing.length || result.modified.length) process.exitCode = 2;
    return;
  }
  if (options.command === "uninstall") {
    const result = uninstall(options);
    printSummary("uninstall", result);
    if (result.preserved.length) process.exitCode = 2;
    return;
  }
  throw new Error(`Unknown command '${options.command}'.\n\n${usage()}`);
}
