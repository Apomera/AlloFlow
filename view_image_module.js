/**
 * AlloFlow View - Image Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='image' block.
 * Source range (post-Brainstorm): 153 lines.
 * Renders the visual panel view: VisualPanelGrid for multi-panel,
 * single image with upload/refine/regenerate, label challenge.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ImageView) {
    console.log('[CDN] ViewImageModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewImageModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
    return function (props) {
      var I = window.AlloIcons && window.AlloIcons[name];
      return I ? React.createElement(I, props) : null;
    };
  };
  var ImageIcon = _lazyIcon('ImageIcon');
  var RefreshCw = _lazyIcon('RefreshCw');
  var Send = _lazyIcon('Send');
  var Download = _lazyIcon('Download');

  function ImageView(props) {
  var t = props.t;
  var leveledTextLanguage = props.leveledTextLanguage;
  var fillInTheBlank = props.fillInTheBlank;
  var generatedContent = props.generatedContent;
  var singleImageOverride = props.singleImageOverride;
  var isTeacherMode = props.isTeacherMode;
  var imageRefinementInput = props.imageRefinementInput;
  var isProcessing = props.isProcessing;
  var singleImageFileRef = props.singleImageFileRef;
  var setLabelChallengeResults = props.setLabelChallengeResults;
  var setSingleImageOverride = props.setSingleImageOverride;
  var setHistory = props.setHistory;
  var setGeneratedContent = props.setGeneratedContent;
  var setImageRefinementInput = props.setImageRefinementInput;
  var handleRefinePanel = props.handleRefinePanel;
  var handleUpdateVisualLabel = props.handleUpdateVisualLabel;
  var handleSpeak = props.handleSpeak;
  var handleScoreUpdate = props.handleScoreUpdate;
  var handleRestoreImage = props.handleRestoreImage;
  var handleRefineImage = props.handleRefineImage;
  var handleDownloadImage = props.handleDownloadImage;
  var callGemini = props.callGemini;
  var addToast = props.addToast;
  var VisualPanelGrid = props.VisualPanelGrid;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-purple-50 p-3 rounded-lg border border-purple-100 mb-3"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-purple-800"
  }, /*#__PURE__*/React.createElement("strong", null, "UDL Goal:"), " Providing options for perception. Images and diagrams clarify abstract concepts and vocabulary for visual learners.", /*#__PURE__*/React.createElement("span", {
    className: "block mt-1 font-semibold"
  }, "Language Target: ", leveledTextLanguage, " ", fillInTheBlank ? "(Worksheet Mode)" : ""))), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-2xl bg-slate-100 rounded-lg border border-slate-400 shadow-md p-2 mb-4 relative overflow-hidden"
  }, generatedContent?.data.visualPlan && generatedContent?.data.visualPlan.panels.length > 1 ? /*#__PURE__*/React.createElement(VisualPanelGrid, {
    key: generatedContent?.id || "default",
    visualPlan: generatedContent?.data.visualPlan,
    onRefinePanel: handleRefinePanel,
    onUpdateLabel: handleUpdateVisualLabel,
    onSpeak: handleSpeak,
    t: t,
    isTeacherMode: isTeacherMode,
    onChallengeSubmit: result => {
      handleScoreUpdate(Math.round((result.score || 0) / 2), "Label Challenge", generatedContent?.id);
      setLabelChallengeResults(prev => [...prev, {
        score: result.score || 0,
        totalCorrect: result.totalCorrect || 0,
        totalClose: result.totalClose || 0,
        totalExpected: result.totalExpected || 0,
        feedback: result.feedback || '',
        labelResults: result.labelResults || [],
        resourceId: generatedContent?.id,
        resourceTitle: generatedContent?.data?.visualPlan?.title || '',
        panelCount: generatedContent?.data?.visualPlan?.panels?.length || 0,
        challengeType: generatedContent?.data?.annotations?.challengeType || 'scratch',
        timestamp: new Date().toISOString()
      }]);
    },
    callGemini: callGemini,
    initialAnnotations: generatedContent?.data.annotations,
    onAnnotationsChange: annotations => {
      setGeneratedContent(prev => prev ? {
        ...prev,
        data: {
          ...prev.data,
          annotations
        }
      } : prev);
      setHistory(prev => prev.map(item => item.id === generatedContent?.id ? {
        ...item,
        data: {
          ...item.data,
          annotations
        }
      } : item));
    }
  }) : generatedContent?.data.imageUrl ? /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("img", {
    src: singleImageOverride || generatedContent?.data.imageUrl,
    alt: generatedContent?.data.altText || generatedContent?.data.prompt,
    className: "w-full h-auto rounded",
    loading: "lazy",
    decoding: "async"
  }), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      display: 'flex',
      gap: '6px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    type: "file",
    accept: "image/*",
    ref: singleImageFileRef,
    style: {
      display: 'none'
    },
    "aria-label": t('common.upload_replacement_image') || 'Upload replacement image',
    onChange: e => {
      const file = e.target.files?.[0];
      if (!file || !file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        addToast('Image too large (max 10MB)', 'warning');
        return;
      }
      const reader = new FileReader();
      reader.onload = ev => setSingleImageOverride(ev.target.result);
      reader.readAsDataURL(file);
    }
  }), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('visuals.upload_image') || 'Upload your own image',
    title: t('visuals.upload_image') || 'Upload your own image',
    onClick: () => singleImageFileRef.current?.click(),
    className: "flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-slate-400 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm cursor-pointer"
  }, "\uD83D\uDCF7 ", t('visuals.replace_image') || 'Replace'), singleImageOverride && /*#__PURE__*/React.createElement("button", {
    "aria-label": t('visuals.restore_ai_image') || 'Restore AI image',
    title: t('visuals.restore_ai_image') || 'Restore AI image',
    onClick: () => setSingleImageOverride(null),
    className: "flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-amber-200 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-600 hover:bg-amber-50 transition-all shadow-sm cursor-pointer"
  }, "\u21A9\uFE0F ", t('visuals.restore_original') || 'Restore'))) : /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center p-8 text-slate-600 gap-4 w-full"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-slate-200 p-4 rounded-full"
  }, /*#__PURE__*/React.createElement(ImageIcon, {
    size: 32,
    className: "opacity-50"
  })), /*#__PURE__*/React.createElement("div", {
    className: "text-center"
  }, /*#__PURE__*/React.createElement("p", {
    className: "font-bold text-slate-600"
  }, t('visuals.image_not_saved')), /*#__PURE__*/React.createElement("p", {
    className: "text-xs"
  }, t('visuals.image_stripped'))), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.restore_image'),
    onClick: handleRestoreImage,
    disabled: isProcessing,
    "aria-busy": isProcessing,
    "data-help-key": "visuals_regenerate",
    className: "flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(RefreshCw, {
    size: 14
  }), t('visuals.regenerate_prompt')))), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-2xl bg-white p-4 rounded-lg border border-slate-400 shadow-sm mb-6",
    "data-help-key": "visuals_prompt"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-xs font-bold text-slate-600 uppercase tracking-wider mb-2"
  }, t('visuals.prompt_label')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-700 italic bg-slate-50 p-3 rounded border border-slate-100 text-sm"
  }, "\"", generatedContent?.data.prompt, "\"")), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-2xl bg-yellow-50 rounded-xl border border-yellow-100 p-4 shadow-sm mb-6",
    "data-help-key": "visuals_refiner"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center text-lg"
  }, "\uD83C\uDF4C"), /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-bold text-yellow-800"
  }, t('visuals.refiner_title'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.visuals_refiner_placeholder'),
    type: "text",
    value: imageRefinementInput,
    onChange: e => setImageRefinementInput(e.target.value),
    placeholder: t('visuals.refiner_placeholder'),
    className: "flex-grow text-sm p-2 border border-yellow-600 rounded-md focus:ring-2 focus:ring-yellow-400 outline-none",
    onKeyDown: e => e.key === 'Enter' && handleRefineImage()
  }), /*#__PURE__*/React.createElement("button", {
    onClick: handleRefineImage,
    disabled: !imageRefinementInput.trim() || isProcessing,
    "aria-busy": isProcessing,
    className: "bg-yellow-400 hover:bg-yellow-500 text-yellow-900 font-bold p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
    title: t('common.apply_nano_edit'),
    "aria-label": t('common.apply_nano_edit')
  }, isProcessing ? /*#__PURE__*/React.createElement(RefreshCw, {
    size: 16,
    className: "animate-spin"
  }) : /*#__PURE__*/React.createElement(Send, {
    size: 16
  }))), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] text-slate-600 italic mt-0.5 block"
  }, t('visuals.nano_active_status'))), /*#__PURE__*/React.createElement("div", {
    className: "bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg text-sm text-red-800 mb-6"
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "font-bold mb-1"
  }, t('visuals.warning.title')), /*#__PURE__*/React.createElement("p", {
    className: "mb-2",
    dangerouslySetInnerHTML: {
      __html: t('visuals.warning.desc')
    }
  }), /*#__PURE__*/React.createElement("p", {
    dangerouslySetInnerHTML: {
      __html: t('visuals.warning.tip')
    }
  }))), isTeacherMode && /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 w-full max-w-2xl"
  }, /*#__PURE__*/React.createElement("button", {
    onClick: handleDownloadImage,
    "data-help-key": "visuals_download",
    className: "flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
  }, /*#__PURE__*/React.createElement(Download, {
    size: 18
  }), " ", t('visuals.download')), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('visuals.upload_image') || 'Upload your own image',
    title: t('visuals.upload_image') || 'Upload your own image',
    onClick: () => singleImageFileRef.current?.click(),
    className: "flex-none flex items-center justify-center gap-2 bg-purple-50 text-purple-600 py-2 px-4 rounded-lg hover:bg-purple-100 transition-colors font-medium border border-purple-200"
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontSize: '18px'
    }
  }, "\uD83D\uDCF7")), /*#__PURE__*/React.createElement("button", {
    "aria-label": t('common.regenerate'),
    onClick: handleRestoreImage,
    "data-help-key": "visuals_regenerate",
    className: "flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-600 py-2 px-4 rounded-lg hover:bg-amber-100 transition-colors font-medium border border-amber-600"
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 18
  })))));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ImageView = ImageView;
  window.AlloModules.ViewImageModule = true;
})();
