// persona_ui_source.jsx — InteractiveBlueprintCard, HarmonyMeter, CharacterColumn
// Extracted from AlloFlowANTI.txt for CDN modularization

var LanguageContext = window.AlloLanguageContext;
var useState = React.useState; var useEffect = React.useEffect; var useRef = React.useRef;
var useContext = React.useContext; var useMemo = React.useMemo; var useCallback = React.useCallback;
var _lazyIcon = function(name) { return function(props) { var I = window.AlloIcons && window.AlloIcons[name]; return I ? React.createElement(I, props) : null; }; };
var CheckCircle2 = _lazyIcon('CheckCircle2');
var GripVertical = _lazyIcon('GripVertical');
var Lock = _lazyIcon('Lock');
var Pencil = _lazyIcon('Pencil');
var Plus = _lazyIcon('Plus');
var RefreshCw = _lazyIcon('RefreshCw');
var Search = _lazyIcon('Search');
var Sparkles = _lazyIcon('Sparkles');
var Trash2 = _lazyIcon('Trash2');

const GoldenThreadPanel = ({ config, isEditing, onUpdate }) => {
    const { t } = useContext(LanguageContext);
    const [newConcept, setNewConcept] = useState('');
    const [newTerm, setNewTerm] = useState('');
    const dna = (config && config.lessonDNA) || null;
    if (!dna && !isEditing) return null;
    const eq = (dna && dna.essentialQuestion) || '';
    const concepts = (dna && Array.isArray(dna.goldenThread)) ? dna.goldenThread : [];
    const terms = (dna && Array.isArray(dna.keyTerms)) ? dna.keyTerms : [];
    const hasAny = eq.trim() || concepts.length > 0 || terms.length > 0;
    if (!hasAny && !isEditing) return null;
    const writeDNA = (patch) => {
        const nextDNA = Object.assign({ essentialQuestion: '', goldenThread: [], keyTerms: [] }, dna || {}, patch);
        onUpdate(Object.assign({}, config, { lessonDNA: nextDNA }));
    };
    const addConcept = () => {
        const v = (newConcept || '').trim();
        if (!v) return;
        if (concepts.indexOf(v) !== -1) { setNewConcept(''); return; }
        writeDNA({ goldenThread: concepts.concat([v]) });
        setNewConcept('');
    };
    const removeConcept = (idx) => {
        writeDNA({ goldenThread: concepts.filter(function(_, i) { return i !== idx; }) });
    };
    const addTerm = () => {
        const v = (newTerm || '').trim();
        if (!v) return;
        if (terms.indexOf(v) !== -1) { setNewTerm(''); return; }
        writeDNA({ keyTerms: terms.concat([v]) });
        setNewTerm('');
    };
    const removeTerm = (idx) => {
        writeDNA({ keyTerms: terms.filter(function(_, i) { return i !== idx; }) });
    };
    return (
        <div className="mb-4 p-3 rounded-lg bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200">
            <div className="flex items-center gap-2 mb-2">
                <Sparkles size={14} className="text-amber-500 fill-current" />
                <h5 className="text-xs font-bold text-amber-900 uppercase tracking-wider">{t('persona.golden_thread') || 'Golden Thread'}</h5>
                {isEditing && <span className="text-[10px] text-amber-700 italic ml-auto">{t('persona.edits_apply_before_generation') || 'Edits apply before generation'}</span>}
            </div>
            <div className="mb-2">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-0.5">{t('persona.essential_question') || 'Essential Question'}</p>
                {isEditing ? (
                    <textarea
                        value={eq}
                        onChange={(e) => writeDNA({ essentialQuestion: e.target.value })}
                        placeholder={t('persona.essential_question_placeholder') || 'The ONE main learning question students will answer...'}
                        rows={2}
                        className="w-full text-sm text-slate-700 italic bg-white border border-amber-200 rounded p-1.5 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none resize-none"
                    />
                ) : (
                    eq ? <p className="text-sm text-slate-700 italic leading-relaxed">"{eq}"</p> : <p className="text-xs text-slate-500 italic">{t('persona.none_set') || '(none set)'}</p>
                )}
            </div>
            <div className="mb-2">
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">{t('persona.core_concepts') || 'Core Concepts'}</p>
                <div className="flex flex-wrap gap-1 items-center">
                    {concepts.map(function(c, i) {
                        return (
                            <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-amber-200 text-amber-900 rounded-full">
                                {c}
                                {isEditing && (
                                    <button
                                        onClick={() => removeConcept(i)}
                                        aria-label={t('persona.remove_concept_aria', { concept: c }) || ('Remove concept ' + c)}
                                        className="ml-1 text-amber-600 hover:text-red-500 font-bold leading-none"
                                    >×</button>
                                )}
                            </span>
                        );
                    })}
                    {isEditing && (
                        <span className="inline-flex items-center gap-1">
                            <input
                                type="text"
                                value={newConcept}
                                onChange={(e) => setNewConcept(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addConcept(); } }}
                                placeholder={t('persona.add_concept_placeholder') || '+ add concept'}
                                className="text-[11px] px-2 py-0.5 bg-white border border-amber-200 rounded-full focus:border-amber-500 outline-none w-28"
                            />
                        </span>
                    )}
                    {!isEditing && concepts.length === 0 && <span className="text-xs text-slate-500 italic">{t('persona.none_set') || '(none set)'}</span>}
                </div>
            </div>
            <div>
                <p className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">{t('persona.key_vocabulary') || 'Key Vocabulary'}</p>
                <div className="flex flex-wrap gap-1 items-center">
                    {terms.map(function(term, i) {
                        return (
                            <span key={i} className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 bg-white border border-indigo-200 text-indigo-900 rounded-full font-medium">
                                {term}
                                {isEditing && (
                                    <button
                                        onClick={() => removeTerm(i)}
                                        aria-label={t('persona.remove_term_aria', { term: term }) || ('Remove term ' + term)}
                                        className="ml-1 text-indigo-600 hover:text-red-500 font-bold leading-none"
                                    >×</button>
                                )}
                            </span>
                        );
                    })}
                    {isEditing && (
                        <span className="inline-flex items-center gap-1">
                            <input
                                type="text"
                                value={newTerm}
                                onChange={(e) => setNewTerm(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTerm(); } }}
                                placeholder={t('persona.add_term_placeholder') || '+ add term'}
                                className="text-[11px] px-2 py-0.5 bg-white border border-indigo-200 rounded-full focus:border-indigo-500 outline-none w-28"
                            />
                        </span>
                    )}
                    {!isEditing && terms.length === 0 && <span className="text-xs text-slate-500 italic">{t('persona.none_set') || '(none set)'}</span>}
                </div>
            </div>
        </div>
    );
};

