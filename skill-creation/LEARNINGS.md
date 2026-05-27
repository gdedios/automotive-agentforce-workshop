# Learnings — Electra Automotive Workshop

> **Populated continuously throughout the build.** Each phase that hits a gotcha distinct from v2 Kenton appends here. Phase 11 harvests this file into the skill's `references/learnings.md`.
>
> Format per entry:
>
> ```
> ### LRN-NNN  <one-line summary>
> **Phase:** <N>
> **Distinct from v2 because:** <one-line>
> **What broke / what we learned:** <details>
> **Fix / pattern to memorialize:** <copyable snippet, command, or rule>
> **[SKILL-CANDIDATE]** <how this generalizes to future industry workshops>
> ```

---

## Pre-seeded from workspace + v2 (Phase 0 baseline — already known)

These are not Automotive-specific learnings; they are the *floor* we start from. Treat them as already-paid-for.

- AQWK + `@knowledge.rag_feature_config_id` strip-and-re-add via Builder commit (workspace CLAUDE.md `feedback_agent_publish_knowledge_token.md`)
- Drift 2.19 — Builder Reasoning Instructions silently truncate >140 chars (workspace CLAUDE.md `feedback_agentforce_instructions_truncation.md`)
- LWR htmlEditor strips `<style>` tags + class refs to global CSS (workspace CLAUDE.md `feedback_lwr_html_editor.md`)
- One `@InvocableMethod` per class (workspace CLAUDE.md)
- NEW Builder direct URL `/lightning/n/standard-AgentforceStudio?c__nav=agents` (workspace CLAUDE.md `feedback_agentforce_builder_url.md`)
- ContentAsset SFDX folder-per-asset layout (workspace CLAUDE.md `feedback_contentasset_sfdx_layout.md`)
- DigitalExperienceBundle `.forceignore`-d for unlocked-package builds (2GP rejects "site workspaces")
- OrgFarm 2-interstitial first-run + persistent-context Chrome profile bypass
- `flexipage:richText` Flow buttons + `<a href="/flow/...">`, never `flexipage:flow` for Home page actions
- Setup-host vs Lightning-host swap before non-Setup nav

## Automotive-specific learnings (populate as we go)

<!-- Phase 1 entries below -->

<!-- Phase 2 entries below -->

<!-- Phase 3 entries below -->

<!-- Phase 4 entries below -->

<!-- Phase 4.5 entries below -->

<!-- Phase 5 entries below -->

<!-- Phase 6a / 6b / 6c entries below -->

<!-- Phase 7 entries below -->

<!-- Phase 8 entries below -->

<!-- Phase 9 entries below -->

<!-- Phase 10 entries below -->
