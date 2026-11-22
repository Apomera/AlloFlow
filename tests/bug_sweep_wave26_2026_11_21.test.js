import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '..');
const bdm = require(path.join(ROOT, 'dev-tools', 'build_browser_delivery_manifest.cjs'));

const WAVE26_CORE_MODULES = [
  'module_scope_extras_module.js',
  'semantic_review_module.js',
  'verification_policy_module.js',
  'tool_catalog_module.js',
  'remediation_audio_module.js',
  'view_udl_guide_button_module.js'
];

const WAVE26_STEM_STUDIOS = [
  'stem_lab/stem_tool_galaxy.js',
  'stem_lab/stem_tool_moonmission.js',
  'stem_lab/stem_tool_renewables.js',
  'stem_lab/stem_tool_geometryworld.js',
  'stem_lab/stem_tool_artstudio.js',
  'stem_lab/stem_tool_ecosystem.js',
  'stem_lab/stem_tool_typingpractice.js',
  'stem_lab/stem_tool_weathersystems.js',
  'stem_lab/stem_tool_pets.js',
  'stem_lab/stem_tool_magnetism.js',
  'stem_lab/stem_tool_machinelab.js',
  'stem_lab/stem_tool_bridgelab.js'
];

const ALL_WAVE26_DELIVERABLES = [...WAVE26_CORE_MODULES, ...WAVE26_STEM_STUDIOS];
const MIRROR_ROOTS = ['.', 'desktop/web-app/public', 'desktop/web-app/build', 'desktop/app-build'];
const HOST_FILES = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];

function readText(rel) {
  return fs.readFileSync(path.join(ROOT, rel), 'utf8');
}

