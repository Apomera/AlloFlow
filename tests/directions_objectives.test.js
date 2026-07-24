// Directions Objectives — Phase 1 (2026-07-19): structured, checkable, NON-GATING goals inside
// the directions resource. The two pure helpers are exercised FOR REAL via eval-slice (the
// normalizer + evaluator are behavior, not pins); the wiring (composer build, view branch,
// baseline capture, celebration, derivation excerpts) is pinned. NO GATING is itself a pin.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const anti = readFileSync(resolve(process.cwd(), 'AlloFlowANTI.txt'), 'utf8');
const mirror = readFileSync(resolve(process.cwd(), 'desktop/web-app/src/AlloFlowANTI.txt'), 'utf8');

// ── eval-slice the REAL pure helpers ────────────────────────────────────────
const start = anti.indexOf('function _alloNormalizeDirectionsData(');
const end = anti.indexOf('let globalAudioCtx');
if (start < 0 || end < 0 || end <= start) throw new Error('helper slice anchors missed');
const { normalize, evaluate } = new Function(
  anti.slice(start, end) + '\nreturn { normalize: _alloNormalizeDirectionsData, evaluate: _alloEvaluateObjectives };'
)();

describe('normalizer: one reader contract for legacy strings AND structured data', () => {
  it('legacy v2 markdown string → {body, []} (backward compatible both directions)', () => {
    expect(normalize('**Due:** Friday\n\nRead the text.')).toEqual({ body: '**Due:** Friday\n\nRead the text.', objectives: [], softGate: false });
    expect(normalize('')).toEqual({ body: '', objectives: [], softGate: false });
    expect(normalize(null)).toEqual({ body: '', objectives: [], softGate: false });
    expect(normalize(42)).toEqual({ body: '', objectives: [], softGate: false });
  });
  it('structured data passes through; malformed objectives are dropped, never crash', () => {
    const good = { id: 'a', label: 'Earn 25 XP', kind: 'xp', amount: 25 };
    const out = normalize({ body: 'Do the things.', objectives: [good, null, { id: 'b' }, { id: 'c', label: 'x', kind: 'teleport' }, 'junk'] });
    expect(out.body).toBe('Do the things.');
    expect(out.objectives).toEqual([good]);
    expect(normalize({ body: 7, objectives: 'nope' })).toEqual({ body: '', objectives: [], softGate: false });
    // softGate only passes through as the LITERAL true — anything else normalizes to false
    expect(normalize({ body: 'x', objectives: [], softGate: true }).softGate).toBe(true);
    expect(normalize({ body: 'x', objectives: [], softGate: 'yes' }).softGate).toBe(false);
  });
});

describe('evaluator: XP is a DELTA from the first-view baseline', () => {
  const xpObj = [{ id: 'x1', label: 'Earn 50 XP', kind: 'xp', amount: 50 }];
  it('lifetime XP never auto-completes tonight\'s goal (no baseline → progress 0)', () => {
    const [r] = evaluate(xpObj, { globalPoints: 5000 }, {});
    expect(r.done).toBe(false);
    expect(r.progressText).toBe('0/50 XP');
  });
  it('delta from baseline drives progress and completion', () => {
    expect(evaluate(xpObj, { globalPoints: 5030 }, { xpBaseline: 5000 })[0]).toMatchObject({ done: false, progressText: '30/50 XP' });
    expect(evaluate(xpObj, { globalPoints: 5050 }, { xpBaseline: 5000 })[0].done).toBe(true);
    // progress display caps at the target (61/50 would read as a bug to a kid)
    expect(evaluate(xpObj, { globalPoints: 5061 }, { xpBaseline: 5000 })[0].progressText).toBe('50/50 XP');
  });
});

