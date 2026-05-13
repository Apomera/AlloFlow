/**
 * AlloFlow View - Lesson Plan Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='lesson-plan' block.
 * Source range: 411 lines body.
 * Renders: full lesson plan layout (essential question, objectives, hook,
 * direct instruction, guided/independent practice, closure, materials,
 * extensions with teacher guides), STEM Station Recommendations panel,
 * teacher edit mode, copy/PDF/print exports, lesson progression card with
 * Deep Dive / Remediation / Linear next-topic suggestions.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.LessonPlanView) {
    console.log('[CDN] ViewLessonPlanModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewLessonPlanModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var CheckCircle2 = _lazyIcon('CheckCircle2');
  var Pencil = _lazyIcon('Pencil');
  var Copy = _lazyIcon('Copy');
  var FileDown = _lazyIcon('FileDown');
  var Backpack = _lazyIcon('Backpack');
  var Lightbulb = _lazyIcon('Lightbulb');
  var Flag = _lazyIcon('Flag');
  var Sparkles = _lazyIcon('Sparkles');
  var BookOpen = _lazyIcon('BookOpen');
  var Users = _lazyIcon('Users');
  var PenTool = _lazyIcon('PenTool');
  var ListChecks = _lazyIcon('ListChecks');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Printer = _lazyIcon('Printer');
  var GitMerge = _lazyIcon('GitMerge');
  var X = _lazyIcon('X');

  function LessonPlanView(props) {
  var t = props.t;
  var generatedContent = props.generatedContent;
  var sourceTopic = props.sourceTopic;
  var gradeLevel = props.gradeLevel;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var isParentMode = props.isParentMode;
  var isEditingLessonPlan = props.isEditingLessonPlan;
  var history = props.history;
  var isGeneratingExtensionGuide = props.isGeneratingExtensionGuide;
  var progressionData = props.progressionData;
  var isGeneratingProgression = props.isGeneratingProgression;
  var setActiveStation = props.setActiveStation;
  var setStemLabTool = props.setStemLabTool;
  var setShowStemLab = props.setShowStemLab;
  var setStemLabTab = props.setStemLabTab;
  var handleToggleIsEditingLessonPlan = props.handleToggleIsEditingLessonPlan;
  var handleCopyToClipboard = props.handleCopyToClipboard;
  var handleExportPDF = props.handleExportPDF;
  var handleLessonPlanChange = props.handleLessonPlanChange;
  var handleGenerateExtensionGuide = props.handleGenerateExtensionGuide;
  var handleExport = props.handleExport;
  var handleGenerateProgression = props.handleGenerateProgression;
  var handleSetProgressionDataToNull = props.handleSetProgressionDataToNull;
  var handleActivateNextLesson = props.handleActivateNextLesson;
  var getRows = props.getRows;
  var normalizeMaterialItem = props.normalizeMaterialItem;
  var renderFormattedText = props.renderFormattedText;
  var addToast = props.addToast;
  var BilingualFieldRenderer = props.BilingualFieldRenderer;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 max-w-4xl mx-auto h-full overflow-y-auto pr-2 pb-10"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-50 p-6 rounded-xl border border-indigo-100 shadow-sm"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-start mb-4"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "text-2xl font-bold text-indigo-900 mb-1"
  }, t('lesson_plan.header_title')), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold text-indigo-700"
  }, t('lesson_plan.topic_label'), ": ", sourceTopic || "General", " | ", t('lesson_plan.grade_label'), ": ", gradeLevel)), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2 no-print"
  }, isTeacherMode && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.check'),
    onClick: handleToggleIsEditingLessonPlan,
    className: `flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full transition-colors shadow-sm ${isEditingLessonPlan ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'bg-white text-indigo-600 hover:bg-indigo-100 border border-indigo-200'}`,
    title: t('lesson_plan.edit_plan')
  }, isEditingLessonPlan ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditingLessonPlan ? t('common.done') : t('common.edit')), /*#__PURE__*/React.createElement("button", {
    onClick: handleCopyToClipboard,
    "data-help-key": "export_copy_button",
    className: "flex items-center gap-1 text-xs font-bold bg-white text-indigo-600 hover:bg-indigo-100 border border-indigo-200 px-3 py-1.5 rounded-full transition-colors shadow-sm",
    title: t('lesson_plan.tooltip_copy'),
    "aria-label": t('lesson_plan.tooltip_copy')
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14
  }), " ", t('common.copy')), /*#__PURE__*/React.createElement("button", {
    onClick: handleExportPDF,
    "data-help-key": "export_pdf_button",
    className: "flex items-center gap-1 text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 border border-indigo-600 px-3 py-1.5 rounded-full transition-colors shadow-sm",
    title: t('lesson_plan.tooltip_pdf'),
    "aria-label": t('lesson_plan.tooltip_pdf')
  }, /*#__PURE__*/React.createElement(FileDown, {
    size: 14
  }), " ", t('lesson_plan.pdf_button')))), /*#__PURE__*/React.createElement("div", {
    className: "text-xs font-bold text-indigo-500 mb-4 bg-white/50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block"
  }, t('lesson_plan.based_on'), ": ", history.find(h => h && h.type === 'analysis') ? `${t('lesson_plan.analysis_lbl')}, ` : '', history.find(h => h && h.type === 'simplified') ? `${t('lesson_plan.leveled_text_lbl')}, ` : '', history.find(h => h && h.type === 'quiz') ? `${t('lesson_plan.quiz_lbl')}, ` : '', history.find(h => h && h.type === 'glossary') ? t('lesson_plan.glossary_lbl') : t('lesson_plan.source_lbl')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-6"
  }, generatedContent?.data.materialsNeeded && generatedContent?.data.materialsNeeded.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Backpack, {
    size: 14
  }), " ", t('lesson_plan.materials_header')), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc list-inside text-sm text-slate-700 space-y-1"
  }, generatedContent?.data.materialsNeeded.map((mat, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "flex items-start gap-2"
  }, isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_material') || `Edit material ${i + 1}`,
    value: mat,
    onChange: e => handleLessonPlanChange('materialsNeeded', e.target.value, i),
    className: "w-full text-sm bg-transparent border-b border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded-none outline-none resize-none overflow-hidden h-auto",
    rows: Math.max(1, Math.ceil(mat.length / 50))
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: normalizeMaterialItem(mat)
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Lightbulb, {
    size: 14
  }), " ", t(`lesson_headers.${isIndependentMode ? 'student' : isParentMode ? 'parent' : 'teacher'}.essentialQuestion`)), isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_essential_question') || 'Edit essential question',
    value: generatedContent?.data.essentialQuestion,
    onChange: e => handleLessonPlanChange('essentialQuestion', e.target.value),
    className: "w-full text-lg font-serif text-slate-800 bg-transparent border border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded p-2 outline-none resize-y transition-all",
    rows: 2
  }) : /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: generatedContent?.data.essentialQuestion,
    className: "text-lg font-serif text-slate-800 italic leading-relaxed"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Flag, {
    size: 14
  }), " ", t(`lesson_headers.${isIndependentMode ? 'student' : isParentMode ? 'parent' : 'teacher'}.objectives`)), /*#__PURE__*/React.createElement("ul", {
    className: "list-disc list-inside text-sm text-slate-700 space-y-2"
  }, generatedContent?.data.objectives.map((obj, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    className: "flex items-start gap-2"
  }, isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_objective') || `Edit objective ${i + 1}`,
    value: obj,
    onChange: e => handleLessonPlanChange('objectives', e.target.value, i),
    className: "w-full text-sm bg-transparent border-b border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded-none outline-none resize-none overflow-hidden h-auto",
    rows: Math.max(1, Math.ceil(obj.length / 40))
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-full"
  }, /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: obj
  })))))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14
  }), " ", t(`lesson_headers.${isIndependentMode ? 'student' : isParentMode ? 'parent' : 'teacher'}.hook`)), isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_hook') || 'Edit hook or opener',
    value: generatedContent?.data.hook,
    onChange: e => handleLessonPlanChange('hook', e.target.value),
    className: "w-full text-sm text-slate-700 bg-transparent border border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded p-2 outline-none resize-y transition-all",
    rows: getRows(generatedContent?.data.hook)
  }) : /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: generatedContent?.data.hook,
    className: "text-sm text-slate-700"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(BookOpen, {
    size: 14
  }), " ", t(`lesson_headers.${isIndependentMode ? 'student' : isParentMode ? 'parent' : 'teacher'}.directInstruction`)), isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_direct_instruction') || 'Edit direct instruction',
    value: generatedContent?.data.directInstruction,
    onChange: e => handleLessonPlanChange('directInstruction', e.target.value),
    className: "w-full text-sm text-slate-700 bg-transparent border border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded p-2 outline-none resize-y transition-all font-medium",
    rows: getRows(generatedContent?.data.directInstruction),
    "data-help-key": "lesson_edit_instruction"
  }) : /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: generatedContent?.data.directInstruction,
    className: "text-sm text-slate-700"
  })), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-2 gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Users, {
    size: 14
  }), " ", t(`lesson_headers.${isIndependentMode ? 'student' : isParentMode ? 'parent' : 'teacher'}.guidedPractice`)), isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_guided_practice') || 'Edit guided practice',
    value: generatedContent?.data.guidedPractice,
    onChange: e => handleLessonPlanChange('guidedPractice', e.target.value),
    className: "w-full text-sm text-slate-700 bg-transparent border border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded p-2 outline-none resize-y transition-all",
    rows: getRows(generatedContent?.data.guidedPractice)
  }) : /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: generatedContent?.data.guidedPractice,
    className: "text-sm text-slate-700"
  })), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(PenTool, {
    size: 14
  }), " ", t(`lesson_headers.${isIndependentMode ? 'student' : isParentMode ? 'parent' : 'teacher'}.independentPractice`)), isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_independent_practice') || 'Edit independent practice',
    value: generatedContent?.data.independentPractice,
    onChange: e => handleLessonPlanChange('independentPractice', e.target.value),
    className: "w-full text-sm text-slate-700 bg-transparent border border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded p-2 outline-none resize-y transition-all",
    rows: getRows(generatedContent?.data.independentPractice)
  }) : /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: generatedContent?.data.independentPractice,
    className: "text-sm text-slate-700"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }), " ", t(`lesson_headers.${isIndependentMode ? 'student' : isParentMode ? 'parent' : 'teacher'}.closure`)), isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_closure') || 'Edit closure',
    value: generatedContent?.data.closure,
    onChange: e => handleLessonPlanChange('closure', e.target.value),
    className: "w-full text-sm text-slate-700 bg-transparent border border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded p-2 outline-none resize-y transition-all",
    rows: getRows(generatedContent?.data.closure)
  }) : /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: generatedContent?.data.closure,
    className: "text-sm text-slate-700"
  })), generatedContent?.data.extensions && /*#__PURE__*/React.createElement("div", {
    className: "bg-white p-4 rounded-lg border border-indigo-100 mt-4"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-black text-indigo-600 uppercase tracking-widest mb-4 flex items-center gap-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14
  }), " ", t('lesson_headers.extensions_header')), Array.isArray(generatedContent?.data.extensions) ? /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 gap-4"
  }, generatedContent?.data.extensions.map((ext, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "bg-slate-50 p-4 rounded-xl border border-slate-400"
  }, /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-indigo-900 mb-2 text-sm"
  }, isEditingLessonPlan && typeof ext !== 'string' ? /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_typeof'),
    value: typeof ext.title === 'string' ? ext.title : ext.title?.en || '',
    onChange: e => handleLessonPlanChange('extensions', {
      ...ext,
      title: e.target.value
    }, idx),
    className: "w-full bg-white border border-indigo-600 rounded px-2 py-1 text-sm font-bold text-indigo-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
  }) : /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: typeof ext === 'string' ? t('lesson_headers.extension_idea_fallback') : ext.title
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-700 leading-relaxed mb-4"
  }, isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_extension_description') || `Edit extension ${idx + 1} description`,
    value: typeof ext === 'string' ? ext : typeof ext.description === 'string' ? ext.description : ext.description?.en || '',
    onChange: e => {
      const newVal = typeof ext === 'string' ? e.target.value : {
        ...ext,
        description: e.target.value
      };
      handleLessonPlanChange('extensions', newVal, idx);
    },
    className: "w-full bg-white border border-indigo-200 rounded px-2 py-1 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y",
    rows: 4
  }) : /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: typeof ext === 'string' ? ext : ext.description
  })), typeof ext !== 'string' && /*#__PURE__*/React.createElement("div", {
    className: "border-t border-slate-200 pt-3"
  }, ext.guide ? /*#__PURE__*/React.createElement("div", {
    className: "bg-white rounded-lg p-4 text-sm text-slate-700 border border-slate-400 shadow-sm"
  }, /*#__PURE__*/React.createElement("h6", {
    className: "font-bold text-slate-800 mb-2 flex items-center gap-2 text-xs uppercase tracking-wider"
  }, /*#__PURE__*/React.createElement(ListChecks, {
    size: 14
  }), " ", t('lesson_headers.teacher_guide_header')), isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_teacher_guide') || `Edit extension ${idx + 1} teacher guide`,
    value: typeof ext.guide === 'string' ? ext.guide : ext.guide?.en || '',
    onChange: e => handleLessonPlanChange('extensions', {
      ...ext,
      guide: e.target.value
    }, idx),
    className: "w-full bg-slate-50 border border-slate-400 rounded p-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y",
    rows: 6
  }) : /*#__PURE__*/React.createElement("div", {
    className: "prose prose-sm max-w-none"
  }, renderFormattedText(ext.guide))) : /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.refresh'),
    onClick: () => handleGenerateExtensionGuide(idx),
    disabled: isGeneratingExtensionGuide[idx],
    className: "flex items-center gap-2 text-xs font-bold text-indigo-600 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors border border-indigo-200 bg-white disabled:opacity-50 disabled:cursor-not-allowed"
  }, isGeneratingExtensionGuide[idx] ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(ListChecks, {
    size: 14
  }), isGeneratingExtensionGuide[idx] ? t('brainstorm.creating_guide') : t('brainstorm.generate_guide')))))) : /*#__PURE__*/React.createElement(React.Fragment, null, isEditingLessonPlan ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('lesson_plan.edit_extensions') || 'Edit extensions',
    value: generatedContent?.data.extensions,
    onChange: e => handleLessonPlanChange('extensions', e.target.value),
    className: "w-full text-sm text-slate-700 bg-transparent border border-indigo-200 focus:border-indigo-500 focus:bg-indigo-50 focus:ring-2 focus:ring-indigo-200 rounded p-2 outline-none resize-y transition-all",
    rows: getRows(generatedContent?.data.extensions)
  }) : /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-slate-700 leading-relaxed whitespace-pre-line"
  }, /*#__PURE__*/React.createElement(BilingualFieldRenderer, {
    text: generatedContent?.data.extensions
  })))))), generatedContent?.data?.recommendedStemTools && generatedContent.data.recommendedStemTools.length > 0 && /*#__PURE__*/React.createElement("div", {
    className: "mt-6 mb-4 border-2 border-emerald-200 rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 p-5 animate-in fade-in duration-300"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-3"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "text-base font-black text-emerald-900 flex items-center gap-2"
  }, "\uD83D\uDD2C Recommended STEM Lab Tools"), /*#__PURE__*/React.createElement("button", {
    onClick: () => {
      const tools = generatedContent.data.recommendedStemTools.map(t => t.id);
      const station = {
        id: 'station_' + Date.now(),
        name: (sourceTopic || 'Lesson') + ' Station',
        tools: tools,
        teacherNote: '',
        createdAt: new Date().toISOString(),
        lessonTitle: generatedContent.data.essentialQuestion || sourceTopic || ''
      };
      const existing = JSON.parse(localStorage.getItem('alloflow_stem_stations') || '[]');
      existing.push(station);
      localStorage.setItem('alloflow_stem_stations', JSON.stringify(existing));
      setActiveStation(station);
      addToast && addToast('✅ STEM Station created! Open STEM Lab to see your curated tools.');
    },
    className: "flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md hover:shadow-lg transition-all"
  }, "\uD83D\uDCCC Create Station")), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, generatedContent.data.recommendedStemTools.map((tool, idx) => {
    const registry = window.STEM_TOOL_REGISTRY || [];
    const meta = registry.find(r => r.id === tool.id);
    return /*#__PURE__*/React.createElement("div", {
      key: tool.id || idx,
      className: "flex items-start gap-3 bg-white/80 rounded-xl p-3 border border-emerald-100"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-2xl mt-0.5"
    }, meta ? '🧪' : '🔧'), /*#__PURE__*/React.createElement("div", {
      className: "flex-1 min-w-0"
    }, /*#__PURE__*/React.createElement("p", {
      className: "font-bold text-sm text-emerald-900"
    }, meta ? meta.name : tool.id), /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-emerald-700 mt-0.5"
    }, tool.rationale), tool.suggestedActivity && /*#__PURE__*/React.createElement("p", {
      className: "text-xs text-teal-600 mt-1 italic"
    }, "\uD83D\uDCA1 ", tool.suggestedActivity)), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        const toolId = tool.id;
        setStemLabTool && setStemLabTool(toolId);
        setShowStemLab && setShowStemLab(true);
        setStemLabTab && setStemLabTab('explore');
      },
      className: "text-xs font-bold text-emerald-600 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-1.5 rounded-lg transition-all whitespace-nowrap"
    }, "Open Tool \u2192"));
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex justify-center pb-8"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: () => handleExport('print'),
    className: "flex items-center gap-2 bg-indigo-600 text-white px-8 py-3 rounded-full font-bold hover:bg-indigo-700 transition-colors shadow-lg"
  }, /*#__PURE__*/React.createElement(Printer, {
    size: 18
  }), " ", t('lesson_plan.print'))), /*#__PURE__*/React.createElement("div", {
    className: "mt-8 pt-8 border-t-2 border-dashed border-slate-200"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-sm font-black text-slate-600 uppercase tracking-widest mb-4 text-center"
  }, t('progression.title')), !progressionData ? /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.generate_content'),
    onClick: handleGenerateProgression,
    disabled: isGeneratingProgression,
    className: "w-full py-6 rounded-2xl border-2 border-dashed border-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-all group flex flex-col items-center justify-center gap-2 text-indigo-600 hover:text-indigo-600"
  }, isGeneratingProgression ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 24,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(GitMerge, {
    size: 24,
    className: "rotate-90"
  }), /*#__PURE__*/React.createElement("span", {
    className: "font-bold text-sm"
  }, isGeneratingProgression ? t('progression.analyzing_btn') : t('progression.analyze_btn')), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-normal opacity-70"
  }, t('progression.helper_text'))) : /*#__PURE__*/React.createElement("div", {
    className: "animate-in slide-in-from-bottom-4 space-y-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-center mb-2 px-2"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-indigo-900 uppercase tracking-wider"
  }, t('progression.recommended_header')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.close'),
    onClick: handleSetProgressionDataToNull,
    className: "text-slate-600 hover:text-indigo-600 p-1 rounded-full transition-colors",
    title: t('common.close')
  }, /*#__PURE__*/React.createElement(X, {
    size: 20
  }))), /*#__PURE__*/React.createElement("div", {
    className: "grid grid-cols-1 md:grid-cols-3 gap-4"
  }, (Array.isArray(progressionData) ? progressionData : [progressionData]).map((option, idx) => /*#__PURE__*/React.createElement("div", {
    key: idx,
    className: "bg-white border-2 border-indigo-100 rounded-xl p-4 shadow-sm hover:border-indigo-400 hover:shadow-md transition-all flex flex-col h-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "mb-3"
  }, /*#__PURE__*/React.createElement("span", {
    className: `text-[11px] font-black uppercase px-2 py-1 rounded-full border ${option.type === 'Deep Dive' ? 'bg-purple-100 text-purple-700 border-purple-200' : option.type === 'Remediation' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`
  }, option.type || "Linear")), /*#__PURE__*/React.createElement("h5", {
    className: "font-bold text-slate-800 text-sm mb-2 leading-tight",
    title: option.nextTopic
  }, option.nextTopic), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600 italic mb-4 flex-grow leading-relaxed border-l-2 border-indigo-50 pl-2"
  }, "\"", option.rationale, "\""), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.generate'),
    onClick: () => handleActivateNextLesson(option),
    className: "w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 mt-auto active:scale-95 shadow-sm"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-yellow-400 fill-current"
  }), t('progression.build_btn'))))))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.LessonPlanView = LessonPlanView;
  window.AlloModules.ViewLessonPlanModule = true;
})();
