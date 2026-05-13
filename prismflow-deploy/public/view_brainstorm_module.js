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

  function BrainstormView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var isEditingBrainstorm = props.isEditingBrainstorm;
  var isGeneratingGuide = props.isGeneratingGuide;
  var isGeneratingWorksheet = props.isGeneratingWorksheet;
  var isGeneratingWorksheetCover = props.isGeneratingWorksheetCover;
  var handleToggleIsEditingBrainstorm = props.handleToggleIsEditingBrainstorm;
  var handleBrainstormChange = props.handleBrainstormChange;
  var handleGenerateGuide = props.handleGenerateGuide;
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
  }, isEditingBrainstorm ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
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
    className: "w-full bg-white border border-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded px-3 py-2 outline-none resize-y transition-all font-mono text-xs leading-relaxed",
    rows: Math.max(8, getRows(idea.guide)),
    placeholder: t('brainstorm.placeholder_guide') || 'Step-by-step teacher guide (markdown supported)…',
    readOnly: !isTeacherMode
  }) : /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(idea.guide))) : /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleGenerateGuide(idx),
    disabled: isGeneratingGuide[idx],
    className: "flex items-center gap-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 px-3 py-1.5 rounded-full transition-colors border border-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
  }, isGeneratingGuide[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 14
  }), isGeneratingGuide[idx] ? t('brainstorm.creating_guide') : t('brainstorm.generate_guide')), idea.guide && (idea.worksheet ? /*#__PURE__*/React.createElement("details", {
    className: "mt-3 group"
  }, /*#__PURE__*/React.createElement("summary", {
    className: "inline-flex items-center gap-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 cursor-pointer list-none transition-colors"
  }, /*#__PURE__*/React.createElement(FileText, {
    size: 14
  }), t('brainstorm.student_worksheet') || 'Student Worksheet', /*#__PURE__*/React.createElement("span", {
    className: "text-emerald-700/70 ml-0.5 group-open:rotate-180 transition-transform"
  }, "\u25BE")), /*#__PURE__*/React.createElement("div", {
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
    className: "text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 px-2 py-1 rounded-full transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1",
    title: idea.coverImage ? t('brainstorm.regenerate_cover') || 'Regenerate cover image' : t('brainstorm.generate_cover_tip') || 'Optional: add a cover illustration to this worksheet'
  }, isGeneratingWorksheetCover[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 11,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(ImageIcon, {
    size: 11
  }), isGeneratingWorksheetCover[idx] ? t('brainstorm.creating_cover') || 'Creating cover…' : idea.coverImage ? t('brainstorm.regenerate_cover') || 'Regenerate cover' : t('brainstorm.generate_cover') || 'Add cover image')), isEditingBrainstorm ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('brainstorm.edit_worksheet') || 'Edit student worksheet',
    value: idea.worksheet,
    onChange: e => handleBrainstormChange(idx, 'worksheet', e.target.value),
    className: "w-full bg-white border border-slate-400 hover:border-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded px-3 py-2 outline-none resize-y transition-all font-mono text-xs leading-relaxed",
    rows: Math.max(10, getRows(idea.worksheet)),
    placeholder: t('brainstorm.placeholder_worksheet') || 'Student worksheet (markdown)…',
    readOnly: !isTeacherMode
  }) : /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(idea.worksheet)))) : /*#__PURE__*/React.createElement("button", {
    "aria-label": t('brainstorm.generate_worksheet') || 'Generate student worksheet',
    onClick: () => handleGenerateWorksheet(idx),
    disabled: isGeneratingWorksheet[idx],
    className: "mt-3 flex items-center gap-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 px-3 py-1.5 rounded-full transition-colors border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed"
  }, isGeneratingWorksheet[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(FileText, {
    size: 14
  }), isGeneratingWorksheet[idx] ? t('brainstorm.creating_worksheet') || 'Creating worksheet…' : t('brainstorm.generate_worksheet') || 'Generate Student Worksheet')))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.BrainstormView = BrainstormView;
  window.AlloModules.ViewBrainstormModule = true;
})();
