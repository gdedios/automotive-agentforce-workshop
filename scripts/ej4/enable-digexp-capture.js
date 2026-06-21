#!/usr/bin/env node
'use strict';

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');

(async () => {
  const profile = '/tmp/cft-electra-ej4';
  const cft = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
  const alias = 'Electra_Ej4';

  // Get frontdoor URL for NetworkSettings
  const setupPath = '/lightning/setup/NetworkSettings/home';
  const frontdoor = JSON.parse(
    execFileSync('sf', ['org', 'open', '-o', alias, '-p', setupPath, '--url-only', '--json'], {encoding:'utf8'})
  ).result.url;

  const context = await chromium.launchPersistentContext(profile, {
    executablePath: cft,
    headless: false,
    viewport: { width: 1400, height: 1000 }
  });

  const page = context.pages()[0] || await context.newPage();

  console.log('[1/6] Navigate to NetworkSettings via frontdoor…');
  await page.goto(frontdoor, { timeout: 90000 });

  // Wait for Lightning to finish loading
  console.log('  Waiting for Lightning to load…');
  await page.waitForFunction(() => {
    return window.location.href.includes('lightning.force.com') ||
           window.location.href.includes('trailsignup');
  }, { timeout: 60000 });

  await page.waitForTimeout(5000);

  // If we're not on Setup, navigate there directly
  const currentUrl = page.url();
  if (!currentUrl.includes('lightning/setup/NetworkSettings')) {
    console.log('  Navigating to Setup page directly…');
    const setupUrl = currentUrl.split('.com')[0] + '.com/lightning/setup/NetworkSettings/home';
    await page.goto(setupUrl, { timeout: 60000 });
    await page.waitForTimeout(5000);
  }

  console.log('[2/6] Find Visualforce iframe containing the checkbox…');
  let frame = null;
  for (let attempt = 0; attempt < 10; attempt++) {
    frame = page.frames().find(f => /_ui\/networks\/setup\/NetworkSetti/.test(f.url()));
    if (frame) break;
    console.log(`  Frame not found, waiting… (${attempt+1}/10)`);
    await page.waitForTimeout(2000);
  }

  if (!frame) {
    console.error('FAILED: VF frame not found after 20s');
    await page.screenshot({path: '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/ej4_probe/digexp2-no-frame.png', fullPage: true});
    await context.close();
    process.exit(1);
  }

  console.log(`  Found frame: ${frame.url()}`);

  console.log('[3/6] Check current checkbox state…');
  const checkboxSel = '#thePage\\:theForm\\:setDomainPB\\:enableNetworkPrefId';
  await frame.waitForSelector(checkboxSel, { timeout: 15000 });

  const wasChecked = await frame.evaluate(sel => {
    return document.querySelector(sel).checked;
  }, checkboxSel);

  console.log(`  Checkbox currently: ${wasChecked ? 'CHECKED' : 'UNCHECKED'}`);

  if (!wasChecked) {
    console.log('[4/6] Clicking checkbox to enable…');
    await frame.click(checkboxSel);
    await page.waitForTimeout(1000);
  } else {
    console.log('[4/6] Checkbox already checked, proceeding to Save…');
  }

  console.log('[5/6] Clicking Save button in frame…');
  const saveBtnSel = 'input[type="button"][value="Save"]';
  await frame.click(saveBtnSel);

  console.log('  Waiting 10s post-Save for any modals/confirmations…');
  await page.waitForTimeout(10000);

  console.log('[6/6] Capturing post-Save state…');
  await page.screenshot({
    path: '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/ej4_probe/digexp2-postsave.png',
    fullPage: true
  });

  // Capture body text from BOTH frames
  const topBodyText = await page.evaluate(() => {
    return document.body.innerText.slice(0, 1500);
  });

  const frameBodyText = await frame.evaluate(() => {
    return document.body.innerText.slice(0, 1500);
  });

  console.log('\n=== TOP FRAME BODY TEXT (first 1500 chars) ===');
  console.log(topBodyText);
  console.log('\n=== VF FRAME BODY TEXT (first 1500 chars) ===');
  console.log(frameBodyText);

  // Check if there's a modal or confirmation button visible
  console.log('\n[PROBE] Checking for follow-up controls…');

  // Check for common modal buttons in top frame
  const topButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, input[type="button"]'));
    return btns
      .filter(b => b.offsetParent !== null) // visible
      .map(b => ({
        text: b.textContent?.trim() || b.value,
        type: b.tagName.toLowerCase()
      }));
  });

  console.log('  Visible buttons in top frame:', JSON.stringify(topButtons, null, 2));

  // Check for additional buttons in VF frame
  const frameButtons = await frame.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, input[type="button"]'));
    return btns
      .filter(b => b.offsetParent !== null)
      .map(b => ({
        text: b.textContent?.trim() || b.value,
        type: b.tagName.toLowerCase()
      }));
  });

  console.log('  Visible buttons in VF frame:', JSON.stringify(frameButtons, null, 2));

  // Re-check checkbox state
  const nowChecked = await frame.evaluate(sel => {
    return document.querySelector(sel).checked;
  }, checkboxSel);

  console.log(`\n[RESULT] Checkbox after Save: ${nowChecked ? 'CHECKED' : 'UNCHECKED'}`);

  // Look for specific follow-up controls
  let followUpFound = false;

  // Check for "Register" or domain-related buttons
  const domainButtons = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, input[type="button"]'));
    return btns
      .filter(b => b.offsetParent !== null && /register|check.*availability|enable|ok|understand|continue/i.test(b.textContent || b.value))
      .map(b => ({
        text: b.textContent?.trim() || b.value,
        selector: b.id ? `#${b.id}` : null
      }));
  });

  if (domainButtons.length > 0) {
    console.log('\n[FOLLOW-UP FOUND] Domain/confirmation buttons detected:');
    console.log(JSON.stringify(domainButtons, null, 2));
    followUpFound = true;

    // Try to click the first one
    const firstBtn = domainButtons[0];
    if (firstBtn.text) {
      console.log(`\nAttempting to click: "${firstBtn.text}"`);
      try {
        await page.click(`text="${firstBtn.text}"`, { timeout: 5000 });
        await page.waitForTimeout(8000);
        await page.screenshot({
          path: '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/ej4_probe/digexp2-final.png',
          fullPage: true
        });
        console.log('  Follow-up action completed, final screenshot saved.');
      } catch (err) {
        console.log(`  Failed to click: ${err.message}`);
      }
    }
  } else {
    console.log('\n[FOLLOW-UP] No obvious domain/confirmation buttons found.');
  }

  // Check for required text fields
  const requiredFields = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input[type="text"][required], input[required]'));
    return inputs
      .filter(i => i.offsetParent !== null && !i.value)
      .map(i => ({
        name: i.name,
        placeholder: i.placeholder,
        id: i.id
      }));
  });

  if (requiredFields.length > 0) {
    console.log('\n[REQUIRED FIELDS FOUND]:');
    console.log(JSON.stringify(requiredFields, null, 2));
    followUpFound = true;
  }

  console.log('\n[COMPLETE] Script finished. Check screenshots and body text above.');
  console.log(`Follow-up control detected: ${followUpFound ? 'YES' : 'NO'}`);

  await context.close();
})();
