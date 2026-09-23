// report_writer_module.js
// Report Writer — Clinical report generation module for AlloFlow
// Loaded from GitHub CDN via loadModule('ReportWriter', ...)
// Version: 1.0.0 (Mar 2026)
(function () {
  // Screen text goes through the host translator, read from window rather than
  // the `t` prop because `t` is a local name in several scopes here. A key that
  // does not resolve (no pack, or a test's identity `t`) shows the English.
  // Clinical content is NOT routed through this: prompts, the report text and
  // its export, instrument names and the verifier's findings stay as written.
  var __alloT = function (key, fallback) {
    if (typeof window !== 'undefined' && typeof window.__alloT === 'function') {
      try {
        var v = window.__alloT(key);
        if (typeof v === 'string' && v !== '' && v !== key) return v;
      } catch (e) {}
    }
    return fallback != null ? fallback : key;
  };
  // Fills {name} placeholders, so a translator can reorder the sentence.
  var rwFmt = function (text, params) {
    return String(text).replace(/\{([A-Za-z0-9_]+)\}/g, function (m, k) {
      return params && params[k] != null ? String(params[k]) : m;
    });
  };
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
  // Cleared first so the same message is announced again when repeated.
  var rwAnnounce = function (text) {
    var region = document.getElementById('allo-live-report-writer');
    if (!region) return;
    region.textContent = '';
    setTimeout(function () { region.textContent = String(text || ''); }, 30);
  };

    // WCAG 2.1 AA: Accessibility CSS injection
    if (!document.getElementById('rw-a11y-css')) {
        var rwA11yStyle = document.createElement('style');
        rwA11yStyle.id = 'rw-a11y-css';
        rwA11yStyle.textContent = [
            '@media (prefers-reduced-motion: reduce) { .fixed.inset-0 *, .fixed.inset-0 *::before, .fixed.inset-0 *::after { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; } }',
            '.fixed.inset-0 button:focus-visible, .fixed.inset-0 input:focus-visible, .fixed.inset-0 select:focus-visible, .fixed.inset-0 textarea:focus-visible, .fixed.inset-0 [tabindex]:focus-visible { outline: 2px solid #6366f1 !important; outline-offset: 2px !important; border-radius: 4px; }',
            '.fixed.inset-0 .text-slate-600 { color: #64748b !important; }',
            '#rw-dialog-surface button, #rw-dialog-surface input:not([type="hidden"]), #rw-dialog-surface select { min-height: 24px; }',
            '#rw-dialog-surface button, #rw-dialog-surface input[type="checkbox"], #rw-dialog-surface input[type="radio"] { min-width: 24px; }',
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
    const useReducedMotion = () => {
        const getPreference = () => typeof window !== 'undefined'
            && typeof window.matchMedia === 'function'
            && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const [reducedMotion, setReducedMotion] = useState(getPreference);
        useEffect(() => {
            if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return undefined;
            const query = window.matchMedia('(prefers-reduced-motion: reduce)');
            const updatePreference = event => setReducedMotion(event.matches);
            setReducedMotion(query.matches);
            if (typeof query.addEventListener === 'function') query.addEventListener('change', updatePreference);
            else if (typeof query.addListener === 'function') query.addListener(updatePreference);
            return () => {
                if (typeof query.removeEventListener === 'function') query.removeEventListener('change', updatePreference);
                else if (typeof query.removeListener === 'function') query.removeListener(updatePreference);
            };
        }, []);
        return reducedMotion;
    };

    // ─── Utility Helpers ────────────────────────────────────────────────
    const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[ch]);
    const sanitizeFilenamePart = (value) => String(value || 'student')
        .replace(/[<>:"/\\|?*\u0000-\u001F]/g, '_')
        .replace(/\s+/g, '_')
        .replace(/[. ]+$/g, '')
        .slice(0, 80) || 'student';
    const normalizeReportScoreType = (raw) => {
        const token = String(raw || 'standard').trim().toLowerCase().replace(/[\s-]+/g, '_');
        if (token === 't' || token === 't_score' || token === 'tscore') return 't_score';
        if (token === 'scaled' || token === 'scaled_score') return 'scaled_score';
        if (token === 'standard' || token === 'standard_score' || token === 'ss') return 'standard';
        return token || 'standard';
    };

    // ─── Score classification: ONE table for the display, the AI prompt and the verifier ───
    // Publishers name score ranges differently, and the names collide: "Very Low"
    // is 70-79 on the WISC-V but 69 and below on the WJ IV. A label means nothing
    // without its instrument. Instruments in RW_INSTRUMENT_SYSTEMS use their own
    // manual's bands. Any other instrument shows a generic WISC-V-style label, and
    // the verifier accepts a label if ANY system on the same scale uses it for that
    // score, because it cannot know which manual the clinician followed. GARS-3 is
    // deliberately unclassified: its Autism Index is a likelihood scale, not an
    // ability score. Bands run high to low; `min` is inclusive. Colour carries
    // meaning: red/orange mark a clinical concern (see verifyChunk). Every band is
    // listed in docs/clinical_validation_log.md for sign-off against the manuals.
    // Sources for every band: docs/clinical_validation_log.md (publisher manuals,
    // Pearson/MHS/PAR/WPS sample score reports, Q-global help; GARS-3 from two
    // peer-reviewed papers citing the manual).
    const RW_SCORE_SYSTEMS = {
        wechsler5: { name: 'WISC-V', scale: 'ss100', bands: [
            [130, 'Extremely High', 'emerald'], [120, 'Very High', 'green'], [110, 'High Average', 'teal'],
            [90, 'Average', 'sky'], [80, 'Low Average', 'amber'], [70, 'Very Low', 'orange'], [-Infinity, 'Extremely Low', 'red']] },
        wiat4: { name: 'WIAT-4 10-point scale', scale: 'ss100', bands: [
            [130, 'Extremely High', 'emerald'], [120, 'Very High', 'green'], [110, 'High Average', 'teal'],
            [90, 'Average', 'sky'], [80, 'Low Average', 'amber'], [70, 'Very Low', 'orange'], [-Infinity, 'Extremely Low', 'red']] },
        wechslerClassic: { name: 'traditional Wechsler (WAIS-IV, WPPSI-IV, WISC-IV)', scale: 'ss100', bands: [
            [130, 'Very Superior', 'emerald'], [120, 'Superior', 'green'], [110, 'High Average', 'teal'],
            [90, 'Average', 'sky'], [80, 'Low Average', 'amber'], [70, 'Borderline', 'orange'], [-Infinity, 'Extremely Low', 'red']] },
        woodcockJohnson: { name: 'WJ IV', scale: 'ss100', bands: [
            [131, 'Very Superior', 'emerald'], [121, 'Superior', 'green'], [111, 'High Average', 'teal'],
            [90, 'Average', 'sky'], [80, 'Low Average', 'amber'], [70, 'Low', 'orange'], [-Infinity, 'Very Low', 'red']] },
        kaufman: { name: 'KABC-II', scale: 'ss100', bands: [
            [131, 'Upper Extreme', 'emerald'], [116, 'Above Average', 'green'], [85, 'Average', 'sky'],
            [70, 'Below Average', 'orange'], [-Infinity, 'Lower Extreme', 'red']] },
        dasII: { name: 'DAS-II', scale: 'ss100', bands: [
            [130, 'Very High', 'emerald'], [120, 'High', 'green'], [110, 'Above Average', 'teal'],
            [90, 'Average', 'sky'], [80, 'Below Average', 'amber'], [70, 'Low', 'orange'], [-Infinity, 'Very Low', 'red']] },
        // KTEA-3's 10-point LABELS differ from WIAT-4's on the same cut points.
        ktea3: { name: 'KTEA-3 10-point scale', scale: 'ss100', bands: [
            [130, 'Very High', 'emerald'], [120, 'High', 'green'], [110, 'Above Average', 'teal'],
            [90, 'Average', 'sky'], [80, 'Below Average', 'amber'], [70, 'Low', 'orange'], [-Infinity, 'Very Low', 'red']] },
        // Pearson's 15-point descriptors, offered by KTEA-3 and WIAT-4 in Q-global.
        pearson15: { name: 'Pearson 15-point scale', scale: 'ss100', bands: [
            [146, 'Very High', 'emerald'], [131, 'High', 'green'], [116, 'Above Average', 'teal'],
            [85, 'Average', 'sky'], [70, 'Below Average', 'amber'], [55, 'Low', 'orange'], [-Infinity, 'Very Low', 'red']] },
        // CELF-5 Examiner's Manual Table 4.5 (Core Language and index scores):
        // "Very low range/Severe", "Low range/Moderate", "Marginal/Below average/Mild".
        celf5: { name: 'CELF-5', scale: 'ss100', bands: [
            [115, 'Above Average', 'green'], [86, 'Average', 'sky'], [78, 'Below Average', 'amber'],
            [71, 'Low', 'orange'], [-Infinity, 'Very Low', 'red']] },
        vineland3: { name: 'Vineland-3', scale: 'ss100', bands: [
            [130, 'High', 'emerald'], [115, 'Moderately High', 'green'], [86, 'Adequate', 'sky'],
            [71, 'Moderately Low', 'orange'], [-Infinity, 'Low', 'red']] },
        // GARS-3 Autism Index: a likelihood, so HIGHER is the concern, and its
        // words apply to GARS-3 only (ownOnly): "very likely" in a sentence about
        // another test is not a classification claim. Levels (not in the label):
        // 55-70 Level 1, 71-100 Level 2, 101+ Level 3.
        gars3: { name: 'GARS-3', scale: 'ss100', direction: 'high', ownOnly: true, bands: [
            [101, 'Very Likely', 'red'], [71, 'Very Likely', 'red'], [55, 'Probable', 'orange'], [-Infinity, 'Unlikely', 'sky']] },
        bascClinical: { name: 'BASC-3 clinical scales', scale: 't50', bands: [
            [70, 'Clinically Significant', 'red'], [60, 'At-Risk', 'orange'], [41, 'Average', 'sky'],
            [31, 'Low', 'slate'], [-Infinity, 'Very Low', 'slate']] },
        bascAdaptive: { name: 'BASC-3 adaptive scales', scale: 't50', bands: [
            [70, 'Very High', 'emerald'], [60, 'High', 'green'], [41, 'Average', 'sky'],
            [31, 'At-Risk', 'orange'], [-Infinity, 'Clinically Significant', 'red']] },
        // MHS Conners 4 manual Table 4.1: 60-64 is "Slightly Elevated" (the
        // Conners 3 "High Average" wording was used here until 2026-09-23).
        conners: { name: 'Conners 4', scale: 't50', bands: [
            [70, 'Very Elevated', 'red'], [65, 'Elevated', 'orange'], [60, 'Slightly Elevated', 'amber'],
            [40, 'Average', 'sky'], [-Infinity, 'Low', 'slate']] },
        // PAR names no band below 60; its narratives say "within the average range".
        brief2: { name: 'BRIEF-2', scale: 't50', bands: [
            [70, 'Clinically Elevated', 'red'], [65, 'Potentially Clinically Elevated', 'orange'],
            [60, 'Mildly Elevated', 'amber'], [-Infinity, 'Average', 'sky']] },
        // WPS report legend: "Severe", "Moderate", "Mild", "Normal".
        srs2: { name: 'SRS-2', scale: 't50', bands: [
            [76, 'Severe', 'red'], [66, 'Moderate', 'red'], [60, 'Mild', 'orange'], [-Infinity, 'Normal', 'sky']] },
        bot2: { name: 'BOT-2', scale: 'ss50', bands: [
            [70, 'Well-Above Average', 'emerald'], [60, 'Above Average', 'green'], [41, 'Average', 'sky'],
            [31, 'Below Average', 'orange'], [-Infinity, 'Well-Below Average', 'red']] },
    };
    const RW_BASC_ADAPTIVE_SCALES = new Set(['Adaptive Skills', 'Adaptability', 'Social Skills', 'Leadership', 'Study Skills', 'Functional Communication', 'Activities of Daily Living']);
    // Instruments whose own manual's bands are encoded above. 'basc' splits by
    // scale direction. An object means the examiner chooses the descriptor
    // scale in Q-global; the default is what Pearson's sample reports print.
    const RW_INSTRUMENT_SYSTEMS = {
        'WISC-V': 'wechsler5', 'WJ-IV COG': 'woodcockJohnson', 'WJ-IV ACH': 'woodcockJohnson', 'KABC-II': 'kaufman',
        'Vineland-3': 'vineland3', 'Conners-4': 'conners', 'BRIEF-2': 'brief2', 'SRS-2': 'srs2', 'BOT-2': 'bot2',
        'BASC-3 (Parent)': 'basc', 'BASC-3 (Teacher)': 'basc', 'GARS-3': 'gars3', 'DAS-II': 'dasII', 'CELF-5': 'celf5',
        'WIAT-4': { '10': 'wiat4', '15': 'pearson15', default: '10' },
        'KTEA-3': { '10': 'ktea3', '15': 'pearson15', default: '15' },
    };
    // Instruments with more than one publisher descriptor scale, for Step 4.
    const RW_DESCRIPTOR_SCALES = Object.fromEntries(Object.entries(RW_INSTRUMENT_SYSTEMS)
        .filter(([, v]) => v && typeof v === 'object').map(([k, v]) => [k, { options: Object.keys(v).filter(x => x !== 'default'), default: v.default }]));
    const RW_GENERIC_SYSTEM = { ss100: 'wechsler5', t50: 'bascClinical', ss50: 'bot2' };
    const RW_SCALE_STATS = { ss100: [100, 15], t50: [50, 10], ss50: [50, 10], ss10: [10, 3] };
    const rwSystemKeyFor = (assessment, subtest, scheme) => {
        const key = RW_INSTRUMENT_SYSTEMS[assessment];
        if (key === 'basc') return RW_BASC_ADAPTIVE_SCALES.has(subtest) ? 'bascAdaptive' : 'bascClinical';
        if (key && typeof key === 'object') return key[String(scheme)] || key[key.default];
        return key || null;
    };
    // A SUBTEST scaled score (mean 10, SD 3) is not on its instrument's composite
    // bands: a WISC-V "Block Design 7" showed Extremely Low at the 0.1st
    // percentile instead of about the 16th. Only an explicit scaled score leaves
    // the instrument's bands; any other stated type trusts the instrument, since
    // a BASC-3 row mislabelled "standard" is still a BASC-3 T-score.
    const rwOwnSystem = (scoreType, assessment, subtest, scheme) => {
        const key = rwSystemKeyFor(assessment, subtest, scheme);
        if (!RW_SCORE_SYSTEMS[key]) return key;
        return normalizeReportScoreType(scoreType) === 'scaled_score' ? null : key;
    };
    const rwScoreScale = (scoreType, assessment, subtest, scheme) => {
        const key = rwOwnSystem(scoreType, assessment, subtest, scheme);
        if (RW_SCORE_SYSTEMS[key]) return RW_SCORE_SYSTEMS[key].scale;
        const type = normalizeReportScoreType(scoreType);
        if (type === 't_score') return 't50';
        if (type === 'scaled_score') return 'ss10';
        return 'ss100';
    };
    // Entry guard. 'error' refuses the score; 'warn' accepts it with a note.
    // The hard limits are wide enough for every preset's published range; the
    // soft ones mark scores that are possible but rare enough to double-check.
    const RW_SCALE_LIMITS = { ss100: { hard: [20, 200], soft: [40, 160] }, t50: { hard: [10, 120], soft: [20, 100] },
        ss50: { hard: [10, 90], soft: [20, 80] }, ss10: { hard: [1, 19], soft: [1, 19] } };
    const rwScoreEntryProblem = (score, scoreType, assessment, subtest) => {
        const value = Number(score);
        if (score === '' || score == null || !Number.isFinite(value)) return { level: 'error', message: __alloT('report_writer.entry_enter_a_number', 'Enter a number.') };
        const scale = rwScoreScale(scoreType, assessment, subtest);
        const limits = RW_SCALE_LIMITS[scale];
        const label = { ss100: __alloT('report_writer.metric_standard_score', 'standard score'), t50: __alloT('report_writer.metric_t_score', 'T-score'),
            ss50: __alloT('report_writer.metric_standard_score_mean_50', 'standard score (mean 50)'), ss10: __alloT('report_writer.metric_scaled_score', 'scaled score') }[scale];
        if (value < limits.hard[0] || value > limits.hard[1]) {
            const hint = scale === 'ss100' && value >= 1 && value <= 19
                ? ' ' + __alloT('report_writer.entry_looks_like_a_scaled_score', 'It looks like a subtest scaled score (mean 10): add it as a custom subtest with the score type "Scaled score".') : '';
            return { level: 'error', message: rwFmt(__alloT('report_writer.entry_outside_the_possible_range', '{value} is outside the possible range for a {metric} ({min}-{max}).'),
                { value, metric: label, min: limits.hard[0], max: limits.hard[1] }) + hint };
        }
        if (value < limits.soft[0] || value > limits.soft[1]) {
            return { level: 'warn', message: rwFmt(__alloT('report_writer.entry_unusual_score', '{value} is unusual for a {metric}; check it against the score report.'), { value, metric: label }) };
        }
        return null;
    };
    const rwBand = (systemKey, score) => {
        const bands = RW_SCORE_SYSTEMS[systemKey].bands;
        for (let i = 0; i < bands.length; i++) {
            if (score >= bands[i][0]) return { label: bands[i][1], color: bands[i][2] };
        }
        return null;
    };
    const rwLabelRange = (systemKey, label) => {
        const bands = RW_SCORE_SYSTEMS[systemKey].bands;
        const i = bands.findIndex(b => b[1] === label);
        if (i < 0) return null;
        const min = bands[i][0], max = i === 0 ? Infinity : bands[i - 1][0] - 1;
        return min === -Infinity ? `${max} and below` : (max === Infinity ? `${min} and above` : `${min}-${max}`);
    };
    // `scheme` picks the descriptor scale for an instrument that has two ('10' or
    // '15' for WIAT-4 and KTEA-3); anything else uses the instrument's default.
    const rwClassifyScore = (score, scoreType, assessment, subtest, scheme) => {
        const value = Number(score);
        const own = rwOwnSystem(scoreType, assessment, subtest, scheme);
        const key = RW_SCORE_SYSTEMS[own] ? own : RW_GENERIC_SYSTEM[rwScoreScale(scoreType, assessment, subtest, scheme)];
        if (!key || !Number.isFinite(value)) return { label: 'Unclassified', color: 'slate', system: null, unclassified: true };
        const band = rwBand(key, value);
        return { label: band.label, color: band.color, system: key, systemName: RW_SCORE_SYSTEMS[key].name, generic: key !== own,
            direction: RW_SCORE_SYSTEMS[key].direction || 'low' };
    };
    // Normal-curve percentile (Abramowitz & Stegun 7.1.26 erf), unrounded.
    const rwNormalPercentile = (score, stats) => {
        const z = (Number(score) - stats[0]) / stats[1];
        const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
        const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
        return 50 * (1 + (z < 0 ? -erf : erf));
    };
    const rwScorePercentile = (score, scoreType, assessment, subtest) => {
        const stats = RW_SCALE_STATS[rwScoreScale(scoreType, assessment, subtest)] || RW_SCALE_STATS.ss100;
        const pct = Math.round(rwNormalPercentile(score, stats) * 10) / 10;
        return Math.min(99.5, Math.max(0.5, pct));
    };
    // The percentile shown on the badge and given to the AI. Normalised standard
    // scores use the normal curve, reported the way score reports print it: whole
    // numbers from 1 to 99, one decimal outside that (0.4, 99.6), never 0 or 100.
    // It used to be Math.round, so an FSIQ of 55 showed "0%ile". T-scores return
    // null: BASC-3, Conners 4, BRIEF-2 and SRS-2 percentiles come from each
    // manual's norm tables, not the normal curve, so only a clinician-entered
    // percentile is used for them.
    const rwDisplayPercentile = (score, scoreType, assessment, subtest) => {
        const scale = rwScoreScale(scoreType, assessment, subtest);
        const stats = RW_SCALE_STATS[scale];
        if (scale === 't50' || !stats || !Number.isFinite(Number(score))) return null;
        const p = rwNormalPercentile(score, stats);
        if (p < 1) return Math.max(0.1, Math.round(p * 10) / 10);
        if (p > 99) return Math.min(99.9, Math.round(p * 10) / 10);
        return Math.round(p);
    };
    // "21st percentile", "0.4 percentile". The old "${p}th %ile" produced "21th"
    // and "22th" in the text handed to the AI, which could copy it into a report.
    const rwPercentileText = (p) => {
        const n = Number(p);
        if (!Number.isFinite(n)) return '';
        if (!Number.isInteger(n)) return `${n} percentile`;
        const mod100 = n % 100, mod10 = n % 10;
        const suffix = (mod100 >= 11 && mod100 <= 13) ? 'th' : ({ 1: 'st', 2: 'nd', 3: 'rd' })[mod10] || 'th';
        return `${n}${suffix} percentile`;
    };
    // A confidence interval comes from the manual's tables for that instrument,
    // age and reliability, so it is never computed here; only one the clinician
    // typed from the score report is used.
    const rwHasCI = (s) => s && s.ciLow != null && s.ciHigh != null && s.ciLow !== '' && s.ciHigh !== ''
        && Number.isFinite(Number(s.ciLow)) && Number.isFinite(Number(s.ciHigh));
    // A reevaluation compares with the last evaluation. A prior score is what the
    // examiner recorded from that report; it is shown and cited as a past result.
    const rwHasPrior = (s) => s && s.priorScore != null && s.priorScore !== '' && Number.isFinite(Number(s.priorScore));
    const rwPriorText = (s) => (rwHasPrior(s) ? String(s.priorScore) + (s.priorLabel ? ' (' + s.priorLabel + ')' : '') : '');
    // One description of a score for every AI prompt: its metric, its label, and
    // a percentile or confidence interval ONLY when the data holds one. The
    // prompts used to give "88 (Low Average)" alone, so the model computed, or
    // invented, the percentiles and intervals it wrote into the report.
    const rwScoreFactText = (s) => {
        const value = s.value != null ? s.value : s.score;
        const type = { t_score: 'T-score', scaled_score: 'scaled score' }[normalizeReportScoreType(s.scoreType)] || 'standard score';
        const parts = [type];
        if (s.classification) parts.push(s.classification);
        if (s.percentile != null && s.percentile !== '') parts.push(rwPercentileText(s.percentile) + (s.percentileSource === 'manual' ? ' (from the score report)' : ''));
        if (rwHasCI(s)) parts.push(`${s.ciLevel || 95}% CI ${s.ciLow}-${s.ciHigh}`);
        if (rwHasPrior(s)) parts.push(`prior score ${s.priorScore}${s.priorLabel ? ' (' + s.priorLabel + ')' : ''}, from records`);
        return `${value} (${parts.join('; ')})`;
    };
    // Background facts are extracted by the AI from Steps 2 and 3. Text added or
    // changed afterwards never reached the report and nothing said so, because
    // facts could only be extracted while there were none. The fingerprint of
    // the text they came from is kept with the report.
    const rwBackgroundSourceText = (bgSections, clinicalObs) => {
        const bgText = Object.entries(bgSections || {}).filter(([, v]) => String(v || '').trim()).map(([k, v]) => `${k}: ${v}`).join('\n\n');
        const obsText = Object.entries(clinicalObs || {}).filter(([, v]) => v && String(v.text || '').trim()).map(([, v]) => `[Source: ${v.source}]\n${v.text}`).join('\n\n');
        return (bgText + '\n\n' + obsText).trim();
    };
    const rwTextHash = (text) => {
        let h = 5381;
        const str = String(text || '');
        for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
        return (h >>> 0).toString(16) + ':' + str.length;
    };
    // Facts the AI extracted from Steps 2 and 3, as opposed to ones brought in
    // from Dynamic Assessment or AssessmentCenter, which re-extraction keeps.
    // Facts saved before `origin` existed are recognised by type and source.
    const rwIsExtractedBackground = (c) => !!c && (c.origin === 'extracted'
        || (!c.origin && c.type === 'background' && !/^(AssessmentCenter|Dynamic Assessment)/i.test(String(c.source || ''))));
    // Re-extraction replaces the extracted background facts. A fact that comes
    // back unchanged keeps its id (so citations still resolve) and its
    // verification; everything else is new and must be verified.
    const rwMergeBackgroundFacts = (current, extracted) => {
        const keyOf = (c) => (String(c.field || '') + '\u0000' + String(c.value || '')).toLowerCase();
        const previous = new Map();
        (current || []).filter(rwIsExtractedBackground).forEach(c => { if (!previous.has(keyOf(c))) previous.set(keyOf(c), c); });
        const kept = [], added = [];
        (extracted || []).forEach(c => {
            const old = previous.get(keyOf(c));
            if (old) { kept.push(old); previous.delete(keyOf(c)); } else added.push(c);
        });
        return {
            chunks: [...(current || []).filter(c => !rwIsExtractedBackground(c)), ...kept, ...added],
            kept: kept.length, added: added.length, removed: previous.size,
        };
    };
    // A score fact is a copy of a Step 4 row, made when facts are extracted.
    const rwScoreChunkFrom = (s, id) => ({
        id, type: 'score', source: s.assessment, field: s.subtest,
        value: s.score, classification: s.classification, scoreType: s.scoreType, descriptorScale: s.descriptorScale,
        percentile: s.percentile, percentileSource: s.percentileSource,
        ciLow: s.ciLow, ciHigh: s.ciHigh, ciLevel: s.ciLevel,
        priorScore: s.priorScore, priorLabel: s.priorLabel,
        verified: false, immutable: false,
        devNormResult: null, addedAt: s.addedAt
    });
    // A score changed, added or removed in Step 4 after the facts were extracted
    // left the prompts writing from the old fact while the checker judged the
    // draft against the new score. Only score facts of Step 4 instruments are
    // compared (facts brought in from Dynamic Assessment are not Step 4 rows),
    // and nothing is stale before the first extraction.
    const RW_FACT_FIELDS = ['scoreType', 'classification', 'percentile', 'percentileSource', 'ciLow', 'ciHigh', 'ciLevel', 'priorScore', 'priorLabel', 'descriptorScale'];
    const rwSameFact = (a, b) => (a == null || a === '' ? null : String(a)) === (b == null || b === '' ? null : String(b));
    const rwStaleScoreFacts = (factChunks, scoreEntries) => {
        const key = (a, b) => a + ' :: ' + String(b).trim().toLowerCase();
        const chunks = (Array.isArray(factChunks) ? factChunks : []).filter(c => c && c.type === 'score' && ASSESSMENT_PRESETS[c.source]);
        const none = { changed: [], added: [], removed: [], count: 0 };
        if (!chunks.length) return none;
        const entries = Array.isArray(scoreEntries) ? scoreEntries : [];
        const byKey = new Map(chunks.map(c => [key(c.source, c.field), c]));
        const entryKeys = new Set(entries.map(e => key(e.assessment, e.subtest)));
        const changed = [], added = [];
        entries.forEach(e => {
            const c = byKey.get(key(e.assessment, e.subtest));
            if (!c) added.push(e);
            else if (!rwSameFact(c.value, e.score) || RW_FACT_FIELDS.some(f => !rwSameFact(c[f], e[f]))) changed.push({ chunk: c, entry: e });
        });
        const removed = chunks.filter(c => !entryKeys.has(key(c.source, c.field)));
        return { changed, added, removed, count: changed.length + added.length + removed.length };
    };
    // Summary of Scores, built from the entered data and never by the AI, so the
    // table a reviewer checks first cannot be mistranscribed. The exported report
    // used to hold only AI-written prose. One table per instrument, entry order.
    const RW_SCORE_TABLE_NOTE = 'Scores as entered by the examiner. SS = standard score; T = T-score; Scaled = scaled score (mean 10, SD 3). '
        + 'Classifications use each publisher\'s descriptors where AlloFlow has them. * Percentile estimated from the normal curve; '
        + 'unmarked percentiles are from the score report. Confidence intervals appear only where recorded from the score report.';
    const RW_SCORE_TABLE_PRIOR_NOTE = 'Prior = the score from an earlier evaluation, as recorded by the examiner; scores from different editions or small differences may not be comparable.';
    const rwScoreTableGroups = (scoreEntries) => {
        const groups = new Map();
        (Array.isArray(scoreEntries) ? scoreEntries : []).forEach(s => {
            if (!s || typeof s.assessment !== 'string' || !Number.isFinite(Number(s.score))) return;
            const type = normalizeReportScoreType(s.scoreType);
            const hasPct = s.percentile != null && s.percentile !== '';
            if (!groups.has(s.assessment)) groups.set(s.assessment, []);
            groups.get(s.assessment).push({
                scale: String(s.subtest || ''), score: String(s.score),
                type: type === 't_score' ? 'T' : type === 'scaled_score' ? 'Scaled' : 'SS',
                percentile: hasPct ? String(s.percentile) + (s.percentileSource === 'manual' ? '' : '*') : '—',
                ci: rwHasCI(s) ? `${s.ciLevel || 95}%: ${s.ciLow}–${s.ciHigh}` : '—',
                prior: rwPriorText(s),
                classification: String(s.classification || ''),
                descriptors: RW_DESCRIPTOR_SCALES[s.assessment] ? RW_SCORE_SYSTEMS[rwSystemKeyFor(s.assessment, s.subtest, s.descriptorScale)].name : '',
            });
        });
        return groups;
    };
    const rwScoreTableCaption = (assessment, rows) => assessment + (rows[0] && rows[0].descriptors ? ` (classifications: ${rows[0].descriptors})` : '');
    const rwScoreTableHtml = (scoreEntries) => {
        const groups = rwScoreTableGroups(scoreEntries);
        if (!groups.size) return '';
        const withPrior = [...groups.values()].some(rows => rows.some(r => r.prior));
        const head = '<thead><tr><th scope="col">Scale</th><th scope="col">Score</th><th scope="col">Type</th><th scope="col">Percentile</th><th scope="col">Confidence interval</th><th scope="col">Classification</th>'
            + (withPrior ? '<th scope="col">Prior</th>' : '') + '</tr></thead>';
        const tables = [...groups].map(([assessment, rows]) => '<div class="score-table-wrap"><table class="score-table"><caption>' + escapeHtml(rwScoreTableCaption(assessment, rows)) + '</caption>' + head + '<tbody>'
            + rows.map(r => '<tr><th scope="row">' + escapeHtml(r.scale) + '</th><td>' + escapeHtml(r.score) + '</td><td>' + r.type + '</td><td>' + escapeHtml(r.percentile) + '</td><td>' + escapeHtml(r.ci) + '</td><td>' + escapeHtml(r.classification) + '</td>'
                + (withPrior ? '<td>' + escapeHtml(r.prior || '—') + '</td>' : '') + '</tr>').join('')
            + '</tbody></table></div>').join('');
        return '<section aria-labelledby="rw-print-scores"><h2 id="rw-print-scores">Summary of Scores</h2>' + tables + '<p class="score-note">' + escapeHtml(RW_SCORE_TABLE_NOTE + (withPrior ? ' ' + RW_SCORE_TABLE_PRIOR_NOTE : '')) + '</p></section>';
    };
    // The rows psycheck checks a draft against. Shared by the Verify button and
    // by draft selection, so both judge the same data.
    const rwPsycheckSources = (scoreEntries) => (Array.isArray(scoreEntries) ? scoreEntries : [])
        .filter(s => s && typeof s.assessment === 'string' && s.assessment.length > 0
            && typeof s.subtest === 'string' && s.subtest.length > 0
            && s.score !== null && s.score !== undefined && s.score !== '')
        .map(s => ({
            assessment: s.assessment, subtest: s.subtest, score: s.score,
            scoreType: normalizeReportScoreType(s.scoreType || s.score_type || 'standard'),
            classification: s.classification, percentile: s.percentile, percentileSource: s.percentileSource,
            ciLow: s.ciLow, ciHigh: s.ciHigh, ciLevel: s.ciLevel, descriptorScale: s.descriptorScale,
            priorScore: s.priorScore, priorLabel: s.priorLabel,
        }));
    // Choosing among N parallel drafts of one section. The deterministic verifier
    // decides first: a draft that misquotes a score is never preferred over one
    // that does not, however many chunks it cites. Among drafts with the fewest
    // findings, the older heuristic (evidence cited, scores covered, length)
    // breaks the tie. Before 2026-09-23 the verifier never saw the candidates, so
    // the "best" draft could carry a wrong number that a discarded draft had
    // right. If the verifier cannot run, every draft counts as unverified
    // (never as clean) and the heuristic alone decides, as before.
    const rankGenerationPasses = (passResults, verifiedChunks, sources, caseRecords) => {
        const chunks = Array.isArray(verifiedChunks) ? verifiedChunks : [];
        const scoreChunkCount = chunks.filter(c => c.type === 'score').length;
        const findingsIn = (text) => {
            if (!sources || !sources.length) return 0;
            try {
                const api = typeof window !== 'undefined' ? window.AlloPsycheck : null;
                return api ? api.verifyDraft(sources, String(text || ''), { caseRecords }).discrepancies.length : null;
            } catch (e) { return null; }
        };
        return passResults.map(r => {
            const used = Array.isArray(r.usedChunks) ? r.usedChunks : [];
            let score = used.length * 10;
            score += Math.min(String(r.text || '').length / 50, 30);
            score -= (String(r.text || '').match(/\[Error/g) || []).length * 50;
            score -= /\[Student\]/.test(String(r.text || '')) ? 0 : 5;
            const citedScoreChunks = used.filter(id => chunks.find(c => c.id === id && c.type === 'score')).length;
            score += (citedScoreChunks / Math.max(scoreChunkCount, 1)) * 20;
            return { ...r, qualityScore: score, psycheckFindings: findingsIn(r.text) };
        }).sort((a, b) => {
            const fa = a.psycheckFindings == null ? Infinity : a.psycheckFindings;
            const fb = b.psycheckFindings == null ? Infinity : b.psycheckFindings;
            return (fa === fb ? 0 : fa - fb) || (b.qualityScore - a.qualityScore);
        });
    };
    // ─── Reference retrieval on Lumen's evidence core ───
    // The reference library used to be joined, scrubbed and cut to its first
    // 3000 characters for EVERY prompt: a 40-page regulation reached the model as
    // roughly its table of contents, the same opening for every section, and
    // nothing said so. Now each reference is split into passages by Lumen's pure
    // evidence core (window.LumenEvidence: stable passage ids, line locators,
    // local BM25-style ranking, nothing leaves the device) and each section gets
    // the passages that match it, which the model may cite in USED_CHUNKS.
    const RW_REF_BUDGET_CHARS = 6000;
    const RW_REF_MAX_PASSAGES = 8;
    // Regulation and manual headings ("VII.2.L. Specific Learning Disability",
    // "§ 300.307 ...", "Chapter 101") become "# " lines before chunking, the only
    // heading form Lumen recognises, so a passage carries its citation. A probe
    // on MUSER-style text otherwise cited "Page 12" and lost "VII.2.L". A
    // numbered SENTENCE ("1.2 Students must be ...") is left as content.
    const rwIsReferenceHeading = (line) => {
        const t = String(line || '').trim();
        if (t.length < 3 || t.length > 100) return false;
        if (/^(?:§+\s*\d|(?:Chapter|Section|Part|Subpart|Appendix|Article)\s+[\w.\-]+\b)/i.test(t)) return true;
        return /^(?:[IVXLC]+|\d{1,3})(?:\.[0-9A-Za-z]{1,4}){1,4}\.?\s+[A-Z(]/.test(t) && !/[.;:!?]$/.test(t) && t.split(/\s+/).length <= 12;
    };
    const rwMarkReferenceHeadings = (text) => String(text || '').split(/\r?\n/)
        .map(line => (rwIsReferenceHeading(line) ? '\n# ' + line.trim() + '\n' : line)).join('\n');
    // Lumen ranks exact lowercase tokens: "SLD" never met "Specific Learning
    // Disability" and "weakness" never met "weaknesses". Queries are expanded
    // with clinical synonyms and singular/plural forms; the passages themselves
    // are never rewritten, because they are quoted to the model verbatim.
    const RW_CLINICAL_SYNONYMS = [
        ['sld', 'specific learning disability', 'learning disabilities'], ['ohi', 'other health impairment'],
        ['emotional disturbance', 'emotional disability', 'ebd'], ['intellectual disability', 'intellectual disabilities'],
        ['asd', 'autism', 'autism spectrum disorder'], ['speech or language impairment', 'speech language impairment', 'sli'],
        ['tbi', 'traumatic brain injury'], ['developmental delay'], ['psw', 'pattern of strengths and weaknesses'],
        ['rti', 'mtss', 'response to intervention', 'multi-tiered system of supports'],
        ['fba', 'functional behavioral assessment', 'functional behavior assessment'], ['bip', 'behavior intervention plan'],
        ['iep', 'individualized education program'], ['adhd', 'attention deficit', 'hyperactivity'],
        ['ell', 'english learner', 'english language learner', 'limited english proficiency'],
        ['eligibility', 'eligible', 'qualify', 'determination'], ['evaluation', 'reevaluation', 'assessment'],
        ['recommendations', 'accommodations', 'interventions', 'supports'],
    ];
    const rwExpandClinicalQuery = (query) => {
        const text = String(query || '').toLowerCase();
        const extra = new Set();
        RW_CLINICAL_SYNONYMS.forEach(group => {
            if (group.some(term => new RegExp('\\b' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b').test(text))) group.forEach(term => extra.add(term));
        });
        (text.match(/[a-z][a-z'-]{3,}/g) || []).forEach(w => {
            if (/ies$/.test(w)) extra.add(w.slice(0, -3) + 'y');
            else if (/(?:ss|sh|ch|x)es$/.test(w)) extra.add(w.slice(0, -2));
            else if (/s$/.test(w) && !/ss$/.test(w)) extra.add(w.slice(0, -1));
            else if (/y$/.test(w)) extra.add(w.slice(0, -1) + 'ies');
            else if (/(?:ss|sh|ch|x)$/.test(w)) extra.add(w + 'es');
            else extra.add(w + 's');
        });
        return (String(query || '') + ' ' + Array.from(extra).join(' ')).trim();
    };
    let rwRefProjectCache = { key: null, project: null, skipped: [] };
    const rwReferenceProject = (referenceLibrary) => {
        const E = typeof window !== 'undefined' ? window.LumenEvidence : null;
        const refs = (Array.isArray(referenceLibrary) ? referenceLibrary : []).filter(r => r && typeof r.text === 'string' && r.text.trim());
        if (!E || !refs.length) return null;
        const key = refs.map(r => (r.id || r.name) + ':' + E.hashString(r.text)).join('|');
        if (rwRefProjectCache.key === key) return rwRefProjectCache;
        let project = E.makeProject({ id: 'rw_reference_library', title: 'Report Writer references' });
        const skipped = [];
        refs.forEach(r => {
            try {
                project = E.upsertSource(project, { id: 'rwref_' + E.hashString(String(r.id || r.name)), title: r.name || 'Reference', content: rwMarkReferenceHeadings(r.text), type: 'text', importMethod: 'report-writer' });
            } catch (e) { skipped.push({ name: r.name || 'Reference', reason: e && e.message ? e.message : 'unreadable' }); }
        });
        rwRefProjectCache = { key, project, skipped };
        return rwRefProjectCache;
    };
    // Passages for one prompt, best first, within the character budget.
    // Returns { passages: [{id, title, heading, locatorLabel, content}], mode }:
    // mode 'retrieved' (Lumen ranked them), 'none' (no references or no match),
    // or 'truncated' (Lumen is not loaded: the old first-N-characters fallback,
    // which the caller must disclose).
    const rwReferencePassages = (referenceLibrary, query, budget = RW_REF_BUDGET_CHARS) => {
        const refs = (Array.isArray(referenceLibrary) ? referenceLibrary : []).filter(r => r && typeof r.text === 'string' && r.text.trim());
        if (!refs.length) return { passages: [], mode: 'none' };
        const E = typeof window !== 'undefined' ? window.LumenEvidence : null;
        const cache = E ? rwReferenceProject(refs) : null;
        if (!E || !cache) {
            const joined = refs.map(r => '--- ' + (r.name || 'Reference') + ' ---\n' + r.text).join('\n\n');
            return { passages: [{ id: 'ref:truncated', title: 'Reference library (first part only)', heading: null, locatorLabel: '', content: joined.slice(0, budget) }], mode: 'truncated', totalChars: joined.length };
        }
        const titleOf = (sourceId) => ((cache.project.sources || []).find(s => s.id === sourceId) || {}).title || 'Reference';
        // stem: plural/-ing forms meet in passages too; forAI: a source marked
        // not-for-AI never reaches the prompt. Both are ignored by older Lumen builds.
        const rows = E.retrieve(cache.project, rwExpandClinicalQuery(query), { limit: RW_REF_MAX_PASSAGES, stem: true, forAI: true });
        const passages = [];
        let used = 0;
        for (const row of rows) {
            const len = row.node.content.length;
            if (passages.length && used + len > budget) break;
            passages.push({ id: 'ref:' + row.node.id, title: titleOf(row.node.sourceId), heading: (row.node.locator && row.node.locator.heading) || null, locatorLabel: row.node.locatorLabel || '', content: row.node.content });
            used += len;
        }
        return { passages, mode: passages.length ? 'retrieved' : 'none', skipped: cache.skipped };
    };
    // How the passages appear in a prompt: each labelled with its citable id,
    // its reference and its heading, and a line telling the model what it was
    // (and was not) given.
    // `scrub` is applied to titles, headings and text, never to the ids, which
    // must reach the model intact to be citable.
    const rwReferencePromptBlock = (result, referenceCount, scrub = (x) => x) => {
        if (!result || !result.passages.length) return '';
        const lines = result.passages.map(p => `[${p.id}] ${scrub(p.title)}${p.heading ? ' — ' + scrub(p.heading) : ''}${p.locatorLabel ? ' (' + scrub(p.locatorLabel) + ')' : ''}:\n${scrub(p.content)}`);
        const note = result.mode === 'truncated'
            ? `(Only the first ${RW_REF_BUDGET_CHARS} of ${result.totalChars} characters of the references are included; passage retrieval was unavailable.)`
            : `(${result.passages.length} passage(s) chosen for this section from ${referenceCount} reference(s); other parts were not provided. Cite a passage by its [ref:...] id in USED_CHUNKS when you rely on it, and quote a regulation only from these passages.)`;
        return '\nREFERENCE PASSAGES ' + note + '\n' + lines.join('\n\n');
    };
    // Quotations in a draft must come from somewhere. A model puts plausible words
    // in quotation marks ("her mother reported that she 'never finishes her
    // homework'", a regulation "requires that ..."), and a fabricated quote in a
    // signed report is worse than a paraphrase. Each quote of six or more words is
    // looked up, case- and spacing-insensitively (Lumen's quote rule), in every
    // text the clinician supplied: background and observation notes, verified
    // facts and the reference library. An unmatched quote is an ADVISORY note:
    // the clinician may be quoting a source not entered here.
    const rwNormalizeForQuote = (s) => String(s || '').toLowerCase()
        .replace(/[‘’‛`]/g, "'").replace(/[–—]/g, '-')
        .replace(/[^\p{L}\p{N}'\- ]+/gu, ' ').replace(/\s+/g, ' ').trim();
    const rwUnsourcedQuotes = (draftText, corpora) => {
        const haystack = ' ' + (Array.isArray(corpora) ? corpora : []).map(rwNormalizeForQuote).join(' | ') + ' ';
        const notes = [];
        for (const m of String(draftText || '').matchAll(/["“]([^"“”\n]{12,600})["”]/g)) {
            const quote = m[1].trim();
            if (quote.split(/\s+/).length < 6) continue;
            const needle = rwNormalizeForQuote(quote);
            if (!needle || haystack.includes(needle)) continue;
            notes.push({
                kind: 'unsourced_quote', quote,
                detail: `The quotation "${quote.length > 120 ? quote.slice(0, 117) + '…' : quote}" does not appear in any background note, observation, verified fact or reference. Check it against its source, or paraphrase it.`,
                span: { start: m.index, end: m.index + m[0].length, text: quote },
            });
        }
        return notes;
    };
    // ─── The writing-style sample ───
    // It goes to the AI with every section, and it is a report about ANOTHER
    // student. The scrubber knows only this student's names, so the sample's
    // student, family and staff were sent as written, and the model could copy
    // its names, ages or scores into this report. Only its wording matters, so
    // before it is sent its proper nouns become [Name] and its numbers [#]. A
    // capitalised word counts as a proper noun unless it is report vocabulary
    // (instrument, subtest, label and section words), a common word the sample
    // also uses in lower case, or a title ("Mrs.").
    const RW_STYLE_COMMON = new Set(('the this that these those there then than she he they his her hers him them their theirs it its we our you your i '
        + 'a an and or but if in on at of to for from with by as is was were are be been has had have do does did not no nor so '
        + 'during based overall however additionally also although according both all each per when while after before since because '
        + 'results scores score testing test tests student students parent parents teacher teachers mother father guardian school district '
        + 'grade kindergarten english spanish mr mrs ms miss dr prof coach principal nurse name date age report evaluation reevaluation '
        + 'summary background recommendations recommendation observations observation history information reason referral interview '
        + 'january february march april may june july august september october november december monday tuesday wednesday thursday friday '
        + 'strengths weaknesses strength weakness difficulties difficulty skills skill areas area range index composite standard scaled percentile').split(/\s+/));
    let rwStyleVocabulary = null;
    const rwStyleVocab = () => {
        if (rwStyleVocabulary) return rwStyleVocabulary;
        const words = new Set();
        const add = (text) => String(text || '').toLowerCase().split(/[^a-z]+/).forEach(w => { if (w.length > 1) words.add(w); });
        Object.entries(ASSESSMENT_PRESETS).forEach(([name, preset]) => { add(name); (preset.subtests || []).forEach(add); });
        Object.values(RW_SCORE_SYSTEMS).forEach(sys => { add(sys.name); sys.bands.forEach(b => add(b[1])); });
        RW_CLINICAL_SYNONYMS.forEach(group => group.forEach(add));
        rwStyleVocabulary = words;
        return words;
    };
    const rwStyleSampleForAI = (sample, scrub = (x) => x) => {
        const text = scrub(String(sample || ''));
        const lower = new Set((text.match(/\b[a-z][a-z'-]*\b/g) || []));
        const vocab = rwStyleVocab();
        const names = new Set();
        const out = text.replace(/\b[A-Z][a-z]+(?:'[a-z]+)?\b/g, (word) => {
            const base = word.replace(/'[a-z]+$/, '');
            const w = base.toLowerCase();
            if (RW_STYLE_COMMON.has(w) || vocab.has(w) || lower.has(w)) return word;
            names.add(base);
            return '[Name]' + word.slice(base.length);
        }).replace(/\d+(?:[.,]\d+)*/g, '[#]');
        return { text: out, names: Array.from(names) };
    };

    // ─── Age and grade in the draft against Step 1 ───
    // A model can give the wrong age or grade (or take one from the style
    // sample). Only statements of the student's CURRENT age or grade are read:
    // "a 10-year-old", "a fifth grader", "is in the fifth grade". A sibling's
    // age and the past tense ("was a 2nd grader", "as a 3-year-old") are not.
    // The notes are advisory.
    const RW_GRADE_WORDS = ['kindergarten', 'first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth', 'eleventh', 'twelfth'];
    const rwGradeNumber = (raw) => {
        const t = String(raw || '').trim().toLowerCase().replace(/\s*grade$/, '');
        if (!t) return null;
        if (/^(?:k|kg|kinder|kindergarten)\b/.test(t)) return 0;
        const w = RW_GRADE_WORDS.indexOf(t);
        if (w >= 0) return w;
        const m = t.match(/\d{1,2}/);
        return m ? Number(m[0]) : null;
    };
    const rwIdentityNotes = (draftText, facts = {}) => {
        const text = String(draftText || '');
        const notes = [];
        const ageMatch = String(facts.age || '').match(/\d+(?:\.\d+)?/);
        const years = ageMatch ? Math.floor(Number(ageMatch[0])) : null;
        const grade = rwGradeNumber(facts.grade);
        const PAST_BEFORE = /\b(?:as|was|were|been|when|while)\s+(?:a|an|in)\s+(?:the\s+)?$/i;
        const OTHER_AFTER = /^[\s-]*(?:brothers?|sisters?|siblings?|cousins?|friends?|peers|classmates?|twins?|sons?|daughters?|children|students)\b/i;
        const seen = new Set();
        const note = (kind, key, detail, index, length) => {
            if (seen.has(kind + key)) return;
            seen.add(kind + key);
            notes.push({ kind, detail, span: { start: index, end: index + length, text: text.substring(Math.max(0, index - 30), Math.min(text.length, index + length + 30)).trim() } });
        };
        const current = (m) => !PAST_BEFORE.test(text.slice(Math.max(0, m.index - 30), m.index)) && !OTHER_AFTER.test(text.slice(m.index + m[0].length, m.index + m[0].length + 20));
        if (years != null) {
            for (const m of text.matchAll(/\b(\d{1,2})[- ]year[- ]old\b/gi)) {
                const n = Number(m[1]);
                if (n !== years && current(m)) note('age_mismatch', n, `The draft calls [Student] a ${n}-year-old; Step 1 records age ${facts.age}.`, m.index, m[0].length);
            }
        }
        if (grade != null) {
            const g = '(?:(\\d{1,2})(?:st|nd|rd|th)|(' + RW_GRADE_WORDS.slice(1).join('|') + '))';
            const res = [
                new RegExp('\\b' + g + '[- ]grade(?:r|[- ]student)\\b', 'gi'),
                new RegExp('\\b(?:is|currently)\\s+(?:in|attending|enrolled in)\\s+(?:the\\s+)?' + g + '\\s+grade\\b', 'gi'),
                /\b(?:is|currently)\s+(?:in|attending|enrolled in)\s+(kindergarten)\b|\b(kindergartner|kindergartener|kindergarten student)\b/gi,
            ];
            res.forEach((re, i) => {
                for (const m of text.matchAll(re)) {
                    const said = i === 2 ? 0 : (m[1] ? Number(m[1]) : RW_GRADE_WORDS.indexOf(String(m[2]).toLowerCase()));
                    if (said === grade || !current(m)) continue;
                    note('grade_mismatch', said, `The draft places [Student] in ${said === 0 ? 'kindergarten' : 'grade ' + said}; Step 1 records grade ${facts.grade}.`, m.index, m[0].length);
                }
            });
        }
        return notes;
    };

    // The report in the order the blueprint gives, enabled sections only. It used
    // to come out in the order sections were written, including sections since
    // disabled or removed from the blueprint.
    const rwOrderedSections = (reportSections, blueprint) => {
        const sections = reportSections || {};
        const plan = Array.isArray(blueprint) ? blueprint : [];
        if (!plan.length) return Object.entries(sections).filter(([, v]) => typeof v === 'string' && v.trim());
        return plan.filter(b => b && b.enabled !== false && typeof sections[b.name] === 'string' && sections[b.name].trim()).map(b => [b.name, sections[b.name]]);
    };
    // Redaction replaces names with role tokens and identifiers with [DATE],
    // [EMAIL]... before any AI call, and the AI writes from that text, so its
    // prose carries them ("[Mother] reported", "evaluated on [DATE]"). Only
    // [Student] is put back on export. Generation can also leave its citation
    // line or cited ids behind. Export lists every one and is blocked until
    // they are resolved.
    const RW_ROLE_TOKENS = ['Parent', 'Mother', 'Father', 'Guardian', 'Sibling', 'Teacher', 'Counselor', 'Clinician', 'Relative', 'Peer', 'Name'];
    const RW_IDENTIFIER_TOKENS = ['NAME', 'DATE', 'EMAIL', 'PHONE', 'ADDRESS', 'IDENTIFIER', 'SSN', '#'];
    const RW_MACHINE_LEFTOVER_RE = /\[(?:ref|case):[^\]\s]+\]|\[[a-z0-9]{10,}\]|\[Error generating[^\]]*\]|[*_`]*USED[_ ]CHUNKS[*_`]*\s*:[^\n]*/g;
    const rwPlaceholderRe = (roles) => new RegExp('\\[(?:' + Array.from(new Set([...RW_ROLE_TOKENS, ...(roles || [])])).map(rwEscapeRe).join('|')
        + '|' + RW_IDENTIFIER_TOKENS.map(rwEscapeRe).join('|') + ')\\]|' + RW_MACHINE_LEFTOVER_RE.source, 'g');
    const rwIsMachineLeftover = (token) => new RegExp('^(?:' + RW_MACHINE_LEFTOVER_RE.source + ')$').test(token);
    const rwLeftoverPlaceholders = (sections, people) => {
        const roles = (Array.isArray(people) ? people : []).map(x => String((x && x.role) || '').trim()).filter(Boolean);
        const re = rwPlaceholderRe(roles);
        const out = [];
        Object.entries(sections || {}).forEach(([section, text]) => {
            const counts = new Map();
            for (const m of String(text || '').matchAll(re)) {
                const token = /USED[_ ]CHUNKS/i.test(m[0]) ? 'USED_CHUNKS' : m[0];
                counts.set(token, (counts.get(token) || 0) + 1);
            }
            counts.forEach((count, token) => out.push({ section, token, count, machine: token === 'USED_CHUNKS' || rwIsMachineLeftover(token) }));
        });
        return out;
    };
    const rwStripMachineLeftovers = (text) => String(text || '').replace(RW_MACHINE_LEFTOVER_RE, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();

    // "References Consulted": every reference passage the report's sections cite
    // (sectionEvidenceMap ref ids), grouped by document, with its heading, its
    // lines and the sections that relied on it. Built from the citation trail,
    // never by the AI, so a reader can check a regulatory statement at its source.
    const rwReferencesConsulted = (sectionEvidenceMap) => {
        const docs = new Map();
        Object.entries(sectionEvidenceMap || {}).forEach(([section, ids]) => (Array.isArray(ids) ? ids : []).forEach(id => {
            const isCase = String(id).startsWith('case:');
            if (!isCase && !String(id).startsWith('ref:')) return;
            // Case records are listed by their REDACTED title, as indexed.
            const cache = isCase ? rwCaseProjectCache.project : rwRefProjectCache.project;
            const node = cache && (cache.evidenceNodes || []).find(n => n.id === String(id).slice(isCase ? 5 : 4));
            const source = node && (cache.sources || []).find(s => s.id === node.sourceId);
            const title = source ? (isCase ? 'Case record: ' + source.title : source.title)
                : (isCase ? 'Case record (no longer loaded)' : id === 'ref:truncated' ? 'Reference library (first part only)' : 'Reference passage (library not loaded)');
            if (!docs.has(title)) docs.set(title, new Map());
            const passages = docs.get(title);
            if (!passages.has(id)) passages.set(id, { heading: node && node.locator ? node.locator.heading || '' : '', where: node ? `lines ${node.locator.lineStart}–${node.locator.lineEnd}` : '', ordinal: node ? node.ordinal : 1e9, sections: [] });
            const entry = passages.get(id);
            if (!entry.sections.includes(section)) entry.sections.push(section);
        }));
        return Array.from(docs, ([title, passages]) => ({ title, passages: Array.from(passages.values()).sort((a, b) => a.ordinal - b.ordinal) }));
    };
    const RW_REFERENCES_NOTE = 'Passages from the examiner\'s reference library and the student\'s case records that the report\'s sections cite. The report may paraphrase them; check any regulatory or historical statement against the passage.';
    const rwReferencesConsultedHtml = (list) => {
        if (!Array.isArray(list) || !list.length) return '';
        return '<section aria-labelledby="rw-print-refs"><h2 id="rw-print-refs">References Consulted</h2><p class="score-note">' + escapeHtml(RW_REFERENCES_NOTE) + '</p>'
            + list.map(doc => '<h3 class="ref-title">' + escapeHtml(doc.title) + '</h3><ul class="ref-list">'
                + doc.passages.map(p => '<li>' + escapeHtml(p.heading || 'Passage') + (p.where ? ' (' + escapeHtml(p.where) + ')' : '') + ' — cited in ' + escapeHtml(p.sections.join(', ')) + '</li>').join('')
                + '</ul>').join('') + '</section>';
    };
    const rwReferencesConsultedText = (list) => {
        if (!Array.isArray(list) || !list.length) return '';
        const lines = ['REFERENCES CONSULTED', '', RW_REFERENCES_NOTE, ''];
        list.forEach(doc => {
            lines.push(doc.title);
            doc.passages.forEach(p => lines.push(`  ${p.heading || 'Passage'}${p.where ? ' (' + p.where + ')' : ''} — cited in ${p.sections.join(', ')}`));
            lines.push('');
        });
        return lines.join('\n').trim();
    };
    // Chip label for a cited passage id, from the cached reference project.
    const rwReferenceLabel = (chunkId) => {
        const isCase = String(chunkId || '').startsWith('case:');
        const nodeId = String(chunkId || '').replace(/^(?:ref|case):/, '');
        const cache = isCase ? rwCaseProjectCache.project : rwRefProjectCache.project;
        const node = cache && (cache.evidenceNodes || []).find(n => n.id === nodeId);
        if (!node) return isCase ? 'Case record' : chunkId === 'ref:truncated' ? 'References (first part)' : 'Reference passage';
        const source = (cache.sources || []).find(s => s.id === node.sourceId);
        return (source ? source.title : isCase ? 'Case record' : 'Reference') + (node.locator && node.locator.heading ? ': ' + node.locator.heading : '');
    };
    // ─── Case documents: this student's prior evaluations and IEPs ───
    // They name the student, the family and staff, so three rules hold:
    // (1) they live in component memory for this session only, never in a saved
    //     report, the draft store or an export (validateReportPayload drops them);
    // (2) the index the AI's passages come from is built from REDACTED text, with
    //     the scrubber every prompt uses, and rebuilt when the names change;
    // (3) no document reaches a prompt until the clinician turns it on, and none
    //     can be while no student name is set to redact.
    // Without Lumen no case text is sent at all: unlike the reference library
    // there is no first-N-characters fallback.
    const RW_CASE_BUDGET_CHARS = 3000;
    const RW_CASE_MAX_PASSAGES = 4;
    let rwCaseProjectCache = { key: null, project: null };
    const rwClearCaseIndex = () => { rwCaseProjectCache = { key: null, project: null }; };
    const rwCaseProject = (aiDocs, scrub) => {
        const E = typeof window !== 'undefined' ? window.LumenEvidence : null;
        const docs = (Array.isArray(aiDocs) ? aiDocs : []).filter(d => d && typeof d.text === 'string' && d.text.trim());
        if (!E || !docs.length) return null;
        const clean = docs.map(d => ({ id: String(d.id), title: scrub(d.title || 'Case document'), text: scrub(d.text) }));
        const key = clean.map(d => d.id + ':' + E.hashString(d.title + '\n' + d.text)).join('|');
        if (rwCaseProjectCache.key === key) return rwCaseProjectCache.project;
        let project = E.makeProject({ id: 'rw_case_records', title: 'Report Writer case records' });
        clean.forEach(d => {
            try { project = E.upsertSource(project, { id: 'rwcase_' + E.hashString(d.id), title: d.title, content: rwMarkReferenceHeadings(d.text), type: 'text', importMethod: 'report-writer-case' }); }
            catch (e) { /* an unreadable document is left out */ }
        });
        rwCaseProjectCache = { key, project };
        return project;
    };
    const rwCasePassages = (aiDocs, query, scrub, budget = RW_CASE_BUDGET_CHARS) => {
        const E = typeof window !== 'undefined' ? window.LumenEvidence : null;
        const project = E ? rwCaseProject(aiDocs, scrub) : null;
        if (!project) return { passages: [], mode: 'none' };
        const titleOf = (sourceId) => ((project.sources || []).find(x => x.id === sourceId) || {}).title || 'Case document';
        const rows = E.retrieve(project, rwExpandClinicalQuery(query), { limit: RW_CASE_MAX_PASSAGES, stem: true, forAI: true });
        const passages = [];
        let used = 0;
        for (const row of rows) {
            const len = row.node.content.length;
            if (passages.length && used + len > budget) break;
            passages.push({ id: 'case:' + row.node.id, title: titleOf(row.node.sourceId), heading: (row.node.locator && row.node.locator.heading) || null, locatorLabel: row.node.locatorLabel || '', content: row.node.content });
            used += len;
        }
        return { passages, mode: passages.length ? 'retrieved' : 'none' };
    };
    // The passages were redacted when indexed; their ids reach the model intact.
    const rwCasePromptBlock = (result) => {
        if (!result || !result.passages.length) return '';
        const lines = result.passages.map(p => `[${p.id}] ${p.title}${p.heading ? ' — ' + p.heading : ''}${p.locatorLabel ? ' (' + p.locatorLabel + ')' : ''}:\n${p.content}`);
        return `\nCASE RECORD PASSAGES (${result.passages.length} passage(s) from this student's prior evaluations and IEPs, identifiers redacted)\n`
            + 'These are PAST records. Attribute each statement to its record and year ("A 2023 evaluation reported..."). Never present a score from a record as a current result, and give any such score exactly as the record does. Cite a passage by its [case:...] id in USED_CHUNKS when you rely on it.\n'
            + lines.join('\n\n');
    };
    // Load Lumen's evidence core when references exist. Resolves true once
    // window.LumenEvidence is present; false means the caller uses (and must
    // disclose) the truncated fallback.
    const rwEnsureLumenEvidence = async (timeoutMs = 8000) => {
        if (typeof window === 'undefined') return false;
        if (window.LumenEvidence) return true;
        try {
            const own = window.AlloOwnSources || (window.AlloModules && window.AlloModules.OwnSources);
            if (own && typeof own.ensureLumen === 'function') { await own.ensureLumen(timeoutMs); return !!window.LumenEvidence; }
            if (typeof window.__alloEnsureStemPluginLoaded === 'function') window.__alloEnsureStemPluginLoaded('stem_lab/stem_lumen_evidence.js');
        } catch (e) { /* fall through to the wait */ }
        const deadline = Date.now() + timeoutMs;
        while (!window.LumenEvidence && Date.now() < deadline) await new Promise(r => setTimeout(r, 120));
        return !!window.LumenEvidence;
    };
    // Lumen's document reader (PDF text layer by page, Word, text), used to add a
    // reference from a file instead of pasting a 40-page regulation.
    const rwEnsureLumenDocuments = async (timeoutMs = 8000) => {
        if (typeof window === 'undefined') return false;
        if (window.LumenDocuments && window.LumenEvidence) return true;
        try {
            const own = window.AlloOwnSources || (window.AlloModules && window.AlloModules.OwnSources);
            if (own && typeof own.ensureLumen === 'function') await own.ensureLumen(timeoutMs);
            else if (typeof window.__alloEnsureStemPluginLoaded === 'function') {
                window.__alloEnsureStemPluginLoaded('stem_lab/stem_lumen_evidence.js');
                window.__alloEnsureStemPluginLoaded('stem_lab/stem_lumen_documents.js');
            }
        } catch (e) { /* fall through to the wait */ }
        const deadline = Date.now() + timeoutMs;
        while (!(window.LumenDocuments && window.LumenEvidence) && Date.now() < deadline) await new Promise(r => setTimeout(r, 120));
        return !!(window.LumenDocuments && window.LumenEvidence);
    };
    const rwScoreTableText = (scoreEntries) => {
        const groups = rwScoreTableGroups(scoreEntries);
        if (!groups.size) return '';
        const lines = ['SUMMARY OF SCORES', ''];
        for (const [assessment, rows] of groups) {
            lines.push(rwScoreTableCaption(assessment, rows));
            rows.forEach(r => lines.push(`  ${r.scale}: ${r.score} ${r.type}; percentile ${r.percentile}; CI ${r.ci}; ${r.classification}${r.prior ? '; prior ' + r.prior : ''}`));
            lines.push('');
        }
        lines.push(RW_SCORE_TABLE_NOTE + ([...groups.values()].some(rows => rows.some(r => r.prior)) ? ' ' + RW_SCORE_TABLE_PRIOR_NOTE : ''));
        return lines.join('\n');
    };
    // Draft phrases the verifier reads as a classification claim, longest first.
    // Single ordinary words ("low", "severe", "normal") only count as "<word>
    // range". Intensified informal phrases map to '' (recognised, never checked)
    // so "significantly below average" is not misread as a band name.
    const RW_AMBIGUOUS_LABELS = new Set(['Low', 'High', 'Elevated', 'Severe', 'Moderate', 'Mild', 'Normal']);
    const RW_LABEL_PHRASES = (() => {
        const map = {};
        Object.values(RW_SCORE_SYSTEMS).forEach(sys => sys.bands.forEach(([, label]) => {
            const lower = label.toLowerCase();
            if (RW_AMBIGUOUS_LABELS.has(label)) { map[lower + ' range'] = label; return; }
            map[lower] = label;
            map[lower.replace(/-/g, ' ')] = label;
        }));
        Object.assign(map, { 'high-average': 'High Average', 'low-average': 'Low Average', 'clinical range': 'Clinically Significant',
            'within normal limits': 'Normal', 'wnl': 'Normal', 'marginal': 'Below Average', 'marginal range': 'Below Average' });
        ['significantly', 'far'].forEach(w => { map[w + ' below average'] = ''; map[w + ' above average'] = ''; });
        return Object.entries(map).sort((a, b) => b[0].length - a[0].length);
    })();
    // Labels only an ownOnly system uses ("Unlikely", "Probable"): ordinary words
    // everywhere except a sentence about that instrument.
    const RW_OWN_ONLY_LABELS = (() => {
        const shared = new Set(), own = new Map();
        Object.entries(RW_SCORE_SYSTEMS).forEach(([k, sys]) => sys.bands.forEach(([, label]) => {
            if (sys.ownOnly) own.set(label, k); else shared.add(label);
        }));
        return new Map([...own].filter(([label]) => !shared.has(label)));
    })();
    // Words made only of plain comparisons. Any manual may use them loosely, so
    // one that is not on this score's scale is left unchecked; a specific band
    // name from another scale ("High Average" for a BASC-3 T-score) is not.
    const RW_PLAIN_LABELS = new Set(['Average', 'Above Average', 'Below Average', 'Low', 'High', 'Very Low', 'Very High',
        'Normal', 'Well-Above Average', 'Well-Below Average']);
    // Is `citedLabel` a correct name for this score? 'terminology' = another
    // system uses that word for this score at the SAME level of concern (e.g. the
    // WAIS-IV-era "Borderline" for a WISC-V 75); it informs, it never blocks
    // export. A word that softens the concern is a mismatch: Conners' "High
    // Average" for a BASC-3 T of 63 would hide that the BASC-3 calls it At-Risk.
    const rwConcernTier = (color) => ({ red: 3, orange: 2, amber: 1 })[color] || 0;
    const rwCheckClassification = (entry, citedLabel) => {
        const score = Number(entry.score);
        const scheme = entry.descriptorScale;
        const own = rwOwnSystem(entry.scoreType, entry.assessment, entry.subtest, scheme);
        if (!citedLabel || !Number.isFinite(score)) return { status: 'unchecked' };
        const scale = rwScoreScale(entry.scoreType, entry.assessment, entry.subtest, scheme);
        const counts = (k) => !RW_SCORE_SYSTEMS[k].ownOnly || k === own;
        const usesLabel = Object.keys(RW_SCORE_SYSTEMS).filter(k => counts(k) && RW_SCORE_SYSTEMS[k].scale === scale && rwLabelRange(k, citedLabel));
        const expected = rwClassifyScore(score, entry.scoreType, entry.assessment, entry.subtest, scheme);
        if (usesLabel.length === 0) {
            const elsewhere = RW_SCORE_SYSTEMS[own] && !RW_PLAIN_LABELS.has(citedLabel)
                && Object.keys(RW_SCORE_SYSTEMS).some(k => counts(k) && rwLabelRange(k, citedLabel));
            return elsewhere ? { status: 'mismatch', expected } : { status: 'unchecked' };
        }
        const covering = usesLabel.filter(k => rwBand(k, score).label === citedLabel);
        if (!RW_SCORE_SYSTEMS[own]) return covering.length > 0 ? { status: 'ok', expected } : { status: 'mismatch', expected };
        if (expected.label === citedLabel) return { status: 'ok', expected };
        const ownRange = rwLabelRange(own, citedLabel);
        if (ownRange) return { status: 'mismatch', expected, citedRange: ownRange };
        const sameConcern = covering.filter(k => rwConcernTier(rwBand(k, score).color) === rwConcernTier(expected.color));
        if (sameConcern.length > 0) return { status: 'terminology', expected, alsoUsedBy: sameConcern.map(k => RW_SCORE_SYSTEMS[k].name) };
        return { status: 'mismatch', expected };
    };
    // For WIAT-4 and KTEA-3: the other descriptor scale's name when IT gives this
    // score the cited label, so a mismatch can point at the Step 4 setting.
    const rwOtherDescriptorScale = (entry, citedLabel) => {
        const d = RW_DESCRIPTOR_SCALES[entry.assessment];
        const current = rwOwnSystem(entry.scoreType, entry.assessment, entry.subtest, entry.descriptorScale);
        if (!d || !RW_SCORE_SYSTEMS[current] || !Number.isFinite(Number(entry.score))) return null;
        const other = d.options.map(o => rwSystemKeyFor(entry.assessment, entry.subtest, o))
            .find(k => k !== current && rwBand(k, Number(entry.score)).label === citedLabel);
        return other ? RW_SCORE_SYSTEMS[other].name : null;
    };

    // ─── Reading scores from a pasted score report ───
    // Retyping a score report is where transcription errors enter. Text copied
    // from the report (or read from its file) is parsed here, on the device, and
    // nothing is added until the clinician ticks each row. No layout is assumed:
    // the numbers on a line are checked against each other. A composite table
    // also prints the sum of scaled scores; the score is the number that lies
    // inside its own confidence interval and agrees with the percentile after it.
    const RW_PASTE_CI_LEVELS = [68, 85, 90, 95, 99];
    // How far a printed percentile may sit from the normal-curve value of its
    // score. Measured on publisher sample reports and manuals (2026-09-23,
    // validation log 3e): normalized batteries (WISC-V, WIAT-4, KTEA-3, DAS-II,
    // CELF-5, Vineland-3, BOT-2) never exceeded 0.54; WJ IV rounds the score
    // before printing, up to 1.49; KABC-II was not verified. BASC-3, BRIEF-2,
    // Conners 4 and GARS-3 print the percentile of the raw-score distribution
    // (gaps up to 17 points, mid-range included), so for them only the direction
    // is checked. SRS-2 prints no percentile at all.
    const RW_PCT_TOLERANCE = { 'WJ-IV COG': 2, 'WJ-IV ACH': 2, 'KABC-II': 2 };
    const RW_LINEAR_PCT = new Set(['BASC-3 (Parent)', 'BASC-3 (Teacher)', 'BRIEF-2', 'Conners-4', 'GARS-3']);
    const RW_NO_PCT = new Set(['SRS-2']);
    const rwPercentileFits = (score, pct, scale, assessment) => {
        const stats = RW_SCALE_STATS[scale];
        if (!stats || !pct || !Number.isFinite(pct.a)) return false;
        if (RW_LINEAR_PCT.has(assessment)) {
            // Direction only: a score a standard deviation above the mean sits
            // above the 50th percentile, one below it below.
            if (score >= stats[0] + stats[1]) return pct.a > 50 || pct.sign === '>';
            if (score <= stats[0] - stats[1]) return pct.a < 50 || pct.sign === '<';
            return true;
        }
        const normal = rwNormalPercentile(score, stats);
        const tolerance = RW_PCT_TOLERANCE[assessment] || 1;
        // "<0.1", "<1", ">99", ">99.9" are bounds, compared as such.
        if (pct.sign === '<') return normal < pct.a + tolerance;
        if (pct.sign === '>') return normal > pct.a - tolerance;
        return Math.abs(pct.a - normal) <= tolerance;
    };
    const rwReportLabel = (text) => {
        const t = String(text || '').toLowerCase().replace(/[^a-z\s-]/g, ' ').replace(/\s+/g, ' ').trim();
        if (!t) return null;
        const find = (k) => { const hit = RW_LABEL_PHRASES.find(([phrase]) => phrase === k); return hit && hit[1] ? hit[1] : null; };
        return find(t) || find(t + ' range') || find(t.replace(/ range$/, '')) || null;
    };
    const rwEscapeRe = (x) => String(x).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Issues that leave a row unticked; the others are notes.
    const RW_PASTE_HOLD = ['unrecognised', 'no_evidence', 'score_outside_interval', 'already_entered', 'duplicate', 'entry_error'];
    const rwParseScoreReport = (text, assessment, opts = {}) => {
        const preset = ASSESSMENT_PRESETS[assessment] || { subtests: [], scoreType: 'standard' };
        const baseType = preset.scoreType || 'standard';
        const api = typeof window !== 'undefined' ? window.AlloPsycheck : null;
        const variants = opts.variants || (api && api._subtestVariants ? api._subtestVariants(assessment) : preset.subtests.map(x => [x.toLowerCase(), x]));
        const names = variants.map(([v, canonical]) => [new RegExp('(?<![a-z0-9])' + rwEscapeRe(v).replace(/\s+/g, '[\\s-]+') + '(?![a-z0-9])', 'i'), canonical]);
        const src = String(text || '');
        const level = src.match(/(\d{2})\s*%\s*(?:confidence|CI\b|band)/i) || src.match(/confidence interval\s*\(?\s*(\d{2})\s*%/i);
        const ciLevel = level && RW_PASTE_CI_LEVELS.includes(Number(level[1])) ? Number(level[1]) : null;
        const existing = opts.existing instanceof Set ? opts.existing : new Set();
        const rows = [];
        const seen = new Set();
        src.replace(/\r/g, '').split('\n').forEach(raw => {
            const line = raw.replace(/[–—]/g, '-').replace(/\s+/g, ' ').trim();
            if (!line || !/\d/.test(line)) return;
            // The subtest: the earliest (then longest) of this instrument's names.
            let hit = null;
            for (const [re, canonical] of names) {
                const m = re.exec(line);
                if (m && (!hit || m.index < hit.index || (m.index === hit.index && m[0].length > hit.len))) hit = { index: m.index, len: m[0].length, canonical };
            }
            const known = !!hit;
            let subtest, rest;
            if (hit) { subtest = hit.canonical; rest = line.slice(hit.index + hit.len); }
            else {
                // Words then numbers may be a subtest the presets do not list
                // ("Block Design"): offered unticked, and only with evidence below.
                const m = line.match(/^([A-Za-z][A-Za-z&'\/ -]{2,40}?)\s+(?:[A-Z]{1,5}\s+)?(?=[<>]?\d)/);
                if (!m) return;
                subtest = m[1].trim();
                rest = line.slice(m[0].length);
            }
            // Not scores: a "± 5" band (BOT-2) and a relative proficiency index
            // like "82/90" (WJ IV). Intervals may be written "88-103" or "1 to 3";
            // a percentile may be an ordinal ("92nd", Conners 4).
            rest = rest.replace(/±\s*\d+(?:\.\d+)?/g, ' ').replace(/\b\d{1,3}\/\d{1,3}\b/g, ' ');
            const tokens = [];
            for (const m of rest.matchAll(/(?<![A-Za-z\d.])([<>])?\s?(\d{1,3}(?:\.\d+)?)(st|nd|rd|th)?(?:\s?(?:-|to)\s?(\d{1,3}(?:\.\d+)?))?(?![A-Za-z\d])/g)) {
                tokens.push({ sign: m[1] || '', a: Number(m[2]), ordinal: !!m[3], b: m[4] != null ? Number(m[4]) : null, end: m.index + m[0].length });
            }
            if (!tokens.length) return;
            const ownScale = rwScoreScale(baseType, assessment, subtest);
            const scales = known ? [ownScale] : Array.from(new Set([ownScale, 'ss10']));
            const asPct = (u) => (u && u.b == null && u.a > 0 && u.a < 100 ? u : null);
            let best = null, first = null;
            scales.forEach(scale => {
                const [lo, hi] = RW_SCALE_LIMITS[scale].hard;
                tokens.forEach((t, i) => {
                    if (t.b != null || t.sign || t.ordinal || !Number.isInteger(t.a) || t.a < lo || t.a > hi) return;
                    // The score's own interval follows it; a percentile follows it
                    // (or, in some WJ IV layouts, comes just before it).
                    const ci = tokens.slice(i + 1).find(u => u.b != null && u.a >= lo && u.b <= hi && u.a < u.b) || null;
                    const after = asPct(tokens.slice(i + 1).find(u => u.b == null));
                    const before = asPct(tokens.slice(0, i).reverse().find(u => u.b == null));
                    const fitsAfter = !!after && rwPercentileFits(t.a, after, scale, assessment);
                    const fitsBefore = !fitsAfter && !!before && rwPercentileFits(t.a, before, scale, assessment);
                    const inCI = !!ci && t.a >= ci.a && t.a <= ci.b;
                    // A percentile right after it that does not fit argues against it.
                    const contradicted = !!after && !fitsAfter && !fitsBefore;
                    const weight = (inCI ? 4 : 0) + (fitsAfter ? 3 : fitsBefore ? 2 : 0) - (contradicted ? 3 : 0) + (scale === ownScale ? 0.5 : 0) - i * 0.01;
                    const found = { weight, scale, score: t.a, pct: fitsAfter ? after : fitsBefore ? before : after, ci, inCI, fits: fitsAfter || fitsBefore, index: i };
                    // Only a number with evidence competes; with none anywhere, the
                    // first plausible number is shown, unticked.
                    if (inCI || found.fits) { if (!best || weight > best.weight) best = found; }
                    else if (!first && scale === ownScale) first = found;
                });
            });
            if (!best) best = first;
            // SRS-2 reports print raw and T scores only: with nothing to check
            // against, the score is the last plausible number on the line.
            let byPosition = false;
            if (best && !best.inCI && !best.fits && known && RW_NO_PCT.has(assessment)) {
                const [slo, shi] = RW_SCALE_LIMITS[ownScale].soft;
                const last = tokens.map((t, i) => ({ t, i })).reverse().find(({ t }) => t.b == null && !t.sign && !t.ordinal && Number.isInteger(t.a) && t.a >= slo && t.a <= shi);
                if (last) { best = { weight: 0, scale: ownScale, score: last.t.a, pct: null, ci: null, inCI: false, fits: false, index: last.i }; byPosition = true; }
            }
            if (!best || (!known && !best.inCI && !best.fits)) return;
            const scoreType = best.scale === 'ss10' ? 'scaled' : baseType;
            const key = subtest.toLowerCase();
            const labelText = rest.slice(tokens[tokens.length - 1].end).replace(/^[\s*|,;:)]+|[\s*|,;:(]+$/g, '');
            const issues = [];
            let percentile = best.pct ? best.pct.a : null;
            if (!known) issues.push({ code: 'unrecognised' });
            // Evidence that the number is this subtest's score: it lies in the
            // line's interval or agrees with its percentile. Prose has neither.
            if (byPosition) issues.push({ code: 'no_percentile_printed' });
            else if (!best.inCI && !best.fits) issues.push({ code: 'no_evidence' });
            if (best.ci && !best.inCI) issues.push({ code: 'score_outside_interval' });
            if (best.pct && !best.fits) { issues.push({ code: 'percentile_mismatch', pct: best.pct.a }); percentile = null; }
            else if (best.pct && best.pct.sign) issues.push({ code: 'percentile_bound', sign: best.pct.sign, value: best.pct.a });
            if (percentile != null && (percentile < 0.1 || percentile > 99.9)) percentile = null;
            const problem = rwScoreEntryProblem(best.score, scoreType, assessment, subtest);
            if (problem) issues.push({ code: 'entry_' + problem.level, message: problem.message });
            if (existing.has(key)) issues.push({ code: 'already_entered' });
            if (seen.has(key)) issues.push({ code: 'duplicate' });
            seen.add(key);
            rows.push({ subtest, known, scoreType, score: best.score, percentile,
                ciLow: best.ci && best.inCI ? best.ci.a : null, ciHigh: best.ci && best.inCI ? best.ci.b : null,
                reportLabelText: labelText.slice(0, 40), reportLabel: rwReportLabel(labelText), issues,
                include: !issues.some(x => RW_PASTE_HOLD.includes(x.code)) });
        });
        // WIAT-4 / KTEA-3: which descriptor scale the report's own labels fit.
        let descriptorScale = null;
        const d = RW_DESCRIPTOR_SCALES[assessment];
        const labelled = rows.filter(r => r.reportLabel && r.scoreType !== 'scaled');
        if (d && labelled.length) {
            const fits = d.options.filter(o => labelled.every(r => rwClassifyScore(r.score, r.scoreType, assessment, r.subtest, o).label === r.reportLabel));
            if (fits.length === 1) descriptorScale = fits[0];
        }
        const scheme = descriptorScale || opts.descriptorScale;
        rows.forEach(r => {
            if (!r.reportLabel || r.scoreType === 'scaled') return;
            const ours = rwClassifyScore(r.score, r.scoreType, assessment, r.subtest, scheme).label;
            if (ours !== r.reportLabel) r.issues.push({ code: 'label_differs', report: r.reportLabel, ours });
        });
        return { rows, ciLevel, descriptorScale };
    };

    // Instruments and subtests the clinician can pick. Shared with the psycheck
    // verifier below, which must be able to recognise every one of them.
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
        'GARS-3': { subtests: ['Autism Index'], scoreType: 'standard', mean: 100, sd: 15 },
        'BOT-2': { subtests: ['Total Motor Composite', 'Fine Manual Control', 'Manual Coordination', 'Body Coordination', 'Strength and Agility'], scoreType: 'standard', mean: 50, sd: 10 },
        'Custom Assessment': { subtests: [], scoreType: 'standard', mean: 100, sd: 15 },
    };

    // Architecture B: inline JS port of the deterministic psycheck verifier.
    // It began as a copy of web/psycheck.html in the separate psycheck repo, but
    // AlloFlow's copy has since diverged (score-type normalisation, the shared
    // classification table above, and AlloFlow-only helpers after the IIFE).
    // Do NOT run psycheck's tools/sync_alloflow.py against this file: it would
    // restore the old single-vocabulary bands and delete those helpers.
    // FERPA: zero network calls, zero persistence; the result is consumed
    // by the existing render-only discrepancyReport useState.
    // ─── PSYCHECK-INLINE-BEGIN ─── (maintained here; see note above)
// Inline JS port of the deterministic verifier from
// https://github.com/.../psycheck (psycheck/web/psycheck.html).
//
// FERPA INVARIANT: this port runs ENTIRELY in the browser. No
// network calls. No persistence. The result is consumed by the
// existing discrepancyReport useState (Architecture C) which is
// already audited as render-only.
if (typeof window !== 'undefined' && !window.AlloPsycheck) {
  window.AlloPsycheck = (function () {
    'use strict';

// ════════════════════════════════════════════════════════════════════════
// LEXICON DATA — assessment and subtest aliases. Score bands and the
// classification vocabulary are NOT here: they live in RW_SCORE_SYSTEMS above,
// shared with the display, so the verifier and the UI cannot disagree.
// ════════════════════════════════════════════════════════════════════════

// ─── LEXICON-SYNC-BEGIN ─── (managed by tools/sync_lexicon.py)

const ASSESSMENT_ALIASES = {
  "wisc-v": "WISC-V",
  "wisc v": "WISC-V",
  "wisc-5": "WISC-V",
  "wisc 5": "WISC-V",
  "wisc5": "WISC-V",
  "wechsler intelligence scale for children, 5th ed": "WISC-V",
  "wechsler intelligence scale for children, 5th edition": "WISC-V",
  "wechsler intelligence scale for children-fifth edition": "WISC-V",
  "wechsler intelligence scale for children fifth edition": "WISC-V",
  "wechsler intelligence scale for children-v": "WISC-V",
  "wisc": "WISC-V",
  "wiat-4": "WIAT-4",
  "wiat 4": "WIAT-4",
  "wiat-iv": "WIAT-4",
  "wiat iv": "WIAT-4",
  "wechsler individual achievement test, 4th ed": "WIAT-4",
  "wechsler individual achievement test-fourth edition": "WIAT-4",
  "wechsler individual achievement test fourth edition": "WIAT-4",
  "wiat": "WIAT-4",
  "basc-3 (parent)": "BASC-3 (Parent)",
  "basc-3 parent": "BASC-3 (Parent)",
  "basc-3 (teacher)": "BASC-3 (Teacher)",
  "basc-3 teacher": "BASC-3 (Teacher)",
  "basc 3 parent": "BASC-3 (Parent)",
  "basc 3 teacher": "BASC-3 (Teacher)",
  "behavior assessment system for children, 3rd ed (parent)": "BASC-3 (Parent)",
  "behavior assessment system for children, 3rd ed (teacher)": "BASC-3 (Teacher)",
  "basc-3": "BASC-3 (Teacher)",
  "vineland-3": "Vineland-3",
  "vineland 3": "Vineland-3",
  "vineland-iii": "Vineland-3",
  "vineland iii": "Vineland-3",
  "vineland adaptive behavior scales, 3rd ed": "Vineland-3",
  "vineland": "Vineland-3",
  "brief-2": "BRIEF-2",
  "brief 2": "BRIEF-2",
  "brief2": "BRIEF-2",
  "behavior rating inventory of executive function, 2nd ed": "BRIEF-2",
  "brief": "BRIEF-2",
  "conners-4": "Conners-4",
  "conners 4": "Conners-4",
  "conners-iv": "Conners-4",
  "conners iv": "Conners-4",
  "conners": "Conners-4",
  "wj-iv cog": "WJ-IV COG",
  "wj iv cog": "WJ-IV COG",
  "wj-iv cognitive": "WJ-IV COG",
  "woodcock-johnson iv tests of cognitive abilities": "WJ-IV COG",
  "wj-iv ach": "WJ-IV ACH",
  "wj iv ach": "WJ-IV ACH",
  "wj-iv achievement": "WJ-IV ACH",
  "woodcock-johnson iv tests of achievement": "WJ-IV ACH",
  "kabc-ii": "KABC-II",
  "kabc 2": "KABC-II",
  "kaufman assessment battery for children, 2nd ed": "KABC-II",
  "das-ii": "DAS-II",
  "das 2": "DAS-II",
  "differential ability scales, 2nd ed": "DAS-II",
  "celf-5": "CELF-5",
  "celf 5": "CELF-5",
  "clinical evaluation of language fundamentals, 5th ed": "CELF-5",
  "ktea-3": "KTEA-3",
  "ktea 3": "KTEA-3",
  "kaufman test of educational achievement, 3rd ed": "KTEA-3",
  "srs-2": "SRS-2",
  "srs 2": "SRS-2",
  "social responsiveness scale, 2nd ed": "SRS-2",
  "gars-3": "GARS-3",
  "gars 3": "GARS-3",
  "gilliam autism rating scale, 3rd ed": "GARS-3",
  "bot-2": "BOT-2",
  "bot 2": "BOT-2",
  "bruininks-oseretsky test of motor proficiency, 2nd ed": "BOT-2"
};

const SUBTEST_ALIASES = {
  "WISC-V": {
    "full scale iq": "Full Scale IQ",
    "fsiq": "Full Scale IQ",
    "full scale": "Full Scale IQ",
    "full scale intelligence quotient": "Full Scale IQ",
    "verbal comprehension": "Verbal Comprehension",
    "verbal comprehension index": "Verbal Comprehension",
    "vci": "Verbal Comprehension",
    "vc index": "Verbal Comprehension",
    "visual spatial": "Visual Spatial",
    "visual spatial index": "Visual Spatial",
    "vsi": "Visual Spatial",
    "fluid reasoning": "Fluid Reasoning",
    "fluid reasoning index": "Fluid Reasoning",
    "fri": "Fluid Reasoning",
    "working memory": "Working Memory",
    "working memory index": "Working Memory",
    "wmi": "Working Memory",
    "processing speed": "Processing Speed",
    "processing speed index": "Processing Speed",
    "psi": "Processing Speed"
  },
  "WIAT-4": {
    "total achievement": "Total Achievement",
    "reading composite": "Reading Composite",
    "math composite": "Math Composite",
    "written language": "Written Language",
    "written language composite": "Written Language",
    "word reading": "Word Reading",
    "spelling": "Spelling",
    "numerical operations": "Numerical Operations",
    "math problem solving": "Math Problem Solving"
  },
  "BASC-3 (Parent)": {
    "externalizing": "Externalizing",
    "externalizing problems": "Externalizing",
    "internalizing": "Internalizing",
    "internalizing problems": "Internalizing",
    "behavioral symptoms index": "Behavioral Symptoms Index",
    "bsi": "Behavioral Symptoms Index",
    "adaptive skills": "Adaptive Skills",
    "hyperactivity": "Hyperactivity",
    "aggression": "Aggression",
    "anxiety": "Anxiety",
    "depression": "Depression",
    "attention problems": "Attention Problems",
    "social skills": "Social Skills",
    "leadership": "Leadership"
  },
  "BASC-3 (Teacher)": {
    "externalizing": "Externalizing",
    "externalizing problems": "Externalizing",
    "internalizing": "Internalizing",
    "internalizing problems": "Internalizing",
    "behavioral symptoms index": "Behavioral Symptoms Index",
    "bsi": "Behavioral Symptoms Index",
    "adaptive skills": "Adaptive Skills",
    "hyperactivity": "Hyperactivity",
    "aggression": "Aggression",
    "anxiety": "Anxiety",
    "depression": "Depression",
    "attention problems": "Attention Problems",
    "learning problems": "Learning Problems",
    "school problems": "School Problems"
  },
  "Vineland-3": {
    "adaptive behavior composite": "Adaptive Behavior Composite",
    "abc": "Adaptive Behavior Composite",
    "communication": "Communication",
    "daily living skills": "Daily Living Skills",
    "dls": "Daily Living Skills",
    "socialization": "Socialization",
    "motor skills": "Motor Skills"
  },
  "BRIEF-2": {
    "global executive composite": "Global Executive Composite",
    "gec": "Global Executive Composite",
    "behavioral regulation index": "Behavioral Regulation Index",
    "bri": "Behavioral Regulation Index",
    "emotion regulation index": "Emotion Regulation Index",
    "eri": "Emotion Regulation Index",
    "cognitive regulation index": "Cognitive Regulation Index",
    "cri": "Cognitive Regulation Index",
    "inhibit": "Inhibit",
    "shift": "Shift",
    "emotional control": "Emotional Control",
    "working memory": "Working Memory",
    "plan/organize": "Plan/Organize",
    "plan organize": "Plan/Organize"
  },
  "Conners-4": {
    "inattention/executive dysfunction": "Inattention/Executive Dysfunction",
    "inattention": "Inattention/Executive Dysfunction",
    "executive dysfunction": "Inattention/Executive Dysfunction",
    "hyperactivity": "Hyperactivity",
    "impulsivity": "Impulsivity",
    "emotional dysregulation": "Emotional Dysregulation",
    "depressed mood": "Depressed Mood",
    "anxious thoughts": "Anxious Thoughts"
  }
};

// Every subtest the clinician can pick must be citable. Until 2026-09-23 only
// the six instruments above had entries, so 47 of the 109 preset subtests (all
// of WJ IV, KABC-II, DAS-II, CELF-5, KTEA-3, SRS-2, GARS-3 and BOT-2) were never
// bound: a WRONG score for them passed silently, and the row was then listed as
// "not discussed". Canonical names now come from ASSESSMENT_PRESETS; these are
// the abbreviations reports commonly use on top of them.
const EXTRA_SUBTEST_ALIASES = {
  'WJ-IV COG': { 'gia': 'General Intellectual Ability', 'gc': 'Comprehension-Knowledge', 'gf': 'Fluid Reasoning',
    'gwm': 'Short-Term Working Memory', 'gs': 'Cognitive Processing Speed', 'ga': 'Auditory Processing',
    'glr': 'Long-Term Retrieval', 'gv': 'Visual Processing' },
  'WJ-IV ACH': { 'letter-word identification': 'Letter-Word ID', 'letter word identification': 'Letter-Word ID' },
  'KABC-II': { 'mpi': 'Mental Processing Index', 'sequential/gsm': 'Sequential', 'simultaneous/gv': 'Simultaneous',
    'learning/glr': 'Learning', 'planning/gf': 'Planning', 'knowledge/gc': 'Knowledge' },
  'DAS-II': { 'gca': 'General Conceptual Ability', 'verbal ability': 'Verbal', 'nonverbal reasoning ability': 'Nonverbal Reasoning',
    'spatial ability': 'Spatial' },
  'CELF-5': { 'core language score': 'Core Language', 'cls': 'Core Language', 'receptive language index': 'Receptive Language',
    'rli': 'Receptive Language', 'expressive language index': 'Expressive Language', 'eli': 'Expressive Language',
    'language content index': 'Language Content', 'lci': 'Language Content', 'language structure index': 'Language Structure',
    'lsi': 'Language Structure', 'language memory index': 'Language Memory', 'lmi': 'Language Memory' },
  'KTEA-3': { 'asb': 'Academic Skills Battery', 'math concepts & applications': 'Math Concepts',
    'math concepts and applications': 'Math Concepts' },
  'SRS-2': { 'total t-score': 'Total Score', 'restricted interests and repetitive behavior': 'Restricted Interests', 'rrb': 'Restricted Interests' },
  'BOT-2': { 'tmc': 'Total Motor Composite' },
};
for (const [assessment, preset] of Object.entries(ASSESSMENT_PRESETS)) {
  if (!preset.subtests.length) continue;
  const table = SUBTEST_ALIASES[assessment] = SUBTEST_ALIASES[assessment] || {};
  const add = (variant, canonical) => { const k = variant.toLowerCase(); if (!table[k]) table[k] = canonical; };
  for (const sub of preset.subtests) {
    add(sub, sub);
    add(sub.replace(/&/g, 'and'), sub);
    add(sub.replace(/[\/-]/g, ' '), sub);
  }
  Object.entries(EXTRA_SUBTEST_ALIASES[assessment] || {}).forEach(([variant, canonical]) => add(variant, canonical));
}

// A bare test name ("the BASC-3", "WJ IV") can mean either form. The citation
// is bound to whichever form in the input carries that subtest AND value;
// "BASC-3" alone used to mean the Teacher form, so a Parent score cited as
// "BASC-3 Hyperactivity" was reported as a fabricated row.
const ASSESSMENT_FAMILIES = {
  'BASC-3': ['BASC-3 (Parent)', 'BASC-3 (Teacher)'],
  'WJ-IV': ['WJ-IV COG', 'WJ-IV ACH'],
};
ASSESSMENT_ALIASES['basc-3'] = 'BASC-3';
// Appended after the specific aliases so, at the same position, "BASC-3 Parent"
// still beats "BASC-3" (findAssessmentAtOrBefore keeps the first at a tie).
Object.assign(ASSESSMENT_ALIASES, {
  'basc-3 trs': 'BASC-3 (Teacher)', 'basc 3 trs': 'BASC-3 (Teacher)', 'basc-3 prs': 'BASC-3 (Parent)', 'basc 3 prs': 'BASC-3 (Parent)',
  'basc 3': 'BASC-3', 'basc3': 'BASC-3', 'basc': 'BASC-3',
  'wj iv': 'WJ-IV', 'wj-iv': 'WJ-IV', 'wj4': 'WJ-IV', 'woodcock-johnson iv': 'WJ-IV', 'woodcock johnson iv': 'WJ-IV', 'woodcock-johnson': 'WJ-IV',
  'kabc ii': 'KABC-II', 'kabc-2': 'KABC-II', 'kabc': 'KABC-II', 'kaufman assessment battery for children': 'KABC-II',
  'das ii': 'DAS-II', 'das-2': 'DAS-II', 'differential ability scales': 'DAS-II',
  'celf5': 'CELF-5', 'celf': 'CELF-5', 'clinical evaluation of language fundamentals': 'CELF-5',
  'ktea3': 'KTEA-3', 'ktea': 'KTEA-3', 'kaufman test of educational achievement': 'KTEA-3',
  'srs2': 'SRS-2', 'social responsiveness scale': 'SRS-2',
  'gars3': 'GARS-3', 'gars': 'GARS-3', 'gilliam autism rating scale': 'GARS-3',
  'bot2': 'BOT-2', 'bruininks-oseretsky': 'BOT-2', 'bruininks oseretsky': 'BOT-2',
  'wiat4': 'WIAT-4', 'wisc v': 'WISC-V',
});

// ─── LEXICON-SYNC-END ───

// ════════════════════════════════════════════════════════════════════════
// MATH — classification, percentile (normal CDF via erf approximation)
// ════════════════════════════════════════════════════════════════════════

function normalize(s) {
  if (!s) return '';
  return String(s).trim().toLowerCase().replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '');
}

function normalizeScoreType(raw) {
  const token = normalize(raw).replace(/[\s-]+/g, '_');
  if (token === 't' || token === 't_score' || token === 'tscore') return 't_score';
  if (token === 'scaled' || token === 'scaled_score') return 'scaled_score';
  if (token === 'standard' || token === 'standard_score' || token === 'ss') return 'standard';
  return token || 'standard';
}

function canonicalAssessment(raw) {
  return ASSESSMENT_ALIASES[normalize(raw)] || null;
}

function canonicalSubtest(assessment, raw) {
  const table = SUBTEST_ALIASES[assessment] || {};
  return table[normalize(raw)] || null;
}

// Classification and percentile delegate to the module-level RW_SCORE_SYSTEMS
// helpers, which know each instrument's own bands and scale (BOT-2 is mean 50).
function canonicalClassification(raw) {
  const hit = RW_LABEL_PHRASES.find(([phrase]) => phrase === normalize(raw));
  return hit ? (hit[1] || null) : null;
}

function classifyScore(score, scoreType, assessment, subtest, scheme) {
  return rwClassifyScore(score, scoreType, assessment, subtest, scheme).label;
}

function scoreToPercentile(score, scoreType, assessment, subtest) {
  return rwScorePercentile(score, scoreType, assessment, subtest);
}

function allSubtestVariantsFor(assessment) {
  const table = SUBTEST_ALIASES[assessment] || {};
  return Object.keys(table).sort((a, b) => b.length - a.length);
}

function isUniqueSubtest(canonicalSubtestName) {
  let count = 0;
  for (const table of Object.values(SUBTEST_ALIASES)) {
    if (Object.values(table).includes(canonicalSubtestName)) {
      count++;
      if (count > 1) return false;
    }
  }
  return count === 1;
}

// ════════════════════════════════════════════════════════════════════════
// EXTRACTOR — find score citations + bind to (assessment, subtest)
// ════════════════════════════════════════════════════════════════════════

const STANDARD_MIN = 40, STANDARD_MAX = 160;
const T_MIN = 20, T_MAX = 100;

const NUMBER_RE = /(?<![\d.])(\d{2,3})(?!\.\d)(?![\d%])/g;
const SENTENCE_END_RE = /[.!?](?:\s|$)|\n/;
const PERCENTILE_RE = /(\d{1,2}(?:\.\d)?)\s*(?:st|nd|rd|th)?\s*(?:%ile|percentile|%)\b/i;
const INTERVENING_SCORE_RE = /\b(\d{2,3})\b/g;

const NEGATIVE_POSTFIXES = [
  /^\s*(?:st|nd|rd|th)\s*(?:%ile|percentile|%)/i,
  /^\s*(?:percentile|%ile)/i,
  /^\s*(?:-)?(?:year|yr)s?(?:-old|\s+old)?/i,
  /^\s*(?:minutes?|seconds?|hours?|mins?|secs?|hrs?)\b/i,
  /^\s*%\b/,
  /^\s*-\d/,
  // Counts that are not test scores ("85 out of 90 days", "45 words correct").
  /^\s*(?:out of|of \d)/i,
  /^\s*(?:-)?(?:days?|weeks?|months?|times?|words?|items?|trials?|errors?|points?|sessions?|students?|pages?|lessons?|problems?|correct|wcpm|cwpm|dcpm)\b/i,
];

// Either end of a range ("97-107", "97 to 107") or a number introduced as an
// interval ("CI 97", "confidence interval of 97") is a bound, not a score.
const RANGE_SECOND_NUMBER_RE = /(?:\d\s*(?:-|–|—|to)|\bCI:?|\binterval(?: of)?:?|\brange of|\bbetween)\s*$/i;
NEGATIVE_POSTFIXES.push(/^\s*(?:to|–|—)\s*\d/i);

// Where the sentence containing `charPos` starts. A subtest name binds only to
// a number in its OWN sentence: reaching 200 characters back across sentences
// bound "attendance was 85 out of 90 days" to the Full Scale IQ named in the
// sentence before, and the resulting "score mismatch" blocked export. A period
// followed by lower case ("i.e. overall") is not a boundary.
function sentenceStartBefore(text, charPos) {
  let cut = 0;
  for (const m of text.substring(0, charPos).matchAll(/[.!?]["')\]]*\s+(?=[A-Z])|\n/g)) cut = m.index + m[0].length;
  return cut;
}

function escapeRegex(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function variantToPattern(variant) {
  // \s+ for internal spaces handles line-wrapped phrasing.
  const escaped = escapeRegex(variant).replace(/\\ /g, '\\s+');
  return new RegExp('\\b' + escaped + '\\b', 'gi');
}

function sliceUntilSentenceEnd(text, start, maxChars) {
  const windowEnd = Math.min(text.length, start + maxChars);
  const window = text.substring(start, windowEnd);
  const m = window.match(SENTENCE_END_RE);
  if (m) return window.substring(0, m.index);
  return window;
}

function hasInterveningScore(window, beforePos) {
  const slice = window.substring(0, beforePos);
  // Use matchAll instead of .exec() so each call gets a fresh iterator —
  // avoids the lastIndex re-entrancy hazard if hasInterveningScore is ever
  // called from interleaved async contexts (Promise.all test harness,
  // future React Suspense). String.matchAll requires the /g flag (which
  // INTERVENING_SCORE_RE has) and does NOT mutate the regex's lastIndex.
  for (const m of slice.matchAll(INTERVENING_SCORE_RE)) {
    const v = parseInt(m[1], 10);
    if ((v >= STANDARD_MIN && v <= STANDARD_MAX) || (v >= T_MIN && v <= T_MAX)) {
      return true;
    }
  }
  return false;
}

function findAssessmentAtOrBefore(text, charPos, windowChars = 600) {
  const windowStart = Math.max(0, charPos - windowChars);
  const windowNorm = text.substring(windowStart, charPos).replace(/\s+/g, ' ').toLowerCase();
  let best = null, bestPos = -1;
  for (const [variant, canonical] of Object.entries(ASSESSMENT_ALIASES)) {
    const idx = windowNorm.lastIndexOf(variant);
    if (idx === -1) continue;
    if (idx > bestPos) { bestPos = idx; best = canonical; }
  }
  return best;
}

function findSubtestAtOrBefore(text, charPos, assessment, windowChars = 200) {
  const windowStart = Math.max(0, charPos - windowChars);
  const window = text.substring(windowStart, charPos).toLowerCase();
  const candidates = [];
  // `assessment` may be one name or a family's list of forms.
  const assessmentsToCheck = Array.isArray(assessment) ? assessment : (assessment ? [assessment] : Object.keys(SUBTEST_ALIASES));

  for (const ass of assessmentsToCheck) {
    for (const variant of allSubtestVariantsFor(ass)) {
      const re = variantToPattern(variant);
      let m;
      while ((m = re.exec(window)) !== null) {
        const canonical = canonicalSubtest(ass, variant);
        if (canonical) candidates.push([m.index, canonical, ass]);
        if (re.lastIndex === m.index) re.lastIndex++; // safety
      }
    }
  }
  if (candidates.length === 0) return [null, null];
  candidates.sort((a, b) => b[0] - a[0]); // closest to charPos first
  return [candidates[0][1], candidates[0][2]];
}

function findClassificationAtOrAfter(text, charPos, windowChars = 80, assessment = null) {
  const window = sliceUntilSentenceEnd(text, charPos, windowChars).toLowerCase();
  let best = null, bestPos = window.length;
  for (const [variant, canonical] of RW_LABEL_PHRASES) {
    const ownOnly = RW_OWN_ONLY_LABELS.get(canonical);
    if (ownOnly && rwSystemKeyFor(assessment) !== ownOnly) continue;
    const re = variantToPattern(variant);
    const m = re.exec(window);
    if (m && m.index < bestPos) {
      bestPos = m.index;
      best = canonical;
    }
  }
  // '' marks an informal phrase ("significantly below average"): recognised
  // so a shorter band name inside it is not misread, but never checked.
  if (!best || hasInterveningScore(window, bestPos)) return null;
  return best;
}

// A confidence interval stated after a score: "(95% CI 97-107)", "95% confidence
// interval of 97 to 107", "(CI: 97-107)". Returns { level|null, low, high } or null.
const CI_RE = /(?:(\d{2})\s*%\s*)?(?:CI|confidence interval)\s*(?:\((\d{2})\s*%\))?\s*(?:of|:|=|is|was|from)?\s*[\[(]?\s*(\d{1,3})\s*(?:-|–|—|to|,)\s*(\d{1,3})/i;
function findCIAtOrAfter(text, charPos, windowChars = 100) {
  const window = sliceUntilSentenceEnd(text, charPos, windowChars);
  const m = window.match(CI_RE);
  if (!m || hasInterveningScore(window, m.index)) return null;
  return { level: m[1] || m[2] ? parseInt(m[1] || m[2], 10) : null, low: parseInt(m[3], 10), high: parseInt(m[4], 10) };
}

function findPercentileAtOrAfter(text, charPos, windowChars = 80) {
  const window = sliceUntilSentenceEnd(text, charPos, windowChars);
  const m = window.match(PERCENTILE_RE);
  if (!m) return null;
  if (hasInterveningScore(window, m.index)) return null;
  // "95%CI" / "95% confidence" is an interval's level, not a percentile.
  if (/^\s*(?:CI|confidence)\b/i.test(window.substring(m.index + m[0].length))) return null;
  const v = parseFloat(m[1]);
  return isNaN(v) ? null : v;
}

function extractScoreCitations(text) {
  const citations = [];
  // Use matchAll instead of .exec() so each call gets a fresh iterator —
  // avoids the lastIndex re-entrancy hazard if extractScoreCitations is
  // ever called from interleaved async contexts.
  for (const m of text.matchAll(NUMBER_RE)) {
    const valueStr = m[1];
    const value = parseInt(valueStr, 10);
    const plausibleStd = value >= STANDARD_MIN && value <= STANDARD_MAX;
    const plausibleT = value >= T_MIN && value <= T_MAX;
    if (!(plausibleStd || plausibleT)) continue;

    // Negative-postfix filter. Use m[0].length (the full match length)
    // rather than valueStr.length so a future refactor adding a non-capture
    // wrapper to NUMBER_RE doesn't silently shift this window.
    const tail = text.substring(m.index + m[0].length, m.index + m[0].length + 25);
    if (NEGATIVE_POSTFIXES.some(p => p.test(tail))) continue;
    if (RANGE_SECOND_NUMBER_RE.test(text.substring(Math.max(0, m.index - 12), m.index))) continue;

    // Subtest lookback, within this number's own sentence (max 200 chars).
    const sentenceStart = sentenceStartBefore(text, m.index);
    const subtestWindow = Math.min(200, m.index - sentenceStart);
    let [subtest, inferredAssessment] = findSubtestAtOrBefore(text, m.index, null, subtestWindow);
    if (subtest === null) continue;

    // Assessment lookback
    const explicitAssessment = findAssessmentAtOrBefore(text, m.index, 600);
    let assessment, confidence, family = null, explicit = false;
    if (explicitAssessment !== null) {
      family = ASSESSMENT_FAMILIES[explicitAssessment] || null;
      const forms = family || [explicitAssessment];
      if (forms.includes(inferredAssessment)) {
        assessment = inferredAssessment;
      } else {
        const [refined, refinedAssessment] = findSubtestAtOrBefore(text, m.index, forms, subtestWindow);
        if (refined !== null) { subtest = refined; assessment = refinedAssessment; }
        else assessment = forms[0];
      }
      confidence = 'high';
      explicit = true;
      // The named instrument has no such subtest. If it is named in THIS
      // sentence, the pairing is the draft's claim ("the WISC-V Broad Reading")
      // and is checked as written. If it was named sentences earlier, the
      // subtest word belongs to another instrument, so fall back to that one as
      // a guess rather than invent "WISC-V Planning" and call it fabricated.
      const formHasSubtest = forms.some(f => Object.values(SUBTEST_ALIASES[f] || {}).includes(subtest));
      if (!formHasSubtest && findAssessmentAtOrBefore(text, m.index, m.index - sentenceStart) === null) {
        assessment = inferredAssessment;
        explicit = false;
        family = null;
        confidence = isUniqueSubtest(subtest) ? 'high' : 'medium';
      }
    } else {
      assessment = inferredAssessment;
      confidence = isUniqueSubtest(subtest) ? 'high' : 'medium';
    }

    const classification = findClassificationAtOrAfter(text, m.index + m[0].length, 80, assessment);
    const percentile = findPercentileAtOrAfter(text, m.index + m[0].length);
    const ci = findCIAtOrAfter(text, m.index + m[0].length);

    const spanStart = Math.max(0, m.index - 40);
    const spanEnd = Math.min(text.length, m.index + m[0].length + 60);
    const spanText = text.substring(spanStart, spanEnd).trim();

    citations.push({
      value, assessment, subtest, classification, percentile, ci,
      span: { start: m.index, end: m.index + m[0].length, text: spanText },
      confidence, family, explicit,
    });
  }
  return citations;
}

// ════════════════════════════════════════════════════════════════════════
// COMPARE — extracted citations vs structured ScoreEntry rows
// ════════════════════════════════════════════════════════════════════════

const PERCENTILE_TOLERANCE = 2.0;

function normalizeScoreEntry(raw) {
  // Accept both pydantic snake_case and JSON camelCase keys.
  return {
    assessment: raw.assessment,
    subtest: raw.subtest,
    score: parseFloat(raw.score),
    score_type: normalizeScoreType(raw.score_type || raw.scoreType || 'standard'),
    classification: raw.classification || null,
    percentile: raw.percentile != null ? parseFloat(raw.percentile) : null,
    ci_low: (raw.ci_low ?? raw.ciLow) != null && (raw.ci_low ?? raw.ciLow) !== '' ? parseFloat(raw.ci_low ?? raw.ciLow) : null,
    ci_high: (raw.ci_high ?? raw.ciHigh) != null && (raw.ci_high ?? raw.ciHigh) !== '' ? parseFloat(raw.ci_high ?? raw.ciHigh) : null,
    ci_level: (raw.ci_level ?? raw.ciLevel) != null && (raw.ci_level ?? raw.ciLevel) !== '' ? parseFloat(raw.ci_level ?? raw.ciLevel) : null,
    descriptor_scale: raw.descriptor_scale ?? raw.descriptorScale ?? null,
    prior_score: (raw.prior_score ?? raw.priorScore) != null && (raw.prior_score ?? raw.priorScore) !== '' ? parseFloat(raw.prior_score ?? raw.priorScore) : null,
    prior_label: raw.prior_label ?? raw.priorLabel ?? null,
  };
}

// The percentile a cited value is checked against: the one recorded with the
// score, else the normal-curve value for a normalised standard score. A T-score
// with no recorded percentile is NOT checked: those percentiles come from each
// manual's norm tables, and the normal curve flagged a correct BASC-3 percentile
// as a mismatch (e.g. T 66 cited from the manual as 93rd, curve says 95.5).
function derivePercentile(entry) {
  if (entry.percentile !== null && entry.percentile !== undefined && entry.percentile !== '') return Number(entry.percentile);
  if (rwScoreScale(entry.score_type, entry.assessment, entry.subtest) === 't50') return null;
  return scoreToPercentile(entry.score, entry.score_type, entry.assessment, entry.subtest);
}

// `notes` collects non-blocking terminology notes; findings block export.
function compareCitationToSource(citation, sources, notes) {
  const findings = [];
  if (!citation.assessment || !citation.subtest) return findings;

  const byPair = {};
  const byAssessmentValue = {};
  for (const s of sources) {
    byPair[s.assessment + ' :: ' + s.subtest] = s;
    const k = s.assessment + ' :: ' + s.score;
    (byAssessmentValue[k] = byAssessmentValue[k] || []).push(s);
  }

  const matched = byPair[citation.assessment + ' :: ' + citation.subtest];
  if (!matched) {
    findings.push({
      kind: 'score_mismatch',
      detail: `Draft cites ${citation.assessment} ${citation.subtest} (${citation.value}) but no such row exists in the structured input. Either the input is missing this row, or the draft fabricated it.`,
      draft_says: `${citation.subtest} = ${citation.value}`,
      data_shows: '(no such (assessment, subtest) row in input)',
      assessment: citation.assessment,
      subtest: citation.subtest,
      span: citation.span,
      confidence: 'medium',
    });
    return findings;
  }

  // Score value
  if (Math.abs(matched.score - citation.value) > 0.5) {
    const sameValueKey = citation.assessment + ' :: ' + citation.value;
    const sameValueRows = byAssessmentValue[sameValueKey] || [];
    if (sameValueRows.length > 0) {
      const actual = sameValueRows[0];
      findings.push({
        kind: 'subtest_attribution',
        detail: `Draft attributes the value ${citation.value} to ${citation.assessment} ${citation.subtest}, but in the input, ${citation.value} belongs to ${actual.assessment} ${actual.subtest}. The actual ${citation.assessment} ${citation.subtest} score is ${matched.score}.`,
        draft_says: `${citation.subtest} = ${citation.value}`,
        data_shows: `${citation.subtest} = ${matched.score}; ${actual.subtest} = ${citation.value}`,
        assessment: citation.assessment,
        subtest: citation.subtest,
        span: citation.span,
        confidence: 'high',
      });
    } else {
      findings.push({
        kind: 'score_mismatch',
        detail: `Draft cites ${citation.value} for ${citation.assessment} ${citation.subtest} but the input shows ${matched.score}.`,
        draft_says: `${citation.subtest} = ${citation.value}`,
        data_shows: `${citation.subtest} = ${matched.score}`,
        assessment: citation.assessment,
        subtest: citation.subtest,
        span: citation.span,
        confidence: 'high',
      });
    }
    return findings;
  }

  // Classification. The label is judged against the score's RANGE on the
  // instrument's own scale, never against a stored label: a label copied into
  // the input when the score was entered can itself be stale or wrong.
  if (citation.classification) {
    const cited = citation.classification;
    const checked = { score: matched.score, scoreType: matched.score_type, assessment: matched.assessment, subtest: matched.subtest, descriptorScale: matched.descriptor_scale };
    const check = rwCheckClassification(checked, cited);
    const expected = check.expected && check.expected.label;
    const system = check.expected && check.expected.generic ? 'a WISC-V-style classification' : `the ${check.expected && check.expected.systemName}`;
    if (check.status === 'mismatch') {
      findings.push({
        kind: 'classification_mismatch',
        detail: `Draft labels ${citation.assessment} ${citation.subtest} as '${cited}' but ${system} places ${matched.score} in '${expected}'.`
          + (check.citedRange ? ` (${check.expected.systemName} uses '${cited}' for ${check.citedRange}.)` : '')
          + (check.expected.generic ? ` No common scoring system calls ${matched.score} '${cited}'; confirm against the ${citation.assessment} manual.` : '')
          + ((other) => other ? ` On the ${other} ${matched.score} is '${cited}': if the score report used that scale, choose it under Descriptors in Step 4.` : '')(rwOtherDescriptorScale(checked, cited)),
        draft_says: `${citation.subtest} = '${cited}'`,
        data_shows: `${citation.subtest} = '${expected}' (score ${matched.score})`,
        assessment: citation.assessment,
        subtest: citation.subtest,
        span: citation.span,
        confidence: check.expected.generic ? 'medium' : 'high',
      });
    } else if (check.status === 'terminology' && notes) {
      notes.push({
        kind: 'classification_terminology',
        detail: `'${cited}' is the ${check.alsoUsedBy.join(' / ')} term for this range; the ${check.expected.systemName} manual calls ${matched.score} '${expected}'.`,
        draft_says: `${citation.subtest} = '${cited}'`,
        suggested: expected,
        assessment: citation.assessment,
        subtest: citation.subtest,
        span: citation.span,
      });
    }
  }

  // Percentile
  const expectedPct = citation.percentile !== null ? derivePercentile(matched) : null;
  if (citation.percentile !== null && expectedPct === null) {
    // A T-score percentile with none recorded has no source: it can only come
    // from the manual's norm table, which the tool does not hold. The prompt
    // forbids stating one; if the draft does anyway, it must be sourced or cut.
    findings.push({
      kind: 'unsourced_statistic',
      detail: `Draft states the ${rwPercentileText(citation.percentile)} for ${citation.assessment} ${citation.subtest}, but no percentile is recorded for this score. Enter it from the score report in Step 4, or remove it.`,
      draft_says: `${citation.subtest} = ${rwPercentileText(citation.percentile)}`,
      data_shows: `${citation.subtest}: no percentile recorded`,
      assessment: citation.assessment,
      subtest: citation.subtest,
      span: citation.span,
      confidence: 'medium',
    });
  }
  if (expectedPct !== null) {
    if (Math.abs(expectedPct - citation.percentile) > PERCENTILE_TOLERANCE) {
      findings.push({
        kind: 'percentile_mismatch',
        detail: `Draft cites the ${rwPercentileText(citation.percentile)} for ${citation.assessment} ${citation.subtest}, but `
          + (matched.percentile != null && matched.percentile !== ''
            ? `the percentile recorded with the score is the ${rwPercentileText(matched.percentile)}.`
            : `a standard score of ${matched.score} is at about the ${rwPercentileText(expectedPct)}.`),
        draft_says: `${citation.subtest} = ${rwPercentileText(citation.percentile)}`,
        data_shows: `${citation.subtest} = ${rwPercentileText(expectedPct)}`,
        assessment: citation.assessment,
        subtest: citation.subtest,
        span: citation.span,
        confidence: 'medium',
      });
    }
  }

  // Confidence interval. Intervals come from the manual's tables, so the one
  // recorded with the score is the only source; with none recorded, a stated
  // interval is unsourced (and one that excludes the score is also impossible).
  if (citation.ci) {
    const ci = citation.ci;
    const recorded = matched.ci_low != null && matched.ci_high != null;
    const said = `${ci.level ? ci.level + '% ' : ''}CI ${ci.low}-${ci.high}`;
    let kind = 'ci_mismatch', why = null;
    if (ci.low > ci.high) why = `the interval is reversed`;
    else if (recorded && (Math.abs(ci.low - matched.ci_low) > 0.5 || Math.abs(ci.high - matched.ci_high) > 0.5)) why = `the score report gives ${matched.ci_level || 95}% CI ${matched.ci_low}-${matched.ci_high}`;
    else if (recorded && ci.level && matched.ci_level && ci.level !== matched.ci_level) why = `the recorded interval is ${matched.ci_level}%, not ${ci.level}%`;
    else if (!recorded && (matched.score < ci.low || matched.score > ci.high)) why = `it does not contain the score ${matched.score}, and no interval is recorded`;
    else if (!recorded) { kind = 'unsourced_statistic'; why = 'no interval is recorded for this score. Enter it from the score report in Step 4, or remove it'; }
    if (why) {
      findings.push({
        kind,
        detail: `Draft states ${said} for ${citation.assessment} ${citation.subtest}, but ${why}.`,
        draft_says: `${citation.subtest}: ${said}`,
        data_shows: recorded ? `${citation.subtest}: ${matched.ci_level || 95}% CI ${matched.ci_low}-${matched.ci_high}` : `${citation.subtest}: no interval recorded`,
        assessment: citation.assessment,
        subtest: citation.subtest,
        span: citation.span,
        confidence: recorded ? 'high' : 'medium',
      });
    }
  }

  return findings;
}

// Subtest scaled scores (mean 10) run 1-19, below the range the extractor reads
// as scores, so a scaled row could only ever be listed "not discussed" and a
// wrong one passed. Each scaled row is checked directly: its own name followed,
// in the same sentence, by a one- or two-digit number. Returns the rows cited.
function checkScaledRows(sources, text, verified, discrepancies, pastScore) {
  const cited = new Set();
  for (const s of sources) {
    if (s.score_type !== 'scaled_score') continue;
    const words = String(s.subtest || '').trim().split(/\s+/).filter(Boolean).map(escapeRegex);
    if (!words.length) continue;
    const re = new RegExp('\\b' + words.join('\\s+') + '\\b[^.!?\\n\\d]{0,60}?(?<![\\d.])(\\d{1,2})(?![\\d%])(?!\\.\\d)(?!\\s*(?:st|nd|rd|th|percent|years?|yrs?|months?)\\b)', 'gi');
    for (const m of text.matchAll(re)) {
      const value = parseInt(m[1], 10);
      const at = m.index + m[0].length - m[1].length;
      const span = { start: at, end: at + m[1].length, text: text.substring(Math.max(0, m.index), Math.min(text.length, at + 40)).trim() };
      cited.add(s);
      if (value === s.score) {
        verified.push({ value, assessment: s.assessment, subtest: s.subtest, classification: null, percentile: null, span, confidence: 'high', explicit: true });
      } else if (pastScore && pastScore({ value, assessment: s.assessment, subtest: s.subtest, span })) {
        // A prior scaled score, matched to its case record.
      } else {
        discrepancies.push({
          kind: 'score_mismatch',
          detail: `Draft cites a scaled score of ${value} for ${s.assessment} ${s.subtest} but the input shows ${s.score}.`,
          draft_says: `${s.subtest} = ${value}`, data_shows: `${s.subtest} = ${s.score}`,
          assessment: s.assessment, subtest: s.subtest, span, confidence: 'high',
        });
      }
    }
  }
  return cited;
}

// Eligibility under IDEA is decided by the IEP team (34 CFR §300.306), not by the
// evaluation report. AI drafts state it as fact ("[Student] is eligible for
// special education"), which oversteps the report's role and pre-empts the
// team. These are ADVISORY notes: they never block export. A sentence that
// frames it as the team's question ("the team will determine whether...") is
// left alone.
const ELIGIBILITY_PATTERNS = [
  /\b(?:is|are|was|were|would be|will be)\s+(?:not\s+)?(?:eligible|qualified)\s+for\s+(?:special education|specially designed instruction|an IEP|IEP services|services under IDEA|a 504 plan|section 504)/gi,
  /\bqualif(?:y|ies|ied)\s+for\s+(?:special education|an IEP|IEP services|services under IDEA)\b/gi,
  /\bmeets?\s+(?:the\s+)?(?:IDEA\s+|state\s+|special education\s+)?eligibility\s+(?:criteria|requirements)\b/gi,
  /\bshould\s+be\s+(?:found|determined|identified)\s+eligible\b/gi,
];
const TEAM_FRAMING_RE = /\b(?:whether|determine|determines|decide|decides|if|consider)\b[^.!?\n]*$/i;
function findEligibilityStatements(text) {
  const notes = [];
  for (const re of ELIGIBILITY_PATTERNS) {
    for (const m of text.matchAll(re)) {
      const sentenceStart = Math.max(text.lastIndexOf('.', m.index), text.lastIndexOf('\n', m.index)) + 1;
      if (TEAM_FRAMING_RE.test(text.substring(sentenceStart, m.index))) continue;
      notes.push({
        kind: 'eligibility_determination',
        detail: `"${m[0]}" states eligibility as a finding. Under IDEA the IEP team makes that decision (34 CFR §300.306); consider "Results are consistent with the criteria for..." or "The team may consider...".`,
        span: { start: m.index, end: m.index + m[0].length, text: text.substring(sentenceStart, Math.min(text.length, m.index + m[0].length + 40)).trim() },
      });
    }
  }
  return notes;
}

// "Significantly lower", "a significant discrepancy": whether a difference
// between scores is statistically significant, and how unusual it is, comes
// from the manual's critical values and base rates, which the draft is never
// given. ADVISORY. "Clinically significant" (a BASC-3 band) is not a claim
// about a difference.
const SIGNIFICANCE_RE = /\b(?:statistically\s+)?significant(?:ly)?\s+(?:higher|lower|greater|weaker|stronger|better|worse|different|discrepant|discrepanc(?:y|ies)|differences?|gaps?|splits?|variability|relative\s+(?:strengths?|weakness(?:es)?)|strengths?|weakness(?:es)?)\b/gi;
function findSignificanceClaims(text) {
  const notes = [];
  for (const m of text.matchAll(SIGNIFICANCE_RE)) {
    if (/clinically\s*$/i.test(text.slice(Math.max(0, m.index - 12), m.index))) continue;
    const start = sentenceStartBefore(text, m.index);
    notes.push({
      kind: 'significance_claim',
      detail: `"${m[0]}" calls a difference significant. That comes from the manual's critical values (and how unusual it is from its base rates), which the draft was not given; confirm it against the score report or rephrase.`,
      span: { start: m.index, end: m.index + m[0].length, text: text.substring(start, Math.min(text.length, m.index + m[0].length + 40)).trim() },
    });
  }
  return notes;
}

// A score the draft gives as a PAST result ("a 2022 evaluation found a Full
// Scale IQ of 82") is not a current score. It still counts as a mismatch unless
// its sentence says it is historical AND one of the clinician's case documents
// holds that subtest with that number, in which case it is listed as matched to
// the record. Without a record the finding stands, so a wrong current score
// cannot pass by being called "previous".
const HISTORICAL_RE = /\b(?:19|20)\d{2}\b|\b(?:previous(?:ly)?|prior|earlier|former(?:ly)?|initial evaluation|at that time|historical(?:ly)?|last (?:evaluation|assessment|testing|re-?evaluation|IEP))\b/i;
function isHistoricalSentence(text, span) {
  if (!span || typeof span.start !== 'number') return false;
  const start = sentenceStartBefore(text, span.start);
  const end = span.end + sliceUntilSentenceEnd(text, span.end, 240).length;
  return HISTORICAL_RE.test(text.substring(start, end));
}
function recordWithScore(caseRecords, subtest, value) {
  if (!Array.isArray(caseRecords) || !caseRecords.length || !subtest) return null;
  const variants = new Set([String(subtest).toLowerCase()]);
  Object.values(SUBTEST_ALIASES).forEach(table => Object.entries(table).forEach(([alias, canonical]) => { if (canonical === subtest) variants.add(alias); }));
  const number = String(value).replace('.', '\\.');
  const res = Array.from(variants).map(v => new RegExp('(?<![A-Za-z])' + escapeRegex(v).replace(/\s+/g, '\\s+') + '(?![A-Za-z])[^\\d\\n]{0,40}?(?<![\\d.])' + number + '(?![\\d])', 'i'));
  const hit = caseRecords.find(r => r && typeof r.text === 'string' && res.some(re => re.test(r.text)));
  return hit ? (hit.title || 'a case document') : null;
}

// Bind a family citation ("BASC-3 Hyperactivity") to the form in the input that
// has that subtest, preferring the one whose score matches the cited value.
function resolveCitationForm(citation, sources) {
  if (!citation.family) return citation;
  const rows = sources.filter(s => citation.family.includes(s.assessment) && s.subtest === citation.subtest);
  const hit = rows.find(s => Math.abs(s.score - citation.value) <= 0.5) || rows[0];
  return hit ? Object.assign({}, citation, { assessment: hit.assessment }) : citation;
}

// A subtest the clinician added by hand ("Pseudoword Decoding") was invisible to
// the checker: a wrong score for it passed, and the row was then listed as not
// discussed. A row named like a loose alias was checked against another scale
// ("Math Problem Solving" against the Math Composite). For one verification, each
// row's own name joins its instrument's table and wins over any alias with the
// same words. Scaled rows are left to checkScaledRows.
function withSourceAliases(sources, fn) {
  const undo = [];
  const set = (table, key, value) => { undo.push([table, key, Object.prototype.hasOwnProperty.call(table, key), table[key]]); table[key] = value; };
  const created = [];
  for (const s of sources) {
    if (!s.assessment || !s.subtest || s.score_type === 'scaled_score') continue;
    if (!SUBTEST_ALIASES[s.assessment]) { SUBTEST_ALIASES[s.assessment] = {}; created.push(s.assessment); }
    const table = SUBTEST_ALIASES[s.assessment];
    const name = String(s.subtest).trim().toLowerCase();
    new Set([name, name.replace(/&/g, 'and'), name.replace(/[\/-]/g, ' '), name.replace(/\s*\([^)]*\)\s*/g, ' ').trim()])
      .forEach(v => { if (v.length >= 3 && table[v] !== s.subtest) set(table, v, s.subtest); });
  }
  try { return fn(); }
  finally {
    for (let i = undo.length - 1; i >= 0; i--) {
      const [table, key, had, value] = undo[i];
      if (had) table[key] = value; else delete table[key];
    }
    created.forEach(a => { delete SUBTEST_ALIASES[a]; });
  }
}

function verifyDraft(rawSources, draftText, options) {
  const sources = rawSources.map(normalizeScoreEntry);
  return withSourceAliases(sources, () => verifyDraftWith(sources, draftText, options));
}
function verifyDraftWith(sources, draftText, options) {
  const citations = extractScoreCitations(draftText);
  const verified = [], discrepancies = [], inconclusive = [], terminologyNotes = [], historical = [];
  const citedPairs = new Set();
  const caseRecords = options && Array.isArray(options.caseRecords) ? options.caseRecords : [];
  const pastScore = (c) => {
    if (!isHistoricalSentence(draftText, c.span)) return false;
    // The prior score the examiner recorded for this subtest in Step 4.
    const prior = sources.find(s => s.subtest === c.subtest && (!c.assessment || s.assessment === c.assessment)
      && Number.isFinite(s.prior_score) && Math.abs(s.prior_score - c.value) <= 0.5);
    if (prior) {
      historical.push({ value: c.value, assessment: c.assessment, subtest: c.subtest, span: c.span, record: prior.prior_label || 'prior score entered in Step 4' });
      return true;
    }
    if (!caseRecords.length) return false;
    const record = recordWithScore(caseRecords, c.subtest, c.value);
    if (record) historical.push({ value: c.value, assessment: c.assessment, subtest: c.subtest, span: c.span, record });
    return !!record;
  };

  for (const raw of citations) {
    if (raw.confidence === 'low') { inconclusive.push(raw); continue; }
    const c = resolveCitationForm(raw, sources);
    // A subtest word like "learning", "planning" or "total score" can bind to an
    // instrument the draft never names. If that instrument is not in the input
    // either, the number is probably not a test score: inconclusive, not a
    // "fabricated row" alarm. A NAMED instrument missing from the input is still
    // flagged below.
    if (!c.explicit && !sources.some(s => s.assessment === c.assessment)) { inconclusive.push(c); continue; }
    const findings = compareCitationToSource(c, sources, terminologyNotes);
    const valueOnly = findings.length > 0 && findings.every(f => f.kind === 'score_mismatch' || f.kind === 'subtest_attribution');
    if (valueOnly && pastScore(c)) { /* listed in historical_matches */ }
    else if (findings.length > 0) discrepancies.push(...findings);
    else verified.push(c);
    if (c.assessment && c.subtest) citedPairs.add(c.assessment + ' :: ' + c.subtest);
  }

  const scaledCited = checkScaledRows(sources, draftText, verified, discrepancies, pastScore);
  const omitted = sources.filter(s => !scaledCited.has(s) && !citedPairs.has(s.assessment + ' :: ' + s.subtest));

  return {
    verified, discrepancies, inconclusive,
    terminology_notes: terminologyNotes,
    language_notes: findEligibilityStatements(draftText),
    significance_notes: findSignificanceClaims(draftText),
    historical_matches: historical,
    omitted_scores: omitted,
    sources_provided: sources.length,
    citations_extracted: citations.length,
  };
}

// ════════════════════════════════════════════════════════════════════════
// REPORT — Markdown formatter
// ════════════════════════════════════════════════════════════════════════

const KIND_LABEL = {
  score_mismatch: 'Score value mismatch',
  classification_mismatch: 'Classification label mismatch',
  percentile_mismatch: 'Percentile mismatch',
  subtest_attribution: 'Subtest attribution swap (CRITICAL)',
  omission: 'Score in input not discussed in draft',
  classification_terminology: 'Classification term (range correct, manual uses another word)',
  ci_mismatch: 'Confidence interval mismatch',
  unsourced_statistic: 'Percentile or interval with no source in the data',
};

function toMarkdown(result) {
  const lines = [];
  lines.push('# psycheck verification report');
  lines.push('');
  lines.push(`- Sources provided: **${result.sources_provided}**`);
  lines.push(`- Citations extracted from draft: **${result.citations_extracted}**`);
  lines.push(`- Verified (matched ground truth): **${result.verified.length}**`);
  lines.push(`- Discrepancies: **${result.discrepancies.length}**`);
  lines.push(`- Inconclusive (low-confidence binding): **${result.inconclusive.length}**`);
  lines.push(`- Omitted (in input, not discussed in draft): **${result.omitted_scores.length}**`);
  lines.push('');

  if (result.discrepancies.length > 0) {
    lines.push('## Discrepancies');
    lines.push('');
    result.discrepancies.forEach((d, i) => {
      lines.push(`### ${i + 1}. ${KIND_LABEL[d.kind] || d.kind}`);
      lines.push('');
      lines.push(`- **Detail:** ${d.detail}`);
      if (d.draft_says) lines.push(`- **Draft says:** ${d.draft_says}`);
      if (d.data_shows) lines.push(`- **Data shows:** ${d.data_shows}`);
      if (d.span && d.span.text) lines.push(`- **Context:** "${d.span.text}"`);
      lines.push(`- **Confidence:** ${d.confidence}`);
      lines.push('');
    });
  }

  const notes = Array.isArray(result.terminology_notes) ? result.terminology_notes : [];
  if (notes.length > 0) {
    lines.push('## Terminology notes (non-blocking)');
    lines.push('');
    for (const n of notes) lines.push(`- ${n.assessment} ${n.subtest}: ${n.detail}`);
    lines.push('');
  }

  const significance = Array.isArray(result.significance_notes) ? result.significance_notes : [];
  if (significance.length > 0) {
    lines.push('## Differences called significant (advisory, non-blocking)');
    lines.push('');
    for (const n of significance) lines.push(`- ${n.detail}`);
    lines.push('');
  }

  const language = Array.isArray(result.language_notes) ? result.language_notes : [];
  if (language.length > 0) {
    lines.push('## Eligibility language (advisory, non-blocking)');
    lines.push('');
    for (const n of language) lines.push(`- ${n.detail}`);
    lines.push('');
  }

  const past = Array.isArray(result.historical_matches) ? result.historical_matches : [];
  if (past.length > 0) {
    lines.push('## Prior scores matched to case records (not current results)');
    lines.push('');
    for (const h of past) lines.push(`- ${h.assessment} — ${h.subtest}: **${h.value}** (${h.record})`);
    lines.push('');
  }

  if (result.omitted_scores.length > 0) {
    lines.push('## Omitted scores');
    lines.push('');
    lines.push('These scores are in the structured input but are not discussed (or are discussed without a numeric citation) anywhere in the draft. Decide whether each should be added.');
    lines.push('');
    for (const s of result.omitted_scores) {
      const cls = s.classification || '(unclassified)';
      lines.push(`- ${s.assessment} — ${s.subtest}: **${s.score}** (${cls})`);
    }
    lines.push('');
  }

  if (result.verified.length > 0) {
    lines.push('## Verified citations');
    lines.push('');
    for (const c of result.verified) {
      const cls = c.classification ? `, ${c.classification}` : '';
      const pct = c.percentile != null ? `, ${rwPercentileText(c.percentile)}` : '';
      lines.push(`- ${c.assessment} — ${c.subtest}: **${c.value}**${cls}${pct}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

    function verifyDraftPublic(rawSources, draftText, options) {
      if (!Array.isArray(rawSources)) {
        throw new Error('verifyDraft: sources must be an array');
      }
      if (typeof draftText !== 'string') {
        throw new Error('verifyDraft: draftText must be a string');
      }
      const result = verifyDraft(rawSources, draftText, options);
      // Tag the result so the UI can distinguish inline vs imported.
      result._source = 'alloflow-inline';
      result._timestamp = new Date().toISOString();
      return result;
    }

    return Object.freeze({
      verifyDraft: verifyDraftPublic,
      // Internals exposed for in-AlloFlow self-test only:
      _classifyScore: classifyScore,
      _checkClassification: rwCheckClassification,
      _extractScoreCitations: extractScoreCitations,
      // [variant, canonical] names of one instrument's subtests, longest first.
      _subtestVariants: (assessment) => Object.entries(SUBTEST_ALIASES[assessment] || {}).sort((a, b) => b[0].length - a[0].length),
    });
  })();

}

    // USED_CHUNKS is the report's citation trail: it is what lets a clinician
    // ask "where did this sentence come from?". The model supplies those ids,
    // so they are a CLAIM about provenance, not proof of it — an id naming no
    // real chunk used to be stored verbatim, leaving an audit trail that
    // looked intact while pointing at nothing. Ids are now checked against
    // the chunks actually supplied to the prompt; unknown ids are dropped
    // from the trail and reported separately so the caller can surface them.
    //
    // `knownChunkIds` optional: when omitted (callers that have no chunk list
    // in scope) behaviour is unchanged and nothing is dropped.
// The model ends a section with "USED_CHUNKS: id1, id2". It also writes it as
// "**USED_CHUNKS:**", in lower case or on the same line as the prose; those
// forms used to stay in the section text and reach the printed report.
const USED_CHUNKS_RE = /[*_`]*USED[_ ]CHUNKS[*_`]*\s*:[*_`]*[ \t]*([^\n]*)/gi;
const parseEvidenceResponse = (rawResult, knownChunkIds) => {
        const raw = String(rawResult == null ? '' : rawResult).trim();
        let usedChunks = [];
        let text = raw;
        let last = null;
        for (const m of raw.matchAll(USED_CHUNKS_RE)) last = m;
        if (last) {
            // Markdown only around each id: the ids themselves contain underscores.
            usedChunks = last[1].split(',').map(s => s.trim().replace(/^[*_`[\s]+|[*_`\]\s]+$/g, '')).filter(Boolean);
            // Anything after the citation line is not part of the section.
            text = raw.slice(0, last.index).replace(USED_CHUNKS_RE, '');
        }
        const textLines = text.replace(/[ \t]+$/gm, '').split('\n');
        let unknownChunks = [];
        if (knownChunkIds) {
            // Accept a Set, an array of ids, or an array of chunk objects.
            const known = knownChunkIds instanceof Set
                ? knownChunkIds
                : new Set((Array.isArray(knownChunkIds) ? knownChunkIds : [])
                    .map(c => (c && typeof c === 'object') ? c.id : c)
                    .filter(Boolean));
            if (known.size > 0) {
                unknownChunks = usedChunks.filter(id => !known.has(id));
                usedChunks = usedChunks.filter(id => known.has(id));
            }
        }
        return { text: textLines.join('\n').trim(), usedChunks, unknownChunks };
    };
if (typeof window !== 'undefined') window.AlloReportWriterTesting = Object.assign(window.AlloReportWriterTesting || {}, { parseEvidenceResponse: parseEvidenceResponse });

// Split background text into OVERLAPPING windows for fact extraction.
// Pure + module-scope so it is directly testable: the old code truncated at
// 4000 chars inside an async handler, which is exactly the kind of silent
// data loss that no test could reach.
//
// Returns { windows, capped, totalWindows }. `capped` is true when the text
// needed more windows than maxWindows, so the caller can DISCLOSE the limit
// rather than quietly extracting from a prefix.
const buildExtractionWindows = (text, opts) => {
    const o = opts || {};
    const size = o.size || 4000;
    const overlap = o.overlap || 400;
    const maxWindows = o.maxWindows || 8;
    const src = String(text == null ? '' : text);
    if (!src) return { windows: [], capped: false, totalWindows: 0 };
    const step = Math.max(1, size - overlap);
    const all = [];
    for (let pos = 0; pos < src.length; pos += step) {
        all.push(src.substring(pos, pos + size));
        if (pos + size >= src.length) break;
    }
    return {
        windows: all.slice(0, maxWindows),
        capped: all.length > maxWindows,
        totalWindows: all.length
    };
};
if (typeof window !== 'undefined') window.AlloReportWriterTesting = Object.assign(window.AlloReportWriterTesting || {}, { buildExtractionWindows: buildExtractionWindows });

// Pure predicate behind the export lock. Extracted to module scope so the
// gate's conditions are directly testable: this decides whether a clinical
// report can leave the tool as a formal document, and it previously existed
// only as an inline boolean inside a 3000-line component.
//
// `unsourced` findings do not hard-block (some narrative connective tissue is
// legitimately unsourced) but DO require an explicit acknowledgement, so a
// clinician cannot sign past untraceable assertions without seeing them.
const evaluateExportGate = (s) => {
    const st = s || {};
    const reasons = [];
    if (!st.hasSections) reasons.push('no-content');
    if (st.auditStatus !== 'passed') reasons.push('audit-not-passed');
    if (!st.auditIsCurrent) reasons.push('audit-stale');
    if ((st.blockingCount || 0) > 0) reasons.push('blocking-findings');
    if (!st.psycheckIsCurrent) reasons.push('psycheck-stale');
    if ((st.psycheckBlockingCount || 0) > 0) reasons.push('psycheck-findings');
    if ((st.unsourcedCount || 0) > 0 && !st.unsourcedAcknowledged) reasons.push('unsourced-unacknowledged');
    if ((st.placeholderCount || 0) > 0) reasons.push('placeholders');
    const canAttest = reasons.length === 0;
    if (!st.clinicianAttested) reasons.push('not-attested');
    return { ready: reasons.length === 0, canAttest: canAttest, reasons: reasons };
};
if (typeof window !== 'undefined') window.AlloReportWriterTesting = Object.assign(window.AlloReportWriterTesting || {}, { evaluateExportGate: evaluateExportGate });

// Identifier redaction lives in identifier_redaction_module.js so Report Writer
// and Dynamic Assessment share ONE implementation. A copied scrubber is how
// tests/extracted_logic/clinical_logic.js came to assert the old, leaky
// behaviour while the real one had already been fixed.
//
// Resolved per call, not captured at load: this module can execute before the
// shared one has registered. The fallbacks are deliberately CONSERVATIVE --
// if the redaction module is missing we must not silently send unredacted
// clinical text, so scrubIdentifiers falls back to structured identifiers only
// and analyzeRedaction reports that it could not assess.
function _redactionApi() {
    return (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.IdentifierRedaction) || null;
}
const scrubIdentifiers = (text, options) => {
    const api = _redactionApi();
    if (api && typeof api.scrubIdentifiers === 'function') return api.scrubIdentifiers(text, options);
    // Degraded path: no name redaction is possible, so strip what patterns can
    // still catch rather than returning the text untouched.
    if (!text) return text;
    let out = String(text);
    out = out.replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[EMAIL]');
    out = out.replace(/\b\d{3}-\d{2}-\d{4}\b/g, '[SSN]');
    out = out.replace(/(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}\b/g, '[PHONE]');
    out = out.replace(/\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/g, '[DATE]');
    return out;
};
const nameRedactionParts = (fullName) => {
    const api = _redactionApi();
    if (api && typeof api.nameRedactionParts === 'function') return api.nameRedactionParts(fullName);
    return { safe: [], risky: [] };
};
const analyzeRedaction = (text, options) => {
    const api = _redactionApi();
    if (api && typeof api.analyzeRedaction === 'function') return api.analyzeRedaction(text, options);
    // Unknown, not clean: never let a missing module render as "nothing to flag".
    return { hasStudentName: false, riskyNameParts: [], unlistedTitledNames: [], needsAttention: true, unavailable: true };
};
if (typeof window !== 'undefined') window.AlloReportWriterTesting = Object.assign(window.AlloReportWriterTesting || {}, { scrubIdentifiers: scrubIdentifiers, nameRedactionParts: nameRedactionParts, analyzeRedaction: analyzeRedaction });
// ─── PSYCHECK-INLINE-END ───

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
    // The badge, the AI prompt and the psycheck verifier all read RW_SCORE_SYSTEMS.
    const classifyDisplayScore = (score, scoreType = 'standard', assessment = '', subtest = '', descriptorScale) =>
        rwClassifyScore(score, scoreType, assessment, subtest, descriptorScale);
    // A descriptor scale is kept only if the instrument offers it.
    const rwValidDescriptorScale = (assessment, scheme) => {
        const d = RW_DESCRIPTOR_SCALES[assessment];
        return d && d.options.includes(String(scheme)) ? String(scheme) : undefined;
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
                'Clinical scales: T >=70 is Clinically Significant and 60-69 At-Risk',
                'Elevated Attention Problems (>=65) combined with elevated Hyperactivity (>=65) is convergent evidence for attention concerns',
                'Adaptive scales run the other way: 31-40 is At-Risk and <=30 Clinically Significant. Low Adaptive Skills alongside an elevated BSI suggests pervasive functional impact',
                'Teacher-Parent discrepancies >10 T-score points may reflect setting-specific behavior or rater differences'
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
                'Achievement well below FSIQ is an ability-achievement discrepancy. IDEA 2004 lets states permit this model but not require it, and thresholds vary by state; many teams rely on RTI/MTSS data or a pattern of strengths and weaknesses instead',
                'Reading Composite below 85 with average-or-higher FSIQ is one pattern teams weigh for SLD in reading; it does not establish SLD on its own',
                'Math Composite below 85 with intact reading suggests domain-specific learning difficulty',
                'Written Language deficits often co-occur with fine motor or executive functioning concerns'
            ]
        },
        'Vineland-3': {
            description: 'Vineland Adaptive Behavior Scales, 3rd Ed. Measures adaptive functioning across communication, daily living, socialization, motor.',
            keyPatterns: [
                'ABC <=70 with FSIQ around 70 or below (about 65-75 once measurement error is considered) is consistent with the score pattern for intellectual disability; diagnosis also requires onset in the developmental period and clinical judgment',
                'Significant discrepancy between cognitive ability and adaptive functioning suggests environmental masking or exacerbation',
                'Socialization domain deficits are particularly relevant for autism spectrum evaluations'
            ]
        },
        'BRIEF-2': {
            description: 'Behavior Rating Inventory of Executive Function, 2nd Ed. Measures executive functioning in everyday environments.',
            keyPatterns: [
                'Higher T-scores mean more difficulty: 60-64 is mildly elevated, 65-69 potentially clinically elevated, and >=70 clinically elevated',
                'Elevated Working Memory + Plan/Organize suggests organizational support needs',
                'Elevated Inhibit + Emotional Control aligns with behavioral regulation concerns',
                'BRI-CRI discrepancy may differentiate behavioral vs cognitive executive profiles'
            ]
        },
        'Conners-4': {
            description: 'Conners 4th Ed. Measures ADHD symptoms and related concerns.',
            keyPatterns: [
                'Inattention/Executive Dysfunction >=65 (Elevated) supports attention concerns; rating scales alone do not establish ADHD or its presentation',
                'Hyperactivity + Impulsivity both >=65 is consistent with hyperactive-impulsive concerns; presentation is decided by DSM-5-TR symptom criteria, not scale scores',
                'Emotional Dysregulation elevation may indicate comorbid mood concerns beyond ADHD'
            ]
        }
    };

    // Codes are ICD-10-CM, as listed in DSM-5-TR (ICD-9-CM codes such as 314.0x
    // were retired in the US in 2015).
    const DSM5_SCREENING_CRITERIA = {
        'ADHD': {
            code: 'F90.0 / F90.1 / F90.2',
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
                'Elevated BRIEF-2 Working Memory and Inhibit scales (higher BRIEF-2 scores mean more difficulty)',
                'WISC-V WMI and/or PSI significantly below VCI/FRI'
            ],
            exclusionary: 'Symptoms not better explained by another mental disorder (anxiety, mood, dissociative, personality, substance)'
        },
        'SLD': {
            code: 'F81.0 / F81.81 / F81.2',
            presentations: ['With impairment in reading', 'With impairment in written expression', 'With impairment in mathematics'],
            keyIndicators: [
                'Academic skills substantially and quantifiably below expectations for age',
                'Difficulties begin during school-age years',
                'Not better accounted for by ID, sensory issues, neurological conditions, or inadequate instruction'
            ],
            convergentEvidence: [
                'Ability-achievement discrepancy (permitted but not required under IDEA 2004; thresholds vary by state)',
                'Low achievement despite adequate instruction (RTI/MTSS data)',
                'Pattern of strengths and weaknesses in cognitive processing (PSW model)'
            ],
            exclusionary: 'Must rule out: ID, uncorrected vision/hearing, other mental/neurological disorders, psychosocial adversity, inadequate instruction, language proficiency'
        },
        'ASD': {
            code: 'F84.0',
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
            code: 'F70 / F71 / F72 / F73',
            presentations: ['Mild', 'Moderate', 'Severe', 'Profound'],
            keyIndicators: [
                'Deficits in intellectual functions confirmed by clinical assessment AND testing (about 2 SD below the mean, roughly 65-75 including measurement error)',
                'Severity levels are defined by adaptive functioning, not by IQ score',
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
            parts.push('CONVERGENT: BASC-3 Attention (' + attn.score + ') + Hyperactivity (' + hyper.score + ') both elevated — consistent with attention concerns (rating scales alone do not establish ADHD)');
        if (attn && attn.score >= 65 && connIn && connIn.score >= 65)
            parts.push('CONVERGENT: BASC-3 Attention (' + attn.score + ') + Conners Inattention (' + connIn.score + ') — cross-measure convergence on attention concerns');
        // Contextual DSM-5 + IDEA references. Each reference is added only when a
        // score that bears on it is present. "Any T >= 65" used to add the ADHD
        // block for an elevated Anxiety or SRS-2 score, and "any standard score
        // <= 70" added the ID block for every BOT-2 score (mean 50) and for low
        // achievement alone, steering the draft toward diagnoses no data raised.
        const ATTENTION_SCALES = new Set(['Attention Problems', 'Hyperactivity', 'Inattention/Executive Dysfunction', 'Impulsivity', 'Inhibit', 'Working Memory']);
        const ATTENTION_INSTRUMENTS = ['BASC-3 (Parent)', 'BASC-3 (Teacher)', 'Conners-4', 'BRIEF-2'];
        const GLOBAL_COGNITIVE = new Set(['WISC-V:Full Scale IQ', 'WJ-IV COG:General Intellectual Ability', 'KABC-II:Mental Processing Index', 'DAS-II:General Conceptual Ability']);
        const hasBehElev = scoreEntries.some(s => ATTENTION_INSTRUMENTS.includes(s.assessment) && ATTENTION_SCALES.has(s.subtest) && Number(s.score) >= 65);
        const hasLowCog = scoreEntries.some(s => GLOBAL_COGNITIVE.has(s.assessment + ':' + s.subtest) && Number(s.score) <= 75);
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
            { name: 'Dynamic Assessment Results', notes: '', enabled: false },
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
        'IEP-Ready Packet': [
            { name: 'Reason for Referral / Eligibility Question', notes: '', enabled: true },
            { name: 'RTI / CBM Screening & Benchmark Summary', notes: '', enabled: true },
            { name: 'Progress Monitoring & Goal Progress', notes: '', enabled: true },
            { name: 'Intervention Summary', notes: '', enabled: true },
            { name: 'Dynamic Assessment Findings', notes: '', enabled: true },
            { name: 'Present Levels (AI Narrative)', notes: 'Synthesize the sections above into a present-levels narrative; every claim must trace to a verified fact chunk.', enabled: true },
            { name: 'Work Samples', notes: 'Clinician to attach or describe representative work samples.', enabled: true },
            { name: 'Recommendations & Draft Goals', notes: '', enabled: true },
        ],
    };

    // Inline-SVG progress-monitoring trendline(s) for the IEP packet's print output.
    // Pure function → HTML string (printReport writes into a new document; inline SVG
    // survives print/"Save as PDF"). Green points = at/above benchmark, red = below;
    // dashed blue line = 50th-%ile CBM benchmark. No external chart library.
    function _rwTrendSvg(series) {
        if (!Array.isArray(series) || !series.length) return '';
        const blocks = series.map(s => {
            if (!s || typeof s !== 'object') return '';
            const pts = (Array.isArray(s.points) ? s.points : []).filter(p => p && Number.isFinite(p.value));
            if (!pts.length) return '';
            const W = 380, H = 120, PL = 40, PR = 14, PT = 14, PB = 22;
            const aimPoints = Array.isArray(s.aimline) ? s.aimline.filter(p => p && Number.isFinite(p.value)) : [];
            const aim = aimPoints.length ? aimPoints : null;
            const benchmark = Number.isFinite(s.benchmark) ? s.benchmark : null;
            const safeLabel = escapeHtml(s.label || 'Progress measure');
            const safeGrade = s.grade == null ? '' : escapeHtml(s.grade);
            const vals = pts.map(p => p.value);
            if (benchmark !== null) vals.push(benchmark);
            if (aim) aim.forEach(p => { if (typeof p.value === 'number') vals.push(p.value); });
            const maxV = Math.max.apply(null, vals) || 1;
            const minV = Math.min.apply(null, vals.concat([0]));
            const range = (maxV - minV) || 1;
            const x = i => PL + (pts.length === 1 ? (W - PL - PR) / 2 : i * (W - PL - PR) / (pts.length - 1));
            const y = v => H - PB - ((v - minV) / range) * (H - PT - PB);
            const poly = pts.map((p, i) => x(i).toFixed(1) + ',' + y(p.value).toFixed(1)).join(' ');
            const circles = pts.map((p, i) => {
                const above = benchmark !== null ? p.value >= benchmark : true;
                return `<circle cx="${x(i).toFixed(1)}" cy="${y(p.value).toFixed(1)}" r="3.5" fill="${above ? '#16a34a' : '#dc2626'}"/>`;
            }).join('');
            const bench = benchmark !== null
                ? `<line x1="${PL}" y1="${y(benchmark).toFixed(1)}" x2="${W - PR}" y2="${y(benchmark).toFixed(1)}" stroke="#2563eb" stroke-width="1.5" stroke-dasharray="4 3"/><text x="${W - PR}" y="${(y(benchmark) - 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#2563eb">benchmark ${benchmark}</text>`
                : '';
            const aimSvg = (aim && aim.length > 1)
                ? `<polyline points="${aim.map((p, i) => x(i).toFixed(1) + ',' + y(p.value).toFixed(1)).join(' ')}" fill="none" stroke="#d97706" stroke-width="1.5"/><text x="${x(aim.length - 1).toFixed(1)}" y="${(y(aim[aim.length - 1].value) - 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#d97706">aimline</text>`
                : '';
            const yAxis = `<line x1="${PL}" y1="${PT}" x2="${PL}" y2="${H - PB}" stroke="#cbd5e1" stroke-width="1"/><text x="${PL - 4}" y="${(y(maxV) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748b">${Math.round(maxV)}</text><text x="${PL - 4}" y="${(y(minV) + 3).toFixed(1)}" text-anchor="end" font-size="9" fill="#64748b">${Math.round(minV)}</text>`;
            return `<div style="margin:8px 0;page-break-inside:avoid"><div style="font-size:11px;font-weight:700;color:#334155;margin-bottom:2px">${safeLabel}${safeGrade ? ' — grade ' + safeGrade : ''} (${pts.length} point${pts.length === 1 ? '' : 's'})</div><svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="max-width:100%;height:auto" role="img" focusable="false" aria-label="${safeLabel} progress trendline versus benchmark${aim ? ' and aimline' : ''}">${yAxis}${bench}${aimSvg}${pts.length > 1 ? `<polyline points="${poly}" fill="none" stroke="#6366f1" stroke-width="2"/>` : ''}${circles}</svg></div>`;
        }).filter(Boolean);
        if (!blocks.length) return '';
        return `<div style="margin-top:10px"><h2>Progress-Monitoring Trendlines</h2><p style="font-size:11px;color:#475569;margin:0 0 4px">Score over time (most recent 12 points). Blue dashed = 50th-percentile CBM benchmark; amber = individualized goal aimline (ORF). Green points = at/above benchmark; red = below.</p>${blocks.join('')}<p style="font-size:9px;color:#64748b;margin-top:2px">Screening data — not an eligibility determination.</p></div>`;
    }

    const TRANSLATION_LANGUAGE_META = Object.freeze({
        Spanish: { code: 'es', dir: 'ltr' },
        French: { code: 'fr', dir: 'ltr' },
        Portuguese: { code: 'pt', dir: 'ltr' },
        'Chinese (Simplified)': { code: 'zh-Hans', dir: 'ltr' },
        'Chinese (Traditional)': { code: 'zh-Hant', dir: 'ltr' },
        Arabic: { code: 'ar', dir: 'rtl' },
        Vietnamese: { code: 'vi', dir: 'ltr' },
        Korean: { code: 'ko', dir: 'ltr' },
        'Haitian Creole': { code: 'ht', dir: 'ltr' },
        Somali: { code: 'so', dir: 'ltr' },
        Russian: { code: 'ru', dir: 'ltr' },
        German: { code: 'de', dir: 'ltr' },
        Japanese: { code: 'ja', dir: 'ltr' },
        Tagalog: { code: 'tl', dir: 'ltr' },
        Hindi: { code: 'hi', dir: 'ltr' },
        Urdu: { code: 'ur', dir: 'rtl' }
    });
    const getTranslationLanguageMeta = (language) => TRANSLATION_LANGUAGE_META[language] || { code: 'en', dir: 'ltr' };
    const buildReportPrintHtml = ({
        reportTitle = 'Psychoeducational Evaluation Report',
        studentName = '[Student]',
        studentAge = 'N/A',
        studentGrade = 'N/A',
        reportSections = {},
        rtiTrendSeries = null,
        isDemo = false,
        locale = 'en',
        scoreEntries = [],
        referencesConsulted = []
    } = {}) => {
        const safeLocale = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(locale) ? locale : 'en';
        const safeTitle = escapeHtml(reportTitle || 'Psychoeducational Evaluation Report');
        const safeStudentName = escapeHtml(studentName || '[Student]');
        const safeAge = escapeHtml(studentAge || 'N/A');
        const safeGrade = escapeHtml(studentGrade || 'N/A');
        const draftBanner = '<aside role="note" aria-label="AI-assisted draft warning" style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:12px 16px;margin-bottom:20px;text-align:center"><p style="color:#b91c1c;font-weight:900;font-size:11pt;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px">CONFIDENTIAL DRAFT - AI-ASSISTED DOCUMENT</p><p style="color:#7f1d1d;font-size:10pt;margin:0;line-height:1.4">This report was generated with AI assistance and requires review and approval by the licensed school psychologist before use in educational decision-making. All interpretations must be validated against the clinician\'s independent professional judgment. This document is not a finalized evaluation report until signed by the responsible clinician.</p></aside>';
        const header = '<header><h1>' + safeTitle + '</h1><p class="report-meta">Student: ' + safeStudentName + ' | Age: ' + safeAge + ' | Grade: ' + safeGrade + ' | Date: ' + escapeHtml(new Date().toLocaleDateString()) + '</p><hr></header>';
        const trendBlock = Array.isArray(rtiTrendSeries) && rtiTrendSeries.length ? _rwTrendSvg(rtiTrendSeries) : '';
        let trendInjected = false;
        const sections = Object.entries(reportSections || {}).filter(([, value]) => typeof value === 'string');
        const body = sections.map(([name, value], index) => {
            const sectionId = 'rw-print-section-' + (index + 1);
            const safeText = escapeHtml(value.replace(/\[Student\]/g, () => studentName || '[Student]'));
            const paragraphs = safeText.split(/\n{2,}/).filter(Boolean).map(paragraph => '<p>' + paragraph.replace(/\n/g, '<br>') + '</p>').join('');
            let sectionHtml = '<section aria-labelledby="' + sectionId + '"><h2 id="' + sectionId + '">' + escapeHtml(name) + '</h2>' + paragraphs + '</section>';
            if (trendBlock && !trendInjected && (name === 'Progress Monitoring & Goal Progress' || name === 'RTI / CBM Screening & Benchmark Summary')) {
                sectionHtml += trendBlock;
                trendInjected = true;
            }
            return sectionHtml;
        }).join('') + ((trendBlock && !trendInjected) ? trendBlock : '');
        const signature = '<footer><div class="signature-line"><p><strong>Clinician Signature:</strong> _____________________________ &nbsp; <strong>Date:</strong> ______________ &nbsp; <strong>License #:</strong> ______________</p><p class="document-note">Generated with AlloFlow Report Writer (AI-Assisted Draft) - Requires clinician review, approval, and signature before distribution.</p></div></footer>';
        const demoWatermark = isDemo ? '<div aria-hidden="true" class="demo-watermark">DEMO</div>' : '';
        return '<!doctype html><html lang="' + safeLocale + '"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' + safeTitle + '</title><style>'
            + 'html{color-scheme:light}*{box-sizing:border-box}body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6;color:#333;background:#fff;overflow-wrap:anywhere}'
            + 'h1{font-size:18pt;text-align:center;margin-bottom:4px}h2{font-size:14pt;color:#1e40af;border-bottom:1px solid #94a3b8;padding-bottom:4px;margin-top:24px}p{font-size:11pt;text-align:left}.report-meta{text-align:center;color:#4b5563}'
            + '.signature-line{margin-top:40px;border-top:2px solid #333;padding-top:12px}.signature-line p{font-size:10pt;color:#4b5563;margin-bottom:24px}.signature-line .document-note{font-size:9pt;color:#595959;text-align:center;margin-top:8px}'
            + '.demo-watermark{position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:96px;color:rgba(153,27,27,.12);font-weight:900;pointer-events:none;z-index:9999}'
            + '@media(max-width:480px){body{margin:0;padding:12px}h1{font-size:16pt}h2{font-size:13pt}}@media print{body{margin:20px}.demo-watermark{position:fixed}}'
            + '.score-table-wrap{overflow-x:auto}.score-table{width:100%;border-collapse:collapse;margin:12px 0;font-size:10pt}.score-table caption{text-align:left;font-weight:bold;padding:4px 0}'
            + '.score-table th,.score-table td{border:1px solid #94a3b8;padding:3px 6px;text-align:left;vertical-align:top}.score-table thead th{background:#f1f5f9}.score-note{font-size:9pt;color:#4b5563}'
            + '@media print{.score-table{page-break-inside:avoid}}'
            + 'h3.ref-title{font-size:11pt;margin:12px 0 4px}.ref-list{font-size:10pt;margin:0 0 8px;padding-left:20px}'
            + '</style></head><body>' + demoWatermark + draftBanner + header + '<main>' + body + rwScoreTableHtml(scoreEntries) + rwReferencesConsultedHtml(referencesConsulted) + '</main>' + signature + '</body></html>';
    };

    const REFS_STORAGE_KEY = 'allo_rw_refs';
    const STYLE_STORAGE_KEY = 'allo_rw_style';

    // ─── Report Writer Panel ─────────────────────────────────────
    const DRAFT_KEY = 'allo_rw_draft';
    const SAVED_KEY = 'allo_rw_saved';
    const PERSIST_PREF_KEY = 'allo_rw_persist_enabled';
    const RW_SCHEMA_VERSION = 2;
    const RW_MAX_JSON_CHARS = 2_000_000;
    const RW_MAX_DISCREPANCY_JSON_CHARS = 1_000_000;
    const safeGetItem = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
    const safeSetItem = (k, v) => {
        try { localStorage.setItem(k, v); return true; }
        catch (e) { warnLog('localStorage write failed:', e); return false; }
    };
    const safeRemoveItem = (k) => { try { localStorage.removeItem(k); return true; } catch { return false; } };
    const createEmptyBackground = () => ({
        referralReason: '', developmental: '', medical: '', educational: '', social: '', behavioral: '', observations: ''
    });
    const createEmptyClinicalObs = () => ({
        testSession: { text: '', source: 'Test Session Observations' },
        behavioral: { text: '', source: 'Classroom/Behavioral Observations' },
        parentInterview: { text: '', source: 'Parent Interview' },
        teacherInterview: { text: '', source: 'Teacher Interview' },
        studentInterview: { text: '', source: 'Student Interview' },
        otherSources: { text: '', source: 'Other Collateral Sources' }
    });
    const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
        && (Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
    const cloneSafeJson = (value, depth = 0) => {
        if (depth > 10) throw new Error('Imported data is nested too deeply');
        if (value === null || typeof value === 'boolean') return value;
        if (typeof value === 'number') {
            if (!Number.isFinite(value)) throw new Error('Imported data contains a non-finite number');
            return value;
        }
        if (typeof value === 'string') {
            if (value.length > 250000) throw new Error('An imported text field is too large');
            return value;
        }
        if (Array.isArray(value)) {
            if (value.length > 2000) throw new Error('An imported list is too large');
            return value.map(item => cloneSafeJson(item, depth + 1));
        }
        if (!isPlainObject(value)) throw new Error('Imported data contains an unsupported value');
        const keys = Object.keys(value);
        if (keys.length > 250) throw new Error('An imported object has too many fields');
        const out = {};
        for (const key of keys) {
            if (key === '__proto__' || key === 'prototype' || key === 'constructor') {
                throw new Error('Imported data contains an unsafe field name');
            }
            out[key] = cloneSafeJson(value[key], depth + 1);
        }
        return out;
    };
    const validateReportPayload = (raw) => {
        if (!isPlainObject(raw)) throw new Error('Expected a report JSON object');
        const serialized = JSON.stringify(raw);
        if (serialized.length > RW_MAX_JSON_CHARS) throw new Error('Report JSON exceeds the 2 MB limit');
        const data = cloneSafeJson(raw);
        // Case documents are session-only by design; one pasted into a JSON is dropped.
        delete data.caseDocuments;
        const version = data.schemaVersion == null ? 1 : Number(data.schemaVersion);
        if (!Number.isInteger(version) || version < 1 || version > RW_SCHEMA_VERSION) {
            throw new Error(`Unsupported report schema version: ${data.schemaVersion}`);
        }
        const stringFields = ['reportTitle', 'manualStudentName', 'selectedStudentId', 'studentAge', 'studentGrade', 'selectedAssessment', 'styleProfile', 'reportType', 'translatedReport', 'translationLang', 'bgExtractedHash'];
        const arrayFields = ['scoreEntries', 'factChunks', 'accuracyResults', 'hypotheses', 'selectedHypotheses', 'blueprint', 'reportPeople'];
        const objectFields = ['bgSections', 'clinicalObs', 'reportSections', 'differentialResults', 'sectionEvidenceMap'];
        stringFields.forEach(key => { if (data[key] != null && typeof data[key] !== 'string') throw new Error(`${key} must be text`); });
        arrayFields.forEach(key => { if (data[key] != null && !Array.isArray(data[key])) throw new Error(`${key} must be a list`); });
        objectFields.forEach(key => { if (data[key] != null && !isPlainObject(data[key])) throw new Error(`${key} must be an object`); });
        // Redaction depends on these being {name, role} strings; a malformed
        // import would otherwise silently drop names from redaction.
        if (data.reportPeople) {
            data.reportPeople.forEach((row, index) => {
                if (!isPlainObject(row) || (row.name != null && typeof row.name !== 'string') || (row.role != null && typeof row.role !== 'string')) {
                    throw new Error(`Person ${index + 1} is invalid`);
                }
            });
        }
        if (data.reportSections) {
            for (const [name, text] of Object.entries(data.reportSections)) {
                if (!name.trim() || typeof text !== 'string') throw new Error('Every report section must have a text name and value');
            }
        }
        if (data.scoreEntries) {
            data.scoreEntries.forEach((row, index) => {
                if (!isPlainObject(row) || typeof row.assessment !== 'string' || typeof row.subtest !== 'string' || !Number.isFinite(Number(row.score))) {
                    throw new Error(`Score row ${index + 1} is invalid`);
                }
            });
            // Labels are derived data. A saved report keeps the label from the day
            // the score was entered, so recompute it: reports saved before the
            // per-instrument bands would otherwise feed old labels to the AI.
            const reportNumber = (v, lo, hi) => (v === '' || v == null || !Number.isFinite(Number(v)) || Number(v) < lo || Number(v) > hi) ? null : Number(v);
            data.scoreEntries = data.scoreEntries.map(row => {
                const descriptorScale = rwValidDescriptorScale(row.assessment, row.descriptorScale);
                const c = classifyDisplayScore(Number(row.score), row.scoreType, row.assessment, row.subtest, descriptorScale);
                // A percentile the clinician typed from the score report is kept;
                // a computed one is recomputed (old reports rounded 0.4 to "0").
                const manualPct = row.percentileSource === 'manual' ? reportNumber(row.percentile, 0.01, 99.99) : null;
                const percentile = manualPct != null
                    ? manualPct
                    : rwDisplayPercentile(Number(row.score), row.scoreType, row.assessment, row.subtest);
                const ciLevel = [68, 85, 90, 95, 99].includes(Number(row.ciLevel)) ? Number(row.ciLevel) : null;
                return { ...row, classification: c.label, classColor: c.color, percentile, descriptorScale,
                    percentileSource: manualPct != null ? 'manual' : undefined,
                    ciLow: reportNumber(row.ciLow, 0, 200), ciHigh: reportNumber(row.ciHigh, 0, 200), ciLevel,
                    priorScore: reportNumber(row.priorScore, 0, 200),
                    priorLabel: typeof row.priorLabel === 'string' ? row.priorLabel.trim().slice(0, 60) : '' };
            });
        }
        if (data.factChunks) {
            data.factChunks = data.factChunks.map(chunk => {
                if (!isPlainObject(chunk) || chunk.type !== 'score' || typeof chunk.source !== 'string' || !Number.isFinite(Number(chunk.value))) return chunk;
                const descriptorScale = rwValidDescriptorScale(chunk.source, chunk.descriptorScale);
                return { ...chunk, descriptorScale, classification: classifyDisplayScore(Number(chunk.value), chunk.scoreType, chunk.source, chunk.field, descriptorScale).label };
            });
        }
        if (data.reportGenPasses != null && (!Number.isInteger(Number(data.reportGenPasses)) || Number(data.reportGenPasses) < 1 || Number(data.reportGenPasses) > 5)) {
            throw new Error('reportGenPasses must be between 1 and 5');
        }
        return data;
    };

    const validateDiscrepancyPayload = (raw) => {
        if (!isPlainObject(raw)) throw new Error('Expected a psycheck JSON object');
        const serialized = JSON.stringify(raw);
        if (serialized.length > RW_MAX_DISCREPANCY_JSON_CHARS) {
            throw new Error('Psycheck JSON exceeds the 1 MB limit');
        }
        const data = cloneSafeJson(raw);
        if (!Array.isArray(data.discrepancies)) {
            throw new Error('Missing or non-array "discrepancies" field - not a psycheck report?');
        }
        const stringLimit = 20000;
        const textValue = (value, label, required = false) => {
            if (value == null) {
                if (required) throw new Error(label + ' is required');
                return undefined;
            }
            if (typeof value !== 'string') throw new Error(label + ' must be text');
            if (value.length > stringLimit) throw new Error(label + ' is too large');
            return value;
        };
        const numberValue = (value, label) => {
            if (value == null) return undefined;
            if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error(label + ' must be a finite number');
            return value;
        };
        const spanValue = (value, label) => {
            if (value == null) return undefined;
            if (!isPlainObject(value)) throw new Error(label + ' must be an object');
            const start = numberValue(value.start, label + '.start');
            const end = numberValue(value.end, label + '.end');
            const span = {};
            if (start !== undefined) {
                if (!Number.isInteger(start) || start < 0) throw new Error(label + '.start must be a non-negative integer');
                span.start = start;
            }
            if (end !== undefined) {
                if (!Number.isInteger(end) || end < 0) throw new Error(label + '.end must be a non-negative integer');
                span.end = end;
            }
            if (start !== undefined && end !== undefined && end < start) throw new Error(label + '.end cannot precede start');
            const text = textValue(value.text, label + '.text');
            if (text !== undefined) span.text = text;
            return span;
        };
        const normalizeList = (name, fields, requiredTextFields = []) => {
            const list = data[name] == null ? [] : data[name];
            if (!Array.isArray(list)) throw new Error(name + ' must be a list');
            if (list.length > 2000) throw new Error(name + ' contains too many entries');
            return list.map((item, index) => {
                const label = name + ' row ' + (index + 1);
                if (!isPlainObject(item)) throw new Error(label + ' must be an object');
                const normalized = {};
                for (const field of fields) {
                    const value = item[field];
                    if (field === 'span') {
                        const span = spanValue(value, label + '.span');
                        if (span !== undefined) normalized.span = span;
                    } else if (field === 'value' || field === 'percentile' || field === 'score') {
                        const numeric = numberValue(value, label + '.' + field);
                        if (numeric !== undefined) normalized[field] = numeric;
                    } else {
                        const text = textValue(value, label + '.' + field, requiredTextFields.includes(field));
                        if (text !== undefined) normalized[field] = text;
                    }
                }
                return normalized;
            });
        };
        const discrepancies = normalizeList(
            'discrepancies',
            ['kind', 'detail', 'draft_says', 'data_shows', 'assessment', 'subtest', 'confidence', 'span'],
            ['kind', 'detail']
        );
        const verified = normalizeList(
            'verified',
            ['value', 'assessment', 'subtest', 'classification', 'percentile', 'confidence', 'span']
        );
        const inconclusive = normalizeList(
            'inconclusive',
            ['value', 'assessment', 'subtest', 'classification', 'percentile', 'confidence', 'span']
        );
        const omittedScores = normalizeList(
            'omitted_scores',
            ['assessment', 'subtest', 'score', 'score_type', 'classification', 'percentile']
        );
        const normalizeCount = (value, name) => {
            if (value == null) return undefined;
            if (!Number.isInteger(value) || value < 0) throw new Error(name + ' must be a non-negative integer');
            return value;
        };
        const result = {
            discrepancies,
            verified,
            inconclusive,
            omitted_scores: omittedScores,
            _source: 'psycheck-import',
            _timestamp: new Date().toISOString()
        };
        const sourcesProvided = normalizeCount(data.sources_provided, 'sources_provided');
        const citationsExtracted = normalizeCount(data.citations_extracted, 'citations_extracted');
        if (sourcesProvided !== undefined) result.sources_provided = sourcesProvided;
        if (citationsExtracted !== undefined) result.citations_extracted = citationsExtracted;
        return result;
    };

    // Phase 1: Gemini code-execution opt-in for generation prompts.
    // The 7th arg to callGemini enables a server-side Python sandbox the model
    // can invoke mid-response (arithmetic, score-classification lookups, date
    // math, conversions). Audit prompts intentionally stay LLM-only — we want
    // the Claim Verifier / Contradiction Hunter to reason on their own.
    const RW_CODE_EXEC = true;
    const callGen = (cg, prompt, jsonMode) => cg(prompt, jsonMode, false, null, null, null, RW_CODE_EXEC);
    // A run the clinician stopped. The host's fetch abort arrives as AbortError.
    const rwStoppedError = () => { const err = new Error('Stopped'); err.name = 'AbortError'; err.rwStopped = true; return err; };
    const rwIsStopped = (err) => !!err && (err.rwStopped === true || err.name === 'AbortError');

    const ReportWriterPanel = ({ studentName, abcEntries, observationSessions, aiAnalysis, studentProfile, longitudinalData, dashboardData, callGemini, t, addToast, workStateRef }) => {
        const STEPS = [
            { num: 1, label: __alloT('report_writer.step_student_selection', 'Student Selection'), icon: '👤' },
            { num: 2, label: __alloT('report_writer.step_background_history', 'Background & History'), icon: '📋' },
            { num: 3, label: __alloT('report_writer.step_clinical_observations', 'Clinical Observations'), icon: '🔎' },
            { num: 4, label: __alloT('report_writer.step_assessment_scores', 'Assessment Scores'), icon: '📊' },
            { num: 5, label: __alloT('report_writer.step_fact_chunk_review', 'Fact Chunk Review'), icon: '🔒' },
            { num: 6, label: __alloT('report_writer.step_diagnostic_hypotheses', 'Diagnostic Hypotheses'), icon: '🔬' },
            { num: 7, label: __alloT('report_writer.step_report_blueprint', 'Report Blueprint'), icon: '📐' },
            { num: 8, label: __alloT('report_writer.step_generate_report', 'Generate Report'), icon: '✍️' },
            { num: 9, label: __alloT('report_writer.step_accuracy_dashboard', 'Accuracy Dashboard'), icon: '🎯' },
            { num: 10, label: __alloT('report_writer.step_export_save', 'Export & Save'), icon: '📥' },
        ];
        const [currentStep, setCurrentStep] = useState(1);
        const [studentAge, setStudentAge] = useState('');
        const [studentGrade, setStudentGrade] = useState('');
        const [reportTitle, setReportTitle] = useState('Psychoeducational Evaluation Report');
        // Step 1: Scores
        const [selectedAssessment, setSelectedAssessment] = useState('WISC-V');
        const [scoreEntries, setScoreEntries] = useState([]);
        // Descriptor scale per instrument that has two (WIAT-4, KTEA-3), to match
        // the one chosen when the score report was run.
        const [descriptorScales, setDescriptorScales] = useState({});
        const [customSubtest, setCustomSubtest] = useState('');
        // Score report text being read (never saved) and the rows read from it.
        const [reportPaste, setReportPaste] = useState('');
        const [reportPastePreview, setReportPastePreview] = useState(null);
        const [reportPasteLevel, setReportPasteLevel] = useState(95);
        const [reportPasteImporting, setReportPasteImporting] = useState(false);
        const [customScore, setCustomScore] = useState('');
        const [customScoreType, setCustomScoreType] = useState('');
        const [scoreDetailId, setScoreDetailId] = useState(null);
        const [refImporting, setRefImporting] = useState(false);
        // Step 2: Background
        const [bgSections, setBgSections] = useState(createEmptyBackground);
        // Step 3: Fact chunks
        const [factChunks, setFactChunks] = useState([]);
        const [extracting, setExtracting] = useState(false);
        // Step 4: Report generation
        const [reportSections, setReportSections] = useState({});
        // Earlier versions of each section (newest last): every automated rewrite
        // and every edit can be undone. Session memory only.
        const [sectionHistory, setSectionHistory] = useState({});
        // Fingerprint of the Step 2/3 text the background facts came from.
        const [bgExtractedHash, setBgExtractedHash] = useState(null);
        const reportSectionsRef = useRef(reportSections);
        reportSectionsRef.current = reportSections;
        // Generation, the audit and translation could run for minutes with no
        // way to stop them. The host's callGemini takes an AbortSignal as its
        // 6th argument; a provider that ignores it is stopped when its call
        // returns. 'sections' covers generation and the audit, which never run
        // together.
        const aiRunsRef = useRef({});
        const [stopRequested, setStopRequested] = useState({});
        const [genFraction, setGenFraction] = useState(null);
        const beginAiRun = (kind) => {
            const run = new AbortController();
            aiRunsRef.current[kind] = run;
            setStopRequested(prev => ({ ...prev, [kind]: false }));
            return run;
        };
        const endAiRun = (kind, run) => { if (aiRunsRef.current[kind] === run) delete aiRunsRef.current[kind]; };
        const stopAiRun = (kind) => {
            const run = aiRunsRef.current[kind];
            if (!run || run.signal.aborted) return;
            run.abort();
            setStopRequested(prev => ({ ...prev, [kind]: true }));
        };
        const aiCall = (kind, prompt, jsonMode, codeExec) => {
            const run = aiRunsRef.current[kind];
            const signal = run ? run.signal : null;
            if (signal && signal.aborted) return Promise.reject(rwStoppedError());
            return Promise.resolve(callGemini(prompt, jsonMode, false, null, null, signal, codeExec ? RW_CODE_EXEC : false))
                .then(result => { if (signal && signal.aborted) throw rwStoppedError(); return result; });
        };
        const stopButton = (kind, label) => h('button', {
            type: 'button', onClick: () => stopAiRun(kind), disabled: !!stopRequested[kind],
            className: 'px-3 py-1.5 text-xs font-medium rounded-lg border border-red-300 bg-white text-red-700 hover:bg-red-50 disabled:opacity-60'
        }, stopRequested[kind] ? __alloT('report_writer.stopping', 'Stopping...') : label);
        const [adaptChoice, setAdaptChoice] = useState({});
        const [generating, setGenerating] = useState(false);
        const [genProgress, setGenProgress] = useState('');
        const [reportGenPasses, setReportGenPasses] = useState(3); // triangulated generation: 1-5 parallel passes per section
        // Step 5: Accuracy
        const [accuracyResults, setAccuracyResults] = useState([]);
        const [clinicianAttested, setClinicianAttested] = useState(false);
        // Acknowledgement that the clinician has read the audit's unsourced-claim
        // list. Pinned to the audited fingerprint like the attestation itself, so
        // editing the report retracts it rather than carrying a stale sign-off.
        const [unsourcedAcknowledged, setUnsourcedAcknowledged] = useState(false);
        // Other individuals named in the clinician's text, as [{name, role}].
        // Redacted with their ROLE as the token so the informant distinction
        // ('mother reports X, teacher reports Y') survives redaction.
        const [reportPeople, setReportPeople] = useState([]);
        const [checking, setChecking] = useState(false);
        const [auditStatus, setAuditStatus] = useState('not_run');
        const [auditedFingerprint, setAuditedFingerprint] = useState(null);
        const [persistLocally, setPersistLocally] = useState(() => safeGetItem(PERSIST_PREF_KEY) === 'true');
        // Step 6: Export
        const [importText, setImportText] = useState('');
        const [savedReports, setSavedReports] = useState([]);
        const [saveReportName, setSaveReportName] = useState('');
        // Reference Library
        const [referenceLibrary, setReferenceLibrary] = useState([]);
        // Prior evaluations and IEPs: session memory only (see rwCaseProject).
        const [caseDocuments, setCaseDocuments] = useState([]);
        const [caseImporting, setCaseImporting] = useState(false);
        // Prior scores found in one case document, awaiting the clinician's ticks.
        const [priorFind, setPriorFind] = useState(null);
        const [newCaseTitle, setNewCaseTitle] = useState('');
        const [newCaseText, setNewCaseText] = useState('');
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
        // ─── psycheck handoff (Architecture C) ────────────────────────────
        // External tool (https://github.com/.../psycheck) does deterministic
        // numeric-fidelity verification of an exported draft against the
        // structured scoreEntries and emits a JSON discrepancy report. The
        // clinician imports that JSON here; we render the discrepancies as
        // amber banners attached to the relevant sections.
        //
        // FERPA invariant — this state is RENDER-ONLY:
        //   - never written to setHistory / saveHistory
        //   - never written to Firestore via saveToCloud
        //   - never serialized into snapshot / saveSnapshot
        //   - never included in copyFullReport / printReport / export bundles
        //   - resets on component unmount (component-local useState only)
        // The imported JSON may contain extracted quotes from the source
        // narrative; routing them through any persistence path would
        // join the Tier-2 leak surface.
        const [discrepancyReport, setDiscrepancyReport] = useState(null);
        // Sections the automated score verifier did not clear, as
        // [{section, reason}]. Render-only; drives the disclosure banner so a
        // never-checked section cannot read as a checked-and-clean one.
        const [unverifiedSections, setUnverifiedSections] = useState([]);
        // Evidence ids the model cited that match no verified chunk, as
        // [{section, ids}]. Dropped from the citation trail, surfaced here.
        const [badCitations, setBadCitations] = useState([]);
        const [psycheckFingerprint, setPsycheckFingerprint] = useState(null);
        // ─── Phase D — Dynamic Assessment ingestion ───
        // When DA Studio writes window.__alloDAExport, surface a banner
        // offering to ingest its fact chunks + pre-drafted section into
        // this report. Detect on mount + on the 'alloDAExportReady' event
        // dispatched from DA, so the banner appears whether RW was already
        // open or just got opened.
        const [daExportPayload, setDaExportPayload] = useState(null);
        const [daIngestDismissed, setDaIngestDismissed] = useState(false);
        // Assessment Center RTI export (→ IEP-Ready Packet). Mirrors the DA pair.
        const [rtiExportPayload, setRtiExportPayload] = useState(null);
        const [rtiIngestDismissed, setRtiIngestDismissed] = useState(false);
        const [rtiTrendSeries, setRtiTrendSeries] = useState(null); // for the print trendline SVG
        // Phase 3a: Missing state declarations
        const [manualStudentName, setManualStudentName] = useState(studentName || '');
        const [isDemoLoaded, setIsDemoLoaded] = useState(false);
        const [clinicalObs, setClinicalObs] = useState(createEmptyClinicalObs);
        const [activeObsTab, setActiveObsTab] = useState('testSession');
        const [selectedStudentId, setSelectedStudentId] = useState('');
        // Phase 3a: Translation & Grade-Level Adaptation
        const [translating, setTranslating] = useState(false);
        const [translatedReport, setTranslatedReport] = useState('');
        // The report version a translation was made from; a later change marks it stale.
        const [translatedFingerprint, setTranslatedFingerprint] = useState(null);
        const [translationLang, setTranslationLang] = useState('Spanish');
        const [adaptingSection, setAdaptingSection] = useState(null);
        const [generatingDemo, setGeneratingDemo] = useState(false);
        const [confirmationRequest, setConfirmationRequest] = useState(null);
        const confirmationDialogRef = useRef(null);
        const confirmationOverlayRef = useRef(null);
        const panelRootRef = useRef(null);
        const confirmationCancelRef = useRef(null);
        const confirmationPreviousFocusRef = useRef(null);
        const reducedMotion = useReducedMotion();
        const effectiveStudentName = (manualStudentName || studentName || '').trim();
        const aiCaseDocs = effectiveStudentName ? caseDocuments.filter(d => d.allowAI) : [];
        // Records the local verifier may match a prior score against (never sent).
        const caseRecords = caseDocuments.map(d => ({ title: d.title, text: d.text }));
        useEffect(() => () => rwClearCaseIndex(), []);
        const translationMeta = getTranslationLanguageMeta(translationLang);
        useEffect(() => {
            if (!confirmationRequest) return undefined;
            confirmationPreviousFocusRef.current = document.activeElement;
            const overlay = confirmationOverlayRef.current;
            const panelRoot = panelRootRef.current;
            const outerDialog = overlay && typeof overlay.closest === 'function' ? overlay.closest('[role="dialog"]') : null;
            const backgroundElements = [
                ...(panelRoot ? Array.from(panelRoot.children).filter(element => element !== overlay) : []),
                ...(outerDialog && panelRoot ? Array.from(outerDialog.children).filter(element => element !== panelRoot) : [])
            ];
            const backgroundState = backgroundElements.map(element => ({
                element,
                ariaHidden: element.getAttribute('aria-hidden'),
                hadInert: element.hasAttribute('inert')
            }));
            backgroundElements.forEach(element => {
                element.setAttribute('aria-hidden', 'true');
                element.setAttribute('inert', '');
            });
            const target = confirmationCancelRef.current || confirmationDialogRef.current;
            if (target && typeof target.focus === 'function') target.focus();
            return () => {
                backgroundState.forEach(({ element, ariaHidden, hadInert }) => {
                    if (ariaHidden === null) element.removeAttribute('aria-hidden');
                    else element.setAttribute('aria-hidden', ariaHidden);
                    if (!hadInert) element.removeAttribute('inert');
                });
                const previous = confirmationPreviousFocusRef.current;
                if (previous && document.contains(previous) && typeof previous.focus === 'function') previous.focus();
            };
        }, [confirmationRequest]);
        // Every rewrite of a section goes through here, so the text it replaces
        // can be restored with Undo. `replaceAll` replaces the whole report.
        const RW_SECTION_HISTORY_MAX = 5;
        const replaceSections = (updates, reason, { replaceAll = false } = {}) => {
            const before = reportSectionsRef.current || {};
            const next = replaceAll ? { ...updates } : { ...before, ...updates };
            const changed = Array.from(new Set([...Object.keys(before), ...Object.keys(next)]))
                .filter(k => String(before[k] || '').trim() && before[k] !== next[k]);
            if (changed.length) {
                setSectionHistory(h => {
                    const out = { ...h };
                    changed.forEach(k => { out[k] = [...(out[k] || []), { text: before[k], reason }].slice(-RW_SECTION_HISTORY_MAX); });
                    return out;
                });
            }
            reportSectionsRef.current = next;
            setReportSections(next);
        };
        const undoSection = (section) => {
            const stack = sectionHistory[section] || [];
            if (!stack.length) return;
            const last = stack[stack.length - 1];
            setSectionHistory(h => ({ ...h, [section]: (h[section] || []).slice(0, -1) }));
            const next = { ...reportSectionsRef.current, [section]: last.text };
            reportSectionsRef.current = next;
            setReportSections(next);
            setAccuracyResults([]);
            if (addToast) addToast(rwFmt(__alloT('report_writer.toast_section_restored', 'Restored the earlier "{section}".'), { section }), 'success');
        };
        const undoReasonText = (reason) => ({
            generated: __alloT('report_writer.undo_reason_generated', 'report generated again'),
            regenerated: __alloT('report_writer.undo_reason_regenerated', 'regenerated'),
            adapted: __alloT('report_writer.undo_reason_adapted', 'adapted'),
            audit: __alloT('report_writer.undo_reason_audit', 'corrected by the audit'),
            edited: __alloT('report_writer.undo_reason_edited', 'edited'),
            imported: __alloT('report_writer.undo_reason_imported', 'replaced by an import'),
        })[reason] || reason;
        // One question before replacing work that exists.
        const confirmThen = (needed, request, action) => {
            if (!needed) { action(); return; }
            setConfirmationRequest({ ...request, onConfirm: action });
        };
        const closeConfirmation = () => setConfirmationRequest(null);
        const confirmRequestedAction = () => {
            const action = confirmationRequest && confirmationRequest.onConfirm;
            setConfirmationRequest(null);
            if (typeof action === 'function') action();
        };
        const handleConfirmationKeyDown = event => {
            event.stopPropagation();
            if (event.key === 'Escape') {
                event.preventDefault();
                closeConfirmation();
                return;
            }
            if (event.key !== 'Tab' || !confirmationDialogRef.current) return;
            const focusable = Array.from(confirmationDialogRef.current.querySelectorAll('button:not([disabled]), [tabindex]:not([tabindex="-1"])'))
                .filter(element => element.getAttribute('aria-hidden') !== 'true');
            if (focusable.length === 0) {
                event.preventDefault();
                confirmationDialogRef.current.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        const auditFingerprintBase = useMemo(() => ({
            reportTitle, studentName: effectiveStudentName, studentAge, studentGrade,
            scoreEntries, factChunks, clinicalObs
        }), [reportTitle, effectiveStudentName, studentAge, studentGrade, scoreEntries, factChunks, clinicalObs]);
        const fingerprintForSections = (sections) => JSON.stringify({ ...auditFingerprintBase, reportSections: sections });
        const reportFingerprint = useMemo(() => fingerprintForSections(reportSections), [auditFingerprintBase, reportSections]);
        useEffect(() => {
            if (clinicianAttested && auditedFingerprint !== reportFingerprint) setClinicianAttested(false);
            if (unsourcedAcknowledged && auditedFingerprint !== reportFingerprint) setUnsourcedAcknowledged(false);
        }, [reportFingerprint, auditedFingerprint, clinicianAttested, unsourcedAcknowledged]);
        const buildReportSnapshot = useCallback(() => ({
            schemaVersion: RW_SCHEMA_VERSION,
            reportTitle,
            manualStudentName: effectiveStudentName,
            selectedStudentId,
            studentAge,
            studentGrade,
            selectedAssessment,
            scoreEntries,
            bgSections,
            clinicalObs,
            factChunks,
            reportSections,
            accuracyResults,
            hypotheses,
            selectedHypotheses,
            differentialResults,
            blueprint,
            styleProfile,
            reportType,
            reportGenPasses,
            sectionEvidenceMap,
            // Persisted with the draft: losing it after a reload would silently
            // weaken redaction while the disclosure still reported these names covered.
            reportPeople,
            rtiTrendSeries,
            translatedReport,
            translationLang,
            isDemoLoaded,
            bgExtractedHash,
            savedAt: new Date().toISOString()
        }), [reportTitle, effectiveStudentName, selectedStudentId, studentAge, studentGrade, selectedAssessment, scoreEntries, bgSections, clinicalObs, factChunks, reportSections, accuracyResults, hypotheses, selectedHypotheses, differentialResults, blueprint, styleProfile, reportType, reportGenPasses, sectionEvidenceMap, reportPeople, rtiTrendSeries, translatedReport, translationLang, isDemoLoaded, bgExtractedHash]);


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

        const replaceCaseRequest = () => ({
            title: __alloT('report_writer.confirm_replace_case_title', 'Replace the current report?'),
            message: __alloT('report_writer.confirm_replace_case_message', 'Everything in the current report is cleared first, including unsaved scores, notes, case documents and draft.'),
            confirmLabel: __alloT('report_writer.confirm_replace_case', 'Replace it') });
        // A demo case replaces the whole case, including case documents that
        // could otherwise reach the AI under the demo name.
        const loadDemoCase = (caseKey) => confirmThen(hasReportContent, replaceCaseRequest(), () => {
            resetCaseState({ clearStoredDraft: false, silent: true });
            applyDemoCase(caseKey);
        });
        const applyDemoCase = (caseKey) => {
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
                const classification = classifyDisplayScore(s.score, s.scoreType, s.assessment, s.subtest);
                const percentile = rwDisplayPercentile(s.score, s.scoreType, s.assessment, s.subtest);
                return { id: uid(), assessment: s.assessment, subtest: s.subtest, score: s.score, scoreType: s.scoreType, classification: classification.label, classColor: classification.color, percentile, addedAt: new Date().toISOString() };
            });
            setScoreEntries(demoScores);
            setFactChunks([]);
            setReportSections({});
            setAccuracyResults([]);
            setIsDemoLoaded(true);
            if (addToast) addToast(rwFmt(__alloT('report_writer.toast_demo_case_loaded_demo_data_not', 'Demo case "{label}" loaded — [DEMO DATA, NOT A REAL STUDENT]'), { label: demo.label }), 'success');
        };

        // ── AI-Powered Demo Data Generator ──
        const generateAIDemoCase = () => confirmThen(hasReportContent, replaceCaseRequest(), runAIDemoCase);
        const runAIDemoCase = async () => {
            if (!callGemini) { if (addToast) addToast(t('toasts.ai_available'), 'error'); return; }
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

                const result = await callGen(callGemini, prompt, true);
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
                    const classification = classifyDisplayScore(s.score, s.scoreType, s.assessment, s.subtest);
                    const percentile = rwDisplayPercentile(s.score, s.scoreType, s.assessment, s.subtest);
                    return { id: uid(), assessment: s.assessment, subtest: s.subtest, score: s.score, scoreType: s.scoreType, classification: classification.label, classColor: classification.color, percentile, addedAt: new Date().toISOString() };
                });
                setScoreEntries(demoScores);
                setFactChunks([]);
                setReportSections({});
                setAccuracyResults([]);
                setIsDemoLoaded(true);
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_ai_demo_case_generated_fictional_data', 'AI demo case "{label}" generated — [FICTIONAL DATA, NOT A REAL STUDENT]'), { label: parsed.label }), 'success');
            } catch (err) {
                warnLog('AI demo generation error:', err);
                if (addToast) addToast(t('toasts.ai_demo_generation_failed_try'), 'error');
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
${scrubPII(text)}

Return ONLY the adapted text, no commentary.`;
                // Prose, not JSON mode: JSON mode wrote a JSON literal into the section.
                const result = await callGen(callGemini, prompt, false);
                if (!String(result || '').trim()) throw new Error('empty adaptation');
                replaceSections({ [section]: String(result || '').trim() }, 'adapted');
                setAccuracyResults([]);
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_adapted_for_reading_level', '"{section}" adapted for {targetLevel} reading level'), { section, targetLevel }), 'success');
            } catch (err) {
                warnLog('Grade-level adaptation error:', err);
                if (addToast) addToast(t('toasts.adaptation_failed'), 'error');
            } finally { setAdaptingSection(null); }
        };

        // ── Report Translation ──
        const translateReport = async () => {
            if (!callGemini || Object.keys(reportSections).length === 0) return;
            setTranslating(true);
            const run = beginAiRun('translate');
            try {
                // The date goes in after redaction: "9/23/2026" is a calendar date
                // and came back as [DATE] in every translation.
                const header = scrubPII(`${reportTitle}\nStudent: [Student]\nAge: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'}`) + `\nDate: ${new Date().toLocaleDateString()}\n${'─'.repeat(50)}\n\n`;
                const body = Object.entries(exportSections).map(([k, v]) => `${k.toUpperCase()}\n\n${v}`).join('\n\n' + '─'.repeat(50) + '\n\n');
                const fullReport = header + scrubPII(body);
                const prompt = `Translate the following psychoeducational report into ${translationLang}. Maintain all clinical terminology accuracy — use the accepted ${translationLang} clinical equivalents for assessment names and diagnostic terms. Keep all scores, numbers, and assessment names (WISC-V, BASC-3, etc.) in their original form. Copy every token in square brackets, such as [Student], exactly as written: never translate it. Preserve all formatting including headers and section breaks.\n\n${fullReport}`;
                const result = await aiCall('translate', prompt, false);
                setTranslatedReport(result.trim());
                setTranslatedFingerprint(reportFingerprint);
                if (addToast) addToast((rwFmt(__alloT('report_writer.toast_report_translated_to', 'Report translated to {translationLang}'), { translationLang }) + ' ✅'), 'success');
            } catch (err) {
                if (rwIsStopped(err)) { if (addToast) addToast(__alloT('report_writer.toast_translation_stopped', 'Translation stopped. The earlier translation, if any, was kept.'), 'info'); return; }
                warnLog('Translation error:', err);
                if (addToast) addToast(t('toasts.translation_failed'), 'error');
            } finally { endAiRun('translate', run); setTranslating(false); }
        };
        const copyTranslatedReport = () => {
            const translatedDraft = `UNREVIEWED AI-ASSISTED TRANSLATION — CLINICAL AND LANGUAGE REVIEW REQUIRED\nLanguage: ${translationLang}\n\n${translatedReport.replace(/\[Student\]/g, () => effectiveStudentName || '[Student]')}`;
            navigator.clipboard.writeText(translatedDraft).then(() => {
                if (addToast) addToast(t('toasts.translated_report_copied'), 'success');
            }).catch(() => { if (addToast) addToast(__alloT('report_writer.toast_could_not_copy_the_translated_draft', 'Could not copy the translated draft.'), 'error'); });
        };

        const OBS_TAB_META = [
            { key: 'testSession', label: __alloT('report_writer.field_test_session', 'Test Session'), icon: '\u{1F52C}', placeholder: __alloT('report_writer.placeholder_describe_the_student_behavior_affect_engagement', 'Describe the student behavior, affect, engagement, and effort during the testing session...') },
            { key: 'behavioral', label: __alloT('report_writer.field_classroom_behavioral', 'Classroom/Behavioral'), icon: '\u{1F441}\uFE0F', placeholder: __alloT('report_writer.placeholder_describe_in_vivo_classroom_or_behavioral', 'Describe in-vivo classroom or behavioral observations, including ABC data...') },
            { key: 'parentInterview', label: __alloT('report_writer.field_parent_interview', 'Parent Interview'), icon: '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}', placeholder: __alloT('report_writer.placeholder_summarize_parent_caregiver_interview_notes_or', 'Summarize parent/caregiver interview notes or paste transcript...') },
            { key: 'teacherInterview', label: __alloT('report_writer.field_teacher_interview', 'Teacher Interview'), icon: '\u{1F469}\u200D\u{1F3EB}', placeholder: __alloT('report_writer.placeholder_summarize_teacher_interview_notes_or_paste', 'Summarize teacher interview notes or paste transcript...') },
            { key: 'studentInterview', label: __alloT('report_writer.field_student_interview', 'Student Interview'), icon: '\u{1F9D2}', placeholder: __alloT('report_writer.placeholder_optional_student_self_report_or_interview', 'Optional: student self-report or interview notes...') },
            { key: 'otherSources', label: __alloT('report_writer.field_other_sources', 'Other Sources'), icon: '\u{1F4CE}', placeholder: __alloT('report_writer.placeholder_any_additional_collateral_sources_e_g', 'Any additional collateral sources (e.g., tutor notes, medical records summaries)...') }
        ];

        // ── Auto-load draft from localStorage on mount ──
        useEffect(() => {
            if (!persistLocally) return;
            const draft = safeGetItem(DRAFT_KEY);
            if (draft) {
                try { applyReportSnapshot(JSON.parse(draft), { silent: true, clearStoredDraft: false }); debugLog('Draft restored from localStorage'); }
                catch (e) { warnLog('Draft load error:', e); safeRemoveItem(DRAFT_KEY); }
            }
            const refs = safeGetItem(REFS_STORAGE_KEY);
            if (refs) {
                try {
                    const parsedRefs = cloneSafeJson(JSON.parse(refs));
                    if (!Array.isArray(parsedRefs)) throw new Error('Reference library must be a list');
                    setReferenceLibrary(parsedRefs);
                } catch (e) { warnLog('Reference library load error:', e); safeRemoveItem(REFS_STORAGE_KEY); }
            }
            const styleSaved = safeGetItem(STYLE_STORAGE_KEY);
            if (styleSaved) setStyleProfile(styleSaved.slice(0, 250000));
            const saved = safeGetItem(SAVED_KEY);
            if (saved) {
                try {
                    const parsedSaved = JSON.parse(saved);
                    if (!Array.isArray(parsedSaved)) throw new Error('Saved reports must be a list');
                    setSavedReports(parsedSaved.slice(0, 20).map(validateReportPayload));
                } catch (e) { warnLog('Saved report gallery load error:', e); safeRemoveItem(SAVED_KEY); }
            }
        }, []);

        // ── Auto-save draft (debounced) ──
        useEffect(() => {
            if (!persistLocally) return undefined;
            const timer = setTimeout(() => {
                try {
                    safeSetItem(DRAFT_KEY, JSON.stringify(buildReportSnapshot()));
                } catch (e) { warnLog('Auto-save error:', e); }
            }, 1500);
            return () => clearTimeout(timer);
        }, [persistLocally, buildReportSnapshot]);

        // ── Reference Library + Style persistence ──
        // Rebuild the reference passage index after a reload when the report
        // cites passages, so chips and "References Consulted" resolve. Passage ids
        // are content-derived, so the same library yields the same ids.
        const [, setRefIndexVersion] = useState(0);
        const citesReferences = Object.values(sectionEvidenceMap || {}).some(ids => Array.isArray(ids) && ids.some(id => String(id).startsWith('ref:')));
        useEffect(() => {
            if (!citesReferences || !referenceLibrary.length) return undefined;
            let live = true;
            rwEnsureLumenEvidence().then(ok => {
                if (live && ok) { rwReferenceProject(referenceLibrary); setRefIndexVersion(v => v + 1); }
            });
            return () => { live = false; };
        }, [referenceLibrary, citesReferences]);
        // A large imported reference can exceed the browser's storage quota;
        // safeSetItem then returns false. Say so, or the library silently
        // disappears on the next visit.
        useEffect(() => {
            if (!persistLocally) return;
            if (!safeSetItem(REFS_STORAGE_KEY, JSON.stringify(referenceLibrary)) && addToast) {
                addToast(__alloT('report_writer.toast_your_references_are_too_large_to', 'Your references are too large to save on this device. They will be kept only until you close the Report Writer.'), 'info');
            }
        }, [referenceLibrary, persistLocally]);
        useEffect(() => { if (persistLocally) safeSetItem(STYLE_STORAGE_KEY, styleProfile); }, [styleProfile, persistLocally]);
        useEffect(() => { safeSetItem(PERSIST_PREF_KEY, persistLocally ? 'true' : 'false'); }, [persistLocally]);

        // ── Phase D — DA export detection ──
        // Check for window.__alloDAExport on mount + listen for the custom
        // event DA dispatches when it stashes a payload. If found, surface
        // the ingest banner. Dismissal is local to this RW session.
        useEffect(() => {
            const check = () => {
                if (typeof window !== 'undefined' && window.__alloDAExport) {
                    setDaExportPayload(window.__alloDAExport);
                    setDaIngestDismissed(false);
                }
            };
            check();
            const handler = () => check();
            if (typeof window !== 'undefined') {
                window.addEventListener('alloDAExportReady', handler);
                return () => {
                    try { window.removeEventListener('alloDAExportReady', handler); } catch (e) { /* ignore */ }
                };
            }
        }, []);

        // ── RTI export detection (Assessment Center → IEP packet; mirrors DA) ──
        useEffect(() => {
            const check = () => {
                if (typeof window !== 'undefined' && window.__alloRTIExport) {
                    setRtiExportPayload(window.__alloRTIExport);
                    setRtiIngestDismissed(false);
                }
            };
            check();
            const handler = () => check();
            if (typeof window !== 'undefined') {
                window.addEventListener('alloRTIExportReady', handler);
                return () => {
                    try { window.removeEventListener('alloRTIExportReady', handler); } catch (e) { /* ignore */ }
                };
            }
        }, []);

        // ── Phase D — Ingest action ──
        // Pulls DA fact chunks into factChunks (auto-verified since they're
        // structured + clinician-controlled), pre-populates the
        // 'Dynamic Assessment Results' section text, and enables the
        // section in the blueprint if it's currently disabled. Clears the
        // global afterward so the same payload isn't ingested twice.
        const ingestDaExport = () => {
            if (!daExportPayload) return;
            const incomingChunks = (daExportPayload.factChunks || []).map(c => ({
                ...c,
                origin: 'ingested',
                verified: true,   // DA chunks are structured-data; auto-verify
                immutable: false  // Clinician can still edit/reject
            }));
            setFactChunks(prev => [...prev, ...incomingChunks]);
            const sectionName = daExportPayload.targetSectionName || 'Dynamic Assessment Results';
            const sectionText = daExportPayload.prePopulatedSection || '';
            if (sectionText) {
                replaceSections({ [sectionName]: sectionText }, 'imported');
            }
            // Enable the section in the blueprint if it's there but disabled
            setBlueprint(prev => {
                const idx = prev.findIndex(s => s.name === sectionName);
                if (idx === -1) {
                    return [...prev, { id: uid(), name: sectionName, notes: 'Auto-added from Dynamic Assessment export', enabled: true }];
                }
                if (prev[idx].enabled) return prev;
                const next = prev.slice();
                next[idx] = { ...next[idx], enabled: true };
                return next;
            });
            // Clear the global so duplicate ingest isn't possible
            try { delete window.__alloDAExport; } catch (e) { window.__alloDAExport = null; }
            setDaExportPayload(null);
            setDaIngestDismissed(false);
            if (addToast) addToast(('✅ ' + rwFmt(__alloT('report_writer.toast_ingested_da_fact_chunks_section_draft', 'Ingested {count} DA fact chunks + section draft'), { count: incomingChunks.length })), 'success');
        };
        const dismissDaExport = () => {
            setDaIngestDismissed(true);
            // Don't clear the global — user might want it later
        };

        // ── RTI ingest → IEP-Ready Packet ──
        // Unlike DA (whose factChunks are already chunk OBJECTS), the Assessment
        // Center emits factChunks as plain STRINGS, so map each into the RW chunk
        // shape. Then switch to the IEP blueprint and pre-draft its data sections
        // from the deterministic prePopulatedSections map (all editable). Clears the
        // global afterward so the same payload can't be double-ingested.
        const ingestRtiExport = () => {
            if (!rtiExportPayload) return;
            const incomingChunks = (rtiExportPayload.factChunks || []).map(str => ({
                id: uid(),
                type: 'background',
                source: 'AssessmentCenter (RTI)',
                field: 'RTI / CBM',
                value: String(str),
                verified: true,   // structured screening data — auto-verify
                immutable: false, // clinician can still edit/reject
                origin: 'ingested'
            }));
            if (rtiExportPayload.caveat) {
                incomingChunks.push({ id: uid(), type: 'background', source: 'AssessmentCenter (RTI)', field: 'Caveat', value: String(rtiExportPayload.caveat), verified: true, immutable: false, origin: 'ingested' });
            }
            setFactChunks(prev => [...prev, ...incomingChunks]);
            setRtiTrendSeries(Array.isArray(rtiExportPayload.trendSeries) ? rtiExportPayload.trendSeries : null);
            // Switch to the IEP-Ready Packet blueprint (the intent of an RTI hand-off);
            // reportSections content persists across the swap.
            const iepTemplate = BLUEPRINT_TEMPLATES['IEP-Ready Packet'];
            if (iepTemplate) {
                setReportType('IEP-Ready Packet');
                setBlueprint(iepTemplate.map(s => ({ ...s, id: uid() })));
            }
            const sections = rtiExportPayload.prePopulatedSections || {};
            const incomingSections = {};
            Object.keys(sections).forEach(name => { if (sections[name]) incomingSections[name] = sections[name]; });
            replaceSections(incomingSections, 'imported');
            try { delete window.__alloRTIExport; } catch (e) { window.__alloRTIExport = null; }
            setRtiExportPayload(null);
            setRtiIngestDismissed(false);
            if (addToast) addToast(('✅ ' + rwFmt(__alloT('report_writer.toast_ingested_rti_fact_chunks_section_drafts', 'Ingested {count} RTI fact chunks + {count2} section drafts → IEP-Ready Packet'), { count: incomingChunks.length, count2: Object.keys(sections).length })), 'success');
        };
        const dismissRtiExport = () => {
            setRtiIngestDismissed(true);
        };

        // ── Saved Reports helpers ──
        const resetCaseState = ({ clearStoredDraft = true, silent = false } = {}) => {
            if (clearStoredDraft) safeRemoveItem(DRAFT_KEY);
            setCurrentStep(1);
            setReportTitle('Psychoeducational Evaluation Report');
            setManualStudentName(studentName || '');
            setSelectedStudentId('');
            setStudentAge('');
            setStudentGrade('');
            setSelectedAssessment('WISC-V');
            setScoreEntries([]);
            setDescriptorScales({});
            setCaseDocuments([]);
            rwClearCaseIndex();
            setPriorFind(null);
            setReportPaste('');
            setReportPastePreview(null);
            setCustomSubtest('');
            setCustomScore('');
            setBgSections(createEmptyBackground());
            setClinicalObs(createEmptyClinicalObs());
            setActiveObsTab('testSession');
            setFactChunks([]);
            setExtracting(false);
            setReportSections({});
            setSectionHistory({});
            setAdaptChoice({});
            setBgExtractedHash(null);
            // The previous case's family and staff names must not keep redacting,
            // or be sent, in the next student's report.
            setReportPeople([]);
            setUnverifiedSections([]);
            setBadCitations([]);
            setGenerating(false);
            setGenProgress('');
            setReportGenPasses(3);
            setAccuracyResults([]);
            setAuditStatus('not_run');
            setAuditedFingerprint(null);
            setClinicianAttested(false);
            setUnsourcedAcknowledged(false);
            setChecking(false);
            setImportText('');
            setSaveReportName('');
            setNewRefName('');
            setNewRefText('');
            setHypotheses(['No Diagnosis / Does Not Qualify']);
            setSelectedHypotheses([]);
            setDifferentialResults({});
            setRunningDifferential(false);
            setNewHypothesis('');
            setBlueprint(BLUEPRINT_TEMPLATES['Psychoeducational'].map(s => ({ ...s, id: uid() })));
            setReportType('Psychoeducational');
            setSectionEvidenceMap({});
            setEditingSection(null);
            setEditSectionText('');
            setRegenSection(null);
            setRegenInstructions('');
            setShowRegenInput(null);
            setDiscrepancyReport(null);
            setPsycheckFingerprint(null);
            setDaIngestDismissed(false);
            setRtiIngestDismissed(false);
            setRtiTrendSeries(null);
            setIsDemoLoaded(false);
            setTranslating(false);
            setTranslatedReport('');
            setTranslatedFingerprint(null);
            setTranslationLang('Spanish');
            setAdaptingSection(null);
            setGeneratingDemo(false);
            if (!silent && addToast) addToast(t('toasts.draft_cleared'), 'info');
        };
        const applyReportSnapshot = (raw, { silent = false, clearStoredDraft = false } = {}) => {
            const data = validateReportPayload(raw);
            resetCaseState({ clearStoredDraft, silent: true });
            setReportTitle(data.reportTitle || 'Psychoeducational Evaluation Report');
            setManualStudentName(data.manualStudentName || studentName || '');
            setSelectedStudentId(data.selectedStudentId || '');
            setStudentAge(data.studentAge || '');
            setStudentGrade(data.studentGrade || '');
            setSelectedAssessment(data.selectedAssessment || 'WISC-V');
            setScoreEntries(data.scoreEntries || []);
            setDescriptorScales(Object.fromEntries((data.scoreEntries || []).filter(r => r.descriptorScale).map(r => [r.assessment, r.descriptorScale])));
            setBgSections({ ...createEmptyBackground(), ...(data.bgSections || {}) });
            setClinicalObs({ ...createEmptyClinicalObs(), ...(data.clinicalObs || {}) });
            setFactChunks(data.factChunks || []);
            // A report saved before the fingerprint existed is taken as in step.
            setBgExtractedHash(data.bgExtractedHash
                || ((data.factChunks || []).some(rwIsExtractedBackground) ? rwTextHash(rwBackgroundSourceText({ ...createEmptyBackground(), ...(data.bgSections || {}) }, { ...createEmptyClinicalObs(), ...(data.clinicalObs || {}) })) : null));
            setReportSections(data.reportSections || {});
            setAccuracyResults(data.accuracyResults || []);
            setHypotheses(data.hypotheses?.length ? data.hypotheses : ['No Diagnosis / Does Not Qualify']);
            setSelectedHypotheses(data.selectedHypotheses || []);
            setDifferentialResults(data.differentialResults || {});
            if (data.blueprint?.length) setBlueprint(data.blueprint);
            if (data.styleProfile != null) setStyleProfile(data.styleProfile);
            setReportType(data.reportType || 'Psychoeducational');
            setReportGenPasses(Number(data.reportGenPasses) || 3);
            setSectionEvidenceMap(data.sectionEvidenceMap || {});
            setReportPeople(Array.isArray(data.reportPeople) ? data.reportPeople : []);
            setRtiTrendSeries(Array.isArray(data.rtiTrendSeries) ? data.rtiTrendSeries : null);
            setTranslatedReport(data.translatedReport || '');
            setTranslationLang(data.translationLang || 'Spanish');
            setIsDemoLoaded(Boolean(data.isDemoLoaded));
            setAuditStatus('not_run');
            setAuditedFingerprint(null);
            setClinicianAttested(false);
            setUnsourcedAcknowledged(false);
            setDiscrepancyReport(null);
            setPsycheckFingerprint(null);
            setCurrentStep(1);
            if (!silent && addToast) addToast(__alloT('report_writer.toast_report_data_loaded_rerun_the_accuracy', 'Report data loaded; rerun the accuracy audit before formal export.'), 'success');
            return data;
        };
        const saveReportToGallery = () => {
            const name = saveReportName.trim() || `Report ${new Date().toLocaleDateString()}`;
            const entry = { ...buildReportSnapshot(), id: uid(), name, savedAt: new Date().toISOString() };
            const updated = [entry, ...savedReports].slice(0, 20);
            setSavedReports(updated);
            setSaveReportName('');
            const persisted = persistLocally ? safeSetItem(SAVED_KEY, JSON.stringify(updated)) : false;
            if (addToast) addToast(
                persistLocally ? (persisted ? rwFmt(__alloT('report_writer.toast_report_saved_on_this_device', 'Report "{name}" saved on this device'), { name }) : rwFmt(__alloT('report_writer.toast_report_kept_for_this_session_device', 'Report "{name}" kept for this session; device storage failed'), { name })) : rwFmt(__alloT('report_writer.toast_report_saved_for_this_session_only', 'Report "{name}" saved for this session only'), { name }),
                persistLocally && !persisted ? 'info' : 'success'
            );
        };
        const loadSavedReport = (entry) => confirmThen(unsavedWork, replaceCaseRequest(), () => {
            try { applyReportSnapshot(entry); }
            catch (e) { if (addToast) addToast(rwFmt(__alloT('report_writer.toast_could_not_load_saved_report', 'Could not load saved report: {message}'), { message: e.message }), 'error'); }
        });
        const deleteSavedReport = (id) => {
            const entry = savedReports.find(r => r.id === id);
            setConfirmationRequest({
                title: rwFmt(__alloT('report_writer.confirm_delete_saved_title', 'Delete "{name}"?'), { name: (entry && entry.name) || '' }),
                message: __alloT('report_writer.confirm_delete_saved_message', 'The saved copy is deleted. The report open now is not affected.'),
                confirmLabel: __alloT('report_writer.confirm_delete_saved', 'Delete'),
                onConfirm: () => removeSavedReport(id)
            });
        };
        const removeSavedReport = (id) => {
            const updated = savedReports.filter(r => r.id !== id);
            setSavedReports(updated);
            if (persistLocally) safeSetItem(SAVED_KEY, JSON.stringify(updated));
        };
        const clearDraft = () => resetCaseState();
        // Turning storage off deletes what is stored, like the Clear button.
        const updatePersistence = (enabled) => confirmThen(!enabled, {
            title: __alloT('report_writer.confirm_stop_storing_title', 'Stop storing on this device?'),
            message: __alloT('report_writer.confirm_stop_storing_message', 'Drafts, saved reports, references and style guidance stored in this browser are deleted. The open report stays until you close the Report Writer.'),
            confirmLabel: __alloT('report_writer.confirm_stop_storing', 'Stop storing and delete') }, () => applyPersistence(enabled));
        const applyPersistence = (enabled) => {
            setPersistLocally(enabled);
            if (!enabled) {
                [DRAFT_KEY, SAVED_KEY, REFS_STORAGE_KEY, STYLE_STORAGE_KEY].forEach(safeRemoveItem);
                if (addToast) addToast(__alloT('report_writer.toast_persistent_device_storage_disabled_and_stored', 'Persistent device storage disabled and stored clinical data cleared. Current session data remains open.'), 'info');
            } else {
                safeSetItem(DRAFT_KEY, JSON.stringify(buildReportSnapshot()));
                safeSetItem(SAVED_KEY, JSON.stringify(savedReports));
                safeSetItem(REFS_STORAGE_KEY, JSON.stringify(referenceLibrary));
                safeSetItem(STYLE_STORAGE_KEY, styleProfile);
                if (addToast) addToast(__alloT('report_writer.toast_persistent_device_storage_enabled_current_sessio', 'Persistent device storage enabled. Current session data was stored unencrypted in this browser profile.'), 'info');
            }
        };
        const clearStoredClinicalData = () => {
            setPersistLocally(false);
            [DRAFT_KEY, SAVED_KEY, REFS_STORAGE_KEY, STYLE_STORAGE_KEY].forEach(safeRemoveItem);
            setSavedReports([]);
            if (addToast) addToast(__alloT('report_writer.toast_stored_report_writer_data_cleared_from', 'Stored Report Writer data cleared from this device. Current unsaved session remains open.'), 'success');
        };

        // ── PII scrubbing ──
        // Delegates to the module-scope scrubIdentifiers so all 18 call sites
        // keep their single-argument shape. `reportPeople` lets the clinician
        // name other individuals (parent, teacher) for role-preserving
        // redaction; empty by default, so behaviour without it is just the
        // student name plus structured identifiers.
        const scrubPII = (text) => scrubIdentifiers(text, {
            studentName: effectiveStudentName,
            people: reportPeople
        });

        // ── Step 1: Add score entry ──
        // Returns true when the score was added, so the caller clears its input
        // only then. `scoreTypeOverride` lets a custom subtest be a scaled score
        // under an instrument whose presets are composites.
        const addScoreEntry = (subtest, score, scoreTypeOverride) => {
            const preset = ASSESSMENT_PRESETS[selectedAssessment] || {};
            const scoreType = scoreTypeOverride || preset.scoreType || 'standard';
            const name = String(subtest || '').trim();
            if (!name) { if (addToast) addToast(__alloT('report_writer.toast_enter_a_subtest_name', 'Enter a subtest name.'), 'error'); return false; }
            // Two rows for one subtest make the verifier check the draft against
            // whichever it happens to keep.
            if (scoreEntries.some(s => s.assessment === selectedAssessment && String(s.subtest).trim().toLowerCase() === name.toLowerCase())) {
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_is_already_entered_remove_it_first', '{selectedAssessment} {name} is already entered. Remove it first to change the score.'), { selectedAssessment, name }), 'error');
                return false;
            }
            const problem = rwScoreEntryProblem(score, scoreType, selectedAssessment, name);
            if (problem && problem.level === 'error') { if (addToast) addToast(problem.message, 'error'); return false; }
            if (problem && addToast) addToast(problem.message, 'info');
            const numScore = Number(score);
            const descriptorScale = descriptorScaleFor(selectedAssessment);
            const classification = classifyDisplayScore(numScore, scoreType, selectedAssessment, name, descriptorScale);
            const percentile = rwDisplayPercentile(numScore, scoreType, selectedAssessment, name);
            setScoreEntries(prev => [...prev, {
                id: uid(), assessment: selectedAssessment, subtest: name, score: numScore,
                scoreType, classification: classification.label,
                classColor: classification.color, percentile, descriptorScale,
                addedAt: new Date().toISOString()
            }]);
            return true;
        };
        const descriptorScaleFor = (assessment) => RW_DESCRIPTOR_SCALES[assessment]
            ? (descriptorScales[assessment] || RW_DESCRIPTOR_SCALES[assessment].default) : undefined;
        // Relabels every score of the instrument, and its fact chunks, so the
        // labels the AI and the verifier see match the chosen scale.
        const changeDescriptorScale = (assessment, scheme) => {
            const valid = rwValidDescriptorScale(assessment, scheme);
            if (!valid) return;
            setDescriptorScales(prev => ({ ...prev, [assessment]: valid }));
            setScoreEntries(prev => prev.map(row => {
                if (row.assessment !== assessment) return row;
                const c = classifyDisplayScore(Number(row.score), row.scoreType, row.assessment, row.subtest, valid);
                return { ...row, descriptorScale: valid, classification: c.label, classColor: c.color };
            }));
            setFactChunks(prev => prev.map(c => (c.type === 'score' && c.source === assessment
                ? { ...c, descriptorScale: valid, classification: classifyDisplayScore(Number(c.value), c.scoreType, c.source, c.field, valid).label } : c)));
        };
        const removeScoreEntry = (id) => setScoreEntries(prev => prev.filter(s => s.id !== id));
        const updateScoreEntry = (id, patch) => setScoreEntries(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
        // Add a reference from a file through Lumen's document reader. Its own
        // refusals (a scanned PDF with no text layer, an over-long file) are
        // shown as they are, since they tell the clinician what to do next.
        const importReferenceFile = async (input) => {
            const file = input && input.files && input.files[0];
            if (!file) return;
            setRefImporting(true);
            try {
                if (!(await rwEnsureLumenDocuments())) throw new Error(__alloT('report_writer.document_reader_could_not_load', 'The document reader could not load. Paste the text instead.'));
                const spec = await window.LumenDocuments.extractLocalDocument(file);
                setReferenceLibrary(prev => [...prev, { id: uid(), name: spec.title, text: spec.content, addedAt: new Date().toISOString(), fileName: spec.fileName || file.name, fileFormat: spec.fileFormat || '' }]);
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_added_characters_to_your_references', 'Added "{title}" ({value} characters) to your references.'), { title: spec.title, value: spec.content.length.toLocaleString() }), 'success');
            } catch (e) {
                if (addToast) addToast((e && e.message) || __alloT('report_writer.toast_that_file_could_not_be_read', 'That file could not be read.'), 'error');
            } finally {
                setRefImporting(false);
                try { input.value = ''; } catch (_) { /* some browsers lock the value */ }
            }
        };
        // Scores read from a pasted score report, shown for the clinician to tick.
        const readReportPaste = (text) => {
            const existing = new Set(scoreEntries.filter(x => x.assessment === selectedAssessment).map(x => String(x.subtest).trim().toLowerCase()));
            const result = rwParseScoreReport(text, selectedAssessment, { existing, descriptorScale: descriptorScaleFor(selectedAssessment) });
            setReportPastePreview({ ...result, assessment: selectedAssessment });
            setReportPasteLevel(result.ciLevel || 95);
        };
        const importReportPasteFile = async (input) => {
            const file = input && input.files && input.files[0];
            if (!file) return;
            setReportPasteImporting(true);
            try {
                if (!(await rwEnsureLumenDocuments())) throw new Error(__alloT('report_writer.document_reader_could_not_load', 'The document reader could not load. Paste the text instead.'));
                const spec = await window.LumenDocuments.extractLocalDocument(file);
                readReportPaste(spec.content);
            } catch (e) {
                if (addToast) addToast((e && e.message) || __alloT('report_writer.toast_that_file_could_not_be_read', 'That file could not be read.'), 'error');
            } finally {
                setReportPasteImporting(false);
                try { input.value = ''; } catch (_) { /* some browsers lock the value */ }
            }
        };
        const addPastedScores = () => {
            const p = reportPastePreview;
            if (!p) return;
            const scheme = RW_DESCRIPTOR_SCALES[p.assessment] ? (p.descriptorScale || descriptorScaleFor(p.assessment)) : undefined;
            if (scheme && scheme !== descriptorScaleFor(p.assessment)) changeDescriptorScale(p.assessment, scheme);
            const taken = new Set(scoreEntries.filter(x => x.assessment === p.assessment).map(x => String(x.subtest).trim().toLowerCase()));
            const now = new Date().toISOString();
            const added = p.rows.filter(r => r.include && !taken.has(r.subtest.toLowerCase())).map(r => {
                const c = classifyDisplayScore(r.score, r.scoreType, p.assessment, r.subtest, scheme);
                const fromReport = r.percentile != null;
                return { id: uid(), assessment: p.assessment, subtest: r.subtest, score: r.score, scoreType: r.scoreType,
                    classification: c.label, classColor: c.color,
                    percentile: fromReport ? r.percentile : rwDisplayPercentile(r.score, r.scoreType, p.assessment, r.subtest),
                    percentileSource: fromReport ? 'manual' : undefined,
                    ciLow: r.ciLow, ciHigh: r.ciHigh, ciLevel: r.ciLow != null ? reportPasteLevel : null,
                    descriptorScale: scheme, addedAt: now };
            });
            if (added.length) setScoreEntries(prev => [...prev, ...added]);
            setReportPastePreview(null);
            setReportPaste('');
            if (addToast) addToast(rwFmt(__alloT('report_writer.toast_paste_added', 'Added {count} score(s) from the score report. Check each one against the report.'), { count: added.length }), added.length ? 'success' : 'info');
        };
        const pasteIssueText = (x, r, assessment) => {
            switch (x.code) {
                case 'unrecognised': return rwFmt(__alloT('report_writer.paste_issue_unrecognised', 'Not a {assessment} score this tool lists; tick it to add it as a custom subtest.'), { assessment });
                case 'no_evidence': return __alloT('report_writer.paste_issue_no_evidence', 'No percentile or interval on this line; check that it is a score.');
                case 'score_outside_interval': return __alloT('report_writer.paste_issue_outside_interval', 'The score is outside the interval on this line.');
                case 'percentile_mismatch': return rwFmt(__alloT('report_writer.paste_issue_percentile_mismatch', 'Percentile {pct} does not fit a score of {score}, so it is not recorded; check the line.'), { pct: x.pct, score: r.score });
                case 'percentile_bound': return rwFmt(__alloT('report_writer.paste_issue_percentile_bound', 'The report gives {sign}{value}; recorded as {value}.'), { sign: x.sign, value: x.value });
                case 'no_percentile_printed': return __alloT('report_writer.paste_issue_no_percentile_printed', 'This report prints no percentile to check the score against; the score is taken as the last number on the line. Check it.');
                case 'already_entered': return __alloT('report_writer.paste_issue_already_entered', 'Already entered.');
                case 'duplicate': return __alloT('report_writer.paste_issue_duplicate', 'Appears twice in the pasted text.');
                case 'label_differs': return rwFmt(__alloT('report_writer.paste_issue_label_differs', 'The report says "{report}"; AlloFlow labels {score} "{ours}".'), { report: x.report, ours: x.ours, score: r.score });
                default: return x.message || '';
            }
        };
        // Prior scores from a case document: its score lines, read for each
        // instrument entered in Step 4 and matched to the rows entered there.
        // The default label comes from a year in the document's TITLE only; a
        // year in its text may be a date of birth.
        const findPriorScores = (doc) => {
            const rows = [];
            Array.from(new Set(scoreEntries.map(x => x.assessment))).forEach(assessment => {
                rwParseScoreReport(doc.text, assessment).rows.forEach(r => {
                    if (!r.known || r.issues.some(x => ['no_evidence', 'score_outside_interval', 'duplicate'].includes(x.code))) return;
                    const entry = scoreEntries.find(x => x.assessment === assessment && String(x.subtest).trim().toLowerCase() === r.subtest.toLowerCase());
                    if (entry && !rows.some(y => y.entryId === entry.id)) rows.push({ entryId: entry.id, assessment, subtest: entry.subtest, score: r.score, include: true });
                });
            });
            const year = (String(doc.title || '').match(/\b(?:19|20)\d{2}\b/) || [])[0];
            setPriorFind({ docId: doc.id, rows, label: year ? rwFmt(__alloT('report_writer.prior_label_default', '{year} evaluation'), { year }) : '' });
        };
        const attachPriorScores = () => {
            if (!priorFind) return;
            const chosen = priorFind.rows.filter(r => r.include);
            const label = String(priorFind.label || '').trim().slice(0, 60);
            setScoreEntries(prev => prev.map(x => { const r = chosen.find(c => c.entryId === x.id); return r ? { ...x, priorScore: r.score, priorLabel: label } : x; }));
            setPriorFind(null);
            if (addToast) addToast(rwFmt(__alloT('report_writer.toast_prior_recorded', 'Recorded {count} prior score(s). Check each one against the earlier report.'), { count: chosen.length }), 'success');
        };
        // A case document from a file or pasted text. It stays out of every
        // prompt until the clinician turns it on (allowAI).
        const addCaseDocument = (title, text, fileName) => {
            const name = String(title || '').trim() || __alloT('report_writer.case_document_default_title', 'Case document');
            setCaseDocuments(prev => [...prev, { id: uid(), title: name, text: String(text || ''), fileName: fileName || '', allowAI: false, addedAt: new Date().toISOString() }]);
            if (addToast) addToast(rwFmt(__alloT('report_writer.toast_case_document_added', 'Added case document "{title}" ({count} characters). It is not used with the AI until you turn that on.'), { title: name, count: String(text || '').length.toLocaleString() }), 'success');
        };
        const importCaseFile = async (input) => {
            const file = input && input.files && input.files[0];
            if (!file) return;
            setCaseImporting(true);
            try {
                if (!(await rwEnsureLumenDocuments())) throw new Error(__alloT('report_writer.document_reader_could_not_load', 'The document reader could not load. Paste the text instead.'));
                const spec = await window.LumenDocuments.extractLocalDocument(file);
                addCaseDocument(spec.title, spec.content, spec.fileName || file.name);
            } catch (e) {
                if (addToast) addToast((e && e.message) || __alloT('report_writer.toast_that_file_could_not_be_read', 'That file could not be read.'), 'error');
            } finally {
                setCaseImporting(false);
                try { input.value = ''; } catch (_) { /* some browsers lock the value */ }
            }
        };
        // Report values are committed on blur, so a half-typed "0." never
        // becomes data. An invalid value is refused and the field restored.
        const commitReportPercentile = (s, input) => {
            const text = String(input.value).trim();
            if (text === '') {
                if (s.percentileSource === 'manual') updateScoreEntry(s.id, { percentile: rwDisplayPercentile(s.score, s.scoreType, s.assessment, s.subtest), percentileSource: undefined });
                return;
            }
            const v = Number(text);
            if (!(v > 0 && v < 100)) {
                if (addToast) addToast(__alloT('report_writer.toast_a_percentile_is_between_0_1', 'A percentile is between 0.1 and 99.9.'), 'error');
                input.value = s.percentileSource === 'manual' ? s.percentile : '';
                return;
            }
            updateScoreEntry(s.id, { percentile: v, percentileSource: 'manual' });
        };
        const commitReportCI = (s, field, input) => {
            const text = String(input.value).trim();
            if (text === '') { updateScoreEntry(s.id, { [field]: null }); return; }
            const v = Number(text);
            if (!Number.isFinite(v) || v < 0 || v > 200) {
                if (addToast) addToast(__alloT('report_writer.toast_enter_the_interval_bound_from_the', 'Enter the interval bound from the score report.'), 'error');
                input.value = s[field] ?? '';
                return;
            }
            updateScoreEntry(s.id, { [field]: v, ciLevel: s.ciLevel || 95 });
        };

        const commitPriorScore = (s, input) => {
            const text = String(input.value).trim();
            if (text === '') { updateScoreEntry(s.id, { priorScore: null }); return; }
            const v = Number(text);
            const [lo, hi] = RW_SCALE_LIMITS[rwScoreScale(s.scoreType, s.assessment, s.subtest, s.descriptorScale)].hard;
            if (!Number.isFinite(v) || v < lo || v > hi) {
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_prior_score_range', 'Enter the prior score as the earlier report gives it ({min}-{max}).'), { min: lo, max: hi }), 'error');
                input.value = s.priorScore ?? '';
                return;
            }
            updateScoreEntry(s.id, { priorScore: v });
        };
        const commitPriorLabel = (s, input) => updateScoreEntry(s.id, { priorLabel: String(input.value).trim().slice(0, 60) });

        // ── Step 2: Import from BehaviorLens ──
        const importFromBehaviorLens = () => {
            // Import caps are real data loss on a clinical record: a student with
            // 40 ABC entries silently contributed 10, under a plain success toast.
            // The caps stay (prompt-size discipline) but are now DISCLOSED, both
            // in the toast and inline in the imported text the clinician reads.
            const ABC_CAP = 10;
            const OBS_CAP = 5;
            const NOTE_CAP = 200;
            const abcTotal = (abcEntries && abcEntries.length) || 0;
            const obsTotal = (observationSessions && observationSessions.length) || 0;
            let notesTruncated = 0;
            let behavioral = bgSections.behavioral || '';
            if (abcTotal > 0) {
                behavioral += '\n\n--- Imported from BehaviorLens ABC Data ---\n';
                if (abcTotal > ABC_CAP) behavioral += `[NOTE: showing the first ${ABC_CAP} of ${abcTotal} ABC entries. ${abcTotal - ABC_CAP} not imported.]\n`;
                abcEntries.slice(0, ABC_CAP).forEach((e, i) => {
                    behavioral += `\n${i + 1}. Antecedent: ${e.antecedent || 'N/A'} | Behavior: ${e.behavior || 'N/A'} | Consequence: ${e.consequence || 'N/A'} | Function: ${e.function || 'unknown'}`;
                });
            }
            let observations = bgSections.observations || '';
            if (obsTotal > 0) {
                observations += '\n\n--- Imported from BehaviorLens Observation Sessions ---\n';
                if (obsTotal > OBS_CAP) observations += `[NOTE: showing the first ${OBS_CAP} of ${obsTotal} sessions. ${obsTotal - OBS_CAP} not imported.]\n`;
                observationSessions.slice(0, OBS_CAP).forEach((s, i) => {
                    const rawNote = s.notes || '';
                    const note = rawNote.length > NOTE_CAP ? rawNote.substring(0, NOTE_CAP) + ' [\u2026 note truncated]' : rawNote;
                    if (rawNote.length > NOTE_CAP) notesTruncated++;
                    observations += `\nSession ${i + 1}: ${s.date || ''} | Type: ${s.type || 'general'} | Duration: ${s.duration || 'N/A'} | Notes: ${note}`;
                });
            }
            setBgSections(prev => ({ ...prev, behavioral, observations }));
            if (addToast) {
                const dropped = [];
                if (abcTotal > ABC_CAP) dropped.push(`${abcTotal - ABC_CAP} ABC entry(ies)`);
                if (obsTotal > OBS_CAP) dropped.push(`${obsTotal - OBS_CAP} session(s)`);
                if (notesTruncated > 0) dropped.push(`${notesTruncated} shortened note(s)`);
                if (dropped.length > 0) {
                    addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_imported_with_limits_not_included_add', 'Imported with limits — not included: {value}. Add anything essential by hand.'), { value: dropped.join(', ') })), 'info');
                } else {
                    addToast(t('toasts.behaviorlens_data_imported'), 'success');
                }
            }
        };

        // ── Step 2: Import Longitudinal Student Progress ──
        const importStudentProgress = () => {
            if (!longitudinalData) { if (addToast) addToast(t('toasts.student_progress_data_available'), 'info'); return; }
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
            // 2026-08-23: reads the student-scoped math probes from probe
            // history ({activity:'math_dcpm', dcpm, itemsPerMin, ...}). The
            // old device-global mathFluencyHistory was never written after the
            // probe rework, so this section always rendered empty.
            const mathHist = longitudinalData.mathProbeHistory || [];
            if (mathHist.length > 0) {
                const dcpmOf = (r) => (typeof r.dcpm === 'number' ? r.dcpm : (typeof r.itemsPerMin === 'number' ? r.itemsPerMin : 0));
                educational += '\n\n--- Math Fluency Probe Results (DCPM) ---\n';
                const recent = mathHist.slice(-5);
                recent.forEach((r, i) => {
                    educational += `Probe ${i + 1}: ${r.grade ? 'Grade ' + r.grade + ', ' : ''}Form ${r.form || '?'} | ${dcpmOf(r)} digits correct per minute${r.timestamp ? ' | ' + new Date(r.timestamp).toLocaleDateString() : ''}\n`;
                });
                const avgDcpm = Math.round(recent.reduce((s, r) => s + dcpmOf(r), 0) / recent.length);
                educational += `Average DCPM (last ${recent.length}): ${avgDcpm}`;
            }
            // Explore score (STEAM Lab XP)
            if (longitudinalData.exploreScore) {
                educational += `\nSTEAM Lab Explore XP: ${longitudinalData.exploreScore}`;
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
            if (addToast) addToast(t('toasts.student_progress_data_imported'), 'success');
        };

        // Background facts from the Step 2/3 text, extracted by the AI.
        const extractBackgroundChunks = async (allBgText) => {
            const bgChunks = [];
            // Background text is extracted in WINDOWS, not truncated. The
            // prior `substring(0, 4000)` silently discarded everything past
            // 4000 chars: a clinician who pasted a full developmental history
            // got facts from its opening only, with a success toast and no
            // indication the rest was never read. Windows overlap so a fact
            // straddling a boundary is not lost, and duplicates are collapsed.
            let bgExtractWindows = 0;
            let bgExtractFailures = 0;
            let bgExtractCapped = false;
            if (allBgText && callGemini) {
                const scrubbed = scrubPII(allBgText);
                const _win = buildExtractionWindows(scrubbed, { size: 4000, overlap: 400, maxWindows: 8 });
                const capped = _win.windows;
                bgExtractCapped = _win.capped;
                bgExtractWindows = capped.length;
                const seen = new Set();
                for (let w = 0; w < capped.length; w++) {
                    if (capped.length > 1) setGenProgress(rwFmt(__alloT('report_writer.progress_extracting_background_facts_part', 'Extracting background facts (part {value}/{count})...'), { value: w + 1, count: capped.length }));
                    const prompt = `You are a clinical data extractor. Extract atomic facts from this background information. Each fact should be a single, verifiable statement.
${RESTORATIVE_PREAMBLE}

Text to extract from:
"""
${capped[w]}
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
                        (Array.isArray(parsed) ? parsed : []).forEach(c => {
                            const value = c && c.value ? String(c.value) : '';
                            if (!value) return;
                            // Overlapping windows re-surface the same fact; key
                            // on field+value so it is stored once.
                            const key = ((c.field || '') + '\u0000' + value).toLowerCase();
                            if (seen.has(key)) return;
                            seen.add(key);
                            bgChunks.push({
                                id: uid(), type: c.type || 'background', source: c.source || 'background',
                                field: c.field || '', value: value, category: c.category || 'general',
                                verified: false, immutable: false, devNormResult: null, origin: 'extracted'
                            });
                        });
                    } catch (err) { bgExtractFailures++; warnLog('Fact extraction error (window ' + (w + 1) + '):', err); }
                }
                if (bgExtractCapped && addToast) {
                    addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_background_text_is_very_long_facts', 'Background text is very long — facts were extracted from the first {count} part(s) only. Review the remainder manually.'), { count: capped.length })), 'info');
                }
                if (bgExtractFailures > 0 && addToast) {
                    addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_background_fact_extraction_failed_on_of', 'Background fact extraction failed on {bgExtractFailures} of {bgExtractWindows} part(s) — some facts may be missing.'), { bgExtractFailures, bgExtractWindows })), 'info');
                }
            }
            return { chunks: bgChunks, windows: bgExtractWindows, failures: bgExtractFailures };
        };
        // ── Step 3: Extract fact chunks ──
        const extractFactChunks = async () => {
            setExtracting(true);
            try {
                // Build fact chunks from score entries (deterministic, no AI needed)
                const scoreChunks = scoreEntries.map(s => rwScoreChunkFrom(s, uid()));
                // Build background fact chunks via AI
                const allBgText = rwBackgroundSourceText(bgSections, clinicalObs);
                const { chunks: bgChunks, windows: bgExtractWindows } = await extractBackgroundChunks(allBgText);
                setBgExtractedHash(rwTextHash(allBgText));
                setFactChunks([...scoreChunks, ...bgChunks]);
                // A green "Extracted N" that counts only scores looks identical
                // whether background extraction succeeded, returned nothing, or
                // failed outright. Report the background outcome explicitly.
                if (addToast) {
                    const total = scoreChunks.length + bgChunks.length;
                    if (allBgText && bgExtractWindows > 0 && bgChunks.length === 0) {
                        addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_extracted_fact_chunk_s_from_scores', 'Extracted {total} fact chunk(s) from scores, but NO facts were extracted from the background text — review it manually.'), { total })), 'info');
                    } else {
                        addToast(rwFmt(__alloT('report_writer.toast_extracted_fact_chunks_score_background', 'Extracted {total} fact chunks ({count} score, {count2} background)'), { total, count: scoreChunks.length, count2: bgChunks.length }), 'success');
                    }
                }
            } catch (err) {
                warnLog('Extract error:', err);
                if (addToast) addToast(t('toasts.extraction_failed'), 'error');
            } finally { setExtracting(false); }
        };
        const staleFacts = rwStaleScoreFacts(factChunks, scoreEntries);
        const factChunksRef = useRef(factChunks);
        factChunksRef.current = factChunks;
        const backgroundSourceText = rwBackgroundSourceText(bgSections, clinicalObs);
        // Steps 2 and 3 changed since the background facts were extracted, or
        // were never extracted (DA or RTI facts brought in first skip the
        // automatic extraction, which only runs while there are no facts).
        const backgroundStale = factChunks.length > 0 && !!backgroundSourceText && rwTextHash(backgroundSourceText) !== bgExtractedHash;
        const reextractBackground = async () => {
            if (extracting || !callGemini) return;
            setExtracting(true);
            try {
                const text = rwBackgroundSourceText(bgSections, clinicalObs);
                const result = await extractBackgroundChunks(text);
                // Every part failed: keep the old facts rather than drop them.
                if (result.windows > 0 && result.failures === result.windows) return;
                const merged = rwMergeBackgroundFacts(factChunksRef.current, result.chunks);
                setFactChunks(merged.chunks);
                setBgExtractedHash(rwTextHash(text));
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_background_reextracted', 'Background facts extracted again: {added} new (verify them below), {kept} unchanged, {removed} no longer in the text.'), { added: merged.added, kept: merged.kept, removed: merged.removed }), 'success');
            } catch (err) {
                warnLog('Re-extract error:', err);
                if (addToast) addToast(t('toasts.extraction_failed'), 'error');
            } finally { setExtracting(false); }
        };
        const backgroundStaleNotice = () => backgroundStale && h('div', { role: 'status', className: 'rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900 flex flex-wrap items-center gap-2' },
            h('span', null, bgExtractedHash
                ? __alloT('report_writer.background_facts_stale', 'The background or observations (Steps 2 and 3) changed after the facts were extracted, so the report would not include the changes.')
                : __alloT('report_writer.background_facts_never_extracted', 'Facts have not been extracted from the background or observations (Steps 2 and 3), so the report would not include them.')),
            h('button', { type: 'button', onClick: reextractBackground, disabled: extracting || !callGemini, 'aria-busy': extracting ? 'true' : 'false', className: 'px-2 py-0.5 bg-amber-700 text-white rounded hover:bg-amber-800 disabled:opacity-50' },
                bgExtractedHash ? __alloT('report_writer.reextract_background_facts', 'Extract background facts again') : __alloT('report_writer.extract_background_facts', 'Extract background facts')));
        // One lock for everything that rewrites sections: generation, the audit,
        // a regeneration or an adaptation. A change made meanwhile was overwritten
        // when the running one finished.
        const sectionsBusy = generating || checking || !!regenSection || !!adaptingSection;
        // Brings the score facts back in line with Step 4 without re-extracting
        // the background facts. A changed fact keeps its id, so citations to it
        // still resolve, and must be verified again.
        const refreshScoreFacts = () => {
            const stale = rwStaleScoreFacts(factChunks, scoreEntries);
            if (!stale.count) return;
            const removed = new Set(stale.removed.map(c => c.id));
            const changed = new Map(stale.changed.map(x => [x.chunk.id, x.entry]));
            setFactChunks(prev => [
                ...prev.filter(c => !removed.has(c.id)).map(c => (changed.has(c.id) ? rwScoreChunkFrom(changed.get(c.id), c.id) : c)),
                ...stale.added.map(e => rwScoreChunkFrom(e, uid())),
            ]);
            if (addToast) addToast(rwFmt(__alloT('report_writer.toast_score_facts_updated', 'Updated {count} score fact(s). Verify them again below.'), { count: stale.count }), 'success');
        };
        const staleFactsNotice = () => staleFacts.count > 0 && h('div', { role: 'status', className: 'rounded-lg border border-amber-300 bg-amber-50 p-2 text-[11px] text-amber-900 flex flex-wrap items-center gap-2' },
            h('span', null, rwFmt(__alloT('report_writer.stale_score_facts', '{count} score fact(s) no longer match Step 4 (changed, added or removed after the facts were extracted), so the report would be written from the old ones.'), { count: staleFacts.count })),
            h('button', { type: 'button', onClick: refreshScoreFacts, className: 'px-2 py-0.5 bg-amber-700 text-white rounded hover:bg-amber-800' }, __alloT('report_writer.update_score_facts', 'Update score facts')));
        const verifyChunk = (chunkId) => {
            const age = parseFloat(studentAge);
            setFactChunks(prev => prev.map(c => {
                if (c.id !== chunkId) return c;
                let devNormResult = null;
                if (c.type === 'score' && age) {
                    const display = classifyDisplayScore(Number(c.value), c.scoreType, c.source, c.field, c.descriptorScale);
                    const preset = ASSESSMENT_PRESETS[c.source];
                    // Not where HIGH is the concern: a LOW GARS-3 Autism Index means autism is unlikely.
                    const isLowStandardConcern = !display.unclassified && display.direction !== 'high' && normalizeReportScoreType(c.scoreType) === 'standard' && (!preset || preset.mean === 100) && Number(c.value) < 85;
                    const isConcern = display.color === 'red' || display.color === 'orange' || isLowStandardConcern;
                    if (isConcern) {
                        devNormResult = { type: 'deficit', label: display.label, color: display.color === 'orange' ? 'orange' : 'red', explanation: rwFmt(__alloT('report_writer.devnorm_review', 'Score of {value} ({label}) warrants clinician review for a {age}-year-old using the selected measure\'s score direction and metric'), { value: c.value, label: display.label, age }) };
                    } else {
                        devNormResult = { type: 'appropriate', label: 'Within Expected Range', color: 'green', explanation: rwFmt(__alloT('report_writer.devnorm_expected', 'Score of {value} ({label}) is within the expected range for a {age}-year-old'), { value: c.value, label: display.label, age }) };
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
            const chunksText = scrubPII(verifiedChunks.map(c => c.source + ' ' + c.field + ': ' + (c.type === 'score' ? rwScoreFactText(c) : c.value)).join('\n'));
            const referenceCtx = buildReferenceContext(scoreEntries, parseFloat(studentAge));
            // Passages retrieved for the hypotheses, not the first 3000 characters.
            if (referenceLibrary.length) await rwEnsureLumenEvidence();
            const userRefs = rwReferencePromptBlock(rwReferencePassages(referenceLibrary, hypotheses.join(' ')), referenceLibrary.length, scrubPII).trim();
            const prompt = 'You are a clinical evidence organizer. Given verified assessment data, organize the evidence for and against each diagnostic hypothesis.\n\nVERIFIED FACT CHUNKS:\n' + chunksText + (referenceCtx ? '\n\nCLINICAL REFERENCE:\n' + referenceCtx : '') + (userRefs ? '\n\n' + userRefs : '') + '\n\nHYPOTHESES TO EVALUATE:\n' + scrubPII(hypotheses.map((h, i) => (i + 1) + '. ' + h).join('\n')) + '\n\nFor each hypothesis provide:\n1. Evidence FOR (specific facts that support, with strength: strong/moderate/weak)\n2. Evidence AGAINST (facts that contradict)\n3. Evidence GAPS (additional data needed)\n4. Overall strength score (1-10)\n\nIMPORTANT: Organize EXISTING evidence only. Do NOT diagnose. All evidence must trace to fact chunks.\n\nReturn ONLY valid JSON:\n{"hypotheses":[{"name":"name","strengthScore":7,"evidenceFor":[{"fact":"desc","strength":"strong","explanation":"why"}],"evidenceAgainst":[{"fact":"desc","explanation":"why"}],"evidenceGaps":["missing data"]}]}';
            try {
                const result = await callGemini(prompt, true);
                const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                let parsed;
                try { parsed = JSON.parse(cleaned); }
                catch { const m = result.match(/\{[\s\S]*\}/); if (m) parsed = JSON.parse(m[0]); else parsed = { hypotheses: [] }; }
                const results = {};
                (parsed.hypotheses || []).forEach(h => { results[h.name] = h; });
                setDifferentialResults(results);
                if (addToast) addToast(t('toasts.differential_analysis_complete_u2705'), 'success');
            } catch (err) {
                warnLog('Differential analysis error:', err);
                if (addToast) addToast(t('toasts.differential_analysis_failed'), 'error');
            } finally { setRunningDifferential(false); }
        };

        // ── Shared prompt builder for report sections ──
        // Reference passages for one section: its name, its blueprint notes, the
        // hypotheses under consideration and the instruments given form the query.
        // Synchronous once LumenEvidence is loaded (generation awaits the loader).
        const sectionReferencePassages = (section) => {
            const bp = blueprint.find(b => b.name === section);
            const query = [section, bp && bp.notes, selectedHypotheses.join(' '), Array.from(new Set(scoreEntries.map(s => s.assessment))).join(' ')].filter(Boolean).join(' ');
            return rwReferencePassages(referenceLibrary, query);
        };
        // Case record passages for a section, by the same query; redacted text only.
        const sectionCasePassages = (section) => {
            if (!aiCaseDocs.length) return { passages: [], mode: 'none' };
            const bp = blueprint.find(b => b.name === section);
            const query = [section, bp && bp.notes, selectedHypotheses.join(' '), Array.from(new Set(scoreEntries.map(s => s.assessment))).join(' ')].filter(Boolean).join(' ');
            return rwCasePassages(aiCaseDocs, query, scrubPII);
        };
        // Ids the model may cite for a section: its fact chunks plus the
        // reference and case passages it was given (parseEvidenceResponse drops others).
        const citableFor = (section, verifiedChunks) => verifiedChunks.concat(sectionReferencePassages(section).passages, sectionCasePassages(section).passages);
        // The correction prompts said "keep the rest of the section intact" but
        // never showed the section, so the model wrote it again from scratch and
        // a single flagged claim replaced the clinician's edited text. Corrections
        // now carry the current text and ask for the smallest change.
        const correctionInstructions = (currentText, heading, corrections) =>
            `CURRENT TEXT OF THIS SECTION (revise it; do not write a new section):\n\"\"\"\n${scrubPII(String(currentText || ''))}\n\"\"\"\n\n${heading}:\n${corrections}\n\n`
            + 'Make the smallest changes that fix these issues. Keep every other sentence exactly as written, including the clinician\'s wording.';
        const buildSectionPrompt = (section, verifiedChunks, customInstructions) => {
            const age = studentAge ? `${studentAge} years old` : 'age not specified';
            const grade = studentGrade || 'grade not specified';
            const scoreChunksText = verifiedChunks.filter(c => c.type === 'score').map(c =>
                scrubPII(`[${c.id}] ${c.source} \u2014 ${c.field}: ${rwScoreFactText(c)}${c.devNormResult ? ' [' + c.devNormResult.label + ']' : ''}`)
            ).join('\n');
            const bgChunksText = verifiedChunks.filter(c => c.type === 'background').map(c =>
                scrubPII(`[${c.id}] ${c.field}: ${c.value}`)
            ).join('\n');
            const referenceContext = buildReferenceContext(scoreEntries, parseFloat(studentAge));
            return `You are writing the "${scrubPII(section)}" section of a ${scrubPII(reportTitle)} for a student who is ${age}, ${grade}.
${RESTORATIVE_PREAMBLE}

CRITICAL RULES:
1. Use ONLY the verified facts below. Do NOT invent any scores, dates, or claims.
2. Every statement must trace directly to a fact chunk below (each prefixed with [chunk-id]).
3. Use person-first, strengths-based language.
4. Reference the student as "[Student]" (we will replace with actual name later).
5. Write in professional clinical language appropriate for a formal report.
6. State a percentile or confidence interval ONLY exactly as it appears in the data below. If a score has none, do not state one, and never convert a score to a percentile yourself.
7. Use each score's classification label exactly as given; labels differ between instruments.
8. Do not state that the student is eligible for, or qualifies for, special education. The IEP team decides eligibility; describe whether findings are consistent with the criteria.
9. A "prior score ... from records" is a PAST result from an earlier evaluation: name that evaluation when you cite it (e.g. "up from 82 in the 2021 evaluation"), never present it as a current score, and do not call a change significant unless the data says so.
10. Do not call a difference between scores significant, or say how unusual it is, unless the data says so: that comes from the manual's critical values and base rates, which you were not given. Describe the scores and their ranges instead.

VERIFIED ASSESSMENT DATA:
${scoreChunksText || 'No assessment scores provided for this section.'}

VERIFIED BACKGROUND FACTS:
${bgChunksText || 'No background information provided for this section.'}

${referenceContext ? '\nCLINICAL REFERENCE CONTEXT (for interpretation accuracy \u2014 DO NOT diagnose, note convergent/divergent patterns only):\n' + referenceContext : ''}
${rwReferencePromptBlock(sectionReferencePassages(section), referenceLibrary.length, scrubPII)}
${rwCasePromptBlock(sectionCasePassages(section))}

${(() => { const bp = blueprint.find(b => b.name === section); return bp && bp.notes ? '\nSECTION-SPECIFIC INSTRUCTIONS: ' + scrubPII(bp.notes) : ''; })()}
${styleProfile ? '\nWRITING STYLE GUIDE (a report about ANOTHER student, with its names and numbers removed; match its tone and structure only and take no facts from it):\n' + rwStyleSampleForAI(styleProfile, scrubPII).text.substring(0, 2000) : ''}
${Object.keys(differentialResults).length > 0 && selectedHypotheses.length > 0 ? '\nSELECTED DIAGNOSTIC HYPOTHESES: ' + scrubPII(selectedHypotheses.join(', ')) + '\nDIFFERENTIAL ANALYSIS SUMMARY: ' + scrubPII(selectedHypotheses.map(h => { const r = differentialResults[h]; return r ? h + ' (strength: ' + r.strengthScore + '/10)' : h; }).join('; ')) : ''}
${customInstructions ? '\nADDITIONAL INSTRUCTIONS FOR THIS SECTION: ' + scrubPII(customInstructions) : ''}
Write the "${section}" section (2-4 paragraphs). After the section text, on a NEW line write EXACTLY:
USED_CHUNKS: id1, id2, id3
listing only the [chunk-id] values you actually referenced. Return the section text first, then the USED_CHUNKS line.`;
        };

        // ── Parse evidence from AI response ──

        // ── Helper: verify ONE section's score citations against the structured
        // input. Used by both generateReport (per-section verification, replacing
        // the previous single-shot 8000-char-truncated pass that systematically
        // missed Summary + Recommendations) and regenerateSection (so manual
        // per-section retries don't slip un-gated past the AI's dice roll).
        //
        // Returns {errors, parseOk}. parseOk=false means the AI's response was
        // uninterpretable JSON and the caller MUST surface "inconclusive", not
        // green-success — silently swallowing parse failures is what made the
        // previous pass into fabricated reassurance on signed clinical reports.
        // A section we did not actually check is NOT a verified section. The
        // previous `parseOk: true` here reported "clean" for every short or
        // un-runnable section, so a 49-character Summary carrying a fabricated
        // score rendered identically to one the verifier had cleared. `checked`
        // distinguishes the three real states for callers: checked-and-clean,
        // checked-and-flagged, and never-checked.
        const verifySectionAgainstScores = async (sectionName, sectionText, allScoreData) => {
            if (!callGemini || !sectionText) {
                return { errors: [], parseOk: false, checked: false, skipReason: 'unavailable' };
            }
            // Short sections still get checked when they cite a score; only text
            // with no digits at all is safe to skip, since a score citation
            // cannot exist without one.
            if (sectionText.length < 50 && !/\d/.test(sectionText)) {
                return { errors: [], parseOk: true, checked: true, skipReason: 'no-citable-content' };
            }
            // A failed call used to escape to the caller's catch, which skipped the
            // "not verified" banner entirely; it is an unchecked section instead.
            let verifyResult;
            try { verifyResult = await aiCall('sections', `You are a clinical data verification specialist. Cross-reference EVERY number, score, percentile, and classification label in this report SECTION against the actual input data.

ACTUAL INPUT SCORES:
${allScoreData}

REPORT SECTION ("${sectionName}"):
"""
${scrubPII(sectionText)}
"""

Check for:
1. Any score cited in the text that doesn't match the input (e.g., text says 92 but input says 82)
2. Any classification label that doesn't match the score (e.g., "Average" for a score of 78)
3. Any percentile that doesn't match the score
4. Any test name spelled differently
5. SUBTEST-ATTRIBUTION BINDING — a cited score MUST be attributed to the correct subtest by name. If "VCI was 92" appears but the input has "PRI: 92, VCI: 78", that is a CRITICAL error (wrong subtest attribution). Verify every (subtest, value) pair.
6. Any score mentioned in the draft that doesn't exist in the input data
7. Any score in the input data that should be discussed in this section but is OMITTED
A "prior score ... from records" in the input is a past result: citing it as a past result is NOT an error.

Return ONLY JSON (no prose before or after):
{"errors":[{"claim":"what the text says","actual":"what the data shows","severity":"critical|minor"}]}

If no errors, return {"errors":[]}.`, true); }
            catch (callErr) { return { errors: [], parseOk: false, checked: false, skipReason: rwIsStopped(callErr) ? 'stopped' : 'error' }; }
            try {
                let sv = verifyResult.trim();
                if (sv.indexOf('```') !== -1) { const ps = sv.split('```'); sv = ps[1] || ps[0]; if (sv.indexOf('\n') !== -1) sv = sv.split('\n').slice(1).join('\n'); if (sv.lastIndexOf('```') !== -1) sv = sv.substring(0, sv.lastIndexOf('```')); }
                const parsed = JSON.parse(sv);
                const errors = Array.isArray(parsed.errors)
                    ? parsed.errors.map(e => ({ ...e, section: sectionName }))
                    : [];
                return { errors, parseOk: true, checked: true };
            } catch (e) {
                return { errors: [], parseOk: false, checked: false, skipReason: 'unparseable' };
            }
        };

        // ── Step 6: Generate report (with evidence mapping) ──
        // Generating again rewrites every section from the verified facts.
        const generateReport = () => confirmThen(
            Object.values(reportSectionsRef.current || {}).some(v => String(v || '').trim()),
            { title: __alloT('report_writer.confirm_generate_title', 'Generate the whole report again?'),
              message: __alloT('report_writer.confirm_generate_message', 'Every section is written again from the verified facts, replacing edits and imported drafts. Each section can be restored afterwards with Undo.'),
              confirmLabel: __alloT('report_writer.confirm_generate', 'Generate again') },
            runGenerateReport);
        const runGenerateReport = async () => {
            if (!callGemini) return;
            const failedSections = [];
            setGenerating(true);
            setAuditStatus('not_run');
            setAuditedFingerprint(null);
            setClinicianAttested(false);
            setUnsourcedAcknowledged(false);
            // Phase 2: kick off Pyodide warmup in the background so the Python
            // audit pass at the end of generation doesn't have to wait for the
            // ~10MB download. Lazy loader is no-op if already warmed.
            try { window.__alloLazyPyodide && window.__alloLazyPyodide(); } catch (_) {}
            try { window.AlloModules?.PyodideRuntime?.warmup?.(); } catch (_) {}
            const verifiedChunks = factChunks.filter(c => c.verified);
            if (verifiedChunks.length === 0) { setGenerating(false); if (addToast) addToast(t('toasts.verified_fact_chunks'), 'error'); return; }
            const run = beginAiRun('sections');
            let stopped = false;
            // Sections whose score check finished in this run, and its findings.
            const checkedThisRun = new Set();
            let runUnverified = [];
            setGenFraction(0);
            if (staleFacts.count > 0 && addToast) {
                addToast(rwFmt(__alloT('report_writer.toast_generating_from_stale_facts', 'Writing from score facts that no longer match Step 4 ({count}); update them in Step 5.'), { count: staleFacts.count }), 'info');
            }
            // Reference passages are retrieved per section (rwReferencePassages); a
            // failed load falls back to the first part of the references, said aloud.
            if (referenceLibrary.length > 0 && !(await rwEnsureLumenEvidence()) && addToast) {
                addToast(__alloT('report_writer.toast_reference_search_could_not_load_so', 'Reference search could not load, so only the first part of your references was given to the AI.'), 'info');
            }
            if (aiCaseDocs.length > 0 && !(await rwEnsureLumenEvidence()) && addToast) {
                addToast(__alloT('report_writer.toast_case_search_could_not_load', 'Case record search could not load, so no case document text was given to the AI.'), 'info');
            }
            const sections = blueprint.filter(s => s.enabled).map(s => s.name);
            const generated = {};
            // Citation ids the model emitted that match no verified chunk, as
            // [{section, ids}]. A fabricated id is a provenance failure, not a
            // score error, so it is tracked separately from allErrors.
            const runBadCitations = [];
            const evidenceMap = {};
            const genVariants = [
                null, // default prompt
                'Write with particular attention to strengths-based language and clinical precision.',
                'Focus on data-driven interpretation — every claim must map to a specific score or observation.',
                'Emphasize clarity for parents/caregivers who may read this report — avoid unnecessary jargon.',
                'Write with particular attention to instructional implications and classroom-relevant observations.',
            ];
            const numPasses = Math.min(reportGenPasses, genVariants.length);
            // Writing, then checking, each section, then one consistency pass.
            const progressSteps = sections.length * 2 + 1;
            for (let i = 0; i < sections.length; i++) {
                const section = sections[i];
                if (run.signal.aborted) { stopped = true; break; }
                setGenFraction(i / progressSteps);
                setGenProgress(rwFmt(__alloT('report_writer.progress_generating', 'Generating {section} ({value}/{count}{value2})...'), { section, value: i + 1, count: sections.length, value2: numPasses > 1 ? rwFmt(__alloT('report_writer.progress_passes', ', {numPasses} passes'), { numPasses }) : '' }));
                try {
                    if (numPasses <= 1) {
                        // Single pass (fast mode)
                        const prompt = buildSectionPrompt(section, verifiedChunks, null);
                        const result = await aiCall('sections', prompt, false, true);
                        const { text, usedChunks, unknownChunks } = parseEvidenceResponse(result, citableFor(section, verifiedChunks));
                        generated[section] = text;
                        evidenceMap[section] = usedChunks;
                        if (unknownChunks && unknownChunks.length) runBadCitations.push({ section: section, ids: unknownChunks });
                    } else {
                        // Triangulated: run N passes in parallel, score each, pick best
                        const passPromises = genVariants.slice(0, numPasses).map(variant => {
                            const prompt = buildSectionPrompt(section, verifiedChunks, variant);
                            return aiCall('sections', prompt, false, true).then(r => parseEvidenceResponse(r, citableFor(section, verifiedChunks))).catch(() => null);
                        });
                        const passResults = (await Promise.all(passPromises)).filter(Boolean);
                        if (run.signal.aborted) throw rwStoppedError();
                        if (passResults.length === 0) throw new Error('All passes failed');
                        // Verifier first, then evidence/coverage/length (rankGenerationPasses).
                        const scored = rankGenerationPasses(passResults, verifiedChunks, rwPsycheckSources(scoreEntries), caseRecords);
                        const best = scored[0];
                        generated[section] = best.text;
                        evidenceMap[section] = best.usedChunks;
                        if (best.unknownChunks && best.unknownChunks.length) runBadCitations.push({ section: section, ids: best.unknownChunks });
                        if (numPasses >= 3) {
                            warnLog(`[Report] ${section}: best-of-${passResults.length} (psycheck findings: ${scored.map(s => s.psycheckFindings == null ? '?' : s.psycheckFindings).join(', ')}; scores: ${scored.map(s => Math.round(s.qualityScore)).join(', ')})`);
                        }
                    }
                } catch (err) {
                    if (rwIsStopped(err)) { stopped = true; break; }
                    warnLog(`Generation error for ${section}:`, err);
                    // Keep what the section said before; an error placeholder used to
                    // replace it and could reach the printed report.
                    const previous = String((reportSectionsRef.current || {})[section] || '');
                    generated[section] = previous;
                    evidenceMap[section] = previous ? (sectionEvidenceMap[section] || []) : [];
                    failedSections.push(section);
                }
            }
            // ── Improvement 1: Score-Text Verification Pass ──
            setGenProgress(__alloT('report_writer.progress_verifying_score_citations', 'Verifying score citations...'));
            try {
                const allScoreData = scoreEntries.map(s => `${s.assessment} — ${s.subtest}: ${rwScoreFactText(s)}`).join('\n');
                // PER-SECTION verification (replaces a single-shot pass that
                // truncated at 8000 chars and systematically dropped Summary +
                // Recommendations + Interpretation). Helper at top of component
                // scope: verifySectionAgainstScores.
                let allErrors = [];
                let parseFailureCount = 0;
                let sectionsChecked = 0;
                // Sections the verifier never actually cleared. Carried to the
                // document itself (not just a toast) so an unverified section is
                // never indistinguishable from a verified one on a signed report.
                const unverifiedSections = [];
                runUnverified = unverifiedSections;
                const sectionEntries = Object.entries(generated);
                for (let i = 0; i < sectionEntries.length; i++) {
                    const [secName, secText] = sectionEntries[i];
                    if (stopped || run.signal.aborted) { stopped = true; break; }
                    setGenFraction((sections.length + i) / progressSteps);
                    setGenProgress(rwFmt(__alloT('report_writer.progress_verifying_score_citations_2', 'Verifying score citations ({value}/{count}: {secName})...'), { value: i + 1, count: sectionEntries.length, secName }));
                    const { errors, parseOk, checked, skipReason } = await verifySectionAgainstScores(secName, secText, allScoreData);
                    if (skipReason === 'stopped') { stopped = true; break; }
                    checkedThisRun.add(secName);
                    // Count only sections the verifier actually ran on, so the
                    // "N of M verified" denominator cannot overstate coverage.
                    if (checked) sectionsChecked++;
                    else unverifiedSections.push({ section: secName, reason: skipReason || 'unknown' });
                    if (!parseOk) parseFailureCount++;
                    allErrors = allErrors.concat(errors);
                }
                if (stopped) throw rwStoppedError();
                setUnverifiedSections(unverifiedSections);
                // Self-heal: regenerate ONLY sections flagged critical. Lifted
                // sectionsWithErrors to this scope so the toast logic below can
                // see it for the "auto-fixed critical" tail.
                const sectionsWithErrors = [...new Set(allErrors.filter(e => e.severity === 'critical').map(e => e.section))];
                if (sectionsWithErrors.length > 0) {
                    setGenProgress(rwFmt(__alloT('report_writer.progress_fixing_section_s_with_score_errors', 'Fixing {count} section(s) with score errors...'), { count: sectionsWithErrors.length }));
                    for (const secName of sectionsWithErrors) {
                        // Section attribution is exact (helper stamps the
                        // section name on each error) — no fuzzy match.
                        if (!generated[secName]) continue;
                        const errors = allErrors.filter(e => e.section === secName && e.severity === 'critical');
                        const corrections = errors.map(e => `CORRECTION: "${e.claim}" is WRONG. The actual data shows: ${e.actual}`).join('\n');
                        try {
                            const fixPrompt = buildSectionPrompt(secName, verifiedChunks, correctionInstructions(generated[secName], 'CRITICAL CORRECTIONS FROM SCORE VERIFICATION', corrections));
                            const fixResult = await aiCall('sections', fixPrompt, false);
                            const { text, usedChunks, unknownChunks } = parseEvidenceResponse(fixResult, citableFor(secName, verifiedChunks));
                            generated[secName] = text;
                            evidenceMap[secName] = usedChunks;
                            if (unknownChunks && unknownChunks.length) runBadCitations.push({ section: secName, ids: unknownChunks });
                        } catch(fixErr) {
                            // Stopped mid-correction: these sections still hold flagged errors.
                            if (rwIsStopped(fixErr)) { sectionsWithErrors.forEach(name => checkedThisRun.delete(name)); throw fixErr; }
                            warnLog(`Score fix failed for ${secName}:`, fixErr);
                        }
                    }
                }
                // Toast — three distinct states, no fabricated counts. Use
                // scoreEntries.length (the deterministic denominator) instead
                // of Gemini's totalScoresCited (which could render the literal
                // string "N" on a signed clinical document via the prior
                // `|| 'N'` fallback). Parse-failure no longer renders green-success.
                // Unverified sections are reported against the TOTAL section
                // count, never against sectionsChecked, so coverage can never
                // read as complete while sections went unchecked.
                const unverifiedTail = unverifiedSections.length > 0
                    ? (' — ' + rwFmt(__alloT('report_writer.toast_of_section_s_not_verified', '{count} of {count2} section(s) NOT verified'), { count: unverifiedSections.length, count2: sectionEntries.length }))
                    : '';
                if (addToast) {
                    if (allErrors.length > 0) {
                        const errSectionCount = new Set(allErrors.map(e => e.section)).size;
                        const inconclusiveTail = parseFailureCount > 0 ? (' ' + rwFmt(__alloT('report_writer.toast_section_s_inconclusive', '({parseFailureCount} section(s) inconclusive)'), { parseFailureCount })) : '';
                        const fixedTail = sectionsWithErrors.length > 0 ? (' — ' + __alloT('report_writer.toast_correction_drafts_generated_final_audit_required', 'correction drafts generated; final audit required')) : '';
                        addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_score_verification_issue_s_across_section', 'Score verification: {count} issue(s) across {errSectionCount} section(s){fixedTail}{inconclusiveTail}{unverifiedTail}'), { count: allErrors.length, errSectionCount, fixedTail, inconclusiveTail, unverifiedTail })), 'info');
                    } else if (parseFailureCount > 0 || unverifiedSections.length > 0) {
                        addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_score_verification_incomplete_of_section_s', 'Score verification incomplete: {sectionsChecked} of {count} section(s) checked{unverifiedTail} — please review manually'), { sectionsChecked, count: sectionEntries.length, unverifiedTail })), 'info');
                    } else {
                        addToast(('✅ ' + rwFmt(__alloT('report_writer.toast_score_citation_s_verified_across_of', '{count} score citation(s) verified across {sectionsChecked} of {count2} section(s)'), { count: scoreEntries.length, sectionsChecked, count2: sectionEntries.length })), 'success');
                    }
                    if (runBadCitations.length > 0) {
                        const badIdCount = runBadCitations.reduce((n, b) => n + b.ids.length, 0);
                        addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_unrecognized_evidence_id_s_across_section', '{badIdCount} unrecognized evidence id(s) across {count} section(s) were dropped from the citation trail — those statements have no traceable source'), { badIdCount, count: runBadCitations.length })), 'info');
                    }
                }
                setBadCitations(runBadCitations);
            } catch(svErr) {
                if (rwIsStopped(svErr)) stopped = true;
                else warnLog('[Report] Score verification pass failed (non-blocking):', svErr);
            }

            // ── Improvement 2: Cross-Section Consistency Check ──
            if (!stopped) setGenProgress(__alloT('report_writer.progress_checking_cross_section_consistency', 'Checking cross-section consistency...'));
            try {
                if (stopped || run.signal.aborted) throw rwStoppedError();
                setGenFraction((progressSteps - 1) / progressSteps);
                const fullReportFull = Object.entries(generated).map(([k, v]) => `## ${k}\n${v}`).join('\n\n');
                // Truncation cap raised from 8000 to 24000 (typical psychoed
                // report runs 10-15KB; the prior cap routinely dropped Summary +
                // Recommendations + Interpretation). On truncation we still warn
                // the user so they don't trust a partial check on a signed doc.
                const CONSISTENCY_CAP = 24000;
                const fullReport = scrubPII(fullReportFull).substring(0, CONSISTENCY_CAP);
                const wasTruncated = fullReportFull.length > CONSISTENCY_CAP;
                const consistencyResult = await aiCall('sections', `You are a clinical report consistency auditor. Check this psychoeducational report for INTERNAL CONSISTENCY across sections.

REPORT:
"""
${fullReport}
"""

Check for:
1. SUMMARY-BODY MISMATCH: Does the Summary section accurately reflect the findings in earlier sections? (e.g., Summary says "average cognitive functioning" but Assessment Results describes deficits)
2. RECOMMENDATION-FINDING GAPS: Are there recommendations that aren't supported by any finding? Are there significant findings with no corresponding recommendation?
3. CROSS-SECTION CONTRADICTIONS: Does one section say something that contradicts another? (e.g., Background says no attention concerns but Assessment Results says elevated ADHD scores)
4. TERMINOLOGY CONSISTENCY: Are the same constructs described consistently? (e.g., don't call it "anxiety" in one section and "nervousness" in another if referring to the same clinical construct)
5. COMPLETENESS: Are all major assessment scores discussed somewhere? Are all mentioned in Summary?

For EVERY issue, populate the "sections" array with the actual section names involved (must match section headings in the REPORT). This is load-bearing — the self-heal pass uses it to route the fix to the correct section(s).

Return ONLY JSON:
{"consistent": true/false, "issues": [{"type": "summary-mismatch|recommendation-gap|contradiction|terminology|completeness", "description": "specific issue", "sections": ["Section A", "Section B"], "severity": "critical|moderate|minor"}]}`, true);
                let consistencyCheck = null;
                let consistencyParseOk = false;
                try {
                    let cc = consistencyResult.trim();
                    if (cc.indexOf('```') !== -1) { const ps = cc.split('```'); cc = ps[1] || ps[0]; if (cc.indexOf('\n') !== -1) cc = cc.split('\n').slice(1).join('\n'); if (cc.lastIndexOf('```') !== -1) cc = cc.substring(0, cc.lastIndexOf('```')); }
                    consistencyCheck = JSON.parse(cc);
                    consistencyParseOk = true;
                } catch(e) {}
                const issues = (consistencyCheck && Array.isArray(consistencyCheck.issues)) ? consistencyCheck.issues : [];
                const criticalIssues = issues.filter(i => i.severity === 'critical');
                if (criticalIssues.length > 0) {
                    setGenProgress(rwFmt(__alloT('report_writer.progress_fixing_consistency_issue_s', 'Fixing {count} consistency issue(s)...'), { count: criticalIssues.length }));
                    // Self-heal: regenerate EACH section actually named in
                    // issue.sections[], not just Summary. The prior dispatch
                    // hardcoded sections.find(includes('summary')) and ignored
                    // issue.sections, so body-body contradictions (e.g.
                    // Assessment Results FSIQ 92 vs Cognitive Functioning FSIQ
                    // 82) were "fixed" by rewriting only Summary while both
                    // bodies continued to contradict each other — and the toast
                    // still claimed "auto-fixed N critical issues."
                    const sectionsInvolved = new Set();
                    criticalIssues.forEach(iss => {
                        const secs = Array.isArray(iss.sections) ? iss.sections : [];
                        secs.forEach(rawName => {
                            const matched = sections.find(s => s === rawName)
                                         || sections.find(s => s.toLowerCase() === String(rawName).toLowerCase())
                                         || sections.find(s => String(rawName).toLowerCase().includes(s.toLowerCase()))
                                         || sections.find(s => s.toLowerCase().includes(String(rawName).toLowerCase()));
                            if (matched) sectionsInvolved.add(matched);
                        });
                    });
                    // Defensive fallback: if Gemini emitted critical issues
                    // but didn't populate sections[], regenerate Summary as
                    // the last-resort target so we never silently skip a
                    // critical fix.
                    if (sectionsInvolved.size === 0) {
                        const summarySection = sections.find(s => s.toLowerCase().includes('summary'));
                        if (summarySection) sectionsInvolved.add(summarySection);
                    }
                    for (const secName of sectionsInvolved) {
                        if (!generated[secName]) continue;
                        const issuesForSection = criticalIssues.filter(iss => {
                            const secs = Array.isArray(iss.sections) ? iss.sections : [];
                            return secs.length === 0
                                || secs.some(rn => String(rn).toLowerCase() === secName.toLowerCase()
                                              || String(rn).toLowerCase().includes(secName.toLowerCase())
                                              || secName.toLowerCase().includes(String(rn).toLowerCase()));
                        });
                        const issueList = issuesForSection.map(iss => `- ${iss.type}: ${iss.description}`).join('\n');
                        try {
                            const fixPrompt = buildSectionPrompt(secName, verifiedChunks, correctionInstructions(generated[secName], 'CONSISTENCY ISSUES INVOLVING THIS SECTION', issueList) + `\n\nIf the issue is a contradiction with another section's claim, defer to the structured input data (assessment scores, background facts) rather than averaging the two narrative claims.`);
                            const fixResult = await aiCall('sections', fixPrompt, false);
                            const { text, usedChunks } = parseEvidenceResponse(fixResult);
                            generated[secName] = text;
                            evidenceMap[secName] = usedChunks;
                        } catch(fixErr) {
                            if (rwIsStopped(fixErr)) throw fixErr;
                            warnLog(`[Report] Consistency fix failed for ${secName}:`, fixErr);
                        }
                    }
                }
                // Toast — no longer silently green on parse failure or
                // truncation. Truncation surfaces as a separate warning so
                // the clinician knows coverage was partial on a signed report.
                if (addToast) {
                    const truncationTail = wasTruncated ? (' ' + rwFmt(__alloT('report_writer.toast_truncated_at_chars_partial_coverage', '(truncated at {CONSISTENCY_CAP} chars — partial coverage)'), { CONSISTENCY_CAP })) : '';
                    if (!consistencyParseOk) {
                        addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_consistency_check_inconclusive_response_unparsea', 'Consistency check inconclusive (response unparseable) — please review manually{truncationTail}'), { truncationTail })), 'info');
                    } else if (issues.length > 0) {
                        const fixedTail = criticalIssues.length > 0 ? (' — ' + __alloT('report_writer.toast_correction_drafts_generated_final_audit_required', 'correction drafts generated; final audit required')) : '';
                        addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_consistency_check_issue_s', 'Consistency check: {count} issue(s){fixedTail}{truncationTail}'), { count: issues.length, fixedTail, truncationTail })), 'info');
                    } else if (wasTruncated) {
                        addToast(('⚠️ ' + rwFmt(__alloT('report_writer.toast_consistency_check_clean_on_first_chars', 'Consistency check clean on first {CONSISTENCY_CAP} chars; report was truncated — review remaining sections manually'), { CONSISTENCY_CAP })), 'info');
                    } else {
                        addToast(t('toasts.u2705_cross_section_consistency_verified'), 'success');
                    }
                }
            } catch(ccErr) {
                if (rwIsStopped(ccErr)) stopped = true;
                else warnLog('[Report] Consistency check failed (non-blocking):', ccErr);
            }

            endAiRun('sections', run);
            setGenFraction(null);
            if (stopped) {
                // Keep what was finished. Sections not reached keep their earlier
                // text, and a written section whose check did not finish says so.
                const written = Object.keys(generated).filter(name => !failedSections.includes(name) && String(generated[name] || '').trim());
                const unverified = runUnverified.filter(u => written.includes(u.section));
                written.forEach(name => { if (!checkedThisRun.has(name) && !unverified.some(u => u.section === name)) unverified.push({ section: name, reason: 'stopped' }); });
                replaceSections(Object.fromEntries(written.map(name => [name, generated[name]])), 'generated');
                setSectionEvidenceMap(prev => ({ ...prev, ...Object.fromEntries(written.map(name => [name, evidenceMap[name] || []])) }));
                setUnverifiedSections(prev => [...prev.filter(u => !written.includes(u.section)), ...unverified]);
                setBadCitations(prev => [...prev.filter(b => !written.includes(b.section)), ...runBadCitations.filter(b => written.includes(b.section))]);
                setGenProgress('');
                setGenerating(false);
                if (addToast) addToast(written.length
                    ? rwFmt(__alloT('report_writer.toast_generation_stopped_partial', 'Generation stopped. {count} section(s) were written ({sections}); the others kept their earlier text. Check them in the Accuracy Dashboard before relying on them.'), { count: written.length, sections: written.join(', ') })
                    : __alloT('report_writer.toast_generation_stopped_nothing', 'Generation stopped before any section was written. The report was not changed.'), 'info');
                return;
            }
            replaceSections(Object.fromEntries(Object.entries(generated).filter(([, v]) => String(v || '').trim())), 'generated', { replaceAll: true });
            setSectionEvidenceMap(evidenceMap);
            setGenProgress('');
            setGenerating(false);
            if (addToast) {
                if (failedSections.length) addToast(rwFmt(__alloT('report_writer.toast_generation_sections_failed', 'The report was generated, but {count} section(s) could not be written: {sections}. Their earlier text was kept; regenerate them or try again.'), { count: failedSections.length, sections: failedSections.join(', ') }), 'error');
                else addToast(__alloT('report_writer.toast_report_draft_generated_run_the_full', 'Report draft generated. Run the full Accuracy Dashboard audit before formal export.'), 'success');
            }
        };

        // ── Section-by-Section: Regenerate a single section ──
        const regenerateSection = async (sectionName, customInstructions) => {
            if (!callGemini) return;
            setRegenSection(sectionName);
            const verifiedChunks = factChunks.filter(c => c.verified);
            try {
                if (referenceLibrary.length > 0 || aiCaseDocs.length > 0) await rwEnsureLumenEvidence();
                const prompt = buildSectionPrompt(sectionName, verifiedChunks, customInstructions || null);
                const result = await callGemini(prompt, false);
                let { text, usedChunks } = parseEvidenceResponse(result);
                // Fix #3: re-run score-verification on the regenerated section.
                // The previous regenerate path skipped this entirely and cleared
                // prior accuracyResults \u2014 every retry was an ungated dice roll
                // on numbers. Now: verify against scoreEntries, self-heal
                // critical errors once, then surface the result.
                if (scoreEntries.length > 0) {
                    try {
                        const allScoreData = scoreEntries.map(s => `${s.assessment} \u2014 ${s.subtest}: ${rwScoreFactText(s)}`).join('\n');
                        const { errors, parseOk } = await verifySectionAgainstScores(sectionName, text, allScoreData);
                        const criticalErrs = errors.filter(e => e.severity === 'critical');
                        if (criticalErrs.length > 0) {
                            const corrections = criticalErrs.map(e => `CORRECTION: "${e.claim}" is WRONG. The actual data shows: ${e.actual}`).join('\n');
                            const fixPrompt = buildSectionPrompt(sectionName, verifiedChunks, (customInstructions ? customInstructions + '\n\n' : '') + correctionInstructions(text, 'CRITICAL CORRECTIONS FROM SCORE VERIFICATION', corrections));
                            const fixResult = await callGemini(fixPrompt, false);
                            const fixed = parseEvidenceResponse(fixResult);
                            text = fixed.text;
                            usedChunks = fixed.usedChunks;
                            const postFix = await verifySectionAgainstScores(sectionName, text, allScoreData);
                            const remainingCritical = postFix.errors.filter(e => e.severity === 'critical').length;
                            if (addToast) addToast(
                                postFix.parseOk && remainingCritical === 0
                                    ? rwFmt(__alloT('report_writer.toast_regenerated_correction_s_rechecked_successfully', '"{sectionName}" regenerated; {count} correction(s) rechecked successfully'), { sectionName, count: criticalErrs.length })
                                    : rwFmt(__alloT('report_writer.toast_regenerated_but_post_fix_verification_is', '"{sectionName}" regenerated, but post-fix verification is incomplete; run the full accuracy audit'), { sectionName }),
                                postFix.parseOk && remainingCritical === 0 ? 'success' : 'info'
                            );
                        } else if (!parseOk) {
                            if (addToast) addToast(rwFmt(__alloT('report_writer.toast_regenerated_score_verification_inconclusive_plea', '"{sectionName}" regenerated; score verification inconclusive — please review'), { sectionName }), 'info');
                        } else if (errors.length > 0) {
                            if (addToast) addToast(rwFmt(__alloT('report_writer.toast_regenerated_non_critical_citation_issue_s', '"{sectionName}" regenerated; {count} non-critical citation issue(s) — please review'), { sectionName, count: errors.length }), 'info');
                        } else {
                            if (addToast) addToast((rwFmt(__alloT('report_writer.toast_regenerated_score_citation_s_verified', '"{sectionName}" regenerated; {count} score citation(s) verified'), { sectionName, count: scoreEntries.length }) + ' ✅'), 'success');
                        }
                    } catch(vErr) {
                        warnLog(`[Report] Post-regen verification failed for ${sectionName}:`, vErr);
                        if (addToast) addToast(rwFmt(__alloT('report_writer.toast_regenerated_verification_pass_failed_please_revi', '"{sectionName}" regenerated; verification pass failed — please review'), { sectionName }), 'info');
                    }
                } else {
                    if (addToast) addToast((rwFmt(__alloT('report_writer.toast_regenerated', '"{sectionName}" regenerated'), { sectionName }) + ' ✅'), 'success');
                }
                replaceSections({ [sectionName]: text }, 'regenerated');
                setSectionEvidenceMap(prev => ({ ...prev, [sectionName]: usedChunks }));
                setAccuracyResults([]); // clear stale accuracy data
            } catch (err) {
                warnLog(`Regeneration error for ${sectionName}:`, err);
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_failed_to_regenerate', 'Failed to regenerate "{sectionName}"'), { sectionName }), 'error');
            } finally {
                setRegenSection(null);
                setShowRegenInput(null);
                setRegenInstructions('');
            }
        };

        // ── psycheck handoff (Architecture C) ──
        // File-input handler. Reads a psycheck VerificationResult JSON,
        // validates it against a size-bounded allowlisted schema, then stores it in component-local state.
        // No persistence. No Firestore write. No export inclusion.
        const handleImportDiscrepancyReport = (event) => {
            const file = event && event.target && event.target.files && event.target.files[0];
            if (!file) return;
            const inputEl = event.target;
            if (typeof file.size === 'number' && file.size > RW_MAX_DISCREPANCY_JSON_CHARS) {
                if (addToast) addToast(__alloT('report_writer.toast_failed_to_import_discrepancy_report_file', 'Failed to import discrepancy report: file exceeds the 1 MB limit'), 'error');
                if (inputEl) inputEl.value = '';
                return;
            }
            const reader = new FileReader();
            reader.onload = (ev) => {
                try {
                    const raw = typeof ev.target.result === 'string' ? ev.target.result.replace(/^\uFEFF/, '') : '';
                    if (!raw) throw new Error('The selected discrepancy report is empty');
                    if (raw.length > RW_MAX_DISCREPANCY_JSON_CHARS) throw new Error('Psycheck JSON exceeds the 1 MB limit');
                    const data = validateDiscrepancyPayload(JSON.parse(raw));
                    if (discrepancyReport && discrepancyReport._source === 'alloflow-inline') {
                        if (addToast) addToast(__alloT('report_writer.toast_replacing_the_inline_verify_result_with', 'Replacing the inline verify result with the imported file.'), 'info');
                    }
                    setDiscrepancyReport(data);
                    setPsycheckFingerprint(null);
                    if (addToast) addToast(
                        rwFmt(__alloT('report_writer.toast_imported_psycheck_report_discrepancy_ies_verifie', 'Imported psycheck report: {count} discrepancy(ies), {count2} verified citation(s)'), { count: data.discrepancies.length, count2: data.verified.length }),
                        data.discrepancies.length > 0 ? 'info' : 'success'
                    );
                } catch (e) {
                    warnLog('[Report] psycheck import failed:', e);
                    if (addToast) addToast(rwFmt(__alloT('report_writer.toast_failed_to_import_discrepancy_report', 'Failed to import discrepancy report: {value}'), { value: (e && e.message) || e }), 'error');
                } finally {
                    if (inputEl) inputEl.value = '';
                }
            };
            const handleReadFailure = () => {
                if (addToast) addToast(__alloT('report_writer.toast_failed_to_read_discrepancy_report_file', 'Failed to read discrepancy report file'), 'error');
                if (inputEl) inputEl.value = '';
            };
            reader.onerror = handleReadFailure;
            reader.onabort = handleReadFailure;
            reader.readAsText(file);
        };

        const clearDiscrepancyReport = () => {
            setDiscrepancyReport(null);
            setPsycheckFingerprint(null);
            if (addToast) addToast(__alloT('report_writer.toast_discrepancy_report_cleared', 'Discrepancy report cleared'), 'info');
        };

        // Architecture B: run the inline JS port (window.AlloPsycheck)
        // against the current scoreEntries + reportSections. Same result
        // shape as Architecture C, so the existing banner UI renders it
        // without any new render code.
        //
        // FERPA: pure client-side function call on already-local state.
        // No network calls. No persistence. Result lives in the existing
        // render-only discrepancyReport useState.
        const verifyWithPsycheck = useCallback(() => {
            // Audit fix #1 (Verify-during-regen race): refuse if a
            // generation or section-mutation pass is in flight. Without this,
            // a clinician verifying mid-regen sees a "verified" badge against
            // text that's about to be discarded — the trust-destroying failure
            // mode the audit flagged as #1.
            if (generating) {
                if (addToast) addToast(__alloT('report_writer.toast_cannot_verify_while_the_report_is', 'Cannot verify while the report is being generated. Try again when generation completes.'), 'error');
                return;
            }
            if (regenSection || adaptingSection) {
                const busy = regenSection || adaptingSection;
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_cannot_verify_while_is_being_regenerated', 'Cannot verify while "{busy}" is being regenerated. Try again when it completes.'), { busy }), 'error');
                return;
            }
            if (editingSection) {
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_save_or_cancel_your_edits_to', 'Save or cancel your edits to "{editingSection}" before verifying.'), { editingSection }), 'error');
                return;
            }
            if (!window.AlloPsycheck || typeof window.AlloPsycheck.verifyDraft !== 'function') {
                if (addToast) addToast(__alloT('report_writer.toast_inline_verifier_not_loaded_please_reload', 'Inline verifier not loaded; please reload the page.'), 'error');
                return;
            }
            // Audit fix #4: filter out malformed rows before mapping. The
            // length-check below previously passed through {assessment:''}
            // rows that then threw inside the IIFE; surface a friendly
            // skip-count toast instead.
            const validScores = (Array.isArray(scoreEntries) ? scoreEntries : []).filter(
                s => s && typeof s.assessment === 'string' && s.assessment.length > 0
                  && typeof s.subtest === 'string' && s.subtest.length > 0
                  && s.score !== null && s.score !== undefined && s.score !== ''
            );
            const skippedCount = (Array.isArray(scoreEntries) ? scoreEntries.length : 0) - validScores.length;
            if (validScores.length === 0) {
                if (addToast) addToast(
                    skippedCount > 0
                        ? rwFmt(__alloT('report_writer.toast_all_score_row_s_are_missing', 'All {skippedCount} score row(s) are missing required fields (assessment, subtest, score). Add valid rows in Step 1.'), { skippedCount })
                        : __alloT('report_writer.toast_add_some_scores_in_step_1', 'Add some scores in Step 1 before verifying.'),
                    'error'
                );
                return;
            }
            const sectionMap = reportSections || {};
            const sectionEntries = Object.entries(sectionMap);
            // Audit fix #5: reject when all sections are whitespace — passes
            // the length check but produces a useless "everything omitted" report.
            const hasNonEmptySection = sectionEntries.some(([, v]) => typeof v === 'string' && v.trim().length > 0);
            if (sectionEntries.length === 0 || !hasNonEmptySection) {
                if (addToast) addToast(__alloT('report_writer.toast_generate_the_report_sections_first_some', 'Generate the report sections first (some content is required), then run verify.'), 'error');
                return;
            }
            // Same rows draft selection uses (rwPsycheckSources).
            const sources = rwPsycheckSources(validScores);
            // Audit fix #2: substitute [Student] with the actual studentName
            // BEFORE handing to the verifier, so the verifier's discrepancy
            // spans reference the same surface text the clinician will see
            // in copyFullReport / printReport (which already substitute).
            // Without this, the verifier sees "[Student] scored 92" while the
            // exported draft says "Jamal scored 92" — silent divergence.
            const studentLabel = effectiveStudentName || '[Student]';
            const draftText = sectionEntries
                .map(([k, v]) => `## ${k}\n${typeof v === 'string' ? v.replace(/\[Student\]/g, () => studentLabel) : ''}`)
                .join('\n\n');
            // Audit fix #3: warn if we're overwriting a report from the
            // other provider (imported vs inline). Prevents silent panel-swap.
            if (discrepancyReport && discrepancyReport._source && discrepancyReport._source !== 'alloflow-inline') {
                if (addToast) addToast(__alloT('report_writer.toast_replacing_the_imported_discrepancy_report_with', 'Replacing the imported discrepancy report with the inline verify result.'), 'info');
            }
            try {
                const result = window.AlloPsycheck.verifyDraft(sources, draftText, { caseRecords });
                result.quote_notes = rwUnsourcedQuotes(draftText, [
                    ...Object.values(bgSections || {}),
                    ...Object.values(clinicalObs || {}).map(o => (o && typeof o === 'object' ? o.text : o)),
                    ...(factChunks || []).map(c => c && c.value),
                    ...(referenceLibrary || []).map(r => r && r.text),
                    ...caseDocuments.map(d => d.text),
                ]);
                result.identity_notes = rwIdentityNotes(draftText, { age: studentAge, grade: studentGrade });
                setDiscrepancyReport(result);
                setPsycheckFingerprint(reportFingerprint);
                const nDisc = Array.isArray(result.discrepancies) ? result.discrepancies.length : 0;
                const nVer = Array.isArray(result.verified) ? result.verified.length : 0;
                const nOm = Array.isArray(result.omitted_scores) ? result.omitted_scores.length : 0;
                const skipSuffix = skippedCount > 0 ? (' ' + rwFmt(__alloT('report_writer.toast_malformed_row_s_skipped', '({skippedCount} malformed row(s) skipped)'), { skippedCount })) : '';
                if (addToast) {
                    if (nDisc > 0) {
                        addToast(rwFmt(__alloT('report_writer.toast_psycheck_found_discrepancy_ies_verified_omitted', 'psycheck found {nDisc} discrepancy(ies), {nVer} verified, {nOm} omitted{skipSuffix}'), { nDisc, nVer, nOm, skipSuffix }), 'info');
                    } else if (nOm > 0) {
                        addToast(rwFmt(__alloT('report_writer.toast_psycheck_verified_omitted_please_review', 'psycheck: {nVer} verified, {nOm} omitted — please review{skipSuffix}'), { nVer, nOm, skipSuffix }), 'info');
                    } else {
                        addToast(rwFmt(__alloT('report_writer.toast_psycheck_citation_s_verified_no_discrepancies', 'psycheck: {nVer} citation(s) verified, no discrepancies{skipSuffix}'), { nVer, skipSuffix }), 'success');
                    }
                }
            } catch (e) {
                warnLog('[Report] psycheck inline verify failed:', e);
                if (addToast) addToast(rwFmt(__alloT('report_writer.toast_inline_verify_failed', 'Inline verify failed: {value}'), { value: (e && e.message) || e }), 'error');
            }
        }, [scoreEntries, reportSections, addToast, effectiveStudentName, generating, regenSection, adaptingSection, editingSection, discrepancyReport, reportFingerprint, bgSections, clinicalObs, factChunks, referenceLibrary, caseDocuments, studentAge, studentGrade]);

        // Map each discrepancy to the section it most likely refers to.
        // Two-tier match:
        //   1. Substring match on the span context (the verified-against text
        //      and the current reportSections may differ — clinician may have
        //      edited after exporting — so we use a short stable substring).
        //   2. Subtest-name fallback (case-insensitive) when the span no
        //      longer matches any section.
        // Discrepancies that bind to neither go into __unattached and render
        // in a top-of-report panel.
        const discrepanciesBySection = useMemo(() => {
            const out = { __unattached: [] };
            if (!discrepancyReport || !Array.isArray(discrepancyReport.discrepancies)) return out;
            const sectionEntries = Object.entries(reportSections || {});
            for (const disc of discrepancyReport.discrepancies) {
                let matched = null;
                // Tier 1: span substring match
                if (disc && disc.span && typeof disc.span.text === 'string' && disc.span.text.length > 20) {
                    // Use a middle slice — first/last chars are often
                    // partial-word fragments due to extractor span padding.
                    const t = disc.span.text;
                    const needle = t.substring(Math.floor(t.length * 0.25), Math.floor(t.length * 0.75));
                    if (needle.length > 10) {
                        for (const [secName, secText] of sectionEntries) {
                            if (typeof secText === 'string' && secText.indexOf(needle) !== -1) {
                                matched = secName;
                                break;
                            }
                        }
                    }
                }
                // Tier 2: subtest-name fallback
                if (!matched && disc && disc.subtest) {
                    const needle = String(disc.subtest).toLowerCase();
                    for (const [secName, secText] of sectionEntries) {
                        if (typeof secText === 'string' && secText.toLowerCase().indexOf(needle) !== -1) {
                            matched = secName;
                            break;
                        }
                    }
                }
                if (matched) {
                    (out[matched] = out[matched] || []).push(disc);
                } else {
                    out.__unattached.push(disc);
                }
            }
            return out;
        }, [discrepancyReport, reportSections]);

        // ── Step 5: Dual-Pass Accuracy Check ──
        // Full-coverage accuracy audit. Every section is chunked without dropping
        // text; parse failures and empty result sets are explicit inconclusive states.
        const runAccuracyCheck = async () => {
            if (!callGemini) {
                setAuditStatus('failed');
                if (addToast) addToast(__alloT('report_writer.toast_accuracy_audit_unavailable_because_no_ai', 'Accuracy audit unavailable because no AI provider is configured.'), 'error');
                return;
            }
            if (checking) return;
            const nonEmptySections = Object.fromEntries(Object.entries(reportSections).filter(([, value]) => typeof value === 'string' && value.trim()));
            if (Object.keys(nonEmptySections).length === 0) {
                setAuditStatus('failed');
                if (addToast) addToast(__alloT('report_writer.toast_generate_or_enter_report_content_before', 'Generate or enter report content before running the accuracy audit.'), 'error');
                return;
            }
            setChecking(true);
            setAuditStatus('running');
            const run = beginAiRun('sections');
            setAuditedFingerprint(null);
            setClinicianAttested(false);
            setUnsourcedAcknowledged(false);
            const verifiedChunks = factChunks.filter(c => c.verified);
            const referenceCtx = buildReferenceContext(scoreEntries, parseFloat(studentAge));
            const chunksText = scrubPII(verifiedChunks.map(c => `- [${c.id}] ${c.source} ${c.field}: ${c.type === 'score' ? rwScoreFactText(c) : c.value}`).join('\n'));
            // The auditor sees the same reference passages each section was written
            // from (retrieval is deterministic), so a statement of what a regulation
            // says is judged against the regulation, not marked unsourced.
            if (referenceLibrary.length > 0 || aiCaseDocs.length > 0) await rwEnsureLumenEvidence();
            const splitCompleteText = (text, maxChars = 5500) => {
                const chunks = [];
                let remaining = String(text || '');
                while (remaining.length > maxChars) {
                    let cut = remaining.lastIndexOf('\n', maxChars);
                    if (cut < Math.floor(maxChars * 0.6)) cut = maxChars;
                    chunks.push(remaining.slice(0, cut));
                    remaining = remaining.slice(cut);
                }
                if (remaining.trim()) chunks.push(remaining);
                return chunks;
            };
            const parseAudit = (raw) => {
                try {
                    const cleaned = String(raw || '').replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
                    let parsed;
                    try { parsed = JSON.parse(cleaned); }
                    catch {
                        const match = cleaned.match(/\{[\s\S]*\}/);
                        if (!match) return { parseOk: false, results: [] };
                        parsed = JSON.parse(match[0]);
                    }
                    if (!parsed || !Array.isArray(parsed.results)) return { parseOk: false, results: [] };
                    const allowed = new Set(['verified', 'unsourced', 'contradicts']);
                    const results = parsed.results.filter(item => item && typeof item.claim === 'string' && allowed.has(item.status));
                    if (results.length !== parsed.results.length) return { parseOk: false, results };
                    return { parseOk: true, results };
                } catch {
                    return { parseOk: false, results: [] };
                }
            };
            const buildAuditPrompt = (mode, sectionName, draftChunk) => {
                const role = mode === 'claim'
                    ? 'Pass A: verify every factual and numerical claim against the ground truth.'
                    : 'Pass B: skeptically search for contradictions, unsupported claims, score errors, and misattributions.';
                return `You are a clinical accuracy auditor. ${role}

VERIFIED FACT CHUNKS (ground truth):
${chunksText || '(No verified chunks were supplied.)'}
${referenceCtx ? '\nCLINICAL REFERENCE:\n' + referenceCtx : ''}
${(() => { const block = rwReferencePromptBlock(sectionReferencePassages(sectionName), referenceLibrary.length, scrubPII); return block ? block + '\nA claim about what a regulation, manual or guideline says is verified only if one of these passages says it; a claim about the student must still match the fact chunks.' : ''; })()}
${(() => { const block = rwCasePromptBlock(sectionCasePassages(sectionName)); return block ? block + '\nA statement about the student\'s history is verified if one of these case record passages says it; a current result must still match the fact chunks.' : ''; })()}

REPORT SECTION: ${sectionName}
"""
${scrubPII(draftChunk)}
"""

For every claim, return:
- verified: directly supported by a fact chunk
- unsourced: not directly traceable to a fact chunk
- contradicts: conflicts with a fact chunk or misstates a score, classification, percentile, test, or subtest

Return ONLY valid JSON:
{"results":[{"claim":"brief exact claim","status":"verified|unsourced|contradicts","chunkId":"matching chunk id or null","explanation":"brief reason"}]}`;
            };
            const auditSections = async (sectionsToAudit) => {
                const reconciledResults = [];
                let parseFailures = 0;
                let emptyUnits = 0;
                let failedUnits = 0;
                let unitIndex = 0;
                const units = [];
                Object.entries(sectionsToAudit).forEach(([section, text]) => {
                    splitCompleteText(text).forEach((chunk, index) => units.push({ section, chunk, part: index + 1 }));
                });
                for (const unit of units) {
                    unitIndex++;
                    if (run.signal.aborted) throw rwStoppedError();
                    setGenProgress(rwFmt(__alloT('report_writer.progress_auditing', 'Auditing {section} ({unitIndex}/{count})...'), { section: unit.section, unitIndex, count: units.length }));
                    // A failed request used to end the whole audit and discard
                    // every unit already checked; it now leaves this unit
                    // inconclusive.
                    let unitFailed = false;
                    const pass = (mode) => aiCall('sections', buildAuditPrompt(mode, unit.section, unit.chunk), true)
                        .catch(err => { if (rwIsStopped(err)) throw err; unitFailed = true; return null; });
                    const [rawA, rawB] = await Promise.all([pass('claim'), pass('skeptical')]);
                    if (unitFailed) { failedUnits++; continue; }
                    const passA = parseAudit(rawA);
                    const passB = parseAudit(rawB);
                    if (!passA.parseOk || !passB.parseOk) parseFailures++;
                    if (passA.results.length === 0 || passB.results.length === 0) emptyUnits++;
                    const reconciled = reconcileAuditPasses(passA.results, passB.results)
                        .map(result => ({ ...result, section: unit.section, auditPart: unit.part }));
                    reconciledResults.push(...reconciled);
                }
                return { results: reconciledResults, parseFailures, emptyUnits, failedUnits, units: units.length };
            };
            const auditStartSections = JSON.stringify(reportSectionsRef.current || {});
            const changedWhileAuditing = () => {
                if (JSON.stringify(reportSectionsRef.current || {}) === auditStartSections) return false;
                setAccuracyResults([]);
                setAuditStatus('not_run');
                setAuditedFingerprint(null);
                setGenProgress('');
                if (addToast) addToast(__alloT('report_writer.toast_audit_report_changed', 'The report changed while the audit was running, so its results and corrections were not applied. Run the audit again.'), 'info');
                return true;
            };
            try {
                let workingSections = { ...reportSections };
                let audited = await auditSections(workingSections);
                if (audited.failedUnits > 0) {
                    setAccuracyResults(audited.results);
                    setAuditStatus('inconclusive');
                    setAuditedFingerprint(null);
                    setGenProgress('');
                    if (addToast) addToast(rwFmt(__alloT('report_writer.toast_audit_units_failed', 'Accuracy audit inconclusive: {count} of {units} part(s) of the report could not be checked because the AI request failed. The findings below cover the rest. Formal export remains locked.'), { count: audited.failedUnits, units: audited.units }), 'info');
                    return;
                }
                if (audited.parseFailures > 0 || audited.emptyUnits > 0 || audited.results.length === 0) {
                    setAccuracyResults(audited.results);
                    setAuditStatus('inconclusive');
                    setAuditedFingerprint(null);
                    setGenProgress('');
                    if (addToast) addToast(rwFmt(__alloT('report_writer.toast_accuracy_audit_inconclusive_parse_failure_s', 'Accuracy audit inconclusive: {parseFailures} parse failure(s), {emptyUnits} empty audit unit(s). Formal export remains locked.'), { parseFailures: audited.parseFailures, emptyUnits: audited.emptyUnits }), 'info');
                    return;
                }

                const fixable = audited.results.filter(result => result.status === 'contradicts' || (result.status === 'discrepancy' && result.confidence === 'needs-review'));
                // Sections the audit rewrote, and the evidence their new text cites.
                const auditCorrected = [];
                const auditEvidence = {};
                if (fixable.length > 0) {
                    const bySection = new Map();
                    fixable.forEach(issue => {
                        if (!issue.section || !workingSections[issue.section]) return;
                        if (!bySection.has(issue.section)) bySection.set(issue.section, []);
                        bySection.get(issue.section).push(issue);
                    });
                    for (const [sectionName, issues] of bySection.entries()) {
                        setGenProgress(rwFmt(__alloT('report_writer.progress_correcting_issue_s_in', 'Correcting {count} issue(s) in {sectionName}...'), { count: issues.length, sectionName }));
                        const corrections = issues.map(issue => `FIX: "${issue.claim}" — ${issue.explanation || 'conflicts with verified data'}`).join('\n');
                        // A failed correction leaves the section as it was; the
                        // re-audit below still reports the contradiction.
                        let fixResult = '';
                        try { fixResult = await aiCall('sections', buildSectionPrompt(sectionName, verifiedChunks, correctionInstructions(workingSections[sectionName], 'CRITICAL CORRECTIONS FROM THE ACCURACY AUDIT', corrections) + ' Keep every claim traceable to verified chunks.'), false); }
                        catch (fixErr) { if (rwIsStopped(fixErr)) throw fixErr; warnLog('[ReportWriter] Audit correction failed for ' + sectionName + ':', fixErr); continue; }
                        const fixed = parseEvidenceResponse(fixResult, citableFor(sectionName, verifiedChunks));
                        if (fixed.text) {
                            workingSections[sectionName] = fixed.text;
                            auditCorrected.push(sectionName);
                            auditEvidence[sectionName] = fixed.usedChunks;
                        }
                    }
                    setGenProgress(__alloT('report_writer.progress_re_auditing_the_corrected_report', 'Re-auditing the corrected report...'));
                    audited = await auditSections(workingSections);
                    if (audited.failedUnits > 0 || audited.parseFailures > 0 || audited.emptyUnits > 0 || audited.results.length === 0) {
                        if (changedWhileAuditing()) return;
                        replaceSections(workingSections, 'audit', { replaceAll: true });
                        setAccuracyResults(audited.results);
                        setAuditStatus('inconclusive');
                        setAuditedFingerprint(null);
                        if (addToast) addToast(__alloT('report_writer.toast_corrections_were_generated_but_the_required', 'Corrections were generated, but the required post-fix audit was inconclusive. Formal export remains locked.'), 'info');
                        return;
                    }
                }

                const finalResults = audited.results.slice();
                try {
                    const py = window.AlloModules?.PyodideRuntime;
                    if (py && typeof py.runAudit === 'function') {
                        const pyFindings = await py.runAudit({ reportSections: workingSections, factChunks: verifiedChunks, scoreEntries });
                        (Array.isArray(pyFindings) ? pyFindings : []).forEach(finding => finalResults.push({
                            claim: finding.claim || '', status: finding.status || 'info', chunkId: null,
                            explanation: finding.finding || '', confidence: finding.severity === 'high' ? 'needs-review' : 'medium',
                            auditSource: 'python', section: finding.section || null, fixHint: finding.fix_hint || null
                        }));
                    }
                } catch (pyErr) { warnLog('[ReportWriter] Deterministic audit skipped:', pyErr && pyErr.message); }

                const blocking = finalResults.filter(result => result.status === 'contradicts' || (result.status === 'discrepancy' && result.confidence === 'needs-review'));
                if (changedWhileAuditing()) return;
                replaceSections(workingSections, 'audit', { replaceAll: true });
                if (auditCorrected.length) {
                    setSectionEvidenceMap(prev => ({ ...prev, ...auditEvidence }));
                    if (addToast) addToast(rwFmt(__alloT('report_writer.toast_audit_corrected_sections', 'The audit corrected {sections}. Each can be restored with Undo in Generate Report.'), { sections: auditCorrected.join(', ') }), 'info');
                }
                setAccuracyResults(finalResults);
                setAuditStatus(blocking.length > 0 ? 'blocked' : 'passed');
                setAuditedFingerprint(fingerprintForSections(workingSections));
                setGenProgress('');
                if (addToast) addToast(
                    blocking.length > 0
                        ? rwFmt(__alloT('report_writer.toast_accuracy_audit_completed_with_blocking_issue', 'Accuracy audit completed with {count} blocking issue(s). Formal export remains locked.'), { count: blocking.length })
                        : rwFmt(__alloT('report_writer.toast_accuracy_audit_completed_across_full_report', 'Accuracy audit completed across {units} full-report unit(s); no blocking contradictions remain.'), { units: audited.units }),
                    blocking.length > 0 ? 'info' : 'success'
                );
            } catch (err) {
                setAuditedFingerprint(null);
                setGenProgress('');
                if (rwIsStopped(err)) {
                    setAuditStatus('not_run');
                    if (addToast) addToast(__alloT('report_writer.toast_audit_stopped', 'The accuracy check was stopped. The report was not changed.'), 'info');
                    return;
                }
                warnLog('Accuracy check error:', err);
                setAuditStatus('failed');
                if (addToast) addToast(t('toasts.accuracy_check_failed'), 'error');
            } finally {
                endAiRun('sections', run);
                setChecking(false);
            }
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
        const blockingAccuracyFindings = accuracyResults.filter(result => result.status === 'contradicts' || (result.status === 'discrepancy' && result.confidence === 'needs-review'));
        // An `unsourced` claim is a statement the auditor could NOT tie to any
        // verified fact. It is not a contradiction, so it never blocked export —
        // a clinician could attest and sign a report containing assertions with
        // no traceable basis, with the count sitting in a panel they may not have
        // opened. Unsourced claims still do not hard-block (some narrative
        // connective tissue is legitimately unsourced), but they now require a
        // SEPARATE, explicit acknowledgement before attestation is available.
        const unsourcedFindings = accuracyResults.filter(result => result.status === 'unsourced');
        const auditIsCurrent = auditedFingerprint !== null && auditedFingerprint === reportFingerprint;
        const psycheckBlockingCount = Array.isArray(discrepancyReport?.discrepancies) ? discrepancyReport.discrepancies.length : 0;
        const psycheckIsCurrent = scoreEntries.length === 0 || psycheckFingerprint === reportFingerprint;
        const exportSections = Object.fromEntries(rwOrderedSections(reportSections, blueprint));
        const notExported = Object.keys(reportSections).filter(k => String(reportSections[k] || '').trim() && !(k in exportSections));
        const leftovers = rwLeftoverPlaceholders(exportSections, reportPeople);
        const _exportGate = evaluateExportGate({
            placeholderCount: leftovers.length,
            hasSections: Object.keys(reportSections).length > 0,
            auditStatus: auditStatus,
            auditIsCurrent: auditIsCurrent,
            blockingCount: blockingAccuracyFindings.length,
            psycheckIsCurrent: psycheckIsCurrent,
            psycheckBlockingCount: psycheckBlockingCount,
            unsourcedCount: unsourcedFindings.length,
            unsourcedAcknowledged: unsourcedAcknowledged,
            clinicianAttested: clinicianAttested
        });
        const formalExportReady = _exportGate.ready;
        // One-click fixes for placeholders: a role token when exactly one person
        // has that role, and machine leftovers (citation lines and ids).
        const replaceTokenEverywhere = (token, value) => {
            const updates = {};
            Object.entries(reportSectionsRef.current || {}).forEach(([k, v]) => { if (String(v || '').includes(token)) updates[k] = String(v).split(token).join(value); });
            if (Object.keys(updates).length) replaceSections(updates, 'edited');
        };
        const removeMachineLeftovers = () => {
            const updates = {};
            Object.entries(reportSectionsRef.current || {}).forEach(([k, v]) => {
                if (new RegExp(RW_MACHINE_LEFTOVER_RE.source).test(String(v || ''))) updates[k] = rwStripMachineLeftovers(v);
            });
            if (Object.keys(updates).length) replaceSections(updates, 'edited');
        };
        const clinicianCanAttest = _exportGate.canAttest;
        const requireFormalExportReady = () => {
            if (formalExportReady) return true;
            let message = __alloT('report_writer.export_locked', 'Formal export is locked.');
            if (Object.keys(reportSections).length === 0) message += ' ' + __alloT('report_writer.export_locked_generate', 'Generate the report first.');
            else if (!auditIsCurrent || auditStatus === 'not_run') message += ' ' + __alloT('report_writer.export_locked_audit', 'Run the full accuracy audit on the current report.');
            else if (auditStatus === 'inconclusive' || auditStatus === 'failed') message += ' ' + __alloT('report_writer.export_locked_audit_incomplete', 'The audit must complete successfully.');
            else if (blockingAccuracyFindings.length > 0 || auditStatus === 'blocked') message += ' ' + __alloT('report_writer.export_locked_blocking', 'Resolve blocking contradictions or discrepancies and rerun the audit.');
            else if (!psycheckIsCurrent) message += ' ' + __alloT('report_writer.export_locked_psycheck', 'Run the inline deterministic score verifier on the current report.');
            else if (psycheckBlockingCount > 0) message += ' ' + __alloT('report_writer.export_locked_psycheck_findings', 'Resolve deterministic score discrepancies and rerun verification.');
            else if (unsourcedFindings.length > 0 && !unsourcedAcknowledged) message += ' ' + rwFmt(__alloT('report_writer.export_locked_unsourced', 'Acknowledge the {count} unsourced claim(s) flagged by the audit.'), { count: unsourcedFindings.length });
            else if (leftovers.length > 0) message += ' ' + __alloT('report_writer.export_locked_placeholders', 'Replace the placeholders listed in Export & Save.');
            else if (!clinicianAttested) message += ' ' + __alloT('report_writer.export_locked_attest', 'Complete the clinician attestation.');
            if (addToast) addToast(message, 'error');
            return false;
        };
        // What closing the Report Writer would lose. Session-only mode stores
        // nothing on the device, and case documents are never stored; a JSON
        // export counts as saved until something changes. The dialog around the
        // panel reads this before it closes, and the browser warns on reload.
        const [savedSnapshot, setSavedSnapshot] = useState(null);
        // The snapshot's savedAt stamp changes on every call, so it is left out.
        const snapshotKey = () => { const { savedAt, ...content } = buildReportSnapshot(); return JSON.stringify(content); };
        const snapshotText = useMemo(snapshotKey, [buildReportSnapshot]);
        const hasReportContent = scoreEntries.length > 0 || factChunks.length > 0 || caseDocuments.length > 0
            || Object.values(reportSections || {}).some(v => String(v || '').trim())
            || Object.values(bgSections || {}).some(v => String(v || '').trim())
            || Object.values(clinicalObs || {}).some(o => String((o && typeof o === 'object' ? o.text : o) || '').trim());
        const unsavedWork = hasReportContent && (caseDocuments.length > 0 || (!persistLocally && savedSnapshot !== snapshotText));
        useEffect(() => {
            if (workStateRef) workStateRef.current = { unsaved: unsavedWork, caseDocuments: caseDocuments.length > 0, persisted: persistLocally };
        }, [workStateRef, unsavedWork, caseDocuments.length, persistLocally]);
        useEffect(() => {
            if (!unsavedWork) return undefined;
            const warn = (event) => { event.preventDefault(); event.returnValue = ''; return ''; };
            window.addEventListener('beforeunload', warn);
            return () => window.removeEventListener('beforeunload', warn);
        }, [unsavedWork]);
        const exportJSON = () => {
            const data = { ...buildReportSnapshot(), exportedAt: new Date().toISOString() };
            setSavedSnapshot(snapshotKey());
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = `report_${sanitizeFilenamePart(effectiveStudentName)}_${new Date().toISOString().slice(0, 10)}.json`;
            a.hidden = true;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 0);
            if (addToast) addToast(t('toasts.json_exported'), 'success');
        };
        const importJSON = () => confirmThen(unsavedWork, replaceCaseRequest(), importJSONNow);
        const importJSONNow = () => {
            try {
                if (importText.length > RW_MAX_JSON_CHARS) throw new Error('Report JSON exceeds the 2 MB limit');
                const data = JSON.parse(importText);
                applyReportSnapshot(data);
                setImportText('');
            } catch (error) { if (addToast) addToast(rwFmt(__alloT('report_writer.toast_invalid_report_json', 'Invalid report JSON: {message}'), { message: error.message }), 'error'); }
        };
        const copyFullReport = () => {
            if (!requireFormalExportReady()) return;
            const draftNotice = `${'═'.repeat(50)}\nCONFIDENTIAL DRAFT — AI-ASSISTED DOCUMENT\nThis report requires review and approval by the\nlicensed school psychologist before use in\neducational decision-making.\n${'═'.repeat(50)}\n\n`;
            const header = `${reportTitle}\nStudent: ${effectiveStudentName || '[Student]'}\nAge: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'}\nDate: ${new Date().toLocaleDateString()}\n${'─'.repeat(50)}\n\n`;
            const body = Object.entries(exportSections).map(([k, v]) => `${k.toUpperCase()}\n\n${v.replace(/\[Student\]/g, () => effectiveStudentName || '[Student]')}`).join('\n\n' + '─'.repeat(50) + '\n\n');
            const footer = `\n\n${'─'.repeat(50)}\nClinician Signature: _______________ Date: ________ License #: ________\nGenerated with AlloFlow Report Writer (AI-Assisted Draft)\n`;
            const scoreTable = rwScoreTableText(scoreEntries);
            const refs = rwReferencesConsultedText(rwReferencesConsulted(sectionEvidenceMap));
            const plain = draftNotice + header + body + (scoreTable ? '\n\n' + '─'.repeat(50) + '\n' + scoreTable : '') + (refs ? '\n\n' + '─'.repeat(50) + '\n' + refs : '') + footer;
            // Formatted as well as plain, so pasting into Word keeps the headings
            // and the score table instead of a wall of text.
            const clip = navigator.clipboard;
            const copy = (typeof window.ClipboardItem === 'function' && clip && typeof clip.write === 'function')
                ? clip.write([new window.ClipboardItem({
                    'text/html': new Blob([buildReportPrintHtml(printHtmlArgs())], { type: 'text/html' }),
                    'text/plain': new Blob([plain], { type: 'text/plain' }) })])
                : clip.writeText(plain);
            copy
                .then(() => { if (addToast) addToast(t('toasts.report_copied_clipboard'), 'success'); })
                .catch(() => { if (addToast) addToast(__alloT('report_writer.toast_could_not_copy_the_report_to', 'Could not copy the report to the clipboard.'), 'error'); });
        };
        // ── Audit summary export ──
        // Groups findings by provenance (Python deterministic vs LLM passes vs
        // self-healed etc.) for sharing with a reviewing supervisor / district.
        // Standalone — exposes the audit without dumping the student narrative.
        const buildAuditSummary = (includeHeader = true) => {
            if (!accuracyResults || accuracyResults.length === 0) return null;
            const symbol = s => s === 'verified' ? 'OK' : s === 'contradicts' ? 'X ' : s === 'unsourced' ? '? ' : s === 'discrepancy' ? '! ' : '- ';
            const groupOrder = [
                ['python',                   'Python deterministic checks'],
                ['dual-pass-disagree',       'LLM dual-pass DISAGREEMENT (review carefully)'],
                ['dual-pass-minor-disagree', 'LLM dual-pass minor disagreement'],
                ['dual-pass-agree',          'LLM dual-pass (both passes agreed)'],
                ['single-pass',              'LLM single pass (Claim Verifier only)'],
                ['pass-b-only',              'LLM single pass (Contradiction Hunter only)'],
                ['self-healed',              'Self-healed (was a contradiction; auto-fixed)'],
                ['post-fix-verification',    'Re-checked after self-heal'],
            ];
            const buckets = new Map(groupOrder.map(([k]) => [k, []]));
            const orphans = [];
            for (const r of accuracyResults) {
                const src = r.auditSource || '';
                if (buckets.has(src)) buckets.get(src).push(r);
                else orphans.push(r);
            }
            const totals = {
                total: accuracyResults.length,
                verified: accuracyResults.filter(r => r.status === 'verified').length,
                contradicts: accuracyResults.filter(r => r.status === 'contradicts').length,
                unsourced: accuracyResults.filter(r => r.status === 'unsourced').length,
                discrepancy: accuracyResults.filter(r => r.status === 'discrepancy').length,
            };
            const lines = [];
            if (includeHeader) {
                lines.push('='.repeat(60));
                lines.push('REPORT WRITER ACCURACY AUDIT SUMMARY');
                lines.push('='.repeat(60));
                lines.push(`Report:    ${reportTitle || 'Untitled'}`);
                lines.push(`Student:   ${effectiveStudentName || '[Student]'}`);
                lines.push(`Age/Grade: ${studentAge || 'N/A'} / ${studentGrade || 'N/A'}`);
                lines.push(`Generated: ${new Date().toLocaleString()}`);
                lines.push('');
            }
            lines.push(`Total findings: ${totals.total}`);
            lines.push(`  OK Verified:    ${totals.verified}`);
            lines.push(`  X  Contradicts: ${totals.contradicts}`);
            lines.push(`  ?  Unsourced:   ${totals.unsourced}`);
            if (totals.discrepancy) lines.push(`  !  Discrepancy:  ${totals.discrepancy}`);
            lines.push('');
            for (const [key, label] of groupOrder) {
                const arr = buckets.get(key);
                if (!arr || arr.length === 0) continue;
                lines.push('');
                lines.push(`-- ${label} (${arr.length}) --`);
                for (const f of arr) {
                    const sec = f.section ? `[${f.section}] ` : '';
                    lines.push(`  ${symbol(f.status)} ${sec}${f.claim || '(no claim text)'}`);
                    if (f.explanation) lines.push(`       -> ${f.explanation}`);
                    if (f.fixHint) lines.push(`       fix: ${f.fixHint}`);
                }
            }
            if (orphans.length) {
                lines.push('');
                lines.push(`-- Other (${orphans.length}) --`);
                for (const f of orphans) {
                    const sec = f.section ? `[${f.section}] ` : '';
                    lines.push(`  ${symbol(f.status)} ${sec}${f.claim || ''}`);
                    if (f.explanation) lines.push(`       -> ${f.explanation}`);
                }
            }
            lines.push('');
            lines.push('-'.repeat(60));
            lines.push('Findings are advisory. Licensed clinician is responsible for');
            lines.push('final review of all claims against the underlying source data.');
            lines.push('Generated with AlloFlow Report Writer (AI-Assisted).');
            return lines.join('\n');
        };
        const copyAuditSummary = () => {
            if (!auditIsCurrent) {
                if (addToast) addToast(__alloT('report_writer.toast_audit_findings_are_stale_for_the', 'Audit findings are stale for the current report. Rerun the accuracy audit before copying them.'), 'error');
                return;
            }
            const summary = buildAuditSummary(true);
            if (!summary) {
                if (addToast) addToast(__alloT('report_writer.toast_no_audit_findings_yet_run_the', 'No audit findings yet — run the accuracy check first.'), 'info');
                return;
            }
            navigator.clipboard.writeText(summary).then(() => {
                if (addToast) addToast(__alloT('report_writer.toast_audit_summary_copied_to_clipboard', 'Audit summary copied to clipboard'), 'success');
            }).catch(() => {
                if (addToast) addToast(__alloT('report_writer.toast_could_not_copy_paste_from_the', 'Could not copy — paste from the textarea below.'), 'error');
            });
        };

        const printReport = () => {
            if (!requireFormalExportReady()) return;
            const w = window.open('', '_blank');
            if (!w) {
                if (addToast) addToast(__alloT('report_writer.toast_the_print_window_was_blocked_allow', 'The print window was blocked. Allow pop-ups and try again.'), 'error');
                return;
            }
            try { w.opener = null; } catch { /* browser may prevent opener reassignment */ }
            const html = buildReportPrintHtml(printHtmlArgs());
            w.document.write(html);
            w.document.close();
            w.print();
        };
        const printHtmlArgs = () => ({
                reportTitle,
                studentName: effectiveStudentName || '[Student]',
                studentAge: studentAge || 'N/A',
                studentGrade: studentGrade || 'N/A',
                reportSections: exportSections,
                rtiTrendSeries,
                scoreEntries,
                referencesConsulted: rwReferencesConsulted(sectionEvidenceMap),
                isDemo: isDemoLoaded || reportTitle?.toLowerCase().includes('demo')
                    || effectiveStudentName?.toLowerCase().includes('demo')
                    || effectiveStudentName?.toLowerCase().includes('fictional'),
                locale: 'en'
            });

        // ── Color helpers ──
        const cBg = (color) => `bg-${color}-50`;
        const cBorder = (color) => `border-${color}-200`;
        const cText = (color) => `text-${color}-700`;
        const cBadge = (color) => `bg-${color}-100 text-${color}-800`;

        // ── Verified chunk stats ──
        const totalChunks = factChunks.length;
        const verifiedCount = factChunks.filter(c => c.verified).length;
        const deficitCount = factChunks.filter(c => c.devNormResult?.type === 'deficit').length;
        const hasSourceData = scoreEntries.length > 0
            || Object.values(bgSections).some(value => String(value || '').trim())
            || Object.values(clinicalObs).some(value => String(value?.text || '').trim());
        const canNavigateToStep = (step) => {
            if (step <= 4 || step === 10) return true;
            if (step === 5) return hasSourceData;
            if (step >= 6 && step <= 8) return verifiedCount > 0;
            if (step === 9) return Object.keys(reportSections).length > 0;
            return false;
        };
        // A disabled step button could not be focused, so a keyboard or screen
        // reader user never learned the step existed or what it needed; its
        // reason was only in a hover title.
        const stepBlockedReason = (step) => {
            if (canNavigateToStep(step)) return '';
            if (step === 5) return __alloT('report_writer.step_blocked_needs_data', 'Add scores, background or observations first.');
            if (step >= 6 && step <= 8) return __alloT('report_writer.step_blocked_needs_verified_fact', 'Verify at least one fact in Fact Review first.');
            return __alloT('report_writer.step_blocked_needs_report', 'Generate the report first.');
        };
        // Moving to a step puts focus on its heading, so the new content is
        // read and Tab continues from it rather than from the step bar.
        const stepFocusReadyRef = useRef(false);
        useEffect(() => {
            if (!stepFocusReadyRef.current) { stepFocusReadyRef.current = true; return; }
            const heading = panelRootRef.current && panelRootRef.current.querySelector('[data-rw-step-heading]');
            if (heading && typeof heading.focus === 'function') heading.focus();
        }, [currentStep]);

        // ── Render ──
        return h('div', { ref: panelRootRef, className: 'space-y-4' },
            confirmationRequest && h('div', {
                ref: confirmationOverlayRef,
                className: 'fixed inset-0 z-[10000] bg-black/60 flex items-center justify-center p-4',
                role: 'alertdialog',
                'aria-modal': 'true',
                'aria-labelledby': 'rw-confirm-title',
                'aria-describedby': 'rw-confirm-description',
                onKeyDown: handleConfirmationKeyDown,
                onClick: event => { if (event.target === event.currentTarget) closeConfirmation(); }
            },
                h('div', {
                    ref: confirmationDialogRef,
                    tabIndex: -1,
                    className: 'w-full max-w-md rounded-xl bg-white p-5 shadow-2xl border border-slate-300'
                },
                    h('h2', { id: 'rw-confirm-title', className: 'text-base font-bold text-slate-900' }, confirmationRequest.title),
                    h('p', { id: 'rw-confirm-description', className: 'mt-2 text-sm leading-relaxed text-slate-700' }, confirmationRequest.message),
                    h('div', { className: 'mt-5 flex justify-end gap-2' },
                        h('button', { ref: confirmationCancelRef, type: 'button', className: 'rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100', onClick: closeConfirmation }, __alloT('report_writer.cancel', 'Cancel')),
                        h('button', { type: 'button', className: 'rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800', onClick: confirmRequestedAction }, confirmationRequest.confirmLabel)
                    )
                )
            ),
            // ── Phase D — DA ingestion banner ──
            // Shown only when DA Studio has stashed a payload that hasn't
            // been ingested or dismissed yet. The actual ingest is one
            // click; the dismiss is local-only (doesn't clear the global).
            daExportPayload && !daIngestDismissed ? h('div', {
                className: 'rounded-2xl p-4 border border-blue-300 bg-gradient-to-r from-blue-50 to-indigo-50',
                role: 'region',
                'aria-label': __alloT('report_writer.aria_dynamic_assessment_findings_available', 'Dynamic Assessment findings available')
            },
                h('div', { className: 'flex items-start gap-3' },
                    h('div', { className: 'text-2xl flex-shrink-0' }, '🔬'),
                    h('div', { className: 'flex-1 min-w-0' },
                        h('div', { className: 'text-sm font-bold text-blue-900 mb-1' },
                            __alloT('report_writer.dynamic_assessment_findings_ready_to_ingest', 'Dynamic Assessment findings ready to ingest')),
                        h('div', { className: 'text-xs text-blue-800 leading-relaxed' },
                            daExportPayload.factChunks ? rwFmt(__alloT('report_writer.fact_chunks', '{count} fact chunks'), { count: daExportPayload.factChunks.length }) : __alloT('report_writer.zero_fact_chunks', '0 fact chunks'),
                            ' · ',
                            daExportPayload.modifiabilityTier ? daExportPayload.modifiabilityTier.label : __alloT('report_writer.modifiability_profile', 'modifiability profile'),
                            daExportPayload.studentNickname ? ' · ' + daExportPayload.studentNickname : '',
                            daExportPayload.isCustomBank ? (' · ' + __alloT('report_writer.custom_probe', 'custom probe')) : ' · ' + daExportPayload.domain + ' / ' + daExportPayload.difficulty),
                        h('div', { className: 'text-[11px] text-blue-700 italic mt-1' },
                            rwFmt(__alloT('report_writer.ingest_will_add_fact_chunks_auto', 'Ingest will: add {value} fact chunks (auto-verified) + pre-draft a "Dynamic Assessment Results" section in this report. Original chunks are editable; section is editable.'), { value: daExportPayload.factChunks ? daExportPayload.factChunks.length : 0 }))
                    ),
                    h('div', { className: 'flex flex-col gap-2 flex-shrink-0' },
                        h('button', {
                            onClick: ingestDaExport,
                            className: 'px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors',
                            'aria-label': __alloT('report_writer.aria_ingest_da_findings_into_this_report', 'Ingest DA findings into this report')
                        }, (__alloT('report_writer.ingest', 'Ingest') + ' →')),
                        h('button', {
                            onClick: dismissDaExport,
                            className: 'px-3 py-1 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold transition-colors',
                            'aria-label': __alloT('report_writer.aria_dismiss_for_now', 'Dismiss for now')
                        }, __alloT('report_writer.dismiss', 'Dismiss'))
                    )
                )
            ) : null,
            // ── RTI / Assessment Center ingest banner (→ IEP-Ready Packet) ──
            rtiExportPayload && !rtiIngestDismissed ? h('div', {
                className: 'rounded-2xl p-4 border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50',
                role: 'region',
                'aria-label': __alloT('report_writer.aria_assessment_center_rti_data_available', 'Assessment Center RTI data available')
            },
                h('div', { className: 'flex items-start gap-3' },
                    h('div', { className: 'text-2xl flex-shrink-0' }, '🎯'),
                    h('div', { className: 'flex-1 min-w-0' },
                        h('div', { className: 'text-sm font-bold text-emerald-900 mb-1' },
                            __alloT('report_writer.assessment_center_rti_data_ready_for', 'Assessment Center RTI data ready for an IEP packet')),
                        h('div', { className: 'text-xs text-emerald-800 leading-relaxed' },
                            rwFmt(__alloT('report_writer.fact_chunks_2', '{value} fact chunks'), { value: rtiExportPayload.factChunks ? rtiExportPayload.factChunks.length : 0 }),
                            rtiExportPayload.rtiTier ? (rtiExportPayload.rtiTier.reviewRequired ? (' · ' + __alloT('report_writer.educator_review_required', 'Educator review required')) : (' · ' + rwFmt(__alloT('report_writer.rti_tier', 'RTI tier {tier}'), { tier: rtiExportPayload.rtiTier.tier }))) : '',
                            rtiExportPayload.studentNickname ? ' · ' + rtiExportPayload.studentNickname : ''),
                        h('div', { className: 'text-[11px] text-emerald-700 italic mt-1' },
                            __alloT('report_writer.ingest_switches_this_report_to_the', 'Ingest switches this report to the IEP-Ready Packet blueprint and pre-drafts the RTI/CBM, progress-monitoring, intervention, and DA sections (all editable). Screening data — not an eligibility determination.'))
                    ),
                    h('div', { className: 'flex flex-col gap-2 flex-shrink-0' },
                        h('button', {
                            onClick: ingestRtiExport,
                            className: 'px-4 py-2 bg-emerald-700 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors',
                            'aria-label': __alloT('report_writer.aria_ingest_rti_data_into_an_iep', 'Ingest RTI data into an IEP packet')
                        }, (__alloT('report_writer.ingest', 'Ingest') + ' →')),
                        h('button', {
                            onClick: dismissRtiExport,
                            className: 'px-3 py-1 border border-slate-300 hover:bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold transition-colors',
                            'aria-label': __alloT('report_writer.aria_dismiss_for_now', 'Dismiss for now')
                        }, __alloT('report_writer.dismiss', 'Dismiss'))
                    )
                )
            ) : null,
            // ── DA launch CTA — shown when no payload is queued. ──
            // Lets the clinician open Dynamic Assessment Studio directly from
            // Report Writer when they realize they need DA data. Triggers the
            // host's __alloOpenDynamicAssessment() hook installed by AlloFlowANTI.
            !daExportPayload && typeof window !== 'undefined' && typeof window.__alloOpenDynamicAssessment === 'function' ? h('div', {
                className: 'rounded-xl px-4 py-2.5 border border-slate-200 bg-slate-50 flex items-center justify-between gap-3',
                role: 'region',
                'aria-label': __alloT('report_writer.aria_launch_dynamic_assessment_studio', 'Launch Dynamic Assessment Studio')
            },
                h('div', { className: 'flex items-center gap-2 text-xs text-slate-600' },
                    h('span', { className: 'text-base flex-shrink-0' }, '🔬'),
                    h('span', null, __alloT('report_writer.need_dynamic_assessment_data_run_a', 'Need Dynamic Assessment data? Run a probe to capture modifiability + scaffold-response findings — they will flow into this report automatically.'))
                ),
                h('button', {
                    onClick: function () { try { window.__alloOpenDynamicAssessment(); } catch (e) {} },
                    className: 'px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-[11px] font-bold transition-colors flex-shrink-0',
                    'aria-label': __alloT('report_writer.aria_open_dynamic_assessment_studio', 'Open Dynamic Assessment Studio')
                }, (__alloT('report_writer.run_a_probe', 'Run a probe') + ' →'))
            ) : null,
            // Header
            h('div', { className: 'bg-gradient-to-r from-violet-50 to-indigo-50 rounded-2xl p-5 border border-violet-200' },
                h('div', { className: 'flex items-center justify-between mb-3' },
                    h('div', { className: 'flex items-center gap-3' },
                        h('span', { className: 'text-2xl' }, '📝'),
                        h('div', null,
                            h('h2', { className: 'text-lg font-bold text-violet-900' }, __alloT('report_writer.report_writer', 'Report Writer')),
                            h('p', { className: 'text-xs text-violet-600' }, __alloT('report_writer.fact_verified_clinical_report_generation', 'Fact-verified clinical report generation'))
                        )
                    ),
                    h('div', { className: 'flex items-center gap-2' },
                        h('label', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.age', 'Age:')),
                        h('input', { type: 'number', className: 'w-12 text-xs border rounded px-1.5 py-0.5 text-center', placeholder: __alloT('report_writer.placeholder_yrs', 'yrs'), 'aria-label': __alloT('report_writer.aria_student_age', 'Student age'), value: studentAge, onChange: e => setStudentAge(e.target.value), min: 1, max: 22 }),
                        h('label', { className: 'text-[11px] text-slate-600 ms-2' }, __alloT('report_writer.grade', 'Grade:')),
                        h('input', { type: 'text', className: 'w-12 text-xs border rounded px-1.5 py-0.5 text-center', placeholder: __alloT('report_writer.placeholder_e_g_3', 'e.g. 3'), 'aria-label': __alloT('report_writer.aria_student_grade', 'Student grade'), value: studentGrade, onChange: e => setStudentGrade(e.target.value) })
                    )
                ),
                // Step indicator
                h('nav', { className: 'flex items-center gap-1 overflow-x-auto pb-1', 'aria-label': __alloT('report_writer.aria_report_writer_steps', 'Report Writer steps') },
                    STEPS.map((s, i) => {
                        const blocked = stepBlockedReason(s.num);
                        return h('button', { type: 'button', key: s.num,
                            'aria-label': blocked
                                ? rwFmt(__alloT('report_writer.aria_step_blocked', 'Step {num}: {label}. Not available yet: {reason}'), { num: s.num, label: s.label, reason: blocked })
                                : rwFmt(__alloT('report_writer.aria_step', 'Step {num}: {label}'), { num: s.num, label: s.label }),
                            'aria-current': currentStep === s.num ? 'step' : undefined,
                            'aria-disabled': blocked ? 'true' : undefined,
                            title: blocked || undefined,
                            className: `flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap ${currentStep === s.num ? 'bg-violet-600 text-white shadow-md' : s.num < currentStep ? 'bg-violet-100 text-violet-700' : 'bg-white text-slate-600 border border-slate-400'}${blocked ? ' opacity-60 cursor-not-allowed' : ''}`,
                            onClick: () => {
                                if (blocked) { rwAnnounce(blocked); return; }
                                setCurrentStep(s.num); if (s.num === 5 && factChunks.length === 0) extractFactChunks();
                            }
                        }, h('span', { 'aria-hidden': 'true' }, s.icon), ` ${s.label}`);
                    })
                )
            ),
            // Step content
            // ═══ STEP 1: Student Selection ═══
            currentStep === 1 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-4' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('👤 ' + __alloT('report_writer.student_selection', 'Student Selection'))),
                h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.use_a_privacy_safe_student_code', 'Use a privacy-safe student code name. Do not enter a real name or direct identifier; roster labels must already be pseudonymized.')),
                isDemoLoaded && h('div', { className: 'px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-[11px] text-amber-700 font-medium' }, ('⚠️ ' + __alloT('report_writer.demo_data_loaded_this_is_fictional', 'DEMO DATA LOADED — This is fictional test data, not a real student.'))),
                // Student dropdown from dashboard data
                (dashboardData && dashboardData.length > 0) ? h('div', { className: 'space-y-2' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600 block' }, __alloT('report_writer.select_from_class_roster', 'Select from Class Roster:')),
                    h('select', {
                        className: 'w-full text-xs border rounded-lg px-3 py-2 bg-white',
                        'aria-label': __alloT('report_writer.aria_select_student_from_roster', 'Select student from roster'),
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
                        h('option', { value: '' }, ('— ' + __alloT('report_writer.choose_a_student', 'Choose a student') + ' —')),
                        dashboardData.map((s, i) => h('option', { key: i, value: s.id || s.name || s.student }, s.name || s.student || rwFmt(__alloT('report_writer.student', 'Student {value}'), { value: i + 1 })))
                    ),
                    h('div', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.or_enter_manually_below', 'Or enter manually below'))
                ) : null,
                // Manual entry
                h('div', { className: 'grid grid-cols-1 sm:grid-cols-3 gap-3' },
                    h('div', null,
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.student_code_name', 'Student Code Name')),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-3 py-2', placeholder: __alloT('report_writer.placeholder_e_g_student_a', 'e.g., Student A'), 'aria-label': __alloT('report_writer.aria_student_code_name', 'Student code name'), value: manualStudentName, onChange: e => setManualStudentName(e.target.value) })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.age_2', 'Age')),
                        h('input', { type: 'number', className: 'w-full text-xs border rounded-lg px-3 py-2', placeholder: __alloT('report_writer.placeholder_years', 'Years'), 'aria-label': __alloT('report_writer.aria_student_age_in_years', 'Student age in years'), value: studentAge, onChange: e => setStudentAge(e.target.value), min: 1, max: 22 })
                    ),
                    h('div', null,
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.grade_2', 'Grade')),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-3 py-2', placeholder: __alloT('report_writer.placeholder_e_g_3rd', 'e.g., 3rd'), 'aria-label': __alloT('report_writer.aria_student_grade_level', 'Student grade level'), value: studentGrade, onChange: e => setStudentGrade(e.target.value) })
                    )
                ),
                // Demo data
                h('details', { className: 'mt-3 bg-amber-50 rounded-lg border border-amber-200' },
                    h('summary', { className: 'text-xs font-medium text-amber-700 px-3 py-2 cursor-pointer hover:bg-amber-100 rounded-t-lg' }, ('🧪 ' + __alloT('report_writer.load_demo_case_for_testing', 'Load Demo Case (for testing)'))),
                    h('div', { className: 'px-3 pb-3 space-y-2' },
                        h('p', { className: 'text-[11px] text-amber-600' }, __alloT('report_writer.load_fictional_clinical_data_to_test', 'Load fictional clinical data to test the full report pipeline. All data is clearly marked as demo.')),
                        Object.entries(DEMO_CASES).map(([key, demo]) =>
                            h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_load_demo_case_named', 'Load demo case: {name}'), { name: demo.label }), key, className: 'w-full text-start px-3 py-2 bg-white rounded-lg border border-amber-600 hover:bg-amber-50 text-[11px] transition-colors',
                                onClick: () => loadDemoCase(key)
                            }, h('span', { className: 'font-medium text-slate-800' }, demo.label))
                        ),
                        h('div', { className: 'border-t border-amber-200 pt-2 mt-1' },
                            h('button', { 'aria-label': __alloT('report_writer.aria_generate_ai_demo_case', 'Generate AI demo case'), className: `w-full text-start px-3 py-2 rounded-lg border text-[11px] transition-colors flex items-center gap-2 ${generatingDemo ? 'bg-violet-100 border-violet-600 cursor-wait' : 'bg-violet-50 border-violet-600 hover:bg-violet-100'}`,
                                onClick: generateAIDemoCase,
                                disabled: generatingDemo
                            },
                                generatingDemo ? h('span', { className: 'inline-block motion-reduce:animate-none w-3 h-3 border border-violet-400 border-t-violet-700 rounded-full' + (reducedMotion ? '' : ' animate-spin') }) : h('span', null, '🤖'),
                                h('span', { className: 'font-medium text-violet-800' }, generatingDemo ? __alloT('report_writer.generating_random_case', 'Generating random case...') : ('🎲 ' + __alloT('report_writer.generate_random_ai_case', 'Generate Random AI Case'))),
                                !generatingDemo && h('span', { className: 'text-[11px] text-violet-500 ms-auto' }, __alloT('report_writer.unique_each_time', 'Unique each time'))
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-end pt-2' },
                    h('button', { 'aria-label': __alloT('report_writer.aria_next_background', 'Next: Background'), className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors', onClick: () => setCurrentStep(2) }, (__alloT('report_writer.next_background', 'Next: Background') + ' →'))
                )
            ),

            // ═══ STEP 3: Clinical Observations ═══
            currentStep === 3 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-3' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('🔍 ' + __alloT('report_writer.clinical_observations', 'Clinical Observations'))),
                h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.enter_clinical_observations_interview_notes_and', 'Enter clinical observations, interview notes, and collateral information. Each source is tracked for fact attribution.')),
                // BehaviorLens import
                (abcEntries?.length > 0 || observationSessions?.length > 0) && h('button', { 'aria-label': __alloT('report_writer.aria_import_from_behaviorlens', 'Import from BehaviorLens'), className: 'px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-lg border border-indigo-600 hover:bg-indigo-100 transition-colors',
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
                        if (addToast) addToast(t('toasts.behaviorlens_data_imported_behavioral_observations'), 'success');
                    }
                }, ('📥 ' + rwFmt(__alloT('report_writer.import_from_behaviorlens_abc_observations', 'Import from BehaviorLens ({value} ABC + {value2} observations)'), { value: abcEntries?.length || 0, value2: observationSessions?.length || 0 }))),
                // Sub-section tabs
                h('div', { className: 'flex flex-wrap gap-1 border-b border-slate-200 pb-2' },
                    OBS_TAB_META.map(tab =>
                        h('button', { type: 'button', key: tab.key, 'aria-pressed': activeObsTab === tab.key ? 'true' : 'false',
                            'aria-label': clinicalObs[tab.key]?.text?.trim() ? rwFmt(__alloT('report_writer.aria_observation_source_has_text', '{label} (has notes)'), { label: tab.label }) : tab.label,
                            className: 'px-2.5 py-1.5 rounded-t-lg text-[11px] font-medium transition-all ' + (activeObsTab === tab.key ? 'bg-violet-600 text-white' : (clinicalObs[tab.key]?.text?.trim() ? 'bg-green-50 text-green-700 border border-green-600' : 'bg-slate-50 text-slate-600 hover:bg-slate-100')),
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
                        'aria-label': rwFmt(__alloT('report_writer.aria_observations', '{value} observations'), { value: clinicalObs[activeObsTab]?.source || activeObsTab }),
                        placeholder: OBS_TAB_META.find(t => t.key === activeObsTab)?.placeholder || __alloT('report_writer.placeholder_enter_observations', 'Enter observations...'),
                        value: clinicalObs[activeObsTab]?.text || '',
                        onChange: e => setClinicalObs(prev => ({
                            ...prev,
                            [activeObsTab]: { ...prev[activeObsTab], text: e.target.value }
                        }))
                    }),
                    h('div', { className: 'flex items-center gap-2 text-[11px] text-slate-600' },
                        h('span', null, ('📎 ' + __alloT('report_writer.source_attribution', 'Source attribution:') + ' ')),
                        h('span', { className: 'font-medium text-slate-600' }, clinicalObs[activeObsTab]?.source || __alloT('report_writer.unknown', 'Unknown')),
                        h('span', null, (' — ' + __alloT('report_writer.will_be_tracked_through_fact_extraction', 'will be tracked through fact extraction')))
                    )
                ),
                // Summary of filled sections
                h('div', { className: 'bg-slate-50 rounded-lg p-2 flex flex-wrap gap-2' },
                    OBS_TAB_META.map(tab =>
                        h('span', { key: tab.key,
                            className: 'text-[11px] px-2 py-0.5 rounded-full ' + (clinicalObs[tab.key]?.text?.trim() ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600')
                        }, tab.icon + ' ' + tab.label + (clinicalObs[tab.key]?.text?.trim() ? (' ' + rwFmt(__alloT('report_writer.chars', '({count} chars)'), { count: clinicalObs[tab.key].text.length })) : ' \u2014'))
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(2) }, ('← ' + __alloT('report_writer.background', 'Background'))),
                    h('button', { 'aria-label': __alloT('report_writer.aria_next_assessment_scores', 'Next: Assessment Scores'), className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(4) }, (__alloT('report_writer.next_assessment_scores', 'Next: Assessment Scores') + ' →'))
                )
            ),

            // ═══ STEP 4: Assessment Score Entry ═══
            currentStep === 4 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-4' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('📊 ' + __alloT('report_writer.assessment_score_entry', 'Assessment Score Entry'))),
                h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.select_an_assessment_and_enter_scores', 'Select an assessment and enter scores. Classifications are auto-calculated.')),
                // Assessment picker
                h('div', { className: 'flex flex-wrap items-end gap-3' },
                    h('div', { className: 'flex-1 min-w-[140px]' },
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.assessment', 'Assessment')),
                        h('select', { className: 'w-full text-xs border rounded-lg px-2 py-1.5 bg-white', 'aria-label': __alloT('report_writer.aria_select_assessment', 'Select assessment'), value: selectedAssessment, onChange: e => setSelectedAssessment(e.target.value) },
                            Object.keys(ASSESSMENT_PRESETS).map(a => h('option', { key: a, value: a }, a))
                        )
                    ),
                    h('div', { className: 'text-[11px] text-slate-600 bg-slate-50 rounded px-2 py-1' },
                        rwFmt(__alloT('report_writer.scores_mean_sd', '{value} scores | Mean={value2} SD={value3}'), { value: ASSESSMENT_PRESETS[selectedAssessment]?.scoreType || 'standard', value2: ASSESSMENT_PRESETS[selectedAssessment]?.mean || 100, value3: ASSESSMENT_PRESETS[selectedAssessment]?.sd || 15 })
                    ),
                    // Q-global prints either descriptor set; the labels must match the report's.
                    RW_DESCRIPTOR_SCALES[selectedAssessment] && h('div', { className: 'min-w-[160px]' },
                        h('label', { htmlFor: 'rw-descriptor-scale', className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.descriptors_as_on_the_score_report', 'Descriptors (as on the score report)')),
                        h('select', {
                            id: 'rw-descriptor-scale', className: 'w-full text-xs border rounded-lg px-2 py-1.5 bg-white',
                            value: descriptorScaleFor(selectedAssessment),
                            onChange: e => changeDescriptorScale(selectedAssessment, e.target.value)
                        }, RW_DESCRIPTOR_SCALES[selectedAssessment].options.map(o => h('option', { key: o, value: o },
                            RW_SCORE_SYSTEMS[rwSystemKeyFor(selectedAssessment, '', o)].name)))
                    )
                ),
                // Read scores from the score report instead of retyping them.
                h('details', { className: 'bg-sky-50 rounded-lg border border-sky-200' },
                    h('summary', { className: 'text-xs font-medium text-sky-900 px-3 py-2 cursor-pointer hover:bg-sky-100 rounded-lg' }, ('📋 ' + __alloT('report_writer.paste_title', 'Paste from the score report'))),
                    h('div', { className: 'px-3 pb-3 space-y-2' },
                        h('p', { className: 'text-[11px] text-sky-900' }, rwFmt(__alloT('report_writer.paste_help', 'Paste the {assessment} score table from its score report, or open the report file. It is read on this device, nothing is sent to the AI, and no score is added until you tick it.'), { assessment: selectedAssessment })),
                        h('textarea', { id: 'rw-report-paste', 'aria-label': __alloT('report_writer.aria_score_report_text', 'Score report text'), className: 'w-full text-[11px] border rounded px-2 py-1 h-24 resize-y font-mono', value: reportPaste, onChange: e => setReportPaste(e.target.value) }),
                        h('div', { className: 'flex flex-wrap items-center gap-2' },
                            h('button', { type: 'button', disabled: !reportPaste.trim(), onClick: () => readReportPaste(reportPaste), className: 'px-3 py-1 bg-sky-700 text-white text-[11px] rounded hover:bg-sky-800 disabled:opacity-50' }, __alloT('report_writer.paste_read', 'Read scores')),
                            h('label', { htmlFor: 'rw-report-file', className: 'text-[11px] text-sky-900 font-medium' }, reportPasteImporting ? __alloT('report_writer.reading_file', 'Reading file…') : __alloT('report_writer.paste_or_open_file', 'Or open the report file (PDF, Word, text):')),
                            h('input', { id: 'rw-report-file', type: 'file', accept: '.pdf,.docx,.txt,.md', disabled: reportPasteImporting, 'aria-busy': reportPasteImporting, className: 'text-[11px] max-w-full', onChange: e => importReportPasteFile(e.target) })
                        ),
                        reportPastePreview && (() => {
                            const p = reportPastePreview;
                            const chosen = p.rows.filter(r => r.include).length;
                            const scaleName = (o) => RW_SCORE_SYSTEMS[rwSystemKeyFor(p.assessment, '', o)].name;
                            const toggle = (i, on) => setReportPastePreview(prev => ({ ...prev, rows: prev.rows.map((x, j) => (j === i ? { ...x, include: on } : x)) }));
                            return h('div', { className: 'space-y-2' },
                                h('p', { className: 'text-[11px] font-medium text-slate-800', role: 'status' }, p.rows.length
                                    ? rwFmt(__alloT('report_writer.paste_found', 'Found {count} score line(s) for {assessment}. Tick the ones to add.'), { count: p.rows.length, assessment: p.assessment })
                                    : rwFmt(__alloT('report_writer.paste_none', 'No {assessment} scores were found in that text. Check the instrument selected above.'), { assessment: p.assessment })),
                                p.descriptorScale && p.descriptorScale !== descriptorScaleFor(p.assessment) && h('p', { className: 'text-[11px] text-amber-900' },
                                    rwFmt(__alloT('report_writer.paste_scale_detected', 'The report\'s labels match the {scale}; it will be used for {assessment}.'), { scale: scaleName(p.descriptorScale), assessment: p.assessment })),
                                p.rows.some(r => r.ciLow != null) && h('div', { className: 'flex flex-wrap items-center gap-2 text-[11px]' },
                                    h('label', { htmlFor: 'rw-paste-ci-level', className: 'font-medium text-slate-700' }, __alloT('report_writer.paste_ci_level', 'Interval level')),
                                    h('select', { id: 'rw-paste-ci-level', className: 'text-[11px] border rounded px-1 py-0.5 bg-white', value: reportPasteLevel, onChange: e => setReportPasteLevel(Number(e.target.value)) },
                                        RW_PASTE_CI_LEVELS.map(l => h('option', { key: l, value: l }, l + '%'))),
                                    !p.ciLevel && h('span', { className: 'text-amber-900' }, __alloT('report_writer.paste_ci_level_not_stated', 'Not stated in the pasted text; check it on the report.'))
                                ),
                                p.rows.length > 0 && h('div', { className: 'overflow-x-auto' },
                                    h('table', { className: 'w-full text-[11px] border-collapse' },
                                        h('caption', { className: 'sr-only' }, rwFmt(__alloT('report_writer.paste_table_caption', 'Scores read from the {assessment} score report'), { assessment: p.assessment })),
                                        h('thead', null, h('tr', null,
                                            [__alloT('report_writer.paste_col_add', 'Add'), __alloT('report_writer.paste_col_subtest', 'Subtest'), __alloT('report_writer.score', 'Score'), __alloT('report_writer.percentile', 'Percentile'),
                                                __alloT('report_writer.paste_col_interval', 'Interval'), __alloT('report_writer.paste_col_report_label', 'Report label'), __alloT('report_writer.paste_col_check', 'Check')]
                                                .map((c, i) => h('th', { key: i, scope: 'col', className: 'text-left px-1 py-0.5 font-medium text-slate-700 border-b border-slate-300' }, c)))),
                                        h('tbody', null, p.rows.map((r, i) => h('tr', { key: i, className: 'border-b border-slate-200' },
                                            h('td', { className: 'px-1 py-0.5' }, h('input', { type: 'checkbox', id: 'rw-paste-row-' + i, 'aria-labelledby': 'rw-paste-name-' + i, checked: r.include, onChange: e => toggle(i, e.target.checked) })),
                                            h('th', { scope: 'row', id: 'rw-paste-name-' + i, className: 'text-left px-1 py-0.5 font-medium text-slate-800' }, r.subtest + (r.scoreType === 'scaled' ? ' ' + __alloT('report_writer.scaled', '(scaled)') : '')),
                                            h('td', { className: 'px-1 py-0.5' }, String(r.score)),
                                            h('td', { className: 'px-1 py-0.5' }, r.percentile != null ? String(r.percentile) : '\u2014'),
                                            h('td', { className: 'px-1 py-0.5' }, r.ciLow != null ? r.ciLow + '\u2013' + r.ciHigh : '\u2014'),
                                            h('td', { className: 'px-1 py-0.5' }, r.reportLabelText || '\u2014'),
                                            h('td', { className: 'px-1 py-0.5 text-amber-900' }, r.issues.map(x => pasteIssueText(x, r, p.assessment)).filter(Boolean).join(' '))
                                        )))
                                    )
                                ),
                                p.rows.length > 0 && h('button', { type: 'button', disabled: !chosen, onClick: addPastedScores, className: 'px-3 py-1 bg-sky-700 text-white text-[11px] rounded hover:bg-sky-800 disabled:opacity-50' },
                                    rwFmt(__alloT('report_writer.paste_add', 'Add {count} selected score(s)'), { count: chosen }))
                            );
                        })()
                    )
                ),
                // Preset subtests
                (ASSESSMENT_PRESETS[selectedAssessment]?.subtests || []).length > 0 && h('div', { className: 'space-y-2' },
                    h('p', { className: 'text-[11px] font-medium text-slate-600' }, rwFmt(__alloT('report_writer.subtests', '{selectedAssessment} Subtests:'), { selectedAssessment })),
                    h('div', { className: 'grid grid-cols-1 sm:grid-cols-2 gap-2' },
                        (ASSESSMENT_PRESETS[selectedAssessment]?.subtests || []).map(sub => {
                            const existing = scoreEntries.find(s => s.assessment === selectedAssessment && s.subtest === sub);
                            // Enter was the only way to add a preset score, with nothing on
                            // screen saying so; the Add button makes it discoverable and
                            // reachable without a keyboard. The input clears only if the
                            // score was accepted, so a refused typo stays visible to fix.
                            const submit = (input) => { if (input && input.value !== '' && addScoreEntry(sub, input.value)) input.value = ''; };
                            const subId = 'rw-sub-' + sub.replace(/[^A-Za-z0-9]+/g, '-');
                            return h('div', { key: sub, className: `flex items-center gap-2 ${existing ? 'opacity-50' : ''}` },
                                h('span', { id: subId, className: 'text-[11px] text-slate-600 flex-1 truncate' }, sub),
                                !existing ? h('input', {
                                    type: 'number', inputMode: 'decimal', className: 'w-16 text-xs border rounded px-1.5 py-0.5 text-center',
                                    'aria-label': rwFmt(__alloT('report_writer.aria_score_for', 'Score for {sub}'), { sub }),
                                    placeholder: __alloT('report_writer.placeholder_score', 'Score'),
                                    onKeyDown: e => { if (e.key === 'Enter') submit(e.target); }
                                }) : h('span', { className: `text-[11px] px-2 py-0.5 rounded-full ${cBadge(existing.classColor)}` }, `${existing.score} — ${existing.classification}`),
                                // Named "Add <subtest>" from visible text (aria-labelledby), so no
                                // new untranslatable string reaches a screen reader.
                                !existing && h('button', {
                                    type: 'button', id: subId + '-add', 'aria-labelledby': subId + '-add ' + subId,
                                    className: 'text-[11px] px-2 py-0.5 rounded bg-violet-100 text-violet-800 hover:bg-violet-200',
                                    onClick: e => submit(e.currentTarget.parentElement.querySelector('input'))
                                }, __alloT('report_writer.add', 'Add'))
                            );
                        })
                    )
                ),
                // Custom subtest entry
                h('div', { className: 'flex items-end gap-2 pt-2 border-t border-slate-100' },
                    h('div', { className: 'flex-1' },
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.custom_subtest', 'Custom Subtest')),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-2 py-1.5', placeholder: __alloT('report_writer.placeholder_subtest_name', 'Subtest name...'), 'aria-label': __alloT('report_writer.aria_custom_subtest_name', 'Custom subtest name'), value: customSubtest, onChange: e => setCustomSubtest(e.target.value) })
                    ),
                    h('div', { className: 'w-20' },
                        h('label', { htmlFor: 'rw-custom-score', className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.score', 'Score')),
                        h('input', { id: 'rw-custom-score', type: 'number', inputMode: 'decimal', className: 'w-full text-xs border rounded-lg px-2 py-1.5 text-center', placeholder: '0', value: customScore, onChange: e => setCustomScore(e.target.value) })
                    ),
                    // Subtest scores are usually SCALED scores (mean 10, SD 3), not the
                    // instrument's composite metric; without this choice a WISC-V
                    // "Block Design 7" was classified as a standard score of 7.
                    h('div', { className: 'w-32' },
                        h('label', { htmlFor: 'rw-custom-score-type', className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.score_type', 'Score type')),
                        h('select', { id: 'rw-custom-score-type', className: 'w-full text-xs border rounded-lg px-1.5 py-1.5 bg-white', value: customScoreType || (ASSESSMENT_PRESETS[selectedAssessment]?.scoreType || 'standard'), onChange: e => setCustomScoreType(e.target.value) },
                            h('option', { value: 'standard' }, __alloT('report_writer.standard_score', 'Standard score')),
                            h('option', { value: 'scaled' }, __alloT('report_writer.scaled_score_mean_10', 'Scaled score (mean 10)')),
                            h('option', { value: 'T-score' }, __alloT('report_writer.t_score', 'T-score'))
                        )
                    ),
                    h('button', { 'aria-label': __alloT('report_writer.aria_add_score_entry', 'Add score entry'), className: 'px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg hover:bg-violet-700 transition-colors', onClick: () => {
                        if (!customSubtest || customScore === '') { if (addToast) addToast(__alloT('report_writer.toast_enter_a_subtest_name_and_a', 'Enter a subtest name and a score.'), 'error'); return; }
                        if (addScoreEntry(customSubtest, customScore, customScoreType || undefined)) { setCustomSubtest(''); setCustomScore(''); }
                    }
                    }, ('+ ' + __alloT('report_writer.add', 'Add')))
                ),
                // Score entries table
                scoreEntries.length > 0 && h('div', { className: 'mt-3 space-y-1' },
                    h('div', { className: 'flex items-center justify-between' },
                        h('p', { className: 'text-[11px] font-bold text-slate-700' }, rwFmt(__alloT('report_writer.scores_entered', '{count} Scores Entered'), { count: scoreEntries.length })),
                        h('button', { 'aria-label': __alloT('report_writer.aria_clear_all', 'Clear All'), className: 'text-[11px] text-red-500 hover:text-red-700', onClick: () => setConfirmationRequest({
                            title: __alloT('report_writer.confirm_clear_scores_title', 'Remove all scores?'),
                            message: rwFmt(__alloT('report_writer.confirm_clear_scores_message', 'All {count} scores entered in Step 4 are removed.'), { count: scoreEntries.length }),
                            confirmLabel: __alloT('report_writer.confirm_clear_scores', 'Remove all scores'),
                            onConfirm: () => setScoreEntries([]) }) }, __alloT('report_writer.clear_all', 'Clear All'))
                    ),
                    h('div', { className: 'max-h-48 overflow-y-auto space-y-1' },
                        scoreEntries.map(s => {
                            const open = scoreDetailId === s.id;
                            const computedPct = rwDisplayPercentile(s.score, s.scoreType, s.assessment, s.subtest);
                            const hasReportValues = s.percentileSource === 'manual' || rwHasCI(s) || rwHasPrior(s);
                            const ciProblem = !rwHasCI(s) ? null
                                : Number(s.ciLow) > Number(s.ciHigh) ? __alloT('report_writer.ci_low_above_high', 'The low end is above the high end.')
                                : (s.score < Number(s.ciLow) || s.score > Number(s.ciHigh)) ? __alloT('report_writer.ci_does_not_contain_score', 'This interval does not contain the score; check it against the score report.') : null;
                            return h('div', { key: s.id, className: 'space-y-1' },
                                h('div', { className: `flex flex-wrap items-center justify-between gap-x-2 px-3 py-1.5 rounded-lg text-[11px] ${cBg(s.classColor)} border ${cBorder(s.classColor)}` },
                                    h('span', { id: 'rw-score-name-' + s.id, className: 'font-medium text-slate-800 flex-1' }, `${s.assessment} — ${s.subtest}` + (normalizeReportScoreType(s.scoreType) === 'scaled_score' ? (' ' + __alloT('report_writer.scaled', '(scaled)')) : '')),
                                    h('span', { className: `font-bold ${cText(s.classColor)}` }, `${s.score}`),
                                    h('span', { className: `px-2 py-0.5 rounded-full text-[11px] ${cBadge(s.classColor)}` }, s.classification),
                                    s.percentile != null && s.percentile !== '' && h('span', { className: 'text-slate-600' }, rwFmt(__alloT('report_writer.ile', '{percentile}%ile{value}'), { percentile: s.percentile, value: s.percentileSource === 'manual' ? (' ' + __alloT('report_writer.report', '(report)')) : '' })),
                                    rwHasCI(s) && h('span', { className: 'text-slate-600' }, rwFmt(__alloT('report_writer.ci', '{value}% CI {ciLow}–{ciHigh}'), { value: s.ciLevel || 95, ciLow: s.ciLow, ciHigh: s.ciHigh })),
                                    rwHasPrior(s) && h('span', { className: 'text-slate-600' }, rwFmt(__alloT('report_writer.prior_badge', 'prior {prior}'), { prior: rwPriorText(s) })),
                                    h('button', {
                                        type: 'button', 'aria-expanded': open, 'aria-controls': 'rw-score-details-' + s.id,
                                        id: 'rw-score-detail-btn-' + s.id, 'aria-labelledby': 'rw-score-detail-btn-' + s.id + ' rw-score-name-' + s.id,
                                        className: 'text-[11px] text-violet-800 underline hover:text-violet-900',
                                        onClick: () => setScoreDetailId(open ? null : s.id)
                                    }, hasReportValues ? __alloT('report_writer.edit_ile_ci_prior', 'Edit %ile / CI / prior') : ('+ ' + __alloT('report_writer.ile_ci_prior', '%ile / CI / prior'))),
                                    h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_remove_score_entry_named', 'Remove score entry: {name}'), { name: s.assessment + ' — ' + s.subtest }), className: 'ms-2 text-red-600 hover:text-red-600', onClick: () => removeScoreEntry(s.id) }, '✕')
                                ),
                                // Percentiles for T-scores and every confidence interval come from
                                // the manual's tables, so the report states them only if they are
                                // copied in here (prompt rule 6; psycheck flags any it cannot source).
                                open && h('div', { id: 'rw-score-details-' + s.id, className: 'flex flex-wrap items-end gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 text-[11px]' },
                                    h('p', { className: 'w-full text-slate-600' }, __alloT('report_writer.copy_these_from_the_score_report', 'Copy these from the score report. A percentile you enter replaces the computed one; leave it blank to use the computed value.')),
                                    h('div', null,
                                        h('label', { htmlFor: 'rw-pct-' + s.id, className: 'block text-slate-600 mb-0.5' }, __alloT('report_writer.percentile', 'Percentile')),
                                        h('input', {
                                            id: 'rw-pct-' + s.id, key: 'pct-' + s.id + '-' + (s.percentileSource === 'manual' ? s.percentile : ''), type: 'number', step: '0.1', inputMode: 'decimal',
                                            className: 'w-24 border rounded px-1.5 py-0.5 text-center',
                                            defaultValue: s.percentileSource === 'manual' ? s.percentile : '',
                                            placeholder: computedPct != null ? rwFmt(__alloT('report_writer.placeholder_computed', '{computedPct} (computed)'), { computedPct }) : __alloT('report_writer.placeholder_from_report', 'from report'),
                                            onBlur: e => commitReportPercentile(s, e.target)
                                        })
                                    ),
                                    h('div', null,
                                        h('label', { htmlFor: 'rw-cil-' + s.id, className: 'block text-slate-600 mb-0.5' }, __alloT('report_writer.ci_level', 'CI level')),
                                        h('select', { id: 'rw-cil-' + s.id, className: 'border rounded px-1 py-0.5 bg-white', value: String(s.ciLevel || 95), onChange: e => updateScoreEntry(s.id, { ciLevel: Number(e.target.value) }) },
                                            ['68', '85', '90', '95', '99'].map(v => h('option', { key: v, value: v }, v + '%')))
                                    ),
                                    ['ciLow', 'ciHigh'].map(field => h('div', { key: field },
                                        h('label', { htmlFor: `rw-${field}-${s.id}`, className: 'block text-slate-600 mb-0.5' }, field === 'ciLow' ? __alloT('report_writer.ci_low', 'CI low') : __alloT('report_writer.ci_high', 'CI high')),
                                        h('input', {
                                            id: `rw-${field}-${s.id}`, key: `${field}-${s.id}-${s[field] ?? ''}`, type: 'number', inputMode: 'decimal',
                                            className: 'w-16 border rounded px-1.5 py-0.5 text-center',
                                            defaultValue: s[field] ?? '',
                                            onBlur: e => commitReportCI(s, field, e.target)
                                        })
                                    )),
                                    h('div', null,
                                        h('label', { htmlFor: 'rw-prior-' + s.id, className: 'block text-slate-600 mb-0.5' }, __alloT('report_writer.prior_score', 'Prior score')),
                                        h('input', {
                                            id: 'rw-prior-' + s.id, key: 'prior-' + s.id + '-' + (s.priorScore ?? ''), type: 'number', inputMode: 'decimal',
                                            className: 'w-16 border rounded px-1.5 py-0.5 text-center', defaultValue: s.priorScore ?? '',
                                            onBlur: e => commitPriorScore(s, e.target)
                                        })
                                    ),
                                    h('div', null,
                                        h('label', { htmlFor: 'rw-prior-label-' + s.id, className: 'block text-slate-600 mb-0.5' }, __alloT('report_writer.prior_from', 'Prior from')),
                                        h('input', {
                                            id: 'rw-prior-label-' + s.id, key: 'prior-label-' + s.id + '-' + (s.priorLabel ?? ''), type: 'text', maxLength: 60,
                                            className: 'w-40 border rounded px-1.5 py-0.5', defaultValue: s.priorLabel ?? '',
                                            placeholder: __alloT('report_writer.placeholder_prior_from', 'e.g. 2021 evaluation'),
                                            onBlur: e => commitPriorLabel(s, e.target)
                                        })
                                    ),
                                    ciProblem && h('p', { role: 'status', className: 'w-full text-amber-800' }, ciProblem)
                                )
                            );
                        })
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(3) }, ('← ' + __alloT('report_writer.observations', 'Observations'))),
                    h('button', { 'aria-label': __alloT('report_writer.aria_next_fact_review', 'Next: Fact Review'), className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700 transition-colors', onClick: () => { setCurrentStep(5); if (factChunks.length === 0) extractFactChunks(); } }, (__alloT('report_writer.next_fact_review', 'Next: Fact Review') + ' →'))
                )
            ),
            // ═══ STEP 2: Background & History ═══
            currentStep === 2 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-3' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('📋 ' + __alloT('report_writer.background_history', 'Background & History'))),
                h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.enter_only_information_needed_for_the', 'Enter only information needed for the report. Common identifiers (selected code name, dates, email, phone, SSN, and ID labels) are redacted before AI calls, but automated redaction is not complete—review text and do not enter direct identifiers.')),
                // ── Redaction disclosure ──────────────────────────────────
                // No regex catches every identifier in free clinical text. The
                // honest move is to show the clinician what redaction WILL and
                // WILL NOT cover for the text they actually pasted, and let them
                // fix what the patterns cannot. Render-only; nothing persisted.
                (() => {
                    const bgAll = Object.values(bgSections || {}).filter(v => typeof v === 'string' && v.trim()).join('\n\n');
                    const obsAll = Object.values(clinicalObs || {}).map(v => (v && v.text) || '').filter(t => t.trim()).join('\n\n');
                    const combined = (bgAll + '\n\n' + obsAll).trim();
                    if (!combined) return null;
                    const scan = analyzeRedaction(combined, { studentName: effectiveStudentName, people: reportPeople });
                    const tone = scan.needsAttention ? 'bg-amber-50 border-amber-300' : 'bg-emerald-50 border-emerald-200';
                    return h('div', { className: 'rounded-lg p-3 border ' + tone, role: 'status', 'data-redaction-disclosure': scan.needsAttention ? 'attention' : 'clean' },
                        h('p', { className: 'text-[11px] font-bold text-slate-800 mb-1' },
                            (scan.needsAttention ? '⚠️ ' : '✓ ') + __alloT('report_writer.before_this_text_is_sent_for', 'Before this text is sent for AI processing')),
                        h('ul', { className: 'space-y-1 text-[11px] text-slate-700' },
                            h('li', null, scan.hasStudentName
                                ? __alloT('report_writer.the_student_name_including_first_or', 'The student name (including first or last name alone), emails, phone numbers, IDs, addresses and calendar dates are replaced before sending. Ages, grade levels and scores are kept — they are clinical data.')
                                : h('strong', null, __alloT('report_writer.no_student_name_is_set_so', 'No student name is set, so NO name redaction is applied. Enter the student name in Step 1, or remove names from the text below.'))),
                            scan.riskyNameParts.length > 0 && h('li', null,
                                h('strong', null, (rwFmt(__alloT('report_writer.not_redacted', 'Not redacted: {value}.'), { value: scan.riskyNameParts.join(', ') }) + ' ')),
                                __alloT('report_writer.these_are_also_ordinary_words_so', 'These are also ordinary words, so replacing them would corrupt the narrative. Edit the text yourself if they must not be sent.')),
                            scan.unlistedTitledNames.length > 0 && h('li', null,
                                h('strong', null, (rwFmt(__alloT('report_writer.other_people_named', 'Other people named: {value}.'), { value: scan.unlistedTitledNames.join(', ') }) + ' ')),
                                __alloT('report_writer.add_them_below_to_redact_them', 'Add them below to redact them by role, or remove them from the text.'))
                        ),
                        h('div', { className: 'mt-2 pt-2 border-t border-slate-200' },
                            h('p', { className: 'text-[11px] font-bold text-slate-700 mb-1' }, __alloT('report_writer.other_people_named_in_this_text', 'Other people named in this text')),
                            h('p', { className: 'text-[10px] text-slate-600 mb-1.5' }, __alloT('report_writer.each_is_replaced_by_their_role', 'Each is replaced by their role, so "mother reports…" and "teacher reports…" stay distinguishable in the report.')),
                            (reportPeople || []).map((person, idx) => h('div', { key: idx, className: 'flex flex-wrap items-center gap-1.5 mb-1' },
                                h('input', {
                                    type: 'text', value: person.name || '', placeholder: __alloT('report_writer.placeholder_full_name', 'Full name'),
                                    'aria-label': rwFmt(__alloT('report_writer.aria_person_name', 'Person {value} name'), { value: idx + 1 }),
                                    onChange: (e) => { const v = e.target.value; setReportPeople(prev => prev.map((p, i) => i === idx ? { ...p, name: v } : p)); },
                                    className: 'flex-1 min-w-[120px] px-2 py-1 border border-slate-300 rounded text-[11px]'
                                }),
                                h('select', {
                                    value: person.role || 'Parent', 'aria-label': rwFmt(__alloT('report_writer.aria_person_role', 'Person {value} role'), { value: idx + 1 }),
                                    onChange: (e) => { const v = e.target.value; setReportPeople(prev => prev.map((p, i) => i === idx ? { ...p, role: v } : p)); },
                                    className: 'px-2 py-1 border border-slate-300 rounded text-[11px] bg-white'
                                }, ['Parent', 'Mother', 'Father', 'Guardian', 'Sibling', 'Teacher', 'Counselor', 'Clinician', 'Relative', 'Peer'].map(r => h('option', { key: r, value: r }, r))),
                                h('button', {
                                    type: 'button', 'aria-label': rwFmt(__alloT('report_writer.aria_remove_person', 'Remove person {value}'), { value: idx + 1 }),
                                    onClick: () => setReportPeople(prev => prev.filter((p, i) => i !== idx)),
                                    className: 'px-2 py-1 text-[11px] text-slate-600 border border-slate-300 rounded hover:bg-slate-100'
                                }, __alloT('report_writer.remove', 'Remove'))
                            )),
                            h('button', {
                                type: 'button', 'data-add-person': 'true',
                                onClick: () => setReportPeople(prev => [...(prev || []), { name: '', role: 'Parent' }]),
                                className: 'px-2 py-1 bg-slate-100 text-slate-700 text-[11px] font-medium rounded border border-slate-300 hover:bg-slate-200'
                            }, ('+ ' + __alloT('report_writer.add_a_person', 'Add a person')))
                        )
                    );
                })(),
                h('div', { className: 'flex flex-wrap gap-2' },
                    (abcEntries?.length > 0 || observationSessions?.length > 0) && h('button', { className: 'px-3 py-1.5 bg-indigo-50 text-indigo-700 text-[11px] font-medium rounded-lg border border-indigo-600 hover:bg-indigo-100 transition-colors',
                        onClick: importFromBehaviorLens
                    }, ('📥 ' + rwFmt(__alloT('report_writer.import_from_behaviorlens_abc_observations', 'Import from BehaviorLens ({value} ABC + {value2} observations)'), { value: abcEntries?.length || 0, value2: observationSessions?.length || 0 }))),
                    longitudinalData && h('button', { 'aria-label': __alloT('report_writer.aria_import_student_progress', 'Import student progress'), className: 'px-3 py-1.5 bg-teal-50 text-teal-700 text-[11px] font-medium rounded-lg border border-teal-600 hover:bg-teal-100 transition-colors',
                        onClick: importStudentProgress
                    }, ('📈 ' + rwFmt(__alloT('report_writer.import_student_progress_activities', 'Import Student Progress ({value} activities{value2})'), { value: longitudinalData.history?.length || 0, value2: longitudinalData.mathProbeHistory?.length ? (' + ' + rwFmt(__alloT('report_writer.probes', '{count} probes'), { count: longitudinalData.mathProbeHistory.length })) : '' })))
                ),
                [
                    { key: 'referralReason', label: __alloT('report_writer.field_reason_for_referral', 'Reason for Referral'), placeholder: __alloT('report_writer.placeholder_why_was_this_student_referred_for', 'Why was this student referred for evaluation?'), rows: 2 },
                    { key: 'developmental', label: __alloT('report_writer.field_developmental_history', 'Developmental History'), placeholder: __alloT('report_writer.placeholder_developmental_milestones_prenatal_birth_history', 'Developmental milestones, prenatal/birth history...'), rows: 3 },
                    { key: 'medical', label: __alloT('report_writer.field_medical_history', 'Medical History'), placeholder: __alloT('report_writer.placeholder_relevant_medical_diagnoses_medications_vision_he', 'Relevant medical diagnoses, medications, vision/hearing...'), rows: 2 },
                    { key: 'educational', label: __alloT('report_writer.field_educational_history', 'Educational History'), placeholder: __alloT('report_writer.placeholder_previous_schools_grade_retention_iep_504', 'Previous schools, grade retention, IEP/504 history, interventions...'), rows: 3 },
                    { key: 'social', label: __alloT('report_writer.field_social_emotional', 'Social-Emotional'), placeholder: __alloT('report_writer.placeholder_family_structure_peer_relationships_social_skill', 'Family structure, peer relationships, social skills...'), rows: 2 },
                    { key: 'behavioral', label: __alloT('report_writer.field_behavioral_observations', 'Behavioral Observations'), placeholder: __alloT('report_writer.placeholder_classroom_behavior_attention_compliance_self_reg', 'Classroom behavior, attention, compliance, self-regulation...'), rows: 3 },
                    { key: 'observations', label: __alloT('report_writer.field_test_session_observations', 'Test Session Observations'), placeholder: __alloT('report_writer.placeholder_how_the_student_presented_during_testing', 'How the student presented during testing...'), rows: 2 },
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
                // ── Case documents (prior evaluations, IEPs): session only ──
                h('details', { className: 'mt-3 bg-teal-50 rounded-lg border border-teal-200', open: caseDocuments.length > 0 || undefined },
                    h('summary', { className: 'text-xs font-medium text-teal-800 px-3 py-2 cursor-pointer hover:bg-teal-100 rounded-t-lg' }, ('📁 ' + __alloT('report_writer.case_documents_title', 'Case Documents (prior evaluations, IEPs)'))),
                    h('div', { className: 'px-3 pb-3 space-y-2' },
                        h('p', { className: 'text-[11px] text-teal-900' }, __alloT('report_writer.case_documents_privacy', 'Kept for this session only: case documents are not saved with the report or stored on this device. Nothing from them reaches the AI until you turn a document on, and then only passages with the student name, listed people, emails, phone numbers, IDs, addresses and dates redacted. Scores in them are used to check prior scores the report cites.')),
                        !effectiveStudentName && caseDocuments.length > 0 && h('p', { className: 'text-[11px] font-medium text-amber-900', role: 'status' }, __alloT('report_writer.case_documents_need_name', 'Set the student name in Step 1 before using a case document with the AI, so it can be redacted.')),
                        caseDocuments.map(doc => {
                            const scan = analyzeRedaction(doc.text, { studentName: effectiveStudentName, people: reportPeople });
                            const aiId = 'rw-case-ai-' + doc.id;
                            const titleId = 'rw-case-title-' + doc.id;
                            return h('div', { key: doc.id, className: 'px-2 py-1.5 bg-white rounded border border-slate-400 text-[11px] space-y-1' },
                                h('div', { className: 'flex items-center justify-between gap-2' },
                                    h('span', { id: titleId, className: 'font-medium text-slate-800 truncate' }, doc.title),
                                    h('span', { className: 'text-slate-600 shrink-0' }, rwFmt(__alloT('report_writer.case_document_characters', '{count} characters'), { count: doc.text.length.toLocaleString() })),
                                    h('button', { type: 'button', id: aiId + '-remove', 'aria-labelledby': aiId + '-remove ' + titleId, className: 'ms-2 text-red-700 hover:text-red-800 text-xs', onClick: () => setCaseDocuments(prev => prev.filter(d => d.id !== doc.id)) },
                                        h('span', { 'aria-hidden': 'true' }, '\u2715 '), h('span', { className: 'sr-only' }, __alloT('report_writer.remove', 'Remove')))
                                ),
                                (scan.riskyNameParts.length > 0 || scan.unlistedTitledNames.length > 0) && h('p', { className: 'text-amber-900' },
                                    scan.riskyNameParts.length > 0 ? (rwFmt(__alloT('report_writer.not_redacted', 'Not redacted: {value}.'), { value: scan.riskyNameParts.join(', ') }) + ' ') : '',
                                    scan.unlistedTitledNames.length > 0 ? rwFmt(__alloT('report_writer.other_people_named', 'Other people named: {value}.'), { value: scan.unlistedTitledNames.join(', ') }) : ''),
                                h('div', { className: 'flex items-center gap-2' },
                                    h('input', { type: 'checkbox', id: aiId, checked: !!doc.allowAI && !!effectiveStudentName, disabled: !effectiveStudentName,
                                        onChange: e => { const on = e.target.checked; setCaseDocuments(prev => prev.map(d => (d.id === doc.id ? { ...d, allowAI: on } : d))); } }),
                                    h('label', { htmlFor: aiId, className: 'text-slate-700' }, __alloT('report_writer.case_use_with_ai', 'Use redacted passages with the AI'))
                                ),
                                scoreEntries.length > 0 && h('button', { type: 'button', id: 'rw-case-prior-' + doc.id, 'aria-labelledby': 'rw-case-prior-' + doc.id + ' ' + titleId,
                                    className: 'text-[11px] text-teal-800 underline hover:text-teal-900', onClick: () => findPriorScores(doc) }, __alloT('report_writer.find_prior_scores', 'Find prior scores')),
                                priorFind && priorFind.docId === doc.id && h('div', { className: 'bg-teal-50 rounded p-2 space-y-1' },
                                    h('p', { className: 'text-slate-800', role: 'status' }, priorFind.rows.length
                                        ? rwFmt(__alloT('report_writer.prior_found', 'Found {count} prior score(s) for subtests entered in Step 4. Tick the ones to record.'), { count: priorFind.rows.length })
                                        : __alloT('report_writer.prior_none', 'No scores for the subtests entered in Step 4 were found in this document.')),
                                    priorFind.rows.map((r, i) => h('div', { key: r.entryId, className: 'flex items-center gap-2' },
                                        h('input', { type: 'checkbox', id: 'rw-prior-find-' + i, checked: r.include,
                                            onChange: e => { const on = e.target.checked; setPriorFind(prev => ({ ...prev, rows: prev.rows.map((x, j) => (j === i ? { ...x, include: on } : x)) })); } }),
                                        h('label', { htmlFor: 'rw-prior-find-' + i, className: 'text-slate-700' }, `${r.assessment} \u2014 ${r.subtest}: ${r.score}`))),
                                    priorFind.rows.length > 0 && h('div', { className: 'flex flex-wrap items-center gap-2' },
                                        h('label', { htmlFor: 'rw-prior-find-label', className: 'text-slate-700' }, __alloT('report_writer.prior_from', 'Prior from')),
                                        h('input', { id: 'rw-prior-find-label', type: 'text', maxLength: 60, className: 'border rounded px-1.5 py-0.5', value: priorFind.label,
                                            placeholder: __alloT('report_writer.placeholder_prior_from', 'e.g. 2021 evaluation'), onChange: e => { const v = e.target.value; setPriorFind(prev => ({ ...prev, label: v })); } }),
                                        h('button', { type: 'button', disabled: !priorFind.rows.some(r => r.include), onClick: attachPriorScores,
                                            className: 'px-2 py-0.5 bg-teal-700 text-white rounded hover:bg-teal-800 disabled:opacity-50' },
                                            rwFmt(__alloT('report_writer.prior_record', 'Record {count} prior score(s)'), { count: priorFind.rows.filter(r => r.include).length }))
                                    ),
                                    h('button', { type: 'button', className: 'text-slate-700 underline', onClick: () => setPriorFind(null) }, __alloT('report_writer.cancel', 'Cancel'))
                                )
                            );
                        }),
                        h('div', { className: 'space-y-1 mt-2 bg-white rounded-lg p-2 border border-teal-100' },
                            h('input', { type: 'text', className: 'w-full text-[11px] border rounded px-2 py-1', 'aria-label': __alloT('report_writer.aria_case_document_name', 'Case document name'), placeholder: __alloT('report_writer.placeholder_case_document_name', 'Document name (e.g., "2023 reevaluation")...'), value: newCaseTitle, onChange: e => setNewCaseTitle(e.target.value) }),
                            h('textarea', { className: 'w-full text-[11px] border rounded px-2 py-1 h-20 resize-none font-mono', 'aria-label': __alloT('report_writer.aria_case_document_text', 'Case document text'), placeholder: __alloT('report_writer.placeholder_paste_case_document_text', 'Paste the document text here...'), value: newCaseText, onChange: e => setNewCaseText(e.target.value) }),
                            newCaseText.trim() && h('button', { type: 'button', className: 'px-3 py-1 bg-teal-700 text-white text-[11px] rounded hover:bg-teal-800',
                                onClick: () => { addCaseDocument(newCaseTitle, newCaseText.trim()); setNewCaseTitle(''); setNewCaseText(''); }
                            }, ('➕ ' + __alloT('report_writer.add_case_document', 'Add Case Document'))),
                            h('div', { className: 'flex items-center gap-2 pt-1' },
                                h('label', { htmlFor: 'rw-case-file', className: 'text-[11px] text-teal-900 font-medium' }, caseImporting ? __alloT('report_writer.reading_file', 'Reading file…') : __alloT('report_writer.or_import_a_file_pdf_word', 'Or import a file (PDF, Word, text):')),
                                h('input', { id: 'rw-case-file', type: 'file', accept: '.pdf,.docx,.txt,.md', disabled: caseImporting, 'aria-busy': caseImporting, className: 'text-[11px] max-w-full', onChange: e => importCaseFile(e.target) })
                            )
                        )
                    )
                ),
                // ── Reference Library ──
                h('details', { className: 'mt-3 bg-indigo-50 rounded-lg border border-indigo-200' },
                    h('summary', { className: 'text-xs font-medium text-indigo-700 px-3 py-2 cursor-pointer hover:bg-indigo-100 rounded-t-lg' }, ('📚 ' + __alloT('report_writer.reference_library_dsm_5_tr_custom', 'Reference Library (DSM-5-TR + Custom Documents)'))),
                    h('div', { className: 'px-3 pb-3 space-y-2' },
                        h('p', { className: 'text-[11px] text-indigo-500' }, __alloT('report_writer.add_clinical_references_e_g_muser', 'Add clinical references (e.g., MUSER, district protocols) for cross-referencing in analysis and report generation.')),
                        h('div', { className: 'px-2 py-1.5 bg-white rounded border border-indigo-100 flex items-center justify-between text-[11px]' },
                            h('span', { className: 'font-medium text-indigo-800' }, ('📖 ' + __alloT('report_writer.dsm_5_tr_paraphrased_criteria_built', 'DSM-5-TR (Paraphrased Criteria) — Built-in'))),
                            h('span', { className: 'text-[11px] px-1.5 py-0.5 bg-indigo-100 text-indigo-600 rounded-full' }, __alloT('report_writer.default', 'Default'))
                        ),
                        referenceLibrary.map(ref =>
                            h('div', { key: ref.id, className: 'px-2 py-1.5 bg-white rounded border border-slate-400 flex items-center justify-between text-[11px]' },
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('span', { className: 'font-medium text-slate-800 block truncate' }, ref.name),
                                    h('span', { className: 'text-slate-600 text-[11px]' }, ref.text.substring(0, 80) + '...')
                                ),
                                h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_remove_reference_named', 'Remove reference: {name}'), { name: ref.name }), className: 'ms-2 text-red-600 hover:text-red-600 text-xs', onClick: () => setReferenceLibrary(prev => prev.filter(r => r.id !== ref.id)) }, '\u2715')
                            )
                        ),
                        h('div', { className: 'space-y-1 mt-2 bg-white rounded-lg p-2 border border-indigo-100' },
                            h('input', { type: 'text', className: 'w-full text-[11px] border rounded px-2 py-1', 'aria-label': __alloT('report_writer.aria_reference_name', 'Reference name'), placeholder: __alloT('report_writer.placeholder_reference_name_e_g_muser_ch', 'Reference name (e.g., "MUSER Ch. 101")...'), value: newRefName, onChange: e => setNewRefName(e.target.value) }),
                            h('textarea', { className: 'w-full text-[11px] border rounded px-2 py-1 h-20 resize-none font-mono', 'aria-label': __alloT('report_writer.aria_reference_text', 'Reference text'), placeholder: __alloT('report_writer.placeholder_paste_reference_text_here', 'Paste reference text here...'), value: newRefText, onChange: e => setNewRefText(e.target.value) }),
                            newRefName.trim() && newRefText.trim() && h('button', { 'aria-label': __alloT('report_writer.aria_add_reference', 'Add reference'), className: 'px-3 py-1 bg-indigo-600 text-white text-[11px] rounded hover:bg-indigo-700',
                                onClick: () => { setReferenceLibrary(prev => [...prev, { id: uid(), name: newRefName.trim(), text: newRefText.trim(), addedAt: new Date().toISOString() }]); setNewRefName(''); setNewRefText(''); if (addToast) addToast(t('toasts.reference_added'), 'success'); }
                            }, ('➕ ' + __alloT('report_writer.add_reference', 'Add Reference'))),
                            // Or add a reference from a file (PDF text layer by page, Word,
                            // text) through Lumen's document reader.
                            h('div', { className: 'flex items-center gap-2 pt-1' },
                                h('label', { htmlFor: 'rw-ref-file', className: 'text-[11px] text-indigo-800 font-medium' }, refImporting ? __alloT('report_writer.reading_file', 'Reading file…') : __alloT('report_writer.or_import_a_file_pdf_word', 'Or import a file (PDF, Word, text):')),
                                h('input', { id: 'rw-ref-file', type: 'file', accept: '.pdf,.docx,.txt,.md', disabled: refImporting, 'aria-busy': refImporting, className: 'text-[11px] max-w-full', onChange: e => importReferenceFile(e.target) })
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(1) }, ('← ' + __alloT('report_writer.student_2', 'Student'))),
                    h('button', { 'aria-label': __alloT('report_writer.aria_next_clinical_observations', 'Next: Clinical Observations'), className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(3) }, (__alloT('report_writer.next_clinical_observations', 'Next: Clinical Observations') + ' →'))
                )
            ),
            // ═══ STEP 5: Fact Chunk Review ═══
            currentStep === 5 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-3' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('🔒 ' + __alloT('report_writer.fact_chunk_review', 'Fact Chunk Review'))),
                staleFactsNotice(),
                backgroundStaleNotice(),
                h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.verify_each_fact_verified_chunks_become', 'Verify each fact. Verified chunks become immutable and serve as ground truth for the report.')),
                // Stats bar
                h('div', { className: 'flex items-center gap-3 bg-slate-50 rounded-lg p-2' },
                    h('span', { className: 'text-[11px] font-medium text-slate-600' }, rwFmt(__alloT('report_writer.total', '{totalChunks} total'), { totalChunks })),
                    h('span', { className: 'text-[11px] font-medium text-green-600' }, ('✅ ' + rwFmt(__alloT('report_writer.verified', '{verifiedCount} verified'), { verifiedCount }))),
                    h('span', { className: 'text-[11px] font-medium text-slate-600' }, ('⏳ ' + rwFmt(__alloT('report_writer.pending', '{value} pending'), { value: totalChunks - verifiedCount }))),
                    deficitCount > 0 && h('span', { className: 'text-[11px] font-medium text-red-600' }, ('⚠️ ' + rwFmt(__alloT('report_writer.deficits', '{deficitCount} deficits'), { deficitCount }))),
                    totalChunks > 0 && verifiedCount < totalChunks && h('button', { 'aria-label': __alloT('report_writer.aria_verify_all_fact_chunks', 'Verify all fact chunks'), className: 'ms-auto text-[11px] px-2 py-0.5 bg-green-700 text-white rounded-full hover:bg-green-700', onClick: verifyAllChunks
                    }, ('✅ ' + __alloT('report_writer.verify_all', 'Verify All')))
                ),
                extracting && h('div', { className: 'text-center py-6' },
                    h('div', { className: 'inline-block motion-reduce:animate-none w-6 h-6 border-2 border-violet-300 border-t-violet-600 rounded-full' + (reducedMotion ? '' : ' animate-spin') }),
                    h('p', { className: 'text-xs text-slate-600 mt-2' }, __alloT('report_writer.extracting_fact_chunks', 'Extracting fact chunks...'))
                ),
                // Chunk cards
                !extracting && h('div', { className: 'space-y-2 max-h-[400px] overflow-y-auto' },
                    factChunks.length === 0 && h('div', { className: 'text-center py-8 text-slate-600' },
                        h('p', { className: 'text-sm' }, __alloT('report_writer.no_fact_chunks_yet', 'No fact chunks yet')),
                        h('button', { 'aria-label': __alloT('report_writer.aria_extract_facts', 'Extract facts'), className: 'mt-2 px-3 py-1.5 bg-violet-600 text-white text-xs rounded-lg', onClick: extractFactChunks }, ('🔍 ' + __alloT('report_writer.extract_facts', 'Extract Facts')))
                    ),
                    factChunks.map(chunk =>
                        h('div', { key: chunk.id, className: `rounded-lg p-3 border transition-all ${chunk.verified ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}` },
                            h('div', { className: 'flex items-start justify-between gap-2' },
                                h('div', { className: 'flex-1' },
                                    h('div', { className: 'flex items-center gap-2 mb-1' },
                                        h('span', { className: `text-[11px] px-1.5 py-0.5 rounded-full font-medium ${chunk.type === 'score' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}` }, chunk.type),
                                        h('span', { className: 'text-[11px] text-slate-600' }, chunk.source),
                                        chunk.verified && h('span', { className: 'text-[11px] px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-bold' }, ('🔒 ' + __alloT('report_writer.immutable', 'Immutable'))),
                                        chunk.devNormResult && h('span', { className: `text-[11px] px-1.5 py-0.5 rounded-full font-medium ${cBadge(chunk.devNormResult.color)}` }, chunk.devNormResult.label)
                                    ),
                                    h('p', { className: 'text-xs font-medium text-slate-800' }, `${chunk.field}: ${chunk.type === 'score' ? chunk.value + ' (' + chunk.classification + ')' : chunk.value}`),
                                    chunk.devNormResult?.explanation && h('p', { className: `text-[11px] mt-0.5 ${cText(chunk.devNormResult.color)}` }, chunk.devNormResult.explanation)
                                ),
                                !chunk.verified && h('div', { className: 'flex items-center gap-1' },
                                    h('button', { 'aria-label': __alloT('report_writer.aria_verify_and_lock_this_fact_chunk', 'Verify and lock this fact chunk'), className: 'px-2 py-1 bg-green-700 text-white text-[11px] rounded hover:bg-green-700', onClick: () => verifyChunk(chunk.id), title: __alloT('report_writer.title_verify_lock', 'Verify & Lock') }, '✅'),
                                    h('button', { 'aria-label': __alloT('report_writer.aria_reject_fact_chunk', 'Reject fact chunk'), className: 'px-2 py-1 bg-red-100 text-red-700 text-[11px] rounded hover:bg-red-200', onClick: () => rejectChunk(chunk.id), title: __alloT('report_writer.title_reject', 'Reject') }, '✕')
                                )
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(4) }, ('← ' + __alloT('report_writer.scores', 'Scores'))),
                    h('button', { 'aria-label': __alloT('report_writer.aria_go_to_hypotheses', 'Go to hypotheses'), className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${verifiedCount > 0 ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-600 cursor-not-allowed'}`,
                        disabled: verifiedCount === 0, onClick: () => setCurrentStep(6)
                    }, (rwFmt(__alloT('report_writer.next_hypotheses_facts', 'Next: Hypotheses ({verifiedCount} facts)'), { verifiedCount }) + ' →'))
                )
            ),

            // ═══ STEP 6: Diagnostic Hypotheses ═══
            currentStep === 6 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-3' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('🔬 ' + __alloT('report_writer.diagnostic_hypotheses', 'Diagnostic Hypotheses'))),
                h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.enter_diagnostic_hypotheses_to_evaluate_the', 'Enter diagnostic hypotheses to evaluate. The AI will organize your verified evidence for and against each hypothesis.')),
                // Hypothesis presets
                h('div', { className: 'space-y-2' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600' }, __alloT('report_writer.quick_add', 'Quick Add:')),
                    h('div', { className: 'flex flex-wrap gap-1' },
                        HYPOTHESIS_PRESETS.filter(p => !hypotheses.includes(p)).map(preset =>
                            h('button', { 'aria-label': __alloT('report_writer.aria_add_hypothesis_preset', 'Add hypothesis preset'), key: preset,
                                className: 'px-2 py-1 bg-violet-50 text-violet-700 text-[11px] rounded-full border border-violet-600 hover:bg-violet-100 transition-colors',
                                onClick: () => setHypotheses(prev => [...prev, preset])
                            }, '+ ' + preset)
                        )
                    ),
                    // Custom hypothesis
                    h('div', { className: 'flex gap-2 mt-1' },
                        h('input', { type: 'text', className: 'flex-1 text-[11px] border rounded-lg px-2 py-1', placeholder: __alloT('report_writer.placeholder_custom_hypothesis', 'Custom hypothesis...'), 'aria-label': __alloT('report_writer.aria_custom_hypothesis', 'Custom hypothesis'), value: newHypothesis, onChange: e => setNewHypothesis(e.target.value), onKeyDown: e => { if (e.key === 'Enter' && newHypothesis.trim()) { setHypotheses(prev => [...prev, newHypothesis.trim()]); setNewHypothesis(''); } } }),
                        h('button', { 'aria-label': __alloT('report_writer.aria_add', 'Add'), className: 'px-3 py-1 bg-violet-600 text-white text-[11px] rounded-lg hover:bg-violet-700', disabled: !newHypothesis.trim(), onClick: () => { if (newHypothesis.trim()) { setHypotheses(prev => [...prev, newHypothesis.trim()]); setNewHypothesis(''); } } }, __alloT('report_writer.add', 'Add'))
                    )
                ),
                // Current hypotheses
                hypotheses.length > 0 && h('div', { className: 'bg-slate-50 rounded-lg p-3 space-y-1' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.active_hypotheses', 'Active Hypotheses:')),
                    hypotheses.map((hyp, i) =>
                        h('div', { key: i, className: 'flex items-center justify-between px-2 py-1.5 bg-white rounded border text-[11px] ' + (selectedHypotheses.includes(hyp) ? 'border-violet-300 bg-violet-50' : 'border-slate-200') },
                            h('div', { className: 'flex items-center gap-2 flex-1' },
                                h('input', { type: 'checkbox', 'aria-label': rwFmt(__alloT('report_writer.aria_include_hypothesis', 'Include hypothesis: {hyp}'), { hyp }), checked: selectedHypotheses.includes(hyp), onChange: e => { if (e.target.checked) setSelectedHypotheses(prev => [...prev, hyp]); else setSelectedHypotheses(prev => prev.filter(h => h !== hyp)); } }),
                                h('span', { className: 'font-medium text-slate-800' }, hyp),
                                differentialResults[hyp] && h('span', { className: 'px-1.5 py-0.5 rounded-full text-[11px] font-bold ' + (differentialResults[hyp].strengthScore >= 7 ? 'bg-green-100 text-green-700' : differentialResults[hyp].strengthScore >= 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700')
                                }, differentialResults[hyp].strengthScore + '/10')
                            ),
                            hyp !== 'No Diagnosis / Does Not Qualify' && h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_remove_hypothesis_named', 'Remove hypothesis: {name}'), { name: hyp }), className: 'text-red-600 hover:text-red-600 ms-2', onClick: () => { setHypotheses(prev => prev.filter(h => h !== hyp)); setSelectedHypotheses(prev => prev.filter(h => h !== hyp)); } }, '\u2715')
                        )
                    ),
                    h('p', { className: 'text-[11px] text-slate-600 mt-1' }, ('☑️ ' + __alloT('report_writer.check_hypotheses_to_include_in_report', 'Check hypotheses to include in report generation. "No Diagnosis" is always evaluated as baseline.')))
                ),
                // Run analysis button
                factChunks.filter(c => c.verified).length > 0 && h('div', { className: 'pt-2' },
                    h('button', { 'aria-label': __alloT('report_writer.aria_run_differential_analysis', 'Run differential analysis'), className: 'w-full px-4 py-2.5 text-xs font-medium rounded-lg transition-colors ' + (runningDifferential ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-gradient-to-r from-violet-700 to-indigo-700 text-white hover:from-violet-700 hover:to-indigo-700'),
                        disabled: runningDifferential || hypotheses.length < 2,
                        onClick: runDifferentialAnalysis
                    }, runningDifferential ? ('⏳ ' + __alloT('report_writer.analyzing_evidence', 'Analyzing evidence...')) : ('🔬 ' + __alloT('report_writer.run_differential_analysis', 'Run Differential Analysis')))
                ),
                hypotheses.length < 2 && h('p', { className: 'text-[11px] text-amber-600 text-center' }, __alloT('report_writer.add_at_least_2_hypotheses_including', 'Add at least 2 hypotheses (including "No Diagnosis") to run analysis.')),
                // Differential results
                Object.keys(differentialResults).length > 0 && h('div', { className: 'space-y-2 mt-2' },
                    h('h4', { className: 'text-xs font-bold text-indigo-700' }, ('📊 ' + __alloT('report_writer.differential_evidence_summary', 'Differential Evidence Summary'))),
                    Object.entries(differentialResults).map(([name, data]) =>
                        h('details', { key: name, className: 'bg-slate-50 rounded-lg border border-slate-400', open: true },
                            h('summary', { className: 'text-xs font-medium text-slate-700 px-3 py-2 cursor-pointer hover:bg-slate-100 rounded-t-lg flex items-center gap-2' },
                                h('span', {
                                    className: 'w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white ' + (data.strengthScore >= 7 ? 'bg-green-500' : data.strengthScore >= 4 ? 'bg-amber-500' : 'bg-red-400')
                                }, data.strengthScore || '?'),
                                name
                            ),
                            h('div', { className: 'px-3 pb-2 space-y-1 text-[11px]' },
                                data.evidenceFor && data.evidenceFor.length > 0 && h('div', null,
                                    h('p', { className: 'font-medium text-green-700' }, ('✅ ' + __alloT('report_writer.evidence_for', 'Evidence For:'))),
                                    data.evidenceFor.map((e, i) => h('p', { key: i, className: 'ms-3 text-slate-600' }, '- ' + e.fact + ' (' + e.strength + ': ' + (e.explanation || '') + ')'))
                                ),
                                data.evidenceAgainst && data.evidenceAgainst.length > 0 && h('div', null,
                                    h('p', { className: 'font-medium text-red-600' }, ('❌ ' + __alloT('report_writer.evidence_against', 'Evidence Against:'))),
                                    data.evidenceAgainst.map((e, i) => h('p', { key: i, className: 'ms-3 text-slate-600' }, '- ' + e.fact + ': ' + (e.explanation || '')))
                                ),
                                data.evidenceGaps && data.evidenceGaps.length > 0 && h('div', null,
                                    h('p', { className: 'font-medium text-amber-600' }, ('⚠️ ' + __alloT('report_writer.evidence_gaps', 'Evidence Gaps:'))),
                                    data.evidenceGaps.map((g, i) => h('p', { key: i, className: 'ms-3 text-slate-600' }, '- ' + g))
                                )
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(5) }, ('← ' + __alloT('report_writer.fact_chunks_3', 'Fact Chunks'))),
                    h('button', { 'aria-label': __alloT('report_writer.aria_next_blueprint', 'Next: Blueprint'), className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(7) }, (__alloT('report_writer.next_blueprint', 'Next: Blueprint') + ' →'))
                )
            ),

            // ═══ STEP 7: Report Blueprint ═══
            currentStep === 7 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-3' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('📐 ' + __alloT('report_writer.report_blueprint', 'Report Blueprint'))),
                h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.customize_your_report_structure_section_order', 'Customize your report structure, section order, and add notes to guide each section\'s generation.')),
                // Report type selector
                h('div', { className: 'flex items-center gap-2' },
                    h('label', { className: 'text-[11px] font-medium text-slate-600' }, __alloT('report_writer.report_type', 'Report Type:')),
                    h('select', {
                        className: 'text-xs border rounded-lg px-2 py-1',
                        'aria-label': __alloT('report_writer.aria_report_type', 'Report type'),
                        value: reportType,
                        onChange: e => {
                            const type = e.target.value;
                            const customised = blueprint.some(s => String(s.notes || '').trim()) || Object.values(reportSections).some(v => String(v || '').trim());
                            confirmThen(customised, {
                                title: rwFmt(__alloT('report_writer.confirm_report_type_title', 'Switch to the {type} blueprint?'), { type }),
                                message: __alloT('report_writer.confirm_report_type_message', 'Its sections replace the current ones, with their notes.'),
                                confirmLabel: __alloT('report_writer.confirm_report_type', 'Switch blueprint') }, () => {
                                setReportType(type);
                                setBlueprint(BLUEPRINT_TEMPLATES[type].map(s => ({ ...s, id: uid() })));
                            });
                        }
                    },
                        Object.keys(BLUEPRINT_TEMPLATES).map(t => h('option', { key: t, value: t }, t))
                    )
                ),
                // Section list
                h('div', { className: 'space-y-1' },
                    blueprint.map((section, idx) =>
                        h('div', { key: section.id, className: 'bg-slate-50 rounded-lg border border-slate-400 p-2 ' + (!section.enabled ? 'opacity-50' : '') },
                            h('div', { className: 'flex items-center gap-2' },
                                h('div', { className: 'flex flex-col gap-0.5' },
                                    h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_move_section_up_named', 'Move {name} up'), { name: section.name }), className: 'text-[11px] text-slate-600 hover:text-slate-700 leading-none', disabled: idx === 0,
                                        onClick: () => { const nw = [...blueprint]; const tmp = nw[idx]; nw[idx] = nw[idx - 1]; nw[idx - 1] = tmp; setBlueprint(nw); }
                                    }, '\u25B2'),
                                    h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_move_section_down_named', 'Move {name} down'), { name: section.name }), className: 'text-[11px] text-slate-600 hover:text-slate-700 leading-none', disabled: idx === blueprint.length - 1,
                                        onClick: () => { const nw = [...blueprint]; const tmp = nw[idx]; nw[idx] = nw[idx + 1]; nw[idx + 1] = tmp; setBlueprint(nw); }
                                    }, '\u25BC')
                                ),
                                h('input', { type: 'checkbox', 'aria-label': rwFmt(__alloT('report_writer.aria_enable_section', 'Enable section: {name}'), { name: section.name }), checked: section.enabled, onChange: e => { const nw = [...blueprint]; nw[idx] = { ...nw[idx], enabled: e.target.checked }; setBlueprint(nw); } }),
                                h('span', { className: 'text-[11px] font-medium text-slate-800 flex-1' }, (idx + 1) + '. ' + section.name),
                                h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_remove_report_section_named', 'Remove report section: {name}'), { name: section.name }), className: 'text-red-600 hover:text-red-600 text-xs', onClick: () => confirmThen(!!(String(section.notes || '').trim() || String(reportSections[section.name] || '').trim()), {
                                    title: rwFmt(__alloT('report_writer.confirm_remove_section_title', 'Remove "{name}"?'), { name: section.name }),
                                    message: __alloT('report_writer.confirm_remove_section_message', 'The section and its notes are removed from the blueprint; text already written for it is no longer part of the report.'),
                                    confirmLabel: __alloT('report_writer.confirm_remove_section', 'Remove section') }, () => setBlueprint(prev => prev.filter(s => s.id !== section.id))) }, '\u2715')
                            ),
                            h('input', {
                                type: 'text',
                                className: 'w-full text-[11px] border rounded px-2 py-0.5 mt-1 text-slate-600',
                                'aria-label': rwFmt(__alloT('report_writer.aria_notes_for_section', 'Notes for section: {name}'), { name: section.name }),
                                placeholder: __alloT('report_writer.placeholder_section_notes_e_g_focus_on', 'Section notes (e.g., "focus on classroom accommodations")...'),
                                value: section.notes,
                                onChange: e => { const nw = [...blueprint]; nw[idx] = { ...nw[idx], notes: e.target.value }; setBlueprint(nw); }
                            })
                        )
                    ),
                    h('button', { 'aria-label': __alloT('report_writer.aria_add_report_section', 'Add report section'), className: 'w-full px-3 py-1.5 bg-slate-100 text-slate-600 text-[11px] rounded-lg hover:bg-slate-200 border border-dashed border-slate-300',
                        onClick: () => setBlueprint(prev => [...prev, { id: uid(), name: 'New Section', notes: '', enabled: true }])
                    }, ('➕ ' + __alloT('report_writer.add_section', 'Add Section')))
                ),
                // Style profile
                h('details', { className: 'mt-2 bg-amber-50 rounded-lg border border-amber-200' },
                    h('summary', { className: 'text-xs font-medium text-amber-700 px-3 py-2 cursor-pointer hover:bg-amber-100 rounded-t-lg' }, ('🎨 ' + __alloT('report_writer.writing_style_paste_sample_report', 'Writing Style (paste sample report)'))),
                    h('div', { className: 'px-3 pb-3' },
                        h('p', { className: 'text-[11px] text-amber-600 mb-1' }, __alloT('report_writer.paste_a_redacted_sample_report_to', 'Paste a redacted sample report to match your professional writing style.')),
                        h('textarea', {
                            className: 'w-full text-[11px] border rounded-lg px-2 py-1 h-32 resize-none font-mono',
                            'aria-label': __alloT('report_writer.aria_writing_style_sample_report', 'Writing style sample report'),
                            placeholder: __alloT('report_writer.placeholder_paste_a_sample_report_here_redact', 'Paste a sample report here (redact student names)...'),
                            value: styleProfile,
                            onChange: e => setStyleProfile(e.target.value)
                        }),
                        styleProfile && (() => {
                            const names = rwStyleSampleForAI(styleProfile, scrubPII).names;
                            return h('p', { className: 'text-[11px] text-amber-900 mt-1', role: 'status' }, names.length
                                ? rwFmt(__alloT('report_writer.style_sample_names_replaced', 'Before this sample goes to the AI, its numbers become [#] and these names become [Name]: {names}.'), { names: names.join(', ') })
                                : __alloT('report_writer.style_sample_numbers_replaced', 'Before this sample goes to the AI, its numbers become [#]. No names were found in it.'));
                        })(),
                        styleProfile && h('p', { className: 'text-[11px] text-amber-500 mt-1' }, ('✅ ' + rwFmt(__alloT('report_writer.style_profile_loaded_chars_will_guide', 'Style profile loaded ({count} chars) — will guide AI writing tone and structure.'), { count: styleProfile.length })))
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(6) }, ('← ' + __alloT('report_writer.hypotheses', 'Hypotheses'))),
                    h('button', { 'aria-label': __alloT('report_writer.aria_next_generate', 'Next: Generate'), className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(8) }, (__alloT('report_writer.next_generate', 'Next: Generate') + ' →'))
                )
            ),
            // ═══ STEP 8: Generate Report ═══
            currentStep === 8 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-3' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('✍️ ' + __alloT('report_writer.generate_report', 'Generate Report'))),
                staleFactsNotice(),
                h('div', { className: 'flex items-center gap-3 mb-2' },
                    h('div', { className: 'flex-1' },
                        h('label', { className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.report_title', 'Report Title')),
                        h('input', { type: 'text', className: 'w-full text-xs border rounded-lg px-3 py-1.5', 'aria-label': __alloT('report_writer.aria_report_title', 'Report title'), value: reportTitle, onChange: e => setReportTitle(e.target.value) })
                    ),
                    h('div', { className: 'shrink-0 text-center' },
                        h('label', { className: 'text-[11px] font-bold text-slate-600 uppercase block mb-0.5' }, rwFmt(__alloT('report_writer.quality_x', 'Quality: {reportGenPasses}x'), { reportGenPasses })),
                        h('input', { type: 'range', min: 1, max: 5, value: reportGenPasses, onChange: e => setReportGenPasses(parseInt(e.target.value)),
                            className: 'w-16', 'aria-label': __alloT('report_writer.aria_generation_passes_per_section', 'Generation passes per section'),
                            title: reportGenPasses === 1 ? __alloT('report_writer.title_fast_1_pass', 'Fast (1 pass)') : reportGenPasses <= 3 ? rwFmt(__alloT('report_writer.title_balanced_passes', 'Balanced ({reportGenPasses} passes)'), { reportGenPasses }) : rwFmt(__alloT('report_writer.title_research_grade_passes', 'Research-grade ({reportGenPasses} passes)'), { reportGenPasses }) }),
                        h('div', { className: 'text-[11px] text-slate-600' }, reportGenPasses === 1 ? __alloT('report_writer.fast', 'Fast') : reportGenPasses <= 3 ? __alloT('report_writer.balanced', 'Balanced') : __alloT('report_writer.research', 'Research'))
                    ),
                    h('button', { 'aria-label': __alloT('report_writer.aria_generate_report', 'Generate report'), className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${generating ? 'bg-slate-300 text-slate-600 cursor-not-allowed' : 'bg-violet-600 text-white hover:bg-violet-700'}`,
                        disabled: sectionsBusy, 'aria-busy': generating, onClick: generateReport
                    }, generating ? `⏳ ${genProgress || __alloT('report_writer.generating', 'Generating...')}` : ('✨ ' + rwFmt(__alloT('report_writer.generate', 'Generate{value}'), { value: reportGenPasses > 1 ? ' (' + reportGenPasses + 'x)' : '' }))),
                    generating && stopButton('sections', __alloT('report_writer.stop_generating', 'Stop generating'))
                ),
                // The bar was a fixed 60% pulse whatever the progress.
                generating && h('div', { className: 'space-y-2' },
                    h('div', { className: 'w-full bg-slate-100 rounded-full h-2 overflow-hidden', role: 'progressbar',
                        'aria-label': __alloT('report_writer.aria_generation_progress', 'Generation progress'), 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round((genFraction || 0) * 100) },
                        h('div', { className: 'h-full bg-violet-500 rounded-full transition-all motion-reduce:transition-none', style: { width: Math.max(3, Math.round((genFraction || 0) * 100)) + '%' } })
                    ),
                    h('p', { className: 'text-[11px] text-center text-violet-600' }, genProgress)
                ),
                // ── Automated-verification coverage disclosure ──
                // A section the score verifier never cleared must not be visually
                // indistinguishable from one it did. This states coverage on the
                // document itself, not only in a toast the clinician may have
                // dismissed before reading. Render-only; nothing persisted.
                Object.keys(reportSections).length > 0 && (unverifiedSections.length > 0 || badCitations.length > 0) && h('div', {
                    className: 'mt-3 rounded-lg p-3 border bg-amber-50 border-amber-300',
                    role: 'status'
                },
                    h('div', { className: 'flex items-start gap-2' },
                        h('span', { className: 'text-sm', 'aria-hidden': 'true' }, '\u26a0\ufe0f'),
                        h('div', { className: 'text-[11px] text-amber-900 space-y-1' },
                            h('p', { className: 'font-bold' }, __alloT('report_writer.automated_verification_did_not_cover_this', 'Automated verification did not cover this whole draft')),
                            unverifiedSections.length > 0 && h('p', null,
                                rwFmt(__alloT('report_writer.score_citations_were_not_automatically_checked', 'Score citations were NOT automatically checked in: {value}. Check these sections against the source data yourself.'), { value: unverifiedSections.map(u => u.section).join(', ') })),
                            badCitations.length > 0 && h('p', null,
                                rwFmt(__alloT('report_writer.some_statements_cited_evidence_ids_that', 'Some statements cited evidence ids that match no verified fact ({value}). Those citations were dropped, so the text there has no traceable source.'), { value: badCitations.map(b => b.section).join(', ') })),
                            h('p', { className: 'italic' }, __alloT('report_writer.this_notice_reflects_automated_checks_only', 'This notice reflects automated checks only. A clinician must review the full report before signing.'))
                        )
                    )
                ),
                // ── psycheck handoff (Architecture C): import discrepancy report ──
                // Render-only; never persisted. See state declaration block for the
                // FERPA invariant.
                Object.keys(reportSections).length > 0 && h('div', {
                    className: 'mt-3 rounded-lg p-3 border ' + (discrepancyReport
                        ? (Array.isArray(discrepancyReport.discrepancies) && discrepancyReport.discrepancies.length > 0
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-emerald-50 border-emerald-300')
                        : 'bg-slate-50 border-slate-300')
                },
                    h('div', { className: 'flex items-center justify-between flex-wrap gap-2' },
                        h('div', { className: 'flex items-center gap-2 text-xs' },
                            h('span', { className: 'text-sm' }, '🔍'),
                            h('span', { className: 'font-bold text-slate-700' }, __alloT('report_writer.psycheck_verification', 'psycheck verification')),
                            discrepancyReport
                                ? h('span', { className: 'text-[11px] text-slate-600' },
                                    rwFmt(__alloT('report_writer.discrepancy_ies_verified_omitted', '{value} discrepancy(ies), {value2} verified, {value3} omitted'), { value: Array.isArray(discrepancyReport.discrepancies) ? discrepancyReport.discrepancies.length : 0, value2: Array.isArray(discrepancyReport.verified) ? discrepancyReport.verified.length : 0, value3: Array.isArray(discrepancyReport.omitted_scores) ? discrepancyReport.omitted_scores.length : 0 }))
                                : h('span', { className: 'text-[11px] italic text-slate-600' }, __alloT('report_writer.no_report_yet_click_verify_or', 'no report yet — click Verify or Import')),
                            discrepancyReport && discrepancyReport._source && h('span', {
                                className: 'text-[10px] px-1.5 py-0.5 rounded ' + (discrepancyReport._source === 'alloflow-inline' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'),
                                title: discrepancyReport._timestamp ? (rwFmt(__alloT('report_writer.title_generated_at', 'Generated at {_timestamp}'), { _timestamp: discrepancyReport._timestamp })) : ''
                            }, discrepancyReport._source === 'alloflow-inline' ? __alloT('report_writer.inline', 'inline') : __alloT('report_writer.imported', 'imported'))
                        ),
                        h('div', { className: 'flex items-center gap-1.5 flex-wrap' },
                            // Architecture B: inline verify (no file roundtrip).
                            // Disabled while any generation / regen / adaptation / edit
                            // is in flight — verifying mid-mutation would badge a result
                            // against text the user is about to discard.
                            (function () {
                                const verifyBusy = generating || !!regenSection || !!adaptingSection || !!editingSection;
                                const verifyDisabled = verifyBusy || Object.keys(reportSections).length === 0;
                                return h('button', {
                                    'aria-label': __alloT('report_writer.aria_verify_the_current_report_against_the', 'Verify the current report against the structured scores using the inline psycheck port'),
                                    className: 'text-[11px] px-2 py-1 rounded transition-colors font-medium ' + (verifyDisabled
                                        ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                                        : 'bg-emerald-700 text-white hover:bg-emerald-800'),
                                    title: verifyBusy
                                        ? __alloT('report_writer.title_wait_for_the_in_flight_generation', 'Wait for the in-flight generation / regen / edit to finish before verifying')
                                        : __alloT('report_writer.title_run_psycheck_verification_on_the_current', 'Run psycheck verification on the current report (no file roundtrip)'),
                                    disabled: verifyDisabled,
                                    onClick: verifyWithPsycheck
                                }, ('✓ ' + __alloT('report_writer.verify_with_psycheck', 'Verify with psycheck')));
                            })(),
                            // Architecture C: import external JSON
                            // A label around a display:none input was not in the tab
                            // order, so the import could not be reached by keyboard.
                            h('button', {
                                type: 'button',
                                className: 'text-[11px] px-2 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 cursor-pointer transition-colors font-medium',
                                title: __alloT('report_writer.title_import_a_psycheck_json_discrepancy_report', 'Import a psycheck JSON discrepancy report (Architecture C)'),
                                'aria-label': __alloT('report_writer.aria_import_psycheck_json_discrepancy_report', 'Import psycheck JSON discrepancy report'),
                                onClick: () => { const input = document.getElementById('rw-psycheck-import'); if (input) input.click(); }
                            }, ('📥 ' + __alloT('report_writer.import_discrepancy_report', 'Import discrepancy report'))),
                            h('input', { id: 'rw-psycheck-import',
                                type: 'file',
                                accept: '.json,application/json',
                                onChange: handleImportDiscrepancyReport,
                                className: 'hidden',
                                tabIndex: -1,
                                'aria-hidden': 'true'
                            }),
                            discrepancyReport && h('button', {
                                'aria-label': __alloT('report_writer.aria_clear_discrepancy_report', 'Clear discrepancy report'),
                                className: 'text-[11px] px-2 py-1 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 transition-colors',
                                onClick: clearDiscrepancyReport
                            }, ('✕ ' + __alloT('report_writer.clear', 'Clear')))
                        )
                    ),
                    // Top-level summary for unattached discrepancies (no section binding)
                    discrepancyReport && Array.isArray(discrepanciesBySection.__unattached) && discrepanciesBySection.__unattached.length > 0
                        && h('div', { className: 'mt-2 pt-2 border-t border-amber-200 text-[11px]' },
                            h('div', { className: 'font-bold text-amber-800 mb-1' },
                                ('⚠️ ' + rwFmt(__alloT('report_writer.discrepancy_ies_could_not_be_matched', '{count} discrepancy(ies) could not be matched to a section:'), { count: discrepanciesBySection.__unattached.length }))),
                            h('ul', { className: 'list-disc list-inside space-y-0.5 text-slate-700' },
                                discrepanciesBySection.__unattached.map((d, i) =>
                                    h('li', { key: i }, `[${d.kind || __alloT('report_writer.unknown_2', 'unknown')}] ${d.detail || ''}`)
                                )
                            )
                        ),
                    // Omitted scores warning — surfaces "should this be discussed?"
                    discrepancyReport && Array.isArray(discrepancyReport.omitted_scores) && discrepancyReport.omitted_scores.length > 0
                        && h('div', { className: 'mt-2 pt-2 border-t border-amber-200 text-[11px]' },
                            h('div', { className: 'font-bold text-slate-700 mb-1' },
                                ('🔕 ' + rwFmt(__alloT('report_writer.score_s_in_input_but_not', '{count} score(s) in input but not discussed in draft:'), { count: discrepancyReport.omitted_scores.length }))),
                            h('ul', { className: 'list-disc list-inside space-y-0.5 text-slate-700' },
                                discrepancyReport.omitted_scores.map((s, i) =>
                                    h('li', { key: i },
                                        `${s.assessment || ''} ${s.subtest || ''}: ${s.score} ` +
                                        (s.classification ? `(${s.classification})` : ''))
                                )
                            )
                        ),
                    // Terminology notes: the range is right but the manual uses a
                    // different word. Informational; they do not block export.
                    discrepancyReport && Array.isArray(discrepancyReport.terminology_notes) && discrepancyReport.terminology_notes.length > 0
                        && h('div', { className: 'mt-2 pt-2 border-t border-slate-200 text-[11px]' },
                            h('div', { className: 'font-bold text-slate-700 mb-1' },
                                ('📖 ' + rwFmt(__alloT('report_writer.terminology_note_s_not_blocking', '{count} terminology note(s), not blocking:'), { count: discrepancyReport.terminology_notes.length }))),
                            h('ul', { className: 'list-disc list-inside space-y-0.5 text-slate-700' },
                                discrepancyReport.terminology_notes.map((n, i) =>
                                    h('li', { key: i }, `${n.assessment || ''} ${n.subtest || ''}: ${n.detail || ''}`)
                                )
                            )
                        ),
                    // A difference called significant with no critical values behind it. Advisory.
                    discrepancyReport && Array.isArray(discrepancyReport.significance_notes) && discrepancyReport.significance_notes.length > 0
                        && h('div', { className: 'mt-2 pt-2 border-t border-slate-200 text-[11px]' },
                            h('div', { className: 'font-bold text-slate-700 mb-1' },
                                ('⚖️ ' + rwFmt(__alloT('report_writer.significance_notes_title', '{count} difference(s) called significant, to confirm against the score report, not blocking:'), { count: discrepancyReport.significance_notes.length }))),
                            h('ul', { className: 'list-disc list-inside space-y-0.5 text-slate-700' },
                                discrepancyReport.significance_notes.map((n, i) => h('li', { key: i }, n.detail || ''))
                            )
                        ),
                    // Eligibility stated as a finding: the IEP team decides it. Advisory.
                    discrepancyReport && Array.isArray(discrepancyReport.language_notes) && discrepancyReport.language_notes.length > 0
                        && h('div', { className: 'mt-2 pt-2 border-t border-slate-200 text-[11px]' },
                            h('div', { className: 'font-bold text-slate-700 mb-1' },
                                ('⚖️ ' + rwFmt(__alloT('report_writer.eligibility_statement_s_to_review_not', '{count} eligibility statement(s) to review, not blocking:'), { count: discrepancyReport.language_notes.length }))),
                            h('ul', { className: 'list-disc list-inside space-y-0.5 text-slate-700' },
                                discrepancyReport.language_notes.map((n, i) => h('li', { key: i }, n.detail || ''))
                            )
                        ),
                    // Age or grade statements that differ from Step 1. Advisory.
                    discrepancyReport && Array.isArray(discrepancyReport.identity_notes) && discrepancyReport.identity_notes.length > 0
                        && h('div', { className: 'mt-2 pt-2 border-t border-slate-200 text-[11px]' },
                            h('div', { className: 'font-bold text-slate-700 mb-1' },
                                ('⚠️ ' + rwFmt(__alloT('report_writer.identity_notes_title', '{count} age or grade statement(s) that differ from Step 1, not blocking:'), { count: discrepancyReport.identity_notes.length }))),
                            h('ul', { className: 'list-disc list-inside space-y-0.5 text-slate-700' },
                                discrepancyReport.identity_notes.map((n, i) => h('li', { key: i }, n.detail || ''))
                            )
                        ),
                    // Quotations not found in anything the clinician supplied. Advisory.
                    discrepancyReport && Array.isArray(discrepancyReport.quote_notes) && discrepancyReport.quote_notes.length > 0
                        && h('div', { className: 'mt-2 pt-2 border-t border-slate-200 text-[11px]' },
                            h('div', { className: 'font-bold text-slate-700 mb-1' },
                                ('❝ ' + rwFmt(__alloT('report_writer.quotation_s_with_no_source_found', '{count} quotation(s) with no source found, not blocking:'), { count: discrepancyReport.quote_notes.length }))),
                            h('ul', { className: 'list-disc list-inside space-y-0.5 text-slate-700' },
                                discrepancyReport.quote_notes.map((n, i) => h('li', { key: i }, n.detail || ''))
                            )
                        )
                ),
                // Generated sections with evidence mapping & per-section controls
                Object.keys(reportSections).length > 0 && h('div', { className: 'space-y-3 mt-3' },
                    Object.entries(reportSections).map(([section, text]) =>
                        h('div', { key: section, className: 'bg-slate-50 rounded-lg p-3 border border-slate-400' },
                            // Section header with controls
                            h('div', { className: 'flex items-center justify-between mb-2 border-b border-slate-200 pb-1' },
                                h('h4', { className: 'text-xs font-bold text-indigo-700' }, section),
                                h('div', { className: 'flex items-center gap-1' },
                                    // Edit button
                                    editingSection !== section && h('button', { disabled: sectionsBusy, 'aria-label': __alloT('report_writer.aria_edit_section', 'Edit section'), className: 'text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-600 hover:bg-slate-300 transition-colors', onClick: () => { setEditingSection(section); setEditSectionText(text); }
                                    }, ('✏️ ' + __alloT('report_writer.edit', 'Edit'))),
                                    // Grade-level adaptation dropdown
                                    h('select', {
                                        className: `text-[11px] px-1.5 py-0.5 rounded border transition-colors ${adaptingSection === section ? 'bg-teal-200 text-teal-800 cursor-wait border-teal-600' : 'bg-teal-50 text-teal-700 border-teal-600 hover:bg-teal-100'}`,
                                        'aria-label': rwFmt(__alloT('report_writer.aria_adapt_grade_level_for', 'Adapt grade level for {section}'), { section }),
                                        disabled: sectionsBusy,
                                        value: adaptChoice[section] || '',
                                        onChange: e => { const level = e.target.value; setAdaptChoice(prev => ({ ...prev, [section]: level })); }
                                    },
                                        h('option', { value: '' }, adaptingSection === section ? ('⏳ ' + __alloT('report_writer.adapting', 'Adapting...')) : ('📖 ' + __alloT('report_writer.adapt_level', 'Adapt Level'))),
                                        h('option', { value: 'Parent-Friendly' }, ('👨‍👩‍👧 ' + __alloT('report_writer.parent_friendly', 'Parent-Friendly'))),
                                        h('option', { value: 'Professional' }, ('🩺 ' + __alloT('report_writer.professional', 'Professional'))),
                                        h('option', { value: 'Student-Friendly (Elementary)' }, ('🧒 ' + __alloT('report_writer.student_elem', 'Student (Elem)'))),
                                        h('option', { value: 'Student-Friendly (Secondary)' }, ('🧑 ' + __alloT('report_writer.student_secondary', 'Student (Secondary)')))
                                    ),
                                    adaptChoice[section] && h('button', { type: 'button', disabled: sectionsBusy,
                                        'aria-label': rwFmt(__alloT('report_writer.aria_adapt_section', 'Adapt {section}'), { section }),
                                        className: 'text-[11px] px-2 py-0.5 rounded bg-teal-700 text-white hover:bg-teal-800 disabled:opacity-50',
                                        onClick: () => adaptSectionGradeLevel(section, text, adaptChoice[section]) }, __alloT('report_writer.adapt', 'Adapt')),
                                    (sectionHistory[section] || []).length > 0 && h('button', { type: 'button', disabled: sectionsBusy,
                                        'aria-label': rwFmt(__alloT('report_writer.aria_undo_section', 'Undo the last change to {section} ({reason})'), { section, reason: undoReasonText(sectionHistory[section][sectionHistory[section].length - 1].reason) }),
                                        className: 'text-[11px] px-2 py-0.5 rounded bg-slate-200 text-slate-700 hover:bg-slate-300 disabled:opacity-50',
                                        onClick: () => undoSection(section) },
                                        ('\u21b6 ' + rwFmt(__alloT('report_writer.undo_section', 'Undo ({reason})'), { reason: undoReasonText(sectionHistory[section][sectionHistory[section].length - 1].reason) }))),
                                    // Regenerate button
                                    h('button', { 'aria-label': __alloT('report_writer.aria_show_regeneration_options', 'Show regeneration options'), className: `text-[11px] px-2 py-0.5 rounded transition-colors ${regenSection === section ? 'bg-amber-200 text-amber-800 cursor-wait' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}`,
                                        disabled: sectionsBusy,
                                        onClick: () => showRegenInput === section ? setShowRegenInput(null) : setShowRegenInput(section)
                                    }, regenSection === section ? ('⏳ ' + __alloT('report_writer.regenerating', 'Regenerating...')) : ('🔄 ' + __alloT('report_writer.regen', 'Regen')))
                                )
                            ),
                            // ── psycheck discrepancy banner (Architecture C) ──
                            // Render-only. Critical findings get a red tint; others
                            // an amber tint. Each finding shows kind + detail + the
                            // span quote from the verified draft so the clinician
                            // can locate the prose to fix.
                            Array.isArray(discrepanciesBySection[section]) && discrepanciesBySection[section].length > 0
                                && h('div', {
                                    className: 'mb-2 p-2 rounded-lg border ' + (
                                        discrepanciesBySection[section].some(d => d.kind === 'subtest_attribution')
                                            ? 'bg-red-50 border-red-300'
                                            : 'bg-amber-50 border-amber-300'),
                                    'aria-label': rwFmt(__alloT('report_writer.aria_psycheck_discrepancies_for_section', 'psycheck discrepancies for section {section}'), { section })
                                },
                                    h('div', { className: 'text-[11px] font-bold mb-1 ' + (
                                        discrepanciesBySection[section].some(d => d.kind === 'subtest_attribution')
                                            ? 'text-red-800' : 'text-amber-800') },
                                        ('🔍 ' + rwFmt(__alloT('report_writer.psycheck_flagged_issue_s_in_this', 'psycheck flagged {count} issue(s) in this section'), { count: discrepanciesBySection[section].length }))),
                                    h('ul', { className: 'space-y-1 text-[11px] text-slate-800' },
                                        discrepanciesBySection[section].map((d, i) =>
                                            h('li', { key: i, className: 'leading-snug' },
                                                h('div', { className: 'flex items-start gap-1' },
                                                    h('span', { className: 'font-bold ' + (d.kind === 'subtest_attribution' ? 'text-red-700' : 'text-amber-700') },
                                                        (d.kind === 'subtest_attribution' ? '⚠ CRITICAL: ' : '• ') +
                                                        String(d.kind || '').replace(/_/g, ' ')),
                                                    h('span', { className: 'flex-1' },
                                                        ' — ', d.detail || '')
                                                ),
                                                d.span && d.span.text && h('div', { className: 'mt-0.5 pl-3 italic text-slate-600' },
                                                    '“', d.span.text.length > 140 ? d.span.text.substring(0, 140) + '…' : d.span.text, '”'),
                                                d.confidence && d.confidence !== 'high' && h('span', { className: 'ml-2 text-[10px] text-slate-500' },
                                                    rwFmt(__alloT('report_writer.confidence', '({confidence} confidence)'), { confidence: d.confidence }))
                                            )
                                        )
                                    )
                                ),
                            // Regeneration input panel
                            showRegenInput === section && h('div', { className: 'mb-2 p-2 bg-amber-50 rounded-lg border border-amber-200 space-y-1' },
                                h('p', { className: 'text-[11px] text-amber-700 font-medium' }, __alloT('report_writer.custom_instructions_for_regeneration_optional', 'Custom instructions for regeneration (optional):')),
                                h('textarea', {
                                    className: 'w-full text-[11px] border rounded px-2 py-1 h-16 resize-none',
                                    'aria-label': __alloT('report_writer.aria_regeneration_instructions', 'Regeneration instructions'),
                                    placeholder: __alloT('report_writer.placeholder_e_g_make_more_concise_or', 'e.g., "Make more concise" or "Emphasize processing speed findings"...'),
                                    value: regenInstructions,
                                    onChange: e => setRegenInstructions(e.target.value)
                                }),
                                h('div', { className: 'flex gap-1' },
                                    h('button', { disabled: sectionsBusy, className: 'text-[11px] px-3 py-1 rounded bg-amber-700 text-white hover:bg-amber-800 font-medium disabled:opacity-50', onClick: () => regenerateSection(section, regenInstructions)
                                    }, ('✨ ' + __alloT('report_writer.regenerate', 'Regenerate'))),
                                    h('button', { 'aria-label': __alloT('report_writer.aria_cancel_regeneration', 'Cancel regeneration'), className: 'text-[11px] px-2 py-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300', onClick: () => { setShowRegenInput(null); setRegenInstructions(''); }
                                    }, __alloT('report_writer.cancel', 'Cancel'))
                                )
                            ),
                            // Inline editing or display
                            editingSection === section
                                ? h('div', { className: 'space-y-1' },
                                    h('textarea', {
                                        className: 'w-full text-[11px] text-slate-700 leading-relaxed border rounded-lg px-2 py-1.5 h-48 resize-y font-mono',
                                        'aria-label': __alloT('report_writer.aria_edit_section_text', 'Edit section text'),
                                        value: editSectionText,
                                        onChange: e => setEditSectionText(e.target.value)
                                    }),
                                    h('div', { className: 'flex gap-1' },
                                        h('button', { disabled: sectionsBusy, className: 'text-[11px] px-3 py-1 rounded bg-emerald-700 text-white hover:bg-emerald-800 font-medium disabled:opacity-50',
                                            onClick: () => { replaceSections({ [section]: editSectionText }, 'edited'); setEditingSection(null); setAccuracyResults([]); if (addToast) addToast(rwFmt(__alloT('report_writer.toast_updated', '"{section}" updated'), { section }), 'success'); }
                                        }, ('✅ ' + __alloT('report_writer.save', 'Save'))),
                                        h('button', { 'aria-label': __alloT('report_writer.aria_cancel_editing', 'Cancel editing'), className: 'text-[11px] px-2 py-1 rounded bg-slate-200 text-slate-600 hover:bg-slate-300', onClick: () => setEditingSection(null)
                                        }, __alloT('report_writer.cancel', 'Cancel'))
                                    )
                                )
                                : h('div', { className: 'text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap' },
                                    text.replace(/\[Student\]/g, () => effectiveStudentName || '[Student]')
                                ),
                            // Evidence chips
                            (sectionEvidenceMap[section] || []).length > 0 && h('div', { className: 'flex flex-wrap gap-1 mt-2 pt-1 border-t border-slate-100' },
                                h('span', { className: 'text-[11px] text-slate-600 me-1 self-center' }, __alloT('report_writer.evidence', 'Evidence:')),
                                (sectionEvidenceMap[section] || []).map(chunkId => {
                                    const chunk = factChunks.find(c => c.id === chunkId);
                                    const isRef = !chunk && String(chunkId).startsWith('ref:');
                                    const isCase = !chunk && String(chunkId).startsWith('case:');
                                    const chipColor = chunk ? (chunk.type === 'score' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700') : isRef ? 'bg-amber-100 text-amber-800' : isCase ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600';
                                    const chipLabel = chunk ? `${chunk.source}:${(chunk.field || '').substring(0, 15)}` : isRef ? '📖 ' + rwReferenceLabel(chunkId).substring(0, 40) : isCase ? '📁 ' + rwReferenceLabel(chunkId).substring(0, 40) : chunkId.substring(0, 8);
                                    return h('button', { type: 'button', key: chunkId, 'aria-label': rwFmt(__alloT('report_writer.aria_show_evidence', 'Show evidence {chipLabel}'), { chipLabel }),
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
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(7) }, ('← ' + __alloT('report_writer.blueprint', 'Blueprint'))),
                    h('button', { 'aria-label': __alloT('report_writer.aria_go_to_accuracy_dashboard', 'Go to accuracy dashboard'), className: `px-4 py-2 text-xs font-medium rounded-lg transition-colors ${Object.keys(reportSections).length > 0 ? 'bg-violet-600 text-white hover:bg-violet-700' : 'bg-slate-200 text-slate-600 cursor-not-allowed'}`,
                        disabled: Object.keys(reportSections).length === 0, onClick: () => { setCurrentStep(9); if (!auditIsCurrent) runAccuracyCheck(); }
                    }, (__alloT('report_writer.next_accuracy_check', 'Next: Accuracy Check') + ' →'))
                )
            ),
            // ═══ STEP 9: Accuracy Dashboard ═══
            currentStep === 9 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-3' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('🎯 ' + __alloT('report_writer.accuracy_dashboard', 'Accuracy Dashboard'))),
                h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.full_coverage_dual_pass_verification_checks', 'Full-coverage dual-pass verification checks every report section against immutable fact chunks. Empty or unparseable responses are treated as inconclusive.')),
                checking ? h('div', { className: 'text-center py-8', role: 'status', 'aria-live': 'polite' },
                    h('div', { className: 'inline-block motion-reduce:animate-none w-8 h-8 border-2 border-violet-300 border-t-violet-600 rounded-full' + (reducedMotion ? '' : ' animate-spin') }),
                    h('p', { className: 'text-xs text-slate-600 mt-3' }, genProgress || __alloT('report_writer.running_accuracy_audit_against_fact_chunks', 'Running accuracy audit against fact chunks...')),
                    h('div', { className: 'mt-3' }, stopButton('sections', __alloT('report_writer.stop_accuracy_check', 'Stop the accuracy check')))
                ) : h('div', { className: 'space-y-3' },
                    accuracyResults.length > 0 && !auditIsCurrent && h('div', { className: 'rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-[11px] text-amber-800', role: 'status' },
                        __alloT('report_writer.these_findings_belong_to_an_earlier', 'These findings belong to an earlier report state. Rerun the full audit before relying on or copying them.')
                    ),
                    // Summary bar
                    accuracyResults.length > 0 && h('div', { className: 'flex items-center gap-4 bg-slate-50 rounded-lg p-3' },
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-green-600' }, accuracyResults.filter(r => r.status === 'verified').length),
                            h('p', { className: 'text-[11px] text-slate-600' }, ('🟢 ' + __alloT('report_writer.verified_2', 'Verified')))
                        ),
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-amber-500' }, accuracyResults.filter(r => r.status === 'unsourced').length),
                            h('p', { className: 'text-[11px] text-slate-600' }, ('🟡 ' + __alloT('report_writer.unsourced', 'Unsourced')))
                        ),
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-red-600' }, accuracyResults.filter(r => r.status === 'contradicts').length),
                            h('p', { className: 'text-[11px] text-slate-600' }, ('🔴 ' + __alloT('report_writer.contradicts', 'Contradicts')))
                        ),
                        h('div', { className: 'text-center' },
                            h('p', { className: 'text-lg font-bold text-purple-600' }, accuracyResults.filter(r => r.status === 'discrepancy').length),
                            h('p', { className: 'text-[11px] text-slate-600' }, ('⚠️ ' + __alloT('report_writer.discrepancy', 'Discrepancy')))
                        ),
                        h('div', { className: 'ms-auto text-center' },
                            h('p', { className: 'text-lg font-bold text-violet-700' }, `${accuracyResults.length > 0 ? Math.round((accuracyResults.filter(r => r.status === 'verified').length / accuracyResults.length) * 100) : 0}%`),
                            h('p', { className: 'text-[11px] text-slate-600' }, __alloT('report_writer.accuracy', 'Accuracy'))
                        ),
                        h('button', { disabled: sectionsBusy, 'aria-label': __alloT('report_writer.aria_re_check_accuracy', 'Re-check accuracy'), className: 'px-3 py-1 bg-violet-100 text-violet-700 text-[11px] rounded-lg hover:bg-violet-200 disabled:opacity-50', onClick: runAccuracyCheck }, ('🔄 ' + __alloT('report_writer.re_check', 'Re-check'))),
                        // Phase 4c: standalone audit-summary copy, available right here on the dashboard
                        // so the clinician can share findings with a supervisor without leaving the page.
                        accuracyResults.length > 0 && h('button', {
                            'aria-label': __alloT('report_writer.aria_copy_audit_summary', 'Copy audit summary'),
                            title: __alloT('report_writer.title_copy_a_text_summary_of_all', 'Copy a text summary of all findings grouped by provenance (Python / LLM passes)'),
                            className: 'px-3 py-1 bg-fuchsia-100 text-fuchsia-700 text-[11px] rounded-lg hover:bg-fuchsia-200',
                            onClick: copyAuditSummary
                        }, ('📋 ' + __alloT('report_writer.copy_audit', 'Copy Audit')))
                    ),
                    // Claim-by-claim results
                    accuracyResults.length > 0 && h('div', { className: 'space-y-1 max-h-[350px] overflow-y-auto' },
                        accuracyResults.map((r, i) =>
                            h('div', { key: i, className: `flex items-start gap-2 px-3 py-2 rounded-lg text-[11px] border ${r.status === 'verified' ? 'bg-green-50 border-green-200' : r.status === 'unsourced' ? 'bg-amber-50 border-amber-200' : r.status === 'discrepancy' ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}` },
                                h('span', { className: 'text-sm flex-shrink-0 mt-0.5' }, r.status === 'verified' ? '🟢' : r.status === 'unsourced' ? '🟡' : r.status === 'discrepancy' ? '\u26A0\uFE0F' : '🔴'),
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('p', { className: 'font-medium text-slate-800 break-words' }, r.claim),
                                    h('p', { className: 'text-slate-600 mt-0.5' }, r.explanation || ''),
                                    r.confidence && h('span', { className: 'inline-block mt-0.5 text-[11px] px-1.5 py-0.5 rounded-full ' + (r.confidence === 'high' ? 'bg-green-100 text-green-700' : r.confidence === 'needs-review' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600') }, r.confidence === 'high' ? __alloT('report_writer.high_confidence', 'High Confidence') : r.confidence === 'needs-review' ? __alloT('report_writer.needs_review', 'Needs Review') : __alloT('report_writer.medium', 'Medium')),
                                    // Phase 4: Provenance chip — distinguishes Python (deterministic) from
                                    // LLM-A/B (semantic). Tells the clinician at-a-glance how the finding was reached.
                                    (function() {
                                        const src = r.auditSource || '';
                                        const chip = (label, cls, title) => h('span', { title, className: 'inline-block mt-0.5 ms-1 text-[11px] px-1.5 py-0.5 rounded-full ' + cls }, label);
                                        if (src === 'python')                   return chip('🐍 Python',      'bg-fuchsia-100 text-fuchsia-700', 'Deterministic check — score classification, math, or fact-chunk lookup');
                                        if (src === 'self-healed')              return chip('✨ Self-healed', 'bg-emerald-100 text-emerald-700', 'Was flagged as a contradiction; fixed by an automated regeneration pass');
                                        if (src === 'dual-pass-agree')          return chip('🤝 Dual-Pass',   'bg-indigo-100 text-indigo-700',   'Both LLM audit passes (Claim Verifier + Contradiction Hunter) agreed');
                                        if (src === 'dual-pass-disagree')       return chip('⚠️ LLM Conflict', 'bg-rose-100 text-rose-700', 'The two LLM audit passes disagreed — review carefully');
                                        if (src === 'dual-pass-minor-disagree') return chip('~ Minor diff',   'bg-amber-100 text-amber-700',     'Minor disagreement between LLM passes');
                                        if (src === 'single-pass')              return chip('🔍 Pass A',      'bg-slate-100 text-slate-600',     'Seen only by the Claim Verifier pass');
                                        if (src === 'pass-b-only')              return chip('🔍 Pass B',      'bg-slate-100 text-slate-600',     'Seen only by the Contradiction Hunter pass');
                                        if (src === 'post-fix-verification')    return chip('🔁 Re-checked',  'bg-sky-100 text-sky-700',         'Re-verified after self-heal regeneration');
                                        return null;
                                    })()
                                )
                            )
                        )
                    ),
                    accuracyResults.length === 0 && h('div', { className: 'text-center py-8', role: 'status', 'aria-live': 'polite' },
                        h('p', { className: 'text-slate-600 text-xs' }, auditStatus === 'inconclusive' ? __alloT('report_writer.the_audit_was_inconclusive_review_the', 'The audit was inconclusive. Review the provider response and rerun it.') : auditStatus === 'failed' ? __alloT('report_writer.the_audit_failed_resolve_the_error', 'The audit failed. Resolve the error and rerun it.') : __alloT('report_writer.no_accuracy_results_yet', 'No accuracy results yet')),
                        h('button', { disabled: sectionsBusy, 'aria-label': __alloT('report_writer.aria_run_accuracy_check', 'Run accuracy check'), className: 'mt-2 px-4 py-2 bg-violet-600 text-white text-xs rounded-lg disabled:opacity-50', onClick: runAccuracyCheck }, ('🎯 ' + __alloT('report_writer.run_accuracy_check', 'Run Accuracy Check')))
                    )
                ),
                h('div', { className: 'flex justify-between pt-2' },
                    h('button', { className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(8) }, ('← ' + __alloT('report_writer.report_2', 'Report'))),
                    h('button', { 'aria-label': __alloT('report_writer.aria_next_export', 'Next: Export'), className: 'px-4 py-2 bg-violet-600 text-white text-xs font-medium rounded-lg hover:bg-violet-700', onClick: () => setCurrentStep(10) }, (__alloT('report_writer.next_export', 'Next: Export') + ' →'))
                )
            ),
            // ═══ STEP 10: Export ═══
            currentStep === 10 && h('div', { className: 'bg-white rounded-xl p-4 border border-slate-400 space-y-3' },
                h('h3', { tabIndex: -1, 'data-rw-step-heading': 'true', className: 'text-sm font-bold text-slate-800 flex items-center gap-2' }, ('📥 ' + __alloT('report_writer.export_save', 'Export & Save'))),
                // Progress-monitoring trendline preview (IEP packet) — same SVG the print output embeds.
                (rtiTrendSeries && rtiTrendSeries.length) ? h('div', { className: 'rounded-lg p-3 border border-emerald-200 bg-emerald-50' },
                    h('div', { className: 'text-[11px] font-bold text-emerald-800 mb-1' }, ('📈 ' + __alloT('report_writer.progress_monitoring_trendlines_embedded_in_the', 'Progress-monitoring trendlines (embedded in the printed packet)'))),
                    h('div', { className: 'bg-white rounded overflow-x-auto p-1', dangerouslySetInnerHTML: { __html: _rwTrendSvg(rtiTrendSeries) } })
                ) : null,
                // Accuracy summary
                h('div', { className: `rounded-lg p-3 border ${formalExportReady ? 'bg-green-50 border-green-200' : auditStatus === 'blocked' || auditStatus === 'failed' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`, role: 'status', 'aria-live': 'polite' },
                    h('p', { className: `text-xs font-medium ${formalExportReady ? 'text-green-700' : auditStatus === 'blocked' || auditStatus === 'failed' ? 'text-red-700' : 'text-amber-800'}` },
                        formalExportReady
                            ? ('✅ ' + __alloT('report_writer.current_report_audited_blocking_findings_resolve', 'Current report audited, blocking findings resolved, and clinician attestation complete.'))
                            : !auditIsCurrent
                                ? ('⚠️ ' + __alloT('report_writer.the_current_report_has_not_completed', 'The current report has not completed a full accuracy audit. Formal copy and print are locked.'))
                                : !psycheckIsCurrent
                                    ? ('⚠️ ' + __alloT('report_writer.run_the_inline_deterministic_score_verifier', 'Run the inline deterministic score verifier on the current report before attesting.'))
                                    : psycheckBlockingCount > 0
                                        ? ('⚠️ ' + rwFmt(__alloT('report_writer.deterministic_score_discrepancy_ies_remain_corre', '{psycheckBlockingCount} deterministic score discrepancy(ies) remain. Correct the report and verify again.'), { psycheckBlockingCount }))
                                        : auditStatus === 'blocked'
                                    ? ('⚠️ ' + rwFmt(__alloT('report_writer.blocking_finding_s_remain_resolve_them', '{count} blocking finding(s) remain. Resolve them and rerun the audit.'), { count: blockingAccuracyFindings.length }))
                                    : auditStatus === 'inconclusive' || auditStatus === 'failed'
                                        ? ('⚠️ ' + __alloT('report_writer.the_audit_did_not_complete_successfully', 'The audit did not complete successfully. Formal copy and print are locked.'))
                                        : leftovers.length > 0
                                            ? ('⚠️ ' + rwFmt(__alloT('report_writer.placeholders_block', '{count} placeholder(s) are still in the report. Replace them below before attesting.'), { count: leftovers.length }))
                                            : ('⚠️ ' + __alloT('report_writer.accuracy_audit_passed_complete_the_clinician', 'Accuracy audit passed. Complete the clinician attestation to unlock formal copy and print.'))
                    )
                ),
                // Placeholders left by redaction or generation, with the fixes that are safe.
                leftovers.length > 0 && h('div', { className: 'rounded-lg border border-amber-300 bg-amber-50 p-3 text-[11px] text-amber-900 space-y-1', role: 'region', 'aria-labelledby': 'rw-placeholders-title' },
                    h('p', { id: 'rw-placeholders-title', className: 'font-bold' }, __alloT('report_writer.placeholders_title', 'Placeholders to replace before the report is final')),
                    h('p', null, __alloT('report_writer.placeholders_help', 'Names and identifiers were replaced before any text went to the AI, and it wrote with those tokens. [Student] is filled in automatically; these are not.')),
                    h('ul', { className: 'list-disc list-inside space-y-1' },
                        Array.from(new Set(leftovers.map(l => l.token))).map(token => {
                            const where = leftovers.filter(l => l.token === token);
                            const role = (token.match(/^\[(.+)\]$/) || [])[1];
                            const named = role ? (reportPeople || []).filter(x => String((x && x.role) || '') === role && String((x && x.name) || '').trim()) : [];
                            const machine = where[0].machine;
                            return h('li', { key: token },
                                h('span', { className: 'font-mono' }, token), ' ',
                                rwFmt(__alloT('report_writer.placeholders_where', 'in {sections}'), { sections: where.map(l => l.section + (l.count > 1 ? ' (' + l.count + ')' : '')).join(', ') }), ' ',
                                named.length === 1 && h('button', { type: 'button', className: 'ms-1 px-2 py-0.5 rounded bg-amber-700 text-white hover:bg-amber-800',
                                    onClick: () => replaceTokenEverywhere(token, named[0].name.trim()) }, rwFmt(__alloT('report_writer.placeholders_use_name', 'Use {name}'), { name: named[0].name.trim() })),
                                machine && h('button', { type: 'button', className: 'ms-1 px-2 py-0.5 rounded bg-amber-700 text-white hover:bg-amber-800', onClick: removeMachineLeftovers }, __alloT('report_writer.placeholders_remove', 'Remove')),
                                !machine && named.length !== 1 && h('span', null, __alloT('report_writer.placeholders_edit_hint', 'Edit the section in Step 8 to replace it.')));
                        })
                    )
                ),
                notExported.length > 0 && h('p', { className: 'text-[11px] text-slate-700', role: 'status' },
                    rwFmt(__alloT('report_writer.not_exported', 'Written but not in the export (disabled or not in the blueprint): {sections}.'), { sections: notExported.join(', ') })),
                translatedReport && translatedFingerprint !== reportFingerprint && h('p', { className: 'text-[11px] text-amber-900', role: 'status' },
                    __alloT('report_writer.translation_stale', 'The translated draft is of an earlier version of the report. Translate again before copying it.')),
                // Unsourced-claim acknowledgement. Shown ONLY when the audit found
                // claims it could not tie to a verified fact. These do not block
                // export outright — some narrative connective tissue is legitimately
                // unsourced — but the clinician must see the specific sentences and
                // say so before attesting, rather than signing past a count in a
                // panel they may never have opened.
                unsourcedFindings.length > 0 && auditIsCurrent && h('div', {
                    className: `rounded-lg p-3 border ${unsourcedAcknowledged ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-300'}`
                },
                    h('p', { className: 'text-[11px] font-bold text-amber-900 mb-1' },
                        rwFmt(__alloT('report_writer.claim_s_could_not_be_traced', '{count} claim(s) could not be traced to a verified fact'), { count: unsourcedFindings.length })),
                    h('ul', { className: 'mb-2 max-h-32 overflow-y-auto space-y-1' },
                        unsourcedFindings.slice(0, 12).map((r, i) => h('li', {
                            key: i, className: 'text-[11px] text-slate-700 leading-snug'
                        }, (r.section ? `[${r.section}] ` : '') + String(r.claim || '').substring(0, 160)))
                    ),
                    unsourcedFindings.length > 12 && h('p', { className: 'text-[10px] italic text-slate-600 mb-2' },
                        rwFmt(__alloT('report_writer.and_more_see_the_audit_results', '…and {value} more — see the audit results list above.'), { value: unsourcedFindings.length - 12 })),
                    h('label', { className: 'flex items-start gap-2 cursor-pointer' },
                        h('input', {
                            type: 'checkbox', checked: unsourcedAcknowledged,
                            'aria-describedby': 'rw-unsourced-help',
                            onChange: (e) => setUnsourcedAcknowledged(e.target.checked),
                            className: 'mt-0.5 rounded border-slate-300'
                        }),
                        h('span', { className: 'text-[11px] text-slate-700 leading-relaxed' },
                            h('strong', { id: 'rw-unsourced-help' }, (__alloT('report_writer.unsourced_claims_reviewed', 'Unsourced claims reviewed:') + ' ')),
                            __alloT('report_writer.i_have_read_each_statement_listed', 'I have read each statement listed above and confirm it is either clinically appropriate as written or has been corrected.')
                        )
                    )
                ),
                // Clinician attestation
                Object.keys(reportSections).length > 0 && h('div', { className: `rounded-lg p-3 border ${clinicianAttested ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}` },
                    h('label', { className: 'flex items-start gap-2 cursor-pointer' },
                        h('input', { type: 'checkbox', checked: clinicianAttested, disabled: !clinicianCanAttest, 'aria-describedby': 'rw-attestation-help', onChange: (e) => setClinicianAttested(e.target.checked), className: 'mt-0.5 rounded border-slate-300 text-green-600 focus:ring-green-400 disabled:opacity-50' }),
                        h('span', { className: 'text-[11px] text-slate-700 leading-relaxed' },
                            h('strong', { id: 'rw-attestation-help' }, (__alloT('report_writer.clinician_attestation', 'Clinician Attestation:') + ' ')),
                            __alloT('report_writer.i_have_independently_reviewed_the_assessment', 'I have independently reviewed the assessment data, verified all score entries match protocols, reviewed AI-generated interpretations for clinical accuracy, and I am the licensed professional responsible for this evaluation.')
                        )
                    )
                ),
                // Export buttons
                h('div', { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2' },
                    h('button', { 'aria-label': __alloT('report_writer.aria_export_as_json', 'Export as JSON'), className: 'flex flex-col items-center gap-1 px-3 py-3 bg-violet-50 border border-violet-600 rounded-lg hover:bg-violet-100 transition-colors', onClick: exportJSON },
                        h('span', { className: 'text-lg' }, '💾'),
                        h('span', { className: 'text-[11px] font-medium text-violet-700' }, __alloT('report_writer.save_json', 'Save JSON'))
                    ),
                    // Phase 4c: standalone audit-summary copy. Separate from "Copy Report" so the
                    // clinician can share quality-control findings with a supervisor without
                    // including the full narrative (or vice versa, the formal report stays clean).
                    accuracyResults.length > 0 && h('button', {
                        'aria-label': __alloT('report_writer.aria_copy_audit_summary', 'Copy audit summary'),
                        title: __alloT('report_writer.title_copy_a_text_summary_of_all_2', 'Copy a text summary of all findings grouped by provenance (Python / LLM passes / self-healed)'),
                        className: 'flex flex-col items-center gap-1 px-3 py-3 bg-fuchsia-50 border border-fuchsia-600 rounded-lg hover:bg-fuchsia-100 transition-colors',
                        onClick: copyAuditSummary
                    },
                        h('span', { className: 'text-lg' }, '📊'),
                        h('span', { className: 'text-[11px] font-medium text-fuchsia-700' }, __alloT('report_writer.copy_audit', 'Copy Audit'))
                    ),
                    h('button', { 'aria-label': __alloT('report_writer.aria_copy_reviewed_report_to_clipboard', 'Copy reviewed report to clipboard'), className: `flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-colors ${!formalExportReady ? 'bg-slate-100 border border-slate-400 opacity-60 cursor-not-allowed' : 'bg-indigo-50 border border-indigo-600 hover:bg-indigo-100'}`, onClick: copyFullReport, disabled: !formalExportReady },
                        h('span', { className: 'text-lg' }, '📋'),
                        h('span', { className: 'text-[11px] font-medium text-indigo-700' }, __alloT('report_writer.copy_report', 'Copy Report'))
                    ),
                    h('button', { 'aria-label': __alloT('report_writer.aria_print_report_or_save_as_pdf', 'Print report or save as PDF'), className: `flex flex-col items-center gap-1 px-3 py-3 rounded-lg transition-colors ${!formalExportReady ? 'bg-slate-100 border border-slate-400 opacity-60 cursor-not-allowed' : 'bg-blue-50 border border-blue-600 hover:bg-blue-100'}`, onClick: printReport, disabled: !formalExportReady },
                        h('span', { className: 'text-lg' }, '🖨️'),
                        h('span', { className: 'text-[11px] font-medium text-blue-700' }, __alloT('report_writer.print_pdf', 'Print / PDF'))
                    ),
                    h('button', { 'aria-label': __alloT('report_writer.aria_load_report_json', 'Load report JSON'), className: 'flex flex-col items-center gap-1 px-3 py-3 bg-emerald-50 border border-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors', onClick: () => document.getElementById('rw-import-area')?.focus() },
                        h('span', { className: 'text-lg' }, '📂'),
                        h('span', { className: 'text-[11px] font-medium text-emerald-700' }, __alloT('report_writer.load_json', 'Load JSON'))
                    )
                ),
                // ── Report Translation ──
                Object.keys(reportSections).length > 0 && h('details', { className: 'mt-3 bg-sky-50 rounded-lg border border-sky-200' },
                    h('summary', { className: 'text-xs font-medium text-sky-700 px-3 py-2 cursor-pointer hover:bg-sky-100 rounded-t-lg' }, ('🌏 ' + __alloT('report_writer.translate_report', 'Translate Report'))),
                    h('div', { className: 'px-3 pb-3 space-y-2' },
                        h('p', { className: 'text-[11px] text-sky-600' }, __alloT('report_writer.creates_an_ai_assisted_family_language', 'Creates an AI-assisted family-language draft after common-identifier redaction. A qualified clinician and language reviewer must validate terminology before distribution; copied translations are marked unreviewed.')),
                        h('div', { className: 'flex items-center gap-2' },
                            h('select', { className: 'text-xs border rounded-lg px-2 py-1.5 bg-white flex-1', 'aria-label': __alloT('report_writer.aria_translation_language', 'Translation language'), value: translationLang, onChange: e => setTranslationLang(e.target.value) },
                                ['Spanish', 'French', 'Portuguese', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Arabic', 'Vietnamese', 'Korean', 'Haitian Creole', 'Somali', 'Russian', 'German', 'Japanese', 'Tagalog', 'Hindi', 'Urdu'].map(lang => h('option', { key: lang, value: lang }, lang))
                            ),
                            h('button', { 'aria-label': __alloT('report_writer.aria_translate_report', 'Translate report'), className: `px-4 py-1.5 text-xs font-medium rounded-lg transition-colors ${translating ? 'bg-sky-300 text-sky-600 cursor-wait' : 'bg-sky-700 text-white hover:bg-sky-700'}`,
                                disabled: translating,
                                onClick: translateReport
                            }, translating ? ('⏳ ' + __alloT('report_writer.translating', 'Translating...')) : ('🌏 ' + __alloT('report_writer.translate', 'Translate'))),
                            translating && stopButton('translate', __alloT('report_writer.stop_translating', 'Stop translating'))
                        ),
                        translatedReport && h('div', { className: 'mt-2 space-y-2' },
                            h('div', { className: 'flex items-center justify-between' },
                                h('p', { className: 'text-[11px] font-medium text-sky-700' }, rwFmt(__alloT('report_writer.translated_report', 'Translated Report ({translationLang})'), { translationLang })),
                                h('button', { disabled: translatedFingerprint !== reportFingerprint, 'aria-label': __alloT('report_writer.aria_copy_unreviewed_translated_draft', 'Copy unreviewed translated draft'), className: 'text-[11px] px-2 py-0.5 bg-sky-700 text-white rounded hover:bg-sky-700', onClick: copyTranslatedReport }, ('📋 ' + __alloT('report_writer.copy_draft', 'Copy Draft')))
                            ),
                            h('div', { className: 'bg-white rounded-lg border border-sky-200 p-3 max-h-[300px] overflow-y-auto' },
                                h('pre', { lang: translationMeta.code, dir: translationMeta.dir, 'aria-label': rwFmt(__alloT('report_writer.aria_unreviewed_translated_report_draft', 'Unreviewed {translationLang} translated report draft'), { translationLang }), className: 'text-[11px] text-slate-700 whitespace-pre-wrap font-sans leading-relaxed' }, translatedReport)
                            )
                        )
                    )
                ),
                // Import area
                h('div', { className: 'mt-2' },
                    h('label', { htmlFor: 'rw-import-area', className: 'text-[11px] font-medium text-slate-600 block mb-1' }, __alloT('report_writer.import_json_paste_previously_exported_data', 'Import JSON (paste previously exported data):')),
                    h('textarea', {
                        id: 'rw-import-area', className: 'w-full text-[11px] border rounded-lg px-3 py-2 font-mono resize-none h-20',
                        'aria-label': __alloT('report_writer.aria_import_json_data', 'Import JSON data'),
                        placeholder: __alloT('report_writer.placeholder_paste_json_data_here', 'Paste JSON data here...'), value: importText, onChange: e => setImportText(e.target.value)
                    }),
                    importText.trim() && h('button', { 'aria-label': ('📂 ' + __alloT('report_writer.aria_import_data', 'Import Data')), className: 'mt-1 px-3 py-1 bg-emerald-700 text-white text-[11px] rounded-lg hover:bg-emerald-700', onClick: importJSON }, ('📂 ' + __alloT('report_writer.import_data', 'Import Data')))
                ),
                // ── Saved Reports Gallery ──
                h('div', { className: 'mt-3 bg-violet-50 rounded-lg border border-violet-200 p-3 space-y-2' },
                    h('h4', { className: 'text-xs font-bold text-violet-800 flex items-center gap-1' }, ('📚 ' + __alloT('report_writer.saved_reports', 'Saved Reports'))),
                    h('div', { className: 'rounded-lg border border-violet-200 bg-white p-2 space-y-1' },
                        h('label', { className: 'flex items-center gap-2 text-[11px] font-medium text-slate-700' },
                            h('input', { id: 'rw-persist-device', type: 'checkbox', checked: persistLocally, onChange: event => updatePersistence(event.target.checked) }),
                            __alloT('report_writer.persist_report_writer_data_on_this', 'Persist Report Writer data on this device')
                        ),
                        h('p', { className: 'text-[11px] text-slate-600' }, persistLocally
                            ? __alloT('report_writer.enabled_drafts_saved_reports_references_and', 'Enabled: drafts, saved reports, references, and style guidance are stored unencrypted in this browser profile.')
                            : __alloT('report_writer.session_only_mode_data_is_not', 'Session-only mode: data is not written to persistent browser storage.')),
                        h('button', { type: 'button', className: 'text-[11px] px-2 py-1 rounded bg-red-50 text-red-700 border border-red-300 hover:bg-red-100', onClick: () => {
                            setConfirmationRequest({
                                title: __alloT('report_writer.confirm_clear_stored_title', 'Clear stored clinical data?'),
                                message: __alloT('report_writer.confirm_clear_stored_message', 'This permanently removes Report Writer drafts, saved reports, references, and style guidance stored in this browser profile. The currently open session will remain visible.'),
                                confirmLabel: __alloT('report_writer.confirm_clear_stored', 'Clear stored data'),
                                onConfirm: clearStoredClinicalData
                            });
                        } }, __alloT('report_writer.clear_stored_clinical_data', 'Clear stored clinical data'))
                    ),
                    h('div', { className: 'flex items-center gap-2' },
                        h('input', { type: 'text', className: 'flex-1 text-[11px] border rounded-lg px-2 py-1', placeholder: __alloT('report_writer.placeholder_report_name_optional', 'Report name (optional)...'), 'aria-label': __alloT('report_writer.aria_report_name', 'Report name'), value: saveReportName, onChange: e => setSaveReportName(e.target.value) }),
                        h('button', { className: 'px-3 py-1 bg-violet-600 text-white text-[11px] font-medium rounded-lg hover:bg-violet-700 transition-colors whitespace-nowrap', onClick: saveReportToGallery }, ('💾 ' + __alloT('report_writer.save_report', 'Save Report'))),
                        h('button', { 'aria-label': __alloT('report_writer.aria_start_a_new_report', 'Start a new report'), className: 'px-3 py-1 bg-red-100 text-red-700 text-[11px] font-medium rounded-lg hover:bg-red-200 transition-colors whitespace-nowrap', onClick: () => {
                            setConfirmationRequest({
                                title: __alloT('report_writer.confirm_new_report_title', 'Start a new report?'),
                                message: __alloT('report_writer.confirm_new_report_message', 'All unsaved case-specific data in the current session will be cleared. This action cannot be undone.'),
                                confirmLabel: __alloT('report_writer.confirm_new_report', 'Start new report'),
                                onConfirm: clearDraft
                            });
                        } }, ('🗑️ ' + __alloT('report_writer.new_report', 'New Report')))
                    ),
                    savedReports.length > 0 && h('div', { className: 'space-y-1 max-h-40 overflow-y-auto mt-1' },
                        savedReports.map(r =>
                            h('div', { key: r.id, className: 'flex items-center justify-between px-2 py-1.5 bg-white rounded border border-violet-100 text-[11px]' },
                                h('div', { className: 'flex-1 min-w-0' },
                                    h('span', { className: 'font-medium text-slate-800 truncate block' }, r.name),
                                    h('span', { className: 'text-slate-600' }, rwFmt(__alloT('report_writer.scores_2', '{value} • {value2} scores'), { value: new Date(r.savedAt).toLocaleDateString(), value2: r.scoreEntries?.length || 0 }))
                                ),
                                h('div', { className: 'flex gap-1 ms-2' },
                                    h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_load_saved_report_named', 'Load saved report: {name}'), { name: r.name }), className: 'px-2 py-0.5 bg-violet-100 text-violet-700 rounded hover:bg-violet-200', onClick: () => loadSavedReport(r) }, __alloT('report_writer.load', 'Load')),
                                    h('button', { 'aria-label': rwFmt(__alloT('report_writer.aria_delete_saved_report_named', 'Delete saved report: {name}'), { name: r.name }), className: 'px-2 py-0.5 bg-red-50 text-red-700 rounded hover:bg-red-100', onClick: () => deleteSavedReport(r.id) }, '✕')
                                )
                            )
                        )
                    ),
                    savedReports.length === 0 && h('p', { className: 'text-[11px] text-violet-700 text-center py-2' }, __alloT('report_writer.no_saved_reports_yet_use_save', 'No saved reports yet. Use "Save Report" to keep a copy.'))
                ),
                // Quick report preview
                Object.keys(reportSections).length > 0 && h('details', { className: 'mt-2 bg-slate-50 rounded-lg border border-slate-400' },
                    h('summary', { className: 'text-xs font-medium text-slate-700 px-3 py-2 cursor-pointer hover:bg-slate-100 rounded-lg' }, ('📄 ' + __alloT('report_writer.preview_full_report', 'Preview Full Report'))),
                    h('div', { className: 'px-4 py-3 space-y-3 max-h-[400px] overflow-y-auto' },
                        h('h2', { className: 'text-sm font-bold text-center text-slate-800' }, reportTitle),
                        h('p', { className: 'text-[11px] text-center text-slate-600' }, `Student: ${effectiveStudentName || '[Student]'} | Age: ${studentAge || 'N/A'} | Grade: ${studentGrade || 'N/A'} | Date: ${new Date().toLocaleDateString()}`),
                        h('hr', { className: 'border-slate-200' }),
                        Object.entries(exportSections).map(([section, text]) =>
                            h('div', { key: section },
                                h('h3', { className: 'text-xs font-bold text-indigo-700 mb-1' }, section),
                                h('p', { className: 'text-[11px] text-slate-700 leading-relaxed whitespace-pre-wrap' }, text.replace(/\[Student\]/g, () => effectiveStudentName || '[Student]'))
                            )
                        )
                    )
                ),
                h('div', { className: 'flex justify-start pt-2' },
                    h('button', { 'aria-label': __alloT('report_writer.aria_accuracy', 'Accuracy'), className: 'px-4 py-2 bg-slate-100 text-slate-600 text-xs rounded-lg hover:bg-slate-200', onClick: () => setCurrentStep(9) }, ('← ' + __alloT('report_writer.accuracy', 'Accuracy')))
                )
            )
        );
    };

    // ─── Module Registration ────────────────────────────────────────────
    window.AlloModules = window.AlloModules || {};
    window.AlloModules.ReportWriterUtils = Object.freeze({
        normalizeScoreType: normalizeReportScoreType,
        classifyDisplayScore,
        descriptorScales: RW_DESCRIPTOR_SCALES,
        parseScoreReport: rwParseScoreReport,
        staleScoreFacts: rwStaleScoreFacts,
        leftoverPlaceholders: rwLeftoverPlaceholders,
        orderedSections: rwOrderedSections,
        backgroundSourceText: rwBackgroundSourceText,
        mergeBackgroundFacts: rwMergeBackgroundFacts,
        styleSampleForAI: rwStyleSampleForAI,
        identityNotes: rwIdentityNotes,
        assessmentPresets: ASSESSMENT_PRESETS,
        displayPercentile: rwDisplayPercentile,
        percentileText: rwPercentileText,
        scoreEntryProblem: rwScoreEntryProblem,
        scoreFactText: rwScoreFactText,
        scoreTableText: rwScoreTableText,
        psycheckSources: rwPsycheckSources,
        rankGenerationPasses,
        referencePassages: rwReferencePassages,
        referencePromptBlock: rwReferencePromptBlock,
        markReferenceHeadings: rwMarkReferenceHeadings,
        expandClinicalQuery: rwExpandClinicalQuery,
        unsourcedQuotes: rwUnsourcedQuotes,
        referencesConsulted: rwReferencesConsulted,
        referencesConsultedText: rwReferencesConsultedText,
        buildReferenceContext,
        validateReportPayload,
        validateDiscrepancyPayload,
        getTranslationLanguageMeta,
        buildReportPrintHtml,
        escapeHtml,
        renderTrendSvg: _rwTrendSvg
    });
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
        const dialogRef = useRef(null);
        const closeButtonRef = useRef(null);
        const previousFocusRef = useRef(null);
        const closeDialog = () => { if (typeof onClose === 'function') onClose(); };
        // Escape, a click outside the dialog and the close button all used to
        // close at once, and in session-only mode that discards the report.
        const workStateRef = useRef({ unsaved: false });
        const [closeAsk, setCloseAsk] = useState(null);
        const closeAskRef = useRef(null);
        const keepWorkingRef = useRef(null);
        const requestClose = () => {
            const work = workStateRef.current || {};
            if (work.unsaved) setCloseAsk({ caseDocuments: !!work.caseDocuments, persisted: !!work.persisted });
            else closeDialog();
        };
        useEffect(() => {
            const surface = dialogRef.current;
            if (!closeAsk || !surface) return undefined;
            surface.setAttribute('inert', '');
            surface.setAttribute('aria-hidden', 'true');
            if (keepWorkingRef.current) keepWorkingRef.current.focus();
            return () => {
                surface.removeAttribute('inert');
                surface.removeAttribute('aria-hidden');
                if (closeButtonRef.current && typeof closeButtonRef.current.focus === 'function') closeButtonRef.current.focus();
            };
        }, [closeAsk]);
        const handleCloseAskKeyDown = (event) => {
            event.stopPropagation();
            if (event.key === 'Escape') { event.preventDefault(); setCloseAsk(null); return; }
            if (event.key !== 'Tab' || !closeAskRef.current) return;
            const buttons = Array.from(closeAskRef.current.querySelectorAll('button'));
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        useEffect(() => {
            previousFocusRef.current = document.activeElement;
            // Ref-counted shared body scroll lock — see window.__alloScrollLockState.
            const scrollLock = window.__alloScrollLockState || (window.__alloScrollLockState = { count: 0, prev: '' });
            if (++scrollLock.count === 1) { scrollLock.prev = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
            const timer = setTimeout(() => {
                if (closeButtonRef.current && typeof closeButtonRef.current.focus === 'function') closeButtonRef.current.focus();
                else if (dialogRef.current && typeof dialogRef.current.focus === 'function') dialogRef.current.focus();
            }, 0);
            return () => {
                clearTimeout(timer);
                scrollLock.count = Math.max(0, scrollLock.count - 1);
                if (scrollLock.count === 0) document.body.style.overflow = scrollLock.prev;
                const previous = previousFocusRef.current;
                if (previous && document.contains(previous) && typeof previous.focus === 'function') previous.focus();
            };
        }, []);
        const handleDialogKeyDown = (event) => {
            if (event.key === 'Escape') {
                event.preventDefault();
                requestClose();
                return;
            }
            if (event.key !== 'Tab' || !dialogRef.current) return;
            const focusable = Array.from(dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'))
                .filter(element => element.getAttribute('aria-hidden') !== 'true' && element.offsetParent !== null);
            if (focusable.length === 0) {
                event.preventDefault();
                dialogRef.current.focus();
                return;
            }
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };

        // Extract BehaviorLens data if provided (for cross-module data bridging)
        const blAbcEntries = behaviorLensData?.abcEntries || [];
        const blObsSessions = behaviorLensData?.observationSessions || [];
        const blAiAnalysis = behaviorLensData?.aiAnalysis || null;
        const blStudentProfile = behaviorLensData?.studentProfile || null;

        return h('div', { className: 'fixed inset-0 z-[9999] bg-black/50 flex items-center justify-center p-4',
            onClick: (e) => { if (e.target === e.currentTarget && !closeAsk) requestClose(); }
        },
            closeAsk && h('div', {
                ref: closeAskRef, role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': 'rw-close-title', 'aria-describedby': 'rw-close-description',
                onKeyDown: handleCloseAskKeyDown, onClick: (e) => e.stopPropagation(),
                className: 'fixed z-[10001] w-full max-w-md rounded-xl bg-white p-5 shadow-2xl border border-slate-300'
            },
                h('h2', { id: 'rw-close-title', className: 'text-base font-bold text-slate-900' }, __alloT('report_writer.close_confirm_title', 'Close the Report Writer?')),
                h('p', { id: 'rw-close-description', className: 'mt-2 text-sm leading-relaxed text-slate-700' },
                    closeAsk.persisted
                        ? __alloT('report_writer.close_confirm_case_documents', 'The report is stored on this device, but case documents never are: closing discards them.')
                        : __alloT('report_writer.close_confirm_session', 'This report is kept only while the Report Writer is open. Closing it discards its scores, notes and draft. To keep them, use Save JSON in Export & Save, or turn on device storage there.')
                            + (closeAsk.caseDocuments ? ' ' + __alloT('report_writer.close_confirm_case_documents_too', 'Case documents are never stored either.') : '')),
                h('div', { className: 'mt-5 flex justify-end gap-2' },
                    h('button', { ref: keepWorkingRef, type: 'button', className: 'rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-100', onClick: () => setCloseAsk(null) }, __alloT('report_writer.close_keep_working', 'Keep working')),
                    h('button', { type: 'button', className: 'rounded-lg bg-red-700 px-3 py-2 text-sm font-medium text-white hover:bg-red-800', onClick: () => { setCloseAsk(null); closeDialog(); } }, __alloT('report_writer.close_discard', 'Close and discard'))
                )
            ),
            h('div', {
                id: 'rw-dialog-surface',
                ref: dialogRef,
                role: 'dialog',
                'aria-modal': 'true',
                'aria-labelledby': 'rw-dialog-title',
                tabIndex: -1,
                onKeyDown: handleDialogKeyDown,
                className: 'bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto p-6 relative'
            },
                h('h1', { id: 'rw-dialog-title', className: 'sr-only' }, __alloT('report_writer.report_writer', 'Report Writer')),
                h('button', { ref: closeButtonRef, type: 'button', 'aria-label': (typeof t === 'function' && t('toasts.close_report_writer')) || __alloT('report_writer.aria_close_report_writer', 'Close report writer'), className: 'absolute top-4 right-4 text-slate-600 hover:text-slate-600 text-xl', onClick: requestClose
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
                    addToast,
                    workStateRef
                })
            )
        );
    };

    debugLog("ReportWriter module registered ✅");
})();
