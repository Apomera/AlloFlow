import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sourcePath = 'view_renderers_source.jsx';
const modulePaths = ['view_renderers_module.js', 'desktop/web-app/public/view_renderers_module.js'];

describe('Memory Palace and 3D Concept Space live remote stop', () => {
  it('clears the shared organizer arm when the teacher exits either 3D activity', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const palace = source.slice(source.indexOf('onRecallClose={() =>'), source.indexOf('onRecallClose={() =>') + 320);
    const concept = source.slice(source.indexOf('onChallengeClose={() =>'), source.indexOf('onChallengeClose={() =>') + 340);
    for (const block of [palace, concept]) {
      expect(block).toContain('if (isTeacherMode) _broadcastInteractiveOrganizer(null)');
      expect(block).not.toContain('if (!isTeacherMode');
    }
  });

  it('keeps both generated renderer mirrors synchronized with the source behavior', () => {
    const root = readFileSync(modulePaths[0], 'utf8');
    expect(readFileSync(modulePaths[1], 'utf8')).toBe(root);
    expect(root.match(/if \(isTeacherMode\) _broadcastInteractiveOrganizer\(null\);/g)).toHaveLength(2);
  });
});
