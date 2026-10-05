const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const ROOT='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const LOCAL='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation';
const REPORT=path.join(ROOT,'reports/maine-sld-case-lab-full-reasoning-review-2026-10-02/browser-validation');
const OUT=path.join(LOCAL,'final-q5-keyboard-captures');
const EXPECTED='d69ff0908089f9d47dc0a572d676eadbbd846a8cfd5ea170637bd651720eb0f7';
const SOURCE='ef37ab74b6188e1346f3e7447dd08e190ec15a1e1b781530b3c0c5d10f715a46';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
if(sha(fs.readFileSync(path.join(ROOT,'maine_sld_practice_module.js')))!==EXPECTED||sha(fs.readFileSync(path.join(ROOT,'maine_sld_practice_source.jsx')))!==SOURCE)throw new Error('Final candidate changed');
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
 try{const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(path.resolve(ROOT)+path.sep)){response.writeHead(403);response.end();return;}const bytes=fs.readFileSync(file);if(path.basename(file)==='maine_sld_practice_module.js')servedModules.push({urlPath:url.pathname,bytes:bytes.length,sha256:sha(bytes)});response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});response.end(bytes);}catch{response.writeHead(404);response.end();}
});
async function geometry(page,cardSelector){return page.evaluate(selector=>{const main=document.querySelector('.msld-main'),card=document.querySelector(selector),active=document.activeElement,s=active&&getComputedStyle(active);const rect=e=>{if(!e)return null;const r=e.getBoundingClientRect();return{x:r.x,right:r.right,width:r.width,y:r.y,height:r.height};};return{main:{clientWidth:main.clientWidth,scrollWidth:main.scrollWidth,scrollLeft:main.scrollLeft},card:rect(card),field:rect(document.querySelector('[data-testid="q5-note"]')),activeElementTestId:active?.getAttribute('data-testid'),focusVisible:active?.matches(':focus-visible'),outlineStyle:s?.outlineStyle,outlineWidth:s?.outlineWidth,outlineColor:s?.outlineColor,earlierReviewOpen:document.querySelector('[data-testid="participant-earlier-review"]')?.open};},cardSelector);}
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));browser=await chromium.launch({headless:true});const page=await browser.newPage({viewport:{width:320,height:844}}),responses=[];
 page.on('response',response=>{if(new URL(response.url()).pathname.endsWith('/maine_sld_practice_module.js'))responses.push(response.body().then(bytes=>({url:response.url(),status:response.status(),bytes:bytes.length,sha256:sha(bytes)})));});
 await page.goto('http://127.0.0.1:'+server.address().port+'/__host?tool=maine-sld-practice&case=alex');await page.evaluate(()=>window.__mount('dark'));await page.getByTestId('maine-sld-panel').waitFor({state:'visible'});
 await page.getByTestId('step-debrief').click();await page.getByTestId('participant-earlier-review').locator('summary').focus();await page.keyboard.press('Enter');await page.getByTestId('edit-q5').focus();await page.keyboard.press('Enter');await page.getByTestId('q5-note').fill('Participant Alex Q5 narrative revision while reviewing classroom observations.');await page.getByTestId('q5-note').focus();await page.keyboard.press('Tab');await page.keyboard.press('Tab');await page.waitForFunction(()=>document.activeElement?.getAttribute('data-testid')==='review-return-q5');
 const inline=await geometry(page,'#msld-Q5');await page.screenshot({path:path.join(OUT,'final-q5-inline-return-keyboard-320-dark.png'),fullPage:true});
 await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement?.getAttribute('data-testid')==='edit-q5');const returned=await geometry(page,'[data-testid="review-q5"]');await page.screenshot({path:path.join(OUT,'final-q5-returned-edit-keyboard-320-dark.png'),fullPage:true});
 const evidence={captureOnly:true,noBuildNoTestNoAxe:true,moduleSha256:EXPECTED,sourceSha256:SOURCE,helperSha256:sha(fs.readFileSync(__filename)),preparedHarnessPath:htmlPath,preparedHarnessSha256:sha(html),preparedCssSha256:sha(css),servedModules,loadedModules:await Promise.all(responses),width:320,height:844,theme:'dark',caseId:'alex',keyboardSequence:['Earlier-review summary: Enter','Edit Q5: Enter','Q5 textarea: Tab to consult action, Tab to nearby return','Nearby return: Enter'],shots:[{file:'final-q5-inline-return-keyboard-320-dark.png',description:'Corrected Question 5 narrative card, field and nearby return action with keyboard focus visible.',...inline},{file:'final-q5-returned-edit-keyboard-320-dark.png',description:'Returned earlier participant review with the original Edit Q5 control showing keyboard focus.',...returned}]};fs.writeFileSync(path.join(OUT,'capture-evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
})().finally(async()=>{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}).catch(error=>{console.error(error);process.exitCode=1;});
