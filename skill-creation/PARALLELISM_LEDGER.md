# Parallelism Ledger — Electra Automotive Workshop

> **Populated continuously.** Each phase that uses fan-out logs the actual outcome. Phase 11 transforms the table into the skill's `assets/parallelism-ledger.md`.
>
> The point of this file: future Claude orchestrating the next industry workshop reads this to know which phases parallelize *cleanly* vs which collapsed back to sequential and *why*.

---

## Ledger

| Phase | Planned fan-out | Subagents launched | Disjoint folders held? | Wall-time savings vs sequential | Regressions caught later | Verdict |
|---|---|---|---|---|---|---|
| 0 | 1 (Opus solo) | n/a | n/a | n/a | n/a | (Phase 0 in flight) |
| 1 | 1 (Opus solo) | n/a | n/a | n/a | n/a | (pending) |
| 2 | 3 (objects / permset+app+tabs / flexipage) | | | | | (pending) |
| 3 | 3 (read flows / write flows / screen flows) | | | | | (pending) |
| 4 | 3 (seeder / reset / tests) | | | | | (pending) |
| 4.5 | 1 (smoke) | | | | | (pending) |
| 5 | 1 (sequential — agent authoring) | | | | | (pending) |
| 6a | 3 (3 PDFs) | | | | | (pending) |
| 6b | 1 (sequential — Data Library wiring) | | | | | (pending) |
| 6c | 1 (Opus solo — table-RAG battery) | | | | | (pending) |
| 7 | 1 (sequential — Experience Cloud + MIAW) | | | | | (pending) |
| 8 | 1 draft + 5 review | | | | | (pending) |
| 9 | 5 (per-ejercicio drift) | | | | | (pending) |
| 10 | 2 (manifest+install / handoff) | | | | | (pending) |
| 11 | 1 (Opus solo — skill harvest) | | | | | (pending) |
| 12 | 1 (Opus solo — org cleanup) | | | | | (pending) |

---

## Anti-patterns to memorialize (populate when we hit them)

### Concurrent metadata deploy attempts
- **Triggering condition:** Multiple subagents try to `sf project deploy start` against the same org
- **Why it fails:** SFDX serializes deploys server-side; client side it returns `(active deployment in progress)` errors. Worse: subagents disagree on `package.xml` state.
- **Fix:** Subagents NEVER deploy. Opus is the only deployer. Sequential, after fan-out completes.

### Two subagents writing to the same `package.xml`
- **Triggering condition:** Sonnet A adds `Vehicle_Model__c` to `<types>`; Sonnet B adds `Electra_FAQ_Library` at the same time. Last writer wins → first writer's entry vanishes.
- **Fix:** `package.xml` is **always** finalized by Opus, after subagent reports come back. Subagents append to a per-folder `.partial.xml` snippet that Opus merges.

### `aiAuthoringBundle` + same-time edits
- **Triggering condition:** Two flows being written into the same `.agent` topics block
- **Why it fails:** `.agent` YAML is a single document; concurrent edits clobber one another
- **Fix:** Phase 5 stays sequential. Always.

### Per-ejercicio drift fan-out using the SAME Chrome profile
- **Triggering condition:** All 5 Sonnets in Phase 9 use `/tmp/chrome-claude-profile`
- **Why it fails:** Chrome refuses to launch a second instance against the same profile dir; persistent-context state (Setup nav, dismissed popups) clobbers across ejercicios
- **Fix:** Per-ejercicio profile dir: `/tmp/chrome-electra-ej0`, `ej1`, `ej2`, `ej3`, `ej4`. Already in `.gitignore`.

### Spanish-prose drift across parallel reviewers
- **Triggering condition:** Phase 8 5-Sonnet review where each reviewer brings their own register (one drifts to "vos", one to neutral, one to formal)
- **Fix:** All 5 reviewers receive the same `STYLE_GUIDE.md` + `GLOSSARY.md` snippet. Opus does a final flatten pass.

### Subagent re-entering folder another subagent already wrote
- **Triggering condition:** Sonnet B finishes early, gets idle, "helps" Sonnet A's folder
- **Fix:** Hard rule in subagent prompt: "Write ONLY to `<exact path>`. Touching anything else = strike-2 BLOCKER.md."
