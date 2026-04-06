#!/usr/bin/env node
// clinical_tests.js — AlloFlow Clinical Logic Test Suite
// Run: node tests/clinical_tests.js
//
// Tests are organized by clinical priority tier:
//   Tier 1: Score classification, PII scrubbing, RTI tier (affects real student services)
//   Tier 2: Familiarity, growth levels, codenames, correlations (affects learning tracking)
//   Tier 3: Doc pipeline, math benchmarks, formatting (affects reports & data quality)
//
// No dependencies — uses only Node.js built-in assert.

var assert = require('assert');
var logic = require('./extracted_logic/clinical_logic.js');

var passed = 0;
var failed = 0;
var errors = [];

function test(name, fn) {
    try {
        fn();
        passed++;
        process.stdout.write('  \x1b[32m\u2713\x1b[0m ' + name + '\n');
    } catch (e) {
        failed++;
        errors.push({ name: name, error: e.message });
        process.stdout.write('  \x1b[31m\u2717\x1b[0m ' + name + '\n');
        process.stdout.write('    \x1b[31m' + e.message + '\x1b[0m\n');
    }
}

function section(name) {
    process.stdout.write('\n\x1b[1m\x1b[36m' + name + '\x1b[0m\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 1: CLINICAL SCORING (affects real student services)
// ═══════════════════════════════════════════════════════════════════════════════

section('TIER 1: Score Classification (Standard Scores)');

test('WISC-V FSIQ 100 → Average', function () {
    var r = logic.classifyScore(100, 'standard');
    assert.strictEqual(r.label, 'Average');
});

test('WISC-V FSIQ 130 → Very Superior', function () {
    var r = logic.classifyScore(130, 'standard');
    assert.strictEqual(r.label, 'Very Superior');
});

test('WISC-V FSIQ 69 → Extremely Low', function () {
    var r = logic.classifyScore(69, 'standard');
    assert.strictEqual(r.label, 'Extremely Low');
});

test('WISC-V FSIQ 70 → Borderline (boundary)', function () {
    var r = logic.classifyScore(70, 'standard');
    assert.strictEqual(r.label, 'Borderline');
});

test('WISC-V FSIQ 79 → Borderline (upper boundary)', function () {
    var r = logic.classifyScore(79, 'standard');
    assert.strictEqual(r.label, 'Borderline');
});

test('WISC-V FSIQ 80 → Low Average (boundary)', function () {
    var r = logic.classifyScore(80, 'standard');
    assert.strictEqual(r.label, 'Low Average');
});

test('WISC-V FSIQ 89 → Low Average (upper)', function () {
    var r = logic.classifyScore(89, 'standard');
    assert.strictEqual(r.label, 'Low Average');
});

test('WISC-V FSIQ 90 → Average (lower boundary)', function () {
    var r = logic.classifyScore(90, 'standard');
    assert.strictEqual(r.label, 'Average');
});

test('WISC-V FSIQ 109 → Average (upper boundary)', function () {
    var r = logic.classifyScore(109, 'standard');
    assert.strictEqual(r.label, 'Average');
});

test('WISC-V FSIQ 110 → High Average', function () {
    var r = logic.classifyScore(110, 'standard');
    assert.strictEqual(r.label, 'High Average');
});

test('WISC-V FSIQ 120 → Superior', function () {
    var r = logic.classifyScore(120, 'standard');
    assert.strictEqual(r.label, 'Superior');
});

test('Score 0 → Extremely Low (floor)', function () {
    var r = logic.classifyScore(0, 'standard');
    assert.strictEqual(r.label, 'Extremely Low');
});

test('Default scoreType is standard', function () {
    var r = logic.classifyScore(100);
    assert.strictEqual(r.label, 'Average');
});

section('TIER 1: Score Classification (T-Scores — behavioral measures)');

test('BASC-3 T=50 → Average', function () {
    var r = logic.classifyScore(50, 'T-score');
    assert.strictEqual(r.label, 'Average');
});

test('BASC-3 T=70 → Clinically Significant', function () {
    var r = logic.classifyScore(70, 'T-score');
    assert.strictEqual(r.label, 'Clinically Significant');
});

test('BASC-3 T=65 → At-Risk', function () {
    var r = logic.classifyScore(65, 'T-score');
    assert.strictEqual(r.label, 'At-Risk');
});

test('BASC-3 T=60 → High Average', function () {
    var r = logic.classifyScore(60, 'T-score');
    assert.strictEqual(r.label, 'High Average');
});

test('BASC-3 T=40 → Average (lower boundary)', function () {
    var r = logic.classifyScore(40, 'T-score');
    assert.strictEqual(r.label, 'Average');
});

test('BASC-3 T=39 → Low', function () {
    var r = logic.classifyScore(39, 'T-score');
    assert.strictEqual(r.label, 'Low');
});

test('BASC-3 T=35 → Low (boundary)', function () {
    var r = logic.classifyScore(35, 'T-score');
    assert.strictEqual(r.label, 'Low');
});

test('BASC-3 T=34 → Very Low', function () {
    var r = logic.classifyScore(34, 'T-score');
    assert.strictEqual(r.label, 'Very Low');
});

section('TIER 1: Percentile Calculation');

test('Standard score 100 → 50th percentile', function () {
    assert.strictEqual(logic.calculatePercentile(100, 100, 15), 50);
});

test('Standard score 115 → ~84th percentile', function () {
    var p = logic.calculatePercentile(115, 100, 15);
    assert.ok(p >= 83 && p <= 85, 'Expected ~84, got ' + p);
});

test('Standard score 85 → ~16th percentile', function () {
    var p = logic.calculatePercentile(85, 100, 15);
    assert.ok(p >= 15 && p <= 17, 'Expected ~16, got ' + p);
});

test('Standard score 130 → ~98th percentile', function () {
    var p = logic.calculatePercentile(130, 100, 15);
    assert.ok(p >= 97 && p <= 99, 'Expected ~98, got ' + p);
});

test('Standard score 70 → ~2nd percentile', function () {
    var p = logic.calculatePercentile(70, 100, 15);
    assert.ok(p >= 1 && p <= 3, 'Expected ~2, got ' + p);
});

test('T-score 50 → 50th percentile (mean=50, sd=10)', function () {
    assert.strictEqual(logic.calculatePercentile(50, 50, 10), 50);
});

test('T-score 70 → ~98th percentile (mean=50, sd=10)', function () {
    var p = logic.calculatePercentile(70, 50, 10);
    assert.ok(p >= 97 && p <= 99, 'Expected ~98, got ' + p);
});

section('TIER 1: PII Scrubbing');

test('Scrubs student name (case-insensitive)', function () {
    var r = logic.scrubPII('Marcus had a great day. marcus did well.', 'Marcus');
    assert.ok(r.indexOf('Marcus') === -1, 'Name should be scrubbed');
    assert.ok(r.indexOf('marcus') === -1, 'Lowercase name should be scrubbed');
    assert.ok(r.indexOf('[Student]') !== -1, 'Should contain [Student]');
});

test('Scrubs MM/DD/YYYY dates', function () {
    var r = logic.scrubPII('Assessment on 03/15/2025 showed progress', null);
    assert.ok(r.indexOf('03/15/2025') === -1, 'Date should be scrubbed');
    assert.ok(r.indexOf('[DATE]') !== -1, 'Should contain [DATE]');
});

test('Scrubs MM-DD-YYYY dates', function () {
    var r = logic.scrubPII('Observed on 12-01-2024', null);
    assert.ok(r.indexOf('12-01-2024') === -1);
    assert.ok(r.indexOf('[DATE]') !== -1);
});

test('Scrubs month-name dates', function () {
    var r = logic.scrubPII('Assessment completed March 10, 2025', null);
    assert.ok(r.indexOf('March 10, 2025') === -1);
    assert.ok(r.indexOf('[DATE]') !== -1);
});

test('Scrubs name + date together', function () {
    var r = logic.scrubPII('Marcus was evaluated on January 5, 2025 at school', 'Marcus');
    assert.ok(r.indexOf('Marcus') === -1);
    assert.ok(r.indexOf('January 5, 2025') === -1);
    assert.strictEqual(r, '[Student] was evaluated on [DATE] at school');
});

test('Returns null/undefined input unchanged', function () {
    assert.strictEqual(logic.scrubPII(null, 'Marcus'), null);
    assert.strictEqual(logic.scrubPII(undefined, 'Marcus'), undefined);
    assert.strictEqual(logic.scrubPII('', 'Marcus'), '');
});

test('Handles name with regex special chars', function () {
    var r = logic.scrubPII('Student J.R. Smith was present', 'J.R. Smith');
    assert.ok(r.indexOf('J.R. Smith') === -1);
    assert.ok(r.indexOf('[Student]') !== -1);
});

section('TIER 1: RTI Tier Classification');

test('All metrics good → Tier 1', function () {
    var r = logic.classifyRTITier({ quizAvg: 90, wsAccuracy: 85, totalActivities: 10, fluencyWCPM: 100, mathDCPM: 50 });
    assert.strictEqual(r.tier, 1);
    assert.strictEqual(r.reasons.length, 0);
});

test('Quiz avg 45% → Tier 3', function () {
    var r = logic.classifyRTITier({ quizAvg: 45 });
    assert.strictEqual(r.tier, 3);
    assert.ok(r.reasons.some(function (x) { return x.indexOf('Quiz') !== -1; }));
});

test('Quiz avg 60% → Tier 2', function () {
    var r = logic.classifyRTITier({ quizAvg: 60 });
    assert.strictEqual(r.tier, 2);
});

test('Math DCPM 15 → Tier 3', function () {
    var r = logic.classifyRTITier({ mathDCPM: 15 });
    assert.strictEqual(r.tier, 3);
    assert.ok(r.reasons.some(function (x) { return x.indexOf('Math') !== -1; }));
});

test('Math DCPM 30 → Tier 2', function () {
    var r = logic.classifyRTITier({ mathDCPM: 30 });
    assert.strictEqual(r.tier, 2);
});

test('Word study 40% → Tier 3', function () {
    var r = logic.classifyRTITier({ wsAccuracy: 40 });
    assert.strictEqual(r.tier, 3);
});

test('Multiple risk factors → highest tier wins', function () {
    var r = logic.classifyRTITier({ quizAvg: 60, wsAccuracy: 40, mathDCPM: 10 });
    assert.strictEqual(r.tier, 3);
    assert.ok(r.reasons.length >= 2, 'Should report multiple reasons');
});

test('Low engagement → Tier 2', function () {
    var r = logic.classifyRTITier({ totalActivities: 1 });
    assert.strictEqual(r.tier, 2);
});

test('Custom thresholds override defaults', function () {
    var r = logic.classifyRTITier({ quizAvg: 70 }, { quizTier3: 75, quizTier2: 90 });
    assert.strictEqual(r.tier, 3);
});

section('TIER 1: Developmental Norms Cross-Reference');

test('Attention 10 min at age 5 → Appropriate', function () {
    var r = logic.crossReferenceDevNorms('attention_span', 10, 5);
    assert.strictEqual(r.type, 'appropriate');
});

test('Attention 3 min at age 5 → Deficit', function () {
    var r = logic.crossReferenceDevNorms('attention_span', 3, 5);
    assert.strictEqual(r.type, 'deficit');
});

test('Attention 8 min at age 5 → Borderline (below age 5 min of 10, within age 4 range)', function () {
    // Age 5 typical min is 10, age 4 typical min is 8. Value 8 is below 5yo but within 4yo range.
    var r = logic.crossReferenceDevNorms('attention_span', 8, 5);
    assert.strictEqual(r.type, 'borderline');
});

test('Attention 5 min at age 5 → Deficit (below even age 4 min of 8)', function () {
    var r = logic.crossReferenceDevNorms('attention_span', 5, 5);
    assert.strictEqual(r.type, 'deficit');
});

test('Tantrums 2/week at age 3 → Appropriate', function () {
    var r = logic.crossReferenceDevNorms('tantrum_frequency', 2, 3);
    assert.strictEqual(r.type, 'appropriate');
});

test('Tantrums 0.5/week at age 7 → Appropriate (at typical max)', function () {
    var r = logic.crossReferenceDevNorms('tantrum_frequency', 0.5, 7);
    assert.strictEqual(r.type, 'appropriate');
});

test('Tantrums 1/week at age 7 → Elevated (above typical max 0.5)', function () {
    var r = logic.crossReferenceDevNorms('tantrum_frequency', 1, 7);
    assert.strictEqual(r.type, 'borderline');
    assert.strictEqual(r.label, 'Elevated');
});

test('Tantrums 2/week at age 7 → Clinically Elevated (at clinical threshold)', function () {
    var r = logic.crossReferenceDevNorms('tantrum_frequency', 2, 7);
    assert.strictEqual(r.type, 'clinical');
    assert.strictEqual(r.label, 'Clinically Elevated');
});

test('Tantrums 4/week at age 7 → Clinically Elevated (above threshold)', function () {
    var r = logic.crossReferenceDevNorms('tantrum_frequency', 4, 7);
    assert.strictEqual(r.type, 'clinical');
});

test('Tantrums 5/week at age 3 → Clinically Elevated (threshold=5)', function () {
    var r = logic.crossReferenceDevNorms('tantrum_frequency', 5, 3);
    assert.strictEqual(r.type, 'clinical');
});

test('Tantrums 4/week at age 3 → Elevated (above max 3, below threshold 5)', function () {
    var r = logic.crossReferenceDevNorms('tantrum_frequency', 4, 3);
    assert.strictEqual(r.type, 'borderline');
});

test('Social play at age 5 → Cooperative (reference)', function () {
    var r = logic.crossReferenceDevNorms('social_play', null, 5);
    assert.strictEqual(r.type, 'reference');
    assert.strictEqual(r.label, 'Cooperative');
});

test('Unknown domain → null', function () {
    assert.strictEqual(logic.crossReferenceDevNorms('nonexistent', 10, 5), null);
});

test('Missing age → null', function () {
    assert.strictEqual(logic.crossReferenceDevNorms('attention_span', 10, null), null);
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 2: LEARNING TRACKING (affects practice & growth measurement)
// ═══════════════════════════════════════════════════════════════════════════════

section('TIER 2: Familiarity Score');

test('No entry → 0', function () {
    assert.strictEqual(logic.getFamiliarityScore(null), 0);
});

test('Fresh entry (just seen today) — moderate score', function () {
    var now = Date.now();
    var entry = { taps: 5, questCorrect: 3, questWrong: 1, exposures: 2, lastSeen: now, firstSeen: now };
    var score = logic.getFamiliarityScore(entry, now);
    assert.ok(score > 0.3 && score < 0.8, 'Expected moderate score, got ' + score);
});

test('Stale entry (30 days ago) — recency decays to 0', function () {
    var now = Date.now();
    var thirtyDaysAgo = now - 30 * 86400000;
    var entry = { taps: 5, questCorrect: 3, questWrong: 1, exposures: 2, lastSeen: thirtyDaysAgo };
    var score = logic.getFamiliarityScore(entry, now);
    // Recency should be 0, so only interactions + accuracy contribute
    assert.ok(score > 0, 'Should still have some score from interactions');
    assert.ok(score < 0.5, 'Stale entry should be below 0.5, got ' + score);
});

test('Perfect accuracy boosts score', function () {
    var now = Date.now();
    var perfect = { taps: 5, questCorrect: 10, questWrong: 0, exposures: 0, lastSeen: now };
    var imperfect = { taps: 5, questCorrect: 5, questWrong: 5, exposures: 0, lastSeen: now };
    assert.ok(logic.getFamiliarityScore(perfect, now) > logic.getFamiliarityScore(imperfect, now));
});

test('Score capped at 1.0', function () {
    var now = Date.now();
    var massive = { taps: 100, questCorrect: 100, questWrong: 0, exposures: 100, lastSeen: now };
    assert.ok(logic.getFamiliarityScore(massive, now) <= 1.0);
});

section('TIER 2: Word Growth Levels');

test('seed: 1 context, 0.1 familiarity', function () {
    assert.strictEqual(logic.getGrowthLevel(1, 0.1), 'seed');
});

test('sprout: 2 contexts, 0.1 familiarity', function () {
    assert.strictEqual(logic.getGrowthLevel(2, 0.1), 'sprout');
});

test('sprout: 1 context, 0.2 familiarity', function () {
    assert.strictEqual(logic.getGrowthLevel(1, 0.2), 'sprout');
});

test('growing: 3 contexts, 0.2 familiarity', function () {
    assert.strictEqual(logic.getGrowthLevel(3, 0.2), 'growing');
});

test('growing: 1 context, 0.5 familiarity', function () {
    assert.strictEqual(logic.getGrowthLevel(1, 0.5), 'growing');
});

test('blooming: 3 contexts, 0.5 familiarity', function () {
    assert.strictEqual(logic.getGrowthLevel(3, 0.5), 'blooming');
});

test('mastered: 4 contexts, 0.8 familiarity', function () {
    assert.strictEqual(logic.getGrowthLevel(4, 0.8), 'mastered');
});

test('NOT mastered: 4 contexts, 0.7 familiarity (below 0.75)', function () {
    assert.strictEqual(logic.getGrowthLevel(4, 0.7), 'blooming');
});

test('NOT mastered: 3 contexts, 0.8 familiarity (below 4 contexts)', function () {
    assert.strictEqual(logic.getGrowthLevel(3, 0.8), 'blooming');
});

test('Defaults: no args → seed', function () {
    assert.strictEqual(logic.getGrowthLevel(), 'seed');
});

section('TIER 2: Codename Generation');

test('Generates valid Adjective Animal format', function () {
    for (var i = 0; i < 50; i++) {
        var cn = logic.generateCodename();
        assert.ok(logic.isValidCodename(cn), 'Invalid codename: ' + cn);
    }
});

test('All adjectives are valid', function () {
    assert.ok(logic.CN_ADJ.length >= 40, 'Should have 40+ adjectives, got ' + logic.CN_ADJ.length);
    logic.CN_ADJ.forEach(function (adj) {
        assert.ok(/^[A-Z][a-z]+$/.test(adj), 'Invalid adjective format: ' + adj);
    });
});

test('All animals are valid', function () {
    assert.ok(logic.CN_ANI.length >= 40, 'Should have 40+ animals, got ' + logic.CN_ANI.length);
    logic.CN_ANI.forEach(function (ani) {
        assert.ok(/^[A-Z][a-z]+$/.test(ani), 'Invalid animal format: ' + ani);
    });
});

test('isValidCodename rejects bad inputs', function () {
    assert.strictEqual(logic.isValidCodename(null), false);
    assert.strictEqual(logic.isValidCodename(''), false);
    assert.strictEqual(logic.isValidCodename('Marcus'), false);
    assert.strictEqual(logic.isValidCodename('Bold'), false);
    assert.strictEqual(logic.isValidCodename('Fake Animal'), false);
    assert.strictEqual(logic.isValidCodename('Bold Unicorn'), false);
});

test('isValidCodename accepts valid codenames', function () {
    assert.strictEqual(logic.isValidCodename('Bold Badger'), true);
    assert.strictEqual(logic.isValidCodename('Zealous Wolf'), true);
    assert.strictEqual(logic.isValidCodename('Alpine Eagle'), true);
});

test('Collision space is at least 1000', function () {
    var total = logic.CN_ADJ.length * logic.CN_ANI.length;
    assert.ok(total >= 1000, 'Collision space too small: ' + total);
});

section('TIER 2: Pearson Correlation');

test('Perfect positive correlation → r = 1', function () {
    var r = logic.computeCorrelation([1, 2, 3, 4, 5], [10, 20, 30, 40, 50]);
    assert.strictEqual(r.r, 1);
    assert.strictEqual(r.strength, 'strong');
});

test('Perfect negative correlation → r = -1', function () {
    var r = logic.computeCorrelation([1, 2, 3, 4, 5], [50, 40, 30, 20, 10]);
    assert.strictEqual(r.r, -1);
    assert.strictEqual(r.strength, 'strong');
});

test('Weak/no correlation → r < 0.4', function () {
    var r = logic.computeCorrelation([1, 2, 3, 4, 5], [3, 1, 4, 1, 5]);
    assert.ok(Math.abs(r.r) < 0.4, 'Expected weak/moderate, got r=' + r.r);
});

test('Insufficient data (< 3 points) → null', function () {
    var r = logic.computeCorrelation([1, 2], [3, 4]);
    assert.strictEqual(r.r, null);
    assert.strictEqual(r.insufficient, true);
});

test('Constant values → r = 0', function () {
    var r = logic.computeCorrelation([5, 5, 5, 5], [3, 3, 3, 3]);
    assert.strictEqual(r.r, 0);
});

section('TIER 2: Aimline Calculation');

test('Linear aimline from 20 to 80 over 12 weeks', function () {
    var goal = { baseline: 20, target: 80, baselineDate: '2025-01-01', targetDate: '2025-03-26' };
    var r = logic.calculateAimline(goal, []);
    assert.strictEqual(r.aimlinePoints[0].expected, 20);
    assert.ok(r.aimlinePoints[r.aimlinePoints.length - 1].expected >= 75, 'Final should be near 80');
    assert.strictEqual(r.alert, 'ok');
});

test('6 consecutive below → critical alert', function () {
    var goal = { baseline: 20, target: 80, baselineDate: '2025-01-01', targetDate: '2025-06-01' };
    var dataPoints = [];
    for (var w = 1; w <= 6; w++) {
        var d = new Date('2025-01-01');
        d.setDate(d.getDate() + w * 7);
        dataPoints.push({ date: d.toISOString(), value: 10 }); // far below aimline
    }
    var r = logic.calculateAimline(goal, dataPoints);
    assert.strictEqual(r.alert, 'critical');
});

test('4 consecutive below → warning alert', function () {
    var goal = { baseline: 20, target: 80, baselineDate: '2025-01-01', targetDate: '2025-06-01' };
    var dataPoints = [];
    for (var w = 1; w <= 4; w++) {
        var d = new Date('2025-01-01');
        d.setDate(d.getDate() + w * 7);
        dataPoints.push({ date: d.toISOString(), value: 10 });
    }
    var r = logic.calculateAimline(goal, dataPoints);
    assert.strictEqual(r.alert, 'warning');
});

// ═══════════════════════════════════════════════════════════════════════════════
// TIER 3: DATA QUALITY (affects reports & exports)
// ═══════════════════════════════════════════════════════════════════════════════

section('TIER 3: Math Fluency Benchmarks');

test('Grade 3 spring addition → 50 DCPM target', function () {
    var b = logic.getBenchmark('3', 'add', 'spring');
    assert.strictEqual(b.target, 50);
    assert.strictEqual(b.frustration, 25);
    assert.strictEqual(b.strategic, 38);
});

test('Grade K addition fall → 5 DCPM target', function () {
    var b = logic.getBenchmark('K', 'add', 'fall');
    assert.strictEqual(b.target, 5);
    assert.strictEqual(b.grade, 'K');
});

test('Grade k (lowercase) addition fall → 5 DCPM target', function () {
    var b = logic.getBenchmark('k', 'add', 'fall');
    assert.strictEqual(b.target, 5);
    assert.strictEqual(b.grade, 'K');
});

test('Grade 0 maps to K', function () {
    var b = logic.getBenchmark('0', 'add', 'spring');
    assert.strictEqual(b.grade, 'K');
    assert.strictEqual(b.target, 15);
});

test('Mixed operation defaults to add', function () {
    var b = logic.getBenchmark('3', 'mixed', 'spring');
    assert.strictEqual(b.target, 50);
});

test('Unknown grade defaults to 3', function () {
    var b = logic.getBenchmark('99', 'add', 'spring');
    assert.strictEqual(b.target, 50);
});

test('Benchmark label: at/above', function () {
    var b = { target: 50, strategic: 38, frustration: 25 };
    assert.strictEqual(logic.getBenchmarkLabel(50, b).tier, 'benchmark');
    assert.strictEqual(logic.getBenchmarkLabel(60, b).tier, 'benchmark');
});

test('Benchmark label: strategic', function () {
    var b = { target: 50, strategic: 38, frustration: 25 };
    assert.strictEqual(logic.getBenchmarkLabel(38, b).tier, 'strategic');
    assert.strictEqual(logic.getBenchmarkLabel(49, b).tier, 'strategic');
});

test('Benchmark label: intensive', function () {
    var b = { target: 50, strategic: 38, frustration: 25 };
    assert.strictEqual(logic.getBenchmarkLabel(37, b).tier, 'intensive');
    assert.strictEqual(logic.getBenchmarkLabel(0, b).tier, 'intensive');
});

section('TIER 3: Math Error Analysis');

test('All correct → 0 errors', function () {
    var problems = [
        { a: 3, b: 2, op: 'add', symbol: '+', answer: 5, studentAnswer: 5, correct: true },
        { a: 4, b: 3, op: 'add', symbol: '+', answer: 7, studentAnswer: 7, correct: true },
    ];
    var r = logic.analyzeErrors(problems);
    assert.strictEqual(r.errors, 0);
    assert.strictEqual(r.skips, 0);
});

test('Errors counted and categorized by operation', function () {
    var problems = [
        { a: 3, b: 2, op: 'add', symbol: '+', answer: 5, studentAnswer: 4, correct: false },
        { a: 6, b: 3, op: 'mul', symbol: 'x', answer: 18, studentAnswer: 15, correct: false },
        { a: 6, b: 3, op: 'mul', symbol: 'x', answer: 18, studentAnswer: 9, correct: false },
    ];
    var r = logic.analyzeErrors(problems);
    assert.strictEqual(r.errors, 3);
    assert.strictEqual(r.opErrors['Multiplication'], 2);
    assert.strictEqual(r.opErrors['Addition'], 1);
    assert.ok(r.patterns.some(function (p) { return p.indexOf('Multiplication') !== -1; }));
});

test('Skips detected and flagged as frustration', function () {
    var problems = [
        { a: 1, b: 1, op: 'add', symbol: '+', answer: 2, studentAnswer: 'SKIP', correct: false },
        { a: 2, b: 2, op: 'add', symbol: '+', answer: 4, studentAnswer: 'SKIP', correct: false },
        { a: 3, b: 3, op: 'add', symbol: '+', answer: 6, studentAnswer: 'SKIP', correct: false },
        { a: 4, b: 4, op: 'add', symbol: '+', answer: 8, studentAnswer: 'SKIP', correct: false },
    ];
    var r = logic.analyzeErrors(problems);
    assert.strictEqual(r.skips, 4);
    assert.ok(r.patterns.some(function (p) { return p.indexOf('frustration') !== -1; }));
});

section('TIER 3: Doc Pipeline — Issue Normalization');

test('Extracts WCAG code from issue text', function () {
    var r = logic.normalizeIssue({ issue: 'Missing alt text (1.1.1)' });
    assert.strictEqual(r.wcag, '1.1.1');
    assert.ok(r.issue.indexOf('1.1.1') === -1, 'WCAG code should be removed from issue text');
});

test('Preserves existing wcag field', function () {
    var r = logic.normalizeIssue({ issue: 'Missing alt text', wcag: '1.1.1' });
    assert.strictEqual(r.wcag, '1.1.1');
});

test('Adds period if missing', function () {
    var r = logic.normalizeIssue({ issue: 'Missing alt text' });
    assert.ok(r.issue.endsWith('.'), 'Should end with period: ' + r.issue);
});

test('Does not double-period', function () {
    var r = logic.normalizeIssue({ issue: 'Missing alt text.' });
    assert.ok(!r.issue.endsWith('..'), 'Should not double period');
});

test('Strips dangling open parens', function () {
    var r = logic.normalizeIssue({ issue: 'lacks header rows (' });
    assert.ok(r.issue.indexOf('(') === -1 || r.issue.indexOf(')') !== -1);
});

test('Handles null input gracefully', function () {
    assert.strictEqual(logic.normalizeIssue(null), null);
    // {} has no .issue field → function returns the input as-is
    var r = logic.normalizeIssue({});
    assert.deepStrictEqual(r, {});
});

section('TIER 3: Doc Pipeline — Issue Merging');

test('Deduplicates matching issues', function () {
    var a = [{ issue: 'Missing alt text on images' }];
    var b = [{ issue: 'Missing alt text on images' }];
    var r = logic.mergeIssues(a, b);
    assert.strictEqual(r.length, 1);
});

test('Keeps distinct issues', function () {
    var a = [{ issue: 'Missing alt text' }];
    var b = [{ issue: 'Missing page title' }];
    var r = logic.mergeIssues(a, b);
    assert.strictEqual(r.length, 2);
});

test('Handles empty arrays', function () {
    var r = logic.mergeIssues([], [], []);
    assert.strictEqual(r.length, 0);
});

section('TIER 3: Behavior Lens — Duration Formatting');

test('0 seconds → 0:00', function () {
    assert.strictEqual(logic.fmtDuration(0), '0:00');
});

test('Negative → 0:00', function () {
    assert.strictEqual(logic.fmtDuration(-5), '0:00');
});

test('90 seconds → 1:30', function () {
    assert.strictEqual(logic.fmtDuration(90), '1:30');
});

test('3605 seconds → 60:05', function () {
    assert.strictEqual(logic.fmtDuration(3605), '60:05');
});

test('5 seconds → 0:05 (padded)', function () {
    assert.strictEqual(logic.fmtDuration(5), '0:05');
});

section('TIER 3: Assessment Preset Integrity');

test('WISC-V has standard scoring (mean=100, sd=15)', function () {
    var p = logic.ASSESSMENT_PRESETS['WISC-V'];
    assert.strictEqual(p.scoreType, 'standard');
    assert.strictEqual(p.mean, 100);
    assert.strictEqual(p.sd, 15);
});

test('BASC-3 has T-score scoring (mean=50, sd=10)', function () {
    var p = logic.ASSESSMENT_PRESETS['BASC-3 (Parent)'];
    assert.strictEqual(p.scoreType, 'T-score');
    assert.strictEqual(p.mean, 50);
    assert.strictEqual(p.sd, 10);
});

test('BOT-2 uses standard with mean=50, sd=10', function () {
    var p = logic.ASSESSMENT_PRESETS['BOT-2'];
    assert.strictEqual(p.scoreType, 'standard');
    assert.strictEqual(p.mean, 50);
    assert.strictEqual(p.sd, 10);
});

test('All presets have subtests array', function () {
    Object.keys(logic.ASSESSMENT_PRESETS).forEach(function (key) {
        var p = logic.ASSESSMENT_PRESETS[key];
        assert.ok(Array.isArray(p.subtests), key + ' missing subtests array');
        assert.ok(p.scoreType === 'standard' || p.scoreType === 'T-score', key + ' has invalid scoreType');
        assert.ok(typeof p.mean === 'number', key + ' missing mean');
        assert.ok(typeof p.sd === 'number', key + ' missing sd');
    });
});

// ═══════════════════════════════════════════════════════════════════════════════
// RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

process.stdout.write('\n\x1b[1m' + '═'.repeat(60) + '\x1b[0m\n');
process.stdout.write('\x1b[1m  Results: \x1b[32m' + passed + ' passed\x1b[0m');
if (failed > 0) {
    process.stdout.write(', \x1b[31m' + failed + ' failed\x1b[0m');
}
process.stdout.write('  (' + (passed + failed) + ' total)\n');
process.stdout.write('\x1b[1m' + '═'.repeat(60) + '\x1b[0m\n');

if (failed > 0) {
    process.stdout.write('\n\x1b[31mFailed tests:\x1b[0m\n');
    errors.forEach(function (e) {
        process.stdout.write('  - ' + e.name + ': ' + e.error + '\n');
    });
    process.exit(1);
} else {
    process.stdout.write('\n\x1b[32mAll clinical logic tests passed.\x1b[0m\n');
    process.stdout.write('These tests verify the scoring, classification, and data integrity\n');
    process.stdout.write('functions that affect real student services and clinical decisions.\n\n');
    process.exit(0);
}
