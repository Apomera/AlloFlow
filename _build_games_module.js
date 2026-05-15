#!/usr/bin/env node
/**
 * Build games_module.js from games_source.jsx.
 *
 * 1. Reads games_source.jsx (JSX-bearing).
 * 2. Compiles JSX -> React.createElement via esbuild.
 * 3. Wraps in IIFE with:
 *    - duplicate-load guard
 *    - React hook aliases
 *    - Lucide icon aliases via window.AlloIcons
 *    - LanguageContext from window
 * 4. Registers all game components on window.AlloModules.
 * 5. Writes games_module.js + syncs to prismflow-deploy/public/.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SOURCE = path.join(ROOT, 'games_source.jsx');
const OUTPUT = path.join(ROOT, 'games_module.js');
const DEPLOY_OUT = path.join(ROOT, 'prismflow-deploy', 'public', 'games_module.js');
const MONOLITH = path.join(ROOT, 'AlloFlowANTI.txt');
const TMP = path.join(ROOT, '_tmp_games_entry.jsx');
const TMP_COMPILED = TMP + '.compiled.js';

if (!fs.existsSync(SOURCE)) {
  console.error('Source not found:', SOURCE);
  process.exit(1);
}

const source = fs.readFileSync(SOURCE, 'utf-8');

// Auto-detect Lucide icons used in the source
function detectIcons() {
  let stripped = source;
  stripped = stripped.replace(/\/\/[^\n]*/g, '');
  stripped = stripped.replace(/\/\*[\s\S]*?\*\//g, '');
  stripped = stripped.replace(/'(?:\\.|[^'\\\n])*'/g, "''");
  stripped = stripped.replace(/"(?:\\.|[^"\\\n])*"/g, '""');
  // NOTE: do NOT strip template literals here. The regex
  // `([^`\\]|\\.)*` cannot handle nested templates like
  // className={`...${expr}...`} — backticks pair up wrong and the regex
  // can gobble hundreds of lines, dropping <Type>, <Eye>, <Search> etc.
  // from the icon scan and producing runtime "X is not defined" errors.
  // (See May 2026: <Type> at line 5586 vanished this way and broke
  // WordSoundsModal / StudentAnalytics on the deployed build.)
  // We tolerate the rare false positive of catching <Capitalized> inside
  // a string literal — it'd just yield an alias that's harmless if unused.

  const jsxRefs = new Set();
  const jsxRe = /<\s*([A-Z][A-Za-z0-9]+)\b/g;
  let m;
  while ((m = jsxRe.exec(stripped)) !== null) jsxRefs.add(m[1]);

  const monolith = fs.readFileSync(MONOLITH, 'utf-8');
  const alloIconsMatch = monolith.match(/window\.AlloIcons\s*=\s*\{([\s\S]*?)\};/);
  if (!alloIconsMatch) {
    console.error('FAIL: could not find window.AlloIcons declaration in AlloFlowANTI.txt');
    process.exit(1);
  }
  const alloIcons = new Set();
  const iconBody = alloIconsMatch[1];
  const idRe = /[A-Za-z_$][A-Za-z0-9_$]*/g;
  let im;
  while ((im = idRe.exec(iconBody)) !== null) alloIcons.add(im[0]);

  const KNOWN_COMPONENTS = new Set([
    'React', 'Fragment', 'ConfettiExplosion', 'MatchVisuals',
    'SpeakButton', 'GameThemeToggle', 'GameReviewScreen',
  ]);

  const icons = [];
  for (const ref of [...jsxRefs].sort()) {
    if (KNOWN_COMPONENTS.has(ref)) continue;
    if (alloIcons.has(ref)) {
      icons.push(ref);
    } else {
      // Check if it's an internal component defined in the source
      const defRe = new RegExp(`(?:const|function|var|let)\\s+${ref}\\b`);
      if (defRe.test(source)) continue;
      console.warn(`  WARN: <${ref}> not in AlloIcons and not a known component — skipping`);
    }
  }
  return icons;
}

const ICONS = detectIcons();
console.log(`[icon-scan] auto-detected ${ICONS.length} Lucide icons: ${ICONS.join(', ')}`);

// Game components to register
const GAMES = [
  'MemoryGame', 'MatchingGame', 'TimelineGame', 'ConceptSortGame',
  'VennGame', 'CauseEffectSortGame', 'PipelineBuilderGame', 'CrosswordGame', 'SyntaxScramble',
  'BingoGame', 'StudentBingoGame', 'WordScrambleGame',
  'TChartSortGame', 'ConceptMapSortGame', 'OutlineSortGame',
  'FishboneSortGame', 'ProblemSolutionSortGame',
  'MultiZoneSortGame', 'FrayerSortGame', 'SeeThinkWonderSortGame', 'StoryMapSortGame'
];

