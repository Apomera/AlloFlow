import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import * as engine from '../lesson_board_engine.js';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
const { makeBoard } = require('../dev-tools/fixtures/lesson_board.cjs');
let UI, root, element;
const make = () => ({ ...makeBoard(), playStyle: 'tabletop', chance: true, goal: 'expedition' });
const node = selector => element.querySelector(selector);
function resolve(board, run, dice = [1, 1]) {
  const target = board.locations.find(item => item.id === engine.stepOf(run).targetId);
  run = engine.merge(run, engine.processAction(board, run, { attemptId: 'a', requestId: engine.requestId(run), turn: run.turn, kind: 'answer', targetId: target.id, value: engine.solution(target) }, 'solo', { attemptId: 'a', active: true }));
  return engine.merge(run, engine.resolve(board, run, { solo: {} }, { dice }));
}
function move(board, run, id, dice) {
  if (engine.stepOf(run).phase === 'review') {
    if (engine.fieldOpportunity(board, run)?.pending) run = engine.merge(run, engine.chooseFieldOpportunity(board, run, 'collect'));
    run = engine.merge(run, engine.advance(board, run));
  }
  run = engine.merge(run, engine.begin(board, run, id));
  return engine.stepOf(run).phase === 'answer' ? resolve(board, run, dice) : run;
}
const pending = board => move(board, move(board, engine.emptyRun(), 'heater'), 'cloud');
const choose = (board, run, choice) => engine.merge(run, engine.chooseFieldOpportunity(board, run, choice));
async function render(Component, props) {
  if (!root) { element = document.createElement('div'); element.className = 'lb'; document.body.append(element); root = createRoot(element); }
  await act(async () => root.render(React.createElement(Component, { t: key => key, ...props })));
}
async function click(selector) { expect(node(selector)).toBeTruthy(); await act(async () => node(selector).click()); }
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const code = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({entryPoints:['lesson_board_encounters_ui.jsx'],bundle:true,write:false,format:'iife',globalName:'EncounterUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
  UI = new Function(code + ';return EncounterUI;')();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; localStorage.clear(); sessionStorage.clear(); });

