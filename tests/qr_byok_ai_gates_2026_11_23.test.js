// A QR student session is not "AI off" by itself. The host sets
// window.__alloQrStudentMode = { ..., aiPolicy } and turns AI off through
// __alloStudentAiDisabled / _alloQrBlocked for 'off' and 'pending'. A teacher-authorized
// 'student-byok' session with a validated key must keep AI, so no gate may treat the
// presence of __alloQrStudentMode as a block. Hardening waves 11-21..11-23 added
// `!!window.__alloQrStudentMode` to these six gates; removed 11-23.

import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const FILES = [
  'allo_commands', 'allobot', 'games', 'generation_helpers',
  'research_lane_engineering', 'research_lane_humanities',
].flatMap((n) => [`${n}_source.jsx`, `${n}_module.js`, `desktop/web-app/public/${n}_module.js`]);

describe.each(FILES)('QR BYOK students keep AI: %s', (file) => {
  const code = fs.readFileSync(file, 'utf8');

  it('does not block AI on the mere presence of a QR session', () => {
    expect(code).not.toMatch(/!!\s*(?:window|_win)\.__alloQrStudentMode/);
    expect(code).not.toMatch(/\|\|\s*(?:window|_win)\.__alloQrStudentMode\s*(?:\)|\|\|)/);
  });

  it('still honours the real student AI switch', () => {
    expect(code).toMatch(/__alloStudentAiDisabled\s*===\s*true/);
  });
});
