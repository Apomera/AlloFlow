// Behavior Lens: records that were lost on close, deletes without a question, and AI
// drafts that overwrote what staff had typed.
//
// WHY: until 2026-09-23
// - Replacement-behavior trials, replacement plans, antecedent modifications, the
//   relationship map, family voice entries, the family contact log, restitution plans
//   (after "Restitution plan saved"), the cultural reflection, the pocket BIP, the home
//   note, IEP drafts and the FCT plan were plain component state: gone on close. The
//   PD learning path forgot every completed module, so its certificate was unreachable.
// - The trial trend compared counts from windows of different sizes: I,I,I,I,I,F
//   (100% then 80% independent) read "Trending Up".
// - "AI Draft Contract" kept the old SIGNATURES on new terms; a "{}" reply blanked the
//   contract or pocket BIP while saying "drafted"; regenerating a home note lost the
//   edited note with no undo; quick-fill overwrote typed fields and invented an intensity.
// - AlloBot was sent the newest entry as JSON cut at 200 characters (ids and timestamps,
//   no A-B-C) plus the student context twice; MI practice sent the open student's
//   profile into a fictional role-play and scored a reply with no score as 3/5.
// - With AI switched off, about 60 AI features showed "generated" over an empty result
//   or an error after the "AI is off" message.
import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, componentSource, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  behaviorLensRuntime();
});
const ns = name => window.AlloModules[name];
const flush = () => new Promise(r => setTimeout(r, 0));
const src = readFileSync('behavior_lens_module.js', 'utf8');
const byLabel = (q, label) => q.all(n => n.props['aria-label'] === label)[0];
// Icons are window globals the host sets; stand them in as spans.
const hostIcons = name => Object.fromEntries([...componentSource(name).matchAll(/h\(([A-Z][A-Za-z0-9]*)\s*,/g)].map(m => m[1])
  .filter(id => !src.includes('const ' + id + ' =') && !src.includes('function ' + id + '(')).map(id => [id, 'span']));
function confirmEnv(answer) {
  const asked = [];
  return { asked, env: { askBehaviorLensConfirmation: async (m, o) => { asked.push(o.title); return answer; }, DualLabel: text => text } };
}

describe('replacement-behavior trials', () => {
  const lv = str => str.split('').map(c => ({ level: c === 'I' ? 'ind' : c === 'P' ? 'pp' : 'fp' }));
  it('the trend compares rates, not counts', () => {
    const { trialTrend } = ns('BehaviorLensTrials');
    expect(trialTrend(lv('IIIIIF'))).toBe('down');                 // 100% then 80%: it said "up"
    expect(trialTrend(lv('FFFFFI'))).toBe('up');
    expect(trialTrend(lv('IIFFFIIFFF'))).toBe('flat');
    expect(trialTrend(lv('IIIII'))).toBe('none');
  });
  it('are kept, and delete asks first', async () => {
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('ReplacementBehavior', { t: () => undefined, addToast: () => {} },
      { ...env, __durable: { replacementTrialBehaviors: [{ id: 7, problem: 'Yelling', replacement: 'Ask for a break', strategy: '', created: '2026-09-01' }], replacementTrials: { 7: lv('IIPF') } } });
    expect(q.text()).toContain('Ask for a break');
    expect(q.text()).toContain('4 trials');
    expect(q.text()).toContain('50%');                                  // I, I, P, F
    await byLabel(q, 'Delete Ask for a break').props.onClick(); q.render();
    expect(asked).toEqual(['Delete replacement behavior']);
    expect(q.text()).toContain('Ask for a break');
  });
});

describe('planners keep their records and ask before deleting', () => {
  it('replacement plans', async () => {
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('ReplacementBehaviorPlanner', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} },
      { ...env, __durable: { replacementPlans: [{ id: 1, targetBehavior: 'Elopement', function: 'escape', replacement: 'Break card', teachingStrategy: '', reinforcement: '', progress: 'teaching' }] } });
    await byLabel(q, 'Delete plan for Elopement').props.onClick(); q.render();
    expect(asked).toEqual(['Delete replacement plan']);
    expect(q.text()).toContain('Break card');
  });
  it('antecedent modifications', async () => {
    const { asked, env } = confirmEnv(true);
    const q = componentHarness('AntecedentModPlanner', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} },
      { ...env, __durable: { antecedentMods: [{ id: 1, setting: 'Math', change: 'Offer choice of problems', rationale: '', status: 'effective' }] } });
    expect(q.text()).toContain('Offer choice of problems');
    await byLabel(q, 'Delete modification: Offer choice of problems').props.onClick(); q.render();
    expect(asked).toEqual(['Delete modification']);
    expect(q.text()).not.toContain('Offer choice of problems');
  });
  it('relationship map', () => {
    const q = componentHarness('RelationshipMap', { studentName: 'Kestrel', t: () => undefined, addToast: () => {} },
      { DualLabel: text => text, __durable: { relationshipConnections: [{ id: 1, name: 'Ms. Rivera', role: 'trusted_adult', strength: 'strong' }] } });
    expect(q.text()).toContain('Ms. Rivera');
    expect(byLabel(q, 'Remove Ms. Rivera')).toBeTruthy();
    expect(byLabel(q, 'Add connection')).toBeTruthy();
  });
});

