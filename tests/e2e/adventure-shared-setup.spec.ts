import { test, expect } from '@playwright/test';
import path from 'node:path';
const local = (file: string) => path.resolve(__dirname, '../..', file);

async function mount(page: any, surface = 'launch', teacher = false, permissions: any = {}, mode = 'choice', theme = 'light', config: any = {}) {
  // Fresh document prevents cached view bundles from retaining a previous React instance.
  await page.goto('about:blank');
  await page.setContent('<!doctype html><html lang="en"><head><title>Adventure shared setup</title></head><body><main id="root" style="max-width:780px;margin:auto"></main></body></html>');
  for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: local('desktop/web-app/node_modules/' + file) });
  for (const file of ['view_adventure_module.js','view_sidebar_panels_module.js','desktop/web-app/public/vendor/axe-core/axe.min.js']) await page.addScriptTag({ path: local(file) });
  await page.evaluate(({ surface, teacher, permissions, mode, theme, config }) => {
    const w=window as any, R=w.React;
    function Fixture() {
      const [project,setProject]=R.useState({adventureUnlockXP:0,allowFreeResponse:config.allowFreeResponse ?? true,adventurePermissions:permissions});
      const [teacherMode,setTeacherMode]=R.useState(teacher);
      w.__setTeacherMode=setTeacherMode;
      const [processing,setProcessing]=R.useState(false);
      w.__setProcessing=setProcessing;
      const [mountVersion,setMountVersion]=R.useState(0);
      w.__remountSetup=()=>setMountVersion((version:number)=>version+1);
      const [state,setState]=R.useState({currentScene:null,history:[],episodeTurnLimit:12,choiceCount:4,enableAutoClimax:true,systemResources:[{name:'Budget',quantity:900,unit:'credits'}],climax:{isActive:false},...config.state});
      const [settings,setSettings]=R.useState({adventureInputMode:mode,adventureDifficulty:'Normal',adventureLanguageMode:config.language || 'English',adventureFreeResponseEnabled:false,adventureChanceMode:false,isAdventureStoryMode:true,isSocialStoryMode:mode==='social',socialStoryFocus:'Sharing',enableFactionResources:mode==='system',factionResourceMode:'manual',adventureArtStyle:'auto',adventureCustomArtStyle:'',universalImageStyle:'',adventureConsistentCharacters:false,useLowQualityVisuals:false,adventureCustomInstructions:'',adventureFluencyEnabled:false,adventureTypingPaceEnabled:false,isAdventureCloudEnabled:false,adventureProtagonistAge:'auto',...config.settings});
      const props:any={theme,...settings,isProcessing:processing,adventureState:state,setAdventureState:setState,isTeacherMode:teacherMode,studentProjectSettings:project,setStudentProjectSettings:setProject,t:(key:string)=>key,selectedLanguages:config.languages ?? ['Spanish'],openUniversalSettings:(target:string)=>{w.__languageTarget=target;},expandedTools:['adventure'],globalPoints:100,hasSourceOrAnalysis:true,handleStartAdventure:()=>{},safeSetItem:()=>{}};
      for(const key of Object.keys(settings))props['set'+key[0].toUpperCase()+key.slice(1)]=(value:any)=>setSettings((previous:any)=>({...previous,[key]:value}));
      w.__setup={...settings,state,project};
      if(config.both)return R.createElement(R.Fragment,{key:mountVersion},
        R.createElement('section',{'aria-label':'Launch controls'},R.createElement(w.AlloModules.AdventureSetupFields,{...props,idPrefix:'launch'})),
        R.createElement('section',{'aria-label':'Sidebar controls'},R.createElement(w.AlloModules.AdventurePanel,props)));
      return R.createElement(surface==='sidebar'?w.AlloModules.AdventurePanel:w.AlloModules.AdventureSetupFields,props);
    }
    w.ReactDOM.createRoot(document.querySelector('#root')).render(R.createElement(Fixture));
  },{surface,teacher,permissions,mode,theme,config});
}

