import fs from 'node:fs';
import { afterAll,beforeAll,describe,expect,it } from 'vitest';
import { chromium } from 'playwright';
import { loadTool,prepareStemBrowserRender,renderTool,resetStemLab } from './helpers/stem_widgets_smoke_harness.js';
import { auditTextSpacingReflow } from './helpers/stem_wcag_browser_checks.js';
const appCss=fs.readFileSync('app/static/css/'+fs.readdirSync('app/static/css').find(f=>/^main\.[a-z0-9]+\.css$/i.test(f)),'utf8');
const axe=fs.readFileSync('node_modules/axe-core/axe.min.js','utf8');
const scene={objects:[{id:1,type:'prism',position:[0,0,0],u:[1,0,0],v:[0,1,0],w:[0,0,1]}],selection:1};
const notebookEntry={id:'height-study',title:'Height investigation',unit:'unit',before:scene,after:{objects:[{...scene.objects[0],w:[0,0,2]}],selection:1},prediction:'I predict twice the volume.',transformation:'Double only the height.',explanation:'The volume doubled; the surface area grew from 6 to 10 square units.',experiment:{id:'height',objectId:1,predictionLocked:true,predictionSpoken:false}};
const cases=[
 {name:'stretch-notebook',data:{_threeLoaded:true,geoSandbox:{mode:'stretch',workspacePanel:'learn',construction:scene,stretchCompareOpen:true,stretchDraft:{before:scene,unit:'unit',title:'Changing height',prediction:'I predict double the volume.',transformation:'Double the height.',explanation:'',demonstrated:false}}}},
 {name:'lesson-feedback',data:{_threeLoaded:true,geoSandbox:{mode:'stretch',workspacePath:'lesson',lessonIndex:3,construction:scene}}},
 {name:'challenge-retry',data:{_threeLoaded:true,geoSandbox:{mode:'single',challengeMode:true,challengeFeedback:'Not quite. Use V = w·h·d. Substitute the dimensions shown.',challenge:{type:'volume',shapeId:'box',shapeName:'Rectangular Prism',dims:{w:1,h:1,d:.5},answer:.5,unit:'u³',question:'Calculate volume',dimDesc:'1 × 1 × .5'}}}},
 {name:'comparison-lesson',data:{_threeLoaded:true,geoSandbox:{mode:'stretch',workspacePath:'lesson',lessonIndex:5,construction:{objects:[scene.objects[0],{...scene.objects[0],id:2,u:[2,0,0],w:[.5,0,.5]}],selection:1}}}},
 {name:'before-after-notebook',data:{_threeLoaded:true,geoSandbox:{mode:'stretch',workspacePanel:'learn',construction:scene,stretchRecords:[notebookEntry],stretchReviewEntry:notebookEntry.id,stretchRemovedRecord:{entry:{...notebookEntry,id:"earlier-study",title:"Earlier height investigation"},index:0}}}},
 {name:'guided-experiment',data:{_threeLoaded:true,geoSandbox:{mode:'stretch',workspacePanel:'learn',stretchExplain:'height',stretchCompareOpen:true,construction:{objects:[{...scene.objects[0],w:[.75,0,1]}],selection:1},stretchDraft:{before:scene,unit:'unit',title:'Does leaning change volume?',prediction:'I predict the volume will stay the same.',transformation:'Shifted the top sideways.',explanation:'',demonstrated:false,experiment:{id:'lean',objectId:1,predictionLocked:true,predictionSpoken:false}}}}},
 {name:'custom-guided-evidence',data:{_threeLoaded:true,geoSandbox:{mode:'stretch',workspacePanel:'learn',construction:scene,stretchReviewEntry:'custom',stretchRecords:[{...notebookEntry,id:'custom',after:{objects:[{...scene.objects[0],u:[3,0,0],w:[0,0,4]}],selection:1}}]}}},
 {name:'engine-error',data:{_threeLoaded:false,_geoEngineError:true,geoSandbox:{}}},
];
describe('Geometry improvement browser layout and accessibility',()=>{
 let browser;beforeAll(async()=>{browser=await chromium.launch({headless:true});},60000);afterAll(async()=>{await browser?.close();},60000);
 for(const testCase of cases)it(testCase.name,async()=>{
  resetStemLab();loadTool('stem_lab/stem_tool_geosandbox.js','geoSandbox');const rendered=prepareStemBrowserRender(renderTool('geoSandbox',testCase.data));
  const page=await browser.newPage({viewport:{width:320,height:760}});
  await page.setContent('<!doctype html><html lang="en"><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Geometry review</title><style>'+appCss+'</style></head><body><main id="tool-root">'+rendered.html+'</main></body></html>');
  for(const css of rendered.cssSheets)await page.addStyleTag({content:css});await page.addScriptTag({content:axe});await page.locator('.geo-measurement-guide').evaluateAll(nodes=>nodes.forEach(node=>{node.open=true;}));
  const violations=await page.evaluate(async()=> (await axe.run('#tool-root',{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}})).violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  expect.soft(violations).toEqual([]);
  fs.mkdirSync('reports/geometry-lab-improvements-2026-09-19',{recursive:true});await page.screenshot({path:'reports/geometry-lab-improvements-2026-09-19/'+testCase.name+'-mobile.png',fullPage:true});
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'reports/geometry-lab-improvements-2026-09-19/'+testCase.name+'-desktop.png',fullPage:true});await page.setViewportSize({width:320,height:760});const reflow=await auditTextSpacingReflow(page);expect.soft(reflow.scrollWidth,JSON.stringify(reflow.offenders)).toBeLessThanOrEqual(reflow.clientWidth);await page.close();
 },60000);
});
