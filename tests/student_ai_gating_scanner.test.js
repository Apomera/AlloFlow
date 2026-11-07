// Student AI-off gate (dev-tools/check_student_ai_gating.cjs): rule fixtures plus the real scan.
// Read-only against the repo; fixture runs use a disposable temp dir.
import { describe, expect, it, afterAll } from 'vitest';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const require = createRequire(import.meta.url);
const gate = require('../dev-tools/check_student_ai_gating.cjs');
const { scanText, deriveStudentModules, applyAllowlist, resolveTrust, run } = gate;

const rules = (src, file = 'x_module.js', opts) => scanText(src, file, opts).map((f) => f.rule);

describe('rule typeof-ai-gate', () => {
  it.each([
    ["if (typeof callGemini === 'function') showTutor();"],
    ['const v = typeof window.callGeminiVision !== "function" ? null : 1;'],
    ["if ('function' === typeof props.callImagen) go();"],
    ["if (typeof callGeminiFn !== 'function') { setErr('x'); return; }"],
    ["available: typeof onCallGemini === 'function',"],
    ["x = typeof ctx.callGeminiAudio==='function';"],
  ])('fires on %s', (src) => {
    expect(rules(src)).toEqual(['typeof-ai-gate']);
  });

  it.each([
    ["return typeof callGemini === 'function' && !callGemini._alloQrBlocked && window.__alloStudentAiDisabled !== true;"],
    ["return typeof fn === 'function' && !fn._alloQrBlocked;"],
    ["var on = typeof callGemini === 'function' && _aiUsable('text', callGemini);"],
    ["const canImagen = typeof callImagen === 'function' && _alloAiUsableKind('images', callImagen);"],
    ["if (typeof window.__alloAiUsable === 'function') return window.__alloAiUsable('text', fn);"],
    ["// if (typeof callGemini === 'function') old();"],
    [" * typeof callGemini === 'function' is wrong for blocked fns"],
    ["if (typeof window.waitForGeminiCalm === 'function') wait();"],
    ["if (typeof callGeminiStuff === 'function') x();"],
  ])('stays quiet on %s', (src) => {
    expect(rules(src)).toEqual([]);
  });

  it('exempts a multi-line helper fallback that checks _alloQrBlocked', () => {
    const src = [
      'function _quizAiOn(fn) {',
      "  return typeof callGemini === 'function' &&",
      '    !callGemini._alloQrBlocked &&',
      '    window.__alloStudentAiDisabled !== true;',
      '}',
    ].join('\n');
    expect(rules(src)).toEqual([]);
  });

  it('skips a /* block comment */ opened at line start', () => {
    expect(rules("/*\n if (typeof callGemini === 'function') x();\n*/\nok();")).toEqual([]);
  });

  it('reports a typeof callTTS check as ADVISORY only', () => {
    const f = scanText("if (typeof callTTS === 'function') speak();", 'x_module.js');
    expect(f.map((x) => [x.rule, x.advisory])).toEqual([['typeof-tts-gate', true]]);
  });
});

describe('trusted contexts (STEM ctx nulls unusable fns)', () => {
  const tc = {
    files: ['stem_lab/stem_tool_*.js'], receivers: ['ctx'], trustLocalBindings: true, fns: ['callGemini'],
    proof: { file: 'stem_lab/stem_lab_module.js', mustContain: ['callGemini: _stemAiText ? callGemini : null'] }, reason: 'r',
  };
  const proofOk = () => 'ctx = { callGemini: _stemAiText ? callGemini : null };';
  const trusted = resolveTrust({ trustedContexts: [tc] }, '/root', proofOk).trusted;

  it('trusts ctx.callGemini in a STEM tool while the proof holds', () => {
    expect(rules("if (typeof ctx.callGemini === 'function') a();", 'stem_lab/stem_tool_x.js', { trusted })).toEqual([]);
  });
  it('does not trust the same check outside the trusted files', () => {
    expect(rules("if (typeof ctx.callGemini === 'function') a();", 'sel_hub/sel_tool_x.js', { trusted })).toEqual(['typeof-ai-gate']);
  });
  it('revokes trust when the provider no longer nulls the fn', () => {
    const r = resolveTrust({ trustedContexts: [tc] }, '/root', () => 'ctx = { callGemini: callGemini };');
    expect(r.trusted).toEqual([]);
    expect(r.errors.join(' ')).toMatch(/proof no longer holds/);
    expect(rules("if (typeof ctx.callGemini === 'function') a();", 'stem_lab/stem_tool_x.js', { trusted: r.trusted })).toEqual(['typeof-ai-gate']);
  });
  it('trusts a bare local bound from ctx, but not one bound with a window fallback', () => {
    const good = "var callGemini = ctx.callGemini;\nif (typeof callGemini === 'function') a();";
    expect(rules(good, 'stem_lab/stem_tool_x.js', { trusted })).toEqual([]);
    const oneHop = "var aiText = (ctx.aiAvailable ? ctx.callGemini : null);\nvar callGemini = aiText;\nif (typeof callGemini === 'function') a();";
    expect(rules(oneHop, 'stem_lab/stem_tool_x.js', { trusted })).toEqual([]);
    const bad = "var callGemini = ctx.callGemini || window.callGemini;\nif (typeof callGemini === 'function') a();";
    expect(rules(bad, 'stem_lab/stem_tool_x.js', { trusted }).sort()).toEqual(['ai-global-alias', 'typeof-ai-gate']);
  });
});

