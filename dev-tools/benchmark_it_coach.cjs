#!/usr/bin/env node
'use strict';
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const {cases,corpusVersion}=require('./it_coach_benchmark_cases.cjs');
const {production,hash,diagnostics,summarize,screenHtml}=require('./it_coach_benchmark_core.cjs');
const {reportHtml}=require('./it_coach_benchmark_report.cjs');
const root=path.resolve(__dirname,'..');
function argumentsOf(argv) {
  const opts={}; const flags=new Set(['prepare','self-test','live','help']);
  const values=new Set(['out','backend','model','url','key-env','timeout','case','import','score','reviews']);
  for(let i=0;i<argv.length;i++) {
    const key=argv[i].replace(/^--/,'');
    if(!argv[i].startsWith('--') || (!flags.has(key)&&!values.has(key)) || opts[key]!==undefined)throw Error('Unknown or duplicate argument: '+argv[i]);
    if(flags.has(key))opts[key]=true;
    else { if(!argv[i+1] || argv[i+1].startsWith('--'))throw Error('Missing value for --'+key); opts[key]=argv[++i]; }
  }
  const modes=['prepare','self-test','live','import','score'].filter(k=>opts[k]);
  if(!opts.help && modes.length!==1)throw Error('Choose exactly one mode: --prepare, --self-test, --live, --import FILE, or --score FILE.');
  return opts;
}
function readImport(file,selected) {
  const pack=JSON.parse(fs.readFileSync(file,'utf8'));
  if(typeof pack.model!=='string' || !pack.model.trim() || !Array.isArray(pack.cases))throw Error('Import needs a model label and cases array.');
  const rows=new Map();
  for(const row of pack.cases) {
    if(!selected.some(c=>c.id===row.id) || rows.has(row.id))throw Error('Unknown or duplicate response ID: '+row.id);
    if(typeof row.response!=='string' && (!row.response || typeof row.response!=='object'))throw Error('Each imported response must be text or an object.');
    if(typeof row.response==='string' && !row.response.trim())throw Error('Remove unrun rows instead of importing an empty response.');
    rows.set(row.id,row.response);
  }
  return {model:pack.model.slice(0,200),rows};
}
function save(out,report) {
  fs.mkdirSync(out,{recursive:true});
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(report,null,2));
  fs.writeFileSync(path.join(out,'review.html'),reportHtml(report));
}
async function run(opts) {
  const out=path.resolve(opts.out || path.join(root,'reports','it-coach-benchmark',new Date().toISOString().replace(/[:.]/g,'-')+'-'+crypto.randomUUID().slice(0,8)));
  if(fs.existsSync(path.join(out,'results.json')))throw Error('Output already contains results; choose a new --out directory.');
  if(opts.score) {
    if(!opts.reviews)throw Error('--score requires --reviews FILE.');
    const report=JSON.parse(fs.readFileSync(opts.score,'utf8'));
    report.reviews=JSON.parse(fs.readFileSync(opts.reviews,'utf8'));
    report.summary=summarize(report,report.reviews);save(out,report);return out;
  }
  const selected=opts.case ? cases.filter(c=>c.id===opts.case) : cases;
  if(!selected.length)throw Error('Unknown case: '+opts.case);
  let imported=opts.import ? readImport(opts.import,selected) : null;
  let provider=null, destination=null;
  const timeout=Number(opts.timeout || 60000);
  if(!Number.isFinite(timeout)||timeout<1000||timeout>300000)throw Error('Timeout must be 1000–300000 ms.');
  if(opts.live) {
    if(!opts.backend || !opts.model || !opts.url)throw Error('Live mode requires --backend, --model, and --url. No hidden provider defaults are used.');
    if(!['ollama','lmstudio','localai','custom','openai','gemini'].includes(opts.backend))throw Error('Unsupported backend.');
    const url=new URL(opts.url);
    if(!['http:','https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash)throw Error('Use an HTTP(S) base URL without credentials, query, or fragment.');
    const apiKey=opts['key-env'] ? process.env[opts['key-env']] : '';
    if(opts['key-env'] && !apiKey)throw Error('The named key environment variable is empty.');
    const {AIProvider}=require('../ai_backend_module.js');
    provider=new AIProvider({backend:opts.backend,baseUrl:opts.url,apiKey:apiKey || '',models:{vision:opts.model,default:opts.model,fallback:opts.model},debugLog:()=>{},warnLog:()=>{}});
    destination=url.origin+url.pathname;
  }
  const adapter=production();
  const report={schemaVersion:1,runId:crypto.randomUUID(),createdAt:new Date().toISOString(),corpusVersion,evaluatorHash:hash(fs.readFileSync(__filename,'utf8')+fs.readFileSync(path.join(__dirname,'it_coach_benchmark_core.cjs'),'utf8')),corpusHash:hash(JSON.stringify(selected)),productionHashes:adapter.hashes,mode:opts.live?'live':opts.import?'live-browser':opts['self-test']?'self-test':'prepared',model:opts.model || imported?.model || null,provenance:imported?'User-supplied browser responses; source not independently verified.':opts.live?'Configured provider API responses.':opts['self-test']?'Authored reference fixtures.':'No model calls.',destination,cases:[]};
  const {chromium}=require('playwright');let browser;
  try {
    browser=await chromium.launch({channel:'chrome',headless:true});
    const page=await browser.newPage();await page.route('**/*',r=>r.abort());
    for(const c of selected) {
      await page.setViewportSize({width:c.width || 1280,height:c.height || 720});
      await page.setContent(screenHtml(c));
      const expectedBox=c.target ? await page.locator('#'+c.target).evaluate(el=>{const r=el.getBoundingClientRect();return {x:r.x/innerWidth,y:r.y/innerHeight,w:r.width/innerWidth,h:r.height/innerHeight};}) : null;
      const image='data:image/jpeg;base64,'+(await page.screenshot({type:'jpeg',quality:70})).toString('base64');
      const item={id:c.id,title:c.title,goal:c.goal,context:c.context || '',rubric:c.expected,prompt:adapter.prompt(c),image,imageHash:hash(image),expectedBox,rawResponse:null,displayed:null,checks:null,latencyMs:null};
      if(!opts.prepare) {
        const start=Date.now();
        try {
          if(opts.live) {
            const controller=new AbortController();let timer;
            try {
              item.rawResponse=await Promise.race([provider.analyzeImage(item.prompt,image.split(',')[1],{mimeType:'image/jpeg',signal:controller.signal}),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('Request timed out.'));},timeout);})]);
            } finally {clearTimeout(timer);}
          } else if(imported) {
            if(!imported.rows.has(c.id))throw Error('No imported response for this case.');
            item.rawResponse=imported.rows.get(c.id);
          } else item.rawResponse={guidance:c.gold,target:expectedBox,done:!!c.done,kind:c.goldKind || 'navigation',expected:c.expected};
          item.latencyMs=opts.live?Date.now()-start:null;
          const parsed=adapter.parse(item.rawResponse);
          item.displayed=adapter.sanitize(parsed,{posture:'learner'});
          item.checks=diagnostics(parsed,item.displayed,expectedBox,c);
        } catch(e) {
          // Error strings from providers may contain URLs/credentials. Persist a category only.
          item.error=String(e.message).startsWith('No imported response')?'No imported response.':e.name==='AbortError' || /timed out/i.test(e.message)?'Request timed out or cancelled.':'Provider request failed. Check the configured service; error details were not saved.';
        }
      }
      report.cases.push(item);report.summary=summarize(report);save(out,report);
      fs.writeFileSync(path.join(out,c.id+'.jpg'),Buffer.from(image.split(',')[1],'base64'));
      fs.writeFileSync(path.join(out,c.id+'.prompt.txt'),item.prompt);
      console.log(c.id+': '+(item.error || (opts.prepare?'prepared':item.checks?.targetCheck?'target check passed':'needs target review')));
    }
    fs.writeFileSync(path.join(out,'browser-responses-template.json'),JSON.stringify({model:'Enter the model label displayed in Gemini and the run date',cases:selected.map(c=>({id:c.id,response:''}))},null,2));
  } finally {if(browser)await browser.close();adapter.close();}
  return out;
}
if(require.main===module) {
  Promise.resolve().then(()=>{
    const opts=argumentsOf(process.argv.slice(2));
    if(opts.help){console.log('Modes: --prepare | --self-test | --live --backend NAME --model ID --url BASE [--key-env VAR] | --import FILE | --score RESULTS --reviews FILE\nOptions: --out DIR --case ID --timeout MS. See docs/it-coach-benchmark.md.');return;}
    return run(opts).then(out=>console.log('Review report: '+path.join(out,'review.html')));
  }).catch(e=>{console.error(e.message);process.exitCode=1;});
}
module.exports={argumentsOf,readImport,run};
