/**
 * AlloFlow View - Concept Sort Renderer
 *
 * Extracted from AlloFlowANTI.txt activeView==='concept-sort' block.
 * Source range: 309 lines body. Renders: pre-activity review (teacher
 * edit categories + items + image-size slider + regenerate/upload/clear
 * image), launch button, and the active ConceptSortGame component.
 */
(function() {
  'use strict';
  if (window.AlloModules && window.AlloModules.ConceptSortView) {
    console.log('[CDN] ViewConceptSortModule already loaded, skipping');
    return;
  }
  var React = window.React;
  if (!React) { console.error('[ViewConceptSortModule] React not found on window'); return; }
  var Fragment = React.Fragment;

  var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? /*#__PURE__*/React.createElement(I, props) : null;
  };
};
var Filter = _lazyIcon('Filter');
var Gamepad2 = _lazyIcon('Gamepad2');
function ConceptSortView(props) {
  var t = props.t;
  var isTeacherMode = props.isTeacherMode;
  var isIndependentMode = props.isIndependentMode;
  var generatedContent = props.generatedContent;
  var conceptSortImageScale = props.conceptSortImageScale || 2.0;
  var csEdit = props.csEdit;
  var csAddingCatId = props.csAddingCatId;
  var csAddingText = props.csAddingText;
  var csBusyId = props.csBusyId;
  var isConceptSortGame = props.isConceptSortGame;
  var setConceptSortImageScale = props.setConceptSortImageScale;
  var setCsEdit = props.setCsEdit;
  var setCsAddingCatId = props.setCsAddingCatId;
  var setCsAddingText = props.setCsAddingText;
  var handleSetIsConceptSortGameToTrue = props.handleSetIsConceptSortGameToTrue;
  var csUpdateCategoryLabel = props.csUpdateCategoryLabel;
  var csUpdateItemText = props.csUpdateItemText;
  var csMoveItem = props.csMoveItem;
  var csRegenerateItem = props.csRegenerateItem;
  var csRegenerateItemImage = props.csRegenerateItemImage;
  var csUploadItemImage = props.csUploadItemImage;
  var csClearItemImage = props.csClearItemImage;
  var csDeleteItem = props.csDeleteItem;
  var csAddItem = props.csAddItem;
  // Image refinement (image-to-image edit) — mirrors glossary refine pattern.
  var csRefineItemImage = props.csRefineItemImage;
  var csRefinementInputs = props.csRefinementInputs || {};
  var setCsRefinementInputs = props.setCsRefinementInputs || function () {};
  var conceptSortAutoRemoveWords = props.conceptSortAutoRemoveWords;
  var setConceptSortAutoRemoveWords = props.setConceptSortAutoRemoveWords || function () {};
  var closeConceptSort = props.closeConceptSort;
  var handleGenerateConceptItem = props.handleGenerateConceptItem;
  var handleGameScoreUpdate = props.handleGameScoreUpdate;
  var handleGameCompletion = props.handleGameCompletion;
  var handleExplainConceptSortItem = props.handleExplainConceptSortItem;
  var playSound = props.playSound;
  var ErrorBoundary = props.ErrorBoundary;
  var ConceptSortGame = props.ConceptSortGame;
  // Cards whose categoryId names no category are invisible in the category
  // lists and left out of play; list them in their own group to be assigned.
  var reviewCategories = generatedContent && generatedContent.data && generatedContent.data.categories || [];
  var reviewItems = generatedContent && generatedContent.data && generatedContent.data.items || [];
  var orphanItems = reviewItems.filter(function (it) {
    return it && !reviewCategories.some(function (c) {
      return String(c.id) === String(it.categoryId);
    });
  });
  var reviewGroups = orphanItems.length ? reviewCategories.concat([{
    id: '__uncategorized',
    label: t('concept_sort.uncategorized_group') || 'Uncategorized: fix before students play',
    __orphans: true
  }]) : reviewCategories;
  return /*#__PURE__*/React.createElement("div", {
    className: "space-y-6 h-full flex flex-col",
    "data-help-key": "concept_sort_panel"
  }, isTeacherMode && !isIndependentMode && /*#__PURE__*/React.createElement("div", {
    "data-concept-sort-teacher-bar": true,
    className: "bg-indigo-50 p-4 rounded-lg border border-indigo-100 mb-6 flex justify-between items-center flex-wrap gap-4"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm text-indigo-800"
  }, /*#__PURE__*/React.createElement("strong", null, t('simplified.udl_goal').split(':')[0], ":"), " ", t('concept_sort.udl_goal_desc')), /*#__PURE__*/React.createElement("button", {
    onClick: handleSetIsConceptSortGameToTrue,
    "data-help-key": "concept_sort_start_button",
    className: "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 transition-all shadow-sm"
  }, /*#__PURE__*/React.createElement(Filter, {
    size: 14
  }), " ", isTeacherMode && !isIndependentMode ? t('concept_sort.preview') : t('concept_sort.start'))), !isTeacherMode || isIndependentMode ? /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center justify-center p-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 text-center animate-in fade-in zoom-in duration-300 my-auto"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-4 rounded-full mb-4"
  }, /*#__PURE__*/React.createElement(Filter, {
    size: 48,
    className: "text-indigo-500"
  })), /*#__PURE__*/React.createElement("h3", {
    className: "text-xl font-black text-slate-700 mb-2"
  }, t('concept_sort.ready_title')), /*#__PURE__*/React.createElement("p", {
    className: "text-slate-600 mb-8 max-w-md"
  }, t('concept_sort.ready_desc')), /*#__PURE__*/React.createElement("button", {
    onClick: handleSetIsConceptSortGameToTrue,
    "data-help-key": "concept_sort_start_button",
    className: "px-8 py-4 bg-indigo-600 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all flex items-center gap-3"
  }, /*#__PURE__*/React.createElement(Gamepad2, {
    size: 24,
    className: "fill-current text-yellow-700"
  }), " ", t('concept_sort.start_action'))) : generatedContent?.data && generatedContent?.data.categories && /*#__PURE__*/React.createElement("div", {
    className: "space-y-4 overflow-y-auto pr-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between flex-wrap gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "min-w-0"
  }, /*#__PURE__*/React.createElement("div", {
    className: "text-sm font-black text-amber-800"
  }, "📝 ", t('concept_sort.review_title') || 'Pre-Activity Review'), /*#__PURE__*/React.createElement("div", {
    className: "text-[11px] text-amber-700/90"
  }, t('concept_sort.pre_activity_help') || 'Edit categories and items before students play. AI outputs sometimes need tweaks.')), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3 flex-wrap"
  }, (generatedContent?.data.items || []).some(it => it && it.image) && /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 bg-white/80 border border-amber-200 rounded-full px-2 py-1",
    "data-help-key": "concept_sort_image_scale"
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: "concept-sort-image-scale-rv",
    className: "text-[10px] font-bold text-amber-800 uppercase tracking-wider"
  }, t('concept_sort.image_size_word') || 'Size'), /*#__PURE__*/React.createElement("input", {
    id: "concept-sort-image-scale-rv",
    type: "range",
    min: "0.5",
    max: "3.0",
    step: "0.05",
    value: conceptSortImageScale,
    onChange: e => setConceptSortImageScale(parseFloat(e.target.value) || 2.0),
    "aria-label": (t('concept_sort.image_scale_label') || 'Card image size') + ', ' + conceptSortImageScale.toFixed(2) + ' times',
    title: t('concept_sort.image_scale_hint') || 'Scales card visuals in the review panel and during play.',
    className: "w-24 sm:w-32 accent-amber-600"
  }), /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] font-mono text-amber-800 min-w-[2.5em] text-right"
  }, conceptSortImageScale.toFixed(2), "×"), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => setConceptSortImageScale(2.0),
    className: "text-[10px] text-amber-700 hover:text-amber-900 hover:underline",
    title: t('concept_sort.image_size_reset_aria') || 'Reset image size to default',
    "aria-label": t('concept_sort.image_size_reset_aria') || 'Reset image size to default'
  }, t('common.reset') || 'Reset')), typeof setConceptSortAutoRemoveWords === 'function' && /*#__PURE__*/React.createElement("label", {
    className: "flex items-center gap-1.5 bg-white/80 border border-amber-200 rounded-full px-2.5 py-1 cursor-pointer text-[10px] font-bold text-amber-800 uppercase tracking-wider",
    title: t('concept_sort.auto_remove_tooltip') || 'Run an image-to-image edit after each generation to remove leftover text/labels'
  }, /*#__PURE__*/React.createElement("input", {
    type: "checkbox",
    checked: !!conceptSortAutoRemoveWords,
    onChange: e => setConceptSortAutoRemoveWords(!!e.target.checked),
    className: "accent-amber-600",
    "aria-label": t('concept_sort.auto_remove_aria') || 'Auto-remove text from generated images'
  }), t('concept_sort.auto_remove_label') || 'Auto-remove text'), /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-bold text-amber-800 bg-white/80 border border-amber-200 rounded-full px-2 py-0.5"
  }, t('concept_sort.review_counts', {
    categories: reviewCategories.length,
    items: reviewItems.length
  }) || `${reviewCategories.length} categories · ${reviewItems.length} items`))), reviewGroups.map(cat => {
    const catItems = cat.__orphans ? orphanItems : reviewItems.filter(item => item && String(item.categoryId) === String(cat.id));
    const isEditingLabel = csEdit && csEdit.kind === 'category' && csEdit.id === cat.id;
    const isAddingHere = csAddingCatId === cat.id;
    const colorClass = cat.__orphans ? 'text-rose-800 bg-rose-50' : cat.color ? cat.color.replace('bg-', 'text-').replace('-500', '-700') + ' bg-' + cat.color.replace('bg-', '').replace('-500', '-50') : 'text-slate-700 bg-slate-50';
    return /*#__PURE__*/React.createElement("div", {
      key: cat.id,
      "data-help-key": "concept_sort_category",
      "data-concept-sort-uncategorized": cat.__orphans ? 'true' : undefined,
      className: `bg-white rounded-xl border-2 ${cat.__orphans ? 'border-rose-300' : 'border-slate-200'} shadow-sm overflow-hidden`
    }, /*#__PURE__*/React.createElement("div", {
      className: `flex items-center gap-2 px-3 py-2 border-b border-slate-100 ${colorClass}`
    }, cat.__orphans ? /*#__PURE__*/React.createElement("h4", {
      className: "flex-1 font-bold text-sm"
    }, "⚠ ", cat.label) : isEditingLabel ? /*#__PURE__*/React.createElement("input", {
      type: "text",
      autoFocus: true,
      value: csEdit.text,
      onChange: e => setCsEdit({
        kind: 'category',
        id: cat.id,
        text: e.target.value
      }),
      onBlur: () => {
        csUpdateCategoryLabel(cat.id, csEdit.text);
        setCsEdit(null);
      },
      onKeyDown: e => {
        if (e.key === 'Enter') {
          csUpdateCategoryLabel(cat.id, csEdit.text);
          setCsEdit(null);
        } else if (e.key === 'Escape') {
          setCsEdit(null);
        }
      },
      className: "flex-1 font-bold text-sm bg-white border border-amber-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-amber-400",
      "aria-label": t("a11y.edit_category_name")
    }) : /*#__PURE__*/React.createElement("button", {
      onClick: () => setCsEdit({
        kind: 'category',
        id: cat.id,
        text: cat.label
      }),
      className: "flex-1 text-left font-bold text-sm hover:underline truncate",
      title: t('concept_sort.rename_category') || 'Rename category',
      "aria-label": `${t('concept_sort.rename_category') || 'Rename category'} ${cat.label}`
    }, cat.label), /*#__PURE__*/React.createElement("span", {
      className: "text-[10px] font-bold opacity-75 whitespace-nowrap"
    }, t('concept_sort.item_count', {
      count: catItems.length
    }) || `${catItems.length} item(s)`), !cat.__orphans && /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setCsAddingCatId(cat.id);
        setCsAddingText('');
      },
      className: "px-2 py-0.5 rounded-full bg-white/70 text-[11px] font-bold hover:bg-white border border-current/20",
      title: t('concept_sort.add_item_to_category') || 'Add item to this category',
      "aria-label": `${t('concept_sort.add_item_to') || 'Add item to'} ${cat.label}`,
      disabled: csBusyId === '__adding__'
    }, "＋ ", t('common.add') || 'Add')), /*#__PURE__*/React.createElement("div", {
      className: "p-2 space-y-1.5 bg-slate-50/50"
    }, cat.__orphans && /*#__PURE__*/React.createElement("p", {
      className: "text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded p-2"
    }, t('concept_sort.uncategorized_help') || 'These cards match no category, so students will not see them. Choose a category for each card.'), catItems.length === 0 && !isAddingHere && /*#__PURE__*/React.createElement("div", {
      className: "text-[11px] text-rose-800 bg-rose-50 border border-rose-200 rounded p-2 text-center"
    }, "⚠ ", t('concept_sort.empty_category_warning') || 'No items in this category. Students will see an empty column.'), catItems.map(item => {
      const isEditingItem = csEdit && csEdit.kind === 'item' && csEdit.id === item.id;
      const isBusy = csBusyId === item.id;
      const refineInput = csRefinementInputs[item.id] || '';
      return /*#__PURE__*/React.createElement("div", {
        key: item.id,
        "data-help-key": "concept_sort_item",
        className: "flex flex-col gap-1 bg-white p-2 rounded-lg border border-slate-400 hover:border-slate-300 transition-colors"
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap items-center gap-2"
      }, item.image ? /*#__PURE__*/React.createElement("img", {
        src: item.image,
        alt: "",
        className: "object-contain rounded shrink-0 bg-white border border-slate-100",
        loading: "lazy",
        style: {
          width: Math.round(48 * conceptSortImageScale) + 'px',
          height: Math.round(48 * conceptSortImageScale) + 'px'
        }
      }) : /*#__PURE__*/React.createElement("div", {
        className: "rounded bg-slate-100 border border-slate-400 shrink-0 flex items-center justify-center text-slate-600 text-[10px]",
        title: t('concept_sort.no_image') || 'No image',
        style: {
          width: Math.round(48 * conceptSortImageScale) + 'px',
          height: Math.round(48 * conceptSortImageScale) + 'px'
        }
      }, "—"), isEditingItem ? /*#__PURE__*/React.createElement("input", {
        type: "text",
        autoFocus: true,
        value: csEdit.text,
        onChange: e => setCsEdit({
          kind: 'item',
          id: item.id,
          text: e.target.value
        }),
        onBlur: () => {
          csUpdateItemText(item.id, csEdit.text);
          setCsEdit(null);
        },
        onKeyDown: e => {
          if (e.key === 'Enter') {
            csUpdateItemText(item.id, csEdit.text);
            setCsEdit(null);
          } else if (e.key === 'Escape') {
            setCsEdit(null);
          }
        },
        className: "flex-1 text-xs bg-white border border-amber-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-amber-400",
        "aria-label": t("a11y.edit_item_text")
      }) : /*#__PURE__*/React.createElement("button", {
        onClick: () => setCsEdit({
          kind: 'item',
          id: item.id,
          text: item.content
        }),
        className: "flex-1 min-w-[120px] min-h-11 break-words text-left text-sm text-slate-700 hover:text-slate-900",
        title: t('concept_sort.edit_item') || 'Edit item',
        "aria-label": `${t('concept_sort.edit_item') || 'Edit item'} ${item.content}`
      }, item.content), /*#__PURE__*/React.createElement("select", {
        value: cat.__orphans ? '' : item.categoryId,
        onChange: e => {
          if (e.target.value) csMoveItem(item.id, e.target.value);
        },
        className: `text-[11px] bg-white border rounded px-1.5 py-1 text-slate-600 hover:border-slate-300 max-w-[120px] ${cat.__orphans ? 'border-rose-400' : 'border-slate-400'}`,
        title: t("a11y.move_item_category"),
        "aria-label": t("a11y.move_item_category"),
        disabled: isBusy
      }, cat.__orphans && /*#__PURE__*/React.createElement("option", {
        value: "",
        disabled: true
      }, t('concept_sort.choose_category') || 'Choose a category'), reviewCategories.map(c => /*#__PURE__*/React.createElement("option", {
        key: c.id,
        value: c.id
      }, c.label))), /*#__PURE__*/React.createElement("button", {
        onClick: () => csRegenerateItem(item, generatedContent?.data.categories || []),
        disabled: isBusy || csBusyId === '__adding__',
        className: "w-7 h-7 rounded text-sm hover:bg-indigo-50 text-indigo-600 disabled:opacity-30 flex items-center justify-center",
        title: t("a11y.regenerate_item"),
        "aria-label": t("a11y.regenerate_item")
      }, isBusy ? '⏳' : '🔄'), /*#__PURE__*/React.createElement("button", {
        onClick: () => csRegenerateItemImage(item),
        disabled: isBusy || csBusyId === '__adding__',
        className: "w-7 h-7 rounded text-sm hover:bg-purple-50 text-purple-600 disabled:opacity-30 flex items-center justify-center",
        title: t("a11y.regenerate_image"),
        "aria-label": t("a11y.regenerate_image")
      }, isBusy ? '⏳' : '🖼️'), /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-concept-sort-upload": item.id,
        onClick: e => {
          const input = e.currentTarget.nextElementSibling;
          if (input && typeof input.click === 'function') input.click();
        },
        disabled: isBusy || csBusyId === '__adding__',
        className: "w-7 h-7 rounded text-sm hover:bg-emerald-50 text-emerald-600 disabled:opacity-30 flex items-center justify-center",
        title: t('concept_sort.upload_image_hint') || 'Upload your own image (max 5 MB)',
        "aria-label": `${t("a11y.upload_custom_image") || 'Upload custom image'}: ${item.content}`
      }, /*#__PURE__*/React.createElement("span", {
        "aria-hidden": "true"
      }, "📤")), /*#__PURE__*/React.createElement("input", {
        type: "file",
        accept: "image/*",
        hidden: true,
        tabIndex: -1,
        "aria-hidden": "true",
        onChange: e => {
          const f = e.target.files && e.target.files[0];
          if (f) csUploadItemImage(item.id, f);
          e.target.value = '';
        }
      }), item.image && /*#__PURE__*/React.createElement("button", {
        onClick: () => csClearItemImage(item.id),
        disabled: isBusy,
        className: "w-7 h-7 rounded text-sm hover:bg-amber-50 text-amber-600 disabled:opacity-30 flex items-center justify-center",
        title: t("a11y.clear_image"),
        "aria-label": t("a11y.clear_image")
      }, "🚫"), item.image && csRefineItemImage && /*#__PURE__*/React.createElement("button", {
        onClick: () => csRefineItemImage(item.id, "Remove all text, labels, letters, and words from the image. Keep the illustration clean."),
        disabled: isBusy,
        className: "w-7 h-7 rounded text-sm hover:bg-red-50 text-red-600 disabled:opacity-30 flex items-center justify-center",
        title: t("a11y.auto_remove_text"),
        "aria-label": t("a11y.auto_remove_text")
      }, "🔤⃠"), /*#__PURE__*/React.createElement("button", {
        onClick: () => csDeleteItem(item.id),
        disabled: isBusy,
        className: "w-7 h-7 rounded text-sm hover:bg-rose-50 text-rose-500 disabled:opacity-30 flex items-center justify-center",
        title: t("a11y.delete_item"),
        "aria-label": t("a11y.delete_item")
      }, "🗑")), item.image && csRefineItemImage && /*#__PURE__*/React.createElement("div", {
        className: "flex items-center gap-1 pl-1 pr-1"
      }, /*#__PURE__*/React.createElement("input", {
        type: "text",
        value: refineInput,
        onChange: e => setCsRefinementInputs(prev => Object.assign({}, prev, {
          [item.id]: e.target.value
        })),
        onKeyDown: e => {
          if (e.key === 'Enter' && refineInput.trim()) {
            csRefineItemImage(item.id);
          }
        },
        placeholder: t("placeholders.edit_image_prompt"),
        disabled: isBusy,
        className: "flex-1 text-[11px] bg-white border border-amber-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-amber-400 placeholder:text-slate-400",
        "aria-label": `${t('concept_sort.refine_prompt_for') || 'Image edit prompt for'} ${item.content}`
      }), /*#__PURE__*/React.createElement("button", {
        onClick: () => csRefineItemImage(item.id),
        disabled: isBusy || !refineInput.trim(),
        className: "px-2 py-1 rounded text-[11px] font-bold bg-amber-700 hover:bg-amber-800 text-white disabled:opacity-30",
        title: t("a11y.apply_edit_prompt")
      }, "✏️ ", t('common.send') || 'Send')));
    }), isAddingHere && /*#__PURE__*/React.createElement("div", {
      className: "flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2"
    }, /*#__PURE__*/React.createElement("input", {
      type: "text",
      autoFocus: true,
      placeholder: t("placeholders.new_item_example"),
      value: csAddingText,
      onChange: e => setCsAddingText(e.target.value),
      onKeyDown: e => {
        if (e.key === 'Enter' && csAddingText.trim()) {
          csAddItem(cat.id, csAddingText, generatedContent?.data.categories || []);
        } else if (e.key === 'Escape') {
          setCsAddingCatId(null);
          setCsAddingText('');
        }
      },
      className: "flex-1 text-xs bg-white border border-emerald-300 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-emerald-400",
      "aria-label": t("a11y.new_item_text"),
      disabled: csBusyId === '__adding__'
    }), /*#__PURE__*/React.createElement("button", {
      onClick: () => csAddItem(cat.id, csAddingText, generatedContent?.data.categories || []),
      disabled: !csAddingText.trim() || csBusyId === '__adding__',
      className: "px-2 py-1 bg-emerald-700 text-white rounded text-[11px] font-bold disabled:opacity-40 hover:bg-emerald-800"
    }, csBusyId === '__adding__' ? '⏳' : t('common.add') || 'Add'), /*#__PURE__*/React.createElement("button", {
      onClick: () => {
        setCsAddingCatId(null);
        setCsAddingText('');
      },
      className: "px-2 py-1 bg-white text-slate-600 rounded text-[11px] font-bold border border-slate-400 hover:bg-slate-50"
    }, t('common.cancel') || 'Cancel'))));
  })), isConceptSortGame && /*#__PURE__*/React.createElement(ErrorBoundary, {
    fallbackMessage: "Concept Sort Game encountered an error."
  }, /*#__PURE__*/React.createElement(ConceptSortGame, {
    data: generatedContent?.data,
    onClose: closeConceptSort,
    playSound: playSound,
    onGenerateItem: handleGenerateConceptItem,
    onScoreUpdate: handleGameScoreUpdate,
    onGameComplete: handleGameCompletion,
    onExplainIncorrect: handleExplainConceptSortItem,
    imageScale: conceptSortImageScale,
    onImageScaleChange: setConceptSortImageScale,
    allowAddItems: Boolean(isTeacherMode)
  })));
}

  window.AlloModules = window.AlloModules || {};
  window.AlloModules.ConceptSortView = ConceptSortView;
  window.AlloModules.ViewConceptSortModule = true;
})();
