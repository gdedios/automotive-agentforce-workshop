#!/usr/bin/env node
'use strict';

/**
 * enable-digexp-final.js
 *
 * Enables Digital Experiences (Experience Cloud) in a Salesforce org via Playwright automation.
 *
 * USAGE:
 *   NODE_PATH=/Users/gdedios/.npm/_npx/9833c18b2d85bc59/node_modules node scripts/ej4/enable-digexp-final.js
 *
 * REQUIREMENTS:
 *   - Chrome for Testing at /Users/gdedios/Library/Caches/ms-playwright/chromium-1217/...
 *   - Persistent profile at /tmp/cft-electra-ej4 (must be past first-run MFA interstitials)
 *   - Org alias: Electra_Ej4 (or modify below)
 *
 * WHAT IT DOES:
 *   1. Navigates to Setup → Digital Experiences → Settings via frontdoor URL
 *   2. Finds the Visualforce iframe containing the "Enable Digital Experiences" checkbox
 *   3. Checks the box if unchecked
 *   4. Clicks Save
 *   5. Verifies enablement via CLI metadata check
 *
 * EXIT CODES:
 *   0 = Success (Digital Experiences enabled)
 *   1 = Failure (VF frame not found, checkbox not found, or metadata check failed)
 */

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');

const ORG_ALIAS = 'Electra_Ej4';
const PROFILE_DIR = '/tmp/cft-electra-ej4';
const CFT_PATH = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';

(async () => {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ENABLE DIGITAL EXPERIENCES VIA PLAYWRIGHT');
  console.log('═══════════════════════════════════════════════════════════════\n');

  // Step 1: Get frontdoor URL
  console.log('[1/5] Generating frontdoor URL…');
  const setupPath = '/lightning/setup/NetworkSettings/home';
  const frontdoor = JSON.parse(
    execFileSync('sf', ['org', 'open', '-o', ORG_ALIAS, '-p', setupPath, '--url-only', '--json'], {encoding:'utf8'})
  ).result.url;
  console.log(`  → ${frontdoor.split('?')[0]}…\n`);

  // Step 2: Launch browser
  console.log('[2/5] Launching Chrome for Testing…');
  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    executablePath: CFT_PATH,
    headless: false,
    viewport: { width: 1400, height: 1000 }
  });
  const page = context.pages()[0] || await context.newPage();

  // Step 3: Navigate
  console.log('[3/5] Navigating to Digital Experiences Settings…');
  await page.goto(frontdoor, { timeout: 90000 });

  await page.waitForFunction(() => {
    return window.location.href.includes('lightning.force.com') ||
           window.location.href.includes('trailsignup');
  }, { timeout: 60000 });

  await page.waitForTimeout(5000);

  // Ensure we're on the Setup page
  const currentUrl = page.url();
  if (!currentUrl.includes('lightning/setup/NetworkSettings')) {
    const setupUrl = currentUrl.split('.com')[0] + '.com/lightning/setup/NetworkSettings/home';
    await page.goto(setupUrl, { timeout: 60000 });
    await page.waitForTimeout(5000);
  }

  // Step 4: Find VF iframe and enable
  console.log('[4/5] Finding Visualforce iframe with Digital Experiences controls…');
  let frame = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    frame = page.frames().find(f => /_ui\/networks\/setup\/NetworkSetti/.test(f.url()));
    if (frame) break;
    console.log(`  ⏳ Frame not loaded yet, retrying… (${attempt+1}/10)`);
    await page.waitForTimeout(2000);
  }

  if (!frame) {
    console.error('\n❌ FAILED: Visualforce iframe not found after 20s.');
    console.error('   This usually means My Domain is not deployed or Setup page failed to load.\n');
    await context.close();
    process.exit(1);
  }

  console.log(`  ✓ Found iframe: ${frame.url()}\n`);

  console.log('  Checking current state of "Enable Digital Experiences" checkbox…');
  const checkboxSel = '#thePage\\:theForm\\:setDomainPB\\:enableNetworkPrefId';

  try {
    await frame.waitForSelector(checkboxSel, { timeout: 15000 });
  } catch (err) {
    console.error('\n❌ FAILED: Checkbox not found in VF frame.');
    console.error('   Selector:', checkboxSel);
    console.error('   This may indicate a Salesforce UI change.\n');
    await context.close();
    process.exit(1);
  }

  const wasChecked = await frame.evaluate(sel => {
    return document.querySelector(sel).checked;
  }, checkboxSel);

  if (wasChecked) {
    console.log('  ✓ Checkbox already checked — Digital Experiences may already be enabled.\n');
  } else {
    console.log('  → Checkbox unchecked. Clicking to enable…');
    await frame.click(checkboxSel);
    await page.waitForTimeout(1500);
    console.log('  ✓ Checkbox clicked.\n');
  }

  console.log('  Clicking Save button…');
  const saveBtnSel = 'input[type="button"][value="Save"]';
  await frame.click(saveBtnSel);
  console.log('  ⏳ Waiting 10s for server-side commit…\n');
  await page.waitForTimeout(10000);

  const nowChecked = await frame.evaluate(sel => {
    return document.querySelector(sel).checked;
  }, checkboxSel);

  if (!nowChecked) {
    console.error('❌ WARNING: Checkbox unchecked after Save. Enablement may have failed.');
    console.error('   Check the Setup page for error messages.\n');
  } else {
    console.log('  ✓ Checkbox remains checked after Save.\n');
  }

  await context.close();

  // Step 5: Verify via CLI
  console.log('[5/5] Verifying enablement via metadata check…');
  let metadataResult;
  try {
    metadataResult = JSON.parse(
      execFileSync('sf', ['org', 'list', 'metadata', '-m', 'DigitalExperienceConfig', '-o', ORG_ALIAS, '--json'], {encoding:'utf8'})
    );
  } catch (err) {
    console.error('❌ FAILED: CLI metadata check errored.');
    console.error(err.message);
    process.exit(1);
  }

  if (metadataResult.status !== 0) {
    console.error('❌ FAILED: sf org list metadata returned non-zero status.');
    console.error(JSON.stringify(metadataResult, null, 2));
    process.exit(1);
  }

  // Success if result is an array (even if empty) and no INVALID_TYPE error
  if (Array.isArray(metadataResult.result)) {
    console.log('  ✓ DigitalExperienceConfig metadata type is available.');
    console.log('  ✓ Digital Experiences is ENABLED.\n');
  } else {
    console.error('❌ FAILED: Metadata check returned unexpected structure.');
    console.error(JSON.stringify(metadataResult, null, 2));
    process.exit(1);
  }

  // Bonus: check for auto-created Brand_Center site
  let bundleResult;
  try {
    bundleResult = JSON.parse(
      execFileSync('sf', ['org', 'list', 'metadata', '-m', 'DigitalExperienceBundle', '-o', ORG_ALIAS, '--json'], {encoding:'utf8'})
    );
    if (bundleResult.result && bundleResult.result.length > 0) {
      console.log('  ✓ Auto-created default site found:', bundleResult.result[0].fullName);
    }
  } catch (err) {
    // Non-critical, don't fail the script
  }

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ SUCCESS: Digital Experiences enabled');
  console.log('═══════════════════════════════════════════════════════════════\n');
  console.log('Next steps:');
  console.log('  1. Deploy your DigitalExperienceBundle metadata');
  console.log('  2. Publish the site: sf community publish --name "<Site Name>"');
  console.log('  3. Configure guest user permissions for MIAW\n');
})();
