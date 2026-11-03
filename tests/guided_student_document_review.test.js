import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const source = readFileSync('view_export_preview_source.jsx', 'utf8');
const code = source.slice(source.indexOf('function _removeStudentPackageTeacherSections'), source.indexOf('function ExportPreviewView('))
  + source.slice(source.indexOf('function GuidedStudentDocumentReview('), source.indexOf('// ─── updateExportPreview (extracted'));
const transformed = transformSync(code, { plugins: ['@babel/plugin-transform-react-jsx'], configFile: false, babelrc: false }).code;
const { projection, Review, removeTeacherSections } = new Function('React', transformed + '\nreturn { projection: _guidedStudentDocumentSnapshot, Review: GuidedStudentDocumentReview, removeTeacherSections: _removeStudentPackageTeacherSections };')(React);
const student = '<article>Student passage</article>';
const teacher = '<div class="page-break"></div><div class="teacher-view"><h1>Teacher key</h1><p class="answer-key">Correct answer</p></div>';
const clean = (html, bodyAttrs = '') => {
  const doc = new DOMParser().parseFromString('<html><body ' + bodyAttrs + '>' + html + '</body></html>', 'text/html');
  return { doc, clone: doc.documentElement.cloneNode(true) };
};
let root;
afterEach(() => { if (root) React.act(() => root.unmount()); root = null; document.body.innerHTML = ''; });

describe('Guided review uses the contents of the student document', () => {
  it('reports a print appendix from the edited document while showing only student pages', () => {
    const draft = clean(student + teacher + '<script>example()</script>');
    const result = projection(draft, 'print', { includeTeacherKey: false });
    expect(result.hasKey).toBe(true);
    const pages = new DOMParser().parseFromString(result.html, 'text/html');
    expect(pages.body.textContent).toBe('Student passage');
    expect(pages.querySelector('.page-break,.answer-key,script')).toBeNull();
    expect(draft.doc.querySelector('.answer-key')).not.toBeNull();
    expect(projection(clean(student), 'print', { includeTeacherKey: true }).hasKey).toBe(false);
    expect(projection(clean(student + teacher), 'print', { assessmentMode: true }).hasKey).toBe(false);
    expect(projection(clean(student + teacher, 'data-alloflow-word-wall-print="economical"'), 'print', {}).hasKey).toBe(false);
  });
  it('uses the same teacher-section removal as the IMS exporter', () => {
    const html = student + teacher + '<aside data-allo-teacher-only>Private notes</aside>';
    const draft = clean(html), packaged = clean(html);
    expect(removeTeacherSections(packaged.clone)).toBeGreaterThan(0);
    const review = projection(draft, 'lms', {});
    expect(review.hasKey).toBe(false);
    expect(new DOMParser().parseFromString(review.html, 'text/html').body.textContent).toBe(packaged.clone.querySelector('body').textContent);
    expect(review.html).not.toContain('Correct answer');
    expect(review.html).not.toContain('Private notes');
  });
  it('requires a loaded student preview and an explicit confirmation for the current request', () => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    const node = document.createElement('div'), frame = document.createElement('iframe');
    document.body.append(node, frame); root = createRoot(node);
    frame.contentDocument.body.innerHTML = student + teacher;
    frame.contentDocument.body.setAttribute('data-allo-preview-pending', '1');
    const request = { route: 'print', key: 'A' }, confirm = vi.fn(() => true), close = vi.fn();
    const props = { request, currentKey: 'A', frameRef: { current: frame }, config: {}, t: () => '', confirm, close, dismiss: vi.fn(),
      getClean: () => ({ doc: frame.contentDocument, clone: frame.contentDocument.documentElement.cloneNode(true) }) };
    const render = extra => React.act(() => root.render(React.createElement(Review, { ...props, ...extra })));
    const confirmButton = () => node.querySelector('button');
    render({});
    expect(confirmButton().disabled).toBe(true);
    frame.contentDocument.body.removeAttribute('data-allo-preview-pending');
    React.act(() => frame.dispatchEvent(new Event('alloflow-builder-document-written')));
    const preview = node.querySelector('iframe');
    expect(preview.getAttribute('sandbox')).toBe('');
    expect(confirmButton().disabled).toBe(true);
    React.act(() => preview.dispatchEvent(new Event('load')));
    expect(confirm).not.toHaveBeenCalled();
    React.act(() => confirmButton().click());
    expect(confirm).toHaveBeenCalledWith(request, true);
    expect(close).toHaveBeenCalledOnce();
    render({ currentKey: 'B' });
    expect(confirmButton().disabled).toBe(true);
    expect(node.querySelector('iframe')).toBeNull();
  });
});

