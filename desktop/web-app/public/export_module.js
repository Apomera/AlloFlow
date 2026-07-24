(function() {
'use strict';
if (window.AlloModules && window.AlloModules.Export) { console.log('[CDN] Export already loaded, skipping'); return; }
// export_source.jsx — Export pipeline for AlloFlow
// Extracted from AlloFlowANTI.txt on 2026-04-24.
//
// 8 handlers: data exports (JSON), standards-compliant packages (QTI, IMS),
// slide decks (PPTX via window.PptxGenJS), flashcard HTML, adventure storybook
// (HTML print window), research bundle (JSON).
//
// Skipped: handleExport / handleExportPDF / executeExportFromPreview /
// generateExportAudio — tightly coupled to the preview-modal iframe system and
// _docPipeline's generateFullPackHTML; those stay in the monolith for now.
//
// Inline helpers:
//  - getDefaultTitle (mirror of component-scoped helper; uses t() from liveRef)
//  - cleanTextForPptx (previously referenced but undefined in the monolith —
//    see `cleanTextForPptx(q.factCheck)` at the old line 18339; fallback to a
//    Markdown-stripping version matches the intent of the surrounding code)
//
// Factory pattern: static utilities (escapeXml, generateUUID, warnLog, debugLog)
// are destructured once. Dynamic state + setters + component-scoped helpers
// (parseMarkdownToHTML, generateResourceHTML, rehydrateHistoryWithImages) flow
// through liveRef.current which is mirrored each render by the monolith at a
// placement AFTER those helpers' declarations (avoids the TDZ trap).
const createExport = deps => {
  const {
    liveRef,
    warnLog,
    debugLog,
    escapeXml,
    generateUUID
  } = deps;

  // Inline helpers — self-contained so they don't need live-ref.
  const getDefaultTitle = type => {
    const {
      t
    } = liveRef.current;
    switch (type) {
      case 'glossary':
        return t('glossary.title');
      case 'simplified':
        return t('simplified.title');
      case 'outline':
        return t('outline.title');
      case 'image':
        return t('visuals.title');
      case 'quiz':
        return t('quiz.title');
      case 'analysis':
        return t('analysis.title');
      case 'udl-advice':
        return t('sidebar.ai_guide');
      case 'faq':
        return t('faq.title');
      case 'brainstorm':
        return t('brainstorm.title');
      case 'sentence-frames':
        return t('scaffolds.title');
      case 'adventure':
        return t('adventure.title');
      case 'stem-assessment':
        return 'STEM Assessment';
      case 'alignment-report':
        return t('alignment.title');
      case 'timeline':
        return t('timeline.title');
      case 'concept-sort':
        return t('concept_sort.title');
      case 'math':
        return t('math.title');
      case 'lesson-plan':
        return t('lesson_plan.title');
      case 'gemini-bridge':
        return t('sidebar.tool_bridge');
      case 'persona':
        return t('persona.title');
      case 'word-sounds':
        return t('output.word_sounds_studio') || 'Word Sounds Studio';
      case 'dbq':
        return '📜 Document Analysis (DBQ)';
      case 'storyforge-config':
        return '📖 StoryForge Assignment';
      case 'storyforge-submission':
        return '📖 Story Submission';
      default:
        return t('common.resource') || 'Resource';
    }
  };
  const cleanTextForPptx = text => text ? String(text).replace(/\*\*/g, '').replace(/\*/g, '') : '';
  const _fallbackInteractiveObjectProfileFor = item => {
    const type = item && item.type ? String(item.type) : '';
    const unsupported = new Set(['adventure', 'persona', 'word-sounds', 'storyforge-config', 'storyforge-submission', 'poettree-config', 'poettree-submission', 'litlab-config', 'litlab-submission', 'math-fluency-probe', 'explore-challenge', 'stem-assessment']);
    const interactive = new Set(['glossary', 'quiz', 'sentence-frames', 'concept-sort', 'fluency-record']);
    return {
      profileVersion: 'fallback',
      type,
      label: type || 'Resource',
      status: unsupported.has(type) ? 'adapter-needed' : 'ready',
      html: unsupported.has(type) ? 'none' : interactive.has(type) ? 'interactive' : 'static',
      canExportHtml: !unsupported.has(type),
      canExportIms: !unsupported.has(type),
      interactiveHtml: interactive.has(type),
      qti: type === 'quiz',
      tracking: type === 'quiz' ? 'qti-or-local' : interactive.has(type) ? 'local-only' : 'none',
      fallback: unsupported.has(type) ? 'adapter-needed' : 'static-html',
      notes: unsupported.has(type) ? 'No IMS object adapter is registered for this type.' : 'Renderable through the resource HTML exporter.'
    };
  };
  const getInteractiveObjectProfileFor = item => {
    const current = liveRef.current || {};
    if (typeof current.interactiveObjectProfileFor === 'function') return current.interactiveObjectProfileFor(item);
    const factory = window.AlloModules && window.AlloModules.createDocPipeline;
    if (factory && typeof factory.interactiveObjectProfileFor === 'function') return factory.interactiveObjectProfileFor(item);
    return _fallbackInteractiveObjectProfileFor(item);
  };
  const getInteractiveObjectManifestItem = (item, extra) => {
    const current = liveRef.current || {};
    if (typeof current.interactiveObjectManifestItem === 'function') return current.interactiveObjectManifestItem(item, extra);
    const factory = window.AlloModules && window.AlloModules.createDocPipeline;
    if (factory && typeof factory.interactiveObjectManifestItem === 'function') return factory.interactiveObjectManifestItem(item, extra);
    const p = getInteractiveObjectProfileFor(item);
    return Object.assign({
      id: item && item.id ? String(item.id) : '',
      type: p.type,
      title: item && item.title ? String(item.title) : p.label,
      label: p.label,
      status: p.status,
      html: p.html,
      canExportHtml: p.canExportHtml,
      canExportIms: p.canExportIms,
      interactiveHtml: p.interactiveHtml,
      qti: p.qti,
      tracking: p.tracking,
      fallback: p.fallback,
      notes: p.notes
    }, extra || {});
  };
  const getInteractiveObjectProfileSummary = items => {
    const current = liveRef.current || {};
    if (typeof current.interactiveObjectProfileSummary === 'function') return current.interactiveObjectProfileSummary(items);
    const factory = window.AlloModules && window.AlloModules.createDocPipeline;
    if (factory && typeof factory.interactiveObjectProfileSummary === 'function') return factory.interactiveObjectProfileSummary(items);
    const arr = Array.isArray(items) ? items : [];
    return arr.reduce((summary, item) => {
      const p = getInteractiveObjectProfileFor(item);
      summary.total++;
      if (p.canExportHtml) summary.htmlReady++;
      if (p.interactiveHtml) summary.interactiveReady++;
      if (p.canExportIms) summary.imsReady++;
      if (p.qti) summary.qtiReady++;
      if (p.status === 'adapter-needed' || p.status === 'partial') summary.adapterNeeded++;
      if (p.status === 'unsupported') summary.unsupported++;
      summary.byStatus[p.status] = (summary.byStatus[p.status] || 0) + 1;
      return summary;
    }, {
      profileVersion: 'fallback',
      total: 0,
      htmlReady: 0,
      interactiveReady: 0,
      imsReady: 0,
      qtiReady: 0,
      adapterNeeded: 0,
      unsupported: 0,
      byStatus: {}
    });
  };
  const _jsonForHtmlScript = value => String(JSON.stringify(value == null ? null : value)).replace(/</g, '\\u003c');
  const _safeXmlIdentifier = (prefix, raw, idx) => {
    const body = String(raw || idx || Date.now()).replace(/[^A-Za-z0-9_.-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || String(idx || '0');
    return `${prefix}-${body}`;
  };
  const _exportLanguage = () => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    const value = root && root.lang ? String(root.lang).trim() : '';
    return /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(value) ? value : 'en';
  };
  const _exportDirection = () => {
    const root = typeof document !== 'undefined' ? document.documentElement : null;
    return root && String(root.dir).toLowerCase() === 'rtl' ? 'rtl' : 'ltr';
  };
  const _escapeExportText = value => escapeXml(Array.from(String(value == null ? '' : value)).filter(char => {
    const cp = char.codePointAt(0);
    return cp === 0x9 || cp === 0xA || cp === 0xD || cp >= 0x20 && cp <= 0xD7FF || cp >= 0xE000 && cp <= 0xFFFD || cp >= 0x10000 && cp <= 0x10FFFF;
  }).join(''));
  const _h5pAccessibleText = value => String(value == null ? '' : value).replace(/<[^>]*>/g, ' ').replace(/&nbsp;|&#160;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;|&#34;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/\s+/g, ' ').trim();
  const _auditH5PAccessibility = ({
    h5pJson,
    contentJson,
    context = {}
  }) => {
    const report = {
      checks: 0,
      repaired: 0,
      errors: [],
      warnings: []
    };
    const requireValue = (condition, message) => {
      report.checks += 1;
      if (!condition) report.errors.push(message);
    };
    const reviewIf = (condition, message) => {
      report.checks += 1;
      if (condition) report.warnings.push(message);
    };
    const ensureText = (target, key, fallback, label) => {
      report.checks += 1;
      if (!target || typeof target !== 'object') {
        report.errors.push(`${label} container is missing.`);
        return;
      }
      if (!_h5pAccessibleText(target[key])) {
        target[key] = fallback;
        report.repaired += 1;
      }
    };
    const requireDistinctAnswers = (answers, label) => {
      const normalized = (Array.isArray(answers) ? answers : []).map(answer => _h5pAccessibleText(answer && typeof answer === 'object' ? answer.text : answer).toLocaleLowerCase());
      requireValue(normalized.length >= 2 && normalized.every(Boolean), `${label} needs at least two labeled answers.`);
      requireValue(new Set(normalized).size === normalized.length, `${label} contains duplicate answer labels.`);
    };
    requireValue(!!_h5pAccessibleText(h5pJson && h5pJson.title), 'The activity title is missing.');
    requireValue(/^[a-z]{2,3}$/i.test(String(h5pJson && h5pJson.language || '')), 'The activity language is not a valid two- or three-letter code.');
    requireValue(!!(h5pJson && h5pJson.mainLibrary), 'The main H5P library is missing.');
    requireValue(!!contentJson && typeof contentJson === 'object', 'The H5P content payload is missing.');
    const mainLibrary = String(h5pJson && h5pJson.mainLibrary || '');
    if (mainLibrary === 'H5P.SingleChoiceSet') {
      const choices = Array.isArray(contentJson && contentJson.choices) ? contentJson.choices : [];
      requireValue(choices.length > 0, 'The quiz has no accessible questions.');
      choices.forEach((choice, index) => {
        requireValue(!!_h5pAccessibleText(choice && choice.question), `Question ${index + 1} has no prompt.`);
        requireDistinctAnswers(choice && choice.answers, `Question ${index + 1}`);
      });
      const labels = contentJson && contentJson.l10n;
      [['nextButtonLabel', 'Next', 'Next button labels'], ['nextButton', 'Next', 'Next button labels'], ['showResultsButtonLabel', 'Show results', 'Results button labels'], ['retryButtonLabel', 'Retry', 'Retry button labels'], ['closeButtonLabel', 'Close', 'Close button labels'], ['scoreBarLabel', 'You got :num out of :total points', 'Score announcements'], ['a11yShowSolution', 'Show the solution. The task will be marked with its correct solution.', 'Solution announcements'], ['a11yRetry', 'Retry the task. Reset all responses and start the task over again.', 'Retry announcements'], ['correctAnswerIntroduction', 'Correct answer', 'Correct-answer labels']].forEach(([key, fallback, label]) => ensureText(labels, key, fallback, label));
      reviewIf(contentJson && contentJson.behaviour && contentJson.behaviour.soundEffectsEnabled === true, 'Sound effects are enabled and may create an audio-only feedback cue.');
    } else if (mainLibrary === 'H5P.QuestionSet') {
      const questions = Array.isArray(contentJson && contentJson.questions) ? contentJson.questions : [];
      requireValue(questions.length > 0, 'The question set has no accessible questions.');
      [['prevButton', 'Previous question', 'Previous-question controls'], ['nextButton', 'Next question', 'Next-question controls'], ['finishButton', 'Finish', 'Finish controls'], ['submitButton', 'Submit', 'Submit controls'], ['textualProgress', 'Question: @current of @total questions', 'Progress announcements'], ['unansweredText', 'Unanswered', 'Unanswered-state labels'], ['answeredText', 'Answered', 'Answered-state labels'], ['currentQuestionText', 'Current question', 'Current-question labels'], ['navigationLabel', 'Questions', 'Question navigation labels']].forEach(([key, fallback, label]) => ensureText(contentJson && contentJson.texts, key, fallback, label));
      questions.forEach((question, index) => {
        const params = question && question.params;
        const library = String(question && question.library || '');
        if (library.startsWith('H5P.MultiChoice ')) {
          requireValue(!!_h5pAccessibleText(params && params.question), `Question ${index + 1} has no prompt.`);
          requireDistinctAnswers(params && params.answers, `Question ${index + 1}`);
          [['checkAnswerButton', 'Check', 'Check-answer controls'], ['showSolutionButton', 'Show solution', 'Solution controls'], ['tryAgainButton', 'Retry', 'Retry controls'], ['scoreBarLabel', 'You got :num out of :total points', 'Score announcements'], ['a11yCheck', 'Check the answers.', 'Check-answer announcements'], ['a11yShowSolution', 'Show the solution.', 'Solution announcements'], ['a11yRetry', 'Retry the task.', 'Retry announcements']].forEach(([key, fallback, label]) => ensureText(params && params.UI, key, fallback, `${label} for question ${index + 1}`));
        } else if (library.startsWith('H5P.Blanks ')) {
          requireValue(Array.isArray(params && params.questions) && params.questions.some(line => /\*[^*]+\*/.test(String(line))), `Question ${index + 1} has no labeled blank.`);
          [['inputLabel', 'Blank input @num of @total', 'Blank input labels'], ['checkAnswer', 'Check', 'Check-answer controls'], ['showSolutions', 'Show solution', 'Solution controls'], ['tryAgain', 'Retry', 'Retry controls'], ['a11yCheck', 'Check the answers.', 'Check-answer announcements'], ['a11yShowSolution', 'Show the solution.', 'Solution announcements'], ['a11yRetry', 'Retry the task.', 'Retry announcements']].forEach(([key, fallback, label]) => ensureText(params, key, fallback, `${label} for question ${index + 1}`));
        } else if (library.startsWith('H5P.Essay ')) {
          requireValue(!!_h5pAccessibleText(params && params.taskDescription), `Question ${index + 1} has no task description.`);
          [['placeholderText', 'Type your response here.', 'Response input labels'], ['ariaYourResult', 'Response submitted.', 'Submission announcements'], ['ariaCheck', 'Submit the response.', 'Submission controls'], ['ariaShowSolution', 'Show the sample solution.', 'Solution controls'], ['ariaRetry', 'Retry the task.', 'Retry controls']].forEach(([key, fallback, label]) => ensureText(params, key, fallback, `${label} for question ${index + 1}`));
        } else {
          requireValue(false, `Question ${index + 1} uses an unaudited H5P library.`);
        }
      });
    } else if (mainLibrary === 'H5P.Dialogcards') {
      const dialogs = Array.isArray(contentJson && contentJson.dialogs) ? contentJson.dialogs : [];
      requireValue(dialogs.length > 0, 'The card set has no accessible cards.');
      dialogs.forEach((dialog, index) => {
        requireValue(!!_h5pAccessibleText(dialog && dialog.text), `Card ${index + 1} has no front label.`);
        requireValue(!!_h5pAccessibleText(dialog && dialog.answer), `Card ${index + 1} has no back label.`);
        if (dialog && dialog.image) requireValue(!!_h5pAccessibleText(dialog.imageAltText), `Card ${index + 1} has an image without alt text.`);
      });
      [['answer', 'Turn', 'Card-turn controls'], ['next', 'Next', 'Next-card controls'], ['prev', 'Previous', 'Previous-card controls'], ['retry', 'Retry', 'Retry controls'], ['progressText', 'Card @card of @total', 'Card progress announcements'], ['cardFrontLabel', 'Card front', 'Card-front labels'], ['cardBackLabel', 'Card back', 'Card-back labels'], ['audioNotSupported', 'Your browser does not support this audio', 'Audio fallback messages']].forEach(([key, fallback, label]) => ensureText(contentJson, key, fallback, label));
      reviewIf(Number(context.derivedImageAltCount) > 0, `${context.derivedImageAltCount} image alt text value(s) were derived from card-front text and should be reviewed.`);
      reviewIf(Number(context.audioWithoutTranscriptCount) > 0, `${context.audioWithoutTranscriptCount} audio asset(s) have no explicit transcript and should be reviewed.`);
    } else {
      requireValue(false, `The ${mainLibrary || 'unknown'} H5P library has no accessibility audit profile.`);
    }
    return report;
  };
  const _normalizeStorybookExportOptions = value => {
    if (typeof value === 'boolean') {
      return {
        includeImages: value,
        includeNarration: false,
        keepModalOpen: false,
        onProgress: null,
        signal: null
      };
    }
    const input = value && typeof value === 'object' ? value : {};
    return {
      includeImages: !!input.includeImages,
      includeNarration: !!input.includeNarration,
      keepModalOpen: !!input.keepModalOpen,
      onProgress: typeof input.onProgress === 'function' ? input.onProgress : null,
      signal: input.signal || null
    };
  };
  const _storybookProgress = (options, update) => {
    if (!options.onProgress) return;
    try {
      options.onProgress(Object.assign({
        phase: 'export',
        completed: 0,
        total: 0
      }, update || {}));
    } catch (_) {}
  };
  const _normalizeStorybookScenes = (fullStory, summary, labels) => {
    const scenes = [];
    const addSegment = (scene, kind, rawText, speaker) => {
      const text = String(rawText == null ? '' : rawText).trim();
      if (!text) return;
      const sameKindCount = scene.segments.filter(segment => segment.kind === kind).length;
      const suffix = kind === 'epilogue' ? 'summary' : `${kind}:${sameKindCount}`;
      scene.segments.push({
        segmentId: `${scene.sceneId}:${suffix}`,
        order: scene.segments.length,
        kind,
        text: kind === 'feedback' ? text.replace(/\([+-]?\d+ XP\)/g, '').trim() : text,
        speaker: speaker || ''
      });
    };
    const epilogueText = String(summary == null ? '' : summary).trim();
    if (epilogueText) {
      const epilogue = {
        sceneId: 'epilogue',
        order: scenes.length,
        title: labels.epilogueTitle,
        image: null,
        segments: []
      };
      addSegment(epilogue, 'epilogue', epilogueText, '');
      scenes.push(epilogue);
    }
    let currentScene = null;
    let turnNumber = 0;
    (Array.isArray(fullStory) ? fullStory : []).forEach(entry => {
      if (!entry) return;
      const kind = entry.type === 'scene' ? 'scene' : entry.type === 'choice' ? 'choice' : 'feedback';
      const text = String(entry.text == null ? '' : entry.text).trim();
      if (!text) return;
      if (kind === 'scene') {
        turnNumber += 1;
        currentScene = {
          sceneId: `turn:${turnNumber}:scene`,
          order: scenes.length,
          title: `${labels.sceneTitle} ${turnNumber}`,
          image: entry.image || null,
          segments: []
        };
        addSegment(currentScene, 'scene', text, '');
        scenes.push(currentScene);
        return;
      }
      if (!currentScene) {
        turnNumber += 1;
        currentScene = {
          sceneId: `turn:${turnNumber}:scene`,
          order: scenes.length,
          title: `${labels.sceneTitle} ${turnNumber}`,
          image: null,
          segments: []
        };
        scenes.push(currentScene);
      }
      addSegment(currentScene, kind, text, kind === 'choice' ? labels.studentSpeaker : '');
    });
    return scenes.filter(scene => scene.segments.length > 0).map((scene, order) => Object.assign({}, scene, {
      order
    }));
  };
  const _storybookContractScenes = (scenes, audioBySegmentId) => (scenes || []).map(scene => ({
    sceneId: scene.sceneId,
    order: scene.order,
    title: scene.title || '',
    segments: scene.segments.map(segment => {
      const output = {
        segmentId: segment.segmentId,
        order: segment.order,
        text: segment.text,
        speaker: segment.speaker || ''
      };
      const audio = audioBySegmentId && audioBySegmentId[segment.segmentId];
      if (audio) output.audio = audio;
      return output;
    })
  }));
  const _storybookAudioResultMap = result => {
    const source = result && result.audioBySegmentId != null ? result.audioBySegmentId : null;
    if (!source) return {};
    if (typeof Map !== 'undefined' && source instanceof Map) {
      const output = {};
      source.forEach((value, key) => {
        output[String(key)] = value;
      });
      return output;
    }
    return source && typeof source === 'object' ? source : {};
  };
  const _downloadStorybookFile = (content, mime, filename) => {
    const blob = new Blob([content], {
      type: mime
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // exportLanguagePack NOT extracted — it stays inside useTranslation hook
  // because it closes over languagePack + targetLanguage state that aren't
  // accessible from AlloFlowContent's scope.

  // ─── handleExportResearchJSON ──────────────────────────────────────
  const handleExportResearchJSON = () => {
    const {
      probeHistory,
      surveyResponses,
      fidelityLog,
      sessionCounter,
      externalCBMScores,
      interventionLogs,
      addToast
    } = liveRef.current;
    const researchBundle = {
      exportVersion: 1,
      exportDate: new Date().toISOString(),
      probeHistory,
      surveyResponses,
      fidelityLog,
      sessionCounter,
      externalCBMScores,
      interventionLogs
    };
    const blob = new Blob([JSON.stringify(researchBundle, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `alloflow_research_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (addToast) addToast('Research data exported to JSON', 'success');
  };

  // ─── handleExportProfiles ──────────────────────────────────────────
  const handleExportProfiles = () => {
    const {
      profiles,
      addToast,
      t
    } = liveRef.current;
    if (profiles.length === 0) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(profiles));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `${t('export.filenames.profiles')}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    addToast(t('profiles.export_success'), "success");
  };

  // ─── handleExportQTI ───────────────────────────────────────────────
  const _qtiItemMetadataXml = (itemType, questionType, options = {}) => {
    const fields = [['question_type', questionType], ['alloflow_item_type', itemType], ['alloflow_scoring', options.manual ? 'manual' : 'automatic']];
    if (options.scoringGuide) fields.push(['alloflow_scoring_guide', options.scoringGuide]);
    return '\n      <itemmetadata>\n        <qtimetadata>' + fields.map(([label, value]) => '\n          <qtimetadatafield>\n            <fieldlabel>' + _escapeExportText(label) + '</fieldlabel>\n            <fieldentry>' + _escapeExportText(value) + '</fieldentry>\n          </qtimetadatafield>').join('') + '\n        </qtimetadata>\n      </itemmetadata>';
  };
  const _qtiChoiceLabelsXml = (values, prefix) => (Array.isArray(values) ? values : []).map((value, index) => '\n            <response_label ident="' + prefix + '_' + index + '">\n              <material>\n                <mattext texttype="text/plain">' + _escapeExportText(value) + '</mattext>\n              </material>\n            </response_label>').join('');
  const _qtiWrapItemXml = ({
    itemId,
    title,
    metadata,
    presentation,
    processing
  }) => '\n    <item ident="' + itemId + '" title="' + _escapeExportText(title) + '">' + (metadata || '') + '\n      <presentation>' + presentation + '\n      </presentation>' + (processing || '') + '\n    </item>';
  const _qtiScoreOutcomeXml = (maxValue = 1) => '\n      <resprocessing>\n        <outcomes>\n          <decvar varname="SCORE" vartype="Decimal" defaultval="0" minvalue="0" maxvalue="' + _escapeExportText(maxValue) + '"/>\n        </outcomes>';
  const _qtiAutoTextItemXml = ({
    q,
    index,
    itemType,
    acceptedAnswers
  }) => {
    const responseId = 'RESPONSE_' + index;
    const answers = (acceptedAnswers || []).map(value => String(value == null ? '' : value).trim()).filter(Boolean);
    if (!String(q.question == null ? '' : q.question).trim() || !answers.length) return null;
    const answerConditions = answers.map(answer => '\n        <respcondition continue="No" title="Correct">\n          <conditionvar>\n            <varequal respident="' + responseId + '" case="No">' + _escapeExportText(answer) + '</varequal>\n          </conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>').join('');
    const presentation = '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(q.question) + '</mattext>\n        </material>' + '\n        <response_str ident="' + responseId + '" rcardinality="Single">\n          <render_fib fibtype="String" rows="1" maxchars="250">\n            <response_label ident="' + responseId + '_LABEL"/>\n          </render_fib>\n        </response_str>';
    return _qtiWrapItemXml({
      itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
      title: 'Question ' + (index + 1),
      metadata: _qtiItemMetadataXml(itemType, 'short_answer_question'),
      presentation,
      processing: _qtiScoreOutcomeXml(1) + answerConditions + '\n      </resprocessing>'
    });
  };
  const _qtiManualTextItemXml = ({
    q,
    index,
    itemType,
    prompt,
    scoringGuide,
    title
  }) => {
    const text = String(prompt == null ? q.question : prompt).trim();
    if (!text) return null;
    const responseId = 'RESPONSE_' + index;
    const presentation = '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(text) + '</mattext>\n        </material>' + '\n        <response_str ident="' + responseId + '" rcardinality="Single">\n          <render_fib fibtype="String" rows="6" columns="80">\n            <response_label ident="' + responseId + '_LABEL"/>\n          </render_fib>\n        </response_str>';
    return _qtiWrapItemXml({
      itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
      title: title || 'Question ' + (index + 1),
      metadata: _qtiItemMetadataXml(itemType, 'essay_question', {
        manual: true,
        scoringGuide
      }),
      presentation
    });
  };
  const _qtiSingleChoiceItemXml = (q, index) => {
    const options = Array.isArray(q.options) ? q.options : [];
    const correctIndex = options.findIndex(option => String(option) === String(q.correctAnswer));
    if (!String(q.question == null ? '' : q.question).trim() || options.length < 2 || correctIndex < 0) return null;
    const responseId = 'RESPONSE_' + index;
    const presentation = '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(q.question) + '</mattext>\n        </material>' + '\n        <response_lid ident="' + responseId + '" rcardinality="Single">\n          <render_choice shuffle="No">' + _qtiChoiceLabelsXml(options, 'OPT') + '\n          </render_choice>\n        </response_lid>';
    const processing = _qtiScoreOutcomeXml(1) + '\n        <respcondition continue="No" title="Correct">\n          <conditionvar>\n            <varequal respident="' + responseId + '">OPT_' + correctIndex + '</varequal>\n          </conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>\n      </resprocessing>';
    return _qtiWrapItemXml({
      itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
      title: 'Question ' + (index + 1),
      metadata: _qtiItemMetadataXml('mcq', 'multiple_choice_question'),
      presentation,
      processing
    });
  };
  const _qtiMultiSelectItemXml = (q, index, partialCredit) => {
    const options = Array.isArray(q.options) ? q.options : [];
    const answers = Array.isArray(q.correctAnswers) ? q.correctAnswers : [];
    const correctIndices = answers.map(answer => options.findIndex(option => String(option) === String(answer)));
    if (!String(q.question == null ? '' : q.question).trim() || options.length < 3 || !correctIndices.length || correctIndices.some(value => value < 0)) return null;
    const responseId = 'RESPONSE_' + index;
    const presentation = '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(q.question) + '</mattext>\n        </material>' + '\n        <response_lid ident="' + responseId + '" rcardinality="Multiple">\n          <render_choice shuffle="No" minnumber="1" maxnumber="' + options.length + '">' + _qtiChoiceLabelsXml(options, 'OPT') + '\n          </render_choice>\n        </response_lid>';
    let conditions = '';
    if (partialCredit) {
      const weight = (1 / correctIndices.length).toFixed(6);
      options.forEach((option, optionIndex) => {
        const isCorrect = correctIndices.includes(optionIndex);
        conditions += '\n        <respcondition continue="Yes" title="' + (isCorrect ? 'Correct selection' : 'Incorrect selection') + '">' + '\n          <conditionvar>\n            <varequal respident="' + responseId + '">OPT_' + optionIndex + '</varequal>\n          </conditionvar>' + '\n          <setvar action="Add" varname="SCORE">' + (isCorrect ? weight : '-' + weight) + '</setvar>\n        </respcondition>';
      });
    } else {
      const exactConditions = options.map((option, optionIndex) => {
        const test = '<varequal respident="' + responseId + '">OPT_' + optionIndex + '</varequal>';
        return correctIndices.includes(optionIndex) ? test : '<not>' + test + '</not>';
      }).join('\n              ');
      conditions = '\n        <respcondition continue="No" title="All correct selections">' + '\n          <conditionvar>\n            <and>\n              ' + exactConditions + '\n            </and>\n          </conditionvar>' + '\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>';
    }
    return _qtiWrapItemXml({
      itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
      title: 'Question ' + (index + 1),
      metadata: _qtiItemMetadataXml('multi-select', 'multiple_answers_question'),
      presentation,
      processing: _qtiScoreOutcomeXml(1) + conditions + '\n      </resprocessing>'
    });
  };
  const _qtiAnswerEvidenceItemXml = (q, index, partialCredit) => {
    const answers = Array.isArray(q.answerOptions) ? q.answerOptions : [];
    const evidence = Array.isArray(q.evidenceOptions) ? q.evidenceOptions : [];
    const correctAnswerIndex = answers.findIndex(option => String(option) === String(q.correctAnswer));
    const correctEvidenceIndex = evidence.findIndex(option => String(option) === String(q.correctEvidence));
    if (!String(q.question == null ? '' : q.question).trim() || answers.length < 2 || evidence.length < 2 || correctAnswerIndex < 0 || correctEvidenceIndex < 0) return null;
    const answerId = 'ANSWER_' + index;
    const evidenceId = 'EVIDENCE_' + index;
    const evidencePrompt = q.evidencePrompt || 'Which evidence or reason best supports that answer?';
    const presentation = '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(q.question) + '</mattext>\n        </material>' + '\n        <response_lid ident="' + answerId + '" rcardinality="Single">\n          <render_choice shuffle="No">' + _qtiChoiceLabelsXml(answers, 'ANS') + '\n          </render_choice>\n        </response_lid>' + '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(evidencePrompt) + '</mattext>\n        </material>' + '\n        <response_lid ident="' + evidenceId + '" rcardinality="Single">\n          <render_choice shuffle="No">' + _qtiChoiceLabelsXml(evidence, 'EVID') + '\n          </render_choice>\n        </response_lid>';
    let conditions;
    if (partialCredit) {
      conditions = '\n        <respcondition continue="Yes" title="Correct answer">\n          <conditionvar>\n            <varequal respident="' + answerId + '">ANS_' + correctAnswerIndex + '</varequal>\n          </conditionvar>\n          <setvar action="Add" varname="SCORE">0.5</setvar>\n        </respcondition>' + '\n        <respcondition continue="Yes" title="Correct evidence">\n          <conditionvar>\n            <varequal respident="' + evidenceId + '">EVID_' + correctEvidenceIndex + '</varequal>\n          </conditionvar>\n          <setvar action="Add" varname="SCORE">0.5</setvar>\n        </respcondition>';
    } else {
      conditions = '\n        <respcondition continue="No" title="Correct answer and evidence">\n          <conditionvar>\n            <and>\n              <varequal respident="' + answerId + '">ANS_' + correctAnswerIndex + '</varequal>\n              <varequal respident="' + evidenceId + '">EVID_' + correctEvidenceIndex + '</varequal>\n            </and>\n          </conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>';
    }
    return _qtiWrapItemXml({
      itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
      title: 'Question ' + (index + 1),
      metadata: _qtiItemMetadataXml('answer-evidence', 'multiple_dropdowns_question'),
      presentation,
      processing: _qtiScoreOutcomeXml(1) + conditions + '\n      </resprocessing>'
    });
  };
  const _qtiNumericItemXml = (q, index, partialCredit) => {
    const prompt = String(q.question == null ? '' : q.question).trim();
    const correctValue = Number(q.correctValue);
    const tolerance = Number(q.tolerance == null ? 0 : q.tolerance);
    if (!prompt || !Number.isFinite(correctValue) || !Number.isFinite(tolerance) || tolerance < 0) return null;
    const valueId = 'NUM_' + index;
    const unitId = 'UNIT_' + index;
    const units = [q.unit].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(value => String(value == null ? '' : value).trim()).filter((value, unitIndex, values) => value && values.findIndex(candidate => candidate.toLowerCase() === value.toLowerCase()) === unitIndex);
    const lower = correctValue - tolerance;
    const upper = correctValue + tolerance;
    const valueCondition = tolerance > 0 ? '<and><vargte respident="' + valueId + '">' + _escapeExportText(lower) + '</vargte><varlte respident="' + valueId + '">' + _escapeExportText(upper) + '</varlte></and>' : '<varequal respident="' + valueId + '">' + _escapeExportText(correctValue) + '</varequal>';
    const unitTests = units.map(unit => '<varequal respident="' + unitId + '" case="No">' + _escapeExportText(unit) + '</varequal>');
    const unitCondition = unitTests.length > 1 ? '<or>' + unitTests.join('') + '</or>' : unitTests[0];
    let presentation = '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(prompt) + '</mattext>\n        </material>' + '\n        <response_num ident="' + valueId + '" rcardinality="Single" numtype="Decimal">\n          <render_fib fibtype="Decimal" rows="1" maxchars="40">\n            <response_label ident="' + valueId + '_LABEL"/>\n          </render_fib>\n        </response_num>';
    if (units.length) {
      presentation += '\n        <material>\n          <mattext texttype="text/plain">Unit</mattext>\n        </material>' + '\n        <response_str ident="' + unitId + '" rcardinality="Single">\n          <render_fib fibtype="String" rows="1" maxchars="40">\n            <response_label ident="' + unitId + '_LABEL"/>\n          </render_fib>\n        </response_str>';
    }
    let conditions;
    if (!units.length) {
      conditions = '\n        <respcondition continue="No" title="Correct value">\n          <conditionvar>' + valueCondition + '</conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>';
    } else if (partialCredit) {
      conditions = '\n        <respcondition continue="Yes" title="Correct value">\n          <conditionvar>' + valueCondition + '</conditionvar>\n          <setvar action="Add" varname="SCORE">0.5</setvar>\n        </respcondition>' + '\n        <respcondition continue="Yes" title="Correct unit">\n          <conditionvar>' + unitCondition + '</conditionvar>\n          <setvar action="Add" varname="SCORE">0.5</setvar>\n        </respcondition>';
    } else {
      conditions = '\n        <respcondition continue="No" title="Correct value and unit">\n          <conditionvar><and>' + valueCondition + unitCondition + '</and></conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>';
    }
    return _qtiWrapItemXml({
      itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
      title: 'Question ' + (index + 1),
      metadata: _qtiItemMetadataXml('numeric-response', 'numerical_question'),
      presentation,
      processing: _qtiScoreOutcomeXml(1) + conditions + '\n      </resprocessing>'
    });
  };
  const _qtiDiagnosticManualPrompt = (q, type) => {
    if (type === 'sequence-sense') {
      const items = Array.isArray(q.items) ? q.items : [];
      const order = Array.isArray(q.presentedOrder) && q.presentedOrder.length ? q.presentedOrder : items.map((item, index) => index);
      const displayed = order.map((itemIndex, displayIndex) => displayIndex + 1 + '. ' + String(items[itemIndex] == null ? '' : items[itemIndex])).join('\n');
      const canonical = items.map((item, itemIndex) => itemIndex + 1 + '. ' + String(item == null ? '' : item)).join('\n');
      return {
        prompt: String(q.question || 'Review the sequence.') + '\n\nDisplayed sequence:\n' + displayed + '\n\nState whether the sequence is correct. If not, identify the misplaced step and explain the ordering principle.',
        guide: 'Canonical order:\n' + canonical + (q.intentionallyWrongIndex == null ? '' : '\nIntentionally misplaced displayed position: ' + (Number(q.intentionallyWrongIndex) + 1)) + (q.orderingPrinciple ? '\nOrdering principle: ' + q.orderingPrinciple : '')
      };
    }
    const pairs = Array.isArray(q.pairs) ? q.pairs : [];
    const displayedPairs = pairs.map((pair, pairIndex) => {
      const left = Array.isArray(pair) ? pair[0] : pair && (pair.left || pair.term);
      const right = Array.isArray(pair) ? pair[1] : pair && (pair.right || pair.match);
      return pairIndex + 1 + '. ' + String(left == null ? '' : left) + ' ↔ ' + String(right == null ? '' : right);
    }).join('\n');
    return {
      prompt: String(q.question || 'Review the relationships.') + '\n\nDisplayed pairs:\n' + displayedPairs + '\n\nIdentify the mismatched pair and provide the correct partner.',
      guide: (q.wrongPairIndex == null ? '' : 'Mismatched pair: ' + (Number(q.wrongPairIndex) + 1)) + (q.correctPartnerForWrong ? '\nCorrect partner: ' + q.correctPartnerForWrong : '')
    };
  };
  const _qtiQuestionItemXml = (q, index, scoringPolicy) => {
    if (!q || typeof q !== 'object') return null;
    const type = q.type || 'mcq';
    const partialCredit = !scoringPolicy || scoringPolicy.partialCredit !== false;
    if (type === 'mcq') return _qtiSingleChoiceItemXml(q, index);
    if (type === 'multi-select') return _qtiMultiSelectItemXml(q, index, partialCredit);
    if (type === 'fill-blank') {
      return _qtiAutoTextItemXml({
        q,
        index,
        itemType: type,
        acceptedAnswers: [q.expectedFill].concat(Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : [])
      });
    }
    if (type === 'short-answer') {
      return _qtiManualTextItemXml({
        q,
        index,
        itemType: type,
        scoringGuide: q.expectedAnswer
      });
    }
    if (type === 'self-explanation') {
      return _qtiManualTextItemXml({
        q,
        index,
        itemType: type,
        scoringGuide: q.rubric || q.expectedAnswer
      });
    }
    if (type === 'sequence-sense' || type === 'relation-mismatch') {
      const diagnostic = _qtiDiagnosticManualPrompt(q, type);
      return _qtiManualTextItemXml({
        q,
        index,
        itemType: type,
        prompt: diagnostic.prompt,
        scoringGuide: diagnostic.guide
      });
    }
    if (type === 'answer-evidence') return _qtiAnswerEvidenceItemXml(q, index, partialCredit);
    if (type === 'numeric-response') return _qtiNumericItemXml(q, index, partialCredit);
    return _qtiManualTextItemXml({
      q,
      index,
      itemType: type,
      scoringGuide: q.rubric || q.expectedAnswer,
      title: 'Question ' + (index + 1) + ' (' + type + ')'
    });
  };
  const handleExportQTI = async (options = {}) => {
    const live = liveRef.current;
    const generatedContent = options.generatedContent || live.generatedContent;
    const {
      sourceTopic,
      addToast,
      t
    } = live;
    if (!window.JSZip) {
      addToast(t('export_status.lib_loading'), "error");
      return;
    }
    if (!generatedContent || generatedContent.type !== 'quiz') {
      addToast(t('export_status.qti_quiz_only'), "error");
      return;
    }
    addToast(t('export_status.packaging_qti'), "info");
    const zip = new window.JSZip();
    const manifestId = `MANIFEST-${generateUUID()}`;
    const resourceId = `RES-${generateUUID()}`;
    const assessmentId = `QU-${generateUUID()}`;
    const exportLang = _exportLanguage();
    const title = _escapeExportText(generatedContent.title || t('export.qti_default_title'));
    const description = _escapeExportText(sourceTopic || t('export.qti_default_desc'));
    const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:lom="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2.xsd">
  <metadata>
    <schema>${_escapeExportText(t('common.ims_content') || 'IMS Content')}</schema>
    <schemaversion>1.1.3</schemaversion>
    <lom:lom>
      <lom:general>
        <lom:title>
          <lom:string language="${_escapeExportText(exportLang)}">${title}</lom:string>
        </lom:title>
        <lom:description>
          <lom:string language="${_escapeExportText(exportLang)}">${description}</lom:string>
        </lom:description>
      </lom:general>
    </lom:lom>
  </metadata>
  <organizations/>
  <resources>
    <resource identifier="${resourceId}" type="imsqti_xmlv1p2" href="assessment.xml">
      <file href="assessment.xml"/>
    </resource>
  </resources>
</manifest>`;
    zip.file("imsmanifest.xml", manifestXml);
    const assessmentXmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
  <assessment ident="${assessmentId}" title="${title}">
    <section ident="root_section">`;
    let itemsXml = "";
    const rawQuestions = Array.isArray(generatedContent && generatedContent.data && generatedContent.data.questions) ? generatedContent.data.questions : [];
    const scoringPolicy = Object.assign({
      partialCredit: true
    }, generatedContent && generatedContent.data && generatedContent.data.scoringPolicy ? generatedContent.data.scoringPolicy : {});
    const questionItems = rawQuestions.map((question, questionIndex) => _qtiQuestionItemXml(question, questionIndex, scoringPolicy));
    const validQuestionItems = questionItems.filter(Boolean);
    const reflectionEntries = (Array.isArray(generatedContent && generatedContent.data && generatedContent.data.reflections) ? generatedContent.data.reflections : []).map(ref => {
      if (typeof ref === 'string') return ref.trim();
      if (!ref || typeof ref !== 'object') return '';
      return String(ref.text || ref.prompt || ref.question || '').trim();
    }).filter(Boolean);
    if (!validQuestionItems.length && !reflectionEntries.length) {
      addToast('No valid assessment questions or reflections are ready for QTI export.', "error");
      return;
    }
    itemsXml += validQuestionItems.join('');
    if (validQuestionItems.length < rawQuestions.length) {
      addToast(`${rawQuestions.length - validQuestionItems.length} malformed or unsupported assessment item(s) were omitted from the QTI package.`, "warning");
    }
    reflectionEntries.forEach((text, i) => {
      const itemId = `REF_${i}_${generateUUID().slice(0, 8)}`;
      const responseId = `REF_RESP_${i}`;
      itemsXml += `
    <item ident="${itemId}" title="${_escapeExportText(t('common.reflection_i_1') || 'Reflection')}">
      ${_qtiItemMetadataXml('reflection', 'essay_question', {
        manual: true
      })}
      <presentation>
        <material>
          <mattext texttype="text/plain">${_escapeExportText(text)}</mattext>
        </material>
        <response_str ident="${responseId}" rcardinality="Single">
          <render_fib fibtype="String" rows="5" columns="80">
            <response_label ident="${responseId}_LABEL"/>
          </render_fib>
        </response_str>
      </presentation>
    </item>`;
    });
    const assessmentXmlFooter = `
    </section>
  </assessment>
</questestinterop>`;
    const assessmentXmlContent = assessmentXmlHeader + itemsXml + assessmentXmlFooter;
    zip.file("assessment.xml", assessmentXmlContent);
    try {
      const content = await zip.generateAsync({
        type: "blob"
      });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `canvas-quiz-export.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      addToast(t('export_status.qti_success'), "success");
    } catch (err) {
      warnLog("QTI Package generation failed", err);
      addToast(t('export_status.package_error'), "error");
    }
  };
  // --- handleExportH5P ------------------------------------------------
  // Produces content-only H5P archives that reference official H5P
  // libraries. The destination H5P installation must provide that library.
  const handleExportH5P = async (options = {}) => {
    const live = liveRef.current;
    const generatedContent = options.generatedContent || live.generatedContent;
    const {
      sourceTopic,
      addToast,
      t
    } = live;
    if (!window.JSZip) {
      addToast(t('export_status.lib_loading'), "error");
      return false;
    }
    const type = String(generatedContent && generatedContent.type || '').toLowerCase();
    if (!['quiz', 'glossary', 'flashcards'].includes(type)) {
      addToast('H5P export supports quizzes, glossaries, and flashcards.', "error");
      return false;
    }
    const plain = value => String(value == null ? '' : value).trim();
    const richText = value => `<p>${_escapeExportText(plain(value))}</p>`;
    const language = String(_exportLanguage() || 'und').toLowerCase().split(/[-_]/)[0];
    const h5pLanguage = /^[a-z]{2}$/.test(language) ? language : 'und';
    const rawTitle = plain(generatedContent.title || sourceTopic || 'AlloFlow activity');
    const title = rawTitle || 'AlloFlow activity';
    const tx = (key, fallback) => {
      try {
        const translated = typeof t === 'function' ? t(key) : '';
        return translated && translated !== key ? String(translated) : fallback;
      } catch (_) {
        return fallback;
      }
    };
    const packagedAssets = [];
    const assetExtensions = {
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/gif': 'gif',
      'audio/mpeg': 'mp3',
      'audio/mp4': 'm4a',
      'audio/ogg': 'ogg',
      'audio/wav': 'wav',
      'audio/x-wav': 'wav',
      'audio/webm': 'webm'
    };
    let mediaOmitted = 0;
    let derivedImageAltCount = 0;
    let audioWithoutTranscriptCount = 0;
    const addEmbeddedAsset = (rawValue, kind, index) => {
      const source = Array.isArray(rawValue) ? rawValue.find(value => typeof value === 'string' && value.trim()) : rawValue;
      if (!source) return null;
      if (typeof source !== 'string') {
        mediaOmitted += 1;
        return null;
      }
      const match = source.trim().match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/i);
      const mime = match ? String(match[1]).toLowerCase() : '';
      const extension = assetExtensions[mime];
      const expectedKind = kind === 'image' ? mime.startsWith('image/') : mime.startsWith('audio/');
      const payload = match ? match[2].replace(/\s+/g, '') : '';
      if (!match || !extension || !expectedKind || !payload || payload.length > 20 * 1024 * 1024) {
        mediaOmitted += 1;
        return null;
      }
      const path = `${kind === 'image' ? 'images' : 'audios'}/card-${index + 1}.${extension}`;
      packagedAssets.push({
        path,
        mime,
        base64: payload
      });
      return {
        path,
        mime,
        copyright: {
          license: 'U'
        }
      };
    };
    let h5pJson;
    let contentJson;
    let omitted = 0;
    let adapted = 0;
    let manualReview = 0;
    let libraryLabel = '';
    let fileSuffix = 'activity';
    if (type === 'quiz') {
      const rawQuestions = Array.isArray(generatedContent?.data?.questions) ? generatedContent.data.questions : [];
      const allSingleChoice = rawQuestions.length > 0 && rawQuestions.every(q => !q || !q.type || q.type === 'mcq');
      if (allSingleChoice) {
        const choices = rawQuestions.map(question => {
          const prompt = plain(question && question.question);
          const optionsList = Array.isArray(question && question.options) ? question.options.map(plain) : [];
          let correctIndex = Number.isInteger(question && question.correctIndex) ? question.correctIndex : -1;
          if (correctIndex < 0) correctIndex = optionsList.findIndex(option => option === plain(question && question.correctAnswer));
          if (!prompt || optionsList.length < 2 || optionsList.length > 4 || optionsList.some(option => !option) || correctIndex < 0 || correctIndex >= optionsList.length) {
            omitted += 1;
            return null;
          }
          const orderedAnswers = [optionsList[correctIndex], ...optionsList.filter((_, index) => index !== correctIndex)];
          return {
            subContentId: generateUUID(),
            question: richText(prompt),
            answers: orderedAnswers.map(richText)
          };
        }).filter(Boolean);
        if (!choices.length) {
          addToast('No H5P-compatible quiz questions are ready. Questions need 2–4 options and one identified correct answer.', "error");
          return false;
        }
        h5pJson = {
          title,
          language: h5pLanguage,
          mainLibrary: 'H5P.SingleChoiceSet',
          embedTypes: ['iframe'],
          license: 'U',
          authorComments: 'Generated by AlloFlow. Requires H5P.SingleChoiceSet 1.11 on the destination.',
          preloadedDependencies: [{
            machineName: 'H5P.SingleChoiceSet',
            majorVersion: 1,
            minorVersion: 11
          }]
        };
        contentJson = {
          choices,
          overallFeedback: [{
            from: 0,
            to: 100,
            feedback: ''
          }],
          behaviour: {
            autoContinue: false,
            timeoutCorrect: 2000,
            timeoutWrong: 3000,
            soundEffectsEnabled: false,
            enableRetry: true,
            enableSolutionsButton: true,
            passPercentage: 70
          },
          l10n: {
            nextButtonLabel: tx('common.next', 'Next'),
            nextButton: tx('common.next', 'Next'),
            showResultsButtonLabel: tx('quiz.results', 'Show results'),
            retryButtonLabel: tx('common.retry', 'Retry'),
            solutionViewTitle: tx('quiz.solution_list', 'Solution list'),
            correctText: tx('common.correct', 'Correct') + '!',
            incorrectText: tx('common.incorrect', 'Incorrect') + '!',
            shouldSelect: tx('quiz.should_select', 'Should have been selected'),
            shouldNotSelect: tx('quiz.should_not_select', 'Should not have been selected'),
            muteButtonLabel: tx('a11y.mute_all_audio', 'Mute feedback sound'),
            closeButtonLabel: tx('common.close', 'Close'),
            slideOfTotal: tx('quiz.slide_of_total', 'Slide :num of :total'),
            scoreBarLabel: tx('quiz.score_bar_label', 'You got :num out of :total points'),
            solutionListQuestionNumber: tx('common.question_i_1', 'Question') + ' :num',
            a11yShowSolution: tx('quiz.a11y_show_solution', 'Show the solution. The task will be marked with its correct solution.'),
            a11yRetry: tx('quiz.a11y_retry', 'Retry the task. Reset all responses and start the task over again.'),
            resultHeader: tx('quiz.your_result', 'Your result:'),
            totalScore: tx('quiz.total_score', ':score of :maxScore correct'),
            resultTableHeader: tx('common.question_i_1', 'Question'),
            resultScoreTableHeader: tx('common.score', 'Score'),
            correctAnswerIntroduction: tx('quiz.correct_answer', 'Correct answer')
          }
        };
        libraryLabel = 'H5P.SingleChoiceSet 1.11';
        fileSuffix = 'quiz';
      } else {
        const questions = [];
        const used = new Set();
        const addMulti = (prompt, options, correctIndices) => {
          const clean = Array.isArray(options) ? options.map(plain) : [];
          const keys = (correctIndices || []).filter(index => Number.isInteger(index) && index >= 0 && index < clean.length);
          if (!plain(prompt) || clean.length < 2 || clean.some(option => !option) || !keys.length) return false;
          questions.push({
            library: 'H5P.MultiChoice 1.16',
            subContentId: generateUUID(),
            params: {
              question: richText(prompt),
              answers: clean.map((option, index) => ({
                correct: keys.includes(index),
                tipsAndFeedback: {
                  tip: '',
                  chosenFeedback: '',
                  notChosenFeedback: ''
                },
                text: richText(option)
              })),
              overallFeedback: [{
                from: 0,
                to: 100,
                feedback: ''
              }],
              behaviour: {
                enableRetry: true,
                enableSolutionsButton: true,
                enableCheckButton: true,
                type: keys.length > 1 ? 'multi' : 'single',
                singlePoint: false,
                randomAnswers: false,
                showSolutionsRequiresInput: true,
                confirmCheckDialog: false,
                confirmRetryDialog: false,
                autoCheck: false,
                passPercentage: 100,
                showScorePoints: true
              },
              UI: {
                checkAnswerButton: 'Check',
                submitAnswerButton: 'Submit',
                showSolutionButton: 'Show solution',
                tryAgainButton: 'Retry',
                tipsLabel: 'Show tip',
                scoreBarLabel: 'You got :num out of :total points',
                tipAvailable: 'Tip available',
                feedbackAvailable: 'Feedback available',
                correctAnswer: 'Correct answer',
                shouldCheck: 'Should have been checked',
                shouldNotCheck: 'Should not have been checked',
                noInput: 'Please answer before viewing the solution',
                a11yCheck: 'Check the answers.',
                a11yShowSolution: 'Show the solution.',
                a11yRetry: 'Retry the task.'
              }
            }
          });
          used.add('H5P.MultiChoice');
          return true;
        };
        const addBlanks = (prompt, answerValues) => {
          const answers = Array.from(new Set((answerValues || []).map(value => plain(value).replace(/[*/:]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean)));
          if (!plain(prompt) || !answers.length) return false;
          const token = 'ALLOFLOWBLANKTOKEN';
          const withToken = /_{3,}/.test(prompt) ? plain(prompt).replace(/_{3,}/, token) : plain(prompt) + ' ' + token;
          const line = richText(withToken).replace(token, '*' + answers.map(_escapeExportText).join('/') + '*');
          questions.push({
            library: 'H5P.Blanks 1.14',
            subContentId: generateUUID(),
            params: {
              text: richText('Fill in the missing answer.'),
              questions: [line],
              overallFeedback: [{
                from: 0,
                to: 100,
                feedback: ''
              }],
              showSolutions: 'Show solution',
              tryAgain: 'Retry',
              checkAnswer: 'Check',
              submitAnswer: 'Submit',
              notFilledOut: 'Please fill in the blank to view the solution',
              answerIsCorrect: "':ans' is correct",
              answerIsWrong: "':ans' is wrong",
              answeredCorrectly: 'Answered correctly',
              answeredIncorrectly: 'Answered incorrectly',
              solutionLabel: 'Correct answer:',
              inputLabel: 'Blank input @num of @total',
              inputHasTipLabel: 'Tip available',
              tipLabel: 'Tip',
              behaviour: {
                enableRetry: true,
                allowRetryIfCorrect: false,
                enableSolutionsButton: true,
                enableCheckButton: true,
                autoCheck: false,
                caseSensitive: false,
                showSolutionsRequiresInput: true,
                separateLines: false,
                confirmCheckDialog: false,
                confirmRetryDialog: false,
                acceptSpellingErrors: false
              },
              scoreBarLabel: 'You got :num out of :total points',
              a11yCheck: 'Check the answers.',
              a11yShowSolution: 'Show the solution.',
              a11yRetry: 'Retry the task.',
              a11yCheckingModeHeader: 'Checking mode'
            }
          });
          used.add('H5P.Blanks');
          return true;
        };
        const addEssay = (prompt, sample) => {
          if (!plain(prompt)) return false;
          questions.push({
            library: 'H5P.Essay 1.5',
            subContentId: generateUUID(),
            params: {
              taskDescription: richText(prompt),
              placeholderText: 'Type your response here.',
              solution: {
                introduction: richText('Use this sample to review your response.'),
                sample: sample ? richText(sample) : ''
              },
              keywords: [{
                keyword: '/./',
                alternatives: [],
                options: {
                  points: 0,
                  occurrences: 1,
                  caseSensitive: false,
                  forgiveMistakes: true,
                  feedbackIncluded: '',
                  feedbackMissed: '',
                  feedbackIncludedWord: 'none',
                  feedbackMissedWord: 'none'
                }
              }],
              overallFeedback: [{
                from: 0,
                to: 100,
                feedback: ''
              }],
              behaviour: {
                minimumLength: 1,
                inputFieldSize: '10',
                enableRetry: true,
                ignoreScoring: true,
                pointsHost: 1,
                linebreakReplacement: ' '
              },
              checkAnswer: 'Submit',
              submitAnswer: 'Submit',
              tryAgain: 'Retry',
              showSolution: 'Show solution',
              feedbackHeader: 'Feedback',
              solutionTitle: 'Sample answer',
              remainingChars: 'Remaining characters: @chars',
              notEnoughChars: 'You must enter at least @chars characters!',
              messageSave: 'saved',
              ariaYourResult: 'Response submitted.',
              ariaNavigatedToSolution: 'Navigated to sample solution.',
              ariaCheck: 'Submit the response.',
              ariaShowSolution: 'Show the sample solution.',
              ariaRetry: 'Retry the task.'
            }
          });
          used.add('H5P.Essay');
          return true;
        };
        rawQuestions.forEach(question => {
          const q = question || {};
          const kind = q.type || 'mcq';
          const prompt = plain(q.question);
          let included = false;
          if (kind === 'mcq') {
            const options = Array.isArray(q.options) ? q.options.map(plain) : [];
            const key = Number.isInteger(q.correctIndex) ? q.correctIndex : options.indexOf(plain(q.correctAnswer));
            included = addMulti(prompt, options, [key]);
          } else if (kind === 'multi-select') {
            const options = Array.isArray(q.options) ? q.options.map(plain) : [];
            const keys = Array.isArray(q.correctAnswers) ? q.correctAnswers.map(plain) : [];
            const indices = options.map((option, index) => keys.includes(option) ? index : -1).filter(index => index >= 0);
            included = indices.length === keys.length && addMulti(prompt, options, indices);
          } else if (kind === 'fill-blank') {
            included = addBlanks(prompt, [q.expectedFill].concat(Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : []));
          } else if (kind === 'short-answer' || kind === 'self-explanation') {
            included = addEssay(prompt, plain(q.expectedAnswer || q.rubric));
            if (included) manualReview += 1;
          } else if (kind === 'sequence-sense') {
            const items = Array.isArray(q.items) ? q.items.map(plain).filter(Boolean) : [];
            const displayed = Array.isArray(q.presentedOrder) && q.presentedOrder.length === items.length ? q.presentedOrder.map(index => items[index]).filter(Boolean) : items;
            included = items.length >= 3 && addEssay(prompt + ' Displayed order: ' + displayed.join(' → ') + '. State whether it is correct and explain the ordering principle.', 'Expected order: ' + items.join(' → ') + (q.orderingPrinciple ? '. Principle: ' + plain(q.orderingPrinciple) : ''));
            if (included) {
              adapted += 1;
              manualReview += 1;
            }
          } else if (kind === 'relation-mismatch') {
            const pairs = Array.isArray(q.pairs) ? q.pairs.filter(pair => pair && plain(pair.left) && plain(pair.right)) : [];
            const wrong = Number(q.wrongPairIndex);
            const candidates = Array.isArray(q.candidatePartners) ? q.candidatePartners.map(plain).filter(Boolean) : [];
            const repair = candidates.indexOf(plain(q.correctPartnerForWrong));
            if (prompt && pairs.length >= 2 && Number.isInteger(wrong) && wrong >= 0 && wrong < pairs.length && candidates.length >= 2 && repair >= 0) {
              included = addMulti(prompt + ' Which displayed pair is the mismatch?', pairs.map(pair => plain(pair.left) + ' ↔ ' + plain(pair.right)), [wrong]) && addMulti('What should ' + plain(pairs[wrong].left) + ' pair with?', candidates, [repair]);
              if (included) adapted += 1;
            }
          } else if (kind === 'answer-evidence') {
            const answers = Array.isArray(q.answerOptions) ? q.answerOptions.map(plain) : [];
            const evidence = Array.isArray(q.evidenceOptions) ? q.evidenceOptions.map(plain) : [];
            const answerKey = answers.indexOf(plain(q.correctAnswer));
            const evidenceKey = evidence.indexOf(plain(q.correctEvidence));
            if (prompt && answers.length >= 2 && evidence.length >= 2 && answerKey >= 0 && evidenceKey >= 0) {
              included = addMulti(prompt, answers, [answerKey]) && addMulti(plain(q.evidencePrompt) || 'Which evidence best supports the answer?', evidence, [evidenceKey]);
              if (included) adapted += 1;
            }
          } else if (kind === 'numeric-response') {
            const expected = Number(q.correctValue);
            if (prompt && Number.isFinite(expected)) {
              const units = [q.unit].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(plain).filter(Boolean);
              if (Number(q.tolerance) > 0) {
                included = addEssay(prompt + ' This exported item requires manual review because H5P exact-answer fields do not preserve numeric tolerance.', String(expected) + (plain(q.unit) ? ' ' + plain(q.unit) : '') + ' (±' + Number(q.tolerance) + ')');
                if (included) manualReview += 1;
              } else {
                included = addBlanks(prompt, units.length ? units.map(unit => String(expected) + ' ' + unit) : [String(expected)]);
              }
              if (included) adapted += 1;
            }
          }
          if (!included) omitted += 1;
        });
        if (!questions.length) {
          addToast('No H5P-compatible assessment items are ready. Complete the prompts and answer keys before exporting.', "error");
          return false;
        }
        const dependencies = [{
          machineName: 'H5P.QuestionSet',
          majorVersion: 1,
          minorVersion: 21
        }];
        if (used.has('H5P.MultiChoice')) dependencies.push({
          machineName: 'H5P.MultiChoice',
          majorVersion: 1,
          minorVersion: 16
        });
        if (used.has('H5P.Blanks')) dependencies.push({
          machineName: 'H5P.Blanks',
          majorVersion: 1,
          minorVersion: 14
        });
        if (used.has('H5P.Essay')) dependencies.push({
          machineName: 'H5P.Essay',
          majorVersion: 1,
          minorVersion: 5
        });
        h5pJson = {
          title,
          language: h5pLanguage,
          mainLibrary: 'H5P.QuestionSet',
          embedTypes: ['iframe'],
          license: 'U',
          authorComments: 'Generated by AlloFlow. Requires H5P.QuestionSet 1.21 and the referenced child libraries on the destination.',
          preloadedDependencies: dependencies
        };
        contentJson = {
          introPage: {
            showIntroPage: false,
            title: richText(title),
            introduction: '',
            startButtonText: 'Start quiz'
          },
          progressType: 'textual',
          passPercentage: 70,
          questions,
          texts: {
            prevButton: 'Previous question',
            previous: 'Previous',
            nextButton: 'Next question',
            next: 'Next',
            finishButton: 'Finish',
            submitButton: 'Submit',
            textualProgress: 'Question: @current of @total questions',
            jumpToQuestion: 'Question %d of %total',
            questionLabel: 'Question',
            readSpeakerProgress: 'Question @current of @total',
            unansweredText: 'Unanswered',
            answeredText: 'Answered',
            currentQuestionText: 'Current question',
            navigationLabel: 'Questions',
            questionSetInstruction: 'Choose question to display'
          },
          disableBackwardsNavigation: false,
          randomQuestions: false,
          endGame: {
            showResultPage: true,
            showSolutionButton: true,
            showRetryButton: true,
            noResultMessage: 'Finished',
            message: 'Results',
            amountCorrect: '@finals of @totals correct',
            scoreBarLabel: 'You got @finals out of @totals points',
            scoreHeader: 'Score',
            overallFeedback: [{
              from: 0,
              to: 100,
              feedback: ''
            }]
          },
          solutionButtonText: 'Show solution',
          retryButtonText: 'Retry',
          finishButtonText: 'Finish',
          submitButtonText: 'Submit',
          override: {
            checkButton: true,
            showSolutionButton: 'on',
            retryButton: 'on'
          }
        };
        libraryLabel = 'H5P.QuestionSet 1.21 with ' + Array.from(used).join(', ');
        fileSuffix = 'quiz';
      }
    } else {
      const rawData = generatedContent && generatedContent.data;
      const rawCards = Array.isArray(rawData) ? rawData : Array.isArray(rawData?.cards) ? rawData.cards : Array.isArray(rawData?.items) ? rawData.items : [];
      const dialogs = rawCards.map((card, index) => {
        const front = plain(type === 'glossary' ? card?.term ?? card?.word ?? card?.phrase : card?.front ?? card?.term ?? card?.question);
        const back = plain(type === 'glossary' ? card?.def ?? card?.definition ?? card?.meaning : card?.back ?? card?.definition ?? card?.answer);
        if (!front || !back) {
          omitted += 1;
          return null;
        }
        const dialog = {
          text: richText(front),
          answer: richText(back),
          tips: {
            front: '',
            back: ''
          }
        };
        const imageValue = card?.image ?? card?.imageUrl ?? card?.png;
        const image = addEmbeddedAsset(imageValue, 'image', index);
        if (image) {
          dialog.image = image;
          const explicitAlt = plain(card?.imageAltText ?? card?.imageAlt ?? card?.alt);
          dialog.imageAltText = explicitAlt || front;
          if (!explicitAlt) derivedImageAltCount += 1;
        }
        const audioValue = card?.audio ?? card?.audioUrl ?? card?.pronunciationAudio;
        const audio = addEmbeddedAsset(audioValue, 'audio', index);
        if (audio) {
          dialog.audio = [audio];
          if (!plain(card?.audioTranscript ?? card?.transcript ?? card?.caption)) audioWithoutTranscriptCount += 1;
        }
        return dialog;
      }).filter(Boolean);
      if (!dialogs.length) {
        addToast('No complete term/definition or front/back pairs are ready for H5P export.', "error");
        return false;
      }
      h5pJson = {
        title,
        language: h5pLanguage,
        mainLibrary: 'H5P.Dialogcards',
        embedTypes: ['iframe'],
        license: 'U',
        authorComments: 'Generated by AlloFlow. Requires H5P.Dialogcards 1.9 on the destination.',
        preloadedDependencies: [{
          machineName: 'H5P.Dialogcards',
          majorVersion: 1,
          minorVersion: 9
        }]
      };
      contentJson = {
        title: richText(title),
        mode: 'normal',
        description: richText(tx('glossary.flashcards.study_instructions', 'Study each card, reveal the answer, and mark your progress.')),
        dialogs,
        behaviour: {
          enableRetry: true,
          disableBackwardsNavigation: false,
          scaleTextNotCard: false,
          randomCards: false,
          quickProgression: false
        },
        answer: tx('glossary.flashcards.turn', 'Turn'),
        next: tx('common.next', 'Next'),
        prev: tx('common.previous', 'Previous'),
        retry: tx('common.retry', 'Retry'),
        correctAnswer: tx('glossary.flashcards.got_it_right', 'I got it right!'),
        incorrectAnswer: tx('glossary.flashcards.got_it_wrong', 'I got it wrong'),
        round: tx('glossary.flashcards.round', 'Round @round'),
        cardsLeft: tx('glossary.flashcards.cards_left', 'Cards left: @number'),
        nextRound: tx('glossary.flashcards.next_round', 'Proceed to round @round'),
        startOver: tx('glossary.flashcards.start_over', 'Start over'),
        showSummary: tx('common.next', 'Next'),
        summary: tx('glossary.flashcards.summary', 'Summary'),
        summaryCardsRight: `${tx('common.correct', 'Correct')}:`,
        summaryCardsWrong: `${tx('common.incorrect', 'Incorrect')}:`,
        summaryCardsNotShown: tx('glossary.flashcards.not_shown', 'Cards in pool not shown:'),
        summaryOverallScore: tx('common.score', 'Score'),
        summaryCardsCompleted: tx('glossary.flashcards.completed', 'Cards you have completed learning:'),
        summaryCompletedRounds: tx('glossary.flashcards.completed_rounds', 'Completed rounds:'),
        summaryAllDone: tx('glossary.flashcards.all_done', 'Well done! You have mastered all @cards cards by getting them correct @max times!'),
        progressText: tx('glossary.flashcards.progress', 'Card @card of @total'),
        cardFrontLabel: tx('glossary.flashcards.front', 'Card front'),
        cardBackLabel: tx('glossary.flashcards.back', 'Card back'),
        tipButtonLabel: tx('glossary.flashcards.show_tip', 'Show tip'),
        audioNotSupported: tx('a11y.audio_not_supported', 'Your browser does not support this audio'),
        confirmStartingOver: {
          header: tx('glossary.flashcards.start_over_question', 'Start over?'),
          body: tx('glossary.flashcards.start_over_warning', 'All progress will be lost. Are you sure you want to start over?'),
          cancelLabel: tx('common.cancel', 'Cancel'),
          confirmLabel: tx('glossary.flashcards.start_over', 'Start over')
        }
      };
      libraryLabel = 'H5P.Dialogcards 1.9';
      fileSuffix = 'study-cards';
    }
    const accessibilityReport = _auditH5PAccessibility({
      h5pJson,
      contentJson,
      context: {
        derivedImageAltCount,
        audioWithoutTranscriptCount
      }
    });
    if (accessibilityReport.errors.length) {
      addToast(`H5P accessibility check blocked export: ${accessibilityReport.errors.length} critical issue(s). ${accessibilityReport.errors[0]}`, "error");
      return false;
    }
    if (accessibilityReport.repaired) {
      addToast(`${accessibilityReport.repaired} H5P accessibility issue(s) were repaired automatically.`, "info");
    }
    if (accessibilityReport.warnings.length) {
      addToast(`${accessibilityReport.warnings.length} H5P accessibility item(s) need human review: ${accessibilityReport.warnings.join(' ')}`, "warning");
    }
    const accessibilitySummary = ` Accessibility check: ${accessibilityReport.checks} checks, ${accessibilityReport.repaired} repaired, ${accessibilityReport.warnings.length} to review.`;
    const packageIssues = [];
    if (!h5pJson.title) packageIssues.push('title');
    if (!h5pJson.mainLibrary) packageIssues.push('mainLibrary');
    if (!Array.isArray(h5pJson.embedTypes) || !h5pJson.embedTypes.length) packageIssues.push('embedTypes');
    if (!Array.isArray(h5pJson.preloadedDependencies) || !h5pJson.preloadedDependencies.length) packageIssues.push('preloadedDependencies');
    if (!contentJson || typeof contentJson !== 'object') packageIssues.push('content/content.json');
    if (packageIssues.length) {
      addToast(`H5P package validation failed: ${packageIssues.join(', ')}.`, "error");
      return false;
    }
    if (omitted) addToast(`${omitted} incompatible or incomplete item(s) were omitted from the H5P package.`, "warning");
    if (adapted) addToast(`${adapted} assessment item(s) were adapted to equivalent H5P interactions.`, "info");
    if (manualReview) addToast(`${manualReview} exported written, sequence, or tolerance-based item(s) are ungraded and require manual review.`, "warning");
    if (mediaOmitted) addToast(`${mediaOmitted} external, unsupported, or oversized media asset(s) were omitted from the H5P package.`, "warning");
    try {
      const zip = new window.JSZip();
      zip.file('h5p.json', JSON.stringify(h5pJson, null, 2));
      zip.file('content/content.json', JSON.stringify(contentJson, null, 2));
      packagedAssets.forEach(asset => zip.file(`content/${asset.path}`, asset.base64, {
        base64: true
      }));
      const blob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: {
          level: 6
        }
      });
      const safeTitle = title.replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').substring(0, 60) || 'alloflow';
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${safeTitle}-${fileSuffix}.h5p`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      const mediaSummary = packagedAssets.length ? ` ${packagedAssets.length} embedded media asset(s) included.` : '';
      addToast(`H5P package ready.${mediaSummary}${accessibilitySummary} The destination must have ${libraryLabel} installed.`, "success");
      return true;
    } catch (error) {
      warnLog('H5P package generation failed', error);
      addToast('H5P package generation failed.', "error");
      return false;
    }
  };

  // ─── handleExportIMS ───────────────────────────────────────────────
  const handleExportIMS = async (options = {}) => {
    const {
      history,
      sourceTopic,
      studentResponses,
      generateResourceHTML,
      addToast,
      t
    } = liveRef.current;
    if (!window.JSZip) {
      addToast(t('export_status.lib_loading'), "error");
      return;
    }
    const sourceHistory = Array.isArray(history) ? history : [];
    const liveHtml = typeof options.liveHtml === 'string' ? options.liveHtml.trim() : '';
    const liveTitle = String(options.liveTitle || sourceTopic || t('export.ims_resource_pack') || 'AlloFlow Document').trim();
    if (sourceHistory.length === 0 && !liveHtml) {
      addToast(t('export_status.no_content'), "error");
      return;
    }
    addToast(t('export_status.packaging_ims'), "info");
    const zip = new window.JSZip();
    const manifestId = `MANIFEST-${Date.now()}`;
    const orgId = `ORG-${Date.now()}`;
    const defaultTitle = t('export.ims_resource_pack');
    const exportLang = _exportLanguage();
    const exportDir = _exportDirection();
    const packagedEntries = [];
    const skippedEntries = [];
    const safeManifestItem = (item, extra) => {
      try {
        return getInteractiveObjectManifestItem(item, extra);
      } catch (err) {
        warnLog('IMS manifest metadata fallback', err);
        return Object.assign({
          id: item && item.id ? String(item.id) : '',
          type: item && item.type ? String(item.type) : '',
          title: item && item.title ? String(item.title) : getDefaultTitle(item && item.type),
          status: 'partial',
          canExportHtml: false,
          canExportIms: false,
          notes: 'Manifest metadata fallback used after an adapter error.'
        }, extra || {});
      }
    };
    if (liveHtml) {
      packagedEntries.push({
        item: {
          id: 'builder-live-document',
          type: 'builder-document',
          title: liveTitle
        },
        html: liveHtml,
        profile: {
          type: 'builder-document',
          label: 'Builder document',
          status: 'ready',
          html: 'static',
          canExportHtml: true,
          canExportIms: true,
          interactiveHtml: false,
          qti: false,
          tracking: 'none',
          fallback: 'static-html',
          notes: 'Includes the current editable Builder preview.'
        },
        originalIndex: 0,
        completeDocument: true
      });
    } else sourceHistory.forEach((item, originalIndex) => {
      try {
        const profile = getInteractiveObjectProfileFor(item);
        if (!profile.canExportIms) {
          skippedEntries.push(safeManifestItem(item, {
            originalIndex,
            reason: 'no-ims-adapter'
          }));
          return;
        }
        const html = generateResourceHTML(item, false, studentResponses);
        if (html && String(html).trim() !== '') {
          packagedEntries.push({
            item,
            html,
            profile,
            originalIndex
          });
        } else {
          skippedEntries.push(safeManifestItem(item, {
            originalIndex,
            reason: 'empty-render'
          }));
        }
      } catch (err) {
        warnLog('IMS resource render failed', err);
        skippedEntries.push(safeManifestItem(item, {
          originalIndex,
          reason: 'render-error',
          error: String(err && err.message ? err.message : err).slice(0, 300)
        }));
      }
    });
    if (!packagedEntries.length) {
      addToast('No IMS-compatible resources are ready to package yet.', 'error');
      return;
    }
    let profileSummary;
    try {
      profileSummary = liveHtml ? {
        profileVersion: 'builder-live-document',
        total: 1,
        imsReady: 1,
        adapterNeeded: 0
      } : getInteractiveObjectProfileSummary(sourceHistory);
    } catch (err) {
      warnLog('IMS profile summary fallback', err);
      profileSummary = {
        profileVersion: 'export-fallback',
        total: sourceHistory.length,
        imsReady: packagedEntries.length,
        adapterNeeded: skippedEntries.length
      };
    }
    const manifestItemForEntry = (entry, extra) => entry.completeDocument ? Object.assign({}, entry.profile, {
      id: entry.item.id,
      type: entry.item.type,
      title: entry.item.title
    }, extra || {}) : safeManifestItem(entry.item, extra);
    const packageProfile = {
      kind: 'alloflow.ims-object-profile',
      generatedAt: new Date().toISOString(),
      topic: sourceTopic || defaultTitle,
      summary: profileSummary,
      packaged: packagedEntries.map((entry, idx) => manifestItemForEntry(entry, {
        originalIndex: entry.originalIndex,
        packageIndex: idx,
        filename: `resource_${idx}.html`,
        renderedInIms: true
      })),
      skipped: skippedEntries
    };
    zip.file("alloflow-object-profile.json", JSON.stringify(packageProfile, null, 2).replace(/</g, '\\u003c'));
    let resourcesXml = '';
    let itemsXml = '';
    packagedEntries.forEach((entry, idx) => {
      const item = entry.item;
      const idSeed = `${item && item.id ? item.id : 'item'}-${entry.originalIndex}-${idx}`;
      const itemId = _safeXmlIdentifier('ITEM', idSeed, idx);
      const resId = _safeXmlIdentifier('RES', idSeed, idx);
      const filename = `resource_${idx}.html`;
      const title = item.title || (entry.completeDocument ? liveTitle : getDefaultTitle(item.type));
      const titleXml = _escapeExportText(title);
      const resourceProfile = manifestItemForEntry(entry, {
        originalIndex: entry.originalIndex,
        packageIndex: idx,
        filename,
        renderedInIms: true
      });
      const contentHtml = entry.completeDocument ? entry.html : `
                <!DOCTYPE html>
                <html lang="${_escapeExportText(exportLang)}" dir="${exportDir}">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${titleXml}</title>
                    <script type="application/json" id="alloflow-interactive-object-profile">${_jsonForHtmlScript(resourceProfile)}</script>
                    <style>
                        body { font-family: system-ui, sans-serif; line-height: 1.6; padding: 20px; max-width: 800px; margin: 0 auto; }
                        img { max-width: 100%; height: auto; }
                        table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
                        th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
                        th { background-color: #f8f9fa; }
                        .resource-header { background: #f1f5f9; padding: 10px; border-radius: 5px; margin-bottom: 10px; font-weight: bold; color: #475569; }
                    </style>
                </head>
                <body>
                    ${entry.html}
                </body>
                </html>
            `;
      zip.file(filename, contentHtml);
      itemsXml += `<item identifier="${_escapeExportText(itemId)}" identifierref="${_escapeExportText(resId)}"><title>${titleXml}</title></item>`;
      resourcesXml += `<resource identifier="${_escapeExportText(resId)}" type="webcontent" href="${filename}"><file href="${filename}"/></resource>`;
    });
    const manifestTitle = _escapeExportText(sourceTopic || defaultTitle);
    const manifestDescription = _escapeExportText(`AlloFlow resource package: ${packagedEntries.length} packaged, ${skippedEntries.length} skipped. See alloflow-object-profile.json for static/interactive/LMS compatibility details.`);
    const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:lom="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2.xsd">
  <metadata>
    <schema>${_escapeExportText(t('common.ims_content') || 'IMS Content')}</schema>
    <schemaversion>1.1</schemaversion>
    <lom:lom>
      <lom:general>
        <lom:title>
          <lom:string language="${_escapeExportText(exportLang)}">${manifestTitle}</lom:string>
        </lom:title>
        <lom:description>
          <lom:string language="${_escapeExportText(exportLang)}">${manifestDescription}</lom:string>
        </lom:description>
      </lom:general>
    </lom:lom>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${manifestTitle}</title>
      ${itemsXml}
    </organization>
  </organizations>
  <resources>
    ${resourcesXml}
  </resources>
</manifest>`;
    zip.file("imsmanifest.xml", manifest);
    try {
      const content = await zip.generateAsync({
        type: "blob"
      });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `alloflow-package-${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      if (skippedEntries.length) {
        addToast(`IMS package created with ${skippedEntries.length} skipped resource(s). See alloflow-object-profile.json for details.`, "warning");
      } else {
        addToast(t('export_status.ims_success'), "success");
      }
    } catch (err) {
      warnLog("Package generation failed", err);
      addToast(t('export_status.package_error'), "error");
    }
  };

  // ─── handleExportSlides ───────────────────────────────────────────
  const handleExportSlides = async () => {
    const {
      history,
      sourceTopic,
      gradeLevel,
      addToast,
      t
    } = liveRef.current;
    if (!window.PptxGenJS) {
      addToast(t('export_status.ppt_lib_loading'), "error");
      return false;
    }
    if (history.length === 0) {
      addToast(t('export_status.no_content'), "error");
      return false;
    }
    addToast(t('export_status.ppt_generating'), "info");
    try {
      const pptx = new window.PptxGenJS();
      pptx.layout = 'LAYOUT_16x9';
      const themeColor = "4F46E5";
      const lightBg = "F8FAFC";
      const darkText = "1E293B";
      const lightText = "FFFFFF";
      const colorMap = {
        'indigo': '6366F1',
        'blue': '3B82F6',
        'green': '22C55E',
        'yellow': 'EAB308',
        'orange': 'F97316',
        'red': 'EF4444',
        'purple': 'A855F7',
        'pink': 'EC4899',
        'teal': '14B8A6',
        'cyan': '06B6D4',
        'emerald': '10B981',
        'rose': 'F43F5E'
      };
      pptx.defineSlideMaster({
        title: "MASTER_SLIDE",
        background: {
          color: lightBg
        },
        objects: [{
          rect: {
            x: 0,
            y: 0,
            w: "100%",
            h: 0.75,
            fill: {
              color: themeColor
            }
          }
        }, {
          placeholder: {
            options: {
              name: "slideTitle",
              type: "title",
              x: 0.5,
              y: 0.15,
              w: 9,
              h: 0.5,
              fontSize: 20,
              bold: true,
              color: lightText
            },
            text: ""
          }
        }, {
          rect: {
            x: 0,
            y: 5.25,
            w: "100%",
            h: 0.375,
            fill: {
              color: "E2E8F0"
            }
          }
        }, {
          text: {
            text: t('export.slides_master_footer'),
            options: {
              x: 0.5,
              y: 5.3,
              w: 4,
              h: 0.3,
              fontSize: 11,
              color: "64748B"
            }
          }
        }, {
          slideNumber: {
            x: 9.0,
            y: 5.3,
            fontSize: 11,
            color: "64748B"
          }
        }]
      });
      pptx.defineSlideMaster({
        title: "MASTER_TITLE",
        background: {
          color: themeColor
        },
        objects: [{
          placeholder: {
            options: {
              name: "deckTitle",
              type: "title",
              x: 0.5,
              y: 1.5,
              w: 9,
              h: 2,
              fontSize: 44,
              fontFace: 'Arial',
              color: lightText,
              bold: true,
              align: 'center',
              valign: 'middle'
            },
            text: ""
          }
        }]
      });
      pptx.title = sourceTopic || t('export.slides_title_default');
      pptx.subject = t('export.slides_subject');
      pptx.author = "AlloFlow";
      pptx.lang = document.documentElement && document.documentElement.lang || 'en';
      const addA11yNotes = (slide, title, content) => {
        try {
          slide.addNotes(title + (content ? ': ' + content.substring(0, 500) : ''));
        } catch (e) {}
      };
      const addSlideTitle = (slide, text) => slide.addText(text, {
        placeholder: 'slideTitle'
      });
      const titleSlide = pptx.addSlide({
        masterName: "MASTER_TITLE"
      });
      titleSlide.background = {
        color: themeColor
      };
      addA11yNotes(titleSlide, 'Title: ' + (sourceTopic || 'Lesson'), 'Grade level: ' + gradeLevel);
      titleSlide.addText(sourceTopic || t('export.slides_title_default'), {
        placeholder: 'deckTitle'
      });
      titleSlide.addText(`${t('export.ppt_grade_level')}: ${gradeLevel} | ${t('export.ppt_generated')}: ${new Date().toLocaleDateString()}`, {
        x: 0.5,
        y: 3.5,
        w: 9,
        h: 0.5,
        fontSize: 18,
        fontFace: 'Arial',
        color: 'E0E7FF',
        align: 'center'
      });
      const chunkText = (value, limit) => {
        const chunks = [];
        let remaining = String(value || '').trim();
        const max = Math.max(120, limit || 700);
        while (remaining.length > max) {
          let at = remaining.lastIndexOf(' ', max);
          if (at < max * 0.55) at = remaining.indexOf(' ', max);
          if (at < 1) at = max;
          chunks.push(remaining.slice(0, at).trim());
          remaining = remaining.slice(at).trim();
        }
        if (remaining) chunks.push(remaining);
        return chunks;
      };
      const resourceText = (value, seen) => {
        if (value == null) return '';
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
        if (typeof value !== 'object') return '';
        seen = seen || new Set();
        if (seen.has(value)) return '';
        seen.add(value);
        const parts = Array.isArray(value) ? value.map(v => resourceText(v, seen)) : Object.keys(value).filter(k => !/^(id|color|imageUrl|url)$/i.test(k)).map(k => resourceText(value[k], seen));
        return parts.filter(Boolean).join('\n');
      };
      history.forEach(item => {
        const type = item.type;
        const itemTitle = item.title || getDefaultTitle(type);
        if (type === 'simplified') {
          const textData = typeof item.data === 'string' ? item.data : '';
          if (!textData) return;
          const paragraphs = textData.split(/\n{2,}/).flatMap(paragraph => chunkText(paragraph, 700));
          let currentSlideObjects = [];
          let currentSlideLen = 0;
          const MAX_SLIDE_CHARS = 900;
          paragraphs.forEach(para => {
            const rawText = para.replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/\*\*/g, '').replace(/\*/g, '');
            if (currentSlideLen + rawText.length > MAX_SLIDE_CHARS && currentSlideObjects.length > 0) {
              const slide = pptx.addSlide({
                masterName: "MASTER_SLIDE"
              });
              addA11yNotes(slide, itemTitle, rawText.substring(0, 300));
              addSlideTitle(slide, itemTitle);
              slide.addText(currentSlideObjects, {
                x: 0.5,
                y: 1.0,
                w: 9,
                h: 4.0,
                fontSize: 14,
                color: darkText,
                valign: 'top',
                align: 'left',
                lineSpacing: 18,
                fit: 'shrink',
                margin: 0.05
              });
              currentSlideObjects = [];
              currentSlideLen = 0;
            }
            if (currentSlideObjects.length > 0) {
              currentSlideObjects.push({
                text: "\n\n"
              });
              currentSlideLen += 2;
            }
            const parts = para.split(/(\[.*?\]\(.*?\))/g);
            parts.forEach(part => {
              const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
              if (linkMatch) {
                currentSlideObjects.push({
                  text: linkMatch[1],
                  options: {
                    hyperlink: {
                      url: linkMatch[2]
                    },
                    color: "3B82F6"
                  }
                });
              } else if (part) {
                currentSlideObjects.push({
                  text: part.replace(/\*\*/g, '').replace(/\*/g, '')
                });
              }
            });
            currentSlideLen += rawText.length;
          });
          if (currentSlideObjects.length > 0) {
            const slide = pptx.addSlide({
              masterName: "MASTER_SLIDE"
            });
            addA11yNotes(slide, itemTitle, textData.substring(0, 300));
            addSlideTitle(slide, itemTitle);
            slide.addText(currentSlideObjects, {
              x: 0.5,
              y: 1.0,
              w: 9,
              h: 4.0,
              fontSize: 14,
              color: darkText,
              valign: 'top',
              align: 'left',
              lineSpacing: 18
            });
          }
        } else if (type === 'glossary') {
          const entries = Array.isArray(item.data) ? item.data : [];
          const hasTrans = entries.some(entry => entry.translations && Object.keys(entry.translations).length > 0);
          const header = hasTrans ? [{
            text: t('export.term_col'),
            options: {
              bold: true,
              fill: "F1F5F9",
              color: darkText
            }
          }, {
            text: t('export.def_col'),
            options: {
              bold: true,
              fill: "F1F5F9",
              color: darkText
            }
          }, {
            text: t('export.trans_col'),
            options: {
              bold: true,
              fill: "F1F5F9",
              color: darkText
            }
          }] : [{
            text: t('export.term_col'),
            options: {
              bold: true,
              fill: "F1F5F9",
              color: darkText
            }
          }, {
            text: t('export.def_col'),
            options: {
              bold: true,
              fill: "F1F5F9",
              color: darkText
            }
          }];
          const pages = [];
          let page = [],
            pageLines = 0;
          entries.forEach(entry => {
            const translations = hasTrans && entry.translations ? Object.values(entry.translations).join(' / ') : '';
            const row = hasTrans ? [entry.term || '', entry.def || '', translations] : [entry.term || '', entry.def || ''];
            const rowLines = Math.max(1, ...row.map(cell => Math.ceil(String(cell).length / (hasTrans ? 34 : 48))));
            if (page.length && (page.length >= 7 || pageLines + rowLines > 10)) {
              pages.push(page);
              page = [];
              pageLines = 0;
            }
            page.push(row);
            pageLines += rowLines;
          });
          if (page.length || !pages.length) pages.push(page);
          pages.forEach((pageEntries, pageIndex) => {
            const slide = pptx.addSlide({
              masterName: "MASTER_SLIDE"
            });
            addSlideTitle(slide, itemTitle + (pageIndex ? ' (Cont.)' : ''));
            addA11yNotes(slide, itemTitle, 'Glossary terms: ' + pageEntries.slice(0, 5).map(row => row[0]).join(', '));
            if (!pageEntries.length) {
              slide.addText(t('export.no_content') || 'No glossary entries.', {
                x: 0.6,
                y: 1.1,
                w: 8.8,
                h: 0.7,
                fontSize: 16,
                color: darkText,
                fit: 'shrink'
              });
              return;
            }
            slide.addTable([header].concat(pageEntries), {
              x: 0.5,
              y: 1.0,
              w: 9,
              colW: hasTrans ? [2, 4.5, 2.5] : [2.5, 6.5],
              border: {
                pt: 0.75,
                color: "CBD5E1"
              },
              fill: {
                color: "FFFFFF"
              },
              fontSize: hasTrans ? 9.5 : 10.5,
              color: darkText,
              autoPage: false,
              margin: 0.04,
              valign: 'middle'
            });
          });
        } else if (type === 'quiz') {
          const questions = item.data.questions || [];
          questions.forEach((q, i) => {
            const slide = pptx.addSlide({
              masterName: "MASTER_SLIDE"
            });
            addSlideTitle(slide, t('export.slides_question_title', {
              number: i + 1
            }));
            slide.addText(q.question, {
              x: 0.5,
              y: 1.0,
              w: 9,
              h: 1.2,
              fontSize: 18,
              bold: true,
              color: darkText,
              valign: 'top',
              fit: 'shrink',
              margin: 0.04
            });
            q.options.forEach((opt, idx) => {
              const yPos = 2.3 + idx * 0.7;
              slide.addShape(pptx.ShapeType.rect, {
                x: 1.0,
                y: yPos,
                w: 8,
                h: 0.55,
                fill: {
                  color: "FFFFFF"
                },
                line: {
                  color: "CBD5E1",
                  width: 1
                }
              });
              slide.addShape(pptx.ShapeType.ellipse, {
                x: 1.1,
                y: yPos + 0.1,
                w: 0.35,
                h: 0.35,
                fill: {
                  color: "E0E7FF"
                },
                line: {
                  color: themeColor
                }
              });
              slide.addText(String.fromCharCode(65 + idx), {
                x: 1.1,
                y: yPos + 0.1,
                w: 0.35,
                h: 0.35,
                fontSize: 12,
                bold: true,
                color: themeColor,
                align: 'center',
                valign: 'middle'
              });
              slide.addText(opt, {
                x: 1.6,
                y: yPos,
                w: 7.2,
                h: 0.55,
                fontSize: 14,
                color: darkText,
                valign: 'middle',
                fit: 'shrink',
                margin: 0.03
              });
            });
            slide.addNotes(`${t('export.ppt_correct_note')}: ${q.correctAnswer}\n\n${q.factCheck || ''}`);
          });
          const ANSWERS_PER_SLIDE = 6;
          for (let ak = 0; ak < questions.length; ak += ANSWERS_PER_SLIDE) {
            const akChunk = questions.slice(ak, ak + ANSWERS_PER_SLIDE);
            const akSlide = pptx.addSlide({
              masterName: "MASTER_SLIDE"
            });
            addSlideTitle(akSlide, ak === 0 ? `${itemTitle} — ${t('export.answer_key_title') || 'Answer Key'}` : `${itemTitle} — ${t('export.answer_key_title') || 'Answer Key'} (${t('common.continued') || 'Cont.'})`);
            const akRichText = [];
            akChunk.forEach((q, idx) => {
              const qNum = ak + idx + 1;
              const correctLetter = q.options ? String.fromCharCode(65 + q.options.indexOf(q.correctAnswer)) : '?';
              akRichText.push({
                text: `Q${qNum}: ${correctLetter}) ${q.correctAnswer || ''}`,
                options: {
                  fontSize: 13,
                  bold: true,
                  color: "16A34A",
                  breakLine: true,
                  bullet: false
                }
              });
              if (q.factCheck) {
                akRichText.push({
                  text: cleanTextForPptx(q.factCheck),
                  options: {
                    fontSize: 10,
                    color: "64748B",
                    breakLine: true,
                    italic: true,
                    bullet: false,
                    paraSpaceAfter: 10
                  }
                });
              }
            });
            akSlide.addNotes('Answer Key: ' + akChunk.map(function (q, i) {
              return 'Q' + (ak + i + 1) + ': ' + q.correctAnswer;
            }).join(', '));
            akSlide.addText(akRichText, {
              x: 0.5,
              y: 1.0,
              w: 9,
              h: 4.0,
              valign: 'top',
              fit: 'shrink',
              margin: 0.04
            });
          }
        } else if (type === 'image' && item.data.imageUrl) {
          const slide = pptx.addSlide({
            masterName: "MASTER_SLIDE"
          });
          addSlideTitle(slide, itemTitle);
          slide.addImage({
            data: item.data.imageUrl,
            x: 'center',
            y: 1.0,
            w: 8,
            h: 3.5,
            sizing: {
              type: 'contain',
              w: 9,
              h: 3.5
            },
            altText: item.data.prompt || item.title || 'Visual support image'
          });
          slide.addText(item.data.prompt, {
            x: 0.5,
            y: 4.6,
            w: 9,
            h: 0.6,
            fontSize: 10,
            color: "64748B",
            italic: true,
            align: 'center',
            valign: 'top',
            fit: 'shrink',
            margin: 0.03
          });
          addA11yNotes(slide, itemTitle, 'Image: ' + (item.data.prompt || ''));
        } else if (type === 'outline') {
          const slide = pptx.addSlide({
            masterName: "MASTER_SLIDE"
          });
          addSlideTitle(slide, item.data.main || itemTitle);
          const richText = [];
          const branches = Array.isArray(item.data.branches) ? item.data.branches : [];
          branches.forEach(b => {
            richText.push({
              text: b.title,
              options: {
                fontSize: 16,
                bold: true,
                breakLine: true,
                color: themeColor,
                bullet: {
                  type: 'number',
                  color: themeColor
                }
              }
            });
            if (Array.isArray(b.items)) {
              b.items.forEach(sub => {
                richText.push({
                  text: sub,
                  options: {
                    fontSize: 14,
                    breakLine: true,
                    color: darkText,
                    bullet: {
                      code: '2022',
                      color: "94A3B8"
                    },
                    indentLevel: 1
                  }
                });
              });
            }
          });
          addA11yNotes(slide, item.data.main || itemTitle, 'Graphic organizer with ' + branches.length + ' branches');
          slide.addText(richText, {
            x: 0.5,
            y: 1.0,
            w: 9,
            h: 4.2,
            valign: 'top',
            fit: 'shrink',
            margin: 0.04
          });
        } else if (type === 'timeline') {
          const slide = pptx.addSlide({
            masterName: "MASTER_SLIDE"
          });
          addSlideTitle(slide, itemTitle);
          const timelineItems = item.data || [];
          addA11yNotes(slide, itemTitle, 'Timeline with ' + (item.data || []).length + ' events');
          const ITEMS_PER_SLIDE = 5;
          for (let i = 0; i < timelineItems.length; i += ITEMS_PER_SLIDE) {
            const chunk = timelineItems.slice(i, i + ITEMS_PER_SLIDE);
            const isContinuation = i > 0;
            const currentSlide = isContinuation ? pptx.addSlide({
              masterName: "MASTER_SLIDE"
            }) : slide;
            if (isContinuation) {
              addSlideTitle(currentSlide, itemTitle + " (Cont.)");
            }
            chunk.forEach((tItem, idx) => {
              const yBase = 1.0 + idx * 0.8;
              currentSlide.addShape(pptx.ShapeType.line, {
                x: 1.0,
                y: yBase,
                w: 0,
                h: 0.8,
                line: {
                  color: "CBD5E1",
                  width: 2
                }
              });
              currentSlide.addShape(pptx.ShapeType.ellipse, {
                x: 0.9,
                y: yBase,
                w: 0.2,
                h: 0.2,
                fill: {
                  color: themeColor
                }
              });
              currentSlide.addText(tItem.date, {
                x: 1.3,
                y: yBase - 0.1,
                w: 2.0,
                h: 0.4,
                fontSize: 12,
                bold: true,
                color: themeColor
              });
              currentSlide.addText(tItem.event, {
                x: 3.4,
                y: yBase - 0.1,
                w: 6.0,
                h: 0.6,
                fontSize: 12,
                color: darkText,
                valign: 'top',
                fit: 'shrink',
                margin: 0.03
              });
            });
          }
        } else if (type === 'concept-sort') {
          let categories = Array.isArray(item.data && item.data.categories) ? item.data.categories.slice() : [];
          const items = Array.isArray(item.data && item.data.items) ? item.data.items : [];
          const known = new Set(categories.map(category => category.id));
          if (items.some(entry => !known.has(entry.categoryId))) categories.push({
            id: '__uncategorized',
            label: t('export.uncategorized') || 'Uncategorized',
            color: ''
          });
          if (!categories.length) {
            const slide = pptx.addSlide({
              masterName: "MASTER_SLIDE"
            });
            addSlideTitle(slide, itemTitle);
            slide.addText(t('export.no_categories') || 'No categories were provided.', {
              x: 0.6,
              y: 1.1,
              w: 8.8,
              h: 0.7,
              fontSize: 16,
              color: darkText,
              fit: 'shrink'
            });
          }
          const categoryGroups = [];
          for (let start = 0; start < categories.length; start += 4) categoryGroups.push(categories.slice(start, start + 4));
          categoryGroups.forEach((group, groupIndex) => {
            const lists = group.map(category => items.filter(entry => category.id === '__uncategorized' ? !known.has(entry.categoryId) : entry.categoryId === category.id));
            const pageCount = Math.max(1, ...lists.map(list => Math.ceil(list.length / 6)));
            for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
              const slide = pptx.addSlide({
                masterName: "MASTER_SLIDE"
              });
              const continuation = groupIndex > 0 || pageIndex > 0;
              addSlideTitle(slide, itemTitle + (continuation ? ' (Cont.)' : ''));
              const colWidth = 9 / group.length;
              group.forEach((category, categoryIndex) => {
                const xPos = 0.5 + categoryIndex * colWidth;
                let headerColor = "E0E7FF";
                if (category.color) {
                  const colorName = category.color.replace('bg-', '').replace('-500', '');
                  if (colorMap[colorName]) headerColor = colorMap[colorName];
                }
                slide.addShape(pptx.ShapeType.rect, {
                  x: xPos + 0.08,
                  y: 1.0,
                  w: colWidth - 0.16,
                  h: 0.52,
                  fill: {
                    color: headerColor
                  },
                  line: {
                    color: 'CBD5E1',
                    width: 0.75
                  }
                });
                slide.addText(category.label || '', {
                  x: xPos + 0.12,
                  y: 1.04,
                  w: colWidth - 0.24,
                  h: 0.42,
                  fontSize: 13,
                  bold: true,
                  color: darkText,
                  align: 'center',
                  valign: 'mid',
                  fit: 'shrink',
                  margin: 0.02
                });
                lists[categoryIndex].slice(pageIndex * 6, pageIndex * 6 + 6).forEach((entry, itemIndex) => {
                  const yOffset = 1.62 + itemIndex * 0.58;
                  slide.addText(entry.content || '', {
                    x: xPos + 0.08,
                    y: yOffset,
                    w: colWidth - 0.16,
                    h: 0.48,
                    fontSize: 10.5,
                    color: "475569",
                    align: 'center',
                    valign: 'mid',
                    fit: 'shrink',
                    margin: 0.03,
                    shape: pptx.ShapeType.rect,
                    fill: {
                      color: "FFFFFF"
                    },
                    line: {
                      color: "E2E8F0",
                      width: 0.6
                    }
                  });
                });
              });
              addA11yNotes(slide, itemTitle, group.map((category, index) => category.label + ': ' + lists[index].slice(pageIndex * 6, pageIndex * 6 + 6).map(entry => entry.content).join(', ')).join('; '));
            }
          });
        } else if (type === 'faq' || type === 'brainstorm' || type === 'sentence-frames') {
          const text = resourceText(item.data).replace(/\n{3,}/g, '\n\n').trim();
          const chunks = chunkText(text || itemTitle, 760);
          chunks.forEach((chunk, index) => {
            const slide = pptx.addSlide({
              masterName: "MASTER_SLIDE"
            });
            addSlideTitle(slide, itemTitle + (index ? ' (Cont.)' : ''));
            addA11yNotes(slide, itemTitle, chunk);
            slide.addText(chunk, {
              x: 0.6,
              y: 1.0,
              w: 8.8,
              h: 3.9,
              fontSize: 17,
              color: darkText,
              valign: 'top',
              breakLine: true,
              margin: 0.08,
              fit: 'shrink'
            });
          });
        }
      });
      const safeTopic = sourceTopic ? sourceTopic.replace(/[^a-z0-9]/gi, '_').substring(0, 20) : 'Lesson';
      await pptx.writeFile({
        fileName: `${t('export.filenames.slides_prefix')}-${safeTopic}.pptx`
      });
      addToast(t('export_status.ppt_success'), "success");
      return true;
    } catch (e) {
      warnLog("PPTX Export Error", e);
      addToast(t('export_status.ppt_error'), "error");
      return false;
    }
  };

  // ─── handleExportStorybook ────────────────────────────────────────
  const handleExportStorybook = async (rawOptions = false) => {
    const options = _normalizeStorybookExportOptions(rawOptions);
    const {
      includeImages,
      includeNarration
    } = options;
    const current = liveRef.current || {};
    const {
      adventureState,
      sourceTopic,
      generatedContent,
      setShowStorybookExportModal,
      setIsProcessing,
      rehydrateHistoryWithImages,
      parseMarkdownToHTML,
      prepareReadAloudArtifactAudio,
      selectedVoice,
      voiceSpeed,
      leveledTextLanguage,
      currentUiLanguage,
      addToast,
      t
    } = current;
    if (!adventureState || !Array.isArray(adventureState.history) && !adventureState.currentScene) return false;
    if ((!adventureState.history || adventureState.history.length === 0) && !adventureState.currentScene) return false;
    if (!options.keepModalOpen && typeof setShowStorybookExportModal === 'function') setShowStorybookExportModal(false);
    if (typeof setIsProcessing === 'function') setIsProcessing(true);
    if (typeof addToast === 'function') addToast(t('adventure.storybook_toast_writing'), "info");
    _storybookProgress(options, {
      phase: 'story',
      message: 'Preparing your Storybook…'
    });
    try {
      const hydrated = typeof rehydrateHistoryWithImages === 'function' ? await rehydrateHistoryWithImages(adventureState.history || [], adventureState.imageCache || {}) : (adventureState.history || []).slice();
      const fullStory = Array.isArray(hydrated) ? hydrated.slice() : [];
      if (adventureState.currentScene) {
        fullStory.push({
          type: 'scene',
          text: adventureState.currentScene.text,
          image: adventureState.sceneImage
        });
      }
      const historyText = fullStory.map(entry => entry.type === 'scene' ? `Scene: ${entry.text}` : entry.type === 'choice' ? `Student Action: ${entry.text}` : `Outcome/Feedback: ${entry.text}`).join('\n\n');
      const prompt = `
              You are a storyteller writing an epilogue for a student's educational adventure.
              Topic: ${sourceTopic || "General"}
              Student's Journey Log:
              ${historyText.substring(0, 15000)}
              Task: Write a consolidated, engaging narrative summary of their journey (2-3 paragraphs).
              Highlight their key decisions and the final outcome.
              Write in the second person ("You started by... then you decided to...").
              Return ONLY the narrative text.
            `;
      const summary = String((await window.callGemini(prompt)) || '').trim();
      const title = String(sourceTopic || t('adventure.title'));
      const date = new Date().toLocaleDateString();
      const strPageTitle = t('export.storybook.page_title', {
        title
      });
      const strSubtitle = t('export.storybook.subtitle');
      const strMeta = t('export.storybook.meta_info', {
        date,
        level: adventureState.level
      });
      const strEpilogue = t('export.storybook.epilogue_badge');
      const strLogHeader = t('export.storybook.log_header');
      const strPrint = t('export.storybook.print_button');
      const strFooter = t('output.generated_via');
      const strUser = t('export.storybook.user_label');
      const strSeparator = t('export.storybook.chapter_separator');
      const normalizedScenes = _normalizeStorybookScenes(fullStory, summary, {
        epilogueTitle: String(strEpilogue || 'Epilogue'),
        sceneTitle: 'Scene',
        studentSpeaker: String(strUser || 'Student')
      });
      const exportLang = _exportLanguage();
      const exportDir = _exportDirection();
      const ts = Date.now();
      const createdAt = new Date(ts).toISOString();
      const fileTitle = title.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'adventure-storybook';
      const htmlFilename = `${fileTitle}-storybook-${ts}.html`;
      const jsonFilename = `${fileTitle}-storybook-read-aloud-${ts}.json`;
      const contract = window.AlloModules && window.AlloModules.ReadAloudArtifactContract;
      let readAloudArtifact = null;
      let serializedReadAloudArtifact = '';
      let readAloudStats = {
        audioClips: 0,
        totalAudioBytes: 0
      };
      let narrationWarning = '';
      if (includeNarration) {
        if (!contract || typeof contract.buildAdventureStorybookArtifact !== 'function' || typeof contract.serializeReadAloudArtifact !== 'function') {
          narrationWarning = 'Narration export is not available in this build yet. The complete text Storybook will still be downloaded.';
          if (typeof warnLog === 'function') warnLog('Storybook narration contract unavailable');
        } else {
          const identitySeed = generatedContent && generatedContent.id ? String(generatedContent.id) : String(sourceTopic || title || 'adventure');
          const storyId = contract.stableIdFromParts('adventure-story', [identitySeed]);
          const resourceId = generatedContent && generatedContent.id ? contract.stableIdFromParts('adventure-resource', [String(generatedContent.id)]) : null;
          const makeArtifactInput = acceptedAudio => ({
            storyId,
            resourceId,
            title,
            language: exportLang,
            scenes: _storybookContractScenes(normalizedScenes, acceptedAudio)
          });
          try {
            readAloudArtifact = contract.buildAdventureStorybookArtifact(makeArtifactInput({}));
            if (typeof prepareReadAloudArtifactAudio === 'function') {
              if (options.signal && options.signal.aborted) {
                const abortError = new Error('Storybook export cancelled.');
                abortError.name = 'AbortError';
                throw abortError;
              }
              const totalSegments = normalizedScenes.reduce((count, scene) => count + scene.segments.length, 0);
              _storybookProgress(options, {
                phase: 'narration',
                completed: 0,
                total: totalSegments,
                message: 'Preparing narrated audio…'
              });
              let prepared;
              try {
                const narrationVoice = String(selectedVoice || 'Kore');
                const narrationLanguage = String(leveledTextLanguage || currentUiLanguage || exportLang || 'English');
                const numericSpeed = Number(voiceSpeed);
                const narrationSpeed = Number.isFinite(numericSpeed) && numericSpeed > 0 ? numericSpeed : 1;
                prepared = await prepareReadAloudArtifactAudio({
                  ownerApproved: true,
                  resourceId: storyId,
                  resourceType: 'adventure-storybook-read-aloud',
                  adapterId: 'adventure-storybook-artifact',
                  scopeId: 'story',
                  source: 'adventure-owner-export',
                  defaultVoice: narrationVoice,
                  language: narrationLanguage,
                  speed: narrationSpeed,
                  segments: normalizedScenes.flatMap(scene => scene.segments.map(segment => ({
                    segmentId: segment.segmentId,
                    text: segment.text,
                    voice: narrationVoice,
                    language: narrationLanguage,
                    speed: narrationSpeed
                  }))),
                  signal: options.signal,
                  onProgress: progress => {
                    const update = progress && typeof progress === 'object' ? progress : {};
                    const completed = Number.isFinite(Number(update.completed)) ? Number(update.completed) : 0;
                    const total = Number.isFinite(Number(update.total)) ? Number(update.total) : totalSegments;
                    _storybookProgress(options, {
                      phase: 'narration',
                      completed,
                      total,
                      message: update.message || (total ? `Preparing narration ${Math.min(completed, total)} of ${total}…` : 'Preparing narrated audio…')
                    });
                  }
                });
              } catch (audioError) {
                if (audioError && audioError.name === 'AbortError') throw audioError;
                if (typeof warnLog === 'function') warnLog('Storybook narration preparation failed', audioError);
                narrationWarning = 'Narrated audio could not be prepared. The complete text Storybook will still be downloaded.';
              }
              const preparedAudio = _storybookAudioResultMap(prepared);
              const acceptedAudio = {};
              let rejectedClips = 0;
              normalizedScenes.forEach(scene => scene.segments.forEach(segment => {
                const audio = preparedAudio[segment.segmentId];
                if (!audio) return;
                acceptedAudio[segment.segmentId] = audio;
                try {
                  readAloudArtifact = contract.buildAdventureStorybookArtifact(makeArtifactInput(acceptedAudio));
                } catch (clipError) {
                  delete acceptedAudio[segment.segmentId];
                  rejectedClips += 1;
                  if (typeof warnLog === 'function') warnLog(`Storybook narration clip rejected: ${segment.segmentId}`, clipError);
                }
              }));
              readAloudArtifact = contract.buildAdventureStorybookArtifact(makeArtifactInput(acceptedAudio));
              if (rejectedClips) {
                narrationWarning = `${rejectedClips} narration clip${rejectedClips === 1 ? '' : 's'} could not be included. The Storybook text remains complete.`;
              } else if (!Object.keys(acceptedAudio).length && !narrationWarning) {
                narrationWarning = 'No narrated audio was returned. The complete text Storybook will still be downloaded.';
              }
            } else {
              narrationWarning = 'Narration is not connected in this build yet. The complete text Storybook will still be downloaded.';
              if (typeof warnLog === 'function') warnLog('prepareReadAloudArtifactAudio was not injected for Storybook export');
            }
            serializedReadAloudArtifact = contract.serializeReadAloudArtifact(readAloudArtifact);
            if (typeof contract.validateReadAloudArtifact === 'function') {
              const validation = contract.validateReadAloudArtifact(readAloudArtifact);
              if (validation && validation.ok && validation.stats) readAloudStats = validation.stats;
            }
          } catch (contractError) {
            if (contractError && contractError.name === 'AbortError') throw contractError;
            if (typeof warnLog === 'function') warnLog('Storybook read-aloud artifact could not be built', contractError);
            readAloudArtifact = null;
            serializedReadAloudArtifact = '';
            narrationWarning = 'Narration could not be packaged safely. The complete text Storybook will still be downloaded.';
          }
        }
        if (narrationWarning && typeof addToast === 'function') addToast(narrationWarning, 'warning');
      }
      const artifactAudioBySegmentId = {};
      if (readAloudArtifact) {
        readAloudArtifact.scenes.forEach(scene => scene.segments.forEach(segment => {
          if (segment.audio) artifactAudioBySegmentId[segment.segmentId] = segment.audio;
        }));
      }
      const safeTitle = _escapeExportText(title);
      const safePageTitle = _escapeExportText(strPageTitle);
      const safeEpilogue = _escapeExportText(strEpilogue);
      const safeUser = _escapeExportText(strUser);
      const safeSeparator = _escapeExportText(strSeparator);
      const renderMarkdown = value => {
        if (typeof parseMarkdownToHTML === 'function') return parseMarkdownToHTML(value);
        return `<p>${_escapeExportText(value)}</p>`;
      };
      const renderAudio = (segment, sceneTitle) => {
        const audio = artifactAudioBySegmentId[segment.segmentId];
        if (!audio) return '';
        return `<audio class="narration-audio" controls preload="metadata" aria-label="${_escapeExportText(`Narration for ${sceneTitle}`)}"><source src="data:${_escapeExportText(audio.mime)};base64,${audio.base64}" type="${_escapeExportText(audio.mime)}" /></audio>`;
      };
      const epilogueScene = normalizedScenes.find(scene => scene.sceneId === 'epilogue');
      const journeyScenes = normalizedScenes.filter(scene => scene.sceneId !== 'epilogue');
      const epilogueHtml = epilogueScene ? epilogueScene.segments.map(segment => `${renderMarkdown(segment.text)}${renderAudio(segment, epilogueScene.title)}`).join('') : renderMarkdown(summary);
      let chaptersHtml = '';
      journeyScenes.forEach((scene, sceneIndex) => {
        const safeImage = /^(?:data:image\/(?:png|jpeg|jpg|gif|webp);base64,|blob:|https?:\/\/)/i.test(String(scene.image || '')) ? String(scene.image) : '';
        const segmentHtml = scene.segments.map(segment => {
          const audioHtml = renderAudio(segment, scene.title);
          if (segment.kind === 'choice') {
            return `<div class="choice" data-segment-id="${_escapeExportText(segment.segmentId)}">${safeUser}: ${_escapeExportText(segment.text)}${audioHtml}</div>`;
          }
          if (segment.kind === 'feedback') {
            return `<div class="feedback" data-segment-id="${_escapeExportText(segment.segmentId)}">${_escapeExportText(segment.text)}${audioHtml}</div>`;
          }
          return `<div class="scene" data-segment-id="${_escapeExportText(segment.segmentId)}">${renderMarkdown(segment.text)}${audioHtml}</div>`;
        }).join('');
        chaptersHtml += `
                  <div class="chapter" data-scene-id="${_escapeExportText(scene.sceneId)}">
                      ${includeImages && safeImage ? `<img loading="lazy" src="${_escapeExportText(safeImage)}" class="scene-img" alt="Scene visualization" />` : ''}
                      ${segmentHtml}
                  </div>
                  ${sceneIndex < journeyScenes.length - 1 ? `<div class="chapter-separator">${safeSeparator}</div>` : ''}
                `;
      });
      const embeddedArtifact = serializedReadAloudArtifact ? `<script type="application/json" id="alloflow-read-aloud-artifact">${_jsonForHtmlScript(readAloudArtifact)}</script>` : '';
      const storyHtml = `
              <!DOCTYPE html>
              <html lang="${_escapeExportText(exportLang)}" dir="${exportDir}">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>${safePageTitle}</title>
                  <style>
                      body { font-family: 'Georgia', serif; line-height: 1.8; color: #2c3e50; max-width: 800px; margin: 0 auto; padding: 40px; background: #fffdf5; }
                      .cover { text-align: center; padding: 60px 0; border-bottom: 4px double #d4af37; margin-bottom: 40px; }
                      h1 { font-size: 3em; margin-bottom: 10px; color: #2c3e50; font-family: sans-serif; }
                      .meta { font-style: italic; color: #7f8c8d; }
                      .summary-box { background: white; padding: 40px; border: 1px solid #e0e0e0; border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 50px; position: relative; }
                      .epilogue-badge { position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #fffdf5; padding: 0 15px; color: #9a7620; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 0.8em; }
                      .log-section { margin-top: 40px; }
                      .chapter { margin-bottom: 30px; page-break-inside: avoid; }
                      .scene { margin-bottom: 10px; text-align: justify; }
                      .scene-img { width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto 20px auto; border-radius: 4px; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                      .choice { margin: 10px 0 10px 20px; padding-left: 15px; border-left: 3px solid #3498db; font-family: sans-serif; font-weight: bold; color: #1f6695; font-size: 0.95em; }
                      .feedback { margin: 10px 0 20px 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; color: #4b5563; font-size: 0.9em; font-style: italic; border: 1px solid #dce1e5; }
                      .chapter-separator { text-align: center; color: #cbd5e1; margin: 20px 0; }
                      .narration-audio { display: block; width: min(100%, 34rem); margin: 0.75rem 0 1rem; }
                      .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #2c3e50; color: white; border: none; border-radius: 50px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: transform 0.2s; }
                      .print-btn:hover { transform: scale(1.05); background: #34495e; }
                      @media print {
                          .print-btn, .narration-audio { display: none; }
                          body { background: white; padding: 0; }
                          .summary-box { box-shadow: none; border: 1px solid #ccc; }
                      }
                  </style>
              </head>
              <body>
                  <button class="print-btn" onclick="window.print()">${_escapeExportText(strPrint)}</button>
                  <div class="cover">
                      <h1>${safeTitle}</h1>
                      <p class="meta">${_escapeExportText(strSubtitle)}</p>
                      <p class="meta">${_escapeExportText(strMeta)}</p>
                  </div>
                  <div class="summary-box" data-scene-id="epilogue">
                      <div class="epilogue-badge">${safeEpilogue}</div>
                      ${epilogueHtml}
                  </div>
                  <h2 style="text-align: center; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 40px;">${_escapeExportText(strLogHeader)}</h2>
                  <div class="log-section">${chaptersHtml}</div>
                  <div style="text-align: center; margin-top: 50px; color: #64748b; font-size: 0.8em;">${_escapeExportText(strFooter)}</div>
                  ${embeddedArtifact}
              </body>
              </html>
            `;
      const storyItems = normalizedScenes.flatMap(scene => scene.segments.map(segment => ({
        id: segment.segmentId,
        title: segment.kind === 'epilogue' ? 'Epilogue' : segment.kind === 'choice' ? 'Student choice' : segment.kind === 'feedback' ? 'Outcome' : scene.title,
        text: segment.text,
        image: includeImages && segment.kind === 'scene' ? scene.image || null : null,
        toolLabel: 'Adventure Mode',
        privacy: 'full'
      }))).filter(item => item.text.trim());
      const readAloudReference = includeNarration ? {
        status: readAloudArtifact && readAloudStats.audioClips > 0 ? 'downloaded-with-audio' : readAloudArtifact ? 'downloaded-text-only' : 'unavailable',
        artifactId: readAloudArtifact ? readAloudArtifact.artifactId : null,
        schema: readAloudArtifact ? readAloudArtifact.schema : null,
        schemaVersion: readAloudArtifact ? readAloudArtifact.schemaVersion : null,
        artifactType: readAloudArtifact ? readAloudArtifact.artifactType : null,
        transport: 'download',
        htmlFilename,
        jsonFilename: serializedReadAloudArtifact ? jsonFilename : null,
        sceneCount: readAloudArtifact ? readAloudArtifact.transcript.sceneCount : normalizedScenes.length,
        segmentCount: readAloudArtifact ? readAloudArtifact.transcript.segmentCount : storyItems.length,
        audioClipCount: Number(readAloudStats.audioClips) || 0,
        totalAudioBytes: Number(readAloudStats.totalAudioBytes) || 0
      } : null;
      try {
        const artifact = {
          id: `adventure-storybook-${ts}`,
          type: 'adventure-storybook',
          source: 'adventure',
          sourceLabel: 'Adventure Mode',
          kindLabel: 'Adventure Storybook',
          title,
          summary: `Student-controlled Adventure Mode storybook with ${Math.max(0, storyItems.length - 1)} journey entries`,
          privacy: 'student-controlled',
          privacySummary: includeNarration ? 'Student-controlled. Storybook text and a lightweight download reference are saved on this device; narration audio remains only in downloaded files.' : 'Student-controlled. Storybook text is saved on this device for the AlloHaven Portfolio.',
          sourceSummary: 'Saved from Adventure Mode storybook export',
          lifecycleStatus: 'saved',
          version: 1,
          createdAt,
          updatedAt: createdAt,
          itemCount: storyItems.length,
          items: storyItems,
          artifact: {
            title,
            summary,
            level: adventureState.level,
            includeImages,
            includeNarration,
            readAloudReference,
            items: storyItems
          }
        };
        const artifactStore = window.AlloModules && window.AlloModules.StudentArtifactStore;
        if (artifactStore && typeof artifactStore.save === 'function') {
          artifactStore.save(artifact, {
            source: 'adventure',
            limit: 80
          });
        } else {
          let existing = [];
          if (Array.isArray(window.__alloflowStudentArtifacts)) {
            existing = window.__alloflowStudentArtifacts;
          } else {
            try {
              existing = JSON.parse(localStorage.getItem('alloflow_student_artifacts') || '[]');
            } catch (_) {
              existing = [];
            }
          }
          const next = [artifact].concat(Array.isArray(existing) ? existing : []).slice(0, 80);
          window.__alloflowStudentArtifacts = next;
          localStorage.setItem('alloflow_student_artifacts', JSON.stringify(next));
          window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-changed', {
            detail: {
              source: 'adventure',
              sourceLabel: 'Adventure Mode',
              kindLabel: 'Adventure Storybook',
              privacy: 'student-controlled',
              title: artifact.title,
              action: 'saved',
              artifact,
              count: next.length
            }
          }));
        }
        if (typeof addToast === 'function') {
          addToast('Saved new student-controlled Adventure Mode storybook to AlloHaven Portfolio. Open AlloHaven > Portfolio to view it.', "success");
        }
      } catch (saveError) {
        if (typeof warnLog === 'function') warnLog('Storybook manifest could not be saved', saveError);
      }
      _storybookProgress(options, {
        phase: 'download',
        message: 'Finishing your Storybook download…'
      });
      if (includeNarration) {
        _downloadStorybookFile(storyHtml, 'text/html;charset=utf-8', htmlFilename);
        if (serializedReadAloudArtifact) {
          _downloadStorybookFile(serializedReadAloudArtifact, 'application/json;charset=utf-8', jsonFilename);
        }
        if (typeof addToast === 'function') {
          addToast(readAloudStats.audioClips > 0 ? 'Downloaded the narrated Storybook as self-contained HTML and JSON files.' : 'Downloaded the Storybook as text-first HTML and JSON files.', 'success');
        }
      } else {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(storyHtml);
          printWindow.document.close();
        } else if (typeof addToast === 'function') {
          addToast(t('adventure.storybook_toast_popup'), "error");
          return false;
        }
      }
      _storybookProgress(options, {
        phase: 'complete',
        completed: 1,
        total: 1,
        message: 'Storybook ready.'
      });
      return true;
    } catch (error) {
      if (error && error.name === 'AbortError') {
        _storybookProgress(options, {
          phase: 'cancelled',
          message: 'Storybook export cancelled.'
        });
        return false;
      }
      if (typeof warnLog === 'function') warnLog("Storybook Export Error", error);
      if (typeof addToast === 'function') addToast(t('adventure.storybook_toast_error'), "error");
      _storybookProgress(options, {
        phase: 'error',
        message: 'Storybook export could not be completed.'
      });
      return false;
    } finally {
      if (typeof setIsProcessing === 'function') setIsProcessing(false);
    }
  };

  // ─── handleExportFlashcards ───────────────────────────────────────
  const handleExportFlashcards = (mode = 'standard') => {
    const {
      generatedContent,
      t,
      addToast
    } = liveRef.current;
    if (!generatedContent || generatedContent.type !== 'glossary') return;
    const cleanText = text => _escapeExportText(text ? String(text).replace(/\*\*/g, '').replace(/\*/g, '') : '');
    const cards = generatedContent?.data;
    const isLanguageMode = mode === 'language';
    const cardStyle = `
            .card-container {
                display: flex;
                border: 2px dashed #cbd5e1;
                margin-bottom: 20px;
                page-break-inside: avoid;
                height: 220px;
                background: white;
            }
            .card-side {
                flex: 1;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                position: relative;
                overflow: hidden;
            }
            .front { border-right: 2px dashed #cbd5e1; }
            .cut-guide {
                position: absolute;
                top: -10px; left: 50%;
                transform: translateX(-50%);
                font-size: 10px; color: #94a3b8;
                background: white; padding: 0 5px;
                font-weight: bold;
            }
            .lang-label {
                font-size: 10px;
                text-transform: uppercase;
                color: #94a3b8;
                margin-bottom: 2px;
                font-weight: bold;
            }
            .primary-text { font-size: 20px; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
            .secondary-text { font-size: 16px; color: #4f46e5; font-weight: bold; margin-top: 5px; }
            .def-text { font-size: 13px; color: #475569; line-height: 1.4; }
            .def-trans { font-size: 13px; color: #475569; line-height: 1.4; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; width: 100%; }
            .etym-text { font-size: 11px; color: #4338ca; font-style: italic; line-height: 1.4; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #c7d2fe; width: 100%; }
            .etym-roots { margin-top: 6px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; width: 100%; }
            .root-chip { font-size: 10px; background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; padding: 2px 6px; border-radius: 999px; font-style: normal; }
            .root-chip b { font-weight: 700; }
            .root-chip i { font-size: 9px; color: #6366f1; text-transform: uppercase; font-style: normal; letter-spacing: 0.03em; margin: 0 2px; }
            .set-header {
                background: #f1f5f9; color: #334155;
                padding: 15px; margin: 40px 0 20px 0;
                text-align: center; font-weight: bold; border-radius: 8px;
                border: 1px solid #e2e8f0;
                page-break-after: avoid;
            }
        `;
    const titleKey = isLanguageMode ? 'flashcards.print_title_language' : 'flashcards.print_title_standard';
    let htmlBody = `
            <div class="no-print" style="background: #eef2ff; padding: 20px; border-radius: 8px; margin-bottom: 30px; text-align: center; border: 1px solid #c7d2fe;">
                <h1 style="margin-top:0; color: #3730a3; font-family: sans-serif;">${_escapeExportText(t(titleKey))}</h1>
                <p style="color: #4338ca; font-family: sans-serif;">${_escapeExportText(t('flashcards.print_instructions'))}</p>
                <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-top: 10px; font-family: sans-serif;">${_escapeExportText(t('common.print'))}</button>
            </div>
        `;
    const allLanguages = new Set();
    cards.forEach(c => {
      if (c.translations) {
        Object.keys(c.translations).forEach(k => allLanguages.add(k));
      }
    });
    const languagesList = Array.from(allLanguages);
    if (isLanguageMode && languagesList.length === 0) {
      const message = t('flashcards.no_translations') || 'No translated flashcards are available to export.';
      if (typeof addToast === 'function') addToast(message, 'error');else if (window.AlloFlowUX && typeof window.AlloFlowUX.toast === 'function') window.AlloFlowUX.toast(message, 'error');
      return;
    }
    const renderSet = (lang = null) => {
      const header = lang ? isLanguageMode ? `${t('languages.english')} ⟷ ${lang}` : lang : t('languages.english');
      htmlBody += `<h2 class="set-header">${_escapeExportText(header)} ${_escapeExportText(t('flashcards.set_header'))}</h2>`;
      cards.forEach(item => {
        let transTerm = "";
        let transDef = "";
        if (lang) {
          const fullTrans = item.translations ? item.translations[lang] : "";
          if (fullTrans && fullTrans.includes(":")) {
            const splitIdx = fullTrans.indexOf(":");
            transTerm = fullTrans.substring(0, splitIdx).trim();
            transDef = fullTrans.substring(splitIdx + 1).trim();
          } else if (fullTrans) {
            transDef = fullTrans;
          }
        }
        let frontContent = "";
        let backContent = "";
        if (isLanguageMode) {
          frontContent = `
                        <div class="lang-label">${_escapeExportText(t('languages.english'))}</div>
                        <div class="primary-text">${cleanText(item.term)}</div>
                        <div class="def-text">${cleanText(item.def)}</div>
                    `;
          backContent = `
                        <div class="lang-label">${_escapeExportText(lang)}</div>
                        <div class="primary-text">${cleanText(transTerm)}</div>
                        <div class="def-text">${cleanText(transDef)}</div>
                    `;
        } else {
          frontContent = `
                        <div class="cut-guide">${_escapeExportText(t('flashcards.fold_guide'))}</div>
                        <div class="lang-label">${_escapeExportText(t('languages.english'))}</div>
                        <div class="primary-text">${cleanText(item.term)}</div>
                        ${transTerm ? `<div class="secondary-text">${cleanText(transTerm)}</div><div class="lang-label" style="margin-top:2px;">${_escapeExportText(lang)}</div>` : ''}
                    `;
          backContent = `
                        <div class="def-text"><strong>${_escapeExportText(t('languages.english'))}:</strong> ${cleanText(item.def)}</div>
                        ${transDef ? `<div class="def-trans"><strong>${_escapeExportText(lang)}:</strong> ${cleanText(transDef)}</div>` : ''}
                        ${item.etymology ? `<div class="etym-text">📜 <strong>${_escapeExportText(t('glossary.etymology_label') || 'Roots')}:</strong> ${cleanText(item.etymology)}</div>` : ''}
                        ${Array.isArray(item.roots) && item.roots.length > 0 ? `<div class="etym-roots">${item.roots.map(r => `<span class="root-chip"><b>${cleanText(r.root || '')}</b>${r.lang ? ` <i>(${cleanText(r.lang)})</i>` : ''}${r.meaning ? ` = ${cleanText(r.meaning)}` : ''}</span>`).join(' ')}</div>${(() => {
            const seen = new Set();
            const allRel = [];
            item.roots.forEach(r => {
              if (Array.isArray(r.related)) r.related.forEach(w => {
                const k = String(w || '').trim();
                if (k && !seen.has(k.toLowerCase())) {
                  seen.add(k.toLowerCase());
                  allRel.push(k);
                }
              });
            });
            return allRel.length > 0 ? `<div class="etym-related"><strong>${_escapeExportText(t('export.related_words_label') || 'Related words:')}</strong> ${allRel.slice(0, 6).map(w => cleanText(w)).join(', ')}</div>` : '';
          })()}` : ''}
                    `;
        }
        htmlBody += `
                    <div class="card-container">
                        <div class="card-side front">${frontContent}</div>
                        <div class="card-side back">${backContent}</div>
                    </div>
                `;
      });
    };
    if (languagesList.length === 0) {
      renderSet(null);
    } else {
      languagesList.forEach((lang, index) => {
        if (index > 0) htmlBody += `<div style="page-break-before: always;"></div>`;
        renderSet(lang);
      });
    }
    const fullHtml = `
            <!DOCTYPE html>
            <html lang="${_escapeExportText(_exportLanguage())}" dir="${_exportDirection()}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Flashcards - ${new Date().toLocaleDateString()}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1e293b; }
                    @media print {
                        body { padding: 0; margin: 0; max-width: 100%; }
                        .no-print { display: none; }
                        .card-container { break-inside: avoid; }
                    }
                    ${cardStyle}
                </style>
            </head>
            <body>
                ${htmlBody}
            </body>
            </html>
        `;
    const blob = new Blob([fullHtml], {
      type: 'text/html'
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${t('export.filenames.flashcards')}-${mode}-${Date.now()}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  return {
    handleExportResearchJSON,
    handleExportProfiles,
    handleExportQTI,
    handleExportIMS,
    handleExportH5P,
    handleExportSlides,
    handleExportStorybook,
    handleExportFlashcards
  };
};

// Registration shim — attach factory + trigger monolith's _upgradeExport().
if (typeof window !== 'undefined') {
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.createExport = createExport;
  window.AlloModules.Export = true;
  console.log('[Export] Factory registered');
  if (typeof window._upgradeExport === 'function') {
    window._upgradeExport();
  }
}
})();
