const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ORG = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const fd = JSON.parse(execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG, '-p', '/lightning/n/standard-AgentforceStudio?c__nav=agents', '--json'], { encoding: 'utf8' })).result.url;

(async () => {
  const ctx = await chromium.launchPersistentContext('/tmp/cft-electra-enable', { executablePath: CFT, headless: false, viewport: { width: 1600, height: 1000 } });
  const p = ctx.pages()[0] || await ctx.newPage();
  p.setDefaultTimeout(30000);
  try {
    await p.goto(fd, { waitUntil: 'domcontentloaded' });
    await sleep(6000);
    await p.evaluate(() => {
      function w(r) { for (const a of r.querySelectorAll('a,button,*[role="button"]')) { if ((a.textContent || '').trim() === 'Take Me There') { a.click(); return; } } for (const n of r.querySelectorAll('*')) if (n.shadowRoot) w(n.shadowRoot); }
      w(document);
    });
    await sleep(5000);
    await p.goto('https://trailsignup-002f6531341a7f.lightning.force.com/AgentAuthoring/agentAuthoringBuilder.app#/project?projectId=1bYHp000000Gme0MAC&projectVersionId=1bZHp000000GmuvMAC', { waitUntil: 'domcontentloaded' });
    await sleep(15000);

    // Click toolbar Commit Version
    await p.evaluate(() => {
      function w(r) { for (const a of r.querySelectorAll('button,*[role="button"]')) { if ((a.textContent || '').trim() === 'Commit Version') { a.click(); return; } } for (const n of r.querySelectorAll('*')) if (n.shadowRoot) w(n.shadowRoot); }
      w(document);
    });
    await sleep(7000);

    // Move mouse onto the dialog Commit Version (1133, 570 from prior runs) WITH a real downe/up
    console.log('mouse down/up at 1133, 570');
    await p.mouse.move(1133, 570);
    await sleep(150);
    await p.mouse.down();
    await sleep(120);
    await p.mouse.up();
    await sleep(15000);

    await p.screenshot({ path: '/tmp/cmt-1.png', fullPage: true });

    // Status check: query bundle versions
    const list = require('child_process').execFileSync('sf', ['org', 'list', 'metadata', '-m', 'AiAuthoringBundle', '-o', ORG, '--json'], { encoding: 'utf8' });
    const bundles = JSON.parse(list).result.filter((r) => r.fullName.startsWith('Electra'));
    console.log('=== bundle versions on org ===');
    bundles.forEach((b) => console.log(b.fullName, '|', b.lastModifiedDate));
  } finally {
    await sleep(2000);
    await ctx.close();
  }
})();
