import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const anti = fs.readFileSync(path.join(ROOT, 'AlloFlowANTI.txt'), 'utf8');
const sessionModal = fs.readFileSync(path.join(ROOT, 'view_session_modal_source.jsx'), 'utf8');
const dockStart = anti.indexOf('{isTeacherMode && activeSessionCode && (() => {');
const dockEnd = anti.indexOf('{/* Live Polling Panels', dockStart);
const dock = anti.slice(dockStart, dockEnd > dockStart ? dockEnd : dockStart + 25000);

describe('Live Session presenter controls reuse existing capabilities', () => {
  it('opens the existing zen display instead of implementing another fullscreen surface', () => {
    expect(dock).toContain('handleSetIsZenModeToTrue();');
    expect(dock).toContain("t('live_dock.focus_display') || 'Focus display'");
    expect(anti).toContain('const handleSetIsZenModeToTrue = React.useCallback(() => setIsZenMode(true), []);');
    expect(anti).toContain('onClick={handleSetIsZenModeToFalse}');
    expect(dock).not.toContain('requestFullscreen');
    expect(dock).not.toContain('webkitRequestFullscreen');
  });

  it('opens the existing Study Timer and reads its existing countdown state', () => {
    expect(dock).toContain('handleSetShowStudyTimerModalToTrue();');
    expect(dock).toContain('formatTime(studyTimeLeft)');
    expect(anti).toContain('showStudyTimerModal && <StudyTimerModal');
    expect(dock).not.toContain('setInterval(');
    expect(dock).not.toContain('setStudyTimeLeft(');
  });

  it('keeps the session modal as the one join-code and QR projection surface', () => {
    expect(dock).toContain("setShowSessionModal(true);");
    expect(dock).toContain('Show session code and projection screen');
    expect(sessionModal).toContain("aria-label={isProjectionMode ? 'Exit projection mode' : 'Open projection mode'}");
  });

  it('does not offer focus display without a current rendered resource', () => {
    expect(dock).toContain('disabled={!generatedContent}');
    expect(dock).toContain("cursor:generatedContent?'pointer':'not-allowed'");
  });
});
