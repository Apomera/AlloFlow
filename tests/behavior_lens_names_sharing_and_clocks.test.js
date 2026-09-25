// Behavior Lens: generated screen-reader names, notes, IOA wording, what a share holds,
// charts on the recorder's clock, guided-workflow checks and the bias monitor.
//
// WHY: until 2026-09-23
// - Buttons were named from handler names: "On Analyze", "On Open Tool", "Run Second A I
//   Pass", "Select M S W O". Every quiz option was "Quiz Answer", every suggested goal
//   "Apply Suggestion", every restitution plan "Select Plan", every MI scenario "Start
//   Scenario", every preference item a student could pick "Select M S W O".
// - The notes mic was always "Listening... speak now"; the add button was a bare "➕";
//   edit/delete were invisible until hovered; notes and team notes deleted unasked.
// - A second run of the same model was called a "Double-Blind" "independent" review and
//   graded "Acceptable (≥80%)", a reliability verdict.
// - Every share role carried the whole profile, staff notes included; a parent share's
//   strengths were always empty; nothing said the code is not encrypted.
// - Overview, trend heatmap, insights and the report grid used the VIEWER's clock.
// - "Define Target Behavior" turned green on any entry; "✅ Hypothesized: Unknown".
// - "Task removed" (escape) was counted as a punitive consequence.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime, behaviorLensInternals } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  behaviorLensRuntime();
});
const src = readFileSync('behavior_lens_module.js', 'utf8');
const ns = name => window.AlloModules[name];
const byLabel = (q, label) => q.all(n => n.props['aria-label'] === label)[0];
function confirmEnv(answer) {
  const asked = []; const messages = [];
  return { asked, messages, env: { askBehaviorLensConfirmation: async (m, o) => { asked.push(o.title); messages.push(m); return answer; }, DualLabel: text => text } };
}

