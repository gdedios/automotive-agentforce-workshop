// Phase 6b step 17: delete broken Electra FAQ Library, create fresh, upload 3 PDFs.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

const LIBRARY_NAME = 'Electra FAQ Library';
const LIBRARY_DESC = 'Electra Auto Concierge knowledge — catálogo, garantías, guía de carga y mantenimiento.';
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

async function clickFirstByText(target, text) {
  return await target.evaluate((args) => {
    const { text } = args;
    const queue = [document];
    const v = new Set();
    while (queue.length) {
      const root = queue.shift();
      if (!root || v.has(root)) continue;
      v.add(root);
      try {
        for (const el of Array.from(root.querySelectorAll('button, a, [role="button"], li, span'))) {
          const t = (el.textContent || '').trim();
          if (t === text) {
            // pick the most-clickable wrapper
            let target = el;
            for (let d = 0; d < 4 && target; d++) {
              if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'menuitem') break;
              if (target.parentElement) target = target.parentElement; else break;
            }
            target = target || el;
            target.scrollIntoView({block:'center'});
            target.click();
            return { clicked: true, tag: target.tagName, role: target.getAttribute && target.getAttribute('role') };
          }
        }
        const all = Array.from(root.querySelectorAll('*'));
        for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return { clicked: false };
  }, { text });
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
    await p.screenshot({ path: path.join(SHOTS, '110-list.png'), fullPage: true });

    // Find the row action button (caret/▾) for Electra FAQ Library
    const actionOpen = await frame.evaluate(() => {
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const tr of Array.from(root.querySelectorAll('tr'))) {
            const txt = (tr.textContent || '').trim();
            if (txt.includes('Electra FAQ Library')) {
              // Find the action button in the row
              const btn = tr.querySelector('button[aria-label*="Show" i], button.slds-button_icon, lightning-button-menu button');
              if (btn) { btn.scrollIntoView({block:'center'}); btn.click(); return { clicked: true, label: btn.getAttribute('aria-label') }; }
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('action menu open:', actionOpen);
    await sleep(2000);
    await p.screenshot({ path: path.join(SHOTS, '111-action-menu.png'), fullPage: true });

    // Click "Delete" or "Remove"
    let del = await clickFirstByText(frame, 'Delete');
    if (!del.clicked) del = await clickFirstByText(frame, 'Remove');
    console.log('delete click:', del);
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '112-delete-confirm.png'), fullPage: true });

    // Confirm deletion
    let conf = await clickFirstByText(frame, 'Delete');
    if (!conf.clicked) conf = await clickFirstByText(frame, 'Confirm');
    if (!conf.clicked) conf = await clickFirstByText(frame, 'Yes');
    console.log('confirm delete:', conf);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '113-after-delete.png'), fullPage: true });

    // Verify it's gone
    const stillThere = await frame.evaluate(() => {
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          if ((root.textContent || '').includes('Electra FAQ Library')) {
            return true;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return false;
    });
    console.log('still there after delete?', stillThere);

    if (stillThere) {
      console.error('Delete failed — library still exists. Aborting recreate.');
      process.exit(1);
    }

    // ============ RECREATE ============
    console.log('=== RECREATE LIBRARY ===');
    let click1 = await clickFirstByText(frame, 'New Library');
    console.log('New Library:', click1);
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '114-new-library.png'), fullPage: true });

    // Fill form
    const filled = await frame.evaluate((data) => {
      const collect = (root, depth) => {
        if (depth > 12 || !root) return [];
        let arr = [];
        try {
          arr = Array.from(root.querySelectorAll('input, textarea'));
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) arr = arr.concat(collect(el.shadowRoot, depth + 1));
        } catch {}
        return arr;
      };
      const inputs = collect(document, 0).filter(i => i.offsetParent !== null && i.type !== 'hidden' && i.type !== 'checkbox' && i.type !== 'radio' && i.type !== 'search');
      const setValue = (el, val) => {
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, val); else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      };
      const out = { steps: [] };
      const isApi = (i) => /api/i.test((i.placeholder||'')+(i.getAttribute('aria-label')||''));
      const isName = (i) => /name/i.test((i.placeholder||'')+(i.getAttribute('aria-label')||'')) && !isApi(i);
      const isDesc = (i) => /description|desc/i.test((i.placeholder||'')+(i.getAttribute('aria-label')||'')) || i.tagName === 'TEXTAREA';
      const nameInput = inputs.find(isName) || inputs[0];
      if (nameInput) { nameInput.focus(); setValue(nameInput, data.name); out.steps.push('name set'); }
      const descInput = inputs.find(isDesc);
      if (descInput && descInput !== nameInput) { descInput.focus(); setValue(descInput, data.desc); out.steps.push('desc set'); }
      return out;
    }, { name: LIBRARY_NAME, desc: LIBRARY_DESC });
    console.log('fill:', filled);
    await sleep(2000);

    const saved = await clickFirstByText(frame, 'Save');
    console.log('save:', saved);
    await sleep(12000);
    await p.screenshot({ path: path.join(SHOTS, '115-after-save.png'), fullPage: true });

    // Now we should be on the new library detail page
    // Pick Files data type
    const opened = await frame.evaluate(() => {
      const find = (root, depth) => {
        if (depth > 14 || !root) return null;
        try {
          for (const i of Array.from(root.querySelectorAll('input'))) {
            if (/data type/i.test(i.getAttribute('aria-label') || '') || /select a data type/i.test(i.placeholder || '')) return i;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) { const r = find(el.shadowRoot, depth+1); if (r) return r; }
        } catch {}
        return null;
      };
      const inp = find(document, 0);
      if (inp) { inp.scrollIntoView({block:'center'}); inp.focus(); inp.click(); return true; }
      return false;
    });
    console.log('combobox open:', opened);
    await sleep(2000);

    const pickFiles = await clickFirstByText(frame, 'Files');
    console.log('files pick:', pickFiles);
    await sleep(5000);
    await p.screenshot({ path: path.join(SHOTS, '116-files-picked.png'), fullPage: true });

    // Upload 3 PDFs
    const fileInputs = await frame.$$('input[type="file"]');
    console.log('file inputs:', fileInputs.length);
    if (fileInputs.length === 0) { console.error('no file input'); process.exit(1); }
    await fileInputs[0].setInputFiles(PDFS);
    console.log('files set');
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '117-files-listed.png'), fullPage: true });

    // Click page-level Upload (the only Upload button visible — the modal wasn't used this time)
    const pgUp = await clickFirstByText(frame, 'Upload');
    console.log('page Upload:', pgUp);
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '118-after-upload.png'), fullPage: true });

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '17-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
