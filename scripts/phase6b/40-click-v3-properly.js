// Phase 6b step 40: Use Playwright's locator + .click() (not in-page evaluate) on the V3 anchor
// to trigger the React onClick handler properly.

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

    // Open dropdown
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
    await p.screenshot({ path: path.join(SHOTS, '260-dropdown-open.png'), fullPage: true });

    // Click V3 anchor with synthesized PointerEvent + MouseEvent sequence (React-friendly)
    const result = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const a of Array.from(r.querySelectorAll('a'))) {
            const t = (a.textContent || '').trim();
            if (/^Version 3 \(Draft\)/.test(t)) {
              const rect = a.getBoundingClientRect();
              const x = rect.left + rect.width / 2;
              const y = rect.top + rect.height / 2;
              // Full pointer/mouse sequence for React
              const fire = (type, EventCtor = MouseEvent) => {
                a.dispatchEvent(new EventCtor(type, {
                  bubbles: true, cancelable: true, view: window, button: 0, clientX: x, clientY: y,
                }));
              };
              fire('pointerover', PointerEvent);
              fire('pointerenter', PointerEvent);
              fire('pointerdown', PointerEvent);
              fire('mousedown');
              fire('pointerup', PointerEvent);
              fire('mouseup');
              fire('click');
              return { fired: true, rect: { x, y } };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch (e) { return { error: e.message }; }
      }
      return { fired: false };
    });
    console.log('V3 click result:', result);
    await sleep(15000);
    console.log('after click url:', p.url());
    await p.screenshot({ path: path.join(SHOTS, '261-after-v3-click.png'), fullPage: true });

    // Probe — should now show Save (V3 Draft state)
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
            if (/Version \d+ \((Draft|Active|Committed)\)/.test(t) && !out.versionLabel) {
              // top-level button shows current version
              if (b.closest('header') || b.offsetTop < 100) out.versionLabel = t.slice(0, 60);
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('V3 probe:', JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '40-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
