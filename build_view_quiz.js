// Build view_quiz_module.js — extracted from
// AlloFlowANTI.txt activeView==='quiz' block (post-Phase 1 lift, ~629 lines).
const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/mini_quiz.txt', 'utf-8');

const wrapped = `
function QuizView(props) {
  // State reads
  var t = props.t;
  var isTeacherMode = props.isTeacherMode;
  var isParentMode = props.isParentMode;
  var isIndependentMode = props.isIndependentMode;
  var activeSessionCode = props.activeSessionCode;
  var sessionData = props.sessionData;
  var isPresentationMode = props.isPresentationMode;
  var isReviewGame = props.isReviewGame;
  var isEditingQuiz = props.isEditingQuiz;
  var escapeRoomState = props.escapeRoomState;
  var escapeTimeLeft = props.escapeTimeLeft;
  var isEscapeTimerRunning = props.isEscapeTimerRunning;
  var gameTeams = props.gameTeams;
  var reviewGameState = props.reviewGameState;
  var scoreAnimation = props.scoreAnimation;
  var soundEnabled = props.soundEnabled;
  var globalPoints = props.globalPoints;
  var inputText = props.inputText;
  var presentationState = props.presentationState;
  var generatedContent = props.generatedContent;
  var isFactChecking = props.isFactChecking;
  var showQuizAnswers = props.showQuizAnswers;
  var leveledTextLanguage = props.leveledTextLanguage;
  var appId = props.appId;
  // Setters
  var setReviewGameState = props.setReviewGameState;
  var setSoundEnabled = props.setSoundEnabled;
  var setGameTeams = props.setGameTeams;
  var setEscapeRoomState = props.setEscapeRoomState;
  var setIsEscapeTimerRunning = props.setIsEscapeTimerRunning;
  var setConfirmDialog = props.setConfirmDialog;
  // Handlers (lifted in Phase 1)
  var handleStartLiveSession = props.handleStartLiveSession;
  var handleToggleInteractive = props.handleToggleInteractive;
  var handleEndLiveSession = props.handleEndLiveSession;
  // Existing handlers
  var handleToggleIsPresentationMode = props.handleToggleIsPresentationMode;
  var handleToggleIsReviewGame = props.handleToggleIsReviewGame;
  var handleToggleIsEditingQuiz = props.handleToggleIsEditingQuiz;
  var handleToggleShowQuizAnswers = props.handleToggleShowQuizAnswers;
  var handleExportQTI = props.handleExportQTI;
  var handleManualScore = props.handleManualScore;
  var handleAddTeam = props.handleAddTeam;
  var handleRemoveTeam = props.handleRemoveTeam;
  var handleReviewTileClick = props.handleReviewTileClick;
  var handleAwardPoints = props.handleAwardPoints;
  var closeReviewModal = props.closeReviewModal;
  var handlePresentationOptionClick = props.handlePresentationOptionClick;
  var togglePresentationAnswer = props.togglePresentationAnswer;
  var togglePresentationExplanation = props.togglePresentationExplanation;
  var resetPresentation = props.resetPresentation;
  var handleQuizChange = props.handleQuizChange;
  var handleReflectionChange = props.handleReflectionChange;
  var handleFactCheck = props.handleFactCheck;
  // Escape room handlers
  var endCollaborativeEscapeRoom = props.endCollaborativeEscapeRoom;
  var resetEscapeRoom = props.resetEscapeRoom;
  var launchCollaborativeEscapeRoom = props.launchCollaborativeEscapeRoom;
  var openEscapeRoomSettings = props.openEscapeRoomSettings;
  var generateEscapeRoom = props.generateEscapeRoom;
  var handlePuzzleSolved = props.handlePuzzleSolved;
  var handleSelectObject = props.handleSelectObject;
  var handleWrongAnswer = props.handleWrongAnswer;
  var handleEscapeRoomAnswer = props.handleEscapeRoomAnswer;
  var handleSequenceAnswer = props.handleSequenceAnswer;
  var handleCipherAnswer = props.handleCipherAnswer;
  var handleMatchingSelect = props.handleMatchingSelect;
  var handleScrambleAnswer = props.handleScrambleAnswer;
  var handleFillinAnswer = props.handleFillinAnswer;
  var handleFinalDoorAnswer = props.handleFinalDoorAnswer;
  var handleRevealHint = props.handleRevealHint;
  var derangeShuffle = props.derangeShuffle;
  // For TeacherLiveQuizControls pass-through
  var handleCreateGroup = props.handleCreateGroup;
  var handleAssignStudent = props.handleAssignStudent;
  var handleSetGroupResource = props.handleSetGroupResource;
  var handleSetGroupLanguage = props.handleSetGroupLanguage;
  var handleSetGroupProfile = props.handleSetGroupProfile;
  var handleDeleteGroup = props.handleDeleteGroup;
  var isPushingResource = props.isPushingResource;
  var callImagen = props.callImagen;
  var callGeminiImageEdit = props.callGeminiImageEdit;
  // Pure helpers
  var getRows = props.getRows;
  var formatInlineText = props.formatInlineText;
  var renderFormattedText = props.renderFormattedText;
  var getReviewCategories = props.getReviewCategories;
  var playSound = props.playSound;
  var addToast = props.addToast;
  // Components
  var ErrorBoundary = props.ErrorBoundary;
  var EscapeRoomTeacherControls = props.EscapeRoomTeacherControls;
  var TeacherLiveQuizControls = props.TeacherLiveQuizControls;
  var Stamp = props.Stamp;
  var ConfettiExplosion = props.ConfettiExplosion;
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
const transformedFn = result.code;

const moduleSrc = `/**
 * AlloFlow View - Quiz Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='quiz' block.
 * Source range (post-Phase 1 lift of inline Firestore handlers): ~629 lines.
 * Renders: live-session controls (start/toggle/end via lifted host handlers),
 * presentation mode (slide-by-slide quiz), review game (Jeopardy-style board),
 * escape room (delegated to AlloModules.EscapeRoomGameplay), edit/student
 * quiz card view, fact-check panel, reflections.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.QuizView) {
    console.log('[CDN] ViewQuizModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewQuizModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var Wifi = _lazyIcon('Wifi');
  var Users = _lazyIcon('Users');
  var Lock = _lazyIcon('Lock');
  var Unlock = _lazyIcon('Unlock');
  var CheckCircle = _lazyIcon('CheckCircle');
  var MonitorPlay = _lazyIcon('MonitorPlay');
  var XCircle = _lazyIcon('XCircle');
  var Gamepad2 = _lazyIcon('Gamepad2');
  var DoorOpen = _lazyIcon('DoorOpen');
  var FolderDown = _lazyIcon('FolderDown');
  var Pencil = _lazyIcon('Pencil');
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var CheckSquare = _lazyIcon('CheckSquare');
  var Volume2 = _lazyIcon('Volume2');
  var MicOff = _lazyIcon('MicOff');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Plus = _lazyIcon('Plus');
  var Brain = _lazyIcon('Brain');
  var Languages = _lazyIcon('Languages');
  var Search = _lazyIcon('Search');
  var X = _lazyIcon('X');
  var Sparkles = _lazyIcon('Sparkles');
  var ChevronUp = _lazyIcon('ChevronUp');
  var Info = _lazyIcon('Info');
  var Eye = _lazyIcon('Eye');
  var MousePointerClick = _lazyIcon('MousePointerClick');
  var MessageSquare = _lazyIcon('MessageSquare');
  var PenTool = _lazyIcon('PenTool');
  var ShieldCheck = _lazyIcon('ShieldCheck');

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.QuizView = QuizView;
  window.AlloModules.ViewQuizModule = true;
})();
`;

fs.writeFileSync('view_quiz_module.js', moduleSrc);
fs.writeFileSync('prismflow-deploy/public/view_quiz_module.js', moduleSrc);
console.log('Wrote view_quiz_module.js (' + moduleSrc.length + ' bytes)');
