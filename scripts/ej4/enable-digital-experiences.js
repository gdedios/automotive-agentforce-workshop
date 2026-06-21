#!/usr/bin/env node
/**
 * Enable Digital Experiences (Experience Cloud) in Setup.
 * This must be done BEFORE creating any sites.
 *
 * Org: Electra_Ej4
 */

const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ORG_ALIAS = 'Electra_Ej4';
const PROFILE_DIR = '/tmp/cft-electra-ej4';
const CFT_PATH = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const SCREENSHOT_DIR = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/ej4_probe';

// Ensure screenshot dir exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

function getFrontdoorUrl(sfPath) {
  const result = execFileSync('sf', [
    'org', 'open',
    '-o', ORG_ALIAS,
    '-p', sfPath,
    '--url-only',
    '--json'
  ], { encoding: 'utf8' });
  return JSON.parse(result).result.url;
}

function timestamp() {
  return new Date().toISOString().replace(/:/g, '-').split('.')[0];
}

async function dismissPopups(page) {
  try {
    await page.locator('button:has-text("Dismiss")').click({ timeout: 3000 });
    console.log('✓ Dismissed popup');
    await page.waitForTimeout(1000);
  } catch (e) {
    // No popup, continue
  }
}

async function main() {
  console.log('🚀 Enabling Digital Experiences via Setup...\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: CFT_PATH,
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1400, height: 1000 }
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // Step 1: Navigate to Digital Experiences Settings
    console.log('Step 1: Opening Setup → Digital Experiences → Settings...');
    const settingsUrl = getFrontdoorUrl('lightning/setup/DigitalExperiences/home');
    await page.goto(settingsUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    await dismissPopups(page);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `digexp_01_settings_page_${timestamp()}.png`), fullPage: true });
    console.log('✓ Digital Experiences settings page loaded\n');

    // Step 2: Look for "Enable Digital Experiences" button or toggle
    console.log('Step 2: Looking for enable toggle/button...');

    // Try different selectors
    let enableButton = null;

    // Look for a button with "Enable" text
    const buttons = await page.locator('button').all();
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && (text.includes('Enable') || text.includes('Turn On') || text.includes('Get Started'))) {
        console.log(`Found button: "${text.trim()}"`);
        enableButton = btn;
        break;
      }
    }

    if (enableButton) {
      await enableButton.click();
      console.log('✓ Clicked enable button');
      await page.waitForTimeout(5000);

      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `digexp_02_after_enable_${timestamp()}.png`), fullPage: true });
    } else {
      console.log('⚠️  No enable button found - Digital Experiences may already be enabled or require manual setup');
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `digexp_02_no_button_found_${timestamp()}.png`), fullPage: true });
    }

    // Step 3: Check if there's a confirmation dialog or next steps
    console.log('Step 3: Checking for confirmation or next steps...');
    await page.waitForTimeout(2000);

    // Look for any confirmation buttons
    const confirmButtons = await page.locator('button').all();
    for (const btn of confirmButtons) {
      const text = await btn.textContent();
      if (text && (text.includes('Confirm') || text.includes('Continue') || text.includes('Save') || text.includes('OK'))) {
        console.log(`Found confirmation button: "${text.trim()}"`);
        await btn.click();
        console.log('✓ Clicked confirmation');
        await page.waitForTimeout(3000);
        break;
      }
    }

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `digexp_03_final_state_${timestamp()}.png`), fullPage: true });
    console.log('✓ Digital Experiences enablement process completed\n');

  } catch (error) {
    console.error('❌ Error during Digital Experiences enablement:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `digexp_ERROR_${timestamp()}.png`), fullPage: true });
    throw error;
  } finally {
    await context.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
