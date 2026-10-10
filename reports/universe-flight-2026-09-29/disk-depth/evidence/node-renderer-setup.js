// Diagnostic Node environment for renderer math and mocked GL lifecycle tests.
// Native WebGL and the real DOM are checked separately in the browser harness.
globalThis.window = globalThis;
Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, get() { return 1; } });
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = () => 0;
globalThis.cancelAnimationFrame = () => {};
globalThis.document = {
  get hidden() { return false; },
  addEventListener() {},
  removeEventListener() {},
  createElement(tag) {
    if (tag !== 'canvas') throw new Error('Diagnostic setup only supports canvas elements.');
    return {
      width: 800, height: 500, clientWidth: 800, clientHeight: 500, style: {},
      getContext() { return null; },
      toDataURL() { throw new Error('Canvas image capture must be mocked in the Node diagnostic.'); },
      getBoundingClientRect() { return { width: 800, height: 500, top: 0, left: 0 }; },
      addEventListener() {}, removeEventListener() {},
      setAttribute() {}, removeAttribute() {}, focus() {},
    };
  },
};
