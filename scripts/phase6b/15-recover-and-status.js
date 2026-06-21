// Phase 6b step 15: dismiss any open modal, navigate fresh to library detail,
// dump full state — file table rows, status badge.

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
    await p.screenshot({ path: path.join(SHOTS, '90-list.png'), fullPage: true });

    // Probe library list — does Electra FAQ Library still exist? what's its status?
    const libList = await frame.evaluate(() => {
      const out = [];
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const t of Array.from(root.querySelectorAll('table'))) {
            for (const r of Array.from(t.querySelectorAll('tr'))) {
              const cells = Array.from(r.querySelectorAll('th, td')).map(c => (c.textContent || '').trim().slice(0, 80));
              out.push(cells);
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('library list table rows:');
    console.log(JSON.stringify(libList.filter(r => r.length > 0).slice(0, 30), null, 2));
    fs.writeFileSync(path.join(SHOTS, '90-list-rows.json'), JSON.stringify(libList, null, 2));

    // Open library detail
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
    await p.screenshot({ path: path.join(SHOTS, '91-detail.png'), fullPage: true });

    // Probe status + file table
    const detail = await frame.evaluate(() => {
      const out = { status: null, files: [], banners: [] };
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          // Status badge — look for elements following label "Status"
          const labels = Array.from(root.querySelectorAll('*')).filter(e => (e.textContent || '').trim() === 'Status' && (e.children.length === 0 || e.tagName === 'P'));
          for (const lbl of labels) {
            const sib = lbl.nextElementSibling || (lbl.parentElement && lbl.parentElement.nextElementSibling);
            if (sib) {
              const t = (sib.textContent || '').trim().slice(0, 100);
              if (t) out.status = t;
            }
          }
          // File table — pick rows containing .pdf
          for (const t of Array.from(root.querySelectorAll('table'))) {
            for (const r of Array.from(t.querySelectorAll('tr'))) {
              const cells = Array.from(r.querySelectorAll('th, td')).map(c => (c.textContent || '').trim().slice(0, 80));
              if (cells.some(c => /\.pdf|electra/i.test(c))) out.files.push(cells);
            }
          }
          // Error banners
          for (const b of Array.from(root.querySelectorAll('[role="alert"], .slds-notify'))) {
            const t = (b.textContent || '').trim().slice(0, 200);
            if (t) out.banners.push(t);
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('detail probe:', JSON.stringify(detail, null, 2));
    fs.writeFileSync(path.join(SHOTS, '91-detail-probe.json'), JSON.stringify(detail, null, 2));

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
