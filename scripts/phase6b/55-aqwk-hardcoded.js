// Phase 6b step 55: Asset Library modal — click Select on AQWK card via hardcoded coords,
// then Add to Agent. Pulled coords from screenshot 400-search-answer.png.

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

    // Click "Add from Asset Library" via DOM walk
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
    if (aslRect) await p.mouse.click(aslRect.l + aslRect.w / 2, aslRect.t + aslRect.h / 2);
    await sleep(6000);

    // Click search input + type "Answer"
    await p.mouse.click(900, 161);
    await sleep(800);
    await p.keyboard.type('Answer', { delay: 60 });
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '410-search-answer.png'), fullPage: true });

    // Hardcoded Select button position from screenshot 400 — first card top-left
    // Screenshot shows Select at approximately (525, 395) for AQWK
    console.log('clicking Select on AQWK card at (525, 395)');
    await p.mouse.click(525, 395);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '411-aqwk-selected.png'), fullPage: true });

    // Click Add to Agent (bottom right of modal)
    const addRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Add to Agent' && !b.disabled && b.offsetParent !== null) {
              const rc = b.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Add to Agent rect:', addRect);
    if (!addRect) {
      // Hardcoded from screenshot — Add to Agent at (1285, 902)
      console.log('using hardcoded Add to Agent coords (1285, 902)');
      await p.mouse.click(1285, 902);
    } else {
      await p.mouse.click(addRect.l + addRect.w / 2, addRect.t + addRect.h / 2);
    }
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '412-after-add.png'), fullPage: true });

    // Probe — what's visible now?
    const probe = await p.evaluate(() => {
      const out = { headings: [], tabs: [], buttons: [], hasAQWK: false };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
          }
          for (const li of Array.from(r.querySelectorAll('li[role="presentation"], [role="tab"]'))) {
            const t = (li.textContent || '').trim();
            if (t && t.length < 80 && !out.tabs.includes(t)) out.tabs.push(t);
          }
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (/^(Save|Commit Version|Activate)$/.test(t) && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t, disabled: b.disabled || false });
            }
          }
          // Search for "Answer Questions with Knowledge" in any element to confirm action was added
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = (el.textContent || '').trim();
            if (/Answer Questions with Knowledge/i.test(t) && t.length < 200) {
              out.hasAQWK = true;
              break;
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('post-add probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '412-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '55-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
