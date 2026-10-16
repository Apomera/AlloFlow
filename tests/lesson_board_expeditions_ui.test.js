import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { makeWaterworksBoard } from '../lesson_board_demo.js';
import { makeWaterworksExpedition } from '../lesson_board_expeditions.js';
const require = createRequire(import.meta.url), React = require('../desktop/web-app/node_modules/react'), { createRoot } = require('../desktop/web-app/node_modules/react-dom/client'), { act } = React;
let UI, root, element;
beforeAll(() => {
  window.React = React; globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  const code = require('node:child_process').execFileSync(process.execPath, ['-e', "process.stdout.write(require('esbuild').buildSync({entryPoints:['lesson_board_expeditions_ui.jsx'],bundle:true,write:false,format:'iife',globalName:'ExpeditionsUI',jsxFactory:'React.createElement',jsxFragment:'React.Fragment'}).outputFiles[0].text)"], { encoding: 'utf8' });
  UI = new Function(code + ';return ExpeditionsUI;')();
});
afterEach(async () => { if (root) await act(async () => root.unmount()); element?.remove(); root = element = null; });
async function render(component, props) {
  if (!root) { element = document.createElement('div'); document.body.append(element); root = createRoot(element); }
  await act(async () => root.render(React.createElement(UI[component], props)));
}
async function click(selector) { const target = element.querySelector(selector); expect(target).toBeTruthy(); await act(async () => target.click()); }
async function seed(value) {
  const input = element.querySelector('[data-expedition-seed]');
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('Explicit expedition dealer', () => {
  it('keeps edits as a draft until the player deals the chosen plan and number', async () => {
    const board = makeWaterworksBoard(), before = JSON.stringify(board), onDeal = vi.fn();
    await render('WaterworksExpeditionPicker', { board, onDeal });
    expect(element.querySelectorAll('[data-expedition-plan]')).toHaveLength(3);
    expect(element.querySelector('[data-expedition-plan=balanced]').getAttribute('aria-pressed')).toBe('true');
    await click('[data-expedition-plan=research]'); await seed('42');
    expect(onDeal).not.toHaveBeenCalled(); expect(JSON.stringify(board)).toBe(before);
    expect(element.querySelector('[data-expedition-plan=research]').getAttribute('aria-pressed')).toBe('true');
    await click('[data-expedition-deal]');
    expect(onDeal).toHaveBeenCalledExactlyOnceWith({ plan: 'research', seed: 42 });
    expect(JSON.stringify(board)).toBe(before);
  });

  it.each(['', '0', '-1', '1.5', '1000', '01'])('rejects invalid deal number %s before applying either action', async value => {
    const onDeal = vi.fn(); await render('WaterworksExpeditionPicker', { board: makeWaterworksBoard(), onDeal });
    await seed(value);
    expect(element.querySelector('[data-expedition-seed]').getAttribute('aria-invalid')).toBe('true');
    expect(element.querySelector('[role=status]').textContent).toContain('1 to 999');
    expect(element.querySelector('[data-expedition-deal]').disabled).toBe(true);
    expect(element.querySelector('[data-expedition-next]').disabled).toBe(true);
    await click('[data-expedition-deal]'); await click('[data-expedition-next]'); expect(onDeal).not.toHaveBeenCalled();
  });

  it.each([1, 999])('accepts valid boundary deal %s', async value => {
    const onDeal = vi.fn(); await render('WaterworksExpeditionPicker', { board: makeWaterworksBoard(), onDeal });
    await seed(String(value)); await click('[data-expedition-deal]');
    expect(onDeal).toHaveBeenCalledExactlyOnceWith({ plan: 'balanced', seed: value });
    expect(element.querySelector('[data-expedition-seed]').getAttribute('aria-invalid')).toBe('false');
  });

  it('increments the selected deal and wraps from 999 to 1 without changing the plan', async () => {
    const onDeal = vi.fn(); await render('WaterworksExpeditionPicker', { board: makeWaterworksExpedition({ plan: 'shortcut', seed: 998 }), onDeal });
    await click('[data-expedition-next]'); expect(onDeal).toHaveBeenLastCalledWith({ plan: 'shortcut', seed: 999 });
    expect(element.querySelector('[data-expedition-seed]').value).toBe('999');
    await click('[data-expedition-next]'); expect(onDeal).toHaveBeenLastCalledWith({ plan: 'shortcut', seed: 1 });
    expect(element.querySelector('[data-expedition-seed]').value).toBe('1');
  });

  it('resets drafts to the restored board after a new deal and Undo', async () => {
    const original = makeWaterworksExpedition({ plan: 'balanced', seed: 7 }), next = makeWaterworksExpedition({ plan: 'research', seed: 123 }), onDeal = vi.fn();
    await render('WaterworksExpeditionPicker', { board: original, onDeal });
    await click('[data-expedition-plan=shortcut]'); await seed('55');
    await render('WaterworksExpeditionPicker', { board: next, onDeal });
    expect(element.querySelector('[data-expedition-plan=research]').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('[data-expedition-seed]').value).toBe('123');
    await render('WaterworksExpeditionPicker', { board: original, onDeal });
    expect(element.querySelector('[data-expedition-plan=balanced]').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('[data-expedition-seed]').value).toBe('7');
    await render('WaterworksExpeditionPicker', { board: makeWaterworksBoard(), onDeal });
    expect(element.querySelector('[data-expedition-seed]').value).toBe('1'); expect(onDeal).not.toHaveBeenCalled();
  });

  it('guards all handlers while disabled, including synthetic events', async () => {
    const onDeal = vi.fn(); await render('WaterworksExpeditionPicker', { board: makeWaterworksExpedition({ plan: 'research', seed: 21 }), disabled: true, onDeal });
    expect(element.querySelector('fieldset').disabled).toBe(true);
    await act(async () => {
      for (const selector of ['[data-expedition-plan=shortcut]', '[data-expedition-deal]', '[data-expedition-next]']) element.querySelector(selector).dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await seed('22');
    expect(onDeal).not.toHaveBeenCalled();
    await render('WaterworksExpeditionPicker', { board: makeWaterworksExpedition({ plan: 'research', seed: 21 }), disabled: false, onDeal });
    expect(element.querySelector('[data-expedition-plan=research]').getAttribute('aria-pressed')).toBe('true');
    expect(element.querySelector('[data-expedition-seed]').value).toBe('21');
    await click('[data-expedition-deal]'); expect(onDeal).toHaveBeenCalledExactlyOnceWith({ plan: 'research', seed: 21 });
  });

  it('shows accurate route and investment descriptions with a separate-save explanation', async () => {
    await render('WaterworksExpeditionPicker', { board: makeWaterworksBoard(), onDeal() {} });
    expect(element.querySelector('[data-expedition-plan=balanced]').textContent).toContain('connected loops');
    expect(element.querySelector('[data-expedition-plan=research]').textContent).toContain('cheaper research shelter');
    expect(element.querySelector('[data-expedition-plan=shortcut]').textContent).toContain('Start at Equipment workshop');
    expect(element.textContent).toContain('Each dealt board has its own saved progress');
    expect(element.textContent).toContain('Undo restores the previous board');
  });

  it('shows the plan and deal in a read-only brief only for recognized expedition boards', async () => {
    const board = makeWaterworksExpedition({ plan: 'shortcut', seed: 306 });
    await render('ExpeditionBrief', { board });
    expect(element.querySelector('summary').textContent).toBe('Canal crossing · Deal 306');
    expect(element.textContent).toContain('Equipment workshop');
    expect(element.querySelector('button,input,select')).toBeNull();
    await render('ExpeditionBrief', { board: makeWaterworksBoard() }); expect(element.textContent).toBe('');
    await render('ExpeditionBrief', { board: { title: board.title, playStyle: 'tabletop', version: 1 } }); expect(element.textContent).toBe('');
  });
});