describe('evaluator: game completions count only AFTER the assignment started', () => {
  const gameObj = [{ id: 'g1', label: 'Complete the Crossword', kind: 'game', gameType: 'crossword' }];
  const signals = (completedAt) => ({ gameCompletions: { crossword: [{ resourceId: 'r9', completedAt }] } });
  it('an old completion (before startedAt) does not count; a new one does', () => {
    const prog = { startedAt: '2026-07-19T18:00:00.000Z' };
    expect(evaluate(gameObj, signals('2026-07-18T10:00:00.000Z'), prog)[0].done).toBe(false);
    expect(evaluate(gameObj, signals('2026-07-19T19:00:00.000Z'), prog)[0].done).toBe(true);
  });
  it('resourceRef narrows to a specific resource when set', () => {
    const scoped = [{ ...gameObj[0], resourceRef: 'other-resource' }];
    expect(evaluate(scoped, signals('2026-07-19T19:00:00.000Z'), { startedAt: '2026-07-19T18:00:00.000Z' })[0].done).toBe(false);
  });
  it('manual goals honor only the honest checkbox', () => {
    const man = [{ id: 'm1', label: 'I read it out loud', kind: 'manual' }];
    expect(evaluate(man, {}, {})[0].done).toBe(false);
    expect(evaluate(man, {}, { manual: { m1: true } })[0].done).toBe(true);
  });
});

