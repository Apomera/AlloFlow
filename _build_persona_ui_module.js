#!/usr/bin/env node
/** Build the Persona UI source into the root and deployable modules. */
const babel = require('@babel/core');
const fs = require('fs');

const source = fs.readFileSync('persona_ui_source.jsx', 'utf8');
const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } },
});

if (!result || !result.code) {
  console.error('Babel transform failed');
  process.exit(1);
}

const moduleSource = `(function() {
'use strict';
  // WCAG 2.2 AA: Accessibility CSS
  if (!document.getElementById("persona-ui-module-a11y")) { var _s = document.createElement("style"); _s.id = "persona-ui-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.PersonaUIModule) { console.log('[CDN] PersonaUIModule already loaded, skipping'); return; }
${result.code}
})();
`;

fs.writeFileSync('persona_ui_module.js', moduleSource);
fs.writeFileSync('desktop/web-app/public/persona_ui_module.js', moduleSource);
console.log(`Wrote Persona UI modules (${moduleSource.length} bytes)`);
