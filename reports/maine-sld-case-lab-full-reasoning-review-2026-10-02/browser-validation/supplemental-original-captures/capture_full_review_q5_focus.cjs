const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),crypto=require('node:crypto');
const ROOT='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const LOCAL='C:/Users/cabba/Documents/Codex/2026-09-30/p/work/sld-react/full-reasoning-review-validation';
const REPORT=path.join(ROOT,'reports/maine-sld-case-lab-full-reasoning-review-2026-10-02/browser-validation');
const OUT=path.join(LOCAL,'supplemental-q5-captures');
const EXPECTED='f34e2d1d87c6141cf84c8c2fbcabb063fbef45b1151cd6357af232fbce22b9e5';
const sha=content=>crypto.createHash('sha256').update(content).digest('hex');
if(sha(fs.readFileSync(path.join(ROOT,'maine_sld_practice_module.js')))!==EXPECTED)throw new Error('Final module freeze changed');
const readiness=JSON.parse(fs.readFileSync(path.join(REPORT,'initial-preparation-failure/preparation-readiness.json'),'utf8'));
const htmlPath=readiness.command.at(-1).split(',').at(-1),html=fs.readFileSync(htmlPath),css=fs.readFileSync(path.join(LOCAL,'preparation-readiness.css'));
if(sha(css)!==readiness.outputSha256)throw new Error('Prepared CSS changed');
fs.mkdirSync(OUT,{recursive:false});
const {chromium}=require(path.join(ROOT,'node_modules/playwright'));
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
let browser;
const server=http.createServer((request,response)=>{
 const url=new URL(request.url||'/','http://localhost');
 if(url.pathname==='/__host'){response.writeHead(200,{'content-type':'text/html'});response.end(html);return;}
 if(url.pathname==='/__tw.css'){response.writeHead(200,{'content-type':'text/css'});response.end(css);return;}
 try{const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(path.resolve(ROOT)+path.sep)){response.writeHead(403);response.end();return;}response.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});response.end(fs.readFileSync(file));}catch{response.writeHead(404);response.end();}
});
(async()=>{
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const address=server.address();browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:320,height:844}});
 await page.goto('http://127.0.0.1:'+address.port+'/__host?tool=maine-sld-practice&case=alex');await page.evaluate(()=>window.__mount('dark'));await page.getByTestId('maine-sld-panel').waitFor({state:'visible'});
 await page.getByTestId('step-debrief').click();await page.getByTestId('participant-earlier-review').locator('summary').click();await page.getByTestId('edit-q5').click();await page.getByTestId('q5-note').fill('Participant Alex Q5 narrative revision while reviewing classroom observations.');
 const inlineReturn=page.getByTestId('review-return-q5');await inlineReturn.scrollIntoViewIfNeeded();await inlineReturn.focus();const inlineFocus=await page.evaluate(()=>document.activeElement?.getAttribute('data-testid'));await page.screenshot({path:path.join(OUT,'supplemental-q5-inline-return-320-dark.png'),fullPage:true});
 await inlineReturn.click();await page.getByTestId('edit-q5').waitFor({state:'visible'});const returnFocus=await page.evaluate(()=>({activeElementTestId:document.activeElement?.getAttribute('data-testid'),earlierReviewOpen:document.querySelector('[data-testid="participant-earlier-review"]')?.open}));await page.screenshot({path:path.join(OUT,'supplemental-q5-returned-edit-focus-320-dark.png'),fullPage:true});
 const evidence={captureOnly:true,noBuildNoTestsNoAxe:true,moduleSha256:EXPECTED,sourceSha256:sha(fs.readFileSync(path.join(ROOT,'maine_sld_practice_source.jsx'))),helperSha256:sha(fs.readFileSync(__filename)),preparedHarnessPath:htmlPath,preparedHarnessSha256:sha(html),preparedCssSha256:sha(css),width:320,height:844,theme:'dark',caseId:'alex',shots:[{file:'supplemental-q5-inline-return-320-dark.png',description:'Question 5 narrative field with its nearby return action focused, beside the selected-evidence consultation action.',activeElementTestId:inlineFocus},{file:'supplemental-q5-returned-edit-focus-320-dark.png',description:'Returned participant reasoning review with earlier questions expanded and the original Edit Q5 control focused.',...returnFocus}]};fs.writeFileSync(path.join(OUT,'capture-evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
})().finally(async()=>{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}).catch(error=>{console.error(error);process.exitCode=1;});
