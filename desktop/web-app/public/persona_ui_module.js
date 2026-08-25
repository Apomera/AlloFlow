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
var AlertTriangle = _lazyIcon('AlertTriangle');
var CheckCircle2 = _lazyIcon('CheckCircle2');
var ChevronDown = _lazyIcon('ChevronDown');
var ChevronUp = _lazyIcon('ChevronUp');
var GripVertical = _lazyIcon('GripVertical');
var Copy = _lazyIcon('Copy');
var Download = _lazyIcon('Download');
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
  run,
  isRunning,
  onStopRun,
  onRebuildStep,
  onOpenErrorLog,
  onCopyDiagnostics,
  onDownloadDiagnostics,
  summarizeFailureReason,
  onPreviewStep,
  onSaveTemplate,
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
  // Save-as-template review state. `directivePolicy` is {uiId: 'blank'} for
  // rows the teacher chose NOT to carry forward; anything absent means keep.
  const [showTemplateSave, setShowTemplateSave] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [directivePolicy, setDirectivePolicy] = useState({});
  // Which rows have their "what is this?" description expanded. A LIST, not a
  // single id: a teacher deciding between two proposed tools wants both open at
  // once, which is the whole reason for asking. Grouped with the other state so
  // it can never drift below a render-time reader (the TDZ crash class the
  // deploy gates do not catch).
  const [openDescIds, setOpenDescIds] = useState([]);
  const getReadableToolLabel = id => String(id || '').split('-').map(part => part ? part.charAt(0).toUpperCase() + part.slice(1) : '').join(' ');
  const getPlanInstructionalText = (type, existing) => {
    const hasExisting = existing && typeof existing === 'object';
    if (!hasExisting && type !== 'simplified' && type !== 'analysis') return null;
    const defaults = type === 'simplified' ? {
      role: 'supplemental',
      form: 'adapted'
    } : type === 'analysis' ? {
      role: 'primary',
      form: 'original'
    } : {};
    const candidate = {
      schemaVersion: 1,
      role: defaults.role || 'unspecified',
      form: defaults.form || 'original',
      sourceArtifactId: null,
      primaryArtifactId: null,
      designationSource: 'workflow-default',
      replacementAuthorization: {
        authorized: false,
        source: 'none'
      },
      complexity: {
        requestedGrade: config?.instructionalContext?.instructionalGrade || config?.globalSettings?.gradeLevel || '',
        calibrationTarget: '',
        measuredGrade: null,
        method: '',
        status: 'unavailable',
        contentFingerprint: '',
        measuredAt: '',
        language: config?.globalSettings?.language || config?.globalSettings?.leveledTextLanguage || 'English'
      },
      ...(hasExisting ? existing : {})
    };
    const contextModule = window.AlloModules?.InstructionalContext;
    return contextModule && typeof contextModule.normalizeInstructionalText === 'function' ? contextModule.normalizeInstructionalText(candidate) : candidate;
  };
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
        directive,
        instructionalText: getPlanInstructionalText(type, typeof item === 'object' && item ? item.instructionalText : null),
        generationAction: typeof item === 'object' && item ? item.generationAction : null,
        generationIdentity: typeof item === 'object' && item ? item.generationIdentity : null,
        generationVariants: typeof item === 'object' && item && Array.isArray(item.generationVariants) ? item.generationVariants : [],
        existingArtifactId: typeof item === 'object' && item ? item.existingArtifactId : null,
        variantKey: typeof item === 'object' && item ? item.variantKey : null,
        explicitVariantKey: typeof item === 'object' && item ? item.explicitVariantKey : null,
        variantKeyDerived: !!(typeof item === 'object' && item && item.variantKeyDerived === true),
        sourceFingerprint: typeof item === 'object' && item ? item.sourceFingerprint : null,
        sourceArtifactId: typeof item === 'object' && item ? item.sourceArtifactId : null,
        contextFingerprint: typeof item === 'object' && item ? item.contextFingerprint : null,
        contextInputsFingerprint: typeof item === 'object' && item ? item.contextInputsFingerprint : null,
        contextFingerprintDerived: !!(typeof item === 'object' && item && item.contextFingerprintDerived === true),
        generationPolicy: typeof item === 'object' && item ? item.generationPolicy : null,
        novelResource: !!(typeof item === 'object' && item && item.novelResource === true),
        suppressedGenerationVariants: typeof item === 'object' && item && Array.isArray(item.suppressedGenerationVariants) ? item.suppressedGenerationVariants : [],
        generationMatrixUnavailable: !!(typeof item === 'object' && item && item.generationMatrixUnavailable === true),
        activityMode: typeof item === 'object' && item ? item.activityMode : null,
        activityConfig: typeof item === 'object' && item ? item.activityConfig : null
      };
    }).filter(Boolean);
  };
  useEffect(() => {
    setItems(getPlanItems(config));
  }, [config]);
  const syncChanges = newItems => {
    const existingTextContext = config?.instructionalContext || {};
    const acceptedItems = existingTextContext.adaptedTextPolicy === 'prohibited' ? newItems.filter(item => item && item.type !== 'simplified') : newItems;
    setItems(acceptedItems);
    // Carry the row identity back into the config. Without this every teacher
    // edit re-derived positional ids and broke the plan<->resource binding.
    const resourcePlan = acceptedItems.map(i => ({
      tool: i.type,
      directive: i.directive || "",
      uiId: i.id,
      instructionalText: getPlanInstructionalText(i.type, i.instructionalText),
      generationAction: i.generationAction || null,
      generationIdentity: i.generationIdentity || null,
      generationVariants: Array.isArray(i.generationVariants) ? i.generationVariants : [],
      existingArtifactId: i.existingArtifactId || null,
      variantKey: i.variantKey || null,
      explicitVariantKey: i.explicitVariantKey || null,
      variantKeyDerived: i.variantKeyDerived === true,
      sourceFingerprint: i.sourceFingerprint || null,
      sourceArtifactId: i.sourceArtifactId || null,
      contextFingerprint: i.contextFingerprint || null,
      contextInputsFingerprint: i.contextInputsFingerprint || null,
      contextFingerprintDerived: i.contextFingerprintDerived === true,
      generationPolicy: i.generationPolicy || null,
      novelResource: i.novelResource === true,
      suppressedGenerationVariants: Array.isArray(i.suppressedGenerationVariants) ? i.suppressedGenerationVariants : [],
      generationMatrixUnavailable: i.generationMatrixUnavailable === true,
      activityMode: i.activityMode || null,
      activityConfig: i.activityConfig || null
    }));
    const toolDirectives = resourcePlan.reduce((acc, curr) => {
      if (!acc[curr.tool]) acc[curr.tool] = curr.directive || "";
      return acc;
    }, {});
    const newConfig = {
      ...config,
      instructionalContext: {
        ...existingTextContext,
        adaptedTextPolicy: existingTextContext.adaptedTextPolicy === 'prohibited' ? 'prohibited' : resourcePlan.some(row => row.tool === 'simplified') ? 'include' : 'omit',
        adaptedTextPolicySource: existingTextContext.adaptedTextPolicy === 'prohibited' ? 'standard' : 'educator',
        textAccessReason: existingTextContext.adaptedTextPolicy === 'prohibited' ? 'sourced-adaptation-prohibition' : 'educator-choice'
      },
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
    if (newType === 'simplified' && config?.instructionalContext?.adaptedTextPolicy === 'prohibited') return;
    const newItems = [...items];
    newItems[index].type = newType;
    // A resource-type change is a new instructional designation. Do not carry
    // an adapted-text role onto a quiz (or vice versa).
    newItems[index].instructionalText = getPlanInstructionalText(newType, null);
    newItems[index].generationAction = null;
    newItems[index].generationIdentity = null;
    newItems[index].generationVariants = [];
    newItems[index].existingArtifactId = null;
    newItems[index].variantKey = null;
    newItems[index].explicitVariantKey = null;
    newItems[index].variantKeyDerived = false;
    newItems[index].generationPolicy = null;
    newItems[index].novelResource = false;
    newItems[index].suppressedGenerationVariants = [];
    newItems[index].generationMatrixUnavailable = false;
    syncChanges(newItems);
  };
  const handleDirectiveChange = (index, newText) => {
    const newItems = [...items];
    newItems[index].directive = newText;
    // A directive is part of a repeatable resource's purpose identity. Clear
    // the reviewed matrix so the shared resolver recomputes new/reuse/variant
    // status before execution instead of applying a stale identity.
    newItems[index].generationAction = null;
    newItems[index].generationIdentity = null;
    newItems[index].generationVariants = [];
    newItems[index].existingArtifactId = null;
    newItems[index].variantKey = null;
    newItems[index].explicitVariantKey = null;
    newItems[index].variantKeyDerived = false;
    newItems[index].generationPolicy = null;
    newItems[index].novelResource = false;
    newItems[index].suppressedGenerationVariants = [];
    newItems[index].generationMatrixUnavailable = false;
    syncChanges(newItems);
  };
  const handleDelete = index => {
    const newItems = items.filter((_, i) => i !== index);
    syncChanges(newItems);
  };
  const handleAddStep = () => {
    const defaultType = config?.instructionalContext?.adaptedTextPolicy === 'prohibited' ? 'glossary' : 'simplified';
    const newItem = {
      id: `new-${Date.now()}`,
      type: defaultType,
      directive: 'New step...',
      instructionalText: getPlanInstructionalText(defaultType, null)
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
          label: localized && localized !== entry.sidebarKey ? localized : entry.label || fallbackLabel,
          // TOOL_CATALOG.description is a REQUIRED one-sentence "what it does",
          // already written for every catalog tool and keyed by the same id the
          // plan rows use — so this is wiring, not new copy. It exists for the
          // LLM prompt, hence English-only; the t() lookup lets a translation
          // land later without touching this code.
          desc: t('tool_desc.' + entry.id) || entry.description || ''
        };
      });
    }
    return [{
      value: 'analysis',
      label: t('sidebar.tool_analysis') || 'Analysis'
    }, {
      value: 'simplified',
      label: t('sidebar.tool_simplified') || 'Adapted Text'
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
      label: t('sidebar.tool_math') || 'STEAM Lab'
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
  const getToolDesc = type => {
    const opt = toolOptions.find(o => o.value === type);
    return opt && opt.desc || '';
  };
  const toggleDesc = id => setOpenDescIds(prev => prev.indexOf(id) === -1 ? prev.concat([id]) : prev.filter(x => x !== id));
  const hasFailureDiagnostics = Boolean(run && Object.values(run.rows || {}).some(row => row && ['partial', 'failed', 'interrupted', 'stopped'].includes(row.status)));
  const blueprintSettings = config?.globalSettings || {};
  const blueprintTextContext = config?.instructionalContext || {};
  const blueprintAdaptedPolicy = blueprintTextContext.adaptedTextPolicy || (items.some(item => item && item.type === 'simplified') ? 'include' : 'omit');
  const blueprintPrimaryAccess = blueprintTextContext.primaryTextAccess || 'available';
  const blueprintVariants = items.flatMap(item => Array.isArray(item.generationVariants) ? item.generationVariants : []);
  const blueprintMatrixModuleReady = (() => {
    try {
      const matrix = typeof window !== 'undefined' && window.AlloModules ? window.AlloModules.GenerationMatrix : null;
      return !!(matrix && typeof matrix.resolveGenerationMatrix === 'function');
    } catch (_) {
      return false;
    }
  })();
  const plannedMatrixUnavailable = items.some(item => item && item.generationMatrixUnavailable === true);
  const runtimeMatrixUnavailable = !!(run && (run.generationMatrixUnavailable === true || run.generationMatrixUnavailable === undefined && Object.values(run.rows || {}).some(row => row && row.generationMatrixUnavailable === true)));
  // A run record is authoritative once execution has been attempted. Before
  // that, retain the reviewed row marker and also detect a live module-load
  // failure so a legacy plan cannot promise a matrix that is not present.
  const blueprintMatrixUnavailable = run && typeof run.generationMatrixUnavailable === 'boolean' ? runtimeMatrixUnavailable : plannedMatrixUnavailable || !blueprintMatrixModuleReady;
  const blueprintMatrixReady = !blueprintMatrixUnavailable && items.length > 0 && items.every(item => Array.isArray(item.generationVariants) && item.generationVariants.length > 0);
  const matrixRetryPending = !!(run && run.retryable === true && run.reasonCode === 'generation-matrix-unavailable');
  const blueprintExpectedCalls = blueprintVariants.filter(variant => variant && variant.action !== 'reuse').length;
  const blueprintReuseCount = blueprintVariants.filter(variant => variant && variant.action === 'reuse').length;
  const blueprintGrades = Array.from(new Set(blueprintVariants.map(variant => variant && variant.grade).filter(Boolean)));
  const blueprintLanguages = Array.from(new Set(blueprintVariants.map(variant => variant && variant.language).filter(Boolean)));
  const configuredLanguages = blueprintSettings.leveledTextLanguage === 'All Selected Languages' ? Array.from(new Set(['English', ...(Array.isArray(blueprintSettings.selectedLanguages) ? blueprintSettings.selectedLanguages : [])])) : [blueprintSettings.leveledTextLanguage || blueprintSettings.language || 'English'];
  const resolvedTranslationTarget = blueprintSettings.resolvedTranslationTarget || blueprintSettings.translationTarget || null;
  const embeddedGlossaryLanguages = items.some(item => item && item.type === 'glossary') ? Array.from(new Set(Array.isArray(blueprintSettings.selectedLanguages) ? blueprintSettings.selectedLanguages.filter(Boolean) : [])) : [];
  const sourceSelection = run && run.sourceSelection || config?.sourcePolicy || null;
  const staleSettingNames = run && Array.isArray(run.staleSettings) ? run.staleSettings : [];
  const readableSettingName = field => ({
    gradeLevel: 'grade',
    language: 'primary language',
    selectedLanguages: 'output languages',
    studentInterests: 'student interests',
    targetStandards: 'standards',
    translationMode: 'translation policy',
    currentUiLanguage: 'interface language',
    differentiationRange: 'differentiation range',
    differentiationTypes: 'differentiated resources',
    differentiationCustomGrades: 'custom grades',
    dokLevel: 'DOK level',
    useEmojis: 'emoji preference',
    textFormat: 'text format',
    imageGenerationStyle: 'image style',
    imageAspectRatio: 'image aspect ratio'
  })[field] || String(field || '').replace(/([A-Z])/g, ' $1').trim();
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
  }, isEditing ? t('blueprint.drag_instruction') + ' ' + (t('blueprint.keyboard_reorder_instruction') || 'Use Move up and Move down to reorder without dragging.') : t('blueprint.review_instruction')))), /*#__PURE__*/React.createElement("div", {
    className: "flex items-center gap-1.5"
  }, hasFailureDiagnostics && typeof onOpenErrorLog === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "bp-open-error-log",
    onClick: onOpenErrorLog,
    className: "p-2 rounded-lg text-xs font-bold border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-600",
    title: t('blueprint.open_error_log') || 'Open error log',
    "aria-label": t('blueprint.open_error_log') || 'Open error log'
  }, /*#__PURE__*/React.createElement(AlertTriangle, {
    size: 14,
    "aria-hidden": "true"
  })), run && typeof onCopyDiagnostics === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "bp-copy-diagnostics",
    onClick: onCopyDiagnostics,
    className: "p-2 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
    title: t('blueprint.copy_diagnostics') || 'Copy sanitized Blueprint diagnostics',
    "aria-label": t('blueprint.copy_diagnostics') || 'Copy sanitized Blueprint diagnostics'
  }, /*#__PURE__*/React.createElement(Copy, {
    size: 14,
    "aria-hidden": "true"
  })), run && typeof onDownloadDiagnostics === 'function' && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "bp-download-diagnostics",
    onClick: onDownloadDiagnostics,
    className: "p-2 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500",
    title: t('blueprint.download_diagnostics') || 'Download Blueprint diagnostic report',
    "aria-label": t('blueprint.download_diagnostics') || 'Download Blueprint diagnostic report'
  }, /*#__PURE__*/React.createElement(Download, {
    size: 14,
    "aria-hidden": "true"
  })), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-help-key": "blueprint_edit_toggle_btn",
    "aria-label": isEditing ? t('blueprint.done_editing') : t('blueprint.edit_plan'),
    disabled: !!isRunning,
    title: isRunning ? t('blueprint.wait_for_run') || 'Wait for the run to finish (or stop it) before editing.' : undefined,
    onClick: () => setIsEditing(prev => !prev),
    className: `p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border disabled:opacity-40 disabled:cursor-not-allowed ${isEditing ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`
  }, isEditing ? /*#__PURE__*/React.createElement(CheckCircle2, {
    size: 14
  }) : /*#__PURE__*/React.createElement(Pencil, {
    size: 14
  }), isEditing ? t('blueprint.done_editing') : t('blueprint.edit_plan')))), blueprintMatrixUnavailable && /*#__PURE__*/React.createElement("div", {
    "data-testid": "bp-matrix-unavailable-warning",
    role: "alert",
    className: "mb-3 rounded-lg border border-amber-400 bg-amber-50 p-2.5 text-xs leading-relaxed text-amber-950"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold"
  }, t('blueprint.matrix_unavailable_title') || 'Generation planning is still loading.'), /*#__PURE__*/React.createElement("div", {
    className: "mt-0.5"
  }, t('blueprint.matrix_unavailable_detail') || 'Blueprint is paused: exact duplicate checks and grade/language versions must be resolved before any resources can run. Nothing is generated while this warning is shown.'), matrixRetryPending && /*#__PURE__*/React.createElement("div", {
    className: "mt-1 font-semibold",
    "data-testid": "bp-matrix-retry-guidance"
  }, t('blueprint.matrix_unavailable_retry') || 'Choose Generate again to retry after generation planning finishes loading.')), /*#__PURE__*/React.createElement("div", {
    "data-testid": "bp-generation-matrix-summary",
    role: "status",
    "aria-live": "polite",
    className: "mb-3 rounded-lg border border-sky-200 bg-sky-50 p-2.5 text-[11px] leading-relaxed text-sky-950"
  }, /*#__PURE__*/React.createElement("div", {
    className: "font-bold"
  }, t('blueprint.generation_impact') || 'Generation impact'), /*#__PURE__*/React.createElement("div", {
    className: "mt-0.5"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, t('blueprint.audience') || 'Audience', ":"), ' ', blueprintGrades.length ? blueprintGrades.join(', ') : blueprintSettings.gradeLevel || config?.instructionalContext?.instructionalGrade || t('fullpack.current_grade') || 'Current grade', ' · ', /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, t('blueprint.output_languages') || 'Output languages', ":"), ' ', (blueprintLanguages.length ? blueprintLanguages : configuredLanguages).join(', ')), /*#__PURE__*/React.createElement("div", {
    className: "mt-1",
    "data-testid": "bp-text-access-summary"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, t('blueprint.primary_text_access') || 'Source text', ":"), ' ', blueprintPrimaryAccess === 'required' ? t('blueprint.primary_text_required') || 'required primary text' : t('blueprint.primary_text_available') || 'available as the primary reference', ' Â· ', /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, t('blueprint.adapted_text') || 'Adapted Text', ":"), ' ', blueprintAdaptedPolicy === 'include' ? t('blueprint.adapted_included') || 'included as a supplemental companion' : blueprintAdaptedPolicy === 'prohibited' ? t('blueprint.adapted_prohibited') || 'not included because a sourced standard prohibits adaptation' : t('blueprint.adapted_omitted') || 'omitted by educator choice'), /*#__PURE__*/React.createElement("div", {
    className: "mt-0.5"
  }, blueprintMatrixUnavailable ? t('blueprint.matrix_unavailable_summary') || 'Exact call, reuse, and audience-version counts are unavailable; Blueprint will not generate until the planner is ready.' : blueprintMatrixReady ? `${blueprintExpectedCalls} ${t('blueprint.new_generations') || 'new generations'} · ${blueprintReuseCount} ${t('blueprint.reused_outputs') || 'existing outputs reused'}` : t('blueprint.matrix_refresh_pending') || 'The exact reuse and variant matrix will be refreshed before generation because this plan was edited.'), blueprintSettings.translationMode && /*#__PURE__*/React.createElement("div", {
    className: "mt-0.5",
    "data-testid": "bp-translation-impact"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, t('blueprint.translation_policy') || 'Translation policy', ":"), ' ', String(blueprintSettings.translationMode), ' Â· ', /*#__PURE__*/React.createElement("span", {
    className: "font-semibold"
  }, t('blueprint.attached_translation') || 'Attached translation', ":"), ' ', resolvedTranslationTarget || t('blueprint.translation_off') || 'off / no target resolved', embeddedGlossaryLanguages.length ? ` Â· ${t('blueprint.embedded_glossary_languages') || 'Embedded glossary languages'}: ${embeddedGlossaryLanguages.join(', ')}` : '')), run?.settingsStale && /*#__PURE__*/React.createElement("div", {
    "data-testid": "bp-settings-stale-notice",
    role: "status",
    className: "mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, t('blueprint.reviewed_settings_used') || 'Reviewed settings are being used.'), ' ', t('blueprint.settings_changed_since_review') || 'Universal Settings changed after this Blueprint was reviewed', staleSettingNames.length ? `: ${staleSettingNames.map(readableSettingName).join(', ')}.` : '.'), sourceSelection?.divergentFromLatestAnalysis && /*#__PURE__*/React.createElement("div", {
    "data-testid": "bp-source-choice-notice",
    role: "status",
    className: "mb-3 rounded-lg border border-violet-200 bg-violet-50 p-2 text-xs text-violet-950"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, t('blueprint.current_source_selected') || 'Current source selected.'), ' ', t('blueprint.source_differs_from_analysis') || 'It differs from the latest analyzed original, so Blueprint uses the current source and rechecks reuse before generation.'), run?.persistenceWarning && /*#__PURE__*/React.createElement("div", {
    "data-testid": "bp-storage-warning",
    role: "status",
    className: "mb-3 rounded-lg border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950"
  }, /*#__PURE__*/React.createElement("span", {
    className: "font-bold"
  }, t('blueprint.saved_run_warning') || 'Saved-run warning', ":"), " ", run.persistenceWarning), /*#__PURE__*/React.createElement(GoldenThreadPanel, {
    config: config,
    isEditing: isEditing,
    onUpdate: onUpdate
  }), isRunning && run && run.rows && (() => {
    const _rows = Object.keys(run.rows).map(k => run.rows[k]);
    const _total = _rows.length;
    const _settled = _rows.filter(r => r && (r.status === 'landed' || r.status === 'partial' || r.status === 'failed' || r.status === 'interrupted')).length;
    const _active = _rows.find(r => r && r.status === 'running');
    return /*#__PURE__*/React.createElement("div", {
      "data-testid": "bp-run-progress",
      className: "flex items-center gap-2 mb-3 p-2 rounded-lg bg-indigo-50 border border-indigo-100"
    }, /*#__PURE__*/React.createElement(RefreshCw, {
      size: 13,
      className: "text-indigo-600 animate-spin motion-reduce:animate-none shrink-0",
      "aria-hidden": "true"
    }), /*#__PURE__*/React.createElement("p", {
      className: "flex-grow text-xs text-indigo-900 font-medium",
      "aria-live": "polite"
    }, t('blueprint.progress_line', {
      done: _settled,
      total: _total
    }) || `Building — ${_settled} of ${_total} steps finished`, _active ? ` · ${getToolLabel(_active.tool)}` : ''), typeof onStopRun === 'function' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "bp-stop-run",
      "data-help-key": "blueprint_stop_run_btn",
      onClick: onStopRun,
      className: "shrink-0 text-[10px] font-bold px-2 py-1 rounded border border-red-300 text-red-700 bg-white hover:bg-red-50",
      title: t('blueprint.stop_run_hint') || 'Finishes the step in progress, then stops. Finished resources are kept.'
    }, t('blueprint.stop_run') || 'Stop after this step'));
  })(), /*#__PURE__*/React.createElement("div", {
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
    value: opt.value,
    disabled: opt.value === 'simplified' && blueprintAdaptedPolicy === 'prohibited'
  }, opt.label))), getToolDesc(item.type) && /*#__PURE__*/React.createElement("p", {
    className: "mt-1 text-[10px] leading-snug text-slate-600",
    "aria-live": "polite"
  }, getToolDesc(item.type))), /*#__PURE__*/React.createElement("div", {
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
  }, items.map((item, idx) => {
    // Per-resource visual identity comes from the ONE existing
    // registry (_ALLO_STATION_STYLES in the host, mirrored to
    // window). Without it every plan row was an identical grey
    // circle + indigo pill, so a twelve-step plan read as twelve
    // copies of the same thing. Guarded call + inert fallback:
    // a bare reference would be a ReferenceError in this module,
    // and the host mirror may not have run yet on first paint.
    const _st = typeof window !== 'undefined' && typeof window._alloStationStyle === 'function' ? window._alloStationStyle(item.type) : null;
    // Execution status for THIS row, keyed by the Stage 2 uiId —
    // never by position, because normalizePlanItems reorders the
    // plan (analysis first, lesson-plan last) and a positional
    // lookup would label the wrong rows.
    const _rowRun = run && run.rows && run.rows[item.id] || null;
    const _status = _rowRun && _rowRun.status;
    const _statusStyle = {
      planned: {
        label: t('blueprint.status_planned') || 'Planned',
        cls: 'bg-slate-100 text-slate-600 border-slate-200'
      },
      running: {
        label: t('blueprint.status_running') || 'Building...',
        cls: 'bg-indigo-50 text-indigo-700 border-indigo-200'
      },
      landed: {
        label: t('blueprint.status_landed') || 'Done',
        cls: 'bg-emerald-50 text-emerald-700 border-emerald-200'
      },
      partial: {
        label: t('blueprint.status_partial') || 'Partial',
        cls: 'bg-amber-50 text-amber-900 border-amber-300'
      },
      failed: {
        label: t('blueprint.status_failed') || 'Failed',
        cls: 'bg-red-50 text-red-700 border-red-200'
      },
      interrupted: {
        label: t('blueprint.status_interrupted') || 'Interrupted',
        cls: 'bg-amber-50 text-amber-800 border-amber-200'
      }
    }[_status] || null;
    // Raw provider text can include credentials, prompt excerpts,
    // or student context. Keep it in the credential-redacted local
    // Error Reporter; this shared classifier is the only text the
    // visible card or portable diagnostics may expose.
    const _safeFailure = (() => {
      if (!_rowRun || !_rowRun.failReason) return null;
      try {
        const summary = typeof summarizeFailureReason === 'function' ? summarizeFailureReason(_rowRun.failReason) : null;
        if (summary && typeof summary.summary === 'string') return summary;
      } catch (_) {}
      return {
        code: 'generation-failure',
        summary: 'Generation failed; detailed text remains only in the on-device error log.'
      };
    })();
    // Audit coverage. Only meaningful once an audit has actually
    // run, so nothing is shown before that — a plan-wide "not
    // audited" would be noise, not information.
    //
    // Coverage is by artifact ID, not merely by row. A matrix row
    // can land several grade/language artifacts, so every surviving
    // output must be present in the audit scope. Legacy rows retain
    // the singular resourceId fallback.
    const _auditIds = run && run.audit && Array.isArray(run.audit.resourceIds) ? run.audit.resourceIds : null;
    const _isAuditRow = !!(run && run.audit && run.audit.rowUiId === item.id);
    // A resource trimmed out of history by MAX_OFFLINE_ITEMS is
    // gone. Claiming it is "Audited" would assert coverage of
    // something that no longer exists — say it is missing instead.
    const _missing = !!(_rowRun && _rowRun.resourceMissing);
    // A row whose resource was trimmed from history used to render
    // "DONE" and "RESOURCE GONE" side by side, which reads as a
    // contradiction: the teacher is told the step succeeded and that
    // its output does not exist. "Resource gone" is the load-bearing
    // half (Preview is already suppressed for these rows and Rebuild
    // is still offered), so drop the success badge and keep one
    // truthful signal instead of two conflicting ones.
    const _suppressStatusBadge = _missing && (_status === 'landed' || _status === 'partial');
    const _claimedArtifactIds = _rowRun && Array.isArray(_rowRun.resourceIds) && _rowRun.resourceIds.length ? _rowRun.resourceIds.filter(Boolean) : _rowRun && _rowRun.resourceId ? [_rowRun.resourceId] : [];
    const _missingArtifactIds = new Set((_rowRun && Array.isArray(_rowRun.missingResourceIds) ? _rowRun.missingResourceIds : []).map(value => String(value)));
    const _survivingArtifactIds = _claimedArtifactIds.filter(value => !_missingArtifactIds.has(String(value)));
    const _allSurvivingArtifactsAudited = _survivingArtifactIds.length > 0 && _survivingArtifactIds.every(value => _auditIds && _auditIds.indexOf(value) !== -1);
    const _auditBadge = _missing ? {
      label: t('blueprint.resource_missing') || 'Resource gone',
      cls: 'bg-slate-100 text-slate-700 border-slate-300'
    } : !_auditIds || _isAuditRow || _status !== 'landed' && _status !== 'partial' ? null : _allSurvivingArtifactsAudited ? {
      label: t('blueprint.audit_covered') || 'Audited',
      cls: 'bg-teal-50 text-teal-700 border-teal-200'
    } : {
      label: t('blueprint.audit_stale') || 'Not in audit',
      cls: 'bg-amber-50 text-amber-800 border-amber-200'
    };
    const _generationVariants = Array.isArray(item.generationVariants) ? item.generationVariants : [];
    const _newVariants = _generationVariants.filter(variant => variant && variant.action !== 'reuse');
    const _reusedVariants = _generationVariants.filter(variant => variant && variant.action === 'reuse');
    const _variantGrades = Array.from(new Set(_generationVariants.map(variant => variant && variant.grade).filter(Boolean)));
    const _variantLanguages = Array.from(new Set(_generationVariants.map(variant => variant && variant.language).filter(Boolean)));
    const _runtimeVariants = _rowRun && Array.isArray(_rowRun.variantResults) ? _rowRun.variantResults : [];
    const _rowMatrixUnavailable = _rowRun && typeof _rowRun.generationMatrixUnavailable === 'boolean' ? _rowRun.generationMatrixUnavailable : !!(item && item.generationMatrixUnavailable === true) || !blueprintMatrixModuleReady;
    const _missingRuntimeResourceIds = new Set((_rowRun && Array.isArray(_rowRun.missingResourceIds) ? _rowRun.missingResourceIds : []).map(value => String(value)));
    const _runtimeArtifactId = variant => variant && (variant.resourceId || variant.artifactId) || null;
    const _runtimeArtifactMissing = variant => {
      const artifactId = _runtimeArtifactId(variant);
      return !!(artifactId && _missingRuntimeResourceIds.has(String(artifactId)));
    };
    const _successfulRuntimeVariants = _runtimeVariants.filter(variant => variant && variant.status === 'landed' && _runtimeArtifactId(variant) && !_runtimeArtifactMissing(variant));
    const _failedRuntimeVariants = _runtimeVariants.filter(variant => variant && (variant.status === 'failed' || variant.status === 'interrupted'));
    const _missingRuntimeVariants = _runtimeVariants.filter(_runtimeArtifactMissing);
    const _previewSelection = variant => ({
      variantId: variant && variant.variantId || null,
      generationIdentity: variant && variant.generationIdentity || null,
      grade: variant && variant.grade || null,
      language: variant && variant.language || null,
      action: variant && variant.action || null,
      status: variant && variant.status || null,
      resourceId: variant && (variant.resourceId || variant.artifactId) || null,
      artifactId: variant && (variant.artifactId || variant.resourceId) || null,
      resourceIds: _rowRun && Array.isArray(_rowRun.resourceIds) ? _rowRun.resourceIds.slice() : []
    });
    return /*#__PURE__*/React.createElement("div", {
      key: item.id,
      className: "flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100 border-l-4",
      style: _st ? {
        borderLeftColor: _st.stroke
      } : undefined
    }, /*#__PURE__*/React.createElement("div", {
      className: "border font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5",
      style: _st ? {
        backgroundColor: _st.fill,
        borderColor: _st.stroke,
        color: _st.stroke
      } : {
        backgroundColor: '#fff',
        borderColor: '#94a3b8',
        color: '#475569'
      }
    }, _st ? /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true"
    }, _st.icon) : idx + 1), /*#__PURE__*/React.createElement("div", {
      className: "flex-grow"
    }, /*#__PURE__*/React.createElement("span", {
      className: "text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider inline-flex items-center gap-1 w-fit mb-1"
      // WCAG 1.4.3: the station registry's `stroke` is a
      // GRAPHICAL colour (designed for SVG station
      // glyphs, where 3:1 suffices). Using it as label
      // TEXT failed 4.5:1 on 27 of 29 tool families —
      // brainstorm was 2.07:1. Colour identity stays in
      // the fill, border and accent stripe; the text
      // itself is slate-700, >=9.26:1 on every fill.
      ,
      style: _st ? {
        backgroundColor: _st.fill,
        borderColor: _st.stroke,
        color: '#334155'
      } : {
        backgroundColor: '#eef2ff',
        borderColor: '#e0e7ff',
        color: '#4338ca'
      }
    }, /*#__PURE__*/React.createElement("span", {
      className: "opacity-70 font-normal"
    }, idx + 1), getToolLabel(item.type)), _statusStyle && !_suppressStatusBadge && /*#__PURE__*/React.createElement("span", {
      className: `ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${_statusStyle.cls}`,
      role: "status",
      "aria-live": _status === 'running' ? 'polite' : 'off',
      title: _safeFailure && _safeFailure.summary || undefined
    }, _statusStyle.label), _auditBadge && /*#__PURE__*/React.createElement("span", {
      className: `ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider ${_auditBadge.cls}`,
      "data-testid": "bp-audit-badge"
    }, _auditBadge.label), getToolDesc(item.type) && /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: () => toggleDesc(item.id),
      "aria-expanded": openDescIds.indexOf(item.id) !== -1,
      "aria-controls": `bp-desc-${item.id}`,
      "data-testid": "bp-desc-toggle",
      "data-help-key": "blueprint_resource_desc_toggle",
      className: "ml-1 text-[10px] font-bold w-4 h-4 rounded-full border border-slate-300 text-slate-600 hover:bg-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-400",
      title: t('blueprint.what_is_this') || 'What does this resource do?',
      "aria-label": `${t('blueprint.what_is_this') || 'What does this resource do?'}: ${getToolLabel(item.type)}`
    }, "?"), typeof onPreviewStep === 'function' && (_status === 'landed' || _status === 'partial') && !_missing && _runtimeVariants.length <= 1 && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "bp-preview-btn",
      "data-help-key": "blueprint_preview_step_btn",
      onClick: () => {
        const selection = _successfulRuntimeVariants.length ? _previewSelection(_successfulRuntimeVariants[0]) : _previewSelection({
          status: 'landed',
          resourceId: _rowRun && _rowRun.resourceId,
          artifactId: _rowRun && _rowRun.resourceId,
          action: _rowRun && _rowRun.generationAction
        });
        onPreviewStep(item.id, selection.resourceId, selection);
      },
      title: t('blueprint.preview_step') || 'Preview this resource',
      "aria-label": `${t('blueprint.preview_step') || 'Preview this resource'}: ${getToolLabel(item.type)}`,
      className: "ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
    }, t('blueprint.preview_step_short') || 'Preview'), typeof onRebuildStep === 'function' && _status && _status !== 'running' && /*#__PURE__*/React.createElement("button", {
      type: "button",
      "data-testid": "bp-rebuild-btn",
      "data-help-key": "blueprint_rebuild_step_btn",
      onClick: () => onRebuildStep(item.id),
      title: t('blueprint.rebuild_step') || 'Rebuild just this step',
      "aria-label": `${t('blueprint.rebuild_step') || 'Rebuild just this step'}: ${getToolLabel(item.type)}`,
      className: "ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded border border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-colors"
    }, t('blueprint.rebuild_step_short') || 'Rebuild'), openDescIds.indexOf(item.id) !== -1 && getToolDesc(item.type) && /*#__PURE__*/React.createElement("p", {
      id: `bp-desc-${item.id}`,
      "data-testid": "bp-desc-body",
      className: "mb-1 text-[11px] leading-snug text-slate-600 bg-white border border-slate-200 rounded p-2"
    }, getToolDesc(item.type)), (_status === 'partial' || _status === 'failed' || _status === 'interrupted') && _safeFailure && /*#__PURE__*/React.createElement("p", {
      "data-testid": "bp-fail-reason",
      "data-failure-code": _safeFailure.code,
      className: "mb-1 text-[11px] leading-snug text-red-800 bg-red-50 border border-red-200 rounded p-2"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, _safeFailure.summary), /*#__PURE__*/React.createElement("span", {
      className: "block mt-1 opacity-80 break-words"
    }, t('blueprint.failure_log_help') || 'Technical details remain in the on-device error log; copied and downloaded diagnostics are sanitized.')), /*#__PURE__*/React.createElement("p", {
      className: "text-sm text-slate-700 leading-relaxed italic"
    }, "\"", item.directive || "No specific instructions.", "\""), /*#__PURE__*/React.createElement("p", {
      "data-testid": "bp-row-generation-impact",
      "data-resource-key": item.id,
      "data-matrix-status": _rowMatrixUnavailable ? 'unavailable' : _generationVariants.length ? 'ready' : 'pending',
      className: "mt-1 text-[10px] leading-relaxed text-sky-900"
    }, _rowMatrixUnavailable ? /*#__PURE__*/React.createElement("span", {
      "data-testid": "bp-row-matrix-unavailable"
    }, t('blueprint.row_matrix_unavailable') || 'Waiting for generation planning. This row will not run until exact duplicate and audience-version checks are available.') : _generationVariants.length ? `${_newVariants.length} ${t('blueprint.new_versions') || 'new'} / ${_reusedVariants.length} ${t('blueprint.reused_versions') || 'reused'}${_variantGrades.length ? `; ${_variantGrades.join(', ')}` : ''}${_variantLanguages.length ? `; ${_variantLanguages.join(', ')}` : ''}${item.type === 'glossary' && embeddedGlossaryLanguages.length ? `; ${t('blueprint.embedded_languages') || 'embedded'}: ${embeddedGlossaryLanguages.join(', ')}` : ''}` : t('blueprint.row_matrix_pending') || 'Reuse and audience variants will be checked before generation.'), (_runtimeVariants.length > 1 || _failedRuntimeVariants.length > 0 || _missingRuntimeVariants.length > 0) && /*#__PURE__*/React.createElement("div", {
      "data-testid": "bp-variant-results",
      className: "mt-2 rounded border border-slate-200 bg-white p-2"
    }, /*#__PURE__*/React.createElement("div", {
      className: "mb-1 text-[10px] font-bold text-slate-700"
    }, _successfulRuntimeVariants.length, " ", t('blueprint.variant_successful') || 'successful', ' Â· ', _failedRuntimeVariants.length, " ", t('blueprint.variant_unsuccessful') || 'failed or interrupted'), _missingRuntimeVariants.length > 0 && /*#__PURE__*/React.createElement("div", {
      className: "mb-1 text-[10px] font-semibold text-amber-800"
    }, _missingRuntimeVariants.length, " ", t('blueprint.variant_unavailable') || 'successful version unavailable in the workspace'), /*#__PURE__*/React.createElement("ul", {
      className: "space-y-1"
    }, _runtimeVariants.map((variant, variantIndex) => {
      const artifactId = variant && (variant.artifactId || variant.resourceId) || null;
      const isMissingArtifact = _runtimeArtifactMissing(variant);
      const isSuccessful = !!(variant && variant.status === 'landed' && artifactId && !isMissingArtifact);
      let safeVariantReason = null;
      if (!isSuccessful && variant && variant.reason && typeof summarizeFailureReason === 'function') {
        try {
          safeVariantReason = summarizeFailureReason(variant.reason);
        } catch (_) {}
      }
      const audience = [variant && variant.grade, variant && variant.language].filter(Boolean).join(' Â· ') || t('blueprint.default_audience') || 'Default audience';
      return /*#__PURE__*/React.createElement("li", {
        key: variant && (variant.variantId || variant.generationIdentity) || `${item.id}-runtime-${variantIndex}`,
        "data-testid": "bp-variant-result",
        "data-variant-status": isMissingArtifact ? 'missing' : variant && variant.status || 'unknown',
        "data-artifact-id": artifactId || '',
        className: `rounded border px-2 py-1 text-[10px] ${isSuccessful ? 'border-emerald-200 bg-emerald-50 text-emerald-950' : 'border-amber-200 bg-amber-50 text-amber-950'}`
      }, /*#__PURE__*/React.createElement("div", {
        className: "flex flex-wrap items-center gap-x-1.5 gap-y-1"
      }, /*#__PURE__*/React.createElement("span", {
        className: "font-bold"
      }, isSuccessful ? t('blueprint.status_landed') || 'Done' : isMissingArtifact ? t('blueprint.resource_missing') || 'Resource gone' : variant && variant.status === 'interrupted' ? t('blueprint.status_interrupted') || 'Interrupted' : t('blueprint.status_failed') || 'Failed'), /*#__PURE__*/React.createElement("span", null, audience), /*#__PURE__*/React.createElement("span", {
        className: "uppercase opacity-75"
      }, variant && variant.action || 'generate'), artifactId && /*#__PURE__*/React.createElement("span", {
        className: "break-all opacity-75"
      }, t('blueprint.artifact_id') || 'Artifact', ": ", artifactId), isSuccessful && typeof onPreviewStep === 'function' && /*#__PURE__*/React.createElement("button", {
        type: "button",
        "data-testid": "bp-preview-variant-btn",
        onClick: () => {
          const selection = _previewSelection(variant);
          onPreviewStep(item.id, selection.resourceId, selection);
        },
        className: "ml-auto rounded border border-emerald-300 bg-white px-1.5 py-0.5 font-bold text-emerald-800 hover:bg-emerald-100"
      }, t('blueprint.preview_step_short') || 'Preview')), !isSuccessful && /*#__PURE__*/React.createElement("div", {
        className: "mt-0.5 opacity-85"
      }, isMissingArtifact ? t('blueprint.variant_missing') || 'This successful version is no longer in the workspace. Rebuild the step to create it again.' : safeVariantReason && safeVariantReason.summary || t('blueprint.variant_failure_safe') || 'This variant did not finish; technical details remain in the on-device error log.'));
    })))));
  }), items.length === 0 && /*#__PURE__*/React.createElement("p", {
    className: "text-center text-slate-600 text-sm italic py-4"
  }, t('blueprint.empty_plan'))), typeof onSaveTemplate === 'function' && items.length > 0 && !isEditing && /*#__PURE__*/React.createElement("div", {
    className: "pt-3 border-t border-slate-100",
    "data-testid": "bp-template-save"
  }, !showTemplateSave ? /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "bp-template-save-open",
    "data-help-key": "blueprint_save_template_btn",
    onClick: () => {
      setTemplateName('');
      setDirectivePolicy({});
      setShowTemplateSave(true);
    },
    className: "text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
  }, t('blueprint.save_template') || 'Save as template') : /*#__PURE__*/React.createElement("div", {
    className: "space-y-2"
  }, /*#__PURE__*/React.createElement("label", {
    className: "block text-[11px] font-bold uppercase tracking-wider text-slate-600",
    htmlFor: "bp-template-name"
  }, t('blueprint.template_name_label') || 'Template name'), /*#__PURE__*/React.createElement("input", {
    id: "bp-template-name",
    "data-testid": "bp-template-name",
    type: "text",
    value: templateName,
    maxLength: 80,
    onChange: e => setTemplateName(e.target.value),
    placeholder: t('blueprint.template_name_placeholder') || 'e.g. Vocabulary-first informational text',
    className: "w-full text-sm border border-slate-300 rounded p-1.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
  }), /*#__PURE__*/React.createElement("p", {
    className: "text-[11px] text-slate-600"
  }, t('blueprint.template_directive_help') || 'Keep the instructions that would suit any topic. Clear the ones that describe THIS lesson.'), /*#__PURE__*/React.createElement("ul", {
    className: "space-y-1 max-h-48 overflow-y-auto"
  }, items.filter(it => (it.directive || '').trim()).map(it => {
    const keep = directivePolicy[it.id] !== 'blank';
    return /*#__PURE__*/React.createElement("li", {
      key: it.id,
      className: "flex items-start gap-2 text-xs"
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      id: `bp-tpl-dir-${it.id}`,
      "data-testid": "bp-template-directive",
      checked: keep,
      onChange: () => setDirectivePolicy(prev => Object.assign({}, prev, {
        [it.id]: keep ? 'blank' : 'keep'
      })),
      className: "mt-0.5 rounded border-slate-400"
    }), /*#__PURE__*/React.createElement("label", {
      htmlFor: `bp-tpl-dir-${it.id}`,
      className: "flex-grow cursor-pointer"
    }, /*#__PURE__*/React.createElement("span", {
      className: "font-bold"
    }, getToolLabel(it.type)), /*#__PURE__*/React.createElement("span", {
      className: keep ? 'text-slate-700' : 'text-slate-500 line-through'
    }, " \u2014 \"", it.directive, "\"")));
  })), /*#__PURE__*/React.createElement("div", {
    className: "flex gap-2"
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "bp-template-save-confirm",
    disabled: !templateName.trim(),
    onClick: () => {
      onSaveTemplate({
        name: templateName.trim(),
        directives: directivePolicy
      });
      setShowTemplateSave(false);
    },
    className: "text-xs font-bold px-3 py-1.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
  }, t('blueprint.template_save_confirm') || 'Save template'), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "data-testid": "bp-template-save-cancel",
    onClick: () => setShowTemplateSave(false),
    className: "text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 transition-colors"
  }, t('common.cancel') || 'Cancel')))), /*#__PURE__*/React.createElement("div", {
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
    "aria-label": isRunning ? t('blueprint.status_running') || 'Building...' : matrixRetryPending ? t('blueprint.matrix_unavailable_retry_short') || 'Retry generation planning' : t('common.generate'),
    disabled: !!isRunning,
    onClick: onConfirm,
    className: "flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
  }, /*#__PURE__*/React.createElement(Sparkles, {
    size: 14,
    className: "text-yellow-700 fill-current"
  }), " ", isRunning ? t('blueprint.status_running') || 'Building...' : matrixRetryPending ? t('blueprint.matrix_unavailable_retry_short') || 'Retry generation planning' : t('blueprint.generate'))));
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
