// Phase 6b step 36: deactivate Version 2, then click New Version to create draft V3.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const CANVAS_URL = `${LIGHTNING_HOST}/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYgK00000081TaUAI&projectVersionId=1bZgK000000FnBhUAK`;

async function shadowClick(p, exactText) {
  return await p.evaluate((t) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const b of Array.from(r.querySelectorAll('button, a, [role="button"], [role="menuitem"]'))) {
          if ((b.textContent || '').trim() === t) {
            b.scrollIntoView({block:'center'});
            b.click();
            return { clicked: true, tag: b.tagName };
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return { clicked: false };
  }, exactText);
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
    await p.goto(CANVAS_URL, { waitUntil: 'domcontentloaded' });
    await sleep(20000);

    // Dismiss popups first
    for (let i = 0; i < 2; i++) {
      await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const b of Array.from(r.querySelectorAll('button, a'))) {
              const t = (b.textContent || '').trim();
              if (t === 'Dismiss' || t === 'Skip' || t === 'Close') { b.click(); return; }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
      });
      await sleep(1500);
    }

    // Step 1: click Deactivate
    const deact = await shadowClick(p, 'Deactivate');
    console.log('click Deactivate:', deact);
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '230-after-deactivate-click.png'), fullPage: true });

    // Confirm deactivation if a modal appears (look for Confirm/Deactivate button in modal)
    const confirmDeact = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            // Modal confirm — typically labeled exactly "Deactivate" or "Confirm"
            if (t === 'Deactivate' || t === 'Confirm' || t === 'Yes') {
              const inModal = !!b.closest('[role="dialog"]') || !!b.closest('[class*="modal"]');
              if (inModal) {
                b.scrollIntoView({block:'center'});
                b.click();
                return { clicked: true, label: t };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('confirm Deactivate modal:', confirmDeact);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '231-after-deactivate-confirm.png'), fullPage: true });

    // Step 2: click New Version
    const newVer = await shadowClick(p, 'New Version');
    console.log('click New Version:', newVer);
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '232-after-new-version-click.png'), fullPage: true });

    // Confirm New Version modal if present (typically "Save" or "Create")
    const confirmNew = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Create' || t === 'Save' || t === 'Confirm' || t === 'New Version') {
              const inModal = !!b.closest('[role="dialog"]') || !!b.closest('[class*="modal"]');
              if (inModal) {
                b.scrollIntoView({block:'center'});
                b.click();
                return { clicked: true, label: t };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('confirm New Version modal:', confirmNew);
    await sleep(15000);
    await p.screenshot({ path: path.join(SHOTS, '233-after-new-version-confirm.png'), fullPage: true });

    // Probe to verify state — look for Activate button (means we're on a draft)
    const probe = await p.evaluate(() => {
      const out = { buttons: [], versionLabel: null };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (/^(Activate|Deactivate|New Version|Commit|Save)$/.test(t)
                && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t, disabled: b.disabled || false });
            }
            if (/Version \d+/.test(t) && !out.versionLabel) out.versionLabel = t;
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('post-state probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '233-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '36-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
