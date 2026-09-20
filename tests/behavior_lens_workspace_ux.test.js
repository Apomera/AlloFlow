import { beforeAll, beforeEach, afterEach, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { React, baseProps, setupBehaviorLens } from './helpers/behavior_lens_harness.js';
const require = createRequire(import.meta.url);
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { Simulate } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host;
const tick = async () => React.act(async () => { await new Promise(resolve => setTimeout(resolve, 350)); });
const button = name => [...host.querySelectorAll('button')].find(el => el.textContent.trim() === name);
const click = async name => { const el = typeof name === 'string' ? button(name) : name; expect(el).toBeTruthy(); await React.act(async () => el.click()); };
const change = async (id, value) => { const el = host.querySelector(id); expect(el).toBeTruthy(); await React.act(async () => Simulate.change(el, { target: { value } })); };
const workspace = id => JSON.parse(localStorage.getItem('behaviorLens_workspace_' + (id || 'ux-a')));
async function mount(studentNickname = 'Student A') {
  host = document.createElement('div'); document.body.append(host); root = createRoot(host);
  await React.act(async () => root.render(React.createElement(window.AlloModules.BehaviorLens, baseProps({ studentNickname, isCanvasEnv: true, isTeacherMode: true, dashboardData: [{ studentNickname: 'Student A' }, { studentNickname: 'Student B' }] }))));
  await tick();
}
async function unmount() { if (root) await React.act(async () => root.unmount()); host?.remove(); host = null; root = null; }
beforeAll(() => { globalThis.IS_REACT_ACT_ENVIRONMENT = true; setupBehaviorLens(); });
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); delete window.__alloFirebase;
  localStorage.setItem('bl_student_roster', JSON.stringify([{ id: 'ux-a', name: 'Student A' }, { id: 'ux-b', name: 'Student B' }]));
});
afterEach(unmount);

describe('Behavior Lens connected workspace', () => {
  it('starts with daily tasks and preserves access to the full tool library', async () => {
    await mount();
    expect(host.querySelector('[data-bl-today]')).toBeTruthy();
    expect(button('Add observation')).toBeTruthy();
    expect(host.querySelectorAll('article[aria-labelledby^="bl-tool-"]')).toHaveLength(0);
    await click('All tools');
    expect(host.querySelectorAll('article[aria-labelledby^="bl-tool-"]').length).toBeGreaterThan(90);
    await click('Today');
    expect(button('Define a target')).toBeTruthy();
  });
  it('retains a definition draft after navigation, reload, and student switching', async () => {
    await mount(); await click('Define a target');
    await change('#bl-definition-label', 'Requests help');
    await change('#bl-definition-text', 'Raises a hand or presents a help card during a task.');
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    await click('Continue definition');
    expect(host.querySelector('#bl-definition-label').value).toBe('Requests help');
    await tick(); await unmount(); await mount();
    await click('Continue definition');
    expect(host.querySelector('#bl-definition-text').value).toContain('help card');
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    await change('#bl-today-student', 'Student B'); await tick();
    await click('Define a target');
    expect(host.querySelector('#bl-definition-label').value).toBe('');
    expect(workspace('ux-a').toolState.operationalDefinitionDraft.label).toBe('Requests help');
  });
  it('saves a manual definition as a shared target and retains identity on subsequent edits', async () => {
    await mount(); await click('Define a target');
    await change('#bl-definition-label', 'Requests help');
    await change('#bl-definition-text', 'Says help or presents a help card during a task.');
    await change('#bl-definition-measure', 'count');
    await click('Save target'); await tick();
    const first = workspace().targetBehaviors.find(item => item.label === 'Requests help');
    expect(first).toMatchObject({ measurement: 'count', operationalDefinition: 'Says help or presents a help card during a task.' });
    await change('#bl-definition-text', 'Says help, raises a hand, or presents a help card.');
    await click('Save target and add note'); await tick();
    expect(host.querySelector('[aria-label="New ABC entry"]')).toBeTruthy();
    expect(host.querySelector('#behavior-lens-target-behavior').value).toBe(first.id);
    expect(host.textContent).toContain('Says help, raises a hand, or presents a help card.');
    await click('Keep draft and close');
    await click('Definitions (1)');
    expect(host.textContent).toContain('Canonical target behaviors');
    expect([...host.querySelectorAll('textarea')].some(el => el.value.includes('raises a hand'))).toBe(true);
    expect(workspace().targetBehaviors.filter(item => item.label === 'Requests help')).toHaveLength(1);
    expect(workspace().targetBehaviors.find(item => item.label === 'Requests help').id).toBe(first.id);
    expect(workspace().toolState.operationalDefinitions[0].targetId).toBe(first.id);
  });
  it('blocks duplicate target names without overwriting a different target', async () => {
    localStorage.setItem('behaviorLens_workspace_ux-a', JSON.stringify({ targetBehaviors: [{ id: 'existing', label: 'Requests help', operationalDefinition: 'Existing definition', aliases: ['Help request'] }] }));
    await mount(); await click('Define a target');
    await change('#bl-definition-label', 'requests help'); await change('#bl-definition-text', 'Different definition');
    await click('Save target'); await tick();
    expect(host.textContent).toContain('A target with that name already exists');
    expect(workspace().targetBehaviors[0].operationalDefinition).toBe('Existing definition');
    await change('#bl-definition-target', 'existing');
    await change('#bl-definition-text', 'Reviewed definition'); await click('Save target'); await tick();
    expect(workspace().targetBehaviors[0]).toMatchObject({ id: 'existing', aliases: ['Help request'], operationalDefinition: 'Reviewed definition' });
  });
  it('keeps family actions and the selected role in agreement', async () => {
    await mount(); await click(host.querySelector('[aria-label="Family Mode"]')); await tick();
    expect(button('Add home observation')).toBeTruthy();
    expect(button('Define a target')).toBeFalsy();
    await click('Student and role settings');
    expect(host.querySelector('[aria-label="Use family view"]').getAttribute('aria-pressed')).toBe('true');
  });
});


