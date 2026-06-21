// Phase 6b step 47: properly fire input events to trigger combobox filtering, then pick option.

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

    // Expand Data + click Data Library (using mouse on row coords)
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

    // Click input + use native setter to set value, then dispatch real input event
    const setOk = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const inp of Array.from(r.querySelectorAll('input'))) {
            const ph = inp.getAttribute('placeholder') || '';
            if (/Select a library/i.test(ph)) {
              inp.focus();
              const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
              const setter = desc && desc.set;
              if (setter) setter.call(inp, '');
              inp.dispatchEvent(new Event('input', { bubbles: true }));
              return { found: true };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { found: false };
    });
    console.log('input cleared:', setOk);
    await sleep(500);

    // Now use real keyboard typing via Playwright (input is focused)
    await p.keyboard.type('Electra', { delay: 100 });
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '330-search-typed.png'), fullPage: true });

    // Press ArrowDown to open dropdown
    await p.keyboard.press('ArrowDown');
    await sleep(1500);
    await p.screenshot({ path: path.join(SHOTS, '331-arrow-down.png'), fullPage: true });

    // Probe what's now visible
    const optionsProbe = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const li of Array.from(r.querySelectorAll('[role="option"], [role="listbox"] li, li, .slds-listbox__option'))) {
            const t = (li.textContent || '').trim();
            if (t && t.length < 80 && li.offsetParent !== null) {
              const rc = li.getBoundingClientRect();
              if (rc.height > 5 && rc.width > 50) {
                out.push({ text: t.slice(0, 80), tag: li.tagName, role: li.getAttribute('role'), rect: { l: rc.left, t: rc.top, w: rc.width, h: rc.height } });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out.slice(0, 30);
    });
    console.log('options now visible:', JSON.stringify(optionsProbe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '331-options.json'), JSON.stringify(optionsProbe, null, 2));

    // If we see Electra FAQ Library, click it
    const target = optionsProbe.find(o => /Electra FAQ Library/i.test(o.text));
    if (target) {
      console.log('clicking Electra FAQ Library at', target.rect);
      await p.mouse.click(target.rect.l + target.rect.w / 2, target.rect.t + target.rect.h / 2);
      await sleep(4000);
      await p.screenshot({ path: path.join(SHOTS, '332-after-pick.png'), fullPage: true });
    } else {
      console.log('no Electra FAQ Library option found yet; pressing Enter');
      await p.keyboard.press('Enter');
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, '332-after-enter.png'), fullPage: true });
    }

    // Click Save button
    const save = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t === 'Save' && !b.disabled && b.offsetParent !== null) {
              const rc = b.getBoundingClientRect();
              return { rect: { l: rc.left, t: rc.top, w: rc.width, h: rc.height } };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Save button:', save);
    if (save) {
      await p.mouse.click(save.rect.l + save.rect.w / 2, save.rect.t + save.rect.h / 2);
      await sleep(8000);
      await p.screenshot({ path: path.join(SHOTS, '333-after-save.png'), fullPage: true });
    }
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '47-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
