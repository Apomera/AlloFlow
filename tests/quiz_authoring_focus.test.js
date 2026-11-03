import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const React = require('../desktop/web-app/node_modules/react');
const { createRoot } = require('../desktop/web-app/node_modules/react-dom/client');
const { act } = React;
const strings = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const t = (key, params = {}) => Object.entries(params).reduce((value, [name, replacement]) => value.replaceAll('{' + name + '}', String(replacement)), key.split('.').reduce((value, part) => value?.[part], strings) || key);
let Actions, host, root, props;

beforeAll(() => {
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloIcons = {}; window.AlloModules = {};
  window.AlloLanguageContext = React.createContext({ t }); window.__alloT = t;
  const registration = '  window.AlloModules.QuizView = QuizView;';
  const code = readFileSync(process.env.ALLO_QUIZ_FOCUS_MODULE || 'view_quiz_module.js', 'utf8');
  expect(code.split(registration)).toHaveLength(2);
  new Function('window', code.replace(registration, registration + '\nwindow.__quizFocusActions = AssessmentItemActions;'))(window);
  Actions = window.__quizFocusActions;
  delete window.__quizFocusActions;
});
afterEach(async () => {
  if (root) await act(async () => root.unmount());
  host?.remove(); root = host = null;
});
async function render(changes = {}) {
  if (!root) {
    host = document.createElement('div'); document.body.append(host); root = createRoot(host);
    props = { q: { type: 'mcq', question: 'Choose a leaf.', options: ['Leaf', 'Stone'], correctAnswer: 'Leaf' }, questionIdx: 1, totalQuestions: 3, onAction: vi.fn(), onChangeType: vi.fn(), onAddItem: vi.fn(), onRegenerate: vi.fn() };
  }
  props = { ...props, ...changes };
  await act(async () => root.render(React.createElement(Actions, props)));
}
function button(text, container = host) { return [...container.querySelectorAll('button')].find(node => node.textContent === text); }
async function click(node) { expect(node).toBeTruthy(); node.focus(); await act(async () => node.click()); }
async function key(node, key = 'Escape', options = {}) {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...options });
  await act(async () => node.dispatchEvent(event)); return event;
}
async function open(kind) {
  if (kind === 'convert') {
    const select = host.querySelector('[data-assess-change-type]');
    await act(async () => { select.value = 'short-answer'; select.dispatchEvent(new Event('change', { bubbles: true })); });
  }
  await click(trigger(kind));
  return kind === 'add' ? host.querySelector('[data-assess-add-panel]') : [...host.querySelectorAll('[role="group"]')].find(node => node.getAttribute('aria-label') === (kind === 'delete' ? t('quiz.authoring.confirm_delete_label') : t('quiz.authoring.confirm_rewrite_label')) + ' — Question 2');
}
function trigger(kind) { return kind === 'delete' ? button(t('common.delete')) : host.querySelector(kind === 'convert' ? '[data-assess-convert]' : '[data-assess-add-toggle]'); }

describe('Quiz teacher action focus', () => {
  it.each(['delete', 'convert', 'add'])('restores the %s trigger on Cancel without applying an action', async kind => {
    await render(); const group = await open(kind);
    expect(group).toBeTruthy();
    expect(document.activeElement).toBe(kind === 'add' ? group.querySelector('select') : button(t('common.cancel'), group));
    await click(button(t('common.cancel'), group));
    expect(document.activeElement).toBe(trigger(kind));
    expect(props.onAction).not.toHaveBeenCalled(); expect(props.onChangeType).not.toHaveBeenCalled(); expect(props.onAddItem).not.toHaveBeenCalled();
  });
  it.each(['delete', 'convert', 'add'])('closes %s on Escape, preserving composition and ordinary keys', async kind => {
    await render(); const group = await open(kind), active = document.activeElement;
    expect((await key(active, 'Escape', { isComposing: true })).defaultPrevented).toBe(false);
    expect((await key(active, 'Escape', { keyCode: 229 })).defaultPrevented).toBe(false);
    expect((await key(active, 'ArrowRight')).defaultPrevented).toBe(false);
    expect(group.isConnected).toBe(true);
    expect((await key(active)).defaultPrevented).toBe(true);
    expect(group.isConnected).toBe(false); expect(document.activeElement).toBe(trigger(kind));
  });
  it('still calls each explicit confirmation with the original item and chosen type', async () => {
    await render(); let group = await open('delete'); await click(button(t('quiz.authoring.confirm_delete'), group));
    expect(props.onAction).toHaveBeenCalledExactlyOnceWith(1, 'delete');
    group = await open('convert'); await click(group.querySelector('[data-assess-convert-confirm]'));
    expect(props.onChangeType).toHaveBeenCalledExactlyOnceWith(1, props.q, 'short-answer');
    group = await open('add'); await click(group.querySelector('[data-assess-add-blank]'));
    expect(props.onAddItem).toHaveBeenCalledExactlyOnceWith(1, 'mcq', 'blank');
  });
  it('closes stale panels and resets type selection when an indexed question is replaced', async () => {
    await render(); await open('convert');
    await render({ q: { type: 'numeric-response', question: 'How many?', correctValue: 3 } });
    expect(host.querySelector('[data-assess-convert-confirm]')).toBeNull();
    expect(host.querySelector('[data-assess-change-type]').value).toBe('numeric-response');
    expect(props.onChangeType).not.toHaveBeenCalled();
  });
  it('preserves an open panel across equivalent data rerenders', async () => {
    await render(); const group = await open('delete');
    await render({ q: { ...props.q } });
    expect(group.isConnected).toBe(true); expect(document.activeElement).toBe(button(t('common.cancel'), group));
  });
  it.each([{ options: ['Root', 'Water'] }, { imageUrl: 'different-picture.png' }, { correctAnswer: 'Stone' }])('closes a confirmation when same-prompt item content changes: %j', async change => {
    await render(); const group = await open('delete');
    await render({ q: { ...props.q, ...change } });
    expect(group.isConnected).toBe(false); expect(trigger('delete')).toBeTruthy();
    expect(props.onAction).not.toHaveBeenCalled();
  });
  it('does not steal focus from an unrelated control during closing', async () => {
    await render(); const group = await open('add'), outside = document.createElement('button'); host.append(outside); outside.focus();
    await act(async () => button(t('common.cancel'), group).click());
    expect(document.activeElement).toBe(outside);
  });
  it('identifies each question action group and keeps 44px minimum controls', async () => {
    await render(); expect(host.querySelector('[data-assess-item-actions]').getAttribute('aria-label')).toBe('Question 2');
    await open('add');
    for (const node of host.querySelectorAll('button,select,input')) {
      expect(node.style.minHeight).toBe('44px'); expect(node.style.minWidth).toBe('44px');
    }
  });
});