describe('Connected observation recording', () => {
  it('opens the form directly and restores a draft across navigation, reload, and students', async () => {
    await mount(); await click('Add observation');
    expect(host.querySelector('[aria-label="New ABC entry"]')).toBeTruthy();
    await change('[aria-label="Antecedent narrative"]', 'Asked to begin writing');
    await change('[aria-label="Behavior narrative"]', 'Showed a help card');
    await change('[aria-label="Consequence narrative"]', 'Teacher offered an example');
    await change('#bl-abc-occurred-at', '2026-09-18T09:15');
    await click('Keep draft and close');
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    expect(button('Resume observation')).toBeTruthy();
    await tick(); await unmount(); await mount();
    await change('#bl-today-student', 'Student B'); await tick();
    expect(button('Add observation')).toBeTruthy();
    await click('Add observation');
    expect(host.querySelector('[aria-label="Behavior narrative"]').value).toBe('');
    await click('Keep draft and close');
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    await change('#bl-today-student', 'Student A'); await tick();
    await click('Resume observation');
    expect(host.querySelector('[aria-label="Behavior narrative"]').value).toBe('Showed a help card');
    expect(host.querySelector('#bl-abc-occurred-at').value).toBe('2026-09-18T09:15');
    await click('Save Entry'); await tick();
    expect(workspace().abcEntries).toHaveLength(1);
    expect(workspace().abcEntries[0]).toMatchObject({behavior: 'Showed a help card', intensity: null, occurredAt: new Date('2026-09-18T09:15').toISOString()});
    expect(workspace().toolState.abcObservationDraft).toBeNull();
    expect(workspace('ux-b').abcEntries).toHaveLength(0);
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    await click('Add observation');
    expect(host.querySelector('[aria-label="Behavior narrative"]').value).toBe('');
  });
  it('keeps the target linked while adding narrative and preserves a draft when another target is saved', async () => {
    await mount(); await click('Define a target');
    await change('#bl-definition-label', 'Requests help');
    await change('#bl-definition-text', 'Shows a help card.');
    await click('Save target and add note');
    const id=host.querySelector('#behavior-lens-target-behavior').value;
    await change('[aria-label="Behavior narrative"]', 'Showed the blue help card twice');
    expect(host.querySelector('#behavior-lens-target-behavior').value).toBe(id);
    await click('Keep draft and close');
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    await click('Define a target');
    await change('#bl-definition-target', '');
    await change('#bl-definition-label', 'Requests break');
    await change('#bl-definition-text', 'Says break.');
    await click('Save target and add note');
    expect(host.querySelector('#behavior-lens-target-behavior').value).toBe(id);
    expect(host.querySelector('[aria-label="Behavior narrative"]').value).toBe('Showed the blue help card twice');
    await change('[aria-label="Antecedent narrative"]', 'Writing task');
    await change('[aria-label="Consequence narrative"]', 'Offered help');
    await click('Save Entry'); await tick();
    expect(workspace().abcEntries[0]).toMatchObject({behaviorId: id, behavior: 'Showed the blue help card twice'});
  });
  it('requires an explicit discard and clears only the unfinished observation', async () => {
    await mount(); await click('Add observation');
    await change('[aria-label="Behavior narrative"]', 'Draft to remove');
    await click('Discard draft'); await click('Keep writing');
    expect(host.querySelector('[aria-label="Behavior narrative"]').value).toBe('Draft to remove');
    await click('Discard draft'); await click('Discard observation'); await tick();
    expect(host.querySelector('[aria-label="New ABC entry"]')).toBeFalsy();
    expect(workspace().toolState.abcObservationDraft).toBeNull();
    expect(workspace().abcEntries).toHaveLength(0);
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    expect(button('Add observation')).toBeTruthy();
  });
});


