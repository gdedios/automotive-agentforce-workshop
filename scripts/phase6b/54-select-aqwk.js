// Phase 6b step 54: in Asset Library modal, click Select on "Answer Questions with Knowledge", then Add to Agent.

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
    if (aslRect) await p.mouse.click(aslRect.l + aslRect.w / 2, aslRect.t + aslRect.h / 2);
    await sleep(6000);

    // Type "Answer" in the action search box
    await p.mouse.click(900, 161); // Search actions...
    await sleep(800);
    await p.keyboard.type('Answer', { delay: 60 });
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '400-search-answer.png'), fullPage: true });

    // Find "Answer Questions with Knowledge" card → its Select button
    const selRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          // First find a header/title element with the action name
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = (el.textContent || '').trim();
            // The card title may be truncated; match the prefix
            if (/^Answer Questions with Knowl/i.test(t) && t.length < 100 && el.offsetParent !== null) {
              // Walk up to a card-like ancestor, then find a Select button inside
              let card = el;
              for (let i = 0; i < 6; i++) {
                if (!card) break;
                const btn = card.querySelector('button');
                if (btn && (btn.textContent || '').trim() === 'Select' && btn.offsetParent !== null) {
                  const rc = btn.getBoundingClientRect();
                  return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, found: true };
                }
                card = card.parentElement;
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('AQWK Select rect:', selRect);
    if (!selRect) throw new Error('AQWK select button not found');

    await p.mouse.click(selRect.l + selRect.w / 2, selRect.t + selRect.h / 2);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '401-aqwk-selected.png'), fullPage: true });

    // Click Add to Agent
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
    if (!addRect) throw new Error('Add to Agent button not enabled');
    await p.mouse.click(addRect.l + addRect.w / 2, addRect.t + addRect.h / 2);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '402-after-add.png'), fullPage: true });

    // Probe — what tab is now visible? Should be the AQWK action editor inside Estado y FAQ
    const probe = await p.evaluate(() => {
      const out = { headings: [], tabs: [], buttons: [] };
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
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('post-add probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '402-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '54-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
