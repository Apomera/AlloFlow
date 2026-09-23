// Behavior Lens Scatterplot auto-fill.
//
// WHY: until 2026-09-23 each auto-filled cell was coded by its share of the week's
// BUSIEST cell (>= 60% of the maximum = "High"), so ONE incident all week showed red
// "High"; "Total occurrences" summed the codes (1s and 2s), not incidents; entries on
// weekends or outside 7 AM-7 PM vanished without a word; and hours used the viewer's
// clock, not the recorder's. Every cell button was named "Toggle Cell". Expected
// values are worked by hand.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let SP, runtime;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  runtime = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  SP = window.AlloModules.BehaviorLensScatterplot;
  if (!SP) throw new Error('BehaviorLensScatterplot did not register');
});

// 2026-09-14 is a Monday. timezoneOffset 240 = UTC-4 (the recorder's clock).
const at = (isoUtc, over = {}) => runtime.normalizeAbcEntry(Object.assign({ antecedent: 'Math', behavior: 'Left seat', consequence: 'Redirect', occurredAt: isoUtc, timezoneOffset: 240 }, over)).entry;

describe('scatterplotFromEntries', () => {
  it('one incident all week is "some", not "high"', () => {
    const r = SP.scatterplotFromEntries([at('2026-09-14T14:10:00Z')], '');   // Mon 10:10 local
    expect(r.counts).toEqual({ '0_10': 1 });
    expect(r.codes).toEqual({ '0_10': 1 });
  });
  it('two or more in an hour is "high", whatever the rest of the week holds', () => {
    const list = [at('2026-09-14T14:10:00Z'), at('2026-09-14T14:40:00Z')];
    for (let i = 0; i < 5; i += 1) list.push(at('2026-09-15T17:05:00Z'));  // Tue 1 PM, 5 incidents
    const r = SP.scatterplotFromEntries(list, '');
    expect(r.codes).toEqual({ '0_10': 2, '1_13': 2 });  // old: Mon 10 AM (2 of max 5) read only "some"
  });
  it('hours come from the recorder\'s clock even when the viewer\'s differs', () => {
    // Pick a recorder offset 3 hours away from this machine's, so the viewer's clock
    // would put the incident in a different hour.
    const machine = new Date('2026-09-16T12:00:00Z').getTimezoneOffset();
    const recorder = machine + 180;
    const e = runtime.normalizeAbcEntry({ antecedent: 'Math', behavior: 'Left seat', consequence: 'Redirect', occurredAt: '2026-09-16T17:00:00Z', timezoneOffset: recorder }).entry;
    const localHour = new Date(Date.parse('2026-09-16T17:00:00Z') - recorder * 60000).getUTCHours();
    expect(Object.keys(SP.scatterplotFromEntries([e], '').counts)).toEqual(['2_' + localHour]);
  });
  it('hours are the recorder\'s, and what falls outside the grid is counted', () => {
    // 22:30 UTC Friday is 6:30 PM Friday in UTC-4: inside (hour 18). 23:30 UTC is 7:30 PM: outside.
    const r = SP.scatterplotFromEntries([at('2026-09-18T22:30:00Z'), at('2026-09-18T23:30:00Z'), at('2026-09-19T15:00:00Z')], '');
    expect(r.counts).toEqual({ '4_18': 1 });
    expect(r).toMatchObject({ included: 1, outside: 2 });
  });
});

describe('the scatterplot panel', () => {
  it('shows incident counts, reports what it left out, and names each cell', () => {
    const entries = [at('2026-09-14T14:10:00Z'), at('2026-09-14T14:20:00Z'), at('2026-09-14T14:50:00Z'), at('2026-09-20T15:00:00Z')];   // 3 on Mon 10 AM, 1 on a Sunday
    const q = componentHarness('ScatterplotAnalysis', { abcEntries: entries, t: () => undefined, addToast: () => {} });
    q.all(n => n.props['aria-label'] === 'Auto-fill from ABC')[0].props.onClick(); q.render();
    const cell = q.byAttr('data-scatter-cell', '0_10')[0];
    expect(cell.props['aria-label']).toBe('Mon 10:00 AM: high (3 incidents)');
    expect(q.text(cell)).toBe('3');
    expect(q.byAttr('data-scatter-meta', 1)).toHaveLength(1);
    expect(q.text()).toContain('1 outside Mon-Fri 7 AM-7 PM are not shown');
    expect(q.text(q.all(n => n.props['data-scatter-total'] !== undefined)[0])).toBe('📊 Cells marked: 1 · Incidents auto-filled: 3');
  });
});
