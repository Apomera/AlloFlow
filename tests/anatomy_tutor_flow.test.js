import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadTool, makeCtx, renderTool, resetStemLab } from './helpers/stem_widgets_smoke_harness.js';

const files = [
  'stem_lab/stem_tool_anatomy.js',
  'desktop/web-app/public/stem_lab/stem_tool_anatomy.js'
];

function find(node, predicate) {
  if (!node || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) {
      const match = find(child, predicate);
      if (match) return match;
    }
    return null;
  }
  return predicate(node) ? node : find(node.props?.children, predicate);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

async function settleAnswer() {
  // Resolve the request's then/catch chain without advancing its timeout.
  for (let i = 0; i < 4; i++) await Promise.resolve();
}

function session(tool, extra = {}, api = null) {
  let data = {
    anatomy: {
      _activeTab: 'aiTutor',
      system: 'organs',
      view: 'posterior',
      selectedStructure: 'kidneys',
      complexity: 3,
      ...extra
    }
  };
  const announcements = [];
  // Keep this identity stable, as React does, while allowing independent saved sessions.
  const setToolData = update => {
    data = typeof update === 'function' ? update(data) : update;
  };
  const overrides = () => ({
    gradeLevel: '9',
    callGemini: api,
    announceToSR: message => announcements.push(message),
    setToolData
  });
  const tree = () => tool.render(makeCtx({ toolData: data, ...overrides() }));
  const node = (key, value) => find(tree(), element => (
    element.props && key in element.props && (value === undefined || element.props[key] === value)
  ));
  const html = () => {
    const root = document.createElement('div');
    root.innerHTML = renderTool('anatomy', data, overrides());
    return root;
  };
  return {
    data: () => data.anatomy,
    patch: patch => { data = { ...data, anatomy: { ...data.anatomy, ...patch } }; },
    announcements,
    node,
    html,
    ask: () => node('aria-label', 'Ask').props.onClick(),
    stop: () => node('data-anatomy-tutor-stop').props.onClick(),
    draftAgain: () => node('data-anatomy-tutor-draft-again').props.onClick()
  };
}

function resetRequests() {
  const requests = window.__alloAnatomyAiRequests;
  const entries = requests instanceof Map ? [...requests.values()] : Object.values(requests || {});
  for (const request of entries) if (request?.timer) clearTimeout(request.timer);
  if (window.__alloAnatomyAiRequest?.timer) clearTimeout(window.__alloAnatomyAiRequest.timer);
  window.__alloAnatomyAiRequests = undefined;
  window.__alloAnatomyAiRequest = null;
  window.__alloAnatomyAiPending = null;
}

beforeEach(() => {
  vi.useFakeTimers();
  resetRequests();
  resetStemLab();
});

afterEach(() => {
  resetRequests();
  vi.clearAllTimers();
  vi.useRealTimers();
});

