// Phase 6b step 8: simpler — just wait 30s, then look for "New Library" button
// across ALL frames + shadow roots (LWC text isn't in document.body.textContent).

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-toggles-v2';
const SHOTS = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/phase6b_screenshots';
const FRONTDOOR = process.env.FRONTDOOR_URL;
const LIGHTNING_HOST = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';

const LIBRARY_NAME = 'Electra FAQ Library';
const LIBRARY_DESC = 'Electra Auto Concierge knowledge — catálogo, garantías, guía de carga y mantenimiento.';

// Click a button by visible text, walking shadow DOM. Returns true if clicked.
const CLICK_BY_TEXT = `(targetText) => {
  const findInRoot = (root, depth) => {
    if (depth > 10 || !root) return null;
    try {
      // Plain query first
      const direct = Array.from(root.querySelectorAll('button, a, [role="button"], lightning-button'));
      for (const b of direct) {
        const t = (b.textContent || '').trim();
        if (t === targetText || (t.length < 60 && t.includes(targetText))) {
          return b;
        }
      }
      // Walk shadow roots
      const all = Array.from(root.querySelectorAll('*'));
      for (const el of all) {
        if (el.shadowRoot) {
          const r = findInRoot(el.shadowRoot, depth + 1);
          if (r) return r;
        }
      }
    } catch {}
    return null;
  };
  const target = findInRoot(document, 0);
  if (target) {
    target.scrollIntoView({ block: 'center' });
    target.click();
    return { clicked: true, tag: target.tagName, text: (target.textContent || '').trim().slice(0, 80) };
  }
  return { clicked: false };
}`;

const FILL_FORM = `(data) => {
  const out = { steps: [], inputs: [] };
  const collect = (root, depth) => {
    if (depth > 12 || !root) return [];
    let arr = [];
    try {
      arr = Array.from(root.querySelectorAll('input, textarea'));
      const all = Array.from(root.querySelectorAll('*'));
      for (const el of all) if (el.shadowRoot) arr = arr.concat(collect(el.shadowRoot, depth + 1));
    } catch {}
    return arr;
  };
  const inputs = collect(document, 0);
  out.totalInputs = inputs.length;
  out.inputs = inputs.map((i, idx) => ({
    idx,
    tag: i.tagName,
    type: i.type || '',
    name: i.name || '',
    id: i.id || '',
    placeholder: i.placeholder || '',
    aria: i.getAttribute('aria-label') || '',
    label: ((() => {
      // Try to find the closest label
      const el = i;
      const lbl = el.labels && el.labels[0];
      if (lbl) return (lbl.textContent || '').trim().slice(0, 60);
      // Walk up looking for lightning-input wrapper
      let p = el.getRootNode().host || el.parentElement;
      for (let d = 0; d < 5 && p; d++) {
        if (p.label) return p.label;
        p = p.parentElement;
      }
      return '';
    })()),
  }));

  const setValue = (el, val) => {
    const proto = Object.getPrototypeOf(el);
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, val); else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.dispatchEvent(new Event('blur', { bubbles: true }));
  };

  // Heuristic: pick name input first (label/aria/placeholder containing 'name' but NOT 'api')
  const isName = (i) => {
    const t = (i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '') + ' ' + (i.name || '') + ' ' + (i.id || '');
    return /name/i.test(t) && !/api/i.test(t) && !/description/i.test(t);
  };
  const isDesc = (i) => {
    const t = (i.placeholder || '') + ' ' + (i.getAttribute('aria-label') || '') + ' ' + (i.name || '') + ' ' + (i.id || '');
    return /description|desc/i.test(t) || i.tagName === 'TEXTAREA';
  };

  const visibleText = inputs.filter(i => i.type !== 'hidden' && i.type !== 'checkbox' && i.type !== 'radio');
  const nameInput = visibleText.find(isName) || visibleText.find(i => i.type === 'text' || !i.type) || visibleText[0];
  if (nameInput) {
    nameInput.focus();
    setValue(nameInput, data.name);
    out.steps.push('name set on ' + nameInput.tagName + ' ' + (nameInput.placeholder||nameInput.name||nameInput.id));
  }
  const descInput = visibleText.find(isDesc);
  if (descInput && descInput !== nameInput) {
    descInput.focus();
    setValue(descInput, data.desc);
    out.steps.push('desc set on ' + descInput.tagName + ' ' + (descInput.placeholder||descInput.name||descInput.id));
  }
  return out;
}`;

async function getSetupFrame(p, maxSeconds = 60) {
  for (let i = 0; i < maxSeconds; i++) {
    const frames = p.frames();
    const setup = frames.find(f => /salesforce-setup\.com.*lightning\/setup\//.test(f.url()));
    if (setup) return setup;
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
    await sleep(20000);  // give the inner LWC plenty of time

    const setupFrame = await getSetupFrame(p, 30);
    if (!setupFrame) {
      console.error('No setup frame');
      await p.screenshot({ path: path.join(SHOTS, '08-no-frame.png'), fullPage: true });
      process.exit(1);
    }
    console.log('setup frame URL:', setupFrame.url());
    await p.screenshot({ path: path.join(SHOTS, '20-landing.png'), fullPage: true });

    // Click "New Library" — try via frame.evaluate with shadow walk
    const click1 = await setupFrame.evaluate(CLICK_BY_TEXT, 'New Library');
    console.log('new library click:', click1);
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '21-after-new-library.png'), fullPage: true });

    if (!click1.clicked) {
      // Try main page (sometimes a modal mounts on the outer page)
      const click2 = await p.evaluate(CLICK_BY_TEXT, 'New Library');
      console.log('new library click on main:', click2);
      await sleep(6000);
      await p.screenshot({ path: path.join(SHOTS, '21b-after-new-library.png'), fullPage: true });
      if (!click2.clicked) process.exit(1);
    }

    // Wait for form — give it 15s
    await sleep(8000);
    await p.screenshot({ path: path.join(SHOTS, '22-form.png'), fullPage: true });

    // Fill form (try setup frame first, then main)
    let filled = await setupFrame.evaluate(FILL_FORM, { name: LIBRARY_NAME, desc: LIBRARY_DESC });
    console.log('fill on setup frame:', JSON.stringify(filled, null, 2).slice(0, 3000));
    if (!filled.totalInputs || filled.steps.length === 0) {
      filled = await p.evaluate(FILL_FORM, { name: LIBRARY_NAME, desc: LIBRARY_DESC });
      console.log('fill on main:', JSON.stringify(filled, null, 2).slice(0, 3000));
    }
    fs.writeFileSync(path.join(SHOTS, '22-form-inputs.json'), JSON.stringify(filled, null, 2));
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '23-form-filled.png'), fullPage: true });

    // Click Save (or Next, or Create)
    let saved = await setupFrame.evaluate(CLICK_BY_TEXT, 'Save');
    if (!saved.clicked) saved = await setupFrame.evaluate(CLICK_BY_TEXT, 'Create');
    if (!saved.clicked) saved = await setupFrame.evaluate(CLICK_BY_TEXT, 'Next');
    if (!saved.clicked) saved = await p.evaluate(CLICK_BY_TEXT, 'Save');
    console.log('save click:', saved);
    await sleep(10000);
    await p.screenshot({ path: path.join(SHOTS, '24-after-save.png'), fullPage: true });

    console.log('post-save URL:', p.url());
    console.log('post-save frame URL:', setupFrame.url());
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '08-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