function sha256(buf) {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function sri384(buf) {
  return 'sha384-' + crypto.createHash('sha384').update(buf).digest('base64');
}

describe('Wave 26 (2026-11-21) — Delivery Parity & SSR Safety', () => {
  it('maintains 4-way SHA-256 mirror parity for all 18 Wave 26 deliverables', () => {
    for (const rel of ALL_WAVE26_DELIVERABLES) {
      const rootBuf = fs.readFileSync(path.join(ROOT, rel));
      const expected = sha256(rootBuf);
      for (const mr of MIRROR_ROOTS.slice(1)) {
        const mirrorPath = path.join(ROOT, mr, rel);
        expect(fs.existsSync(mirrorPath), `${mirrorPath} must exist`).toBe(true);
        const actual = sha256(fs.readFileSync(mirrorPath));
        expect(actual, `SHA-256 mismatch for ${mr}/${rel}`).toBe(expected);
      }
    }
  });

  it('maintains 3-host embedded SHA-384 SRI parity for all 18 Wave 26 deliverables', () => {
    const manifests = HOST_FILES.map((h) => ({
      host: h,
      manifest: bdm.readEmbeddedManifest(readText(h))
    }));
    const refReleaseId = manifests[0].manifest.releaseId;
    for (const { host, manifest } of manifests) {
      expect(manifest.releaseId, `${host} releaseId should match canonical host`).toBe(refReleaseId);
      for (const rel of ALL_WAVE26_DELIVERABLES) {
        const buf = fs.readFileSync(path.join(ROOT, rel));
        const entry = manifest.assets[rel];
        expect(entry, `${host} missing manifest entry for ${rel}`).toBeTruthy();
        expect(entry.integrity, `${host} SRI mismatch for ${rel}`).toBe(sri384(buf));
        expect(entry.bytes, `${host} byte length mismatch for ${rel}`).toBe(buf.length);
      }
    }
  });

  it.each(WAVE26_STEM_STUDIOS)('evaluates cleanly under Node SSR with window and document undefined: %s', (rel) => {
    const src = readText(rel);
    const sandbox = {
      console: { log() {}, warn() {}, error() {} },
      setTimeout, clearTimeout, setInterval, clearInterval,
      URL, URLSearchParams, TextEncoder, TextDecoder,
      Uint8Array, Int32Array, Float32Array, Float64Array, ArrayBuffer, DataView,
      Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, TypeError, RangeError,
      Map, Set, WeakMap, WeakSet, Promise, Symbol,
      parseInt, parseFloat, isNaN, isFinite, encodeURIComponent, decodeURIComponent
    };
    sandbox.globalThis = sandbox;
    expect(() => vm.runInNewContext(src, sandbox, { filename: rel, timeout: 5000 })).not.toThrow();
  });
});

describe('Wave 26 Pass 1 — Core Module Hardening Invariants', () => {
  it('hardens module_scope_extras against SVG XSS, path traversal, proto pollution, and unbounded chunks', () => {
    const src = readText('module_scope_extras_module.js');
    expect(src).toContain('MAX_SESSION_ASSET_CHUNKS');
    expect(src).toContain('vbscript');
    expect(src).toContain('feImage');
    expect(src).toContain('__proto__');
    expect(src).toContain('WeakSet');
  });

  it('hardens semantic_review for nested tables, whitespace titles, and bounded tree nodes', () => {
    const src = readText('semantic_review_module.js');
    expect(src).toContain("closest('table')");
    expect(src).toContain('MAX_TREE_NODES');
    expect(src).toContain('ID_PATTERN');
  });

  it('hardens verification_policy pluralization and input coercion', () => {
    const src = readText('verification_policy_module.js');
    expect(src).toContain('_stripCtl');
    expect(src).toContain('Number(match[1]) === 1');
  });

  it('hardens tool_catalog text sanitization and entry retrieval', () => {
    const src = readText('tool_catalog_module.js');
    expect(src).toContain('_sanitizeCatalogText');
  });

  it('hardens remediation_audio with global mute listener and active node tracking', () => {
    const src = readText('remediation_audio_module.js');
    expect(src).toContain('alloflow-mute-changed');
    expect(src).toContain('__alloGlobalMuted');
    expect(src).toContain('activeNodes');
  });

  it('hardens view_udl_guide_button with default props and QR/student guard', () => {
    const src = readText('view_udl_guide_button_module.js');
    expect(src).toContain('hasOwnProperty');
    expect(src).toContain('_alloQrBlocked');
  });
});

describe('Wave 26 Pass 2 & Pass 3 — STEM Studio Hardening Invariants', () => {
  const WEBAUDIO_STUDIOS = [
    'stem_lab/stem_tool_galaxy.js',
    'stem_lab/stem_tool_moonmission.js',
    'stem_lab/stem_tool_geometryworld.js',
    'stem_lab/stem_tool_artstudio.js',
    'stem_lab/stem_tool_ecosystem.js',
    'stem_lab/stem_tool_typingpractice.js',
    'stem_lab/stem_tool_machinelab.js',
    'stem_lab/stem_tool_bridgelab.js'
  ];

  it.each(WEBAUDIO_STUDIOS)('wires global mute listener and mute check in %s', (rel) => {
    const src = readText(rel);
    expect(src).toContain('alloflow-mute-changed');
    expect(src).toContain('__alloGlobalMuted');
  });

  const AI_STUDIOS = [
    'stem_lab/stem_tool_galaxy.js',
    'stem_lab/stem_tool_moonmission.js',
    'stem_lab/stem_tool_renewables.js',
    'stem_lab/stem_tool_geometryworld.js',
    'stem_lab/stem_tool_artstudio.js',
    'stem_lab/stem_tool_ecosystem.js',
    'stem_lab/stem_tool_typingpractice.js',
    'stem_lab/stem_tool_pets.js',
    'stem_lab/stem_tool_magnetism.js',
    'stem_lab/stem_tool_machinelab.js'
  ];

  it.each(AI_STUDIOS)('enforces full AI hard-deny policy gates in %s', (rel) => {
    const src = readText(rel);
    expect(src).toContain('ALLOFLOW_MANAGED_AI_POLICY');
    expect(src).toContain('__alloAiSecretsLocked');
    expect(src).toContain('__alloQrStudentMode');
  });

  const STUDENT_PROMPT_STUDIOS = [
    'stem_lab/stem_tool_moonmission.js',
    'stem_lab/stem_tool_renewables.js',
    'stem_lab/stem_tool_geometryworld.js',
    'stem_lab/stem_tool_artstudio.js',
    'stem_lab/stem_tool_ecosystem.js',
    'stem_lab/stem_tool_typingpractice.js',
    'stem_lab/stem_tool_pets.js',
    'stem_lab/stem_tool_magnetism.js'
  ];

  it.each(STUDENT_PROMPT_STUDIOS)('enforces synchronous crisis check and UNTRUSTED_STUDENT_INPUT fencing in %s', (rel) => {
    const src = readText(rel);
    expect(src).toContain('<UNTRUSTED_STUDENT_INPUT>');
    expect(src).toContain('safeRehearseCheck');
    expect(src).toContain('SafetyContentChecker');
  });

  const PROTO_SAFE_JSON_STUDIOS = [
    'stem_lab/stem_tool_galaxy.js',
    'stem_lab/stem_tool_moonmission.js',
    'stem_lab/stem_tool_renewables.js',
    'stem_lab/stem_tool_geometryworld.js',
    'stem_lab/stem_tool_artstudio.js',
    'stem_lab/stem_tool_weathersystems.js',
    'stem_lab/stem_tool_pets.js'
  ];

  it.each(PROTO_SAFE_JSON_STUDIOS)('strips __proto__/constructor/prototype in JSON.parse revivers in %s', (rel) => {
    const src = readText(rel);
    expect(src).toContain("'__proto__'");
    expect(src).toContain("'constructor'");
    expect(src).toContain("'prototype'");
  });

  const HIDDEN_LOOP_STUDIOS = [
    'stem_lab/stem_tool_galaxy.js',
    'stem_lab/stem_tool_moonmission.js',
    'stem_lab/stem_tool_renewables.js',
    'stem_lab/stem_tool_geometryworld.js',
    'stem_lab/stem_tool_artstudio.js',
    'stem_lab/stem_tool_ecosystem.js',
    'stem_lab/stem_tool_typingpractice.js',
    'stem_lab/stem_tool_weathersystems.js',
    'stem_lab/stem_tool_pets.js',
    'stem_lab/stem_tool_magnetism.js'
  ];

  it.each(HIDDEN_LOOP_STUDIOS)('guards RAF/timer loops with document.hidden in %s', (rel) => {
    const src = readText(rel);
    expect(src).toContain('document.hidden');
  });

  it.each(WAVE26_STEM_STUDIOS.filter((f) => !f.endsWith('stem_tool_galaxy.js')))(
    'guards keyboard handlers against IME composition (isComposing / keyCode 229) in %s',
    (rel) => {
      const src = readText(rel);
      expect(src).toContain('isComposing');
      expect(src).toContain('229');
    }
  );

  it('preserves critical test contract pins across machinelab, pets, magnetism, and bridgelab', () => {
    const machineSrc = readText('stem_lab/stem_tool_machinelab.js');
    expect(machineSrc.includes('Math.random(')).toBe(false);
    expect(machineSrc).toContain('catch (e) { ctx = null; }');

    const petsSrc = readText('stem_lab/stem_tool_pets.js');
    expect(petsSrc.includes('forceContextLoss(')).toBe(false);
    expect(petsSrc.includes('StemLab.releaseGl(')).toBe(false);

    const magSrc = readText('stem_lab/stem_tool_magnetism.js');
    expect(magSrc).toContain("var aiOn = !!(ctx.aiHintsEnabled && typeof callGemini === 'function');");

    const bridgeSrc = readText('stem_lab/stem_tool_bridgelab.js');
    expect(bridgeSrc).toContain("window.StemLab.registerTool('bridgeLab', {");
    expect(bridgeSrc).toContain('var bridgeTabKeyDown = function(e, index)');
  });
});
