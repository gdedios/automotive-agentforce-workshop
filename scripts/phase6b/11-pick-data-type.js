// Phase 6b step 11: pick Data Type combobox by role/aria, list options, choose Files.

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
  if (!fs.existsSync(SHOTS)) fs.mkdirSync(SHOTS, { recursive: true });

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

    const setupFrame = await getSetupFrame(p);
    console.log('frame:', setupFrame?.url());

    // Open the library
    await setupFrame.evaluate(() => {
      const findLink = (root, depth) => {
        if (depth > 12 || !root) return null;
        try {
          const links = Array.from(root.querySelectorAll('a, button'));
          for (const a of links) {
            const t = (a.textContent || '').trim();
            if (t === 'Electra FAQ Library') return a;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) { const r = findLink(el.shadowRoot, depth+1); if (r) return r; }
        } catch {}
        return null;
      };
      const a = findLink(document, 0);
      if (a) a.click();
    });
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '50-detail.png'), fullPage: true });

    // Diagnostic: dump all comboboxes/inputs/buttons in the Add Data Sources area
    const probe = await setupFrame.evaluate(() => {
      const out = { combos: [], inputs: [], buttons: [] };
      const collect = (root, depth) => {
        if (depth > 14 || !root) return;
        try {
          for (const c of Array.from(root.querySelectorAll('[role="combobox"], lightning-combobox, lightning-grouped-combobox, lightning-base-combobox'))) {
            out.combos.push({
              tag: c.tagName,
              aria: c.getAttribute('aria-label') || '',
              text: (c.textContent || '').trim().slice(0, 80),
              placeholder: c.placeholder || '',
            });
          }
          for (const i of Array.from(root.querySelectorAll('input'))) {
            out.inputs.push({
              tag: i.tagName,
              type: i.type,
              role: i.getAttribute('role') || '',
              aria: i.getAttribute('aria-label') || '',
              placeholder: i.placeholder || '',
              name: i.name || '',
              id: i.id || '',
            });
          }
          for (const b of Array.from(root.querySelectorAll('button'))) {
            const t = (b.textContent || '').trim();
            const aria = b.getAttribute('aria-label') || '';
            if (t.length < 80 || aria) out.buttons.push({ aria, text: t.slice(0, 80) });
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) collect(el.shadowRoot, depth + 1);
        } catch {}
      };
      collect(document, 0);
      return out;
    });
    fs.writeFileSync(path.join(SHOTS, '50-probe.json'), JSON.stringify(probe, null, 2));
    console.log('combos:', probe.combos);
    console.log('inputs (Data Type filter):', probe.inputs.filter(i => /data type/i.test(i.aria) || /select a data type/i.test(i.placeholder)));
    console.log('input total:', probe.inputs.length);

    // Click input with placeholder "Select a data type..."
    const opened = await setupFrame.evaluate(() => {
      const find = (root, depth) => {
        if (depth > 14 || !root) return null;
        try {
          const inputs = Array.from(root.querySelectorAll('input'));
          for (const i of inputs) {
            if (/select a data type/i.test(i.placeholder || '') || /data type/i.test(i.getAttribute('aria-label') || '')) return i;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) { const r = find(el.shadowRoot, depth+1); if (r) return r; }
        } catch {}
        return null;
      };
      const inp = find(document, 0);
      if (inp) {
        inp.scrollIntoView({ block: 'center' });
        inp.focus();
        inp.click();
        // Also dispatch keyboard event to open dropdown if needed
        return { opened: true, tag: inp.tagName, ph: inp.placeholder, aria: inp.getAttribute('aria-label') };
      }
      return { opened: false };
    });
    console.log('combobox open:', opened);
    await sleep(2500);
    await p.screenshot({ path: path.join(SHOTS, '51-combo-open.png'), fullPage: true });

    // List options now
    const opts = await setupFrame.evaluate(() => {
      const out = [];
      const collect = (root, depth) => {
        if (depth > 14 || !root) return;
        try {
          const o = Array.from(root.querySelectorAll('[role="option"], lightning-base-combobox-item, .slds-listbox__option'));
          for (const x of o) {
            const t = (x.textContent || '').trim();
            if (t) out.push({ tag: x.tagName, role: x.getAttribute('role'), text: t.slice(0, 80) });
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) collect(el.shadowRoot, depth + 1);
        } catch {}
      };
      collect(document, 0);
      return out;
    });
    console.log('options after open:', opts);
    fs.writeFileSync(path.join(SHOTS, '51-options.json'), JSON.stringify(opts, null, 2));

    // If empty, try keyboard down arrow on focused combobox
    if (opts.length === 0) {
      await p.keyboard.press('ArrowDown');
      await sleep(1500);
      const opts2 = await setupFrame.evaluate(() => {
        const out = [];
        const collect = (root, depth) => {
          if (depth > 14 || !root) return;
          try {
            const o = Array.from(root.querySelectorAll('[role="option"]'));
            for (const x of o) {
              const t = (x.textContent || '').trim();
              if (t) out.push(t);
            }
            const all = Array.from(root.querySelectorAll('*'));
            for (const el of all) if (el.shadowRoot) collect(el.shadowRoot, depth + 1);
          } catch {}
        };
        collect(document, 0);
        return out;
      });
      console.log('options after ArrowDown:', opts2);
      await p.screenshot({ path: path.join(SHOTS, '52-arrowdown.png'), fullPage: true });
    }

    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '11-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
