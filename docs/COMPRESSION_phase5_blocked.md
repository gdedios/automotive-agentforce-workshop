# COMPRESSION — Phase 5 BLOCKED on Einstein/Agentforce enablement

**Status:** Phase 5 agent script authored + validated locally; **publish blocked** at the user-driven Setup gate (Einstein → Agentforce → Data Library). This is exactly the BLOCKING acceptance gate Plan §5.4 anticipated. Halted overnight execution per user constraint ("STOP at Phase 5 if visual gate fails").

## What was completed

- `force-app/main/default/aiAuthoringBundles/ElectraAI_Auto_Concierge/ElectraAI_Auto_Concierge.agent` — full Spanish Service Agent script (16.6 KB, 303 lines). Tab-indented, capitalized booleans, no AQWK action (correct per `feedback_agent_publish_knowledge_token.md`).
- `ElectraAI_Auto_Concierge.bundle-meta.xml` — `<bundleType>AGENT</bundleType>`.
- `sf agent generate authoring-bundle --no-spec` validation: **Status: COMPLETED, Errors: 0**.
- Manual safety review on impersonation, dark patterns, proxy discrimination, euphemistic harm, manipulation: **PASSED**.

## Where it broke

```
$ sf agent publish authoring-bundle --api-name ElectraAI_Auto_Concierge -o Electra_Auto --json
ERROR: 404 AgentApiNotFound
```

The Einstein/Agentforce/Data Library features are not yet toggled on in this Atlas trial org. This is normally **Ejercicio 1** of the workshop ("Habilitar Einstein + Agentforce + Data Library") — sequential UI clicks the user must do. Cannot be safely automated overnight on this MDM laptop.

Metadata-deploy fallback also blocked: `.forceignore` line 40 excludes `aiAuthoringBundles/` from `sf project deploy start` for unlocked-package builds. Bundle MUST go through `sf agent publish authoring-bundle`.

## Resume procedure (when user wakes)

1. Open `Electra_Auto` org in browser (use `sf org open -o Electra_Auto`).
2. Setup → Quick Find → "Einstein Setup" → toggle **ON**. Refresh browser between toggles (Drift 1.1 from v2).
3. Setup → Quick Find → "Agents" → enable Agentforce.
4. Setup → Quick Find → "Data Library" → enable.
5. Re-run publish:
   ```
   sf agent publish authoring-bundle --api-name ElectraAI_Auto_Concierge -o Electra_Auto --json
   ```
6. Then `sf agent activate ...`.
7. Then Phase 5.4 visual gate (headless Chrome, but on MDM laptop = needs user-driven session per Phase 6a Chrome hang).
8. Then Phase 5.5 — `aiEvaluationDefinitions/ElectraAI_Auto_Concierge_Tests` + `sf agent test run`.

## Pending after Phase 5 unblocks

- **Phase 6b** — Data Library wiring (sequential UI clicks; user-driven).
- **Phase 7** — Experience Cloud + MIAW (still blocked on second visual-verify org user has not provided).
- **Phases 8–12** — Guía, drift, skill extraction, cleanup.

## [SKILL-CANDIDATE]

- **Atlas trial orgs do NOT come with Einstein/Agentforce/Data Library pre-enabled.** The `AiAuthoringBundle` metadata type is retrievable (Atlas gate passes per Phase 1), but the **runtime publish API** (`AgentApi`) returns 404 until the features are toggled on in Setup. Distinguish: "Atlas-capable org" = metadata supports it; "Atlas-enabled org" = features toggled on. Workshop must include this enablement step as Ejercicio 1 — facilitator cannot skip it.
- **`sf agent publish authoring-bundle` fails fast (4xx) when Einstein is off,** so no risk of partial-publish — safe to retry once features are on.
- **`.forceignore` line 40 (`aiAuthoringBundles/`) is correct for unlocked packages but means `sf agent publish` is the ONLY publish path.** No fallback via `sf project deploy start`. Document this explicitly in skill `LEARNINGS.md`.
- **The agent script's `default_agent_user` must be the auto-provisioned Service Agent user** (`agent.bh1emacumvbm.vuhizuxuekcp.szxxj3jqhscj.5jn16rms1nat@salesforce.com` for this org), NOT the human facilitator. This user is created automatically when Agentforce is enabled — so step ordering matters: enable Agentforce in Setup BEFORE finalizing `default_agent_user` in the .agent file.

## Resume command

```
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop
claude --resume
```

Resume prompt:
> Resume Electra Automotive Workshop. Phase 5 agent script authored + validated locally; publish blocked on Einstein/Agentforce enablement (see `docs/COMPRESSION_phase5_blocked.md`). User has now toggled Einstein + Agentforce + Data Library in Setup. Run `sf agent publish authoring-bundle --api-name ElectraAI_Auto_Concierge -o Electra_Auto --json`, then activate, then proceed to Phase 5.4 visual gate.
