import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const root = path.resolve(import.meta.dirname, '..');
const pack = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'early_childhood_5025_pack.json'), 'utf8'));
const library = JSON.parse(fs.readFileSync(path.join(root, 'test_prep', 'early_childhood_5025_learning_library.json'), 'utf8'));
const positionsBySkill = {
  'oral-language-emergent-literacy': [1,2,3,4,5,6,7,8],
  'phonological-phonics-word-reading': [9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,29],
  'comprehension-writing-literature': [28,30],
  'number-operations': [31,32,33,34,35,36,45,47,48,49,51,52,53,54],
  'measurement-data': [41,42,43,44,46,55],
  'geometry-reasoning': [37,38,39,40,50],
  'history-civics-culture': [56,57,59,60,64,65,67,68,69],
  'geography-economics-inquiry': [58,61,62,63,66],
  'physical-earth-science': [70,71,72,73,74,75,76,77,78,79],
  'life-science-engineering': [80,81,82,83],
  'health-physical-development': [84,85,86,87,88,89,90],
  'creative-performing-arts': [91,92,93,94,95,96,97,98,99,100],
};
const expectedSkill = new Map(Object.entries(positionsBySkill)
  .flatMap(([skill, positions]) => positions.map((position) => [position, skill])));

describe('Early Childhood 5025 EPPP-guided semantic QA', () => {
  it('maps every source question to its item-level concept chapter', () => {
    const skillById = Object.fromEntries(library.skills.map((skill) => [skill.id, skill]));
    for (const item of pack.items.slice(0, 200)) {
      const position = Number(item.id.match(/-(\d{3})$/)?.[1]);
      expect(item.skillIds).toEqual([expectedSkill.get(position)]);
      expect(item.chapterIds).toEqual([skillById[item.skillIds[0]].chapterId]);
      expect(skillById[item.skillIds[0]].domainId).toBe(item.domainId);
    }
  });

  it('removes the generic concept rationale and full-rationale feedback templates', () => {
    for (const item of pack.items.slice(0, 200)) {
      expect(item.rationale).not.toMatch(/^The correct response represents the central disciplinary idea/i);
      item.choiceRationales.forEach((feedback, index) => {
        if (index === item.answerIndex) return;
        expect(feedback.length).toBeGreaterThanOrEqual(80);
        expect(feedback).not.toContain(item.rationale);
      });
    }
  });

  it('asks the question answered by the phoneme-analysis key', () => {
    const item = pack.items.find((candidate) => candidate.id === 'ec5025-b1-026');
    expect(item.prompt).toMatch(/best instructional response/i);
    expect(item.choices[item.answerIndex]).toMatch(/phoneme segmentation/i);
  });
});