describe('family records', () => {
  it('family voice entries are kept and delete asks', async () => {
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('FamilyVoiceCollector', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} },
      { ...env, __durable: { familyVoiceEntries: [{ id: 3, category: 'strengths', text: 'Loves to cook dinner with us', timestamp: '2026-09-20T18:00:00Z' }] } });
    expect(q.text()).toContain('Loves to cook dinner with us');
    await byLabel(q, 'Delete family entry').props.onClick(); q.render();
    expect(asked).toEqual(['Delete family entry']);
    expect(q.text()).toContain('Loves to cook dinner with us');
  });
  it('a contact is logged on the day it happened, and the log is kept', () => {
    const q = componentHarness('TwoWayCommLog', { studentName: 'Kestrel', t: () => undefined, addToast: () => {} },
      { __durable: { familyContacts: [{ id: 1, who: 'Mom', method: 'phone', topic: 'Earlier call', outcome: '', followUp: '', contactDate: '2026-09-02', timestamp: '2026-09-02T15:00:00Z' }] } });
    const input = label => byLabel(q, label);
    const topic = q.all(n => typeof n.props.onChange === 'function' && typeof n.props.placeholder === 'string' && /topic|discuss/i.test(n.props.placeholder))[0];
    topic.props.onChange({ target: { value: 'Called about the new break card' } }); q.render();
    input('Date of contact').props.onChange({ target: { value: '2026-09-21' } }); q.render();
    byLabel(q, 'Log Contact').props.onClick(); q.render();
    const text = q.text();
    expect(text).toContain('Sep 21');
    expect(text.indexOf('Called about the new break card')).toBeLessThan(text.indexOf('Earlier call'));   // newest contact first
  });
});

describe('restitution plans', () => {
  it('a saved plan reopens, saves in place, and none are dropped', () => {
    const plans = Array.from({ length: 25 }, (_, i) => ({ id: 100 + i, savedAt: '2026-09-01T12:00:00Z', incident: 'Incident ' + i, whoAffected: 'Class', whatDamaged: '', plan: { categoryId: 'repair', action: 'Fix it' }, studentVoice: '', completionSteps: [] }));
    const q = componentHarness('RestitutionPlanner', { studentName: 'Kestrel', callGemini: null, t: () => undefined, addToast: () => {} }, { DualLabel: text => text, __durable: { restitutionPlans: plans } });
    expect(q.all(n => n.props['data-saved-plan'] !== undefined)).toHaveLength(25);
    q.all(n => n.props['data-saved-plan'] === 103)[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && /Save Plan/.test(q.text(n)))[0].props.onClick(); q.render();
    byLabel(q, 'Back to all options').props.onClick(); q.render();
    expect(q.all(n => n.type === 'textarea' && n.props.value === 'Incident 3')).toHaveLength(1);   // reopened
    const saved = q.all(n => n.props['data-saved-plan'] !== undefined).map(n => n.props['data-saved-plan']);
    expect(saved).toHaveLength(25);                                                                   // saved in place, none dropped
    expect(saved[0]).toBe(103);
  });
});

