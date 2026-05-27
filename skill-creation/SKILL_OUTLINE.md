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

## Open design questions (resolve during Phase 11)

- Should the skill bundle `kenton-snapshot.md` and `electra-snapshot.md` as references, or just point at the project paths?
- Should the brand file template be a **schema** (markdown headings) or a **filled-in example** (Electra-as-template)?
- Should the parallelism ledger be a separate doc or inlined into `workflow.md`?
- Does the skill need to know about non-Atlas orgs (CDO, plain Einstein-Bots) explicitly, or just gate-fail with a clear message?

## Confidence today (Phase 0)

Low. This outline is a hypothesis. Phases 1–10 will validate or invalidate every section. Phase 11 is where the hypothesis becomes a real skill — or gets revised heavily.
