// Students get one place to join and one place to save, load and submit.
//
// WHY (2026-09-24 audit): a student saw Join twice (the header button and a
// StudentJoinPanel in the sidebar) and Save/Load/Submit up to three times (the
// Save panel, the History "More actions" menu, a header Submit button). The
// copies were separate implementations. Now:
// - Join lives in the header only. Its label shows at every width, the dialog
//   says what the code is, and Continue stays off until the code has the 5
//   letters or digits the join handler accepts (_alloCleanLiveSessionCode).
//   Opening Join from the compact header no longer saves "expanded" for later.
// - Save, Load and Submit live in the student Save panel. Save is off until
//   there is work to save (it used to do nothing, silently). History keeps its
//   Load/Save items for teachers, who have no Save panel.
import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
const ReactDOMServer = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react-dom/server'));

const read = (file) => readFileSync(resolve(process.cwd(), file), 'utf8');
const header = read(process.env.ALLO_HEADER_CANDIDATE || 'view_header_source.jsx');
const history = read(process.env.ALLO_HISTORY_CANDIDATE || 'view_history_panel_source.jsx');
const hosts = { ANTI: read(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt'), 'App.jsx': read('desktop/web-app/src/App.jsx') };
const helpCopies = { root: read(process.env.ALLO_HELP_CANDIDATE || 'help_strings.js'), public: read('desktop/web-app/public/help_strings.js') };

let Panel;
beforeAll(() => {
  global.window = global.window || {};
  window.React = React;
  const stubIcon = (name) => function Icon() { return React.createElement('span', { 'data-icon': name }); };
  window.AlloIcons = ['Save', 'FolderOpen', 'Download', 'Send', 'MapIcon', 'CheckCircle2', 'Lock', 'RefreshCw', 'History', 'Sparkles', 'Wifi']
    .reduce((acc, name) => { acc[name] = stubIcon(name); return acc; }, {});
  new Function(read(process.env.ALLO_SAVE_PANEL_CANDIDATE || 'view_student_save_adventure_module.js'))();
  Panel = window.AlloModules.StudentSaveAdventurePanel.StudentSaveAdventurePanel;
});

const renderPanel = (props) => {
  const host = document.createElement('div');
  host.innerHTML = ReactDOMServer.renderToStaticMarkup(React.createElement(Panel, {
    activeSessionCode: null, globalPoints: 0, handleResumeAdventure() {}, handleSetShowSubmitModalToTrue() {},
    handleStartAdventure() {}, hasSavedAdventure: false, initiateSaveStudentProject() {}, isResumingAdventure: false,
    isSaveActionPulsing: false, projectFileInputRef: { current: null }, sessionData: null,
    studentProjectSettings: { adventureUnlockXP: 1 }, t: (key) => key, ...props,
  }));
  return host;
};
const saveButton = (props) => renderPanel(props).querySelector('[data-help-key="student_save_work"]');

describe('student Save panel', () => {
  it('turns Save off until there is work to save, and keeps it on for an older host', () => {
    expect(saveButton({ hasSaveableWork: false }).disabled).toBe(true);
    expect(saveButton({ hasSaveableWork: true }).disabled).toBe(false);
    expect(saveButton({}).disabled).toBe(false);
    expect(saveButton({ hasSaveableWork: false }).className).toContain('disabled:opacity-50');
  });

  it('names Submit by its visible text and gives every button a help entry', () => {
    const panel = renderPanel({ hasSaveableWork: true });
    const submit = panel.querySelector('[data-help-key="student_submit_work"]');
    expect(submit.hasAttribute('aria-label')).toBe(false);
    expect(submit.textContent.trim()).toBe('common.submit');
    const keys = [...panel.querySelectorAll('section button[data-help-key^="student_"]')].map((b) => b.getAttribute('data-help-key'));
    expect(keys).toEqual(['student_load_file', 'student_save_work', 'student_submit_work']);
    for (const [name, text] of Object.entries(helpCopies)) {
      const help = new Function('return ' + text.slice(text.indexOf('{')))();
      for (const key of keys) expect(typeof help[key], name + ' ' + key).toBe('string');
    }
  });

  it('is told by both hosts whether there is work, and the sidebar Join panel is gone', () => {
    for (const [name, source] of Object.entries(hosts)) {
      expect(source, name).toContain('<StudentSaveAdventurePanel activeSessionCode={activeSessionCode} hasSaveableWork={Array.isArray(history) && history.length > 0}');
      expect(source, name).not.toContain('<StudentJoinPanel');
    }
  });
});

describe('History menu', () => {
  it('keeps Load project and the student-file save for teachers only', () => {
    for (const key of ['history_load_project', 'history_save_student']) {
      const button = history.lastIndexOf('<button', history.indexOf('data-help-key="' + key + '"'));
      expect(history.slice(button - 80, button).trimEnd().endsWith('{isTeacherMode && ('), key).toBe(true);
    }
  });
});

describe('header Join', () => {
  it('has no student Submit button (Submit is in the Save panel)', () => {
    expect(header).not.toContain("t('header.submit_work')");
    expect(header).not.toContain('data-help-key="header_submit"');
  });

  it('shows the Join label at every width on both triggers', () => {
    expect(header.split("<span>{t('session.join')}</span>").length - 1).toBe(2);
    expect(header).not.toContain(`hidden lg:inline">{t('session.join')}`);
  });

  it('says what the code is and ties it to the code field', () => {
    expect(header).toContain(`<p id="header-join-instructions" className="text-xs text-slate-600">{t('session.join_instructions')}</p>`);
    const field = header.slice(header.indexOf('id="header-join-code"'), header.indexOf('/>', header.indexOf('id="header-join-code"')));
    expect(field).toContain('aria-describedby="header-join-instructions"');
  });

  it('enables Continue only for a code the join handler would accept', () => {
    const match = header.match(/data-header-join-submit\s+disabled=\{([^\n]+)\}\n/);
    expect(match).not.toBeNull();
    const isDisabled = new Function('joinCodeInput', 'return ' + match[1]);
    const anti = hosts.ANTI;
    const cleaner = anti.slice(anti.indexOf('function _alloCleanLiveSessionCode(value) {'), anti.indexOf('function _alloCleanQrAssignmentId'));
    const accepts = new Function(cleaner + '; return _alloCleanLiveSessionCode;')();
    for (const code of ['AB12C', 'ab12c', 'AB 1C', 'AB12', '', undefined, 'A-B1C', '12345']) {
      expect(isDisabled(code), String(code)).toBe(!accepts(code));
    }
  });

  it('opening Join from the compact header does not keep the header expanded after a reload', () => {
    const start = header.indexOf('const openJoinFromCompactHeader = () => {');
    const body = header.slice(start, header.indexOf('\n  };', start));
    expect(body).toContain('setHeaderCollapsed(false);');
    expect(body).not.toContain('localStorage');
  });
});

it('ships the built modules to the public copies', () => {
  for (const name of ['view_header_module.js', 'view_history_panel_module.js', 'view_student_save_adventure_module.js']) {
    expect(read(name) === read('desktop/web-app/public/' + name), name).toBe(true);
  }
  expect(read('view_header_module.js')).toContain('"data-header-join-submit": true');
  expect(read('view_student_save_adventure_module.js')).toContain('disabled: hasSaveableWork === false');
});
