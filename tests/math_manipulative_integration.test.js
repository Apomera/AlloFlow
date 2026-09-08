// Behavioral regression tests for the September manipulatives integration repairs.
import { beforeAll, afterEach, afterAll, it, expect, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
import { React, ReactDOMClient, ReactDOMServer, makeCtx, resetStemLab, loadTool } from './helpers/stem_widgets_smoke_harness.js';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host, G;
const findings = {};
beforeAll(() => {
  window.React = globalThis.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('utils_pure_module.js'); loadAlloModule('math_manipulative_grader_module.js'); loadAlloModule('view_math_module.js'); loadAlloModule('generation_helpers_module.js');
  G = window.AlloModules.MathManipulativeGrader;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); });
async function mount(Component, props) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Component, props)));
}
it('a real base-ten button updates the Lab store, and the MathView grader reads the live value', async () => {
  resetStemLab(); const tool = loadTool('stem_lab/stem_tool_manipulatives.js', 'base10');
  let latest;
  function Lab() {
    const [data, setData] = React.useState({ _manipulatives: { soundEnabled: false, b10: { ones:0,tens:0,hundreds:0,thousands:0 } } });
    latest = data;
    return tool.render(makeCtx({ toolData:data, setToolData:setData, labToolData:data, setLabToolData:setData }));
  }
  await mount(Lab);
  const add = [...host.querySelectorAll('button')].find(b => /Add one block to.*[Oo]nes/.test(b.getAttribute('aria-label') || ''));
  expect(add).toBeTruthy(); await act(async () => add.click());
  expect(latest._manipulatives.b10.ones).toBe(1);
  const evaluation = G.evaluateMathViewManipulativeResponse({ tool:'base10',state:{ ones:1,tens:0,hundreds:0 } }, { base10Value:{ ones:0,tens:0,hundreds:0 },labToolData:latest });
  expect(evaluation.correct).toBe(true);
  findings.liveBase10 = { visibleStore:latest._manipulatives.b10, checker:evaluation };
});
it('the other four migrated tools use their live workspace', () => {
  const cases = [
    ['coordinate',{points:[{x:2,y:3}]},{gridPoints:[],labToolData:{_coordGrid:{gridPoints:[{x:2,y:3}]}}}],
    ['fractions',{numerator:3,denominator:8},{fractionPieces:{numerator:0,denominator:8},labToolData:{_fractions:{pieces:{numerator:3,denominator:8}}}}],
    ['numberline',{markers:[{value:5}]},{numberLineMarkers:[],labToolData:{_numberline:{markers:[{value:5}]}}}],
    ['volume',{dims:{l:3,w:2,h:2}},{cubeDims:{l:1,w:1,h:1},labToolData:{_volume:{dims:{l:3,w:2,h:2}}}}],
  ];
  findings.migratedStores = cases.map(([tool,state,snapshot]) => ({tool, result:G.evaluateMathViewManipulativeResponse({tool,state},snapshot)}));
  expect(findings.migratedStores.every(row=>row.result.correct)).toBe(true);
});
it('a support-only artifact has a launch control in independent teacher mode but also in student mode', async () => {
  const props={ generatedContent:{id:'review',type:'math',data:{title:'Support',problems:[{id:'p',question:'Build 23',answer:'23',steps:[],manipulativeSupport:{tool:'base10',state:{tens:2,ones:3}}}]}},
    isTeacherMode:true,isIndependentMode:true,setShowStemLab:vi.fn(),setStemLabTool:vi.fn(),setStemLabTab:vi.fn(),setBase10Value:vi.fn() };
  await mount(window.AlloModules.MathView,props);
  const teacher=[...host.querySelectorAll('button')].filter(b=>b.textContent.includes('Open Visual Support')).length;
  await act(async()=>root.render(React.createElement(window.AlloModules.MathView,{...props,isTeacherMode:false})));
  const student=[...host.querySelectorAll('button')].filter(b=>b.textContent.includes('Open Visual Support')).length;
  findings.supportVisibility={teacher,student}; expect(teacher).toBe(1); expect(student).toBe(1);
});
it('the point comparator rejects a material decimal error',()=>{
  const result=G.evaluateManipulativeResponse('dataPlot',{points:[{x:1.4,y:2.4}]},{points:[{x:1.1,y:2.1}]});
  expect(result.correct).toBe(false); findings.decimalPointMismatch=result;
});
it('base-ten grading includes thousands',()=>{
  const result=G.evaluateManipulativeResponse('base10',{thousands:0,hundreds:0,tens:0,ones:0},{thousands:1,hundreds:0,tens:0,ones:0});
  expect(result.correct).toBe(false);findings.ignoredThousands=result;
});
it('chemistry grading checks equation identity',()=>{
  const result=G.evaluateManipulativeResponse('chemBalance',{equation:'H2 + Cl2 -> HCl',coefficients:[2,1,2]},{equation:'H2 + O2 -> H2O',coefficients:[2,1,2]});
  expect(result.correct).toBe(false);findings.ignoredEquation=result;
});
it('unsupported target domains are rejected as setup errors',()=>{
  findings.invalidDomains=[['volume',{dims:{l:-3,w:2,h:2}}],['protractor',{angle:-30}],['funcGrapher',{type:'does-not-exist',a:1,b:0,c:0}]].map(([tool,target])=>({tool,target,evaluation:G.evaluateManipulativeResponse(tool,undefined,target)}));
  expect(findings.invalidDomains.every(row=>row.evaluation.reason==='invalid-target')).toBe(true);
});
it('the inline renderer preserves regrouped blocks, improper fractions and reflex angles',()=>{
  const src=readFileSync('utils_pure_source.jsx','utf8');const match=src.match(/function _renderDiagramSvg\(tool, state, titleText\) \{[\s\S]*?\r?\n  return null;\r?\n\}/);
  const render=new Function('return ('+match[0]+')')();
  const blocks=render('base10',{ones:12,tens:0,hundreds:0},'Twelve ones');
  const fraction=render('fractions',{numerator:5,denominator:4},'Five quarters');
  const angle=render('protractor',{angle:270},'Reflex angle');
  findings.inlineModels={twelveOnes:{label:blocks.match(/<desc>(.*?)<\/desc>/)[1],drawnBlocks:(blocks.match(/<rect/g)||[]).length},fiveQuarters:fraction.match(/<desc>(.*?)<\/desc>/)[1],reflexAngle:angle.match(/<desc>(.*?)<\/desc>/)[1]};
  expect(findings.inlineModels.twelveOnes.drawnBlocks).toBe(12);expect(fraction).toContain('5/4');expect(angle).toContain('270 degrees');
});

