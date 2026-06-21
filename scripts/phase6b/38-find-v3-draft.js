// Phase 6b step 38: nav to V2, click Version dropdown, find V3 Draft and pick it.

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

    // Click on the Version dropdown button to expand
    const verClick = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (/^Version 2/.test(t)) {
              b.scrollIntoView({block:'center'});
              b.click();
              return { clicked: true, label: t.slice(0,60) };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('click version dropdown:', verClick);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '250-version-dropdown.png'), fullPage: true });

    // Probe dropdown items
    const items = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const li of Array.from(r.querySelectorAll('li, [role="menuitem"], [role="option"], a, button'))) {
            const t = (li.textContent || '').trim();
            if (/Version \d+ \((Draft|Active|Committed)\)/.test(t) && t.length < 80) {
              out.push({ text: t.slice(0, 60), tag: li.tagName });
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('version items:', JSON.stringify(items, null, 2));

    // Click the V3 Draft item
    const v3 = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const li of Array.from(r.querySelectorAll('li, [role="menuitem"], [role="option"], a, button, span, div'))) {
            const t = (li.textContent || '').trim();
            if (/^Version 3 \(Draft\)/.test(t) && t.length < 50) {
              let target = li;
              for (let d = 0; d < 4; d++) {
                if (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute('role') === 'menuitem' || target.getAttribute('role') === 'option') break;
                if (target.parentElement) target = target.parentElement; else break;
              }
              target.scrollIntoView({block:'center'});
              target.click();
              return { clicked: true, tag: target.tagName, text: t };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('click V3 Draft:', v3);
    await sleep(15000);
    console.log('url:', p.url());
    await p.screenshot({ path: path.join(SHOTS, '251-v3-loaded.png'), fullPage: true });

    // Probe state — should be V3 Draft
    const probe = await p.evaluate(() => {
      const out = { buttons: [], explorer: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (/^(Activate|Deactivate|Save|Commit Version|New Version|Version \d)/.test(t)
                && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t.slice(0,60), disabled: b.disabled || false });
            }
          }
          for (const e of Array.from(r.querySelectorAll('[role="treeitem"], a, span'))) {
            const t = (e.textContent || '').trim();
            if (/^(Subagents|Variables|Connections|Data|Data Library|Estado_y_FAQ|Settings)$/.test(t)
                && !out.explorer.includes(t)) {
              out.explorer.push(t);
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('post-nav probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '251-probe.json'), JSON.stringify(probe, null, 2));
    // Capture URL so we can hardcode it next time
    fs.writeFileSync(path.join(SHOTS, '251-url.txt'), p.url());
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '38-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
