import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const SOURCE = 'generate_dispatcher_source.jsx';
const MODULE = 'generate_dispatcher_module.js';
const PUBLIC = 'desktop/web-app/public/generate_dispatcher_module.js';

const dispatcher = readFileSync(SOURCE, 'utf8');

// Split handleGenerate's if/else chain into per-resource-type branch bodies.
function branchBodies(src) {
  const lines = src.split('\n');
  const starts = [];
  lines.forEach((line, i) => {
    const m = line.match(/^\s*\}?\s*(?:else\s+)?if \(type === '([a-z0-9-]+)'\) \{\s*$/);
    if (m) starts.push({ type: m[1], line: i });
  });
  const out = {};
  starts.forEach((s, i) => {
    const end = i + 1 < starts.length ? starts[i + 1].line : lines.length;
    // A type can appear more than once in the chain; keep the largest body,
    // which is always the prompt-building branch rather than a small guard.
    const body = lines.slice(s.line, end).join('\n');
    if (!out[s.type] || body.length > out[s.type].length) out[s.type] = body;
  });
  return out;
}

function fanoutTypes(src) {
  const m = src.match(/const MULTILINGUAL_FANOUT_TYPES = \[([\s\S]*?)\];/);
  if (!m) throw new Error('MULTILINGUAL_FANOUT_TYPES not found');
  return [...m[1].matchAll(/'([a-z0-9-]+)'/g)].map((x) => x[1]);
}

describe('All Selected Languages fan-out', () => {
  it('is opt-in, so a new resource type cannot silently fan out into duplicates', () => {
    expect(dispatcher).toContain('const MULTILINGUAL_FANOUT_TYPES = [');
    expect(dispatcher).toContain('if (!MULTILINGUAL_FANOUT_TYPES.includes(type)) {');
    // The old opt-out list must not come back.
    expect(dispatcher).not.toContain(
      "if (['analysis', 'brainstorm', 'udl-advice', 'alignment-report'].includes(type)) {"
    );
  });

  it('only fans out types whose prompts actually honor the target language', () => {
    const bodies = branchBodies(dispatcher);
    const offenders = fanoutTypes(dispatcher).filter((type) => {
      const body = bodies[type];
      if (!body) return true;
      return !/effectiveLanguage|languageDirective/.test(body);
    });
    expect(offenders).toEqual([]);
  });

  it('keeps types out of the fan-out that should not multiply', () => {
    const types = fanoutTypes(dispatcher);
    // analysis / udl-advice / alignment-report are teacher-facing and English-only
    // by design; glossary carries its own multilingual handling.
    for (const t of ['analysis', 'udl-advice', 'alignment-report', 'glossary']) {
      expect(types).not.toContain(t);
    }
    // brainstorm DOES honour the output language as of 2026-07-28, so its absence
    // here is a deliberate spend decision (don't auto-generate N copies), not a
    // capability gap. Kept as a separate assertion so the reason stays visible.
    expect(types).not.toContain('brainstorm');
  });
});

describe('per-type language directives', () => {
  it('declares one shared language directive next to the dialect instruction', () => {
    expect(dispatcher).toContain('const languageDirective = (effectiveLanguage');
    expect(dispatcher).toContain('Write ALL generated student-facing text in ${effectiveLanguage}');
  });

  it('routes math through effectiveLanguage so langOverride is honored', () => {
    const body = branchBodies(dispatcher)['math'];
    expect(body).toContain('effectiveLanguage');
    // Reading the dropdown directly bypasses the per-language fan-out.
    expect(body).not.toContain('leveledTextLanguage');
  });

  it.each(['note-taking', 'anchor-chart', 'persona'])(
    'injects the language directive into %s prompts',
    (type) => {
      expect(branchBodies(dispatcher)[type]).toContain('${languageDirective}');
    }
  );

  it('never translates double-entry quotes, which are extracted verbatim', () => {
    expect(branchBodies(dispatcher)['note-taking']).toContain(
      'copied verbatim from the source in its ORIGINAL language, never translated'
    );
  });

  it('keeps anchor-chart machine ids and image prompts in English', () => {
    expect(branchBodies(dispatcher)['anchor-chart']).toContain(
      'must stay in English (machine id / image-generator input)'
    );
  });
});

