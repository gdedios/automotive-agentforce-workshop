// Opus: confirm the working URL for All Sites + dump the New button + any template gallery trigger.
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path=require('path'); const fs=require('fs');
const ORG='Electra_Ej4';
const CFT='/Users/gdedios/Library/Caches/ms-playwright/chromium-1217/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
const OUT=path.resolve(__dirname,'..','..','docs','ej4_probe');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const fd=p=>JSON.parse(execFileSync('sf',['org','open','-o',ORG,'-p',p,'--url-only','--json'],{encoding:'utf8'})).result.url;
(async()=>{
  const ctx=await chromium.launchPersistentContext('/tmp/cft-electra-ej4',{executablePath:CFT,headless:true,viewport:{width:1500,height:1000},args:['--no-sandbox','--disable-gpu']});
  const rep={};
  try{
    const page=ctx.pages()[0]||await ctx.newPage();
    const url=fd('lightning/setup/SetupNetworks/home');
    rep.frontdoorHost=new URL(url).host;
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:60000});
    await sleep(11000);
    rep.landedUrl=page.url();
    rep.title=await page.title().catch(()=>'');
    rep.bodyHas={ pageNotFound:false, allSites:false, newBtn:false };
    const body=await page.evaluate(()=>document.body.innerText).catch(()=>'');
    rep.bodyHas.pageNotFound=/page (isn.t available|not found|doesn.t exist)/i.test(body);
    rep.bodyHas.allSites=/All Sites|Digital Experiences/i.test(body);
    rep.bodySample=body.slice(0,500).replace(/\n+/g,' | ');
    // hunt for the New button across frames
    rep.newButtons=[];
    for(const f of page.frames()){
      try{
        const btns=await f.evaluate(()=>{ const out=[]; document.querySelectorAll('button,a,input[type=button]').forEach(b=>{const t=(b.textContent||b.value||'').trim(); if(/^New$/i.test(t)||/New (Site|Experience|Community)/i.test(t)) out.push(t);}); return out; });
        if(btns.length) rep.newButtons.push({frame:f.url().slice(0,70),btns});
      }catch{}
    }
    await page.screenshot({path:path.join(OUT,'allsites-probe.png'),fullPage:true});
  }catch(e){ rep.error=String(e).slice(0,200); }
  finally{ fs.writeFileSync(path.join(OUT,'allsites-probe.json'),JSON.stringify(rep,null,2)); await ctx.close(); }
  console.log(JSON.stringify(rep,null,2));
})();
