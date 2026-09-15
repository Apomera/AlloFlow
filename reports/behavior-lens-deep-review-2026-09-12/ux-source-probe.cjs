// Read-only audit probe: exposes closure components in memory, leaving product source unchanged.
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../..');
const dom = new JSDOM('<!doctype html><html><head></head><body></body></html>', { url: 'https://audit.invalid/' });
global.window = dom.window;
global.document = dom.window.document;
global.localStorage = dom.window.localStorage;
global.navigator = dom.window.navigator;
const React = require(path.join(root, 'desktop/web-app/node_modules/react'));
const ReactDOMServer = require(path.join(root, 'desktop/web-app/node_modules/react-dom/server'));
global.React = window.React = React;
const harness = fs.readFileSync(path.join(root, 'tests/helpers/behavior_lens_harness.js'), 'utf8');
const names = Function('return ' + harness.match(/const LUCIDE_ICONS = (\[[\s\S]*?\]);/)[1])();
for (const name of names) global[name] = window[name] = () => React.createElement('span', { 'data-icon': name });
window.AlloModules = {};
Function(fs.readFileSync(path.join(root, 'behavior_lens_workspace_module.js'), 'utf8'))();
const src = fs.readFileSync(path.join(root, 'behavior_lens_module.js'), 'utf8');
Function(src.replace(/\}\)\(\);\s*$/, 'window.__blAudit = {ABCModal, ToolSelectionWizard, LiveObsOverlay, FrequencyCounter, IntervalGrid, ChoiceBoard};})();'))();
const noop = () => {};
const props = { entry: null, onClose: noop, onSave: noop, onSaveSession: noop, onSelectTool: noop, t: () => undefined, targetBehaviors: [], studentName: 'Audit Student', addToast: noop };
const result = {};
for (const [name, component] of Object.entries(window.__blAudit)) {
  document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(component, props));
  const groups = {};
  for (const button of document.querySelectorAll('button[aria-label]')) {
    const label = button.getAttribute('aria-label');
    (groups[label] ||= []).push({visibleText: button.textContent.trim(), pressed: button.getAttribute('aria-pressed'), expanded: button.getAttribute('aria-expanded')});
  }
  result[name] = { repeatedLabels: Object.fromEntries(Object.entries(groups).filter(([, values]) => values.length > 1)), dialogCount: document.querySelectorAll('[role="dialog"]').length };
}
const customEntry = { id: 'custom-audit-entry', antecedent: 'A difficult fractions worksheet was introduced', behavior: 'Student covered ears and moved away', consequence: 'Teacher provided a quieter work area', intensity: 3 };
document.body.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(window.__blAudit.ABCModal, { ...props, entry: customEntry }));
result.ABCModal.customNarrativeReview = Object.fromEntries(['antecedent', 'behavior', 'consequence'].map(key => [key, { storedValue: customEntry[key], presentInRenderedTextOrControl: document.body.textContent.includes(customEntry[key]) || Array.from(document.querySelectorAll('input,textarea,select')).some(el => el.value === customEntry[key]) }]));
fs.writeFileSync(path.join(__dirname, 'ux-source-probe-results.json'), JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
dom.window.close();

