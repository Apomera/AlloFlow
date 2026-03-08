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
    const ABCModal = ({ entry, onSave, onClose, t, callGemini }) => {
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
        const [quickFillText, setQuickFillText] = useState('');
        const [quickFillLoading, setQuickFillLoading] = useState(false);

        const handleQuickFill = async () => {
            if (!callGemini || !quickFillText.trim()) return;
            setQuickFillLoading(true);
            try {
                const prompt = `You are a behavior specialist assistant. A teacher described a behavioral observation in plain language. Parse it into structured ABC fields.
${RESTORATIVE_PREAMBLE}

Teacher's description: "${quickFillText}"

Return ONLY valid JSON:
{
  "antecedent": "what happened before (trigger/context)",
  "behavior": "what the student did",
  "consequence": "what happened after",
  "intensity": 1-5 number,
  "setting": "location if mentioned, or empty string",
  "notes": "any extra context"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                if (parsed.antecedent) setAntecedent(parsed.antecedent);
                if (parsed.behavior) setBehavior(parsed.behavior);
                if (parsed.consequence) setConsequence(parsed.consequence);
                if (parsed.intensity) setIntensity(Math.min(5, Math.max(1, parseInt(parsed.intensity) || 3)));
                if (parsed.setting) setSetting(parsed.setting);
                if (parsed.notes) setNotes(parsed.notes);
                setQuickFillText('');
            } catch (err) {
                warnLog('Quick-fill failed:', err);
            } finally { setQuickFillLoading(false); }
        };

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
                // Quick-Fill AI
                callGemini && h('div', { className: 'px-6 pt-4 pb-0' },
                    h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-3' },
                        h('label', { className: 'text-[10px] font-bold text-purple-600 uppercase block mb-1.5' }, '🧠 Quick-Fill — Describe what happened'),
                        h('div', { className: 'flex gap-2' },
                            h('input', {
                                type: 'text',
                                value: quickFillText,
                                onChange: (e) => setQuickFillText(e.target.value),
                                placeholder: 'e.g. "Student threw paper during math when asked to show work, teacher redirected calmly"',
                                className: 'flex-1 text-xs border border-purple-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-purple-400 outline-none',
                                onKeyDown: (e) => { if (e.key === 'Enter' && quickFillText.trim()) { e.preventDefault(); handleQuickFill(); } }
                            }),
                            h('button', {
                                onClick: handleQuickFill,
                                disabled: quickFillLoading || !quickFillText.trim(),
                                className: 'px-4 py-2 bg-purple-500 text-white rounded-lg text-xs font-bold hover:bg-purple-600 disabled:opacity-40 transition-all whitespace-nowrap'
                            }, quickFillLoading ? '⏳' : '🧠 Fill')
                        ),
                        h('p', { className: 'text-[10px] text-purple-400 mt-1' }, 'AI will parse your description into the fields below. You can then edit manually.')
                    )
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
    const ABCDataPanel = ({ entries, setEntries, studentName, onAnalyze, analyzing, t, addToast, callGemini }) => {
        const [editEntry, setEditEntry] = useState(null);
        const [showModal, setShowModal] = useState(false);
        const [sortField, setSortField] = useState('timestamp');
        const [sortDir, setSortDir] = useState('desc');
        const [filterBehavior, setFilterBehavior] = useState('all');
        const [searchText, setSearchText] = useState('');
        const [dateRange, setDateRange] = useState('all'); // today, 7, 30, all
        const [selectedIds, setSelectedIds] = useState(new Set());
        const [expandedId, setExpandedId] = useState(null);
        const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
        const [restorativeId, setRestorativeId] = useState(null);
        const [restorativeText, setRestorativeText] = useState('');
        const [restorativeLoading, setRestorativeLoading] = useState(false);
        const [nlEditId, setNlEditId] = useState(null);
        const [nlEditInput, setNlEditInput] = useState('');
        const [nlEditLoading, setNlEditLoading] = useState(false);

        const handleRestorativeQuestions = async (entry) => {
            if (!callGemini) return;
            if (restorativeId === entry.id) { setRestorativeId(null); return; }
            setRestorativeId(entry.id);
            setRestorativeText('');
            setRestorativeLoading(true);
            try {
                const prompt = `You are a restorative practices specialist. Generate 3-4 context-specific restorative conversation questions for a teacher to use with a student after this specific incident.
${RESTORATIVE_PREAMBLE}

Incident details:
- Antecedent (what happened before): ${entry.antecedent}
- Behavior: ${entry.behavior}
- Consequence (what happened after): ${entry.consequence}
- Setting: ${entry.setting || 'classroom'}
- Intensity: ${entry.intensity}/5

Generate questions that:
1. Help the student reflect on what happened (referencing the specific antecedent)
2. Explore the impact on others (considering the specific setting)
3. Build empathy and understanding
4. Guide toward making things right

Make questions warm, specific to THIS incident (not generic), and age-appropriate. Number each question.`;
                const result = await callGemini(prompt, true);
                setRestorativeText(result);
            } catch (err) {
                warnLog('Restorative questions failed:', err);
                if (addToast) addToast('Failed to generate questions', 'error');
                setRestorativeId(null);
            } finally { setRestorativeLoading(false); }
        };

        const handleNlEdit = async (entry) => {
            if (!callGemini || !nlEditInput.trim()) return;
            setNlEditLoading(true);
            try {
                const prompt = `You are editing an ABC behavior observation entry. Apply the user's instruction to modify the entry fields.

Current entry:
- Antecedent: ${entry.antecedent}
- Behavior: ${entry.behavior}
- Consequence: ${entry.consequence}
- Intensity: ${entry.intensity}
- Setting: ${entry.setting || ''}
- Notes: ${entry.notes || ''}

User instruction: "${nlEditInput}"

Return ONLY valid JSON with the modified fields (include ALL fields, even unchanged ones):
{ "antecedent": "...", "behavior": "...", "consequence": "...", "intensity": 1-5, "setting": "...", "notes": "..." }`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                const updated = { ...entry, ...parsed, intensity: Math.min(5, Math.max(1, parseInt(parsed.intensity) || entry.intensity)) };
                handleSaveEntry(updated);
                setShowModal(false);
                if (addToast) addToast('Entry updated via AI ✨', 'success');
                setNlEditId(null);
                setNlEditInput('');
            } catch (err) {
                warnLog('NL edit failed:', err);
                if (addToast) addToast('AI edit failed', 'error');
            } finally { setNlEditLoading(false); }
        };

        const uniqueBehaviors = useMemo(() => {
            const set = new Set(entries.map(e => e.behavior));
            return ['all', ...Array.from(set)];
        }, [entries]);

        const sorted = useMemo(() => {
            const now = new Date();
            let filtered = entries;

            // Behavior filter
            if (filterBehavior !== 'all') filtered = filtered.filter(e => e.behavior === filterBehavior);

            // Date range filter
            if (dateRange !== 'all') {
                const days = dateRange === 'today' ? 1 : parseInt(dateRange);
                const cutoff = new Date(now);
                if (dateRange === 'today') {
                    cutoff.setHours(0, 0, 0, 0);
                } else {
                    cutoff.setDate(cutoff.getDate() - days);
                }
                filtered = filtered.filter(e => new Date(e.timestamp) >= cutoff);
            }

            // Text search
            if (searchText.trim()) {
                const q = searchText.toLowerCase().trim();
                filtered = filtered.filter(e =>
                    (e.antecedent || '').toLowerCase().includes(q) ||
                    (e.behavior || '').toLowerCase().includes(q) ||
                    (e.consequence || '').toLowerCase().includes(q) ||
                    (e.notes || '').toLowerCase().includes(q) ||
                    (e.setting || '').toLowerCase().includes(q)
                );
            }

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
        }, [entries, sortField, sortDir, filterBehavior, searchText, dateRange]);

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
            setSelectedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            if (addToast) addToast(t('behavior_lens.abc.entry_deleted') || 'Entry deleted', 'info');
        };

        const handleBulkDelete = () => {
            if (selectedIds.size === 0) return;
            setEntries(prev => prev.filter(e => !selectedIds.has(e.id)));
            if (addToast) addToast(`${selectedIds.size} entries deleted`, 'info');
            setSelectedIds(new Set());
            setConfirmBulkDelete(false);
        };

        const toggleSelect = (id) => {
            setSelectedIds(prev => {
                const n = new Set(prev);
                if (n.has(id)) n.delete(id); else n.add(id);
                return n;
            });
        };

        const toggleSelectAll = () => {
            if (selectedIds.size === sorted.length) {
                setSelectedIds(new Set());
            } else {
                setSelectedIds(new Set(sorted.map(e => e.id)));
            }
        };

        const behaviorSummary = useMemo(() => {
            const counts = {};
            entries.forEach(e => {
                counts[e.behavior] = (counts[e.behavior] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]);
        }, [entries]);

        const dateRangeOpts = [
            { key: 'all', label: 'All' },
            { key: 'today', label: 'Today' },
            { key: '7', label: '7d' },
            { key: '30', label: '30d' }
        ];

        return h('div', { className: 'space-y-4' },
            // Header with add button
            h('div', { className: 'flex items-center justify-between' },
                h('div', null,
                    h('h3', { className: 'text-lg font-black text-slate-800' },
                        '📋 ', t('behavior_lens.abc.title') || 'ABC Data Collection'
                    ),
                    h('p', { className: 'text-xs text-slate-500 mt-0.5' },
                        studentName ? `${t('behavior_lens.abc.for_student') || 'For'}: ${studentName}` : '',
                        entries.length > 0 && ` — ${entries.length} ${t('behavior_lens.abc.entries') || 'entries'}`,
                        sorted.length !== entries.length && ` (${sorted.length} shown)`
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
            // Search + Date range + Behavior filter bar
            entries.length > 0 && h('div', { className: 'space-y-2' },
                // Search bar
                h('div', { className: 'flex items-center gap-2' },
                    h('div', { className: 'relative flex-1' },
                        h('input', {
                            value: searchText,
                            onChange: e => setSearchText(e.target.value),
                            placeholder: 'Search antecedent, behavior, consequence, notes, setting...',
                            className: 'w-full text-xs pl-8 pr-3 py-2 border border-slate-200 rounded-lg focus:border-indigo-400 focus:ring-1 focus:ring-indigo-200 outline-none transition-all'
                        }),
                        h('span', { className: 'absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs' }, '🔍')
                    ),
                    // Date range buttons
                    h('div', { className: 'flex items-center bg-slate-100 rounded-lg p-0.5' },
                        dateRangeOpts.map(opt =>
                            h('button', {
                                key: opt.key,
                                onClick: () => setDateRange(opt.key),
                                className: `text-[10px] px-2.5 py-1.5 rounded-md font-bold transition-all ${dateRange === opt.key
                                    ? 'bg-white text-indigo-700 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700'
                                    }`
                            }, opt.label)
                        )
                    )
                ),
                // Behavior filter pills
                h('div', { className: 'flex items-center gap-2 flex-wrap' },
                    h('span', { className: 'text-xs font-bold text-slate-500' }, t('behavior_lens.filter') || 'Filter:'),
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
            // Bulk actions bar
            selectedIds.size > 0 && h('div', { className: 'flex items-center gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5' },
                h('span', { className: 'text-xs font-bold text-red-700' }, `${selectedIds.size} selected`),
                !confirmBulkDelete
                    ? h('button', {
                        onClick: () => setConfirmBulkDelete(true),
                        className: 'text-[10px] px-3 py-1 bg-red-600 text-white rounded-lg font-bold hover:bg-red-500 transition-all'
                    }, '🗑 Delete Selected')
                    : h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-[10px] text-red-700 font-bold' }, 'Are you sure?'),
                        h('button', {
                            onClick: handleBulkDelete,
                            className: 'text-[10px] px-3 py-1 bg-red-700 text-white rounded-lg font-black hover:bg-red-600 transition-all'
                        }, 'Yes, Delete'),
                        h('button', {
                            onClick: () => setConfirmBulkDelete(false),
                            className: 'text-[10px] px-3 py-1 bg-white text-slate-600 border border-slate-200 rounded-lg font-bold hover:bg-slate-50 transition-all'
                        }, 'Cancel')
                    ),
                h('button', {
                    onClick: () => { setSelectedIds(new Set()); setConfirmBulkDelete(false); },
                    className: 'ml-auto text-[10px] text-red-400 hover:text-red-600 font-bold transition-colors'
                }, 'Clear selection')
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
                : sorted.length === 0
                    ? h('div', { className: 'text-center py-10 bg-white rounded-xl border border-slate-200' },
                        h('div', { className: 'text-2xl mb-2' }, '🔍'),
                        h('p', { className: 'text-sm font-bold text-slate-500' }, 'No entries match your filters'),
                        h('button', {
                            onClick: () => { setSearchText(''); setDateRange('all'); setFilterBehavior('all'); },
                            className: 'mt-2 text-xs text-indigo-600 font-bold hover:underline'
                        }, 'Clear all filters')
                    )
                    : h('div', { className: 'bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm' },
                        h('div', { className: 'overflow-x-auto' },
                            h('table', { className: 'w-full text-sm' },
                                h('thead', null,
                                    h('tr', { className: 'bg-slate-50 border-b border-slate-200' },
                                        // Checkbox header
                                        h('th', { className: 'px-2 py-2.5 text-center w-8' },
                                            h('input', {
                                                type: 'checkbox',
                                                checked: selectedIds.size === sorted.length && sorted.length > 0,
                                                onChange: toggleSelectAll,
                                                className: 'w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer'
                                            })
                                        ),
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
                                        // Notes indicator header
                                        h('th', { className: 'px-2 py-2.5 text-center text-xs font-bold text-slate-400 w-8' }, '📝'),
                                        h('th', { className: 'px-3 py-2.5 text-right text-xs font-bold text-slate-500 uppercase' }, '')
                                    )
                                ),
                                h('tbody', null,
                                    sorted.map((entry, idx) =>
                                        h(React.Fragment, { key: entry.id },
                                            h('tr', {
                                                className: `border-b border-slate-100 hover:bg-indigo-50/40 transition-colors ${selectedIds.has(entry.id) ? 'bg-indigo-50/60' : idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`
                                            },
                                                // Checkbox
                                                h('td', { className: 'px-2 py-2.5 text-center' },
                                                    h('input', {
                                                        type: 'checkbox',
                                                        checked: selectedIds.has(entry.id),
                                                        onChange: () => toggleSelect(entry.id),
                                                        className: 'w-3.5 h-3.5 rounded border-slate-300 text-indigo-600 cursor-pointer'
                                                    })
                                                ),
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
                                                // Notes indicator
                                                h('td', { className: 'px-2 py-2.5 text-center' },
                                                    (entry.notes || entry.setting) && h('button', {
                                                        onClick: () => setExpandedId(expandedId === entry.id ? null : entry.id),
                                                        className: `text-xs transition-all ${expandedId === entry.id ? 'text-indigo-600' : 'text-slate-300 hover:text-indigo-400'}`,
                                                        title: entry.notes ? 'View notes' : 'View setting'
                                                    }, expandedId === entry.id ? '▾' : '📝')
                                                ),
                                                h('td', { className: 'px-3 py-2.5 text-right' },
                                                    h('div', { className: 'flex justify-end gap-1' },
                                                        callGemini && h('button', {
                                                            onClick: () => handleRestorativeQuestions(entry),
                                                            className: `p-1 rounded transition-colors ${restorativeId === entry.id ? 'bg-purple-100 text-purple-600' : 'text-slate-400 hover:bg-purple-50 hover:text-purple-500'}`,
                                                            title: 'Restorative Questions'
                                                        }, restorativeLoading && restorativeId === entry.id ? '⏳' : '💬'),
                                                        callGemini && h('button', {
                                                            onClick: () => { setNlEditId(nlEditId === entry.id ? null : entry.id); setNlEditInput(''); },
                                                            className: `p-1 rounded transition-colors ${nlEditId === entry.id ? 'bg-amber-100 text-amber-600' : 'text-slate-400 hover:bg-amber-50 hover:text-amber-500'}`,
                                                            title: 'AI Edit'
                                                        }, '✏️🧠'),
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
                                            ),
                                            // Expandable notes row
                                            expandedId === entry.id && (entry.notes || entry.setting) &&
                                            h('tr', { className: 'bg-indigo-50/30' },
                                                h('td', { colSpan: 8, className: 'px-6 py-3' },
                                                    h('div', { className: 'flex gap-6' },
                                                        entry.setting && h('div', null,
                                                            h('span', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, '📍 Setting'),
                                                            h('p', { className: 'text-xs text-slate-700 mt-0.5' }, entry.setting)
                                                        ),
                                                        entry.notes && h('div', { className: 'flex-1' },
                                                            h('span', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, '📝 Notes'),
                                                            h('p', { className: 'text-xs text-slate-700 mt-0.5 leading-relaxed' }, entry.notes)
                                                        )
                                                    )
                                                )
                                            ),
                                            // NL Edit inline row
                                            nlEditId === entry.id &&
                                            h('tr', { className: 'bg-amber-50/40' },
                                                h('td', { colSpan: 8, className: 'px-6 py-3' },
                                                    h('div', { className: 'flex gap-2 items-center' },
                                                        h('span', { className: 'text-xs font-bold text-amber-700' }, '✏️🧠'),
                                                        h('input', {
                                                            value: nlEditInput,
                                                            onChange: e => setNlEditInput(e.target.value),
                                                            onKeyDown: e => e.key === 'Enter' && handleNlEdit(entry),
                                                            placeholder: 'e.g. "change consequence to teacher redirected"',
                                                            className: 'flex-1 text-xs px-3 py-2 border border-amber-200 rounded-lg focus:border-amber-400 outline-none',
                                                            autoFocus: true
                                                        }),
                                                        h('button', {
                                                            onClick: () => handleNlEdit(entry),
                                                            disabled: nlEditLoading || !nlEditInput.trim(),
                                                            className: 'px-3 py-2 bg-amber-500 text-white text-xs font-bold rounded-lg hover:bg-amber-600 disabled:opacity-40 transition-all'
                                                        }, nlEditLoading ? '⏳' : 'Apply'),
                                                        h('button', {
                                                            onClick: () => { setNlEditId(null); setNlEditInput(''); },
                                                            className: 'text-amber-400 hover:text-amber-600 text-xs px-1'
                                                        }, '✕')
                                                    )
                                                )
                                            ),
                                            // Restorative questions row
                                            restorativeId === entry.id &&
                                            h('tr', { className: 'bg-purple-50/40' },
                                                h('td', { colSpan: 8, className: 'px-6 py-4' },
                                                    h('div', { className: 'space-y-2' },
                                                        h('div', { className: 'flex justify-between items-center' },
                                                            h('h4', { className: 'text-xs font-black text-purple-700 uppercase flex items-center gap-1.5' }, '💬 Restorative Conversation Starters'),
                                                            h('button', { onClick: () => setRestorativeId(null), className: 'text-purple-400 hover:text-purple-600 text-xs' }, '✕ Close')
                                                        ),
                                                        restorativeLoading
                                                            ? h('div', { className: 'text-xs text-purple-500 animate-pulse' }, '⏳ Generating context-specific questions...')
                                                            : h('div', { className: 'text-xs text-purple-800 whitespace-pre-wrap leading-relaxed' }, restorativeText)
                                                    )
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
                t,
                callGemini
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

            // Week-over-week comparison
            const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);
            const lastWeek = abcEntries.filter(e => { const d = new Date(e.timestamp); return d >= twoWeeksAgo && d < weekAgo; });
            const wowCountChange = thisWeek.length - lastWeek.length;
            const wowCountPct = lastWeek.length > 0 ? Math.round(((thisWeek.length - lastWeek.length) / lastWeek.length) * 100) : null;
            const thisWeekAvgI = thisWeek.length > 0 ? thisWeek.reduce((s, e) => s + (e.intensity || 0), 0) / thisWeek.length : 0;
            const lastWeekAvgI = lastWeek.length > 0 ? lastWeek.reduce((s, e) => s + (e.intensity || 0), 0) / lastWeek.length : 0;
            const wowIntensityChange = thisWeekAvgI - lastWeekAvgI;

            // Antecedent → Behavior correlation matrix
            const topBehaviors = Object.entries(filtered.reduce((m, e) => { if (e.behavior) m[e.behavior] = (m[e.behavior] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(x => x[0]);
            const topAntecedentstNames = topAntecedents.map(x => x[0]);
            const corrMatrix = {};
            let corrMax = 1;
            topAntecedentstNames.forEach(a => {
                corrMatrix[a] = {};
                topBehaviors.forEach(b => {
                    const count = filtered.filter(e => e.antecedent === a && e.behavior === b).length;
                    corrMatrix[a][b] = count;
                    if (count > corrMax) corrMax = count;
                });
            });

            // AI insight extraction
            const abcChains = {};
            filtered.forEach(e => {
                if (e.antecedent && e.behavior && e.consequence) {
                    const chain = `${e.antecedent} → ${e.behavior} → ${e.consequence}`;
                    abcChains[chain] = (abcChains[chain] || 0) + 1;
                }
            });
            const topChain = Object.entries(abcChains).sort((a, b) => b[1] - a[1])[0] || null;
            // Peak risk = hour + setting combo
            const hourSettingMap = {};
            filtered.forEach(e => {
                const hr = new Date(e.timestamp).getHours();
                const key = `${hr}:00–${hr + 1}:00 in ${e.setting || 'unknown'}`;
                hourSettingMap[key] = (hourSettingMap[key] || 0) + 1;
            });
            const peakRisk = Object.entries(hourSettingMap).sort((a, b) => b[1] - a[1])[0] || null;

            return {
                filtered, thisWeek, lastWeek, topAntecedents, topConsequences, topSettings, intensities,
                dayMap, avgIntensity, totalAbc: filtered.length, totalObs: observationSessions.length,
                trendData, hourMap, allAbc: abcEntries.length,
                wowCountChange, wowCountPct, thisWeekAvgI, lastWeekAvgI, wowIntensityChange,
                topBehaviors, corrMatrix, corrMax,
                topChain, peakRisk
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
            // Week-over-week comparison strip
            (stats.thisWeek.length > 0 || stats.lastWeek.length > 0) && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('h3', { className: 'text-xs font-black text-slate-500 uppercase mb-3' }, '📊 Week-over-Week Comparison'),
                h('div', { className: 'grid grid-cols-2 gap-4' },
                    // Count comparison
                    h('div', { className: 'flex items-center gap-3 p-3 rounded-lg bg-slate-50' },
                        h('div', { className: 'text-center' },
                            h('div', { className: 'text-[10px] text-slate-400 uppercase font-bold' }, 'Last Week'),
                            h('div', { className: 'text-xl font-black text-slate-500' }, stats.lastWeek.length)
                        ),
                        h('div', { className: 'text-lg font-black text-slate-300' }, '→'),
                        h('div', { className: 'text-center' },
                            h('div', { className: 'text-[10px] text-slate-400 uppercase font-bold' }, 'This Week'),
                            h('div', { className: 'text-xl font-black text-slate-700' }, stats.thisWeek.length)
                        ),
                        h('div', { className: `text-center px-2.5 py-1 rounded-full text-xs font-black ${stats.wowCountChange <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}` },
                            stats.wowCountChange <= 0 ? '↓' : '↑',
                            ' ', Math.abs(stats.wowCountChange),
                            stats.wowCountPct !== null ? ` (${stats.wowCountPct > 0 ? '+' : ''}${stats.wowCountPct}%)` : ' (new)'
                        )
                    ),
                    // Intensity comparison
                    h('div', { className: 'flex items-center gap-3 p-3 rounded-lg bg-slate-50' },
                        h('div', { className: 'text-center' },
                            h('div', { className: 'text-[10px] text-slate-400 uppercase font-bold' }, 'Avg Intensity'),
                            h('div', { className: 'text-xl font-black text-slate-500' }, stats.lastWeekAvgI.toFixed(1))
                        ),
                        h('div', { className: 'text-lg font-black text-slate-300' }, '→'),
                        h('div', { className: 'text-center' },
                            h('div', { className: 'text-[10px] text-slate-400 uppercase font-bold' }, 'Now'),
                            h('div', { className: 'text-xl font-black text-slate-700' }, stats.thisWeekAvgI.toFixed(1))
                        ),
                        stats.wowIntensityChange !== 0 && h('div', { className: `text-center px-2.5 py-1 rounded-full text-xs font-black ${stats.wowIntensityChange <= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}` },
                            stats.wowIntensityChange <= 0 ? '↓ Improving' : '↑ Rising'
                        )
                    )
                )
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
            // Antecedent → Behavior Correlation Matrix
            stats.topBehaviors.length > 0 && Object.keys(stats.corrMatrix).length > 0 &&
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-1' }, '🔗 Antecedent → Behavior Correlations'),
                h('p', { className: 'text-[10px] text-slate-400 mb-3' }, 'Darker cells indicate stronger co-occurrence between a trigger and behavior'),
                h('div', { className: 'overflow-x-auto' },
                    h('table', { className: 'w-full text-xs', style: { borderCollapse: 'separate', borderSpacing: '2px' } },
                        h('thead', null,
                            h('tr', null,
                                h('th', { className: 'text-right pr-2 text-[10px] text-slate-400 font-bold w-28' }, ''),
                                ...stats.topBehaviors.map(b => h('th', { key: b, className: 'text-center text-[10px] text-slate-500 font-bold px-1 py-1 max-w-[80px] truncate', title: b }, b))
                            )
                        ),
                        h('tbody', null,
                            Object.entries(stats.corrMatrix).map(([ante, bMap]) =>
                                h('tr', { key: ante },
                                    h('td', { className: 'text-right pr-2 text-[10px] text-slate-600 font-medium truncate max-w-[100px]', title: ante }, ante),
                                    ...stats.topBehaviors.map(b => {
                                        const count = bMap[b] || 0;
                                        const opacity = count > 0 ? 0.15 + (count / stats.corrMax) * 0.85 : 0;
                                        return h('td', {
                                            key: b,
                                            className: 'text-center rounded-md transition-all',
                                            style: {
                                                background: count > 0 ? `rgba(99, 102, 241, ${opacity})` : '#f8fafc',
                                                padding: '6px 4px',
                                                minWidth: '36px'
                                            },
                                            title: `${ante} + ${b}: ${count}`
                                        },
                                            h('span', { className: `font-black ${count > 0 ? (opacity > 0.5 ? 'text-white' : 'text-indigo-700') : 'text-slate-200'}` }, count)
                                        );
                                    })
                                )
                            )
                        )
                    )
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
            // Structured AI Insight Cards
            (aiAnalysis || stats.topChain || stats.peakRisk) &&
            h('div', { className: 'space-y-3' },
                h('h3', { className: 'text-sm font-black text-slate-800' }, '🧠 ', t('behavior_lens.overview.ai_summary') || 'Data Insights'),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3' },
                    // Top Pattern card
                    stats.topChain && h('div', { className: 'bg-gradient-to-br from-indigo-50 to-violet-50 rounded-xl border border-indigo-200 p-4' },
                        h('div', { className: 'text-xs font-black text-indigo-500 uppercase mb-2 flex items-center gap-1' }, '🔗 Top Pattern'),
                        h('p', { className: 'text-xs text-indigo-800 font-medium leading-relaxed' }, stats.topChain[0]),
                        h('div', { className: 'mt-2 text-[10px] text-indigo-400 font-bold' }, `Occurred ${stats.topChain[1]}× in this period`)
                    ),
                    // Peak Risk Window card
                    stats.peakRisk && h('div', { className: 'bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-4' },
                        h('div', { className: 'text-xs font-black text-amber-600 uppercase mb-2 flex items-center gap-1' }, '⚠️ Peak Risk Window'),
                        h('p', { className: 'text-xs text-amber-800 font-medium leading-relaxed' }, stats.peakRisk[0]),
                        h('div', { className: 'mt-2 text-[10px] text-amber-500 font-bold' }, `${stats.peakRisk[1]} observations in this window`)
                    ),
                    // AI Recommended Focus card
                    aiAnalysis && h('div', { className: 'bg-gradient-to-br from-purple-50 to-fuchsia-50 rounded-xl border border-purple-200 p-4' },
                        h('div', { className: 'text-xs font-black text-purple-500 uppercase mb-2 flex items-center gap-1' }, '🎯 AI Focus'),
                        aiAnalysis.hypothesizedFunction && h('div', { className: 'inline-flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-full border border-purple-200 mb-2' },
                            h('span', { className: 'text-[10px] font-black text-purple-600' }, `Function: ${aiAnalysis.hypothesizedFunction}`),
                            aiAnalysis.confidence && h('span', { className: 'text-[10px] text-purple-400' }, `${aiAnalysis.confidence}%`)
                        ),
                        h('p', { className: 'text-xs text-purple-700 leading-relaxed' },
                            aiAnalysis.recommendations?.[0] || aiAnalysis.summary?.substring(0, 120) || 'Run AI analysis on your ABC data for personalized recommendations.'
                        )
                    )
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

    const TokenBoard = ({ onClose, studentName, t, addToast, callGemini }) => {
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
        const [aiSuggestLoading, setAiSuggestLoading] = useState(false);

        const handleAiSuggest = async () => {
            if (!callGemini) return;
            setAiSuggestLoading(true);
            try {
                const prompt = `You are a behavior specialist. Suggest a token board setup for a student.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'the student'}

Return ONLY valid JSON:
{
  "targetBehavior": "a specific, observable, positively-stated target behavior",
  "reward": "an age-appropriate, motivating reward",
  "scheduleType": "token or FR",
  "slots": 5,
  "rationale": "1-sentence explanation of why this setup"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                if (parsed.targetBehavior) setTargetBehavior(parsed.targetBehavior);
                if (parsed.reward) setReward(parsed.reward);
                if (parsed.scheduleType && ['token', 'FR', 'VR', 'FI', 'VI'].includes(parsed.scheduleType)) setScheduleType(parsed.scheduleType);
                if (parsed.slots && [3, 4, 5, 6, 8, 10].includes(parsed.slots)) { setSlots(parsed.slots); setTokens([]); }
                if (addToast) addToast(parsed.rationale || 'Setup suggested ✨', 'success');
            } catch (err) {
                warnLog('Token AI suggest failed:', err);
                if (addToast) addToast('AI suggestion failed — try again', 'error');
            } finally { setAiSuggestLoading(false); }
        };

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
            // AI Suggest Setup button
            callGemini && h('button', {
                onClick: handleAiSuggest,
                disabled: aiSuggestLoading,
                className: 'w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, aiSuggestLoading ? '⏳ Thinking...' : '🧠 AI Suggest Setup'),
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
        const [suggesting, setSuggesting] = useState(false);
        const [suggestions, setSuggestions] = useState(null);
        const [progressGoalId, setProgressGoalId] = useState(null);
        const [progressScore, setProgressScore] = useState(3);
        const [progressNotes, setProgressNotes] = useState('');

        const goalsKey = `behaviorLens_goals_${studentName || 'default'}`;
        const [savedGoals, setSavedGoals] = useState(() => {
            try {
                const saved = localStorage.getItem(goalsKey);
                return saved ? JSON.parse(saved) : [];
            } catch { return []; }
        });

        // Persist on change
        useEffect(() => {
            try { localStorage.setItem(goalsKey, JSON.stringify(savedGoals)); } catch { }
        }, [savedGoals, goalsKey]);

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
            setSavedGoals(prev => [...prev, {
                id: uid(), specific, measurable, achievable, relevant, timeBound,
                preview: goalPreview, createdAt: new Date().toISOString(),
                status: 'active', dataPoints: []
            }]);
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

        const setGoalStatus = (goalId, status) => {
            setSavedGoals(prev => prev.map(g => g.id === goalId ? { ...g, status } : g));
            if (addToast) addToast(`Goal marked as ${status}`, 'success');
        };

        const addProgressPoint = (goalId) => {
            setSavedGoals(prev => prev.map(g => {
                if (g.id !== goalId) return g;
                return {
                    ...g,
                    dataPoints: [...(g.dataPoints || []), {
                        date: new Date().toISOString(),
                        score: progressScore,
                        notes: progressNotes || null
                    }]
                };
            }));
            setProgressGoalId(null);
            setProgressScore(3);
            setProgressNotes('');
            if (addToast) addToast('Progress logged 📊', 'success');
        };

        const deleteGoal = (goalId) => {
            setSavedGoals(prev => prev.filter(g => g.id !== goalId));
            if (addToast) addToast('Goal removed', 'info');
        };

        const statusColors = {
            active: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '● Active' },
            met: { bg: 'bg-blue-100', text: 'text-blue-700', label: '✓ Met' },
            discontinued: { bg: 'bg-slate-100', text: 'text-slate-500', label: '— Discontinued' }
        };

        // CSS-only sparkline
        const renderSparkline = (dataPoints) => {
            if (!dataPoints || dataPoints.length < 2) return null;
            const pts = dataPoints.slice(-12); // last 12 points
            const maxScore = 5;
            const w = 120;
            const hh = 28;
            const stepX = w / (pts.length - 1);
            const pathParts = pts.map((p, i) => {
                const x = i * stepX;
                const y = hh - (p.score / maxScore) * hh;
                return `${i === 0 ? 'M' : 'L'}${x},${y}`;
            });
            const lastScore = pts[pts.length - 1].score;
            const firstScore = pts[0].score;
            const trend = lastScore >= firstScore ? '#10b981' : '#f87171';
            return h('svg', { width: w, height: hh + 4, className: 'inline-block' },
                h('path', {
                    d: pathParts.join(' '),
                    fill: 'none',
                    stroke: trend,
                    strokeWidth: 2,
                    strokeLinecap: 'round',
                    strokeLinejoin: 'round'
                }),
                // Dots
                ...pts.map((p, i) =>
                    h('circle', {
                        key: i, cx: i * stepX, cy: hh - (p.score / maxScore) * hh,
                        r: 2.5, fill: 'white', stroke: trend, strokeWidth: 1.5
                    })
                )
            );
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
            // Saved goals with progress tracking
            savedGoals.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4' },
                h('h4', { className: 'text-xs font-bold text-slate-600 uppercase mb-1' }, `📋 Saved Goals (${savedGoals.length})`),
                savedGoals.map(g => {
                    const sc = statusColors[g.status || 'active'];
                    const pts = g.dataPoints || [];
                    const lastPt = pts[pts.length - 1];
                    return h('div', { key: g.id, className: `rounded-xl border p-4 transition-all ${g.status === 'discontinued' ? 'border-slate-100 bg-slate-50/50 opacity-60' : g.status === 'met' ? 'border-blue-200 bg-blue-50/30' : 'border-slate-200 bg-white'}` },
                        // Header row: status badge + goal text
                        h('div', { className: 'flex items-start justify-between gap-2' },
                            h('div', { className: 'flex-1' },
                                h('div', { className: 'flex items-center gap-2 mb-1' },
                                    h('span', { className: `text-[10px] px-2 py-0.5 rounded-full font-black ${sc.bg} ${sc.text}` }, sc.label),
                                    h('span', { className: 'text-[10px] text-slate-400' }, fmtDate(g.createdAt))
                                ),
                                h('p', { className: 'text-sm text-slate-700 leading-relaxed' }, g.preview)
                            ),
                            h('button', {
                                onClick: () => deleteGoal(g.id),
                                className: 'p-1 rounded hover:bg-red-100 text-slate-300 hover:text-red-500 transition-colors shrink-0'
                            }, '✕')
                        ),
                        // Sparkline + last score
                        pts.length > 0 && h('div', { className: 'flex items-center gap-3 mt-3 pt-3 border-t border-slate-100' },
                            renderSparkline(pts),
                            h('div', { className: 'text-xs text-slate-500' },
                                h('span', { className: 'font-bold text-slate-700' }, `${pts.length}`),
                                ` data point${pts.length !== 1 ? 's' : ''}`,
                                lastPt && h('span', null, ' · Last: ',
                                    h('span', { className: 'font-bold' }, `${lastPt.score}/5`),
                                    ` on ${fmtDate(lastPt.date)}`
                                )
                            )
                        ),
                        // Action buttons
                        g.status === 'active' && h('div', { className: 'flex items-center gap-2 mt-3 pt-3 border-t border-slate-100' },
                            h('button', {
                                onClick: () => { setProgressGoalId(progressGoalId === g.id ? null : g.id); setProgressScore(3); setProgressNotes(''); },
                                className: 'text-[10px] px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100 transition-all'
                            }, progressGoalId === g.id ? '▾ Close' : '📊 Log Progress'),
                            h('button', {
                                onClick: () => setGoalStatus(g.id, 'met'),
                                className: 'text-[10px] px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg font-bold hover:bg-blue-100 transition-all'
                            }, '✓ Mark Met'),
                            h('button', {
                                onClick: () => setGoalStatus(g.id, 'discontinued'),
                                className: 'text-[10px] px-3 py-1.5 bg-slate-50 text-slate-400 border border-slate-200 rounded-lg font-bold hover:bg-slate-100 transition-all'
                            }, 'Discontinue')
                        ),
                        // Reactivate for non-active goals
                        g.status !== 'active' && h('div', { className: 'mt-2 pt-2 border-t border-slate-100' },
                            h('button', {
                                onClick: () => setGoalStatus(g.id, 'active'),
                                className: 'text-[10px] px-3 py-1.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg font-bold hover:bg-emerald-100 transition-all'
                            }, '↩ Reactivate')
                        ),
                        // Inline progress form
                        progressGoalId === g.id && g.status === 'active' && h('div', { className: 'mt-3 p-3 bg-emerald-50/50 rounded-xl border border-emerald-200 space-y-2' },
                            h('div', { className: 'text-xs font-bold text-emerald-700 uppercase' }, '📊 Log Progress Point'),
                            h('div', { className: 'flex items-center gap-3' },
                                h('label', { className: 'text-[10px] text-slate-500 font-bold' }, 'Score (1–5):'),
                                h('div', { className: 'flex gap-1' },
                                    [1, 2, 3, 4, 5].map(s =>
                                        h('button', {
                                            key: s,
                                            onClick: () => setProgressScore(s),
                                            className: `w-8 h-8 rounded-lg font-black text-sm transition-all ${progressScore === s ? 'bg-emerald-600 text-white shadow-md' : 'bg-white text-slate-400 border border-slate-200 hover:border-emerald-300'}`
                                        }, s)
                                    )
                                )
                            ),
                            h('input', {
                                value: progressNotes,
                                onChange: e => setProgressNotes(e.target.value),
                                placeholder: 'Optional notes...',
                                className: 'w-full text-xs p-2 border border-emerald-200 rounded-lg focus:border-emerald-400 outline-none'
                            }),
                            h('button', {
                                onClick: () => addProgressPoint(g.id),
                                className: 'px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition-all'
                            }, '✓ Save Data Point')
                        )
                    );
                })
            )
        );
    };

    // ─── BehaviorContract ───────────────────────────────────────────────
    // AI-assisted behavior contract builder with persistence + history
    const BehaviorContract = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const lsKey = `bl_contracts_${studentName || '_'}`;
        const loadHistory = () => { try { return JSON.parse(localStorage.getItem(lsKey) || '[]'); } catch { return []; } };

        const [target, setTarget] = useState('');
        const [studentExpectations, setStudentExpectations] = useState('');
        const [rewards, setRewards] = useState('');
        const [teacherSupports, setTeacherSupports] = useState('');
        const [supportPlan, setSupportPlan] = useState('');
        const [duration, setDuration] = useState('2 weeks');
        const [studentSig, setStudentSig] = useState('');
        const [studentSigDate, setStudentSigDate] = useState('');
        const [teacherSig, setTeacherSig] = useState('');
        const [teacherSigDate, setTeacherSigDate] = useState('');
        const [status, setStatus] = useState('active'); // active | expired | renewed
        const [drafting, setDrafting] = useState(false);
        const [history, setHistory] = useState(loadHistory);
        const [showHistory, setShowHistory] = useState(false);

        // Load most recent contract from history on mount
        useEffect(() => {
            const h = loadHistory();
            setHistory(h);
            if (h.length > 0) {
                const latest = h[0];
                setTarget(latest.target || '');
                setStudentExpectations(latest.studentExpectations || '');
                setRewards(latest.rewards || '');
                setTeacherSupports(latest.teacherSupports || '');
                setSupportPlan(latest.supportPlan || '');
                setDuration(latest.duration || '2 weeks');
                setStudentSig(latest.studentSig || '');
                setStudentSigDate(latest.studentSigDate || '');
                setTeacherSig(latest.teacherSig || '');
                setTeacherSigDate(latest.teacherSigDate || '');
                setStatus(latest.status || 'active');
            }
        }, [studentName]);

        const saveContract = () => {
            if (!target.trim()) { if (addToast) addToast('Enter a target behavior first', 'error'); return; }
            const entry = { id: uid(), savedAt: new Date().toISOString(), target, studentExpectations, rewards, teacherSupports, supportPlan, duration, studentSig, studentSigDate, teacherSig, teacherSigDate, status };
            const updated = [entry, ...history.filter(c => c.id !== entry.id)].slice(0, 20);
            setHistory(updated);
            try { localStorage.setItem(lsKey, JSON.stringify(updated)); } catch { }
            if (addToast) addToast('Contract saved ✨', 'success');
        };

        const loadContract = (c) => {
            setTarget(c.target || ''); setStudentExpectations(c.studentExpectations || '');
            setRewards(c.rewards || ''); setTeacherSupports(c.teacherSupports || '');
            setSupportPlan(c.supportPlan || ''); setDuration(c.duration || '2 weeks');
            setStudentSig(c.studentSig || ''); setStudentSigDate(c.studentSigDate || '');
            setTeacherSig(c.teacherSig || ''); setTeacherSigDate(c.teacherSigDate || '');
            setStatus(c.status || 'active'); setShowHistory(false);
        };

        const deleteHistoryItem = (id) => {
            const updated = history.filter(c => c.id !== id);
            setHistory(updated);
            try { localStorage.setItem(lsKey, JSON.stringify(updated)); } catch { }
        };

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
                setStatus('active');
                if (addToast) addToast('Contract drafted ✨', 'success');
            } catch (err) {
                warnLog('Contract drafting failed:', err);
                if (addToast) addToast('Drafting failed', 'error');
            } finally { setDrafting(false); }
        };

        const handlePrint = () => { window.print(); };

        const statusColors = { active: { bg: '#f0fdf4', border: '#86efac', text: '#16a34a' }, expired: { bg: '#fef2f2', border: '#fca5a5', text: '#dc2626' }, renewed: { bg: '#eff6ff', border: '#93c5fd', text: '#2563eb' } };
        const sc = statusColors[status] || statusColors.active;

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // Action bar
            h('div', { className: 'flex gap-2 flex-wrap' },
                callGemini && h('button', {
                    onClick: handleDraft, disabled: drafting,
                    className: 'flex-1 py-3 bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, drafting ? '⏳ Drafting...' : ('🧠 ' + (t('behavior_lens.contract.draft') || 'AI Draft Contract'))),
                h('button', { onClick: saveContract, className: 'px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-all' }, '💾 Save'),
                history.length > 0 && h('button', {
                    onClick: () => setShowHistory(!showHistory),
                    className: 'px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all'
                }, `📋 History (${history.length})`)
            ),
            // Past contracts collapsible
            showHistory && h('div', { className: 'bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2' },
                h('h4', { className: 'text-xs font-black text-slate-600 uppercase mb-2' }, '📋 Past Contracts'),
                history.map(c => h('div', { key: c.id, className: 'flex items-center justify-between bg-white rounded-lg border border-slate-100 p-3 hover:border-fuchsia-200 transition-all' },
                    h('div', { className: 'flex-1 cursor-pointer', onClick: () => loadContract(c) },
                        h('div', { className: 'text-sm font-semibold text-slate-700' }, c.target ? c.target.slice(0, 60) + (c.target.length > 60 ? '…' : '') : 'Untitled'),
                        h('div', { className: 'text-[10px] text-slate-400 mt-0.5' }, `${fmtDate(c.savedAt)} • ${c.duration || '—'} • ${c.status || 'active'}`)
                    ),
                    h('span', { style: { fontSize: '8px', padding: '2px 6px', borderRadius: 8, background: (statusColors[c.status] || statusColors.active).bg, color: (statusColors[c.status] || statusColors.active).text, border: `1px solid ${(statusColors[c.status] || statusColors.active).border}`, fontWeight: 700, textTransform: 'uppercase' } }, c.status || 'active'),
                    h('button', { onClick: () => deleteHistoryItem(c.id), className: 'ml-2 text-slate-300 hover:text-red-500 text-sm transition-colors', title: 'Delete' }, '✕')
                ))
            ),
            // Status badge bar
            h('div', { className: 'flex items-center gap-2' },
                h('span', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Status:'),
                ['active', 'expired', 'renewed'].map(s => h('button', {
                    key: s, onClick: () => setStatus(s),
                    style: { fontSize: '10px', padding: '3px 10px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', border: `1.5px solid ${statusColors[s].border}`, background: status === s ? statusColors[s].bg : 'transparent', color: status === s ? statusColors[s].text : '#94a3b8', cursor: 'pointer', transition: 'all .15s' }
                }, s))
            ),
            // Contract form
            h('div', { id: 'behavior-contract-printable', className: 'bg-white rounded-xl border-2 border-fuchsia-200 p-6 shadow-sm space-y-4 print:border-black print:shadow-none' },
                h('div', { className: 'text-center border-b border-slate-200 pb-4 mb-4' },
                    h('h2', { className: 'text-xl font-black text-slate-800' }, '📜 ' + (t('behavior_lens.contract.title') || 'Behavior Contract')),
                    h('p', { className: 'text-xs text-slate-500 mt-1' }, `Student: ${studentName || '___'} | Duration: ${duration}`),
                    h('span', { style: { display: 'inline-block', marginTop: 6, fontSize: '10px', padding: '2px 10px', borderRadius: 20, fontWeight: 700, textTransform: 'uppercase', background: sc.bg, color: sc.text, border: `1px solid ${sc.border}` } }, status)
                ),
                // Target behavior
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '🎯 Target Behavior'),
                    h('textarea', { value: target, onChange: (e) => setTarget(e.target.value), rows: 2, maxLength: 500, className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-fuchsia-400 outline-none resize-none' })
                ),
                // Two columns
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                    h('div', { className: 'bg-blue-50 rounded-xl p-4 border border-blue-200' },
                        h('h4', { className: 'text-xs font-black text-blue-700 uppercase mb-2' }, '👤 Student Agrees To'),
                        h('textarea', { value: studentExpectations, onChange: (e) => setStudentExpectations(e.target.value), rows: 3, maxLength: 500, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-blue-100 resize-none outline-none' })
                    ),
                    h('div', { className: 'bg-emerald-50 rounded-xl p-4 border border-emerald-200' },
                        h('h4', { className: 'text-xs font-black text-emerald-700 uppercase mb-2' }, '👩‍🏫 Teacher Will Provide'),
                        h('textarea', { value: teacherSupports, onChange: (e) => setTeacherSupports(e.target.value), rows: 3, maxLength: 500, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-emerald-100 resize-none outline-none' })
                    )
                ),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
                    h('div', { className: 'bg-amber-50 rounded-xl p-4 border border-amber-200' },
                        h('h4', { className: 'text-xs font-black text-amber-700 uppercase mb-2' }, '🎁 Rewards'),
                        h('textarea', { value: rewards, onChange: (e) => setRewards(e.target.value), rows: 2, maxLength: 500, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-amber-100 resize-none outline-none' })
                    ),
                    h('div', { className: 'bg-red-50 rounded-xl p-4 border border-red-200' },
                        h('h4', { className: 'text-xs font-black text-blue-700 uppercase mb-2' }, '🔄 Additional Support Plan'),
                        h('textarea', { value: supportPlan, onChange: (e) => setSupportPlan(e.target.value), rows: 2, maxLength: 500, className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-blue-100 resize-none outline-none' })
                    )
                ),
                // Digital signature fields
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-200 mt-4' },
                    h('div', { className: 'space-y-2' },
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block' }, '👤 Student Signature'),
                        h('input', { type: 'text', value: studentSig, onChange: (e) => setStudentSig(e.target.value), placeholder: 'Type full name', maxLength: 80, className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm italic font-serif focus:ring-2 focus:ring-fuchsia-400 outline-none' }),
                        h('input', { type: 'date', value: studentSigDate, onChange: (e) => setStudentSigDate(e.target.value), className: 'w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 focus:ring-2 focus:ring-fuchsia-400 outline-none' })
                    ),
                    h('div', { className: 'space-y-2' },
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block' }, '👩‍🏫 Teacher Signature'),
                        h('input', { type: 'text', value: teacherSig, onChange: (e) => setTeacherSig(e.target.value), placeholder: 'Type full name', maxLength: 80, className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm italic font-serif focus:ring-2 focus:ring-fuchsia-400 outline-none' }),
                        h('input', { type: 'date', value: teacherSigDate, onChange: (e) => setTeacherSigDate(e.target.value), className: 'w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-600 focus:ring-2 focus:ring-fuchsia-400 outline-none' })
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
    // Colvin & Sugai 7-phase escalation cycle with persistence + editor
    const EscalationCycle = ({ abcEntries, aiAnalysis, studentName, callGemini, t, addToast }) => {
        const lsKey = `bl_escalation_${studentName || '_'}`;
        const defaultPhases = [
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
        const [editing, setEditing] = useState(false);

        // Load from localStorage on mount
        useEffect(() => {
            try {
                const saved = JSON.parse(localStorage.getItem(lsKey) || 'null');
                if (saved) setPersonalized(saved);
            } catch { }
        }, [studentName]);

        const saveCycle = () => {
            try { localStorage.setItem(lsKey, JSON.stringify(personalized)); } catch { }
            if (addToast) addToast('Escalation cycle saved ✅', 'success');
        };

        const resetCycle = () => {
            setPersonalized({});
            try { localStorage.removeItem(lsKey); } catch { }
            if (addToast) addToast('Reset to defaults', 'info');
        };

        const updatePhaseField = (phaseName, field, val) => {
            setPersonalized(prev => ({ ...prev, [phaseName]: { ...(prev[phaseName] || {}), [field]: val } }));
        };

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
            // Action bar
            h('div', { className: 'flex gap-2 flex-wrap' },
                callGemini && h('button', {
                    onClick: handlePersonalize, disabled: personalizing || abcEntries.length < 2,
                    className: 'flex-1 py-3 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, personalizing ? '⏳ Personalizing...' : ('🧠 ' + (t('behavior_lens.cycle.personalize') || 'Personalize for This Student'))),
                h('button', { onClick: saveCycle, className: 'px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-all' }, '💾 Save'),
                h('button', {
                    onClick: () => setEditing(!editing),
                    className: `px-4 py-3 rounded-xl font-bold text-sm transition-all ${editing ? 'bg-indigo-500 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                }, editing ? '✏️ Editing' : '✏️ Edit'),
                Object.keys(personalized).length > 0 && h('button', { onClick: resetCycle, className: 'px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-red-50 hover:text-red-600 transition-all' }, '🔄 Reset')
            ),
            // Cycle visualization
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4 text-center' }, '🔄 ' + (t('behavior_lens.cycle.title') || 'Escalation Cycle (Colvin & Sugai)')),
                h('div', { className: 'space-y-2' },
                    defaultPhases.map((phase, idx) => {
                        const p = personalized[phase.name] || {};
                        const isSelected = selected === idx;
                        const signsVal = p.signs || phase.signs;
                        const responseVal = p.response || phase.response;
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
                                            !isSelected && h('div', { className: 'text-xs text-slate-500 mt-0.5' }, signsVal)
                                        )
                                    ),
                                    h('span', { className: 'text-slate-400 text-sm' }, isSelected ? '▼' : '▶')
                                )
                            ),
                            isSelected && h('div', { className: 'mx-4 p-4 bg-white rounded-b-xl border border-t-0 border-slate-200 space-y-3 animate-in slide-in-from-top-2 duration-200' },
                                h('div', null,
                                    h('div', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-0.5' }, '👀 Observable Signs'),
                                    editing
                                        ? h('textarea', { value: signsVal, onChange: (e) => updatePhaseField(phase.name, 'signs', e.target.value), rows: 2, maxLength: 300, className: 'w-full bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200 outline-none resize-none focus:ring-2 focus:ring-indigo-300' })
                                        : h('p', { className: 'text-sm text-slate-700' }, signsVal)
                                ),
                                h('div', null,
                                    h('div', { className: 'text-[10px] font-bold text-slate-500 uppercase mb-0.5' }, '🛡️ Recommended Response'),
                                    editing
                                        ? h('textarea', { value: responseVal, onChange: (e) => updatePhaseField(phase.name, 'response', e.target.value), rows: 2, maxLength: 300, className: 'w-full bg-slate-50 rounded-lg px-3 py-2 text-sm border border-slate-200 outline-none resize-none focus:ring-2 focus:ring-indigo-300' })
                                        : h('p', { className: 'text-sm text-slate-700' }, responseVal)
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
    // Phase 8: localStorage persistence, date-stamped snapshots, top-3 summary strip
    const ReinforcerAssessment = ({ studentName, aiAnalysis, callGemini, t, addToast }) => {
        const categories = {
            social: { label: 'Social', icon: '👥', items: ['Verbal praise', 'High-five/fist bump', 'Lunch with teacher', 'Phone call home', 'Peer recognition', 'Leadership role'] },
            activity: { label: 'Activity', icon: '🎮', items: ['Extra recess', 'Free choice time', 'Computer time', 'Read aloud to class', 'Helper role', 'Drawing time'] },
            tangible: { label: 'Tangible', icon: '🎁', items: ['Stickers', 'Pencils/erasers', 'Bookmarks', 'Certificates', 'Class store credits', 'Special seating'] },
            sensory: { label: 'Sensory', icon: '🌀', items: ['Fidget tool', 'Noise-canceling headphones', 'Movement break', 'Quiet corner', 'Weighted lap pad', 'Music listening'] },
            edible: { label: 'Food/Drink', icon: '🍎', items: ['Healthy snack', 'Water bottle refill', 'Special lunch item', 'Gum/mints'] }
        };

        const lsKey = `bl_reinforcer_${studentName || '_'}`;
        const snapKey = `bl_reinforcer_snaps_${studentName || '_'}`;

        const [ratings, setRatings] = useState({});
        const [aiSuggestions, setAiSuggestions] = useState(null);
        const [suggesting, setSuggesting] = useState(false);
        const [snapshots, setSnapshots] = useState([]);
        const [showHistory, setShowHistory] = useState(false);

        // Load from localStorage on mount
        useEffect(() => {
            try {
                const saved = JSON.parse(localStorage.getItem(lsKey) || 'null');
                if (saved) setRatings(saved);
            } catch { }
            try {
                const snaps = JSON.parse(localStorage.getItem(snapKey) || '[]');
                if (Array.isArray(snaps)) setSnapshots(snaps);
            } catch { }
        }, [studentName]);

        const setRating = (item, value) => {
            setRatings(prev => ({ ...prev, [item]: prev[item] === value ? 0 : value }));
        };

        const saveRatings = () => {
            try { localStorage.setItem(lsKey, JSON.stringify(ratings)); } catch { }
            if (addToast) addToast('Ratings saved ✅', 'success');
        };

        const takeSnapshot = () => {
            const ratedCount = Object.values(ratings).filter(v => v > 0).length;
            if (ratedCount === 0) {
                if (addToast) addToast('Rate at least one item first', 'warning');
                return;
            }
            const snap = {
                date: new Date().toISOString(),
                ratings: { ...ratings },
                topItems: Object.entries(ratings).filter(([_, v]) => v > 0).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([item]) => item)
            };
            const updated = [snap, ...snapshots].slice(0, 10);
            setSnapshots(updated);
            try { localStorage.setItem(snapKey, JSON.stringify(updated)); } catch { }
            if (addToast) addToast('Snapshot saved 📸', 'success');
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

        // Top-3 summary strip
        const top3 = rankedItems.slice(0, 3);

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            // Top-3 summary strip
            top3.length > 0 && h('div', { className: 'flex items-center gap-2 bg-gradient-to-r from-amber-50 to-pink-50 rounded-xl border border-amber-200 px-4 py-3' },
                h('span', { className: 'text-sm font-black text-amber-700' }, '🏆 Top 3:'),
                top3.map(([item, rating], i) =>
                    h('span', { key: item, className: 'inline-flex items-center gap-1 bg-white rounded-full px-3 py-1 text-xs font-bold border border-amber-200 text-slate-700' },
                        `${i + 1}. ${item}`,
                        h('span', { className: 'text-amber-400 ml-1' }, '★'.repeat(rating))
                    )
                )
            ),
            // Action buttons row
            h('div', { className: 'flex gap-2' },
                h('button', {
                    onClick: saveRatings,
                    disabled: rankedItems.length === 0,
                    className: 'flex-1 py-2.5 bg-emerald-500 text-white rounded-xl font-bold shadow hover:bg-emerald-600 disabled:opacity-40 transition-all text-sm'
                }, '💾 Save Ratings'),
                h('button', {
                    onClick: takeSnapshot,
                    disabled: rankedItems.length === 0,
                    className: 'flex-1 py-2.5 bg-violet-500 text-white rounded-xl font-bold shadow hover:bg-violet-600 disabled:opacity-40 transition-all text-sm'
                }, '📸 Snapshot'),
                snapshots.length > 0 && h('button', {
                    onClick: () => setShowHistory(!showHistory),
                    className: 'py-2.5 px-4 bg-slate-100 text-slate-700 rounded-xl font-bold border border-slate-200 hover:bg-slate-200 transition-all text-sm'
                }, showHistory ? '▲ Hide' : `📊 History (${snapshots.length})`)
            ),
            // Snapshot history
            showHistory && snapshots.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-3 animate-in slide-in-from-top-2 duration-200' },
                h('h4', { className: 'text-sm font-black text-slate-700 mb-2' }, '📊 Preference Snapshots'),
                snapshots.map((snap, i) =>
                    h('div', { key: i, className: 'flex items-center gap-3 p-3 bg-slate-50 rounded-lg border border-slate-100' },
                        h('div', { className: 'text-xs text-slate-500 w-24 flex-shrink-0' }, new Date(snap.date).toLocaleDateString()),
                        h('div', { className: 'flex gap-1 flex-wrap' },
                            (snap.topItems || []).map((item, j) =>
                                h('span', { key: j, className: 'inline-flex items-center bg-amber-50 rounded-full px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200' },
                                    `${j + 1}. ${item}`
                                )
                            )
                        )
                    )
                )
            ),
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
    const ChoiceBoard = ({ onClose, studentName, t, addToast, callGemini }) => {
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
        const [aiChoiceLoading, setAiChoiceLoading] = useState(false);

        const handleAiSuggestChoices = async () => {
            if (!callGemini) return;
            setAiChoiceLoading(true);
            try {
                const prompt = `You are a behavior specialist. Generate age-appropriate choice board items for a student who may be dysregulated.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'the student'}
Current choices: ${choices.map(c => c.label).join(', ')}

Generate 4 calming/coping choice items. Return ONLY valid JSON:
{
  "choices": [
    { "label": "short action phrase", "emoji": "single emoji" }
  ],
  "firstItem": { "label": "a task to do first", "emoji": "emoji" },
  "thenItem": { "label": "a motivating reward", "emoji": "emoji" }
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                if (parsed.choices && Array.isArray(parsed.choices)) setChoices(parsed.choices.slice(0, 6));
                if (parsed.firstItem) setFirstItem(parsed.firstItem);
                if (parsed.thenItem) setThenItem(parsed.thenItem);
                if (addToast) addToast('Choices suggested ✨', 'success');
            } catch (err) {
                warnLog('Choice AI suggest failed:', err);
                if (addToast) addToast('AI suggestion failed', 'error');
            } finally { setAiChoiceLoading(false); }
        };

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
            if (addToast) addToast(`Choice: ${choices[idx].label} `, 'success');
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
                    h('div', { className: 'flex gap-2 flex-wrap' },
                        choices.length < 6 && h('button', {
                            onClick: () => setChoices(prev => [...prev, { label: 'New choice', emoji: '✨' }]),
                            className: 'px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-sm font-bold'
                        }, '+ Add Choice'),
                        callGemini && h('button', {
                            onClick: handleAiSuggestChoices,
                            disabled: aiChoiceLoading,
                            className: 'px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-sm font-bold hover:bg-purple-200 disabled:opacity-40 transition-all'
                        }, aiChoiceLoading ? '⏳ Thinking...' : '🧠 AI Suggest')
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
                        className: `rounded - 3xl flex flex - col items - center justify - center shadow - 2xl transition - all duration - 500 ${firstDone
                            ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 scale-95 ring-4 ring-emerald-300/50'
                            : 'bg-gradient-to-br from-blue-400 to-indigo-600 hover:scale-[1.02] active:scale-95'
                            } `
                    },
                        h('div', { className: 'text-xs font-black text-white/60 uppercase tracking-widest mb-2' }, 'FIRST'),
                        h('span', { className: 'text-6xl md:text-8xl mb-4 drop-shadow-lg' }, firstItem.emoji),
                        h('span', { className: 'text-xl md:text-2xl font-black text-white drop-shadow-md text-center px-4' }, firstItem.label),
                        firstDone && h('div', { className: 'mt-4 text-white text-4xl animate-bounce' }, '✅')
                    ),
                    // THEN panel
                    h('div', {
                        className: `rounded - 3xl flex flex - col items - center justify - center shadow - 2xl transition - all duration - 500 ${firstDone
                            ? 'bg-gradient-to-br from-amber-400 to-orange-500 scale-[1.05] ring-4 ring-amber-300/50 animate-pulse'
                            : 'bg-gradient-to-br from-slate-600 to-slate-800 opacity-50 grayscale'
                            } `
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
                h('span', { className: 'text-white/60 text-xs font-bold' }, studentName ? `For: ${studentName} ` : 'Choice Board'),
                h('button', { onClick: onClose, className: 'px-3 py-1.5 bg-white/10 text-white rounded-lg text-xs font-bold hover:bg-white/20' }, '✕ Close')
            ),
            // Choices grid
            h('div', { className: `flex - 1 grid gap - 4 p - 6 ${choices.length <= 2 ? 'grid-cols-1' : choices.length <= 4 ? 'grid-cols-2' : 'grid-cols-3'} ` },
                choices.map((c, i) =>
                    h('button', {
                        key: i,
                        onClick: () => handleSelect(i),
                        className: `rounded - 3xl bg - gradient - to - br ${gradients[i % gradients.length]} flex flex - col items - center justify - center shadow - 2xl transition - all duration - 300 ${selected === i ? 'scale-95 ring-4 ring-white/80' : 'hover:scale-[1.02] active:scale-95'} `
                    },
                        h('span', { className: `${choices.length <= 4 ? 'text-6xl md:text-8xl' : 'text-4xl md:text-6xl'} mb - 4 drop - shadow - lg` }, c.emoji),
                        h('span', { className: `${choices.length <= 4 ? 'text-xl md:text-3xl' : 'text-lg md:text-xl'} font - black text - white drop - shadow - md` }, c.label),
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
    Low - scoring areas: ${lowItems || 'None'}
    Ratings: ${items.map(it => `${it.label}: ${ratings[it.id] || 0}/5`).join(', ')}

Provide improvement recommendations and return ONLY valid JSON:
    {
        "summary": "1-2 sentence overall assessment",
            "recommendations": [
                { "area": "area name", "action": "specific actionable recommendation", "priority": "high/medium/low" }
            ]
    } `;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n ? /g, '').replace(/```\n?/g, '').trim();
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
                                        className: `w - 7 h - 7 rounded - md text - xs font - bold transition - all ${(ratings[item.id] || 0) >= v ?
                                            (v <= 2 ? 'bg-red-100 text-red-600 border border-red-200' : v <= 3 ? 'bg-amber-100 text-amber-600 border border-amber-200' : 'bg-emerald-100 text-emerald-600 border border-emerald-200') :
                                            'bg-slate-50 text-slate-300 border border-slate-100 hover:bg-slate-100'
                                            } `
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
    // 3-tier emergency protocol with persistence + structured contacts
    const CrisisIntervention = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const lsKey = `bl_crisis_${studentName || '_'}`;
        const tiers = [
            { key: 'prevention', label: 'Prevention', icon: '🛡️', color: '#22c55e', bg: '#f0fdf4' },
            { key: 'deescalation', label: 'De-escalation', icon: '🌊', color: '#3b82f6', bg: '#eff6ff' },
            { key: 'emergency', label: 'Emergency', icon: '🚨', color: '#ef4444', bg: '#fef2f2' },
        ];
        const emptyPlan = { prevention: { triggers: '', staffActions: '', communication: '' }, deescalation: { triggers: '', staffActions: '', communication: '' }, emergency: { triggers: '', staffActions: '', communication: '' } };
        const [plan, setPlan] = useState(emptyPlan);
        const [contacts, setContacts] = useState([{ name: '', role: '', phone: '' }]);
        const [lastReviewed, setLastReviewed] = useState(null);
        const [drafting, setDrafting] = useState(false);

        // Load from localStorage on mount
        useEffect(() => {
            try {
                const saved = JSON.parse(localStorage.getItem(lsKey) || 'null');
                if (saved) {
                    if (saved.plan) setPlan(saved.plan);
                    if (saved.contacts && Array.isArray(saved.contacts)) setContacts(saved.contacts);
                    if (saved.lastReviewed) setLastReviewed(saved.lastReviewed);
                }
            } catch { }
        }, [studentName]);

        const savePlan = () => {
            const data = { plan, contacts: contacts.filter(c => c.name || c.role || c.phone), lastReviewed: new Date().toISOString() };
            setLastReviewed(data.lastReviewed);
            try { localStorage.setItem(lsKey, JSON.stringify(data)); } catch { }
            if (addToast) addToast('Crisis plan saved ✅', 'success');
        };

        const addContact = () => setContacts(prev => [...prev, { name: '', role: '', phone: '' }]);
        const removeContact = (i) => setContacts(prev => prev.filter((_, idx) => idx !== i));
        const updateContact = (i, field, val) => setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: val } : c));

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
  "emergencyContacts": [{"name":"Name","role":"Role","phone":"555-0000"}]
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                setPlan({ prevention: parsed.prevention || {}, deescalation: parsed.deescalation || {}, emergency: parsed.emergency || {} });
                if (parsed.emergencyContacts) {
                    if (Array.isArray(parsed.emergencyContacts)) setContacts(parsed.emergencyContacts);
                    else setContacts([{ name: String(parsed.emergencyContacts), role: '', phone: '' }]);
                }
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
            // Action bar
            h('div', { className: 'flex gap-2 flex-wrap' },
                callGemini && h('button', {
                    onClick: handleDraft, disabled: drafting,
                    className: 'flex-1 py-3 bg-gradient-to-r from-stone-600 to-stone-800 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, drafting ? '⏳ Drafting...' : ('🧠 ' + (t('behavior_lens.crisis.draft') || 'AI Draft Crisis Plan'))),
                h('button', { onClick: savePlan, className: 'px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-all' }, '💾 Save Plan')
            ),
            // Last reviewed badge
            lastReviewed && h('div', { className: 'flex items-center gap-2 text-xs text-slate-500' },
                h('span', null, '🕐'),
                h('span', null, `Last reviewed: ${fmtDate(lastReviewed)} at ${fmtTime(lastReviewed)}`)
            ),
            // Plan card
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
                                            maxLength: 500,
                                            className: 'w-full bg-white/70 rounded-lg px-3 py-2 text-sm border border-transparent focus:border-slate-300 outline-none resize-none'
                                        })
                                    )
                                )
                            )
                        )
                    )
                ),
                // Structured emergency contacts
                h('div', { className: 'mt-4 p-4 bg-red-50 rounded-xl border border-red-200' },
                    h('div', { className: 'flex items-center justify-between mb-3' },
                        h('label', { className: 'text-[10px] font-bold text-red-600 uppercase' }, '📞 Emergency Contacts'),
                        h('button', { onClick: addContact, className: 'text-xs bg-red-100 text-red-600 px-2 py-1 rounded-lg font-bold hover:bg-red-200 transition-all' }, '+ Add')
                    ),
                    h('div', { className: 'space-y-2' },
                        contacts.map((c, i) =>
                            h('div', { key: i, className: 'flex gap-2 items-center' },
                                h('input', { type: 'text', value: c.name || '', onChange: (e) => updateContact(i, 'name', e.target.value), placeholder: 'Name', maxLength: 80, className: 'flex-1 bg-white/70 rounded-lg px-3 py-1.5 text-sm border border-red-100 outline-none' }),
                                h('input', { type: 'text', value: c.role || '', onChange: (e) => updateContact(i, 'role', e.target.value), placeholder: 'Role', maxLength: 60, className: 'w-28 bg-white/70 rounded-lg px-3 py-1.5 text-sm border border-red-100 outline-none' }),
                                h('input', { type: 'text', value: c.phone || '', onChange: (e) => updateContact(i, 'phone', e.target.value), placeholder: 'Phone', maxLength: 20, className: 'w-28 bg-white/70 rounded-lg px-3 py-1.5 text-sm border border-red-100 outline-none' }),
                                contacts.length > 1 && h('button', { onClick: () => removeContact(i), className: 'text-red-300 hover:text-red-500 text-sm', title: 'Remove' }, '✕')
                            )
                        )
                    )
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
    const DataSheetGenerator = ({ studentName, t, addToast, callGemini }) => {
        const [method, setMethod] = useState('frequency');
        const [intervals, setIntervals] = useState('6');
        const [dateRange, setDateRange] = useState('5');
        const [behaviorLabel, setBehaviorLabel] = useState('');
        const [aiConfigLoading, setAiConfigLoading] = useState(false);

        const handleAiSuggestConfig = async () => {
            if (!callGemini) return;
            setAiConfigLoading(true);
            try {
                const prompt = `You are a behavior specialist. Recommend the best data sheet configuration for tracking a student's behavior.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'the student'}

Return ONLY valid JSON:
{
  "method": "frequency" or "duration" or "abc" or "latency",
  "behaviorLabel": "a specific, observable behavior to track",
  "intervals": "number of periods per day (2-12)",
  "dateRange": "number of rows/days (1-20)",
  "rationale": "1-sentence explanation"
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                if (parsed.method && ['frequency', 'duration', 'abc', 'latency'].includes(parsed.method)) setMethod(parsed.method);
                if (parsed.behaviorLabel) setBehaviorLabel(parsed.behaviorLabel);
                if (parsed.intervals) setIntervals(String(Math.min(12, Math.max(2, parseInt(parsed.intervals) || 6))));
                if (parsed.dateRange) setDateRange(String(Math.min(20, Math.max(1, parseInt(parsed.dateRange) || 5))));
                if (addToast) addToast(parsed.rationale || 'Config suggested ✨', 'success');
            } catch (err) {
                warnLog('DataSheet AI config failed:', err);
                if (addToast) addToast('AI suggestion failed', 'error');
            } finally { setAiConfigLoading(false); }
        };

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
            h('div', { className: 'flex gap-2 print:hidden' },
                h('button', { onClick: () => window.print(), className: 'flex-1 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all' }, '🖨️ Print Data Sheet'),
                callGemini && h('button', {
                    onClick: handleAiSuggestConfig,
                    disabled: aiConfigLoading,
                    className: 'px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, aiConfigLoading ? '⏳ Thinking...' : '🧠 AI Suggest Config')
            )
        );
    };

    // ─── HomeNoteGenerator ──────────────────────────────────────────────
    // AI-drafted parent communication with tone selector
    const HomeNoteGenerator = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const [tone, setTone] = useState('friendly');
        const [note, setNote] = useState('');
        const [generating, setGenerating] = useState(false);
        const [preAiNote, setPreAiNote] = useState(null);
        const [showTranslate, setShowTranslate] = useState(false);
        const [translating, setTranslating] = useState(false);
        const [translateLang, setTranslateLang] = useState('');

        const handleTranslate = async () => {
            if (!callGemini || !note || !translateLang.trim()) return;
            setTranslating(true);
            setShowTranslate(false);
            try {
                const prompt = `Translate the following home note to ${translateLang.trim()}. Maintain the same tone, formatting, and professionalism. Return ONLY the translated text, no explanations:\n\n${note}`;
                setPreAiNote(note);
                const result = await callGemini(prompt, true);
                setNote(result);
                if (addToast) addToast(`Translated to ${translateLang.trim()} ✨`, 'success');
                setTranslateLang('');
            } catch (err) {
                warnLog('Translation failed:', err);
                if (addToast) addToast('Translation failed', 'error');
            } finally { setTranslating(false); }
        };

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
                h('div', { className: 'flex gap-2 mt-3 print:hidden flex-wrap' },
                    h('button', {
                        onClick: () => { navigator.clipboard.writeText(note); if (addToast) addToast('Copied!', 'success'); },
                        className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200'
                    }, '📋 Copy'),
                    h('button', { onClick: () => window.print(), className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200' }, '🖨️ Print'),
                    // Translate — free-text language input
                    callGemini && h('div', { className: 'relative' },
                        h('button', {
                            onClick: () => setShowTranslate(!showTranslate),
                            disabled: translating,
                            className: 'px-4 py-2 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-sm font-bold hover:bg-blue-100 transition-all'
                        }, translating ? '⏳ Translating...' : '🌐 Translate'),
                        showTranslate && h('div', { className: 'absolute bottom-full mb-1 left-0 bg-white border border-slate-200 rounded-xl shadow-lg z-10 p-3 min-w-56' },
                            h('label', { className: 'text-[10px] font-bold text-slate-500 mb-1 block' }, 'Translate to any language:'),
                            h('div', { className: 'flex gap-1.5' },
                                h('input', {
                                    type: 'text',
                                    value: translateLang,
                                    onChange: e => setTranslateLang(e.target.value),
                                    onKeyDown: e => { if (e.key === 'Enter' && translateLang.trim()) handleTranslate(); },
                                    placeholder: 'e.g. Spanish, Arabic, Somali…',
                                    className: 'flex-1 px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-300',
                                    autoFocus: true
                                }),
                                h('button', {
                                    onClick: handleTranslate,
                                    disabled: !translateLang.trim(),
                                    className: 'px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm font-bold hover:bg-blue-600 disabled:opacity-40 transition-all'
                                }, '→')
                            )
                        )
                    ),
                    // Undo AI
                    preAiNote !== null && h('button', {
                        onClick: () => { setNote(preAiNote); setPreAiNote(null); if (addToast) addToast('Reverted', 'info'); },
                        className: 'px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-100'
                    }, '↩️ Undo AI')
                )
            )
        );
    };

    // ─── FidelityChecklist ──────────────────────────────────────────────
    // Daily BIP adherence tracking with history + streak calendar
    const FidelityChecklist = ({ studentName, abcEntries, aiAnalysis, callGemini, t, addToast }) => {
        const lsKey = `bl_fidelity_${studentName || '_'}`;
        const loadSaved = () => { try { return JSON.parse(localStorage.getItem(lsKey) || '{}'); } catch { return {}; } };

        const [items, setItems] = useState([]);
        const [checks, setChecks] = useState({});
        const [generating, setGenerating] = useState(false);
        const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
        const [history, setHistory] = useState({});  // { 'YYYY-MM-DD': { items, score, pct } }

        // Load history + today's data on mount
        useEffect(() => {
            const saved = loadSaved();
            if (saved.history) setHistory(saved.history);
            if (saved.items) setItems(saved.items);
            const today = new Date().toISOString().slice(0, 10);
            if (saved.history && saved.history[today]) {
                setChecks(saved.history[today].checks || {});
            }
        }, [studentName]);

        const totalItems = items.length;
        const checkedCount = Object.values(checks).filter(Boolean).length;
        const pct = totalItems > 0 ? Math.round((checkedCount / totalItems) * 100) : 0;

        const saveToday = () => {
            if (items.length === 0) { if (addToast) addToast('Generate a checklist first', 'error'); return; }
            const updated = { ...history, [date]: { checks: { ...checks }, score: checkedCount, total: totalItems, pct } };
            setHistory(updated);
            try { localStorage.setItem(lsKey, JSON.stringify({ items, history: updated })); } catch { }
            if (addToast) addToast(`Fidelity saved for ${date} ✅`, 'success');
        };

        const clearChecks = () => { setChecks({}); };

        const loadDay = (d) => {
            setDate(d);
            if (history[d]) setChecks(history[d].checks || {});
            else setChecks({});
        };

        // Build 7-day calendar (today and 6 prior days)
        const calDays = useMemo(() => {
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const d = new Date(); d.setDate(d.getDate() - i);
                const ds = d.toISOString().slice(0, 10);
                const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' }).slice(0, 2);
                const dayNum = d.getDate();
                days.push({ ds, dayLabel, dayNum, data: history[ds] || null });
            }
            return days;
        }, [history]);

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

        const scoreColor = (p) => p >= 80 ? '#16a34a' : p >= 50 ? '#ca8a04' : '#dc2626';
        const scoreBg = (p) => p >= 80 ? '#f0fdf4' : p >= 50 ? '#fefce8' : '#fef2f2';
        const scoreBorder = (p) => p >= 80 ? '#86efac' : p >= 50 ? '#fde68a' : '#fca5a5';

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            // Action bar
            h('div', { className: 'flex gap-2 flex-wrap' },
                callGemini && h('button', {
                    onClick: handleGenerate, disabled: generating,
                    className: 'flex-1 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, generating ? '⏳ Generating...' : ('🧠 ' + (t('behavior_lens.fidelity.generate') || 'AI Generate Checklist from BIP'))),
                items.length > 0 && h('button', { onClick: saveToday, className: 'px-4 py-3 bg-emerald-500 text-white rounded-xl font-bold shadow-lg hover:bg-emerald-600 transition-all' }, '💾 Save Today'),
                items.length > 0 && h('button', { onClick: clearChecks, className: 'px-4 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all' }, '🔄 Clear')
            ),
            // 7-day streak calendar
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('h4', { className: 'text-[10px] font-black text-slate-500 uppercase mb-3' }, '📅 7-Day Fidelity Streak'),
                h('div', { className: 'grid grid-cols-7 gap-2' },
                    calDays.map(day =>
                        h('button', {
                            key: day.ds, onClick: () => loadDay(day.ds),
                            className: 'flex flex-col items-center p-2 rounded-lg border-2 transition-all cursor-pointer hover:shadow-md',
                            style: {
                                borderColor: day.ds === date ? '#6366f1' : day.data ? scoreBorder(day.data.pct) : '#e2e8f0',
                                background: day.data ? scoreBg(day.data.pct) : '#fff',
                            }
                        },
                            h('span', { className: 'text-[9px] font-bold text-slate-400 uppercase' }, day.dayLabel),
                            h('span', { className: 'text-sm font-black', style: { color: day.data ? scoreColor(day.data.pct) : '#cbd5e1' } }, day.dayNum),
                            day.data ? h('span', { className: 'text-[9px] font-bold', style: { color: scoreColor(day.data.pct) } }, `${day.data.pct}%`)
                                : h('span', { className: 'text-[9px] text-slate-300' }, '—')
                        )
                    )
                )
            ),
            // Checklist
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm print:shadow-none' },
                h('div', { className: 'flex items-center justify-between mb-4 border-b pb-3' },
                    h('h3', { className: 'text-sm font-black text-slate-800' }, '✅ ' + (t('behavior_lens.fidelity.title') || 'Teacher Fidelity Checklist')),
                    h('input', { type: 'date', value: date, onChange: (e) => loadDay(e.target.value), className: 'text-xs border border-slate-200 rounded-lg px-2 py-1 print:border-black' })
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
                items.length > 0 && h('div', { className: 'mt-4 p-3 rounded-lg border text-center', style: { background: scoreBg(pct), borderColor: scoreBorder(pct) } },
                    h('div', { className: 'text-xs font-bold uppercase', style: { color: scoreColor(pct) } }, 'Fidelity Score'),
                    h('div', { className: 'text-2xl font-black', style: { color: scoreColor(pct) } }, `${checkedCount}/${totalItems} (${pct}%)`)
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
    const HomeBehaviorLog = ({ studentName, t, addToast, callGemini }) => {
        const [entries, setEntries] = useState([]);
        const [showForm, setShowForm] = useState(false);
        const [newEntry, setNewEntry] = useState({ context: '', behavior: '', response: '', notes: '', mood: '' });
        const [aiPatternLoading, setAiPatternLoading] = useState(false);
        const [aiPatternResult, setAiPatternResult] = useState('');

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

        const homeMoods = [
            { emoji: '😊', label: 'Good day' },
            { emoji: '😐', label: 'Okay' },
            { emoji: '😟', label: 'Challenging' }
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
            setNewEntry({ context: '', behavior: '', response: '', notes: '', mood: '' });
            setShowForm(false);
            if (addToast) addToast('Entry saved ✅', 'success');
        };

        // Export home log entries as a Snapshot JSON file
        const handleExportSnapshot = () => {
            if (entries.length === 0) {
                if (addToast) addToast('No entries to export', 'error');
                return;
            }
            const snapshot = {
                type: 'behaviorLens_homeLog_snapshot',
                version: 1,
                studentName: studentName || 'Unknown',
                exportedAt: new Date().toISOString(),
                homeLogEntries: entries
            };
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `home-log-${(studentName || 'student').replace(/\s+/g, '_')}-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
            if (addToast) addToast('Home log exported as snapshot 📦', 'success');
        };

        // Summary stats
        const summary = useMemo(() => {
            if (entries.length === 0) return null;
            const contextCounts = {};
            entries.forEach(e => {
                if (e.context) contextCounts[e.context] = (contextCounts[e.context] || 0) + 1;
            });
            const topContext = Object.entries(contextCounts).sort((a, b) => b[1] - a[1])[0];
            return {
                count: entries.length,
                topContext: topContext ? topContext[0] : null,
                latest: entries[0]?.timestamp
            };
        }, [entries]);

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4' },
                h('h3', { className: 'text-sm font-black text-blue-800 mb-1' }, '🏠 ' + (t('behavior_lens.homelog.title') || 'Home Behavior Log')),
                h('p', { className: 'text-xs text-blue-600' }, 'Track behaviors at home using simple, everyday language. This helps your child\'s school team see the full picture.')
            ),
            // Summary strip
            summary && h('div', { className: 'flex flex-wrap gap-3 bg-white rounded-xl border border-slate-200 px-4 py-3 shadow-sm' },
                h('div', { className: 'flex items-center gap-1.5' },
                    h('span', { className: 'text-xs font-bold text-blue-600' }, '📊'),
                    h('span', { className: 'text-xs text-slate-600' }, `${summary.count} entries`)
                ),
                summary.topContext && h('div', { className: 'flex items-center gap-1.5' },
                    h('span', { className: 'text-xs font-bold text-indigo-600' }, '📍'),
                    h('span', { className: 'text-xs text-slate-600' }, `Most common: ${summary.topContext}`)
                ),
                summary.latest && h('div', { className: 'flex items-center gap-1.5' },
                    h('span', { className: 'text-xs font-bold text-emerald-600' }, '🕒'),
                    h('span', { className: 'text-xs text-slate-600' }, `Latest: ${fmtDate(summary.latest)}`)
                )
            ),
            // Action buttons row
            h('div', { className: 'flex gap-2 flex-wrap' },
                h('button', {
                    onClick: () => setShowForm(!showForm),
                    className: 'flex-1 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-sm'
                }, showForm ? '▾ Close Form' : '➕ Log a Behavior'),
                entries.length > 0 && h('button', {
                    onClick: handleExportSnapshot,
                    className: 'px-4 py-3 bg-cyan-50 border border-cyan-200 text-cyan-700 rounded-xl font-bold text-sm hover:bg-cyan-100 transition-all'
                }, '📦 Export'),
                callGemini && entries.length >= 2 && h('button', {
                    onClick: async () => {
                        setAiPatternLoading(true);
                        try {
                            const entrySummary = entries.slice(0, 15).map(e => `Context: ${e.context}, Behavior: ${e.behavior}, Response: ${e.response}, Mood: ${e.mood}`).join('\n');
                            const prompt = `You are a family behavior consultant. Analyze these home behavior log entries and identify patterns, triggers, and practical strategies.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'the student'}
Home log entries (${entries.length} total, showing up to 15):
${entrySummary}

Provide a brief analysis (3-5 bullet points) covering:
- Most common contexts/triggers
- Patterns in mood and behavior
- Which responses seem most effective
- 1-2 practical suggestions for the family`;
                            const result = await callGemini(prompt, true);
                            setAiPatternResult(result);
                            if (addToast) addToast('Pattern analysis complete ✨', 'success');
                        } catch (err) {
                            warnLog('Home log AI analysis failed:', err);
                            if (addToast) addToast('AI analysis failed', 'error');
                        } finally { setAiPatternLoading(false); }
                    },
                    disabled: aiPatternLoading,
                    className: 'px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, aiPatternLoading ? '⏳ Analyzing...' : '🧠 Analyze Patterns')
            ),
            // AI Pattern Analysis result
            aiPatternResult && h('div', { className: 'bg-purple-50 rounded-xl border border-purple-200 p-4' },
                h('div', { className: 'flex justify-between items-start mb-2' },
                    h('h4', { className: 'text-xs font-black text-purple-700 uppercase' }, '🧠 AI Pattern Analysis'),
                    h('button', { onClick: () => setAiPatternResult(''), className: 'text-purple-400 hover:text-purple-600 text-xs' }, '✕ Close')
                ),
                h('div', { className: 'text-xs text-purple-800 whitespace-pre-wrap leading-relaxed' }, aiPatternResult)
            ),
            // Entry form
            showForm && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-3' },
                // Mood selector
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, '🎭 How was the day overall?'),
                    h('div', { className: 'flex gap-2' },
                        homeMoods.map(m =>
                            h('button', {
                                key: m.emoji,
                                onClick: () => setNewEntry(p => ({ ...p, mood: m.emoji })),
                                className: `flex items-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-bold transition-all ${newEntry.mood === m.emoji
                                    ? 'border-blue-400 bg-blue-50 text-blue-700 shadow-sm'
                                    : 'border-slate-100 text-slate-500 hover:border-slate-300'}`
                            }, m.emoji, ' ', m.label)
                        )
                    )
                ),
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
                            h('div', { className: 'flex items-center gap-2' },
                                e.mood && h('span', { className: 'text-sm' }, e.mood),
                                h('span', { className: 'text-xs font-bold text-blue-600' }, e.context || 'General')
                            ),
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

    // ─── StudentSelfCheck ───────────────────────────────────────────────
    // Student-facing reflection tool: captures the student's own perspective
    const StudentSelfCheck = ({ studentName, t, addToast, callGemini }) => {
        const MOODS = [
            { emoji: '😊', label: 'Good', color: 'emerald' },
            { emoji: '😐', label: 'Okay', color: 'amber' },
            { emoji: '😟', label: 'Worried', color: 'blue' },
            { emoji: '😡', label: 'Frustrated', color: 'red' },
            { emoji: '😢', label: 'Sad', color: 'violet' }
        ];

        const [entries, setEntries] = useState([]);
        const [showForm, setShowForm] = useState(false);
        const [mood, setMood] = useState('');
        const [answers, setAnswers] = useState({ happening: '', feeling: '', needed: '', nextTime: '' });
        const storageKey = `behaviorLens_selfCheck_${studentName}`;
        const [aiReflectionLoading, setAiReflectionLoading] = useState(false);
        const [aiReflectionResult, setAiReflectionResult] = useState('');

        // Load from localStorage
        useEffect(() => {
            if (!studentName) return;
            try {
                const saved = localStorage.getItem(storageKey);
                if (saved) setEntries(JSON.parse(saved));
            } catch (e) { /* ignore */ }
        }, [studentName]);

        const saveReflection = () => {
            if (!mood) return;
            const entry = {
                id: uid(),
                timestamp: new Date().toISOString(),
                mood,
                ...answers
            };
            const updated = [entry, ...entries];
            setEntries(updated);
            try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch (e) { /* ignore */ }
            setMood('');
            setAnswers({ happening: '', feeling: '', needed: '', nextTime: '' });
            setShowForm(false);
            if (addToast) addToast('Reflection saved 🌟', 'success');
        };

        const deleteEntry = (id) => {
            const updated = entries.filter(e => e.id !== id);
            setEntries(updated);
            try { localStorage.setItem(storageKey, JSON.stringify(updated)); } catch (e) { /* ignore */ }
        };

        // Mood trend: count moods over last 7 entries
        const moodTrend = useMemo(() => {
            const recent = entries.slice(0, 7);
            const counts = {};
            MOODS.forEach(m => { counts[m.emoji] = 0; });
            recent.forEach(e => { if (counts[e.mood] !== undefined) counts[e.mood]++; });
            return counts;
        }, [entries]);

        const moodColorClass = (color) => ({
            emerald: 'bg-emerald-100 border-emerald-300 text-emerald-700',
            amber: 'bg-amber-100 border-amber-300 text-amber-700',
            blue: 'bg-blue-100 border-blue-300 text-blue-700',
            red: 'bg-red-100 border-red-300 text-red-700',
            violet: 'bg-violet-100 border-violet-300 text-violet-700'
        }[color] || 'bg-slate-100 border-slate-300 text-slate-700');

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            // Header
            h('div', { className: 'bg-gradient-to-r from-violet-50 to-indigo-50 rounded-xl border border-violet-200 p-5' },
                h('h3', { className: 'text-lg font-black text-violet-800 mb-1' }, '🪞 My Self-Check'),
                h('p', { className: 'text-xs text-violet-600 leading-relaxed' },
                    'This is your space. Tell us how you\'re feeling and what happened — in your own words. There are no wrong answers.'
                ),
                // Mood trend mini-bar (last 7)
                entries.length > 0 && h('div', { className: 'mt-3 flex items-center gap-3' },
                    h('span', { className: 'text-[10px] font-bold text-violet-500 uppercase' }, 'Recent moods:'),
                    h('div', { className: 'flex gap-1' },
                        MOODS.map(m =>
                            moodTrend[m.emoji] > 0 && h('div', {
                                key: m.emoji,
                                className: `flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${moodColorClass(m.color)}`
                            }, m.emoji, ' ', moodTrend[m.emoji])
                        )
                    )
                )
            ),
            // Add button + AI Analyze
            h('div', { className: 'flex gap-2' },
                h('button', {
                    onClick: () => setShowForm(!showForm),
                    className: 'flex-1 py-3 bg-gradient-to-r from-violet-500 to-indigo-500 text-white rounded-xl font-bold shadow-lg hover:shadow-xl transition-all text-sm'
                }, showForm ? '▾ Close' : '✨ How am I feeling right now?'),
                callGemini && entries.length >= 2 && h('button', {
                    onClick: async () => {
                        setAiReflectionLoading(true);
                        try {
                            const reflectionSummary = entries.slice(0, 10).map(e => `Mood: ${e.mood}, Happening: ${e.happening || 'N/A'}, Feeling: ${e.feeling || 'N/A'}, Needed: ${e.needed || 'N/A'}, Next time: ${e.nextTime || 'N/A'}`).join('\n');
                            const prompt = `You are a kind, supportive school counselor. Analyze these student self-check reflections and provide encouragement plus gentle insights.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'the student'}
Reflections (${entries.length} total, showing up to 10):
${reflectionSummary}

Provide a brief, warm analysis (3-4 bullet points) that:
- Highlights positive coping patterns they\'ve shown
- Gently identifies common triggers
- Celebrates self-awareness growth
- Suggests 1 strategy they could try
Keep language warm and age-appropriate.`;
                            const result = await callGemini(prompt, true);
                            setAiReflectionResult(result);
                            if (addToast) addToast('Reflection analysis ready 🌟', 'success');
                        } catch (err) {
                            warnLog('Self-check AI analysis failed:', err);
                            if (addToast) addToast('AI analysis failed', 'error');
                        } finally { setAiReflectionLoading(false); }
                    },
                    disabled: aiReflectionLoading,
                    className: 'px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, aiReflectionLoading ? '⏳ Thinking...' : '🧠 Analyze')
            ),
            // AI Analysis result
            aiReflectionResult && h('div', { className: 'bg-violet-50 rounded-xl border border-violet-200 p-4' },
                h('div', { className: 'flex justify-between items-start mb-2' },
                    h('h4', { className: 'text-xs font-black text-violet-700 uppercase' }, '🌟 My Reflection Patterns'),
                    h('button', { onClick: () => setAiReflectionResult(''), className: 'text-violet-400 hover:text-violet-600 text-xs' }, '✕ Close')
                ),
                h('div', { className: 'text-xs text-violet-800 whitespace-pre-wrap leading-relaxed' }, aiReflectionResult)
            ),
            // Form
            showForm && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm space-y-4' },
                // Mood picker
                h('div', null,
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-2' }, '🎭 Pick your mood'),
                    h('div', { className: 'flex gap-2 justify-center' },
                        MOODS.map(m =>
                            h('button', {
                                key: m.emoji,
                                onClick: () => setMood(m.emoji),
                                className: `flex flex-col items-center p-3 rounded-xl border-2 transition-all min-w-[60px] ${mood === m.emoji
                                    ? `${moodColorClass(m.color)} shadow-md scale-110`
                                    : 'border-slate-100 hover:border-slate-300 bg-white'}`
                            },
                                h('span', { className: 'text-2xl mb-1' }, m.emoji),
                                h('span', { className: 'text-[10px] font-bold' }, m.label)
                            )
                        )
                    )
                ),
                // Structured prompts
                [
                    { key: 'happening', label: '📍 What was happening?', placeholder: 'What was going on before you felt this way?' },
                    { key: 'feeling', label: '💭 How were you feeling inside?', placeholder: 'Nervous? Angry? Bored? Overwhelmed?' },
                    { key: 'needed', label: '🤝 What did you need?', placeholder: 'A break? Help? Someone to listen? Space?' },
                    { key: 'nextTime', label: '💡 What might help next time?', placeholder: 'What could you or a grown-up do differently?' }
                ].map(q =>
                    h('div', { key: q.key },
                        h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase block mb-1' }, q.label),
                        h('textarea', {
                            value: answers[q.key],
                            onChange: (e) => setAnswers(p => ({ ...p, [q.key]: e.target.value })),
                            placeholder: q.placeholder,
                            rows: 2,
                            className: 'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:ring-2 focus:ring-violet-400 outline-none'
                        })
                    )
                ),
                h('button', {
                    onClick: saveReflection,
                    disabled: !mood,
                    className: 'w-full py-2.5 bg-violet-500 text-white rounded-xl font-bold hover:bg-violet-600 disabled:opacity-40 transition-all'
                }, '💾 Save My Reflection')
            ),
            // Timeline
            entries.length > 0
                ? h('div', { className: 'space-y-2' },
                    h('h4', { className: 'text-xs font-black text-slate-500 uppercase' },
                        `${entries.length} Reflection${entries.length !== 1 ? 's' : ''}`
                    ),
                    entries.slice(0, 20).map(e => {
                        const moodObj = MOODS.find(m => m.emoji === e.mood) || MOODS[0];
                        return h('div', {
                            key: e.id,
                            className: `bg-white rounded-xl border border-slate-200 p-4 shadow-sm`
                        },
                            h('div', { className: 'flex justify-between items-start mb-2' },
                                h('div', { className: 'flex items-center gap-2' },
                                    h('span', { className: `text-lg px-2 py-0.5 rounded-full border ${moodColorClass(moodObj.color)}` }, e.mood),
                                    h('span', { className: 'text-xs font-bold text-slate-600' }, moodObj.label)
                                ),
                                h('div', { className: 'flex items-center gap-2' },
                                    h('span', { className: 'text-[10px] text-slate-400' }, fmtDate(e.timestamp)),
                                    h('button', {
                                        onClick: () => deleteEntry(e.id),
                                        className: 'text-slate-300 hover:text-red-500 transition-colors p-0.5'
                                    }, h(Trash2, { size: 11 }))
                                )
                            ),
                            e.happening && h('div', { className: 'text-xs text-slate-600 mb-1' },
                                h('span', { className: 'font-bold text-slate-500' }, '📍 '), e.happening
                            ),
                            e.feeling && h('div', { className: 'text-xs text-slate-600 mb-1' },
                                h('span', { className: 'font-bold text-slate-500' }, '💭 '), e.feeling
                            ),
                            e.needed && h('div', { className: 'text-xs text-slate-600 mb-1' },
                                h('span', { className: 'font-bold text-slate-500' }, '🤝 '), e.needed
                            ),
                            e.nextTime && h('div', { className: 'text-xs text-emerald-600 bg-emerald-50 rounded px-2 py-1 mt-1' },
                                h('span', { className: 'font-bold' }, '💡 '), e.nextTime
                            )
                        );
                    })
                )
                : h('div', { className: 'text-center py-8 bg-slate-50 rounded-xl' },
                    h('div', { className: 'text-3xl mb-2' }, '🪞'),
                    h('p', { className: 'text-sm text-slate-500' }, 'No reflections yet. Tap the button above to check in with yourself!')
                )
        );
    };

    // ─── SnapshotExchange ────────────────────────────────────────────────
    // Sneakernet JSON export/import for parent-teacher data exchange
    const SnapshotExchange = ({ studentName, abcEntries, observationSessions, aiAnalysis, setAbcEntries, setObservationSessions, t, addToast, callGemini }) => {
        const [tab, setTab] = useState('export');
        const [role, setRole] = useState('educator');
        const [message, setMessage] = useState('');
        const [includeAbc, setIncludeAbc] = useState(true);
        const [includeObs, setIncludeObs] = useState(true);
        const [includeAi, setIncludeAi] = useState(true);
        const [includeHomeLog, setIncludeHomeLog] = useState(true);
        const [includeSelfCheck, setIncludeSelfCheck] = useState(true);
        const [importPreview, setImportPreview] = useState(null);
        const [dragActive, setDragActive] = useState(false);
        const fileRef = useRef(null);
        const [aiMessageLoading, setAiMessageLoading] = useState(false);

        // Read home log and self-check entries from localStorage
        const homeLogEntries = useMemo(() => {
            try {
                const saved = localStorage.getItem(`behaviorLens_homeLog_${studentName}`);
                return saved ? JSON.parse(saved) : [];
            } catch (e) { return []; }
        }, [studentName]);
        const selfCheckEntries = useMemo(() => {
            try {
                const saved = localStorage.getItem(`behaviorLens_selfCheck_${studentName}`);
                return saved ? JSON.parse(saved) : [];
            } catch (e) { return []; }
        }, [studentName]);

        const allChecks = [includeAbc, includeObs, includeAi, includeHomeLog, includeSelfCheck];
        const allSelected = allChecks.every(Boolean);
        const noneSelected = allChecks.every(v => !v);
        const toggleAll = () => {
            const next = !allSelected;
            setIncludeAbc(next); setIncludeObs(next); setIncludeAi(next); setIncludeHomeLog(next); setIncludeSelfCheck(next);
        };

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
                    homeLogEntries: includeHomeLog ? homeLogEntries : [],
                    selfCheckEntries: includeSelfCheck ? selfCheckEntries : [],
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
                h('div', { className: 'flex items-center justify-between mb-2' },
                    h('label', { className: 'text-[10px] font-bold text-slate-500 uppercase' }, 'Data to Include'),
                    h('button', {
                        onClick: toggleAll,
                        className: 'text-[10px] font-bold text-cyan-600 hover:text-cyan-800 transition-colors'
                    }, allSelected ? 'Deselect All' : 'Select All')
                ),
                h('div', { className: 'space-y-2' },
                    [['abc', includeAbc, setIncludeAbc, `📋 ABC Observations (${abcEntries.length})`],
                    ['obs', includeObs, setIncludeObs, `🔍 Observation Sessions (${observationSessions.length})`],
                    ['ai', includeAi, setIncludeAi, `🧠 AI Analysis ${aiAnalysis ? '(Ready)' : '(None)'}`],
                    ['homelog', includeHomeLog, setIncludeHomeLog, `🏠 Home Log Entries (${homeLogEntries.length})`],
                    ['selfcheck', includeSelfCheck, setIncludeSelfCheck, `🪞 Student Self-Check (${selfCheckEntries.length})`]].map(([key, val, setter, label]) =>
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
            // Export button + AI message
            h('div', { className: 'flex gap-2' },
                h('button', {
                    onClick: handleExport,
                    disabled: noneSelected,
                    className: 'flex-1 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all flex items-center justify-center gap-2'
                }, h('span', null, '📦'), `Export ${role === 'educator' ? 'Educator' : 'Family'} Snapshot`),
                callGemini && h('button', {
                    onClick: async () => {
                        setAiMessageLoading(true);
                        try {
                            const dataOverview = [];
                            if (includeAbc && abcEntries.length > 0) dataOverview.push(`${abcEntries.length} ABC entries`);
                            if (includeObs && observationSessions.length > 0) dataOverview.push(`${observationSessions.length} observation sessions`);
                            if (includeAi && aiAnalysis) dataOverview.push('AI analysis included');
                            const prompt = `You are a ${role === 'educator' ? 'special education teacher writing to a family' : 'parent writing to the school team'}. Draft a brief, warm message to accompany a behavioral data snapshot.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'the student'}
Data included: ${dataOverview.join(', ') || 'None selected'}

Write 2-3 sentences that are professional, warm, and collaborative. Focus on partnership and shared success. Do NOT use the student's codename in the message.`;
                            const result = await callGemini(prompt, true);
                            setMessage(result.trim());
                            if (addToast) addToast('Message drafted ✨', 'success');
                        } catch (err) {
                            warnLog('Snapshot AI message failed:', err);
                            if (addToast) addToast('AI draft failed', 'error');
                        } finally { setAiMessageLoading(false); }
                    },
                    disabled: aiMessageLoading,
                    className: 'px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, aiMessageLoading ? '⏳' : '🧠 Draft')
            )
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
    const ConsentManager = ({ studentName, t, addToast, callGemini }) => {
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

        const [aiCustomizeLoading, setAiCustomizeLoading] = useState(false);

        const handleAiCustomize = async () => {
            if (!callGemini) return;
            setAiCustomizeLoading(true);
            try {
                const prompt = `You are a school compliance specialist. Customize this FERPA consent form language to be warmer and more family-friendly while maintaining legal compliance.
${RESTORATIVE_PREAMBLE}

School/District: ${schoolName || 'Not specified'}
Teacher/Specialist: ${teacherName || 'Not specified'}

Current sections:
${sections.map(s => `## ${s.title}\n${s.content}`).join('\n\n')}

Rewrite all section content to be warmer, more accessible, and family-friendly while keeping legal accuracy. Return ONLY valid JSON:
{
  "sections": [
    { "id": "section_id", "content": "rewritten content" }
  ]
}`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Parse failed'); }
                if (parsed.sections && Array.isArray(parsed.sections)) {
                    setSections(prev => prev.map(s => {
                        const updated = parsed.sections.find(u => u.id === s.id);
                        return updated ? { ...s, content: updated.content } : s;
                    }));
                    if (addToast) addToast('Language customized \u2728', 'success');
                }
            } catch (err) {
                warnLog('Consent AI customize failed:', err);
                if (addToast) addToast('AI customization failed', 'error');
            } finally { setAiCustomizeLoading(false); }
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
                ),
                callGemini && h('button', {
                    onClick: handleAiCustomize,
                    disabled: aiCustomizeLoading,
                    className: 'w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg disabled:opacity-40 transition-all'
                }, aiCustomizeLoading ? '⏳ Customizing...' : '🧠 AI Customize Language')
            )
        );
    };

    // ─── InterventionPlanGenerator ─────────────────────────────────────
    const InterventionPlanGenerator = ({ studentName, abcEntries, observationSessions, aiAnalysis, callGemini, t, addToast }) => {
        const [plan, setPlan] = useState('');
        const [generating, setGenerating] = useState(false);
        const [weeks, setWeeks] = useState(4);
        const [preAiPlan, setPreAiPlan] = useState(null);

        const handleGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const behaviors = abcEntries.slice(-10).map(e =>
                    `B: ${e.behavior} | A: ${e.antecedent} | C: ${e.consequence} | Intensity: ${e.intensity}/5`
                ).join('\n');
                const funcStr = aiAnalysis?.hypothesizedFunction || 'not yet determined';
                const obsCount = observationSessions?.length || 0;
                const prompt = `You are a Board Certified Behavior Analyst (BCBA) drafting a multi-week intervention plan.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'Student'}
Hypothesized function: ${funcStr}
Number of observation sessions: ${obsCount}
Timeframe: ${weeks} weeks
Recent ABC data:
${behaviors || 'No data collected yet'}

Create a structured ${weeks}-week intervention plan that includes:
1. TARGET BEHAVIORS — List 2-3 target behaviors (operational definitions)
2. MEASURABLE GOALS — SMART goals with specific criteria
3. INTERVENTION STRATEGIES — Evidence-based strategies matched to the hypothesized function
4. WEEKLY MILESTONES — Week-by-week progress targets
5. DATA COLLECTION SCHEDULE — When/how to collect data
6. REVIEW DATES — When to review and adjust the plan
7. REPLACEMENT BEHAVIORS — Positive alternatives to teach

Use plain text formatting. Be specific and actionable.`;
                setPreAiPlan(plan);
                const result = await callGemini(prompt, true);
                setPlan(result);
                if (addToast) addToast('Intervention plan generated ✨', 'success');
            } catch (err) {
                warnLog('Intervention plan failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '📋 ' + (t('behavior_lens.intervention.title') || 'AI Intervention Plan Generator')),
                h('p', { className: 'text-xs text-slate-500 mb-4' }, 'Generate a multi-week intervention plan based on your collected ABC data and AI analysis.'),
                h('div', { className: 'flex items-center gap-3 mb-4' },
                    h('label', { className: 'text-xs font-bold text-slate-600' }, 'Weeks:'),
                    [2, 4, 6, 8].map(w =>
                        h('button', {
                            key: w,
                            onClick: () => setWeeks(w),
                            className: `px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${weeks === w ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                        }, `${w}w`)
                    )
                ),
                h('div', { className: 'flex items-center gap-2 text-xs text-slate-400 mb-3' },
                    h('span', null, `📊 ${abcEntries.length} ABC entries`),
                    h('span', null, '•'),
                    h('span', null, `🔍 ${observationSessions?.length || 0} observations`),
                    aiAnalysis && h('span', null, '•'),
                    aiAnalysis && h('span', { className: 'text-purple-500 font-bold' }, `🧠 Function: ${aiAnalysis.hypothesizedFunction}`)
                )
            ),
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating,
                className: 'w-full py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, generating ? '⏳ Generating Plan...' : '🧠 Generate Intervention Plan'),
            plan && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('textarea', {
                    value: plan,
                    onChange: e => setPlan(e.target.value),
                    rows: 20,
                    className: 'w-full text-sm text-slate-700 leading-relaxed resize-none outline-none'
                }),
                h('div', { className: 'flex gap-2 mt-3' },
                    h('button', {
                        onClick: () => { navigator.clipboard.writeText(plan); if (addToast) addToast('Copied!', 'success'); },
                        className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200'
                    }, '📋 Copy'),
                    h('button', { onClick: () => window.print(), className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200' }, '🖨️ Print'),
                    preAiPlan !== null && h('button', {
                        onClick: () => { setPlan(preAiPlan); setPreAiPlan(null); if (addToast) addToast('Reverted to previous', 'info'); },
                        className: 'px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-100'
                    }, '↩️ Undo AI')
                )
            )
        );
    };

    // ─── ProgressNarrativeGenerator ──────────────────────────────────────
    const ProgressNarrativeGenerator = ({ studentName, abcEntries, observationSessions, aiAnalysis, callGemini, t, addToast }) => {
        const [narrative, setNarrative] = useState('');
        const [generating, setGenerating] = useState(false);
        const [style, setStyle] = useState('detailed');
        const [preAiNarrative, setPreAiNarrative] = useState(null);

        const handleGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const behaviors = abcEntries.slice(-15).map(e =>
                    `${new Date(e.timestamp).toLocaleDateString()}: B=${e.behavior}, A=${e.antecedent}, C=${e.consequence}, Intensity=${e.intensity}/5`
                ).join('\n');
                const funcStr = aiAnalysis?.hypothesizedFunction || 'not yet determined';
                const prompt = `You are a special education teacher writing a progress monitoring narrative for an IEP progress report.
${RESTORATIVE_PREAMBLE}

Student codename: ${studentName || 'Student'}
Report style: ${style}
Hypothesized function: ${funcStr}
Total ABC entries collected: ${abcEntries.length}
Total observation sessions: ${observationSessions?.length || 0}
AI analysis summary: ${aiAnalysis?.summary || 'Not yet analyzed'}

Recent data:
${behaviors || 'No data collected yet'}

Write an IEP-ready progress monitoring narrative that includes:
1. Current performance level
2. Progress toward behavioral goals
3. Data-based observations (cite specific frequency/intensity trends)
4. Effectiveness of current interventions
5. Recommendations for next steps

${style === 'brief' ? 'Keep it concise — 1-2 paragraphs maximum.' : 'Provide a detailed narrative with specific data references.'}
Use professional, objective language. Do NOT use the student codename — use "the student" instead. Include the reporting period.`;
                setPreAiNarrative(narrative);
                const result = await callGemini(prompt, true);
                setNarrative(result);
                if (addToast) addToast('Progress narrative generated ✨', 'success');
            } catch (err) {
                warnLog('Progress narrative failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '📈 ' + (t('behavior_lens.progress.title') || 'Progress Narrative Generator')),
                h('p', { className: 'text-xs text-slate-500 mb-4' }, 'Generate IEP-ready progress monitoring paragraphs from your accumulated behavioral data.'),
                h('div', { className: 'flex items-center gap-3 mb-3' },
                    h('label', { className: 'text-xs font-bold text-slate-600' }, 'Style:'),
                    ['brief', 'detailed'].map(s =>
                        h('button', {
                            key: s,
                            onClick: () => setStyle(s),
                            className: `px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${style === s ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`
                        }, s === 'brief' ? '⚡ Brief' : '📄 Detailed')
                    )
                ),
                h('div', { className: 'flex items-center gap-2 text-xs text-slate-400' },
                    h('span', null, `📊 ${abcEntries.length} entries`),
                    h('span', null, '•'),
                    h('span', null, `🔍 ${observationSessions?.length || 0} sessions`),
                    aiAnalysis && h('span', null, '•'),
                    aiAnalysis && h('span', { className: 'text-green-600 font-bold' }, '✅ AI analysis available')
                )
            ),
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating,
                className: 'w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, generating ? '⏳ Generating Narrative...' : '🧠 Generate Progress Narrative'),
            narrative && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('textarea', {
                    value: narrative,
                    onChange: e => setNarrative(e.target.value),
                    rows: 14,
                    className: 'w-full text-sm text-slate-700 leading-relaxed resize-none outline-none'
                }),
                h('div', { className: 'flex gap-2 mt-3' },
                    h('button', {
                        onClick: () => { navigator.clipboard.writeText(narrative); if (addToast) addToast('Copied!', 'success'); },
                        className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200'
                    }, '📋 Copy'),
                    h('button', { onClick: () => window.print(), className: 'px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-bold hover:bg-slate-200' }, '🖨️ Print'),
                    preAiNarrative !== null && h('button', {
                        onClick: () => { setNarrative(preAiNarrative); setPreAiNarrative(null); if (addToast) addToast('Reverted to previous', 'info'); },
                        className: 'px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-100'
                    }, '↩️ Undo AI')
                )
            )
        );
    };

    // ─── PracticeSandbox ────────────────────────────────────────────────
    // AI + pre-built scenario generator for PD / research practice
    const PracticeSandbox = ({ onLoadScenario, callGemini, t, addToast }) => {
        const [customFunc, setCustomFunc] = useState('escape');
        const [customGrade, setCustomGrade] = useState('3-5');
        const [customContext, setCustomContext] = useState('');
        const [generating, setGenerating] = useState(false);
        const [selectedPrebuilt, setSelectedPrebuilt] = useState(null);

        const functions = [
            { id: 'escape', label: '🚪 Escape/Avoidance' },
            { id: 'attention', label: '👋 Attention-Seeking' },
            { id: 'sensory', label: '🌀 Sensory/Automatic' },
            { id: 'tangible', label: '🎯 Tangible Access' }
        ];
        const grades = [
            { id: 'K-2', label: 'K-2 (ages 5-8)' },
            { id: '3-5', label: '3-5 (ages 8-11)' },
            { id: '6-8', label: '6-8 (ages 11-14)' },
            { id: '9-12', label: '9-12 (ages 14-18)' }
        ];

        // ── 4 Pre-built classic scenarios ──
        const prebuiltScenarios = useMemo(() => [
            {
                id: 'escape_work_refusal',
                title: '🚪 Escape-Maintained Work Refusal',
                desc: 'A 3rd grader who avoids difficult academic tasks through refusal and off-task behavior.',
                backstory: 'This student struggles with multi-step math problems and reading comprehension tasks above their instructional level. Behaviors primarily occur during independent work time and escalate when redirected.',
                entries: [
                    { id: 'p1', timestamp: new Date(Date.now() - 14 * 86400000).toISOString(), behavior: 'Put head on desk and refused to start math worksheet', antecedent: 'Teacher distributed multi-step word problems', consequence: 'Teacher allowed student to work on easier problems', setting: 'Math class, independent work', intensity: 3, duration: '12 min', notes: '' },
                    { id: 'p2', timestamp: new Date(Date.now() - 13 * 86400000).toISOString(), behavior: 'Said "I can\'t do this" and crumpled paper', antecedent: 'Reading comprehension passage distributed', consequence: 'Para read passage aloud to student', setting: 'ELA class', intensity: 4, duration: '5 min', notes: '' },
                    { id: 'p3', timestamp: new Date(Date.now() - 11 * 86400000).toISOString(), behavior: 'Left seat to sharpen pencil 4 times in 10 minutes', antecedent: 'Writing assignment started', consequence: 'Teacher redirected each time', setting: 'ELA class, writing', intensity: 2, duration: '10 min', notes: 'Avoidance pattern' },
                    { id: 'p4', timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), behavior: 'Complained of stomachache, asked to go to nurse', antecedent: 'Math test announced', consequence: 'Sent to nurse, missed start of test', setting: 'Math class', intensity: 2, duration: '20 min', notes: 'Nurse found no symptoms' },
                    { id: 'p5', timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), behavior: 'Engaged cooperatively with math manipulatives', antecedent: 'Math lesson transitioned to hands-on activity', consequence: 'Teacher praised effort', setting: 'Math class, group work', intensity: 1, duration: '25 min', notes: 'Positive engagement' },
                    { id: 'p6', timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), behavior: 'Threw pencil across room', antecedent: 'Asked to redo incorrect problems on worksheet', consequence: 'Removed from class for 5 minutes', setting: 'Math class', intensity: 5, duration: '3 min', notes: 'Escalation after redirect' },
                    { id: 'p7', timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), behavior: 'Asked to work with partner instead of alone', antecedent: 'Independent reading assignment', consequence: 'Teacher allowed partner work', setting: 'ELA class', intensity: 1, duration: '2 min', notes: 'Appropriate request' },
                    { id: 'p8', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), behavior: 'Shut down completely, would not respond to staff', antecedent: 'Substitute teacher gave unfamiliar assignment', consequence: 'Left alone, eventually rejoined after 15 min', setting: 'Science class', intensity: 4, duration: '15 min', notes: 'Change in routine' },
                    { id: 'p9', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), behavior: 'Completed modified worksheet with minimal prompting', antecedent: 'Teacher provided choice of 2 assignments', consequence: 'Earned 5 min free time', setting: 'Math class', intensity: 1, duration: '20 min', notes: 'Choice helped' },
                    { id: 'p10', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), behavior: 'Argued with teacher about assignment length', antecedent: 'Long reading passage assigned', consequence: 'Teacher broke into smaller chunks', setting: 'ELA class', intensity: 3, duration: '8 min', notes: '' },
                ],
                observations: [
                    { method: 'frequency', timer: 1800, frequency: 6, notes: 'Math class independent work — 6 off-task behaviors in 30 min' },
                    { method: 'interval', timer: 1200, frequency: 0, intervals: '++--+-+---+-', notes: 'Partial interval: on-task in 5/12 intervals during ELA' },
                ]
            },
            {
                id: 'attention_disruption',
                title: '👋 Attention-Seeking Disruption',
                desc: 'A 5th grader who makes noises and disrupts class to get peer and teacher attention.',
                backstory: 'This student is socially motivated and seeks connection through disruptive behavior. They have limited positive peer relationships and thrive when given leadership roles or one-on-one attention.',
                entries: [
                    { id: 'a1', timestamp: new Date(Date.now() - 12 * 86400000).toISOString(), behavior: 'Made loud animal sounds during silent reading', antecedent: 'Class was working quietly', consequence: 'Peers laughed, teacher gave verbal warning', setting: 'ELA class, silent reading', intensity: 3, duration: '4 min', notes: 'Peers reinforced' },
                    { id: 'a2', timestamp: new Date(Date.now() - 11 * 86400000).toISOString(), behavior: 'Fell out of chair intentionally', antecedent: 'Teacher was helping another student', consequence: 'Teacher came over to check on student', setting: 'Math class', intensity: 3, duration: '2 min', notes: '' },
                    { id: 'a3', timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), behavior: 'Called out answer without raising hand 7 times', antecedent: 'Teacher asked class questions during lesson', consequence: 'Teacher reminded about hand-raising each time', setting: 'Science class, whole group', intensity: 2, duration: '15 min', notes: '' },
                    { id: 'a4', timestamp: new Date(Date.now() - 9 * 86400000).toISOString(), behavior: 'Led group activity cooperatively', antecedent: 'Assigned group leader role', consequence: 'Teacher praised leadership', setting: 'Social studies, group project', intensity: 1, duration: '30 min', notes: 'Positive when given role' },
                    { id: 'a5', timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), behavior: 'Poked peers and tapped desk repeatedly', antecedent: 'Sitting in back during lecture', consequence: 'Moved to front of room', setting: 'Math class, lecture', intensity: 3, duration: '10 min', notes: '' },
                    { id: 'a6', timestamp: new Date(Date.now() - 6 * 86400000).toISOString(), behavior: 'Told elaborate story during morning meeting, wouldn\'t stop', antecedent: 'Share time with time limit', consequence: 'Teacher let student finish, discussed time limits after', setting: 'Morning meeting', intensity: 2, duration: '5 min', notes: '' },
                    { id: 'a7', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), behavior: 'Helped new student navigate school', antecedent: 'Teacher asked student to be a buddy', consequence: 'Positive note home, teacher praise', setting: 'Hallway/lunch', intensity: 1, duration: '45 min', notes: 'Excellent pro-social behavior' },
                    { id: 'a8', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), behavior: 'Sang loudly during independent work', antecedent: 'No direct attention for 10+ minutes', consequence: 'Teacher gave stern look, student stopped briefly then resumed', setting: 'ELA class', intensity: 3, duration: '8 min', notes: '' },
                    { id: 'a9', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), behavior: 'Threw eraser at another student', antecedent: 'Peer ignored student\'s question', consequence: 'Sent to office, discussed with counselor', setting: 'Art class', intensity: 4, duration: '1 min', notes: 'Escalation' },
                ],
                observations: [
                    { method: 'frequency', timer: 2400, frequency: 9, notes: 'Whole morning — 9 attention-seeking behaviors across 3 classes' },
                    { method: 'frequency', timer: 1800, frequency: 2, notes: 'Afternoon with leadership role — only 2 minor incidents' },
                ]
            },
            {
                id: 'sensory_stimulation',
                title: '🌀 Sensory-Seeking Self-Stimulation',
                desc: 'A 1st grader with repetitive motor behaviors during unstructured and low-stimulation times.',
                backstory: 'This student engages in hand-flapping, spinning objects, and rocking. Behaviors increase during transitions and low-structure time but decrease significantly with sensory input (fidgets, movement breaks).',
                entries: [
                    { id: 's1', timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), behavior: 'Hand-flapping for extended period', antecedent: 'Waiting in line for lunch', consequence: 'No staff response', setting: 'Hallway, transition', intensity: 2, duration: '3 min', notes: '' },
                    { id: 's2', timestamp: new Date(Date.now() - 9 * 86400000).toISOString(), behavior: 'Spinning a pencil and watching it intently', antecedent: 'Free time after finishing worksheet early', consequence: 'Allowed to continue', setting: 'Math class, free time', intensity: 1, duration: '10 min', notes: '' },
                    { id: 's3', timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), behavior: 'Rocking in chair during story time', antecedent: 'Teacher reading aloud, dim lights', consequence: 'Given weighted lap pad', setting: 'Carpet area, read-aloud', intensity: 2, duration: '15 min', notes: 'Reduced with lap pad' },
                    { id: 's4', timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), behavior: 'Humming continuously', antecedent: 'Silent work period', consequence: 'Peers complained, teacher moved student', setting: 'ELA class', intensity: 3, duration: '12 min', notes: '' },
                    { id: 's5', timestamp: new Date(Date.now() - 6 * 86400000).toISOString(), behavior: 'Engaged appropriately with fidget tool', antecedent: 'Given sensory break BEFORE transition', consequence: 'Smooth transition to next class', setting: 'Between classes', intensity: 1, duration: '5 min', notes: 'Proactive sensory input worked' },
                    { id: 's6', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), behavior: 'Bit shirt collar and chewed pencil eraser', antecedent: 'Standardized testing, long quiet period', consequence: 'Given chewy tube', setting: 'Testing room', intensity: 3, duration: '20 min', notes: 'Oral sensory seeking' },
                    { id: 's7', timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), behavior: 'Jumped and spun during recess without interacting with peers', antecedent: 'Open recess time', consequence: 'None — self-directed play', setting: 'Playground', intensity: 2, duration: '15 min', notes: 'Typical pattern' },
                    { id: 's8', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), behavior: 'Hand-flapping increased significantly, knocked materials off desk', antecedent: 'Unexpected fire drill', consequence: 'Taken to calm corner with noise-canceling headphones', setting: 'Classroom after drill', intensity: 5, duration: '8 min', notes: 'Sensory overload from alarm' },
                ],
                observations: [
                    { method: 'interval', timer: 1800, frequency: 0, intervals: '+-++-+++--+-', notes: '7/12 intervals with sensory behaviors during unstructured time' },
                    { method: 'interval', timer: 1800, frequency: 0, intervals: '---+----+---', notes: '2/12 intervals with sensory behaviors AFTER movement break' },
                ]
            },
            {
                id: 'tangible_aggression',
                title: '🎯 Tangible Access Aggression',
                desc: 'A 7th grader who uses physical intimidation to obtain desired items or activities.',
                backstory: 'This student struggles with delayed gratification and perspective-taking. Has a history of getting their way through physical behavior. Responds well to clear token systems and when given scheduled access to preferred activities.',
                entries: [
                    { id: 't1', timestamp: new Date(Date.now() - 13 * 86400000).toISOString(), behavior: 'Grabbed phone from peer\'s hand', antecedent: 'Saw peer watching video during break', consequence: 'Phone confiscated from both, student sent to office', setting: 'Lunch break', intensity: 4, duration: '1 min', notes: '' },
                    { id: 't2', timestamp: new Date(Date.now() - 11 * 86400000).toISOString(), behavior: 'Pushed student out of computer chair', antecedent: 'Wanted to use specific computer that was occupied', consequence: 'Lost computer privileges for the day', setting: 'Computer lab', intensity: 5, duration: '30 sec', notes: 'Immediate physical response' },
                    { id: 't3', timestamp: new Date(Date.now() - 10 * 86400000).toISOString(), behavior: 'Used token board to request computer time appropriately', antecedent: 'Token board system introduced', consequence: 'Earned 10 min on preferred computer', setting: 'Computer lab', intensity: 1, duration: '1 min', notes: 'Token system working' },
                    { id: 't4', timestamp: new Date(Date.now() - 8 * 86400000).toISOString(), behavior: 'Threatened peer: "Give me that or else"', antecedent: 'Peer had basketball student wanted at recess', consequence: 'Teacher mediated, practiced asking nicely', setting: 'Recess', intensity: 4, duration: '2 min', notes: '' },
                    { id: 't5', timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), behavior: 'Slammed fist on table when told wait time was 5 more minutes', antecedent: 'Told to wait for turn on tablet', consequence: 'Timer shown, visual countdown given', setting: 'Resource room', intensity: 3, duration: '3 min', notes: 'Visual timer helped de-escalate' },
                    { id: 't6', timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), behavior: 'Waited patiently for turn using visual timer', antecedent: 'Visual timer placed on desk showing 3 min wait', consequence: 'Earned bonus time, teacher praised', setting: 'Resource room', intensity: 1, duration: '3 min', notes: 'Great progress with visual support' },
                    { id: 't7', timestamp: new Date(Date.now() - 4 * 86400000).toISOString(), behavior: 'Refused to return art supplies, held materials', antecedent: 'Clean-up time announced', consequence: 'Teacher offered first-to-use-tomorrow incentive', setting: 'Art class', intensity: 3, duration: '5 min', notes: '' },
                    { id: 't8', timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), behavior: 'Negotiated trade with peer using words', antecedent: 'Wanted peer\'s colored pencils', consequence: 'Successful trade, teacher praised problem-solving', setting: 'ELA class', intensity: 1, duration: '2 min', notes: 'Huge growth moment' },
                    { id: 't9', timestamp: new Date(Date.now() - 1 * 86400000).toISOString(), behavior: 'Took food from another student\'s tray', antecedent: 'Saw preferred snack on peer\'s tray', consequence: 'Restorative conversation, practiced asking', setting: 'Cafeteria', intensity: 3, duration: '1 min', notes: 'Impulsive — not aggressive' },
                ],
                observations: [
                    { method: 'frequency', timer: 7200, frequency: 4, notes: 'Full morning — 4 tangible-access incidents (2 physical, 2 verbal)' },
                    { method: 'frequency', timer: 7200, frequency: 1, notes: 'Full morning WITH token system — 1 minor incident' },
                ]
            }
        ], []);

        const handleLoadPrebuilt = (scenario) => {
            if (onLoadScenario) {
                onLoadScenario({
                    entries: scenario.entries,
                    observations: scenario.observations,
                    name: scenario.title
                });
                if (addToast) addToast(`Loaded: ${scenario.title}`, 'success');
            }
        };

        const handleCustomGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const funcLabel = functions.find(f => f.id === customFunc)?.label || customFunc;
                const prompt = `You are a BCBA creating realistic but FICTIONAL student behavioral data for educator training.
${RESTORATIVE_PREAMBLE}

Generate a complete practice scenario for a student in grade band ${customGrade} with a hypothesized behavioral function of ${funcLabel}.
${customContext ? `Additional context: ${customContext}` : ''}

Return a JSON object with this EXACT structure (no markdown, no explanation, ONLY valid JSON):
{
  "title": "Short scenario title",
  "backstory": "2-3 sentence background",
  "entries": [
    {
      "id": "e1",
      "timestamp": "ISO date string (within last 14 days)",
      "behavior": "Observable, measurable description",
      "antecedent": "What happened before",
      "consequence": "What happened after",
      "setting": "Where and when",
      "intensity": 1-5,
      "duration": "estimated duration",
      "notes": "optional note"
    }
  ],
  "observations": [
    { "method": "frequency or interval", "timer": seconds, "frequency": count, "notes": "description" }
  ]
}

Generate 10 entries and 2 observations. Include a mix of challenging behaviors AND positive moments. Use realistic school settings, specific measurable behaviors, and varied antecedents/consequences. Make timestamps spread across the last 14 days.`;

                const raw = await callGemini(prompt, true);
                // Parse JSON from response
                let data;
                try {
                    const jsonMatch = raw.match(/\{[\s\S]*\}/);
                    data = JSON.parse(jsonMatch ? jsonMatch[0] : raw);
                } catch (parseErr) {
                    throw new Error('Could not parse AI response as JSON');
                }

                if (data.entries && onLoadScenario) {
                    onLoadScenario({
                        entries: data.entries,
                        observations: data.observations || [],
                        name: data.title || 'AI-Generated Scenario'
                    });
                    if (addToast) addToast(`Generated: ${data.title || 'Custom Scenario'} ✨`, 'success');
                }
            } catch (err) {
                warnLog('Custom scenario generation failed:', err);
                if (addToast) addToast('Scenario generation failed — try again', 'error');
            } finally { setGenerating(false); }
        };

        return h('div', { className: 'max-w-3xl mx-auto space-y-5' },
            // Header
            h('div', { className: 'text-center py-4' },
                h('div', { className: 'text-4xl mb-2' }, '🎓'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Practice Sandbox'),
                h('p', { className: 'text-xs text-slate-500 max-w-lg mx-auto mt-1' },
                    'Load realistic but FICTIONAL student data to practice ABA data collection and analysis. Perfect for professional development, pre-service training, or learning the tool before working with real students.'
                ),
                h('div', { className: 'mt-3 inline-block px-3 py-1.5 bg-amber-100 text-amber-700 rounded-full text-[10px] font-bold' }, '⚠️ All data is simulated — no real students')
            ),

            // Pre-built scenarios
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '📚 Classic ABA Scenarios'),
                h('p', { className: 'text-xs text-slate-500 mb-4' }, 'Pre-built scenarios covering the 4 functions of behavior. Work offline — no AI needed.'),
                h('div', { className: 'grid grid-cols-1 md:grid-cols-2 gap-3' },
                    prebuiltScenarios.map(sc =>
                        h('div', {
                            key: sc.id,
                            className: `p-4 rounded-xl border-2 transition-all cursor-pointer ${selectedPrebuilt === sc.id ? 'border-blue-400 bg-blue-50/50' : 'border-slate-100 hover:border-blue-200 hover:bg-blue-50/20'}`
                        },
                            h('div', { onClick: () => setSelectedPrebuilt(selectedPrebuilt === sc.id ? null : sc.id) },
                                h('h4', { className: 'text-sm font-bold text-slate-800 mb-1' }, sc.title),
                                h('p', { className: 'text-[10px] text-slate-500 leading-relaxed' }, sc.desc),
                                h('div', { className: 'flex gap-2 mt-2' },
                                    h('span', { className: 'text-[9px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500' }, `${sc.entries.length} ABC entries`),
                                    h('span', { className: 'text-[9px] bg-slate-100 px-2 py-0.5 rounded-full text-slate-500' }, `${sc.observations.length} observations`)
                                )
                            ),
                            selectedPrebuilt === sc.id && h('div', { className: 'mt-3 pt-3 border-t border-slate-100' },
                                h('p', { className: 'text-[10px] text-slate-600 italic leading-relaxed mb-3' }, sc.backstory),
                                h('button', {
                                    onClick: () => handleLoadPrebuilt(sc),
                                    className: 'w-full py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg text-xs font-bold shadow hover:shadow-md transition-all'
                                }, '📥 Load This Scenario')
                            )
                        )
                    )
                )
            ),

            // AI Custom Scenario Generator
            callGemini && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '🤖 AI Custom Scenario'),
                h('p', { className: 'text-xs text-slate-500 mb-4' }, 'Generate a unique scenario tailored to your training needs.'),
                h('div', { className: 'grid grid-cols-2 gap-3 mb-3' },
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 block mb-1' }, 'Behavioral Function'),
                        h('select', {
                            value: customFunc,
                            onChange: e => setCustomFunc(e.target.value),
                            className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm'
                        }, functions.map(f => h('option', { key: f.id, value: f.id }, f.label)))
                    ),
                    h('div', null,
                        h('label', { className: 'text-[10px] font-bold text-slate-500 block mb-1' }, 'Grade Band'),
                        h('select', {
                            value: customGrade,
                            onChange: e => setCustomGrade(e.target.value),
                            className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm'
                        }, grades.map(g => h('option', { key: g.id, value: g.id }, g.label)))
                    )
                ),
                h('div', { className: 'mb-3' },
                    h('label', { className: 'text-[10px] font-bold text-slate-500 block mb-1' }, 'Additional Context (optional)'),
                    h('input', {
                        type: 'text',
                        value: customContext,
                        onChange: e => setCustomContext(e.target.value),
                        placeholder: 'e.g. "student with autism", "co-occurring ADHD", "new to the school"',
                        className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm'
                    })
                ),
                h('button', {
                    onClick: handleCustomGenerate,
                    disabled: generating,
                    className: 'w-full py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
                }, generating ? '⏳ Generating Scenario...' : '🧠 Generate Custom Scenario')
            )
        );
    };

    // ─── ABAGlossary ────────────────────────────────────────────────────
    // Searchable glossary of ABA terms with definitions and examples
    const ABAGlossary = ({ t }) => {
        const [search, setSearch] = useState('');
        const [expandedTerm, setExpandedTerm] = useState(null);

        const terms = useMemo(() => [
            { term: 'Antecedent', category: 'core', def: 'What happens immediately BEFORE a behavior occurs. This is the "trigger" or environmental event that sets the stage for the behavior.', example: 'The teacher says "Take out your math book" → student puts head on desk.' },
            { term: 'Behavior', category: 'core', def: 'The observable, measurable action performed by the student. Must be described in terms anyone could see and count.', example: '"Threw pencil across the room" (observable) vs. "got angry" (not observable).' },
            { term: 'Consequence', category: 'core', def: 'What happens immediately AFTER the behavior. This is what maintains (reinforces) or reduces the behavior over time.', example: 'Student throws pencil → teacher removes the math worksheet (consequence = removal of demand).' },
            { term: 'Function of Behavior', category: 'core', def: 'The PURPOSE that a behavior serves for the individual. All behavior communicates a need. The four functions are: Escape/Avoidance, Attention, Sensory/Automatic, and Tangible Access.', example: 'A student who screams when given difficult work likely has an ESCAPE function — the behavior helps them avoid the task.' },
            { term: 'Replacement Behavior', category: 'intervention', def: 'A socially appropriate behavior that serves the SAME function as the problem behavior. Must be easier, faster, and more efficient than the problem behavior.', example: 'Instead of screaming to escape work (problem), teaching the student to raise a "break" card (replacement) — both serve escape function.' },
            { term: 'Positive Reinforcement', category: 'concepts', def: 'ADDING something desirable after a behavior to INCREASE the likelihood of that behavior occurring again.', example: 'Student raises hand → teacher calls on them and praises effort → student raises hand more often.' },
            { term: 'Negative Reinforcement', category: 'concepts', def: 'REMOVING something aversive after a behavior to INCREASE the likelihood of that behavior occurring again. (Note: "negative" means removal, NOT punishment.)', example: 'Student completes work → teacher removes requirement for homework → student works harder in class.' },
            { term: 'Extinction', category: 'concepts', def: 'Withholding reinforcement for a previously reinforced behavior. The behavior initially increases (extinction burst) before decreasing.', example: 'Student calls out for attention → teacher ignores calling out, only responds to raised hand → calling out eventually decreases.' },
            { term: 'Extinction Burst', category: 'concepts', def: 'A temporary INCREASE in the frequency, duration, or intensity of a behavior when reinforcement is first withheld. This is normal and expected.', example: 'When teacher starts ignoring call-outs, student initially calls out louder and more frequently before the behavior decreases.' },
            { term: 'Setting Events', category: 'assessment', def: 'Broader environmental or internal factors that make a behavior MORE or LESS likely. These are not direct triggers but set the stage.', example: 'Student didn\'t eat breakfast (setting event) → more likely to be irritable → easier to trigger → behavior occurs.' },
            { term: 'Motivating Operations', category: 'assessment', def: 'Conditions that change the value of a reinforcer and alter the frequency of behavior related to that reinforcer. Two types: Establishing Operations (increase value) and Abolishing Operations (decrease value).', example: 'Student hasn\'t eaten (EO) → food becomes more reinforcing → more likely to engage in behavior to access food.' },
            { term: 'Functional Behavior Assessment (FBA)', category: 'assessment', def: 'A systematic process for identifying the PURPOSE (function) of a behavior. Includes interviews, direct observation, and data analysis to develop a hypothesis about why the behavior occurs.', example: 'Collecting ABC data, interviewing teachers, conducting observations → determining that a student\'s disruption serves an attention function.' },
            { term: 'Behavior Intervention Plan (BIP)', category: 'intervention', def: 'A written plan based on the FBA that includes: prevention strategies, replacement behaviors, teaching strategies, and consequence-based procedures. The goal is to reduce problem behavior and increase appropriate behavior.', example: 'Based on FBA finding escape function: (1) modify task difficulty, (2) teach break request, (3) reinforce task completion, (4) don\'t remove work after problem behavior.' },
            { term: 'ABC Data Collection', category: 'data', def: 'Recording the Antecedent, Behavior, and Consequence for each behavioral incident. This is the foundation of understanding behavioral patterns.', example: 'A: Teacher said "clean up" | B: Student threw materials | C: Teacher cleaned up instead → Pattern: escape from clean-up demands.' },
            { term: 'Frequency Recording', category: 'data', def: 'Counting the number of times a behavior occurs within a specified time period. Best for behaviors with a clear start and end.', example: 'Student called out 12 times during a 45-minute class period = frequency of 12 (rate of 0.27 per minute).' },
            { term: 'Duration Recording', category: 'data', def: 'Measuring how long a behavior lasts from start to finish. Best for behaviors that persist over time.', example: 'Student was out of seat for a total of 23 minutes during a 60-minute class period.' },
            { term: 'Interval Recording', category: 'data', def: 'Dividing an observation period into equal intervals and recording whether the behavior occurred during each interval. Types: Whole interval (must occur entire interval) and Partial interval (must occur at any point).', example: 'A 30-minute observation divided into 2-minute intervals. Mark + if behavior occurred at any point in each interval.' },
            { term: 'Token Economy', category: 'intervention', def: 'A system where students earn tokens (points, stickers, etc.) for displaying target behaviors, which can later be exchanged for preferred items or activities.', example: 'Student earns a star for each completed assignment. 5 stars = 10 minutes of choice time.' },
            { term: 'Differential Reinforcement', category: 'intervention', def: 'Reinforcing specific behaviors while withholding reinforcement for others. Types: DRA (alternative), DRI (incompatible), DRO (other), DRL (low rates).', example: 'DRA: Reinforce asking for a break (alternative) while not reinforcing screaming (problem behavior).' },
            { term: 'Prompting', category: 'intervention', def: 'Providing assistance to help a student perform a desired behavior. Types include: verbal, gestural, visual, model, and physical prompts.', example: 'Teacher points to the break card (gestural prompt) when student starts to get frustrated, before problem behavior occurs.' },
            { term: 'Fading', category: 'intervention', def: 'Gradually reducing the level of assistance (prompts) as the student becomes more independent with the skill.', example: 'Week 1: Teacher hands student the break card (physical). Week 2: Teacher points to card (gestural). Week 3: Student uses card independently.' },
            { term: 'Task Analysis', category: 'intervention', def: 'Breaking a complex skill or routine into smaller, teachable steps. Each step is taught and mastered before moving to the next.', example: 'Morning routine: (1) Put backpack in cubby (2) Turn in homework (3) Sit at desk (4) Start bell work.' },
            { term: 'Generalization', category: 'concepts', def: 'The ability to use a learned skill or behavior across different settings, people, materials, and times.', example: 'Student learns to use a break card in math class → also uses it in science, art, and with different teachers.' },
            { term: 'Baseline', category: 'data', def: 'The level of behavior BEFORE any intervention is implemented. Used as a comparison point to measure the effectiveness of the intervention.', example: 'Before BIP: 8 call-outs per class. After BIP: 2 call-outs per class. Baseline shows 75% reduction.' },
            { term: 'Data-Based Decision Making', category: 'data', def: 'Using collected behavioral data to evaluate whether interventions are working and to make adjustments. Decisions should be based on data trends, not single incidents.', example: 'Review 2 weeks of data → off-task behavior decreasing by 30% → intervention is working, continue current plan.' },
        ], []);

        const categories = { core: { label: '🔵 Core ABC', color: 'blue' }, assessment: { label: '🟣 Assessment', color: 'purple' }, data: { label: '🟢 Data Collection', color: 'green' }, intervention: { label: '🟠 Intervention', color: 'orange' }, concepts: { label: '⚪ Key Concepts', color: 'slate' } };

        const filtered = search.trim()
            ? terms.filter(t => t.term.toLowerCase().includes(search.toLowerCase()) || t.def.toLowerCase().includes(search.toLowerCase()))
            : terms;

        const catColors = { blue: 'bg-blue-100 text-blue-700', purple: 'bg-purple-100 text-purple-700', green: 'bg-green-100 text-green-700', orange: 'bg-orange-100 text-orange-700', slate: 'bg-slate-100 text-slate-600' };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '📖'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'ABA Concept Glossary'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, `${terms.length} essential terms for understanding Applied Behavior Analysis`)
            ),
            h('input', {
                type: 'text',
                value: search,
                onChange: e => setSearch(e.target.value),
                placeholder: '🔍 Search terms... (e.g. "reinforcement", "FBA", "data")',
                className: 'w-full px-4 py-3 border border-slate-200 rounded-xl text-sm shadow-sm focus:ring-2 focus:ring-blue-300 outline-none'
            }),
            // Category legend
            h('div', { className: 'flex flex-wrap gap-2' },
                Object.entries(categories).map(([k, v]) =>
                    h('span', { key: k, className: `text-[9px] px-2 py-1 rounded-full font-bold ${catColors[v.color]}` }, v.label)
                )
            ),
            h('div', { className: 'text-[10px] text-slate-400' }, `${filtered.length} terms`),
            // Terms list
            h('div', { className: 'space-y-2' },
                filtered.map(term => {
                    const cat = categories[term.category] || categories.concepts;
                    const isOpen = expandedTerm === term.term;
                    return h('div', {
                        key: term.term,
                        className: `bg-white rounded-xl border transition-all ${isOpen ? 'border-blue-300 shadow-md' : 'border-slate-100 shadow-sm hover:border-slate-200'}`
                    },
                        h('button', {
                            onClick: () => setExpandedTerm(isOpen ? null : term.term),
                            className: 'w-full text-left p-4 flex items-center justify-between'
                        },
                            h('div', { className: 'flex items-center gap-3' },
                                h('span', { className: `text-[9px] px-2 py-0.5 rounded-full font-bold ${catColors[cat.color]}` }, cat.label.split(' ')[0]),
                                h('span', { className: 'text-sm font-bold text-slate-800' }, term.term)
                            ),
                            h('span', { className: 'text-slate-400 text-xs' }, isOpen ? '▴' : '▾')
                        ),
                        isOpen && h('div', { className: 'px-4 pb-4 pt-0' },
                            h('p', { className: 'text-xs text-slate-600 leading-relaxed mb-3' }, term.def),
                            h('div', { className: 'bg-blue-50 rounded-lg p-3 border border-blue-100' },
                                h('div', { className: 'text-[10px] font-bold text-blue-600 mb-1' }, '💡 Example:'),
                                h('p', { className: 'text-[11px] text-blue-800 leading-relaxed' }, term.example)
                            )
                        )
                    );
                })
            )
        );
    };

    // ─── GuidedFBAWorkflow ──────────────────────────────────────────────
    // Step-by-step FBA process wizard with tool links
    const GuidedFBAWorkflow = ({ activePanel, setActivePanel, abcEntries, aiAnalysis, t }) => {
        const [completedSteps, setCompletedSteps] = useState(new Set());

        const steps = [
            { id: 1, title: 'Define Target Behavior', icon: '🎯', tool: 'abc', toolName: 'ABC Data Panel', desc: 'Identify and operationally define the behavior of concern. A good definition is observable (can be seen) and measurable (can be counted).', tip: 'Ask: "Could two people independently agree on whether this behavior occurred?" If yes, your definition is specific enough.', check: abcEntries.length > 0 ? '✅ You have ABC entries defined' : '❌ No ABC data yet — start by logging some entries' },
            { id: 2, title: 'Collect Baseline Data', icon: '📊', tool: 'observation', toolName: 'Live Observation', desc: 'Gather data on how often, how long, and how intense the behavior is BEFORE any intervention. This gives you a comparison point.', tip: 'Collect at least 3-5 observation sessions across different days and settings for reliable baseline data.', check: null },
            { id: 3, title: 'Identify Patterns', icon: '🔍', tool: 'analysis', toolName: 'AI Analysis', desc: 'Look for patterns in your ABC data. What antecedents consistently trigger the behavior? What consequences are maintaining it? When and where does it happen most?', tip: 'Use the AI Analysis tool to automatically detect patterns you might miss.', check: aiAnalysis ? '✅ AI Analysis completed' : '❌ Run AI Analysis after collecting enough data' },
            { id: 4, title: 'Hypothesize Function', icon: '🧩', tool: 'hypothesis', toolName: 'Hypothesis Diagram', desc: 'Based on your data patterns, hypothesize WHY the behavior is occurring. What is the student getting or avoiding? The four functions are: Escape, Attention, Sensory/Automatic, and Tangible Access.', tip: 'A behavior can serve multiple functions. Consider whether the function changes across settings.', check: aiAnalysis?.hypothesizedFunction ? `✅ Hypothesized: ${aiAnalysis.hypothesizedFunction}` : '❌ Complete analysis first' },
            { id: 5, title: 'Design Intervention', icon: '📋', tool: 'intervention', toolName: 'Intervention Plan', desc: 'Create a Behavior Intervention Plan (BIP) that addresses the function. Include: prevention strategies, replacement behavior teaching, reinforcement for appropriate behavior, and how to respond to problem behavior.', tip: 'The replacement behavior must serve the SAME function as the problem behavior and be EASIER for the student to perform.', check: null },
            { id: 6, title: 'Monitor & Adjust', icon: '📈', tool: 'progress', toolName: 'Progress Narrative', desc: 'Continue collecting data to evaluate whether the intervention is working. Compare to baseline. Make data-based decisions about adjusting the plan.', tip: 'Give an intervention at least 2-3 weeks before making major changes, unless safety is a concern.', check: null },
        ];

        const toggleStep = (id) => {
            setCompletedSteps(prev => {
                const next = new Set(prev);
                if (next.has(id)) next.delete(id); else next.add(id);
                return next;
            });
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🗺️'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Guided FBA Workflow'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Follow these 6 steps to conduct a Functional Behavior Assessment')
            ),
            // Progress bar
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('div', { className: 'flex items-center justify-between mb-2' },
                    h('span', { className: 'text-xs font-bold text-slate-600' }, `${completedSteps.size} of ${steps.length} steps completed`),
                    h('span', { className: 'text-xs font-bold text-blue-600' }, `${Math.round((completedSteps.size / steps.length) * 100)}%`)
                ),
                h('div', { className: 'w-full bg-slate-100 rounded-full h-2.5' },
                    h('div', { className: 'bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-500', style: { width: `${(completedSteps.size / steps.length) * 100}%` } })
                )
            ),
            // Steps
            h('div', { className: 'space-y-3' },
                steps.map((step, i) => {
                    const done = completedSteps.has(step.id);
                    return h('div', {
                        key: step.id,
                        className: `bg-white rounded-xl border-2 transition-all ${done ? 'border-green-300 bg-green-50/20' : 'border-slate-100'} p-5`
                    },
                        h('div', { className: 'flex items-start gap-4' },
                            h('button', {
                                onClick: () => toggleStep(step.id),
                                className: `w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm transition-all shrink-0 ${done ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-400 hover:border-blue-400'}`
                            }, done ? '✓' : step.id),
                            h('div', { className: 'flex-1' },
                                h('div', { className: 'flex items-center gap-2 mb-1' },
                                    h('span', { className: 'text-lg' }, step.icon),
                                    h('h3', { className: `text-sm font-black ${done ? 'text-green-700' : 'text-slate-800'}` }, `Step ${step.id}: ${step.title}`)
                                ),
                                h('p', { className: 'text-xs text-slate-600 leading-relaxed mb-2' }, step.desc),
                                h('div', { className: 'bg-amber-50 rounded-lg p-2.5 border border-amber-100 mb-2' },
                                    h('p', { className: 'text-[10px] text-amber-700' }, '💡 ' + step.tip)
                                ),
                                step.check && h('p', { className: 'text-[10px] font-bold text-slate-500 mb-2' }, step.check),
                                h('button', {
                                    onClick: () => {
                                        if (step.tool === 'observation') { /* handled by parent */ }
                                        else if (step.tool === 'analysis') { /* handled by parent */ }
                                        else { setActivePanel(step.tool); }
                                    },
                                    className: 'px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold hover:bg-blue-100 transition-all'
                                }, `→ Open ${step.toolName}`)
                            )
                        )
                    );
                })
            )
        );
    };

    // ─── DataQualityChecker ─────────────────────────────────────────────
    // AI-powered review of ABC entries with improvement suggestions
    const DataQualityChecker = ({ abcEntries, callGemini, t, addToast }) => {
        const [report, setReport] = useState(null);
        const [checking, setChecking] = useState(false);

        const handleCheck = async () => {
            if (!callGemini || abcEntries.length === 0) return;
            if (report) { setReport(null); return; }
            setChecking(true);
            try {
                const entriesStr = abcEntries.slice(-15).map((e, i) =>
                    `Entry ${i + 1}: A="${e.antecedent}" B="${e.behavior}" C="${e.consequence}" Setting="${e.setting || 'not specified'}" Intensity=${e.intensity || 'not rated'} Duration="${e.duration || 'not recorded'}"`
                ).join('\n');

                const prompt = `You are a BCBA reviewing ABC behavioral data entries for quality and completeness.
${RESTORATIVE_PREAMBLE}

Review these ABC data entries and provide specific, actionable feedback:

${entriesStr}

Evaluate the data on these criteria and give an overall quality rating:

1. SPECIFICITY: Are behaviors described in observable, measurable terms? (not vague like "acted out")
2. COMPLETENESS: Are all fields filled in? Are settings, intensity, and duration recorded?
3. ANTECEDENT DETAIL: Do antecedents describe the immediate trigger clearly?
4. CONSEQUENCE DETAIL: Do consequences describe what actually happened after?
5. VARIETY: Is there variation in antecedents and consequences, or are they copy-pasted?
6. SUFFICIENCY: Is there enough data to identify patterns? (typically need 10+ entries)

Return your response in this format:
QUALITY: [🟢 Good / 🟡 Fair / 🔴 Needs Work]

STRENGTHS:
- (list strengths)

AREAS FOR IMPROVEMENT:
- (list specific improvements with examples)

SPECIFIC SUGGESTIONS:
- (actionable next steps)

Keep it concise and encouraging. Use plain language.`;

                const result = await callGemini(prompt, true);
                setReport(result);
                if (addToast) addToast('Quality check complete ✅', 'success');
            } catch (err) {
                warnLog('Quality check failed:', err);
                if (addToast) addToast('Quality check failed', 'error');
            } finally { setChecking(false); }
        };

        // Quick local checks (no AI)
        const quickChecks = useMemo(() => {
            if (abcEntries.length === 0) return [];
            const checks = [];
            const vague = abcEntries.filter(e => e.behavior && e.behavior.length < 15).length;
            if (vague > 0) checks.push({ icon: '⚠️', msg: `${vague} entries have very brief behavior descriptions (< 15 chars)`, type: 'warning' });
            const noSetting = abcEntries.filter(e => !e.setting || e.setting.trim() === '').length;
            if (noSetting > 0) checks.push({ icon: '📍', msg: `${noSetting} entries missing setting/location information`, type: 'warning' });
            const noIntensity = abcEntries.filter(e => !e.intensity).length;
            if (noIntensity > 0) checks.push({ icon: '📏', msg: `${noIntensity} entries missing intensity ratings`, type: 'warning' });
            if (abcEntries.length < 5) checks.push({ icon: '📊', msg: `Only ${abcEntries.length} entries — need at least 5-10 for pattern analysis`, type: 'info' });
            else if (abcEntries.length >= 10) checks.push({ icon: '✅', msg: `${abcEntries.length} entries collected — good sample size for analysis`, type: 'positive' });
            // Check for duplicate antecedents
            const antecedents = abcEntries.map(e => (e.antecedent || '').toLowerCase().trim()).filter(Boolean);
            const uniqueAnt = new Set(antecedents).size;
            if (antecedents.length > 3 && uniqueAnt < antecedents.length * 0.5) {
                checks.push({ icon: '🔄', msg: `Low variety: only ${uniqueAnt} unique antecedents across ${antecedents.length} entries`, type: 'warning' });
            }
            return checks;
        }, [abcEntries]);

        const checkColors = { warning: 'bg-amber-50 border-amber-200 text-amber-700', info: 'bg-blue-50 border-blue-200 text-blue-700', positive: 'bg-green-50 border-green-200 text-green-700' };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '✅'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Data Quality Checker'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Review your ABC data collection for completeness and quality')
            ),
            // Quick local checks
            quickChecks.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '⚡ Quick Checks'),
                h('div', { className: 'space-y-2' },
                    quickChecks.map((c, i) =>
                        h('div', { key: i, className: `flex items-center gap-2 px-3 py-2 rounded-lg border ${checkColors[c.type]}` },
                            h('span', null, c.icon),
                            h('span', { className: 'text-xs font-bold' }, c.msg)
                        )
                    )
                )
            ),
            abcEntries.length === 0 && h('div', { className: 'text-center py-8 bg-white rounded-xl border border-slate-200' },
                h('div', { className: 'text-3xl mb-2' }, '📭'),
                h('p', { className: 'text-sm text-slate-500' }, 'No ABC entries to check yet. Start collecting data first!')
            ),
            // AI deep check
            callGemini && abcEntries.length > 0 && h('button', {
                onClick: handleCheck,
                disabled: checking,
                className: 'w-full py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, checking ? '⏳ Analyzing...' : report ? '▴ Hide AI Report' : '🧠 Run AI Quality Analysis'),
            report && h('div', { className: 'bg-white rounded-xl border border-green-200 p-5 shadow-sm' },
                h('div', { className: 'text-xs text-slate-700 whitespace-pre-wrap leading-relaxed' }, report),
                h('div', { className: 'flex gap-2 mt-4' },
                    h('button', {
                        onClick: () => { navigator.clipboard.writeText(report); if (addToast) addToast('Copied!', 'success'); },
                        className: 'px-3 py-1.5 bg-green-100 text-green-700 rounded-lg text-[10px] font-bold hover:bg-green-200'
                    }, '📋 Copy Report')
                )
            )
        );
    };

    // ─── BehaviorTrendDashboard ─────────────────────────────────────────
    // SVG-based visual charts for behavioral data trends
    const BehaviorTrendDashboard = ({ abcEntries, observationSessions, t }) => {
        const [view, setView] = useState('intensity');

        // Intensity over time — SVG line chart
        const intensityData = useMemo(() => {
            if (abcEntries.length === 0) return [];
            return abcEntries.slice().sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)).map((e, i) => ({
                x: i,
                y: e.intensity || 0,
                label: new Date(e.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                behavior: (e.behavior || '').substring(0, 30)
            }));
        }, [abcEntries]);

        // Frequency by setting — bar chart
        const settingData = useMemo(() => {
            const counts = {};
            abcEntries.forEach(e => {
                const s = (e.setting || 'Unknown').split(',')[0].trim();
                counts[s] = (counts[s] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([label, count]) => ({ label, count }));
        }, [abcEntries]);

        // Day-of-week × time heatmap
        const heatmapData = useMemo(() => {
            const grid = Array.from({ length: 7 }, () => Array(4).fill(0)); // 7 days × 4 time blocks
            abcEntries.forEach(e => {
                const d = new Date(e.timestamp);
                const day = d.getDay();
                const hour = d.getHours();
                const block = hour < 9 ? 0 : hour < 12 ? 1 : hour < 15 ? 2 : 3;
                grid[day][block]++;
            });
            return grid;
        }, [abcEntries]);
        const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const timeLabels = ['Early AM', 'Morning', 'Afternoon', 'Late PM'];

        const views = [
            { id: 'intensity', label: '📈 Intensity Trend' },
            { id: 'settings', label: '📊 By Setting' },
            { id: 'heatmap', label: '🔥 Heatmap' },
        ];

        if (abcEntries.length === 0) {
            return h('div', { className: 'max-w-2xl mx-auto text-center py-12' },
                h('div', { className: 'text-4xl mb-3' }, '📊'),
                h('h2', { className: 'text-lg font-black text-slate-800 mb-2' }, 'Behavior Trend Dashboard'),
                h('p', { className: 'text-sm text-slate-500' }, 'Add ABC entries to see visual trend data.')
            );
        }

        return h('div', { className: 'max-w-3xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '📊'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Behavior Trend Dashboard'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, `${abcEntries.length} entries visualized`)
            ),
            // View tabs
            h('div', { className: 'flex gap-2 bg-white rounded-xl border border-slate-200 p-2 shadow-sm' },
                views.map(v => h('button', {
                    key: v.id,
                    onClick: () => setView(v.id),
                    className: `flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all ${view === v.id ? 'bg-indigo-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`
                }, v.label))
            ),

            // Intensity line chart
            view === 'intensity' && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4' }, '📈 Behavior Intensity Over Time'),
                (() => {
                    const W = 600, H = 200, pad = 40;
                    const maxY = Math.max(5, ...intensityData.map(d => d.y));
                    const points = intensityData.map((d, i) => ({
                        cx: pad + (i / Math.max(1, intensityData.length - 1)) * (W - pad * 2),
                        cy: H - pad - (d.y / maxY) * (H - pad * 2)
                    }));
                    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.cx} ${p.cy}`).join(' ');
                    return h('svg', { viewBox: `0 0 ${W} ${H}`, className: 'w-full', style: { maxHeight: '220px' } },
                        // Grid lines
                        ...[1, 2, 3, 4, 5].map(v => {
                            const y = H - pad - (v / maxY) * (H - pad * 2);
                            return h('g', { key: 'g' + v },
                                h('line', { x1: pad, y1: y, x2: W - pad, y2: y, stroke: '#e2e8f0', strokeWidth: 1 }),
                                h('text', { x: pad - 8, y: y + 4, textAnchor: 'end', fontSize: 10, fill: '#94a3b8' }, v)
                            );
                        }),
                        // Line
                        h('path', { d: pathD, fill: 'none', stroke: '#6366f1', strokeWidth: 2.5, strokeLinejoin: 'round' }),
                        // Area fill
                        h('path', { d: pathD + ` L ${points[points.length - 1]?.cx || pad} ${H - pad} L ${pad} ${H - pad} Z`, fill: 'url(#areaGrad)', opacity: 0.3 }),
                        h('defs', null, h('linearGradient', { id: 'areaGrad', x1: '0', y1: '0', x2: '0', y2: '1' },
                            h('stop', { offset: '0%', stopColor: '#6366f1' }),
                            h('stop', { offset: '100%', stopColor: '#6366f1', stopOpacity: 0 })
                        )),
                        // Dots
                        ...points.map((p, i) =>
                            h('circle', { key: 'c' + i, cx: p.cx, cy: p.cy, r: 4, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 })
                        ),
                        // X labels (show every few)
                        ...intensityData.filter((_, i) => i % Math.max(1, Math.floor(intensityData.length / 6)) === 0).map((d, _, arr) => {
                            const idx = intensityData.indexOf(d);
                            return h('text', { key: 'xl' + idx, x: points[idx]?.cx, y: H - 8, textAnchor: 'middle', fontSize: 9, fill: '#94a3b8' }, d.label);
                        })
                    );
                })()
            ),

            // Settings bar chart
            view === 'settings' && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4' }, '📊 Incidents by Setting'),
                h('div', { className: 'space-y-2' },
                    settingData.map((s, i) => {
                        const maxC = Math.max(1, ...settingData.map(d => d.count));
                        return h('div', { key: i, className: 'flex items-center gap-3' },
                            h('div', { className: 'w-28 text-[10px] font-bold text-slate-600 text-right truncate shrink-0' }, s.label),
                            h('div', { className: 'flex-1 bg-slate-100 rounded-full h-6 overflow-hidden' },
                                h('div', {
                                    className: 'h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full flex items-center justify-end pr-2 transition-all duration-500',
                                    style: { width: `${(s.count / maxC) * 100}%` }
                                }, h('span', { className: 'text-[9px] font-bold text-white' }, s.count))
                            )
                        );
                    })
                )
            ),

            // Heatmap
            view === 'heatmap' && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-4' }, '🔥 Day × Time Heatmap'),
                h('div', { className: 'overflow-x-auto' },
                    h('table', { className: 'w-full' },
                        h('thead', null, h('tr', null,
                            h('th', { className: 'text-[9px] text-slate-400 p-1' }),
                            ...timeLabels.map(t => h('th', { key: t, className: 'text-[9px] text-slate-500 font-bold p-1 text-center' }, t))
                        )),
                        h('tbody', null,
                            ...heatmapData.map((row, dayIdx) => {
                                const maxVal = Math.max(1, ...heatmapData.flat());
                                return h('tr', { key: dayIdx },
                                    h('td', { className: 'text-[10px] font-bold text-slate-500 pr-2 text-right' }, dayLabels[dayIdx]),
                                    ...row.map((val, colIdx) => {
                                        const intensity = val / maxVal;
                                        const bg = val === 0 ? 'bg-slate-50' : intensity < 0.33 ? 'bg-green-200' : intensity < 0.66 ? 'bg-amber-300' : 'bg-red-400';
                                        return h('td', { key: colIdx, className: 'p-1' },
                                            h('div', { className: `w-full h-8 rounded-lg ${bg} flex items-center justify-center text-[10px] font-bold ${val > 0 ? 'text-white' : 'text-slate-300'}` }, val || '·')
                                        );
                                    })
                                );
                            })
                        )
                    )
                ),
                h('div', { className: 'flex items-center gap-4 mt-3 text-[9px] text-slate-400' },
                    h('span', null, 'Low'), h('div', { className: 'w-4 h-3 bg-green-200 rounded' }),
                    h('div', { className: 'w-4 h-3 bg-amber-300 rounded' }),
                    h('div', { className: 'w-4 h-3 bg-red-400 rounded' }), h('span', null, 'High')
                )
            )
        );
    };

    // ─── TeamNotes ──────────────────────────────────────────────────────
    // Multi-role timestamped collaboration thread
    const TeamNotes = ({ studentName, t, addToast }) => {
        const [notes, setNotes] = useState([]);
        const [newNote, setNewNote] = useState('');
        const [role, setRole] = useState('teacher');

        const roles = [
            { id: 'teacher', label: '👩‍🏫 Teacher', color: 'indigo' },
            { id: 'para', label: '🤝 Para', color: 'teal' },
            { id: 'counselor', label: '💬 Counselor', color: 'purple' },
            { id: 'parent', label: '👪 Parent/Guardian', color: 'amber' },
            { id: 'admin', label: '🏫 Admin', color: 'slate' },
            { id: 'slp', label: '🗣️ SLP', color: 'sky' },
            { id: 'bcba', label: '📋 BCBA', color: 'rose' },
        ];

        const roleColors = {
            indigo: 'bg-indigo-100 text-indigo-700 border-indigo-200',
            teal: 'bg-teal-100 text-teal-700 border-teal-200',
            purple: 'bg-purple-100 text-purple-700 border-purple-200',
            amber: 'bg-amber-100 text-amber-700 border-amber-200',
            slate: 'bg-slate-100 text-slate-700 border-slate-200',
            sky: 'bg-sky-100 text-sky-700 border-sky-200',
            rose: 'bg-rose-100 text-rose-700 border-rose-200',
        };

        const handleAdd = () => {
            if (!newNote.trim()) return;
            const r = roles.find(r => r.id === role) || roles[0];
            setNotes(prev => [{
                id: Date.now(),
                text: newNote.trim(),
                role: r.id,
                roleLabel: r.label,
                roleColor: r.color,
                timestamp: new Date().toISOString(),
            }, ...prev]);
            setNewNote('');
            if (addToast) addToast('Note added', 'success');
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🤝'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Team Collaboration Notes'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, `Shared notes for ${studentName || 'the student'} — all team members contribute`)
            ),
            // Add note
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
                    roles.map(r => h('button', {
                        key: r.id,
                        onClick: () => setRole(r.id),
                        className: `px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${role === r.id ? roleColors[r.color] + ' shadow-sm' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`
                    }, r.label))
                ),
                h('div', { className: 'flex gap-2' },
                    h('textarea', {
                        value: newNote,
                        onChange: e => setNewNote(e.target.value),
                        onKeyDown: e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAdd(); } },
                        placeholder: 'Add a team note... (Shift+Enter for new line)',
                        rows: 2,
                        className: 'flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-300'
                    }),
                    h('button', {
                        onClick: handleAdd,
                        disabled: !newNote.trim(),
                        className: 'px-4 py-2 bg-indigo-500 text-white rounded-lg text-sm font-bold hover:bg-indigo-600 disabled:opacity-40 transition-all self-end'
                    }, '📤')
                )
            ),
            // Notes thread
            notes.length === 0
                ? h('div', { className: 'text-center py-8 bg-white rounded-xl border border-slate-200' },
                    h('div', { className: 'text-3xl mb-2' }, '💬'),
                    h('p', { className: 'text-sm text-slate-500' }, 'No team notes yet. Start the conversation!')
                )
                : h('div', { className: 'space-y-3' },
                    notes.map(note => {
                        const colors = roleColors[note.roleColor] || roleColors.slate;
                        return h('div', { key: note.id, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                            h('div', { className: 'flex items-center justify-between mb-2' },
                                h('span', { className: `text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors}` }, note.roleLabel),
                                h('div', { className: 'flex items-center gap-2' },
                                    h('span', { className: 'text-[9px] text-slate-400' },
                                        new Date(note.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + ' ' +
                                        new Date(note.timestamp).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                                    ),
                                    h('button', {
                                        onClick: () => setNotes(prev => prev.filter(n => n.id !== note.id)),
                                        className: 'text-[10px] text-slate-300 hover:text-red-400 transition-colors'
                                    }, '✕')
                                )
                            ),
                            h('p', { className: 'text-xs text-slate-700 leading-relaxed whitespace-pre-wrap' }, note.text)
                        );
                    })
                )
        );
    };

    // ─── IEPPrepGenerator ───────────────────────────────────────────────
    // AI generates complete IEP meeting prep packet
    const IEPPrepGenerator = ({ studentName, abcEntries, observationSessions, aiAnalysis, callGemini, t, addToast }) => {
        const [packet, setPacket] = useState('');
        const [generating, setGenerating] = useState(false);
        const [preAiPacket, setPreAiPacket] = useState(null);

        const handleGenerate = async () => {
            if (!callGemini) return;
            setGenerating(true);
            try {
                const funcStr = aiAnalysis?.hypothesizedFunction || 'not yet determined';
                const recentEntries = abcEntries.slice(-10).map((e, i) =>
                    `${i + 1}. B: "${e.behavior}" | A: "${e.antecedent}" | C: "${e.consequence}" | Intensity: ${e.intensity || 'N/A'} | Setting: ${e.setting || 'N/A'}`
                ).join('\n');
                const obsSummary = observationSessions.slice(-3).map((s, i) =>
                    `Session ${i + 1}: ${s.method || 'observation'}, ${s.notes || 'no notes'}`
                ).join('\n');

                const prompt = `You are a special education coordinator preparing for an IEP meeting.
${RESTORATIVE_PREAMBLE}

Generate a comprehensive IEP Meeting Prep Packet for this student:

Student codename: ${studentName || 'Student'}
Hypothesized function of behavior: ${funcStr}
Number of ABC entries: ${abcEntries.length}
Number of observation sessions: ${observationSessions.length}

Recent behavioral data:
${recentEntries || 'No data collected yet'}

Observation summaries:
${obsSummary || 'No observations recorded'}

${aiAnalysis ? `AI Analysis Summary: ${JSON.stringify(aiAnalysis).substring(0, 500)}` : ''}

Format the packet with these sections:
📊 DATA SUMMARY
- Key behavioral metrics (frequency, intensity trends, most common settings)

📈 PROGRESS TOWARD GOALS
- Current performance levels based on data
- Comparison to baseline if identifiable

💡 KEY PATTERNS IDENTIFIED
- Top antecedent triggers
- Most effective consequences
- Environmental factors

🗣️ SUGGESTED TALKING POINTS
- 3-5 discussion items for the team
- Questions to explore

👪 PARENT-FRIENDLY OVERVIEW
- Same information but written in accessible, jargon-free language

📋 PROPOSED NEXT STEPS
- Recommended modifications to current plan
- New goals or data collection needs

Keep the language strengths-based and restorative. Use "your child" not the codename. Be specific and data-driven.`;

                setPreAiPacket(packet);
                const result = await callGemini(prompt, true);
                setPacket(result);
                if (addToast) addToast('IEP prep packet generated ✨', 'success');
            } catch (err) {
                warnLog('IEP prep generation failed:', err);
                if (addToast) addToast('Generation failed', 'error');
            } finally { setGenerating(false); }
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '📄'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'IEP Meeting Prep'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'AI-generated meeting preparation packet from your behavioral data')
            ),
            // Stats overview
            h('div', { className: 'grid grid-cols-3 gap-3' },
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm' },
                    h('div', { className: 'text-2xl font-black text-indigo-600' }, abcEntries.length),
                    h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'ABC Entries')
                ),
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm' },
                    h('div', { className: 'text-2xl font-black text-emerald-600' }, observationSessions.length),
                    h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'Observations')
                ),
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm' },
                    h('div', { className: 'text-2xl font-black text-purple-600' }, aiAnalysis ? '✅' : '—'),
                    h('div', { className: 'text-[10px] text-slate-500 font-bold' }, 'AI Analysis')
                )
            ),
            // Generate button
            callGemini && h('button', {
                onClick: handleGenerate,
                disabled: generating || abcEntries.length === 0,
                className: 'w-full py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, generating ? '⏳ Preparing Packet...' : '🧠 Generate IEP Prep Packet'),
            abcEntries.length === 0 && h('p', { className: 'text-[10px] text-slate-400 text-center' }, 'Collect some ABC data first to generate a meaningful packet.'),
            // Packet display
            packet && h('div', { className: 'bg-white rounded-xl border border-blue-200 p-5 shadow-sm' },
                h('div', { className: 'text-xs text-slate-700 whitespace-pre-wrap leading-relaxed' }, packet),
                h('div', { className: 'flex gap-2 mt-4 flex-wrap' },
                    h('button', {
                        onClick: () => { navigator.clipboard.writeText(packet); if (addToast) addToast('Copied!', 'success'); },
                        className: 'px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200'
                    }, '📋 Copy'),
                    h('button', { onClick: () => window.print(), className: 'px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-bold hover:bg-blue-200' }, '🖨️ Print'),
                    preAiPacket !== null && h('button', {
                        onClick: () => { setPacket(preAiPacket); setPreAiPacket(null); if (addToast) addToast('Reverted', 'info'); },
                        className: 'px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-bold hover:bg-amber-100'
                    }, '↩️ Undo AI')
                )
            )
        );
    };

    // ─── PredictiveInsights ─────────────────────────────────────────────
    // AI pattern analysis: when/where/what triggers behaviors most
    const PredictiveInsights = ({ abcEntries, callGemini, t, addToast }) => {
        const [insights, setInsights] = useState('');
        const [analyzing, setAnalyzing] = useState(false);

        // Local pattern detection
        const localPatterns = useMemo(() => {
            if (abcEntries.length < 3) return [];
            const patterns = [];
            // Time patterns
            const hours = abcEntries.map(e => new Date(e.timestamp).getHours()).filter(h => !isNaN(h));
            if (hours.length > 3) {
                const morningCount = hours.filter(h => h >= 8 && h < 12).length;
                const afternoonCount = hours.filter(h => h >= 12 && h < 15).length;
                const total = hours.length;
                if (morningCount > total * 0.6) patterns.push({ icon: '🌅', text: `${Math.round(morningCount / total * 100)}% of incidents occur in the morning (8am–12pm)`, type: 'time' });
                if (afternoonCount > total * 0.6) patterns.push({ icon: '☀️', text: `${Math.round(afternoonCount / total * 100)}% of incidents occur in the afternoon (12pm–3pm)`, type: 'time' });
            }
            // Day patterns
            const days = abcEntries.map(e => new Date(e.timestamp).getDay());
            const dayCounts = {};
            days.forEach(d => { dayCounts[d] = (dayCounts[d] || 0) + 1; });
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const topDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
            if (topDay && topDay[1] > days.length * 0.35) {
                patterns.push({ icon: '📅', text: `${dayNames[topDay[0]]} has the most incidents (${topDay[1]} of ${days.length})`, type: 'day' });
            }
            // Intensity trend
            const recentInt = abcEntries.slice(0, 5).map(e => e.intensity || 0);
            const olderInt = abcEntries.slice(-5).map(e => e.intensity || 0);
            const recentAvg = recentInt.reduce((a, b) => a + b, 0) / Math.max(1, recentInt.length);
            const olderAvg = olderInt.reduce((a, b) => a + b, 0) / Math.max(1, olderInt.length);
            if (recentAvg > olderAvg + 0.5) patterns.push({ icon: '📈', text: `Intensity trending UP: recent avg ${recentAvg.toFixed(1)} vs earlier avg ${olderAvg.toFixed(1)}`, type: 'trend' });
            if (recentAvg < olderAvg - 0.5) patterns.push({ icon: '📉', text: `Intensity trending DOWN: recent avg ${recentAvg.toFixed(1)} vs earlier avg ${olderAvg.toFixed(1)} — positive progress!`, type: 'trend' });
            // Top antecedent
            const antCounts = {};
            abcEntries.forEach(e => {
                const words = (e.antecedent || '').toLowerCase().split(/\s+/).filter(w => w.length > 4);
                words.forEach(w => { antCounts[w] = (antCounts[w] || 0) + 1; });
            });
            const topWords = Object.entries(antCounts).sort((a, b) => b[1] - a[1]).slice(0, 3);
            if (topWords.length > 0 && topWords[0][1] >= 3) {
                patterns.push({ icon: '🔑', text: `Common trigger words: "${topWords.map(([w, c]) => `${w} (×${c})`).join(', ')}"`, type: 'trigger' });
            }
            return patterns;
        }, [abcEntries]);

        const handleAIAnalysis = async () => {
            if (!callGemini || abcEntries.length < 3) return;
            if (insights) { setInsights(''); return; }
            setAnalyzing(true);
            try {
                const entriesStr = abcEntries.slice(-15).map((e, i) =>
                    `${i + 1}. [${new Date(e.timestamp).toLocaleString()}] A: "${e.antecedent}" B: "${e.behavior}" C: "${e.consequence}" Setting: "${e.setting || 'N/A'}" Intensity: ${e.intensity || 'N/A'}`
                ).join('\n');

                const prompt = `You are a BCBA analyzing behavioral data to predict patterns and suggest preventive strategies.
${RESTORATIVE_PREAMBLE}

Analyze these ABC entries for predictive patterns:

${entriesStr}

Provide a structured prediction report:

🔮 PREDICTION: WHEN
- What days/times are behaviors most likely? What's the pattern?

🗺️ PREDICTION: WHERE  
- Which settings/environments are highest risk?

⚡ PREDICTION: TRIGGERS
- What specific antecedents are most predictive of behavior?

🛡️ PREVENTION STRATEGIES
- 3-5 specific, actionable strategies the team can implement proactively
- Based on the predicted patterns, what can be done BEFORE behavior occurs?

📊 CONFIDENCE LEVEL
- How much data supports these predictions? What additional data would strengthen them?

Be specific with percentages where possible. Keep language strengths-based and actionable.`;

                const result = await callGemini(prompt, true);
                setInsights(result);
                if (addToast) addToast('Predictive analysis complete ✨', 'success');
            } catch (err) {
                warnLog('Predictive analysis failed:', err);
                if (addToast) addToast('Analysis failed', 'error');
            } finally { setAnalyzing(false); }
        };

        const typeColors = { time: 'bg-blue-50 border-blue-200 text-blue-700', day: 'bg-purple-50 border-purple-200 text-purple-700', trend: 'bg-emerald-50 border-emerald-200 text-emerald-700', trigger: 'bg-amber-50 border-amber-200 text-amber-700' };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🔮'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Predictive Insights'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'AI-powered pattern analysis with proactive prevention strategies')
            ),
            // Local patterns
            localPatterns.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '⚡ Auto-Detected Patterns'),
                h('div', { className: 'space-y-2' },
                    localPatterns.map((p, i) =>
                        h('div', { key: i, className: `flex items-center gap-2 px-3 py-2 rounded-lg border ${typeColors[p.type] || typeColors.trigger}` },
                            h('span', null, p.icon),
                            h('span', { className: 'text-xs font-bold' }, p.text)
                        )
                    )
                )
            ),
            abcEntries.length < 3 && h('div', { className: 'text-center py-8 bg-white rounded-xl border border-slate-200' },
                h('div', { className: 'text-3xl mb-2' }, '📊'),
                h('p', { className: 'text-sm text-slate-500' }, 'Need at least 3 ABC entries for pattern detection.')
            ),
            // AI deep analysis
            callGemini && abcEntries.length >= 3 && h('button', {
                onClick: handleAIAnalysis,
                disabled: analyzing,
                className: 'w-full py-3 bg-gradient-to-r from-purple-500 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, analyzing ? '⏳ Analyzing Patterns...' : insights ? '▴ Hide AI Predictions' : '🧠 Run AI Predictive Analysis'),
            insights && h('div', { className: 'bg-white rounded-xl border border-purple-200 p-5 shadow-sm' },
                h('div', { className: 'text-xs text-slate-700 whitespace-pre-wrap leading-relaxed' }, insights),
                h('div', { className: 'flex gap-2 mt-4' },
                    h('button', {
                        onClick: () => { navigator.clipboard.writeText(insights); if (addToast) addToast('Copied!', 'success'); },
                        className: 'px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold hover:bg-purple-200'
                    }, '📋 Copy')
                )
            )
        );
    };

    // ─── StudentGamification ────────────────────────────────────────────
    // Streaks, badges, and quests for student self-monitoring
    const StudentGamification = ({ abcEntries, t }) => {
        const [checkins, setCheckins] = useState([]);
        const [selectedMood, setSelectedMood] = useState(null);
        const [reflection, setReflection] = useState('');

        const moods = [
            { id: 'great', emoji: '🌟', label: 'Great!', color: 'green' },
            { id: 'good', emoji: '😊', label: 'Good', color: 'blue' },
            { id: 'okay', emoji: '😐', label: 'Okay', color: 'amber' },
            { id: 'tough', emoji: '😔', label: 'Tough', color: 'orange' },
            { id: 'hard', emoji: '😢', label: 'Really Hard', color: 'red' },
        ];

        // Computed stats
        const streak = useMemo(() => {
            if (checkins.length === 0) return 0;
            let count = 1;
            for (let i = 0; i < checkins.length - 1; i++) {
                const d1 = new Date(checkins[i].timestamp).toDateString();
                const d2 = new Date(checkins[i + 1].timestamp).toDateString();
                if (d1 !== d2) {
                    const diff = (new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24);
                    if (diff <= 1) count++;
                    else break;
                }
            }
            return count;
        }, [checkins]);

        const badges = useMemo(() => {
            const earned = [];
            if (checkins.length >= 1) earned.push({ id: 'first', icon: '🏁', title: 'First Check-In', desc: 'Completed your first mood check-in!' });
            if (checkins.length >= 5) earned.push({ id: 'five', icon: '⭐', title: 'High Five', desc: '5 check-ins completed!' });
            if (checkins.length >= 10) earned.push({ id: 'ten', icon: '🌟', title: 'Star Tracker', desc: '10 check-ins completed!' });
            if (checkins.length >= 25) earned.push({ id: 'twentyfive', icon: '🏆', title: 'Champion', desc: '25 check-ins!' });
            if (streak >= 3) earned.push({ id: 'streak3', icon: '🔥', title: '3-Day Streak', desc: 'Checked in 3 days in a row!' });
            if (streak >= 7) earned.push({ id: 'streak7', icon: '💎', title: 'Week Warrior', desc: '7-day streak!' });
            const hasReflection = checkins.some(c => c.reflection && c.reflection.length > 10);
            if (hasReflection) earned.push({ id: 'reflector', icon: '🪞', title: 'Self-Reflector', desc: 'Wrote a thoughtful reflection!' });
            const positiveCount = checkins.filter(c => c.mood === 'great' || c.mood === 'good').length;
            if (positiveCount >= 5) earned.push({ id: 'positive5', icon: '☀️', title: 'Sunshine Collector', desc: '5 positive check-ins!' });
            return earned;
        }, [checkins, streak]);

        // Quests
        const quests = useMemo(() => [
            { id: 'q1', title: '🎯 Daily Check-In', desc: 'Check in with your mood today', done: checkins.length > 0 && new Date(checkins[0].timestamp).toDateString() === new Date().toDateString(), reward: '⭐ 1 star' },
            { id: 'q2', title: '🔥 Build a 3-Day Streak', desc: 'Check in for 3 days in a row', done: streak >= 3, reward: '🔥 Streak Badge' },
            { id: 'q3', title: '🪞 Write a Reflection', desc: 'Tell us what made you feel that way', done: checkins.some(c => c.reflection && c.reflection.length > 10), reward: '🪞 Reflector Badge' },
            { id: 'q4', title: '🌟 10 Total Check-Ins', desc: 'Complete 10 mood check-ins', done: checkins.length >= 10, reward: '🌟 Star Badge' },
        ], [checkins, streak]);

        const handleCheckin = () => {
            if (!selectedMood) return;
            setCheckins(prev => [{
                id: Date.now(),
                mood: selectedMood,
                reflection: reflection.trim(),
                timestamp: new Date().toISOString(),
            }, ...prev]);
            setSelectedMood(null);
            setReflection('');
        };

        const moodColors = { green: 'border-green-400 bg-green-50', blue: 'border-blue-400 bg-blue-50', amber: 'border-amber-400 bg-amber-50', orange: 'border-orange-400 bg-orange-50', red: 'border-red-400 bg-red-50' };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🎮'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'My Progress Quest'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Track your feelings, earn badges, and build streaks!')
            ),
            // Stats bar
            h('div', { className: 'grid grid-cols-3 gap-3' },
                h('div', { className: 'bg-gradient-to-br from-orange-400 to-red-500 rounded-xl p-4 text-center text-white shadow-lg' },
                    h('div', { className: 'text-2xl font-black' }, `${streak}🔥`),
                    h('div', { className: 'text-[10px] font-bold opacity-80' }, 'Day Streak')
                ),
                h('div', { className: 'bg-gradient-to-br from-blue-400 to-indigo-500 rounded-xl p-4 text-center text-white shadow-lg' },
                    h('div', { className: 'text-2xl font-black' }, checkins.length),
                    h('div', { className: 'text-[10px] font-bold opacity-80' }, 'Check-Ins')
                ),
                h('div', { className: 'bg-gradient-to-br from-amber-400 to-yellow-500 rounded-xl p-4 text-center text-white shadow-lg' },
                    h('div', { className: 'text-2xl font-black' }, badges.length),
                    h('div', { className: 'text-[10px] font-bold opacity-80' }, 'Badges')
                )
            ),
            // Mood check-in
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '💭 How are you feeling right now?'),
                h('div', { className: 'flex gap-3 justify-center mb-3' },
                    moods.map(m => h('button', {
                        key: m.id,
                        onClick: () => setSelectedMood(m.id),
                        className: `w-14 h-14 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${selectedMood === m.id ? moodColors[m.color] + ' scale-110 shadow-md' : 'border-slate-100 hover:border-slate-200 hover:scale-105'}`
                    },
                        h('span', { className: 'text-2xl' }, m.emoji),
                        h('span', { className: 'text-[8px] font-bold text-slate-500' }, m.label)
                    ))
                ),
                selectedMood && h('div', { className: 'space-y-2' },
                    h('textarea', {
                        value: reflection,
                        onChange: e => setReflection(e.target.value),
                        placeholder: 'What made you feel this way? (optional)',
                        rows: 2,
                        className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-blue-300'
                    }),
                    h('button', {
                        onClick: handleCheckin,
                        className: 'w-full py-2.5 bg-gradient-to-r from-green-400 to-emerald-500 text-white rounded-xl font-bold shadow hover:shadow-md transition-all'
                    }, '✅ Check In!')
                )
            ),
            // Quests
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '🎯 Active Quests'),
                h('div', { className: 'space-y-2' },
                    quests.map(q =>
                        h('div', { key: q.id, className: `flex items-center gap-3 p-3 rounded-xl border ${q.done ? 'bg-green-50 border-green-200' : 'bg-white border-slate-100'}` },
                            h('div', { className: `w-6 h-6 rounded-full border-2 flex items-center justify-center text-xs ${q.done ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300 text-slate-300'}` }, q.done ? '✓' : ''),
                            h('div', { className: 'flex-1' },
                                h('div', { className: `text-xs font-bold ${q.done ? 'text-green-700 line-through' : 'text-slate-700'}` }, q.title),
                                h('div', { className: 'text-[10px] text-slate-500' }, q.desc)
                            ),
                            h('span', { className: 'text-[9px] font-bold text-amber-500' }, q.reward)
                        )
                    )
                )
            ),
            // Badges
            badges.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, `🏆 Badges Earned (${badges.length})`),
                h('div', { className: 'grid grid-cols-2 gap-2' },
                    badges.map(b =>
                        h('div', { key: b.id, className: 'flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl' },
                            h('span', { className: 'text-2xl' }, b.icon),
                            h('div', null,
                                h('div', { className: 'text-xs font-bold text-amber-800' }, b.title),
                                h('div', { className: 'text-[9px] text-amber-600' }, b.desc)
                            )
                        )
                    )
                )
            ),
            // Recent check-ins
            checkins.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '📝 Recent Check-Ins'),
                h('div', { className: 'space-y-2' },
                    checkins.slice(0, 7).map(c => {
                        const m = moods.find(m => m.id === c.mood);
                        return h('div', { key: c.id, className: 'flex items-center gap-3 py-2 border-b border-slate-50 last:border-0' },
                            h('span', { className: 'text-xl' }, m?.emoji || '❓'),
                            h('div', { className: 'flex-1' },
                                h('span', { className: 'text-xs font-bold text-slate-700' }, m?.label || c.mood),
                                c.reflection && h('p', { className: 'text-[10px] text-slate-500 mt-0.5' }, c.reflection)
                            ),
                            h('span', { className: 'text-[9px] text-slate-400' }, new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }))
                        );
                    })
                )
            )
        );
    };

    // ─── CulturalContextReflection ──────────────────────────────────────
    // Pre-analysis checklist promoting cultural humility
    const CulturalContextReflection = ({ studentName, t }) => {
        const [responses, setResponses] = useState({});
        const [showSummary, setShowSummary] = useState(false);

        const questions = [
            { id: 'normative', icon: '🌍', question: 'Could this behavior be culturally normative or expected within the student\'s home culture?', hint: 'Consider different cultural communication styles, eye contact norms, personal space, volume levels, and emotional expression.' },
            { id: 'consulted', icon: '👪', question: 'Have you consulted with the family about their perspective on this behavior?', hint: 'Family expertise is essential — they know their child best and can provide cultural context.' },
            { id: 'expectation', icon: '🔍', question: 'Is the behavioral expectation itself culturally unbiased?', hint: 'E.g., "sit still and make eye contact" may conflict with some cultural norms. Are your expectations universal or culturally specific?' },
            { id: 'language', icon: '💬', question: 'Could a language difference be contributing to this behavior?', hint: 'Multilingual students may seem noncompliant when they are processing language. Consider comprehension vs. defiance.' },
            { id: 'trauma', icon: '💛', question: 'Have you considered historical/collective trauma that may influence behavior?', hint: 'Students from marginalized communities may carry intergenerational stress impacting their school experience.' },
            { id: 'strengths', icon: '✨', question: 'What strengths does this student bring from their cultural background?', hint: 'Bilingualism, collectivist problem-solving, storytelling traditions, resilience from lived experiences.' },
            { id: 'observer', icon: '🪞', question: 'How might your own cultural lens be influencing your interpretation of this behavior?', hint: 'We all have implicit biases. Reflection is not about guilt — it\'s about accuracy and fairness.' },
            { id: 'disproportionality', icon: '📊', question: 'Are students from similar backgrounds being flagged at disproportionate rates?', hint: 'If a pattern exists, the issue may be systemic rather than individual.' },
        ];

        const answeredCount = Object.keys(responses).length;
        const yesCount = Object.values(responses).filter(v => v === 'yes').length;

        const handleResponse = (id, val) => {
            setResponses(prev => ({ ...prev, [id]: val }));
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🌍'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Cultural Context Reflection'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, `Pause and reflect before interpreting behavior for ${studentName || 'your student'}`)
            ),
            // Progress
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('div', { className: 'flex items-center justify-between mb-2' },
                    h('span', { className: 'text-xs font-bold text-slate-600' }, `${answeredCount}/${questions.length} questions reflected on`),
                    answeredCount === questions.length && h('span', { className: 'text-xs font-bold text-green-600' }, '✅ Complete')
                ),
                h('div', { className: 'w-full bg-slate-100 rounded-full h-2' },
                    h('div', { className: 'bg-gradient-to-r from-teal-400 to-emerald-500 h-2 rounded-full transition-all duration-500', style: { width: `${(answeredCount / questions.length) * 100}%` } })
                )
            ),
            // Questions
            h('div', { className: 'space-y-3' },
                questions.map(q => {
                    const val = responses[q.id];
                    return h('div', { key: q.id, className: `bg-white rounded-xl border ${val ? 'border-teal-200' : 'border-slate-200'} p-4 shadow-sm transition-all` },
                        h('div', { className: 'flex items-start gap-3' },
                            h('span', { className: 'text-xl mt-0.5 shrink-0' }, q.icon),
                            h('div', { className: 'flex-1' },
                                h('p', { className: 'text-xs font-bold text-slate-800 leading-relaxed' }, q.question),
                                h('p', { className: 'text-[10px] text-slate-500 mt-1 italic leading-relaxed' }, q.hint),
                                h('div', { className: 'flex gap-2 mt-3' },
                                    ['yes', 'not yet', 'n/a'].map(opt =>
                                        h('button', {
                                            key: opt,
                                            onClick: () => handleResponse(q.id, opt),
                                            className: `px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${val === opt
                                                ? opt === 'yes' ? 'bg-green-100 border-green-300 text-green-700' : opt === 'not yet' ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-slate-100 border-slate-300 text-slate-600'
                                                : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'}`
                                        }, opt === 'yes' ? '✅ Yes' : opt === 'not yet' ? '⏳ Not Yet' : '➖ N/A')
                                    )
                                )
                            )
                        )
                    );
                })
            ),
            // Summary
            answeredCount === questions.length && h('div', { className: 'bg-teal-50 rounded-xl border border-teal-200 p-5' },
                h('h3', { className: 'text-sm font-black text-teal-800 mb-2' }, '🎯 Reflection Summary'),
                yesCount >= 6 && h('p', { className: 'text-xs text-teal-700' }, '💚 Strong cultural awareness. You\'ve thoughtfully considered multiple perspectives before proceeding.'),
                yesCount >= 3 && yesCount < 6 && h('p', { className: 'text-xs text-teal-700' }, '💛 Good start! Consider revisiting the "Not Yet" items before finalizing your analysis.'),
                yesCount < 3 && h('p', { className: 'text-xs text-teal-700' }, '🧡 Important reflection needed. Consider connecting with the family and colleagues before interpreting behavior.'),
                h('p', { className: 'text-[10px] text-teal-600 mt-2 italic' }, 'Remember: cultural humility is a lifelong practice. Every reflection makes you a more equitable practitioner.')
            )
        );
    };

    // ─── StrengthReframe ────────────────────────────────────────────────
    // AI rewrites deficit-based language through a strengths lens
    const StrengthReframe = ({ callGemini, t, addToast }) => {
        const [input, setInput] = useState('');
        const [output, setOutput] = useState('');
        const [loading, setLoading] = useState(false);
        const [examples] = useState([
            { deficit: 'Student is defiant and refuses to follow directions.', strength: 'Student demonstrates strong self-advocacy and may benefit from collaborative problem-solving approaches.' },
            { deficit: 'Student is constantly off-task and disruptive.', strength: 'Student shows high energy and may thrive with more movement-based learning and structured choice opportunities.' },
            { deficit: 'Student has poor social skills and can\'t get along with peers.', strength: 'Student is navigating complex social dynamics and may benefit from explicit social coaching in low-stakes settings.' },
        ]);

        const handleReframe = async () => {
            if (!callGemini || !input.trim()) return;
            setLoading(true);
            try {
                const prompt = `You are a culturally responsive school psychologist specializing in strengths-based language.
${RESTORATIVE_PREAMBLE}

Rewrite the following deficit-based behavioral description using strengths-based, asset-focused language. 

IMPORTANT GUIDELINES:
- Preserve the factual observation but remove judgment/labels
- Highlight what the student IS doing (their strength), not just what they're not doing
- Reframe "can't/won't/refuses" → "is working toward / may benefit from / demonstrates"
- Add a brief suggestion for support that honors the student's agency
- Be genuine — don't sugarcoat dangerous behavior, but humanize the student
- Consider cultural context — behavior labeled "defiant" may reflect cultural communication norms

ORIGINAL (deficit-based):
"${input.trim()}"

Provide:
✨ STRENGTHS-BASED REFRAME:
[The rewritten description]

💡 WHY THIS MATTERS:
[1-2 sentences on how language shapes perception and outcomes for students]

🛠️ SUPPORT SUGGESTION:
[One actionable strategy that honors the student's agency]`;

                const result = await callGemini(prompt, true);
                setOutput(result);
                if (addToast) addToast('Reframed through strengths lens ✨', 'success');
            } catch (err) {
                warnLog('Reframe failed:', err);
                if (addToast) addToast('Reframe failed', 'error');
            } finally { setLoading(false); }
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '✨'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Strength-Based Reframe'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Transform deficit-based language into asset-focused descriptions')
            ),
            // Input
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('label', { className: 'text-xs font-bold text-slate-600 block mb-2' }, '📝 Paste a deficit-based description:'),
                h('textarea', {
                    value: input,
                    onChange: e => setInput(e.target.value),
                    placeholder: 'e.g., "Student is defiant and refuses to follow directions."',
                    rows: 3,
                    className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-teal-300'
                }),
                callGemini && h('button', {
                    onClick: handleReframe,
                    disabled: loading || !input.trim(),
                    className: 'w-full mt-3 py-2.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white rounded-xl font-bold shadow hover:shadow-md disabled:opacity-40 transition-all'
                }, loading ? '⏳ Reframing...' : '✨ Reframe Through Strengths Lens')
            ),
            // Output
            output && h('div', { className: 'bg-emerald-50 rounded-xl border border-emerald-200 p-5 shadow-sm' },
                h('div', { className: 'text-xs text-slate-700 whitespace-pre-wrap leading-relaxed' }, output),
                h('div', { className: 'flex gap-2 mt-3' },
                    h('button', {
                        onClick: () => { navigator.clipboard.writeText(output); if (addToast) addToast('Copied!', 'success'); },
                        className: 'px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-[10px] font-bold hover:bg-emerald-200'
                    }, '📋 Copy Reframe'),
                    h('button', {
                        onClick: () => { setInput(''); setOutput(''); },
                        className: 'px-3 py-1.5 bg-white text-slate-500 border border-slate-200 rounded-lg text-[10px] font-bold hover:bg-slate-50'
                    }, '🔄 New')
                )
            ),
            // Examples
            !output && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '💡 Examples of Reframing'),
                h('div', { className: 'space-y-3' },
                    examples.map((ex, i) =>
                        h('div', { key: i, className: 'space-y-1' },
                            h('div', { className: 'flex items-start gap-2' },
                                h('span', { className: 'text-red-400 text-[10px] font-bold shrink-0 mt-0.5' }, '❌'),
                                h('p', { className: 'text-[10px] text-red-600 line-through' }, ex.deficit)
                            ),
                            h('div', { className: 'flex items-start gap-2' },
                                h('span', { className: 'text-green-500 text-[10px] font-bold shrink-0 mt-0.5' }, '✅'),
                                h('p', { className: 'text-[10px] text-green-700 font-bold' }, ex.strength)
                            ),
                            h('button', {
                                onClick: () => setInput(ex.deficit),
                                className: 'text-[9px] text-teal-500 ml-5 hover:text-teal-700 font-bold'
                            }, '→ Try this example')
                        )
                    )
                )
            )
        );
    };

    // ─── BiasReflectionMonitor ──────────────────────────────────────────
    // Analyzes ABC entries for potential implicit bias patterns
    const BiasReflectionMonitor = ({ abcEntries, callGemini, t, addToast }) => {
        const [aiReport, setAiReport] = useState('');
        const [analyzing, setAnalyzing] = useState(false);

        // Local pattern checks
        const localFlags = useMemo(() => {
            if (abcEntries.length < 5) return [];
            const flags = [];
            // Language tone check
            const negativeWords = ['always', 'never', 'refuses', 'defiant', 'aggressive', 'manipulative', 'lazy', 'disrespectful', 'hostile', 'violent'];
            let negCount = 0;
            abcEntries.forEach(e => {
                const text = ((e.behavior || '') + ' ' + (e.antecedent || '') + ' ' + (e.consequence || '')).toLowerCase();
                negativeWords.forEach(w => { if (text.includes(w)) negCount++; });
            });
            if (negCount > abcEntries.length * 0.3) {
                flags.push({ icon: '⚠️', text: `Deficit-based language detected in ${negCount} instances across ${abcEntries.length} entries. Consider using the Strength-Based Reframe tool.`, type: 'language' });
            }
            // Consequence consistency
            const consequences = abcEntries.map(e => (e.consequence || '').toLowerCase());
            const punitiveCount = consequences.filter(c => c.includes('sent to') || c.includes('lost') || c.includes('removed') || c.includes('detention') || c.includes('suspended')).length;
            const restorativeCount = consequences.filter(c => c.includes('talked') || c.includes('circle') || c.includes('repair') || c.includes('reflect') || c.includes('choice')).length;
            if (punitiveCount > restorativeCount * 2 && punitiveCount >= 3) {
                flags.push({ icon: '🔄', text: `Punitive consequences (${punitiveCount}) significantly outnumber restorative ones (${restorativeCount}). Consider diversifying your response strategies.`, type: 'consequence' });
            }
            // Setting concentration
            const settings = {};
            abcEntries.forEach(e => { const s = (e.setting || '').toLowerCase(); if (s) settings[s] = (settings[s] || 0) + 1; });
            const topSetting = Object.entries(settings).sort((a, b) => b[1] - a[1])[0];
            if (topSetting && topSetting[1] > abcEntries.length * 0.6) {
                flags.push({ icon: '📍', text: `${Math.round(topSetting[1] / abcEntries.length * 100)}% of entries come from "${topSetting[0]}". Is this setting structured equitably for all learners?`, type: 'setting' });
            }
            return flags;
        }, [abcEntries]);

        const handleAIAnalysis = async () => {
            if (!callGemini || abcEntries.length < 5) return;
            setAnalyzing(true);
            try {
                const prompt = `You are an equity-focused school psychologist conducting a bias reflection analysis.
${RESTORATIVE_PREAMBLE}

IMPORTANT: Your role is to gently surface patterns for REFLECTION, not accusations. Frame insights as questions and invitations, not judgments.

Analyze these ${abcEntries.length} ABC entries for potential implicit bias patterns:

${abcEntries.slice(-15).map((e, i) => `${i + 1}. B: "${e.behavior}" | A: "${e.antecedent}" | C: "${e.consequence}" | Setting: "${e.setting || 'N/A'}"`).join('\n')}

Provide a reflective report structured as:

🪞 LANGUAGE PATTERNS
- Is the language consistently deficit-based or strengths-based?
- Are certain behaviors labeled more harshly than others?

📊 RESPONSE PATTERNS
- Are consequences proportionate and consistent?
- Are restorative approaches being used?

🏠 ENVIRONMENTAL PATTERNS
- Are certain settings contributing to behaviors?
- Could structural changes reduce incidents?

💡 REFLECTION QUESTIONS
- 3-4 honest, non-judgmental questions for the practitioner to consider

🌱 GROWTH OPPORTUNITIES
- 2-3 specific, actionable suggestions for more equitable practice

Remember: this is about growth, not guilt. Keep the tone supportive and empowering.`;

                const result = await callGemini(prompt, true);
                setAiReport(result);
                if (addToast) addToast('Bias reflection complete', 'success');
            } catch (err) {
                warnLog('Bias analysis failed:', err);
                if (addToast) addToast('Analysis failed', 'error');
            } finally { setAnalyzing(false); }
        };

        const typeColors = { language: 'bg-amber-50 border-amber-200 text-amber-800', consequence: 'bg-purple-50 border-purple-200 text-purple-800', setting: 'bg-blue-50 border-blue-200 text-blue-800' };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🪞'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Bias Reflection Monitor'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Gently surfaces patterns for reflection — growth, not guilt')
            ),
            abcEntries.length < 5 && h('div', { className: 'text-center py-8 bg-white rounded-xl border border-slate-200' },
                h('div', { className: 'text-3xl mb-2' }, '📊'),
                h('p', { className: 'text-sm text-slate-500' }, 'Need at least 5 ABC entries for pattern analysis.')
            ),
            localFlags.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '⚡ Auto-Detected Patterns'),
                h('div', { className: 'space-y-2' },
                    localFlags.map((f, i) =>
                        h('div', { key: i, className: `flex items-start gap-2 px-3 py-2.5 rounded-lg border ${typeColors[f.type] || typeColors.language}` },
                            h('span', { className: 'shrink-0' }, f.icon),
                            h('span', { className: 'text-xs font-bold leading-relaxed' }, f.text)
                        )
                    )
                )
            ),
            callGemini && abcEntries.length >= 5 && h('button', {
                onClick: handleAIAnalysis,
                disabled: analyzing,
                className: 'w-full py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, analyzing ? '⏳ Reflecting...' : '🪞 Run AI Bias Reflection Analysis'),
            aiReport && h('div', { className: 'bg-white rounded-xl border border-teal-200 p-5 shadow-sm' },
                h('div', { className: 'text-xs text-slate-700 whitespace-pre-wrap leading-relaxed' }, aiReport),
                h('button', {
                    onClick: () => { navigator.clipboard.writeText(aiReport); if (addToast) addToast('Copied!', 'success'); },
                    className: 'mt-3 px-3 py-1.5 bg-teal-100 text-teal-700 rounded-lg text-[10px] font-bold hover:bg-teal-200'
                }, '📋 Copy Report')
            )
        );
    };

    // ─── RestorativeConversationGuide ────────────────────────────────────
    // Step-by-step scripts for restorative conversations
    const RestorativeConversationGuide = ({ t }) => {
        const [activeGuide, setActiveGuide] = useState(null);

        const guides = [
            {
                id: 'repair', icon: '💛', title: 'Harm Repair Conversation', color: 'amber',
                desc: 'When a student has caused harm and needs to repair the relationship',
                steps: [
                    { q: 'What happened?', tip: 'Listen without judgment. Use "Tell me about..." not "Why did you..."', who: 'Ask the student' },
                    { q: 'What were you thinking at the time?', tip: 'Understanding their mindset helps you address root causes, not surface behavior.', who: 'Ask the student' },
                    { q: 'What have you thought about since?', tip: 'Creates space for reflection. Don\'t rush to consequences.', who: 'Ask the student' },
                    { q: 'Who has been affected by what happened?', tip: 'Helps build empathy. Include the student themselves.', who: 'Ask the student' },
                    { q: 'How have they been affected?', tip: 'Guide them to see impact from others\' perspectives.', who: 'Ask the student' },
                    { q: 'What do you think you need to do to make things right?', tip: 'Let THEM generate solutions. Their ideas are more meaningful than imposed consequences.', who: 'Ask the student' },
                ]
            },
            {
                id: 'circle', icon: '🔵', title: 'Community Circle', color: 'blue',
                desc: 'For building relationships and addressing class-wide concerns',
                steps: [
                    { q: 'Opening Ceremony', tip: 'Start with a mindful moment, breathing exercise, or positive affirmation. This signals "circle time is different."', who: 'Facilitator' },
                    { q: 'Check-In Round', tip: 'Use a talking piece. Everyone answers: "On a scale of 1-5, how are you today? Share one word about why."', who: 'Everyone' },
                    { q: 'Norm Setting', tip: 'Co-create circle norms: "Speak from the heart, listen from the heart, say just enough, what\'s said here stays here."', who: 'Everyone' },
                    { q: 'Topic Round', tip: 'Introduce the topic with an open question. Pass the talking piece. No cross-talk.', who: 'Facilitator → Everyone' },
                    { q: 'Action Round', tip: '"What is one thing we can each commit to this week?"', who: 'Everyone' },
                    { q: 'Closing Ceremony', tip: 'End with a positive affirmation, group breath, or appreciation round.', who: 'Everyone' },
                ]
            },
            {
                id: 'reintegration', icon: '🟢', title: 'Reintegration Conference', color: 'green',
                desc: 'When a student returns from suspension, exclusion, or extended absence',
                steps: [
                    { q: 'Welcome back', tip: '"We\'re glad you\'re here. Our community isn\'t complete without you." Lead with belonging, not shame.', who: 'Facilitator' },
                    { q: 'Acknowledge what happened', tip: '"Something happened that caused you to be away from us. Let\'s talk about how we move forward."', who: 'Facilitator' },
                    { q: 'Student voice', tip: '"What was it like being away? What do you need from us?"', who: 'Student' },
                    { q: 'Peer/class voice', tip: '"What do you need from [student] to feel safe/comfortable?"', who: 'Classroom' },
                    { q: 'Co-create a plan', tip: 'Together, identify: supports needed, check-in points, who to go to for help.', who: 'Everyone' },
                    { q: 'Commitment', tip: '"Can we all commit to this plan? What happens if someone needs help?"', who: 'Everyone' },
                ]
            },
        ];

        const guideColors = {
            amber: 'bg-amber-50 border-amber-200',
            blue: 'bg-blue-50 border-blue-200',
            green: 'bg-green-50 border-green-200',
        };
        const stepColors = {
            amber: 'bg-amber-100 border-amber-300 text-amber-800',
            blue: 'bg-blue-100 border-blue-300 text-blue-800',
            green: 'bg-green-100 border-green-300 text-green-800',
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🤝'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Restorative Conversation Guide'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Step-by-step scripts for healing relationships and building community')
            ),
            // Guide selector
            !activeGuide && h('div', { className: 'space-y-3' },
                guides.map(g => h('button', {
                    key: g.id,
                    onClick: () => setActiveGuide(g.id),
                    className: `w-full text-left p-5 rounded-xl border-2 ${guideColors[g.color]} shadow-sm hover:shadow-md transition-all`
                },
                    h('div', { className: 'flex items-center gap-3' },
                        h('span', { className: 'text-3xl' }, g.icon),
                        h('div', null,
                            h('h3', { className: 'text-sm font-black text-slate-800' }, g.title),
                            h('p', { className: 'text-[10px] text-slate-500 mt-0.5' }, g.desc)
                        )
                    )
                ))
            ),
            // Active guide
            activeGuide && (() => {
                const g = guides.find(g => g.id === activeGuide);
                return h('div', { className: 'space-y-3' },
                    h('button', {
                        onClick: () => setActiveGuide(null),
                        className: 'text-xs text-slate-500 hover:text-slate-700 font-bold'
                    }, '← Back to all guides'),
                    h('div', { className: `p-5 rounded-xl border-2 ${guideColors[g.color]}` },
                        h('div', { className: 'flex items-center gap-2 mb-4' },
                            h('span', { className: 'text-2xl' }, g.icon),
                            h('h3', { className: 'text-sm font-black text-slate-800' }, g.title)
                        ),
                        h('div', { className: 'space-y-3' },
                            g.steps.map((step, i) =>
                                h('div', { key: i, className: `p-4 rounded-xl border ${stepColors[g.color]}` },
                                    h('div', { className: 'flex items-center gap-2 mb-2' },
                                        h('div', { className: 'w-6 h-6 rounded-full bg-white flex items-center justify-center text-xs font-bold shadow-sm' }, i + 1),
                                        h('span', { className: 'text-[9px] font-bold px-2 py-0.5 bg-white rounded-full shadow-sm' }, step.who)
                                    ),
                                    h('p', { className: 'text-sm font-black mb-1' }, `"${step.q}"`),
                                    h('p', { className: 'text-[10px] italic opacity-80 leading-relaxed' }, `💡 ${step.tip}`)
                                )
                            )
                        )
                    )
                );
            })()
        );
    };

    // ─── RelationshipMap ────────────────────────────────────────────────
    // Visual diagram of student's trusted adults and peer connections
    const RelationshipMap = ({ studentName, t, addToast }) => {
        const [connections, setConnections] = useState([]);
        const [newName, setNewName] = useState('');
        const [newRole, setNewRole] = useState('trusted_adult');
        const [newStrength, setNewStrength] = useState('strong');

        const roles = [
            { id: 'trusted_adult', label: '💛 Trusted Adult', color: 'amber' },
            { id: 'peer_friend', label: '💚 Peer Friend', color: 'green' },
            { id: 'family', label: '💜 Family', color: 'purple' },
            { id: 'mentor', label: '💙 Mentor/Coach', color: 'blue' },
            { id: 'challenge', label: '🧡 Challenging Relationship', color: 'orange' },
        ];
        const strengths = [
            { id: 'strong', label: 'Strong', color: 'green' },
            { id: 'developing', label: 'Developing', color: 'amber' },
            { id: 'strained', label: 'Strained', color: 'red' },
        ];

        const handleAdd = () => {
            if (!newName.trim()) return;
            setConnections(prev => [...prev, {
                id: Date.now(),
                name: newName.trim(),
                role: newRole,
                strength: newStrength,
            }]);
            setNewName('');
            if (addToast) addToast('Connection added', 'success');
        };

        const roleColors = { amber: 'bg-amber-100 text-amber-700 border-amber-200', green: 'bg-green-100 text-green-700 border-green-200', purple: 'bg-purple-100 text-purple-700 border-purple-200', blue: 'bg-blue-100 text-blue-700 border-blue-200', orange: 'bg-orange-100 text-orange-700 border-orange-200' };
        const strengthColors = { strong: 'bg-green-400', developing: 'bg-amber-400', strained: 'bg-red-400' };

        const grouped = roles.map(r => ({
            ...r,
            people: connections.filter(c => c.role === r.id)
        })).filter(g => g.people.length > 0);

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🗺️'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Relationship Map'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, `Connection ecosystem for ${studentName || 'your student'}`)
            ),
            // Add form
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-xs font-bold text-slate-600 mb-3' }, '➕ Add a Connection'),
                h('div', { className: 'flex gap-2 mb-2' },
                    h('input', {
                        value: newName,
                        onChange: e => setNewName(e.target.value),
                        onKeyDown: e => { if (e.key === 'Enter') handleAdd(); },
                        placeholder: 'Person\'s name or role',
                        className: 'flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-300'
                    }),
                    h('button', {
                        onClick: handleAdd,
                        disabled: !newName.trim(),
                        className: 'px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 disabled:opacity-40'
                    }, '+')
                ),
                h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                    roles.map(r => h('button', {
                        key: r.id,
                        onClick: () => setNewRole(r.id),
                        className: `px-2 py-1 rounded-full text-[9px] font-bold border transition-all ${newRole === r.id ? roleColors[r.color] : 'bg-white border-slate-100 text-slate-400'}`
                    }, r.label))
                ),
                h('div', { className: 'flex gap-2' },
                    strengths.map(s => h('button', {
                        key: s.id,
                        onClick: () => setNewStrength(s.id),
                        className: `px-3 py-1 rounded-full text-[9px] font-bold border transition-all ${newStrength === s.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-400'}`
                    }, `${s.label}`))
                )
            ),
            // Visual map
            connections.length === 0
                ? h('div', { className: 'text-center py-8 bg-white rounded-xl border border-slate-200' },
                    h('div', { className: 'text-3xl mb-2' }, '🗺️'),
                    h('p', { className: 'text-sm text-slate-500' }, 'Add connections to build the relationship map.')
                )
                : h('div', { className: 'space-y-3' },
                    // Center student
                    h('div', { className: 'text-center' },
                        h('div', { className: 'inline-flex items-center gap-2 px-5 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-2xl shadow-lg' },
                            h('span', { className: 'text-xl' }, '👤'),
                            h('span', { className: 'font-black text-sm' }, studentName || 'Student')
                        )
                    ),
                    // Groups
                    grouped.map(g =>
                        h('div', { key: g.id, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                            h('h4', { className: `text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit mb-3 ${roleColors[g.color]}` }, g.label),
                            h('div', { className: 'flex flex-wrap gap-2' },
                                g.people.map(p =>
                                    h('div', { key: p.id, className: 'flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-xl border border-slate-100' },
                                        h('div', { className: `w-2 h-2 rounded-full ${strengthColors[p.strength]}` }),
                                        h('span', { className: 'text-xs font-bold text-slate-700' }, p.name),
                                        h('button', {
                                            onClick: () => setConnections(prev => prev.filter(c => c.id !== p.id)),
                                            className: 'text-[10px] text-slate-300 hover:text-red-400'
                                        }, '✕')
                                    )
                                )
                            )
                        )
                    ),
                    // Legend
                    h('div', { className: 'flex items-center gap-4 justify-center text-[9px] text-slate-400' },
                        strengths.map(s =>
                            h('div', { key: s.id, className: 'flex items-center gap-1' },
                                h('div', { className: `w-2 h-2 rounded-full ${strengthColors[s.id]}` }),
                                h('span', null, s.label)
                            )
                        )
                    ),
                    // Gaps analysis
                    (() => {
                        const gaps = [];
                        if (!connections.some(c => c.role === 'trusted_adult')) gaps.push('No trusted adult at school identified');
                        if (!connections.some(c => c.role === 'peer_friend')) gaps.push('No peer friendships mapped');
                        if (!connections.some(c => c.role === 'family')) gaps.push('No family connections documented');
                        if (connections.filter(c => c.strength === 'strained').length > connections.filter(c => c.strength === 'strong').length) gaps.push('More strained than strong relationships');
                        return gaps.length > 0 && h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-4' },
                            h('h4', { className: 'text-xs font-black text-amber-800 mb-2' }, '⚠️ Relationship Gaps Identified'),
                            h('ul', { className: 'space-y-1' },
                                gaps.map((g, i) => h('li', { key: i, className: 'text-[10px] text-amber-700 flex items-center gap-1' },
                                    h('span', null, '•'), g
                                ))
                            )
                        );
                    })()
                )
        );
    };

    // ─── FamilyVoiceCollector ────────────────────────────────────────────
    // Structured form for families to share observations and celebrations
    const FamilyVoiceCollector = ({ studentName, callGemini, t, addToast }) => {
        const [entries, setEntries] = useState([]);
        const [observation, setObservation] = useState('');
        const [category, setCategory] = useState('strength');
        const [translateLang, setTranslateLang] = useState('');
        const [translating, setTranslating] = useState(false);

        const categories = [
            { id: 'strength', icon: '⭐', label: 'Strength/Celebration', color: 'green' },
            { id: 'concern', icon: '💬', label: 'Concern', color: 'amber' },
            { id: 'context', icon: '🏠', label: 'Home Context', color: 'blue' },
            { id: 'culture', icon: '🌍', label: 'Cultural Insight', color: 'purple' },
            { id: 'suggestion', icon: '💡', label: 'Suggestion', color: 'teal' },
        ];

        const catColors = { green: 'bg-green-100 text-green-700 border-green-200', amber: 'bg-amber-100 text-amber-700 border-amber-200', blue: 'bg-blue-100 text-blue-700 border-blue-200', purple: 'bg-purple-100 text-purple-700 border-purple-200', teal: 'bg-teal-100 text-teal-700 border-teal-200' };

        const handleAdd = () => {
            if (!observation.trim()) return;
            const cat = categories.find(c => c.id === category) || categories[0];
            setEntries(prev => [{
                id: Date.now(),
                text: observation.trim(),
                category: cat.id,
                categoryLabel: cat.label,
                categoryIcon: cat.icon,
                categoryColor: cat.color,
                timestamp: new Date().toISOString(),
                translated: null,
            }, ...prev]);
            setObservation('');
            if (addToast) addToast('Family voice entry added ✨', 'success');
        };

        const handleTranslate = async (entryId) => {
            if (!callGemini || !translateLang.trim()) return;
            setTranslating(true);
            try {
                const entry = entries.find(e => e.id === entryId);
                if (!entry) return;
                const prompt = `Translate the following family observation into ${translateLang}. Maintain the tone and meaning. Only return the translated text.\n\n"${entry.text}"`;
                const result = await callGemini(prompt, true);
                setEntries(prev => prev.map(e => e.id === entryId ? { ...e, translated: result } : e));
                if (addToast) addToast('Translated!', 'success');
            } catch (err) {
                if (addToast) addToast('Translation failed', 'error');
            } finally { setTranslating(false); }
        };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '👪'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Family Voice'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, `Family observations and insights for ${studentName || 'your student'} — centering family expertise`)
            ),
            // Input form
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('div', { className: 'flex flex-wrap gap-1.5 mb-3' },
                    categories.map(c => h('button', {
                        key: c.id,
                        onClick: () => setCategory(c.id),
                        className: `px-3 py-1.5 rounded-full text-[10px] font-bold border transition-all ${category === c.id ? catColors[c.color] : 'bg-white border-slate-100 text-slate-400'}`
                    }, `${c.icon} ${c.label}`))
                ),
                h('textarea', {
                    value: observation,
                    onChange: e => setObservation(e.target.value),
                    placeholder: 'Share what you notice at home — strengths, concerns, cultural context, or suggestions for the school team...',
                    rows: 3,
                    className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-purple-300 mb-2'
                }),
                h('button', {
                    onClick: handleAdd,
                    disabled: !observation.trim(),
                    className: 'w-full py-2.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-bold shadow hover:shadow-md disabled:opacity-40 transition-all'
                }, '📤 Share Your Voice')
            ),
            // Translation tool
            callGemini && entries.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('div', { className: 'flex gap-2' },
                    h('input', {
                        value: translateLang,
                        onChange: e => setTranslateLang(e.target.value),
                        placeholder: 'Type language (e.g., Spanish, Arabic, Somali)',
                        className: 'flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-purple-300'
                    }),
                    h('span', { className: 'text-[9px] text-slate-400 self-center' }, 'then tap translate on any entry below')
                )
            ),
            // Entries
            entries.length === 0
                ? h('div', { className: 'text-center py-8 bg-white rounded-xl border border-slate-200' },
                    h('div', { className: 'text-3xl mb-2' }, '💬'),
                    h('p', { className: 'text-sm text-slate-500' }, 'Family voices are powerful. Share your first observation!')
                )
                : h('div', { className: 'space-y-3' },
                    entries.map(entry => {
                        const colors = catColors[entry.categoryColor] || catColors.green;
                        return h('div', { key: entry.id, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                            h('div', { className: 'flex items-center justify-between mb-2' },
                                h('span', { className: `text-[10px] font-bold px-2 py-0.5 rounded-full border ${colors}` }, `${entry.categoryIcon} ${entry.categoryLabel}`),
                                h('div', { className: 'flex items-center gap-2' },
                                    h('span', { className: 'text-[9px] text-slate-400' },
                                        new Date(entry.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    ),
                                    callGemini && translateLang && h('button', {
                                        onClick: () => handleTranslate(entry.id),
                                        disabled: translating,
                                        className: 'text-[9px] text-purple-500 font-bold hover:text-purple-700'
                                    }, translating ? '...' : `🌐 → ${translateLang}`),
                                    h('button', {
                                        onClick: () => setEntries(prev => prev.filter(e => e.id !== entry.id)),
                                        className: 'text-[10px] text-slate-300 hover:text-red-400'
                                    }, '✕')
                                )
                            ),
                            h('p', { className: 'text-xs text-slate-700 leading-relaxed' }, entry.text),
                            entry.translated && h('div', { className: 'mt-2 p-2 bg-purple-50 rounded-lg border border-purple-100' },
                                h('p', { className: 'text-[10px] text-purple-700 leading-relaxed' }, `🌐 ${entry.translated}`)
                            )
                        );
                    })
                )
        );
    };

    // ─── TwoWayCommLog ──────────────────────────────────────────────────
    // Family contact tracker with follow-ups
    const TwoWayCommLog = ({ studentName, t, addToast }) => {
        const [contacts, setContacts] = useState([]);
        const [form, setForm] = useState({ who: '', method: 'phone', topic: '', outcome: '', followUp: '' });

        const methods = [
            { id: 'phone', icon: '📞', label: 'Phone Call' },
            { id: 'email', icon: '📧', label: 'Email' },
            { id: 'inperson', icon: '🤝', label: 'In-Person' },
            { id: 'note', icon: '📝', label: 'Written Note' },
            { id: 'app', icon: '📱', label: 'App/Text' },
            { id: 'video', icon: '💻', label: 'Video Call' },
        ];

        const handleAdd = () => {
            if (!form.topic.trim()) return;
            setContacts(prev => [{
                id: Date.now(),
                ...form,
                who: form.who.trim() || 'Family',
                topic: form.topic.trim(),
                outcome: form.outcome.trim(),
                followUp: form.followUp.trim(),
                timestamp: new Date().toISOString(),
                followUpDone: false,
            }, ...prev]);
            setForm({ who: '', method: 'phone', topic: '', outcome: '', followUp: '' });
            if (addToast) addToast('Contact logged', 'success');
        };

        const toggleFollowUp = (id) => {
            setContacts(prev => prev.map(c => c.id === id ? { ...c, followUpDone: !c.followUpDone } : c));
        };

        const pendingFollowUps = contacts.filter(c => c.followUp && !c.followUpDone);

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '📞'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Communication Log'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, `Two-way family contact tracker for ${studentName || 'your student'}`)
            ),
            // Follow-up alerts
            pendingFollowUps.length > 0 && h('div', { className: 'bg-amber-50 rounded-xl border border-amber-200 p-4' },
                h('h3', { className: 'text-xs font-black text-amber-800 mb-2' }, `⏰ ${pendingFollowUps.length} Pending Follow-Up${pendingFollowUps.length > 1 ? 's' : ''}`),
                h('div', { className: 'space-y-1' },
                    pendingFollowUps.map(c =>
                        h('div', { key: c.id, className: 'flex items-center justify-between' },
                            h('span', { className: 'text-[10px] text-amber-700' }, `${c.followUp} (${c.who})`),
                            h('button', {
                                onClick: () => toggleFollowUp(c.id),
                                className: 'text-[10px] text-green-600 font-bold hover:text-green-800'
                            }, '✅ Done')
                        )
                    )
                )
            ),
            // Log form
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-xs font-bold text-slate-600 mb-3' }, '📋 Log a Contact'),
                h('div', { className: 'grid grid-cols-2 gap-2 mb-2' },
                    h('input', {
                        value: form.who,
                        onChange: e => setForm(prev => ({ ...prev, who: e.target.value })),
                        placeholder: 'Who did you contact?',
                        className: 'px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300'
                    }),
                    h('select', {
                        value: form.method,
                        onChange: e => setForm(prev => ({ ...prev, method: e.target.value })),
                        className: 'px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300'
                    },
                        methods.map(m => h('option', { key: m.id, value: m.id }, `${m.icon} ${m.label}`))
                    )
                ),
                h('textarea', {
                    value: form.topic,
                    onChange: e => setForm(prev => ({ ...prev, topic: e.target.value })),
                    placeholder: 'Topic / purpose of contact',
                    rows: 2,
                    className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-blue-300 mb-2'
                }),
                h('textarea', {
                    value: form.outcome,
                    onChange: e => setForm(prev => ({ ...prev, outcome: e.target.value })),
                    placeholder: 'Outcome / key takeaways (optional)',
                    rows: 1,
                    className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-blue-300 mb-2'
                }),
                h('input', {
                    value: form.followUp,
                    onChange: e => setForm(prev => ({ ...prev, followUp: e.target.value })),
                    placeholder: 'Follow-up needed? (optional)',
                    className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300 mb-2'
                }),
                h('button', {
                    onClick: handleAdd,
                    disabled: !form.topic.trim(),
                    className: 'w-full py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-bold shadow hover:shadow-md disabled:opacity-40 transition-all'
                }, '📤 Log Contact')
            ),
            // Contact history
            contacts.length === 0
                ? h('div', { className: 'text-center py-8 bg-white rounded-xl border border-slate-200' },
                    h('div', { className: 'text-3xl mb-2' }, '📞'),
                    h('p', { className: 'text-sm text-slate-500' }, 'No contacts logged yet. Consistent communication builds trust!')
                )
                : h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                    h('h3', { className: 'text-xs font-black text-slate-700 mb-3' }, `📋 Contact History (${contacts.length})`),
                    h('div', { className: 'space-y-3' },
                        contacts.map(c => {
                            const m = methods.find(m => m.id === c.method) || methods[0];
                            return h('div', { key: c.id, className: 'p-3 rounded-xl border border-slate-100 bg-slate-50' },
                                h('div', { className: 'flex items-center justify-between mb-1' },
                                    h('div', { className: 'flex items-center gap-2' },
                                        h('span', null, m.icon),
                                        h('span', { className: 'text-xs font-bold text-slate-700' }, c.who),
                                        h('span', { className: 'text-[9px] text-slate-400' }, m.label)
                                    ),
                                    h('span', { className: 'text-[9px] text-slate-400' },
                                        new Date(c.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                    )
                                ),
                                h('p', { className: 'text-[10px] text-slate-600' }, c.topic),
                                c.outcome && h('p', { className: 'text-[10px] text-slate-500 mt-1 italic' }, `→ ${c.outcome}`),
                                c.followUp && h('div', { className: `flex items-center gap-1 mt-1 text-[9px] ${c.followUpDone ? 'text-green-600 line-through' : 'text-amber-600 font-bold'}` },
                                    h('span', null, c.followUpDone ? '✅' : '⏰'),
                                    h('span', null, c.followUp),
                                    !c.followUpDone && h('button', {
                                        onClick: () => toggleFollowUp(c.id),
                                        className: 'ml-1 text-green-500 hover:text-green-700'
                                    }, '(mark done)')
                                )
                            );
                        })
                    )
                ),
            // Stats
            contacts.length > 0 && h('div', { className: 'grid grid-cols-3 gap-3' },
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-3 text-center' },
                    h('div', { className: 'text-xl font-black text-blue-600' }, contacts.length),
                    h('div', { className: 'text-[9px] text-slate-500 font-bold' }, 'Total Contacts')
                ),
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-3 text-center' },
                    h('div', { className: 'text-xl font-black text-green-600' }, contacts.filter(c => c.followUpDone).length),
                    h('div', { className: 'text-[9px] text-slate-500 font-bold' }, 'Follow-Ups Done')
                ),
                h('div', { className: 'bg-white rounded-xl border border-slate-200 p-3 text-center' },
                    h('div', { className: 'text-xl font-black text-purple-600' }, [...new Set(contacts.map(c => c.method))].length),
                    h('div', { className: 'text-[9px] text-slate-500 font-bold' }, 'Methods Used')
                )
            )
        );
    };

    // ─── DeEscalationToolkit ────────────────────────────────────────────
    // Real-time calming tools: breathing, timers, sensory breaks, grounding
    const DeEscalationToolkit = ({ t }) => {
        const [activeTool, setActiveTool] = useState(null);
        const [timerSeconds, setTimerSeconds] = useState(60);
        const [timerRunning, setTimerRunning] = useState(false);
        const [timerRemaining, setTimerRemaining] = useState(60);
        const [breathPhase, setBreathPhase] = useState('ready'); // ready, inhale, hold, exhale
        const [breathCycle, setBreathCycle] = useState(0);
        const [groundingStep, setGroundingStep] = useState(0);

        // Timer effect
        useEffect(() => {
            if (!timerRunning || timerRemaining <= 0) {
                if (timerRemaining <= 0 && timerRunning) setTimerRunning(false);
                return;
            }
            const interval = setInterval(() => setTimerRemaining(prev => prev - 1), 1000);
            return () => clearInterval(interval);
        }, [timerRunning, timerRemaining]);

        // Breathing animation effect
        useEffect(() => {
            if (breathPhase === 'ready') return;
            const durations = { inhale: 4000, hold: 4000, exhale: 6000 };
            const next = { inhale: 'hold', hold: 'exhale', exhale: 'inhale' };
            const timeout = setTimeout(() => {
                if (breathPhase === 'exhale') setBreathCycle(prev => prev + 1);
                setBreathPhase(next[breathPhase]);
            }, durations[breathPhase]);
            return () => clearTimeout(timeout);
        }, [breathPhase]);

        const tools = [
            { id: 'breathe', icon: '🌊', title: 'Breathing Exercise', desc: '4-4-6 box breathing with visual animation', color: 'blue' },
            { id: 'timer', icon: '⏱️', title: 'Visual Break Timer', desc: 'Countdown timer for calm-down breaks', color: 'green' },
            { id: 'sensory', icon: '🎧', title: 'Sensory Break Menu', desc: 'Quick sensory strategies organized by type', color: 'purple' },
            { id: 'grounding', icon: '🌿', title: '5-4-3-2-1 Grounding', desc: 'Guided grounding exercise for anxiety', color: 'teal' },
        ];

        const sensoryStrategies = [
            { category: '👀 Visual', items: ['Look out window', 'Count ceiling tiles', 'Watch a glitter jar', 'Draw/doodle freely', 'Find 3 calming colors'] },
            { category: '👂 Auditory', items: ['Listen to calming music', 'Count sounds you hear', 'Hum a favorite tune', 'Whisper a mantra', 'Use noise-canceling headphones'] },
            { category: '🤲 Tactile', items: ['Squeeze a stress ball', 'Hold something cold', 'Touch 5 different textures', 'Press palms together (10 sec)', 'Fidget tool'] },
            { category: '🏃 Movement', items: ['Wall push-ups (10)', 'Chair stretches', 'Walk to water fountain', 'Tense and release muscles', 'Desk yoga pose'] },
        ];

        const groundingSteps = [
            { count: 5, sense: '👀 SEE', prompt: 'Name 5 things you can see right now' },
            { count: 4, sense: '🤲 TOUCH', prompt: 'Name 4 things you can touch right now' },
            { count: 3, sense: '👂 HEAR', prompt: 'Name 3 things you can hear right now' },
            { count: 2, sense: '👃 SMELL', prompt: 'Name 2 things you can smell right now' },
            { count: 1, sense: '👅 TASTE', prompt: 'Name 1 thing you can taste right now' },
        ];

        const toolColors = { blue: 'bg-blue-50 border-blue-200', green: 'bg-green-50 border-green-200', purple: 'bg-purple-50 border-purple-200', teal: 'bg-teal-50 border-teal-200' };

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🧘'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'De-escalation Toolkit'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Real-time calming tools for in-the-moment support')
            ),
            // Tool selector or active tool
            !activeTool && h('div', { className: 'grid grid-cols-2 gap-3' },
                tools.map(t => h('button', {
                    key: t.id,
                    onClick: () => setActiveTool(t.id),
                    className: `text-left p-4 rounded-xl border-2 ${toolColors[t.color]} shadow-sm hover:shadow-md transition-all`
                },
                    h('div', { className: 'text-2xl mb-1' }, t.icon),
                    h('h3', { className: 'text-xs font-black text-slate-800' }, t.title),
                    h('p', { className: 'text-[9px] text-slate-500 mt-0.5' }, t.desc)
                ))
            ),
            activeTool && h('button', {
                onClick: () => { setActiveTool(null); setBreathPhase('ready'); setBreathCycle(0); setTimerRunning(false); setTimerRemaining(timerSeconds); setGroundingStep(0); },
                className: 'text-xs text-slate-500 hover:text-slate-700 font-bold'
            }, '← Back to all tools'),

            // Breathing Exercise
            activeTool === 'breathe' && h('div', { className: 'bg-blue-50 rounded-2xl border-2 border-blue-200 p-8 text-center' },
                h('div', { className: 'mb-6' },
                    h('div', {
                        className: `mx-auto rounded-full bg-gradient-to-br from-blue-300 to-cyan-400 flex items-center justify-center transition-all duration-[4000ms] ease-in-out shadow-lg`,
                        style: {
                            width: breathPhase === 'inhale' || breathPhase === 'hold' ? '160px' : breathPhase === 'exhale' ? '80px' : '100px',
                            height: breathPhase === 'inhale' || breathPhase === 'hold' ? '160px' : breathPhase === 'exhale' ? '80px' : '100px',
                        }
                    },
                        h('span', { className: 'text-white text-2xl font-black' },
                            breathPhase === 'ready' ? '🌊' : breathPhase === 'inhale' ? 'In' : breathPhase === 'hold' ? 'Hold' : 'Out'
                        )
                    )
                ),
                h('p', { className: 'text-sm font-black text-blue-800 mb-1' },
                    breathPhase === 'ready' ? 'Ready to begin' : breathPhase === 'inhale' ? 'Breathe in slowly... (4s)' : breathPhase === 'hold' ? 'Hold gently... (4s)' : 'Release slowly... (6s)'
                ),
                h('p', { className: 'text-xs text-blue-600 mb-4' }, breathCycle > 0 ? `Cycle ${breathCycle + 1}` : 'Deep breathing calms the nervous system'),
                breathPhase === 'ready'
                    ? h('button', {
                        onClick: () => setBreathPhase('inhale'),
                        className: 'px-6 py-3 bg-blue-500 text-white rounded-xl font-bold shadow-lg hover:bg-blue-600 transition-all'
                    }, '🌊 Start Breathing')
                    : h('button', {
                        onClick: () => { setBreathPhase('ready'); setBreathCycle(0); },
                        className: 'px-4 py-2 bg-white text-blue-600 rounded-lg text-xs font-bold border border-blue-200'
                    }, '⏹ Stop')
            ),

            // Visual Timer
            activeTool === 'timer' && h('div', { className: 'bg-green-50 rounded-2xl border-2 border-green-200 p-8 text-center' },
                h('div', { className: 'mb-6' },
                    h('div', { className: 'mx-auto w-40 h-40 rounded-full border-8 border-green-200 flex items-center justify-center relative', style: { background: `conic-gradient(#22c55e ${(timerRemaining / timerSeconds) * 360}deg, #f0fdf4 0deg)` } },
                        h('div', { className: 'w-32 h-32 rounded-full bg-white flex items-center justify-center' },
                            h('span', { className: `text-3xl font-black ${timerRemaining <= 10 ? 'text-red-500' : 'text-green-700'}` },
                                `${Math.floor(timerRemaining / 60)}:${String(timerRemaining % 60).padStart(2, '0')}`
                            )
                        )
                    )
                ),
                !timerRunning && timerRemaining === timerSeconds && h('div', { className: 'flex justify-center gap-2 mb-4' },
                    [30, 60, 120, 300].map(sec =>
                        h('button', {
                            key: sec,
                            onClick: () => { setTimerSeconds(sec); setTimerRemaining(sec); },
                            className: `px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${timerSeconds === sec ? 'bg-green-500 text-white border-green-500' : 'bg-white text-green-600 border-green-200'}`
                        }, sec < 60 ? `${sec}s` : `${sec / 60}m`)
                    )
                ),
                h('div', { className: 'flex justify-center gap-3' },
                    !timerRunning
                        ? h('button', {
                            onClick: () => { if (timerRemaining <= 0) setTimerRemaining(timerSeconds); setTimerRunning(true); },
                            className: 'px-6 py-3 bg-green-500 text-white rounded-xl font-bold shadow-lg hover:bg-green-600'
                        }, timerRemaining <= 0 ? '🔄 Restart' : '▶️ Start')
                        : h('button', {
                            onClick: () => setTimerRunning(false),
                            className: 'px-6 py-3 bg-amber-500 text-white rounded-xl font-bold shadow-lg hover:bg-amber-600'
                        }, '⏸ Pause'),
                    h('button', {
                        onClick: () => { setTimerRunning(false); setTimerRemaining(timerSeconds); },
                        className: 'px-4 py-3 bg-white text-green-600 rounded-xl font-bold border border-green-200'
                    }, '⏹ Reset')
                ),
                timerRemaining <= 0 && h('div', { className: 'mt-4 p-3 bg-green-100 rounded-xl border border-green-200' },
                    h('p', { className: 'text-sm font-black text-green-700' }, '✅ Time\'s up! Great job taking a break.')
                )
            ),

            // Sensory Break Menu
            activeTool === 'sensory' && h('div', { className: 'space-y-3' },
                sensoryStrategies.map(cat =>
                    h('div', { key: cat.category, className: 'bg-white rounded-xl border border-purple-200 p-4 shadow-sm' },
                        h('h4', { className: 'text-xs font-black text-purple-800 mb-2' }, cat.category),
                        h('div', { className: 'flex flex-wrap gap-1.5' },
                            cat.items.map((item, i) =>
                                h('span', { key: i, className: 'px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-[10px] font-bold border border-purple-100' }, item)
                            )
                        )
                    )
                )
            ),

            // 5-4-3-2-1 Grounding
            activeTool === 'grounding' && h('div', { className: 'bg-teal-50 rounded-2xl border-2 border-teal-200 p-6' },
                h('div', { className: 'space-y-3' },
                    groundingSteps.map((step, i) =>
                        h('div', {
                            key: i,
                            onClick: () => setGroundingStep(i),
                            className: `p-4 rounded-xl border-2 transition-all cursor-pointer ${groundingStep === i ? 'bg-teal-100 border-teal-400 shadow-md scale-[1.02]' : i < groundingStep ? 'bg-teal-50 border-teal-200 opacity-60' : 'bg-white border-teal-100'}`
                        },
                            h('div', { className: 'flex items-center gap-3' },
                                h('div', { className: `w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${groundingStep === i ? 'bg-teal-500 text-white' : 'bg-teal-100 text-teal-600'}` }, step.count),
                                h('div', null,
                                    h('span', { className: 'text-xs font-black text-teal-800' }, step.sense),
                                    h('p', { className: 'text-[10px] text-teal-600 mt-0.5' }, step.prompt)
                                ),
                                i < groundingStep && h('span', { className: 'ml-auto text-green-500' }, '✅')
                            )
                        )
                    )
                ),
                groundingStep >= 4 && h('div', { className: 'mt-4 text-center p-4 bg-teal-100 rounded-xl' },
                    h('p', { className: 'text-sm font-black text-teal-800' }, '🌿 You are grounded. You are safe. You are here.'),
                    h('button', {
                        onClick: () => setGroundingStep(0),
                        className: 'mt-2 px-4 py-1.5 bg-teal-500 text-white rounded-lg text-xs font-bold'
                    }, '🔄 Start Over')
                )
            )
        );
    };

    // ─── ReplacementBehaviorPlanner ──────────────────────────────────────
    // Map target behaviors to replacement/expected behaviors with strategies
    const ReplacementBehaviorPlanner = ({ abcEntries, t, addToast }) => {
        const [plans, setPlans] = useState([]);
        const [form, setForm] = useState({
            targetBehavior: '',
            function: 'escape',
            replacement: '',
            teachingStrategy: '',
            reinforcement: '',
        });

        const functions = [
            { id: 'escape', label: '🚪 Escape/Avoidance', desc: 'Student wants to get away from something' },
            { id: 'attention', label: '👋 Attention', desc: 'Student wants attention from adults or peers' },
            { id: 'tangible', label: '🎁 Tangible/Access', desc: 'Student wants access to an item or activity' },
            { id: 'sensory', label: '🌀 Sensory', desc: 'Behavior provides automatic sensory stimulation' },
        ];

        const handleAdd = () => {
            if (!form.targetBehavior.trim() || !form.replacement.trim()) return;
            setPlans(prev => [...prev, {
                id: Date.now(),
                ...form,
                targetBehavior: form.targetBehavior.trim(),
                replacement: form.replacement.trim(),
                teachingStrategy: form.teachingStrategy.trim(),
                reinforcement: form.reinforcement.trim(),
                progress: 'not_started',
                createdAt: new Date().toISOString(),
            }]);
            setForm({ targetBehavior: '', function: 'escape', replacement: '', teachingStrategy: '', reinforcement: '' });
            if (addToast) addToast('Replacement plan added', 'success');
        };

        const progressOptions = [
            { id: 'not_started', label: 'Not Started', color: 'bg-slate-200 text-slate-600' },
            { id: 'teaching', label: 'Teaching', color: 'bg-blue-200 text-blue-700' },
            { id: 'prompting', label: 'Needs Prompts', color: 'bg-amber-200 text-amber-700' },
            { id: 'emerging', label: 'Emerging', color: 'bg-green-200 text-green-700' },
            { id: 'mastered', label: 'Mastered', color: 'bg-green-500 text-white' },
        ];

        // Auto-suggest from ABC data
        const topBehaviors = useMemo(() => {
            const counts = {};
            abcEntries.forEach(e => {
                const b = (e.behavior || '').trim();
                if (b) counts[b] = (counts[b] || 0) + 1;
            });
            return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
        }, [abcEntries]);

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🔄'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Replacement Behavior Planner'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Map target behaviors to functionally equivalent replacements')
            ),
            // Auto-suggest from data
            topBehaviors.length > 0 && !form.targetBehavior && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('h3', { className: 'text-xs font-bold text-slate-600 mb-2' }, '📊 From Your ABC Data:'),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                    topBehaviors.map(([b, count]) =>
                        h('button', {
                            key: b,
                            onClick: () => setForm(prev => ({ ...prev, targetBehavior: b })),
                            className: 'px-2.5 py-1 bg-slate-50 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-100 hover:bg-slate-100'
                        }, `${b} (${count}×)`)
                    )
                )
            ),
            // Plan form
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-xs font-bold text-slate-600 mb-3' }, '➕ Create Replacement Plan'),
                h('input', {
                    value: form.targetBehavior,
                    onChange: e => setForm(prev => ({ ...prev, targetBehavior: e.target.value })),
                    placeholder: '🎯 Target behavior (what you want to reduce)',
                    className: 'w-full px-3 py-2 border border-red-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-red-300 mb-2 bg-red-50'
                }),
                h('div', { className: 'flex flex-wrap gap-1.5 mb-2' },
                    functions.map(f => h('button', {
                        key: f.id,
                        onClick: () => setForm(prev => ({ ...prev, function: f.id })),
                        className: `px-2.5 py-1 rounded-full text-[9px] font-bold border transition-all ${form.function === f.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-400'}`
                    }, f.label))
                ),
                h('input', {
                    value: form.replacement,
                    onChange: e => setForm(prev => ({ ...prev, replacement: e.target.value })),
                    placeholder: '✅ Replacement behavior (functionally equivalent)',
                    className: 'w-full px-3 py-2 border border-green-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-green-300 mb-2 bg-green-50'
                }),
                h('input', {
                    value: form.teachingStrategy,
                    onChange: e => setForm(prev => ({ ...prev, teachingStrategy: e.target.value })),
                    placeholder: '📚 Teaching strategy (how you\'ll teach the replacement)',
                    className: 'w-full px-3 py-2 border border-blue-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-300 mb-2 bg-blue-50'
                }),
                h('input', {
                    value: form.reinforcement,
                    onChange: e => setForm(prev => ({ ...prev, reinforcement: e.target.value })),
                    placeholder: '⭐ Reinforcement (how you\'ll reward the replacement)',
                    className: 'w-full px-3 py-2 border border-amber-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-300 mb-2 bg-amber-50'
                }),
                h('button', {
                    onClick: handleAdd,
                    disabled: !form.targetBehavior.trim() || !form.replacement.trim(),
                    className: 'w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-bold shadow hover:shadow-md disabled:opacity-40 transition-all'
                }, '✅ Add Replacement Plan')
            ),
            // Plans list
            plans.length === 0
                ? h('div', { className: 'text-center py-8 bg-white rounded-xl border border-slate-200' },
                    h('div', { className: 'text-3xl mb-2' }, '🔄'),
                    h('p', { className: 'text-sm text-slate-500' }, 'Create your first replacement behavior plan.')
                )
                : h('div', { className: 'space-y-3' },
                    plans.map(plan => {
                        const fn = functions.find(f => f.id === plan.function) || functions[0];
                        const prog = progressOptions.find(p => p.id === plan.progress) || progressOptions[0];
                        return h('div', { key: plan.id, className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                            h('div', { className: 'flex items-center justify-between mb-3' },
                                h('span', { className: 'text-[9px] font-bold px-2 py-0.5 bg-slate-100 rounded-full text-slate-500' }, fn.label),
                                h('button', {
                                    onClick: () => setPlans(prev => prev.filter(p => p.id !== plan.id)),
                                    className: 'text-[10px] text-slate-300 hover:text-red-400'
                                }, '✕')
                            ),
                            h('div', { className: 'flex items-center gap-2 mb-2' },
                                h('div', { className: 'flex-1 p-2.5 bg-red-50 rounded-lg border border-red-200' },
                                    h('p', { className: 'text-[9px] text-red-500 font-bold' }, '❌ TARGET'),
                                    h('p', { className: 'text-xs text-red-700 font-bold' }, plan.targetBehavior)
                                ),
                                h('span', { className: 'text-lg' }, '→'),
                                h('div', { className: 'flex-1 p-2.5 bg-green-50 rounded-lg border border-green-200' },
                                    h('p', { className: 'text-[9px] text-green-500 font-bold' }, '✅ REPLACEMENT'),
                                    h('p', { className: 'text-xs text-green-700 font-bold' }, plan.replacement)
                                )
                            ),
                            plan.teachingStrategy && h('p', { className: 'text-[10px] text-blue-600 mb-1' }, `📚 ${plan.teachingStrategy}`),
                            plan.reinforcement && h('p', { className: 'text-[10px] text-amber-600 mb-2' }, `⭐ ${plan.reinforcement}`),
                            h('div', { className: 'flex gap-1' },
                                progressOptions.map(po =>
                                    h('button', {
                                        key: po.id,
                                        onClick: () => setPlans(prev => prev.map(p => p.id === plan.id ? { ...p, progress: po.id } : p)),
                                        className: `px-2 py-0.5 rounded-full text-[8px] font-bold transition-all ${plan.progress === po.id ? po.color : 'bg-white text-slate-300 border border-slate-100'}`
                                    }, po.label)
                                )
                            )
                        );
                    })
                )
        );
    };

    // ─── ReinforcementInventory ──────────────────────────────────────────
    // Structured survey to identify what motivates each student
    const ReinforcementInventory = ({ studentName, t, addToast }) => {
        const [responses, setResponses] = useState({});
        const [customItems, setCustomItems] = useState([]);
        const [newCustom, setNewCustom] = useState('');

        const categories = [
            {
                id: 'social', icon: '👋', label: 'Social', color: 'blue',
                items: ['Verbal praise', 'High five/fist bump', 'Positive note home', 'Lunch with teacher', 'Helper role', 'Peer recognition', 'Choice of seating buddy']
            },
            {
                id: 'activity', icon: '🎮', label: 'Activity', color: 'green',
                items: ['Extra recess', 'Free drawing time', 'Computer/tablet time', 'Choose class activity', 'Read aloud to class', 'Lead a game', 'Show and tell']
            },
            {
                id: 'tangible', icon: '🎁', label: 'Tangible', color: 'purple',
                items: ['Stickers', 'Treasure box pick', 'Special pencil/eraser', 'Bookmarks', 'Class currency/points', 'Certificate/award', 'Choose a book']
            },
            {
                id: 'sensory', icon: '🌀', label: 'Sensory', color: 'teal',
                items: ['Fidget tools', 'Standing desk time', 'Noise-canceling headphones', 'Weighted lap pad', 'Movement break', 'Music during work', 'Dim lighting option']
            },
            {
                id: 'escape', icon: '🚪', label: 'Breaks/Escape', color: 'amber',
                items: ['Break pass', 'Quiet corner time', 'Walk in hallway', 'Skip one problem', 'Reduced assignment', 'Cool-down space', 'End task early']
            },
            {
                id: 'academic', icon: '📚', label: 'Academic', color: 'indigo',
                items: ['Choose topic to study', 'Teach a mini-lesson', 'Use whiteboards', 'Partner work', 'Presentation to class', 'Research project choice', 'Read favorite genre']
            }
        ];

        const ratings = [
            { value: 3, label: '😍 Love', color: 'bg-green-500 text-white' },
            { value: 2, label: '😊 Like', color: 'bg-green-200 text-green-700' },
            { value: 1, label: '😐 Okay', color: 'bg-amber-200 text-amber-700' },
            { value: 0, label: '😒 No', color: 'bg-red-200 text-red-700' },
        ];

        const catColors = { blue: 'border-blue-200', green: 'border-green-200', purple: 'border-purple-200', teal: 'border-teal-200', amber: 'border-amber-200', indigo: 'border-indigo-200' };

        const handleRate = (itemKey, value) => {
            setResponses(prev => ({ ...prev, [itemKey]: value }));
        };

        // Top preferences
        const topPrefs = useMemo(() => {
            return Object.entries(responses)
                .filter(([, v]) => v >= 2)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([key, val]) => ({ item: key, rating: val }));
        }, [responses]);

        const totalRated = Object.keys(responses).length;
        const totalItems = categories.reduce((sum, c) => sum + c.items.length, 0) + customItems.length;

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '⭐'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Reinforcement Inventory'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, `Identifying what motivates ${studentName || 'your student'}`)
            ),
            // Progress
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('div', { className: 'flex items-center justify-between mb-2' },
                    h('span', { className: 'text-xs font-bold text-slate-600' }, `${totalRated}/${totalItems} items rated`),
                    topPrefs.length > 0 && h('span', { className: 'text-xs font-bold text-green-600' }, `${topPrefs.length} favorites found`)
                ),
                h('div', { className: 'w-full bg-slate-100 rounded-full h-2' },
                    h('div', { className: 'bg-gradient-to-r from-amber-400 to-green-500 h-2 rounded-full transition-all duration-500', style: { width: `${(totalRated / totalItems) * 100}%` } })
                )
            ),
            // Top preferences summary
            topPrefs.length > 0 && h('div', { className: 'bg-green-50 rounded-xl border border-green-200 p-4' },
                h('h3', { className: 'text-xs font-black text-green-800 mb-2' }, '🏆 Top Preferences'),
                h('div', { className: 'flex flex-wrap gap-1.5' },
                    topPrefs.map(p =>
                        h('span', { key: p.item, className: `px-2.5 py-1 rounded-lg text-[10px] font-bold ${p.rating === 3 ? 'bg-green-500 text-white' : 'bg-green-200 text-green-700'}` }, `${p.rating === 3 ? '😍' : '😊'} ${p.item}`)
                    )
                )
            ),
            // Categories
            categories.map(cat =>
                h('div', { key: cat.id, className: `bg-white rounded-xl border ${catColors[cat.color]} p-4 shadow-sm` },
                    h('h4', { className: 'text-xs font-black text-slate-700 mb-3' }, `${cat.icon} ${cat.label}`),
                    h('div', { className: 'space-y-2' },
                        cat.items.map(item =>
                            h('div', { key: item, className: 'flex items-center justify-between' },
                                h('span', { className: 'text-[10px] text-slate-600 font-bold flex-1' }, item),
                                h('div', { className: 'flex gap-1' },
                                    ratings.map(r =>
                                        h('button', {
                                            key: r.value,
                                            onClick: () => handleRate(item, r.value),
                                            className: `w-7 h-7 rounded-full text-[10px] transition-all ${responses[item] === r.value ? r.color : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`
                                        }, r.value === 3 ? '😍' : r.value === 2 ? '😊' : r.value === 1 ? '😐' : '😒')
                                    )
                                )
                            )
                        )
                    )
                )
            ),
            // Custom items
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('h4', { className: 'text-xs font-black text-slate-700 mb-2' }, '✏️ Custom Reinforcers'),
                h('div', { className: 'flex gap-2 mb-2' },
                    h('input', {
                        value: newCustom,
                        onChange: e => setNewCustom(e.target.value),
                        onKeyDown: e => { if (e.key === 'Enter' && newCustom.trim()) { setCustomItems(prev => [...prev, newCustom.trim()]); setNewCustom(''); } },
                        placeholder: 'Add a custom reinforcer',
                        className: 'flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-300'
                    }),
                    h('button', {
                        onClick: () => { if (newCustom.trim()) { setCustomItems(prev => [...prev, newCustom.trim()]); setNewCustom(''); } },
                        className: 'px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold'
                    }, '+')
                ),
                customItems.length > 0 && h('div', { className: 'space-y-2' },
                    customItems.map((item, i) =>
                        h('div', { key: i, className: 'flex items-center justify-between' },
                            h('span', { className: 'text-[10px] text-slate-600 font-bold flex-1' }, item),
                            h('div', { className: 'flex gap-1' },
                                ratings.map(r =>
                                    h('button', {
                                        key: r.value,
                                        onClick: () => handleRate(item, r.value),
                                        className: `w-7 h-7 rounded-full text-[10px] transition-all ${responses[item] === r.value ? r.color : 'bg-slate-50 text-slate-300 hover:bg-slate-100'}`
                                    }, r.value === 3 ? '😍' : r.value === 2 ? '😊' : r.value === 1 ? '😐' : '😒')
                                )
                            )
                        )
                    )
                )
            )
        );
    };

    // ─── AntecedentModPlanner ───────────────────────────────────────────
    // AI-powered environmental modification recommendations
    const AntecedentModPlanner = ({ abcEntries, callGemini, t, addToast }) => {
        const [aiSuggestions, setAiSuggestions] = useState('');
        const [analyzing, setAnalyzing] = useState(false);
        const [mods, setMods] = useState([]);
        const [newMod, setNewMod] = useState({ setting: '', change: '', rationale: '' });

        // Local antecedent analysis
        const antecedentPatterns = useMemo(() => {
            if (abcEntries.length < 3) return [];
            const patterns = {};
            abcEntries.forEach(e => {
                const a = (e.antecedent || '').trim();
                if (a) patterns[a] = (patterns[a] || 0) + 1;
            });
            return Object.entries(patterns).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([text, count]) => ({ text, count, pct: Math.round(count / abcEntries.length * 100) }));
        }, [abcEntries]);

        // Local setting analysis
        const settingPatterns = useMemo(() => {
            if (abcEntries.length < 3) return [];
            const patterns = {};
            abcEntries.forEach(e => {
                const s = (e.setting || '').trim();
                if (s) patterns[s] = (patterns[s] || 0) + 1;
            });
            return Object.entries(patterns).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([text, count]) => ({ text, count, pct: Math.round(count / abcEntries.length * 100) }));
        }, [abcEntries]);

        const handleAIAnalysis = async () => {
            if (!callGemini || abcEntries.length < 3) return;
            setAnalyzing(true);
            try {
                const prompt = `You are a Board Certified Behavior Analyst specializing in antecedent-based interventions.
${RESTORATIVE_PREAMBLE}

Analyze these ABC entries and recommend specific environmental modifications to PREVENT behaviors before they occur.

ABC Data (${abcEntries.length} entries):
${abcEntries.slice(-15).map((e, i) => `${i + 1}. A: "${e.antecedent}" → B: "${e.behavior}" → C: "${e.consequence}" | Setting: "${e.setting || 'N/A'}"`).join('\n')}

For each recommendation, provide:

🏫 ENVIRONMENTAL MODIFICATIONS (changes to the physical space)
- What to change and why
- How it addresses the antecedent pattern

📋 SCHEDULE/ROUTINE MODIFICATIONS
- Timing changes, transition supports, predictability enhancements

👥 SOCIAL MODIFICATIONS  
- Seating arrangements, grouping changes, adult proximity

📚 CURRICULAR MODIFICATIONS
- Task difficulty, choice-making, engagement strategies

⚡ IMMEDIATE QUICK WINS
- 2-3 changes that can be implemented TODAY

For each suggestion, rate the effort level (Low/Medium/High) and expected impact (Low/Medium/High).`;

                const result = await callGemini(prompt, true);
                setAiSuggestions(result);
                if (addToast) addToast('Modification plan generated', 'success');
            } catch (err) {
                warnLog('Antecedent analysis failed:', err);
                if (addToast) addToast('Analysis failed', 'error');
            } finally { setAnalyzing(false); }
        };

        const handleAddMod = () => {
            if (!newMod.change.trim()) return;
            setMods(prev => [...prev, {
                id: Date.now(),
                ...newMod,
                setting: newMod.setting.trim() || 'General',
                change: newMod.change.trim(),
                rationale: newMod.rationale.trim(),
                status: 'planned',
                createdAt: new Date().toISOString(),
            }]);
            setNewMod({ setting: '', change: '', rationale: '' });
            if (addToast) addToast('Modification tracked', 'success');
        };

        const statusOptions = [
            { id: 'planned', label: '📋 Planned', color: 'bg-slate-200 text-slate-600' },
            { id: 'implementing', label: '🔧 In Progress', color: 'bg-blue-200 text-blue-700' },
            { id: 'monitoring', label: '👀 Monitoring', color: 'bg-amber-200 text-amber-700' },
            { id: 'effective', label: '✅ Effective', color: 'bg-green-500 text-white' },
            { id: 'ineffective', label: '❌ Ineffective', color: 'bg-red-200 text-red-700' },
        ];

        return h('div', { className: 'max-w-2xl mx-auto space-y-4' },
            h('div', { className: 'text-center py-3' },
                h('div', { className: 'text-4xl mb-2' }, '🛠️'),
                h('h2', { className: 'text-lg font-black text-slate-800' }, 'Antecedent Modification Planner'),
                h('p', { className: 'text-xs text-slate-500 mt-1' }, 'Modify the environment to prevent behaviors before they start')
            ),
            // Antecedent patterns
            antecedentPatterns.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-sm font-black text-slate-800 mb-3' }, '⚡ Top Antecedent Triggers'),
                h('div', { className: 'space-y-2' },
                    antecedentPatterns.map((p, i) =>
                        h('div', { key: i, className: 'flex items-center gap-2' },
                            h('div', { className: 'flex-1' },
                                h('div', { className: 'flex items-center justify-between mb-1' },
                                    h('span', { className: 'text-[10px] font-bold text-slate-700' }, p.text),
                                    h('span', { className: 'text-[9px] text-slate-400' }, `${p.count}× (${p.pct}%)`)
                                ),
                                h('div', { className: 'w-full bg-slate-100 rounded-full h-1.5' },
                                    h('div', { className: 'bg-gradient-to-r from-amber-400 to-red-500 h-1.5 rounded-full', style: { width: `${p.pct}%` } })
                                )
                            )
                        )
                    )
                )
            ),
            // Setting patterns
            settingPatterns.length > 0 && h('div', { className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                h('h3', { className: 'text-xs font-black text-slate-700 mb-2' }, '📍 Settings Where Behaviors Occur Most'),
                h('div', { className: 'flex flex-wrap gap-2' },
                    settingPatterns.map((s, i) =>
                        h('span', { key: i, className: 'px-3 py-1.5 bg-amber-50 text-amber-700 rounded-lg text-[10px] font-bold border border-amber-200' }, `${s.text} (${s.pct}%)`)
                    )
                )
            ),
            // AI analysis button
            callGemini && abcEntries.length >= 3 && h('button', {
                onClick: handleAIAnalysis,
                disabled: analyzing,
                className: 'w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow-lg hover:shadow-xl disabled:opacity-40 transition-all'
            }, analyzing ? '⏳ Analyzing antecedents...' : '🛠️ Generate AI Modification Plan'),
            // AI suggestions
            aiSuggestions && h('div', { className: 'bg-white rounded-xl border border-amber-200 p-5 shadow-sm' },
                h('div', { className: 'text-xs text-slate-700 whitespace-pre-wrap leading-relaxed' }, aiSuggestions),
                h('button', {
                    onClick: () => { navigator.clipboard.writeText(aiSuggestions); if (addToast) addToast('Copied!', 'success'); },
                    className: 'mt-3 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold hover:bg-amber-200'
                }, '📋 Copy Plan')
            ),
            // Manual mod tracker
            h('div', { className: 'bg-white rounded-xl border border-slate-200 p-5 shadow-sm' },
                h('h3', { className: 'text-xs font-bold text-slate-600 mb-3' }, '📋 Track Modifications'),
                h('input', {
                    value: newMod.setting,
                    onChange: e => setNewMod(prev => ({ ...prev, setting: e.target.value })),
                    placeholder: 'Setting (e.g., Math class, Cafeteria)',
                    className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-300 mb-2'
                }),
                h('textarea', {
                    value: newMod.change,
                    onChange: e => setNewMod(prev => ({ ...prev, change: e.target.value })),
                    placeholder: 'What environmental change will you make?',
                    rows: 2,
                    className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none outline-none focus:ring-2 focus:ring-amber-300 mb-2'
                }),
                h('input', {
                    value: newMod.rationale,
                    onChange: e => setNewMod(prev => ({ ...prev, rationale: e.target.value })),
                    placeholder: 'Rationale (which antecedent does this address?)',
                    className: 'w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-amber-300 mb-2'
                }),
                h('button', {
                    onClick: handleAddMod,
                    disabled: !newMod.change.trim(),
                    className: 'w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-bold shadow hover:shadow-md disabled:opacity-40 transition-all'
                }, '📋 Track This Modification')
            ),
            // Tracked modifications
            mods.length > 0 && h('div', { className: 'space-y-3' },
                mods.map(mod => {
                    const status = statusOptions.find(s => s.id === mod.status) || statusOptions[0];
                    return h('div', { key: mod.id, className: 'bg-white rounded-xl border border-slate-200 p-4 shadow-sm' },
                        h('div', { className: 'flex items-center justify-between mb-2' },
                            h('span', { className: 'text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full' }, `📍 ${mod.setting}`),
                            h('button', {
                                onClick: () => setMods(prev => prev.filter(m => m.id !== mod.id)),
                                className: 'text-[10px] text-slate-300 hover:text-red-400'
                            }, '✕')
                        ),
                        h('p', { className: 'text-xs font-bold text-slate-700 mb-1' }, mod.change),
                        mod.rationale && h('p', { className: 'text-[10px] text-slate-500 italic mb-2' }, `💡 ${mod.rationale}`),
                        h('div', { className: 'flex gap-1' },
                            statusOptions.map(so =>
                                h('button', {
                                    key: so.id,
                                    onClick: () => setMods(prev => prev.map(m => m.id === mod.id ? { ...m, status: so.id } : m)),
                                    className: `px-2 py-0.5 rounded-full text-[8px] font-bold transition-all ${mod.status === so.id ? so.color : 'bg-white text-slate-300 border border-slate-100'}`
                                }, so.label)
                            )
                        )
                    );
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
        const [showFreqCounter, setShowFreqCounter] = useState(false);
        const [showIntervalGrid, setShowIntervalGrid] = useState(false);
        const [showChoiceBoard, setShowChoiceBoard] = useState(false);
        const [isParentMode, setIsParentMode] = useState(!isTeacherMode && false);
        const [fullSummary, setFullSummary] = useState('');
        const [summaryLoading, setSummaryLoading] = useState(false);
        const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
        const [isPracticeMode, setIsPracticeMode] = useState(false);
        const [practiceScenarioName, setPracticeScenarioName] = useState('');

        // Practice sandbox data loader
        const handleLoadScenario = (scenarioData) => {
            setAbcEntries(scenarioData.entries || []);
            setObservationSessions(scenarioData.observations || []);
            setAiAnalysis(null);
            setIsPracticeMode(true);
            setPracticeScenarioName(scenarioData.name || 'Practice Scenario');
            setActivePanel('hub');
        };
        const handleClearPractice = () => {
            setAbcEntries([]);
            setObservationSessions([]);
            setAiAnalysis(null);
            setIsPracticeMode(false);
            setPracticeScenarioName('');
            if (addToast) addToast('Practice data cleared', 'info');
        };

        // ── Smart Alerts computation ──
        const smartAlerts = useMemo(() => {
            const alerts = [];
            if (abcEntries.length >= 3) {
                // Intensity trend: 3+ consecutive entries with increasing intensity
                const recent = abcEntries.slice(0, 5);
                let increasing = 0;
                for (let i = 0; i < recent.length - 1; i++) {
                    if ((recent[i].intensity || 0) > (recent[i + 1].intensity || 0)) increasing++;
                }
                if (increasing >= 3) {
                    alerts.push({ id: 'intensity_up', type: 'warning', icon: '⚠️', msg: `Behavior intensity has increased across ${increasing} recent entries. Review escalation patterns.` });
                }
                // Positive trend: decreasing intensity
                let decreasing = 0;
                for (let i = 0; i < recent.length - 1; i++) {
                    if ((recent[i].intensity || 0) < (recent[i + 1].intensity || 0)) decreasing++;
                }
                if (decreasing >= 3) {
                    alerts.push({ id: 'intensity_down', type: 'positive', icon: '🎉', msg: `Great news! Behavior intensity has decreased across ${decreasing} recent entries.` });
                }
            }
            // Frequency spike: more entries in last 3 days than the per-3-day average
            if (abcEntries.length >= 5) {
                const now = Date.now();
                const threeDays = 3 * 24 * 60 * 60 * 1000;
                const recentCount = abcEntries.filter(e => (now - new Date(e.timestamp).getTime()) < threeDays).length;
                const totalDays = Math.max(1, (now - new Date(abcEntries[abcEntries.length - 1].timestamp).getTime()) / (24 * 60 * 60 * 1000));
                const avgPer3Days = (abcEntries.length / totalDays) * 3;
                if (recentCount > avgPer3Days * 1.5 && recentCount >= 3) {
                    alerts.push({ id: 'freq_spike', type: 'warning', icon: '📈', msg: `Frequency spike: ${recentCount} entries in the last 3 days (avg is ${Math.round(avgPer3Days)}).` });
                }
            }
            // No data warning
            if (abcEntries.length > 0) {
                const latest = new Date(abcEntries[0].timestamp);
                const daysSince = (Date.now() - latest.getTime()) / (24 * 60 * 60 * 1000);
                if (daysSince >= 7) {
                    alerts.push({ id: 'stale', type: 'info', icon: '📭', msg: `No new entries in ${Math.round(daysSince)} days. Consider collecting more data.` });
                }
            }
            return alerts.filter(a => !dismissedAlerts.has(a.id));
        }, [abcEntries, dismissedAlerts]);

        // ── Full Student Summary ──
        const handleFullSummary = async () => {
            if (!callGemini) return;
            if (fullSummary) { setFullSummary(''); return; }
            setSummaryLoading(true);
            try {
                const abcStr = abcEntries.slice(-10).map(e =>
                    `${new Date(e.timestamp).toLocaleDateString()}: B=${e.behavior}, A=${e.antecedent}, C=${e.consequence}, I=${e.intensity}/5`
                ).join('\n');
                const obsStr = (observationSessions || []).slice(-5).map(s =>
                    `Method: ${s.method}, Duration: ${s.timer}s, Frequency: ${s.frequency}`
                ).join('\n');
                const prompt = `You are a special education specialist writing a comprehensive student behavioral profile.
${RESTORATIVE_PREAMBLE}

Student codename: ${selectedStudent || 'Student'}
ABC entries (${abcEntries.length} total, showing up to 10):
${abcStr || 'None'}

Observation sessions (${observationSessions?.length || 0} total):
${obsStr || 'None'}

AI Analysis: ${aiAnalysis?.summary || 'Not yet analyzed'}
Hypothesized Function: ${aiAnalysis?.hypothesizedFunction || 'Not determined'}

Write a unified student behavioral profile that synthesizes all available data. Include:
1. BEHAVIORAL OVERVIEW — Summary of observed behavioral patterns
2. PATTERNS & TRIGGERS — Common antecedents and settings
3. FUNCTIONAL ANALYSIS — What the data suggests about behavioral function
4. STRENGTHS & PROTECTIVE FACTORS — Positive observations
5. RECOMMENDATIONS — Evidence-based next steps

Use professional language. Refer to "the student" (not the codename).`;
                const result = await callGemini(prompt, true);
                setFullSummary(result);
                if (addToast) addToast('Student summary generated ✨', 'success');
            } catch (err) {
                warnLog('Full summary failed:', err);
                if (addToast) addToast('Summary generation failed', 'error');
            } finally { setSummaryLoading(false); }
        };

        // Parent-friendly tool IDs (shown when isParentMode is true)
        const parentTools = ['overview', 'token', 'traffic', 'choice', 'homelog', 'abaguide', 'homenote', 'pocket', 'snapshot', 'selfcheck'];

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
                {
                    id: 'selfcheck',
                    icon: '🪞',
                    title: t('behavior_lens.hub.selfcheck_title') || 'Student Self-Check',
                    desc: t('behavior_lens.hub.selfcheck_desc') || 'Student-facing mood check-in and reflection journal — capturing their voice',
                    color: 'violet',
                },
                {
                    id: 'intervention',
                    icon: '📋',
                    title: t('behavior_lens.hub.intervention_title') || 'Intervention Plan',
                    desc: t('behavior_lens.hub.intervention_desc') || 'AI-generated multi-week intervention plan with measurable goals and milestones',
                    color: 'purple',
                },
                {
                    id: 'progress',
                    icon: '📈',
                    title: t('behavior_lens.hub.progress_title') || 'Progress Narrative',
                    desc: t('behavior_lens.hub.progress_desc') || 'IEP-ready progress monitoring paragraphs from accumulated behavioral data',
                    color: 'emerald',
                },
                {
                    id: 'sandbox',
                    icon: '🎓',
                    title: 'Practice Sandbox',
                    desc: 'Load simulated student data for PD, pre-service training, or learning ABA without real students',
                    color: 'amber',
                    badge: isPracticeMode ? '🔶 ACTIVE' : null,
                },
                {
                    id: 'glossary',
                    icon: '📖',
                    title: 'ABA Concept Glossary',
                    desc: '25+ searchable ABA terms with plain-language definitions and real-world examples',
                    color: 'sky',
                },
                {
                    id: 'fbaworkflow',
                    icon: '🗺️',
                    title: 'FBA Workflow Guide',
                    desc: '6-step guided workflow for conducting a Functional Behavior Assessment from start to finish',
                    color: 'lime',
                },
                {
                    id: 'qualitycheck',
                    icon: '✅',
                    title: 'Data Quality Check',
                    desc: 'AI-powered review of your ABC entries with specific improvement suggestions',
                    color: 'green',
                },
                {
                    id: 'trends',
                    icon: '📊',
                    title: 'Trend Dashboard',
                    desc: 'SVG charts showing intensity trends, setting frequency, and day/time heatmap',
                    color: 'indigo',
                    badge: abcEntries.length > 0 ? `${abcEntries.length} entries` : null,
                },
                {
                    id: 'teamnotes',
                    icon: '🤝',
                    title: 'Team Notes',
                    desc: 'Multi-role timestamped collaboration thread for teachers, paras, counselors, and parents',
                    color: 'teal',
                },
                {
                    id: 'iepprep',
                    icon: '📄',
                    title: 'IEP Meeting Prep',
                    desc: 'AI-generated meeting preparation packet with data summary, talking points, and next steps',
                    color: 'blue',
                },
                {
                    id: 'predict',
                    icon: '🔮',
                    title: 'Predictive Insights',
                    desc: 'AI-powered pattern analysis predicting when, where, and what triggers behaviors — with prevention strategies',
                    color: 'fuchsia',
                },
                {
                    id: 'gamify',
                    icon: '🎮',
                    title: 'My Progress Quest',
                    desc: 'Student-facing mood tracker with streaks, badges, quests, and reflection journal',
                    color: 'orange',
                },
                {
                    id: 'cultural',
                    icon: '🌍',
                    title: 'Cultural Context Reflection',
                    desc: '8-question pause-and-reflect checklist before interpreting behavior through a cultural humility lens',
                    color: 'teal',
                },
                {
                    id: 'reframe',
                    icon: '✨',
                    title: 'Strength-Based Reframe',
                    desc: 'AI rewrites deficit-based descriptions into asset-focused, strengths-based language',
                    color: 'emerald',
                },
                {
                    id: 'biascheck',
                    icon: '🪞',
                    title: 'Bias Reflection Monitor',
                    desc: 'Gently surfaces patterns in your data for reflection on potential implicit bias — growth, not guilt',
                    color: 'cyan',
                },
                {
                    id: 'restorative',
                    icon: '💛',
                    title: 'Restorative Conversation Guide',
                    desc: 'Step-by-step scripts for harm repair, community circles, and reintegration conferences',
                    color: 'amber',
                },
                {
                    id: 'relmap',
                    icon: '🗺️',
                    title: 'Relationship Map',
                    desc: 'Visual diagram of student connections — trusted adults, peers, family, mentors — with gap analysis',
                    color: 'purple',
                },
                {
                    id: 'familyvoice',
                    icon: '👪',
                    title: 'Family Voice',
                    desc: 'Structured form for families to share observations, cultural insights, and celebrations — with AI translation',
                    color: 'indigo',
                },
                {
                    id: 'commlog',
                    icon: '📞',
                    title: 'Communication Log',
                    desc: 'Two-way family contact tracker with follow-ups — ensure no family falls through the cracks',
                    color: 'sky',
                },
                {
                    id: 'deescalate',
                    icon: '🧘',
                    title: 'De-escalation Toolkit',
                    desc: 'Breathing exercises, visual timers, sensory breaks, and grounding — real-time calming support',
                    color: 'cyan',
                },
                {
                    id: 'replacebehavior',
                    icon: '🔄',
                    title: 'Replacement Behavior Planner',
                    desc: 'Map target behaviors to functionally equivalent replacements with teaching strategies',
                    color: 'rose',
                },
                {
                    id: 'reinforcement',
                    icon: '⭐',
                    title: 'Reinforcement Inventory',
                    desc: 'Structured motivation survey — identify what drives each student across 6 categories',
                    color: 'amber',
                },
                {
                    id: 'antecedentmod',
                    icon: '🛠️',
                    title: 'Antecedent Modification Planner',
                    desc: 'AI-powered environmental change recommendations to prevent behaviors before they start',
                    color: 'orange',
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
                // Smart Alerts
                smartAlerts.length > 0 && h('div', { className: 'space-y-2' },
                    smartAlerts.map(alert => {
                        const alertColors = {
                            warning: 'bg-amber-50 border-amber-200 text-amber-800',
                            positive: 'bg-green-50 border-green-200 text-green-800',
                            info: 'bg-blue-50 border-blue-200 text-blue-800'
                        };
                        return h('div', {
                            key: alert.id,
                            className: `flex items-center justify-between px-4 py-3 rounded-xl border ${alertColors[alert.type] || alertColors.info} animate-in slide-in-from-top-2 duration-300`
                        },
                            h('div', { className: 'flex items-center gap-2' },
                                h('span', { className: 'text-lg' }, alert.icon),
                                h('span', { className: 'text-xs font-bold' }, alert.msg)
                            ),
                            h('button', {
                                onClick: () => setDismissedAlerts(prev => new Set([...prev, alert.id])),
                                className: 'text-xs opacity-50 hover:opacity-100 transition-opacity ml-3 shrink-0'
                            }, '✕')
                        );
                    })
                ),
                // Practice Mode Banner
                isPracticeMode && h('div', { className: 'flex items-center justify-between px-4 py-3 bg-amber-100 border-2 border-amber-300 rounded-xl animate-in slide-in-from-top-2 duration-300' },
                    h('div', { className: 'flex items-center gap-2' },
                        h('span', { className: 'text-lg' }, '🎓'),
                        h('div', null,
                            h('span', { className: 'text-xs font-black text-amber-800' }, `Practice Mode: ${practiceScenarioName}`),
                            h('span', { className: 'text-[10px] text-amber-600 ml-2' }, '⚠️ All data is simulated — no real students')
                        )
                    ),
                    h('button', {
                        onClick: handleClearPractice,
                        className: 'px-3 py-1.5 bg-amber-200 text-amber-800 rounded-lg text-[10px] font-bold hover:bg-amber-300 transition-all'
                    }, '🗑️ Clear Practice Data')
                ),
                // Full Student Summary card
                callGemini && selectedStudent && (abcEntries.length > 0 || observationSessions?.length > 0) &&
                h('div', { className: `rounded-xl border-2 transition-all overflow-hidden ${fullSummary ? 'border-purple-300 bg-purple-50/30' : 'border-dashed border-purple-200 bg-white hover:border-purple-300'}` },
                    h('button', {
                        onClick: handleFullSummary,
                        disabled: summaryLoading,
                        className: 'w-full flex items-center justify-between p-4 text-left'
                    },
                        h('div', { className: 'flex items-center gap-3' },
                            h('div', { className: 'w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white text-lg' }, '🧠'),
                            h('div', null,
                                h('h4', { className: 'text-sm font-black text-purple-800' }, 'Full Student Summary'),
                                h('p', { className: 'text-[10px] text-purple-500' }, 'AI-synthesized behavioral profile from all data sources')
                            )
                        ),
                        h('span', { className: 'text-purple-400 text-xs font-bold' }, summaryLoading ? '⏳ Generating...' : fullSummary ? '▴ Collapse' : '▾ Generate')
                    ),
                    fullSummary && h('div', { className: 'px-5 pb-5' },
                        h('div', { className: 'bg-white rounded-xl border border-purple-200 p-4 text-xs text-slate-700 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto' }, fullSummary),
                        h('div', { className: 'flex gap-2 mt-3' },
                            h('button', {
                                onClick: () => { navigator.clipboard.writeText(fullSummary); if (addToast) addToast('Copied!', 'success'); },
                                className: 'px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold hover:bg-purple-200'
                            }, '📋 Copy'),
                            h('button', {
                                onClick: () => window.print(),
                                className: 'px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-bold hover:bg-purple-200'
                            }, '🖨️ Print')
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
                                else if (tool.id === 'counseling') setActivePanel('counseling');
                                else if (tool.id === 'snapshot') setActivePanel('snapshot');
                                else if (tool.id === 'consent') setActivePanel('consent');
                                else if (tool.id === 'selfcheck') setActivePanel('selfcheck');
                                else if (tool.id === 'intervention') setActivePanel('intervention');
                                else if (tool.id === 'progress') setActivePanel('progress');
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
                                                                                                                                            activePanel === 'homelog' ? (t('behavior_lens.homelog.title') || 'Home Behavior Log') :
                                                                                                                                                activePanel === 'selfcheck' ? (t('behavior_lens.selfcheck.title') || 'Student Self-Check') : ''
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
                    callGemini,
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
                    callGemini,
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
                    callGemini,
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
                    callGemini,
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
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'consent' && h(ConsentManager, {
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'selfcheck' && h(StudentSelfCheck, {
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'intervention' && h(InterventionPlanGenerator, {
                    studentName: selectedStudent,
                    abcEntries,
                    observationSessions,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'progress' && h(ProgressNarrativeGenerator, {
                    studentName: selectedStudent,
                    abcEntries,
                    observationSessions,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'sandbox' && h(PracticeSandbox, {
                    onLoadScenario: handleLoadScenario,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'glossary' && h(ABAGlossary, { t }),
                activePanel === 'fbaworkflow' && h(GuidedFBAWorkflow, {
                    activePanel,
                    setActivePanel,
                    abcEntries,
                    aiAnalysis,
                    t
                }),
                activePanel === 'qualitycheck' && h(DataQualityChecker, {
                    abcEntries,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'trends' && h(BehaviorTrendDashboard, {
                    abcEntries,
                    observationSessions,
                    t
                }),
                activePanel === 'teamnotes' && h(TeamNotes, {
                    studentName: selectedStudent,
                    t,
                    addToast
                }),
                activePanel === 'iepprep' && h(IEPPrepGenerator, {
                    studentName: selectedStudent,
                    abcEntries,
                    observationSessions,
                    aiAnalysis,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'predict' && h(PredictiveInsights, {
                    abcEntries,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'gamify' && h(StudentGamification, {
                    abcEntries,
                    t
                }),
                activePanel === 'cultural' && h(CulturalContextReflection, {
                    studentName: selectedStudent,
                    t
                }),
                activePanel === 'reframe' && h(StrengthReframe, {
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'biascheck' && h(BiasReflectionMonitor, {
                    abcEntries,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'restorative' && h(RestorativeConversationGuide, {
                    t
                }),
                activePanel === 'relmap' && h(RelationshipMap, {
                    studentName: selectedStudent,
                    t,
                    addToast
                }),
                activePanel === 'familyvoice' && h(FamilyVoiceCollector, {
                    studentName: selectedStudent,
                    callGemini,
                    t,
                    addToast
                }),
                activePanel === 'commlog' && h(TwoWayCommLog, {
                    studentName: selectedStudent,
                    t,
                    addToast
                }),
                activePanel === 'deescalate' && h(DeEscalationToolkit, {
                    t
                }),
                activePanel === 'replacebehavior' && h(ReplacementBehaviorPlanner, {
                    abcEntries,
                    t,
                    addToast
                }),
                activePanel === 'reinforcement' && h(ReinforcementInventory, {
                    studentName: selectedStudent,
                    t,
                    addToast
                }),
                activePanel === 'antecedentmod' && h(AntecedentModPlanner, {
                    abcEntries,
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
                callGemini,
                t,
                addToast
            })
        );
    };

    debugLog("BehaviorLens module registered ✅");
})();
