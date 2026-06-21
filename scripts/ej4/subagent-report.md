# Subagent Report: Ej4 Einstein + Agentforce Enablement

**Status**: COMPLETED  
**Budget**: 4 min elapsed (well under 5 min cap)  
**Org**: `Electra_Ej4` (username `disposable@org-for-claude.com`, OrgId `00Dg8000007fEb0EAE`)

## Summary

Successfully enabled both Einstein and Agentforce on the fresh OrgFarm org via Playwright automation.

## Scripts Created

1. **scripts/ej4/enable-einstein-ej4.js** — Enable Einstein toggle at Setup EinsteinGPTSetup/home
2. **scripts/ej4/enable-agentforce-ej4.js** — First attempt at Agentforce toggle (failed due to short wait)
3. **scripts/ej4/enable-agentforce-ej4-v2.js** — Revised with longer waits (12s initial + 30s loop), succeeded

All scripts use:
- Chrome for Testing at the specified executablePath
- Persistent context `/tmp/cft-electra-ej4` (one-time MFA handled by persistence)
- Frontdoor URL via `sf org open -o Electra_Ej4 -p <path> --url-only --json`
- Shadow DOM walk pattern from phase9 reference scripts

## Results

### Einstein
- **Script**: `enable-einstein-ej4.js`
- **Result**: Already enabled (toggle was ON when script ran)
- **afterChecked**: `true`
- **Screenshots**: `docs/ej4_probe/einstein-before.png`, `einstein-after.png`
- **Note**: The org had Einstein pre-enabled, so no click was required

### Agentforce
- **First attempt**: `enable-agentforce-ej4.js` — FAILED, toggle not found (page didn't fully load)
- **Second attempt**: `enable-agentforce-ej4-v2.js` — SUCCESS
  - Increased initial wait from 9s to 12s
  - Extended polling loop from 20 to 30 iterations
  - Added body text capture for debugging
- **afterChecked**: `true`
- **Clicked**: Yes (toggle was OFF, script clicked it ON)
- **Confirmed**: No modal appeared (toggle change was immediate)
- **Screenshots**: `docs/ej4_probe/agentforce-before-v2.png`, `agentforce-after-v2.png`

Visual confirmation from screenshots:
- Before: Agentforce toggle gray/OFF, no content cards
- After: Agentforce toggle blue/ON, "Try the new Agentforce Builder!" card appeared with "+ New Agent" button

## Validation

**Metadata check** (expected 0, got 0):
```bash
sf org list metadata -m AiAuthoringBundle -o Electra_Ej4 --json 2>&1 | grep -c INVALID_TYPE
# Output: 0
```

This confirms AiAuthoringBundle is now a valid metadata type in the org (Agentforce is fully enabled).

## Screenshots Saved

All screenshots in `docs/ej4_probe/`:
- `einstein-before.png` — Einstein already ON
- `einstein-midclick.png`
- `einstein-after.png`
- `agentforce-before.png` — First attempt (incomplete page load)
- `agentforce-before-v2.png` — Second attempt, toggle OFF
- `agentforce-midclick-v2.png` — Mid-click state
- `agentforce-after-v2.png` — Toggle ON, Builder card visible

## Result JSON Files

- `docs/ej4_probe/enable-einstein-result.json` — Einstein already enabled
- `docs/ej4_probe/enable-agentforce-result.json` — First attempt failed (no toggle found)
- `docs/ej4_probe/enable-agentforce-result-v2.json` — Second attempt succeeded

## Blockers

NONE. Both toggles are now ON and verified.

## Next Steps (for Opus)

The org is ready for Phase 2 metadata deploy:
1. Deploy unlocked package with `-o Electra_Ej4`
2. Run seed data scripts
3. Publish + activate the Electra Auto Concierge agent
