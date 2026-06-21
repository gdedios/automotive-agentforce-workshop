// bootstrap-full-session.js
// Complete bootstrap in a single browser session: login → MFA → Setup navigation.
// Reads MFA code from docs/mfa_code.json (written by Claude after polling Slack).
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const PROFILE = '/tmp/cft-electra-full-session';
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

// Remove stale signal files
[MFA_READY, MFA_CODE_FILE].forEach((f) => { try { fs.unlinkSync(f); } catch {} });

(async () => {
  // Use a fresh profile for clean session
  try { fs.rmSync(PROFILE, { recursive: true, force: true }); } catch {}

  const ctx = await chromium.launchPersistentContext(PROFILE, {
    executablePath: CFT, headless: false,
    viewport: { width: 1600, height: 1000 },
    args: ['--no-first-run', '--no-default-browser-check'],
  });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(30000);

  // Step 1: Login
  console.log('[1] navigating to login.salesforce.com');
  await p.goto('https://login.salesforce.com', { waitUntil: 'domcontentloaded' });
  await sleep(2000);
  await p.fill('#username', USERNAME);
  await p.fill('#password', PASSWORD);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '01-before-login.png') });
  await p.click('#Login');
  await sleep(8000);

  const urlAfterLogin = p.url();
  console.log('[2] URL after login:', urlAfterLogin);

  // Step 2: MFA
  const isMFA = urlAfterLogin.includes('verification') || urlAfterLogin.includes('mfa') || urlAfterLogin.includes('identity');
  if (isMFA) {
    await p.screenshot({ path: path.join(DIRS.bootstrap, '02-MFA-prompt.png') });
    console.log('[3] MFA detected — writing mfa_ready.json and waiting for code...');
    fs.writeFileSync(MFA_READY, JSON.stringify({ status: 'waiting', ts: Date.now() }));

    const mfaDeadline = Date.now() + 180000; // 3 min
    let code = null;
    while (Date.now() < mfaDeadline) {
      await sleep(3000);
      if (fs.existsSync(MFA_CODE_FILE)) {
        try {
          const raw = JSON.parse(fs.readFileSync(MFA_CODE_FILE, 'utf8'));
          code = raw.code;
          console.log('[4] Got code from file:', code);
          break;
        } catch (e) { /* still writing */ }
      }
    }
    if (!code) {
      console.error('[TIMEOUT] No MFA code in 3 min. Writing BLOCKER.');
      fs.writeFileSync('/Users/gdedios/Desktop/Test/claude-projects/Projects/05-2026/Automotive-Workshop/docs/BLOCKER.md',
        '# BLOCKER — bootstrap-full-session.js\n\nMFA code not received within 3 minutes.\n\nAction: Re-run script and provide code to mfa_code.json faster.\n');
      await ctx.close(); process.exit(2);
    }

    // Fill MFA code
    const filled = await p.evaluate((theCode) => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const vis = inputs.filter((i) => { const r = i.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
      // prefer input with code/verif in placeholder
      const target = vis.find((i) => (i.placeholder || '').toLowerCase().match(/code|verif/)) || vis[0];
      if (target) {
        target.focus();
        target.value = theCode;
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return { ok: true, placeholder: target.placeholder };
      }
      return { ok: false };
    }, code);
    console.log('[5] fill result:', filled);

    // Check "Trust this device" / "Don't ask again"
    await p.evaluate(() => {
      const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      cbs.forEach((cb) => {
        const label = cb.closest('label') || document.querySelector(`label[for="${cb.id}"]`);
        const txt = ((label && label.textContent) || cb.getAttribute('aria-label') || '').toLowerCase();
        if (txt.includes("don't") || txt.includes('trust') || txt.includes('remember')) {
          if (!cb.checked) cb.click();
        }
      });
    });

    await sleep(500);
    await p.screenshot({ path: path.join(DIRS.bootstrap, '03-MFA-code-entered.png') });

    // Click verify button
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button,input[type="submit"]'));
      const verify = btns.find((b) => (b.textContent || b.value || '').toLowerCase().includes('verif'));
      if (verify) verify.click();
    });
    await sleep(8000);
    console.log('[6] URL after MFA:', p.url());
    await p.screenshot({ path: path.join(DIRS.bootstrap, '04-after-MFA.png') });
  }

  // Step 3: Handle identity/phone interstitial
  if (p.url().includes('identity') || p.url().includes('AddPhoneNumber')) {
    console.log('[7] identity/phone interstitial — clicking Skip');
    await p.evaluate(() => {
      const els = Array.from(document.querySelectorAll('a,button'));
      const skip = els.find((el) => (el.textContent || '').toLowerCase().includes('skip'));
      if (skip) skip.click();
    });
    await sleep(4000);
    console.log('[7b] URL after skip:', p.url());
  }

  // Step 4: Navigate to lightning host
  const currentUrl = p.url();
  let lightningHost;
  if (currentUrl.includes('lightning.force.com')) {
    lightningHost = new URL(currentUrl).origin;
  } else {
    // Extract org domain from any salesforce URL
    const m = currentUrl.match(/https?:\/\/([\w-]+\.develop)/);
    if (m) {
      lightningHost = `https://${m[1]}.lightning.force.com`;
    } else if (currentUrl.includes('salesforce-setup.com')) {
      lightningHost = new URL(currentUrl).origin
        .replace('.my.salesforce-setup.com', '.lightning.force.com');
    } else {
      lightningHost = 'https://orgfarm-2ff7de0f2c-dev-ed.develop.lightning.force.com';
    }
  }
  console.log('[8] derived lightningHost:', lightningHost);
  const setupHost = lightningHost.replace('.lightning.force.com', '.my.salesforce-setup.com');
  console.log('[8b] setupHost:', setupHost);

  // Navigate to lightning home
  await p.goto(`${lightningHost}/lightning/page/home`, { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  console.log('[9] URL:', p.url());

  if (!p.url().includes('lightning.force.com')) {
    console.error('[ERROR] Cannot reach lightning.force.com after auth');
    await p.screenshot({ path: path.join(DIRS.bootstrap, 'ERROR-no-lightning.png'), fullPage: true });
    await ctx.close(); process.exit(1);
  }
  // Update lightningHost to actual
  lightningHost = new URL(p.url()).origin;
  console.log('[9b] confirmed lightningHost:', lightningHost);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '05-home-page.png') });

  // Step 5: Einstein Setup — try multiple URL patterns
  const einsteinUrls = [
    `${lightningHost}/lightning/setup/EinsteinSetup/home`,
    `${lightningHost}/lightning/setup/EinsteinCopilot/home`,
    `${lightningHost}/lightning/setup/AISetup/home`,
    `${lightningHost}/lightning/setup/EinsteinGPT/home`,
  ];

  let einsteinWorking = null;
  for (const url of einsteinUrls) {
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    const notFound = await p.evaluate(() => document.title.includes('not found') || document.body.textContent.includes('Page not found'));
    if (!notFound) {
      einsteinWorking = url;
      console.log('[E1] Einstein URL works:', url);
      break;
    }
    console.log('[E1] Not found:', url);
  }

  // Also try via Setup Quick Find using keyboard
  if (!einsteinWorking) {
    console.log('[E2] Trying Setup Quick Find for Einstein');
    await p.goto(`${setupHost}/lightning/setup/SetupOneHome/home`, { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await p.screenshot({ path: path.join(DIRS.einstein, '01-setup-home.png'), fullPage: true });

    // Type in Quick Find
    await p.keyboard.press('Tab');
    await sleep(500);
    // Focus Quick Find by clicking on the sidebar search
    await p.evaluate(() => {
      const qf = document.querySelector('#setupSearch, input[aria-label="Search Setup"], input[placeholder="Quick Find"]');
      if (qf) { qf.click(); qf.focus(); }
    });
    await sleep(1000);
    await p.keyboard.type('Einstein');
    await sleep(3000);
    await p.screenshot({ path: path.join(DIRS.einstein, '02-quickfind-einstein.png'), fullPage: true });

    // Find and click matching link
    const einsteinLink = await p.evaluate(() => {
      const links = Array.from(document.querySelectorAll('#setupSearchResult a, .searchResultList a, a'));
      const match = links.find((a) => {
        const txt = (a.textContent || '').trim().toLowerCase();
        return txt === 'einstein' || txt === 'generative ai' || txt.includes('einstein setup') || txt.includes('ai setup');
      });
      if (match) { match.click(); return { txt: match.textContent.trim(), href: match.href }; }
      // fallback: just list all links with einstein
      return { notFound: true, allLinks: links.slice(0, 10).map((a) => a.textContent.trim()) };
    });
    console.log('[E3] Einstein quickfind result:', JSON.stringify(einsteinLink));
    if (einsteinLink && !einsteinLink.notFound) {
      await sleep(8000);
      await p.screenshot({ path: path.join(DIRS.einstein, '03-einstein-page.png'), fullPage: true });
      einsteinWorking = p.url();
    }
  }

  await p.screenshot({ path: path.join(DIRS.einstein, '01-page-loaded.png'), fullPage: true });

  // Deep shadow-DOM label capture
  const einsteinLabels = await p.evaluate(() => {
    const out = new Set();
    function walk(root) {
      root.querySelectorAll('*').forEach((el) => {
        const t = (el.tagName === 'INPUT' ? '' : (el.childNodes.length && Array.from(el.childNodes).some(n => n.nodeType === 3) ? el.textContent : '')).trim().replace(/\s+/g, ' ');
        if (t.length > 2 && t.length < 200) out.add(t);
        if (el.shadowRoot) walk(el.shadowRoot);
      });
    }
    walk(document);
    return [...out].slice(0, 60);
  });
  console.log('[E4] Einstein labels (sample):', einsteinLabels.slice(0, 10));
  fs.writeFileSync(path.join(DIRS.einstein, 'labels.md'), `# Einstein Setup Labels\n\n${einsteinLabels.map((l) => `- ${l}`).join('\n')}\n`);

  // Toggle einstein
  const einsteinToggles = await p.evaluate(() => {
    const results = [];
    function walk(root) {
      root.querySelectorAll('button,*[role="switch"],input[type="checkbox"]').forEach((el) => {
        const txt = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '') + ' ' + (el.getAttribute('title') || '')).toLowerCase();
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 &&
            (txt.includes('turn on') || txt.includes('enable') || el.getAttribute('role') === 'switch')) {
          results.push({ tag: el.tagName, txt: (el.textContent || '').trim().substring(0, 80), ariaChecked: el.getAttribute('aria-checked') });
          try { el.click(); } catch (e) {}
        }
      });
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return results;
  });
  console.log('[E5] Einstein toggles:', JSON.stringify(einsteinToggles));
  await sleep(5000);
  await p.screenshot({ path: path.join(DIRS.einstein, '02-after-toggle.png'), fullPage: true });

  // Step 6: Agentforce — try multiple URL patterns
  const agentforceUrls = [
    `${lightningHost}/lightning/setup/AgentforceAgents/home`,
    `${lightningHost}/lightning/setup/EinsteinCopilot/home`,
    `${lightningHost}/lightning/setup/BotSettings/home`,
  ];

  let agentforceWorking = null;
  for (const url of agentforceUrls) {
    await p.goto(url, { waitUntil: 'domcontentloaded' });
    await sleep(8000);
    const notFound = await p.evaluate(() => document.title.includes('not found') || document.body.textContent.includes('Page not found'));
    if (!notFound) {
      agentforceWorking = url;
      console.log('[A1] Agentforce URL works:', url);
      break;
    }
    console.log('[A1] Not found:', url);
  }

  // Try Quick Find for Agentforce
  if (!agentforceWorking) {
    await p.goto(`${setupHost}/lightning/setup/SetupOneHome/home`, { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await p.evaluate(() => {
      const qf = document.querySelector('#setupSearch, input[aria-label="Search Setup"], input[placeholder="Quick Find"]');
      if (qf) { qf.click(); qf.focus(); qf.value = ''; }
    });
    await sleep(500);
    await p.keyboard.type('Agents');
    await sleep(3000);
    await p.screenshot({ path: path.join(DIRS.agentforce, '02-quickfind-agents.png'), fullPage: true });
    const agentforceLink = await p.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a'));
      const match = links.find((a) => {
        const txt = (a.textContent || '').trim().toLowerCase();
        return txt === 'agents' || txt === 'agentforce agents' || txt.includes('agentforce');
      });
      if (match) { match.click(); return { txt: match.textContent.trim(), href: match.href }; }
      return { notFound: true };
    });
    console.log('[A2] Agentforce quickfind:', JSON.stringify(agentforceLink));
    if (agentforceLink && !agentforceLink.notFound) {
      await sleep(8000);
      agentforceWorking = p.url();
    }
  }

  await p.screenshot({ path: path.join(DIRS.agentforce, '01-page-loaded.png'), fullPage: true });

  const agentforceLabels = await p.evaluate(() => {
    const out = new Set();
    function walk(root) {
      root.querySelectorAll('*').forEach((el) => {
        const t = (el.tagName === 'INPUT' ? '' : (el.childNodes.length && Array.from(el.childNodes).some(n => n.nodeType === 3) ? el.textContent : '')).trim().replace(/\s+/g, ' ');
        if (t.length > 2 && t.length < 200) out.add(t);
        if (el.shadowRoot) walk(el.shadowRoot);
      });
    }
    walk(document);
    return [...out].slice(0, 60);
  });
  console.log('[A3] Agentforce labels (sample):', agentforceLabels.slice(0, 10));
  fs.writeFileSync(path.join(DIRS.agentforce, 'labels.md'), `# Agentforce Labels\n\n${agentforceLabels.map((l) => `- ${l}`).join('\n')}\n`);

  const agentforceToggles = await p.evaluate(() => {
    const results = [];
    function walk(root) {
      root.querySelectorAll('button,*[role="switch"],input[type="checkbox"]').forEach((el) => {
        const txt = ((el.textContent || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 &&
            (txt.includes('turn on') || txt.includes('enable') || el.getAttribute('role') === 'switch')) {
          results.push({ tag: el.tagName, txt: (el.textContent || '').trim().substring(0, 80), ariaChecked: el.getAttribute('aria-checked') });
          try { el.click(); } catch (e) {}
        }
      });
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return results;
  });
  console.log('[A4] Agentforce toggles:', JSON.stringify(agentforceToggles));
  await sleep(5000);
  await p.screenshot({ path: path.join(DIRS.agentforce, '02-after-toggle.png'), fullPage: true });

  // Step 7: Data Cloud peek
  await p.goto(`${lightningHost}/lightning/setup/DataCloudSetup/home`, { waitUntil: 'domcontentloaded' });
  await sleep(8000);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '06-data-cloud-state.png'), fullPage: true });
  const dataCloudLabels = await p.evaluate(() => {
    const out = new Set();
    document.querySelectorAll('h1,h2,h3,button').forEach((el) => {
      const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
      if (t.length > 2 && t.length < 200) out.add(t);
    });
    return [...out].slice(0, 20);
  });
  console.log('[D1] Data Cloud labels:', dataCloudLabels);

  // Step 8: Agentforce Studio (new builder)
  await p.goto(`${lightningHost}/lightning/n/standard-AgentforceStudio?c__nav=agents`, { waitUntil: 'domcontentloaded' });
  await sleep(12000);
  await p.screenshot({ path: path.join(DIRS.bootstrap, '07-agentforce-studio.png'), fullPage: true });
  const studioLabels = await p.evaluate(() => {
    const out = new Set();
    function walk(root) {
      root.querySelectorAll('h1,h2,h3,button,span').forEach((el) => {
        if (el.shadowRoot) return;
        const t = (el.textContent || '').trim().replace(/\s+/g, ' ');
        if (t.length > 2 && t.length < 150) out.add(t);
      });
      root.querySelectorAll('*').forEach((el) => { if (el.shadowRoot) walk(el.shadowRoot); });
    }
    walk(document);
    return [...out].slice(0, 30);
  });
  console.log('[S1] Studio labels:', studioLabels);

  // Step 9: Write summary
  const summary = {
    lightningHost,
    setupHost,
    einsteinWorking,
    agentforceWorking,
    einsteinLabels: einsteinLabels.slice(0, 40),
    agentforceLabels: agentforceLabels.slice(0, 40),
    dataCloudLabels: [...dataCloudLabels],
    studioLabels: [...studioLabels],
    einsteinToggles,
    agentforceToggles,
    screenshots: {
      bootstrap: fs.readdirSync(DIRS.bootstrap).filter(f => f.endsWith('.png')),
      einstein: fs.readdirSync(DIRS.einstein).filter(f => f.endsWith('.png')),
      agentforce: fs.readdirSync(DIRS.agentforce).filter(f => f.endsWith('.png')),
    },
    ts: new Date().toISOString(),
  };
  fs.writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2));
  console.log('SUCCESS — summary written to', SUMMARY_OUT);

  await ctx.close();
  process.exit(0);
})();
