import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let UI, root, element;
const board = kit => ({ playStyle: 'tabletop', resources: ['Observation tokens', 'Connection tokens'], ...(kit ? { expeditionKit: kit } : {}) });
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const source = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({entryPoints:['lesson_board_tactics_ui.jsx'],bundle:true,write:false,format:'iife',globalName:'TacticsUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
  UI = new Function(source + ';return TacticsUI;')();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; });
async function render(component, props) {
  if (!root) { element = document.createElement('div'); document.body.append(element); root = createRoot(element); }
  await act(async () => root.render(React.createElement(UI[component], props)));
}

describe('Expedition kit choice and feedback', () => {
  it('offers standard plus three tactics with explicit named rewards and a separate-save explanation', async () => {
    const onChange = vi.fn();
    await render('ExpeditionKitPicker', { board: board(), onChange });
    const inputs = [...element.querySelectorAll('input[type=radio]')];
    expect(inputs).toHaveLength(4); expect(inputs[0].checked).toBe(true);
    expect(element.textContent).toContain('Changing kits creates a separate saved game');
    expect(element.querySelector('[data-expedition-kit-option=surveyor]').textContent).toContain('+2 Observation tokens each');
    expect(element.querySelector('[data-expedition-kit-option=builder]').textContent).toContain('+2 Connection tokens each, after paying the full cost');
    expect(element.querySelector('[data-expedition-kit-option=pathfinder]').textContent).toContain('+2 Observation tokens and +2 Connection tokens');
    for (const input of inputs) expect(element.querySelector('[id="' + input.getAttribute('aria-labelledby') + '"]')).toBeTruthy();
    await act(async () => inputs[1].click()); expect(onChange).toHaveBeenCalledWith('surveyor');
  });

  it('honors the controlled choice and disables changes while setup is busy', async () => {
    const onChange = vi.fn();
    await render('ExpeditionKitPicker', { board: board('builder'), currentValue: 'pathfinder', disabled: true, onChange });
    expect(element.querySelector('[value=pathfinder]').checked).toBe(true);
    expect(element.querySelector('fieldset').disabled).toBe(true);
    await act(async () => element.querySelector('[value=surveyor]').click());
    expect(onChange).not.toHaveBeenCalled();
  });

  it('allows preference selection before a board exists and hides kits for legacy play', async () => {
    await render('ExpeditionKitPicker', { currentValue: 'builder' });
    expect(element.querySelector('[value=builder]').checked).toBe(true);
    expect(element.textContent).toContain('+2 second resource each');
    await render('ExpeditionKitPicker', { board: { resources: ['A', 'B'] } });
    expect(element.textContent).toBe('');
  });

  it('shows a read-only live trigger and capped earned milestones', async () => {
    await render('ExpeditionKitHud', { board: board('builder'), earnedCount: 1, gains: [0, 2] });
    expect(element.textContent).toContain('1/2 bonuses earned');
    expect(element.textContent).toContain('after paying the full cost');
    expect(element.querySelector('input,button,select')).toBeNull();
    await render('ExpeditionKitHud', { board: board('builder'), earnedCount: 2, gains: [0, 4] });
    expect(element.textContent).toContain('Kit complete: +4 Connection tokens');
    expect(element.querySelector('[data-kit-complete]').dataset.kitComplete).toBe('true');
  });

  it('announces only a newly awarded milestone and keeps completion bonuses bounded', async () => {
    const b = board('pathfinder');
    await render('ExpeditionKitReward', { board: b, beforeCount: 0, earnedCount: 0 });
    expect(element.textContent).toBe('');
    await render('ExpeditionKitReward', { board: b, beforeCount: 0, earnedCount: 1, gain: [2, 2] });
    expect(element.querySelector('[role=status]').textContent).toBe('Pathfinder bonus: +2 Observation tokens · +2 Connection tokens. All kit bonuses earned.');
    await render('ExpeditionKitReward', { board: b, beforeCount: 1, earnedCount: 1, gain: [2, 2] });
    expect(element.textContent).toBe('');
  });

  it('renders no live kit UI for standard expeditions', async () => {
    await render('ExpeditionKitHud', { board: board() }); expect(element.textContent).toBe('');
    await render('ExpeditionKitReward', { board: board(), beforeCount: 0, earnedCount: 1 }); expect(element.textContent).toBe('');
  });
});
