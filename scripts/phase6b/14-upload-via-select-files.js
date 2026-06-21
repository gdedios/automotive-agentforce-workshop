// Phase 6b step 14: from current state (Data Type=Files, no files yet),
// click "Select Files...", set 3 PDFs, click modal "Upload" once enabled,
// then click page-level "Upload" to commit to indexing.

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
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

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

    // Open library
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
    await p.screenshot({ path: path.join(SHOTS, '80-detail.png'), fullPage: true });

    // Find ALL <input type=file> in the frame (the lightning-file-upload widget keeps a hidden one)
    const fileInputs = await frame.$$('input[type="file"]');
    console.log('file inputs on detail page:', fileInputs.length);

    if (fileInputs.length === 0) {
      console.error('No file input on detail page — Data Type may not be set');
      process.exit(1);
    }

    // setInputFiles directly on the hidden input — bypasses click-to-open dialog
    console.log('uploading via setInputFiles on hidden input...');
    await fileInputs[0].setInputFiles(PDFS);
    console.log('files set');
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '81-after-set-files.png'), fullPage: true });

    // The "Upload Files" modal should appear with 3 PDFs queued and a blue Upload button
    // Click the modal's Upload button (must be enabled now)
    let modalUploadResult = null;
    for (let i = 0; i < 12; i++) {
      modalUploadResult = await frame.evaluate(() => {
        // Find a button labelled "Upload" inside a modal that is currently NOT disabled
        const queue = [document];
        const visited = new Set();
        while (queue.length) {
          const root = queue.shift();
          if (!root || visited.has(root)) continue;
          visited.add(root);
          let nodes;
          try { nodes = Array.from(root.querySelectorAll('*')); } catch { continue; }
          for (const el of nodes) {
            if (el.tagName === 'BUTTON') {
              const t = (el.textContent || '').trim();
              if (t === 'Upload' && !el.disabled && !el.classList.contains('slds-button_disabled')) {
                // Prefer one inside a modal
                const modal = el.closest && el.closest('section[role="dialog"], .slds-modal');
                if (modal) {
                  el.scrollIntoView({block:'center'});
                  el.click();
                  return { clicked: true, inModal: true };
                }
              }
            }
            if (el.shadowRoot) queue.push(el.shadowRoot);
          }
        }
        // If no modal Upload found, look for ANY enabled Upload
        const queue2 = [document];
        const v2 = new Set();
        while (queue2.length) {
          const root = queue2.shift();
          if (!root || v2.has(root)) continue;
          v2.add(root);
          let nodes;
          try { nodes = Array.from(root.querySelectorAll('button')); } catch { continue; }
          for (const el of nodes) {
            const t = (el.textContent || '').trim();
            if (t === 'Upload' && !el.disabled) {
              el.scrollIntoView({block:'center'});
              el.click();
              return { clicked: true, inModal: false };
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue2.push(el.shadowRoot);
        }
        return { clicked: false };
      });
      if (modalUploadResult.clicked) break;
      console.log('waiting for modal Upload to enable... t+', i*2);
      await sleep(2000);
    }
    console.log('modal Upload click:', modalUploadResult);
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '82-after-modal-upload.png'), fullPage: true });

    // The modal closes; now files should appear in the page table. Wait + screenshot.
    await sleep(5000);
    await p.screenshot({ path: path.join(SHOTS, '83-files-in-table.png'), fullPage: true });

    // Now click the page-level "Upload" button at the bottom of the form (commit to indexing)
    let pageUpload = null;
    for (let i = 0; i < 12; i++) {
      pageUpload = await frame.evaluate(() => {
        const queue = [document];
        const v = new Set();
        while (queue.length) {
          const root = queue.shift();
          if (!root || v.has(root)) continue;
          v.add(root);
          let nodes;
          try { nodes = Array.from(root.querySelectorAll('button')); } catch { continue; }
          for (const el of nodes) {
            const t = (el.textContent || '').trim();
            // skip those inside a modal (modal should be closed now anyway)
            const modal = el.closest && el.closest('section[role="dialog"], .slds-modal');
            if (modal) continue;
            if (t === 'Upload' && !el.disabled) {
              el.scrollIntoView({block:'center'});
              el.click();
              return { clicked: true };
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        }
        return { clicked: false };
      });
      if (pageUpload.clicked) break;
      console.log('waiting for page Upload... t+', i*2);
      await sleep(2000);
    }
    console.log('page Upload click:', pageUpload);
    await sleep(15000);
    await p.screenshot({ path: path.join(SHOTS, '84-after-page-upload.png'), fullPage: true });

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '14-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
