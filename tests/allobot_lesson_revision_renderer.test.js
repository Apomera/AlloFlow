import { beforeAll, afterEach, describe, it, expect, vi } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';
const require = createRequire(import.meta.url);
let React, createRoot, act, Modal, root, host;
beforeAll(() => {
  React = require(resolve('desktop/web-app/node_modules/react'));
  createRoot = require(resolve('desktop/web-app/node_modules/react-dom/client')).createRoot;
  act = React.act; global.React = window.React = React; global.IS_REACT_ACT_ENVIRONMENT = true;
  loadAlloModule('view_misc_modals_module.js'); Modal = window.AlloModules.UDLGuideModal;
});
afterEach(() => { if (root) act(() => root.unmount()); root = null; host?.remove(); host = null; vi.restoreAllMocks(); });
const resources = [
  { id: 'quiz-1', title: 'Discussion check', type: 'quiz', supported: true, current: true },
  { id: 'faq-1', title: 'Help', type: 'faq', supported: true },
  { id: 'image-1', title: 'Photo', type: 'image', supported: false, reason: 'Use the image editor.' },
];
const model = overrides => ({ requestId: 'request-1', reviewToken: 'review-ui-1', undoToken: 'undo-ui-1', pendingToken: 'pending-ui-1', mode: 'select', formVersion: 0, resources, selectedIds: ['quiz-1'], instruction: '',
  changes: [], warnings: [], error: '', ...overrides });
const operation = revision => ({ role: 'model', type: 'lesson-revision', localOnly: true, operationKind: 'lesson-revision',
  operationId: 'request-1', operationStatus: 'review', text: 'Choose material to revise.', lessonRevision: revision });
const props = overrides => ({ showUDLGuide: true, udlMessages: [], udlInput: '', udlInputRef: { current: null }, udlScrollRef: { current: null },
  chatStyles: { container:'',header:'',body:'',inputArea:'',userBubble:'',modelBubble:'',button:'',secondaryButton:'',input:'',text:'',subText:'' },
  theme: 'light', t: (key, fallback) => fallback || key, renderFormattedText: text => text,
  handleSendUDLMessage: vi.fn(), setUdlInput: vi.fn(), setUdlMessages: vi.fn(), isChatProcessing: false,
  isAutoFillMode: true, hasUsedAutoFill: true, activeBlueprint: null, InteractiveBlueprintCard: () => null, canReviseLesson: true,
  suggestedStandards: [], aiStandardQuery: '', aiStandardRegion: '', udlStandardFramework: 'Common Core ELA', udlStandardGrade: '6th Grade',
  addToast: () => {}, handleAutoFillToggle: () => {}, handleBlueprintUIUpdate: () => {}, handleExecuteBlueprint: () => {}, handleFindStandards: () => {},
  handleSetShowUDLGuideToFalse: () => {}, handleToggleAutoSendVoice: () => {}, handleToggleIsShowMeMode: () => {}, handleToggleIsUDLGuideExpanded: () => {},
  saveFullChat: () => {}, saveUDLAdvice: () => {}, setActiveBlueprint: () => {}, setAiStandardQuery: () => {}, setAiStandardRegion: () => {},
  setIsBotVisible: () => {}, setIsConversationMode: () => {}, setIsDictationMode: () => {}, setStandardsInput: () => {}, setUdlStandardFramework: () => {}, setUdlStandardGrade: () => {},
  ...overrides });
const mount = input => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => root.render(React.createElement(Modal, input))); return input; };
const rerender = input => act(() => root.render(React.createElement(Modal, input)));
const panel = () => host.querySelector('[data-testid="lesson-revision"]');
const button = label => [...panel().querySelectorAll('button')].find(node => node.textContent === label);
const click = node => act(() => node.click());
const input = (node, value) => act(() => {
  const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(node), 'value'); descriptor.set.call(node, value);
  node.dispatchEvent(new Event('input', { bubbles: true }));
});

