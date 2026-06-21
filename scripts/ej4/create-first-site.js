#!/usr/bin/env node
/**
 * Create the FIRST Experience Cloud site in a fresh org via Setup UI.
 * This satisfies the first-site gate required before CLI/metadata can deploy sites.
 *
 * Org: Electra_Ej4
 * Site name: Electra Customer Portal
 * Template: Build Your Own (LWR)
 * URL path: electra
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

async function waitForLightning(page) {
  // Wait until URL contains lightning.force.com (NOT setup host, NOT login, NOT identity verification)
  await page.waitForFunction(() => {
    return window.location.hostname.includes('lightning.force.com') &&
           !window.location.pathname.includes('identity/verification');
  }, { timeout: 90000 });
}

async function dismissPopups(page) {
  // Dismiss any "Try the new..." or Field Service Setup popups
  try {
    await page.locator('button:has-text("Dismiss")').click({ timeout: 3000 });
    console.log('✓ Dismissed popup');
    await page.waitForTimeout(1000);
  } catch (e) {
    // No popup, continue
  }
}

async function findInFrames(page, selector, options = {}) {
  // Try main frame first
  const mainLocator = page.locator(selector);
  if (await mainLocator.count() > 0) {
    return mainLocator.first();
  }

  // Try all frames
  for (const frame of page.frames()) {
    try {
      const frameLocator = frame.locator(selector);
      if (await frameLocator.count() > 0) {
        console.log(`Found selector in frame: ${frame.url()}`);
        return frameLocator.first();
      }
    } catch (e) {
      // Frame may be detached, continue
    }
  }

  if (options.throwIfNotFound) {
    throw new Error(`Could not find selector in any frame: ${selector}`);
  }
  return null;
}

async function main() {
  console.log('🚀 Creating first Experience Cloud site via Setup UI...\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    executablePath: CFT_PATH,
    args: ['--disable-blink-features=AutomationControlled'],
    viewport: { width: 1400, height: 1000 }
  });

  const page = context.pages()[0] || await context.newPage();

  try {
    // Step 1: Navigate to Setup, then to All Sites
    console.log('Step 1: Opening Setup...');
    const setupUrl = getFrontdoorUrl('lightning/setup/SetupOneHome/home');
    await page.goto(setupUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(5000); // Wait for Setup to load

    console.log('Step 1b: Navigating to Digital Experiences → All Sites...');
    // Use Quick Find to navigate to All Sites
    const quickFind = page.locator('input[placeholder="Quick Find"]');
    await quickFind.fill('Digital Experiences');
    await page.waitForTimeout(1500);

    // Click "All Sites" link in the sidebar
    await page.locator('a:has-text("All Sites")').click();
    await page.waitForTimeout(4000); // Let All Sites page load
    await dismissPopups(page);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `01_all_sites_page_${timestamp()}.png`), fullPage: true });
    console.log('✓ All Sites page loaded\n');

    // Step 2: Click New button
    console.log('Step 2: Clicking New button...');
    const newButton = await findInFrames(page, 'button:has-text("New")', { throwIfNotFound: true });
    await newButton.click();
    await page.waitForTimeout(5000); // Wait for gallery to load

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `02_after_new_click_${timestamp()}.png`), fullPage: true });
    console.log('✓ New button clicked, waiting for template gallery...\n');

    // Step 3: Find and select "Build Your Own (LWR)" template
    console.log('Step 3: Looking for "Build Your Own (LWR)" template...');

    // The gallery may be in an iframe or shadow DOM. Try multiple strategies:
    let lwrCard = null;

    // Strategy A: Plain getByText in frames
    for (const frame of page.frames()) {
      try {
        const card = frame.getByText('Build Your Own (LWR)', { exact: false });
        if (await card.count() > 0) {
          console.log(`Found LWR template card via getByText in frame: ${frame.url()}`);
          lwrCard = card.first();
          break;
        }
      } catch (e) {
        // Continue
      }
    }

    // Strategy B: Shadow DOM walk
    if (!lwrCard) {
      console.log('Trying shadow DOM walk...');
      lwrCard = await page.evaluateHandle(() => {
        function* walk(root) {
          const pending = [root];
          while (pending.length) {
            const node = pending.pop();
            yield node;
            if (node.shadowRoot) {
              pending.push(...node.shadowRoot.querySelectorAll('*'));
            }
            pending.push(...node.querySelectorAll('*'));
          }
        }

        for (const el of walk(document.body)) {
          const text = el.textContent || '';
          if (text.includes('Build Your Own') && text.includes('LWR')) {
            return el;
          }
        }
        return null;
      });

      if (lwrCard && await lwrCard.evaluate(el => el !== null)) {
        console.log('Found LWR template card via shadow DOM walk');
      } else {
        lwrCard = null;
      }
    }

    if (!lwrCard) {
      throw new Error('Could not find "Build Your Own (LWR)" template card in any frame or shadow DOM');
    }

    // Click the card
    if (lwrCard.asElement) {
      await lwrCard.asElement().click();
    } else {
      await lwrCard.click();
    }
    console.log('✓ LWR template card clicked');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `03_lwr_selected_${timestamp()}.png`), fullPage: true });

    // Step 4: Click "Get Started" button
    console.log('Step 4: Clicking Get Started...');
    const getStartedButton = await findInFrames(page, 'button:has-text("Get Started")', { throwIfNotFound: true });
    await getStartedButton.click();
    await page.waitForTimeout(3000); // Wait for form to appear

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `04_after_get_started_${timestamp()}.png`), fullPage: true });
    console.log('✓ Get Started clicked, waiting for form...\n');

    // Step 5: Fill in Name and URL fields
    console.log('Step 5: Filling in site details...');

    // Find and fill Name field (may be in shadow DOM)
    const nameInput = await page.evaluateHandle(() => {
      function* walk(root) {
        const pending = [root];
        while (pending.length) {
          const node = pending.pop();
          yield node;
          if (node.shadowRoot) {
            pending.push(...node.shadowRoot.querySelectorAll('*'));
          }
          pending.push(...node.querySelectorAll('*'));
        }
      }

      for (const el of walk(document.body)) {
        if (el.tagName === 'INPUT' &&
            (el.placeholder?.toLowerCase().includes('name') ||
             el.getAttribute('aria-label')?.toLowerCase().includes('name'))) {
          return el;
        }
      }
      return null;
    });

    if (nameInput && await nameInput.evaluate(el => el !== null)) {
      await nameInput.asElement().fill('Electra Customer Portal');
      console.log('✓ Name field filled: Electra Customer Portal');
    } else {
      // Fallback: try visible input fields
      const inputs = await page.locator('input[type="text"]').all();
      if (inputs.length > 0) {
        await inputs[0].fill('Electra Customer Portal');
        console.log('✓ Name field filled (fallback): Electra Customer Portal');
      }
    }

    await page.waitForTimeout(1000);

    // Find and fill URL field
    const urlInput = await page.evaluateHandle(() => {
      function* walk(root) {
        const pending = [root];
        while (pending.length) {
          const node = pending.pop();
          yield node;
          if (node.shadowRoot) {
            pending.push(...node.shadowRoot.querySelectorAll('*'));
          }
          pending.push(...node.querySelectorAll('*'));
        }
      }

      for (const el of walk(document.body)) {
        if (el.tagName === 'INPUT' &&
            (el.placeholder?.toLowerCase().includes('url') ||
             el.getAttribute('aria-label')?.toLowerCase().includes('url'))) {
          return el;
        }
      }
      return null;
    });

    if (urlInput && await urlInput.evaluate(el => el !== null)) {
      await urlInput.asElement().fill('electra');
      console.log('✓ URL field filled: electra');
    } else {
      // Fallback: try second input field
      const inputs = await page.locator('input[type="text"]').all();
      if (inputs.length > 1) {
        await inputs[1].fill('electra');
        console.log('✓ URL field filled (fallback): electra');
      }
    }

    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `05_form_filled_${timestamp()}.png`), fullPage: true });

    // Step 6: Click Create button
    console.log('Step 6: Clicking Create...');
    const createButton = await findInFrames(page, 'button:has-text("Create")', { throwIfNotFound: true });
    await createButton.click();
    console.log('✓ Create button clicked, waiting for provisioning...');

    // Wait for provisioning (can take 30-90s)
    await page.waitForTimeout(60000); // Give it a full minute

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `06_after_create_${timestamp()}.png`), fullPage: true });
    console.log('✓ Site provisioning completed (or redirected to Builder)\n');

    // Step 7: Return to All Sites and verify
    console.log('Step 7: Returning to All Sites to verify...');
    // Navigate back via Quick Find
    const quickFind2 = page.locator('input[placeholder="Quick Find"]');
    await quickFind2.fill('Digital Experiences');
    await page.waitForTimeout(1500);
    await page.locator('a:has-text("All Sites")').click();
    await page.waitForTimeout(5000); // Let the list load

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `07_all_sites_after_create_${timestamp()}.png`), fullPage: true });
    console.log('✓ All Sites page reloaded\n');

    console.log('✅ Site creation wizard completed. Check screenshots and validation query.');

  } catch (error) {
    console.error('❌ Error during site creation:', error.message);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `ERROR_${timestamp()}.png`), fullPage: true });
    throw error;
  } finally {
    await context.close();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
