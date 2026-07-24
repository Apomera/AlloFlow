'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PdCore = require('../../pd_core_module.js');

const REPORT_SCHEMA_VERSION = 'pd-publish-report-1.0';
const TARGET_STANDARD = 'WCAG 2.2 AA';
const ALLOWED_LICENSES = new Set(['CC-BY-SA-4.0', 'CC-BY-4.0', 'CC0']);
const LIMITS = Object.freeze({
  MAX_MODULE_BYTES: 512 * 1024,
  MAX_MANIFEST_BYTES: 1024 * 1024,
  MAX_SECTIONS: 100,
  MAX_ACTIVITIES_PER_SECTION: 100,
  MAX_TOTAL_ACTIVITIES: 500,
  MAX_QUESTIONS_PER_QUIZ: 100,
  MAX_TOTAL_QUESTIONS: 500,
  MAX_OPTIONS_PER_QUESTION: 20,
  MAX_LIST_ITEMS: 500,
  MAX_LINKS: 100,
  MAX_CATALOG_ENTRIES: 1000,
  MAX_LEARNING_PATHS: 200,
  MAX_MODULES_PER_PATH: 500,
});
const RUNTIME_COMPONENT_PROFILE_VERSION = 'pd-runtime-components-1.0';
const PD_STATE_INVENTORY = Object.freeze({
  schema_version: 'pd-runtime-state-inventory-1.0',
  scope: 'authoritative-state-binding',
  activityTypes: ['read', 'quiz', 'reflect', 'video', 'checklist', 'sim'],
  activityStates: {
    read: ['initial', 'acknowledged'],
    quiz: ['unanswered', 'partial', 'submitted-pass', 'submitted-fail'],
    reflect: ['empty', 'completed'],
    video: ['initial', 'watched'],
    checklist: ['empty', 'completed'],
    sim: ['idle', 'scoring', 'success', 'unavailable', 'error', 'edit-invalidated'],
  },
  pastePolicyStates: ['allowed', 'monitored', 'restricted-blocked', 'accommodation-notice'],
  runnerStates: ['loading', 'fresh', 'resumed', 'active', 'completed', 'fetch-error', 'validation-error'],
  reviewExportStates: [
    'consent-unchecked',
    'preview',
    'second-confirmation',
    'download-ready',
    'error',
  ],
  catalogStates: ['loading', 'ready', 'fetch-error', 'validation-error'],
});
const MODULE_KEYS = ['schema_version', 'kind', 'metadata', 'assessmentPolicy', 'sections'];
const METADATA_KEYS = ['id', 'version', 'language', 'title', 'topic', 'summary', 'estMinutes', 'audience', 'license', 'credit', 'ai_generated'];
const SECTION_KEYS = ['title', 'activities'];
const ACTIVITY_KEYS = ['id', 'type', 'title', 'content', 'gate', 'assessmentPolicy'];
const POLICY_KEYS = ['paste'];
const PASTE_KEYS = ['mode', 'accessibleAlternative', 'accommodationContact'];
const GATE_KEYS = ['kind', 'threshold'];
const CONTENT_KEYS = Object.freeze({
  read: ['body', 'keyPoints', 'links'],
  quiz: ['questions'],
  reflect: ['prompt'],
  video: ['url', 'body', 'captions', 'captionsUrl', 'transcript', 'transcriptUrl', 'accessibleAlternative'],
  checklist: ['items'],
  sim: ['scenario', 'rubric'],
});
const QUESTION_KEYS = ['prompt', 'options', 'correctIndex', 'explanation'];
const LINK_KEYS = ['label', 'url'];
const MANIFEST_KEYS = ['schema_version', 'kind', 'generated_at', 'entries', 'paths'];
const MANIFEST_ENTRY_KEYS = ['slug', 'moduleId', 'version', 'language', 'contentDigest', 'title', 'topic', 'summary', 'estMinutes', 'credit', 'license', 'audience', 'path'];
const LEARNING_PATH_KEYS = ['slug', 'title', 'summary', 'moduleSlugs'];
const MANUAL_REVIEW = Object.freeze([
  { code: 'manual-content-accuracy', area: 'content', message: 'Verify factual accuracy, sources, authorship, and instructional quality.' },
  { code: 'manual-license-rights', area: 'rights', message: 'Verify licensing, attribution, and permission for every included resource.' },
  { code: 'manual-media-quality', area: 'accessibility', message: 'Verify caption accuracy, transcript equivalence, audio description needs, and media controls.' },
  { code: 'manual-interaction-states', area: 'accessibility', message: 'Test keyboard, focus, errors, status messages, zoom, reflow, contrast, motion, and all interactive states.' },
  { code: 'manual-assistive-technology', area: 'accessibility', message: 'Test the complete module with representative assistive technologies and user workflows.' },
  { code: 'manual-assessment-quality', area: 'assessment', message: 'Verify answer keys, rubrics, qualitative feedback, fairness, and accommodation paths.' },
  { code: 'manual-privacy-review', area: 'privacy', message: 'Review for personal data and sensitive learner information; automated reports intentionally contain no matched samples.' },
]);

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Buffer.isBuffer(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function toPosix(value) {
  return String(value || '').replace(/\\/g, '/');
}

function reportPath(root, filePath) {
  const rawPath = String(filePath || '');
  if (UNSAFE_PATH_CONTROL_RE.test(rawPath)) return '[unsafe-path]';
  const absolute = path.resolve(rawPath);
  const relative = path.relative(path.resolve(root), absolute);
  let display;
  if (relative && !relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative)) {
    display = toPosix(relative);
  } else if (relative === '') display = '.';
  else display = path.basename(absolute);
  return UNSAFE_PATH_CONTROL_RE.test(display) ? '[unsafe-path]' : display;
}

function check(code, layer, severity, status, jsonPath, message) {
  return {
    code,
    layer,
    severity,
    status,
    path: jsonPath || null,
    message,
  };
}

function addCheck(checks, condition, code, layer, jsonPath, passMessage, failMessage, severity = 'error') {
  checks.push(check(
    code,
    layer,
    severity,
    condition ? 'pass' : (severity === 'warning' ? 'warning' : 'fail'),
    jsonPath,
    condition ? passMessage : failMessage,
  ));
  return condition;
}

function countStatuses(checks) {
  return checks.reduce((counts, item) => {
    if (item.status === 'fail') counts.blockingFailures += 1;
    if (item.status === 'warning') counts.warnings += 1;
    if (item.status === 'manual') counts.manual += 1;
    if (item.status === 'pass') counts.passed += 1;
    counts.total += 1;
    return counts;
  }, { total: 0, passed: 0, blockingFailures: 0, warnings: 0, manual: 0 });
}

const UNSAFE_CONTROL_RE = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/;
const UNSAFE_PATH_CONTROL_RE = /[\u0000-\u001F\u007F]/;

function stableValue(value, seen = new Set()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) throw new Error('Cyclic value.');
  seen.add(value);
  let result;
  if (Array.isArray(value)) result = value.map((item) => stableValue(item, seen));
  else {
    result = {};
    for (const key of Object.keys(value).sort()) result[key] = stableValue(value[key], seen);
  }
  seen.delete(value);
  return result;
}

function stableStringify(value) {
  return JSON.stringify(stableValue(value));
}

function sha256(value) {
  return 'sha256:' + crypto.createHash('sha256').update(value).digest('hex');
}

function hashStructured(value) {
  return sha256(Buffer.from(stableStringify(value), 'utf8'));
}

function serializedByteLength(value) {
  try {
    if (Buffer.isBuffer(value)) return value.length;
    if (isPlainObject(value)) return Buffer.byteLength(stableStringify(value), 'utf8');
    return Buffer.byteLength(String(value === undefined || value === null ? '' : value), 'utf8');
  } catch (_error) {
    return Number.POSITIVE_INFINITY;
  }
}

function hasUnsafeControls(value, seen = new Set(), depth = 0) {
  if (typeof value === 'string') return UNSAFE_CONTROL_RE.test(value);
  if (!value || typeof value !== 'object') return false;
  if (depth > 32 || seen.has(value)) return true;
  seen.add(value);
  for (const key of Object.keys(value)) {
    if (UNSAFE_CONTROL_RE.test(key) || hasUnsafeControls(value[key], seen, depth + 1)) return true;
  }
  seen.delete(value);
  return false;
}

