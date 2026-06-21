// Phase 6b step 53: click + on Estado y FAQ → "Add from Asset Library" → find AnswerQuestionsWithKnowledge.

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

    // Click + on Estado y FAQ row
    await p.mouse.click(268, 473);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '390-popup.png'), fullPage: true });

    // Click "Add from Asset Library"
    const aslRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, button, [role="menuitem"], li'))) {
            const t = (el.textContent || '').trim();
            if (t === 'Add from Asset Library' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Add from Asset Library:', aslRect);
    if (!aslRect) throw new Error('Add from Asset Library not found');
    await p.mouse.click(aslRect.l + aslRect.w / 2, aslRect.t + aslRect.h / 2);
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '391-asset-modal.png'), fullPage: true });

    // Probe modal
    const probe = await p.evaluate(() => {
      const out = { headings: [], items: [], inputs: [] };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
          }
          for (const el of r.querySelectorAll('*')) {
            const role = el.getAttribute('role');
            if (role === 'option' || role === 'row' || role === 'listitem') {
              const t = (el.textContent || '').trim();
              if (t && t.length < 100 && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                if (rc.height > 5 && rc.width > 50) {
                  out.items.push({ text: t.slice(0, 80), role, rect: { l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height) } });
                }
              }
            }
          }
          for (const inp of Array.from(r.querySelectorAll('input'))) {
            const ph = inp.getAttribute('placeholder') || '';
            if (ph && inp.offsetParent !== null) {
              const rc = inp.getBoundingClientRect();
              out.inputs.push({ ph: ph.slice(0, 80), rect: { l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height) } });
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      out.items = out.items.slice(0, 40);
      return out;
    });
    console.log('asset modal probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '391-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '53-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
