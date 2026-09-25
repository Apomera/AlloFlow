// Moon Mission — the debrief links the calls, keeps the student's notes, gives a
// report to hand in, and remembers earlier flights.
//
// The flight record explained each graded call on its own, but nothing said how the
// TLI timing set up the correction and the correction set up the landing. There was
// nowhere to reflect, nothing a teacher could collect, and the task line said "fly
// again and beat it" while Fly Another Mission wiped the flight it replaced.
// Handlers are the real ones, found by walking the element tree (the tool has no hooks).
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';

const FLOWN = {
  missionPhase: 10, difficulty: 'pilot',
  tliAccuracy: { onTime: false, offByDeg: 22, side: 'early' },
  mccChoice: 'skipped',
  landingResult: { crashed: false, score: 62, grade: 'C', vVel: 2.1, hVel: 1.4, fuel: 6, fuelUnit: 's' },
  entryOutcome: { outcome: 'nominal', angle: -6.4, peakG: 6.3 },
  quizCorrect: 7, crewMorale: 80,
  decisionLog: [{ title: 'Program alarm 1202', chosen: 'Continue the descent', quality: 'optimal', optimal: 'Continue the descent', historical: '' }],
};

function mount(state) {
  loadTool(FILE, ID);
  const store = newStore({ moonMission: Object.assign({}, state) });
  const tree = () => window.StemLab._registry[ID].render(makeCtx({ toolData: store.toolData }, store));
  return { store, tree, mm: () => store.toolData.moonMission };
}
function walk(node, pred, out = []) {
  if (node == null || typeof node !== 'object') return out;
  if (Array.isArray(node)) { node.forEach((n) => walk(n, pred, out)); return out; }
  if (pred(node)) out.push(node.props);
  const kids = node.props && node.props.children;
  if (kids != null) walk(kids, pred, out);
  return out;
}
function textOf(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  return textOf(node.props && node.props.children);
}
const html = (state) => { loadTool(FILE, ID); return renderTool(ID, { moonMission: state }); };
const chainItems = (h) => {
  const ol = (h.match(/data-moonmission-cause-chain="true"[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/) || [])[1] || '';
  return (ol.match(/<li[\s\S]*?<\/li>/g) || []).map((li) => li.replace(/<[^>]+>/g, ''));
};

beforeEach(() => resetStemLab());
afterEach(() => vi.restoreAllMocks());

describe('what caused what', () => {
  it('links TLI timing, the correction and the landing, with this flight\'s own numbers', () => {
    const items = chainItems(html(FLOWN));
    expect(items).toHaveLength(5);
    expect(items[0]).toMatch(/TLI fired 22° early/);
    expect(items[1]).toMatch(/declined the correction.*25 s less hover fuel and 7 m\/s more drift/);
    expect(items[2]).toMatch(/touched down at 2\.1 m\/s.*grade C, with 6 s of fuel left.*started 25 s short/);
    expect(items[3]).toMatch(/1 mission event, 1 the way Apollo would have.*morale ended at 80%/);
    expect(items[4]).toMatch(/entry angle to -6\.4°.*inside the corridor, about 6\.3 g/);
  });

  it('an on-time flight has no correction step and says why', () => {
    const items = chainItems(html(Object.assign({}, FLOWN, { tliAccuracy: { onTime: true, offByDeg: 3 }, mccChoice: null })));
    expect(items[0]).toMatch(/inside the burn window.*needed no correction/);
    expect(items.join(' ')).not.toMatch(/correction you skipped|declined/);
  });

  it('a flight with nothing graded shows no chain', () => {
    expect(html({ missionPhase: 10 })).not.toContain('data-moonmission-cause-chain');
  });
});

describe('debrief notes and the report', () => {
  it('both prompts are labelled textareas that write to the flight', () => {
    const h = html(FLOWN);
    for (const id of ['mm-reflect-mattered', 'mm-reflect-next']) {
      expect(h).toContain('for="' + id + '"');
      expect(h).toMatch(new RegExp('<textarea[^>]*id="' + id + '"'));
    }
    const app = mount(FLOWN);
    const [ta] = walk(app.tree(), (n) => n.type === 'textarea' && n.props.id === 'mm-reflect-mattered');
    ta.onChange({ target: { value: 'Skipping the correction' } });
    const [ta2] = walk(app.tree(), (n) => n.type === 'textarea' && n.props.id === 'mm-reflect-next');
    ta2.onChange({ target: { value: 'Burn it on the coast' } });
    expect(app.mm().reflection).toEqual({ mattered: 'Skipping the correction', next: 'Burn it on the coast' });
    const [report] = walk(app.tree(), (n) => n.type === 'textarea' && n.props['data-moonmission-report-text']);
    expect(report.value).toContain('The decision that mattered most: Skipping the correction');
    expect(report.value).toContain('Next time I will: Burn it on the coast');
  });

  it('the report carries every graded call, the events and the chain', () => {
    const app = mount(FLOWN);
    const [report] = walk(app.tree(), (n) => n.type === 'textarea' && n.props['data-moonmission-report-text']);
    const r = report.value;
    expect(r).toMatch(/TLI burn: 22° early, outside the window/);
    expect(r).toContain('Mid-course correction: declined');
    expect(r).toMatch(/Landing: touchdown at 2\.1 m\/s, drift 1\.4 m\/s, 6 s of fuel left, score 62 \(C\)/);
    expect(r).toMatch(/Entry: -6\.4°, in the corridor, about 6\.3 g/);
    expect(r).toMatch(/Quiz: 7 \/ 10/);
    expect(r).toContain('- Program alarm 1202: chose "Continue the descent" (optimal)');
    expect(r).toMatch(/What caused what:\n1\. TLI fired 22° early/);
    expect(r).toContain('The decision that mattered most: (not answered)');
  });

  it('Copy flight report puts that text on the clipboard', async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
    const app = mount(FLOWN);
    const [btn] = walk(app.tree(), (n) => n.type === 'button' && n.props['data-moonmission-copy-report']);
    btn.onClick();
    await Promise.resolve();
    expect(writeText).toHaveBeenCalledTimes(1);
    expect(writeText.mock.calls[0][0]).toMatch(/^Apollo Moon Mission .* flight report/);
    expect(writeText.mock.calls[0][0]).toContain('Mid-course correction: declined');
    delete navigator.clipboard;
  });
});

