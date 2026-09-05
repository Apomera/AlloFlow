/**
 * AlloFlow View - Word Sounds Preview Card
 *
 * Extracted from AlloFlowANTI.txt activeView==='word-sounds' && !isWordSoundsMode block.
 * Source range: 27 lines body. The simplest renderer in the project — a launcher
 * card with an educator-only review button and a learner launch button.
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
  function label(key, fallback, values) {
    var fullKey = 'word_sounds.' + key;
    var translated = typeof props.t === 'function' ? props.t(fullKey, values || {}) : '';
    var text = typeof translated === 'string' && translated && translated !== fullKey ? translated : fallback;
    return text.replace(/\{(\w+)\}/g, function (match, name) {
      return values && values[name] != null ? String(values[name]) : match;
    });
  }
  var generatedContent = props.generatedContent;
  var wsActivitySequence = props.wsActivitySequence;
  var setWordSoundsActivity = props.setWordSoundsActivity;
  var setIsWordSoundsMode = props.setIsWordSoundsMode;
  var setWordSoundsAutoReview = props.setWordSoundsAutoReview;
  var prepareWordSoundsSession = props.prepareWordSoundsSession;
  var wordSoundsAudioCoverage = props.wordSoundsAudioCoverage;
  var requestIncompleteAudioConfirmation = props.requestIncompleteAudioConfirmation;
  var missingAudioLabels = wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingLabels) ? wordSoundsAudioCoverage.missingLabels : wordSoundsAudioCoverage && Array.isArray(wordSoundsAudioCoverage.missingWords) ? wordSoundsAudioCoverage.missingWords : [];
  // Treat an omitted role as the educator view so older call sites retain the
  // review path. Learner call sites pass false explicitly.
  var isTeacherMode = props.isTeacherMode !== false;
  var launchPreparedActivity = function () {
    var initialActivity = wsActivitySequence && wsActivitySequence.length > 0 ? wsActivitySequence[0] : 'counting';
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
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-gradient-to-br from-violet-50 to-indigo-50 p-6 rounded-2xl border border-violet-200 text-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-4xl mb-3"
  }, "🎵"), /*#__PURE__*/React.createElement("h3", {
    className: "text-lg font-bold text-slate-800 mb-2"
  }, generatedContent?.title || label('preview_title', 'Word Sounds Studio')), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-600 mb-1"
  }, generatedContent?.configSummary || label('preview_ready', 'Ready to practice')), generatedContent?.data && /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-violet-500 font-medium"
  }, label('preview_word_count', '{count} words loaded', {
    count: generatedContent.data.length
  })), isTeacherMode && wordSoundsAudioCoverage && wordSoundsAudioCoverage.total > 0 && /*#__PURE__*/React.createElement("p", {
    role: "status",
    "aria-live": "polite",
    className: `mt-2 text-xs font-bold ${wordSoundsAudioCoverage.complete ? 'text-emerald-700' : 'text-amber-700'}`
  }, label('preview_audio_ready', 'Audio ready: {ready}/{total} required clips', wordSoundsAudioCoverage), !wordSoundsAudioCoverage.complete && ' — ' + label('preview_review_missing', 'Review missing audio before sending to students'), !wordSoundsAudioCoverage.complete && missingAudioLabels.length > 0 && /*#__PURE__*/React.createElement("span", {
    className: "mt-1 block font-medium text-amber-800"
  }, label('preview_missing', 'Missing: {labels}', {
    labels: missingAudioLabels.slice(0, 5).join(', ')
  }), missingAudioLabels.length > 5 && label('preview_more', ', plus {count} more', {
    count: missingAudioLabels.length - 5
  }))), /*#__PURE__*/React.createElement("div", {
    className: `grid grid-cols-1 ${isTeacherMode ? 'sm:grid-cols-2' : ''} gap-3 mt-5`
  }, isTeacherMode && /*#__PURE__*/React.createElement("button", {
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
    className: "text-start"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block"
  }, label('preview_teacher_review', 'Teacher: Review Words & Audio')), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-medium text-violet-600"
  }, label('preview_teacher_hint', 'Check or edit the lesson before students begin')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => {
      if (isTeacherMode && wordSoundsAudioCoverage && wordSoundsAudioCoverage.total > 0 && !wordSoundsAudioCoverage.complete && typeof requestIncompleteAudioConfirmation === 'function') {
        requestIncompleteAudioConfirmation(wordSoundsAudioCoverage, launchPreparedActivity);
        return;
      }
      // Honor the lesson-plan sequence exactly like the
      // Review button above — 'counting' is only the
      // no-sequence fallback.
      launchPreparedActivity();
    },
    className: "min-h-14 flex items-center justify-center gap-3 px-5 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg hover:shadow-xl transition-all motion-safe:hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-indigo-700 focus:ring-offset-2"
  }, /*#__PURE__*/React.createElement(Play, {
    size: 20,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-start"
  }, /*#__PURE__*/React.createElement("span", {
    className: "block"
  }, isTeacherMode ? label('preview_student_practice', 'Student: Start Practice') : label('preview_start', 'Start Activity')), /*#__PURE__*/React.createElement("span", {
    className: "block text-xs font-medium text-indigo-100"
  }, label('preview_start_hint', 'Begin the prepared activities now')))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.WordSoundsPreviewView = WordSoundsPreviewView;
  window.AlloModules.ViewWordSoundsPreviewModule = true;
})();
