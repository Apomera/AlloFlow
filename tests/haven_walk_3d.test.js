// Ring 0 of docs/allohaven_cozy_world_design.md — the AlloHaven 3D walk.
//
// Pins the PURE mapper buildHavenPalaceData (AlloHavenInternals seam): the
// existing 2D haven state (unlocked rooms, placed decorations, portfolio
// artifacts) → the memory-palace {main, branches} format, with the images map
// keyed by the palace's OWN locus ids. The id-alignment test loads the real
// memory_palace_module and proves every image key lands on a real locus —
// the contract that hangs decoration art in the right 3D frame.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
let H, MP;
beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  window.AlloIcons = new Proxy({}, { get: () => () => null });
  loadAlloModule('allohaven_module.js');
  H = window.AlloModules.AlloHavenInternals;
  if (!H || !H.buildHavenPalaceData) throw new Error('buildHavenPalaceData seam not present');
  delete window.AlloModules.MemoryPalace;
  // eslint-disable-next-line no-new-func
  new Function(readFileSync(resolve(process.cwd(), 'memory_palace_module.js'), 'utf8'))();
  MP = window.AlloModules.MemoryPalace;
});

function havenState() {
  return {
    rooms: [
      { id: 'main', label: 'My Room', icon: '🏠', unlocked: true },
      { id: 'garden', label: 'Garden', icon: '🌳', unlocked: true },
      { id: 'library', label: 'Library', icon: '📚', unlocked: false },   // locked ⇒ excluded
    ],
    decorations: [
      // floor item listed FIRST to prove wall-before-floor ordering
      { template: 'plants', templateLabel: 'Fern', placement: { roomId: 'main', surface: 'floor', cellIndex: 2 }, imageBase64: 'data:image/png;base64,FERN', studentReflection: 'My first plant!', linkedContent: { type: 'flashcards', data: { cards: [{ front: 'Photosynthesis', back: 'Plants turn light into chemical energy' }] } } },
      { template: 'poster', templateLabel: 'Star Poster', placement: { roomId: 'main', surface: 'wall', cellIndex: 0 }, imageBase64: 'data:image/png;base64,POSTER' },
      { template: 'lamp', placement: { roomId: 'garden', surface: 'floor', cellIndex: 1 }, aiRationale: 'Earned after five pomodoros', recipe3d: { name: 'Lamp', parts: [{ shape: 'cylinder', size: [0.1, 1], position: [0, 0.5, 0], color: '#f59e0b' }] } },
      { template: 'ghost', placement: null },                             // unplaced ⇒ excluded
      { template: 'lib-shelf', placement: { roomId: 'library', surface: 'wall', cellIndex: 0 } },   // locked room ⇒ excluded
    ],
  };
}

const ARTIFACTS = [
  { title: 'The Dragon Story', kindLabel: 'StoryForge Story', sourceLabel: 'StoryForge' },
  { kindLabel: 'SEL Share Packet', sourceLabel: 'SEL Hub' },
];

describe('buildHavenPalaceData (pure haven → palace mapper)', () => {
  it('maps unlocked rooms in order, wall slots before floor slots, and skips locked/unplaced', () => {
    const out = H.buildHavenPalaceData(havenState(), []);
    expect(out.data.main).toBe('My AlloHaven');
    expect(out.data.branches.map((b) => b.title)).toEqual(['🏠 My Room', '🌳 Garden']);
    expect(out.data.branches[0].items).toEqual(['Star Poster', 'Fern']);   // wall first, then floor
    expect(out.data.branches[0].mnemonics).toEqual(['', 'Remember: Photosynthesis - Plants turn light into chemical energy ? Anchor: My first plant!']);
    expect(out.data.branches[1].items).toEqual(['lamp']);                  // template fallback label
    expect(out.data.branches[1].mnemonics).toEqual(['Anchor: Earned after five pomodoros']);
  });

  it('keys decoration images AND recipe3d sculptures by the palace locus ids', () => {
    const out = H.buildHavenPalaceData(havenState(), []);
    expect(out.images).toEqual({
      b0_i0: 'data:image/png;base64,POSTER',   // Star Poster (wall, first)
      b0_i1: 'data:image/png;base64,FERN',     // Fern (floor, second)
    });
    expect(Object.keys(out.objects)).toEqual(['b1_i0']);   // the garden lamp's Prim3D recipe
    expect(out.objects.b1_i0.name).toBe('Lamp');
  });

  it('emits a signature-landmark seed per room, keyed by the palace room key', () => {
    const out = H.buildHavenPalaceData(havenState(), []);
    // two unlocked rooms → b0 (main) and b1 (garden); seeds are the room ids
    expect(out.landmarks).toEqual({ b0: 'main', b1: 'garden' });
  });

  it('appends a Gallery room from portfolio artifacts (capped at 12)', () => {
    const out = H.buildHavenPalaceData(havenState(), ARTIFACTS);
    const gallery = out.data.branches[out.data.branches.length - 1];
    expect(gallery.title).toBe('🖼 Gallery');
    expect(gallery.items).toEqual(['The Dragon Story', 'SEL Share Packet']);
    expect(gallery.mnemonics[0]).toBe('StoryForge Story — StoryForge');
    const many = Array.from({ length: 20 }, (_, i) => ({ title: 'A' + i, kindLabel: 'K' }));
    expect(H.buildHavenPalaceData({ rooms: [], decorations: [] }, many).data.branches[0].items.length).toBe(12);
  });

  it('survives an empty haven', () => {
    const out = H.buildHavenPalaceData({}, []);
    expect(out.data.branches).toEqual([]);
    expect(out.images).toEqual({});
  });

  it('ID ALIGNMENT: every image key is a real locus id in the rendered palace', () => {
    const out = H.buildHavenPalaceData(havenState(), ARTIFACTS);
    const palace = MP.buildPalace(out.data);
    const locusIds = new Set(palace.loci.map((l) => l.id));
    Object.keys(out.images).forEach((key) => expect(locusIds.has(key)).toBe(true));
    // and the walk route covers every placed decoration + artifact
    expect(palace.route.length).toBe(1 + 3 + 2);   // entry + 3 decorations + 2 artifacts
    // mnemonics travel into the palace (footer/aria announcements read them)
    const fern = palace.loci.find((l) => l.label === 'Fern');
    expect(fern.mnemonic).toContain('Remember: Photosynthesis');
    expect(fern.mnemonic).toContain('Anchor: My first plant!');
  });
});
