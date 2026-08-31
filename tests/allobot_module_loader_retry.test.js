import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { describe, expect, it } from 'vitest';

const ROOT = process.cwd();
const moduleSource = fs.readFileSync(path.join(ROOT, 'allobot_module.js'), 'utf8');
const publicModuleSource = fs.readFileSync(
  path.join(ROOT, 'desktop', 'web-app', 'public', 'allobot_module.js'),
  'utf8',
);

function createDocumentStub() {
  const elements = new Map();
  return {
    body: {
      appendChild(element) {
        elements.set(element.id, element);
      },
    },
    createElement() {
      return {
        style: {},
        setAttribute() {},
      };
    },
    getElementById(id) {
      return elements.get(id) || null;
    },
  };
}

function createReactStub() {
  return {
    Fragment: Symbol('Fragment'),
    createElement() { return null; },
    forwardRef(component) { return component; },
    memo(component) { return component; },
    useCallback(callback) { return callback; },
    useContext() { return null; },
    useEffect() {},
    useId() { return 'allobot-test'; },
    useImperativeHandle() {},
    useLayoutEffect() {},
    useMemo(factory) { return factory(); },
    useRef(value) { return { current: value }; },
    useState(value) { return [value, () => {}]; },
  };
}

function createSandbox() {
  const logs = { errors: [], messages: [], warnings: [] };
  const window = {};
  return {
    logs,
    sandbox: {
      document: createDocumentStub(),
      window,
      console: {
        error(message) { logs.errors.push(message); },
        log(message) { logs.messages.push(message); },
        warn(message) { logs.warnings.push(message); },
      },
    },
    window,
  };
}

describe('AlloBot module loader retry', () => {
  it('binds both microphone states used by the generated control chrome', () => {
    expect(moduleSource).toContain('var Mic = _icons.Mic || function() { return null; };');
    expect(moduleSource).toContain('var MicOff = _icons.MicOff || function() { return null; };');
  });

  it('retries successfully when React becomes available after a premature load', () => {
    expect(publicModuleSource).toBe(moduleSource);

    const { logs, sandbox, window } = createSandbox();
    vm.runInNewContext(moduleSource, sandbox, { filename: 'allobot_module.js' });

    expect(logs.errors).toContain('[AlloBotModule] React not found on window');
    expect(window.__alloBotModuleLoaded).not.toBe(true);
    expect(window.AlloModules).toBeUndefined();

    window.React = createReactStub();
    vm.runInNewContext(moduleSource, sandbox, { filename: 'allobot_module.js' });

    expect(window.__alloBotModuleLoaded).toBe(true);
    expect(window.AlloModules.AlloBot).toEqual(expect.any(Function));
    expect(window.AlloModules.SpeechBubble).toEqual(expect.any(Function));
    expect(logs.messages).toContain('[AlloBotModule] AlloBot registered successfully');

    const registeredAlloBot = window.AlloModules.AlloBot;
    vm.runInNewContext(moduleSource, sandbox, { filename: 'allobot_module.js' });
    expect(window.AlloModules.AlloBot).toBe(registeredAlloBot);
    expect(logs.warnings.some((message) => message.includes('Already loaded'))).toBe(true);
  });
});
