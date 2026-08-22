import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const headerSource = readFileSync('view_header_source.jsx', 'utf8');
const headerModule = readFileSync('view_header_module.js', 'utf8');
const headerMirror = readFileSync('desktop/web-app/public/view_header_module.js', 'utf8');
const appSource = readFileSync('AlloFlowANTI.txt', 'utf8');
const appMirror = readFileSync('desktop/web-app/src/AlloFlowANTI.txt', 'utf8');
const ui = JSON.parse(readFileSync('ui_strings.js', 'utf8'));
const uiMirror = JSON.parse(readFileSync('desktop/web-app/public/ui_strings.js', 'utf8'));

function returnHandler(source) {
  const start = source.indexOf('const handleReturnToStart = () => {');
  const end = source.indexOf("// The chat's delivery path", start);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe('nondestructive header return to Start', () => {
  it('offers Back to Start beside the existing setup and Guided Mode paths', () => {
    const startButton = headerSource.indexOf('data-help-key="header_return_to_start"');
    const setupButton = headerSource.indexOf('data-help-key="header_quickstart_setup"', startButton);
    const guidedButton = headerSource.indexOf('data-help-key="header_guided_mode_start"', setupButton);

    expect(startButton).toBeGreaterThanOrEqual(0);
    expect(setupButton).toBeGreaterThan(startButton);
    expect(guidedButton).toBeGreaterThan(setupButton);
    expect(headerSource).toContain("t('toolbar.start_setup') || 'Start & setup'");
    expect(headerSource).toContain("t('toolbar.back_to_start') || 'Back to Start'");
    expect(headerSource).toContain('Your current workspace stays saved.');
  });

  it('closes the header dialog and delegates without navigating the document', () => {
    const start = headerSource.indexOf('const returnToStartFromHeader = () => {');
    const end = headerSource.indexOf('const openQuickStartSetup', start);
    const handler = headerSource.slice(start, end);

    expect(handler).toContain('setShowSetupPathMenu(false)');
    expect(handler).toContain("typeof onReturnToStart === 'function'");
    expect(handler).toContain('onReturnToStart()');
    expect(handler).not.toContain('location.reload');
    expect(handler.indexOf('setShowSetupPathMenu(false)')).toBeLessThan(handler.indexOf('onReturnToStart()'));
  });

  it.each([
    ['host source', appSource],
    ['desktop host mirror', appMirror],
  ])('%s releases voice, checkpoints Canvas, and opens LaunchPad', (_label, source) => {
    const handler = returnHandler(source);

    expect(handler).toContain('ctx.stopVoiceLoop()');
    expect(handler).toContain("voice.stopActiveVoiceSession('return-to-start')");
    expect(handler).toContain('window.AlloSpeechPlayer.stop()');
    expect(handler).toContain('canvasRecoveryImmediateSaveRef.current = true');
    expect(handler).toContain('setCanvasRecoveryRevision(value => value + 1)');
    expect(handler).toContain('setShellDeepLinkTool(null)');
    expect(handler).toContain('setHasSelectedMode(false)');
    expect(handler).not.toContain('location.reload');
    expect(source).toContain('onReturnToStart={handleReturnToStart}');
  });

  it('registers truthful copy and keeps the deploy registry synchronized', () => {
    expect(ui.toolbar).toMatchObject({
      start_setup: 'Start & setup',
      start_setup_aria: 'Open Start and setup options',
      start_setup_title: 'Start & setup',
      back_to_start: 'Back to Start',
    });
    expect(ui.toolbar.start_setup_desc).toContain('workspace stays saved');
    expect(ui.toolbar.back_to_start_desc).toContain('workspace stays saved');
    expect(uiMirror.toolbar).toMatchObject({
      start_setup: ui.toolbar.start_setup,
      back_to_start: ui.toolbar.back_to_start,
      back_to_start_desc: ui.toolbar.back_to_start_desc,
    });
  });

  it('ships the action in the generated header module and its deploy mirror', () => {
    expect(headerModule).toContain('returnToStartFromHeader');
    expect(headerModule).toContain('header_return_to_start');
    expect(headerModule).toContain('Back to Start');
    expect(headerMirror).toBe(headerModule);
  });
});
