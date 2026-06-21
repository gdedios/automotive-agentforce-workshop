// Continue bootstrap after user completes MFA manually.
// Assumes persistent context at /tmp/cft-electra-fresh-org has the logged-in session.
// Drives Setup → Einstein + Agentforce, captures screenshots.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-fresh-org';
const BASE = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/screenshots';
const BLOCKER_PATH = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/BLOCKER.md';

const DIRS = {
  bootstrap: path.join(BASE, 'phase0_5_org_bootstrap'),
  einstein: path.join(BASE, 'phase0_5_einstein_setup'),
  agentforce: path.join(BASE, 'phase0_5_agentforce_setup'),
};

function writeBlocker(msg) {
  fs.writeFileSync(BLOCKER_PATH, `# BLOCKER — Bootstrap Continuation\n\n${msg}\n\nScript stopped. User action required.\n`);
  console.error('\n>>> BLOCKER WRITTEN <<<\n' + msg);
}

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT,
    headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(20000);

  try {
    console.log('=== checking current session state ===');
    await sleep(2000);
    const url = p.url();
    console.log('current URL:', url);

    // Known org domain from the bootstrap log
    const KNOWN_LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

    // if not on lightning.force.com, navigate directly
    if (!url.includes('lightning.force.com')) {
      console.log('=== on setup host — navigating directly to lightning host ===');
      await p.goto(`${KNOWN_LIGHTNING_HOST}/lightning/page/home`, { waitUntil: 'domcontentloaded' });
      await sleep(8000);
      console.log('=== URL after lightning nav:', p.url());

      // Handle phone/identity interstitial
      if (p.url().includes('identity') || p.url().includes('phone')) {
        console.log('=== Phone/identity interstitial — clicking Skip ===');
        await p.evaluate(() => {
          const all = Array.from(document.querySelectorAll('a,button'));
          const skip = all.find((el) => (el.textContent || '').toLowerCase().includes('skip'));
          if (skip) skip.click();
        });
        await sleep(4000);
        console.log('=== URL after skip:', p.url());
      }

      if (!p.url().includes('lightning.force.com')) {
        await p.screenshot({ path: path.join(DIRS.bootstrap, 'continuation-not-logged-in.png'), fullPage: true });
        writeBlocker(`Session expired or MFA not completed.\n\nCurrent URL: ${p.url()}\nScreenshot: ${path.join(DIRS.bootstrap, 'continuation-not-logged-in.png')}\n\nPlease complete MFA manually in the browser, then re-run this script.`);
        await ctx.close();
        process.exit(2);
      }
    }

    const lightningHost = p.url().includes('lightning.force.com')
      ? new URL(p.url()).origin
      : KNOWN_LIGHTNING_HOST;
    console.log('lightning host:', lightningHost);
    await p.screenshot({ path: path.join(DIRS.bootstrap, '05-home-page.png'), fullPage: false });

    // capture Org ID
    const orgIdMatch = p.url().match(/\/([0-9A-Z]{15,18})\//);
    const orgId = orgIdMatch ? orgIdMatch[1] : 'UNKNOWN';
    console.log('org ID:', orgId);

    // ===== Einstein Setup =====
    console.log('\n=== navigating to Einstein Setup ===');
    const einsteinUrl = `${lightningHost}/lightning/setup/EinsteinSetup/home`;
    await p.goto(einsteinUrl, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    await p.screenshot({ path: path.join(DIRS.einstein, '01-page-loaded.png'), fullPage: true });

    console.log('=== capturing Einstein Setup labels ===');
    const einsteinLabels = await p.evaluate(() => {
      const labels = [];
      document.querySelectorAll('h1,h2,h3,.slds-page-header__title,.slds-text-heading_large,.slds-text-heading_medium').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt) labels.push(`HEADER: ${txt}`);
      });
      document.querySelectorAll('button,a.slds-button,*[role="button"]').forEach((el) => {
        const txt = (el.textContent || '').trim();
        if (txt && (txt.toLowerCase().includes('enable') || txt.toLowerCase().includes('turn on') || txt.toLowerCase().includes('einstein') || txt.toLowerCase().includes('generative'))) {
          labels.push(`BUTTON: ${txt}`);
        }
      });
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

    // ===== Agentforce Agents Setup =====
    console.log('\n=== navigating to Agentforce Agents ===');
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

    // ===== Data Cloud =====
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

    // ===== Summary =====
    console.log('\n=== BOOTSTRAP COMPLETE ===');
    console.log('Lightning host:', lightningHost);
    console.log('Org ID:', orgId);
    console.log('Einstein toggled:', JSON.stringify(einsteinToggled));
    console.log('Agentforce toggled:', JSON.stringify(agentforceToggled));
    console.log('Data Cloud labels:', dataCloudLabels);
    console.log('\nScreenshots saved to:', BASE);
    console.log('\nNext steps for Opus:');
    console.log('1. Run: sf org login web -a Electra_Auto -r https://login.salesforce.com');
    console.log('2. Validate Atlas: sf org list metadata -m AiAuthoringBundle -o Electra_Auto --json');
    console.log('3. Read handoff report: docs/COMPRESSION_phase0_5_bootstrap.md');

    // write summary JSON
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
    await p.screenshot({ path: path.join(DIRS.bootstrap, 'continuation-error.png'), fullPage: true }).catch(() => {});
    writeBlocker(`Script error during continuation:\n\n${err.stack}\n\nLast screenshot: ${path.join(DIRS.bootstrap, 'continuation-error.png')}`);
    process.exit(1);
  } finally {
    console.log('\n=== closing browser ===');
    await ctx.close();
  }
})();
