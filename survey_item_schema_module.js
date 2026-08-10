/*
 * AlloFlow survey item schema — one representation for a survey item, with
 * adapters to the three that already exist.
 *
 * WHY THIS EXISTS
 *
 * A Likert item is currently defined three separate times, incompatibly:
 *
 *   Research Suite (student_analytics_module.js)
 *     { id, text, type: 'likert', labels: [{text, image}], options: [] }
 *     Per-step labels, each able to carry an AI-generated image — the only
 *     one of the three that can serve a pre-reader.
 *
 *   Quiz poll mode (AlloFlowANTI.txt + quiz_mode_strategies.js)
 *     { itemType: 'likert', scale: {steps, lowLabel, highLabel},
 *       options: ['1', '2', ... 'N'] }
 *     ENDPOINTS ONLY. Numeric options are synthesized so the wire format
 *     stays uniform with MCQ. Steps clamped to [3, 7].
 *
 *   Share & Collect mailbox (apps_script/session_mailbox/Code.gs)
 *     { type: 'rating', prompt, minValue, maxValue, labels }
 *     A numeric range, 1-10, labels optional.
 *
 * This module does NOT replace any of them. It gives them a common currency
 * so an instrument authored in one place can be delivered by another, and so
 * the next surface that needs a rating input has something to adopt instead
 * of inventing a fourth shape.
 *
 * THE STEP-COUNT CONFLICT, AND WHY IT IS A PREDICATE
 *
 * Quiz clamps to [3, 7] because 2 steps is degenerate and more than 7 hurts
 * test-retest reliability. The mailbox permits 1-10 because a quick "rate
 * this 1-10" is not research and should not be forced to justify itself.
 * Both are right for their own surface. So the canonical item carries the
 * author's real step count, and `researchValidity()` reports whether it
 * would survive as a measurement instrument. The constraint is asked, not
 * silently applied — a clamp hidden in a converter would quietly rewrite an
 * author's instrument, which is the one thing a schema layer must never do.
 */
