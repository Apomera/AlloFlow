import { beforeAll, beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { loadAlloModule } from './setup.js';
let api;
beforeAll(() => { window.React = window.React || {}; loadAlloModule('host_handlers_module.js'); loadAlloModule('export_handlers_module.js'); api = window.AlloModules.ExportHandlers; });
let clipboard;
beforeEach(() => { clipboard = vi.fn().mockResolvedValue(); vi.stubGlobal('navigator', { clipboard: { writeText: clipboard } }); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
const plan = () => ({ id: 'plan-a', type: 'lesson-plan', title: 'Saved fractions', config: { gradeLevel: '4th Grade' }, data: { essentialQuestion: 'How can we compare fractions?', objectives: ['Explain equal parts'], materialsNeeded: ['Fraction strips'], hook: 'Show two different wholes', directInstruction: 'Model equal-sized wholes', guidedPractice: 'Compare with a partner', independentPractice: 'Solve independently', closure: 'Explain your comparison', extensions: [{ title: 'Apply it', description: 'Compare real objects', guide: 'Prepare equal paper strips' }] } });
const translator = key => ({ 'lesson_plan.header_title': 'Lesson Plan', 'lesson_plan.topic_label': 'Topic', 'lesson_plan.grade_label': 'Grade', 'lesson_plan.grade_not_recorded': 'Not recorded' }[key] || key);
const deps = resource => ({ generatedContent: resource, sourceTopic: 'WRONG CURRENT TOPIC', gradeLevel: '12th Grade', t: translator, addToast: vi.fn(), warnLog: vi.fn() });

describe('complete saved lesson plan copy', () => {
  it('includes the question, every phase, extensions and attached teacher guides using saved metadata', async () => {
    const p = plan(), d = deps(p); await api.handleCopyToClipboard(d);
    const text = clipboard.mock.calls[0][0];
    for (const field of ['essentialQuestion','hook','directInstruction','guidedPractice','independentPractice','closure']) expect(text).toContain(p.data[field]);
    expect(text).toContain('Apply it'); expect(text).toContain('Compare real objects'); expect(text).toContain('Prepare equal paper strips');
    expect(text).toContain('Topic: Saved fractions'); expect(text).toContain('Grade: 4th Grade');
    expect(text).not.toContain('WRONG CURRENT TOPIC'); expect(text).not.toContain('12th Grade');
    expect(d.addToast).toHaveBeenCalledWith('Copied to clipboard.', 'success');
  });
  it('copies scalar lists and structured text without losing original saved data', async () => {
    const p = plan(); p.data.objectives = { en: 'Objective in English', es: 'Objetivo' }; p.data.materialsNeeded = 'Paper'; p.data.directInstruction = { text: 'Structured explanation' }; p.data.extensions = 'Try another example';
    const original = structuredClone(p); await api.handleCopyToClipboard(deps(p));
    expect(clipboard).toHaveBeenCalledOnce(); const text = clipboard.mock.calls[0][0];
    expect(text).toContain('Objective in English'); expect(text).toContain('Structured explanation'); expect(text).toContain('Paper'); expect(text).toContain('Try another example'); expect(text).not.toContain('[object Object]'); expect(p).toEqual(original);
  });
  it('retains legacy activities and assessment ideas', async () => {
    const p = plan(); p.data.activities = [{ name: 'Pair activity', description: 'Discuss the model', duration: '5 minutes' }]; p.data.assessmentIdeas = ['Exit ticket'];
    await api.handleCopyToClipboard(deps(p)); const text = clipboard.mock.calls[0][0];
    expect(text).toContain('Pair activity'); expect(text).toContain('Discuss the model'); expect(text).toContain('5 minutes'); expect(text).toContain('Exit ticket');
  });
  it('does not present missing saved grade as the current workspace grade', async () => {
    const p = plan(); p.config = {}; await api.handleCopyToClipboard(deps(p));
    expect(clipboard.mock.calls[0][0]).toContain('Grade: Not recorded'); expect(clipboard.mock.calls[0][0]).not.toContain('12th Grade');
  });
  it('reports clipboard failures and never reports a false success', async () => {
    clipboard.mockRejectedValue(new Error('Clipboard blocked')); const d = deps(plan()); await api.handleCopyToClipboard(d);
    expect(d.addToast).toHaveBeenCalledWith('Could not copy to clipboard.','error'); expect(d.addToast).not.toHaveBeenCalledWith('Copied to clipboard.','success');
  });
});
const appSource = readFileSync('AlloFlowANTI.txt','utf8');
function hostCallback(name, endMarker, scope) {
  const start = appSource.indexOf('  const ' + name + ' ='); const end = appSource.indexOf(endMarker,start);
  if(start<0||end<0) throw new Error('Missing host callback '+name);
  const handlers = window.AlloModules.HostHandlers(scope);
  return new Function('_alloHostHandlers',...Object.keys(scope),appSource.slice(start,end)+'\nreturn '+name+';')(()=>handlers,...Object.values(scope));
}
function printHost(resources) {
  const moduleExport = vi.spyOn(api,'handleExport').mockResolvedValue(true);
  const scope = { _resourceMutationStateRef:{current:{history:resources}}, _docPipeline:{}, addToast:vi.fn(), t:translator,
    generateFullPackHTML:vi.fn(), getExportableHistory:()=>resources, getSkippedResources:()=>['unrelated'],
    sourceTopic:'WRONG CURRENT TOPIC', studentResponses:{learner:'Private response'}, exportConfig:{includeLessonPlan:false,includeTeacherKey:true,assessmentMode:true,includeStudentResponses:true,annotations:['Other resource note']},history:resources,
    auditOutputAccessibility:vi.fn(), runAxeAudit:vi.fn(), alloBotRef:{}, warnLog:vi.fn(), safeDownloadBlob:vi.fn() };
  return {run:hostCallback('handleExport','  const downloadHtmlBlob =',scope),scope,moduleExport};
}
describe('saved lesson plan export actions',()=>{
  it('prints only the requested saved plan, including it despite global student-only export settings',async()=>{
    const p=plan(), other={id:'other',type:'quiz',data:{questions:[]}}, h=printHost([other,p]);
    await h.run('print',{lessonPlanId:p.id}); const [mode,options]=h.moduleExport.mock.calls[0];
    expect(mode).toBe('print');expect(options.getExportableHistory().map(item=>item.id)).toEqual([p.id]);expect(options.history).toHaveLength(1);
    expect(options.sourceTopic).toBe('Saved fractions');expect(options.exportConfig).toMatchObject({includeLessonPlan:true,includeTeacherKey:false,assessmentMode:false,includeStudentResponses:false,annotations:[]});expect(options.studentResponses).toEqual({});expect(options.getSkippedResources()).toEqual([]);
    expect(h.scope.exportConfig.includeLessonPlan).toBe(false);expect(p).toEqual(plan());
  });
  it('normalizes legacy scalar lists for the actual print renderer without mutating the plan',async()=>{
    const p=plan();p.data.objectives='Compare two fractions';p.data.materialsNeeded={en:'Fraction strips',es:'Tiras'};p.data.directInstruction={text:'Model the fractions'};
    const h=printHost([p]);await h.run('print',{lessonPlanId:p.id});const rendered=h.moduleExport.mock.calls[0][1].getExportableHistory()[0];
    expect(rendered.data.objectives).toEqual(['Compare two fractions']);expect(rendered.data.materialsNeeded).toEqual(['Fraction strips']);expect(rendered.data.directInstruction).toBe('Model the fractions');expect(p.data.materialsNeeded.es).toBe('Tiras');
  });
  it('renders the scoped saved lesson through the real print pipeline, preserving all phases and guides without duplicate or empty sections', async () => {
    window.React = window.React || {};
    loadAlloModule('doc_pipeline_module.js');
    const pipeline = window.AlloModules.createDocPipeline({
      callGemini: async () => '{}', callGeminiVision: async () => '{}', callImagen: async () => null,
      addToast: () => {}, t: translator, isRtlLang: () => false, updateExportPreview: () => {}, getDefaultTitle: () => 'Lesson Plan',
      state: { currentUiLanguage: 'English', isParentMode: false, isIndependentMode: false }
    });
    for (const withExtension of [true, false]) {
      const p = plan(); p.data.objectives = 'Explain equal parts'; p.data.materialsNeeded = { en: 'Fraction strips', es: 'Tiras' };
      p.data.directInstruction = { text: 'Model equal-sized wholes' };
      p.data.activities = [{ name: 'Legacy pair activity', description: 'Discuss recorded fraction models', duration: '7 minutes' }];
      p.data.assessmentIdeas = ['Legacy exit ticket'];
      if (withExtension) p.data.extensions[0].guide = { en: 'Prepare equal paper strips', es: 'Preparar tiras' };
      else delete p.data.extensions;
      const unrelated = { id: 'unrelated-quiz', type: 'quiz', title: 'Unrelated quiz', data: { questions: [{ question: 'PRIVATE UNRELATED QUESTION' }] } };
      const h = printHost([unrelated, p]);
      await h.run('print', { lessonPlanId: p.id });
      const options = h.moduleExport.mock.calls[0][1];
      expect(options.exportConfig.includeTeacherKey).toBe(false);
      const html = pipeline.generateFullPackHTML(options.getExportableHistory(), options.sourceTopic, false, options.studentResponses, options.exportConfig);
      const doc = new DOMParser().parseFromString(html, 'text/html');
      expect(doc.querySelectorAll('[id="plan-a"]')).toHaveLength(1);
      const rendered = doc.getElementById('plan-a').textContent;
      for (const text of ['How can we compare fractions?', 'Explain equal parts', 'Fraction strips', 'Show two different wholes', 'Model equal-sized wholes', 'Compare with a partner', 'Solve independently', 'Explain your comparison']) expect(rendered).toContain(text);
      for (const text of ['Legacy pair activity', 'Discuss recorded fraction models', '7 minutes', 'Legacy exit ticket']) expect(rendered).toContain(text);
      if (withExtension) {
        expect(rendered).toContain('Apply it'); expect(rendered).toContain('Compare real objects'); expect(rendered).toContain('Prepare equal paper strips');
      } else {
        expect(rendered).not.toContain('lesson_plan.extensions_header'); expect(rendered).not.toContain('lesson_plan.teacher_guide');
      }
      expect(doc.body.textContent).not.toContain('PRIVATE UNRELATED QUESTION');
      expect(doc.body.textContent).not.toContain('Private response'); expect(doc.body.textContent).not.toContain('WRONG CURRENT TOPIC');
      expect(doc.body.textContent).not.toContain('[object Object]'); expect(doc.getElementById('unrelated-quiz')).toBeNull();
      expect(p.data.materialsNeeded.es).toBe('Tiras');
      h.moduleExport.mockRestore();
    }
  });
  it('keeps general pack export unchanged when no specific plan was requested',async()=>{
    const p=plan(),h=printHost([p]);await h.run('html');const options=h.moduleExport.mock.calls[0][1];
    expect(options.getExportableHistory).toBe(h.scope.getExportableHistory);expect(options.exportConfig).toBe(h.scope.exportConfig);expect(options.sourceTopic).toBe(h.scope.sourceTopic);
  });
  it('does not export another resource when the requested plan is deleted or duplicated',async()=>{
    for(const resources of [[],[plan(),plan()]]){
      const h=printHost(resources);expect(await h.run('print',{lessonPlanId:'plan-a'})).toBe(false);expect(h.moduleExport).not.toHaveBeenCalled();expect(h.scope.addToast).toHaveBeenCalled();h.moduleExport.mockRestore();
    }
  });
  it('copies the canonical saved plan and refuses a deleted or ambiguous active plan',async()=>{
    const p=plan();const invoke=history=>hostCallback('handleCopyToClipboard','    const _builderOpenerElRef',{
      generatedContent:{...p,data:{hook:'Stale visible snapshot'}},_resourceMutationStateRef:{current:{history}},isParentMode:false,isIndependentMode:false,addToast:vi.fn(),t:translator,warnLog:vi.fn()
    })();
    await invoke([p]);expect(clipboard.mock.calls[0][0]).toContain(p.data.directInstruction);expect(clipboard.mock.calls[0][0]).not.toContain('Stale visible snapshot');
    clipboard.mockClear();await invoke([]);await invoke([p,p]);expect(clipboard).not.toHaveBeenCalled();
  });
});