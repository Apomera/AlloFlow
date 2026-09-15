from pathlib import Path
p=Path('behavior_lens_module.js')
s=p.read_text(encoding='utf-8')
def replace(old,new,count=1):
 global s
 assert s.count(old)==count,(old[:100],s.count(old),count)
 s=s.replace(old,new)
replace("sessionId: session.observationSessionId || session.id || 'legacy-' + runtime.stableHash(session)","sessionId: session.id || session.observationSessionId || 'legacy-' + runtime.stableHash(session)")
replace("const autoDataSeries = autoMeasurements.filter(point => point.measurement === selectedMeasurement);","const autoDataSeries = useMemo(() => autoMeasurements.filter(point => point.measurement === selectedMeasurement), [autoMeasurements, selectedMeasurement]);")
replace("const lastEntry = studentAbc.length > 0 ? studentAbc[studentAbc.length - 1] : null;", "const lastEntry = studentAbc.filter(entry => Number.isFinite(Date.parse(entry.occurredAt || entry.timestamp))).sort((left, right) => Date.parse(right.occurredAt || right.timestamp) - Date.parse(left.occurredAt || left.timestamp))[0] || null;")
replace("const avgIntensity = studentAbc.length > 0 ? studentAbc.reduce((sum, e) => sum + (e.intensity || 3), 0) / studentAbc.length : 0;", "const intensitySummary = getBehaviorLensWorkspaceRuntime().summarizeIntensity(studentAbc);\n                const avgIntensity = intensitySummary.mean;")
replace("return { name, abcCount: studentAbc.length, daysSinceEntry, avgIntensity: avgIntensity.toFixed(1), status };", "return { name, abcCount: studentAbc.length, daysSinceEntry, avgIntensity: avgIntensity == null ? 'No ratings' : avgIntensity.toFixed(1), intensityN: intensitySummary.ratedCount, status };")
replace("""            const baseVals = baseEntries.map(e => e.intensity || 3);
            const intVals = intEntries.map(e => e.intensity || 3);""", """            const runtime = getBehaviorLensWorkspaceRuntime();
            const byOccurrence = (left, right) => (Date.parse(left.occurredAt || left.timestamp) || 0) - (Date.parse(right.occurredAt || right.timestamp) || 0);
            const baseVals = baseEntries.slice().sort(byOccurrence).map(entry => runtime.normalizeIntensity(entry.intensity)).filter(value => value != null);
            const intVals = intEntries.slice().sort(byOccurrence).map(entry => runtime.normalizeIntensity(entry.intensity)).filter(value => value != null);
            if (baseVals.length < 2 || intVals.length < 2) {
                if (addToast) addToast('Each phase needs at least 2 rated entries. Missing intensity ratings are excluded.', 'warning');
                return;
            }""")
replace("const parseData = (str) => str.split(/[,\\s]+/).map(s => s.trim()).filter(s => s !== '').map(Number).filter(n => !isNaN(n));", "const parseData = (str) => str.split(/[,\\s]+/).map(s => s.trim()).filter(s => s !== '').map(Number).filter(Number.isFinite);")
start=s.index('    const ProgressMonitorDashboard =')
end=s.index('    const VoiceToABC =',start)
b=s[start:end]
b=b.replace("const [goalCount, setGoalCount] = useState(0);", "const [goalCount, setGoalCount] = useDurableToolState('progressMonitorGoalCount', '');")
b=b.replace("const [goalDate, setGoalDate] = useState('');", "const [goalDate, setGoalDate] = useDurableToolState('progressMonitorGoalDate', '');")
b=b.replace("""            const byDay = {};
            filtered.forEach(e => {
                const d = new Date(e.timestamp).toISOString().split('T')[0];
                byDay[d] = (byDay[d] || 0) + 1;
            });
            return Object.entries(byDay).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => ({ date, count }));""", """            return getBehaviorLensWorkspaceRuntime().groupByLocalDay(filtered).map(day => ({ date: day.date, count: day.count }));""")
b=b.replace("        // Linear regression for trend line.", """        const hasGoal = goalCount !== '' && goalCount != null && Number.isFinite(Number(goalCount)) && Number(goalCount) >= 0;
        const dayNumber = value => { const parts = String(value).split('-').map(Number); return Date.UTC(parts[0], parts[1] - 1, parts[2]) / 86400000; };
        const validGoalDate = goalDate && getBehaviorLensWorkspaceRuntime().parseLocalDateBoundary(goalDate, false) ? goalDate : null;

        // Linear regression for trend line.""")
