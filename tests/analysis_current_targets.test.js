import {afterEach,beforeAll,describe,it,expect,vi} from 'vitest';
import {createRequire} from 'node:module';import {resolve} from 'node:path';import {loadAlloModule} from './setup.js';
const require=createRequire(import.meta.url),React=require(resolve('desktop/web-app/node_modules/react'));
const {createRoot}=require(resolve('desktop/web-app/node_modules/react-dom/client')),{act}=require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let AnalysisView,root,container;
beforeAll(()=>{global.React=window.React=React;global.IS_REACT_ACT_ENVIRONMENT=true;loadAlloModule('instructional_context_module.js');loadAlloModule(resolve(process.env.CLASSROOM_RECOVERY_CANDIDATES||'.','view_analysis_module.js'));AnalysisView=window.AlloModules.AnalysisView;});
afterEach(()=>{if(root)act(()=>root.unmount());root=null;container?.remove();container=null;});
function makeProps(data = {}, overrides = {}) {
  return {
    generatedContent: { id: 'analysis-a', type: 'analysis', data: {
      analysisSourceVersion: 1,
      originalText: 'The fox jupms over the lazy dog.', rawEnglishText: 'The fox jupms over the lazy dog.',
      sourceLanguage: 'English', reportLanguage: 'English',
      readingLevel: { range: '5th Grade', explanation: 'The original explanation.' }, concepts: ['Foxes'],
      localStats: { words: 7, sentences: 1, syllables: 8, score: 5.3 },
      accuracy: { rating: 'High', reason: 'Original reason.', discrepancies: ['The date is wrong.'], verifiedFacts: ['Foxes are mammals.'], citations: 'Original citation [1].' },
      grammar: ['Spelling: jupms'],
      sourceTranslations: { Spanish: 'El zorro salta sobre el perro perezoso.' },
      reportTranslations: { Spanish: {
        readingLevel: { range: 'UNSAFE REPLACEMENT GRADE', explanation: 'Explicación de la fuente.' }, concepts: ['Zorros'],
        accuracy: { rating: 'UNSAFE REPLACEMENT RATING', reason: 'Razón original.', discrepancies: ['La fecha es incorrecta.'], verifiedFacts: ['Los zorros son mamíferos.'], citations: 'Invented citation.' },
        grammar: ['Ortografía: jupms'],
      } }, ...data,
    } },
    isTeacherMode: true, isProcessing: false, isEditingAnalysis: false, sourceRefineInstruction: '', downloadingContentId: null,
    selectedDiscrepancies: new Set([0]), selectedGrammarErrors: new Set([0]), analysisEditorRef: { current: null },
    toggleDiscrepancySelection: vi.fn(), toggleGrammarErrorSelection: vi.fn(), setGeneratedContent: vi.fn(), setGenerationStep: vi.fn(),
    setIsProcessing: vi.fn(), setInputText: vi.fn(), setSelectedGrammarErrors: vi.fn(), setSourceRefineInstruction: vi.fn(),
    handleAiRefineSource: vi.fn(), handleAnalysisTextChange: vi.fn(), handleAutoCorrectSource: vi.fn(), handleDownloadAudio: vi.fn(),
    handleFormatText: vi.fn(), handleToggleIsEditingAnalysis: vi.fn(), onCorrectAnalysisText: vi.fn(async () => true), addToast: vi.fn(), callGemini: vi.fn(), warnLog: vi.fn(),
    onUpdateResource: vi.fn(), t: key => key, formatInlineText: text => text, renderFormattedText: text => text,
    splitReferencesFromBody: text => ({ body: text, references: '' }),
    BilingualFieldRenderer: props => React.createElement('span', null, props.text), SourceReferencesPanel: () => null,
    ...overrides,
  };
}

function render(props) {
  if (!root) {
    container = document.createElement('div'); document.body.appendChild(container);
    root = createRoot(container);
  }
  act(() => root.render(React.createElement(AnalysisView, props)));
  return container;
}
function selectReport(language) {
  act(() => {
    const select = container.querySelector('[aria-label="Report language"]');
    select.value = language; select.dispatchEvent(new Event('change', { bubbles: true }));
  });
}
const buttons = () => [...container.querySelectorAll('button')];
const fixGrammar = () => buttons().find(button => button.textContent.includes('analysis.fix_grammar_button'));


const button=label=>[...container.querySelectorAll('button')].find(b=>b.textContent===label);
const click=label=>{const b=button(label);expect(b).toBeTruthy();act(()=>b.click());};
const freeze=o=>{if(o&&typeof o==='object'){Object.values(o).forEach(freeze);Object.freeze(o);}return o;};
const targetProps=(data={},other={})=>makeProps({analysisTargets:{grade:'5th Grade',dok:'Level 2'},depthOfKnowledge:{level:2,reason:'Use concepts',ideas:['Discuss']},...data},{currentAnalysisTargets:{grade:'2nd Grade',dok:'Level 4'},onCheckSourceLevel:vi.fn(),onGenerateFromIdea:vi.fn(),...other});
describe('view-only analysis target comparison',()=>{
 it('changes displayed grade and DOK comparisons without mutating saved report or invoking generation',()=>{
  const p=targetProps(),original=JSON.stringify(p.generatedContent);freeze(p.generatedContent);render(p);const hadLevelCheck=!!button('Check level');
  expect(container.querySelector('[data-grade-fit]').getAttribute('data-grade-fit')).toBe('within');expect(container.querySelector('[data-dok-target]').getAttribute('data-dok-target')).toBe('2');
  click('Compare with current targets');expect(container.textContent).toContain('saved report is unchanged');expect(container.querySelector('[data-grade-fit]').getAttribute('data-grade-fit')).toBe('above');expect(container.querySelector('[data-dok-target]').getAttribute('data-dok-target')).toBe('4');
  expect(button('Check level')).toBeFalsy();expect(JSON.stringify(p.generatedContent)).toBe(original);
  for(const key of ['setGeneratedContent','onUpdateResource','callGemini','onCheckSourceLevel','onGenerateFromIdea'])expect(p[key]).not.toHaveBeenCalled();
  click('Show saved targets');expect(container.querySelector('[data-dok-target]').getAttribute('data-dok-target')).toBe('2');expect(!!button('Check level')).toBe(hadLevelCheck);
 });
 it('resets comparison when target settings or the report change',()=>{
  const p=targetProps();render(p);click('Compare with current targets');render({...p,currentAnalysisTargets:{grade:'8th Grade',dok:'Level 3'}});expect(button('Compare with current targets')).toBeTruthy();
  click('Compare with current targets');render({...p,generatedContent:{...p.generatedContent,id:'different-report'}});expect(button('Compare with current targets')).toBeTruthy();
 });
 it('omits comparison for identical settings and unsupported English formula comparisons',()=>{
  render(targetProps({}, {currentAnalysisTargets:{grade:'5th Grade',dok:'Level 2'}}));expect(button('Compare with current targets')).toBeFalsy();
  render(targetProps({sourceLanguage:'Spanish'}));click('Compare with current targets');expect(container.querySelector('[data-grade-fit]')).toBeNull();expect(container.textContent).toContain('Readability formulas measure English text only');
 });
 it('permits comparing a legacy report without saved targets and never invents a missing grade score',()=>{
  render(targetProps({analysisTargets:undefined,localStats:null}));click('Compare with current targets');expect(container.querySelector('[data-grade-fit]')).toBeNull();expect(container.querySelector('[data-dok-target]').getAttribute('data-dok-target')).toBe('4');
 });
});
