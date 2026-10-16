import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const modules = resolve('desktop/web-app/node_modules');
let React, createRoot, act, LaunchPad;
const mounts = [];

beforeAll(() => {
  React = require(resolve(modules, 'react'));
  ({ createRoot } = require(resolve(modules, 'react-dom/client')));
  ({ act } = require(resolve(modules, 'react-dom/test-utils')));
  const { transformSync } = require('@babel/core');
  const code = transformSync(readFileSync('view_launch_pad_source.jsx', 'utf8'), {
    babelrc: false, configFile: false,
    plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  }).code;
  LaunchPad = new Function('Unplug', code + '\nreturn LaunchPadView;')(() => null);
  global.IS_REACT_ACT_ENVIRONMENT = true;
});

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  window.React = React;
  window.AlloLanguageContext = React.createContext({ currentUiLanguage: 'English' });
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
});

afterEach(() => {
  for (const { root, host } of mounts.splice(0)) {
    act(() => root.unmount());
    host.remove();
  }
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  localStorage.clear();
});

function mount(overrides = {}) {
  const props = {
    t: key => key, APP_CONFIG: {}, onChooseRole: vi.fn(),
    setHasSelectedMode: vi.fn(), setGuidedMode: vi.fn(), setHasSelectedRole: vi.fn(),
    setShowWizard: vi.fn(), setIsTeacherMode: vi.fn(), setShowLearningHub: vi.fn(),
    setShowEducatorHub: vi.fn(), setPendingRole: vi.fn(), setIsGateOpen: vi.fn(),
    setShowAIBackendModal: vi.fn(), ...overrides,
  };
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  mounts.push({ root, host });
  act(() => root.render(React.createElement(LaunchPad, props)));
  return { host, props, query: selector => host.querySelector(selector) };
}

function click(element) {
  expect(element).not.toBeNull();
  act(() => element.click());
  act(() => vi.advanceTimersByTime(40));
}

