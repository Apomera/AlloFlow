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
 const pending=page.waitForEvent('download');await page.getByTestId('export-reflection').click();const file=await pending,path=join(REPORT,'browser-worksheet.json');await file.saveAs(path);const exported=JSON.parse(await readFile(path,'utf8'));expect(exported.format).toBe('alloflow-maine-sld-practice');expect(exported.caseWork.alex.findings[firstScore].note).toBe(text);
 await page.evaluate(()=>{(window as any).__printCalls=0;window.print=()=>{(window as any).__printCalls+=1;};});
 await page.getByRole('button',{name:'Print',exact:true}).click();
 const printed=page.locator('#maine-sld-print-root');await expect(printed).toHaveCount(1);await expect(printed).toContainText(text);await expect(printed.locator('img[src="x"]')).toHaveCount(0);
 const sourceData=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));
 const guideSummary=sourceData.cases.find((c:any)=>c.id==='alex').debrief.summary;
 if(guideSummary)await expect(printed).not.toContainText(guideSummary);
 await expect(printed).not.toContainText('Suggested reasoning');
 expect(await page.evaluate(()=>(window as any).__printCalls)).toBe(1);
 await page.emulateMedia({media:'print'});await expect(printed).toBeVisible();await expect(page.locator('#app')).toBeHidden();await expect(page.locator('#outside')).toBeHidden();
 await page.pdf({path:join(REPORT,'participant-print-browser.pdf'),format:'Letter',printBackground:true,preferCSSPageSize:true});
 await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(printed).toHaveCount(0);
 await page.getByTestId('reset-reflection').click();const confirmation=page.getByRole('alertdialog');await expect(confirmation.getByRole('button',{name:'Keep current work'})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(confirmation.getByRole('button',{name:'Reset this case',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(confirmation.getByRole('button',{name:'Keep current work'})).toBeFocused();await page.keyboard.press('Escape');await expect(confirmation).toHaveCount(0);await expect(page.getByTestId('reset-reflection')).toBeFocused();await page.getByTestId('reset-reflection').click();await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work'}).click();await expect(page.getByTestId('reset-reflection')).toBeFocused();await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(text);
 await page.getByTestId('reset-reflection').click();await page.getByRole('alertdialog').getByRole('button',{name:'Reset this case',exact:true}).click();await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveCount(0);
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
 await page.getByRole('button',{name:'Copy activity link',exact:true}).click();
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
 const download=page.waitForEvent('download');await page.getByTestId('export-reflection').click();const file=await download,path=join(REPORT,'import-seed.json');await file.saveAs(path);
 const transfer=JSON.parse(await readFile(path,'utf8'));transfer.caseWork.alex.findings[firstScore].note='<img src=x onerror=alert(1)> imported text';transfer.caseWork.alex.responses.Q8={answer:'yes',note:'Bounded user interpretation'};transfer.caseWork.alex.responses.Q9={answer:'general-ed',note:'The changed premise keeps these decisions separate'};
 transfer.secret='not allowed';transfer.caseWork.alex.aiVerdict='not allowed';
 const payload={name:'worksheet.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(transfer))};
 await page.locator('input[type=file]').setInputFiles(payload);await expect(page.getByRole('alertdialog',{name:'Restore this worksheet?'})).toBeVisible();await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work'}).click();await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue('Current work to preserve.');
 await page.locator('input[type=file]').setInputFiles(payload);await page.getByRole('alertdialog').getByRole('button',{name:'Restore worksheet',exact:true}).click();await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue('<img src=x onerror=alert(1)> imported text');await expect(page.getByTestId('maine-sld-panel').locator('img[src=x]')).toHaveCount(0);
 await step(page,'reasoning');await expect(page.getByTestId('q8-response')).toHaveValue('yes');await expect(page.getByTestId('q9-response')).toHaveValue('general-ed');
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
  await page.getByRole('button',{name:'Leadership Hub',exact:true}).click();
  await expect(page.getByTestId('maine-sld-panel')).toHaveCount(0);
  await expect(page.getByRole('dialog',{name:'Leadership Hub',exact:true})).toHaveCount(0);
  await expect(page.getByRole('dialog').filter({hasText:/access code|educator access|teacher access|gate/i}).first()).toBeVisible();
  const ungated=await context.newPage();await ungated.addInitScript(()=>localStorage.removeItem('alloflow_educator_access_code_v1'));
  await ungated.goto(FULL_HOST_BASE+'/?tool=maine-sld-practice&case=alex',{waitUntil:'domcontentloaded'});await expect(ungated.getByTestId('maine-sld-panel')).toBeVisible({timeout:90000});
  await ungated.getByRole('button',{name:'Leadership Hub',exact:true}).click();await expect(ungated.getByRole('dialog',{name:'Leadership Hub',exact:true})).toBeVisible();
  await ungated.locator('[data-hub-id="maineSldPractice"]').click();await expect(ungated.getByTestId('maine-sld-panel')).toBeVisible();await ungated.screenshot({path:join(REPORT,'actual-hub-card.png'),fullPage:true});
  await ungated.getByRole('button',{name:'Leadership Hub',exact:true}).click();await expect(ungated.getByRole('dialog',{name:'Leadership Hub',exact:true})).toBeVisible();await ungated.close();
 });
});
