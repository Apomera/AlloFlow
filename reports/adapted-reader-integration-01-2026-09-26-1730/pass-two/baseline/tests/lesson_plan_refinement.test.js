import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let React, createRoot, act, root, host, View, PlanView;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  ({ createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client')));
  act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = globalThis.React = React;
  loadAlloModule('resource_content_fingerprint_module.js');
  loadAlloModule('lesson_teaching_script_module.js');
  loadAlloModule('view_lesson_teaching_script_module.js');
  loadAlloModule('view_lesson_plan_module.js');
  View = window.AlloModules.LessonTeachingScriptView;
  PlanView = window.AlloModules.LessonPlanView;
});
afterEach(() => {
  if (root) act(() => root.unmount());
  root = null; host?.remove(); host = null;
  window.AlloModules.LessonTeachingScriptView = View;
  vi.restoreAllMocks(); vi.useRealTimers();
});
const materials = [{ id: 'fractions-cards', type: 'source', title: 'Fraction models', data: { text: 'Use models of equal wholes to compare halves and fourths.' } }, { id: 42, type: 'quiz', title: 'Fraction comparison check', data: { questions: [{ question: 'Which fraction is larger?', options: ['One half', 'One fourth'], answer: 'One half' }] } }];
function script(id = 'script-a', overrides = {}) {
  return {
    id, schemaVersion: 2, scope: 'segment', title: 'Compare fractions on a number line', createdAt: '2026-09-04T12:00:00.000Z', durationMinutes: 15,
    researchStatus: 'retrieved', warnings: ['Teaching guidance is not a verification of every generated step.'],
    inputSnapshot: { settings: { grade: '4th Grade', subject: 'mathematics', topic: 'Fractions', goal: 'Compare fractions' }, materialIds: ['fractions-cards'], materialTitles: [] },
    sources: [{ id: 'wwc', title: 'Developing Effective Fractions Instruction', url: 'https://ies.ed.gov/ncee/wwc/PracticeGuide/15', author: 'Institute of Education Sciences', publishedAt: '2010-09', retrievedAt: '2026-09-04', scope: 'K–8 fractions guidance, applied to this grade 4 lesson.', evidenceLevel: 'Moderate evidence', evidenceKind: 'content-specific', recommendations: [{ id: 'number-line', text: 'Use number lines as a central representation of fractions.', locator: 'Recommendation 2', evidenceLevel: 'Moderate evidence' }] }],
    steps: [1,2,3].map(index => ({ id: 'step-' + index, title: 'Compare fractions ' + index, minutes: 5, phase: 'directInstruction', teacherSays: 'Place one half on our shared number line. Explain how the equal spaces help you choose its position.', studentDoes: 'Learners explain their placements to a partner.', checkQuestion: 'How do you know where one half belongs?', possibleResponse: 'It is halfway between zero and one.', ifStruggling: 'Fold a paper strip into equal halves together.', ifReady: 'Compare one half with three fourths and explain.', resourceIds: ['fractions-cards'], recommendationIds: ['number-line'] })),
    ...overrides
  };
}
function plan(id = 'plan-a', versions = []) {
  return { id, type: 'lesson-plan', data: { essentialQuestion: 'How can we compare fractions?', objectives: ['Compare fractions using models'], directInstruction: 'Original teacher plan', teachingScripts: versions } };
}
const defaults = (overrides = {}) => ({ grade: '4th Grade', gradeSource: 'plan', subject: 'mathematics', subjectDetected: true, topic: 'Comparing fractions', language: 'English', standard: '', phases: ['directInstruction'], suggestedDuration: { segment: 15, lesson: 45 }, ...overrides });
function props(overrides = {}) {
  return { generatedContent: plan(), history: materials, isTeacherMode: true, isParentMode: false, isIndependentMode: false, t: () => '', capabilities: { canGenerate: true, canResearch: true }, defaultSettings: defaults(), onGenerateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onCancelTeachingScript: vi.fn(), onUpdateTeachingScript: vi.fn().mockResolvedValue({ ok: true }), onOpenTeachingMaterial: vi.fn(), ...overrides };
}
function mount(value) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host);
  act(() => root.render(value));
}
function button(label) {
  const found = Array.from(host.querySelectorAll('button')).find(node => node.textContent.trim() === label);
  if (!found) throw new Error('Button not found: ' + label);
  return found;
}
function click(label) { act(() => button(label).click()); }
function expand() { click('Teaching script+'); }
function field(label) {
  const found = Array.from(host.querySelectorAll('label')).find(node => node.textContent.trim() === label || node.textContent.trim().startsWith(label));
  if (!found) throw new Error('Field not found: ' + label);
  return found.htmlFor ? host.querySelector('[id="' + found.htmlFor + '"]') : found.querySelector('input,select,textarea');
}
function change(label, value) {
  const node = field(label), prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
  act(() => {
    Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, String(value));
    node.dispatchEvent(new Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
  });
}
async function submit() { await act(async () => host.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))); }
function deferred() { let resolve, reject; const promise = new Promise((yes,no) => {resolve=yes;reject=no;}); return {promise,resolve,reject}; }



