import { describe, it, expect, beforeAll } from 'vitest';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let M;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('allohaven_module.js');
  M = window.AlloModules.AlloHavenInternals;
  if (!M || !M.buildIdeaSeedFromMemory || !M.waterIdeaSeed) {
    throw new Error('AlloHavenInternals seam missing Idea Garden helpers');
  }
});

describe('AlloHaven Idea Garden helpers', () => {
  it('plants a deterministic idea seed from flashcard memory text', () => {
    const seed = M.buildIdeaSeedFromMemory({
      templateLabel: 'Solar poster',
      linkedContent: {
        type: 'flashcards',
        data: {
          cards: [
            { front: 'Photosynthesis', back: 'Plants turn sunlight into stored energy' },
          ],
        },
      },
    }, '2026-04-10T09:00:00.000Z');

    expect(seed).toMatchObject({
      schemaVersion: 1,
      title: 'Photosynthesis',
      sourceType: 'flashcards',
      plantedAt: '2026-04-10T09:00:00.000Z',
      waterCount: 0,
      generatedBy: 'local-memory',
    });
    expect(seed.question).toContain('Photosynthesis');
  });

  it('strips cloze braces before creating an idea from notes', () => {
    const seed = M.buildIdeaSeedFromMemory({
      linkedContent: {
        type: 'notes',
        data: { text: 'The mitochondria is the {powerhouse} of the cell.' },
      },
    }, '2026-04-10T09:00:00.000Z');

    expect(seed.title).toBe('The mitochondria is the powerhouse of the...');
    expect(seed.question).not.toContain('{powerhouse}');
  });

  it('maps reviews and best score into stable growth stages', () => {
    const seed = { title: 'Cell energy', waterCount: 0 };

    expect(M.getIdeaGrowthStage({ ideaSeed: seed, reviewCount: 0, bestQuizScore: 0 })).toMatchObject({ id: 'seed', pct: 15 });
    expect(M.getIdeaGrowthStage({ ideaSeed: seed, reviewCount: 1, bestQuizScore: 40 })).toMatchObject({ id: 'sprout', pct: 40 });
    expect(M.getIdeaGrowthStage({ ideaSeed: seed, reviewCount: 2, bestQuizScore: 70 })).toMatchObject({ id: 'leaf', pct: 70 });
    expect(M.getIdeaGrowthStage({ ideaSeed: seed, reviewCount: 3, bestQuizScore: 85 })).toMatchObject({ id: 'bloom', pct: 100 });
  });

  it('waters existing seeds immutably and plants a seed for legacy decks', () => {
    const content = {
      type: 'flashcards',
      data: { cards: [{ front: 'Evaporation', back: 'Liquid water becomes vapor' }] },
      reviewCount: 1,
      bestQuizScore: 75,
      ideaSeed: {
        title: 'Evaporation',
        question: 'How does "Evaporation" connect to what I already know?',
        waterCount: 1,
        lastWateredAt: null,
      },
    };
    const watered = M.waterIdeaSeed(content, null, '2026-04-10T10:00:00.000Z');

    expect(watered).not.toBe(content);
    expect(watered.ideaSeed.waterCount).toBe(2);
    expect(watered.ideaSeed.lastWateredAt).toBe('2026-04-10T10:00:00.000Z');
    expect(content.ideaSeed.waterCount).toBe(1);

    const legacy = M.waterIdeaSeed({
      type: 'acronym',
      data: { letters: 'PEMDAS', meanings: ['parentheses', 'exponents'] },
    }, { templateLabel: 'Math poster' }, '2026-04-10T11:00:00.000Z');
    expect(legacy.ideaSeed).toMatchObject({
      sourceType: 'acronym',
      waterCount: 1,
      lastWateredAt: '2026-04-10T11:00:00.000Z',
    });
  });
});
