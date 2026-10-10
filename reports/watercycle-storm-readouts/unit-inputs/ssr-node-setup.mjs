// The existing SSR helper requires browser globals when it imports ReactDOM.
// These tests render static markup; refs and effects never mount a canvas.
const ids = new Map();
const documentStub = {};
function element(tag) {
  const attributes = new Map();
  const classes = new Set();
  const node = {
    tagName: String(tag).toUpperCase(), nodeName: String(tag).toUpperCase(), nodeType: 1,
    style: {}, children: [], parentNode: null, ownerDocument: documentStub,
    id: '', className: '', textContent: '', innerHTML: '',
    classList: {
      add(...values) { values.forEach(value => classes.add(value)); },
      remove(...values) { values.forEach(value => classes.delete(value)); },
      contains(value) { return classes.has(value); },
      toggle(value, force) { const on = force === undefined ? !classes.has(value) : !!force; if (on) classes.add(value); else classes.delete(value); return on; },
    },
    appendChild(child) { child.parentNode = node; node.children.push(child); if (child.id) ids.set(child.id, child); return child; },
    removeChild(child) { node.children = node.children.filter(value => value !== child); if (child.id) ids.delete(child.id); child.parentNode = null; return child; },
    setAttribute(name, value) { attributes.set(name, String(value)); if (name === 'id') node.id = String(value); },
    getAttribute(name) { return attributes.get(name) ?? null; },
    removeAttribute(name) { attributes.delete(name); },
    addEventListener() {}, removeEventListener() {},
    querySelector() { return null; }, querySelectorAll() { return []; },
    remove() { node.parentNode?.removeChild(node); },
  };
  return node;
}
Object.assign(documentStub, {
  nodeType: 9, currentScript: null, readyState: 'complete', hidden: false,
  createElement: element, createElementNS: (_namespace, tag) => element(tag),
  getElementById: id => ids.get(id) || null,
  getElementsByTagName: () => [], querySelector: () => null, querySelectorAll: () => [],
  addEventListener() {}, removeEventListener() {},
});
documentStub.head = element('head');
documentStub.body = element('body');
documentStub.documentElement = element('html');
const storage = new Map();
const windowStub = {
  document: documentStub, navigator: globalThis.navigator,
  location: { protocol: 'http:', hostname: 'localhost', href: 'http://localhost/' },
  innerWidth: 1280, innerHeight: 720, devicePixelRatio: 1,
  addEventListener() {}, removeEventListener() {},
  matchMedia: query => ({ media: query, matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }),
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)), removeItem: key => storage.delete(key) },
  setTimeout, clearTimeout, setInterval, clearInterval,
};
windowStub.window = windowStub;
windowStub.self = windowStub;
documentStub.defaultView = windowStub;
globalThis.window = windowStub;
globalThis.document = documentStub;
globalThis.self = windowStub;
