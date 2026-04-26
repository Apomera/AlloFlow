// report_writer_module.js
// Report Writer — Clinical report generation module for AlloFlow
// Loaded from GitHub CDN via loadModule('ReportWriter', ...)
// Version: 1.0.0 (Mar 2026)
(function () {
  // WCAG 4.1.3: Status live region for dynamic content announcements
  (function() {
    if (document.getElementById('allo-live-report-writer')) return;
    var liveRegion = document.createElement('div');
    liveRegion.id = 'allo-live-report-writer';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('role', 'status');
    liveRegion.className = 'sr-only';
    liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);border:0';
    document.body.appendChild(liveRegion);
  })();

    // WCAG 2.1 AA: Accessibility CSS injection
    if (!document.getElementById('rw-a11y-css')) {
        var rwA11yStyle = document.createElement('style');
        rwA11yStyle.id = 'rw-a11y-css';
        rwA11yStyle.textContent = [
            '@media (prefers-reduced-motion: reduce) { .fixed.inset-0 *, .fixed.inset-0 *::before, .fixed.inset-0 *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
            '.fixed.inset-0 button:focus-visible, .fixed.inset-0 input:focus-visible, .fixed.inset-0 select:focus-visible, .fixed.inset-0 textarea:focus-visible, .fixed.inset-0 [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 4px; }',
            '.fixed.inset-0 :focus:not(:focus-visible) { outline: none !important; }',
            '.fixed.inset-0 .text-slate-600 { color: #64748b !important; }',
        ].join('\n');
        document.head.appendChild(rwA11yStyle);
    }

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
            return { label: 'Very Low', color: 'red' };
        }
        return SCORE_CLASSIFICATIONS.find(c => score >= c.min && score <= c.max) || { label: 'Unknown', color: 'slate' };
    };

    // ─── Tier 1 RAG: Clinical Reference Tables ─────────────────────────
    const SCORE_INTERPRETATION_GUIDES = {
        'WISC-V': {
            description: 'Wechsler Intelligence Scale for Children, 5th Ed. Measures cognitive ability across five primary index scales.',
            keyPatterns: [
                'A >=15-point discrepancy between VCI and PSI may indicate processing speed concerns impacting academic fluency',
                'A >=15-point discrepancy between VCI and WMI may suggest working memory difficulties despite strong verbal reasoning',
                'FSIQ below 85 with uneven index profile warrants examination of specific processing strengths and weaknesses',
                'WMI and PSI are most sensitive to attention-related difficulties'
            ]
        },
        'BASC-3 (Teacher)': {
            description: 'Behavior Assessment System for Children, 3rd Ed (Teacher). Measures behavioral/emotional functioning in school.',
            keyPatterns: [
                'T-scores >=70 on Externalizing scales are Clinically Significant and typically warrant intervention',
                'Elevated Attention Problems (>=65) combined with elevated Hyperactivity (>=65) is convergent evidence for attention concerns',
                'Low Adaptive Skills (<=35) alongside elevated BSI suggests pervasive functional impact',
                'Teacher-Parent discrepancies >10 T-score points suggest setting-specific behavior patterns'
            ]
        },
        'BASC-3 (Parent)': {
            description: 'Behavior Assessment System for Children, 3rd Ed (Parent). Measures behavioral/emotional functioning at home.',
            keyPatterns: [
                'Parent ratings often differ from teacher due to setting-specific demands',
                'Elevated Internalizing scales (Anxiety, Depression) may be more visible to parents than teachers',
                'Compare Parent vs Teacher Externalizing profiles for setting specificity'
            ]
        },
        'WIAT-4': {
            description: 'Wechsler Individual Achievement Test, 4th Ed. Measures academic achievement in reading, math, written language.',
            keyPatterns: [
                'Achievement scores >=1 SD below cognitive ability (FSIQ) may indicate ability-achievement discrepancy relevant to SLD',
                'Reading Composite below 85 with average or above FSIQ is a key pattern for SLD in Reading',
                'Math Composite below 85 with intact reading suggests domain-specific learning difficulty',
                'Written Language deficits often co-occur with fine motor or executive functioning concerns'
            ]
        },
        'Vineland-3': {
            description: 'Vineland Adaptive Behavior Scales, 3rd Ed. Measures adaptive functioning across communication, daily living, socialization, motor.',
            keyPatterns: [
                'ABC <=70 combined with FSIQ <=70 meets criteria pattern for Intellectual Disability',
                'Significant discrepancy between cognitive ability and adaptive functioning suggests environmental masking or exacerbation',
                'Socialization domain deficits are particularly relevant for autism spectrum evaluations'
            ]
        },
        'BRIEF-2': {
            description: 'Behavior Rating Inventory of Executive Function, 2nd Ed. Measures executive functioning in everyday environments.',
            keyPatterns: [
                'GEC T-score >=65 indicates clinically significant executive dysfunction',
                'Elevated Working Memory + Plan/Organize suggests organizational support needs',
                'Elevated Inhibit + Emotional Control aligns with behavioral regulation concerns',
                'BRI-CRI discrepancy may differentiate behavioral vs cognitive executive profiles'
            ]
        },
        'Conners-4': {
            description: 'Conners 4th Ed. Measures ADHD symptoms and related concerns.',
            keyPatterns: [
                'Inattention/Executive Dysfunction >=65 is a primary indicator for ADHD-Inattentive presentation',
                'Hyperactivity + Impulsivity both >=65 suggests ADHD-Hyperactive/Impulsive or Combined presentation',
                'Emotional Dysregulation elevation may indicate comorbid mood concerns beyond ADHD'
            ]
        }
    };

    const DSM5_SCREENING_CRITERIA = {
        'ADHD': {
            code: '314.0x',
            presentations: ['Predominantly Inattentive', 'Predominantly Hyperactive-Impulsive', 'Combined'],
            keyIndicators: [
                'Six or more symptoms of inattention and/or hyperactivity-impulsivity for children <=16 (five for >=17)',
                'Symptoms present for >=6 months and inconsistent with developmental level',
                'Several symptoms present before age 12',
                'Symptoms present in >=2 settings (e.g., school, home)',
                'Clear evidence symptoms interfere with or reduce quality of functioning'
            ],
            convergentEvidence: [
                'Elevated BASC-3 Attention Problems + Hyperactivity scales',
                'Elevated Conners-4 Inattention and/or Hyperactivity',
                'Low BRIEF-2 Working Memory and Inhibit scales',
                'WISC-V WMI and/or PSI significantly below VCI/FRI'
            ],
            exclusionary: 'Symptoms not better explained by another mental disorder (anxiety, mood, dissociative, personality, substance)'
        },
        'SLD': {
            code: '315.xx',
            presentations: ['With impairment in reading', 'With impairment in written expression', 'With impairment in mathematics'],
            keyIndicators: [
                'Academic skills substantially and quantifiably below expectations for age',
                'Difficulties begin during school-age years',
                'Not better accounted for by ID, sensory issues, neurological conditions, or inadequate instruction'
            ],
            convergentEvidence: [
                'Achievement composite >=1 SD below FSIQ (ability-achievement discrepancy)',
                'Low achievement despite adequate instruction (RTI/MTSS data)',
                'Pattern of strengths and weaknesses in cognitive processing (PSW model)'
            ],
            exclusionary: 'Must rule out: ID, uncorrected vision/hearing, other mental/neurological disorders, psychosocial adversity, inadequate instruction, language proficiency'
        },
        'ASD': {
            code: '299.00',
            keyIndicators: [
                'Persistent deficits in social communication and social interaction across multiple contexts',
                'Restricted, repetitive patterns of behavior, interests, or activities',
                'Symptoms present in early developmental period',
                'Symptoms cause clinically significant impairment in current functioning'
            ],
            convergentEvidence: [
                'Elevated SRS-2 Total Score (>=66 T-score)',
                'Elevated GARS-3 Autism Index',
                'Vineland-3 Socialization domain significantly below other domains',
                'BASC-3 Social Skills and/or Leadership below average with elevated Withdrawal'
            ],
            exclusionary: 'Not better explained by intellectual disability or global developmental delay alone'
        },
        'ID': {
            code: '319',
            presentations: ['Mild', 'Moderate', 'Severe', 'Profound'],
            keyIndicators: [
                'Deficits in intellectual functions confirmed by clinical assessment AND testing (FSIQ approximately <=70)',
                'Deficits in adaptive functioning (failure to meet standards for personal independence)',
                'Onset during the developmental period'
            ],
            convergentEvidence: [
                'WISC-V or similar FSIQ <=70 (consider SEM)',
                'Vineland-3 ABC <=70',
                'Consistent low performance across cognitive and adaptive measures'
            ],
            exclusionary: 'Must consider standard error of measurement; single score should not be sole determinant'
        }
    };

    const IDEA_ELIGIBILITY = {
        'SLD': {
            category: 'Specific Learning Disability',
            definition: 'A disorder in one or more basic psychological processes involved in understanding or using language that may manifest in imperfect ability to listen, think, speak, read, write, spell, or do math.',
            requiredEvidence: [
                'Student does not achieve adequately for age or meet State-approved grade-level standards',
                'Student does not make sufficient progress (RTI) OR exhibits a pattern of strengths and weaknesses (PSW)',
                'Findings are not primarily the result of visual/hearing/motor disability, ID, emotional disturbance, cultural factors, or limited English proficiency'
            ],
            qualifyingAreas: ['Oral expression', 'Listening comprehension', 'Written expression', 'Basic reading skill', 'Reading fluency', 'Reading comprehension', 'Math calculation', 'Math problem solving']
        },
        'OHI': {
            category: 'Other Health Impairment',
            definition: 'Having limited strength, vitality, or alertness (including heightened alertness to environmental stimuli) that results in limited alertness to the educational environment due to chronic or acute health problems including ADHD.',
            requiredEvidence: [
                'Documented health condition (e.g., ADHD diagnosis)',
                'Condition results in limited alertness in the educational environment',
                'Educational performance is adversely affected'
            ]
        },
        'Autism': {
            category: 'Autism',
            definition: 'A developmental disability significantly affecting verbal and nonverbal communication and social interaction, generally evident before age three, that adversely affects educational performance.',
            requiredEvidence: [
                'Documentation of deficits in social communication/interaction',
                'Documentation of restricted, repetitive behaviors or interests',
                'Adverse effect on educational performance',
                'Characteristics not primarily due to emotional disturbance'
            ]
        },
        'ED': {
            category: 'Emotional Disturbance',
            definition: 'A condition exhibiting one or more characteristics over a long period of time and to a marked degree that adversely affects educational performance.',
            requiredEvidence: [
                'Inability to learn unexplained by intellectual, sensory, or health factors',
                'Inability to build or maintain satisfactory interpersonal relationships',
                'Inappropriate types of behavior or feelings under normal circumstances',
                'General pervasive mood of unhappiness or depression',
                'OR tendency to develop physical symptoms or fears associated with personal or school problems'
            ]
        },
        'ID': {
            category: 'Intellectual Disability',
            definition: 'Significantly subaverage general intellectual functioning existing concurrently with deficits in adaptive behavior, manifested during the developmental period, that adversely affects educational performance.',
            requiredEvidence: [
                'Cognitive assessment indicating significantly subaverage functioning (approximately <=70)',
                'Adaptive behavior assessment indicating concurrent deficits',
                'Adverse effect on educational performance'
            ]
        }
    };

    // ── Tier 1 RAG: Context Builder ──────────────────────────────────
    const buildReferenceContext = (scoreEntries, studentAge) => {
        const parts = [];
        // Pull interpretation guides for entered assessments
        const usedAssessments = [...new Set(scoreEntries.map(s => s.assessment))];
        usedAssessments.forEach(a => {
            const guide = SCORE_INTERPRETATION_GUIDES[a];
            if (guide) {
                parts.push('[' + a + ']: ' + guide.description);
                guide.keyPatterns.forEach(p => parts.push('  - ' + p));
            }
        });
        // Cross-battery pattern detection
        const scores = {};
        scoreEntries.forEach(s => { scores[s.assessment + ':' + s.subtest] = s; });
        const vci = scores['WISC-V:Verbal Comprehension'];
        const psi = scores['WISC-V:Processing Speed'];
        const wmi = scores['WISC-V:Working Memory'];
        const fsiq = scores['WISC-V:Full Scale IQ'];
        const readComp = scores['WIAT-4:Reading Composite'];
        const mathComp = scores['WIAT-4:Math Composite'];
        const attn = scores['BASC-3 (Teacher):Attention Problems'];
        const hyper = scores['BASC-3 (Teacher):Hyperactivity'];
        const connIn = scores['Conners-4:Inattention/Executive Dysfunction'];
        if (vci && psi && Math.abs(vci.score - psi.score) >= 15)
            parts.push('CROSS-BATTERY: ' + Math.abs(vci.score - psi.score) + '-point VCI-PSI discrepancy (' + vci.score + ' vs ' + psi.score + ')');
        if (vci && wmi && Math.abs(vci.score - wmi.score) >= 15)
            parts.push('CROSS-BATTERY: ' + Math.abs(vci.score - wmi.score) + '-point VCI-WMI discrepancy (' + vci.score + ' vs ' + wmi.score + ')');
        if (fsiq && readComp && (fsiq.score - readComp.score) >= 15)
            parts.push('ABILITY-ACHIEVEMENT: ' + (fsiq.score - readComp.score) + '-point FSIQ-Reading gap (' + fsiq.score + ' vs ' + readComp.score + ') — relevant for SLD-Reading');
        if (fsiq && mathComp && (fsiq.score - mathComp.score) >= 15)
            parts.push('ABILITY-ACHIEVEMENT: ' + (fsiq.score - mathComp.score) + '-point FSIQ-Math gap (' + fsiq.score + ' vs ' + mathComp.score + ') — relevant for SLD-Math');
        if (attn && attn.score >= 65 && hyper && hyper.score >= 65)
            parts.push('CONVERGENT: BASC-3 Attention (' + attn.score + ') + Hyperactivity (' + hyper.score + ') both elevated — ADHD pattern');
        if (attn && attn.score >= 65 && connIn && connIn.score >= 65)
            parts.push('CONVERGENT: BASC-3 Attention (' + attn.score + ') + Conners Inattention (' + connIn.score + ') — strong cross-measure ADHD convergence');
        // Contextual DSM-5 + IDEA references
        const hasBehElev = scoreEntries.some(s => s.scoreType === 'T-score' && s.score >= 65);
        const hasLowCog = scoreEntries.some(s => s.scoreType === 'standard' && s.score <= 70);
        const hasAchGap = (fsiq && readComp && (fsiq.score - readComp.score) >= 15) || (fsiq && mathComp && (fsiq.score - mathComp.score) >= 15);
        if (hasBehElev) {
            parts.push('\n--- DSM-5 Reference (ADHD) ---');
            parts.push('Key: ' + DSM5_SCREENING_CRITERIA.ADHD.keyIndicators.join('; '));
            parts.push('Exclusionary: ' + DSM5_SCREENING_CRITERIA.ADHD.exclusionary);
            parts.push('--- IDEA: ' + IDEA_ELIGIBILITY.OHI.category + ' ---');
            parts.push(IDEA_ELIGIBILITY.OHI.definition);
        }
        if (hasAchGap) {
            parts.push('\n--- DSM-5 Reference (SLD) ---');
            parts.push('Key: ' + DSM5_SCREENING_CRITERIA.SLD.keyIndicators.join('; '));
            parts.push('Exclusionary: ' + DSM5_SCREENING_CRITERIA.SLD.exclusionary);
            parts.push('--- IDEA: ' + IDEA_ELIGIBILITY.SLD.category + ' ---');
            parts.push(IDEA_ELIGIBILITY.SLD.definition);
        }
        if (hasLowCog) {
            parts.push('\n--- DSM-5 Reference (ID) ---');
            parts.push('Key: ' + DSM5_SCREENING_CRITERIA.ID.keyIndicators.join('; '));
            parts.push('--- IDEA: ' + IDEA_ELIGIBILITY.ID.category + ' ---');
            parts.push(IDEA_ELIGIBILITY.ID.definition);
        }
        return parts.length > 0 ? parts.join('\n') : '';
    };

    const crossReferenceDevNorms = (domain, value, studentAge) => {
        const norms = DEVELOPMENTAL_NORMS[domain];
        if (!norms || !studentAge) return null;
        const ageNorm = norms.find(n => studentAge >= n.ageMin && studentAge <= n.ageMax);
        if (!ageNorm) return null;
        if (ageNorm.typicalMin !== undefined) {
            // Check clinical threshold first (e.g., tantrum frequency above threshold is always clinical)
            if (ageNorm.clinicalThreshold !== undefined && value >= ageNorm.clinicalThreshold) return { type: 'clinical', label: 'Clinically Elevated', color: 'red', explanation: `Value of ${value} ${ageNorm.unit} exceeds the clinical threshold of ${ageNorm.clinicalThreshold} ${ageNorm.unit} for age ${studentAge} (typical range: ${ageNorm.typicalMin}–${ageNorm.typicalMax})` };
            // Within typical range
            if (value >= ageNorm.typicalMin && value <= ageNorm.typicalMax) return { type: 'appropriate', label: 'Developmentally Appropriate', color: 'green', explanation: `Value of ${value} ${ageNorm.unit} falls within the typical range of ${ageNorm.typicalMin}–${ageNorm.typicalMax} ${ageNorm.unit} for age ${studentAge}` };
            // Above typical max but below clinical threshold (elevated but not clinical)
            if (value > ageNorm.typicalMax) return { type: 'borderline', label: 'Elevated', color: 'amber', explanation: `Value of ${value} ${ageNorm.unit} exceeds the typical range of ${ageNorm.typicalMin}–${ageNorm.typicalMax} ${ageNorm.unit} for age ${studentAge}` };
            // Below typical min — check one year back
            const oneYearBack = norms.find(n => (studentAge - 1) >= n.ageMin && (studentAge - 1) <= n.ageMax);
            if (oneYearBack && value >= oneYearBack.typicalMin) return { type: 'borderline', label: 'Borderline', color: 'amber', explanation: `Value of ${value} ${ageNorm.unit} is below typical for age ${studentAge} (expected ${ageNorm.typicalMin}–${ageNorm.typicalMax}) but within range for age ${studentAge - 1}` };
            return { type: 'deficit', label: 'Significant Deficit', color: 'red', explanation: `Value of ${value} ${ageNorm.unit} is significantly below the typical range of ${ageNorm.typicalMin}–${ageNorm.typicalMax} ${ageNorm.unit} for age ${studentAge}` };
        }
        if (ageNorm.stage) return { type: 'reference', label: ageNorm.stage, color: 'sky', explanation: `Typical for age ${studentAge}: ${ageNorm.stage} — ${ageNorm.desc}` };
        return null;
    };

    // ── Hypothesis Presets ──────────────────────────────────────
    const HYPOTHESIS_PRESETS = [
        'ADHD — Predominantly Inattentive',
        'ADHD — Combined Presentation',
        'Specific Learning Disability — Reading',
        'Specific Learning Disability — Math',
        'Specific Learning Disability — Written Expression',
        'Autism Spectrum Disorder',
        'Intellectual Disability',
        'Emotional Disturbance',
        'Speech/Language Impairment',
        'No Diagnosis / Does Not Qualify',
    ];

    // ── Blueprint Templates ────────────────────────────────────
    const BLUEPRINT_TEMPLATES = {
        'Psychoeducational': [
            { name: 'Reason for Referral', notes: '', enabled: true },
            { name: 'Background Information', notes: '', enabled: true },
            { name: 'Assessment Results & Interpretation', notes: '', enabled: true },
            { name: 'Behavioral Observations', notes: '', enabled: true },
            { name: 'Differential Analysis', notes: '', enabled: true },
            { name: 'Summary & Diagnostic Impressions', notes: '', enabled: true },
            { name: 'Recommendations', notes: '', enabled: true },
        ],
        'Functional Behavior Assessment': [
            { name: 'Reason for Referral', notes: '', enabled: true },
            { name: 'Background & History', notes: '', enabled: true },
            { name: 'Operational Definitions of Behavior', notes: '', enabled: true },
            { name: 'Data Collection & Analysis', notes: '', enabled: true },
            { name: 'Antecedent-Behavior-Consequence Analysis', notes: '', enabled: true },
            { name: 'Setting Events & Motivating Operations', notes: '', enabled: true },
            { name: 'Hypothesis Statement', notes: '', enabled: true },
            { name: 'Replacement Behaviors', notes: '', enabled: true },
            { name: 'Recommendations & Intervention Plan', notes: '', enabled: true },
        ],
        'Speech-Language': [
            { name: 'Reason for Referral', notes: '', enabled: true },
            { name: 'Background Information', notes: '', enabled: true },
            { name: 'Assessment Procedures', notes: '', enabled: true },
            { name: 'Language Assessment Results', notes: '', enabled: true },
            { name: 'Articulation/Phonology Results', notes: '', enabled: true },
            { name: 'Pragmatic Language Observations', notes: '', enabled: true },
            { name: 'Summary & Impressions', notes: '', enabled: true },
            { name: 'Recommendations', notes: '', enabled: true },
        ],
        'Occupational Therapy': [
            { name: 'Reason for Referral', notes: '', enabled: true },
            { name: 'Background Information', notes: '', enabled: true },
            { name: 'Fine Motor Assessment', notes: '', enabled: true },
            { name: 'Sensory Processing Assessment', notes: '', enabled: true },
            { name: 'Visual-Motor Integration', notes: '', enabled: true },
            { name: 'Functional Performance', notes: '', enabled: true },
            { name: 'Summary & Recommendations', notes: '', enabled: true },
        ],
    };

    const REFS_STORAGE_KEY = 'allo_rw_refs';
    const STYLE_STORAGE_KEY = 'allo_rw_style';

    // ─── Report Writer Panel ─────────────────────────────────────
    const DRAFT_KEY = 'allo_rw_draft';
    const SAVED_KEY = 'allo_rw_saved';
    const safeGetItem = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const safeSetItem = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { warnLog('localStorage write failed:', e); } };

    const ReportWriterPanel = ({ studentName, abcEntries, observationSessions, aiAnalysis, studentProfile, longitudinalData, dashboardData, callGemini, t, addToast }) => {
        const STEPS = [
            { num: 1, label: 'Assessment Scores', icon: '📊' },
            { num: 2, label: 'Background & History', icon: '📋' },
            { num: 3, label: 'Fact Chunk Review', icon: '🔒' },
            { num: 4, label: 'Diagnostic Hypotheses', icon: '🔬' },
            { num: 5, label: 'Report Blueprint', icon: '📐' },
            { num: 6, label: 'Generate Report', icon: '✍️' },
            { num: 7, label: 'Accuracy Dashboard', icon: '🎯' },
            { num: 8, label: 'Export', icon: '📥' },
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
        const [reportGenPasses, setReportGenPasses] = useState(3); // triangulated generation: 1-5 parallel passes per section
        // Step 5: Accuracy
        const [accuracyResults, setAccuracyResults] = useState([]);
        const [clinicianAttested, setClinicianAttested] = useState(false);
        const [checking, setChecking] = useState(false);
        // Step 6: Export
        const [importText, setImportText] = useState('');
        const [savedReports, setSavedReports] = useState([]);
        const [saveReportName, setSaveReportName] = useState('');
        // Reference Library
        const [referenceLibrary, setReferenceLibrary] = useState([]);
        const [newRefName, setNewRefName] = useState('');
        const [newRefText, setNewRefText] = useState('');
        // Step 4: Diagnostic Hypotheses
        const [hypotheses, setHypotheses] = useState(['No Diagnosis / Does Not Qualify']);
        const [selectedHypotheses, setSelectedHypotheses] = useState([]);
        const [differentialResults, setDifferentialResults] = useState({});
        const [runningDifferential, setRunningDifferential] = useState(false);
        const [newHypothesis, setNewHypothesis] = useState('');
        // Step 5: Blueprint
        const [blueprint, setBlueprint] = useState(BLUEPRINT_TEMPLATES['Psychoeducational'].map(s => ({ ...s, id: uid() })));
        const [styleProfile, setStyleProfile] = useState('');
        const [reportType, setReportType] = useState('Psychoeducational');
        // Phase 2: Evidence Mapping & Section Drafting
        const [sectionEvidenceMap, setSectionEvidenceMap] = useState({});
        const [editingSection, setEditingSection] = useState(null);
        const [editSectionText, setEditSectionText] = useState('');
        const [regenSection, setRegenSection] = useState(null);
        const [regenInstructions, setRegenInstructions] = useState('');
        const [showRegenInput, setShowRegenInput] = useState(null);
        // Phase 3a: Missing state declarations
        const [manualStudentName, setManualStudentName] = useState('');
        const [isDemoLoaded, setIsDemoLoaded] = useState(false);
        const [clinicalObs, setClinicalObs] = useState({
            testSession: { text: '', source: 'Test Session Observations' },
            behavioral: { text: '', source: 'Classroom/Behavioral Observations' },
            parentInterview: { text: '', source: 'Parent Interview' },
            teacherInterview: { text: '', source: 'Teacher Interview' },
            studentInterview: { text: '', source: 'Student Interview' },
            otherSources: { text: '', source: 'Other Collateral Sources' }
        });
        const [activeObsTab, setActiveObsTab] = useState('testSession');
        const [selectedStudentId, setSelectedStudentId] = useState('');
        // Phase 3a: Translation & Grade-Level Adaptation
        const [translating, setTranslating] = useState(false);
        const [translatedReport, setTranslatedReport] = useState('');
        const [translationLang, setTranslationLang] = useState('Spanish');
        const [adaptingSection, setAdaptingSection] = useState(null);
        const [generatingDemo, setGeneratingDemo] = useState(false);


        // ── Demo Data Generator ──
        const DEMO_CASES = {
            'adhd_combined': {
                label: 'Case A: ADHD-Combined (8yo, 3rd grade)',
                studentAge: '8', studentGrade: '3rd',
                reportTitle: 'Psychoeducational Evaluation Report',
                scores: [
                    { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 102, scoreType: 'standard' },
                    { assessment: 'WISC-V', subtest: 'Verbal Comprehension', score: 108, scoreType: 'standard' },
                    { assessment: 'WISC-V', subtest: 'Working Memory', score: 82, scoreType: 'standard' },
                    { assessment: 'WISC-V', subtest: 'Processing Speed', score: 78, scoreType: 'standard' },
                    { assessment: 'Conners-4', subtest: 'Inattention/Executive Dysfunction', score: 72, scoreType: 'T-score' },
                    { assessment: 'Conners-4', subtest: 'Hyperactivity', score: 68, scoreType: 'T-score' },
                    { assessment: 'BASC-3 (Teacher)', subtest: 'Attention Problems', score: 71, scoreType: 'T-score' },
                    { assessment: 'BASC-3 (Teacher)', subtest: 'Hyperactivity', score: 66, scoreType: 'T-score' },
                ],
                bgSections: {
                    referralReason: 'Referred by classroom teacher due to persistent difficulties with sustained attention, task completion, and impulse control interfering with academic progress.',
                    developmental: 'Born full-term, no complications. Met motor milestones on time. Speech development slightly delayed (first words at 18 months, sentences by age 3). No history of regression.',
                    medical: 'Diagnosed with mild asthma, managed with inhaler. Vision and hearing screening within normal limits (2025). No current medications. Family history of ADHD (father diagnosed as adult).',
                    educational: 'Attended district schools since kindergarten. Currently in general education 3rd grade classroom. Tier 2 reading intervention in 1st grade (discontinued after progress). No prior IEP or 504 plan. Current grades: B- average with declining homework completion.',
                    social: 'Lives with both parents and younger sibling (age 5). Parents report generally positive peer relationships but notes student sometimes "overwhelms" peers with energy. Gets along well with adults.',
                    behavioral: 'Teacher reports frequent off-task behavior, difficulty remaining seated, calling out answers, and losing materials. Behavior more pronounced during independent seatwork and transitions. Responds well to structured activities and 1:1 attention.',
                    observations: ''
                },
                clinicalObs: {
                    testSession: { text: 'Student was cooperative and engaged during testing. Required frequent redirection to maintain focus on tasks. Fidgeted in seat and frequently shifted positions. Rushed through timed tasks. Showed frustration during sustained attention tasks but recovered quickly with encouragement. Rapport was easily established.', source: 'Test Session Observations' },
                    behavioral: { text: 'During 30-minute classroom observation, student was off-task approximately 40% of the interval observations. Left seat 3 times without permission. Called out answers 5 times during whole-group instruction. Engaged appropriately during hands-on science activity. Peer interactions appeared age-appropriate during recess.', source: 'Classroom Observation' },
                    parentInterview: { text: 'Parents report that student has always been "high energy" since toddlerhood. Homework takes 2-3 hours nightly due to frequent breaks and distractibility. Student often forgets to bring homework home or loses completed assignments. At home, student has difficulty following multi-step directions and frequently interrupts conversations. Enjoys Legos, video games, and playing outside. No concerns about mood or anxiety.', source: 'Parent Interview' },
                    teacherInterview: { text: 'Teacher reports student is bright and capable but consistently underperforms due to attention difficulties. Struggles most during independent reading and math worksheet time. Performs well in small group instruction and collaborative activities. Organizational skills are a significant concern — desk is disorganized, loses pencils/materials daily. Teacher has tried preferential seating, fidget tools, and visual timers with limited success.', source: 'Teacher Interview' },
                    studentInterview: { text: '', source: 'Student Interview' },
                    otherSources: { text: '', source: 'Other Collateral Sources' }
                }
            },
            'sld_reading': {
                label: 'Case B: SLD-Reading (10yo, 5th grade)',
                studentAge: '10', studentGrade: '5th',
                reportTitle: 'Psychoeducational Evaluation Report',
                scores: [
                    { assessment: 'WISC-V', subtest: 'Full Scale IQ', score: 96, scoreType: 'standard' },
                    { assessment: 'WISC-V', subtest: 'Verbal Comprehension', score: 94, scoreType: 'standard' },
                    { assessment: 'WISC-V', subtest: 'Working Memory', score: 98, scoreType: 'standard' },
                    { assessment: 'WISC-V', subtest: 'Processing Speed', score: 91, scoreType: 'standard' },
                    { assessment: 'WIAT-4', subtest: 'Reading Composite', score: 76, scoreType: 'standard' },
                    { assessment: 'WIAT-4', subtest: 'Math Composite', score: 95, scoreType: 'standard' },
                    { assessment: 'BASC-3 (Teacher)', subtest: 'Attention Problems', score: 54, scoreType: 'T-score' },
                    { assessment: 'BASC-3 (Teacher)', subtest: 'Anxiety', score: 62, scoreType: 'T-score' },
                ],
                bgSections: {
                    referralReason: 'Referred by parents and teacher due to significant reading difficulties despite years of reading intervention. Student is falling further behind grade-level expectations.',
                    developmental: 'Pregnancy and birth unremarkable. Met all motor milestones on time. Speech development was normal. No family history of learning disabilities reported initially; upon further questioning, mother reports her brother had reading difficulties in school.',
                    medical: 'No significant medical history. Vision corrected with glasses (near-sightedness, diagnosed age 8). Hearing within normal limits. No medications.',
                    educational: 'Attended district schools K-5. Received Tier 2 reading intervention since 2nd grade, moved to Tier 3 in 4th grade with minimal progress. Currently reading at approximately 2nd grade level per curriculum-based measures. Math performance is grade-appropriate. No IEP; 504 plan for extended time was implemented in 4th grade.',
                    social: 'Lives with mother and stepfather. Two older step-siblings (ages 14, 16). Student is described as well-liked by peers but avoids reading aloud in class. Has begun expressing frustration about school ("I\'m stupid at reading"). Enjoys drawing, building models, and soccer.',
                    behavioral: 'No significant behavioral concerns. Teacher notes student occasionally avoids reading tasks or rushes through them. No attention concerns outside of reading-related activities.',
                    observations: ''
                },
                clinicalObs: {
                    testSession: { text: 'Student was cooperative but appeared anxious during reading-related tasks. Repeatedly asked "is this one timed?" before subtests. Used finger-tracking during reading passages. Made multiple self-corrections during oral reading. Demonstrated strong problem-solving skills on non-verbal tasks and showed visible relief during math subtests.', source: 'Test Session Observations' },
                    behavioral: { text: '', source: 'Classroom/Behavioral Observations' },
                    parentInterview: { text: 'Mother reports student has always struggled with reading since learning letter sounds in kindergarten. Student avoids reading at home but enjoys being read to. Homework involving reading takes significantly longer than math homework. Parents hired a private tutor for 6 months in 3rd grade with some progress in phonics but fluency remains very low. Student has recently begun saying they "hate school" and gets stomachaches before school on days with reading tests.', source: 'Parent Interview' },
                    teacherInterview: { text: 'Teacher reports student is engaged and motivated in subjects that do not require extensive reading (math, science labs, art). Reading fluency is significantly below peers — approximately 65 words per minute vs. grade-level expectation of 130+ wpm. Comprehension is stronger when text is read aloud to student. Spelling is inconsistent with phonological errors. Written expression is limited in quantity but ideas are age-appropriate when dictated.', source: 'Teacher Interview' },
                    studentInterview: { text: '', source: 'Student Interview' },
                    otherSources: { text: 'Tutoring records indicate 6 months of Orton-Gillingham-based intervention with measurable progress in phonics accuracy (60% to 82%) but limited transfer to connected text fluency.', source: 'Private Tutor Records' }
                }
            }
        };

        const loadDemoCase = (caseKey) => {
            const demo = DEMO_CASES[caseKey];
            if (!demo) return;
            setReportTitle(demo.reportTitle);
            setStudentAge(demo.studentAge);
            setStudentGrade(demo.studentGrade);
            setManualStudentName('[DEMO STUDENT]');
            setBgSections(demo.bgSections);
            setClinicalObs(demo.clinicalObs);
            // Build score entries
            const demoScores = demo.scores.map(s => {
                const preset = ASSESSMENT_PRESETS[s.assessment] || {};
                const classification = classifyScore(s.score, s.scoreType);
                const percentile = s.scoreType === 'standard' ? Math.round(((1 + (function (z) { const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911; const sign = z < 0 ? -1 : 1; z = Math.abs(z) / Math.sqrt(2); const tt = 1 / (1 + p * z); return sign * (1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-z * z)); })((s.score - (preset.mean || 100)) / (preset.sd || 15))) / 2) * 100) : null;
                return { id: uid(), assessment: s.assessment, subtest: s.subtest, score: s.score, scoreType: s.scoreType, classification: classification.label, classColor: classification.color, percentile, addedAt: new Date().toISOString() };
            });
            setScoreEntries(demoScores);
            setFactChunks([]);
            setReportSections({});
            setAccuracyResults([]);
            setIsDemoLoaded(true);
            if (addToast) addToast(`Demo case "${demo.label}" loaded — [DEMO DATA, NOT A REAL STUDENT]`, 'success');
        };

        // ── AI-Powered Demo Data Generator ──
        const generateAIDemoCase = async () => {
            if (!callGemini) { if (addToast) addToast('AI not available', 'error'); return; }
            setGeneratingDemo(true);
            try {
                const prompt = `You are a clinical data generator for a school psychology training tool. Generate a FICTIONAL but realistic demo case for a psychoeducational evaluation.

IMPORTANT: This is 100% fictional training data. Generate realistic but fake assessment data.

Randomly choose ONE primary profile from: ADHD-Inattentive, ADHD-Combined, SLD-Reading, SLD-Math, SLD-Written, ASD Level 1, Anxiety Disorder, Emotional Disturbance, Intellectual Disability (Mild), Speech-Language Impairment, or a comorbid profile.

Randomize the student age between 5-17 and grade appropriately.

Return ONLY valid JSON with this exact structure:
{
  "label": "Case: [Diagnosis] ([age]yo, [grade] grade)",
  "studentAge": "[number]",
  "studentGrade": "[ordinal like 3rd]",
  "reportTitle": "Psychoeducational Evaluation Report",
  "scores": [
    { "assessment": "[from: WISC-V, WIAT-4, BASC-3 (Teacher), BASC-3 (Parent), Conners-4, Vineland-3, BRIEF-2, CELF-5, BOT-2, SRS-2]", "subtest": "[valid subtest name]", "score": [realistic number], "scoreType": "[standard or T-score]" }
  ],
  "bgSections": {
    "referralReason": "[2-3 sentences]",
    "developmental": "[2-3 sentences]",
    "medical": "[2-3 sentences]",
    "educational": "[3-4 sentences]",
    "social": "[2-3 sentences]",
    "behavioral": "[2-3 sentences]",
    "observations": ""
  },
  "clinicalObs": {
    "testSession": { "text": "[3-4 sentences about testing behavior]", "source": "Test Session Observations" },
    "behavioral": { "text": "[3-4 sentences about classroom behavior]", "source": "Classroom Observation" },
    "parentInterview": { "text": "[3-4 sentences from parent perspective]", "source": "Parent Interview" },
    "teacherInterview": { "text": "[3-4 sentences from teacher perspective]", "source": "Teacher Interview" },
    "studentInterview": { "text": "", "source": "Student Interview" },
    "otherSources": { "text": "", "source": "Other Collateral Sources" }
  }
}

Include 6-10 assessment scores using REAL subtest names from the assessment batteries listed. Make scores clinically consistent with the chosen profile. Use person-first language in all narrative sections.`;

                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else throw new Error('Could not parse AI response'); }

                // Load the generated case using the same pattern as loadDemoCase
                setReportTitle(parsed.reportTitle || 'Psychoeducational Evaluation Report');
                setStudentAge(parsed.studentAge || '');
                setStudentGrade(parsed.studentGrade || '');
                setManualStudentName('[AI DEMO STUDENT]');
                if (parsed.bgSections) setBgSections(parsed.bgSections);
                if (parsed.clinicalObs) setClinicalObs(parsed.clinicalObs);
                // Build score entries
                const demoScores = (parsed.scores || []).map(s => {
                    const preset = ASSESSMENT_PRESETS[s.assessment] || {};
                    const classification = classifyScore(s.score, s.scoreType);
                    const percentile = s.scoreType === 'standard' ? Math.round(((1 + (function (z) { const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911; const sign = z < 0 ? -1 : 1; z = Math.abs(z) / Math.sqrt(2); const tt = 1 / (1 + p * z); return sign * (1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-z * z)); })((s.score - (preset.mean || 100)) / (preset.sd || 15))) / 2) * 100) : null;
                    return { id: uid(), assessment: s.assessment, subtest: s.subtest, score: s.score, scoreType: s.scoreType, classification: classification.label, classColor: classification.color, percentile, addedAt: new Date().toISOString() };
                });
                setScoreEntries(demoScores);
                setFactChunks([]);
                setReportSections({});
                setAccuracyResults([]);
                setIsDemoLoaded(true);
                if (addToast) addToast(`AI demo case "${parsed.label}" generated — [FICTIONAL DATA, NOT A REAL STUDENT]`, 'success');
            } catch (err) {
                warnLog('AI demo generation error:', err);
                if (addToast) addToast('AI demo generation failed — try again or use a preset case', 'error');
            } finally { setGeneratingDemo(false); }
        };

        // ── Grade-Level Adaptation ──
        const adaptSectionGradeLevel = async (section, text, targetLevel) => {
            if (!callGemini || !text) return;
            setAdaptingSection(section);
            try {
                const prompt = `You are a clinical report editor. Adapt the following report section for a ${targetLevel} reading audience while preserving ALL factual content and clinical accuracy.
${RESTORATIVE_PREAMBLE}

Rules:
1. Keep ALL scores, classifications, and factual claims EXACTLY as written
2. Adjust vocabulary complexity and sentence structure for the target audience
3. For "Parent-Friendly": use plain language, avoid jargon, explain technical terms
4. For "Professional": maintain clinical terminology and formal style
5. For "Student-Friendly (Elem)": use simple words, short sentences, encouraging tone
6. For "Student-Friendly (Secondary)": age-appropriate language, respectful tone
7. Do NOT add or remove any factual information
8. Reference the student as "[Student]"

Target Level: ${targetLevel}

Original Section:
${text}

Return ONLY the adapted text, no commentary.`;
                const result = await callGemini(prompt, true);
                setReportSections(prev => ({ ...prev, [section]: result.trim() }));
                setAccuracyResults([]);
                if (addToast) addToast(`"${section}" adapted for ${targetLevel} reading level`, 'success');
            } catch (err) {
                warnLog('Grade-level adaptation error:', err);
                if (addToast) addToast('Adaptation failed', 'error');
            } finally { setAdaptingSection(null); }
        };

        // ── Report Translation ──
        const translateReport = async () => {
            if (!callGemini || Object.keys(reportSections).length === 0) return;
            setTranslating(true);
            try {
                const header = `${reportTitle}\nStudent: ${studentName || '[Student]'}\nAge: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'}\nDate: ${new Date().toLocaleDateString()}\n${'─'.repeat(50)}\n\n`;
                const body = Object.entries(reportSections).map(([k, v]) => `${k.toUpperCase()}\n\n${v.replace(/\[Student\]/g, studentName || '[Student]')}`).join('\n\n' + '─'.repeat(50) + '\n\n');
                const fullReport = header + body;
                const prompt = `Translate the following psychoeducational report into ${translationLang}. Maintain all clinical terminology accuracy — use the accepted ${translationLang} clinical equivalents for assessment names and diagnostic terms. Keep all scores, numbers, and assessment names (WISC-V, BASC-3, etc.) in their original form. Preserve all formatting including headers and section breaks.\n\n${fullReport}`;
                const result = await callGemini(prompt, true);
                setTranslatedReport(result.trim());
                if (addToast) addToast(`Report translated to ${translationLang} ✅`, 'success');
            } catch (err) {
                warnLog('Translation error:', err);
                if (addToast) addToast('Translation failed', 'error');
            } finally { setTranslating(false); }
        };
        const copyTranslatedReport = () => {
            navigator.clipboard.writeText(translatedReport).then(() => { if (addToast) addToast('Translated report copied ✅', 'success'); });
        };

        const OBS_TAB_META = [
            { key: 'testSession', label: 'Test Session', icon: '\u{1F52C}', placeholder: 'Describe the student behavior, affect, engagement, and effort during the testing session...' },
            { key: 'behavioral', label: 'Classroom/Behavioral', icon: '\u{1F441}\uFE0F', placeholder: 'Describe in-vivo classroom or behavioral observations, including ABC data...' },
            { key: 'parentInterview', label: 'Parent Interview', icon: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}', placeholder: 'Summarize parent/caregiver interview notes or paste transcript...' },
            { key: 'teacherInterview', label: 'Teacher Interview', icon: '\u{1F469}\u200D\u{1F3EB}', placeholder: 'Summarize teacher interview notes or paste transcript...' },
            { key: 'studentInterview', label: 'Student Interview', icon: '\u{1F9D2}', placeholder: 'Optional: student self-report or interview notes...' },
            { key: 'otherSources', label: 'Other Sources', icon: '\u{1F4CE}', placeholder: 'Any additional collateral sources (e.g., tutor notes, medical records summaries)...' }
        ];

        // ── Auto-load draft from localStorage on mount ──
        useEffect(() => {
            try {
                const draft = safeGetItem(DRAFT_KEY);
                if (draft) {
                    const d = JSON.parse(draft);
                    if (d.reportTitle) setReportTitle(d.reportTitle);
                    if (d.studentAge) setStudentAge(d.studentAge);
                    if (d.studentGrade) setStudentGrade(d.studentGrade);
                    if (d.scoreEntries?.length) setScoreEntries(d.scoreEntries);
                    if (d.bgSections) setBgSections(prev => ({ ...prev, ...d.bgSections }));
                    if (d.factChunks?.length) setFactChunks(d.factChunks);
                    if (d.reportSections && Object.keys(d.reportSections).length) setReportSections(d.reportSections);
                    if (d.accuracyResults?.length) setAccuracyResults(d.accuracyResults);
                    if (d.hypotheses?.length) setHypotheses(d.hypotheses);
                    if (d.selectedHypotheses?.length) setSelectedHypotheses(d.selectedHypotheses);
                    if (d.differentialResults) setDifferentialResults(d.differentialResults);
                    if (d.blueprint?.length) setBlueprint(d.blueprint);
                    if (d.styleProfile) setStyleProfile(d.styleProfile);
                    if (d.reportType) setReportType(d.reportType);
                    if (d.sectionEvidenceMap) setSectionEvidenceMap(d.sectionEvidenceMap);
                    debugLog('Draft restored from localStorage');
                }
                const refs = safeGetItem(REFS_STORAGE_KEY);
                if (refs) setReferenceLibrary(JSON.parse(refs) || []);
                const styleSaved = safeGetItem(STYLE_STORAGE_KEY);
                if (styleSaved) setStyleProfile(styleSaved);
                const saved = safeGetItem(SAVED_KEY);
                if (saved) setSavedReports(JSON.parse(saved) || []);
            } catch (e) { warnLog('Draft load error:', e); }
        }, []);

        // ── Auto-save draft (debounced) ──
        useEffect(() => {
            const timer = setTimeout(() => {
                try {
                    const snapshot = { reportTitle, studentAge, studentGrade, scoreEntries, bgSections, factChunks, reportSections, accuracyResults, hypotheses, selectedHypotheses, differentialResults, blueprint, styleProfile, reportType, sectionEvidenceMap, savedAt: new Date().toISOString() };
                    safeSetItem(DRAFT_KEY, JSON.stringify(snapshot));
                } catch (e) { warnLog('Auto-save error:', e); }
            }, 1500);
            return () => clearTimeout(timer);
        }, [reportTitle, studentAge, studentGrade, scoreEntries, bgSections, factChunks, reportSections, accuracyResults, hypotheses, selectedHypotheses, differentialResults, blueprint, styleProfile, reportType, sectionEvidenceMap]);

        // ── Reference Library + Style persistence ──
        useEffect(() => { try { safeSetItem(REFS_STORAGE_KEY, JSON.stringify(referenceLibrary)); } catch (e) { } }, [referenceLibrary]);
        useEffect(() => { try { safeSetItem(STYLE_STORAGE_KEY, styleProfile); } catch (e) { } }, [styleProfile]);

        // ── Saved Reports helpers ──
        const saveReportToGallery = () => {
            const name = saveReportName.trim() || `Report ${new Date().toLocaleDateString()}`;
            const entry = { id: uid(), name, savedAt: new Date().toISOString(), reportTitle, studentAge, studentGrade, scoreEntries, bgSections, factChunks, reportSections, accuracyResults };
            const updated = [entry, ...savedReports].slice(0, 20);
            setSavedReports(updated);
            safeSetItem(SAVED_KEY, JSON.stringify(updated));
            setSaveReportName('');
            if (addToast) addToast(`Report "${name}" saved ✅`, 'success');
        };
        const loadSavedReport = (entry) => {
            if (entry.reportTitle) setReportTitle(entry.reportTitle);
            if (entry.studentAge) setStudentAge(entry.studentAge);
            if (entry.studentGrade) setStudentGrade(entry.studentGrade);
            if (entry.scoreEntries) setScoreEntries(entry.scoreEntries);
            if (entry.bgSections) setBgSections(entry.bgSections);
            if (entry.factChunks) setFactChunks(entry.factChunks);
            if (entry.reportSections) setReportSections(entry.reportSections);
            if (entry.accuracyResults) setAccuracyResults(entry.accuracyResults);
            setCurrentStep(1);
            if (addToast) addToast(`Loaded "${entry.name}"`, 'success');
        };
        const deleteSavedReport = (id) => {
            const updated = savedReports.filter(r => r.id !== id);
            setSavedReports(updated);
            safeSetItem(SAVED_KEY, JSON.stringify(updated));
        };
        const clearDraft = () => {
            try { localStorage.removeItem(DRAFT_KEY); } catch { }
            setReportTitle('Psychoeducational Evaluation Report');
            setStudentAge(''); setStudentGrade('');
            setScoreEntries([]); setBgSections({ referralReason: '', developmental: '', medical: '', educational: '', social: '', behavioral: '', observations: '' });
            setFactChunks([]); setReportSections({}); setAccuracyResults([]);
            setCurrentStep(1);
            if (addToast) addToast('Draft cleared', 'info');
        };

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

        // ── Step 2: Import Longitudinal Student Progress ──
        const importStudentProgress = () => {
            if (!longitudinalData) { if (addToast) addToast('No student progress data available', 'info'); return; }
            let educational = bgSections.educational || '';
            let behavioral = bgSections.behavioral || '';
            // History: summarise topic interactions
            const hist = longitudinalData.history || [];
            if (hist.length > 0) {
                educational += '\n\n--- Imported from AlloFlow Learning History ---\n';
                const typeCounts = {};
                hist.forEach(h => { typeCounts[h.type || 'unknown'] = (typeCounts[h.type || 'unknown'] || 0) + 1; });
                educational += `Total learning interactions: ${hist.length}\n`;
                educational += `Activity breakdown: ${Object.entries(typeCounts).map(([k, v]) => `${k}: ${v}`).join(', ')}\n`;
                const recent = hist.slice(-5);
                educational += `Recent activities: ${recent.map(h => h.type + (h.topic ? ' (' + h.topic.substring(0, 40) + ')' : '')).join('; ')}`;
            }
            // Math fluency history
            const mathHist = longitudinalData.mathFluencyHistory || [];
            if (mathHist.length > 0) {
                educational += '\n\n--- Math Fluency Probe Results ---\n';
                mathHist.slice(-5).forEach((r, i) => {
                    educational += `Session ${i + 1}: ${r.operation || 'mixed'} | Correct: ${r.correct || 0}/${r.total || 0} | Time: ${r.timeUsed || 'N/A'}s\n`;
                });
                const avgCorrect = mathHist.length > 0 ? Math.round(mathHist.reduce((s, r) => s + (r.correct || 0), 0) / mathHist.length) : 0;
                educational += `Average correct per session: ${avgCorrect}`;
            }
            // Explore score (STEM Lab XP)
            if (longitudinalData.exploreScore) {
                educational += `\nSTEM Lab Explore XP: ${longitudinalData.exploreScore}`;
            }
            // Dashboard data summary
            const dash = longitudinalData.dashboardData || [];
            if (dash.length > 0) {
                behavioral += '\n\n--- Class Dashboard Analytics ---\n';
                behavioral += `Dashboard entries: ${dash.length}\n`;
                dash.slice(0, 5).forEach((d, i) => {
                    behavioral += `Entry ${i + 1}: ${d.name || d.student || 'Student'} — ${d.score !== undefined ? 'Score: ' + d.score : 'N/A'}\n`;
                });
            }
            setBgSections(prev => ({ ...prev, educational, behavioral }));
            if (addToast) addToast('Student progress data imported ✅', 'success');
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
                const obsText = Object.entries(clinicalObs).filter(([, v]) => v.text?.trim()).map(([, v]) => `[Source: ${v.source}]\n${v.text}`).join('\n\n');
                const allBgText = (bgText + '\n\n' + obsText).trim();
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

        // ── Step 4: Differential Analysis ──
        const runDifferentialAnalysis = async () => {
            if (!callGemini || hypotheses.length === 0) return;
            setRunningDifferential(true);
            const verifiedChunks = factChunks.filter(c => c.verified);
            const chunksText = verifiedChunks.map(c => c.source + ' ' + c.field + ': ' + c.value + ' (' + (c.classification || '') + ')').join('\n');
            const referenceCtx = buildReferenceContext(scoreEntries, parseFloat(studentAge));
            const userRefsText = referenceLibrary.map(r => '--- ' + r.name + ' ---\n' + r.text).join('\n\n').substring(0, 3000);
            const userRefs = referenceLibrary.map(r => '--- ' + r.name + ' ---\n' + r.text).join('\n\n');
            const prompt = 'You are a clinical evidence organizer. Given verified assessment data, organize the evidence for and against each diagnostic hypothesis.\n\nVERIFIED FACT CHUNKS:\n' + chunksText + (referenceCtx ? '\n\nCLINICAL REFERENCE:\n' + referenceCtx : '') + (userRefs ? '\n\nUSER-PROVIDED REFERENCES:\n' + userRefs : '') + '\n\nHYPOTHESES TO EVALUATE:\n' + hypotheses.map((h, i) => (i + 1) + '. ' + h).join('\n') + '\n\nFor each hypothesis provide:\n1. Evidence FOR (specific facts that support, with strength: strong/moderate/weak)\n2. Evidence AGAINST (facts that contradict)\n3. Evidence GAPS (additional data needed)\n4. Overall strength score (1-10)\n\nIMPORTANT: Organize EXISTING evidence only. Do NOT diagnose. All evidence must trace to fact chunks.\n\nReturn ONLY valid JSON:\n{"hypotheses":[{"name":"name","strengthScore":7,"evidenceFor":[{"fact":"desc","strength":"strong","explanation":"why"}],"evidenceAgainst":[{"fact":"desc","explanation":"why"}],"evidenceGaps":["missing data"]}]}';
            try {
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else parsed = { hypotheses: [] }; }
                const results = {};
                (parsed.hypotheses || []).forEach(h => { results[h.name] = h; });
                setDifferentialResults(results);
                if (addToast) addToast('Differential analysis complete \u2705', 'success');
            } catch (err) {
                warnLog('Differential analysis error:', err);
                if (addToast) addToast('Differential analysis failed', 'error');
            } finally { setRunningDifferential(false); }
        };

        // ── Shared prompt builder for report sections ──
        const buildSectionPrompt = (section, verifiedChunks, customInstructions) => {
            const age = studentAge ? `${studentAge} years old` : 'age not specified';
            const grade = studentGrade || 'grade not specified';
            const scoreChunksText = verifiedChunks.filter(c => c.type === 'score').map(c =>
                `[${c.id}] ${c.source} \u2014 ${c.field}: ${c.value} (${c.classification})${c.devNormResult ? ' [' + c.devNormResult.label + ']' : ''}`
            ).join('\n');
            const bgChunksText = verifiedChunks.filter(c => c.type === 'background').map(c =>
                `[${c.id}] ${c.field}: ${c.value}`
            ).join('\n');
            const referenceContext = buildReferenceContext(scoreEntries, parseFloat(studentAge));
            return `You are writing the "${section}" section of a ${reportTitle} for a student who is ${age}, ${grade}.
${RESTORATIVE_PREAMBLE}

CRITICAL RULES:
1. Use ONLY the verified facts below. Do NOT invent any scores, dates, or claims.
2. Every statement must trace directly to a fact chunk below (each prefixed with [chunk-id]).
3. Use person-first, strengths-based language.
4. Reference the student as "[Student]" (we will replace with actual name later).
5. Write in professional clinical language appropriate for a formal report.

VERIFIED ASSESSMENT DATA:
${scoreChunksText || 'No assessment scores provided for this section.'}

VERIFIED BACKGROUND FACTS:
${bgChunksText || 'No background information provided for this section.'}

${referenceContext ? '\nCLINICAL REFERENCE CONTEXT (for interpretation accuracy \u2014 DO NOT diagnose, note convergent/divergent patterns only):\n' + referenceContext : ''}
${referenceLibrary.length > 0 ? '\nUSER-PROVIDED REFERENCES:\n' + referenceLibrary.map(r => '--- ' + r.name + ' ---\n' + r.text).join('\n\n').substring(0, 3000) : ''}

${(() => { const bp = blueprint.find(b => b.name === section); return bp && bp.notes ? '\nSECTION-SPECIFIC INSTRUCTIONS: ' + bp.notes : ''; })()}
${styleProfile ? '\nWRITING STYLE GUIDE (match this professional writing style):\n' + styleProfile.substring(0, 2000) : ''}
${Object.keys(differentialResults).length > 0 && selectedHypotheses.length > 0 ? '\nSELECTED DIAGNOSTIC HYPOTHESES: ' + selectedHypotheses.join(', ') + '\nDIFFERENTIAL ANALYSIS SUMMARY: ' + selectedHypotheses.map(h => { const r = differentialResults[h]; return r ? h + ' (strength: ' + r.strengthScore + '/10)' : h; }).join('; ') : ''}
${customInstructions ? '\nADDITIONAL INSTRUCTIONS FOR THIS SECTION: ' + customInstructions : ''}
Write the "${section}" section (2-4 paragraphs). After the section text, on a NEW line write EXACTLY:
USED_CHUNKS: id1, id2, id3
listing only the [chunk-id] values you actually referenced. Return the section text first, then the USED_CHUNKS line.`;
        };

        // ── Parse evidence from AI response ──
        const parseEvidenceResponse = (rawResult) => {
            const lines = rawResult.trim().split('\n');
            let usedChunks = [];
            let textLines = [];
            for (let i = lines.length - 1; i >= 0; i--) {
                const line = lines[i].trim();
                if (line.startsWith('USED_CHUNKS:')) {
                    usedChunks = line.replace('USED_CHUNKS:', '').split(',').map(s => s.trim()).filter(Boolean);
                    textLines = lines.slice(0, i);
                    break;
                }
            }
            if (textLines.length === 0) textLines = lines;
            return { text: textLines.join('\n').trim(), usedChunks };
        };

        // ── Step 6: Generate report (with evidence mapping) ──
        const generateReport = async () => {
            if (!callGemini) return;
            setGenerating(true);
            const verifiedChunks = factChunks.filter(c => c.verified);
            if (verifiedChunks.length === 0) { setGenerating(false); if (addToast) addToast('No verified fact chunks', 'error'); return; }
            const sections = blueprint.filter(s => s.enabled).map(s => s.name);
            const generated = {};
            const evidenceMap = {};
            const genVariants = [
                null, // default prompt
                'Write with particular attention to strengths-based language and clinical precision.',
                'Focus on data-driven interpretation — every claim must map to a specific score or observation.',
                'Emphasize clarity for parents/caregivers who may read this report — avoid unnecessary jargon.',
                'Write with particular attention to instructional implications and classroom-relevant observations.',
            ];
            const numPasses = Math.min(reportGenPasses, genVariants.length);
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                setGenProgress(`Generating ${section} (${i + 1}/${sections.length}${numPasses > 1 ? ', ' + numPasses + ' passes' : ''})...`);
                try {
                    if (numPasses <= 1) {
                        // Single pass (fast mode)
                        const prompt = buildSectionPrompt(section, verifiedChunks, null);
                        const result = await callGemini(prompt, false);
                        const { text, usedChunks } = parseEvidenceResponse(result);
                        generated[section] = text;
                        evidenceMap[section] = usedChunks;
                    } else {
                        // Triangulated: run N passes in parallel, score each, pick best
                        const passPromises = genVariants.slice(0, numPasses).map(variant => {
                            const prompt = buildSectionPrompt(section, verifiedChunks, variant);
                            return callGemini(prompt, false).then(r => parseEvidenceResponse(r)).catch(() => null);
                        });
                        const passResults = (await Promise.all(passPromises)).filter(Boolean);
                        if (passResults.length === 0) throw new Error('All passes failed');
                        // Score each pass: more used chunks + longer text + no error markers = better
                        const scored = passResults.map(r => {
                            let score = 0;
                            score += r.usedChunks.length * 10; // more evidence citations
                            score += Math.min(r.text.length / 50, 30); // reasonable length (capped)
                            score -= (r.text.match(/\[Error/g) || []).length * 50; // penalize errors
                            score -= (r.text.match(/\[Student\]/g) || []).length > 0 ? 0 : -5; // should use [Student] placeholder
                            // Penalize if critical score data appears to be missing
                            const scoreChunkCount = verifiedChunks.filter(c => c.type === 'score').length;
                            const citedScoreChunks = r.usedChunks.filter(id => verifiedChunks.find(c => c.id === id && c.type === 'score')).length;
                            score += (citedScoreChunks / Math.max(scoreChunkCount, 1)) * 20; // reward covering more scores
                            return { ...r, qualityScore: score };
                        });
                        scored.sort((a, b) => b.qualityScore - a.qualityScore);
                        const best = scored[0];
                        generated[section] = best.text;
                        evidenceMap[section] = best.usedChunks;
                        if (numPasses >= 3) {
                            warnLog(`[Report] ${section}: best-of-${passResults.length} (scores: ${scored.map(s => Math.round(s.qualityScore)).join(', ')})`);
                        }
                    }
                } catch (err) {
                    warnLog(`Generation error for ${section}:`, err);
                    generated[section] = `[Error generating ${section} \u2014 please retry]`;
                    evidenceMap[section] = [];
                }
            }
            // ── Improvement 1: Score-Text Verification Pass ──
            setGenProgress('Verifying score citations...');
            try {
                const allScoreData = scoreEntries.map(s => `${s.assessment} — ${s.subtest}: ${s.score} (${s.scoreType}, ${s.classification}${s.percentile ? ', ' + s.percentile + 'th %ile' : ''})`).join('\n');
                const fullDraft = Object.values(generated).join('\n\n');
                const verifyResult = await callGemini(`You are a clinical data verification specialist. Cross-reference EVERY number, score, percentile, and classification label in this report draft against the actual input data.

ACTUAL INPUT SCORES:
${allScoreData}

REPORT DRAFT:
"""
${fullDraft.substring(0, 8000)}
"""

Check for:
1. Any score cited in the text that doesn't match the input (e.g., text says 92 but input says 82)
2. Any classification label that doesn't match the score (e.g., "Average" for a score of 78)
3. Any percentile that doesn't match the score
4. Any test name spelled differently or attributed to wrong subtest
5. Any score mentioned in the draft that doesn't exist in the input data

Return ONLY JSON:
{"verified": true/false, "errors": [{"claim": "what the report says", "actual": "what the data actually shows", "section": "which section", "severity": "critical|minor"}], "totalScoresCited": N, "totalVerified": N}`, true);
                let scoreVerification = null;
                try {
                    let sv = verifyResult.trim();
                    if (sv.indexOf('```') !== -1) { const ps = sv.split('```'); sv = ps[1] || ps[0]; if (sv.indexOf('\n') !== -1) sv = sv.split('\n').slice(1).join('\n'); if (sv.lastIndexOf('```') !== -1) sv = sv.substring(0, sv.lastIndexOf('```')); }
                    scoreVerification = JSON.parse(sv);
                } catch(e) {}
                if (scoreVerification && scoreVerification.errors && scoreVerification.errors.length > 0) {
                    // ── Self-heal: regenerate sections with score errors ──
                    const sectionsWithErrors = [...new Set(scoreVerification.errors.filter(e => e.severity === 'critical').map(e => e.section))];
                    if (sectionsWithErrors.length > 0) {
                        setGenProgress(`Fixing ${sectionsWithErrors.length} section(s) with score errors...`);
                        for (const secName of sectionsWithErrors) {
                            const matchingSection = sections.find(s => secName.toLowerCase().includes(s.toLowerCase()) || s.toLowerCase().includes(secName.toLowerCase()));
                            if (matchingSection && generated[matchingSection]) {
                                const errors = scoreVerification.errors.filter(e => e.section === secName);
                                const corrections = errors.map(e => `CORRECTION: "${e.claim}" is WRONG. The actual data shows: ${e.actual}`).join('\n');
                                try {
                                    const fixPrompt = buildSectionPrompt(matchingSection, verifiedChunks, `CRITICAL CORRECTIONS FROM SCORE VERIFICATION:\n${corrections}\n\nFix these specific errors while keeping the rest of the section intact.`);
                                    const fixResult = await callGemini(fixPrompt, false);
                                    const { text, usedChunks } = parseEvidenceResponse(fixResult);
                                    generated[matchingSection] = text;
                                    evidenceMap[matchingSection] = usedChunks;
                                } catch(fixErr) { warnLog(`Score fix failed for ${matchingSection}:`, fixErr); }
                            }
                        }
                    }
                    if (addToast) addToast(`\u26a0\ufe0f Score verification: ${scoreVerification.errors.length} issue(s) found${sectionsWithErrors.length > 0 ? ' — auto-fixed' : ''}`, 'info');
                } else if (scoreVerification) {
                    if (addToast) addToast(`\u2705 All ${scoreVerification.totalScoresCited || 'N'} score citations verified`, 'success');
                }
            } catch(svErr) { warnLog('[Report] Score verification pass failed (non-blocking):', svErr); }

            // ── Improvement 2: Cross-Section Consistency Check ──
            setGenProgress('Checking cross-section consistency...');
            try {
                const fullReport = Object.entries(generated).map(([k, v]) => `## ${k}\n${v}`).join('\n\n');
                const consistencyResult = await callGemini(`You are a clinical report consistency auditor. Check this psychoeducational report for INTERNAL CONSISTENCY across sections.

REPORT:
"""
${fullReport.substring(0, 8000)}
"""

Check for:
1. SUMMARY-BODY MISMATCH: Does the Summary section accurately reflect the findings in earlier sections? (e.g., Summary says "average cognitive functioning" but Assessment Results describes deficits)
2. RECOMMENDATION-FINDING GAPS: Are there recommendations that aren't supported by any finding? Are there significant findings with no corresponding recommendation?
3. CROSS-SECTION CONTRADICTIONS: Does one section say something that contradicts another? (e.g., Background says no attention concerns but Assessment Results says elevated ADHD scores)
4. TERMINOLOGY CONSISTENCY: Are the same constructs described consistently? (e.g., don't call it "anxiety" in one section and "nervousness" in another if referring to the same clinical construct)
5. COMPLETENESS: Are all major assessment scores discussed somewhere? Are all mentioned in Summary?

Return ONLY JSON:
{"consistent": true/false, "issues": [{"type": "summary-mismatch|recommendation-gap|contradiction|terminology|completeness", "description": "specific issue", "sections": ["Section A", "Section B"], "severity": "critical|moderate|minor"}]}`, true);
                let consistencyCheck = null;
                try {
                    let cc = consistencyResult.trim();
                    if (cc.indexOf('```') !== -1) { const ps = cc.split('```'); cc = ps[1] || ps[0]; if (cc.indexOf('\n') !== -1) cc = cc.split('\n').slice(1).join('\n'); if (cc.lastIndexOf('```') !== -1) cc = cc.substring(0, cc.lastIndexOf('```')); }
                    consistencyCheck = JSON.parse(cc);
                } catch(e) {}
                if (consistencyCheck && consistencyCheck.issues && consistencyCheck.issues.length > 0) {
                    // ── Self-heal critical consistency issues ──
                    const criticalIssues = consistencyCheck.issues.filter(i => i.severity === 'critical');
                    if (criticalIssues.length > 0) {
                        setGenProgress(`Fixing ${criticalIssues.length} consistency issue(s)...`);
                        // Regenerate Summary section with consistency corrections
                        const summarySection = sections.find(s => s.toLowerCase().includes('summary'));
                        if (summarySection && generated[summarySection]) {
                            const issueList = criticalIssues.map(i => `- ${i.type}: ${i.description}`).join('\n');
                            try {
                                const fixPrompt = buildSectionPrompt(summarySection, verifiedChunks, `CRITICAL: The following consistency issues were detected between this section and the rest of the report. Fix them:\n${issueList}\n\nEnsure the summary accurately reflects ALL findings from earlier sections.`);
                                const fixResult = await callGemini(fixPrompt, false);
                                const { text, usedChunks } = parseEvidenceResponse(fixResult);
                                generated[summarySection] = text;
                                evidenceMap[summarySection] = usedChunks;
                            } catch(fixErr) { warnLog('[Report] Consistency fix failed:', fixErr); }
                        }
                    }
                    if (addToast) addToast(`\u26a0\ufe0f Consistency check: ${consistencyCheck.issues.length} issue(s)${criticalIssues.length > 0 ? ' — auto-fixed critical' : ''}`, 'info');
                } else {
                    if (addToast) addToast('\u2705 Cross-section consistency verified', 'success');
                }
            } catch(ccErr) { warnLog('[Report] Consistency check failed (non-blocking):', ccErr); }

            setReportSections(generated);
            setSectionEvidenceMap(evidenceMap);
            setGenProgress('');
            setGenerating(false);
            if (addToast) addToast('Report generated with verification \u2728', 'success');
        };

        // ── Section-by-Section: Regenerate a single section ──
        const regenerateSection = async (sectionName, customInstructions) => {
            if (!callGemini) return;
            setRegenSection(sectionName);
            const verifiedChunks = factChunks.filter(c => c.verified);
            try {
                const prompt = buildSectionPrompt(sectionName, verifiedChunks, customInstructions || null);
                const result = await callGemini(prompt, false);
                const { text, usedChunks } = parseEvidenceResponse(result);
                setReportSections(prev => ({ ...prev, [sectionName]: text }));
                setSectionEvidenceMap(prev => ({ ...prev, [sectionName]: usedChunks }));
                setAccuracyResults([]); // clear stale accuracy data
                if (addToast) addToast(`"${sectionName}" regenerated \u2705`, 'success');
            } catch (err) {
                warnLog(`Regeneration error for ${sectionName}:`, err);
                if (addToast) addToast(`Failed to regenerate "${sectionName}"`, 'error');
            } finally {
                setRegenSection(null);
                setShowRegenInput(null);
                setRegenInstructions('');
            }
        };

        // ── Step 5: Dual-Pass Accuracy Check ──
        const runAccuracyCheck = async () => {
            if (!callGemini) return;
            setChecking(true);
            const verifiedChunks = factChunks.filter(c => c.verified);
            const fullDraft = Object.entries(reportSections).map(([k, v]) => `## ${k}\n${v}`).join('\n\n');
            const referenceCtx = buildReferenceContext(scoreEntries, parseFloat(studentAge));
            const chunksText = verifiedChunks.map(c => `- [${c.id}] ${c.source} ${c.field}: ${c.value} (${c.classification || ''})`).join('\n');
            const scrubbedDraft = scrubPII(fullDraft).substring(0, 6000);
            try {
                // ── Pass A: Claim Verifier ──
                const promptA = `You are a clinical accuracy auditor (Pass A: Claim Verification). Compare this report draft against the verified fact chunks.
VERIFIED FACT CHUNKS (ground truth):
${chunksText}
${referenceCtx ? '\nCLINICAL REFERENCE:\n' + referenceCtx : ''}

REPORT DRAFT:
"""
${scrubbedDraft}
"""

For each claim in the report, determine:
- "verified" = directly supported by a fact chunk
- "unsourced" = plausible but not directly traceable to a fact chunk
- "contradicts" = conflicts with a fact chunk OR misinterprets a score classification

Return ONLY valid JSON:
{"results":[{"claim":"brief claim text","status":"verified|unsourced|contradicts","chunkId":"matching chunk id or null","explanation":"brief reason"}]}

Check every numerical score, every classification label, and every factual claim.`;

                // ── Pass B: Contradiction Hunter (skeptical auditor) ──
                const promptB = `You are a clinical accuracy auditor (Pass B: Contradiction Detection). Your ONLY job is to find errors. Be maximally skeptical.
VERIFIED FACT CHUNKS (ground truth):
${chunksText}
${referenceCtx ? '\nCLINICAL REFERENCE:\n' + referenceCtx : ''}

REPORT DRAFT:
"""
${scrubbedDraft}
"""

For every claim, ask: "Does a fact chunk DIRECTLY prove this?" Be especially vigilant for:
1. Score misclassifications (e.g., saying "Average" for 85, which is actually "Low Average")
2. Invented information not in any fact chunk
3. Exaggerated or minimized descriptions of scores
4. Unsupported diagnostic language or conclusions

Return ONLY valid JSON:
{"results":[{"claim":"brief claim text","status":"verified|unsourced|contradicts","chunkId":"matching chunk id or null","explanation":"brief reason"}]}`;

                // Run both passes in parallel
                const [resultA, resultB] = await Promise.all([
                    callGemini(promptA, true),
                    callGemini(promptB, true)
                ]);
                const parseAudit = (raw) => {
                    try {
                        const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                        let parsed;
                        try { parsed = JSON.parse(cleaned); }
                        catch { const m = raw.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else parsed = { results: [] }; }
                        return parsed.results || [];
                    } catch { return []; }
                };
                const passA = parseAudit(resultA);
                const passB = parseAudit(resultB);
                // ── Reconciliation Engine ──
                const reconciled = reconcileAuditPasses(passA, passB);

                // ── Self-Healing: auto-fix contradictions and critical discrepancies ──
                const contradictions = reconciled.filter(r => r.status === 'contradicts');
                const criticalDiscrepancies = reconciled.filter(r => r.status === 'discrepancy' && r.confidence === 'needs-review');
                const fixableIssues = [...contradictions, ...criticalDiscrepancies];
                if (fixableIssues.length > 0 && callGemini) {
                    setGenProgress(`Self-healing: fixing ${fixableIssues.length} issue(s)...`);
                    const issueDescriptions = fixableIssues.map(i => `- ISSUE: "${i.claim}" — ${i.explanation} (${i.status})`).join('\n');
                    // Determine which sections are affected and regenerate them
                    const allSections = Object.keys(reportSections);
                    for (const sectionName of allSections) {
                        const sectionText = reportSections[sectionName] || '';
                        const sectionIssues = fixableIssues.filter(i => sectionText.toLowerCase().includes((i.claim || '').toLowerCase().substring(0, 30)));
                        if (sectionIssues.length > 0) {
                            const corrections = sectionIssues.map(i => `FIX: "${i.claim}" — ${i.explanation}`).join('\n');
                            try {
                                setGenProgress(`Fixing ${sectionIssues.length} issue(s) in "${sectionName}"...`);
                                const fixPrompt = buildSectionPrompt(sectionName, verifiedChunks, `CRITICAL CORRECTIONS FROM DUAL-PASS ACCURACY AUDIT:\n${corrections}\n\nFix these specific issues. Every claim must trace to a verified fact chunk.`);
                                const fixResult = await callGemini(fixPrompt, false);
                                const { text, usedChunks } = parseEvidenceResponse(fixResult);
                                setReportSections(prev => ({ ...prev, [sectionName]: text }));
                                setSectionEvidenceMap(prev => ({ ...prev, [sectionName]: usedChunks }));
                            } catch(fixErr) { warnLog(`Self-heal failed for ${sectionName}:`, fixErr); }
                        }
                    }
                    // Re-run a quick verification after fixes
                    try {
                        setGenProgress('Re-verifying after fixes...');
                        const reCheckDraft = Object.entries(reportSections).map(([k, v]) => `## ${k}\n${v}`).join('\n\n');
                        const reCheckResult = await callGemini(promptA.replace(scrubbedDraft, scrubPII(reCheckDraft).substring(0, 6000)), true);
                        const reCheckParsed = parseAudit(reCheckResult);
                        const reReconciled = reCheckParsed.map(r => ({ ...r, auditSource: 'post-fix-verification', confidence: r.status === 'verified' ? 'high' : 'medium' }));
                        const fixedCount = fixableIssues.length - reReconciled.filter(r => r.status === 'contradicts').length;
                        if (addToast) addToast(`\ud83d\udd27 Self-healed: ${fixedCount}/${fixableIssues.length} issues resolved`, fixedCount === fixableIssues.length ? 'success' : 'info');
                        // Merge with original reconciled, replacing fixed items
                        const finalReconciled = reconciled.map(r => {
                            if (r.status === 'contradicts' || (r.status === 'discrepancy' && r.confidence === 'needs-review')) {
                                const reCheck = reReconciled.find(rc => rc.claim && r.claim && rc.claim.toLowerCase().substring(0, 20) === r.claim.toLowerCase().substring(0, 20));
                                if (reCheck && reCheck.status === 'verified') return { ...r, status: 'verified', confidence: 'high', auditSource: 'self-healed' };
                            }
                            return r;
                        });
                        setAccuracyResults(finalReconciled);
                        setGenProgress('');
                    } catch(reErr) {
                        warnLog('[Report] Post-fix verification failed:', reErr);
                        setAccuracyResults(reconciled);
                        setGenProgress('');
                    }
                } else {
                    setAccuracyResults(reconciled);
                }
                if (addToast && fixableIssues.length === 0) {
                    const v = reconciled.filter(r => r.status === 'verified').length;
                    const d = reconciled.filter(r => r.status === 'discrepancy').length;
                    const c = reconciled.filter(r => r.status === 'contradicts').length;
                    const total = reconciled.length;
                    addToast(`Dual-pass audit: ${v}/${total} verified${d > 0 ? ', ' + d + ' discrepancies' : ''}${c > 0 ? ', ' + c + ' contradictions' : ''}`, v === total ? 'success' : 'info');
                }
            } catch (err) {
                warnLog('Accuracy check error:', err);
                if (addToast) addToast('Accuracy check failed', 'error');
            } finally { setChecking(false); }
        };
        // ── Dual-Pass Reconciliation Engine ──
        const reconcileAuditPasses = (passA, passB) => {
            const norm = (s) => (s || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
            const findMatch = (claim, pool) => {
                const n = norm(claim);
                let best = pool.find(p => norm(p.claim) === n);
                if (best) return best;
                const words = n.split(/\s+/).filter(w => w.length > 3);
                let bestScore = 0;
                pool.forEach(p => {
                    const pWords = norm(p.claim).split(/\s+/).filter(w => w.length > 3);
                    const overlap = words.filter(w => pWords.includes(w)).length;
                    const score = overlap / Math.max(words.length, pWords.length, 1);
                    if (score > bestScore && score > 0.4) { bestScore = score; best = p; }
                });
                return best || null;
            };
            const reconciled = [];
            const usedB = new Set();
            passA.forEach(claimA => {
                const matchB = findMatch(claimA.claim, passB);
                if (matchB) usedB.add(passB.indexOf(matchB));
                if (!matchB) {
                    reconciled.push({ ...claimA, auditSource: 'single-pass', confidence: claimA.status === 'verified' ? 'medium' : 'low' });
                } else if (claimA.status === matchB.status) {
                    reconciled.push({ ...claimA, auditSource: 'dual-pass-agree', confidence: 'high', passAStatus: claimA.status, passBStatus: matchB.status });
                } else if ((claimA.status === 'contradicts') !== (matchB.status === 'contradicts')) {
                    reconciled.push({
                        claim: claimA.claim, status: 'discrepancy',
                        chunkId: claimA.chunkId || matchB.chunkId,
                        explanation: 'DUAL-PASS DISAGREEMENT: Pass A says "' + claimA.status + '" (' + (claimA.explanation || '') + '), Pass B says "' + matchB.status + '" (' + (matchB.explanation || '') + ')',
                        auditSource: 'dual-pass-disagree', confidence: 'needs-review',
                        passAStatus: claimA.status, passBStatus: matchB.status
                    });
                } else {
                    const worseStatus = claimA.status === 'unsourced' || matchB.status === 'unsourced' ? 'unsourced' : claimA.status;
                    reconciled.push({
                        claim: claimA.claim, status: worseStatus,
                        chunkId: claimA.chunkId || matchB.chunkId,
                        explanation: (claimA.explanation || matchB.explanation || '') + ' [Passes disagree: A="' + claimA.status + '", B="' + matchB.status + '"]',
                        auditSource: 'dual-pass-minor-disagree', confidence: 'medium',
                        passAStatus: claimA.status, passBStatus: matchB.status
                    });
                }
            });
            passB.forEach((claimB, i) => {
                if (!usedB.has(i)) {
                    reconciled.push({ ...claimB, auditSource: 'pass-b-only', confidence: claimB.status === 'contradicts' ? 'high' : 'medium' });
                }
            });
            return reconciled;
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
            const draftNotice = `${'═'.repeat(50)}\nCONFIDENTIAL DRAFT — AI-ASSISTED DOCUMENT\nThis report requires review and approval by the\nlicensed school psychologist before use in\neducational decision-making.\n${'═'.repeat(50)}\n\n`;
            const header = `${reportTitle}\nStudent: ${studentName || '[Student]'}\nAge: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'}\nDate: ${new Date().toLocaleDateString()}\n${'─'.repeat(50)}\n\n`;
            const body = Object.entries(reportSections).map(([k, v]) => `${k.toUpperCase()}\n\n${v.replace(/\[Student\]/g, studentName || '[Student]')}`).join('\n\n' + '─'.repeat(50) + '\n\n');
            const footer = `\n\n${'─'.repeat(50)}\nClinician Signature: _______________ Date: ________\nGenerated with AlloFlow Report Writer (AI-Assisted Draft)\n`;
            navigator.clipboard.writeText(draftNotice + header + body + footer).then(() => { if (addToast) addToast('Report copied to clipboard ✅', 'success'); });
        };
        const printReport = () => {
            const w = window.open('', '_blank');
            const draftBanner = `<div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:12px 16px;margin-bottom:20px;text-align:center"><p style="color:#dc2626;font-weight:900;font-size:13px;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:1px">CONFIDENTIAL DRAFT — AI-ASSISTED DOCUMENT</p><p style="color:#991b1b;font-size:10px;margin:0;line-height:1.4">This report was generated with AI assistance and requires review and approval by the licensed school psychologist before use in educational decision-making. All interpretations must be validated against the clinician&rsquo;s independent professional judgment. This document is not a finalized evaluation report until signed by the responsible clinician.</p></div>`;
            const header = `<h1 style="text-align:center;margin-bottom:4px">${reportTitle}</h1><p style="text-align:center;color:#666">Student: ${studentName || '[Student]'} | Age: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'} | Date: ${new Date().toLocaleDateString()}</p><hr>`;
            const body = Object.entries(reportSections).map(([k, v]) => `<h2>${k}</h2><p>${v.replace(/\[Student\]/g, studentName || '[Student]').replace(/\n/g, '</p><p>')}</p>`).join('');
            const signatureLine = `<div style="margin-top:40px;border-top:2px solid #333;padding-top:12px"><p style="font-size:11px;color:#666;margin-bottom:24px"><strong>Clinician Signature:</strong> _____________________________ &nbsp;&nbsp;&nbsp; <strong>Date:</strong> ______________ &nbsp;&nbsp;&nbsp; <strong>License #:</strong> ______________</p><p style="font-size:9px;color:#999;text-align:center;margin-top:8px">Generated with AlloFlow Report Writer (AI-Assisted Draft) — Requires clinician review, approval, and signature before distribution.</p></div>`;
            const isDemo = reportTitle?.toLowerCase().includes('demo') || studentName?.toLowerCase().includes('demo') || studentName?.toLowerCase().includes('fictional');
            const demoWatermark = isDemo ? `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:120px;color:rgba(220,38,38,0.08);font-weight:900;pointer-events:none;z-index:9999">DEMO</div>` : '';
            w.document.write(`<html><head><title>${reportTitle}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;color:#333}h1{font-size:18px}h2{font-size:14px;color:#1e40af;border-bottom:1px solid #ddd;padding-bottom:4px;margin-top:24px}p{font-size:12px;text-align:justify}@media print{body{margin:20px}}</style></head><body>${demoWatermark}${draftBanner}${header}${body}${signatureLine}</body></html>`);
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
                        h('label', { className: 'text-[11px] text-slate-600' }, 'Age:'),
                        h('input', { type: 'number', className: 'w-12 text-xs border rounded px-1.5 py-0.5 text-center', placeholder: 'yrs', 'aria-label': 'Student age', value: studentAge, onChange: e => setStudentAge(e.target.value), min: 1, max: 22 }),
                        h('label', { className: 'text-[11px] text-slate-600 ml-2' }, 'Grade:'),
                        h('input', { type: 'text', className: 'w-12 text-xs border rounded px-1.5 py-0.5 text-center', placeholder: 'e.g. 3', 'aria-label': 'Student grade', value: studentGrade, onChange: e => setStudentGrade(e.target.value) })
                    )
                ),
                // Step indicator
                h('div', { className: 'flex items-center gap-1 overflow-x-auto pb-1' },
                    STEPS.map((s, i) =>
                        h('button', { 'aria-label': 'Navigate to wizard step', key: s.num,
                            className: `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${currentStep === s.num ? 'bg-violet-600 text-white shadow-md' : s.num < currentStep ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600 border border-slate-200'}`,
                            onClick: () => setCurrentStep(s.num)
                        }, h('span', null, s.icon), ` ${s.label}`)
                    )
                )
            ),
            // Step content
            // ═══ STEP 1: Student Selection ═══
            currentStep === 1 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-4' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '👤 Student Selection'),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Select or enter a student code name. All identifiers are privacy-safe code names — never real names.'),
                isDemoLoaded && h('div', { className: 'px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 font-medium' }, '⚠️ DEMO DATA LOADED — This is fictional test data, not a real student.'),
                // Student dropdown from dashboard data
                (dashboardData && dashboardData.length > 0) ? h('div', { className: 'space-y-2' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600 block' }, 'Select from Class Roster:'),
                    h('select', {
                        className: 'w-full text-xs border rounded-lg px-3 py-2 bg-white',
                        'aria-label': 'Select student from roster',
                        value: selectedStudentId,
                        onChange: e => {
                            const id = e.target.value;
                            setSelectedStudentId(id);
                            if (id) {
                                const student = dashboardData.find(s => (s.id || s.name || s.student) === id);
                                if (student) {
                                    setManualStudentName(student.name || student.student || id);
                                    if (student.age) setStudentAge(String(student.age));
                                    if (student.grade) setStudentGrade(String(student.grade));
                                }
                            }
                        }
                    },
                        h('option', { value: '' }, '— Choose a student —'),
                        dashboardData.map((s, i) => h('option', { key: i, value: s.id || s.name || s.student }, s.name || s.student || 'Student ' + (i + 1)))
                    ),
                    h('div', { className: 'text-[11px] text-slate-600' }, 'Or enter manually below')
                ) : null,
                // Manual entry
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                    h('div', null,
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Student Code Name'),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-3 py-2', placeholder: 'e.g., Student A', 'aria-label': 'Student code name', value: manualStudentName, onChange: e => setManualStudentName(e.target.value) })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Age'),
                        h('input', { type: 'number', className: 'w-full text-xs border rounded-lg px-3 py-2', placeholder: 'Years', 'aria-label': 'Student age in years', value: studentAge, onChange: e => setStudentAge(e.target.value), min: 1, max: 22 })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Grade'),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-3 py-2', placeholder: 'e.g., 3rd', 'aria-label': 'Student grade level', value: studentGrade, onChange: e => setStudentGrade(e.target.value) })
                    )
                ),
                // Demo data
                h('details', { className: 'mt-3 bg-amber-50 rounded-lg border border-amber-200' },
                    h('summary', { className: 'text-xs font-medium text-amber-700 px-3 py-2 cursor-pointer hover:bg-amber-100 rounded-t-lg' }, '🧪 Load Demo Case (for testing)'),
                    h('div', { className: 'px-3 pb-3 space-y-2' },
                        h('p', { className: 'text-[11px] text-amber-600' }, 'Load fictional clinical data to test the full report pipeline. All data is clearly marked as demo.'),
                        Object.entries(DEMO_CASES).map(([key, demo]) =>
                            h('button', { 'aria-label': 'Load demo case', key, className: 'w-full text-left px-3 py-2 bg-white rounded-lg border border-amber-200 hover:bg-amber-50 text-[11px] transition-colors',
                                onClick: () => loadDemoCase(key)
                            }, h('span', { className: 'font-medium text-slate-800' }, demo.label))
                        ),
                        h('div', { className: 'border-t border-amber-200 pt-2 mt-1' },
                            h('button', { 'aria-label': 'Generate AI demo case', className: `w-full text-left px-3 py-2 rounded-lg border text-[11px] transition-colors flex items-center gap-2 ${generatingDemo ? 'bg-violet-100 border-violet-300 cursor-wait' : 'bg-violet-50 border-violet-200 hover:bg-violet-100'}`,
                                onClick: generateAIDemoCase,
                                disabled: generatingDemo
                            },
                                generatingDemo ? h('span', { className: 'inline-block animate-spin w-3 h-3 border border-violet-400 border-t-violet-700 rounded-full' }) : h('span', null, '🤖'),
                                h('span', { className: 'font-medium text-violet-800' }, generatingDemo ? 'Generating random case...' : '🎲 Generate Random AI Case'),
                                !generatingDemo && h('span', { className: 'text-[11px] text-violet-500 ml-auto' }, 'Unique each time')
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-end pt-2' },
                    h('button', { 'aria-label': 'Next: Background', className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors', onClick: () => setCurrentStep(2) }, 'Next: Background →')
                )
            ),

            // ═══ STEP 3: Clinical Observations ═══
            currentStep === 3 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '\u{1F50D} Clinical Observations'),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Enter clinical observations, interview notes, and collateral information. Each source is tracked for fact attribution.'),
                // BehaviorLens import
                (abcEntries?.length > 0 || observationSessions?.length > 0) && h('button', { 'aria-label': 'Import from BehaviorLens', className: 'px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors',
                    onClick: () => {
                        let obsText = clinicalObs.behavioral.text || '';
                        if (abcEntries && abcEntries.length > 0) {
                            obsText += '\n\n--- Imported from BehaviorLens ABC Data ---\n';
                            abcEntries.slice(0, 10).forEach((e, i) => {
                                obsText += '\n' + (i + 1) + '. Antecedent: ' + (e.antecedent || 'N/A') + ' | Behavior: ' + (e.behavior || 'N/A') + ' | Consequence: ' + (e.consequence || 'N/A') + ' | Function: ' + (e.function || 'unknown');
                            });
                        }
                        if (observationSessions && observationSessions.length > 0) {
                            obsText += '\n\n--- Imported from BehaviorLens Observation Sessions ---\n';
                            observationSessions.slice(0, 5).forEach((s, i) => {
                                obsText += '\nSession ' + (i + 1) + ': ' + (s.date || '') + ' | Type: ' + (s.type || 'general') + ' | Duration: ' + (s.duration || 'N/A') + ' | Notes: ' + (s.notes || '').substring(0, 200);
                            });
                        }
                        setClinicalObs(prev => ({ ...prev, behavioral: { ...prev.behavioral, text: obsText } }));
                        if (addToast) addToast('BehaviorLens data imported to Behavioral observations', 'success');
                    }
                }, '\u{1F4E5} Import from BehaviorLens (' + (abcEntries?.length || 0) + ' ABC + ' + (observationSessions?.length || 0) + ' observations)'),
                // Sub-section tabs
                h('div', { className: 'flex flex-wrap gap-1 border-b border-slate-200 pb-2' },
                    OBS_TAB_META.map(tab =>
                        h('button', { 'aria-label': 'Select observation tab', key: tab.key,
                            className: 'px-2.5 py-1.5 rounded-t-lg text-[11px] font-medium transition-all ' + (activeObsTab === tab.key ? 'bg-violet-600 text-white' : (clinicalObs[tab.key]?.text?.trim() ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-slate-50 text-slate-600 hover:bg-slate-100')),
                            onClick: () => setActiveObsTab(tab.key)
                        }, tab.icon + ' ' + tab.label + (clinicalObs[tab.key]?.text?.trim() ? ' \u2713' : ''))
                    )
                ),
                // Active tab content
                h('div', { className: 'space-y-2' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600 block' },
                        clinicalObs[activeObsTab]?.source || activeObsTab
                    ),
                    h('textarea', {
                        className: 'w-full text-xs border rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400 h-40',
                        'aria-label': (clinicalObs[activeObsTab]?.source || activeObsTab) + ' observations',
                        placeholder: OBS_TAB_META.find(t => t.key === activeObsTab)?.placeholder || 'Enter observations...',
                        value: clinicalObs[activeObsTab]?.text || '',
                        onChange: e => setClinicalObs(prev => ({
                            ...prev,
                            [activeObsTab]: { ...prev[activeObsTab], text: e.target.value }
                        }))
                    }),
                    h('div', { className: 'flex items-center gap-2 text-[11px] text-slate-600' },
                        h('span', null, '\u{1F4CE} Source attribution: '),
                        h('span', { className: 'font-medium text-slate-600' }, clinicalObs[activeObsTab]?.source || 'Unknown'),
                        h('span', null, ' \u2014 will be tracked through fact extraction')
                    )
                ),
                // Summary of filled sections
                h('div', { className: 'bg-slate-50 rounded-lg p-2 flex flex-wrap gap-2' },
                    OBS_TAB_META.map(tab =>
                        h('span', { key: tab.key,
                            className: 'text-[11px] px-2 py-0.5 rounded-full ' + (clinicalObs[tab.key]?.text?.trim() ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600')
                        }, tab.icon + ' ' + tab.label + (clinicalObs[tab.key]?.text?.trim() ? ' (' + clinicalObs[tab.key].text.length + ' chars)' : ' \u2014'))
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(2) }, '\u2190 Background'),
                    h('button', { 'aria-label': 'Next: Assessment Scores', className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(4) }, 'Next: Assessment Scores \u2192')
                )
            ),

            // ═══ STEP 4: Assessment Score Entry ═══
            currentStep === 4 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-4' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '📊 Assessment Score Entry'),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Select an assessment and enter scores. Classifications are auto-calculated.'),
                // Assessment picker
                h('div', { className: 'flex flex-wrap items-end gap-3' },
                    h('div', { className: 'flex-1 min-w-[140px]' },
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Assessment'),
                        h('select', { className: 'w-full text-xs border rounded-lg px-2 py-1.5 bg-white', 'aria-label': 'Select assessment', value: selectedAssessment, onChange: e => setSelectedAssessment(e.target.value) },
                            Object.keys(ASSESSMENT_PRESETS).map(a => h('option', { key: a, value: a }, a))
                        )
                    ),
                    h('div', { className: 'text-[11px] text-slate-600 bg-slate-50 rounded px-2 py-1' },
                        `${(ASSESSMENT_PRESETS[selectedAssessment]?.scoreType || 'standard')} scores | Mean=${ASSESSMENT_PRESETS[selectedAssessment]?.mean || 100} SD=${ASSESSMENT_PRESETS[selectedAssessment]?.sd || 15}`
                    )
                ),
                // Preset subtests
                (ASSESSMENT_PRESETS[selectedAssessment]?.subtests || []).length > 0 && h('div', { className: 'space-y-2' },
                    h('p', { className: 'text-[11px] font-medium text-slate-600' }, `${selectedAssessment} Subtests:`),
                    h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                        (ASSESSMENT_PRESETS[selectedAssessment]?.subtests || []).map(sub => {
                            const existing = scoreEntries.find(s => s.assessment === selectedAssessment && s.subtest === sub);
                            return h('div', { key: sub, className: `flex items-center gap-2 ${existing ? 'opacity-50' : ''}` },
                                h('span', { className: 'text-[11px] text-slate-600 flex-1 truncate' }, sub),
                                !existing ? h('input', {
                                    type: 'number', className: 'w-16 text-xs border rounded px-1.5 py-0.5 text-center',
                                    'aria-label': 'Score for ' + sub,
                                    placeholder: 'Score',
                                    onKeyDown: e => { if (e.key === 'Enter' && e.target.value) { addScoreEntry(sub, e.target.value); e.target.value = ''; } }
                                }) : h('span', { className: `text-[11px] px-2 py-0.5 rounded-full ${cBadge(existing.classColor)}` }, `${existing.score} — ${existing.classification}`)
                            );
                        })
                    )
                ),
                // Custom subtest entry
                h('div', { className: 'flex items-end gap-2 pt-2 border-t border-slate-100' },
                    h('div', { className: 'flex-1' },
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Custom Subtest'),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-2 py-1.5', placeholder: 'Subtest name...', 'aria-label': 'Custom subtest name', value: customSubtest, onChange: e => setCustomSubtest(e.target.value) })
                    ),
                    h('div', { className: 'w-20' },
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Score'),
                        h('input', { type: 'number', className: 'w-full text-xs border rounded-lg px-2 py-1.5 text-center', placeholder: '0', value: customScore, onChange: e => setCustomScore(e.target.value) })
                    ),
                    h('button', { 'aria-label': 'Add score entry', className: 'px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors', onClick: () => { if (customSubtest && customScore) { addScoreEntry(customSubtest, customScore); setCustomSubtest(''); setCustomScore(''); } }
                    }, '+ Add')
                ),
                // Score entries table
                scoreEntries.length > 0 && h('div', { className: 'mt-3 space-y-1' },
                    h('div', { className: 'flex items-center justify-between' },
                        h('p', { className: 'text-[11px] font-bold text-slate-700' }, `${scoreEntries.length} Scores Entered`),
                        h('button', { 'aria-label': 'Clear All', className: 'text-[11px] text-red-500 hover:text-red-700', onClick: () => setScoreEntries([]) }, 'Clear All')
                    ),
                    h('div', { className: 'max-h-48 overflow-y-auto space-y-1' },
                        scoreEntries.map(s =>
                            h('div', { key: s.id, className: `flex items-center justify-between px-3 py-1.5 rounded-lg text-[11px] ${cBg(s.classColor)} border ${cBorder(s.classColor)}` },
                                h('span', { className: 'font-medium text-slate-800 flex-1' }, `${s.assessment} — ${s.subtest}`),
                                h('span', { className: `font-bold ${cText(s.classColor)}` }, `${s.score}`),
                                h('span', { className: `px-2 py-0.5 rounded-full text-[11px] ${cBadge(s.classColor)}` }, s.classification),
                                s.percentile !== null && h('span', { className: 'text-slate-600' }, `${s.percentile}%ile`),
                                h('button', { 'aria-label': 'Remove score entry', className: 'ml-2 text-red-400 hover:text-red-600', onClick: () => removeScoreEntry(s.id) }, '✕')
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(3) }, '← Observations'),
                    h('button', { 'aria-label': 'Next: Fact Review', className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors', onClick: () => { setCurrentStep(5); if (factChunks.length === 0) extractFactChunks(); } }, 'Next: Fact Review →')
                )
            ),
            // ═══ STEP 2: Background & History ═══
            currentStep === 2 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '📋 Background & History'),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Enter background information. PII is auto-scrubbed before any AI processing.'),
                h('div', { className: 'flex flex-wrap gap-2' },
                    (abcEntries?.length > 0 || observationSessions?.length > 0) && h('button', { className: 'px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors',
                        onClick: importFromBehaviorLens
                    }, `📥 Import from BehaviorLens (${(abcEntries?.length || 0)} ABC + ${(observationSessions?.length || 0)} observations)`),
                    longitudinalData && h('button', { 'aria-label': 'Import student progress', className: 'px-3 py-1.5 bg-teal-50 text-teal-700 text-[11px] font-medium rounded-lg border border-teal-200 hover:bg-teal-100 transition-colors',
                        onClick: importStudentProgress
                    }, `📈 Import Student Progress (${(longitudinalData.history?.length || 0)} activities${longitudinalData.mathFluencyHistory?.length ? ' + ' + longitudinalData.mathFluencyHistory.length + ' probes' : ''})`)
                ),
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
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, label),
                        h('textarea', {
                            className: 'w-full text-xs border rounded-lg px-3 py-2 resize-none focus:ring-2 focus:ring-violet-300 focus:border-violet-400',
                            'aria-label': label,
                            rows, placeholder, value: bgSections[key],
                            onChange: e => setBgSections(prev => ({ ...prev, [key]: e.target.value }))
                        })
                    )
                ),
                // ── Reference Library ──
                h('details', { className: 'mt-3 bg-indigo-50 rounded-lg border border-indigo-200' },
                    h('summary', { className: 'text-xs font-medium text-indigo-700 px-3 py-2 cursor-pointer hover:bg-indigo-100 rounded-t-lg' }, '\u{1F4DA} Reference Library (DSM-5-TR + Custom Documents)'),
                    h('div', { className: 'px-3 pb-3 space-y-2' },
                        h('p', { className: 'text-[11px] text-indigo-500' }, 'Add clinical references (e.g., MUSER, district protocols) for cross-referencing in analysis and report generation.'),
                        h('div', { className: 'px-2 py-1.5 bg-white rounded border border-indigo-100 flex items-center justify-between text-[11px]' },
                            h('span', { className: 'font-medium text-indigo-800' }, '\u{1F4D6} DSM-5-TR (Paraphrased Criteria) — Built-in'),
                            h('span', { className: 'text-[11px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full' }, 'Default')
                        ),
                        referenceLibrary.map(ref =>
                            h('div', { key: ref.id, className: 'px-2 py-1.5 bg-white rounded border border-slate-200 flex items-center justify-between text-[11px]' },
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('span', { className: 'font-medium text-slate-800 block truncate' }, ref.name),
                                    h('span', { className: 'text-slate-600 text-[11px]' }, ref.text.substring(0, 80) + '...')
                                ),
                                h('button', { 'aria-label': 'Remove reference', className: 'ml-2 text-red-400 hover:text-red-600 text-xs', onClick: () => setReferenceLibrary(prev => prev.filter(r => r.id !== ref.id)) }, '\u2715')
                            )
                        ),
                        h('div', { className: 'space-y-1 mt-2 bg-white rounded-lg p-2 border border-indigo-100' },
                            h('input', { type: 'text', className: 'w-full text-[11px] border rounded px-2 py-1', placeholder: 'Reference name (e.g., "MUSER Ch. 101")...', value: newRefName, onChange: e => setNewRefName(e.target.value) }),
                            h('textarea', { className: 'w-full text-[11px] border rounded px-2 py-1 h-20 resize-none font-mono', placeholder: 'Paste reference text here...', value: newRefText, onChange: e => setNewRefText(e.target.value) }),
                            newRefName.trim() && newRefText.trim() && h('button', { 'aria-label': 'Add reference', className: 'px-3 py-1 bg-indigo-600 text-white text-[11px] rounded hover:bg-indigo-700',
                                onClick: () => { setReferenceLibrary(prev => [...prev, { id: uid(), name: newRefName.trim(), text: newRefText.trim(), addedAt: new Date().toISOString() }]); setNewRefName(''); setNewRefText(''); if (addToast) addToast('Reference added', 'success'); }
                            }, '\u2795 Add Reference')
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(1) }, '← Student'),
                    h('button', { 'aria-label': 'Next: Clinical Observations', className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(3) }, 'Next: Clinical Observations →')
                )
            ),
            // ═══ STEP 5: Fact Chunk Review ═══
            currentStep === 5 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '🔒 Fact Chunk Review'),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Verify each fact. Verified chunks become immutable and serve as ground truth for the report.'),
                // Stats bar
                h('div', { className: 'flex items-center gap-3 bg-slate-50 rounded-lg p-2' },
                    h('span', { className: 'text-[11px] font-medium text-slate-600' }, `${totalChunks} total`),
                    h('span', { className: 'text-[11px] font-medium text-green-600' }, `✅ ${verifiedCount} verified`),
                    h('span', { className: 'text-[11px] font-medium text-slate-600' }, `⏳ ${totalChunks - verifiedCount} pending`),
                    deficitCount > 0 && h('span', { className: 'text-[11px] font-medium text-red-600' }, `⚠️ ${deficitCount} deficits`),
                    totalChunks > 0 && verifiedCount < totalChunks && h('button', { 'aria-label': 'Verify all fact chunks', className: 'ml-auto text-[11px] px-2 py-0.5 bg-green-700 text-white rounded-full hover:bg-green-700', onClick: verifyAllChunks
                    }, '✅ Verify All')
                ),
                extracting && h('div', { className: 'text-center py-6' },
                    h('div', { className: 'inline-block animate-spin w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full' }),
                    h('p', { className: 'text-xs text-slate-600 mt-2' }, 'Extracting fact chunks...')
                ),
                // Chunk cards
                !extracting && h('div', { className: 'space-y-2 max-h-[400px] overflow-y-auto' },
                    factChunks.length === 0 && h('div', { className: 'text-center py-8 text-slate-600' },
                        h('p', { className: 'text-sm' }, 'No fact chunks yet'),
                        h('button', { 'aria-label': '🔍 Extract Facts', className: 'mt-2 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg', onClick: extractFactChunks }, '🔍 Extract Facts')
                    ),
                    factChunks.map(chunk =>
                        h('div', { key: chunk.id, className: `rounded-lg p-3 border transition-all ${chunk.verified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}` },
                            h('div', { className: 'flex items-start justify-between gap-2' },
                                h('div', { className: 'flex-1' },
                                    h('div', { className: 'flex items-center gap-2 mb-1' },
                                        h('span', { className: `text-[11px] px-1.5 py-0.5 rounded-full font-medium ${chunk.type === 'score' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}` }, chunk.type),
                                        h('span', { className: 'text-[11px] text-slate-600' }, chunk.source),
                                        chunk.verified && h('span', { className: 'text-[11px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold' }, '🔒 Immutable'),
                                        chunk.devNormResult && h('span', { className: `text-[11px] px-1.5 py-0.5 rounded-full font-medium ${cBadge(chunk.devNormResult.color)}` }, chunk.devNormResult.label)
                                    ),
                                    h('p', { className: 'text-xs font-medium text-slate-800' }, `${chunk.field}: ${chunk.type === 'score' ? chunk.value + ' (' + chunk.classification + ')' : chunk.value}`),
                                    chunk.devNormResult?.explanation && h('p', { className: `text-[11px] mt-0.5 ${cText(chunk.devNormResult.color)}` }, chunk.devNormResult.explanation)
                                ),
                                !chunk.verified && h('div', { className: 'flex items-center gap-1' },
                                    h('button', { className: 'px-2 py-1 bg-green-700 text-white text-[11px] rounded hover:bg-green-700', onClick: () => verifyChunk(chunk.id), title: 'Verify & Lock' }, '✅'),
                                    h('button', { 'aria-label': 'Reject fact chunk', className: 'px-2 py-1 bg-red-100 text-red-600 text-[11px] rounded hover:bg-red-200', onClick: () => rejectChunk(chunk.id), title: 'Reject' }, '✕')
                                )
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(4) }, '← Scores'),
                    h('button', { 'aria-label': 'Go to hypotheses', className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${verifiedCount > 0 ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-600 cursor-not-allowed'}`,
                        disabled: verifiedCount === 0, onClick: () => setCurrentStep(6)
                    }, `Next: Hypotheses (${verifiedCount} facts) →`)
                )
            ),

            // ═══ STEP 6: Diagnostic Hypotheses ═══
            currentStep === 6 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '\u{1F52C} Diagnostic Hypotheses'),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Enter diagnostic hypotheses to evaluate. The AI will organize your verified evidence for and against each hypothesis.'),
                // Hypothesis presets
                h('div', { className: 'space-y-2' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600' }, 'Quick Add:'),
                    h('div', { className: 'flex flex-wrap gap-1' },
                        HYPOTHESIS_PRESETS.filter(p => !hypotheses.includes(p)).map(preset =>
                            h('button', { 'aria-label': 'Add hypothesis preset', key: preset,
                                className: 'px-2 py-1 bg-violet-50 text-violet-700 text-[11px] rounded-full border border-violet-200 hover:bg-violet-100 transition-colors',
                                onClick: () => setHypotheses(prev => [...prev, preset])
                            }, '+ ' + preset)
                        )
                    ),
                    // Custom hypothesis
                    h('div', { className: 'flex gap-2 mt-1' },
                        h('input', { type: 'text', className: 'flex-1 text-[11px] border rounded-lg px-2 py-1', placeholder: 'Custom hypothesis...', 'aria-label': 'Custom hypothesis', value: newHypothesis, onChange: e => setNewHypothesis(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && newHypothesis.trim()) { setHypotheses(prev => [...prev, newHypothesis.trim()]); setNewHypothesis(''); } } }),
                        h('button', { 'aria-label': 'Add', className: 'px-3 py-1 bg-violet-600 text-white text-[11px] rounded-lg hover:bg-violet-700', disabled: !newHypothesis.trim(), onClick: () => { if (newHypothesis.trim()) { setHypotheses(prev => [...prev, newHypothesis.trim()]); setNewHypothesis(''); } } }, 'Add')
                    )
                ),
                // Current hypotheses
                hypotheses.length > 0 && h('div', { className: 'bg-slate-50 rounded-lg p-3 space-y-1' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Active Hypotheses:'),
                    hypotheses.map((hyp, i) =>
                        h('div', { key: i, className: 'flex items-center justify-between px-2 py-1.5 bg-white rounded border text-[11px] ' + (selectedHypotheses.includes(hyp) ? 'border-violet-300 bg-violet-50' : 'border-slate-200') },
                            h('div', { className: 'flex items-center gap-2 flex-1' },
                                h('input', { type: 'checkbox', 'aria-label': 'Include hypothesis: ' + hyp, checked: selectedHypotheses.includes(hyp), onChange: e => { if (e.target.checked) setSelectedHypotheses(prev => [...prev, hyp]); else setSelectedHypotheses(prev => prev.filter(h => h !== hyp)); } }),
                                h('span', { className: 'font-medium text-slate-800' }, hyp),
                                differentialResults[hyp] && h('span', { className: 'px-1.5 py-0.5 rounded-full text-[11px] font-bold ' + (differentialResults[hyp].strengthScore >= 7 ? 'bg-green-100 text-green-700' : differentialResults[hyp].strengthScore >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')
                                }, differentialResults[hyp].strengthScore + '/10')
                            ),
                            hyp !== 'No Diagnosis / Does Not Qualify' && h('button', { 'aria-label': 'Remove hypothesis', className: 'text-red-400 hover:text-red-600 ml-2', onClick: () => { setHypotheses(prev => prev.filter(h => h !== hyp)); setSelectedHypotheses(prev => prev.filter(h => h !== hyp)); } }, '\u2715')
                        )
                    ),
                    h('p', { className: 'text-[11px] text-slate-600 mt-1' }, '\u2611\uFE0F Check hypotheses to include in report generation. "No Diagnosis" is always evaluated as baseline.')
                ),
                // Run analysis button
                factChunks.filter(c => c.verified).length > 0 && h('div', { className: 'pt-2' },
                    h('button', { 'aria-label': 'Run differential analysis', className: 'w-full px-4 py-2.5 text-xs font-medium rounded-lg transition-colors ' + (runningDifferential ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:from-violet-700 hover:to-indigo-700'),
                        disabled: runningDifferential || hypotheses.length < 2,
                        onClick: runDifferentialAnalysis
                    }, runningDifferential ? '\u23F3 Analyzing evidence...' : '\u{1F52C} Run Differential Analysis')
                ),
                hypotheses.length < 2 && h('p', { className: 'text-[11px] text-amber-600 text-center' }, 'Add at least 2 hypotheses (including "No Diagnosis") to run analysis.'),
                // Differential results
                Object.keys(differentialResults).length > 0 && h('div', { className: 'space-y-2 mt-2' },
                    h('h4', { className: 'text-xs font-bold text-indigo-700' }, '\u{1F4CA} Differential Evidence Summary'),
                    Object.entries(differentialResults).map(([name, data]) =>
                        h('details', { key: name, className: 'bg-slate-50 rounded-lg border border-slate-200', open: true },
                            h('summary', { className: 'text-xs font-medium text-slate-700 px-3 py-2 cursor-pointer hover:bg-slate-100 rounded-t-lg flex items-center gap-2' },
                                h('span', {
                                    className: 'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ' + (data.strengthScore >= 7 ? 'bg-green-500' : data.strengthScore >= 4 ? 'bg-amber-500' : 'bg-red-400')
                                }, data.strengthScore || '?'),
                                name
                            ),
                            h('div', { className: 'px-3 pb-2 space-y-1 text-[11px]' },
                                data.evidenceFor && data.evidenceFor.length > 0 && h('div', null,
                                    h('p', { className: 'font-medium text-green-700' }, '\u2705 Evidence For:'),
                                    data.evidenceFor.map((e, i) => h('p', { key: i, className: 'ml-3 text-slate-600' }, '- ' + e.fact + ' (' + e.strength + ': ' + (e.explanation || '') + ')'))
                                ),
                                data.evidenceAgainst && data.evidenceAgainst.length > 0 && h('div', null,
                                    h('p', { className: 'font-medium text-red-600' }, '\u274C Evidence Against:'),
                                    data.evidenceAgainst.map((e, i) => h('p', { key: i, className: 'ml-3 text-slate-600' }, '- ' + e.fact + ': ' + (e.explanation || '')))
                                ),
                                data.evidenceGaps && data.evidenceGaps.length > 0 && h('div', null,
                                    h('p', { className: 'font-medium text-amber-600' }, '\u26A0\uFE0F Evidence Gaps:'),
                                    data.evidenceGaps.map((g, i) => h('p', { key: i, className: 'ml-3 text-slate-600' }, '- ' + g))
                                )
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(5) }, '\u2190 Fact Chunks'),
                    h('button', { 'aria-label': 'Next: Blueprint', className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(7) }, 'Next: Blueprint \u2192')
                )
            ),

            // ═══ STEP 7: Report Blueprint ═══
            currentStep === 7 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '\u{1F4D0} Report Blueprint'),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Customize your report structure, section order, and add notes to guide each section\'s generation.'),
                // Report type selector
                h('div', { className: 'flex items-center gap-2' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600' }, 'Report Type:'),
                    h('select', {
                        className: 'text-xs border rounded-lg px-2 py-1',
                        'aria-label': 'Report type',
                        value: reportType,
                        onChange: e => {
                            const t = e.target.value;
                            setReportType(t);
                            setBlueprint(BLUEPRINT_TEMPLATES[t].map(s => ({ ...s, id: uid() })));
                        }
                    },
                        Object.keys(BLUEPRINT_TEMPLATES).map(t => h('option', { key: t, value: t }, t))
                    )
                ),
                // Section list
                h('div', { className: 'space-y-1' },
                    blueprint.map((section, idx) =>
                        h('div', { key: section.id, className: 'bg-slate-50 rounded-lg border border-slate-200 p-2 ' + (!section.enabled ? 'opacity-50' : '') },
                            h('div', { className: 'flex items-center gap-2' },
                                h('div', { className: 'flex flex-col gap-0.5' },
                                    h('button', { className: 'text-[11px] text-slate-600 hover:text-slate-700 leading-none', disabled: idx === 0,
                                        onClick: () => { const nw = [...blueprint]; const tmp = nw[idx]; nw[idx] = nw[idx - 1]; nw[idx - 1] = tmp; setBlueprint(nw); }
                                    }, '\u25B2'),
                                    h('button', { 'aria-label': 'Move section down', className: 'text-[11px] text-slate-600 hover:text-slate-700 leading-none', disabled: idx === blueprint.length - 1,
                                        onClick: () => { const nw = [...blueprint]; const tmp = nw[idx]; nw[idx] = nw[idx + 1]; nw[idx + 1] = tmp; setBlueprint(nw); }
                                    }, '\u25BC')
                                ),
                                h('input', { type: 'checkbox', 'aria-label': 'Enable section: ' + section.name, checked: section.enabled, onChange: e => { const nw = [...blueprint]; nw[idx] = { ...nw[idx], enabled: e.target.checked }; setBlueprint(nw); } }),
                                h('span', { className: 'text-[11px] font-medium text-slate-800 flex-1' }, (idx + 1) + '. ' + section.name),
                                h('button', { 'aria-label': 'Remove report section', className: 'text-red-400 hover:text-red-600 text-xs', onClick: () => setBlueprint(prev => prev.filter(s => s.id !== section.id)) }, '\u2715')
                            ),
                            h('input', {
                                type: 'text',
                                className: 'w-full text-[11px] border rounded px-2 py-0.5 mt-1 text-slate-600',
                                'aria-label': 'Notes for section: ' + section.name,
                                placeholder: 'Section notes (e.g., "focus on classroom accommodations")...',
                                value: section.notes,
                                onChange: e => { const nw = [...blueprint]; nw[idx] = { ...nw[idx], notes: e.target.value }; setBlueprint(nw); }
                            })
                        )
                    ),
                    h('button', { 'aria-label': 'Add report section', className: 'w-full px-3 py-1.5 bg-slate-100 text-slate-600 text-[11px] rounded-lg hover:bg-slate-200 border border-dashed border-slate-300',
                        onClick: () => setBlueprint(prev => [...prev, { id: uid(), name: 'New Section', notes: '', enabled: true }])
                    }, '\u2795 Add Section')
                ),
                // Style profile
                h('details', { className: 'mt-2 bg-amber-50 rounded-lg border border-amber-200' },
                    h('summary', { className: 'text-xs font-medium text-amber-700 px-3 py-2 cursor-pointer hover:bg-amber-100 rounded-t-lg' }, '\u{1F3A8} Writing Style (paste sample report)'),
                    h('div', { className: 'px-3 pb-3' },
                        h('p', { className: 'text-[11px] text-amber-600 mb-1' }, 'Paste a redacted sample report to match your professional writing style.'),
                        h('textarea', {
                            className: 'w-full text-[11px] border rounded-lg px-2 py-1 h-32 resize-none font-mono',
                            'aria-label': 'Writing style sample report',
                            placeholder: 'Paste a sample report here (redact student names)...',
                            value: styleProfile,
                            onChange: e => setStyleProfile(e.target.value)
                        }),
                        styleProfile && h('p', { className: 'text-[11px] text-amber-500 mt-1' }, '\u2705 Style profile loaded (' + styleProfile.length + ' chars) — will guide AI writing tone and structure.')
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(6) }, '\u2190 Hypotheses'),
                    h('button', { 'aria-label': 'Next: Generate', className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(8) }, 'Next: Generate \u2192')
                )
            ),
            // ═══ STEP 8: Generate Report ═══
            currentStep === 8 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '✍️ Generate Report'),
                h('div', { className: 'flex items-center gap-3 mb-2' },
                    h('div', { className: 'flex-1' },
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Report Title'),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-3 py-1.5', 'aria-label': 'Report title', value: reportTitle, onChange: e => setReportTitle(e.target.value) })
                    ),
                    h('div', { className: 'shrink-0 text-center' },
                        h('label', { className: 'text-[11px] font-bold text-slate-600 uppercase block mb-0.5' }, `Quality: ${reportGenPasses}x`),
                        h('input', { type: 'range', min: 1, max: 5, value: reportGenPasses, onChange: e => setReportGenPasses(parseInt(e.target.value)),
                            className: 'w-16', 'aria-label': 'Generation passes per section',
                            title: reportGenPasses === 1 ? 'Fast (1 pass)' : reportGenPasses <= 3 ? 'Balanced (' + reportGenPasses + ' passes)' : 'Research-grade (' + reportGenPasses + ' passes)' }),
                        h('div', { className: 'text-[11px] text-slate-600' }, reportGenPasses === 1 ? 'Fast' : reportGenPasses <= 3 ? 'Balanced' : 'Research')
                    ),
                    h('button', { 'aria-label': 'Generate report', className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${generating ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700'}`,
                        disabled: generating, 'aria-busy': generating, onClick: generateReport
                    }, generating ? `⏳ ${genProgress || 'Generating...'}` : `✨ Generate${reportGenPasses > 1 ? ' (' + reportGenPasses + 'x)' : ''}`)
                ),
                generating && h('div', { className: 'space-y-2' },
                    h('div', { className: 'w-full bg-slate-100 rounded-full h-2 overflow-hidden' },
                        h('div', { className: 'h-full bg-violet-500 rounded-full transition-all animate-pulse', style: { width: '60%' } })
                    ),
                    h('p', { className: 'text-[11px] text-center text-violet-600' }, genProgress)
                ),
                // Generated sections with evidence mapping & per-section controls
                Object.keys(reportSections).length > 0 && h('div', { className: 'space-y-3 mt-3' },
                    Object.entries(reportSections).map(([section, text]) =>
                        h('div', { key: section, className: 'bg-slate-50 rounded-lg p-3 border border-slate-200' },
                            // Section header with controls
                            h('div', { className: 'flex items-center justify-between mb-2 border-b border-slate-200 pb-1' },
                                h('h4', { className: 'text-xs font-bold text-indigo-700' }, section),
                                h('div', { className: 'flex items-center gap-1' },
                                    // Edit button
                                    editingSection !== section && h('button', { 'aria-label': 'Edit section', className: 'text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors', onClick: () => { setEditingSection(section); setEditSectionText(text); }
                                    }, '\u270F\uFE0F Edit'),
                                    // Grade-level adaptation dropdown
                                    h('select', {
                                        className: `text-[11px] px-1.5 py-0.5 rounded border transition-colors ${adaptingSection === section ? 'bg-teal-200 text-teal-700 cursor-wait border-teal-300' : 'bg-teal-50 text-teal-700 border-teal-200 hover:bg-teal-100'}`,
                                        'aria-label': 'Adapt grade level for ' + section,
                                        disabled: adaptingSection === section,
                                        value: '',
                                        onChange: e => { if (e.target.value) adaptSectionGradeLevel(section, text, e.target.value); }
                                    },
                                        h('option', { value: '' }, adaptingSection === section ? '⏳ Adapting...' : '📖 Adapt Level'),
                                        h('option', { value: 'Parent-Friendly' }, '👨‍👩‍👧 Parent-Friendly'),
                                        h('option', { value: 'Professional' }, '🩺 Professional'),
                                        h('option', { value: 'Student-Friendly (Elementary)' }, '🧒 Student (Elem)'),
                                        h('option', { value: 'Student-Friendly (Secondary)' }, '🧑 Student (Secondary)')
                                    ),
                                    // Regenerate button
                                    h('button', { 'aria-label': 'Show regeneration options', className: `text-[11px] px-2 py-0.5 rounded transition-colors ${regenSection === section ? 'bg-amber-200 text-amber-700 cursor-wait' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`,
                                        disabled: regenSection === section,
                                        onClick: () => showRegenInput === section ? setShowRegenInput(null) : setShowRegenInput(section)
                                    }, regenSection === section ? '⏳ Regenerating...' : '\uD83D\uDD04 Regen')
                                )
                            ),
                            // Regeneration input panel
                            showRegenInput === section && h('div', { className: 'mb-2 p-2 bg-amber-50 rounded-lg border border-amber-200 space-y-1' },
                                h('p', { className: 'text-[11px] text-amber-700 font-medium' }, 'Custom instructions for regeneration (optional):'),
                                h('textarea', {
                                    className: 'w-full text-[11px] border rounded px-2 py-1 h-16 resize-none',
                                    'aria-label': 'Regeneration instructions',
                                    placeholder: 'e.g., "Make more concise" or "Emphasize processing speed findings"...',
                                    value: regenInstructions,
                                    onChange: e => setRegenInstructions(e.target.value)
                                }),
                                h('div', { className: 'flex gap-1' },
                                    h('button', { className: 'text-[11px] px-3 py-1 rounded bg-amber-700 text-white hover:bg-amber-600 font-medium', onClick: () => regenerateSection(section, regenInstructions)
                                    }, '\u2728 Regenerate'),
                                    h('button', { 'aria-label': 'Cancel regeneration', className: 'text-[11px] px-2 py-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300', onClick: () => { setShowRegenInput(null); setRegenInstructions(''); }
                                    }, 'Cancel')
                                )
                            ),
                            // Inline editing or display
                            editingSection === section
                                ? h('div', { className: 'space-y-1' },
                                    h('textarea', {
                                        className: 'w-full text-[11px] text-slate-700 leading-relaxed border rounded-lg px-2 py-1.5 h-48 resize-y font-mono',
                                        'aria-label': 'Edit section text',
                                        value: editSectionText,
                                        onChange: e => setEditSectionText(e.target.value)
                                    }),
                                    h('div', { className: 'flex gap-1' },
                                        h('button', { className: 'text-[11px] px-3 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-600 font-medium',
                                            onClick: () => { setReportSections(prev => ({ ...prev, [section]: editSectionText })); setEditingSection(null); setAccuracyResults([]); if (addToast) addToast(`"${section}" updated`, 'success'); }
                                        }, '\u2705 Save'),
                                        h('button', { 'aria-label': 'Cancel editing', className: 'text-[11px] px-2 py-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300', onClick: () => setEditingSection(null)
                                        }, 'Cancel')
                                    )
                                )
                                : h('div', { className: 'text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap' },
                                    text.replace(/\[Student\]/g, studentName || '[Student]')
                                ),
                            // Evidence chips
                            (sectionEvidenceMap[section] || []).length > 0 && h('div', { className: 'flex flex-wrap gap-1 mt-2 pt-1 border-t border-slate-100' },
                                h('span', { className: 'text-[11px] text-slate-600 mr-1 self-center' }, 'Evidence:'),
                                (sectionEvidenceMap[section] || []).map(chunkId => {
                                    const chunk = factChunks.find(c => c.id === chunkId);
                                    const chipColor = chunk ? (chunk.type === 'score' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') : 'bg-slate-100 text-slate-600';
                                    const chipLabel = chunk ? `${chunk.source}:${(chunk.field || '').substring(0, 15)}` : chunkId.substring(0, 8);
                                    return h('span', { key: chunkId,
                                        className: `text-[11px] px-1.5 py-0.5 rounded-full font-medium cursor-pointer hover:ring-1 hover:ring-offset-1 ${chipColor}`,
                                        title: chunk ? `${chunk.source} - ${chunk.field}: ${chunk.value}` : chunkId,
                                        onClick: () => setCurrentStep(5)
                                    }, chipLabel);
                                })
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(7) }, '← Blueprint'),
                    h('button', { 'aria-label': 'Go to export', className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${Object.keys(reportSections).length > 0 ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-600 cursor-not-allowed'}`,
                        disabled: Object.keys(reportSections).length === 0, onClick: () => { setCurrentStep(9); if (accuracyResults.length === 0) runAccuracyCheck(); }
                    }, 'Next: Accuracy Check →')
                )
            ),
            // ═══ STEP 9: Accuracy Dashboard ═══
            currentStep === 9 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '🎯 Accuracy Dashboard'),
                h('p', { className: 'text-[11px] text-slate-600' }, 'Dual-pass verification: two independent AI auditors cross-reference each claim against immutable fact chunks.'),
                checking ? h('div', { className: 'text-center py-8' },
                    h('div', { className: 'inline-block animate-spin w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full' }),
                    h('p', { className: 'text-xs text-slate-600 mt-3' }, 'Running accuracy audit against fact chunks...')
                ) : h('div', { className: 'space-y-3' },
                    // Summary bar
                    accuracyResults.length > 0 && h('div', { className: 'flex items-center gap-4 bg-slate-50 rounded-lg p-3' },
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-green-600' }, accuracyResults.filter(r => r.status === 'verified').length),
                            h('p', { className: 'text-[11px] text-slate-600' }, '🟢 Verified')
                        ),
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-amber-500' }, accuracyResults.filter(r => r.status === 'unsourced').length),
                            h('p', { className: 'text-[11px] text-slate-600' }, '🟡 Unsourced')
                        ),
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-red-600' }, accuracyResults.filter(r => r.status === 'contradicts').length),
                            h('p', { className: 'text-[11px] text-slate-600' }, '🔴 Contradicts')
                        ),
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-purple-600' }, accuracyResults.filter(r => r.status === 'discrepancy').length),
                            h('p', { className: 'text-[11px] text-slate-600' }, '\u26A0\uFE0F Discrepancy')
                        ),
                        h('div', { className: 'ml-auto text-center' },
                            h('p', { className: 'text-lg font-bold text-violet-700' }, `${accuracyResults.length > 0 ? Math.round((accuracyResults.filter(r => r.status === 'verified').length / accuracyResults.length) * 100) : 0}%`),
                            h('p', { className: 'text-[11px] text-slate-600' }, 'Accuracy')
                        ),
                        h('button', { 'aria-label': '🔄 Re-check', className: 'px-3 py-1 bg-violet-100 text-violet-700 text-[11px] rounded-lg hover:bg-violet-200', onClick: runAccuracyCheck }, '🔄 Re-check')
                    ),
                    // Claim-by-claim results
                    accuracyResults.length > 0 && h('div', { className: 'space-y-1 max-h-[350px] overflow-y-auto' },
                        accuracyResults.map((r, i) =>
                            h('div', { key: i, className: `flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] border ${r.status === 'verified' ? 'bg-green-50 border-green-200' : r.status === 'unsourced' ? 'bg-amber-50 border-amber-200' : r.status === 'discrepancy' ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}` },
                                h('span', { className: 'text-sm flex-shrink-0 mt-0.5' }, r.status === 'verified' ? '🟢' : r.status === 'unsourced' ? '🟡' : r.status === 'discrepancy' ? '\u26A0\uFE0F' : '🔴'),
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('p', { className: 'font-medium text-slate-800 break-words' }, r.claim),
                                    h('p', { className: 'text-slate-600 mt-0.5' }, r.explanation || ''),
                                    r.confidence && h('span', { className: 'inline-block mt-0.5 text-[11px] px-1.5 py-0.5 rounded-full ' + (r.confidence === 'high' ? 'bg-green-100 text-green-700' : r.confidence === 'needs-review' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600') }, r.confidence === 'high' ? 'High Confidence' : r.confidence === 'needs-review' ? 'Needs Review' : 'Medium'),
                                    r.auditSource && r.auditSource.startsWith('dual') && h('span', { className: 'inline-block mt-0.5 ml-1 text-[11px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600' }, 'Dual-Pass')
                                )
                            )
                        )
                    ),
                    accuracyResults.length === 0 && h('div', { className: 'text-center py-8' },
                        h('p', { className: 'text-slate-600 text-xs' }, 'No accuracy results yet'),
                        h('button', { 'aria-label': '🎯 Run Accuracy Check', className: 'mt-2 px-4 py-2 bg-violet-600 text-white text-xs rounded-lg', onClick: runAccuracyCheck }, '🎯 Run Accuracy Check')
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(8) }, '← Report'),
                    h('button', { 'aria-label': 'Next: Export', className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(10) }, 'Next: Export →')
                )
            ),
            // ═══ STEP 10: Export ═══
            currentStep === 10 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-200 space-y-3' },
                h('h3', { className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, '📥 Export & Save'),
                // Accuracy summary
                accuracyResults.length > 0 && h('div', { className: `rounded-lg p-3 border ${accuracyResults.filter(r => r.status === 'contradicts').length > 0 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}` },
                    h('p', { className: `text-xs font-medium ${accuracyResults.filter(r => r.status === 'contradicts').length > 0 ? 'text-red-700' : 'text-green-700'}` },
                        accuracyResults.filter(r => r.status === 'contradicts').length > 0
                            ? `⚠️ ${accuracyResults.filter(r => r.status === 'contradicts').length} claim(s) contradict fact chunks — review before exporting`
                            : `✅ ${accuracyResults.filter(r => r.status === 'verified').length}/${accuracyResults.length} claims verified — ready to export`
                    )
                ),
                // Clinician attestation
                Object.keys(reportSections).length > 0 && h('div', { className: `rounded-lg p-3 border ${clinicianAttested ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}` },
                    h('label', { className: 'flex items-start gap-2 cursor-pointer' },
                        h('input', { type: 'checkbox', checked: clinicianAttested, onChange: (e) => setClinicianAttested(e.target.checked), className: 'mt-0.5 rounded border-slate-300 text-green-600 focus:ring-green-400' }),
                        h('span', { className: 'text-[11px] text-slate-700 leading-relaxed' },
                            h('strong', null, 'Clinician Attestation: '),
                            'I have independently reviewed the assessment data, verified all score entries match protocols, reviewed AI-generated interpretations for clinical accuracy, and I am the licensed professional responsible for this evaluation.'
                        )
                    )
                ),
                // Export buttons
                h('div', { className: 'grid grid-cols-2 sm:grid-cols-4 gap-2' },
                    h('button', { 'aria-label': 'Export as JSON', className: 'flex flex-col items-center gap-1 px-3 py-3 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors', onClick: exportJSON },
                        h('span', { className: 'text-lg' }, '💾'),
                        h('span', { className: 'text-[11px] font-medium text-violet-700' }, 'Save JSON')
                    ),
                    h('button', { 'aria-label': 'Copy report to clipboard', className: `flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-colors ${accuracyResults.filter(r => r.status === 'contradicts').length > 0 ? 'bg-red-50 border border-red-200 opacity-50 cursor-not-allowed' : 'bg-indigo-50 border border-indigo-200 hover:bg-indigo-100'}`, onClick: () => { if (accuracyResults.filter(r => r.status === 'contradicts').length > 0) { addToast('Resolve contradictions before copying — run accuracy audit and fix flagged claims', 'error'); return; } copyFullReport(); }, disabled: Object.keys(reportSections).length === 0 },
                        h('span', { className: 'text-lg' }, '📋'),
                        h('span', { className: 'text-[11px] font-medium text-indigo-700' }, 'Copy Report')
                    ),
                    h('button', { 'aria-label': 'Copy formal report', className: `flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-colors ${accuracyResults.filter(r => r.status === 'contradicts').length > 0 ? 'bg-red-50 border border-red-200 opacity-50 cursor-not-allowed' : 'bg-blue-50 border border-blue-200 hover:bg-blue-100'}`, onClick: () => { if (accuracyResults.filter(r => r.status === 'contradicts').length > 0) { addToast('Resolve contradictions before printing — run accuracy audit and fix flagged claims', 'error'); return; } printReport(); }, disabled: Object.keys(reportSections).length === 0 },
                        h('span', { className: 'text-lg' }, '🖨️'),
                        h('span', { className: 'text-[11px] font-medium text-blue-700' }, 'Print / PDF')
                    ),
                    h('button', { 'aria-label': 'Print report', className: 'flex flex-col items-center gap-1 px-3 py-3 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors', onClick: () => document.getElementById('rw-import-area')?.focus() },
                        h('span', { className: 'text-lg' }, '📂'),
                        h('span', { className: 'text-[11px] font-medium text-emerald-700' }, 'Load JSON')
                    )
                ),
                // ── Report Translation ──
                Object.keys(reportSections).length > 0 && h('details', { className: 'mt-3 bg-sky-50 rounded-lg border border-sky-200' },
                    h('summary', { className: 'text-xs font-medium text-sky-700 px-3 py-2 cursor-pointer hover:bg-sky-100 rounded-t-lg' }, '🌏 Translate Report'),
                    h('div', { className: 'px-3 pb-3 space-y-2' },
                        h('p', { className: 'text-[11px] text-sky-600' }, 'Translate the full report for multilingual families. Clinical terms use accepted equivalents.'),
                        h('div', { className: 'flex items-center gap-2' },
                            h('select', { className: 'text-xs border rounded-lg px-2 py-1.5 bg-white flex-1', value: translationLang, onChange: e => setTranslationLang(e.target.value) },
                                ['Spanish', 'French', 'Portuguese', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Arabic', 'Vietnamese', 'Korean', 'Haitian Creole', 'Somali', 'Russian', 'German', 'Japanese', 'Tagalog', 'Hindi', 'Urdu'].map(lang => h('option', { key: lang, value: lang }, lang))
                            ),
                            h('button', { 'aria-label': 'Translate report', className: `px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${translating ? 'bg-sky-300 text-sky-600 cursor-wait' : 'bg-sky-600 text-white hover:bg-sky-700'}`,
                                disabled: translating,
                                onClick: translateReport
                            }, translating ? '⏳ Translating...' : '🌏 Translate')
                        ),
                        translatedReport && h('div', { className: 'mt-2 space-y-2' },
                            h('div', { className: 'flex items-center justify-between' },
                                h('p', { className: 'text-[11px] font-medium text-sky-700' }, `Translated Report (${translationLang})`),
                                h('button', { 'aria-label': '📋 Copy', className: 'text-[11px] px-2 py-0.5 bg-sky-600 text-white rounded hover:bg-sky-700', onClick: copyTranslatedReport }, '📋 Copy')
                            ),
                            h('div', { className: 'bg-white rounded-lg border border-sky-200 p-3 max-h-[300px] overflow-y-auto' },
                                h('pre', { className: 'text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed' }, translatedReport)
                            )
                        )
                    )
                ),
                // Import area
                h('div', { className: 'mt-2' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, 'Import JSON (paste previously exported data):'),
                    h('textarea', {
                        id: 'rw-import-area', className: 'w-full text-[11px] border rounded-lg px-3 py-2 font-mono resize-none h-20',
                        'aria-label': 'Import JSON data',
                        placeholder: 'Paste JSON data here...', value: importText, onChange: e => setImportText(e.target.value)
                    }),
                    importText.trim() && h('button', { 'aria-label': '📂 Import Data', className: 'mt-1 px-3 py-1 bg-emerald-700 text-white text-[11px] rounded-lg hover:bg-emerald-700', onClick: importJSON }, '📂 Import Data')
                ),
                // ── Saved Reports Gallery ──
                h('div', { className: 'mt-3 bg-violet-50 rounded-lg border border-violet-200 p-3 space-y-2' },
                    h('h4', { className: 'text-xs font-bold text-violet-800 flex items-center gap-1' }, '📚 Saved Reports'),
                    h('div', { className: 'flex items-center gap-2' },
                        h('input', { type: 'text', className: 'flex-1 text-[11px] border rounded-lg px-2 py-1', placeholder: 'Report name (optional)...', 'aria-label': 'Report name', value: saveReportName, onChange: e => setSaveReportName(e.target.value) }),
                        h('button', { className: 'px-3 py-1 bg-violet-600 text-white text-[11px] font-medium rounded-lg hover:bg-violet-700 transition-colors whitespace-nowrap', onClick: saveReportToGallery }, '💾 Save Report'),
                        h('button', { 'aria-label': '🗑️ New Report', className: 'px-3 py-1 bg-red-100 text-red-600 text-[11px] font-medium rounded-lg hover:bg-red-200 transition-colors whitespace-nowrap', onClick: clearDraft }, '🗑️ New Report')
                    ),
                    savedReports.length > 0 && h('div', { className: 'space-y-1 max-h-40 overflow-y-auto mt-1' },
                        savedReports.map(r =>
                            h('div', { key: r.id, className: 'flex items-center justify-between px-2 py-1.5 bg-white rounded border border-violet-100 text-[11px]' },
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('span', { className: 'font-medium text-slate-800 truncate block' }, r.name),
                                    h('span', { className: 'text-slate-600' }, new Date(r.savedAt).toLocaleDateString() + ' • ' + (r.scoreEntries?.length || 0) + ' scores')
                                ),
                                h('div', { className: 'flex gap-1 ml-2' },
                                    h('button', { className: 'px-2 py-0.5 bg-violet-100 text-violet-700 rounded hover:bg-violet-200', onClick: () => loadSavedReport(r) }, 'Load'),
                                    h('button', { 'aria-label': 'Delete saved report', className: 'px-2 py-0.5 bg-red-50 text-red-500 rounded hover:bg-red-100', onClick: () => deleteSavedReport(r.id) }, '✕')
                                )
                            )
                        )
                    ),
                    savedReports.length === 0 && h('p', { className: 'text-[11px] text-violet-400 text-center py-2' }, 'No saved reports yet. Use "Save Report" to keep a copy.')
                ),
                // Quick report preview
                Object.keys(reportSections).length > 0 && h('details', { className: 'mt-2 bg-slate-50 rounded-lg border border-slate-200' },
                    h('summary', { className: 'text-xs font-medium text-slate-700 px-3 py-2 cursor-pointer hover:bg-slate-100 rounded-lg' }, '📄 Preview Full Report'),
                    h('div', { className: 'px-4 py-3 space-y-3 max-h-[400px] overflow-y-auto' },
                        h('h2', { className: 'text-sm font-bold text-center text-slate-800' }, reportTitle),
                        h('p', { className: 'text-[11px] text-center text-slate-600' }, `Student: ${studentName || '[Student]'} | Age: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'} | Date: ${new Date().toLocaleDateString()}`),
                        h('hr', { className: 'border-slate-200' }),
                        Object.entries(reportSections).map(([section, text]) =>
                            h('div', { key: section },
                                h('h3', { className: 'text-xs font-bold text-indigo-700 mb-1' }, section),
                                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap' }, text.replace(/\[Student\]/g, studentName || '[Student]'))
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-start pt-2' },
                    h('button', { 'aria-label': 'Accuracy', className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(9) }, '← Accuracy')
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
        behaviorLensData,
        longitudinalData,
        dashboardData
    }) => {
        // Extract BehaviorLens data if provided (for cross-module data bridging)
        const blAbcEntries = behaviorLensData?.abcEntries || [];
        const blObsSessions = behaviorLensData?.observationSessions || [];
        const blAiAnalysis = behaviorLensData?.aiAnalysis || null;
        const blStudentProfile = behaviorLensData?.studentProfile || null;

        return h('div', { className: 'fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4',
            onClick: (e) => { if (e.target === e.currentTarget) onClose(); }
        },
            h('div', { className: 'bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative'
            },
                h('button', { 'aria-label': 'Close report writer', className: 'absolute top-4 right-4 text-slate-600 hover:text-slate-600 text-xl', onClick: onClose
                }, '✕'),
                h(ReportWriterPanel, {
                    studentName: studentNickname || '',
                    abcEntries: blAbcEntries,
                    observationSessions: blObsSessions,
                    aiAnalysis: blAiAnalysis,
                    studentProfile: blStudentProfile,
                    longitudinalData: longitudinalData || null,
                    dashboardData: dashboardData || [],
                    callGemini,
                    t,
                    addToast
                })
            )
        );
    };

    debugLog("ReportWriter module registered ✅");
})();