describe('lesson refinement',()=>{
 it.each([['Is x = 2?','Is x < 2?'],['What is -3?','What is 3?'],['Is 1.5 equal to 15?','Is 15 equal to 15?']])('preserves mathematically distinct questions: %s', (teacherSays,checkQuestion)=>{
  const result=window.AlloModules.LessonTeachingScript.spokenSegments({steps:[{id:'a',teacherSays,checkQuestion}]});expect(result).toHaveLength(2);
 });
 it('preserves bracketed lesson content and removes only explicit delivery cues',()=>{
  const core=window.AlloModules.LessonTeachingScript;const teacherSays='Read [point A], [show your work] and [0, 1]. [Wait 10 seconds] [Teacher note: hold up the card]';
  expect(core.spokenText({steps:[{teacherSays}]})).toBe('Read [point A], [show your work] and [0, 1].');
 });
 it('requires explicit confirmation before deleting a version with audio',async()=>{
  const remove=vi.fn().mockResolvedValue({ok:true}),p=props({generatedContent:plan('plan-a',[script()]),onDeleteTeachingScript:remove});mount(React.createElement(View,p));expand();
  expect(host.textContent).toContain('Script versions are kept until you delete them');click('Delete this version');expect(remove).not.toHaveBeenCalled();click('Keep version');expect(remove).not.toHaveBeenCalled();click('Delete this version');await act(async()=>button('Delete version and audio').click());expect(remove).toHaveBeenCalledWith('plan-a','script-a',script());
 });
 it('shows voice, speed and recorded language and closes speech before opening settings',()=>{
  const open=vi.fn(),v=script();v.inputSnapshot.settings.language='French';mount(React.createElement(View,props({generatedContent:plan('plan-a',[v]),audioVoice:'Puck',audioSpeed:0.8,onOpenVoiceSettings:open})));expand();click('Spoken directions');expect(host.textContent).toContain('Voice: Puck');expect(host.textContent).toContain('Script language: French');expect(host.textContent).toContain('0.8×');click('Voice settings');expect(host.querySelector('dialog')).toBeNull();expect(open).toHaveBeenCalledOnce();
 });
 it('adds, edits, reorders and removes list items while preserving structured metadata and other saved fields',()=>{
  let saved={...plan('p',[script()]),data:{objectives:[{en:'Explain halves',fr:'Expliquer',id:'one'},{text:'Compare models',id:'two'}],materialsNeeded:[],teachingScripts:[script()],hook:'Keep this'}};
  const history=[];const base=props({isEditingLessonPlan:true,getRows:()=>2,handleLessonPlanChange:(field,value,index=null)=>{const data={...saved.data};if(index!==null){const list=Array.isArray(data[field])?[...data[field]]:[data[field]];list[index]=typeof value==='function'?value(list[index]):value;data[field]=list;}else data[field]=typeof value==='function'?value(data[field]):value;saved={...saved,data};history.push(saved);root.render(React.createElement(PlanView,{...base,generatedContent:saved}));}});
  mount(React.createElement(PlanView,{...base,generatedContent:saved}));change('Objective 1','Revised halves');expect(saved.data.objectives[0]).toEqual({en:'Revised halves',fr:'Expliquer',id:'one'});
  const named=name=>host.querySelector('[aria-label="'+name+'"]');act(()=>named('Move down: Objective 1').click());expect(saved.data.objectives.map(x=>x.id)).toEqual(['two','one']);act(()=>named('Remove: Objective 1').click());expect(saved.data.objectives.map(x=>x.id)).toEqual(['one']);click('Add objective');expect(saved.data.objectives).toHaveLength(2);expect(document.activeElement).toBe(field('Objective 2'));click('Add material');change('Material 1','Paper strips');expect(saved.data.materialsNeeded).toEqual(['Paper strips']);act(()=>named('Remove: Material 1').click());expect(saved.data.materialsNeeded).toEqual([]);expect(document.activeElement.textContent).toBe('Add material');expect(saved.data.hook).toBe('Keep this');expect(saved.data.teachingScripts).toHaveLength(1);
 });
 it('overview uses saved assessment and only whole-lesson script times',()=>{
  const p=plan('p',[script()]);p.data.assessmentIdeas=['Explain with a model'];p.data.successCriteria=[{statement:'Label equal intervals'}];mount(React.createElement(PlanView,props({generatedContent:p})));let view=host.querySelector('[data-lesson-overview]');expect(view.textContent).toContain('No whole-lesson script timing');expect(view.textContent).toContain('Label equal intervals');const whole=script('whole',{scope:'lesson'});p.data.teachingScripts.push(whole);act(()=>root.render(React.createElement(PlanView,props({generatedContent:p}))));view=host.querySelector('[data-lesson-overview]');expect(view.textContent).toContain('From the latest whole-lesson script');expect(view.textContent).toContain('Total: 15 minutes');
 });
});


