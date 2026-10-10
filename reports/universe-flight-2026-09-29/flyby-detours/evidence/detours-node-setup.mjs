// State and lifecycle diagnostics only. Browser checks exercise actual WebGL.
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, get() { return 1; } });
const windowEvents = new EventTarget();
globalThis.addEventListener = windowEvents.addEventListener.bind(windowEvents);
globalThis.removeEventListener = windowEvents.removeEventListener.bind(windowEvents);
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.document = Object.assign(new EventTarget(), {
  createElement(tag) {
    if (tag !== 'canvas') throw new Error('Renderer diagnostics support canvas elements only.');
    return Object.assign(new EventTarget(), {
      width: 800, height: 500, clientWidth: 800, clientHeight: 500, style: {},
      getContext() { return null; },
      getBoundingClientRect() { return { width: 800, height: 500, top: 0, left: 0 }; },
      setAttribute() {}, removeAttribute() {}, focus() {},
      toDataURL() { throw new Error('Native captures belong to the browser check.'); },
    });
  },
});
Object.defineProperty(document, 'hidden', { configurable: true, get() { return false; } });
