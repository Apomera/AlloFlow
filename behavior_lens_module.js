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

    // ─── OverviewPanel ───────────────────────────────────────────────────
    // Visual dashboard summarizing all behavioral data
    const OverviewPanel = ({ abcEntries, observationSessions, aiAnalysis, studentName, t }) => {
        const stats = useMemo(() => {
            const now = new Date();
            const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
            const thisWeek = abcEntries.filter(e => new Date(e.timestamp) >= weekAgo);
            const antecedentCounts = {};
            const consequenceCounts = {};
            const settingCounts = {};
            const intensities = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
            const dayMap = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
            abcEntries.forEach(e => {
                if (e.antecedent) antecedentCounts[e.antecedent] = (antecedentCounts[e.antecedent] || 0) + 1;
                if (e.consequence) consequenceCounts[e.consequence] = (consequenceCounts[e.consequence] || 0) + 1;
                if (e.setting) settingCounts[e.setting] = (settingCounts[e.setting] || 0) + 1;
                if (e.intensity) intensities[e.intensity] = (intensities[e.intensity] || 0) + 1;
                const d = new Date(e.timestamp);
                if (d >= weekAgo) dayMap[d.getDay()] = (dayMap[d.getDay()] || 0) + 1;
            });
            const topAntecedents = Object.entries(antecedentCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const topConsequences = Object.entries(consequenceCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
            const topSettings = Object.entries(settingCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            const avgIntensity = abcEntries.length > 0 ? (abcEntries.reduce((s, e) => s + (e.intensity || 0), 0) / abcEntries.length).toFixed(1) : '—';
            return { thisWeek, topAntecedents, topConsequences, topSettings, intensities, dayMap, avgIntensity, totalAbc: abcEntries.length, totalObs: observationSessions.length };
        }, [abcEntries, observationSessions]);

        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const maxDay = Math.max(1, ...Object.values(stats.dayMap));

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

        if (stats.totalAbc === 0 && stats.totalObs === 0) {
            return h('div', { className: 'max-w-4xl mx-auto text-center py-16' },
                h('div', { className: 'text-5xl mb-4' }, '📊'),
                h('h3', { className: 'text-lg font-black text-slate-700 mb-2' }, t('behavior_lens.overview.empty_title') || 'No Data Yet'),
                h('p', { className: 'text-sm text-slate-500' }, t('behavior_lens.overview.empty_desc') || 'Start collecting ABC data or run live observations to see trends here.')
            );
        }

        return h('div', { className: 'max-w-4xl mx-auto space-y-6' },
            // Stat cards row
            h('div', { className: 'grid grid-cols-2 md:grid-cols-4 gap-3' },
                renderStatCard('📋', 'ABC Entries', stats.totalAbc, 'indigo'),
                renderStatCard('🔍', 'Observations', stats.totalObs, 'emerald'),
                renderStatCard('📅', 'This Week', stats.thisWeek.length, 'sky'),
                renderStatCard('⚡', 'Avg Intensity', stats.avgIntensity, 'amber')
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
        const [count, setCount] = useState(0);
        const [label, setLabel] = useState('');
        const [running, setRunning] = useState(false);
        const [elapsed, setElapsed] = useState(0);
        const timerRef = useRef(null);

        useEffect(() => {
            if (running) {
                timerRef.current = setInterval(() => setElapsed(p => p + 1), 1000);
            } else if (timerRef.current) {
                clearInterval(timerRef.current);
            }
            return () => { if (timerRef.current) clearInterval(timerRef.current); };
        }, [running]);

        const rate = elapsed > 0 ? (count / (elapsed / 60)).toFixed(1) : '0.0';

        const handleSave = () => {
            if (count === 0) return;
            onSaveSession({
                id: uid(),
                method: 'frequency',
                timestamp: new Date().toISOString(),
                duration: elapsed,
                data: { count, label: label || 'Unlabeled', rate: parseFloat(rate) }
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
                    h('input', {
                        value: label,
                        onChange: (e) => setLabel(e.target.value),
                        placeholder: t('behavior_lens.freq.label_placeholder') || 'Behavior label...',
                        className: 'bg-transparent text-white text-sm text-center border-b border-slate-600 focus:border-indigo-400 outline-none px-4 py-1 mt-1'
                    })
                ),
                h('button', {
                    onClick: handleSave,
                    className: 'px-4 py-2 bg-emerald-500 text-white rounded-full text-sm font-bold hover:bg-emerald-400 transition-colors'
                }, t('behavior_lens.freq.save') || 'Save')
            ),
            // Counter display
            h('div', { className: 'text-center mb-8' },
                h('div', { className: 'text-[120px] md:text-[180px] font-black leading-none tabular-nums tracking-tighter' }, count),
                h('div', { className: 'text-slate-400 text-sm font-medium mt-2' }, `${rate} / min`)
            ),
            // Tap button
            h('button', {
                onClick: () => { setCount(c => c + 1); if (!running) setRunning(true); },
                className: 'w-40 h-40 rounded-full bg-indigo-500 hover:bg-indigo-400 active:scale-95 transition-all shadow-2xl shadow-indigo-500/30 flex items-center justify-center text-4xl font-black'
            }, '+1'),
            // Controls
            h('div', { className: 'flex gap-4 mt-8' },
                h('button', {
                    onClick: () => setCount(c => Math.max(0, c - 1)),
                    className: 'px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 text-sm font-bold transition-colors'
                }, '-1'),
                h('button', {
                    onClick: () => setRunning(!running),
                    className: `px-5 py-2 rounded-full text-sm font-bold transition-colors ${running ? 'bg-amber-500 hover:bg-amber-400' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300'}`
                }, running ? '⏸ Pause' : '▶ Start'),
                h('button', {
                    onClick: () => { setCount(0); setElapsed(0); setRunning(false); },
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
    // Visual reinforcement tracker with configurable token slots
    const TokenBoard = ({ onClose, studentName, t, addToast }) => {
        const [slots, setSlots] = useState(5);
        const [tokens, setTokens] = useState([]);
        const [targetBehavior, setTargetBehavior] = useState('');
        const [reward, setReward] = useState('');
        const [showConfetti, setShowConfetti] = useState(false);
        const tokenEmojis = ['⭐', '🌟', '🏆', '🎯', '💎', '🔥', '🌈', '🦄', '🎵', '💫'];

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

        return h('div', { className: 'max-w-2xl mx-auto space-y-6' },
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
            // Token Board Display
            h('div', { className: `bg-gradient-to-b from-rose-50 to-amber-50 rounded-2xl border-2 border-rose-200 p-8 shadow-lg relative overflow-hidden ${showConfetti ? 'animate-pulse' : ''}` },
                // Header
                h('div', { className: 'text-center mb-6' },
                    h('div', { className: 'text-xs font-bold text-rose-500 uppercase mb-1' }, studentName || ''),
                    targetBehavior && h('div', { className: 'text-lg font-black text-slate-800' }, targetBehavior),
                    reward && h('div', { className: 'text-sm text-amber-600 font-medium mt-1' }, `🎁 ${reward}`)
                ),
                // Token grid
                h('div', { className: 'flex flex-wrap justify-center gap-4 mb-6' },
                    Array.from({ length: slots }, (_, i) => {
                        const earned = tokens[i];
                        const emoji = tokenEmojis[i % tokenEmojis.length];
                        return h('button', {
                            key: i,
                            onClick: () => toggleToken(i),
                            className: `w-16 h-16 md:w-20 md:h-20 rounded-2xl border-3 flex items-center justify-center text-3xl md:text-4xl transition-all transform ${earned
                                ? 'bg-amber-100 border-amber-400 shadow-lg shadow-amber-200/50 scale-110'
                                : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-md opacity-40 hover:opacity-60'
                                }`
                        }, earned ? emoji : '○');
                    })
                ),
                // Progress
                h('div', { className: 'flex items-center gap-3' },
                    h('div', { className: 'flex-1 bg-white rounded-full h-4 overflow-hidden border border-rose-200' },
                        h('div', {
                            className: 'h-full rounded-full transition-all bg-gradient-to-r from-rose-400 to-amber-400',
                            style: { width: `${(earnedCount / slots) * 100}%` }
                        })
                    ),
                    h('span', { className: 'text-sm font-black text-rose-600' }, `${earnedCount}/${slots}`)
                ),
                // Confetti overlay
                showConfetti && h('div', { className: 'absolute inset-0 flex items-center justify-center bg-white/60 rounded-2xl' },
                    h('div', { className: 'text-center' },
                        h('div', { className: 'text-6xl mb-2 animate-bounce' }, '🎉'),
                        h('div', { className: 'text-2xl font-black text-rose-600' }, t('behavior_lens.token.success') || 'Great Job!'),
                        reward && h('div', { className: 'text-lg text-amber-600 font-bold mt-1' }, `🎁 ${reward}`)
                    )
                )
            ),
            // Reset button
            h('div', { className: 'text-center' },
                h('button', {
                    onClick: () => { setTokens([]); setShowConfetti(false); },
                    className: 'px-6 py-2 bg-slate-100 text-slate-600 rounded-full text-sm font-bold hover:bg-slate-200 transition-all'
                }, '↺ ' + (t('behavior_lens.token.reset') || 'Reset Board'))
            )
        );
    };

    // ─── HotspotMatrix ──────────────────────────────────────────────────
    // Maps behavior incidents to daily routines
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
                    .map(([routine, count]) => `${routine}: ${count} incidents`)
                    .join('\n');
                const prompt = `You are a BCBA analyzing a behavior hotspot matrix for a student.

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
    // Export behavioral data as JSON or summary text
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

        const handleExport = () => {
            let content, filename, type;
            if (format === 'json') {
                const data = {
                    student: studentName,
                    exportDate: new Date().toISOString(),
                    abcEntries: filteredAbc,
                    observationSessions: filteredObs,
                    aiAnalysis: aiAnalysis || null
                };
                content = JSON.stringify(data, null, 2);
                filename = `behaviorlens_${(studentName || 'student').replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
                type = 'application/json';
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
                filename = `behaviorlens_${(studentName || 'student').replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
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
                        [['json', '📦 JSON'], ['text', '📝 Text Report']].map(([key, label]) =>
                            h('button', {
                                key, onClick: () => setFormat(key),
                                className: `flex-1 py-2 rounded-lg text-sm font-bold transition-all ${format === key ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                            }, label)
                        )
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
        const [consequences, setConsequences] = useState('');
        const [duration, setDuration] = useState('2 weeks');
        const [drafting, setDrafting] = useState(false);
        const [drafted, setDrafted] = useState(false);

        const handleDraft = async () => {
            if (!callGemini) return;
            setDrafting(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'unknown';
                const prompt = `You are a BCBA drafting a behavior contract for a student (codename: "${studentName || 'Student'}").

Hypothesized function: ${funcStr}
${aiAnalysis?.summary ? 'Analysis: ' + aiAnalysis.summary : ''}
ABC entries: ${abcEntries.length}

Generate a behavior contract and return ONLY valid JSON:
{
  "targetBehavior": "operationally defined target behavior",
  "studentExpectations": "what the student agrees to do (2-3 bullet points joined with semicolons)",
  "rewards": "positive reinforcement for meeting expectations",
  "teacherSupports": "what the teacher will provide (2-3 bullet points joined with semicolons)",
  "consequences": "what happens if expectations are not met",
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
                setConsequences(parsed.consequences || '');
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
                        h('h4', { className: 'text-xs font-black text-red-700 uppercase mb-2' }, '⚠️ If Not Met'),
                        h('textarea', { value: consequences, onChange: (e) => setConsequences(e.target.value), rows: 2, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-red-100 resize-none outline-none' })
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

    // ─── ActingOutCycle ─────────────────────────────────────────────────
    // Colvin & Sugai 7-phase acting-out cycle visualizer
    const ActingOutCycle = ({ abcEntries, aiAnalysis, studentName, callGemini, t, addToast }) => {
        const phases = [
            { name: 'Calm', icon: '😌', color: '#22c55e', bg: '#f0fdf4', signs: 'Cooperative, on-task, following routines', response: 'Reinforce positive behavior, build rapport' },
            { name: 'Triggers', icon: '⚡', color: '#eab308', bg: '#fefce8', signs: 'Subtle changes in body language, withdrawal', response: 'Remove/reduce trigger, redirect calmly' },
            { name: 'Agitation', icon: '😤', color: '#f97316', bg: '#fff7ed', signs: 'Off-task, fidgeting, non-compliance begins', response: 'Offer choices, use proximity, check in privately' },
            { name: 'Acceleration', icon: '🔥', color: '#ef4444', bg: '#fef2f2', signs: 'Escalating defiance, arguing, disruptive', response: 'Avoid power struggles, state expectations calmly, clear the area if needed' },
            { name: 'Peak', icon: '💥', color: '#dc2626', bg: '#fee2e2', signs: 'Most severe behavior, loss of control', response: 'Focus on safety, use crisis protocols, document' },
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
                const prompt = `You are a BCBA personalizing a Colvin & Sugai acting-out cycle for a student.

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
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4 text-center' }, '🔄 ' + (t('behavior_lens.cycle.title') || 'Acting-Out Cycle (Colvin & Sugai)')),
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

        const gradients = [
            'from-blue-400 to-indigo-500',
            'from-emerald-400 to-teal-500',
            'from-amber-400 to-orange-500',
            'from-pink-400 to-rose-500',
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
                h('div', { className: 'bg-white rounded-2xl p-6 w-full max-w-md space-y-4' },
                    h('h3', { className: 'text-sm font-black text-slate-800' }, '✏️ Edit Choices'),
                    choices.map((c, i) =>
                        h('div', { key: i, className: 'flex gap-2' },
                            h('input', { value: c.emoji, onChange: (e) => updateChoice(i, 'emoji', e.target.value), className: 'w-12 text-center text-xl border rounded-lg', maxLength: 2 }),
                            h('input', { value: c.label, onChange: (e) => updateChoice(i, 'label', e.target.value), className: 'flex-1 border rounded-lg px-3 py-2 text-sm' })
                        )
                    ),
                    h('div', { className: 'flex gap-2' },
                        choices.length < 4 && h('button', {
                            onClick: () => setChoices(prev => [...prev, { label: 'New choice', emoji: '✨' }]),
                            className: 'px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold'
                        }, '+ Add'),
                        choices.length > 2 && h('button', {
                            onClick: () => setChoices(prev => prev.slice(0, -1)),
                            className: 'px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm font-bold'
                        }, '- Remove')
                    ),
                    h('button', { onClick: () => setEditing(false), className: 'w-full py-2 bg-indigo-500 text-white rounded-lg font-bold' }, 'Done')
                )
            );
        }

        return h('div', { className: 'fixed inset-0 z-[300] bg-slate-900 flex flex-col' },
            // Toolbar
            h('div', { className: 'flex justify-between items-center p-4 shrink-0' },
                h('button', { onClick: () => setEditing(true), className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm font-bold hover:bg-white/20' }, '✏️ Edit'),
                h('span', { className: 'text-white/60 text-xs font-bold' }, studentName ? `For: ${studentName}` : 'Choice Board'),
                h('button', { onClick: onClose, className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-sm font-bold hover:bg-white/20' }, '✕ Close')
            ),
            // Choices grid
            h('div', { className: `flex-1 grid gap-4 p-6 ${choices.length <= 2 ? 'grid-cols-1' : 'grid-cols-2'}` },
                choices.map((c, i) =>
                    h('button', {
                        key: i,
                        onClick: () => handleSelect(i),
                        className: `rounded-3xl bg-gradient-to-br ${gradients[i % gradients.length]} flex flex-col items-center justify-center shadow-2xl transition-all duration-300 ${selected === i ? 'scale-95 ring-4 ring-white/80' : 'hover:scale-[1.02] active:scale-95'}`
                    },
                        h('span', { className: 'text-6xl md:text-8xl mb-4 drop-shadow-lg' }, c.emoji),
                        h('span', { className: 'text-xl md:text-3xl font-black text-white drop-shadow-md' }, c.label),
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

Behavior frequency: ${freq} per day
Average episode duration: ${dur} minutes
Lost instructional time: ${lostPerDay.toFixed(1)} min/day, ${lostPerWeek.toFixed(1)} min/week, ${lostPerYear.toFixed(0)} min/year
Estimated annual cost: $${annualCost.toFixed(2)}

Provide a brief impact interpretation and return ONLY valid JSON:
{
  "severity": "minimal/moderate/significant/severe",
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
                aiInsight.severity && h('span', { className: `px-2 py-0.5 rounded-full text-xs font-bold ${aiInsight.severity === 'severe' ? 'bg-red-100 text-red-700' : aiInsight.severity === 'significant' ? 'bg-orange-100 text-orange-700' : aiInsight.severity === 'moderate' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}` }, aiInsight.severity),
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

Hypothesized function: ${funcStr}
${aiAnalysis?.summary ? 'Analysis: ' + aiAnalysis.summary : ''}

Create student-friendly language and return ONLY valid JSON:
{
  "green": { "title": "positive zone title", "items": "expected behaviors separated by semicolons (4 items)" },
  "yellow": { "title": "caution zone title", "items": "warning signs separated by semicolons (4 items)" },
  "red": { "title": "stop zone title", "items": "crisis-level behaviors separated by semicolons (4 items)" }
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
                h('h2', { className: 'text-center text-lg font-black text-slate-800 mb-1' }, '🚦 My Behavior Plan'),
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
                    desc: t('behavior_lens.hub.hotspot_desc') || 'Map behavior incidents to daily routine periods with AI analysis',
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
                    title: t('behavior_lens.hub.cycle_title') || 'Acting-Out Cycle',
                    desc: t('behavior_lens.hub.cycle_desc') || 'Colvin & Sugai 7-phase model with personalized strategies',
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
            ];

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
                            },
                            disabled: tool.disabled || (!selectedStudent && !['analysis', 'export', 'record'].includes(tool.id)),
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
                                                                        activePanel === 'cycle' ? (t('behavior_lens.cycle.title') || 'Acting-Out Cycle') :
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
                                                                                                                        activePanel === 'pocket' ? (t('behavior_lens.pocket.title') || 'Pocket BIP') : ''
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
                activePanel === 'cycle' && h(ActingOutCycle, {
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
