// Behavior Lens Caseload Dashboard and MTSS Tier Manager.
//
// WHY: until 2026-09-23 both filtered the OPEN student's ABC entries by
// `e.student === name`, a field entries saved from the ABC form never carry, and the
// list holds only the open student anyway. Every student read "0 entries, Never, Needs
// Attention", nobody could reach Urgent, and the AI caseload summary and tier
// recommendations were sent zeros for everyone. Status sorted Urgent LAST. Tiering a
// student not yet on the roster cut the roster to 20, dropping a student whose saved
// workspace is keyed by that roster entry. A recommended tier sent as "2" was stored as
// a string and read back as Tier 1, and a student the model invented could be added.
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
import { componentHarness, behaviorLensRuntime } from './helpers/behavior_lens_component_harness.js';

const require = createRequire(import.meta.url);
let runtime;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  runtime = behaviorLensRuntime();
  try { loadAlloModule('behavior_lens_module.js'); } catch (e) { /* UI half may need a host */ }
});
afterEach(() => { localStorage.clear(); });

const daysAgo = n => new Date(Date.now() - n * 86400000).toISOString();
// Saved from the ABC form: no `student` field.
const entry = (d, intensity) => runtime.normalizeAbcEntry({ antecedent: 'Math', behavior: 'Hitting', consequence: 'Redirect', occurredAt: daysAgo(d), intensity }).entry;
const caseload = [{ studentNickname: 'Ava' }, { studentNickname: 'Ben' }, { studentNickname: 'Cal' }];
const roster = [{ id: 'r-ava', name: 'Ava' }, { id: 'r-ben', name: 'Ben' }];

function seedBen() {
  localStorage.setItem('behaviorLens_workspace_r-ben', JSON.stringify({ student: 'Ben', abcEntries: [entry(1, 2), entry(3, 2)] }));
}

describe('the caseload', () => {
  it('reads the open student live and others from this device, most urgent first', () => {
    seedBen();
    const q = componentHarness('CaseloadDashboard', { abcEntries: [entry(1, 5), entry(2, 4), entry(4, 5)], dashboardData: caseload, callGemini: null, t: () => undefined, addToast: () => {}, selectedStudent: 'Ava', setSelectedStudent: () => {}, openPanel: () => {}, studentRoster: roster });
    const rows = q.all(n => n.props['data-caseload-row'] !== undefined).map(n => [n.props['data-caseload-row'], q.text(n)]);
    expect(rows.map(r => r[0])).toEqual(['Ava', 'Ben', 'Cal']);           // old: Urgent sorted last
    expect(rows[0][1]).toContain('Urgent');                                // old: 0 entries, Needs Attention
    expect(rows[0][1]).toContain('3 entries');
    expect(rows[1][1]).toContain('On Track');
    expect(rows[1][1]).toContain('2 entries');
    expect(rows[2][1]).toContain('No data on this device');                // old: Needs Attention (999 days)
    expect(rows[2][1]).not.toContain('entries');
  });
  it('the AI summary is not told a student with no data here has zero entries', async () => {
    seedBen();
    let sent = '';
    const q = componentHarness('CaseloadDashboard', { abcEntries: [entry(1, 5)], dashboardData: caseload, callGemini: async p => { sent = p; return 'ok'; }, t: () => undefined, addToast: () => {}, selectedStudent: 'Ava', setSelectedStudent: () => {}, openPanel: () => {}, studentRoster: roster });
    await q.all(n => n.type === 'button' && /AI Caseload Summary/.test(q.text(n)))[0].props.onClick();
    expect(sent).toContain('Ava: 1 entries, status=urgent');
    expect(sent).toContain('Ben: 2 entries');
    expect(sent).toContain('Cal: no data on this device (not assessed)');
  });
});

describe('MTSS tiers', () => {
  const mount = (rosterIn, sent = { p: '' }) => {
    let rosterNow = rosterIn;
    const q = componentHarness('MTSSTierManager', { dashboardData: caseload, abcEntries: [entry(1, 5)], callGemini: async p => { sent.p = p; return JSON.stringify({ recommendations: [{ student: 'Ben', currentTier: 1, recommendedTier: '2', reason: 'r' }, { student: 'Zed', currentTier: 1, recommendedTier: 3, reason: 'r' }], summary: 's' }); },
      t: () => undefined, addToast: () => {}, selectedStudent: 'Ava', studentRoster: rosterIn, setStudentRoster: f => { rosterNow = typeof f === 'function' ? f(rosterNow) : f; } });
    return { q, roster: () => rosterNow };
  };
  it('recommendations are based on each student\'s real entries', async () => {
    seedBen();
    const sent = { p: '' };
    const { q } = mount(roster, sent);
    await q.all(n => n.type === 'button' && /AI Tier Recommendations/.test(q.text(n)))[0].props.onClick();
    expect(sent.p).toContain('Ava: Tier 1, 1 entries');
    expect(sent.p).toContain('Ben: Tier 1, 2 entries');
    expect(sent.p).toContain('Cal: Tier 1, no data on this device');
  });
  it('a tier sent as "2" is applied as 2, and an invented student is refused', async () => {
    const { q, roster: now } = mount(roster);
    await q.all(n => n.type === 'button' && /AI Tier Recommendations/.test(q.text(n)))[0].props.onClick(); q.render();
    q.all(n => n.props['aria-label'] === 'Apply: Ben to Tier 2')[0].props.onClick();
    expect(now().find(r => r.name === 'Ben').mtssTier).toBe(2);          // old: "2", read back as Tier 1
    q.all(n => n.props['aria-label'] === 'Apply: Zed to Tier 3')[0].props.onClick();
    expect(now().some(r => r.name === 'Zed')).toBe(false);               // old: an invented student joined the roster
  });
  it('tiering a new student never drops anyone from the roster', () => {
    const full = Array.from({ length: 20 }, (_, i) => ({ id: 'r' + i, name: 'S' + i }));
    const { q, roster: now } = mount(full);
    q.all(n => n.props['aria-label'] === 'MTSS tier level for Cal')[0].props.onChange({ target: { value: '3' } });
    expect(now()).toHaveLength(21);                                     // old: 20, 'S19' gone
    expect(now().some(r => r.name === 'S19')).toBe(true);
  });
});
