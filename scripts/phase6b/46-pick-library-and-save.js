// Phase 6b step 46: open Data Library combobox, select Electra FAQ Library, Save.

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

async function clickDataNode(p) {
  // Real mouse click at approx (22, 553) where Data row chevron lives.
  // Find Data row dynamically in case viewport shifts.
  const rect = await p.evaluate(() => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const el of Array.from(r.querySelectorAll('*'))) {
          const directText = Array.from(el.childNodes)
            .filter(n => n.nodeType === 3)
            .map(n => n.textContent.trim())
            .join('');
          if (directText === 'Data' && el.offsetParent !== null) {
            const rc = el.getBoundingClientRect();
            if (rc.left < 250 && rc.top > 200 && rc.top < 700) {
              return { left: rc.left, top: rc.top, w: rc.width, h: rc.height };
            }
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return null;
  });
  if (!rect) return false;
  // chevron is to the LEFT of text — click ~22px left of rect.left
  await p.mouse.click(rect.left - 22, rect.top + rect.h / 2);
  await sleep(2500);
  return true;
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

    // Expand Data + click Data Library
    await clickDataNode(p);
    // Find + click Data Library
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
    await p.screenshot({ path: path.join(SHOTS, '320-dl-pane.png'), fullPage: true });

    // Find the combobox / search input "Select a library..."
    const inputRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const inp of Array.from(r.querySelectorAll('input'))) {
            const ph = inp.getAttribute('placeholder') || '';
            if (/Select a library/i.test(ph)) {
              const rc = inp.getBoundingClientRect();
              return { left: rc.left, top: rc.top, w: rc.width, h: rc.height, placeholder: ph };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('library input:', inputRect);
    if (!inputRect) throw new Error('library input not found');

    // Click + type to filter
    await p.mouse.click(inputRect.left + inputRect.w / 2, inputRect.top + inputRect.h / 2);
    await sleep(1500);
    await p.keyboard.type('Electra', { delay: 60 });
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '321-search-electra.png'), fullPage: true });

    // Find dropdown option for Electra FAQ Library
    const optRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const li of Array.from(r.querySelectorAll('li, [role="option"], div, span, a'))) {
            const t = (li.textContent || '').trim();
            if (/^Electra FAQ Library/.test(t) && li.offsetParent !== null && t.length < 60) {
              const rc = li.getBoundingClientRect();
              if (rc.width > 50 && rc.height > 10) {
                return { left: rc.left, top: rc.top, w: rc.width, h: rc.height, tag: li.tagName, text: t };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('library option:', optRect);
    if (!optRect) {
      // Try ArrowDown + Enter as fallback
      console.log('no option found, trying ArrowDown + Enter');
      await p.keyboard.press('ArrowDown');
      await sleep(800);
      await p.keyboard.press('Enter');
    } else {
      await p.mouse.click(optRect.left + optRect.w / 2, optRect.top + optRect.h / 2);
    }
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '322-after-pick.png'), fullPage: true });

    // Verify Show sources is checked (it appeared checked)
    const showSources = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const inp of Array.from(r.querySelectorAll('input[type="checkbox"]'))) {
            const lbl = (inp.closest('label')?.textContent || '').trim() ||
                        (inp.getAttribute('aria-label') || '');
            if (/show sources/i.test(lbl)) {
              return { checked: inp.checked, lbl };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Show sources state:', showSources);

    // Click Save
    const save = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Save' && !b.disabled) {
              const rc = b.getBoundingClientRect();
              const x = rc.left + rc.width / 2;
              const y = rc.top + rc.height / 2;
              const fire = (type, EventCtor = MouseEvent) => {
                b.dispatchEvent(new EventCtor(type, { bubbles: true, cancelable: true, view: window, button: 0, clientX: x, clientY: y }));
              };
              fire('pointerover', PointerEvent);
              fire('pointerdown', PointerEvent);
              fire('mousedown');
              fire('pointerup', PointerEvent);
              fire('mouseup');
              fire('click');
              return { fired: true };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { fired: false };
    });
    console.log('click Save:', save);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '323-after-save.png'), fullPage: true });
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '46-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
