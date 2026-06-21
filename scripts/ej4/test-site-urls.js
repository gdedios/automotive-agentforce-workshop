// Opus: test which Digital Experiences Setup node resolves (not 404).
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path=require('path'); const fs=require('fs');
const ORG='Electra_Ej4';
const CFT='/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT=path.resolve(__dirname,'..','..','docs','ej4_probe');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fd=p=>JSON.parse(execFileSync('sf',['org','open','-o',ORG,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url;
const candidates=[
  'lightning/setup/Networks/home',
  'lightning/setup/DigitalExperiencesSetup/home',
  'lightning/setup/NetworkCreation/home',
  '_ui/networks/setup/NetworkSettingsPage',  // legacy
  'lightning/setup/SetupNetworks/home',      // known 404 baseline
];
(async()=>{
  const ctx=await chromium.launchPersistentContext('/tmp/cft-electra-ej4',{executablePath:CFT,headless:true,viewport:{width:1400,height:900},args:['--no-sandbox','--disable-gpu']});
  const rep=[];
  try{
    const page=ctx.pages()[0]||await ctx.newPage();
    for(const c of candidates){
      let r={path:c};
      try{
        await page.goto(fd(c),{waitUntil:'domcontentloaded',timeout:45000});
        await sleep(6000);
        const t=await page.title().catch(()=>'');
        const body=await page.evaluate(()=>document.body.innerText.slice(0,300)).catch(()=>'');
        r.title=t;
        r.notFound=/page (isn.t available|not found|doesn.t exist)/i.test(t+body);
        r.hasNew=/\bNew\b/.test(body) && /site|experience/i.test(body);
        r.bodySample=body.replace(/\n+/g,' ').slice(0,160);
      }catch(e){ r.err=String(e).slice(0,60); }
      rep.push(r);
    }
  }catch(e){ rep.push({fatal:String(e).slice(0,150)}); }
  finally{ fs.writeFileSync(path.join(OUT,'test-site-urls.json'),JSON.stringify(rep,null,2)); await ctx.close(); }
  console.log(JSON.stringify(rep,null,2));
})();
