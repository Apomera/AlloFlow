// UDLGuideModal chooser rendering — a real mount, not a source grep.
//
// The guided flow now posts EVERY question as a `type: 'choices'` message, so
// the modal's chip row is on the critical path for the whole auto-fill /
// blueprint experience. These pin the three behaviors that a source-string
// guardrail can't see: the pills actually render and dispatch their value,
// a `focus-input` pill sends NOTHING and parks the cursor instead, and the
// standards panels collapse (which is what gives the transcript its room).

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
  button: 'btn', secondaryButton: 'btn2', input: '', text: '', subText: '',
};

// Only the props the chooser + footer paths actually read; everything else is
// an inert stub so a prop-list change fails loudly rather than silently.
const makeProps = (overrides) => Object.assign({
  showUDLGuide: true,
  udlMessages: [],
  udlInput: '',
  udlInputRef: { current: null },
  udlScrollRef: { current: null },
  chatStyles,
  theme: 'light',
  t: (key) => key,
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
  handleToggleIsShowMeMode: () => {},
  handleToggleIsUDLGuideExpanded: () => {},
  saveFullChat: () => {},
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

const packCountMsg = {
  role: 'model', type: 'choices', stage: 'pack_count_selection',
  text: 'How extensive should this lesson be?',
  choices: [
    { label: 'Auto', value: 'auto', hint: 'AI picks the best fit' },
    { label: 'All', value: 'all', hint: 'Generate everything' },
    { label: '5', value: '5', tone: 'secondary' },
    { label: 'Custom...', value: 'custom', tone: 'secondary', action: 'focus-input', hint: 'Type a number (1-20)' },
  ],
};

const chips = (el) => Array.from(el.querySelectorAll('[role="group"] button'));

describe('UDLGuideModal choice chips', () => {
  it('renders a pill per choice for the pack-count question (the step that had none)', () => {
    const props = makeProps({ udlMessages: [packCountMsg] });
    const el = mount(props);
    const labels = chips(el).map(b => b.textContent);
    expect(labels).toEqual(['Auto', 'All', '5', 'Custom...']);
    // Hints ride along as tooltips rather than a second wall of text.
    expect(chips(el)[0].getAttribute('title')).toBe('AI picks the best fit');
    expect(chips(el)[2].className).toContain('btn2'); // tone: 'secondary'
    expect(chips(el)[0].className).toContain('btn');
  });

  it('dispatches the chosen value on click', () => {
    const props = makeProps({ udlMessages: [packCountMsg] });
    const el = mount(props);
    act(() => { chips(el)[1].click(); });
    expect(props.handleSendUDLMessage).toHaveBeenCalledWith('all');
  });

  it('a focus-input pill sends nothing and focuses the composer instead', () => {
    const props = makeProps({ udlMessages: [packCountMsg] });
    const el = mount(props);
    act(() => { chips(el)[3].click(); });
    expect(props.handleSendUDLMessage).not.toHaveBeenCalled();
    expect(props.setUdlInput).toHaveBeenCalledWith('');
    expect(document.activeElement).toBe(props.udlInputRef.current);
    expect(props.udlInputRef.current.tagName).toBe('INPUT');
  });

  it('disables the pills of a question that has already been answered', () => {
    const props = makeProps({
      udlMessages: [packCountMsg, { role: 'user', text: 'all' }],
    });
    const el = mount(props);
    expect(chips(el).every(b => b.disabled)).toBe(true);
  });

  it('disables the pills while a generation is in flight', () => {
    const props = makeProps({ udlMessages: [packCountMsg], isChatProcessing: true });
    const el = mount(props);
    expect(chips(el).every(b => b.disabled)).toBe(true);
  });
});

// Executing a blueprint no longer closes the panel, so "get out of the way"
// has to be possible WITHOUT unmounting — closing would discard the thread the
// plan came out of.
describe('UDLGuideModal collapse-to-bar', () => {
  const collapseBtn = (el) => Array.from(el.querySelectorAll('button'))
    .find(b => (b.getAttribute('data-help-key') || '') === 'chat_collapse');

  it('collapses to a header bar and restores, keeping the panel mounted', () => {
    const props = makeProps({ udlMessages: [packCountMsg] });
    const el = mount(props);
    expect(chips(el).length).toBe(4);

    act(() => { collapseBtn(el).click(); });
    expect(el.querySelector('[role="group"]')).toBeNull();      // transcript is gone from view
    expect(el.textContent).toContain('chat_guide.header');       // …but the bar is there

    const restore = Array.from(el.querySelectorAll('button'))
      .find(b => b.getAttribute('aria-label') === 'chat_guide.restore');
    act(() => { restore.click(); });
    expect(chips(el).length).toBe(4);                            // same messages, nothing lost
  });
});

describe('UDLGuideModal standards-tools disclosure', () => {
  const toggle = (el) => el.querySelector('[aria-controls="udl-standard-tools"]');
  const panel = (el) => el.querySelector('#udl-standard-tools');

  it('starts collapsed so the transcript gets the panel height', () => {
    const el = mount(makeProps());
    expect(toggle(el).getAttribute('aria-expanded')).toBe('false');
    expect(panel(el).hidden).toBe(true);
  });

  it('opens on click and remembers the choice across mounts', () => {
    const el = mount(makeProps());
    act(() => { toggle(el).click(); });
    expect(toggle(el).getAttribute('aria-expanded')).toBe('true');
    expect(panel(el).hidden).toBe(false);
    expect(localStorage.getItem('allo_udl_standard_tools_open')).toBe('1');

    act(() => root.unmount());
    root = null;
    host.remove();
    const el2 = mount(makeProps());
    expect(panel(el2).hidden).toBe(false);
  });
});
