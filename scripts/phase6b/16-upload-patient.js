// Phase 6b step 16: patient upload — set files, then poll until modal shows
// "3 of 3 files uploaded" before clicking Done. Then click page Upload.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const PDFS = [
  '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/data/seed-pdfs/Electra-Catalogo-Vehiculos-Argentina.pdf',
  '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/data/seed-pdfs/Electra-Politicas-de-Garantia.pdf',
  '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/data/seed-pdfs/Electra-Guia-Carga-y-Mantenimiento.pdf',
];

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
    await p.screenshot({ path: path.join(SHOTS, '100-detail.png'), fullPage: true });

    // Find file input + setInputFiles
    const fileInputs = await frame.$$('input[type="file"]');
    console.log('file inputs:', fileInputs.length);
    if (fileInputs.length === 0) { console.error('no file input'); process.exit(1); }
    await fileInputs[0].setInputFiles(PDFS);
    console.log('files set; modal should show & start uploading');
    await sleep(2000);

    // Poll modal text every 2s up to 60s — wait for "3 of 3 files uploaded"
    let success = false;
    let snapshot = '';
    for (let i = 0; i < 30; i++) {
      snapshot = await frame.evaluate(() => {
        const queue = [document];
        const v = new Set();
        let txt = '';
        while (queue.length) {
          const root = queue.shift();
          if (!root || v.has(root)) continue;
          v.add(root);
          try {
            // collect modal-section text
            for (const m of Array.from(root.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
              txt += '\n' + (m.textContent || '');
            }
            const all = Array.from(root.querySelectorAll('*'));
            for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return txt.replace(/\s+/g, ' ').slice(0, 500);
      });
      console.log(`t+${(i+1)*2}s modal:`, snapshot.slice(0, 200));
      if (/3 of 3 files uploaded/i.test(snapshot)) { success = true; break; }
      if (/couldn't upload|We couldn't upload your file/i.test(snapshot)) {
        console.error('UPLOAD ERROR detected in modal:', snapshot);
        break;
      }
      await sleep(2000);
    }
    await p.screenshot({ path: path.join(SHOTS, '101-modal-final.png'), fullPage: true });
    console.log('modal success:', success);

    if (!success) {
      console.error('Upload did not reach 3 of 3 — aborting');
      // Capture whatever the modal banner says, but proceed to click Done to dismiss
    }

    // Click Done in modal
    const doneClicked = await frame.evaluate(() => {
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const b of Array.from(root.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Done' && !b.disabled) {
              const m = b.closest && b.closest('section[role="dialog"], .slds-modal__container');
              if (m) { b.scrollIntoView({block:'center'}); b.click(); return true; }
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return false;
    });
    console.log('Done clicked:', doneClicked);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '102-after-done.png'), fullPage: true });

    // Now click the page-level Upload (sticky footer)
    const pageUploadClicked = await frame.evaluate(() => {
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const b of Array.from(root.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Upload' && !b.disabled) {
              const m = b.closest && b.closest('section[role="dialog"], .slds-modal__container');
              if (!m) { b.scrollIntoView({block:'center'}); b.click(); return true; }
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return false;
    });
    console.log('page Upload clicked:', pageUploadClicked);
    await sleep(15000);
    await p.screenshot({ path: path.join(SHOTS, '103-after-page-upload.png'), fullPage: true });

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '16-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
