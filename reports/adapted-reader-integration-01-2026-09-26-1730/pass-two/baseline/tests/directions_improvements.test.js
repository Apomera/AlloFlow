import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { loadAlloModule } from './setup.js';

const read = file => readFileSync(resolve(file), 'utf8');
const host = read('AlloFlowANTI.txt');
const doc = read('doc_pipeline_source.jsx');
const shared = read('directions_markdown_source.js').trim();
const parse = new Function(shared + ';return _alloParsePreviewMarkdown;')();
const helperSlice = host.slice(host.indexOf('function _alloNormalizeDirectionsData('), host.indexOf('let globalAudioCtx'));
const adapterSlice = host.slice(host.indexOf('function _alloBuildDirectionsResultAdapter('), host.indexOf('let globalMuteEnabled'));
const adapter = new Function('_alloStudentSafeResources', 'sanitizeHtml', helperSlice + adapterSlice + ';return _alloBuildDirectionsResultAdapter;')(items => items.filter(item => item.type !== 'lesson-plan'), text => text);
const start = doc.indexOf('const generateResourceHTML =');
const end = doc.indexOf('\n  };', start) + 6;
const generate = new Function('exportConfig', 'isRtlLang', 'leveledTextLanguage', 'getDefaultTitle', 't', shared + doc.slice(start,end) + ';return generateResourceHTML;')({}, () => false, 'English', () => 'Assignment Directions', key => key);
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const ctx = { window: { React, AlloModules: {}, sanitizeHtml: text => text } };
vm.runInNewContext(read('view_directions_result_module.js'),ctx);
vm.runInNewContext(read('view_directions_composer_module.js'),ctx);
const View = ctx.window.AlloModules.DirectionsResult.DirectionsResultView;
const Composer = ctx.window.AlloModules.DirectionsComposer.DirectionsComposerView;
const dom = html => new DOMParser().parseFromString(html,'text/html');
const resources = Array.from({length:13},(_,i)=>({id:'r'+i,type:'simplified',title:'Resource '+(i+1)}));
const goals = Array.from({length:25},(_,i)=>({id:'g'+i,kind:'manual',label:'Goal '+(i+1)}));
const body = '**Due:** Friday\n\nRead first.\n\n1. Read **the passage**.\n2. Explain your answer.';
const prepare = (extra = {}) => adapter({ item:{id:'d',type:'directions',title:'Directions',data:{body,objectives:goals}}, history:resources, parseMarkdownToHTML:parse, t:()=>'', ...extra });

