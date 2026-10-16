import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';
import { parse } from '@babel/parser';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
const React = require(resolve(modules, 'react'));
const { createRoot } = require(resolve(modules, 'react-dom/client'));
const { act } = require(resolve(modules, 'react-dom/test-utils'));
const compile = (source, name) => new Function('React', 'window', transformSync(source, {
  plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false,
}).code + `\nreturn ${name};`)(React, window);
const TeacherHistoryTab = compile(readFileSync('view_teacher_history_tab_source.jsx', 'utf8'), 'TeacherHistoryTab');
const SidebarTabsNav = compile(readFileSync('view_sidebar_tabs_nav_source.jsx', 'utf8'), 'SidebarTabsNav');
const FabStack = compile(readFileSync('view_fab_stack_source.jsx', 'utf8'), 'FabStack');
const header = readFileSync('view_header_source.jsx', 'utf8');
const headerAst = parse(header, { sourceType: 'script', plugins: ['jsx'] });
const headerFunction = headerAst.program.body.find(node => node.type === 'FunctionDeclaration' && node.id.name === 'HeaderBar');
const homeNames = new Set(['homeBehaviorToolsAvailable', 'homeToolsText', 'homeBehaviorToolsLabel', 'homeBehaviorToolsTooltip', 'openHomeBehaviorTools']);
const homeDeclarations = headerFunction.body.body.filter(node => node.type === 'VariableDeclaration' && node.declarations.some(item => homeNames.has(item.id.name)));
const roleControls = [];
function visit(node) {
  if (!node || typeof node !== 'object') return;
  if (node.type === 'LogicalExpression' && node.right?.type === 'JSXElement') {
    const help = node.right.openingElement.attributes.find(attr => attr.name?.name === 'data-help-key')?.value?.value;
    if (help === 'header_home_behavior_tools' || help === 'header_educator_hub') roleControls.push(node);
  }
  for (const [key, value] of Object.entries(node)) {
    if (['start', 'end', 'loc'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === 'object') visit(value);
  }
}
visit(headerFunction);
const HeaderRoleControls = compile(`function HeaderRoleControls(props) {
  const { isTeacherMode, isParentMode, isIndependentMode, setShowBehaviorLens, setShowEducatorHub, t } = props;
  const Heart = () => null, GraduationCap = () => null;
  const APP_CONFIG = {}, setPendingRole = () => {}, setIsGateOpen = () => {};
  ${homeDeclarations.map(node => header.slice(node.start, node.end)).join('\n')}
  return <>${roleControls.map(node => `{${header.slice(node.start, node.end)}}`).join('')}</>;
}`, 'HeaderRoleControls');

let container;
let root;
let previousHistory;
const translate = key => key;
const noop = () => {};
const render = async (Component, props) => act(async () => root.render(React.createElement(Component, props)));
const click = async element => act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })));
const change = async (element, value) => act(async () => {
  const prototype = element.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
  element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
});
const submit = async () => act(async () => container.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
const groupProps = overrides => ({
  rosterKey: { classId: 'class-one', groups: {} },
  handleApplyRosterGroup: vi.fn(), hasSourceOrAnalysis: false,
  setIsRosterKeyOpen: vi.fn(), onDifferentiateByGroup: vi.fn(),
  onQuickAddGroup: vi.fn(() => 'added'),
  gradeOptions: ['Kindergarten', 'Adult'], languageOptions: ['English', 'Ukrainian'],
  defaultGrade: 'Adult', defaultLanguage: 'Ukrainian', t: translate,
  ...overrides,
});

beforeEach(() => {
  globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  previousHistory = window.History;
  window.History = () => null;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.History = previousHistory;
});

describe('optional class groups', () => {
  it('keeps setup collapsed and the complete roster available', async () => {
    const props = groupProps();
    await render(TeacherHistoryTab, props);
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('[aria-controls="roster-quick-group-form"]').getAttribute('aria-expanded')).toBe('false');
    await click(container.querySelector('[data-help-key="roster_manage_button"]'));
    expect(props.setIsRosterKeyOpen).toHaveBeenCalledWith(true);
  });

  it('uses supplied canonical options and adds without applying group settings', async () => {
    const props = groupProps();
    await render(TeacherHistoryTab, props);
    await click(container.querySelector('[aria-controls="roster-quick-group-form"]'));
    const input = container.querySelector('input');
    expect(document.activeElement).toBe(input);
    const [grade, language] = container.querySelectorAll('select');
    expect([...grade.options].map(option => option.value)).toEqual(props.gradeOptions);
    expect([...language.options].map(option => option.value)).toEqual(props.languageOptions);
    expect(grade.value).toBe('Adult');
    expect(language.value).toBe('Ukrainian');
    await change(input, '  Reading group  ');
    await submit();
    expect(props.onQuickAddGroup).toHaveBeenCalledExactlyOnceWith('Reading group', 'Adult', 'Ukrainian');
    expect(props.handleApplyRosterGroup).not.toHaveBeenCalled();
    expect(container.querySelector('form')).toBeNull();
    expect(container.querySelector('[role="status"]').textContent).toBe('Group added.');
    expect(document.activeElement).toBe(container.querySelector('[aria-controls="roster-quick-group-form"]'));
  });

  it.each(['duplicate', 'limit', 'unavailable'])('preserves the draft on %s', async result => {
    const props = groupProps({ onQuickAddGroup: vi.fn(() => result) });
    await render(TeacherHistoryTab, props);
    await click(container.querySelector('[aria-controls="roster-quick-group-form"]'));
    await change(container.querySelector('input'), 'Reading group');
    await submit();
    expect(container.querySelector('input').value).toBe('Reading group');
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
    expect(container.querySelector('form')).not.toBeNull();
  });

  it('waits for the durable quick-group save and prevents duplicate submissions', async () => {
    let finish;
    const props = groupProps({ onQuickAddGroup: vi.fn(() => new Promise(resolve => { finish = resolve; })) });
    await render(TeacherHistoryTab, props);
    await click(container.querySelector('[aria-controls="roster-quick-group-form"]'));
    await change(container.querySelector('input'), 'Reading group');
    await submit();
    expect(container.querySelector('form').getAttribute('aria-busy')).toBe('true');
    expect(container.querySelector('button[type="submit"]').disabled).toBe(true);
    expect(container.querySelector('input').value).toBe('Reading group');
    await submit();
    expect(props.onQuickAddGroup).toHaveBeenCalledTimes(1);
    await act(async () => finish('unavailable'));
    expect(container.querySelector('input').value).toBe('Reading group');
    expect(container.querySelector('button[type="submit"]').disabled).toBe(false);
    expect(container.querySelector('[role="alert"]')).not.toBeNull();
  });

  it('ignores an old save result after switching classes', async () => {
    let finish;
    const props = groupProps({ onQuickAddGroup: vi.fn(() => new Promise(resolve => { finish = resolve; })) });
    await render(TeacherHistoryTab, props);
    await click(container.querySelector('[aria-controls="roster-quick-group-form"]'));
    await change(container.querySelector('input'), 'Old class group');
    await submit();
    await render(TeacherHistoryTab, { ...props, rosterKey: { classId: 'class-two', groups: {} } });
    await act(async () => finish('added'));
    expect(container.querySelector('form')).toBeNull();
    expect(container.textContent).not.toContain('Group added.');
  });

  it('rejects blank names before calling the host', async () => {
    const props = groupProps();
    await render(TeacherHistoryTab, props);
    await click(container.querySelector('[aria-controls="roster-quick-group-form"]'));
    await submit();
    expect(props.onQuickAddGroup).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]').textContent).toBe('Enter a group name.');
  });

  it('does not carry a draft into another class', async () => {
    const props = groupProps();
    await render(TeacherHistoryTab, props);
    await click(container.querySelector('[aria-controls="roster-quick-group-form"]'));
    await change(container.querySelector('input'), 'Unsaved group');
    await render(TeacherHistoryTab, { ...props, rosterKey: { classId: 'class-two', groups: {} } });
    expect(container.querySelector('form')).toBeNull();
    await click(container.querySelector('[aria-controls="roster-quick-group-form"]'));
    expect(container.querySelector('input').value).toBe('');
    expect(props.onQuickAddGroup).not.toHaveBeenCalled();
  });

  it('falls back to roster management until canonical choices are available', async () => {
    await render(TeacherHistoryTab, groupProps({ gradeOptions: [] }));
    expect(container.querySelector('[aria-controls="roster-quick-group-form"]')).toBeNull();
    expect(container.querySelector('[data-help-key="roster_manage_button"]')).not.toBeNull();
  });

  it('translates canonical grade and English labels without changing their saved values', async () => {
    const translated = { 'grades.k': 'Maternelle', 'grades.g5': 'Cinquieme', 'grades.college': 'Universite', 'grades.grad': 'Cycle superieur', 'languages.english': 'Anglais' };
    await render(TeacherHistoryTab, groupProps({ gradeOptions: ['Kindergarten', '5th Grade', 'College', 'Graduate Level'], t: key => translated[key] || key }));
    await click(container.querySelector('[aria-controls="roster-quick-group-form"]'));
    const [grade, language] = container.querySelectorAll('select');
    expect([...grade.options].map(option => [option.value, option.textContent])).toEqual([
      ['Kindergarten', 'Maternelle'], ['5th Grade', 'Cinquieme'], ['College', 'Universite'], ['Graduate Level', 'Cycle superieur'],
    ]);
    expect(language.options[0].value).toBe('English');
    expect(language.options[0].textContent).toBe('Anglais');
    expect(language.options[1].textContent).toBe('Ukrainian');
  });
});

