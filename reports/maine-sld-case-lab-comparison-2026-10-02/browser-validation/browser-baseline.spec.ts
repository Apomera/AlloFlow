import { test, expect, Page } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createServer, Server } from 'node:http';
import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

// Real working-tree Hub/card, source-host route reader, Maine panel and theme.
// Full compiled-app boot is covered separately by the integration owner.
const ROOT=process.cwd(), WEB=join(ROOT,'desktop','web-app');
const REPORT=process.env.SLD_REPORT_DIR?resolve(process.env.SLD_REPORT_DIR):join(ROOT,'reports','maine-sld-case-lab-2026-10-01');
let server:Server, base='', css='', hostReader='', firstScore='';
const mime:Record<string,string>={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
const harness=()=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maine SLD working-tree host test</title><link rel="stylesheet" href="/__tw.css"></head><body><button id="outside">Outside dialog</button><main id="app"></main>
<script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/app_styles_module.js"></script><script src="/admin_hub_module.js"></script><script src="/maine_sld_practice_module.js"></script>
<script>window.__errors=[];window.addEventListener('error',function(e){window.__errors.push(String(e.message));});
${hostReader}
window.__reader=_alloReadShellDeepLinkTool;
window.__mount=function(theme){
 const e=React.createElement;
 function Host(){
  const [tool,setTool]=React.useState(function(){return window.__reader()==='maineSldPractice'?'maineSldPractice':'hub';});
  const close=React.useCallback(function(){setTool('hub');},[]);
  return e('div',{className:'min-h-screen bg-slate-50 text-slate-800 font-sans theme-'+theme},e(window.AlloModules.AppStyles.AppStyles,{}),
   tool==='hub'?e(window.AlloModules.AdminHub.AdminHubPanel,{t:function(){},onClose:function(){},addToast:function(){},openTool:function(id){if(id==='maineSldPractice')setTool(id);}}):
   e(window.AlloModules.MaineSldPractice.MaineSldPracticePanel,{isOpen:true,onClose:close,theme:theme,t:function(){},addToast:function(){},initialCaseId:new URLSearchParams(location.search).get('case')||'alex'}));
 }
 ReactDOM.createRoot(document.getElementById('app')).render(e(Host));
};</script></body></html>`;
test.beforeAll(async()=>{
 const source=await readFile(join(ROOT,'AlloFlowANTI.txt'),'utf8');
 const start=source.indexOf('// __ALLO_STEM_DEEP_LINKS_BEGIN__'), fn=source.indexOf('const _alloReadShellDeepLinkTool =',start), end=source.indexOf('\n};',fn)+3;
 if(start<0||fn<0||end<fn)throw new Error('Host route reader not found');
 hostReader=source.slice(start,end);
 const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));firstScore=data.scoreRows[0].id;
 const dir=await mkdtemp(join(tmpdir(),'maine-sld-browser-')),input=join(dir,'input.css'),output=join(dir,'tailwind.css'),html=join(dir,'host.html');
 await writeFile(input,'@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');await writeFile(html,harness());
 execFileSync(process.execPath,[join(WEB,'node_modules','tailwindcss','lib','cli.js'),'-i',input,'-o',output,'--content',[join(ROOT,'admin_hub_module.js'),join(ROOT,'maine_sld_practice_module.js'),html].join(',')],{cwd:WEB,stdio:'pipe'});
 css=await readFile(output,'utf8');await mkdir(REPORT,{recursive:true});
 await writeFile(join(REPORT,'browser-candidate.json'),JSON.stringify({startedAt:new Date().toISOString(),moduleSha256:createHash('sha256').update(await readFile(join(ROOT,'maine_sld_practice_module.js'))).digest('hex'),reviewDate:data.metadata.reviewDate,sourceHost:process.env.SLD_HOST_BASE_URL||null,scope:'Working-tree module and host reader; optional actual source-app boot'},null,2));
 server=createServer(async(req,res)=>{
  const url=new URL(req.url||'/','http://localhost');
  if(url.pathname==='/__host'){res.writeHead(200,{'content-type':mime['.html']});res.end(harness());return;}
  if(url.pathname==='/__tw.css'){res.writeHead(200,{'content-type':mime['.css']});res.end(css);return;}
  try{const file=resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(ROOT+sep)){res.writeHead(403);res.end();return;}const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body);}
  catch{res.writeHead(404);res.end();}
 });
 await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();base='http://127.0.0.1:'+(typeof address==='object'&&address?address.port:0);
});
test.afterAll(async()=>{if(server)await new Promise<void>(r=>server.close(()=>r()));});
async function open(page:Page,theme='light',query='?tool=maine-sld-practice&case=alex'){await page.goto(base+'/__host'+query);await page.evaluate(t=>(window as any).__mount(t),theme);await expect(page.getByTestId('maine-sld-panel')).toBeVisible();}
async function step(page:Page,id:string){await page.getByTestId('step-'+id).click();}
async function noPageOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);}
async function worksheetAction(page:Page,action:any){if(!await action.isVisible())await page.getByTestId('worksheet-tools-toggle').click();await action.click();}

test('native Leadership card launches the panel and host reader resolves both aliases',async({page})=>{
 await page.goto(base+'/__host');await page.evaluate(()=>(window as any).__mount('light'));
 await expect(page.getByRole('dialog',{name:'Leadership Hub',exact:true})).toBeVisible();
 const card=page.locator('[data-hub-id="maineSldPractice"]');await expect(card).toHaveAccessibleName(/Maine SLD Case Lab/);await card.click();await expect(page.getByTestId('maine-sld-panel')).toBeVisible();
 const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));
 for(const fixture of data.cases){await page.getByTestId('case-select').selectOption(fixture.id);await step(page,'case');const taskCard=page.locator('.msld-card').filter({has:page.getByRole('heading',{name:'Your task',exact:true})});await expect(taskCard.locator('li')).toHaveCount(fixture.tasks.length);for(const task of fixture.tasks)await expect(taskCard).toContainText(task.prompt);await step(page,'debrief');await page.getByTestId('reveal-debrief').click();for(const paragraph of [fixture.debrief.summary,fixture.debrief.caution,fixture.debrief.familyExample].filter(Boolean))await expect(page.getByTestId('maine-sld-panel')).toContainText(paragraph);}
 await page.getByTestId('case-select').selectOption('alex');await step(page,'reasoning');const academicAreas=page.locator('#msld-Q1 details');await academicAreas.locator('summary').click();await expect(academicAreas.locator('li')).toHaveCount(8);for(const area of data.academicAreas)await expect(academicAreas).toContainText(area);
 const q3=data.formSteps.find((q:any)=>q.id==='Q3');await expect(page.locator('#msld-Q3 li')).toHaveCount(4);for(const part of q3.subparts)await expect(page.locator('#msld-Q3')).toContainText(part.label);
 const q4=data.formSteps.find((q:any)=>q.id==='Q4');for(const category of q4.evidenceCategories)await expect(page.locator('#msld-Q4')).toContainText(category);
 await expect(page.locator('#msld-Q7')).toContainText('Resolve concerns or obtain appropriate alternative evidence before relying on results for Q8.');
 for(const query of ['?tool=maine-sld-practice','?tool=maineSldPractice']){await open(page,'light',query);expect(await page.evaluate(()=>(window as any).__reader())).toBe('maineSldPractice');}
 await page.goto(base+'/__host?tool=unknown-case');await page.evaluate(()=>(window as any).__mount('light'));await expect(page.getByRole('dialog',{name:'Leadership Hub',exact:true})).toBeVisible();
});
test('all52 scores, evidence and Q8/Q9 work survive steps, case switches and reload',async({page})=>{
 await open(page);await step(page,'scores');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);await page.getByRole('combobox',{name:/^Assessment/}).selectOption('WISC-V');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(16);await expect(page.getByTestId('maine-sld-panel')).toContainText('Showing 16 of 52 results');await page.getByRole('searchbox',{name:'Search the record'}).fill('no matching assessment');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'No scores match this filter.'})).toBeVisible();await page.getByRole('button',{name:'Show all scores',exact:true}).click();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');
 await page.getByTestId('score-purpose-'+firstScore).selectOption('supporting');await page.getByTestId('score-note-'+firstScore).fill('Connect with observed reading performance.');await step(page,'reasoning');
 await page.getByTestId('q8-response').selectOption('yes');await page.getByTestId('q9-response').selectOption('more');await page.getByTestId('case-select').selectOption('jordan');await step(page,'reasoning');await page.getByTestId('q8-response').selectOption('no');await page.getByTestId('case-select').selectOption('alex');await step(page,'reasoning');
 await expect(page.getByTestId('q8-response')).toHaveValue('yes');await expect(page.getByTestId('q9-response')).toHaveValue('more');await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(/observed reading/);
 await page.reload();await page.evaluate(()=>(window as any).__mount('light'));await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(/observed reading/);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});
test('debrief reveals on request, participant print stays separate, and mobile reset confirms',async({page})=>{
 await page.setViewportSize({width:390,height:900});await open(page);await step(page,'scores');await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');
 const text='<img src=x onerror=alert(1)> Keep as reflection text.';await page.getByTestId('score-note-'+firstScore).fill(text);await step(page,'reasoning');await page.getByTestId('q5-note').fill('Classroom observation links slow independent reading with task demands.');await page.getByTestId('q6-note').fill('No relevant medical finding reported; verify the record.');await step(page,'debrief');await expect(page.getByTestId('reveal-debrief')).toBeVisible();await page.getByTestId('reveal-debrief').click();
 await expect(page.getByTestId('maine-sld-panel')).toContainText(/Question 8|Q8/);await expect(page.getByTestId('maine-sld-panel').locator('img[src="x"]')).toHaveCount(0);
 const fixtureData=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));const alex=fixtureData.cases.find((c:any)=>c.id==='alex');for(const calibration of alex.debrief.calibration)await expect(page.getByTestId('maine-sld-panel')).toContainText(calibration);
 for(const q of ['Q5','Q6']){const card=page.locator('.msld-card').filter({has:page.getByRole('heading',{name:new RegExp('^'+q+' ·')})});await expect(card).toContainText('Your response: Narrative recorded');}
 await expect(page.getByTestId('maine-sld-panel')).not.toContainText(/ALL_NO|ANY_YES|Q9A|Q9B/);
 await page.screenshot({path:join(REPORT,'debrief-reviewed-390.png'),fullPage:true});
 const pending=page.waitForEvent('download');await worksheetAction(page,page.getByTestId('export-reflection'));const file=await pending,path=join(REPORT,'browser-worksheet.json');await file.saveAs(path);const exported=JSON.parse(await readFile(path,'utf8'));expect(exported.format).toBe('alloflow-maine-sld-practice');expect(exported.caseWork.alex.findings[firstScore].note).toBe(text);
 await page.evaluate(()=>{(window as any).__printCalls=0;window.print=()=>{(window as any).__printCalls+=1;};});
 await worksheetAction(page,page.getByRole('button',{name:'Print',exact:true}));
 const printed=page.locator('#maine-sld-print-root');await expect(printed).toHaveCount(1);await expect(printed).toContainText(text);await expect(printed.locator('img[src="x"]')).toHaveCount(0);
 const sourceData=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));
 const guideSummary=sourceData.cases.find((c:any)=>c.id==='alex').debrief.summary;
 if(guideSummary)await expect(printed).not.toContainText(guideSummary);
 await expect(printed).not.toContainText('Suggested reasoning');
 expect(await page.evaluate(()=>(window as any).__printCalls)).toBe(1);
 await page.emulateMedia({media:'print'});await expect(printed).toBeVisible();await expect(page.locator('#app')).toBeHidden();await expect(page.locator('#outside')).toBeHidden();
 await page.pdf({path:join(REPORT,'participant-print-browser.pdf'),format:'Letter',printBackground:true,preferCSSPageSize:true});
 await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(printed).toHaveCount(0);
 await worksheetAction(page,page.getByTestId('reset-reflection'));const confirmation=page.getByRole('alertdialog');await expect(confirmation.getByRole('button',{name:'Keep current work'})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(confirmation.getByRole('button',{name:'Reset this case',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(confirmation.getByRole('button',{name:'Keep current work'})).toBeFocused();await page.keyboard.press('Escape');await expect(confirmation).toHaveCount(0);await expect(page.getByTestId('reset-reflection')).toBeFocused();await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work'}).click();await expect(page.getByTestId('reset-reflection')).toBeFocused();await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(text);
 await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Reset this case',exact:true}).click();await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveCount(0);
});
for(const width of [1440,390])for(const theme of ['light','dark','contrast'])test('keyboard layout and axe '+width+'px '+theme,async({page})=>{
 await page.setViewportSize({width,height:900});await open(page,theme);await page.addScriptTag({path:join(ROOT,'node_modules','axe-core','axe.min.js')});const failures:any[]=[], scans:any[]=[];
 for(const id of ['case','scores','evidence','reasoning','debrief']){const button=page.getByTestId('step-'+id);await button.focus();await page.keyboard.press('Enter');await noPageOverflow(page);
  const result=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-testid="maine-sld-panel"]'),{resultTypes:['violations']});return r.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.html)}));});scans.push({step:id,violations:result});result.forEach((v:any)=>failures.push({step:id,...v}));await page.screenshot({path:join(REPORT,id+'-'+width+'-'+theme+'.png'),fullPage:true});
 }
 await writeFile(join(REPORT,'axe-'+width+'-'+theme+'.json'),JSON.stringify({width,theme,steps:5,scans,failures},null,2));expect(failures).toEqual([]);
 await page.locator('#outside').focus();await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('[data-testid="maine-sld-panel"]'))).toBe(true);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});
test('unavailable session storage leaves work usable',async({page})=>{
 await page.addInitScript(()=>{const native=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='alloflow_sld_case_lab_session_v1')throw new DOMException('Unavailable','QuotaExceededError');return native.call(this,key,value);};});
 await open(page);await step(page,'scores');await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');await page.getByTestId('score-note-'+firstScore).fill('Work remains usable with storage blocked.');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(/usable/);await expect(page.getByTestId('maine-sld-panel')).toContainText(/could not|unavailable|download|session/i);
});

test('case-specific share links contain no worksheet data and direct entry selects that case',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await open(page);
 await page.getByTestId('case-select').selectOption('jordan');
 await worksheetAction(page,page.getByRole('button',{name:'Copy activity link',exact:true}));
 const link=await page.evaluate(()=>navigator.clipboard.readText()), url=new URL(link);
 expect(url.searchParams.get('tool')).toBe('maine-sld-practice');
 expect(url.searchParams.get('case')).toBe('jordan');
 expect([...url.searchParams.keys()].sort()).toEqual(['case','tool']);
 expect(url.hash).toBe('');
 await open(page,'light','?tool=maine-sld-practice&case=jordan');
 await expect(page.getByTestId('case-select')).toHaveValue('jordan');
});

test('imported HTML stays text and restoring replaces work only after participant confirmation',async({page})=>{
 await open(page);await step(page,'scores');await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');
 await page.getByTestId('score-note-'+firstScore).fill('Current work to preserve.');
 const download=page.waitForEvent('download');await worksheetAction(page,page.getByTestId('export-reflection'));const file=await download,path=join(REPORT,'import-seed.json');await file.saveAs(path);
 const transfer=JSON.parse(await readFile(path,'utf8'));transfer.caseWork.alex.findings[firstScore].note='<img src=x onerror=alert(1)> imported text';transfer.caseWork.alex.responses.Q8={answer:'yes',note:'Bounded user interpretation'};transfer.caseWork.alex.responses.Q9={answer:'general-ed',note:'The changed premise keeps these decisions separate'};
 transfer.secret='not allowed';transfer.caseWork.alex.aiVerdict='not allowed';
 const payload={name:'worksheet.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(transfer))};
 await page.locator('input[type=file]').setInputFiles(payload);await expect(page.getByRole('alertdialog',{name:'Restore this worksheet?'})).toBeVisible();await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work'}).click();await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue('Current work to preserve.');
 await step(page,'scores');await page.getByTestId('selected-score-filter').check();await page.getByRole('combobox',{name:/^Assessment/}).selectOption('WISC-V');await page.getByRole('searchbox',{name:'Search the record'}).fill('no pending restore score');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(0);
 await page.locator('input[type=file]').setInputFiles(payload);await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();await step(page,'scores');await expect(page.getByTestId('selected-score-filter')).not.toBeChecked();await expect(page.getByRole('searchbox',{name:'Search the record'})).toHaveValue('');await expect(page.getByRole('combobox',{name:/^Assessment/})).toHaveValue('all');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue('<img src=x onerror=alert(1)> imported text');await expect(page.getByTestId('maine-sld-panel').locator('img[src=x]')).toHaveCount(0);
 await step(page,'reasoning');await expect(page.getByTestId('q8-response')).toHaveValue('yes');await expect(page.getByTestId('q9-response')).toHaveValue('general-ed');
});

test('compact worksheet tools and complete score guidance stay reachable across constrained viewports',async({page})=>{
 const layouts:any[]=[];
 for(const viewport of [{width:320,height:700},{width:390,height:844},{width:1366,height:720},{width:844,height:390}]){
  await page.setViewportSize(viewport);await open(page);await noPageOverflow(page);
  const toggle=page.getByTestId('worksheet-tools-toggle'), tools=page.getByTestId('worksheet-tools-menu');
  await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(tools).toBeHidden();
  await expect(page.getByTestId('export-reflection')).toBeHidden();
  const main=page.locator('.msld-main'), contentBox=await main.boundingBox();expect(contentBox?.height||0).toBeGreaterThan(90);
  await page.getByRole('button',{name:'Close Maine SLD Case Lab',exact:true}).scrollIntoViewIfNeeded();await expect(toggle).toBeInViewport();
  await toggle.click();await expect(tools).toBeVisible();
  for(const control of [page.getByRole('button',{name:'Copy activity link',exact:true}),page.getByTestId('export-reflection'),page.getByRole('button',{name:'Print',exact:true}),page.getByRole('button',{name:'Restore worksheet',exact:true}),page.getByTestId('reset-reflection')]){
   await control.scrollIntoViewIfNeeded();await expect(control).toBeInViewport();
  }
  await page.screenshot({path:join(REPORT,'tools-open-'+viewport.width+'x'+viewport.height+'.png'),fullPage:true});
  await page.keyboard.press('Escape');await expect(toggle).toHaveAttribute('aria-expanded','false');await expect(toggle).toBeFocused();
  await step(page,'scores');const guide=page.getByTestId('score-guidance');await expect(guide).not.toHaveAttribute('open','');
  await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);
  const closed=await guide.boundingBox();await guide.locator('summary').focus();await page.keyboard.press('Enter');await expect(guide).toHaveAttribute('open','');
  await expect(guide).toContainText('mean 100, SD 15');await expect(guide).toContainText('mean 10, SD 3');
  await expect(guide).toContainText('No score here is an eligibility cutoff.');await expect(guide).toContainText('not a required testing battery');
  const expanded=await guide.boundingBox();expect((expanded?.height||0)-(closed?.height||0)).toBeGreaterThan(40);
  await guide.locator('summary').click();await expect(guide).not.toHaveAttribute('open','');await noPageOverflow(page);
  await page.getByRole('button',{name:'Show all scores',exact:true}).scrollIntoViewIfNeeded();await expect(page.getByRole('button',{name:'Show all scores',exact:true})).toBeInViewport();
  await page.addScriptTag({path:join(ROOT,'node_modules','axe-core','axe.min.js')});
  const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-testid="maine-sld-panel"]'),{resultTypes:['violations']});return r.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.html)}));});
  layouts.push({...viewport,contentHeight:contentBox?.height,collapsedGuideHeight:closed?.height,expandedGuideHeight:expanded?.height,violations});expect(violations).toEqual([]);
  await page.screenshot({path:join(REPORT,'compact-scores-'+viewport.width+'x'+viewport.height+'.png'),fullPage:true});
 }
 await writeFile(join(REPORT,'constrained-layouts.json'),JSON.stringify(layouts,null,2));
});

test('keyboard worksheet tools close predictably and reset cancellation preserves the participant note',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page);await step(page,'scores');await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');
 const note='Keep the classroom connection while reviewing tool options.';await page.getByTestId('score-note-'+firstScore).fill(note);
 const toggle=page.getByTestId('worksheet-tools-toggle'), tools=page.getByTestId('worksheet-tools-menu');
 await toggle.focus();await page.keyboard.press('Enter');await expect(toggle).toHaveAttribute('aria-expanded','true');await expect(tools).toBeVisible();
 await page.getByRole('button',{name:'Copy activity link',exact:true}).focus();await page.keyboard.press('Tab');await expect(page.getByTestId('export-reflection')).toBeFocused();
 await page.keyboard.press('Escape');await expect(tools).toBeHidden();await expect(toggle).toBeFocused();await expect(page.getByTestId('maine-sld-panel')).toBeVisible();
 await page.keyboard.press('Enter');await page.getByTestId('reset-reflection').focus();await page.keyboard.press('Enter');
 const confirmation=page.getByRole('alertdialog');await expect(confirmation.getByRole('button',{name:'Keep current work'})).toBeFocused();
 await page.keyboard.press('Escape');await expect(confirmation).toHaveCount(0);await expect(tools).toBeVisible();await expect(page.getByTestId('reset-reflection')).toBeFocused();
 await page.keyboard.press('Escape');await expect(tools).toBeHidden();await expect(toggle).toBeFocused();await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(note);
 await toggle.click();await step(page,'reasoning');await expect(tools).toBeHidden();await expect(page.getByTestId('q8-response')).toBeVisible();await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(note);
 await page.screenshot({path:join(REPORT,'tools-keyboard-cancel-390.png'),fullPage:true});expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});

test('selected score view retains the full record and neutral response review supports revision before revealing the guide',async({page})=>{
 await page.setViewportSize({width:1366,height:720});await open(page);await step(page,'scores');
 const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8')), secondScore=data.scoreRows[1].id;
 await page.getByTestId('score-pin-'+firstScore).click();await page.getByTestId('score-pin-'+secondScore).click();
 const selected=page.getByTestId('selected-score-filter');await expect(selected).toHaveAccessibleName('Selected score findings only');await selected.check();
 await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(2);await expect(page.getByTestId('maine-sld-panel')).toContainText('Showing 2 of 52 results');
 await page.getByTestId('score-pin-'+firstScore).click();await expect(page.getByTestId('score-pin-'+secondScore)).toBeFocused();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(1);await page.getByTestId('score-pin-'+secondScore).click();await expect(selected).toBeFocused();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(0);
 await page.getByRole('button',{name:'Show all scores',exact:true}).click();await page.getByTestId('score-pin-'+firstScore).click();await page.getByTestId('score-pin-'+secondScore).click();await selected.check();
 await page.getByRole('searchbox',{name:'Search the record'}).fill('no selected score matches');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(0);
 await page.getByRole('button',{name:'Show all scores',exact:true}).click();await expect(selected).not.toBeChecked();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);
 await selected.check();await page.getByTestId('evidence-board-link').click();await expect(page.getByRole('heading',{name:'Your evidence board',exact:true})).toBeFocused();
 const note='The index needs independent classroom evidence, not a cutoff.';await page.getByTestId('score-note-'+firstScore).fill(note);await page.getByTestId('score-purpose-'+firstScore).selectOption('complicating');
 await page.getByRole('button',{name:'Remove '+data.scoreRows[1].label,exact:true}).click();await expect(page.getByRole('heading',{name:'Your evidence board',exact:true})).toBeFocused();await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(note);
 await step(page,'reasoning');await page.getByTestId('q8-response').selectOption('yes');await page.getByTestId('q8-note').fill('Triangulate the pattern with instruction and classroom performance. <b>literal response</b>');await page.getByTestId('q9-response').selectOption('more');await page.getByTestId('q9-note').fill('Need evidence about whether general education adequately meets the need.');
 await page.getByRole('textbox',{name:'What evidence could change or complete your judgment?',exact:true}).fill('Compare independent performance and explicit teaching response.');
 await step(page,'debrief');const review=page.getByTestId('participant-review');await expect(review).toBeVisible();
 await expect(page.getByTestId('review-q8')).toContainText('YES');await expect(page.getByTestId('review-q8')).toContainText('Triangulate the pattern');await expect(page.getByTestId('review-q8')).toContainText('<b>literal response</b>');await expect(page.getByTestId('review-q8').locator('b')).toHaveCount(0);await expect(page.getByTestId('review-q9')).toContainText('More evidence needed');await expect(page.getByTestId('review-q9')).toContainText('Need evidence about whether general education');
 await expect(review).toContainText('Compare independent performance');await expect(review).not.toContainText('Suggested reasoning');await expect(page.getByRole('heading',{name:/^Suggested reasoning/})).toHaveCount(0);
 await page.screenshot({path:join(REPORT,'participant-review-before-guide-1366.png'),fullPage:true});
 await page.getByTestId('edit-q9').click();await expect(page.getByTestId('q9-response')).toBeFocused();await page.getByTestId('q9-note').fill('Clarify the instructional evidence needed before deciding.');
 await step(page,'debrief');await expect(page.getByTestId('review-q9')).toContainText('Clarify the instructional evidence');await page.getByTestId('edit-gap').click();await expect(page.getByRole('textbox',{name:'What evidence could change or complete your judgment?',exact:true})).toBeFocused();
 await step(page,'scores');await page.getByRole('button',{name:'Show all scores',exact:true}).click();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);await expect(page.getByTestId('score-pin-'+firstScore)).toHaveAttribute('aria-pressed','true');
 await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(note);await expect(page.getByTestId('score-purpose-'+firstScore)).toHaveValue('complicating');
 await step(page,'debrief');await page.getByTestId('reveal-debrief').click();await expect(page.getByRole('heading',{name:/^Suggested reasoning/})).toBeVisible();await expect(page.getByTestId('review-q9')).toContainText('Clarify the instructional evidence');
 await page.getByTestId('case-select').selectOption('jordan');await step(page,'debrief');await expect(page.getByTestId('review-q8')).toContainText('Not yet recorded');await expect(page.getByTestId('review-q9')).toContainText('Not yet recorded');await expect(page.getByTestId('participant-review')).not.toContainText('Triangulate the pattern');
 await page.getByTestId('case-select').selectOption('alex');await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(note);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});

test('selected evidence remains available while navigating form questions and returning from board edits',async({page})=>{
 const evidenceScenarioStart=Date.now(), evidencePhases:any[]=[];const trackEvidencePhase=async(name:string,fn:()=>Promise<any>)=>test.step(name,async()=>{const startedAt=Date.now();try{return await fn();}finally{evidencePhases.push({name,startedAt,durationMs:Date.now()-startedAt});}});

 await page.setViewportSize({width:320,height:700});await open(page);
 const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8')), row=data.scoreRows[0], contextId='context-0';
 await step(page,'scores');await page.getByTestId('score-pin-'+row.id).click();await step(page,'case');await page.getByTestId('score-pin-'+contextId).click();await step(page,'evidence');
 const initial='Link the observed classroom task with this score. <b>literal evidence</b>';
 await page.getByTestId('score-purpose-'+row.id).selectOption('supporting');await page.getByTestId('score-note-'+row.id).fill(initial);
 await page.getByTestId('score-purpose-'+contextId).selectOption('complicating');await page.getByTestId('score-note-'+contextId).fill('The case observation needs an independent source.');
 await step(page,'reasoning');const map=page.getByTestId('form-question-map');await expect(map.locator('button')).toHaveCount(9);await map.scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'top-question-map-320.png'),fullPage:true});
 await expect(page.getByTestId('jump-q5')).toContainText('Note not yet recorded');
 await page.getByTestId('jump-q5').focus();await page.keyboard.press('Enter');await expect(page.getByTestId('q5-note')).toBeFocused();await page.getByTestId('q5-note').fill('Observed independent task performance is still needed.');await expect(page.getByTestId('jump-q5')).toContainText('Note recorded');
 await page.getByTestId('jump-q8').click();await expect(page.getByTestId('q8-response')).toBeFocused();await page.getByTestId('q8-response').selectOption('yes');await page.getByTestId('q8-note').fill('Provisional pattern; independent evidence remains necessary.');
 await page.getByTestId('jump-q9').click();await expect(page.getByTestId('q9-response')).toBeFocused();await page.getByTestId('q9-response').selectOption('more');await page.getByTestId('q9-note').fill('Check whether general education adequately meets the need.');
 await page.getByTestId('consult-evidence-q9').click();const reference=page.getByTestId('selected-evidence-reference');await expect(reference).toHaveAttribute('open','');await expect(reference.locator('summary')).toBeFocused();
 const score=page.getByTestId('reference-finding-'+row.id);await expect(score).toContainText(row.label);await expect(score).toContainText(row.test);await expect(score).toContainText(String(row.value));await expect(score).toContainText(data.scoreScales[row.scaleId].label);await expect(score).toContainText(row.comparison);await expect(score).toContainText(initial);await expect(score.locator('b')).toHaveCount(0);await expect(score).toContainText('Supports the concern');
 await expect(page.getByTestId('reference-finding-'+contextId)).toContainText('The case observation needs an independent source.');
 await noPageOverflow(page);await score.scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'selected-evidence-reference-320.png'),fullPage:true});await page.setViewportSize({width:1366,height:900});await reference.locator('summary').focus();await reference.locator('summary').scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'selected-evidence-reference-1366.png'),fullPage:true});await page.setViewportSize({width:320,height:700});
 await page.addScriptTag({path:join(ROOT,'node_modules','axe-core','axe.min.js')});
 const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-testid="maine-sld-panel"]'),{resultTypes:['violations']});return r.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.html)}));});await writeFile(join(REPORT,'axe-selected-evidence-expanded-320.json'),JSON.stringify({state:'reasoning reference expanded',width:320,violations},null,2));expect(violations).toEqual([]);
 await page.getByTestId('reference-edit-'+row.id).click();await expect(page.getByTestId('score-note-'+row.id)).toBeFocused();await expect(page.getByTestId('evidence-return')).toBeVisible();await expect(page.getByTestId('q9-note')).toHaveCount(0);await page.setViewportSize({width:1366,height:900});await page.getByTestId('evidence-return').scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'evidence-edit-return-banner-1366.png'),fullPage:true});await page.setViewportSize({width:320,height:700});
 const prompts=page.getByTestId('evidence-thinking-prompts');await expect(prompts).not.toHaveAttribute('open','');await prompts.locator('summary').focus();await page.keyboard.press('Enter');await expect(prompts).toHaveAttribute('open','');await noPageOverflow(page);
 const revised='Compare classroom independence, score overlap and teaching response.';await page.getByTestId('score-note-'+row.id).fill(revised);await page.getByTestId('return-from-evidence').click();await expect(page.getByTestId('q9-response')).toBeFocused();await expect(page.getByTestId('q9-note')).toHaveValue('Check whether general education adequately meets the need.');await expect(page.getByTestId('q5-note')).toHaveValue('Observed independent task performance is still needed.');
 await page.getByTestId('consult-evidence-q8').click();await expect(reference.locator('summary')).toBeFocused();await page.getByTestId('return-to-question').click();await expect(page.getByTestId('q8-response')).toBeFocused();
 await step(page,'debrief');await expect(page.getByRole('heading',{name:/^Suggested reasoning/})).toHaveCount(0);if(await reference.getAttribute('open')===null)await reference.locator('summary').click();await expect(reference).toHaveAttribute('open','');await expect(page.getByTestId('reference-finding-'+row.id)).toContainText(revised);
 await page.getByTestId('reference-edit-'+row.id).click();await expect(page.getByTestId('score-note-'+row.id)).toBeFocused();await page.getByTestId('return-from-evidence').click();await expect(page.getByRole('heading',{name:'A reviewed debrief',exact:true})).toBeFocused();await expect(page.getByTestId('review-q8')).toContainText('Provisional pattern');await expect(page.getByTestId('review-q9')).toContainText('Check whether general education');
 if(await reference.getAttribute('open')===null)await reference.locator('summary').click();await page.getByTestId('reference-edit-'+row.id).click();await page.getByTestId('case-select').selectOption('jordan');await step(page,'evidence');await expect(page.getByTestId('evidence-return')).toHaveCount(0);await expect(page.getByTestId('score-note-'+row.id)).toHaveCount(0);
 await page.getByTestId('case-select').selectOption('alex');await step(page,'evidence');await expect(page.getByTestId('score-note-'+row.id)).toHaveValue(revised);await expect(page.getByTestId('evidence-return')).toHaveCount(0);
 const payload=await trackEvidencePhase('Download and read evidence-return worksheet',async()=>{const pending=page.waitForEvent('download');await worksheetAction(page,page.getByTestId('export-reflection'));const downloaded=await pending,worksheetPath=join(REPORT,'deep-navigation-worksheet.json');await downloaded.saveAs(worksheetPath);const payload={name:'navigation-worksheet.json',mimeType:'application/json',buffer:await readFile(worksheetPath)};return payload;});
 await trackEvidencePhase('Cancel then confirm current-case reset',async()=>{await step(page,'reasoning');await page.getByTestId('consult-evidence-q9').click();await page.getByTestId('reference-edit-'+row.id).click();await expect(page.getByTestId('evidence-return')).toBeVisible();await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work'}).click();await expect(page.getByTestId('evidence-return')).toBeVisible();await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Reset this case',exact:true}).click();await expect(page.getByTestId('evidence-return')).toHaveCount(0);await expect(page.getByTestId('score-note-'+row.id)).toHaveCount(0);});
 await trackEvidencePhase('Restore twice while clearing evidence-return context',async()=>{await page.locator('input[type=file]').setInputFiles(payload);await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();await step(page,'reasoning');await page.getByTestId('consult-evidence-q8').click();await page.getByTestId('reference-edit-'+row.id).click();await expect(page.getByTestId('evidence-return')).toBeVisible();await page.locator('input[type=file]').setInputFiles(payload);await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();await step(page,'evidence');await expect(page.getByTestId('evidence-return')).toHaveCount(0);await expect(page.getByTestId('score-note-'+row.id)).toHaveValue(revised);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);});
 await writeFile(join(REPORT,'evidence-tail-timings.json'),JSON.stringify({scenarioStartedAt:evidenceScenarioStart,bodyCompletedAt:Date.now(),bodyDurationMs:Date.now()-evidenceScenarioStart,phases:evidencePhases},null,2));
});

test('participant premise contrast preserves blank positions and edits each case without revealing the reviewed guide',async({page})=>{
 await page.setViewportSize({width:390,height:844});await open(page,'dark');await step(page,'reasoning');
 await page.getByTestId('q8-response').selectOption('yes');await page.getByTestId('q8-note').fill('Alex pattern reasoning stays participant-owned.');await page.getByTestId('q9-response').selectOption('more');await page.getByTestId('q9-note').fill('Original premise: request general education sufficiency evidence. <em>literal note</em>');await step(page,'debrief');
 const comparison=page.getByTestId('participant-case-contrast');await expect(comparison).not.toHaveAttribute('open','');await comparison.locator('summary').focus();await page.keyboard.press('Enter');await expect(comparison).toHaveAttribute('open','');
 await expect(page.getByTestId('contrast-alex-q8')).toContainText('YES');await expect(page.getByTestId('contrast-alex-q9')).toContainText('More evidence needed');await expect(page.getByTestId('contrast-alex-q9')).toContainText('<em>literal note</em>');await expect(page.getByTestId('contrast-alex-q9').locator('em')).toHaveCount(0);
 await expect(page.getByTestId('contrast-alex-general-ed-adequate-q8')).toContainText('Not yet recorded');await expect(page.getByTestId('contrast-alex-general-ed-adequate-q9')).toContainText('Not yet recorded');await expect(page.getByRole('heading',{name:/^Suggested reasoning/})).toHaveCount(0);
 await page.getByTestId('contrast-edit-alex-general-ed-adequate-q9').click();await expect(page.getByTestId('case-select')).toHaveValue('alex-general-ed-adequate');await expect(page.getByTestId('q9-response')).toBeFocused();await expect(page.getByTestId('q8-response')).toHaveValue('');await expect(page.getByTestId('q9-response')).toHaveValue('');
 await page.getByTestId('q8-response').selectOption('yes');await page.getByTestId('q8-note').fill('Changed premise retains a separate SLD position.');await page.getByTestId('q9-response').selectOption('general-ed');await page.getByTestId('q9-note').fill('Changed premise: general education adequately meets the need.');await step(page,'debrief');await comparison.locator('summary').click();
 await expect(page.getByTestId('contrast-alex-q9')).toContainText('Original premise: request general education');await expect(page.getByTestId('contrast-alex-general-ed-adequate-q8')).toContainText('YES');await expect(page.getByTestId('contrast-alex-general-ed-adequate-q9')).toContainText('9b: general education adequate');await expect(page.getByTestId('contrast-alex-general-ed-adequate-q9')).toContainText('Changed premise: general education');await expect(page.getByTestId('reveal-debrief')).toBeVisible();
 await noPageOverflow(page);await comparison.scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'participant-case-contrast-dark-390.png'),fullPage:true});await page.setViewportSize({width:1366,height:900});await comparison.scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'participant-case-contrast-dark-1366.png'),fullPage:true});await page.setViewportSize({width:390,height:844});await page.addScriptTag({path:join(ROOT,'node_modules','axe-core','axe.min.js')});
 const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-testid="maine-sld-panel"]'),{resultTypes:['violations']});return r.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.html)}));});await writeFile(join(REPORT,'axe-participant-contrast-expanded-390-dark.json'),JSON.stringify({state:'debrief participant contrast expanded before guide',width:390,theme:'dark',violations},null,2));expect(violations).toEqual([]);
 await page.getByTestId('contrast-edit-alex-q9').click();await expect(page.getByTestId('case-select')).toHaveValue('alex');await expect(page.getByTestId('q9-response')).toBeFocused();await expect(page.getByTestId('q9-response')).toHaveValue('more');await expect(page.getByTestId('q9-note')).toHaveValue('Original premise: request general education sufficiency evidence. <em>literal note</em>');
 await page.reload();await page.evaluate(()=>(window as any).__mount('dark'));await step(page,'debrief');await comparison.locator('summary').click();await expect(page.getByTestId('contrast-alex-q9')).toContainText('Original premise: request general education');await expect(page.getByTestId('contrast-alex-general-ed-adequate-q9')).toContainText('Changed premise: general education');await expect(page.getByRole('heading',{name:/^Suggested reasoning/})).toHaveCount(0);
 await page.getByTestId('case-select').selectOption('jordan');await step(page,'debrief');await expect(page.getByTestId('participant-case-contrast')).toHaveCount(0);await expect(page.getByTestId('review-q8')).toContainText('Not yet recorded');await expect(page.getByTestId('review-q9')).toContainText('Not yet recorded');expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});

test('process-check explanations stay separate from case judgments and revise cleanly across cases',async({page})=>{
 await open(page);await step(page,'debrief');
 const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));
 const show=page.getByRole('button',{name:'Show understanding-check explanations',exact:true});
 await expect(show).toBeDisabled();
 await expect(page.getByTestId('review-q8')).toContainText('Not yet recorded');
 await expect(page.getByTestId('review-q9')).toContainText('Not yet recorded');
 for(const [index,q] of data.knowledgeCheck.entries()){
  const options=page.getByRole('radiogroup',{name:q.prompt,exact:true}).getByRole('radio');
  await expect(options).toHaveCount(q.options.length);
  await options.nth(index===0?(q.correctIndex+1)%q.options.length:q.correctIndex).check();
  if(index<data.knowledgeCheck.length-1)await expect(show).toBeDisabled();
 }
 await expect(show).toBeEnabled();await show.click();
 await expect(page.getByTestId('maine-sld-panel')).toContainText('Revisit this distinction.');
 for(const q of data.knowledgeCheck)await expect(page.getByTestId('maine-sld-panel')).toContainText(q.explanation);
 await expect(page.getByRole('heading',{name:/^Suggested reasoning/})).toHaveCount(0);
 await expect(page.getByTestId('review-q8')).toContainText('Not yet recorded');
 await expect(page.getByTestId('review-q9')).toContainText('Not yet recorded');
 const first=data.knowledgeCheck[0];await page.getByRole('radiogroup',{name:first.prompt,exact:true}).getByRole('radio').nth(first.correctIndex).check();
 await expect(page.getByTestId('maine-sld-panel')).not.toContainText('Revisit this distinction.');
 for(const q of data.knowledgeCheck)await expect(page.getByTestId('maine-sld-panel')).not.toContainText(q.explanation);
 await show.click();
 await expect(page.getByText('Your answer matches the reviewed explanation.',{exact:true})).toHaveCount(data.knowledgeCheck.length);
 await page.getByTestId('case-select').selectOption('jordan');await step(page,'debrief');
 await expect(show).toBeDisabled();
 await expect(page.getByRole('radio',{checked:true})).toHaveCount(0);
 for(const q of data.knowledgeCheck)await expect(page.getByTestId('maine-sld-panel')).not.toContainText(q.explanation);
 await page.getByTestId('case-select').selectOption('alex');await step(page,'debrief');
 await expect(page.getByText('Your answer matches the reviewed explanation.',{exact:true})).toHaveCount(data.knowledgeCheck.length);
 await page.reload();await page.evaluate(()=>(window as any).__mount('light'));await step(page,'debrief');
 for(const q of data.knowledgeCheck){
  await expect(page.getByRole('radiogroup',{name:q.prompt,exact:true}).getByRole('radio').nth(q.correctIndex)).toBeChecked();
  await expect(page.getByTestId('maine-sld-panel')).toContainText(q.explanation);
 }
 await page.screenshot({path:join(REPORT,'process-check-separate-from-judgment-1440.png'),fullPage:true});
 expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});


test('original version worksheets and tab sessions retain all three case notes while adding blank extended cases',async({page})=>{
 const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8')), original=['alex','alex-general-ed-adequate','jordan'], added=['marisol','taylor'];
 const legacyWork=Object.fromEntries(original.map(id=>[id,{findings:{'context-0':{purpose:'review',note:'Legacy '+id+' observation.'}},responses:{Q8:{answer:'more',note:'Legacy '+id+' Q8.'},Q9:{answer:'more',note:'Legacy '+id+' Q9.'}},reflections:{summary:'Legacy '+id+' summary.',family:'Legacy '+id+' family.',multilingual:'Legacy '+id+' language evidence.'},debriefRevealed:false,checkAnswers:{},checkSubmitted:false}]));
 const saved={at:Date.now(),moduleVersion:'1.0.0',state:{version:1,activeCase:'jordan',activeStep:'reasoning',byCase:legacyWork}};
 await page.goto(base+'/__host?tool=maine-sld-practice&case=alex');await page.evaluate(value=>sessionStorage.setItem('alloflow_sld_case_lab_session_v1',JSON.stringify(value)),saved);await page.evaluate(()=>(window as any).__mount('light'));await expect(page.getByTestId('maine-sld-panel')).toBeVisible();
 for(const id of [...original,...added]){await page.getByTestId('case-select').selectOption(id);await step(page,'reasoning');await expect(page.getByTestId('q8-note')).toHaveValue(original.includes(id)?'Legacy '+id+' Q8.':'');await expect(page.getByTestId('q9-note')).toHaveValue(original.includes(id)?'Legacy '+id+' Q9.':'');await expect(page.getByTestId('reflection-family')).toHaveValue(original.includes(id)?'Legacy '+id+' family.':'');}
 await expect.poll(()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('alloflow_sld_case_lab_session_v1')||'null')?.moduleVersion)).toBe(data.metadata.version);
 await page.getByTestId('case-select').selectOption('marisol');await step(page,'reasoning');await page.getByTestId('q8-note').fill('Temporary new-case work before confirming legacy restoration.');
 const transfer={format:'alloflow-maine-sld-practice',schemaVersion:1,moduleVersion:'1.0.0',activeCase:'jordan',caseWork:legacyWork};await page.locator('input[type=file]').setInputFiles({name:'original-worksheet.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(transfer))});await expect(page.getByRole('alertdialog',{name:'Restore this worksheet?'})).toBeVisible();await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();
 await expect(page.getByTestId('case-select')).toHaveValue('jordan');
 for(const id of original){await page.getByTestId('case-select').selectOption(id);await step(page,'reasoning');await expect(page.getByTestId('q9-note')).toHaveValue('Legacy '+id+' Q9.');await expect(page.getByTestId('reflection-summary')).toHaveValue('Legacy '+id+' summary.');await step(page,'evidence');await expect(page.getByTestId('score-note-context-0')).toHaveValue('Legacy '+id+' observation.');}
 for(const id of added){await page.getByTestId('case-select').selectOption(id);await step(page,'reasoning');await expect(page.getByTestId('q8-response')).toHaveValue('');await expect(page.getByTestId('q8-note')).toHaveValue('');await expect(page.getByTestId('q9-note')).toHaveValue('');await step(page,'evidence');await expect(page.locator('[data-testid^="score-note-"]')).toHaveCount(0);}
 const pending=page.waitForEvent('download');await worksheetAction(page,page.getByTestId('export-reflection'));const file=await pending,output=join(REPORT,'migrated-original-worksheet.json');await file.saveAs(output);const current=JSON.parse(await readFile(output,'utf8'));expect(current.moduleVersion).toBe('1.1.0');expect(Object.keys(current.caseWork).sort()).toEqual([...original,...added].sort());for(const id of original)expect(current.caseWork[id].responses.Q9.note).toBe('Legacy '+id+' Q9.');for(const id of added)expect(current.caseWork[id].responses.Q8.note).toBe('');expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});

test('all five cases preserve participant family and language reflections through export reset restore and print',async({page})=>{
 await open(page);const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));expect(data.cases).toHaveLength(5);
 for(const fixture of data.cases){const id=fixture.id;await page.getByTestId('case-select').selectOption(id);await page.getByTestId('score-pin-context-0').click();await step(page,'evidence');await page.getByTestId('score-note-context-0').fill('Participant '+id+' selected observation.');await step(page,'reasoning');await page.getByTestId('q8-response').selectOption('more');await page.getByTestId('q8-note').fill('Participant '+id+' Q8 reasoning.');await page.getByTestId('q9-response').selectOption('more');await page.getByTestId('q9-note').fill('Participant '+id+' Q9 reasoning.');await page.getByTestId('reflection-summary').fill('Participant '+id+' summary.');await page.getByTestId('evidence-gap').fill('Participant '+id+' evidence request.');await page.getByTestId('reflection-family').fill('Participant '+id+' family explanation. <b>literal family note</b>');await page.getByTestId('reflection-multilingual').fill('Participant '+id+' language evidence.');}
 const pending=page.waitForEvent('download');await worksheetAction(page,page.getByTestId('export-reflection'));const file=await pending,output=join(REPORT,'five-case-participant-worksheet.json');await file.saveAs(output);const transfer=JSON.parse(await readFile(output,'utf8'));expect(transfer.moduleVersion).toBe('1.1.0');expect(Object.keys(transfer.caseWork).sort()).toEqual(data.cases.map((c:any)=>c.id).sort());for(const fixture of data.cases){const w=transfer.caseWork[fixture.id];expect(w.responses.Q9.note).toBe('Participant '+fixture.id+' Q9 reasoning.');expect(w.reflections.summary).toBe('Participant '+fixture.id+' summary.');expect(w.reflections.gap).toBe('Participant '+fixture.id+' evidence request.');expect(w.reflections.family).toBe('Participant '+fixture.id+' family explanation. <b>literal family note</b>');expect(w.reflections.multilingual).toBe('Participant '+fixture.id+' language evidence.');}
 await page.getByTestId('case-select').selectOption('taylor');await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Reset this case',exact:true}).click();await step(page,'reasoning');await expect(page.getByTestId('q9-note')).toHaveValue('');await expect(page.getByTestId('reflection-family')).toHaveValue('');
 for(const fixture of data.cases.filter((c:any)=>c.id!=='taylor')){await page.getByTestId('case-select').selectOption(fixture.id);await step(page,'reasoning');await expect(page.getByTestId('q9-note')).toHaveValue('Participant '+fixture.id+' Q9 reasoning.');await expect(page.getByTestId('reflection-family')).toHaveValue('Participant '+fixture.id+' family explanation. <b>literal family note</b>');}
 await page.locator('input[type=file]').setInputFiles({name:'five-cases.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(transfer))});await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();for(const fixture of data.cases){await page.getByTestId('case-select').selectOption(fixture.id);await step(page,'reasoning');await expect(page.getByTestId('q8-note')).toHaveValue('Participant '+fixture.id+' Q8 reasoning.');await expect(page.getByTestId('reflection-family')).toHaveValue('Participant '+fixture.id+' family explanation. <b>literal family note</b>');await expect(page.getByTestId('reflection-multilingual')).toHaveValue('Participant '+fixture.id+' language evidence.');}
 await page.evaluate(()=>window.print=()=>{});await worksheetAction(page,page.getByRole('button',{name:'Print',exact:true}));const printed=page.locator('#maine-sld-print-root');await expect(printed).toHaveCount(1);for(const fixture of data.cases){await expect(printed).toContainText('Participant '+fixture.id+' summary.');await expect(printed).toContainText('Participant '+fixture.id+' family explanation. <b>literal family note</b>');await expect(printed).toContainText('Participant '+fixture.id+' language evidence.');if(fixture.debrief.summary)await expect(printed).not.toContainText(fixture.debrief.summary);}await expect(printed.locator('b')).toHaveCount(0);await expect(printed).not.toContainText('Suggested reasoning');await page.emulateMedia({media:'print'});await page.pdf({path:join(REPORT,'five-case-participant-print.pdf'),format:'Letter',printBackground:true,preferCSSPageSize:true});await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(printed).toHaveCount(0);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});

test('extended multilingual and intervention cases show their own records score cautions and hidden debrief across all steps',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8')), scans:any[]=[];
 for(const id of ['marisol','taylor']){
  await page.setViewportSize(id==='marisol'?{width:390,height:844}:{width:1366,height:900});await open(page,id==='marisol'?'light':'dark','?tool=maine-sld-practice&case='+id);await expect(page.getByTestId('case-select')).toHaveValue(id);const fixture=data.cases.find((c:any)=>c.id===id);await expect(page.getByRole('heading',{name:fixture.title,exact:true})).toBeVisible();for(const item of fixture.narrative)await expect(page.getByTestId('maine-sld-panel')).toContainText(typeof item==='string'?item:item.body||item.text);const library=page.getByTestId('case-library');await library.locator('summary').click();await expect(library.locator('[data-testid^="open-case-"]')).toHaveCount(5);await expect(page.getByTestId('open-case-'+id)).toBeDisabled();if(id==='marisol'){await library.scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'extended-case-library-390.png'),fullPage:true});await page.setViewportSize({width:1366,height:900});await library.scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'extended-case-library-1366.png'),fullPage:true});await page.setViewportSize({width:390,height:844});}await page.getByTestId('open-case-alex').click();await expect(page.getByTestId('case-select')).toHaveValue('alex');if(await library.getAttribute('open')===null)await library.locator('summary').click();await page.getByTestId('open-case-'+id).click();await expect(page.getByTestId('case-select')).toHaveValue(id);if(await library.getAttribute('open')!==null)await library.locator('summary').click();await worksheetAction(page,page.getByRole('button',{name:'Copy activity link',exact:true}));const copied=new URL(await page.evaluate(()=>navigator.clipboard.readText()));expect(copied.searchParams.get('case')).toBe(id);expect(copied.searchParams.get('tool')).toBe('maine-sld-practice');expect([...copied.searchParams.keys()].sort()).toEqual(['case','tool']);expect(copied.hash).toBe('');
  await page.addScriptTag({path:join(ROOT,'node_modules','axe-core','axe.min.js')});
  for(const stepId of ['case','scores','evidence','reasoning','debrief']){
   await step(page,stepId);await noPageOverflow(page);
   if(stepId==='scores'){await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount((fixture.scoreRowIds||[]).length+(fixture.inlineScores||fixture.extraScoreRows||[]).length);await expect(page.locator('.msld-score-guide')).not.toContainText('Alex’s comparisons are age-based');await expect(page.locator('.msld-score-guide')).not.toContainText('Age 9 years, 2 months');await page.getByTestId('score-guidance').locator('summary').click();await expect(page.getByTestId('score-guidance')).not.toContainText('WISC-V index scores and WIAT-4 scores');await expect(page.getByTestId('score-guidance')).toContainText(fixture.scoreGuidance);if(id==='marisol'){await expect(page.getByRole('heading',{name:'Score information to request',exact:true})).toBeVisible();await expect(page.getByTestId('no-score-record')).toBeVisible();await expect(page.getByRole('searchbox',{name:'Search the record'})).toHaveCount(0);await expect(page.getByTestId('selected-score-filter')).toHaveCount(0);await expect(page.locator('.msld-table-wrap')).toHaveCount(0);}else{await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(4);for(const score of fixture.extraScoreRows)await expect(page.getByTestId('score-row-'+score.id)).toContainText(String(score.value));}}
   if(stepId==='evidence')await expect(page.getByTestId('maine-sld-panel')).not.toContainText('For Alex, choose two supporting findings');
   if(stepId==='reasoning'){await expect(page.getByTestId('reflection-family')).toBeVisible();if(id==='marisol'){await expect(page.getByTestId('maine-sld-panel')).not.toContainText('Alex’s case stays English-dominant.');const plan=page.getByTestId('evidence-request-prompts');await plan.locator('summary').focus();await page.keyboard.press('Enter');await expect(plan).toHaveAttribute('open','');await expect(plan).toContainText('What information would you request?');await expect(plan).toContainText('Which person, source or record could provide it?');await expect(plan).toContainText('Which uncertainty or next decision could it clarify?');await page.getByTestId('evidence-gap').fill('Request language and instruction evidence with meaningful family communication.');await plan.scrollIntoViewIfNeeded();await page.screenshot({path:join(REPORT,'extended-marisol-expanded-evidence-request-390.png'),fullPage:true});}}
   if(stepId==='debrief'){await expect(page.getByTestId('reveal-debrief')).toBeVisible();await expect(page.getByRole('heading',{name:/^Suggested reasoning/})).toHaveCount(0);await expect(page.getByTestId('review-q8')).toContainText('Not yet recorded');await expect(page.getByTestId('participant-case-contrast')).toHaveCount(0);}
   const violations=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-testid="maine-sld-panel"]'),{resultTypes:['violations']});return r.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.html)}));});scans.push({caseId:id,step:stepId,violations});expect(violations).toEqual([]);await page.screenshot({path:join(REPORT,'extended-'+id+'-'+stepId+'.png'),fullPage:true});
  }
 }
 await writeFile(join(REPORT,'extended-case-axe.json'),JSON.stringify({scans},null,2));expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
});

const FULL_HOST_BASE=process.env.SLD_HOST_BASE_URL;
test.describe('full source application host',()=>{
 test.skip(!FULL_HOST_BASE,'Set SLD_HOST_BASE_URL to the local source app dev server.');
 test('public deep link opens the case directly and configured educator access protects Leadership return',async({page,context})=>{
  await page.addInitScript(()=>localStorage.setItem('alloflow_educator_access_code_v1','{"configured":true}'));
  await context.route(/^https:\/\/alloflow-cdn\.pages\.dev\/(?:maine_sld_practice_module|admin_hub_module)\.js(?:\?.*)?$/,async route=>{
   const name=new URL(route.request().url()).pathname.split('/').pop()!;
   await route.fulfill({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:await readFile(join(ROOT,name))});
  });
  await page.goto(FULL_HOST_BASE+'/?tool=maine-sld-practice&case=jordan',{waitUntil:'domcontentloaded'});
  await expect(page.getByTestId('maine-sld-panel')).toBeVisible({timeout:90000});
  await expect(page.getByTestId('case-select')).toHaveValue('jordan');
  await step(page,'scores');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(1);await expect(page.getByTestId('maine-sld-panel')).toContainText('78');
  await page.getByTestId('case-select').selectOption('alex');await step(page,'scores');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);
  await page.screenshot({path:join(REPORT,'actual-app-host.png'),fullPage:true});
  await page.goto(FULL_HOST_BASE+'/?tool=maine-sld-practice&case=marisol',{waitUntil:'domcontentloaded'});await expect(page.getByTestId('maine-sld-panel')).toBeVisible({timeout:90000});await expect(page.getByTestId('case-select')).toHaveValue('marisol');await step(page,'scores');await expect(page.getByRole('heading',{name:'Score information to request',exact:true})).toBeVisible();await expect(page.getByTestId('no-score-record')).toBeVisible();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(0);await page.screenshot({path:join(REPORT,'actual-app-marisol-host.png'),fullPage:true});
  await worksheetAction(page,page.getByRole('button',{name:'Leadership Hub',exact:true}));
  await expect(page.getByTestId('maine-sld-panel')).toHaveCount(0);
  await expect(page.getByRole('dialog',{name:'Leadership Hub',exact:true})).toHaveCount(0);
  await expect(page.getByRole('dialog').filter({hasText:/access code|educator access|teacher access|gate/i}).first()).toBeVisible();
  const ungated=await context.newPage();await ungated.addInitScript(()=>localStorage.removeItem('alloflow_educator_access_code_v1'));
  await ungated.goto(FULL_HOST_BASE+'/?tool=maine-sld-practice&case=alex',{waitUntil:'domcontentloaded'});await expect(ungated.getByTestId('maine-sld-panel')).toBeVisible({timeout:90000});
  await worksheetAction(ungated,ungated.getByRole('button',{name:'Leadership Hub',exact:true}));await expect(ungated.getByRole('dialog',{name:'Leadership Hub',exact:true})).toBeVisible();
  await ungated.locator('[data-hub-id="maineSldPractice"]').click();await expect(ungated.getByTestId('maine-sld-panel')).toBeVisible();await ungated.screenshot({path:join(REPORT,'actual-hub-card.png'),fullPage:true});
  await worksheetAction(ungated,ungated.getByRole('button',{name:'Leadership Hub',exact:true}));await expect(ungated.getByRole('dialog',{name:'Leadership Hub',exact:true})).toBeVisible();await ungated.close();
 });
});
