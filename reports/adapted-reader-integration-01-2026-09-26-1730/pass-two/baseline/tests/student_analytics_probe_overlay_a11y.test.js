import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const source = fs.readFileSync(path.join(root, 'student_analytics_module.js'), 'utf8');
const mirror = fs.readFileSync(path.join(root, 'desktop/web-app/public/student_analytics_module.js'), 'utf8');
const start = source.indexOf('var ProbeOverlay = function ProbeOverlay(props)');
const end = source.indexOf('// ── End Probe Overlay', start);
const overlay = source.slice(start, end);

describe('Student Analytics full-screen probe overlay', () => {
  it('keeps source and deploy mirror byte-identical', () => {
    expect(mirror).toBe(source);
  });

  it('names and focus-manages both countdown and assessment dialog phases', () => {
    expect(overlay).toContain("useStudentAnalyticsDialog(isActive ? (countdown > 0 ? 'countdown' : 'active') : false, onEndEarly)");
    expect(overlay).toContain("'aria-label': probeType + ' countdown'");
    expect(overlay).toContain("'aria-label': probeType + ' assessment'");
    expect(overlay.match(/tabIndex: -1/g)).toHaveLength(2);
  });

  it('announces the countdown and limits per-second timer announcements to low time', () => {
    expect(overlay).toContain("'aria-label': probeType + ' begins in ' + countdown");
    expect(overlay).toContain("'aria-live': isTimeLow ? 'polite' : 'off'");
    expect(overlay).toContain("'aria-atomic': 'true'");
  });

  it('exposes current values and text for both progress indicators', () => {
    expect(overlay).toContain("'aria-label': 'Probe time remaining'");
    expect(overlay).toContain("'aria-valuenow': Math.round(timerPct)");
    expect(overlay).toContain("'aria-valuetext': (timer || 0) + ' seconds remaining'");
    expect(overlay).toContain("'aria-label': 'Probe item progress'");
    expect(overlay).toContain("'aria-valuenow': progressPct");
    expect(overlay).toContain("'aria-valuetext': 'Item ' + Math.min(currentIndex + 1, totalItems) + ' of ' + totalItems");
  });
});