describe('cultural reflection', () => {
  it('N/A does not count against the reflection', () => {
    const { culturalReflectionVerdict } = ns('BehaviorLensCulturalReflection');
    const r = (y, n, na) => Object.fromEntries([...Array(y).fill('yes'), ...Array(n).fill('not yet'), ...Array(na).fill('n/a')].map((v, i) => ['q' + i, v]));
    expect(culturalReflectionVerdict(r(5, 0, 3))).toEqual({ kind: 'strong', notYet: 0, applicable: 5 });    // was "revisit the Not Yet items"
    expect(culturalReflectionVerdict(r(2, 0, 6)).kind).toBe('strong');                                      // was "Important reflection needed"
    expect(culturalReflectionVerdict(r(5, 2, 1)).kind).toBe('revisit');
    expect(culturalReflectionVerdict(r(2, 3, 3)).kind).toBe('important');
    expect(culturalReflectionVerdict(r(0, 0, 8)).kind).toBe('none');
  });
  it('answers are kept and each answer button is named by its text', () => {
    const responses = {};
    const q0 = componentHarness('CulturalContextReflection', { studentName: 'Kestrel', t: () => undefined }, { DualLabel: text => text });
    const ids = [...new Set(q0.all(n => n.type === 'button' && /Yes$/.test(q0.text(n))).map((n, i) => i))];
    expect(ids.length).toBeGreaterThan(3);
    expect(q0.all(n => n.props['aria-label'] === 'Response')).toHaveLength(0);
    q0.all(n => n.type === 'button' && /Yes$/.test(q0.text(n))).forEach(b => b.props.onClick());
    q0.render();
    expect(q0.all(n => n.props['aria-pressed'] === 'true').length).toBe(ids.length);
    expect(q0.all(n => n.props['data-verdict'] === 'strong')).toHaveLength(1);
    void responses;
  });
});

describe('saved answers', () => {
  it('the cultural reflection comes back', () => {
    const ids = ['normative', 'consulted', 'expectation', 'language', 'trauma', 'strengths', 'observer', 'disproportionality'];
    const q = componentHarness('CulturalContextReflection', { studentName: 'Kestrel', t: () => undefined }, { DualLabel: text => text, __durable: { culturalReflection: Object.fromEntries(ids.map(id => [id, 'n/a'])) } });
    expect(q.all(n => n.props['aria-pressed'] === 'true')).toHaveLength(8);
    expect(q.all(n => n.props['data-verdict'] === 'none')).toHaveLength(1);
  });
});

describe('task analysis AI steps', () => {
  it('asks before replacing steps, and asks for JSON (it passed the student name as the JSON flag)', async () => {
    const { asked, env } = confirmEnv(false); const modes = [];
    const q = componentHarness('TaskAnalysisTool', { studentName: 'Kestrel', callGemini: async (p, mode) => { modes.push(mode); return '["Step A","Step B"]'; }, t: () => undefined, addToast: () => {} },
      { ...env, __durable: { taskAnalysisName: 'Wash hands', taskAnalysisSteps: [{ id: 's1', desc: 'Turn on water', status: 'not_started', promptLevel: '', notes: '' }] } });
    const gen = () => byLabel(q, 'Auto-generate steps with AI');
    await gen().props.onClick(); await flush(); q.render();
    expect(asked).toEqual(['Replace task steps']);
    expect(modes).toEqual([]);
    expect(q.all(n => n.props.value === 'Turn on water')).toHaveLength(1);
    const yes = confirmEnv(true);
    const q2 = componentHarness('TaskAnalysisTool', { studentName: 'Kestrel', callGemini: async (p, mode) => { modes.push(mode); return '["Step A","Step B"]'; }, t: () => undefined, addToast: () => {} },
      { ...yes.env, __durable: { taskAnalysisName: 'Wash hands', taskAnalysisSteps: [{ id: 's1', desc: 'Turn on water', status: 'not_started', promptLevel: '', notes: '' }] } });
    await byLabel(q2, 'Auto-generate steps with AI').props.onClick(); await flush(); q2.render();
    expect(modes).toEqual([true]);
    expect(q2.all(n => n.props.value === 'Step A')).toHaveLength(1);
  });
});

