const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../..');
const checks = [], errors = [], external = [];
const sha = name => crypto.createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
const cssDir = path.join(root, 'app/static/css');
const css = path.join(cssDir, fs.readdirSync(cssDir).find(name => name.endsWith('.css')));
const wav = Buffer.alloc(44 + 8000 * 2 * 4);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(8000, 24); wav.writeUInt32LE(16000, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
const html = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Comparison reader QA</title><link rel="stylesheet" href="/app.css"><style>
*{box-sizing:border-box}html,body,#root{margin:0;width:100%;height:100%;font-family:Arial,sans-serif;background:#f8fafc;color:#0f172a}button,input,select,textarea{font:inherit}button:focus-visible,[tabindex]:focus-visible{outline:3px solid #4338ca;outline-offset:3px}.fixture-shell{width:100%;max-width:1280px;margin:auto;height:100%;display:flex;flex-direction:column;min-width:0}.fixture-header{padding:10px 16px;flex:none}.fixture-header h1{font-size:20px;font-weight:bold}.fixture-header p{font-size:13px;overflow-wrap:anywhere}.fixture-scroller{min-height:0;flex:1;overflow-y:auto;padding:12px 16px;position:relative}.fixture-footer{margin-top:24px;padding:18px;border-top:1px solid #cbd5e1}select{max-width:100%}
</style><div id="root"></div><script src="/strings.js"></script><script src="/fixture.js"></script></html>`;
async function main() {
  await require('esbuild').build({entryPoints:[path.join(__dirname,'fixture.jsx')],bundle:true,write:false,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'}}).then(result => { global.fixtureJS = result.outputFiles[0].contents; });
  const server = http.createServer((req,res) => {
    const url = new URL(req.url,'http://localhost').pathname;
    if(url === '/fixture.js'){res.setHeader('Content-Type','application/javascript');res.end(global.fixtureJS);}
    else if(url === '/strings.js'){res.setHeader('Content-Type','application/javascript');res.end('window.fixtureStrings='+fs.readFileSync(path.join(root,'ui_strings.js'),'utf8')+';');}
    else if(url === '/app.css'){res.setHeader('Content-Type','text/css');res.end(fs.readFileSync(css));}
    else if(url === '/tone.wav'){res.setHeader('Content-Type','audio/wav');res.end(wav);}
    else if(url === '/'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);}
    else {res.statusCode=404;res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+server.address().port;
  let browser;
  try {
    browser=await chromium.launch({headless:true,channel:'msedge'});
    const page=await browser.newPage({viewport:{width:1280,height:1000}});
    page.setDefaultTimeout(12000);
    page.on('pageerror',error=>errors.push(error.message));
    await page.route('**/*',route=>{const u=route.request().url();if(u.startsWith(base)||u.startsWith('data:')||u.startsWith('blob:'))return route.continue();external.push(u);return route.abort();});
    await page.addInitScript(()=>{
      localStorage.setItem('allo_save_karaoke_audio','0');
      window.deviceUtterances=[];
      let timers=[];
      Object.defineProperty(window,'speechSynthesis',{value:{
        cancel(){timers.forEach(clearTimeout);timers=[];},resume(){},pause(){},getVoices(){return[];},
        speak(u){window.deviceUtterances.push({text:u.text,lang:u.lang});timers.push(setTimeout(()=>u.onstart?.(),20));timers.push(setTimeout(()=>u.onboundary?.({name:'word',charIndex:3}),100));},
        speaking:false,pending:false
      }});
    });
    const reset=async(query='')=>{await page.goto(base+'/?compare=1'+query);await page.locator('[data-reading-comparison]').waitFor();};
    const pane=kind=>page.locator('[data-compare-version="'+kind+'"]');
    const action=kind=>page.locator('[data-comparison-karaoke="'+kind+'"]');
    const check=async(name,fn)=>{try{const detail=await fn();checks.push({name,status:'passed',detail:detail??null});console.log('PASS '+name);}catch(error){checks.push({name,status:'failed',error:error.message});await page.screenshot({path:path.join(__dirname,'failure-'+checks.length+'.png')});console.error('FAIL '+name+': '+error.message);}};
    await check('Long comparison renders headings and emphasis without Markdown delimiters',async()=>{
      await reset();assert.equal(await pane('source').locator('h2').textContent(),'Coastal field notes');assert.equal(await pane('source').locator('strong').textContent(),'The process of discovery');
      assert.equal(await pane('adapted').getByRole('heading',{name:'Discovering the coast',exact:true}).count(),1);assert.equal(await pane('adapted').getByRole('heading',{name:'Reading the field notes',exact:true}).count(),1);
      for(const kind of ['source','adapted'])assert.doesNotMatch(await pane(kind).textContent(),/##|\*\*/);
      assert.match(await pane('source').textContent(),/each year/);assert.match(await pane('adapted').textContent(),/each year/);
      await pane('source').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'comparison-desktop.png')});
    });
    await check('Original opens real karaoke, plays local audio and advances sweep',async()=>{
      await action('source').click();const dialog=page.getByRole('dialog');await dialog.waitFor();
      assert.match(await dialog.textContent(),/Coastal field notes/);assert.doesNotMatch(await dialog.textContent(),/##|\*\*/);
      assert.equal(await dialog.getByRole('button',{name:/Record my|Regenerate this sentence|Prepare read-aloud/}).count(),0);
      await dialog.getByRole('button',{name:'Play',exact:true}).click();
      await page.waitForFunction(()=>document.querySelector('[role="progressbar"]')?.getAttribute('aria-valuenow')>0);
      assert.ok(await dialog.locator('[style*="linear-gradient"]').count()>0,'Word sweep appears');
      assert.equal(await page.evaluate(()=>window.audioRequests[0].language),'English');
      await page.screenshot({path:path.join(__dirname,'karaoke-desktop.png')});
      await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await action('source').evaluate(n=>n===document.activeElement),true);
    });
    await check('Adapted karaoke uses its own text and supports keyboard sentence navigation',async()=>{
      await action('adapted').click();const dialog=page.getByRole('dialog');await dialog.waitFor();await page.waitForFunction(()=>document.querySelector('[role=dialog]')?.textContent.includes('Discovering the coast'));assert.match(await dialog.textContent(),/Discovering the coast/);
      await dialog.focus();await page.keyboard.press('ArrowRight');assert.match(await dialog.textContent(),/Sentence 2 \/ /);
      await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await action('adapted').evaluate(n=>n===document.activeElement),true);
    });
    await check('Spanish adapted device fallback receives Spanish language and clean text',async()=>{
      await reset('&item=adapted-spanish&fallback=1');await action('adapted').click();const dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Play',exact:true}).click();
      await page.waitForFunction(()=>window.deviceUtterances.length>0);const utterance=await page.evaluate(()=>window.deviceUtterances[0]);assert.equal(utterance.lang,'es');assert.match(utterance.text,/La costa/);assert.doesNotMatch(utterance.text,/##|\*\*/);
      assert.equal(await page.evaluate(()=>window.audioRequests[0].language),'Spanish');await page.keyboard.press('Escape');return utterance;
    });
    await check('Comparison and karaoke fit 320px and restore keyboard focus',async()=>{
      await page.setViewportSize({width:320,height:900});await reset();
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
      assert.equal(await page.locator('[data-fixture-scroller]').evaluate(n=>n.scrollWidth>n.clientWidth+1),false);
      await action('source').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(__dirname,'comparison-320.png')});
      await action('source').focus();await page.keyboard.press('Enter');const dialog=page.getByRole('dialog');await dialog.waitFor();
      assert.equal(await dialog.evaluate(n=>n.scrollWidth>n.clientWidth+1),false);await dialog.evaluate(n=>Promise.all(n.getAnimations().map(animation=>animation.finished)));await page.screenshot({path:path.join(__dirname,'karaoke-320.png')});
      await page.keyboard.press('Escape');await dialog.waitFor({state:'detached'});assert.equal(await action('source').evaluate(n=>n===document.activeElement),true);
    });
    await check('No runtime errors or external service requests',async()=>{assert.deepEqual(errors,[]);assert.deepEqual(external,[]);});
  } finally {
    if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));
    fs.writeFileSync(path.join(__dirname,'browser-results.json'),JSON.stringify({createdAt:new Date().toISOString(),passed:checks.every(c=>c.status==='passed'),checks,errors,external,sha256:Object.fromEntries(['view_simplified_source.jsx','view_simplified_module.js','immersive_reader_source.jsx','immersive_reader_module.js'].map(f=>[f,sha(f)])),limitations:['Actual generated components in an isolated fixture, not the full application shell.','Local silent WAV exercises real audio playback and sweep; device speech is instrumented. No live voice quality, model, microphone, or assistive-technology evaluation.','Microsoft Edge Chromium only; no deployment.']},null,2)+'\n');
  }
  if(checks.some(c=>c.status!=='passed'))process.exitCode=1;
}
main().catch(error=>{console.error(error);process.exitCode=1;});
