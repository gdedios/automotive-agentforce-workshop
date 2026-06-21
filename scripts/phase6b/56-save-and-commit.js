// Phase 6b step 56: Save → re-enable Show Sources on Data Library pane + Save → Commit Version → confirm.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const CANVAS_V3 = `${LIGHTNING_HOST}/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYgK00000081TaUAI&projectVersionId=1bZgK000000FrC5UAK`;

async function clickEnabledButton(p, label) {
  const rect = await p.evaluate((lbl) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const b of Array.from(r.querySelectorAll('button'))) {
          const t = (b.textContent || '').trim();
          if (t === lbl && !b.disabled && b.offsetParent !== null) {
            const rc = b.getBoundingClientRect();
            return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return null;
  }, label);
  if (rect) {
    await p.mouse.click(rect.l + rect.w / 2, rect.t + rect.h / 2);
    return true;
  }
  return false;
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
    await p.goto(CANVAS_V3, { waitUntil: 'domcontentloaded' });
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '420-canvas-loaded.png'), fullPage: true });

    // Step A: Save (to persist any dirty state)
    console.log('A. clicking Save...');
    const savedA = await clickEnabledButton(p, 'Save');
    console.log('Save A clicked:', savedA);
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '421-after-save-A.png'), fullPage: true });

    // Step B: Navigate to Data Library — expand Data, click Data Library
    console.log('B. expanding Data + Data Library...');
    const dataRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (t === 'Data' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 250 && rc.top > 200 && rc.top < 700) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    if (dataRect) {
      await p.mouse.click(dataRect.l - 22, dataRect.t + dataRect.h / 2);
      await sleep(2500);
    }
    const dlRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (t === 'Data Library' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 250) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    if (dlRect) await p.mouse.click(dlRect.l + dlRect.w / 2, dlRect.t + dlRect.h / 2);
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '422-data-library-pane.png'), fullPage: true });

    // Step C: Probe Show sources cb
    const cbInfo = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const inp of Array.from(r.querySelectorAll('input[type="checkbox"]'))) {
            const lbl = inp.closest('label');
            const lblText = (lbl?.textContent || '').trim();
            const aria = inp.getAttribute('aria-label') || '';
            if (/show sources/i.test(lblText) || /show sources/i.test(aria)) {
              const rc = inp.getBoundingClientRect();
              const lblRc = lbl?.getBoundingClientRect();
              return {
                checked: inp.checked,
                disabled: inp.disabled,
                rect: { l: rc.left, t: rc.top, w: rc.width, h: rc.height },
                lblRect: lblRc ? { l: lblRc.left, t: lblRc.top, w: lblRc.width, h: lblRc.height } : null,
                lblText: lblText.slice(0, 80),
              };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('show-sources cb:', cbInfo);

    if (cbInfo && !cbInfo.checked && !cbInfo.disabled) {
      const r = cbInfo.lblRect || cbInfo.rect;
      await p.mouse.click(r.l + 10, r.t + r.h / 2);
      await sleep(1500);
      await p.screenshot({ path: path.join(SHOTS, '423-show-sources-toggled.png'), fullPage: true });
      // Save the change
      console.log('saving show sources change...');
      const savedB = await clickEnabledButton(p, 'Save');
      console.log('Save B clicked:', savedB);
      await sleep(6000);
      await p.screenshot({ path: path.join(SHOTS, '424-after-save-B.png'), fullPage: true });
    } else {
      console.log('show-sources already checked or not found:', cbInfo);
    }

    // Step D: Commit Version
    console.log('D. clicking Commit Version...');
    const cvClicked = await clickEnabledButton(p, 'Commit Version');
    console.log('Commit Version clicked:', cvClicked);
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '425-commit-modal.png'), fullPage: true });

    // Probe modal — what's visible?
    const modalProbe = await p.evaluate(() => {
      const out = { headings: [], buttons: [], inputs: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
          }
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t && t.length < 60 && b.offsetParent !== null && !out.buttons.find(x => x.text === t)) {
              const rc = b.getBoundingClientRect();
              out.buttons.push({ text: t, disabled: b.disabled || false, rect: { l: Math.round(rc.left), t: Math.round(rc.top) } });
            }
          }
          for (const inp of Array.from(r.querySelectorAll('input, textarea'))) {
            const ph = inp.getAttribute('placeholder') || '';
            const lbl = inp.getAttribute('aria-label') || '';
            if ((ph || lbl) && inp.offsetParent !== null) {
              const rc = inp.getBoundingClientRect();
              out.inputs.push({ ph: ph.slice(0, 80), lbl: lbl.slice(0, 80), rect: { l: Math.round(rc.left), t: Math.round(rc.top) } });
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('commit modal probe:', JSON.stringify(modalProbe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '425-probe.json'), JSON.stringify(modalProbe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '56-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