for (const surface of ['launch','sidebar']) {
  test(surface+' makes open-ended visible and preserves custom length and finale choices',async({page})=>{
    await mount(page,surface,true,{},'choice','light',{state:{episodeTurnLimit:17}});
    const open=page.getByRole('radio',{name:'Open-ended',exact:true});
    await expect(open).toBeVisible();
    await page.getByRole('radio',{name:'Set-length episode',exact:true}).focus();
    await page.keyboard.press('ArrowRight');
    await expect(open).toBeChecked();
    await expect(page.getByLabel('Episode length',{exact:true})).toHaveCount(0);
    await expect(page.getByText(/No fixed decision limit/)).toBeVisible();
    await page.getByRole('checkbox',{name:'Include a final challenge',exact:true}).uncheck();
    expect(await page.evaluate(()=>(window as any).__setup.state)).toMatchObject({episodeTurnLimit:null,enableAutoClimax:false,choiceCount:4});
    await page.getByRole('radio',{name:'Set-length episode',exact:true}).check();
    await expect(page.getByLabel('Episode length',{exact:true})).toHaveValue('custom');
    await expect(page.getByLabel('Custom decision count',{exact:true})).toHaveValue('17');
    expect(await page.evaluate(()=>(window as any).__setup.state.enableAutoClimax)).toBe(false);
  });
  test(surface+' simplifies English-only setup and retains saved non-English selections',async({page})=>{
    await mount(page,surface,true,{},'choice','light',{languages:[]});
    await expect(page.getByLabel('Adventure language',{exact:true})).toHaveCount(0);
    await expect(page.getByRole('region',{name:'Setup summary'})).toContainText('English');
    await page.getByRole('button',{name:'Add languages in Universal Settings',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).__languageTarget)).toBe('languages');
    await mount(page,surface,false,{allowLanguageSwitch:true},'choice','light',{languages:[],language:'French'});
    await expect(page.getByLabel('Adventure language',{exact:true})).toHaveValue('French');
    await expect(page.getByRole('button',{name:'Add languages in Universal Settings',exact:true})).toHaveCount(0);
    await mount(page,surface,false,{},'choice','light',{languages:['English']});
    await expect(page.getByLabel('Adventure language',{exact:true})).toHaveCount(0);
    await expect(page.getByRole('region',{name:'Setup summary'})).toContainText('English');
  });
  test(surface+' retains allowed student edits and enforces each permission', async ({page})=>{
    await mount(page,surface,false,{allowLanguageSwitch:true,allowModeSwitch:false,allowDifficultySwitch:false,allowCustomInstructions:false,allowVisualsToggle:false,allowCloudImageStorage:true});
    await expect(page.getByLabel('Interaction mode',{exact:true})).toBeDisabled();
    await page.getByLabel('Adventure language',{exact:true}).selectOption('Spanish');
    expect(await page.evaluate(()=>(window as any).__setup.adventureLanguageMode)).toBe('Spanish');
    await page.getByLabel('Student responses',{exact:true}).selectOption('written');
    await expect(page.getByLabel('Choices per decision',{exact:true})).toHaveCount(0);
    await page.getByText('Story & game rules',{exact:true}).click();
    await expect(page.getByLabel('Energy & rewards',{exact:true})).toBeDisabled();
    await page.getByText('Visuals',{exact:true}).click();
    await expect(page.getByLabel('Art style',{exact:true})).toBeDisabled();
    await page.getByText('Saving & permissions',{exact:true}).click();
    await page.getByRole('checkbox',{name:/Cloud image storage/}).check();
    expect(await page.evaluate(()=>(window as any).__setup.isAdventureCloudEnabled)).toBe(true);
  });

  test(surface+' locks every student configuration control including cloud storage',async({page})=>{
    await mount(page,surface,false,{lockAllSettings:true,allowModeSwitch:true,allowLanguageSwitch:true,allowCloudImageStorage:true},'system');
    await page.locator('details').evaluateAll((nodes:any[])=>nodes.forEach(n=>n.open=true));
    for(const control of await page.locator('[data-adventure-settings] input, [data-adventure-settings] select, [data-adventure-settings] textarea, [data-adventure-settings] button').all()) await expect(control).toBeDisabled();
    await expect(page.getByRole('checkbox',{name:/Cloud image storage/})).toBeDisabled();
    await expect(page.getByText(/Your teacher has fixed this setup/)).toBeVisible();
  });

  test(surface+' exposes social focus, manual resources and relevant pacing',async({page})=>{
    await mount(page,surface,true,{},'social');
    await page.getByLabel('Social skill to practise',{exact:true}).fill('Resolving disagreements');
    expect(await page.evaluate(()=>(window as any).__setup.socialStoryFocus)).toBe('Resolving disagreements');
    await page.getByLabel('Interaction mode',{exact:true}).selectOption('system');
    await page.getByRole('checkbox',{name:/Track resources/}).check();
    await expect(page.getByLabel('Resource name 1',{exact:true})).toHaveValue('Budget');
    await page.getByLabel('Starting value 1',{exact:true}).fill('1200');
    await page.getByRole('radio',{name:'Open-ended',exact:true}).check();
    await expect(page.getByLabel('Earliest finale round (open-ended)',{exact:true})).toBeVisible();
    await page.getByRole('checkbox',{name:'Include a final challenge'}).uncheck();
    await expect(page.getByLabel('Earliest finale round (open-ended)',{exact:true})).toHaveCount(0);
    expect(await page.evaluate(()=>(window as any).__setup.state.systemResources[0])).toMatchObject({name:'Budget',quantity:1200,unit:'credits'});
  });
}

