import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let axe;
let AppliedChallengeView;
let root;
let host;
let latest;
let toasts;
let setGeneratedContentForTest;

const baseData = () => ({
  schemaVersion: 1,
  title: 'Water Access Decision',
  instructions: 'Use evidence and revise your reasoning.',
  selectionMode: 'manual',
  family: 'decide',
  agencyMode: 'co-framed',
  scope: 'standard',
  brief: {
    drivingQuestion: 'Which option best balances access and impact?',
    seedDirection: 'Compare at least two defensible options.',
    lockedLessonFacts: ['Gravity moves water downhill.'],
    openQuestions: ['Which sites are feasible?'],
    criteria: ['Use lesson evidence.'],
    constraints: ['Do not invent local findings.'],
    deliverable: 'A recommendation and revision note.',
    factLocked: true,
  },
  supports: {
    frameStarter: 'Option ___ is stronger because ___.',
    coachPrompts: ['What evidence supports the choice?'],
  },
  workspace: {
    workingQuestion: 'Which option best balances access and impact?',
    response: '',
  },
  coachHint: 'An earlier hint',
  feedback: {
    strength: 'An earlier strength',
    lessonConnectionCheck: 'Earlier lesson check',
    evidenceOrConstraintCheck: 'Earlier evidence check',
    nextStep: 'Earlier next step',
    status: 'developing',
  },
});

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  axe = require(resolve(modulesDir, 'axe-core'));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('applied_challenge_module.js');
  AppliedChallengeView = window.AlloModules.AppliedChallengeView;
});

beforeEach(() => sessionStorage.clear());

afterEach(() => {
  if (root) {
    act(() => root.unmount());
    root = null;
  }
  host?.remove();
  host = null;
  latest = null;
  toasts = [];
  setGeneratedContentForTest = null;
});

async function renderChallenge(options = {}) {
  const initial = { type: 'applied-challenge', id: options.id || 'challenge-1', data: options.data || baseData() };
  toasts = [];
  function Harness() {
    const [generatedContent, setGeneratedContent] = React.useState(initial);
    setGeneratedContentForTest = setGeneratedContent;
    latest = generatedContent;
    const handleNoteUpdate = React.useCallback((key, value) => {
      setGeneratedContent((previous) => {
        if (!previous || !['note-taking', 'anchor-chart', 'memory-aid', 'applied-challenge'].includes(previous.type)) return previous;
        const nextValue = typeof value === 'function' ? value(previous.data ? previous.data[key] : undefined) : value;
        return { ...previous, data: { ...(previous.data || {}), [key]: nextValue } };
      });
    }, []);
    return React.createElement(AppliedChallengeView, {
      generatedContent,
      handleNoteUpdate,
      isTeacherMode: options.teacher === true,
      learnerReadOnly: options.teacher === true,
      isProcessing: false,
      callGemini: options.recreateProvider && options.callGemini ? (...args) => options.callGemini(...args) : options.callGemini || null,
      addToast: (message, kind) => toasts.push({ message, kind }),
      gradeLevel: '8th Grade',
      activeProfileId: options.profile, previewMode: options.preview === true,
    });
  }
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  await act(async () => {
    root.render(React.createElement(Harness));
    await Promise.resolve();
  });
  if (!options.teacher && !options.focus && Array.from(host.querySelectorAll('button')).some(button => button.textContent === 'Show all steps')) await clickButton('Show all steps');
}

async function replaceChallenge(id, data) {
  await act(async () => {
    setGeneratedContentForTest({ type: 'applied-challenge', id, data });
    await Promise.resolve();
  });
}

async function typeInto(node, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
  await act(async () => {
    setter.call(node, value);
    node.dispatchEvent(new window.Event('input', { bubbles: true }));
    await Promise.resolve();
  });
}

async function chooseOption(node, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
  await act(async () => {
    setter.call(node, value);
    node.dispatchEvent(new window.Event('change', { bubbles: true }));
    await Promise.resolve();
  });
}