(function registerSurveyItemSchema(root, factory) {
    const api = factory();
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    if (root) {
        root.AlloModules = root.AlloModules || {};
        // The loader asserts AlloModules[<name>] is set after a fetch; missing
        // this is what makes a healthy module report as a failed load.
        root.AlloModules.SurveyItemSchema = api;
    }
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : null), function createSurveyItemSchema() {
    'use strict';

    const VERSION = 'alloflow-survey-item/v1';

    // Research's own reliability window, from quiz_mode_strategies.js.
    const RESEARCH_MIN_STEPS = 3;
    const RESEARCH_MAX_STEPS = 7;
    // A single Likert tick is not reliable enough to drive a decision; the
    // router already refuses aggregations shorter than this.
    const RESEARCH_MIN_ITEMS = 2;

    const TYPES = ['likert', 'choice', 'freetext', 'numeric'];

    function text(value, limit) {
        if (value === null || value === undefined) return '';
        return String(value).replace(/\s+/g, ' ').trim().slice(0, limit || 240);
    }

    function isObject(value) {
        return value !== null && typeof value === 'object' && !Array.isArray(value);
    }

    // A cell is a label or an option: text plus an optional image data URL.
    // Accepts a bare string because the Research Suite editor tolerates one.
    function cell(value) {
        if (typeof value === 'string') return { text: text(value, 120), image: null };
        if (!isObject(value)) return { text: '', image: null };
        return {
            text: text(value.text != null ? value.text : value.label, 120),
            image: typeof value.image === 'string' && value.image ? value.image : null
        };
    }

    // Likert labels are POSITIONAL — index i is step i+1 — so a blank one is
    // meaningful data ("Quiz never stored a middle label") and must keep its
    // slot. Options are a list, where an empty entry is just noise.
    function cells(value, keepEmpty) {
        const out = (Array.isArray(value) ? value : []).map(cell);
        return keepEmpty ? out : out.filter((c) => c.text || c.image);
    }

    /**
     * The canonical item.
     *
     * { id, text, type, steps, labels[], options[], min, max, required }
     *
     * `labels` are per-step for a likert; `options` are the choices for a
     * choice item. Both are cells, so an image survives wherever the target
     * surface can carry one.
     */
    function normalizeItem(raw, index) {
        const source = isObject(raw) ? raw : {};
        const type = TYPES.indexOf(source.type) >= 0 ? source.type : 'likert';
        const item = {
            id: text(source.id, 60) || ('q' + ((index || 0) + 1)),
            text: text(source.text != null ? source.text : source.prompt, 400),
            type: type,
            required: source.required === true
        };
        if (type === 'likert') {
            const labels = cells(source.labels, true);
            const declared = parseInt(source.steps, 10);
            // Labels are the stronger signal: if an author wrote five of them,
            // the scale has five steps whatever a stale `steps` field says.
            item.steps = labels.length >= 2 ? labels.length
                : (isFinite(declared) && declared >= 2 ? declared : 5);
            item.labels = labels;
        } else if (type === 'choice') {
            item.options = cells(source.options);
        } else if (type === 'numeric') {
            const min = Number(source.min);
            const max = Number(source.max);
            item.min = isFinite(min) ? min : null;
            item.max = isFinite(max) ? max : null;
        }
        return item;
    }

    function normalizeInstrument(raw) {
        const list = Array.isArray(raw) ? raw : (raw == null ? [] : [raw]);
        return list.map(normalizeItem).filter((item) => item.text);
    }

    /**
     * Would this survive as a measurement instrument? Reports rather than
     * enforces, so a non-research rating is not forced to justify itself.
     */
    function researchValidity(items) {
        const list = normalizeInstrument(items);
        const problems = [];
        const likert = list.filter((item) => item.type === 'likert');
        for (const item of likert) {
            if (item.steps < RESEARCH_MIN_STEPS) {
                problems.push({ id: item.id, code: 'steps-too-few', detail: item.steps + ' steps; 2 or fewer is degenerate' });
            } else if (item.steps > RESEARCH_MAX_STEPS) {
                problems.push({ id: item.id, code: 'steps-too-many', detail: item.steps + ' steps hurts test-retest reliability' });
            }
            if (item.labels.length && item.labels.length !== item.steps) {
                problems.push({ id: item.id, code: 'label-count-mismatch', detail: item.labels.length + ' labels for ' + item.steps + ' steps' });
            }
        }
        // The rule the router already enforces defensively: one tick is not a
        // measurement. This is about the SCALE, so only likert items count.
        if (likert.length && likert.length < RESEARCH_MIN_ITEMS) {
            problems.push({ id: null, code: 'single-item-scale', detail: 'a single Likert item is not reliable enough to drive a decision' });
        }
        return { ok: problems.length === 0, problems: problems, itemCount: list.length, likertCount: likert.length };
    }

    // ── Research Suite (student_analytics_module.js) ──
    // The richest of the three: per-step labels carrying images. Canonical
    // form is a superset, so this round-trips without loss.
    function fromResearchSuite(questions) {
        return normalizeInstrument((Array.isArray(questions) ? questions : []).map((q) => {
            const source = isObject(q) ? q : {};
            const kind = source.type === 'mcq' ? 'choice'
                : (source.type === 'freetext' || source.type === 'numeric') ? source.type
                : 'likert';
            return {
                id: source.id,
                text: source.text,
                type: kind,
                labels: kind === 'likert' ? source.labels : undefined,
                options: kind === 'choice' ? (source.options && source.options.length ? source.options : source.labels) : undefined
            };
        }));
    }

    function toResearchSuite(items) {
        return normalizeInstrument(items).map((item) => {
            const out = { id: item.id, text: item.text, type: item.type === 'choice' ? 'mcq' : item.type };
            if (item.type === 'likert') {
                out.labels = item.labels.length ? item.labels.map((c) => ({ text: c.text, image: c.image })) : defaultLabels(item.steps);
                out.options = [];
            } else if (item.type === 'choice') {
                out.labels = [];
                out.options = item.options.map((c) => ({ text: c.text, image: c.image }));
            } else {
                out.labels = [];
                out.options = [];
            }
            return out;
        });
    }

    const FIVE = ['Strongly disagree', 'Disagree', 'Neutral', 'Agree', 'Strongly agree'];
    function defaultLabels(steps) {
        if (steps === 5) return FIVE.map((t) => ({ text: t, image: null }));
        const out = [];
        for (let i = 1; i <= steps; i += 1) out.push({ text: String(i), image: null });
        return out;
    }

    // ── Quiz poll mode ──
    // Endpoints only, and numeric options synthesized to match MCQ's wire
    // format. Middle labels and images have nowhere to live here, so
    // conversion is lossy IN THIS DIRECTION and says so rather than
    // pretending otherwise.
    function toQuizItems(items) {
        return normalizeInstrument(items).map((item) => {
            if (item.type === 'likert') {
                const steps = item.steps;
                const options = [];
                for (let i = 1; i <= steps; i += 1) options.push(String(i));
                return {
                    itemType: 'likert',
                    question: item.text,
                    scale: {
                        steps: steps,
                        lowLabel: (item.labels[0] && item.labels[0].text) || 'Strongly disagree',
                        highLabel: (item.labels[steps - 1] && item.labels[steps - 1].text) || 'Strongly agree'
                    },
                    options: options
                };
            }
            return {
                itemType: 'opinion-mcq',
                question: item.text,
                options: (item.options || []).map((c) => c.text)
            };
        });
    }

    function fromQuizItems(questions) {
        return normalizeInstrument((Array.isArray(questions) ? questions : []).map((q) => {
            const source = isObject(q) ? q : {};
            if (source.itemType === 'likert') {
                const scale = isObject(source.scale) ? source.scale : {};
                const steps = parseInt(scale.steps, 10) || 5;
                // Only the endpoints were ever stored, so the middle comes
                // back blank rather than invented.
                const labels = [];
                for (let i = 0; i < steps; i += 1) {
                    if (i === 0) labels.push({ text: text(scale.lowLabel, 120), image: null });
                    else if (i === steps - 1) labels.push({ text: text(scale.highLabel, 120), image: null });
                    else labels.push({ text: '', image: null });
                }
                return { id: source.id, text: source.question || source.text, type: 'likert', steps: steps, labels: labels };
            }
            return { id: source.id, text: source.question || source.text, type: 'choice', options: source.options };
        }));
    }

    // ── Share & Collect mailbox ──
    // The mailbox hosts a real multi-item survey activity (Code.gs v13), so a
    // whole instrument travels as ONE activity with one submission across all
    // items. The earlier adapter here split an instrument into N single-prompt
    // activities — retired before it ever shipped, which is the point of a
    // schema layer: the transport grew the right shape instead.
    const MAILBOX_MAX_ACTIVITIES = 8;
    const MAILBOX_MAX_SURVEY_ITEMS = 12;

    function toMailboxActivities(items, options) {
        const opts = isObject(options) ? options : {};
        const list = normalizeInstrument(items);
        const wireItems = list.map((item) => {
            const entry = { type: item.type, text: item.text, required: item.required === true };
            if (item.type === 'likert') {
                entry.steps = item.steps;
                // The mailbox stores plain strings, so images do not survive
                // this hop. `lossy` below names that.
                entry.labels = item.labels.map((c) => c.text);
            } else if (item.type === 'choice') {
                entry.options = item.options.map((c) => ({ label: c.text }));
            } else if (item.type === 'numeric') {
                if (item.min !== null) entry.min = item.min;
                if (item.max !== null) entry.max = item.max;
            }
            return entry;
        });
        const activity = {
            type: 'survey',
            prompt: text(opts.prompt, 240) || 'A few quick questions',
            // Identity is a privacy decision the server refuses to default, so
            // this adapter will not invent one either.
            identityMode: opts.identityMode || '',
            items: wireItems.slice(0, MAILBOX_MAX_SURVEY_ITEMS)
        };
        const droppedImages = list.some((item) => (item.labels || []).some((c) => c.image) || (item.options || []).some((c) => c.image));
        return {
            activities: [activity],
            overflow: Math.max(0, wireItems.length - MAILBOX_MAX_SURVEY_ITEMS),
            lossy: droppedImages ? ['label-images'] : []
        };
    }

    function fromMailboxActivity(activity) {
        const source = isObject(activity) ? activity : {};
        if (source.type === 'survey') {
            // The server generated the item ids; keep them so answers can be
            // joined back to the instrument.
            return normalizeInstrument((Array.isArray(source.items) ? source.items : []).map((item) => ({
                id: item && item.id,
                text: item && item.text,
                type: item && item.type,
                required: item && item.required === true,
                steps: item && item.steps,
                labels: item && item.labels,
                options: item && item.options ? item.options.map((o) => o && o.label) : undefined,
                min: item && item.min,
                max: item && item.max
            })));
        }
        if (source.type === 'rating') {
            const min = parseInt(source.minValue, 10);
            const max = parseInt(source.maxValue, 10);
            const lo = isFinite(min) ? min : 1;
            const hi = isFinite(max) ? max : 5;
            return normalizeItem({
                id: source.activityId,
                text: source.prompt,
                type: 'likert',
                steps: Math.max(2, hi - lo + 1),
                labels: Array.isArray(source.labels) && source.labels.length ? source.labels : undefined
            }, 0);
        }
        if (source.type === 'availability' || source.type === 'signup') {
            return normalizeItem({ id: source.activityId, text: source.prompt, type: 'choice', options: (source.options || []).map((o) => o && o.label) }, 0);
        }
        return normalizeItem({ id: source.activityId, text: source.prompt, type: 'freetext' }, 0);
    }

    return {
        VERSION,
        TYPES,
        RESEARCH_MIN_STEPS,
        RESEARCH_MAX_STEPS,
        RESEARCH_MIN_ITEMS,
        MAILBOX_MAX_ACTIVITIES,
        MAILBOX_MAX_SURVEY_ITEMS,
        normalizeItem,
        normalizeInstrument,
        researchValidity,
        fromResearchSuite,
        toResearchSuite,
        fromQuizItems,
        toQuizItems,
        fromMailboxActivity,
        toMailboxActivities
    };
});
