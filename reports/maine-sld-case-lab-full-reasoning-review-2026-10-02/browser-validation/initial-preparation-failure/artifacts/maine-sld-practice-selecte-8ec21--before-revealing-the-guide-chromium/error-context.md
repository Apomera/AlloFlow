# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: maine-sld-practice.spec.ts >> selected score view retains the full record and neutral response review supports revision before revealing the guide
- Location: tests\e2e\maine-sld-practice.spec.ts:186:5

# Error details

```
"beforeAll" hook timeout of 120000ms exceeded.
```

# Test source

```ts
  1   | import { test, expect, Page } from '@playwright/test';
  2   | import { createHash } from 'node:crypto';
  3   | import { createServer, Server } from 'node:http';
  4   | import { readFile, writeFile, mkdtemp, mkdir } from 'node:fs/promises';
  5   | import { execFileSync } from 'node:child_process';
  6   | import { tmpdir } from 'node:os';
  7   | import { extname, join, resolve, sep } from 'node:path';
  8   | 
  9   | // Real working-tree Hub/card, source-host route reader, Maine panel and theme.
  10  | // Full compiled-app boot is covered separately by the integration owner.
  11  | const ROOT=process.cwd(), WEB=join(ROOT,'desktop','web-app');
  12  | const REPORT=process.env.SLD_REPORT_DIR?resolve(process.env.SLD_REPORT_DIR):join(ROOT,'reports','maine-sld-case-lab-2026-10-01');
  13  | let server:Server, base='', css='', hostReader='', firstScore='';
  14  | const mime:Record<string,string>={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json'};
  15  | const harness=()=>`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maine SLD working-tree host test</title><link rel="stylesheet" href="/__tw.css"></head><body><button id="outside">Outside dialog</button><main id="app"></main>
  16  | <script src="/desktop/web-app/node_modules/react/umd/react.production.min.js"></script><script src="/desktop/web-app/node_modules/react-dom/umd/react-dom.production.min.js"></script><script src="/app_styles_module.js"></script><script src="/admin_hub_module.js"></script><script src="/maine_sld_practice_module.js"></script>
  17  | <script>window.__errors=[];window.addEventListener('error',function(e){window.__errors.push(String(e.message));});
  18  | ${hostReader}
  19  | window.__reader=_alloReadShellDeepLinkTool;
  20  | window.__mount=function(theme){
  21  |  const e=React.createElement;
  22  |  function Host(){
  23  |   const [tool,setTool]=React.useState(function(){return window.__reader()==='maineSldPractice'?'maineSldPractice':'hub';});
  24  |   const close=React.useCallback(function(){setTool('hub');},[]);
  25  |   return e('div',{className:'min-h-screen bg-slate-50 text-slate-800 font-sans theme-'+theme},e(window.AlloModules.AppStyles.AppStyles,{}),
  26  |    tool==='hub'?e(window.AlloModules.AdminHub.AdminHubPanel,{t:function(){},onClose:function(){},addToast:function(){},openTool:function(id){if(id==='maineSldPractice')setTool(id);}}):
  27  |    e(window.AlloModules.MaineSldPractice.MaineSldPracticePanel,{isOpen:true,onClose:close,theme:theme,t:function(){},addToast:function(){},initialCaseId:new URLSearchParams(location.search).get('case')||'alex'}));
  28  |  }
  29  |  ReactDOM.createRoot(document.getElementById('app')).render(e(Host));
  30  | };</script></body></html>`;
> 31  | test.beforeAll(async()=>{
      |      ^ "beforeAll" hook timeout of 120000ms exceeded.
  32  |  const source=await readFile(join(ROOT,'AlloFlowANTI.txt'),'utf8');
  33  |  const start=source.indexOf('// __ALLO_STEM_DEEP_LINKS_BEGIN__'), fn=source.indexOf('const _alloReadShellDeepLinkTool =',start), end=source.indexOf('\n};',fn)+3;
  34  |  if(start<0||fn<0||end<fn)throw new Error('Host route reader not found');
  35  |  hostReader=source.slice(start,end);
  36  |  const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));firstScore=data.scoreRows[0].id;
  37  |  const dir=await mkdtemp(join(tmpdir(),'maine-sld-browser-')),input=join(dir,'input.css'),output=join(dir,'tailwind.css'),html=join(dir,'host.html');
  38  |  await writeFile(input,'@tailwind base;\n@tailwind components;\n@tailwind utilities;\n');await writeFile(html,harness());
  39  |  execFileSync(process.execPath,[join(WEB,'node_modules','tailwindcss','lib','cli.js'),'-i',input,'-o',output,'--content',[join(ROOT,'admin_hub_module.js'),join(ROOT,'maine_sld_practice_module.js'),html].join(',')],{cwd:WEB,stdio:'pipe'});
  40  |  css=await readFile(output,'utf8');await mkdir(REPORT,{recursive:true});
  41  |  await writeFile(join(REPORT,'browser-candidate.json'),JSON.stringify({startedAt:new Date().toISOString(),moduleSha256:createHash('sha256').update(await readFile(join(ROOT,'maine_sld_practice_module.js'))).digest('hex'),reviewDate:data.metadata.reviewDate,sourceHost:process.env.SLD_HOST_BASE_URL||null,scope:'Working-tree module and host reader; optional actual source-app boot'},null,2));
  42  |  server=createServer(async(req,res)=>{
  43  |   const url=new URL(req.url||'/','http://localhost');
  44  |   if(url.pathname==='/__host'){res.writeHead(200,{'content-type':mime['.html']});res.end(harness());return;}
  45  |   if(url.pathname==='/__tw.css'){res.writeHead(200,{'content-type':mime['.css']});res.end(css);return;}
  46  |   try{const file=resolve(ROOT,'.'+decodeURIComponent(url.pathname));if(!file.startsWith(ROOT+sep)){res.writeHead(403);res.end();return;}const body=await readFile(file);res.writeHead(200,{'content-type':mime[extname(file)]||'application/octet-stream'});res.end(body);}
  47  |   catch{res.writeHead(404);res.end();}
  48  |  });
  49  |  await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const address=server.address();base='http://127.0.0.1:'+(typeof address==='object'&&address?address.port:0);
  50  | });
  51  | test.afterAll(async()=>{if(server)await new Promise<void>(r=>server.close(()=>r()));});
  52  | async function open(page:Page,theme='light',query='?tool=maine-sld-practice&case=alex'){await page.goto(base+'/__host'+query);await page.evaluate(t=>(window as any).__mount(t),theme);await expect(page.getByTestId('maine-sld-panel')).toBeVisible();}
  53  | async function step(page:Page,id:string){await page.getByTestId('step-'+id).click();}
  54  | async function noPageOverflow(page:Page){expect(await page.evaluate(()=>document.documentElement.scrollWidth-window.innerWidth)).toBeLessThanOrEqual(1);}
  55  | async function worksheetAction(page:Page,action:any){if(!await action.isVisible())await page.getByTestId('worksheet-tools-toggle').click();await action.click();}
  56  | 
  57  | test('native Leadership card launches the panel and host reader resolves both aliases',async({page})=>{
  58  |  await page.goto(base+'/__host');await page.evaluate(()=>(window as any).__mount('light'));
  59  |  await expect(page.getByRole('dialog',{name:'Leadership Hub',exact:true})).toBeVisible();
  60  |  const card=page.locator('[data-hub-id="maineSldPractice"]');await expect(card).toHaveAccessibleName(/Maine SLD Case Lab/);await card.click();await expect(page.getByTestId('maine-sld-panel')).toBeVisible();
  61  |  const data=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));
  62  |  for(const fixture of data.cases){await page.getByTestId('case-select').selectOption(fixture.id);await step(page,'case');const taskCard=page.locator('.msld-card').filter({has:page.getByRole('heading',{name:'Your task',exact:true})});await expect(taskCard.locator('li')).toHaveCount(fixture.tasks.length);for(const task of fixture.tasks)await expect(taskCard).toContainText(task.prompt);await step(page,'debrief');await page.getByTestId('reveal-debrief').click();for(const paragraph of [fixture.debrief.summary,fixture.debrief.caution,fixture.debrief.familyExample].filter(Boolean))await expect(page.getByTestId('maine-sld-panel')).toContainText(paragraph);}
  63  |  await page.getByTestId('case-select').selectOption('alex');await step(page,'reasoning');const academicAreas=page.locator('#msld-Q1 details');await academicAreas.locator('summary').click();await expect(academicAreas.locator('li')).toHaveCount(8);for(const area of data.academicAreas)await expect(academicAreas).toContainText(area);
  64  |  const q3=data.formSteps.find((q:any)=>q.id==='Q3');await expect(page.locator('#msld-Q3 li')).toHaveCount(4);for(const part of q3.subparts)await expect(page.locator('#msld-Q3')).toContainText(part.label);
  65  |  const q4=data.formSteps.find((q:any)=>q.id==='Q4');for(const category of q4.evidenceCategories)await expect(page.locator('#msld-Q4')).toContainText(category);
  66  |  await expect(page.locator('#msld-Q7')).toContainText('Resolve concerns or obtain appropriate alternative evidence before relying on results for Q8.');
  67  |  for(const query of ['?tool=maine-sld-practice','?tool=maineSldPractice']){await open(page,'light',query);expect(await page.evaluate(()=>(window as any).__reader())).toBe('maineSldPractice');}
  68  |  await page.goto(base+'/__host?tool=unknown-case');await page.evaluate(()=>(window as any).__mount('light'));await expect(page.getByRole('dialog',{name:'Leadership Hub',exact:true})).toBeVisible();
  69  | });
  70  | test('all52 scores, evidence and Q8/Q9 work survive steps, case switches and reload',async({page})=>{
  71  |  await open(page);await step(page,'scores');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);await page.getByRole('combobox',{name:/^Assessment/}).selectOption('WISC-V');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(16);await expect(page.getByTestId('maine-sld-panel')).toContainText('Showing 16 of 52 results');await page.getByRole('searchbox',{name:'Search the record'}).fill('no matching assessment');await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(0);await expect(page.getByRole('heading',{name:'No scores match this filter.'})).toBeVisible();await page.getByRole('button',{name:'Show all scores',exact:true}).click();await expect(page.locator('[data-testid^="score-row-"]')).toHaveCount(52);await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');
  72  |  await page.getByTestId('score-purpose-'+firstScore).selectOption('supporting');await page.getByTestId('score-note-'+firstScore).fill('Connect with observed reading performance.');await step(page,'reasoning');
  73  |  await page.getByTestId('q8-response').selectOption('yes');await page.getByTestId('q9-response').selectOption('more');await page.getByTestId('case-select').selectOption('jordan');await step(page,'reasoning');await page.getByTestId('q8-response').selectOption('no');await page.getByTestId('case-select').selectOption('alex');await step(page,'reasoning');
  74  |  await expect(page.getByTestId('q8-response')).toHaveValue('yes');await expect(page.getByTestId('q9-response')).toHaveValue('more');await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(/observed reading/);
  75  |  await page.reload();await page.evaluate(()=>(window as any).__mount('light'));await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(/observed reading/);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
  76  | });
  77  | test('debrief reveals on request, participant print stays separate, and mobile reset confirms',async({page})=>{
  78  |  await page.setViewportSize({width:390,height:900});await open(page);await step(page,'scores');await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');
  79  |  const text='<img src=x onerror=alert(1)> Keep as reflection text.';await page.getByTestId('score-note-'+firstScore).fill(text);await step(page,'reasoning');await page.getByTestId('q5-note').fill('Classroom observation links slow independent reading with task demands.');await page.getByTestId('q6-note').fill('No relevant medical finding reported; verify the record.');await step(page,'debrief');await expect(page.getByTestId('reveal-debrief')).toBeVisible();await page.getByTestId('reveal-debrief').click();
  80  |  await expect(page.getByTestId('maine-sld-panel')).toContainText(/Question 8|Q8/);await expect(page.getByTestId('maine-sld-panel').locator('img[src="x"]')).toHaveCount(0);
  81  |  const fixtureData=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));const alex=fixtureData.cases.find((c:any)=>c.id==='alex');for(const calibration of alex.debrief.calibration)await expect(page.getByTestId('maine-sld-panel')).toContainText(calibration);
  82  |  for(const q of ['Q5','Q6']){const card=page.locator('.msld-card').filter({has:page.getByRole('heading',{name:new RegExp('^'+q+' ·')})});await expect(card).toContainText('Your response: Narrative recorded');}
  83  |  await expect(page.getByTestId('maine-sld-panel')).not.toContainText(/ALL_NO|ANY_YES|Q9A|Q9B/);
  84  |  await page.screenshot({path:join(REPORT,'debrief-reviewed-390.png'),fullPage:true});
  85  |  const pending=page.waitForEvent('download');await worksheetAction(page,page.getByTestId('export-reflection'));const file=await pending,path=join(REPORT,'browser-worksheet.json');await file.saveAs(path);const exported=JSON.parse(await readFile(path,'utf8'));expect(exported.format).toBe('alloflow-maine-sld-practice');expect(exported.caseWork.alex.findings[firstScore].note).toBe(text);
  86  |  await page.evaluate(()=>{(window as any).__printCalls=0;window.print=()=>{(window as any).__printCalls+=1;};});
  87  |  await worksheetAction(page,page.getByRole('button',{name:'Print',exact:true}));
  88  |  const printed=page.locator('#maine-sld-print-root');await expect(printed).toHaveCount(1);await expect(printed).toContainText(text);await expect(printed.locator('img[src="x"]')).toHaveCount(0);
  89  |  const sourceData=JSON.parse(await readFile(join(ROOT,'maine_sld_case_data.json'),'utf8'));
  90  |  const guideSummary=sourceData.cases.find((c:any)=>c.id==='alex').debrief.summary;
  91  |  if(guideSummary)await expect(printed).not.toContainText(guideSummary);
  92  |  await expect(printed).not.toContainText('Suggested reasoning');
  93  |  expect(await page.evaluate(()=>(window as any).__printCalls)).toBe(1);
  94  |  await page.emulateMedia({media:'print'});await expect(printed).toBeVisible();await expect(page.locator('#app')).toBeHidden();await expect(page.locator('#outside')).toBeHidden();
  95  |  await page.pdf({path:join(REPORT,'participant-print-browser.pdf'),format:'Letter',printBackground:true,preferCSSPageSize:true});
  96  |  await page.emulateMedia({media:'screen'});await page.evaluate(()=>window.dispatchEvent(new Event('afterprint')));await expect(printed).toHaveCount(0);
  97  |  await worksheetAction(page,page.getByTestId('reset-reflection'));const confirmation=page.getByRole('alertdialog');await expect(confirmation.getByRole('button',{name:'Keep current work'})).toBeFocused();await page.keyboard.press('Shift+Tab');await expect(confirmation.getByRole('button',{name:'Reset this case',exact:true})).toBeFocused();await page.keyboard.press('Tab');await expect(confirmation.getByRole('button',{name:'Keep current work'})).toBeFocused();await page.keyboard.press('Escape');await expect(confirmation).toHaveCount(0);await expect(page.getByTestId('reset-reflection')).toBeFocused();await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Keep current work'}).click();await expect(page.getByTestId('reset-reflection')).toBeFocused();await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(text);
  98  |  await worksheetAction(page,page.getByTestId('reset-reflection'));await page.getByRole('alertdialog').getByRole('button',{name:'Reset this case',exact:true}).click();await step(page,'evidence');await expect(page.getByTestId('score-note-'+firstScore)).toHaveCount(0);
  99  | });
  100 | for(const width of [1440,390])for(const theme of ['light','dark','contrast'])test('keyboard layout and axe '+width+'px '+theme,async({page})=>{
  101 |  await page.setViewportSize({width,height:900});await open(page,theme);await page.addScriptTag({path:join(ROOT,'node_modules','axe-core','axe.min.js')});const failures:any[]=[], scans:any[]=[];
  102 |  for(const id of ['case','scores','evidence','reasoning','debrief']){const button=page.getByTestId('step-'+id);await button.focus();await page.keyboard.press('Enter');await noPageOverflow(page);
  103 |   const result=await page.evaluate(async()=>{const r=await (window as any).axe.run(document.querySelector('[data-testid="maine-sld-panel"]'),{resultTypes:['violations']});return r.violations.map((v:any)=>({id:v.id,impact:v.impact,nodes:v.nodes.map((n:any)=>n.html)}));});scans.push({step:id,violations:result});result.forEach((v:any)=>failures.push({step:id,...v}));await page.screenshot({path:join(REPORT,id+'-'+width+'-'+theme+'.png'),fullPage:true});
  104 |  }
  105 |  await writeFile(join(REPORT,'axe-'+width+'-'+theme+'.json'),JSON.stringify({width,theme,steps:5,scans,failures},null,2));expect(failures).toEqual([]);
  106 |  await page.locator('#outside').focus();await page.keyboard.press('Tab');expect(await page.evaluate(()=>!!document.activeElement?.closest('[data-testid="maine-sld-panel"]'))).toBe(true);expect(await page.evaluate(()=>(window as any).__errors)).toEqual([]);
  107 | });
  108 | test('unavailable session storage leaves work usable',async({page})=>{
  109 |  await page.addInitScript(()=>{const native=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key==='alloflow_sld_case_lab_session_v1')throw new DOMException('Unavailable','QuotaExceededError');return native.call(this,key,value);};});
  110 |  await open(page);await step(page,'scores');await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');await page.getByTestId('score-note-'+firstScore).fill('Work remains usable with storage blocked.');await expect(page.getByTestId('score-note-'+firstScore)).toHaveValue(/usable/);await expect(page.getByTestId('maine-sld-panel')).toContainText(/could not|unavailable|download|session/i);
  111 | });
  112 | 
  113 | test('case-specific share links contain no worksheet data and direct entry selects that case',async({page,context})=>{
  114 |  await context.grantPermissions(['clipboard-read','clipboard-write']);
  115 |  await open(page);
  116 |  await page.getByTestId('case-select').selectOption('jordan');
  117 |  await worksheetAction(page,page.getByRole('button',{name:'Copy activity link',exact:true}));
  118 |  const link=await page.evaluate(()=>navigator.clipboard.readText()), url=new URL(link);
  119 |  expect(url.searchParams.get('tool')).toBe('maine-sld-practice');
  120 |  expect(url.searchParams.get('case')).toBe('jordan');
  121 |  expect([...url.searchParams.keys()].sort()).toEqual(['case','tool']);
  122 |  expect(url.hash).toBe('');
  123 |  await open(page,'light','?tool=maine-sld-practice&case=jordan');
  124 |  await expect(page.getByTestId('case-select')).toHaveValue('jordan');
  125 | });
  126 | 
  127 | test('imported HTML stays text and restoring replaces work only after participant confirmation',async({page})=>{
  128 |  await open(page);await step(page,'scores');await page.getByTestId('score-pin-'+firstScore).click();await step(page,'evidence');
  129 |  await page.getByTestId('score-note-'+firstScore).fill('Current work to preserve.');
  130 |  const download=page.waitForEvent('download');await worksheetAction(page,page.getByTestId('export-reflection'));const file=await download,path=join(REPORT,'import-seed.json');await file.saveAs(path);
  131 |  const transfer=JSON.parse(await readFile(path,'utf8'));transfer.caseWork.alex.findings[firstScore].note='<img src=x onerror=alert(1)> imported text';transfer.caseWork.alex.responses.Q8={answer:'yes',note:'Bounded user interpretation'};transfer.caseWork.alex.responses.Q9={answer:'general-ed',note:'The changed premise keeps these decisions separate'};
```