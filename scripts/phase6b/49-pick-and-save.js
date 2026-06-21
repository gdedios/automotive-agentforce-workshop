// Phase 6b step 49: focus input → dropdown auto-opens → click Electra FAQ Library row → Save.

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

    // Expand Data + click Data Library
    const dataRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (t === 'Data' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 250 && rc.top > 200 && rc.top < 700) return { left: rc.left, top: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    if (dataRect) {
      await p.mouse.click(dataRect.left - 22, dataRect.top + dataRect.h / 2);
      await sleep(2500);
    }
    const dlRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (t === 'Data Library' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 250) return { left: rc.left, top: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    if (dlRect) await p.mouse.click(dlRect.left + dlRect.w / 2, dlRect.top + dlRect.h / 2);
    await sleep(6000);

    // Click input → dropdown opens
    const inputRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const inp of Array.from(r.querySelectorAll('input[role="combobox"]'))) {
            const ph = inp.getAttribute('placeholder') || '';
            if (/Select a library/i.test(ph)) {
              const rc = inp.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('input rect:', inputRect);
    if (!inputRect) throw new Error('input not found');

    await p.mouse.click(inputRect.l + inputRect.w / 2, inputRect.t + inputRect.h / 2);
    await sleep(1500);
    await p.screenshot({ path: path.join(SHOTS, '350-dropdown-open.png'), fullPage: true });

    // Find option by text "Electra FAQ Library" — search ALL elements for a parent containing that text
    const optRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('li, div, span, [role="option"], a'))) {
            // direct child text or first-level descendant
            const dt = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            const t = (el.textContent || '').trim();
            if ((dt === 'Electra FAQ Library' || /^Electra FAQ Library/.test(dt)) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.height > 5 && rc.height < 80 && rc.width > 50) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, tag: el.tagName, role: el.getAttribute('role') };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Electra option rect:', optRect);

    if (optRect) {
      // Click the row — center horizontally is safer
      await p.mouse.click(optRect.l + optRect.w / 2, optRect.t + optRect.h / 2);
      await sleep(3000);
      await p.screenshot({ path: path.join(SHOTS, '351-after-click-option.png'), fullPage: true });
    } else {
      // Fallback: hardcoded coords from screenshot — Electra FAQ Library row centered ~y=370
      console.log('option not found by text; clicking known coords (700, 370)');
      await p.mouse.click(700, 370);
      await sleep(3000);
      await p.screenshot({ path: path.join(SHOTS, '351-fallback-click.png'), fullPage: true });
    }

    // Verify input now shows Electra FAQ Library
    const inputVal = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const inp of Array.from(r.querySelectorAll('input[role="combobox"]'))) {
            const ph = inp.getAttribute('placeholder') || '';
            if (/library/i.test(ph) || inp.value) return { value: inp.value, placeholder: ph };
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('input after pick:', inputVal);

    // Click Save
    const saveRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Save' && !b.disabled && b.offsetParent !== null) {
              const rc = b.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Save rect:', saveRect);
    if (saveRect) {
      await p.mouse.click(saveRect.l + saveRect.w / 2, saveRect.t + saveRect.h / 2);
      await sleep(8000);
      await p.screenshot({ path: path.join(SHOTS, '352-after-save.png'), fullPage: true });
    }

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '49-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
