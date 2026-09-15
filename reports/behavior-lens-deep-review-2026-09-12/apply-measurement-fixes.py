from pathlib import Path
p=Path('behavior_lens_module.js')
s=p.read_text(encoding='utf-8')
def replace(old,new,count=1):
 global s
 assert s.count(old)==count, (old[:100],s.count(old),count)
 s=s.replace(old,new)
replace("const [targets, setTargets] = useState([{ id: 'b1', name: '', type: 'frequency', count: 0, durations: [] }]);", "const [targets, setTargets] = useState([{ id: uid(), name: '', type: 'frequency', count: 0, durations: [] }]);")
replace("id: 'b' + (prev.length + 1), name:","id: uid(), name:",2)
replace("id: 's' + (prev.length + 1), desc:","id: uid(), desc:")
replace("id: 'c' + (prev.length + 1), desc:","id: uid(), desc:")
replace("""            setSessionStart(Date.now());
            setElapsed(0);
            setTargets(prev => prev.map(t => ({ ...t, count: 0, total: 0, durations: [], intervals: [] })));""", """            setSessionStart(Date.now());
            setElapsed(0);
            setDurationTimers({});
            setTargets(prev => prev.map(t => ({ ...t, count: 0, total: 0, durations: [], intervals: [] })));""")
replace("""        const endSession = () => {
            const duration = elapsed;
            const sessionData = {
                id: Date.now().toString(36),
                date: new Date().toISOString(),
                durationSec: duration,
                targets: targets.map(t => ({
                    name: t.name,""", """        const endSession = () => {
            const endedAt = Date.now();
            const duration = sessionStart == null ? elapsed : Math.max(0, Math.floor((endedAt - sessionStart) / 1000));
            const completedTargets = targets.filter(target => target.name.trim()).map(target => {
                const startedAt = durationTimers[target.id];
                return startedAt == null ? target : {
                    ...target,
                    count: target.count + 1,
                    durations: [...(target.durations || []), Math.max(0, (endedAt - startedAt) / 1000)]
                };
            });
            const sessionData = {
                id: uid(),
                date: new Date(sessionStart == null ? endedAt : sessionStart).toISOString(),
                endedAt: new Date(endedAt).toISOString(),
                durationSec: duration,
                targets: completedTargets.map(t => ({
                    id: t.id,
                    name: t.name,""")
replace("""            if (onSaveSession) onSaveSession(sessionData);
            setSessionActive(false);
            if (addToast) addToast(t('behavior_lens.toast.session_saved_ns_n_total_responses', { duration, responses: targets.reduce((a, t) => a + t.count, 0) }) || `Session saved! ${duration}s, ${targets.reduce((a, t) => a + t.count, 0)} total responses`, 'success');""", """            if (onSaveSession) onSaveSession(sessionData);
            setTargets(completedTargets);
            setDurationTimers({});
            setElapsed(duration);
            setSessionActive(false);
            const responses = completedTargets.reduce((sum, target) => sum + target.count, 0);
            if (addToast) addToast(t('behavior_lens.toast.session_saved_ns_n_total_responses', { duration, responses }) || `Session saved! ${duration}s, ${responses} total responses`, 'success');""")
replace("const recordCount = (id) => updateTarget(id, 'count', targets.find(t => t.id === id).count + 1);", "const recordCount = (id) => setTargets(previous => previous.map(target => target.id === id ? { ...target, count: target.count + 1 } : target));")
replace("const [yAxisLabel, setYAxisLabel] = useState('Frequency');", "const [yAxisLabel, setYAxisLabel] = useState('');")
old="""        // Build data series for selected behavior (auto mode)
        const autoDataSeries = useMemo(() => {
            if (!behaviorNames[selectedBehavior]) return [];
            const bName = behaviorNames[selectedBehavior];
            return (sessionHistory || []).map((s, i) => {
                const target = (s.targets || []).find(t => t.name === bName);
                let value = null;
                if (target) {
                    value = target.type === 'rate' ? target.rate : target.type === 'duration' && target.durations?.length ? target.durations.reduce((a, b) => a + b, 0) / target.durations.length : target.type === 'interval' && target.intervals?.length ? Math.round(target.intervals.filter(Boolean).length / target.intervals.length * 100) : target.count;
                } else if (s.behavior === bName) {
                    // Flat bridged observation record — plot the raw count,
                    // falling back to rate/percentage when no count is present.
                    value = s.count != null ? s.count : (s.rate != null ? s.rate : null);
                }
                return { session: i + 1, date: s.date, value };
            }).filter(d => d.value !== null);
        }, [sessionHistory, behaviorNames, selectedBehavior]);

        // Active data series: auto or manual
        const dataSeries = dataMode === 'manual' ? manualData : autoDataSeries;"""
