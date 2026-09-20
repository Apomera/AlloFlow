'use strict';
const fs=require('node:fs'), path=require('node:path'), crypto=require('node:crypto');
const {chromium}=require('playwright');
const harnessText=fs.readFileSync('tests/aifix_chunk_gates.test.js','utf8');
const program=new Function('fs','path',harnessText.slice(harnessText.indexOf('const SRC ='),harnessText.indexOf('const DOC ='))+'\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs,path);
const wrap=body=>'<!doctype html><html lang="en"><body><main>'+body+'<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8)+'</main></body></html>';
const table='<table><tr><th scope="col">Group</th><th scope="col">Score</th></tr><tr id="row"><td>North</td><td id="datum">95</td></tr></table>';
const cases=[
 ['data-cell-presentational',s=>s.replace('id="datum"','id="datum" role="presentation"'),false],
 ['data-cell-button',s=>s.replace('id="datum"','id="datum" role="button"'),false],
 ['data-row-presentational',s=>s.replace('id="row"','id="row" role="presentation"'),false],
 ['explicit-cell-control',s=>s.replace('id="datum"','id="datum" role="cell"'),true],
 ['explicit-row-control',s=>s.replace('id="row"','id="row" role="row"'),true],
 ['fallback-cell-control',s=>s.replace('id="datum"','id="datum" role="unrecognized cell"'),true],
];
const sourceHash=()=>crypto.createHash('sha256').update(fs.readFileSync('doc_pipeline_source.jsx')).digest('hex');
(async()=>{const before=sourceHash(),browser=await chromium.launch({headless:true});const results=[];
try{
 const context=await browser.newContext({serviceWorkers:'block'});await context.route('**/*',route=>route.abort());const page=await context.newPage();const session=await context.newCDPSession(page);
 async function observe(html){await page.setContent(html);const {root}=await session.send('DOM.getDocument');const facts={};for(const id of ['row','datum']){const {nodeId}=await session.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#'+id});const {nodes}=await session.send('Accessibility.getPartialAXTree',{nodeId,fetchRelatives:false});facts[id]={role:nodes[0].role?.value,name:nodes[0].name?.value,ignored:nodes[0].ignored};}const {nodes}=await session.send('Accessibility.getFullAXTree');facts.exposedTableRoles=nodes.filter(n=>!n.ignored&&/^(table|row|cell|columnheader|rowheader)$/.test(n.role?.value)).map(n=>({role:n.role.value,name:n.name?.value}));return facts;}
 for(const [id,change,expectedAccepted] of cases){const source=wrap(table),candidate=change(source);const decision=await page.evaluate(async({program,source,candidate})=>{const h=new Function(program+'\nreturn harness;')()(()=>candidate);return {decision:h.acceptFixedHtmlDetailed(candidate,source,{strictContent:true,mode:'faithful'}),shippedCandidate:(await h.run(source))===candidate};},{program,source,candidate});results.push({id,expectedAccepted,source,candidate,...decision,nativeSource:await observe(source),nativeCandidate:await observe(candidate)});}
 await session.detach();await context.close();const evidence={sourceSha256:before,sourceUnchanged:before===sourceHash(),browserVersion:browser.version(),results};fs.writeFileSync(__dirname+'/table-role-results.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(results.map(({id,expectedAccepted,decision,shippedCandidate,nativeSource,nativeCandidate})=>({id,expectedAccepted,decision,shippedCandidate,source:{row:nativeSource.row,datum:nativeSource.datum},candidate:{row:nativeCandidate.row,datum:nativeCandidate.datum}})),null,2));
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