for(const theme of ['light','dark','contrast'])test('shared controls reflow with meaningful names in '+theme,async({page},info)=>{
  await page.setViewportSize({width:375,height:900});
  await mount(page,'launch',true,{},'system',theme);
  await page.locator('details').evaluateAll((nodes:any[])=>nodes.forEach(n=>n.open=true));
  for(const width of [375,1200]){
    await page.setViewportSize({width,height:900});
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.evaluate(async()=> (await (window as any).axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag22aa']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})))).toEqual([]);
    await page.screenshot({path:info.outputPath('shared-'+theme+'-'+width+'.png'),fullPage:true});
  }
});


for (const surface of ['launch', 'sidebar']) {
  test(surface + ' explains debate setup and accepts decimal resource values', async ({ page }) => {
    await mount(page, surface, true, {}, 'debate');
    await expect(page.getByText(/Choose a position first/)).toBeVisible();
    await page.getByLabel('Interaction mode', { exact: true }).selectOption('system');
    await page.getByRole('checkbox', { name: /Track resources/ }).check();
    await page.getByLabel('Starting value 1', { exact: true }).fill('1200.5');
    expect(await page.getByLabel('Starting value 1', { exact: true }).evaluate((node: HTMLInputElement) => node.validity.stepMismatch)).toBe(false);
    expect(await page.evaluate(() => (window as any).__setup.state.systemResources[0].quantity)).toBe(1200.5);
    await page.getByLabel('Unit 1', { exact: true }).fill('%');
    await page.getByLabel('Starting value 1', { exact: true }).fill('150');
    await expect(page.getByLabel('Starting value 1', { exact: true })).toHaveValue('100');
  });
}

for (const surface of ['launch', 'sidebar']) {
  test(surface + ' edits custom lengths without storing invalid or empty drafts', async ({page}) => {
    await mount(page,surface,true);
    await page.getByLabel('Episode length',{exact:true}).selectOption('custom');
    const count=page.getByLabel('Custom decision count',{exact:true});
    await count.fill('27');
    await expect(page.getByRole('region',{name:'Setup summary'})).toContainText('27 decisions');
    await count.fill('');
    expect(await page.evaluate(()=>(window as any).__setup.state.episodeTurnLimit)).toBe(27);
    await count.press('Tab');
    await expect(count).toHaveValue('27');
    await count.fill('80');
    await count.press('Tab');
    await expect(count).toHaveValue('50');
    await count.fill('2');
    await count.press('Tab');
    await expect(count).toHaveValue('3');
    await count.fill('15.5');
    await count.press('Tab');
    await expect(count).toHaveValue('16');
    await page.getByRole('radio',{name:'Open-ended',exact:true}).check();
    await expect(count).toHaveCount(0);
    await page.getByRole('radio',{name:'Set-length episode',exact:true}).check();
    await expect(count).toHaveValue('16');
    await page.getByLabel('Episode length',{exact:true}).selectOption('20');
    await expect(count).toHaveCount(0);
    expect(await page.evaluate(()=>(window as any).__setup.state)).toMatchObject({episodeTurnLimit:20,choiceCount:4,enableAutoClimax:true});
  });
  test(surface + ' configures student permissions and retains them through a full lock', async ({page},info) => {
    await mount(page,surface,true);
    await page.getByText('Saving & permissions',{exact:true}).click();
    const group=page.getByRole('group',{name:'Student editing',exact:true});
    await expect(group.getByRole('checkbox',{name:'Change visual settings',exact:true})).toBeChecked();
    for(const name of ['Change interaction mode','Change adventure language','Change energy & rewards','Edit story guidance']){
      await expect(group.getByRole('checkbox',{name,exact:true})).not.toBeChecked();
      await group.getByRole('checkbox',{name,exact:true}).check();
    }
    await group.getByRole('checkbox',{name:'Change visual settings',exact:true}).uncheck();
    await group.getByRole('checkbox',{name:'Lock student settings',exact:true}).check();
    await expect(group.getByRole('checkbox',{name:'Change adventure language',exact:true})).toBeDisabled();
    await expect(group.getByText(/Your selections are kept while locked/)).toBeVisible();
    await group.getByRole('checkbox',{name:'Lock student settings',exact:true}).uncheck();
    await expect(group.getByRole('checkbox',{name:'Change adventure language',exact:true})).toBeChecked();
    await page.screenshot({path:info.outputPath(surface+'-permissions.png'),fullPage:true});
    await group.screenshot({path:info.outputPath(surface+'-permissions-detail.png')});
    await page.evaluate(()=>(window as any).__setTeacherMode(false));
    await expect(group).toHaveCount(0);
    await expect(page.getByLabel('Interaction mode',{exact:true})).toBeEnabled();
    await expect(page.getByLabel('Adventure language',{exact:true})).toBeEnabled();
    await page.getByText('Story & game rules',{exact:true}).click();
    await expect(page.getByLabel('Energy & rewards',{exact:true})).toBeEnabled();
    await page.getByText('Visuals',{exact:true}).click();
    await expect(page.getByLabel('Art style',{exact:true})).toBeDisabled();
    await page.getByText('Story guidance',{exact:true}).click();
    await expect(page.getByLabel('Custom instructions',{exact:true})).toBeEnabled();
    expect(await page.evaluate(()=>(window as any).__setup.project.allowFreeResponse)).toBe(true);
  });
}

for (const surface of ['launch', 'sidebar']) {
  test(surface+' explains empty and duplicate resources and keeps language management available',async({page},info)=>{
    await page.setViewportSize({width:375,height:900});
    await mount(page,surface,true,{},'system','light',{state:{systemResources:[]}});
    await expect(page.getByText(/No resources yet/)).toBeVisible();
    await page.getByRole('button',{name:'Manage languages in Universal Settings',exact:true}).click();
    expect(await page.evaluate(()=>(window as any).__languageTarget)).toBe('languages');
    await page.getByRole('button',{name:'Add resource',exact:true}).click();
    const first=page.getByLabel('Resource name 1',{exact:true});
    await expect(first).toHaveAttribute('aria-invalid','true');
    await expect(first).toHaveAccessibleDescription(/Unnamed rows are skipped/);
    await first.fill('Budget');
    await expect(first).not.toHaveAttribute('aria-invalid','true');
    await page.getByRole('button',{name:'Add resource',exact:true}).click();
    const second=page.getByLabel('Resource name 2',{exact:true});
    await second.fill(' budget ');
    await expect(second).toHaveAccessibleDescription(/only the first entry is used/);
    await page.locator('.as-box').screenshot({path:info.outputPath(surface+'-resource-feedback.png')});
    await second.fill('Water');
    await expect(second).not.toHaveAttribute('aria-invalid','true');
    await expect(page.getByText(/This name is already used above/)).toHaveCount(0);
    await page.getByRole('button',{name:'Remove resource 1',exact:true}).click();
    await expect(page.getByLabel('Resource name 1',{exact:true})).toHaveValue('Water');
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
  test(surface+' explains the resource cap without discarding saved rows',async({page})=>{
    const rows=Array.from({length:25},(_,i)=>({name:'Resource '+(i+1),quantity:50,unit:'%'}));
    await mount(page,surface,true,{},'system','light',{state:{systemResources:rows}});
    await expect(page.getByRole('button',{name:'Add resource',exact:true})).toBeDisabled();
    await expect(page.getByLabel('Resource name 25',{exact:true})).toHaveAccessibleDescription(/Only the first 24 resources are used/);
    expect(await page.evaluate(()=>(window as any).__setup.state.systemResources.length)).toBe(25);
    await page.getByRole('button',{name:'Remove resource 1',exact:true}).click();
    await expect(page.getByLabel('Resource name 24',{exact:true})).toHaveValue('Resource 25');
    await expect(page.getByLabel('Resource name 24',{exact:true})).not.toHaveAttribute('aria-invalid','true');
    await page.getByRole('button',{name:'Remove resource 1',exact:true}).click();
    await expect(page.getByRole('button',{name:'Add resource',exact:true})).toBeEnabled();
  });
}

for (const surface of ['launch', 'sidebar']) {
  test(surface+' restores removed resources without reverting later edits and maintains keyboard focus',async({page},info)=>{
    await mount(page,surface,true,{},'system','light',{state:{systemResources:[{id:'budget',name:'Budget',quantity:900,unit:'credits',min:10,type:'currency',icon:'B'},{name:'Water',quantity:50,unit:'litres'}]}});
    await page.getByRole('button',{name:'Remove resource 1',exact:true}).click();
    await expect(page.getByLabel('Resource name 1',{exact:true})).toBeFocused();
    await expect(page.getByRole('status')).toContainText('Removed resource: Budget');
    await page.getByLabel('Starting value 1',{exact:true}).fill('75');
    await page.evaluate(()=>(window as any).__setProcessing(true));
    await expect(page.getByRole('button',{name:'Undo resource removal',exact:true})).toBeDisabled();
    await page.evaluate(()=>(window as any).__setProcessing(false));
    await page.getByRole('button',{name:'Undo resource removal',exact:true}).click();
    await expect(page.getByLabel('Resource name 1',{exact:true})).toBeFocused();
    expect(await page.evaluate(()=>(window as any).__setup.state.systemResources)).toEqual([{id:'budget',name:'Budget',quantity:900,unit:'credits',min:10,type:'currency',icon:'B'},{name:'Water',quantity:75,unit:'litres'}]);
    await expect(page.getByRole('status')).toContainText('Restored resource: Budget');
    await expect(page.getByRole('button',{name:'Undo resource removal',exact:true})).toHaveCount(0);
    await page.getByRole('button',{name:'Add resource',exact:true}).click();
    await expect(page.getByLabel('Resource name 3',{exact:true})).toBeFocused();
    await page.getByLabel('Resource name 3',{exact:true}).fill('Trust');
    await page.getByRole('button',{name:'Remove resource 3',exact:true}).click();
    await expect(page.getByLabel('Resource name 2',{exact:true})).toBeFocused();
    await page.setViewportSize({width:375,height:900});
    await page.locator('.as-resource-actions').screenshot({path:info.outputPath(surface+'-undo-mobile.png')});
    await page.getByRole('button',{name:'Remove resource 2',exact:true}).click();
    await page.getByRole('button',{name:'Remove resource 1',exact:true}).click();
    await expect(page.getByRole('button',{name:'Add resource',exact:true})).toBeFocused();
    await page.getByRole('button',{name:'Undo resource removal',exact:true}).click();
    await expect(page.getByLabel('Resource name 1',{exact:true})).toBeFocused();
    await expect(page.getByLabel('Resource name 1',{exact:true})).toHaveValue('Budget');
  });
  test(surface+' keeps visual choices visible in the collapsed summary',async({page})=>{
    await mount(page,surface,true);
    const section=page.locator('details').filter({has:page.getByText('Visuals',{exact:true})});
    await page.getByText('Visuals',{exact:true}).click();
    await page.getByLabel('Art style',{exact:true}).selectOption('pixel');
    await page.getByLabel('Protagonist age',{exact:true}).selectOption('older-adult');
    await page.getByRole('checkbox',{name:/Consistent characters/}).check();
    await page.getByRole('checkbox',{name:/Faster, simpler visuals/}).check();
    await page.getByText('Visuals',{exact:true}).click();
    await expect(section.locator('summary')).toContainText('Art style: pixel');
    await expect(section.locator('summary')).toContainText('Protagonist age: Older adult');
    await expect(section.locator('summary')).toContainText('Consistent characters');
    await expect(section.locator('summary')).toContainText('Faster, simpler visuals');
    await expect(page.getByLabel('Art style',{exact:true})).not.toBeVisible();
  });
}

for(const surface of ['launch','sidebar'])test(surface+' lets users type finale counts without premature clamping',async({page})=>{
  await mount(page,surface,true,{},'choice','light',{state:{episodeTurnLimit:null,climaxMinTurns:20}});
  const count=page.getByLabel('Earliest finale round (open-ended)',{exact:true});
  await count.fill('');
  expect(await page.evaluate(()=>(window as any).__setup.state.climaxMinTurns)).toBe(20);
  await count.pressSequentially('12');
  await expect(count).toHaveValue('12');
  expect(await page.evaluate(()=>(window as any).__setup.state.climaxMinTurns)).toBe(12);
  await count.fill('');
  await count.press('Tab');
  await expect(count).toHaveValue('12');
  await count.fill('0');
  await expect(count).toHaveAttribute('aria-invalid','true');
  await count.press('Tab');
  await expect(count).toHaveValue('3');
  await count.fill('99');
  await count.press('Tab');
  await expect(count).toHaveValue('50');
  await count.fill('15.5');
  await count.press('Tab');
  await expect(count).toHaveValue('16');
  await page.evaluate(()=>(window as any).__setProcessing(true));
  await expect(count).toBeDisabled();
});

test('both setup panels share custom length and remember it across open-ended remounts',async({page})=>{
  await mount(page,'launch',true,{},'choice','light',{both:true});
  const launch=page.getByRole('region',{name:'Launch controls',exact:true});
  const sidebar=page.getByRole('region',{name:'Sidebar controls',exact:true});
  await launch.getByLabel('Episode length',{exact:true}).selectOption('custom');
  await launch.getByLabel('Custom decision count',{exact:true}).fill('27');
  await expect(sidebar.getByLabel('Episode length',{exact:true})).toHaveValue('custom');
  await expect(sidebar.getByLabel('Custom decision count',{exact:true})).toHaveValue('27');
  await sidebar.getByRole('radio',{name:'Open-ended',exact:true}).check();
  await expect(launch.getByRole('radio',{name:'Open-ended',exact:true})).toBeChecked();
  await page.evaluate(()=>(window as any).__remountSetup());
  await launch.getByRole('radio',{name:'Set-length episode',exact:true}).check();
  await expect(sidebar.getByLabel('Custom decision count',{exact:true})).toHaveValue('27');
  await sidebar.getByLabel('Episode length',{exact:true}).selectOption('20');
  await expect(launch.getByLabel('Episode length',{exact:true})).toHaveValue('20');
  await expect(launch.getByLabel('Custom decision count',{exact:true})).toHaveCount(0);
  await launch.getByRole('radio',{name:'Open-ended',exact:true}).check();
  await page.evaluate(()=>(window as any).__remountSetup());
  await sidebar.getByRole('radio',{name:'Set-length episode',exact:true}).check();
  await expect(launch.getByLabel('Episode length',{exact:true})).toHaveValue('20');
  expect(await page.evaluate(()=>(window as any).__setup.state)).toMatchObject({episodeTurnLimit:20,choiceCount:4,enableAutoClimax:true});
});

for(const surface of ['launch','sidebar']){
  test(surface+' explains teacher-fixed fields and applies visual permission to all visual controls',async({page},info)=>{
    await page.setViewportSize({width:375,height:900});
    await mount(page,surface,false,{allowModeSwitch:false,allowLanguageSwitch:true,allowDifficultySwitch:false,allowCustomInstructions:false,allowVisualsToggle:false},'choice','light',{allowFreeResponse:false,settings:{adventureArtStyle:'custom',adventureCustomArtStyle:'Watercolour'}});
    await expect(page.getByLabel('Interaction mode',{exact:true})).toHaveAccessibleDescription(/Set by your teacher/);
    await expect(page.getByLabel('Adventure language',{exact:true})).not.toHaveAccessibleDescription(/Set by your teacher/);
    await expect(page.getByLabel('Adventure language',{exact:true})).toBeEnabled();
    await expect(page.getByLabel('Student responses',{exact:true})).toBeDisabled();
    await expect(page.getByLabel('Student responses',{exact:true})).toHaveAccessibleDescription(/Set by your teacher/);
    await page.getByText('Visuals',{exact:true}).click();
    for(const name of ['Art style','Protagonist age','Custom art style','Consistent characters','Faster, simpler visuals']){
      const control=page.getByLabel(name,{exact:true});
      await expect(control).toBeDisabled();
      await expect(control).toHaveAccessibleDescription(/Set by your teacher/);
    }
    await page.getByText('Story guidance',{exact:true}).click();
    await expect(page.getByLabel('Custom instructions',{exact:true})).toHaveAccessibleDescription(/Set by your teacher/);
    await page.getByText('Story & game rules',{exact:true}).click();
    await expect(page.getByLabel('Energy & rewards',{exact:true})).toHaveAccessibleDescription(/Set by your teacher/);
    await expect(page.getByRole('radio',{name:'Open-ended',exact:true})).toBeEnabled();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    expect(await page.evaluate(async()=> (await (window as any).axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag22aa']}})).violations.map((v:any)=>v.id))).toEqual([]);
    await page.locator('details').filter({has:page.getByText('Visuals',{exact:true})}).screenshot({path:info.outputPath(surface+'-teacher-fixed-visuals.png')});
  });
  test(surface+' distinguishes temporary busy settings from teacher restrictions',async({page})=>{
    await mount(page,surface,false,{allowModeSwitch:true,allowLanguageSwitch:true,allowDifficultySwitch:true,allowCustomInstructions:true,allowVisualsToggle:true});
    await page.evaluate(()=>(window as any).__setProcessing(true));
    await expect(page.getByRole('status')).toHaveText('The adventure is updating. Editing is temporarily paused.');
    await expect(page.getByLabel('Interaction mode',{exact:true})).toBeDisabled();
    await expect(page.getByText('Set by your teacher.',{exact:true})).toHaveCount(0);
    await page.evaluate(()=>(window as any).__setProcessing(false));
    await expect(page.getByRole('status')).toHaveCount(0);
    await expect(page.getByLabel('Interaction mode',{exact:true})).toBeEnabled();
    await page.getByText('Visuals',{exact:true}).click();
    await page.getByRole('checkbox',{name:'Consistent characters',exact:true}).check();
    expect(await page.evaluate(()=>(window as any).__setup.adventureConsistentCharacters)).toBe(true);
    await mount(page,surface,false,{});
    await page.getByText('Visuals',{exact:true}).click();
    await expect(page.getByRole('checkbox',{name:'Consistent characters',exact:true})).toBeEnabled();
  });
}
