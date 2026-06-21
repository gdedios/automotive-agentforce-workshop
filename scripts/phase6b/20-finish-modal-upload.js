// Phase 6b step 20: a fresh modal is open with 3 PDFs queued and "0 of 3 files uploaded".
// Click the modal's internal Upload button, poll for "3 of 3 files uploaded", click Done.

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
    await p.screenshot({ path: path.join(SHOTS, '140-resume.png'), fullPage: true });

    // Click into the library to open detail (in case we landed on list)
    const inLibrary = await frame.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const a of Array.from(r.querySelectorAll('a, button, span'))) {
            if ((a.textContent || '').trim() === 'Electra FAQ Library') {
              a.scrollIntoView({block:'center'}); a.click();
              return { clicked: true };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('open library:', inLibrary);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '141-detail.png'), fullPage: true });

    // Probe: is a modal still open with the upload list?
    let modalState = await frame.evaluate(() => {
      const out = { hasModal: false, modalText: '', uploadBtnFound: false, uploadDisabled: null };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const m of Array.from(r.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
            out.hasModal = true;
            out.modalText = (m.textContent || '').replace(/\s+/g, ' ').slice(0, 400);
            for (const b of Array.from(m.querySelectorAll('button'))) {
              const t = (b.textContent || '').trim();
              if (t === 'Upload') { out.uploadBtnFound = true; out.uploadDisabled = b.disabled; }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('modal state:', modalState);

    // If no modal, then files may be staged on the detail page — check footer Upload
    if (!modalState.hasModal) {
      // Click footer Upload (no modal scope check)
      const pgUp = await frame.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const b of Array.from(r.querySelectorAll('button'))) {
              const t = (b.textContent || '').trim();
              if (t === 'Upload' && !b.disabled) {
                b.scrollIntoView({block:'center'}); b.click();
                return { clicked: true };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return { clicked: false };
      });
      console.log('page Upload clicked:', pgUp);
      await sleep(3000);
      modalState = await frame.evaluate(() => {
        const out = { hasModal: false, modalText: '' };
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const m of Array.from(r.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
              out.hasModal = true;
              out.modalText = (m.textContent || '').replace(/\s+/g, ' ').slice(0, 400);
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return out;
      });
      console.log('modal after page upload:', modalState);
    }

    // If modal Upload button found and not disabled, click it
    if (modalState.hasModal && modalState.uploadBtnFound && !modalState.uploadDisabled) {
      const clk = await frame.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const m of Array.from(r.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
              for (const b of Array.from(m.querySelectorAll('button'))) {
                if ((b.textContent || '').trim() === 'Upload' && !b.disabled) {
                  b.scrollIntoView({block:'center'}); b.click();
                  return { clicked: true };
                }
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return { clicked: false };
      });
      console.log('modal Upload click:', clk);
      await sleep(3000);
    }

    // Poll modal text for "3 of 3 files uploaded" up to 90s
    let success = false;
    for (let i = 0; i < 45; i++) {
      const snap = await frame.evaluate(() => {
        const queue = [document]; const v = new Set();
        let txt = '';
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const m of Array.from(r.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
              txt += ' ' + (m.textContent || '');
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return txt.replace(/\s+/g, ' ').slice(0, 400);
      });
      console.log(`t+${(i+1)*2}s:`, snap.slice(0, 180));
      if (/3 of 3 files uploaded/i.test(snap)) { success = true; break; }
      if (/couldn't upload|We couldn't upload/i.test(snap)) {
        console.error('UPLOAD ERROR detected'); break;
      }
      await sleep(2000);
    }
    await p.screenshot({ path: path.join(SHOTS, '142-after-poll.png'), fullPage: true });
    console.log('upload success:', success);

    // Click Done
    const done = await frame.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const m of Array.from(r.querySelectorAll('section[role="dialog"], .slds-modal__container'))) {
            for (const b of Array.from(m.querySelectorAll('button'))) {
              if ((b.textContent || '').trim() === 'Done' && !b.disabled) {
                b.scrollIntoView({block:'center'}); b.click();
                return { clicked: true };
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
    await p.screenshot({ path: path.join(SHOTS, '143-after-done.png'), fullPage: true });

    // Final state probe
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
    fs.writeFileSync(path.join(SHOTS, '143-final.json'), JSON.stringify(final, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '20-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
