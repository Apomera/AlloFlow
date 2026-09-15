// UDL guide overflow menu — operability, mounted for real.
//
// The menu carries role="menu" and role="menuitem*", which promises keyboard
// behaviour the component did not have. Worse, its outside-click dismissal
// listened for mousedown on ANY target: a press landing on a menu item tore
// the item down before its click could run, so "Point things out on screen"
// and "Save this chat" were unreachable with a mouse. Neither failure is
// visible to a source-string scan, so these mount the real module.

import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');

let React;
let ReactDOMClient;
let act;
let UDLGuideModal;
let root;
let host;

beforeAll(() => {
  React = require(resolve(modulesDir, 'react'));
  ReactDOMClient = require(resolve(modulesDir, 'react-dom/client'));
  ({ act } = require(resolve(modulesDir, 'react-dom/test-utils')));
  global.React = window.React = React;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_misc_modals_module.js');
  UDLGuideModal = window.AlloModules.UDLGuideModal;
});

afterEach(() => {
  if (root) { act(() => root.unmount()); root = null; }
  host?.remove();
  host = null;
  try { localStorage.clear(); } catch (_) {}
});

const chatStyles = {
  container: '', header: '', body: '', inputArea: '', userBubble: '', modelBubble: '',
  button: '', secondaryButton: '', input: '', text: '', subText: '',
};

const makeProps = (overrides) => Object.assign({
  showUDLGuide: true,
  udlMessages: [],
  udlInput: '',
  udlInputRef: { current: null },
  udlScrollRef: { current: null },
  chatStyles,
  theme: 'light',
  t: (key, fallback) => fallback || key,
  renderFormattedText: (text) => text,
  handleSendUDLMessage: vi.fn(),
  setUdlInput: vi.fn(),
  setUdlMessages: vi.fn(),
  isChatProcessing: false,
  isAutoFillMode: true,
  hasUsedAutoFill: true,
  activeBlueprint: null,
  InteractiveBlueprintCard: () => null,
  suggestedStandards: [],
  aiStandardQuery: '',
  aiStandardRegion: '',
  udlStandardFramework: 'Common Core ELA',
  udlStandardGrade: '3rd Grade',
  addToast: () => {},
  handleAutoFillToggle: () => {},
  handleBlueprintUIUpdate: () => {},
  handleExecuteBlueprint: () => {},
  handleFindStandards: () => {},
  handleSetShowUDLGuideToFalse: () => {},
  handleToggleAutoSendVoice: () => {},
  handleToggleIsShowMeMode: vi.fn(),
  handleToggleIsUDLGuideExpanded: () => {},
  saveFullChat: vi.fn(),
  saveUDLAdvice: () => {},
  setActiveBlueprint: () => {},
  setAiStandardQuery: () => {},
  setAiStandardRegion: () => {},
  setIsBotVisible: () => {},
  setIsConversationMode: () => {},
  setIsDictationMode: () => {},
  setStandardsInput: () => {},
  setUdlStandardFramework: () => {},
  setUdlStandardGrade: () => {},
}, overrides || {});

const mount = (props) => {
  host = document.createElement('div');
  document.body.appendChild(host);
  root = ReactDOMClient.createRoot(host);
  act(() => root.render(React.createElement(UDLGuideModal, props)));
  return host;
};

const trigger = (el) => el.querySelector('[data-help-key="chat_more"]');
const items = (el) => Array.from(el.querySelectorAll('[role^="menuitem"]'));
// A real pointer sends mousedown, the browser processes any resulting state
// change, and THEN click lands. Batching both into one act() lets React defer
// the unmount until after the click, which hides the very bug this file is
// about -- so each phase is flushed separately, and the node is re-resolved
// from the DOM before clicking to prove it actually survived.
const realClick = (node) => {
  act(() => { node.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
  act(() => { node.click(); });
};
const openMenu = (el) => { realClick(trigger(el)); return items(el); };

describe('UDL guide overflow menu', () => {
  it('runs a menu item instead of being dismissed by its own mousedown', () => {
    const props = makeProps();
    const el = mount(props);
    const opened = openMenu(el);
    expect(opened.length).toBeGreaterThan(0);

    act(() => { opened[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    // The regression, stated directly: the item must outlive its own mousedown.
    expect(items(el), 'the menu closed on its own item mousedown').toHaveLength(2);
    act(() => { opened[0].click(); });
    expect(props.handleToggleIsShowMeMode).toHaveBeenCalledTimes(1);
    expect(items(el)).toHaveLength(0); // acting on an item still closes it
  });

  it('reaches the second item too', () => {
    const props = makeProps();
    const el = mount(props);
    const opened = openMenu(el);
    const save = opened.find((b) => (b.getAttribute('role') || '') === 'menuitem');
    expect(save).toBeTruthy();
    realClick(save);
    expect(props.saveFullChat).toHaveBeenCalledTimes(1);
  });

  it('still closes on a press outside the menu', () => {
    const props = makeProps();
    const el = mount(props);
    expect(openMenu(el).length).toBeGreaterThan(0);
    act(() => { document.body.dispatchEvent(new MouseEvent('mousedown', { bubbles: true })); });
    expect(items(el)).toHaveLength(0);
    expect(props.handleToggleIsShowMeMode).not.toHaveBeenCalled();
  });

  // 2.4.3 Focus Order: opening a menu that never takes focus announces itself
  // and then strands the user behind the trigger.
  it('moves focus to the first item on open and back to the trigger on Escape', () => {
    const props = makeProps();
    const el = mount(props);
    const opened = openMenu(el);
    expect(document.activeElement).toBe(opened[0]);

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    });
    expect(items(el)).toHaveLength(0);
    expect(document.activeElement).toBe(trigger(el));
  });

  // One Escape closes one layer: the menu consumes the press so the panel's
  // own handler does not also throw away the conversation.
  it('marks its Escape as handled so the panel stays open', () => {
    const props = makeProps();
    const el = mount(props);
    openMenu(el);
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => { document.dispatchEvent(event); });
    expect(event.defaultPrevented).toBe(true);
  });

  it('walks its items with the arrow keys, wrapping at both ends', () => {
    const props = makeProps();
    const el = mount(props);
    const opened = openMenu(el);
    expect(opened.length).toBeGreaterThanOrEqual(2);
    const menu = el.querySelector('[role="menu"]');
    const press = (key) => act(() => {
      menu.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
    });

    press('ArrowDown');
    expect(document.activeElement).toBe(opened[1]);
    press('ArrowDown'); // wraps past the end
    expect(document.activeElement).toBe(opened[0]);
    press('ArrowUp'); // wraps backwards
    expect(document.activeElement).toBe(opened[opened.length - 1]);
    press('Home');
    expect(document.activeElement).toBe(opened[0]);
    press('End');
    expect(document.activeElement).toBe(opened[opened.length - 1]);
  });

  it('reports its expanded state on the trigger', () => {
    const props = makeProps();
    const el = mount(props);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('false');
    openMenu(el);
    expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
  });
});
