import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const act = React.act || require(resolve('desktop/web-app/node_modules/react-dom/test-utils')).act;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const source = readFileSync('word_sounds_module.js', 'utf8');
const start = source.indexOf('    const SyllableCountingView =');
const end = source.indexOf('    // BEGIN WORD SOUNDS TILE ANSWER LIFECYCLE', start);
const textHelper = source.slice(source.indexOf('    const wordSoundsCountResultText ='), source.indexOf('    const wordSoundsCountResultLine ='));
const View = new Function('React', 'syllableCountReady', textHelper + source.slice(start, end) + '\nreturn SyllableCountingView;')(
  React, (data, word) => data?.supported === true && data.targetWord === word,
);
const mounted = [];
afterEach(() => {
  for (const { root, container } of mounted.splice(0)) { act(() => root.unmount()); container.remove(); }
});

async function mount({ count = 0, ready = false, busy = false, spoken = false, consumeSubmit = true, translate = () => '' } = {}) {
  const container = document.createElement('div'); document.body.appendChild(container);
  const root = createRoot(container); mounted.push({ root, container });
  const submitted = vi.fn(), api = {};
  function Host() {
    const [tapCount, setCount] = React.useState(count);
    const [canSubmit, setReady] = React.useState(ready);
    const [isAudioBusy, setBusy] = React.useState(busy);
    Object.assign(api, { setCount, setReady, setBusy });
    return React.createElement(React.Fragment, null,
      React.createElement('input', { 'aria-label': 'Teacher note' }),
      React.createElement(View, { data: { supported: true, targetWord: 'example', count: 9,
        source: spoken ? 'teacher_review' : 'cmudict', ...(spoken ? { audioContext: { fingerprint: null } } : {}) },
        word: 'example', tapCount, canSubmit, isAudioBusy, ts: translate,
        onTap: () => setCount(value => value + 1), onUndo: () => setCount(value => Math.max(0, value - 1)),
        onReset: () => setCount(0), onTeacherReady: () => setReady(true),
        onCheckAnswer: value => { submitted(value); if (consumeSubmit) { setCount(0); setReady(false); } },
      }),
    );
  }
  await act(async () => root.render(React.createElement(Host)));
  const button = label => [...container.querySelectorAll('button')].find(node => label.test(node.textContent) || label.test(node.getAttribute('aria-label') || ''));
  const click = async node => { expect(node).toBeTruthy(); await act(async () => node.click()); };
  return { container, button, click, api, submitted, status: () => container.querySelector('[role="status"]') };
}

