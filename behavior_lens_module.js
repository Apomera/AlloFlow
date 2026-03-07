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
            'Physical aggression', 'Verbal disruption', 'Elopement', 'Non-compliance',
            'Self-injury', 'Property destruction', 'Withdrawal', 'Tantrum', 'Other'
        ],
        consequence: [
            'Verbal redirect', 'Given break', 'Removed from area', 'Peer attention',
            'Adult attention', 'Task removed', 'Ignored', 'Reinforcement given', 'Other'
        ]
    };

    const FUNCTION_COLORS = {
        'Attention': { bg: '#dbeafe', border: '#3b82f6', text: '#1e40af', emoji: '👀' },
        'Escape': { bg: '#fef3c7', border: '#f59e0b', text: '#92400e', emoji: '🏃' },
        'Tangible': { bg: '#d1fae5', border: '#10b981', text: '#065f46', emoji: '🎁' },
        'Sensory': { bg: '#ede9fe', border: '#8b5cf6', text: '#5b21b6', emoji: '🌀' },
    };

    const OBSERVATION_METHODS = ['frequency', 'duration', 'interval', 'latency'];

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
                            h('span', null, t('behavior_lens.abc.severe') || 'Severe')
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
            ];

            const colorClasses = {
                indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', hover: 'hover:border-indigo-400 hover:shadow-indigo-100' },
                emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', hover: 'hover:border-emerald-400 hover:shadow-emerald-100' },
                purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', hover: 'hover:border-purple-400 hover:shadow-purple-100' },
            };

            return h('div', { className: 'max-w-4xl mx-auto' },
                // Student selector
                h('div', { className: 'mb-6 bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                    h('label', { className: 'block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide' },
                        '👤 ', t('behavior_lens.hub.select_student') || 'Select Student'
                    ),
                    h('div', { className: 'flex gap-3 items-center' },
                        studentOptions.length > 0
                            ? h('select', {
                                value: selectedStudent,
                                onChange: (e) => setSelectedStudent(e.target.value),
                                className: 'flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium'
                            },
                                h('option', { value: '' }, t('behavior_lens.hub.choose_student') || '— Choose a student —'),
                                studentOptions.map(name => h('option', { key: name, value: name }, name))
                            )
                            : h('input', {
                                type: 'text',
                                value: selectedStudent,
                                onChange: (e) => setSelectedStudent(e.target.value),
                                placeholder: t('behavior_lens.hub.enter_codename') || 'Enter student codename...',
                                className: 'flex-1 text-sm border border-slate-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-400'
                            }),
                        selectedStudent && h('div', { className: 'flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-50 border border-indigo-200' },
                            h('div', { className: 'w-2 h-2 rounded-full bg-indigo-500' }),
                            h('span', { className: 'text-xs font-bold text-indigo-700' }, selectedStudent)
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
                                if (tool.id === 'observation') setShowLiveObs(true);
                                if (tool.id === 'analysis') handleAiAnalyze();
                            },
                            disabled: tool.disabled || (!selectedStudent && tool.id !== 'analysis'),
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
                                    activePanel === 'abc' ? (t('behavior_lens.abc.title') || 'ABC Data Collection') : ''
                            )
                        )
                    ),
                    h('button', {
                        onClick: onClose,
                        className: 'p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors'
                    }, h(X, { size: 24 }))
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
                })
            ),
            // Fullscreen live observation overlay
            showLiveObs && h(LiveObsOverlay, {
                onClose: () => setShowLiveObs(false),
                studentName: selectedStudent,
                onSaveSession: handleSaveObsSession,
                t,
                addToast
            })
        );
    };

    debugLog("BehaviorLens module registered ✅");
})();
