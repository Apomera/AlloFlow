import { test, expect } from '@playwright/test';
import path from 'node:path';
const local = (file: string) => path.resolve(__dirname, '../..', file);

async function mount(page: any, surface = 'launch', teacher = false, permissions: any = {}, mode = 'choice', theme = 'light') {
  await page.setContent('<!doctype html><html lang="en"><head><title>Adventure shared setup</title></head><body><main id="root" style="max-width:780px;margin:auto"></main></body></html>');
  for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: local('desktop/web-app/node_modules/' + file) });
  for (const file of ['view_adventure_module.js','view_sidebar_panels_module.js','desktop/web-app/public/vendor/axe-core/axe.min.js']) await page.addScriptTag({ path: local(file) });
  await page.evaluate(({ surface, teacher, permissions, mode, theme }) => {
    const w=window as any, R=w.React;
    function Fixture() {
      const [state,setState]=R.useState({currentScene:null,history:[],episodeTurnLimit:12,choiceCount:4,enableAutoClimax:true,systemResources:[{name:'Budget',quantity:900,unit:'credits'}],climax:{isActive:false}});
      const [settings,setSettings]=R.useState({adventureInputMode:mode,adventureDifficulty:'Normal',adventureLanguageMode:'English',adventureFreeResponseEnabled:false,adventureChanceMode:false,isAdventureStoryMode:true,isSocialStoryMode:mode==='social',socialStoryFocus:'Sharing',enableFactionResources:mode==='system',factionResourceMode:'manual',adventureArtStyle:'auto',adventureCustomArtStyle:'',universalImageStyle:'',adventureConsistentCharacters:false,useLowQualityVisuals:false,adventureCustomInstructions:'',adventureFluencyEnabled:false,adventureTypingPaceEnabled:false,isAdventureCloudEnabled:false});
      const props:any={theme,...settings,adventureState:state,setAdventureState:setState,isTeacherMode:teacher,studentProjectSettings:{adventureUnlockXP:0,allowFreeResponse:true,adventurePermissions:permissions},t:(key:string)=>key,selectedLanguages:['Spanish'],expandedTools:['adventure'],globalPoints:100,hasSourceOrAnalysis:true,handleStartAdventure:()=>{},safeSetItem:()=>{}};
      for(const key of Object.keys(settings))props['set'+key[0].toUpperCase()+key.slice(1)]=(value:any)=>setSettings((previous:any)=>({...previous,[key]:value}));
      w.__setup={...settings,state};
      return R.createElement(surface==='sidebar'?w.AlloModules.AdventurePanel:w.AlloModules.AdventureSetupFields,props);
    }
    w.ReactDOM.createRoot(document.querySelector('#root')).render(R.createElement(Fixture));
  },{surface,teacher,permissions,mode,theme});
}

for (const surface of ['launch','sidebar']) {
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
    await page.getByLabel('Episode length',{exact:true}).selectOption('open');
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