describe('syllable counting keyboard and motor access', () => {
  it('announces the changing learner count and keeps zero/reset controls stable without exposing the answer', async () => {
    const h = await mount({ ready: true });
    const status = h.status(), submit = h.button(/^Submit/), undo = h.button(/^Undo last tap/);
    expect(status.getAttribute('aria-live')).toBe('polite');
    expect(status.getAttribute('aria-atomic')).toBe('true');
    expect(status.textContent).toContain('You tapped 0 times.');
    expect(submit.disabled).toBe(true); expect(undo.disabled).toBe(true);
    await h.click(h.button(/^Tap to count/)); await h.click(h.button(/^Tap to count/));
    expect(h.status()).toBe(status); expect(h.button(/^Submit/)).toBe(submit);
    expect(status.textContent).toContain('You tapped 2 times. Ready to submit.');
    expect(submit.disabled).toBe(false);
    await h.click(undo);
    expect(status.textContent).toContain('You tapped 1 time. Ready to submit.');
    await h.click(h.button(/^Reset/));
    expect(status.textContent).toContain('You tapped 0 times.');
    expect(submit.isConnected).toBe(true); expect(submit.disabled).toBe(true);
    expect(h.container.textContent).not.toContain('9');
    expect([...h.container.querySelectorAll('button')].every(node => node.type === 'button')).toBe(true);
  });

  it.each([false, true])('explains the delivery requirement for teacher-spoken mode %s', async spoken => {
    const h = await mount({ count: 2, spoken });
    expect(h.status().textContent).toContain(spoken ? 'Confirm after your teacher has said the word.' : 'Hear the whole word before submitting.');
    expect(h.button(/^Submit/).disabled).toBe(true);
    await act(async () => h.api.setBusy(true));
    expect(h.status().textContent).toContain('Wait for the audio to finish before submitting.');
    expect(h.button(/^Tap to count/).disabled).toBe(false);
    await h.click(h.button(/^Tap to count/));
    expect(h.status().textContent).toContain('You tapped 3 times.');
    expect(h.submitted).not.toHaveBeenCalled();
  });

  it('returns focus to tapping after a focused Submit is consumed', async () => {
    const h = await mount({ count: 2, ready: true });
    const submit = h.button(/^Submit/); submit.focus(); await h.click(submit);
    expect(h.submitted).toHaveBeenCalledWith(2);
    expect(h.button(/^Submit/)).toBe(submit);
    expect(submit.disabled).toBe(true);
    expect(document.activeElement).toBe(h.button(/^Tap to count/));
  });

  it('recovers focus after undoing the last tap and keeps the existing delivery', async () => {
    const h = await mount({ count: 1, ready: true });
    const undo = h.button(/^Undo last tap/); undo.focus(); await h.click(undo);
    expect(undo.disabled).toBe(true);
    expect(document.activeElement).toBe(h.button(/^Tap to count/));
    await h.click(h.button(/^Tap to count/));
    expect(h.button(/^Submit/).disabled).toBe(false);
    expect(h.status().textContent).toContain('Ready to submit.');
  });

  it('moves from an explicit teacher acknowledgment to the tap control', async () => {
    const h = await mount({ spoken: true });
    const confirm = h.button(/^Teacher has said/); confirm.focus(); await h.click(confirm);
    expect(confirm.disabled).toBe(true);
    expect(document.activeElement).toBe(h.button(/^Tap to count/));
    expect(h.status().textContent).toContain('Tap once for each syllable you hear.');
  });

  it('does not steal focus when the user chooses another field before a delayed reset or playback update', async () => {
    const h = await mount({ count: 2, ready: true, consumeSubmit: false });
    const submit = h.button(/^Submit/), note = h.container.querySelector('input');
    submit.focus(); await h.click(submit); note.focus();
    await act(async () => { h.api.setCount(0); h.api.setReady(false); h.api.setBusy(true); });
    expect(document.activeElement).toBe(note);
    await act(async () => { h.api.setBusy(false); h.api.setReady(true); });
    expect(document.activeElement).toBe(note);
  });

  it('translates the live count, delivery guidance and controls while retaining native interaction', async () => {
    const translations = {
      count_taps_one: 'Una pulsación: {count}.', count_taps_other: 'Pulsaciones: {{count}}.',
      count_wait_teacher: 'Confirma después de escuchar a tu docente.',
      count_wait_audio: 'Espera a que termine el audio.', count_ready_submit: 'Listo para enviar.',
      count_teacher_instruction: 'Escucha a tu docente y cuenta las sílabas.',
      count_teacher_ready: 'Mi docente ha dicho la palabra', count_teacher_confirmed: 'Palabra confirmada',
      undo_tap: 'Deshacer', sr_tap_count_syllables: 'Contar sílabas', submit: 'Enviar',
    };
    const h = await mount({ spoken: true, count: 1, translate: key => translations[key.replace('word_sounds.', '')] || key });
    const status = h.status();
    expect(status.textContent).toBe('Una pulsación: 1. Confirma después de escuchar a tu docente.');
    expect(h.container.textContent).toContain('Escucha a tu docente y cuenta las sílabas.');
    await h.click(h.button(/^Mi docente/));
    expect(h.button(/^Palabra confirmada/).disabled).toBe(true);
    expect(status.textContent).toBe('Una pulsación: 1. Listo para enviar.');
    await h.click(h.button(/^Contar sílabas/));
    expect(status.textContent).toBe('Pulsaciones: 2. Listo para enviar.');
    await h.click(h.button(/^Deshacer/));
    expect(status.textContent).toBe('Una pulsación: 1. Listo para enviar.');
    await act(async () => h.api.setBusy(true));
    expect(h.status()).toBe(status);
    expect(status.textContent).toBe('Una pulsación: 1. Espera a que termine el audio.');
    expect(h.button(/^Enviar/).disabled).toBe(true);
    expect(h.container.textContent).not.toContain('word_sounds.');
    expect(h.container.textContent).not.toContain('9');
  });

  it.each([
    ['full missing keys', key => key],
    ['short missing keys', key => key.replace('word_sounds.', '')],
    ['translation exceptions', () => { throw new Error('Translation unavailable'); }],
  ])('uses readable English fallbacks for %s', async (_, translate) => {
    const h = await mount({ count: 1, translate });
    expect(h.status().textContent).toBe('You tapped 1 time. Hear the whole word before submitting.');
    expect(h.button(/^Undo last tap/)).toBeTruthy();
    expect(h.button(/^Tap to count syllables/)).toBeTruthy();
    expect(h.button(/^Submit/).disabled).toBe(true);
    expect(h.container.textContent).not.toContain('word_sounds.');
  });
});