function safeFindingCode(value) {
  const candidate = String(value || '');
  return /^[a-z0-9][a-z0-9-]{0,79}$/.test(candidate) ? candidate : 'issue';
}

function safeJsonPath(value) {
  const candidate = String(value || '');
  return /^(?:[A-Za-z][A-Za-z0-9]*(?:\[[0-9]+\])?)(?:\.[A-Za-z][A-Za-z0-9]*(?:\[[0-9]+\])?)*$/.test(candidate)
    ? candidate
    : null;
}

function onlyKeys(value, allowed) {
  return isPlainObject(value) && Object.keys(value).every((key) => allowed.includes(key));
}

function addOnlyKeysCheck(checks, value, allowed, code, jsonPath, label) {
  return addCheck(checks, onlyKeys(value, allowed), code, 'schema', jsonPath,
    label + ' uses only pd-1.0 fields.', label + ' contains unsupported or malformed fields.');
}

function boundedText(value, maxLength, required = false) {
  if (value === undefined && !required) return true;
  return typeof value === 'string' && (!required || value.trim().length > 0) &&
    value.length <= maxLength && !UNSAFE_CONTROL_RE.test(value);
}

function addTextBound(checks, value, maxLength, code, jsonPath, label, required = false) {
  return addCheck(checks, boundedText(value, maxLength, required), code, 'schema', jsonPath,
    label + ' is within the pd-1.0 bound.', label + ' must be valid bounded text.');
}

function validatePastePolicySchema(policy, checks, jsonPath) {
  if (policy === undefined) return;
  const objectOk = isPlainObject(policy);
  addCheck(checks, objectOk, 'schema-assessment-policy-object', 'schema', jsonPath,
    'Assessment policy is an object.', 'Assessment policy must be an object.');
  if (!objectOk) return;
  addOnlyKeysCheck(checks, policy, POLICY_KEYS, 'schema-assessment-policy-fields', jsonPath, 'Assessment policy');
  if (policy.paste === undefined) return;
  const pastePath = jsonPath + '.paste';
  const pasteOk = isPlainObject(policy.paste);
  addCheck(checks, pasteOk, 'schema-paste-policy-object', 'schema', pastePath,
    'Paste policy is an object.', 'Paste policy must be an object.');
  if (!pasteOk) return;
  addOnlyKeysCheck(checks, policy.paste, PASTE_KEYS, 'schema-paste-policy-fields', pastePath, 'Paste policy');
  addTextBound(checks, policy.paste.mode, 32, 'schema-paste-mode-bound', pastePath + '.mode', 'Paste mode', true);
  addTextBound(checks, policy.paste.accessibleAlternative, 4000, 'schema-paste-alternative-bound',
    pastePath + '.accessibleAlternative', 'Paste-policy accessible alternative');
  addTextBound(checks, policy.paste.accommodationContact, 500, 'schema-paste-contact-bound',
    pastePath + '.accommodationContact', 'Paste-policy accommodation contact');
}