describe('lesson follow-up safeguards', () => {
  const trackedVersion = () => {
    const v = script(), core = window.AlloModules.LessonTeachingScript;
    v.inputSnapshot.materialFingerprints = core.captureInputs(plan(), v.inputSnapshot.settings, [materials[0]]).materialFingerprints;
    return v;
  };
  it('distinguishes changed, missing, duplicate, and untracked source materials', () => {
    const core = window.AlloModules.LessonTeachingScript, v = trackedVersion();
    expect(core.getMaterialStatus(v, materials)).toEqual({changed:[],missing:[],ambiguous:[],untracked:false});
    const changed = {...materials[0],data:{text:'Now compare thirds with sixths.'}};
    expect(core.getMaterialStatus(v, [changed]).changed).toEqual(['fractions-cards']);
    expect(core.getMaterialStatus(v, []).missing).toEqual(['fractions-cards']);
    expect(core.getMaterialStatus(v, [materials[0],materials[0]]).ambiguous).toEqual(['fractions-cards']);
    expect(core.getMaterialStatus(script(), materials).untracked).toBe(true);
  });
  it('does not treat learner responses, display title edits, or unrelated resources as changed teaching content', () => {
    const core = window.AlloModules.LessonTeachingScript, v = trackedVersion();
    const current = [{...materials[0],title:'Renamed',data:{...materials[0].data,studentAnswers:{name:'Private learner response'}}},{id:'unrelated',type:'source',data:{text:'Something else'}}];
    expect(core.getMaterialStatus(v,current)).toEqual({changed:[],missing:[],ambiguous:[],untracked:false});
  });
  it('warns about the saved script materials even when generation selections change', () => {
    const v=trackedVersion(), rows=[{...materials[0],data:{text:'Changed reading content'}},materials[1]];
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[v]),history:rows})));expand();
    expect(host.textContent).toContain('Materials used for this script have changed');
    const check=Array.from(host.querySelectorAll('input[type=checkbox]')).find(node=>node.closest('label')?.textContent.includes('Fraction models'));
    act(()=>check.click());expect(host.textContent).toContain('Materials used for this script have changed');
    expect(host.textContent).not.toContain('three most recent');
  });
  it('shows the older-script tracking limitation without claiming the sources changed', () => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();
    expect(host.textContent).toContain('This older script has no recorded content versions');
    expect(host.textContent).not.toContain('Materials used for this script have changed');
  });
  it.each(['objectives','materialsNeeded'])('undo restores a removed %s item, metadata, position and focus', fieldName => {
    const original={en:'Explain halves',fr:'Expliquer les demis',id:'kept-id'};
    let saved={...plan('undo'),data:{objectives:[],materialsNeeded:[],[fieldName]:[original,{text:'Compare thirds',id:'two'}],hook:'Keep newer work'}};
    const base=props({isEditingLessonPlan:true,handleLessonPlanChange:(key,value,index=null)=>{const data={...saved.data};if(index!==null){const rows=[...data[key]];rows[index]=typeof value==='function'?value(rows[index]):value;data[key]=rows;}else data[key]=typeof value==='function'?value(data[key]):value;saved={...saved,data};root.render(React.createElement(PlanView,{...base,generatedContent:saved}));}});
    mount(React.createElement(PlanView,{...base,generatedContent:saved}));
    const noun=fieldName==='objectives'?'Objective':'Material';
    act(()=>host.querySelector('[aria-label="Remove: '+noun+' 1"]').click());expect(saved.data[fieldName]).toHaveLength(1);
    click('Undo removal');expect(saved.data[fieldName]).toEqual([original,{text:'Compare thirds',id:'two'}]);expect(document.activeElement.getAttribute('aria-label')).toBe(noun+' 1');expect(saved.data.hook).toBe('Keep newer work');
    act(()=>host.querySelector('[aria-label="Remove: '+noun+' 1"]').click());change(noun+' 1','Keep this later edit');expect(host.textContent).not.toContain('Undo removal');expect(saved.data[fieldName][0].text).toBe('Keep this later edit');
    act(()=>host.querySelector('[aria-label="Remove: '+noun+' 1"]').click());expect(saved.data[fieldName]).toEqual([]);click('Undo removal');expect(saved.data[fieldName][0].text).toBe('Keep this later edit');
  });
});


