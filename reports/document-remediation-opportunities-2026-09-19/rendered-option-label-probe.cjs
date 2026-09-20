'use strict';
const fs=require('node:fs'), crypto=require('node:crypto');
const {chromium}=require('playwright');
const {compareRenderedHtml}=require('../../dev-tools/rendered_document_fidelity.cjs');
const wrap=option=>'<select id="choice" aria-label="Temperature" size="2">'+option+'</select>';
const cases=[
 {id:'empty-label-valid-addition',expected:'passed',source:wrap('<option value="temperature" selected>Warm</option>'),candidate:wrap('<option value="temperature" label="" selected>Warm</option>')},
 {id:'empty-label-masks-selected-choice-change',expected:'review-required',source:wrap('<option value="temperature" label="" selected>Warm</option>'),candidate:wrap('<option value="temperature" label="" selected>Cold</option>')},
 {id:'ordinary-label-change-control',expected:'review-required',source:wrap('<option value="temperature" selected>Warm</option>'),candidate:wrap('<option value="temperature" selected>Cold</option>')},
 {id:'unchanged-empty-label-control',expected:'passed',source:wrap('<option value="temperature" label="" selected>Warm</option>'),candidate:wrap('<option value="temperature" label="" selected>Warm</option>')},
];
(async()=>{
 const browser=await chromium.launch({headless:true});const results=[];
 try {
  const context=await browser.newContext({javaScriptEnabled:false,serviceWorkers:'block'});await context.route('**/*',route=>route.abort());
  const page=await context.newPage();const session=await context.newCDPSession(page);
  async function inspect(html){await page.setContent(html);const {nodes}=await session.send('Accessibility.getFullAXTree');return {optionNames:nodes.filter(n=>!n.ignored&&n.role?.value==='option').map(n=>n.name?.value),selection:await page.evaluate(()=>Array.from(document.querySelector('select').selectedOptions).map(o=>({value:o.value,label:o.label,text:o.text})))};}
  for(const entry of cases){const report=await compareRenderedHtml(browser,entry.source,entry.candidate,{checkpoints:[{id:'choice',sourceSelector:'#choice',properties:['selected','value','name','role','exposed']}]});const sourceNative=await inspect(entry.source),candidateNative=await inspect(entry.candidate);results.push({...entry,status:report.status,coverage:report.coverage,checks:report.checks,sourceNative,candidateNative});}
  await session.detach();await context.close();
  const file='dev-tools/rendered_document_fidelity.cjs';const evidence={browserVersion:browser.version(),codeSha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex'),results};
  fs.writeFileSync(__dirname+'/rendered-option-label-results.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(results.map(({id,expected,status,sourceNative,candidateNative})=>({id,expected,status,sourceNative,candidateNative})),null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
