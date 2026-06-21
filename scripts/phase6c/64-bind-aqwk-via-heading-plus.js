// Phase 6c step 64: locate the small + button NEXT TO the
// "Actions Available For Reasoning" heading (not the black square at bottom-right).
// That's the one that opens the action picker.

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
    await p.screenshot({ path: path.join(SHOTS, '900-estado-pane.png'), fullPage: true });

    // Find the "Actions Available For Reasoning" heading element, then look for
    // a + button that is its sibling/child (NOT the black square at bottom-right).
    const headingPlus = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      const out = { headings: [], plusCandidates: [] };
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          // Find all headings/text containing "Actions Available For Reasoning"
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (/Actions Available For Reasoning/i.test(t) && t.length < 80) {
              const rc = el.getBoundingClientRect();
              if (rc.width > 0 && rc.height > 0) {
                out.headings.push({ l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height), tag: el.tagName });
                // Walk up + look for adjacent + buttons within parent containers
                let parent = el.parentElement;
                let depth = 0;
                while (parent && depth < 4) {
                  for (const btn of Array.from(parent.querySelectorAll('button, [role="button"]'))) {
                    const bt = (btn.textContent || '').trim();
                    if ((bt === '+' || bt === '' || bt.length <= 2) && btn.offsetParent !== null) {
                      const brc = btn.getBoundingClientRect();
                      if (brc.width > 10 && brc.width < 60 && brc.height > 10 && brc.height < 60) {
                        // distance from heading
                        const dy = Math.abs(brc.top - rc.top);
                        const dx = brc.left - rc.left;
                        const aria = btn.getAttribute('aria-label') || '';
                        const title = btn.getAttribute('title') || '';
                        out.plusCandidates.push({
                          l: Math.round(brc.left), t: Math.round(brc.top), w: Math.round(brc.width), h: Math.round(brc.height),
                          dx: Math.round(dx), dy: Math.round(dy), depth, aria, title, text: bt
                        });
                      }
                    }
                  }
                  parent = parent.parentElement;
                  depth++;
                }
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('headings found:', JSON.stringify(headingPlus.headings, null, 2));
    console.log('plus candidates:', JSON.stringify(headingPlus.plusCandidates, null, 2));
    fs.writeFileSync(path.join(SHOTS, '900-headings.json'), JSON.stringify(headingPlus, null, 2));

    // Pick the candidate that is on the SAME LINE as the heading (dy < 30) and to its right (dx > 0)
    let target = headingPlus.plusCandidates.find(c => c.dy < 30 && c.dx > 0 && c.dx < 600);
    if (!target) {
      // Fallback: closest candidate by total distance
      const sorted = headingPlus.plusCandidates.slice().sort((a, b) => (a.dy + Math.abs(a.dx)) - (b.dy + Math.abs(b.dx)));
      target = sorted[0];
    }
    console.log('chosen target:', target);
    if (!target) throw new Error('No + button found near Actions Available For Reasoning heading');

    await p.mouse.click(target.l + target.w / 2, target.t + target.h / 2);
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '901-after-heading-plus.png'), fullPage: true });

    // Look for either a directly-clickable AQWK item, OR a "Select action" placeholder, OR a popover with action picker
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

    // If not direct, look for "Select action" placeholder
    if (!aqwk) {
      const sel = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, button, [role="combobox"], [role="button"], span'))) {
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
      console.log('Select action placeholder:', sel);
      if (sel) {
        await p.mouse.click(sel.l + sel.w / 2, sel.t + sel.h / 2);
        await sleep(3000);
        await p.screenshot({ path: path.join(SHOTS, '902-select-action-open.png'), fullPage: true });

        // Now look for AQWK
        aqwk = await p.evaluate(() => {
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
        console.log('AQWK after select action:', aqwk);

        if (!aqwk) {
          // Try typing 'Answer' to filter
          await p.keyboard.type('Answer', { delay: 80 });
          await sleep(2500);
          await p.screenshot({ path: path.join(SHOTS, '902b-typed-answer.png'), fullPage: true });
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
      }
    }

    if (!aqwk) {
      // Snapshot all dropdown items for debugging
      const allItems = await p.evaluate(() => {
        const out = [];
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('li, [role="option"], [role="menuitem"], a, span'))) {
              const t = (el.textContent || '').trim();
              if (t && t.length > 2 && t.length < 80 && el.offsetParent !== null) {
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
      fs.writeFileSync(path.join(SHOTS, '902-allitems.json'), JSON.stringify(allItems, null, 2));
      throw new Error('AQWK not found in any dropdown / popover');
    }

    console.log('clicking AQWK:', aqwk);
    await p.mouse.click(aqwk.l + aqwk.w / 2, aqwk.t + aqwk.h / 2);
    await sleep(4000);
    await p.screenshot({ path: path.join(SHOTS, '903-aqwk-bound.png'), fullPage: true });

    // Save
    const saveBtn = await findEnabledExact(p, 'Save');
    if (saveBtn) {
      await p.mouse.click(saveBtn.l + saveBtn.w / 2, saveBtn.t + saveBtn.h / 2);
      await sleep(8000);
    }
    await p.screenshot({ path: path.join(SHOTS, '904-after-save.png'), fullPage: true });

    // Commit Version
    const cv = await findEnabledExact(p, 'Commit Version');
    if (cv) {
      await p.mouse.click(cv.l + cv.w / 2, cv.t + cv.h / 2);
      await sleep(3000);
      await p.screenshot({ path: path.join(SHOTS, '905-commit-modal.png'), fullPage: true });
      const modalCv = await findEnabledExact(p, 'Commit Version', { minTop: 200 });
      if (modalCv) {
        await p.mouse.click(modalCv.l + modalCv.w / 2, modalCv.t + modalCv.h / 2);
        await sleep(15000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '906-after-commit.png'), fullPage: true });

    // Activate
    const act = await findEnabledExact(p, 'Activate');
    if (act) {
      await p.mouse.click(act.l + act.w / 2, act.t + act.h / 2);
      await sleep(3000);
      const modalAct = await findEnabledExact(p, 'Activate', { minTop: 200 });
      if (modalAct) {
        await p.mouse.click(modalAct.l + modalAct.w / 2, modalAct.t + modalAct.h / 2);
        await sleep(15000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '907-after-activate.png'), fullPage: true });

    console.log('STEP 64 DONE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '64-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