describe('directions improvements', () => {
 it('preserves nested steps, spaced lists, and explicit numbering', () => {
  const result=dom(parse('1. Read first.\n   - Find evidence.\n   - Take notes.\n\n3. Explain your answer.'));
  expect(result.querySelectorAll('body > ol > li')).toHaveLength(2);
  expect(result.querySelectorAll('ol > li > ul > li')).toHaveLength(2);
  expect(result.querySelector('body > ol > li:last-child').getAttribute('value')).toBe('3');
 });
 it('includes directions in the full exported pack and advertises HTML/IMS support', () => {
  loadAlloModule('doc_pipeline_module.js');
  const pipeline=window.AlloModules.createDocPipeline({callGemini:async()=> '{}',callGeminiVision:async()=> '{}',callImagen:async()=>null,addToast:()=>{},t:key=>key,isRtlLang:()=>false,updateExportPreview:()=>{},getDefaultTitle:type=>type,state:{}});
  const profile=pipeline.interactiveObjectProfileFor('directions');
  expect(profile.canExportHtml).toBe(true);
  expect(profile.canExportIms).toBe(true);
  const items=[{id:'d1',type:'directions',title:'Assignment Directions',data:body},{id:'d2',type:'directions',title:'Goals',data:{body,objectives:goals}}];
  const result=dom(pipeline.generateFullPackHTML(items,'Water cycle',false,{},{}));
  expect(result.getElementById('d1').querySelectorAll('ol > li')).toHaveLength(2);
  expect(result.getElementById('d2').textContent).toContain('Goal 25');
  const manifest=JSON.parse(result.getElementById('alloflow-interactive-object-profile').textContent);
  expect(manifest.resources.filter(item=>item.type==='directions').every(item=>item.renderedInStudentHtml)).toBe(true);
 });

 it('ships one canonical formatter in every host and in the document pipeline', () => {
  for(const file of ['AlloFlowANTI.txt','desktop/web-app/src/AlloFlowANTI.txt','desktop/web-app/src/App.jsx','doc_pipeline_source.jsx']) expect(read(file),file).toContain(shared);
  const seam = host.slice(host.indexOf("activeView === 'directions' && generatedContent?.type === 'directions'"));
  expect(seam).toContain('parseMarkdownToHTML: _alloParsePreviewMarkdown');
 });
 it.each([body, {body,objectives:goals}])('exports plain and structured directions with the preview list structure', data => {
  const result=dom(generate({id:'d',type:'directions',title:'Assignment Directions',data},false));
  expect(result.querySelector('h2').textContent).toBe('Assignment Directions');
  expect(result.querySelector('strong').textContent).toBe('Due:');
  expect(result.querySelectorAll('ol > li')).toHaveLength(2);
  expect(result.body.innerHTML).toContain(parse(body));
  expect(result.body.textContent).not.toContain('**');
 });
 it('includes all goals and choice-board information in worksheet and teacher exports', () => {
  const data={body,objectives:goals,choiceBoard:{enabled:true,title:'Choose your activity',prompt:'Choose one.',choices:[{label:'Draw the cycle',description:'Label the stages.'},{label:'Explain the cycle',description:'Use your own words.'}]}};
  for(const teacher of [false,true]) {
   const result=dom(generate({id:'d',type:'directions',title:'Directions',data},teacher,{}, {isWorksheet:true}));
   expect(result.body.textContent).toContain('Goal 25');
   expect(result.body.textContent).toContain('Choose your activity');
   expect(result.body.textContent).toContain('Label the stages.');
   expect(result.body.textContent).toContain('Use your own words.');
  }
 });
 it('escapes author-entered export fields and Markdown HTML', () => {
  const result=dom(generate({id:'d" onmouseover="evil',type:'directions',title:'<img src=x onerror=evil>',data:{body:'**Read <script>evil</script>**',objectives:[{label:'<img src=x onerror=evil>'}]}},false));
  expect(result.querySelector('script,img,[onmouseover],[onerror]')).toBeNull();
  expect(result.querySelector('strong').textContent).toBe('Read <script>evil</script>');
 });
 it('preserves all resources, goals, long goal labels, and directions beyond the old limit', () => {
  const longGoal='Explain '.repeat(50)+'FINAL GOAL';
  const model=prepare({item:{id:'d',data:{body:'x'.repeat(20000)+' FINAL INSTRUCTION',objectives:[...goals,{id:'last',kind:'manual',label:longGoal}]}},progress:{_visited:Object.fromEntries(resources.slice(0,12).map(item=>[item.id,true]))}});
  expect(model.viewProps.stationViews).toHaveLength(13);
  expect(model.viewProps.goalViews).toHaveLength(26);
  expect(model.viewProps.goalViews.at(-1).label).toBe(longGoal);
  expect(model.viewProps.bodyHtml).toContain('FINAL INSTRUCTION');
  expect(model.viewProps.recommendationView.nextId).toBe('r12');
  const result=dom(renderToStaticMarkup(React.createElement(View,model.viewProps)));
  expect(result.body.textContent).toContain('Resource 13');
  expect(result.body.textContent).toContain('FINAL GOAL');
 });
 it('keeps the final goal inside the quest map with one resource and 25 goals', () => {
  const props=prepare({history:resources.slice(0,1)}).viewProps;
  const result=dom(renderToStaticMarkup(React.createElement(View,{...props,showQuestMap:true})));
  const svg=result.querySelector('svg');const width=Number(svg.getAttribute('viewBox').split(' ')[2]);
  const nodes=[...svg.querySelectorAll('rect[y="140"]')];
  expect(nodes).toHaveLength(25);
  for(const node of nodes) expect(Number(node.getAttribute('x'))+Number(node.getAttribute('width'))).toBeLessThan(width);
 });
 it('shows formatted body preview and keeps the save controls outside the editor scroll area', () => {
  const Icon=()=>null;
  const props={ArrowRight:Icon,ClipboardList:Icon,Sparkles:Icon,X:Icon,_alloDirectionsGoalResources:[],_mbDirectionsChoiceDraftChoices:[],_mbDirectionsChoicePreviewItems:[],mbDirectionsDraft:{body,title:'Directions',objectives:goals},directionsPreviewHtml:parse(body),mbDirectionsGoalRes:'',mbDirectionsGoalText:'',t:()=>''};
  const result=dom(renderToStaticMarkup(React.createElement(Composer,props)));
  const preview=result.querySelector('[data-directions-preview]');
  expect(preview.querySelector('strong').textContent).toBe('Due:');
  expect(preview.querySelectorAll('ol > li')).toHaveLength(2);
  expect(result.querySelector('[data-directions-scroll] [data-help-key="directions_add_pack"]')).toBeNull();
  expect(result.querySelector('[role="dialog"] [data-help-key="directions_add_pack"]')).not.toBeNull();
 });
});
