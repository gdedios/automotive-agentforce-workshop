// Phase 6c step 63: A "Select action ▾" row was inserted by the previous step.
// Click it → dropdown of agent-level actions → pick AnswerQuestionsWithKnowledge.
// Then Save → Commit V4 → Activate.

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
    await p.screenshot({ path: path.join(SHOTS, '800-estado-pane.png'), fullPage: true });

    // Look for "Select action" — was the placeholder added on previous run? If not, click + button first.
    let selectAction = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, button, [role="combobox"], [role="button"]'))) {
            const t = (el.textContent || '').trim();
            if (/^Select action/i.test(t) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Select action existing:', selectAction);

    if (!selectAction) {
      // Click + button → tooltip "Add Action for Reasoning" → that creates the row
      const plusBtn = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('button, [role="button"]'))) {
              const t = (el.textContent || '').trim();
              if (t.length <= 2 && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                if (rc.width > 18 && rc.width < 50 && rc.height > 18 && rc.height < 50 && rc.left > 800 && rc.left < 1300 && rc.top > 250 && rc.top < 950) {
                  return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
                }
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      if (plusBtn) {
        await p.mouse.click(plusBtn.l + plusBtn.w / 2, plusBtn.t + plusBtn.h / 2);
        await sleep(2000);
        // Click on the popover item — "Add Action for Reasoning"
        const popoverItem = await p.evaluate(() => {
          const queue = [document]; const v = new Set();
          while (queue.length) {
            const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
            try {
              for (const el of Array.from(r.querySelectorAll('a, button, li, [role="menuitem"], [role="option"]'))) {
                const t = (el.textContent || '').trim();
                if (/Add Action for Reasoning/i.test(t) && el.offsetParent !== null) {
                  const rc = el.getBoundingClientRect();
                  return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
                }
              }
              for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
            } catch {}
          }
          return null;
        });
        if (popoverItem) {
          await p.mouse.click(popoverItem.l + popoverItem.w / 2, popoverItem.t + popoverItem.h / 2);
          await sleep(3000);
        }
        await p.screenshot({ path: path.join(SHOTS, '801-after-add-reasoning.png'), fullPage: true });

        selectAction = await p.evaluate(() => {
          const queue = [document]; const v = new Set();
          while (queue.length) {
            const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
            try {
              for (const el of Array.from(r.querySelectorAll('a, button, [role="combobox"], [role="button"]'))) {
                const t = (el.textContent || '').trim();
                if (/^Select action/i.test(t) && el.offsetParent !== null) {
                  const rc = el.getBoundingClientRect();
                  return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
                }
              }
              for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
            } catch {}
          }
          return null;
        });
        console.log('Select action after add:', selectAction);
      }
    }

    if (!selectAction) {
      throw new Error('Could not find Select action dropdown');
    }

    // Click Select action dropdown
    console.log('clicking Select action at', selectAction);
    await p.mouse.click(selectAction.l + selectAction.w / 2, selectAction.t + selectAction.h / 2);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '802-select-action-open.png'), fullPage: true });

    // Find AQWK in the dropdown
    const aqwkOption = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, li, [role="option"], [role="menuitem"], button, span'))) {
            const t = (el.textContent || '').trim();
            if (/^(Answer Questions with Knowledge|AnswerQuestionsWithKnowledge|streamKnowledgeSearch)/i.test(t) && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.width > 0 && rc.height > 0) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('AQWK option:', aqwkOption);

    // Snapshot all visible dropdown items for debugging
    const allOptions = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('li, [role="option"], [role="menuitem"]'))) {
            const t = (el.textContent || '').trim();
            if (t && t.length > 2 && t.length < 100 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top > 100 && rc.left > 200 && !out.find(x => x.text === t)) {
                out.push({ text: t, l: Math.round(rc.left), t: Math.round(rc.top) });
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('all dropdown options:', JSON.stringify(allOptions, null, 2));
    fs.writeFileSync(path.join(SHOTS, '802-options.json'), JSON.stringify(allOptions, null, 2));

    if (aqwkOption) {
      await p.mouse.click(aqwkOption.l + aqwkOption.w / 2, aqwkOption.t + aqwkOption.h / 2);
      await sleep(4000);
      await p.screenshot({ path: path.join(SHOTS, '803-aqwk-picked.png'), fullPage: true });
    } else {
      console.log('AQWK not in dropdown — search field may be needed');
      // Type "Answer" if there's a search box visible
      await p.keyboard.type('Answer', { delay: 60 });
      await sleep(2500);
      await p.screenshot({ path: path.join(SHOTS, '802b-after-type-answer.png'), fullPage: true });

      const aqwk2 = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, li, [role="option"], [role="menuitem"], button, span'))) {
              const t = (el.textContent || '').trim();
              if (/Answer Questions with Knowledge|AnswerQuestionsWithKnowledge/i.test(t) && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                if (rc.width > 0) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      console.log('AQWK after typing:', aqwk2);
      if (aqwk2) {
        await p.mouse.click(aqwk2.l + aqwk2.w / 2, aqwk2.t + aqwk2.h / 2);
        await sleep(4000);
      }
      await p.screenshot({ path: path.join(SHOTS, '803-aqwk-picked.png'), fullPage: true });
    }

    // Save
    const saveBtn = await findEnabledExact(p, 'Save');
    if (saveBtn) {
      console.log('clicking Save');
      await p.mouse.click(saveBtn.l + saveBtn.w / 2, saveBtn.t + saveBtn.h / 2);
      await sleep(8000);
    }
    await p.screenshot({ path: path.join(SHOTS, '804-after-save.png'), fullPage: true });

    // Commit Version
    const cv = await findEnabledExact(p, 'Commit Version');
    if (cv) {
      console.log('clicking header Commit Version');
      await p.mouse.click(cv.l + cv.w / 2, cv.t + cv.h / 2);
      await sleep(3000);
      await p.screenshot({ path: path.join(SHOTS, '805-commit-modal.png'), fullPage: true });
      const modalCv = await findEnabledExact(p, 'Commit Version', { minTop: 200 });
      if (modalCv) {
        console.log('confirming Commit');
        await p.mouse.click(modalCv.l + modalCv.w / 2, modalCv.t + modalCv.h / 2);
        await sleep(15000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '806-after-commit.png'), fullPage: true });

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
    await p.screenshot({ path: path.join(SHOTS, '807-after-activate.png'), fullPage: true });

    console.log('STEP 63 DONE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '63-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
