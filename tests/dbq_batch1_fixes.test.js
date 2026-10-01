// DBQ fixes (2026-09-28 audit, batch 1).
//
// - The excerpt's Highlight / Listen / Vocab buttons were absolutely positioned
//   over the top-right of the document text, covering its first lines on a
//   phone. They are a normal row above the text now.
// - Listen kept its playing state in the learner record (`_docSpeaking_<id>`),
//   so it was saved with the student's work, and it went wrong two ways:
//   muted, speak() says nothing, so the button stuck on "Stop"; and when
//   another clip was playing, speak()'s own "previous clip stopped" event was
//   taken as the end of THIS clip, so the button read "Listen" while it played.
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let React, ReactDOMClient, act, DbqView, root, container;
beforeAll(() => {
  React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  ReactDOMClient = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/client'));
  window.React = React;
  act = React.act;
  window.IS_REACT_ACT_ENVIRONMENT = true;
  window.AlloModules = window.AlloModules || {};
  new Function(readFileSync(process.env.ALLO_DBQ_CANDIDATE || 'view_dbq_module.js', 'utf8'))();
  DbqView = window.AlloModules.DbqView;
});
afterEach(async () => { if (root) await act(async () => root.unmount()); container?.remove(); root = container = null; delete window.AlloSpeechPlayer; });

const CONTENT = { id: 'dbq-b1', data: { title: 'Whose Account?', historicalContext: 'Context.', documents: [{ id: 'A', title: 'Letter home', source: 'Private collection', excerpt: 'We arrived in spring.' }], rubric: [], corroborationClaims: [] } };
async function mount() {
  container = document.createElement('div');
  document.body.appendChild(container);
  const store = { current: {} };
  const writes = [];
  function Harness() {
    const [, tick] = React.useState(0);
    return React.createElement(DbqView, {
      generatedContent: CONTENT, studentResponses: store.current,
      handleStudentInput: (resId, key, value) => { writes.push(key); store.current = { ...store.current, [resId]: { ...(store.current[resId] || {}), [key]: value } }; tick(n => n + 1); },
      callGemini: null, cleanJson: s => s, addToast: () => {}, handleScoreUpdate: () => {}, gradeLevel: '9', t: () => undefined, isTeacherMode: false, callTTS: null, selectedVoice: 'Kore',
    });
  }
  root = ReactDOMClient.createRoot(container);
  await act(async () => root.render(React.createElement(Harness)));
  return writes;
}
const listen = () => container.querySelector('[data-dbq-listen]');
const emit = async (detail) => act(async () => { window.dispatchEvent(new CustomEvent('allo-speech-state', { detail })); });
// A stand-in for AlloSpeechPlayer.speak: stops the current clip, announces the new one.
function fakePlayer({ muted = false } = {}) {
  let id = 0, current = null;
  return {
    speak(text) {
      if (muted) return Promise.resolve(null);
      window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: false, currentText: current, currentId: id } }));
      current = text; id += 1;
      window.dispatchEvent(new CustomEvent('allo-speech-state', { detail: { isPlaying: true, status: 'generating', currentText: text, currentId: id } }));
      return Promise.resolve({ id });
    },
    stop() {},
    get id() { return id; },
  };
}

describe('excerpt tools', () => {
  it('sit in a row above the text, not on top of it', async () => {
    await mount();
    const row = container.querySelector('[data-dbq-excerpt-tools]');
    expect(row).not.toBeNull();
    expect(row.className).not.toMatch(/\babsolute\b/);
    expect(row.className).toContain('flex');
  });
});

describe('Listen', () => {
  it('shows Stop while its own clip plays even when another clip was playing, and Listen after it ends', async () => {
    window.AlloSpeechPlayer = fakePlayer();
    const writes = await mount();
    await act(async () => listen().click());
    expect(listen().textContent).toContain('Stop');
    await emit({ isPlaying: true, status: 'playing', currentText: 'We arrived in spring.', currentId: window.AlloSpeechPlayer.id });
    expect(listen().textContent).toContain('Stop');
    await emit({ isPlaying: false, currentText: 'We arrived in spring.', currentId: window.AlloSpeechPlayer.id });
    expect(listen().textContent).toContain('Listen');
    expect(writes.some(key => String(key).startsWith('_docSpeaking_'))).toBe(false);
  });

  it('goes back to Listen when another clip takes over', async () => {
    window.AlloSpeechPlayer = fakePlayer();
    await mount();
    await act(async () => listen().click());
    await emit({ isPlaying: true, status: 'playing', currentText: 'Something else', currentId: 99 });
    expect(listen().textContent).toContain('Listen');
  });

  it('does not stick on Stop when the app is muted', async () => {
    window.AlloSpeechPlayer = fakePlayer({ muted: true });
    await mount();
    await act(async () => listen().click());
    expect(listen().textContent).toContain('Listen');
  });

  it('Stop stops', async () => {
    window.AlloSpeechPlayer = fakePlayer();
    let stopped = 0;
    window.AlloSpeechPlayer.stop = () => { stopped += 1; };
    await mount();
    await act(async () => listen().click());
    await act(async () => listen().click());
    expect(stopped).toBe(1);
    expect(listen().textContent).toContain('Listen');
  });
});
