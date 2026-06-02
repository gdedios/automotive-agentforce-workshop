# Skill Outline — `/create-industry-workshop` (proposed)

> **Populated continuously.** Phase 11 transforms this outline into a real `SKILL.md` in `~/.claude/skills/create-industry-workshop/` (or installable via `npx skills add`).
>
> The outline below is the **target shape**. Today (Phase 0) it is mostly hypothesis; the build refines it.

---

## Skill metadata

```
name: create-industry-workshop
description: Build a Salesforce Agentforce hands-on workshop for any industry from a brief interview, in 2-3 days, using Opus orchestration + Sonnet fan-out subagents.
allowed-tools: Read, Write, Edit, Bash, Grep, Glob, Task, AskUserQuestion
```

## Skill triggers

The skill auto-loads (or is `/create-industry-workshop`-invoked) when:
- The user asks for "a workshop for `<industry>`" or "an Agentforce demo for `<vertical>`"
- The user references "Pyxis", "Cumulus", "NTO", "Electra", "Kenton", or any other Salesforce-vertical demo brand by name
- The user opens a directory under `Projects/<MM-YYYY>/<industry>-workshop*/` and the dir is empty

## Skill invocation flow

1. **Interview phase** — read `assets/interview.md` (the questions from `INTERVIEW_TEMPLATE.md`), ask via `AskUserQuestion`, capture decisions in `docs/<BRAND>_BRAND.md`
2. **Plan phase** — read `assets/plan-template.md` (parameterized version of Electra's `docs/PLAN.md`), substitute brand/persona/topics/actions, write to `docs/PLAN.md`
3. **Phase 0 scaffold** — read `assets/scaffold/*` (sfdx-project.json template, .forceignore template, install.sh template, package.xml skeleton, CLAUDE.md template), substitute brand naming, write to project tree
4. **Phase 1+ execution** — apply the choreography from `assets/workflow.md` (which is `WORKFLOW_AND_PATTERNS.md` finalized)

## Skill files (target layout)

```
~/.claude/skills/create-industry-workshop/
├── SKILL.md                           # this outline finalized
├── assets/
│   ├── interview.md                   # from INTERVIEW_TEMPLATE.md
│   ├── plan-template.md               # parameterized Electra PLAN.md
│   ├── workflow.md                    # from WORKFLOW_AND_PATTERNS.md
│   ├── brand-file-template.md         # from BRAND_FILE_TEMPLATE.md
│   ├── claude-md-template.md          # from project-level CLAUDE.md
│   ├── parallelism-ledger.md          # from PARALLELISM_LEDGER.md
│   ├── model-switch-boundaries.md     # from MODEL_SWITCH_BOUNDARIES.md
│   └── scaffold/
│       ├── sfdx-project.json
│       ├── .forceignore
│       ├── .gitignore
│       ├── manifest/package.xml
│       └── scripts/install.sh
└── references/
    ├── learnings.md                   # from LEARNINGS.md (cross-workshop)
    ├── kenton-snapshot.md             # v2 in 1 page
    └── electra-snapshot.md            # v3 in 1 page
```

## Skill body (proposed structure of `SKILL.md`)

### Section 1: Pre-flight
- Verify Atlas org capability (`sf org list metadata -m AiAuthoringBundle`)
- Confirm clean org (object/class count near zero)
- Confirm Spanish/English mix decision (default: Spanish prose, English UI labels)

### Section 2: Interview
- Run `AskUserQuestion` per `assets/interview.md`
- Output: filled-in `docs/<BRAND>_BRAND.md`

### Section 3: Plan
- Substitute brand into `assets/plan-template.md`
- Output: `docs/PLAN.md` ready for ExitPlanMode

### Section 4: Phase 0 scaffold
- Materialize the 7 skill-creation stubs
- Write `CLAUDE.md` with subagent contract + skill-extraction rule
- Print resume command

### Section 5: Phase 1–12 execution
- Phase 1 sequential, Phase 2 fan-out, …
- Reference `assets/workflow.md` for exact subagent prompt skeletons

### Section 6: Continuous skill-refinement
- Every learning during the build appends to `references/learnings.md`
- The skill is a living artifact; each industry workshop sharpens it

## What this skill is NOT

- **Not a code generator.** It does not write `.flow-meta.xml` files; subagents do that with v2 + Electra as references.
- **Not an oracle.** It does not predict which 3 topics + 4 actions a given industry needs; the interview surfaces that.
- **Not a deployment tool.** It does not run `sf project deploy`; Opus does that.

## Open design questions — RESOLVED (Phase 11)

- **Bundle snapshots or point at paths?** → **Bundle** 1-page `kenton-snapshot.md` + `electra-snapshot.md` as references. Project paths rot (orgs get wiped, folders archived); a self-contained skill survives.
- **Brand template: schema or filled example?** → **Both.** `BRAND_FILE_TEMPLATE.md` is the schema (headings + what goes in each); ship the Electra brand file as a filled reference alongside it. New users copy the schema, learn from the example.
- **Parallelism ledger separate or inlined?** → **Separate.** It's a decision-support table consulted at each phase boundary; inlining bloats `workflow.md`. Keep `parallelism-ledger.md` standalone, cross-link from workflow.
- **Non-Atlas orgs: explicit handling or gate-fail?** → **Gate-fail with a clear, actionable message.** The skill should detect `INVALID_TYPE: AiAuthoringBundle`, then check whether it's a toggle-off (recoverable: enable Einstein+Agentforce) vs a wrong-template (reject). Two distinct messages. Don't try to support CDO/Einstein-Bots orgs.

## NEW design decisions from the Electra build (add to SKILL.md)

- **Add a Section 0: "drift = contract test first."** Before any Playwright, the skill should `curl` every external URL the guide cites + grep guide API names vs flow XML + run anon-Apex `Flow.Interview` against seeded data. This single pass caught the highest-severity defects in Electra.
- **Subagent task-size guardrail belongs in the SKILL body.** Codify "≤3 min per subagent so the orchestrator stays in the loop" as a hard rule, not a nicety. It's the difference between Opus steering and Opus waiting.
- **Three-tier model routing** (Opus orchestrate/check/deploy · Sonnet author/drive-browser · Haiku read-screenshots-and-transcribe) is a first-class part of the skill, not an afterthought.

## Confidence after the Electra build (Phase 11)

**High** on the choreography, the disjoint-folder fan-out contract, the compression-doc handoff, and the model-routing rules — all validated across 12 phases on a real build. **Medium** on the Phase 7 (Experience Cloud) and Phase 9 (drift) shapes — Ej4 was never verified on a truly clean org, and Phase 9 deviated from plan (collapsed to sequential contract tests, which turned out better). The next build should treat Phase 7/9 as the areas most likely to need adaptation. The outline is now a buildable skill, not a hypothesis.
