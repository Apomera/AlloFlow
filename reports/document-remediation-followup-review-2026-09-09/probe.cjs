const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { chromium } = require('@playwright/test');
process.chdir(path.resolve(__dirname, '../..'));
const text = fs.readFileSync('tests/aifix_chunk_gates.test.js', 'utf8');
const functions = new Function('fs','path',text.slice(text.indexOf('const SRC ='),text.indexOf('function harness('))+'\nreturn sourceFunctions;')(fs,path);
const pad = '<p>Read the original instructions carefully and record observations in your notebook.</p>'.repeat(8);
const wrap = body => '<!doctype html><html lang="en"><head><base href="https://school.example/"></head><body><main>'+body+pad+'</main></body></html>';
const cases = [
 ['hidden-duplicate-swap','reject','<section><h2>Required</h2><p id="required">Complete the exercise.</p></section><section><h2>Archive</h2><p id="archive" hidden>Complete the exercise.</p></section>',s=>s.replace('id="required"','id="required" hidden').replace('id="archive" hidden','id="archive"'), '#required'],
 ['css-cascade-unhide','accept','<style>.note{display:none}.note{display:block}</style><p class="note">Complete the exercise.</p>',s=>s.replace('.note{display:none}', '.note{display:block}'), '.note'],
 ['css-overridden-hide','accept','<style>.note{display:block!important}</style><p class="note">Complete the exercise.</p>',s=>s.replace('class="note"','class="note" style="display:none"'), '.note'],
 ['aria-name-precedence','reject','<span id="student">Student name</span><span id="teacher">Teacher name</span><input aria-label="Name" aria-labelledby="student" value="Ada">',s=>s.replace('aria-labelledby="student"','aria-labelledby="teacher"'),'input'],
 ['fieldset-disabled','reject','<fieldset><legend>Student</legend><label>Name <input value="Ada"></label></fieldset>',s=>s.replace('<fieldset>','<fieldset disabled>'),'input'],
 ['optgroup-disabled','reject','<label>Region<select><optgroup label="Regions"><option>North</option><option>South</option></optgroup></select></label>',s=>s.replace('<optgroup label=', '<optgroup disabled label='),'option'],
 ['base-retarget','reject','<a href="assignment">Read the assignment</a>',s=>s.replace('https://school.example/','https://other.example/'),'a'],
 ['internal-target-swap','reject','<a href="#required">Required steps</a><section id="required"><h2>Required</h2><p>Complete the exercise.</p></section><section id="archive"><h2>Archive</h2><p>Old notes.</p></section>',s=>s.replace('id="required"','id="temporary"').replace('id="archive"','id="required"').replace('id="temporary"','id="archive"'),'a'],
 ['benign-default-input-type','accept','<label>Name <input value="Ada"></label>',s=>s.replace('<input ','<input type="text" '),'input'],
 ['benign-header-scope-repair','accept','<table><tr><th scope="row">Student</th><th scope="row">Score</th></tr><tr><td>Ada</td><td>95</td></tr></table>',s=>s.replace(/scope="row"/g,'scope="col"'),'th'],
 ['prose-math-operator','reject','<p>The expression is x + y.</p>',s=>s.replace('x + y','x − y'),'p'],
 ['math-spoken-name','reject','<math aria-label="x plus y"><mi>x</mi><mo>+</mo><mi>y</mi></math>',s=>s.replace('aria-label="x plus y"','aria-label="x minus y"'),'math'],
 ['hidden-inline-split','accept','<p hidden>Complete the exercise.</p>',s=>s.replace('Complete the exercise.','Complete <strong>the exercise.</strong>'),'p'],
];
async function main(){
 const browser=await chromium.launch({headless:true});
 try{
  const page=await browser.newPage();await page.route('**/*',r=>r.abort());
  await page.evaluate(code=>{window.acceptGate=new Function(code+'\nreturn acceptFixedHtmlDetailed;')();},functions);
  const results=[];
  for(const [id,expected,body,change,selector] of cases){
   const original=wrap(body),candidate=change(original);
   const decision=await page.evaluate(({original,candidate})=>window.acceptGate(candidate,original,{strictContent:true,mode:'faithful'}),{original,candidate});
   const inspect=async html=>{await page.setContent(html);return {dom:await page.locator(selector).first().evaluate(el=>({display:getComputedStyle(el).display,visibility:getComputedStyle(el).visibility,hidden:el.hidden,disabled:el.matches(':disabled'),href:el.href||null,target:el.hash?document.getElementById(el.hash.slice(1))?.textContent:null,text:el.textContent,ariaLabel:el.getAttribute('aria-label'),labelledby:el.getAttribute('aria-labelledby')})),aria:await page.locator('main').ariaSnapshot()};};
   const before=await inspect(original),after=await inspect(candidate);
   results.push({id,expected,decision,mismatch:decision.accepted!==(expected==='accept'),before,after});
  }
  const report={browser:browser.version(),sourceSha256:crypto.createHash('sha256').update(fs.readFileSync('doc_pipeline_source.jsx')).digest('hex'),scope:'Strict candidate gate with actual Chromium rendering/ARIA snapshots; not full pipeline or delivery verdict.',results};
  fs.writeFileSync(path.join(__dirname,'probe-results.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(results.map(({id,expected,decision,mismatch})=>({id,expected,decision,mismatch})),null,2));
 }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
