// @vitest-environment jsdom
// WCAG 2.1.4: Calculus Explorer's Shift+digit view shortcuts act only while focus is in
// the tool and never from a text field. They match physical digit keys, so on AZERTY
// (where Shift+digit types the digit itself) typing a number no longer switches views.
// CALCULUS_CANDIDATE=<path> runs against a scratch copy (mutation checks).
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(process.env.CALCULUS_CANDIDATE || 'stem_lab/stem_tool_calculus.js', 'utf8');
const start = src.indexOf('function onKey(e) {', src.indexOf("if ((d.tab || 'integral') !== 'visualize') return;"));
const end = src.indexOf("window.addEventListener('keydown', onKey);", start);
if (start < 0 || end < 0) throw new Error('Calculus view shortcut handler not found');
let views;
const onKey = new Function('upd', src.slice(start, end) + '\nreturn onKey;')((k, v) => views.push(v));

function press(target, init) {
  const e = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, shiftKey: true, ...init });
  Object.defineProperty(e, 'target', { value: target });
  onKey(e);
  return e;
}

describe('Calculus Shift+digit view shortcuts', () => {
  beforeEach(() => {
    views = [];
    document.body.innerHTML = '<div data-stem-tool-shell="calculus"><canvas id="c" tabindex="0"></canvas><input id="i"></div><main><input id="o"></main>';
  });

  it('switches view from inside the tool on US and AZERTY layouts', () => {
    press(document.getElementById('c'), { code: 'Digit2', key: '@' });
    press(document.getElementById('c'), { code: 'Digit4', key: '4' });
    press(document.getElementById('c'), { code: 'Digit0', key: ')' });
    expect(views).toEqual(['tangent', 'riemann', 'related']);
  });

  it('never fires from a text field, from outside the tool, or with Ctrl/Alt/Meta', () => {
    expect(press(document.getElementById('o'), { code: 'Digit3', key: '3' }).defaultPrevented).toBe(false);
    expect(press(document.getElementById('i'), { code: 'Digit3', key: '3' }).defaultPrevented).toBe(false);
    press(document.getElementById('c'), { code: 'Digit3', key: '3', ctrlKey: true });
    expect(views).toEqual([]);
  });
});
