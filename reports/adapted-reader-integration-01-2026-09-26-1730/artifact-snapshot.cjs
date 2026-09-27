'use strict';
// Read-only snapshot: no builder imports, application execution, or file writes.
// Run from any cwd. --check checks required mirrors and the reader content pin.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../..');
const check = process.argv.includes('--check');
const hosts = ['AlloFlowANTI.txt', 'desktop/web-app/src/AlloFlowANTI.txt', 'desktop/web-app/src/App.jsx'];
const modules = ['view_simplified', 'pure_helpers', 'content_engine', 'app_styles', 'generation_helpers', 'read_aloud_audio_service', 'live_aac', 'shared_activity', 'view_share_session_surfaces', 'export', 'read_aloud_artifact_audio', 'utils_pure', 'immersive_reader', 'text_pipeline_helpers', 'host_handlers', 'generate_dispatcher', 'phase_n_misc_helpers', 'phase_o_misc_handlers', 'view_sidebar_panels', 'view_live_session_dock', 'view_storybook_export_modal'];
const projectPairs = ['own_sources_module.js', 'quickstart_module.js', 'view_misc_panels_module.js', 'ui_strings.js',
  'stem_lab/stem_tool_cephalopodlab.js', 'stem_lab/stem_tool_raptorhunt.js', 'stem_lab/stem_tool_evolab.js',
  ...['recipe_lab.html', 'recipe_lab.js', 'recipe_lab_engine.js', 'recipe_lab_hands.js', 'recipe_lab_hands.css', 'recipe_lab_hands_ui.js'].map(file => 'stem_lab/kitchen_studio/' + file)];
projectPairs.push('dictionary_loader.js', 'karaoke_audio_store_module.js', 'ai_backend_module.js', 'stem_lab/kitchen_studio/recipe_lab_scene.js', ...['spanish_castilian', 'spanish_latin_america', 'arabic', 'chinese_simplified', 'thai'].map(name => 'lang/' + name + '.js'));
const paths = [...hosts, 'reader_place_store.js', 'reader_support_drafts.js', '_build_view_simplified_module.js', 'dev-tools/build_adapted_reader.cjs', 'desktop/web-app/src/content_engine_source.jsx', 'dev-tools/host_handlers_wave3_manifest.json'];
for (const name of modules) paths.push(name + '_source.jsx', name + '_module.js', 'desktop/web-app/public/' + name + '_module.js');
for (const relative of projectPairs) paths.push(relative, 'desktop/web-app/public/' + relative);
const files = {};
const errors = [];
const head = () => execFileSync('git', ['--no-optional-locks', 'rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const startHead = head();
for (const relative of paths) {
  try {
    const bytes = fs.readFileSync(path.join(root, relative));
    files[relative] = { bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  } catch (error) {
    files[relative] = { error: error.code || error.message };
    if (check) errors.push('Missing/unreadable required file: ' + relative);
  }
}
const equal = (a, b) => files[a]?.sha256 && files[a].sha256 === files[b]?.sha256;
const mirrors = modules.map(name => ({ module: name, matches: !!equal(name + '_module.js', 'desktop/web-app/public/' + name + '_module.js') }));
const projectMirrors = projectPairs.map(file => ({ file, matches: !!equal(file, 'desktop/web-app/public/' + file) }));
const hostsMatch = hosts.every(file => equal(hosts[0], file));
const contentSourceMatches = !!equal('content_engine_source.jsx', 'desktop/web-app/src/content_engine_source.jsx');
const pins = {};
for (const host of hosts) {
  pins[host] = {};
  if (!files[host]?.sha256) continue;
  const text = fs.readFileSync(path.join(root, host), 'utf8');
  for (const name of modules) {
    const pattern = new RegExp("loadModule\\(\\s*['\"][^'\"]+['\"]\\s*,\\s*['\"]https://alloflow-cdn\\.pages\\.dev/" + name + "_module\\.js\\?v=([^'\"]+)['\"]\\s*\\)", 'g');
    pins[host][name] = [...text.matchAll(pattern)].map(match => match[1]);
  }
}
if (check) {
  for (const row of mirrors) if (!row.matches) errors.push('Root/public mismatch: ' + row.module);
  for (const row of projectMirrors) if (!row.matches) errors.push('Project root/public mismatch: ' + row.file);
  if (!hostsMatch) errors.push('Host files differ');
  if (!contentSourceMatches) errors.push('Content-engine source copy differs');
  for (const host of hosts) {
    for (const name of modules) if (pins[host]?.[name]?.length !== 1) errors.push('Expected one loader pin: ' + host + ' / ' + name);
    if (pins[host]?.view_simplified?.[0] !== files['view_simplified_module.js']?.sha256?.slice(0, 8)) errors.push('Reader content pin differs: ' + host);
  }
}
const endHead = head();
if (endHead !== startHead) errors.push('HEAD changed during snapshot');
console.log(JSON.stringify({ at: new Date().toISOString(), root, startHead, endHead, files, mirrors, projectMirrors, hostsMatch, contentSourceMatches, pins, errors }, null, 2));
if (check && errors.length) process.exitCode = 1;