describe('teaching workflow navigation and feedback', () => {
  it('jumps directly to a step, keeps position on returning, and resets for another version', () => {
    const v=script(), p=props({generatedContent:plan('plan-a',[script('older'),v])});mount(React.createElement(View,p));expand();click('Spoken directions');change('Go to step','2');expect(host.querySelector('h4').textContent).toContain('3. Compare fractions 3');expect(button('Next step').disabled).toBe(true);click('Previous step');click('Full script');click('Spoken directions');expect(field('Go to step').value).toBe('1');click('Full script');change('Script version','older');click('Spoken directions');expect(field('Go to step').value).toBe('0');
  });
  it('aborts pending audio when jumping to a different step', async () => {
    const pending=deferred();let signal;const controller={summary:()=>({ready:0,total:6}),resolve:vi.fn((id,options)=>{signal=options.signal;return pending.promise}),dispose:vi.fn()};
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),createTeachingScriptAudio:()=>controller})));expand();click('Spoken directions');click('Play spoken block');expect(signal.aborted).toBe(false);change('Go to step','2');expect(signal.aborted).toBe(true);await act(async()=>pending.resolve('blob:late'));expect(host.textContent).not.toContain('Playing the highlighted');expect(field('Go to step').value).toBe('2');
  });
  it('identifies a short field with linked feedback and focuses the first issue', () => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();click('Edit script');change('Teacher says · 2','Short');const input=field('Teacher says · 2');expect(input.getAttribute('aria-invalid')).toBe('true');expect(document.getElementById(input.getAttribute('aria-describedby')).textContent).toBe('Use 60–16000 characters; currently 5.');expect(button('Save edits').disabled).toBe(true);click('Go to first issue');expect(document.activeElement).toBe(input);change('Teacher says · 2',script().steps[1].teacherSays);expect(input.getAttribute('aria-invalid')).toBe('false');expect(input.hasAttribute('aria-describedby')).toBe(false);expect(button('Save edits').disabled).toBe(false);
  });
  it('explains invalid minutes and points to timing when individual values are valid but totals differ', () => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();click('Edit script');change('Minutes 2','0');expect(field('Minutes 2').getAttribute('aria-invalid')).toBe('true');click('Go to first issue');expect(document.activeElement).toBe(field('Minutes 2'));change('Minutes 2','4');expect(field('Minutes 2').getAttribute('aria-invalid')).toBe('false');expect(host.textContent).toContain('Step total: 14 / 15 minutes');click('Go to first issue');expect(document.activeElement).toBe(field('Minutes 1'));expect(button('Save edits').disabled).toBe(true);
  });
  it('blocks an overlong recovered step title before attempting save', () => {
    const v=script();v.steps[0].title='x'.repeat(241);mount(React.createElement(View,props({generatedContent:plan('plan-a',[v])})));expand();click('Edit script');expect(field('Step title 1').getAttribute('aria-invalid')).toBe('true');expect(host.textContent).toContain('Use 2–240 characters; currently 241.');expect(button('Save edits').disabled).toBe(true);
  });
  it('prevents starting edits or playback while deletion is pending', async () => {
    const pending=deferred();mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),onDeleteTeachingScript:()=>pending.promise})));expand();click('Delete this version');click('Delete version and audio');expect(button('Edit script').disabled).toBe(true);expect(button('Spoken directions').disabled).toBe(true);await act(async()=>pending.resolve({ok:false,error:'The saved version changed.'}));expect(button('Edit script').disabled).toBe(false);expect(button('Spoken directions').disabled).toBe(false);expect(host.textContent).toContain('The saved version changed.');
  });
});