describe('rule ai-global-alias', () => {
  it.each([
    ['const fn = props.callGemini || window.callGemini;'],
    ['var a = window.callGeminiAudio ?? null;'],
    ['callGeminiAudio: opts && opts.callGeminiAudio || typeof window !== "undefined" && window.callGeminiAudio,'],
    ["var g = ctx.callGemini || window['callGemini'];"],
    ['var cg = ctx.callGemini || callGemini;'],
  ])('fires on %s', (src) => {
    expect(rules(src)).toEqual(['ai-global-alias']);
  });
  it.each([
    ['if (!window.callGemini || busy) return;'],
    ['window.callGemini = blockedFn;'],
    ['const fn = props.callGemini || null;'],
    ['var x = props.callGeminiHelper || window.callGeminiHelper;'],
  ])('stays quiet on %s', (src) => {
    expect(rules(src)).toEqual([]);
  });
});

describe('rule raw-gemini-fetch', () => {
  it('fires on a raw generativelanguage URL', () => {
    expect(rules("var url = 'https://generativelanguage.googleapis.com/v1beta/models/' + m + ':generateContent';")).toEqual(['raw-gemini-fetch']);
  });
  it('fires on a :generateContent URL carrying ?key=', () => {
    expect(rules("fetch(base + '/models/' + m + ':generateContent?key=' + k)")).toEqual(['raw-gemini-fetch']);
  });
  it('is quiet in sanctioned transport files, comments, and teaching text', () => {
    const src = "var url = 'https://generativelanguage.googleapis.com/v1beta';";
    expect(rules(src, 'gemini_api_module.js', { sanctioned: new Set(['gemini_api_module.js']) })).toEqual([]);
    expect(rules('// the raw generativelanguage.googleapis.com fetch bypassed every gate')).toEqual([]);
    expect(rules("example: 'POST /v1beta/models/gemini-pro:generateContent',")).toEqual([]);
  });
});

describe('module list derives from the host, not readdirSync', () => {
  const host = [
    "loadModule('Fluency', 'https://alloflow-cdn.pages.dev/fluency_module.js?v=abc');",
    "// loadModule('Old', 'https://alloflow-cdn.pages.dev/old_module.js?v=abc');",
    'var stemToolModules = [',
    "  'stem_lab/stem_tool_a.js', // note: 'stem_lab/stem_tool_commented.js'",
    "  // 'stem_lab/stem_tool_dead.js',",
    "  'data_kernel_loader.js'",
    '];',
    "var selToolModules = [ 'sel_hub/sel_tool_b.js' ];",
    "var arcadeModes = [ 'arcade_mode_c.js' ];",
  ].join('\n');
  it('collects loadModule CDN files and the three plugin manifests', () => {
    const d = deriveStudentModules(host);
    expect(d.files).toEqual(['arcade_mode_c.js', 'data_kernel_loader.js', 'fluency_module.js', 'sel_hub/sel_tool_b.js', 'stem_lab/stem_tool_a.js']);
  });
});

describe('allowlist semantics', () => {
  const f = (line, snippet) => ({ file: 'a.js', rule: 'typeof-ai-gate', line, snippet, advisory: false });
  const allow = { findings: [{ file: 'a.js', rule: 'typeof-ai-gate', snippet: "typeof callGemini === 'function' && show", reason: 'teacher-only' }] };
  it('matches by snippet, not line number', () => {
    const r = applyAllowlist([f(999, "if (typeof callGemini === 'function' && show) x();")], allow);
    expect(r.unallowed).toEqual([]);
    expect(r.stale).toEqual([]);
  });
  it('caps each entry at max (default 1) so a new copy still fails', () => {
    const s = "if (typeof callGemini === 'function' && show) x();";
    expect(applyAllowlist([f(1, s), f(2, s)], allow).unallowed.length).toBe(1);
    expect(applyAllowlist([f(1, s), f(2, s)], { findings: [Object.assign({ max: 2 }, allow.findings[0])] }).unallowed.length).toBe(0);
  });
  it('reports entries that match nothing as stale', () => {
    expect(applyAllowlist([], allow).stale.length).toBe(1);
  });
});

