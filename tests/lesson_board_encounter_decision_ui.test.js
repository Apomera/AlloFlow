import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
import { encounterDecision } from '../lesson_board_encounter_preview.js';

const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
let UI, root, element;
const board = () => ({ ...makeBoard(), playStyle: 'tabletop', chance: true, goal: 'expedition' });
const find = selector => element.querySelector(selector);
function move(b, run, id, die = 6) {
  if (engine.stepOf(run).phase === 'review') run = engine.merge(run, engine.advance(b, run));
  run = engine.merge(run, engine.begin(b, run, id));
  const node = b.locations.find(item => item.id === id);
  run = engine.merge(run, engine.processAction(b, run, { attemptId: 'decision-ui', requestId: engine.requestId(run), turn: run.turn, kind: 'answer', targetId: id, value: engine.solution(node) }, 'solo', { attemptId: 'decision-ui', active: true }));
  return engine.merge(run, engine.resolve(b, run, { solo: {} }, { dice: [die, die] }));
}
const pending = (b, die = 6) => move(b, move(b, engine.emptyRun(), 'heater', 1), 'cloud', die);
async function render(props) {
  if (!root) { element = document.createElement('div'); element.className = 'lb'; document.body.append(element); root = createRoot(element); }
  await act(async () => root.render(React.createElement(UI.FieldEncounter, { t: key => key, ...props })));
}
async function click(selector) { expect(find(selector)).toBeTruthy(); await act(async () => find(selector).click()); }
const after = () => [0, 1].map(index => Number(find('[data-decision-after="' + index + '"]').textContent));
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const code = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({entryPoints:['lesson_board_encounters_ui.jsx'],bundle:true,write:false,format:'iife',globalName:'EncounterUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
  UI = new Function(code + ';return EncounterUI;')();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; localStorage.clear(); sessionStorage.clear(); });

