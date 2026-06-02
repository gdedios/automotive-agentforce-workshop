#!/usr/bin/env bash
# Electra Automotive Workshop — Lead-to-Test-Drive Sales Agent — data reset script
#
# Usage:
#   bash scripts/reset.sh -o <targetOrgAlias>
#
# What this resets:
#   Deletes ALL workshop seeded data:
#     - 5 Vehicle_Model__c records (models)
#     - 3 Account records (dealer concessionarios)
#     - ~30 Test_Drive_Slot__c records (available slots)
#     - ~15 Vehicle_Inventory__c records (dealer inventory)
#     - 3 Lead records (sample leads)
#   Does NOT uninstall metadata (objects, flows, Apex, flexipages, permission set).
#   Idempotent: safe to run on an already-clean org or multiple times.
#
# How to re-seed after reset:
#   Students: App Launcher > Electra Sales Studio > Home > click "Sembrar Datos"
#   CLI: run the seeder via Apex Anonymous (see SESSION_HANDOFF.md)

set -euo pipefail

TARGET_ORG=""
while getopts "o:" opt; do
    case "$opt" in
        o) TARGET_ORG="$OPTARG" ;;
        *) echo "Usage: $0 -o <targetOrgAlias>" >&2; exit 1 ;;
    esac
done

if [ -z "$TARGET_ORG" ]; then
    echo "ERROR: -o <targetOrgAlias> required." >&2
    exit 1
fi

echo "================================================================"
echo "Electra Auto Concierge — Automotive Workshop — Data Reset"
echo "Target org: $TARGET_ORG"
echo "================================================================"

# Gate: verify we can talk to the org
echo ""
echo "[1/2] Verifying org connection..."
sf org display --json -o "$TARGET_ORG" >/dev/null || { echo "Cannot connect to $TARGET_ORG. Run: sf org login web --alias $TARGET_ORG"; exit 1; }

# Step 2: execute the reset via Apex Anonymous (calls the Electra_Workshop_Data_Reset class)
echo "[2/2] Resetting workshop data..."

TEMP_APEX=$(mktemp -t electra-reset.apex.XXXXXX)
cat > "$TEMP_APEX" << 'EOF'
List<Electra_Workshop_Data_Reset.ResetResult> r = Electra_Workshop_Data_Reset.execute(new List<String>{''});
System.debug('RESET_SUMMARY:' + r[0].summary.replace('\n', ' · '));
EOF

APEX_OUT=$(sf apex run --file "$TEMP_APEX" --target-org "$TARGET_ORG" --json 2>/dev/null) || {
    echo "    WARN: Apex execution returned non-zero. Check org logs if reset failed."
}
rm -f "$TEMP_APEX"

# Surface the reset summary (deletion counts) emitted by the Apex debug line.
echo "$APEX_OUT" | python3 -c "
import json,sys,re
try:
    d=json.load(sys.stdin); log=d.get('result',{}).get('logs','')
    m=re.search(r'\|DEBUG\|RESET_SUMMARY:(.*?)\n', log)
    print('    '+m.group(1).strip() if m else '    (no summary returned)')
except Exception:
    print('    (could not parse Apex output)')
"

echo ""
echo "Reset complete."
echo ""
echo "================================================================"
echo "Workshop data has been deleted. Students can re-seed by:"
echo "  1. App Launcher > Electra Sales Studio > Home"
echo "  2. Click 'Sembrar Datos' button"
echo ""
echo "Or re-run the seeder via Apex Anonymous (see SESSION_HANDOFF.md)."
echo "================================================================"
