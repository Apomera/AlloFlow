// @vitest-environment jsdom
// WCAG 2.1.4 / 2.1.1: fluency mode's Space shortcut toggles recording only while
// focus is in the fluency dialog and not on a control that uses Space itself, so
// typing a space or pressing a focused button no longer starts or stops recording.
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ANTI_CANDIDATE=<path> runs these checks against a scratch copy (mutation checks) without
// touching the shared AlloFlowANTI.txt.
function sliceBetween(file, startText, endText) {
  const source = readFileSync(file === 'AlloFlowANTI.txt' && process.env.ANTI_CANDIDATE ? process.env.ANTI_CANDIDATE : path.join(ROOT, file), 'utf8');
  const start = source.indexOf(startText), end = source.indexOf(endText, start);
  if (start < 0 || end < 0) throw new Error('Missing fluency key handler boundaries in ' + file);
  return source.slice(start, end);
}

const body = sliceBetween('AlloFlowANTI.txt', 'const handleFluencyKey = (e) => {', "window.addEventListener('keydown', handleFluencyKey);");
let toggles;
const handler = new Function('toggleFluencyRecording', body + '\nreturn handleFluencyKey;')(() => { toggles++; });

function press(target, init = {}) {
  const e = new KeyboardEvent('keydown', { code: 'Space', key: ' ', bubbles: true, cancelable: true, ...init });
  Object.defineProperty(e, 'target', { value: target });
  handler(e);
  return e;
}

describe('chunk reader Space shortcut', () => {
  const chunkBody = sliceBetween('AlloFlowANTI.txt', 'if (!isChunkReaderActive) return;\n      const handler = (e) => {', "else if (e.key === 'Home')");
  const calls = [];
  const chunkHandler = new Function('setChunkReaderIdx', 'setChunkReaderAutoPlay',
    chunkBody.replace('if (!isChunkReaderActive) return;', '') + '};\nreturn handler;')(() => calls.push('idx'), () => calls.push('auto'));
  const pressKey = (target, init) => {
    const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
    Object.defineProperty(e, 'target', { value: target });
    chunkHandler(e);
    return e;
  };

  it('leaves Space to a focused button but keeps arrows and plain-surface Space', () => {
    document.body.innerHTML = '<div id="r" tabindex="0"><button id="b">Next</button></div>';
    calls.length = 0;
    expect(pressKey(document.getElementById('b'), { code: 'Space', key: ' ' }).defaultPrevented).toBe(false);
    expect(calls).toEqual([]);
    pressKey(document.getElementById('b'), { key: 'ArrowRight' });
    pressKey(document.getElementById('r'), { code: 'Space', key: ' ' });
    pressKey(document.getElementById('r'), { code: 'Space', key: ' ', ctrlKey: true });
    expect(calls).toEqual(['idx', 'auto']);
  });
});

describe('fluency Space shortcut', () => {
  let dialog, outside;
  beforeEach(() => {
    toggles = 0;
    document.body.innerHTML = '<div role="dialog" id="d" tabindex="-1"><p id="p">Passage</p><button id="b">Close</button><input id="i"><div role="switch" id="s" tabindex="0"></div></div><main id="m"><textarea id="t"></textarea></main>';
    dialog = document.getElementById('d');
    outside = document.getElementById('m');
  });

  it('toggles recording from the dialog itself and its passage text', () => {
    expect(press(dialog).defaultPrevented).toBe(true);
    press(document.getElementById('p'));
    expect(toggles).toBe(2);
  });

  it('leaves Space to focused controls inside the dialog', () => {
    for (const id of ['b', 'i', 's']) {
      const e = press(document.getElementById(id));
      expect(e.defaultPrevented, id).toBe(false);
    }
    expect(toggles).toBe(0);
  });

  it('ignores Space outside a dialog, auto-repeat and modifier combinations', () => {
    expect(press(outside).defaultPrevented).toBe(false);
    press(document.getElementById('t'));
    press(dialog, { repeat: true });
    press(dialog, { ctrlKey: true });
    expect(toggles).toBe(0);
  });
});
