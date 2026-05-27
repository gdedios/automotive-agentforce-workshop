# COMPRESSION — Phase 1 → Phase 2 handoff

**Phase 1 status:** COMPLETE. Atlas verified. Org accepted with non-blocking residuals.

## Org under build

| Field | Value |
|---|---|
| Alias | `Electra_Auto` |
| Username | `trailsignup.2b50747127e9f2@salesforce.com` |
| Org Id | `00DHp00000KQ9b7MAD` |
| Instance URL | `https://trailsignup-002f6531341a7f.my.salesforce.com` |
| API Version | 66.0 |
| Atlas-capable | ✅ YES (`AiAuthoringBundle` returns metadata) |

## Cleanliness baseline (residuals — IGNORE in Electra build)

These pre-existing artifacts **DO NOT clash** with Electra naming. Plan accepts them; Electra deploy proceeds with isolation by naming convention.

| Type | Names | Origin |
|---|---|---|
| AiAuthoringBundle | `Customer_Support_Assistant_1`, `Customer_Support_Assistant_2` | User experiments since 2026-05-18 |
| CustomObject | `FAQ`, `ActivationPlatformCredential` | Atlas trial preload + Agentforce platform credential mgmt |
| ApexClass | `TrialCustomerPortalHomePageController`, `superSort` | OrgFarm sample classes |
| Site | (none) | Clean |
| Network | (sObject not queryable in trial; ignore) | — |
| Flow (custom, no namespace) | 0 | Clean |

**Why we accept:** Electra naming (`Vehicle_Model__c`, `Test_Drive_Slot__c`, `Vehicle_Inventory__c`, `ElectraAI_Auto_Concierge`, `Electra_Sales_Studio`, `Electra_Auto_Workshop_Participant`) does not collide with any of the above. Phase 2-9 metadata authoring + deploy is unaffected.

## Two-org strategy (decided 2026-05-26)

This build uses two orgs:

1. **`Electra_Auto`** (this org) — the **technical-build environment**. Phases 2–6 and Phase 10 manifest finalization happen here. Residual non-clash artifacts are tolerated. Used for `sf project deploy`, Apex tests, agent publish, agent tests.
2. **A second, fresh `Electra_Auto_Visual` orgfarm trial** (provided in a future session, after Phase 6) — the **visual-verification + drift environment**. As-clean-as-orgfarm-provides (which is not 100% clean — orgfarm trials carry automations + the Pronto sample stack — but matches the student starting state). Used for Phase 7 (Experience Cloud + MIAW), Phase 9 (drift round 1), and the Phase 5 acceptance gate visual screenshots.

Phase 9 in particular is run on the second org because it simulates what a student sees on a fresh OrgFarm pull. The technical-build org has too many artifacts to give a clean drift readout.

## Capabilities verified

- ✅ `AiAuthoringBundle` listable via `sf org list metadata`
- ✅ Atlas / Agent Script provisioning present (Agentforce NOW)
- ✅ `Site` queryable (Experience Cloud licensable, no preloaded sites — Phase 7 will create the `Electra_Customer_Portal` site fresh)
- ⚠️ `Network` SOQL query failed with "sObject type 'Network' is not supported" in this trial — likely a `--use-tooling-api` requirement OR Network needs Communities feature toggled. **Action for Phase 7:** verify Communities/Experience Cloud is enabled in Setup before site creation.

## Decisions made in Phase 1

1. Accept `Electra_Auto` as technical-build env despite 2 pre-existing AiAuthoringBundles + sample objects/classes
2. Plan Phase 9 drift on a SECOND, fresh orgfarm trial (yet to be provisioned)
3. GitHub repo `gdedios/automotive-agentforce-workshop` is the canonical remote; `master` is default branch
4. Phase 0 commit `6ac19bc` pushed; Phase 1 verification did not produce metadata changes (read-only)

## What Phase 2 needs

- Sonnet A authoring `force-app/main/default/objects/{Vehicle_Model__c, Test_Drive_Slot__c, Vehicle_Inventory__c}/` plus field overrides on Lead/Event/Account/Contact
- Sonnet B authoring `force-app/main/default/{permissionsets/Electra_Auto_Workshop_Participant, applications/Electra_Sales_Studio, tabs/Vehicle_Model__c + Test_Drive_Slot__c + Vehicle_Inventory__c}/`
- Sonnet C authoring `force-app/main/default/flexipages/Electra_Sales_Home/` — `flexipage:richText` Sembrar/Resetear flow buttons (NOT `flexipage:flow`)
- Opus aggregation: read 3 reports, audit `git diff --stat`, finalize `manifest/package.xml`, single deploy to `Electra_Auto`, verify with `sf sobject describe`

## Phase 2 dispatch contract (subagent prompt skeleton — copy into Task call)

```
You are a Sonnet 4.6 subagent under Opus orchestration on the Electra Automotive Workshop.

Read first (required):
  - /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/CLAUDE.md
  - /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/ELECTRA_BRAND.md
  - /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/V2_REFERENCES.md

Budget: ≤ 5 min, ≤ 50K tokens.
Folder: write ONLY to <exact path>.
Validation: <exact cmd>, must exit 0.
Output: write <folder>/subagent-report.md with files touched, validation exit code, blockers.
DO NOT deploy. DO NOT cross folders.
3-strike rule: retry once. If you fail twice, write BLOCKER.md at the folder root and STOP.

[task body here]
```

## [SKILL-CANDIDATE]

- **Two-org pattern.** Industry workshops should plan for a tech-build org (residuals OK) + a visual-verify org (fresh orgfarm) from Phase 0 — not discover the need at Phase 7. Add to `INTERVIEW_TEMPLATE.md`: "Will you provide a SECOND fresh org for Phase 9 drift, distinct from the technical-build org?"
- **Atlas-gate + cleanliness check is two distinct gates.** They both fail in different ways. The Atlas gate is binary (capable / not); cleanliness is gradient (block / accept-with-doc / reject). The Phase 1 SOP should split them.
- **Network sObject query failure** when Communities not enabled. Phase 1 SOP should add: try `sf data query "SELECT Name FROM Network"`; if it fails with "sObject not supported", flag as "verify Communities feature in Phase 7 pre-flight."
- **Pool-alias misdirection (workspace CLAUDE.md feedback_atlas_preflight.md) was the right rule, but the cleanliness threshold is fuzzier than "near zero".** A trial with 2 sample classes + 2 sample objects + 2 user-experiment agents is *acceptable* if naming doesn't clash. Refine the rule: clean = "nothing using the brand prefix you're about to use."

## Resume command (next session)

```
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop
claude --resume
```

Then prompt:

> Resume Electra Automotive Workshop. Phase 0 + Phase 1 complete (see `docs/COMPRESSION_phase1_to_phase2.md`). Read `CLAUDE.md`, `docs/ELECTRA_BRAND.md`, `docs/V2_REFERENCES.md`, then start Phase 2 — dispatch 3 Sonnet subagents in parallel (objects / permset+app+tabs / flexipage) per the dispatch contract in the compression doc. Org alias is `Electra_Auto`. After all 3 reports return, audit + finalize `manifest/package.xml` + single deploy.
