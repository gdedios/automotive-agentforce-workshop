# Workflow & Patterns — Electra Automotive Workshop

> **Populated continuously.** Each phase ends with a "what choreography worked / what didn't" entry. Phase 11 harvests this into the skill's portable phase-template.
>
> The audience for this file is **a future Claude orchestrating the next industry workshop**. Write so a cold-started Opus can read this and choreograph Phase 0–12 without re-deriving the patterns.

---

## The choreography (target shape — refine as we execute)

```
Phase 0  ▸ Opus solo                                   scaffold + brand file + skill stubs
Phase 1  ▸ Opus solo                                   auth + Atlas verify
Phase 2  ▸ ▶︎3 Sonnet authoring + Opus deploy           metadata foundation
Phase 3  ▸ ▶︎3 Sonnet authoring + Opus deploy           flows
Phase 4  ▸ ▶︎3 Sonnet authoring + Opus deploy           Apex seeder/reset/tests
Phase 4.5▸ ▶︎1 Sonnet                                   flow integration smoke test
Phase 5  ▸ Opus or adlc-orchestrator                   agent authoring (sequential)
Phase 6a ▸ ▶︎3 Sonnet  (parallel with Phase 5)          PDF authoring
Phase 6b ▸ Opus solo                                   Data Library wiring (sequential UI)
Phase 6c ▸ Opus solo                                   table-RAG battery
Phase 7  ▸ ▶︎1 Sonnet + Opus audit                      Experience Cloud + MIAW (sequential)
Phase 8  ▸ Opus draft + ▶︎5 Sonnet review              Guía
Phase 9  ▸ ▶︎5 Sonnet capture + Opus triage            drift round 1 (per-ejercicio Chrome profiles)
Phase 10 ▸ ▶︎2 Sonnet                                   cleanup + handoff
Phase 11 ▸ Opus solo                                   skill harvest
Phase 12 ▸ Opus solo                                   org cleanup + final commit
```

## Patterns we expect to memorialize

### Disjoint-folder fan-out
Two parallel Sonnet subagents must not write to the same file or directory. Phase 2 uses three folders (`objects/`, `permissionsets/+applications/+tabs/`, `flexipages/`). Phase 9 uses per-ejercicio `docs/drift-ej{N}.md`.

### Compression-doc handoff
Each phase ends with a `<2KB` `docs/COMPRESSION_phaseN_to_phaseN+1.md`. Captures: org alias, IDs, decisions made, blockers, `[SKILL-CANDIDATE]` lines. The next Opus session reads only that file, not the full transcript.

### Subagent prompt skeleton
See `CLAUDE.md` section 3. Every subagent prompt has: budget, exact folder, exact validation cmd, mandatory `subagent-report.md` output, "do not deploy", 3-strike rule.

### Opus audit before declaring success
Read `git diff --stat`, then read at least one of the actual XML/`.cls`/`.flow-meta.xml` files. Never trust subagent summaries.

### Sequential single-thread phases
- **Phase 5** (agent authoring) — single-threaded because of `.agent` topic ordering, action wiring, AQWK gotcha
- **Phase 6b** (Data Library wiring) — single-threaded UI clicks because of `@knowledge.rag_feature_config_id` resolution
- **Phase 7** (Experience Cloud + MIAW) — single-threaded because of LWR htmlEditor sanitization + Site Builder UI chrome

### Continuous skill-extraction
Every compression doc and every learning ends with `## [SKILL-CANDIDATE]` lines. Phase 11 harvests, doesn't synthesize from scratch.

## Per-phase notes (populate as we execute)

<!-- Phase 1 — what worked, what regressed, what to add to skill -->

<!-- Phase 2 — fan-out outcomes -->

<!-- Phase 3 -->

<!-- Phase 4 -->

<!-- Phase 4.5 -->

<!-- Phase 5 -->

<!-- Phase 6 -->

<!-- Phase 7 -->

<!-- Phase 8 -->

<!-- Phase 9 -->

<!-- Phase 10 -->
