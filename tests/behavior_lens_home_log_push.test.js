// Behavior Lens home log: pushing entries into the ABC data.
//
// WHY: until 2026-09-23 the home log had no "when did it happen" field, and "Push to
// ABC" used the time the parent SAVED the entry as the time of the behavior: a 7:30 am
// morning-routine incident logged at 9 pm counted at 21:00 in the hour chart, and a
// Monday incident logged on Tuesday counted as Tuesday. With no response recorded it
// wrote "Parent response recorded" as the consequence, which then led Top
// Consequences. Pushed entries skipped normalization (no local day or time zone). The
// mood, context and response chips were all named "Toggle new entry".
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let HL;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  behaviorLensRuntime();          // the workspace runtime the module normalizes with
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  HL = window.AlloModules.BehaviorLensHomeLog;
  if (!HL) throw new Error('BehaviorLensHomeLog did not register');
});

describe('homeLogToAbc', () => {
  it('uses when it happened, keeps no invented consequence, and is normalized', () => {
    const e = { id: 'x', timestamp: '2026-09-23T01:00:00.000Z', occurredAt: '2026-09-22T11:30:00.000Z', timezoneOffset: 240, context: 'Morning routine', behavior: 'Refused shoes', response: '', notes: '', mood: '' };
    const abc = HL.homeLogToAbc(e);
    expect(abc).toMatchObject({ id: 'home_x', occurredAt: '2026-09-22T11:30:00.000Z', localDate: '2026-09-22', consequence: '', setting: 'Home' });   // old: 01:00Z next day (21:00 local), "Parent response recorded"
    expect(abc.recordedAt).toBe('2026-09-23T01:00:00.000Z');
  });
  it('the local day follows the clock of the parent, even when it differs from this machine', () => {
    // 20:30Z is 05:30 the next morning in Tokyo (offset -540); on this machine it is still the 22nd.
    const abc = HL.homeLogToAbc({ id: 'z', timestamp: '2026-09-22T21:00:00.000Z', occurredAt: '2026-09-22T20:30:00.000Z', timezoneOffset: -540, behavior: 'Woke upset' });
    expect(abc.localDate).toBe('2026-09-23');
  });
  it('an older entry with no event time says its time is when it was logged', () => {
    const abc = HL.homeLogToAbc({ id: 'y', timestamp: '2026-09-23T01:00:00.000Z', behavior: 'Cried', response: 'Gave a break' });
    expect(abc.notes).toContain('(time shown is when this was logged, not when it happened)');
    expect(abc.consequence).toBe('Gave a break');
  });
});

describe('the home log panel', () => {
  it('records when it happened and pushes that time', () => {
    let pushed = [];
    const q = componentHarness('HomeBehaviorLog', { studentName: 'Kestrel', studentKey: k => k, t: () => undefined, addToast: () => {}, callGemini: null, setAbcEntries: f => { pushed = typeof f === 'function' ? f([]) : f; } });
    q.all(n => n.type === 'button' && /Log a Behavior/.test(q.text(n)))[0].props.onClick(); q.render();
    q.all(n => n.props.id === 'bl-homelog-when')[0].props.onChange({ target: { value: '2026-09-22T07:30' } }); q.render();
    q.all(n => n.props['aria-label'] === 'Describe what your child did')[0].props.onChange({ target: { value: 'Refused shoes' } }); q.render();
    const chip = q.all(n => n.type === 'button' && q.text(n) === 'Morning routine')[0];
    expect(chip.props['aria-label']).toBeUndefined();                 // old: "Toggle new entry"
    chip.props.onClick(); q.render();
    expect(q.all(n => n.type === 'button' && q.text(n) === 'Morning routine')[0].props['aria-pressed']).toBe('true');
    q.all(n => n.props['aria-label'] === 'Save Entry')[0].props.onClick(); q.render();
    q.all(n => n.type === 'button' && /ABC/.test(q.text(n)) && /Push|Sync|Send/i.test(q.text(n)))[0].props.onClick();
    expect(pushed).toHaveLength(1);
    expect(pushed[0].occurredAt).toBe(new Date('2026-09-22T07:30').toISOString());     // the parent's local 7:30, not the save time
    expect(pushed[0].localDate).toBe('2026-09-22');
    expect(pushed[0].consequence).toBe('');
  });
});
