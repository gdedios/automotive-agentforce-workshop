// bootstrap-einstein-quickfind.js
// Uses Quick Find to navigate to Einstein/Agentforce settings since direct URL paths return 404.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-fresh-org';
const BASE = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/screenshots';
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const SETUP_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.my.salesforce-setup.com';

const DIRS = {
  bootstrap: path.join(BASE, 'phase0_5_org_bootstrap'),
  einstein: path.join(BASE, 'phase0_5_einstein_setup'),
  agentforce: path.join(BASE, 'phase0_5_agentforce_setup'),
};
Object.values(DIRS).forEach((d) => fs.mkdirSync(d, { recursive: true }));

async function quickFind(p, searchTerm) {
  // Navigate to Setup home on setup host
  const setupUrl = `${SETUP_HOST}/lightning/setup/SetupOneHome/home`;
  await p.goto(setupUrl, { waitUntil: 'domcontentloaded' });
  await sleep(5000);

  // Click into Quick Find
  const qfFilled = await p.evaluate((term) => {
    const qf = document.querySelector('input[placeholder*="Quick Find"],input[placeholder*="Search Setup"],#setupSearch');
    if (qf) {
      qf.focus();
      qf.value = term;
      qf.dispatchEvent(new Event('input', { bubbles: true }));
      qf.dispatchEvent(new Event('keyup', { bubbles: true }));
      return true;
    }
    return false;
  }, searchTerm);
  console.log(`[QuickFind "${searchTerm}"] filled:`, qfFilled);
  await sleep(3000);
  await p.screenshot({ path: path.join(BASE, `quickfind-${searchTerm.replace(/\s+/g, '-')}.png`), fullPage: true });
  return qfFilled;
}

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false,
    viewport: { width: 1600, height: 1000 }, args: ['--no-first-run'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(30000);

  // Verify session
  await p.goto(`${LIGHTNING_HOST}/lightning/page/home`, { waitUntil: 'domcontentloaded' });
  await sleep(5000);
  console.log('[0] session check URL:', p.url());
  await p.screenshot({ path: path.join(DIRS.bootstrap, '08-session-check.png') });

  if (!p.url().includes('lightning.force.com')) {
    console.error('[ERROR] Not authenticated. Run bootstrap-mfa-aware.js first.');
    await ctx.close(); process.exit(1);
  }

  // Check what's in the Setup sidebar - use setup host
  console.log('[1] navigating to Setup home');
  await p.goto(`${SETUP_HOST}/lightning/setup/SetupOneHome/home`, { waitUntil: 'domcontentloaded' });
  await sleep(6000);
  await p.screenshot({ path: path.join(DIRS.einstein, '03-setup-home.png'), fullPage: true });

  // Capture sidebar items
  const sidebarItems = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('.setup-nav a, .slds-nav-list__item a, li a, .setupContainer a').forEach((el) => {
      const txt = (el.textContent || '').trim();
      if (txt.length > 2 && txt.length < 100) out.push(txt);
    });
    return [...new Set(out)].slice(0, 100);
  });
  console.log('[2] Setup sidebar links:', sidebarItems);
  fs.writeFileSync(path.join(DIRS.einstein, 'setup-sidebar.md'), `# Setup Sidebar Links\n\n${sidebarItems.map((l) => `- ${l}`).join('\n')}\n`);

  // Try Quick Find for Einstein
  await quickFind(p, 'Einstein');
  const einsteinLinks = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('a').forEach((el) => {
      const txt = (el.textContent || '').trim();
      if (txt.includes('Einstein') || txt.includes('Generative') || txt.includes('AI')) out.push({ txt, href: el.href });
    });
    return out.slice(0, 20);
  });
  console.log('[3] Einstein links found:', JSON.stringify(einsteinLinks));

  // Try clicking Einstein Setup or Generative AI Setup link
  const einsteinClicked = await p.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const target = links.find((a) => {
      const txt = (a.textContent || '').trim().toLowerCase();
      return txt === 'einstein' || txt === 'generative ai' || txt.includes('einstein setup') || txt.includes('generative ai setup');
    });
    if (target) { target.click(); return target.textContent.trim(); }
    return null;
  });
  console.log('[4] Einstein clicked:', einsteinClicked);
  if (einsteinClicked) {
    await sleep(8000);
    await p.screenshot({ path: path.join(DIRS.einstein, '04-einstein-via-quickfind.png'), fullPage: true });
    console.log('[4] URL:', p.url());
  }

  // Capture Einstein page labels
  const einsteinPageLabels = await p.evaluate(() => {
    const out = new Set();
    function walk(root) {
      root.querySelectorAll('h1,h2,h3,label,button,*[role="switch"]').forEach((el) => {
        if (el.shadowRoot) return;
        const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (t.length > 2 && t.length < 150) out.add(t);
      });
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return [...out].slice(0, 50);
  });
  console.log('[5] Einstein page labels:', einsteinPageLabels);
  fs.writeFileSync(path.join(DIRS.einstein, 'labels-v2.md'), `# Einstein Labels via QuickFind\n\n${einsteinPageLabels.map((l) => `- ${l}`).join('\n')}\n`);

  // Try to toggle Einstein on
  const einsteinToggleResult = await p.evaluate(() => {
    const results = [];
    function walk(root) {
      root.querySelectorAll('button,*[role="switch"],input[type="checkbox"]').forEach((el) => {
        const txt = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase().trim();
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (txt.includes('turn on') || txt.includes('enable') || (el.getAttribute('role') === 'switch')) {
            results.push({ tag: el.tagName, txt: (el.textContent || '').trim().substring(0, 60), checked: el.getAttribute('aria-checked') });
            try { el.click(); } catch (e) {}
          }
        }
      });
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return results;
  });
  console.log('[6] Einstein toggles clicked:', JSON.stringify(einsteinToggleResult));
  await sleep(5000);
  await p.screenshot({ path: path.join(DIRS.einstein, '05-einstein-after-toggle.png'), fullPage: true });

  // Quick Find for Agentforce
  await quickFind(p, 'Agentforce');
  await sleep(3000);
  const agentforceLinks = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('a').forEach((el) => {
      const txt = (el.textContent || '').trim();
      if (txt.toLowerCase().includes('agentforce') || txt.toLowerCase().includes('agent')) out.push({ txt, href: el.href });
    });
    return out.slice(0, 20);
  });
  console.log('[7] Agentforce links:', JSON.stringify(agentforceLinks));

  // Try Agents or Agentforce link
  const agentforceClicked = await p.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a'));
    const target = links.find((a) => {
      const txt = (a.textContent || '').trim().toLowerCase();
      return txt === 'agents' || txt === 'agentforce agents' || txt.includes('agentforce');
    });
    if (target) { target.click(); return target.textContent.trim(); }
    return null;
  });
  console.log('[8] Agentforce clicked:', agentforceClicked);
  if (agentforceClicked) {
    await sleep(8000);
    await p.screenshot({ path: path.join(DIRS.agentforce, '03-agentforce-via-quickfind.png'), fullPage: true });
    console.log('[8] URL:', p.url());
  }

  const agentforcePageLabels = await p.evaluate(() => {
    const out = new Set();
    function walk(root) {
      root.querySelectorAll('h1,h2,h3,label,button,*[role="switch"]').forEach((el) => {
        if (el.shadowRoot) return;
        const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (t.length > 2 && t.length < 150) out.add(t);
      });
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return [...out].slice(0, 50);
  });
  console.log('[9] Agentforce page labels:', agentforcePageLabels);
  fs.writeFileSync(path.join(DIRS.agentforce, 'labels-v2.md'), `# Agentforce Labels via QuickFind\n\n${agentforcePageLabels.map((l) => `- ${l}`).join('\n')}\n`);

  // Toggle Agentforce
  const agentforceToggleResult = await p.evaluate(() => {
    const results = [];
    function walk(root) {
      root.querySelectorAll('button,*[role="switch"],input[type="checkbox"]').forEach((el) => {
        const txt = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase().trim();
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          if (txt.includes('turn on') || txt.includes('enable') || (el.getAttribute('role') === 'switch')) {
            results.push({ tag: el.tagName, txt: (el.textContent || '').trim().substring(0, 60), checked: el.getAttribute('aria-checked') });
            try { el.click(); } catch (e) {}
          }
        }
      });
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return results;
  });
  console.log('[10] Agentforce toggles clicked:', JSON.stringify(agentforceToggleResult));
  await sleep(5000);
  await p.screenshot({ path: path.join(DIRS.agentforce, '04-agentforce-after-toggle.png'), fullPage: true });

  // Check AiAuthoringBundle metadata type
  console.log('[11] checking Agentforce Studio (NEW builder)');
  await p.goto(`${LIGHTNING_HOST}/lightning/n/standard-AgentforceStudio?c__nav=agents`, { waitUntil: 'domcontentloaded' });
  await sleep(12000);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '09-agentforce-studio.png'), fullPage: true });
  const studioLabels = await p.evaluate(() => {
    const out = new Set();
    function walk(root) {
      root.querySelectorAll('h1,h2,h3,button,span,a').forEach((el) => {
        if (el.shadowRoot) return;
        const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (t.length > 2 && t.length < 150) out.add(t);
      });
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return [...out].slice(0, 40);
  });
  console.log('[12] Studio labels:', studioLabels);

  // Update summary
  const summaryPath = path.join(BASE, 'bootstrap-summary.json');
  const existing = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
  const updated = {
    ...existing,
    einsteinLinks,
    einsteinPageLabels,
    einsteinToggleResult,
    agentforceLinks,
    agentforcePageLabels,
    agentforceToggleResult,
    studioLabels,
    einsteinClicked,
    agentforceClicked,
    sidebarItems,
    ts: new Date().toISOString(),
  };
  fs.writeFileSync(summaryPath, JSON.stringify(updated, null, 2));
  console.log('[DONE] Updated bootstrap-summary.json');

  await ctx.close();
  process.exit(0);
})();
