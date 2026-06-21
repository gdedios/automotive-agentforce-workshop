// Phase 6b step 42: V3 Draft → expand Data tree node → click Data Library → probe.

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

async function fireSequence(p, predicateString) {
  return await p.evaluate((predFn) => {
    const pred = new Function('el', 'return (' + predFn + ')(el);');
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const el of Array.from(r.querySelectorAll('a, button, [role="treeitem"], span, div, [role="menuitem"], li'))) {
          if (pred(el)) {
            const rect = el.getBoundingClientRect();
            const x = rect.left + rect.width / 2;
            const y = rect.top + rect.height / 2;
            const fire = (type, EventCtor = MouseEvent) => {
              el.dispatchEvent(new EventCtor(type, {
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
            return { fired: true, tag: el.tagName, role: el.getAttribute('role'), text: (el.textContent || '').trim().slice(0, 60) };
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return { fired: false };
  }, predicateString);
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

    // Step A: expand "Data" treeitem (top-level)
    const expandData = await fireSequence(p, function(el) {
      const t = (el.textContent || '').trim();
      // Match exact "Data" treeitem in Explorer (not Data Library or Data > something)
      return t === 'Data' && el.getAttribute('role') === 'treeitem' && el.offsetParent !== null;
    }.toString());
    console.log('expand Data treeitem:', expandData);
    await sleep(3000);

    // Step B: click "Data Library" sub-treeitem
    const clickDL = await fireSequence(p, function(el) {
      const t = (el.textContent || '').trim();
      return t === 'Data Library' && el.offsetParent !== null;
    }.toString());
    console.log('click Data Library:', clickDL);
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '280-dl-pane.png'), fullPage: true });

    // Probe whatever pane is showing
    const probe = await p.evaluate(() => {
      const out = { buttons: [], headings: [], textsOnPage: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t && t.length < 80 && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t.slice(0, 80), disabled: b.disabled || false });
            }
          }
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
          }
          // Find any text mentioning library / show sources / available
          for (const e of Array.from(r.querySelectorAll('span, label, p'))) {
            const t = (e.textContent || '').trim();
            if (/Show Sources|Available Data|Selected Data|Add Library|Electra FAQ/i.test(t) && t.length < 120
                && !out.textsOnPage.includes(t)) out.textsOnPage.push(t);
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.buttons = out.buttons.slice(0, 40);
      return out;
    });
    console.log('Data Library pane probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '280-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '42-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
