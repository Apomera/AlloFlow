    const OperationalDefinitionBuilder = ({ studentName, studentProfile, targetBehaviors = [], setTargetBehaviors, onRecord, callGemini, t, addToast }) => {
        const emptyDraft = { targetId: '', label: '', rawDesc: '', definition: '', examples: '', nonExamples: '', measurement: 'count' };
        const [draft, setDraft] = useDurableToolState('operationalDefinitionDraft', emptyDraft);
        const [savedDefs, setSavedDefs] = useDurableToolState('operationalDefinitions', []);
        const [loading, setLoading] = useState(false);
        const [suggestion, setSuggestion] = useState('');
        const [status, setStatus] = useState('');
        const [error, setError] = useState('');
        const generation = useRef(0);
        useEffect(() => () => { generation.current += 1; }, []);
        const update = (patch) => {
            generation.current += 1;
            setLoading(false); setSuggestion(''); setStatus(''); setError('');
            setDraft(previous => Object.assign({}, emptyDraft, previous, patch));
        };
        const targets = Array.isArray(targetBehaviors) ? targetBehaviors : [];
        const selectTarget = (id) => {
            const target = targets.find(item => item.id === id);
            const saved = savedDefs.find(item => item.targetId === id);
            update(target ? {
                targetId: id, label: target.label, rawDesc: saved?.rawDescription || '',
                definition: target.operationalDefinition || '', measurement: target.measurement || 'count',
                examples: saved?.examples || '', nonExamples: saved?.nonExamples || ''
            } : emptyDraft);
        };
        const suggestDefinition = async () => {
            if (!callGemini || !draft.rawDesc?.trim()) return;
            const request = ++generation.current;
            setLoading(true); setError(''); setSuggestion('');
            try {
                const response = await callGemini('Help an educator write an observable behavior definition. Use only the observed actions described below; do not invent frequency, duration, motives, diagnoses, or credentials. Return only a short suggested definition. If the description is vague, identify what needs clarification.\nDescription: ' + draft.rawDesc);
                if (generation.current !== request) return;
                if (typeof response !== 'string' || !response.trim()) throw new Error('empty response');
                setSuggestion(response.trim().slice(0, 4000));
            } catch (_) {
                if (generation.current === request) setError('A suggestion is unavailable. You can still write and save the definition yourself.');
            } finally {
                if (generation.current === request) setLoading(false);
            }
        };
        const save = (continueToRecord = false) => {
            const label = (draft.label || '').trim();
            const definition = (draft.definition || '').trim();
            if (!label || !definition) { setError('Add a short target name and an observable definition.'); return; }
            if (!studentName || !setTargetBehaviors) { setError('Choose a student before saving a target.'); return; }
            const runtime = getBehaviorLensWorkspaceRuntime();
            const existing = targets.find(item => item.id === draft.targetId);
            if (draft.targetId && !existing) { setError('This target has changed. Choose it again before saving.'); return; }
            if (targets.some(item => item.id !== draft.targetId && item.label.trim().toLowerCase() === label.toLowerCase())) {
                setError('A target with that name already exists. Choose it above to edit its definition.'); return;
            }
            const now = new Date().toISOString();
            const id = existing?.id || runtime.canonicalBehaviorId(label);
            const target = Object.assign({}, existing || {}, { id, label, operationalDefinition: definition,
                measurement: draft.measurement || 'count', aliases: existing?.aliases || [], active: existing?.active !== false,
                createdAt: existing?.createdAt || now, updatedAt: now });
            const next = runtime.normalizeTargetBehaviors(existing ? targets.map(item => item.id === id ? target : item) : targets.concat(target), []);
            if (!next.some(item => item.id === id && item.operationalDefinition === definition)) {
                setError('This target could not be added. Review the existing targets before trying again.'); return;
            }
            setTargetBehaviors(next);
            setSavedDefs(previous => [{ id: 'definition-' + id, targetId: id, date: now, studentName,
                rawDescription: draft.rawDesc || '', formalDefinition: definition, examples: draft.examples || '',
                nonExamples: draft.nonExamples || '', dimensions: { topography: definition }, measurement: draft.measurement
            }, ...previous.filter(item => item.targetId !== id)]);
            setDraft(previous => Object.assign({}, previous, { targetId: id, label, definition }));
            setError(''); setStatus('Target saved. This definition is now available in observations and review.');
            if (addToast) addToast('Target definition saved.', 'success');
            if (continueToRecord && onRecord) onRecord();
        };
        const fieldClass = 'w-full rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm text-slate-800 focus:ring-2 focus:ring-indigo-500';
        return h('section', { className: 'max-w-2xl mx-auto space-y-5', 'aria-labelledby': 'bl-definition-title' },
            h('header', null,
                h('h2', { id: 'bl-definition-title', className: 'text-xl font-bold text-slate-900' }, 'Define a behavior'),
                h('p', { className: 'mt-2 text-sm text-slate-600' }, 'Describe what someone could see or hear. Save one definition to use throughout this student’s observations and review.')
            ),
            h('p', { className: 'text-sm text-slate-600' }, 'Your working draft stays with this student when you switch tools. AI is optional.'),
            h('div', { className: 'rounded-xl border border-slate-300 bg-white p-4 sm:p-5 space-y-4' },
                h('div', null,
                    h('label', { htmlFor: 'bl-definition-target', className: 'block text-sm font-bold text-slate-800 mb-1' }, 'Target to define'),
                    h('select', { id: 'bl-definition-target', value: draft.targetId || '', onChange: event => selectTarget(event.target.value), className: fieldClass },
                        h('option', { value: '' }, 'New target'), targets.map(item => h('option', { key: item.id, value: item.id }, item.label)))
                ),
                h('div', null,
                    h('label', { htmlFor: 'bl-definition-label', className: 'block text-sm font-bold text-slate-800 mb-1' }, 'Short target name'),
                    h('input', { id: 'bl-definition-label', value: draft.label || '', maxLength: 240, onChange: event => update({ label: event.target.value }), placeholder: 'For example: Requests help', className: fieldClass })
                ),
                h('div', null,
                    h('label', { htmlFor: 'bl-definition-text', className: 'block text-sm font-bold text-slate-800 mb-1' }, 'Observable definition'),
                    h('textarea', { id: 'bl-definition-text', value: draft.definition || '', maxLength: 4000, onChange: event => update({ definition: event.target.value }), rows: 4, placeholder: 'For example: Says “help,” raises a hand, or presents a help card during a task.', className: fieldClass }),
                    h('p', { className: 'mt-1 text-sm text-slate-600' }, 'Include what counts and when an occurrence begins or ends. Avoid guessing why it happens.')
                ),
                h('div', null,
                    h('label', { htmlFor: 'bl-definition-measure', className: 'block text-sm font-bold text-slate-800 mb-1' }, 'What do you want to measure?'),
                    h('select', { id: 'bl-definition-measure', value: draft.measurement || 'count', onChange: event => update({ measurement: event.target.value }), className: fieldClass },
                        [['count', 'How often it happens'], ['duration', 'How long it lasts'], ['latency', 'Time until it starts'], ['interval', 'Whether it happens during intervals'], ['context', 'Context only for now']].map(([value, label]) => h('option', { key: value, value }, label)))
                ),
                h('details', null,
                    h('summary', { className: 'min-h-11 py-3 text-sm font-bold text-indigo-800' }, 'Add examples and non-examples'),
                    h('label', { htmlFor: 'bl-definition-examples', className: 'block text-sm font-bold mb-1' }, 'Examples of the target behavior'),
                    h('textarea', { id: 'bl-definition-examples', value: draft.examples || '', onChange: event => update({ examples: event.target.value }), rows: 2, className: fieldClass }),
                    h('label', { htmlFor: 'bl-definition-nonexamples', className: 'block text-sm font-bold mt-3 mb-1' }, 'Non-examples of the target behavior'),
                    h('textarea', { id: 'bl-definition-nonexamples', value: draft.nonExamples || '', onChange: event => update({ nonExamples: event.target.value }), rows: 2, className: fieldClass })
                ),
                h('details', null,
                    h('summary', { className: 'min-h-11 py-3 text-sm font-bold text-indigo-800' }, 'Get optional wording help'),
                    h('label', { htmlFor: 'bl-definition-description', className: 'block text-sm font-bold mb-1' }, 'Describe the behavior in everyday language'),
                    h('textarea', { id: 'bl-definition-description', 'aria-label': 'Describe the behavior in everyday language', value: draft.rawDesc || '', onChange: event => update({ rawDesc: event.target.value }), rows: 3, className: fieldClass }),
                    h('button', { type: 'button', onClick: suggestDefinition, disabled: loading || !callGemini || !draft.rawDesc?.trim(), className: 'mt-3 min-h-11 rounded-lg border border-indigo-600 px-3 py-2 text-sm font-bold text-indigo-800 disabled:opacity-50' }, loading ? 'Suggesting wording…' : 'Suggest wording with AI'),
                    suggestion && h('div', { className: 'mt-3 rounded-lg bg-indigo-50 p-3' },
                        h('p', { className: 'text-sm text-slate-800' }, suggestion),
                        h('button', { type: 'button', onClick: () => update({ definition: suggestion }), className: 'mt-2 min-h-11 rounded-lg border border-indigo-600 bg-white px-3 py-2 text-sm font-bold text-indigo-800' }, 'Use this wording'))
                ),
                error && h('p', { role: 'alert', className: 'text-sm text-red-800' }, error),
                h('div', { className: 'flex flex-wrap gap-2' },
                    h('button', { type: 'button', onClick: () => save(true), className: 'min-h-11 rounded-lg bg-indigo-700 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-800' }, 'Save target and record'),
                    h('button', { type: 'button', onClick: () => save(false), className: 'min-h-11 rounded-lg border border-slate-400 px-4 py-2 text-sm font-bold text-slate-800' }, 'Save target')),
                h('p', { role: 'status', className: 'text-sm text-slate-700' }, status)
            ),
            savedDefs.length > 0 && h('details', { className: 'rounded-xl border border-slate-300 bg-white p-4' },
                h('summary', { className: 'min-h-11 py-2 text-sm font-bold text-slate-800' }, 'Saved definitions (' + savedDefs.length + ')'),
                savedDefs.map((entry, index) => h('div', { key: entry.id || index, className: 'py-3 border-t border-slate-200' },
                    h('p', { className: 'text-sm text-slate-800' }, entry.formalDefinition || entry.rawDescription),
                    h('button', { type: 'button', onClick: () => update({ targetId: targets.some(item => item.id === entry.targetId) ? entry.targetId : '', label: targets.find(item => item.id === entry.targetId)?.label || '', definition: entry.formalDefinition || '', rawDesc: entry.rawDescription || '', examples: entry.examples || '', nonExamples: entry.nonExamples || '', measurement: entry.measurement || 'count' }), className: 'mt-2 min-h-11 rounded-lg border border-slate-400 px-3 py-2 text-sm text-slate-800' }, 'Edit this definition'))))
        );
    };