function type(input, value) {
  act(() => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
}

describe('role-first launch pathways', () => {
  it('names every role button and exposes independent learning without entering Student', () => {
    const b = mount();
    const doors = [...b.host.querySelectorAll('.lp-role-grid .lp-card')];
    expect(doors.map(button => b.query('#' + button.getAttribute('aria-labelledby')).textContent))
      .toEqual(['Teacher', 'Student', 'Family', 'Professional tools']);
    for (const button of doors) {
      expect(button.tagName).toBe('BUTTON');
      expect(button.type).toBe('button');
      for (const id of button.getAttribute('aria-describedby').split(' ')) expect(b.query('#' + id)).not.toBeNull();
    }
    expect(b.query('[data-pathway="adult"]').textContent).toBe('Learn independently');
    expect(b.query('.lp-choice-section')).toBeNull();
    expect(b.query('#launch-pad-student-panel')).toBeNull();
    expect(b.props.onChooseRole).not.toHaveBeenCalled();
  });

  it.each([
    [null, 'teacher', 'teacher_full'],
    ['full', 'teacher_full', 'teacher'],
    ['guided', 'teacher', 'teacher_full'],
  ])('uses the explicit teacher preference %s, with the other workspace available', (preference, primary, alternate) => {
    if (preference) localStorage.setItem('alloflow_teacher_workspace', preference);
    const b = mount();
    click(b.query('[data-pathway="teacher"]'));
    click(b.query('.lp-role-cell .lp-role-link'));
    expect(b.props.onChooseRole.mock.calls).toEqual([[primary, {}], [alternate, {}]]);
  });

  it.each([['family', 'family'], ['specialist', 'specialist'], ['adult', 'adult']])('dispatches %s through the host gate', (pathway, role) => {
    const b = mount();
    click(b.query('[data-pathway="' + pathway + '"]'));
    expect(b.props.onChooseRole).toHaveBeenCalledExactlyOnceWith(role, {});
    expect(b.props.setIsTeacherMode).not.toHaveBeenCalled();
  });

  it('joins only an explicit, exactly-five-character code and never silently truncates', () => {
    const b = mount();
    click(b.query('[data-pathway="student"]'));
    const input = b.query('#launch-pad-class-code');
    const join = b.query('button[type="submit"]');
    expect(document.activeElement).toBe(input);
    expect(b.query('[data-pathway="student"]').getAttribute('aria-expanded')).toBe('true');
    for (const invalid of ['ABC1', 'ABC123', 'ABC!1']) {
      type(input, invalid);
      expect(join.disabled).toBe(true);
      act(() => input.closest('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
      act(() => vi.advanceTimersByTime(40));
      expect(b.props.onChooseRole).not.toHaveBeenCalled();
    }
    type(input, ' ab-c12 ');
    expect(join.disabled).toBe(false);
    expect(b.props.onChooseRole).not.toHaveBeenCalled();
    click(join);
    expect(b.props.onChooseRole).toHaveBeenCalledExactlyOnceWith('student_code', { code: 'ABC12' });
  });

  it('dismisses Student with Escape and returns focus to its disclosure', () => {
    const b = mount();
    const student = b.query('[data-pathway="student"]');
    click(student);
    act(() => b.query('#launch-pad-class-code').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(b.query('#launch-pad-student-panel')).toBeNull();
    expect(student.getAttribute('aria-expanded')).toBe('false');
    expect(document.activeElement).toBe(student);
  });

  it('offers exploration without a class code', () => {
    const b = mount();
    click(b.query('[data-pathway="student"]'));
    click(b.query('.lp-student-option > button'));
    expect(b.props.onChooseRole).toHaveBeenCalledExactlyOnceWith('student_explore', {});
  });

  it('treats the previous role as a hint, never automatic navigation', () => {
    localStorage.setItem('alloflow_last_role', 'parent');
    const b = mount();
    expect(document.activeElement).toBe(b.query('[data-pathway="family"]'));
    expect(b.query('#launch-pad-family-last').textContent).toBe('Last time');
    expect(b.props.onChooseRole).not.toHaveBeenCalled();
    expect(b.query('[data-pathway="teacher"]')).not.toBeNull();
  });

  it('resumes only after an explicit action and identifies the saved workspace', () => {
    const onResumeWorkspace = vi.fn();
    const b = mount({ resumeWorkspace: { role: 'teacher', workspace: 'guided' }, onResumeWorkspace });
    const resume = b.query('.lp-resume');
    expect(b.query('#launch-pad-resume-workspace').textContent).toBe('Teacher - Guided Mode');
    expect(document.activeElement).toBe(resume);
    expect(onResumeWorkspace).not.toHaveBeenCalled();
    click(resume);
    expect(onResumeWorkspace).toHaveBeenCalledOnce();
    expect(b.props.onChooseRole).not.toHaveBeenCalled();
  });

  it.each(['student', 'constructor'])('does not expose unsupported remembered role %s as a resume action', role => {
    const b = mount({ resumeWorkspace: { role }, onResumeWorkspace: vi.fn() });
    expect(b.query('.lp-resume')).toBeNull();
  });

  it('keeps the coach interactive inside the pad while concealing background workspace', () => {
    const b = mount({ companion: React.createElement('button', { id: 'test-coach' }, 'Help') });
    const coach = b.query('#test-coach');
    expect(coach.closest('[data-alloflow-launch-pad]')).not.toBeNull();
    expect(coach.closest('[inert], [aria-hidden="true"]')).toBeNull();
    click(coach);
    expect(b.props.onChooseRole).not.toHaveBeenCalled();
  });

  it('survives unavailable preference storage without starting setup', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Storage denied'); });
    const b = mount();
    expect(b.query('[data-pathway="teacher"]')).not.toBeNull();
    expect(b.query('.lp-voice-disclosure').open).toBe(false);
    expect(b.query('#launch-pad-language-list')).toBeNull();
    expect(b.props.setShowAIBackendModal).not.toHaveBeenCalled();
    click(b.query('[data-pathway="teacher"]'));
    expect(b.props.onChooseRole).toHaveBeenCalledExactlyOnceWith('teacher', {});
  });

  it('retains the original native workspace choices for older hosts', () => {
    const b = mount({ onChooseRole: undefined });
    expect(b.host.querySelectorAll('.lp-card')).toHaveLength(4);
    expect(b.query('.lp-role-grid')).toBeNull();
    click(b.query('[data-pathway="guided"]'));
    expect(b.props.setHasSelectedMode).toHaveBeenCalledWith(true);
    expect(b.props.setGuidedMode).toHaveBeenCalledWith(true);
  });
});
