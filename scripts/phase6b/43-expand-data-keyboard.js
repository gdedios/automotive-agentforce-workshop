// Phase 6b step 43: focus the "Data" treeitem and press ArrowRight to expand it.
// Then click Data Library inside.

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

    // Survey Data treeitem aria state
    const before = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('[role="treeitem"]'))) {
            const t = (el.textContent || '').trim();
            if (t === 'Data') {
              const rect = el.getBoundingClientRect();
              return {
                expanded: el.getAttribute('aria-expanded'),
                level: el.getAttribute('aria-level'),
                rect: { left: rect.left, top: rect.top, w: rect.width, h: rect.height },
                outerHTML: el.outerHTML.slice(0, 400),
              };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Data treeitem before:', JSON.stringify(before, null, 2));

    // Strategy 1: real Playwright mouse click at Data treeitem coords
    if (before && before.rect) {
      const cx = before.rect.left + 8; // click on the chevron area (~8px from left edge)
      const cy = before.rect.top + before.rect.h / 2;
      await p.mouse.click(cx, cy);
      console.log('clicked at', cx, cy);
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, '290-after-chevron-click.png'), fullPage: true });
    }

    // Check if expanded now
    const after = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('[role="treeitem"]'))) {
            const t = (el.textContent || '').trim();
            if (t === 'Data') return { expanded: el.getAttribute('aria-expanded') };
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Data treeitem after click:', after);

    // If still collapsed, try keyboard: focus treeitem and ArrowRight
    if (after && after.expanded !== 'true') {
      console.log('still collapsed; trying focus + ArrowRight');
      await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('[role="treeitem"]'))) {
              const t = (el.textContent || '').trim();
              if (t === 'Data') { el.focus(); return; }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
      });
      await p.keyboard.press('ArrowRight');
      await sleep(2000);
      await p.screenshot({ path: path.join(SHOTS, '291-after-arrow-right.png'), fullPage: true });
    }

    // Now look for Data Library child
    const child = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('[role="treeitem"], a, span'))) {
            const t = (el.textContent || '').trim();
            if (t === 'Data Library' && el.offsetParent !== null) {
              const rect = el.getBoundingClientRect();
              return { found: true, level: el.getAttribute('aria-level'), rect: { left: rect.left, top: rect.top, w: rect.width, h: rect.height } };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { found: false };
    });
    console.log('Data Library child:', child);

    if (child.found && child.rect) {
      await p.mouse.click(child.rect.left + child.rect.w / 2, child.rect.top + child.rect.h / 2);
      await sleep(5000);
      await p.screenshot({ path: path.join(SHOTS, '292-dl-clicked.png'), fullPage: true });
    }

    // Probe pane
    const probe = await p.evaluate(() => {
      const out = { headings: [], buttons: [], libraries: [] };
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
            if (t && t.length < 80 && !/Show |Hide |Close |Enlarge|Expand|Reset|Copy|Description Help|Show Sub|Show Desc|Agent's |Help Info|All Problems|0 Errors|0 Warnings|Code View|Add Resource$|Canvas/i.test(t)
                && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t, disabled: b.disabled || false });
            }
          }
          for (const e of Array.from(r.querySelectorAll('span, div, label'))) {
            const t = (e.textContent || '').trim();
            if (/Electra FAQ Library|Electra_FAQ_Library/i.test(t) && t.length < 100
                && !out.libraries.includes(t)) out.libraries.push(t);
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('Data Library pane probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '292-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '43-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