it('Builder flags text-only output for a Manipulative Response section', async()=>{
  let prompt;
  const result=await window.AlloModules.GenerationHelpers.generateMathAssessment([{id:'hands-on',type:'manipulative',quantity:1,directive:'Build 4 with blocks'}], {grade:'1',callGemini:async p=>{prompt=p;return JSON.stringify({problems:[{question:'2+2',expression:'2+2',answer:'4'}]});}});
  findings.builderHandsOn={status:result.content.preparation.status,hasTarget:!!result.content.problems[0].manipulativeResponse,promptRequestsTarget:prompt.includes('manipulativeResponse')};
  expect(findings.builderHandsOn).toEqual({status:'partial',hasTarget:false,promptRequestsTarget:true});
});
it('the geoboard labels open paths accurately and retains interactive semantics',async()=>{
  resetStemLab();const tool=loadTool('stem_lab/stem_tool_manipulatives.js','base10');
  function Lab(){return tool.render(makeCtx({toolData:{_manipulatives:{mode:'geoboard',soundEnabled:false,geoboardSegments:[{x1:0,y1:0,x2:3,y2:0}]}}}));}
  await mount(Lab);
  const panel=[...host.querySelectorAll('p')].find(p=>p.textContent==='Total segment length (units)').parentElement;
  findings.geoboard={label:host.querySelector('svg[role="group"]').getAttribute('aria-label'),openSegmentPerimeter:panel.textContent};
  expect(findings.geoboard.label).toBe('Interactive geoboard');expect(panel.textContent).toContain('3.00');
});
it('fraction-bars hides Check after scoring a construction once',async()=>{
  resetStemLab();const tool=loadTool('stem_lab/stem_tool_manipulatives.js','base10');let latest;
  function Lab(){const [data,setData]=React.useState({_manipulatives:{mode:'fracBars',soundEnabled:false,fbSelected:{2:[0]},fbChallenge:{q:'Highlight one half',denom:2,target:1}}});latest=data;return tool.render(makeCtx({toolData:data,setToolData:setData}));}
  await mount(Lab);const check=()=>[...host.querySelectorAll('button')].find(b=>/Check/.test(b.textContent));
  expect(check()).toBeTruthy();await act(async()=>check().click());
  findings.fractionBarsScoringGuard={score:latest._manipulatives.score,canCheckAgain:!!check()}; expect(findings.fractionBarsScoringGuard).toEqual({score:{correct:1,total:1},canCheckAgain:false});
});

