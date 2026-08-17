import { beforeAll, afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

const require2 = createRequire(import.meta.url);
const modulesDir = resolve(process.cwd(), 'desktop/web-app/node_modules');
const React = require2(resolve(modulesDir, 'react'));
const ReactDOMClient = require2(resolve(modulesDir, 'react-dom/client'));
const { act } = require2(resolve(modulesDir, 'react-dom/test-utils'));

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const roots = [];
let ProjectSettingsView;

beforeAll(() => {
  window.React = React;
  globalThis.React = React;
  window.AlloModules = {};
  window.AlloIcons = {};
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'view_project_settings_module.js'), 'utf8'))();
  ProjectSettingsView = window.AlloModules.ProjectSettingsView;
});

afterEach(() => {
  while (roots.length) {
    const { root, container } = roots.pop();
    act(() => root.unmount());
    container.remove();
  }
});

function mount(props) {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = ReactDOMClient.createRoot(container);
  act(() => root.render(React.createElement(ProjectSettingsView, props)));
  roots.push({ root, container });
  return container;
}

function button(container, label) {
  return Array.from(container.querySelectorAll('button')).find((item) => item.textContent.trim() === label);
}

describe('district evaluation portal launcher', () => {
  it('uses the host validator to accept only an exact HTTPS Apps Script /exec deployment', () => {
    const source = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
    expect(source).toContain("const ALLO_EVALUATION_PORTAL_URL_KEY = 'allo_evaluation_portal_url_v1'");
    expect(source).toContain("window.open(portalUrl, '_blank', 'noopener,noreferrer')");
    expect(source).toContain("if (!_isDesktopBundledApp) addToast('The district portal was blocked.");
    expect(source).toContain("if (toolId === 'evaluation') { handleOpenPrincipalEvaluationFromSettings(); }");
    const match = source.match(/const normalizeAlloEvaluationPortalUrl = \(value\) => \{([\s\S]*?)\n\};/);
    expect(match).toBeTruthy();
    // Exercise the implementation embedded in the canonical host source.
    // eslint-disable-next-line no-new-func
    const normalize = new Function('value', match[1]);
    const valid = 'https://script.google.com/macros/s/AKfycb_example-123/exec';
    expect(normalize(valid)).toBe(valid);
    for (const invalid of [
      'http://script.google.com/macros/s/AKfycb_example-123/exec',
      'https://script.googleusercontent.com/macros/s/AKfycb_example-123/exec',
      'https://script.google.com/macros/s/AKfycb_example-123/dev',
      'https://script.google.com/macros/s/AKfycb_example-123/exec?user=teacher',
      'https://script.google.com/macros/s/AKfycb_example-123/exec#record',
      'https://script.google.com/macros/s/AKfycb_example-123/exec/extra',
    ]) expect(normalize(invalid)).toBe('');
  });

  it('bundles the content-free email RPC into the generated repository bridge', () => {
    const builder = readFileSync(resolve(process.cwd(), '_build_educator_evaluation_apps_script.js'), 'utf8');
    const portal = readFileSync(resolve(process.cwd(), 'apps_script/educator_evaluation/Portal.html'), 'utf8');
    expect(builder).toContain('sendNotification: sendPortalNotification');
    expect(builder).toContain('.sendPortalNotification(request)');
    expect(portal).toContain('sendPortalNotification');
    expect(portal).toContain('__alloEvaluationRepository');
  });

  it('renders the connected principal experience and routes connect/open/disconnect actions', () => {
    const open = vi.fn();
    const save = vi.fn((value) => ({ ok: true, url: value, connected: !!value }));
    const url = 'https://script.google.com/macros/s/AKfycb_example-123/exec';
    const container = mount({
      t: () => '',
      studentProjectSettings: {},
      setStudentProjectSettings: vi.fn(),
      isTeacherMode: true,
      handleSetIsProjectSettingsOpenToFalse: vi.fn(),
      onOpenPrincipalEvaluation: open,
      evaluationPortalUrl: url,
      isEvaluationPortalConnected: true,
      onSaveEvaluationPortalUrl: save,
    });

    expect(container.textContent).toContain('District portal connected');
    expect(container.querySelector('#principal-evaluation-portal-url').value).toBe(url);
    expect(button(container, 'Open district portal')).toBeTruthy();
    expect(container.textContent).toContain('Portal QR code');
    act(() => button(container, 'Open district portal').click());
    expect(open).toHaveBeenCalledOnce();
    act(() => button(container, 'Update connection').click());
    expect(save).toHaveBeenCalledWith(url);
    act(() => button(container, 'Disconnect').click());
    expect(save).toHaveBeenCalledWith('');
  });

  it('labels the unconfigured fallback as a demonstration, not a ready personnel tool', () => {
    const container = mount({
      t: () => '', studentProjectSettings: {}, setStudentProjectSettings: vi.fn(), isTeacherMode: true,
      handleSetIsProjectSettingsOpenToFalse: vi.fn(), onOpenPrincipalEvaluation: vi.fn(),
      evaluationPortalUrl: '', isEvaluationPortalConnected: false, onSaveEvaluationPortalUrl: vi.fn(),
    });
    expect(container.textContent).toContain('Demonstration only, not connected');
    expect(container.textContent).toContain('is not a personnel record');
    expect(button(container, 'Open the demonstration')).toBeTruthy();
  });
});
