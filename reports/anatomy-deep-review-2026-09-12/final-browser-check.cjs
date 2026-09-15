const fs=require('node:fs');const path=require('node:path');
let source=fs.readFileSync(path.join(__dirname,'check-enhancements.cjs'),'utf8');
source=source.replace('async function capture(name,target){','async function capture(name,target){await page.evaluate(()=>window.scrollTo(0,0));await page.waitForTimeout(100);');
source=source.replace('assert.deepEqual(evidence.errors,[]);',`
await page.setViewportSize({width:390,height:844});
await state({_activeTab:'homeoHunt',_feedbackExperiment:{direction:'cool',prediction:'same',revealed:true}});
await page.evaluate(()=>document.body.classList.add('theme-dark'));await capture('phone-dark-feedback','[data-anatomy-feedback-experiment]');await page.evaluate(()=>document.body.classList.remove('theme-dark'));
const table=JSON.parse(fs.readFileSync('dev-tools/i18n/handtl_anatomy_enhancements_20260912.json','utf8'));
evidence.localized=[];
for(const language of ['french','spanish_latin_america','arabic']){
  await page.evaluate(({dict,rtl})=>{window.__ctx.t=(key,fallback)=>dict[key.slice(13)]||fallback;document.getElementById('wrap').dir=rtl?'rtl':'ltr';window.__rerender();},{dict:table[language],rtl:language==='arabic'});
  assert.equal(await page.locator('#anatomy-feedback-title').innerText(),table[language].feedback_title);
  await capture('phone-'+language+'-feedback','[data-anatomy-feedback-experiment]');evidence.localized.push(language);
}
assert.deepEqual(evidence.errors,[]);`);
new Function('require','__dirname',source)(require,__dirname);
