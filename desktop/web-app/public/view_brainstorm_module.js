/**
 * AlloFlow View - Brainstorm Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='brainstorm' block.
 * Source range (post-SentenceFrames): 163 lines.
 * Renders the brainstorm view: idea cards with title/description/connection,
 * teacher guides + student worksheets + cover image generation.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.BrainstormView) {
    console.log('[CDN] ViewBrainstormModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewBrainstormModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Lightbulb = _lazyIcon('Lightbulb');
  var ListChecks = _lazyIcon('ListChecks');
  var RefreshCw = _lazyIcon('RefreshCw');
  var FileText = _lazyIcon('FileText');
  var ImageIcon = _lazyIcon('ImageIcon');
  var MessageSquare = _lazyIcon('MessageSquare');
  var Users = _lazyIcon('Users');

  // ── Activity-kind bodies (2026-08-16 Activities redesign) ──────────────────
// Brainstorm data items may carry an optional `kind`: absent/'idea' renders the
// classic idea card; 'discussion' and 'jigsaw' render the structured bodies
// below. Bodies are VIEW-ONLY in v1 (no inline editing — regenerate instead);
// the shared ladder (guide/worksheet/rubric) still applies to every kind.
// Shapes are pure data (docs/ACTIVITIES_RESOURCE_DESIGN_2026-08-16.md §D4).

function DiscussionKitBody(props) {
  var t = props.t;
  var item = props.item;
  var isTeacherMode = props.isTeacherMode;
  var renderFormattedText = props.renderFormattedText;
  var protocolLabel = t('brainstorm.protocol_' + String(item.protocol || '').replace(/-/g, '_')) || {
    'socratic-seminar': 'Socratic Seminar',
    'think-pair-share': 'Think-Pair-Share',
    'fishbowl': 'Fishbowl',
    'gallery-walk': 'Gallery Walk'
  }[item.protocol] || item.protocol || 'Discussion';
  var stemCats = ['agree', 'disagree', 'clarify', 'build'];
  var stemLabels = {
    agree: t('brainstorm.stems_agree') || 'Agreeing',
    disagree: t('brainstorm.stems_disagree') || 'Disagreeing respectfully',
    clarify: t('brainstorm.stems_clarify') || 'Asking for clarity',
    build: t('brainstorm.stems_build') || 'Building on ideas'
  };
  var depthLabels = {
    literal: t('brainstorm.depth_literal') || 'Right there in the text',
    inferential: t('brainstorm.depth_inferential') || 'Between the lines',
    evaluative: t('brainstorm.depth_evaluative') || 'Your judgment'
  };
  var stems = item.talkStems && typeof item.talkStems === 'object' ? item.talkStems : {};
  var hasStems = stemCats.some(function (c) {
    return Array.isArray(stems[c]) && stems[c].length;
  });
  return /*#__PURE__*/React.createElement("div", {
    "data-help-key": "brainstorm_discussion_card"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-lg text-indigo-900 mb-1 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(MessageSquare, {
    size: 18,
    className: "text-cyan-700 shrink-0"
  }), " ", item.title), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold uppercase tracking-wider bg-cyan-50 text-cyan-900 border border-cyan-200 rounded-full px-2.5 py-0.5"
  }, protocolLabel), item.grouping ? /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-600"
  }, item.grouping) : null), item.openingQuestion ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm font-semibold text-slate-800 bg-cyan-50/60 border border-cyan-100 rounded-lg p-3 mb-4"
  }, item.openingQuestion) : null, (Array.isArray(item.questionSets) ? item.questionSets : []).map(function (set, setIdx) {
    var qs = set && Array.isArray(set.questions) ? set.questions : [];
    if (!qs.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: setIdx,
      className: "mb-3"
    }, /*#__PURE__*/React.createElement("h5", {
      className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
    }, depthLabels[set.depth] || set.depth || ''), /*#__PURE__*/React.createElement("ol", {
      className: "list-decimal ml-5 text-sm text-slate-700 space-y-1"
    }, qs.map(function (q, qIdx) {
      return /*#__PURE__*/React.createElement("li", {
        key: qIdx
      }, q);
    })));
  }), hasStems ? /*#__PURE__*/React.createElement("div", {
    className: "mb-4"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-2"
  }, t('brainstorm.talk_stems') || 'Talk stems'), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 sm:grid-cols-2 gap-2"
  }, stemCats.map(function (cat) {
    var list = Array.isArray(stems[cat]) ? stems[cat] : [];
    if (!list.length) return null;
    return /*#__PURE__*/React.createElement("div", {
      key: cat,
      className: "bg-slate-50 border border-slate-200 rounded-lg p-2.5"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "block text-[11px] uppercase tracking-wider text-slate-600 mb-1"
    }, stemLabels[cat]), /*#__PURE__*/React.createElement("ul", {
      className: "text-xs text-slate-700 space-y-1"
    }, list.map(function (s, sIdx) {
      return /*#__PURE__*/React.createElement("li", {
        key: sIdx
      }, "“", s, "”");
    })));
  }))) : null, isTeacherMode && item.facilitationNotes ? /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-300 mb-3"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-slate-800 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 16
  }), " ", t('brainstorm.facilitation_notes') || 'Facilitation notes (teacher)'), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(item.facilitationNotes))) : null, isTeacherMode && Array.isArray(item.lookFors) && item.lookFors.length ? /*#__PURE__*/React.createElement("div", {
    className: "text-xs text-slate-600 mb-3"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block uppercase tracking-wider text-[11px] mb-1"
  }, t('brainstorm.look_fors') || 'Participation look-fors'), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc ml-4 space-y-0.5"
  }, item.lookFors.map(function (l, lIdx) {
    return /*#__PURE__*/React.createElement("li", {
      key: lIdx
    }, l);
  }))) : null);
}
function JigsawBody(props) {
  var t = props.t;
  var item = props.item;
  var isTeacherMode = props.isTeacherMode;
  var renderFormattedText = props.renderFormattedText;
  var chunks = Array.isArray(item.chunks) ? item.chunks : [];
  var checks = Array.isArray(item.accountabilityCheck) ? item.accountabilityCheck : [];
  return /*#__PURE__*/React.createElement("div", {
    "data-help-key": "brainstorm_jigsaw_card"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-lg text-indigo-900 mb-1 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Users, {
    size: 18,
    className: "text-emerald-700 shrink-0"
  }), " ", item.title), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-full px-2.5 py-0.5"
  }, (t('brainstorm.jigsaw_group_size') || 'Home groups of {n}').replace('{n}', String(item.groupSize || chunks.length || 4)))), chunks.map(function (chunk, cIdx) {
    var tb = chunk && chunk.teachBack && typeof chunk.teachBack === 'object' ? chunk.teachBack : {};
    var keyPoints = Array.isArray(tb.keyPoints) ? tb.keyPoints : [];
    var checkQs = Array.isArray(tb.checkQuestions) ? tb.checkQuestions : [];
    return /*#__PURE__*/React.createElement("details", {
      key: cIdx,
      className: "mb-2 rounded-lg border border-emerald-200 bg-white group"
    }, /*#__PURE__*/React.createElement("summary", {
      className: "cursor-pointer list-none px-3 py-2 text-sm font-bold text-emerald-900 flex items-center justify-between hover:bg-emerald-50 rounded-lg"
    }, /*#__PURE__*/React.createElement("span", null, chunk.label || (t('brainstorm.expert_group') || 'Expert group') + ' ' + (cIdx + 1)), /*#__PURE__*/React.createElement("span", {
      className: "text-emerald-700/70 group-open:rotate-180 transition-transform motion-reduce:transition-none",
      "aria-hidden": "true"
    }, "▾")), /*#__PURE__*/React.createElement("div", {
      className: "px-3 pb-3 pt-1 text-sm text-slate-700"
    }, /*#__PURE__*/React.createElement("div", {
      className: "prose prose-sm max-w-none mb-2"
    }, renderFormattedText(chunk.expertPacket || '')), keyPoints.length ? /*#__PURE__*/React.createElement("div", {
      className: "bg-emerald-50/60 border border-emerald-100 rounded-lg p-2.5 mb-2"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "block text-[11px] uppercase tracking-wider text-emerald-900 mb-1"
    }, t('brainstorm.teach_back_points') || 'When you teach your group, cover:'), /*#__PURE__*/React.createElement("ul", {
      className: "list-disc ml-4 text-xs space-y-0.5"
    }, keyPoints.map(function (p, pIdx) {
      return /*#__PURE__*/React.createElement("li", {
        key: pIdx
      }, p);
    }))) : null, checkQs.length ? /*#__PURE__*/React.createElement("div", {
      className: "text-xs text-slate-600"
    }, /*#__PURE__*/React.createElement("strong", {
      className: "block uppercase tracking-wider text-[11px] mb-1"
    }, t('brainstorm.teach_back_questions') || 'Check your group understood:'), /*#__PURE__*/React.createElement("ol", {
      className: "list-decimal ml-4 space-y-0.5"
    }, checkQs.map(function (q, qIdx) {
      return /*#__PURE__*/React.createElement("li", {
        key: qIdx
      }, q);
    }))) : null));
  }), item.homeGroupTask ? /*#__PURE__*/React.createElement("div", {
    className: "mt-3 mb-2"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
  }, t('brainstorm.home_group_task') || 'Home-group task'), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none text-sm text-slate-700"
  }, renderFormattedText(item.homeGroupTask))) : null, item.synthesisOrganizer ? /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
  }, t('brainstorm.synthesis_organizer') || 'Putting it together'), /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none text-sm text-slate-700"
  }, renderFormattedText(item.synthesisOrganizer))) : null, checks.length ? /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold uppercase tracking-wider text-slate-600 mb-1"
  }, t('brainstorm.accountability_check') || 'Show what you learned (everyone answers)'), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal ml-5 text-sm text-slate-700 space-y-1"
  }, checks.map(function (c, aIdx) {
    return /*#__PURE__*/React.createElement("li", {
      key: aIdx
    }, c && c.q);
  })), isTeacherMode ? /*#__PURE__*/React.createElement("details", {
    className: "mt-2"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "cursor-pointer list-none inline-flex items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 14
  }), " ", t('brainstorm.answer_key') || 'Answer key (teacher only)'), /*#__PURE__*/React.createElement("ol", {
    className: "list-decimal ml-5 text-xs text-slate-600 mt-2 space-y-1"
  }, checks.map(function (c, aIdx) {
    return /*#__PURE__*/React.createElement("li", {
      key: aIdx
    }, c && c.answer);
  }))) : null) : null);
}
function BrainstormView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isEditingBrainstorm = props.isEditingBrainstorm;
  var isGeneratingGuide = props.isGeneratingGuide;
  var isGeneratingBrainstormRubric = props.isGeneratingBrainstormRubric || {};
  var isGeneratingWorksheet = props.isGeneratingWorksheet;
  var isGeneratingWorksheetCover = props.isGeneratingWorksheetCover;
  var handleToggleIsEditingBrainstorm = props.handleToggleIsEditingBrainstorm;
  var handleBrainstormChange = props.handleBrainstormChange;
  var handleGenerateGuide = props.handleGenerateGuide;
  var handleGenerateBrainstormRubric = props.handleGenerateBrainstormRubric;
  var handleGenerateWorksheet = props.handleGenerateWorksheet;
  var handleGenerateWorksheetCover = props.handleGenerateWorksheetCover;
  var getRows = props.getRows;
  var renderFormattedText = props.renderFormattedText;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6",
    "data-help-key": "brainstorm_panel"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-yellow-50 p-4 rounded-lg border border-yellow-100 mb-6 flex justify-between items-center gap-4"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-yellow-800 flex-grow"
  }, /*#__PURE__*/React.createElement("strong", null, "UDL Goal:"), " Providing options for engagement. Connecting concepts to student lives and physical activities increases relevance and motivation."), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.toggle_edit_brainstorm'),
    onClick: handleToggleIsEditingBrainstorm,
    className: `flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${isEditingBrainstorm ? 'bg-yellow-600 text-white hover:bg-yellow-700' : 'bg-white text-yellow-700 border border-yellow-200 hover:bg-yellow-50'}`
  }, isEditingBrainstorm ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingBrainstorm ? t('common.done_editing') : t('brainstorm.edit')))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-6"
  }, (Array.isArray(generatedContent?.data) ? generatedContent?.data : []).map((idea, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "bg-white p-6 rounded-xl border border-slate-400 shadow-sm hover:shadow-md transition-shadow",
    "data-help-key": "brainstorm_card"
  }, idea.kind === 'discussion' ? /*#__PURE__*/React.createElement(DiscussionKitBody, {
    item: idea,
    t: t,
    isTeacherMode: isTeacherMode,
    renderFormattedText: renderFormattedText
  }) : idea.kind === 'jigsaw' ? /*#__PURE__*/React.createElement(JigsawBody, {
    item: idea,
    t: t,
    isTeacherMode: isTeacherMode,
    renderFormattedText: renderFormattedText
  }) : isEditingBrainstorm ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 18,
    className: "text-yellow-500 fill-current shrink-0"
  }), /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_idea'),
    type: "text",
    value: idea.title,
    onChange: e => handleBrainstormChange(idx, 'title', e.target.value),
    className: "w-full font-bold text-lg text-indigo-900 bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none transition-all",
    placeholder: t('brainstorm.placeholder_title'),
    readOnly: !isTeacherMode
  })), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_description') || 'Edit idea description',
    value: idea.description,
    onChange: e => handleBrainstormChange(idx, 'description', e.target.value),
    className: "w-full text-slate-700 mb-4 text-sm leading-relaxed bg-transparent border border-transparent hover:border-slate-300 focus:border-indigo-500 focus:bg-slate-50 focus:ring-2 focus:ring-indigo-200 rounded px-2 py-1 outline-none resize-none transition-all",
    rows: getRows(idea.description),
    placeholder: t('brainstorm.placeholder_desc'),
    readOnly: !isTeacherMode
  }), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-3 rounded-lg text-xs text-indigo-800 font-medium border border-indigo-100 mb-4"
  }, /*#__PURE__*/React.createElement("strong", {
    className: "block mb-1"
  }, t('brainstorm.label_connection'), ":"), /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_connection') || 'Edit topic connection',
    value: idea.connection,
    onChange: e => handleBrainstormChange(idx, 'connection', e.target.value),
    className: "w-full bg-transparent border border-transparent hover:border-indigo-300 focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200 rounded px-1 outline-none resize-none transition-all",
    rows: getRows(idea.connection),
    placeholder: t('brainstorm.placeholder_connection'),
    readOnly: !isTeacherMode
  }))) : /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-lg text-indigo-900 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 18,
    className: "text-yellow-500 fill-current"
  }), " ", idea.title), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-700 mb-4 text-sm leading-relaxed"
  }, idea.description), /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-3 rounded-lg text-xs text-indigo-800 font-medium border border-indigo-100 mb-4"
  }, /*#__PURE__*/React.createElement("strong", null, t('brainstorm.label_connection'), ":"), " ", idea.connection)), /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-100 pt-3"
  }, idea.guide ? /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-50 rounded-lg p-4 text-sm text-slate-700 border border-slate-400",
    "data-help-key": "brainstorm_guide"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-slate-800 mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 16
  }), " ", t('brainstorm.teacher_guide')), isEditingBrainstorm ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_guide') || 'Edit teacher guide',
    value: idea.guide,
    onChange: e => handleBrainstormChange(idx, 'guide', e.target.value),
    className: "w-full bg-white border border-slate-400 hover:border-slate-500 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-3 py-2 outline-none resize-y transition-all font-mono text-xs leading-relaxed",
    rows: Math.max(8, getRows(idea.guide)),
    placeholder: t('brainstorm.placeholder_guide') || 'Step-by-step teacher guide (markdown supported)…',
    readOnly: !isTeacherMode
  }) : /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(idea.guide))) : /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleGenerateGuide(idx),
    disabled: isGeneratingGuide[idx],
    "aria-busy": !!isGeneratingGuide[idx],
    className: "flex items-center gap-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
  }, isGeneratingGuide[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 14,
    "aria-hidden": "true"
  }), isGeneratingGuide[idx] ? t('brainstorm.creating_guide') : t('brainstorm.generate_guide')), idea.guide && (idea.worksheet ? /*#__PURE__*/React.createElement("details", {
    className: "mt-3 group"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 cursor-pointer list-none transition-colors"
  }, /*#__PURE__*/React.createElement(FileText, {
    size: 14
  }), t('brainstorm.student_worksheet') || 'Student Worksheet', /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-700/70 ml-0.5 group-open:rotate-180 transition-transform"
  }, "▾")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 bg-emerald-50/40 rounded-lg p-4 text-sm text-slate-700 border border-emerald-200",
    "data-help-key": "brainstorm_worksheet"
  }, idea.coverImage && /*#__PURE__*/React.createElement("div", {
    className: "mb-3 flex justify-center"
  }, /*#__PURE__*/React.createElement("img", {
    src: idea.coverImage,
    alt: t('brainstorm.cover_alt', {
      title: idea.title
    }) || `Illustration for ${idea.title}`,
    className: "max-h-40 rounded-lg border border-emerald-200 bg-white shadow-sm"
  })), /*#__PURE__*/React.createElement("div", {
    className: "mb-3 flex justify-end"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleGenerateWorksheetCover(idx),
    disabled: isGeneratingWorksheetCover[idx],
    "aria-busy": !!isGeneratingWorksheetCover[idx],
    className: "text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-full transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1",
    title: idea.coverImage ? t('brainstorm.regenerate_cover') || 'Regenerate cover image' : t('brainstorm.generate_cover_tip') || 'Optional: add a cover illustration to this worksheet'
  }, isGeneratingWorksheetCover[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 11,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ImageIcon, {
    size: 11,
    "aria-hidden": "true"
  }), isGeneratingWorksheetCover[idx] ? t('brainstorm.creating_cover') || 'Creating cover…' : idea.coverImage ? t('brainstorm.regenerate_cover') || 'Regenerate cover' : t('brainstorm.generate_cover') || 'Add cover image')), isEditingBrainstorm ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_worksheet') || 'Edit student worksheet',
    value: idea.worksheet,
    onChange: e => handleBrainstormChange(idx, 'worksheet', e.target.value),
    className: "w-full bg-white border border-slate-400 hover:border-slate-500 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-3 py-2 outline-none resize-y transition-all font-mono text-xs leading-relaxed",
    rows: Math.max(10, getRows(idea.worksheet)),
    placeholder: t('brainstorm.placeholder_worksheet') || 'Student worksheet (markdown)…',
    readOnly: !isTeacherMode
  }) : /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(idea.worksheet)))) : /*#__PURE__*/React.createElement("button", {
    "aria-label": t('brainstorm.generate_worksheet') || 'Generate student worksheet',
    onClick: () => handleGenerateWorksheet(idx),
    disabled: isGeneratingWorksheet[idx],
    "aria-busy": !!isGeneratingWorksheet[idx],
    className: "mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
  }, isGeneratingWorksheet[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(FileText, {
    size: 14,
    "aria-hidden": "true"
  }), isGeneratingWorksheet[idx] ? t('brainstorm.creating_worksheet') || 'Creating worksheet…' : t('brainstorm.generate_worksheet') || 'Generate Student Worksheet')), idea.rubric && Array.isArray(idea.rubric.criteria) && idea.rubric.criteria.length ? /*#__PURE__*/React.createElement("details", {
    className: "mt-3 group"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "inline-flex items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-full border border-violet-200 cursor-pointer list-none transition-colors"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 14
  }), idea.rubric.title || 'Activity Rubric', /*#__PURE__*/React.createElement("span", {
    className: "text-violet-700/70 ml-0.5 group-open:rotate-180 transition-transform"
  }, "▾")), /*#__PURE__*/React.createElement("div", {
    className: "mt-2 overflow-x-auto rounded-lg border border-violet-200",
    "data-help-key": "brainstorm_rubric"
  }, /*#__PURE__*/React.createElement("table", {
    className: "min-w-[760px] w-full text-xs text-left text-slate-700"
  }, /*#__PURE__*/React.createElement("caption", {
    className: "sr-only"
  }, idea.rubric.title || 'Activity rubric with four performance levels'), /*#__PURE__*/React.createElement("thead", {
    className: "bg-violet-50 text-violet-950"
  }, /*#__PURE__*/React.createElement("tr", null, /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, "Criterion"), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2 w-16"
  }, "Weight"), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, "4 - Exceeds"), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, "3 - Meets"), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, "2 - Developing"), /*#__PURE__*/React.createElement("th", {
    scope: "col",
    className: "p-2"
  }, "1 - Beginning"))), /*#__PURE__*/React.createElement("tbody", {
    className: "divide-y divide-violet-100 bg-white"
  }, idea.rubric.criteria.map((criterion, criterionIndex) => /*#__PURE__*/React.createElement("tr", {
    key: criterionIndex,
    className: "align-top"
  }, /*#__PURE__*/React.createElement("th", {
    scope: "row",
    className: "p-2 font-semibold text-slate-900"
  }, criterion.criterion), /*#__PURE__*/React.createElement("td", {
    className: "p-2"
  }, Number.isFinite(Number(criterion.weight)) ? `${criterion.weight}%` : '--'), /*#__PURE__*/React.createElement("td", {
    className: "p-2"
  }, criterion.levels && criterion.levels['4']), /*#__PURE__*/React.createElement("td", {
    className: "p-2"
  }, criterion.levels && criterion.levels['3']), /*#__PURE__*/React.createElement("td", {
    className: "p-2"
  }, criterion.levels && criterion.levels['2']), /*#__PURE__*/React.createElement("td", {
    className: "p-2"
  }, criterion.levels && criterion.levels['1']))))))) : isTeacherMode ? /*#__PURE__*/React.createElement("button", {
    "aria-label": "Generate activity rubric",
    onClick: () => handleGenerateBrainstormRubric(idx),
    disabled: isGeneratingBrainstormRubric[idx],
    "aria-busy": !!isGeneratingBrainstormRubric[idx],
    className: "mt-3 flex items-center gap-2 text-xs font-bold text-violet-700 hover:bg-violet-50 px-3 py-1.5 rounded-full transition-colors border border-violet-200 disabled:opacity-50 disabled:cursor-not-allowed"
  }, isGeneratingBrainstormRubric[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin motion-reduce:animate-none",
    "aria-hidden": "true"
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 14,
    "aria-hidden": "true"
  }), isGeneratingBrainstormRubric[idx] ? 'Creating rubric...' : 'Generate Activity Rubric') : null)))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.BrainstormView = BrainstormView;
  window.AlloModules.ViewBrainstormModule = true;
})();
