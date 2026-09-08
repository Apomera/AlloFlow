# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: adventure-shared-setup.spec.ts >> launch exposes social focus, manual resources and relevant pacing
- Location: tests\e2e\adventure-shared-setup.spec.ts:48:7

# Error details

```
TimeoutError: locator.selectOption: Timeout 30000ms exceeded.
Call log:
  - waiting for getByLabel('Interaction mode', { exact: true })

```

# Page snapshot

```yaml
- main [ref=e2]:
  - generic [ref=e3]:
    - region "Essential setup" [ref=e4]:
      - heading "Essential setup" [level=3] [ref=e5]
      - generic [ref=e6]:
        - generic [ref=e7]:
          - text: Interaction mode
          - combobox "Interaction mode" [ref=e8]:
            - option "Standard Adventure Mode" [selected]
            - option "Debate"
            - option "Systems simulation"
        - generic [ref=e9]:
          - text: Adventure language
          - combobox "Adventure language Story language follows this control; the translation language follows Universal Settings." [ref=e10]:
            - option "English only" [selected]
            - option "Spanish"
            - option "Spanish · with translation"
          - generic [ref=e11]: Story language follows this control; the translation language follows Universal Settings.
        - generic [ref=e12]:
          - text: Student responses
          - combobox "Student responses" [ref=e13]:
            - option "Choose from suggestions" [selected]
            - option "Write or dictate"
      - generic [ref=e15]:
        - generic [ref=e16]:
          - generic [ref=e17]:
            - text: Episode length
            - combobox "Episode length" [ref=e18]:
              - option "Short · 6 decisions"
              - option "Standard · 12 decisions" [selected]
              - option "Long · 20 decisions"
              - option "Open-ended"
          - generic [ref=e19]:
            - text: Choices per decision
            - combobox "Choices per decision" [ref=e20]:
              - option "2"
              - option "3"
              - option "4" [selected]
              - option "5"
              - option "6"
        - paragraph [ref=e21]: Length counts decisions, not minutes. The final challenge fits inside a set episode. Energy depletion can end a run earlier.
        - generic [ref=e22] [cursor=pointer]:
          - checkbox "Include a final challenge" [checked] [ref=e23]
          - text: Include a final challenge
      - generic [ref=e24]:
        - text: Social skill to practise
        - textbox "Social skill to practise" [active] [ref=e25]:
          - /placeholder: e.g., Sharing toys, Dealing with frustration
          - text: Resolving disagreements
    - group [ref=e26]:
      - 'generic "Learning supportsReading practice: Off" [ref=e27] [cursor=pointer]'
    - group [ref=e28]:
      - 'generic "Story & game rulesChance: Off" [ref=e29] [cursor=pointer]'
      - option "Story"
      - option "Normal" [selected]
      - option "Hard"
      - option "Hardcore"
    - group [ref=e30]:
      - 'generic "VisualsArt style: auto" [ref=e31] [cursor=pointer]'
      - option "Use Universal style"
      - option "Auto" [selected]
      - option "Storybook"
      - option "Pixel art"
      - option "Cinematic"
      - option "Anime"
      - option "Hand-drawn"
      - option "Custom"
    - group [ref=e32]:
      - generic "Story guidanceNo custom instructions" [ref=e33] [cursor=pointer]
    - group [ref=e34]:
      - 'generic "Saving & permissionsCloud images: Off" [ref=e35] [cursor=pointer]'
    - region "Setup summary" [ref=e36]:
      - strong [ref=e37]: "Setup summary:"
      - text: Standard Adventure Mode · 12 decisions · 4 suggested choices · English only
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | import path from 'node:path';
  3  | const local = (file: string) => path.resolve(__dirname, '../..', file);
  4  | 
  5  | async function mount(page: any, surface = 'launch', teacher = false, permissions: any = {}, mode = 'choice', theme = 'light') {
  6  |   await page.setContent('<!doctype html><html lang="en"><head><title>Adventure shared setup</title></head><body><main id="root" style="max-width:780px;margin:auto"></main></body></html>');
  7  |   for (const file of ['react/umd/react.development.js', 'react-dom/umd/react-dom.development.js']) await page.addScriptTag({ path: local('desktop/web-app/node_modules/' + file) });
  8  |   for (const file of ['view_adventure_module.js','view_sidebar_panels_module.js','desktop/web-app/public/vendor/axe-core/axe.min.js']) await page.addScriptTag({ path: local(file) });
  9  |   await page.evaluate(({ surface, teacher, permissions, mode, theme }) => {
  10 |     const w=window as any, R=w.React;
  11 |     function Fixture() {
  12 |       const [state,setState]=R.useState({currentScene:null,history:[],episodeTurnLimit:12,choiceCount:4,enableAutoClimax:true,systemResources:[{name:'Budget',quantity:900,unit:'credits'}],climax:{isActive:false}});
  13 |       const [settings,setSettings]=R.useState({adventureInputMode:mode,adventureDifficulty:'Normal',adventureLanguageMode:'English',adventureFreeResponseEnabled:false,adventureChanceMode:false,isAdventureStoryMode:true,isSocialStoryMode:mode==='social',socialStoryFocus:'Sharing',enableFactionResources:mode==='system',factionResourceMode:'manual',adventureArtStyle:'auto',adventureCustomArtStyle:'',universalImageStyle:'',adventureConsistentCharacters:false,useLowQualityVisuals:false,adventureCustomInstructions:'',adventureFluencyEnabled:false,adventureTypingPaceEnabled:false,isAdventureCloudEnabled:false});
  14 |       const props:any={theme,...settings,adventureState:state,setAdventureState:setState,isTeacherMode:teacher,studentProjectSettings:{adventureUnlockXP:0,allowFreeResponse:true,adventurePermissions:permissions},t:(key:string)=>key,selectedLanguages:['Spanish'],expandedTools:['adventure'],globalPoints:100,hasSourceOrAnalysis:true,handleStartAdventure:()=>{},safeSetItem:()=>{}};
  15 |       for(const key of Object.keys(settings))props['set'+key[0].toUpperCase()+key.slice(1)]=(value:any)=>setSettings((previous:any)=>({...previous,[key]:value}));
  16 |       w.__setup={...settings,state};
  17 |       return R.createElement(surface==='sidebar'?w.AlloModules.AdventurePanel:w.AlloModules.AdventureSetupFields,props);
  18 |     }
  19 |     w.ReactDOM.createRoot(document.querySelector('#root')).render(R.createElement(Fixture));
  20 |   },{surface,teacher,permissions,mode,theme});
  21 | }
  22 | 
  23 | for (const surface of ['launch','sidebar']) {
  24 |   test(surface+' retains allowed student edits and enforces each permission', async ({page})=>{
  25 |     await mount(page,surface,false,{allowLanguageSwitch:true,allowModeSwitch:false,allowDifficultySwitch:false,allowCustomInstructions:false,allowVisualsToggle:false,allowCloudImageStorage:true});
  26 |     await expect(page.getByLabel('Interaction mode',{exact:true})).toBeDisabled();
  27 |     await page.getByLabel('Adventure language',{exact:true}).selectOption('Spanish');
  28 |     expect(await page.evaluate(()=>(window as any).__setup.adventureLanguageMode)).toBe('Spanish');
  29 |     await page.getByLabel('Student responses',{exact:true}).selectOption('written');
  30 |     await expect(page.getByLabel('Choices per decision',{exact:true})).toHaveCount(0);
  31 |     await page.getByText('Story & game rules',{exact:true}).click();
  32 |     await expect(page.getByLabel('Energy & rewards',{exact:true})).toBeDisabled();
  33 |     await page.getByText('Visuals',{exact:true}).click();
  34 |     await expect(page.getByLabel('Art style',{exact:true})).toBeDisabled();
  35 |     await page.getByText('Saving & permissions',{exact:true}).click();
  36 |     await page.getByRole('checkbox',{name:/Cloud image storage/}).check();
  37 |     expect(await page.evaluate(()=>(window as any).__setup.isAdventureCloudEnabled)).toBe(true);
  38 |   });
  39 | 
  40 |   test(surface+' locks every student configuration control including cloud storage',async({page})=>{
  41 |     await mount(page,surface,false,{lockAllSettings:true,allowModeSwitch:true,allowLanguageSwitch:true,allowCloudImageStorage:true},'system');
  42 |     await page.locator('details').evaluateAll((nodes:any[])=>nodes.forEach(n=>n.open=true));
  43 |     for(const control of await page.locator('[data-adventure-settings] input, [data-adventure-settings] select, [data-adventure-settings] textarea, [data-adventure-settings] button').all()) await expect(control).toBeDisabled();
  44 |     await expect(page.getByRole('checkbox',{name:/Cloud image storage/})).toBeDisabled();
  45 |     await expect(page.getByText(/Your teacher has fixed this setup/)).toBeVisible();
  46 |   });
  47 | 
  48 |   test(surface+' exposes social focus, manual resources and relevant pacing',async({page})=>{
  49 |     await mount(page,surface,true,{},'social');
  50 |     await page.getByLabel('Social skill to practise',{exact:true}).fill('Resolving disagreements');
  51 |     expect(await page.evaluate(()=>(window as any).__setup.socialStoryFocus)).toBe('Resolving disagreements');
> 52 |     await page.getByLabel('Interaction mode',{exact:true}).selectOption('system');
     |                                                            ^ TimeoutError: locator.selectOption: Timeout 30000ms exceeded.
  53 |     await page.getByRole('checkbox',{name:/Track resources/}).check();
  54 |     await expect(page.getByLabel('Resource name 1',{exact:true})).toHaveValue('Budget');
  55 |     await page.getByLabel('Starting value 1',{exact:true}).fill('1200');
  56 |     await page.getByLabel('Episode length',{exact:true}).selectOption('open');
  57 |     await expect(page.getByLabel('Earliest finale round (open-ended)',{exact:true})).toBeVisible();
  58 |     await page.getByRole('checkbox',{name:'Include a final challenge'}).uncheck();
  59 |     await expect(page.getByLabel('Earliest finale round (open-ended)',{exact:true})).toHaveCount(0);
  60 |     expect(await page.evaluate(()=>(window as any).__setup.state.systemResources[0])).toMatchObject({name:'Budget',quantity:1200,unit:'credits'});
  61 |   });
  62 | }
  63 | 
  64 | for(const theme of ['light','dark','contrast'])test('shared controls reflow with meaningful names in '+theme,async({page},info)=>{
  65 |   await page.setViewportSize({width:375,height:900});
  66 |   await mount(page,'launch',true,{},'system',theme);
  67 |   await page.locator('details').evaluateAll((nodes:any[])=>nodes.forEach(n=>n.open=true));
  68 |   for(const width of [375,1200]){
  69 |     await page.setViewportSize({width,height:900});
  70 |     expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  71 |     expect(await page.evaluate(async()=> (await (window as any).axe.run(document.querySelector('main'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag22aa']}})).violations.map((v:any)=>({id:v.id,nodes:v.nodes.map((n:any)=>n.target)})))).toEqual([]);
  72 |     await page.screenshot({path:info.outputPath('shared-'+theme+'-'+width+'.png'),fullPage:true});
  73 |   }
  74 | });
  75 | 
```