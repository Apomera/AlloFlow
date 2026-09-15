#!/usr/bin/env node
'use strict';
/*
 * Static sweep for the OBJECT-CHILD crash class.
 *
 * React throws "Objects are not valid as a React child" and the nearest error
 * boundary replaces the surface. On 2026-09-13 one AI list entry shaped
 * {profile, encounter} blanked Aaron's whole Curriculum Audit that way; the
 * same class was then found in the research lanes and the visual organizers.
 *
 * A prompt that declares `string` does NOT guarantee a string — that is the
 * whole point. So this scans for AI-derived values rendered DIRECTLY as React
 * children, where nothing coerces them first:
 *
 *   {entry}            inside a .map over an AI array   →  needs a text helper
 *   {data.some_field}  rendered as a child              →  needs a text helper
 *
 * A site is considered GUARDED when the expression is wrapped in a known
 * coercion (auditText, aiScalarText, auditReviewText, String(...), a typeof
 * ternary), because then a bad shape degrades to text instead of crashing.
 *
 * SCOPE: only the surfaces that render model output — the audit report, the
 * three research lanes, the organizer renderers, and the dispatcher-fed views
 * listed in AI_SURFACES. Student-authored prose and curated constants are out
 * of scope: they are not model-shaped, and guarding them would be noise.
 *
 * Exit 1 on any unguarded site.
 */
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const QUIET = process.argv.includes('--quiet');

// Sources that render model output as children.
// DISCOVERED, not hand-listed: a hand-kept list silently stops covering the
// next view someone adds, which is exactly how this class survives. Any
// *_source.jsx that reads model-produced content (generatedContent, an
// llmReview/review result, or an AI call) is a surface. Explicit entries stay
// for sources the heuristic cannot see.
const AI_SIGNAL = /generatedContent|llmReview|\.review|ctx\.ask\(|callGemini|__aiSuggestion/;
const ALWAYS = [
  'view_alignment_report_source.jsx',
  'research_lane_humanities_source.jsx',
  'research_lane_engineering_source.jsx',
  'research_lane_scientific_source.jsx',
  'research_hub_source.jsx',
  'view_renderers_source.jsx',
];
// Each candidate is read once here and reused by scanFile below: re-reading 87
// multi-megabyte sources a second time doubled the run (4.3s), which is slow
// enough that people skip the gate — and a gate nobody runs is not a gate.
const SOURCE_CACHE = new Map();
function readSource(rel) {
  if (!SOURCE_CACHE.has(rel)) {
    try { SOURCE_CACHE.set(rel, fs.readFileSync(path.join(ROOT, rel), 'utf8')); } catch (_) { SOURCE_CACHE.set(rel, null); }
  }
  return SOURCE_CACHE.get(rel);
}
const AI_SURFACES = Array.from(new Set(ALWAYS.concat(
  fs.readdirSync(ROOT)
    .filter((f) => /_source\.jsx$/.test(f))
    .filter((f) => { const s = readSource(f); return s !== null && AI_SIGNAL.test(s); })
))).sort();

// Roots whose properties come from an AI response. `review` is NOT here: in
// educator_evaluation_source.jsx it is local component state (state.review), so
// including it produced three findings that were not the crash class at all.
// llmReview stays — that name is only ever a model review.
const AI_ROOTS = ['data', 'invResult.data', 'result.data', 'pt', 'llmReview'];
// Helpers that make any shape safe to render. Per-surface coercions count too:
// _apsString (applied_challenge) and _maList (memory_aid) wrap String(), so a
// value passing through them can no longer be an object.
const COERCERS = ['auditText', 'aiScalarText', 'auditReviewText', 'auditReviewList', 'String', 'strList', 'stringList', 'aiText', '_apsString', '_apsList', '_maList'];

const coerced = (expr) => COERCERS.some((c) => expr.includes(c + '('));

// A `.filter(x => typeof x === 'string' && ...)` immediately before the map is a
// guard too: nothing but a string survives it. view_simplified_source.jsx does
// exactly that with its syllable list, and reporting it was a false positive.
const TYPEOF_FILTERED = /\.filter\(\s*(?:function\s*\(\s*)?(\w+)[^)]*\)?\s*=>?[^)]*typeof\s+\1\s*===\s*'string'/;
const typeofFiltered = (text) => TYPEOF_FILTERED.test(text);