describe('AlloBot native lesson revision review controls', () => {
  it('exposes revision beside creation only with an explicit author capability', () => {
    const p = mount(props()); const entry = host.querySelector('[data-testid="start-lesson-revision"]');
    expect(entry.textContent).toBe('Revise existing lesson'); expect(entry.style.minHeight).toBe('44px'); click(entry);
    expect(p.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'lesson-revision-start' });
    rerender({ ...p, canReviseLesson: undefined }); expect(host.querySelector('[data-testid="start-lesson-revision"]')).toBeNull();
  });
  it('lists exact resource choices and explains unavailable types', () => {
    mount(props({ udlMessages: [operation(model())] }));
    const checkboxes = [...panel().querySelectorAll('input[type="checkbox"]')];
    expect(checkboxes.map(node => [node.value, node.checked, node.disabled])).toEqual([
      ['quiz-1', true, false], ['faq-1', false, false], ['image-1', false, true],
    ]);
    expect(panel().textContent).toContain('Use the image editor.');
    expect(panel().textContent).toContain('editable fields of your selected material');
    expect(panel().querySelector('fieldset legend').textContent).toContain('required');
  });
  it('requires a request and sends only checked IDs plus the local text on explicit prepare', () => {
    const p = mount(props({ udlMessages: [operation(model())] }));
    expect(button('Prepare revision').disabled).toBe(true);
    input(panel().querySelector('textarea'), 'Keep questions, simplify directions.');
    click(panel().querySelector('input[value="faq-1"]'));
    expect(button('Prepare revision').disabled).toBe(false); click(button('Prepare revision'));
    expect(p.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'lesson-revision-prepare', requestId: 'request-1',
      resourceIds: ['quiz-1', 'faq-1'], instruction: 'Keep questions, simplify directions.' });
  });
  it('focuses the revision heading and keeps the ordinary composer mounted', () => {
    const p = mount(props()); const composer = host.querySelector('[data-help-key="chat_input"]');
    rerender({ ...p, udlMessages: [operation(model())] });
    expect(document.activeElement).toBe(panel().querySelector('h3'));
    expect(host.querySelector('[data-help-key="chat_input"]')).toBe(composer);
    expect(host.querySelector('[data-help-key="chat_autofill"]')).toBeNull();
    expect(host.querySelector('[data-help-key="chat_standard_tools_toggle"]')).toBeNull();
  });
  it('keeps native-generation Blueprint controls out of the revision card', () => {
    mount(props({ activeBlueprint: { resourcePlan: [{ tool: 'quiz' }] }, InteractiveBlueprintCard: () => React.createElement('div', { 'data-testid': 'old-blueprint' }),
      udlMessages: [operation(model())] }));
    expect(host.querySelector('[data-testid="old-blueprint"]')).toBeNull();
  });
  it('shows full literal before/after text without executing provider markup', () => {
    const p = mount(props({ udlMessages: [operation(model({ mode: 'review', changes: [{ resourceId: 'quiz-1', resourceTitle: 'Discussion check', label: 'Directions',
      before: '<img src=x onerror=alert(1)>', after: 'Read, discuss, then write.' }], warnings: ['Existing response fields are retained.'] }))] }));
    expect(panel().querySelector('img')).toBeNull(); expect(panel().querySelector('details').open).toBe(true);
    expect([...panel().querySelectorAll('pre')].map(node => node.textContent)).toEqual(['<img src=x onerror=alert(1)>', 'Read, discuss, then write.']);
    expect(panel().textContent).toContain('Existing response fields are retained.');
    expect(p.handleSendUDLMessage).not.toHaveBeenCalled(); click(button('Apply edits'));
    expect(p.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'lesson-revision-apply', requestId: 'request-1', reviewToken: 'review-ui-1' });
  });
  it('does not render a mismatched or missing request as an actionable revision', () => {
    mount(props({ udlMessages: [operation(model({ requestId: 'other' }))] })); expect(panel()).toBeNull();
  });
  it('shows meaningful added content with readable labels while hiding generated IDs and raw JSON', () => {
    mount(props({ udlMessages: [operation(model({ mode: 'review', changes: [
      { resourceId: 'quiz-1', resourceTitle: 'Discussion check', label: 'Question 1: expectedAnswer', before: null,
        after: { id: 'revision-question-generated-123', type: 'mcq', question: 'Which detail supports your claim?', options: ['A cited record', 'A guess'], correctAnswer: 'A cited record', explanation: 'A record can support a claim.' } },
      { resourceId: 'quiz-1', label: 'New blank response field', before: null, after: { id: 'revision-item-generated-response-456', text: '' } },
      { resourceId: 'quiz-1', label: 'Guidance', before: '  Original exact text.\nSecond line.  ', after: '  Revised exact text.\nSecond line.  ' },
    ] }))] }));
    const content = panel().textContent;
    expect(content).toContain('Question 1: Expected answer'); expect(content).toContain('Response type: Multiple choice');
    expect(content).toContain('Question: Which detail supports your claim?'); expect(content).toContain('Answer choices:');
    expect(content).toContain('A cited record'); expect(content).toContain('A guess'); expect(content).toContain('Correct answer: A cited record');
    expect(content).toContain('Explanation: A record can support a claim.'); expect(content).toContain('Blank writing field for the learner.');
    expect(content).not.toMatch(/revision-question-generated|revision-item-generated|expectedAnswer|correctAnswer|"options"|"id"|\{\s*"/);
    const values = [...panel().querySelectorAll('pre')].map(node => node.textContent);
    expect(values.at(-2)).toBe('  Original exact text.\nSecond line.  '); expect(values.at(-1)).toBe('  Revised exact text.\nSecond line.  ');
  });
  it('keeps preparation cancellation available while other controls are busy', () => {
    const p = mount(props({ isChatProcessing: true, udlMessages: [operation(model({ mode: 'preparing' }))] }));
    expect(button('Stop this request').disabled).toBe(false); click(button('Stop this request'));
    expect(p.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'lesson-revision-stop', requestId: 'request-1', pendingToken: 'pending-ui-1' });
  });
  it('restores exact request/selection on a new form version after error', () => {
    const p = mount(props({ udlMessages: [operation(model())] }));
    rerender({ ...p, udlMessages: [operation(model({ formVersion: 1, instruction: '  Keep my wording.  ', selectedIds: ['faq-1'], error: 'Provider unavailable.' }))] });
    expect(panel().querySelector('textarea').value).toBe('  Keep my wording.  ');
    expect(panel().querySelector('input[value="faq-1"]').checked).toBe(true);
    expect(panel().querySelector('[role="alert"]').textContent).toBe('Provider unavailable.');
  });
  it('provides explicit Undo, native student preview and Save project after Apply', () => {
    const p = mount(props({ udlMessages: [operation(model({ mode: 'applied', canUndo: true, canSave: true, canPreview: true, resourceIds: ['quiz-1'] }))] }));
    expect(p.handleSendUDLMessage).not.toHaveBeenCalled();
    click(button('Undo last applied revision')); click(button('Preview lesson as student')); click(button('Save project'));
    expect(p.handleSendUDLMessage.mock.calls.map(call => call[0])).toEqual([
      { action: 'lesson-revision-undo', requestId: 'request-1', undoToken: 'undo-ui-1', followupText: '' },
      { action: 'lesson-revision-preview', requestId: 'request-1' },
      { action: 'lesson-revision-save', requestId: 'request-1' },
    ]);
    expect([...panel().querySelectorAll('button')].every(node => node.style.minHeight === '44px')).toBe(true);
  });
  it('removes Undo after a successful restore and retains remaining next steps', () => {
    mount(props({ udlMessages: [operation(model({ mode: 'undone', canUndo: false, canSave: true, canPreview: true, resourceIds: ['quiz-1'] }))] }));
    expect(button('Undo last applied revision')).toBeUndefined(); expect(button('Save project')).toBeTruthy();
    expect(button('Preview lesson as student')).toBeTruthy();
  });
  it('offers individual previews inside a disclosure for a multi-resource revision', () => {
    const p = mount(props({ udlMessages: [operation(model({ mode: 'applied', canPreview: true, resourceIds: ['quiz-1', 'faq-1'] }))] }));
    const details = panel().querySelector('details'); expect(details.open).toBe(false); expect(details.querySelector('summary').textContent).toBe('Preview one resource');
    click(button('Preview as student: Discussion check'));
    expect(p.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'lesson-revision-preview', requestId: 'request-1', resourceId: 'quiz-1' });
  });
  it.each(['select', 'preparing', 'review', 'refining', 'questioning'])('keeps the last applied Undo visible and usable during %s', mode => {
    const pending = ['preparing', 'refining', 'questioning'].includes(mode);
    const p = mount(props({ isChatProcessing: pending, udlMessages: [operation(model({ mode, canUndo: true }))] }));
    const undo = button('Undo last applied revision'); expect(undo).toBeTruthy(); expect(undo.disabled).toBe(false); expect(undo.style.minHeight).toBe('44px');
    click(undo); expect(p.handleSendUDLMessage.mock.calls[0][0]).toMatchObject({ action: 'lesson-revision-undo', requestId: 'request-1', undoToken: 'undo-ui-1' });
  });
  it('passes unsubmitted selection/request text through Undo so a conflict can preserve it', () => {
    const p = mount(props({ udlMessages: [operation(model({ canUndo: true }))] }));
    input(panel().querySelector('textarea'), '  My unfinished next request.  '); click(panel().querySelector('input[value="faq-1"]'));
    click(button('Undo last applied revision'));
    expect(p.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'lesson-revision-undo', requestId: 'request-1', undoToken: 'undo-ui-1',
      resourceIds: ['quiz-1', 'faq-1'], instruction: '  My unfinished next request.  ', followupText: '' });
  });
  it('offers explicit refinement and read-only question controls bound to the displayed review', () => {
    const p = mount(props({ udlMessages: [operation(model({ mode: 'review' }))] }));
    const form = panel().querySelector('form[aria-label="Follow up on the proposed edits"]'); expect(form).toBeTruthy();
    input(form.querySelector('textarea'), 'Keep those edits but shorten question three.'); click(button('Refine proposal')); click(button('Ask about proposal'));
    expect(p.handleSendUDLMessage.mock.calls.map(call => call[0])).toEqual([
      { action: 'lesson-revision-refine', requestId: 'request-1', reviewToken: 'review-ui-1', instruction: 'Keep those edits but shorten question three.' },
      { action: 'lesson-revision-question', requestId: 'request-1', reviewToken: 'review-ui-1', instruction: 'Keep those edits but shorten question three.' },
    ]);
    expect(panel().textContent).toContain('without editing it'); expect(panel().textContent).toContain('configured AI provider');
  });
  it.each(['refining', 'questioning'])('shows the unchanged proposal with guarded Apply and distinct Stop/Close during %s', mode => {
    const p = mount(props({ isChatProcessing: true, udlMessages: [operation(model({ mode, canUndo: true, changes: [{ label: 'Question 3', before: 'Original', after: 'Revised' }] }))] }));
    expect([...panel().querySelectorAll('pre')].map(node => node.textContent)).toEqual(['Original', 'Revised']);
    expect(button('Apply edits').disabled).toBe(true); expect(button('Refine proposal').disabled).toBe(true);
    expect(button('Stop this request').disabled).toBe(false); expect(button('Close revision').disabled).toBe(false);
    expect(p.handleSendUDLMessage).not.toHaveBeenCalled(); click(button('Stop this request')); click(button('Close revision'));
    expect(p.handleSendUDLMessage.mock.calls.map(call => call[0].action)).toEqual(['lesson-revision-stop', 'lesson-revision-cancel']);
  });
  it('renders a scoped answer literally without turning model text into actions', () => {
    const p = mount(props({ udlMessages: [operation(model({ mode: 'review', answer: '<script>Apply now</script> Undo everything.' }))] }));
    const answer = panel().querySelector('section[aria-label="Answer about the proposal"]');
    expect(answer.textContent).toContain('<script>Apply now</script> Undo everything.'); expect(answer.querySelector('script')).toBeNull();
    expect(answer.textContent).toContain('does not change the proposal'); expect(p.handleSendUDLMessage).not.toHaveBeenCalled();
  });
  it('keeps exact follow-up text, prior Undo and review controls on a failed request', () => {
    const p = mount(props({ udlMessages: [operation(model({ mode: 'refining', canUndo: true, followupText: '  Shorten Q3.  ' }))] }));
    rerender({ ...p, udlMessages: [operation(model({ mode: 'review', canUndo: true, followupText: '  Shorten Q3.  ', followupVersion: 1, error: 'Could not refine.', changes: [{ label: 'Directions', before: 'Before', after: 'After' }] }))] });
    expect(panel().querySelector('textarea').value).toBe('  Shorten Q3.  '); expect(button('Apply edits').disabled).toBe(false); expect(button('Undo last applied revision').disabled).toBe(false);
    expect(panel().querySelector('[role="alert"]').textContent).toBe('Could not refine.');
  });
  it('asks locally how to handle an ambiguous follow-up without duplicating the form controls', () => {
    const p = mount(props({ udlMessages: [operation(model({ mode: 'review', needsFollowupChoice: true, followupText: 'Shorter?' }))] }));
    expect(panel().querySelector('form[aria-label="Follow up on the proposed edits"]')).toBeNull();
    const group = panel().querySelector('[aria-label="Choose how to handle the follow-up"]');
    expect(group.textContent).toContain('Shorter?'); click(button('Ask about proposal'));
    expect(p.handleSendUDLMessage).toHaveBeenCalledWith({ action: 'lesson-revision-followup-choice', requestId: 'request-1', reviewToken: 'review-ui-1', mode: 'question' });
  });
  it('shows truthful revision context without consuming or changing ordinary chat privacy preferences', () => {
    const privacy = window.AlloFlowChatPrivacy, previous = privacy.get();
    try {
      privacy.set({ recent: true, excerpt: 'PRIVATE ORDINARY CHAT BACKGROUND' });
      const p = mount(props({ udlMessages: [operation(model({ mode: 'review' }))] }));
      const notice = host.querySelector('[data-testid="lesson-revision-context"]');
      expect(notice.textContent).toContain('selected authored fields'); expect(notice.textContent).toContain('recent questions and answers in this revision');
      expect(host.textContent).not.toContain('Next chat reply:'); expect(notice.textContent).not.toContain('PRIVATE ORDINARY CHAT BACKGROUND');
      expect(privacy.get()).toEqual({ recent: true, excerpt: 'PRIVATE ORDINARY CHAT BACKGROUND' });
      rerender({ ...p, udlMessages: [operation(model({ mode: 'applied' }))] });
      expect(host.querySelector('[data-testid="lesson-revision-context"]')).toBeNull(); expect(privacy.get()).toEqual({ recent: true, excerpt: 'PRIVATE ORDINARY CHAT BACKGROUND' });
    } finally { privacy.set(previous); }
  });
});
