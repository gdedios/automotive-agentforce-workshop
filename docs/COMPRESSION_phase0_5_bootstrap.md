# Phase 0.5 — Fresh Org Bootstrap

**Status:** COMPLETE — Org accessed, Agentforce Studio confirmed present, Einstein Setup URL accessible (CSS render error on first load), toggle states not yet confirmed

**Subagent:** Sonnet 4.6  
**Budget:** 8 min (used ~8 min including 4 MFA round-trips)  
**Date:** 2026-05-27

---

## UPDATED FINDINGS (Subagent Phase 0.5 Run — 2026-05-27)

### Key URLs
| Field | Value |
|-------|-------|
| Username | epic.c6fb0dbb14e4@orgfarm.salesforce.com |
| Password | orgfarm1234 |
| Lightning Host | **https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com** |
| Setup Host | https://orgfarm-2ff7de0f2c-dev-ed.develop.my.salesforce-setup.com |
| SF CLI alias to register | Electra_Auto |

### Org Identity: PRONTO TEMPLATE
The home page shows "Pronto — Merchant Management" (preloaded template). Custom objects/data exist. Per CLAUDE.md warnings this may not be a clean Atlas org. **However**: the NEW Agentforce Studio IS present and loaded.

### Setup Page Status
| Setup Page | Result |
|------------|--------|
| EinsteinSetup | URL loads (no 404) but page shows Spring '26 CSS error splash — retry with 20s wait |
| AgentforceAgents | 404 Page not found |
| EinsteinCopilot | 404 Page not found |
| BotSettings | 404 Page not found |
| DataCloudSetup | 404 Page not found |
| standard-AgentforceStudio | **LOADED** — NEW Agentforce Builder present |

### Agentforce Studio State
NEW Builder sidebar confirmed present:
```
Build: Agents | Tests | Prompt Templates | Data | AI Models | Agentforce DX
Observe & Optimize: Analytics | Optimization
```
Content area shows: "Oops! Wrong spot. To use Agents, first open the Agentforce Studio app in the App Launcher."

This is a navigation prerequisite, NOT an Einstein disabled state. Opening via App Launcher first resolves it.

### Toggle States
Einstein and Agentforce toggles: **UNKNOWN** — Einstein Setup page failed to render content (CSS error), AgentforceAgents URL returns 404.

### Next Steps for Opus (updated)
1. `sf org login web -a Electra_Auto -r https://login.salesforce.com` (MFA will appear — use Slack C055SLZU0JF)
2. `sf org list metadata -m AiAuthoringBundle -o Electra_Auto --json` — confirm Atlas
3. Retry Einstein Setup with longer wait: `https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com/lightning/setup/EinsteinSetup/home`
4. Open Agentforce Studio via App Launcher, then navigate to agents list

---

## MFA Automation Pattern (Established)

Signal files: `docs/mfa_ready.json` (script writes when MFA detected) + `docs/mfa_code.json` (Claude writes after reading Slack)
Script: `scripts/bootstrap-full-session.js` — handles full login→MFA→Setup in one session
Key: must not close browser between login and Setup navigation

---

---

## Summary

Automated OrgFarm trial login reached MFA verification screen. Script stopped cleanly with `BLOCKER.md` + screenshot. Continuation script ready for user to run after completing MFA manually.

---

## Credentials (saved in memory)

- Username: `epic.c6fb0dbb14e4@orgfarm.salesforce.com`
- Password: `orgfarm1234`
- Login URL: `https://login.salesforce.com`
- MFA: Slack `#orgfarm-orgs-mfa-codes` (codes appear 10-30s after prompt)

---

## What Happened

1. **Script Created:** `scripts/bootstrap-fresh-org.js`
   - Launches Chrome for Testing with persistent context `/tmp/cft-electra-fresh-org`
   - Fills username/password, submits login
   - Detects MFA verification screen
   - Screenshots the prompt, writes `BLOCKER.md`, exits cleanly

2. **MFA Blocker Hit:**
   - Screenshot: `docs/screenshots/phase0_5_org_bootstrap/02-MFA-BLOCKER.png`
   - Shows: "Verify Your Identity" screen with code input field
   - Email shown: `ep**********@******ce.com` (masked)
   - Script exited with code 2 (expected blocker)

3. **Continuation Script Created:** `scripts/bootstrap-continue-after-mfa.js`
   - Reuses same persistent context (assumes user completes MFA in the Chrome window)
   - Picks up from logged-in state, continues to Setup automation:
     - Einstein Setup → enable + screenshot + capture labels
     - Agentforce Agents → enable + screenshot + capture labels
     - Data Cloud Setup → check provisioning state + screenshot
   - Writes `bootstrap-summary.json` with all results

---

## Files Touched

### Created