// Coerced UPSTREAM, so a render site reading these is already safe:
//  * any array whose key contains "question" passes through the research hub's
//    enforceQuestionFormat, which flattens single-question objects to text
//    before the value ever reaches a lane;
//  * a dimension's `recommendations` in the audit report are deterministic
//    strings the pipeline pushes itself (generate_dispatcher_source.jsx
//    ~L754), never model output;
//  * organizer branch `items` are coerced to text by
//    normalizeVisualOrganizerData (view_renderers_source.jsx, `branch.items =
//    textItems`) before any renderer sees them.
// Listing them keeps the gate quiet where a guard would be pure noise — a gate
// that cries wolf is one people learn to ignore. Each entry names the coercion
// that makes it safe, so a future reader can re-check the claim.
const UPSTREAM_COERCED = [/question/i, /recommendations/, /\bb\.items\b/, /\bbranch\.items\b/];
const upstreamSafe = (expr) => UPSTREAM_COERCED.some((re) => re.test(expr));

// Not model output at all, so the crash class does not apply: values produced
// by LOCAL validators over a user's own upload (importPreview.errors comes from
// validateEvidenceGraph / importPortableBundle, never from a model). Scoping
// this out keeps every remaining hit worth acting on.
const NON_AI_SOURCES = [/importPreview/, /\berrors\b/];
const nonAiSource = (expr) => NON_AI_SOURCES.some((re) => re.test(expr));

// NUMERIC fields are a different failure mode and must NOT be text-coerced: the
// level-check rubric uses `data.score` in arithmetic (`(data.score + 5) / 10`)
// before rendering it, so a non-number degrades to a NaN width — visibly wrong,
// but it does not throw and does not cost the panel. Wrapping it in a text
// helper would be the wrong fix (it must stay a number), so it is out of scope.
const NUMERIC_FIELDS = [/\.score$/, /\.count$/, /\.percent$/, /\.index$/];
const numericField = (expr) => NUMERIC_FIELDS.some((re) => re.test(expr));

