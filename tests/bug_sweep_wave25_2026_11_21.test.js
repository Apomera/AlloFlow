import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const bdm = require('../dev-tools/build_browser_delivery_manifest.cjs');

const ROOT = process.cwd();
const MIRROR_ROOTS = [
  'desktop/web-app/public',
  'desktop/web-app/build',
  'desktop/app-build'
];

const CORE_FILES = [
  'timeline_revision_module.js',
  'text_utility_helpers_module.js',
  'key_concept_map_module.js',
  'glossary_helpers_module.js',
  'guided_mode_config_module.js',
  'large_file_module.js'
];

const STEM_FILES = [
  'stem_lab/stem_tool_spacestation.js',
  'stem_lab/stem_tool_coralreef.js',
  'stem_lab/stem_tool_aquaculture.js',
  'stem_lab/stem_tool_learning_lab.js',
  'stem_lab/stem_tool_anatomy.js',
  'stem_lab/stem_tool_aquarium.js',
  'stem_lab/stem_tool_brainatlas.js',
  'stem_lab/stem_tool_assessmentliteracy.js',
  'stem_lab/stem_tool_astronomy.js',
  'stem_lab/stem_tool_nutritionlab.js',
  'stem_lab/stem_tool_autorepair.js',
  'stem_lab/stem_tool_fisherlab.js'
];

const ALL_WAVE25_FILES = [...CORE_FILES, ...STEM_FILES];

function sha256(filePath) {
  return createHash('sha256').update(readFileSync(filePath)).digest('hex');
}

function sha384(filePath) {
  return 'sha384-' + createHash('sha384').update(readFileSync(filePath)).digest('base64');
}

function read(rel) {
  return readFileSync(resolve(ROOT, rel), 'utf8');
}

