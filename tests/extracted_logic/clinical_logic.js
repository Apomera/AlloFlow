// clinical_logic.js — Extracted pure functions from AlloFlow modules
// These functions are the clinical decision-making core of AlloFlow.
// They are extracted here so they can be unit-tested independently of the browser,
// React, Firebase, or any API. The source modules still contain the originals —
// this file is the testable mirror.
//
// Source modules:
//   report_writer_module.js — Score classification, PII scrubbing, dev norms, cross-battery
//   student_analytics_module.js — RTI tier classification, aimline, Pearson correlation, probe interpretation
//   symbol_studio_module.js — Familiarity scoring, word bank growth, codename generation
//   math_fluency_module.js — Benchmark lookup, benchmark labeling, error analysis
//   doc_pipeline_source.jsx — Issue normalization, issue merging, accessibility scoring

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT WRITER — Score Classification
// Source: report_writer_module.js lines 69-107
// ═══════════════════════════════════════════════════════════════════════════════

const SCORE_CLASSIFICATIONS = [
    { min: 130, max: 999, label: 'Very Superior', color: 'emerald' },
    { min: 120, max: 129, label: 'Superior', color: 'green' },
    { min: 110, max: 119, label: 'High Average', color: 'teal' },
    { min: 90, max: 109, label: 'Average', color: 'sky' },
    { min: 80, max: 89, label: 'Low Average', color: 'amber' },
    { min: 70, max: 79, label: 'Borderline', color: 'orange' },
    { min: 0, max: 69, label: 'Extremely Low', color: 'red' },
];