function strictPdSchemaChecks(mod, checks) {
  const failuresBefore = checks.filter((item) => item.status === 'fail').length;
  const objectOk = isPlainObject(mod);
  addCheck(checks, objectOk, 'schema-module-object', 'schema', null,
    'Module is a JSON object.', 'Module must be a JSON object.');
  addCheck(checks, objectOk && !hasUnsafeControls(mod), 'schema-control-characters', 'schema', null,
    'Module text contains no prohibited control characters.', 'Module contains prohibited control characters.');
  if (!objectOk) return false;

  addOnlyKeysCheck(checks, mod, MODULE_KEYS, 'schema-module-fields', null, 'Module');
  const metadata = mod.metadata;
  const metadataOk = isPlainObject(metadata);
  addCheck(checks, metadataOk, 'schema-metadata-object', 'schema', 'metadata',
    'Metadata is an object.', 'Metadata must be an object.');
  if (metadataOk) {
    addOnlyKeysCheck(checks, metadata, METADATA_KEYS, 'schema-metadata-fields', 'metadata', 'Metadata');
    addTextBound(checks, metadata.id, 128, 'schema-metadata-id-bound', 'metadata.id', 'Module identifier', true);
    addTextBound(checks, metadata.version, 64, 'schema-metadata-version-bound', 'metadata.version', 'Module version');
    addTextBound(checks, metadata.language, 35, 'schema-metadata-language-bound', 'metadata.language', 'Module language');
    addTextBound(checks, metadata.title, 200, 'schema-metadata-title-bound', 'metadata.title', 'Module title');
    addTextBound(checks, metadata.topic, 200, 'schema-metadata-topic-bound', 'metadata.topic', 'Module topic');
    addTextBound(checks, metadata.summary, 4000, 'schema-metadata-summary-bound', 'metadata.summary', 'Module summary');
    addTextBound(checks, metadata.audience, 200, 'schema-metadata-audience-bound', 'metadata.audience', 'Module audience');
    addTextBound(checks, metadata.license, 64, 'schema-metadata-license-bound', 'metadata.license', 'Module license');
    addTextBound(checks, metadata.credit, 500, 'schema-metadata-credit-bound', 'metadata.credit', 'Module credit');
    addCheck(checks, metadata.estMinutes === undefined ||
      (Number.isInteger(metadata.estMinutes) && metadata.estMinutes > 0 && metadata.estMinutes <= 1440),
    'schema-metadata-duration-bound', 'schema', 'metadata.estMinutes',
    'Module duration is within the pd-1.0 bound.', 'Module duration must be a bounded positive whole number.');
    addCheck(checks, metadata.ai_generated === undefined || typeof metadata.ai_generated === 'boolean',
      'schema-metadata-ai-flag', 'schema', 'metadata.ai_generated',
      'AI-assistance metadata is a boolean.', 'AI-assistance metadata must be a boolean.');
  }

  validatePastePolicySchema(mod.assessmentPolicy, checks, 'assessmentPolicy');

  const sections = Array.isArray(mod.sections) ? mod.sections : [];
  addCheck(checks, Array.isArray(mod.sections), 'schema-sections-array', 'schema', 'sections',
    'Sections are a list.', 'Sections must be a list.');
  addCheck(checks, sections.length <= LIMITS.MAX_SECTIONS, 'schema-sections-limit', 'schema', 'sections',
    'Section count is within the pd-1.0 bound.', 'Section count exceeds the pd-1.0 bound.');

  let totalActivities = 0;
  let totalQuestions = 0;
  for (let sectionIndex = 0; sectionIndex < Math.min(sections.length, LIMITS.MAX_SECTIONS); sectionIndex += 1) {
    const section = sections[sectionIndex];
    const sectionPath = 'sections[' + sectionIndex + ']';
    const sectionOk = isPlainObject(section);
    addCheck(checks, sectionOk, 'schema-section-object', 'schema', sectionPath,
      'Section is an object.', 'Section must be an object.');
    if (!sectionOk) continue;
    addOnlyKeysCheck(checks, section, SECTION_KEYS, 'schema-section-fields', sectionPath, 'Section');
    addTextBound(checks, section.title, 200, 'schema-section-title-bound', sectionPath + '.title', 'Section title');

    const activities = Array.isArray(section.activities) ? section.activities : [];
    addCheck(checks, Array.isArray(section.activities), 'schema-activities-array', 'schema', sectionPath + '.activities',
      'Activities are a list.', 'Activities must be a list.');
    addCheck(checks, activities.length <= LIMITS.MAX_ACTIVITIES_PER_SECTION,
      'schema-activities-per-section-limit', 'schema', sectionPath + '.activities',
      'Section activity count is within the pd-1.0 bound.', 'Section activity count exceeds the pd-1.0 bound.');
    totalActivities += activities.length;

    const activityInspectionLimit = Math.min(activities.length, LIMITS.MAX_ACTIVITIES_PER_SECTION);
    for (let activityIndex = 0; activityIndex < activityInspectionLimit; activityIndex += 1) {
      const activity = activities[activityIndex];
      const activityPath = sectionPath + '.activities[' + activityIndex + ']';
      const activityOk = isPlainObject(activity);
      addCheck(checks, activityOk, 'schema-activity-object', 'schema', activityPath,
        'Activity is an object.', 'Activity must be an object.');
      if (!activityOk) continue;
      addOnlyKeysCheck(checks, activity, ACTIVITY_KEYS, 'schema-activity-fields', activityPath, 'Activity');
      addTextBound(checks, activity.id, 128, 'schema-activity-id-bound', activityPath + '.id', 'Activity identifier');
      addTextBound(checks, activity.type, 32, 'schema-activity-type-bound', activityPath + '.type', 'Activity type');
      addTextBound(checks, activity.title, 200, 'schema-activity-title-bound', activityPath + '.title', 'Activity title');
      validatePastePolicySchema(activity.assessmentPolicy, checks, activityPath + '.assessmentPolicy');

      if (activity.gate !== undefined) {
        const gateOk = isPlainObject(activity.gate);
        addCheck(checks, gateOk, 'schema-gate-object', 'schema', activityPath + '.gate',
          'Activity gate is an object.', 'Activity gate must be an object.');
        if (gateOk) {
          addOnlyKeysCheck(checks, activity.gate, GATE_KEYS, 'schema-gate-fields', activityPath + '.gate', 'Activity gate');
          addTextBound(checks, activity.gate.kind, 32, 'schema-gate-kind-bound', activityPath + '.gate.kind', 'Gate kind');
          addCheck(checks, activity.gate.threshold === undefined ||
            (typeof activity.gate.threshold === 'number' && Number.isFinite(activity.gate.threshold) &&
             activity.gate.threshold >= 0 && activity.gate.threshold <= 1),
          'schema-gate-threshold-bound', 'schema', activityPath + '.gate.threshold',
          'Gate threshold is within the pd-1.0 bound.', 'Gate threshold must be a number from zero through one.');
        }
      }

      const content = activity.content;
      const contentOk = isPlainObject(content);
      addCheck(checks, contentOk, 'schema-content-object', 'schema', activityPath + '.content',
        'Activity content is an object.', 'Activity content must be an object.');
      if (!contentOk) continue;
      addOnlyKeysCheck(checks, content, CONTENT_KEYS[activity.type] || [], 'schema-content-fields',
        activityPath + '.content', 'Activity content');

      const textBounds = {
        body: 100000, prompt: 4000, url: 2048, captionsUrl: 2048, transcript: 100000,
        transcriptUrl: 2048, accessibleAlternative: 4000, scenario: 20000, rubric: 10000,
      };
      for (const [field, maximum] of Object.entries(textBounds)) {
        if (content[field] !== undefined) {
          addTextBound(checks, content[field], maximum, 'schema-content-' + field.toLowerCase() + '-bound',
            activityPath + '.content.' + field, 'Activity content field');
        }
      }
      if (content.captions !== undefined) {
        addCheck(checks, typeof content.captions === 'boolean', 'schema-video-captions-flag', 'schema',
          activityPath + '.content.captions', 'Caption metadata is a boolean.', 'Caption metadata must be a boolean.');
      }

      for (const listField of ['keyPoints', 'items']) {
        if (content[listField] === undefined) continue;
        const list = Array.isArray(content[listField]) ? content[listField] : [];
        addCheck(checks, Array.isArray(content[listField]), 'schema-content-list-array', 'schema',
          activityPath + '.content.' + listField, 'Content list is a list.', 'Content list must be a list.');
        addCheck(checks, list.length <= LIMITS.MAX_LIST_ITEMS, 'schema-content-list-limit', 'schema',
          activityPath + '.content.' + listField, 'Content list is within the pd-1.0 bound.',
          'Content list exceeds the pd-1.0 bound.');
        for (let index = 0; index < Math.min(list.length, LIMITS.MAX_LIST_ITEMS); index += 1) {
          addTextBound(checks, list[index], 2000, 'schema-content-list-item-bound',
            activityPath + '.content.' + listField + '[' + index + ']', 'Content list item');
        }
      }

      if (content.links !== undefined) {
        const links = Array.isArray(content.links) ? content.links : [];
        addCheck(checks, Array.isArray(content.links), 'schema-links-array', 'schema',
          activityPath + '.content.links', 'Links are a list.', 'Links must be a list.');
        addCheck(checks, links.length <= LIMITS.MAX_LINKS, 'schema-links-limit', 'schema',
          activityPath + '.content.links', 'Link count is within the pd-1.0 bound.', 'Link count exceeds the pd-1.0 bound.');
        for (let linkIndex = 0; linkIndex < Math.min(links.length, LIMITS.MAX_LINKS); linkIndex += 1) {
          const link = links[linkIndex];
          const linkPath = activityPath + '.content.links[' + linkIndex + ']';
          const linkOk = isPlainObject(link);
          addCheck(checks, linkOk, 'schema-link-object', 'schema', linkPath,
            'Link is an object.', 'Link must be an object.');
          if (!linkOk) continue;
          addOnlyKeysCheck(checks, link, LINK_KEYS, 'schema-link-fields', linkPath, 'Link');
          addTextBound(checks, link.label, 500, 'schema-link-label-bound', linkPath + '.label', 'Link label');
          addTextBound(checks, link.url, 2048, 'schema-link-url-bound', linkPath + '.url', 'Link URL');
        }
      }

      if (content.questions !== undefined) {
        const questions = Array.isArray(content.questions) ? content.questions : [];
        addCheck(checks, Array.isArray(content.questions), 'schema-questions-array', 'schema',
          activityPath + '.content.questions', 'Questions are a list.', 'Questions must be a list.');
        addCheck(checks, questions.length <= LIMITS.MAX_QUESTIONS_PER_QUIZ, 'schema-questions-per-quiz-limit', 'schema',
          activityPath + '.content.questions', 'Quiz question count is within the pd-1.0 bound.',
          'Quiz question count exceeds the pd-1.0 bound.');
        totalQuestions += questions.length;
        for (let questionIndex = 0;
          questionIndex < Math.min(questions.length, LIMITS.MAX_QUESTIONS_PER_QUIZ);
          questionIndex += 1) {
          const question = questions[questionIndex];
          const questionPath = activityPath + '.content.questions[' + questionIndex + ']';
          const questionOk = isPlainObject(question);
          addCheck(checks, questionOk, 'schema-question-object', 'schema', questionPath,
            'Question is an object.', 'Question must be an object.');
          if (!questionOk) continue;
          addOnlyKeysCheck(checks, question, QUESTION_KEYS, 'schema-question-fields', questionPath, 'Question');
          addTextBound(checks, question.prompt, 4000, 'schema-question-prompt-bound',
            questionPath + '.prompt', 'Question prompt');
          addTextBound(checks, question.explanation, 4000, 'schema-question-explanation-bound',
            questionPath + '.explanation', 'Question explanation');
          const options = Array.isArray(question.options) ? question.options : [];
          addCheck(checks, Array.isArray(question.options), 'schema-question-options-array', 'schema',
            questionPath + '.options', 'Question options are a list.', 'Question options must be a list.');
          addCheck(checks, options.length <= LIMITS.MAX_OPTIONS_PER_QUESTION, 'schema-question-options-limit', 'schema',
            questionPath + '.options', 'Question option count is within the pd-1.0 bound.',
            'Question option count exceeds the pd-1.0 bound.');
          for (let optionIndex = 0; optionIndex < Math.min(options.length, LIMITS.MAX_OPTIONS_PER_QUESTION); optionIndex += 1) {
            addTextBound(checks, options[optionIndex], 2000, 'schema-question-option-bound',
              questionPath + '.options[' + optionIndex + ']', 'Question option');
          }
          addCheck(checks, question.correctIndex === undefined || Number.isInteger(question.correctIndex),
            'schema-question-correct-index', 'schema', questionPath + '.correctIndex',
            'Correct answer index is a whole number.', 'Correct answer index must be a whole number.');
        }
      }
    }
  }

  addCheck(checks, totalActivities <= LIMITS.MAX_TOTAL_ACTIVITIES, 'schema-total-activities-limit', 'schema', 'sections',
    'Total activity count is within the pd-1.0 bound.', 'Total activity count exceeds the pd-1.0 bound.');
  addCheck(checks, totalQuestions <= LIMITS.MAX_TOTAL_QUESTIONS, 'schema-total-questions-limit', 'schema', 'sections',
    'Total question count is within the pd-1.0 bound.', 'Total question count exceeds the pd-1.0 bound.');
  return checks.filter((item) => item.status === 'fail').length === failuresBefore;
}
function publishMetadataChecks(metadata, checks) {
  const meta = isPlainObject(metadata) ? metadata : {};
  addCheck(checks, isPlainObject(metadata), 'publish-metadata-object', 'publishing', 'metadata',
    'Publishing metadata is present.', 'Publishing metadata must be an object.');
  addCheck(checks, /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/.test(meta.version || ''),
    'publish-version', 'publishing', 'metadata.version',
    'A publisher version is declared.', 'Declare a stable publisher version.');
  addCheck(checks, /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(meta.language || meta.lang || ''),
    'publish-language', 'publishing', 'metadata.language',
    'A primary language is declared.', 'Declare a valid primary language tag.');

  const requiredStrings = [
    ['title', 'publish-title'],
    ['topic', 'publish-topic'],
    ['summary', 'publish-summary'],
    ['audience', 'publish-audience'],
    ['license', 'publish-license'],
    ['credit', 'publish-credit'],
  ];
  for (const [field, code] of requiredStrings) {
    addCheck(checks, isNonEmptyString(meta[field]), code, 'publishing', 'metadata.' + field,
      'Required publishing metadata is present.', 'Required publishing metadata is missing.');
  }
  addCheck(checks, Number.isInteger(meta.estMinutes) && meta.estMinutes > 0 && meta.estMinutes <= 1440,
    'publish-duration', 'publishing', 'metadata.estMinutes',
    'The estimated duration is valid.', 'Set metadata.estMinutes to a positive whole number.');
  addCheck(checks, ALLOWED_LICENSES.has(meta.license), 'publish-license-allowlist', 'publishing', 'metadata.license',
    'The license is supported by the community catalog.', 'Use a supported open license.');
}