describe('PD learning path', () => {
  beforeEach(() => { try { localStorage.removeItem('bl_pd_learning_path'); } catch (e) { /* ignore */ } });
  it('remembers completed modules on this device', () => {
    const progressOf = q => q.all(n => n.type === 'span' && /^\d+%$/.test(q.text(n))).map(n => parseInt(q.text(n), 10))[0];
    const fresh = componentHarness('PDLearningPath', { t: () => undefined, addToast: () => {}, onOpenTool: () => {} }, { DualLabel: text => text });
    expect(progressOf(fresh)).toBe(0);
    localStorage.setItem('bl_pd_learning_path', JSON.stringify(['observation']));
    const back = componentHarness('PDLearningPath', { t: () => undefined, addToast: () => {}, onOpenTool: () => {} }, { DualLabel: text => text });
    expect(progressOf(back)).toBeGreaterThan(0);
  });
});

describe('behavior contract', () => {
  const signed = { id: 'c1', savedAt: '2026-09-01T12:00:00Z', target: 'Stay in seat', studentExpectations: 'Raise hand', rewards: 'Lego time', teacherSupports: 'Check-ins', supportPlan: '', duration: '2 weeks', studentSig: 'J. Doe', studentSigDate: '2026-09-01', teacherSig: 'Ms. R', teacherSigDate: '2026-09-01', status: 'active' };
  const reply = JSON.stringify({ targetBehavior: 'Use the break card', studentExpectations: ['Ask for a break', 'Return in 5 minutes'], rewards: 'Choice time', teacherSupports: 'Visual timer', supportPlan: 'Check-in', duration: '3 weeks' });
  function mount(answer, callReply) {
    const { asked, env } = confirmEnv(answer); const toasts = [];
    const q = componentHarness('BehaviorContract', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: async () => callReply, t: () => undefined, addToast: (m, k) => toasts.push([m, k]) }, { ...env, __durable: { behaviorContracts: [signed] } });
    q.render(true); q.render();
    return { q, asked, toasts };
  }
  const values = q => q.all(n => (n.type === 'input' || n.type === 'textarea') && typeof n.props.value === 'string').map(n => n.props.value);
  it('an AI draft asks first and clears the signatures given for the old terms', async () => {
    const { q, asked } = mount(true, reply);
    expect(values(q)).toContain('J. Doe');
    await q.all(n => n.type === 'button' && /Draft/i.test(q.text(n)))[0].props.onClick(); await flush(); q.render();
    expect(asked).toEqual(['Replace contract terms']);
    const v = values(q);
    expect(v).toContain('Use the break card');
    expect(v).toContain('Ask for a break; Return in 5 minutes');
    expect(v).not.toContain('J. Doe');
    expect(v).not.toContain('Ms. R');
  });
  it('an empty reply is an error and keeps the terms', async () => {
    const { q, toasts } = mount(true, '{}');
    await q.all(n => n.type === 'button' && /Draft/i.test(q.text(n)))[0].props.onClick(); await flush(); q.render();
    expect(values(q)).toContain('Stay in seat');
    expect(toasts.pop()).toEqual(['Drafting failed', 'error']);
  });
  it('deleting a saved contract asks first', async () => {
    const { q, asked } = mount(false, reply);
    q.all(n => n.type === 'button' && n.props['aria-expanded'] !== undefined)[0].props.onClick(); q.render();
    await byLabel(q, 'Delete Stay in seat').props.onClick(); q.render();
    expect(asked).toEqual(['Delete saved contract']);
    expect(byLabel(q, 'Delete Stay in seat')).toBeTruthy();
  });
  it('the draft cleaner', () => {
    expect(ns('BehaviorLensContract').cleanContractDraft({})).toBe(null);
    expect(ns('BehaviorLensContract').cleanContractDraft({ targetBehavior: 'X', consequences: 'Y' }).supportPlan).toBe('Y');
  });
});

