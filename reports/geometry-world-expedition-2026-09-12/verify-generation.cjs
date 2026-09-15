const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
let harness=fs.readFileSync('reports/geometry-world-deep-dive-2026-09-08/audit.cjs','utf8').split('const results =')[0];
harness=harness.replace('window.__mount({_introShownOnce:true});','window.__mount({_introShownOnce:true,renderQuality:"saver",autoCycle:false});');
const body=async function(){
 const report={checks:[],errors:[],consoleErrors:[],screenshots:[],source:crypto.createHash('sha256').update(fs.readFileSync('stem_lab/stem_tool_geometryworld.js')).digest('hex')};
 const check=(ok,label)=>{report.checks.push({pass:!!ok,label});if(!ok)throw Error(label);};
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});
 const page=await browser.newPage({viewport:{width:1440,height:1000}});page.setDefaultTimeout(45000);
 page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.consoleErrors.push(m.text());});
 const frames=()=>page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
 const shot=async name=>{await page.screenshot({path:path.join(out,name+'.png'),timeout:60000});report.screenshots.push(name+'.png');};
 const plan={title:'Harbor design journey',setting:'A welcoming coastal workshop',route:'Follow the stone promenade to four mentors.',activities:[]};
 const lesson={title:plan.title,description:'Design and compare equal-volume harbor exhibits.',spawnPoint:[-3,3,-3],objectives:[],ground:{xMin:-30,xMax:30,zMin:-30,zMax:30,y:0,type:'grass'},structures:[],npcs:[{name:'Welcome guide',position:[-1,1,-1],dialogue:'Follow the promenade to each workshop.',color:8048861,question:null}],activities:[]};
 for(let i=0;i<4;i++){
  const id='workshop-'+i,npcName='Mentor '+i,structureId='exhibit-'+i;
  const activity={id,title:'Workshop '+(i+1),challenge:'Build a different prism using twelve cubes.',hint:'Try rearranging two layers into one.',successCriteria:'Both exhibits contain twelve cubes and have different dimensions.',reflection:'Explain how rearranging affects volume.',estimatedMinutes:8};
  plan.activities.push(activity);lesson.activities.push({...activity,npcName,position:[i*5,3,3],structureIds:[structureId]});lesson.objectives.push('Compare equal-volume designs at Workshop '+(i+1));
  lesson.structures.push({id:structureId,type:'fill',x1:i*5,y1:1,z1:7,x2:i*5+2,y2:2,z2:8,block:i%2?'wood':'brick'});
  lesson.npcs.push({name:npcName,position:[i*5,1,4],dialogue:'Two layers of six cubes make twelve. Build a different arrangement and measure it.',color:2461147,question:{text:'How many cubes are in this exhibit?',choices:['12 cubes','6 cubes','10 cubes'],correct:0,measurement:{structureId,quantity:'volume',expected:12},followUp:[{text:'How many cubes are in one layer?',choices:['3','6','12'],correct:1}]}});
 }
 const requests=async count=>page.waitForFunction(n=>window.__generationRequests.length===n,count);
 const resolveRequest=async(index,value)=>page.evaluate(({index,value})=>window.__generationRequests[index].resolve(JSON.stringify(value)),{index,value});
 const signature=()=>page.evaluate(()=>JSON.stringify({title:__geoWorldEngine._currentLesson.title,blocks:StemLab.geometryWorldBuilderPure.editableWorld(__geoWorldEngine).blocks,undo:__geoWorldEngine._undoStack}));
 try{
  await page.goto('http://127.0.0.1:'+server.address().port,{waitUntil:'domcontentloaded'});await page.locator('.gwe-home').waitFor({timeout:120000});await page.waitForFunction(()=>!!window.__geoWorldEngine,{},{timeout:120000});
  await page.evaluate(()=>{window.__generationRequests=[];__ctx.callGemini=(prompt,json)=>new Promise(resolve=>window.__generationRequests.push({prompt,json,resolve}));__ctx.updateMulti('geometryWorld',{geometryHomePage:'start'});});
  await page.locator('.gwe-home-card[data-path=create]').click();await page.getByRole('button',{name:'Open AI lesson builder',exact:true}).click();
  const topic=page.getByLabel('Describe a geometry lesson topic for AI generation',{exact:true});await topic.fill('A harbor with equal-volume design challenges');
  const slider=page.getByRole('slider',{name:'Lesson depth and estimated length'});await slider.focus();await page.keyboard.press('Home');check(await slider.inputValue()==='1','Native Home key selects Quick depth');check((await slider.getAttribute('aria-valuetext')).includes('10–15 min'),'Quick depth announces student time');
  await page.keyboard.press('End');check(await slider.inputValue()==='3','Native End key selects Expedition depth');check((await slider.getAttribute('aria-valuetext')).includes('5 activities'),'Expedition announces its five activities');
  await page.keyboard.press('ArrowLeft');check(await slider.inputValue()==='2','Native arrow key selects Guided depth');
  for(const size of [{width:1440,height:1000},{width:390,height:844},{width:320,height:700},{width:844,height:390}]){
   await page.setViewportSize(size);await frames();await slider.scrollIntoViewIfNeeded();
   const bounds=await slider.evaluate(n=>{const b=n.getBoundingClientRect();return{width:b.width,height:b.height,hit:n===document.elementFromPoint(b.x+b.width/2,b.y+b.height/2),overflow:document.documentElement.scrollWidth>innerWidth};});
   check(bounds.width>=44&&bounds.height>=44&&bounds.hit&&!bounds.overflow,'Depth slider is visible and reachable at '+size.width+'x'+size.height);
   if(size.width===390||size.width===1440)await shot('generation-depth-'+size.width);
  }
  await page.setViewportSize({width:1440,height:1000});const before=await signature();
  const generate=()=>page.getByRole('button',{name:'Generate guided lesson',exact:true});
  await generate().click();await requests(1);check(await slider.isDisabled(),'Depth cannot change during generation');
  const cancel=page.getByRole('button',{name:'Cancel generation',exact:true});await cancel.click();check(await slider.isEnabled(),'Cancel restores generation controls');check(await signature()===before,'Cancel preserves the current world');
  await generate().click();await requests(2);await resolveRequest(0,plan);await frames();check(await page.evaluate(()=>__generationRequests.length)===2,'An old canceled response cannot advance the replacement request');
  await resolveRequest(1,plan);await requests(3);check(await signature()===before,'Planning keeps the world unchanged');
  const invalid=JSON.parse(JSON.stringify(lesson));invalid.npcs[1].question.choices[0]='13 cubes';await resolveRequest(2,invalid);await requests(4);
  check(await page.evaluate(()=>__generationRequests[3].prompt.includes('REPAIR REQUIRED')&&__generationRequests[3].prompt.includes('measurement/answer')),'Wrong mathematical answer triggers a repair request');
  check(await signature()===before,'An invalid mathematical draft is never loaded');
  await resolveRequest(3,lesson);await requests(5);check(await page.evaluate(()=>__ctx.toolData.geometryWorld.aiGenerationStatus.includes('mathematics')),'Guided depth includes the final mathematics and route review');
  await resolveRequest(4,lesson);await page.waitForFunction(()=>!__ctx.toolData.geometryWorld.aiGenerating&&__geoWorldEngine._currentLesson.title==='Harbor design journey');
  check(await page.evaluate(()=>__geoWorldEngine._currentLesson.activities.length===4&&__geoWorldEngine._currentLesson.generation.depth==='guided'),'Completed generation loads all four linked activities');
  check(await page.evaluate(()=>JSON.parse(localStorage.getItem('gw_my_lessons'))[0].activities.length===4),'Saved lesson retains its full activity trail');
  check(await page.evaluate(()=>__generationRequests.every(r=>r.json===true)),'All generation stages use the existing callGemini provider contract');
  await slider.scrollIntoViewIfNeeded();await shot('generation-complete');
 }catch(error){report.failure=error.stack;await shot('generation-failure').catch(()=>{});}
 finally{report.pass=!report.failure&&!report.errors.length&&!report.consoleErrors.length&&report.checks.every(c=>c.pass);fs.writeFileSync(path.join(out,'generation-browser.json'),JSON.stringify(report,null,2));console.log(JSON.stringify({pass:report.pass,checks:report.checks.length,failure:report.failure,errors:report.errors,consoleErrors:report.consoleErrors}));await browser.close();await new Promise(resolve=>server.close(resolve));if(!report.pass)process.exitCode=1;}
};eval(harness+'('+body.toString()+')();');
