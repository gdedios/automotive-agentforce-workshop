// Phase 6b step 50: enable Show sources checkbox, save, then open Estado_y_FAQ subagent
// and probe how to Add Action.

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

async function clickDataLibraryNav(p) {
  // Expand Data and click Data Library
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

    await clickDataLibraryNav(p);
    await p.screenshot({ path: path.join(SHOTS, '360-dl-loaded.png'), fullPage: true });

    // Find Show sources checkbox
    const cbInfo = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const inp of Array.from(r.querySelectorAll('input[type="checkbox"]'))) {
            const lbl = inp.closest('label');
            const lblText = (lbl?.textContent || '').trim();
            const aria = inp.getAttribute('aria-label') || '';
            if (/show sources/i.test(lblText) || /show sources/i.test(aria)) {
              const rc = inp.getBoundingClientRect();
              const lblRc = lbl?.getBoundingClientRect();
              return {
                checked: inp.checked,
                disabled: inp.disabled,
                rect: { l: rc.left, t: rc.top, w: rc.width, h: rc.height },
                lblRect: lblRc ? { l: lblRc.left, t: lblRc.top, w: lblRc.width, h: lblRc.height } : null,
                lblText: lblText.slice(0, 80),
              };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('show-sources cb:', cbInfo);

    if (cbInfo && !cbInfo.checked && !cbInfo.disabled) {
      // Click the label (clicking the input itself doesn't always toggle in SLDS)
      const r = cbInfo.lblRect || cbInfo.rect;
      await p.mouse.click(r.l + 10, r.t + r.h / 2);
      await sleep(1500);
      await p.screenshot({ path: path.join(SHOTS, '361-show-sources-toggled.png'), fullPage: true });

      const after = await p.evaluate(() => {
        const queue = [document]; const v = new Set();
        while (queue.length) {
          const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
          try {
            for (const inp of Array.from(r.querySelectorAll('input[type="checkbox"]'))) {
              const lbl = inp.closest('label');
              const lblText = (lbl?.textContent || '').trim();
              if (/show sources/i.test(lblText)) return { checked: inp.checked };
            }
            for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
          } catch {}
        }
        return null;
      });
      console.log('show-sources after toggle:', after);

      // If Save button is enabled, click it again
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
        await p.screenshot({ path: path.join(SHOTS, '362-saved-with-sources.png'), fullPage: true });
      }
    } else {
      console.log('Show sources already correct or disabled');
    }

    // Now expand Estado y FAQ subagent and probe what's inside
    // Click "Estado y FAQ" treeitem (under Subagents)
    const efaqRect = await p.evaluate(() => {
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const el of Array.from(r.querySelectorAll('*'))) {
            const t = Array.from(el.childNodes).filter(n => n.nodeType === 3).map(n => n.textContent.trim()).join('');
            if (t === 'Estado y FAQ' && el.offsetParent !== null) {
              const rc = el.getBoundingClientRect();
              if (rc.left < 300) return { l: rc.left, t: rc.top, w: rc.width, h: rc.height };
            }
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return null;
    });
    console.log('Estado y FAQ rect:', efaqRect);
    if (efaqRect) {
      // Click the chevron to expand
      await p.mouse.click(efaqRect.l - 22, efaqRect.t + efaqRect.h / 2);
      await sleep(2000);
      await p.screenshot({ path: path.join(SHOTS, '363-efaq-expanded.png'), fullPage: true });
      // Click the row to open the subagent details tab
      await p.mouse.click(efaqRect.l + efaqRect.w / 2, efaqRect.t + efaqRect.h / 2);
      await sleep(5000);
      await p.screenshot({ path: path.join(SHOTS, '364-efaq-tab.png'), fullPage: true });
    }

    // Probe what's in this tab
    const probe = await p.evaluate(() => {
      const out = { headings: [], buttons: [], links: [], hasActions: false };
      const queue = [document]; const v = new Set();
      while (queue.length) {
        const r = queue.shift(); if (!r || v.has(r)) continue; v.add(r);
        try {
          for (const h of Array.from(r.querySelectorAll('h1, h2, h3, h4'))) {
            const t = (h.textContent || '').trim();
            if (t && t.length < 80 && !out.headings.includes(t)) out.headings.push(t);
          }
          for (const b of Array.from(r.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (t && t.length < 60 && /Add|Action|Save|Commit|Knowledge|Question/i.test(t)
                && !out.buttons.find(x => x.text === t)) {
              out.buttons.push({ text: t, disabled: b.disabled || false });
            }
            if (/Action/i.test(t)) out.hasActions = true;
          }
          for (const a of Array.from(r.querySelectorAll('a'))) {
            const t = (a.textContent || '').trim();
            if (t && t.length < 60 && /Add|Action/i.test(t) && !out.links.includes(t)) out.links.push(t);
          }
          for (const el of r.querySelectorAll('*')) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('Estado y FAQ probe:', JSON.stringify(probe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '364-probe.json'), JSON.stringify(probe, null, 2));
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '50-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