describe('no generated names', () => {
  it('no aria-label is built from a handler name or repeats for every item', () => {
    const bad = [];
    for (const m of src.matchAll(/["']aria-label["']: ["']([^"']+)["']/g)) {
      if (/^(On|Handle) [A-Z]| A I\b|\b[A-Z] [A-Z] [A-Z]\b/.test(m[1]) || ['Quiz Answer', 'Select Plan', 'Apply Suggestion', 'Start Scenario', 'Select Design', 'Select Paired', 'Response', 'Answer', 'Rate', 'Open Tool', 'Listening... speak now'].includes(m[1])) bad.push(m[1]);
    }
    expect(bad).toEqual([]);
  });
  it('the gate sees them (not vacuous)', () => {
    const sample = '"aria-label": "Select M S W O"';
    const m = /["']aria-label["']: ["']([^"']+)["']/.exec(sample);
    expect(/\b[A-Z] [A-Z] [A-Z]\b/.test(m[1])).toBe(true);
  });
  it('preference items are read by their names', () => {
    expect(src).toContain("mswoRemaining.map(item => h('button', { key: item,");
    expect(src).toContain("currentPair.map(item => h('button', { key: item,");
  });
});

describe('session notes', () => {
  function mount(answer) {
    const updates = []; const { asked, env } = confirmEnv(answer);
    const q = componentHarness('SessionNotes', { notes: [{ id: 'n1', text: 'Worked well after the break', timestamp: '2026-09-22T14:00:00Z' }], onUpdateNotes: n => updates.push(n), studentName: 'Kestrel', t: () => undefined, addToast: () => {} }, env);
    return { q, updates, asked };
  }
  it('names its buttons and asks before deleting', async () => {
    const { q, updates, asked } = mount(false);
    expect(byLabel(q, 'Start dictation')).toBeTruthy();
    expect(byLabel(q, 'Add note')).toBeTruthy();
    await byLabel(q, 'Delete note').props.onClick(); q.render();
    expect(asked).toEqual(['Delete note']);
    expect(updates).toEqual([]);
    expect(src).not.toContain("'flex gap-1 ms-2 opacity-0 group-hover:opacity-100");
  });
});

describe('team notes', () => {
  it('asks before deleting', async () => {
    let notes = [{ id: 't1', text: 'Parent called about the bus', roleLabel: 'teacher', timestamp: '2026-09-22T14:00:00Z' }];
    const { asked, env } = confirmEnv(false);
    const q = componentHarness('TeamNotes', { studentName: 'Kestrel', notes, setNotes: fn => { notes = typeof fn === 'function' ? fn(notes) : fn; }, announce: () => {}, t: () => undefined, addToast: () => {} }, env);
    await byLabel(q, 'Delete teacher note').props.onClick();
    expect(asked).toEqual(['Delete team note']);
    expect(notes).toHaveLength(1);
  });
});

describe('IOA second AI pass', () => {
  it('is a consistency check of one model, not a double-blind review', () => {
    expect(src).not.toMatch(/double-blind/i);
    expect(src).toContain("'Second AI Pass (same model, run again)'");
    expect(src).toContain("interpretation: parseFloat(aiPct) >= 90 ? 'Consistent (≥90%)' : parseFloat(aiPct) >= 80 ? 'Mostly consistent (80-89%)' : 'Inconsistent (<80%)'");
  });
});

describe('workspace sharing', () => {
  const profile = { strengths: 'Kind to peers; Loves drawing', interests: 'Art', triggers: 'Loud noise', goals: 'Stay in seat', accommodations: 'Breaks', notes: 'STAFF ONLY: custody issue' };
  const analysis = { summary: 'Escape-maintained during math.', hypothesizedFunction: 'Escape', recommendations: ['Break card', 'Choice of problems'], reviewStatus: 'unreviewed' };
  function share(role, answer = true) {
    const { asked, messages, env } = confirmEnv(answer);
    const blobs = [];
    const origBlob = globalThis.Blob;
    globalThis.Blob = function (parts) { blobs.push(parts.join('')); };
    const origCreate = URL.createObjectURL, origRevoke = URL.revokeObjectURL;
    URL.createObjectURL = () => 'blob:x'; URL.revokeObjectURL = () => {};
    const origClick = HTMLAnchorElement.prototype.click; HTMLAnchorElement.prototype.click = () => {};
    const q = componentHarness('WorkspaceSharing', { abcEntries: [{ id: 'e1', behavior: 'Yell', antecedent: 'Math', consequence: 'Break', intensity: 3 }], observationSessions: [], sessionHistory: [], aiAnalysis: analysis, studentProfile: profile, selectedStudent: 'Kestrel', studentRoster: [], cloudSync: null, addToast: () => {}, t: () => undefined }, env);
    const done = (async () => {
      q.all(n => n.type === 'button' && q.text(n).includes(role === 'parent' ? 'Parent' : role === 'teacher' ? 'Teacher' : 'BCBA'))[0].props.onClick(); q.render();
      await byLabel(q, 'Download Share File').props.onClick();
      globalThis.Blob = origBlob; URL.createObjectURL = origCreate; URL.revokeObjectURL = origRevoke; HTMLAnchorElement.prototype.click = origClick;
      return { asked, messages, data: blobs[0] ? JSON.parse(blobs[0]) : null };
    })();
    return done;
  }
  it('a parent share holds no profile or staff notes, and has the strengths', async () => {
    const { asked, messages, data } = await share('parent');
    expect(asked).toEqual(['Share student data']);
    expect(messages[0]).toContain('not encrypted');
    expect(data.profile).toBeUndefined();
    expect(JSON.stringify(data)).not.toContain('STAFF ONLY');
    expect(data.strengths).toEqual(['Kind to peers', 'Loves drawing']);
    expect(data.progress).toBe('AI-generated summary, not reviewed by staff: Escape-maintained during math.');
  });
  it('a teacher share holds the profile without staff notes', async () => {
    const { data } = await share('teacher');
    expect(data.profile.triggers).toBe('Loud noise');
    expect(JSON.stringify(data)).not.toContain('STAFF ONLY');
  });
  it('a declined share sends nothing', async () => {
    const { data } = await share('bcba', false);
    expect(data).toBe(null);
  });
});

describe('charts use the recorder\'s clock', () => {
  it('no day or hour is read from the viewer\'s clock in these charts', () => {
    expect(src).not.toContain('dayMap[date.getDay()]');
    expect(src).not.toContain('grid[date.getDay()][block]');
    expect(src).not.toContain('abcEntries.map(e => new Date(e.timestamp).getHours())');
    expect(src).not.toContain("const d = new Date(e.timestamp||e.date);\n                            const dayIdx = d.getDay()-1;");
  });
  it('the local-parts helper reads the recorded offset', () => {
    const parts = behaviorLensInternals()('abcEntryLocalParts');
    // 13:30Z on Monday 21 Sep, recorded in Tokyo (UTC+9, offset -540): 22:30 Monday there.
    expect(parts({ occurredAt: '2026-09-21T13:30:00Z', timezoneOffset: -540 })).toEqual({ dow: 1, hour: 22 });
    // 01:30Z Tuesday recorded at UTC-4 (offset 240): 21:30 Monday for the recorder.
    expect(parts({ occurredAt: '2026-09-22T01:30:00Z', timezoneOffset: 240 })).toEqual({ dow: 1, hour: 21 });
  });
});

describe('guided workflow checks', () => {
  it('an AI guess or its "Unknown" fallback is not a green check', () => {
    const { aiHypothesisCheck, targetDefinitionCheck } = ns('BehaviorLensWorkflowChecks');
    expect(aiHypothesisCheck({ hypothesizedFunction: 'Unknown' })).toBe(null);
    expect(aiHypothesisCheck({ hypothesizedFunction: 'Escape' })).toBe('🔄 AI suggests: Escape (confirm it with your team)');
    expect(targetDefinitionCheck([], [{ id: 1 }])).toBe('🔄 Entries logged, but no written definition saved yet');
    expect(targetDefinitionCheck([{ label: 'Elopement', operationalDefinition: 'Leaves the room without permission' }], [])).toBe('✅ 1 target behavior defined');
    expect(src).toMatch(/h\(GuidedWorkflowHub, \{[\s\S]{0,300}?abcEntries,\s*targetBehaviors,/);
    expect(src).not.toContain('`✅ Hypothesized: ${');
    expect(src).not.toContain('`✅ ${abcEntries.length} ABC entries logged`');
  });
});

describe('bias monitor', () => {
  const entries = c => Array.from({ length: 6 }, (_, i) => ({ id: 'e' + i, antecedent: 'Math', behavior: 'Yell', consequence: c, intensity: 2, occurredAt: '2026-09-2' + i + 'T14:00:00Z' }));
  it('the monitor flags exclusion, not a removed task', () => {
    const escape = componentHarness('BiasReflectionMonitor', { abcEntries: entries('Task removed'), callGemini: null, t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    expect(escape.text()).not.toContain('Punitive consequences');
    const exclusion = componentHarness('BiasReflectionMonitor', { abcEntries: entries('Removed from class'), callGemini: null, t: () => undefined, addToast: () => {} }, { DualLabel: text => text });
    expect(exclusion.text()).toContain('Punitive consequences (6)');
  });
  it('"Task removed" is not punitive; being removed from class is', () => {
    const { consequenceIsExclusionary } = ns('BehaviorLensBias');
    expect(consequenceIsExclusionary('Task removed')).toBe(false);
    expect(consequenceIsExclusionary('Given break')).toBe(false);
    expect(consequenceIsExclusionary('Removed from class')).toBe(true);
    expect(consequenceIsExclusionary('Sent to the office')).toBe(true);
    expect(consequenceIsExclusionary('Lost recess')).toBe(true);
    expect(consequenceIsExclusionary('Office referral')).toBe(true);
  });
});
