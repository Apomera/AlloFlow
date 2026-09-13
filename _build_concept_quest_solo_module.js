#!/usr/bin/env node
const babel = require('@babel/core');
const fs = require('fs');
const source = ['concept_quest_solo_gm_source.jsx', 'concept_quest_solo_question_source.jsx', 'concept_quest_solo_source.jsx'].map(file => fs.readFileSync(file, 'utf8')).join('\n');
const soloEngineSource = fs.readFileSync('concept_quest_solo_engine.js', 'utf8');
const storageSource = fs.readFileSync('concept_quest_solo_storage.js', 'utf8');
const engineSource = fs.readFileSync('concept_quest_engine.js', 'utf8');
const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false, configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } }
});
if (!result?.code) throw new Error('Concept Quest solo JSX compilation failed');
const moduleSource = `/** Generated from concept_quest_solo_source.jsx. */
(function() {
  'use strict';
  if (!window.AlloModules || !window.AlloModules.ConceptQuestEngine) {
    ${engineSource}
  }
  var React = window.React;
  if (!React) return;
  ${soloEngineSource}
  ${storageSource}
  ${result.code}
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptQuestSoloGM = ConceptQuestSoloGM;
  window.AlloModules.ConceptQuestSoloGMHelpers = ConceptQuestSoloGMHelpers;
  window.AlloModules.ConceptQuestSoloQuestion = ConceptQuestSoloQuestion;
  window.AlloModules.ConceptQuestSolo = ConceptQuestSolo;
  window.AlloModules.createConceptQuestSoloSession = createConceptQuestSoloSession;
  window.AlloModules.ConceptQuestSoloModule = true;
})();
`;
for (const file of ['concept_quest_solo_module.js', 'desktop/web-app/public/concept_quest_solo_module.js']) {
  if (process.argv.includes('--check')) {
    if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== moduleSource) throw new Error(file + ' needs rebuilding');
  } else fs.writeFileSync(file, moduleSource);
}
console.log(process.argv.includes('--check') ? 'Concept Quest solo build is current.' : 'Built Concept Quest solo module and public mirror.');
