// Phase 6c step 65: ONE-SESSION bind.
// 1) switch to V4
// 2) click Estado y FAQ
// 3) click big black + at right
// 4) click "Reasoning Instructions" in popover  → adds Select action ▾ row
// 5) click that Select action ▾ row → dropdown of agent-level assets
// 6) click Answer Questions with Knowledge
// 7) Save → header Commit → modal Commit → header Activate → modal Activate
// All without relaunching the browser, so the V4 Draft state is preserved.

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
    await p.screenshot({ path: path.join(SHOTS, '950-v4-loaded.png'), fullPage: true });

    // Click Estado y FAQ
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
    if (estado) { await p.mouse.click(estado.l + estado.w / 2, estado.t + estado.h / 2); await sleep(3000); }
    await p.screenshot({ path: path.join(SHOTS, '951-estado-pane.png'), fullPage: true });

    // Click big black + at bottom-right of canvas (the ONE that opens the action picker popover).
    // Coordinates from prior screenshots: ~(1159, 863) but now find it via DOM.
    const plusBtn = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      let best = null;
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, [role="button"]'))) {
            const t = (el.textContent || '').trim();
            if (t.length <= 2 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.width > 18 && rc.width < 50 && rc.height > 18 && rc.height < 50 &&
                  rc.left > 800 && rc.left < 1300 && rc.top > 250 && rc.top < 950) {
                if (!best || rc.top > best.t) best = { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return best;
    });
    console.log('+ button:', plusBtn);
    if (!plusBtn) throw new Error('No big + button');
    await p.mouse.click(plusBtn.l + plusBtn.w / 2, plusBtn.t + plusBtn.h / 2);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '952-plus-popover.png'), fullPage: true });

    // Click "Reasoning Instructions" in the popover (Subagent Actions section)
    const reasoningItem = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, button, li, [role="menuitem"], [role="option"], div, span'))) {
            const t = (el.textContent || '').trim();
            if (/^(Reasoning Instructions|Add Action for Reasoning)$/i.test(t) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.width > 50 && rc.width < 400) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Reasoning Instructions item:', reasoningItem);
    if (!reasoningItem) throw new Error('Reasoning Instructions not in popover');
    await p.mouse.click(reasoningItem.l + reasoningItem.w / 2, reasoningItem.t + reasoningItem.h / 2);
    await sleep(3500);
    await p.screenshot({ path: path.join(SHOTS, '953-after-reasoning-clicked.png'), fullPage: true });

    // Now find the new "Select action ▾" row that just appeared
    const selectAction = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, button, [role="combobox"], [role="button"], span, div'))) {
            const t = (el.textContent || '').trim();
            if (/^Select action/i.test(t) && t.length < 40 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.width > 0 && rc.height > 0 && rc.top > 200) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Select action row:', selectAction);
    if (!selectAction) throw new Error('Select action row not found after Reasoning Instructions click');

    await p.mouse.click(selectAction.l + selectAction.w / 2, selectAction.t + selectAction.h / 2);
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '954-action-dropdown-open.png'), fullPage: true });

    // Snapshot all dropdown items
    const allItems = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('li, [role="option"], [role="menuitem"], a, button'))) {
            const t = (el.textContent || '').trim();
            if (t && t.length > 2 && t.length < 100 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top > 100 && !out.find(x => x.text === t)) {
                out.push({ text: t, l: Math.round(rc.left), t: Math.round(rc.top) });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    fs.writeFileSync(path.join(SHOTS, '954-allitems.json'), JSON.stringify(allItems, null, 2));
    console.log('items count:', allItems.length, 'sample:', allItems.slice(0, 30).map(x => x.text));

    // Find AQWK
    let aqwk = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, li, button, span, [role="option"], [role="menuitem"]'))) {
            const t = (el.textContent || '').trim();
            if (/^(Answer Questions with Knowledge|AnswerQuestionsWithKnowledge)/i.test(t) && t.length < 60 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('AQWK direct:', aqwk);

    if (!aqwk) {
      // Type to filter
      await p.keyboard.type('Answer', { delay: 80 });
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, '955-typed-answer.png'), fullPage: true });
      aqwk = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, li, button, span, [role="option"], [role="menuitem"]'))) {
              const t = (el.textContent || '').trim();
              if (/Answer Questions with Knowledge|AnswerQuestionsWithKnowledge/i.test(t) && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      console.log('AQWK after typing:', aqwk);
    }

    if (!aqwk) throw new Error('AQWK not found after typing');

    await p.mouse.click(aqwk.l + aqwk.w / 2, aqwk.t + aqwk.h / 2);
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '956-aqwk-bound.png'), fullPage: true });

    // Save
    const saveBtn = await findEnabledExact(p, 'Save');
    if (saveBtn) {
      console.log('clicking Save at', saveBtn);
      await p.mouse.click(saveBtn.l + saveBtn.w / 2, saveBtn.t + saveBtn.h / 2);
      await sleep(8000);
    }
    await p.screenshot({ path: path.join(SHOTS, '957-after-save.png'), fullPage: true });

    // Commit Version
    const cv = await findEnabledExact(p, 'Commit Version');
    if (cv) {
      console.log('clicking header Commit Version');
      await p.mouse.click(cv.l + cv.w / 2, cv.t + cv.h / 2);
      await sleep(3000);
      await p.screenshot({ path: path.join(SHOTS, '958-commit-modal.png'), fullPage: true });
      const modalCv = await findEnabledExact(p, 'Commit Version', { minTop: 200 });
      if (modalCv) {
        console.log('confirming Commit');
        await p.mouse.click(modalCv.l + modalCv.w / 2, modalCv.t + modalCv.h / 2);
        await sleep(15000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '959-after-commit.png'), fullPage: true });

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
    await p.screenshot({ path: path.join(SHOTS, '960-after-activate.png'), fullPage: true });

    console.log('STEP 65 DONE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '65-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
