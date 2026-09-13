import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
const source = readFileSync('stem_lab/stem_tool_geometryworld.js', 'utf8');
const start = source.indexOf('  // ── Rich lesson generation helpers');
const end = source.indexOf('  // ── End rich lesson generation helpers', start);
const api = new Function(source.slice(start, end) + '\nreturn { geometryLessonDepth, geometryGeneratedLessonIssues };')();
function fixture() {
  const lesson = { title: 'Two workshops', description: 'Build and compare.', spawnPoint: [-3, 3, -3], objectives: ['Build one prism', 'Revise another prism'],
    ground: { xMin: -20, xMax: 20, zMin: -20, zMax: 20, y: 0, type: 'grass' },
    structures: [{ id: 'one', type: 'fill', x1: 0, y1: 1, z1: 7, x2: 2, y2: 2, z2: 8, block: 'brick' },
      { id: 'two', type: 'fill', x1: 6, y1: 1, z1: 7, x2: 8, y2: 2, z2: 8, block: 'wood' }],
    npcs: [{ name: 'Guide', position: [-1, 1, -1], dialogue: 'Welcome', question: null }], activities: [] };
  ['one', 'two'].forEach((id, i) => {
    lesson.npcs.push({ name: id, position: [i * 6, 1, 4], dialogue: 'Build twelve cubes.', question: { text: 'How many cubes?', choices: ['12', '6', '10'], correct: 0 } });
    lesson.activities.push({ id, title: id, npcName: id, position: [i * 6, 3, 3], structureIds: [id], challenge: 'Build a prism', hint: 'Count layers', successCriteria: 'Twelve cubes', reflection: 'Explain your method', estimatedMinutes: 6 });
  });
  return lesson;
}
const issues = lesson => api.geometryGeneratedLessonIssues(lesson, api.geometryLessonDepth(1), null);

describe('Generated world collision fidelity', () => {
  it('rejects two authored fills competing for the same block cells', () => {
    const lesson = fixture();
    Object.assign(lesson.structures[1], { x1: 2, x2: 4 });
    expect(issues(lesson).join(' ')).toContain('overlap');
    expect(lesson.structures).toHaveLength(2);
  });
  it('allows adjacent authored fills without incorrectly counting a shared face as overlap', () => {
    const lesson = fixture();
    Object.assign(lesson.structures[1], { x1: 3, x2: 5 });
    expect(issues(lesson)).toEqual([]);
  });
  it.each(['spawn', 'waypoint', 'NPC'])('rejects a %s embedded near the far edge of a unit cube', target => {
    const lesson = fixture();
    if (target === 'spawn') lesson.spawnPoint = [2.9, 3, 7.9];
    if (target === 'waypoint') lesson.activities[0].position = [2.9, 3, 7.9];
    if (target === 'NPC') lesson.npcs[1].position = [2.9, 1, 7.9];
    expect(issues(lesson).join(' ')).toMatch(/inside a structure|safe adjacent viewpoint|clear accessible ground/);
  });
  it('allows overlapping terrain paint without creating duplicate authored solids', () => {
    const lesson = fixture();
    for (let i = 0; i < 2; i++) lesson.structures.push({ id: 'path-' + i, type: 'fill', x1: -10, x2: 10, y1: 0, y2: 0, z1: 0, z2: 0, block: i ? 'stone' : 'brick', measurementLayer: 'ground' });
    expect(issues(lesson)).toEqual([]);
  });
});