describe('CLI run on a disposable fixture tree', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-gating-'));
  afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));
  const write = (rel, txt) => { fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true }); fs.writeFileSync(path.join(dir, rel), txt); };
  const hostLines = ["loadModule('A', 'https://alloflow-cdn.pages.dev/a_module.js?v=1');"];
  for (let i = 0; i < 25; i++) hostLines.push("loadModule('P" + i + "', 'https://alloflow-cdn.pages.dev/pad" + i + "_module.js?v=1');");
  hostLines.push("var stemToolModules = ['stem_lab/stem_tool_s.js'];", "var selToolModules = ['sel_hub/sel_tool_t.js'];", "var arcadeModes = ['arcade_mode_m.js'];");
  write('AlloFlowANTI.txt', hostLines.join('\n'));
  write('a_module.js', "if (typeof window.callGemini === 'function') show();\n");
  for (let i = 0; i < 25; i++) write('pad' + i + '_module.js', 'ok();\n');
  write('stem_lab/stem_tool_s.js', 'ok();\n');
  write('sel_hub/sel_tool_t.js', 'ok();\n');
  write('arcade_mode_m.js', 'ok();\n');
  write('not_loaded_module.js', "if (typeof callGemini === 'function') x();\n");
  const allowFile = path.join(dir, 'allow.json');

  it('exits 1 on a non-allowlisted finding and ignores files the host never loads', () => {
    fs.writeFileSync(allowFile, JSON.stringify({ findings: [] }));
    const r = run(['--root', dir, '--allowlist', 'allow.json', '--json']);
    expect(r.code).toBe(1);
    expect(r.report.unallowed.map((x) => x.file + ':' + x.line)).toEqual(['a_module.js:1']);
  });
  it('--write-allowlist-draft prints a draft and never touches the allowlist file', () => {
    const before = fs.readFileSync(allowFile, 'utf8');
    const r = run(['--root', dir, '--allowlist', 'allow.json', '--write-allowlist-draft']);
    expect(r.code).toBe(0);
    const draft = JSON.parse(r.text);
    expect(draft.findings).toHaveLength(1);
    expect(draft.findings[0]).toMatchObject({ file: 'a_module.js', rule: 'typeof-ai-gate', class: 'review' });
    expect(fs.readFileSync(allowFile, 'utf8')).toBe(before);
  });
  it('exits 0 once the finding is allowlisted with a reason', () => {
    fs.writeFileSync(allowFile, JSON.stringify({ findings: [{ file: 'a_module.js', rule: 'typeof-ai-gate', snippet: "typeof window.callGemini === 'function'", reason: 'fixture' }] }));
    expect(run(['--root', dir, '--allowlist', 'allow.json']).code).toBe(0);
  });
  it('skipFiles removes a teacher-only module from the scan', () => {
    fs.writeFileSync(allowFile, JSON.stringify({ skipFiles: [{ file: 'a_module.js', reason: 'teacher' }], findings: [] }));
    expect(run(['--root', dir, '--allowlist', 'allow.json']).code).toBe(0);
  });
  it('rejects an allowlist entry without a reason (exit 2)', () => {
    fs.writeFileSync(allowFile, JSON.stringify({ findings: [{ file: 'a_module.js', rule: 'typeof-ai-gate', snippet: 'typeof' }] }));
    expect(run(['--root', dir, '--allowlist', 'allow.json']).code).toBe(2);
  });
  it('fails closed (exit 2) when the host manifests cannot be parsed', () => {
    write('bad_host.txt', "loadModule('A', 'https://alloflow-cdn.pages.dev/a_module.js');");
    expect(run(['--root', dir, '--host', 'bad_host.txt', '--allowlist', 'allow.json']).code).toBe(2);
  });
});

// PROVISIONAL during the 2026-11-03/04 AI-off sweep: other lanes are still editing modules, and the
// lead regenerates dev-tools/student_ai_gating_allowlist.json at the end (--write-allowlist-draft).
describe('real scan of the modules AlloFlowANTI.txt loads', () => {
  const r = run(['--json']);
  it('derives the student-reachable module list from the host', () => {
    const host = fs.readFileSync(path.join(__dirname, '..', 'AlloFlowANTI.txt'), 'utf8');
    const files = deriveStudentModules(host).files;
    for (const f of ['fluency_module.js', 'sel_hub/sel_hub_module.js', 'stem_lab/stem_lab_module.js', 'sel_hub/sel_tool_conflict.js', 'stem_lab/stem_tool_money.js', 'arcade_mode_boss_encounter.js']) {
      expect(files.includes(f), f + ' should be host-loaded').toBe(true);
    }
    expect(r.report.scanned).toBeGreaterThan(300);
  });
  it('has no non-allowlisted student AI gating findings', () => {
    const msg = (r.report ? r.report.unallowed : []).map((x) => x.file + ':' + x.line + ' [' + x.rule + '] ' + x.snippet.slice(0, 120)).join('\n');
    expect(r.code, msg || r.text).toBe(0);
  });
});
