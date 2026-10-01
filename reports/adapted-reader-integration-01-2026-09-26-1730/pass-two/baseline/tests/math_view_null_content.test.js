import fs from 'node:fs';
import vm from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

const ROOT_MODULE_PATH = 'view_math_module.js';
const PUBLIC_MODULE_PATH = 'desktop/web-app/public/view_math_module.js';
const HOST_PATHS = [
  'AlloFlowANTI.txt',
  'desktop/web-app/src/AlloFlowANTI.txt',
  'desktop/web-app/src/App.jsx',
];

function loadMathView() {
  const createElement = vi.fn((type, props, ...children) => ({
    type,
    props: props || {},
    children,
  }));
  const window = {
    React: {
      Fragment: Symbol('Fragment'),
      createElement,
      useRef: initialValue => ({ current: initialValue }),
      useLayoutEffect: vi.fn(effect => effect()),
      useEffect: vi.fn(),
    },
    AlloIcons: {},
    AlloModules: {},
  };

  vm.runInNewContext(fs.readFileSync(ROOT_MODULE_PATH, 'utf8'), {
    console: { error: vi.fn(), log: vi.fn() },
    window,
  });

  return { createElement, MathView: window.AlloModules.MathView };
}

describe('MathView missing-content resilience', () => {
  it.each([
    null,
    undefined,
    { id: 'missing-data', type: 'math', data: null },
    { id: 'wrong-type', type: 'quiz', data: { problems: [] } },
  ])(
    'renders an accessible empty state for a missing or non-math artifact instead of throwing',
    (generatedContent) => {
      const { createElement, MathView } = loadMathView();

      expect(() => MathView({ generatedContent })).not.toThrow();
      const rendered = MathView({ generatedContent });
      expect(rendered).toMatchObject({
        type: 'div',
        props: { role: 'status', 'aria-live': 'polite' },
        children: ['No math activity is ready. Generate one or select one from history.'],
      });
      expect(createElement).toHaveBeenCalled();
    },
  );

  it('announces that math content is being prepared while generation is active', () => {
    const { MathView } = loadMathView();
    const rendered = MathView({ generatedContent: null, isProcessing: true });

    expect(rendered).toMatchObject({
      props: { role: 'status', 'aria-live': 'polite' },
      children: ['Preparing math content...'],
    });
  });

  it('lets MathView own empty-state rendering instead of suppressing it in every host', () => {
    const staleGuard = 'activeView === \'math\' && generatedContent?.data && window.AlloModules && window.AlloModules.MathView';

    for (const hostPath of HOST_PATHS) {
      const host = fs.readFileSync(hostPath, 'utf8');
      expect(host).not.toContain(staleGuard);
      expect(host).toMatch(/activeView === 'math'[\s\S]{0,140}?window\.AlloModules\.MathView/);
    }
  });

  it('keeps the deployed MathView module byte-identical to the root build', () => {
    expect(fs.readFileSync(PUBLIC_MODULE_PATH, 'utf8'))
      .toBe(fs.readFileSync(ROOT_MODULE_PATH, 'utf8'));
  });
});