function manifestBindingChecks(mod, entry, sourcePath, digest, checks) {
  const meta = isPlainObject(mod && mod.metadata) ? mod.metadata : {};
  const bound = isPlainObject(entry) ? entry : {};
  addCheck(checks, isPlainObject(entry), 'manifest-entry-object', 'binding', 'manifestEntry',
    'A manifest entry is available.', 'The manifest entry must be an object.');
  addCheck(checks, bound.moduleId === meta.id, 'manifest-module-id-binding', 'binding', 'manifestEntry.moduleId',
    'Manifest and module identifiers match.', 'Manifest and module identifiers do not match.');
  addCheck(checks, bound.version === meta.version, 'manifest-version-binding', 'binding', 'manifestEntry.version',
    'Manifest and module versions match.', 'Manifest and module versions do not match.');
  addCheck(checks, bound.language === (meta.language || meta.lang), 'manifest-language-binding', 'binding', 'manifestEntry.language',
    'Manifest and module languages match.', 'Manifest and module languages do not match.');
  addCheck(checks, bound.contentDigest === digest, 'manifest-digest-binding', 'binding', 'manifestEntry.contentDigest',
    'Manifest digest matches the complete module.', 'Manifest digest does not match the complete module.');
  addCheck(checks, bound.path === sourcePath, 'manifest-path-binding', 'binding', 'manifestEntry.path',
    'Manifest path identifies the inspected module.', 'Manifest path does not identify the inspected module.');

  const exactFields = ['title', 'topic', 'estMinutes', 'credit', 'license', 'audience'];
  for (const field of exactFields) {
    addCheck(checks, bound[field] === meta[field], 'manifest-' + field + '-binding', 'binding', 'manifestEntry.' + field,
      'Manifest display metadata matches the module.', 'Manifest display metadata does not match the module.');
  }

  addCheck(checks, isNonEmptyString(bound.summary), 'manifest-summary-present', 'binding', 'manifestEntry.summary',
    'Manifest summary is present.', 'Manifest entry needs a public summary.');
  const summaryMatches = bound.summary === meta.summary;
  checks.push(check(
    'manifest-summary-alignment',
    'binding',
    'warning',
    summaryMatches ? 'pass' : 'warning',
    'manifestEntry.summary',
    summaryMatches
      ? 'Manifest summary matches the module.'
      : 'Manifest summary is an editorial excerpt; confirm that it remains accurate.',
  ));
}

function recommendedManifestEntry(mod, relativePath, priorEntry = {}) {
  const meta = isPlainObject(mod && mod.metadata) ? mod.metadata : {};
  const fallbackSlug = path.basename(String(relativePath || ''), '.json');
  return {
    slug: isNonEmptyString(priorEntry.slug) ? priorEntry.slug : fallbackSlug,
    version: meta.version || null,
    moduleId: meta.id || null,
    language: meta.language || meta.lang || null,
    contentDigest: PdCore.moduleContentDigest(mod),
    title: meta.title || null,
    topic: meta.topic || null,
    summary: isNonEmptyString(priorEntry.summary) ? priorEntry.summary : (meta.summary || null),
    estMinutes: meta.estMinutes || null,
    credit: meta.credit || null,
    license: meta.license || null,
    audience: meta.audience || null,
    path: toPosix(relativePath),
  };
}

function inspectPdModule(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const sourceFile = path.resolve(options.filePath || path.join(root, 'module.json'));
  const sourcePath = reportPath(root, sourceFile);
  const checks = [];
  let mod = null;
  let coreResult = null;
  let digest = null;

  const inputBytes = serializedByteLength(options.moduleText);
  const sizeOk = Number.isFinite(inputBytes) && inputBytes <= LIMITS.MAX_MODULE_BYTES;
  addCheck(checks, sizeOk, 'module-size', 'schema', null,
    'Module JSON is within the pd-1.0 byte bound.', 'Module JSON exceeds the pd-1.0 byte bound.');

  if (sizeOk) {
    try {
      if (isPlainObject(options.moduleText)) mod = options.moduleText;
      else mod = JSON.parse(Buffer.isBuffer(options.moduleText)
        ? options.moduleText.toString('utf8')
        : String(options.moduleText || ''));
      checks.push(check('json-parse', 'schema', 'error', 'pass', null, 'Module JSON parses successfully.'));
    } catch (_error) {
      checks.push(check('json-parse', 'schema', 'error', 'fail', null, 'Module JSON could not be parsed.'));
    }
  } else {
    checks.push(check('json-parse', 'schema', 'error', 'fail', null,
      'Module JSON was not parsed because it exceeded a safety bound.'));
  }

  if (mod) {
    const strictOk = strictPdSchemaChecks(mod, checks);
    if (strictOk) {
      coreResult = PdCore.validatePdModule(mod);
      checks.push(check(
        'pd-core-schema',
        'schema',
        'error',
        coreResult.ok ? 'pass' : 'fail',
        null,
        coreResult.ok
          ? 'Module satisfies the shared PdCore structural contract.'
          : 'Module does not satisfy the shared PdCore structural contract.',
      ));
    } else {
      checks.push(check('pd-core-schema', 'schema', 'error', 'fail', null,
        'PdCore validation is blocked until the strict pd-1.0 contract passes.'));
    }

    publishMetadataChecks(mod.metadata, checks);
    if (strictOk) {
      try {
        digest = PdCore.moduleContentDigest(mod);
        checks.push(check('module-content-digest', 'binding', 'error', 'pass', null,
          'A canonical SHA-256 module digest was computed.'));
      } catch (_error) {
        checks.push(check('module-content-digest', 'binding', 'error', 'fail', null,
          'A canonical module digest could not be computed.'));
      }
    } else {
      checks.push(check('module-content-digest', 'binding', 'error', 'fail', null,
        'A module digest is withheld until the strict pd-1.0 contract passes.'));
    }

    if (coreResult && coreResult.ok) {
      const readiness = PdCore.auditAccessibilityReadiness(mod);
      const ready = readiness && readiness.status === 'ready-for-render-audit' && readiness.conformanceClaim === false;
      checks.push(check(
        'accessibility-authoring-readiness',
        'accessibility',
        'error',
        ready ? 'pass' : 'fail',
        null,
        ready
          ? 'Required authoring alternatives are present for a rendered audit.'
          : 'Accessibility authoring issues must be resolved before rendered review.',
      ));
      for (const issue of (readiness && Array.isArray(readiness.issues) ? readiness.issues.slice(0, 500) : [])) {
        checks.push(check(
          'accessibility-' + safeFindingCode(issue && issue.code),
          'accessibility',
          'error',
          'fail',
          safeJsonPath(issue && issue.path),
          'Resolve the reported accessibility authoring issue.',
        ));
      }
    } else {
      checks.push(check('accessibility-authoring-readiness', 'accessibility', 'error', 'fail', null,
        'Accessibility readiness cannot pass until the module satisfies the structural contract.'));
    }

    if (options.manifestEntry !== undefined) {
      manifestBindingChecks(mod, options.manifestEntry, sourcePath, digest, checks);
    }
  } else {
    checks.push(check('schema-module-object', 'schema', 'error', 'fail', null, 'Module structure could not be inspected.'));
    checks.push(check('pd-core-schema', 'schema', 'error', 'fail', null, 'Module structure could not be inspected.'));
    checks.push(check('accessibility-authoring-readiness', 'accessibility', 'error', 'fail', null,
      'Accessibility readiness could not be inspected.'));
  }

  const metadata = mod && isPlainObject(mod.metadata) ? mod.metadata : {};
  const counts = countStatuses(checks);
  return {
    sourcePath,
    moduleId: /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(metadata.id || '') ? metadata.id : null,
    version: /^[0-9A-Za-z][0-9A-Za-z._+-]{0,63}$/.test(metadata.version || '') ? metadata.version : null,
    language: /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(metadata.language || '')
      ? metadata.language
      : null,
    contentDigest: digest,
    stats: coreResult && coreResult.ok ? coreResult.stats : null,
    readinessStatus: counts.blockingFailures === 0 ? 'ready-for-render-audit' : 'blocked',
    releaseStatus: counts.blockingFailures === 0 ? 'manual-review-required' : 'blocked',
    checks,
  };
}

