import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const source = fs.readFileSync('view_fab_stack_source.jsx', 'utf8');

describe('Floating student-tools stack accessibility', () => {
  it('exposes expansion and a named non-modal tools dialog', () => {
    expect(source).toContain('data-floating-control="fab-stack"');
    expect(source).toContain('aria-expanded={isFabExpanded}');
    expect(source).toContain('aria-controls="alloflow-student-tools-panel"');
    expect(source).toContain('aria-haspopup="dialog"');
    expect(source).toContain('id="alloflow-student-tools-panel"');
    expect(source).toContain('role="dialog"');
    expect(source).toContain('aria-labelledby="alloflow-student-tools-title"');
    expect(source).not.toContain('aria-modal="true"');
  });

  it('moves focus to the first available tool and returns it after close or Escape', () => {
    expect(source).toContain("panelRef.current?.querySelector('[data-student-tool=\"true\"]:not([disabled])')");
    expect(source).toContain('if (firstTool) firstTool.focus()');
    expect(source).toContain("if (event.key !== 'Escape') return");
    expect(source).toContain('onClick={closeStudentTools}');
    expect(source).toContain('handleToggleIsFabExpanded()');
    expect(source).toContain('window.setTimeout(() => toggleRef.current?.focus(), 0)');
  });

  it('groups labeled actions without changing the Guided Mode selectors', () => {
    expect(source).toContain('alloflow-student-tools-read-heading');
    expect(source).toContain('>Read</h3>');
    expect(source).toContain('alloflow-student-tools-focus-heading');
    expect(source).toContain('>Focus</h3>');
    expect(source).toContain('alloflow-student-tools-input-heading');
    expect(source).toContain('>Input &amp; practice</h3>');
    for (const helpKey of [
      'tool_read_mode', 'tool_define_mode', 'tool_explain_mode', 'tool_syntax_game',
      'fab_ruler', 'fab_timer', 'fab_focus', 'fab_line_focus', 'fab_dictation',
      'socratic_toggle', 'fab_toggle',
    ]) {
      expect(source).toContain(`data-help-key="${helpKey}"`);
    }
  });

  it('exposes active tool states and matches the visible Socratic label', () => {
    expect(source).toContain("aria-label={t('socratic.ask_for_help')}");
    expect(source).toContain('aria-pressed={showSocraticChat}');
    expect(source).toContain('aria-pressed={readingRuler}');
    expect(source).toContain('aria-pressed={isStudyTimerRunning}');
    expect(source).toContain('aria-pressed={focusMode}');
    expect(source).toContain('aria-pressed={showVisualSupports}');
    expect(source).toContain('aria-pressed={isLineFocusMode}');
    expect(source).toContain('aria-pressed={isDictationMode}');
  });

  it('reports the shared dictation engine, privacy boundary, and busy state', () => {
    expect(source).toContain('voice.isDictationSupported()');
    expect(source).toContain('data-dictation-engine');
    expect(source).toContain('dictationStatus.privacy');
    expect(source).toContain("role={dictationPhase === 'error' ? 'alert' : 'status'}");
    expect(source).toContain("aria-live={dictationPhase === 'error' ? 'assertive' : 'polite'}");
    expect(source).toContain('aria-atomic="true"');
    expect(source).toContain('dictationStatus && dictationAnnouncement');
    expect(source).toContain("dictationStatus?.message || (dictationPhase !== 'idle' ? dictationEngineLabel : '')");
    expect(source).toContain('aria-busy={dictationBusy}');
    expect(source).toContain("dictationPhase === 'transcribing'");
  });
  it('uses an anchored desktop popover and a narrow bottom sheet with touch-sized controls', () => {
    expect(source).toContain('{isFabExpanded && (');
    expect(source).toContain('position: absolute;');
    expect(source).toContain('bottom: 64px;');
    expect(source).toContain('@media (max-width: 767px)');
    expect(source).toContain('position: fixed !important;');
    expect(source).toContain('max-height: min(82dvh, 720px) !important;');
    expect(source).toContain('min-height: 44px;');
    expect(source).toContain('min-height: 48px;');
  });

  it('respects reduced motion and forced colors and hides decorative artwork', () => {
    expect(source).toContain('animate-pulse motion-reduce:animate-none');
    expect(source).toContain('slide-in-from-bottom-3 fade-in duration-200 motion-reduce:animate-none');
    expect(source).toContain('@media (prefers-reduced-motion: reduce)');
    expect(source).toContain('@media (forced-colors: active)');
    expect(source).toContain('forced-color-adjust: auto');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).toContain('motion-reduce:transform-none');
    expect(source).toContain("{'\\uD83D\\uDDBC\\uFE0F'}");
    expect(source.match(/aria-hidden="true"/g).length).toBeGreaterThanOrEqual(13);
  });

  it('keeps generated mirrors synchronized and passes the static audit', () => {
    expect(fs.readFileSync('desktop/web-app/public/view_fab_stack_module.js', 'utf8'))
      .toBe(fs.readFileSync('view_fab_stack_module.js', 'utf8'));
    const result = spawnSync(process.execPath, ['a11y-audit/static-audit.js', '--file', 'view_fab_stack_module.js'], {
      cwd: process.cwd(),
      encoding: 'utf8',
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/Total findings:\s+0/);
  });
});