async function clickButton(label) {
  const button = Array.from(host.querySelectorAll('button')).find((item) => item.textContent.includes(label));
  expect(button, label).toBeTruthy();
  await act(async () => {
    button.dispatchEvent(new window.MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

describe('Applied Challenge Studio interactions', () => {
  it('links a chosen fact without writing student reasoning and focuses the new row', async () => {
    await renderChallenge();
    await clickButton('Connect to my evidence');
    expect(latest.data.evidenceLedger).toHaveLength(1);
    expect(latest.data.evidenceLedger[0]).toMatchObject({ claim: '', evidence: '', status: 'needs-check' });
    expect(latest.data.evidenceLedger[0].factId).toMatch(/^fact-/);
    expect(document.activeElement.id).toBe('aps-ledger-claim-' + latest.data.evidenceLedger[0].id);
    await clickButton('Connect to my evidence');
    expect(latest.data.evidenceLedger).toHaveLength(1);
    const revised = window.AlloModules.AppliedChallenge.normalize(latest.data);
    const oldRevision = revised.evidenceLedger[0].factRevision;
    revised.brief.lockedLessonFacts[0] = 'Water movement depends on the height difference.';
    await replaceChallenge('challenge-1', revised);
    expect(host.querySelector('[aria-label="Evidence row 1 source fact"]').value).toBe('');
    expect(host.textContent).toContain('This source fact changed or was removed.');
    await clickButton('Connect to my evidence');
    expect(latest.data.evidenceLedger).toHaveLength(1);
    expect(latest.data.evidenceLedger[0].factRevision).not.toBe(oldRevision);
  });

  it('brings evidence and detailed checks into the review and returns focus to an edit', async () => {
    const value=baseData();value.workspace={...value.workspace,questionAccepted:true,artifactUrl:'https://example.org/model',artifactDescription:'My model explains the two options.'};
    value.evidenceLedger=[{id:'review-row',claim:'LEDGER CLAIM SENTINEL',evidence:'LEDGER SUPPORT SENTINEL',tradeoff:'A limit'}];
    value.validationCycles=[{id:'review-check',source:'self',plan:{testQuestion:'PLAN SENTINEL'},observation:{evidence:'OBSERVATION SENTINEL'},decision:{action:'keep',reasoning:'DECISION SENTINEL'}}];
    await renderChallenge({data:value});await clickButton('5.');await clickButton('Review my response');
    expect(document.activeElement.id).toBe('aps-review-heading');
    for(const text of ['LEDGER CLAIM SENTINEL','LEDGER SUPPORT SENTINEL','PLAN SENTINEL','OBSERVATION SENTINEL','DECISION SENTINEL','My model explains the two options.'])expect(host.textContent).toContain(text);
    expect(host.textContent).not.toContain('Add a written response, or a link');
    await clickButton('Edit Build');expect(document.activeElement.id).toBe('applied-workspace-response');
  });

  it('has no serious or critical structural accessibility violations', async () => {
    await renderChallenge();
    const results = await axe.run(host, { rules: {
      'color-contrast': { enabled: false },
    } });
    const serious = results.violations
      .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
      .map((violation) => violation.id + ': ' + violation.help);
    expect(serious).toEqual([]);
  });

  it('persists workspace edits and retains earlier feedback in the active stage', async () => {
    await renderChallenge();
    await act(async () => [...host.querySelectorAll('button')].find(button => button.getAttribute('aria-label') === '3. Build').click());
    const response = host.querySelector('#applied-workspace-response');
    await typeInto(response, 'Recommend a feasibility study before choosing a site.');
    expect(latest.data.workspace.response).toContain('feasibility study');
    expect(latest.data.coachHint).toBe('');
    expect(latest.data.feedback.strength).toBe('An earlier strength');
    expect(host.textContent).toContain('Build · Step 3 of 5');
  });

  it('refreshes the artifact link when saved work is restored for the same resource', async () => {
    await renderChallenge();
    const updated = baseData(); updated.workspace.artifactUrl = 'https://example.org/restored-work';
    await replaceChallenge('challenge-1', updated);
    expect(host.querySelector('#applied-artifact-url').value).toBe('https://example.org/restored-work');
  });

  it('treats a first criteria note as current before the learner chooses a rating', async () => {
    await renderChallenge();
    const field = Array.from(host.querySelectorAll('textarea')).find(node => (node.getAttribute('aria-label') || '').includes('Criterion 1 evidence note'));
    expect(field).toBeTruthy();
    await typeInto(field, 'My draft compares the two possibilities.');
    const entry = Object.values(latest.data.criteriaCheck)[0];
    expect(entry).toMatchObject({ rating: 'pending', needsReview: false, note: 'My draft compares the two possibilities.' });
    expect(entry.revision).toBeTruthy();
  });

  it('adds, labels, persists, summarizes, and removes evidence ledger rows', async () => {
    await renderChallenge();
    await clickButton('Add evidence row');
    expect(latest.data.evidenceLedger).toHaveLength(1);
    expect(latest.data.coachHint).toBe('');
    expect(latest.data.feedback.strength).toBe('An earlier strength');

    await typeInto(host.querySelector('[aria-label="Evidence row 1 claim, option, or position"]'), 'A gravity-fed route is worth testing.');
    await typeInto(host.querySelector('[aria-label="Evidence row 1 evidence or lesson connection"]'), 'The lesson explains that gravity moves water downhill.');
    await chooseOption(host.querySelector('[aria-label="Evidence row 1 status"]'), 'assumption');
    await typeInto(host.querySelector('[aria-label="Evidence row 1 tradeoff, constraint, or uncertainty"]'), 'The local slope has not been measured.');

    expect(latest.data.evidenceLedger[0]).toMatchObject({
      claim: 'A gravity-fed route is worth testing.',
      evidence: 'The lesson explains that gravity moves water downhill.',
      status: 'assumption',
      tradeoff: 'The local slope has not been measured.',
    });
    expect(host.textContent).toContain('1 of 1 rows have a claim and written evidence notes');
    expect(host.textContent).toContain('1 assumption');

    const verifiedOption = host.querySelector('[aria-label="Evidence row 1 status"] option[value="verified"]');
    expect(verifiedOption.disabled).toBe(true);
    await clickButton('Remove evidence row 1');
    expect(latest.data.evidenceLedger).toEqual([]);
    expect(host.textContent).toContain('No ledger rows yet');
  });

  it('requires the teacher to unlock lesson facts before editing them', async () => {
    await renderChallenge({ teacher: true });
    await clickButton('Edit challenge');
    let facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    expect(facts.readOnly).toBe(true);
    await clickButton('Unlock facts to edit');
    facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    expect(facts.readOnly).toBe(false);
    await typeInto(facts, 'Updated lesson fact.');
    expect(latest.data.brief.lockedLessonFacts).toEqual(['Updated lesson fact.']);
    expect(latest.data.brief.factVerified).toBe(false);
    await clickButton('Lock lesson facts');
    facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    expect(facts.readOnly).toBe(true);
    await clickButton('Mark facts teacher verified');
    expect(latest.data.brief.factVerified).toBe(true);
    expect(host.textContent).toContain('Teacher-verified lesson facts');
    await clickButton('Unlock facts to edit');
    facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    await typeInto(facts, 'A later fact revision.');
    expect(latest.data.brief.factVerified).toBe(false);
  });

  it('returns verified ledger evidence to needs-check when a teacher changes lesson facts', async () => {
    const data = baseData();
    data.brief.factVerified = true;
    data.evidenceLedger = [{
      id: 'verified-row',
      claim: 'Gravity supports the route.',
      evidence: 'Gravity moves water downhill.',
      status: 'verified',
      tradeoff: 'The site slope is still unknown.',
    }];
    await renderChallenge({ teacher: true, data });
    expect(latest.data.evidenceLedger[0].status).toBe('verified');
    await clickButton('Edit challenge');
    await clickButton('Unlock facts to edit');
    const facts = Array.from(host.querySelectorAll('textarea')).find((item) => item.getAttribute('aria-label') === 'Teacher-checked lesson facts');
    await typeInto(facts, 'Revised lesson fact requiring a new evidence connection.');
    expect(latest.data.brief.factVerified).toBe(false);
    expect(latest.data.evidenceLedger[0].status).toBe('needs-check');
  });

  it('persists a complete student-owned Test–Observe–Decide cycle without changing the draft', async () => {
    const data = baseData();
    data.workspace.response = 'Recommend a measured pilot before committing to a full route.';
    await renderChallenge({ data });
    const originalResponse = latest.data.workspace.response;
    await clickButton('Start my own check');
    expect(latest.data.validationCycles).toHaveLength(1);
    expect(latest.data.feedback.strength).toBe('An earlier strength');

    await typeInto(host.querySelector('[aria-label="Check 1 test question"]'), 'Can the pilot satisfy the access criterion within the staffing limit?');
    await typeInto(host.querySelector('[aria-label="Check 1 change threshold"]'), 'Revise if one required shift remains uncovered.');
    await chooseOption(host.querySelector('[aria-label="Check 1 evidence form"]'), 'data');
    await chooseOption(host.querySelector('[aria-label="Check 1 outcome"]'), 'mixed');
    await typeInto(host.querySelector('[aria-label="Check 1 observed evidence"]'), 'The schedule covers weekdays but leaves one weekend shift open.');
    await chooseOption(host.querySelector('[aria-label="Check 1 decision"]'), 'revise');
    await typeInto(host.querySelector('[aria-label="Check 1 decision reasoning"]'), 'The evidence supports a smaller weekday pilot while weekend staffing is investigated.');
    await typeInto(host.querySelector('[aria-label="Check 1 revision summary"]'), 'Narrowed the first phase to weekdays.');

    expect(latest.data.workspace.response).toBe(originalResponse);
    expect(latest.data.validationCycles[0]).toMatchObject({
      source: 'self',
      plan: {
        methodId: 'strongest-alternative',
        evidenceMode: 'data',
        testQuestion: 'Can the pilot satisfy the access criterion within the staffing limit?',
      },
      observation: {
        outcome: 'mixed',
        evidence: 'The schedule covers weekdays but leaves one weekend shift open.',
      },
      decision: {
        action: 'revise',
        revisionSummary: 'Narrowed the first phase to weekdays.',
      },
    });
    expect(latest.data.validationCycles[0].completedAt).toBeTruthy();
    expect(host.textContent).toContain('1 of 1 checks complete');

    const results = await axe.run(host, { rules: { 'color-contrast': { enabled: false } } });
    expect(results.violations.filter((violation) => ['serious', 'critical'].includes(violation.impact))).toEqual([]);
  });

  it('saves one pressure test separately and marks it when the draft changes', async () => {
    const callGemini = vi.fn(async () => JSON.stringify({
      challenge: 'What if the selected site has insufficient slope for a gravity-fed route?',
      whyItMatters: 'The recommendation depends on a condition that has not been measured.',
      question: 'What evidence or fallback would make the recommendation more resilient?',
    }));
    const data = baseData();
    data.workspace.response = 'Recommend a gravity-fed route after a site feasibility check.';
    data.coachHint = '';
    data.feedback = null;
    await renderChallenge({ data, callGemini });
    await clickButton('Stress-test my draft');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(callGemini).toHaveBeenCalledTimes(1);
    expect(callGemini.mock.calls[0][0]).toContain('strongest alternative, a neglected tradeoff');
    expect(latest.data.workspace.response).toContain('gravity-fed route');
    expect(latest.data.stressTest).toMatchObject({
      challenge: 'What if the selected site has insufficient slope for a gravity-fed route?',
      whyItMatters: 'The recommendation depends on a condition that has not been measured.',
      question: 'What evidence or fallback would make the recommendation more resilient?',
    });
    expect(latest.data.stressTest.draftFingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(latest.data.stressTest.contextFingerprint).toMatch(/^[0-9a-f]{8}$/);
    expect(host.textContent).toContain('Current draft');

    await clickButton('Use this pressure point in a check');
    expect(latest.data.validationCycles).toHaveLength(1);
    expect(latest.data.validationCycles[0]).toMatchObject({
      source: 'ai',
      disposition: 'pending',
      importedChallenge: {
        challenge: 'What if the selected site has insufficient slope for a gravity-fed route?',
      },
    });
    await chooseOption(host.querySelector('[aria-label="Check 1 AI challenge choice"]'), 'decline');
    await typeInto(host.querySelector('[aria-label="Check 1 reason for AI challenge choice"]'), 'The pressure point assumes a route type that my revised criteria already exclude.');
    expect(latest.data.validationCycles[0].completedAt).toBeTruthy();
    const preservedCycleId = latest.data.validationCycles[0].id;
    await clickButton('Refresh stress test');
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(callGemini).toHaveBeenCalledTimes(2);
    expect(latest.data.validationCycles).toHaveLength(1);
    expect(latest.data.validationCycles[0].id).toBe(preservedCycleId);

    await typeInto(host.querySelector('#applied-workspace-response'), 'Recommend a measured pilot route with a non-gravity fallback.');
    expect(latest.data.stressTest.challenge).toContain('insufficient slope');
    expect(host.textContent).toContain('Created for an earlier draft');
    expect(host.textContent).toContain('Save it in a check');
  });

  it('discards feedback created for a draft that changed while AI was responding', async () => {
    let resolveFeedback;
    const callGemini = vi.fn(() => new Promise((resolvePromise) => { resolveFeedback = resolvePromise; }));
    const data = baseData();
    data.workspace.response = 'My first draft.';
    data.coachHint = '';
    data.feedback = null;
    await renderChallenge({ data, callGemini });
    await clickButton('Get strengths-first AI feedback');
    await typeInto(host.querySelector('#applied-workspace-response'), 'My revised draft while feedback is pending.');
    await act(async () => {
      resolveFeedback(JSON.stringify({
        strength: 'Feedback for the old draft',
        lessonConnectionCheck: 'Old check',
        evidenceOrConstraintCheck: 'Old evidence check',
        nextStep: 'Old next step',
        status: 'grounded',
      }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest.data.feedback).toBeNull();
    expect(toasts.some((toast) => toast.message.includes('work changed while feedback'))).toBe(true);
  });

  it('does not let an AI result land on a different same-content challenge', async () => {
    let resolveFeedback;
    const callGemini = vi.fn(() => new Promise((resolvePromise) => { resolveFeedback = resolvePromise; }));
    const data = baseData();
    data.workspace.response = 'The same draft appears in both resources.';
    data.coachHint = '';
    data.feedback = null;
    await renderChallenge({ id: 'challenge-original', data, callGemini });
    await clickButton('Get strengths-first AI feedback');
    await replaceChallenge('challenge-replacement', structuredClone(data));
    await act(async () => {
      resolveFeedback(JSON.stringify({
        strength: 'Feedback intended for the original resource',
        nextStep: 'This must not land on the replacement.',
        status: 'developing',
      }));
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(latest.id).toBe('challenge-replacement');
    expect(latest.data.feedback).toBeNull();
    // Navigating away abandons the request; do not announce another resource's result.
    expect(toasts).toEqual([]);
  });
});


describe('Applied challenge recovery and task review interactions', () => {
  it('restores deleted evidence and checks in order without losing later edits', async () => {
    const value=baseData();value.workspace.response='My recommendation';
    value.evidenceLedger=[{id:'r1',claim:'First claim',evidence:'First evidence'},{id:'r2',claim:'Second claim'}];
    value.validationCycles=[{id:'c1',source:'self',plan:{testQuestion:'Original check?'},observation:{evidence:'My observation'},decision:{action:'revise',reasoning:'My reasoning'}}];
    await renderChallenge({data:value});
    await clickButton('Remove evidence row 1');expect(document.activeElement.id).toBe('aps-undo');
    await typeInto(host.querySelector('[aria-label="Evidence row 1 claim, option, or position"]'),'Later edit to second claim');
    await clickButton('Remove check 1');
    await clickButton('Undo last change');expect(latest.data.validationCycles[0]).toMatchObject({id:'c1',observation:{evidence:'My observation'},decision:{reasoning:'My reasoning'}});
    await clickButton('Undo last change');expect(latest.data.evidenceLedger.map(row=>row.claim)).toEqual(['First claim','Later edit to second claim']);
    expect(document.activeElement.id).toBe('aps-ledger-claim-r1');
    expect(JSON.stringify(latest.data)).not.toContain('recoveryEntries');
  });
  it('restores a replaced custom question but protects newer writing', async () => {
    const value=baseData();value.workspace.workingQuestion='My custom question?';value.workspace.questionAccepted=true;
    await renderChallenge({data:value});await clickButton('Replace with suggested question');
    await clickButton('Undo last change');expect(latest.data.workspace.workingQuestion).toBe('My custom question?');
    expect(document.activeElement.id).toBe('applied-workspace-workingQuestion');
    await clickButton('Replace with suggested question');await typeInto(host.querySelector('#applied-workspace-workingQuestion'),'A newer question?');
    await clickButton('Undo last change');expect(latest.data.workspace.workingQuestion).toBe('A newer question?');
    expect(host.textContent).toContain('Your question has changed again.');expect(host.textContent).toContain('My custom question?');
  });
  it('clears recovery on resource switches and does not overwrite full ledgers', async () => {
    const value=baseData();value.evidenceLedger=[{id:'old',claim:'Old claim'}];await renderChallenge({data:value});await clickButton('Remove evidence row 1');
    const full={...latest.data,evidenceLedger:Array.from({length:12},(_,i)=>({id:'new'+i,claim:'Claim '+i}))};await replaceChallenge('challenge-1',full);
    await clickButton('Undo last change');expect(latest.data.evidenceLedger).toHaveLength(12);expect(host.textContent).toContain('There is no room');
    await replaceChallenge('other-resource',baseData());expect([...host.querySelectorAll('button')].some(b=>b.textContent==='Undo last change')).toBe(false);
  });
  it('caps session recovery at ten changes', async () => {
    const value=baseData();value.evidenceLedger=Array.from({length:12},(_,i)=>({id:'r'+i,claim:'Claim '+i}));await renderChallenge({data:value});
    for(let i=0;i<11;i++)await clickButton('Remove evidence row 1');
    expect(host.textContent).toContain('10 recent changes available');
    for(let i=0;i<10;i++)await clickButton('Undo last change');
    expect(latest.data.evidenceLedger).toHaveLength(11);expect(latest.data.evidenceLedger.some(row=>row.id==='r0')).toBe(false);
  });
  it('saves complete feedback coverage and includes late evidence in the actual request', async () => {
    const value=baseData();value.workspace.response='My own response';value.evidenceLedger=Array.from({length:12},(_,i)=>({id:'r'+i,claim:'Claim '+i,evidence:'EVIDENCE-'+i}));
    const callGemini=vi.fn(async()=>JSON.stringify({strength:'Complete review',status:'developing'}));await renderChallenge({data:value,callGemini});
    await clickButton('Get strengths-first AI feedback');expect(callGemini.mock.calls[0][0]).toContain('EVIDENCE-11');
    expect(latest.data.feedback.coverage).toMatchObject({evidenceRows:12,shortenedFields:0});expect(host.textContent).toContain('12 evidence rows');
  });
  const qualityReply=()=>({checks:Object.fromEntries(['lessonUse','alternatives','feasibility'].map(key=>[key,{status:'revise',reason:'Inspect the task wording.',nextStep:'Make the criterion more specific.'}]))});
  it('lets teachers review task quality without touching student work or verifying source facts', async () => {
    const value=baseData();value.workspace.response='PRIVATE-LEARNER';value.sourceExcerpt='Gravity moves water downhill.';
    const callGemini=vi.fn(async()=>JSON.stringify(qualityReply()));await renderChallenge({teacher:true,data:value,callGemini,recreateProvider:true});
    await clickButton('Get AI task review');expect(callGemini).toHaveBeenCalledTimes(1);expect(callGemini.mock.calls[0][0]).not.toContain('PRIVATE-LEARNER');
    expect(host.textContent).toContain('Task review saved.');expect(latest.data.qualityReview.checks.lessonUse.status).toBe('revise');expect(latest.data.workspace.response).toBe('PRIVATE-LEARNER');expect(latest.data.brief.factVerified).not.toBe(true);
    await replaceChallenge('challenge-1',{...latest.data,plan:{availableTime:'10 minutes'}});expect(host.textContent).toContain('This review is for an earlier task.');
  });
  it('rejects quality reviews for changed tasks, resource switches and invalid AI output', async () => {
    let resolveReview;const callGemini=vi.fn(()=>new Promise(resolve=>{resolveReview=resolve;}));await renderChallenge({teacher:true,callGemini});
    await clickButton('Get AI task review');await replaceChallenge('challenge-1',{...latest.data,plan:{availableTime:'5 minutes'}});
    await act(async()=>resolveReview(JSON.stringify(qualityReply())));expect(latest.data.qualityReview).toBeUndefined();expect(host.textContent).toContain('The task changed during review.');
    await clickButton('Get AI task review');await replaceChallenge('new-task',baseData());await act(async()=>resolveReview(JSON.stringify(qualityReply())));expect(latest.data.qualityReview).toBeUndefined();
    await clickButton('Get AI task review');await act(async()=>resolveReview('nonsense'));expect(latest.data.qualityReview).toBeUndefined();expect(host.textContent).toContain('could not be completed');
  });
});


describe('Applied challenge start, resume and feedback editing',()=>{
  it('keeps the optional suggested question collapsed and offers a direct writing shortcut',async()=>{
    const value=baseData();value.workspace={};await renderChallenge({data:value,focus:true});
    expect(host.querySelector('#aps-question-suggestion').open).toBe(false);
    expect(host.querySelector('#applied-workspace-workingQuestion').value).toBe('');
    await clickButton('Start writing');expect(document.activeElement.id).toBe('applied-workspace-workingQuestion');
    expect(latest.data.workspace).toEqual({});
    host.querySelector('#aps-question-suggestion').open=true;await clickButton('Use this question');
    expect(latest.data.workspace.questionAccepted).toBe(true);expect(host.querySelector('#aps-question-suggestion').open).toBe(false);
  });
  it('returns to the saved step and preserves the review view across remounts',async()=>{
    const value=baseData();value.workspace.response='My draft';const key='allo-applied-focus:'+JSON.stringify(['session','challenge-1']);
    sessionStorage.setItem(key,JSON.stringify({phase:'response',focus:true,review:false}));
    await renderChallenge({data:value,focus:true});await clickButton('Continue in Build');
    expect(document.activeElement.id).toBe('applied-workspace-response');
    await clickButton('5. Reflect');await clickButton('Review my response');
    expect(JSON.parse(sessionStorage.getItem(key)).review).toBe(true);
    await act(async()=>root.unmount());root=null;host.remove();
    await renderChallenge({data:value,focus:true});expect(host.querySelector('#aps-review-heading')).toBeTruthy();
    await clickButton('Go to my review');expect(document.activeElement.id).toBe('aps-review-heading');
  });
  it('isolates review preferences by profile and excludes teacher preview',async()=>{
    const key='allo-applied-focus:'+JSON.stringify(['profile-a','challenge-1']);sessionStorage.setItem(key,JSON.stringify({phase:'response',focus:true,review:true}));
    await renderChallenge({focus:true,profile:'profile-b'});expect(host.querySelector('#aps-review-heading')).toBeNull();expect(host.querySelector('#applied-workspace-workingQuestion')).toBeTruthy();
    await act(async()=>root.unmount());root=null;host.remove();
    await renderChallenge({focus:true,profile:'profile-a',preview:true});expect(host.querySelector('#aps-review-heading')).toBeNull();
    await clickButton('3. Build');expect(JSON.parse(sessionStorage.getItem(key))).toMatchObject({phase:'response',review:true});
  });
  it('recovers from malformed view preferences without changing writing',async()=>{
    sessionStorage.setItem('allo-applied-focus:'+JSON.stringify(['session','challenge-1']),'{bad json');
    await renderChallenge({focus:true});expect(host.querySelector('#applied-workspace-workingQuestion')).toBeTruthy();expect(latest.data.workspace.workingQuestion).toBe(baseData().workspace.workingQuestion);
  });
  it('keeps the AI next step beside the learner draft without copying it into the response',async()=>{
    const H=window.AlloModules.AppliedChallenge._testing;const value=H.normalizeAppliedChallengeData(baseData());
    value.workspace.response='My original response';value.feedback.nextStep='Compare the evidence for your second option.';
    value.feedback.resourceId='challenge-1';value.feedback.gradeLevel='8th Grade';
    value.feedback.contextFingerprint=H.appliedChallengeHashText(H.appliedChallengeRequestFingerprint(value,'feedback',{resourceId:'challenge-1',gradeLevel:'8th Grade'}));
    await renderChallenge({data:value});await clickButton('Edit my response with this feedback');
    expect(document.activeElement.id).toBe('applied-workspace-response');expect(latest.data.workspace.response).toBe('My original response');
    expect(host.querySelector('[aria-label="Feedback beside my draft"]').textContent).toContain('Next step to consider');
    await typeInto(host.querySelector('#applied-workspace-response'),'My own revised comparison');
    expect(host.querySelector('[aria-label="Feedback beside my draft"]').textContent).toContain('Next step from earlier feedback');
    await clickButton('Return to feedback');expect(document.activeElement.id).toBe('aps-feedback-heading');expect(latest.data.workspace.response).toBe('My own revised comparison');
  });
  it('focuses the linked-work explanation when revising an artifact response',async()=>{
    const value=baseData();value.workspace={...value.workspace,response:'',artifactUrl:'https://example.org/model',artifactDescription:'My own model explanation.'};
    await renderChallenge({data:value});await clickButton('Edit my response with this feedback');
    const input=host.querySelector('#applied-artifact-description');expect(document.activeElement).toBe(input);expect(input.closest('details').open).toBe(true);
    expect(latest.data.workspace.response).toBe('');expect(input.value).toBe('My own model explanation.');
    await clickButton('Hide this guidance');expect(host.querySelector('[aria-label="Feedback beside my draft"]')).toBeNull();
  });
  it('does not carry revision guidance into a different resource',async()=>{
    await renderChallenge();await clickButton('Edit my response with this feedback');
    await replaceChallenge('another-challenge',baseData());await clickButton('3. Build');
    expect(host.querySelector('[aria-label="Feedback beside my draft"]')).toBeNull();
  });
});
