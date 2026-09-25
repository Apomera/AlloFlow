// Moon Mission — predict first, then watch the flight show the answer.
//
// Three predict-observe-explain moments, each checked against something the
// simulation itself shows: where the TLI window opens (phase 2), what A/D do to a
// one-engine lander (phase 5), and how long a lunar hop lasts (phase 6, timed by the
// moonwalk loop). The explanation opens only once the flight has shown the answer,
// and nothing waits on a prediction. Handlers are the real ones.
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs';
import { loadTool, makeCtx, newStore, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

// Overridable so a mutation can run against a COPY; other sessions edit this file.
const FILE = process.env.MM_SOURCE || 'stem_lab/stem_tool_moonmission.js';
const ID = 'moonMission';

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
const card = (h, id) => {
  const at = h.indexOf('data-moonmission-predict="' + id + '"');
  if (at < 0) return null;
  const open = h.lastIndexOf('<div', at);
  let depth = 0, i = open;
  for (; i < h.length; i++) {
    if (h.startsWith('<div', i)) depth++;
    else if (h.startsWith('</div>', i)) { depth--; if (depth === 0) return h.slice(open, i + 6).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '); }
  }
  throw new Error('unclosed prediction card ' + id);
};
const TLI_EXPLAIN = /raises the far end of your orbit/;

beforeEach(() => resetStemLab());
afterEach(() => vi.restoreAllMocks());

describe('predict first', () => {
  it('asks before the flight shows anything, and keeps the explanation shut', () => {
    const h = html({ missionPhase: 2, tliWindow: { state: 'systems', offByDeg: 0 } });
    expect((h.match(/data-moonmission-predict-option=/g) || []).length).toBe(3);
    expect(card(h, 'tli_where')).toMatch(/where in your orbit do you fire the TLI burn/);
    expect(h).not.toMatch(TLI_EXPLAIN);
  });

  it('a choice is saved, and the card says what to watch for until the window opens', () => {
    const app = mount({ missionPhase: 2, tliWindow: { state: 'aligning', offByDeg: 40, side: 'early', secsToGo: 9 } });
    const [far] = walk(app.tree(), (n) => n.type === 'button' && n.props['data-moonmission-predict-option'] === 'far');
    far.onClick();
    expect(app.mm().predictions).toEqual({ tli_where: 'far' });
    const h = renderTool(ID, { moonMission: app.mm() });
    expect(card(h, 'tli_where')).toMatch(/Your prediction: On the far side of Earth.*Watch where the green burn window opens/);
    expect(h).not.toMatch(TLI_EXPLAIN);
    expect(h).not.toContain('data-moonmission-predict-option=');
  });

  it('once the window opens it says whether the flight agreed, and why', () => {
    const right = card(html({ missionPhase: 2, predictions: { tli_where: 'far' }, tliWindow: { state: 'go', offByDeg: 2 } }), 'tli_where');
    expect(right).toMatch(/Your prediction matched the flight: On the far side/);
    expect(right).toMatch(TLI_EXPLAIN);
    const wrong = card(html({ missionPhase: 2, predictions: { tli_where: 'near' }, tliWindow: { state: 'go', offByDeg: 2 } }), 'tli_where');
    expect(wrong).toMatch(/Your prediction: On the side of Earth facing.*The flight showed: On the far side of Earth/);
    const none = card(html({ missionPhase: 2, tliWindow: { state: 'go', offByDeg: 2 } }), 'tli_where');
    expect(none).toMatch(/No prediction this time\. What the flight showed: On the far side/);
  });

  it('the landing question opens after touchdown; the hop question after a timed hop', () => {
    const flying = card(html({ missionPhase: 5, descentStarted: true, predictions: { descent_sideways: 'jets' } }), 'descent_sideways');
    expect(flying).toMatch(/watch what A and D/);
    expect(flying).not.toMatch(/far too weak/);
    const landed = card(html({ missionPhase: 5, descentStarted: true, predictions: { descent_sideways: 'jets' },
      landingResult: { crashed: false, score: 70, grade: 'B', vVel: 1.1, hVel: 0.4, fuel: 30, fuelUnit: 's' } }), 'descent_sideways');
    expect(landed).toMatch(/The flight showed: It tilts, so the main engine pushes partly sideways/);
    expect(landed).toMatch(/far too weak to stop metres per second of drift/);

    const waiting = card(html({ missionPhase: 6, predictions: { hop_time: 'six' } }), 'hop_time');
    expect(waiting).toMatch(/press Space \(or JUMP\) and watch the hop timer/);
    const hopped = card(html({ missionPhase: 6, predictions: { hop_time: 'six' }, evaHopTime: 2.1 }), 'hop_time');
    expect(hopped).toMatch(/matched the flight: About six times as long/);
    expect(hopped).toMatch(/Your last hop: 2\.1 s in the air\./);
  });

  it('the moonwalk loop times each hop from take-off to touchdown', () => {
    const src = fs.readFileSync(FILE, 'utf8');
    expect(src).toContain('playerVelY = EVA_JUMP_V0; isJumping = true; evaHopStart = performance.now();');
    expect(src).toMatch(/if \(evaWasAirborne && evaHopStart\) \{[\s\S]{0,200}var hopSecs = Math\.round\(\(performance\.now\(\) - evaHopStart\) \/ 100\) \/ 10;[\s\S]{0,80}upd\('evaHopTime', hopSecs\);/);
  });

  it('the debrief and the report count predictions against the flight', () => {
    const state = { missionPhase: 10, predictions: { tli_where: 'near', hop_time: 'six' }, quizCorrect: 3 };
    const h = html(state);
    const block = ((h.match(/data-moonmission-predictions="true"[\s\S]*?<\/ul>/) || [])[0] || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    expect(block).toMatch(/YOUR PREDICTIONS: 1 \/ 2/);
    expect(block).toMatch(/Where to fire TLI: On the side of Earth facing where the Moon will be → On the far side/);
    expect(block).toMatch(/A hop on the Moon: About six times as long, 2 s/);
    const app = mount(state);
    const [report] = walk(app.tree(), (n) => n.type === 'textarea' && n.props['data-moonmission-report-text']);
    expect(report.value).toContain('Predictions: 1 of 2 matched the flight');
    expect(report.value).toContain('- Where to fire TLI: predicted "On the side of Earth facing where the Moon will be" (the flight showed: On the far side of Earth, opposite where the Moon will be)');
    expect(report.value).toContain('- A hop on the Moon: predicted "About six times as long, 2 s" (right)');
  });

  it('a new flight starts with fresh predictions; hostile saved values never crash', () => {
    const app = mount({ missionPhase: 10, predictions: { tli_where: 'far' }, evaHopTime: 2.1 });
    const [again] = walk(app.tree(), (n) => n.type === 'button' && /Fly Another Mission/.test(textOf(n.props.children)));
    again.onClick();
    expect(app.mm().predictions).toBeNull();
    expect(app.mm().evaHopTime).toBeNull();
    for (const bad of [{ predictions: 'x' }, { predictions: { tli_where: 7, hop_time: {} } }, { evaHopTime: 'fast' }, { predictions: [] }]) {
      for (const phase of [2, 5, 6, 10]) {
        expect(() => html(Object.assign({ missionPhase: phase, tliWindow: { state: 'go' } }, bad))).not.toThrow();
      }
    }
  });
});
