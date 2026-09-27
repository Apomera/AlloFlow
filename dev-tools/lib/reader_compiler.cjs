'use strict';
// Pure rendering shared by the builder and read-only verifier. No file writes.
const babel = require('@babel/core');
const INPUTS = Object.freeze(['reader_place_store.js', 'reader_support_drafts.js', 'view_simplified_source.jsx']);
const OUTPUTS = Object.freeze(['view_simplified_module.js', 'desktop/web-app/public/view_simplified_module.js']);
function renderReaderModule(sources) {
  if (!Array.isArray(sources) || sources.length !== INPUTS.length || sources.some(source => typeof source !== 'string')) throw new Error('Expected the three canonical reader source strings in declared order.');
  const source = sources.join('\n');
  const result = babel.transformSync(source, {
    plugins: [[require.resolve('@babel/plugin-transform-react-jsx'), { useBuiltIns: false }]],
    babelrc: false,
    configFile: false,
    parserOpts: { sourceType: 'script', plugins: ['jsx'] },
    generatorOpts: { jsescOption: { minimal: true } },
  });
  if (!result || !result.code) throw new Error('Babel transform failed');

  const moduleSrc = `/**
 * AlloFlow View - Simplified (Leveled Text) Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='simplified' block.
 * Source range: 1,650 lines body (largest single extraction in the project).
 * Renders: leveled text reader with immersive mode, focus/chunk/crawl/karaoke
 * overlays, side-by-side bilingual layout, define/phonics/revise/cloze/
 * add-glossary interaction modes, level check + rigor report panels,
 * complexity slider, teacher edit mode with formatting toolbar, definition/
 * phonics/revision popups, line focus, theme switcher, immersive toolbar.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.SimplifiedView) {
    console.log('[CDN] ViewSimplifiedModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewSimplifiedModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.SimplifiedView = SimplifiedView;
  window.AlloModules.ViewSimplifiedModule = true;
})();
`;

  return moduleSrc;
}
module.exports = { INPUTS, OUTPUTS, renderReaderModule };