it('preserves a new observation draft while editing an existing record', async () => {
  localStorage.setItem('behaviorLens_workspace_ux-a', JSON.stringify({abcEntries:[{id:'prior-entry',timestamp:'2026-09-18T12:00:00Z',antecedent:'Task',behavior:'Asked for help',consequence:'Help offered'}]}));
  await mount(); await click('Add observation');
  await change('[aria-label="Behavior narrative"]', 'Unfinished separate observation');
  await click('Keep draft and close');
  await click(host.querySelector('[aria-label="Toggle edit entry"]'));
  await change('[aria-label="Behavior narrative"]', 'Asked for help using a card');
  await click('Save Entry'); await tick();
  expect(workspace().abcEntries).toHaveLength(1);
  expect(workspace().abcEntries[0].behavior).toBe('Asked for help using a card');
  expect(workspace().toolState.abcObservationDraft.behavior).toBe('Unfinished separate observation');
  await click('Resume observation');
  expect(host.querySelector('[aria-label="Behavior narrative"]').value).toBe('Unfinished separate observation');
});


const reviewDate = daysAgo => { const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(9, 0, 0, 0); return d.toISOString(); };
const reviewEntry = (id, daysAgo, behaviorId='help', overrides={}) => ({id, timestamp:reviewDate(daysAgo), behaviorId, behavior:behaviorId==='help'?'Showed a help card':'Requested a break', antecedent:'Writing task', consequence:'Offered an example', ...overrides});
function seedReview(extra={}) {
  localStorage.setItem('behaviorLens_workspace_ux-a', JSON.stringify({
    targetBehaviors:[{id:'help',label:'Requests help',aliases:['Help card'],operationalDefinition:'Shows a help card.'},{id:'break',label:'Requests break',operationalDefinition:'Asks for a break.'}],
    abcEntries:[reviewEntry('recent-help',0),reviewEntry('boundary-help',13),reviewEntry('old-help',14),reviewEntry('recent-break',0,'break')],
    observationSessions:[{id:'help-session',timestamp:reviewDate(0),method:'frequency',behaviorId:'help',duration:600},{id:'unassigned-session',timestamp:reviewDate(0),method:'frequency',duration:600},{id:'break-session',timestamp:reviewDate(0),method:'frequency',behaviorId:'break',duration:600},{id:'counter-session',timestamp:reviewDate(0),method:'frequency',duration:600,data:{counters:[{label:'Help card',count:2}]}}],
    ...extra
  }));
}
describe('Observation review workflow', () => {
  it('uses one target/date scope for records and explicitly linked timed sessions', async () => {
    seedReview(); await mount(); await click('Review observations');
    expect(host.querySelectorAll('[data-bl-review-entry]')).toHaveLength(3);
    expect(host.querySelector('[data-bl-review-charts]').open).toBe(false);
    await change('#bl-review-target','help');
    expect(host.textContent).toContain('2 context notes and 2 timed sessions match these filters.');
    expect([...host.querySelectorAll('[data-bl-review-entry]')].map(el=>el.dataset.blReviewEntry)).toEqual(['recent-help','boundary-help']);
    await click('7 days');
    expect(host.textContent).toContain('1 context note and 2 timed sessions match these filters.');
    await click('All dates');
    expect(host.querySelectorAll('[data-bl-review-entry]')).toHaveLength(3);
    expect(host.querySelector('button[aria-pressed="true"]').textContent).toBe('All dates');
    expect(host.textContent).not.toContain('Peak Risk Window');
    expect(host.textContent).not.toContain('Improving');
  });
  it('edits the selected record, returns to its review page, and preserves an unrelated draft', async () => {
    seedReview({abcEntries:Array.from({length:10},(_,i)=>reviewEntry('record-'+i,0,'help',{behavior:'Help record '+i})),toolState:{abcObservationDraft:{behavior:'Separate unfinished note'}}});
    await mount(); await click('Review observations'); await change('#bl-review-target','help');
    await click('Next notes');
    const record=host.querySelector('[data-bl-review-entry]');
    const id=record.dataset.blReviewEntry;
    await click(record.querySelector('button'));
    expect(host.querySelector('[aria-label="Edit ABC entry"]')).toBeTruthy();
    await change('[aria-label="Behavior narrative"]','Edited note from review');
    await click('Save Entry'); await tick();
    expect(host.querySelector('[data-bl-review]')).toBeTruthy();
    expect(host.querySelector('#bl-review-target').value).toBe('help');
    expect(host.textContent).toContain('Page 2 of 2');
    expect(workspace().abcEntries).toHaveLength(10);
    expect(workspace().abcEntries.find(entry=>entry.id===id).behavior).toBe('Edited note from review');
    expect(workspace().toolState.abcObservationDraft.behavior).toBe('Separate unfinished note');
  });
  it('makes old timed sessions discoverable and allows starting from an empty review', async () => {
    seedReview({abcEntries:[],observationSessions:[{id:'old-session',timestamp:reviewDate(40),method:'frequency',duration:600}]});
    await mount(); await click('Review observations');
    await click('Show all records');
    expect(host.textContent).toContain('0 context notes and 1 timed session match these filters.');
    await click('Record an observation');
    expect(host.querySelector('[aria-label="New ABC entry"]')).toBeTruthy();
    await click('Keep draft and close');
    expect(host.querySelector('[data-bl-review]')).toBeTruthy();
  });
  it('retains review filters across reload and isolates them when switching students', async () => {
    seedReview(); await mount(); await click('Review observations');
    await change('#bl-review-target','help'); await click('All dates'); await tick();
    await unmount(); await mount(); await click('Review observations');
    expect(host.querySelector('#bl-review-target').value).toBe('help');
    expect(host.querySelectorAll('[data-bl-review-entry]')).toHaveLength(3);
    await click(host.querySelector('[aria-label="Back to BehaviorLens tools"]'));
    await change('#bl-today-student','Student B'); await tick(); await click('Review observations');
    expect(host.querySelector('#bl-review-target').value).toBe('');
    expect(host.textContent).toContain('0 context notes and 0 timed sessions match these filters.');
    await click('Record an observation');
    expect(host.querySelector('[aria-label="Behavior narrative"]').value).toBe('');
  });
});
