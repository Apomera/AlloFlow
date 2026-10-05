const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const ROOT='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const LOCAL='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation';
const REPORT=path.join(ROOT,'reports/maine-sld-case-lab-full-reasoning-review-2026-10-02/browser-validation');
const OUT=path.join(LOCAL,'q5-geometry-audit');
const EXPECTED='f34e2d1d87c6141cf84c8c2fbcabb063fbef45b1151cd6357af232fbce22b9e5';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
const sourceBefore=sha(fs.readFileSync(path.join(ROOT,'maine_sld_practice_source.jsx')));
if(sha(fs.readFileSync(path.join(ROOT,'maine_sld_practice_module.js')))!==EXPECTED)throw new Error('Final module freeze changed');
const readiness=JSON.parse(fs.readFileSync(path.join(REPORT,'initial-preparation-failure/preparation-readiness.json'),'utf8'));
const htmlPath=readiness.command.at(-1).split(',').at(-1),html=fs.readFileSync(htmlPath),css=fs.readFileSync(path.join(LOCAL,'preparation-readiness.css'));
if(sha(css)!==readiness.outputSha256)throw new Error('Prepared CSS changed');
fs.mkdirSync(OUT,{recursive:false});
const {chromium}=require(path.join(ROOT,'node_modules/playwright'));
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const servedModules=[];let browser;
const server=http.createServer((request,response)=>{
 const url=new URL(request.url||'/','http://localhost');
 if(url.pathname==='/__host'){response.writeHead(200,{'content-type':'text/html'});response.end(html);return;}
 if(url.pathname==='/__tw.css'){response.writeHead(200,{'content-type':'text/css'});response.end(css);return;}
 try{const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(path.resolve(ROOT)+path.sep)){response.writeHead(403);response.end();return;}const bytes=fs.readFileSync(file);if(path.basename(file)==='maine_sld_practice_module.js')servedModules.push({requestPath:url.pathname,bytes:bytes.length,sha256:sha(bytes)});response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});response.end(bytes);}catch{response.writeHead(404);response.end();}
});
const phases=[];
async function measure(page,name){
 const geometry=await page.evaluate(()=>{
  const item=selector=>{const e=document.querySelector(selector);if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return{selector,x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height,clientWidth:e.clientWidth,scrollWidth:e.scrollWidth,scrollLeft:e.scrollLeft,cssWidth:s.width,minWidth:s.minWidth,maxWidth:s.maxWidth,gridTemplateColumns:s.gridTemplateColumns,overflowX:s.overflowX,paddingLeft:s.paddingLeft,paddingRight:s.paddingRight,outlineStyle:s.outlineStyle,outlineWidth:s.outlineWidth,outlineColor:s.outlineColor,boxShadow:s.boxShadow};};
  const active=document.activeElement;return{window:{innerWidth:window.innerWidth,scrollX:window.scrollX,scrollY:window.scrollY},document:{clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollLeft:document.documentElement.scrollLeft},active:{testId:active?.getAttribute('data-testid'),tag:active?.tagName,focusVisible:active?.matches(':focus-visible')},panel:item('[data-testid="maine-sld-panel"]'),main:item('.msld-main'),reasoningGrid:item('.msld-reasoning-grid'),stack:item('.msld-reasoning-grid > .msld-stack'),card:item('#msld-Q5'),textarea:item('[data-testid="q5-note"]'),consult:item('[data-testid="consult-evidence-q5"]'),inlineReturn:item('[data-testid="review-return-q5"]'),selects:Array.from(document.querySelectorAll('.msld-reasoning-grid select')).map(e=>item('[data-testid="'+e.getAttribute('data-testid')+'"]'))};
 });phases.push({name,...geometry});
}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:320,height:844}}),loadedModule=[];
 page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('/maine_sld_practice_module.js'))loadedModule.push(response.body().then(bytes=>({url:response.url(),status:response.status(),bytes:bytes.length,sha256:sha(bytes)})));});
 await page.goto('http://127.0.0.1:'+server.address().port+'/__host?tool=maine-sld-practice&case=alex');await page.evaluate(()=>window.__mount('dark'));await page.getByTestId('maine-sld-panel').waitFor({state:'visible'});
 await page.getByTestId('step-reasoning').click();await measure(page,'original-before-Q5-focus');
 await page.getByTestId('jump-q5').click();await measure(page,'original-after-question-field-focus');
 await page.getByTestId('step-debrief').click();await page.getByTestId('participant-earlier-review').locator('summary').click();await page.getByTestId('edit-q5').click();await measure(page,'original-after-review-edit-field-focus');
 await page.getByTestId('q5-note').fill('Participant Alex Q5 narrative revision while reviewing classroom observations.');const inlineReturn=page.getByTestId('review-return-q5');await inlineReturn.scrollIntoViewIfNeeded();await measure(page,'original-after-helper-inline-scroll');await inlineReturn.focus();await measure(page,'original-after-helper-inline-focus');
 await page.getByTestId('q5-note').focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');await measure(page,'original-after-keyboard-inline-focus');await page.screenshot({path:path.join(OUT,'original-q5-inline-keyboard-320-dark.png'),fullPage:true});
 const candidateCss='@media (max-width:1000px){.msld-reasoning-grid{grid-template-columns:minmax(0,1fr)!important;}}';await page.addStyleTag({content:candidateCss});await measure(page,'track-only-candidate-immediately-after-css');await page.getByTestId('q5-note').focus();await measure(page,'track-only-candidate-field-focus');await inlineReturn.scrollIntoViewIfNeeded();await measure(page,'track-only-candidate-helper-inline-scroll');await page.getByTestId('q5-note').focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');await measure(page,'track-only-candidate-keyboard-inline-focus');await page.screenshot({path:path.join(OUT,'track-only-candidate-q5-inline-keyboard-320-dark.png'),fullPage:true});
 const audit={readOnlyDiagnostic:true,noProductSourceEdits:true,noBuildNoTestNoAxe:true,moduleSha256:EXPECTED,sourceSha256Before:sourceBefore,sourceSha256After:sha(fs.readFileSync(path.join(ROOT,'maine_sld_practice_source.jsx'))),servedModules,loadedModules:await Promise.all(loadedModule),helperSha256:sha(fs.readFileSync(__filename)),preparedHarnessSha256:sha(html),preparedCssSha256:sha(css),candidateCss,phases};fs.writeFileSync(path.join(OUT,'geometry-audit.json'),JSON.stringify(audit,null,2));
 console.log(JSON.stringify({servedModules:audit.servedModules,loadedModules:audit.loadedModules,sourceSha256Before:audit.sourceSha256Before,sourceSha256After:audit.sourceSha256After,phases:phases.map(p=>({name:p.name,active:p.active,document:p.document,main:p.main&&{clientWidth:p.main.clientWidth,scrollWidth:p.main.scrollWidth,scrollLeft:p.main.scrollLeft},grid:p.reasoningGrid&&{x:p.reasoningGrid.x,width:p.reasoningGrid.width,gridTemplateColumns:p.reasoningGrid.gridTemplateColumns},card:p.card&&{x:p.card.x,width:p.card.width,right:p.card.right},textarea:p.textarea&&{x:p.textarea.x,width:p.textarea.width,right:p.textarea.right}}))}));
})().finally(async()=>{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}).catch(error=>{console.error(error);process.exitCode=1;});
