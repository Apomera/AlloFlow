// report_writer_module.js
// Report Writer — Clinical report generation module for AlloFlow
// Loaded from GitHub CDN via loadModule('ReportWriter', ...)
// Version: 1.0.0 (Mar 2026)
(function () {
    if (window.AlloModules && window.AlloModules.ReportWriter) {
        console.log("[CDN] ReportWriter already loaded, skipping duplicate");
        return;
    }

    const h = React.createElement;
    const { useState, useEffect, useRef, useMemo, useCallback } = React;
    const warnLog = (...args) => console.warn("[RW-WARN]", ...args);
    const debugLog = (...args) => {
        if (typeof console !== "undefined") console.log("[RW-DBG]", ...args);
    };

    // ─── Utility Helpers ────────────────────────────────────────────────
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

    const RESTORATIVE_PREAMBLE = `IMPORTANT — Language Guidelines: Use person-first, strengths-based language throughout your response. Frame challenges as unmet needs or lagging skills, not deficits. Say "the student demonstrates difficulty with..." rather than "the student refuses to..." or "is non-compliant." Avoid punitive framing; focus on teaching replacement skills and building supportive environments.`;

    // ─── Report Writer: Developmental Norms & Psychometric Data ──────
    const DEVELOPMENTAL_NORMS = {
        attention_span: [
            { ageMin: 2, ageMax: 2, typicalMin: 4, typicalMax: 6, unit: 'minutes' },
            { ageMin: 3, ageMax: 3, typicalMin: 6, typicalMax: 10, unit: 'minutes' },
            { ageMin: 4, ageMax: 4, typicalMin: 8, typicalMax: 15, unit: 'minutes' },
            { ageMin: 5, ageMax: 5, typicalMin: 10, typicalMax: 20, unit: 'minutes' },
            { ageMin: 6, ageMax: 6, typicalMin: 12, typicalMax: 30, unit: 'minutes' },
            { ageMin: 7, ageMax: 8, typicalMin: 15, typicalMax: 40, unit: 'minutes' },
            { ageMin: 9, ageMax: 10, typicalMin: 20, typicalMax: 50, unit: 'minutes' },
            { ageMin: 11, ageMax: 12, typicalMin: 25, typicalMax: 55, unit: 'minutes' },
            { ageMin: 13, ageMax: 99, typicalMin: 30, typicalMax: 60, unit: 'minutes' },
        ],
        tantrum_frequency: [
            { ageMin: 2, ageMax: 4, typicalMin: 0, typicalMax: 3, unit: 'per week', clinicalThreshold: 5 },
            { ageMin: 5, ageMax: 6, typicalMin: 0, typicalMax: 1, unit: 'per week', clinicalThreshold: 3 },
            { ageMin: 7, ageMax: 99, typicalMin: 0, typicalMax: 0.5, unit: 'per week', clinicalThreshold: 2 },
        ],
        social_play: [
            { ageMin: 0, ageMax: 1, stage: 'Solitary', desc: 'Plays alone, limited interest in others' },
            { ageMin: 2, ageMax: 2, stage: 'Onlooker/Parallel', desc: 'Watches or plays alongside others without interaction' },
            { ageMin: 3, ageMax: 3, stage: 'Associative', desc: 'Interacts during play but without common goal' },
            { ageMin: 4, ageMax: 6, stage: 'Cooperative', desc: 'Organized play with roles and shared goals' },
            { ageMin: 7, ageMax: 99, stage: 'Complex Cooperative', desc: 'Rule-based games, negotiation, teamwork' },
        ],
        language_vocabulary: [
            { ageMin: 1, ageMax: 1, typicalMin: 10, typicalMax: 50, unit: 'words' },
            { ageMin: 2, ageMax: 2, typicalMin: 200, typicalMax: 300, unit: 'words' },
            { ageMin: 3, ageMax: 3, typicalMin: 800, typicalMax: 1200, unit: 'words' },
            { ageMin: 4, ageMax: 4, typicalMin: 1500, typicalMax: 2500, unit: 'words' },
            { ageMin: 5, ageMax: 5, typicalMin: 2500, typicalMax: 5000, unit: 'words' },
        ],
    };
    const SCORE_CLASSIFICATIONS = [
        { min: 130, max: 999, label: 'Very Superior', color: 'emerald' },
        { min: 120, max: 129, label: 'Superior', color: 'green' },
        { min: 110, max: 119, label: 'High Average', color: 'teal' },
        { min: 90, max: 109, label: 'Average', color: 'sky' },
        { min: 80, max: 89, label: 'Low Average', color: 'amber' },
        { min: 70, max: 79, label: 'Borderline', color: 'orange' },
        { min: 0, max: 69, label: 'Extremely Low', color: 'red' },
    ];
    const ASSESSMENT_PRESETS = {
        'WISC-V': { subtests: ['Full Scale IQ', 'Verbal Comprehension', 'Visual Spatial', 'Fluid Reasoning', 'Working Memory', 'Processing Speed'], scoreType: 'standard', mean: 100, sd: 15 },
        'WIAT-4': { subtests: ['Total Achievement', 'Reading Composite', 'Math Composite', 'Written Language', 'Word Reading', 'Spelling', 'Numerical Operations'], scoreType: 'standard', mean: 100, sd: 15 },
        'BASC-3 (Parent)': { subtests: ['Externalizing', 'Internalizing', 'Behavioral Symptoms Index', 'Adaptive Skills', 'Hyperactivity', 'Aggression', 'Anxiety', 'Depression', 'Attention Problems', 'Social Skills', 'Leadership'], scoreType: 'T-score', mean: 50, sd: 10 },
        'BASC-3 (Teacher)': { subtests: ['Externalizing', 'Internalizing', 'Behavioral Symptoms Index', 'Adaptive Skills', 'Hyperactivity', 'Aggression', 'Anxiety', 'Depression', 'Attention Problems', 'Learning Problems', 'School Problems'], scoreType: 'T-score', mean: 50, sd: 10 },
        'Vineland-3': { subtests: ['Adaptive Behavior Composite', 'Communication', 'Daily Living Skills', 'Socialization', 'Motor Skills'], scoreType: 'standard', mean: 100, sd: 15 },
        'BRIEF-2': { subtests: ['Global Executive Composite', 'Behavioral Regulation Index', 'Emotion Regulation Index', 'Cognitive Regulation Index', 'Inhibit', 'Shift', 'Emotional Control', 'Working Memory', 'Plan/Organize'], scoreType: 'T-score', mean: 50, sd: 10 },
        'Conners-4': { subtests: ['Inattention/Executive Dysfunction', 'Hyperactivity', 'Impulsivity', 'Emotional Dysregulation', 'Depressed Mood', 'Anxious Thoughts'], scoreType: 'T-score', mean: 50, sd: 10 },
        'WJ-IV COG': { subtests: ['General Intellectual Ability', 'Comprehension-Knowledge', 'Fluid Reasoning', 'Short-Term Working Memory', 'Cognitive Processing Speed', 'Auditory Processing', 'Long-Term Retrieval', 'Visual Processing'], scoreType: 'standard', mean: 100, sd: 15 },
        'WJ-IV ACH': { subtests: ['Total Achievement', 'Broad Reading', 'Broad Math', 'Broad Written Language', 'Letter-Word ID', 'Applied Problems', 'Spelling', 'Passage Comprehension', 'Calculation', 'Writing Samples'], scoreType: 'standard', mean: 100, sd: 15 },
        'KABC-II': { subtests: ['Mental Processing Index', 'Sequential', 'Simultaneous', 'Learning', 'Planning', 'Knowledge'], scoreType: 'standard', mean: 100, sd: 15 },
        'DAS-II': { subtests: ['General Conceptual Ability', 'Verbal', 'Nonverbal Reasoning', 'Spatial', 'Working Memory', 'Processing Speed'], scoreType: 'standard', mean: 100, sd: 15 },
        'CELF-5': { subtests: ['Core Language', 'Receptive Language', 'Expressive Language', 'Language Content', 'Language Structure', 'Language Memory'], scoreType: 'standard', mean: 100, sd: 15 },
        'KTEA-3': { subtests: ['Academic Skills Battery', 'Reading Composite', 'Math Composite', 'Written Language Composite', 'Letter & Word Recognition', 'Math Concepts', 'Spelling'], scoreType: 'standard', mean: 100, sd: 15 },
        'SRS-2': { subtests: ['Total Score', 'Social Awareness', 'Social Cognition', 'Social Communication', 'Social Motivation', 'Restricted Interests'], scoreType: 'T-score', mean: 50, sd: 10 },
        'GARS-3': { subtests: ['Autism Index', 'Restricted/Repetitive Behaviors', 'Social Interaction', 'Social Communication', 'Emotional Responses'], scoreType: 'standard', mean: 100, sd: 15 },
        'BOT-2': { subtests: ['Total Motor Composite', 'Fine Manual Control', 'Manual Coordination', 'Body Coordination', 'Strength and Agility'], scoreType: 'standard', mean: 50, sd: 10 },
        'Custom Assessment': { subtests: [], scoreType: 'standard', mean: 100, sd: 15 },
    };
    const classifyScore = (score, scoreType = 'standard') => {
        if (scoreType === 'T-score') {
            if (score >= 70) return { label: 'Clinically Significant', color: 'red' };
            if (score >= 65) return { label: 'At-Risk', color: 'orange' };
            if (score >= 60) return { label: 'High Average', color: 'amber' };
            if (score >= 40) return { label: 'Average', color: 'sky' };
            if (score >= 35) return { label: 'Low', color: 'amber' };
            return { label: 'Very Low', color: 'emerald' };
        }
        return SCORE_CLASSIFICATIONS.find(c => score >= c.min && score <= c.max) || { label: 'Unknown', color: 'slate' };
    };
    const crossReferenceDevNorms = (domain, value, studentAge) => {
        const norms = DEVELOPMENTAL_NORMS[domain];
        if (!norms || !studentAge) return null;
        const ageNorm = norms.find(n => studentAge >= n.ageMin && studentAge <= n.ageMax);
        if (!ageNorm) return null;
        if (ageNorm.typicalMin !== undefined) {
            if (value >= ageNorm.typicalMin) return { type: 'appropriate', label: 'Developmentally Appropriate', color: 'green', explanation: `Value of ${value} ${ageNorm.unit} falls within the typical range of ${ageNorm.typicalMin}–${ageNorm.typicalMax} ${ageNorm.unit} for age ${studentAge}` };
            const oneYearBack = norms.find(n => (studentAge - 1) >= n.ageMin && (studentAge - 1) <= n.ageMax);
            if (oneYearBack && value >= oneYearBack.typicalMin) return { type: 'borderline', label: 'Borderline', color: 'amber', explanation: `Value of ${value} ${ageNorm.unit} is below typical for age ${studentAge} (expected ${ageNorm.typicalMin}–${ageNorm.typicalMax}) but within range for age ${studentAge - 1}` };
            return { type: 'deficit', label: 'Significant Deficit', color: 'red', explanation: `Value of ${value} ${ageNorm.unit} is significantly below the typical range of ${ageNorm.typicalMin}–${ageNorm.typicalMax} ${ageNorm.unit} for age ${studentAge}` };
        }
        if (ageNorm.stage) return { type: 'reference', label: ageNorm.stage, color: 'sky', explanation: `Typical for age ${studentAge}: ${ageNorm.stage} — ${ageNorm.desc}` };
        return null;
    };
    // ─── Report Writer Panel ─────────────────────────────────────
    const ReportWriterPanel = ({ studentName, abcEntries, observationSessions, aiAnalysis, studentProfile, callGemini, t, addToast }) => {
        const STEPS = [
            { num: 1, label: 'Assessment Scores', icon: '📊' },
            { num: 2, label: 'Background & History', icon: '📋' },
            { num: 3, label: 'Fact Chunk Review', icon: '🔒' },
            { num: 4, label: 'Generate Report', icon: '✍️' },
            { num: 5, label: 'Accuracy Dashboard', icon: '🎯' },
            { num: 6, label: 'Export', icon: '📥' },
        ];
        const [currentStep, setCurrentStep] = useState(1);
        const [studentAge, setStudentAge] = useState('');
        const [studentGrade, setStudentGrade] = useState('');
        const [reportTitle, setReportTitle] = useState('Psychoeducational Evaluation Report');
        // Step 1: Scores
        const [selectedAssessment, setSelectedAssessment] = useState('WISC-V');
        const [scoreEntries, setScoreEntries] = useState([]);
        const [customSubtest, setCustomSubtest] = useState('');
        const [customScore, setCustomScore] = useState('');
        // Step 2: Background
        const [bgSections, setBgSections] = useState({
            referralReason: '', developmental: '', medical: '', educational: '', social: '', behavioral: '', observations: ''
        });
        // Step 3: Fact chunks
        const [factChunks, setFactChunks] = useState([]);
        const [extracting, setExtracting] = useState(false);
        // Step 4: Report generation
        const [reportSections, setReportSections] = useState({});
        const [generating, setGenerating] = useState(false);
        const [genProgress, setGenProgress] = useState('');
        // Step 5: Accuracy
        const [accuracyResults, setAccuracyResults] = useState([]);
        const [checking, setChecking] = useState(false);
        // Step 6: Export
        const [importText, setImportText] = useState('');

        // ── PII scrubbing ──
        const scrubPII = (text) => {
            if (!text) return text;
            let scrubbed = text;
            if (studentName) scrubbed = scrubbed.replace(new RegExp(studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '[Student]');
            scrubbed = scrubbed.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[DATE]');
            scrubbed = scrubbed.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{2,4}\b/gi, '[DATE]');
            return scrubbed;
        };

        // ── Step 1: Add score entry ──
        const addScoreEntry = (subtest, score) => {
            const numScore = parseFloat(score);
            if (isNaN(numScore)) return;
            const preset = ASSESSMENT_PRESETS[selectedAssessment] || {};
            const classification = classifyScore(numScore, preset.scoreType || 'standard');
            const percentile = preset.scoreType === 'standard' ? Math.round(((1 + (function (z) { const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911; const sign = z < 0 ? -1 : 1; z = Math.abs(z) / Math.sqrt(2); const tt = 1 / (1 + p * z); return sign * (1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-z * z)); })((numScore - (preset.mean || 100)) / (preset.sd || 15))) / 2) * 100) : null;
            setScoreEntries(prev => [...prev, {
                id: uid(), assessment: selectedAssessment, subtest, score: numScore,
                scoreType: preset.scoreType || 'standard', classification: classification.label,
                classColor: classification.color, percentile,
                addedAt: new Date().toISOString()
            }]);
        };
        const removeScoreEntry = (id) => setScoreEntries(prev => prev.filter(s => s.id !== id));

        // ── Step 2: Import from BehaviorLens ──
        const importFromBehaviorLens = () => {
            let behavioral = bgSections.behavioral || '';
            if (abcEntries && abcEntries.length > 0) {
                behavioral += '\n\n--- Imported from BehaviorLens ABC Data ---\n';
                abcEntries.slice(0, 10).forEach((e, i) => {
                    behavioral += `\n${i + 1}. Antecedent: ${e.antecedent || 'N/A'} | Behavior: ${e.behavior || 'N/A'} | Consequence: ${e.consequence || 'N/A'} | Function: ${e.function || 'unknown'}`;
                });
            }
            let observations = bgSections.observations || '';
            if (observationSessions && observationSessions.length > 0) {
                observations += '\n\n--- Imported from BehaviorLens Observation Sessions ---\n';
                observationSessions.slice(0, 5).forEach((s, i) => {
                    observations += `\nSession ${i + 1}: ${s.date || ''} | Type: ${s.type || 'general'} | Duration: ${s.duration || 'N/A'} | Notes: ${(s.notes || '').substring(0, 200)}`;
                });
            }
            setBgSections(prev => ({ ...prev, behavioral, observations }));
            if (addToast) addToast('BehaviorLens data imported ✅', 'success');
        };

        // ── Step 3: Extract fact chunks ──
        const extractFactChunks = async () => {
            setExtracting(true);
            try {
                // Build fact chunks from score entries (deterministic, no AI needed)
                const scoreChunks = scoreEntries.map(s => ({
                    id: uid(), type: 'score', source: s.assessment, field: s.subtest,
                    value: s.score, classification: s.classification, scoreType: s.scoreType,
                    percentile: s.percentile, verified: false, immutable: false,
                    devNormResult: null, addedAt: s.addedAt
                }));
                // Build background fact chunks via AI
                let bgChunks = [];
                const bgText = Object.entries(bgSections).filter(([, v]) => v.trim()).map(([k, v]) => `${k}: ${v}`).join('\n\n');
                if (bgText.trim() && callGemini) {
                    const scrubbed = scrubPII(bgText);
                    const prompt = `You are a clinical data extractor. Extract atomic facts from this background information. Each fact should be a single, verifiable statement.
${RESTORATIVE_PREAMBLE}

Text to extract from:
"""
${scrubbed.substring(0, 4000)}
"""

Return ONLY valid JSON array of objects:
[{"type":"background","source":"section_name","field":"brief_label","value":"the factual statement","category":"developmental|medical|educational|social|behavioral|observation"}]

Extract 5-20 key facts. Be precise and factual.`;
                    try {
                        const result = await callGemini(prompt, true);
                        const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        let parsed;
                        try { parsed = JSON.parse(cleaned); }
                        catch { const m = result.match(/\[[\s\S]*\]/); if (m) parsed = JSON.parse(m[0]); else parsed = []; }
                        bgChunks = (Array.isArray(parsed) ? parsed : []).map(c => ({
                            id: uid(), type: c.type || 'background', source: c.source || 'background',
                            field: c.field || '', value: c.value || '', category: c.category || 'general',
                            verified: false, immutable: false, devNormResult: null
                        }));
                    } catch (err) { warnLog('Fact extraction error:', err); }
                }
                setFactChunks([...scoreChunks, ...bgChunks]);
                if (addToast) addToast(`Extracted ${scoreChunks.length + bgChunks.length} fact chunks`, 'success');
            } catch (err) {
                warnLog('Extract error:', err);
                if (addToast) addToast('Extraction failed', 'error');
            } finally { setExtracting(false); }
        };
        const verifyChunk = (chunkId) => {
            const age = parseFloat(studentAge);
            setFactChunks(prev => prev.map(c => {
                if (c.id !== chunkId) return c;
                let devNormResult = null;
                if (c.type === 'score' && age) {
                    // Standard score dev norm: < 85 is concern for standard, > 65 for T-score behavioral
                    if (c.scoreType === 'standard' && c.value < 85) {
                        devNormResult = { type: 'deficit', label: 'Below Expected', color: 'red', explanation: `Standard score of ${c.value} (${c.classification}) is below the Average range for a ${age}-year-old` };
                    } else if (c.scoreType === 'T-score' && c.value > 65) {
                        devNormResult = { type: 'deficit', label: 'Clinically Elevated', color: 'red', explanation: `T-score of ${c.value} (${c.classification}) indicates clinically elevated concerns for a ${age}-year-old` };
                    } else {
                        devNormResult = { type: 'appropriate', label: 'Within Expected Range', color: 'green', explanation: `Score of ${c.value} (${c.classification}) is within the expected range for a ${age}-year-old` };
                    }
                }
                return { ...c, verified: true, immutable: true, verifiedAt: new Date().toISOString(), devNormResult };
            }));
        };
        const verifyAllChunks = () => factChunks.filter(c => !c.verified).forEach(c => verifyChunk(c.id));
        const rejectChunk = (chunkId) => setFactChunks(prev => prev.filter(c => c.id !== chunkId));

        // ── Step 4: Generate report ──
        const generateReport = async () => {
            if (!callGemini) return;
            setGenerating(true);
            const verifiedChunks = factChunks.filter(c => c.verified);
            if (verifiedChunks.length === 0) { setGenerating(false); if (addToast) addToast('No verified fact chunks', 'error'); return; }
            const sections = ['Reason for Referral', 'Background Information', 'Assessment Results & Interpretation', 'Behavioral Observations', 'Summary & Diagnostic Impressions', 'Recommendations'];
            const generated = {};
            const age = studentAge ? `${studentAge} years old` : 'age not specified';
            const grade = studentGrade || 'grade not specified';
            const scoreChunksText = verifiedChunks.filter(c => c.type === 'score').map(c =>
                `${c.source} — ${c.field}: ${c.value} (${c.classification})${c.devNormResult ? ' [' + c.devNormResult.label + ']' : ''}`
            ).join('\n');
            const bgChunksText = verifiedChunks.filter(c => c.type === 'background').map(c =>
                `${c.field}: ${c.value}`
            ).join('\n');
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                setGenProgress(`Generating ${section} (${i + 1}/${sections.length})...`);
                try {
                    const prompt = `You are writing the "${section}" section of a ${reportTitle} for a student who is ${age}, ${grade}.
${RESTORATIVE_PREAMBLE}

CRITICAL RULES:
1. Use ONLY the verified facts below. Do NOT invent any scores, dates, or claims.
2. Every statement must trace directly to a fact chunk below.
3. Use person-first, strengths-based language.
4. Reference the student as "[Student]" (we will replace with actual name later).
5. Write in professional clinical language appropriate for a formal report.

VERIFIED ASSESSMENT DATA:
${scoreChunksText || 'No assessment scores provided for this section.'}

VERIFIED BACKGROUND FACTS:
${bgChunksText || 'No background information provided for this section.'}

Write the "${section}" section (2-4 paragraphs). Return ONLY the section text, no headers or labels.`;
                    const result = await callGemini(prompt, false);
                    generated[section] = result.trim();
                } catch (err) {
                    warnLog(`Generation error for ${section}:`, err);
                    generated[section] = `[Error generating ${section} — please retry]`;
                }
            }
            setReportSections(generated);
            setGenProgress('');
            setGenerating(false);
            if (addToast) addToast('Report generated ✨', 'success');
        };

        // ── Step 5: Accuracy check ──
        const runAccuracyCheck = async () => {
            if (!callGemini) return;
            setChecking(true);
            const verifiedChunks = factChunks.filter(c => c.verified);
            const fullDraft = Object.entries(reportSections).map(([k, v]) => `## ${k}\n${v}`).join('\n\n');
            try {
                const prompt = `You are a clinical accuracy auditor. Compare this report draft against the verified fact chunks and identify any discrepancies.

VERIFIED FACT CHUNKS (ground truth):
${verifiedChunks.map(c => `- [${c.id}] ${c.source} ${c.field}: ${c.value} (${c.classification || ''})`).join('\n')}

REPORT DRAFT:
"""
${scrubPII(fullDraft).substring(0, 6000)}
"""

For each claim in the report, determine:
- "verified" = directly supported by a fact chunk
- "unsourced" = plausible but not directly traceable to a fact chunk
- "contradicts" = conflicts with a fact chunk

Return ONLY valid JSON:
{"results":[{"claim":"brief claim text","status":"verified|unsourced|contradicts","chunkId":"matching chunk id or null","explanation":"brief reason"}]}

Check every numerical score, every classification, and every factual claim.`;
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else parsed = { results: [] }; }
                setAccuracyResults(parsed.results || []);
                if (addToast) {
                    const v = (parsed.results || []).filter(r => r.status === 'verified').length;
                    const total = (parsed.results || []).length;
                    addToast(`Accuracy: ${v}/${total} claims verified ✅`, v === total ? 'success' : 'info');
                }
            } catch (err) {
                warnLog('Accuracy check error:', err);
                if (addToast) addToast('Accuracy check failed', 'error');
            } finally { setChecking(false); }
        };

        // ── Step 6: Export ──
        const exportJSON = () => {
            const data = { reportTitle, studentAge, studentGrade, scoreEntries, bgSections, factChunks, reportSections, accuracyResults, exportedAt: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `report_${(studentName || 'student').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            if (addToast) addToast('JSON exported ✅', 'success');
        };
        const importJSON = () => {
            try {
                const data = JSON.parse(importText);
                if (data.reportTitle) setReportTitle(data.reportTitle);
                if (data.studentAge) setStudentAge(data.studentAge);
                if (data.studentGrade) setStudentGrade(data.studentGrade);
                if (data.scoreEntries) setScoreEntries(data.scoreEntries);
                if (data.bgSections) setBgSections(data.bgSections);
                if (data.factChunks) setFactChunks(data.factChunks);
                if (data.reportSections) setReportSections(data.reportSections);
                if (data.accuracyResults) setAccuracyResults(data.accuracyResults);
                setImportText('');
                if (addToast) addToast('Report data imported ✅', 'success');
            } catch { if (addToast) addToast('Invalid JSON', 'error'); }
        };
        const copyFullReport = () => {
            const header = `${reportTitle}\nStudent: ${studentName || '[Student]'}\nAge: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'}\nDate: ${new Date().toLocaleDateString()}\n${'─'.repeat(50)}\n\n`;
            const body = Object.entries(reportSections).map(([k, v]) => `${k.toUpperCase()}\n\n${v.replace(/\[Student\]/g, studentName || '[Student]')}`).join('\n\n' + '─'.repeat(50) + '\n\n');
            navigator.clipboard.writeText(header + body).then(() => { if (addToast) addToast('Report copied to clipboard ✅', 'success'); });
        };
        const printReport = () => {
            const w = window.open('', '_blank');
            const header = `<h1 style="text-align:center;margin-bottom:4px">${reportTitle}</h1><p style="text-align:center;color:#666">Student: ${studentName || '[Student]'} | Age: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'} | Date: ${new Date().toLocaleDateString()}</p><hr>`;
            const body = Object.entries(reportSections).map(([k, v]) => `<h2>${k}</h2><p>${v.replace(/\[Student\]/g, studentName || '[Student]').replace(/\n/g, '</p><p>')}</p>`).join('');
            w.document.write(`<html><head><title>${reportTitle}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;color:#333}h1{font-size:18px}h2{font-size:14px;color:#1e40af;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}p{font-size:12px;text-align:justify}</style></head><body>${header}${body}</body></html>`);
            w.document.close();
            w.print();
        };

        // ── Color helpers ──
        const cBg = (color) => `bg-${color}-50`;
        const cBorder = (color) => `border-${color}-200`;
        const cText = (color) => `text-${color}-700`;
        const cBadge = (color) => `bg-${color}-100 text-${color}-800`;

        // ── Verified chunk stats ──
        const totalChunks = factChunks.length;
        const verifiedCount = factChunks.filter(c => c.verified).length;
        const deficitCount = factChunks.filter(c => c.devNormResult?.type === 'deficit').length;

        // ── Render ──
        return h('div', { className: 'space-y-4' },
            // Header
            h('div', { className: 'bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-5 border border-violet-200' },
                h('div', { className: 'flex items-center justify-between mb-3' },
                    h('div', { className: 'flex items-center gap-3' },
                        h('span', { className: 'text-2xl' }, '📝'),
                        h('div', null,
                            h('h2', { className: 'text-lg font-bold text-violet-900' }, 'Report Writer'),
                            h('p', { className: 'text-xs text-violet-600' }, 'Fact-verified clinical report generation')
                        )
                    ),
                    h('div', { className: 'flex items-center gap-2' },
                        h('label', { className: 'text-[10px] text-slate-500' }, 'Age:'),
                        h('input', { type: 'number', className: 'w-12 text-xs border rounded px-1.5 py-0.5 text-center', placeholder: 'yrs', value: studentAge, onChange: e => setStudentAge(e.target.value), min: 1, max: 22 }),
                        h('label', { className: 'text-[10px] text-slate-500 ml-2' }, 'Grade:'),
                        h('input', { type: 'text', className: 'w-12 text-xs border rounded px-1.5 py-0.5 text-center', placeholder: 'e.g. 3', value: studentGrade, onChange: e => setStudentGrade(e.target.value) })
                    )
                ),
                // Step indicator
                h('div', { className: 'flex items-center gap-1 overflow-x-auto pb-1' },
                    STEPS.map((s, i) =>
                        h('button', {
                            key: s.num,
                            className: `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap ${currentStep === s.num ? 'bg-violet-600 text-white shadow-md' : s.num < currentStep ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-400 border border-slate-200'}`,
                            onClick: () => setCurrentStep(s.num)
                        }, h('span', null, s.icon), ` ${s.label}`)
                    )
                )
            ),
            // Step content
            // ═══ STEP 1: Assessment Score Entry ═══
            currentStep === 1 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-4' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '📊 Assessment Score Entry'),
                h('p', { className: 'text-[10px] text-slate-500' }, 'Select an assessment and enter scores. Classifications are auto-calculated.'),
                // Assessment picker
                h('div', { className: 'flex flex-wrap items-end gap-3' },
                    h('div', { className: 'flex-1 min-w-[140px]' },
                        h('label', { className: 'text-[10px] font-medium text-slate-600 block mb-1' }, 'Assessment'),
                        h('select', { className: 'w-full text-xs border rounded-lg px-2 py-1.5 bg-white', value: selectedAssessment, onChange: e => setSelectedAssessment(e.target.value) },
                            Object.keys(ASSESSMENT_PRESETS).map(a => h('option', { key: a, value: a }, a))
                        )
                    ),
                    h('div', { className: 'text-[10px] text-slate-400 bg-slate-50 rounded px-2 py-1' },
                        `${(ASSESSMENT_PRESETS[selectedAssessment]?.scoreType || 'standard')} scores | Mean=${ASSESSMENT_PRESETS[selectedAssessment]?.mean || 100} SD=${ASSESSMENT_PRESETS[selectedAssessment]?.sd || 15}`
                    )
                ),
                // Preset subtests
                (ASSESSMENT_PRESETS[selectedAssessment]?.subtests || []).length > 0 && h('div', { className: 'space-y-2' },
                    h('p', { className: 'text-[10px] font-medium text-slate-600' }, `${selectedAssessment} Subtests:`),
                    h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                        (ASSESSMENT_PRESETS[selectedAssessment]?.subtests || []).map(sub => {
                            const existing = scoreEntries.find(s => s.assessment === selectedAssessment && s.subtest === sub);
                            return h('div', { key: sub, className: `flex items-center gap-2 ${existing ? 'opacity-50' : ''}` },
                                h('span', { className: 'text-[10px] text-slate-600 flex-1 truncate' }, sub),
                                !existing ? h('input', {
                                    type: 'number', className: 'w-16 text-xs border rounded px-1.5 py-0.5 text-center',
                                    placeholder: 'Score',
                                    onKeyDown: e => { if (e.key === 'Enter' && e.target.value) { addScoreEntry(sub, e.target.value); e.target.value = ''; } }
                                }) : h('span', { className: `text-[10px] px-2 py-0.5 rounded-full ${cBadge(existing.classColor)}` }, `${existing.score} — ${existing.classification}`)
                            );
                        })
                    )
                ),
                // Custom subtest entry
                h('div', { className: 'flex items-end gap-2 pt-2 border-t border-slate-100' },
                    h('div', { className: 'flex-1' },
                        h('label', { className: 'text-[10px] font-medium text-slate-600 block mb-1' }, 'Custom Subtest'),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-2 py-1.5', placeholder: 'Subtest name...', value: customSubtest, onChange: e => setCustomSubtest(e.target.value) })
                    ),
                    h('div', { className: 'w-20' },
                        h('label', { className: 'text-[10px] font-medium text-slate-600 block mb-1' }, 'Score'),
                        h('input', { type: 'number', className: 'w-full text-xs border rounded-lg px-2 py-1.5 text-center', placeholder: '0', value: customScore, onChange: e => setCustomScore(e.target.value) })
                    ),
                    h('button', {
                        className: 'px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors',
                        onClick: () => { if (customSubtest && customScore) { addScoreEntry(customSubtest, customScore); setCustomSubtest(''); setCustomScore(''); } }
                    }, '+ Add')
                ),
                // Score entries table
                scoreEntries.length > 0 && h('div', { className: 'mt-3 space-y-1' },
                    h('div', { className: 'flex items-center justify-between' },
                        h('p', { className: 'text-[10px] font-bold text-slate-700' }, `${scoreEntries.length} Scores Entered`),
                        h('button', { className: 'text-[10px] text-red-500 hover:text-red-700', onClick: () => setScoreEntries([]) }, 'Clear All')
                    ),
                    h('div', { className: 'max-h-48 overflow-y-auto space-y-1' },
                        scoreEntries.map(s =>
                            h('div', { key: s.id, className: `flex items-center justify-between px-3 py-1.5 rounded-lg text-[10px] ${cBg(s.classColor)} border ${cBorder(s.classColor)}` },
                                h('span', { className: 'font-medium text-slate-800 flex-1' }, `${s.assessment} — ${s.subtest}`),
                                h('span', { className: `font-bold ${cText(s.classColor)}` }, `${s.score}`),
                                h('span', { className: `px-2 py-0.5 rounded-full text-[9px] ${cBadge(s.classColor)}` }, s.classification),
                                s.percentile !== null && h('span', { className: 'text-slate-400' }, `${s.percentile}%ile`),
                                h('button', { className: 'ml-2 text-red-400 hover:text-red-600', onClick: () => removeScoreEntry(s.id) }, '✕')
                            )
                        )
                    )
                ),
                // Next step button
                h('div', { className: 'flex justify-end pt-2' },
                    h('button', { className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors', onClick: () => setCurrentStep(2) }, 'Next: Background →')
                )
            ),
            // ═══ STEP 2: Background & History ═══
            currentStep === 2 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '📋 Background & History'),
                h('p', { className: 'text-[10px] text-slate-500' }, 'Enter background information. PII is auto-scrubbed before any AI processing.'),
                (abcEntries?.length > 0 || observationSessions?.length > 0) && h('button', {
                    className: 'px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[10px] font-medium rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors',
                    onClick: importFromBehaviorLens
                }, `📥 Import from BehaviorLens (${(abcEntries?.length || 0)} ABC + ${(observationSessions?.length || 0)} observations)`),
                [
                    { key: 'referralReason', label: 'Reason for Referral', placeholder: 'Why was this student referred for evaluation?', rows: 2 },
                    { key: 'developmental', label: 'Developmental History', placeholder: 'Developmental milestones, prenatal/birth history...', rows: 3 },
                    { key: 'medical', label: 'Medical History', placeholder: 'Relevant medical diagnoses, medications, vision/hearing...', rows: 2 },
                    { key: 'educational', label: 'Educational History', placeholder: 'Previous schools, grade retention, IEP/504 history, interventions...', rows: 3 },
                    { key: 'social', label: 'Social-Emotional', placeholder: 'Family structure, peer relationships, social skills...', rows: 2 },
                    { key: 'behavioral', label: 'Behavioral Observations', placeholder: 'Classroom behavior, attention, compliance, self-regulation...', rows: 3 },
                    { key: 'observations', label: 'Test Session Observations', placeholder: 'How the student presented during testing...', rows: 2 },
                ].map(({ key, label, placeholder, rows }) =>
                    h('div', { key },
                        h('label', { className: 'text-[10px] font-medium text-slate-600 block mb-1' }, label),
                        h('textarea', {
                            className: 'w-full text-xs border rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400',
                            rows, placeholder, value: bgSections[key],
                            onChange: e => setBgSections(prev => ({ ...prev, [key]: e.target.value }))
                        })
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(1) }, '← Scores'),
                    h('button', { className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => { setCurrentStep(3); if (factChunks.length === 0) extractFactChunks(); } }, 'Next: Review Facts →')
                )
            ),
            // ═══ STEP 3: Fact Chunk Review ═══
            currentStep === 3 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '🔒 Fact Chunk Review'),
                h('p', { className: 'text-[10px] text-slate-500' }, 'Verify each fact. Verified chunks become immutable and serve as ground truth for the report.'),
                // Stats bar
                h('div', { className: 'flex items-center gap-3 bg-slate-50 rounded-lg p-2' },
                    h('span', { className: 'text-[10px] font-medium text-slate-600' }, `${totalChunks} total`),
                    h('span', { className: 'text-[10px] font-medium text-green-600' }, `✅ ${verifiedCount} verified`),
                    h('span', { className: 'text-[10px] font-medium text-slate-400' }, `⏳ ${totalChunks - verifiedCount} pending`),
                    deficitCount > 0 && h('span', { className: 'text-[10px] font-medium text-red-600' }, `⚠️ ${deficitCount} deficits`),
                    totalChunks > 0 && verifiedCount < totalChunks && h('button', {
                        className: 'ml-auto text-[10px] px-2 py-0.5 bg-green-600 text-white rounded-full hover:bg-green-700', onClick: verifyAllChunks
                    }, '✅ Verify All')
                ),
                extracting && h('div', { className: 'text-center py-6' },
                    h('div', { className: 'inline-block animate-spin w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full' }),
                    h('p', { className: 'text-xs text-slate-500 mt-2' }, 'Extracting fact chunks...')
                ),
                // Chunk cards
                !extracting && h('div', { className: 'space-y-2 max-h-[400px] overflow-y-auto' },
                    factChunks.length === 0 && h('div', { className: 'text-center py-8 text-slate-400' },
                        h('p', { className: 'text-sm' }, 'No fact chunks yet'),
                        h('button', { className: 'mt-2 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg', onClick: extractFactChunks }, '🔍 Extract Facts')
                    ),
                    factChunks.map(chunk =>
                        h('div', { key: chunk.id, className: `rounded-lg p-3 border transition-all ${chunk.verified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}` },
                            h('div', { className: 'flex items-start justify-between gap-2' },
                                h('div', { className: 'flex-1' },
                                    h('div', { className: 'flex items-center gap-2 mb-1' },
                                        h('span', { className: `text-[9px] px-1.5 py-0.5 rounded-full font-medium ${chunk.type === 'score' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}` }, chunk.type),
                                        h('span', { className: 'text-[9px] text-slate-500' }, chunk.source),
                                        chunk.verified && h('span', { className: 'text-[9px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold' }, '🔒 Immutable'),
                                        chunk.devNormResult && h('span', { className: `text-[9px] px-1.5 py-0.5 rounded-full font-medium ${cBadge(chunk.devNormResult.color)}` }, chunk.devNormResult.label)
                                    ),
                                    h('p', { className: 'text-xs font-medium text-slate-800' }, `${chunk.field}: ${chunk.type === 'score' ? chunk.value + ' (' + chunk.classification + ')' : chunk.value}`),
                                    chunk.devNormResult?.explanation && h('p', { className: `text-[9px] mt-0.5 ${cText(chunk.devNormResult.color)}` }, chunk.devNormResult.explanation)
                                ),
                                !chunk.verified && h('div', { className: 'flex items-center gap-1' },
                                    h('button', { className: 'px-2 py-1 bg-green-600 text-white text-[10px] rounded hover:bg-green-700', onClick: () => verifyChunk(chunk.id), title: 'Verify & Lock' }, '✅'),
                                    h('button', { className: 'px-2 py-1 bg-red-100 text-red-600 text-[10px] rounded hover:bg-red-200', onClick: () => rejectChunk(chunk.id), title: 'Reject' }, '✕')
                                )
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(2) }, '← Background'),
                    h('button', {
                        className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${verifiedCount > 0 ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`,
                        disabled: verifiedCount === 0, onClick: () => setCurrentStep(4)
                    }, `Next: Generate Report (${verifiedCount} facts) →`)
                )
            ),
            // ═══ STEP 4: Generate Report ═══
            currentStep === 4 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '✍️ Generate Report'),
                h('div', { className: 'flex items-center gap-3 mb-2' },
                    h('div', { className: 'flex-1' },
                        h('label', { className: 'text-[10px] font-medium text-slate-600 block mb-1' }, 'Report Title'),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-3 py-1.5', value: reportTitle, onChange: e => setReportTitle(e.target.value) })
                    ),
                    h('button', {
                        className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${generating ? 'bg-slate-300 text-slate-500 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700'}`,
                        disabled: generating, onClick: generateReport
                    }, generating ? `⏳ ${genProgress || 'Generating...'}` : '✨ Generate Report')
                ),
                generating && h('div', { className: 'space-y-2' },
                    h('div', { className: 'w-full bg-slate-100 rounded-full h-2 overflow-hidden' },
                        h('div', { className: 'h-full bg-violet-500 rounded-full transition-all animate-pulse', style: { width: '60%' } })
                    ),
                    h('p', { className: 'text-[10px] text-center text-violet-600' }, genProgress)
                ),
                // Generated sections
                Object.keys(reportSections).length > 0 && h('div', { className: 'space-y-3 mt-3' },
                    Object.entries(reportSections).map(([section, text]) =>
                        h('div', { key: section, className: 'bg-slate-50 rounded-lg p-3 border border-slate-200' },
                            h('h4', { className: 'text-xs font-bold text-indigo-700 mb-2 border-b border-slate-200 pb-1' }, section),
                            h('div', { className: 'text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap' },
                                text.replace(/\[Student\]/g, studentName || '[Student]')
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(3) }, '← Fact Chunks'),
                    h('button', {
                        className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${Object.keys(reportSections).length > 0 ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`,
                        disabled: Object.keys(reportSections).length === 0, onClick: () => { setCurrentStep(5); if (accuracyResults.length === 0) runAccuracyCheck(); }
                    }, 'Next: Accuracy Check →')
                )
            ),
            // ═══ STEP 5: Accuracy Dashboard ═══
            currentStep === 5 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '🎯 Accuracy Dashboard'),
                h('p', { className: 'text-[10px] text-slate-500' }, 'Triple-check verification: each claim cross-referenced against immutable fact chunks.'),
                checking ? h('div', { className: 'text-center py-8' },
                    h('div', { className: 'inline-block animate-spin w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full' }),
                    h('p', { className: 'text-xs text-slate-500 mt-3' }, 'Running accuracy audit against fact chunks...')
                ) : h('div', { className: 'space-y-3' },
                    // Summary bar
                    accuracyResults.length > 0 && h('div', { className: 'flex items-center gap-4 bg-slate-50 rounded-lg p-3' },
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-green-600' }, accuracyResults.filter(r => r.status === 'verified').length),
                            h('p', { className: 'text-[9px] text-slate-500' }, '🟢 Verified')
                        ),
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-amber-500' }, accuracyResults.filter(r => r.status === 'unsourced').length),
                            h('p', { className: 'text-[9px] text-slate-500' }, '🟡 Unsourced')
                        ),
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-red-600' }, accuracyResults.filter(r => r.status === 'contradicts').length),
                            h('p', { className: 'text-[9px] text-slate-500' }, '🔴 Contradicts')
                        ),
                        h('div', { className: 'ml-auto text-center' },
                            h('p', { className: 'text-lg font-bold text-violet-700' }, `${accuracyResults.length > 0 ? Math.round((accuracyResults.filter(r => r.status === 'verified').length / accuracyResults.length) * 100) : 0}%`),
                            h('p', { className: 'text-[9px] text-slate-500' }, 'Accuracy')
                        ),
                        h('button', { className: 'px-3 py-1 bg-violet-100 text-violet-700 text-[10px] rounded-lg hover:bg-violet-200', onClick: runAccuracyCheck }, '🔄 Re-check')
                    ),
                    // Claim-by-claim results
                    accuracyResults.length > 0 && h('div', { className: 'space-y-1 max-h-[350px] overflow-y-auto' },
                        accuracyResults.map((r, i) =>
                            h('div', { key: i, className: `flex items-start gap-2 px-3 py-2 rounded-lg text-[10px] border ${r.status === 'verified' ? 'bg-green-50 border-green-200' : r.status === 'unsourced' ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}` },
                                h('span', { className: 'text-sm flex-shrink-0 mt-0.5' }, r.status === 'verified' ? '🟢' : r.status === 'unsourced' ? '🟡' : '🔴'),
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('p', { className: 'font-medium text-slate-800 break-words' }, r.claim),
                                    h('p', { className: 'text-slate-500 mt-0.5' }, r.explanation || '')
                                )
                            )
                        )
                    ),
                    accuracyResults.length === 0 && h('div', { className: 'text-center py-8' },
                        h('p', { className: 'text-slate-400 text-xs' }, 'No accuracy results yet'),
                        h('button', { className: 'mt-2 px-4 py-2 bg-violet-600 text-white text-xs rounded-lg', onClick: runAccuracyCheck }, '🎯 Run Accuracy Check')
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(4) }, '← Report'),
                    h('button', { className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(6) }, 'Next: Export →')
                )
            ),
            // ═══ STEP 6: Export ═══
            currentStep === 6 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '📥 Export & Save'),
                // Accuracy summary
                accuracyResults.length > 0 && h('div', { className: `rounded-lg p-3 border ${accuracyResults.filter(r => r.status === 'contradicts').length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}` },
                    h('p', { className: `text-xs font-medium ${accuracyResults.filter(r => r.status === 'contradicts').length > 0 ? 'text-red-700' : 'text-green-700'}` },
                        accuracyResults.filter(r => r.status === 'contradicts').length > 0
                            ? `⚠️ ${accuracyResults.filter(r => r.status === 'contradicts').length} claim(s) contradict fact chunks — review before exporting`
                            : `✅ ${accuracyResults.filter(r => r.status === 'verified').length}/${accuracyResults.length} claims verified — ready to export`
                    )
                ),
                // Export buttons
                h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                    h('button', { className: 'flex flex-col items-center gap-1 px-3 py-3 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors', onClick: exportJSON },
                        h('span', { className: 'text-lg' }, '💾'),
                        h('span', { className: 'text-[10px] font-medium text-violet-700' }, 'Save JSON')
                    ),
                    h('button', { className: 'flex flex-col items-center gap-1 px-3 py-3 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors', onClick: copyFullReport, disabled: Object.keys(reportSections).length === 0 },
                        h('span', { className: 'text-lg' }, '📋'),
                        h('span', { className: 'text-[10px] font-medium text-indigo-700' }, 'Copy Report')
                    ),
                    h('button', { className: 'flex flex-col items-center gap-1 px-3 py-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors', onClick: printReport, disabled: Object.keys(reportSections).length === 0 },
                        h('span', { className: 'text-lg' }, '🖨️'),
                        h('span', { className: 'text-[10px] font-medium text-blue-700' }, 'Print / PDF')
                    ),
                    h('button', { className: 'flex flex-col items-center gap-1 px-3 py-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors', onClick: () => document.getElementById('rw-import-area')?.focus() },
                        h('span', { className: 'text-lg' }, '📂'),
                        h('span', { className: 'text-[10px] font-medium text-emerald-700' }, 'Load JSON')
                    )
                ),
                // Import area
                h('div', { className: 'mt-2' },
                    h('label', { className: 'text-[10px] font-medium text-slate-600 block mb-1' }, 'Import JSON (paste previously exported data):'),
                    h('textarea', {
                        id: 'rw-import-area', className: 'w-full text-[10px] border rounded-lg px-3 py-2 font-mono resize-none h-20',
                        placeholder: 'Paste JSON data here...', value: importText, onChange: e => setImportText(e.target.value)
                    }),
                    importText.trim() && h('button', { className: 'mt-1 px-3 py-1 bg-emerald-600 text-white text-[10px] rounded-lg hover:bg-emerald-700', onClick: importJSON }, '📂 Import Data')
                ),
                // Quick report preview
                Object.keys(reportSections).length > 0 && h('details', { className: 'mt-2 bg-slate-50 rounded-lg border border-slate-200' },
                    h('summary', { className: 'text-xs font-medium text-slate-700 px-3 py-2 cursor-pointer hover:bg-slate-100 rounded-lg' }, '📄 Preview Full Report'),
                    h('div', { className: 'px-4 py-3 space-y-3 max-h-[400px] overflow-y-auto' },
                        h('h2', { className: 'text-sm font-bold text-center text-slate-800' }, reportTitle),
                        h('p', { className: 'text-[10px] text-center text-slate-500' }, `Student: ${studentName || '[Student]'} | Age: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'} | Date: ${new Date().toLocaleDateString()}`),
                        h('hr', { className: 'border-slate-200' }),
                        Object.entries(reportSections).map(([section, text]) =>
                            h('div', { key: section },
                                h('h3', { className: 'text-xs font-bold text-indigo-700 mb-1' }, section),
                                h('p', { className: 'text-[10px] text-slate-700 leading-relaxed whitespace-pre-wrap' }, text.replace(/\[Student\]/g, studentName || '[Student]'))
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-start pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(5) }, '← Accuracy')
                )
            )
        );
    };

    // ─── Module Registration ────────────────────────────────────────────
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.ReportWriter = ({
        onClose,
        callGemini,
        addToast,
        t,
        studentNickname,
        behaviorLensData
    }) => {
        // Extract BehaviorLens data if provided (for cross-module data bridging)
        const blAbcEntries = behaviorLensData?.abcEntries || [];
        const blObsSessions = behaviorLensData?.observationSessions || [];
        const blAiAnalysis = behaviorLensData?.aiAnalysis || null;
        const blStudentProfile = behaviorLensData?.studentProfile || null;

        return h('div', {
            className: 'fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4',
            onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
        },
            h('div', {
                className: 'bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative'
            },
                h('button', {
                    className: 'absolute top-4 right-4 text-slate-400 hover:text-slate-600 text-xl',
                    onClick: onClose
                }, '✕'),
                h(ReportWriterPanel, {
                    studentName: studentNickname || '',
                    abcEntries: blAbcEntries,
                    observationSessions: blObsSessions,
                    aiAnalysis: blAiAnalysis,
                    studentProfile: blStudentProfile,
                    callGemini,
                    t,
                    addToast
                })
            )
        );
    };

    debugLog("ReportWriter module registered ✅");
})();
