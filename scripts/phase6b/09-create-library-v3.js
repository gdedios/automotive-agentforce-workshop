// Phase 6b step 9 — passing literal functions (not strings) to frame.evaluate.

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

async function getSetupFrame(p, maxSeconds = 30) {
  for (let i = 0; i < maxSeconds; i++) {
    const frames = p.frames();
    const setup = frames.find(f => /salesforce-setup\.com.*lightning\/setup\//.test(f.url()));
    if (setup) return setup;
    await sleep(1000);
  }
  return null;
}

async function clickByText(target, text) {
  return await target.evaluate((targetText) => {
    const findInRoot = (root, depth) => {
      if (depth > 12 || !root) return null;
      try {
        const direct = Array.from(root.querySelectorAll('button, a, [role="button"], lightning-button, lightning-button-icon'));
        for (const b of direct) {
          const t = (b.textContent || '').trim();
          const aria = b.getAttribute('aria-label') || '';
          if (t === targetText || aria === targetText) return b;
          if (t.length < 80 && t.includes(targetText)) return b;
        }
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
      return { clicked: true, tag: target.tagName, text: (target.textContent || '').trim().slice(0, 80), aria: target.getAttribute('aria-label') || '' };
    }
    // dump all candidates
    const candidates = [];
    const dump = (root, depth) => {
      if (depth > 8 || !root) return;
      try {
        const all = Array.from(root.querySelectorAll('button, a, [role="button"], lightning-button'));
        for (const b of all) {
          const t = (b.textContent || '').trim();
          if (t && t.length < 80) candidates.push(t);
        }
        const els = Array.from(root.querySelectorAll('*'));
        for (const el of els) if (el.shadowRoot) dump(el.shadowRoot, depth + 1);
      } catch {}
    };
    dump(document, 0);
    return { clicked: false, candidates: candidates.slice(0, 30) };
  }, text);
}

async function dumpInputs(target) {
  return await target.evaluate(() => {
    const out = [];
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
    for (const i of inputs) {
      out.push({
        tag: i.tagName,
        type: i.type || '',
        name: i.name || '',
        id: i.id || '',
        placeholder: i.placeholder || '',
        aria: i.getAttribute('aria-label') || '',
        visible: i.offsetParent !== null,
      });
    }
    return out;
  });
}

async function fillForm(target, data) {
  return await target.evaluate((data) => {
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
    const inputs = collect(document, 0).filter(i => i.offsetParent !== null && i.type !== 'hidden' && i.type !== 'checkbox' && i.type !== 'radio' && i.type !== 'search');
    const setValue = (el, val) => {
      const proto = Object.getPrototypeOf(el);
      const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (setter) setter.call(el, val); else el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));
    };
    const out = { steps: [], inputCount: inputs.length };
    const isApi = (i) => /api/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || '') + i.name + i.id);
    const isName = (i) => /name|label/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || '') + i.name + i.id) && !isApi(i);
    const isDesc = (i) => /description|desc/i.test((i.placeholder || '') + (i.getAttribute('aria-label') || '') + i.name + i.id);

    const nameInput = inputs.find(isName) || inputs[0];
    if (nameInput) {
      nameInput.focus();
      setValue(nameInput, data.name);
      out.steps.push('name on ' + (nameInput.placeholder || nameInput.getAttribute('aria-label') || nameInput.name || nameInput.id || nameInput.tagName));
    }
    const descInput = inputs.find(isDesc) || inputs.find(i => i.tagName === 'TEXTAREA');
    if (descInput && descInput !== nameInput) {
      descInput.focus();
      setValue(descInput, data.desc);
      out.steps.push('desc on ' + (descInput.placeholder || descInput.getAttribute('aria-label') || descInput.name || descInput.id || descInput.tagName));
    }
    return out;
  }, data);
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
    await sleep(22000);

    const setupFrame = await getSetupFrame(p);
    console.log('setup frame URL:', setupFrame?.url());
    await p.screenshot({ path: path.join(SHOTS, '30-landing.png'), fullPage: true });

    // Click New Library
    let click1 = await clickByText(setupFrame, 'New Library');
    console.log('new library (frame):', JSON.stringify(click1).slice(0, 600));
    if (!click1.clicked) {
      click1 = await clickByText(p.mainFrame(), 'New Library');
      console.log('new library (main):', JSON.stringify(click1).slice(0, 600));
    }
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '31-after-new-library.png'), fullPage: true });

    // Wait for form — try a few seconds
    await sleep(6000);
    await p.screenshot({ path: path.join(SHOTS, '32-form-shown.png'), fullPage: true });

    // Diagnostic dump of inputs
    const inputsFrame = await dumpInputs(setupFrame);
    const inputsMain = await dumpInputs(p.mainFrame());
    fs.writeFileSync(path.join(SHOTS, '32-inputs-frame.json'), JSON.stringify(inputsFrame, null, 2));
    fs.writeFileSync(path.join(SHOTS, '32-inputs-main.json'), JSON.stringify(inputsMain, null, 2));
    console.log('frame inputs:', inputsFrame.length, ' / main inputs:', inputsMain.length);

    // Fill form — choose whichever side has more inputs
    const filled = (inputsFrame.length >= inputsMain.length)
      ? await fillForm(setupFrame, { name: LIBRARY_NAME, desc: LIBRARY_DESC })
      : await fillForm(p.mainFrame(), { name: LIBRARY_NAME, desc: LIBRARY_DESC });
    console.log('fill:', JSON.stringify(filled, null, 2));
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '33-form-filled.png'), fullPage: true });

    // Click Save / Create / Next
    let saved = await clickByText(setupFrame, 'Save');
    if (!saved.clicked) saved = await clickByText(setupFrame, 'Create');
    if (!saved.clicked) saved = await clickByText(setupFrame, 'Next');
    if (!saved.clicked) saved = await clickByText(p.mainFrame(), 'Save');
    console.log('save:', JSON.stringify(saved).slice(0, 500));
    await sleep(12000);
    await p.screenshot({ path: path.join(SHOTS, '34-after-save.png'), fullPage: true });

    console.log('done; setup frame URL after save:', setupFrame.url());
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '09-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
