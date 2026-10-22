// Mount the shipped modal with real React. Request freshness is enforced in the
// chat handler; these tests verify the renderer preserves that request identity.
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
  act = React.act;
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


const option = (index) => ({
  commandId: 'action-' + index,
  label: 'Action ' + index,
  reason: 'This matches your request ' + index + '.',
  effect: 'Opens the selected activity ' + index + '.',
});
const operation = (overrides = {}) => ({
  role: 'model', type: 'choices', text: 'Choose what to do next.',
  operationKind: 'command', operationId: 'request-current', operationStatus: 'review',
  commandOptions: [option(1), option(2), option(3), option(4), option(5)],
  choices: [{ label: 'Just chat', value: '__allo_chat' }], ...overrides,
});
const card = () => host.querySelector('[data-testid="active-command-workflow"]');
const optionButtons = () => [...host.querySelectorAll('[data-testid="command-options"] button')];
const namedButton = (name) => [...host.querySelectorAll('button')].find(button => button.textContent.trim() === name);
const renderAgain = (props) => act(() => root.render(React.createElement(UDLGuideModal, props)));
const click = (button) => act(() => button.click());

describe('Allobot command options in the native modal', () => {
  it('shows one suggested action and four alternatives, each with a direct button label', () => {
    mount(makeProps({ udlMessages: [operation()] }));
    expect(optionButtons().map(button => button.textContent)).toEqual(['Action 1', 'Action 2', 'Action 3', 'Action 4', 'Action 5']);
    const labels = [...host.querySelectorAll('[data-testid="command-options"] li > p')].map(node => node.textContent);
    expect(labels).toEqual(['Suggested', 'Alternative', 'Alternative', 'Alternative', 'Alternative']);
    optionButtons().forEach(button => {
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
      expect(button.getAttribute('aria-label')).toBeNull();
      expect(button.tabIndex).toBe(0);
    });
  });

  it('links each action to its own effect and reason without bloating its accessible name', () => {
    mount(makeProps({ udlMessages: [operation()] }));
    const ids = optionButtons().map(button => button.getAttribute('aria-describedby'));
    expect(new Set(ids).size).toBe(5);
    ids.forEach((id, index) => {
      const description = document.getElementById(id);
      expect(description).toBeTruthy();
      expect(description.textContent).toContain('What it does: Opens the selected activity ' + (index + 1));
      expect(description.textContent).toContain('Why it fits: This matches your request ' + (index + 1));
    });
  });

  it('passes the operation identity and selected command only, including for alternatives', () => {
    const props = makeProps({ udlMessages: [operation()] });
    mount(props);
    optionButtons().forEach(click);
    expect(props.handleSendUDLMessage.mock.calls.map(call => call[0])).toEqual([1, 2, 3, 4, 5].map(index => ({
      action: 'command-option', requestId: 'request-current', commandId: 'action-' + index,
    })));
  });

  it('keeps Just chat operation-bound and hides a legacy generic Do it button while choosing', () => {
    const props = makeProps({ udlMessages: [operation({ choices: [
      { label: 'Do it', value: '__allo_do' }, { label: 'Just chat', value: '__allo_chat' },
    ] })] });
    mount(props);
    expect(namedButton('Do it')).toBeUndefined();
    click(namedButton('Just chat'));
    expect(props.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'command-choice', requestId: 'request-current', value: '__allo_chat' });
  });

  it('keeps the single-command confirmation and cancellation bound to their original request', () => {
    const props = makeProps({ udlMessages: [operation({ commandOptions: undefined, choices: [
      { label: 'Do it', value: '__allo_do' }, { label: 'Just chat', value: '__allo_chat' },
    ] })] });
    mount(props);
    click(namedButton('Do it'));
    click(namedButton('Just chat'));
    expect(props.handleSendUDLMessage.mock.calls.map(call => call[0])).toEqual([
      { action: 'command-choice', requestId: 'request-current', value: '__allo_do' },
      { action: 'command-choice', requestId: 'request-current', value: '__allo_chat' },
    ]);
  });

  it('preserves the existing plan action contract', () => {
    const props = makeProps({ udlMessages: [operation({ operationKind: 'command-plan', choices: [{ label: 'Run plan', value: '__allo_plan_run' }] })] });
    mount(props);
    expect(optionButtons()).toHaveLength(0);
    click(namedButton('Run plan'));
    expect(props.handleSendUDLMessage).toHaveBeenCalledWith('__allo_plan_run');
  });

  it('defers parameter editing until an option is selected, then shows the existing review form', () => {
    const review = { requestId: 'request-current', params: { topic: 'Discourse' }, fields: { topic: { label: 'Topic', type: 'string', required: true } } };
    const props = makeProps({ udlMessages: [operation({ commandReview: review })] });
    mount(props);
    expect(card().querySelector('form')).toBeNull();
    renderAgain({ ...props, udlMessages: [operation({ commandOptions: undefined, commandReview: review })] });
    expect(optionButtons()).toHaveLength(0);
    expect(card().querySelector('form').getAttribute('aria-label')).toBe('Command details');
    expect(card().querySelector('input[name="topic"]').value).toBe('Discourse');
  });

  it('disables all command choices while the assistant is processing', () => {
    const props = makeProps({ isChatProcessing: true, udlMessages: [operation()] });
    mount(props);
    [...optionButtons(), namedButton('Just chat')].forEach(button => {
      expect(button.disabled).toBe(true);
      click(button);
    });
    expect(props.handleSendUDLMessage).not.toHaveBeenCalled();
  });

  it('leaves the existing plan Stop action available while a plan is running', () => {
    const props = makeProps({ isChatProcessing: true, udlMessages: [operation({ operationKind: 'command-plan', choices: [
      { label: 'Stop plan', value: '__allo_plan_stop' }, { label: 'Run plan', value: '__allo_plan_run' },
    ] })] });
    mount(props);
    expect(namedButton('Stop plan').disabled).toBe(false);
    expect(namedButton('Run plan').disabled).toBe(true);
    click(namedButton('Stop plan'));
    expect(props.handleSendUDLMessage).toHaveBeenCalledWith('__allo_plan_stop');
  });

  it('removes the active card after a closed operation without reviving historical choices', () => {
    const props = makeProps({ udlMessages: [operation()] });
    mount(props);
    expect(optionButtons()).toHaveLength(5);
    renderAgain({ ...props, udlMessages: [operation(), operation({ operationStatus: 'closed', text: 'Continuing the chat.' })] });
    expect(card()).toBeNull();
    expect(optionButtons()).toHaveLength(0);
    expect(namedButton('Just chat')).toBeUndefined();
  });

  it('renders only the latest request and updates every click identity', () => {
    const props = makeProps({ udlMessages: [operation()] });
    mount(props);
    renderAgain({ ...props, udlMessages: [operation(), operation({ operationId: 'request-next', commandOptions: [option(7)] })] });
    expect(optionButtons()).toHaveLength(1);
    click(optionButtons()[0]);
    expect(props.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'command-option', requestId: 'request-next', commandId: 'action-7' });
    expect(namedButton('Action 1')).toBeUndefined();
  });

  it('removes cards entirely when the conversation is cleared', () => {
    const props = makeProps({ udlMessages: [operation()] });
    mount(props);
    renderAgain({ ...props, udlMessages: [] });
    expect(card()).toBeNull();
    expect(optionButtons()).toHaveLength(0);
  });

  it('caps usable, distinct options at five and skips malformed entries', () => {
    mount(makeProps({ udlMessages: [operation({ commandOptions: [null, {}, { commandId: 'bad', label: '' },
      option(1), option(1), option(2), option(3), option(4), option(5), option(6)] })] }));
    expect(optionButtons().map(button => button.textContent)).toEqual(['Action 1', 'Action 2', 'Action 3', 'Action 4', 'Action 5']);
  });

  it('does not allow an unbound command card to dispatch', () => {
    const props = makeProps({ udlMessages: [operation({ operationId: undefined })] });
    mount(props);
    [...optionButtons(), namedButton('Just chat')].forEach(button => { expect(button.disabled).toBe(true); click(button); });
    expect(props.handleSendUDLMessage).not.toHaveBeenCalled();
  });

  it('retains visible fallback headings when a translation pack has no new keys', () => {
    mount(makeProps({ t: key => key, udlMessages: [operation({ commandOptions: [option(1)] })] }));
    expect(host.querySelector('[data-testid="command-options"]').getAttribute('aria-label')).toBe('Choose an action');
    expect(card().textContent).toContain('Suggested');
    expect(card().textContent).toContain('What it does');
    expect(card().textContent).toContain('Why it fits');
  });

  it('keeps the message composer mounted while review choices replace starter prompts', () => {
    const props = makeProps({ udlMessages: [] });
    mount(props);
    const composer = host.querySelector('[data-help-key="chat_input"]');
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
    renderAgain({ ...props, udlMessages: [operation()] });
    expect(optionButtons()).toHaveLength(5);
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).toBeNull();
    expect(host.querySelector('[data-help-key="chat_autofill"]')).toBeNull();
    expect(host.querySelector('[data-help-key="chat_input"]')).toBe(composer);
    expect(composer.disabled).toBe(false);
    renderAgain({ ...props, udlMessages: [operation({ operationStatus: 'closed' })] });
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="chat_input"]')).toBe(composer);
  });

  it.each(['pending', 'complete', 'failed'])('keeps starter prompts outside review (%s)', status => {
    mount(makeProps({ udlMessages: [operation({ operationStatus: status })] }));
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
  });

  it('keeps starter prompts for a single-command parameter review', () => {
    mount(makeProps({ udlMessages: [operation({ commandOptions: undefined })] }));
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).not.toBeNull();
    expect(host.querySelector('[data-help-key="chat_autofill"]')).not.toBeNull();
  });

  it('keeps long names wrap-ready, with a native focusable 44px target', () => {
    mount(makeProps({ udlMessages: [operation({ commandOptions: [{ ...option(1), label: 'A'.repeat(120) }] })] }));
    const button = optionButtons()[0];
    expect(button.style.minHeight).toBe('44px');
    expect(button.style.overflowWrap).toBe('anywhere');
    expect(button.className).toContain('whitespace-normal');
    expect(button.className).toContain('focus-visible:ring-2');
    act(() => button.focus());
    expect(document.activeElement).toBe(button);
  });
});