new="""        // History is stored newest first. Give every persisted observation a stable
        // identity, then assign display positions in chronological order.
        const chronologicalSessions = useMemo(() => {
            const runtime = getBehaviorLensWorkspaceRuntime();
            return (sessionHistory || []).map((session, index) => ({
                ...session,
                sessionId: session.observationSessionId || session.id || 'legacy-' + runtime.stableHash(session),
                originalIndex: index
            })).sort((left, right) => {
                const leftTime = Date.parse(left.occurredAt || left.timestamp || left.date) || 0;
                const rightTime = Date.parse(right.occurredAt || right.timestamp || right.date) || 0;
                return leftTime - rightTime || right.originalIndex - left.originalIndex;
            }).map((session, index) => ({ ...session, sessionNumber: index + 1 }));
        }, [sessionHistory]);
        const [measurementFilter, setMeasurementFilter] = useState('');
        const [phaseAnchorState, setPhaseAnchorState] = useDurableToolState('abaGraphPhaseAnchors', {});
        const phaseSignature = JSON.stringify((phases || []).map(phase => [phase.label, phase.condition, phase.startSession]));
        const resolvedPhases = useMemo(() => (phases || []).map((phase, index) => {
            const savedAnchor = phaseAnchorState.signature === phaseSignature && phaseAnchorState.ids && phaseAnchorState.ids[index];
            const anchored = savedAnchor && chronologicalSessions.find(session => session.sessionId === savedAnchor);
            return { ...phase, startSession: anchored ? anchored.sessionNumber : phase.startSession };
        }), [phases, phaseAnchorState, phaseSignature, chronologicalSessions]);
        useEffect(() => {
            if (!phases || !phases.length || !chronologicalSessions.length) return;
            const previousIds = phaseAnchorState.signature === phaseSignature ? phaseAnchorState.ids || [] : [];
            const ids = phases.map((phase, index) => previousIds[index] || chronologicalSessions.find(session => session.sessionNumber === phase.startSession)?.sessionId || null);
            if (phaseAnchorState.signature !== phaseSignature || JSON.stringify(ids) !== JSON.stringify(previousIds)) {
                setPhaseAnchorState({ signature: phaseSignature, ids });
            }
        }, [phases, chronologicalSessions, phaseSignature, phaseAnchorState, setPhaseAnchorState]);

        const autoMeasurements = useMemo(() => {
            if (!behaviorNames[selectedBehavior]) return [];
            const bName = behaviorNames[selectedBehavior];
            return chronologicalSessions.map(s => {
                const target = (s.targets || []).find(target => target.name === bName);
                let value = null;
                let measurement = 'frequency';
                if (target) {
                    measurement = target.type || 'frequency';
                    if (measurement === 'rate') value = target.rate;
                    else if (measurement === 'duration') value = (target.durations || []).reduce((sum, seconds) => sum + seconds, 0);
                    else if (measurement === 'percentage') value = target.total > 0 ? target.count / target.total * 100 : null;
                    else if (measurement === 'interval') value = target.intervals?.length ? target.intervals.filter(Boolean).length / target.intervals.length * 100 : null;
                    else value = target.count;
                } else if (s.behavior === bName) {
                    measurement = s.measurementType || (s.source === 'observation-interval' ? 'interval' : s.source === 'observation-latency' ? 'latency' : s.source === 'observation-duration' ? 'duration' : 'frequency');
                    value = s.value != null ? s.value : (measurement === 'interval' || measurement === 'percentage' || measurement === 'rate' ? s.rate : s.count != null ? s.count : s.rate);
                }
                const unit = measurement === 'duration' || measurement === 'latency' ? 'seconds' : measurement === 'interval' || measurement === 'percentage' ? '%' : measurement === 'rate' ? 'per minute' : 'count';
                return { session: s.sessionNumber, sessionId: s.sessionId, date: s.date, value: value == null ? null : Number(value), measurement, unit };
            }).filter(point => point.value !== null && Number.isFinite(point.value));
        }, [chronologicalSessions, behaviorNames, selectedBehavior]);
        const measurementLabels = { frequency: 'Frequency (count)', rate: 'Rate (per minute)', duration: 'Total duration (seconds)', latency: 'Latency (seconds)', percentage: 'Correct responses (%)', interval: 'Intervals with behavior (%)' };
        const measurementOptions = [...new Set(autoMeasurements.map(point => point.measurement))];
        const selectedMeasurement = measurementOptions.includes(measurementFilter) ? measurementFilter : measurementOptions[0];
        const autoDataSeries = autoMeasurements.filter(point => point.measurement === selectedMeasurement);
        const effectiveYAxisLabel = yAxisLabel || (dataMode === 'auto' ? measurementLabels[selectedMeasurement] || 'Value' : 'Value');

        // Measurements with different denominators or units are never merged.
        const dataSeries = dataMode === 'manual' ? manualData : autoDataSeries;"""
