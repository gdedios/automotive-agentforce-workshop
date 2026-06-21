// Drive Einstein Setup + Agentforce Agents on already-logged-in Chrome context.
// Uses salesforce-setup.com host (after MFA, org lands there, not lightning.force.com).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-fresh-org';
const SETUP_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.my.salesforce-setup.com';
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const BASE = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/screenshots';

const DIRS = {
  bootstrap: path.join(BASE, 'phase0_5_org_bootstrap'),
  einstein: path.join(BASE, 'phase0_5_einstein_setup'),
  agentforce: path.join(BASE, 'phase0_5_agentforce_setup'),
};
Object.values(DIRS).forEach((d) => fs.mkdirSync(d, { recursive: true }));

async function captureLabels(p, keyword) {
  return p.evaluate((kw) => {
    const out = [];
    document.querySelectorAll('h1,h2,h3,h4,label,.slds-page-header__title,button,*[role="switch"],.slds-form-element__label').forEach((el) => {
      const t = (el.textContent || el.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ');
      if (t.length > 2 && t.length < 200) out.push(t);
    });
    return [...new Set(out)].slice(0, 60);
  }, keyword);
}

async function shadowClick(p, keywords) {
  return p.evaluate((kws) => {
    const hits = [];
    function walk(root) {
      for (const el of root.querySelectorAll('button,input[type="checkbox"],*[role="switch"],*[role="button"]')) {
        const txt = ((el.textContent || '') + (el.getAttribute('aria-label') || '')).toLowerCase();
        if (kws.some((k) => txt.includes(k))) {
          hits.push({ tag: el.tagName, txt: (el.textContent || '').trim().slice(0, 80), checked: el.checked });
          el.click();
        }
      }
      for (const child of root.querySelectorAll('*')) if (child.shadowRoot) walk(child.shadowRoot);
    }
    walk(document);
    return hits;
  }, keywords);
}

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false,
    viewport: { width: 1600, height: 1000 }, args: ['--no-first-run'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(30000);

  // ===== EINSTEIN SETUP =====
  console.log('[E1] navigating to Einstein Setup');
  await p.goto(`${SETUP_HOST}/lightning/setup/EinsteinSetup/home`, { waitUntil: 'domcontentloaded' });
  await sleep(10000);
  await p.screenshot({ path: path.join(DIRS.einstein, '01-page-loaded.png'), fullPage: true });
  const einsteinLabels = await captureLabels(p, 'einstein');
  console.log('[E2] labels:', einsteinLabels.slice(0, 15).join(' | '));
  fs.writeFileSync(path.join(DIRS.einstein, 'labels.md'), `# Einstein Setup Labels\n\n${einsteinLabels.map((l) => `- ${l}`).join('\n')}\n`);

  const einsteinClicked = await shadowClick(p, ['einstein', 'generative', 'turn on', 'enable']);
  console.log('[E3] clicked:', JSON.stringify(einsteinClicked));
  await sleep(5000);
  await p.screenshot({ path: path.join(DIRS.einstein, '02-after-toggle.png'), fullPage: true });

  // ===== AGENTFORCE AGENTS =====
  console.log('[A1] navigating to Agentforce Agents');
  await p.goto(`${SETUP_HOST}/lightning/setup/AgentforceAgents/home`, { waitUntil: 'domcontentloaded' });
  await sleep(10000);
  await p.screenshot({ path: path.join(DIRS.agentforce, '01-page-loaded.png'), fullPage: true });
  const agentforceLabels = await captureLabels(p, 'agentforce');
  console.log('[A2] labels:', agentforceLabels.slice(0, 15).join(' | '));
  fs.writeFileSync(path.join(DIRS.agentforce, 'labels.md'), `# Agentforce Agents Setup Labels\n\n${agentforceLabels.map((l) => `- ${l}`).join('\n')}\n`);

  const agentforceClicked = await shadowClick(p, ['agentforce', 'agent', 'enable', 'turn on']);
  console.log('[A3] clicked:', JSON.stringify(agentforceClicked));
  await sleep(5000);
  await p.screenshot({ path: path.join(DIRS.agentforce, '02-after-toggle.png'), fullPage: true });

  // ===== DATA CLOUD (peek) =====
  console.log('[D1] checking Data Cloud');
  await p.goto(`${SETUP_HOST}/lightning/setup/DataCloudSetup/home`, { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '06-data-cloud-state.png'), fullPage: true });
  const dataCloudLabels = await captureLabels(p, 'data cloud');

  // ===== HOME PAGE =====
  console.log('[H1] navigating to Lightning home');
  await p.goto(LIGHTNING_HOST, { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '05-home-page.png'), fullPage: false });

  // Write summary
  const summary = {
    setupHost: SETUP_HOST, lightningHost: LIGHTNING_HOST,
    einsteinLabels, agentforceLabels, dataCloudLabels,
    einsteinClicked, agentforceClicked,
    ts: new Date().toISOString(),
  };
  fs.writeFileSync(path.join(BASE, 'bootstrap-summary.json'), JSON.stringify(summary, null, 2));
  console.log('\n[DONE] Summary written. LightningHost:', LIGHTNING_HOST);
  await sleep(2000);
  await ctx.close();
})();
