// Review reproductions assert the observed behavior, not the desired fix.
import { beforeAll, afterEach, afterAll, it, expect, vi } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { loadAlloModule } from '../../tests/setup.js';
import { React, ReactDOMClient, makeCtx, resetStemLab, loadTool } from '../../tests/helpers/stem_widgets_smoke_harness.js';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host, G;
const findings = {};
beforeAll(() => {
  window.React = globalThis.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('math_manipulative_grader_module.js'); loadAlloModule('view_math_module.js'); loadAlloModule('generation_helpers_module.js');
  G = window.AlloModules.MathManipulativeGrader;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); });
afterAll(() => writeFileSync('reports/manipulatives-review-2026-09-07/reproductions.json', JSON.stringify(findings, null, 2)+'\n'));
async function mount(Component, props) {
  host = document.createElement('div'); document.body.appendChild(host); root = ReactDOMClient.createRoot(host);
  await act(async () => root.render(React.createElement(Component, props)));
}
it('a real base-ten button updates the Lab store, while the MathView grader still reads the old value', async () => {
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
  expect(evaluation.correct).toBe(false);
  findings.liveBase10 = { visibleStore:latest._manipulatives.b10, checker:evaluation };
});
it('the four other migrated basic tools are also invisible to their direct-state checker', () => {
  const cases = [
    ['coordinate',{points:[{x:2,y:3}]},{gridPoints:[],labToolData:{_coordGrid:{gridPoints:[{x:2,y:3}]}}}],
    ['fractions',{numerator:3,denominator:8},{fractionPieces:{numerator:0,denominator:8},labToolData:{_fractions:{pieces:{numerator:3,denominator:8}}}}],
    ['numberline',{markers:[{value:5}]},{numberLineMarkers:[],labToolData:{_numberline:{markers:[{value:5}]}}}],
    ['volume',{dims:{l:3,w:2,h:2}},{cubeDims:{l:1,w:1,h:1},labToolData:{_volume:{dims:{l:3,w:2,h:2}}}}],
  ];
  findings.migratedStores = cases.map(([tool,state,snapshot]) => ({tool, result:G.evaluateMathViewManipulativeResponse({tool,state},snapshot)}));
  expect(findings.migratedStores.every(row=>!row.result.correct)).toBe(true);
});
it('a support-only artifact has a launch control in independent teacher mode but none in student mode', async () => {
  const props={ generatedContent:{id:'review',type:'math',data:{title:'Support',problems:[{id:'p',question:'Build 23',answer:'23',steps:[],manipulativeSupport:{tool:'base10',state:{tens:2,ones:3}}}]}},
    isTeacherMode:true,isIndependentMode:true,setShowStemLab:vi.fn(),setStemLabTool:vi.fn(),setStemLabTab:vi.fn(),setBase10Value:vi.fn() };
  await mount(window.AlloModules.MathView,props);
  const teacher=[...host.querySelectorAll('button')].filter(b=>b.textContent.includes('Open Visual Support')).length;
  await act(async()=>root.render(React.createElement(window.AlloModules.MathView,{...props,isTeacherMode:false})));
  const student=[...host.querySelectorAll('button')].filter(b=>b.textContent.includes('Open Visual Support')).length;
  findings.supportVisibility={teacher,student}; expect(teacher).toBe(1); expect(student).toBe(0);
});
it('the point comparator rounds away a material decimal error',()=>{
  const result=G.evaluateManipulativeResponse('dataPlot',{points:[{x:1.4,y:2.4}]},{points:[{x:1.1,y:2.1}]});
  expect(result.correct).toBe(true); findings.decimalPointMismatch=result;
});
it('base-ten grading ignores a thousand cube',()=>{
  const result=G.evaluateManipulativeResponse('base10',{thousands:0,hundreds:0,tens:0,ones:0},{thousands:1,hundreds:0,tens:0,ones:0});
  expect(result.correct).toBe(true);findings.ignoredThousands=result;
});
it('chemistry grading ignores which equation the coefficients belong to',()=>{
  const result=G.evaluateManipulativeResponse('chemBalance',{equation:'H2 + Cl2 -> HCl',coefficients:[2,1,2]},{equation:'H2 + O2 -> H2O',coefficients:[2,1,2]});
  expect(result.correct).toBe(true);findings.ignoredEquation=result;
});
it('unsupported target domains are not rejected as setup errors',()=>{
  findings.invalidDomains=[['volume',{dims:{l:-3,w:2,h:2}}],['protractor',{angle:-30}],['funcGrapher',{type:'does-not-exist',a:1,b:0,c:0}]].map(([tool,target])=>({tool,target,evaluation:G.evaluateManipulativeResponse(tool,undefined,target)}));
  expect(findings.invalidDomains.every(row=>row.evaluation.reason==='invalid-actual')).toBe(true);
});
it('the inline renderer misrepresents regrouped blocks, improper fractions, and reflex angles',()=>{
  const src=readFileSync('utils_pure_source.jsx','utf8');const match=src.match(/function _renderDiagramSvg\(tool, state, titleText\) \{[\s\S]*?\r?\n  return null;\r?\n\}/);
  const render=new Function('return ('+match[0]+')')();
  const blocks=render('base10',{ones:12,tens:0,hundreds:0},'Twelve ones');
  const fraction=render('fractions',{numerator:5,denominator:4},'Five quarters');
  const angle=render('protractor',{angle:270},'Reflex angle');
  findings.inlineModels={twelveOnes:{label:blocks.match(/<desc>(.*?)<\/desc>/)[1],drawnBlocks:(blocks.match(/<rect/g)||[]).length},fiveQuarters:fraction.match(/<desc>(.*?)<\/desc>/)[1],reflexAngle:angle.match(/<desc>(.*?)<\/desc>/)[1]};
  expect(findings.inlineModels.twelveOnes.drawnBlocks).toBe(9);expect(fraction).toContain('4/4');expect(angle).toContain('180 degrees');
});

