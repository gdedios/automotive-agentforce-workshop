// Phase 6b step 18: delete the broken library by clicking the row caret menu.

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

async function getSetupFrame(p, maxSeconds = 30) {
  for (let i = 0; i < maxSeconds; i++) {
    const f = p.frames().find(f => /salesforce-setup\.com.*lightning\/setup\//.test(f.url()));
    if (f) return f;
    await sleep(1000);
  }
  return null;
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
    await p.goto(`${LIGHTNING_HOST}/lightning/setup/EinsteinDataLibrary/home`, { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    const frame = await getSetupFrame(p);
    console.log('frame:', frame?.url());
    await p.screenshot({ path: path.join(SHOTS, '120-list.png'), fullPage: true });

    // Diagnostic — for the Electra row, dump all buttons + their aria
    const rowProbe = await frame.evaluate(() => {
      const out = { rows: [] };
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const tr of Array.from(root.querySelectorAll('tr'))) {
            const txt = (tr.textContent || '').trim();
            if (txt.includes('Electra FAQ Library')) {
              const btns = Array.from(tr.querySelectorAll('button')).map(b => ({
                tag: b.tagName, aria: b.getAttribute('aria-label') || '', title: b.getAttribute('title') || '',
                text: (b.textContent || '').trim().slice(0, 40), classes: (b.className || '').slice(0, 100),
              }));
              const links = Array.from(tr.querySelectorAll('a')).map(a => ({ tag: a.tagName, text: (a.textContent || '').trim().slice(0, 40), href: a.href || '' }));
              out.rows.push({ btns, links, snippet: txt.slice(0, 200) });
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('row probe:', JSON.stringify(rowProbe, null, 2));
    fs.writeFileSync(path.join(SHOTS, '120-rowprobe.json'), JSON.stringify(rowProbe, null, 2));

    // Click ANY button (most likely the action caret) in the row
    const caretClicked = await frame.evaluate(() => {
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const tr of Array.from(root.querySelectorAll('tr'))) {
            const txt = (tr.textContent || '').trim();
            if (txt.includes('Electra FAQ Library')) {
              // Pick the LAST button in the row (typically the action caret)
              const btns = Array.from(tr.querySelectorAll('button'));
              if (btns.length > 0) {
                const last = btns[btns.length - 1];
                last.scrollIntoView({block:'center'});
                last.click();
                return { clicked: true, count: btns.length, aria: last.getAttribute('aria-label') || '', title: last.getAttribute('title') || '' };
              }
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('caret click:', caretClicked);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '121-caret-open.png'), fullPage: true });

    // Look for menu items
    const menuItems = await frame.evaluate(() => {
      const out = [];
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const m of Array.from(root.querySelectorAll('[role="menuitem"], lightning-menu-item, a.slds-dropdown__item'))) {
            const t = (m.textContent || '').trim();
            if (t) out.push({ tag: m.tagName, text: t.slice(0, 40), role: m.getAttribute('role') });
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return out;
    });
    console.log('menu items:', menuItems);

    // Click "Delete" in the dropdown menu
    const delClicked = await frame.evaluate(() => {
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const m of Array.from(root.querySelectorAll('[role="menuitem"], lightning-menu-item, a.slds-dropdown__item, .slds-dropdown__list a'))) {
            const t = (m.textContent || '').trim();
            if (/^Delete$/i.test(t)) {
              m.scrollIntoView({block:'center'});
              m.click();
              return { clicked: true };
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('delete menu click:', delClicked);
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '122-delete-modal.png'), fullPage: true });

    // Confirm deletion: click Delete in the modal (red destructive button)
    const confirmClicked = await frame.evaluate(() => {
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const b of Array.from(root.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            if (/^Delete$/i.test(t)) {
              const m = b.closest && b.closest('section[role="dialog"], .slds-modal__container');
              if (m) {
                b.scrollIntoView({block:'center'});
                b.click();
                return { clicked: true };
              }
            }
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return { clicked: false };
    });
    console.log('confirm click:', confirmClicked);
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '123-after-delete.png'), fullPage: true });

    // Verify
    const stillThere = await frame.evaluate(() => {
      const queue = [document];
      const v = new Set();
      while (queue.length) {
        const root = queue.shift();
        if (!root || v.has(root)) continue;
        v.add(root);
        try {
          for (const tr of Array.from(root.querySelectorAll('tr'))) {
            if ((tr.textContent || '').includes('Electra FAQ Library')) return true;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) queue.push(el.shadowRoot);
        } catch {}
      }
      return false;
    });
    console.log('still exists?', stillThere);
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '18-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