describe('lesson draft safety and full-script navigation', () => {
  it('keeps changed drafts through cancellation and Escape, and discards only after confirmation', () => {
    vi.useFakeTimers();window.sessionStorage.clear();const p=props({generatedContent:plan('plan-a',[script()]),draftScope:'discard-review'});mount(React.createElement(View,p));expand();click('Edit script');const text='Keep this deliberate teacher edit until the teacher explicitly chooses to discard these changes.';change('Teacher says · 1',text);click('Discard edits');expect(document.activeElement).toBe(button('Keep editing'));expect(field('Teacher says · 1').value).toBe(text);click('Keep editing');act(()=>vi.runAllTimers());expect(document.activeElement).toBe(button('Discard edits'));expect(field('Teacher says · 1').value).toBe(text);expect(Object.values(window.sessionStorage).some(raw=>raw.includes(text))).toBe(true);
    click('Discard edits');act(()=>button('Keep editing').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));act(()=>vi.runAllTimers());expect(field('Teacher says · 1').value).toBe(text);click('Discard edits');click('Discard changes');expect(document.activeElement).toBe(button('Edit script'));expect(Object.values(window.sessionStorage).some(raw=>raw.includes(text))).toBe(false);expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();window.sessionStorage.clear();
  });
  it('closes an unchanged draft directly, including equivalent minute input', () => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();click('Edit script');change('Minutes 1','5');click('Discard edits');expect(document.activeElement).toBe(button('Edit script'));expect(host.textContent).not.toContain('Discard your unsaved script changes?');
  });
  it('cancels an old discard confirmation when another edit is made', () => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();click('Edit script');change('Teacher says · 1','First changed wording');click('Discard edits');change('Teacher says · 1','A later edit that should require its own discard confirmation.');expect(host.textContent).not.toContain('Discard your unsaved script changes?');expect(field('Teacher says · 1').value).toContain('A later edit');click('Discard edits');expect(host.textContent).toContain('Discard your unsaved script changes?');
  });
  it('navigates to saved step headings and draft fields without losing edits', () => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();change('Go to script step','2');expect(document.activeElement.textContent).toContain('3. Compare fractions 3');expect(document.activeElement.hasAttribute('data-script-step-heading')).toBe(true);click('Edit script');change('Teacher says · 1','Preserve my teaching words while navigating between all of the different script steps.');change('Go to script step','1');expect(document.activeElement).toBe(field('Step title 2'));change('Go to script step','0');expect(document.activeElement).toBe(field('Step title 1'));expect(field('Teacher says · 1').value).toContain('Preserve my teaching words');
  });
  it('names changed, missing and ambiguous sources and does not open duplicate IDs', () => {
    const v=script(),core=window.AlloModules.LessonTeachingScript;v.inputSnapshot.materialIds=['fractions-cards','missing','42'];v.inputSnapshot.materialTitles=[{id:'fractions-cards',title:'Original fraction reading'},{id:'missing',title:'Fraction diagram'},{id:'42',title:'Comparison quiz'}];v.inputSnapshot.materialFingerprints=core.captureInputs(plan(),v.inputSnapshot.settings,[materials[0]]).materialFingerprints;v.steps[0].resourceIds=['42'];const open=vi.fn();mount(React.createElement(View,props({generatedContent:plan('plan-a',[v]),history:[{...materials[0],data:{text:'Changed teaching content'}},materials[1],{...materials[1]}],onOpenTeachingMaterial:open})));expand();const warning=host.querySelector('[data-script-material-warning]');expect(warning.textContent).toContain('Content changed: Original fraction reading');expect(warning.textContent).toContain('Not available: Fraction diagram');expect(warning.textContent).toContain('Duplicate resource ID: Comparison quiz');const first=host.querySelector('[data-teaching-step]');expect(first.textContent).toContain('Duplicate resource ID: Comparison quiz');expect(first.querySelector('button')).toBeNull();expect(open).not.toHaveBeenCalled();
  });
});


