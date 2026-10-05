const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const expected=process.argv[2];assert.match(expected||'',/^[a-f0-9]{64}$/);
let code=fs.readFileSync(path.join(__dirname,'../circuit-prediction-guide-2026-10-02/browser-check.cjs'),'utf8');
function replace(old,next){assert.equal(code.split(old).length,2,'Expected unique anchor: '+old.slice(0,90));code=code.replace(old,next);}
replace('6478b21accc3061b34a7328507d83bffec5d7de7d4786565e300e1ddb7d7a4ba',expected);
replace("const guideScope='.circuit-active-prediction-guide'","const guideScope='.circuit-active-lesson-continuation'");
replace('guideStates:[],guideToggles:[],transitions:[]','guideStates:[],guideToggles:[],transitions:[],handoffStates:[],notebookStates:[],openActions:[],instances:[],readingOrder:[]');
replace('Circuit prediction-guide audit: ','Circuit investigation-handoff audit: ');
replace('<title>Circuit optional prediction guide</title>','<title>Circuit independent investigation handoff</title>');
replace('window.awards=[];',"window.awards=[];window.notebookFocusCalls=[];const auditNativeFocus=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(options){if(this.matches('.circuit-active-notebook > summary'))notebookFocusCalls.push({owner:this.closest('#second-handoff-instance')?'second':'primary',options:options||{}});return auditNativeFocus.call(this,options);};");
replace("scrollCalls.push({question:","scrollCalls.push({owner:this.closest('#second-handoff-instance')?'second':'primary',notebook:this.matches('.circuit-active-notebook'),notebookSummary:this.matches('.circuit-active-notebook > summary'),question:");
const shotStart=code.indexOf('    async function screenshot('),shotEnd=code.indexOf('    async function focusCheck(',shotStart);assert.ok(shotStart>0&&shotEnd>shotStart);
code=code.slice(0,shotStart)+String.raw`    async function screenshot(name,scope,width){
      await page.evaluate(()=>{document.activeElement?.blur();window.scrollTo({top:0,left:0,behavior:'instant'});});await page.mouse.move(0,0);await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
      const clip=await page.locator(scope).evaluate(el=>{const r=el.getBoundingClientRect(),book=el.matches('.circuit-active-notebook'),bottom=book?el.querySelector('.circuit-notebook-record-actions').getBoundingClientRect().bottom+12:r.bottom,x=Math.max(0,Math.floor(r.left+scrollX)-6),y=Math.max(0,Math.floor(r.top+scrollY)-6);return {x,y,width:Math.min(document.documentElement.scrollWidth-x,Math.ceil(r.right+scrollX)+6-x),height:Math.ceil(bottom+scrollY)+6-y};});assert.equal(await page.evaluate(()=>innerWidth),width);const file=name+'-'+width+'.png';await page.screenshot({path:path.join(__dirname,file),clip,fullPage:true,animations:'disabled'});results.screenshots.push({name,width,file,clip,crop:scope==='.circuit-active-notebook'?'Notebook header, planning fields and record controls':'Complete all-tested continuation'});
    }
`+code.slice(shotEnd);
replace('await guideState(name,scope,width,scale);','await handoffState(name,scope,width,scale);');
replace('.circuit-explanation-guide-body,.circuit-explanation-guide-steps,.circuit-explanation-guide-steps li','.circuit-continuation-inquiry-steps,.circuit-continuation-inquiry-step,.circuit-continuation-actions,.circuit-notebook-prompts,.circuit-notebook-field');
replace("const actions=await page.locator(labScope).locator('button,summary,textarea,select')", "const actions=await page.locator(scope==='.circuit-active-notebook'?scope:labScope).locator('button,summary,textarea,select,input')");
replace('await focusCheck(name,labScope,selector,width);',"await focusCheck(name,scope==='.circuit-active-notebook'?scope:labScope,selector,width);");
const mainStart=code.indexOf('    const guide=page.locator(guideScope),summary='),mainEnd=code.indexOf('  }catch(error)',mainStart);assert.ok(mainStart>0&&mainEnd>mainStart);code=code.slice(0,mainStart)+fs.readFileSync(path.join(__dirname,'workflow-fragment.txt'),'utf8')+'\n'+code.slice(mainEnd);
replace("await closeNotebook();await fixture(records,'gain');const localeBefore", "await closeNotebook();await fixture(records,'gain',{project:'manual'});const localeBefore");
replace("assert.equal(navigation[0].owner,owner);", "assert.equal(navigation[0].owner,owner);assert.ok(navigation[0].notebook||navigation[0].notebookSummary);");
replace("console.log('Prediction guide: '+results.transitions.length+' native transitions, '","console.log('Investigation handoff: '+results.openActions.length+' native notebook opens, '");
new Function(code);fs.writeFileSync(path.join(__dirname,'browser-check.cjs'),code);console.log(JSON.stringify({source:expected,script:crypto.createHash('sha256').update(code).digest('hex')}));
