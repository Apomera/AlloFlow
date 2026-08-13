/**
 * AlloFlow View - Word Sounds Preview Card
 *
 * Extracted from AlloFlowANTI.txt activeView==='word-sounds' && !isWordSoundsMode block.
 * Source range: 27 lines body. The simplest renderer in the project — a launcher
 * card with two buttons (Pre-Activity Review, Launch Word Sounds Studio).
 * The actual modal lives in word_sounds_module.js (separate CDN module).
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.WordSoundsPreviewView) {
    console.log('[CDN] ViewWordSoundsPreviewModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewWordSoundsPreviewModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var BookOpen = _lazyIcon('BookOpen');
  var Play = _lazyIcon('Play');

  function WordSoundsPreviewView(props) {
  var generatedContent = props.generatedContent;
  var wsActivitySequence = props.wsActivitySequence;
  var setWordSoundsActivity = props.setWordSoundsActivity;
  var setIsWordSoundsMode = props.setIsWordSoundsMode;
  var setWordSoundsAutoReview = props.setWordSoundsAutoReview;
  var prepareWordSoundsSession = props.prepareWordSoundsSession;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl mb-3"
  }, "🎵"), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-slate-800 mb-2"
  }, generatedContent?.title || 'Word Sounds Studio'), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 mb-1"
  }, generatedContent?.configSummary || 'Ready to practice'), generatedContent?.data && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-violet-500 font-medium"
  }, generatedContent.data.length, " words loaded"), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-3 mt-5"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      const initialActivity = wsActivitySequence && wsActivitySequence.length > 0 ? wsActivitySequence[0] : 'counting';
      if (typeof prepareWordSoundsSession === 'function') {
        prepareWordSoundsSession({
          ...(generatedContent?.sessionConfig || {}),
          resourceId: generatedContent?.id || null,
          initialActivity
        });
      }
      setWordSoundsActivity(initialActivity);
      setIsWordSoundsMode(true);
      setWordSoundsAutoReview(true);
    },
    className: "min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-white text-violet-800 font-bold rounded-xl border-2 border-violet-300 hover:bg-violet-100 hover:border-violet-500 shadow-sm hover:shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-violet-600 focus:ring-offset-2"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 20,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block"
  }, "Teacher: Review Words & Audio"), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-medium text-violet-600"
  }, "Check or edit the lesson before students begin"))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      // Honor the lesson-plan sequence exactly like the
      // Review button above — 'counting' is only the
      // no-sequence fallback.
      const initialActivity = wsActivitySequence && wsActivitySequence.length > 0 ? wsActivitySequence[0] : 'counting';
      if (typeof prepareWordSoundsSession === 'function') {
        prepareWordSoundsSession({
          ...(generatedContent?.sessionConfig || {}),
          resourceId: generatedContent?.id || null,
          initialActivity
        });
      }
      setWordSoundsActivity(initialActivity);
      setWordSoundsAutoReview(false);
      setIsWordSoundsMode(true);
    },
    className: "min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Play, {
    size: 20,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-left"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block"
  }, "Student: Start Practice"), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-medium text-indigo-100"
  }, "Begin the prepared activities now"))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.WordSoundsPreviewView = WordSoundsPreviewView;
  window.AlloModules.ViewWordSoundsPreviewModule = true;
})();
