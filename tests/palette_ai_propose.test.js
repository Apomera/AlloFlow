// AI-proposed palettes (S2 slice-3, 2026-06-23). The AI contributes TASTE only: proposePaletteFromIntent
// asks Gemini for a semantic-token palette from a mood/brand intent, validates every hex, and returns
// { tokens } — which then flows through the SAME deterministic clamp→build→apply as the presets, so
// accessibility stays GUARANTEED regardless of what the model returns. FERPA: only the intent string is
// sent (no document content). Graceful under throttle: any failure → null → the UI falls back to presets.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const dp = readFileSync(resolve(process.cwd(), 'doc_pipeline_source.jsx'), 'utf8');
const view = readFileSync(resolve(process.cwd(), 'view_pdf_audit_source.jsx'), 'utf8');
const _s = dp.indexOf('const proposePaletteFromIntent = async (intent) => {');
const _e = dp.indexOf('\n  };', _s) + '\n  };'.length;
if (_s === -1 || _e < 0) throw new Error('extraction markers for proposePaletteFromIntent missing');
// inject a callGemini mock + a stripFence stub (the real one strips markdown fences)
const make = (callGemini) => new Function('callGemini', 'stripFence',
  dp.slice(_s, _e) + '\nreturn proposePaletteFromIntent;')(callGemini, (s) => String(s || '').replace(/```json|```/gi, '').trim());

const FULL = JSON.stringify({
  bg: '#ffffff', surface: '#f5f3ff', text: '#3b0764', heading: '#581c87', link: '#7c3aed',
  accent: '#8b5cf6', border: '#ddd6fe', headerBg: '#581c87', headerText: '#ffffff', calloutBg: '#f5f3ff', calloutText: '#581c87',
});

describe('proposePaletteFromIntent: validates the model output into a token palette', () => {
  it('parses a valid JSON palette into normalized #rrggbb tokens', async () => {
    const fn = make(async () => FULL);
    const out = await fn('regal purple, calm');
    expect(out).toBeTruthy();
    expect(out.tokens.bg).toBe('#ffffff');
    expect(out.tokens.heading).toBe('#581c87');
    for (const k of Object.keys(out.tokens)) expect(out.tokens[k]).toMatch(/^#[0-9a-f]{6}$/);
  });
  it('drops non-hex values but keeps the valid ones', async () => {
    const fn = make(async () => JSON.stringify({ bg: '#ffffff', text: '#222222', link: 'blue', accent: 'rgb(1,2,3)' }));
    const out = await fn('x');
    expect(out.tokens.bg).toBe('#ffffff');
    expect(out.tokens.text).toBe('#222222');
    expect(out.tokens.link).toBeUndefined();   // 'blue' dropped
    expect(out.tokens.accent).toBeUndefined();  // 'rgb(...)' dropped
  });
  it('expands 3-digit hex to 6', async () => {
    const fn = make(async () => JSON.stringify({ bg: '#fff', text: '#123' }));
    const out = await fn('x');
    expect(out.tokens.bg).toBe('#ffffff');
    expect(out.tokens.text).toBe('#112233');
  });
  it('tolerates a markdown ```json fence around the JSON', async () => {
    const fn = make(async () => '```json\n' + FULL + '\n```');
    const out = await fn('x');
    expect(out.tokens.bg).toBe('#ffffff');
  });
});

describe('proposePaletteFromIntent: graceful + safe failure modes', () => {
  it('returns null on non-JSON garbage', async () => {
    expect(await make(async () => 'sorry, here is a nice palette!')('x')).toBeNull();
  });
  it('returns null when bg or text is missing (not a usable palette)', async () => {
    expect(await make(async () => JSON.stringify({ heading: '#111111' }))('x')).toBeNull();
  });
  it('returns null (no throw) when the model call throws — graceful under throttle', async () => {
    expect(await make(async () => { throw new Error('Canvas throttle'); })('x')).toBeNull();
  });
  it('returns null on empty intent without calling the model', async () => {
    let called = 0;
    const fn = make(async () => { called++; return FULL; });
    expect(await fn('   ')).toBeNull();
    expect(called).toBe(0);
  });
});

describe('proposePaletteFromIntent: the prompt is intent-only (FERPA) and defers contrast to the clamp', () => {
  it('sends ONLY the intent — no document HTML — and tells the model not to worry about contrast', async () => {
    let seen = '';
    const fn = make(async (p) => { seen = p; return FULL; });
    await fn('warm and energetic');
    expect(seen).toContain('warm and energetic');                 // the intent
    expect(seen).toMatch(/do NOT worry about contrast/i);          // accessibility enforced downstream
    expect(seen).toMatch(/JSON only/i);
    expect(seen).not.toMatch(/<html|<body|accessibleHtml|<p>/i);   // FERPA: no document content
  });
});

describe('anti-drift: exported + wired into the picker, feeding the SAME clamp pipeline', () => {
  it('proposePaletteFromIntent is on the factory API', () => {
    expect(dp).toMatch(/proposePaletteFromIntent: proposePaletteFromIntent,/);
  });
  it('the picker has an AI-suggest form whose result flows through _applyPalette (same clamp/apply/re-audit)', () => {
    const h = view.slice(view.indexOf('const _suggestPalette = async'), view.indexOf('const _revertPalette = async'));
    expect(h).toMatch(/_docPipeline\.proposePaletteFromIntent\(intent\)/);
    expect(h).toMatch(/await _applyPalette\(\{ id: 'ai:'/);   // AI tokens reuse the deterministic apply
    expect(h).toMatch(/pdf_audit\.palette\.ai_failed/);        // graceful fallback to presets
    expect(view).toMatch(/onSubmit=\{\(e\) => \{ e\.preventDefault\(\); _suggestPalette\(\); \}\}/);
  });
});
