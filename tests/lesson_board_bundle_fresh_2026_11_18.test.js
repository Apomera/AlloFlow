import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';

// 2026-11-18: lesson_board_module.js (and its public/ copy) must match a fresh build of
// lesson_board_source.jsx. It also bundles shared files such as
// connected_escape_room_accessibility.jsx, so an edit there needs a board rebuild too.
// On 2026-11-15 a shared dialog focus fix reached the Escape Room but not the board,
// because nothing checked this. Fix a failure with: node _build_lesson_board_module.js
describe('Lesson Board bundle', () => {
  it('matches its source', () => {
    const out = execFileSync(process.execPath, ['_build_lesson_board_module.js', '--check'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    expect(out).toMatch(/Lesson board bundles match source/);
  }, 120000);
});
