// behavior_lens_module.js
// BehaviorLens — FBA/BIP behavioral observation & data collection module for AlloFlow
// Loaded from GitHub CDN via loadModule('BehaviorLens', ...)
// Version: 1.0.0 (Mar 2026)
(function () {
    if (window.AlloModules && window.AlloModules.BehaviorLens) {
        console.log("[CDN] BehaviorLens already loaded, skipping duplicate");
        return;
    }

    const h = React.createElement;
    const { useState, useEffect, useRef, useMemo, useCallback, useReducer } = React;
    const warnLog = (...args) => console.warn("[BL-WARN]", ...args);
    const debugLog = (...args) => {
        if (typeof console !== "undefined") console.log("[BL-DBG]", ...args);
    };

    // ─── Constants ──────────────────────────────────────────────────────
    const ABC_CATEGORIES = {
        antecedent: [
            'Demand/task presented', 'Transition', 'Denied access', 'Unstructured time',
            'Peer interaction', 'Left alone', 'Change in routine', 'Sensory input', 'Other'
        ],
        behavior: [
            'Physical contact toward others', 'Vocal/verbal outburst', 'Elopement', 'Difficulty following directions',
            'Self-directed physical behavior', 'Damage to materials/property', 'Withdrawal', 'Emotional escalation', 'Other'
        ],
        consequence: [
            'Verbal redirect', 'Given break', 'Relocated to calm space', 'Peer attention',
            'Adult attention', 'Task removed', 'Planned ignoring (extinction)', 'Reinforcement given', 'Other'
        ]
    };

    const FUNCTION_COLORS = {
        'Attention': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', emoji: '👀' },
        'Escape': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', emoji: '🏃' },
        'Tangible': { bg: '#d1fae5', border: '#10b981', text: '#065f46', emoji: '🎁' },
        'Sensory': { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', emoji: '🌀' },
    };

    const OBSERVATION_METHODS = ['frequency', 'duration', 'interval', 'latency'];

    const RESTORATIVE_PREAMBLE = `IMPORTANT — Language Guidelines: Use person-first, strengths-based language throughout your response. Frame challenges as unmet needs or lagging skills, not deficits. Say "the student demonstrates difficulty with..." rather than "the student refuses to..." or "is non-compliant." Avoid punitive framing; focus on teaching replacement skills and building supportive environments.`;

    // ─── Utility helpers ────────────────────────────────────────────────
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const fmtDate = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };
    const fmtTime = (iso) => {
        if (!iso) return '';
        const d = new Date(iso);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    };
    const fmtDuration = (seconds) => {
        if (!seconds || seconds < 0) return '0:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // ─── ABCModal ───────────────────────────────────────────────────────
    // Modal for adding/editing a single ABC data entry
    const ABCModal = ({ entry, onSave, onClose, t }) => {
        const [antecedent, setAntecedent] = useState(entry?.antecedent || '');
        const [behavior, setBehavior] = useState(entry?.behavior || '');
        const [consequence, setConsequence] = useState(entry?.consequence || '');
        const [intensity, setIntensity] = useState(entry?.intensity || 3);
        const [duration, setDuration] = useState(entry?.duration || '');
        const [notes, setNotes] = useState(entry?.notes || '');
        const [setting, setSetting] = useState(entry?.setting || '');
        const [customA, setCustomA] = useState('');
        const [customB, setCustomB] = useState('');
        const [customC, setCustomC] = useState('');

        const handleSave = () => {
            if (!antecedent || !behavior || !consequence) return;
            onSave({
                id: entry?.id || uid(),
                timestamp: entry?.timestamp || new Date().toISOString(),
                antecedent: antecedent === 'Other' ? (customA || 'Other') : antecedent,
                behavior: behavior === 'Other' ? (customB || 'Other') : behavior,
                consequence: consequence === 'Other' ? (customC || 'Other') : consequence,
                intensity,
                duration: duration ? parseInt(duration) : null,
                notes,
                setting,
            });
        };

        const renderCategoryPicker = (label, items, value, setValue, customVal, setCustomVal, icon) => {
            return h('div', { className: 'mb-4' },
                h('label', { className: 'block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide' },
                    icon, ' ', t(`behavior_lens.abc.${label}`) || label.charAt(0).toUpperCase() + label.slice(1)
                ),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                    items.map(item =>
                        h('button', {
                            key: item,
                            type: 'button',
                            onClick: () => setValue(item),
                            className: `text-xs px-3 py-1.5 rounded-full border transition-all ${value === item
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md scale-105'
                                : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
                                }`
                        }, item)
                    )
                ),
                value === 'Other' && h('input', {
                    type: 'text',
                    value: customVal,
                    onChange: (e) => setCustomVal(e.target.value),
                    placeholder: t('behavior_lens.abc.other_placeholder') || 'Describe...',
                    className: 'mt-2 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400'
                })
            );
        };

        return h('div', {
            className: 'fixed inset-0 z-[300] flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200',
            onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
        },
            h('div', {
                className: 'bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto mx-4 animate-in zoom-in-95 duration-200'
            },
                // Header
                h('div', { className: 'sticky top-0 bg-white/90 backdrop-blur-md border-b border-slate-100 px-6 py-4 rounded-t-2xl z-10 flex justify-between items-center' },
                    h('h3', { className: 'text-lg font-black text-slate-800 flex items-center gap-2' },
                        '📋 ', t('behavior_lens.abc.modal_title') || (entry ? 'Edit Entry' : 'New ABC Entry')
                    ),
                    h('button', {
                        onClick: onClose,
                        className: 'p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors'
                    }, h(X, { size: 18 }))
                ),
                // Body
                h('div', { className: 'px-6 py-4' },
                    // Setting
                    h('div', { className: 'mb-4' },
                        h('label', { className: 'block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide' },
                            '📍 ', t('behavior_lens.abc.setting') || 'Setting / Location'
                        ),
                        h('input', {
                            type: 'text',
                            value: setting,
                            onChange: (e) => setSetting(e.target.value),
                            placeholder: t('behavior_lens.abc.setting_placeholder') || 'e.g., Classroom, Hallway, Cafeteria',
                            className: 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400'
                        })
                    ),
                    // A-B-C pickers
                    renderCategoryPicker('antecedent', ABC_CATEGORIES.antecedent, antecedent, setAntecedent, customA, setCustomA, '⚡'),
                    renderCategoryPicker('behavior', ABC_CATEGORIES.behavior, behavior, setBehavior, customB, setCustomB, '🔴'),
                    renderCategoryPicker('consequence', ABC_CATEGORIES.consequence, consequence, setConsequence, customC, setCustomC, '➡️'),
                    // Intensity slider
                    h('div', { className: 'mb-4' },
                        h('label', { className: 'block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide' },
                            '📊 ', t('behavior_lens.abc.intensity') || 'Intensity', ' — ', intensity, '/5'
                        ),
                        h('input', {
                            type: 'range',
                            min: 1, max: 5, step: 1,
                            value: intensity,
                            onChange: (e) => setIntensity(parseInt(e.target.value)),
                            className: 'w-full accent-indigo-600'
                        }),
                        h('div', { className: 'flex justify-between text-[10px] text-slate-400 mt-0.5' },
                            h('span', null, t('behavior_lens.abc.mild') || 'Mild'),
                            h('span', null, t('behavior_lens.abc.moderate') || 'Moderate'),
                            h('span', null, t('behavior_lens.abc.high_intensity') || 'High intensity')
                        )
                    ),
                    // Duration
                    h('div', { className: 'mb-4' },
                        h('label', { className: 'block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide' },
                            '⏱️ ', t('behavior_lens.abc.duration_label') || 'Duration (seconds)'
                        ),
                        h('input', {
                            type: 'number',
                            value: duration,
                            onChange: (e) => setDuration(e.target.value),
                            placeholder: t('behavior_lens.abc.duration_placeholder') || 'Optional',
                            min: 0,
                            className: 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400'
                        })
                    ),
                    // Notes
                    h('div', { className: 'mb-4' },
                        h('label', { className: 'block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide' },
                            '📝 ', t('behavior_lens.abc.notes') || 'Notes'
                        ),
                        h('textarea', {
                            value: notes,
                            onChange: (e) => setNotes(e.target.value),
                            placeholder: t('behavior_lens.abc.notes_placeholder') || 'Additional context...',
                            rows: 2,
                            className: 'w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none'
                        })
                    )
                ),
                // Footer
                h('div', { className: 'sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-100 px-6 py-4 rounded-b-2xl flex justify-end gap-3' },
                    h('button', {
                        onClick: onClose,
                        className: 'px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors'
                    }, t('common.cancel') || 'Cancel'),
                    h('button', {
                        onClick: handleSave,
                        disabled: !antecedent || !behavior || !consequence,
                        className: `px-5 py-2 text-sm font-bold rounded-lg transition-all ${antecedent && behavior && consequence
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md hover:shadow-lg'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            }`
                    }, t('common.save') || 'Save Entry')
                )
            )
        );
    };

    // ─── ABCDataPanel ───────────────────────────────────────────────────
    // Main ABC data collection table with entries list, add button, and summary
    const ABCDataPanel = ({ entries, setEntries, studentName, onAnalyze, analyzing, t, addToast }) => {
        const [editEntry, setEditEntry] = useState(null);
        const [showModal, setShowModal] = useState(false);
        const [sortField, setSortField] = useState('timestamp');
        const [sortDir, setSortDir] = useState('desc');
        const [filterBehavior, setFilterBehavior] = useState('all');

        const uniqueBehaviors = useMemo(() => {
            const set = new Set(entries.map(e => e.behavior));
            return ['all', ...Array.from(set)];
        }, [entries]);

        const sorted = useMemo(() => {
            let filtered = filterBehavior === 'all' ? entries : entries.filter(e => e.behavior === filterBehavior);
            return [...filtered].sort((a, b) => {
                if (sortField === 'timestamp') {
                    return sortDir === 'desc'
                        ? new Date(b.timestamp) - new Date(a.timestamp)
                        : new Date(a.timestamp) - new Date(b.timestamp);
                }
                const va = a[sortField] || '';
                const vb = b[sortField] || '';
                return sortDir === 'desc' ? vb.localeCompare(va) : va.localeCompare(vb);
            });
        }, [entries, sortField, sortDir, filterBehavior]);

        const handleSaveEntry = (entry) => {
            setEntries(prev => {
                const idx = prev.findIndex(e => e.id === entry.id);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = entry;
                    return updated;
                }
                return [entry, ...prev];
            });
            setShowModal(false);
            setEditEntry(null);
            if (addToast) addToast(t('behavior_lens.abc.entry_saved') || 'ABC entry saved ✅', 'success');
        };

        const handleDelete = (id) => {
            setEntries(prev => prev.filter(e => e.id !== id));
            if (addToast) addToast(t('behavior_lens.abc.entry_deleted') || 'Entry deleted', 'info');
        };

        const behaviorSummary = useMemo(() => {
            const counts = {};
            entries.forEach(e => {
                counts[e.behavior] = (counts[e.behavior] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]);
        }, [entries]);

        return h('div', { className: 'space-y-4' },
            // Header with add button
            h('div', { className: 'flex items-center justify-between' },
                h('div', null,
                    h('h3', { className: 'text-lg font-black text-slate-800' },
                        '📋 ', t('behavior_lens.abc.title') || 'ABC Data Collection'
                    ),
                    h('p', { className: 'text-xs text-slate-500 mt-0.5' },
                        studentName ? `${t('behavior_lens.abc.for_student') || 'For'}: ${studentName}` : '',
                        entries.length > 0 && ` — ${entries.length} ${t('behavior_lens.abc.entries') || 'entries'}`
                    )
                ),
                h('div', { className: 'flex items-center gap-2' },
                    entries.length >= 3 && h('button', {
                        onClick: onAnalyze,
                        disabled: analyzing,
                        className: `text-xs font-bold px-3 py-1.5 rounded-lg border transition-all flex items-center gap-1 ${analyzing ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                            }`
                    },
                        h(Sparkles, { size: 13 }),
                        analyzing ? (t('behavior_lens.abc.analyzing') || 'Analyzing...') : (t('behavior_lens.abc.ai_analyze') || 'AI Analyze')
                    ),
                    h('button', {
                        onClick: () => { setEditEntry(null); setShowModal(true); },
                        className: 'bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all flex items-center gap-1.5'
                    }, h(Plus, { size: 14 }), t('behavior_lens.abc.add_entry') || 'Add Entry')
                )
            ),
            // Filter bar
            entries.length > 0 && h('div', { className: 'flex items-center gap-2 flex-wrap' },
                h('span', { className: 'text-xs font-bold text-slate-500' }, '🔍 ', t('behavior_lens.filter') || 'Filter:'),
                uniqueBehaviors.map(beh =>
                    h('button', {
                        key: beh,
                        onClick: () => setFilterBehavior(beh),
                        className: `text-[11px] px-2.5 py-1 rounded-full border transition-all ${filterBehavior === beh
                            ? 'bg-indigo-600 text-white border-indigo-600'
                            : 'bg-white text-slate-500 border-slate-200 hover:border-indigo-300'
                            }`
                    }, beh === 'all' ? (t('behavior_lens.all') || 'All') : beh)
                )
            ),
            // Quick summary chips
            entries.length > 0 && h('div', { className: 'flex gap-2 flex-wrap' },
                behaviorSummary.slice(0, 4).map(([beh, count]) =>
                    h('div', {
                        key: beh,
                        className: 'text-xs px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-600 font-medium'
                    }, `${beh}: `, h('span', { className: 'font-black text-indigo-600' }, count))
                )
            ),
            // Entries table
            entries.length === 0
                ? h('div', { className: 'text-center py-16 bg-white rounded-xl border-2 border-dashed border-slate-200' },
                    h('div', { className: 'text-4xl mb-3' }, '📊'),
                    h('p', { className: 'text-sm font-bold text-slate-500' },
                        t('behavior_lens.abc.no_entries') || 'No ABC entries yet'
                    ),
                    h('p', { className: 'text-xs text-slate-400 mt-1' },
                        t('behavior_lens.abc.no_entries_hint') || 'Click "Add Entry" to start recording behavioral observations'
                    )
                )
                : h('div', { className: 'bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm' },
                    h('div', { className: 'overflow-x-auto' },
                        h('table', { className: 'w-full text-sm' },
                            h('thead', null,
                                h('tr', { className: 'bg-slate-50 border-b border-slate-200' },
                                    ['timestamp', 'antecedent', 'behavior', 'consequence', 'intensity'].map(col =>
                                        h('th', {
                                            key: col,
                                            onClick: () => {
                                                if (sortField === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
                                                else { setSortField(col); setSortDir('desc'); }
                                            },
                                            className: 'px-3 py-2.5 text-left text-xs font-bold text-slate-500 uppercase tracking-wide cursor-pointer hover:text-indigo-600 transition-colors select-none'
                                        },
                                            col === 'timestamp' ? (t('behavior_lens.abc.time') || 'Time') :
                                                col === 'intensity' ? '📊' :
                                                    (t(`behavior_lens.abc.${col}`) || col.charAt(0).toUpperCase() + col.slice(1)),
                                            sortField === col && h('span', { className: 'ml-1' }, sortDir === 'asc' ? '↑' : '↓')
                                        )
                                    ),
                                    h('th', { className: 'px-3 py-2.5 text-right text-xs font-bold text-slate-500 uppercase' }, '')
                                )
                            ),
                            h('tbody', null,
                                sorted.map((entry, idx) =>
                                    h('tr', {
                                        key: entry.id,
                                        className: `border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`
                                    },
                                        h('td', { className: 'px-3 py-2.5 whitespace-nowrap' },
                                            h('div', { className: 'text-xs font-bold text-slate-700' }, fmtDate(entry.timestamp)),
                                            h('div', { className: 'text-[10px] text-slate-400' }, fmtTime(entry.timestamp))
                                        ),
                                        h('td', { className: 'px-3 py-2.5' },
                                            h('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-medium' }, entry.antecedent)
                                        ),
                                        h('td', { className: 'px-3 py-2.5' },
                                            h('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200 font-bold' }, entry.behavior)
                                        ),
                                        h('td', { className: 'px-3 py-2.5' },
                                            h('span', { className: 'text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 font-medium' }, entry.consequence)
                                        ),
                                        h('td', { className: 'px-3 py-2.5 text-center' },
                                            h('div', { className: 'flex items-center gap-0.5 justify-center' },
                                                Array.from({ length: 5 }, (_, i) =>
                                                    h('div', {
                                                        key: i,
                                                        className: `w-2 h-2 rounded-full ${i < entry.intensity ? 'bg-indigo-500' : 'bg-slate-200'}`
                                                    })
                                                )
                                            )
                                        ),
                                        h('td', { className: 'px-3 py-2.5 text-right' },
                                            h('div', { className: 'flex justify-end gap-1' },
                                                h('button', {
                                                    onClick: () => { setEditEntry(entry); setShowModal(true); },
                                                    className: 'p-1 rounded hover:bg-indigo-100 text-slate-400 hover:text-indigo-600 transition-colors'
                                                }, h(Edit2, { size: 13 })),
                                                h('button', {
                                                    onClick: () => handleDelete(entry.id),
                                                    className: 'p-1 rounded hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors'
                                                }, h(Trash2, { size: 13 }))
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    )
                ),
            // Modal
            showModal && h(ABCModal, {
                entry: editEntry,
                onSave: handleSaveEntry,
                onClose: () => { setShowModal(false); setEditEntry(null); },
                t
            })
        );
    };

    // ─── LiveObsOverlay ─────────────────────────────────────────────────
    // Fullscreen observation mode with timer and frequency counter
    const LiveObsOverlay = ({ onClose, studentName, onSaveSession, t, addToast }) => {
        const [method, setMethod] = useState('frequency');
        const [timer, setTimer] = useState(0);
        const [isRunning, setIsRunning] = useState(false);
        const [frequency, setFrequency] = useState(0);
        const [intervals, setIntervals] = useState([]);
        const [intervalLength, setIntervalLength] = useState(15);
        const [currentInterval, setCurrentInterval] = useState(null);
        const [durationStart, setDurationStart] = useState(null);
        const [durations, setDurations] = useState([]);
        const [latencyStart, setLatencyStart] = useState(null);
        const [latencyEnd, setLatencyEnd] = useState(null);
        const [notes, setNotes] = useState('');
        const timerRef = useRef(null);
        const intervalTimerRef = useRef(null);

        // Start/stop timer
        const toggleTimer = useCallback(() => {
            if (isRunning) {
                setIsRunning(false);
                if (timerRef.current) clearInterval(timerRef.current);
                if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
            } else {
                setIsRunning(true);
                const start = Date.now() - timer * 1000;
                timerRef.current = setInterval(() => {
                    setTimer(Math.floor((Date.now() - start) / 1000));
                }, 100);
                // Start interval recording if applicable
                if (method === 'interval') {
                    setCurrentInterval({ start: Date.now(), occurred: false });
                    intervalTimerRef.current = setInterval(() => {
                        setIntervals(prev => [...prev, { ...currentInterval, end: Date.now() }]);
                        setCurrentInterval({ start: Date.now(), occurred: false });
                    }, intervalLength * 1000);
                }
                if (method === 'latency' && !latencyStart) {
                    setLatencyStart(Date.now());
                }
            }
        }, [isRunning, timer, method, intervalLength, currentInterval, latencyStart]);

        // Cleanup
        useEffect(() => {
            return () => {
                if (timerRef.current) clearInterval(timerRef.current);
                if (intervalTimerRef.current) clearInterval(intervalTimerRef.current);
            };
        }, []);

        const handleSave = () => {
            const sessionData = {
                id: uid(),
                method,
                duration: timer,
                timestamp: new Date().toISOString(),
                notes,
                data: {}
            };
            if (method === 'frequency') sessionData.data = { count: frequency, rate: timer > 0 ? (frequency / (timer / 60)).toFixed(2) : 0 };
            if (method === 'duration') sessionData.data = { durations, totalDuration: durations.reduce((s, d) => s + d, 0) };
            if (method === 'interval') sessionData.data = { intervals, totalIntervals: intervals.length, occurredCount: intervals.filter(i => i.occurred).length };
            if (method === 'latency') sessionData.data = { latencyMs: latencyEnd && latencyStart ? latencyEnd - latencyStart : null };
            onSaveSession(sessionData);
            if (addToast) addToast(t('behavior_lens.obs.saved') || 'Observation session saved ✅', 'success');
            onClose();
        };

        return h('div', { className: 'fixed inset-0 z-[400] bg-slate-900 flex flex-col text-white animate-in fade-in duration-300' },
            // Top bar
            h('div', { className: 'flex items-center justify-between px-6 py-4 bg-black/30' },
                h('div', { className: 'flex items-center gap-3' },
                    h('div', { className: 'w-3 h-3 rounded-full animate-pulse', style: { background: isRunning ? '#ef4444' : '#64748b' } }),
                    h('h2', { className: 'text-lg font-black' },
                        '🔍 ', t('behavior_lens.obs.title') || 'Live Observation'
                    ),
                    studentName && h('span', { className: 'text-sm text-slate-400 ml-2' }, `— ${studentName}`)
                ),
                h('div', { className: 'flex items-center gap-3' },
                    h('button', {
                        onClick: handleSave,
                        disabled: timer === 0,
                        className: 'text-xs font-bold px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center gap-1.5'
                    }, h(Save, { size: 14 }), t('behavior_lens.obs.save_session') || 'Save Session'),
                    h('button', {
                        onClick: onClose,
                        className: 'p-2 rounded-full hover:bg-white/10 transition-colors'
                    }, h(X, { size: 20 }))
                )
            ),
            // Method selector
            h('div', { className: 'flex items-center justify-center gap-2 py-3 bg-black/20' },
                OBSERVATION_METHODS.map(m =>
                    h('button', {
                        key: m,
                        onClick: () => { if (!isRunning) setMethod(m); },
                        disabled: isRunning,
                        className: `text-xs font-bold px-4 py-2 rounded-full transition-all ${method === m
                            ? 'bg-indigo-600 text-white shadow-lg'
                            : 'bg-white/10 text-slate-300 hover:bg-white/20 disabled:opacity-50'
                            }`
                    },
                        m === 'frequency' ? '🔢 ' : m === 'duration' ? '⏱️ ' : m === 'interval' ? '📍 ' : '⏳ ',
                        t(`behavior_lens.obs.method_${m}`) || m.charAt(0).toUpperCase() + m.slice(1)
                    )
                )
            ),
            // Main content
            h('div', { className: 'flex-1 flex flex-col items-center justify-center gap-6' },
                // Timer display
                h('div', { className: 'text-center' },
                    h('div', { className: 'text-7xl font-black tabular-nums tracking-tight', style: { fontFamily: 'monospace' } },
                        fmtDuration(timer)
                    ),
                    h('div', { className: 'text-sm text-slate-400 mt-1' },
                        t('behavior_lens.obs.elapsed') || 'Elapsed Time'
                    )
                ),
                // Start/stop button
                h('button', {
                    onClick: toggleTimer,
                    className: `w-24 h-24 rounded-full text-2xl font-black shadow-2xl transition-all transform hover:scale-105 active:scale-95 ${isRunning
                        ? 'bg-red-600 hover:bg-red-700 ring-4 ring-red-600/30'
                        : 'bg-green-600 hover:bg-green-700 ring-4 ring-green-600/30'
                        }`
                }, isRunning ? '⏸' : '▶'),
                // Method-specific controls
                method === 'frequency' && h('div', { className: 'flex flex-col items-center gap-4' },
                    h('div', { className: 'text-5xl font-black text-indigo-400 tabular-nums' }, frequency),
                    h('div', { className: 'text-xs text-slate-400' },
                        t('behavior_lens.obs.occurrences') || 'Occurrences',
                        timer > 0 && ` (${(frequency / (timer / 60)).toFixed(1)}/min)`
                    ),
                    h('div', { className: 'flex gap-3' },
                        h('button', {
                            onClick: () => setFrequency(f => f + 1),
                            disabled: !isRunning,
                            className: 'w-16 h-16 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-2xl font-black shadow-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-90'
                        }, '+1'),
                        h('button', {
                            onClick: () => setFrequency(f => Math.max(0, f - 1)),
                            disabled: !isRunning || frequency === 0,
                            className: 'w-12 h-12 rounded-xl bg-white/10 hover:bg-white/20 text-lg font-bold transition-all disabled:opacity-30 active:scale-90'
                        }, '-1')
                    )
                ),
                method === 'duration' && h('div', { className: 'flex flex-col items-center gap-4' },
                    h('div', { className: 'text-sm text-slate-400' },
                        durationStart
                            ? (t('behavior_lens.obs.behavior_occurring') || '🔴 Behavior occurring...')
                            : (t('behavior_lens.obs.tap_when_starts') || 'Tap when behavior starts')
                    ),
                    h('button', {
                        onClick: () => {
                            if (durationStart) {
                                const dur = Math.round((Date.now() - durationStart) / 1000);
                                setDurations(prev => [...prev, dur]);
                                setDurationStart(null);
                            } else {
                                setDurationStart(Date.now());
                            }
                        },
                        disabled: !isRunning,
                        className: `w-20 h-20 rounded-full text-lg font-black shadow-lg transition-all active:scale-90 disabled:opacity-40 ${durationStart ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`
                    }, durationStart ? '⏹' : '▶'),
                    durations.length > 0 && h('div', { className: 'text-xs text-slate-400' },
                        `${durations.length} episodes — Total: ${fmtDuration(durations.reduce((s, d) => s + d, 0))}`
                    )
                ),
                method === 'interval' && h('div', { className: 'flex flex-col items-center gap-4' },
                    !isRunning && h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-xs text-slate-400' }, t('behavior_lens.obs.interval_length') || 'Interval:'),
                        h('select', {
                            value: intervalLength,
                            onChange: (e) => setIntervalLength(parseInt(e.target.value)),
                            className: 'bg-white/10 text-white text-sm rounded-lg px-3 py-1 border border-white/20'
                        },
                            [10, 15, 20, 30, 60].map(v => h('option', { key: v, value: v }, `${v}s`))
                        )
                    ),
                    currentInterval && isRunning && h('button', {
                        onClick: () => setCurrentInterval(prev => ({ ...prev, occurred: !prev.occurred })),
                        className: `px-6 py-4 rounded-xl text-sm font-bold transition-all ${currentInterval.occurred ? 'bg-red-600 ring-2 ring-red-400' : 'bg-white/10 hover:bg-white/20'
                            }`
                    }, currentInterval.occurred ? '✅ Behavior occurred' : '❌ Not occurred'),
                    intervals.length > 0 && h('div', { className: 'text-xs text-slate-400' },
                        `${intervals.filter(i => i.occurred).length}/${intervals.length} intervals — ${Math.round((intervals.filter(i => i.occurred).length / intervals.length) * 100)}%`
                    )
                ),
                method === 'latency' && h('div', { className: 'flex flex-col items-center gap-4' },
                    h('div', { className: 'text-sm text-slate-400' },
                        latencyEnd
                            ? (t('behavior_lens.obs.latency_recorded') || 'Latency recorded!')
                            : latencyStart
                                ? (t('behavior_lens.obs.waiting_for_behavior') || '⏳ Waiting for behavior...')
                                : (t('behavior_lens.obs.start_to_begin') || 'Start timer to begin latency measurement')
                    ),
                    latencyStart && !latencyEnd && h('button', {
                        onClick: () => setLatencyEnd(Date.now()),
                        className: 'w-20 h-20 rounded-full bg-amber-600 hover:bg-amber-700 text-lg font-black shadow-lg transition-all active:scale-90'
                    }, '🎯'),
                    latencyEnd && latencyStart && h('div', { className: 'text-3xl font-black text-amber-400' },
                        `${((latencyEnd - latencyStart) / 1000).toFixed(1)}s`
                    )
                )
            ),
            // Notes bar at bottom
            h('div', { className: 'px-6 py-3 bg-black/30 flex gap-3 items-center' },
                h('input', {
                    type: 'text',
                    value: notes,
                    onChange: (e) => setNotes(e.target.value),
                    placeholder: t('behavior_lens.obs.session_notes') || 'Session notes...',
                    className: 'flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                })
            )
        );
    };

    // ─── OverviewPanel ───────────────────────────────────────────────────
    // Visual dashboard summarizing all behavioral data with trend analysis
    const OverviewPanel = ({ abcEntries, observationSessions, aiAnalysis, studentName, t }) => {
        const [dateRange, setDateRange] = useState(14); // 7, 14, 30, or 0 for all

        const stats = useMemo(() => {
            const now = new Date();
            const cutoff = dateRange > 0 ? new Date(now - dateRange * 24 * 60 * 60 * 1000) : new Date(0);
            const filtered = abcEntries.filter(e => new Date(e.timestamp) >= cutoff);
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            const thisWeek = abcEntries.filter(e => new Date(e.timestamp) >= weekAgo);
            const antecedentCounts = {};
            const consequenceCounts = {};
            const settingCounts = {};
            const intensities = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            const dayMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            filtered.forEach(e => {
                if (e.antecedent) antecedentCounts[e.antecedent] = (antecedentCounts[e.antecedent] || 0) + 1;
                if (e.consequence) consequenceCounts[e.consequence] = (consequenceCounts[e.consequence] || 0) + 1;
                if (e.setting) settingCounts[e.setting] = (settingCounts[e.setting] || 0) + 1;
                if (e.intensity) intensities[e.intensity] = (intensities[e.intensity] || 0) + 1;
                const d = new Date(e.timestamp);
                if (d >= weekAgo) dayMap[d.getDay()] = (dayMap[d.getDay()] || 0) + 1;
            });

            // 14-day trend data
            const trendDays = Math.min(dateRange || 30, 30);
            const trendData = [];
            for (let i = trendDays - 1; i >= 0; i--) {
                const dayStart = new Date(now);
                dayStart.setHours(0, 0, 0, 0);
                dayStart.setDate(dayStart.getDate() - i);
                const dayEnd = new Date(dayStart);
                dayEnd.setDate(dayEnd.getDate() + 1);
                const dayEntries = abcEntries.filter(e => {
                    const ts = new Date(e.timestamp);
                    return ts >= dayStart && ts < dayEnd;
                });
                const avgI = dayEntries.length > 0
                    ? dayEntries.reduce((s, e) => s + (e.intensity || 0), 0) / dayEntries.length
                    : 0;
                trendData.push({
                    date: dayStart,
                    count: dayEntries.length,
                    avgIntensity: avgI,
                    label: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                });
            }

            // Hour-of-day distribution
            const hourMap = {};
            filtered.forEach(e => {
                const hour = new Date(e.timestamp).getHours();
                hourMap[hour] = (hourMap[hour] || 0) + 1;
            });

            const topAntecedents = Object.entries(antecedentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const topConsequences = Object.entries(consequenceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const topSettings = Object.entries(settingCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            const avgIntensity = filtered.length > 0 ? (filtered.reduce((s, e) => s + (e.intensity || 0), 0) / filtered.length).toFixed(1) : '—';
            return {
                filtered, thisWeek, topAntecedents, topConsequences, topSettings, intensities,
                dayMap, avgIntensity, totalAbc: filtered.length, totalObs: observationSessions.length,
                trendData, hourMap, allAbc: abcEntries.length
            };
        }, [abcEntries, observationSessions, dateRange]);

        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const maxDay = Math.max(1, ...Object.values(stats.dayMap));
        const maxTrend = Math.max(1, ...stats.trendData.map(d => d.count));

        const renderStatCard = (icon, label, value, color) =>
            h('div', { className: `bg-${color}-50 border border-${color}-200 rounded-xl p-4 text-center` },
                h('div', { className: 'text-2xl mb-1' }, icon),
                h('div', { className: `text-2xl font-black text-${color}-700` }, value),
                h('div', { className: 'text-[10px] font-bold text-slate-500 uppercase mt-0.5' }, label)
            );

        const renderBarChart = (items, maxVal, color) =>
            h('div', { className: 'space-y-2' },
                items.map(([label, count], i) =>
                    h('div', { key: i, className: 'flex items-center gap-2' },
                        h('div', { className: 'text-xs font-medium text-slate-600 w-28 truncate text-right' }, label),
                        h('div', { className: 'flex-1 bg-slate-100 rounded-full h-5 overflow-hidden' },
                            h('div', { className: `h-full bg-${color}-400 rounded-full transition-all`, style: { width: `${(count / Math.max(1, maxVal)) * 100}%` } })
                        ),
                        h('span', { className: 'text-xs font-bold text-slate-500 w-6 text-right' }, count)
                    )
                )
            );

        if (stats.allAbc === 0 && stats.totalObs === 0) {
            return h('div', { className: 'max-w-4xl mx-auto text-center py-16' },
                h('div', { className: 'text-5xl mb-4' }, '📊'),
                h('h3', { className: 'text-lg font-black text-slate-700 mb-2' }, t('behavior_lens.overview.empty_title') || 'No Data Yet'),
                h('p', { className: 'text-sm text-slate-500' }, t('behavior_lens.overview.empty_desc') || 'Start collecting ABC data or run live observations to see trends here.')
            );
        }

        return h('div', { className: 'max-w-4xl mx-auto space-y-6' },
            // Date range filter
            h('div', { className: 'flex items-center justify-between bg-white rounded-xl border border-slate-200 p-3 shadow-sm' },
                h('span', { className: 'text-xs font-bold text-slate-500 uppercase' }, '📅 Date Range'),
                h('div', { className: 'flex gap-1.5' },
                    [{ val: 7, label: '7 days' }, { val: 14, label: '14 days' }, { val: 30, label: '30 days' }, { val: 0, label: 'All' }].map(opt =>
                        h('button', {
                            key: opt.val,
                            onClick: () => setDateRange(opt.val),
                            className: `text-xs px-3 py-1.5 rounded-full font-bold transition-all ${dateRange === opt.val
                                ? 'bg-indigo-600 text-white shadow-md'
                                : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`
                        }, opt.label)
                    )
                )
            ),
            // Stat cards row
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                renderStatCard('📋', 'ABC Entries', stats.totalAbc, 'indigo'),
                renderStatCard('🔍', 'Observations', stats.totalObs, 'emerald'),
                renderStatCard('📅', 'This Week', stats.thisWeek.length, 'sky'),
                renderStatCard('⚡', 'Avg Intensity', stats.avgIntensity, 'amber')
            ),
            // Trend chart
            stats.trendData.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4' }, '📈 ', t('behavior_lens.overview.trend') || 'Daily Trend'),
                h('div', { className: 'flex items-end gap-1', style: { height: '120px' } },
                    stats.trendData.map((day, i) => {
                        const barH = maxTrend > 0 ? (day.count / maxTrend) * 100 : 0;
                        const intensityColor = day.avgIntensity <= 2 ? '#86efac'
                            : day.avgIntensity <= 3 ? '#fde047'
                                : day.avgIntensity <= 4 ? '#fb923c' : '#f87171';
                        return h('div', { key: i, className: 'flex-1 flex flex-col items-center gap-0.5', style: { minWidth: 0 } },
                            day.count > 0 && h('div', { className: 'text-[9px] font-bold text-slate-500' }, day.count),
                            h('div', {
                                className: 'w-full rounded-t-sm transition-all',
                                style: {
                                    height: `${Math.max(barH, day.count > 0 ? 4 : 0)}%`,
                                    background: day.count > 0 ? intensityColor : 'transparent',
                                    minHeight: day.count > 0 ? '4px' : '0px'
                                },
                                title: `${day.label}: ${day.count} entries, avg intensity ${day.avgIntensity.toFixed(1)}`
                            }),
                            (i % Math.ceil(stats.trendData.length / 7) === 0 || i === stats.trendData.length - 1) &&
                            h('div', { className: 'text-[8px] text-slate-400 mt-1 truncate w-full text-center' }, day.label)
                        );
                    })
                ),
                h('div', { className: 'flex items-center gap-3 mt-3 justify-center' },
                    h('div', { className: 'flex items-center gap-1' },
                        h('div', { className: 'w-3 h-3 rounded-sm', style: { background: '#86efac' } }),
                        h('span', { className: 'text-[9px] text-slate-400' }, 'Low')
                    ),
                    h('div', { className: 'flex items-center gap-1' },
                        h('div', { className: 'w-3 h-3 rounded-sm', style: { background: '#fde047' } }),
                        h('span', { className: 'text-[9px] text-slate-400' }, 'Med')
                    ),
                    h('div', { className: 'flex items-center gap-1' },
                        h('div', { className: 'w-3 h-3 rounded-sm', style: { background: '#fb923c' } }),
                        h('span', { className: 'text-[9px] text-slate-400' }, 'High')
                    ),
                    h('div', { className: 'flex items-center gap-1' },
                        h('div', { className: 'w-3 h-3 rounded-sm', style: { background: '#f87171' } }),
                        h('span', { className: 'text-[9px] text-slate-400' }, 'High intensity')
                    )
                )
            ),
            // Weekly heatmap
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4' }, '📅 ', t('behavior_lens.overview.weekly') || 'Weekly Heatmap'),
                h('div', { className: 'flex gap-2 justify-between' },
                    dayLabels.map((day, i) => {
                        const count = stats.dayMap[i] || 0;
                        const intensity = count / maxDay;
                        const bg = count === 0 ? '#f1f5f9' : `rgba(99, 102, 241, ${0.2 + intensity * 0.8})`;
                        return h('div', { key: i, className: 'flex-1 text-center' },
                            h('div', { className: 'rounded-lg p-3 mb-1 transition-all', style: { background: bg } },
                                h('div', { className: `text-lg font-black ${count > 0 ? 'text-white' : 'text-slate-300'}` }, count)
                            ),
                            h('div', { className: 'text-[10px] font-bold text-slate-400' }, day)
                        );
                    })
                )
            ),
            // Hour-of-day distribution
            Object.keys(stats.hourMap).length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '🕐 ', t('behavior_lens.overview.time_of_day') || 'Time of Day Distribution'),
                h('div', { className: 'flex items-end gap-0.5', style: { height: '60px' } },
                    Array.from({ length: 24 }, (_, hr) => {
                        const count = stats.hourMap[hr] || 0;
                        const maxHr = Math.max(1, ...Object.values(stats.hourMap));
                        const pct = (count / maxHr) * 100;
                        const schoolHour = hr >= 8 && hr <= 15;
                        return h('div', {
                            key: hr,
                            className: 'flex-1',
                            style: {
                                height: `${Math.max(pct, count > 0 ? 5 : 0)}%`,
                                background: count > 0 ? (schoolHour ? '#818cf8' : '#c4b5fd') : '#f1f5f9',
                                borderRadius: '2px 2px 0 0',
                                minHeight: count > 0 ? '3px' : '1px'
                            },
                            title: `${hr}:00 — ${count} observations`
                        });
                    })
                ),
                h('div', { className: 'flex justify-between mt-1' },
                    h('span', { className: 'text-[8px] text-slate-400' }, '12am'),
                    h('span', { className: 'text-[8px] text-slate-400' }, '6am'),
                    h('span', { className: 'text-[8px] text-indigo-400 font-bold' }, '12pm'),
                    h('span', { className: 'text-[8px] text-slate-400' }, '6pm'),
                    h('span', { className: 'text-[8px] text-slate-400' }, '11pm')
                )
            ),
            // Top antecedents & consequences
            h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                stats.topAntecedents.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                    h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '🔺 ', t('behavior_lens.overview.top_antecedents') || 'Top Antecedents'),
                    renderBarChart(stats.topAntecedents, stats.topAntecedents[0]?.[1] || 1, 'indigo')
                ),
                stats.topConsequences.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                    h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '🔻 ', t('behavior_lens.overview.top_consequences') || 'Top Consequences'),
                    renderBarChart(stats.topConsequences, stats.topConsequences[0]?.[1] || 1, 'purple')
                )
            ),
            // Intensity distribution
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '🌡️ ', t('behavior_lens.overview.intensity_dist') || 'Intensity Distribution'),
                h('div', { className: 'flex gap-2 items-end h-24' },
                    [1, 2, 3, 4, 5].map(level => {
                        const count = stats.intensities[level] || 0;
                        const maxI = Math.max(1, ...Object.values(stats.intensities));
                        const colors = ['#86efac', '#fde047', '#fdba74', '#fb923c', '#f87171'];
                        return h('div', { key: level, className: 'flex-1 flex flex-col items-center gap-1' },
                            h('div', { className: 'text-[10px] font-bold text-slate-500' }, count),
                            h('div', {
                                className: 'w-full rounded-t-lg transition-all',
                                style: { height: `${Math.max(4, (count / maxI) * 80)}px`, background: colors[level - 1] }
                            }),
                            h('div', { className: 'text-[10px] font-bold text-slate-400 mt-1' }, level)
                        );
                    })
                )
            ),
            // AI Analysis summary (if available)
            aiAnalysis && h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-5' },
                h('h3', { className: 'text-sm font-black text-purple-800 mb-2' }, '🧠 ', t('behavior_lens.overview.ai_summary') || 'AI Analysis Summary'),
                h('p', { className: 'text-sm text-purple-700' }, aiAnalysis.summary),
                aiAnalysis.hypothesizedFunction && h('div', { className: 'mt-2 inline-flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-purple-200' },
                    h('span', { className: 'text-xs font-bold text-purple-600' }, `Function: ${aiAnalysis.hypothesizedFunction}`),
                    h('span', { className: 'text-xs text-purple-400' }, `(${aiAnalysis.confidence}% confidence)`)
                )
            )
        );
    };

    // ─── FrequencyCounter ───────────────────────────────────────────────
    // Fullscreen quick-click counter for rapid behavior tallying
    const FrequencyCounter = ({ onClose, studentName, onSaveSession, t, addToast }) => {
        const [counters, setCounters] = useState([{ id: uid(), label: '', count: 0 }]);
        const [running, setRunning] = useState(false);
        const [elapsed, setElapsed] = useState(0);
        const [newLabel, setNewLabel] = useState('');
        const timerRef = useRef(null);

        const counterColors = ['#818cf8', '#f472b6', '#34d399', '#fbbf24', '#f97316', '#a78bfa'];

        useEffect(() => {
            if (running) {
                timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
            } else if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }, [running]);

        const totalCount = counters.reduce((s, c) => s + c.count, 0);
        const totalRate = elapsed > 0 ? (totalCount / (elapsed / 60)).toFixed(1) : '0.0';

        const incrementCounter = (id) => {
            setCounters(prev => prev.map(c => c.id === id ? { ...c, count: c.count + 1 } : c));
            if (!running) setRunning(true);
        };

        const decrementCounter = (id) => {
            setCounters(prev => prev.map(c => c.id === id ? { ...c, count: Math.max(0, c.count - 1) } : c));
        };

        const addCounter = () => {
            if (counters.length >= 6) return;
            setCounters(prev => [...prev, { id: uid(), label: newLabel || '', count: 0 }]);
            setNewLabel('');
        };

        const removeCounter = (id) => {
            if (counters.length <= 1) return;
            setCounters(prev => prev.filter(c => c.id !== id));
        };

        const handleSave = () => {
            if (totalCount === 0) return;
            onSaveSession({
                id: uid(),
                method: 'frequency',
                timestamp: new Date().toISOString(),
                duration: elapsed,
                data: {
                    count: totalCount,
                    rate: parseFloat(totalRate),
                    counters: counters.map(c => ({
                        label: c.label || 'Unlabeled',
                        count: c.count,
                        rate: elapsed > 0 ? parseFloat((c.count / (elapsed / 60)).toFixed(2)) : 0
                    }))
                }
            });
            if (addToast) addToast(t('behavior_lens.freq.saved') || 'Session saved ✅', 'success');
            onClose();
        };

        return h('div', { className: 'fixed inset-0 z-[250] bg-slate-900 flex flex-col items-center justify-center text-white' },
            // Top bar
            h('div', { className: 'absolute top-0 left-0 right-0 flex items-center justify-between p-4' },
                h('button', { onClick: onClose, className: 'p-2 rounded-full hover:bg-white/10 transition-colors' },
                    h(X, { size: 24 })
                ),
                h('div', { className: 'text-center' },
                    h('div', { className: 'text-xs font-bold text-slate-400 uppercase' }, studentName || ''),
                    h('div', { className: 'text-xs text-slate-500 mt-0.5' },
                        counters.length > 1 ? `${counters.length} behaviors tracked` : 'Frequency Counter'
                    )
                ),
                h('button', {
                    onClick: handleSave,
                    className: 'px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-400 transition-colors'
                }, t('behavior_lens.freq.save') || 'Save')
            ),

            // Total counter display (if multiple counters)
            counters.length > 1 && h('div', { className: 'text-center mb-4' },
                h('div', { className: 'text-6xl font-black tabular-nums tracking-tighter text-slate-300' }, totalCount),
                h('div', { className: 'text-slate-500 text-xs font-medium mt-1' }, `Total: ${totalRate} / min`)
            ),

            // Counter grid
            h('div', {
                className: `grid gap-4 w-full max-w-2xl px-6 ${counters.length === 1 ? '' : counters.length <= 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`
            },
                counters.map((counter, idx) => {
                    const color = counterColors[idx % counterColors.length];
                    const counterRate = elapsed > 0 ? (counter.count / (elapsed / 60)).toFixed(1) : '0.0';
                    return h('div', {
                        key: counter.id,
                        className: 'flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/10'
                    },
                        // Label input
                        h('div', { className: 'w-full flex items-center gap-1' },
                            h('input', {
                                value: counter.label,
                                onChange: (e) => setCounters(prev => prev.map(c => c.id === counter.id ? { ...c, label: e.target.value } : c)),
                                placeholder: 'Behavior...',
                                className: 'flex-1 bg-transparent text-white text-xs text-center border-b border-white/20 focus:border-indigo-400 outline-none py-0.5'
                            }),
                            counters.length > 1 && h('button', {
                                onClick: () => removeCounter(counter.id),
                                className: 'p-0.5 rounded-full hover:bg-white/10 text-slate-500 hover:text-red-400'
                            }, h(X, { size: 12 }))
                        ),
                        // Count display
                        h('div', {
                            className: `text-${counters.length === 1 ? '[120px] md:text-[180px]' : '5xl'} font-black tabular-nums leading-none`,
                            style: { color }
                        }, counter.count),
                        h('div', { className: 'text-xs text-slate-500' }, `${counterRate} / min`),
                        // Tap button
                        h('button', {
                            onClick: () => incrementCounter(counter.id),
                            className: `${counters.length === 1 ? 'w-32 h-32' : 'w-20 h-20'} rounded-full active:scale-95 transition-all shadow-xl flex items-center justify-center text-xl font-black`,
                            style: { background: color, boxShadow: `0 8px 24px ${color}40` }
                        }, '+1'),
                        // Decrement
                        h('button', {
                            onClick: () => decrementCounter(counter.id),
                            className: 'text-xs px-3 py-1 rounded-full bg-white/10 hover:bg-white/20 text-slate-400 transition-colors'
                        }, '-1')
                    );
                })
            ),

            // Add counter button
            counters.length < 6 && h('div', { className: 'flex items-center gap-2 mt-6' },
                h('input', {
                    value: newLabel,
                    onChange: (e) => setNewLabel(e.target.value),
                    placeholder: 'New behavior label...',
                    onKeyDown: (e) => { if (e.key === 'Enter') addCounter(); },
                    className: 'bg-white/10 border border-white/20 text-white text-sm rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48'
                }),
                h('button', {
                    onClick: addCounter,
                    className: 'px-4 py-2 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 text-indigo-300 text-sm font-bold transition-colors'
                }, '+ Add')
            ),

            // Controls
            h('div', { className: 'flex gap-4 mt-6' },
                h('button', {
                    onClick: () => setRunning(!running),
                    className: `px-5 py-2 rounded-full text-sm font-bold transition-colors ${running ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'}`
                }, running ? '⏸ Pause' : '▶ Start'),
                h('button', {
                    onClick: () => { setCounters(prev => prev.map(c => ({ ...c, count: 0 }))); setElapsed(0); setRunning(false); },
                    className: 'px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors'
                }, '↺ Reset')
            ),
            // Timer
            h('div', { className: 'absolute bottom-8 text-center' },
                h('div', { className: 'text-3xl font-black tabular-nums text-slate-300' }, fmtDuration(elapsed)),
                h('div', { className: 'text-xs text-slate-500 mt-1' }, t('behavior_lens.freq.elapsed') || 'Elapsed')
            )
        );
    };

    // ─── IntervalGrid ───────────────────────────────────────────────────
    // Visual interval recording with partial/whole/momentary modes
    const IntervalGrid = ({ onClose, studentName, onSaveSession, t, addToast }) => {
        const [mode, setMode] = useState('partial');
        const [intervalSec, setIntervalSec] = useState(15);
        const [totalIntervals, setTotalIntervals] = useState(20);
        const [running, setRunning] = useState(false);
        const [currentInterval, setCurrentInterval] = useState(0);
        const [grid, setGrid] = useState([]);
        const [elapsed, setElapsed] = useState(0);
        const timerRef = useRef(null);

        useEffect(() => {
            if (running && currentInterval < totalIntervals) {
                timerRef.current = setInterval(() => {
                    setElapsed(p => {
                        const next = p + 1;
                        if (next % intervalSec === 0) {
                            setCurrentInterval(ci => {
                                const nextI = ci + 1;
                                if (nextI >= totalIntervals) { setRunning(false); }
                                setGrid(g => {
                                    const ng = [...g];
                                    if (ng[ci] === undefined) ng[ci] = false;
                                    return ng;
                                });
                                return nextI;
                            });
                        }
                        return next;
                    });
                }, 1000);
            }
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }, [running, currentInterval, totalIntervals, intervalSec]);

        const mark = (idx) => {
            setGrid(g => { const ng = [...g]; ng[idx] = !ng[idx]; return ng; });
        };

        const occurredCount = grid.filter(Boolean).length;
        const completedCount = Math.min(currentInterval, totalIntervals);
        const pct = completedCount > 0 ? ((occurredCount / completedCount) * 100).toFixed(0) : '0';

        const handleSave = () => {
            onSaveSession({
                id: uid(),
                method: 'interval',
                timestamp: new Date().toISOString(),
                duration: elapsed,
                data: { mode, intervalSec, totalIntervals, grid: [...grid], occurredCount, completedCount, percentage: parseFloat(pct) }
            });
            if (addToast) addToast(t('behavior_lens.interval.saved') || 'Interval session saved ✅', 'success');
            onClose();
        };

        const modeLabels = {
            partial: { label: t('behavior_lens.obs_partial') || 'Partial Interval', desc: 'Mark if behavior occurred at ANY point' },
            whole: { label: t('behavior_lens.obs_whole') || 'Whole Interval', desc: 'Mark only if behavior lasted the ENTIRE interval' },
            momentary: { label: t('behavior_lens.obs_momentary') || 'Momentary', desc: 'Mark only if behavior at the EXACT moment' }
        };

        return h('div', { className: 'fixed inset-0 z-[250] bg-slate-900/95 flex flex-col' },
            // Top bar
            h('div', { className: 'p-4 flex items-center justify-between border-b border-slate-700' },
                h('div', { className: 'flex items-center gap-3' },
                    h('button', { onClick: onClose, className: 'p-2 rounded-full text-slate-400 hover:bg-white/10' }, h(X, { size: 20 })),
                    h('div', null,
                        h('h3', { className: 'text-white font-black text-lg' }, t('behavior_lens.interval.title') || 'Interval Recording'),
                        h('p', { className: 'text-xs text-slate-400' }, `${studentName || ''} — ${modeLabels[mode].label}`)
                    )
                ),
                h('button', { onClick: handleSave, disabled: completedCount === 0, className: 'px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-400 disabled:opacity-40 transition-all' },
                    t('behavior_lens.interval.save') || 'Save Session')
            ),
            // Setup (shown when not running and no data)
            !running && completedCount === 0 && h('div', { className: 'p-6 space-y-4' },
                h('div', { className: 'flex gap-3' },
                    Object.entries(modeLabels).map(([key, { label }]) =>
                        h('button', {
                            key,
                            onClick: () => setMode(key),
                            className: `flex-1 py-2 px-3 rounded-lg text-sm font-bold transition-all ${mode === key ? 'bg-indigo-500 text-white' : 'bg-white/10 text-slate-300 hover:bg-white/20'}`
                        }, label)
                    )
                ),
                h('p', { className: 'text-xs text-slate-400 text-center' }, modeLabels[mode].desc),
                h('div', { className: 'flex gap-4 items-center justify-center' },
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Interval (sec)'),
                        h('select', {
                            value: intervalSec,
                            onChange: (e) => setIntervalSec(Number(e.target.value)),
                            className: 'bg-white/10 text-white rounded-lg px-3 py-2 text-sm font-bold border border-slate-600'
                        }, [10, 15, 20, 30, 60].map(v => h('option', { key: v, value: v }, `${v}s`)))
                    ),
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Total Intervals'),
                        h('select', {
                            value: totalIntervals,
                            onChange: (e) => setTotalIntervals(Number(e.target.value)),
                            className: 'bg-white/10 text-white rounded-lg px-3 py-2 text-sm font-bold border border-slate-600'
                        }, [10, 15, 20, 30, 40].map(v => h('option', { key: v, value: v }, v)))
                    )
                ),
                h('button', {
                    onClick: () => { setRunning(true); setGrid([]); setCurrentInterval(0); setElapsed(0); },
                    className: 'w-full py-3 bg-indigo-500 text-white rounded-xl font-bold text-lg hover:bg-indigo-400 transition-all'
                }, '▶ ' + (t('behavior_lens.interval.start') || 'Start Recording'))
            ),
            // Grid display
            (running || completedCount > 0) && h('div', { className: 'flex-1 overflow-y-auto p-4' },
                // Progress bar
                h('div', { className: 'mb-4 flex items-center gap-3' },
                    h('div', { className: 'flex-1 bg-slate-700 rounded-full h-3 overflow-hidden' },
                        h('div', { className: 'h-full bg-indigo-500 transition-all', style: { width: `${(completedCount / totalIntervals) * 100}%` } })
                    ),
                    h('span', { className: 'text-sm font-bold text-white tabular-nums' }, `${completedCount}/${totalIntervals}`),
                    h('span', { className: 'text-lg font-black text-indigo-400 tabular-nums' }, `${pct}%`)
                ),
                // Grid cells
                h('div', { className: 'grid grid-cols-5 md:grid-cols-10 gap-2' },
                    Array.from({ length: totalIntervals }, (_, i) => {
                        const isComplete = i < currentInterval;
                        const isCurrent = i === currentInterval && running;
                        const occurred = grid[i] === true;
                        let bg = 'bg-slate-700';
                        if (isCurrent) bg = 'bg-indigo-500 ring-2 ring-indigo-300 animate-pulse';
                        else if (isComplete && occurred) bg = 'bg-red-500';
                        else if (isComplete && !occurred) bg = 'bg-emerald-500';
                        return h('button', {
                            key: i,
                            onClick: () => { if (isComplete || isCurrent) mark(i); },
                            className: `aspect-square rounded-lg flex items-center justify-center text-xs font-bold text-white transition-all ${bg} ${isComplete || isCurrent ? 'cursor-pointer hover:opacity-80' : 'opacity-40 cursor-default'}`
                        }, i + 1);
                    })
                ),
                // Controls
                running && h('div', { className: 'mt-4 flex gap-3 justify-center' },
                    h('button', {
                        onClick: () => mark(currentInterval),
                        className: 'px-8 py-3 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-400 active:scale-95 transition-all'
                    }, '✓ ' + (t('behavior_lens.obs_occurred') || 'Occurred')),
                    h('button', {
                        onClick: () => setRunning(false),
                        className: 'px-6 py-3 bg-white/10 text-white rounded-xl font-bold hover:bg-white/20 transition-all'
                    }, '⏸ Pause')
                ),
                !running && completedCount > 0 && h('div', { className: 'mt-4 flex gap-3 justify-center' },
                    h('button', {
                        onClick: () => setRunning(true),
                        disabled: completedCount >= totalIntervals,
                        className: 'px-6 py-3 bg-indigo-500 text-white rounded-xl font-bold hover:bg-indigo-400 disabled:opacity-40 transition-all'
                    }, '▶ Resume')
                )
            ),
            // Timer display
            h('div', { className: 'p-4 border-t border-slate-700 text-center' },
                h('span', { className: 'text-2xl font-black tabular-nums text-white' }, fmtDuration(elapsed)),
                h('span', { className: 'text-xs text-slate-500 ml-3' }, `${intervalSec}s intervals`)
            )
        );
    };

    // ─── TokenBoard ─────────────────────────────────────────────────────
    // Visual reinforcement tracker with configurable token slots AND reinforcement schedule engine
    const SCHEDULE_TYPES = [
        { id: 'token', label: '⭐ Token Economy', desc: 'Simple: earn tokens, get reward', tip: 'Best for: building new behaviors' },
        { id: 'FR', label: '📊 Fixed Ratio (FR)', desc: 'Reinforce every Nth response', tip: 'e.g. FR-5 = every 5th correct behavior' },
        { id: 'VR', label: '🎲 Variable Ratio (VR)', desc: 'Reinforce around every Nth response (randomized)', tip: 'e.g. VR-5 = average of every 5th, but varies' },
        { id: 'FI', label: '⏰ Fixed Interval (FI)', desc: 'Reinforce first response after N minutes', tip: 'e.g. FI-3 = first correct behavior after 3 min' },
        { id: 'VI', label: '🎲⏰ Variable Interval (VI)', desc: 'Reinforce first response after ~N minutes (randomized)', tip: 'e.g. VI-3 = average 3 min, varies 1-5 min' },
    ];

    const TokenBoard = ({ onClose, studentName, t, addToast }) => {
        const [slots, setSlots] = useState(5);
        const [tokens, setTokens] = useState([]);
        const [targetBehavior, setTargetBehavior] = useState('');
        const [reward, setReward] = useState('');
        const [showConfetti, setShowConfetti] = useState(false);
        const tokenEmojis = ['⭐', '🌟', '🏆', '🎯', '💎', '🔥', '🌈', '🦄', '🎵', '💫'];

        // Reinforcement Schedule State
        const [scheduleType, setScheduleType] = useState('token');
        const [scheduleParam, setScheduleParam] = useState(5);
        const [responseCount, setResponseCount] = useState(0);
        const [reinforceNow, setReinforceNow] = useState(false);
        const [nextReinforceAt, setNextReinforceAt] = useState(null);
        const [timerSeconds, setTimerSeconds] = useState(0);
        const [timerActive, setTimerActive] = useState(false);
        const [intervalReady, setIntervalReady] = useState(false);
        const timerRef = useRef(null);
        const [sessionHistory, setSessionHistory] = useState([]);
        const [showHistory, setShowHistory] = useState(false);
        const [showThinning, setShowThinning] = useState(false);

        // Load session history
        useEffect(() => {
            if (!studentName) return;
            try {
                const saved = localStorage.getItem(`behaviorLens_tokenHistory_${studentName}`);
                if (saved) setSessionHistory(JSON.parse(saved));
            } catch (e) { /* ignore */ }
        }, [studentName]);

        // Save session history
        const saveSession = useCallback(() => {
            if (!studentName || responseCount === 0) return;
            const session = {
                id: uid(),
                timestamp: new Date().toISOString(),
                scheduleType,
                scheduleParam,
                targetBehavior,
                reward,
                responseCount,
                tokensEarned: tokens.filter(Boolean).length,
                totalSlots: slots,
            };
            setSessionHistory(prev => {
                const updated = [session, ...prev].slice(0, 50);
                try { localStorage.setItem(`behaviorLens_tokenHistory_${studentName}`, JSON.stringify(updated)); } catch (e) { /* ignore */ }
                return updated;
            });
            if (addToast) addToast('Session saved ✨', 'success');
        }, [studentName, responseCount, scheduleType, scheduleParam, targetBehavior, reward, tokens, slots]);

        // Compute next reinforcement point for ratio schedules
        const computeNextReinforce = useCallback((type, param, currentCount) => {
            if (type === 'FR') return currentCount + param;
            if (type === 'VR') {
                const min = Math.max(1, Math.floor(param * 0.5));
                const max = Math.floor(param * 1.5);
                return currentCount + min + Math.floor(Math.random() * (max - min + 1));
            }
            return null;
        }, []);

        // Compute next interval for interval schedules
        const computeNextInterval = useCallback((type, param) => {
            if (type === 'FI') return param * 60;
            if (type === 'VI') {
                const min = Math.max(30, Math.floor(param * 0.5 * 60));
                const max = Math.floor(param * 1.5 * 60);
                return min + Math.floor(Math.random() * (max - min + 1));
            }
            return null;
        }, []);

        // Initialize schedule when type changes
        useEffect(() => {
            setResponseCount(0);
            setReinforceNow(false);
            setIntervalReady(false);
            setTimerSeconds(0);
            setTimerActive(false);
            if (timerRef.current) clearInterval(timerRef.current);
            if (scheduleType === 'FR' || scheduleType === 'VR') {
                setNextReinforceAt(computeNextReinforce(scheduleType, scheduleParam, 0));
            } else {
                setNextReinforceAt(null);
            }
        }, [scheduleType, scheduleParam]);

        // Timer for interval schedules
        useEffect(() => {
            if (timerRef.current) clearInterval(timerRef.current);
            if (!timerActive || (scheduleType !== 'FI' && scheduleType !== 'VI')) return;
            const targetSec = computeNextInterval(scheduleType, scheduleParam);
            timerRef.current = setInterval(() => {
                setTimerSeconds(prev => {
                    const next = prev + 1;
                    if (next >= targetSec && !intervalReady) {
                        setIntervalReady(true);
                        if (addToast) addToast('⏰ Interval ready — reinforce next behavior!', 'info');
                    }
                    return next;
                });
            }, 1000);
            return () => clearInterval(timerRef.current);
        }, [timerActive, scheduleType, scheduleParam, intervalReady]);

        // Record a behavior response
        const recordResponse = () => {
            const newCount = responseCount + 1;
            setResponseCount(newCount);

            if (scheduleType === 'token') {
                // Simple token toggle auto-advance
                const nextEmpty = tokens.findIndex((t2, i) => !t2 && i < slots);
                if (nextEmpty >= 0) toggleToken(nextEmpty);
                return;
            }

            if (scheduleType === 'FR' || scheduleType === 'VR') {
                if (nextReinforceAt && newCount >= nextReinforceAt) {
                    setReinforceNow(true);
                    setTimeout(() => setReinforceNow(false), 3000);
                    if (addToast) addToast('🎉 REINFORCE NOW!', 'success');
                    const nextEmpty = tokens.findIndex((t2, i) => !t2 && i < slots);
                    if (nextEmpty >= 0) toggleToken(nextEmpty);
                    setNextReinforceAt(computeNextReinforce(scheduleType, scheduleParam, newCount));
                }
            }

            if ((scheduleType === 'FI' || scheduleType === 'VI') && intervalReady) {
                setReinforceNow(true);
                setIntervalReady(false);
                setTimeout(() => setReinforceNow(false), 3000);
                if (addToast) addToast('🎉 REINFORCE NOW!', 'success');
                const nextEmpty = tokens.findIndex((t2, i) => !t2 && i < slots);
                if (nextEmpty >= 0) toggleToken(nextEmpty);
                setTimerSeconds(0);
            }
        };

        const toggleToken = (idx) => {
            setTokens(prev => {
                const next = [...prev];
                next[idx] = !next[idx];
                const earnedCount = next.filter(Boolean).length;
                if (earnedCount >= slots && !showConfetti) {
                    setShowConfetti(true);
                    setTimeout(() => setShowConfetti(false), 3000);
                    if (addToast) addToast(t('behavior_lens.token.complete') || '🎉 Token Board Complete!', 'success');
                }
                return next;
            });
        };

        const earnedCount = tokens.filter(Boolean).length;
        const fmtTimer = (sec) => `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`;

        return h('div', { className: 'max-w-2xl mx-auto space-y-6' },
            // Schedule selector
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-2' }, '📋 ' + (t('behavior_lens.token.schedule_type') || 'Reinforcement Schedule')),
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2' },
                    SCHEDULE_TYPES.map(st =>
                        h('button', {
                            key: st.id,
                            onClick: () => setScheduleType(st.id),
                            className: `text-left p-3 rounded-xl border-2 transition-all ${scheduleType === st.id ? 'border-rose-400 bg-rose-50 shadow-md' : 'border-slate-100 hover:border-slate-200'}`
                        },
                            h('div', { className: 'text-sm font-bold text-slate-800' }, st.label),
                            h('div', { className: 'text-[10px] text-slate-500 mt-0.5' }, st.desc)
                        )
                    )
                ),
                // Schedule parameter (ratio/interval value)
                scheduleType !== 'token' && h('div', { className: 'mt-3 flex items-center gap-3' },
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase whitespace-nowrap' },
                        (scheduleType === 'FR' || scheduleType === 'VR') ? 'Ratio (n):' : 'Interval (min):'
                    ),
                    h('input', {
                        type: 'number',
                        min: 1,
                        max: 60,
                        value: scheduleParam,
                        onChange: (e) => setScheduleParam(Math.max(1, parseInt(e.target.value) || 1)),
                        className: 'w-20 border border-slate-200 rounded-lg px-3 py-2 text-sm text-center font-bold focus:ring-2 focus:ring-rose-400 outline-none'
                    }),
                    h('span', { className: 'text-xs text-slate-400 italic' },
                        scheduleType === 'FR' ? `Every ${scheduleParam} responses` :
                            scheduleType === 'VR' ? `Average every ${scheduleParam} responses` :
                                scheduleType === 'FI' ? `Every ${scheduleParam} minute(s)` :
                                    `Average every ${scheduleParam} minute(s)`
                    )
                ),
                // Schedule thinning
                scheduleType !== 'token' && h('button', {
                    onClick: () => setShowThinning(!showThinning),
                    className: 'mt-2 text-xs text-rose-500 hover:text-rose-700 font-bold'
                }, showThinning ? '▾ Hide Thinning Guide' : '▸ Schedule Thinning Guide'),
                showThinning && h('div', { className: 'mt-2 p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-800 space-y-1' },
                    h('p', { className: 'font-bold' }, '📈 Schedule Thinning Steps:'),
                    h('ol', { className: 'list-decimal pl-4 space-y-0.5' },
                        h('li', null, 'Start with dense reinforcement (e.g., FR-1 or FR-2)'),
                        h('li', null, 'Once behavior is consistent (~80%), increase ratio by 1-2'),
                        h('li', null, 'Move to variable schedule (VR) for more natural maintenance'),
                        h('li', null, 'Gradually increase VR value (VR-3 → VR-5 → VR-8)'),
                        h('li', null, 'Transition to intermittent/natural reinforcement')
                    ),
                    h('p', { className: 'italic mt-1' }, '⚠️ If behavior breaks down, return to previous schedule density')
                )
            ),
            // Settings
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3' },
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '🎯 ' + (t('behavior_lens.token.target') || 'Target Behavior')),
                        h('input', {
                            value: targetBehavior,
                            onChange: (e) => setTargetBehavior(e.target.value),
                            placeholder: t('behavior_lens.token.target_placeholder') || 'e.g., Raise hand before speaking',
                            className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none'
                        })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '🎁 ' + (t('behavior_lens.token.reward') || 'Reward')),
                        h('input', {
                            value: reward,
                            onChange: (e) => setReward(e.target.value),
                            placeholder: t('behavior_lens.token.reward_placeholder') || 'e.g., 5 min free time',
                            className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-400 outline-none'
                        })
                    )
                ),
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '🔢 ' + (t('behavior_lens.token.count') || 'Number of Tokens')),
                    h('div', { className: 'flex gap-2' },
                        [3, 4, 5, 6, 8, 10].map(n =>
                            h('button', {
                                key: n,
                                onClick: () => { setSlots(n); setTokens([]); },
                                className: `px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${slots === n ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                            }, n)
                        )
                    )
                )
            ),
            // Interval timer (for FI/VI)
            (scheduleType === 'FI' || scheduleType === 'VI') && h('div', { className: `rounded-xl border-2 p-4 text-center transition-all ${intervalReady ? 'border-green-400 bg-green-50 animate-pulse' : 'border-slate-200 bg-white'}` },
                h('div', { className: 'text-3xl font-black text-slate-800 mb-2' }, fmtTimer(timerSeconds)),
                intervalReady && h('div', { className: 'text-lg font-black text-green-600 mb-2 animate-bounce' }, '✅ INTERVAL READY — Reinforce next behavior!'),
                h('div', { className: 'flex gap-2 justify-center' },
                    h('button', {
                        onClick: () => setTimerActive(!timerActive),
                        className: `px-4 py-2 rounded-lg font-bold text-sm ${timerActive ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`
                    }, timerActive ? '⏸ Pause' : '▶ Start Timer'),
                    h('button', {
                        onClick: () => { setTimerSeconds(0); setIntervalReady(false); },
                        className: 'px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm'
                    }, '↺ Reset')
                )
            ),
            // Response counter + Reinforce button (for ratio/interval schedules)
            scheduleType !== 'token' && h('div', { className: `rounded-xl border-2 p-5 text-center transition-all ${reinforceNow ? 'border-amber-400 bg-amber-50 animate-pulse shadow-lg shadow-amber-200/50' : 'border-slate-200 bg-white'}` },
                h('div', { className: 'text-xs font-bold text-slate-500 uppercase mb-1' }, 'Responses Recorded'),
                h('div', { className: 'text-4xl font-black text-slate-800 mb-3' }, responseCount),
                reinforceNow && h('div', { className: 'text-xl font-black text-amber-600 mb-3 animate-bounce' }, '🎉 REINFORCE NOW!'),
                (scheduleType === 'FR' || scheduleType === 'VR') && nextReinforceAt && !reinforceNow &&
                h('div', { className: 'text-xs text-slate-400 mb-3' }, `Next reinforcement at response #${nextReinforceAt}`),
                h('button', {
                    onClick: recordResponse,
                    className: 'px-8 py-4 bg-gradient-to-r from-rose-500 to-amber-500 text-white rounded-2xl font-black text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all active:scale-95'
                }, '✋ Record Behavior')
            ),
            // Token Board Display
            h('div', { className: `bg-gradient-to-b from-rose-50 to-amber-50 rounded-2xl border-2 border-rose-200 p-8 shadow-lg relative overflow-hidden ${showConfetti ? 'animate-pulse' : ''}` },
                h('div', { className: 'text-center mb-6' },
                    h('div', { className: 'text-xs font-bold text-rose-500 uppercase mb-1' }, studentName || ''),
                    targetBehavior && h('div', { className: 'text-lg font-black text-slate-800' }, targetBehavior),
                    reward && h('div', { className: 'text-sm text-amber-600 font-medium mt-1' }, `🎁 ${reward}`),
                    scheduleType !== 'token' && h('div', { className: 'mt-1 inline-block px-2 py-0.5 bg-rose-100 text-rose-600 rounded-full text-[10px] font-bold' },
                        `${scheduleType}-${scheduleParam}`)
                ),
                h('div', { className: 'flex flex-wrap justify-center gap-4 mb-6' },
                    Array.from({ length: slots }, (_, i) => {
                        const earned = tokens[i];
                        const emoji = tokenEmojis[i % tokenEmojis.length];
                        return h('button', {
                            key: i,
                            onClick: () => scheduleType === 'token' ? toggleToken(i) : null,
                            className: `w-16 h-16 md:w-20 md:h-20 rounded-2xl border-3 flex items-center justify-center text-3xl md:text-4xl transition-all transform ${earned
                                ? 'bg-amber-100 border-amber-400 shadow-lg shadow-amber-200/50 scale-110'
                                : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-md opacity-40 hover:opacity-60'
                                }`
                        }, earned ? emoji : '○');
                    })
                ),
                h('div', { className: 'flex items-center gap-3' },
                    h('div', { className: 'flex-1 bg-white rounded-full h-4 overflow-hidden border border-rose-200' },
                        h('div', {
                            className: 'h-full rounded-full transition-all bg-gradient-to-r from-rose-400 to-amber-400',
                            style: { width: `${(earnedCount / slots) * 100}%` }
                        })
                    ),
                    h('span', { className: 'text-sm font-black text-rose-600' }, `${earnedCount}/${slots}`)
                ),
                showConfetti && h('div', { className: 'absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl' },
                    h('div', { className: 'text-center' },
                        h('div', { className: 'text-6xl mb-2 animate-bounce' }, '🎉'),
                        h('div', { className: 'text-2xl font-black text-rose-600' }, t('behavior_lens.token.success') || 'Great Job!'),
                        reward && h('div', { className: 'text-lg text-amber-600 font-bold mt-1' }, `🎁 ${reward}`)
                    )
                )
            ),
            // Action buttons
            h('div', { className: 'flex gap-2 justify-center flex-wrap' },
                h('button', {
                    onClick: () => { setTokens([]); setShowConfetti(false); setResponseCount(0); setReinforceNow(false); },
                    className: 'px-6 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-bold hover:bg-slate-200 transition-all'
                }, '↺ ' + (t('behavior_lens.token.reset') || 'Reset Board')),
                h('button', {
                    onClick: saveSession,
                    disabled: responseCount === 0 && earnedCount === 0,
                    className: 'px-6 py-2 bg-emerald-100 text-emerald-700 rounded-full text-sm font-bold hover:bg-emerald-200 transition-all disabled:opacity-40'
                }, '💾 Save Session'),
                h('button', {
                    onClick: () => setShowHistory(!showHistory),
                    className: 'px-6 py-2 bg-indigo-100 text-indigo-700 rounded-full text-sm font-bold hover:bg-indigo-200 transition-all'
                }, `📊 History (${sessionHistory.length})`)
            ),
            // Session history
            showHistory && sessionHistory.length > 0 && h('div', { className: 'bg-white rounded-xl border border-indigo-200 p-5 shadow-sm' },
                h('h4', { className: 'text-sm font-black text-slate-800 mb-3' }, '📊 Session History'),
                // Mini bar chart
                sessionHistory.length > 1 && h('div', { className: 'flex items-end gap-1 h-20 mb-4 px-2' },
                    sessionHistory.slice(0, 14).reverse().map((s, i) => {
                        const pct = s.totalSlots > 0 ? (s.tokensEarned / s.totalSlots) * 100 : 0;
                        return h('div', {
                            key: i,
                            className: 'flex-1 bg-gradient-to-t from-rose-400 to-amber-300 rounded-t transition-all',
                            style: { height: `${Math.max(4, pct)}%` },
                            title: `${fmtDate(s.timestamp)}: ${s.tokensEarned}/${s.totalSlots}`
                        });
                    })
                ),
                h('div', { className: 'space-y-2 max-h-48 overflow-y-auto' },
                    sessionHistory.slice(0, 10).map(s =>
                        h('div', { key: s.id, className: 'flex items-center justify-between p-2 bg-slate-50 rounded-lg text-xs' },
                            h('div', null,
                                h('span', { className: 'font-bold text-slate-700' }, fmtDate(s.timestamp)),
                                h('span', { className: 'text-slate-400 ml-2' }, s.scheduleType === 'token' ? 'Token' : `${s.scheduleType}-${s.scheduleParam}`)
                            ),
                            h('div', { className: 'text-slate-500' }, `${s.tokensEarned}/${s.totalSlots} tokens · ${s.responseCount} responses`)
                        )
                    )
                )
            )
        );
    };

    // ─── HotspotMatrix ──────────────────────────────────────────────────
    // Maps behavioral observations to daily routines
    const HotspotMatrix = ({ abcEntries, studentName, callGemini, t, addToast }) => {
        const defaultRoutines = [
            'Morning Arrival', 'Circle Time', 'Reading/ELA', 'Math',
            'Lunch', 'Recess', 'Specials (Art/PE/Music)', 'Dismissal'
        ];
        const [routines, setRoutines] = useState(defaultRoutines);
        const [matrix, setMatrix] = useState(() => {
            const m = {};
            defaultRoutines.forEach(r => { m[r] = 0; });
            return m;
        });
        const [analyzing, setAnalyzing] = useState(false);
        const [analysis, setAnalysis] = useState(null);
        const [editingRoutine, setEditingRoutine] = useState(null);
        const [editVal, setEditVal] = useState('');

        const maxCount = Math.max(1, ...Object.values(matrix));

        const getHeatColor = (count) => {
            if (count === 0) return { bg: '#f8fafc', text: '#94a3b8' };
            const ratio = count / maxCount;
            if (ratio < 0.33) return { bg: '#fef9c3', text: '#a16207' };
            if (ratio < 0.66) return { bg: '#fed7aa', text: '#c2410c' };
            return { bg: '#fecaca', text: '#dc2626' };
        };

        const handleAnalyze = async () => {
            if (!callGemini) return;
            setAnalyzing(true);
            try {
                const matrixStr = Object.entries(matrix)
                    .map(([routine, count]) => `${routine}: ${count} observations`)
                    .join('\n');
                const prompt = `You are a BCBA analyzing a behavior hotspot matrix for a student.
${RESTORATIVE_PREAMBLE}

ROUTINE HOTSPOT DATA:
${matrixStr}

Student has ${abcEntries.length} total ABC entries.

Analyze which routines are behavioral hotspots and return ONLY valid JSON:
{
  "summary": "2-3 sentence analysis of the pattern",
  "peakRoutines": ["routine name 1", "routine name 2"],
  "recommendations": ["recommendation 1", "recommendation 2", "recommendation 3"],
  "possibleTriggers": ["environmental factor 1", "factor 2"]
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setAnalysis(parsed);
            } catch (err) {
                warnLog('Hotspot analysis failed:', err);
                if (addToast) addToast('Analysis failed', 'error');
            } finally { setAnalyzing(false); }
        };

        const startEdit = (routine) => { setEditingRoutine(routine); setEditVal(routine); };
        const finishEdit = () => {
            if (editVal.trim() && editVal !== editingRoutine) {
                setRoutines(r => r.map(x => x === editingRoutine ? editVal.trim() : x));
                setMatrix(m => {
                    const nm = { ...m };
                    nm[editVal.trim()] = nm[editingRoutine] || 0;
                    delete nm[editingRoutine];
                    return nm;
                });
            }
            setEditingRoutine(null);
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // Matrix
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4' }, '🗓️ ', t('behavior_lens.hotspot.title') || 'Routine Hotspot Matrix'),
                h('div', { className: 'space-y-2' },
                    routines.map(routine => {
                        const count = matrix[routine] || 0;
                        const colors = getHeatColor(count);
                        return h('div', { key: routine, className: 'flex items-center gap-2' },
                            editingRoutine === routine
                                ? h('input', {
                                    value: editVal,
                                    onChange: (e) => setEditVal(e.target.value),
                                    onBlur: finishEdit,
                                    onKeyDown: (e) => { if (e.key === 'Enter') finishEdit(); },
                                    autoFocus: true,
                                    className: 'w-44 text-xs border border-indigo-300 rounded px-2 py-1.5 focus:ring-2 focus:ring-indigo-400 outline-none'
                                })
                                : h('button', {
                                    onClick: () => startEdit(routine),
                                    className: 'w-44 text-xs font-medium text-slate-600 text-left truncate hover:text-indigo-600 transition-colors'
                                }, routine),
                            h('div', { className: 'flex-1 flex gap-1' },
                                h('div', {
                                    className: 'flex-1 rounded-lg h-10 flex items-center justify-center font-bold text-sm transition-all cursor-pointer hover:opacity-80',
                                    style: { background: colors.bg, color: colors.text },
                                    onClick: () => setMatrix(m => ({ ...m, [routine]: (m[routine] || 0) + 1 }))
                                }, count > 0 ? count : '—')
                            ),
                            h('button', {
                                onClick: () => setMatrix(m => ({ ...m, [routine]: Math.max(0, (m[routine] || 0) - 1) })),
                                className: 'text-xs text-slate-400 hover:text-red-500 px-1 transition-colors'
                            }, '−')
                        );
                    })
                ),
                h('p', { className: 'text-[10px] text-slate-400 mt-3' }, t('behavior_lens.hotspot.tap_hint') || 'Tap a cell to increment. Click routine name to edit.')
            ),
            // AI analyze button
            callGemini && h('button', {
                onClick: handleAnalyze,
                disabled: analyzing || Object.values(matrix).every(v => v === 0),
                className: 'w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl hover:from-orange-400 disabled:opacity-50 transition-all flex items-center justify-center gap-2'
            }, analyzing ? '⏳ Analyzing...' : ('🧠 ' + (t('behavior_lens.hotspot.analyze') || 'Analyze Hotspots'))),
            // Analysis results
            analysis && h('div', { className: 'bg-orange-50 rounded-xl border border-orange-200 p-5 animate-in slide-in-from-bottom-4 duration-300' },
                h('h4', { className: 'text-sm font-black text-orange-800 mb-2' }, '🧠 Hotspot Analysis'),
                h('p', { className: 'text-sm text-orange-700 mb-3' }, analysis.summary),
                analysis.peakRoutines && analysis.peakRoutines.length > 0 && h('div', { className: 'mb-3' },
                    h('div', { className: 'text-xs font-bold text-orange-600 uppercase mb-1' }, 'Peak Routines'),
                    h('div', { className: 'flex flex-wrap gap-1' },
                        analysis.peakRoutines.map((r, i) => h('span', { key: i, className: 'px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-bold' }, r))
                    )
                ),
                analysis.recommendations && h('ul', { className: 'space-y-1' },
                    analysis.recommendations.map((rec, i) => h('li', { key: i, className: 'text-xs text-orange-700 flex gap-2' }, h('span', null, '✓'), rec))
                )
            )
        );
    };

    // ─── ExportPanel ────────────────────────────────────────────────────
    // Export behavioral data as JSON, CSV, or summary text
    const ExportPanel = ({ abcEntries, observationSessions, studentName, aiAnalysis, t }) => {
        const [format, setFormat] = useState('json');
        const [dateRange, setDateRange] = useState('all');

        const filteredAbc = useMemo(() => {
            if (dateRange === 'all') return abcEntries;
            const now = new Date();
            const cutoff = dateRange === 'week' ? new Date(now - 7 * 86400000) :
                dateRange === 'month' ? new Date(now - 30 * 86400000) : new Date(0);
            return abcEntries.filter(e => new Date(e.timestamp) >= cutoff);
        }, [abcEntries, dateRange]);

        const filteredObs = useMemo(() => {
            if (dateRange === 'all') return observationSessions;
            const now = new Date();
            const cutoff = dateRange === 'week' ? new Date(now - 7 * 86400000) :
                dateRange === 'month' ? new Date(now - 30 * 86400000) : new Date(0);
            return observationSessions.filter(s => new Date(s.timestamp) >= cutoff);
        }, [observationSessions, dateRange]);

        const csvEscape = (val) => {
            if (val == null) return '';
            const str = String(val);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        const handleExport = () => {
            let content, filename, type;
            const dateSuffix = new Date().toISOString().split('T')[0];
            const safeName = (studentName || 'student').replace(/\s/g, '_');

            if (format === 'json') {
                const data = {
                    student: studentName,
                    exportDate: new Date().toISOString(),
                    abcEntries: filteredAbc,
                    observationSessions: filteredObs,
                    aiAnalysis: aiAnalysis || null
                };
                content = JSON.stringify(data, null, 2);
                filename = `behaviorlens_${safeName}_${dateSuffix}.json`;
                type = 'application/json';
            } else if (format === 'csv') {
                // ABC Data as CSV
                const headers = ['Timestamp', 'Date', 'Time', 'Antecedent', 'Behavior', 'Consequence', 'Setting', 'Intensity', 'Duration (s)', 'Notes'];
                const rows = filteredAbc.map(e => [
                    csvEscape(e.timestamp),
                    csvEscape(fmtDate(e.timestamp)),
                    csvEscape(fmtTime(e.timestamp)),
                    csvEscape(e.antecedent),
                    csvEscape(e.behavior),
                    csvEscape(e.consequence),
                    csvEscape(e.setting),
                    csvEscape(e.intensity),
                    csvEscape(e.duration),
                    csvEscape(e.notes)
                ].join(','));
                content = [headers.join(','), ...rows].join('\n');

                // Append observation sessions as a second section
                if (filteredObs.length > 0) {
                    content += '\n\n' + ['Session Timestamp', 'Method', 'Duration (s)', 'Count/Rate', 'Notes'].join(',');
                    filteredObs.forEach(s => {
                        const detail = s.method === 'frequency' ? `${s.data?.count || 0} (${s.data?.rate || 0}/min)` :
                            s.method === 'interval' ? `${s.data?.occurredCount || 0}/${s.data?.totalIntervals || 0}` :
                                s.method === 'duration' ? `${s.data?.totalDuration || 0}s total` : '';
                        content += '\n' + [
                            csvEscape(s.timestamp),
                            csvEscape(s.method),
                            csvEscape(s.duration),
                            csvEscape(detail),
                            csvEscape(s.notes)
                        ].join(',');
                    });
                }
                filename = `behaviorlens_${safeName}_${dateSuffix}.csv`;
                type = 'text/csv';
            } else {
                let text = `BehaviorLens Report — ${studentName || 'Student'}\n`;
                text += `Exported: ${new Date().toLocaleString()}\n`;
                text += '═'.repeat(50) + '\n\n';
                text += `ABC DATA (${filteredAbc.length} entries)\n` + '─'.repeat(30) + '\n';
                filteredAbc.forEach((e, i) => {
                    text += `\n#${i + 1} — ${fmtDate(e.timestamp)} ${fmtTime(e.timestamp)}\n`;
                    text += `  Antecedent: ${e.antecedent || '—'}\n`;
                    text += `  Behavior:   ${e.behavior || '—'}\n`;
                    text += `  Consequence: ${e.consequence || '—'}\n`;
                    if (e.setting) text += `  Setting:    ${e.setting}\n`;
                    if (e.intensity) text += `  Intensity:  ${e.intensity}/5\n`;
                    if (e.notes) text += `  Notes:      ${e.notes}\n`;
                });
                text += `\n\nOBSERVATION SESSIONS (${filteredObs.length})\n` + '─'.repeat(30) + '\n';
                filteredObs.forEach((s, i) => {
                    text += `\n#${i + 1} — ${fmtDate(s.timestamp)} | ${s.method} | ${fmtDuration(s.duration)}\n`;
                    if (s.method === 'frequency') text += `  Count: ${s.data?.count || 0} (${s.data?.rate || '?'}/min)\n`;
                    if (s.method === 'interval') text += `  ${s.data?.occurredCount || 0}/${s.data?.totalIntervals || 0} intervals (${s.data?.percentage || 0}%)\n`;
                });
                if (aiAnalysis) {
                    text += '\n\nAI ANALYSIS\n' + '─'.repeat(30) + '\n';
                    text += `Function: ${aiAnalysis.hypothesizedFunction} (${aiAnalysis.confidence}% confidence)\n`;
                    text += `Summary: ${aiAnalysis.summary}\n`;
                }
                content = text;
                filename = `behaviorlens_${safeName}_${dateSuffix}.txt`;
                type = 'text/plain';
            }
            const blob = new Blob([content], { type });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4' },
                h('h3', { className: 'text-sm font-black text-slate-800' }, '📥 ' + (t('behavior_lens.export.title') || 'Export Data')),
                // Format selector
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Format'),
                    h('div', { className: 'flex gap-2' },
                        [['json', '📦 JSON'], ['csv', '📊 CSV'], ['text', '📝 Text']].map(([key, label]) =>
                            h('button', {
                                key, onClick: () => setFormat(key),
                                className: `flex-1 py-2 rounded-lg text-sm font-bold transition-all ${format === key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                            }, label)
                        )
                    )
                ),
                // Format description
                h('div', { className: 'bg-slate-50 rounded-lg p-3 border border-slate-100' },
                    h('p', { className: 'text-[11px] text-slate-500' },
                        format === 'json' ? '📦 Full data export including all fields. Best for data backup or importing into other tools.' :
                            format === 'csv' ? '📊 Spreadsheet-compatible format. Opens in Excel, Google Sheets, or any data analysis tool.' :
                                '📝 Human-readable text report. Best for printing, emailing, or pasting into documents.'
                    )
                ),
                // Date range
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Date Range'),
                    h('div', { className: 'flex gap-2' },
                        [['all', 'All Time'], ['month', 'Last 30 Days'], ['week', 'Last 7 Days']].map(([key, label]) =>
                            h('button', {
                                key, onClick: () => setDateRange(key),
                                className: `flex-1 py-2 rounded-lg text-xs font-bold transition-all ${dateRange === key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                            }, label)
                        )
                    )
                ),
                // Preview
                h('div', { className: 'bg-slate-50 rounded-lg p-4 border border-slate-100' },
                    h('div', { className: 'text-xs text-slate-600 space-y-1' },
                        h('div', null, `📋 ${filteredAbc.length} ABC entries`),
                        h('div', null, `🔍 ${filteredObs.length} observation sessions`),
                        aiAnalysis && h('div', null, '🧠 AI analysis included')
                    )
                ),
                // Export button
                h('button', {
                    onClick: handleExport,
                    disabled: filteredAbc.length === 0 && filteredObs.length === 0,
                    className: 'w-full py-3 bg-gradient-to-r from-slate-700 to-slate-900 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, '📥 ' + (t('behavior_lens.export.download') || 'Download Export'))
            )
        );
    };

    // ─── RecordReview ───────────────────────────────────────────────────
    // Paste IEP/eval text → AI-powered structured summary
    const RecordReview = ({ studentName, callGemini, t, addToast }) => {
        const [text, setText] = useState('');
        const [summary, setSummary] = useState(null);
        const [loading, setLoading] = useState(false);

        const handleSummarize = async () => {
            if (!callGemini || text.trim().length < 50) return;
            setLoading(true);
            try {
                const prompt = `You are a school psychologist reviewing educational documents for a student (codename: "${studentName || 'Student'}").
${RESTORATIVE_PREAMBLE}

PASTED DOCUMENT TEXT:
${text.substring(0, 4000)}

Analyze this document and return ONLY valid JSON:
{
  "documentType": "IEP" | "Evaluation Report" | "Progress Notes" | "Other",
  "keyFindings": ["finding 1", "finding 2", "finding 3"],
  "currentGoals": ["goal 1", "goal 2"],
  "areasOfConcern": ["concern 1", "concern 2"],
  "strengths": ["strength 1", "strength 2"],
  "behavioralNotes": "any behavioral observations mentioned",
  "recommendations": ["recommendation 1", "recommendation 2"],
  "summary": "2-3 sentence overall summary"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setSummary(parsed);
                if (addToast) addToast('Record review complete ✨', 'success');
            } catch (err) {
                warnLog('Record review failed:', err);
                if (addToast) addToast('Review failed — try again', 'error');
            } finally { setLoading(false); }
        };

        const renderSection = (icon, title, items) => {
            if (!items || items.length === 0) return null;
            return h('div', { className: 'mb-4' },
                h('h4', { className: 'text-xs font-bold text-slate-600 uppercase mb-2 flex items-center gap-1' }, icon, ' ', title),
                h('ul', { className: 'space-y-1' },
                    items.map((item, i) => h('li', { key: i, className: 'text-sm text-slate-700 flex items-start gap-2' },
                        h('span', { className: 'text-cyan-500 mt-0.5 shrink-0' }, '•'), item
                    ))
                )
            );
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4' },
                h('h3', { className: 'text-sm font-black text-slate-800' }, '📄 ' + (t('behavior_lens.record.title') || 'Record Review')),
                h('p', { className: 'text-xs text-slate-500' }, t('behavior_lens.record.desc') || 'Paste IEP goals, evaluation reports, or progress notes for AI-powered analysis.'),
                h('textarea', {
                    value: text,
                    onChange: (e) => setText(e.target.value),
                    placeholder: t('behavior_lens.record.placeholder') || 'Paste document text here...',
                    rows: 8,
                    className: 'w-full border border-slate-200 rounded-lg px-4 py-3 text-sm resize-y focus:ring-2 focus:ring-cyan-400 outline-none'
                }),
                h('button', {
                    onClick: handleSummarize,
                    disabled: loading || text.trim().length < 50,
                    className: 'w-full py-3 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2'
                }, loading ? '⏳ Analyzing...' : ('🧠 ' + (t('behavior_lens.record.analyze') || 'AI Summarize')))
            ),
            summary && h('div', { className: 'bg-cyan-50 rounded-xl border border-cyan-200 p-5 animate-in slide-in-from-bottom-4 duration-300 space-y-2' },
                h('div', { className: 'flex items-center justify-between mb-3' },
                    h('h3', { className: 'text-sm font-black text-cyan-800' }, '📋 Record Summary'),
                    summary.documentType && h('span', { className: 'px-2 py-0.5 bg-cyan-100 text-cyan-700 rounded-full text-xs font-bold' }, summary.documentType)
                ),
                summary.summary && h('p', { className: 'text-sm text-cyan-700 bg-white p-3 rounded-lg border border-cyan-100 mb-3' }, summary.summary),
                renderSection('🔍', 'Key Findings', summary.keyFindings),
                renderSection('🎯', 'Current Goals', summary.currentGoals),
                renderSection('⚠️', 'Areas of Concern', summary.areasOfConcern),
                renderSection('💪', 'Strengths', summary.strengths),
                renderSection('💡', 'Recommendations', summary.recommendations),
                summary.behavioralNotes && h('div', { className: 'mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200' },
                    h('div', { className: 'text-xs font-bold text-amber-700 mb-1' }, '📝 Behavioral Notes'),
                    h('p', { className: 'text-sm text-amber-600' }, summary.behavioralNotes)
                )
            )
        );
    };

    // ─── HypothesisDiagram ──────────────────────────────────────────────
    // Visual function hypothesis flow diagram
    const HypothesisDiagram = ({ abcEntries, aiAnalysis, studentName, callGemini, t, addToast }) => {
        const defaultBoxes = {
            setting: 'Describe the setting or context...',
            antecedent: 'What triggers the behavior?',
            behavior: 'What does the behavior look like?',
            consequence: 'What happens after?',
            function: 'What need does it serve?'
        };
        const [boxes, setBoxes] = useState(defaultBoxes);
        const [generating, setGenerating] = useState(false);

        const handleGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const dataStr = abcEntries.slice(0, 15).map((e, i) =>
                    `#${i + 1}: A="${e.antecedent}", B="${e.behavior}", C="${e.consequence}"${e.setting ? ', Setting="' + e.setting + '"' : ''}`
                ).join('\n');
                const existing = aiAnalysis ? `\nExisting AI analysis: Function=${aiAnalysis.hypothesizedFunction}, Confidence=${aiAnalysis.confidence}%` : '';
                const prompt = `You are a BCBA creating a functional behavior hypothesis diagram.
${RESTORATIVE_PREAMBLE}

ABC DATA (${abcEntries.length} entries):
${dataStr}${existing}

Create a hypothesis diagram and return ONLY valid JSON:
{
  "setting": "Brief description of typical setting events (1-2 sentences)",
  "antecedent": "Most common triggering antecedent (1-2 sentences)",
  "behavior": "Operationally defined target behavior (1-2 sentences)",
  "consequence": "Most common maintaining consequence (1-2 sentences)",
  "function": "Hypothesized function with brief rationale (1-2 sentences)"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setBoxes(parsed);
                if (addToast) addToast('Hypothesis generated ✨', 'success');
            } catch (err) {
                warnLog('Hypothesis generation failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        const fc = aiAnalysis?.hypothesizedFunction ? (FUNCTION_COLORS[aiAnalysis.hypothesizedFunction] || FUNCTION_COLORS['Attention']) : FUNCTION_COLORS['Attention'];
        const diagramSteps = [
            { key: 'setting', label: 'Setting Event', icon: '🏫', color: '#e0f2fe', border: '#38bdf8' },
            { key: 'antecedent', label: 'Antecedent', icon: '🔺', color: '#fef3c7', border: '#f59e0b' },
            { key: 'behavior', label: 'Behavior', icon: '⚡', color: '#fee2e2', border: '#ef4444' },
            { key: 'consequence', label: 'Consequence', icon: '🔻', color: '#e0e7ff', border: '#6366f1' },
            { key: 'function', label: 'Function', icon: fc.emoji, color: fc.bg, border: fc.border },
        ];

        return h('div', { className: 'max-w-4xl mx-auto space-y-4' },
            // AI generate button
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating || abcEntries.length < 2,
                className: 'w-full py-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2'
            }, generating ? '⏳ Generating...' : ('🧠 ' + (t('behavior_lens.hypothesis.generate') || 'Generate Hypothesis from Data'))),
            // Diagram
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-6 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-6 text-center' }, '🔗 ' + (t('behavior_lens.hypothesis.title') || 'Functional Hypothesis Diagram')),
                h('div', { className: 'space-y-3' },
                    diagramSteps.map((step, idx) =>
                        h('div', { key: step.key },
                            h('div', {
                                className: 'rounded-xl p-4 border-2 transition-all',
                                style: { background: step.color, borderColor: step.border }
                            },
                                h('div', { className: 'flex items-center gap-2 mb-2' },
                                    h('span', { className: 'text-lg' }, step.icon),
                                    h('span', { className: 'text-xs font-black uppercase tracking-wide', style: { color: step.border } }, step.label)
                                ),
                                h('textarea', {
                                    value: boxes[step.key] || '',
                                    onChange: (e) => setBoxes(prev => ({ ...prev, [step.key]: e.target.value })),
                                    rows: 2,
                                    className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-transparent focus:border-slate-300 focus:ring-1 focus:ring-slate-200 outline-none resize-none'
                                })
                            ),
                            idx < diagramSteps.length - 1 && h('div', { className: 'flex justify-center py-1' },
                                h('div', { className: 'text-slate-300 text-xl' }, '↓')
                            )
                        )
                    )
                )
            )
        );
    };

    // ─── SmartGoalBuilder ───────────────────────────────────────────────
    // SMART goal construction wizard with AI suggestions
    const SmartGoalBuilder = ({ abcEntries, aiAnalysis, studentName, callGemini, t, addToast }) => {
        const [specific, setSpecific] = useState('');
        const [measurable, setMeasurable] = useState('');
        const [achievable, setAchievable] = useState('');
        const [relevant, setRelevant] = useState('');
        const [timeBound, setTimeBound] = useState('');
        const [savedGoals, setSavedGoals] = useState([]);
        const [suggesting, setSuggesting] = useState(false);
        const [suggestions, setSuggestions] = useState(null);

        const goalPreview = useMemo(() => {
            const parts = [specific, measurable, achievable, relevant, timeBound].filter(Boolean);
            if (parts.length === 0) return '';
            return `${studentName || 'The student'} will ${specific || '___'}${measurable ? ', as measured by ' + measurable : ''}${achievable ? ', with support of ' + achievable : ''}${relevant ? ', in order to ' + relevant : ''}${timeBound ? ', by ' + timeBound : ''}.`;
        }, [specific, measurable, achievable, relevant, timeBound, studentName]);

        const handleSuggest = async () => {
            if (!callGemini) return;
            setSuggesting(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const prompt = `You are a BCBA writing SMART behavioral goals for a student.
${RESTORATIVE_PREAMBLE}

Hypothesized function: ${funcStr}
ABC entries: ${abcEntries.length}
${aiAnalysis?.summary ? 'Analysis summary: ' + aiAnalysis.summary : ''}

Generate 3 SMART behavioral goals and return ONLY valid JSON:
{
  "goals": [
    {
      "specific": "specific behavior target",
      "measurable": "how it will be measured",
      "achievable": "supports and scaffolds",
      "relevant": "connection to function/need",
      "timeBound": "timeline",
      "preview": "full goal statement"
    }
  ]
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setSuggestions(parsed.goals || []);
                if (addToast) addToast('Goals suggested ✨', 'success');
            } catch (err) {
                warnLog('Goal suggestion failed:', err);
                if (addToast) addToast('Suggestion failed', 'error');
            } finally { setSuggesting(false); }
        };

        const saveGoal = () => {
            if (!specific) return;
            setSavedGoals(prev => [...prev, { id: uid(), specific, measurable, achievable, relevant, timeBound, preview: goalPreview, createdAt: new Date().toISOString() }]);
            setSpecific(''); setMeasurable(''); setAchievable(''); setRelevant(''); setTimeBound('');
            if (addToast) addToast('Goal saved ✅', 'success');
        };

        const applySuggestion = (goal) => {
            setSpecific(goal.specific || '');
            setMeasurable(goal.measurable || '');
            setAchievable(goal.achievable || '');
            setRelevant(goal.relevant || '');
            setTimeBound(goal.timeBound || '');
            setSuggestions(null);
        };

        const smartFields = [
            { key: 'S', label: 'Specific', value: specific, set: setSpecific, placeholder: 'What behavior will change?', color: '#3b82f6' },
            { key: 'M', label: 'Measurable', value: measurable, set: setMeasurable, placeholder: 'How will progress be measured?', color: '#10b981' },
            { key: 'A', label: 'Achievable', value: achievable, set: setAchievable, placeholder: 'What supports are needed?', color: '#f59e0b' },
            { key: 'R', label: 'Relevant', value: relevant, set: setRelevant, placeholder: 'Why does this matter?', color: '#8b5cf6' },
            { key: 'T', label: 'Time-Bound', value: timeBound, set: setTimeBound, placeholder: 'By when?', color: '#ef4444' },
        ];

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // AI suggest
            callGemini && h('button', {
                onClick: handleSuggest,
                disabled: suggesting,
                className: 'w-full py-3 bg-gradient-to-r from-lime-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, suggesting ? '⏳ Generating...' : ('🧠 ' + (t('behavior_lens.goals.suggest') || 'AI Suggest Goals'))),
            // Suggestions
            suggestions && suggestions.length > 0 && h('div', { className: 'bg-lime-50 rounded-xl border border-lime-200 p-4 space-y-2' },
                h('h4', { className: 'text-xs font-bold text-lime-700 uppercase mb-2' }, '💡 AI Suggestions — tap to apply'),
                suggestions.map((g, i) => h('button', {
                    key: i,
                    onClick: () => applySuggestion(g),
                    className: 'w-full text-left p-3 bg-white rounded-lg border border-lime-200 hover:border-lime-400 transition-all text-sm text-slate-700'
                }, g.preview || g.specific))
            ),
            // SMART form
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-2' }, '🎯 ' + (t('behavior_lens.goals.title') || 'SMART Goal Builder')),
                smartFields.map(f =>
                    h('div', { key: f.key, className: 'flex items-start gap-3' },
                        h('div', {
                            className: 'w-8 h-8 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0 mt-1',
                            style: { background: f.color }
                        }, f.key),
                        h('div', { className: 'flex-1' },
                            h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, f.label),
                            h('input', {
                                value: f.value,
                                onChange: (e) => f.set(e.target.value),
                                placeholder: f.placeholder,
                                className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 outline-none mt-0.5',
                                style: { '--tw-ring-color': f.color }
                            })
                        )
                    )
                )
            ),
            // Preview
            goalPreview && h('div', { className: 'bg-gradient-to-r from-lime-50 to-emerald-50 rounded-xl border border-lime-200 p-5' },
                h('div', { className: 'text-xs font-bold text-lime-700 uppercase mb-2' }, '📝 Goal Preview'),
                h('p', { className: 'text-sm text-slate-800 font-medium leading-relaxed' }, goalPreview),
                h('button', {
                    onClick: saveGoal,
                    className: 'mt-3 px-4 py-2 bg-lime-500 text-white rounded-lg font-bold text-sm hover:bg-lime-400 transition-all'
                }, '✓ ' + (t('behavior_lens.goals.save') || 'Save Goal'))
            ),
            // Saved goals
            savedGoals.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h4', { className: 'text-xs font-bold text-slate-600 uppercase mb-3' }, `📋 Saved Goals (${savedGoals.length})`),
                h('div', { className: 'space-y-2' },
                    savedGoals.map(g => h('div', { key: g.id, className: 'p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm text-slate-700' },
                        h('p', null, g.preview),
                        h('div', { className: 'text-[10px] text-slate-400 mt-1' }, fmtDate(g.createdAt))
                    ))
                )
            )
        );
    };

    // ─── BehaviorContract ───────────────────────────────────────────────
    // AI-assisted behavior contract builder
    const BehaviorContract = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const [target, setTarget] = useState('');
        const [studentExpectations, setStudentExpectations] = useState('');
        const [rewards, setRewards] = useState('');
        const [teacherSupports, setTeacherSupports] = useState('');
        const [supportPlan, setSupportPlan] = useState('');
        const [duration, setDuration] = useState('2 weeks');
        const [drafting, setDrafting] = useState(false);
        const [drafted, setDrafted] = useState(false);

        const handleDraft = async () => {
            if (!callGemini) return;
            setDrafting(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const prompt = `You are a BCBA drafting a behavior contract for a student (codename: "${studentName || 'Student'}").
${RESTORATIVE_PREAMBLE}

Hypothesized function: ${funcStr}
${aiAnalysis?.summary ? 'Analysis: ' + aiAnalysis.summary : ''}
ABC entries: ${abcEntries.length}

Generate a behavior contract and return ONLY valid JSON:
{
  "targetBehavior": "operationally defined target behavior",
  "studentExpectations": "what the student agrees to do (2-3 bullet points joined with semicolons)",
  "rewards": "positive reinforcement for meeting expectations",
  "teacherSupports": "what the teacher will provide (2-3 bullet points joined with semicolons)",
  "supportPlan": "additional supports and strategies if the student needs more help",
  "duration": "recommended contract duration"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setTarget(parsed.targetBehavior || '');
                setStudentExpectations(parsed.studentExpectations || '');
                setRewards(parsed.rewards || '');
                setTeacherSupports(parsed.teacherSupports || '');
                setSupportPlan(parsed.supportPlan || parsed.consequences || '');
                setDuration(parsed.duration || '2 weeks');
                setDrafted(true);
                if (addToast) addToast('Contract drafted ✨', 'success');
            } catch (err) {
                warnLog('Contract drafting failed:', err);
                if (addToast) addToast('Drafting failed', 'error');
            } finally { setDrafting(false); }
        };

        const handlePrint = () => { window.print(); };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // AI draft button
            callGemini && h('button', {
                onClick: handleDraft,
                disabled: drafting,
                className: 'w-full py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, drafting ? '⏳ Drafting...' : ('🧠 ' + (t('behavior_lens.contract.draft') || 'AI Draft Contract'))),
            // Contract form
            h('div', { id: 'behavior-contract-printable', className: 'bg-white rounded-xl border-2 border-fuchsia-200 p-6 shadow-sm space-y-4 print:border-black print:shadow-none' },
                h('div', { className: 'text-center border-b border-slate-200 pb-4 mb-4' },
                    h('h2', { className: 'text-xl font-black text-slate-800' }, '📜 ' + (t('behavior_lens.contract.title') || 'Behavior Contract')),
                    h('p', { className: 'text-xs text-slate-500 mt-1' }, `Student: ${studentName || '___'} | Duration: ${duration}`)
                ),
                // Target behavior
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '🎯 Target Behavior'),
                    h('textarea', { value: target, onChange: (e) => setTarget(e.target.value), rows: 2, className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fuchsia-400 outline-none resize-none' })
                ),
                // Two columns
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                    h('div', { className: 'bg-blue-50 rounded-xl p-4 border border-blue-200' },
                        h('h4', { className: 'text-xs font-black text-blue-700 uppercase mb-2' }, '👤 Student Agrees To'),
                        h('textarea', { value: studentExpectations, onChange: (e) => setStudentExpectations(e.target.value), rows: 3, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-blue-100 resize-none outline-none' })
                    ),
                    h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200' },
                        h('h4', { className: 'text-xs font-black text-emerald-700 uppercase mb-2' }, '👩‍🏫 Teacher Will Provide'),
                        h('textarea', { value: teacherSupports, onChange: (e) => setTeacherSupports(e.target.value), rows: 3, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-emerald-100 resize-none outline-none' })
                    )
                ),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                    h('div', { className: 'bg-amber-50 rounded-xl p-4 border border-amber-200' },
                        h('h4', { className: 'text-xs font-black text-amber-700 uppercase mb-2' }, '🎁 Rewards'),
                        h('textarea', { value: rewards, onChange: (e) => setRewards(e.target.value), rows: 2, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-amber-100 resize-none outline-none' })
                    ),
                    h('div', { className: 'bg-red-50 rounded-xl p-4 border border-red-200' },
                        h('h4', { className: 'text-xs font-black text-blue-700 uppercase mb-2' }, '🔄 Additional Support Plan'),
                        h('textarea', { value: supportPlan, onChange: (e) => setSupportPlan(e.target.value), rows: 2, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-blue-100 resize-none outline-none' })
                    )
                ),
                // Signature lines
                h('div', { className: 'grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 mt-4' },
                    h('div', null,
                        h('div', { className: 'border-b border-slate-400 mb-1 h-8' }),
                        h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'Student Signature / Date')
                    ),
                    h('div', null,
                        h('div', { className: 'border-b border-slate-400 mb-1 h-8' }),
                        h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'Teacher Signature / Date')
                    )
                )
            ),
            // Print button
            h('button', {
                onClick: handlePrint,
                className: 'w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all print:hidden'
            }, '🖨️ ' + (t('behavior_lens.contract.print') || 'Print Contract'))
        );
    };

    // ─── EscalationCycle ────────────────────────────────────────────────
    // Colvin & Sugai 7-phase escalation cycle visualizer
    const EscalationCycle = ({ abcEntries, aiAnalysis, studentName, callGemini, t, addToast }) => {
        const phases = [
            { name: 'Calm', icon: '😌', color: '#22c55e', bg: '#f0fdf4', signs: 'Cooperative, on-task, following routines', response: 'Reinforce positive behavior, build rapport' },
            { name: 'Triggers', icon: '⚡', color: '#eab308', bg: '#fefce8', signs: 'Subtle changes in body language, withdrawal', response: 'Remove/reduce trigger, redirect calmly' },
            { name: 'Agitation', icon: '😤', color: '#f97316', bg: '#fff7ed', signs: 'Off-task, fidgeting, non-compliance begins', response: 'Offer choices, use proximity, check in privately' },
            { name: 'Acceleration', icon: '🔥', color: '#ef4444', bg: '#fef2f2', signs: 'Increasing intensity, arguing, difficulty de-escalating', response: 'Avoid power struggles, state expectations calmly, clear the area if needed' },
            { name: 'Peak', icon: '💥', color: '#dc2626', bg: '#fee2e2', signs: 'Highest intensity behavior, student is overwhelmed', response: 'Focus on safety, use crisis protocols, document' },
            { name: 'De-escalation', icon: '🌊', color: '#3b82f6', bg: '#eff6ff', signs: 'Confusion, withdrawal, reduced intensity', response: 'Allow space, avoid debriefing too soon, quiet environment' },
            { name: 'Recovery', icon: '🌱', color: '#06b6d4', bg: '#ecfeff', signs: 'Returning to baseline, may be subdued', response: 'Rebuild relationship, gentle re-engagement, debrief when ready' },
        ];
        const [selected, setSelected] = useState(null);
        const [personalizing, setPersonalizing] = useState(false);
        const [personalized, setPersonalized] = useState({});

        const handlePersonalize = async () => {
            if (!callGemini) return;
            setPersonalizing(true);
            try {
                const dataStr = abcEntries.slice(0, 10).map((e, i) =>
                    `#${i + 1}: A="${e.antecedent}", B="${e.behavior}", C="${e.consequence}", Intensity=${e.intensity}/5`
                ).join('\n');
                const prompt = `You are a BCBA personalizing a Colvin & Sugai escalation cycle for a student.
${RESTORATIVE_PREAMBLE}

ABC DATA:
${dataStr}
${aiAnalysis?.summary ? 'Analysis: ' + aiAnalysis.summary : ''}

Personalize each phase of the cycle and return ONLY valid JSON:
{
  "Calm": { "signs": "personalized signs for this student", "response": "personalized staff response" },
  "Triggers": { "signs": "...", "response": "..." },
  "Agitation": { "signs": "...", "response": "..." },
  "Acceleration": { "signs": "...", "response": "..." },
  "Peak": { "signs": "...", "response": "..." },
  "De-escalation": { "signs": "...", "response": "..." },
  "Recovery": { "signs": "...", "response": "..." }
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setPersonalized(parsed);
                if (addToast) addToast('Cycle personalized ✨', 'success');
            } catch (err) {
                warnLog('Personalization failed:', err);
                if (addToast) addToast('Personalization failed', 'error');
            } finally { setPersonalizing(false); }
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // AI personalize button
            callGemini && h('button', {
                onClick: handlePersonalize,
                disabled: personalizing || abcEntries.length < 2,
                className: 'w-full py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, personalizing ? '⏳ Personalizing...' : ('🧠 ' + (t('behavior_lens.cycle.personalize') || 'Personalize for This Student'))),
            // Cycle visualization
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4 text-center' }, '🔄 ' + (t('behavior_lens.cycle.title') || 'Escalation Cycle (Colvin & Sugai)')),
                h('div', { className: 'space-y-2' },
                    phases.map((phase, idx) => {
                        const p = personalized[phase.name] || {};
                        const isSelected = selected === idx;
                        return h('div', { key: phase.name },
                            h('button', {
                                onClick: () => setSelected(isSelected ? null : idx),
                                className: 'w-full text-left rounded-xl p-4 border-2 transition-all hover:shadow-md',
                                style: { background: phase.bg, borderColor: isSelected ? phase.color : 'transparent' }
                            },
                                h('div', { className: 'flex items-center justify-between' },
                                    h('div', { className: 'flex items-center gap-3' },
                                        h('span', { className: 'text-2xl' }, phase.icon),
                                        h('div', null,
                                            h('div', { className: 'font-black text-sm', style: { color: phase.color } },
                                                `${idx + 1}. ${phase.name}`
                                            ),
                                            !isSelected && h('div', { className: 'text-xs text-slate-500 mt-0.5' }, p.signs || phase.signs)
                                        )
                                    ),
                                    h('span', { className: 'text-slate-400 text-sm' }, isSelected ? '▼' : '▶')
                                )
                            ),
                            isSelected && h('div', { className: 'mx-4 p-4 bg-white rounded-b-xl border border-t-0 border-slate-200 space-y-3 animate-in slide-in-from-top-2 duration-200' },
                                h('div', null,
                                    h('div', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-0.5' }, '👀 Observable Signs'),
                                    h('p', { className: 'text-sm text-slate-700' }, p.signs || phase.signs)
                                ),
                                h('div', null,
                                    h('div', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-0.5' }, '🛡️ Recommended Response'),
                                    h('p', { className: 'text-sm text-slate-700' }, p.response || phase.response)
                                )
                            )
                        );
                    })
                )
            )
        );
    };

    // ─── ReinforcerAssessment ───────────────────────────────────────────
    // Preference inventory across 5 categories with AI suggestions
    const ReinforcerAssessment = ({ studentName, aiAnalysis, callGemini, t, addToast }) => {
        const categories = {
            social: { label: 'Social', icon: '👥', items: ['Verbal praise', 'High-five/fist bump', 'Lunch with teacher', 'Phone call home', 'Peer recognition', 'Leadership role'] },
            activity: { label: 'Activity', icon: '🎮', items: ['Extra recess', 'Free choice time', 'Computer time', 'Read aloud to class', 'Helper role', 'Drawing time'] },
            tangible: { label: 'Tangible', icon: '🎁', items: ['Stickers', 'Pencils/erasers', 'Bookmarks', 'Certificates', 'Class store credits', 'Special seating'] },
            sensory: { label: 'Sensory', icon: '🌀', items: ['Fidget tool', 'Noise-canceling headphones', 'Movement break', 'Quiet corner', 'Weighted lap pad', 'Music listening'] },
            edible: { label: 'Food/Drink', icon: '🍎', items: ['Healthy snack', 'Water bottle refill', 'Special lunch item', 'Gum/mints'] }
        };
        const [ratings, setRatings] = useState({});
        const [aiSuggestions, setAiSuggestions] = useState(null);
        const [suggesting, setSuggesting] = useState(false);

        const setRating = (item, value) => {
            setRatings(prev => ({ ...prev, [item]: prev[item] === value ? 0 : value }));
        };

        const rankedItems = useMemo(() => {
            return Object.entries(ratings)
                .filter(([_, v]) => v > 0)
                .sort((a, b) => b[1] - a[1]);
        }, [ratings]);

        const handleSuggest = async () => {
            if (!callGemini) return;
            setSuggesting(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const topRated = rankedItems.slice(0, 5).map(([item, rating]) => `${item} (${rating}/5)`).join(', ');
                const prompt = `You are a BCBA selecting reinforcers for a student.
${RESTORATIVE_PREAMBLE}

Hypothesized function: ${funcStr}
${topRated ? 'Top-rated reinforcers: ' + topRated : 'No ratings yet.'}
${aiAnalysis?.summary ? 'Analysis: ' + aiAnalysis.summary : ''}

Recommend reinforcers and return ONLY valid JSON:
{
  "recommendations": [
    { "reinforcer": "name", "rationale": "why this works for this function", "category": "social/activity/tangible/sensory/edible" }
  ],
  "tips": "1-2 sentences on reinforcer delivery strategy"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setAiSuggestions(parsed);
                if (addToast) addToast('Reinforcers recommended ✨', 'success');
            } catch (err) {
                warnLog('Reinforcer suggestion failed:', err);
                if (addToast) addToast('Suggestion failed', 'error');
            } finally { setSuggesting(false); }
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // AI suggest
            callGemini && h('button', {
                onClick: handleSuggest,
                disabled: suggesting,
                className: 'w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, suggesting ? '⏳ Analyzing...' : ('🧠 ' + (t('behavior_lens.reinforcer.suggest') || 'AI Recommend Reinforcers'))),
            // AI suggestions
            aiSuggestions && h('div', { className: 'bg-pink-50 rounded-xl border border-pink-200 p-5 animate-in slide-in-from-bottom-4 duration-300' },
                h('h4', { className: 'text-sm font-black text-pink-800 mb-3' }, '🧠 AI Recommendations'),
                aiSuggestions.recommendations && h('div', { className: 'space-y-2 mb-3' },
                    aiSuggestions.recommendations.map((r, i) =>
                        h('div', { key: i, className: 'flex items-start gap-2 p-2 bg-white rounded-lg border border-pink-100' },
                            h('span', { className: 'text-pink-500 mt-0.5' }, '✓'),
                            h('div', null,
                                h('span', { className: 'text-sm font-bold text-slate-700' }, r.reinforcer),
                                h('span', { className: 'text-xs text-slate-500 ml-2' }, r.rationale)
                            )
                        )
                    )
                ),
                aiSuggestions.tips && h('p', { className: 'text-xs text-pink-600 italic' }, '💡 ' + aiSuggestions.tips)
            ),
            // Category sections
            Object.entries(categories).map(([catKey, cat]) =>
                h('div', { key: catKey, className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                    h('h4', { className: 'text-sm font-black text-slate-800 mb-3 flex items-center gap-2' }, cat.icon, ' ', cat.label),
                    h('div', { className: 'space-y-2' },
                        cat.items.map(item =>
                            h('div', { key: item, className: 'flex items-center justify-between' },
                                h('span', { className: 'text-sm text-slate-700' }, item),
                                h('div', { className: 'flex gap-1' },
                                    [1, 2, 3, 4, 5].map(star =>
                                        h('button', {
                                            key: star,
                                            onClick: () => setRating(item, star),
                                            className: `text-lg transition-all ${(ratings[item] || 0) >= star ? 'text-amber-400 scale-110' : 'text-slate-200 hover:text-amber-200'}`
                                        }, '★')
                                    )
                                )
                            )
                        )
                    )
                )
            ),
            // Ranked summary
            rankedItems.length > 0 && h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-5' },
                h('h4', { className: 'text-sm font-black text-amber-800 mb-3' }, '🏆 Top Preferences'),
                h('div', { className: 'space-y-1' },
                    rankedItems.slice(0, 8).map(([item, rating], i) =>
                        h('div', { key: item, className: 'flex items-center gap-2 text-sm' },
                            h('span', { className: 'text-xs font-bold text-amber-600 w-4' }, `${i + 1}.`),
                            h('span', { className: 'text-slate-700' }, item),
                            h('span', { className: 'text-amber-400 ml-auto' }, '★'.repeat(rating))
                        )
                    )
                )
            )
        );
    };

    // ─── ChoiceBoard ────────────────────────────────────────────────────
    // Fullscreen student-facing visual choice overlay
    const ChoiceBoard = ({ onClose, studentName, t, addToast }) => {
        const [choices, setChoices] = useState([
            { label: 'Take a break', emoji: '🧘' },
            { label: 'Ask for help', emoji: '🙋' },
            { label: 'Use a tool', emoji: '🔧' },
            { label: 'Keep working', emoji: '💪' },
        ]);
        const [editing, setEditing] = useState(false);
        const [selected, setSelected] = useState(null);
        const [log, setLog] = useState([]);
        const [mode, setMode] = useState('choice'); // 'choice' or 'firstThen'
        const [firstItem, setFirstItem] = useState({ label: 'Finish math worksheet', emoji: '📝' });
        const [thenItem, setThenItem] = useState({ label: 'Free time on iPad', emoji: '🎮' });
        const [firstDone, setFirstDone] = useState(false);

        const gradients = [
            'from-blue-400 to-indigo-500',
            'from-emerald-400 to-teal-500',
            'from-amber-400 to-orange-500',
            'from-pink-400 to-rose-500',
            'from-violet-400 to-purple-500',
            'from-cyan-400 to-sky-500',
        ];

        const handleSelect = (idx) => {
            setSelected(idx);
            setLog(prev => [...prev, { choice: choices[idx].label, time: new Date().toISOString() }]);
            if (addToast) addToast(`Choice: ${choices[idx].label}`, 'success');
            setTimeout(() => setSelected(null), 2000);
        };

        const updateChoice = (idx, field, val) => {
            setChoices(prev => prev.map((c, i) => i === idx ? { ...c, [field]: val } : c));
        };

        if (editing) {
            return h('div', { className: 'fixed inset-0 z-[300] bg-slate-900 flex flex-col items-center justify-center p-8' },
                h('div', { className: 'bg-white rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[85vh] overflow-y-auto' },
                    h('h3', { className: 'text-sm font-black text-slate-800' }, '✏️ Edit Choices'),
                    choices.map((c, i) =>
                        h('div', { key: i, className: 'flex gap-2 items-center' },
                            h('input', { value: c.emoji, onChange: (e) => updateChoice(i, 'emoji', e.target.value), className: 'w-12 text-center text-xl border rounded-lg', maxLength: 2 }),
                            h('input', { value: c.label, onChange: (e) => updateChoice(i, 'label', e.target.value), className: 'flex-1 border rounded-lg px-3 py-2 text-sm' }),
                            choices.length > 2 && h('button', {
                                onClick: () => setChoices(prev => prev.filter((_, j) => j !== i)),
                                className: 'p-1.5 rounded-lg hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors'
                            }, h(X, { size: 14 }))
                        )
                    ),
                    h('div', { className: 'flex gap-2' },
                        choices.length < 6 && h('button', {
                            onClick: () => setChoices(prev => [...prev, { label: 'New choice', emoji: '✨' }]),
                            className: 'px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold'
                        }, '+ Add Choice')
                    ),
                    // First-Then editor
                    h('div', { className: 'border-t border-slate-200 pt-4 mt-2' },
                        h('h4', { className: 'text-xs font-bold text-slate-500 uppercase mb-2' }, '⬅️ First-Then Board'),
                        h('div', { className: 'space-y-2' },
                            h('div', { className: 'flex gap-2' },
                                h('input', { value: firstItem.emoji, onChange: (e) => setFirstItem(p => ({ ...p, emoji: e.target.value })), className: 'w-12 text-center text-xl border rounded-lg', maxLength: 2 }),
                                h('input', { value: firstItem.label, onChange: (e) => setFirstItem(p => ({ ...p, label: e.target.value })), className: 'flex-1 border rounded-lg px-3 py-2 text-sm', placeholder: 'FIRST (task)...' })
                            ),
                            h('div', { className: 'flex gap-2' },
                                h('input', { value: thenItem.emoji, onChange: (e) => setThenItem(p => ({ ...p, emoji: e.target.value })), className: 'w-12 text-center text-xl border rounded-lg', maxLength: 2 }),
                                h('input', { value: thenItem.label, onChange: (e) => setThenItem(p => ({ ...p, label: e.target.value })), className: 'flex-1 border rounded-lg px-3 py-2 text-sm', placeholder: 'THEN (reward)...' })
                            )
                        )
                    ),
                    h('button', { onClick: () => setEditing(false), className: 'w-full py-2 bg-indigo-500 text-white rounded-lg font-bold' }, 'Done')
                )
            );
        }

        // First-Then mode
        if (mode === 'firstThen') {
            return h('div', { className: 'fixed inset-0 z-[300] bg-slate-900 flex flex-col' },
                h('div', { className: 'flex justify-between items-center p-4 shrink-0' },
                    h('div', { className: 'flex gap-2' },
                        h('button', { onClick: () => setMode('choice'), className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20' }, '🔲 Choices'),
                        h('button', { onClick: () => setEditing(true), className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20' }, '✏️ Edit')
                    ),
                    h('span', { className: 'text-white/60 text-xs font-bold' }, 'First → Then'),
                    h('button', { onClick: onClose, className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20' }, '✕ Close')
                ),
                h('div', { className: 'flex-1 grid grid-cols-2 gap-6 p-6' },
                    // FIRST panel
                    h('button', {
                        onClick: () => { setFirstDone(true); if (addToast) addToast('First task complete! ✅', 'success'); },
                        className: `rounded-3xl flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ${firstDone
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 scale-95 ring-4 ring-emerald-300/50'
                            : 'bg-gradient-to-br from-blue-400 to-indigo-600 hover:scale-[1.02] active:scale-95'}`
                    },
                        h('div', { className: 'text-xs font-black text-white/60 uppercase tracking-widest mb-2' }, 'FIRST'),
                        h('span', { className: 'text-6xl md:text-8xl mb-4 drop-shadow-lg' }, firstItem.emoji),
                        h('span', { className: 'text-xl md:text-2xl font-black text-white drop-shadow-md text-center px-4' }, firstItem.label),
                        firstDone && h('div', { className: 'mt-4 text-white text-4xl animate-bounce' }, '✅')
                    ),
                    // THEN panel
                    h('div', {
                        className: `rounded-3xl flex flex-col items-center justify-center shadow-2xl transition-all duration-500 ${firstDone
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 scale-[1.05] ring-4 ring-amber-300/50 animate-pulse'
                            : 'bg-gradient-to-br from-slate-600 to-slate-800 opacity-50 grayscale'}`
                    },
                        h('div', { className: 'text-xs font-black text-white/60 uppercase tracking-widest mb-2' }, 'THEN'),
                        h('span', { className: 'text-6xl md:text-8xl mb-4 drop-shadow-lg' }, thenItem.emoji),
                        h('span', { className: 'text-xl md:text-2xl font-black text-white drop-shadow-md text-center px-4' }, thenItem.label),
                        !firstDone && h('div', { className: 'mt-4 text-white/30 text-sm font-bold' }, '🔒 Complete "First" to unlock')
                    )
                ),
                // Reset button
                firstDone && h('div', { className: 'p-4 flex justify-center' },
                    h('button', {
                        onClick: () => setFirstDone(false),
                        className: 'px-6 py-2 rounded-full bg-white/10 text-white text-sm font-bold hover:bg-white/20 transition-colors'
                    }, '↺ Reset')
                )
            );
        }

        return h('div', { className: 'fixed inset-0 z-[300] bg-slate-900 flex flex-col' },
            // Toolbar
            h('div', { className: 'flex justify-between items-center p-4 shrink-0' },
                h('div', { className: 'flex gap-2' },
                    h('button', { onClick: () => setMode('firstThen'), className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20' }, '➡️ First/Then'),
                    h('button', { onClick: () => setEditing(true), className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20' }, '✏️ Edit')
                ),
                h('span', { className: 'text-white/60 text-xs font-bold' }, studentName ? `For: ${studentName}` : 'Choice Board'),
                h('button', { onClick: onClose, className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20' }, '✕ Close')
            ),
            // Choices grid
            h('div', { className: `flex-1 grid gap-4 p-6 ${choices.length <= 2 ? 'grid-cols-1' : choices.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'}` },
                choices.map((c, i) =>
                    h('button', {
                        key: i,
                        onClick: () => handleSelect(i),
                        className: `rounded-3xl bg-gradient-to-br ${gradients[i % gradients.length]} flex flex-col items-center justify-center shadow-2xl transition-all duration-300 ${selected === i ? 'scale-95 ring-4 ring-white/80' : 'hover:scale-[1.02] active:scale-95'}`
                    },
                        h('span', { className: `${choices.length <= 4 ? 'text-6xl md:text-8xl' : 'text-4xl md:text-6xl'} mb-4 drop-shadow-lg` }, c.emoji),
                        h('span', { className: `${choices.length <= 4 ? 'text-xl md:text-3xl' : 'text-lg md:text-xl'} font-black text-white drop-shadow-md` }, c.label),
                        selected === i && h('div', { className: 'mt-3 text-white/80 text-lg font-bold animate-bounce' }, '✓ Selected!')
                    )
                )
            )
        );
    };

    // ─── EnvironmentAudit ───────────────────────────────────────────────
    // 8-item classroom environment checklist with scoring
    const EnvironmentAudit = ({ studentName, callGemini, t, addToast }) => {
        const items = [
            { id: 'structure', label: 'Classroom Structure', desc: 'Clear physical layout, defined areas, organized spaces' },
            { id: 'schedule', label: 'Visual Schedule', desc: 'Daily schedule posted and referenced regularly' },
            { id: 'rules', label: 'Rules & Expectations', desc: 'Positively stated rules visibly posted' },
            { id: 'noise', label: 'Noise Level', desc: 'Appropriate volume management and signal systems' },
            { id: 'seating', label: 'Seating Arrangement', desc: 'Strategic seating that minimizes triggers' },
            { id: 'materials', label: 'Materials Access', desc: 'Students can access needed materials independently' },
            { id: 'transitions', label: 'Transition Cues', desc: 'Clear signals and routines for activity transitions' },
            { id: 'ratio', label: 'Positive:Corrective Ratio', desc: 'Aim for 4:1 positive to corrective interactions' },
        ];
        const [ratings, setRatings] = useState({});
        const [aiRecs, setAiRecs] = useState(null);
        const [loading, setLoading] = useState(false);

        const total = useMemo(() => Object.values(ratings).reduce((s, v) => s + v, 0), [ratings]);
        const maxScore = items.length * 5;
        const pct = maxScore > 0 ? Math.round((total / maxScore) * 100) : 0;
        const grade = pct >= 80 ? { label: 'Strong', color: '#22c55e', bg: '#f0fdf4' } :
            pct >= 50 ? { label: 'Developing', color: '#f59e0b', bg: '#fefce8' } :
                { label: 'Needs Improvement', color: '#ef4444', bg: '#fef2f2' };

        const handleRecommend = async () => {
            if (!callGemini) return;
            setLoading(true);
            try {
                const lowItems = items.filter(it => (ratings[it.id] || 0) <= 2).map(it => it.label).join(', ');
                const prompt = `You are a behavior specialist reviewing a classroom environment audit.
${RESTORATIVE_PREAMBLE}

Total score: ${total}/${maxScore} (${pct}%)
Low-scoring areas: ${lowItems || 'None'}
Ratings: ${items.map(it => `${it.label}: ${ratings[it.id] || 0}/5`).join(', ')}

Provide improvement recommendations and return ONLY valid JSON:
{
  "summary": "1-2 sentence overall assessment",
  "recommendations": [
    { "area": "area name", "action": "specific actionable recommendation", "priority": "high/medium/low" }
  ]
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setAiRecs(parsed);
                if (addToast) addToast('Recommendations ready ✨', 'success');
            } catch (err) {
                warnLog('Audit recs failed:', err);
                if (addToast) addToast('Failed — try again', 'error');
            } finally { setLoading(false); }
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4' }, '🏫 ' + (t('behavior_lens.audit.title') || 'Classroom Environment Audit')),
                h('div', { className: 'space-y-3' },
                    items.map(item =>
                        h('div', { key: item.id, className: 'flex items-center justify-between gap-3' },
                            h('div', { className: 'flex-1 min-w-0' },
                                h('div', { className: 'text-sm font-bold text-slate-700' }, item.label),
                                h('div', { className: 'text-[10px] text-slate-400' }, item.desc)
                            ),
                            h('div', { className: 'flex gap-0.5 shrink-0' },
                                [1, 2, 3, 4, 5].map(v =>
                                    h('button', {
                                        key: v,
                                        onClick: () => setRatings(prev => ({ ...prev, [item.id]: prev[item.id] === v ? 0 : v })),
                                        className: `w-7 h-7 rounded-md text-xs font-bold transition-all ${(ratings[item.id] || 0) >= v ?
                                            (v <= 2 ? 'bg-red-100 text-red-600 border border-red-200' : v <= 3 ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200') :
                                            'bg-slate-50 text-slate-300 border border-slate-100 hover:bg-slate-100'}`
                                    }, v)
                                )
                            )
                        )
                    )
                )
            ),
            // Score card
            Object.keys(ratings).length > 0 && h('div', { className: 'rounded-xl border-2 p-5', style: { background: grade.bg, borderColor: grade.color } },
                h('div', { className: 'flex items-center justify-between' },
                    h('div', null,
                        h('div', { className: 'text-xs font-bold uppercase', style: { color: grade.color } }, 'Overall Score'),
                        h('div', { className: 'text-3xl font-black', style: { color: grade.color } }, `${total}/${maxScore}`)
                    ),
                    h('div', { className: 'text-right' },
                        h('div', { className: 'text-2xl font-black', style: { color: grade.color } }, `${pct}%`),
                        h('div', { className: 'text-xs font-bold px-2 py-0.5 rounded-full text-white mt-1', style: { background: grade.color } }, grade.label)
                    )
                )
            ),
            // AI recommend
            callGemini && h('button', {
                onClick: handleRecommend,
                disabled: loading || Object.keys(ratings).length < 3,
                className: 'w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, loading ? '⏳ Analyzing...' : ('🧠 ' + (t('behavior_lens.audit.recommend') || 'AI Recommend Improvements'))),
            // Recommendations
            aiRecs && h('div', { className: 'bg-blue-50 rounded-xl border border-blue-200 p-5 animate-in slide-in-from-bottom-4 duration-300' },
                aiRecs.summary && h('p', { className: 'text-sm text-blue-700 mb-3 font-medium' }, aiRecs.summary),
                aiRecs.recommendations && h('div', { className: 'space-y-2' },
                    aiRecs.recommendations.map((r, i) =>
                        h('div', { key: i, className: 'flex items-start gap-2 p-3 bg-white rounded-lg border border-blue-100' },
                            h('span', { className: `px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 ${r.priority === 'high' ? 'bg-red-100 text-red-600' : r.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}` }, r.priority),
                            h('div', null,
                                h('span', { className: 'text-sm font-bold text-slate-700' }, r.area + ': '),
                                h('span', { className: 'text-sm text-slate-600' }, r.action)
                            )
                        )
                    )
                )
            )
        );
    };

    // ─── TriangulationCheck ─────────────────────────────────────────────
    // Cross-references ABC data, observation sessions, and AI analysis
    const TriangulationCheck = ({ abcEntries, observationSessions, aiAnalysis, studentName, callGemini, t, addToast }) => {
        const [analysis, setAnalysis] = useState(null);
        const [loading, setLoading] = useState(false);

        const sources = [
            { key: 'abc', label: 'ABC Data', icon: '📋', count: abcEntries.length, color: '#6366f1' },
            { key: 'obs', label: 'Observations', icon: '🔍', count: observationSessions.length, color: '#10b981' },
            { key: 'ai', label: 'AI Analysis', icon: '🧠', count: aiAnalysis ? 1 : 0, color: '#8b5cf6' },
        ];
        const totalSources = sources.filter(s => s.count > 0).length;

        const handleAnalyze = async () => {
            if (!callGemini) return;
            setLoading(true);
            try {
                const abcSummary = abcEntries.slice(0, 10).map((e, i) =>
                    `#${i + 1}: A="${e.antecedent}", B="${e.behavior}", C="${e.consequence}"`
                ).join('\n');
                const obsSummary = observationSessions.slice(0, 5).map((s, i) =>
                    `#${i + 1}: method=${s.method}, count=${s.data?.count || 'N/A'}, duration=${fmtDuration(s.duration)}`
                ).join('\n');
                const aiSummary = aiAnalysis ? `Function: ${aiAnalysis.hypothesizedFunction}, Confidence: ${aiAnalysis.confidence}%, Summary: ${aiAnalysis.summary || ''}` : 'No AI analysis yet';

                const prompt = `You are a BCBA performing data triangulation for a student.
${RESTORATIVE_PREAMBLE}

SOURCE 1 — ABC DATA (${abcEntries.length} entries):
${abcSummary || 'No entries'}

SOURCE 2 — OBSERVATIONS (${observationSessions.length} sessions):
${obsSummary || 'No sessions'}

SOURCE 3 — AI ANALYSIS:
${aiSummary}

Analyze data convergence and return ONLY valid JSON:
{
  "convergentThemes": ["theme 1", "theme 2", "theme 3"],
  "divergentFindings": ["finding 1"],
  "dataGaps": ["gap 1"],
  "confidence": "low/moderate/high",
  "summary": "2-3 sentence synthesis of all data sources",
  "recommendation": "Next steps based on triangulation"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setAnalysis(parsed);
                if (addToast) addToast('Triangulation complete ✨', 'success');
            } catch (err) {
                warnLog('Triangulation failed:', err);
                if (addToast) addToast('Analysis failed', 'error');
            } finally { setLoading(false); }
        };

        const renderList = (icon, title, items, color) => {
            if (!items || items.length === 0) return null;
            return h('div', { className: 'mb-3' },
                h('h4', { className: 'text-xs font-bold uppercase mb-1', style: { color } }, icon + ' ' + title),
                h('ul', { className: 'space-y-1' },
                    items.map((item, i) => h('li', { key: i, className: 'text-sm text-slate-700 flex items-start gap-2' },
                        h('span', { style: { color }, className: 'mt-0.5 shrink-0' }, '•'), item
                    ))
                )
            );
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // Sources overview
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4' }, '🔺 ' + (t('behavior_lens.triangulation.title') || 'Data Triangulation')),
                h('div', { className: 'grid grid-cols-3 gap-3' },
                    sources.map(s =>
                        h('div', { key: s.key, className: 'text-center p-3 rounded-xl border', style: { borderColor: s.count > 0 ? s.color : '#e2e8f0', background: s.count > 0 ? s.color + '08' : '#f8fafc' } },
                            h('div', { className: 'text-2xl mb-1' }, s.icon),
                            h('div', { className: 'text-xs font-bold', style: { color: s.count > 0 ? s.color : '#94a3b8' } }, s.label),
                            h('div', { className: 'text-lg font-black', style: { color: s.count > 0 ? s.color : '#cbd5e1' } }, s.count)
                        )
                    )
                ),
                h('div', { className: 'mt-3 text-center text-xs text-slate-500' },
                    `${totalSources}/3 data sources available`
                )
            ),
            // Analyze button
            callGemini && h('button', {
                onClick: handleAnalyze,
                disabled: loading || totalSources < 1,
                className: 'w-full py-3 bg-gradient-to-r from-zinc-600 to-zinc-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, loading ? '⏳ Analyzing...' : ('🧠 ' + (t('behavior_lens.triangulation.analyze') || 'Analyze Data Convergence'))),
            // Results
            analysis && h('div', { className: 'bg-zinc-50 rounded-xl border border-zinc-200 p-5 animate-in slide-in-from-bottom-4 duration-300 space-y-2' },
                analysis.summary && h('p', { className: 'text-sm text-zinc-700 font-medium bg-white p-3 rounded-lg border border-zinc-100 mb-3' }, analysis.summary),
                analysis.confidence && h('div', { className: 'mb-3' },
                    h('span', { className: `px-2 py-0.5 rounded-full text-xs font-bold ${analysis.confidence === 'high' ? 'bg-emerald-100 text-emerald-700' : analysis.confidence === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}` }, `Confidence: ${analysis.confidence}`)
                ),
                renderList('✅', 'Convergent Themes', analysis.convergentThemes, '#22c55e'),
                renderList('⚠️', 'Divergent Findings', analysis.divergentFindings, '#f59e0b'),
                renderList('❓', 'Data Gaps', analysis.dataGaps, '#ef4444'),
                analysis.recommendation && h('div', { className: 'mt-3 p-3 bg-indigo-50 rounded-lg border border-indigo-200' },
                    h('div', { className: 'text-xs font-bold text-indigo-700 mb-1' }, '🎯 Next Steps'),
                    h('p', { className: 'text-sm text-indigo-600' }, analysis.recommendation)
                )
            )
        );
    };

    // ─── ImpactCalculator ───────────────────────────────────────────────
    // Lost instructional time quantifier
    const ImpactCalculator = ({ abcEntries, studentName, callGemini, t, addToast }) => {
        const [frequency, setFrequency] = useState('');
        const [avgDuration, setAvgDuration] = useState('');
        const [schoolDays, setSchoolDays] = useState('5');
        const [costPerPupil, setCostPerPupil] = useState('15000');
        const [aiInsight, setAiInsight] = useState(null);
        const [loading, setLoading] = useState(false);

        const freq = parseFloat(frequency) || 0;
        const dur = parseFloat(avgDuration) || 0;
        const days = parseInt(schoolDays) || 5;
        const lostPerDay = freq * dur;
        const lostPerWeek = lostPerDay * days;
        const lostPerMonth = lostPerWeek * 4;
        const lostPerYear = lostPerWeek * 36;
        const costPerMinute = (parseFloat(costPerPupil) || 15000) / (180 * 6.5 * 60);
        const annualCost = lostPerYear * costPerMinute;

        const handleInterpret = async () => {
            if (!callGemini) return;
            setLoading(true);
            try {
                const prompt = `You are a school psychologist analyzing the impact of a student's behavior on instructional time.
${RESTORATIVE_PREAMBLE}

Behavior frequency: ${freq} per day
Average episode duration: ${dur} minutes
Lost instructional time: ${lostPerDay.toFixed(1)} min/day, ${lostPerWeek.toFixed(1)} min/week, ${lostPerYear.toFixed(0)} min/year
Estimated annual cost: $${annualCost.toFixed(2)}

Provide a brief impact interpretation and return ONLY valid JSON:
{
  "severity": "minimal/moderate/significant/high",
  "interpretation": "2-3 sentence interpretation of impact",
  "comparison": "Compare to typical classroom norms",
  "urgency": "Recommended timeline for intervention"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setAiInsight(parsed);
                if (addToast) addToast('Impact analyzed ✨', 'success');
            } catch (err) {
                warnLog('Impact analysis failed:', err);
                if (addToast) addToast('Analysis failed', 'error');
            } finally { setLoading(false); }
        };

        const bars = [
            { label: 'Per Day', value: lostPerDay, max: 60, unit: 'min' },
            { label: 'Per Week', value: lostPerWeek, max: 300, unit: 'min' },
            { label: 'Per Month', value: lostPerMonth, max: 1200, unit: 'min' },
            { label: 'Per Year', value: lostPerYear, max: 10000, unit: 'min' },
        ];

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // Input form
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3' },
                h('h3', { className: 'text-sm font-black text-slate-800' }, '⏱️ ' + (t('behavior_lens.impact.title') || 'Impact Analysis Calculator')),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Incidents per day'),
                        h('input', { type: 'number', value: frequency, onChange: (e) => setFrequency(e.target.value), placeholder: '3', className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5' })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Avg duration (min)'),
                        h('input', { type: 'number', value: avgDuration, onChange: (e) => setAvgDuration(e.target.value), placeholder: '5', className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5' })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'School days/week'),
                        h('input', { type: 'number', value: schoolDays, onChange: (e) => setSchoolDays(e.target.value), className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5' })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Cost per pupil ($/yr)'),
                        h('input', { type: 'number', value: costPerPupil, onChange: (e) => setCostPerPupil(e.target.value), className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5' })
                    )
                )
            ),
            // Results
            (freq > 0 && dur > 0) && h('div', { className: 'bg-yellow-50 rounded-xl border border-yellow-200 p-5' },
                h('h4', { className: 'text-xs font-bold text-yellow-700 uppercase mb-3' }, '📊 Lost Instructional Time'),
                h('div', { className: 'space-y-2' },
                    bars.map(b =>
                        h('div', { key: b.label, className: 'flex items-center gap-3' },
                            h('span', { className: 'text-xs font-bold text-slate-600 w-20 shrink-0' }, b.label),
                            h('div', { className: 'flex-1 h-5 bg-yellow-100 rounded-full overflow-hidden' },
                                h('div', { className: 'h-full bg-gradient-to-r from-yellow-400 to-red-400 rounded-full transition-all', style: { width: `${Math.min(100, (b.value / b.max) * 100)}%` } })
                            ),
                            h('span', { className: 'text-xs font-black text-yellow-700 w-20 text-right' }, `${b.value.toFixed(0)} ${b.unit}`)
                        )
                    )
                ),
                h('div', { className: 'mt-4 p-3 bg-red-50 rounded-lg border border-red-200 text-center' },
                    h('div', { className: 'text-[10px] font-bold text-red-600 uppercase' }, 'Estimated Annual Cost'),
                    h('div', { className: 'text-2xl font-black text-red-700' }, `$${annualCost.toFixed(2)}`)
                )
            ),
            // AI interpret
            callGemini && freq > 0 && dur > 0 && h('button', {
                onClick: handleInterpret,
                disabled: loading,
                className: 'w-full py-3 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, loading ? '⏳ Analyzing...' : ('🧠 ' + (t('behavior_lens.impact.interpret') || 'AI Interpret Impact'))),
            aiInsight && h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-5 animate-in slide-in-from-bottom-4 duration-300' },
                aiInsight.severity && h('span', { className: `px-2 py-0.5 rounded-full text-xs font-bold ${aiInsight.severity === 'high' || aiInsight.severity === 'severe' ? 'bg-red-100 text-red-700' : aiInsight.severity === 'significant' ? 'bg-orange-100 text-orange-700' : aiInsight.severity === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}` }, aiInsight.severity),
                aiInsight.interpretation && h('p', { className: 'text-sm text-slate-700 mt-2' }, aiInsight.interpretation),
                aiInsight.comparison && h('p', { className: 'text-xs text-slate-500 mt-1 italic' }, '📏 ' + aiInsight.comparison),
                aiInsight.urgency && h('p', { className: 'text-xs text-amber-600 font-bold mt-2' }, '⏰ ' + aiInsight.urgency)
            )
        );
    };

    // ─── CrisisIntervention ─────────────────────────────────────────────
    // 3-tier emergency protocol with AI auto-generation
    const CrisisIntervention = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const tiers = [
            { key: 'prevention', label: 'Prevention', icon: '🛡️', color: '#22c55e', bg: '#f0fdf4' },
            { key: 'deescalation', label: 'De-escalation', icon: '🌊', color: '#3b82f6', bg: '#eff6ff' },
            { key: 'emergency', label: 'Emergency', icon: '🚨', color: '#ef4444', bg: '#fef2f2' },
        ];
        const [plan, setPlan] = useState({
            prevention: { triggers: '', staffActions: '', communication: '' },
            deescalation: { triggers: '', staffActions: '', communication: '' },
            emergency: { triggers: '', staffActions: '', communication: '' },
        });
        const [contacts, setContacts] = useState('');
        const [drafting, setDrafting] = useState(false);

        const handleDraft = async () => {
            if (!callGemini) return;
            setDrafting(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const prompt = `You are a crisis intervention specialist creating a safety plan for a student.
${RESTORATIVE_PREAMBLE}

Hypothesized function: ${funcStr}
${aiAnalysis?.summary ? 'Analysis: ' + aiAnalysis.summary : ''}
ABC entries: ${abcEntries.length}

Generate a 3-tier crisis intervention plan and return ONLY valid JSON:
{
  "prevention": {
    "triggers": "known triggers and early warning signs",
    "staffActions": "proactive strategies to prevent escalation",
    "communication": "how to communicate with student and team"
  },
  "deescalation": {
    "triggers": "signs that de-escalation is needed",
    "staffActions": "specific de-escalation techniques",
    "communication": "scripts and communication approach"
  },
  "emergency": {
    "triggers": "when to activate emergency protocol",
    "staffActions": "immediate safety steps",
    "communication": "who to notify and how"
  },
  "emergencyContacts": "list of emergency contacts and roles"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setPlan({ prevention: parsed.prevention || {}, deescalation: parsed.deescalation || {}, emergency: parsed.emergency || {} });
                if (parsed.emergencyContacts) setContacts(parsed.emergencyContacts);
                if (addToast) addToast('Crisis plan drafted ✨', 'success');
            } catch (err) {
                warnLog('Crisis plan failed:', err);
                if (addToast) addToast('Drafting failed', 'error');
            } finally { setDrafting(false); }
        };

        const updateField = (tier, field, val) => {
            setPlan(prev => ({ ...prev, [tier]: { ...prev[tier], [field]: val } }));
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // AI draft
            callGemini && h('button', {
                onClick: handleDraft,
                disabled: drafting,
                className: 'w-full py-3 bg-gradient-to-r from-stone-600 to-stone-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, drafting ? '⏳ Drafting...' : ('🧠 ' + (t('behavior_lens.crisis.draft') || 'AI Draft Crisis Plan'))),
            // Title
            h('div', { className: 'bg-white rounded-xl border-2 border-red-200 p-5 shadow-sm print:border-black' },
                h('div', { className: 'text-center border-b border-slate-200 pb-3 mb-4' },
                    h('h2', { className: 'text-lg font-black text-slate-800' }, '🚨 ' + (t('behavior_lens.crisis.title') || 'Crisis Intervention Plan')),
                    h('p', { className: 'text-xs text-slate-500 mt-1' }, `Student: ${studentName || '___'}`)
                ),
                // Tiers
                h('div', { className: 'space-y-4' },
                    tiers.map(tier =>
                        h('div', { key: tier.key, className: 'rounded-xl p-4 border-2', style: { background: tier.bg, borderColor: tier.color } },
                            h('h3', { className: 'font-black text-sm mb-3 flex items-center gap-2', style: { color: tier.color } }, tier.icon, ' Tier: ', tier.label),
                            h('div', { className: 'space-y-2' },
                                ['triggers', 'staffActions', 'communication'].map(field =>
                                    h('div', { key: field },
                                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-0.5' },
                                            field === 'triggers' ? '⚡ Triggers / Signs' : field === 'staffActions' ? '👤 Staff Actions' : '📢 Communication'
                                        ),
                                        h('textarea', {
                                            value: plan[tier.key]?.[field] || '',
                                            onChange: (e) => updateField(tier.key, field, e.target.value),
                                            rows: 2,
                                            className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-transparent focus:border-slate-300 outline-none resize-none'
                                        })
                                    )
                                )
                            )
                        )
                    )
                ),
                // Emergency contacts
                h('div', { className: 'mt-4 p-4 bg-red-50 rounded-xl border border-red-200' },
                    h('label', { className: 'text-[10px] font-bold text-red-600 uppercase block mb-1' }, '📞 Emergency Contacts'),
                    h('textarea', { value: contacts, onChange: (e) => setContacts(e.target.value), rows: 2, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-red-100 outline-none resize-none' })
                )
            ),
            // Print
            h('button', {
                onClick: () => window.print(),
                className: 'w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all print:hidden'
            }, '🖨️ Print Crisis Plan')
        );
    };

    // ─── TrafficLightVisual ─────────────────────────────────────────────
    // Student-facing red/yellow/green behavior zone poster
    const TrafficLightVisual = ({ studentName, aiAnalysis, callGemini, t, addToast }) => {
        const [zones, setZones] = useState({
            green: { title: 'Ready to Learn', items: 'Sitting in seat; Eyes on teacher; Raising hand; Following directions' },
            yellow: { title: 'Slow Down', items: 'Feeling frustrated; Getting distracted; Talking out of turn; Need a break' },
            red: { title: 'Stop & Get Help', items: 'Feeling very upset; Wanting to leave; Cannot focus; Need adult support' },
        });
        const [generating, setGenerating] = useState(false);

        const handleGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const prompt = `You are a behavior specialist creating a student-facing traffic light behavior visual.
${RESTORATIVE_PREAMBLE}

Hypothesized function: ${funcStr}
${aiAnalysis?.summary ? 'Analysis: ' + aiAnalysis.summary : ''}

Create student-friendly language and return ONLY valid JSON:
{
  "green": { "title": "positive zone title", "items": "expected behaviors separated by semicolons (4 items)" },
  "yellow": { "title": "caution zone title", "items": "warning signs separated by semicolons (4 items)" },
  "red": { "title": "stop zone title", "items": "moments when I feel overwhelmed and need support, separated by semicolons (4 items)" }
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setZones(parsed);
                if (addToast) addToast('Traffic light generated ✨', 'success');
            } catch (err) {
                warnLog('Traffic light failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        const zoneConfig = [
            { key: 'green', emoji: '🟢', color: '#22c55e', bg: '#f0fdf4', border: '#86efac' },
            { key: 'yellow', emoji: '🟡', color: '#eab308', bg: '#fefce8', border: '#fde68a' },
            { key: 'red', emoji: '🔴', color: '#ef4444', bg: '#fef2f2', border: '#fca5a5' },
        ];

        return h('div', { className: 'max-w-md mx-auto space-y-4' },
            // AI generate
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating,
                className: 'w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, generating ? '⏳ Generating...' : ('🧠 ' + (t('behavior_lens.traffic.generate') || 'AI Generate Expectations'))),
            // Traffic light poster
            h('div', { id: 'traffic-light-printable', className: 'bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-lg print:shadow-none' },
                h('h2', { className: 'text-center text-lg font-black text-slate-800 mb-1' }, '🚦 My Self-Regulation Plan'),
                studentName && h('p', { className: 'text-center text-xs text-slate-500 mb-4' }, `For: ${studentName}`),
                h('div', { className: 'space-y-3' },
                    zoneConfig.map(z => {
                        const zone = zones[z.key] || {};
                        const itemList = (zone.items || '').split(';').map(s => s.trim()).filter(Boolean);
                        return h('div', { key: z.key, className: 'rounded-xl p-4 border-2', style: { background: z.bg, borderColor: z.border } },
                            h('div', { className: 'flex items-center gap-2 mb-2' },
                                h('span', { className: 'text-2xl' }, z.emoji),
                                h('input', {
                                    value: zone.title || '',
                                    onChange: (e) => setZones(prev => ({ ...prev, [z.key]: { ...prev[z.key], title: e.target.value } })),
                                    className: 'flex-1 bg-transparent font-black text-lg outline-none',
                                    style: { color: z.color }
                                })
                            ),
                            h('div', { className: 'space-y-1 ml-9' },
                                itemList.map((item, i) =>
                                    h('div', { key: i, className: 'flex items-center gap-2 text-sm', style: { color: z.color } },
                                        h('span', { className: 'text-xs' }, '•'), item
                                    )
                                )
                            ),
                            h('textarea', {
                                value: zone.items || '',
                                onChange: (e) => setZones(prev => ({ ...prev, [z.key]: { ...prev[z.key], items: e.target.value } })),
                                placeholder: 'Items separated by semicolons',
                                rows: 1,
                                className: 'w-full mt-2 bg-white/50 rounded-lg px-3 py-1.5 text-xs border border-transparent focus:border-slate-200 outline-none resize-none print:hidden'
                            })
                        );
                    })
                )
            ),
            // Print
            h('button', {
                onClick: () => window.print(),
                className: 'w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all print:hidden'
            }, '🖨️ Print Poster')
        );
    };

    // ─── DataSheetGenerator ─────────────────────────────────────────────
    // Printable data collection sheets for frequency, duration, ABC, latency
    const DataSheetGenerator = ({ studentName, t, addToast }) => {
        const [method, setMethod] = useState('frequency');
        const [intervals, setIntervals] = useState('6');
        const [dateRange, setDateRange] = useState('5');
        const [behaviorLabel, setBehaviorLabel] = useState('');

        const methods = [
            { id: 'frequency', label: 'Frequency Count', icon: '🔢' },
            { id: 'duration', label: 'Duration Log', icon: '⏱️' },
            { id: 'abc', label: 'ABC Narrative', icon: '📋' },
            { id: 'latency', label: 'Latency Recording', icon: '⏳' },
        ];

        const numIntervals = parseInt(intervals) || 6;
        const numDays = parseInt(dateRange) || 5;

        const renderSheet = () => {
            if (method === 'frequency') {
                return h('table', { className: 'w-full text-xs border-collapse print:text-[9px]' },
                    h('thead', null,
                        h('tr', { className: 'bg-slate-100' },
                            h('th', { className: 'border border-slate-300 px-2 py-1.5 text-left' }, 'Date'),
                            ...Array.from({ length: numIntervals }, (_, i) =>
                                h('th', { key: i, className: 'border border-slate-300 px-2 py-1.5' }, `Period ${i + 1}`)
                            ),
                            h('th', { className: 'border border-slate-300 px-2 py-1.5' }, 'Total')
                        )
                    ),
                    h('tbody', null,
                        Array.from({ length: numDays }, (_, d) =>
                            h('tr', { key: d },
                                h('td', { className: 'border border-slate-300 px-2 py-3' }, '___/___/___'),
                                ...Array.from({ length: numIntervals }, (_, i) =>
                                    h('td', { key: i, className: 'border border-slate-300 px-2 py-3 text-center' })
                                ),
                                h('td', { className: 'border border-slate-300 px-2 py-3 text-center font-bold' })
                            )
                        )
                    )
                );
            }
            if (method === 'duration') {
                return h('table', { className: 'w-full text-xs border-collapse print:text-[9px]' },
                    h('thead', null,
                        h('tr', { className: 'bg-slate-100' },
                            h('th', { className: 'border border-slate-300 px-2 py-1.5 text-left' }, 'Date'),
                            h('th', { className: 'border border-slate-300 px-2 py-1.5' }, 'Start Time'),
                            h('th', { className: 'border border-slate-300 px-2 py-1.5' }, 'End Time'),
                            h('th', { className: 'border border-slate-300 px-2 py-1.5' }, 'Duration'),
                            h('th', { className: 'border border-slate-300 px-2 py-1.5 text-left' }, 'Notes')
                        )
                    ),
                    h('tbody', null,
                        Array.from({ length: numDays * 3 }, (_, d) =>
                            h('tr', { key: d },
                                h('td', { className: 'border border-slate-300 px-2 py-3' }),
                                h('td', { className: 'border border-slate-300 px-2 py-3' }),
                                h('td', { className: 'border border-slate-300 px-2 py-3' }),
                                h('td', { className: 'border border-slate-300 px-2 py-3' }),
                                h('td', { className: 'border border-slate-300 px-2 py-3' })
                            )
                        )
                    )
                );
            }
            if (method === 'abc') {
                return h('div', { className: 'space-y-3' },
                    Array.from({ length: numDays }, (_, d) =>
                        h('div', { key: d, className: 'border border-slate-300 rounded-lg p-3 print:break-inside-avoid' },
                            h('div', { className: 'flex gap-4 text-xs mb-2' },
                                h('span', null, 'Date: ____________'),
                                h('span', null, 'Time: ____________'),
                                h('span', null, 'Observer: ____________')
                            ),
                            h('div', { className: 'grid grid-cols-3 gap-2' },
                                ['Antecedent', 'Behavior', 'Consequence'].map(label =>
                                    h('div', { key: label },
                                        h('div', { className: 'text-[10px] font-bold text-slate-600 uppercase mb-0.5' }, label),
                                        h('div', { className: 'border border-slate-200 rounded h-16' })
                                    )
                                )
                            )
                        )
                    )
                );
            }
            // latency
            return h('table', { className: 'w-full text-xs border-collapse print:text-[9px]' },
                h('thead', null,
                    h('tr', { className: 'bg-slate-100' },
                        h('th', { className: 'border border-slate-300 px-2 py-1.5 text-left' }, 'Date'),
                        h('th', { className: 'border border-slate-300 px-2 py-1.5' }, 'Cue Given'),
                        h('th', { className: 'border border-slate-300 px-2 py-1.5' }, 'Response Start'),
                        h('th', { className: 'border border-slate-300 px-2 py-1.5' }, 'Latency (sec)'),
                        h('th', { className: 'border border-slate-300 px-2 py-1.5 text-left' }, 'Notes')
                    )
                ),
                h('tbody', null,
                    Array.from({ length: numDays * 2 }, (_, d) =>
                        h('tr', { key: d },
                            h('td', { className: 'border border-slate-300 px-2 py-3' }),
                            h('td', { className: 'border border-slate-300 px-2 py-3' }),
                            h('td', { className: 'border border-slate-300 px-2 py-3' }),
                            h('td', { className: 'border border-slate-300 px-2 py-3' }),
                            h('td', { className: 'border border-slate-300 px-2 py-3' })
                        )
                    )
                )
            );
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // Config
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3 print:hidden' },
                h('h3', { className: 'text-sm font-black text-slate-800' }, '📋 ' + (t('behavior_lens.datasheet.title') || 'Data Sheet Generator')),
                h('div', { className: 'grid grid-cols-2 gap-3' },
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Collection Method'),
                        h('select', { value: method, onChange: (e) => setMethod(e.target.value), className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5' },
                            methods.map(m => h('option', { key: m.id, value: m.id }, `${m.icon} ${m.label}`))
                        )
                    ),
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Behavior Label'),
                        h('input', { value: behaviorLabel, onChange: (e) => setBehaviorLabel(e.target.value), placeholder: 'e.g., Off-task behavior', className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5' })
                    ),
                    method === 'frequency' && h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Periods per day'),
                        h('input', { type: 'number', value: intervals, onChange: (e) => setIntervals(e.target.value), min: 2, max: 12, className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5' })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Rows / days'),
                        h('input', { type: 'number', value: dateRange, onChange: (e) => setDateRange(e.target.value), min: 1, max: 20, className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mt-0.5' })
                    )
                )
            ),
            // Printable sheet
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm print:shadow-none print:border-black' },
                h('div', { className: 'text-center mb-3 border-b pb-2' },
                    h('h2', { className: 'text-sm font-black text-slate-800' }, `${methods.find(m => m.id === method)?.icon || ''} ${methods.find(m => m.id === method)?.label || ''} Data Sheet`),
                    h('p', { className: 'text-[10px] text-slate-500' }, `Student: ${studentName || '___________'}  |  Behavior: ${behaviorLabel || '___________'}  |  Observer: ___________`)
                ),
                renderSheet()
            ),
            h('button', { onClick: () => window.print(), className: 'w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all print:hidden' }, '🖨️ Print Data Sheet')
        );
    };

    // ─── HomeNoteGenerator ──────────────────────────────────────────────
    // AI-drafted parent communication with tone selector
    const HomeNoteGenerator = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const [tone, setTone] = useState('friendly');
        const [note, setNote] = useState('');
        const [generating, setGenerating] = useState(false);

        const tones = [
            { id: 'friendly', label: '😊 Friendly', desc: 'Warm, encouraging tone' },
            { id: 'formal', label: '📄 Formal', desc: 'Professional, structured' },
            { id: 'brief', label: '⚡ Brief', desc: 'Concise, to the point' },
        ];

        const handleGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const recentEntries = abcEntries.slice(-5).map(e =>
                    `B: ${e.behavior}, A: ${e.antecedent}, C: ${e.consequence}`
                ).join('\n');
                const prompt = `You are a special education teacher writing a home note to a parent/guardian.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'Student'}
Tone: ${tone}
Hypothesized function: ${funcStr}
Recent behavior data:
${recentEntries || 'No recent data'}

Write a home note using the positive sandwich approach (positive → concern → positive).
Use ${tone === 'friendly' ? 'warm, encouraging' : tone === 'formal' ? 'professional, structured' : 'brief, concise'} language.
Do NOT use the student codename in the note — use "your child" or "your student" instead.
Return the note as plain text (no JSON). Include date placeholder and signature line.`;
                const result = await callGemini(prompt, true);
                setNote(result);
                if (addToast) addToast('Home note generated ✨', 'success');
            } catch (err) {
                warnLog('Home note failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            // Tone selector
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '📝 ' + (t('behavior_lens.homenote.title') || 'Home Note Generator')),
                h('div', { className: 'grid grid-cols-3 gap-2' },
                    tones.map(tn =>
                        h('button', {
                            key: tn.id,
                            onClick: () => setTone(tn.id),
                            className: `p-3 rounded-xl border-2 text-center transition-all ${tone === tn.id ? 'border-indigo-400 bg-indigo-50' : 'border-slate-100 hover:border-slate-200'}`
                        },
                            h('div', { className: 'text-lg mb-1' }, tn.label.split(' ')[0]),
                            h('div', { className: 'text-[10px] text-slate-500' }, tn.desc)
                        )
                    )
                )
            ),
            // Generate
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating,
                className: 'w-full py-3 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, generating ? '⏳ Generating...' : ('🧠 ' + (t('behavior_lens.homenote.generate') || 'AI Generate Home Note'))),
            // Note display
            note && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm print:shadow-none' },
                h('textarea', {
                    value: note,
                    onChange: (e) => setNote(e.target.value),
                    rows: 12,
                    className: 'w-full text-sm text-slate-700 leading-relaxed resize-none outline-none print:border-none'
                }),
                h('div', { className: 'flex gap-2 mt-3 print:hidden' },
                    h('button', {
                        onClick: () => { navigator.clipboard.writeText(note); if (addToast) addToast('Copied!', 'success'); },
                        className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200'
                    }, '📋 Copy'),
                    h('button', { onClick: () => window.print(), className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200' }, '🖨️ Print')
                )
            )
        );
    };

    // ─── FidelityChecklist ──────────────────────────────────────────────
    // Daily BIP adherence tracking with AI-generated items
    const FidelityChecklist = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const [items, setItems] = useState([]);
        const [checks, setChecks] = useState({});
        const [generating, setGenerating] = useState(false);
        const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

        const totalItems = items.length;
        const checkedCount = Object.values(checks).filter(Boolean).length;
        const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

        const handleGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const prompt = `You are a BCBA creating a teacher fidelity checklist for BIP implementation.
${RESTORATIVE_PREAMBLE}

Student hypothesized function: ${funcStr}
${aiAnalysis?.summary ? 'Analysis: ' + aiAnalysis.summary : ''}
ABC entries: ${abcEntries.length}

Generate a daily fidelity checklist (5-8 items) and return ONLY valid JSON:
{
  "items": [
    "Provided 5:1 positive to corrective ratio throughout the day",
    "Used visual schedule and referenced it during transitions",
    "Item 3...",
    "Item 4..."
  ]
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setItems(parsed.items || []);
                setChecks({});
                if (addToast) addToast('Checklist generated ✨', 'success');
            } catch (err) {
                warnLog('Fidelity gen failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            // AI generate
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating,
                className: 'w-full py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, generating ? '⏳ Generating...' : ('🧠 ' + (t('behavior_lens.fidelity.generate') || 'AI Generate Checklist from BIP'))),
            // Checklist
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm print:shadow-none' },
                h('div', { className: 'flex items-center justify-between mb-4 border-b pb-3' },
                    h('h3', { className: 'text-sm font-black text-slate-800' }, '✅ ' + (t('behavior_lens.fidelity.title') || 'Teacher Fidelity Checklist')),
                    h('input', { type: 'date', value: date, onChange: (e) => setDate(e.target.value), className: 'text-xs border border-slate-200 rounded-lg px-2 py-1 print:border-black' })
                ),
                studentName && h('p', { className: 'text-xs text-slate-500 mb-3' }, `Student: ${studentName}`),
                items.length > 0 ? h('div', { className: 'space-y-2' },
                    items.map((item, i) =>
                        h('label', { key: i, className: `flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${checks[i] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-slate-200'}` },
                            h('input', {
                                type: 'checkbox',
                                checked: !!checks[i],
                                onChange: () => setChecks(prev => ({ ...prev, [i]: !prev[i] })),
                                className: 'mt-0.5 w-4 h-4 rounded accent-emerald-500'
                            }),
                            h('span', { className: `text-sm ${checks[i] ? 'text-emerald-700 line-through' : 'text-slate-700'}` }, item)
                        )
                    )
                ) : h('p', { className: 'text-xs text-slate-400 text-center py-6' }, 'Click "AI Generate Checklist" to create items based on the BIP'),
                // Score
                items.length > 0 && h('div', { className: 'mt-4 p-3 rounded-lg border text-center', style: { background: pct >= 80 ? '#f0fdf4' : pct >= 50 ? '#fefce8' : '#fef2f2', borderColor: pct >= 80 ? '#86efac' : pct >= 50 ? '#fde68a' : '#fca5a5' } },
                    h('div', { className: 'text-xs font-bold uppercase', style: { color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626' } }, 'Fidelity Score'),
                    h('div', { className: 'text-2xl font-black', style: { color: pct >= 80 ? '#16a34a' : pct >= 50 ? '#ca8a04' : '#dc2626' } }, `${checkedCount}/${totalItems} (${pct}%)`)
                )
            )
        );
    };

    // ─── FeasibilityCheck ───────────────────────────────────────────────
    // 5-question contextual fit assessment (Horner et al.)
    const FeasibilityCheck = ({ studentName, callGemini, t, addToast }) => {
        const questions = [
            { id: 'skill', label: 'Staff Skill', desc: 'Do staff have the skills to implement this plan consistently?' },
            { id: 'resources', label: 'Resource Availability', desc: 'Are the needed materials, space, and time available?' },
            { id: 'values', label: 'Value Alignment', desc: 'Does the plan align with the school\'s values and culture?' },
            { id: 'time', label: 'Time Commitment', desc: 'Is the required time investment realistic given current demands?' },
            { id: 'admin', label: 'Administrative Support', desc: 'Is there leadership buy-in and administrative support?' },
        ];
        const [ratings, setRatings] = useState({});
        const [aiRecs, setAiRecs] = useState(null);
        const [loading, setLoading] = useState(false);

        const total = useMemo(() => Object.values(ratings).reduce((s, v) => s + v, 0), [ratings]);
        const maxScore = questions.length * 5;
        const pct = maxScore > 0 ? Math.round((total / maxScore) * 100) : 0;
        const verdict = pct >= 80 ? { label: 'Feasible', color: '#22c55e', bg: '#f0fdf4' } :
            pct >= 50 ? { label: 'Needs Modification', color: '#f59e0b', bg: '#fefce8' } :
                { label: 'Not Feasible', color: '#ef4444', bg: '#fef2f2' };

        const handleRecommend = async () => {
            if (!callGemini) return;
            setLoading(true);
            try {
                const lowItems = questions.filter(q => (ratings[q.id] || 0) <= 2).map(q => q.label).join(', ');
                const prompt = `You are a behavior consultant reviewing a BIP feasibility assessment.
${RESTORATIVE_PREAMBLE}

Total: ${total}/${maxScore} (${pct}%)
Low areas: ${lowItems || 'None'}
Ratings: ${questions.map(q => `${q.label}: ${ratings[q.id] || 0}/5`).join(', ')}

Provide recommendations to improve feasibility. Return ONLY valid JSON:
{
  "verdict": "${verdict.label}",
  "summary": "1-2 sentence assessment",
  "recommendations": ["rec 1", "rec 2", "rec 3"]
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setAiRecs(parsed);
                if (addToast) addToast('Assessment complete ✨', 'success');
            } catch (err) {
                warnLog('Feasibility failed:', err);
                if (addToast) addToast('Failed', 'error');
            } finally { setLoading(false); }
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-1' }, '⚖️ ' + (t('behavior_lens.feasibility.title') || 'Contextual Fit Assessment')),
                h('p', { className: 'text-[10px] text-slate-400 mb-4' }, 'Based on Horner, Salentine, & Albin (2003)'),
                h('div', { className: 'space-y-3' },
                    questions.map(q =>
                        h('div', { key: q.id },
                            h('div', { className: 'flex items-center justify-between gap-3' },
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('div', { className: 'text-sm font-bold text-slate-700' }, q.label),
                                    h('div', { className: 'text-[10px] text-slate-400' }, q.desc)
                                ),
                                h('div', { className: 'flex gap-0.5 shrink-0' },
                                    [1, 2, 3, 4, 5].map(v =>
                                        h('button', {
                                            key: v,
                                            onClick: () => setRatings(prev => ({ ...prev, [q.id]: prev[q.id] === v ? 0 : v })),
                                            className: `w-7 h-7 rounded-md text-xs font-bold transition-all ${(ratings[q.id] || 0) >= v ?
                                                (v <= 2 ? 'bg-red-100 text-red-600 border border-red-200' : v <= 3 ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200') :
                                                'bg-slate-50 text-slate-300 border border-slate-100 hover:bg-slate-100'}`
                                        }, v)
                                    )
                                )
                            )
                        )
                    )
                )
            ),
            // Score
            Object.keys(ratings).length > 0 && h('div', { className: 'rounded-xl border-2 p-4 text-center', style: { background: verdict.bg, borderColor: verdict.color } },
                h('div', { className: 'text-xs font-bold uppercase', style: { color: verdict.color } }, 'Contextual Fit'),
                h('div', { className: 'text-3xl font-black', style: { color: verdict.color } }, `${total}/${maxScore}`),
                h('div', { className: 'text-xs font-bold px-2 py-0.5 rounded-full text-white inline-block mt-1', style: { background: verdict.color } }, verdict.label)
            ),
            // AI recommend
            callGemini && h('button', {
                onClick: handleRecommend,
                disabled: loading || Object.keys(ratings).length < 3,
                className: 'w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, loading ? '⏳ Analyzing...' : ('🧠 ' + (t('behavior_lens.feasibility.recommend') || 'AI Recommendations'))),
            aiRecs && h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-5 animate-in slide-in-from-bottom-4 duration-300' },
                aiRecs.summary && h('p', { className: 'text-sm text-amber-700 mb-3 font-medium' }, aiRecs.summary),
                aiRecs.recommendations && h('ul', { className: 'space-y-1.5' },
                    aiRecs.recommendations.map((r, i) =>
                        h('li', { key: i, className: 'text-sm text-slate-700 flex items-start gap-2' },
                            h('span', { className: 'text-amber-500 mt-0.5 shrink-0' }, '→'), r
                        )
                    )
                )
            )
        );
    };

    // ─── GasRubric ──────────────────────────────────────────────────────
    // Goal Attainment Scaling: 5-level rubric (-2 to +2)
    const GasRubric = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const levels = [
            { score: -2, label: 'Much less than expected', color: '#ef4444' },
            { score: -1, label: 'Less than expected', color: '#f59e0b' },
            { score: 0, label: 'Expected level', color: '#3b82f6' },
            { score: 1, label: 'More than expected', color: '#22c55e' },
            { score: 2, label: 'Much more than expected', color: '#10b981' },
        ];
        const [goalText, setGoalText] = useState('');
        const [descriptors, setDescriptors] = useState({});
        const [generating, setGenerating] = useState(false);

        const handleGenerate = async () => {
            if (!callGemini || !goalText.trim()) return;
            setGenerating(true);
            try {
                const prompt = `You are a BCBA creating a Goal Attainment Scale (GAS) rubric.
${RESTORATIVE_PREAMBLE}

Goal: ${goalText}
${aiAnalysis?.hypothesizedFunction ? 'Function: ' + aiAnalysis.hypothesizedFunction : ''}

Generate descriptors for each GAS level and return ONLY valid JSON:
{
  "-2": "descriptor for much less than expected outcome",
  "-1": "descriptor for less than expected outcome",
  "0": "descriptor for expected outcome (the goal)",
  "1": "descriptor for more than expected outcome",
  "2": "descriptor for much more than expected outcome"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setDescriptors(parsed);
                if (addToast) addToast('GAS rubric generated ✨', 'success');
            } catch (err) {
                warnLog('GAS gen failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            // Goal input
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm print:hidden' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-2' }, '📐 ' + (t('behavior_lens.gas.title') || 'Goal Attainment Scale')),
                h('textarea', {
                    value: goalText,
                    onChange: (e) => setGoalText(e.target.value),
                    placeholder: 'Enter the behavioral goal to scale (e.g., "Student will remain in seat during independent work for 15 minutes")',
                    rows: 2,
                    className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none'
                })
            ),
            // Generate
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating || !goalText.trim(),
                className: 'w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all print:hidden'
            }, generating ? '⏳ Generating...' : ('🧠 ' + (t('behavior_lens.gas.generate') || 'AI Generate GAS Descriptors'))),
            // Rubric table
            (Object.keys(descriptors).length > 0 || goalText) && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm print:shadow-none print:border-black' },
                h('div', { className: 'text-center mb-3 border-b pb-2' },
                    h('h2', { className: 'text-sm font-black text-slate-800' }, '📐 Goal Attainment Scale'),
                    h('p', { className: 'text-[10px] text-slate-500' }, `Student: ${studentName || '___'}`)
                ),
                goalText && h('div', { className: 'mb-3 p-2 bg-blue-50 rounded-lg' },
                    h('div', { className: 'text-[10px] font-bold text-blue-600 uppercase' }, 'Goal'),
                    h('p', { className: 'text-sm text-blue-700' }, goalText)
                ),
                h('table', { className: 'w-full text-xs border-collapse' },
                    h('thead', null,
                        h('tr', null,
                            h('th', { className: 'border border-slate-300 px-3 py-2 text-left w-16' }, 'Score'),
                            h('th', { className: 'border border-slate-300 px-3 py-2 text-left w-40' }, 'Level'),
                            h('th', { className: 'border border-slate-300 px-3 py-2 text-left' }, 'Descriptor')
                        )
                    ),
                    h('tbody', null,
                        levels.map(lv =>
                            h('tr', { key: lv.score },
                                h('td', { className: 'border border-slate-300 px-3 py-2 font-black text-center', style: { color: lv.color } }, lv.score > 0 ? `+${lv.score}` : lv.score),
                                h('td', { className: 'border border-slate-300 px-3 py-2 font-bold', style: { color: lv.color } }, lv.label),
                                h('td', { className: 'border border-slate-300 px-3 py-2' },
                                    h('input', {
                                        value: descriptors[String(lv.score)] || '',
                                        onChange: (e) => setDescriptors(prev => ({ ...prev, [String(lv.score)]: e.target.value })),
                                        className: 'w-full bg-transparent outline-none text-sm',
                                        placeholder: 'Enter descriptor...'
                                    })
                                )
                            )
                        )
                    )
                )
            ),
            h('button', { onClick: () => window.print(), className: 'w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all print:hidden' }, '🖨️ Print GAS Rubric')
        );
    };

    // ─── ABAQuickGuide ──────────────────────────────────────────────────
    // Comprehensive ABA principles reference and staff training tool
    const ABAQuickGuide = ({ t }) => {
        const [activeTab, setActiveTab] = useState('glossary');
        const [searchTerm, setSearchTerm] = useState('');

        const glossary = [
            { term: 'ABC Data', def: 'Antecedent-Behavior-Consequence: A recording method that captures what happens before (A), the behavior itself (B), and what happens after (C).', category: 'Data Collection' },
            { term: 'Antecedent', def: 'What happens immediately before a behavior occurs. Can be a demand, transition, trigger, or environmental event.', category: 'Data Collection' },
            { term: 'Behavior', def: 'An observable and measurable action. Must be described specifically enough that two observers would agree on its occurrence.', category: 'Core Concepts' },
            { term: 'Consequence', def: 'What happens immediately after a behavior occurs. Can reinforce (increase) or punish (decrease) the behavior.', category: 'Data Collection' },
            { term: 'Positive Reinforcement', def: 'ADDING something desirable after a behavior to INCREASE it. Example: giving praise after hand-raising.', category: 'Reinforcement' },
            { term: 'Negative Reinforcement', def: 'REMOVING something aversive after a behavior to INCREASE it. Example: allowing a break after completing work (removing the demand).', category: 'Reinforcement' },
            { term: 'Positive Punishment', def: 'ADDING something aversive after a behavior to DECREASE it. Example: assigning extra work after disruption. Use sparingly.', category: 'Consequences' },
            { term: 'Negative Punishment', def: 'REMOVING something desirable after a behavior to DECREASE it. Example: loss of recess after disruption.', category: 'Consequences' },
            { term: 'Extinction', def: 'Withholding reinforcement for a previously reinforced behavior. May initially cause an "extinction burst" (temporary increase in behavior).', category: 'Consequences' },
            { term: 'Extinction Burst', def: 'Temporary increase in frequency or intensity of a behavior when reinforcement is first withheld. A normal part of extinction — stay consistent!', category: 'Consequences' },
            { term: 'Operational Definition', def: 'A clear, observable, measurable description of a behavior. Example: "Hits peers with open or closed hand" NOT "is aggressive."', category: 'Core Concepts' },
            { term: 'Function of Behavior', def: 'The purpose a behavior serves: Attention, Escape/Avoidance, Access to Tangibles, or Sensory/Automatic reinforcement.', category: 'Core Concepts' },
            { term: 'FBA', def: 'Functional Behavior Assessment: A systematic process to determine WHY a behavior occurs (its function) using data collection and analysis.', category: 'Assessment' },
            { term: 'BIP', def: 'Behavior Intervention Plan: A documented plan based on FBA findings that outlines strategies to address challenging behaviors.', category: 'Assessment' },
            { term: 'Replacement Behavior', def: 'A socially appropriate behavior that serves the same function as the challenging behavior. Must be as efficient or more efficient.', category: 'Intervention' },
            { term: 'Prompt', def: 'An extra cue to help a student perform a behavior. Types: verbal, gestural, visual, model, physical. Fade prompts over time.', category: 'Intervention' },
            { term: 'Prompt Fading', def: 'Gradually reducing the level of help (prompts) to promote independence. Move from most-to-least or least-to-most.', category: 'Intervention' },
            { term: 'Generalization', def: 'The ability to perform a learned behavior in new settings, with new people, or in new situations beyond where it was taught.', category: 'Core Concepts' },
            { term: 'Baseline', def: 'Data collected before intervention begins. Used to measure the starting level of behavior so progress can be compared.', category: 'Data Collection' },
            { term: 'DRA', def: 'Differential Reinforcement of Alternative behavior: Reinforce a specific alternative behavior while withholding reinforcement for the problem behavior.', category: 'Reinforcement' },
            { term: 'DRO', def: 'Differential Reinforcement of Other behavior: Reinforce the ABSENCE of the problem behavior in a set time interval.', category: 'Reinforcement' },
            { term: 'DRI', def: 'Differential Reinforcement of Incompatible behavior: Reinforce a behavior that is physically incompatible with the problem behavior.', category: 'Reinforcement' },
            { term: 'Token Economy', def: 'A system where tokens are earned for desired behaviors and exchanged for backup reinforcers. The Token Board tool implements this.', category: 'Reinforcement' },
            { term: 'Schedule of Reinforcement', def: 'The pattern by which reinforcement is delivered: Fixed Ratio (FR), Variable Ratio (VR), Fixed Interval (FI), Variable Interval (VI).', category: 'Reinforcement' },
            { term: 'Schedule Thinning', def: 'Gradually moving from continuous (every time) to intermittent reinforcement to maintain behavior with less frequent reinforcement.', category: 'Reinforcement' },
        ];

        const scheduleExplainer = [
            { type: 'FR (Fixed Ratio)', desc: 'Reinforce after every N responses', example: 'FR-3: Reward after every 3rd hand raise', when: 'Building consistent new behaviors', icon: '📊' },
            { type: 'VR (Variable Ratio)', desc: 'Reinforce after an average of N responses (random)', example: 'VR-5: Average every 5th, but could be 3rd or 7th', when: 'Maintaining established behaviors (most resistant to extinction)', icon: '🎲' },
            { type: 'FI (Fixed Interval)', desc: 'Reinforce first response after N minutes', example: 'FI-5: First correct behavior after each 5-minute interval', when: 'Time-based behavior monitoring', icon: '⏰' },
            { type: 'VI (Variable Interval)', desc: 'Reinforce first response after ~N minutes (random)', example: 'VI-5: Check at random times averaging every 5 min', when: 'Maintaining steady behavior over time', icon: '🎲⏰' },
            { type: 'CRF (Continuous)', desc: 'Reinforce every single correct response', example: 'Praise every hand raise', when: 'First teaching a new behavior (then thin the schedule)', icon: '💯' },
        ];

        const decisionTree = [
            { q: 'What happens when the student gets attention after the behavior?', yes: 'Behavior INCREASES → Function may be ATTENTION 👀', no: 'Continue...' },
            { q: 'What happens when the student escapes a demand after the behavior?', yes: 'Behavior INCREASES → Function may be ESCAPE 🏃', no: 'Continue...' },
            { q: 'What happens when the student gains access to an item/activity?', yes: 'Behavior INCREASES → Function may be TANGIBLE 🎁', no: 'Continue...' },
            { q: 'Does the behavior happen even when the student is alone?', yes: 'Behavior CONTINUES → Function may be SENSORY 🌀', no: 'Reassess — consider multiple functions' },
        ];

        const commonMistakes = [
            { mistake: 'Accidental Reinforcement', desc: 'Giving attention (even negative!) to a behavior maintained by attention. Remove eye contact, don\'t lecture during the behavior.', fix: 'Planned ignoring for attention-maintained behaviors; redirect without excessive verbal attention.' },
            { mistake: 'Punishment Without Teaching', desc: 'Removing privileges but never teaching what the student SHOULD do instead.', fix: 'Always pair consequences with explicit instruction of the replacement behavior.' },
            { mistake: 'Inconsistency', desc: 'Sometimes enforcing expectations and sometimes ignoring the same behavior.', fix: 'Create a written BIP and ensure ALL staff follow it consistently — use the Fidelity Checklist tool.' },
            { mistake: 'Too-Rapid Schedule Thinning', desc: 'Moving from FR-1 to VR-10 overnight, causing behavior to break down.', fix: 'Thin gradually: FR-1 → FR-2 → FR-3 → VR-3 → VR-5. If behavior drops, go back to previous schedule.' },
            { mistake: 'Vague Behavior Definitions', desc: '"Student is disrespectful" — two observers might not agree on what this means.', fix: 'Use operational definitions: "Student uses profanity directed at peers or staff."' },
            { mistake: 'Ignoring Setting Events', desc: 'Not considering factors like hunger, sleep, medication changes, or home stressors.', fix: 'Track setting events in ABC notes. Look for patterns across environments.' },
        ];

        const categories = [...new Set(glossary.map(g => g.category))];
        const filtered = searchTerm
            ? glossary.filter(g => g.term.toLowerCase().includes(searchTerm.toLowerCase()) || g.def.toLowerCase().includes(searchTerm.toLowerCase()))
            : glossary;

        const tabs = [
            { id: 'glossary', label: '📖 Glossary', icon: '📖' },
            { id: 'schedules', label: '📋 Schedules', icon: '📋' },
            { id: 'decision', label: '🌲 Decision Tree', icon: '🌲' },
            { id: 'mistakes', label: '⚠️ Common Mistakes', icon: '⚠️' },
        ];

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // Tab bar
            h('div', { className: 'flex gap-2 bg-white rounded-xl border border-slate-200 p-2 shadow-sm' },
                tabs.map(tab =>
                    h('button', {
                        key: tab.id,
                        onClick: () => setActiveTab(tab.id),
                        className: `flex-1 py-2.5 px-3 rounded-lg text-sm font-bold transition-all ${activeTab === tab.id
                            ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-md'
                            : 'text-slate-600 hover:bg-slate-100'}`
                    }, tab.label)
                )
            ),

            // GLOSSARY TAB
            activeTab === 'glossary' && h('div', { className: 'space-y-4' },
                h('input', {
                    value: searchTerm,
                    onChange: (e) => setSearchTerm(e.target.value),
                    placeholder: '🔍 Search ABA terms...',
                    className: 'w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm shadow-sm focus:ring-2 focus:ring-indigo-400 outline-none'
                }),
                categories.map(cat => {
                    const items = filtered.filter(g => g.category === cat);
                    if (items.length === 0) return null;
                    return h('div', { key: cat, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                        h('h4', { className: 'text-xs font-black text-slate-500 uppercase mb-3 tracking-wide' }, cat),
                        h('div', { className: 'space-y-2' },
                            items.map(g =>
                                h('div', { key: g.term, className: 'p-3 bg-slate-50 rounded-lg border border-slate-100' },
                                    h('div', { className: 'text-sm font-bold text-indigo-700 mb-0.5' }, g.term),
                                    h('div', { className: 'text-xs text-slate-600 leading-relaxed' }, g.def)
                                )
                            )
                        )
                    );
                })
            ),

            // SCHEDULES TAB
            activeTab === 'schedules' && h('div', { className: 'space-y-3' },
                h('div', { className: 'bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-200 p-4' },
                    h('h3', { className: 'text-sm font-black text-indigo-800 mb-1' }, '📋 Reinforcement Schedules Explained'),
                    h('p', { className: 'text-xs text-indigo-600' }, 'How often and when to deliver reinforcement. Use the Token Board tool to implement these schedules in practice.')
                ),
                scheduleExplainer.map(s =>
                    h('div', { key: s.type, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                        h('div', { className: 'flex items-start gap-3' },
                            h('div', { className: 'text-2xl' }, s.icon),
                            h('div', { className: 'flex-1' },
                                h('div', { className: 'text-sm font-black text-slate-800' }, s.type),
                                h('div', { className: 'text-xs text-slate-600 mt-0.5' }, s.desc),
                                h('div', { className: 'mt-2 p-2 bg-blue-50 rounded-lg text-xs text-blue-700' },
                                    h('span', { className: 'font-bold' }, 'Example: '), s.example
                                ),
                                h('div', { className: 'mt-1 text-[10px] text-slate-400 italic' }, `Best used: ${s.when}`)
                            )
                        )
                    )
                ),
                h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-4 text-xs text-amber-800' },
                    h('p', { className: 'font-bold mb-1' }, '📈 Schedule Thinning Path:'),
                    h('p', null, 'CRF (every time) → FR-2 → FR-3 → FR-5 → VR-5 → VR-8 → Natural reinforcement'),
                    h('p', { className: 'italic mt-1' }, '⚠️ If behavior breaks down, go back one step.')
                )
            ),

            // DECISION TREE TAB
            activeTab === 'decision' && h('div', { className: 'space-y-3' },
                h('div', { className: 'bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 p-4' },
                    h('h3', { className: 'text-sm font-black text-emerald-800 mb-1' }, '🌲 Function Identification Decision Tree'),
                    h('p', { className: 'text-xs text-emerald-600' }, 'Use this flow to hypothesize the function of a challenging behavior.')
                ),
                decisionTree.map((step, i) =>
                    h('div', { key: i, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                        h('div', { className: 'flex items-start gap-3' },
                            h('div', { className: 'w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center text-sm font-black shrink-0' }, i + 1),
                            h('div', { className: 'flex-1' },
                                h('div', { className: 'text-sm font-bold text-slate-800 mb-2' }, step.q),
                                h('div', { className: 'grid grid-cols-2 gap-2' },
                                    h('div', { className: 'p-2 bg-emerald-50 rounded-lg border border-emerald-200 text-xs' },
                                        h('span', { className: 'font-bold text-emerald-700' }, '✅ YES: '), step.yes
                                    ),
                                    h('div', { className: 'p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs' },
                                        h('span', { className: 'font-bold text-slate-500' }, '❌ NO: '), step.no
                                    )
                                )
                            )
                        )
                    )
                ),
                h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-4 text-xs text-purple-700' },
                    h('p', { className: 'font-bold mb-1' }, '💡 Pro Tip:'),
                    h('p', null, 'Behaviors can serve MULTIPLE functions. Always collect enough data (10+ ABC entries) before finalizing your hypothesis. Use the AI Pattern Analysis tool for data-driven confirmation.')
                )
            ),

            // COMMON MISTAKES TAB
            activeTab === 'mistakes' && h('div', { className: 'space-y-3' },
                h('div', { className: 'bg-gradient-to-r from-red-50 to-orange-50 rounded-xl border border-red-200 p-4' },
                    h('h3', { className: 'text-sm font-black text-red-800 mb-1' }, '⚠️ Common ABA Implementation Mistakes'),
                    h('p', { className: 'text-xs text-red-600' }, 'Avoid these frequently seen errors to improve behavioral outcomes.')
                ),
                commonMistakes.map((m, i) =>
                    h('div', { key: i, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                        h('div', { className: 'text-sm font-black text-red-600 mb-1' }, `❌ ${m.mistake}`),
                        h('div', { className: 'text-xs text-slate-600 mb-2' }, m.desc),
                        h('div', { className: 'p-2 bg-emerald-50 rounded-lg text-xs text-emerald-700 border border-emerald-200' },
                            h('span', { className: 'font-bold' }, '✅ Fix: '), m.fix
                        )
                    )
                )
            )
        );
    };

    // ─── HomeBehaviorLog ────────────────────────────────────────────────
    // Simplified ABC logging designed for parents/family context
    const HomeBehaviorLog = ({ studentName, t, addToast }) => {
        const [entries, setEntries] = useState([]);
        const [showForm, setShowForm] = useState(false);
        const [newEntry, setNewEntry] = useState({ context: '', behavior: '', response: '', notes: '' });

        const homeContexts = [
            'Morning routine', 'Getting ready for school', 'Mealtime', 'Homework time',
            'Screen time transition', 'Playtime with siblings', 'Bedtime routine',
            'Public outing', 'In the car', 'After school', 'Other'
        ];

        const homeResponses = [
            'Redirected calmly', 'Gave a break', 'Used a timer', 'Offered choices',
            'Used first-then language', 'Ignored the behavior', 'Praised alternative behavior',
            'Removed the item/activity', 'Used a visual schedule', 'Other'
        ];

        // Load from localStorage
        useEffect(() => {
            if (!studentName) return;
            try {
                const saved = localStorage.getItem(`behaviorLens_homeLog_${studentName}`);
                if (saved) setEntries(JSON.parse(saved));
            } catch (e) { /* ignore */ }
        }, [studentName]);

        const saveEntry = () => {
            if (!newEntry.behavior.trim()) return;
            const entry = { ...newEntry, id: uid(), timestamp: new Date().toISOString() };
            const updated = [entry, ...entries];
            setEntries(updated);
            try { localStorage.setItem(`behaviorLens_homeLog_${studentName}`, JSON.stringify(updated)); } catch (e) { /* ignore */ }
            setNewEntry({ context: '', behavior: '', response: '', notes: '' });
            setShowForm(false);
            if (addToast) addToast('Entry saved ✅', 'success');
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4' },
                h('h3', { className: 'text-sm font-black text-blue-800 mb-1' }, '🏠 ' + (t('behavior_lens.homelog.title') || 'Home Behavior Log')),
                h('p', { className: 'text-xs text-blue-600' }, 'Track behaviors at home using simple, everyday language. This helps your child\'s school team see the full picture.')
            ),
            // Add button
            h('button', {
                onClick: () => setShowForm(!showForm),
                className: 'w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all'
            }, showForm ? '▾ Close Form' : '➕ Log a Behavior'),
            // Entry form
            showForm && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3' },
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '📍 When did it happen?'),
                    h('div', { className: 'flex flex-wrap gap-1.5' },
                        homeContexts.map(ctx =>
                            h('button', {
                                key: ctx,
                                onClick: () => setNewEntry(p => ({ ...p, context: ctx })),
                                className: `px-3 py-1.5 rounded-full text-xs font-bold transition-all ${newEntry.context === ctx ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                            }, ctx)
                        )
                    )
                ),
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '👀 What happened? (behavior)'),
                    h('textarea', {
                        value: newEntry.behavior,
                        onChange: (e) => setNewEntry(p => ({ ...p, behavior: e.target.value })),
                        placeholder: 'Describe what your child did...',
                        rows: 2,
                        className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-blue-400 outline-none'
                    })
                ),
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '💬 What did you do? (response)'),
                    h('div', { className: 'flex flex-wrap gap-1.5' },
                        homeResponses.map(r =>
                            h('button', {
                                key: r,
                                onClick: () => setNewEntry(p => ({ ...p, response: r })),
                                className: `px-3 py-1.5 rounded-full text-xs font-bold transition-all ${newEntry.response === r ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                            }, r)
                        )
                    )
                ),
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '📝 Extra notes (optional)'),
                    h('input', {
                        value: newEntry.notes,
                        onChange: (e) => setNewEntry(p => ({ ...p, notes: e.target.value })),
                        placeholder: 'Any other details (was child tired, hungry, etc.)...',
                        className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 outline-none'
                    })
                ),
                h('button', {
                    onClick: saveEntry,
                    disabled: !newEntry.behavior.trim(),
                    className: 'w-full py-2.5 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 disabled:opacity-40 transition-all'
                }, '💾 Save Entry')
            ),
            // Entries list
            entries.length > 0 ? h('div', { className: 'space-y-2' },
                h('h4', { className: 'text-xs font-black text-slate-500 uppercase' }, `${entries.length} Entries`),
                entries.slice(0, 20).map(e =>
                    h('div', { key: e.id, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                        h('div', { className: 'flex justify-between items-start mb-2' },
                            h('span', { className: 'text-xs font-bold text-blue-600' }, e.context || 'General'),
                            h('span', { className: 'text-[10px] text-slate-400' }, fmtDate(e.timestamp))
                        ),
                        h('p', { className: 'text-sm text-slate-700 mb-1' }, e.behavior),
                        e.response && h('div', { className: 'text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1 inline-block' }, `Response: ${e.response}`),
                        e.notes && h('p', { className: 'text-xs text-slate-400 mt-1 italic' }, e.notes)
                    )
                )
            ) : h('div', { className: 'text-center py-8 bg-slate-50 rounded-xl' },
                h('div', { className: 'text-3xl mb-2' }, '🏠'),
                h('p', { className: 'text-sm text-slate-500' }, 'No entries yet. Tap "Log a Behavior" to get started!')
            )
        );
    };

    // ─── PocketBip ──────────────────────────────────────────────────────
    // Compact index-card BIP summary for wallet/clipboard carry
    const PocketBip = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const [card, setCard] = useState({
            targetBehavior: '',
            function: '',
            replacementBehavior: '',
            reinforcement: '',
            deescalation: '',
        });
        const [generating, setGenerating] = useState(false);

        const handleGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const recentABC = abcEntries.slice(-5).map(e => `B: ${e.behavior}`).join('; ');
                const prompt = `You are a BCBA creating a pocket-sized BIP reference card.
${RESTORATIVE_PREAMBLE}

Student function: ${funcStr}
${aiAnalysis?.summary ? 'Summary: ' + aiAnalysis.summary : ''}
Recent behaviors: ${recentABC || 'None'}

Create a concise pocket BIP. Return ONLY valid JSON:
{
  "targetBehavior": "brief description of target behavior",
  "function": "hypothesized function in 1 sentence",
  "replacementBehavior": "what to teach instead",
  "reinforcement": "how to reinforce replacement behavior",
  "deescalation": "key de-escalation steps (2-3 bullet points)"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setCard(parsed);
                if (addToast) addToast('Pocket BIP generated ✨', 'success');
            } catch (err) {
                warnLog('Pocket BIP failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        const sections = [
            { key: 'targetBehavior', label: '🎯 Target Behavior', color: '#ef4444', bg: '#fef2f2' },
            { key: 'function', label: '🔍 Function', color: '#8b5cf6', bg: '#f5f3ff' },
            { key: 'replacementBehavior', label: '✅ Replacement', color: '#22c55e', bg: '#f0fdf4' },
            { key: 'reinforcement', label: '⭐ Reinforcement', color: '#f59e0b', bg: '#fefce8' },
            { key: 'deescalation', label: '🌊 De-escalation', color: '#3b82f6', bg: '#eff6ff' },
        ];

        return h('div', { className: 'max-w-sm mx-auto space-y-4' },
            // AI generate
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating,
                className: 'w-full py-3 bg-gradient-to-r from-slate-600 to-slate-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all print:hidden'
            }, generating ? '⏳ Generating...' : ('🧠 ' + (t('behavior_lens.pocket.generate') || 'AI Generate Pocket BIP'))),
            // Card
            h('div', { className: 'bg-white rounded-2xl border-2 border-slate-300 p-5 shadow-lg print:shadow-none print:border-black', style: { maxWidth: '350px', margin: '0 auto' } },
                h('div', { className: 'text-center border-b border-slate-200 pb-2 mb-3' },
                    h('h2', { className: 'text-xs font-black text-slate-800 uppercase tracking-wider' }, '📇 Pocket BIP'),
                    studentName && h('p', { className: 'text-[10px] text-slate-500' }, studentName)
                ),
                h('div', { className: 'space-y-2' },
                    sections.map(s =>
                        h('div', { key: s.key, className: 'rounded-lg p-2.5 border', style: { background: s.bg, borderColor: s.color + '40' } },
                            h('div', { className: 'text-[10px] font-black uppercase mb-0.5', style: { color: s.color } }, s.label),
                            h('textarea', {
                                value: card[s.key] || '',
                                onChange: (e) => setCard(prev => ({ ...prev, [s.key]: e.target.value })),
                                rows: 1,
                                className: 'w-full bg-transparent text-xs text-slate-700 outline-none resize-none leading-tight'
                            })
                        )
                    )
                )
            ),
            h('button', { onClick: () => window.print(), className: 'w-full py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all print:hidden' }, '🖨️ Print Pocket BIP')
        );
    };

    // ─── CounselingSimulation ───────────────────────────────────────────
    // AI-powered counseling role-play simulation for professional development
    const CounselingSimulation = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const SCENARIOS = [
            { id: 'escape', label: 'Escape-Maintained', icon: '🏃', desc: 'Student avoids difficult tasks or overwhelming situations', persona: 'You are a student who becomes avoidant and shuts down when work feels too hard. You might put your head down, leave your seat, or say "I can\'t do this." You generally respond well to breaks and scaffolded support.' },
            { id: 'attention', label: 'Attention-Seeking', icon: '👀', desc: 'Student seeks connection through disruptive or attention-getting behavior', persona: 'You are a student who craves adult and peer connection. You might call out, make jokes, or act silly to get reactions. Deep down you want to feel noticed and valued. You respond well to praise and quality time.' },
            { id: 'tangible', label: 'Tangible-Motivated', icon: '🎁', desc: 'Student has difficulty when preferred items or activities are unavailable', persona: 'You are a student who becomes frustrated when you can\'t have a preferred item or activity. You might negotiate, refuse to work, or become upset. You respond well to first/then agreements and visual schedules.' },
            { id: 'sensory', label: 'Sensory-Related', icon: '🌀', desc: 'Student is overwhelmed or under-stimulated by sensory input', persona: 'You are a student who is very sensitive to sensory input — noise, lights, textures. You might cover your ears, rock, or leave the area. You respond well to sensory breaks and modified environments.' },
            { id: 'custom', label: 'Custom Scenario', icon: '✏️', desc: 'Define your own student persona and behavioral context', persona: '' },
        ];

        const [scenario, setScenario] = useState(null);
        const [customPersona, setCustomPersona] = useState('');
        const [additionalInstructions, setAdditionalInstructions] = useState('');
        const [enableImages, setEnableImages] = useState(false);
        const [messages, setMessages] = useState([]);
        const [input, setInput] = useState('');
        const [sending, setSending] = useState(false);
        const [sessionStarted, setSessionStarted] = useState(false);
        const [showFeedback, setShowFeedback] = useState(false);
        const [selfRating, setSelfRating] = useState(3);
        const [strategyNotes, setStrategyNotes] = useState('');
        const [sessionCount, setSessionCount] = useState(0);
        const messagesEndRef = useRef(null);

        useEffect(() => {
            if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }, [messages]);

        const getPersona = () => {
            const base = scenario?.id === 'custom' ? customPersona : (scenario?.persona || '');
            const funcContext = aiAnalysis?.hypothesizedFunction
                ? `\nContext: The student's behavior has been analyzed and the hypothesized function is "${aiAnalysis.hypothesizedFunction}".`
                : '';
            const additional = additionalInstructions ? `\nAdditional context: ${additionalInstructions}` : '';
            return base + funcContext + additional;
        };

        const handleStart = () => {
            if (!scenario) return;
            const persona = getPersona();
            if (!persona.trim()) {
                if (addToast) addToast('Please define a student persona', 'error');
                return;
            }
            setMessages([{
                role: 'system',
                content: `Session started with scenario: ${scenario.label}. You are now speaking with "${studentName || 'the student'}." Begin by greeting the student and building rapport.`
            }]);
            setSessionStarted(true);
            setSessionCount(prev => prev + 1);
            if (addToast) addToast('Simulation started — you are now the counselor 🎭', 'success');
        };

        const handleSend = async () => {
            if (!input.trim() || !callGemini || sending) return;
            const userMsg = { role: 'counselor', content: input.trim() };
            setMessages(prev => [...prev, userMsg]);
            setInput('');
            setSending(true);

            try {
                const persona = getPersona();
                const history = messages.filter(m => m.role !== 'system')
                    .map(m => `${m.role === 'counselor' ? 'Counselor' : 'Student'}: ${m.content}`)
                    .join('\n');

                const prompt = `You are role-playing as a student in a counseling simulation for educator professional development.
${RESTORATIVE_PREAMBLE}

YOUR PERSONA:
${persona}

Student name/codename: "${studentName || 'Student'}"

CONVERSATION SO FAR:
${history}
Counselor: ${userMsg.content}

INSTRUCTIONS:
- Respond AS THE STUDENT in 1-3 sentences
- Stay in character based on your persona
- React realistically to the counselor's approach
- If the counselor uses effective strategies (validation, active listening, choice-giving), gradually show improvement
- If the counselor uses ineffective approaches (demands, threats), show realistic resistance
- Never break character or give meta-commentary
- Use age-appropriate language for a school-age student

Respond only with the student's words:`;

                const result = await callGemini(prompt, false);
                const studentMsg = { role: 'student', content: result.trim() };
                setMessages(prev => [...prev, studentMsg]);

            } catch (err) {
                warnLog('Counseling simulation failed:', err);
                if (addToast) addToast('Response failed — try again', 'error');
            } finally {
                setSending(false);
            }
        };

        const handleEndSession = () => {
            setShowFeedback(true);
        };

        const handleReset = () => {
            setMessages([]);
            setSessionStarted(false);
            setShowFeedback(false);
            setSelfRating(3);
            setStrategyNotes('');
            setScenario(null);
        };

        // ─── Setup Panel ────────────────────────────────────────────
        if (!sessionStarted) {
            return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
                // Scenario selector
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                    h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '🎭 ' + (t('behavior_lens.counseling.choose_scenario') || 'Choose a Scenario')),
                    h('div', { className: 'space-y-2' },
                        SCENARIOS.map(s =>
                            h('button', {
                                key: s.id,
                                onClick: () => setScenario(s),
                                className: `w-full text-left rounded-xl p-4 border-2 transition-all hover:shadow-md ${scenario?.id === s.id ? 'border-teal-500 bg-teal-50 shadow-md' : 'border-transparent bg-slate-50 hover:bg-slate-100'}`,
                            },
                                h('div', { className: 'flex items-center gap-3' },
                                    h('span', { className: 'text-2xl' }, s.icon),
                                    h('div', null,
                                        h('div', { className: 'font-bold text-sm text-slate-800' }, s.label),
                                        h('div', { className: 'text-xs text-slate-500 mt-0.5' }, s.desc)
                                    )
                                )
                            )
                        )
                    )
                ),
                // Custom persona (if custom scenario selected)
                scenario?.id === 'custom' && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                    h('h3', { className: 'text-sm font-black text-slate-800 mb-2' }, '✏️ Define Student Persona'),
                    h('textarea', {
                        value: customPersona,
                        onChange: (e) => setCustomPersona(e.target.value),
                        placeholder: 'Describe the student persona... e.g., "You are a 3rd grader who becomes anxious during math and tends to cry and shut down..."',
                        rows: 4,
                        className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none resize-none'
                    })
                ),
                // Additional instructions
                scenario && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                    h('h3', { className: 'text-sm font-black text-slate-800 mb-2' }, '📝 Additional Instructions (Optional)'),
                    h('textarea', {
                        value: additionalInstructions,
                        onChange: (e) => setAdditionalInstructions(e.target.value),
                        placeholder: 'Add context, constraints, or specific challenges... e.g., "The student also has a speech delay" or "This is a middle school student"',
                        rows: 2,
                        className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none resize-none'
                    })
                ),
                // Image toggle
                scenario && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                    h('label', { className: 'flex items-center gap-3 cursor-pointer' },
                        h('input', {
                            type: 'checkbox',
                            checked: enableImages,
                            onChange: (e) => setEnableImages(e.target.checked),
                            className: 'w-4 h-4 accent-teal-600'
                        }),
                        h('div', null,
                            h('div', { className: 'text-sm font-bold text-slate-700' }, '🖼️ ' + (t('behavior_lens.counseling.enable_images') || 'Enable Image Generation')),
                            h('div', { className: 'text-[10px] text-slate-400' }, 'AI will generate visual scenes during the conversation (requires Imagen)')
                        )
                    )
                ),
                // AI context badge
                aiAnalysis && scenario && h('div', { className: 'bg-teal-50 rounded-xl border border-teal-200 p-3 flex items-center gap-2' },
                    h('span', { className: 'text-lg' }, '🧠'),
                    h('div', null,
                        h('div', { className: 'text-xs font-bold text-teal-700' }, 'AI Context Available'),
                        h('div', { className: 'text-[10px] text-teal-600' }, `Hypothesized function: ${aiAnalysis.hypothesizedFunction} (${aiAnalysis.confidence}% confidence)`)
                    )
                ),
                // Start button
                scenario && h('button', {
                    onClick: handleStart,
                    disabled: scenario.id === 'custom' && !customPersona.trim(),
                    className: 'w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all text-base'
                }, '🎬 ' + (t('behavior_lens.counseling.start') || 'Begin Counseling Session')),
                // Session count
                sessionCount > 0 && h('div', { className: 'text-center text-xs text-slate-400' }, `${sessionCount} session${sessionCount > 1 ? 's' : ''} completed this visit`)
            );
        }

        // ─── Feedback Panel ─────────────────────────────────────────
        if (showFeedback) {
            return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-6 shadow-sm text-center' },
                    h('h3', { className: 'text-lg font-black text-slate-800 mb-1' }, '📋 Session Reflection'),
                    h('p', { className: 'text-xs text-slate-500 mb-6' }, `Scenario: ${scenario?.label} | ${messages.filter(m => m.role === 'counselor').length} counselor exchanges`)
                ),
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4' },
                    h('div', null,
                        h('label', { className: 'block text-xs font-bold text-slate-600 uppercase mb-2' }, '🌟 Self-Assessment: How effective was my counseling?'),
                        h('input', { type: 'range', min: 1, max: 5, value: selfRating, onChange: (e) => setSelfRating(parseInt(e.target.value)), className: 'w-full accent-teal-600' }),
                        h('div', { className: 'flex justify-between text-[10px] text-slate-400 mt-0.5' },
                            h('span', null, 'Needs practice'),
                            h('span', null, 'Getting there'),
                            h('span', null, 'Feeling confident')
                        )
                    ),
                    h('div', null,
                        h('label', { className: 'block text-xs font-bold text-slate-600 uppercase mb-2' }, '📝 What strategies did I use? What would I try differently?'),
                        h('textarea', {
                            value: strategyNotes,
                            onChange: (e) => setStrategyNotes(e.target.value),
                            rows: 4,
                            placeholder: 'Reflect on your approach...\n• What worked well?\n• What would you do differently?\n• What strategies do you want to practice next?',
                            className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 outline-none resize-none'
                        })
                    )
                ),
                // Conversation review
                h('details', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4' },
                    h('summary', { className: 'text-xs font-bold text-slate-600 cursor-pointer' }, '💬 Review Conversation'),
                    h('div', { className: 'mt-3 space-y-2 max-h-64 overflow-y-auto' },
                        messages.filter(m => m.role !== 'system').map((m, i) =>
                            h('div', { key: i, className: `text-xs p-2 rounded-lg ${m.role === 'counselor' ? 'bg-teal-50 text-teal-800 ml-8' : 'bg-white text-slate-700 mr-8 border border-slate-200'}` },
                                h('span', { className: 'font-bold' }, m.role === 'counselor' ? '🧑‍⚕️ You: ' : '🧒 Student: '),
                                m.content
                            )
                        )
                    )
                ),
                h('div', { className: 'flex gap-3' },
                    h('button', {
                        onClick: handleReset,
                        className: 'flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all'
                    }, '🔄 New Session'),
                    h('button', {
                        onClick: () => { if (addToast) addToast('Reflection saved ✨', 'success'); handleReset(); },
                        className: 'flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl transition-all'
                    }, '✅ Save & Close')
                )
            );
        }

        // ─── Chat Interface ─────────────────────────────────────────
        return h('div', { className: 'max-w-3xl mx-auto flex flex-col', style: { height: 'calc(100vh - 200px)', minHeight: '400px' } },
            // Header
            h('div', { className: 'bg-gradient-to-r from-teal-500 to-cyan-500 rounded-t-xl p-4 text-white flex items-center justify-between flex-shrink-0' },
                h('div', null,
                    h('h3', { className: 'font-black text-sm' }, '🎭 Counseling Simulation'),
                    h('p', { className: 'text-[10px] opacity-80' }, `${scenario?.label} • ${studentName || 'Student'} • ${messages.filter(m => m.role === 'counselor').length} exchanges`)
                ),
                h('button', {
                    onClick: handleEndSession,
                    className: 'px-3 py-1.5 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-all'
                }, '⏹ End Session')
            ),
            // Messages
            h('div', { className: 'flex-1 overflow-y-auto bg-white border-x border-slate-200 p-4 space-y-3' },
                messages.map((m, i) =>
                    m.role === 'system'
                        ? h('div', { key: i, className: 'text-center text-[10px] text-slate-400 italic py-2' }, m.content)
                        : h('div', { key: i, className: `flex ${m.role === 'counselor' ? 'justify-end' : 'justify-start'}` },
                            h('div', {
                                className: `max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${m.role === 'counselor'
                                    ? 'bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-tr-sm'
                                    : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-tl-sm'
                                    }`
                            },
                                h('div', { className: 'text-[10px] font-bold mb-1 opacity-70' }, m.role === 'counselor' ? '🧑‍⚕️ You (Counselor)' : `🧒 ${studentName || 'Student'}`),
                                h('div', { className: 'text-sm leading-relaxed' }, m.content)
                            )
                        )
                ),
                sending && h('div', { className: 'flex justify-start' },
                    h('div', { className: 'bg-slate-100 border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm' },
                        h('div', { className: 'text-[10px] font-bold mb-1 text-slate-400' }, `🧒 ${studentName || 'Student'}`),
                        h('div', { className: 'text-sm text-slate-400 animate-pulse' }, '● ● ●')
                    )
                ),
                h('div', { ref: messagesEndRef })
            ),
            // Input bar
            h('div', { className: 'bg-white border border-slate-200 rounded-b-xl p-3 flex-shrink-0' },
                h('div', { className: 'flex gap-2' },
                    h('input', {
                        type: 'text',
                        value: input,
                        onChange: (e) => setInput(e.target.value),
                        onKeyDown: (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } },
                        placeholder: 'Respond as the counselor...',
                        disabled: sending,
                        className: 'flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 outline-none disabled:opacity-50'
                    }),
                    h('button', {
                        onClick: handleSend,
                        disabled: !input.trim() || sending,
                        className: 'px-5 py-2.5 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-xl font-bold text-sm shadow hover:shadow-lg disabled:opacity-40 transition-all'
                    }, sending ? '⏳' : '📨')
                ),
                h('div', { className: 'flex items-center justify-between mt-2' },
                    h('div', { className: 'text-[10px] text-slate-400' }, '💡 Tip: Try validation, active listening, and offering choices'),
                    h('button', {
                        onClick: handleEndSession,
                        className: 'text-[10px] text-red-400 hover:text-red-600 font-bold transition-all'
                    }, 'End Session →')
                )
            )
        );
    };

    // ─── SnapshotExchange ────────────────────────────────────────────────
    // Sneakernet JSON export/import for parent-teacher data exchange
    const SnapshotExchange = ({ studentName, abcEntries, observationSessions, aiAnalysis, setAbcEntries, setObservationSessions, t, addToast }) => {
        const [tab, setTab] = useState('export');
        const [role, setRole] = useState('educator');
        const [message, setMessage] = useState('');
        const [includeAbc, setIncludeAbc] = useState(true);
        const [includeObs, setIncludeObs] = useState(true);
        const [includeAi, setIncludeAi] = useState(true);
        const [importPreview, setImportPreview] = useState(null);
        const [dragActive, setDragActive] = useState(false);
        const fileRef = useRef(null);

        const SNAPSHOT_VERSION = '1.0';

        const buildSnapshot = () => {
            const snapshot = {
                alloflowSnapshot: true,
                version: SNAPSHOT_VERSION,
                exportedAt: new Date().toISOString(),
                exportedBy: role,
                studentCodename: studentName || 'Unknown',
                message: message.trim() || null,
                behaviorLens: {
                    abcEntries: includeAbc ? abcEntries : [],
                    observationSessions: includeObs ? observationSessions : [],
                    aiAnalysis: includeAi ? (aiAnalysis || null) : null,
                },
                crossModule: null,
            };
            return snapshot;
        };

        const handleExport = () => {
            const snapshot = buildSnapshot();
            const content = JSON.stringify(snapshot, null, 2);
            const dateSuffix = new Date().toISOString().split('T')[0];
            const safeName = (studentName || 'student').replace(/\s/g, '_');
            const filename = `alloflow_snapshot_${safeName}_${role}_${dateSuffix}.json`;
            const blob = new Blob([content], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url; a.download = filename; a.click();
            URL.revokeObjectURL(url);
            addToast && addToast(`Snapshot exported as ${filename}`, 'success');
        };

        const parseFile = (file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.alloflowSnapshot) {
                        addToast && addToast('Not a valid AlloFlow snapshot file', 'error');
                        return;
                    }
                    // Count duplicates
                    const existingTs = new Set(abcEntries.map(e => e.timestamp));
                    const newAbc = (data.behaviorLens?.abcEntries || []).filter(e => !existingTs.has(e.timestamp));
                    const existingObsTs = new Set(observationSessions.map(s => s.timestamp));
                    const newObs = (data.behaviorLens?.observationSessions || []).filter(s => !existingObsTs.has(s.timestamp));
                    const dupeCount = (data.behaviorLens?.abcEntries?.length || 0) - newAbc.length + (data.behaviorLens?.observationSessions?.length || 0) - newObs.length;
                    setImportPreview({
                        raw: data,
                        newAbc,
                        newObs,
                        dupeCount,
                        hasAi: !!data.behaviorLens?.aiAnalysis,
                    });
                } catch (err) {
                    addToast && addToast('Failed to parse snapshot file', 'error');
                }
            };
            reader.readAsText(file);
        };

        const handleDrop = (e) => {
            e.preventDefault();
            setDragActive(false);
            const file = e.dataTransfer?.files?.[0];
            if (file) parseFile(file);
        };

        const handleFileInput = (e) => {
            const file = e.target.files?.[0];
            if (file) parseFile(file);
        };

        const handleMerge = () => {
            if (!importPreview) return;
            const { newAbc, newObs, raw } = importPreview;
            if (newAbc.length > 0) setAbcEntries(prev => [...prev, ...newAbc].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
            if (newObs.length > 0) setObservationSessions(prev => [...prev, ...newObs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)));
            addToast && addToast(`Merged ${newAbc.length} ABC entries and ${newObs.length} observations`, 'success');
            setImportPreview(null);
        };

        // Export tab UI
        const renderExport = () => h('div', { className: 'space-y-4' },
            // Role selector
            h('div', null,
                h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Your Role'),
                h('div', { className: 'flex gap-2' },
                    [['educator', '🏫 Educator'], ['family', '👨‍👩‍👧 Family']].map(([key, label]) =>
                        h('button', {
                            key, onClick: () => setRole(key),
                            className: `flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${role === key ? 'bg-cyan-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                        }, label)
                    )
                )
            ),
            // Privacy controls
            h('div', null,
                h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-2' }, 'Data to Include'),
                h('div', { className: 'space-y-2' },
                    [['abc', includeAbc, setIncludeAbc, `📋 ABC Observations (${abcEntries.length})`],
                    ['obs', includeObs, setIncludeObs, `🔍 Observation Sessions (${observationSessions.length})`],
                    ['ai', includeAi, setIncludeAi, '🧠 AI Analysis']].map(([key, val, setter, label]) =>
                        h('label', { key, className: 'flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-100 cursor-pointer hover:border-cyan-200 transition-colors' },
                            h('input', { type: 'checkbox', checked: val, onChange: () => setter(!val), className: 'w-4 h-4 text-cyan-600 rounded' }),
                            h('span', { className: 'text-sm font-medium text-slate-700' }, label)
                        )
                    )
                )
            ),
            // Codename preview
            h('div', { className: 'bg-cyan-50 rounded-lg p-3 border border-cyan-100 flex items-center gap-2' },
                h('span', { className: 'text-lg' }, '🏷️'),
                h('div', null,
                    h('div', { className: 'text-[10px] font-bold text-cyan-600 uppercase' }, 'Student Codename'),
                    h('div', { className: 'text-sm font-black text-cyan-900' }, studentName || 'Not assigned')
                )
            ),
            // Optional message
            h('div', null,
                h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, 'Optional Message'),
                h('textarea', {
                    value: message, onChange: e => setMessage(e.target.value),
                    placeholder: role === 'educator' ? 'Notes for the family... (e.g., strategies that worked well this week)' : 'Notes for the teacher... (e.g., what happened at home over the weekend)',
                    rows: 3,
                    className: 'w-full text-sm p-3 border-2 border-slate-200 rounded-xl focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all resize-none'
                })
            ),
            // Export button
            h('button', {
                onClick: handleExport,
                disabled: !includeAbc && !includeObs && !includeAi,
                className: 'w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2'
            }, h('span', null, '📦'), `Export ${role === 'educator' ? 'Educator' : 'Family'} Snapshot`)
        );

        // Import tab UI
        const renderImport = () => h('div', { className: 'space-y-4' },
            !importPreview ? (
                // Drag-drop zone
                h('div', {
                    onDragOver: (e) => { e.preventDefault(); setDragActive(true); },
                    onDragLeave: () => setDragActive(false),
                    onDrop: handleDrop,
                    onClick: () => fileRef.current?.click(),
                    className: `border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${dragActive ? 'border-cyan-500 bg-cyan-50' : 'border-slate-200 hover:border-cyan-300 hover:bg-slate-50'}`
                },
                    h('div', { className: 'text-4xl mb-3' }, '📥'),
                    h('p', { className: 'text-sm font-bold text-slate-700 mb-1' }, 'Drop a Snapshot File Here'),
                    h('p', { className: 'text-xs text-slate-400' }, 'or click to browse (.json)'),
                    h('input', { ref: fileRef, type: 'file', accept: '.json', onChange: handleFileInput, className: 'hidden' })
                )
            ) : (
                // Preview & merge
                h('div', { className: 'space-y-3' },
                    h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                        h('div', { className: 'flex items-center gap-2 mb-3' },
                            h('span', { className: 'text-xl' }, importPreview.raw.exportedBy === 'family' ? '👨‍👩‍👧' : '🏫'),
                            h('div', null,
                                h('div', { className: 'text-sm font-black text-slate-800' }, `From: ${importPreview.raw.exportedBy === 'family' ? 'Family' : 'Educator'}`),
                                h('div', { className: 'text-[10px] text-slate-400' }, `Exported ${new Date(importPreview.raw.exportedAt).toLocaleString()}`)
                            )
                        ),
                        h('div', { className: 'text-xs text-slate-500 mb-1' }, `Student: ${importPreview.raw.studentCodename || '—'}`),
                        importPreview.raw.message && h('div', { className: 'bg-cyan-50 border border-cyan-100 rounded-lg p-2.5 text-xs text-cyan-800 mt-2 italic' }, `💬 "${importPreview.raw.message}"`)
                    ),
                    // Data summary
                    h('div', { className: 'bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-2 text-xs' },
                        h('div', { className: 'font-bold text-slate-700 mb-1' }, 'Incoming Data'),
                        h('div', { className: 'flex justify-between' }, h('span', null, '📋 New ABC Entries'), h('span', { className: 'font-bold text-emerald-600' }, `+${importPreview.newAbc.length}`)),
                        h('div', { className: 'flex justify-between' }, h('span', null, '🔍 New Observations'), h('span', { className: 'font-bold text-emerald-600' }, `+${importPreview.newObs.length}`)),
                        importPreview.hasAi && h('div', { className: 'flex justify-between' }, h('span', null, '🧠 AI Analysis'), h('span', { className: 'font-bold text-blue-600' }, 'Included')),
                        importPreview.dupeCount > 0 && h('div', { className: 'text-amber-600 mt-1 flex items-center gap-1' }, `⚠️ ${importPreview.dupeCount} duplicate(s) will be skipped`)
                    ),
                    // Codename mismatch warning
                    importPreview.raw.studentCodename && importPreview.raw.studentCodename !== studentName &&
                    h('div', { className: 'bg-amber-50 border border-amber-200 rounded-lg p-2.5 text-xs text-amber-800' },
                        `⚠️ Codename mismatch: file says "${importPreview.raw.studentCodename}" but current session is "${studentName}". Data will still merge if you proceed.`),
                    // Action buttons
                    h('div', { className: 'flex gap-2' },
                        h('button', {
                            onClick: () => setImportPreview(null),
                            className: 'flex-1 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all'
                        }, 'Cancel'),
                        h('button', {
                            onClick: handleMerge,
                            disabled: importPreview.newAbc.length === 0 && importPreview.newObs.length === 0,
                            className: 'flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                        }, '✅ Merge Data')
                    )
                )
            )
        );

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4' },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, '📦'),
                    h('h3', { className: 'text-sm font-black text-slate-800' }, 'Student Snapshot Exchange')
                ),
                h('p', { className: 'text-xs text-slate-500 leading-relaxed -mt-2' },
                    'Share behavioral data with families or colleagues via JSON files — no shared platform needed. Export your observations, send the file, and have the other party import it.'),
                // Tab selector
                h('div', { className: 'flex gap-2 bg-slate-50 p-1 rounded-lg' },
                    [['export', '↗️ Export'], ['import', '↙️ Import']].map(([key, label]) =>
                        h('button', {
                            key, onClick: () => { setTab(key); setImportPreview(null); },
                            className: `flex-1 py-2 rounded-md text-sm font-bold transition-all ${tab === key ? 'bg-white text-cyan-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`
                        }, label)
                    )
                ),
                // Tab content
                tab === 'export' ? renderExport() : renderImport()
            )
        );
    };

    // ─── ConsentManager ──────────────────────────────────────────────────
    // FERPA consent form builder for parent-teacher data exchange
    const ConsentManager = ({ studentName, t, addToast }) => {
        const DEFAULT_SECTIONS = [
            {
                id: 'purpose',
                title: 'Purpose of Data Exchange',
                content: 'This consent authorizes the exchange of behavioral observation data between your child\'s educational team and your family using AlloFlow\'s Student Snapshot Exchange system. The goal is to build a shared, holistic understanding of your child across home and school settings to better support their growth.\n\nData is exchanged via JSON files — simple data files transferred directly between parties (email, USB, etc.) — with no third-party cloud storage involved.',
                required: true,
            },
            {
                id: 'data_types',
                title: 'Types of Data Collected & Shared',
                content: '• ABC Observations — Antecedent-Behavior-Consequence records of behavioral patterns\n• Observation Sessions — Timed frequency counts and interval data\n• AI-Generated Analysis — Summaries and pattern recognition generated by Google Gemini (when enabled)\n• Home Behavior Logs — Parent-reported observations from the home environment\n• Self-Regulation Plans — Visual supports created for your child\n\nAll data uses a student codename (e.g., "Brave Otter") rather than your child\'s real name to add an additional layer of privacy protection.',
                required: true,
            },
            {
                id: 'ai_disclosure',
                title: 'Artificial Intelligence (AI) Usage Disclosure',
                content: 'AlloFlow uses Google Gemini AI to analyze behavioral patterns and generate supportive recommendations. When used through a school-managed Google Workspace account, AI processing is covered by the school district\'s Data Processing Agreement (DPA) with Google, which includes FERPA protections.\n\nIf you choose to use AI features on a personal (non-school) Google account, those interactions fall under Google\'s standard consumer Terms of Service rather than the school\'s educational agreement. AI-powered features in Family Mode are optional and can be disabled.',
                required: true,
            },
            {
                id: 'storage',
                title: 'Data Storage & Security',
                content: 'All behavioral data is stored locally on the device where it was created (browser localStorage). No student data is stored on AlloFlow servers. Data only moves between parties when a human explicitly exports a snapshot file and shares it.\n\nThe Student Snapshot Exchange system uses a "sneakernet" model — data travels as a file you physically or digitally hand to the other party, not through a shared database or cloud sync.',
                required: true,
            },
            {
                id: 'rights',
                title: 'Your Rights Under FERPA',
                content: 'Under the Family Educational Rights and Privacy Act (FERPA), you have the right to:\n\n• Inspect and review your child\'s education records\n• Request corrections to records you believe are inaccurate\n• Consent to or refuse the disclosure of personally identifiable information\n• File a complaint with the U.S. Department of Education\n\nYou may withdraw this consent at any time by notifying your child\'s teacher or school administrator in writing.',
                required: true,
            },
            {
                id: 'optional_notes',
                title: 'Additional School/District Notes',
                content: '[Your school or district may add policy-specific language here. For example: specific data retention periods, names of authorized personnel, or references to district technology use policies.]',
                required: false,
            },
        ];

        const storageKey = `behaviorLens_consent_${studentName || 'default'}`;
        const [sections, setSections] = useState(() => {
            try {
                const saved = localStorage.getItem(storageKey);
                return saved ? JSON.parse(saved) : DEFAULT_SECTIONS;
            } catch { return DEFAULT_SECTIONS; }
        });
        const [editingId, setEditingId] = useState(null);
        const [editBuffer, setEditBuffer] = useState('');
        const [schoolName, setSchoolName] = useState('');
        const [teacherName, setTeacherName] = useState('');
        const [showPrint, setShowPrint] = useState(false);
        const fileRef = useRef(null);

        // Persist on change
        useEffect(() => {
            try { localStorage.setItem(storageKey, JSON.stringify(sections)); } catch { }
        }, [sections, storageKey]);

        const startEdit = (section) => {
            setEditingId(section.id);
            setEditBuffer(section.content);
        };

        const saveEdit = () => {
            setSections(prev => prev.map(s => s.id === editingId ? { ...s, content: editBuffer } : s));
            setEditingId(null);
            addToast && addToast('Section updated', 'success');
        };

        const resetToDefault = () => {
            setSections(DEFAULT_SECTIONS);
            addToast && addToast('Reset to default template', 'info');
        };

        const handleExportTemplate = () => {
            const payload = {
                alloflowConsentTemplate: true,
                version: '1.0',
                exportedAt: new Date().toISOString(),
                schoolName: schoolName || null,
                teacherName: teacherName || null,
                sections,
            };
            const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            const dateSuffix = new Date().toISOString().split('T')[0];
            a.href = url; a.download = `alloflow_consent_template_${dateSuffix}.json`; a.click();
            URL.revokeObjectURL(url);
            addToast && addToast('Consent template exported', 'success');
        };

        const handleImportTemplate = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const data = JSON.parse(ev.target.result);
                    if (!data.alloflowConsentTemplate || !data.sections) {
                        addToast && addToast('Not a valid consent template file', 'error');
                        return;
                    }
                    setSections(data.sections);
                    if (data.schoolName) setSchoolName(data.schoolName);
                    if (data.teacherName) setTeacherName(data.teacherName);
                    addToast && addToast('Consent template imported', 'success');
                } catch { addToast && addToast('Failed to parse template', 'error'); }
            };
            reader.readAsText(file);
        };

        const handlePrint = () => {
            const printContent = `
                <html><head><title>FERPA Consent - ${studentName || 'Student'}</title>
                <style>
                    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 700px; margin: 40px auto; padding: 20px; color: #1e293b; line-height: 1.6; }
                    h1 { font-size: 20px; text-align: center; border-bottom: 2px solid #0891b2; padding-bottom: 12px; }
                    h2 { font-size: 14px; color: #0891b2; margin-top: 24px; text-transform: uppercase; letter-spacing: 0.5px; }
                    p, li { font-size: 12px; }
                    .meta { font-size: 11px; color: #64748b; text-align: center; margin-bottom: 20px; }
                    .sig-block { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 24px; }
                    .sig-line { border-bottom: 1px solid #1e293b; width: 60%; margin: 30px 0 5px 0; }
                    .sig-label { font-size: 10px; color: #64748b; text-transform: uppercase; }
                    .checkbox-line { margin: 8px 0; font-size: 12px; }
                    .checkbox-line::before { content: '☐ '; font-size: 16px; }
                    @media print { body { margin: 20px; } }
                </style></head><body>
                <h1>📋 Consent for Behavioral Data Exchange</h1>
                <div class="meta">${schoolName ? schoolName + ' — ' : ''}${teacherName ? 'Prepared by ' + teacherName + ' — ' : ''}${new Date().toLocaleDateString()}</div>
                <p style="font-size:11px;color:#64748b;">Student Codename: <strong>${studentName || '_______________'}</strong></p>
                ${sections.map(s => `<h2>${s.title}</h2><p>${s.content.replace(/\n/g, '<br>')}</p>`).join('')}
                <div class="sig-block">
                    <p style="font-size:13px;font-weight:bold;">Consent Options</p>
                    <div class="checkbox-line">I consent to the exchange of behavioral data as described above.</div>
                    <div class="checkbox-line">I consent to AI-powered analysis of my child's behavioral data (optional).</div>
                    <div class="checkbox-line">I decline AI-powered analysis but consent to manual data exchange only.</div>
                    <div class="sig-line"></div>
                    <div class="sig-label">Parent/Guardian Signature</div>
                    <div class="sig-line" style="width:30%;"></div>
                    <div class="sig-label">Date</div>
                    <div class="sig-line"></div>
                    <div class="sig-label">Parent/Guardian Printed Name</div>
                </div>
                </body></html>`;
            const win = window.open('', '_blank');
            win.document.write(printContent);
            win.document.close();
            win.focus();
            win.print();
        };

        // Print preview (inline)
        if (showPrint) {
            return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4' },
                    h('div', { className: 'flex items-center justify-between' },
                        h('h3', { className: 'text-sm font-black text-slate-800' }, '🖨️ Print Preview'),
                        h('button', { onClick: () => setShowPrint(false), className: 'text-xs text-slate-400 hover:text-slate-600' }, '← Back to Editor')
                    ),
                    h('div', { className: 'border border-slate-200 rounded-lg p-5 bg-slate-50 space-y-3 text-xs text-slate-700 leading-relaxed' },
                        h('h4', { className: 'text-center font-black text-sm text-slate-800 border-b border-cyan-300 pb-2' }, '📋 Consent for Behavioral Data Exchange'),
                        schoolName && h('p', { className: 'text-center text-[10px] text-slate-400' }, schoolName),
                        h('p', { className: 'text-[10px] text-slate-400' }, `Student Codename: ${studentName || '_______________'}`),
                        ...sections.map(s => [
                            h('h5', { key: s.id + '_t', className: 'font-bold text-cyan-700 uppercase text-[10px] mt-3' }, s.title),
                            h('p', { key: s.id + '_c', className: 'whitespace-pre-line' }, s.content)
                        ]).flat()
                    ),
                    h('button', {
                        onClick: handlePrint,
                        className: 'w-full py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2'
                    }, '🖨️ Open Print Dialog')
                )
            );
        }

        // Main editor
        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4' },
                h('div', { className: 'flex items-center gap-2 mb-1' },
                    h('span', { className: 'text-lg' }, '📋'),
                    h('h3', { className: 'text-sm font-black text-slate-800' }, 'FERPA Consent Manager')
                ),
                h('p', { className: 'text-xs text-slate-500 leading-relaxed -mt-2' },
                    'Customize and share a FERPA-compliant consent form for behavioral data exchange. Edit any section, then export as JSON to share with colleagues or print for parent signatures.'),
                // School & teacher info
                h('div', { className: 'grid grid-cols-2 gap-2' },
                    h('input', {
                        value: schoolName, onChange: e => setSchoolName(e.target.value),
                        placeholder: 'School/District Name',
                        className: 'text-xs p-2.5 border border-slate-200 rounded-lg focus:border-cyan-500 outline-none'
                    }),
                    h('input', {
                        value: teacherName, onChange: e => setTeacherName(e.target.value),
                        placeholder: 'Teacher/Specialist Name',
                        className: 'text-xs p-2.5 border border-slate-200 rounded-lg focus:border-cyan-500 outline-none'
                    })
                ),
                // Sections
                ...sections.map(section =>
                    h('div', { key: section.id, className: `rounded-xl border p-4 transition-all ${editingId === section.id ? 'border-cyan-400 bg-cyan-50/30 shadow-sm' : 'border-slate-100 bg-slate-50 hover:border-slate-200'}` },
                        h('div', { className: 'flex items-center justify-between mb-2' },
                            h('h4', { className: 'text-xs font-bold text-slate-700 flex items-center gap-1.5' },
                                section.required && h('span', { className: 'text-[8px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-black uppercase' }, 'Required'),
                                section.title
                            ),
                            editingId !== section.id &&
                            h('button', {
                                onClick: () => startEdit(section),
                                className: 'text-[10px] text-cyan-600 hover:text-cyan-800 font-bold'
                            }, '✏️ Edit')
                        ),
                        editingId === section.id ? (
                            h('div', { className: 'space-y-2' },
                                h('textarea', {
                                    value: editBuffer,
                                    onChange: e => setEditBuffer(e.target.value),
                                    rows: 6,
                                    className: 'w-full text-xs p-3 border-2 border-cyan-300 rounded-xl focus:border-cyan-500 focus:ring-4 focus:ring-cyan-500/20 outline-none transition-all resize-y font-mono'
                                }),
                                h('div', { className: 'flex gap-2' },
                                    h('button', { onClick: saveEdit, className: 'px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-[10px] font-bold hover:bg-cyan-700 transition-colors' }, '✅ Save'),
                                    h('button', { onClick: () => setEditingId(null), className: 'px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-[10px] font-bold hover:bg-slate-200 transition-colors' }, 'Cancel')
                                )
                            )
                        ) : (
                            h('p', { className: 'text-xs text-slate-600 whitespace-pre-line leading-relaxed' }, section.content)
                        )
                    )
                ),
                // Action buttons
                h('div', { className: 'grid grid-cols-2 gap-2 pt-2' },
                    h('button', {
                        onClick: () => setShowPrint(true),
                        className: 'py-2.5 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5'
                    }, '🖨️ Preview & Print'),
                    h('button', {
                        onClick: handleExportTemplate,
                        className: 'py-2.5 bg-gradient-to-r from-violet-500 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5'
                    }, '📤 Export Template (JSON)')
                ),
                h('div', { className: 'grid grid-cols-2 gap-2' },
                    h('button', {
                        onClick: () => fileRef.current?.click(),
                        className: 'py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5'
                    },
                        '📥 Import Template',
                        h('input', { ref: fileRef, type: 'file', accept: '.json', onChange: handleImportTemplate, className: 'hidden' })
                    ),
                    h('button', {
                        onClick: resetToDefault,
                        className: 'py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-1.5'
                    }, '🔄 Reset to Default')
                )
            )
        );
    };

    // ─── BehaviorTab (Hub) ──────────────────────────────────────────────
    // The main hub component that renders inside a fullscreen overlay
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.BehaviorLens = ({
        onClose,
        callGemini,
        addToast,
        t,
        studentNickname,
        dashboardData,
        isTeacherMode
    }) => {
        const [activePanel, setActivePanel] = useState('hub');
        const [selectedStudent, setSelectedStudent] = useState(studentNickname || '');
        const [abcEntries, setAbcEntries] = useState([]);
        const [observationSessions, setObservationSessions] = useState([]);
        const [aiAnalysis, setAiAnalysis] = useState(null);
        const [analyzing, setAnalyzing] = useState(false);
        const [showLiveObs, setShowLiveObs] = useState(false);
        const [showFreqCounter, setShowFreqCounter] = useState(false);
        const [showIntervalGrid, setShowIntervalGrid] = useState(false);
        const [showChoiceBoard, setShowChoiceBoard] = useState(false);
        const [isParentMode, setIsParentMode] = useState(!isTeacherMode && false);

        // Parent-friendly tool IDs (shown when isParentMode is true)
        const parentTools = ['overview', 'token', 'traffic', 'choice', 'homelog', 'abaguide', 'homenote', 'pocket', 'snapshot'];

        // Two-dropdown codename system (adjective + animal)
        const adjectives = useMemo(() => t('codenames.adjectives') || [], [t]);
        const animals = useMemo(() => t('codenames.animals') || [], [t]);
        const [selectedAdj, setSelectedAdj] = useState('');
        const [selectedAnimal, setSelectedAnimal] = useState('');

        const randomizeName = useCallback(() => {
            if (adjectives.length > 0 && animals.length > 0) {
                const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
                const animal = animals[Math.floor(Math.random() * animals.length)];
                setSelectedAdj(adj);
                setSelectedAnimal(animal);
                setSelectedStudent(`${adj} ${animal}`);
            }
        }, [adjectives, animals]);

        // Initialize dropdowns from studentNickname or randomize
        useEffect(() => {
            if (selectedStudent && adjectives.length > 0 && animals.length > 0) {
                const parts = selectedStudent.trim().split(' ');
                if (parts.length >= 2) {
                    const potentialAdj = parts[0];
                    const potentialAnimal = parts.slice(1).join(' ');
                    if (adjectives.includes(potentialAdj) && animals.includes(potentialAnimal)) {
                        setSelectedAdj(potentialAdj);
                        setSelectedAnimal(potentialAnimal);
                        return;
                    }
                }
            }
            if (!selectedAdj && !selectedAnimal && adjectives.length > 0 && animals.length > 0) {
                randomizeName();
            }
        }, [adjectives, animals]);

        // Load data from localStorage on mount
        useEffect(() => {
            if (!selectedStudent) return;
            try {
                const key = `behaviorLens_abc_${selectedStudent}`;
                const saved = localStorage.getItem(key);
                if (saved) setAbcEntries(JSON.parse(saved));
                const obsKey = `behaviorLens_obs_${selectedStudent}`;
                const savedObs = localStorage.getItem(obsKey);
                if (savedObs) setObservationSessions(JSON.parse(savedObs));
            } catch (e) {
                warnLog("Failed to load behavior data", e);
            }
        }, [selectedStudent]);

        // Auto-save ABC entries
        useEffect(() => {
            if (!selectedStudent || abcEntries.length === 0) return;
            try {
                localStorage.setItem(`behaviorLens_abc_${selectedStudent}`, JSON.stringify(abcEntries));
            } catch (e) {
                warnLog("Failed to save ABC data", e);
            }
        }, [abcEntries, selectedStudent]);

        // Auto-save observation sessions
        useEffect(() => {
            if (!selectedStudent || observationSessions.length === 0) return;
            try {
                localStorage.setItem(`behaviorLens_obs_${selectedStudent}`, JSON.stringify(observationSessions));
            } catch (e) {
                warnLog("Failed to save observation data", e);
            }
        }, [observationSessions, selectedStudent]);

        // Available students from dashboardData
        const studentOptions = useMemo(() => {
            if (!dashboardData || !Array.isArray(dashboardData)) return [];
            return dashboardData.map(s => s.studentNickname).filter(Boolean);
        }, [dashboardData]);

        // AI Analysis function
        const handleAiAnalyze = async () => {
            if (!callGemini || abcEntries.length < 3) return;
            setAnalyzing(true);
            try {
                const dataStr = abcEntries.slice(0, 20).map((e, i) =>
                    `Entry ${i + 1}: Antecedent="${e.antecedent}", Behavior="${e.behavior}", Consequence="${e.consequence}", Intensity=${e.intensity}/5${e.setting ? ', Setting="' + e.setting + '"' : ''}${e.notes ? ', Notes="' + e.notes + '"' : ''}`
                ).join('\n');

                const prompt = `You are a Board Certified Behavior Analyst (BCBA) reviewing ABC behavioral observation data for a student.
${RESTORATIVE_PREAMBLE}

ABC DATA (${abcEntries.length} entries):
${dataStr}

Analyze this data and return ONLY valid JSON:
{
  "summary": "2-3 sentence high-level summary of behavioral patterns observed",
  "hypothesizedFunction": "Attention" | "Escape" | "Tangible" | "Sensory",
  "confidence": <0-100>,
  "patterns": [
    { "pattern": "description of pattern", "frequency": "how often", "evidence": "which entries support this" }
  ],
  "recommendations": [
    "specific, actionable recommendation based on the data"
  ],
  "notes": "any caveats or additional observations"
}`;

                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try {
                    parsed = JSON.parse(cleaned);
                } catch (e) {
                    const match = result.match(/\{[\s\S]*\}/);
                    if (match) parsed = JSON.parse(match[0]);
                    else throw new Error('Could not parse AI response');
                }
                setAiAnalysis(parsed);
                if (addToast) addToast(t('behavior_lens.abc.analysis_complete') || 'Analysis complete ✨', 'success');
            } catch (err) {
                warnLog("AI Analysis failed:", err);
                if (addToast) addToast(t('behavior_lens.abc.analysis_failed') || 'Analysis failed — try again', 'error');
            } finally {
                setAnalyzing(false);
            }
        };

        const handleSaveObsSession = (sessionData) => {
            setObservationSessions(prev => [sessionData, ...prev]);
        };

        // ─── Hub View (Tool Cards) ──────────────────────────────────
        const renderHub = () => {
            const tools = [
                {
                    id: 'abc',
                    icon: '📋',
                    title: t('behavior_lens.hub.abc_title') || 'ABC Data Collection',
                    desc: t('behavior_lens.hub.abc_desc') || 'Record antecedent-behavior-consequence data for functional analysis',
                    color: 'indigo',
                    badge: abcEntries.length > 0 ? `${abcEntries.length} entries` : null,
                },
                {
                    id: 'observation',
                    icon: '🔍',
                    title: t('behavior_lens.hub.obs_title') || 'Live Observation',
                    desc: t('behavior_lens.hub.obs_desc') || 'Fullscreen observation mode with frequency, duration, interval, and latency recording',
                    color: 'emerald',
                    badge: observationSessions.length > 0 ? `${observationSessions.length} sessions` : null,
                },
                {
                    id: 'analysis',
                    icon: '🧠',
                    title: t('behavior_lens.hub.analysis_title') || 'AI Pattern Analysis',
                    desc: t('behavior_lens.hub.analysis_desc') || 'AI-powered functional behavior analysis based on your collected data',
                    color: 'purple',
                    badge: aiAnalysis ? 'Ready' : null,
                    disabled: abcEntries.length < 3,
                },
                {
                    id: 'overview',
                    icon: '📊',
                    title: t('behavior_lens.hub.overview_title') || 'Behavior Overview',
                    desc: t('behavior_lens.hub.overview_desc') || 'Visual dashboard with trends, heatmap, and data summaries',
                    color: 'sky',
                    badge: (abcEntries.length + observationSessions.length) > 0 ? `${abcEntries.length + observationSessions.length} records` : null,
                },
                {
                    id: 'frequency',
                    icon: '🔢',
                    title: t('behavior_lens.hub.freq_title') || 'Frequency Counter',
                    desc: t('behavior_lens.hub.freq_desc') || 'Quick-click tap counter for rapid in-class behavior tallying',
                    color: 'amber',
                },
                {
                    id: 'interval',
                    icon: '⏱️',
                    title: t('behavior_lens.hub.interval_title') || 'Interval Recording',
                    desc: t('behavior_lens.hub.interval_desc') || 'Visual grid with partial, whole, and momentary recording modes',
                    color: 'teal',
                },
                {
                    id: 'token',
                    icon: '⭐',
                    title: t('behavior_lens.hub.token_title') || 'Token Board',
                    desc: t('behavior_lens.hub.token_desc') || 'Visual reinforcement tracker for positive behavior support',
                    color: 'rose',
                },
                {
                    id: 'hotspot',
                    icon: '🗓️',
                    title: t('behavior_lens.hub.hotspot_title') || 'Routine Hotspot Matrix',
                    desc: t('behavior_lens.hub.hotspot_desc') || 'Map behavioral patterns to daily routine periods with AI analysis',
                    color: 'orange',
                },
                {
                    id: 'export',
                    icon: '📥',
                    title: t('behavior_lens.hub.export_title') || 'Export Data',
                    desc: t('behavior_lens.hub.export_desc') || 'Download behavioral data as JSON or formatted text reports',
                    color: 'slate',
                },
                {
                    id: 'record',
                    icon: '📄',
                    title: t('behavior_lens.hub.record_title') || 'Record Review',
                    desc: t('behavior_lens.hub.record_desc') || 'Paste IEP/eval text for AI-powered structured summary',
                    color: 'cyan',
                },
                {
                    id: 'hypothesis',
                    icon: '🔗',
                    title: t('behavior_lens.hub.hypothesis_title') || 'Hypothesis Diagram',
                    desc: t('behavior_lens.hub.hypothesis_desc') || 'Visual function hypothesis flow from ABC data with AI generation',
                    color: 'violet',
                    disabled: abcEntries.length < 2,
                },
                {
                    id: 'goals',
                    icon: '🎯',
                    title: t('behavior_lens.hub.goals_title') || 'SMART Goal Builder',
                    desc: t('behavior_lens.hub.goals_desc') || 'Step-by-step behavioral goal construction with AI suggestions',
                    color: 'lime',
                },
                {
                    id: 'contract',
                    icon: '📜',
                    title: t('behavior_lens.hub.contract_title') || 'Behavior Contract',
                    desc: t('behavior_lens.hub.contract_desc') || 'AI-drafted contract with student and teacher sections',
                    color: 'fuchsia',
                },
                {
                    id: 'cycle',
                    icon: '🔄',
                    title: t('behavior_lens.hub.cycle_title') || 'Escalation Cycle',
                    desc: t('behavior_lens.hub.cycle_desc') || 'Colvin & Sugai 7-phase emotional regulation model with personalized strategies',
                    color: 'red',
                },
                {
                    id: 'reinforcer',
                    icon: '🏆',
                    title: t('behavior_lens.hub.reinforcer_title') || 'Reinforcer Assessment',
                    desc: t('behavior_lens.hub.reinforcer_desc') || 'Preference inventory with AI-recommended reinforcers',
                    color: 'pink',
                },
                {
                    id: 'choice',
                    icon: '🃏',
                    title: t('behavior_lens.hub.choice_title') || 'Choice Board',
                    desc: t('behavior_lens.hub.choice_desc') || 'Fullscreen student-facing visual choice overlay',
                    color: 'emerald',
                },
                {
                    id: 'audit',
                    icon: '🏫',
                    title: t('behavior_lens.hub.audit_title') || 'Environment Audit',
                    desc: t('behavior_lens.hub.audit_desc') || '8-item classroom environment checklist with AI recommendations',
                    color: 'blue',
                },
                {
                    id: 'triangulation',
                    icon: '🔺',
                    title: t('behavior_lens.hub.triangulation_title') || 'Data Triangulation',
                    desc: t('behavior_lens.hub.triangulation_desc') || 'Cross-reference ABC, observations, and AI analysis for convergence',
                    color: 'zinc',
                },
                {
                    id: 'impact',
                    icon: '⏱️',
                    title: t('behavior_lens.hub.impact_title') || 'Impact Calculator',
                    desc: t('behavior_lens.hub.impact_desc') || 'Quantify lost instructional time and estimated annual cost',
                    color: 'yellow',
                },
                {
                    id: 'crisis',
                    icon: '🚨',
                    title: t('behavior_lens.hub.crisis_title') || 'Crisis Plan',
                    desc: t('behavior_lens.hub.crisis_desc') || '3-tier emergency protocol with AI-drafted safety plan',
                    color: 'stone',
                },
                {
                    id: 'traffic',
                    icon: '🚦',
                    title: t('behavior_lens.hub.traffic_title') || 'Traffic Light',
                    desc: t('behavior_lens.hub.traffic_desc') || 'Student-facing red/yellow/green behavior zone poster',
                    color: 'green',
                },
                {
                    id: 'datasheet',
                    icon: '📋',
                    title: t('behavior_lens.hub.datasheet_title') || 'Data Sheet',
                    desc: t('behavior_lens.hub.datasheet_desc') || 'Printable frequency, duration, ABC, or latency data sheets',
                    color: 'neutral',
                },
                {
                    id: 'homenote',
                    icon: '📝',
                    title: t('behavior_lens.hub.homenote_title') || 'Home Note',
                    desc: t('behavior_lens.hub.homenote_desc') || 'AI-drafted parent communication with tone selector',
                    color: 'warmGray',
                },
                {
                    id: 'fidelity',
                    icon: '✅',
                    title: t('behavior_lens.hub.fidelity_title') || 'Fidelity Checklist',
                    desc: t('behavior_lens.hub.fidelity_desc') || 'AI-generated daily BIP implementation checklist',
                    color: 'coolGray',
                },
                {
                    id: 'feasibility',
                    icon: '⚖️',
                    title: t('behavior_lens.hub.feasibility_title') || 'Feasibility Check',
                    desc: t('behavior_lens.hub.feasibility_desc') || '5-question contextual fit assessment with AI recommendations',
                    color: 'trueGray',
                },
                {
                    id: 'gas',
                    icon: '📐',
                    title: t('behavior_lens.hub.gas_title') || 'GAS Rubric',
                    desc: t('behavior_lens.hub.gas_desc') || 'Goal Attainment Scaling with AI-generated descriptors',
                    color: 'blueGray',
                },
                {
                    id: 'pocket',
                    icon: '📇',
                    title: t('behavior_lens.hub.pocket_title') || 'Pocket BIP',
                    desc: t('behavior_lens.hub.pocket_desc') || 'Compact index-card BIP summary for clipboard carry',
                    color: 'darkGray',
                },
                {
                    id: 'abaguide',
                    icon: '📚',
                    title: t('behavior_lens.hub.abaguide_title') || 'ABA Quick Guide',
                    desc: t('behavior_lens.hub.abaguide_desc') || 'Searchable glossary, reinforcement schedules, decision tree & common mistakes',
                    color: 'indigo',
                },
                {
                    id: 'counseling',
                    icon: '🎭',
                    title: t('behavior_lens.hub.counseling_title') || 'Counseling Simulation',
                    desc: t('behavior_lens.hub.counseling_desc') || 'AI role-play with student personas for counseling practice',
                    color: 'teal',
                },
                {
                    id: 'snapshot',
                    icon: '📦',
                    title: t('behavior_lens.hub.snapshot_title') || 'Student Snapshot Exchange',
                    desc: t('behavior_lens.hub.snapshot_desc') || 'Export & import JSON snapshots for parent–teacher data exchange',
                    color: 'cyan',
                },
                {
                    id: 'consent',
                    icon: '📋',
                    title: t('behavior_lens.hub.consent_title') || 'FERPA Consent Manager',
                    desc: t('behavior_lens.hub.consent_desc') || 'Customizable consent form for parent data exchange — edit, print, share as JSON',
                    color: 'rose',
                },
                {
                    id: 'homelog',
                    icon: '🏠',
                    title: t('behavior_lens.hub.homelog_title') || 'Home Behavior Log',
                    desc: t('behavior_lens.hub.homelog_desc') || 'Simplified parent-friendly behavior logging with everyday language',
                    color: 'blue',
                },
            ].filter(tool => !isParentMode || parentTools.includes(tool.id));

            const colorClasses = {
                indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', hover: 'hover:border-indigo-400 hover:shadow-indigo-100' },
                emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', hover: 'hover:border-emerald-400 hover:shadow-emerald-100' },
                purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', hover: 'hover:border-purple-400 hover:shadow-purple-100' },
                sky: { bg: 'bg-sky-50', border: 'border-sky-200', icon: 'bg-sky-100 text-sky-600', hover: 'hover:border-sky-400 hover:shadow-sky-100' },
                amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', hover: 'hover:border-amber-400 hover:shadow-amber-100' },
                teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'bg-teal-100 text-teal-600', hover: 'hover:border-teal-400 hover:shadow-teal-100' },
                rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600', hover: 'hover:border-rose-400 hover:shadow-rose-100' },
                orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', hover: 'hover:border-orange-400 hover:shadow-orange-100' },
                slate: { bg: 'bg-slate-50', border: 'border-slate-200', icon: 'bg-slate-100 text-slate-600', hover: 'hover:border-slate-400 hover:shadow-slate-100' },
                cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'bg-cyan-100 text-cyan-600', hover: 'hover:border-cyan-400 hover:shadow-cyan-100' },
                violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-600', hover: 'hover:border-violet-400 hover:shadow-violet-100' },
                lime: { bg: 'bg-lime-50', border: 'border-lime-200', icon: 'bg-lime-100 text-lime-600', hover: 'hover:border-lime-400 hover:shadow-lime-100' },
                fuchsia: { bg: 'bg-fuchsia-50', border: 'border-fuchsia-200', icon: 'bg-fuchsia-100 text-fuchsia-600', hover: 'hover:border-fuchsia-400 hover:shadow-fuchsia-100' },
                red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600', hover: 'hover:border-red-400 hover:shadow-red-100' },
                pink: { bg: 'bg-pink-50', border: 'border-pink-200', icon: 'bg-pink-100 text-pink-600', hover: 'hover:border-pink-400 hover:shadow-pink-100' },
                blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', hover: 'hover:border-blue-400 hover:shadow-blue-100' },
                zinc: { bg: 'bg-zinc-50', border: 'border-zinc-200', icon: 'bg-zinc-100 text-zinc-600', hover: 'hover:border-zinc-400 hover:shadow-zinc-100' },
                yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600', hover: 'hover:border-yellow-400 hover:shadow-yellow-100' },
                stone: { bg: 'bg-stone-50', border: 'border-stone-200', icon: 'bg-stone-100 text-stone-600', hover: 'hover:border-stone-400 hover:shadow-stone-100' },
                green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100 text-green-600', hover: 'hover:border-green-400 hover:shadow-green-100' },
                neutral: { bg: 'bg-neutral-50', border: 'border-neutral-200', icon: 'bg-neutral-100 text-neutral-600', hover: 'hover:border-neutral-400 hover:shadow-neutral-100' },
                warmGray: { bg: 'bg-stone-50', border: 'border-stone-300', icon: 'bg-stone-100 text-stone-700', hover: 'hover:border-stone-400 hover:shadow-stone-100' },
                coolGray: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-100 text-gray-600', hover: 'hover:border-gray-400 hover:shadow-gray-100' },
                trueGray: { bg: 'bg-neutral-50', border: 'border-neutral-300', icon: 'bg-neutral-100 text-neutral-700', hover: 'hover:border-neutral-500 hover:shadow-neutral-100' },
                blueGray: { bg: 'bg-slate-50', border: 'border-slate-300', icon: 'bg-slate-100 text-slate-700', hover: 'hover:border-slate-500 hover:shadow-slate-100' },
                darkGray: { bg: 'bg-zinc-50', border: 'border-zinc-300', icon: 'bg-zinc-100 text-zinc-700', hover: 'hover:border-zinc-500 hover:shadow-zinc-100' },
            };

            return h('div', { className: 'max-w-4xl mx-auto' },
                // Student selector
                h('div', { className: 'mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                    h('label', { className: 'block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide' },
                        '👤 ', t('behavior_lens.hub.select_student') || 'Select Student'
                    ),
                    studentOptions.length > 0
                        // When dashboard data exists, show a single dropdown of known students
                        ? h('div', { className: 'flex gap-3 items-center' },
                            h('select', {
                                value: selectedStudent,
                                onChange: (e) => setSelectedStudent(e.target.value),
                                className: 'flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium'
                            },
                                h('option', { value: '' }, t('behavior_lens.hub.choose_student') || '— Choose a student —'),
                                studentOptions.map(name => h('option', { key: name, value: name }, name))
                            ),
                            selectedStudent && h('div', { className: 'flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200' },
                                h('div', { className: 'w-2 h-2 rounded-full bg-indigo-500' }),
                                h('span', { className: 'text-xs font-bold text-indigo-700' }, selectedStudent)
                            )
                        )
                        // When no dashboard data, show the two-dropdown codename picker (adjective + animal)
                        : h('div', { className: 'bg-indigo-50 p-4 rounded-xl border border-indigo-100' },
                            h('div', { className: 'flex gap-2 mb-3' },
                                h('select', {
                                    value: selectedAdj,
                                    onChange: (e) => {
                                        setSelectedAdj(e.target.value);
                                        if (e.target.value && selectedAnimal) setSelectedStudent(`${e.target.value} ${selectedAnimal}`);
                                    },
                                    className: 'w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer bg-white'
                                },
                                    h('option', { value: '' }, t('behavior_lens.hub.pick_adjective') || '— Adjective —'),
                                    adjectives.map((adj, i) => h('option', { key: i, value: adj }, adj))
                                ),
                                h('select', {
                                    value: selectedAnimal,
                                    onChange: (e) => {
                                        setSelectedAnimal(e.target.value);
                                        if (selectedAdj && e.target.value) setSelectedStudent(`${selectedAdj} ${e.target.value}`);
                                    },
                                    className: 'w-1/2 p-2 rounded-lg border border-indigo-200 text-indigo-900 font-bold text-sm focus:ring-2 focus:ring-indigo-400 outline-none cursor-pointer bg-white'
                                },
                                    h('option', { value: '' }, t('behavior_lens.hub.pick_animal') || '— Animal —'),
                                    animals.map((anim, i) => h('option', { key: i, value: anim }, anim))
                                )
                            ),
                            h('div', { className: 'flex items-center justify-between bg-white p-3 rounded-xl shadow-sm border border-indigo-100' },
                                h('div', { className: 'text-xl font-black text-indigo-600 tracking-tight truncate mr-2' },
                                    selectedAdj && selectedAnimal ? `${selectedAdj} ${selectedAnimal}` : (t('behavior_lens.hub.no_codename') || 'Pick a codename...')
                                ),
                                h('button', {
                                    onClick: randomizeName,
                                    className: 'p-2 bg-indigo-100 text-indigo-600 rounded-full hover:bg-indigo-200 hover:scale-110 transition-all shrink-0',
                                    title: t('behavior_lens.hub.randomize') || 'Randomize'
                                }, '🎲')
                            )
                        )
                ),
                // Tool cards grid
                h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
                    tools.map(tool => {
                        const cc = colorClasses[tool.color];
                        return h('button', {
                            key: tool.id,
                            onClick: () => {
                                if (tool.disabled) return;
                                if (tool.id === 'abc') setActivePanel('abc');
                                else if (tool.id === 'observation') setShowLiveObs(true);
                                else if (tool.id === 'analysis') handleAiAnalyze();
                                else if (tool.id === 'overview') setActivePanel('overview');
                                else if (tool.id === 'frequency') setShowFreqCounter(true);
                                else if (tool.id === 'interval') setShowIntervalGrid(true);
                                else if (tool.id === 'token') setActivePanel('token');
                                else if (tool.id === 'hotspot') setActivePanel('hotspot');
                                else if (tool.id === 'export') setActivePanel('export');
                                else if (tool.id === 'record') setActivePanel('record');
                                else if (tool.id === 'hypothesis') setActivePanel('hypothesis');
                                else if (tool.id === 'goals') setActivePanel('goals');
                                else if (tool.id === 'contract') setActivePanel('contract');
                                else if (tool.id === 'cycle') setActivePanel('cycle');
                                else if (tool.id === 'reinforcer') setActivePanel('reinforcer');
                                else if (tool.id === 'choice') setShowChoiceBoard(true);
                                else if (tool.id === 'audit') setActivePanel('audit');
                                else if (tool.id === 'triangulation') setActivePanel('triangulation');
                                else if (tool.id === 'impact') setActivePanel('impact');
                                else if (tool.id === 'crisis') setActivePanel('crisis');
                                else if (tool.id === 'traffic') setActivePanel('traffic');
                                else if (tool.id === 'datasheet') setActivePanel('datasheet');
                                else if (tool.id === 'homenote') setActivePanel('homenote');
                                else if (tool.id === 'fidelity') setActivePanel('fidelity');
                                else if (tool.id === 'feasibility') setActivePanel('feasibility');
                                else if (tool.id === 'gas') setActivePanel('gas');
                                else if (tool.id === 'pocket') setActivePanel('pocket');
                                else if (tool.id === 'abaguide') setActivePanel('abaguide');
                                else if (tool.id === 'homelog') setActivePanel('homelog');
                            },
                            disabled: tool.disabled || (!selectedStudent && !['analysis', 'export', 'record', 'abaguide'].includes(tool.id)),
                            className: `text-left p-5 rounded-xl border-2 transition-all ${cc.border} ${cc.hover} bg-white shadow-sm hover:shadow-md ${tool.disabled || !selectedStudent ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                                }`
                        },
                            h('div', { className: `w-12 h-12 rounded-xl ${cc.icon} flex items-center justify-center text-2xl mb-3` }, tool.icon),
                            h('h4', { className: 'text-sm font-black text-slate-800 mb-1' }, tool.title),
                            h('p', { className: 'text-xs text-slate-500 leading-relaxed' }, tool.desc),
                            tool.badge && h('div', { className: `mt-3 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${cc.bg} text-slate-600` }, tool.badge)
                        );
                    })
                ),
                // AI Analysis results
                aiAnalysis && h('div', { className: 'mt-6 bg-white rounded-xl border border-purple-200 p-5 shadow-sm animate-in slide-in-from-bottom-4 duration-300' },
                    h('div', { className: 'flex items-center justify-between mb-4' },
                        h('h3', { className: 'text-lg font-black text-slate-800 flex items-center gap-2' }, '🧠 ', t('behavior_lens.analysis.title') || 'AI Analysis Results'),
                        h('button', {
                            onClick: () => setAiAnalysis(null),
                            className: 'text-xs text-slate-400 hover:text-slate-600 p-1'
                        }, h(X, { size: 14 }))
                    ),
                    // Summary
                    h('div', { className: 'mb-4 p-4 bg-slate-50 rounded-lg' },
                        h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, aiAnalysis.summary)
                    ),
                    // Hypothesized function
                    aiAnalysis.hypothesizedFunction && (() => {
                        const fc = FUNCTION_COLORS[aiAnalysis.hypothesizedFunction] || FUNCTION_COLORS['Attention'];
                        return h('div', {
                            className: 'mb-4 p-4 rounded-lg border-2 flex items-center justify-between',
                            style: { background: fc.bg, borderColor: fc.border }
                        },
                            h('div', null,
                                h('div', { className: 'text-xs font-bold uppercase tracking-wide', style: { color: fc.text } },
                                    t('behavior_lens.analysis.hypothesized_function') || 'Hypothesized Function'
                                ),
                                h('div', { className: 'text-lg font-black mt-0.5', style: { color: fc.text } },
                                    fc.emoji, ' ', aiAnalysis.hypothesizedFunction
                                )
                            ),
                            h('div', { className: 'text-right' },
                                h('div', { className: 'text-2xl font-black', style: { color: fc.text } }, `${aiAnalysis.confidence}%`),
                                h('div', { className: 'text-[10px] font-bold', style: { color: fc.text } }, t('behavior_lens.analysis.confidence') || 'Confidence')
                            )
                        );
                    })(),
                    // Patterns
                    aiAnalysis.patterns && aiAnalysis.patterns.length > 0 && h('div', { className: 'mb-4' },
                        h('h4', { className: 'text-xs font-bold text-slate-600 uppercase mb-2' }, '📊 ', t('behavior_lens.analysis.patterns') || 'Patterns Identified'),
                        h('div', { className: 'space-y-2' },
                            aiAnalysis.patterns.map((p, i) =>
                                h('div', { key: i, className: 'text-xs p-3 bg-slate-50 rounded-lg border border-slate-100' },
                                    h('span', { className: 'font-bold text-slate-700' }, p.pattern),
                                    p.frequency && h('span', { className: 'text-slate-400 ml-2' }, `(${p.frequency})`)
                                )
                            )
                        )
                    ),
                    // Recommendations
                    aiAnalysis.recommendations && aiAnalysis.recommendations.length > 0 && h('div', null,
                        h('h4', { className: 'text-xs font-bold text-slate-600 uppercase mb-2' }, '💡 ', t('behavior_lens.analysis.recommendations') || 'Recommendations'),
                        h('ul', { className: 'space-y-1.5' },
                            aiAnalysis.recommendations.map((rec, i) =>
                                h('li', { key: i, className: 'text-xs text-slate-600 flex items-start gap-2' },
                                    h('span', { className: 'text-green-500 mt-0.5 shrink-0' }, '✓'),
                                    rec
                                )
                            )
                        )
                    )
                ),
                // Recent observation sessions
                observationSessions.length > 0 && h('div', { className: 'mt-6 bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                    h('h3', { className: 'text-sm font-black text-slate-800 mb-3' },
                        '📊 ', t('behavior_lens.hub.recent_sessions') || 'Recent Observation Sessions'
                    ),
                    h('div', { className: 'space-y-2' },
                        observationSessions.slice(0, 5).map(session =>
                            h('div', { key: session.id, className: 'flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-xs' },
                                h('div', null,
                                    h('span', { className: 'font-bold text-slate-700' }, fmtDate(session.timestamp)),
                                    h('span', { className: 'text-slate-400 ml-2' }, session.method)
                                ),
                                h('div', { className: 'text-slate-500' },
                                    session.method === 'frequency' ? `${session.data?.count || 0} occurrences` :
                                        session.method === 'duration' ? `${session.data?.durations?.length || 0} episodes` :
                                            session.method === 'interval' ? `${session.data?.occurredCount || 0}/${session.data?.totalIntervals || 0} intervals` :
                                                session.data?.latencyMs ? `${(session.data.latencyMs / 1000).toFixed(1)}s latency` : '',
                                    ` — ${fmtDuration(session.duration)}`
                                )
                            )
                        )
                    )
                ),
                // No student selected warning
                !selectedStudent && h('div', { className: 'mt-6 text-center py-8 bg-amber-50 rounded-xl border border-amber-200' },
                    h('div', { className: 'text-3xl mb-2' }, '👆'),
                    h('p', { className: 'text-sm font-bold text-amber-700' },
                        t('behavior_lens.hub.select_student_first') || 'Select a student above to get started'
                    )
                )
            );
        };

        // ─── Main Render ──────────────────────────────────────────────
        return h('div', {
            className: 'fixed inset-0 z-[200] bg-slate-100 flex flex-col animate-in fade-in duration-300'
        },
            // Top bar
            h('div', { className: 'bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm shrink-0 z-10' },
                h('div', { className: 'px-6 py-4 flex items-center justify-between' },
                    h('div', { className: 'flex items-center gap-3' },
                        activePanel !== 'hub' && h('button', {
                            onClick: () => setActivePanel('hub'),
                            className: 'p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 mr-1 transition-colors'
                        }, h(ArrowLeft, { size: 18 })),
                        h('div', { className: 'bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-xl text-white shadow-md' },
                            h(Eye, { size: 22 })
                        ),
                        h('div', null,
                            h('h2', { className: 'text-xl font-black text-slate-800' },
                                t('behavior_lens.title') || 'BehaviorLens'
                            ),
                            h('p', { className: 'text-xs text-slate-500' },
                                activePanel === 'hub' ? (t('behavior_lens.subtitle') || 'Behavioral Observation & Analysis') :
                                    activePanel === 'abc' ? (t('behavior_lens.abc.title') || 'ABC Data Collection') :
                                        activePanel === 'overview' ? (t('behavior_lens.overview.title') || 'Behavior Overview') :
                                            activePanel === 'token' ? (t('behavior_lens.token.title') || 'Token Board') :
                                                activePanel === 'hotspot' ? (t('behavior_lens.hotspot.title') || 'Routine Hotspot Matrix') :
                                                    activePanel === 'export' ? (t('behavior_lens.export.title') || 'Export Data') :
                                                        activePanel === 'record' ? (t('behavior_lens.record.title') || 'Record Review') :
                                                            activePanel === 'hypothesis' ? (t('behavior_lens.hypothesis.title') || 'Hypothesis Diagram') :
                                                                activePanel === 'goals' ? (t('behavior_lens.goals.title') || 'SMART Goal Builder') :
                                                                    activePanel === 'contract' ? (t('behavior_lens.contract.title') || 'Behavior Contract') :
                                                                        activePanel === 'cycle' ? (t('behavior_lens.cycle.title') || 'Escalation Cycle') :
                                                                            activePanel === 'reinforcer' ? (t('behavior_lens.reinforcer.title') || 'Reinforcer Assessment') :
                                                                                activePanel === 'audit' ? (t('behavior_lens.audit.title') || 'Environment Audit') :
                                                                                    activePanel === 'triangulation' ? (t('behavior_lens.triangulation.title') || 'Data Triangulation') :
                                                                                        activePanel === 'impact' ? (t('behavior_lens.impact.title') || 'Impact Calculator') :
                                                                                            activePanel === 'crisis' ? (t('behavior_lens.crisis.title') || 'Crisis Plan') :
                                                                                                activePanel === 'traffic' ? (t('behavior_lens.traffic.title') || 'Traffic Light') :
                                                                                                    activePanel === 'datasheet' ? (t('behavior_lens.datasheet.title') || 'Data Sheet Generator') :
                                                                                                        activePanel === 'homenote' ? (t('behavior_lens.homenote.title') || 'Home Note') :
                                                                                                            activePanel === 'fidelity' ? (t('behavior_lens.fidelity.title') || 'Fidelity Checklist') :
                                                                                                                activePanel === 'feasibility' ? (t('behavior_lens.feasibility.title') || 'Feasibility Check') :
                                                                                                                    activePanel === 'gas' ? (t('behavior_lens.gas.title') || 'GAS Rubric') :
                                                                                                                        activePanel === 'pocket' ? (t('behavior_lens.pocket.title') || 'Pocket BIP') :
                                                                                                                            activePanel === 'abaguide' ? (t('behavior_lens.abaguide.title') || 'ABA Quick Guide') :
                                                                                                                                activePanel === 'counseling' ? (t('behavior_lens.counseling.title') || 'Counseling Simulation') :
                                                                                                                                    activePanel === 'snapshot' ? (t('behavior_lens.snapshot.title') || 'Student Snapshot Exchange') :
                                                                                                                                        activePanel === 'consent' ? (t('behavior_lens.consent.title') || 'FERPA Consent Manager') :
                                                                                                                                            activePanel === 'homelog' ? (t('behavior_lens.homelog.title') || 'Home Behavior Log') : ''
                            )
                        )
                    ),
                    h('div', { className: 'flex items-center gap-2' },
                        // Parent Mode toggle
                        activePanel === 'hub' && h('button', {
                            onClick: () => setIsParentMode(p => !p),
                            className: `px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${isParentMode
                                ? 'bg-blue-500 text-white border-blue-500 shadow-md'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-blue-300 hover:text-blue-500'}`
                        }, isParentMode ? '👨‍👩‍👧 Family Mode' : '👨‍👩‍👧 Family'),
                        h('button', {
                            onClick: onClose,
                            className: 'p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors'
                        }, h(X, { size: 24 }))
                    )
                )
            ),
            // Content area
            h('div', { className: 'flex-1 overflow-y-auto p-6' },
                activePanel === 'hub' && renderHub(),
                activePanel === 'abc' && h(ABCDataPanel, {
                    entries: abcEntries,
                    setEntries: setAbcEntries,
                    studentName: selectedStudent,
                    onAnalyze: handleAiAnalyze,
                    analyzing,
                    t,
                    addToast
                }),
                activePanel === 'overview' && h(OverviewPanel, {
                    abcEntries,
                    observationSessions,
                    aiAnalysis,
                    studentName: selectedStudent,
                    t
                }),
                activePanel === 'token' && h(TokenBoard, {
                    onClose: () => setActivePanel('hub'),
                    studentName: selectedStudent,
                    t,
                    addToast
                }),
                activePanel === 'hotspot' && h(HotspotMatrix, {
                    abcEntries,
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'export' && h(ExportPanel, {
                    abcEntries,
                    observationSessions,
                    studentName: selectedStudent,
                    aiAnalysis,
                    t
                }),
                activePanel === 'record' && h(RecordReview, {
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'hypothesis' && h(HypothesisDiagram, {
                    abcEntries,
                    aiAnalysis,
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'goals' && h(SmartGoalBuilder, {
                    abcEntries,
                    aiAnalysis,
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'contract' && h(BehaviorContract, {
                    studentName: selectedStudent,
                    abcEntries,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'cycle' && h(EscalationCycle, {
                    abcEntries,
                    aiAnalysis,
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'reinforcer' && h(ReinforcerAssessment, {
                    studentName: selectedStudent,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'audit' && h(EnvironmentAudit, {
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'triangulation' && h(TriangulationCheck, {
                    abcEntries,
                    observationSessions,
                    aiAnalysis,
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'impact' && h(ImpactCalculator, {
                    abcEntries,
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'crisis' && h(CrisisIntervention, {
                    studentName: selectedStudent,
                    abcEntries,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'traffic' && h(TrafficLightVisual, {
                    studentName: selectedStudent,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'datasheet' && h(DataSheetGenerator, {
                    studentName: selectedStudent,
                    t,
                    addToast
                }),
                activePanel === 'homenote' && h(HomeNoteGenerator, {
                    studentName: selectedStudent,
                    abcEntries,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'fidelity' && h(FidelityChecklist, {
                    studentName: selectedStudent,
                    abcEntries,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'feasibility' && h(FeasibilityCheck, {
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'gas' && h(GasRubric, {
                    studentName: selectedStudent,
                    abcEntries,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'pocket' && h(PocketBip, {
                    studentName: selectedStudent,
                    abcEntries,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'abaguide' && h(ABAQuickGuide, { t }),
                activePanel === 'homelog' && h(HomeBehaviorLog, {
                    studentName: selectedStudent,
                    t,
                    addToast
                }),
                activePanel === 'counseling' && h(CounselingSimulation, {
                    studentName: selectedStudent,
                    abcEntries,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'snapshot' && h(SnapshotExchange, {
                    studentName: selectedStudent,
                    abcEntries,
                    observationSessions,
                    aiAnalysis,
                    setAbcEntries,
                    setObservationSessions,
                    t,
                    addToast
                }),
                activePanel === 'consent' && h(ConsentManager, {
                    studentName: selectedStudent,
                    t,
                    addToast
                })
            ),
            // Fullscreen live observation overlay
            showLiveObs && h(LiveObsOverlay, {
                onClose: () => setShowLiveObs(false),
                studentName: selectedStudent,
                onSaveSession: handleSaveObsSession,
                t,
                addToast
            }),
            // Fullscreen frequency counter overlay
            showFreqCounter && h(FrequencyCounter, {
                onClose: () => setShowFreqCounter(false),
                studentName: selectedStudent,
                onSaveSession: handleSaveObsSession,
                t,
                addToast
            }),
            // Fullscreen interval grid overlay
            showIntervalGrid && h(IntervalGrid, {
                onClose: () => setShowIntervalGrid(false),
                studentName: selectedStudent,
                onSaveSession: handleSaveObsSession,
                t,
                addToast
            }),
            // Fullscreen choice board overlay
            showChoiceBoard && h(ChoiceBoard, {
                onClose: () => setShowChoiceBoard(false),
                studentName: selectedStudent,
                t,
                addToast
            })
        );
    };

    debugLog("BehaviorLens module registered ✅");
})();