describe('Expedition opportunity interactions', () => {
  it('compares named destination leads without committing and sends only the explicitly confirmed target',async()=>{
    const board=make(),run=pending(board),snapshot=JSON.stringify(run),onChoose=vi.fn(),onInspect=vi.fn();
    await render(UI.FieldEncounter,{board,run,onChoose,onInspect});
    await click('[data-field-approach=lead]');
    expect([...element.querySelectorAll('[data-field-lead-option]')].map(input=>input.dataset.fieldLeadOption)).toEqual(['cooler','river']);
    expect(node('[data-field-lead-offer]').textContent).toContain('Explore intervening spaces');
    await click('[data-field-lead-option=river]');await click('[data-field-lead-inspect=river]');
    expect(onInspect).toHaveBeenCalledWith('river');expect(onChoose).not.toHaveBeenCalled();expect(JSON.stringify(run)).toBe(snapshot);
    expect(node('[data-field-lead-commit]').textContent).toContain('River station');
    node('[data-field-lead-commit]').focus();await click('[data-field-lead-commit]');
    expect(onChoose).toHaveBeenCalledExactlyOnceWith('lead:river');
    await render(UI.FieldEncounter,{board,run:choose(board,run,'lead:river'),onChoose,onInspect});
    expect(document.activeElement).toBe(node('[data-field-receipt] h4'));
    expect(node('[data-field-lead-receipt]').textContent).toContain('River station');
    expect(node('[data-field-lead-receipt]').textContent).toContain('+2 Connection tokens');
    expect(node('[data-field-lead]')).toBeNull();
  });
  it('keeps destination inspection available but prevents student or paused commitment',async()=>{
    const board=make(),run=pending(board),onChoose=vi.fn(),onInspect=vi.fn();
    for(const state of [{role:'student'},{locked:true}]){
      await render(UI.FieldEncounter,{board,run,onChoose,onInspect,...state});
      await click('[data-field-approach=lead]');
      expect(node('[data-field-lead-commit]').disabled).toBe(true);
      expect([...element.querySelectorAll('[data-field-lead-option]')].every(input=>!input.disabled)).toBe(true);
      await click('[data-field-lead-option=river]');
      await click('[data-field-lead-commit]');await click('[data-field-lead-inspect=river]');
    }
    expect(onChoose).not.toHaveBeenCalled();expect(onInspect).toHaveBeenCalledTimes(2);
  });
  it('keeps a named lead visible at a later encounter and displays its actual destination payout once',async()=>{
    const board=make(),onChoose=vi.fn(),onInspect=vi.fn();let run=choose(board,pending(board),'lead:cooler');
    for(const id of ['rain','sequence','weather'])run=move(board,run,id);
    await render(UI.FieldEncounter,{board,run,onChoose,onInspect});
    expect(node('[data-field-lead]').textContent).toContain('Cooling station');
    expect(node('[data-field-lead-commit]')).toBeNull();
    expect(node('[data-field-lead-unavailable]').textContent).toContain('Finish your active destination lead');
    await click('[data-field-active-lead-inspect]');expect(onInspect).toHaveBeenCalledWith('cooler');
    run=move(board,run,'cooler');
    await render(UI.FieldEncounter,{board,run,onChoose,onInspect});
    expect(node('[data-field-lead]')).toBeNull();
    const receipt=node('[data-field-delivery-kind=destination]');
    expect(receipt.textContent).toContain('Destination lead completed');expect(receipt.textContent).toContain('Cooling station');
    expect(receipt.textContent).toContain('+2 Observation tokens');
    run=engine.merge(run,engine.advance(board,run));await render(UI.FieldEncounter,{board,run,onChoose,onInspect});
    expect(node('[data-field-delivery]')).toBeNull();
  });
  it('offers a crew with an explicit upfront-payment condition and keeps its receipt separate from immediate supplies', async () => {
    const board=make(),waiting=pending(board),onChoose=vi.fn();
    await render(UI.FieldEncounter,{board,run:waiting,onChoose});
    await click('[data-field-approach=crew]');
    const choice=node('[data-field-choice=crew]');expect(choice.disabled).toBe(false);
    expect(node('[data-decision-reserved]').textContent).toContain('+1 Observation tokens');expect(node('[data-decision-reserved]').textContent).toContain('+1 Connection tokens');
    expect(element.textContent).toContain('full cost first');choice.focus();await click('[data-field-choice=crew]');
    expect(onChoose).toHaveBeenCalledWith('crew');
    let run=choose(board,waiting,'crew');await render(UI.FieldEncounter,{board,run,onChoose});
    expect(node('[data-field-receipt]').textContent).toContain('cannot fund that payment');
    expect(node('[data-field-crew]')).toBeNull();expect(document.activeElement).toBe(node('[data-field-receipt] h4'));
    run=move(board,run,'heater');await render(UI.FieldEncounter,{board,run});
    expect(node('[data-field-crew]').textContent).toContain('Pay the full construction cost first');
    run=move(board,run,'research');await render(UI.FieldEncounter,{board,run});
    expect(node('[data-field-crew]')).toBeNull();expect(node('[data-field-delivery]').textContent).toContain('Construction crew paid off');
    expect(node('[data-field-delivery]').textContent).toContain('Research station');
    expect(node('[data-field-delivery]').textContent).not.toContain('investigation succeeded');
  });
  it('keeps a reserved crew visible and refuses to equip a second one at a later encounter',async()=>{
    const board=make(),onChoose=vi.fn();let run=choose(board,pending(board),'crew');
    for(const id of ['rain','sequence','weather'])run=move(board,run,id);
    expect(engine.fieldOpportunity(board,run).pending).toBe(true);
    await render(UI.FieldEncounter,{board,run,onChoose});
    expect(node('[data-field-crew]')).toBeTruthy();expect(node('[data-field-approach=crew]').disabled).toBe(true);
    expect(node('[data-field-crew-unavailable]').textContent).toContain('existing construction crew');
    await click('[data-field-approach=crew]');expect(onChoose).not.toHaveBeenCalled();
    expect(node('[data-field-approach=prepare]').disabled).toBe(false);
  });
  it('shows immediate versus prepared rewards and leaves choice, draws, and resources untouched until confirmed', async () => {
    const board = make(), run = pending(board), snapshot = JSON.stringify(run), onChoose = vi.fn();
    await render(UI.FieldEncounter, { board, run, onChoose });
    expect(node('[data-field-encounter=survey]')).toBeTruthy();
    expect(node('[data-field-approach=collect]').textContent).toContain('+1 Observation tokens');
    expect(node('[data-field-approach=prepare]').textContent).toContain('+2 Observation tokens');
    expect(node('[data-field-rules]').open).toBe(false);
    expect(node('[data-field-rules]').textContent).toContain('25%');
    expect(node('[data-field-rules]').textContent).toContain('first saved fortune die');
    expect(node('[data-field-rules]').textContent).toContain('2nd, 5th, and 8th');
    expect(node('[data-field-rules]').textContent).toContain('does not reroll');
    await click('[data-field-approach=prepare]');
    expect(onChoose).not.toHaveBeenCalled();
    await click('[data-field-choice=prepare]');
    expect(onChoose).toHaveBeenCalledWith('prepare'); expect(JSON.stringify(run)).toBe(snapshot);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
  it('keeps comparison available but commitment disabled for students and paused games', async () => {
    const board = make(), run = pending(board), onChoose = vi.fn();
    await render(UI.FieldEncounter, { board, run, role: 'student', onChoose });
    expect(node('[data-field-teacher-decides]').textContent).toContain('Your teacher chooses');
    expect([...element.querySelectorAll('[data-field-choice]')].every(button => button.disabled)).toBe(true);
    await click('[data-field-choice=collect]'); expect(onChoose).not.toHaveBeenCalled();
    await render(UI.FieldEncounter, { board, run, role: 'teacher', locked: true, onChoose });
    await click('[data-field-approach=prepare]');
    await click('[data-field-choice=prepare]'); expect(onChoose).not.toHaveBeenCalled();
    expect(node('[data-field-choice=prepare]').disabled).toBe(true);
  });
  it('moves focus from a committed choice to its receipt without taking focus from elsewhere', async () => {
    const board = make(), run = pending(board), onChoose = vi.fn();
    await render(UI.FieldEncounter, { board, run, onChoose });
    node('[data-field-choice=collect]').focus(); await click('[data-field-choice=collect]');
    await render(UI.FieldEncounter, { board, run: choose(board, run, 'collect'), onChoose });
    expect(node('[data-field-choice]')).toBeNull(); expect(document.activeElement).toBe(node('[data-field-receipt] h4'));
    expect(node('[data-field-receipt]').textContent).toContain('included in your balance');
    const outside = document.createElement('button'); document.body.append(outside); outside.focus();
    await render(UI.FieldEncounter, { board, run, onChoose });
    await render(UI.FieldEncounter, { board, run: choose(board, run, 'prepare'), onChoose });
    expect(document.activeElement).toBe(outside);
    await render(UI.FieldEncounter, { board, run, onChoose });
    await click('[data-field-approach=prepare]');
    node('[data-field-choice=prepare]').focus(); await click('[data-field-choice=prepare]'); outside.focus();
    await render(UI.FieldEncounter, { board, run: choose(board, run, 'prepare'), onChoose });
    expect(document.activeElement).toBe(outside); outside.remove();
  });
  it('keeps preparation visible through choosing and answering, then celebrates its actual delivery once', async () => {
    const board = make(), prepared = choose(board, pending(board), 'prepare');
    let run = engine.merge(prepared, engine.advance(board, prepared));
    await render(UI.FieldEncounter, { board, run });
    expect(node('[data-field-preparation]').textContent).toContain('+2 Observation tokens');
    expect(node('[data-field-preparation]').textContent).toContain('Travel, building, and retries');
    run = engine.merge(run, engine.begin(board, run, 'rain'));
    await render(UI.FieldEncounter, { board, run }); expect(node('[data-field-preparation]')).toBeTruthy();
    run = resolve(board, run);
    await render(UI.FieldEncounter, { board, run });
    expect(node('[data-field-preparation]')).toBeNull(); expect(element.querySelectorAll('[data-field-delivery]')).toHaveLength(1);
    expect(node('[data-field-delivery]').textContent).toContain('+2 Observation tokens');
    run = engine.merge(run, engine.advance(board, run));
    await render(UI.FieldEncounter, { board, run }); expect(node('[data-field-delivery]')).toBeNull();
  });
  it('explains why preparation cannot be selected after the final unexplored space', async () => {
    const board = make(), onChoose = vi.fn(); let run = engine.emptyRun();
    for (const id of ['heater', 'cloud', 'rain', 'sequence', 'weather', 'cooler', 'lake', 'river']) run = move(board, run, id);
    expect(engine.fieldOpportunity(board, run).canPrepare).toBe(false);
    await render(UI.FieldEncounter, { board, run, onChoose });
    expect(node('[data-field-approach=prepare]').disabled).toBe(true); expect(node('[data-field-choice=collect]').disabled).toBe(false);
    expect(node('[data-field-prepare-unavailable]').textContent).toContain('no new spaces remain');
    await click('[data-field-approach=prepare]'); expect(onChoose).not.toHaveBeenCalled();
  });
  it('keeps preparation visible during travel, construction, and unsuccessful review without duplicating its original receipt', async () => {
    const board = make(); let run = choose(board, pending(board), 'prepare');
    await render(UI.FieldEncounter, { board, run });
    expect(node('[data-field-receipt]')).toBeTruthy(); expect(node('[data-field-preparation]')).toBeNull();
    run = move(board, run, 'heater');
    await render(UI.FieldEncounter, { board, run });
    expect(node('[data-field-preparation]').textContent).toContain('+2 Observation tokens');
    run = move(board, run, 'bridge');
    await render(UI.FieldEncounter, { board, run });
    expect(node('[data-field-preparation]')).toBeTruthy(); expect(node('[data-field-delivery]')).toBeNull();
    run = engine.merge(run, engine.advance(board, run)); run = engine.merge(run, engine.begin(board, run, 'rain'));
    run = engine.merge(run, engine.processAction(board, run, { attemptId: 'a', requestId: engine.requestId(run), turn: run.turn, kind: 'answer', targetId: 'rain', value: '0' }, 'solo', { attemptId: 'a', active: true }));
    run = engine.merge(run, engine.resolve(board, run, { solo: {} }, { dice: [1, 1] }));
    expect(engine.stepOf(run).result.success).toBe(false);
    await render(UI.FieldEncounter, { board, run });
    expect(node('[data-field-preparation]').textContent).toContain('+2 Observation tokens');
    expect(node('[data-field-delivery]')).toBeNull(); expect(node('[data-field-encounter]')).toBeNull();
  });
  it('adapts the encounter to all five themes and excludes boards without tabletop chance', async () => {
    const board = make(), run = pending(board);
    const titles = { river: 'Riverbank survey', garden: 'Garden survey', workshop: 'Workbench survey', archive: 'Archive survey', space: 'Orbital survey' };
    for (const [theme, title] of Object.entries(titles)) {
      await render(UI.FieldEncounter, { board: { ...board, theme }, run });
      expect(node('[data-field-encounter] h4').textContent).toBe(title);
      expect(node('[data-field-rules]').textContent).toContain('fictional expedition events');
    }
    await render(UI.FieldEncounter, { board: { ...board, chance: false }, run }); expect(element.textContent).toBe('');
    await render(UI.FieldEncounter, { board: { ...board, playStyle: undefined }, run }); expect(element.textContent).toBe('');
  });
});

describe('Reward-to-strategy follow-through', () => {
  it('waits for the chance decision, then offers up to two newly fundable projects without spending or moving', async () => {
    const board = make(), waiting = pending(board), onInspect = vi.fn();
    await render(UI.NextOpportunity, { board, run: waiting, onInspect }); expect(node('[data-next-opportunity]')).toBeNull();
    const run = choose(board, waiting, 'prepare'), snapshot = JSON.stringify(run);
    await render(UI.NextOpportunity, { board, run, onInspect });
    const buttons = [...element.querySelectorAll('[data-next-project]')];
    expect(buttons.map(button => button.dataset.nextProject)).toEqual(['bridge', 'research']);
    expect(element.textContent).toContain('Inspect the site and payment');
    await click('[data-next-project=bridge]'); expect(onInspect).toHaveBeenCalledWith('bridge'); expect(JSON.stringify(run)).toBe(snapshot);
    expect(localStorage.length + sessionStorage.length).toBe(0);
  });
  it('does not repeat already fundable projects and disables inspection while paused', async () => {
    const board = make(), run = choose(board, pending(board), 'collect'), onInspect = vi.fn();
    await render(UI.NextOpportunity, { board, run, onInspect, locked: true });
    expect(node('[data-next-project=bridge]').disabled).toBe(true); await click('[data-next-project=bridge]'); expect(onInspect).not.toHaveBeenCalled();
    const next = move(board, run, 'rain');
    await render(UI.NextOpportunity, { board, run: next, onInspect }); expect(node('[data-next-opportunity]')).toBeNull();
    const choosing = engine.merge(run, engine.advance(board, run));
    await render(UI.NextOpportunity, { board, run: choosing, onInspect }); expect(node('[data-next-opportunity]')).toBeNull();
  });
});
