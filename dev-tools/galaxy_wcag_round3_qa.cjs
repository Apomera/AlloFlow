const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict'), crypto = require('node:crypto');
const { chromium } = require('playwright');
const ROOT = path.resolve(__dirname, '..'), OUT = path.join(ROOT, 'reports/galaxy-wcag-round3-2026-10-24');
const read = file => fs.readFileSync(path.join(ROOT, file), 'utf8');
const tag = process.env.GALAXY_WCAG3_TAG || 'after', source = read(process.env.GALAXY_WCAG3_SOURCE || 'stem_lab/stem_tool_galaxy.js');
const core = read('dev-tools/galaxy_core_clipping.cjs'), start = core.indexOf('const SHELL = `') + 'const SHELL = `'.length;
const shell = core.slice(start, core.indexOf('`;\n\n(async', start)).replace('callGemini: null,', 'callGemini: window.__quizProvider || null,');
const css = 'desktop/web-app/public/app/' + JSON.parse(read('desktop/web-app/public/app/asset-manifest.json')).files['main.css'].replace(/^\//, '');
const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(file => fs.existsSync(file));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const report = { sourceSha256: crypto.createHash('sha256').update(source).digest('hex'), states: [], interactions: [], errors: [] };
  const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
    page.on('pageerror', error => report.errors.push(String(error)));
    await page.setContent('<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Galaxy keyboard and high contrast checks</title><style>body{margin:0;padding:16px;font-family:system-ui;background:#f4f6fb}*{box-sizing:border-box}</style></head><body><main id="slot"></main></body></html>');
    await page.addStyleTag({ content: read(css) });
    for (const file of ['desktop/web-app/node_modules/react/umd/react.production.min.js', 'desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js', 'vendor/three-r128/three.min.js', 'node_modules/axe-core/axe.min.js']) await page.addScriptTag({ content: read(file) });
    await page.evaluate(() => { window._galaxyPPLoaded = true; let seed = 1467; Math.random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296); Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: false }); });
    await page.addScriptTag({ content: 'window.__uiStrings=' + read('ui_strings.js') + ';' }); await page.addScriptTag({ content: shell }); await page.addScriptTag({ content: source });
    const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    async function mount(state = {}) { await page.evaluate(state => window.__mount({ simMode: 'galaxy', starCount: 2500, galaxyQuality: 'balanced', galaxyAutoRotate: false, ...state }), state); await settle(); if ((!state.simMode || state.simMode === 'galaxy') && !state.quizMode) await page.waitForFunction(() => !!document.querySelector('[data-galaxy-canvas]')?._galaxyGetInspectionState && !document.querySelector('[data-galaxy-building]'), null, { timeout: 60000 }); }
    const check = (name, pass, details) => { report.interactions.push({ name, pass, ...(details || {}) }); console.log(name + ': ' + pass); };
    async function scan(name) { await settle(); await page.waitForTimeout(200); const violations = await page.evaluate(async () => (await axe.run('#slot', { runOnly: { type: 'tag', values: ['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'] } })).violations.map(item => ({ id: item.id, nodes: item.nodes.map(node => ({ target: node.target, summary: node.failureSummary })) }))); const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1); report.states.push({ name, violations, overflow }); }
    const normalOnly=!!process.env.GALAXY_WCAG3_NORMAL_ONLY;
    if(!normalOnly) for (const [width, height, textSize] of [[1280,720,100], [640,360,100], [320,240,100], [640,360,200], [640,720,200]]) {
      await page.setViewportSize({ width, height }); await page.evaluate(size => document.documentElement.style.fontSize=size+'%', textSize); await mount({ galaxyFullscreenPanel: true });
      const canvas = page.locator('[data-galaxy-canvas]'); await canvas.scrollIntoViewIfNeeded(); await page.locator('button[aria-label="Toggle fullscreen"]').click(); await settle();
      await page.keyboard.press('Tab');
      const controls = page.locator('[data-galaxy-camera-controls] button'), count = await controls.count(), stops = [];
      for (let index = 0; index < count; index++) {
        const button = controls.nth(index); if (await button.isDisabled()) continue;
        await button.focus(); await settle();
        stops.push(await button.evaluate(node => { const r = node.getBoundingClientRect(), s=getComputedStyle(node), points = [[.5,.5],[.1,.1],[.9,.1],[.1,.9],[.9,.9]]; return { name: node.getAttribute('aria-label'), x:r.x,y:r.y,width:r.width,height:r.height, focusVisible:node.matches(':focus-visible')&&(parseFloat(s.outlineWidth)>=2||s.boxShadow!=='none'), visible: points.some(([a,b]) => { const x=r.x+r.width*a,y=r.y+r.height*b;if(x<0||y<0||x>=innerWidth||y>=innerHeight)return false;const top=document.elementFromPoint(x,y);return top&&(top===node||node.contains(top)); }) }; }));
      }
      check('Camera focus visible in fullscreen ' + width + 'x' + height+' text '+textSize+'%', stops.every(stop => stop.visible&&stop.focusVisible), { width, height, textSize, stops });
      const sizing=await controls.evaluateAll(nodes=>{const rs=nodes.map(node=>node.getBoundingClientRect());return {minimumTarget:rs.every(r=>r.width>=44&&r.height>=44),overlap:rs.some((r,i)=>rs.some((s,j)=>i<j&&Math.min(r.right,s.right)-Math.max(r.left,s.left)>1&&Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>1))};});
      check('Camera targets fit at '+width+'x'+height+' text '+textSize+'%',sizing.minimumTarget&&!sizing.overlap,sizing);
      await page.locator('[data-galaxy-workspace]').screenshot({ path: path.join(OUT, tag + '-fullscreen-' + width + 'x' + height + '-text'+textSize+'.png') });
      await canvas.evaluate(canvas => canvas._galaxyToggleFullscreen()); await settle();
    }
    if(normalOnly){await page.setViewportSize({width:640,height:720});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await mount();}
    for(const [width,height] of [[640,720],[390,844],[320,720]]){
      await page.setViewportSize({width,height});await page.evaluate(()=>document.documentElement.style.fontSize='200%');await settle();await page.keyboard.press('Tab');
      const controls=page.locator('[data-galaxy-camera-controls] button'),stops=[];
      for(let index=0;index<await controls.count();index++){
        const button=controls.nth(index);if(await button.isDisabled())continue;await button.focus();await settle();
        stops.push(await button.evaluate(node=>{const r=node.getBoundingClientRect(),s=getComputedStyle(node);return {name:node.getAttribute('aria-label'),width:r.width,height:r.height,focusVisible:node.matches(':focus-visible')&&(parseFloat(s.outlineWidth)>=2||s.boxShadow!=='none'),visible:[[.5,.5],[.1,.1],[.9,.1],[.1,.9],[.9,.9]].some(([a,b])=>{const x=r.x+r.width*a,y=r.y+r.height*b;if(x<0||y<0||x>=innerWidth||y>=innerHeight)return false;const top=document.elementFromPoint(x,y);return top&&(top===node||node.contains(top));})};}));
      }
      check('Camera focus visible in normal view '+width+'x'+height+' text 200%',stops.every(stop=>stop.visible&&stop.focusVisible),{width,height,textSize:200,normalView:true,stops});
      const sizing=await controls.evaluateAll(nodes=>{const rs=nodes.map(node=>node.getBoundingClientRect());return {minimumTarget:rs.every(r=>r.width>=44&&r.height>=44),overlap:rs.some((r,i)=>rs.some((s,j)=>i<j&&Math.min(r.right,s.right)-Math.max(r.left,s.left)>1&&Math.min(r.bottom,s.bottom)-Math.max(r.top,s.top)>1))};});
      check('Camera targets fit in normal view '+width+'x'+height+' text 200%',sizing.minimumTarget&&!sizing.overlap,sizing);await scan('normal-'+width+'x'+height+'-text200');
      await page.locator('[data-galaxy-stage]').screenshot({path:path.join(OUT,tag+'-normal-'+width+'x'+height+'-text200.png')});
    }
    if(normalOnly)return;
    await page.evaluate(()=>document.documentElement.style.fontSize='100%'); await page.setViewportSize({ width:1280,height:900 });
    async function forced(name, selector) {
      const selected = page.locator(selector + '[aria-pressed="true"]').first(), inactive = page.locator(selector + '[aria-pressed="false"]').first();
      if (!(await selected.count()) || !(await inactive.count())) { if(tag==='before'){check(name+' baseline marker unavailable',false);return;} throw Error('Missing selected/inactive ' + name); }
      for (const scheme of ['light','dark']) {
        await page.emulateMedia({ forcedColors:'active', colorScheme:scheme }); await page.keyboard.press('Tab'); await selected.focus(); await settle();
        const style = await selected.evaluate(node => { const s=getComputedStyle(node);return { border:s.borderStyle,width:s.borderWidth,outline:s.outlineStyle,outlineWidth:s.outlineWidth,shadow:s.boxShadow }; });
        const other = await inactive.evaluate(node => { const s=getComputedStyle(node);return {border:s.borderStyle,width:s.borderWidth}; });
        check(name+' selected and focus in '+scheme, style.border==='double'&&parseFloat(style.width)>=3&&style.outline==='solid'&&parseFloat(style.outlineWidth)>=2&&other.border!=='double',{style,other});
      }
      await page.emulateMedia({ forcedColors:'none',colorScheme:'light' });
    }
    await mount({simMode:'realSky'}); await scan('real-sky');
    await forced('Sky target','[data-galaxy-real-sky-target]'); await forced('Sky survey','[data-galaxy-real-sky-survey-id]'); await forced('Sky catalog','[data-galaxy-real-sky-catalog-id]');
    const recipe = page.locator('[data-galaxy-real-sky-recipe]').first(); await recipe.click(); await settle(); await forced('Sky recipe','[data-galaxy-real-sky-recipe]');
    await mount({galaxyControlPanel:'motion',rotationSamples:[{radiusKpc:4},{radiusKpc:8}]}); await scan('rotation');
    await forced('Rotation model','[data-galaxy-rotation-model]');
    await page.locator('[data-galaxy-rotation-revisit]').first().click(); await settle(); await forced('Saved radius','[data-galaxy-rotation-revisit]');
    await mount({simMode:'star'}); const stage=page.locator('div[role="button"][aria-pressed]').first(); await stage.click(); await settle();
    await forced('Lifecycle stage',tag==='before'?'div[role="button"]':'[data-galaxy-lifecycle-stage]'); await scan('star');
    if(tag!=='before'){
      await mount({simMode:'metalHunt',metalHunt:{metallicity:.5,mass:2,age:4,notes:'Keep my reasoning',comparison:{z:1,m:1,a:5}}});
      await page.evaluate(()=>window.__metalLive=document.querySelector('[data-galaxy-metallicity-log-status]'));
      const clear=page.locator('[data-galaxy-metallicity-clear-comparison]'); await clear.focus(); await page.keyboard.press('Enter'); await settle();
      check('Metal comparison clear focus and persistent announcement',await page.evaluate(()=>document.activeElement===document.querySelector('[data-galaxy-metallicity-log-add]')&&window.__metalLive===document.querySelector('[data-galaxy-metallicity-log-status]')&&window.__metalLive.textContent.includes('Comparison cleared'))); await scan('metal-clear');
      await mount({galaxyEvidenceWorkbench:{mission:'dust',entries:{dust:{prediction:'dust',visited:[true,true],notes:['First view','Second view'],explanation:'',checked:false,context:null}}}});
      await page.evaluate(()=>window.__evidenceLive=document.querySelector('[data-galaxy-evidence-feedback]'));
      check('Evidence status exists before checking',await page.evaluate(()=>!!window.__evidenceLive&&window.__evidenceLive.textContent===''&&window.__evidenceLive.getAttribute('aria-live')==='polite'&&window.__evidenceLive.getAttribute('aria-atomic')==='true'));
      const evidenceCheck=page.locator('[data-galaxy-evidence-check]'); await evidenceCheck.focus(); await page.keyboard.press('Enter'); await settle();
      check('Evidence feedback reuses status and retains focus',await page.evaluate(()=>window.__evidenceLive===document.querySelector('[data-galaxy-evidence-feedback]')&&window.__evidenceLive.textContent.includes('What the evidence supports')&&document.activeElement===document.querySelector('[data-galaxy-evidence-check]'))); await scan('evidence-checked');
      const saved={id:'obs-keyboard',targetKey:'m104',surveyId:'P/2MASS/color',catalogId:'none',note:'Original saved note.'};
      await mount({simMode:'realSky',realSkyTarget:'m104',realSkySurvey:saved.surveyId,realSkyCatalog:'none',realSkyObservations:[saved]});
      await page.locator('[data-galaxy-real-sky-observation-edit-button]').click(); const editor=page.locator('[data-galaxy-real-sky-observation-editor-input]'); await editor.fill('Evidence draft in progress');
      const guards=await editor.evaluate(node=>[{isComposing:true},{keyCode:229},{altKey:true},{ctrlKey:true},{metaKey:true}].every(options=>{const event=new KeyboardEvent('keydown',{key:'Escape',bubbles:true,cancelable:true,...options});node.dispatchEvent(event);return !event.defaultPrevented&&node.isConnected&&node.value==='Evidence draft in progress';}));
      check('Editor preserves draft for IME and modified Escape',guards); await page.keyboard.press('Escape'); await settle();
      check('Editor ordinary Escape restores edit focus',await page.evaluate(()=>!document.querySelector('[data-galaxy-real-sky-observation-editor-input]')&&document.activeElement===document.querySelector('[data-galaxy-real-sky-observation-edit-button]')));
      const bank=[{q:'Which object is a star?',a:'Sun',options:['Sun','Moon']},{q:'What is our home galaxy?',a:'Milky Way',options:['Milky Way','Andromeda']}];
      await page.evaluate(()=>{const outside=document.createElement('button');outside.id='outside';outside.textContent='Outside the tool';document.body.prepend(outside);window.__quizProvider=(prompt,callback)=>new Promise((resolve,reject)=>{window.__resolveQuiz=callback;window.__rejectQuiz=reject;});});
      for(const outcome of ['success','cancel','reject','moved']){
        await mount({quizMode:true,dynamicQuiz:bank});
        await page.evaluate(()=>window.__quizLive=document.querySelector('[data-galaxy-quiz-generation-status]'));
        check('Quiz '+outcome+' status registered before loading',await page.evaluate(()=>!!window.__quizLive&&window.__quizLive.textContent===''&&window.__quizLive.getAttribute('aria-live')==='polite'&&window.__quizLive.getAttribute('aria-atomic')==='true'));
        await page.locator('[data-galaxy-quiz-generate]').focus(); await page.keyboard.press('Enter'); await settle();
        check('Quiz '+outcome+' loading control receives focus',await page.evaluate(()=>document.activeElement===document.querySelector('[data-galaxy-quiz-keep-current]')&&window.__quizLive===document.querySelector('[data-galaxy-quiz-generation-status]')));
        if(outcome==='moved') await page.locator('#outside').focus();
        if(outcome==='cancel'){await page.keyboard.press('Enter');await settle();}
        await page.evaluate(outcome=>outcome==='reject'?window.__rejectQuiz(new Error('Unavailable')):window.__resolveQuiz({text:JSON.stringify([{q:'What powers the Sun?',a:'Fusion',options:['Fusion','Combustion']}])}),outcome); await settle();
        check('Quiz '+outcome+' completion focus and persistent feedback',await page.evaluate(outcome=>{const q=document.querySelector('[data-galaxy-quiz-question]'),status=document.querySelector('[data-galaxy-quiz-generation-status]');return status===window.__quizLive&&status.textContent.includes(outcome==='cancel'?'Kept your current':outcome==='reject'?'could not be loaded':'New questions are ready')&&document.activeElement===(outcome==='moved'?document.querySelector('#outside'):q)&&q.textContent.includes(outcome==='cancel'||outcome==='reject'?'Which object':'What powers');},outcome));
        await scan('quiz-'+outcome);
      }
      await mount({quizMode:true,dynamicQuiz:bank,quizIdx:1,quizScore:1}); await page.locator('[data-galaxy-quiz-generate]').click(); await settle();
      await page.locator('[data-galaxy-mode="galaxy"]').click(); await settle(); await page.locator('[data-galaxy-mode="quiz"]').click(); await settle();
      await page.locator('#outside').focus(); await page.evaluate(()=>window.__resolveQuiz({text:JSON.stringify([{q:'Late replacement',a:'A',options:['A','B']}])})); await settle();
      check('Leaving loading quiz clears status and ignores late responses',await page.evaluate(()=>document.querySelector('[data-galaxy-quiz-generation-status]').textContent===''&&!document.querySelector('[data-galaxy-quiz-keep-current]')&&document.querySelector('[data-galaxy-quiz-question]').textContent.includes('What is our home galaxy')&&document.activeElement===document.querySelector('#outside'))); await scan('quiz-return-after-cancel');
    }
    if(tag!=='before'){assert.deepEqual(report.errors,[]);assert(report.states.every(state=>!state.violations.length&&!state.overflow),'WCAG or overflow failures');assert(report.interactions.every(item=>item.pass),'Visibility or state cues failed');}
  }catch(error){report.failure=String(error.stack||error);throw error;}
  finally{fs.writeFileSync(path.join(OUT,tag+'-browser.json'),JSON.stringify(report,null,2)+'\n');await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
