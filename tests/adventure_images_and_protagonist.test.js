// Adventure: scene art reaching students, and protagonist age (2026-09-17).
//
// Two unrelated defects, both fixed here.
//
// IMAGES. Glossary term images reached live-session and mailbox students;
// adventure scene art did not. Three independent breaks, each sufficient on its
// own — and none of them the Firestore size cap, since images are nulled before
// bytes are counted:
//   1. The asset uploader read item.data.sceneImage, but the writer stores the
//      live scene at item.data.snapshot.sceneImage, so no asset was ever made.
//   2. sanitizeHistoryForCloud rebuilt the adventure snapshot from an allowlist
//      that dropped sceneImage and currentScene outright, leaving nothing for a
//      downstream restorer to reattach.
//   3. The mailbox serializer restores images by KEY NAME from an allowlist of
//      ['image','imageUrl']. Glossary uses `image`; adventure uses `sceneImage`.
//
// PROTAGONIST AGE. Two copies of a grade->age map had drifted. One stopped at
// 8th Grade; the other keyed its adult entries on 'Higher Ed'/'Adult', which the
// grade dropdown never emits (it emits 'College'/'Graduate Level'). Every
// learner above 8th grade fell through to "young student"/"student".

import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const PNG = 'data:image/png;base64,' + 'A'.repeat(64);

describe('adventure scene art survives the trip to a student', () => {
  it('the sanitizer keeps the current scene and a slot for its art', () => {
    const sync = read('firestore_sync_module.js');
    const start = sync.indexOf("if (item.type === 'adventure' && item.data) {");
    const end = sync.indexOf("if (item.type === 'persona'", start);
    expect(start).toBeGreaterThan(-1);
    const branch = sync.slice(start, end);

    expect(branch, 'scene text must survive').toContain('currentScene: rest.snapshot.currentScene');
    // Nulled like every other binary, but the KEY must exist so the asset
    // restorer has somewhere to put the bytes back.
    expect(branch).toMatch(/sceneImage: null,\s*\n\s*\};/);
  });

  it('the asset uploader looks where the scene image actually lives', () => {
    const mse = read('module_scope_extras_module.js');
    expect(mse).toContain('processField(item.data.snapshot, "sceneImage"');
    expect(mse).toContain('restoreField(item.data.snapshot, "sceneImage")');
    // The legacy top-level read stays for older saved resources.
    expect(mse).toContain('processField(item.data, "sceneImage", seed)');
  });

  it('the host still writes the scene under data.snapshot', () => {
    // If this ever changes, the uploader path above silently goes stale again.
    expect(read('AlloFlowANTI.txt')).toMatch(/data: \{\s*\n\s*snapshot: adventureState\s*\n\s*\}/);
  });

  it('the mailbox serializer restores sceneImage, not only image/imageUrl', () => {
    const aac = read('live_aac_source.jsx');
    expect(aac).toContain("for (const key of ['image', 'imageUrl', 'sceneImage'])");
  });

  it('end to end: a sanitized adventure can be rehydrated with its art', () => {
    // Mirrors the two shipped steps: sanitize for the wire, then restore images
    // by key name from the original.
    const sanitize = (item) => {
      const { sceneImage, ...rest } = item.data;
      const snapshot = rest.snapshot ? {
        xp: rest.snapshot.xp,
        level: rest.snapshot.level,
        turnCount: rest.snapshot.turnCount,
        currentScene: rest.snapshot.currentScene,
        sceneImage: null,
      } : null;
      return { ...item, data: { ...rest, sceneImage: null, snapshot } };
    };
    const restore = (source, target, seen = new WeakSet()) => {
      if (!source || !target || typeof source !== 'object' || typeof target !== 'object' || seen.has(target)) return;
      seen.add(target);
      for (const key of ['image', 'imageUrl', 'sceneImage']) {
        if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
      }
      Object.keys(target).forEach((key) => restore(source[key], target[key], seen));
    };

    const raw = {
      type: 'adventure',
      data: { snapshot: { xp: 10, level: 2, turnCount: 3, currentScene: { text: 'A dark forest' }, sceneImage: PNG } },
    };
    const wire = sanitize(JSON.parse(JSON.stringify(raw)));
    expect(wire.data.snapshot.sceneImage, 'nothing large crosses the wire inline').toBeNull();

    restore(raw, wire);
    expect(wire.data.snapshot.currentScene.text).toBe('A dark forest');
    expect(wire.data.snapshot.sceneImage).toBe(PNG);
  });
});