describe('Guided Start teaching route', () => {
  const banner = readFileSync('view_guided_mode_banner_source.jsx', 'utf8');
  const code = banner.slice(banner.indexOf('  const performStartTeaching ='), banner.indexOf('  const focusReadinessChecklist'));
  const request = banner.slice(banner.indexOf('  const requestStartTeaching ='), banner.indexOf('  const completeGuidedRun ='));
  const start = new Function('deliverySetting', 'documentRoute', 'canReviewDocument', 'openGuidedDocumentReview', 'setPendingReadinessAction', 'hasLearnerLink', 'previewGuidedStudentAssignment', 'latestLessonPlanItem', 'openGuidedHistoryItem', 'openGuidedDocumentBuilder', 'startGuidedLiveSession', 'guidedBusy', 'openReadinessGate', code + ';const readinessRemainingItems = [{}];' + request + ';requestStartTeaching(); return canStartTeaching;');
  it.each([false, true])('opens Live setup even when a learner link exists (%s)', hasLink => {
    const setup=vi.fn(), other=vi.fn(), dismiss=vi.fn();
    expect(start('live',null,false,other,dismiss,hasLink,other,{},other,other,setup,false)).toBe(true);
    expect(dismiss).toHaveBeenCalledWith(null);
    expect(setup).toHaveBeenCalledOnce();
    expect(other).not.toHaveBeenCalled();
  });
  it('keeps the readiness gate for unfinished homework delivery', () => {
    const gate=vi.fn(), open=vi.fn();
    expect(start('take-home',null,false,open,open,true,open,null,open,open,open,false,gate)).toBe(true);
    expect(gate).toHaveBeenCalledWith('teach');
    expect(open).not.toHaveBeenCalled();
  });
  it('does not offer an unrelated action when Live setup is unavailable', () => {
    const other=vi.fn();
    expect(start('live',null,false,other,other,true,other,{},other,other,undefined,false)).toBe(false);
    expect(other).not.toHaveBeenCalled();
  });
});

describe('Live readiness follows the active session', () => {
 const bannerCode=readFileSync('view_guided_mode_banner_module.js','utf8');
 it('ignores homework evidence, requires a running session and resets manual review for a new session',()=>{
  global.IS_REACT_ACT_ENVIRONMENT=true;window.React=React;window.AlloModules={};new Function(bannerCode)();
  const Banner=window.AlloModules.GuidedModeBanner.GuidedModeBanner;
  const host=document.createElement('div');document.body.appendChild(host);root=createRoot(host);localStorage.clear();
  const steps=[{id:'source-input',label:'Source'},{id:'package-deliver',label:'Deliver'},{id:'_final',label:'Ready'}];
  const setup=vi.fn(), homework=vi.fn();
  let props={GUIDED_STEPS:steps,allGuidedSteps:steps,GUIDED_TOUR_MAP:{},guidedStep:2,history:[],inputText:'A current passage.',t:()=>'',
   guidedCompletedIds:[],guidedSkippedIds:[],guidedCreatedHistoryIds:[],wordSoundsHistory:[],markGuidedStepDone:()=>{},
   setGuidedStep:()=>{},handleExitGuidedMode:()=>{},handleGuidedSkip:()=>{},setShowGuidedTip:()=>{},tourSteps:[],getDefaultTitle:x=>x,
   guidedDeliverySetting:'live',guidedDeliveryGroups:[],startGuidedLiveSession:setup,createGuidedHomeworkShare:homework,previewGuidedStudentAssignment:homework,
   canPreviewGuidedStudentAssignment:true,guidedDeliveryEvidence:{learnerLink:{id:'homework'},shareCreated:true,studentPreviewed:true,exportCreated:true}};
  const render=extra=>{props={...props,...extra};React.act(()=>root.render(React.createElement(Banner,props)));};
  const check=id=>host.querySelector('[data-readiness-item="'+id+'"] input');
  render({});
  expect(check('delivery').checked).toBe(false);expect(check('delivery').disabled).toBe(true);expect(check('learner-view').checked).toBe(false);expect(check('learner-view').disabled).toBe(true);
  expect([...host.querySelectorAll('button')].some(b=>/Create learner link|Test student link|Preview learner view/.test(b.textContent))).toBe(false);
  React.act(()=>[...host.querySelectorAll('.allo-guided-readiness-fixes button')].find(b=>b.textContent==='Live session').click());expect(setup).toHaveBeenCalledOnce();expect(homework).not.toHaveBeenCalled();
  render({guidedLiveSessionKey:'session-A',guidedDeliveryEvidence:{...props.guidedDeliveryEvidence,liveStarted:true}});
  expect(check('delivery').checked).toBe(true);expect(check('learner-view').disabled).toBe(false);expect(check('learner-view').checked).toBe(false);
  React.act(()=>check('learner-view').click());expect(check('learner-view').checked).toBe(true);
  render({guidedLiveSessionKey:'session-B'});expect(check('learner-view').checked).toBe(false);
  render({guidedLiveSessionKey:''});expect(check('delivery').checked).toBe(false);expect(check('learner-view').disabled).toBe(true);
 });
});

