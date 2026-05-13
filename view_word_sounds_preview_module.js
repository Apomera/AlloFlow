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
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl mb-3"
  }, "\uD83C\uDFB5"), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-slate-800 mb-2"
  }, generatedContent?.title || 'Word Sounds Studio'), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 mb-1"
  }, generatedContent?.configSummary || 'Ready to practice'), generatedContent?.data && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-violet-500 font-medium"
  }, generatedContent.data.length, " words loaded"), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col sm:flex-row gap-3 justify-center mt-5"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const initialActivity = wsActivitySequence && wsActivitySequence.length > 0 ? wsActivitySequence[0] : 'counting';
      setWordSoundsActivity(initialActivity);
      setIsWordSoundsMode(true);
      setWordSoundsAutoReview(true);
    },
    className: "flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 18
  }), " Pre-Activity Review"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      setIsWordSoundsMode(true);
      setWordSoundsActivity('counting');
    },
    className: "flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all hover:scale-105"
  }, /*#__PURE__*/React.createElement(Play, {
    size: 18
  }), " Launch Word Sounds Studio"))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.WordSoundsPreviewView = WordSoundsPreviewView;
  window.AlloModules.ViewWordSoundsPreviewModule = true;
})();
