// Phase 6b step 37: in V3 Draft, click Data node in Explorer, add Electra FAQ Library.

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
    await p.screenshot({ path: path.join(SHOTS, '240-canvas.png'), fullPage: true });

    // Click "Data" in the Explorer tree (the node above tree end)
    const dataClick = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          // treeitem with text "Data"
          for (const t of Array.from(r.querySelectorAll('[role="treeitem"], a, span, button, div'))) {
            const txt = (t.textContent || '').trim();
            if (txt === 'Data' && t.offsetParent !== null) {
              t.scrollIntoView({block:'center'});
              t.click();
              return { clicked: true, tag: t.tagName, role: t.getAttribute('role') };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('click Data node:', dataClick);
    await sleep(5000);
    await p.screenshot({ path: path.join(SHOTS, '241-data-clicked.png'), fullPage: true });

    // Probe what the Data tab shows
    const dataProbe = await p.evaluate(() => {
      const out = { buttons: [], headings: [], texts: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t && t.length < 80 && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t, disabled: b.disabled || false });
            }
          }
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
          }
          for (const e of Array.from(r.querySelectorAll('span, div'))) {
            const t = (e.textContent || '').trim();
            if (/Library|Data Library|Connection|Knowledge/i.test(t) && t.length < 80
                && !out.texts.includes(t)) out.texts.push(t);
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.buttons = out.buttons.slice(0, 30);
      out.texts = out.texts.slice(0, 20);
      return out;
    });
    console.log('Data tab probe:', JSON.stringify(dataProbe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '241-probe.json'), JSON.stringify(dataProbe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '37-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
