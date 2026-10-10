const fs=require('fs'),path=require('path'),vm=require('vm');
let source=fs.readFileSync(path.join(__dirname,'ml_scene_shots.cjs'),'utf8');
source=source.slice(0,source.indexOf('  const manifest = [];'))
  .replace("const OUT = process.argv[2] || '.';","const OUT = path.resolve(process.argv[2] || 'reports/machinelab-record-review-2026-10-09/browser');")
  .replace('deviceScaleFactor: 2','deviceScaleFactor: 1, acceptDownloads: true')
  .replace('chromium.launch({ args:', "chromium.launch({ downloadsPath: path.join(OUT,'downloads'), args:")
  .replace('var ctx = {','window.__qaState = pair[0].machineLab; var ctx = {');
source+=String.raw`
  const checks=[],shots=[];
  const lever={leverEffortArm:2,leverLoadArm:1,leverLoad:400,loadDistance:0.5};
  const pulley={pulleySegments:2,pulleyLoad:400,loadDistance:0.5};
  const records={lever:{benchId:'lever',before:{settings:lever},after:{settings:{...lever,leverEffortArm:4}},note:'First line\nSecond line',investigation:{id:'lever-one-change-v1',force:'same',distance:'more'}},pulley:{benchId:'pulley',before:{settings:pulley},after:{settings:{...pulley,pulleySegments:4}},note:''}};
  function check(ok,label){checks.push(label);if(!ok)errors.push(label);}
  async function mount(width=1150,theme={}){
    await pg.setViewportSize({width,height:1000});
    await pg.evaluate(([s,o])=>window.__mount(s,o),[S({view:'learn',manualTopic:'record',bench:'pulley',leverEffortArm:7,benchExperiments:records,motionPref:'off'}),{band:'g68',...theme}]);
    await pg.locator('#ml-record-note-lever').waitFor();
  }
  try{
    await mount();
    const note='Doubling the effort arm halves force.\nThe hand travels twice as far. <literal>';
    await pg.locator('#ml-record-note-lever').fill(note);
    await pg.locator('#ml-record-note-lever').press('End');
    await pg.locator('#ml-record-note-lever').press('!');
    const finalNote=note+'!';
    check(await pg.locator('#ml-record-note-lever').inputValue()===finalNote,'Editing retains keyboard focus and multiline text');
    check(await pg.evaluate(()=>window.__qaState.benchExperiments.pulley.note===''),'Editing isolates the selected record');
    const downloadPromise=pg.waitForEvent('download');
    await pg.getByRole('button',{name:'Download text record',exact:true}).click();
    const download=await downloadPromise;
    const downloaded=fs.readFileSync(await download.path(),'utf8');
    check(download.suggestedFilename()==='machine-lab-work-record.txt','Native download uses a text filename');
    check(downloaded.includes(finalNote)&&downloaded.includes('200 N → 100 N')&&downloaded.includes('Recorded comparisons: 2/6')&&downloaded.includes('effort force: Same'),'Downloaded text preserves latest explanation, original predictions and fixed evidence');
    await download.saveAs(path.join(OUT,'downloaded-record.txt'));
    check(await pg.evaluate(()=>!document.querySelector('a[download="machine-lab-work-record.txt"]')),'Temporary download link is removed');
    await pg.getByRole('button',{name:'Review at station — Lever',exact:true}).focus();
    await pg.keyboard.press('Enter');
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-evidence-note-lever');
    check(await pg.locator('#ml-evidence-note-lever').inputValue()===finalNote,'Review opens the correct station and focuses its explanation');
    check(await pg.evaluate(()=>window.__qaState.leverEffortArm===7&&window.__qaState.bench==='lever'&&!window.__qaState.shopAnimating),'Review preserves live geometry and pauses motion');
    await pg.locator('#ml-evidence-note-lever').fill('Revised at the station');
    await pg.getByRole('button',{name:'Open your work record',exact:true}).click();
    await pg.waitForFunction(()=>document.activeElement?.id==='ml-work-record');
    check(await pg.locator('#ml-record-note-lever').inputValue()==='Revised at the station','Station edits return to the same work record');
    for(const [width,theme,name] of [[1150,{},'desktop'],[390,{},'phone'],[320,{dark:true},'dark-phone'],[320,{contrast:true},'contrast-phone']]){
      await mount(width,theme);
      if(theme.contrast)await pg.emulateMedia({forcedColors:'active'});
      const fit=await pg.locator('#ml-work-record').evaluate(el=>document.documentElement.scrollWidth<=innerWidth&&el.scrollWidth<=el.clientWidth+1);
      check(fit,name+': record fits viewport');
      await pg.locator('[data-ml-record-station=lever]').screenshot({path:path.join(OUT,name+'.png')});shots.push(name);
    }
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify({checks,shots,errors},null,2));
    console.log(JSON.stringify({checks:checks.length,screenshots:shots.length,errors},null,2));
    if(errors.length)process.exitCode=1;
  }finally{await b.close();}
})();`;
vm.runInThisContext('(function(require){'+source+'\n})',{filename:__filename})(require);
