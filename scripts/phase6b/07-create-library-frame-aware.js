// Phase 6b step 7: frame-aware version — Setup iframe is on salesforce-setup.com (cross-origin to
// the Lightning shell at lightning.force.com), so DOM access via contentDocument is blocked.
// Use Playwright frames() API to talk to the inner setup app directly.

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

async function getSetupFrame(p) {
  // Wait until at least one frame URL contains /lightning/setup/ (the inner setup-app)
  for (let i = 0; i < 60; i++) {
    const frames = p.frames();
    const setup = frames.find(f => /salesforce-setup\.com.*lightning\/setup\//.test(f.url()) && !/setupOneHome/i.test(f.url()));
    if (setup) return setup;
    // Fallback — also accept SetupOneHome iframe
    const any = frames.find(f => /salesforce-setup\.com/.test(f.url()) && f.url() !== p.url());
    if (any && i > 5) return any;
    await sleep(1500);
  }
  return null;
}

async function frameWaitForText(frame, regex, maxSeconds = 60, label = 'wait') {
  for (let i = 0; i < maxSeconds; i++) {
    await sleep(1500);
    try {
      const txt = await frame.evaluate(() => (document.body && document.body.textContent || '').slice(0, 30000));
      if (txt && regex.test(txt)) {
        console.log(`[${label}] matched at t+${(i+1)*1.5}s`);
        return true;
      }
    } catch (e) {
      // navigation in progress
    }
    if (i % 4 === 0) console.log(`[${label}] t+${(i+1)*1.5}s waiting…`);
  }
  return false;
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

    // Direct deep-link
    await p.goto(`${LIGHTNING_HOST}/lightning/setup/EinsteinDataLibrary/home`, { waitUntil: 'domcontentloaded' });
    await sleep(6000);

    const setupFrame = await getSetupFrame(p);
    if (!setupFrame) {
      console.error('No setup frame found within 90s');
      await p.screenshot({ path: path.join(SHOTS, '07-no-frame.png'), fullPage: true });
      console.error('frames seen:', p.frames().map(f => f.url()).join('\n'));
      process.exit(1);
    }
    console.log('setup frame URL:', setupFrame.url());

    const ready = await frameWaitForText(setupFrame, /New Library|Get ready for Agentforce|libraries available|Boost Your AI/i, 60, 'data-library-landing');
    console.log('landing ready?', ready);
    await p.screenshot({ path: path.join(SHOTS, '13-landing-frame.png'), fullPage: true });

    if (!ready) process.exit(1);

    // Click New Library inside the setup frame
    const clickRes = await setupFrame.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a[role="button"], lightning-button'));
      const target = btns.find(b => /^New Library/i.test((b.textContent || '').trim()));
      if (target) { target.scrollIntoView(); target.click(); return { clicked: true, t: target.tagName }; }
      // Walk shadow roots
      const findInShadows = (root, depth) => {
        if (depth > 6) return null;
        const list = root.querySelectorAll ? Array.from(root.querySelectorAll('*')) : [];
        for (const el of list) {
          if (el.shadowRoot) {
            const inner = Array.from(el.shadowRoot.querySelectorAll('button, a[role="button"], lightning-button'));
            const cand = inner.find(b => /^New Library/i.test((b.textContent || '').trim()));
            if (cand) { cand.scrollIntoView(); cand.click(); return { clicked: true, t: cand.tagName, viaShadow: true }; }
            const deeper = findInShadows(el.shadowRoot, depth+1);
            if (deeper) return deeper;
          }
        }
        return null;
      };
      const r = findInShadows(document, 0);
      return r || { clicked: false };
    });
    console.log('new-library click:', clickRes);
    await sleep(5000);
    await p.screenshot({ path: path.join(SHOTS, '14-after-new-library.png'), fullPage: true });

    // Wait for the form
    const formReady = await frameWaitForText(setupFrame, /Library Name|Create.{0,10}Data Library|API Name|Data Space/i, 30, 'new-library-form');
    console.log('form ready?', formReady);
    await sleep(2000);
    await p.screenshot({ path: path.join(SHOTS, '15-form.png'), fullPage: true });

    // Fill the form
    const filled = await setupFrame.evaluate((data) => {
      const out = { steps: [] };
      const findInputs = (root, depth) => {
        if (depth > 8 || !root) return [];
        let arr = [];
        try {
          arr = Array.from(root.querySelectorAll('input[type="text"], input:not([type]), textarea'));
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) arr = arr.concat(findInputs(el.shadowRoot, depth+1));
        } catch {}
        return arr;
      };
      const inputs = findInputs(document, 0);
      out.totalInputs = inputs.length;
      out.fingerprint = inputs.map(i => `${i.tagName}|name=${i.name}|id=${i.id}|ph=${i.placeholder}|aria=${i.getAttribute('aria-label')}`).slice(0, 25);

      const setValue = (el, val) => {
        const proto = Object.getPrototypeOf(el);
        const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (setter) setter.call(el, val); else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
      };

      // Name = first text input (usually labelled Library Name); description = textarea or "description" attr
      const nameInput = inputs.find(i => /name|label/i.test(i.name || i.id || i.placeholder || i.getAttribute('aria-label') || '') && !/api|description/i.test(i.name || i.id || i.placeholder || i.getAttribute('aria-label') || '')) || inputs[0];
      if (nameInput) {
        nameInput.focus(); setValue(nameInput, data.name);
        out.steps.push(`name set on ${nameInput.tagName}/${nameInput.name||nameInput.id}`);
      }
      const descInput = inputs.find(i => /description/i.test(i.name || i.id || i.placeholder || i.getAttribute('aria-label') || '')) || inputs.find(i => i.tagName === 'TEXTAREA');
      if (descInput) {
        descInput.focus(); setValue(descInput, data.desc);
        out.steps.push(`desc set on ${descInput.tagName}/${descInput.name||descInput.id}`);
      }
      return out;
    }, { name: LIBRARY_NAME, desc: LIBRARY_DESC });
    console.log('fill probe:', JSON.stringify(filled, null, 2));
    await sleep(3000);
    await p.screenshot({ path: path.join(SHOTS, '16-form-filled.png'), fullPage: true });

    // Click Save
    const saved = await setupFrame.evaluate(() => {
      const findBtn = (root, depth) => {
        if (depth > 8 || !root) return null;
        try {
          const cands = Array.from(root.querySelectorAll('button, a[role="button"], lightning-button'));
          for (const b of cands) {
            const t = (b.textContent || '').trim();
            if (/^Save$/i.test(t)) return b;
          }
          const all = Array.from(root.querySelectorAll('*'));
          for (const el of all) if (el.shadowRoot) {
            const r = findBtn(el.shadowRoot, depth+1);
            if (r) return r;
          }
        } catch {}
        return null;
      };
      const btn = findBtn(document, 0);
      if (btn) { btn.scrollIntoView(); btn.click(); return true; }
      return false;
    });
    console.log('save clicked?', saved);
    await sleep(10000);
    await p.screenshot({ path: path.join(SHOTS, '17-after-save.png'), fullPage: true });

    // After save, expect to land on the library detail page or the Add Data Sources step
    const nextStep = await frameWaitForText(setupFrame, /Add Data Sources|Files|Knowledge Articles|data sources|Source Type|Rich Content|Status/i, 60, 'add-sources-or-detail');
    console.log('next-step ready?', nextStep);
    await p.screenshot({ path: path.join(SHOTS, '18-add-sources.png'), fullPage: true });

    // Capture the URL of the setup frame post-save (should be library detail page)
    console.log('setup frame URL post-save:', setupFrame.url());
    console.log('done');
  } catch (e) {
    console.error('FATAL', e);
    try { await p.screenshot({ path: path.join(SHOTS, '07-FATAL.png'), fullPage: true }); } catch {}
  } finally {
    await sleep(3000);
    await ctx.close();
  }
})();
