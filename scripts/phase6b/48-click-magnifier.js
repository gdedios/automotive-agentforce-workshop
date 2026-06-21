// Phase 6b step 48: type Electra in search input + click magnifier icon to trigger search.

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

    // Inspect the input to understand its tag, id, parent component
    const inputInfo = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const inp of Array.from(r.querySelectorAll('input'))) {
            const ph = inp.getAttribute('placeholder') || '';
            if (/Select a library/i.test(ph)) {
              const rc = inp.getBoundingClientRect();
              let parent = inp.parentElement;
              const chain = [];
              for (let i = 0; i < 8; i++) {
                if (!parent) break;
                chain.push({ tag: parent.tagName, role: parent.getAttribute('role'), cls: (parent.className || '').toString().slice(0, 80) });
                parent = parent.parentElement;
              }
              return {
                rect: { l: rc.left, t: rc.top, w: rc.width, h: rc.height },
                role: inp.getAttribute('role'),
                ariaExpanded: inp.getAttribute('aria-expanded'),
                ariaControls: inp.getAttribute('aria-controls'),
                ariaActiveDescendant: inp.getAttribute('aria-activedescendant'),
                ariaAutocomplete: inp.getAttribute('aria-autocomplete'),
                cls: (inp.className || '').toString().slice(0, 80),
                chain,
              };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('input info:', JSON.stringify(inputInfo, null, 2));

    // Click on the search input
    if (inputInfo) {
      await p.mouse.click(inputInfo.rect.l + inputInfo.rect.w / 2, inputInfo.rect.t + inputInfo.rect.h / 2);
      await sleep(800);
      // Check if dropdown opens just by focusing
      await p.screenshot({ path: path.join(SHOTS, '340-input-focused.png'), fullPage: true });

      // Probe for any newly visible options
      const opts = await p.evaluate(() => {
        const out = [];
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('[role="option"], [role="listbox"] *, .slds-listbox__option, li[role]'))) {
              const t = (el.textContent || '').trim();
              if (t && t.length < 80 && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                if (rc.height > 5 && rc.width > 50 && rc.top > inputInfo.rect.t) {
                  out.push({ text: t.slice(0, 80), tag: el.tagName, role: el.getAttribute('role'), rect: { l: rc.left, t: rc.top, w: rc.width, h: rc.height } });
                }
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return out.slice(0, 30);
      });
      console.log('options on focus:', JSON.stringify(opts.slice(0, 10), null, 2));

      // Try clicking the magnifier (search icon ~25px before right edge)
      const magnifierX = inputInfo.rect.l + inputInfo.rect.w - 20;
      const magnifierY = inputInfo.rect.t + inputInfo.rect.h / 2;
      console.log('clicking magnifier at', magnifierX, magnifierY);
      await p.mouse.click(magnifierX, magnifierY);
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, '341-after-magnifier.png'), fullPage: true });

      // Probe again
      const opts2 = await p.evaluate(() => {
        const out = [];
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('[role="option"], li, .slds-listbox__option'))) {
              const t = (el.textContent || '').trim();
              if (/Electra/i.test(t) && t.length < 80 && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                if (rc.height > 5 && rc.width > 50) {
                  out.push({ text: t.slice(0, 80), tag: el.tagName, role: el.getAttribute('role'), rect: { l: rc.left, t: rc.top, w: rc.width, h: rc.height } });
                }
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return out;
      });
      console.log('Electra options:', JSON.stringify(opts2, null, 2));
      fs.writeFileSync(path.join(SHOTS, '341-options.json'), JSON.stringify(opts2, null, 2));
    }
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '48-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
