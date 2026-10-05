const fs = require('node:fs'), path = require('node:path'), http = require('node:http'), crypto = require('node:crypto');
const repo = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
const report = path.join(repo, 'reports/maine-sld-case-lab-evidence-recovery-2026-10-04');
const staged = path.join(report, 'staged-build');
const [attempt, expectedSource, expectedModule] = process.argv.slice(2);
if (!/^recovery-overflow-probe-[0-9]+$/.test(attempt || '') || !/^[a-f0-9]{64}$/.test(expectedSource || '') || !/^[a-f0-9]{64}$/.test(expectedModule || '')) throw Error('Explicit attempt/source/module identities required');
const out = path.join(__dirname, 'evidence-recovery-validation', attempt);
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const source = fs.readFileSync(path.join(staged, 'maine_sld_practice_source.jsx'));
const moduleBody = fs.readFileSync(path.join(staged, 'maine_sld_practice_module.js'));
if (sha(source) !== expectedSource || sha(moduleBody) !== expectedModule) throw Error('Staged identity changed');
const retained = path.join(__dirname, 'guide-revision-validation/natural-editor-assets');
const html = fs.readFileSync(path.join(retained, 'host.html')), css = fs.readFileSync(path.join(retained, 'tailwind.css'));
if (sha(html) !== '078937f26696db4b8fa0648f503db50f64a93d400418021b95f9c731c2d17b24' || sha(css) !== 'b104c6faca4db538b15c97b19fb5176ffa02308a82f3a3c5e3df8d0c3537b163') throw Error('Retained capture assets changed');
if (fs.existsSync(out)) throw Error('Attempt exists');
fs.mkdirSync(out, {recursive:true}); fs.copyFileSync(__filename, path.join(out, 'capture-helper.cjs'));
const server = http.createServer((req,res) => {
  const url = new URL(req.url,'http://127.0.0.1');
  const body = url.pathname === '/__host' ? html : url.pathname === '/__tw.css' ? css : url.pathname === '/maine_sld_practice_module.js' ? moduleBody : null;
  if (body) { res.writeHead(200,{'content-type':url.pathname.endsWith('.js')?'text/javascript':url.pathname.endsWith('.css')?'text/css':'text/html'}); res.end(body); return; }
  const target = path.resolve(repo,'.'+decodeURIComponent(url.pathname));
  if (!target.startsWith(path.resolve(repo)+path.sep)) {res.writeHead(403);res.end();return;}
  try { res.writeHead(200,{'content-type':path.extname(target)==='.js'?'text/javascript':'application/octet-stream'}); res.end(fs.readFileSync(target)); } catch {res.writeHead(404);res.end();}
});
const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
let browser;
(async () => {
  try {
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    const {chromium} = require(path.join(repo,'node_modules/@playwright/test'));
    browser = await chromium.launch();
    const page = await browser.newPage({viewport:{width:320,height:740}});
    await page.goto('http://127.0.0.1:'+server.address().port+'/__host?tool=maine-sld-practice&case=marisol');
    await page.evaluate(()=>window.__mount('dark'));
    await page.getByTestId('step-scores').click();
    const pin = page.locator('[data-testid^="score-pin-"]').first();
    const id = (await pin.getAttribute('data-testid')).slice('score-pin-'.length);
    await pin.click(); await page.getByTestId('step-evidence').click();
    await page.getByTestId('score-purpose-'+id).selectOption('complicating');
    const literal = '  <mark data-recovery="literal">'+ 'R'.repeat(3900) + '</mark>\nOriginal role and note.  ';
    await page.getByTestId('score-note-'+id).fill(literal);
    await page.getByTestId('score-pin-'+id).click();
    await page.getByTestId('removed-finding-details').locator('summary').click();
    await page.getByTestId('removed-finding-note').scrollIntoViewIfNeeded(); await settle(page);
    const geometry = await page.evaluate(() => {
      const main=document.querySelector('.msld-main'), note=document.querySelector('[data-testid="removed-finding-note"]'), card=document.querySelector('[data-testid="finding-removal-recovery"]');
      const rect=el=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      return {viewport:{width:innerWidth,height:innerHeight},main:{...rect(main),clientWidth:main.clientWidth,scrollWidth:main.scrollWidth,scrollLeft:main.scrollLeft},note:{...rect(note),clientWidth:note.clientWidth,scrollWidth:note.scrollWidth,overflowWrap:getComputedStyle(note).overflowWrap,whiteSpace:getComputedStyle(note).whiteSpace,textLength:note.textContent.length},card:rect(card),noMarkupParsed:note.querySelector('mark')===null,errors:window.__errors};
    });
    await page.screenshot({path:path.join(out,'marisol-removed-literal-320x740-dark.png'),fullPage:false});
    const undo = page.getByTestId('undo-finding-removal');
    const undoTestIds = await page.locator('[data-testid*="undo"]').evaluateAll(els=>els.map(el=>el.getAttribute('data-testid')));
    const evidence={capturedAt:new Date().toISOString(),sourceSha256:expectedSource,moduleSha256:expectedModule,producerModuleSha256:'0ceb5207851a88db30562486dd838e6efbf126cc0e8a7dee7ddc14340864af7c',producerHtmlSha256:sha(html),producerCssSha256:sha(css),probeHelperSha256:sha(fs.readFileSync(__filename)),captureOnly:true,noSuiteNoAxeNoCssCompilation:true,rawProducerJavascriptResponseAbsent:true,activeRootSourceSha256:sha(fs.readFileSync(path.join(repo,'maine_sld_practice_source.jsx'))),activeRootModuleSha256:sha(fs.readFileSync(path.join(repo,'maine_sld_practice_module.js'))),literalSha256:sha(literal),findingId:id,geometry,undoTestIds,horizontalOverflow:geometry.main.scrollWidth>geometry.main.clientWidth+1};
    fs.writeFileSync(path.join(out,'capture-evidence.json'),JSON.stringify(evidence,null,2));
    process.stdout.write(JSON.stringify(evidence,null,2)+'\n');
  } finally {if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
})().catch(error=>{process.stderr.write(String(error.stack||error)+'\n');process.exitCode=1;});