describe('wiring pins', () => {
  it('composer builds structured data ONLY when goals exist (plain string otherwise)', () => {
    expect(anti).toContain("const _dirData = _objectives.length ? { body: md, objectives: _objectives, ...(d.softGate ? { softGate: true } : {}) } : md;");
    expect(anti).toContain("data: _dirData,");
  });
  it("the 'directions' view branch exists (the type previously rendered a BLANK content area)", () => {
    expect(anti).toContain("activeView === 'directions' && generatedContent?.type === 'directions'");
    expect(anti).toContain('_alloEvaluateObjectives(_dir.objectives, { globalPoints, gameCompletions }, _dirProg)');
    expect(anti).toContain('parseMarkdownToHTML(_dir.body)');
  });
  it('baseline captures on FIRST view; celebration fires once via the existing bot event', () => {
    expect(anti).toContain('if (prev[dirId] && prev[dirId].startedAt) return prev;');
    expect(anti).toContain("xpBaseline: (typeof globalPoints === 'number' ? globalPoints : 0)");
    expect(anti).toContain('if (directionsProgress[dirId] && directionsProgress[dirId].celebrated) return;');
    expect(anti).toMatch(/all_done[\s\S]{0,200}?success/);
  });
  it('progress persists device-locally and never clobbers storage with the initial {}', () => {
    expect(anti).toContain("storageDB.get('allo_directions_progress_v1')");
    expect(anti).toContain('if (!_directionsProgressLoadedRef.current) return; // never clobber storage with the initial {}');
  });
  it('NO GATING anywhere in Phase 1 — the checklist informs and celebrates only', () => {
    // the directions view branch must not condition any resource access on objective state
    const viewIdx = anti.indexOf("activeView === 'directions' && generatedContent?.type === 'directions'");
    const viewSlice = anti.slice(viewIdx, viewIdx + 4500);
    expect(viewSlice).not.toMatch(/locked|disabled=\{!.*done|preventDefault/i);
    expect(anti).toContain('nothing is ever locked');
  });
  it('derivation excerpts: student-safe only, bounded, teacher-only contributes NOTHING', () => {
    expect(anti).toContain('let _excerptBudget = 6000;');
    expect(anti).toContain('return txt.slice(0, 250);');
    // manifest still built exclusively from the student-safe-filtered packItems
    // (2026-07-20: TEACHER_ONLY filtering lives in _alloStudentSafeResources)
    expect(anti).toMatch(/packItems = _alloStudentSafeResources\(history\)\.filter\(h => h\.type !== 'directions'\);[\s\S]{0,1200}?packItems\.map\(it =>/);
    // privacy line untouched
    expect(anti).toContain('PRIVACY: Never mention accommodations, IEPs, disabilities, reading levels, groupings, or why any student might get different work.');
  });
  it('P2: evidence rides BOTH transports and the teacher normalizes it defensively', () => {
    // student side: channel-first, mailbox fallback, once per snapshot (re-send only on change)
    expect(anti).toContain("kind: 'hw-evidence',");
    expect(anti).toContain('if (sent.code === mbStudent.code && sent.doneCount === doneCount) continue;');
    expect(anti).toContain("if (!prog || !prog.startedAt) continue; // never started here — nothing honest to report");
    expect(anti).toContain("evidenceSent: { code: mbStudent.code, doneCount }");
    // teacher side: dispatched from the RTC datachannel AND the mailbox up-pump
    expect(anti).toContain("if (parsed && parsed.kind === 'hw-evidence') { applyHwEvidence(parsed); return; }");
    expect(anti).toContain("else if (v.kind === 'hw-evidence') applyHwEvidence(v);");
    // bounded, sanitized snapshot keyed uid|directionsId (re-sends replace, never duplicate)
    expect(anti).toContain("[v.uid + '|' + v.directionsId]:");
    expect(anti).toMatch(/objectives: \(Array\.isArray\(v\.objectives\) \? v\.objectives : \[\]\)\.slice\(0, 20\)/);
    // the panel says what it is: device-reported, formative, not a grade
    expect(anti).toContain('student-device reported — formative, not a grade');
  });
  it('P2: the soft gate NUDGES and never blocks — the open proceeds unconditionally', () => {
    const idx = anti.indexOf('Phase 2 SOFT gate');
    expect(idx).toBeGreaterThan(0);
    const slice = anti.slice(idx, idx + 1600);
    expect(slice).toContain('_softGateNudgedRef.current.add(item.id);'); // once per resource
    expect(slice).toContain('You can keep going!');
    expect(slice).not.toMatch(/return;\s*\}\s*\}\s*catch/); // no early-return escape from the open
    // the very next statements after the nudge block ARE the open (unconditional)
    expect(slice).toContain('setGeneratedContent({ ...item,');
  });
  it('QUEST MAP: the knowledge web renders from the SAME signals as the checklist, checklist stays primary', () => {
    // visited marking is device-local, reserved-key, set on resource OPEN
    expect(anti).toContain("const vis = (prev._visited && typeof prev._visited === 'object') ? prev._visited : {};");
    // the map is an accessible IMAGE with a spoken progress summary; the checklist remains the interactive primary
    expect(anti).toMatch(/svg role="img" aria-label=\{\(t\('directions\.map_summary'\)/);
    // per-type station design now comes from the shared registry (superseded the old
    // two-shape _isStemStation rule — see directions_quest_map_travel.test.js)
    expect(anti).not.toContain('_isStemStation');
    expect(anti).toContain('const st = _alloStationStyle(it.type);');
    expect(anti).toMatch(/_goalRefIdx\(_dir\.objectives\[j\] \|\| \{\}\)/); // resourceRef'd goals tether to their station
    // map items = student-safe pack only, bounded
    expect(anti).toContain(".filter(h => h && h.id && h.type && h.type !== 'directions' && !TEACHER_ONLY_TYPES.includes(h.type)).slice(0, 12);");
  });
  it('TRANSLATION: directions branch translates prose + labels ONLY, machinery + meta object survive', () => {
    const pk = readFileSync(resolve(process.cwd(), 'phase_k_helpers_source.jsx'), 'utf8');
    const pkm = readFileSync(resolve(process.cwd(), 'phase_k_helpers_module.js'), 'utf8');
    // exact pins on the SOURCE; formatting-tolerant markers on the BUILT module (the build
    // normalizes quotes/spacing, so exact-string pins only hold on the source).
    expect(pk).toContain('Translate these student-facing assignment directions into');
    expect(pk).toContain('{"title": "...", "body": "...", "labels": ["..."]}');
    // labels merge back BY INDEX with per-entry fallback; ids/kinds/amounts spread through untouched
    expect(pk).toMatch(/objectives: \(Array\.isArray\(_dSrc\.objectives\) \? _dSrc\.objectives : \[\]\)\.map\(\(o, i\) =>/);
    // meta OBJECT preserved (the generic return would stringify derivedFrom provenance)
    expect(pk).toContain("meta: (item.meta && typeof item.meta === 'object') ? { ...item.meta, translatedTo: targetLanguage } : item.meta,");
    expect(pkm).toContain('Translate these student-facing assignment directions into');
    expect(pkm).toMatch(/translatedTo: targetLanguage/);
    expect(pkm).toMatch(/_dLbls\[i\]/);
  });
  it('mirror parity', () => {
    expect(mirror).toBe(anti);
  });
});
