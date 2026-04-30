// Build view_persona_chat_module.js — extracted from
// AlloFlowANTI.txt isPersonaChatOpen + ReactDOM.createPortal block
// (898 lines body, the <ErrorBoundary>...</ErrorBoundary> contents).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_persona_chat.txt', 'utf-8');

const wrapped = `
function PersonaChatView(props) {
  // State (object-bundle)
  var personaState = props.personaState;
  // State reads (scalar/boolean)
  var t = props.t;
  var isPersonaFreeResponse = props.isPersonaFreeResponse;
  var showPersonaHints = props.showPersonaHints;
  var personaAutoRead = props.personaAutoRead;
  var personaInput = props.personaInput;
  var personaAutoSend = props.personaAutoSend;
  var isPersonaReflectionOpen = props.isPersonaReflectionOpen;
  var personaDefinitionData = props.personaDefinitionData;
  var reflectionFeedback = props.reflectionFeedback;
  var isGradingReflection = props.isGradingReflection;
  var personaReflectionInput = props.personaReflectionInput;
  var isPersonaDefining = props.isPersonaDefining;
  var isGeneratingReflectionPrompt = props.isGeneratingReflectionPrompt;
  var isTeacherMode = props.isTeacherMode;
  var studentProjectSettings = props.studentProjectSettings;
  var dynamicReflectionQuestion = props.dynamicReflectionQuestion;
  var panelTtsPending = props.panelTtsPending;
  var personaTurnHintsViewed = props.personaTurnHintsViewed;
  var playingContentId = props.playingContentId;
  var playbackState = props.playbackState;
  // Refs
  var personaScrollRef = props.personaScrollRef;
  // Setters
  var setPersonaState = props.setPersonaState;
  var setPersonaInput = props.setPersonaInput;
  var setPersonaAutoRead = props.setPersonaAutoRead;
  var setShowPersonaHints = props.setShowPersonaHints;
  var setIsPersonaFreeResponse = props.setIsPersonaFreeResponse;
  var setIsPersonaReflectionOpen = props.setIsPersonaReflectionOpen;
  var setPersonaReflectionInput = props.setPersonaReflectionInput;
  var setReflectionFeedback = props.setReflectionFeedback;
  // Handlers
  var handleClosePersonaChat = props.handleClosePersonaChat;
  var handleGenerateReflectionPrompt = props.handleGenerateReflectionPrompt;
  var handlePanelChatSubmit = props.handlePanelChatSubmit;
  var handlePersonaChatSubmit = props.handlePersonaChatSubmit;
  var handlePersonaTopicSpark = props.handlePersonaTopicSpark;
  var handleRetryPortraitGeneration = props.handleRetryPortraitGeneration;
  var handleSavePersonaChat = props.handleSavePersonaChat;
  var handleSaveReflection = props.handleSaveReflection;
  var handleSetIsPersonaReflectionOpenToFalse = props.handleSetIsPersonaReflectionOpenToFalse;
  var handleSetPersonaDefinitionDataToNull = props.handleSetPersonaDefinitionDataToNull;
  var handleSpeak = props.handleSpeak;
  var handleTogglePersonaAutoSend = props.handleTogglePersonaAutoSend;
  var handleToggleShowPersonaHints = props.handleToggleShowPersonaHints;
  var stopPlayback = props.stopPlayback;
  // Pure helpers
  var splitTextToSentences = props.splitTextToSentences;
  var formatInteractiveText = props.formatInteractiveText;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var CharacterColumn = props.CharacterColumn;
  var HarmonyMeter = props.HarmonyMeter;
  return (
${inner}
  );
}
`;

const result = babel.transformSync(wrapped, {
  plugins: [['@babel/plugin-transform-react-jsx', { useBuiltIns: false }]],
  babelrc: false,
  configFile: false,
  parserOpts: { sourceType: 'script', plugins: ['jsx'] },
});
if (!result || !result.code) { console.error('Babel transform failed'); process.exit(1); }

const moduleSrc = `/**
 * AlloFlow View - Persona Chat Renderer
 *
 * Extracted from AlloFlowANTI.txt isPersonaChatOpen + ReactDOM.createPortal block.
 * Source range: 898 lines body. Renders the AI-persona dialog interface
 * (interview/panel modes, character columns, harmony meter, chat history,
 * sentence-level TTS playback, free-response/multiple-choice toggle, hints,
 * topic spark, reflection prompt + grading, save chat).
 *
 * The ReactDOM.createPortal wrap stays in host scope; this module exports
 * just the inner <ErrorBoundary>...</ErrorBoundary> JSX.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.PersonaChatView) {
    console.log('[CDN] ViewPersonaChatModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewPersonaChatModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Eye = _lazyIcon('Eye');
  var EyeOff = _lazyIcon('EyeOff');
  var History = _lazyIcon('History');
  var Lightbulb = _lazyIcon('Lightbulb');
  var ListChecks = _lazyIcon('ListChecks');
  var Lock = _lazyIcon('Lock');
  var MessageSquare = _lazyIcon('MessageSquare');
  var PenTool = _lazyIcon('PenTool');
  var Quote = _lazyIcon('Quote');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Save = _lazyIcon('Save');
  var Search = _lazyIcon('Search');
  var Send = _lazyIcon('Send');
  var Sparkles = _lazyIcon('Sparkles');
  var Star = _lazyIcon('Star');
  var Volume2 = _lazyIcon('Volume2');
  var VolumeX = _lazyIcon('VolumeX');
  var X = _lazyIcon('X');
  var Zap = _lazyIcon('Zap');

  ${result.code}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.PersonaChatView = PersonaChatView;
  window.AlloModules.ViewPersonaChatModule = true;
})();
`;

fs.writeFileSync('view_persona_chat_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_persona_chat_module.js', moduleSrc);
console.log('Wrote view_persona_chat_module.js (' + moduleSrc.length + ' bytes)');
