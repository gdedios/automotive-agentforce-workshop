// Phase 6b step 19: clean recreate of Electra_FAQ_Library after user manually deleted broken one.
// Single continuous flow — no leftover modal state.

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

async function clickByText(target, text) {
  return await target.evaluate((t) => {
    const queue = [document];
    const v = new Set();
    while (queue.length) {
      const root = queue.shift();
      if (!root || v.has(root)) continue;
      v.add(root);
      try {
        for (const el of Array.from(root.querySelectorAll('button, a, [role="button"], li, span'))) {
          const txt = (el.textContent || '').trim();
          if (txt === t) {
            let target = el;
            for (let d = 0; d < 4; d++) {
              if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'menuitem') break;
              if (target.parentElement) target = target.parentElement; else break;
            }
            target.scrollIntoView({block:'center'});
            target.click();
            return { clicked: true, tag: target.tagName };
          }
        }
        const all = Array.from(root.querySelectorAll('*'));
        for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return { clicked: false };
  }, text);
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
    await p.screenshot({ path: path.join(SHOTS, '130-fresh-list.png'), fullPage: true });

    // Verify the broken library is gone — should show "0 libraries available"
    const stillBroken = await frame.evaluate(() => {
      const q = [document]; const v = new Set();
      while (q.length) {
        const r = q.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          if (/Electra FAQ Library/.test(r.textContent || '')) return true;
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) q.push(el.shadowRoot);
        } catch {}
      }
      return false;
    });
    if (stillBroken) {
      console.error('Old library still visible — user delete did not complete');
      process.exit(1);
    }
    console.log('library cleanly removed; proceeding to recreate');

    // === STEP 1: Click New Library ===
    let click1 = await clickByText(frame, 'New Library');
    console.log('New Library click:', click1);
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '131-new-form.png'), fullPage: true });

    // === STEP 2: Fill form ===
    const filled = await frame.evaluate((data) => {
      const collect = (root, depth) => {
        if (depth > 12 || !root) return [];
        let arr = [];
        try {
          arr = Array.from(root.querySelectorAll('input, textarea'));
          for (const el of root.querySelectorAll('*')) if (el.shadowRoot) arr = arr.concat(collect(el.shadowRoot, depth + 1));
        } catch {}
        return arr;
      };
      const inputs = collect(document, 0).filter(i => i.offsetParent !== null && !['hidden','checkbox','radio','search'].includes(i.type));
      const setVal = (el, val) => {
        const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;
        if (setter) setter.call(el, val); else el.value = val;
        el.dispatchEvent(new Event('input', {bubbles:true}));
        el.dispatchEvent(new Event('change', {bubbles:true}));
        el.dispatchEvent(new Event('blur', {bubbles:true}));
      };
      const out = { steps: [], totalInputs: inputs.length };
      const isApi = (i) => /api/i.test((i.placeholder||'')+(i.getAttribute('aria-label')||''));
      const isName = (i) => /name/i.test((i.placeholder||'')+(i.getAttribute('aria-label')||'')) && !isApi(i);
      const isDesc = (i) => /description|desc/i.test((i.placeholder||'')+(i.getAttribute('aria-label')||'')) || i.tagName === 'TEXTAREA';
      const ni = inputs.find(isName) || inputs[0];
      if (ni) { ni.focus(); setVal(ni, data.name); out.steps.push('name'); }
      const di = inputs.find(isDesc);
      if (di && di !== ni) { di.focus(); setVal(di, data.desc); out.steps.push('desc'); }
      return out;
    }, { name: LIBRARY_NAME, desc: LIBRARY_DESC });
    console.log('fill:', filled);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '132-filled.png'), fullPage: true });

    // === STEP 3: Save ===
    const saved = await clickByText(frame, 'Save');
    console.log('Save click:', saved);
    await sleep(12000);
    await p.screenshot({ path: path.join(SHOTS, '133-after-save.png'), fullPage: true });

    // === STEP 4: Open Data Type combobox ===
    const opened = await frame.evaluate(() => {
      const find = (root, depth) => {
        if (depth > 14 || !root) return null;
        try {
          for (const i of Array.from(root.querySelectorAll('input'))) {
            if (/data type/i.test(i.getAttribute('aria-label') || '') || /select a data type/i.test(i.placeholder || '')) return i;
          }
          for (const el of root.querySelectorAll('*')) if (el.shadowRoot) { const r = find(el.shadowRoot, depth+1); if (r) return r; }
        } catch {}
        return null;
      };
      const inp = find(document, 0);
      if (inp) { inp.scrollIntoView({block:'center'}); inp.focus(); inp.click(); return true; }
      return false;
    });
    console.log('combobox open:', opened);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '134-combo-open.png'), fullPage: true });

    // === STEP 5: Pick Files ===
    const pick = await clickByText(frame, 'Files');
    console.log('Files pick:', pick);
    await sleep(5000);
    await p.screenshot({ path: path.join(SHOTS, '135-files-picked.png'), fullPage: true });

    // === STEP 6: Upload PDFs via hidden input ===
    const fis = await frame.$$('input[type="file"]');
    console.log('file inputs:', fis.length);
    if (fis.length === 0) { console.error('NO file input'); process.exit(1); }
    await fis[0].setInputFiles(PDFS);
    console.log('setInputFiles done');
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '136-files-staged.png'), fullPage: true });

    // === STEP 7: Click page-level Upload (the only Upload button — no modal this time) ===
    let pgUp = null;
    for (let i = 0; i < 10; i++) {
      pgUp = await frame.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const root = queue.shift(); if (!root || v.has(root)) continue; v.add(root);
          try {
            for (const b of Array.from(root.querySelectorAll('button'))) {
              const t = (b.textContent || '').trim();
              if (t === 'Upload' && !b.disabled) {
                const m = b.closest && b.closest('section[role="dialog"], .slds-modal__container');
                if (!m) { b.scrollIntoView({block:'center'}); b.click(); return { clicked: true }; }
              }
            }
            for (const el of root.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return { clicked: false };
      });
      if (pgUp.clicked) break;
      console.log('waiting for Upload button to enable... t+', i*2);
      await sleep(2000);
    }
    console.log('page Upload:', pgUp);
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '137-after-upload.png'), fullPage: true });

    // === STEP 8: Probe final state ===
    const finalState = await frame.evaluate(() => {
      const out = { banners: [], statusBadge: null, fileRows: 0 };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const root = queue.shift(); if (!root || v.has(root)) continue; v.add(root);
        try {
          for (const b of Array.from(root.querySelectorAll('[role="alert"], .slds-notify'))) {
            const t = (b.textContent || '').trim().slice(0, 200);
            if (t) out.banners.push(t);
          }
          // Status badge follows label 'Status'
          const labels = Array.from(root.querySelectorAll('p, span, dt, label')).filter(e => (e.textContent||'').trim()==='Status');
          for (const lbl of labels) {
            const sib = lbl.nextElementSibling;
            if (sib) { const t = (sib.textContent||'').trim().slice(0,80); if (t) out.statusBadge = t; }
          }
          // Count any element whose text mentions one of our PDFs
          for (const el of root.querySelectorAll('*')) {
            const t = (el.textContent||'').trim();
            if (/Electra-(Catalogo|Politicas|Guia)/.test(t) && t.length < 80) out.fileRows++;
          }
          for (const el of root.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('final state:', JSON.stringify(finalState, null, 2));
    fs.writeFileSync(path.join(SHOTS, '137-final-state.json'), JSON.stringify(finalState, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '19-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