describe('lesson script export and history', () => {
  it('copies incomplete draft text without weakening the saved-script validation boundary', async () => {
    const core=window.AlloModules.LessonTeachingScript, format=vi.spyOn(core,'toPlainText').mockReturnValue(''), original=Object.getOwnPropertyDescriptor(navigator,'clipboard'), writeText=vi.fn().mockResolvedValue();Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText}});
    try {const saved=script(),before=JSON.stringify(saved),p=props({generatedContent:plan('plan-a',[saved])});mount(React.createElement(View,p));expand();click('Edit script');change('Teacher says · 1','Unfinished thought');change('Minutes 1','0');change('Check for understanding · 1','');expect(button('Save edits').disabled).toBe(true);await act(async()=>button('Copy text').click());const text=writeText.mock.calls[0][0];expect(text).toContain('UNSAVED DRAFT');expect(text).toContain('Teacher says: Unfinished thought');expect(text).toContain('Minutes: 0');expect(text).toContain('Check for understanding: ');expect(text).toContain('Teaching sources and evidence');expect(text).toContain('Developing Effective Fractions Instruction');expect(text).toContain('Possible learner response:');expect(text.split('\n').length).toBeGreaterThan(15);expect(format).not.toHaveBeenCalled();expect(JSON.stringify(saved)).toBe(before);expect(p.onUpdateTeachingScript).not.toHaveBeenCalled();}
    finally {if(original)Object.defineProperty(navigator,'clipboard',original);else delete navigator.clipboard;}
  });
  it('downloads an incomplete draft with a distinct filename and keeps the draft open', async () => {
    const create=URL.createObjectURL,revoke=URL.revokeObjectURL;let blob,name;URL.createObjectURL=vi.fn(value=>{blob=value;return 'blob:draft-copy'});URL.revokeObjectURL=vi.fn();vi.spyOn(window.HTMLAnchorElement.prototype,'click').mockImplementation(function(){name=this.download});
    try {mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();click('Edit script');change('Teacher says · 1','Short incomplete words');await act(async()=>button('Download text').click());const text=await new Promise(resolve=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.readAsText(blob)});expect(name).toBe('Compare fractions on a number line-draft.txt');expect(text).toContain('Short incomplete words');expect(text).toContain('UNSAVED DRAFT');expect(field('Teacher says · 1').value).toBe('Short incomplete words');expect(button('Save edits').disabled).toBe(true);act(()=>root.unmount());root=null;expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:draft-copy');}
    finally {URL.createObjectURL=create;URL.revokeObjectURL=revoke;}
  });
  it('prints the full saved script through the validated formatter', async () => {
    const format=vi.spyOn(window.AlloModules.LessonTeachingScript,'toPlainText').mockReturnValue('Saved teacher script\nPossible learner response: An example answer.');const popup={opener:window,document:{write:vi.fn(),close:vi.fn()},focus:vi.fn(),print:vi.fn()};vi.spyOn(window,'open').mockReturnValue(popup);mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();await act(async()=>button('Print script').click());expect(format).toHaveBeenCalled();expect(popup.document.write.mock.calls[0][0]).toContain('Possible learner response: An example answer.');expect(popup.opener).toBeNull();expect(popup.print).toHaveBeenCalledOnce();expect(host.textContent).toContain('The script print view is open.');
  });
  it('escapes draft markup in the print view and labels it as unfinished', async () => {
    const popup={opener:window,document:{write:vi.fn(),close:vi.fn()},focus:vi.fn(),print:vi.fn()};vi.spyOn(window,'open').mockReturnValue(popup);mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();click('Edit script');const raw='</pre><img src=x onerror="window.BAD=1">';change('Teacher says · 1',raw);await act(async()=>button('Print script').click());const html=popup.document.write.mock.calls[0][0],doc=new DOMParser().parseFromString(html,'text/html');expect(doc.querySelector('img,script')).toBeNull();expect(doc.querySelector('pre').textContent).toContain(raw);expect(doc.body.textContent).toContain('UNSAVED DRAFT');expect(doc.body.textContent).toContain('Possible learner response:');expect(field('Teacher says · 1').value).toBe(raw);
  });
  it('keeps a draft when print windows are blocked', async () => {
    vi.spyOn(window,'open').mockReturnValue(null);mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();click('Edit script');change('Teacher says · 1','Still unfinished');await act(async()=>button('Print script').click());expect(host.textContent).toContain('Allow the print window');expect(field('Teacher says · 1').value).toBe('Still unfinished');
  });
  it('distinguishes same-title versions by scope and duration and displays last editing time', () => {
    const a=script('segment'),b=script('whole',{scope:'lesson',durationMinutes:45,editedAt:'2026-09-19T12:30:00.000Z'});mount(React.createElement(View,props({generatedContent:plan('plan-a',[a,b])})));expand();const options=[...field('Script version').options].map(option=>option.textContent);expect(options[0]).toContain('Direct-instruction segment');expect(options[0]).toContain('15 minutes');expect(options[1]).toContain('Whole lesson');expect(options[1]).toContain('45 minutes');expect(host.textContent).toContain('Last edited: 2026-09-19 12:30:00 UTC');
  });
});


