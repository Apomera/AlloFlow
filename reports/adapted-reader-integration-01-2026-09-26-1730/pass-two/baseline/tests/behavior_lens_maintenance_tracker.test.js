// Behavior Lens Maintenance & Generalization tracker.
//
// WHY: until 2026-09-23 the tracker kept its skills in plain component state, so every
// skill, probe and generalization note vanished when the panel closed. A newly added
// skill read "MAINTAINED" before any probe. Dates were UTC: the default mastery date
// was tomorrow for an evening entry in the US, "YYYY-MM-DD" was read as UTC midnight so
// "next probe due" printed a day early west of UTC, and days since the last probe were
// counted in 24-hour blocks, not calendar days. All five probe buttons were named
// "Add Probe". Expected values are worked by hand, on the machine's own calendar.
import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let M;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
  M = window.AlloModules.BehaviorLensMaintenance;
  if (!M) throw new Error('BehaviorLensMaintenance did not register');
});

const skill = (over = {}) => ({ id: 'k1', name: 'Tying shoes', masteryDate: '2026-09-23', schedule: 'biweekly', probes: [], generalization: { settings: [], people: [], materials: [] }, status: 'monitoring', ...over });

describe('maintenanceSchedule', () => {
  it('a date-only mastery date is that day on the teacher\'s calendar', () => {
    // Mastered 09-23, every 14 days: due 10-07. Read as UTC midnight it was 09-22 in the US, due 10-06.
    const r = M.maintenanceSchedule(skill(), new Date(2026, 9, 7, 21, 30));
    expect(r).toMatchObject({ nextDueKey: '2026-10-07', daysSince: 14, isOverdue: false, probed: false });
    expect(M.maintenanceSchedule(skill(), new Date(2026, 9, 8, 0, 5))).toMatchObject({ daysSince: 15, isOverdue: true, overdueDays: 1 });
  });
  it('days since a probe are calendar days, not 24-hour blocks', () => {
    const probed = skill({ probes: [{ date: new Date(2026, 8, 30, 23, 30).toISOString(), pct: 100 }] });
    expect(M.maintenanceSchedule(probed, new Date(2026, 9, 1, 0, 30)).daysSince).toBe(1);   // old: 0 (one hour)
  });
});

describe('maintenanceStatus', () => {
  it('no probe yet is monitoring, not maintained', () => {
    expect(M.maintenanceStatus([])).toBe('monitoring');
    expect(M.maintenanceStatus([{ pct: 100 }, { pct: 80 }])).toBe('monitoring');
    expect(M.maintenanceStatus([{ pct: 40 }, { pct: 100 }, { pct: 100 }, { pct: 80 }])).toBe('maintained');
    expect(M.maintenanceStatus([{ pct: 100 }, { pct: 40 }])).toBe('regression');
  });
});

describe('the tracker panel', () => {
  const props = { studentName: 'Kestrel', t: () => undefined, addToast: () => {} };
  it('keeps skills with the student\'s workspace', () => {
    const q = componentHarness('MaintenanceTracker', props, { __durable: { maintenanceTrackerSkills: [skill()] } });
    expect(q.text()).toContain('Tying shoes');
  });
  it('a new skill is monitoring until it is probed, and says it has not been probed', () => {
    const q = componentHarness('MaintenanceTracker', props);
    q.all(n => n.props['aria-label'] === 'Mastered skill name')[0].props.onChange({ target: { value: '  Zipping coat ' } }); q.render();
    q.all(n => n.type === 'button' && q.text(n) === '+ Add')[0].props.onClick(); q.render();
    const card = q.all(n => n.type === 'button' && /Zipping coat/.test(q.text(n)))[0];
    expect(card.props['aria-label']).toBeUndefined();          // old: "Toggle selected skill" hid the name
    expect(q.text(card)).toContain('monitoring');               // old: maintained
    card.props.onClick(); q.render();
    expect(q.text(q.byAttr('data-maint-schedule', 'true')[0])).toBe('Schedule: probe every 14 days | Not probed yet; counting from mastery, 0 days ago');
    expect(q.all(n => /^Record probe: /.test(n.props['aria-label'] || '')).map(n => n.props['aria-label'])).toEqual(
      ['Record probe: 100% correct', 'Record probe: 80% correct', 'Record probe: 60% correct', 'Record probe: 40% correct', 'Record probe: 20% correct']);
  });
  it('generalization chips say whether each was shown', () => {
    const withGen = skill({ generalization: { settings: [{ name: 'Gym', demonstrated: true, date: null }, { name: 'Library', demonstrated: false, date: null }], people: [], materials: [] } });
    const q = componentHarness('MaintenanceTracker', props, { __durable: { maintenanceTrackerSkills: [withGen] } });
    q.all(n => n.type === 'button' && /Tying shoes/.test(q.text(n)))[0].props.onClick(); q.render();
    const chips = q.all(n => n.props['aria-pressed'] !== undefined).map(n => [q.text(n), n.props['aria-pressed'], n.props['aria-label']]);
    expect(chips).toEqual([['✓ Gym', 'true', undefined], ['○ Library', 'false', undefined]]);
  });
});
