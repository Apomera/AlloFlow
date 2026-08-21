import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sourcePath = 'view_renderers_source.jsx';
const modulePaths = ['view_renderers_module.js', 'desktop/web-app/public/view_renderers_module.js'];

describe('Memory Palace and 3D Concept Space live remote stop', () => {
  it('keeps the shared organizer arm when the teacher closes a 3D preview', () => {
    const source = readFileSync(sourcePath, 'utf8');
    const palace = source.slice(source.indexOf('onRecallClose={() =>'), source.indexOf('onRecallClose={() =>') + 320);
    const concept = source.slice(source.indexOf('onChallengeClose={() =>'), source.indexOf('onChallengeClose={() =>') + 340);
    const conceptRecallAt = source.indexOf('onRecallClose={() =>', source.indexOf('onRecallClose={() =>') + 1);
    const conceptRecall = source.slice(conceptRecallAt, conceptRecallAt + 320);
    expect(palace).toContain("_closeLiveOrganizerPreview('palacerecall')");
    expect(concept).toContain("_closeLiveOrganizerPreview('strandchallenge3d')");
    expect(conceptRecall).toContain("_closeLiveOrganizerPreview('conceptrecall3d')");
    for (const block of [palace, concept, conceptRecall]) expect(block).not.toContain('_broadcastInteractiveOrganizer(null)');
    expect(source).toContain('Teacher preview closed. The activity is still live for students');
  });

  it('keeps both generated renderer mirrors synchronized with the source behavior', () => {
    const root = readFileSync(modulePaths[0], 'utf8');
    expect(readFileSync(modulePaths[1], 'utf8')).toBe(root);
    expect(root.match(/_closeLiveOrganizerPreview\("(?:palacerecall|strandchallenge3d|conceptrecall3d)"\)/g)).toHaveLength(3);
    expect(root).not.toContain('if (isTeacherMode) _broadcastInteractiveOrganizer(null);');
  });
});
