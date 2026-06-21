// Phase 6b step 39: click the actual <a> for Version 3 Draft, capture href.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const CANVAS_V2 = `${LIGHTNING_HOST}/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYgK00000081TaUAI&projectVersionId=1bZgK000000FnBhUAK`;

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
    await p.goto(CANVAS_V2, { waitUntil: 'domcontentloaded' });
    await sleep(20000);

    // Open the version dropdown
    await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            if (/^Version 2/.test((b.textContent || '').trim())) { b.click(); return; }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
    });
    await sleep(2500);

    // Capture the V3 anchor href, then navigate directly
    const v3Info = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const a of Array.from(r.querySelectorAll('a'))) {
            const t = (a.textContent || '').trim();
            if (/^Version 3 \(Draft\)/.test(t)) {
              return { href: a.href || '', text: t, getAttr: a.getAttribute('href') };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('V3 anchor info:', JSON.stringify(v3Info, null, 2));

    if (v3Info && (v3Info.href || v3Info.getAttr)) {
      const fullHref = v3Info.href || (LIGHTNING_HOST + v3Info.getAttr);
      fs.writeFileSync(path.join(SHOTS, '252-v3-href.txt'), fullHref);
      console.log('navigating to V3 href:', fullHref);
      await p.goto(fullHref, { waitUntil: 'domcontentloaded' });
      await sleep(20000);
      console.log('after V3 nav url:', p.url());
      await p.screenshot({ path: path.join(SHOTS, '252-v3-canvas.png'), fullPage: true });
    } else {
      console.log('FAILED to capture V3 href');
    }

    // Probe to confirm we're on V3 Draft
    const probe = await p.evaluate(() => {
      const out = { buttons: [], versionLabel: null };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (/^(Activate|Deactivate|Save|Commit Version|New Version)$/.test(t)
                && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t, disabled: b.disabled || false });
            }
            if (/Version \d+ \(Draft\)/.test(t) && !out.versionLabel) out.versionLabel = t;
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('V3 probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '252-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '39-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
