// Math Studio's create-mode buttons (From Topic / From My Content / Solve One)
// and Style buttons are toggles, but the chosen one was shown by colour alone:
// a screen reader heard three identical buttons (WCAG 1.4.1, 4.1.2).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const STUDIO = process.env.MATH_REVIEW_STUDIO_MODULE || 'math_create_module.js';

function renderStudio(props) {
  const React = {
    createElement: (type, elementProps, ...children) => ({ type, props: elementProps || {}, children }),
    useRef: initial => ({ current: initial }),
    useState: initial => [initial, () => {}],
    useEffect() {},
  };
  const window = { React, AlloIcons: {}, AlloModules: {} };
  vm.runInNewContext(fs.readFileSync(path.resolve(STUDIO), 'utf8'), {
    window, React, document: {}, console: { log() {}, warn() {}, error() {} }, setTimeout,
  });
  return window.AlloModules.MathCreate.MathCreateModal({ t: () => '', ...props });
}

const walk = (node, out = []) => {
  if (Array.isArray(node)) { node.forEach(child => walk(child, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  out.push(node);
  walk(node.children, out);
  return out;
};
const pressedByLabel = (tree, suffix) => Object.fromEntries(walk(tree)
  .filter(node => node.type === 'button' && String(node.props['aria-label'] || '').endsWith(suffix))
  .map(node => [node.props['aria-label'], node.props['aria-pressed']]));

describe('Math Studio toggle buttons expose their state', () => {
  it('marks only the active create mode as pressed', () => {
    expect(pressedByLabel(renderStudio({ stemLabCreateMode: 'content', mathMode: 'Conceptual' }), ' mode')).toEqual({
      'From Topic mode': false,
      'From My Content mode': true,
      'Solve One mode': false,
    });
  });

  it('marks only the active style as pressed', () => {
    expect(pressedByLabel(renderStudio({ stemLabCreateMode: 'topic', mathMode: 'Conceptual' }), ' style')).toEqual({
      'Step-by-Step style': false,
      'Conceptual style': true,
      'Real-World style': false,
    });
  });
});