describe('Encounter decision table', () => {
  it('compares immediate and reserved approaches without spending, choosing, moving, or writing a save', async () => {
    const b = board(), run = pending(b), snapshot = JSON.stringify([b, run]), onChoose = vi.fn();
    await render({ board: b, run, onChoose });
    expect(find('[data-field-approach=collect]').getAttribute('aria-pressed')).toBe('true');
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('collect');
    expect(after()).toEqual(encounterDecision(b, run, 'collect').preview.after);
    expect(find('[data-decision-reserved]')).toBeNull();
    for (const kind of ['prepare', 'crew']) {
      await click('[data-field-approach=' + kind + ']');
      expect(find('[data-field-approach=' + kind + ']').getAttribute('aria-pressed')).toBe('true');
      expect(find('[data-field-decision-preview]').dataset.choice).toBe(kind);
      expect(after()).toEqual(engine.derive(b, run).balance);
      expect(find('[data-decision-reserved]')).toBeTruthy();
      expect(element.querySelectorAll('[data-field-choice]')).toHaveLength(1);
      expect(find('[data-field-choice]').dataset.fieldChoice).toBe(kind);
    }
    expect(onChoose).not.toHaveBeenCalled(); expect(JSON.stringify([b, run])).toBe(snapshot);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });

  it('remembers the exact target within each approach and confirms only the selected target', async () => {
    const b = board(), run = pending(b), onChoose = vi.fn();
    await render({ board: b, run, onChoose });
    await click('[data-field-approach=commission]');
    const offers = engine.fieldOpportunity(b, run).commissions, selected = offers[1].projectId;
    await click('[data-field-commission-option=' + selected + ']');
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('commission:' + selected);
    await click('[data-field-approach=trade]'); await click('[data-field-trade-option="trade:1"]');
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('trade:1');
    expect(after()).toEqual(encounterDecision(b, run, 'trade:1').preview.after);
    expect(find('[data-decision-reserved]')).toBeNull();
    await click('[data-field-approach=commission]');
    expect(find('[data-field-commission-option=' + selected + ']').checked).toBe(true);
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('commission:' + selected);
    expect(onChoose).not.toHaveBeenCalled();
    await click('[data-field-commission-commit]');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('commission:' + selected);
  });

  it('distinguishes a delivery from an investigation lead and previews their exact targets', async () => {
    const b = board(), run = pending(b, 1), onChoose = vi.fn(), onInspect = vi.fn();
    await render({ board: b, run, onChoose, onInspect });
    await click('[data-field-approach=delivery]');
    const delivery = engine.fieldOpportunity(b, run).deliveries[0];
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('delivery:' + delivery.targetId);
    expect(after()).toEqual(engine.derive(b, run).balance);
    await click('[data-field-delivery-inspect=' + delivery.targetId + ']');
    expect(onInspect).toHaveBeenCalledWith(delivery.targetId);
    await click('[data-field-approach=lead]');
    const lead = engine.fieldOpportunity(b, run).leads[1];
    await click('[data-field-lead-option=' + lead.targetId + ']');
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('lead:' + lead.targetId);
    expect(after()).toEqual(engine.derive(b, run).balance);
    expect(onChoose).not.toHaveBeenCalled();
    await click('[data-field-lead-commit]');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('lead:' + lead.targetId);
  });

  it.each([{ role: 'student' }, { locked: true }])('allows private comparison without commitment for %j', async state => {
    const b = board(), run = pending(b), onChoose = vi.fn();
    await render({ board: b, run, onChoose, ...state });
    await click('[data-field-approach=trade]');
    expect(find('[data-field-trade-option="trade:1"]').disabled).toBe(false);
    await click('[data-field-trade-option="trade:1"]');
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('trade:1');
    expect(find('[data-field-trade-commit]').disabled).toBe(true);
    await click('[data-field-trade-commit]'); expect(onChoose).not.toHaveBeenCalled();
    await click('[data-field-approach=prepare]');
    expect(find('[data-field-choice=prepare]').disabled).toBe(true);
    await click('[data-field-choice=prepare]'); expect(onChoose).not.toHaveBeenCalled();
  });

  it('resets a draft when same-turn dice or board mechanics change, without replaying a choice', async () => {
    const b = board(), run = pending(b), onChoose = vi.fn();
    await render({ board: b, run, onChoose });
    await click('[data-field-approach=trade]'); await click('[data-field-trade-option="trade:1"]');
    const different = JSON.parse(JSON.stringify(run)); engine.stepOf(different).result.dice = [7];
    await render({ board: b, run: different, onChoose });
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('collect');
    await click('[data-field-approach=crew]');
    const changed = JSON.parse(JSON.stringify(b)); changed.projects[0].cost[0] += 1;
    await render({ board: changed, run: different, onChoose });
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('collect');
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('retains a private selection across unrelated learner-response updates', async () => {
    const b = board(), run = pending(b), onChoose = vi.fn();
    await render({ board: b, run, onChoose }); await click('[data-field-approach=crew]');
    const updated = JSON.parse(JSON.stringify(run)); engine.stepOf(updated).seen = { observer: true };
    await render({ board: b, run: updated, onChoose });
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('crew');
    expect(onChoose).not.toHaveBeenCalled();
  });

  it.each([
    ['commission', 6, '[data-field-commission-option]'],
    ['trade', 6, '[data-field-trade-option]'],
    ['delivery', 1, '[data-field-delivery-option]'],
    ['lead', 1, '[data-field-lead-option]']
  ])('places the %s consequence after target selection and before its only confirmation', async (kind, die, selector) => {
    const b = board(), run = pending(b, die), onChoose = vi.fn();
    await render({ board: b, run, onChoose }); await click('[data-field-approach=' + kind + ']');
    const radios = [...element.querySelectorAll(selector)], preview = find('[data-field-decision-preview]'), confirm = find('[data-field-choice]');
    expect(radios.length).toBeGreaterThan(0);
    expect(element.querySelectorAll('[data-field-decision-preview]')).toHaveLength(1);
    expect(element.querySelectorAll('[data-field-choice]')).toHaveLength(1);
    for (const radio of radios) expect(Boolean(radio.compareDocumentPosition(preview) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(Boolean(preview.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(preview.nextElementSibling).toBe(confirm);
    expect(confirm.dataset.fieldChoice).toBe(kind);
    expect(onChoose).not.toHaveBeenCalled();
  });

  it.each([
    ['commission', 6, 'commission:research', 'One commission is already reserved'],
    ['delivery', 1, 'delivery:heater', 'Finish your active delivery']
  ])('keeps the occupied %s explanation readable without opening an unavailable approach', async (kind, die, choice, message) => {
    const b = board(); let run = pending(b, die);
    run = engine.merge(run, engine.chooseFieldOpportunity(b, run, choice));
    for (const id of ['rain', 'sequence', 'weather']) run = move(b, run, id, die);
    const onChoose = vi.fn(); await render({ board: b, run, onChoose });
    const approach = find('[data-field-approach=' + kind + ']'), reason = find('[data-decision-unavailable=' + kind + ']');
    expect(approach.disabled).toBe(true); expect(reason.textContent).toContain(message);
    expect(approach.contains(reason)).toBe(true);
    expect(reason.hasAttribute('data-' + kind + '-unavailable')).toBe(true);
    expect(find('[data-field-' + kind + '-offer]')).toBeNull();
    await click('[data-field-approach=' + kind + ']');
    expect(find('[data-field-decision-preview]').dataset.choice).toBe('collect');
    expect(onChoose).not.toHaveBeenCalled();
  });

  it('explains a construction-reserve restriction directly on the unavailable exchange approach', async () => {
    const b = board(); b.goal = 'architect';
    // Both directions would leave one base-resource reserve short. A later
    // workshop can still add yield; that future benefit is not owned yet.
    b.projects.find(project => project.id === 'bridge').cost = [5, 3];
    b.projects.find(project => project.id === 'research').cost = [6, 3];
    b.projects.find(project => project.id === 'network').cost = [6, 3];
    const run = pending(b, 7), trades = engine.fieldOpportunity(b, run).trades, onChoose = vi.fn();
    expect(trades.every(trade => trade.affordable && !trade.legal && trade.reason === 'completion-reserve')).toBe(true);
    await render({ board: b, run, onChoose });
    const approach = find('[data-field-approach=trade]'), reason = find('[data-decision-unavailable=trade]');
    expect(approach.disabled).toBe(true); expect(approach.contains(reason)).toBe(true);
    expect(reason.textContent).toMatch(/reserve|remaining required construction/i);
    expect(find('[data-field-trade-offer]')).toBeNull();
    await click('[data-field-approach=trade]'); expect(onChoose).not.toHaveBeenCalled();
  });
});