describe('Guided host Live evidence',()=>{
 const host=readFileSync(process.env.ALLO_GUIDED_HOST_CANDIDATE || 'AlloFlowANTI.txt','utf8');
 const block=(a,b)=>host.slice(host.indexOf(a),host.indexOf(b,host.indexOf(a)));
 it('only completes Live delivery after a successful session with its actual code',()=>{
  let evidence={};const done=vi.fn();
  const complete=new Function('setGuidedDeliveryEvidence','markGuidedStepDone',
   "const guidedMode=true,GUIDED_DELIVERY_EVIDENCE_KEYS=['shareCreated','exportCreated','liveStarted'],guidedLessonScope='lesson-A',guidedDeliverySetting='live',guidedActiveSteps=[{id:'package-deliver'}],guidedStep=0;"+
   block('  const markGuidedDeliveryEvidence =','  const toggleGuidedStepId =')+';return completeGuidedDelivery;')(fn=>{evidence=fn(evidence);},done);
  complete('shareCreated');complete('exportCreated');complete('liveStarted');expect(done).not.toHaveBeenCalled();
  complete('liveStarted',null,'CLASS-A');expect(evidence.liveSessionCode).toBe('CLASS-A');expect(done).toHaveBeenCalledWith('package-deliver');
 });
 it('uses the code returned by the session creator and does not credit failures',async()=>{
  const done=vi.fn(),setCode=vi.fn();let result=true;
  const module={startClassSession:async deps=>{deps.setActiveSessionCode('CLASS-B');return result;}};
  const start=new Function('_alloEnsureAuthenticatedUser','setUser','warnLog','addToast','window','_alloPhaseOHandlersDeps','setActiveSessionCode','completeGuidedDelivery',block('  const startClassSession =','  const toggleSessionMode =')+';return startClassSession;')
   (async()=>({uid:'synthetic'}),()=>{},()=>{},()=>{},{AlloModules:{PhaseOHandlers:module}},()=>({}),setCode,done);
  await start();expect(setCode).toHaveBeenCalledWith('CLASS-B');expect(done).toHaveBeenCalledWith('liveStarted',null,'CLASS-B');
  done.mockClear();result=false;await start();expect(done).not.toHaveBeenCalled();
 });
 it('withholds old session evidence when the session ends or the code changes',()=>{
  const expression=host.split(/\r?\n/).find(line=>line.trim().startsWith('liveStarted: !!')).trim().replace(/^liveStarted: /,'').replace(/,$/,'');
  const check=new Function('activeSessionCode','guidedDeliveryEvidence','guidedLessonScope','return '+expression);
  const evidence={liveStarted:true,liveSessionCode:'CLASS-A',lessonScopes:{liveStarted:'lesson-A'}};
  expect(check('CLASS-A',evidence,'lesson-A')).toBe(true);expect(check('CLASS-B',evidence,'lesson-A')).toBe(false);expect(check('',evidence,'lesson-A')).toBe(false);expect(check('CLASS-A',evidence,'lesson-B')).toBe(false);
 });
});