describe('Wave 25 Bug Sweep (2026-11-21) — Parity, SSR, Safety & Hardening', () => {
  it('maintains 4-way SHA-256 mirror parity across all 18 Wave 25 deliverables', () => {
    for (const rel of ALL_WAVE25_FILES) {
      const rootAbs = resolve(ROOT, rel);
      expect(existsSync(rootAbs), `missing root ${rel}`).toBe(true);
      const expected = sha256(rootAbs);
      for (const mirror of MIRROR_ROOTS) {
        const destAbs = resolve(ROOT, mirror, rel);
        expect(existsSync(destAbs), `missing mirror ${mirror}/${rel}`).toBe(true);
        expect(sha256(destAbs), `mirror mismatch ${mirror}/${rel}`).toBe(expected);
      }
    }
  });

  it('matches embedded SHA-384 SRI entries across all 3 host files for all 18 deliverables', () => {
    const expectedSri = Object.fromEntries(
      ALL_WAVE25_FILES.map((rel) => {
        const abs = resolve(ROOT, rel);
        return [rel, { integrity: sha384(abs), bytes: readFileSync(abs).length }];
      })
    );
    for (const host of bdm.HOST_FILES) {
      const manifest = bdm.readEmbeddedManifest(read(host));
      for (const rel of ALL_WAVE25_FILES) {
        expect(manifest.assets[rel], `missing manifest asset ${rel} in ${host}`).toEqual(expectedSri[rel]);
      }
    }
  });

  it('evaluates all 12 Wave 25 STEM Lab studios safely under Node VM SSR (window/document undefined)', () => {
    for (const rel of STEM_FILES) {
      const code = read(rel);
      expect(() => {
        vm.runInNewContext(
          code,
          {
            console, setTimeout, clearTimeout, setInterval, clearInterval,
            Math, Date, JSON, Object, Array, String, Number, Boolean,
            RegExp, Error, Promise, Map, Set, WeakMap, URL,
            Uint8Array, Int16Array, Float32Array
          },
          { filename: rel }
        );
      }, `SSR crash in ${rel}`).not.toThrow();
    }
  });

  describe('Pass 1 — Core Runtime & UI Modules', () => {
    it('hardens timeline_revision_source.jsx (fail-closed AI, prototype-safe dateCounts, BCE parsing)', () => {
      const src = read('timeline_revision_source.jsx');
      expect(src).toContain('Object.create(null)');
      expect(src).toContain('_alloQrBlocked');
      expect(src).toContain('__alloStudentAiDisabled');
      expect(src).toContain('_trSanitizeInline');
      expect(src).toContain('isCurrent()');
    });

    it('hardens text_utility_helpers_source.jsx (safe image URLs, AI gating, fencing, IME, word search)', () => {
      const src = read('text_utility_helpers_source.jsx');
      expect(src).toContain('_safeGlossaryImageSrc');
      expect(src).toContain('UNTRUSTED_');
      expect(src).toContain('__alloStudentAiDisabled');
      expect(src).toContain('keyCode === 229');
      expect(src).toContain('_glossaryTranslationParts');
    });

    it('hardens key_concept_map_source.jsx (safeBranches, WCAG AA contrast, prototype-safe spine)', () => {
      const src = read('key_concept_map_source.jsx');
      expect(src).toContain('safeBranches');
      expect(src).toContain('#4f46e5');
      expect(src).toContain('Object.create(null)');
      expect(src).not.toMatch(/from-indigo-500\s+via-purple-500/);
    });

    it('hardens glossary_helpers_source.jsx (hasOwnProperty length lookup, finite clamping, untrusted fencing)', () => {
      const src = read('glossary_helpers_source.jsx');
      expect(src).toContain('Object.prototype.hasOwnProperty.call(_lenMap');
      expect(src).toContain('Number.isFinite');
      expect(src).toContain('_ghSanitizeUntrusted');
    });

    it('hardens guided_mode_config_source.jsx (Array.isArray/Number.isFinite/null callback guards)', () => {
      const src = read('guided_mode_config_source.jsx');
      expect(src).toContain('Array.isArray');
      expect(src).toContain('Number.isFinite');
      expect(src).toContain("typeof safeDeps.cleanJson === 'function'");
    });

    it('hardens large_file_source.jsx (cancel checks, AI gating, no redundant buffer slice, chunk floor)', () => {
      const src = read('large_file_source.jsx');
      expect(src).toContain('this.cancelRequested');
      expect(src).toContain('__alloStudentAiDisabled');
      expect(src).toContain('Math.max(1,');
      expect(src).not.toContain('arrayBuffer.slice(0)');
    });
  });

  describe('Pass 2 — Flagship STEM Lab Studios', () => {
    it('hardens stem_tool_spacestation.js (AI door, crisis screen, fencing, safeIssPrev, WebGL loss, IME)', () => {
      const src = read('stem_lab/stem_tool_spacestation.js');
      expect(src).toContain('safeIssPrev');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('<UNTRUSTED_STUDENT_INPUT>');
      expect(src).toContain('webglcontextlost');
      expect(src).toContain('keyCode === 229');
    });

    it('hardens stem_tool_coralreef.js (global mute with zero close/suspend in reef audio, hidden skip, IME)', () => {
      const src = read('stem_lab/stem_tool_coralreef.js');
      expect(src).toContain('reefIsGlobalMuted');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('document.hidden');
      const soundStart = src.indexOf('function reefIsGlobalMuted');
      const soundEnd = src.indexOf('ReefSoundPanel', soundStart + 200) + 1200;
      const soundSlice = src.slice(soundStart, soundEnd);
      expect(soundSlice).not.toContain('.close()');
      expect(soundSlice).not.toContain('.suspend(');
    });

    it('hardens stem_tool_aquaculture.js (prototype-safe JSON parse, WebGL loss cleanup, IME)', () => {
      const src = read('stem_lab/stem_tool_aquaculture.js');
      expect(src).toContain('_aqSafeJsonParse');
      expect(src).toContain('onWebGLContextLost');
      expect(src).toContain('keyCode === 229');
    });

    it('hardens stem_tool_learning_lab.js (global mute, prototype-safe JSON, divide-by-zero, IME)', () => {
      const src = read('stem_lab/stem_tool_learning_lab.js');
      expect(src).toContain('if (!soundEnabled || typeof window === \'undefined\') return;');
      expect(src).toContain('__alloIsGlobalMuted');
      expect(src).toContain("k === '__proto__'");
      expect(src).toContain('keyCode === 229');
    });

    it('hardens stem_tool_anatomy.js (global mute, AI door + crisis + fencing, 4 rect guards, safe setLabToolData)', () => {
      const src = read('stem_lab/stem_tool_anatomy.js');
      expect(src).toContain('_anatIsGlobalMuted');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('__alloGlobalMuted');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('<UNTRUSTED_STUDENT_INPUT>');
      expect(src).toContain('if (!rect || rect.width <= 0 || rect.height <= 0) return');
      expect(src).toContain('_rawSetLabToolData');
    });

    it('hardens stem_tool_aquarium.js (global mute, audioOwned shared-context safety, AI crisis/fencing, safeAqState)', () => {
      const src = read('stem_lab/stem_tool_aquarium.js');
      expect(src).toContain('_aquaIsGlobalMuted');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('runtimeRef.current.audioOwned');
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('<UNTRUSTED_STUDENT_INPUT>');
      expect(src).toContain('safeAqState');
    });
  });

  describe('Pass 3 — Flagship STEM Lab Studios', () => {
    it('hardens stem_tool_brainatlas.js (global mute, AI door, safe prev, IME/modifier guards)', () => {
      const src = read('stem_lab/stem_tool_brainatlas.js');
      expect(src).toContain('_brainIsGlobalMuted');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('__alloStudentAiDisabled');
      expect(src).toContain('keyCode === 229');
    });

    it('hardens stem_tool_assessmentliteracy.js (crisis screen + fencing across all 5 AI flows, AI door, safe prev)', () => {
      const src = read('stem_lab/stem_tool_assessmentliteracy.js');
      expect(src).toContain('_alIsCrisisText');
      expect(src).toContain('_alFenceUntrusted');
      expect(src).toContain('<UNTRUSTED_STUDENT_INPUT>');
      expect(src).toContain('__alloStudentAiDisabled');
      expect(src).toContain('keyCode === 229');
    });

    it('hardens stem_tool_astronomy.js (WebGL listener cleanup, AI door + crisis + fencing, safe prev.galaxy, IME)', () => {
      const src = read('stem_lab/stem_tool_astronomy.js');
      expect(src).toContain("removeEventListener('webglcontextlost', S.onContextLost)");
      expect(src).toContain('safeRehearseCheck');
      expect(src).toContain('<UNTRUSTED_STUDENT_INPUT>');
      expect(src).toContain('__alloStudentAiDisabled');
      expect(src).toContain('keyCode === 229');
    });

    it('hardens stem_tool_nutritionlab.js (SSR + IME/modifier guards on bmKeys and tabs)', () => {
      const src = read('stem_lab/stem_tool_nutritionlab.js');
      expect(src).toContain("typeof document === 'undefined' || !document.head || document.getElementById('nutritionlab-print-css')");
      expect(src).toContain('function bmKeys(e) {\n          if (e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;');
    });

    it('hardens stem_tool_autorepair.js (SSR + IME/modifier guards on onKey and tab handlers)', () => {
      const src = read('stem_lab/stem_tool_autorepair.js');
      expect(src).toContain("if (typeof document === 'undefined' || !document.body) return;");
      expect(src).toContain('function onKey(e) {\n          if (e.isComposing || e.keyCode === 229 || e.ctrlKey || e.metaKey || e.altKey) return;');
    });

    it('hardens stem_tool_fisherlab.js (global mute + hauling mute fix + safe listener teardown + IME)', () => {
      const src = read('stem_lab/stem_tool_fisherlab.js');
      expect(src).toContain('_flIsGlobalMuted');
      expect(src).toContain('alloflow-mute-changed');
      expect(src).toContain('if (soundEnabled && !_flIsGlobalMuted() && audioCtx && audioCtx.state !== \'suspended\')');
      expect(src).toContain("if (typeof onMuteChanged === 'function') window.removeEventListener('alloflow-mute-changed', onMuteChanged);");
    });
  });
});