// A field normalised ON THE WAY IN is safe at every render site, however far
// away. applied_challenge_source.jsx builds its brief with
// `context: _apsString(raw.context, 4000)`, so `{data.brief.context}` can never
// be an object — but a line-local check cannot see that. Collect the field names
// a file assigns through a coercer, and treat those as guarded file-wide.
function normalizedFields(raw) {
  const names = new Set();
  // The coercer may sit anywhere in the assigned expression, including behind a
  // ternary (`drivingQuestion: mode === 'x' ? '' : _apsString(raw.q, 2000)`), so
  // take the field name and look for a coercer call before the line ends.
  const CALL = /(_apsString|_apsList|_maList|_summaryList|_summaryItemText|String|strList|stringList|auditReviewList|auditReviewText)\s*\(/;
  // (a) object properties: `drivingQuestion: _apsString(raw.q, 2000)`
  const prop = /([A-Za-z_]\w*)\s*:\s*([^,\n]*)/g;
  let m;
  while ((m = prop.exec(raw))) {
    if (CALL.test(m[2])) names.add(m[1]);
  }
  // (b) local bindings later assigned by shorthand: `const facts = _apsList(...)`
  //     then `lockedLessonFacts: facts`. Record the const name AND any property
  //     that is assigned exactly that name.
  const decl = /\b(?:const|let|var)\s+([A-Za-z_]\w*)\s*=\s*([^\n]*)/g;
  const consts = new Set();
  while ((m = decl.exec(raw))) {
    if (CALL.test(m[2])) { consts.add(m[1]); names.add(m[1]); }
  }
  const shorthand = /([A-Za-z_]\w*)\s*:\s*([A-Za-z_]\w*)\s*[,\n]/g;
  while ((m = shorthand.exec(raw))) {
    if (consts.has(m[2])) names.add(m[1]);
  }
  return names;
}

function scanFile(rel) {
  const raw = readSource(rel);
  if (raw === null) return [];
  const lines = raw.split(/\r?\n/);
  const normalized = normalizedFields(raw);
  const leafNormalized = (expr) => normalized.has(expr.split('.').pop());
  const hits = [];
  lines.forEach((line, i) => {
    // A `.map(` and the `<li>` it returns are routinely on DIFFERENT lines, so a
    // per-line view misses the very site that crashed the audit. Judge each line
    // together with the one above it (where the map and its array live).
    const prev = i > 0 ? lines[i - 1] : '';
    const line2 = prev + '\n' + line;
    // NOTE: there is deliberately no line-level "is this guarded" flag any more.
    // Both detectors below scope the question to the actual render site; see the
    // comments on each. A line-level flag is what made this gate blind on
    // 2026-09-15, and leaving one in scope invites its reuse.

    // ...but "somewhere on this line" is too coarse for a SCALAR. This codebase
    // writes whole sections as one enormous JSX line: line 509 of the audit report
    // carries both `{auditText(s)}` (student impacts) and the narrative render, so
    // a line-scoped check let the guarded sibling vouch for an unguarded one. That
    // is a gate reporting green over a real crash — found 2026-09-15 by mutation,
    // when removing a guard left the line still "guarded" by its neighbour.
    // For scalars, ask the precise question instead: is THIS expression wrapped?
    //
    // For a SCALAR, `guardedLine` is the wrong question. It asks "is there a
    // coercion somewhere on this line", and this codebase writes whole sections as
    // one enormous JSX line: line 509 of the audit report carries `{auditText(s)}`
    // for student impacts AND two separate `llmReview.narrative` renders. One
    // guarded sibling then vouched for an unguarded one, so the gate reported green
    // over a live crash (found 2026-09-15 by mutation). Counting wrapped against
    // bare occurrences does not fix it either — they are different render sites, so
    // one of two guarded still passed.
    //
    // The scalar regex below only ever matches a BARE render: it requires `{`
    // immediately before the expression, whereas a guarded site reads
    // `{auditText(expr)}`. So a match IS the defect, and no line-level coercion
    // check belongs on this path at all. `typeofFiltered` stays: a
    // `.filter(x => typeof x === 'string')` really does make every survivor safe.

    // (a) AI scalar rendered as a child: `>{data.x.y}` or `}{pt.z}`
    // Roots kept in sync with AI_ROOTS above — `review` is intentionally absent.
    //
    // `llmReview` also accepts ONE alias segment in front of it. The audit report
    // names every dimension through a short local (`var a = p.access`), so its six
    // `{a.llmReview.narrative}` renders sit behind an alias and an anchored pattern
    // could not see them at all. They are guarded upstream today — the dispatcher
    // writes `narrative: typeof review.narrative === 'string' ? ... : ''` at all
    // seven build sites — but a gate that structurally cannot look at a whole
    // surface is one bad refactor away from being useless there.
    // The alias hop is allowed ONLY for llmReview: widening it to `data` would let
    // any `x.data.y` in, and allowing it for `review` would re-admit the
    // educator_evaluation `state.review` false positives that were cleared earlier.
    const scalarRe = /[>}]\s*\{\s*((?:data|invResult\.data|result\.data|pt|llmReview|[A-Za-z_]\w*\.llmReview)(?:\.[A-Za-z_]\w*)+)\s*\}/g;
    let m;
    while ((m = scalarRe.exec(line))) {
      const expr = m[1];
      if (/\.(length|map|filter|join|size)$/.test(expr)) continue;
      if (typeofFiltered(line2)) continue;
      // NOTE: upstreamSafe is deliberately NOT applied to scalars. The hub's
      // enforceQuestionFormat only coerces ARRAYS under question-ish keys, so a
      // SCALAR like data.entities_question is not covered by it — exempting it
      // here would make this gate blind to exactly the six scalar sites fixed on
      // 2026-09-15 (verified by mutation: removing a guard must turn this red).
      if (nonAiSource(expr)) continue;
      if (numericField(expr)) continue;
      if (leafNormalized(expr)) continue;
      hits.push({ file: rel, line: i + 1, kind: 'scalar', expr, near: line.trim().slice(0, 110) });
    }

    // (b) Bare identifier as the ONLY child of a list item / chip, inside a map
    //     over an AI-rooted array on the same line.
    const childRe = /<(li|span|p|code|strong|em)\b[^>]*>\{\s*([A-Za-z_]\w*)\s*\}<\/\1>/g;
    while ((m = childRe.exec(line))) {
      const ident = m[2];
      // Look for the enclosing `.map(` on this line, then on the line above.
      const beforeOnLine = line.slice(0, m.index);
      const before = beforeOnLine.includes('.map(') ? beforeOnLine : prev + '\n' + beforeOnLine;
      const mapAt = before.lastIndexOf('.map(');
      if (mapAt < 0) continue;
      const arrayExpr = before.slice(Math.max(0, mapAt - 80), mapAt);
      const aiRooted = AI_ROOTS.some((r) => arrayExpr.includes(r + '.')) || /\b(questions|impacts|fixes|items|gaps|additions|corrections|recommendations)\b/.test(arrayExpr);
      if (!aiRooted) continue;
      // Same trap as the scalar path: `guardedLine` asked whether ANY coercion
      // appears on the line, and one long JSX line holds many render sites. Line
      // 509 of the audit report renders both the student-impact list and two
      // llmReview narratives, so the narrative guards vouched for an unguarded
      // list item — removing `auditText(s)` left the gate green (2026-09-15).
      // The regex above already matched a BARE `>{ident}</li>`; a guarded item
      // reads `>{auditText(s)}</li>` and never matches. So ask only whether THIS
      // loop variable is coerced somewhere in its own map callback, and keep the
      // genuine typeof filter, which really does make every survivor a string.
      const cbEnd = line.indexOf('})', m.index);
      const callbackText = line.slice(mapAt, cbEnd > m.index ? cbEnd : line.length);
      const identCoerced = COERCERS.some((c) => callbackText.includes(c + '(' + ident));
      if (identCoerced || typeofFiltered(line2)) continue;
      if (upstreamSafe(arrayExpr)) continue;
      if (nonAiSource(arrayExpr)) continue;
      if (leafNormalized(arrayExpr)) continue;
      hits.push({ file: rel, line: i + 1, kind: 'list-child', expr: ident, near: line.trim().slice(0, 110) });
    }
  });
  return hits;
}

const hits = AI_SURFACES.flatMap(scanFile);
const byFile = {};
for (const h of hits) (byFile[h.file] = byFile[h.file] || []).push(h);

for (const [file, list] of Object.entries(byFile)) {
  console.log(`[AI-OBJECT-CHILD] ${file} (${list.length})`);
  for (const h of list.slice(0, 8)) {
    console.log(`    line ${h.line}  ${h.kind}  {${h.expr}}`);
    console.log(`      ${h.near}`);
  }
  console.log('    An AI value rendered as a React child crashes the surface when the');
  console.log('    model returns an object. Wrap it: auditText(...) / aiScalarText(...).');
  console.log();
}

if (!QUIET) console.log(`surfaces scanned: ${AI_SURFACES.length}`);
if (hits.length === 0) {
  console.log(`✓ check_ai_object_child_render: no unguarded AI children across ${AI_SURFACES.length} surfaces.`);
} else {
  console.log(`✗ check_ai_object_child_render: ${hits.length} unguarded AI child render(s) in ${Object.keys(byFile).length} file(s).`);
}
process.exit(hits.length ? 1 : 0);
