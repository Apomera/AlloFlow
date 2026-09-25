// One "more room" control on the resource bar.
//
// WHY (2026-09-24 audit): the bar above every resource had both "Collapse
// header" and "Maximize", beside the reader's Focus view and the header's More /
// Less: four ways to get more room. Maximize now also compacts the bar, and the
// separate Collapse button is gone. Collapsing used to hide the teacher's
// annotation tools too; they now stay, including while maximized for
// presenting.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const hosts = { ANTI: readFileSync(process.env.ALLO_ANTI_CANDIDATE || 'AlloFlowANTI.txt', 'utf8'), 'App.jsx': readFileSync('desktop/web-app/src/App.jsx', 'utf8') };

describe.each(Object.entries(hosts))('%s', (_, source) => {
  it('has no separate Collapse header button', () => {
    expect(source).not.toContain('onClick={() => setIsOutputHeaderCollapsed(p => !p)}');
  });
  it('Maximize compacts the bar as it maximizes', () => {
    expect(source).toContain('onClick={() => { setIsOutputHeaderCollapsed(!isFullscreen); handleToggleIsFullscreen(); }}');
  });
  it('keeps the teacher annotation tools whatever the bar size', () => {
    expect(source).toContain('{isTeacherMode && generatedContent && (');
    expect(source).not.toContain('{isTeacherMode && generatedContent && !isOutputHeaderCollapsed && (');
  });
});
