// Phase 6b step 13: revisit Electra_FAQ_Library detail page, screenshot status of uploaded files.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

async function getSetupFrame(p, maxSeconds = 30) {
  for (let i = 0; i < maxSeconds; i++) {
    const f = p.frames().find(f => /salesforce-setup\.com.*lightning\/setup\//.test(f.url()));
    if (f) return f;
    await sleep(1000);
  }
  return null;
}

(async () => {
  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false, viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--disable-blink-features=AutomationControlled'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(60000);

  try {
    await p.goto(FRONTDOOR, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    await p.goto(`${LIGHTNING_HOST}/lightning/setup/EinsteinDataLibrary/home`, { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    const frame = await getSetupFrame(p);
    console.log('frame:', frame?.url());
    await p.screenshot({ path: path.join(SHOTS, '70-list.png'), fullPage: true });

    // Click Electra FAQ Library
    await frame.evaluate(() => {
      const find = (root, depth) => {
        if (depth > 14 || !root) return null;
        try {
          for (const a of Array.from(root.querySelectorAll('a, button'))) {
            if ((a.textContent || '').trim() === 'Electra FAQ Library') return a;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) { const r = find(el.shadowRoot, depth+1); if (r) return r; }
        } catch {}
        return null;
      };
      const a = find(document, 0);
      if (a) a.click();
    });
    await sleep(10000);
    await p.screenshot({ path: path.join(SHOTS, '71-detail.png'), fullPage: true });

    // Dump table rows + status
    const rows = await frame.evaluate(() => {
      const out = [];
      const collect = (root, depth) => {
        if (depth > 14 || !root) return;
        try {
          for (const t of Array.from(root.querySelectorAll('table'))) {
            for (const r of Array.from(t.querySelectorAll('tr'))) {
              const cells = Array.from(r.querySelectorAll('th, td')).map(c => (c.textContent || '').trim().slice(0, 60));
              if (cells.some(c => /\.pdf|electra/i.test(c))) out.push(cells);
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) collect(el.shadowRoot, depth + 1);
        } catch {}
      };
      collect(document, 0);
      return out;
    });
    console.log('table rows:', JSON.stringify(rows, null, 2));
    fs.writeFileSync(path.join(SHOTS, '71-rows.json'), JSON.stringify(rows, null, 2));

    // Header status
    const header = await frame.evaluate(() => {
      const out = {};
      const find = (root, depth) => {
        if (depth > 14 || !root) return;
        try {
          // Look for "Status" heading and capture sibling badge text
          const headings = Array.from(root.querySelectorAll('*'));
          for (const h of headings) {
            const t = (h.textContent || '').trim();
            if (t === 'Status' && !out.status) {
              // Sibling next-row text
              const parent = h.parentElement;
              if (parent) out.status = (parent.textContent || '').trim().slice(0, 200);
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) find(el.shadowRoot, depth + 1);
        } catch {}
      };
      find(document, 0);
      return out;
    });
    console.log('header:', header);

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '13-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
