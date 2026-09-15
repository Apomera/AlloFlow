const fs=require('node:fs');const p='behavior_lens_module.js';const original=fs.readFileSync(p,'utf8');let s=original;
function change(a,b){if(!s.includes(a))throw new Error('Missing '+a.slice(0,100));s=s.replace(a,b);}
change('        const callGeminiGuarded = useCallback(async (prompt, jsonMode) => {',`        // Every request belongs to the data and student that produced its prompt.
        // A switch away and back still advances generation, preventing late reuse.
        const aiInputFingerprint = useMemo(() => getBehaviorLensWorkspaceRuntime().stableHash([
            getBehaviorLensWorkspaceRuntime().dataFingerprint(abcEntries, targetBehaviors),
            observationSessions, studentProfile, sessionNotes, teamNotes, sessionHistory, aiAnalysis
        ]), [abcEntries, targetBehaviors, observationSessions, studentProfile, sessionNotes, teamNotes, sessionHistory, aiAnalysis]);
        const aiContextKey = (activeStudentId || selectedStudent || '') + '|' + aiConsent + '|' + aiInputFingerprint;
        const aiRequestContextRef = useRef({ key: aiContextKey, generation: 0, mounted: true, requests: {} });
        if (aiRequestContextRef.current.key !== aiContextKey) {
            aiRequestContextRef.current.key = aiContextKey;
            aiRequestContextRef.current.generation += 1;
        }
        useEffect(() => {
            setSummaryLoading(false);
            setAnalyzing(false);
        }, [aiContextKey]);
        useEffect(() => {
            aiRequestContextRef.current.mounted = true;
            return () => { aiRequestContextRef.current.mounted = false; aiRequestContextRef.current.generation += 1; };
        }, []);
        const beginStudentAiRequest = (kind) => {
            const state = aiRequestContextRef.current;
            state.requests[kind] = (state.requests[kind] || 0) + 1;
            return { kind, request: state.requests[kind], generation: state.generation };
        };
        const isStudentAiRequestCurrent = (token) => {
            const state = aiRequestContextRef.current;
            return state.mounted && state.generation === token.generation && state.requests[token.kind] === token.request;
        };
        const callGeminiGuarded = useCallback(async (prompt, jsonMode) => {`);
change('            return callGemini(prompt, jsonMode);',`            const generation = aiRequestContextRef.current.generation;
            const result = await callGemini(prompt, jsonMode);
            return aiRequestContextRef.current.mounted && aiRequestContextRef.current.generation === generation ? result : null;`);
change('            return callGeminiVision(prompt, base64, mime);',`            const generation = aiRequestContextRef.current.generation;
            const result = await callGeminiVision(prompt, base64, mime);
            return aiRequestContextRef.current.mounted && aiRequestContextRef.current.generation === generation ? result : null;`);
let start=s.indexOf('        const handleFullSummary = async () => {'),end=s.indexOf('        // Parent-friendly tool IDs',start);let body=s.slice(start,end);
body=body.replace("            if (fullSummary) { setFullSummary(''); return; }", "            const request = beginStudentAiRequest('summary');\n            if (fullSummary) { setFullSummary(''); return; }");
body=body.replace('const abcStr = abcEntries.slice(-10).map(e =>','const abcStr = getBehaviorLensWorkspaceRuntime().selectStratifiedEntries(abcEntries, 10).entries.map(e =>');
body=body.replace('I=${e.intensity}/5','I=${e.intensity == null ? \'not rated\' : e.intensity + \'/5\'}');
body=body.replace('Method: ${s.method}, Duration: ${s.timer}s, Frequency: ${s.frequency}', "Method: ${s.method}, Observation duration: ${s.duration == null ? 'not recorded' : s.duration + 's'}, Measurements: ${JSON.stringify(s.data || {})}");
body=body.replace('if (result == null) { setSummaryLoading(false); return; }','if (result == null || !isStudentAiRequestCurrent(request)) return;');
body=body.replace("            } catch (err) {", "            } catch (err) {\n                if (!isStudentAiRequestCurrent(request)) return;");
body=body.replace('finally { setSummaryLoading(false); }','finally { if (isStudentAiRequestCurrent(request)) setSummaryLoading(false); }');
s=s.slice(0,start)+body+s.slice(end);
start=s.indexOf('        const handleAiAnalyze = async () => {');end=s.indexOf('        const handleSaveObsSession =',start);body=s.slice(start,end);
body=body.replace('            const startedAt = Date.now();',"            const request = beginStudentAiRequest('analysis');\n            const startedAt = Date.now();");
body=body.replace('const result = await callGemini(prompt, true);', 'const result = await callGeminiGuarded(prompt, true);\n                if (result == null || !isStudentAiRequestCurrent(request)) return;');
body=body.replace('            } catch (error) {','            } catch (error) {\n                if (!isStudentAiRequestCurrent(request)) return;');
body=body.replace('finally { setAnalyzing(false); }','finally { if (isStudentAiRequestCurrent(request)) setAnalyzing(false); }');
s=s.slice(0,start)+body+s.slice(end);
s=s.replaceAll('runtime.createAnalysisProvenance(abcEntries, sample)', 'runtime.createAnalysisProvenance(abcEntries, sample, undefined, targetBehaviors)');
s=s.replaceAll('isAnalysisStale(aiAnalysis, abcEntries), [aiAnalysis, abcEntries]', 'isAnalysisStale(aiAnalysis, abcEntries, targetBehaviors), [aiAnalysis, abcEntries, targetBehaviors]');
change("() => runtime.summarizePhases(filteredEntries, observationSessions || []),", "() => runtime.summarizePhases(filteredEntries, observationSessions || [], behaviorFilter === 'all' ? {} : { behaviorId: behaviorFilter, targetBehaviors }),");
const phase=s.indexOf("() => runtime.summarizePhases(filteredEntries, observationSessions || [],");const deps=s.indexOf('[filteredEntries, observationSessions]',phase);if(deps<0)throw new Error('Phase deps missing');s=s.slice(0,deps)+s.slice(deps).replace('[filteredEntries, observationSessions]', '[filteredEntries, observationSessions, behaviorFilter, targetBehaviors]');
if(fs.readFileSync(p,'utf8')!==original)throw new Error('Concurrent edit detected; rerun patch');fs.writeFileSync(p,s);console.log('Applied student-bound AI lifecycle and provenance');
