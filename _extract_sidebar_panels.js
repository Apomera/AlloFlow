#!/usr/bin/env node
/**
 * _extract_sidebar_panels.js — automated sidebar tool panel extraction.
 *
 * Round 8+ accelerator. Auto-discovers every `expandedTools.includes('X') && (…)`
 * JSX block in AlloFlowANTI.txt, runs scope-aware dep enumeration on each,
 * generates source.jsx + build script + integration patch + (optionally)
 * applies the patch and recompiles.
 *
 * Built after Rounds 3-7 proved the extraction recipe is uniform enough that
 * sidebar panels (which all follow `expandedTools.includes('X') && (<div>…)`)
 * can be batched in a single automated pass.
 *
 * Usage:
 *   node _extract_sidebar_panels.js              # dry-run (writes to c:/tmp/, reports plan)
 *   node _extract_sidebar_panels.js --apply      # applies the patch + recompiles
 *   node _extract_sidebar_panels.js --apply --compile-only   # rebuild module without re-extracting
 *
 * Outputs (in --apply mode):
 *   - view_sidebar_panels_source.jsx              (one component per panel)
 *   - _build_view_sidebar_panels_module.js        (esbuild wrapper)
 *   - view_sidebar_panels_module.js               (compiled CDN module)
 *   - prismflow-deploy/public/view_sidebar_panels_module.js  (synced)
 *   - AlloFlowANTI.txt                            (panels replaced with React.createElement calls)
 *   - build.js                                    (MODULES array updated)
 *
 * Outputs (dry-run, all in c:/tmp/):
 *   - sidebar_panels_plan.txt    (human-readable summary)
 *   - sidebar_panels_source.jsx
 *   - sidebar_panels_replacements.json
 *
 * Edge cases handled:
 *   - IIFE-wrapped panels (`X && (() => {})()`) — flagged for manual review (not auto-extracted)
 *   - Portal-wrapped panels (`X && ReactDOM.createPortal(…)`) — flagged
 *   - Latent-bug detection: any prop not declared anywhere in the monolith is flagged
 *     as a likely production bug (same class as `handleAudio`, `updatePdfPreview`, etc.)
 *   - Lucide icons auto-resolved via _lazyIcon in the build wrapper (filtered out of props)
 *   - Tool names with dashes auto-converted to CamelCase identifiers
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = __dirname;
const SOURCE_FILE = path.join(ROOT, 'AlloFlowANTI.txt');
const SOURCE_JSX = path.join(ROOT, 'view_sidebar_panels_source.jsx');
const BUILD_SCRIPT = path.join(ROOT, '_build_view_sidebar_panels_module.js');
const MODULE_OUT = path.join(ROOT, 'view_sidebar_panels_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'view_sidebar_panels_module.js');
const BUILD_JS = path.join(ROOT, 'build.js');
const VERIFY_TOOL = path.join(ROOT, 'dev-tools', 'verify_view_props.cjs');
const SCOPE_TOOL = path.join(ROOT, 'dev-tools', 'enumerate_block_scope_aware.js');

const APPLY = process.argv.includes('--apply');
const COMPILE_ONLY = process.argv.includes('--compile-only');

const { parse } = require(path.join(ROOT, 'node_modules', '@babel', 'parser'));

const ICONS = new Set([
  'Activity','AlertCircle','AlignJustify','ArrowDown','ArrowLeft','ArrowRight','ArrowUp','Award',
  'Backpack','Ban','BarChart2','BarChart3','BookOpen','Brain','Calendar','Check','CheckCircle','CheckCircle2',
  'CheckSquare','ChevronDown','ChevronLeft','ChevronRight','ChevronUp','ClipboardList','Clock',
  'Cpu','DoorOpen','Download','Ear','Edit2','ExternalLink','Eye','EyeOff','FileDown','FileText',
  'Filter','Flag','FolderOpen','Gamepad2','GitMerge','Globe','GraduationCap','GripVertical',
  'Headphones','Heart','HelpCircle','History','ImageIcon','Info','Key','Languages','Layers',
  'Layout','Lightbulb','Link','List','ListOrdered','Loader2','Lock','MapIcon','Maximize',
  'Maximize2','MessageSquare','Mic','MicOff','Minimize','Minimize2','MonitorPlay','Music',
  'Palette','Pause','Pencil','PenTool','Play','PlayCircle','Plus','Printer','Quote','RefreshCw',
  'Save','Scale','School','Search','Send','Settings','Settings2','Share2','ShieldCheck',
  'ShoppingBag','Shuffle','Smile','Sparkles','Star','StopCircle','Target','Trash2',
  'TrendingUp','Trophy','Type','Unlock','Unplug','Upload','User','UserCheck','UserCircle2',
  'Users','Volume2','VolumeX','Wand2','Wrench','X','XCircle','Zap',
]);

const GLOBALS = new Set(['ReactDOM']);  // host-mirrored to window in build wrapper

function camelize(toolName) {
  // Convert kebab-case / mixed to PascalCase identifier
  return toolName
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('') + 'Panel';
}

// ── 1. Discover all sidebar panels ──
console.log('=== Phase 1: Discovery ===');
const src = fs.readFileSync(SOURCE_FILE, 'utf-8');
const sourceLines = src.split(/\r?\n/);
console.log('Parsing ' + sourceLines.length + '-line monolith with Babel...');

const ast = parse(src, {
  sourceType: 'module',
  plugins: ['jsx', 'classProperties', 'optionalChaining', 'nullishCoalescingOperator'],
  errorRecovery: true,
});

const panels = [];

function detectShape(expr) {
  let body = expr;
  while (body && body.type === 'LogicalExpression' && body.operator === '&&') body = body.right;
  if (body && body.type === 'CallExpression' && body.callee &&
      (body.callee.type === 'ArrowFunctionExpression' || body.callee.type === 'FunctionExpression')) return 'IIFE';
  if (body && body.type === 'CallExpression' && body.callee && body.callee.type === 'MemberExpression' &&
      body.callee.object && body.callee.object.name === 'ReactDOM') return 'PORTAL';
  return 'JSX';
}

function findIncludesArg(n) {
  if (!n) return null;
  if (n.type === 'CallExpression' && n.callee && n.callee.type === 'MemberExpression' &&
      n.callee.object && n.callee.object.name === 'expandedTools' &&
      n.callee.property && n.callee.property.name === 'includes' &&
      n.arguments[0] && n.arguments[0].type === 'StringLiteral') {
    return n.arguments[0].value;
  }
  if (n.type === 'LogicalExpression') return findIncludesArg(n.left) || findIncludesArg(n.right);
  return null;
}

function walk(node, parent) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(n => walk(n, parent)); return; }
  if (node.type === 'JSXExpressionContainer' && node.expression &&
      node.expression.type === 'LogicalExpression' && node.expression.operator === '&&' &&
      node.loc) {
    const toolName = findIncludesArg(node.expression);
    if (toolName) {
      panels.push({
        toolName,
        compName: camelize(toolName),
        start: node.loc.start.line,
        end: node.loc.end.line,
        lines: node.loc.end.line - node.loc.start.line + 1,
        shape: detectShape(node.expression),
      });
    }
  }
  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
    const v = node[k];
    if (v && typeof v === 'object') walk(v, node);
  }
}
walk(ast, null);

// Sort: largest first for the report; will REVERSE for integration
panels.sort((a, b) => b.lines - a.lines);
console.log('Discovered ' + panels.length + ' sidebar panels (' + panels.reduce((s,p) => s + p.lines, 0) + ' lines total)');

// ── 2. Filter out IIFE/Portal panels (need manual review) ──
const auto = panels.filter(p => p.shape === 'JSX');
const manual = panels.filter(p => p.shape !== 'JSX');
console.log('  Auto-extractable (JSX shape): ' + auto.length);
if (manual.length) {
  console.log('  Manual review needed (IIFE/PORTAL): ' + manual.length);
  for (const p of manual) console.log('    - ' + p.toolName + ' (' + p.shape + ', L' + p.start + ', ' + p.lines + ' lines)');
}

if (auto.length === 0) {
  console.log('\nNo auto-extractable panels found. Nothing to do.');
  process.exit(0);
}

// ── 3. Per-panel scope-aware dep enumeration ──
console.log('\n=== Phase 2: Per-panel dep enumeration (scope-aware) ===');
for (const p of auto) {
  const out = execSync('node "' + SCOPE_TOOL + '" "' + SOURCE_FILE + '" ' + p.start + ' ' + p.end, { encoding: 'utf-8' });
  const allDeps = out.split(/\r?\n/).filter(l => /^[A-Za-z_][A-Za-z0-9_]*$/.test(l));
  p.props = allDeps.filter(d => !ICONS.has(d) && !GLOBALS.has(d));
  p.icons = allDeps.filter(d => ICONS.has(d));
  console.log('  ' + p.toolName.padEnd(20) + ' deps: ' + allDeps.length + ' (' + p.props.length + ' props, ' + p.icons.length + ' icons)');
}

// ── 4. Latent-bug detection: flag any prop NOT declared anywhere in the monolith ──
//
// Tightened to handle the common React/JS declaration patterns that the naive
// `const NAME` regex would miss:
//   - useState/useRef/useReducer: `const [NAME, setNAME] = useState(…)`
//   - Object destructure: `const { NAME } = obj` or `const { …, NAME, … } = obj`
//   - Function declarations: `function NAME(…)`
//   - Arrow functions assigned to const/let/var: `const NAME = (…) => …`
//   - Function parameters: `function foo(NAME, …)` or `(NAME) =>`
//
// To minimize false positives, we run a SINGLE broad scan: build a set of all
// "declared" names from the monolith using Babel AST (the existing scope-aware
// enumerator's pass1 logic), then a prop is a "latent bug" only if it doesn't
// appear in that set. This matches what the runtime resolver would see.

console.log('\n=== Phase 3: Latent-bug detection ===');

// Build the set of all top-level declared names by walking AlloFlowContent's body.
// We treat AlloFlowContent's function scope as our reference scope — anything
// declared there is "in scope" at the React.createElement call site.
const declaredInMonolith = new Set();
function collectDecls(node) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) { node.forEach(collectDecls); return; }
  if (node.type === 'Identifier') return;  // leaf
  if (node.type === 'VariableDeclarator' && node.id) {
    if (node.id.type === 'Identifier') declaredInMonolith.add(node.id.name);
    else if (node.id.type === 'ArrayPattern') {
      for (const el of node.id.elements) {
        if (el && el.type === 'Identifier') declaredInMonolith.add(el.name);
      }
    } else if (node.id.type === 'ObjectPattern') {
      for (const p of node.id.properties) {
        if (p.type === 'ObjectProperty' && p.value && p.value.type === 'Identifier') declaredInMonolith.add(p.value.name);
        else if (p.type === 'RestElement' && p.argument && p.argument.type === 'Identifier') declaredInMonolith.add(p.argument.name);
      }
    }
  }
  if (node.type === 'FunctionDeclaration' && node.id) declaredInMonolith.add(node.id.name);
  if ((node.type === 'FunctionDeclaration' || node.type === 'FunctionExpression' || node.type === 'ArrowFunctionExpression') && node.params) {
    for (const p of node.params) {
      if (p.type === 'Identifier') declaredInMonolith.add(p.name);
      else if (p.type === 'ObjectPattern') {
        for (const pp of p.properties) {
          if (pp.type === 'ObjectProperty' && pp.value && pp.value.type === 'Identifier') declaredInMonolith.add(pp.value.name);
        }
      } else if (p.type === 'AssignmentPattern' && p.left && p.left.type === 'Identifier') declaredInMonolith.add(p.left.name);
    }
  }
  if (node.type === 'ImportSpecifier' && node.local) declaredInMonolith.add(node.local.name);
  if (node.type === 'ImportDefaultSpecifier' && node.local) declaredInMonolith.add(node.local.name);
  if (node.type === 'ImportNamespaceSpecifier' && node.local) declaredInMonolith.add(node.local.name);

  for (const k of Object.keys(node)) {
    if (k === 'loc' || k === 'start' || k === 'end' || k === 'range') continue;
    const v = node[k];
    if (v && typeof v === 'object') collectDecls(v);
  }
}
collectDecls(ast);
console.log('  Indexed ' + declaredInMonolith.size + ' declared names in monolith');

const latentBugs = {};
for (const p of auto) {
  const flagged = p.props.filter(propName => !declaredInMonolith.has(propName));
  if (flagged.length) latentBugs[p.compName] = flagged;
}
const totalLatentBugs = Object.values(latentBugs).reduce((s, arr) => s + arr.length, 0);
if (totalLatentBugs === 0) {
  console.log('  No latent bugs detected.');
} else {
  console.log('  ⚠  ' + totalLatentBugs + ' potential latent bugs (props referenced but not declared anywhere in monolith):');
  for (const [comp, bugs] of Object.entries(latentBugs)) {
    console.log('    ' + comp + ': ' + bugs.join(', '));
  }
  console.log('  These will be passed as undefined unless you add explicit-prop fallbacks.');
  console.log('  Same pattern as handleAudio/updatePdfPreview/etc. in prior rounds.');
}

// ── 5. Generate source.jsx ──
console.log('\n=== Phase 4: Source.jsx generation ===');

let sourceJsx = `// view_sidebar_panels_source.jsx — auto-generated by _extract_sidebar_panels.js
//
// Round 8+ sidebar tool panel bundle. Every panel below is the inner JSX of a
// \`{expandedTools.includes('X') && (<div>…)}\` block lifted from AlloFlowANTI.txt.
// Closure deps generated via scope-aware enumerator (no shadowing-bug class).
//
// ${auto.length} components, ${auto.reduce((s,p) => s + p.lines, 0)} source lines extracted.
${totalLatentBugs > 0 ? '//\n// ⚠  ' + totalLatentBugs + ' potential latent bugs flagged — see _extract_sidebar_panels.js output.\n//    Verify against host scope before deploy.\n' : ''}
`;

const replacements = {};

for (const p of auto) {
  // Inner JSX = lines (start+1) to (end-1)
  const innerJsx = sourceLines.slice(p.start, p.end - 1).join('\n');
  const destructure = (() => {
    const out = [];
    for (let i = 0; i < p.props.length; i += 4) {
      out.push('    ' + p.props.slice(i, i + 4).join(', ') + (i + 4 < p.props.length ? ',' : ''));
    }
    return out.join('\n');
  })();

  sourceJsx += `\n// ── ${p.compName}: expandedTools.includes('${p.toolName}') panel from L${p.start}-L${p.end} ──\nfunction ${p.compName}(props) {\n${p.props.length > 0 ? '  const {\n' + destructure + '\n  } = props;\n' : ''}  if (!expandedTools || !expandedTools.includes('${p.toolName}')) return null;\n  return (\n${innerJsx}\n  );\n}\n`;

  // Replacement snippet: shorthand-prop React.createElement
  const callProps = (() => {
    const out = [];
    // ALWAYS include expandedTools as a prop (it's the gate the component checks internally)
    const allProps = [...new Set(['expandedTools', ...p.props])];
    for (let i = 0; i < allProps.length; i += 5) {
      out.push('          ' + allProps.slice(i, i + 5).join(', ') + (i + 5 < allProps.length ? ',' : ''));
    }
    return out.join('\n');
  })();
  const indent = sourceLines[p.start - 1].match(/^(\s*)/)[1];
  replacements[p.compName] = `${indent}{/* ── ${p.compName} extracted to view_sidebar_panels_module.js (CDN) ── */}\n${indent}{expandedTools.includes('${p.toolName}') && window.AlloModules && window.AlloModules.${p.compName} && React.createElement(window.AlloModules.${p.compName}, {\n${callProps}\n${indent}})}`;
}

// Add expandedTools to the destructure of each component
sourceJsx = sourceJsx.replace(/const \{\n(    [a-zA-Z_,\s]*\n  )\} = props;\n  if \(!expandedTools/g, (match, group) => {
  if (group.includes('expandedTools')) return match;
  return 'const {\n    expandedTools,\n' + group + '} = props;\n  if (!expandedTools';
});

// Aggregate all icons used across all panels (de-duplicated)
const allIcons = new Set();
for (const p of auto) for (const i of p.icons) allIcons.add(i);
const sortedIcons = [...allIcons].sort();

console.log('Generated source.jsx with ' + auto.length + ' components, ' + sortedIcons.length + ' unique icons');

// ── 6. Generate build script ──
const buildScriptCode = `#!/usr/bin/env node
/**
 * Build view_sidebar_panels_module.js from view_sidebar_panels_source.jsx
 * Auto-generated by _extract_sidebar_panels.js — do not edit by hand.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'view_sidebar_panels_source.jsx');
const OUTPUT = path.join(ROOT, 'view_sidebar_panels_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'view_sidebar_panels_module.js');
const TMP = path.join(ROOT, '_tmp_view_sidebar_panels_entry.jsx');

if (!fs.existsSync(SOURCE)) { console.error('[ViewSidebarPanels] Source not found'); process.exit(1); }
fs.writeFileSync(TMP, '/* global React */\\n' + fs.readFileSync(SOURCE, 'utf-8'), 'utf-8');

