// Build view_timeline_module.js from the extracted Timeline JSX block.
// Mirrors build_view_dbq.js. Uses @babel/core with @babel/plugin-transform-react-jsx
// to convert JSX -> React.createElement so the module runs as plain JS in the browser.

const babel = require('@babel/core');
const fs = require('fs');

const inner = fs.readFileSync('c:/tmp/timeline_inner.txt', 'utf-8');

// Wrap the JSX block as a function with all 34 host-scope refs as
// props. The block is direct JSX (not an IIFE like DBQ), so we
// wrap with `return ( ... )`. ErrorBoundary and TimelineGame are
// React components passed in as props (they live in host scope /
// other CDN modules but get destructured here for clean access).
const wrapped = `
function TimelineView(props) {
  // Pure data refs
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var leveledTextLanguage = props.leveledTextLanguage;
  // State slices + flags
  var dismissedVerifications = props.dismissedVerifications;
  var draggedTimelineIndex = props.draggedTimelineIndex;
  var initialImageSize = props.initialImageSize;
  var timelineImageSize = props.timelineImageSize;
  var timelineRefinementInputs = props.timelineRefinementInputs;
  var timelineRevisionInput = props.timelineRevisionInput;
  var isAutoFixingTimeline = props.isAutoFixingTimeline;
  var isEditingTimeline = props.isEditingTimeline;
  var isGeneratingTimelineImage = props.isGeneratingTimelineImage;
  var isRevisingTimeline = props.isRevisingTimeline;
  var isTimelineGame = props.isTimelineGame;
  var isVerifyingTimeline = props.isVerifyingTimeline;
  // Setters
  var setDismissedVerifications = props.setDismissedVerifications;
  var setTimelineImageSize = props.setTimelineImageSize;
  var setTimelineRefinementInputs = props.setTimelineRefinementInputs;
  var setTimelineRevisionInput = props.setTimelineRevisionInput;
  // Handlers
  var handleAddTimelineStep = props.handleAddTimelineStep;
  var handleAutoFixTimeline = props.handleAutoFixTimeline;
  var handleDeleteTimelineStep = props.handleDeleteTimelineStep;
  var handleExplainTimelineItem = props.handleExplainTimelineItem;
  var handleGameCompletion = props.handleGameCompletion;
  var handleGameScoreUpdate = props.handleGameScoreUpdate;
  var handleGenerateTimelineItemImage = props.handleGenerateTimelineItemImage;
  var handleLockTimelineMode = props.handleLockTimelineMode;
  var handleSetIsTimelineGameToTrue = props.handleSetIsTimelineGameToTrue;
  var handleTimelineChange = props.handleTimelineChange;
  var handleTimelineDragEnd = props.handleTimelineDragEnd;
  var handleTimelineDragOver = props.handleTimelineDragOver;
  var handleTimelineDragStart = props.handleTimelineDragStart;
  var handleTimelineRevision = props.handleTimelineRevision;
  var handleToggleIsEditingTimeline = props.handleToggleIsEditingTimeline;
  var handleVerifyTimelineAccuracy = props.handleVerifyTimelineAccuracy;
  // Misc
  var closeTimeline = props.closeTimeline;
  // Components from host scope
  var ErrorBoundary = props.ErrorBoundary;
  var TimelineGame = props.TimelineGame;
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

if (!result || !result.code) {
  console.error('Babel transform failed');
  process.exit(1);
}

const transformedFn = result.code;

const moduleSrc = `/**
 * AlloFlow View - Timeline Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='timeline' block.
 * Source range (pre-extraction): lines 35374-35751 (~378 lines).
 * Renders the timeline editor view: drag/drop reordering, AI verify,
 * auto-fix, image generation per item, revision flow, and the
 * timeline game launcher. ErrorBoundary + TimelineGame components
 * passed in as props.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.TimelineView) {
    console.log('[CDN] ViewTimelineModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewTimelineModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  ${transformedFn}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.TimelineView = TimelineView;
  window.AlloModules.ViewTimelineModule = true;
})();
`;

fs.writeFileSync('view_timeline_module.js', moduleSrc);
console.log('Wrote view_timeline_module.js (' + moduleSrc.length + ' bytes)');