const entry = `
/* global React */
${source}
window.__gamesExports = { ${GAMES.join(', ')} };
`;

fs.writeFileSync(TMP, entry, 'utf-8');

console.log('Compiling games_source.jsx with esbuild...');
try {
  execSync(
    `npx esbuild "${TMP}" --bundle=false --format=esm --jsx=transform --jsx-factory=React.createElement --jsx-fragment=React.Fragment --outfile="${TMP_COMPILED}" --target=es2020`,
    { cwd: ROOT, stdio: 'inherit' }
  );
} catch (e) {
  console.error('esbuild compilation failed');
  try { fs.unlinkSync(TMP); } catch (_) {}
  process.exit(1);
}

const compiled = fs.readFileSync(TMP_COMPILED, 'utf-8')
  .replace(/\/\*.*global.*\*\/\n/g, '')
  .replace(/window\.__gamesExports\s*=\s*\{[^}]+\};?\s*/, '')
  .trim();

try { fs.unlinkSync(TMP); } catch (_) {}
try { fs.unlinkSync(TMP_COMPILED); } catch (_) {}

const iconAliases = ICONS.map(n => `var ${n} = _icons.${n} || function() { return null; };`).join('\n');
const moduleRegistration = GAMES.map(g => `  window.AlloModules.${g} = ${g};`).join('\n');

const outputCode = `/**
 * AlloFlow Games Bundle Module
 *
 * Contains: ${GAMES.join(', ')}
 *
 * Auto-generated by _build_games_module.js — DO NOT EDIT MANUALLY.
 * Source: games_source.jsx
 */
(function() {
  'use strict';

  // ── Duplicate-load guard ──
  if (window.__gamesModuleLoaded) {
    console.warn('[GamesBundle] Already loaded — skipping');
    return;
  }
  window.__gamesModuleLoaded = true;

  // ── React dependencies ──
  var React = window.React;
  if (!React) { console.error('[GamesBundle] React not found on window'); return; }
  var useState = React.useState;
  var useEffect = React.useEffect;
  var useRef = React.useRef;

  var useCallback = React.useCallback;
  var useMemo = React.useMemo;
  var useContext = React.useContext;

  // ── App dependencies from window ──
  var LanguageContext = window.AlloLanguageContext || React.createContext({ t: function(k) { return k; } });
  var fisherYatesShuffle = window.fisherYatesShuffle;
  var getGlobalAudioContext = window.getGlobalAudioContext || function() { return null; };
  var warnLog = (typeof window.__alloWarnLog === 'function') ? window.__alloWarnLog : function() { console.warn.apply(console, arguments); };

  // ── Local utilities ──
  var scrambleWord = function(word) {
    if (!word || word.length < 2) return word;
    var arr = word.split('');
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    var result = arr.join('');
    return result === word ? scrambleWord(word) : result;
  };

  // ── Lucide icons from host app ──
  var _icons = window.AlloIcons || {};
${iconAliases}

  // ── Shared components from host app ──
  var _mods = window.AlloModules || {};
  var ConfettiExplosion = _mods.ConfettiExplosion || function() { return null; };
  var MatchVisuals = _mods.MatchVisuals || function() { return null; };

  // ═══════════════════════════════════════════════════════════════
  // GAME COMPONENTS (JSX pre-transformed by esbuild)
  // ═══════════════════════════════════════════════════════════════

${compiled}

  window.AlloModules = window.AlloModules || {};
${moduleRegistration}
  window.AlloModules.GamesBundle = true;
  console.log('[GamesBundle] ${GAMES.length} game components registered');
})();
`;

fs.writeFileSync(OUTPUT, outputCode, 'utf-8');
try {
  if (!fs.existsSync(path.dirname(DEPLOY_OUT))) fs.mkdirSync(path.dirname(DEPLOY_OUT), { recursive: true });
  fs.writeFileSync(DEPLOY_OUT, outputCode, 'utf-8');
} catch (e) {
  console.warn('Sync failed:', e.message);
}

try {
  execSync('node -c "' + OUTPUT + '"', { stdio: 'pipe' });
} catch (e) {
  console.error('[GamesBundle] Syntax check failed:');
  console.error((e.stderr && e.stderr.toString()) || e.message);
  process.exit(1);
}

const lineCount = outputCode.split('\n').length;
console.log('[GamesBundle] Built ' + OUTPUT + ' (' + lineCount + ' lines)');
console.log('[GamesBundle] Synced to ' + DEPLOY_OUT);
