#!/usr/bin/env node
/**
 * Reverse-compile a deployed view module to JSX source + new build script.
 *
 * Steps for each module:
 *   1. Run _reverse_compile.cjs on the deployed `view_X_module.js`
 *   2. From the reverse-compiled output, extract the inner content (helpers,
 *      icon vars, component function) — strip the IIFE wrapper that the
 *      build script will re-add.
 *   3. Write inner content as `view_X_source.jsx`
 *   4. Write a new `_build_view_X_module.js` modeled on
 *      `_build_view_header_module.js` but using Babel (not esbuild) to
 *      maximize formatting parity with the deployed file.
 *   5. Run new build, compare output to deployed.
 *
 * Usage: node reverse_migrate.cjs <stem>
 *   e.g.: node reverse_migrate.cjs faq
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = 'C:/Users/cabba/OneDrive/Desktop/UDL-Tool-Updated';
process.chdir(ROOT);

const stem = process.argv[2];
if (!stem) { console.error('Usage: node reverse_migrate.cjs <stem>'); process.exit(1); }

// Module config — derive component name from build script
const buildScript = `build_view_${stem}.js`;
const moduleFile = `view_${stem}_module.js`;
const sourceJsx = `view_${stem}_source.jsx`;
const newBuildScript = `_build_view_${stem}_module.js`;

if (!fs.existsSync(buildScript)) { console.error(`${buildScript} missing`); process.exit(1); }
if (!fs.existsSync(moduleFile)) { console.error(`${moduleFile} missing`); process.exit(1); }

// Parse legacy build script for: component name, props, icons, JSDoc
const legacyBuild = fs.readFileSync(buildScript, 'utf-8');

// Find component name from "function XxxView(props)"
const compMatch = legacyBuild.match(/function\s+(\w+)\s*\(\s*props\s*\)/);
if (!compMatch) { console.error('Could not find component name in legacy build script'); process.exit(1); }
const componentName = compMatch[1];

// Find JSDoc block from legacy module (first /** ... */ block)
const moduleSrc = fs.readFileSync(moduleFile, 'utf-8');
const jsdocMatch = moduleSrc.match(/^\/\*\*[\s\S]*?\*\/\r?\n/);
const jsdoc = jsdocMatch ? jsdocMatch[0] : `/**\n * AlloFlow ${componentName} Module\n */\n`;

console.log(`Reverse-migrating: ${stem} (component: ${componentName})`);

// ─── Step 1: reverse-compile ───
const reverseOut = `C:/tmp/_${stem}_jsx_attempt.jsx`;
execSync(`node _reverse_compile.cjs ${moduleFile} "${reverseOut}"`, { stdio: 'inherit' });

// ─── Step 2: extract inner content ───
// The reverse-compiled output has structure:
//   /** JSDoc */
//   (function () { 'use strict';
//     if (window.AlloModules && window.AlloModules.X) { ...; return; }
//     var React = window.React;
//     if (!React) { ...; return; }
//     var Fragment = React.Fragment;
//     <INNER>
//     window.AlloModules = window.AlloModules || {};
//     window.AlloModules.X = X;
//     window.AlloModules.ViewYModule = true;
//   })();
const fullReverse = fs.readFileSync(reverseOut, 'utf-8');

// Locate the inner content: from after "var Fragment = React.Fragment;"
// to before "window.AlloModules = window.AlloModules"
const innerStartRe = /var\s+Fragment\s*=\s*React\.Fragment\s*;\s*\n/;
const innerEndRe = /\n\s*window\.AlloModules\s*=\s*window\.AlloModules\s*\|\|/;
const innerStart = fullReverse.search(innerStartRe);
const innerEnd = fullReverse.search(innerEndRe);
if (innerStart < 0 || innerEnd < 0) { console.error('Could not locate inner content delimiters'); process.exit(1); }
const innerContent = fullReverse.slice(
  innerStart + fullReverse.match(innerStartRe)[0].length,
  innerEnd
).trim();

fs.writeFileSync(sourceJsx, innerContent + '\n', 'utf-8');
console.log(`Wrote ${sourceJsx} (${innerContent.length} bytes)`);

// ─── Step 3: write new build script using Babel (formatting parity) ───
// Extract registration suffix: "window.AlloModules.X = X; window.AlloModules.ViewYModule = true;"
const moduleKey = moduleSrc.match(/window\.AlloModules\.(View\w+Module)\s*=\s*true/);
const moduleKeyName = moduleKey ? moduleKey[1] : `View${componentName.replace(/View$/, '')}Module`;

const newBuildContent = `#!/usr/bin/env node
/**
 * Build ${moduleFile} from ${sourceJsx}
 * Uses @babel/core with @babel/plugin-transform-react-jsx to match the
 * formatting of the legacy build (which was the original generator).
 *
 * Auto-migrated 2026-05-19 from legacy ${buildScript} (which read from
 * a c:/tmp/ file that no longer exists / was stale).
 */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('${sourceJsx}', 'utf-8');

const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = ${'`'}${jsdoc.trimEnd()}
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.${componentName}) {
    console.log('[CDN] ${moduleKeyName} already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[${moduleKeyName}] React not found on window'); return; }
  var Fragment = React.Fragment;

  \${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.${componentName} = ${componentName};
  window.AlloModules.${moduleKeyName} = true;
})();
${'`'};

fs.writeFileSync('${moduleFile}', moduleSrc);
fs.writeFileSync('desktop/web-app/public/${moduleFile}', moduleSrc);
console.log('Wrote ${moduleFile} (' + moduleSrc.length + ' bytes)');
`;

fs.writeFileSync(newBuildScript, newBuildContent, 'utf-8');
console.log(`Wrote ${newBuildScript}`);

// ─── Step 4: backup deployed and rebuild ───
const deployedBackup = `C:/tmp/_${stem}_deployed_save.js`;
fs.copyFileSync(moduleFile, deployedBackup);

try {
  execSync(`node ${newBuildScript}`, { cwd: ROOT, stdio: 'inherit' });
} catch (e) {
  console.error('Build failed; restoring');
  fs.copyFileSync(deployedBackup, moduleFile);
  fs.copyFileSync(deployedBackup, `desktop/web-app/public/${moduleFile}`);
  process.exit(1);
}

// ─── Step 5: compare ───
const deployed = fs.readFileSync(deployedBackup);
const rebuilt = fs.readFileSync(moduleFile);

if (rebuilt.equals(deployed)) {
  console.log(`\nSUCCESS: byte-identical (${rebuilt.length} bytes)`);
} else {
  // Compute byte diff count
  let diffs = 0;
  const minLen = Math.min(rebuilt.length, deployed.length);
  for (let i = 0; i < minLen; i++) if (rebuilt[i] !== deployed[i]) diffs++;
  diffs += Math.abs(rebuilt.length - deployed.length);
  console.log(`\nPartial match: deployed=${deployed.length}b, rebuilt=${rebuilt.length}b, ${diffs} bytes differ`);
  console.log('  → Will need semantic comparison or accept rebuilt as new canonical output');

  // RESTORE deployed pending review
  fs.copyFileSync(deployedBackup, moduleFile);
  fs.copyFileSync(deployedBackup, `desktop/web-app/public/${moduleFile}`);
  console.log('  → Restored deployed file (no live change)');
}

console.log(`\nArtifacts left for review:`);
console.log(`  ${sourceJsx} (new source)`);
console.log(`  ${newBuildScript} (new build script)`);
console.log(`  ${reverseOut} (full reverse-compiled output)`);