replace(old,new)
start=s.index('    const ABAGraphEngine =')
end=s.index('    const SingleCaseDesignManager =',start)
block=s[start:end]
block=block.replace("const phaseData = dataSeries.filter(d => d.session >= p.startSession && d.session <= (phases[pi + 1]?.startSession - 1 || Infinity));", "const phaseData = dataSeries.filter(d => d.session >= p.startSession && d.session <= (resolvedPhases[pi + 1]?.startSession - 1 || Infinity));")
block=block.replace('return phases.map((p, pi) => {','return resolvedPhases.map((p, pi) => {')
block=block.replace("endSession: phases[pi + 1]?.startSession - 1", "endSession: resolvedPhases[pi + 1]?.startSession - 1")
block=block.replace('}, [phases, dataSeries]);','}, [resolvedPhases, dataSeries]);')
block=block.replace("if (onExportData && dataSeries.length > 0) {", "if (onExportData) {")
block=block.replace("                    dataMode,\n", "                    dataMode,\n                    unit: dataMode === 'auto' ? autoDataSeries[0]?.unit || null : null,\n                    measurementType: dataMode === 'auto' ? selectedMeasurement || null : null,\n")
block=block.replace("}, yAxisLabel),", "}, effectiveYAxisLabel),")
block=block.replace("h('input', { value: yAxisLabel, onChange:", "h('input', { value: yAxisLabel, placeholder: effectiveYAxisLabel, onChange:")
block=block.replace("            // ── Manual Data Entry Panel ──", """            dataMode === 'auto' && measurementOptions.length > 1 && h('label', { className: 'block text-xs font-bold text-slate-700' },
                'Measurement',
                h('select', { value: selectedMeasurement, onChange: event => setMeasurementFilter(event.target.value), 'aria-label': 'Graph measurement', className: 'block mt-1 w-full rounded-lg border border-slate-400 p-2 bg-white' },
                    measurementOptions.map(measurement => h('option', { key: measurement, value: measurement }, measurementLabels[measurement] || measurement))
                )
            ),
            // ── Manual Data Entry Panel ──""")
s=s[:start]+block+s[end:]
replace("""                const match = line.match(/(?:session\\s*\\d*\\s*[:=]\\s*)?(\\d+(?:\\.\\d+)?)/i);
                if (match) parsed.push(parseFloat(match[1]));""", """                const match = line.match(/^(?:session\\s+\\d+\\s*[:=]\\s*|\\d+\\s*[,\\t]\\s*)?(\\d+(?:\\.\\d+)?|\\.\\d+)\\s*$/i);
                if (!match || !Number.isFinite(Number(match[1]))) {
                    if (addToast) addToast('Check row ' + (parsed.length + 1) + ': use a value, Session 1: value, or session,value.', 'warning');
                    return;
                }
                parsed.push(Number(match[1]));""")
p.write_text(s,encoding='utf-8',newline='\n')
