const fs=require('node:fs');
const path=require('node:path');
const os=require('node:os');
const http=require('node:http');
const crypto=require('node:crypto');
const ROOT='C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const LOCAL=path.join(__dirname,'guide-revision-validation');
const OUT=path.join(LOCAL,'natural-editor-probe-01');
const MODULE='0ceb5207851a88db30562486dd838e6efbf126cc0e8a7dee7ddc14340864af7c';
const SOURCE='d96b8d5a34e9b689b691792ff6e47f63e3be16c856f38f383303988bee78c5e7';
const SPEC='7bb6f0cc88bba10e031afde06bc224c189b26003a584f6f8dd9b7104d25bd8f4';
const sha=body=>crypto.createHash('sha256').update(body).digest('hex');
for(const [file,expected] of [['maine_sld_practice_module.js',MODULE],['maine_sld_practice_source.jsx',SOURCE],['tests/e2e/maine-sld-practice.spec.ts',SPEC]])if(sha(fs.readFileSync(path.join(ROOT,file)))!==expected)throw Error('Freeze changed: '+file);
if(fs.existsSync(OUT))throw Error('Probe attempt already exists');
const candidate=JSON.parse(fs.readFileSync(path.join(LOCAL,'module-five-01/browser/browser-candidate.json'),'utf8'));
const result=JSON.parse(fs.readFileSync(path.join(LOCAL,'module-five-01/result.json'),'utf8'));
if(candidate.moduleSha256!==MODULE)throw Error('Producer module differs');
const producer=path.join(LOCAL,'natural-editor-assets'),assetIdentity=JSON.parse(fs.readFileSync(path.join(producer,'asset-identity.json'),'utf8'));
const html=fs.readFileSync(path.join(producer,'host.html')),css=fs.readFileSync(path.join(producer,'tailwind.css'));
if(assetIdentity.moduleSha256!==MODULE||sha(html)!==assetIdentity.responses['/__host'].sha256||sha(css)!==assetIdentity.responses['/__tw.css'].sha256)throw Error('Actual trace producer asset binding changed');
fs.mkdirSync(OUT,{recursive:true});
fs.copyFileSync(__filename,path.join(OUT,'capture-helper.cjs'));
const mime={'.js':'text/javascript','.json':'application/json','.css':'text/css'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://127.0.0.1');
 if(url.pathname==='/__host'){res.writeHead(200,{'content-type':'text/html'});res.end(html);return;}
 if(url.pathname==='/__tw.css'){res.writeHead(200,{'content-type':'text/css'});res.end(css);return;}
 const file=path.resolve(ROOT,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(path.resolve(ROOT)+path.sep)){res.writeHead(403);res.end();return;}
 try{res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file));}catch(error){res.writeHead(404);res.end();}
});
let browser;
const measure=page=>page.evaluate(()=>{
 const main=document.querySelector('.msld-main'),writer=document.querySelector('[data-testid="q9-note"]'),button=document.querySelector('[data-testid="guide-return-q9"]');
 const rectangle=node=>{const box=node.getBoundingClientRect();return {top:box.top,bottom:box.bottom,left:box.left,right:box.right,height:box.height,width:box.width};};
 const bounds={main:rectangle(main),writer:rectangle(writer),returnButton:rectangle(button)};
 const span=Math.max(bounds.writer.bottom,bounds.returnButton.bottom)-Math.min(bounds.writer.top,bounds.returnButton.top);
 return {viewport:{width:innerWidth,height:innerHeight},...bounds,mainClientHeight:main.clientHeight,mainScrollTop:main.scrollTop,writerReturnSpanPx:span,spanFitsMain:span<=main.clientHeight,spanFitsMainWith7pxAllowance:span+14<=main.clientHeight,writerFullyVisible:bounds.writer.top>=bounds.main.top&&bounds.writer.bottom<=bounds.main.bottom,returnFullyVisible:bounds.returnButton.top>=bounds.main.top&&bounds.returnButton.bottom<=bounds.main.bottom,activeControl:document.activeElement?.getAttribute('data-testid'),writerFocused:document.activeElement===writer,manualReturnScroll:false,manualWriterFocus:false};
});
(async()=>{
 try{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const {chromium}=require(path.join(ROOT,'node_modules','@playwright','test'));
  browser=await chromium.launch();const page=await browser.newPage({viewport:{width:844,height:390}});
  await page.goto('http://127.0.0.1:'+server.address().port+'/__host?tool=maine-sld-practice&case=taylor');await page.evaluate(()=>window.__mount('dark'));
  await page.getByTestId('step-debrief').click();await page.getByTestId('reveal-debrief').click();await page.getByTestId('revise-guide-q9').click();
  const before=await measure(page);await page.screenshot({path:path.join(OUT,'taylor-q9-natural-source-focus-844x390-dark.png'),fullPage:false});
  const note='  Participant taylor Q9 revised evidence.\n<mark data-guide-revision="literal">Keep this as text</mark>\nRemaining uncertainty is recorded here.  ';
  await page.getByTestId('q9-note').fill(note);const after=await measure(page);await page.screenshot({path:path.join(OUT,'taylor-q9-natural-after-fill-844x390-dark.png'),fullPage:false});
  const evidence={moduleSha256:MODULE,sourceSha256:SOURCE,browserTestSha256:SPEC,producerDir:producer,traceAssetIdentity:assetIdentity,producerHtmlSha256:sha(html),producerCssSha256:sha(css),producerCandidate:candidate,probeHelperSha256:sha(fs.readFileSync(__filename)),noSuiteNoAxeNoCssCompilation:true,naturalSourceFocus:before,naturalAfterFill:after,failedFixture:{writerTop:77.3125,mainTop:131,explicitPlaywrightReturnScroll:true,explicitNoteRefocus:true},naturalAfterFillBothFullyVisible:after.writerFullyVisible&&after.returnFullyVisible&&after.writerFocused};
  fs.writeFileSync(path.join(OUT,'capture-evidence.json'),JSON.stringify(evidence,null,2));process.stdout.write(JSON.stringify(evidence,null,2)+'\n');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{process.stderr.write(String(error.stack||error)+'\n');process.exitCode=1;});