describe('lesson script keyboard actions and deletion reliability', () => {
  it('focuses the editor and makes save controls reachable without changing the draft', () => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()])})));expand();click('Edit script');expect(document.activeElement).toBe(field('Step title 1'));change('Teacher says · 1','An unfinished draft');click('Go to save and discard controls');const actions=host.querySelector('[role="region"][aria-label="Save or discard script edits"]');expect(document.activeElement).toBe(actions);expect(actions.textContent).toContain('complete every teaching field');expect(button('Save edits').disabled).toBe(true);expect(field('Teacher says · 1').value).toBe('An unfinished draft');
  });
  it('starts deletion confirmation on Keep and restores focus after Escape or Keep', () => {
    vi.useFakeTimers();const remove=vi.fn();mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),onDeleteTeachingScript:remove})));expand();click('Delete this version');expect(document.activeElement).toBe(button('Keep version'));expect(button('Keep version').closest('[role="group"]').getAttribute('aria-label')).toBe('Delete this script version and its saved audio?');act(()=>button('Keep version').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));act(()=>vi.runOnlyPendingTimers());expect(document.activeElement).toBe(button('Delete this version'));click('Delete this version');click('Keep version');act(()=>vi.runOnlyPendingTimers());expect(document.activeElement).toBe(button('Delete this version'));expect(remove).not.toHaveBeenCalled();
  });
  it('accepts only one deletion per pending request and blocks generation until it finishes', async () => {
    const wait=deferred(),remove=vi.fn(()=>wait.promise),generate=vi.fn();mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),onDeleteTeachingScript:remove,onGenerateTeachingScript:generate})));expand();click('Delete this version');const confirm=button('Delete version and audio');act(()=>{confirm.click();confirm.click();});expect(remove).toHaveBeenCalledTimes(1);await submit();expect(generate).not.toHaveBeenCalled();act(()=>button('Keep version').dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',bubbles:true})));expect(button('Keep version').disabled).toBe(true);await act(async()=>wait.resolve({ok:false,error:{message:'The saved version changed.'}}));expect(host.textContent).toContain('The saved version changed.');expect(button('Delete version and audio').disabled).toBe(false);
  });
  it.each([{ok:false,error:{message:'Could not save the deletion.'}},false])('keeps the version and reports a failed deletion: %j', async result => {
    const saved=script(),remove=vi.fn().mockResolvedValue(result);mount(React.createElement(View,props({generatedContent:plan('plan-a',[saved]),onDeleteTeachingScript:remove})));expand();click('Delete this version');await act(async()=>button('Delete version and audio').click());expect(host.textContent).toContain(result?.error?.message || 'The version could not be deleted. Try again.');expect(host.textContent).not.toContain('[object Object]');expect(field('Script version').value).toBe(saved.id);expect(button('Keep version').disabled).toBe(false);
  });
  it.each([null,'Connection lost'])('handles non-Error rejections without losing the confirmation: %j', async failure => {
    mount(React.createElement(View,props({generatedContent:plan('plan-a',[script()]),onDeleteTeachingScript:vi.fn().mockRejectedValue(failure)})));expand();click('Delete this version');await act(async()=>button('Delete version and audio').click());expect(host.textContent).toContain(failure || 'The version could not be deleted. Try again.');expect(button('Keep version').disabled).toBe(false);
  });
  it.each([true,false])('restores focus after deleting a version, with another version remaining: %s', async another => {
    const a=script('a'),b=script('b');let p;const remove=vi.fn(async()=>{p={...p,generatedContent:plan('plan-a',another?[a]:[])};root.render(React.createElement(View,p));return {ok:true};});p=props({generatedContent:plan('plan-a',another?[a,b]:[b]),onDeleteTeachingScript:remove});mount(React.createElement(View,p));expand();click('Delete this version');await act(async()=>button('Delete version and audio').click());expect(host.textContent).toContain('Script version and its saved audio deleted.');if(another){expect(document.activeElement).toBe(field('Script version'));expect(field('Script version').value).toBe('a');}else{expect(document.activeElement?.tagName).toBe('BUTTON');expect(document.activeElement?.getAttribute('aria-controls')).toMatch(/-settings$/);}
  });
});


function criterionEditFixture(criteria, latestCriteria = criteria) {
  const opened = plan('criteria-plan', [script()]); opened.data.successCriteria = criteria;
  let saved = { ...opened, data: { ...opened.data, successCriteria: latestCriteria, closure: 'Keep the latest closure' } };
  const hostSource = require('node:fs').readFileSync('host_handlers_source.jsx', 'utf8').replace(/__d\./g, '');
  const start = hostSource.indexOf('const handleLessonPlanChange ='), end = hostSource.indexOf('const handleQuizOptionClick =', start);
  if (start < 0 || end < 0) throw Error('Lesson persistence handler not found');
  let p;
  const update = (id, apply) => { expect(id).toBe('criteria-plan'); saved = apply(saved); root.render(React.createElement(PlanView, { ...p, generatedContent: saved })); return true; };
  const edit = new Function('generatedContent', 'onUpdateResource', hostSource.slice(start, end) + ';return handleLessonPlanChange;')(opened, update);
  p = props({ generatedContent: opened, isEditingLessonPlan: true, handleLessonPlanChange: edit }); mount(React.createElement(PlanView,p));
  return { get: () => saved, change(index, value) { const node=host.querySelector('[aria-label="Edit success criterion '+(index+1)+'"]');expect(node).toBeTruthy();act(()=>{Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(node,value);node.dispatchEvent(new Event('input',{bubbles:true}));}); } };
}