console.log('[ViewSidebarPanels] Compiling with esbuild...');
try {
    execSync('npx esbuild "' + TMP + '" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="' + TMP + '.compiled.js" --target=es2020', { cwd: ROOT, stdio: 'inherit' });
} catch (e) { console.error('[ViewSidebarPanels] esbuild failed'); try { fs.unlinkSync(TMP); } catch(_){} process.exit(1); }

const compiled = fs.readFileSync(TMP + '.compiled.js', 'utf-8').replace(/\\/\\*.*global.*\\*\\/\\n/g, '').trim();
try { fs.unlinkSync(TMP); } catch(_){}
try { fs.unlinkSync(TMP + '.compiled.js'); } catch(_){}

const outputCode = \`(function() {
'use strict';
if (window.AlloModules && window.AlloModules.ViewSidebarPanelsModule) { console.log('[CDN] ViewSidebarPanelsModule already loaded, skipping'); return; }
var React = window.React || React;
var ReactDOM = window.ReactDOM;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var useContext = React.useContext;
var Fragment = React.Fragment;
var warnLog = (typeof window !== 'undefined' && window.warnLog) || console.warn.bind(console);
var debugLog = (typeof window !== 'undefined' && (window.__alloDebugLog || window.debugLog)) || function(){};
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
${sortedIcons.map(i => `var ${i} = _lazyIcon('${i}');`).join('\n')}
\${compiled}
window.AlloModules = window.AlloModules || {};
${auto.map(p => `window.AlloModules.${p.compName} = (typeof ${p.compName} !== 'undefined') ? ${p.compName} : null;`).join('\n')}
window.AlloModules.ViewSidebarPanelsModule = true;
window.AlloModules.SidebarPanels = true;  // satisfies loadModule('SidebarPanels', ...)
console.log('[CDN] ViewSidebarPanelsModule loaded — ${auto.length} panels registered');
})();
\`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
    if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
    fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) { console.warn('[ViewSidebarPanels] sync failed:', e.message); }

try { execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' }); }
catch (e) { console.error('[ViewSidebarPanels] Syntax check failed:', (e.stderr && e.stderr.toString()) || e.message); process.exit(1); }

const lineCount = outputCode.split('\\n').length;
console.log('[ViewSidebarPanels] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[ViewSidebarPanels] Synced to ' + DEPLOY_OUT);
`;