// generate_dispatcher_source.jsx contains no JSX despite the extension, so the
// module is exactly the source wrapped in an IIFE + registration.
//
// It is NOT enrolled in build.js COMPILE_PAIRS. The canonical generator is the
// standalone `_build_generate_dispatcher_module.js`, which writes BOTH the root
// module and the desktop/web-app/public copy from the source and runs `node -c`.
// Edit the source and run that script; never hand-edit a module.
//
// Divergence means someone edited a module without regenerating from source.
// That already happened: the module carried a newer Memory Palace prompt for
// weeks while the upstream source sat stale, and nothing caught it.
const WRAPPER_HEAD = [
  '(function() {',
  "'use strict';",
  "if (window.AlloModules && window.AlloModules.GenDispatcherModule) { console.log('[CDN] GenDispatcherModule already loaded, skipping'); return; }",
];
const WRAPPER_TAIL = [
  'window.AlloModules.GenDispatcherModule = true;',
  "console.log('[GenDispatcher] handleGenerate registered');",
  '})();',
];

const norm = (s) => s.replace(/\r\n/g, '\n');

function unwrapModule(moduleText) {
  const lines = norm(moduleText).split('\n');
  const head = lines.slice(0, WRAPPER_HEAD.length);
  expect(head, 'module IIFE header changed - update WRAPPER_HEAD').toEqual(WRAPPER_HEAD);

  let end = lines.length;
  while (end > 0 && lines[end - 1].trim() === '') end -= 1;
  const tail = lines.slice(end - WRAPPER_TAIL.length, end);
  expect(tail, 'module registration footer changed - update WRAPPER_TAIL').toEqual(WRAPPER_TAIL);

  return lines.slice(WRAPPER_HEAD.length, end - WRAPPER_TAIL.length).join('\n').trim();
}

describe('dispatcher mirrors', () => {
  it('keeps the root and public CDN modules byte-identical', () => {
    expect(readFileSync(MODULE, 'utf8')).toBe(readFileSync(PUBLIC, 'utf8'));
  });

  it('keeps the hand-maintained module in sync with its upstream source', () => {
    const source = norm(readFileSync(SOURCE, 'utf8')).trim();
    const unwrapped = unwrapModule(readFileSync(MODULE, 'utf8'));
    if (unwrapped !== source) {
      // Point at the first divergent line so the failure is actionable rather
      // than a 5500-line diff dump.
      const a = source.split('\n');
      const b = unwrapped.split('\n');
      let i = 0;
      while (i < a.length && i < b.length && a[i] === b[i]) i += 1;
      throw new Error(
        `generate_dispatcher source and module diverge at source line ${i + 1}:\n` +
          `  source: ${JSON.stringify((a[i] || '<eof>').trim().slice(0, 160))}\n` +
          `  module: ${JSON.stringify((b[i] || '<eof>').trim().slice(0, 160))}\n` +
          'Fix: edit generate_dispatcher_source.jsx, then run ' +
            '`node _build_generate_dispatcher_module.js` (writes both module copies).'
      );
    }
    expect(unwrapped).toBe(source);
  });

  it('carries the language fixes into the shipped modules, not just the source', () => {
    for (const f of [MODULE, PUBLIC]) {
      const mod = readFileSync(f, 'utf8');
      expect(mod).toContain('const MULTILINGUAL_FANOUT_TYPES = [');
      expect(mod).toContain('const languageDirective = (effectiveLanguage');
      expect(mod).toContain('${languageDirective}');
    }
  });
});