function strictManifestSchemaChecks(manifest, checks) {
  const failuresBefore = checks.filter((item) => item.status === 'fail').length;
  const objectOk = isPlainObject(manifest);
  addCheck(checks, objectOk, 'catalog-manifest-object', 'catalog', null,
    'Catalog manifest is an object.', 'Catalog manifest must be an object.');
  addCheck(checks, objectOk && !hasUnsafeControls(manifest), 'catalog-control-characters', 'catalog', null,
    'Catalog manifest contains no prohibited control characters.',
    'Catalog manifest contains prohibited control characters.');
  if (!objectOk) return false;

  addOnlyKeysCheck(checks, manifest, MANIFEST_KEYS, 'catalog-manifest-fields', null, 'Catalog manifest');
  addTextBound(checks, manifest.schema_version, 32, 'catalog-schema-version-bound',
    'schema_version', 'Catalog schema version', true);
  addTextBound(checks, manifest.kind, 32, 'catalog-kind-bound', 'kind', 'Catalog kind', true);
  addTextBound(checks, manifest.generated_at, 64, 'catalog-generated-at-bound',
    'generated_at', 'Catalog generation time');

  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  addCheck(checks, Array.isArray(manifest.entries), 'catalog-entries-array', 'catalog', 'entries',
    'Catalog entries are a list.', 'Catalog entries must be a list.');
  addCheck(checks, entries.length <= LIMITS.MAX_CATALOG_ENTRIES, 'catalog-entries-limit', 'catalog', 'entries',
    'Catalog entry count is within the pd-1.0 bound.', 'Catalog entry count exceeds the pd-1.0 bound.');
  for (let index = 0; index < Math.min(entries.length, LIMITS.MAX_CATALOG_ENTRIES); index += 1) {
    const entry = entries[index];
    const base = 'entries[' + index + ']';
    if (!isPlainObject(entry)) continue;
    addOnlyKeysCheck(checks, entry, MANIFEST_ENTRY_KEYS, 'catalog-entry-fields', base, 'Catalog entry');
    addTextBound(checks, entry.slug, 128, 'catalog-entry-slug-bound', base + '.slug', 'Catalog slug', true);
    addTextBound(checks, entry.moduleId, 128, 'catalog-entry-module-id-bound', base + '.moduleId',
      'Catalog module identifier', true);
    addCheck(checks, /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(entry.moduleId || ''),
      'catalog-entry-module-id', 'catalog', base + '.moduleId',
      'Catalog module identifier is stable.', 'Catalog module identifier must use the pd-1.0 identifier form.');
    addTextBound(checks, entry.version, 64, 'catalog-entry-version-bound', base + '.version',
      'Catalog module version', true);
    addTextBound(checks, entry.language, 35, 'catalog-entry-language-bound', base + '.language',
      'Catalog module language', true);
    addCheck(checks, /^sha256:[a-f0-9]{64}$/.test(entry.contentDigest || ''),
      'catalog-entry-digest', 'catalog', base + '.contentDigest',
      'Catalog digest uses canonical SHA-256 form.', 'Catalog digest must use canonical SHA-256 form.');
    addTextBound(checks, entry.title, 200, 'catalog-entry-title-bound', base + '.title', 'Catalog title', true);
    addTextBound(checks, entry.topic, 200, 'catalog-entry-topic-bound', base + '.topic', 'Catalog topic', true);
    addTextBound(checks, entry.summary, 4000, 'catalog-entry-summary-bound', base + '.summary', 'Catalog summary', true);
    addTextBound(checks, entry.credit, 500, 'catalog-entry-credit-bound', base + '.credit', 'Catalog credit', true);
    addTextBound(checks, entry.license, 64, 'catalog-entry-license-bound', base + '.license', 'Catalog license', true);
    addTextBound(checks, entry.audience, 200, 'catalog-entry-audience-bound', base + '.audience', 'Catalog audience', true);
    addTextBound(checks, entry.path, 512, 'catalog-entry-path-bound', base + '.path', 'Catalog file path', true);
    addCheck(checks, typeof entry.path === 'string' && !UNSAFE_PATH_CONTROL_RE.test(entry.path),
      'catalog-entry-path-controls', 'catalog', base + '.path',
      'Catalog path contains no control characters.', 'Catalog path contains prohibited control characters.');
    addCheck(checks, Number.isInteger(entry.estMinutes) && entry.estMinutes > 0 && entry.estMinutes <= 1440,
      'catalog-entry-duration-bound', 'catalog', base + '.estMinutes',
      'Catalog duration is within the pd-1.0 bound.', 'Catalog duration must be a bounded positive whole number.');
  }

  const paths = manifest.paths === undefined ? [] : manifest.paths;
  addCheck(checks, Array.isArray(paths), 'catalog-paths-array-strict', 'catalog', 'paths',
    'Learning paths are a list.', 'Learning paths must be a list.');
  addCheck(checks, Array.isArray(paths) && paths.length <= LIMITS.MAX_LEARNING_PATHS,
    'catalog-paths-limit', 'catalog', 'paths',
    'Learning path count is within the pd-1.0 bound.', 'Learning path count exceeds the pd-1.0 bound.');
  if (Array.isArray(paths)) {
    for (let index = 0; index < Math.min(paths.length, LIMITS.MAX_LEARNING_PATHS); index += 1) {
      const learningPath = paths[index];
      const base = 'paths[' + index + ']';
      if (!isPlainObject(learningPath)) continue;
      addOnlyKeysCheck(checks, learningPath, LEARNING_PATH_KEYS, 'catalog-learning-path-fields',
        base, 'Learning path');
      addTextBound(checks, learningPath.slug, 128, 'catalog-learning-path-slug-bound',
        base + '.slug', 'Learning path slug', true);
      addTextBound(checks, learningPath.title, 200, 'catalog-learning-path-title-bound',
        base + '.title', 'Learning path title', true);
      addTextBound(checks, learningPath.summary, 4000, 'catalog-learning-path-summary-bound',
        base + '.summary', 'Learning path summary', true);
      const moduleSlugs = Array.isArray(learningPath.moduleSlugs) ? learningPath.moduleSlugs : [];
      addCheck(checks, Array.isArray(learningPath.moduleSlugs), 'catalog-learning-path-module-slugs-array',
        'catalog', base + '.moduleSlugs',
        'Learning path module handles are a list.', 'Learning path module handles must be a list.');
      addCheck(checks, moduleSlugs.length <= LIMITS.MAX_MODULES_PER_PATH,
        'catalog-learning-path-module-slugs-limit', 'catalog', base + '.moduleSlugs',
        'Learning path module count is within the pd-1.0 bound.',
        'Learning path module count exceeds the pd-1.0 bound.');
      for (let moduleIndex = 0; moduleIndex < Math.min(moduleSlugs.length, LIMITS.MAX_MODULES_PER_PATH); moduleIndex += 1) {
        addCheck(checks, /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(moduleSlugs[moduleIndex] || ''),
          'catalog-learning-path-module-slug', 'catalog', base + '.moduleSlugs[' + moduleIndex + ']',
          'Learning path module handle is stable.', 'Learning path module handle must use lowercase kebab-case.');
      }
    }
  }
  return checks.filter((item) => item.status === 'fail').length === failuresBefore;
}

