# CLAUDE.md — Electra Automotive Workshop

This file complements (does not replace) the upper `CLAUDE.md` files at `Projects/` and `Desktop/Test/claude-projects/`. It codifies rules that are specific to this build: Opus-orchestrated, Sonnet-fanout, skill-extraction-driven.

**Read this BEFORE acting in this folder.** It is short on purpose.

---

## 1. Brand canonical lives in one place

`docs/ELECTRA_BRAND.md` is the durable brand reference. Colors, personas, voice, surface, demo themes, products. After Phase 0 it captures everything that was in the Slack canvas + Holodeck slides — so `/compact` can safely drop those sources.

**If you are unsure about a brand decision, read `docs/ELECTRA_BRAND.md` first.** Do not re-fetch the Slack canvas or the Slides unless the brand file is incomplete.

---

## 2. v2 Kenton is a TEMPLATE, not a source to copy from

`docs/V2_REFERENCES.md` lists v2 files we treat as **read-only shape references** — `sfdx-project.json` for package layout, `install.sh` for gating, `.agent` for Service Agent shape, `flexipage` for `flexipage:richText` button pattern, `applications/*.app-meta.xml` for `actionOverrides`.

**Never copy verbatim.** Every Electra metadata API name, label, agent name, flow name, custom object, permission set, and app must use Electra naming. v2 stays in v2; this build is its own clean tree.

If you find yourself replacing `Kenton_*` → `Electra_*` in something, you copied too much. Stop, delete, and author from scratch with v2 only as a shape reference.

---

## 3. Subagent supervision contract

Opus is the only orchestrator and the only committer. Sonnet subagents author files in disjoint folders, return reports, and never deploy.

### Hard rules

1. **Disjoint-folder fan-out only.** Two parallel subagents must not write to the same file or directory. Phase 2 fans out by metadata-type folder (`objects/`, `permissionsets/`, `flexipages/`); Phase 9 drift fans out by ejercicio (`docs/drift-ej0.md`, `drift-ej1.md`, …).
2. **≤ 5 min budget per subagent.** 30s–1min for trivial tasks. Strike-1 retry, **strike-2 produces `BLOCKER.md` and pauses (no retry)**, strike-3 escalates to user or back to Opus.
3. **Subagents NEVER deploy.** No `sf project deploy start`. They author + validate locally with `xmllint` / `sf project deploy validate` only. All deploys are Opus, sequential, after fan-out completes.
4. **Subagents return a `subagent-report.md`** — files touched, validation cmd + exit code, blockers. Opus distills N reports into the next `docs/COMPRESSION_phaseN_to_phaseN+1.md`.
5. **Opus never trusts a subagent summary.** Before declaring success, Opus runs `git diff --stat` and reads the actual XML/`.cls`/`.flow-meta.xml`.
6. **Compression discipline.** Before every Opus→Sonnet handoff and at every model switch, the outgoing model writes a `<2KB` `docs/COMPRESSION_phaseN_to_phaseN+1.md` capturing alias, IDs, decisions, and any `[SKILL-CANDIDATE]` lines. Then Opus runs `/compact` with a phase-targeted instruction so the next session picks up cold from a curated brief.
7. **Sequential single-thread phases.** Phase 5 (agent authoring), Phase 6b (Data Library wiring), Phase 7 (Experience Cloud + MIAW) are **never fanned out**. They are sequential UI-click-heavy work. The `@knowledge.rag_feature_config_id` AQWK gotcha and the LWR/MIAW publish dance both demand single-threading.

### Subagent prompt skeleton

When dispatching a Sonnet subagent, every prompt must include:

```
You are a Sonnet 4.6 subagent under Opus orchestration.
- Budget: ≤ 5 min, ≤ 50K tokens.
- Folder: write ONLY to <exact path>.
- Validation: <exact cmd>, must exit 0.
- Output: write subagent-report.md at <path> with files touched, validation exit code, blockers.
- DO NOT deploy. DO NOT cross folders.
- 3-strike rule: retry once. If you fail twice, write BLOCKER.md and stop.
```

---

## 4. Skill-extraction discipline (continuous, not a phase)

Phase 11 is **harvest, not synthesis.** Every compression doc and every learning we hit during phases 0–10 must end with a `## [SKILL-CANDIDATE]` section tagging the pattern (parallelism win, model-switch boundary, brand-file field, interview question, gotcha worth memorializing).

The 7 files in `skill-creation/` are populated continuously:

