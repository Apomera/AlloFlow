const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { chromium } = require('playwright');
process.chdir(path.resolve(__dirname, '../../..'));
const sourceHash = () => crypto.createHash('sha256').update(fs.readFileSync('doc_pipeline_source.jsx')).digest('hex');
const before = sourceHash();
const harnessText = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const program = new Function('fs', 'path', harnessText.slice(harnessText.indexOf('const SRC ='), harnessText.indexOf('const DOC =')) + '\nreturn "const sourceFunctions = " + JSON.stringify(sourceFunctions) + ";\\n" + harness.toString();')(fs, path);
const wrap = body => '<!doctype html><html lang="en"><body><main>' + body + '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8) + '</main></body></html>';
const validation = '<form action="https://remediation.invalid/result"><label>Validation mode<input name="noValidate" value="Original"></label><label>Required response<input required name="answer"></label><button>Submit</button></form>';
const encoding = '<form action="https://remediation.invalid/result" method="post" accept-charset="UTF-8"><label>Response<input name="answer" value="caf\u00e9"></label><button>Submit</button></form>';
const cases = [
 {id:'clobbered-noValidate-bypass', mode:'validation', body:validation, change:s=>s.replace('<form ', '<form novalidate '), expected:'reject'},
 {id:'unclobbered-noValidate-bypass-control', mode:'validation', body:validation.replace('name="noValidate"','name="mode"'), change:s=>s.replace('<form ', '<form novalidate '), expected:'reject'},
 {id:'clobbered-noValidate-harmless-class-control', mode:'validation', body:validation, change:s=>s.replace('<form ', '<form class="accessible" '), expected:'accept'},
 {id:'clobbered-matches-harmless-class-control', mode:'validation', body:validation.replace('name="noValidate"','name="matches"'), change:s=>s.replace('<form ', '<form class="accessible" '), expected:'accept'},
 {id:'submission-charset-changed', mode:'encoding', body:encoding, change:s=>s.replace('accept-charset="UTF-8"','accept-charset="windows-1252"'), expected:'reject'},
 {id:'submission-charset-case-control', mode:'encoding', body:encoding, change:s=>s.replace('accept-charset="UTF-8"','accept-charset="utf-8"'), expected:'accept'},
];
(async()=>{
 const browser=await chromium.launch({headless:true});
 const context=await browser.newContext({serviceWorkers:'block'});
 await context.route('**/*',route=>route.abort());
 const gatePage=await context.newPage();
 const observe=async(html,mode)=>{
  const page=await context.newPage();
  try {
   await page.setContent(html);
   if(mode==='encoding') {
    const promised=page.waitForRequest('https://remediation.invalid/result');
    await page.evaluate(()=>HTMLFormElement.prototype.requestSubmit.call(document.querySelector('form')));
    const request=await promised;
    return {url:request.url(),method:request.method(),postData:request.postData(),requestAbortedBeforeNetwork:true};
   }
   return await page.evaluate(()=>{
    const form=document.querySelector('form'); let submissions=0;
    form.addEventListener('submit',event=>{event.preventDefault();submissions++;});
    HTMLFormElement.prototype.requestSubmit.call(form);
    return {submissions,valid:HTMLFormElement.prototype.checkValidity.call(form),noValidate:Object.getOwnPropertyDescriptor(HTMLFormElement.prototype,'noValidate').get.call(form),propertyClobbered:form.noValidate instanceof Element};
   });
  } finally {await page.close();}
 };
 try {
  const results=[];
  for(const entry of cases){
   const source=wrap(entry.body),candidate=entry.change(source);
   const gate=await gatePage.evaluate(async({program,source,candidate})=>{
    const h=new Function(program+'\nreturn harness;')()(()=>candidate);
    const decision=h.acceptFixedHtmlDetailed(candidate,source,{strictContent:true,mode:'faithful'});
    const repaired=await h.run(source);
    return {decision,pipelineReturnedCandidate:repaired===candidate,pipelineReturnedSource:repaired===source};
   },{program,source,candidate});
   results.push({id:entry.id,expected:entry.expected,source,candidate,...gate,native:{source:await observe(source,entry.mode),candidate:await observe(candidate,entry.mode)}});
  }
  const record={measuredAt:new Date().toISOString(),sourceSha256:before,sourceUnchanged:sourceHash()===before,browserVersion:browser.version(),results};
  fs.writeFileSync(path.join(__dirname,'results.json'),JSON.stringify(record,null,2)+'\n');
  console.log(JSON.stringify(results.map(({id,decision,pipelineReturnedCandidate,native})=>({id,decision,pipelineReturnedCandidate,native})),null,2));
 } finally {await context.close();await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