// ── 7. DRY-RUN OUTPUT (always written to c:/tmp/) ──
const planSummary = (() => {
  let s = '════════════════════════════════════════════\n';
  s += '  Sidebar Panels Extraction Plan\n';
  s += '════════════════════════════════════════════\n\n';
  s += 'Mode: ' + (APPLY ? 'APPLY (will modify monolith + build module)' : 'DRY RUN (no monolith changes)') + '\n\n';
  s += 'Component               Lines   Props   Icons   Latent Bugs\n';
  s += '─────────────────────── ──────  ──────  ──────  ───────────\n';
  let totLines = 0, totProps = 0;
  for (const p of auto) {
    totLines += p.lines;
    totProps += p.props.length;
    s += p.compName.padEnd(23) + ' ' + String(p.lines).padStart(6) + '  ' + String(p.props.length).padStart(6) + '  ' + String(p.icons.length).padStart(6) + '  ' + (latentBugs[p.compName] ? latentBugs[p.compName].length : '') + '\n';
  }
  s += '─────────────────────── ──────  ──────  ──────  ───────────\n';
  s += 'TOTAL                   ' + String(totLines).padStart(6) + '  ' + String(totProps).padStart(6) + '\n\n';
  s += 'Estimated monolith reduction: ~' + (totLines - auto.length * 12) + ' net lines\n';
  s += '  (each panel replaced by ~12-line React.createElement shorthand-prop call)\n\n';
  if (totalLatentBugs > 0) {
    s += '⚠  ' + totalLatentBugs + ' potential latent bug(s) — see "Phase 3" output above.\n';
    s += '   These props are referenced but not declared anywhere in the monolith,\n';
    s += '   meaning they will resolve to undefined at runtime. Same pattern as the\n';
    s += '   handleAudio/updatePdfPreview/etc. bugs from prior rounds. Either:\n';
    s += '     (a) Find the canonical impl and add explicit-prop wiring, or\n';
    s += '     (b) Add a stub fallback via explicit prop syntax, or\n';
    s += '     (c) Confirm the prop is genuinely safe to be undefined (rare).\n\n';
  }
  if (manual.length > 0) {
    s += '⚠  ' + manual.length + ' panel(s) skipped (IIFE/PORTAL shape requires manual extraction):\n';
    for (const p of manual) s += '   - ' + p.toolName + ' (' + p.shape + ', L' + p.start + ', ' + p.lines + ' lines)\n';
    s += '\n';
  }
  return s;
})();

