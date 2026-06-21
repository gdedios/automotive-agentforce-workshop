// Phase 6c step 61: Switch to V4 Draft, expand Estado y FAQ subagent, click "+ Add action to subagent",
// select AnswerQuestionsWithKnowledge. Save → Commit V4 → Activate.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6c_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
const CANVAS_ROOT = `${LIGHTNING_HOST}/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYgK00000081TaUAI&projectVersionId=1bZgK000000FrC5UAK`;

if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

async function findExact(p, label, opts = {}) {
  const tag = opts.tag || 'button';
  const filter = opts.filter || (() => true);
  return await p.evaluate(({ lbl, tag }) => {
    const queue = [document]; const v = new Set();
    const matches = [];
    while (queue.length) {
      const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
      try {
        for (const el of Array.from(r.querySelectorAll(tag))) {
          const t = (el.textContent || '').trim();
          if (t === lbl && el.offsetParent !== null && !el.disabled) {
            const rc = el.getBoundingClientRect();
            matches.push({ l: rc.left, t: rc.top, w: rc.width, h: rc.height });
          }
        }
        for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
      } catch {}
    }
    return matches;
  }, { lbl: label, tag }).then(arr => arr.filter(filter));
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
    await p.goto(CANVAS_ROOT, { waitUntil: 'domcontentloaded' });
    await sleep(20000);
    await p.screenshot({ path: path.join(SHOTS, '600-canvas.png'), fullPage: true });

    // Find current version. If V4 exists, click the version dropdown and select it.
    const verState = await p.evaluate(() => {
      const out = { versions: [], dropdownChevron: null };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (/Version \d+ \(/.test(t) && t.length < 80 && !out.versions.includes(t)) out.versions.push(t);
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('versions visible:', verState.versions);

    // Click version dropdown to switch to V4. The dropdown trigger looks like "Version X (status) ▾" near the top of canvas.
    // Find a clickable element containing "Version " in its text.
    const versionTrigger = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('button, a, [role="button"], [aria-haspopup]'))) {
            const t = (el.textContent || '').trim();
            if (/^Version \d+ \(/.test(t) && t.length < 80 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.top < 100 && rc.left < 600) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('version trigger:', versionTrigger);
    if (versionTrigger) {
      await p.mouse.click(versionTrigger.l + versionTrigger.w / 2, versionTrigger.t + versionTrigger.h / 2);
      await sleep(2000);
      await p.screenshot({ path: path.join(SHOTS, '601-version-dropdown.png'), fullPage: true });

      // Click Version 4 entry
      const v4Entry = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, li, [role="option"], [role="menuitem"], button'))) {
              const t = (el.textContent || '').trim();
              if (/^Version 4/.test(t) && t.length < 80 && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, text: t };
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      console.log('V4 entry:', v4Entry);
      if (v4Entry) {
        await p.mouse.click(v4Entry.l + v4Entry.w / 2, v4Entry.t + v4Entry.h / 2);
        await sleep(8000);
      }
    }
    await p.screenshot({ path: path.join(SHOTS, '602-after-v4-select.png'), fullPage: true });

    // Now click Estado y FAQ tree node to OPEN it (not just select). The tree node click in screenshot 510 only highlighted; we need to either double-click or click the chevron.
    // Try clicking the LABEL text directly first.
    const estadoNode = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, button, [role="treeitem"], li, span'))) {
            const t = (el.textContent || '').trim();
            if (t === 'Estado y FAQ' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 400 && rc.width < 200) {
                return { l: rc.left, t: rc.top, w: rc.width, h: rc.height, tag: el.tagName };
              }
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Estado y FAQ node:', estadoNode);
    if (estadoNode) {
      await p.mouse.click(estadoNode.l + estadoNode.w / 2, estadoNode.t + estadoNode.h / 2);
      await sleep(3000);
    }
    await p.screenshot({ path: path.join(SHOTS, '603-estado-clicked.png'), fullPage: true });

    // Now scroll to find "+ Add action to subagent" trigger in the right panel
    // Try every variant
    const addTriggers = await p.evaluate(() => {
      const out = [];
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('a, button, [role="button"]'))) {
            const t = (el.textContent || '').trim();
            if (/Add action|\+ Add|Add to subagent|Add reasoning|Add Action/i.test(t) && t.length < 80 && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              out.push({ text: t, l: Math.round(rc.left), t: Math.round(rc.top), w: Math.round(rc.width), h: Math.round(rc.height), tag: el.tagName });
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('Add triggers:', JSON.stringify(addTriggers, null, 2));
    fs.writeFileSync(path.join(SHOTS, '603-add-triggers.json'), JSON.stringify(addTriggers, null, 2));

    if (addTriggers.length > 0) {
      // Pick the rightmost one (in the canvas pane, not left tree)
      const candidate = addTriggers.find(b => b.l > 400 && b.l < 1100) || addTriggers[0];
      console.log('clicking trigger:', candidate);
      await p.mouse.click(candidate.l + candidate.w / 2, candidate.t + candidate.h / 2);
      await sleep(3000);
      await p.screenshot({ path: path.join(SHOTS, '604-after-add-click.png'), fullPage: true });

      // Probe what menu / dropdown appeared
      const menu = await p.evaluate(() => {
        const out = { items: [] };
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const el of Array.from(r.querySelectorAll('a, li, [role="option"], [role="menuitem"], button, .slds-listbox__item'))) {
              const t = (el.textContent || '').trim();
              if (t && t.length < 100 && t.length > 2 && el.offsetParent !== null) {
                const rc = el.getBoundingClientRect();
                if (!out.items.find(x => x.text === t) && rc.top > 100) {
                  out.items.push({ text: t, l: Math.round(rc.left), t: Math.round(rc.top), tag: el.tagName });
                }
              }
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        // Filter to anything that looks like an action/AQWK
        return out.items.filter(i => /Knowledge|Answer|AQWK|Asset Library|Add from/i.test(i.text));
      });
      console.log('menu items:', JSON.stringify(menu, null, 2));
      fs.writeFileSync(path.join(SHOTS, '604-menu-probe.json'), JSON.stringify(menu, null, 2));
    }

    console.log('PROBE 61 DONE');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '61-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(5000);
    await ctx.close();
  }
})();
