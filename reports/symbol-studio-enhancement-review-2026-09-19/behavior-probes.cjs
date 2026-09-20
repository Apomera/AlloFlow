const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const prior = fs.readFileSync(path.join(root,'reports/symbol-studio-review-2026-09-12/browser-review.cjs'),'utf8');
const context = {require,__dirname:path.join(root,'reports/symbol-studio-review-2026-09-12'),process,Buffer,console};
vm.createContext(context);
vm.runInContext(prior.slice(0,prior.indexOf(' (async()=>{'))+'\nthis.html=html;',context);
const routes={'/react.js':'desktop/web-app/node_modules/react/umd/react.development.js','/react-dom.js':'desktop/web-app/node_modules/react-dom/umd/react-dom.development.js','/audio.js':'karaoke_audio_store_module.js','/studio.js':'symbol_studio_module.js'};
const server=require('http').createServer((req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(routes[url.pathname]){res.setHeader('content-type','text/javascript');res.end(fs.readFileSync(path.join(root,routes[url.pathname])));}
  else{res.setHeader('content-type','text/html');res.end(context.html(url.searchParams.get('tab')||'symbols').replaceAll('"category":"other"','"category":"food"'));}
});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const browser=await chromium.launch({headless:true});
  const result={};
  try{
    const page=await browser.newPage({viewport:{width:1440,height:900}});
    await page.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith('data:')?route.continue():route.abort());
    await page.addInitScript(()=>localStorage.setItem('alloGardenWishSeeds',JSON.stringify([{profileId:'other-learner',label:'Other learner private wish',ts:new Date().toISOString()}])));
    await page.goto(origin);
    await page.locator('.ss-main-modal').waitFor();
    result.unicode=await page.evaluate(()=>{
      const api=AlloModules.SymbolStudioInternals;
      const labels=['水','ماء','вода','पानी','café'];
      return labels.map(label=>({label,normalized:api.normalizeSymbolLabel(label),matchesUnrelated:api.matchesBankQuery({id:'x',label:'Book'},label),exactMatchFound:!!api.findExactBankAsset([{id:'x',label,image:'data:image/png;base64,AA=='}],label),aliases:api.normalizeBankAsset({id:'x',label:'Water',aliases:[label]}).aliases}));
    });
    result.category={all:await page.locator('[aria-label^="Select symbol:"]').count()};
    await page.getByRole('button',{name:'Filter by Other',exact:true}).click();
    result.category.other=await page.locator('[aria-label^="Select symbol:"]').count();
    await page.getByRole('button',{name:'Filter by Nouns',exact:true}).click();
    result.category.nouns=await page.locator('[aria-label^="Select symbol:"]').count();
    await page.getByRole('tab',{name:/Word Garden/}).click();
    result.foreignWishVisible=await page.locator('.ss-workspace').getByText('Other learner private wish',{exact:true}).count();
    result.gardenText=await page.locator('.ss-workspace').innerText();
    await page.screenshot({path:path.join(__dirname,'browser','foreign-wish-garden.png')});
    await page.close();
    // Demonstrate the current exported bridge using synthetic local data only.
    const bridgePage=await browser.newPage();
    await bridgePage.route('**/*',route=>route.request().url().startsWith(origin)||route.request().url().startsWith('data:')?route.continue():route.abort());
    await bridgePage.goto(origin);
    result.bridge=await bridgePage.evaluate(()=>{
      localStorage.setItem('alloSymbolFamiliarity__ui-review',JSON.stringify({water:{taps:19,lastSeen:Date.now()}}));
      return AlloModules.GardenBridge.getVocabulary().find(w=>w.label==='Water');
    });
    delete result.bridge.image;
    const source=fs.readFileSync(path.join(root,'symbol_studio_module.js'),'utf8');
    const scoreFunction=source.slice(source.indexOf('    function getFamiliarityScore(label)'),source.indexOf('    // ── Symbol-stability lock helpers'));
    result.studioFamiliarityForSame19Taps=vm.runInNewContext(scoreFunction+'\ngetFamiliarityScore("Water")',{familiarity:{water:{taps:19,lastSeen:Date.now()}},Date});
  }finally{await browser.close();server.close();}
  fs.writeFileSync(path.join(__dirname,'behavior-probes.json'),JSON.stringify(result,null,2));
  console.log(JSON.stringify(result,null,2));
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});