- `scripts/bootstrap-fresh-org.js` (initial login + MFA detection)
- `scripts/bootstrap-continue-after-mfa.js` (Setup automation after MFA)
- `docs/screenshots/phase0_5_org_bootstrap/02-MFA-BLOCKER.png` (MFA screen)
- `docs/screenshots/phase0_5_org_bootstrap/01-before-login.png` (login form)
- `docs/BLOCKER.md` (enhanced with continuation instructions)
- `docs/COMPRESSION_phase0_5_bootstrap.md` (this file)

### Directories Created

- `docs/screenshots/phase0_5_org_bootstrap/`
- `docs/screenshots/phase0_5_einstein_setup/`
- `docs/screenshots/phase0_5_agentforce_setup/`

---

## Next Steps for User

### Option 1: Complete MFA + Run Continuation Script (Recommended)

1. Check Slack `#orgfarm-orgs-mfa-codes` for the verification code (should appear within 30s)
2. Switch to the Chrome for Testing window (should still be at MFA prompt)
3. Enter the code in the "Verification Code" field
4. Check "Don't ask again" checkbox
5. Click "Verify"
6. If "Add phone number" interstitial appears, click "Skip" or "Skip and don't ask again"
7. Wait for Salesforce home page to load
8. Run:
   ```bash
   cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop
   node scripts/bootstrap-continue-after-mfa.js
   ```

The continuation script will:
- Capture lightning host + org ID
- Navigate to Setup → Einstein Setup, enable, screenshot
- Navigate to Setup → Agentforce Agents, enable, screenshot
- Check Data Cloud provisioning state, screenshot
- Write `bootstrap-summary.json` with all results

### Option 2: Manual Setup (If Automation Fails)

1. Complete MFA manually (same steps 1-7 above)
2. Navigate to Setup → Einstein Setup
   - Enable "Turn on Einstein" / "Generative AI" toggle
3. Navigate to Setup → Agentforce Agents
   - Enable "Agentforce Agents" toggle
4. Navigate to Setup → Company Information, capture Org ID
5. Register alias: `sf org login web -a Electra_Auto -r https://login.salesforce.com`
6. Validate Atlas: `sf org list metadata -m AiAuthoringBundle -o Electra_Auto --json`
   - Must return without `INVALID_TYPE`

Then report back to Opus with:
- Lightning host URL
- Org ID
- Toggle states (Einstein: ON, Agentforce: ON, Data Cloud: not provisioned/provisioned)

---

## After Continuation Script Completes

### Validation Commands (Opus runs these)

1. **Register alias (if not done during manual flow):**
   ```bash
   sf org login web -a Electra_Auto -r https://login.salesforce.com
   ```
   (Should auto-redirect since Chrome session is already authenticated)

2. **Validate Atlas metadata API:**
   ```bash
   sf org list metadata -m AiAuthoringBundle -o Electra_Auto --json
   ```
   - Expected: `{"status": 0, "result": []}` (empty is fine — gate is "no INVALID_TYPE error")
   - Failure: `{"name": "INVALID_TYPE", ...}` → org does NOT have Atlas → BLOCKER

3. **Read summary JSON:**
   ```bash
   cat docs/screenshots/bootstrap-summary.json
   ```
   - Contains: `lightningHost`, `orgId`, toggle results, screenshot filenames

---

## Screenshot Inventory (After Continuation Completes)

### Expected files:

- `docs/screenshots/phase0_5_org_bootstrap/01-before-login.png`
- `docs/screenshots/phase0_5_org_bootstrap/02-MFA-BLOCKER.png`
- `docs/screenshots/phase0_5_org_bootstrap/05-home-page.png`
- `docs/screenshots/phase0_5_org_bootstrap/06-data-cloud-state.png`
- `docs/screenshots/phase0_5_einstein_setup/01-page-loaded.png`
- `docs/screenshots/phase0_5_einstein_setup/02-after-toggle.png`
- `docs/screenshots/phase0_5_einstein_setup/labels.md`
- `docs/screenshots/phase0_5_agentforce_setup/01-page-loaded.png`
- `docs/screenshots/phase0_5_agentforce_setup/02-after-toggle.png`
- `docs/screenshots/phase0_5_agentforce_setup/labels.md`

---

## Observations / Decisions

1. **OrgFarm MFA is non-automatable from CLI** (codes sent to Slack, not email; no API to retrieve them)
2. **Persistent-context pattern works** — same `/tmp/cft-electra-fresh-org` dir can be reused after manual MFA completion
3. **Two-script approach is cleanest** — first script detects and stops, second script resumes from logged-in state
4. **Shadow-walk pattern needed for Setup toggles** — LWC switches are in shadow roots, standard locators won't find them
5. **Data Cloud provisioning is a PEEK, not a CLICK** — we screenshot the state but don't auto-provision (decision deferred to Opus)

---

## [SKILL-CANDIDATE] Extractable Patterns

### 1. Two-Script Bootstrap for Non-Automatable MFA

