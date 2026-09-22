# Changelog

## 0.1.2

- Make PRD review checks conditional on product elements actually present in the source material, avoiding invented state, permission, migration, or concurrency requirements.
- Require the planning score coordinator to keep waiting for its independent reviewer, persist the score, refresh status, and report the result in one continuous run.

## 0.1.1

- Strengthen the planning reviewer with source inventory, bidirectional requirement tracing, semantic AGENTS.md checks, minimal clarification questions, and implementation/acceptance readiness gates.
- Expand the score workflow and report template so product decisions, project constraints, code facts, tasks, and verification evidence remain traceable.
- Rebase all six Full-check skills on OpenSpec's root/store and authoritative-path contracts; make Propose, Apply, and Archive behavioral supersets of the standard workflows while retaining PRD, Score, review, TDD, and verified delta-sync gates.
- Raise the OpenSpec requirement to 1.8.0 because the completed workflows rely on the current `context`, store-aware instructions, action context, and archive guidance contracts.
- Change planning score from a non-bypassable numeric gate to an explicit user risk decision: revise planning, accept documented risk and continue, or cancel.
- Add dependency-aware implementation cards, AGENTS.md rule routing, conflict-safe agent batches, and one independent task implementation reviewer per batch before the coordinator checks tasks off.
- Set every bundled Codex reviewer and architect to medium reasoning effort for a better latency/cost balance.
- Keep score evidence immutable by recording low-score user authorization in a separately hashed apply-decision artifact.
- Add a portable reviewer fallback for shared-agent installs and enforce read-only Claude reviewer permissions.
- Preserve OpenSpec's conditional design behavior without letting unrelated blocked dependencies be bypassed.
- Enforce OpenSpec 1.8.0 compatibility, reject linked install targets, add operational report templates, and strengthen release checks.

## 0.1.0

- Initial distributable full-check schema.
- Six collision-free `openspec-full-*` workflow skills.
- Codex and Claude Code reviewer agents.
- Idempotent install, update, doctor, and safe uninstall commands.
