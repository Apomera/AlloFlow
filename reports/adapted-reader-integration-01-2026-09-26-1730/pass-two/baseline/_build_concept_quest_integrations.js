#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const target = path.join(__dirname, 'AlloFlowANTI.txt');
const engineSource = path.join(__dirname, 'concept_quest_engine.js');
const enginePublic = path.join(__dirname, 'desktop', 'web-app', 'public', 'concept_quest_engine.js');
const engineText = fs.readFileSync(engineSource, 'utf8');
fs.mkdirSync(path.dirname(enginePublic), { recursive: true });
if (!fs.existsSync(enginePublic) || fs.readFileSync(enginePublic, 'utf8') !== engineText) {
  fs.writeFileSync(enginePublic, engineText, 'utf8');
  console.log('Updated desktop/public Concept Quest engine mirror.');
}
let source = fs.readFileSync(target, 'utf8');
const originalSource = source;
const replacements = [
  [
    'getState: () => ({ escapeRoomState, escapeTimeLeft, isEscapeTimerRunning, inputText, activeSessionCode, sessionData, user, activeSessionAppId }),',
    'getState: () => ({ escapeRoomState, escapeTimeLeft, isEscapeTimerRunning, inputText, activeSessionCode, sessionData, user, activeSessionAppId, generatedContent }),'
  ],
  [
    "const launchCollaborativeEscapeRoom = _erCall('launchCollaborativeEscapeRoom');\n  const endCollaborativeEscapeRoom",
    "const launchCollaborativeEscapeRoom = _erCall('launchCollaborativeEscapeRoom');\n  const launchConceptQuest = _erCall('launchConceptQuest');\n  const endCollaborativeEscapeRoom"
  ],
  [
    'launchCollaborativeEscapeRoom, openEscapeRoomSettings,',
    'launchCollaborativeEscapeRoom, launchConceptQuest, openEscapeRoomSettings,'
  ],
  [
    "loadModule('ConceptQuestEngineModule', 'https://alloflow-cdn.pages.dev/concept_quest_engine.js?v=be485cf73');\n    loadModule('EscapeRoomModule'",
    "loadModule('ConceptQuestEngineModule', 'https://alloflow-cdn.pages.dev/concept_quest_engine.js?v=be485cf73');\n    loadModule('ConceptQuestTeacherModule', 'https://alloflow-cdn.pages.dev/concept_quest_teacher_module.js?v=be485cf73');\n    loadModule('EscapeRoomModule'"
  ]
];
for (const [from, to] of replacements) {
  if (source.includes(to)) continue;
  if (!source.includes(from)) throw new Error('Concept Quest integration anchor missing: ' + from.slice(0, 90));
  source = source.replace(from, to);
}
if (source !== originalSource) {
  fs.writeFileSync(target, source, 'utf8');
  console.log('Updated AlloFlowANTI.txt Concept Quest integration points.');
}

const quizTarget = path.join(__dirname, 'view_quiz_source.jsx');
let quizSource = fs.readFileSync(quizTarget, 'utf8');
const quizFrom = 'history={props.history} />';
const quizTo = 'history={props.history} callGemini={props.callGemini} />';
if (!quizSource.includes(quizTo)) {
  if (!quizSource.includes(quizFrom)) throw new Error('TeacherLiveQuizControls callGemini anchor missing');
  quizSource = quizSource.replace(quizFrom, quizTo);
  fs.writeFileSync(quizTarget, quizSource, 'utf8');
  console.log('Updated view_quiz_source.jsx Class-vs-Monsters GM integration.');
}
