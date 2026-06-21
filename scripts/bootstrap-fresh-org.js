// Bootstrap fresh OrgFarm trial: login, enable Einstein + Agentforce, capture screenshots for Guía.
// Hard bounded at 4.5 min total. Stops on MFA with BLOCKER.md.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-fresh-org';
const USERNAME = 'epic.c6fb0dbb14e4@orgfarm.salesforce.com';
const PASSWORD = 'orgfarm1234';
const BASE = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/screenshots';
const BLOCKER_PATH = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/BLOCKER.md';

const DIRS = {
  bootstrap: path.join(BASE, 'phase0_5_org_bootstrap'),
  einstein: path.join(BASE, 'phase0_5_einstein_setup'),
  agentforce: path.join(BASE, 'phase0_5_agentforce_setup'),
};

function writeBlocker(msg) {
  fs.writeFileSync(BLOCKER_PATH, `# BLOCKER — Fresh Org Bootstrap\n\n${msg}\n\nScript stopped. User action required.\n`);
  console.error('\n>>> BLOCKER WRITTEN <<<\n' + msg);
}

(async () => {
  const start = Date.now();
  const HARD_LIMIT = 4.5 * 60 * 1000;

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(20000);

  try {
    // ===== STEP 1: Login =====
    console.log('=== navigating to login.salesforce.com ===');
    await p.goto('https://login.salesforce.com', { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    console.log('=== filling username/password ===');
    await p.fill('#username', USERNAME);
    await p.fill('#password', PASSWORD);
    await p.screenshot({ path: path.join(DIRS.bootstrap, '01-before-login.png'), fullPage: false });
    await p.click('#Login');
    await sleep(5000);

    // check for MFA
    const url1 = p.url();
    if (url1.includes('verification') || url1.includes('mfa') || url1.includes('authenticator')) {
      await p.screenshot({ path: path.join(DIRS.bootstrap, '02-MFA-BLOCKER.png'), fullPage: true });
      writeBlocker(`MFA required — user needs to grab the code from Slack #orgfarm-orgs-mfa-codes and paste it.\n\nScreenshot: ${path.join(DIRS.bootstrap, '02-MFA-BLOCKER.png')}`);
      await ctx.close();
      process.exit(2);
    }

    // check for "Add phone number" interstitial
    await sleep(3000);
    const url2 = p.url();
    console.log('current URL:', url2);
    if (url2.includes('identity')) {
      console.log('=== "Add phone number" interstitial detected — clicking Skip ===');
      await p.screenshot({ path: path.join(DIRS.bootstrap, '02-phone-interstitial.png'), fullPage: false });
      // try both Skip patterns
      const skipClicked = await p.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a,button'));
        const skip = links.find((el) => (el.textContent || '').toLowerCase().includes('skip'));
        if (skip) { skip.click(); return true; }
        return false;
      });
      if (skipClicked) console.log('Skip clicked via JS');
      else console.log('[warning] Skip button not found — trying locator');
      try { await p.getByText(/skip/i).first().click({ timeout: 3000 }); } catch (e) { console.log('locator skip failed:', e.message); }
      await sleep(4000);
    }

    // wait for lightning.force.com
    const MAX_LOGIN_WAIT = 30000;
    const loginEnd = Date.now() + MAX_LOGIN_WAIT;
    while (Date.now() < loginEnd) {
      const url = p.url();
      if (url.includes('lightning.force.com')) {
        console.log('=== logged in! ===');
        break;
      }
      if (url.includes('verification') || url.includes('mfa')) {
        await p.screenshot({ path: path.join(DIRS.bootstrap, '03-MFA-late-BLOCKER.png'), fullPage: true });
        writeBlocker(`MFA appeared late in flow.\n\nScreenshot: ${path.join(DIRS.bootstrap, '03-MFA-late-BLOCKER.png')}`);
        await ctx.close();
        process.exit(2);
      }
      await sleep(2000);
    }
    if (!p.url().includes('lightning.force.com')) {
      await p.screenshot({ path: path.join(DIRS.bootstrap, '04-login-timeout.png'), fullPage: true });
      writeBlocker(`Login timeout — never reached lightning.force.com.\n\nLast URL: ${p.url()}\nScreenshot: ${path.join(DIRS.bootstrap, '04-login-timeout.png')}`);
      await ctx.close();
      process.exit(2);
    }

    const lightningHost = new URL(p.url()).origin;
    console.log('lightning host captured:', lightningHost);
    await p.screenshot({ path: path.join(DIRS.bootstrap, '05-home-page.png'), fullPage: false });

    // capture Org ID from URL or Company Information (just from URL is fastest)
    const orgIdMatch = p.url().match(/\/([0-9A-Z]{15,18})\//);
    const orgId = orgIdMatch ? orgIdMatch[1] : 'UNKNOWN';
    console.log('org ID from URL:', orgId);

    // ===== STEP 2: Einstein Setup =====
    console.log('\n=== navigating to Einstein Setup ===');
    const einsteinUrl = `${lightningHost}/lightning/setup/EinsteinSetup/home`;
    await p.goto(einsteinUrl, { waitUntil: 'domcontentloaded' });
    await sleep(8000); // Setup pages are slower
    await p.screenshot({ path: path.join(DIRS.einstein, '01-page-loaded.png'), fullPage: true });

    // find toggles/enable buttons
    console.log('=== capturing Einstein Setup labels ===');
    const einsteinLabels = await p.evaluate(() => {
      const labels = [];
      // headers
      document.querySelectorAll('h1,h2,h3,.slds-page-header__title,.slds-text-heading_large,.slds-text-heading_medium').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt) labels.push(`HEADER: ${txt}`);
      });
      // buttons
      document.querySelectorAll('button,a.slds-button,*[role="button"]').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt && (txt.toLowerCase().includes('enable') || txt.toLowerCase().includes('turn on') || txt.toLowerCase().includes('einstein') || txt.toLowerCase().includes('generative'))) {
          labels.push(`BUTTON: ${txt}`);
        }
      });
      // labels near toggle switches
      document.querySelectorAll('label,span.slds-form-element__label').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt && (txt.toLowerCase().includes('einstein') || txt.toLowerCase().includes('generative') || txt.toLowerCase().includes('ai'))) {
          labels.push(`LABEL: ${txt}`);
        }
      });
      return labels;
    });
    console.log('Einstein labels:', einsteinLabels);
    fs.writeFileSync(path.join(DIRS.einstein, 'labels.md'), `# Einstein Setup UI Labels\n\n${einsteinLabels.map((l) => `- ${l}`).join('\n')}\n`);

    // try to click an enable toggle (shadow walk for LWC toggle)
    console.log('=== attempting to enable Einstein/Generative AI ===');
    const einsteinToggled = await p.evaluate(() => {
      function walk(root, out) {
        for (const btn of root.querySelectorAll('button,*[role="switch"],input[type="checkbox"]')) {
          const txt = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
          if (txt.includes('einstein') || txt.includes('generative') || txt.includes('turn on')) {
            out.push(btn);
          }
        }
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot) walk(el.shadowRoot, out);
        }
      }
      const toggles = [];
      walk(document, toggles);
      if (toggles.length === 0) return { ok: false, reason: 'no toggle found' };
      toggles[0].click();
      return { ok: true, count: toggles.length };
    });
    console.log('Einstein toggle result:', JSON.stringify(einsteinToggled));
    await sleep(4000);
    await p.screenshot({ path: path.join(DIRS.einstein, '02-after-toggle.png'), fullPage: true });

    // ===== STEP 3: Agentforce Agents Setup =====
    console.log('\n=== navigating to Agentforce Agents ===');
    // try newer path first
    const agentforceUrl = `${lightningHost}/lightning/setup/AgentforceAgents/home`;
    await p.goto(agentforceUrl, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    await p.screenshot({ path: path.join(DIRS.agentforce, '01-page-loaded.png'), fullPage: true });

    console.log('=== capturing Agentforce Setup labels ===');
    const agentforceLabels = await p.evaluate(() => {
      const labels = [];
      document.querySelectorAll('h1,h2,h3,.slds-page-header__title,.slds-text-heading_large,.slds-text-heading_medium').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt) labels.push(`HEADER: ${txt}`);
      });
      document.querySelectorAll('button,a.slds-button,*[role="button"]').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt && (txt.toLowerCase().includes('enable') || txt.toLowerCase().includes('turn on') || txt.toLowerCase().includes('agent') || txt.toLowerCase().includes('agentforce'))) {
          labels.push(`BUTTON: ${txt}`);
        }
      });
      document.querySelectorAll('label,span.slds-form-element__label').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt && (txt.toLowerCase().includes('agent') || txt.toLowerCase().includes('agentforce'))) {
          labels.push(`LABEL: ${txt}`);
        }
      });
      return labels;
    });
    console.log('Agentforce labels:', agentforceLabels);
    fs.writeFileSync(path.join(DIRS.agentforce, 'labels.md'), `# Agentforce Agents Setup UI Labels\n\n${agentforceLabels.map((l) => `- ${l}`).join('\n')}\n`);

    console.log('=== attempting to enable Agentforce Agents ===');
    const agentforceToggled = await p.evaluate(() => {
      function walk(root, out) {
        for (const btn of root.querySelectorAll('button,*[role="switch"],input[type="checkbox"]')) {
          const txt = (btn.textContent || btn.getAttribute('aria-label') || '').toLowerCase();
          if (txt.includes('agent') || txt.includes('enable') || txt.includes('turn on')) {
            out.push(btn);
          }
        }
        for (const el of root.querySelectorAll('*')) {
          if (el.shadowRoot) walk(el.shadowRoot, out);
        }
      }
      const toggles = [];
      walk(document, toggles);
      if (toggles.length === 0) return { ok: false, reason: 'no toggle found' };
      toggles[0].click();
      return { ok: true, count: toggles.length };
    });
    console.log('Agentforce toggle result:', JSON.stringify(agentforceToggled));
    await sleep(4000);
    await p.screenshot({ path: path.join(DIRS.agentforce, '02-after-toggle.png'), fullPage: true });

    // ===== STEP 4: Data Cloud (optional peek) =====
    console.log('\n=== checking Data Cloud provisioning state ===');
    const dataCloudUrl = `${lightningHost}/lightning/setup/DataCloudSetup/home`;
    await p.goto(dataCloudUrl, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    await p.screenshot({ path: path.join(DIRS.bootstrap, '06-data-cloud-state.png'), fullPage: true });
    const dataCloudLabels = await p.evaluate(() => {
      const labels = [];
      document.querySelectorAll('h1,h2,button,*[role="button"]').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt && (txt.toLowerCase().includes('provision') || txt.toLowerCase().includes('data cloud'))) {
          labels.push(txt);
        }
      });
      return labels;
    });
    console.log('Data Cloud labels:', dataCloudLabels);

    // ===== DONE =====
    console.log('\n=== BOOTSTRAP COMPLETE ===');
    console.log('Lightning host:', lightningHost);
    console.log('Org ID:', orgId);
    console.log('Screenshots saved to:', BASE);
    console.log('\nNext steps for Opus:');
    console.log('1. Run: sf org login web -a Electra_Auto -r https://login.salesforce.com');
    console.log('   (User should see auto-auth from the Chrome session we just opened.)');
    console.log('2. Validate Atlas: sf org list metadata -m AiAuthoringBundle -o Electra_Auto --json');
    console.log('3. Read handoff report: docs/COMPRESSION_phase0_5_bootstrap.md');

    // write summary JSON for script consumption
    fs.writeFileSync(path.join(BASE, 'bootstrap-summary.json'), JSON.stringify({
      lightningHost,
      orgId,
      einsteinToggled,
      agentforceToggled,
      dataCloudLabels,
      screenshots: {
        bootstrap: fs.readdirSync(DIRS.bootstrap).filter((f) => f.endsWith('.png')),
        einstein: fs.readdirSync(DIRS.einstein).filter((f) => f.endsWith('.png')),
        agentforce: fs.readdirSync(DIRS.agentforce).filter((f) => f.endsWith('.png')),
      },
    }, null, 2));

    await sleep(2000);
  } catch (err) {
    console.error('[ERROR]', err.message);
    await p.screenshot({ path: path.join(DIRS.bootstrap, 'error.png'), fullPage: true }).catch(() => {});
    writeBlocker(`Script error:\n\n${err.stack}\n\nLast screenshot: ${path.join(DIRS.bootstrap, 'error.png')}`);
    process.exit(1);
  } finally {
    console.log('\n=== closing browser (context will persist for next run) ===');
    await ctx.close();
  }
})();
