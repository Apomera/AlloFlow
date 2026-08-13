  const GUIDED_STEP_IDS = ['source-input', 'analysis', 'glossary', 'simplified', 'ui-tool-wordsounds', 'outline', 'anchor-chart', 'image', 'faq', 'sentence-frames', 'note-taking', 'brainstorm', 'persona', 'timeline', 'concept-sort', 'dbq', 'math', 'adventure', 'quiz', 'alignment', 'lesson-plan', 'directions', 'package-deliver', '_final'];
  const GUIDED_DELIVERY_EVIDENCE_KEYS = ['directionsSaved', 'exportCreated', 'shareCreated', 'liveStarted', 'studentPreviewed'];
  const normalizeGuidedPlanBrief = (raw) => {
    if (!raw || typeof raw !== 'object') return null;
    const clean = (value, max) => String(value || '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
    const validSteps = new Set(GUIDED_STEP_IDS);
    const stepReasons = {};
    if (raw.stepReasons && typeof raw.stepReasons === 'object') Object.entries(raw.stepReasons).forEach(([id, reason]) => { const cleaned = clean(reason, 180); if (validSteps.has(id) && cleaned) stepReasons[id] = cleaned; });
    const classroom = raw.classroomContext && typeof raw.classroomContext === 'object' ? raw.classroomContext : {};
    const brief = {
      id: clean(raw.id, 80), title: clean(raw.title || raw.label, 90), summary: clean(raw.summary || raw.description, 320),
      goal: clean(raw.originalGoal || raw.goal, 1200), rationale: clean(raw.rationale, 420), stepReasons,
      assumptions: Array.isArray(raw.assumptions) ? raw.assumptions.map(item => clean(item, 160)).filter(Boolean).slice(0, 4) : [],
      estimatedMinutes: Math.max(0, Math.min(180, Math.round(Number(raw.estimatedMinutes) || 0))),
      classroomContext: {
        supports: Array.isArray(classroom.supports) ? classroom.supports.map(item => clean(item, 60)).filter(Boolean).slice(0, 8) : [],
        languages: clean(classroom.languages, 120), devices: clean(classroom.devices, 40), notes: clean(classroom.notes, 280),
      },
    };
    return brief.title || brief.summary || brief.goal || Object.keys(brief.stepReasons).length ? brief : null;
  };
  const normalizeGuidedProgress = (raw = {}) => {
    const valid = new Set(GUIDED_STEP_IDS);
    const selectedIds = Array.isArray(raw.selectedIds) ? Array.from(new Set(['source-input', ...raw.selectedIds.filter(id => valid.has(id)), 'directions', 'package-deliver', '_final'])) : null;
    const activeIds = selectedIds ? GUIDED_STEP_IDS.filter(id => id === 'source-input' || id === 'directions' || id === 'package-deliver' || id === '_final' || selectedIds.includes(id)) : GUIDED_STEP_IDS;
    const rawStep = typeof raw.stepId === 'string' && activeIds.includes(raw.stepId) ? activeIds.indexOf(raw.stepId) : (Number.isInteger(raw.guidedStep) ? raw.guidedStep : (Number.isInteger(raw.step) ? raw.step : 0));
    const cleanIds = (value) => Array.isArray(value) ? Array.from(new Set(value.filter(id => valid.has(id)))) : [];
    const rawEvidence = raw.deliveryEvidence && typeof raw.deliveryEvidence === 'object' ? raw.deliveryEvidence : {};
    const deliveryEvidence = GUIDED_DELIVERY_EVIDENCE_KEYS.reduce((result, key) => {
      if (rawEvidence[key] === true) result[key] = true;
      return result;
    }, {});
    return {
      guidedStep: Math.max(0, Math.min(rawStep, Math.max(0, activeIds.length - 1))),
      selectedIds,
      completedSteps: cleanIds(raw.completedSteps || raw.completedIds),
      skippedSteps: cleanIds(raw.skippedSteps || raw.skippedIds),
      createdHistoryIds: Array.isArray(raw.createdHistoryIds) ? Array.from(new Set(raw.createdHistoryIds.filter(id => typeof id === 'string' && id))) : [],
      deliveryEvidence,
      planBrief: normalizeGuidedPlanBrief(raw.planBrief),
      savedAt: typeof raw.savedAt === 'string' && Number.isFinite(Date.parse(raw.savedAt)) ? raw.savedAt : null,
    };
  };

  const GUIDED_PHASES = [
    { id: 'plan', label: 'Plan', description: 'Choose the source and intended outcome.' },
    { id: 'understand', label: 'Understand', description: 'Find barriers, concepts, and instructional priorities.' },
    { id: 'access', label: 'Make accessible', description: 'Build multiple ways for students to perceive and understand the content.' },
    { id: 'participate', label: 'Build participation', description: 'Add ways to practice, discuss, explore, and create.' },
    { id: 'assess', label: 'Check learning', description: 'Gather evidence and verify standards and UDL alignment.' },
    { id: 'organize', label: 'Organize', description: 'Connect the resources into a teachable sequence.' },
    { id: 'assign', label: 'Assign', description: 'Write clear student-facing directions, goals, and success criteria.' },
    { id: 'deliver', label: 'Preview & deliver', description: 'Choose the right export, sharing, or live-session route.' },
    { id: 'finish', label: 'Review & finish', description: 'Review the finished lesson and save the completion summary.' },
  ];
  const GUIDED_DELIVERY_GROUPS = [
    { id: 'print-editable', label: 'Print & editable documents', options: ['PDF / Print', 'Worksheet', 'Slides (.pptx)', 'Accessible Word (.docx)', 'OpenDocument (.odt)'] },
    { id: 'web-accessible', label: 'Web, reading & accessibility', options: ['Interactive HTML', 'EPUB (.epub)', 'Plain text (.txt)', 'Markdown (.md)', 'NotebookLM source (.md)', 'Electronic Braille (.brf)'] },
    { id: 'lms-interactive', label: 'LMS & interactive packages', options: ['QTI quiz package', 'H5P interactive activity (.h5p)', 'IMS content package'] },
    { id: 'assign-share', label: 'Assign & share', options: ['Homework QR / self-contained link', 'Class Mailbox / hosted printable QR', 'Live class session', 'Editable AlloFlow project'] },
    { id: 'resource-specific', label: 'Resource-specific exports', options: ['Adventure Storybook HTML (optional narration)', 'Persona private-session JSON + HTML transcript'] },
  ];
  const GUIDED_STEPS = [
    { id: 'source-input', phase: 'plan', label: 'Source Material', action: 'Paste or type the text you want to adapt. Everything else builds from it.', success: 'Source captured. Now let us find what students will struggle with.' },
    { id: 'analysis', phase: 'understand', label: 'Analyze Source Material', action: 'Run Analyze to scan the reading level, key concepts, and tricky vocabulary.', success: 'Analysis done. That shows you where to scaffold.' },
    { id: 'glossary', phase: 'access', label: 'Glossary & Language Selection', action: 'Generate a glossary of the key terms, in your students’ languages if needed.', success: 'Glossary ready. Front-loading vocabulary helps multilingual learners most.' },
    { id: 'simplified', phase: 'access', label: 'Text Adaptation', action: 'Create a simplified version at a reading level your students can access.', success: 'Adapted text ready. Keep the original on hand for your stronger readers.' },
    { id: 'ui-tool-wordsounds', phase: 'access', label: 'Word Sounds', action: 'Build Word Sounds practice for the decoding and phonics targets.', success: 'Word Sounds set. Great support for your emerging readers.' },
    { id: 'outline', phase: 'access', label: 'Visual Organizer', action: 'Generate a visual organizer so students can see how the ideas connect.', success: 'Organizer ready. Structure helps content stick.' },
    { id: 'anchor-chart', phase: 'access', label: 'Anchor Charts', action: 'Make an anchor chart of the big ideas to keep on display.', success: 'Anchor chart ready to post.' },
    { id: 'image', phase: 'access', label: 'Visual Support', action: 'Add a visual so abstract ideas get a concrete picture.', success: 'Visual added. Dual coding helps recall.' },
    { id: 'faq', phase: 'access', label: 'FAQ Generator', action: 'Generate an FAQ that answers the questions students actually ask.', success: 'FAQ ready.' },
    { id: 'sentence-frames', phase: 'access', label: 'Writing Scaffolds', action: 'Create writing scaffolds and sentence frames to lower the writing bar.', success: 'Scaffolds ready. They free up working memory for ideas.' },
    { id: 'note-taking', phase: 'participate', label: 'Note-Taking Templates', action: 'Build a note-taking template students fill in as they read.', success: 'Template ready.' },
    { id: 'brainstorm', phase: 'participate', label: 'Brainstorm Activity Ideas', action: 'Brainstorm activity ideas tuned to this content.', success: 'Ideas generated. Pick what fits your class.' },
    { id: 'persona', phase: 'participate', label: 'Interview Mode', action: 'Set up Interview Mode so students can question a historical or expert persona.', success: 'Interview ready. Great for perspective-taking.' },
    { id: 'timeline', phase: 'participate', label: 'Sequence Builder', action: 'Build a sequence so students can order events or steps.', success: 'Sequence ready.' },
    { id: 'concept-sort', phase: 'participate', label: 'Concept Sort', action: 'Create a Concept Sort to surface how students group ideas.', success: 'Concept Sort ready.' },
    { id: 'dbq', phase: 'assess', label: 'Document-Based Question', action: 'Generate a Document-Based Question to push analysis with evidence.', success: 'DBQ ready.' },
    { id: 'math', phase: 'participate', label: 'STEAM Lab', action: 'Open the STEAM Lab to explore a hands-on math or science tool.', success: 'STEAM Lab explored. Choose the tool that best fits your lesson.' },
    { id: 'adventure', phase: 'participate', label: 'Adventure Mode', action: 'Turn the lesson into an Adventure students can play through.', success: 'Adventure ready.' },
    { id: 'quiz', phase: 'assess', label: 'Assess', action: 'Create an assessment to check what stuck.', success: 'Assessment ready. Use it to plan tomorrow.' },
    { id: 'alignment', phase: 'assess', label: 'Standards & UDL Alignment', action: 'Check Standards and UDL alignment so the lesson maps to your goals.', success: 'Alignment checked.' },
    { id: 'lesson-plan', phase: 'organize', label: 'Lesson Plan', action: 'Generate a Lesson Plan that ties the pieces together.', success: 'Lesson plan ready.' },
    { id: 'directions', phase: 'assign', label: 'Assignment Directions & Goals', action: 'Draft the student-facing steps, learning goal, due information, and success criteria. Read them once as a learner.', success: 'Directions reviewed. Students now know what to do and what success looks like.' },
    { id: 'package-deliver', phase: 'deliver', label: 'Preview, Package & Deliver', action: 'Preview the learner experience, then choose the document, LMS package, QR, mailbox, project, or live-session route that fits this lesson.', success: 'Delivery path reviewed. Use one or more formats below, then continue to the final check.' },
    { id: '_final', phase: 'finish', label: 'Review & Finish', action: 'Review what you created, revisit anything skipped, and finish when the lesson is ready to use.', success: 'All set. Nice work building this lesson.' },
  ];
  const GUIDED_PRESETS = [
    { id: 'core-lesson', label: 'Build a core lesson', description: 'A balanced path from analysis through directions and delivery.', stepIds: ['analysis', 'glossary', 'simplified', 'image', 'quiz', 'lesson-plan', 'directions'] },
    { id: 'reading-access', label: 'Adapt a reading', description: 'Analyze, simplify, add vocabulary and writing support, then assign it.', stepIds: ['analysis', 'glossary', 'simplified', 'outline', 'image', 'sentence-frames', 'quiz', 'lesson-plan', 'directions'] },
    { id: 'assessment', label: 'Build an assessment', description: 'Create questions, evidence tasks, alignment, directions, and a delivery-ready package.', stepIds: ['analysis', 'faq', 'dbq', 'quiz', 'alignment', 'lesson-plan', 'directions'] },
    { id: 'engagement', label: 'Boost engagement', description: 'Add visual, discussion, interactive, and game-based options, then assign and deliver.', stepIds: ['image', 'brainstorm', 'persona', 'timeline', 'concept-sort', 'math', 'adventure', 'quiz', 'directions'] },
    { id: 'take-home', label: 'Create take-home work', description: 'Build accessible independent work with directions, assessment, and a shareable delivery path.', stepIds: ['analysis', 'glossary', 'simplified', 'sentence-frames', 'quiz', 'lesson-plan', 'directions'] },
    { id: 'complete', label: 'Complete lesson pack', description: 'Use every Guided Mode step, including assignment directions and delivery.', stepIds: null },
  ];

  const GUIDED_TOUR_MAP = {
    'source-input': 'tour-input-panel',
    'analysis': 'tour-tool-analysis',
    'glossary': 'ui-tool-glossary',
    'simplified': 'ui-tool-simplified',
    'ui-tool-wordsounds': 'tour-tool-wordsounds',
    'outline': 'tour-tool-outline',
    'anchor-chart': 'tour-tool-anchor-chart',
    'image': 'tour-tool-visual',
    'faq': 'tour-tool-faq',
    'sentence-frames': 'tour-tool-scaffolds',
    'note-taking': 'tour-tool-note-taking',
    'brainstorm': 'tour-tool-brainstorm',
    'persona': 'tour-tool-persona',
    'timeline': 'tour-tool-timeline',
    'concept-sort': 'tour-tool-concept-sort',
    'dbq': 'tour-tool-dbq',
    'math': 'tour-tool-math',
    'adventure': 'tour-tool-adventure',
    'quiz': 'ui-tool-quiz',
    'alignment': 'tour-tool-alignment',
    'lesson-plan': 'tour-tool-lesson-plan',
    'directions': 'tour-tool-directions',
    'package-deliver': 'tour-tool-fullpack',
    '_final': 'tour-tool-fullpack',
  };

window.AlloModules = window.AlloModules || {};
window.AlloModules.GuidedModeConfig = {
  GUIDED_STEP_IDS,
  GUIDED_DELIVERY_EVIDENCE_KEYS,
  GUIDED_PHASES,
  GUIDED_DELIVERY_GROUPS,
  GUIDED_STEPS,
  GUIDED_PRESETS,
  GUIDED_TOUR_MAP,
  normalizeGuidedPlanBrief,
  normalizeGuidedProgress,
};