fs.writeFileSync('c:/tmp/sidebar_panels_plan.txt', planSummary, 'utf-8');
fs.writeFileSync('c:/tmp/sidebar_panels_replacements.json', JSON.stringify(replacements, null, 2), 'utf-8');

if (!APPLY) {
  fs.writeFileSync('c:/tmp/sidebar_panels_source.jsx', sourceJsx, 'utf-8');
  console.log('\n=== DRY RUN — files written to c:/tmp/ ===');
  console.log('  - c:/tmp/sidebar_panels_plan.txt');
  console.log('  - c:/tmp/sidebar_panels_source.jsx');
  console.log('  - c:/tmp/sidebar_panels_replacements.json');
  console.log('\n' + planSummary);
  console.log('Re-run with --apply to actually modify the monolith + build the module.');
  process.exit(0);
}

// ── APPLY MODE ──
console.log('\n=== APPLY MODE ===');

// 8. Write source.jsx + build script to project root
fs.writeFileSync(SOURCE_JSX, sourceJsx, 'utf-8');
console.log('Wrote ' + SOURCE_JSX);
fs.writeFileSync(BUILD_SCRIPT, buildScriptCode, 'utf-8');
console.log('Wrote ' + BUILD_SCRIPT);

// 9. Run the build script to compile
console.log('\nCompiling module...');
execSync('node "' + BUILD_SCRIPT + '"', { stdio: 'inherit' });

