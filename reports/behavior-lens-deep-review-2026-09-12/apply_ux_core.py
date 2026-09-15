from pathlib import Path
p=Path('behavior_lens_module.js')
s=p.read_text(encoding='utf-8-sig')
def replace(old,new,count=1):
 global s
 assert s.count(old)>=count, old[:130]
 s=s.replace(old,new,count)
replace("const [intensity, setIntensity] = useState(entry?.intensity || 3);", "const [intensity, setIntensity] = useState(entry?.intensity ?? '');")
replace("const [duration, setDuration] = useState(entry?.duration || '');", "const [duration, setDuration] = useState(entry?.duration ?? '');")
replace("        const [customA, setCustomA] = useState('');", """        const initialOccurrenceRef = useRef(entry?.occurredAt || entry?.timestamp || new Date().toISOString());
        const toOccurrenceInput = (value) => {
            const date = new Date(value);
            return Number.isFinite(date.getTime()) ? new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '';
        };
        const [occurredAtInput, setOccurredAtInput] = useState(() => toOccurrenceInput(initialOccurrenceRef.current));
        const [entryError, setEntryError] = useState('');
        const [customA, setCustomA] = useState('');""")
replace("""            const normalized = runtime.normalizeAbcEntry({
                id: entry?.id || uid(),
                timestamp: entry?.timestamp || now.toISOString(),
                occurredAt: entry?.occurredAt || entry?.timestamp || now.toISOString(),
                recordedAt: entry?.recordedAt || now.toISOString(),
                timezoneOffset: entry?.timezoneOffset ?? now.getTimezoneOffset(),""", """            const occurrenceChanged = occurredAtInput !== toOccurrenceInput(initialOccurrenceRef.current);
            const occurrenceDate = new Date(occurrenceChanged ? occurredAtInput : initialOccurrenceRef.current);
            if (!occurredAtInput || !Number.isFinite(occurrenceDate.getTime())) {
                setEntryError('Enter a valid occurrence date and time.');
                return;
            }
            const normalized = runtime.normalizeAbcEntry({
                ...entry,
                id: entry?.id || uid(),
                timestamp: occurrenceDate.toISOString(),
                occurredAt: occurrenceDate.toISOString(),
                recordedAt: entry?.recordedAt || entry?.timestamp || now.toISOString(),
                timezoneOffset: occurrenceChanged ? occurrenceDate.getTimezoneOffset() : (entry?.timezoneOffset ?? occurrenceDate.getTimezoneOffset()),""")
replace("""                intensity,
                duration: duration ? parseInt(duration) : null,""", """                intensity: intensity === '' ? null : Number(intensity),
                duration: duration !== '' ? Number(duration) : null,""")
replace("""            return h('div', { className: 'mb-4' },
                h('label', { className: 'block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide' },
                    icon, ' ', t(`behavior_lens.abc.${label}`) || label.charAt(0).toUpperCase() + label.slice(1)
                ),""", """            return h('fieldset', { className: 'mb-4' },
                h('legend', { className: 'block text-xs font-bold text-slate-600 mb-2 uppercase tracking-wide' },
                    icon, ' ', t(`behavior_lens.abc.${label}`) || label.charAt(0).toUpperCase() + label.slice(1)
                ),""")
replace('h(\'button\', { "aria-label": "Toggle value",', "h('button', { 'aria-label': item, 'aria-pressed': value === item,")
replace("""                value === 'Other' && h('input', {
                    type: 'text',
                    value: customVal,
                    onChange: (e) => setCustomVal(e.target.value),
                    placeholder: tt('behavior_lens.abc.other_placeholder', 'Describe...'),
                    'aria-label': 'Describe other category',""", """                h('input', {
                    type: 'text',
                    value: value === 'Other' ? customVal : value,
                    onChange: (e) => value === 'Other' ? setCustomVal(e.target.value) : setValue(e.target.value),
                    placeholder: tt('behavior_lens.abc.other_placeholder', 'Describe...'),
                    'aria-label': label.charAt(0).toUpperCase() + label.slice(1) + ' narrative',""")
replace("""                    // Intensity slider
                    h('div', { className: 'mb-4' },""", """                    h('div', { className: 'mb-4' },
                        h('label', { htmlFor: 'bl-abc-occurred-at', className: 'block text-xs font-bold text-slate-600 mb-1.5' }, 'When did this happen?'),
                        h('input', { id: 'bl-abc-occurred-at', type: 'datetime-local', value: occurredAtInput,
                            onChange: event => { setOccurredAtInput(event.target.value); setEntryError(''); },
                            'aria-describedby': 'bl-abc-occurred-help', 'aria-invalid': entryError ? 'true' : undefined,
                            className: 'w-full min-h-11 border border-slate-400 rounded-lg px-3 py-2 text-sm' }),
                        h('p', { id: 'bl-abc-occurred-help', className: 'mt-1 text-xs text-slate-600' }, 'Your local time. Use the incident time when entering an earlier observation.'),
                        entry?.recordedAt && h('p', { className: 'mt-1 text-xs text-slate-600' }, 'Originally recorded: ' + new Date(entry.recordedAt).toLocaleString()),
                        entryError && h('p', { role: 'alert', className: 'mt-1 text-sm text-red-700' }, entryError)
                    ),
                    // An unrated observation must not silently acquire a midpoint rating.
                    h('div', { className: 'mb-4' },""")
