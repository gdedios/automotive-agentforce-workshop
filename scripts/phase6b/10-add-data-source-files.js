// Phase 6b step 10: on Electra_FAQ_Library detail page, pick Data Type → Files,
// then upload 3 PDFs and wait for indexing.

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

async function clickByText(target, text, opts = {}) {
  return await target.evaluate(({ text, exact }) => {
    const findInRoot = (root, depth) => {
      if (depth > 14 || !root) return null;
      try {
        const direct = Array.from(root.querySelectorAll('button, a, [role="button"], [role="option"], [role="combobox"], lightning-button, lightning-base-combobox-item, li'));
        for (const b of direct) {
          const t = (b.textContent || '').trim();
          const aria = b.getAttribute('aria-label') || '';
          if (exact) {
            if (t === text || aria === text) return b;
          } else {
            if (t === text || aria === text || (t.length < 80 && t.includes(text))) return b;
          }
        }
        const all = Array.from(root.querySelectorAll('*'));
        for (const el of all) {
          if (el.shadowRoot) {
            const r = findInRoot(el.shadowRoot, depth + 1);
            if (r) return r;
          }
        }
      } catch {}
      return null;
    };
    const t = findInRoot(document, 0);
    if (t) {
      t.scrollIntoView({ block: 'center' });
      t.click();
      return { clicked: true, tag: t.tagName, text: (t.textContent || '').trim().slice(0, 80) };
    }
    return { clicked: false };
  }, { text, exact: !!opts.exact });
}

async function listComboboxOptions(target) {
  return await target.evaluate(() => {
    const out = [];
    const collect = (root, depth) => {
      if (depth > 14 || !root) return;
      try {
        const opts = Array.from(root.querySelectorAll('[role="option"], lightning-base-combobox-item, lightning-combobox-item, .slds-listbox__option'));
        for (const o of opts) {
          const t = (o.textContent || '').trim();
          if (t && t.length < 80) out.push(t);
        }
        const all = Array.from(root.querySelectorAll('*'));
        for (const el of all) if (el.shadowRoot) collect(el.shadowRoot, depth + 1);
      } catch {}
    };
    collect(document, 0);
    return Array.from(new Set(out));
  });
}

async function findFileInputs(target) {
  // Walk shadow DOM for any <input type="file"> — we then call setInputFiles via Playwright
  return await target.evaluate(() => {
    const out = [];
    const collect = (root, depth) => {
      if (depth > 14 || !root) return;
      try {
        const ins = Array.from(root.querySelectorAll('input[type="file"]'));
        for (const i of ins) out.push({
          accept: i.accept || '',
          multiple: !!i.multiple,
          name: i.name || '',
          id: i.id || '',
        });
        const all = Array.from(root.querySelectorAll('*'));
        for (const el of all) if (el.shadowRoot) collect(el.shadowRoot, depth + 1);
      } catch {}
    };
    collect(document, 0);
    return out;
  });
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

    // Library list page — click "Electra FAQ Library" to open detail (in case we're not already there)
    const setupFrame = await getSetupFrame(p);
    console.log('setup frame URL:', setupFrame?.url());
    await p.screenshot({ path: path.join(SHOTS, '40-list.png'), fullPage: true });

    const openLib = await clickByText(setupFrame, 'Electra FAQ Library');
    console.log('open lib click:', JSON.stringify(openLib).slice(0, 400));
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '41-detail.png'), fullPage: true });

    // Click the Data Type combobox
    const dtClick = await clickByText(setupFrame, 'Select a data type...');
    console.log('Data Type combobox click:', JSON.stringify(dtClick).slice(0, 400));
    await sleep(2000);
    const opts = await listComboboxOptions(setupFrame);
    console.log('Data Type options:', opts);
    fs.writeFileSync(path.join(SHOTS, '42-data-type-options.json'), JSON.stringify(opts, null, 2));
    await p.screenshot({ path: path.join(SHOTS, '42-options-open.png'), fullPage: true });

    // Pick "Files" (or fallback "Knowledge & Files" / "Knowledge")
    let dtPick = await clickByText(setupFrame, 'Files', { exact: true });
    if (!dtPick.clicked) dtPick = await clickByText(setupFrame, 'Files');
    console.log('Data Type pick:', JSON.stringify(dtPick).slice(0, 400));
    await sleep(5000);
    await p.screenshot({ path: path.join(SHOTS, '43-after-data-type.png'), fullPage: true });

    // Find file input — Salesforce file uploaders use lightning-file-upload with hidden <input type=file>
    const fileInputs = await findFileInputs(setupFrame);
    console.log('file inputs:', fileInputs);

    // Use Playwright frame-level locator to find ALL input[type=file] across frames
    const fiHandles = await setupFrame.$$('input[type="file"]');
    console.log('file input handles in frame:', fiHandles.length);
    if (fiHandles.length === 0) {
      // Sometimes there's a Continue or Next button before the upload widget appears
      let cont = await clickByText(setupFrame, 'Continue');
      if (!cont.clicked) cont = await clickByText(setupFrame, 'Next');
      if (!cont.clicked) cont = await clickByText(setupFrame, 'Save');
      console.log('post-data-type continue:', JSON.stringify(cont).slice(0, 400));
      await sleep(6000);
      await p.screenshot({ path: path.join(SHOTS, '44-after-continue.png'), fullPage: true });
    }

    // Re-attempt: get fresh handle list
    const fiHandles2 = await setupFrame.$$('input[type="file"]');
    console.log('file input handles after continue:', fiHandles2.length);

    if (fiHandles2.length > 0) {
      // Upload all 3 PDFs to the first file input
      try {
        await fiHandles2[0].setInputFiles(PDFS);
        console.log('setInputFiles done with 3 PDFs');
      } catch (err) {
        console.error('setInputFiles error:', err.message);
        // Try one at a time
        for (const pdf of PDFS) {
          try { await fiHandles2[0].setInputFiles(pdf); console.log('uploaded', path.basename(pdf)); await sleep(3000); }
          catch (e) { console.error('upload err:', e.message); }
        }
      }
      await sleep(15000);
      await p.screenshot({ path: path.join(SHOTS, '45-after-upload.png'), fullPage: true });

      // Click Save / Confirm / Submit / Add
      let confirm = await clickByText(setupFrame, 'Save');
      if (!confirm.clicked) confirm = await clickByText(setupFrame, 'Add');
      if (!confirm.clicked) confirm = await clickByText(setupFrame, 'Submit');
      if (!confirm.clicked) confirm = await clickByText(setupFrame, 'Done');
      console.log('confirm click:', JSON.stringify(confirm).slice(0, 400));
      await sleep(15000);
      await p.screenshot({ path: path.join(SHOTS, '46-after-confirm.png'), fullPage: true });
    } else {
      console.error('NO file input found after Data Type selection');
      await p.screenshot({ path: path.join(SHOTS, '44-no-file-input.png'), fullPage: true });
    }

    console.log('done; setup frame URL:', setupFrame.url());
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '10-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