describe('pocket BIP', () => {
  it('asks before replacing the card, rejects an empty reply, and grows to fit', async () => {
    const { asked, env } = confirmEnv(true); const toasts = [];
    const card = { targetBehavior: 'Elopement', function: 'Escape', replacementBehavior: 'Break card', reinforcement: '', deescalation: '1. Lower voice\n2. Offer the break card\n3. Give space' };
    const q = componentHarness('PocketBip', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: async () => '{}', t: () => undefined, addToast: (m, k) => toasts.push([m, k]) }, { ...env, __durable: { pocketBipCard: card } });
    const de = () => q.all(n => n.type === 'textarea' && n.props['aria-label'] === 'De-escalation')[0];
    expect(de().props.rows).toBeGreaterThanOrEqual(3);
    expect(q.all(n => n.props['aria-hidden'] === 'true' && q.text(n).includes('Give space'))).toHaveLength(1);   // printed as text
    await q.all(n => n.type === 'button' && /Generate|Pocket BIP/i.test(q.text(n)) && n.props.onClick !== undefined && !/Print/.test(q.text(n)))[0].props.onClick(); await flush(); q.render();
    expect(asked).toEqual(['Replace pocket BIP']);
    expect(de().props.value).toContain('Give space');
    expect(toasts.pop()[1]).toBe('error');
  });
  it('the reply cleaner joins a list into lines', () => {
    expect(ns('BehaviorLensPocketBip').cleanPocketBipReply({ deescalation: ['Lower voice', 'Give space'] }).deescalation).toBe('Lower voice\nGive space');
    expect(ns('BehaviorLensPocketBip').cleanPocketBipReply({})).toBe(null);
  });
});

describe('home note', () => {
  it('regenerating keeps the edited note for Undo AI; AI off changes nothing', async () => {
    const toasts = []; let reply = 'Dear family, a new note.';
    const q = componentHarness('HomeNoteGenerator', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: async () => reply, t: () => undefined, addToast: (m, k) => toasts.push([m, k]) },
      { DualLabel: text => text, __durable: { homeNoteDraft: 'My edited note' } });
    const gen = () => q.all(n => n.type === 'button' && /Generate/i.test(q.text(n)))[0];
    await gen().props.onClick(); await flush(); q.render();
    expect(q.all(n => n.type === 'textarea')[0].props.value).toBe('Dear family, a new note.');
    byLabel(q, 'Undo AI').props.onClick(); q.render();
    expect(q.all(n => n.type === 'textarea')[0].props.value).toBe('My edited note');
    toasts.length = 0; reply = null;
    await gen().props.onClick(); await flush(); q.render();
    expect(q.all(n => n.type === 'textarea')[0].props.value).toBe('My edited note');
    expect(toasts).toEqual([]);
    expect(src).toContain("h('button', { 'aria-label': 'Translate the note', ");
  });
});

describe('ABC form quick fill', () => {
  it('fills only empty fields, takes a stated time, and invents no intensity', async () => {
    const drafts = [];
    const reply = JSON.stringify({ antecedent: 'AI antecedent', behavior: 'Threw paper', consequence: 'Teacher redirected', intensity: 4, time: '9:15 am', setting: '', notes: '' });
    const q = componentHarness('ABCModal', { entry: null, draft: { antecedent: 'Typed by teacher', occurredAtInput: '2026-09-22T13:00' }, onDraftChange: d => drafts.push(d), onDiscard: () => {}, onSave: () => {}, onClose: () => {}, t: () => undefined, callGemini: async () => reply, studentName: 'Kestrel', addToast: () => {}, targetBehaviors: [] }, { DualLabel: text => text, ...hostIcons('ABCModal') });
    byLabel(q, 'Quick-fill description of what happened').props.onChange({ target: { value: 'at 9:15 he threw paper when asked to show work' } }); q.render();
    await q.all(n => n.type === 'button' && n.props.onClick && /Fill/i.test(q.text(n)))[0].props.onClick(); await flush(); q.render(true);
    const d = drafts[drafts.length - 1];
    expect(d.antecedent).toBe('Typed by teacher');
    expect(d.behavior).toBe('Threw paper');
    expect(d.occurredAtInput).toBe('2026-09-22T09:15');
    expect(d.intensity).toBe(4);           // stated in the reply: the prompt now asks for null when not stated
    expect(src).toContain('"intensity": "a 1-5 rating only if the teacher states one, otherwise null"');
  });
});