describe('protagonist age', () => {
  // Load the shipped resolver rather than restating the table here, so the test
  // fails if the real mapping regresses.
  const resolver = () => {
    const src = read('adventure_handlers_source.jsx');
    const start = src.indexOf('const PROTAGONIST_AGE_BY_GRADE');
    const end = src.indexOf('const getAdventurePacing');
    expect(start, 'the shared resolver should exist').toBeGreaterThan(-1);
    expect(end).toBeGreaterThan(start);
    // eslint-disable-next-line no-new-func
    return new Function(src.slice(start, end) + '\nreturn resolveProtagonistAge;')();
  };

  it('keeps the existing behaviour for K-8', () => {
    const resolve = resolver();
    expect(resolve('auto', 'Kindergarten')).toBe('5 year old child');
    expect(resolve('auto', '5th Grade')).toBe('10 year old child');
    expect(resolve('auto', '8th Grade')).toBe('13 year old teen');
  });

  it('no longer calls a high-school learner a "young student"', () => {
    const resolve = resolver();
    expect(resolve('auto', '9th Grade')).toBe('14 year old teen');
    expect(resolve('auto', '12th Grade')).toBe('17 year old teen');
  });

  it('gives adult audiences an adult protagonist', () => {
    // These are the values the grade dropdown really emits. The old maps keyed
    // on 'Higher Ed'/'Adult', which nothing produces, so both fell through.
    const resolve = resolver();
    expect(resolve('auto', 'College')).toMatch(/adult/i);
    expect(resolve('auto', 'Graduate Level')).toMatch(/adult/i);
    expect(resolve('auto', 'College')).not.toMatch(/child|young student/i);
  });

  it('uses the real grade values the UI offers', () => {
    const wizard = read('quickstart_source.jsx');
    for (const grade of ['College', 'Graduate Level']) {
      expect(wizard, `${grade} should be a real option`).toContain(`value="${grade}"`);
    }
  });

  it('lets an explicit choice override the audience', () => {
    const resolve = resolver();
    expect(resolve('adult', '5th Grade')).toBe('adult');
    expect(resolve('older-adult', 'Kindergarten')).toBe('older adult');
    expect(resolve('child', 'Graduate Level')).toBe('child');
  });

  it('falls back to an adult, not a child, for an unknown grade', () => {
    expect(resolver()('auto', 'Something Unmapped')).toBe('adult');
  });

  it('is one resolver, not two drifting copies', () => {
    const session = read('adventure_session_handlers_source.jsx');
    expect(session).toContain('_advApi.resolveProtagonistAge(adventureProtagonistAge, gradeLevel)');
    // The old inline table must be gone from both files.
    expect(session).not.toContain("'Higher Ed': 'young adult student'");
    expect(read('adventure_handlers_source.jsx')).not.toContain("|| 'young student'");
  });

  it('tells the model the character age without changing reading level', () => {
    const handlers = read('adventure_handlers_source.jsx');
    const lines = handlers.split('\n').filter((l) => l.includes('PROTAGONIST: The student'));
    expect(lines.length, 'every prompt variant should carry it').toBe(3);
    expect(lines[0]).toMatch(/Reading level still follows the target audience/);
  });

  it('is offered in the adventure settings with Auto as the default', () => {
    const settings = read('view_adventure_settings_source.jsx');
    expect(settings).toContain("field('protagonist-age'");
    expect(settings).toContain("props.adventureProtagonistAge || 'auto'");
    expect(settings).toContain('setAdventureProtagonistAge');
    const strings = JSON.parse(read('ui_strings.js'));
    expect(strings.adventure.protagonist_age_label).toBeTruthy();
    expect(strings.adventure.protagonist_age_auto).toMatch(/auto/i);
  });

  it('defaults to auto in state, so existing adventures are unchanged', () => {
    expect(read('AlloFlowANTI.txt')).toContain("adventureProtagonistAge: 'auto',");
  });
});