function regularRuntimeFile(filePath) {
  try {
    const stat = fs.lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile() || stat.size > 10 * 1024 * 1024) return null;
    return fs.readFileSync(filePath);
  } catch (_error) {
    return null;
  }
}

function buildRuntimeBinding(root, checks) {
  const definitions = [
    { id: 'pd-core', sourcePath: 'pd_core_module.js', deployPath: 'desktop/web-app/public/pd_core_module.js' },
    { id: 'pd-catalog-renderer', sourcePath: 'catalog_module.js', deployPath: 'desktop/web-app/public/catalog_module.js' },
  ];
  const components = definitions.map((definition) => {
    const source = regularRuntimeFile(path.join(root, definition.sourcePath));
    const deploy = regularRuntimeFile(path.join(root, definition.deployPath));
    const bothMissing = !source && !deploy;
    const bothPresent = !!source && !!deploy;
    const mirrorMatches = bothPresent && source.equals(deploy);
    const severity = bothMissing ? 'warning' : 'error';
    addCheck(checks, bothPresent, 'runtime-' + definition.id + '-files', 'runtime', null,
      'Runtime source and deploy mirror are available.',
      bothMissing ? 'Runtime inputs are unavailable in this inspection root.' : 'A runtime source or deploy mirror is missing.',
      severity);
    addCheck(checks, mirrorMatches, 'runtime-' + definition.id + '-mirror', 'runtime', null,
      'Runtime source and deploy mirror match.',
      bothMissing ? 'Runtime mirror equality is unavailable in this inspection root.' : 'Runtime source and deploy mirror do not match.',
      severity);
    return {
      id: definition.id,
      sourcePath: definition.sourcePath,
      deployPath: definition.deployPath,
      sourceDigest: source ? sha256(source) : null,
      deployDigest: deploy ? sha256(deploy) : null,
      mirrorStatus: mirrorMatches ? 'match' : (bothMissing ? 'unavailable' : 'mismatch'),
    };
  });

  const stylePaths = [
    'desktop/web-app/src/index.css',
    'desktop/web-app/tailwind.config.js',
    'desktop/web-app/package.json',
  ];
  const runtimeAvailable = components.some((component) => component.sourceDigest || component.deployDigest);
  const styleInputs = stylePaths.map((stylePath, index) => {
    const contents = regularRuntimeFile(path.join(root, stylePath));
    addCheck(checks, !!contents, 'runtime-style-input-' + index, 'runtime', null,
      'Rendered-surface style input is available.',
      runtimeAvailable ? 'A rendered-surface style input is missing.' : 'Style inputs are unavailable in this inspection root.',
      runtimeAvailable ? 'error' : 'warning');
    return { path: stylePath, digest: contents ? sha256(contents) : null };
  });

  const renderer = components.find((component) => component.id === 'pd-catalog-renderer') || null;
  const stateInventoryDigest = hashStructured(PD_STATE_INVENTORY);
  const rendererDigest = hashStructured({
    profile: 'pd-renderer-binding-1.0',
    component: renderer,
  });
  const stylesDigest = hashStructured({
    profile: 'pd-style-inputs-1.0',
    rendererClassAndInlineStylesDigest: renderer && renderer.sourceDigest,
    inputs: styleInputs,
  });
  const runtimeBuildDigest = hashStructured({
    component_profile_version: RUNTIME_COMPONENT_PROFILE_VERSION,
    renderer_digest: rendererDigest,
    styles_digest: stylesDigest,
    state_inventory_digest: stateInventoryDigest,
    components,
  });
  const renderedSurface = {
    contract_version: 'pd-rendered-surface-binding-1.0',
    runtime_build_digest: runtimeBuildDigest,
    renderer_digest: rendererDigest,
    styles_digest: stylesDigest,
    state_inventory_digest: stateInventoryDigest,
    verification_status: 'binding-only',
    automated_audit_status: 'not-evaluated-by-publisher',
    conformanceClaim: false,
    renderer_inputs: renderer ? [renderer.sourcePath, renderer.deployPath] : [],
    style_inputs: styleInputs.map((input) => input.path),
  };
  return {
    component_profile_version: RUNTIME_COMPONENT_PROFILE_VERSION,
    state_inventory_version: PD_STATE_INVENTORY.schema_version,
    runtime_build_digest: runtimeBuildDigest,
    renderer_digest: rendererDigest,
    styles_digest: stylesDigest,
    state_inventory_digest: stateInventoryDigest,
    conformanceClaim: false,
    rendered_surface: renderedSurface,
    components,
    style_inputs: styleInputs,
  };
}
function isPathInside(base, target, allowEqual = false) {
  const relative = path.relative(path.resolve(base), path.resolve(target));
  if (relative === '') return allowEqual;
  return relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative);
}

function isSafeApprovedPath(root, approvedRoot, entryPath) {
  if (!isNonEmptyString(entryPath) || entryPath.length > 512 ||
      UNSAFE_PATH_CONTROL_RE.test(entryPath) || path.isAbsolute(entryPath) || entryPath.includes('\\')) return false;
  const segments = entryPath.split('/');
  if (segments.some((segment) => !segment || segment === '.' || segment === '..')) return false;
  if (path.posix.normalize(entryPath) !== entryPath) return false;
  if (!entryPath.startsWith('catalog/pd/approved/') || !entryPath.endsWith('.json')) return false;
  const absolute = path.resolve(root, entryPath);
  return isPathInside(approvedRoot, absolute, false);
}

function realpathNative(filePath) {
  const implementation = fs.realpathSync.native || fs.realpathSync;
  return implementation(filePath);
}

function lstatChain(root, target, finalKind) {
  if (!isPathInside(root, target, true)) return false;
  let current = path.resolve(root);
  try {
    const rootStat = fs.lstatSync(current);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) return false;
    const relative = path.relative(current, path.resolve(target));
    const segments = relative ? relative.split(path.sep) : [];
    for (let index = 0; index < segments.length; index += 1) {
      current = path.join(current, segments[index]);
      const stat = fs.lstatSync(current);
      if (stat.isSymbolicLink()) return false;
      const last = index === segments.length - 1;
      if (!last && !stat.isDirectory()) return false;
      if (last && finalKind === 'file' && !stat.isFile()) return false;
      if (last && finalKind === 'directory' && !stat.isDirectory()) return false;
    }
    return true;
  } catch (_error) {
    return false;
  }
}