it('opens, checks and resets a real base-ten task without reusing previous work', async()=>{
 resetStemLab(); const tool=loadTool('stem_lab/stem_tool_manipulatives.js','base10'); let latest;
 const input=vi.fn(), toast=vi.fn();
 const artifact={id:'roundtrip',type:'math',data:{problems:[{id:'one',question:'Build one',answer:'1',manipulativeResponse:{tool:'base10',state:{ones:1}}}]}};
 function Lab({data,setData}) { return tool.render(makeCtx({toolData:data,setToolData:setData})); }
 function App(){const [data,setData]=React.useState({_manipulatives:{mode:'geoboard',soundEnabled:false,b10:{ones:8,tens:3,hundreds:0,thousands:0}}});latest=data;
 return React.createElement(React.Fragment,null,React.createElement(window.AlloModules.MathView,{
 generatedContent:artifact,isTeacherMode:false,labToolData:data,setLabToolData:setData,
 setStemLabTool:vi.fn(),setStemLabTab:vi.fn(),setShowStemLab:vi.fn(),handleStudentInput:input,addToast:toast
 }),React.createElement(Lab,{data,setData}));}
 await mount(App);
 const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 await act(async()=>button('Open base10').click());
 expect(latest._manipulatives.mode).toBe('blocks');expect(latest._manipulatives.b10.ones).toBe(0);
 const add=[...host.querySelectorAll('button')].find(b=>/Add one block to.*[Oo]nes/.test(b.getAttribute('aria-label')||''));
 await act(async()=>add.click());
 await act(async()=>button('Check My Manipulative').click());
 expect(input).toHaveBeenCalled();expect(toast.mock.calls.at(-1)[1]).toBe('success');
 await act(async()=>button('Open base10').click());
 expect(latest._manipulatives.b10.ones).toBe(0);
 await act(async()=>button('Check My Manipulative').click());
 expect(toast.mock.calls.at(-1)[1]).not.toBe('success');
});
it('workspace adapters preserve unrelated data and initialize the correct modes',()=>{
 for(const [tool,value] of [['base10',{ones:2,tens:0,hundreds:0,thousands:0}],['fractions',{numerator:1,denominator:2}],['volume',{l:2,w:2,h:2}],['coordinate',[{x:2,y:3}]],['numberline',[{value:5}]]]) {
  const previous={other:{keep:true}};const next=G.writeMathViewState(tool,previous,value);
  expect(G.readMathViewState(tool,{labToolData:next})).toEqual(value);expect(next.other).toBe(previous.other);expect(previous).toEqual({other:{keep:true}});
 }
 expect(G.readMathViewState('base10',{base10Value:{ones:7},labToolData:{_manipulatives:{}}})).toBeUndefined();
});
it('rubrics distinguish equivalent values from exact constructions',()=>{
 expect(G.gradeManipulativeResponse('base10',{thousands:0,hundreds:0,tens:1,ones:0},{ones:10,match:'value'})).toBe(true);
 expect(G.gradeManipulativeResponse('base10',{thousands:0,hundreds:0,tens:1,ones:0},{ones:10})).toBe(false);
 expect(G.gradeManipulativeResponse('fractions',{numerator:2,denominator:4},{numerator:1,denominator:2,match:'equivalent'})).toBe(true);
 expect(G.gradeManipulativeResponse('volume',{l:2,w:3,h:2},{dims:{l:1,w:4,h:3},match:'volume'})).toBe(true);
});
it('Builder accepts a valid hands-on target and rejects a wrong selected tool',async()=>{
 const payload={problems:[{question:'Build 4 using blocks',expression:'2+2',answer:'4',manipulativeResponse:{tool:'base10',state:{ones:4}}}]};
 const generate=tool=>window.AlloModules.GenerationHelpers.generateMathAssessment([{type:'manipulative',manipulativeTool:tool,quantity:1}],{callGemini:async()=>JSON.stringify(payload)});
 expect((await generate('base10')).content.preparation.status).toBe('ready');
 expect((await generate('fractions')).content.preparation.status).toBe('partial');
});
it.each([
 [{mode:'tenFrame',count:1},'Ten-frames',b=>b.getAttribute('aria-label')?.startsWith('Cell 1,')],
 [{mode:'counters',value:-1},'Two-color counters',b=>b.textContent.trim()==='+ Red'],
 [{mode:'fracBars',numerator:1,denominator:2},'Fraction bars',b=>b.getAttribute('aria-label')==='Part 1 of 2']
])('runs a generated hub activity through the real workspace: %j',async(target,label,findAction)=>{
 resetStemLab();const tool=loadTool('stem_lab/stem_tool_manipulatives.js','base10');let latest;
 const toast=vi.fn(), input=vi.fn();
 const response={tool:'base10',state:target};
 const artifact={id:'hub-'+target.mode,type:'math',data:{problems:[{id:'p',question:'Build the requested model',answer:'1',manipulativeResponse:response}]}};
 function Lab({data,setData}){return tool.render(makeCtx({toolData:data,setToolData:setData}));}
 function App(){const [data,setData]=React.useState({_manipulatives:{mode:'geoboard',soundEnabled:false}});latest=data;
 return React.createElement(React.Fragment,null,React.createElement(window.AlloModules.MathView,{generatedContent:artifact,isTeacherMode:false,labToolData:data,setLabToolData:setData,setStemLabTool:vi.fn(),setStemLabTab:vi.fn(),setShowStemLab:vi.fn(),handleStudentInput:input,addToast:toast}),React.createElement(Lab,{data,setData}));}
 await mount(App);
 const button=text=>[...host.querySelectorAll('button')].find(b=>b.textContent.trim()===text);
 await act(async()=>button('Open '+label).click());
 expect(latest._manipulatives.mode).toBe(target.mode);
 expect(G.evaluateMathViewManipulativeResponse(response,{labToolData:latest}).correct).toBe(false);
 const action=[...host.querySelectorAll('button')].find(findAction);expect(action).toBeTruthy();
 await act(async()=>action.click());await act(async()=>button('Check My Manipulative').click());
 expect(toast.mock.calls.at(-1)[1]).toBe('success');expect(input).toHaveBeenCalled();
 await act(async()=>button('Open '+label).click());
 expect(G.evaluateMathViewManipulativeResponse(response,{labToolData:latest}).correct).toBe(false);
});
it('Builder advertises and validates each new hub mode',async()=>{
 for(const state of [{mode:'tenFrame',count:7},{mode:'counters',value:-3},{mode:'fracBars',numerator:2,denominator:3}]) {
  let prompt;
  const result=await window.AlloModules.GenerationHelpers.generateMathAssessment([{type:'manipulative',manipulativeTool:'base10:'+state.mode,quantity:1}],{callGemini:async p=>{prompt=p;return JSON.stringify({problems:[{question:'2+2',expression:'2+2',answer:'4',manipulativeResponse:{tool:'base10',state}}]});}});
  expect(result.content.preparation.status).toBe('ready');expect(prompt).toContain(state.mode);
 }
 expect(G.evaluateManipulativeResponse('base10',undefined,{mode:'tenFrame',count:21}).reason).toBe('invalid-target');
 expect(G.evaluateManipulativeResponse('base10',undefined,{mode:'counters',value:1.5}).reason).toBe('invalid-target');
 expect(G.evaluateManipulativeResponse('base10',undefined,{mode:'fracBars',numerator:5,denominator:4}).reason).toBe('invalid-target');
});
it('chemistry resolves preset names and reads the displayed equation',()=>{
 resetStemLab();loadTool('stem_lab/stem_tool_chembalance.js','chemBalance');
 const response={tool:'chemBalance',state:{equation:'H2 + O2 -> H2O',coefficients:[2,1,2]}};
 expect(G.evaluateMathViewManipulativeResponse(response,{labToolData:{chemBalance:{equation:'Water Formation',coefficients:[2,1,2]}}}).correct).toBe(true);
 expect(G.evaluateMathViewManipulativeResponse(response,{labToolData:{chemBalance:{equation:'Table Salt',coefficients:[2,1,2]}}}).correct).toBe(false);
 const read=window.AlloModules.ChemistryActivity.readState({equation:'H2 + O2 -> H2O',coefficients:[2,1,2]});
 expect(read.equation).toContain('H₂O');
});
it('inline previews show the new mode values instead of empty base-ten blocks',()=>{
 const render=window.AlloModules.UtilsPure._renderDiagramSvg;
 expect(render('base10',{mode:'tenFrame',count:7})).toContain('Ten-frame: 7');
 expect(render('base10',{mode:'counters',value:-3})).toContain('Counters: -3');
 expect(render('base10',{mode:'fracBars',numerator:2,denominator:3})).toContain('2/3');
 expect(render('base10',{thousands:1})).toContain('1 thousands');
 expect(render('protractor',{angle:360})).toContain('360 degrees');
 expect(render('fractions',{numerator:-1,denominator:4})).toContain('Fraction -1/4');
});
it('restores a fraction workspace from teacher navigation to Build a fraction',async()=>{
 resetStemLab();const tool=loadTool('stem_lab/stem_tool_fractions.js','fractions');
 const data=G.writeMathViewState('fractions',{_fractions:{navMode:'teacher',tab:'printlab'}},{numerator:1,denominator:2});
 expect(data._fractions.navMode).toBe('learn');
 function Lab(){return tool.render(makeCtx({toolData:data,setToolData:vi.fn()}));}
 const html=ReactDOMServer.renderToStaticMarkup(React.createElement(Lab));
 expect(html).toContain('type="range"');
 expect(html).toContain('Build a fraction');
});
it('the Builder exposes the shared manipulative choices and preserves the chosen mode',async()=>{
 loadAlloModule('math_create_module.js');
 const Modal=window.AlloModules.MathCreate.MathCreateModal;
 const change=vi.fn();
 await mount(Modal,{showAssessmentBuilder:true,t:k=>k,assessmentBlocks:[{id:'a',type:'manipulative',quantity:1,directive:'count'}],setAssessmentBlocks:change});
 const select=host.querySelector('select[aria-label="Block 1 manipulative"]');
 expect(select).toBeTruthy();expect([...select.options].map(o=>o.value)).toContain('base10:tenFrame');
 await act(async()=>{select.value='base10:tenFrame';select.dispatchEvent(new Event('change',{bubbles:true}));});
 expect(change.mock.calls.at(-1)[0][0].manipulativeTool).toBe('base10:tenFrame');
});
it('does not grade a hidden model after the learner switches tools or tabs',()=>{
 for(const [tool,ns,fields,state] of [
  ['base10','_manipulatives',{mode:'geoboard',b10:{ones:1,tens:0,hundreds:0}},{ones:1}],
  ['fractions','_fractions',{navMode:'teacher',tab:'printlab',pieces:{numerator:1,denominator:2}},{numerator:1,denominator:2}],
  ['coordinate','_coordGrid',{cgTab:'practice',gridPoints:[{x:2,y:3}]},{points:[{x:2,y:3}]}],
  ['volume','_volume',{mode:'freeform',dims:{l:1,w:1,h:1}},{dims:{l:1,w:1,h:1}}]
 ]) expect(G.evaluateMathViewManipulativeResponse({tool,state},{labToolData:{[ns]:fields}}).reason).toBe('invalid-actual');
});
it('keeps typed work available for new hub modes in a legacy host without the shared store',async()=>{
 await mount(window.AlloModules.MathView,{generatedContent:{id:'legacy',type:'math',data:{problems:[{id:'p',question:'Build 7',answer:'7',manipulativeResponse:{tool:'base10',state:{mode:'tenFrame',count:7}}}]}},isTeacherMode:false,setBase10Value:vi.fn(),setStemLabTool:vi.fn(),setStemLabTab:vi.fn(),setShowStemLab:vi.fn(),handleStudentInput:vi.fn()});
 expect(host.querySelector('[data-math-manipulative-response]')).toBeNull();expect(host.querySelector('textarea')).toBeTruthy();
});
