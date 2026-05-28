# BLOCKER — Fresh Org Bootstrap

MFA verification required to complete OrgFarm login.

## Screenshot
See: `/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/screenshots/phase0_5_org_bootstrap/02-MFA-BLOCKER.png`

The verification screen shows:
- Email: `ep**********@******ce.com`
- Verification Code input field
- "Verify" button
- "Don't ask again" checkbox

## User Action Required

1. Check Slack channel `#orgfarm-orgs-mfa-codes` for the verification code (appears 10-30s after login attempt)
2. Return to the Chrome window (should still be open at the MFA prompt)
3. Enter the verification code in the field
4. Check "Don't ask again" checkbox
5. Click "Verify"
6. If "Add phone number" screen appears, click "Skip" or "Skip and don't ask again"

## Continue After MFA

Once you've completed the MFA verification and reached the Salesforce home page, run:

```bash
cd /Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop
node scripts/bootstrap-continue-after-mfa.js
```

This will continue the Setup automation from where we stopped:
- Navigate to Einstein Setup and enable
- Navigate to Agentforce Agents and enable
- Check Data Cloud provisioning state
- Capture all screenshots for the Guía

## OR: Manual Completion

If you prefer to complete Setup manually:

1. Once logged in, navigate to Setup > Einstein Setup
2. Enable "Turn on Einstein" / "Generative AI"
3. Navigate to Setup > Agentforce Agents
4. Enable "Agentforce Agents"
5. Register the org alias: `sf org login web -a Electra_Auto -r https://login.salesforce.com`
6. Validate Atlas: `sf org list metadata -m AiAuthoringBundle -o Electra_Auto --json`

Then report back to Opus with:
- Lightning host URL
- Org ID
- Toggle states (Einstein: ON, Agentforce: ON)