function resolveSafeApprovedFile(root, approvedRoot, entryPath) {
  if (!isSafeApprovedPath(root, approvedRoot, entryPath)) return { safe: false, absolute: null };
  const absolute = path.resolve(root, entryPath);
  if (!lstatChain(root, approvedRoot, 'directory') || !lstatChain(root, absolute, 'file')) {
    return { safe: false, absolute: null };
  }
  try {
    const rootReal = realpathNative(root);
    const approvedReal = realpathNative(approvedRoot);
    const fileReal = realpathNative(absolute);
    if (!isPathInside(rootReal, approvedReal, false) || !isPathInside(approvedReal, fileReal, false)) {
      return { safe: false, absolute: null };
    }
    const finalStat = fs.lstatSync(absolute);
    if (finalStat.isSymbolicLink() || !finalStat.isFile()) return { safe: false, absolute: null };
    return { safe: true, absolute };
  } catch (_error) {
    return { safe: false, absolute: null };
  }
}

function listApprovedJsonFiles(directory, root) {
  const found = [];
  let unsafe = false;
  if (!fs.existsSync(directory)) return { files: found, unsafe };
  try {
    const directoryStat = fs.lstatSync(directory);
    if (directoryStat.isSymbolicLink() || !directoryStat.isDirectory()) return { files: found, unsafe: true };
  } catch (_error) {
    return { files: found, unsafe: true };
  }

  function walk(current) {
    let entries;
    try {
      entries = fs.readdirSync(current, { withFileTypes: true })
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name));
    } catch (_error) {
      unsafe = true;
      return;
    }
    for (const entry of entries) {
      if (UNSAFE_PATH_CONTROL_RE.test(entry.name)) {
        unsafe = true;
        continue;
      }
      const absolute = path.join(current, entry.name);
      let stat;
      try {
        stat = fs.lstatSync(absolute);
      } catch (_error) {
        unsafe = true;
        continue;
      }
      if (stat.isSymbolicLink()) {
        unsafe = true;
        continue;
      }
      if (stat.isDirectory()) walk(absolute);
      else if (stat.isFile() && entry.name.toLowerCase().endsWith('.json')) {
        try {
          const approvedReal = realpathNative(directory);
          const fileReal = realpathNative(absolute);
          if (!isPathInside(approvedReal, fileReal, false)) unsafe = true;
          else found.push(reportPath(root, absolute));
        } catch (_error) {
          unsafe = true;
        }
      }
    }
  }

  walk(directory);
  return { files: found.sort(), unsafe };
}

function finalizeReport(scope, catalog, modules, runtime = null) {
  modules.sort((a, b) => a.sourcePath.localeCompare(b.sourcePath));
  const allChecks = [];
  if (catalog) allChecks.push(...catalog.checks);
  for (const moduleReport of modules) allChecks.push(...moduleReport.checks);
  const counts = countStatuses(allChecks);
  return {
    schema_version: REPORT_SCHEMA_VERSION,
    kind: 'pd_publish_report',
    targetStandard: TARGET_STANDARD,
    conformanceClaim: false,
    scope,
    summary: {
      modules: modules.length,
      checks: counts.total,
      passed: counts.passed,
      blockingFailures: counts.blockingFailures,
      warnings: counts.warnings,
      manualReviewRequired: true,
      readinessStatus: counts.blockingFailures === 0 ? 'ready-for-render-audit' : 'blocked',
      releaseStatus: counts.blockingFailures === 0 ? 'manual-review-required' : 'blocked',
    },
    catalog: catalog || null,
    modules,
    manualReview: MANUAL_REVIEW.map((item) => ({ ...item })),
    runtime,
  };
}