describe('FCT phrase follows the function until edited', () => {
  it('escape then attention gives the attention phrase', () => {
    const q = componentHarness('FCTTemplate', { studentName: 'Kestrel', abcEntries: [], aiAnalysis: null, callGemini: null, t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    const pick = label => q.all(n => n.type === 'button' && q.text(n).includes(label))[0].props.onClick();
    const phrase = () => q.all(n => n.props.value === 'I need a break' || n.props.value === 'Can I talk to you?' || n.props.value === 'Typed phrase').map(n => n.props.value)[0];
    pick('Escape'); q.render();
    expect(phrase()).toBe('I need a break');
    pick('Attention'); q.render();
    expect(phrase()).toBe('Can I talk to you?');
  });
});

describe('AlloBot and MI practice', () => {
  it('AlloBot is sent the recent entries as text, and the student context once', async () => {
    let sent = ''; let contextCalls = 0;
    const entries = [{ id: '6b0a3c2e-1f0e-4c6b-9a55-2f7c1f1d9e01', antecedent: 'Math worksheet', behavior: 'Yelled', consequence: 'Break', intensity: null, occurredAt: '2026-09-22T14:00:00Z', timestamp: '2026-09-22T14:00:00Z', timezoneOffset: 240, localDate: '2026-09-22' }];
    const q = componentHarness('AlloBotChat', { callGemini: async p => { sent = p; return 'ok'; }, studentName: 'Kestrel', studentKey: 'k', studentProfile: {}, sessionNotes: [], abcEntries: entries, aiAnalysis: null, buildStudentContext: () => { contextCalls++; return 'CTX'; }, t: () => undefined, addToast: () => {}, alloBotRef: null }, { DualLabel: text => text });
    const input = q.all(n => (n.type === 'input' || n.type === 'textarea') && typeof n.props.onChange === 'function')[0];
    input.props.onChange({ target: { value: 'How do I read this data?' } }); q.render();
    await q.all(n => n.type === 'button' && n.props.onClick && /Send/i.test((n.props['aria-label'] || '') + q.text(n)))[0].props.onClick(); await flush();
    expect(sent).toContain('A: Math worksheet | B: Yelled | C: Break | intensity not rated');
    expect(sent).not.toContain('6b0a3c2e');
    expect(contextCalls).toBe(0);            // callGeminiWithContext adds it
  });
  it('Clear asks before wiping the saved chat', async () => {
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('AlloBotChat', { callGemini: async () => 'ok', studentName: 'Kestrel', studentKey: 'k', studentProfile: {}, sessionNotes: [], abcEntries: [], aiAnalysis: null, buildStudentContext: () => '', t: () => undefined, addToast: () => {}, alloBotRef: null },
      { ...env, __durable: { alloBotMessages: [{ role: 'user', content: 'Earlier question', ts: '2026-09-20T12:00:00Z' }] } });
    await byLabel(q, 'Clear chat history').props.onClick(); q.render();
    expect(asked).toEqual(['Clear AlloBot chat']);
    expect(q.text()).toContain('Earlier question');
  });
  it('MI practice does not get the student context and an unscored reply is not 3/5', () => {
    expect(src).toMatch(/h\(MIPractice, \{\s*\/\/[^\n]*\n\s*callGemini: callGeminiGuarded,/);
    expect(src).not.toContain('qualityMatch ? parseInt(qualityMatch[1]) : 3');
  });
});

describe('with AI off, nothing claims to have been generated', () => {
  it('every AI call checks for a null reply before using it', () => {
    const lines = src.split('\n');
    const bad = [];
    lines.forEach((l, i) => {
      const m = /const (\w+) = await callGemini\w*\(/.exec(l);
      if (!m) return;
      let k = i;
      if (!/\);\s*(\/\/.*)?$/.test(l)) { while (k < i + 150 && !/`(, (true|false))?\);\s*$/.test(lines[k])) k++; }
      const v = m[1];
      const next = lines.slice(k + 1, k + 5).join('\n');
      // A wrapper that hands the reply straight back (callGeminiGuarded) is exempt.
      const ok = new RegExp('\\b' + v + '\\s*==\\s*null|!' + v + '\\b|parseJsonBlobFromText\\(' + v + '\\)|\\b' + v + ' \\|\\||return [^;]*\\b' + v + '\\b').test(next);
      if (!ok) bad.push((i + 1) + ': ' + l.trim().slice(0, 70));
    });
    expect(bad).toEqual([]);
  });
  it('the gate sees every call (not vacuous)', () => {
    expect((src.match(/const \w+ = await callGemini\w*\(/g) || []).length).toBeGreaterThan(70);
  });
});
