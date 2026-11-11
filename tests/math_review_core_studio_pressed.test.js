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
    useLayoutEffect() {},
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

// 2026-11-09 pass. A chosen style could never be cleared, the style buttons showed
// in "From My Content" where the style is ignored, and nothing said why Generate
// was unavailable. On a phone "Build Assessment" sat off-screen.
describe('Math Studio style and layout', () => {
  const buttons = (tree) => walk(tree).filter((node) => node.type === 'button');
  const styleButton = (tree, label) => buttons(tree).find((node) => node.props['aria-label'] === label);
  const text = (tree) => walk(tree).flatMap((node) => node.children).filter((child) => typeof child === 'string').join(' | ');

  it('choosing the active style again returns to a plain problem set', () => {
    const calls = [];
    const tree = renderStudio({ stemLabCreateMode: 'topic', mathMode: 'Conceptual', setMathMode: (mode) => calls.push(mode) });
    styleButton(tree, 'Conceptual style').props.onClick();
    styleButton(tree, 'Step-by-Step style').props.onClick();
    expect(calls).toEqual(['Problem Set Generator', 'Step-by-Step']);
    expect(text(tree)).toContain('Choose it again to clear.');
    expect(text(renderStudio({ stemLabCreateMode: 'topic', mathMode: 'Problem Set Generator' }))).toContain('With none chosen you get a standard problem set.');
  });

  it('shows the style buttons only where the style is used', () => {
    for (const mode of ['content', 'solve']) {
      expect(buttons(renderStudio({ stemLabCreateMode: mode, mathMode: 'Conceptual' })).filter((node) => String(node.props['aria-label'] || '').endsWith(' style')), mode).toHaveLength(0);
    }
  });

  it('says why Generate is unavailable, and stops saying it once there is input', () => {
    const empty = renderStudio({ stemLabCreateMode: 'topic', mathInput: '  ' });
    const generate = buttons(empty).find((node) => node.props['aria-label'] === 'Generate math problems');
    expect(generate.props.disabled).toBe(true);
    expect(generate.props['aria-describedby']).toBe('math-studio-generate-hint');
    expect(walk(empty).find((node) => node.props.id === 'math-studio-generate-hint').children.join('')).toBe('Type a topic above to turn this on.');
    const filled = renderStudio({ stemLabCreateMode: 'topic', mathInput: 'fractions' });
    expect(walk(filled).find((node) => node.props.id === 'math-studio-generate-hint')).toBeUndefined();
    expect(buttons(filled).find((node) => node.props['aria-label'] === 'Generate math problems').props.disabled).toBe(false);
  });

  it('rows wrap instead of running off a narrow screen', () => {
    const tree = renderStudio({ stemLabCreateMode: 'topic' });
    const modeRow = walk(tree).find((node) => node.type === 'div' && node.children.flat().some((child) => child && child.props && child.props['aria-label'] === 'Open assessment builder'));
    expect(modeRow.props.className).toContain('flex-wrap');
    const builder = renderStudio({ showAssessmentBuilder: true, assessmentBlocks: [{ id: 'b-1', type: 'computation', quantity: 5, directive: '' }] });
    const typeSelect = walk(builder).find((node) => node.type === 'select' && node.props['aria-label'] === 'Block type');
    const row = walk(builder).find((node) => node.type === 'div' && node.children.includes(typeSelect));
    expect(row.props.className).toContain('flex-wrap');
    const directive = walk(builder).find((node) => node.type === 'input' && node.props['aria-label'] === 'Block 1 directive');
    expect(directive.props.placeholder).toMatch(/^What should these problems cover\?/);
    // The field was border-slate-100 with a slate-300 placeholder: it read as disabled.
    expect(directive.props.className).not.toMatch(/border-slate-100|placeholder-slate-300/);
  });
});