// 10. Apply monolith patches in REVERSE line order
console.log('\nPatching monolith (REVERSE line order to keep earlier line numbers stable)...');
let monolithText = fs.readFileSync(SOURCE_FILE, 'utf-8');
const eol = monolithText.includes('\r\n') ? '\r\n' : '\n';
let monolithLines = monolithText.split(/\r?\n/);
const startCount = monolithLines.length;

// Sort REVERSE by start line
const sorted = [...auto].sort((a, b) => b.start - a.start);

for (const p of sorted) {
  // Validate boundary
  const openLine = monolithLines[p.start - 1];
  if (!openLine || !openLine.includes("expandedTools.includes('" + p.toolName + "')")) {
    console.error('FAIL: gate not at L' + p.start + ' for ' + p.compName);
    console.error('  Expected: ' + p.toolName);
    console.error('  Got:      ' + openLine);
    process.exit(1);
  }
  const repLines = replacements[p.compName].split(/\r?\n/);
  monolithLines = monolithLines.slice(0, p.start - 1).concat(repLines).concat(monolithLines.slice(p.end));
  console.log('  Replaced ' + p.compName + ' L' + p.start + '-L' + p.end + ' (' + p.lines + ' → ' + repLines.length + ')');
}

// Add loadModule call (find existing GeminiBridge or MiscPanels as anchor)
const anchorIdx = monolithLines.findIndex(l => /^\s*loadModule\('MiscPanels'/.test(l));
if (anchorIdx === -1) { console.error('FAIL: MiscPanels loadModule anchor not found'); process.exit(1); }
const loadLine = "    loadModule('SidebarPanels', 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow@main/view_sidebar_panels_module.js');";
monolithLines.splice(anchorIdx + 1, 0, loadLine);
console.log('Inserted loadModule at L' + (anchorIdx + 2));

fs.writeFileSync(SOURCE_FILE, monolithLines.join(eol), 'utf-8');
console.log('AlloFlowANTI.txt: ' + startCount + ' → ' + monolithLines.length + ' (delta ' + (monolithLines.length - startCount) + ')');

// 11. Add to build.js MODULES
console.log('\nRegistering in build.js MODULES...');
let buildJsText = fs.readFileSync(BUILD_JS, 'utf-8');
if (!buildJsText.includes("name: 'SidebarPanels'")) {
  const insertAfter = "    {\n        name: 'MiscPanels',\n        filename: 'view_misc_panels_module.js',\n        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'\n    },";
  const newEntry = "    {\n        name: 'SidebarPanels',\n        filename: 'view_sidebar_panels_module.js',\n        cdnBase: 'https://cdn.jsdelivr.net/gh/Apomera/AlloFlow'\n    },";
  if (!buildJsText.includes(insertAfter)) {
    console.error('FAIL: Could not find MiscPanels anchor in build.js');
    process.exit(1);
  }
  buildJsText = buildJsText.replace(insertAfter, insertAfter + '\n' + newEntry);
  fs.writeFileSync(BUILD_JS, buildJsText, 'utf-8');
  console.log('  Added SidebarPanels entry');
} else {
  console.log('  SidebarPanels already registered, skipping');
}

// 12. Run verifier on each component
console.log('\nVerifying with dev-tools/verify_view_props.cjs...');
let verifierFailures = 0;
for (const p of auto) {
  try {
    const out = execSync('node "' + VERIFY_TOOL + '" "' + SOURCE_FILE + '" ' + p.compName, { encoding: 'utf-8' });
    if (out.includes('PHANTOM REF')) {
      console.log('  ✗ ' + p.compName + ' — phantom refs detected');
      verifierFailures++;
      console.log(out.split('\n').filter(l => l.includes('  ') && !l.includes('Lines:')).slice(0, 5).join('\n'));
    } else {
      console.log('  ✓ ' + p.compName);
    }
  } catch (e) {
    console.log('  ✗ ' + p.compName + ' — verifier errored');
    verifierFailures++;
  }
}

console.log('\n' + planSummary);
if (verifierFailures > 0) {
  console.log('⚠  ' + verifierFailures + ' component(s) failed verification.');
  console.log('   Review and fix before running deploy.sh.');
  process.exit(1);
}
console.log('✓ All ' + auto.length + ' components verified clean.');
console.log('\nReady to deploy:');
console.log('  git add view_sidebar_panels_module.js view_sidebar_panels_source.jsx _build_view_sidebar_panels_module.js \\');
console.log('          prismflow-deploy/public/view_sidebar_panels_module.js AlloFlowANTI.txt build.js');
console.log('  bash deploy.sh "Round 8: extract ' + auto.length + ' sidebar tool panels (-' + (auto.reduce((s,p)=>s+p.lines,0) - auto.length * 12) + ' lines)"');
