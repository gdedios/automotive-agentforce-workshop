# Interview Template — for the next industry workshop

> **Populated continuously.** As we hit "we should have asked this upfront" moments, append here. Phase 11 harvests into the skill's `assets/interview.md`.

The interview happens at the start of every new industry workshop build. Goal: lock in the decisions that drive Phase 2 onwards, before any metadata gets authored. Run this BEFORE ExitPlanMode.

---

## 1. Industry + brand

- **Industry vertical?** (e.g., Healthcare, Retail, Financial Services, Energy, Hospitality)
- **Salesforce demo brand for that vertical?** (e.g., Cumulus for Insurance, Pyxis for Health, NTO for Retail, Electra for Auto)
- **Brand reference source?** (Slack canvas? Holodeck deck? Internal Confluence? Marketing assets folder?)
- **Brand colors (5 max — primary, primary-alt, light, secondary, secondary-alt)?**
- **Logo / wordmark format available?** (SVG inline, PNG export, both?)
- **Spanish localization needed?** Latam Spanish (`tú` register or `vos`)? Country-specific (Argentina, Mexico, Colombia)?
- **English UI labels alongside Spanish prose?** (Default: yes, matches v2 Kenton + Electra. Differs from full-Spanish if the org chooses to translate Setup labels.)

## 2. Use case

- **B2B or B2C?**
- **One-line use case:** "<Persona> <does what> via <surface>"
  - v2 Kenton: "B2B franchisee gets billing + tech-support + FAQ via private support portal"
  - Electra: "B2C consumer schedules a test drive + learns about EVs via public marketing site"
- **Primary persona (consumer of the agent)?** Name, age, role, channel, anxiety, goals.
- **Secondary persona (consumer of the workshop = facilitator/student)?** Tech depth? Org familiarity?
- **3 topics + ~4 actions in scope?**
- **Mock vs real integrations?** What systems are we *pretending* to call (DMS, EHR, ERP, billing) vs simulating with custom objects + flows?
- **Apex usage?** Default rule from v2 + Electra: Apex ONLY for seed/reset (`@InvocableMethod`). Agent actions are flows only. Confirm this for new client.

## 3. Surface

- **Where does the agent live?** (Public Experience Cloud + MIAW guest? Service Cloud chat for agents? Internal Slack? Embedded in a Lightning app for employees?)
- **Authentication?** Guest user? Authenticated community user? Internal-only?
- **Site branding — Site Builder UI or deploy-friendly?** (Default: Site Builder UI for global CSS — `sf project deploy` does NOT replace media-backed CSS files.)

## 4. Org base

- **Atlas-capable trial available?** OrgFarm pool? Fresh trial signup? Existing demo org?
- **Pre-flight check ALWAYS:** `sf org list metadata -m AiAuthoringBundle -o <alias>` must NOT error.
- **Clean org or use case preloaded?** If preloaded, plan `.forceignore` list explicitly.

## 5. Schedule + execution

- **Target build duration?** (1 week with parallelism = Electra. 2 weeks sequential = v2 Kenton. 2-3 days = future skill-driven.)
- **Drift-round budget?** 1 round per Plan-agent default; v2's rounds 2 + 3 paid for unfamiliarity.
- **Output format for the Guía?** PDF only (default) or HTML + PDF?
- **Number of canonical prompts?** (4 default — happy paths covering each topic)
- **Number of adversarial prompts?** (~30 default — off-topic, prompt injection, language switch, fabrication, edge cases)

## 6. Auth + alias hygiene

- **User provides credentials? Or org pre-auth'd?**
- **Alias naming convention?** (`<Brand>_<UseCase>` — e.g., `Electra_Auto`, `Pyxis_Care`)
- **Alias wipe at end?** (Default: yes, Phase 12 runs `sf org logout --no-prompt -o <alias>`)

## 7. Skill harvest expectations

- **Is this a one-off build or part of a series?**
- **Should learnings flow into the next workshop?** (Default: yes, every build refines `skill-creation/`)
- **Anything industry-specific that won't generalize?** (e.g., regulatory copy, real customer logos, signed brand assets)

---

## Questions accumulated during the Electra build (the gold for the skill)

Each of these is a "we should have asked this upfront" moment. Fold them into the numbered sections above for the next build.

- **[→ §4 Org base] "Will you provide a SECOND fresh org for Phase 9 drift, distinct from the technical-build org?"** We discovered at Phase 9 we needed a clean org for drift, but the only spare was a contaminated merchant template. Plan a tech-build org (residuals OK) + a visual-verify/drift org (fresh orgfarm) from Phase 0. The build org and drift org should never be the same alias.
- **[→ §2 Use case] "Will the agent need to create Calendar Events, or can it use a custom record type / Lead status field?"** `Event` is fragile in fresh Atlas trials. Default to custom-object + Lead-status modeling; only reach for `Event` if the demo specifically needs calendar integration.
- **[→ §4 Org base] "Is the org Atlas-CAPABLE or Atlas-ENABLED?"** Capable = `AiAuthoringBundle` metadata retrievable. Enabled = Einstein + Agentforce toggled ON in Setup (publish API 404s otherwise). Always confirm BOTH; enabling is the student's Ejercicio 1 but the facilitator must do it on any demo org.
- **[→ §3 Surface] "Are the FAQ/knowledge source files hosted anywhere the student must fetch, or shipped with the install?"** The Electra guide referenced GitHub raw URLs that 404'd; the installer already uploaded the PDFs to Files. Decide ONE source of truth for knowledge assets (prefer: installer uploads them; guide just verifies presence). Never make the student download from an external URL mid-workshop.
- **[→ §5 Schedule] "How should Phase 9 drift be validated — UI walkthrough or contract tests?"** Default to contract tests (static URL/API-name checks + anon-Apex `Flow.Interview` against seeded data) FIRST; reserve Playwright UI capture for genuinely UI-only steps. The highest-severity bugs are usually contract drift, not UI-label drift.
- **[→ §1 Brand] "Confirm the public GitHub repo NAME, exactly, if the guide will link to it."** The guide linked `gdedios/automotive-workshop` but the real repo is `gdedios/automotive-agentforce-workshop`. If any guide URL points at a repo, verify it resolves with `curl` before shipping.