function inspectPdCatalog(options = {}) {
  const root = path.resolve(options.root || process.cwd());
  const manifestFile = path.resolve(root, options.manifestPath || 'catalog/pd/index.json');
  const manifestDisplayPath = reportPath(root, manifestFile);
  const approvedRoot = path.resolve(root, options.approvedDir || 'catalog/pd/approved');
  const catalogChecks = [];
  const modules = [];
  const runtime = buildRuntimeBinding(root, catalogChecks);
  let manifest = null;
  let manifestBuffer = null;

  try {
    const manifestStat = fs.lstatSync(manifestFile);
    const regularManifest = !manifestStat.isSymbolicLink() && manifestStat.isFile();
    addCheck(catalogChecks, regularManifest, 'catalog-manifest-regular-file', 'catalog', null,
      'Catalog manifest is a regular file.', 'Catalog manifest must be a regular non-linked file.');
    if (regularManifest) manifestBuffer = fs.readFileSync(manifestFile);
  } catch (_error) {
    catalogChecks.push(check('catalog-manifest-regular-file', 'catalog', 'error', 'fail', null,
      'Catalog manifest could not be read as a regular file.'));
  }

  const manifestSizeOk = !!manifestBuffer && manifestBuffer.length <= LIMITS.MAX_MANIFEST_BYTES;
  addCheck(catalogChecks, manifestSizeOk, 'catalog-manifest-size', 'catalog', null,
    'Catalog manifest is within the pd-1.0 byte bound.', 'Catalog manifest exceeds or cannot satisfy the pd-1.0 byte bound.');
  if (!manifestSizeOk) {
    catalogChecks.push(check('catalog-json-parse', 'catalog', 'error', 'fail', null,
      'Catalog manifest was not parsed because it did not satisfy a safety bound.'));
    return finalizeReport('catalog', { sourcePath: manifestDisplayPath, checks: catalogChecks }, modules, runtime);
  }

  try {
    manifest = JSON.parse(manifestBuffer.toString('utf8'));
    catalogChecks.push(check('catalog-json-parse', 'catalog', 'error', 'pass', null,
      'Catalog manifest JSON parses successfully.'));
  } catch (_error) {
    catalogChecks.push(check('catalog-json-parse', 'catalog', 'error', 'fail', null,
      'Catalog manifest JSON could not be parsed.'));
    return finalizeReport('catalog', { sourcePath: manifestDisplayPath, checks: catalogChecks }, modules, runtime);
  }

  strictManifestSchemaChecks(manifest, catalogChecks);
  if (!isPlainObject(manifest)) {
    return finalizeReport('catalog', { sourcePath: manifestDisplayPath, checks: catalogChecks }, modules, runtime);
  }

  addCheck(catalogChecks, manifest.schema_version === PdCore.SCHEMA_VERSION,
    'catalog-schema-version', 'catalog', 'schema_version',
    'Catalog schema version matches PdCore.', 'Catalog schema version does not match PdCore.');
  addCheck(catalogChecks, manifest.kind === 'pd_catalog',
    'catalog-kind', 'catalog', 'kind',
    'Catalog kind is valid.', 'Catalog kind must be pd_catalog.');
  const entries = Array.isArray(manifest.entries) ? manifest.entries : [];
  addCheck(catalogChecks, Array.isArray(manifest.entries) && entries.length > 0,
    'catalog-entries', 'catalog', 'entries',
    'Catalog contains approved entries.', 'Catalog must contain at least one approved entry.');
  const generatedAtValid = isNonEmptyString(manifest.generated_at) && !Number.isNaN(Date.parse(manifest.generated_at));
  addCheck(catalogChecks, generatedAtValid, 'catalog-generated-at', 'catalog', 'generated_at',
    'Catalog generation time is valid.', 'Catalog generation time should be a valid timestamp.', 'warning');

  const seenSlugs = new Set();
  const seenPaths = new Set();
  const seenManifestModuleIds = new Set();
  const seenModuleIds = new Set();
  const representedFiles = new Set();

  entries.slice(0, LIMITS.MAX_CATALOG_ENTRIES).forEach((entry, index) => {
    const entryPath = 'entries[' + index + ']';
    const entryObject = isPlainObject(entry);
    addCheck(catalogChecks, entryObject, 'catalog-entry-object', 'catalog', entryPath,
      'Catalog entry is an object.', 'Every catalog entry must be an object.');
    if (!entryObject) return;

    const slugValid = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(entry.slug || '');
    addCheck(catalogChecks, slugValid, 'catalog-entry-slug', 'catalog', entryPath + '.slug',
      'Catalog slug is stable.', 'Catalog slug must use lowercase kebab-case.');
    const slugUnique = slugValid && !seenSlugs.has(entry.slug);
    addCheck(catalogChecks, slugUnique, 'catalog-entry-slug-unique', 'catalog', entryPath + '.slug',
      'Catalog slug is unique.', 'Catalog slugs must be unique.');
    if (slugValid) seenSlugs.add(entry.slug);

    const moduleIdValid = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(entry.moduleId || '');
    const manifestModuleIdUnique = moduleIdValid && !seenManifestModuleIds.has(entry.moduleId);
    addCheck(catalogChecks, manifestModuleIdUnique, 'catalog-entry-module-id-unique', 'catalog',
      entryPath + '.moduleId',
      'Catalog module identifier is unique.', 'Catalog module identifiers must be present and unique.');
    if (moduleIdValid) seenManifestModuleIds.add(entry.moduleId);

    const safePath = isSafeApprovedPath(root, approvedRoot, entry.path);
    addCheck(catalogChecks, safePath, 'catalog-entry-safe-path', 'catalog', entryPath + '.path',
      'Catalog path stays inside the approved PD directory.',
      'Catalog path must identify JSON inside catalog/pd/approved.');
    const pathUnique = safePath && !seenPaths.has(entry.path);
    addCheck(catalogChecks, pathUnique, 'catalog-entry-path-unique', 'catalog', entryPath + '.path',
      'Catalog path is unique.', 'Catalog entry paths must be unique.');
    if (safePath) seenPaths.add(entry.path);
    if (!safePath) return;

    const resolved = resolveSafeApprovedFile(root, approvedRoot, entry.path);
    addCheck(catalogChecks, resolved.safe, 'catalog-entry-realpath', 'catalog', entryPath + '.path',
      'Approved module path is regular, link-free, and realpath-contained.',
      'Approved module path must be regular, link-free, and realpath-contained.');
    addCheck(catalogChecks, resolved.safe, 'catalog-entry-file-exists', 'catalog', entryPath + '.path',
      'Approved module file exists.', 'Approved module file is missing or unsafe.');
    if (!resolved.safe) return;

    representedFiles.add(entry.path);
    let moduleBuffer;
    try {
      const finalStat = fs.lstatSync(resolved.absolute);
      if (finalStat.isSymbolicLink() || !finalStat.isFile()) throw new Error('Unsafe file.');
      moduleBuffer = fs.readFileSync(resolved.absolute);
    } catch (_error) {
      catalogChecks.push(check('catalog-entry-file-read', 'catalog', 'error', 'fail', entryPath + '.path',
        'Approved module file could not be read safely.'));
      return;
    }

    const moduleReport = inspectPdModule({
      root,
      filePath: resolved.absolute,
      moduleText: moduleBuffer,
      manifestEntry: entry,
    });
    modules.push(moduleReport);
    const moduleIdUnique = !!moduleReport.moduleId && !seenModuleIds.has(moduleReport.moduleId);
    addCheck(catalogChecks, moduleIdUnique, 'catalog-module-id-unique', 'catalog', entryPath + '.moduleId',
      'Published module identifier is unique.', 'Published module identifiers must be present and unique.');
    if (moduleReport.moduleId) seenModuleIds.add(moduleReport.moduleId);
  });

  const approvedListing = listApprovedJsonFiles(approvedRoot, root);
  addCheck(catalogChecks, !approvedListing.unsafe, 'catalog-approved-tree-no-reparse', 'catalog',
    'catalog/pd/approved',
    'Approved module tree contains only regular directories and files.',
    'Approved module tree contains an unsafe or unreadable filesystem entry.');
  for (const approvedPath of approvedListing.files) {
    addCheck(catalogChecks, representedFiles.has(approvedPath), 'catalog-approved-file-listed', 'catalog', approvedPath,
      'Approved module is represented in the manifest.', 'An approved module is not represented in the manifest.');
  }

  const paths = manifest.paths === undefined ? [] : manifest.paths;
  addCheck(catalogChecks, Array.isArray(paths), 'catalog-learning-paths-array', 'catalog', 'paths',
    'Learning paths are a list.', 'Catalog paths must be a list.');
  const seenPathSlugs = new Set();
  if (Array.isArray(paths)) {
    paths.slice(0, LIMITS.MAX_LEARNING_PATHS).forEach((learningPath, index) => {
      const base = 'paths[' + index + ']';
      const validObject = isPlainObject(learningPath);
      addCheck(catalogChecks, validObject, 'catalog-learning-path-object', 'catalog', base,
        'Learning path is an object.', 'Every learning path must be an object.');
      if (!validObject) return;
      const validSlug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(learningPath.slug || '');
      addCheck(catalogChecks, validSlug, 'catalog-learning-path-slug', 'catalog', base + '.slug',
        'Learning path slug is stable.', 'Learning path slug must use lowercase kebab-case.');
      const uniqueSlug = validSlug && !seenPathSlugs.has(learningPath.slug);
      addCheck(catalogChecks, uniqueSlug, 'catalog-learning-path-slug-unique', 'catalog', base + '.slug',
        'Learning path slug is unique.', 'Learning path slugs must be unique.');
      if (validSlug) seenPathSlugs.add(learningPath.slug);
      addCheck(catalogChecks, isNonEmptyString(learningPath.title) && isNonEmptyString(learningPath.summary),
        'catalog-learning-path-metadata', 'catalog', base,
        'Learning path display metadata is complete.', 'Learning path needs a title and summary.');
      const moduleSlugs = Array.isArray(learningPath.moduleSlugs) ? learningPath.moduleSlugs : [];
      addCheck(catalogChecks, Array.isArray(learningPath.moduleSlugs) && moduleSlugs.length > 0,
        'catalog-learning-path-modules', 'catalog', base + '.moduleSlugs',
        'Learning path contains modules.', 'Learning path must contain at least one module slug.');
      const localSlugs = new Set();
      moduleSlugs.slice(0, LIMITS.MAX_MODULES_PER_PATH).forEach((slug, moduleIndex) => {
        addCheck(catalogChecks, seenSlugs.has(slug), 'catalog-learning-path-module-published', 'catalog',
          base + '.moduleSlugs[' + moduleIndex + ']',
          'Learning path module is published.', 'Learning path references an unpublished module.');
        const unique = !localSlugs.has(slug);
        addCheck(catalogChecks, unique, 'catalog-learning-path-module-unique', 'catalog',
          base + '.moduleSlugs[' + moduleIndex + ']',
          'Learning path module is unique within the path.', 'Learning path repeats a module.');
        localSlugs.add(slug);
      });
    });
  }

  return finalizeReport('catalog', { sourcePath: manifestDisplayPath, checks: catalogChecks }, modules, runtime);
}

function formatPdPublishReport(report) {
  const lines = [];
  const blocked = report.summary.blockingFailures > 0;
  lines.push('PD prepublish check: ' + (blocked ? 'BLOCKED' : 'AUTOMATED GATES PASSED'));
  lines.push('Target: ' + report.targetStandard + ' (not a conformance claim)');
  lines.push('Scope: ' + report.scope + '; modules: ' + report.summary.modules + '; checks: ' + report.summary.checks);
  lines.push('Blocking failures: ' + report.summary.blockingFailures + '; warnings: ' + report.summary.warnings);

  const findings = [];
  if (report.catalog) findings.push(...report.catalog.checks.filter((item) => item.status !== 'pass'));
  for (const moduleReport of report.modules) {
    for (const item of moduleReport.checks) {
      if (item.status !== 'pass') findings.push({ ...item, sourcePath: moduleReport.sourcePath });
    }
  }
  for (const item of findings) {
    const location = item.sourcePath || (report.catalog && report.catalog.sourcePath) || '';
    lines.push('[' + item.status.toUpperCase() + '] ' + item.code + (location ? ' (' + location + ')' : '') + ': ' + item.message);
  }
  lines.push('Manual review remains required before publication or institutional approval.');
  return lines.join('\n') + '\n';
}

module.exports = {
  REPORT_SCHEMA_VERSION,
  TARGET_STANDARD,
  MANUAL_REVIEW,
  LIMITS,
  RUNTIME_COMPONENT_PROFILE_VERSION,
  PD_STATE_INVENTORY,
  inspectPdModule,
  inspectPdCatalog,
  recommendedManifestEntry,
  formatPdPublishReport,
};
