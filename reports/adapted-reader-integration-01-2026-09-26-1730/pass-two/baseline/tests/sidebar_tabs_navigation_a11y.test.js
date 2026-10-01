import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { createRoot } = require(resolve('desktop/web-app/node_modules/react-dom/client'));
const { act } = require(resolve('desktop/web-app/node_modules/react-dom/test-utils'));
let root, host, Tabs, submissions, originalHistoryIcon;
beforeEach(() => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.React = React; window.AlloModules = {};
  // The app supplies its Lucide History icon, replacing the native window.History constructor.
  originalHistoryIcon = window.History; window.History = () => null;
  Function('window', readFileSync('view_sidebar_tabs_nav_module.js', 'utf8'))(window);
  Tabs = window.AlloModules.SidebarTabsNav.SidebarTabsNav;
  host = document.createElement('div'); document.body.append(host); root = createRoot(host); submissions = 0;
});
afterEach(() => { act(() => root.unmount()); host.remove(); window.History = originalHistoryIcon; });
function mount(t = () => undefined) {
  function Harness() {
    const [active, setActive] = React.useState('create');
    return React.createElement('form', { onSubmit: e => { e.preventDefault(); submissions++; } },
      React.createElement(Tabs, { t, activeSidebarTab: active, handleSetActiveSidebarTabToCreate: () => setActive('create'), setActiveSidebarTab: setActive, setIsHistoryPulsing: () => {} }));
  }
  act(() => root.render(React.createElement(Harness)));
  return [...host.querySelectorAll('[role="tab"]')];
}
const key = (element, value) => act(() => element.dispatchEvent(new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })));
describe('sidebar tab keyboard and names', () => {
  it.each([['missing', () => undefined], ['key echo', key => key]])('provides visible and tablist fallback names for %s translations', (_, t) => {
    const [create, history] = mount(t);
    expect(create.textContent.trim()).toBe('Create'); expect(history.textContent.trim()).toBe('History');
    expect(host.querySelector('[role="tablist"]').getAttribute('aria-label')).toBe('Content tabs');
    expect(create.hasAttribute('aria-label')).toBe(false); expect(history.hasAttribute('aria-label')).toBe(false);
  });
  it('keeps the visible translated name instead of an independently translated override', () => {
    const [create, history] = mount(k => ({ 'sidebar.create_tab': 'Crear', 'sidebar.history_tab': 'Historial', 'common.create_new_content': 'Contenido nuevo', 'common.history': 'Archivo' })[k]);
    expect(create.textContent.trim()).toBe('Crear'); expect(history.textContent.trim()).toBe('Historial');
    expect(create.hasAttribute('aria-label')).toBe(false); expect(history.hasAttribute('aria-label')).toBe(false);
  });
  it('wraps in both directions and supports Home/End without activating on arrow focus', () => {
    const [create, history] = mount(); create.focus();
    for (const arrow of ['ArrowLeft', 'ArrowRight']) {
      key(create, arrow); expect(document.activeElement).toBe(history);
      expect(create.getAttribute('aria-selected')).toBe('true');
      key(history, arrow); expect(document.activeElement).toBe(create);
    }
    key(create, 'End'); expect(document.activeElement).toBe(history);
    key(history, 'Home'); expect(document.activeElement).toBe(create);
    act(() => history.click()); expect(history.getAttribute('aria-selected')).toBe('true');
    expect(history.tabIndex).toBe(0); expect(create.tabIndex).toBe(-1);
    key(history, 'ArrowRight'); expect(document.activeElement).toBe(create);
    expect(history.getAttribute('aria-selected')).toBe('true');
  });
  it('activates tabs without submitting a containing form', () => {
    const [create, history] = mount();
    act(() => history.click()); act(() => create.click());
    expect(submissions).toBe(0); expect(create.type).toBe('button'); expect(history.type).toBe('button');
  });
});