for (const file of files) describe('Anatomy tutor conversation flow ' + file, () => {
  it('shows loading and Stop only for the saved request token that owns pending work', () => {
    const tool = loadTool(file, 'anatomy');
    const request = deferred();
    const api = vi.fn(() => request.promise);
    const owner = session(tool, { _aiInput: 'How do kidneys filter fluid?' }, api);
    owner.ask();
    expect(owner.data()._aiRequestToken).toEqual(expect.any(String));
    expect(owner.html().querySelector('.anatomy-tutor-log').getAttribute('aria-busy')).toBe('true');
    expect(owner.node('data-anatomy-tutor-stop')).not.toBeNull();
    expect(owner.node('aria-label', 'Ask').props.disabled).toBe(true);

    const restored = session(tool, {
      _aiLoading: true,
      _aiRequestToken: 'a-different-restored-request',
      _aiConversationBand: 'g912',
      _aiInput: 'How does the heart pump?'
    }, api);
    expect(restored.html().querySelector('.anatomy-tutor-log').getAttribute('aria-busy')).toBe('false');
    expect(restored.html().textContent).toContain('The previous AI request was interrupted.');
    expect(restored.node('data-anatomy-tutor-stop')).toBeNull();
    expect(restored.node('aria-label', 'Ask').props.disabled).toBe(false);
    expect(owner.html().querySelector('.anatomy-tutor-log').getAttribute('aria-busy')).toBe('true');
  });

  it('lets an interrupted foreign-token session ask independently of another pending conversation', async () => {
    const tool = loadTool(file, 'anatomy');
    const firstRequest = deferred();
    const secondRequest = deferred();
    const firstApi = vi.fn(() => firstRequest.promise);
    const secondApi = vi.fn(() => secondRequest.promise);
    const first = session(tool, { _aiInput: 'First question' }, firstApi);
    first.ask();
    const firstToken = first.data()._aiRequestToken;
    const second = session(tool, {
      _aiLoading: true,
      _aiRequestToken: 'interrupted-saved-token',
      _aiConversationBand: 'g912',
      _aiMessages: [{ role: 'user', text: 'Interrupted question' }],
      _aiInput: 'Second question'
    }, secondApi);
    second.ask();
    expect(firstApi).toHaveBeenCalledTimes(1);
    expect(secondApi).toHaveBeenCalledTimes(1);
    expect(second.data()._aiRequestToken).not.toBe(firstToken);
    expect(first.html().querySelector('.anatomy-tutor-log').getAttribute('aria-busy')).toBe('true');
    expect(second.html().querySelector('.anatomy-tutor-log').getAttribute('aria-busy')).toBe('true');

    secondRequest.resolve('Second answer');
    await settleAnswer();
    expect(second.data()._aiMessages.at(-1).text).toBe('Second answer');
    expect(first.data()._aiLoading).toBe(true);
    expect(first.announcements).toEqual([]);
  });

  for (const finishingIndex of [0, 1]) it('completing conversation ' + (finishingIndex + 1) + ' leaves the other request usable', async () => {
    const tool = loadTool(file, 'anatomy');
    const requests = [deferred(), deferred()];
    const conversations = requests.map((request, index) => session(
      tool,
      { _aiInput: 'Question ' + (index + 1) },
      vi.fn(() => request.promise)
    ));
    conversations.forEach(conversation => conversation.ask());
    const finishing = conversations[finishingIndex];
    const remaining = conversations[1 - finishingIndex];
    const remainingToken = remaining.data()._aiRequestToken;
    requests[finishingIndex].resolve('Finished answer');
    await settleAnswer();

    expect(finishing.data()._aiMessages.at(-1).text).toBe('Finished answer');
    expect(finishing.announcements).toEqual(['The tutor answer is ready.']);
    expect(remaining.data()._aiRequestToken).toBe(remainingToken);
    expect(remaining.html().querySelector('.anatomy-tutor-log').getAttribute('aria-busy')).toBe('true');
    expect(remaining.announcements).toEqual([]);
    expect(window.__alloAnatomyAiPending).toBe(remainingToken);

    remaining.stop();
    expect(remaining.data()._aiLoading).toBe(false);
    expect(remaining.data()._aiMessages.at(-1).text).toContain('Stopped waiting.');
    expect(finishing.data()._aiMessages.at(-1).text).toBe('Finished answer');
    requests[1 - finishingIndex].resolve('Late stopped answer');
    await settleAnswer();
    expect(remaining.data()._aiMessages.at(-1).text).toContain('Stopped waiting.');
  });

  it('rejects a replaced saved token without announcing or releasing another conversation', async () => {
    const tool = loadTool(file, 'anatomy');
    const oldRequest = deferred();
    const otherRequest = deferred();
    const old = session(tool, { _aiInput: 'Old question' }, () => oldRequest.promise);
    const other = session(tool, { _aiInput: 'Other question' }, () => otherRequest.promise);
    old.ask();
    other.ask();
    const replacementMessages = [{ role: 'user', text: 'A replacement saved conversation' }];
    old.patch({ _aiRequestToken: 'replacement-token', _aiLoading: false, _aiMessages: replacementMessages });
    oldRequest.resolve('An answer for the replaced conversation');
    await settleAnswer();
    expect(old.data()._aiMessages).toEqual(replacementMessages);
    expect(old.announcements).toEqual([]);
    expect(other.announcements).toEqual([]);
    expect(other.html().querySelector('.anatomy-tutor-log').getAttribute('aria-busy')).toBe('true');
    expect(window.__alloAnatomyAiPending).toBe(other.data()._aiRequestToken);
    otherRequest.resolve('Other answer');
    await settleAnswer();
    expect(other.data()._aiMessages.at(-1).text).toBe('Other answer');
    expect(other.announcements).toEqual(['The tutor answer is ready.']);
  });

  for (const outcome of ['answer', 'lesson']) it('retains the question and ' + outcome + ' context through navigation and reload', async () => {
    const tool = loadTool(file, 'anatomy');
    const request = deferred();
    const conversation = session(tool, { _aiInput: 'How do kidneys regulate water?' }, () => request.promise);
    conversation.ask();
    conversation.patch({ system: 'circulatory', view: 'anterior', selectedStructure: 'heart' });
    if (outcome === 'answer') request.resolve('The kidneys adjust how much water returns to the blood.');
    else request.reject(Error('Unavailable'));
    await settleAnswer();
    expect(conversation.data()._aiMessages).toHaveLength(2);
    for (const message of conversation.data()._aiMessages) {
      expect(message.systemId).toBe('organs');
      expect(message.structureId).toBe('kidneys');
    }
    expect(conversation.html().querySelector('[data-anatomy-tutor-message="' + outcome + '"]')).not.toBeNull();
    const assertContext = root => {
      const contexts = [...root.querySelectorAll('[data-anatomy-tutor-message-context]')];
      expect(contexts).toHaveLength(2);
      contexts.forEach(context => {
        expect(context.textContent).toContain('Kidneys');
        expect(context.textContent).toContain('Organ Systems');
        expect(context.textContent).not.toContain('Heart');
      });
      expect(root.querySelector('[data-anatomy-tutor-lesson="heart"]')).not.toBeNull();
    };
    assertContext(conversation.html());
    const restored = session(tool, structuredClone(conversation.data()));
    assertContext(restored.html());
  });

  it('drafts the interrupted question again without automatically sending it', () => {
    const tool = loadTool(file, 'anatomy');
    const api = vi.fn(() => new Promise(() => {}));
    const question = 'How do kidneys regulate water?';
    const conversation = session(tool, {
      _aiLoading: true,
      _aiRequestToken: 'an-interrupted-request',
      _aiConversationBand: 'g912',
      _aiMessages: [{ role: 'user', text: question, systemId: 'organs', structureId: 'kidneys' }],
      _aiInput: ''
    }, api);
    expect(conversation.node('data-anatomy-tutor-draft-again')).not.toBeNull();
    conversation.draftAgain();
    expect(conversation.data()._aiInput).toBe(question);
    expect(api).not.toHaveBeenCalled();
  });

  it('drafts the unanswered question again from a lesson fallback', async () => {
    const tool = loadTool(file, 'anatomy');
    const api = vi.fn(() => Promise.reject(Error('Unavailable')));
    const question = 'How do kidneys regulate water?';
    const conversation = session(tool, { _aiInput: question }, api);
    conversation.ask();
    await settleAnswer();
    expect(conversation.data()._aiMessages.at(-1).kind).toBe('lesson');
    expect(conversation.node('data-anatomy-tutor-draft-again')).not.toBeNull();
    conversation.draftAgain();
    expect(conversation.data()._aiInput).toBe(question);
    expect(api).toHaveBeenCalledTimes(1);
  });

  for (const interrupted of [true, false]) it('a stale draft-again action preserves a newer draft for ' + (interrupted ? 'an interrupted request' : 'a lesson fallback'), async () => {
    const tool = loadTool(file, 'anatomy');
    const api = vi.fn(() => Promise.reject(Error('Unavailable')));
    const question = 'How do kidneys regulate water?';
    const extra = interrupted ? {
      _aiLoading: true,
      _aiRequestToken: 'an-interrupted-request',
      _aiConversationBand: 'g912',
      _aiMessages: [{ role: 'user', text: question, systemId: 'organs', structureId: 'kidneys' }],
      _aiInput: ''
    } : { _aiInput: question };
    const conversation = session(tool, extra, api);
    if (!interrupted) {
      conversation.ask();
      await settleAnswer();
    }
    const draftAgain = conversation.node('data-anatomy-tutor-draft-again').props.onClick;
    conversation.patch({ _aiInput: 'My newer question about heart valves' });
    draftAgain();
    expect(conversation.data()._aiInput).toBe('My newer question about heart valves');
    expect(api).toHaveBeenCalledTimes(interrupted ? 0 : 1);
  });

  it('lets mixed-language questions and responses choose their own text direction', () => {
    const tool = loadTool(file, 'anatomy');
    const messages = [
      { role: 'user', text: 'كيف تعمل الكلى؟', systemId: 'organs', structureId: 'kidneys' },
      { role: 'ai', text: 'The kidneys regulate water and salts.', kind: 'answer', systemId: 'organs', structureId: 'kidneys' }
    ];
    const conversation = session(tool, {
      _aiConversationBand: 'g912',
      _aiMessages: messages,
      _aiInput: 'What does a nephron do?'
    });
    const root = conversation.html();
    expect(root.querySelector('[data-anatomy-tutor-input]').getAttribute('dir')).toBe('auto');
    for (const message of messages) {
      const paragraph = [...root.querySelectorAll('.anatomy-tutor-message p')].find(element => element.textContent === message.text);
      expect(paragraph).toBeDefined();
      expect(paragraph.getAttribute('dir')).toBe('auto');
    }
  });
});
