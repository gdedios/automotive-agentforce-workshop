// Phase 6c step 67: in the Asset Library modal, click the Select button on the
// "Answer Questions with Knowledge" card (text is truncated as "Knowle..."), then
// click "Add to Agent" at bottom-right.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6c_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const CANVAS_V3 = `${LIGHTNING_HOST}/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYgK00000081TaUAI&projectVersionId=1bZgK000000FrC5UAK`;

async function findEnabledExact(p, label, opts = {}) {
  const tag = opts.tag || 'button';
  const minTop = opts.minTop ?? -Infinity;
  return await p.evaluate(({ lbl, tag, minTop }) => {
    const queue = [document]; const v = new Set();
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const el of Array.from(r.querySelectorAll(tag))) {
          const t = (el.textContent || '').trim();
          if (t === lbl && !el.disabled && el.offsetParent !== null) {
            const rc = el.getBoundingClientRect();
            if (rc.top >= minTop) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return null;
  }, { lbl: label, tag, minTop });
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

    // Switch to V4
    const verTrigger = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, a, [aria-haspopup]'))) {
            const t = (el.textContent || '').trim();
            if (/^Version \d+ \(/.test(t) && t.length < 80 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top < 100 && rc.left < 600) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    if (verTrigger) {
      await p.mouse.click(verTrigger.l + verTrigger.w / 2, verTrigger.t + verTrigger.h / 2);
      await sleep(1500);
      const v4 = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, li, [role="option"], [role="menuitem"], button'))) {
              const t = (el.textContent || '').trim();
              if (/^Version 4/.test(t) && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      if (v4) { await p.mouse.click(v4.l + v4.w / 2, v4.t + v4.h / 2); await sleep(8000); }
    }

    // Hover Estado y FAQ
    const estado = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('span, a'))) {
            const t = (el.textContent || '').trim();
            if (t === 'Estado y FAQ' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 400 && rc.width < 200) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    await p.mouse.click(estado.l + estado.w / 2, estado.t + estado.h / 2);
    await sleep(2000);
    await p.mouse.move(estado.l + estado.w / 2, estado.t + estado.h / 2);
    await sleep(1500);

    // Click "Add action to subagent" + button
    const addBtn = await p.evaluate(({ etop }) => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, [role="button"], a'))) {
            const aria = el.getAttribute('aria-label') || '';
            if (/Add action to subagent/i.test(aria) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (Math.abs(rc.top - etop) < 20) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    }, { etop: estado.t });
    console.log('+ Add action btn:', addBtn);
    await p.mouse.click(addBtn.l + addBtn.w / 2, addBtn.t + addBtn.h / 2);
    await sleep(2500);

    // In dropdown, click "Add from Asset Library"
    const fromLib = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, li, button, [role="menuitem"]'))) {
            const t = (el.textContent || '').trim();
            if (/^Add from Asset Library$/i.test(t) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Add from Asset Library:', fromLib);
    await p.mouse.click(fromLib.l + fromLib.w / 2, fromLib.t + fromLib.h / 2);
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '980-asset-library-modal.png'), fullPage: true });

    // In Asset Library modal: search for "Answer"
    const searchBox = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('input[type="search"], input[type="text"], input[placeholder*="Search"], input[placeholder*="search"]'))) {
            if (el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top > 100 && rc.top < 250 && rc.width > 200) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('search box:', searchBox);
    if (searchBox) {
      await p.mouse.click(searchBox.l + searchBox.w / 2, searchBox.t + searchBox.h / 2);
      await sleep(500);
      await p.keyboard.type('Answer Questions', { delay: 60 });
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, '981-search-typed.png'), fullPage: true });
    }

    // Click the AQWK card's Select button.
    // The card heading is "Answer Questions with Knowle..." (truncated). Find the card by aria-label or title attribute.
    const aqwkCard = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          // Find any element whose full title or aria-label or innerText starts with "Answer Questions with Knowledge"
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = (el.getAttribute('title') || '') + '|' + (el.getAttribute('aria-label') || '');
            const text = (el.textContent || '').trim();
            if ((/Answer Questions with Knowledge/i.test(t) || /^Answer Questions with Knowle/i.test(text)) && el.offsetParent !== null) {
              // Walk up to find the card, then find its "Select" button
              let card = el;
              for (let i = 0; i < 6; i++) {
                if (!card) break;
                const sel = card.querySelector ? card.querySelector('button') : null;
                if (sel) {
                  // Look for Select button inside this subtree
                  const buttons = card.querySelectorAll('button');
                  for (const b of buttons) {
                    const bt = (b.textContent || '').trim();
                    if (bt === 'Select' && b.offsetParent !== null) {
                      const rc = b.getBoundingClientRect();
                      return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, source: 'card walk', cardTag: card.tagName };
                    }
                  }
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
    console.log('AQWK Select btn:', aqwkCard);

    if (!aqwkCard) {
      // After search filter, only the AQWK card should remain — find any "Select" button in the modal area
      const anySelect = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        const out = [];
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('button'))) {
              const t = (el.textContent || '').trim();
              if (t === 'Select' && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                if (rc.top > 200 && rc.top < 900) {
                  out.push({ l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height) });
                }
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return out;
      });
      console.log('all Select buttons in modal:', JSON.stringify(anySelect, null, 2));
      if (anySelect.length === 1) {
        const sel = anySelect[0];
        await p.mouse.click(sel.l + sel.w / 2, sel.t + sel.h / 2);
        await sleep(2500);
      } else if (anySelect.length > 1) {
        // pick the first one (top-most)
        const sel = anySelect.sort((a,b)=>a.t-b.t)[0];
        await p.mouse.click(sel.l + sel.w / 2, sel.t + sel.h / 2);
        await sleep(2500);
      }
    } else {
      await p.mouse.click(aqwkCard.l + aqwkCard.w / 2, aqwkCard.t + aqwkCard.h / 2);
      await sleep(2500);
    }
    await p.screenshot({ path: path.join(SHOTS, '982-after-select.png'), fullPage: true });

    // Click "Add to Agent"
    const addToAgent = await findEnabledExact(p, 'Add to Agent');
    console.log('Add to Agent btn:', addToAgent);
    if (addToAgent) {
      await p.mouse.click(addToAgent.l + addToAgent.w / 2, addToAgent.t + addToAgent.h / 2);
      await sleep(6000);
    }
    await p.screenshot({ path: path.join(SHOTS, '983-after-add-to-agent.png'), fullPage: true });

    // Save
    const saveBtn = await findEnabledExact(p, 'Save');
    if (saveBtn) {
      console.log('clicking Save');
      await p.mouse.click(saveBtn.l + saveBtn.w / 2, saveBtn.t + saveBtn.h / 2);
      await sleep(8000);
    }
    await p.screenshot({ path: path.join(SHOTS, '984-after-save.png'), fullPage: true });

    // Commit
    const cv = await findEnabledExact(p, 'Commit Version');
    if (cv) {
      console.log('clicking header Commit Version');
      await p.mouse.click(cv.l + cv.w / 2, cv.t + cv.h / 2);
      await sleep(3000);
      const modalCv = await findEnabledExact(p, 'Commit Version', { minTop: 200 });
      if (modalCv) {
        console.log('confirming Commit');
        await p.mouse.click(modalCv.l + modalCv.w / 2, modalCv.t + modalCv.h / 2);
        await sleep(20000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '985-after-commit.png'), fullPage: true });

    // Activate
    const act = await findEnabledExact(p, 'Activate');
    if (act) {
      console.log('clicking Activate');
      await p.mouse.click(act.l + act.w / 2, act.t + act.h / 2);
      await sleep(3000);
      const modalAct = await findEnabledExact(p, 'Activate', { minTop: 200 });
      if (modalAct) {
        console.log('confirming Activate');
        await p.mouse.click(modalAct.l + modalAct.w / 2, modalAct.t + modalAct.h / 2);
        await sleep(15000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '986-after-activate.png'), fullPage: true });

    console.log('STEP 67 DONE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '67-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
