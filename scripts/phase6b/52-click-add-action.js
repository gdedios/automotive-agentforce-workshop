// Phase 6b step 52: hover "Estado y FAQ" treeitem to reveal "Add action to subagent" button, click it.

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

    // Hover Estado y FAQ row
    await p.mouse.move(140, 480); // Estado y FAQ position in Explorer
    await sleep(1000);

    // Find the "Add action to subagent" button by aria-label
    const addBtn = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const aria = b.getAttribute('aria-label') || '';
            if (/Add action to subagent/i.test(aria) && b.offsetParent !== null) {
              // Find nearest "Estado y FAQ" text label
              let p = b;
              for (let i = 0; i < 6; i++) {
                if (!p) break;
                if ((p.textContent || '').includes('Estado y FAQ')) {
                  const rc = b.getBoundingClientRect();
                  return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
                }
                p = p.parentElement;
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Add-action btn:', addBtn);

    if (!addBtn) {
      // Use hardcoded coords from probe
      console.log('using hardcoded coords (268, 473)');
      await p.mouse.click(268, 473);
    } else {
      await p.mouse.click(addBtn.l + addBtn.w / 2, addBtn.t + addBtn.h / 2);
    }
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '380-add-action-clicked.png'), fullPage: true });

    // Probe — what menu / modal appeared?
    const after = await p.evaluate(() => {
      const out = { items: [], headings: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
          }
          for (const li of Array.from(r.querySelectorAll('[role="menuitem"], [role="option"], li, button, a'))) {
            const t = (li.textContent || '').trim();
            if (t && t.length < 80 && /Action|Knowledge|Question|Topic|Apex|Flow|Prompt/i.test(t)
                && li.offsetParent !== null && !out.items.find(x => x.text === t)) {
              const rc = li.getBoundingClientRect();
              out.items.push({ text: t.slice(0, 60), tag: li.tagName, role: li.getAttribute('role'), rect: { l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height) } });
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.items = out.items.slice(0, 30);
      return out;
    });
    console.log('add-action menu:', JSON.stringify(after, null, 2));
    fs.writeFileSync(path.join(SHOTS, '380-after.json'), JSON.stringify(after, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '52-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
