# OpenSpec Full Check

An installable OpenSpec community workflow for complex changes:

```text
prd-review → propose → score → apply → tdd → archive
```

The default OpenSpec `spec-driven` workflow is left untouched. This package installs a project-local `full-check` schema, collision-free `openspec-full-*` skills, and optional Codex/Claude reviewer agents.

## Install

The target project must already contain `openspec/config.yaml` or `openspec/config.yml`.

```bash
npx openspec-full-check install --project . --tools codex,claude
```

During local development:

```bash
node bin/openspec-full-check.mjs install --project ../my-project --tools codex,claude
```

Supported tools:

- `codex`: installs shared skills under `.agents/skills/` and Codex agents under `.codex/agents/`.
- `claude`: installs Claude skills, commands, and agents.
- `shared-agents`: installs only vendor-neutral `.agents/skills/`.

If `--tools` is omitted, the installer detects existing `.codex` and `.claude` directories; when neither exists it defaults to `codex`.

## Commands

```bash
openspec-full-check install --project . --tools codex,claude
openspec-full-check update --project .
openspec-full-check doctor --project .
openspec-full-check uninstall --project .
```

Use `--dry-run` to preview writes and `--force` only after reviewing reported conflicts. Modified installed files are never overwritten or removed by default. The installer tracks hashes in `.openspec-extensions/full-check/manifest.json` and backs up overwritten files.

## Invoke

Codex:

```text
$openspec-full-prd-review <change> <PRD>
$openspec-full-propose <change>
$openspec-full-score <change>
$openspec-full-apply <change>
$openspec-full-tdd <change>
$openspec-full-archive <change>
```

Claude Code:

```text
/opsx-full:prd-review <change> <PRD>
/opsx-full:propose <change>
/opsx-full:score <change>
/opsx-full:apply <change>
/opsx-full:tdd <change>
/opsx-full:archive <change>
```

Restart the AI coding tool after installation so it can rescan skills and agents.

## Development

```bash
npm test
npm run check
npm run pack:dry-run
```

The package has no runtime dependencies and requires Node.js 20 or newer.
