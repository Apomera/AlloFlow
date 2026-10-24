// "Try with cubes" set the cube-builder challenge from the answer by deleting
// every non-digit and joining what was left: "8 cm^3" became a challenge to
// build 83 cubes, "8 \text{ cm}^3" the same. The challenge must use the
// answer's own final quantity, and an answer that is not a single whole
// number of cubes sets no challenge (and clears a stale one).
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const VIEW = process.env.MATH_REVIEW_VIEW_MODULE || 'view_math_module.js';

function loadMathView() {
  const hookSlots = [];
  let hookCursor = 0;
  const React = {
    Fragment: Symbol('Fragment'),
    createElement: (type, props, ...children) => ({ type, props: props || {}, children }),
    useRef(initial) {
      const index = hookCursor++;
      if (!hookSlots[index]) hookSlots[index] = { current: initial };
      return hookSlots[index];
    },
    useLayoutEffect() {},
    useEffect() {},
  };
  const window = { React, AlloIcons: {}, AlloModules: {}, setTimeout: callback => callback() };
  vm.runInNewContext(fs.readFileSync(path.resolve(VIEW), 'utf8'), {
    window, React, document: { getElementById: () => null }, console: { log() {}, warn() {}, error() {} },
  });
  return props => { hookCursor = 0; return window.AlloModules.MathView(props); };
}

const walk = (node, out = []) => {
  if (Array.isArray(node)) { node.forEach(child => walk(child, out)); return out; }
  if (!node || typeof node !== 'object') return out;
  out.push(node);
  walk(node.children, out);
  return out;
};
const text = node => Array.isArray(node) ? node.map(text).join('')
  : (typeof node === 'string' || typeof node === 'number') ? String(node)
    : node && typeof node === 'object' ? text(node.children) : '';

function tryWithCubes(answer) {
  const MathView = loadMathView();
  const setCubeBuilderChallenge = vi.fn();
  const tree = MathView({
    generatedContent: {
      id: 'r', type: 'math',
      data: { title: 'Volume', problems: [{ id: 'p', question: 'Find the volume of the rectangular prism.', answer, steps: [{ explanation: 'Multiply length, width and height.' }] }] },
    },
    t: () => '',
    mathSubject: 'Geometry',
    studentResponses: { r: { p: 'my work' } },
    mathCheckResults: { r: { p: { checked: true, verdict: 'correct', score: 100, feedback: 'Well done.' } } },
    handleStudentInput: vi.fn(),
    setStemLabTool: vi.fn(), setStemLabTab: vi.fn(), setShowStemLab: vi.fn(),
    setCubeBuilderMode: vi.fn(), setCubePositions: vi.fn(), setCubeBuilderFeedback: vi.fn(),
    setCubeBuilderChallenge,
  });
  const cubes = walk(tree).find(node => node.type === 'button' && /Try with cubes/.test(text(node)));
  expect(cubes, 'the Try with cubes button did not render').toBeTruthy();
  expect(cubes.props.disabled).toBe(false);
  cubes.props.onClick();
  expect(setCubeBuilderChallenge).toHaveBeenCalledTimes(1);
  return setCubeBuilderChallenge.mock.calls[0][0];
}

describe('Try with cubes uses the answer’s own volume', () => {
  it.each([
    ['8 cm^3', 8],
    ['8 \\text{ cm}^3', 8],
    ['24 cm³', 24],
    ['V = 4 × 3 × 2 = 24 cubic units', 24],
    ['The volume is 24 cubic units', 24],
    ['60', 60],
  ])('%s sets a %i-cube challenge', (answer, volume) => {
    expect(tryWithCubes(answer)).toEqual({ type: 'volume', answer: volume, shape: 'any' });
  });

  it.each(['2.5 cm^3', '1/2', '4 × 3 × 2', '120 cubic units', '0'])('%s sets no challenge', answer => {
    expect(tryWithCubes(answer)).toBe(null);
  });
});