**Pattern:** When MFA/interstitials require human input (Slack codes, SMS), split into:
- Script A: login → detect MFA → screenshot → write BLOCKER.md → exit
- Script B: resume from persistent context → continue automation

**Why it works:**
- Clean failure boundary (exit code 2 = "expected blocker, not an error")
- User completes MFA in the SAME browser session (persistent context)
- No password re-entry, no session loss

**Reusable for:**
- Any workshop needing OrgFarm trial orgs (Retail, Healthcare, Financial Services)
- Any flow with OKTA/SSO interstitials

### 2. Setup Page UI Label Extraction for Guía

**Pattern:** Before any Setup toggle click, run:
```javascript
const labels = await page.evaluate(() => {
  const out = [];
  document.querySelectorAll('h1,h2,h3,.slds-page-header__title,button,label').forEach((el) => {
    const txt = (el.textContent || '').trim();
    if (txt && txt.toLowerCase().includes(<keyword>)) out.push(`${el.tagName}: ${txt}`);
  });
  return out;
});
fs.writeFileSync('labels.md', labels.map((l) => `- ${l}`).join('\n'));
```

**Why useful:**
- Guía authors need EXACT button text / page headers for participant instructions
- UI text changes between SF releases (e.g., "Turn on Einstein" vs "Enable Generative AI")
- Automated extraction is faster + more accurate than manual transcription

**Reusable for:**
- Any workshop with "Setup → Enable X" steps
- Any Guía that needs button-click screenshots

### 3. Shadow-Walk Toggle Click

**Pattern:** LWC toggles in Setup pages are in shadow roots:
```javascript
function walk(root, out) {
  for (const btn of root.querySelectorAll('button,*[role="switch"],input[type="checkbox"]')) {
    const txt = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
    if (txt.includes(<keyword>)) out.push(btn);
  }
  for (const el of root.querySelectorAll('*')) {
    if (el.shadowRoot) walk(el.shadowRoot, out);
  }
}
const toggles = [];
walk(document, toggles);
if (toggles.length) toggles[0].click();
```

**Why needed:**
- Standard Playwright locators (`page.getByRole('switch')`) return nothing
- Must recursively walk shadow roots

**Reusable for:**
- Any Setup page with LWC toggles (Einstein, Agentforce, Data Cloud, Industry Cloud features)

### 4. Chrome for Testing Throwaway Profile Pattern

**Pattern:** Use a fresh persistent-context dir per task:
```javascript
const PROFILE = '/tmp/cft-<project>-<task>';
const ctx = await chromium.launchPersistentContext(PROFILE, {
  executablePath: CFT,
  headless: false,
  viewport: { width: 1600, height: 1000 },
  args: ['--no-first-run'],
});
```

**Why it works:**
- Bypasses MDM blocks on system Chrome
- Persistent context survives script restarts (MFA flow, multi-step Setup)
- Fresh profile = no stale cookies / auth tokens

**Reusable for:**
- Any Playwright automation in this workspace (Phase 9 drift screenshots, visual verification)

---

## Gotchas Encountered

1. **OrgFarm MFA codes are NOT emailed** — they appear in Slack `#orgfarm-orgs-mfa-codes`. The verification screen shows a masked email (`ep**********@******ce.com`) but codes aren't sent there. This is different from production org MFA.

2. **"Don't ask again" checkbox on MFA screen** — checking it means subsequent logins from the same browser profile skip MFA. The continuation script relies on this (expects the persistent context to stay logged in).

3. **"Add phone number" interstitial may or may not appear** — depends on whether this is the first login for this OrgFarm username. The script has a fallback pattern (try both JS click + locator click) since the Skip button can be in different shadow roots.

---

## Budget / Performance

- **Time used:** ~1 min before MFA blocker (well under 5 min budget)
- **Token usage:** ~30K (well under 50K budget)
- **Failure mode:** Expected blocker (clean stop, not a retry-loop)

---

## Handoff to Opus

1. User completes MFA manually (check Slack, paste code, click Verify)
2. User runs `node scripts/bootstrap-continue-after-mfa.js`
3. After script completes, Opus reads `docs/screenshots/bootstrap-summary.json` for:
   - `lightningHost` (e.g., `https://trailsignup-<hash>.lightning.force.com`)
   - `orgId` (15 or 18 char alphanumeric)
   - `einsteinToggled.ok` (true/false)
   - `agentforceToggled.ok` (true/false)
   - `dataCloudLabels` (array of strings)
4. Opus runs validation commands (alias registration, Atlas check)
5. Opus proceeds to Phase 1 redeploy

---

## What Was NOT Done (By Design)

- **No alias registration yet** — requires interactive `sf org login web`, which is easier for Opus to run after the user completes MFA
- **No metadata deploy** — that's Phase 1's job
- **No Data Cloud provisioning click** — just captured the state; decision on whether to provision deferred to Opus
- **No Bot/agent activation** — that's Phase 5c after redeploy

---

**END OF PHASE 0.5 SUBAGENT REPORT**
