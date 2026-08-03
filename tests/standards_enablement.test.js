// Enablement of the reviewed standards snapshots.
//
// Publishing a snapshot module is deliberately NOT enough to switch it on
// (LEARNING_COMMONS_SNAPSHOT_IMPORT.md); the host must load it. These pins
// cover the three loadModule lines AND the condition that made them safe to
// add: the multi-snapshot registry. They also pin the usage boundary in the
// resolver UI — the dataset manifest forbids presenting matches as official
// certification or using them for high-stakes decisions, and that constraint
// must be visible to the teacher, not recorded only in a JSON file.

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

let anti, sidebarSrc, sidebarModule;

beforeAll(() => {
  anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
  sidebarSrc = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_source.jsx'), 'utf8');
  sidebarModule = readFileSync(resolve(process.cwd(), 'view_sidebar_panels_module.js'), 'utf8');
});

describe('the host loads all three reviewed snapshots', () => {
  const SNAPSHOTS = [
    ['StandardsSnapshotMaScienceG5', 'standards_snapshots/ma-science-grade-5.js'],
    ['StandardsSnapshotCcssMath', 'standards_snapshots/ccss-math.js'],
    ['StandardsSnapshotCcssEla', 'standards_snapshots/ccss-ela.js'],
  ];

  for (const [name, path] of SNAPSHOTS) {
    it(`loads ${name}`, () => {
      const line = anti.split(/\r?\n/).find((l) => l.includes(`loadModule('${name}'`));
      expect(line, `${name} not loaded by the host`).toBeTruthy();
      expect(line).toContain(path);
      expect(line, 'cache-buster missing — a deploy could not invalidate it').toMatch(/\?v=/);
    });
  }

  it('the provider is loaded too (snapshots alone register nothing usable)', () => {
    expect(anti).toMatch(/loadModule\('StandardsProvider'/);
  });

  it('enablement rests on the multi-snapshot registry, which must still exist', () => {
    // If the registry ever regresses to a single slot, these three loads become
    // a race where network timing decides which standards exist.
    const provider = readFileSync(resolve(process.cwd(), 'standards_provider_module.js'), 'utf8');
    expect(provider).toContain('registeredSnapshots');
    expect(provider).toContain('drainInjectedSnapshots');
  });
});

describe('the usage boundary is visible in the resolver UI', () => {
  it('the source renders attribution plus the boundary sentence', () => {
    expect(sidebarSrc).toContain('not official certification, and not for grading, placement, or evaluation');
    expect(sidebarSrc).toContain('Learning Commons Knowledge Graph (CC BY 4.0)');
  });

  it('the boundary is body text, not a hover tooltip', () => {
    // A title= attribute is invisible on touch devices and to most screen
    // reader flows; the constraint has to survive as rendered text.
    const idx = sidebarSrc.indexOf('not official certification');
    const before = sidebarSrc.slice(Math.max(0, idx - 400), idx);
    expect(before).toContain('<p');
    expect(before).not.toMatch(/title=\{[^}]*$/);
  });

  it('the built module carries it (source was rebuilt, not just edited)', () => {
    expect(sidebarModule).toContain('not official certification, and not for grading, placement, or evaluation');
  });
});