it('Builder accepts text-only output as a ready Manipulative Response section', async()=>{
  let prompt;
  const result=await window.AlloModules.GenerationHelpers.generateMathAssessment([{id:'hands-on',type:'manipulative',quantity:1,directive:'Build 4 with blocks'}], {grade:'1',callGemini:async p=>{prompt=p;return JSON.stringify({problems:[{question:'2+2',expression:'2+2',answer:'4'}]});}});
  findings.builderHandsOn={status:result.content.preparation.status,hasTarget:!!result.content.problems[0].manipulativeResponse,promptRequestsTarget:prompt.includes('manipulativeResponse')};
  expect(findings.builderHandsOn).toEqual({status:'ready',hasTarget:false,promptRequestsTarget:false});
});
it('the geoboard labels an open segment as perimeter and announces itself as a fraction circle',async()=>{
  resetStemLab();const tool=loadTool('stem_lab/stem_tool_manipulatives.js','base10');
  function Lab(){return tool.render(makeCtx({toolData:{_manipulatives:{mode:'geoboard',soundEnabled:false,geoboardSegments:[{x1:0,y1:0,x2:3,y2:0}]}}}));}
  await mount(Lab);
  const panel=[...host.querySelectorAll('p')].find(p=>p.textContent==='Perimeter (units)').parentElement;
  findings.geoboard={label:host.querySelector('svg[role="img"]').getAttribute('aria-label'),openSegmentPerimeter:panel.textContent};
  expect(findings.geoboard.label).toBe('Fraction circle model');expect(panel.textContent).toContain('3.00');
});
it('fraction-bars hides Check after scoring a construction once',async()=>{
  resetStemLab();const tool=loadTool('stem_lab/stem_tool_manipulatives.js','base10');let latest;
  function Lab(){const [data,setData]=React.useState({_manipulatives:{mode:'fracBars',soundEnabled:false,fbSelected:{2:[0]},fbChallenge:{q:'Highlight one half',denom:2,target:1}}});latest=data;return tool.render(makeCtx({toolData:data,setToolData:setData}));}
  await mount(Lab);const check=()=>[...host.querySelectorAll('button')].find(b=>/Check/.test(b.textContent));
  expect(check()).toBeTruthy();await act(async()=>check().click());
  findings.fractionBarsScoringGuard={score:latest._manipulatives.score,canCheckAgain:!!check()}; expect(findings.fractionBarsScoringGuard).toEqual({score:{correct:1,total:1},canCheckAgain:false});
});
