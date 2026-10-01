import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'behavior_lens_module.js'), 'utf8');

let restoreEnvironment = null;

function elementText(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  const children = node.props && node.props.children;
  return (Array.isArray(children) ? children : [children]).map(elementText).join(' ');
}

// The production module is a large script-tag IIFE. This deliberately tiny
// hook runner exercises its real recovery boundary without mounting the full
// clinical workspace or replacing any BehaviorLens production code.
function createReactHarness() {
  const slots = [];
  let cursor = 0;

  const dependenciesChanged = (previous, next) => {
    if (!previous || !next || previous.length !== next.length) return true;
    return next.some((value, index) => !Object.is(value, previous[index]));
  };

  const React = {
    createElement(type, props, ...children) {
      const nextProps = { ...(props || {}) };
      if (children.length === 1) nextProps.children = children[0];
      else if (children.length > 1) nextProps.children = children;
      return { type, props: nextProps };
    },
    createContext(defaultValue) {
      return { _currentValue: defaultValue };
    },
    useState(initialValue) {
      const index = cursor++;
      if (!slots[index]) {
        slots[index] = {
          kind: 'state',
          value: typeof initialValue === 'function' ? initialValue() : initialValue,
        };
      }
      const setValue = (nextValue) => {
        const previous = slots[index].value;
        slots[index].value = typeof nextValue === 'function' ? nextValue(previous) : nextValue;
      };
      return [slots[index].value, setValue];
    },
    useEffect(effect, dependencies) {
      const index = cursor++;
      const previous = slots[index];
      if (previous && !dependenciesChanged(previous.dependencies, dependencies)) return;
      if (previous && typeof previous.cleanup === 'function') previous.cleanup();
      const cleanup = effect();
      slots[index] = {
        kind: 'effect',
        dependencies: dependencies ? [...dependencies] : null,
        cleanup,
      };
    },
    useRef(initialValue) {
      const index = cursor++;
      if (!slots[index]) slots[index] = { kind: 'ref', value: { current: initialValue } };
      return slots[index].value;
    },
    useMemo(factory) {
      cursor += 1;
      return factory();
    },
    useCallback(callback) {
      cursor += 1;
      return callback;
    },
    useReducer(reducer, initialValue) {
      const [value, setValue] = React.useState(initialValue);
      return [value, (action) => setValue((previous) => reducer(previous, action))];
    },
    useContext(context) {
      cursor += 1;
      return context && context._currentValue;
    },
  };

  return {
    React,
    render(Component, props) {
      cursor = 0;
      return Component(props);
    },
    cleanup() {
      slots.forEach((slot) => {
        if (slot && slot.kind === 'effect' && typeof slot.cleanup === 'function') slot.cleanup();
      });
    },
  };
}

afterEach(() => {
  if (restoreEnvironment) restoreEnvironment();
  restoreEnvironment = null;
  vi.restoreAllMocks();
});

describe('BehaviorLens workspace dependency recovery', () => {
  it('registers early, exposes an accessible wait state, and recovers on the workspace-ready event', () => {
    const originalRegistry = window.AlloModules;
    const originalWindowReact = window.React;
    const hadGlobalReact = Object.prototype.hasOwnProperty.call(globalThis, 'React');
    const originalGlobalReact = globalThis.React;
    const preexistingStyleIds = new Set(
      ['bl-mobile-css', 'bl-a11y-css'].filter((id) => document.getElementById(id)),
    );
    const harness = createReactHarness();

    restoreEnvironment = () => {
      harness.cleanup();
      window.AlloModules = originalRegistry;
      window.React = originalWindowReact;
      if (hadGlobalReact) globalThis.React = originalGlobalReact;
      else delete globalThis.React;
      for (const id of ['bl-mobile-css', 'bl-a11y-css']) {
        if (!preexistingStyleIds.has(id)) document.getElementById(id)?.remove();
      }
    };

    window.AlloModules = {};
    window.React = harness.React;
    globalThis.React = harness.React;
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    // Execute the real module in the failure order from the field report:
    // BehaviorLens arrives before BehaviorLensWorkspace.
    // eslint-disable-next-line no-new-func
    new Function(source)();

    const Boundary = window.AlloModules.BehaviorLens;
    expect(Boundary).toBeTypeOf('function');
    expect(Boundary.displayName).toBe('BehaviorLens');
    expect(window.AlloModules.BehaviorLensWorkspace).toBeUndefined();
    expect(error).not.toHaveBeenCalled();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('runtime boundary will wait'));

    const props = { onClose: vi.fn(), t: () => '', addToast: vi.fn() };
    const waiting = harness.render(Boundary, props);
    expect(waiting.type).toBe('div');
    expect(waiting.props).toMatchObject({
      role: 'status',
      'aria-live': 'polite',
      'data-behavior-lens-runtime': 'waiting',
    });
    expect(elementText(waiting)).toContain('Loading BehaviorLens');

    // The boundary's listener must update its existing state. A fresh-state
    // initializer would not satisfy this assertion because the hook slot is
    // intentionally retained across both renders.
    window.AlloModules.BehaviorLensWorkspace = Object.freeze({ ready: true });
    window.dispatchEvent(new window.CustomEvent('alloflow:module-registry-changed'));
    const recovered = harness.render(Boundary, props);

    expect(recovered.type).toBeTypeOf('function');
    expect(recovered.type).not.toBe(Boundary);
    expect(recovered.props).toMatchObject(props);
    expect(recovered.props['data-behavior-lens-runtime']).toBeUndefined();
  });
});
