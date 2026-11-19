// Detailed level check scores compare the passage with the target grade (-5..+5).
// 0 means "fits the target", so the view must say so, and a missing or malformed
// score must read "not reported", never 0.
import {afterEach,beforeAll,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';import {resolve} from 'node:path';import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')),{act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let AnalysisView,root,container;
beforeAll(()=>{global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;loadAlloModule('instructional_context_module.js');loadAlloModule(resolve(process.env.ANALYSIS_VIEW_CANDIDATE||'.','view_analysis_module.js'));AnalysisView=window.AlloModules.AnalysisView;});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;container?.remove();container=null;});
const TEXT='Photosynthesis lets plants use light energy to make glucose from carbon dioxide and water.';
function render(rubric){
  const api=window.AlloModules.InstructionalContext;
  const levelCheck={contentFingerprint:api.fingerprintText(TEXT),targetGradeLevel:'5th Grade',confirmedLevel:'5th Grade',nuanceSummary:'Summary.',rubric};
  const props={generatedContent:{id:'a1',type:'analysis',levelCheck,data:{analysisSourceVersion:1,originalText:TEXT,rawEnglishText:TEXT,sourceLanguage:'English',reportLanguage:'English',
      analysisTargets:{grade:'5th Grade',dok:'Level 2'},depthOfKnowledge:{level:2,reason:'Use concepts',ideas:[]},readingLevel:{range:'5th Grade',explanation:'Explanation.'},concepts:['Photosynthesis'],accuracy:{rating:'High',reason:'r',discrepancies:[],verifiedFacts:[]},grammar:[]}},
    isTeacherMode:true,isProcessing:false,isEditingAnalysis:false,sourceRefineInstruction:'',downloadingContentId:null,selectedDiscrepancies:new Set(),selectedGrammarErrors:new Set(),analysisEditorRef:{current:null},
    toggleDiscrepancySelection:vi.fn(),toggleGrammarErrorSelection:vi.fn(),setGeneratedContent:vi.fn(),setGenerationStep:vi.fn(),setIsProcessing:vi.fn(),setInputText:vi.fn(),setSelectedGrammarErrors:vi.fn(),setSourceRefineInstruction:vi.fn(),
    handleAiRefineSource:vi.fn(),handleAnalysisTextChange:vi.fn(),handleAutoCorrectSource:vi.fn(),handleDownloadAudio:vi.fn(),handleFormatText:vi.fn(),handleToggleIsEditingAnalysis:vi.fn(),onCorrectAnalysisText:vi.fn(async()=>true),
    addToast:vi.fn(),callGemini:vi.fn(),warnLog:vi.fn(),onUpdateResource:vi.fn(),onCheckSourceLevel:vi.fn(),t:key=>key,formatInlineText:text=>text,renderFormattedText:text=>text,
    splitReferencesFromBody:text=>({body:text,references:''}),BilingualFieldRenderer:p=>React.createElement('span',null,p.text),SourceReferencesPanel:()=>null};
  container=document.createElement('div');document.body.appendChild(container);root=createRoot(container);
  act(()=>root.render(React.createElement(AnalysisView,props)));
  const rows=[...container.querySelectorAll('[data-source-level-rubric] dt')];
  expect(rows.length).toBeGreaterThan(0);
  return rows;
}
it('explains a 0 as fitting the target, with the scale stated',()=>{
  const rows=render({vocabulary:{score:0,reason:'Lots of science words, right for grade 5.'},sentenceStructure:{score:3,reason:'Long sentences.'},conceptDensity:{score:-2,reason:'One idea.'}});
  expect(rows[0].textContent).toBe('Vocabulary: fits your target grade (0)');
  expect(rows[1].textContent).toBe('Sentence structure: harder than your target grade (+3)');
  expect(rows[2].textContent).toBe('Concept density: easier than your target grade (-2)');
  expect(container.querySelector('[data-rubric-scale]').textContent).toContain('0 means it fits your target');
});
it('shows a missing or malformed score as not reported, never as 0',()=>{
  const rows=render({vocabulary:{reason:'No score.'},sentenceStructure:{score:'High',reason:'Word.'},conceptDensity:{score:'+2',reason:'String number.'}});
  expect(rows[0].textContent).toBe('Vocabulary: score not reported');
  expect(rows[1].textContent).toBe('Sentence structure: score not reported');
  expect(rows[2].textContent).toBe('Concept density: harder than your target grade (+2)');
  expect(rows.map(r=>r.getAttribute('data-rubric-score'))).toEqual(['none','none','2']);
});
