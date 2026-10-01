import { beforeAll, describe, expect, it } from 'vitest';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadAlloModule } from './setup.js';

const require = createRequire(import.meta.url);
const appSource = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const teacherSource = readFileSync(resolve(process.cwd(), 'teacher_source.jsx'), 'utf8');
const headerSource = readFileSync(resolve(process.cwd(), 'view_header_source.jsx'), 'utf8');
let rosterIdentity;

beforeAll(() => {
  const React = require(resolve(process.cwd(), 'desktop/web-app/node_modules/react'));
  globalThis.React = window.React = React;
  loadAlloModule('teacher_module.js');
  rosterIdentity = window.AlloModules.RosterIdentityInternals;
});

describe('roster-backed reading preferences', () => {
  it('migrates codename-keyed preferences to stable learner IDs and normalizes preset IDs', () => {
    const migrated = rosterIdentity.ensureRosterIdentity({
      groups: {},
      students: { 'Calm Otter': '' },
      learnerIds: { 'Calm Otter': 'LRN-calm-otter' },
      learnerPreferences: {
        'Calm Otter': {
          readingTheme: 'warm',
          favoriteReadingThemes: ['warm', 'not-a-theme', 'warm', 'dim'],
          privateReason: 'must not persist',
        },
      },
    });

    expect(migrated.readingThemeDefault).toBe('default');
    expect(migrated.learnerPreferences).toEqual({
      'LRN-calm-otter': {
        readingTheme: 'warm',
        favoriteReadingThemes: ['warm', 'dim'],
      },
    });
    expect(rosterIdentity.ensureRosterIdentity(migrated)).toBe(migrated);
  });

  it('prunes preferences when a stable learner leaves the roster', () => {
    const pruned = rosterIdentity.ensureRosterIdentity({
      classId: 'CLS-reading',
      groups: {},
      students: {},
      learnerIds: {},
      learnerPreferences: {
        'LRN-removed': { readingTheme: 'blue', favoriteReadingThemes: ['blue'] },
      },
      readingThemeDefault: 'sepia',
    });
    expect(pruned.learnerPreferences).toEqual({});
    expect(pruned.readingThemeDefault).toBe('sepia');
  });

  it('keeps roster import, deletion, and the neutral preference editor wired together', () => {
    expect(teacherSource).toContain('learnerPreferences: asRecord(data.learnerPreferences)');
    expect(teacherSource).toContain('delete nr[learnerId]');
    expect(teacherSource).toContain('Reading preferences · {readingPreferencesStudent}');
    expect(teacherSource).toContain('Use group/class default ({fallbackLabel})');
    expect(teacherSource).toContain('Choice priority: learner → saved preference → group → class → device.');
    expect(teacherSource).not.toContain('Reading accommodation');
  });

  it('uses validated enum-only live transport and preserves learner-first precedence', () => {
    expect(appSource).toContain("'readingTheme', 'readingThemeFavorites', 'readingThemeDefault', 'readingPreferenceAt'");
    expect(appSource).toContain('const nextTheme = directTheme || groupTheme || classTheme;');
    expect(appSource).toContain('readingThemePreferenceWriteIntentRef.current');
    expect(appSource).toContain('new Date(preferenceAt).toISOString()');
    expect(appSource).toContain('alloNormalizeLearnerReadingPreference');
  });

  it('pins favorites first and exposes an explicit favorite toggle in the reading picker', () => {
    expect(headerSource).toContain('normalizedReadingThemeFavorites.concat');
    expect(headerSource).toContain('toggleReadingThemeFavorite(readingTheme)');
    expect(headerSource).toContain('☆ Favorite this theme');
    expect(headerSource).toContain('Favorites appear first in this picker.');
  });
});
