(function() {
'use strict';
  // WCAG 2.2 AA: Accessibility CSS
  if (!document.getElementById("persona-ui-module-a11y")) { var _s = document.createElement("style"); _s.id = "persona-ui-module-a11y"; _s.textContent = "@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } } .text-slate-600 { color: #64748b !important; }"; document.head.appendChild(_s); }
if (window.AlloModules && window.AlloModules.PersonaUIModule) { console.log('[CDN] PersonaUIModule already loaded, skipping'); return; }
// persona_ui_source.jsx — InteractiveBlueprintCard, HarmonyMeter, CharacterColumn
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useState = React.useState;
var useEffect = React.useEffect;
var useRef = React.useRef;
var useContext = React.useContext;
var useMemo = React.useMemo;
var useCallback = React.useCallback;
var _lazyIcon = function (name) {
  return function (props) {
    var I = window.AlloIcons && window.AlloIcons[name];
    return I ? React.createElement(I, props) : null;
  };
};
var CheckCircle2 = _lazyIcon('CheckCircle2');
var ChevronDown = _lazyIcon('ChevronDown');
var ChevronUp = _lazyIcon('ChevronUp');
var GripVertical = _lazyIcon('GripVertical');
var Lock = _lazyIcon('Lock');
var Pencil = _lazyIcon('Pencil');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var Search = _lazyIcon('Search');
var Sparkles = _lazyIcon('Sparkles');
var Trash2 = _lazyIcon('Trash2');
const GoldenThreadPanel = ({
  config,
  isEditing,
  onUpdate
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const [newConcept, setNewConcept] = useState('');
  const [newTerm, setNewTerm] = useState('');
  const dna = config && config.lessonDNA || null;
  if (!dna && !isEditing) return null;
  const eq = dna && typeof dna.essentialQuestion === 'string' ? dna.essentialQuestion.slice(0, 1200) : '';
  const concepts = (dna && Array.isArray(dna.goldenThread) ? dna.goldenThread : []).slice(0, 30).reduce((list, value) => {
    if (typeof value === 'string' && value.trim()) list.push(value.trim().slice(0, 200));
    return list;
  }, []);
  const terms = (dna && Array.isArray(dna.keyTerms) ? dna.keyTerms : []).slice(0, 60).reduce((list, value) => {
    if (typeof value === 'string' && value.trim()) list.push(value.trim().slice(0, 200));
    return list;
  }, []);
  const hasAny = eq.trim() || concepts.length > 0 || terms.length > 0;
  if (!hasAny && !isEditing) return null;
  const writeDNA = patch => {
    const nextDNA = Object.assign({
      essentialQuestion: '',
      goldenThread: [],
      keyTerms: []
    }, dna || {}, patch);
    onUpdate(Object.assign({}, config, {
      lessonDNA: nextDNA
    }));
  };
  const addConcept = () => {
    const v = (newConcept || '').trim().slice(0, 200);
    if (!v) return;
    if (concepts.indexOf(v) !== -1) {
      setNewConcept('');
      return;
    }
    writeDNA({
      goldenThread: concepts.concat([v])
    });
    setNewConcept('');
  };
  const removeConcept = idx => {
    writeDNA({
      goldenThread: concepts.filter(function (_, i) {
        return i !== idx;
      })
    });
  };
  const addTerm = () => {
    const v = (newTerm || '').trim().slice(0, 200);
    if (!v) return;
    if (terms.indexOf(v) !== -1) {
      setNewTerm('');
      return;
    }
    writeDNA({
      keyTerms: terms.concat([v])
    });
    setNewTerm('');
  };
  const removeTerm = idx => {
    writeDNA({
      keyTerms: terms.filter(function (_, i) {
        return i !== idx;
      })
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    className: "mb-4 p-3 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-2 mb-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-amber-500 fill-current"
  }), /*#__PURE__*/React.createElement("h5", {
    className: "text-xs font-bold text-amber-900 uppercase tracking-wider"
  }, t('persona.golden_thread') || 'Golden Thread'), isEditing && /*#__PURE__*/React.createElement("span", {
    className: "text-[10px] text-amber-700 italic ml-auto"
  }, t('persona.edits_apply_before_generation') || 'Edits apply before generation')), /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-0.5"
  }, t('persona.essential_question') || 'Essential Question'), isEditing ? /*#__PURE__*/React.createElement("textarea", {
    "aria-label": t('persona.essential_question') || 'Essential Question',
    value: eq,
    onChange: e => writeDNA({
      essentialQuestion: e.target.value.slice(0, 1200)
    }),
    maxLength: 1200,
    placeholder: t('persona.essential_question_placeholder') || 'The ONE main learning question students will answer...',
    rows: 2,
    className: "w-full text-sm text-slate-700 italic bg-white border border-amber-200 rounded p-1.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none resize-none"
  }) : eq ? /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 italic leading-relaxed"
  }, "\"", eq, "\"") : /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-500 italic"
  }, t('persona.none_set') || '(none set)')), /*#__PURE__*/React.createElement("div", {
    className: "mb-2"
  }, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1"
  }, t('persona.core_concepts') || 'Core Concepts'), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 items-center"
  }, concepts.map(function (c, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-amber-200 text-amber-900 rounded-full"
    }, c, isEditing && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => removeConcept(i),
      "aria-label": t('persona.remove_concept_aria', {
        concept: c
      }) || 'Remove concept ' + c,
      className: "ml-1 text-amber-600 hover:text-red-500 font-bold leading-none"
    }, "\xD7"));
  }), isEditing && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    "aria-label": t('persona.add_concept_placeholder') || 'Add concept',
    value: newConcept,
    maxLength: 200,
    onChange: e => setNewConcept(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.isComposing && !(e.nativeEvent && e.nativeEvent.isComposing) && e.keyCode !== 229) {
        e.preventDefault();
        addConcept();
      }
    },
    placeholder: t('persona.add_concept_placeholder') || '+ add concept',
    className: "text-[11px] px-2 py-0.5 bg-white border border-amber-200 rounded-full focus:border-amber-500 outline-none w-28"
  })), !isEditing && concepts.length === 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500 italic"
  }, t('persona.none_set') || '(none set)'))), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1"
  }, t('persona.key_vocabulary') || 'Key Vocabulary'), /*#__PURE__*/React.createElement("div", {
    className: "flex flex-wrap gap-1 items-center"
  }, terms.map(function (term, i) {
    return /*#__PURE__*/React.createElement("span", {
      key: i,
      className: "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-indigo-200 text-indigo-900 rounded-full font-medium"
    }, term, isEditing && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => removeTerm(i),
      "aria-label": t('persona.remove_term_aria', {
        term: term
      }) || 'Remove term ' + term,
      className: "ml-1 text-indigo-600 hover:text-red-500 font-bold leading-none"
    }, "\xD7"));
  }), isEditing && /*#__PURE__*/React.createElement("span", {
    className: "inline-flex items-center gap-1"
  }, /*#__PURE__*/React.createElement("input", {
    type: "text",
    "aria-label": t('persona.add_term_placeholder') || 'Add term',
    value: newTerm,
    maxLength: 200,
    onChange: e => setNewTerm(e.target.value),
    onKeyDown: e => {
      if (e.key === 'Enter' && !e.isComposing && !(e.nativeEvent && e.nativeEvent.isComposing) && e.keyCode !== 229) {
        e.preventDefault();
        addTerm();
      }
    },
    placeholder: t('persona.add_term_placeholder') || '+ add term',
    className: "text-[11px] px-2 py-0.5 bg-white border border-indigo-200 rounded-full focus:border-indigo-500 outline-none w-28"
  })), !isEditing && terms.length === 0 && /*#__PURE__*/React.createElement("span", {
    className: "text-xs text-slate-500 italic"
  }, t('persona.none_set') || '(none set)'))));
};
const InteractiveBlueprintCard = React.memo(({
  config,
  onUpdate,
  onConfirm,
  onCancel
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [reorderStatus, setReorderStatus] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const getReadableToolLabel = id => String(id || '').split('-').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  const getPlanItems = cfg => {
    if (!cfg) return [];
    const rawPlan = Array.isArray(cfg.resourcePlan) && cfg.resourcePlan.length > 0 ? cfg.resourcePlan : Array.isArray(cfg.recommendedResources) ? cfg.recommendedResources : [];
    return rawPlan.map((item, idx) => {
      const type = typeof item === 'string' ? item : item && (item.tool || item.type || item.toolId || item.resourceType || item.id);
      if (!type) return null;
      const directive = typeof item === 'string' ? cfg.toolDirectives?.[type] || "" : item.directive || item.instructions || item.customInstructions || cfg.toolDirectives?.[type] || "";
      return {
        id: typeof item === 'object' && item.uiId || `step-${idx}-${type}`,
        type,
        directive
      };
    }).filter(Boolean);
  };
  useEffect(() => {
    setItems(getPlanItems(config));
  }, [config]);
  const syncChanges = newItems => {
    setItems(newItems);
    const resourcePlan = newItems.map(i => ({
      tool: i.type,
      directive: i.directive || ""
    }));
    const toolDirectives = resourcePlan.reduce((acc, curr) => {
      if (!acc[curr.tool]) acc[curr.tool] = curr.directive || "";
      return acc;
    }, {});
    const newConfig = {
      ...config,
      resourcePlan,
      recommendedResources: resourcePlan.map(i => i.tool),
      toolDirectives
    };
    onUpdate(newConfig);
  };
  const handleDragStart = (e, index) => {
    setDraggedItemIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedItemIndex === null || draggedItemIndex === index) return;
    const newItems = [...items];
    const draggedItem = newItems[draggedItemIndex];
    newItems.splice(draggedItemIndex, 1);
    newItems.splice(index, 0, draggedItem);
    setDraggedItemIndex(index);
    syncChanges(newItems);
  };
  const handleDragEnd = () => {
    setDraggedItemIndex(null);
  };
  const handleMoveItem = (index, delta) => {
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const newItems = [...items];
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(nextIndex, 0, movedItem);
    syncChanges(newItems);
    setReorderStatus(t('blueprint.moved_position', {
      position: nextIndex + 1
    }) || `Moved plan step to position ${nextIndex + 1}.`);
  };
  const handleTypeChange = (index, newType) => {
    const newItems = [...items];
    newItems[index].type = newType;
    syncChanges(newItems);
  };
  const handleDirectiveChange = (index, newText) => {
    const newItems = [...items];
    newItems[index].directive = newText;
    syncChanges(newItems);
  };
  const handleDelete = index => {
    const newItems = items.filter((_, i) => i !== index);
    syncChanges(newItems);
  };
  const handleAddStep = () => {
    const newItem = {
      id: `new-${Date.now()}`,
      type: 'simplified',
      directive: 'New step...'
    };
    syncChanges([...items, newItem]);
  };
  const toolOptions = useMemo(() => {
    const catalogModule = window.AlloModules?.ToolCatalog;
    const catalog = catalogModule && catalogModule.TOOL_CATALOG || window.TOOL_CATALOG;
    if (Array.isArray(catalog) && catalog.length > 0) {
      return catalog.map(entry => {
        const localized = entry.sidebarKey ? t(entry.sidebarKey) : "";
        const fallbackLabel = entry.id === 'dbq' ? 'DBQ' : getReadableToolLabel(entry.id);
        return {
          value: entry.id,
          label: localized && localized !== entry.sidebarKey ? localized : entry.label || fallbackLabel
        };
      });
    }
    return [{
      value: 'analysis',
      label: t('sidebar.tool_analysis') || 'Analysis'
    }, {
      value: 'simplified',
      label: t('sidebar.tool_simplified') || 'Simplified Text'
    }, {
      value: 'glossary',
      label: t('sidebar.tool_glossary') || 'Glossary'
    }, {
      value: 'outline',
      label: t('sidebar.tool_outline') || 'Outline'
    }, {
      value: 'image',
      label: t('sidebar.tool_visual') || 'Visual'
    }, {
      value: 'quiz',
      label: t('sidebar.tool_quiz') || 'Quiz'
    }, {
      value: 'sentence-frames',
      label: t('sidebar.tool_scaffolds') || 'Sentence Frames'
    }, {
      value: 'brainstorm',
      label: t('sidebar.tool_brainstorm') || 'Brainstorm'
    }, {
      value: 'timeline',
      label: t('sidebar.tool_timeline') || 'Timeline'
    }, {
      value: 'concept-sort',
      label: t('sidebar.tool_concept') || 'Concept Sort'
    }, {
      value: 'adventure',
      label: t('sidebar.tool_adventure') || 'Adventure'
    }, {
      value: 'faq',
      label: t('sidebar.tool_faq') || 'FAQ'
    }, {
      value: 'persona',
      label: t('sidebar.tool_persona') || 'Persona Chat'
    }, {
      value: 'dbq',
      label: 'DBQ'
    }, {
      value: 'note-taking',
      label: t('sidebar.tool_note_taking') || 'Note Taking'
    }, {
      value: 'anchor-chart',
      label: t('sidebar.tool_anchor_chart') || 'Anchor Chart'
    }, {
      value: 'math',
      label: t('sidebar.tool_math') || 'STEM Lab'
    }, {
      value: 'lesson-plan',
      label: t('sidebar.tool_lesson') || 'Lesson Plan'
    }, {
      value: 'gemini-bridge',
      label: t('sidebar.tool_bridge') || 'Interactive App'
    }, {
      value: 'alignment-report',
      label: t('sidebar.tool_alignment') || 'Alignment Report'
    }];
  }, [t]);
  const getToolLabel = type => {
    const opt = toolOptions.find(o => o.value === type);
    return opt ? opt.label : type;
  };
  return /*#__PURE__*/React.createElement("div", {
    "data-help-key": "blueprint_card_panel",
    className: "bg-white border-2 border-indigo-100 rounded-xl p-4 my-2 shadow-lg animate-in zoom-in duration-300 w-full max-w-2xl"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center justify-between mb-4 pb-3 border-b border-indigo-50"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-indigo-100 p-2 rounded-lg text-indigo-600"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 18
  })), /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h4", {
    className: "font-bold text-indigo-900 text-sm"
  }, t('blueprint.header'), " ", isEditing ? `(${t('common.edit')})` : ""), /*#__PURE__*/React.createElement("p", {
    className: "text-xs text-slate-600"
  }, isEditing ? t('blueprint.drag_instruction') + ' ' + (t('blueprint.keyboard_reorder_instruction') || 'Use Move up and Move down to reorder without dragging.') : t('blueprint.review_instruction')))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "blueprint_edit_toggle_btn",
    "aria-label": isEditing ? t('blueprint.done_editing') : t('blueprint.edit_plan'),
    onClick: () => setIsEditing(prev => !prev),
    className: `p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border ${isEditing ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
  }, isEditing ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditing ? t('blueprint.done_editing') : t('blueprint.edit_plan'))), /*#__PURE__*/React.createElement(GoldenThreadPanel, {
    config: config,
    isEditing: isEditing,
    onUpdate: onUpdate
  }), /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    "aria-atomic": "true",
    className: "sr-only"
  }, reorderStatus), isEditing ? /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("div", {
    "data-help-key": "blueprint_resource_list",
    className: "space-y-2 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1"
  }, items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    draggable: true,
    onDragStart: e => handleDragStart(e, idx),
    onDragOver: e => handleDragOver(e, idx),
    onDragEnd: handleDragEnd,
    role: "group",
    "aria-label": t('blueprint.step_position_aria', {
      position: idx + 1,
      total: items.length
    }) || `Plan step ${idx + 1} of ${items.length}`,
    className: `group flex items-start gap-2 p-3 rounded-lg border-2 transition-all ${draggedItemIndex === idx ? 'opacity-50 border-dashed border-indigo-300 bg-indigo-50' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'}`
  }, /*#__PURE__*/React.createElement("div", {
    className: "mt-1 flex flex-col items-center gap-1 text-slate-600 cursor-grab active:cursor-grabbing hover:text-indigo-500"
  }, /*#__PURE__*/React.createElement(GripVertical, {
    size: 16,
    "aria-hidden": "true"
  }), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleMoveItem(idx, -1),
    disabled: idx === 0,
    className: "w-7 h-7 inline-flex items-center justify-center rounded border border-slate-400 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed",
    "aria-label": t('blueprint.move_up_aria', {
      position: idx + 1
    }) || `Move plan step ${idx + 1} up`
  }, /*#__PURE__*/React.createElement(ChevronUp, {
    size: 16,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: () => handleMoveItem(idx, 1),
    disabled: idx === items.length - 1,
    className: "w-7 h-7 inline-flex items-center justify-center rounded border border-slate-400 bg-white text-indigo-700 hover:bg-indigo-50 disabled:opacity-40 disabled:cursor-not-allowed",
    "aria-label": t('blueprint.move_down_aria', {
      position: idx + 1
    }) || `Move plan step ${idx + 1} down`
  }, /*#__PURE__*/React.createElement(ChevronDown, {
    size: 16,
    "aria-hidden": "true"
  }))), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow grid grid-cols-1 sm:grid-cols-3 gap-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "col-span-1"
  }, /*#__PURE__*/React.createElement("select", {
    "aria-label": t('common.selection'),
    value: item.type,
    onChange: e => handleTypeChange(idx, e.target.value),
    className: "w-full text-xs font-bold text-slate-700 bg-white border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
  }, toolOptions.map(opt => /*#__PURE__*/React.createElement("option", {
    key: opt.value,
    value: opt.value
  }, opt.label)))), /*#__PURE__*/React.createElement("div", {
    className: "col-span-2"
  }, /*#__PURE__*/React.createElement("input", {
    "aria-label": t('common.enter_item'),
    type: "text",
    value: item.directive,
    onChange: e => handleDirectiveChange(idx, e.target.value),
    className: "w-full text-xs text-slate-600 bg-white border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none placeholder:italic",
    placeholder: t('blueprint.placeholder_instruction')
  }))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('common.delete'),
    onClick: () => handleDelete(idx),
    className: "mt-1.5 text-slate-600 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors",
    title: t('blueprint.remove_step_tooltip')
  }, /*#__PURE__*/React.createElement(Trash2, {
    size: 14
  }))))), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "blueprint_add_step_btn",
    "aria-label": t('blueprint.add_step'),
    onClick: handleAddStep,
    className: "w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 mb-4"
  }, /*#__PURE__*/React.createElement(Plus, {
    size: 14
  }), " ", t('blueprint.add_step'))) : /*#__PURE__*/React.createElement("div", {
    "data-help-key": "blueprint_resource_list_review",
    className: "space-y-3 mb-6"
  }, items.map((item, idx) => /*#__PURE__*/React.createElement("div", {
    key: item.id,
    className: "flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100"
  }, /*#__PURE__*/React.createElement("div", {
    className: "bg-white border border-slate-400 text-slate-600 font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5"
  }, idx + 1), /*#__PURE__*/React.createElement("div", {
    className: "flex-grow"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider block w-fit mb-1"
  }, getToolLabel(item.type)), /*#__PURE__*/React.createElement("p", {
    className: "text-sm text-slate-700 leading-relaxed italic"
  }, "\"", item.directive || "No specific instructions.", "\"")))), items.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-center text-slate-600 text-sm italic py-4"
  }, t('blueprint.empty_plan'))), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-3 pt-3 border-t border-slate-100"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "blueprint_cancel_btn",
    "aria-label": t('common.cancel'),
    onClick: onCancel,
    className: "flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
  }, t('blueprint.cancel')), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "blueprint_generate_pack_btn",
    "aria-label": t('common.generate'),
    onClick: onConfirm,
    className: "flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-yellow-700 fill-current"
  }), " ", t('blueprint.generate'))));
});
const HarmonyMeter = ({
  score
}) => {
  const {
    t
  } = useContext(LanguageContext);
  const numericScore = Number(score);
  const safeScore = Number.isFinite(numericScore) ? Math.max(0, Math.min(100, Math.round(numericScore))) : 0;
  return /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-md mx-auto bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-indigo-100 shadow-sm animate-in motion-reduce:animate-none slide-in-from-top-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between items-end mb-1 px-1"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-[11px] font-black uppercase tracking-widest text-indigo-600"
  }, t('persona.harmony_label')), /*#__PURE__*/React.createElement("span", {
    className: "text-xs font-bold text-indigo-700"
  }, t('persona.harmony_score', {
    score: safeScore
  }))), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-label": t('persona.harmony_label'),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": safeScore,
    className: "h-3 w-full bg-slate-200 rounded-full overflow-hidden relative"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 transition-all motion-reduce:transition-none duration-1000 ease-out",
    style: {
      width: `${safeScore}%`
    }
  }), /*#__PURE__*/React.createElement("div", {
    className: "absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50 z-10"
  })), safeScore >= 80 && /*#__PURE__*/React.createElement("div", {
    className: "text-center mt-1 text-[11px] font-bold text-green-600 animate-pulse motion-reduce:animate-none"
  }, t('persona.common_ground')));
};
const CharacterColumn = React.memo(({
  character,
  side,
  onRetryPortrait
}) => {
  const {
    t
  } = useContext(LanguageContext);
  if (!character) return /*#__PURE__*/React.createElement("div", {
    className: "flex-1 bg-slate-50/50"
  });
  const safeNumber = (value, min, max, fallback) => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
  };
  const characterName = typeof character.name === 'string' && character.name.trim() ? character.name.trim().slice(0, 120) : t('persona.character_fallback');
  const characterRole = typeof character.role === 'string' ? character.role.trim().slice(0, 160) : '';
  const characterAvatarUrl = typeof character.avatarUrl === 'string' ? character.avatarUrl : null;
  const rapport = safeNumber(character.rapport ?? character.initialRapport, 0, 100, 30);
  const xp = safeNumber(character.accumulatedXP, 0, 300, 0);
  // Active objectives first — what the student can still pursue belongs on
  // top; completed secrets settle to the bottom (matches single-mode order
  // and quest-log convention).
  const sortedQuests = (Array.isArray(character.quests) ? character.quests : []).slice(0, 6).reduce((list, quest, index) => {
    if (!quest || typeof quest !== 'object' || typeof quest.text !== 'string' || !quest.text.trim()) return list;
    list.push({
      id: String(quest.id ?? 'q' + (index + 1)).slice(0, 80),
      text: quest.text.trim().slice(0, 500),
      difficulty: safeNumber(quest.difficulty, 0, 100, 20),
      isCompleted: quest.isCompleted === true
    });
    return list;
  }, []).sort((a, b) => {
    if (a.isCompleted === b.isCompleted) return 0;
    return a.isCompleted ? 1 : -1;
  });
  return /*#__PURE__*/React.createElement("div", {
    className: "flex flex-col items-center text-center h-full p-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: `
            w-full max-w-[280px] aspect-[3/4] rounded-2xl border-4 shadow-lg mb-4 overflow-hidden relative bg-white group
            ${side === 'left' ? 'border-indigo-200' : 'border-rose-200'}
        `
  }, characterAvatarUrl ? /*#__PURE__*/React.createElement("img", {
    loading: "lazy",
    src: characterAvatarUrl,
    alt: characterName,
    className: `w-full h-full object-cover transition-all motion-reduce:transition-none duration-700 ${character.isUpdating ? 'blur-sm scale-105' : 'scale-100'}`
  }) : /*#__PURE__*/React.createElement("div", {
    className: "w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2 p-4"
  }, /*#__PURE__*/React.createElement("span", {
    className: "text-3xl text-slate-600 font-bold"
  }, "?"), onRetryPortrait && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": t('persona.generate_portrait_for', {
      name: characterName
    }),
    onClick: () => onRetryPortrait(character),
    disabled: Boolean(character.isUpdating),
    "aria-busy": character.isUpdating ? 'true' : 'false',
    className: `px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all motion-reduce:transition-none shadow-sm hover:shadow-md cursor-pointer z-10 relative disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-sm ${side === 'left' ? 'bg-indigo-500 hover:bg-indigo-600 text-white' : 'bg-rose-500 hover:bg-rose-600 text-white'}`
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 12
  }), t('persona.generate_portrait'))), character.isUpdating && /*#__PURE__*/React.createElement("div", {
    className: "absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-30 pointer-events-auto",
    role: "status",
    "aria-live": "polite",
    "aria-label": t('persona.status_generating_portrait', {
      name: characterName
    })
  }, /*#__PURE__*/React.createElement(RefreshCw, {
    size: 32,
    className: "text-white animate-spin motion-reduce:animate-none"
  })), /*#__PURE__*/React.createElement("div", {
    className: "absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-2 text-white border-t border-white/10"
  }, /*#__PURE__*/React.createElement("h3", {
    className: "break-words [overflow-wrap:anywhere] font-black text-lg leading-none mb-1"
  }, characterName), characterRole && /*#__PURE__*/React.createElement("p", {
    className: "break-words [overflow-wrap:anywhere] text-[11px] font-bold uppercase tracking-wider opacity-80"
  }, characterRole))), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[260px] px-2"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] font-bold text-slate-600 uppercase mb-1"
  }, /*#__PURE__*/React.createElement("span", null, t('persona.rapport_label')), /*#__PURE__*/React.createElement("span", {
    className: `${rapport >= 70 ? 'text-green-600' : 'text-slate-600'}`
  }, rapport, "%")), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-label": t('persona.rapport_label'),
    "aria-valuemin": 0,
    "aria-valuemax": 100,
    "aria-valuenow": rapport,
    className: "w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: `h-full transition-all motion-reduce:transition-none duration-500 ${side === 'left' ? 'bg-indigo-500' : 'bg-rose-500'}`,
    style: {
      width: `${rapport}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[260px] px-2 mt-3"
  }, /*#__PURE__*/React.createElement("div", {
    className: "flex justify-between text-[11px] font-bold text-slate-600 uppercase mb-1"
  }, /*#__PURE__*/React.createElement("span", null, t('common.xp')), /*#__PURE__*/React.createElement("span", null, xp, "/300")), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-label": t('persona.xp_progress', {
      name: characterName,
      xp
    }),
    "aria-valuemin": 0,
    "aria-valuemax": 300,
    "aria-valuenow": xp,
    className: "w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-400"
  }, /*#__PURE__*/React.createElement("div", {
    className: "h-full bg-amber-500 transition-all motion-reduce:transition-none duration-500",
    style: {
      width: `${xp / 300 * 100}%`
    }
  }))), /*#__PURE__*/React.createElement("div", {
    className: "w-full max-w-[280px] text-left flex-1 overflow-y-auto custom-scrollbar mt-4 px-1"
  }, /*#__PURE__*/React.createElement("h4", {
    className: "text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1"
  }, /*#__PURE__*/React.createElement(Search, {
    size: 10
  }), " ", t('persona.objectives_label')), /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, sortedQuests.map((q, i) => {
    const isLocked = rapport < q.difficulty;
    return /*#__PURE__*/React.createElement("div", {
      key: i,
      className: `
                            p-2.5 rounded border text-[11px] leading-tight transition-all motion-reduce:transition-none relative overflow-hidden
                            ${q.isCompleted ? 'bg-green-50 border-green-200 text-green-800' : isLocked ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white border-indigo-200 text-slate-600'}
                        `
    }, /*#__PURE__*/React.createElement("div", {
      className: "flex gap-2 items-start relative z-10"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mt-0.5 shrink-0"
    }, q.isCompleted ? /*#__PURE__*/React.createElement(CheckCircle2, {
      size: 12
    }) : isLocked ? /*#__PURE__*/React.createElement(Lock, {
      size: 12
    }) : /*#__PURE__*/React.createElement("div", {
      className: "w-3 h-3 border-2 border-indigo-200 rounded-full"
    })), /*#__PURE__*/React.createElement("div", {
      className: "flex-grow"
    }, /*#__PURE__*/React.createElement("span", {
      className: `break-words [overflow-wrap:anywhere] font-bold block ${q.isCompleted ? 'line-through opacity-70' : ''}`
    }, q.text), !q.isCompleted && isLocked && /*#__PURE__*/React.createElement("span", {
      className: "text-[11px] uppercase font-bold opacity-70 mt-1 block"
    }, t('persona.rapport_requirement', {
      difficulty: q.difficulty
    })))));
  }))));
});
window.AlloModules = window.AlloModules || {};
window.AlloModules.InteractiveBlueprintCard = InteractiveBlueprintCard;
window.AlloModules.HarmonyMeter = HarmonyMeter;
window.AlloModules.CharacterColumn = CharacterColumn;
window.AlloModules.PersonaUIModule = true;
console.log('[PersonaUIModule] 3 components registered');
})();
