// Search Setup Quick Find for "Agentforce" and capture the menu items.
// This finds the real URL after Einstein is enabled (it should reveal more).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-toggles-v2';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_enable', 'qf');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function frontdoor(p) {
  return JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', p, '--json'], { encoding: 'utf8' })).result.url;
}

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT, headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--no-first-run'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  page.setDefaultTimeout(30000);

  // Navigate to a known-good Setup page first
  await page.goto(frontdoor('/lightning/setup/SetupOneHome/home'), { waitUntil: 'domcontentloaded' });
  await sleep(20000);
  await page.screenshot({ path: path.join(OUT_DIR, '01-setup-home.png'), fullPage: false });

  // Type into Quick Find
  const qfResult = await page.evaluate(async () => {
    function deepFindInput(root, sel, predicate) {
      for (const n of root.querySelectorAll(sel)) {
        if (!predicate || predicate(n)) return n;
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) {
          const r = deepFindInput(n.shadowRoot, sel, predicate);
          if (r) return r;
        }
      }
      return null;
    }
    const qf = deepFindInput(document, 'input', (i) => {
      const ph = (i.placeholder || '').toLowerCase();
      const aria = (i.getAttribute('aria-label') || '').toLowerCase();
      return ph.includes('quick find') || aria.includes('quick find');
    });
    if (!qf) return { found: false };
    qf.focus();
    qf.value = 'agentforce';
    qf.dispatchEvent(new Event('input', { bubbles: true }));
    qf.dispatchEvent(new Event('change', { bubbles: true }));
    return { found: true };
  });
  console.log('[qf] input:', qfResult);
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT_DIR, '02-qf-agentforce.png'), fullPage: false });

  // Capture menu items shown
  const menuItems = await page.evaluate(() => {
    const items = [];
    function walk(root) {
      for (const a of root.querySelectorAll('a')) {
        const t = (a.innerText || a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        if (t && (t.toLowerCase().includes('agentforce') || t.toLowerCase().includes('einstein') || t.toLowerCase().includes('agent') || t.toLowerCase().includes('copilot') || href.toLowerCase().includes('agent') || href.toLowerCase().includes('einstein')) && t.length < 100) {
          items.push({ text: t, href });
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return [...new Set(items.map((i) => `${i.text} → ${i.href}`))].slice(0, 40);
  });
  console.log('[qf] items:');
  menuItems.forEach((m) => console.log('  ', m));

  fs.writeFileSync(path.join(OUT_DIR, 'qf-results.json'), JSON.stringify({ qfResult, menuItems }, null, 2));

  // Now search for "einstein" too
  const qfEinstein = await page.evaluate(() => {
    function deepFindInput(root, sel, predicate) {
      for (const n of root.querySelectorAll(sel)) {
        if (!predicate || predicate(n)) return n;
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) {
          const r = deepFindInput(n.shadowRoot, sel, predicate);
          if (r) return r;
        }
      }
      return null;
    }
    const qf = deepFindInput(document, 'input', (i) => {
      const ph = (i.placeholder || '').toLowerCase();
      const aria = (i.getAttribute('aria-label') || '').toLowerCase();
      return ph.includes('quick find') || aria.includes('quick find');
    });
    if (!qf) return { found: false };
    qf.focus();
    qf.value = 'einstein';
    qf.dispatchEvent(new Event('input', { bubbles: true }));
    return { found: true };
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(OUT_DIR, '03-qf-einstein.png'), fullPage: false });

  const einMenuItems = await page.evaluate(() => {
    const items = [];
    function walk(root) {
      for (const a of root.querySelectorAll('a')) {
        const t = (a.innerText || a.textContent || '').trim();
        const href = a.getAttribute('href') || '';
        if (t && t.length < 100 && (t.toLowerCase().includes('einstein') || t.toLowerCase().includes('agent') || t.toLowerCase().includes('ai') || t.toLowerCase().includes('copilot'))) {
          items.push({ text: t, href });
        }
      }
      for (const n of root.querySelectorAll('*')) {
        if (n.shadowRoot) walk(n.shadowRoot);
      }
    }
    walk(document);
    return [...new Set(items.map((i) => `${i.text} → ${i.href}`))].slice(0, 60);
  });
  console.log('\n[qf einstein] items:');
  einMenuItems.forEach((m) => console.log('  ', m));

  fs.writeFileSync(path.join(OUT_DIR, 'qf-einstein-results.json'), JSON.stringify({ qfEinstein, einMenuItems }, null, 2));

  console.log('\n[done]');
  await sleep(2000);
  await ctx.close();
})();
