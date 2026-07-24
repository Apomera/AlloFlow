import { describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const source = fs.readFileSync('view_fab_stack_source.jsx', 'utf8');

describe('Floating student-tools stack accessibility', () => {
  it('exposes expansion and a named tool group', () => {
    expect(source).toContain('aria-expanded={isFabExpanded}');
    expect(source).toContain('aria-controls="alloflow-student-tools-panel"');
    expect(source).toContain('id="alloflow-student-tools-panel"');
    expect(source).toContain('role="group"');
    expect(source).toContain('aria-label="Student tools"');
  });

  it('moves focus into the expanded group and returns it on Escape', () => {
    expect(source).toContain("panelRef.current?.querySelector('button:not([disabled])')");
    expect(source).toContain('if (firstTool) firstTool.focus()');
    expect(source).toContain("if (event.key !== 'Escape') return");
    expect(source).toContain('handleToggleIsFabExpanded()');
    expect(source).toContain('toggleRef.current?.focus()');
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
    expect(source).toContain('role="status"');
    expect(source).toContain('aria-busy={dictationBusy}');
    expect(source).toContain("dictationPhase === 'transcribing'");
  });
  it('respects reduced motion and hides decorative artwork', () => {
    expect(source).toContain('animate-pulse motion-reduce:animate-none');
    expect(source).toContain('slide-in-from-bottom-4 fade-in duration-200 motion-reduce:animate-none');
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
