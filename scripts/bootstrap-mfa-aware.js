// bootstrap-mfa-aware.js
// Logs in to OrgFarm, waits for MFA code via docs/mfa_code.json, then drives Setup.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-fresh-org';
const USERNAME = 'epic.c6fb0dbb14e4@orgfarm.salesforce.com';
const PASSWORD = 'orgfarm1234';
const BASE = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/screenshots';
const MFA_READY = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/mfa_ready.json';
const MFA_CODE_FILE = '/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/mfa_code.json';
const SUMMARY_OUT = path.join(BASE, 'bootstrap-summary.json');

const DIRS = {
  bootstrap: path.join(BASE, 'phase0_5_org_bootstrap'),
  einstein: path.join(BASE, 'phase0_5_einstein_setup'),
  agentforce: path.join(BASE, 'phase0_5_agentforce_setup'),
};
Object.values(DIRS).forEach((d) => fs.mkdirSync(d, { recursive: true }));

(async () => {
  // --- clean up any stale signal files ---
  [MFA_READY, MFA_CODE_FILE].forEach((f) => { try { fs.unlinkSync(f); } catch {} });

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false,
    viewport: { width: 1600, height: 1000 }, args: ['--no-first-run'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(25000);

  // LOGIN
  console.log('[1] navigating to login.salesforce.com');
  await p.goto('https://login.salesforce.com', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await p.fill('#username', USERNAME);
  await p.fill('#password', PASSWORD);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '01-before-login.png') });
  await p.click('#Login');
  await sleep(6000);

  // MFA DETECTION
  const urlAfterLogin = p.url();
  console.log('[2] URL after login:', urlAfterLogin);
  const isMFA = urlAfterLogin.includes('verification') || urlAfterLogin.includes('mfa') || urlAfterLogin.includes('identity');

  if (isMFA) {
    await p.screenshot({ path: path.join(DIRS.bootstrap, '02-MFA-prompt.png') });
    console.log('[3] MFA detected — writing mfa_ready.json and waiting for code...');
    fs.writeFileSync(MFA_READY, JSON.stringify({ status: 'waiting', ts: Date.now() }));

    // Wait up to 2 minutes for mfa_code.json to appear
    const mfaDeadline = Date.now() + 120000;
    let code = null;
    while (Date.now() < mfaDeadline) {
      await sleep(3000);
      if (fs.existsSync(MFA_CODE_FILE)) {
        const raw = JSON.parse(fs.readFileSync(MFA_CODE_FILE, 'utf8'));
        code = raw.code;
        console.log('[4] Got code from file:', code);
        break;
      }
    }
    if (!code) {
      console.error('[TIMEOUT] No MFA code received within 2 min. Exiting.');
      await ctx.close(); process.exit(2);
    }

    // Enter the code
    console.log('[5] entering MFA code...');
    // try to fill the input field
    const filled = await p.evaluate((theCode) => {
      const inputs = document.querySelectorAll('input[type="text"],input:not([type])');
      for (const inp of inputs) {
        if (inp.placeholder && (inp.placeholder.toLowerCase().includes('code') || inp.placeholder.toLowerCase().includes('verif'))) {
          inp.value = theCode;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
      }
      // try by position (first visible text input)
      const vis = Array.from(inputs).filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      if (vis.length > 0) {
        vis[0].value = theCode;
        vis[0].dispatchEvent(new Event('input', { bubbles: true }));
        vis[0].dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      }
      return false;
    }, code);

    if (!filled) {
      // fall back to keyboard typing at focused element
      await p.keyboard.type(code);
    }

    // check "Don't ask again" checkbox
    await p.evaluate(() => {
      const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      const dontAsk = cbs.find((c) => {
        const label = c.closest('label') || document.querySelector(`label[for="${c.id}"]`);
        const txt = ((label && label.textContent) || c.getAttribute('aria-label') || '').toLowerCase();
        return txt.includes("don't") || txt.includes('dont') || txt.includes('remember') || txt.includes('ask again');
      });
      if (dontAsk && !dontAsk.checked) dontAsk.click();
    });

    await sleep(500);
    await p.screenshot({ path: path.join(DIRS.bootstrap, '03-MFA-code-entered.png') });

    // click Verify button
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button,input[type="submit"]'));
      const verify = btns.find((b) => (b.textContent || b.value || '').toLowerCase().includes('verif'));
      if (verify) verify.click();
    });
    await sleep(6000);
    console.log('[6] URL after MFA submit:', p.url());
    await p.screenshot({ path: path.join(DIRS.bootstrap, '04-after-MFA.png') });
  }

  // Handle "Add phone number" interstitial
  if (p.url().includes('identity')) {
    console.log('[7] Phone interstitial — clicking Skip');
    await p.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a,button'));
      const skip = all.find((el) => (el.textContent || '').toLowerCase().includes('skip'));
      if (skip) skip.click();
    });
    await sleep(4000);
  }

  // After MFA the browser lands on salesforce-setup.com — swap to lightning host
  // Wait a moment for the redirect to settle
  await sleep(3000);
  const postMFAUrl = p.url();
  console.log('[post-MFA] URL:', postMFAUrl);

  // Extract org domain and build lightning host
  // salesforce-setup.com: orgfarm-2ff7de0f2c-dev-ed.develop.my.salesforce-setup.com
  // lightning.force.com:  orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com
  let lightningHost;
  if (postMFAUrl.includes('lightning.force.com')) {
    lightningHost = new URL(postMFAUrl).origin;
  } else {
    // Extract org domain prefix from any SF URL
    const sfMatch = postMFAUrl.match(/https?:\/\/([\w-]+\.develop)/);
    if (sfMatch) {
      lightningHost = `https://${sfMatch[1]}.lightning.force.com`;
    } else {
      lightningHost = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
    }
  }
  console.log('[derived] lightningHost:', lightningHost);

  // Navigate to lightning home directly
  await p.goto(`${lightningHost}/lightning/page/home`, { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  console.log('[nav-home] URL:', p.url());

  // Handle phone/identity interstitial after redirect
  if (p.url().includes('identity') || p.url().includes('phone') || p.url().includes('SetupOneHome')) {
    // Try skipping phone prompt
    const skipped = await p.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a,button'));
      const skip = all.find((el) => (el.textContent || '').toLowerCase().includes('skip'));
      if (skip) { skip.click(); return true; }
      return false;
    });
    console.log('[skip-phone] skipped:', skipped);
    await sleep(4000);
    // If still on setup, navigate directly
    if (!p.url().includes('lightning.force.com')) {
      await p.goto(`${lightningHost}/lightning/page/home`, { waitUntil: 'domcontentloaded' });
      await sleep(6000);
    }
  }

  let tries = 0;
  while (!p.url().includes('lightning.force.com') && tries < 8) {
    await sleep(2000);
    tries++;
    console.log('[wait] URL:', p.url());
    // Force navigate if stuck
    if (tries === 4) {
      await p.goto(`${lightningHost}/lightning/page/home`, { waitUntil: 'domcontentloaded' });
    }
  }
  if (!p.url().includes('lightning.force.com')) {
    console.error('[ERROR] Never reached lightning.force.com. Last URL:', p.url());
    // Try one last time with the known host
    await p.goto('https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com/lightning/page/home', { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    if (!p.url().includes('lightning.force.com')) {
      await ctx.close(); process.exit(1);
    }
  }

  // Update lightningHost to actual final URL
  lightningHost = new URL(p.url()).origin;
  console.log('[OK] lightningHost:', lightningHost);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '05-home-page.png') });

  // EINSTEIN SETUP
  console.log('[E1] navigating to Einstein Setup');
  await p.goto(`${lightningHost}/lightning/setup/EinsteinSetup/home`, { waitUntil: 'domcontentloaded' });
  await sleep(10000);
  await p.screenshot({ path: path.join(DIRS.einstein, '01-page-loaded.png'), fullPage: true });

  const einsteinLabels = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('h1,h2,h3,h4,label,span.title,span.subtitle,button,.slds-page-header__title').forEach((el) => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t.length > 3 && t.length < 200) out.push(t);
    });
    return [...new Set(out)].slice(0, 50);
  });
  console.log('[E2] Einstein page labels:', einsteinLabels);
  fs.writeFileSync(path.join(DIRS.einstein, 'labels.md'), `# Einstein Setup Labels\n\n${einsteinLabels.map((l) => `- ${l}`).join('\n')}\n`);

  const einsteinToggled = await p.evaluate(() => {
    function walk(root, out) {
      for (const el of root.querySelectorAll('button,input[type="checkbox"],*[role="switch"]')) {
        const txt = ((el.textContent || '') + (el.getAttribute('aria-label') || '')).toLowerCase();
        if (txt.includes('einstein') || txt.includes('generative') || txt.includes('turn on') || txt.includes('enable')) {
          out.push({ tag: el.tagName, txt: el.textContent.trim(), checked: el.checked, role: el.getAttribute('role') });
          el.click();
        }
      }
      for (const child of root.querySelectorAll('*')) if (child.shadowRoot) walk(child.shadowRoot, out);
    }
    const out = [];
    walk(document, out);
    return { count: out.length, items: out.slice(0, 5) };
  });
  console.log('[E3] Einstein toggle result:', JSON.stringify(einsteinToggled));
  await sleep(5000);
  await p.screenshot({ path: path.join(DIRS.einstein, '02-after-toggle.png'), fullPage: true });

  // AGENTFORCE SETUP
  console.log('[A1] navigating to Agentforce Agents setup');
  await p.goto(`${lightningHost}/lightning/setup/AgentforceAgents/home`, { waitUntil: 'domcontentloaded' });
  await sleep(10000);
  await p.screenshot({ path: path.join(DIRS.agentforce, '01-page-loaded.png'), fullPage: true });

  const agentforceLabels = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('h1,h2,h3,h4,label,span.title,button,.slds-page-header__title').forEach((el) => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t.length > 3 && t.length < 200) out.push(t);
    });
    return [...new Set(out)].slice(0, 50);
  });
  console.log('[A2] Agentforce page labels:', agentforceLabels);
  fs.writeFileSync(path.join(DIRS.agentforce, 'labels.md'), `# Agentforce Agents Setup Labels\n\n${agentforceLabels.map((l) => `- ${l}`).join('\n')}\n`);

  const agentforceToggled = await p.evaluate(() => {
    function walk(root, out) {
      for (const el of root.querySelectorAll('button,input[type="checkbox"],*[role="switch"]')) {
        const txt = ((el.textContent || '') + (el.getAttribute('aria-label') || '')).toLowerCase();
        if (txt.includes('agentforce') || txt.includes('agent') || txt.includes('enable') || txt.includes('turn on')) {
          out.push({ tag: el.tagName, txt: el.textContent.trim() });
          el.click();
        }
      }
      for (const child of root.querySelectorAll('*')) if (child.shadowRoot) walk(child.shadowRoot, out);
    }
    const out = [];
    walk(document, out);
    return { count: out.length, items: out.slice(0, 5) };
  });
  console.log('[A3] Agentforce toggle result:', JSON.stringify(agentforceToggled));
  await sleep(5000);
  await p.screenshot({ path: path.join(DIRS.agentforce, '02-after-toggle.png'), fullPage: true });

  // DATA CLOUD (peek only)
  console.log('[D1] checking Data Cloud');
  await p.goto(`${lightningHost}/lightning/setup/DataCloudSetup/home`, { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '06-data-cloud-state.png'), fullPage: true });
  const dataCloudLabels = await p.evaluate(() => {
    const out = [];
    document.querySelectorAll('h1,h2,h3,button').forEach((el) => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t.length > 3 && t.length < 200) out.push(t);
    });
    return [...new Set(out)].slice(0, 30);
  });

  console.log('[DONE] writing bootstrap-summary.json');
  const summary = { lightningHost, einsteinLabels, agentforceLabels, dataCloudLabels, einsteinToggled, agentforceToggled, ts: new Date().toISOString() };
  fs.writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2));
  console.log('SUCCESS — summary written to', SUMMARY_OUT);
  await ctx.close();
  process.exit(0);
})();