describe('your flights', () => {
  it('Fly Another Mission keeps the flight it replaces (the last five)', () => {
    const older = Array.from({ length: 5 }, (_, i) => ({ difficulty: 'tourist', quiz: { correct: i, total: 10 } }));
    const app = mount(Object.assign({}, FLOWN, { flightHistory: older, reflection: { mattered: 'x' } }));
    const [again] = walk(app.tree(), (n) => n.type === 'button' && /Fly Another Mission/.test(textOf(n.props.children)));
    again.onClick();
    const mm = app.mm();
    expect(mm.missionPhase).toBe(0);
    expect(mm.reflection).toBeNull();
    expect(mm.flightHistory).toHaveLength(5);
    const kept = mm.flightHistory[4];
    expect(kept.mcc).toBe('skipped');
    expect(kept.landing).toMatchObject({ crashed: false, grade: 'C', fuel: 6, fuelUnit: 's' });
    expect(kept.tli).toMatchObject({ onTime: false, offByDeg: 22 });
    expect(mm.flightHistory[0].quiz.correct).toBe(1);   // the oldest one dropped off
  });

  it('the table compares this flight with the last one', () => {
    const prev = { difficulty: 'pilot', tli: { onTime: false, offByDeg: 30, side: 'early' }, mcc: 'skipped',
      landing: { crashed: false, score: 40, grade: 'D', vVel: 2.8, hVel: 3, fuel: 1, fuelUnit: 's' },
      entry: { outcome: 'steep', angle: -7.6, peakG: 8.6 }, quiz: { correct: 4, total: 10 }, when: '9/20/2026' };
    const h = html(Object.assign({}, FLOWN, { flightHistory: [prev] }));
    expect(h).toContain('data-moonmission-history="true"');
    expect(h).toMatch(/<caption[^>]*>Your last flights, oldest first/);
    expect((h.match(/<th scope="col"/g) || []).length).toBe(7);
    const body = (h.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '';
    const rows = (body.match(/<tr[\s\S]*?<\/tr>/g) || []).map((r) => r.replace(/<[^>]+>/g, '|'));
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatch(/Flight 1 \(9\/20\/2026\).*Pilot.*30° early.*grade D \(40\).*1 s.*too steep.*4\/10/);
    expect(rows[1]).toMatch(/This flight.*Pilot.*22° early.*grade C \(62\).*6 s.*corridor.*7\/10/);
    const compare = (h.match(/data-moonmission-compare="true"[^>]*>([^<]*)</) || [])[1];
    expect(compare).toBe('Compared with your last flight: landing score 40 → 62; fuel left 1 → 6 s; entry too steep → in the corridor; quiz 4 → 7.');
  });

  it('no history, no table; a malformed history renders dashes, never a crash', () => {
    expect(html(FLOWN)).not.toContain('data-moonmission-history');
    // Not a list of objects: dropped on load, so there is no history to show.
    for (const bad of ['x', 7, [1, null, 'a']]) {
      const h = html(Object.assign({}, FLOWN, { flightHistory: bad }));
      expect(h).toContain('data-moonmission-reflection');
      expect(h).not.toContain('data-moonmission-history');
    }
    // Objects with wrong-typed fields: shown, with dashes where a value is unusable.
    for (const bad of [[{ landing: 'x', quiz: 5, tli: [], entry: 3 }], [{ landing: { crashed: false, score: 'x', fuel: null } }]]) {
      const h = html(Object.assign({}, FLOWN, { flightHistory: bad }));
      expect(h).toContain('This flight');
    }
    const h = html(Object.assign({}, FLOWN, { flightHistory: [{ landing: 'x', quiz: 5, tli: [], entry: 3 }] }));
    const first = ((h.match(/<tbody>([\s\S]*?)<\/tbody>/) || [])[1] || '').match(/<tr[\s\S]*?<\/tr>/)[0].replace(/<[^>]+>/g, '|');
    expect(first).toMatch(/Flight 1(\|)+—(\|)+—(\|)+—(\|)+—(\|)+—(\|)+—/);
  });
});