- `LEARNINGS.md` — Automotive-specific gotchas distinct from v2
- `WORKFLOW_AND_PATTERNS.md` — Opus-orchestrator + Sonnet-fanout phase choreography
- `INTERVIEW_TEMPLATE.md` — questions for future client (industry, B2C/B2B, persona, surface, mocks, language, duration)
- `SKILL_OUTLINE.md` — proposed `SKILL.md` shape for `/create-industry-workshop`
- `BRAND_FILE_TEMPLATE.md` — schema any future industry can fill (colors, personas, voice, surface, demo themes, products)
- `PARALLELISM_LEDGER.md` — table: phase / fan-out used / actually worked / regressed
- `MODEL_SWITCH_BOUNDARIES.md` — concrete signals (Spanish prose >300 words → Opus; bulk XML → Sonnet; agent auth → adlc-orchestrator)

If you finish a phase without writing at least one `[SKILL-CANDIDATE]` line into a compression doc or a `skill-creation/*.md` file, **you have skipped the most important work in this project.** Go back.

---

## 5. Parallelism pitfalls (lessons baked in from v2 + workspace CLAUDE.md)

These are the failure modes already known. Apply them preemptively:

- **Lightning-host vs Setup-host swap.** Setup pages live on `*.develop.my.salesforce-setup.com`; Lightning on `*.develop.lightning.force.com`. Cross-host nav bounces back to login. Always swap host before non-Setup nav.
- **OrgFarm 2-interstitial first-run.** New browser profile = MFA code (Slack `#orgfarm-orgs-mfa-codes` ~15s) + "Add phone number" identity skip. Use persistent-context profile so they fire once.
- **Agentforce NEW Builder direct URL only.** `/lightning/n/standard-AgentforceStudio?c__nav=agents` — never `/lightning/setup/EinsteinCopilot/home` (that's the OLD builder).
- **Field Service Setup popup.** New Builder shows it on first load; dismiss before any clicks or it intercepts wizard buttons.
- **+ New Agent split-button.** Match `textContent.trim() === 'New Agent'` exactly; `:has-text("New Agent")` may hit the chevron.
- **AQWK + `@knowledge.rag_feature_config_id` token.** `sf agent publish authoring-bundle` cannot resolve it. Strip the AQWK action from `.agent` source, keep the `knowledge:` block, CLI publish, then add AQWK via Builder Commit.
- **Drift 2.19 truncation.** Builder Reasoning Instructions field clips lines >140 chars silently. Hard-wrap to bullets ≤140 chars before paste. Verify via `sf project retrieve` of the AiAuthoringBundle.
- **Lightning Flow lives in iframe.** `*--c.develop.vf.force.com` Visualforce origin, not the main page. Iterate `page.frames()` to find it.
- **Flexipage Flow buttons must be `flexipage:richText` + `<a href="/flow/...">`.** Never `flexipage:flow` (that's screen flows on records, not Home).
- **One `@InvocableMethod` per class.** Keep `Electra_Workshop_Data_Seeder` and `Electra_Workshop_Data_Reset` separate.
- **`sf agent publish` ComponentSetError on packaging projects.** Exits code 1 but succeeds server-side when `sfdx-project.json` has `packageAliases`. Verify via `sf agent activate` reporting the new version.
- **LWR htmlEditor strips `<style>` tags and class refs.** Inline `style="..."` attributes only.
- **`sf project deploy` does NOT replace media-backed CSS files.** Use Site Builder UI for global CSS, OR keep all styles inline.
- **DigitalExperienceBundle** is `.forceignore`-d for unlocked-package builds (2GP rejects "not compatible with site workspaces"). Facilitators deploy it separately via `sf project deploy start`.
- **MDM blocks Chrome CDP.** Use `--user-data-dir=/tmp/chrome-electra-{ej}` throwaway profile (per-agent dir for Phase 9 fan-out). For Playwright MCP, use `--executable-path` pointing at Chrome for Testing.

---

## 6. Auth + alias hygiene

- User provides credentials; Claude authenticates via `sf org login web -a Electra_Auto -r https://login.salesforce.com`
- All `sf` commands use `-o Electra_Auto` (or whatever alias the user supplied at Phase 1)
- **Phase 12 wipes the alias** with `sf org logout --no-prompt -o Electra_Auto` to avoid future stale-alias issues
- If any other test-org aliases (e.g., from drift rounds) get registered during the build, log them in `docs/SESSION_HANDOFF.md` and wipe in Phase 12

---

## 7. Memory

This project's memory entry: `~/.claude/projects/-Users-gdedios-Desktop-Test/memory/project_automotive_workshop_electra.md`

Index entry in `MEMORY.md`. Update both whenever a load-bearing decision changes (use case, persona, deploy approach, agent api-name, package name).

Do not store ephemeral build state in memory. Use `docs/COMPRESSION_*.md` for that — it lives in the repo and is regeneratable.