function classifyScore(score, scoreType) {
    scoreType = scoreType || 'standard';
    if (scoreType === 'T-score') {
        if (score >= 70) return { label: 'Clinically Significant', color: 'red' };
        if (score >= 65) return { label: 'At-Risk', color: 'orange' };
        if (score >= 60) return { label: 'High Average', color: 'amber' };
        if (score >= 40) return { label: 'Average', color: 'sky' };
        if (score >= 35) return { label: 'Low', color: 'amber' };
        return { label: 'Very Low', color: 'red' };
    }
    return SCORE_CLASSIFICATIONS.find(function (c) { return score >= c.min && score <= c.max; }) || { label: 'Unknown', color: 'slate' };
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT WRITER — Percentile Calculation (Abramowitz-Stegun error function)
// Source: report_writer_module.js line 849 (inline in addScoreEntry)
// ═══════════════════════════════════════════════════════════════════════════════

function calculatePercentile(rawScore, mean, sd) {
    mean = mean || 100;
    sd = sd || 15;
    var z = (rawScore - mean) / sd;
    // Abramowitz-Stegun error function approximation
    var a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    var a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    var sign = z < 0 ? -1 : 1;
    var absZ = Math.abs(z) / Math.sqrt(2);
    var tt = 1 / (1 + p * absZ);
    var erf = sign * (1 - (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-absZ * absZ));
    return Math.round(((1 + erf) / 2) * 100);
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT WRITER — PII Scrubbing
// Source: report_writer_module.js lines 834-841
// ═══════════════════════════════════════════════════════════════════════════════

function scrubPII(text, studentName) {
    if (!text) return text;
    var scrubbed = text;
    if (studentName) {
        var escaped = studentName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        scrubbed = scrubbed.replace(new RegExp(escaped, 'gi'), '[Student]');
    }
    scrubbed = scrubbed.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[DATE]');
    scrubbed = scrubbed.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s*\d{2,4}\b/gi, '[DATE]');
    return scrubbed;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT WRITER — Developmental Norms Cross-Reference
// Source: report_writer_module.js lines 37-68, 355-368
// ═══════════════════════════════════════════════════════════════════════════════

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

function crossReferenceDevNorms(domain, value, studentAge) {
    var norms = DEVELOPMENTAL_NORMS[domain];
    if (!norms || !studentAge) return null;
    var ageNorm = norms.find(function (n) { return studentAge >= n.ageMin && studentAge <= n.ageMax; });
    if (!ageNorm) return null;
    if (ageNorm.typicalMin !== undefined) {
        // Check clinical threshold first (e.g., tantrum frequency above threshold is always clinical)
        if (ageNorm.clinicalThreshold !== undefined && value >= ageNorm.clinicalThreshold) return { type: 'clinical', label: 'Clinically Elevated', color: 'red', explanation: 'Value of ' + value + ' ' + ageNorm.unit + ' exceeds the clinical threshold of ' + ageNorm.clinicalThreshold + ' ' + ageNorm.unit + ' for age ' + studentAge + ' (typical range: ' + ageNorm.typicalMin + '–' + ageNorm.typicalMax + ')' };
        // Within typical range
        if (value >= ageNorm.typicalMin && value <= ageNorm.typicalMax) return { type: 'appropriate', label: 'Developmentally Appropriate', color: 'green', explanation: 'Value of ' + value + ' ' + ageNorm.unit + ' falls within the typical range of ' + ageNorm.typicalMin + '–' + ageNorm.typicalMax + ' ' + ageNorm.unit + ' for age ' + studentAge };
        // Above typical max but below clinical threshold (elevated but not clinical)
        if (value > ageNorm.typicalMax) return { type: 'borderline', label: 'Elevated', color: 'amber', explanation: 'Value of ' + value + ' ' + ageNorm.unit + ' exceeds the typical range of ' + ageNorm.typicalMin + '–' + ageNorm.typicalMax + ' ' + ageNorm.unit + ' for age ' + studentAge };
        // Below typical min — check one year back
        var oneYearBack = norms.find(function (n) { return (studentAge - 1) >= n.ageMin && (studentAge - 1) <= n.ageMax; });
        if (oneYearBack && value >= oneYearBack.typicalMin) return { type: 'borderline', label: 'Borderline', color: 'amber', explanation: 'Value of ' + value + ' ' + ageNorm.unit + ' is below typical for age ' + studentAge + ' (expected ' + ageNorm.typicalMin + '–' + ageNorm.typicalMax + ') but within range for age ' + (studentAge - 1) };
        return { type: 'deficit', label: 'Significant Deficit', color: 'red', explanation: 'Value of ' + value + ' ' + ageNorm.unit + ' is significantly below the typical range of ' + ageNorm.typicalMin + '–' + ageNorm.typicalMax + ' ' + ageNorm.unit + ' for age ' + studentAge };
    }
    if (ageNorm.stage) return { type: 'reference', label: ageNorm.stage, color: 'sky', explanation: 'Typical for age ' + studentAge + ': ' + ageNorm.stage + ' — ' + ageNorm.desc };
    return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// REPORT WRITER — Assessment Presets
// Source: report_writer_module.js lines 78-96
// ═══════════════════════════════════════════════════════════════════════════════

const ASSESSMENT_PRESETS = {
    'WISC-V': { subtests: ['Full Scale IQ', 'Verbal Comprehension', 'Visual Spatial', 'Fluid Reasoning', 'Working Memory', 'Processing Speed'], scoreType: 'standard', mean: 100, sd: 15 },
    'WIAT-4': { subtests: ['Total Achievement', 'Reading Composite', 'Math Composite', 'Written Language', 'Word Reading', 'Spelling', 'Numerical Operations'], scoreType: 'standard', mean: 100, sd: 15 },
    'BASC-3 (Parent)': { subtests: ['Externalizing', 'Internalizing', 'Behavioral Symptoms Index', 'Adaptive Skills', 'Hyperactivity', 'Aggression', 'Anxiety', 'Depression', 'Attention Problems', 'Social Skills', 'Leadership'], scoreType: 'T-score', mean: 50, sd: 10 },
    'BASC-3 (Teacher)': { subtests: ['Externalizing', 'Internalizing', 'Behavioral Symptoms Index', 'Adaptive Skills', 'Hyperactivity', 'Aggression', 'Anxiety', 'Depression', 'Attention Problems', 'Learning Problems', 'School Problems'], scoreType: 'T-score', mean: 50, sd: 10 },
    'Vineland-3': { subtests: ['Adaptive Behavior Composite', 'Communication', 'Daily Living Skills', 'Socialization', 'Motor Skills'], scoreType: 'standard', mean: 100, sd: 15 },
    'BRIEF-2': { subtests: ['Global Executive Composite', 'Behavioral Regulation Index', 'Emotion Regulation Index', 'Cognitive Regulation Index', 'Inhibit', 'Shift', 'Emotional Control', 'Working Memory', 'Plan/Organize'], scoreType: 'T-score', mean: 50, sd: 10 },
    'Conners-4': { subtests: ['Inattention/Executive Dysfunction', 'Hyperactivity', 'Impulsivity', 'Emotional Dysregulation', 'Depressed Mood', 'Anxious Thoughts'], scoreType: 'T-score', mean: 50, sd: 10 },
    'SRS-2': { subtests: ['Total Score', 'Social Awareness', 'Social Cognition', 'Social Communication', 'Social Motivation', 'Restricted Interests'], scoreType: 'T-score', mean: 50, sd: 10 },
    'GARS-3': { subtests: ['Autism Index', 'Restricted/Repetitive Behaviors', 'Social Interaction', 'Social Communication', 'Emotional Responses'], scoreType: 'standard', mean: 100, sd: 15 },
    'BOT-2': { subtests: ['Total Motor Composite', 'Fine Manual Control', 'Manual Coordination', 'Body Coordination', 'Strength and Agility'], scoreType: 'standard', mean: 50, sd: 10 },
    'Custom Assessment': { subtests: [], scoreType: 'standard', mean: 100, sd: 15 },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT ANALYTICS — RTI Tier Classification
// Source: student_analytics_module.js lines 885-978
// ═══════════════════════════════════════════════════════════════════════════════

function classifyRTITier(stats, thresholds) {
    var t = thresholds || {
        quizTier3: 50, quizTier2: 80,
        wsTier3: 50, wsTier2: 75,
        engagementMin: 2,
        fluencyMin: 60,
        labelChallengeMin: 50,
        mathDCPMTier3: 20, mathDCPMTier2: 40
    };
    var tier = 1;
    var reasons = [];
    var recs = [];

    if (stats.quizAvg !== undefined && stats.quizAvg !== null) {
        if (stats.quizAvg < t.quizTier3) {
            tier = Math.max(tier, 3);
            reasons.push('Quiz average below ' + t.quizTier3 + '%');
            recs.push('Increase scaffolding on quiz activities');
        } else if (stats.quizAvg < t.quizTier2) {
            tier = Math.max(tier, 2);
            reasons.push('Quiz average in instructional range (' + Math.round(stats.quizAvg) + '%)');
            recs.push('Continue Tier 2 supports with progress monitoring');
        }
    }

    if (stats.wsAccuracy !== undefined && stats.wsAccuracy !== null) {
        if (stats.wsAccuracy < t.wsTier3) {
            tier = Math.max(tier, 3);
            reasons.push('Word study accuracy below ' + t.wsTier3 + '%');
            recs.push('Intensive phonics intervention recommended');
        } else if (stats.wsAccuracy < t.wsTier2) {
            tier = Math.max(tier, 2);
            reasons.push('Word study accuracy in strategic range');
        }
    }

    if (stats.totalActivities !== undefined && stats.totalActivities < t.engagementMin) {
        tier = Math.max(tier, 2);
        reasons.push('Low engagement (' + stats.totalActivities + ' activities)');
        recs.push('Increase practice opportunities');
    }

    if (stats.fluencyWCPM !== undefined && stats.fluencyWCPM !== null) {
        if (stats.fluencyWCPM < t.fluencyMin) {
            tier = Math.max(tier, 2);
            reasons.push('Fluency below ' + t.fluencyMin + ' WCPM');
            recs.push('Repeated reading practice with progress monitoring');
        }
    }

    if (stats.mathDCPM !== undefined && stats.mathDCPM !== null) {
        if (stats.mathDCPM < t.mathDCPMTier3) {
            tier = Math.max(tier, 3);
            reasons.push('Math fluency below ' + t.mathDCPMTier3 + ' DCPM');
            recs.push('Intensive math fact intervention');
        } else if (stats.mathDCPM < t.mathDCPMTier2) {
            tier = Math.max(tier, 2);
            reasons.push('Math fluency in strategic range');
            recs.push('Supplemental math fact practice');
        }
    }

    var labels = {
        1: { label: 'Tier 1 — On Track', color: '#16a34a', bg: '#f0fdf4', emoji: '🟢' },
        2: { label: 'Tier 2 — Strategic', color: '#d97706', bg: '#fefce8', emoji: '🟡' },
        3: { label: 'Tier 3 — Intensive', color: '#dc2626', bg: '#fef2f2', emoji: '🔴' }
    };

    return Object.assign({ tier: tier, reasons: reasons, recommendations: recs }, labels[tier]);
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT ANALYTICS — Aimline Calculation (Progress Monitoring)
// Source: student_analytics_module.js lines 2610-2639
// ═══════════════════════════════════════════════════════════════════════════════

function calculateAimline(goal, dataPoints) {
    var baseDate = new Date(goal.baselineDate || Date.now());
    var targetDate = new Date(goal.targetDate);
    var totalWeeks = Math.max(1, Math.round((targetDate - baseDate) / (7 * 24 * 60 * 60 * 1000)));
    var slope = (goal.target - goal.baseline) / totalWeeks;

    var aimlinePoints = [];
    for (var w = 0; w <= totalWeeks; w++) {
        aimlinePoints.push({ week: w, expected: Math.round(goal.baseline + slope * w) });
    }

    var consecutiveBelow = 0;
    var recent = (dataPoints || []).slice(-6);
    for (var i = 0; i < recent.length; i++) {
        var dp = recent[i];
        var weeksSinceBase = Math.max(0, Math.round((new Date(dp.date) - baseDate) / (7 * 24 * 60 * 60 * 1000)));
        var expected = goal.baseline + slope * weeksSinceBase;
        if (dp.value < expected) consecutiveBelow++;
        else consecutiveBelow = 0;
    }

    var alert = consecutiveBelow >= 6 ? 'critical' : consecutiveBelow >= 4 ? 'warning' : 'ok';

    return { aimlinePoints: aimlinePoints, slope: slope, totalWeeks: totalWeeks, consecutiveBelow: consecutiveBelow, alert: alert };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STUDENT ANALYTICS — Pearson Correlation
// Source: student_analytics_module.js lines 2640-2669
// ═══════════════════════════════════════════════════════════════════════════════

function computeCorrelation(xValues, yValues) {
    var n = Math.min(xValues.length, yValues.length);
    if (n < 3) return { r: null, n: n, insufficient: true };

    var x = xValues.slice(0, n), y = yValues.slice(0, n);
    var meanX = x.reduce(function (s, v) { return s + v; }, 0) / n;
    var meanY = y.reduce(function (s, v) { return s + v; }, 0) / n;

    var num = 0, denX = 0, denY = 0;
    for (var i = 0; i < n; i++) {
        var dx = x[i] - meanX, dy = y[i] - meanY;
        num += dx * dy;
        denX += dx * dx;
        denY += dy * dy;
    }
    var den = Math.sqrt(denX * denY);
    var r = den === 0 ? 0 : num / den;
    var rounded = Math.round(r * 100) / 100;

    return {
        r: rounded, n: n,
        strength: Math.abs(rounded) >= 0.7 ? 'strong' : Math.abs(rounded) >= 0.4 ? 'moderate' : 'weak'
    };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL STUDIO — Familiarity Score
// Source: symbol_studio_module.js lines 779-789
// ═══════════════════════════════════════════════════════════════════════════════

function getFamiliarityScore(entry, nowMs) {
    if (!entry) return 0;
    nowMs = nowMs || Date.now();
    var interactions = (entry.taps || 0) + (entry.questCorrect || 0) * 2 + (entry.exposures || 0) * 0.3;
    var totalQuest = (entry.questCorrect || 0) + (entry.questWrong || 0);
    var accuracy = totalQuest > 0 ? entry.questCorrect / totalQuest : 0.5;
    var daysSince = entry.lastSeen ? (nowMs - entry.lastSeen) / 86400000 : 999;
    var recency = Math.max(0, 1 - daysSince / 14);
    return Math.min(1, interactions / 25) * 0.4 + accuracy * 0.3 + recency * 0.3;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL STUDIO — Word Growth Level
// Source: symbol_studio_module.js lines 3100-3110
// ═══════════════════════════════════════════════════════════════════════════════

function getGrowthLevel(uniqueContextCount, familiarityScore) {
    var uc = uniqueContextCount || 0;
    var fs = familiarityScore || 0;
    if (uc >= 4 && fs >= 0.75) return 'mastered';
    if (uc >= 3 && fs >= 0.45) return 'blooming';
    if (uc >= 3 || fs >= 0.45) return 'growing';
    if (uc >= 2 || fs >= 0.15) return 'sprout';
    return 'seed';
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYMBOL STUDIO — Codename Generation
// Source: symbol_studio_module.js lines 46-49
// ═══════════════════════════════════════════════════════════════════════════════

var CN_ADJ = ['Alpine','Arctic','Bold','Brave','Bright','Calm','Clever','Cool','Cosmic','Daring','Eager','Epic','Fair','Fast','Fierce','Gentle','Grand','Happy','Heroic','Jolly','Kind','Lively','Lucky','Magic','Mighty','Neon','Noble','Proud','Quick','Rapid','Royal','Silent','Smart','Solar','Sonic','Steady','Super','Swift','Tough','Turbo','Unique','Vivid','Wild','Wise','Zealous'];
var CN_ANI = ['Badger','Bear','Beaver','Bison','Cat','Cobra','Cougar','Crane','Crow','Deer','Dingo','Dolphin','Dragon','Eagle','Elk','Falcon','Ferret','Fox','Gecko','Hawk','Heron','Horse','Husky','Jaguar','Koala','Lemur','Leopard','Lion','Lynx','Moose','Otter','Owl','Panda','Panther','Parrot','Penguin','Puma','Rabbit','Raven','Seal','Shark','Sloth','Tiger','Turtle','Wolf'];

function generateCodename() {
    return CN_ADJ[Math.floor(Math.random() * CN_ADJ.length)] + ' ' + CN_ANI[Math.floor(Math.random() * CN_ANI.length)];
}

function isValidCodename(codename) {
    if (!codename || typeof codename !== 'string') return false;
    var parts = codename.split(' ');
    if (parts.length !== 2) return false;
    return CN_ADJ.indexOf(parts[0]) !== -1 && CN_ANI.indexOf(parts[1]) !== -1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MATH FLUENCY — Benchmark Lookup & Labeling
// Source: math_fluency_module.js lines 24-63
// ═══════════════════════════════════════════════════════════════════════════════

var BENCHMARKS = {
    'K':  { add: { fall: 5,  winter: 10, spring: 15 }, sub: { fall: 3,  winter: 8,  spring: 12 } },
    '1':  { add: { fall: 10, winter: 20, spring: 30 }, sub: { fall: 8,  winter: 15, spring: 25 }, mul: { fall: 0, winter: 0, spring: 5 },  div: { fall: 0, winter: 0, spring: 3 } },
    '2':  { add: { fall: 20, winter: 30, spring: 40 }, sub: { fall: 15, winter: 25, spring: 35 }, mul: { fall: 5,  winter: 10, spring: 20 }, div: { fall: 3, winter: 8,  spring: 15 } },
    '3':  { add: { fall: 30, winter: 40, spring: 50 }, sub: { fall: 25, winter: 35, spring: 45 }, mul: { fall: 15, winter: 25, spring: 35 }, div: { fall: 10, winter: 18, spring: 25 } },
    '4':  { add: { fall: 40, winter: 50, spring: 60 }, sub: { fall: 35, winter: 45, spring: 55 }, mul: { fall: 25, winter: 35, spring: 45 }, div: { fall: 18, winter: 25, spring: 35 } },
    '5':  { add: { fall: 50, winter: 55, spring: 65 }, sub: { fall: 45, winter: 50, spring: 60 }, mul: { fall: 35, winter: 45, spring: 55 }, div: { fall: 25, winter: 35, spring: 45 } },
    '6':  { add: { fall: 55, winter: 60, spring: 70 }, sub: { fall: 50, winter: 55, spring: 65 }, mul: { fall: 40, winter: 50, spring: 60 }, div: { fall: 30, winter: 40, spring: 50 } },
    '7':  { add: { fall: 60, winter: 65, spring: 70 }, sub: { fall: 55, winter: 60, spring: 65 }, mul: { fall: 45, winter: 55, spring: 65 }, div: { fall: 35, winter: 45, spring: 55 } },
    '8':  { add: { fall: 65, winter: 70, spring: 75 }, sub: { fall: 60, winter: 65, spring: 70 }, mul: { fall: 50, winter: 60, spring: 70 }, div: { fall: 40, winter: 50, spring: 60 } }
};

function getBenchmark(grade, operation, season) {
    var raw = String(grade || '3').trim();
    var g;
    if (raw.toUpperCase() === 'K') { g = 'K'; }
    else { g = raw.replace(/\D/g, '') || '3'; if (g === '0') g = 'K'; }
    var gradeData = BENCHMARKS[g] || BENCHMARKS['3'];
    var op = operation === 'mixed' ? 'add' : operation;
    var opData = gradeData[op] || gradeData.add || { fall: 30, winter: 40, spring: 50 };
    season = season || 'spring';
    return {
        target: opData[season],
        season: season,
        grade: g,
        frustration: Math.round(opData[season] * 0.5),
        strategic: Math.round(opData[season] * 0.75)
    };
}

function getBenchmarkLabel(dcpm, benchmark) {
    if (dcpm >= benchmark.target) return { label: 'At/Above Benchmark', color: '#16a34a', emoji: '🟢', tier: 'benchmark' };
    if (dcpm >= benchmark.strategic) return { label: 'Strategic (Approaching)', color: '#d97706', emoji: '🟡', tier: 'strategic' };
    return { label: 'Intensive (Below)', color: '#dc2626', emoji: '🔴', tier: 'intensive' };
}

function analyzeErrors(problems) {
    var errors = problems.filter(function (p) { return p.studentAnswer !== null && p.studentAnswer !== 'SKIP' && !p.correct; });
    var skips = problems.filter(function (p) { return p.studentAnswer === 'SKIP'; });
    var opErrors = {};
    var factErrors = [];

    errors.forEach(function (p) {
        var opName = p.op === 'add' ? 'Addition' : p.op === 'sub' ? 'Subtraction' : p.op === 'mul' ? 'Multiplication' : 'Division';
        if (!opErrors[opName]) opErrors[opName] = 0;
        opErrors[opName]++;
        factErrors.push(p.a + ' ' + p.symbol + ' ' + p.b + ' = ' + p.answer + ' (answered ' + p.studentAnswer + ')');
    });

    var patterns = [];
    var sortedOps = Object.entries(opErrors).sort(function (a, b) { return b[1] - a[1]; });
    if (sortedOps.length > 0) {
        patterns.push('Most errors in ' + sortedOps[0][0] + ' (' + sortedOps[0][1] + ' errors)');
    }
    if (factErrors.length > 0 && factErrors.length <= 8) {
        patterns.push('Specific facts to practice: ' + factErrors.slice(0, 5).join(', '));
    } else if (factErrors.length > 8) {
        patterns.push(factErrors.length + ' errors total — consider reducing difficulty level');
    }
    if (skips.length > 3) {
        patterns.push(skips.length + ' problems skipped — may indicate frustration or uncertainty');
    }

    return { errors: errors.length, skips: skips.length, patterns: patterns, factErrors: factErrors, opErrors: opErrors };
}

// ═══════════════════════════════════════════════════════════════════════════════
// DOC PIPELINE — Issue Normalization & Merging
// Source: doc_pipeline_source.jsx lines 256-299
// ═══════════════════════════════════════════════════════════════════════════════

function normalizeIssue(issue) {
    if (!issue || !issue.issue) return issue;
    var text = issue.issue;
    var wcag = issue.wcag || '';
    if (!wcag) {
        var wcagMatch = text.match(/\b(\d+\.\d+\.\d+)\b/);
        if (wcagMatch) wcag = wcagMatch[1];
    }
    text = text.replace(/\s*\(?\s*(?:WCAG\s*)?\d+\.\d+\.\d+\s*\)?\s*$/gi, '').trim();
    text = text.replace(/\s*[-–—]\s*\d+\.\d+\.\d+\s*$/g, '').trim();
    text = text.replace(/\s*\(\s*$/, '').trim();
    text = text.replace(/^\)\s*,?\s*/g, '').trim();
    var lastOpenIdx = text.lastIndexOf('(');
    var lastCloseIdx = text.lastIndexOf(')');
    if (lastOpenIdx > lastCloseIdx && (text.length - lastOpenIdx) < 100) {
        var parenContent = text.substring(lastOpenIdx + 1).trim();
        if (parenContent.length < 5 || /^[,.\s]*$/.test(parenContent)) {
            text = text.substring(0, lastOpenIdx).trim();
        }
    }
    if (text && !/[.!?)\]]$/.test(text)) text += '.';
    return Object.assign({}, issue, { issue: text, wcag: wcag });
}

function mergeIssues() {
    var arrays = Array.prototype.slice.call(arguments);
    var seen = {};
    var merged = [];
    arrays.forEach(function (arr) {
        (arr || []).forEach(function (issue) {
            if (!issue) return;
            var normalized = normalizeIssue(issue);
            var key = (normalized.issue || '').toLowerCase().substring(0, 40);
            if (!seen[key]) { seen[key] = true; merged.push(normalized); }
        });
    });
    return merged;
}

// ═══════════════════════════════════════════════════════════════════════════════
// BEHAVIOR LENS — Duration Formatting
// Source: behavior_lens_module.js line 165
// ═══════════════════════════════════════════════════════════════════════════════

function fmtDuration(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    var m = Math.floor(seconds / 60);
    var s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Exports
// ═══════════════════════════════════════════════════════════════════════════════

module.exports = {
    // Report Writer
    classifyScore: classifyScore,
    calculatePercentile: calculatePercentile,
    scrubPII: scrubPII,
    crossReferenceDevNorms: crossReferenceDevNorms,
    SCORE_CLASSIFICATIONS: SCORE_CLASSIFICATIONS,
    DEVELOPMENTAL_NORMS: DEVELOPMENTAL_NORMS,
    ASSESSMENT_PRESETS: ASSESSMENT_PRESETS,

    // Student Analytics
    classifyRTITier: classifyRTITier,
    calculateAimline: calculateAimline,
    computeCorrelation: computeCorrelation,

    // Symbol Studio
    getFamiliarityScore: getFamiliarityScore,
    getGrowthLevel: getGrowthLevel,
    generateCodename: generateCodename,
    isValidCodename: isValidCodename,
    CN_ADJ: CN_ADJ,
    CN_ANI: CN_ANI,

    // Math Fluency
    BENCHMARKS: BENCHMARKS,
    getBenchmark: getBenchmark,
    getBenchmarkLabel: getBenchmarkLabel,
    analyzeErrors: analyzeErrors,

    // Doc Pipeline
    normalizeIssue: normalizeIssue,
    mergeIssues: mergeIssues,

    // Behavior Lens
    fmtDuration: fmtDuration,
};