replace("""                            '📊 ', tt('behavior_lens.abc.intensity', 'Intensity'), ' — ', intensity, '/5'
                        ),
                        h('input', {
                            type: 'range',
                            min: 1, max: 5, step: 1,
                            value: intensity,
                            onChange: (e) => setIntensity(parseInt(e.target.value)),
                            'aria-label': 'Behavior intensity rating 1 to 5',
                            className: 'w-full accent-indigo-600'
                        }),""", """                            '📊 ', tt('behavior_lens.abc.intensity', 'Intensity')
                        ),
                        h('select', {
                            value: intensity,
                            onChange: (e) => setIntensity(e.target.value === '' ? '' : Number(e.target.value)),
                            'aria-label': 'Behavior intensity rating 1 to 5',
                            className: 'w-full min-h-11 border border-slate-400 rounded-lg px-3 py-2 bg-white text-sm'
                        }, h('option', { value: '' }, 'Not rated'), [1, 2, 3, 4, 5].map(value => h('option', { key: value, value }, value + (value === 1 ? ' — Mild' : value === 3 ? ' — Moderate' : value === 5 ? ' — High intensity' : '')))),""")
# Scope injected styles without changing the corresponding Tailwind classes elsewhere.
start=s.index("        styleEl.textContent = `")
end=s.index('    const h = React.createElement;', start)
css=s[start:end].replace('.fixed.inset-0', '.bl-root').replace('[class*="behavior-lens"] button,', '.bl-root button,')
s=s[:start]+css+s[end:]
replace("className: 'fixed inset-0 z-[200] bg-slate-100", "className: 'bl-root fixed inset-0 z-[200] bg-slate-100")
replace("h('div', { className: 'px-6 py-4 flex items-center justify-between' },", "h('div', { className: 'bl-app-header px-3 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-2' },")
replace("activePanel !== 'hub' && h('button', { \"aria-label\": \"Toggle active panel\",", "activePanel !== 'hub' && h('button', { 'aria-label': 'Back to BehaviorLens tools',")
replace("                        // Data Quality Badge", "                        // Data Quality Badge")
# Header action row occupies its own line on phones; close always stays in the title row.
replace("""                    h('div', { className: 'flex items-center gap-2' },
                        // Data Quality Badge""", """                    h('button', { ref: behaviorLensCloseRef, 'aria-label': 'Close BehaviorLens', onClick: onClose,
                        className: 'shrink-0 ms-auto min-w-11 min-h-11 p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors' }, h(X, { size: 24, 'aria-hidden': 'true' })),
                    h('div', { className: 'w-full flex flex-wrap items-center gap-2' },
                        // Data Quality Badge""")
replace("""                        ),
                        h('button', {
                            ref: behaviorLensCloseRef,
                            'aria-label': 'Close BehaviorLens',
                            onClick: onClose,
                            className: 'p-2 rounded-full text-slate-600 hover:bg-slate-100 transition-colors'
                        }, h(X, { size: 24, 'aria-hidden': 'true' }))
                    )""", """                        )
                    )""")
replace('activePanel === \'hub\' && h(\'button\', { "aria-label": "Toggle is parent mode",', "activePanel === 'hub' && h('button', { 'aria-label': 'Family Mode', 'aria-pressed': isParentMode,")
replace('h(\'button\', { "aria-label": "Toggle show export menu",', "h('button', { 'aria-label': 'Export this tool', 'aria-expanded': showExportMenu,")
replace('categories.map(cat => h(\'button\', { "aria-label": "Toggle active cat",', "categories.map(cat => h('button', { 'aria-label': cat.label, 'aria-pressed': activeCat === cat.key,")
replace('h(\'button\', { "aria-label": "Toggle Cat",', "h('button', { 'aria-label': cat.label, 'aria-expanded': isOpen, 'aria-controls': 'bl-category-' + cat.key,")
replace("isOpen && h('div', { className: 'grid grid-cols-1 md:grid-cols-3 gap-3 p-3' },", "isOpen && h('div', { id: 'bl-category-' + cat.key, className: 'grid grid-cols-1 md:grid-cols-3 gap-3 p-3' },")
replace('h(\'button\', { "aria-label": "Select",\n                                key: opt.id,', "h('button', { 'aria-label': opt.label,\n                                key: opt.id,")
replace('const btn = h(\'button\', { "aria-label": "Open Panel",', "const btn = h('button', { 'aria-label': 'Open ' + step.label, 'aria-current': isCurrent ? 'step' : undefined,")
replace('chainIdx < chainIds.length - 1 && h(\'button\', { "aria-label": "Open Panel",', "chainIdx < chainIds.length - 1 && h('button', { 'aria-label': 'Next: ' + interventionChain[chainIdx + 1].label,")
replace('related.map(rt => h(\'button\', { "aria-label": "Open Panel",', "related.map(rt => h('button', { 'aria-label': 'Open ' + rt.label,")
replace("const heading = document.querySelector('h2, h3');", "const heading = behaviorLensDialogRef.current?.querySelector('[data-bl-panel-content] h2, [data-bl-panel-content] h3') || behaviorLensDialogRef.current?.querySelector('[data-bl-panel-content]');")
replace("h('div', { className: 'flex-1 overflow-y-auto p-6' },\n                activePanel === 'hub'", "h('div', { 'data-bl-panel-content': true, tabIndex: -1, className: 'flex-1 min-h-0 overflow-y-auto p-3 sm:p-6' },\n                activePanel === 'hub'")
# Current-low-contrast sandbox labels; broader color audit remains independent.
s=s.replace("text-[11px] font-black text-indigo-400 uppercase tracking-wider' }, 'Sandbox Config'", "text-[11px] font-black text-indigo-700 uppercase tracking-wider' }, 'Sandbox Config'")
s=s.replace("text-[11px] font-bold text-indigo-400 block mb-0.5", "text-[11px] font-bold text-indigo-700 block mb-0.5")
p.write_text(s,encoding='utf-8',newline='\n')
print('Applied focused ABC, shell, and navigation improvements.')
