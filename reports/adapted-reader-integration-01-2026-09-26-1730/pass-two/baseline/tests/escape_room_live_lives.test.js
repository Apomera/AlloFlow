import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const read = relativePath => fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8');

const escapeSources = [
  read('escape_room_module.js'),
  read('desktop/web-app/public/escape_room_module.js')
];

const teacherSources = [
  read('teacher_source.jsx'),
  read('teacher_module.js'),
  read('desktop/web-app/public/teacher_module.js')
];

describe('live Escape Room life handling', () => {
  it('starts every live team with a complete three-life attempt state', () => {
    for (const source of escapeSources) {
      expect(source).toContain('var createLiveTeamProgress = function()');
      expect(source).toContain('lives: 3');
      expect(source).toContain('maxLives: 3');
      expect(source).toContain('wrongAttempts: 0');
      expect(source).toContain('isGameOver: false');
      expect(source).toContain('Red: createLiveTeamProgress()');
      expect(source).toContain('Yellow: createLiveTeamProgress()');
    }
  });

  it('treats missing legacy life state as full instead of zero', () => {
    for (const source of teacherSources) {
      expect(source).toMatch(/teamMaxLives\s*=\s*Number\.isFinite\(teamProgress\.maxLives\)\s*\?\s*teamProgress\.maxLives\s*:\s*3/);
      expect(source).toMatch(/teamLives\s*=\s*Number\.isFinite\(teamProgress\.lives\)\s*\?\s*teamProgress\.lives\s*:\s*teamMaxLives/);
      expect(source).not.toContain('const currentLives = escapeState.lives || 0');
    }
  });

  it('stores attempt state under the team progress surface allowed by Firestore rules', () => {
    const source = teacherSources[0];
    expect(source).toContain('escapeRoomState.teamProgress.${userTeam}.lives');
    expect(source).toContain('escapeRoomState.teamProgress.${userTeam}.wrongAttempts');
    expect(source).toContain('escapeRoomState.teamProgress.${userTeam}.isGameOver');
    expect(source).toContain('escapeRoomState.teamProgress.${userTeam}.streak');
    expect(source).toContain('escapeRoomState.teamProgress.${userTeam}.hintsRemaining');
    expect(source).not.toContain('[`escapeRoomState.lives`]');
    expect(source).not.toContain('[`escapeRoomState.wrongAttempts`]');
  });

  it('keeps checked-in runtime mirrors synchronized', () => {
    expect(escapeSources[1]).toBe(escapeSources[0]);
    expect(teacherSources[2]).toBe(teacherSources[1]);
  });
});
