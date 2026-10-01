import { describe, expect, it } from 'vitest';
import fs from 'node:fs';

const paths = ['teacher_source.jsx', 'teacher_module.js', 'desktop/web-app/public/teacher_module.js'];
const files = paths.map(path => [path, fs.readFileSync(path, 'utf8')]);

describe('student Escape Room state announcements and focus', () => {
  it.each(files)('%s announces and focuses waiting and outcome states', (_path, source) => {
    expect(source).toContain('escapeStateScreenRef');
    expect(source).toContain('escape-room-game-over-title');
    expect(source).toContain('escape-room-game-over-description');
    expect(source).toContain('escape-room-escaped-title');
    expect(source).toContain('escape-room-escaped-description');
  });

  it.each(files)('%s exposes the active room as a named region and the pause layer as an alert dialog', (_path, source) => {
    expect(source).toContain('escape-room-active-title');
    expect(source).toContain('escape-room-paused-title');
    expect(source).toContain('escape-room-paused-description');
    expect(source).toContain('pauseDialogRef');
  });

  it('moves focus into state changes and back to the active room after resume', () => {
    const source = files[0][1];
    expect(source).toContain('escapeStateScreenRef.current?.focus()');
    expect(source).toContain('pauseDialogRef.current?.focus()');
    expect(source).toContain('escapeMainRef.current?.focus()');
    expect(source).toContain('wasPausedRef.current = isPaused');
  });

  it('announces team escape notifications and hides confetti from assistive technology', () => {
    const source = files[0][1];
    expect(source).toContain('role="status" aria-live="polite" aria-atomic="true" className="fixed bottom-6');
    expect(source).toContain('pointer-events-none z-[10001] overflow-hidden" aria-hidden="true"');
  });
});