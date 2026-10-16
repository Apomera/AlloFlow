import { beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { transformSync } from '@babel/core';

const require = createRequire(import.meta.url);
const React = require(resolve('desktop/web-app/node_modules/react'));
const { renderToStaticMarkup } = require(resolve('desktop/web-app/node_modules/react-dom/server'));
const source = readFileSync('view_header_source.jsx', 'utf8').replace(/\r\n/g, '\n');
function between(start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  if (from < 0 || to <= from) throw new Error(`Missing header anchors: ${start} -> ${end}`);
  return source.slice(from, to);
}
const handlers = between('  const canUseTeacherGuidedMode =', '  const isDesktopBundledApp =');
const controls = between('{canUseTeacherGuidedMode && <>', '\n              </div>');
let Controls;
beforeAll(() => {
  const compiled = transformSync(`function Controls(props) {
    const { canUseTeacherGuidedMode, _guidedHasProgress, startGuidedModeFromHeader, restartGuidedModeFromHeader } = props;
    const t = () => '';
    const MapIcon = () => null;
    return <>${controls}</>;
  }`, { plugins: ['@babel/plugin-transform-react-jsx'], babelrc: false, configFile: false }).code;
  Controls = new Function('React', compiled + '\nreturn Controls;')(React);
});
function fixture(extra = {}) {
  const ctx = {
    isTeacherMode: true, isParentMode: false, isIndependentMode: false, isSpecialistMode: false,
    guidedStep: 0, guidedSelectedIds: null, guidedCompletedIds: [],
    resetGuidedProgress: vi.fn(), setGuidedSelectedIds: vi.fn(), setGuidedStep: vi.fn(),
    setGuidedMode: vi.fn(), setShowSetupPathMenu: vi.fn(), setShowWizard: vi.fn(), addToast: vi.fn(),
    t: () => '', ...extra,
  };
  const api = new Function(...Object.keys(ctx), handlers + '\nreturn { canUseTeacherGuidedMode, _guidedHasProgress, startGuidedModeFromHeader, restartGuidedModeFromHeader };')(...Object.values(ctx));
  const markup = renderToStaticMarkup(React.createElement(Controls, api));
  return { ctx, api, markup };
}

describe('header Guided entry belongs only to the ordinary Teacher workspace', () => {
  it.each([
    ['Family', { isParentMode: true }],
    ['self-study', { isIndependentMode: true }],
    ['Specialist', { isSpecialistMode: true }],
    ['Student', { isTeacherMode: false }],
  ])('hides both Guided actions and ignores stale direct callbacks in %s mode', (_, role) => {
    const { ctx, api, markup } = fixture({ ...role, guidedStep: 2, guidedSelectedIds: ['source-input', 'analysis'] });
    expect(api.canUseTeacherGuidedMode).toBe(false);
    expect(markup).not.toContain('header_guided_mode_start');
    expect(markup).not.toContain('Restart Guided Mode');
    api.startGuidedModeFromHeader(); api.restartGuidedModeFromHeader();
    for (const key of ['resetGuidedProgress', 'setGuidedSelectedIds', 'setGuidedStep', 'setGuidedMode', 'setShowSetupPathMenu', 'setShowWizard', 'addToast']) {
      expect(ctx[key], key).not.toHaveBeenCalled();
    }
  });
  it('allows a teacher to start a fresh Guided run', () => {
    const { ctx, api, markup } = fixture();
    expect(markup).toContain('header_guided_mode_start');
    expect(markup).not.toContain('Restart Guided Mode');
    api.startGuidedModeFromHeader();
    expect(ctx.resetGuidedProgress).toHaveBeenCalledTimes(1);
    expect(ctx.setGuidedMode).toHaveBeenCalledWith(true);
    expect(ctx.setShowSetupPathMenu).toHaveBeenCalledWith(false);
  });
  it('resumes teacher progress without resetting it and keeps restart explicit', () => {
    const { ctx, api, markup } = fixture({ guidedStep: 2, guidedSelectedIds: ['source-input', 'analysis'] });
    expect(markup).toContain('Resume Guided Mode');
    expect(markup).toContain('Restart Guided Mode from step 1');
    api.startGuidedModeFromHeader();
    expect(ctx.resetGuidedProgress).not.toHaveBeenCalled();
    expect(ctx.setGuidedMode).toHaveBeenCalledWith(true);
    api.restartGuidedModeFromHeader();
    expect(ctx.resetGuidedProgress).toHaveBeenCalledTimes(1);
  });
});
