#!/usr/bin/env node
/**
 * Probe Setup UI to find where Digital Experiences / Sites can be enabled.
 * Try multiple Quick Find searches and screenshot results.
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
    await page.waitForTimeout(1000);
  } catch (e) {
    // No popup
  }
}

async function searchQuickFind(page, searchTerm, screenshotLabel) {
  console.log(`\nSearching Quick Find for: "${searchTerm}"...`);
  
  const quickFind = page.locator('input[placeholder="Quick Find"]');
  await quickFind.clear();
  await quickFind.fill(searchTerm);
  await page.waitForTimeout(2000);
  
  await page.screenshot({ 
    path: path.join(SCREENSHOT_DIR, `probe_${screenshotLabel}_${timestamp()}.png`), 
    fullPage: true 
  });
  
  console.log(`✓ Screenshot saved for "${searchTerm}"`);
}

async function main() {
  console.log('🔍 Probing Setup navigation for Digital Experiences...\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: CFT_PATH,
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1400, height: 1000 }
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // Navigate to Setup home
    console.log('Opening Setup home...');
    const setupUrl = getFrontdoorUrl('lightning/setup/SetupOneHome/home');
    await page.goto(setupUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000);
    await dismissPopups(page);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `probe_00_setup_home_${timestamp()}.png`), fullPage: true });

    // Try multiple search terms
    await searchQuickFind(page, 'Sites', '01_sites');
    await searchQuickFind(page, 'Communities', '02_communities');
    await searchQuickFind(page, 'Experience Cloud', '03_experience_cloud');
    await searchQuickFind(page, 'Digital Experiences', '04_digital_experiences');
    await searchQuickFind(page, 'All Sites', '05_all_sites');
    await searchQuickFind(page, 'Feature', '06_feature');

    console.log('\n✅ Probe complete. Check screenshots to find the right navigation path.');

  } catch (error) {
    console.error('❌ Error during probe:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `probe_ERROR_${timestamp()}.png`), fullPage: true });
    throw error;
  } finally {
    await context.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
