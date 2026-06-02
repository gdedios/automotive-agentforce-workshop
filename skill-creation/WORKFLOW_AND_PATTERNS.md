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

## Per-phase notes (harvested Phase 11 from COMPRESSION_*.md)

### Phase 0.5 — Bootstrap (the org-enablement reality)
- **Two-script bootstrap for non-automatable MFA.** OrgFarm fresh-org login has two sequential interstitials (device-trust MFA code via Slack `#orgfarm-orgs-mfa-codes` ~15s, then "Add phone number" skip). Script 1 drives to the MFA prompt and pauses; human pastes the code; Script 2 continues from a persistent-context profile so neither fires again. Never try to fully automate the MFA leg.

### Phase 1 — Auth + Atlas verify
- **Atlas-gate and cleanliness are TWO distinct gates.** Atlas gate is binary (capable / not — `sf org list metadata -m AiAuthoringBundle` errors or doesn't). Cleanliness is a gradient (block / accept-with-doc / reject). Split them in the Phase 1 SOP; don't conflate "metadata type supported" with "org is clean".
- **Atlas-capable ≠ Atlas-enabled.** `AiAuthoringBundle` is retrievable, but the runtime publish API 404s until Einstein + Agentforce are toggled ON in Setup. Order is load-bearing: **Einstein FIRST, then Agentforce** (the Agentforce page itself 404s until Einstein is on). This is Ejercicio 1 in the student guide — facilitator cannot skip it.

### Phase 2 — Metadata foundation (▶︎3 Sonnet, clean)
- **`Event` is fragile in fresh Atlas trials.** Skip Activity-based booking metadata; model bookings as custom-object + Lead status fields instead.
- **Permset must deploy AFTER its referenced metadata.** Deploy it twice: wave 1 with object/field perms only; wave 2 (post-flows + Apex) with flow/class entries appended. On first deploy, strip unresolved refs → deploy → re-author full file.

### Phase 4 — Apex (▶︎3 Sonnet, clean)
- **`@InvocableMethod` cannot accept user-defined inner-class param types.** Deploy rejects `List<X.Empty>`. Use `List<String> inputs` (a placeholder the flow ignores). One `@InvocableMethod` per class (Seeder + Reset separate).
- **Flow XML element ordering is alphabetical-by-element-name AND contiguous.** Sonnet drifts to "logical order" → `Element decisions is duplicated` deploy error. `scripts/reorder_flow_xml.py` is the recovery; run before deploy.

### Phase 5 — Agent authoring (sequential, Opus/adlc)
- **Service Agent ships 2 hidden safety subagents** (`Prompt_Injection`, `Reverse_Engineering`) not in `.agent` source but visible in the test runner's `topic` field. Adversarial eval cases must target these, not `off_topic`.
- **User-defined subagent routing is opaque for short utterances** ("hola" → `off_topic` not `ambiguous_question`). Tests should accept multiple plausible topic landings.
- **The agent runs as the AGENT USER, not the deployer.** Subagent flows touching custom objects need the participant permset on the agent user — install script must assign it there too.

### Phase 6b/6c — Data Library + table-RAG (sequential, Opus)
- **AQWK Builder-Commit dance (resolved):** strip AQWK from `.agent` source, keep `knowledge:` block, CLI publish, then add AQWK via Builder Asset Library modal. Builder resolves the `ARFPC_` token; retrieved `.agent` shows the literal ID, AQWK implicit (not a textual action).
- **ADL creation is a USER MANUAL STEP** — never Playwright (two consecutive libraries failed "We couldn't upload your file" via automation; by-hand worked first try).
- **Table-RAG is brittle:** markdown tables index <60% row recall on numeric columns. Rewrite as prose with identifier-leading sentences ("**E-Cruiser**: autonomía WLTP de 520 km..."), one fact per sentence.
- **Eval rubric staleness:** when AQWK is wired after the eval suite is authored, "agent should admit no info" cases become FAIL when retrieval succeeds. Mark for rubric refresh, don't blame the agent.

### Phase 7 — Experience Cloud + MIAW (sequential)
- **Provision-then-deploy for sites.** `sf community create` + poll `BackgroundOperation` FIRST, then deploy bundle + DigitalExperienceConfig together. Site provisioning belongs BEFORE the bundle deploy.
- **Salesforce auto-suffixes LWR site api-names with `1`** when the desired name conflicts with the auto-paired vforce site. Bundle dir + `<space>` + `<site>` refs all must use the suffixed name.

### Phase 8 — Guía (Opus draft + ▶︎5 Sonnet review, clean)
- **Per-ejercicio Sonnet fan-out for guides.** Split markdown by section, disjoint file paths, identical bash validations in each prompt; Opus merges via `cat` + re-validates globally. ~3x speedup, zero drift cost.
- **Style + glossary canonicals as load-bearing reviewer inputs.** Two cheap files (`STYLE_GUIDE.md` + `GLOSSARY.md`) prevent N reviewers drifting in N directions. One-time ~10 min cost, compounds across every reviewer call.

### Phase 9 — Drift (COLLAPSED to sequential Opus — important reversal)
- **Drift = flow-contract test, NOT Playwright UI capture.** The plan budgeted ▶︎5 per-ejercicio Playwright fan-out; reality: the high-value defects were *contract* drift (404 URLs, no-package-exists, flow I/O name mismatches, an empty-string→empty-catalog bug). All caught by static checks (`curl` the guide's URLs, grep guide API names vs flow XML) + anon-Apex `Flow.Interview` contract tests in minutes, no browser. Re-weight Phase 9 toward contract tests; reserve fan-out for genuinely UI-only ejercicios.
- **`IsNull` ≠ `ISBLANK` for LLM-supplied optional string inputs.** LLMs fill unmentioned optional inputs with `""`, not null → any Flow decision gating an optional action input must use `NOT(ISBLANK())`.

### Phase 10 — Cleanup + handoff (▶︎3 Sonnet, clean — the sweet spot)
- **Small-task fan-out is the cost/latency sweet spot.** 3 Sonnet subagents, disjoint folders (`classes/`, `scripts/reset.sh`, `docs/SESSION_HANDOFF.md`), each 52s–200s. Opus checked + interceded immediately (fixed a regex, reconciled a doc) without waiting 15-30 min. Keep subagent tasks at 1-3 min so the orchestrator stays in the loop.
- **A doc-authoring subagent can't know what changed AFTER its source snapshot.** The handoff-doc subagent flagged drifts as "open" that an earlier same-session commit had already fixed. Opus must reconcile doc output against intervening commits.
- **Round-trip clean check needs a SEMANTIC diff.** Orgs inject `areMetricsLoggedToDataCloud`, canvas style props, normalized descriptions on retrieve. Compare load-bearing markers + Active status, not `diff -q`. `sf project retrieve --output-dir` must be IN-project (use gitignored `pkg-verify/`).