const InteractiveBlueprintCard = React.memo(({ config, onUpdate, onConfirm, onCancel }) => {
  const { t } = useContext(LanguageContext);
  const [items, setItems] = useState([]);
  const [draggedItemIndex, setDraggedItemIndex] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  useEffect(() => {
    if (config && config.recommendedResources) {
      const unifiedItems = config.recommendedResources.map((type, idx) => ({
        id: `step-${idx}-${Date.now()}`,
        type: type,
        directive: config.toolDirectives?.[type] || "",
      }));
      setItems(unifiedItems);
    }
  }, [config]);
  const syncChanges = (newItems) => {
    setItems(newItems);
    const newConfig = {
      ...config,
      recommendedResources: newItems.map(i => i.type),
      toolDirectives: newItems.reduce((acc, curr) => ({ ...acc, [curr.type]: curr.directive }), {})
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
  const handleDelete = (index) => {
    const newItems = items.filter((_, i) => i !== index);
    syncChanges(newItems);
  };
  const handleAddStep = () => {
    const newItem = {
        id: `new-${Date.now()}`,
        type: 'simplified',
        directive: 'New step...',
    };
    syncChanges([...items, newItem]);
  };
  const toolOptions = [
    { value: 'analysis', label: t('sidebar.tool_analysis') || 'Analysis' },
    { value: 'simplified', label: t('blueprint.tools.simplified') },
    { value: 'glossary', label: t('blueprint.tools.glossary') },
    { value: 'quiz', label: t('blueprint.tools.quiz') },
    { value: 'outline', label: t('blueprint.tools.outline') },
    { value: 'image', label: t('blueprint.tools.image') },
    { value: 'timeline', label: t('blueprint.tools.timeline') },
    { value: 'concept-sort', label: t('blueprint.tools.concept_sort') },
    { value: 'sentence-frames', label: t('blueprint.tools.scaffolds') },
    { value: 'brainstorm', label: t('blueprint.tools.brainstorm') },
    { value: 'adventure', label: t('blueprint.tools.adventure') },
    { value: 'faq', label: t('blueprint.tools.faq') },
    { value: 'lesson-plan', label: t('blueprint.tools.lesson_plan') }
  ];
  const getToolLabel = (type) => {
      const opt = toolOptions.find(o => o.value === type);
      return opt ? opt.label : type;
  };
  return (
    <div data-help-key="blueprint_card_panel" className="bg-white border-2 border-indigo-100 rounded-xl p-4 my-2 shadow-lg animate-in zoom-in duration-300 w-full max-w-2xl">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-indigo-50">
        <div className="flex items-center gap-3">
            <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                <Sparkles size={18} />
            </div>
            <div>
                <h4 className="font-bold text-indigo-900 text-sm">
                    {t('blueprint.header')} {isEditing ? `(${t('common.edit')})` : ""}
                </h4>
                <p className="text-xs text-slate-600">
                    {isEditing ? t('blueprint.drag_instruction') : t('blueprint.review_instruction')}
                </p>
            </div>
        </div>
        <button
            data-help-key="blueprint_edit_toggle_btn"
            aria-label={t('common.check')}
            onClick={() => setIsEditing(prev => !prev)}
            className={`p-2 rounded-lg text-xs font-bold transition-colors flex items-center gap-2 border ${isEditing ? 'bg-indigo-100 text-indigo-700 border-indigo-200' : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'}`}
        >
            {isEditing ? <CheckCircle2 size={14}/> : <Pencil size={14}/>}
            {isEditing ? t('blueprint.done_editing') : t('blueprint.edit_plan')}
        </button>
      </div>
      <GoldenThreadPanel config={config} isEditing={isEditing} onUpdate={onUpdate} />
      {isEditing ? (
          <>
            <div data-help-key="blueprint_resource_list" className="space-y-2 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
                {items.map((item, idx) => (
                    <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, idx)}
                        onDragOver={(e) => handleDragOver(e, idx)}
                        onDragEnd={handleDragEnd}
                        className={`group flex items-start gap-2 p-3 rounded-lg border-2 transition-all ${draggedItemIndex === idx ? 'opacity-50 border-dashed border-indigo-300 bg-indigo-50' : 'bg-slate-50 border-slate-200 hover:border-indigo-200'}`}
                    >
                        <div className="mt-2 text-slate-600 cursor-grab active:cursor-grabbing hover:text-indigo-500">
                            <GripVertical size={16} />
                        </div>
                        <div className="flex-grow grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div className="col-span-1">
                                <select aria-label={t('common.selection')}
                                    value={item.type}
                                    onChange={(e) => handleTypeChange(idx, e.target.value)}
                                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none"
                                >
                                    {toolOptions.map(opt => (
                                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="col-span-2">
                                <input aria-label={t('common.enter_item')}
                                    type="text"
                                    value={item.directive}
                                    onChange={(e) => handleDirectiveChange(idx, e.target.value)}
                                    className="w-full text-xs text-slate-600 bg-white border border-slate-400 rounded p-1.5 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none placeholder:italic"
                                    placeholder={t('blueprint.placeholder_instruction')}
                                />
                            </div>
                        </div>
                        <button
                            aria-label={t('common.delete')}
                            onClick={() => handleDelete(idx)}
                            className="mt-1.5 text-slate-600 hover:text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                            title={t('blueprint.remove_step_tooltip')}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>
            <button data-help-key="blueprint_add_step_btn" aria-label={t('common.add')}
                onClick={handleAddStep}
                className="w-full py-2 border-2 border-dashed border-slate-300 rounded-lg text-slate-600 text-xs font-bold hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-all flex items-center justify-center gap-2 mb-4"
            >
                <Plus size={14} /> {t('blueprint.add_step')}
            </button>
          </>
      ) : (
          <div data-help-key="blueprint_resource_list_review" className="space-y-3 mb-6">
              {items.map((item, idx) => (
                  <div key={item.id} className="flex gap-3 items-start p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="bg-white border border-slate-400 text-slate-600 font-bold w-6 h-6 flex items-center justify-center rounded-full text-xs shrink-0 mt-0.5">
                          {idx + 1}
                      </div>
                      <div className="flex-grow">
                          <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 uppercase tracking-wider block w-fit mb-1">
                              {getToolLabel(item.type)}
                          </span>
                          <p className="text-sm text-slate-700 leading-relaxed italic">
                              "{item.directive || "No specific instructions."}"
                          </p>
                      </div>
                  </div>
              ))}
              {items.length === 0 && (
                  <p className="text-center text-slate-600 text-sm italic py-4">{t('blueprint.empty_plan')}</p>
              )}
          </div>
      )}
      <div className="flex gap-3 pt-3 border-t border-slate-100">
          <button
              data-help-key="blueprint_cancel_btn"
              aria-label={t('common.cancel')}
            onClick={onCancel}
            className="flex-1 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            {t('blueprint.cancel')}
          </button>
          <button
              data-help-key="blueprint_generate_pack_btn"
              aria-label={t('common.generate')}
            onClick={onConfirm}
            className="flex-[2] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-md transition-transform active:scale-95 flex items-center justify-center gap-2"
          >
            <Sparkles size={14} className="text-yellow-700 fill-current"/> {t('blueprint.generate')}
          </button>
      </div>
    </div>
  );
});

const HarmonyMeter = ({ score }) => {
    const { t } = useContext(LanguageContext);
    return (
    <div className="w-full max-w-md mx-auto mb-4 bg-white/50 backdrop-blur-sm p-2 rounded-xl border border-indigo-100 shadow-sm animate-in slide-in-from-top-2">
        <div className="flex justify-between items-end mb-1 px-1">
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600">{t('persona.harmony_label')}</span>
            <span className="text-xs font-bold text-indigo-700">{t('persona.harmony_score', { score })}</span>
        </div>
        <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden relative">
            <div
                className="h-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-500 transition-all duration-1000 ease-out"
                style={{ width: `${score}%` }}
            ></div>
            <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/50 z-10"></div>
        </div>
        {score >= 80 && (
            <div className="text-center mt-1 text-[11px] font-bold text-green-600 animate-pulse">
                {t('persona.common_ground')}
            </div>
        )}
    </div>
    );
};

const CharacterColumn = React.memo(({ character, side, onRetryPortrait }) => {
    const { t } = useContext(LanguageContext);
    if (!character) return <div className="flex-1 bg-slate-50/50"></div>;
    const sortedQuests = [...(character.quests || [])].sort((a, b) => {
        if (a.isCompleted === b.isCompleted) return 0;
        return a.isCompleted ? -1 : 1;
    });
    return (
    <div className="flex flex-col items-center text-center h-full p-2">
        <div className={`
            w-full max-w-[280px] aspect-[3/4] rounded-2xl border-4 shadow-lg mb-4 overflow-hidden relative bg-white group
            ${side === 'left' ? 'border-indigo-200' : 'border-rose-200'}
        `}>
            {character.avatarUrl ? (
                <img loading="lazy"
                    src={character.avatarUrl}
                    alt={character.name}
                    className={`w-full h-full object-cover transition-all duration-700 ${character.isUpdating ? 'blur-sm scale-105' : 'scale-100'}`}
                />
            ) : (
                <div className="w-full h-full bg-slate-100 flex flex-col items-center justify-center gap-2 p-4">
                    <span className="text-3xl text-slate-600 font-bold">?</span>
                    {onRetryPortrait && (
                        <button
                            aria-label={t('common.refresh')}
                            onClick={() => onRetryPortrait(character)}
                            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm hover:shadow-md cursor-pointer z-20 relative ${
                                side === 'left'
                                ? 'bg-indigo-500 hover:bg-indigo-600 text-white'
                                : 'bg-rose-500 hover:bg-rose-600 text-white'
                            }`}
                        >
                            <RefreshCw size={12} />
                            {t('persona.generate_portrait')}
                        </button>
                    )}
                </div>
            )}
            {character.isUpdating && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[1px] z-10">
                    <RefreshCw size={32} className="text-white animate-spin"/>
                </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-md p-2 text-white border-t border-white/10">
                <h3 className="font-black text-lg leading-none mb-1">{character.name}</h3>
                <p className="text-[11px] font-bold uppercase tracking-wider opacity-80">{character.role}</p>
            </div>
        </div>
        <div className="w-full max-w-[260px] px-2">
            <div className="flex justify-between text-[11px] font-bold text-slate-600 uppercase mb-1">
                <span>{t('persona.rapport_label')}</span>
                <span className={`${character.rapport >= 70 ? 'text-green-600' : 'text-slate-600'}`}>{character.rapport || 30}%</span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden border border-slate-400">
                <div
                    className={`h-full transition-all duration-500 ${side === 'left' ? 'bg-indigo-500' : 'bg-rose-500'}`}
                    style={{ width: `${character.rapport || 30}%` }}
                ></div>
            </div>
        </div>
        <div className="w-full max-w-[280px] text-left flex-1 overflow-y-auto custom-scrollbar mt-4 px-1">
            <h4 className="text-[11px] font-bold text-slate-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                 <Search size={10}/> {t('persona.objectives_label')}
            </h4>
            <div className="space-y-2">
                {sortedQuests.map((q, i) => {
                    const currentRapport = character.rapport || 10;
                    const isLocked = currentRapport < q.difficulty;
                    return (
                        <div key={i} className={`
                            p-2.5 rounded border text-[11px] leading-tight transition-all relative overflow-hidden
                            ${q.isCompleted
                                ? 'bg-green-50 border-green-200 text-green-800'
                                : isLocked
                                    ? 'bg-slate-50 border-slate-200 text-slate-600'
                                    : 'bg-white border-indigo-200 text-slate-600'}
                        `}>
                            <div className="flex gap-2 items-start relative z-10">
                                 <div className="mt-0.5 shrink-0">
                                    {q.isCompleted ? <CheckCircle2 size={12}/> :
                                     isLocked ? <Lock size={12}/> :
                                     <div className="w-3 h-3 border-2 border-indigo-200 rounded-full"></div>}
                                 </div>
                                 <div className="flex-grow">
                                     <span className={`font-bold block ${q.isCompleted ? 'line-through opacity-70' : ''}`}>
                                         {q.text}
                                     </span>
                                     {!q.isCompleted && isLocked && (
                                         <span className="text-[11px] uppercase font-bold opacity-70 mt-1 block">
                                             {t('persona.rapport_requirement', { difficulty: q.difficulty })}
                                         </span>
                                     )}
                                 </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    </div>
    );
});

window.AlloModules = window.AlloModules || {};
window.AlloModules.InteractiveBlueprintCard = InteractiveBlueprintCard;
window.AlloModules.HarmonyMeter = HarmonyMeter;
window.AlloModules.CharacterColumn = CharacterColumn;
window.AlloModules.PersonaUIModule = true;
console.log('[PersonaUIModule] 3 components registered');