describe('lesson success criteria and overview reliability', () => {
  it.each(['I can explain equal parts', ['I can explain equal parts'], { statement: 'I can explain equal parts', id: 'parts' }, { en: 'I can explain equal parts', fr: 'Je peux expliquer' }, [{ statement: { en: 'I can explain equal parts', fr: 'Je peux expliquer' } }]])('shows legacy and structured criteria in the plan and overview: %j', criteria => {
    const p=plan();p.data.successCriteria=criteria;mount(React.createElement(PlanView,props({generatedContent:p})));expect(host.querySelector('[data-success-criteria="plan"]').textContent).toContain('I can explain equal parts');expect(host.querySelector('[data-lesson-overview]').textContent).toContain('I can explain equal parts');
  });
  it('edits nested criterion text through the real host handler while retaining newer metadata, translations and scripts', () => {
    const original={id:'equal-parts',source:'quiz',statement:{en:'I can explain equal parts',fr:'Je peux expliquer'},quizId:'quiz-a'};
    const latest={...original,statement:{...original.statement,fr:'Une traduction plus recente'},teacherNote:'Keep this note'};
    const h=criterionEditFixture([original],[latest]);h.change(0,'I can compare equal parts');expect(h.get().data.successCriteria[0]).toEqual({...latest,statement:{...latest.statement,en:'I can compare equal parts'}});expect(h.get().data.teachingScripts).toEqual([script()]);expect(h.get().data.closure).toBe('Keep the latest closure');expect(original.statement.en).toBe('I can explain equal parts');
  });
  it('edits a scalar criterion without inventing quiz links', () => {
    const h=criterionEditFixture('I can compare halves');h.change(0,'I can compare fourths');expect(h.get().data.successCriteria).toEqual(['I can compare fourths']);expect(host.textContent).toContain('These saved criteria have no quiz links');
  });
  it('preserves flat language fields and stable IDs when editing a legacy criterion', () => {
    const c={id:'parts',en:'I can compare halves',fr:'Je peux comparer',source:'objective',notes:['Keep']};const h=criterionEditFixture([c]);h.change(0,'I can compare fourths');expect(h.get().data.successCriteria).toEqual([{...c,en:'I can compare fourths'}]);
  });
  it('preserves null entries and targets the correct original criterion index', () => {
    const c={statement:'I can explain halves',id:'halves'};const h=criterionEditFixture([null,c,'Keep the last criterion']);h.change(1,'I can explain fourths');expect(h.get().data.successCriteria).toEqual([null,{...c,statement:'I can explain fourths'},'Keep the last criterion']);
  });
  it('keeps anonymous criteria separate from quiz mastery and retains linked Reteach behavior', () => {
    window.__alloCriterionRollup={byConcept:{undefined:{met:0,total:10},parts:{met:1,total:4}}};
    try {const p=plan(),reteach=vi.fn();p.data.successCriteria=['I can explain halves',{id:'parts',statement:{en:'I can label equal parts',fr:'Je peux nommer'},source:'quiz'}];mount(React.createElement(PlanView,props({generatedContent:p,handleActivateNextLesson:reteach})));const strip=host.querySelector('[data-success-criteria="plan"]');expect(strip.querySelectorAll('[data-criterion-mastery]')).toHaveLength(1);expect(strip.textContent).toContain('25% met (1/4)');click('Reteach');expect(reteach).toHaveBeenCalledWith(expect.objectContaining({nextTopic:'I can label equal parts',type:'Remediation'}),{synthetic:true});}finally{delete window.__alloCriterionRollup;}
  });
  it.each([{durationMinutes:16},{durationMinutes:undefined},{durationMinutes:300},{steps:[]},{steps:[{minutes:0}]},{steps:[{minutes:75}],durationMinutes:75}])('warns about the latest inconsistent timing without falling back to an older schedule: %j', invalid => {
    const p=plan('timing',[script('older',{scope:'lesson',title:'Old timing'}),script('newest',{scope:'lesson',...invalid})]);mount(React.createElement(PlanView,props({generatedContent:p})));const overview=host.querySelector('[data-lesson-overview]');expect(overview.textContent).toContain('latest whole-lesson script has incomplete or inconsistent timing');expect(overview.textContent).not.toContain('Total:');expect(overview.textContent).not.toContain('Old timing');
  });
  it('does not treat a schema-1 segment as a whole-lesson schedule', () => {
    const p=plan('legacy',[script('old',{schemaVersion:1,scope:'lesson'})]);mount(React.createElement(PlanView,props({generatedContent:p})));expect(host.querySelector('[data-lesson-overview]').textContent).toContain('No whole-lesson script timing');
  });
});
