# Model Switch Boundaries — Electra Automotive Workshop

> **Populated continuously.** As we hit "this should be Sonnet" or "this needs Opus" moments, append here. Phase 11 harvests into the skill's `assets/model-switch-boundaries.md`.
>
> The point: future Claude orchestrating the next workshop has a concrete decision rule for each task type, not a vague heuristic.

---

## The decision rule (target form — refine as we execute)

A task should run on **Sonnet 4.6** when ALL of these hold:
- The task has a clearly bounded folder/file scope
- The task has a deterministic validation command (XML-lints, schema-validates, deploys, executes)
- The task does not require deciding *what* should be built — only *how* to author what was decided
- The output is reviewable by Opus in `<2 minutes` of `git diff` reading

A task should run on **Opus 4.7** when ANY of these hold:
- The task involves Spanish prose generation longer than ~300 words (register, voice, persona consistency)
- The task involves brand-decision making (color, voice, persona detail, demo theme selection)
- The task is multi-file orchestration with cross-file invariants (manifest order, deploy sequence, agent topic + flow + permset coherence)
- The task is auditing + accepting subagent output
- The task is the AQWK Builder commit dance (UI-click sequence with branching error recovery)

A task should use **`adlc-orchestrator`** subagent when:
- The task is full agent authoring (Phase 5) — the subagent auto-loads `developing-agentforce`, `sf-ai-agentscript`, `testing-agentforce`
- The task is `aiEvaluationDefinition` authoring — same skill bundle applies
- The task involves `sf agent generate authoring-bundle` + iterative `sf agent preview`

A task should NOT be subagent-fanned-out when:
- The task is sequential UI clicks (Phase 6b Data Library wiring, Phase 7 Site Builder)
- The task has shared-state failure modes (concurrent `sf project deploy`, same-file edits)
- The task is the actual deploy itself
- The task is final commit + alias cleanup

---

## Concrete signals (table form)

| Task type | Right model | Why |
|---|---|---|
| `*.object-meta.xml` authoring (5+ fields) | Sonnet | Bounded folder, `xmllint` validates, no brand decisions |
| `*.flow-meta.xml` authoring | Sonnet | Same — but Opus reviews FK validation logic in write flows |
| `*.cls` authoring + `*_Test.cls` | Sonnet | Bounded class, `sf project deploy validate` validates |
| `*.permissionset-meta.xml` authoring | Sonnet | Bounded, schema-validates |
| `*.app-meta.xml` + flexipage | Sonnet | Pattern is rote; just use v2 shape |
| `package.xml` finalization | Opus | Cross-file invariants — deploy order matters |
| `.agent` topic + action authoring | Opus or `adlc-orchestrator` | Cross-file (flow refs, permset refs, AQWK gotcha) |
| Spanish prose for Guía body | Opus | Register, persona consistency, >300 words |
| Spanish PDF source (catálogo, garantía, carga) | Sonnet ▶︎3 | Each PDF is bounded; 1 reviewer flatten pass on Opus |
| Spanish prompt design (canonical + adversarial) | Opus | Coherence with brand voice + adversarial creativity |
| `docs/PLAN.md` or `docs/SESSION_HANDOFF.md` drafting | Opus | Multi-section, multi-decision narrative |
| `docs/COMPRESSION_*.md` drafting | Outgoing model writes its own | The model with full context is best at distilling |
| Drift triage (Phase 9) | Opus | Cross-ejercicio judgment + categorization |
| `git commit` + `git push` | Opus | Composes commit messages; never delegated |
| `sf project deploy start` | Opus | Sequential, single-threaded — never delegated |
| `sf agent publish` + `sf agent activate` | Opus | Branching recovery (AQWK ComponentSetError) |
| `sf community publish` | Opus | One-shot but UI-state-dependent verification follows |
| Headless Chrome screenshot capture | Sonnet ▶︎N | Per-ejercicio Playwright runs; pure capture, not judgment |
| Drift-to-Guía-rewrite | Opus | Spanish prose + UI-label coherence |

---

## Boundaries we expect to refine (populate as we hit them)

### Spanish-prose threshold
- **Question:** is the threshold `>300 words` correct? Maybe `>100 words of register-sensitive prose`?
- **Resolve in:** Phase 8 (Guía drafting) when we measure Sonnet vs Opus output quality on identical prompts

### Multi-file invariant tasks
- **Question:** can Sonnet handle a 3-file invariant (e.g., flow + permset + app) if we give it explicit invariants in the prompt?
- **Resolve in:** Phase 2 — try giving Sonnet the invariants; check Opus diff-audit catch rate

### `adlc-orchestrator` fit
- **Question:** is `adlc-orchestrator` strictly better than Opus-direct for Phase 5? Or is it equivalent?
- **Resolve in:** Phase 5 itself — try both on the same canonical prompt set and compare

### Drift fan-out parallelism ceiling
- **Question:** is 5 parallel Sonnets (one per ejercicio) sustainable? Or does Chrome resource contention force `<= 3`?
- **Resolve in:** Phase 9 — actual measurement on the actual Mac

### Compression-doc author identity
- **Question:** should the *outgoing* model write the compression doc, or should Opus always write it?
- **Default rule:** outgoing model writes. They have full context. Opus reviews + accepts.

---

## What this file is NOT

- **Not a token-cost optimizer.** Wrong model on a task that needs the right model wastes 10x more tokens than it saves.
- **Not a "always Sonnet for cost" rule.** Sonnet on a multi-file invariant task produces incoherent output; Opus + audit is cheaper end-to-end.
- **Not a one-shot decision.** Re-evaluate at every phase boundary based on actual measurement.
