#!/usr/bin/env node
// scan_shell_i18n.cjs — AST inventory of user-facing hardcoded strings in the
// APP SHELL (everything outside stem_lab/, which stem_string_inventory.cjs owns).
//
//   node dev-tools/scan_shell_i18n.cjs                 # default surface set
//   node dev-tools/scan_shell_i18n.cjs --all           # every shell source/module
//   node dev-tools/scan_shell_i18n.cjs <file> [...]    # specific files
//   node dev-tools/scan_shell_i18n.cjs --csv           # machine-readable dump
//
// WHY AST AND NOT GREP
// Two things defeat a text search here, both learned the hard way:
//   1. The translator is ALIASED per module — reading_library_module.js calls
//      tr(), stem tools call __alloT(), view_project_settings calls tx(). A grep
//      for "t(" finds none of them and a grep for "t('" finds false matches
//      inside prose. Aliases are resolved from each file's own declarations.
//   2. A key existing in ui_strings.js proves nothing about the call site. Only
//      the call site tells you whether a given literal is wrapped.
//
// A string is reported only when it is BOTH user-visible by position (JSX text,
// a UI-bearing attribute, a UI-bearing object property, or a toast argument)
// AND reads as prose rather than as an identifier, class list, URL or token.
'use strict';

const fs = require('fs');
const path = require('path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;

const ROOT = path.resolve(__dirname, '..');

// ── What counts as "shown to a person" ──────────────────────────────────────
const UI_ATTRS = new Set(['title', 'aria-label', 'aria-description', 'aria-roledescription',
  'aria-placeholder', 'aria-valuetext', 'placeholder', 'alt', 'label', 'summary', 'download']);
const UI_PROPS = new Set(['label', 'title', 'sub', 'subtitle', 'subhead', 'heading', 'desc',
  'description', 'text', 'message', 'msg', 'tooltip', 'hint', 'placeholder', 'caption', 'name',
  'cta', 'buttonText', 'body', 'note', 'tip', 'empty', 'emptyText', 'error', 'errorText',
  'confirm', 'prompt', 'question', 'answer', 'explanation', 'feedback', 'instruction',
  'instructions', 'ariaLabel', 'aria-label', 'legend', 'blurb', 'headline', 'detail', 'details',
  'summary', 'sourceLine', 'subLabel', 'helpText', 'shortLabel', 'longLabel', 'placeholderText']);
// First argument of these is spoken/announced/shown verbatim.
const UI_CALLS = new Set(['addToast', 'toast', 'alert', 'confirm', 'announce', 'announceToSR',
  'setError', 'setSpotlightMessage', 'setStatusMessage', 'speak']);

// ── --deep: see through the expression SHAPES that wrap a visible string ─────
// Everything above only matches a bare StringLiteral sitting in a watched slot.
// A string is equally visible when it is wrapped in a ternary, a template
// literal, a `+` concatenation or an `||` default — and those shapes are common.
// Measured on view_misc_panels_source.jsx (2026-08-17): the default pass
// reported 100 strings while ~20 more were hand-found in exactly these shapes,
// e.g. `{dim === 'l' ? 'Length' : 'Width'}`, `` `Move ${x} earlier` ``, the
// three AI-confidence verdicts, and a lone <option>Self-corrected</option>
// sitting between four siblings that WERE reported.
//
// Opt-in, because --gate ratchets per-file COUNTS against a baseline: turning
// this on by default would raise every count at once and fail the gate for the
// whole tree. --deep keeps its own baseline so it can ratchet independently.
let DEEP = false;
// Props that carry visible text but were not in UI_PROPS. Both confirm-dialog
// button labels lived here: their `title`/`message` siblings were watched, so a
// dialog could ship a localized question with English-only buttons.
const DEEP_PROPS = new Set(['confirmLabel', 'cancelLabel', 'okLabel', 'dismissLabel',
  'submitLabel', 'actionLabel', 'closeLabel', 'retryLabel', 'nextLabel', 'backLabel',
  'saveLabel', 'deleteLabel', 'ariaDescription', 'srLabel', 'srText', 'announcement']);

// ── Attributes/props whose string value is never prose ───────────────────────
const NEVER = new Set(['className', 'class', 'style', 'id', 'key', 'type', 'role', 'href', 'src',
  'name', 'value', 'htmlFor', 'data-help-key', 'data-testid', 'viewBox', 'd', 'fill', 'stroke',
  'transform', 'xmlns', 'width', 'height', 'rel', 'target', 'method', 'action', 'accept',
  'autoComplete', 'inputMode', 'pattern', 'lang', 'dir', 'color', 'bg', 'icon', 'emoji', 'font']);

// Identifier-ish names for a translator function. Modules alias it freely.
const TRANSLATOR = /^(t|tr|tx|ts|tt|_t|T|__t)$/;
const TRANSLATOR_LOOSE = /(^|_)(allot|i18n|translate|localize|localise)/i;

function isTranslator(name, aliases) {
  if (!name) return false;
  if (aliases.has(name)) return true;
  return TRANSLATOR.test(name) || TRANSLATOR_LOOSE.test(name);
}

// ── Prose test ───────────────────────────────────────────────────────────────
// Rejects the long tail that is technically a string in a UI slot but is not
// language: dotted keys, kebab tokens, class lists, URLs, formats, bare units.
function looksLikeProse(s) {
  const v = String(s).trim();
  if (v.length < 3 || v.length > 400) return false;
  if (!/[A-Za-z]{2}/.test(v)) return false;              // needs real letters
  if (/^https?:|^\/|^data:|^blob:|^#|^\.|^@/.test(v)) return false;
  // key.like.this, kebab-token. The /i here also swallowed ordinary capitalised
  // hyphenated ENGLISH — "Self-corrected", "Teacher-reviewed", "Comma-separated",
  // "Follow-up" — classifying real copy as a code token. That is why
  // <option>Self-corrected</option> went unreported while its four sibling
  // <option> labels were reported. Code tokens are lowercase by convention, so
  // under --deep the test is case-SENSITIVE and capitalised phrases survive.
  if (DEEP) { if (/^[a-z0-9]+([._-][a-z0-9]+)+$/.test(v)) return false; }
  else if (/^[a-z0-9]+([._-][a-z0-9]+)+$/i.test(v)) return false;
  if (/^[a-z][a-zA-Z0-9]*$/.test(v) && !/ /.test(v)) return false; // camelCase identifier
  if (/^[A-Z][A-Z0-9_]+$/.test(v)) return false;         // CONSTANT_CASE
  // Tailwind / CSS class soup: several hyphenated tokens, no sentence punctuation.
  const words = v.split(/\s+/);
  const hyphenish = words.filter(w => /[a-z]-[a-z0-9[]/.test(w) || /^(hover|focus|group|sm|md|lg|xl|dark|motion):/.test(w)).length;
  if (words.length > 1 && hyphenish >= Math.max(2, words.length / 2)) return false;
  if (/^[0-9\s.,:;%+\-*/()]+$/.test(v)) return false;    // numbers/format only
  if (/^[a-z]+\([^)]*\)$/i.test(v)) return false;        // css fn: rgba(...), var(...)
  // A single capitalised word is a legitimate button label ("Books", "Close").
  return true;
}

// ── Per-file scan ────────────────────────────────────────────────────────────
function scanFile(rel) {
  const abs = path.join(ROOT, rel);
  const code = fs.readFileSync(abs, 'utf8');
  let ast;
  try {
    ast = parser.parse(code, {
      sourceType: 'unambiguous',
      allowReturnOutsideFunction: true,
      errorRecovery: true,
      plugins: ['jsx', 'optionalChaining', 'nullishCoalescingOperator', 'classProperties', 'objectRestSpread'],
    });
  } catch (err) {
    return { rel, parseError: err.message, findings: [], localized: 0 };
  }

  // Pass 1 — collect this file's translator aliases from its own declarations,
  // e.g. `var tr = function (k, fb) {...}` or `const t = ctx.t`.
  const aliases = new Set();
  traverse(ast, {
    VariableDeclarator(p) {
      const id = p.node.id;
      if (id && id.type === 'Identifier' && (TRANSLATOR.test(id.name) || TRANSLATOR_LOOSE.test(id.name))) aliases.add(id.name);
      // const { t } = useContext(LanguageContext)
      if (id && id.type === 'ObjectPattern') {
        for (const prop of id.properties) {
          const v = prop.value || prop.argument;
          if (v && v.type === 'Identifier' && TRANSLATOR.test(v.name)) aliases.add(v.name);
        }
      }
    },
    FunctionDeclaration(p) {
      const id = p.node.id;
      if (id && (TRANSLATOR.test(id.name) || TRANSLATOR_LOOSE.test(id.name))) aliases.add(id.name);
    },
  });

  // Pass 2 — mark every literal that is an argument to a translator as covered,
  // plus the right-hand side of `t('k') || 'Fallback'` (an English default is
  // fine; the key in front of it is what gets translated).
  const covered = new Set();
  let localized = 0;
  // Property names handed to a translator as the FALLBACK of a dynamic key, e.g.
  //   tr('readinglib_theme_' + item.id, item.label)
  // Those tables are already covered, but the coverage lives at the call site,
  // far from the literal — no AST pass can join the two. Findings on such a key
  // are marked ambiguous so a person checks the consumption site rather than
  // being told a covered table is a bug.
  const fallbackProps = new Set();
  // Under --deep the fallback of `t('k') || (...)` is frequently a CONCATENATION
  // or a ternary, not a bare literal:
  //     t('sf.exact_match', { code }) || ('Exact local match: ' + code)
  // Marking only a bare StringLiteral left those fragments looking unlocalized,
  // so --deep reported already-translated sites as findings. Coverage has to
  // descend the same shapes pushExpr does, or the two disagree.
  const markCovered = (node, depth) => {
    if (!node) return;
    const d = depth || 0;
    if (node.type === 'StringLiteral') { covered.add(node.start); return; }
    if (!DEEP || d > 6) return;
    switch (node.type) {
      case 'ConditionalExpression':
        markCovered(node.consequent, d + 1); markCovered(node.alternate, d + 1); break;
      case 'LogicalExpression':
        markCovered(node.left, d + 1); markCovered(node.right, d + 1); break;
      case 'BinaryExpression':
        if (node.operator === '+') { markCovered(node.left, d + 1); markCovered(node.right, d + 1); }
        break;
      case 'TemplateLiteral':
        for (const q of node.quasis) covered.add(q.start);
        break;
      case 'JSXExpressionContainer':
        markCovered(node.expression, d + 1); break;
      default: break;
    }
  };
  traverse(ast, {
    CallExpression(p) {
      const callee = p.node.callee;
      const name = callee.type === 'Identifier' ? callee.name
        : (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') ? callee.property.name
        : null;
      if (!isTranslator(name, aliases)) return;
      localized += 1;
      for (const arg of p.node.arguments.slice(1)) {
        if (arg.type === 'MemberExpression' && arg.property.type === 'Identifier') fallbackProps.add(arg.property.name);
      }
      p.node.arguments.forEach(markCovered);
      // t('k') || 'Fallback'  /  t('k') ?? 'Fallback'
      const parent = p.parent;
      if (parent && parent.type === 'LogicalExpression' && (parent.operator === '||' || parent.operator === '??')) {
        markCovered(parent.right);
      }
      if (parent && parent.type === 'ConditionalExpression') {
        markCovered(parent.consequent); markCovered(parent.alternate);
      }
    },
  });

  // Pass 3 — classify what is left.
  const findings = [];
  const push = (node, text, why) => {
    if (covered.has(node.start)) return;
    if (!looksLikeProse(text)) return;
    findings.push({ line: node.loc ? node.loc.start.line : 0, why, text: String(text).trim().replace(/\s+/g, ' ') });
  };

  // --deep only. Descend through the shapes that wrap a visible string without
  // making it any less visible. Deliberately does NOT widen which POSITIONS are
  // watched — a className ternary stays invisible — so the extra findings are
  // real strings in slots this scanner already considered user-facing.
  // `covered` still applies, so `t('k') || 'Fallback'` stays clean.
  const pushExpr = (node, why, depth) => {
    if (!node || !DEEP) return;
    const d = depth || 0;
    if (d > 6) return;                       // pathological nesting guard
    switch (node.type) {
      case 'StringLiteral':
        push(node, node.value, why);
        break;
      case 'ConditionalExpression':          // {cond ? 'Length' : 'Width'}
        pushExpr(node.consequent, why, d + 1);
        pushExpr(node.alternate, why, d + 1);
        break;
      case 'LogicalExpression':              // {x || 'Untitled'}
        pushExpr(node.left, why, d + 1);
        pushExpr(node.right, why, d + 1);
        break;
      case 'BinaryExpression':               // {'Notch ' + dim}
        if (node.operator === '+') {
          pushExpr(node.left, why, d + 1);
          pushExpr(node.right, why, d + 1);
        }
        break;
      case 'TemplateLiteral':                // {`Move ${x} earlier`}
        // Report the literal chunks; the interpolations are values, not copy.
        // Short joiners like ": " or "/10" fall out via looksLikeProse.
        for (const q of node.quasis) {
          const raw = q.value && (q.value.cooked != null ? q.value.cooked : q.value.raw);
          if (raw && raw.trim()) push(q, raw, why);
        }
        break;
      case 'JSXExpressionContainer':
        pushExpr(node.expression, why, d + 1);
        break;
      default:
        break;
    }
  };

  traverse(ast, {
    JSXText(p) {
      const raw = p.node.value;
      if (!raw.trim()) return;
      push(p.node, raw, 'jsx-text');
    },
    JSXExpressionContainer(p) {
      // Children position only — attribute containers are handled by JSXAttribute
      // below, which knows whether the attribute is a UI-bearing one.
      if (!DEEP) return;
      if (p.parent && p.parent.type === 'JSXAttribute') return;
      pushExpr(p.node.expression, 'jsx-expr');
    },
    JSXAttribute(p) {
      const name = p.node.name && (p.node.name.name || '');
      const attr = String(name);
      if (NEVER.has(attr) && !UI_ATTRS.has(attr)) return;
      if (!UI_ATTRS.has(attr)) return;
      const v = p.node.value;
      if (v && v.type === 'StringLiteral') push(v, v.value, `attr:${attr}`);
      if (v && v.type === 'JSXExpressionContainer') {
        if (v.expression.type === 'StringLiteral') push(v.expression, v.expression.value, `attr:${attr}`);
        else pushExpr(v.expression, `attr:${attr}`);
      }
    },
    ObjectProperty(p) {
      const k = p.node.key;
      const key = k ? (k.name || k.value) : null;
      const ks = String(key);
      const watched = key && (UI_PROPS.has(ks) || (DEEP && DEEP_PROPS.has(ks)));
      if (!watched) return;
      if (NEVER.has(ks) && !UI_PROPS.has(ks) && !DEEP_PROPS.has(ks)) return;
      const v = p.node.value;
      const why = `prop:${key}${fallbackProps.has(ks) ? '?' : ''}`;
      if (v && v.type === 'StringLiteral') push(v, v.value, why);
      else pushExpr(v, why);
    },
    CallExpression(p) {
      const callee = p.node.callee;
      const name = callee.type === 'Identifier' ? callee.name
        : (callee.type === 'MemberExpression' && callee.property.type === 'Identifier') ? callee.property.name
        : null;
      if (!name || !UI_CALLS.has(name)) return;
      const first = p.node.arguments[0];
      if (first && first.type === 'StringLiteral') push(first, first.value, `call:${name}`);
      else pushExpr(first, `call:${name}`);
    },
  });

  // De-duplicate identical text on the same line (JSX splits text nodes).
  const seen = new Set();
  const unique = findings.filter(f => {
    const k = `${f.line}|${f.text}`;
    if (seen.has(k)) return false;
    seen.add(k); return true;
  }).sort((a, b) => a.line - b.line);

  return { rel, findings: unique, localized, aliases: [...aliases] };
}

// ── Target selection ─────────────────────────────────────────────────────────
// Default: the surfaces a person meets first — app shell, landing/idle panel,
// reading catalog, floating tool stack — not the whole repo.
//
// 2026-08-16: the Learning Web / knowledge-graph surfaces were added below. They
// had never been in this set, so nothing was watching them while the feature was
// built out, and they had drifted apart: the Explorer was hand-localized (55
// translator calls, 0 findings) while mind_map and concept_graph_engine were not.
// Several carry no user-facing strings at all and are listed anyway, on purpose —
// a clean file in the set is a regression test, and costs one line of output.
// All seven are plain-JS modules with NO _source.jsx pair, so the module IS the
// source; do not "correct" these to source paths.
//
// NOTE FOR ANYONE COMPARING TOTALS: adding these moved the default-set total by
// +31 (869 -> 900) on 2026-08-16 with no code change anywhere. A total from
// before that date is not comparable to one after it.
const DEFAULT_TARGETS = [
  'AlloFlowANTI.txt',
  // Added 2026-08-16: StoryForge was never in this list and this scanner had no
  // runner, so its 623 hardcoded strings had never once been reported.
  'story_forge_source.jsx',
  'reading_library_module.js',
  'catalog_module.js',
  'view_fab_stack_source.jsx',
  'view_header_source.jsx',
  'quickstart_source.jsx',
  'misc_components_source.jsx',
  'view_sidebar_panels_source.jsx',
  'view_sidebar_tabs_nav_source.jsx',
  'view_renderers_source.jsx',
  'onboarding_coach_source.jsx',
  // 2026-08-17: never watched, and it hosts the Standards Finder / lesson-direction
  // surface (the shipped Phase 5 flow) whose strings were entirely hardcoded.
  'view_misc_panels_source.jsx',
  // Learning Web / knowledge graph
  'learning_web_explorer_module.js',
  'learning_web_registry_module.js',
  'standards_context_module.js',
  'standards_provider_module.js',
  'concept_graph_engine_module.js',
  'concept_graph_3d_module.js',
  'mind_map_module.js',
];

function allShellTargets() {
  const out = [];
  for (const f of fs.readdirSync(ROOT)) {
    if (/_source\.jsx$/.test(f)) out.push(f);
    else if (/_module\.js$/.test(f) && !fs.existsSync(path.join(ROOT, f.replace(/_module\.js$/, '_source.jsx')))) out.push(f);
  }
  out.push('AlloFlowANTI.txt');
  return out;
}

const argv = process.argv.slice(2);
const wantCsv = argv.includes('--csv');
DEEP = argv.includes('--deep');
const explicit = argv.filter(a => !a.startsWith('--'));
const targets = explicit.length ? explicit : (argv.includes('--all') ? allShellTargets() : DEFAULT_TARGETS);

const results = [];
for (const rel of targets) {
  if (!fs.existsSync(path.join(ROOT, rel))) { console.error('missing:', rel); continue; }
  results.push(scanFile(rel));
}

if (wantCsv) {
  console.log('file,line,why,text');
  for (const r of results) for (const f of r.findings) {
    console.log(`${r.rel},${f.line},${f.why},"${f.text.replace(/"/g, '""')}"`);
  }
  process.exit(0);
}

let total = 0;
results.sort((a, b) => b.findings.length - a.findings.length);
for (const r of results) {
  if (r.parseError) { console.log(`\n${r.rel}\n  PARSE ERROR: ${r.parseError}`); continue; }
  total += r.findings.length;
  if (!r.findings.length) continue;
  console.log(`\n${r.rel}  —  ${r.findings.length} unlocalized / ${r.localized} translator calls  [aliases: ${r.aliases.join(', ') || 'none'}]`);
  for (const f of r.findings.slice(0, 40)) {
    console.log(`  ${String(f.line).padStart(6)}  ${f.why.padEnd(16)} ${f.text.slice(0, 110)}`);
  }
  if (r.findings.length > 40) console.log(`  ... ${r.findings.length - 40} more (use --csv)`);
}
console.log(`\n── scan_shell_i18n: ${results.length} file(s), ${total} user-facing hardcoded string(s) ──`);

// ── Gate mode ────────────────────────────────────────────────────────────────
// The shell carries ~14k hardcoded strings, so this can never be a pass/fail
// gate on absolute count. It gates on DIRECTION instead: a per-file baseline,
// failing only when a file gains new unlocalized strings. That stops the number
// growing while the backlog is worked down, which is the whole reason StoryForge
// reached 623 unnoticed — this scanner existed but nothing ever ran it.
//
//   node dev-tools/scan_shell_i18n.cjs --all --gate              # CI check
//   node dev-tools/scan_shell_i18n.cjs --all --update-baseline   # accept current
// --deep ratchets against its OWN baseline. Sharing one file would mean the
// first --deep run reported hundreds of "new" strings against a shallow
// baseline and failed the gate for every lane at once.
const BASELINE = path.join(__dirname, DEEP ? 'shell_i18n_deep_baseline.json' : 'shell_i18n_baseline.json');
if (argv.includes('--update-baseline')) {
  const snap = {};
  for (const r of results) if (!r.parseError) snap[r.rel] = r.findings.length;
  fs.writeFileSync(BASELINE, JSON.stringify(snap, null, 2) + '\n', 'utf8');
  console.log(`baseline written: ${Object.keys(snap).length} file(s) → ${path.relative(ROOT, BASELINE)}`);
  process.exit(0);
}
if (argv.includes('--gate')) {
  if (!fs.existsSync(BASELINE)) {
    console.error('no baseline — run with --all --update-baseline first');
    process.exit(1);
  }
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  const worse = [], better = [];
  for (const r of results) {
    if (r.parseError) continue;
    // A file absent from the baseline is treated as 0: a NEW file may not
    // arrive pre-loaded with hardcoded strings.
    const was = Object.prototype.hasOwnProperty.call(base, r.rel) ? base[r.rel] : 0;
    if (r.findings.length > was) worse.push({ rel: r.rel, was, now: r.findings.length });
    else if (r.findings.length < was) better.push({ rel: r.rel, was, now: r.findings.length });
  }
  if (better.length) {
    console.log('\nimproved (run --update-baseline to lock the win in):');
    for (const b of better) console.log(`  ${b.rel}: ${b.was} → ${b.now}`);
  }
  if (worse.length) {
    console.log('\n❌ new hardcoded user-facing string(s):');
    for (const w of worse) console.log(`  ${w.rel}: ${w.was} → ${w.now}  (+${w.now - w.was})`);
    console.log('\n  Wrap them in the translator this file already uses, or accept');
    console.log('  deliberately with --all --update-baseline after reading the sites.');
    process.exit(1);
  }
  console.log('✓ scan_shell_i18n gate: no file gained hardcoded strings.');
  process.exit(0);
}
