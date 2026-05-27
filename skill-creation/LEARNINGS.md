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

### LRN-001 `INVALID_TYPE: Cannot use: AiAuthoringBundle` means Einstein/Agentforce toggle is OFF, not wrong org type
**Phase:** 0.5 / 1
**Distinct from v2 because:** v2 inherited an already-toggled-on org. On a *fresh* OrgFarm Atlas trial, both toggles are OFF by default and must be flipped before any AiAuthoringBundle metadata works.
**What broke / what we learned:** I misdiagnosed `INVALID_TYPE: Cannot use: AiAuthoringBundle in this organization` as "this org is the wrong template" (a Pronto Service Cloud preload, etc.) and went down a dead-end path looking for a different org. The user corrected: "AiAuthoringBundle is not showing because YOU HAVE NOT ENABLED EINSTEIN YET!" The Atlas-capable org checklist now is: (1) Turn on Einstein, (2) Turn on Agentforce Agents, (3) only then does `sf org list metadata -m AiAuthoringBundle` resolve.
**Fix / pattern to memorialize:**

The two URLs and the order:

```bash
# 1. Mint frontdoor URL (auth survives MFA expiry)
sf org open --url-only -o <alias> -p /lightning/setup/EinsteinGPTSetup/home --json

# 2. Toggle "Turn on Einstein" (the ONLY non-disabled switch on EinsteinGPTSetup)
# 3. Refresh
# 4. Mint frontdoor URL for /lightning/setup/EinsteinCopilot/home
#    (this is the Agentforce Studio > Agentforce Agents page,
#     NOT the OLD Builder despite the URL name)
# 5. Toggle the "Agentforce" switch in the page header (top-right)
# 6. Wait ~30s, then verify:
sf org list metadata -m AiAuthoringBundle -o <alias> --json   # must return without INVALID_TYPE
```

Notes that cost time:

- `EinsteinSetup/home` returns "Page not found" on Spring '26 trials. The working URL is **`EinsteinGPTSetup/home`**.
- `AgentforceAgents/home` returns "Page not found". The working URL is **`AgentforceSetup/home`** (which is just a landing page) → click "Review Settings" → lands on **`EinsteinCopilot/home`**, which is where the actual Agentforce master toggle lives. Direct-nav to `EinsteinCopilot/home` works too.
- Despite workspace CLAUDE.md saying "do not navigate to `/lightning/setup/EinsteinCopilot/home` (that's the OLD Builder)" — that warning applies to **building agents in the OLD Topic-based wizard**. The same URL is *also* where the Agentforce master enable-toggle lives. Two different uses for the same URL; we're using it for enablement only.
- When walking shadow DOM for the toggle, the Agentforce master switch has no visible label text near it (just "Off" or "On"). Don't filter by label — find "the only checkbox/switch on the page that is unchecked AND not disabled" and click that.
- Setup pages on Spring '26 trials show a Spring '26 loading splash for ~10–25s before the real content renders. Poll for `.slds-page-header` / "Quick Find" / heading text rather than fixed sleep.
- Both toggles **persist after refresh and across sessions** — so this is a one-time bootstrap step, not a per-session warmup.

**[SKILL-CANDIDATE]** Add to the skill's `references/atlas-trial-bootstrap.md`:
> "Before any AiAuthoringBundle work on a fresh OrgFarm Atlas trial:
> 1. `sf org list metadata -m AiAuthoringBundle -o <alias> --json` → `INVALID_TYPE` is the *expected* signal that Einstein + Agentforce toggles are off, NOT a signal that the org is wrong.
> 2. Visit `/lightning/setup/EinsteinGPTSetup/home`, toggle `Turn on Einstein`.
> 3. Visit `/lightning/setup/EinsteinCopilot/home`, toggle the master `Agentforce` switch in the page header.
> 4. Re-run the metadata list — should resolve in under a minute.
> The skill should ship a Playwright script (`scripts/bootstrap-atlas-toggles.js`) that does steps 2–3 headlessly via frontdoor URL, polls for Setup chrome, finds 'the only enabled-and-unchecked toggle on the page' and clicks it."

A Playwright script that drove this end-to-end on this org is committed at `scripts/enable-einstein-agentforce-v2.js` (Einstein part) + `scripts/enable-agentforce-agents.js` (Agentforce part). They use the persistent-context Chrome-for-Testing pattern + frontdoor URLs to survive MFA. Future skill should bundle these as a single reusable script.

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
