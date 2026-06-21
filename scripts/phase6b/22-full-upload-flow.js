// Phase 6b step 22: full upload flow.
// 1. Open library detail
// 2. setInputFiles → files appear inline
// 3. Click page-level (inline) Upload button → opens "Upload Files" modal
// 4. Wait for modal, click modal Upload button → upload starts
// 5. Poll for "3 of 3 files uploaded"
// 6. Click modal Done

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

async function probeUploads(frame) {
  return await frame.evaluate(() => {
    const out = { uploads: [], hasModal: false, modalText: '' };
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const b of Array.from(r.querySelectorAll('button'))) {
          const t = (b.textContent || '').trim();
          if (t === 'Upload') {
            const m = b.closest && b.closest('section[role="dialog"], .slds-modal__container');
            out.uploads.push({ inModal: !!m, disabled: b.disabled });
          }
        }
        for (const m of Array.from(r.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
          out.hasModal = true;
          out.modalText = (m.textContent || '').replace(/\s+/g, ' ').slice(0, 300);
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return out;
  });
}

async function clickUpload(frame, inModal) {
  return await frame.evaluate((wantModal) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const b of Array.from(r.querySelectorAll('button'))) {
          const t = (b.textContent || '').trim();
          if (t === 'Upload' && !b.disabled) {
            const m = b.closest && b.closest('section[role="dialog"], .slds-modal__container');
            if ((wantModal && m) || (!wantModal && !m)) {
              b.scrollIntoView({block:'center'}); b.click();
              return { clicked: true };
            }
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return { clicked: false };
  }, inModal);
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

    // Open the library
    await frame.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const a of Array.from(r.querySelectorAll('a, button, span'))) {
            if ((a.textContent || '').trim() === 'Electra FAQ Library') { a.click(); return; }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
    });
    await sleep(10000);
    await p.screenshot({ path: path.join(SHOTS, '160-detail.png'), fullPage: true });

    // Stage files via hidden input
    const fis = await frame.$$('input[type="file"]');
    if (fis.length === 0) { console.error('no file input'); process.exit(1); }
    await fis[0].setInputFiles(PDFS);
    console.log('files staged');
    await sleep(5000);
    await p.screenshot({ path: path.join(SHOTS, '161-staged.png'), fullPage: true });

    let probe = await probeUploads(frame);
    console.log('after stage:', JSON.stringify(probe, null, 2));

    // STEP A: click inline (out-of-modal) Upload to open the modal
    if (probe.uploads.some(u => !u.inModal && !u.disabled)) {
      const c = await clickUpload(frame, false);
      console.log('clicked inline Upload:', c);
      await sleep(4000);
    } else {
      console.log('no inline Upload found, may already be in modal');
    }
    await p.screenshot({ path: path.join(SHOTS, '162-after-inline-upload.png'), fullPage: true });

    // Wait up to 10s for modal to appear
    for (let i = 0; i < 10; i++) {
      probe = await probeUploads(frame);
      if (probe.hasModal) break;
      await sleep(1000);
    }
    console.log('modal probe:', JSON.stringify(probe, null, 2));

    // STEP B: click modal Upload to confirm
    if (probe.hasModal && probe.uploads.some(u => u.inModal && !u.disabled)) {
      const c = await clickUpload(frame, true);
      console.log('clicked modal Upload:', c);
      await sleep(3000);
    } else {
      console.log('no modal Upload — upload may have started directly inline');
    }
    await p.screenshot({ path: path.join(SHOTS, '163-after-modal-upload.png'), fullPage: true });

    // STEP C: poll for "3 of 3 files uploaded" up to 150s
    let success = false;
    let lastSnap = '';
    for (let i = 0; i < 75; i++) {
      lastSnap = await frame.evaluate(() => {
        const queue = [document]; const v = new Set();
        let txt = '';
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const m of Array.from(r.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
              txt += ' ' + (m.textContent || '');
            }
            // Also pick up inline status if modal closed early
            for (const e of Array.from(r.querySelectorAll('p, span, h1, h2'))) {
              const t = (e.textContent || '').trim();
              if (/of \d files uploaded|files uploaded/i.test(t) && t.length < 60) txt += ' ' + t;
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return txt.replace(/\s+/g, ' ').slice(0, 400);
      });
      if (i % 5 === 0) console.log(`t+${(i+1)*2}s:`, lastSnap.slice(0, 180));
      if (/3 of 3 files uploaded/i.test(lastSnap)) { success = true; break; }
      if (/couldn't upload|We couldn't upload/i.test(lastSnap)) {
        console.error('UPLOAD ERROR:', lastSnap); break;
      }
      await sleep(2000);
    }
    await p.screenshot({ path: path.join(SHOTS, '164-after-poll.png'), fullPage: true });
    console.log('upload success:', success);
    console.log('final modal text:', lastSnap.slice(0, 200));

    // STEP D: click Done
    const done = await frame.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const m of Array.from(r.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
            for (const b of Array.from(m.querySelectorAll('button'))) {
              if ((b.textContent || '').trim() === 'Done' && !b.disabled) {
                b.scrollIntoView({block:'center'}); b.click(); return { clicked: true };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('Done click:', done);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '165-after-done.png'), fullPage: true });

    // Final probe
    const final = await frame.evaluate(() => {
      const out = { banners: [], statusBadge: null, fileTable: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('[role="alert"], .slds-notify'))) {
            const t = (b.textContent || '').trim().slice(0, 200);
            if (t) out.banners.push(t);
          }
          const labels = Array.from(r.querySelectorAll('p, span, dt, label')).filter(e => (e.textContent||'').trim()==='Status');
          for (const lbl of labels) {
            const sib = lbl.nextElementSibling;
            if (sib) { const t = (sib.textContent||'').trim().slice(0,80); if (t) out.statusBadge = t; }
          }
          for (const el of r.querySelectorAll('*')) {
            const t = (el.textContent||'').trim();
            if (/Electra-(Catalogo|Politicas|Guia)/.test(t) && t.length < 150) out.fileTable.push(t.slice(0, 120));
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.fileTable = [...new Set(out.fileTable)].slice(0, 10);
      return out;
    });
    console.log('FINAL:', JSON.stringify(final, null, 2));
    fs.writeFileSync(path.join(SHOTS, '165-final.json'), JSON.stringify(final, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '22-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
