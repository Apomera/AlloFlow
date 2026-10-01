#!/usr/bin/env node
const babel = require('@babel/core');
const fs = require('fs');
const source = fs.readFileSync('concept_quest_teacher_source.jsx', 'utf8');
const result = babel.transformSync(source, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
  generatorOpts: { jsescOption: { minimal: true } }
});
if (!result || !result.code) throw new Error('Concept Quest teacher JSX compilation failed');
const moduleSource = `/** Concept Quest teacher co-GM controls. Generated from concept_quest_teacher_source.jsx. */
(function() {
  'use strict';
  var React = window.React;
  if (!React) return;
  var _shared = window.__alloShared || {};
  var _firebase = window.__alloFirebase || {};
  var db = _shared.db;
  var doc = _firebase.doc || function() { return {}; };
  var updateDoc = _firebase.updateDoc || function() { return Promise.resolve(); };
  var warnLog = _shared.warnLog || function() { console.warn.apply(console, arguments); };
  ${result.code}
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptQuestTeacherControls = ConceptQuestTeacherControls;
  window.AlloModules.ConceptQuestTeacherModule = true;
})();
`;
fs.writeFileSync('concept_quest_teacher_module.js', moduleSource);
fs.mkdirSync('desktop/web-app/public', { recursive: true });
fs.writeFileSync('desktop/web-app/public/concept_quest_teacher_module.js', moduleSource);
console.log('Wrote concept_quest_teacher_module.js (' + moduleSource.length + ' bytes)');
