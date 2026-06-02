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

A task should run on **Haiku 4.5** when:
- The task is pure perception + transcription: read screenshot(s), extract the visible text/labels/state, hand the text to the next step
- No judgment, no authoring, no branching — just "what does this image say"
- (Added during Electra build per user routing directive: Opus reserved for checking/intervention; Haiku for cheap screenshot-read → text handoff; Sonnet for authoring/Playwright-driving.)

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
| Headless Chrome screenshot CAPTURE / Playwright driving | Sonnet ▶︎N | Per-ejercicio runs; authoring the script + driving the browser |
| Screenshot READING / label transcription | Haiku | Pure perception → text handoff; no judgment |
| Drift-to-Guía-rewrite | Opus | Spanish prose + UI-label coherence |
| Anon-Apex `Flow.Interview` contract test authoring | Sonnet | Bounded; Opus reviews assertions vs guide |

---

## Boundaries — RESOLVED during the Electra build

### Spanish-prose threshold → CONFIRMED useful, but split the work
- **Resolution:** Phase 8 worked best as **Opus drafts, Sonnet reviews per-section** — NOT Sonnet drafts. Sonnet review held register fine *when given STYLE_GUIDE + GLOSSARY as inputs*. So the rule is less about a word count and more about role: Opus owns first-draft register/voice; Sonnet owns bounded tightening against a canonical. The `>300 words` heuristic is a fine trigger for "Opus drafts."

### Multi-file invariant tasks → keep with Opus; subagents author single folders
- **Resolution:** the winning pattern is subagents author DISJOINT single folders, Opus owns every cross-file invariant (`package.xml` order, deploy sequence). Phase 10's 3-way fan-out proved disjoint-folder Sonnet works with zero clobber; the moment a task spans the invariant (the manifest), it's Opus. Don't hand a 3-file invariant to one Sonnet.

### `adlc-orchestrator` fit → useful for agent authoring; Opus-direct also fine
- **Resolution:** both work. For Phase 5 the deciding factor was the AQWK `@knowledge.rag_feature_config_id` gotcha, which needed Opus-level branching recovery regardless. Treat `adlc-orchestrator` as a convenience (auto-loads the agent skills), not a requirement.

### Drift fan-out parallelism ceiling → MOOT; drift collapsed to sequential
- **Resolution:** Phase 9 did NOT fan out 5 Playwright Sonnets at all. The real defects were contract drift caught by static checks + anon-Apex `Flow.Interview` tests (Opus-solo, minutes). The parallelism ceiling question never mattered because the right tool wasn't parallel browsers. **Lesson: question the fan-out itself before tuning its width.**

### Compression-doc author identity → CONFIRMED
- **Rule:** the *outgoing* model writes the compression doc (full context = best distillation). Opus reviews + accepts. Held across all 11 compression docs.

### Subagent task SIZE → the load-bearing knob (new, Phase 10)
- **Resolution:** keep each subagent task to **1-3 min** so the Opus orchestrator can check + intercede immediately instead of waiting 15-30 min. This matters more than which model. A big Sonnet task that runs 20 min and returns wrong is worse than 5 small ones Opus steers in real time.

---

## What this file is NOT

- **Not a token-cost optimizer.** Wrong model on a task that needs the right model wastes 10x more tokens than it saves.
- **Not a "always Sonnet for cost" rule.** Sonnet on a multi-file invariant task produces incoherent output; Opus + audit is cheaper end-to-end.
- **Not a one-shot decision.** Re-evaluate at every phase boundary based on actual measurement.