b=b.replace("const xs = dailyData.map((_, i) => i);", "const xs = dailyData.map(day => dayNumber(day.date) - dayNumber(dailyData[0].date));")
b=b.replace("return { slope, intercept, startY: intercept, endY: slope * (n - 1) + intercept };", "return { slope, intercept, startY: intercept, endY: slope * xs[n - 1] + intercept };")
b=b.replace("const xScale = (i) => PAD + (i / Math.max(dailyData.length - 1, 1)) * chartW;", """const firstDay = dayNumber(dailyData[0].date);
            const lastDay = dayNumber(dailyData[dailyData.length - 1].date);
            const goalDay = validGoalDate ? dayNumber(validGoalDate) : lastDay;
            const chartEnd = Math.max(lastDay, hasGoal ? goalDay : lastDay, firstDay + 1);
            const chartStart = Math.min(firstDay, hasGoal ? goalDay : firstDay);
            const dateX = day => PAD + (day - chartStart) / (chartEnd - chartStart) * chartW;
            const xScale = index => dateX(dayNumber(dailyData[index].date));""")
b=b.replace("goalCount > 0 &&", "hasGoal &&")
b=b.replace("x2: xScale(dailyData.length - 1), y2: yScale(goalCount)", "x2: dateX(goalDay), y2: yScale(Number(goalCount))")
b=b.replace("x: W - PAD + 4, y: yScale(goalCount) + 4", "x: Math.min(W - 75, dateX(goalDay) + 4), y: yScale(Number(goalCount)) - 8")
b=b.replace("}, '🎯 Goal'),", "}, validGoalDate ? 'Goal ' + validGoalDate.slice(5) : 'Goal'),")
b=b.replace("onChange: e => setGoalCount(parseInt(e.target.value) || 0)", "onChange: e => setGoalCount(e.target.value === '' ? '' : Math.max(0, parseInt(e.target.value) || 0))")
b=b.replace("// Chart\n            renderChart(),", "// Chart\n            renderChart(),\n            h('p', { className: 'text-xs text-slate-600' }, 'Counts reflect logged ABC entries. Days without entries are not assumed to be observed zero-event days.'),")
s=s[:start]+b+s[end:]
start=s.index('        const handleSaveObsSession = (sessionData) => {')
end=s.index('        // ── Per-Tool Export Utilities',start)
b=s[start:end]
b=b.replace("const dateStr = sessionData.timestamp ? new Date(sessionData.timestamp).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];", "const dateStr = getBehaviorLensWorkspaceRuntime().normalizeIsoTimestamp(sessionData.occurredAt || sessionData.timestamp) || new Date().toISOString();\n            const observationSessionId = sessionData.id || uid();")
b=b.replace("                    .filter(c => c.count > 0)\n                    .map(c => ({\n                        date: dateStr,", "                    .map((c, index) => ({\n                        id: observationSessionId + ':' + (c.id || index), observationSessionId,\n                        date: dateStr,\n                        measurementType: 'frequency', value: Number(c.count) || 0, unit: 'count',")
b=b.replace("                    date: dateStr,\n                    behavior: modeLabel,", "                    id: observationSessionId, observationSessionId,\n                    date: dateStr,\n                    behavior: sessionData.behavior || modeLabel,\n                    measurementType: 'interval', value: d.percentage == null ? null : Number(d.percentage), unit: '%',")
b=b.replace("date: dateStr, behavior: sessionData.behavior || 'Duration',", "id: observationSessionId, observationSessionId, date: dateStr, behavior: sessionData.behavior || 'Duration',")
b=b.replace("date: dateStr, behavior: sessionData.behavior || 'Latency',", "id: observationSessionId, observationSessionId, date: dateStr, behavior: sessionData.behavior || 'Latency',")
b=b.replace("                    date: dateStr,\n                    behavior: sessionData.behavior || sessionData.method || 'Observation',", "                    id: observationSessionId, observationSessionId, date: dateStr,\n                    behavior: sessionData.behavior || sessionData.method || 'Observation',")
s=s[:start]+b+s[end:]
p.write_text(s,encoding='utf-8',newline='\n')