describe('role-aware materials tabs', () => {
  it.each([
    [{ isTeacherMode: true }, 'Class & Materials'],
    [{ isTeacherMode: true, isParentMode: true }, 'Materials'],
    [{ isTeacherMode: true, isIndependentMode: true }, 'My Resources'],
    [{ isTeacherMode: false }, 'My Resources'],
  ])('labels the destination without changing its tab identity', async (role, expected) => {
    const setTab = vi.fn();
    const pulse = vi.fn();
    await render(SidebarTabsNav, { ...role, activeSidebarTab: 'create', handleSetActiveSidebarTabToCreate: noop, setActiveSidebarTab: setTab, setIsHistoryPulsing: pulse, t: translate });
    const create = container.querySelector('#tab-create');
    const materials = container.querySelector('#tab-history');
    expect(materials.textContent.trim()).toBe(expected);
    expect(materials.getAttribute('aria-controls')).toBe('sidebar-history-panel');
    create.focus();
    await act(async () => create.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })));
    expect(document.activeElement).toBe(materials);
    expect(setTab).not.toHaveBeenCalled();
    await click(materials);
    expect(setTab).toHaveBeenCalledWith('history');
    expect(pulse).toHaveBeenCalledWith(false);
  });
});

describe('Family and educator header controls', () => {
  it('offers direct Family supports in the adult view, not the clinical hub', async () => {
    const open = vi.fn();
    await render(HeaderRoleControls, { isTeacherMode: true, isParentMode: true, setShowBehaviorLens: open, t: translate });
    expect(container.querySelectorAll('[data-help-key="header_home_behavior_tools"]')).toHaveLength(2);
    expect(container.querySelector('[data-help-key="header_educator_hub"]')).toBeNull();
    await click(container.querySelector('[data-help-key="header_home_behavior_tools"]'));
    expect(open).toHaveBeenCalledWith(true);
  });

  it.each([
    { isTeacherMode: false, isParentMode: true },
    { isTeacherMode: true, isIndependentMode: true },
    { isTeacherMode: true, isParentMode: true, setShowBehaviorLens: undefined },
  ])('does not expose adult Family actions in unavailable views', async role => {
    await render(HeaderRoleControls, { setShowBehaviorLens: vi.fn(), ...role, t: translate });
    expect(container.querySelector('button')).toBeNull();
  });

  it('keeps the labeled educator hub for teachers', async () => {
    const open = vi.fn();
    await render(HeaderRoleControls, { isTeacherMode: true, setShowEducatorHub: open, t: translate });
    const buttons = container.querySelectorAll('[data-help-key="header_educator_hub"]');
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toBe('Educator tools');
    await click(buttons[0]);
    expect(open).toHaveBeenCalledWith(true);
  });
});

describe('role-aware reading tools', () => {
  it.each([true, false])('keeps the launcher and dialog names aligned for adult=%s', async isTeacherMode => {
    await render(FabStack, {
      isTeacherMode, isFabExpanded: true, activeView: 'dashboard', studentProjectSettings: {},
      interactionMode: 'read', t: translate, handleToggleIsFabExpanded: noop,
    });
    const launcher = container.querySelector('[data-help-key="fab_toggle"]');
    const title = container.querySelector('#alloflow-student-tools-title');
    expect(title.textContent).toBe(isTeacherMode ? 'Reading tools' : 'Student tools');
    expect(launcher.textContent).toContain(title.textContent);
    expect(launcher.getAttribute('aria-label')).toBe(isTeacherMode ? 'Close reading tools' : 'toolbar.student_tools_close');
    expect(container.querySelector('.alloflow-student-tools-close').getAttribute('aria-label')).toBe(launcher.getAttribute('aria-label'));
  });
});
