// Probe candidate Agentforce Setup URLs to find the one that renders.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ORG_ALIAS = 'Electra_Auto';
const CFT = '/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const USER_DATA_DIR = '/tmp/cft-electra-toggles-v2';
const OUT_DIR = path.resolve(__dirname, '..', 'docs', 'screenshots', 'phase5_enable', 'probe');
fs.mkdirSync(OUT_DIR, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function frontdoor(setupPath) {
  const out = execFileSync('sf', ['org', 'open', '--url-only', '-o', ORG_ALIAS, '-p', setupPath, '--json'], { encoding: 'utf8' });
  return JSON.parse(out).result.url;
}

const candidates = [
  'EinsteinCopilot/home',
  'CopilotStudioCenter/home',
  'AgentForce/home',
  'AgentforceSetupHome/home',
  'AgentforceStudio/home',
  'EinsteinAgentSetup/home',
  'AiAgentSetup/home',
  'AiAgentManagement/home',
  'GenAIAgentSetup/home',
];

(async () => {
  const ctx = await chromium.launchPersistentContext(USER_DATA_DIR, {
    executablePath: CFT, headless: false,
    viewport: { width: 1440, height: 900 },
    args: ['--no-first-run'],
  });
  const page = ctx.pages()[0] || await ctx.newPage();
  page.setDefaultTimeout(30000);

  const results = [];
  for (const candidate of candidates) {
    console.log(`\n[probe] ${candidate}`);
    try {
      const url = frontdoor(`/lightning/setup/${candidate}`);
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await sleep(8000);
      const status = await page.evaluate(() => {
        const text = document.body.innerText || '';
        return {
          notFound: /Page not found/i.test(text),
          headerText: (text.split('\n').slice(0, 30).join(' | ')).slice(0, 400),
          url: window.location.pathname,
        };
      });
      const slug = candidate.replace(/[/]/g, '-');
      await page.screenshot({ path: path.join(OUT_DIR, `${slug}.png`), fullPage: false }).catch(() => {});
      console.log(`  notFound=${status.notFound}  ${status.headerText.slice(0, 120)}`);
      results.push({ candidate, ...status });
    } catch (e) {
      console.log(`  ERR: ${e.message.slice(0, 100)}`);
      results.push({ candidate, error: e.message.slice(0, 200) });
    }
  }

  fs.writeFileSync(path.join(OUT_DIR, 'probe-results.json'), JSON.stringify(results, null, 2));
  console.log('\n[done]');
  await sleep(2000);
  await ctx.close();
})();
