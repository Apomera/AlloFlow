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
const createExport = (deps) => {
    const {
        liveRef,
        warnLog, debugLog,
        escapeXml, generateUUID,
    } = deps;

    // Inline helpers — self-contained so they don't need live-ref.
    const getDefaultTitle = (type) => {
        const { t } = liveRef.current;
        switch(type) {
            case 'glossary': return t('glossary.title');
            case 'simplified': return t('simplified.title');
            case 'outline': return t('outline.title');
            case 'image': return t('visuals.title');
            case 'quiz': return t('quiz.title');
            case 'analysis': return t('analysis.title');
            case 'udl-advice': return t('sidebar.ai_guide');
            case 'faq': return t('faq.title');
            case 'brainstorm': return t('brainstorm.title');
            case 'sentence-frames': return t('scaffolds.title');
            case 'adventure': return t('adventure.title');
            case 'stem-assessment': return 'STEM Assessment';
            case 'alignment-report': return t('alignment.title');
            case 'timeline': return t('timeline.title');
            case 'concept-sort': return t('concept_sort.title');
            case 'math': return t('math.title');
            case 'lesson-plan': return t('lesson_plan.title');
            case 'gemini-bridge': return t('sidebar.tool_bridge');
            case 'persona': return t('persona.title');
            case 'word-sounds': return t('output.word_sounds_studio') || 'Word Sounds Studio';
            case 'dbq': return '📜 Document Analysis (DBQ)';
            case 'storyforge-config': return '📖 StoryForge Assignment';
            case 'storyforge-submission': return '📖 Story Submission';
            case 'note-taking': return t('help_mode.tool_note_taking') || 'Note-Taking Templates';
            case 'anchor-chart': return t('help_mode.tool_anchor_chart') || 'Anchor Chart';
            case 'memory-aid': return t('help_mode.tool_memory_aid') || 'Memory Aid Studio';
            case 'applied-challenge': return t('help_mode.tool_applied_challenge') || 'Applied Challenge Studio';
            default: return t('common.resource') || 'Resource';
        }
    };

    const _readingSourcePairsForExport = (items) => {
        const source = Array.isArray(items) ? items : [];
        const contract = window.AlloModules?.InstructionalContext;
        return contract?.ensureReadingSourcePairs ? contract.ensureReadingSourcePairs(source) : source;
    };
    const cleanTextForPptx = (text) => text ? String(text).replace(/\*\*/g, '').replace(/\*/g, '') : '';
    const _instructionalTextForExport = (item) => {
        const artifact = item && typeof item === 'object' ? item : {};
        const config = artifact.config && typeof artifact.config === 'object' ? artifact.config : {};
        const raw = artifact.instructionalText || config.instructionalText || artifact.textProfile || config.textProfile || {};
        const inferredForm = artifact.type === 'simplified' ? 'adapted' : 'original';
        let normalized = raw;
        try {
            const api = window.AlloModules && window.AlloModules.InstructionalContext;
            if (api && typeof api.getInstructionalText === 'function') normalized = api.getInstructionalText(artifact);
            else if (raw && api && typeof api.normalizeInstructionalText === 'function') normalized = api.normalizeInstructionalText(raw, { defaultForm: inferredForm });
        } catch (_) { normalized = raw; }
        normalized = normalized && typeof normalized === 'object' ? normalized : {};
        const role = ['primary', 'supplemental', 'unspecified'].includes(normalized.role) ? normalized.role : 'unspecified';
        const form = ['original', 'same-text-supported', 'adapted'].includes(normalized.form) ? normalized.form : inferredForm;
        const auth = normalized.replacementAuthorization && typeof normalized.replacementAuthorization === 'object'
            ? normalized.replacementAuthorization : {};
        const authorized = auth.authorized === true && auth.source === 'educator';
        const complexity = normalized.complexity && typeof normalized.complexity === 'object' ? normalized.complexity : {};
        return {
            schemaVersion: 1,
            role,
            form,
            sourceArtifactId: normalized.sourceArtifactId == null ? null : String(normalized.sourceArtifactId),
            primaryArtifactId: normalized.primaryArtifactId == null ? null : String(normalized.primaryArtifactId),
            designationSource: ['educator', 'workflow-default', 'legacy-inferred'].includes(normalized.designationSource)
                ? normalized.designationSource : 'legacy-inferred',
            replacementAuthorization: { authorized, source: authorized ? 'educator' : 'none' },
            complexity: {
                requestedGrade: complexity.requestedGrade || artifact.targetGradeLevel || config.grade || '',
                measuredGrade: complexity.measuredGrade != null
                    ? complexity.measuredGrade
                    : (artifact.localStats && artifact.localStats.gradeLevel != null ? artifact.localStats.gradeLevel : null),
                method: complexity.method || (artifact.localStats ? 'flesch-kincaid' : ''),
                status: complexity.status || '',
                contentFingerprint: complexity.contentFingerprint || '',
                measuredAt: complexity.measuredAt || null,
                language: complexity.language || config.language || '',
            },
        };
    };
    const _fallbackInteractiveObjectProfileFor = (item) => {
        const type = item && item.type ? String(item.type) : '';
        const unsupported = new Set(['adventure', 'persona', 'word-sounds', 'storyforge-config', 'storyforge-submission', 'poettree-config', 'poettree-submission', 'litlab-config', 'litlab-submission', 'math-fluency-probe', 'explore-challenge', 'stem-assessment']);
        const interactive = new Set(['glossary', 'quiz', 'sentence-frames', 'concept-sort', 'fluency-record']);
        return {
            profileVersion: 'fallback',
            type,
            label: type || 'Resource',
            status: unsupported.has(type) ? 'adapter-needed' : 'ready',
            html: unsupported.has(type) ? 'none' : (interactive.has(type) ? 'interactive' : 'static'),
            canExportHtml: !unsupported.has(type),
            canExportIms: !unsupported.has(type),
            interactiveHtml: interactive.has(type),
            qti: type === 'quiz',
            tracking: type === 'quiz' ? 'qti-or-local' : (interactive.has(type) ? 'local-only' : 'none'),
            fallback: unsupported.has(type) ? 'adapter-needed' : 'static-html',
            notes: unsupported.has(type) ? 'No IMS object adapter is registered for this type.' : 'Renderable through the resource HTML exporter.',
        };
    };
    const getInteractiveObjectProfileFor = (item) => {
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
            notes: p.notes,
            instructionalText: _instructionalTextForExport(item),
        }, extra || {});
    };
    const getInteractiveObjectProfileSummary = (items) => {
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
        }, { profileVersion: 'fallback', total: 0, htmlReady: 0, interactiveReady: 0, imsReady: 0, qtiReady: 0, adapterNeeded: 0, unsupported: 0, byStatus: {} });
    };
    const _jsonForHtmlScript = (value) => String(JSON.stringify(value == null ? null : value)).replace(/</g, '\\u003c');
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
    const _escapeExportText = (value) => escapeXml(Array.from(String(value == null ? '' : value)).filter((char) => {
        const cp = char.codePointAt(0);
        return cp === 0x9 || cp === 0xA || cp === 0xD || (cp >= 0x20 && cp <= 0xD7FF) || (cp >= 0xE000 && cp <= 0xFFFD) || (cp >= 0x10000 && cp <= 0x10FFFF);
    }).join(''));
    // Assessment text can carry light markdown (**bold**, *italic*); plain-text formats keep the words only.
    const _exportQuizMd = () => (window.AlloModules && window.AlloModules.QuizView && window.AlloModules.QuizView.markdown) || null;
    const _exportQuizPlain = (value) => { const md = _exportQuizMd(); return md ? md.plain(value) : String(value == null ? '' : value); };
    // Every string in an item except ids, types and image data, so options and keys still match afterwards.
    const _exportQuizPlainItem = (value, key) => {
        if (typeof value === 'string') return /url|image|^id$|^type$/i.test(key || '') ? value : _exportQuizPlain(value);
        if (Array.isArray(value)) return value.map((entry) => _exportQuizPlainItem(entry, key));
        if (!value || typeof value !== 'object') return value;
        const out = {};
        Object.keys(value).forEach((name) => { out[name] = _exportQuizPlainItem(value[name], name); });
        return out;
    };
    // PowerPoint text runs: markdown bold/italic/code as run styling; plain text when the formatter is absent.
    const _pptxQuizRuns = (value, base, emphasisColor) => {
        const md = _exportQuizMd();
        if (!md || typeof md.segments !== 'function') return String(value == null ? '' : value);
        return md.segments(value).map((seg) => ({ text: seg.text, options: { ...base,
            bold: !!(base.bold || seg.bold), italic: !!seg.italic,
            ...(seg.bold && base.bold && emphasisColor ? { color: emphasisColor } : {}),
            ...(seg.code ? { fontFace: 'Courier New' } : {}) } }));
    };
    const _h5pAccessibleText = (value) => String(value == null ? '' : value)
        .replace(/<[^>]*>/g, ' ')
        .replace(/&nbsp;|&#160;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&quot;|&#34;/gi, '"')
        .replace(/&#39;|&apos;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim();
    const _auditH5PAccessibility = ({ h5pJson, contentJson, context = {} }) => {
        const report = { checks: 0, repaired: 0, errors: [], warnings: [] };
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
            const normalized = (Array.isArray(answers) ? answers : [])
                .map((answer) => _h5pAccessibleText(answer && typeof answer === 'object' ? answer.text : answer).toLocaleLowerCase());
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
            [
                ['nextButtonLabel', 'Next', 'Next button labels'],
                ['nextButton', 'Next', 'Next button labels'],
                ['showResultsButtonLabel', 'Show results', 'Results button labels'],
                ['retryButtonLabel', 'Retry', 'Retry button labels'],
                ['closeButtonLabel', 'Close', 'Close button labels'],
                ['scoreBarLabel', 'You got :num out of :total points', 'Score announcements'],
                ['a11yShowSolution', 'Show the solution. The task will be marked with its correct solution.', 'Solution announcements'],
                ['a11yRetry', 'Retry the task. Reset all responses and start the task over again.', 'Retry announcements'],
                ['correctAnswerIntroduction', 'Correct answer', 'Correct-answer labels'],
            ].forEach(([key, fallback, label]) => ensureText(labels, key, fallback, label));
            reviewIf(contentJson && contentJson.behaviour && contentJson.behaviour.soundEffectsEnabled === true, 'Sound effects are enabled and may create an audio-only feedback cue.');
        } else if (mainLibrary === 'H5P.QuestionSet') {
            const questions = Array.isArray(contentJson && contentJson.questions) ? contentJson.questions : [];
            requireValue(questions.length > 0, 'The question set has no accessible questions.');
            [
                ['prevButton', 'Previous question', 'Previous-question controls'],
                ['nextButton', 'Next question', 'Next-question controls'],
                ['finishButton', 'Finish', 'Finish controls'],
                ['submitButton', 'Submit', 'Submit controls'],
                ['textualProgress', 'Question: @current of @total questions', 'Progress announcements'],
                ['unansweredText', 'Unanswered', 'Unanswered-state labels'],
                ['answeredText', 'Answered', 'Answered-state labels'],
                ['currentQuestionText', 'Current question', 'Current-question labels'],
                ['navigationLabel', 'Questions', 'Question navigation labels'],
            ].forEach(([key, fallback, label]) => ensureText(contentJson && contentJson.texts, key, fallback, label));
            questions.forEach((question, index) => {
                const params = question && question.params;
                const library = String(question && question.library || '');
                if (library.startsWith('H5P.MultiChoice ')) {
                    requireValue(!!_h5pAccessibleText(params && params.question), `Question ${index + 1} has no prompt.`);
                    requireDistinctAnswers(params && params.answers, `Question ${index + 1}`);
                    [
                        ['checkAnswerButton', 'Check', 'Check-answer controls'], ['showSolutionButton', 'Show solution', 'Solution controls'],
                        ['tryAgainButton', 'Retry', 'Retry controls'], ['scoreBarLabel', 'You got :num out of :total points', 'Score announcements'],
                        ['a11yCheck', 'Check the answers.', 'Check-answer announcements'], ['a11yShowSolution', 'Show the solution.', 'Solution announcements'],
                        ['a11yRetry', 'Retry the task.', 'Retry announcements'],
                    ].forEach(([key, fallback, label]) => ensureText(params && params.UI, key, fallback, `${label} for question ${index + 1}`));
                } else if (library.startsWith('H5P.Blanks ')) {
                    requireValue(Array.isArray(params && params.questions) && params.questions.some((line) => /\*[^*]+\*/.test(String(line))), `Question ${index + 1} has no labeled blank.`);
                    [
                        ['inputLabel', 'Blank input @num of @total', 'Blank input labels'], ['checkAnswer', 'Check', 'Check-answer controls'],
                        ['showSolutions', 'Show solution', 'Solution controls'], ['tryAgain', 'Retry', 'Retry controls'],
                        ['a11yCheck', 'Check the answers.', 'Check-answer announcements'], ['a11yShowSolution', 'Show the solution.', 'Solution announcements'],
                        ['a11yRetry', 'Retry the task.', 'Retry announcements'],
                    ].forEach(([key, fallback, label]) => ensureText(params, key, fallback, `${label} for question ${index + 1}`));
                } else if (library.startsWith('H5P.Essay ')) {
                    requireValue(!!_h5pAccessibleText(params && params.taskDescription), `Question ${index + 1} has no task description.`);
                    [
                        ['placeholderText', 'Type your response here.', 'Response input labels'], ['ariaYourResult', 'Response submitted.', 'Submission announcements'],
                        ['ariaCheck', 'Submit the response.', 'Submission controls'], ['ariaShowSolution', 'Show the sample solution.', 'Solution controls'],
                        ['ariaRetry', 'Retry the task.', 'Retry controls'],
                    ].forEach(([key, fallback, label]) => ensureText(params, key, fallback, `${label} for question ${index + 1}`));
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
            [
                ['answer', 'Turn', 'Card-turn controls'], ['next', 'Next', 'Next-card controls'],
                ['prev', 'Previous', 'Previous-card controls'], ['retry', 'Retry', 'Retry controls'],
                ['progressText', 'Card @card of @total', 'Card progress announcements'], ['cardFrontLabel', 'Card front', 'Card-front labels'],
                ['cardBackLabel', 'Card back', 'Card-back labels'], ['audioNotSupported', 'Your browser does not support this audio', 'Audio fallback messages'],
            ].forEach(([key, fallback, label]) => ensureText(contentJson, key, fallback, label));
            reviewIf(Number(context.derivedImageAltCount) > 0, `${context.derivedImageAltCount} image alt text value(s) were derived from card-front text and should be reviewed.`);
            reviewIf(Number(context.audioWithoutTranscriptCount) > 0, `${context.audioWithoutTranscriptCount} audio asset(s) have no explicit transcript and should be reviewed.`);
        } else {
            requireValue(false, `The ${mainLibrary || 'unknown'} H5P library has no accessibility audit profile.`);
        }

        return report;
    };
    const _normalizeStorybookExportOptions = (value) => {
        if (typeof value === 'boolean') {
            return { includeImages: value, includeNarration: false, keepModalOpen: false, onProgress: null, signal: null };
        }
        const input = value && typeof value === 'object' ? value : {};
        return {
            includeImages: !!input.includeImages,
            includeNarration: !!input.includeNarration,
            keepModalOpen: !!input.keepModalOpen,
            onProgress: typeof input.onProgress === 'function' ? input.onProgress : null,
            signal: input.signal || null,
        };
    };
    const _storybookProgress = (options, update) => {
        if (!options.onProgress) return;
        try { options.onProgress(Object.assign({ phase: 'export', completed: 0, total: 0 }, update || {})); }
        catch (_) {}
    };
    const _storybookImageSource = value => typeof value === 'string' && /^(?:data:image\/(?:png|jpeg|jpg|gif|webp);base64,|blob:|https?:\/\/)/i.test(value) ? value : '';
    const _storybookPictureId = entry => entry?.imageId == null ? '' : String(entry.imageId).trim();
    const _recoverStorybookPictures = async (story, cache, hydrate, options, checkCancelled) => {
        // Only attach recovered media to this export's copy of the journey.
        // A failed lookup must not discard text or pictures recovered earlier.
        if (!options.includeImages || typeof hydrate !== 'function') return;
        const known = new Map();
        story.forEach(entry => {
            const id = _storybookPictureId(entry);
            if (entry.type === 'scene' && id && _storybookImageSource(entry.image)) known.set(id, entry.image);
        });
        const missing = story.filter(entry => entry.type === 'scene' && !entry.image && _storybookPictureId(entry));
        const localCache = Array.isArray(cache) ? cache : [];
        for (let index = 0; index < missing.length; index++) {
            checkCancelled();
            const entry = missing[index], id = _storybookPictureId(entry);
            _storybookProgress(options, { phase: 'pictures', completed: index, total: missing.length,
                message: `Checking picture ${index + 1} of ${missing.length}…` });
            checkCancelled();
            if (!known.has(id)) {
                let image = '';
                try {
                    const hydrated = await hydrate([{ ...entry }], localCache);
                    const recovered = Array.isArray(hydrated) ? hydrated[0] : null;
                    if (recovered && _storybookPictureId(recovered) === id) image = _storybookImageSource(recovered.image);
                } catch (error) {
                    if (error?.name === 'AbortError') throw error;
                    if (typeof warnLog === 'function') warnLog('Storybook picture unavailable', error);
                }
                checkCancelled();
                // Remember failures for this attempt, so repeated references do
                // not repeat a failed network request. A later export can retry.
                known.set(id, image);
            }
            if (known.get(id)) entry.image = known.get(id);
            _storybookProgress(options, { phase: 'pictures', completed: index + 1, total: missing.length,
                message: `Checked ${index + 1} of ${missing.length} pictures.` });
        }
        checkCancelled();
    };
    const _normalizeStorybookScenes = (fullStory, summary, labels) => {
        const scenes = [];
        const addSegment = (scene, kind, rawText, speaker) => {
            const text = String(rawText == null ? '' : rawText).trim();
            if (!text) return;
            const sameKindCount = scene.segments.filter((segment) => segment.kind === kind).length;
            const suffix = kind === 'epilogue' ? 'summary' : `${kind}:${sameKindCount}`;
            scene.segments.push({
                segmentId: `${scene.sceneId}:${suffix}`,
                order: scene.segments.length,
                kind,
                text: kind === 'feedback' ? text.replace(/\([+-]?\d+ XP\)/g, '').trim() : text,
                speaker: speaker || '',
            });
        };
        const epilogueText = String(summary == null ? '' : summary).trim();
        if (epilogueText) {
            const epilogue = { sceneId: 'epilogue', order: scenes.length, title: labels.epilogueTitle, image: null, segments: [] };
            addSegment(epilogue, 'epilogue', epilogueText, '');
            scenes.push(epilogue);
        }
        let currentScene = null;
        let turnNumber = 0;
        (Array.isArray(fullStory) ? fullStory : []).forEach((entry) => {
            if (!entry) return;
            const kind = entry.type === 'scene' ? 'scene' : (entry.type === 'choice' ? 'choice' : 'feedback');
            const text = String(entry.text == null ? '' : entry.text).trim();
            if (!text) return;
            if (kind === 'scene') {
                turnNumber += 1;
                currentScene = {
                    sceneId: `turn:${turnNumber}:scene`,
                    order: scenes.length,
                    title: `${labels.sceneTitle} ${turnNumber}`,
                    image: entry.image || null,
                    pictureExpected: !!entry.image || !!_storybookPictureId(entry),
                    segments: [],
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
                    segments: [],
                };
                scenes.push(currentScene);
            }
            addSegment(currentScene, kind, text, kind === 'choice' ? labels.studentSpeaker : '');
        });
        return scenes.filter((scene) => scene.segments.length > 0).map((scene, order) => Object.assign({}, scene, { order }));
    };
    const _storybookContractScenes = (scenes, audioBySegmentId) => (scenes || []).map((scene) => ({
        sceneId: scene.sceneId,
        order: scene.order,
        title: scene.title || '',
        segments: scene.segments.map((segment) => {
            const output = {
                segmentId: segment.segmentId,
                order: segment.order,
                text: segment.text,
                speaker: segment.speaker || '',
            };
            const audio = audioBySegmentId && audioBySegmentId[segment.segmentId];
            if (audio) output.audio = audio;
            return output;
        }),
    }));
    const _storybookAudioResultMap = (result) => {
        const source = result && result.audioBySegmentId != null ? result.audioBySegmentId : null;
        if (!source) return {};
        if (typeof Map !== 'undefined' && source instanceof Map) {
            const output = {};
            source.forEach((value, key) => { output[String(key)] = value; });
            return output;
        }
        return source && typeof source === 'object' ? source : {};
    };
    const _downloadStorybookFile = (content, mime, filename) => {
        const blob = new Blob([content], { type: mime });
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
    // ── Provenance for export ────────────────────────────────────────────
    // A REDACTED view of an artifact's `config` (the resolved settings the
    // generating branch actually used). Two things are deliberately not carried
    // out of the app:
    //
    //   - rosterGroupName / rosterGroupColor. The name is free text a teacher
    //     types, and teachers name groups things like "Maria + Deshawn" or
    //     "below benchmark" — a student identifier or an instructional-level
    //     label. The opaque id preserves "these artifacts were one condition"
    //     and leaks nothing.
    //   - customInstructions prose. Unbounded teacher text that routinely names
    //     an individual student. A researcher only needs "same instruction or
    //     not?", which presence + length + an equality token answers.
    //
    // The digest is FNV-1a 32-bit: synchronous (every caller here is a sync
    // template) and explicitly NOT a security control — it is an equality token,
    // labelled with its algorithm so nobody mistakes it for a hash commitment.
    const _fnv1a32 = (str) => {
        let h = 0x811c9dc5;
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
        }
        return 'fnv1a32:' + h.toString(16).padStart(8, '0');
    };

    const _appBuild = () => {
        try {
            const m = Array.from(document.querySelectorAll('script[src]'))
                .map((s) => /Apomera\/AlloFlow@([0-9a-f]+)/.exec(s.src))
                .find(Boolean);
            return m ? m[1] : 'unknown';
        } catch (_) { return 'unknown'; }
    };

    const buildProvenanceRecord = (item) => {
        const c = (item && item.config) || {};
        const custom = typeof c.customInstructions === 'string' ? c.customInstructions.trim() : '';
        const instructionalText = _instructionalTextForExport(item);
        const rawInstructionalText = item && (item.instructionalText || c.instructionalText || item.textProfile || c.textProfile) || {};
        const modelCalibrationTarget = rawInstructionalText && rawInstructionalText.complexity
            ? rawInstructionalText.complexity.calibrationTarget || '' : '';
        return {
            id: item && item.id,
            type: item && item.type,
            title: (item && (item.title || item.meta)) || '',
            generatedAt: (item && item.timestamp) || null,
            // Settings, as resolved by the branch that built this artifact.
            grade: c.grade || '',
            language: c.language || '',
            standards: c.standards || '',
            interests: Array.isArray(c.interests) ? c.interests : [],
            dok: c.dok || '',
            useEmojis: !!c.useEmojis,
            imageStyle: c.imageStyle || '',
            // 'local' vs 'cloud' is a real independent variable: several
            // dispatcher branches ship twin prompts and those twins have drifted.
            // The specific runtime/model is NOT recoverable — do not imply it is.
            backend: c.backend || 'unknown',
            // Makes an empty standards/interests value interpretable: under DA
            // clinical isolation those are blanked deliberately, which is
            // otherwise indistinguishable from a teacher who set nothing.
            isolatedContext: !!c.isolatedContext,
            customInstructionsPresent: !!custom,
            customInstructionsLength: custom.length,
            customInstructionsDigest: custom ? _fnv1a32(custom) : null,
            rosterGroupId: c.rosterGroupId || null,
            // Requested, measured, and instructional-role fields are separate
            // so research exports never confuse the internal adaptation type or
            // calibration target with how the educator used the text.
            instructionalText,
            sourceInstructionalText: item?.sourceInstructionalText && window.AlloModules?.InstructionalContext?.normalizeSourceInstructionalText
                ? window.AlloModules.InstructionalContext.normalizeSourceInstructionalText(item.sourceInstructionalText) : null,
            sourceFamilyId: typeof item?.sourceFamilyId === 'string' ? item.sourceFamilyId : null,
            unitId: typeof item?.unitId === 'string' ? item.unitId : null,
            textRole: instructionalText.role,
            textForm: instructionalText.form,
            sourceArtifactId: instructionalText.sourceArtifactId,
            requestedGrade: instructionalText.complexity.requestedGrade || '',
            measuredGrade: instructionalText.complexity.measuredGrade,
            complexityMethod: instructionalText.complexity.method || '',
            complexityStatus: instructionalText.complexity.status || '',
            // Provenance-only diagnostic. This is not the educator-facing
            // target and is intentionally absent from student package manifests.
            modelCalibrationTarget,
        };
    };

    const handleExportResearchJSON = () => {
        const {
            probeHistory, surveyResponses, fidelityLog, sessionCounter,
            externalCBMScores, interventionLogs, addToast, history,
        } = liveRef.current;
        const items = Array.isArray(history) ? history : [];
        const researchBundle = {
            exportVersion: 2,
            provenanceSchemaVersion: 2,
            appBuild: _appBuild(),
            exportDate: new Date().toISOString(),
            // The measurement half of a study was already here; the materials
            // half was not. Without it a researcher has scores with no record of
            // what the students actually read or how it was configured.
            generatedResources: items.map(buildProvenanceRecord),
            probeHistory,
            surveyResponses,
            fidelityLog,
            sessionCounter,
            externalCBMScores,
            interventionLogs,
        };
        const blob = new Blob([JSON.stringify(researchBundle, null, 2)], { type: 'application/json' });
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
        const { profiles, addToast, t } = liveRef.current;
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
        const fields = [
            ['question_type', questionType],
            ['alloflow_item_type', itemType],
            ['alloflow_scoring', options.manual ? 'manual' : 'automatic']
        ];
        if (options.scoringGuide) fields.push(['alloflow_scoring_guide', options.scoringGuide]);
        return '\n      <itemmetadata>\n        <qtimetadata>' + fields.map(([label, value]) =>
            '\n          <qtimetadatafield>\n            <fieldlabel>' + _escapeExportText(label) + '</fieldlabel>\n            <fieldentry>' + _escapeExportText(value) + '</fieldentry>\n          </qtimetadatafield>'
        ).join('') + '\n        </qtimetadata>\n      </itemmetadata>';
    };

    const _qtiChoiceLabelsXml = (values, prefix) => (Array.isArray(values) ? values : []).map((value, index) =>
        '\n            <response_label ident="' + prefix + '_' + index + '">\n              <material>\n                <mattext texttype="text/plain">' + _escapeExportText(value) + '</mattext>\n              </material>\n            </response_label>'
    ).join('');

    const _qtiWrapItemXml = ({ itemId, title, metadata, presentation, processing }) =>
        '\n    <item ident="' + itemId + '" title="' + _escapeExportText(title) + '">' +
        (metadata || '') +
        '\n      <presentation>' + presentation + '\n      </presentation>' +
        (processing || '') +
        '\n    </item>';

    const _qtiScoreOutcomeXml = (maxValue = 1) =>
        '\n      <resprocessing>\n        <outcomes>\n          <decvar varname="SCORE" vartype="Decimal" defaultval="0" minvalue="0" maxvalue="' + _escapeExportText(maxValue) + '"/>\n        </outcomes>';

    const _qtiAutoTextItemXml = ({ q, index, itemType, acceptedAnswers }) => {
        const responseId = 'RESPONSE_' + index;
        const answers = (acceptedAnswers || []).map(value => String(value == null ? '' : value).trim()).filter(Boolean);
        if (!String(q.question == null ? '' : q.question).trim() || !answers.length) return null;
        const answerConditions = answers.map(answer =>
            '\n        <respcondition continue="No" title="Correct">\n          <conditionvar>\n            <varequal respident="' + responseId + '" case="' + (q.fillBlankPolicy === 'exact' ? 'Yes' : 'No') + '">' + _escapeExportText(answer) + '</varequal>\n          </conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>'
        ).join('');
        const presentation =
            '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(q.question) + '</mattext>\n        </material>' +
            '\n        <response_str ident="' + responseId + '" rcardinality="Single">\n          <render_fib fibtype="String" rows="1" maxchars="250">\n            <response_label ident="' + responseId + '_LABEL"/>\n          </render_fib>\n        </response_str>';
        return _qtiWrapItemXml({
            itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
            title: 'Question ' + (index + 1),
            metadata: _qtiItemMetadataXml(itemType, 'short_answer_question'),
            presentation,
            processing: _qtiScoreOutcomeXml(1) + answerConditions + '\n      </resprocessing>'
        });
    };

    const _qtiManualTextItemXml = ({ q, index, itemType, prompt, scoringGuide, title }) => {
        const text = String(prompt == null ? q.question : prompt).trim();
        if (!text) return null;
        const responseId = 'RESPONSE_' + index;
        const presentation =
            '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(text) + '</mattext>\n        </material>' +
            '\n        <response_str ident="' + responseId + '" rcardinality="Single">\n          <render_fib fibtype="String" rows="6" columns="80">\n            <response_label ident="' + responseId + '_LABEL"/>\n          </render_fib>\n        </response_str>';
        return _qtiWrapItemXml({
            itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
            title: title || 'Question ' + (index + 1),
            metadata: _qtiItemMetadataXml(itemType, 'essay_question', { manual: true, scoringGuide }),
            presentation
        });
    };
    const _qtiSingleChoiceItemXml = (q, index) => {
        const options = Array.isArray(q.options) ? q.options : [];
        const correctIndex = options.findIndex(option => String(option) === String(q.correctAnswer));
        if (!String(q.question == null ? '' : q.question).trim() || options.length < 2 || correctIndex < 0) return null;
        const responseId = 'RESPONSE_' + index;
        const presentation =
            '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(q.question) + '</mattext>\n        </material>' +
            '\n        <response_lid ident="' + responseId + '" rcardinality="Single">\n          <render_choice shuffle="No">' +
            _qtiChoiceLabelsXml(options, 'OPT') +
            '\n          </render_choice>\n        </response_lid>';
        const processing = _qtiScoreOutcomeXml(1) +
            '\n        <respcondition continue="No" title="Correct">\n          <conditionvar>\n            <varequal respident="' + responseId + '">OPT_' + correctIndex + '</varequal>\n          </conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>\n      </resprocessing>';
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
        const presentation =
            '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(q.question) + '</mattext>\n        </material>' +
            '\n        <response_lid ident="' + responseId + '" rcardinality="Multiple">\n          <render_choice shuffle="No" minnumber="1" maxnumber="' + options.length + '">' +
            _qtiChoiceLabelsXml(options, 'OPT') +
            '\n          </render_choice>\n        </response_lid>';
        let conditions = '';
        if (partialCredit) {
            const weight = (1 / correctIndices.length).toFixed(6);
            options.forEach((option, optionIndex) => {
                const isCorrect = correctIndices.includes(optionIndex);
                conditions +=
                    '\n        <respcondition continue="Yes" title="' + (isCorrect ? 'Correct selection' : 'Incorrect selection') + '">' +
                    '\n          <conditionvar>\n            <varequal respident="' + responseId + '">OPT_' + optionIndex + '</varequal>\n          </conditionvar>' +
                    '\n          <setvar action="Add" varname="SCORE">' + (isCorrect ? weight : '-' + weight) + '</setvar>\n        </respcondition>';
            });
        } else {
            const exactConditions = options.map((option, optionIndex) => {
                const test = '<varequal respident="' + responseId + '">OPT_' + optionIndex + '</varequal>';
                return correctIndices.includes(optionIndex) ? test : '<not>' + test + '</not>';
            }).join('\n              ');
            conditions =
                '\n        <respcondition continue="No" title="All correct selections">' +
                '\n          <conditionvar>\n            <and>\n              ' + exactConditions + '\n            </and>\n          </conditionvar>' +
                '\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>';
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
        const presentation =
            '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(q.question) + '</mattext>\n        </material>' +
            '\n        <response_lid ident="' + answerId + '" rcardinality="Single">\n          <render_choice shuffle="No">' +
            _qtiChoiceLabelsXml(answers, 'ANS') +
            '\n          </render_choice>\n        </response_lid>' +
            '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(evidencePrompt) + '</mattext>\n        </material>' +
            '\n        <response_lid ident="' + evidenceId + '" rcardinality="Single">\n          <render_choice shuffle="No">' +
            _qtiChoiceLabelsXml(evidence, 'EVID') +
            '\n          </render_choice>\n        </response_lid>';
        let conditions;
        if (partialCredit) {
            conditions =
                '\n        <respcondition continue="Yes" title="Correct answer">\n          <conditionvar>\n            <varequal respident="' + answerId + '">ANS_' + correctAnswerIndex + '</varequal>\n          </conditionvar>\n          <setvar action="Add" varname="SCORE">0.5</setvar>\n        </respcondition>' +
                '\n        <respcondition continue="Yes" title="Correct evidence">\n          <conditionvar>\n            <varequal respident="' + evidenceId + '">EVID_' + correctEvidenceIndex + '</varequal>\n          </conditionvar>\n          <setvar action="Add" varname="SCORE">0.5</setvar>\n        </respcondition>';
        } else {
            conditions =
                '\n        <respcondition continue="No" title="Correct answer and evidence">\n          <conditionvar>\n            <and>\n              <varequal respident="' + answerId + '">ANS_' + correctAnswerIndex + '</varequal>\n              <varequal respident="' + evidenceId + '">EVID_' + correctEvidenceIndex + '</varequal>\n            </and>\n          </conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>';
        }
        return _qtiWrapItemXml({
            itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
            title: 'Question ' + (index + 1),
            metadata: _qtiItemMetadataXml('answer-evidence', 'multiple_dropdowns_question'),
            presentation,
            processing: _qtiScoreOutcomeXml(1) + conditions + '\n      </resprocessing>'
        });
    };
    const _hasExportNumericKey = (value) => (typeof value === 'number' || typeof value === 'string')
        && String(value).trim() !== '' && Number.isFinite(Number(value));
    const _qtiNumericItemXml = (q, index, partialCredit) => {
        const prompt = String(q.question == null ? '' : q.question).trim();
        const correctValue = Number(q.correctValue);
        const tolerance = Number(q.tolerance == null ? 0 : q.tolerance);
        if (!prompt || !_hasExportNumericKey(q.correctValue) || !Number.isFinite(tolerance) || tolerance < 0) return null;

        const valueId = 'NUM_' + index;
        const unitId = 'UNIT_' + index;
        const units = [q.unit].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : [])
            .map(value => String(value == null ? '' : value).trim())
            .filter((value, unitIndex, values) => value && values.findIndex(candidate => candidate.toLowerCase() === value.toLowerCase()) === unitIndex);
        const lower = correctValue - tolerance;
        const upper = correctValue + tolerance;
        const valueCondition = tolerance > 0
            ? '<and><vargte respident="' + valueId + '">' + _escapeExportText(lower) + '</vargte><varlte respident="' + valueId + '">' + _escapeExportText(upper) + '</varlte></and>'
            : '<varequal respident="' + valueId + '">' + _escapeExportText(correctValue) + '</varequal>';
        const unitTests = units.map(unit => '<varequal respident="' + unitId + '" case="No">' + _escapeExportText(unit) + '</varequal>');
        const unitCondition = unitTests.length > 1 ? '<or>' + unitTests.join('') + '</or>' : unitTests[0];

        let presentation =
            '\n        <material>\n          <mattext texttype="text/plain">' + _escapeExportText(prompt) + '</mattext>\n        </material>' +
            '\n        <response_num ident="' + valueId + '" rcardinality="Single" numtype="Decimal">\n          <render_fib fibtype="Decimal" rows="1" maxchars="40">\n            <response_label ident="' + valueId + '_LABEL"/>\n          </render_fib>\n        </response_num>';
        if (units.length) {
            presentation +=
                '\n        <material>\n          <mattext texttype="text/plain">Unit</mattext>\n        </material>' +
                '\n        <response_str ident="' + unitId + '" rcardinality="Single">\n          <render_fib fibtype="String" rows="1" maxchars="40">\n            <response_label ident="' + unitId + '_LABEL"/>\n          </render_fib>\n        </response_str>';
        }

        let conditions;
        if (!units.length) {
            conditions =
                '\n        <respcondition continue="No" title="Correct value">\n          <conditionvar>' + valueCondition + '</conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>';
        } else if (partialCredit) {
            conditions =
                '\n        <respcondition continue="Yes" title="Correct value">\n          <conditionvar>' + valueCondition + '</conditionvar>\n          <setvar action="Add" varname="SCORE">0.5</setvar>\n        </respcondition>' +
                '\n        <respcondition continue="Yes" title="Correct unit">\n          <conditionvar>' + unitCondition + '</conditionvar>\n          <setvar action="Add" varname="SCORE">0.5</setvar>\n        </respcondition>';
        } else {
            conditions =
                '\n        <respcondition continue="No" title="Correct value and unit">\n          <conditionvar><and>' + valueCondition + unitCondition + '</and></conditionvar>\n          <setvar action="Set" varname="SCORE">1</setvar>\n        </respcondition>';
        }

        return _qtiWrapItemXml({
            itemId: 'Q_' + index + '_' + generateUUID().slice(0, 8),
            title: 'Question ' + (index + 1),
            metadata: _qtiItemMetadataXml('numeric-response', 'numerical_question'),
            presentation,
            processing: _qtiScoreOutcomeXml(1) + conditions + '\n      </resprocessing>'
        });
    };

    // Displayed positions that are out of place (same rule as the quiz card's
    // sequenceSenseTruth): a position counts when removing it leaves the rest in
    // canonical order, so an adjacent swap yields both positions.
    const _sequenceMisplacedPositions = (order, intentionallyWrongIndex, count) => {
        const valid = count > 0 && Array.isArray(order) && order.length === count
            && order.every((value) => Number.isInteger(value) && value >= 0 && value < count)
            && new Set(order).size === count;
        if (!valid || order.every((value, index) => value === index)) return [];
        const found = [];
        order.forEach((_, skip) => {
            let previous = -1;
            const sorted = order.every((value, index) => {
                if (index === skip) return true;
                const ok = value >= previous;
                previous = value;
                return ok;
            });
            if (sorted) found.push(skip);
        });
        if (found.length) return found;
        return Number.isInteger(intentionallyWrongIndex) && intentionallyWrongIndex >= 0 && intentionallyWrongIndex < count ? [intentionallyWrongIndex] : order.map((_, index) => index);
    };
    const _qtiDiagnosticManualPrompt = (q, type) => {
        if (type === 'sequence-sense') {
            const items = Array.isArray(q.items) ? q.items : [];
            const order = Array.isArray(q.presentedOrder) && q.presentedOrder.length ? q.presentedOrder : items.map((item, index) => index);
            const displayed = order.map((itemIndex, displayIndex) => (displayIndex + 1) + '. ' + String(items[itemIndex] == null ? '' : items[itemIndex])).join('\n');
            const canonical = items.map((item, itemIndex) => (itemIndex + 1) + '. ' + String(item == null ? '' : item)).join('\n');
            const misplaced = _sequenceMisplacedPositions(order, q.intentionallyWrongIndex, items.length);
            const compact = q.sequenceMode === 'arrange-explain';
            return {
                prompt: String(q.question || 'Review the sequence.') + '\n\nDisplayed sequence:\n' + displayed + (compact ? '\n\nWrite the correct order and identify the ordering principle.' : '\n\nState whether the sequence is correct. If not, identify the misplaced step, write the correct order, and explain the ordering principle.'),
                guide: 'Canonical order:\n' + canonical + (compact ? '\nScore the arrangement and principle only (two components).' : misplaced.length ? '\nMisplaced displayed position' + (misplaced.length > 1 ? 's (either counts): ' : ': ') + misplaced.map((position) => position + 1).join(', ') : '\nThe displayed order is correct.') + (q.orderingPrinciple ? '\nOrdering principle: ' + q.orderingPrinciple : '')
            };
        }
        const pairs = Array.isArray(q.pairs) ? q.pairs : [];
        const displayedPairs = pairs.map((pair, pairIndex) => {
            const left = Array.isArray(pair) ? pair[0] : pair && (pair.left || pair.term);
            const right = Array.isArray(pair) ? pair[1] : pair && (pair.right || pair.match);
            return (pairIndex + 1) + '. ' + String(left == null ? '' : left) + ' ↔ ' + String(right == null ? '' : right);
        }).join('\n');
        return {
            prompt: String(q.question || 'Review the relationships.') + '\n\nDisplayed pairs:\n' + displayedPairs + '\n\nIdentify the mismatched pair and provide the correct partner.' + _assessmentExportReasoningPrompt(q),
            guide: (q.wrongPairIndex == null ? '' : 'Mismatched pair: ' + (Number(q.wrongPairIndex) + 1)) + (q.correctPartnerForWrong ? '\nCorrect partner: ' + q.correctPartnerForWrong : '') + (q.requireReasoning || q.explanationPrompt ? '\nReview the explanation separately; it does not add points to the two-part choice score.' : '')
        };
    };

    const _assessmentExportReasoningPrompt = (q) => q.requireReasoning || q.explanationPrompt
        ? '\n\n' + (q.requireReasoning ? 'Required explanation: ' : 'Optional explanation: ') + (q.explanationPrompt || 'Explain why your answer fits.') : '';
    const _assessmentExportCriteriaPrompt = (q) => {
        const criteria = Array.isArray(q.studentCriteria) ? q.studentCriteria.filter(value => typeof value === 'string' && value.trim()) : [];
        return criteria.length ? '\n\nWhat to show in your response:\n' + criteria.map((value, index) => (index + 1) + '. ' + value).join('\n') : '';
    };
    // Export formats do not share AlloFlow's policy engine. Preserve the task
    // as an explicitly ungraded response when automatic scoring would differ.
    const _assessmentManualPolicyAdaptation = (q) => {
        const type = q.type || 'mcq';
        const prompt = String(q.question || '').trim();
        if (!prompt) return null;
        if (type === 'fill-blank' && ['normalized', 'review-variants'].includes(q.fillBlankPolicy) && String(q.expectedFill || '').trim()) {
            return { prompt: prompt + '\n\nTeacher review: enter the missing answer.',
                guide: 'Accepted answers: ' + [q.expectedFill].concat(q.acceptableAlternatives || []).join('; ') + '\nMatching policy: ' + (q.fillBlankPolicy === 'normalized' ? 'ignore capitalization, spacing, Unicode composition and surrounding punctuation; preserve conceptual distinctions.' : 'other wording requires teacher review.'),
                reason: 'The selected answer-matching policy requires teacher review in this export.' };
        }
        if (type === 'numeric-response' && _hasExportNumericKey(q.correctValue)) {
            const settings = q.numericSettings || {};
            const weight = typeof settings.valueWeight === 'number' && Number.isFinite(settings.valueWeight) ? Math.max(0, Math.min(1, settings.valueWeight)) : 0.5;
            if (settings.allowEquivalentUnits === true || weight !== 0.5) return {
                prompt: prompt + (q.unit ? '\nInclude units. ' + (settings.allowEquivalentUnits ? 'Equivalent units are accepted.' : 'Use ' + q.unit + '.') : '') + '\nThis exported response will be reviewed by your teacher.',
                guide: 'Expected: ' + q.correctValue + (q.unit ? ' ' + q.unit : '') + '\nTolerance in the expected unit: ±' + (Number(q.tolerance) || 0) + '\nAccepted unit spellings: ' + [q.unit].concat(q.acceptableUnits || []).filter(Boolean).join('; ') + '\nEquivalent units: ' + (settings.allowEquivalentUnits === true ? 'accepted; convert to the expected unit before comparing.' : 'not enabled.') + '\nValue credit: ' + (q.unit ? Math.round(weight * 100) : 100) + '%. Unit credit: ' + (q.unit ? Math.round((1 - weight) * 100) : 0) + '%. Apply the assessment partial-credit setting.',
                reason: 'Equivalent units or custom value/unit weighting require teacher review in this export.'
            };
        }
        if ((type === 'relation-mismatch' || type === 'answer-evidence') && (q.requireReasoning || q.explanationPrompt)) {
            if (type === 'relation-mismatch') {
                const pairs = q.pairs || [], wrong = q.wrongPairIndex;
                if (!Array.isArray(pairs) || pairs.length < 2 || !Number.isInteger(wrong) || wrong < 0 || wrong >= pairs.length || !q.correctPartnerForWrong) return null;
                return Object.assign(_qtiDiagnosticManualPrompt(q, type), { reason: 'The explanation and choice parts are retained together for teacher review.' });
            }
            const answers = q.answerOptions || [], evidence = q.evidenceOptions || [];
            if (!Array.isArray(answers) || answers.length < 2 || !answers.includes(q.correctAnswer) || !Array.isArray(evidence) || evidence.length < 2 || !evidence.includes(q.correctEvidence)) return null;
            return { prompt: prompt + '\n\nAnswer choices:\n' + answers.map((value, index) => String.fromCharCode(65 + index) + '. ' + value).join('\n') + '\n\n' + (q.evidencePrompt || 'Choose supporting evidence.') + '\n' + evidence.map((value, index) => String.fromCharCode(65 + index) + '. ' + value).join('\n') + _assessmentExportReasoningPrompt(q),
                guide: 'Answer: ' + q.correctAnswer + '\nEvidence: ' + q.correctEvidence + '\nReview the explanation separately; it does not add points to the two-part choice score.',
                reason: 'The explanation and choice parts are retained together for teacher review.' };
        }
        return null;
    };

    const _qtiQuestionItemXml = (q, index, scoringPolicy) => {
        if (!q || typeof q !== 'object') return null;
        q = _exportQuizPlainItem(q);
        if (!String(q.question || '').trim()) return null;
        const type = q.type || 'mcq';
        const partialCredit = !scoringPolicy || scoringPolicy.partialCredit !== false;
        const adaptation = _assessmentManualPolicyAdaptation(q);
        if (adaptation) return _qtiManualTextItemXml({ q, index, itemType: type, prompt: adaptation.prompt + _assessmentExportCriteriaPrompt(q), scoringGuide: adaptation.guide + '\nPartial credit: ' + (partialCredit ? 'enabled.' : 'disabled; use all-or-nothing scoring for the scored components.') });
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
            return _qtiManualTextItemXml({ q, index, itemType: type, prompt: String(q.question || '') + _assessmentExportCriteriaPrompt(q), scoringGuide: q.expectedAnswer });
        }
        if (type === 'self-explanation') {
            return _qtiManualTextItemXml({ q, index, itemType: type, prompt: String(q.question || '') + _assessmentExportCriteriaPrompt(q), scoringGuide: q.rubric || q.expectedAnswer });
        }
        if (type === 'sequence-sense' || type === 'relation-mismatch') {
            const diagnostic = _qtiDiagnosticManualPrompt(q, type);
            return _qtiManualTextItemXml({ q, index, itemType: type, prompt: diagnostic.prompt, scoringGuide: diagnostic.guide });
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
    // Question and choice pictures travel as QTI matimage files so a picture
    // choice is never a silent blank; pictures that cannot travel are counted.
    const _qtiImageTypes = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg' };
    const _qtiImageXml = (source, label, media, name) => {
        if (typeof source !== 'string' || !source.trim()) return '';
        const match = source.trim().match(/^data:([^;,]+)(?:;[^,]*)?;base64,([a-z0-9+/=\s]+)$/i);
        const mime = match ? match[1].toLowerCase() : '';
        const payload = match ? match[2].replace(/\s+/g, '') : '';
        if (!_qtiImageTypes[mime] || !payload || payload.length > 20 * 1024 * 1024) { media.omitted += 1; return ''; }
        const path = 'images/' + name + '.' + _qtiImageTypes[mime];
        media.files.push({ path, base64: payload });
        return '\n          <matimage imagtype="' + mime + '" uri="' + path + '" label="' + _escapeExportText(label) + '"/>';
    };
    const _qtiWithImages = (xml, q, index, media) => {
        if (!xml || !q || typeof q !== 'object') return xml;
        let out = xml;
        const stem = _qtiImageXml(q.imageUrl, q.imageAltText || q.question || 'Question image', media, 'q' + (index + 1));
        if (stem) out = out.replace(/(<\/mattext>)(\s*<\/material>)/, (_, text, close) => text + stem + close);
        const options = Array.isArray(q.options) ? q.options : [];
        const alts = Array.isArray(q.optionImageAltTexts) ? q.optionImageAltTexts : [];
        (Array.isArray(q.optionImageUrls) ? q.optionImageUrls : []).forEach((source, optionIndex) => {
            if (typeof source !== 'string' || !source.trim()) return;
            const at = out.indexOf('<response_label ident="OPT_' + optionIndex + '">');
            if (at < 0) { media.omitted += 1; return; }
            const image = _qtiImageXml(source, alts[optionIndex] || options[optionIndex] || 'Choice ' + (optionIndex + 1), media, 'q' + (index + 1) + '-choice-' + (optionIndex + 1));
            const close = out.indexOf('</mattext>', at) + '</mattext>'.length;
            if (image) out = out.slice(0, close) + image + out.slice(close);
        });
        return out;
    };
    const tr = (t, key, fallback, count) => {
        let text = fallback;
        try { const translated = typeof t === 'function' ? t(key) : ''; if (translated && translated !== key) text = String(translated); } catch (_) {}
        return text.split('{count}').join(String(count));
    };

    const handleExportQTI = async (options = {}) => {
        const live = liveRef.current;
        const generatedContent = options.generatedContent || live.generatedContent;
        const { sourceTopic, addToast, t } = live;
        if (!window.JSZip) {
            addToast(t('export_status.lib_loading'), "error");
            return false;
        }
        if (!generatedContent || generatedContent.type !== 'quiz') {
            addToast(t('export_status.qti_quiz_only'), "error");
            return false;
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
        const assessmentXmlHeader = `<?xml version="1.0" encoding="UTF-8"?>
<questestinterop xmlns="http://www.imsglobal.org/xsd/ims_qtiasiv1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/ims_qtiasiv1p2 http://www.imsglobal.org/xsd/ims_qtiasiv1p2p1.xsd">
  <assessment ident="${assessmentId}" title="${title}">
    <section ident="root_section">`;
        let itemsXml = "";
        const rawQuestions = Array.isArray(generatedContent && generatedContent.data && generatedContent.data.questions)
            ? generatedContent.data.questions
            : [];
        const scoringPolicy = Object.assign(
            { partialCredit: true },
            generatedContent && generatedContent.data && generatedContent.data.scoringPolicy
                ? generatedContent.data.scoringPolicy
                : {}
        );
        const media = { files: [], omitted: 0 };
        const questionItems = rawQuestions.map((question, questionIndex) =>
            _qtiWithImages(_qtiQuestionItemXml(question, questionIndex, scoringPolicy), question, questionIndex, media)
        );
        const validQuestionItems = questionItems.filter(Boolean);
        const policyAdaptations = rawQuestions.map((question, index) => {
            const adaptation = question && _assessmentManualPolicyAdaptation(question);
            return adaptation && questionItems[index] ? { question: index + 1, itemType: question.type || 'mcq', scoring: 'manual-review', reason: adaptation.reason } : null;
        }).filter(Boolean);
        const reflectionEntries = (Array.isArray(generatedContent && generatedContent.data && generatedContent.data.reflections)
            ? generatedContent.data.reflections
            : [])
            .map((ref) => {
                if (typeof ref === 'string') return ref.trim();
                if (!ref || typeof ref !== 'object') return '';
                return String(ref.text || ref.prompt || ref.question || '').trim();
            })
            .filter(Boolean);

        if (!validQuestionItems.length && !reflectionEntries.length) {
            addToast('No valid assessment questions or reflections are ready for QTI export.', "error");
            return false;
        }
        itemsXml += validQuestionItems.join('');
        if (validQuestionItems.length < rawQuestions.length) {
            addToast(`${rawQuestions.length - validQuestionItems.length} malformed or unsupported assessment item(s) were omitted from the QTI package.`, "warning");
        }

        reflectionEntries.forEach((text, i) => {
            const itemId = `REF_${i}_${generateUUID().slice(0,8)}`;
            const responseId = `REF_RESP_${i}`;
            itemsXml += `
    <item ident="${itemId}" title="${_escapeExportText(t('common.reflection_i_1') || 'Reflection')}">
      ${_qtiItemMetadataXml('reflection', 'essay_question', { manual: true })}
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
        zip.file("imsmanifest.xml", manifestXml.replace('<file href="assessment.xml"/>', '<file href="assessment.xml"/>' + media.files.map(file => '\n      <file href="' + file.path + '"/>').join('')));
        zip.file("assessment.xml", assessmentXmlContent);
        if (policyAdaptations.length) {
            zip.file('alloflow-assessment-compatibility.json', JSON.stringify({ version: 1, format: 'QTI', adaptations: policyAdaptations }, null, 2));
            addToast(policyAdaptations.length + ' assessment item(s) retain their selected policies as ungraded responses requiring teacher review. See alloflow-assessment-compatibility.json.', 'warning');
        }
        media.files.forEach(file => zip.file(file.path, file.base64, { base64: true }));
        try {
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `canvas-quiz-export.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            addToast(t('export_status.qti_success'), "success");
            if (media.files.length) addToast(tr(t, 'export_status.qti_images_packaged', '{count} picture(s) are packaged in this QTI file. Check them after import, because some LMSs do not import quiz pictures.', media.files.length), "info");
            if (media.omitted) addToast(tr(t, 'export_status.qti_images_omitted', '{count} picture(s) could not be packaged (only pictures stored inside the quiz can travel), so those questions or choices appear without their picture.', media.omitted), "warning");
            return true;
        } catch (err) {
            warnLog("QTI Package generation failed", err);
            addToast(t('export_status.package_error'), "error");
            return false;
        }
    };
    // --- handleExportH5P ------------------------------------------------
    // Produces content-only H5P archives that reference official H5P
    // libraries. The destination H5P installation must provide that library.
    const handleExportH5P = async (options = {}) => {
        const live = liveRef.current;
        const generatedContent = options.generatedContent || live.generatedContent;
        const { sourceTopic, addToast, t } = live;
        // Messages through t(); a key it echoes falls back to the English here.
        const h5pText = (key, fallback, params) => {
            const v = typeof t === 'function' ? t(key) : '';
            let text = v && v !== key ? v : fallback;
            Object.keys(params || {}).forEach((p) => { text = String(text).split('{' + p + '}').join(String(params[p])); });
            return text;
        };
        if (!window.JSZip) {
            addToast(t('export_status.lib_loading'), "error");
            return false;
        }
        const type = String(generatedContent && generatedContent.type || '').toLowerCase();
        if (!['quiz', 'glossary', 'flashcards'].includes(type)) {
            addToast(h5pText('export.h5p_unsupported_type', 'H5P export supports quizzes, glossaries, and flashcards.'), "error");
            return false;
        }

        const plain = (value) => (type === 'quiz' ? _exportQuizPlain(value) : String(value == null ? '' : value)).trim();
        const richText = (value) => `<p>${_escapeExportText(plain(value))}</p>`;
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
            'audio/webm': 'webm',
        };
        let mediaOmitted = 0;
        let derivedImageAltCount = 0;
        let audioWithoutTranscriptCount = 0;
        const addEmbeddedAsset = (rawValue, kind, index) => {
            const source = Array.isArray(rawValue)
                ? rawValue.find((value) => typeof value === 'string' && value.trim())
                : rawValue;
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
            packagedAssets.push({ path, mime, base64: payload });
            return { path, mime, copyright: { license: 'U' } };
        };
        let h5pJson;
        let contentJson;
        let omitted = 0;
        let adapted = 0;
        let manualReview = 0;
        const policyAdaptations = [];
        let libraryLabel = '';
        let fileSuffix = 'activity';

        if (type === 'quiz') {
            const rawQuestions = Array.isArray(generatedContent?.data?.questions) ? generatedContent.data.questions : [];
            const allSingleChoice = rawQuestions.length > 0 && rawQuestions.every((q) => !q || !q.type || q.type === 'mcq');
            if (allSingleChoice) {
                const choices = rawQuestions.map((question) => {
                    const prompt = plain(question && question.question);
                    const optionsList = Array.isArray(question && question.options) ? question.options.map(plain) : [];
                    let correctIndex = Number.isInteger(question && question.correctIndex) ? question.correctIndex : -1;
                    if (correctIndex < 0) correctIndex = optionsList.findIndex((option) => option === plain(question && question.correctAnswer));
                    if (!prompt || optionsList.length < 2 || optionsList.length > 4 || optionsList.some((option) => !option) || correctIndex < 0 || correctIndex >= optionsList.length) {
                        omitted += 1;
                        return null;
                    }
                    const orderedAnswers = [optionsList[correctIndex], ...optionsList.filter((_, index) => index !== correctIndex)];
                    return { subContentId: generateUUID(), question: richText(prompt), answers: orderedAnswers.map(richText) };
                }).filter(Boolean);
                if (!choices.length) {
                    addToast(h5pText('export.h5p_no_quiz_items', 'No H5P-compatible quiz questions are ready. Questions need 2–4 options and one identified correct answer.'), "error");
                    return false;
                }
                h5pJson = {
                    title, language: h5pLanguage, mainLibrary: 'H5P.SingleChoiceSet', embedTypes: ['iframe'], license: 'U',
                    authorComments: 'Generated by AlloFlow. Requires H5P.SingleChoiceSet 1.11 on the destination.',
                    preloadedDependencies: [{ machineName: 'H5P.SingleChoiceSet', majorVersion: 1, minorVersion: 11 }],
                };
                contentJson = {
                    choices,
                    overallFeedback: [{ from: 0, to: 100, feedback: '' }],
                    behaviour: { autoContinue: false, timeoutCorrect: 2000, timeoutWrong: 3000, soundEffectsEnabled: false, enableRetry: true, enableSolutionsButton: true, passPercentage: 70 },
                    l10n: {
                        nextButtonLabel: tx('common.next', 'Next'), nextButton: tx('common.next', 'Next'),
                        showResultsButtonLabel: tx('quiz.results', 'Show results'), retryButtonLabel: tx('common.retry', 'Retry'),
                        solutionViewTitle: tx('quiz.solution_list', 'Solution list'), correctText: tx('common.correct', 'Correct') + '!',
                        incorrectText: tx('common.incorrect', 'Incorrect') + '!', shouldSelect: tx('quiz.should_select', 'Should have been selected'),
                        shouldNotSelect: tx('quiz.should_not_select', 'Should not have been selected'), muteButtonLabel: tx('a11y.mute_all_audio', 'Mute feedback sound'),
                        closeButtonLabel: tx('common.close', 'Close'), slideOfTotal: tx('quiz.slide_of_total', 'Slide :num of :total'),
                        scoreBarLabel: tx('quiz.score_bar_label', 'You got :num out of :total points'), solutionListQuestionNumber: tx('common.question_i_1', 'Question') + ' :num',
                        a11yShowSolution: tx('quiz.a11y_show_solution', 'Show the solution. The task will be marked with its correct solution.'),
                        a11yRetry: tx('quiz.a11y_retry', 'Retry the task. Reset all responses and start the task over again.'),
                        resultHeader: tx('quiz.your_result', 'Your result:'), totalScore: tx('quiz.total_score', ':score of :maxScore correct'),
                        resultTableHeader: tx('common.question_i_1', 'Question'), resultScoreTableHeader: tx('common.score', 'Score'),
                        correctAnswerIntroduction: tx('quiz.correct_answer', 'Correct answer'),
                    },
                };
                libraryLabel = 'H5P.SingleChoiceSet 1.11';
                fileSuffix = 'quiz';
            } else {
                const questions = [];
                const used = new Set();
                const addMulti = (prompt, options, correctIndices) => {
                    const clean = Array.isArray(options) ? options.map(plain) : [];
                    const keys = (correctIndices || []).filter((index) => Number.isInteger(index) && index >= 0 && index < clean.length);
                    if (!plain(prompt) || clean.length < 2 || clean.some((option) => !option) || !keys.length) return false;
                    questions.push({
                        library: 'H5P.MultiChoice 1.16', subContentId: generateUUID(),
                        params: {
                            question: richText(prompt),
                            answers: clean.map((option, index) => ({ correct: keys.includes(index), tipsAndFeedback: { tip: '', chosenFeedback: '', notChosenFeedback: '' }, text: richText(option) })),
                            overallFeedback: [{ from: 0, to: 100, feedback: '' }],
                            behaviour: { enableRetry: true, enableSolutionsButton: true, enableCheckButton: true, type: keys.length > 1 ? 'multi' : 'single', singlePoint: false, randomAnswers: false, showSolutionsRequiresInput: true, confirmCheckDialog: false, confirmRetryDialog: false, autoCheck: false, passPercentage: 100, showScorePoints: true },
                            UI: { checkAnswerButton: 'Check', submitAnswerButton: 'Submit', showSolutionButton: 'Show solution', tryAgainButton: 'Retry', tipsLabel: 'Show tip', scoreBarLabel: 'You got :num out of :total points', tipAvailable: 'Tip available', feedbackAvailable: 'Feedback available', correctAnswer: 'Correct answer', shouldCheck: 'Should have been checked', shouldNotCheck: 'Should not have been checked', noInput: 'Please answer before viewing the solution', a11yCheck: 'Check the answers.', a11yShowSolution: 'Show the solution.', a11yRetry: 'Retry the task.' },
                        },
                    });
                    used.add('H5P.MultiChoice');
                    return true;
                };
                const addBlanks = (prompt, answerValues, caseSensitive = false) => {
                    const answers = Array.from(new Set((answerValues || []).map((value) => plain(value).replace(/[*/:]/g, ' ').replace(/\s+/g, ' ').trim()).filter(Boolean)));
                    if (!plain(prompt) || !answers.length) return false;
                    const token = 'ALLOFLOWBLANKTOKEN';
                    const withToken = /_{3,}/.test(prompt) ? plain(prompt).replace(/_{3,}/, token) : plain(prompt) + ' ' + token;
                    const line = richText(withToken).replace(token, '*' + answers.map(_escapeExportText).join('/') + '*');
                    questions.push({
                        library: 'H5P.Blanks 1.14', subContentId: generateUUID(),
                        params: {
                            text: richText('Fill in the missing answer.'), questions: [line], overallFeedback: [{ from: 0, to: 100, feedback: '' }],
                            showSolutions: 'Show solution', tryAgain: 'Retry', checkAnswer: 'Check', submitAnswer: 'Submit',
                            notFilledOut: 'Please fill in the blank to view the solution', answerIsCorrect: "':ans' is correct", answerIsWrong: "':ans' is wrong",
                            answeredCorrectly: 'Answered correctly', answeredIncorrectly: 'Answered incorrectly', solutionLabel: 'Correct answer:',
                            inputLabel: 'Blank input @num of @total', inputHasTipLabel: 'Tip available', tipLabel: 'Tip',
                            behaviour: { enableRetry: true, allowRetryIfCorrect: false, enableSolutionsButton: true, enableCheckButton: true, autoCheck: false, caseSensitive, showSolutionsRequiresInput: true, separateLines: false, confirmCheckDialog: false, confirmRetryDialog: false, acceptSpellingErrors: false },
                            scoreBarLabel: 'You got :num out of :total points', a11yCheck: 'Check the answers.', a11yShowSolution: 'Show the solution.', a11yRetry: 'Retry the task.', a11yCheckingModeHeader: 'Checking mode',
                        },
                    });
                    used.add('H5P.Blanks');
                    return true;
                };
                const addEssay = (prompt, sample) => {
                    if (!plain(prompt)) return false;
                    questions.push({
                        library: 'H5P.Essay 1.5', subContentId: generateUUID(),
                        params: {
                            taskDescription: richText(prompt), placeholderText: 'Type your response here.',
                            solution: { introduction: richText('Use this sample to review your response.'), sample: sample ? richText(sample) : '' },
                            keywords: [{ keyword: '/./', alternatives: [], options: { points: 0, occurrences: 1, caseSensitive: false, forgiveMistakes: true, feedbackIncluded: '', feedbackMissed: '', feedbackIncludedWord: 'none', feedbackMissedWord: 'none' } }],
                            overallFeedback: [{ from: 0, to: 100, feedback: '' }],
                            behaviour: { minimumLength: 1, inputFieldSize: '10', enableRetry: true, ignoreScoring: true, pointsHost: 1, linebreakReplacement: ' ' },
                            checkAnswer: 'Submit', submitAnswer: 'Submit', tryAgain: 'Retry', showSolution: 'Show solution',
                            feedbackHeader: 'Feedback', solutionTitle: 'Sample answer', remainingChars: 'Remaining characters: @chars',
                            notEnoughChars: 'You must enter at least @chars characters!', messageSave: 'saved', ariaYourResult: 'Response submitted.',
                            ariaNavigatedToSolution: 'Navigated to sample solution.', ariaCheck: 'Submit the response.', ariaShowSolution: 'Show the sample solution.', ariaRetry: 'Retry the task.',
                        },
                    });
                    used.add('H5P.Essay');
                    return true;
                };
                rawQuestions.forEach((question, questionIndex) => {
                    const q = question || {};
                    const kind = q.type || 'mcq';
                    const prompt = plain(q.question);
                    if (!prompt) { omitted += 1; return; }
                    let included = false;
                    const adaptation = _assessmentManualPolicyAdaptation(q);
                    if (adaptation) {
                        const partialCredit = generatedContent.data?.scoringPolicy?.partialCredit !== false;
                        included = addEssay(adaptation.prompt + _assessmentExportCriteriaPrompt(q), adaptation.guide + '\nPartial credit: ' + (partialCredit ? 'enabled.' : 'disabled; use all-or-nothing scoring for scored components.'));
                        if (included) { adapted += 1; manualReview += 1; policyAdaptations.push({ question: questionIndex + 1, itemType: kind, scoring: 'manual-review', reason: adaptation.reason }); }
                    } else if (kind === 'mcq') {
                        const options = Array.isArray(q.options) ? q.options.map(plain) : [];
                        const key = Number.isInteger(q.correctIndex) ? q.correctIndex : options.indexOf(plain(q.correctAnswer));
                        included = addMulti(prompt, options, [key]);
                    } else if (kind === 'multi-select') {
                        const options = Array.isArray(q.options) ? q.options.map(plain) : [];
                        const keys = Array.isArray(q.correctAnswers) ? q.correctAnswers.map(plain) : [];
                        const indices = options.map((option, index) => keys.includes(option) ? index : -1).filter((index) => index >= 0);
                        included = indices.length === keys.length && addMulti(prompt, options, indices);
                    } else if (kind === 'fill-blank') {
                        included = addBlanks(prompt, [q.expectedFill].concat(Array.isArray(q.acceptableAlternatives) ? q.acceptableAlternatives : []), q.fillBlankPolicy === 'exact');
                    } else if (kind === 'short-answer' || kind === 'self-explanation') {
                        included = addEssay(prompt + _assessmentExportCriteriaPrompt(q), plain(q.expectedAnswer || q.rubric));
                        if (included) manualReview += 1;
                    } else if (kind === 'sequence-sense') {
                        const items = Array.isArray(q.items) ? q.items.map(plain).filter(Boolean) : [];
                        const displayed = Array.isArray(q.presentedOrder) && q.presentedOrder.length === items.length ? q.presentedOrder.map((index) => items[index]).filter(Boolean) : items;
                        included = items.length >= 3 && addEssay(prompt + ' Displayed order: ' + displayed.join(' → ') + (q.sequenceMode === 'arrange-explain' ? '. Write the correct order and identify the ordering principle.' : '. State whether it is correct, write the correct order, and explain the ordering principle.'), 'Expected order: ' + items.join(' → ') + (q.orderingPrinciple ? '. Principle: ' + plain(q.orderingPrinciple) : '') + (q.sequenceMode === 'arrange-explain' ? '. Score the arrangement and principle only (two components).' : ''));
                        if (included) { adapted += 1; manualReview += 1; }
                    } else if (kind === 'relation-mismatch') {
                        const pairs = Array.isArray(q.pairs) ? q.pairs.filter((pair) => pair && plain(pair.left) && plain(pair.right)) : [];
                        const wrong = Number(q.wrongPairIndex);
                        const candidates = Array.isArray(q.candidatePartners) ? q.candidatePartners.map(plain).filter(Boolean) : [];
                        const repair = candidates.indexOf(plain(q.correctPartnerForWrong));
                        if (prompt && pairs.length >= 2 && Number.isInteger(wrong) && wrong >= 0 && wrong < pairs.length && candidates.length >= 2 && repair >= 0) {
                            included = addMulti(prompt + ' Which displayed pair is the mismatch?', pairs.map((pair) => plain(pair.left) + ' ↔ ' + plain(pair.right)), [wrong])
                                && addMulti('What should ' + plain(pairs[wrong].left) + ' pair with?', candidates, [repair]);
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
                        if (prompt && _hasExportNumericKey(q.correctValue)) {
                            const units = [q.unit].concat(Array.isArray(q.acceptableUnits) ? q.acceptableUnits : []).map(plain).filter(Boolean);
                            if (Number(q.tolerance) > 0) {
                                included = addEssay(prompt + ' This exported item requires manual review because H5P exact-answer fields do not preserve numeric tolerance.', String(expected) + (plain(q.unit) ? ' ' + plain(q.unit) : '') + ' (±' + Number(q.tolerance) + ')');
                                if (included) manualReview += 1;
                            } else {
                                included = addBlanks(prompt, units.length ? units.map((unit) => String(expected) + ' ' + unit) : [String(expected)]);
                            }
                            if (included) adapted += 1;
                        }
                    }
                    if (!included) omitted += 1;
                });
                if (!questions.length) {
                    addToast(h5pText('export.h5p_no_assessment_items', 'No H5P-compatible assessment items are ready. Complete the prompts and answer keys before exporting.'), "error");
                    return false;
                }
                const dependencies = [{ machineName: 'H5P.QuestionSet', majorVersion: 1, minorVersion: 21 }];
                if (used.has('H5P.MultiChoice')) dependencies.push({ machineName: 'H5P.MultiChoice', majorVersion: 1, minorVersion: 16 });
                if (used.has('H5P.Blanks')) dependencies.push({ machineName: 'H5P.Blanks', majorVersion: 1, minorVersion: 14 });
                if (used.has('H5P.Essay')) dependencies.push({ machineName: 'H5P.Essay', majorVersion: 1, minorVersion: 5 });
                h5pJson = {
                    title, language: h5pLanguage, mainLibrary: 'H5P.QuestionSet', embedTypes: ['iframe'], license: 'U',
                    authorComments: 'Generated by AlloFlow. Requires H5P.QuestionSet 1.21 and the referenced child libraries on the destination.',
                    preloadedDependencies: dependencies,
                };
                contentJson = {
                    introPage: { showIntroPage: false, title: richText(title), introduction: '', startButtonText: 'Start quiz' },
                    progressType: 'textual', passPercentage: 70, questions,
                    texts: { prevButton: 'Previous question', previous: 'Previous', nextButton: 'Next question', next: 'Next', finishButton: 'Finish', submitButton: 'Submit', textualProgress: 'Question: @current of @total questions', jumpToQuestion: 'Question %d of %total', questionLabel: 'Question', readSpeakerProgress: 'Question @current of @total', unansweredText: 'Unanswered', answeredText: 'Answered', currentQuestionText: 'Current question', navigationLabel: 'Questions', questionSetInstruction: 'Choose question to display' },
                    disableBackwardsNavigation: false, randomQuestions: false,
                    endGame: { showResultPage: true, showSolutionButton: true, showRetryButton: true, noResultMessage: 'Finished', message: 'Results', amountCorrect: '@finals of @totals correct', scoreBarLabel: 'You got @finals out of @totals points', scoreHeader: 'Score', overallFeedback: [{ from: 0, to: 100, feedback: '' }] },
                    solutionButtonText: 'Show solution', retryButtonText: 'Retry', finishButtonText: 'Finish', submitButtonText: 'Submit',
                    override: { checkButton: true, showSolutionButton: 'on', retryButton: 'on' },
                };
                libraryLabel = 'H5P.QuestionSet 1.21 with ' + Array.from(used).join(', ');
                fileSuffix = 'quiz';
            }
        } else {            const rawData = generatedContent && generatedContent.data;
            const rawCards = Array.isArray(rawData) ? rawData : (Array.isArray(rawData?.cards) ? rawData.cards : (Array.isArray(rawData?.items) ? rawData.items : []));
            const dialogs = rawCards.map((card, index) => {
                const front = plain(type === 'glossary' ? (card?.term ?? card?.word ?? card?.phrase) : (card?.front ?? card?.term ?? card?.question));
                const back = plain(type === 'glossary' ? (card?.def ?? card?.definition ?? card?.meaning) : (card?.back ?? card?.definition ?? card?.answer));
                if (!front || !back) {
                    omitted += 1;
                    return null;
                }
                const dialog = { text: richText(front), answer: richText(back), tips: { front: '', back: '' } };
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
                addToast(h5pText('export.h5p_no_card_pairs', 'No complete term/definition or front/back pairs are ready for H5P export.'), "error");
                return false;
            }
            h5pJson = {
                title,
                language: h5pLanguage,
                mainLibrary: 'H5P.Dialogcards',
                embedTypes: ['iframe'],
                license: 'U',
                authorComments: 'Generated by AlloFlow. Requires H5P.Dialogcards 1.9 on the destination.',
                preloadedDependencies: [{ machineName: 'H5P.Dialogcards', majorVersion: 1, minorVersion: 9 }],
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
                    quickProgression: false,
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
                    confirmLabel: tx('glossary.flashcards.start_over', 'Start over'),
                },
            };
            libraryLabel = 'H5P.Dialogcards 1.9';
            fileSuffix = 'study-cards';
        }

        const accessibilityReport = _auditH5PAccessibility({
            h5pJson,
            contentJson,
            context: { derivedImageAltCount, audioWithoutTranscriptCount },
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
        const accessibilitySummary = h5pText('export.h5p_accessibility_summary', 'Accessibility check: {checks} checks, {repaired} repaired, {review} to review.', { checks: accessibilityReport.checks, repaired: accessibilityReport.repaired, review: accessibilityReport.warnings.length });
        const packageIssues = [];
        if (!h5pJson.title) packageIssues.push('title');
        if (!h5pJson.mainLibrary) packageIssues.push('mainLibrary');
        if (!Array.isArray(h5pJson.embedTypes) || !h5pJson.embedTypes.length) packageIssues.push('embedTypes');
        if (!Array.isArray(h5pJson.preloadedDependencies) || !h5pJson.preloadedDependencies.length) packageIssues.push('preloadedDependencies');
        if (!contentJson || typeof contentJson !== 'object') packageIssues.push('content/content.json');
        if (packageIssues.length) {
            addToast(h5pText('export.h5p_validation_failed', 'H5P package validation failed: {issues}.', { issues: packageIssues.join(', ') }), "error");
            return false;
        }
        if (omitted) addToast(h5pText('export.h5p_omitted', '{count} incompatible or incomplete item(s) were omitted from the H5P package.', { count: omitted }), "warning");
        if (adapted) addToast(h5pText('export.h5p_adapted', '{count} assessment item(s) were adapted to equivalent H5P interactions.', { count: adapted }), "info");
        if (manualReview) addToast(h5pText('export.h5p_manual_review', '{count} exported written, sequence, or tolerance-based item(s) are ungraded and require manual review.', { count: manualReview }), "warning");
        if (policyAdaptations.length) addToast(policyAdaptations.length + ' item(s) use teacher review to preserve the selected answer-matching, numeric, or explanation policies. See alloflow-assessment-compatibility.json.', 'warning');
        if (mediaOmitted) addToast(h5pText('export.h5p_media_omitted', '{count} external, unsupported, or oversized media asset(s) were omitted from the H5P package.', { count: mediaOmitted }), "warning");

        try {
            const zip = new window.JSZip();
            zip.file('h5p.json', JSON.stringify(h5pJson, null, 2));
            zip.file('content/content.json', JSON.stringify(contentJson, null, 2));
            if (policyAdaptations.length) zip.file('alloflow-assessment-compatibility.json', JSON.stringify({ version: 1, format: 'H5P', adaptations: policyAdaptations }, null, 2));
            packagedAssets.forEach((asset) => zip.file(`content/${asset.path}`, asset.base64, { base64: true }));
            const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
            const safeTitle = String(title || '').normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').substring(0, 60) || 'alloflow';
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${safeTitle}-${fileSuffix}.h5p`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.setTimeout(() => URL.revokeObjectURL(url), 1000);
            addToast([
                h5pText('export.h5p_ready', 'H5P package ready.'),
                packagedAssets.length ? h5pText('export.h5p_media_included', '{count} embedded media asset(s) included.', { count: packagedAssets.length }) : '',
                accessibilitySummary,
                h5pText('export.h5p_requires_library', 'The destination must have {library} installed.', { library: libraryLabel }),
            ].filter(Boolean).join(' '), "success");
            return true;
        } catch (error) {
            warnLog('H5P package generation failed', error);
            addToast(h5pText('export.h5p_failed', 'H5P package generation failed.'), "error");
            return false;
        }
    };

    // ─── handleExportIMS ───────────────────────────────────────────────
    const handleExportIMS = async (options = {}) => {
        const {
            history, sourceTopic, studentResponses,
            generateResourceHTML, addToast, t,
        } = liveRef.current;
        if (!window.JSZip) {
            addToast(t('export_status.lib_loading'), "error");
            return false;
        }
        const sourceHistory = _readingSourcePairsForExport(history);
        const liveHtml = typeof options.liveHtml === 'string' ? options.liveHtml.trim() : '';
        const liveTitle = String(options.liveTitle || sourceTopic || t('export.ims_resource_pack') || 'AlloFlow Document').trim();
        if (sourceHistory.length === 0 && !liveHtml) {
            addToast(t('export_status.no_content'), "error");
            return false;
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
                    notes: 'Manifest metadata fallback used after an adapter error.',
                }, extra || {});
            }
        };
        if (liveHtml) {
            packagedEntries.push({
                item: { id: 'builder-live-document', type: 'builder-document', title: liveTitle },
                html: liveHtml,
                profile: {
                    type: 'builder-document', label: 'Builder document', status: 'ready', html: 'static',
                    canExportHtml: true, canExportIms: true, interactiveHtml: false, qti: false,
                    tracking: 'none', fallback: 'static-html', notes: 'Includes the current editable Builder preview.',
                },
                originalIndex: 0,
                completeDocument: true,
            });
        } else sourceHistory.forEach((item, originalIndex) => {
            try {
                const profile = getInteractiveObjectProfileFor(item);
                if (!profile.canExportIms) {
                    skippedEntries.push(safeManifestItem(item, {
                        originalIndex,
                        reason: 'no-ims-adapter',
                    }));
                    return;
                }
                const html = generateResourceHTML(item, false, studentResponses);
                if (html && String(html).trim() !== '') {
                    packagedEntries.push({ item, html, profile, originalIndex });
                } else {
                    skippedEntries.push(safeManifestItem(item, {
                        originalIndex,
                        reason: 'empty-render',
                    }));
                }
            } catch (err) {
                warnLog('IMS resource render failed', err);
                skippedEntries.push(safeManifestItem(item, {
                    originalIndex,
                    reason: 'render-error',
                    error: String(err && err.message ? err.message : err).slice(0, 300),
                }));
            }
        });
        if (!packagedEntries.length) {
            addToast('No IMS-compatible resources are ready to package yet.', 'error');
            return false;
        }
        let profileSummary;
        try {
            profileSummary = liveHtml ? {
                profileVersion: 'builder-live-document', total: 1, imsReady: 1, adapterNeeded: 0,
            } : getInteractiveObjectProfileSummary(sourceHistory);
        } catch (err) {
            warnLog('IMS profile summary fallback', err);
            profileSummary = {
                profileVersion: 'export-fallback',
                total: sourceHistory.length,
                imsReady: packagedEntries.length,
                adapterNeeded: skippedEntries.length,
            };
        }
        const manifestItemForEntry = (entry, extra) => entry.completeDocument
            ? Object.assign({}, entry.profile, {
                id: entry.item.id, type: entry.item.type, title: entry.item.title,
            }, extra || {})
            : safeManifestItem(entry.item, extra);
        const packageProfile = {
            kind: 'alloflow.ims-object-profile',
            generatedAt: new Date().toISOString(),
            topic: sourceTopic || defaultTitle,
            summary: profileSummary,
            packaged: packagedEntries.map((entry, idx) => manifestItemForEntry(entry, {
                originalIndex: entry.originalIndex,
                packageIndex: idx,
                filename: `resource_${idx}.html`,
                renderedInIms: true,
            })),
            skipped: skippedEntries,
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
                renderedInIms: true,
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
            const content = await zip.generateAsync({ type: "blob" });
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
            return true;
        } catch (err) {
            warnLog("Package generation failed", err);
            addToast(t('export_status.package_error'), "error");
            return false;
        }
    };

    // ─── handleExportSlides ───────────────────────────────────────────
    const handleExportSlides = async (options = {}) => {
        const { sourceTopic, gradeLevel, addToast, t } = liveRef.current;
        const history = _readingSourcePairsForExport(Object.prototype.hasOwnProperty.call(options, 'history') ? options.history : liveRef.current.history);
        // 'student' leaves activity answer keys and facilitation notes off the slides.
        const slideAudience = options.audience === 'student' ? 'student' : 'teacher';
        if (Object.prototype.hasOwnProperty.call(options, 'liveHtml')) {
            try {
                if (typeof options.liveHtml !== 'string' || !options.liveHtml.trim()) throw new Error('The editable preview is not ready.');
                let api = window.AlloModules?.AccessibleOfficeExport;
                if (!api?.build && typeof window.__alloEnsurePdfAuditView === 'function') {
                    await window.__alloEnsurePdfAuditView();
                    api = window.AlloModules?.AccessibleOfficeExport;
                }
                if (!api?.build) throw new Error('The document slide exporter is still loading. Please try again.');
                const result = await api.build({ html: options.liveHtml, title: options.liveTitle || sourceTopic, format: 'pptx' });
                if (!result?.blob) throw new Error('The slide export did not produce a file.');
                const url = URL.createObjectURL(result.blob), anchor = document.createElement('a');
                try { anchor.href = url; anchor.download = result.fileName; document.body.appendChild(anchor); anchor.click(); }
                finally { anchor.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000); }
                addToast(result.message, 'success');
                return true;
            } catch (error) {
                addToast('Slides export failed: ' + (error?.message || 'unknown error') + '. Your document remains open.', 'error');
                return false;
            }
        }
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
                'indigo': '6366F1', 'blue': '3B82F6', 'green': '22C55E',
                'yellow': 'EAB308', 'orange': 'F97316', 'red': 'EF4444',
                'purple': 'A855F7', 'pink': 'EC4899', 'teal': '14B8A6',
                'cyan': '06B6D4', 'emerald': '10B981', 'rose': 'F43F5E',
            };
            pptx.defineSlideMaster({
                title: "MASTER_SLIDE",
                background: { color: lightBg },
                objects: [
                    { rect: { x: 0, y: 0, w: "100%", h: 0.75, fill: { color: themeColor } } },
                    { placeholder: { options: { name: "slideTitle", type: "title", x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText }, text: "" } },
                    { rect: { x: 0, y: 5.25, w: "100%", h: 0.375, fill: { color: "E2E8F0" } } },
                    { text: { text: t('export.slides_master_footer'), options: { x: 0.5, y: 5.3, w: 4, h: 0.3, fontSize: 11, color: "64748B" } } },
                    { slideNumber: { x: 9.0, y: 5.3, fontSize: 11, color: "64748B" } }
                ]
            });
            pptx.defineSlideMaster({
                title: "MASTER_TITLE", background: { color: themeColor }, objects: [
                    { placeholder: { options: { name: "deckTitle", type: "title", x: 0.5, y: 1.5, w: 9, h: 2, fontSize: 44, fontFace: 'Arial', color: lightText, bold: true, align: 'center', valign: 'middle' }, text: "" } }
                ]
            });
            pptx.title = sourceTopic || t('export.slides_title_default');
            pptx.subject = t('export.slides_subject');
            pptx.author = "AlloFlow";
            pptx.lang = (document.documentElement && document.documentElement.lang) || 'en';
            const addA11yNotes = (slide, title, content) => { try { slide.addNotes(title + (content ? ': ' + content.substring(0, 500) : '')); } catch(e) {} };
            const addSlideTitle = (slide, text) => slide.addText(text, { placeholder: 'slideTitle' });
            const titleSlide = pptx.addSlide({ masterName: "MASTER_TITLE" });
            titleSlide.background = { color: themeColor };
            addA11yNotes(titleSlide, 'Title: ' + (sourceTopic || 'Lesson'), 'Grade level: ' + gradeLevel);
            titleSlide.addText(sourceTopic || t('export.slides_title_default'), { placeholder: 'deckTitle' });
            titleSlide.addText(`${t('export.ppt_grade_level')}: ${gradeLevel} | ${t('export.ppt_generated')}: ${new Date().toLocaleDateString()}`, {
                x: 0.5, y: 3.5, w: 9, h: 0.5,
                fontSize: 18, fontFace: 'Arial', color: 'E0E7FF',
                align: 'center',
            });
            const chunkText = (value, limit) => {
                const chunks = []; let remaining = String(value || '').trim(); const max = Math.max(120, limit || 700);
                while (remaining.length > max) { let at = remaining.lastIndexOf(' ', max); if (at < max * 0.55) at = remaining.indexOf(' ', max); if (at < 1) at = max; chunks.push(remaining.slice(0, at).trim()); remaining = remaining.slice(at).trim(); }
                if (remaining) chunks.push(remaining); return chunks;
            };
            const resourceText = (value, seen) => {
                if (value == null) return '';
                if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
                if (typeof value !== 'object') return '';
                seen = seen || new Set(); if (seen.has(value)) return ''; seen.add(value);
                const parts = Array.isArray(value) ? value.map((v) => resourceText(v, seen)) : Object.keys(value).filter((k) => !/^(id|color|imageUrl|url)$/i.test(k)).map((k) => resourceText(value[k], seen));
                return parts.filter(Boolean).join('\n');
            };
            // Every history item either gets slides or is NAMED in the closing
            // toast. Before 2026-09-02 anything outside the handled types was
            // dropped silently while the toast still said "PowerPoint downloaded!".
            const skipped = [];
            const SKIPPED_TYPES = new Set(['persona', 'adventure', 'gemini-bridge', 'word-sounds', 'storyforge-config', 'storyforge-submission', 'stem-assessment', 'fluency-record']);
            const _exportHandlers = (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.ExportHandlers) || null;
            const _summarizeResource = _exportHandlers && typeof _exportHandlers.summarizeResourceText === 'function' ? _exportHandlers.summarizeResourceText : null;
            const _memoryAidRules = (typeof window !== 'undefined' && window.AlloModules && window.AlloModules.MemoryAid && window.AlloModules.MemoryAid.exportRules) || null;
            const _nsT = (key, fallback) => { const v = t(key); return typeof v === 'string' && v && v !== key ? v : fallback; };
            const clip = (value, max) => String(value == null ? '' : value).replace(/\s+/g, ' ').trim().slice(0, max || 2000);
            const listOf = (value, max) => (Array.isArray(value) ? value : []).map((v) => clip(typeof v === 'string' ? v : (v && (v.text || v.label || v.content)) || '', 600)).filter(Boolean).slice(0, max || 10);
            const addTextSlides = (slideTitle, text) => {
                const chunks = chunkText(text || slideTitle, 760);
                chunks.forEach((chunk, index) => {
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    addSlideTitle(slide, slideTitle + (index ? ' (Cont.)' : ''));
                    addA11yNotes(slide, slideTitle, chunk);
                    slide.addText(chunk, { x: 0.6, y: 1.0, w: 8.8, h: 3.9, fontSize: 17, color: darkText, valign: 'top', breakLine: true, margin: 0.08, fit: 'shrink' });
                });
            };
            const addRichSlide = (slideTitle, runs, notes) => {
                const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                addSlideTitle(slide, slideTitle);
                addA11yNotes(slide, slideTitle, notes || '');
                slide.addText(runs, { x: 0.5, y: 1.0, w: 9, h: 4.1, valign: 'top', fit: 'shrink', margin: 0.04 });
                return slide;
            };
            const heading = (text, color) => ({ text, options: { fontSize: 13, bold: true, color: color || themeColor, breakLine: true, bullet: false, paraSpaceBefore: 6 } });
            const body = (text, size) => ({ text, options: { fontSize: size || 14, color: darkText, breakLine: true, bullet: false } });
            const bullet = (text) => ({ text, options: { fontSize: 13, color: darkText, breakLine: true, bullet: { code: '2022', color: "94A3B8" }, indentLevel: 1 } });
            history.forEach(item => {
                const type = item.type;
                const readingContract = window.AlloModules?.InstructionalContext;
                const originalReading = !!readingContract?.isSupportedOriginal?.(item);
                const readingRoleLabel = type === 'simplified' ? readingContract?.getReadingRoleLabel?.(item) || '' : '';
                const itemTitle = (item.title || (originalReading ? 'Original with supports' : getDefaultTitle(type)))
                    + (readingRoleLabel ? ' · ' + readingRoleLabel : '');
                if (originalReading) {
                    // Keep every character, including speaker labels and line
                    // breaks. Slide boundaries are the only added structure.
                    let remaining = item.data;
                    let page = 0;
                    while (remaining.length) {
                        let end = Math.min(680, remaining.length);
                        if (end < remaining.length) {
                            const boundary = Math.max(remaining.lastIndexOf('\n', end), remaining.lastIndexOf(' ', end));
                            if (boundary > end * 0.5) end = boundary + 1;
                        }
                        const chunk = remaining.slice(0, end);
                        remaining = remaining.slice(end);
                        const slide = pptx.addSlide({ masterName: 'MASTER_SLIDE' });
                        addSlideTitle(slide, 'Original with supports: ' + itemTitle + (page++ ? ' (Cont.)' : ''));
                        addA11yNotes(slide, itemTitle, chunk);
                        slide.addText(chunk, { x: 0.6, y: 1.0, w: 8.8, h: 3.9, fontSize: 17, color: darkText, valign: 'top', margin: 0.08, fit: 'shrink' });
                    }
                    const supports = readingContract.validateReadingSupports(item, item.readingSupports);
                    if (supports.annotations.length) addTextSlides('Word help: ' + itemTitle, supports.annotations.map(annotation => annotation.quote + ': ' + annotation.text).join('\n\n'));
                } else if (type === 'simplified') {
                    const textData = typeof item.data === 'string' ? item.data : '';
                    if (!textData) return;
                    const paragraphs = textData.split(/\n{2,}/).flatMap((paragraph) => chunkText(paragraph, 700));
                    let currentSlideObjects = [];
                    let currentSlideLen = 0;
                    const MAX_SLIDE_CHARS = 900;
                    paragraphs.forEach((para) => {
                        const rawText = para.replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/\*\*/g, '').replace(/\*/g, '');
                        if (currentSlideLen + rawText.length > MAX_SLIDE_CHARS && currentSlideObjects.length > 0) {
                            const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                            addA11yNotes(slide, itemTitle, rawText.substring(0, 300));
                            addSlideTitle(slide, itemTitle);
                            slide.addText(currentSlideObjects, {
                                x: 0.5, y: 1.0, w: 9, h: 4.0,
                                fontSize: 14, color: darkText, valign: 'top', align: 'left',
                                lineSpacing: 18, fit: 'shrink', margin: 0.05
                            });
                            currentSlideObjects = [];
                            currentSlideLen = 0;
                        }
                        if (currentSlideObjects.length > 0) {
                            currentSlideObjects.push({ text: "\n\n" });
                            currentSlideLen += 2;
                        }
                        const parts = para.split(/(\[.*?\]\(.*?\))/g);
                        parts.forEach(part => {
                            const linkMatch = part.match(/^\[(.*?)\]\((.*?)\)$/);
                            if (linkMatch) {
                                currentSlideObjects.push({
                                    text: linkMatch[1],
                                    options: { hyperlink: { url: linkMatch[2] }, color: "3B82F6" }
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
                        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        addA11yNotes(slide, itemTitle, textData.substring(0, 300));
                        addSlideTitle(slide, itemTitle);
                        slide.addText(currentSlideObjects, {
                            x: 0.5, y: 1.0, w: 9, h: 4.0,
                            fontSize: 14, color: darkText, valign: 'top', align: 'left',
                            lineSpacing: 18
                        });
                    }
                } else if (type === 'glossary') {
                    const entries = Array.isArray(item.data) ? item.data : [];
                    const hasTrans = entries.some((entry) => entry.translations && Object.keys(entry.translations).length > 0);
                    const header = hasTrans
                        ? [
                            { text: t('export.term_col'), options: { bold: true, fill: "F1F5F9", color: darkText } },
                            { text: t('export.def_col'), options: { bold: true, fill: "F1F5F9", color: darkText } },
                            { text: t('export.trans_col'), options: { bold: true, fill: "F1F5F9", color: darkText } }
                          ]
                        : [
                            { text: t('export.term_col'), options: { bold: true, fill: "F1F5F9", color: darkText } },
                            { text: t('export.def_col'), options: { bold: true, fill: "F1F5F9", color: darkText } }
                          ];
                    const pages = [];
                    let page = [], pageLines = 0;
                    entries.forEach((entry) => {
                        const translations = hasTrans && entry.translations ? Object.values(entry.translations).join(' / ') : '';
                        const row = hasTrans ? [entry.term || '', entry.def || '', translations] : [entry.term || '', entry.def || ''];
                        const rowLines = Math.max(1, ...row.map((cell) => Math.ceil(String(cell).length / (hasTrans ? 34 : 48))));
                        if (page.length && (page.length >= 7 || pageLines + rowLines > 10)) { pages.push(page); page = []; pageLines = 0; }
                        page.push(row); pageLines += rowLines;
                    });
                    if (page.length || !pages.length) pages.push(page);
                    pages.forEach((pageEntries, pageIndex) => {
                        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        addSlideTitle(slide, itemTitle + (pageIndex ? ' (Cont.)' : ''));
                        addA11yNotes(slide, itemTitle, 'Glossary terms: ' + pageEntries.slice(0, 5).map((row) => row[0]).join(', '));
                        if (!pageEntries.length) {
                            slide.addText(t('export.no_content') || 'No glossary entries.', { x: 0.6, y: 1.1, w: 8.8, h: 0.7, fontSize: 16, color: darkText, fit: 'shrink' });
                            return;
                        }
                        slide.addTable([header].concat(pageEntries), {
                            x: 0.5, y: 1.0, w: 9,
                            colW: hasTrans ? [2, 4.5, 2.5] : [2.5, 6.5],
                            border: { pt: 0.75, color: "CBD5E1" },
                            fill: { color: "FFFFFF" },
                            fontSize: hasTrans ? 9.5 : 10.5,
                            color: darkText,
                            autoPage: false,
                            margin: 0.04,
                            valign: 'middle',
                        });
                    });
                } else if (type === 'quiz') {
                    const questions = item.data.questions || [];
                    questions.forEach((q, i) => {
                        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        addSlideTitle(slide, t('export.slides_question_title', { number: i + 1 }));
                        slide.addText(_pptxQuizRuns(q.question, { fontSize: 18, bold: true, color: darkText }, themeColor), {
                            x: 0.5, y: 1.0, w: 9, h: 1.2,
                            fontSize: 18, color: darkText, valign: 'top', fit: 'shrink', margin: 0.04,
                        });
                        (Array.isArray(q.options) ? q.options : []).forEach((opt, idx) => {
                            const yPos = 2.3 + (idx * 0.7);
                            slide.addShape(pptx.ShapeType.rect, {
                                x: 1.0, y: yPos, w: 8, h: 0.55,
                                fill: { color: "FFFFFF" },
                                line: { color: "CBD5E1", width: 1 }
                            });
                            slide.addShape(pptx.ShapeType.ellipse, {
                                x: 1.1, y: yPos + 0.1, w: 0.35, h: 0.35,
                                fill: { color: "E0E7FF" },
                                line: { color: themeColor }
                            });
                            slide.addText(String.fromCharCode(65+idx), {
                                x: 1.1, y: yPos + 0.1, w: 0.35, h: 0.35,
                                fontSize: 12, bold: true, color: themeColor, align: 'center', valign: 'middle',
                            });
                            slide.addText(_pptxQuizRuns(opt, { fontSize: 14, color: darkText }), {
                                x: 1.6, y: yPos, w: 7.2, h: 0.55,
                                fontSize: 14, color: darkText, valign: 'middle', fit: 'shrink', margin: 0.03
                            });
                        });
                        slide.addNotes(`${t('export.ppt_correct_note')}: ${_exportQuizPlain(q.correctAnswer)}\n\n${cleanTextForPptx(q.factCheck)}`);
                    });
                    const ANSWERS_PER_SLIDE = 6;
                    for (let ak = 0; ak < questions.length; ak += ANSWERS_PER_SLIDE) {
                        const akChunk = questions.slice(ak, ak + ANSWERS_PER_SLIDE);
                        const akSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        addSlideTitle(akSlide, ak === 0 ? `${itemTitle} — ${t('export.answer_key_title') || 'Answer Key'}` : `${itemTitle} — ${t('export.answer_key_title') || 'Answer Key'} (${t('common.continued') || 'Cont.'})`);
                        const akRichText = [];
                        akChunk.forEach((q, idx) => {
                            const qNum = ak + idx + 1;
                            const correctLetter = q.options ? String.fromCharCode(65 + q.options.indexOf(q.correctAnswer)) : '?';
                            akRichText.push({
                                text: `Q${qNum}: ${correctLetter}) ${_exportQuizPlain(q.correctAnswer || '')}`,
                                options: { fontSize: 13, bold: true, color: "16A34A", breakLine: true, bullet: false }
                            });
                            if (q.factCheck) {
                                akRichText.push({
                                    text: cleanTextForPptx(q.factCheck),
                                    options: { fontSize: 10, color: "64748B", breakLine: true, italic: true, bullet: false, paraSpaceAfter: 10 }
                                });
                            }
                        });
                        akSlide.addNotes('Answer Key: ' + akChunk.map(function(q,i){return 'Q'+(ak+i+1)+': '+q.correctAnswer}).join(', '));
                        akSlide.addText(akRichText, { x: 0.5, y: 1.0, w: 9, h: 4.0, valign: 'top', fit: 'shrink', margin: 0.04 });
                    }
                } else if (type === 'image' && item.data.imageUrl) {
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    addSlideTitle(slide, itemTitle);
                    slide.addImage({
                        data: item.data.imageUrl,
                        x: 'center', y: 1.0,
                        w: 8, h: 3.5,
                        sizing: { type: 'contain', w: 9, h: 3.5 },
                        altText: item.data.prompt || item.title || 'Visual support image'
                    });
                    slide.addText(item.data.prompt, {
                        x: 0.5, y: 4.6, w: 9, h: 0.6,
                        fontSize: 10, color: "64748B", italic: true, align: 'center', valign: 'top', fit: 'shrink', margin: 0.03,
                    });
                    addA11yNotes(slide, itemTitle, 'Image: ' + (item.data.prompt || ''));
                } else if (type === 'outline') {
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    addSlideTitle(slide, item.data.main || itemTitle);
                    const richText = [];
                    const branches = Array.isArray(item.data.branches) ? item.data.branches : [];
                    // KWL teacher examples: a student deck gets the prompt instead; a teacher deck labels them.
                    const kwlExamples = item.data.structureType === 'KWL Chart' && branches.some(b => b && b.teacherExample === true);
                    const kwlPrompts = [['kwl_prompt_know', 'What do you already know?'], ['kwl_prompt_want', 'What do you want to know?'], ['kwl_prompt_learned', 'What did you learn?']];
                    branches.forEach((b, bi) => {
                        richText.push({
                            text: b.title,
                            options: { fontSize: 16, bold: true, breakLine: true, color: themeColor, bullet: { type: 'number', color: themeColor } }
                        });
                        const kwlItems = Array.isArray(b.items) ? b.items : [];
                        const kwlStudentPrompt = kwlExamples && slideAudience === 'student' && kwlPrompts[bi]
                            && (b.teacherExample === true || (!kwlItems.length && item.data.kwlTeacherExamples === true));
                        const kwlNote = kwlStudentPrompt ? _nsT('outline.' + kwlPrompts[bi][0], kwlPrompts[bi][1])
                            : kwlExamples && slideAudience !== 'student' && b.teacherExample === true && kwlItems.length ? _nsT('outline.kwl_teacher_examples', 'Teacher examples (hidden from students)') : '';
                        if (kwlNote) richText.push({ text: kwlNote, options: { fontSize: 13, italic: true, breakLine: true, color: '475569', indentLevel: 1 } });
                        if (kwlStudentPrompt) return;
                        if (Array.isArray(b.items)) {
                            b.items.forEach(sub => {
                                richText.push({
                                    text: sub,
                                    options: { fontSize: 14, breakLine: true, color: darkText, bullet: { code: '2022', color: "94A3B8" }, indentLevel: 1 }
                                });
                            });
                        }
                    });
                    addA11yNotes(slide, item.data.main || itemTitle, 'Graphic organizer with ' + branches.length + ' branches');
                    slide.addText(richText, {
                        x: 0.5, y: 1.0, w: 9, h: 4.2,
                        valign: 'top', fit: 'shrink', margin: 0.04,
                    });
                } else if (type === 'timeline') {
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    addSlideTitle(slide, itemTitle);
                    const timelineItems = item.data || [];
                    addA11yNotes(slide, itemTitle, 'Timeline with ' + (item.data || []).length + ' events');
                    const ITEMS_PER_SLIDE = 5;
                    for (let i = 0; i < timelineItems.length; i += ITEMS_PER_SLIDE) {
                        const chunk = timelineItems.slice(i, i + ITEMS_PER_SLIDE);
                        const isContinuation = i > 0;
                        const currentSlide = isContinuation ? pptx.addSlide({ masterName: "MASTER_SLIDE" }) : slide;
                        if (isContinuation) {
                            addSlideTitle(currentSlide, itemTitle + " (Cont.)");
                        }
                        chunk.forEach((tItem, idx) => {
                            const yBase = 1.0 + (idx * 0.8);
                            currentSlide.addShape(pptx.ShapeType.line, { x: 1.0, y: yBase, w: 0, h: 0.8, line: { color: "CBD5E1", width: 2 } });
                            currentSlide.addShape(pptx.ShapeType.ellipse, { x: 0.9, y: yBase, w: 0.2, h: 0.2, fill: { color: themeColor } });
                            currentSlide.addText(tItem.date, {
                                x: 1.3, y: yBase - 0.1, w: 2.0, h: 0.4,
                                fontSize: 12, bold: true, color: themeColor
                            });
                            currentSlide.addText(tItem.event, {
                                x: 3.4, y: yBase - 0.1, w: 6.0, h: 0.6,
                                fontSize: 12, color: darkText, valign: 'top', fit: 'shrink', margin: 0.03,
                            });
                        });
                    }
                } else if (type === 'concept-sort') {
                    let categories = Array.isArray(item.data && item.data.categories) ? item.data.categories.slice() : [];
                    const items = Array.isArray(item.data && item.data.items) ? item.data.items : [];
                    const known = new Set(categories.map((category) => category.id));
                    if (items.some((entry) => !known.has(entry.categoryId))) categories.push({ id: '__uncategorized', label: t('export.uncategorized') || 'Uncategorized', color: '' });
                    if (!categories.length) {
                        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        addSlideTitle(slide, itemTitle);
                        slide.addText(t('export.no_categories') || 'No categories were provided.', { x: 0.6, y: 1.1, w: 8.8, h: 0.7, fontSize: 16, color: darkText, fit: 'shrink' });
                    }
                    const categoryGroups = [];
                    for (let start = 0; start < categories.length; start += 4) categoryGroups.push(categories.slice(start, start + 4));
                    categoryGroups.forEach((group, groupIndex) => {
                        const lists = group.map((category) => items.filter((entry) => category.id === '__uncategorized' ? !known.has(entry.categoryId) : entry.categoryId === category.id));
                        const pageCount = Math.max(1, ...lists.map((list) => Math.ceil(list.length / 6)));
                        for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
                            const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
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
                                slide.addShape(pptx.ShapeType.rect, { x: xPos + 0.08, y: 1.0, w: colWidth - 0.16, h: 0.52, fill: { color: headerColor }, line: { color: 'CBD5E1', width: 0.75 } });
                                slide.addText(category.label || '', { x: xPos + 0.12, y: 1.04, w: colWidth - 0.24, h: 0.42, fontSize: 13, bold: true, color: darkText, align: 'center', valign: 'mid', fit: 'shrink', margin: 0.02 });
                                lists[categoryIndex].slice(pageIndex * 6, pageIndex * 6 + 6).forEach((entry, itemIndex) => {
                                    const yOffset = 1.62 + itemIndex * 0.58;
                                    slide.addText(entry.content || '', { x: xPos + 0.08, y: yOffset, w: colWidth - 0.16, h: 0.48, fontSize: 10.5, color: "475569", align: 'center', valign: 'mid', fit: 'shrink', margin: 0.03, shape: pptx.ShapeType.rect, fill: { color: "FFFFFF" }, line: { color: "E2E8F0", width: 0.6 } });
                                });
                            });
                            addA11yNotes(slide, itemTitle, group.map((category, index) => category.label + ': ' + lists[index].slice(pageIndex * 6, pageIndex * 6 + 6).map((entry) => entry.content).join(', ')).join('; '));
                        }
                    });
                } else if (type === 'faq' || type === 'brainstorm' || type === 'sentence-frames') {
                    // Activities redesign (2026-08-16): discussion/jigsaw items
                    // have structure the generic flattener turns into label-less
                    // soup (and it would sit answers directly under questions).
                    // Route them through GenDispatcher.describeActivityItem with
                    // t()-driven section labels; idea cards and other types keep
                    // the old flatten path byte-for-byte. Falls back gracefully
                    // if the dispatcher module is not loaded (restored project,
                    // export before any generation).
                    const _dispatcherMod = (typeof window !== 'undefined') && window.AlloModules && window.AlloModules.GenDispatcher;
                    const _describeActivity = _dispatcherMod && typeof _dispatcherMod.describeActivityItem === 'function' ? _dispatcherMod.describeActivityItem : null;
                    const _activityLabels = () => {
                        const out = {};
                        [['protocol', 'brainstorm.protocol_label'],
                         ['depth_literal', 'brainstorm.depth_literal'], ['depth_inferential', 'brainstorm.depth_inferential'], ['depth_evaluative', 'brainstorm.depth_evaluative'],
                         ['talk_stems', 'brainstorm.talk_stems'], ['stems_agree', 'brainstorm.stems_agree'], ['stems_disagree', 'brainstorm.stems_disagree'], ['stems_clarify', 'brainstorm.stems_clarify'], ['stems_build', 'brainstorm.stems_build'],
                         ['facilitation_notes', 'brainstorm.facilitation_notes'], ['look_fors', 'brainstorm.look_fors'],
                         ['expert_group', 'brainstorm.expert_group'], ['teach_back_points', 'brainstorm.teach_back_points'], ['teach_back_questions', 'brainstorm.teach_back_questions'],
                         ['home_group_task', 'brainstorm.home_group_task'], ['synthesis_organizer', 'brainstorm.synthesis_organizer'],
                         ['accountability_check', 'brainstorm.accountability_check'], ['answer_key', 'brainstorm.answer_key']].forEach(([slot, key]) => {
                            const v = t(key);
                            if (v) out[slot] = v;
                        });
                        return out;
                    };
                    const text = (type === 'brainstorm' && Array.isArray(item.data) && _describeActivity
                        ? item.data.map(entry => (entry && (entry.kind === 'discussion' || entry.kind === 'jigsaw'))
                            ? _describeActivity(entry, _activityLabels(), { audience: slideAudience })
                            : resourceText(entry)).filter(Boolean).join('\n\n')
                        : resourceText(item.data)).replace(/\n{3,}/g, '\n\n').trim();
                    const chunks = chunkText(text || itemTitle, 760);
                    chunks.forEach((chunk, index) => {
                        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        addSlideTitle(slide, itemTitle + (index ? ' (Cont.)' : ''));
                        addA11yNotes(slide, itemTitle, chunk);
                        slide.addText(chunk, { x: 0.6, y: 1.0, w: 8.8, h: 3.9, fontSize: 17, color: darkText, valign: 'top', breakLine: true, margin: 0.08, fit: 'shrink' });
                    });
                } else if (type === 'memory-aid' && item.data && typeof item.data === 'object') {
                    // Memory Aid Studio: one slide per target, cue first, facts labelled
                    // by the module's shared review rule (fail-safe: unverified when the
                    // module is absent). Never the source excerpt, practice evidence,
                    // feedback, or images.
                    const cards = Array.isArray(item.data.cards) ? item.data.cards.slice(0, 8) : [];
                    const instructions = clip(item.data.instructions, 600);
                    if (instructions) addTextSlides(itemTitle, instructions);
                    if (!cards.length && !instructions) { skipped.push(itemTitle); return; }
                    cards.forEach((card, ci) => {
                        const c = card && typeof card === 'object' ? card : {};
                        const facts = listOf(c.essentialFacts || c.facts, 10);
                        const verified = !!(_memoryAidRules && typeof _memoryAidRules.isCardVerified === 'function' && _memoryAidRules.isCardVerified(c));
                        const cueBlock = _memoryAidRules && typeof _memoryAidRules.cueBlock === 'function' ? _memoryAidRules.cueBlock(c) : null;
                        const cue = c.cueNeedsReview ? '' : cueBlock ? clip(cueBlock.cue, 700) : clip(c.studentDraft || c.aiExample || c.scaffoldStarter, 700);
                        const target = clip(c.target, 300) || _nsT('memory_aid.memory_target', 'Memory target');
                        const factsLabel = verified ? _nsT('memory_aid.facts_student_heading', 'Facts to remember') : _nsT('memory_aid.facts_pending_student_note', 'Your teacher is still checking these facts. Recall practice opens when they finish.');
                        const runs = [{ text: target, options: { fontSize: 20, bold: true, color: darkText, breakLine: true, bullet: false } }];
                        if (cue) runs.push({ text: cue, options: { fontSize: 15, bold: true, color: "0F766E", breakLine: true, bullet: false, paraSpaceBefore: 4 } });
                        // The module hands back exactly one filled rung, so a card
                        // with no drafted cue still projects something to work from.
                        if (cueBlock && cueBlock.steps.length) {
                            runs.push(heading(_nsT('memory_aid.scaffold_heading', 'Build it with support'), "3730A3"));
                            cueBlock.steps.forEach((step) => runs.push(bullet(clip(step, 500))));
                        }
                        if (cueBlock && cueBlock.visualDescription) runs.push({ text: _nsT('memory_aid.export_visual_cue_described', 'Picture cue, described:') + ' ' + clip(cueBlock.visualDescription, 700), options: { fontSize: 13, color: "0F766E", breakLine: true, bullet: false, paraSpaceBefore: 4 } });
                        if (cueBlock && cueBlock.prompts.length) {
                            runs.push(heading(_nsT('memory_aid.coach_heading', 'Coach questions'), "5B21B6"));
                            cueBlock.prompts.forEach((prompt) => runs.push(bullet(clip(prompt, 500))));
                        }
                        runs.push(heading(factsLabel, verified ? "166534" : "92400E"));
                        facts.forEach((fact) => runs.push(bullet(fact)));
                        const hook = _memoryAidRules && typeof _memoryAidRules.hookFact === 'function' ? _memoryAidRules.hookFact(c) : null;
                        if (hook) {
                            runs.push({ text: _nsT('memory_aid.hook_heading', 'Did you know?') + ' ' + clip(hook.text, 400), options: { fontSize: 12, color: "9A3412", breakLine: true, bullet: false, paraSpaceBefore: 6 } });
                            // Provenance travels with the claim, as it does in the view and the HTML lane.
                            if (hook.webVerified && hook.sourceUrl) {
                                const hookHost = hook.sourceHost && hook.sourceTitle ? ' \u00B7 ' + _nsT('memory_aid.hook_source_host', 'goes to {host}').replace('{host}', hook.sourceHost) : '';
                                runs.push({ text: _nsT('memory_aid.hook_from_web_note', 'From the web. Check the source:') + ' ' + clip(hook.sourceTitle || hook.sourceUrl, 200) + hookHost, options: { fontSize: 10, color: "78716C", breakLine: true, bullet: false, hyperlink: { url: hook.sourceUrl, tooltip: clip(hook.sourceTitle || hook.sourceUrl, 200) } } });
                            } else {
                                runs.push({ text: _nsT('memory_aid.hook_unsourced_note', 'Fun fact from AI knowledge. Ask your teacher if you want to check it.'), options: { fontSize: 10, color: "78716C", breakLine: true, bullet: false } });
                            }
                        }
                        const connections = _memoryAidRules && typeof _memoryAidRules.activeConnections === 'function' ? _memoryAidRules.activeConnections(c) : [];
                        const customCue = !(_memoryAidRules && typeof _memoryAidRules.customCue === 'function') || _memoryAidRules.customCue(c);
                        if (connections.length) connections.forEach(connection => {
                            const fact = facts[connection.factIndex];
                            if (fact) runs.push({ text: clip(connection.cue, 200) + ': ' + clip(fact, 600) + (connection.explanation ? ' ' + clip(connection.explanation, 600) : ''), options: { fontSize: 12, italic: true, color: "475569", breakLine: true, bullet: false, paraSpaceBefore: 6 } });
                        });
                        else if (c.mapping && !c.cueNeedsReview && !customCue) runs.push({ text: clip(c.mapping, 500), options: { fontSize: 12, italic: true, color: "475569", breakLine: true, bullet: false, paraSpaceBefore: 6 } });
                        const cueNote = cue
                            || (cueBlock && cueBlock.steps.length ? cueBlock.steps.join(' ') : '')
                            || (cueBlock && cueBlock.visualDescription)
                            || (cueBlock && cueBlock.prompts.length ? cueBlock.prompts.join(' ') : '');
                        addRichSlide(itemTitle + ' \u00B7 ' + (ci + 1) + '/' + cards.length, runs, target + '. ' + (cueNote ? cueNote + '. ' : '') + factsLabel + ': ' + facts.join('; '));
                    });
                } else if (type === 'anchor-chart' && item.data && Array.isArray(item.data.sections)) {
                    // Anchor chart: one slide per section; icons are skipped.
                    const sections = item.data.sections.slice(0, 12);
                    if (!sections.length) { skipped.push(itemTitle); return; }
                    sections.forEach((section, si) => {
                        const s = section && typeof section === 'object' ? section : {};
                        const label = clip(s.label, 200) || ('Section ' + (si + 1));
                        const bullets = listOf(s.bullets, 8);
                        const runs = [{ text: label, options: { fontSize: 20, bold: true, color: darkText, breakLine: true, bullet: false } }];
                        bullets.forEach((b) => runs.push({ text: b, options: { fontSize: 15, color: darkText, breakLine: true, bullet: { code: '2022', color: themeColor } } }));
                        addRichSlide(itemTitle + ' \u00B7 ' + (si + 1) + '/' + sections.length, runs, label + ': ' + bullets.join('; '));
                    });
                } else if (type === 'note-taking' && item.data && typeof item.data === 'object' && (Array.isArray(item.data.cues) || Array.isArray(item.data.notes))) {
                    // Cornell-style notes: cue | notes table, then the summary.
                    const cues = Array.isArray(item.data.cues) ? item.data.cues : [];
                    const notes = Array.isArray(item.data.notes) ? item.data.notes : [];
                    const rowCount = Math.max(cues.length, notes.length);
                    const rows = [];
                    for (let r = 0; r < rowCount; r += 1) rows.push([clip(cues[r] && (cues[r].text || cues[r]), 300), clip(notes[r] && (notes[r].text || notes[r]), 600)]);
                    const filled = rows.filter((row) => row[0] || row[1]);
                    const summary = clip(item.data.summary, 1200);
                    if (!filled.length && !summary) { skipped.push(itemTitle); return; }
                    const header = [
                        { text: _nsT('export.ppt_cue_col', 'Cue'), options: { bold: true, fill: "F1F5F9", color: darkText } },
                        { text: _nsT('export.ppt_notes_col', 'Notes'), options: { bold: true, fill: "F1F5F9", color: darkText } },
                    ];
                    for (let start = 0; start < Math.max(1, filled.length); start += 6) {
                        const page = filled.slice(start, start + 6);
                        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        addSlideTitle(slide, itemTitle + (start ? ' (Cont.)' : ''));
                        addA11yNotes(slide, itemTitle, page.map((row) => row[0] + ': ' + row[1]).join(' | '));
                        if (page.length) slide.addTable([header].concat(page), { x: 0.5, y: 1.0, w: 9, colW: [3, 6], border: { pt: 0.75, color: "CBD5E1" }, fill: { color: "FFFFFF" }, fontSize: 11, color: darkText, autoPage: false, margin: 0.04, valign: 'top' });
                    }
                    if (summary) addTextSlides(itemTitle + ' \u00B7 ' + _nsT('export.ppt_summary', 'Summary'), summary);
                } else if (type === 'applied-challenge' && item.data && typeof item.data === 'object') {
                    // Applied Challenge: the brief and the facts to keep accurate. Never
                    // the source excerpt, lesson snippet, student workspace, or feedback.
                    const brief = item.data.brief && typeof item.data.brief === 'object' ? item.data.brief : {};
                    const context = clip(brief.context, 900);
                    const question = clip(brief.drivingQuestion || brief.question, 500);
                    const role = clip(brief.role, 200);
                    const audience = clip(brief.audience, 200);
                    const facts = listOf(brief.lockedLessonFacts, 10);
                    const factsReviewed = brief.factVerified === true && brief.factLocked !== false;
                    const factHeading = factsReviewed
                        ? _nsT('applied_challenge.brief.facts_verified', 'Teacher-verified lesson facts')
                        : _nsT('applied_challenge.brief.facts_pending', 'Lesson facts awaiting teacher review');
                    const openQuestions = listOf(brief.openQuestions, 6);
                    if (!context && !question && !facts.length) { skipped.push(itemTitle); return; }
                    const runs = [];
                    if (question) runs.push({ text: question, options: { fontSize: 18, bold: true, color: darkText, breakLine: true, bullet: false } });
                    if (context) { runs.push(heading(_nsT('export.ppt_context', 'Context'))); runs.push(body(context)); }
                    if (role || audience) runs.push(body((role ? _nsT('export.ppt_role', 'Role') + ': ' + role : '') + (role && audience ? '   ' : '') + (audience ? _nsT('export.ppt_audience', 'Audience') + ': ' + audience : ''), 12));
                    addRichSlide(itemTitle, runs, question + ' ' + context);
                    if (facts.length || openQuestions.length) {
                        const factRuns = [];
                        if (facts.length) { factRuns.push(heading(factHeading)); facts.forEach((f) => factRuns.push(bullet(f))); }
                        if (openQuestions.length) { factRuns.push(heading(_nsT('export.ppt_open_questions', 'Open questions'))); openQuestions.forEach((q) => factRuns.push(bullet(q))); }
                        addRichSlide(itemTitle + ' (Cont.)', factRuns, (facts.length ? [factHeading].concat(facts) : []).concat(openQuestions).join('; '));
                    }
                } else if (SKIPPED_TYPES.has(type)) {
                    // Live or media-bound resources have no slide form; name them.
                    skipped.push(itemTitle);
                } else {
                    // Any other resource: the shared deny-listed summarizer (no source
                    // excerpts, learner evidence, or media), never raw JSON. Without it,
                    // the item is named in the toast rather than dropped silently.
                    const lines = typeof item.data === 'string'
                        ? [item.data]
                        : (_summarizeResource ? _summarizeResource(item, { maxChars: 4000 }) : []);
                    const text = lines.join('\n').trim();
                    if (!text) { skipped.push(itemTitle); return; }
                    addTextSlides(itemTitle, text);
                }
            });
            const safeTopic = sourceTopic ? sourceTopic.replace(/[^a-z0-9]/gi, '_').substring(0, 20) : 'Lesson';
            await pptx.writeFile({ fileName: `${t('export.filenames.slides_prefix')}-${safeTopic}.pptx` });
            addToast(t('export_status.ppt_success'), "success");
            if (skipped.length) {
                const titles = skipped.slice(0, 6).join(', ') + (skipped.length > 6 ? ', \u2026' : '');
                let message = t('export_status.ppt_skipped', { count: skipped.length, titles });
                if (typeof message !== 'string' || !message || message === 'export_status.ppt_skipped') message = '{count} resource(s) have no slide format and were left out of the deck: {titles}. Use the HTML export for them.';
                addToast(message.replace('{count}', String(skipped.length)).replace('{titles}', titles), "info");
            }
            return true;
        } catch (e) {
            warnLog("PPTX Export Error", e);
            addToast(t('export_status.ppt_error'), "error");
            return false;
        }
    };

    // ─── handleExportStorybook ────────────────────────────────────────
    let storybookPreparing = false;
    const handleExportStorybook = async (rawOptions = false) => {
        if (storybookPreparing) return false;
        const options = _normalizeStorybookExportOptions(rawOptions);
        const checkCancelled = () => {
            if (options.signal?.aborted) throw Object.assign(new Error('Storybook export cancelled.'), { name: 'AbortError' });
        };
        const { includeImages, includeNarration } = options;
        const current = liveRef.current || {};
        const {
            adventureState, sourceTopic, generatedContent,
            setShowStorybookExportModal, setIsProcessing,
            rehydrateHistoryWithImages, parseMarkdownToHTML,
            prepareReadAloudArtifactAudio, prepareStorybookSummary,
            selectedVoice, voiceSpeed, leveledTextLanguage, currentUiLanguage,
            addToast, t,
        } = current;
        const __alloT = (key, fallback) => {
            try {
                const translated = typeof t === 'function' ? t(key) : undefined;
                return typeof translated === 'string' && translated.trim() && translated.trim() !== key
                    ? translated : fallback;
            } catch (_) {
                return fallback;
            }
        };
        if (!adventureState || (!Array.isArray(adventureState.history) && !adventureState.currentScene)) return false;
        if ((!adventureState.history || adventureState.history.length === 0) && !adventureState.currentScene) return false;
        storybookPreparing = true;
        try {
            checkCancelled();
            if (!options.keepModalOpen && typeof setShowStorybookExportModal === 'function') setShowStorybookExportModal(false);
            if (typeof setIsProcessing === 'function') setIsProcessing(true);
            if (typeof addToast === 'function') addToast(t('adventure.storybook_toast_writing'), "info");
            _storybookProgress(options, { phase: 'story', message: 'Preparing your Storybook…' });
            const fullStory = (Array.isArray(adventureState.history) ? adventureState.history : [])
                .filter(entry => entry && typeof entry === 'object').map(entry => ({ ...entry }));
            if (adventureState.currentScene) {
                fullStory.push({ type: 'scene', text: adventureState.currentScene.text, image: adventureState.sceneImage,
                    imageId: adventureState.currentScene.imageId });
            }
            await _recoverStorybookPictures(fullStory, adventureState.imageCache, rehydrateHistoryWithImages, options, checkCancelled);
            checkCancelled();
            const historyText = fullStory.map((entry) => (
                entry.type === 'scene' ? `Scene: ${entry.text}` :
                entry.type === 'choice' ? `Student Action: ${entry.text}` :
                `Outcome/Feedback: ${entry.text}`
            )).join('\n\n');
            const title = String(sourceTopic || t('adventure.title'));
            const contract = window.AlloModules && window.AlloModules.ReadAloudArtifactContract;
            const identitySeed = generatedContent?.id ? String(generatedContent.id) : String(sourceTopic || title || 'adventure');
            const storyId = typeof contract?.stableIdFromParts === 'function'
                ? contract.stableIdFromParts('adventure-story', [identitySeed]) : identitySeed;
            const summaryLanguage = String(leveledTextLanguage || currentUiLanguage || _exportLanguage() || 'English');
            const prompt = `
              You are a storyteller writing an epilogue for a student's educational adventure.
              Topic: ${sourceTopic || "General"}
              Student's Journey Log:
              ${historyText.substring(0, 15000)}
              Task: Write a consolidated, engaging narrative summary of their journey (2-3 paragraphs).
              Highlight their key decisions and the final outcome.
              Write in the second person ("You started by... then you decided to...").
              Write in ${summaryLanguage}.
              Return ONLY the narrative text.
            `;
            let summary = '', summaryWarning = '';
            try {
                if (includeNarration && typeof prepareStorybookSummary === 'function') {
                    const preparedText = await prepareStorybookSummary({
                        ownerApproved: true, resourceId: storyId,
                        resourceType: 'adventure-storybook-read-aloud', adapterId: 'adventure-storybook-artifact', scopeId: 'story',
                        // Include the full journey, even beyond the provider prompt limit.
                        input: JSON.stringify([1, String(sourceTopic || 'General'), fullStory.map(entry => [entry.type, entry.text]), summaryLanguage]),
                        prompt, signal: options.signal,
                    });
                    summary = preparedText.text;
                    if (preparedText.recovery?.state === 'session-only') summaryWarning = 'The epilogue is available for this session but could not be saved on this device. Keep this page open to retry, or keep the download.';
                } else {
                    summary = String(await window.callGemini(prompt) || '').trim();
                }
                if (!summary) throw new Error('No Storybook epilogue was returned.');
            } catch (error) {
                if (error?.name === 'AbortError' || error?.code === 'preparation-in-progress') throw error;
                checkCancelled();
                summaryWarning = 'The epilogue could not be prepared. Your complete journey is included; retry online to add the epilogue.';
                if (typeof warnLog === 'function') warnLog('Storybook epilogue unavailable', error);
            }
            checkCancelled();
            if (summaryWarning && typeof addToast === 'function') addToast(summaryWarning, 'warning');
            const date = new Date().toLocaleDateString();
            const strPageTitle = t('export.storybook.page_title', { title });
            const strSubtitle = t('export.storybook.subtitle');
            const strMeta = t('export.storybook.meta_info', { date, level: adventureState.level });
            const strEpilogue = t('export.storybook.epilogue_badge');
            const strLogHeader = t('export.storybook.log_header');
            const strPrint = t('export.storybook.print_button');
            const strFooter = t('output.generated_via');
            const strUser = t('export.storybook.user_label');
            const strSeparator = t('export.storybook.chapter_separator');
            const normalizedScenes = _normalizeStorybookScenes(fullStory, summary, {
                epilogueTitle: String(strEpilogue || 'Epilogue'),
                sceneTitle: 'Scene',
                studentSpeaker: String(strUser || 'Student'),
            });
            const exportLang = _exportLanguage();
            const exportDir = _exportDirection();
            const ts = Date.now();
            const createdAt = new Date(ts).toISOString();
            const fileTitle = title.replace(/[^A-Za-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'adventure-storybook';
            const htmlFilename = `${fileTitle}-storybook-${ts}.html`;
            const jsonFilename = `${fileTitle}-storybook-read-aloud-${ts}.json`;
            let readAloudArtifact = null;
            let serializedReadAloudArtifact = '';
            let readAloudStats = { audioClips: 0, totalAudioBytes: 0 };
            let narrationWarning = '';
            if (includeNarration) {
                if (!contract || typeof contract.buildAdventureStorybookArtifact !== 'function' ||
                    typeof contract.serializeReadAloudArtifact !== 'function') {
                    narrationWarning = 'Narration export is not available in this build yet. The complete text Storybook will still be downloaded.';
                    if (typeof warnLog === 'function') warnLog('Storybook narration contract unavailable');
                } else {
                    const resourceId = generatedContent && generatedContent.id
                        ? contract.stableIdFromParts('adventure-resource', [String(generatedContent.id)])
                        : null;
                    const makeArtifactInput = (acceptedAudio) => ({
                        storyId,
                        resourceId,
                        title,
                        language: exportLang,
                        scenes: _storybookContractScenes(normalizedScenes, acceptedAudio),
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
                                phase: 'narration', completed: 0, total: totalSegments,
                                message: 'Preparing narrated audio…',
                            });
                            let prepared;
                            try {
                                const narrationVoice = String(selectedVoice || 'Kore');
                                const narrationLanguage = String(leveledTextLanguage || currentUiLanguage || exportLang || 'English');
                                const numericSpeed = Number(voiceSpeed);
                                const narrationSpeed = Number.isFinite(numericSpeed) && numericSpeed > 0 ? numericSpeed : 1;
                                prepared = await prepareReadAloudArtifactAudio({
                                    ownerApproved: true,
                                    recoverPreparedAudio: true,
                                    resourceId: storyId,
                                    resourceType: 'adventure-storybook-read-aloud',
                                    adapterId: 'adventure-storybook-artifact',
                                    scopeId: 'story',
                                    source: 'adventure-owner-export',
                                    defaultVoice: narrationVoice,
                                    language: narrationLanguage,
                                    speed: narrationSpeed,
                                    segments: normalizedScenes.flatMap((scene) => scene.segments.map((segment) => ({
                                        segmentId: segment.segmentId,
                                        text: segment.text,
                                        voice: narrationVoice,
                                        language: narrationLanguage,
                                        speed: narrationSpeed,
                                    }))),
                                    signal: options.signal,
                                    onProgress: (progress) => {
                                        const update = progress && typeof progress === 'object' ? progress : {};
                                        const completed = Number.isFinite(Number(update.completed)) ? Number(update.completed) : 0;
                                        const total = Number.isFinite(Number(update.total)) ? Number(update.total) : totalSegments;
                                        _storybookProgress(options, {
                                            phase: 'narration', completed, total,
                                            message: update.message || (total ? `Preparing narration ${Math.min(completed, total)} of ${total}…` : 'Preparing narrated audio…'),
                                        });
                                    },
                                });
                            } catch (audioError) {
                                if (audioError?.name === 'AbortError' || audioError?.code === 'preparation-in-progress') throw audioError;
                                if (typeof warnLog === 'function') warnLog('Storybook narration preparation failed', audioError);
                                narrationWarning = 'Narrated audio could not be prepared. The complete text Storybook will still be downloaded.';
                            }
                            const preparedAudio = _storybookAudioResultMap(prepared);
                            const acceptedAudio = {};
                            let rejectedClips = 0;
                            normalizedScenes.forEach((scene) => scene.segments.forEach((segment) => {
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
                            } else if (Object.keys(acceptedAudio).length < totalSegments && !narrationWarning) {
                                narrationWarning = `${totalSegments - Object.keys(acceptedAudio).length} narration clips are missing. Retry the export to prepare the missing clips; completed narration is retained.`;
                            }
                            if (prepared?.recovery?.state === 'session-only') {
                                narrationWarning += ' Prepared narration could not be saved for recovery on this device. Keep this page open to retry, or keep the downloaded Storybook.';
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
                        if (contractError?.name === 'AbortError' || contractError?.code === 'preparation-in-progress') throw contractError;
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
                readAloudArtifact.scenes.forEach((scene) => scene.segments.forEach((segment) => {
                    if (segment.audio) artifactAudioBySegmentId[segment.segmentId] = segment.audio;
                }));
            }
            const safeTitle = _escapeExportText(title);
            const safePageTitle = _escapeExportText(strPageTitle);
            const safeEpilogue = _escapeExportText(strEpilogue);
            const safeUser = _escapeExportText(strUser);
            const safeSeparator = _escapeExportText(strSeparator);
            const renderMarkdown = (value) => {
                if (typeof parseMarkdownToHTML === 'function') return parseMarkdownToHTML(value);
                return `<p>${_escapeExportText(value)}</p>`;
            };
            const renderAudio = (segment, sceneTitle) => {
                const audio = artifactAudioBySegmentId[segment.segmentId];
                if (!audio) return '';
                return `<audio class="narration-audio" controls preload="metadata" aria-label="${_escapeExportText(`Narration for ${sceneTitle}`)}"><source src="data:${_escapeExportText(audio.mime)};base64,${audio.base64}" type="${_escapeExportText(audio.mime)}" /></audio>`;
            };
            const epilogueScene = normalizedScenes.find((scene) => scene.sceneId === 'epilogue');
            const journeyScenes = normalizedScenes.filter((scene) => scene.sceneId !== 'epilogue');
            const epilogueHtml = epilogueScene
                ? epilogueScene.segments.map((segment) => `${renderMarkdown(segment.text)}${renderAudio(segment, epilogueScene.title)}`).join('')
                : renderMarkdown(summary);
            let chaptersHtml = '';
            let embeddedPictureCount = 0, externalPictureCount = 0, omittedPictureCount = 0;
            journeyScenes.forEach((scene, sceneIndex) => {
                const safeImage = _storybookImageSource(scene.image);
                if (includeImages && scene.pictureExpected) {
                    if (!safeImage) omittedPictureCount++;
                    else if (safeImage.startsWith('data:')) embeddedPictureCount++;
                    else externalPictureCount++;
                }
                const segmentHtml = scene.segments.map((segment) => {
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
                      ${includeImages && scene.pictureExpected && !safeImage ? '<p class="picture-unavailable">Picture unavailable in this export.</p>' : ''}
                      ${segmentHtml}
                  </div>
                  ${sceneIndex < journeyScenes.length - 1 ? `<div class="chapter-separator">${safeSeparator}</div>` : ''}
                `;
            });
            const embeddedArtifact = serializedReadAloudArtifact
                ? `<script type="application/json" id="alloflow-read-aloud-artifact">${_jsonForHtmlScript(readAloudArtifact)}</script>`
                : '';
            const mediaSummary = includeNarration
                ? `${Number(readAloudStats.audioClips) || 0} of ${normalizedScenes.reduce((count, scene) => count + scene.segments.length, 0)} narration clips included.`
                : '';
            const pictureSummary = includeImages ? `Pictures embedded: ${embeddedPictureCount}. Pictures requiring the original source: ${externalPictureCount}. Pictures omitted: ${omittedPictureCount}.` : '';
            if (includeImages && (externalPictureCount || omittedPictureCount) && typeof addToast === 'function') {
                const recoveryDetail = __alloT('export.storybook.pictures_recovery_detail', '{omitted} omitted; {external} require their original source. Keep this export and retry when the missing pictures are available.')
                    .replace(/\{(omitted|external)\}/g, (_, key) => String(key === 'omitted' ? omittedPictureCount : externalPictureCount));
                addToast(`${__alloT('export.storybook.pictures_not_embedded', 'Some Storybook pictures are not embedded. Their availability on another device is not verified.')} ${recoveryDetail}`, 'warning');
            }
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
                  ${summary ? `<div class="summary-box" data-scene-id="epilogue">
                      <div class="epilogue-badge">${safeEpilogue}</div>
                      ${epilogueHtml}
                  </div>` : '<p class="epilogue-availability">Epilogue unavailable. The complete journey follows.</p>'}
                  <h2 style="text-align: center; text-transform: uppercase; letter-spacing: 2px; color: #64748b; margin-bottom: 40px;">${_escapeExportText(strLogHeader)}</h2>
                  <div class="log-section">${chaptersHtml}</div>
                  <p class="media-availability" role="status">${_escapeExportText([mediaSummary, pictureSummary].filter(Boolean).join(' '))}</p>
                  <div style="text-align: center; margin-top: 50px; color: #64748b; font-size: 0.8em;">${_escapeExportText(strFooter)}</div>
                  ${embeddedArtifact}
              </body>
              </html>
            `;
            checkCancelled();
            const storyItems = normalizedScenes.flatMap((scene) => scene.segments.map((segment) => ({
                id: segment.segmentId,
                title: segment.kind === 'epilogue' ? 'Epilogue' :
                    segment.kind === 'choice' ? 'Student choice' :
                    segment.kind === 'feedback' ? 'Outcome' : scene.title,
                text: segment.text,
                image: includeImages && segment.kind === 'scene' ? _storybookImageSource(scene.image) || null : null,
                toolLabel: 'Adventure Mode',
                privacy: 'full',
            }))).filter((item) => item.text.trim());
            const readAloudReference = includeNarration ? {
                status: readAloudArtifact && readAloudStats.audioClips > 0 ? 'downloaded-with-audio' :
                    (readAloudArtifact ? 'downloaded-text-only' : 'unavailable'),
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
                totalAudioBytes: Number(readAloudStats.totalAudioBytes) || 0,
                pictures: { embedded: embeddedPictureCount, external: externalPictureCount, omitted: omittedPictureCount, decoding: 'unverified' },
            } : null;
            try {
                const artifact = {
                    id: `adventure-storybook-${ts}`,
                    type: 'adventure-storybook',
                    source: 'adventure',
                    sourceLabel: 'Adventure Mode',
                    kindLabel: 'Adventure Storybook',
                    title,
                    summary: `Student-controlled Adventure Mode storybook with ${storyItems.filter(item => item.id !== 'epilogue:summary').length} journey entries`,
                    privacy: 'student-controlled',
                    privacySummary: includeNarration
                        ? 'Student-controlled. Storybook text and a lightweight download reference are saved on this device. Narration is included in downloaded files, and a separate epilogue and narration recovery copy may be saved on this device for export retries.'
                        : 'Student-controlled. Storybook text is saved on this device for the AlloHaven Portfolio.',
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
                        items: storyItems,
                    },
                };
                const artifactStore = window.AlloModules && window.AlloModules.StudentArtifactStore;
                if (artifactStore && typeof artifactStore.save === 'function') {
                    artifactStore.save(artifact, { source: 'adventure', limit: 80 });
                } else {
                    let existing = [];
                    if (Array.isArray(window.__alloflowStudentArtifacts)) {
                        existing = window.__alloflowStudentArtifacts;
                    } else {
                        try { existing = JSON.parse(localStorage.getItem('alloflow_student_artifacts') || '[]'); } catch (_) { existing = []; }
                    }
                    const next = [artifact].concat(Array.isArray(existing) ? existing : []).slice(0, 80);
                    window.__alloflowStudentArtifacts = next;
                    localStorage.setItem('alloflow_student_artifacts', JSON.stringify(next));
                    window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-changed', {
                        detail: { source: 'adventure', sourceLabel: 'Adventure Mode', kindLabel: 'Adventure Storybook', privacy: 'student-controlled', title: artifact.title, action: 'saved', artifact, count: next.length },
                    }));
                }
                if (typeof addToast === 'function') {
                    addToast('Saved new student-controlled Adventure Mode storybook to AlloHaven Portfolio. Open AlloHaven > Portfolio to view it.', "success");
                }
            } catch (saveError) {
                if (typeof warnLog === 'function') warnLog('Storybook manifest could not be saved', saveError);
            }
            _storybookProgress(options, { phase: 'download', message: 'Finishing your Storybook download…' });
            checkCancelled();
            if (includeNarration) {
                _downloadStorybookFile(storyHtml, 'text/html;charset=utf-8', htmlFilename);
                if (serializedReadAloudArtifact) {
                    _downloadStorybookFile(serializedReadAloudArtifact, 'application/json;charset=utf-8', jsonFilename);
                }
                if (typeof addToast === 'function') {
                    addToast(readAloudStats.audioClips > 0
                        ? 'Downloaded the Storybook as HTML and JSON files with embedded narration. Check the included media counts before sharing.'
                        : 'Downloaded the Storybook as text-first HTML and JSON files.', 'success');
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
            _storybookProgress(options, { phase: 'complete', completed: 1, total: 1, message: 'Storybook ready.' });
            return true;
        } catch (error) {
            if (error && error.name === 'AbortError') {
                _storybookProgress(options, { phase: 'cancelled', message: 'Storybook export cancelled.' });
                return false;
            }
            if (typeof warnLog === 'function') warnLog("Storybook Export Error", error);
            if (typeof addToast === 'function') addToast(t('adventure.storybook_toast_error'), "error");
            _storybookProgress(options, { phase: 'error', message: 'Storybook export could not be completed.' });
            return false;
        } finally {
            storybookPreparing = false;
            if (typeof setIsProcessing === 'function') setIsProcessing(false);
        }
    };

    // Strip balanced emphasis markup, while retaining literal operators
    // such as ** and 2 ** 3. Those are meaningful glossary text, not empty fields.
    const _glossaryPlainText = value => {
        const source = typeof value === 'string' ? value : typeof value === 'number' || typeof value === 'boolean' ? String(value) : '';
        const plain = text => text.replace(/(^|[^\p{L}\p{N}\\*])(\*{1,2})([^\s*](?:[^*]*[^\s*])?)\2(?!\*)/gu, '$1$3');
        let result = '', plainStart = 0, position = 0;
        // Only complete, equally sized delimiter runs form a code span. Bare
        // ticks (including an empty JavaScript template literal) remain text.
        while (position < source.length) {
            if (source[position] !== '`') { position++; continue; }
            const opening = position;
            while (source[position] === '`') position++;
            const runLength = position - opening;
            let search = position, closing = -1, afterClosing = -1;
            while (search < source.length) {
                const next = source.indexOf('`', search);
                if (next < 0) break;
                let end = next;
                while (source[end] === '`') end++;
                if (end - next === runLength) { closing = next; afterClosing = end; break; }
                search = end;
            }
            if (closing < 0 || closing === position) continue;
            result += plain(source.slice(plainStart, opening)) + source.slice(position, closing);
            position = afterClosing;
            plainStart = position;
        }
        return result + plain(source.slice(plainStart));
    };
    const _glossaryLanguageNames = {
        english: 'en', spanish: 'es', 'spanish (latin america)': 'es-419', 'spanish (castilian)': 'es-ES',
        french: 'fr', 'french (canadian)': 'fr-CA', german: 'de', italian: 'it', portuguese: 'pt',
        'portuguese (brazil)': 'pt-BR', 'portuguese (portugal)': 'pt-PT', 'portuguese (angola)': 'pt-AO',
        arabic: 'ar', hebrew: 'he', persian: 'fa', farsi: 'fa', urdu: 'ur', pashto: 'ps', sindhi: 'sd',
        uyghur: 'ug', yiddish: 'yi', dhivehi: 'dv', sorani: 'ckb', 'kurdish (sorani)': 'ckb',
        chinese: 'zh', mandarin: 'zh', 'chinese (simplified)': 'zh-Hans', 'chinese (traditional)': 'zh-Hant',
        hindi: 'hi', japanese: 'ja', korean: 'ko', russian: 'ru', ukrainian: 'uk', vietnamese: 'vi',
        somali: 'so', 'haitian creole': 'ht', bengali: 'bn', punjabi: 'pa', tamil: 'ta', telugu: 'te',
        turkish: 'tr', polish: 'pl', dutch: 'nl', swedish: 'sv', norwegian: 'no', danish: 'da',
        finnish: 'fi', greek: 'el', romanian: 'ro', hungarian: 'hu', czech: 'cs', slovak: 'sk',
        swahili: 'sw', indonesian: 'id', malay: 'ms', thai: 'th', tagalog: 'tl', filipino: 'fil',
        afrikaans: 'af', amharic: 'am', albanian: 'sq', armenian: 'hy', azerbaijani: 'az',
        basque: 'eu', belarusian: 'be', bosnian: 'bs', bulgarian: 'bg', catalan: 'ca',
        croatian: 'hr', estonian: 'et', georgian: 'ka', gujarati: 'gu', icelandic: 'is',
        irish: 'ga', kannada: 'kn', kazakh: 'kk', khmer: 'km', lao: 'lo', latvian: 'lv',
        lithuanian: 'lt', macedonian: 'mk', malayalam: 'ml', maltese: 'mt', marathi: 'mr',
        mongolian: 'mn', nepali: 'ne', serbian: 'sr', sinhala: 'si', slovenian: 'sl',
        uzbek: 'uz', welsh: 'cy', zulu: 'zu',
        acholi: 'ach', burmese: 'my', 'chin (falam)': 'cfm', 'chin (hakha)': 'cnh',
        dari: 'prs', esperanto: 'eo', hausa: 'ha', hmong: 'hmn', igbo: 'ig',
        karen: 'kar', kinyarwanda: 'rw', kirundi: 'rn', latin: 'la', lingala: 'ln',
        'maay maay': 'ymm', marshallese: 'mh', tigrinya: 'ti', yoruba: 'yo'
    };
    const _glossaryLanguageInfo = value => {
        const original = typeof value === 'string' ? value.trim() : '';
        const canonical = input => {
            const tag = input.replace(/_/g, '-');
            if (!/^[a-z]{2,3}(?:-[a-z0-9]{1,8})*$/i.test(tag)) return '';
            try { return typeof Intl.getCanonicalLocales === 'function' ? Intl.getCanonicalLocales(tag)[0] || '' : tag; }
            catch (_) { return ''; }
        };
        // An explicit tag wins over a host helper that resolves only its base.
        let tag = canonical(original);
        if (!tag && Object.prototype.hasOwnProperty.call(_glossaryLanguageNames, original.toLowerCase())) tag = canonical(_glossaryLanguageNames[original.toLowerCase()]);
        if (!tag) {
            try {
                const resolve = window.AlloModules?.ModuleScopeExtras?.getSpeechLangCode || window.getSpeechLangCode;
                const resolved = typeof resolve === 'function' ? canonical(String(resolve(original) || '')) : '';
                // The host returns English for unknown names; that is not evidence.
                if (resolved && !/^en(?:-|$)/i.test(resolved)) tag = resolved;
            } catch (_) {}
        }
        if (!tag) return { tag: '', dir: 'auto', language: '', script: '', region: '' };
        const parts = tag.split('-'), subtags = parts.slice(1);
        const extension = subtags.findIndex(part => part.length === 1);
        const core = extension < 0 ? subtags : subtags.slice(0, extension);
        const script = core.find(part => /^[a-z]{4}$/i.test(part)) || '';
        const region = core.find(part => /^[a-z]{2}$|^\d{3}$/i.test(part)) || '';
        const rtl = script ? /^(Arab|Hebr|Thaa|Nkoo|Adlm|Rohg|Syrc|Samr|Mand)$/i.test(script) : /^(ar|arc|he|iw|fa|prs|ur|ps|ku|ckb|sd|ug|yi|dv|syr|nqo)$/i.test(parts[0]);
        const dir = !script && /^(und|mul|zxx)$/i.test(parts[0]) ? 'auto' : rtl ? 'rtl' : 'ltr';
        return { tag, dir, language: parts[0], script, region };
    };
    // UI labels are display-only; saved translation keys and audio identifiers
    // retain their original script, region and spelling.
    let _glossaryDisplayNames = null, _glossaryDisplayLocale = '', _glossaryDisplayConstructor = null;
    const _glossaryLanguageLabel = value => {
        const original = typeof value === 'string' ? value.trim() : '';
        const info = _glossaryLanguageInfo(original);
        if (!info.tag || typeof Intl === 'undefined' || typeof Intl.DisplayNames !== 'function') return original;
        try {
            const locale = _exportLanguage();
            if (!_glossaryDisplayNames || locale !== _glossaryDisplayLocale || _glossaryDisplayConstructor !== Intl.DisplayNames) {
                _glossaryDisplayNames = new Intl.DisplayNames([locale], { type: 'language', languageDisplay: 'standard', fallback: 'none' });
                _glossaryDisplayLocale = locale; _glossaryDisplayConstructor = Intl.DisplayNames;
            }
            // Unsupported interface locales must not silently gain labels in
            // a different language from the rest of the exported document.
            if (_glossaryDisplayNames.resolvedOptions().locale.split('-')[0].toLowerCase() !== locale.split('-')[0].toLowerCase()) return original;
            return _glossaryDisplayNames.of(info.tag) || original;
        } catch (_) { return original; }
    };
    const _glossarySourceLanguage = (resource, item, field) => {
        const explicit = [item && item[field], item && item.baseLanguage, item && item.termLanguage]
            .find(value => typeof value === 'string' && value.trim());
        if (explicit) return explicit.trim();
        const resolve = typeof window !== 'undefined' && window.AlloModules?.TextPipelineHelpers?.getGlossaryBaseLanguage;
        if (typeof resolve === 'function') return resolve(resource);
        const translated = resource?.translationOf || resource?.translationSourceId || resource?.sourceTranslationOf
            || resource?.config?.translationOf || resource?.config?.translationSourceId || resource?.config?.sourceTranslationOf || resource?.meta?.translatedTo;
        return [resource && resource.baseLanguage, resource && resource.glossaryBaseLanguage,
            resource?.config?.baseLanguage, resource?.config?.glossaryBaseLanguage]
            .find(value => typeof value === 'string' && value.trim())?.trim()
            || (!resource?.config?.language && !translated && typeof resource?.language === 'string' ? resource.language.trim() : '') || 'English';
    };
    const _glossaryAudioLanguageMatches = (stored, requested) => {
        // Older exact-text clips did not record language; retain that legacy
        // lane. A known saved language must match the current card instead.
        if (!stored || !requested) return true;
        const left = _glossaryLanguageInfo(stored), right = _glossaryLanguageInfo(requested);
        if (!left.tag || !right.tag) return stored.trim().toLocaleLowerCase() === requested.trim().toLocaleLowerCase();
        // Named aliases normalize together, but a missing script or region is
        // not a wildcard for an explicitly different pronunciation setting.
        return left.tag.toLowerCase() === right.tag.toLowerCase();
    };
    // One translation adapter feeds cards, word lists, and audio identity.
    const _flashcardTranslation = (item, language) => {
        const translations = item && item.translations;
        const value = translations && typeof translations === 'object' && !Array.isArray(translations) ? translations[language] : '';
        const shared = window.AlloModules?.normalizeGlossaryTranslation;
        if (typeof shared === 'function') {
            const normalized = shared(value);
            return { ...normalized, usable: !![normalized.term, normalized.definition].some(text => _glossaryPlainText(text).trim()) };
        }
        const text = value => typeof value === 'string' ? value.trim() : '';
        let term = '', definition = '', spoken = '';
        if (value && typeof value === 'object' && !Array.isArray(value)) {
            spoken = text(value.text) || text(value.translation);
            if (!spoken) {
                term = text(value.term) || text(value.word);
                definition = text(value.def) || text(value.definition) || text(value.meaning);
                spoken = [term, definition].filter(Boolean).join(': ');
            }
        } else spoken = text(value);
        if (!term && !definition && spoken) {
            const split = spoken.search(/[:：]/);
            if (split >= 0) { term = spoken.slice(0, split).trim(); definition = spoken.slice(split + 1).trim(); }
            else definition = spoken;
        }
        const usable = !![term, definition].some(value => _glossaryPlainText(value).trim());
        return { term, definition, spoken, usable };
    };

    // ─── handleExportFlashcards ───────────────────────────────────────
    const handleExportFlashcards = (mode = 'standard', exportOptions = {}) => {
        const { generatedContent, t, addToast } = liveRef.current;
        if (!generatedContent || generatedContent.type !== 'glossary') return;
        const audioOptions = exportOptions && typeof exportOptions === 'object' ? exportOptions : {};
        const cleanText = text => _escapeExportText(_glossaryPlainText(text));
        const cards = Array.isArray(generatedContent.data) ? generatedContent.data.filter(item => item && item.term) : [];
        if (!cards.length) { if (addToast) addToast(t('flashcards.export_empty') || 'Add glossary terms before exporting flashcards.', 'info'); return; }
        // lang/dir for a card side written in a named language ("Arabic"), from
        // the host's language utilities. A name they do not know comes back as
        // English, so it gets dir="auto" and no lang rather than a wrong one.
        const sourceLanguage = (item, field) => _glossarySourceLanguage(generatedContent, item, field);
        const languageLabel = _glossaryLanguageLabel;
        const sideLangAttrs = (languageName) => {
            if (!languageName) return ' lang="en" dir="ltr"';
            const info = _glossaryLanguageInfo(languageName);
            return (info.tag ? ' lang="' + _escapeExportText(info.tag) + '"' : '') + ' dir="' + info.dir + '"';
        };
// No usable description (none, or one written for an earlier picture): name the
// picture by its term rather than hide it. Only a decorative picture is silent.
function flashcardExportImageAlt(item) {
  if (!item || item.imageDecorative === true) return '';
  const termAlt = typeof item.term === 'string' ? item.term.trim() : '';
  if (typeof item.imageAlt !== 'string' || !item.imageAlt.trim()) return termAlt;
  if (item.imageAltHash) {
    const image = typeof item.image === 'string' ? item.image : '';
    let h = 0x811c9dc5;
    const mix = c => { h ^= c; h = Math.imul(h, 0x01000193) >>> 0; };
    String(image.length).split('').forEach(ch => mix(ch.charCodeAt(0)));
    const step = Math.max(1, Math.floor(image.length / 4096));
    for (let i = 0; i < image.length; i += step) mix(image.charCodeAt(i));
    const hash = 'img-' + image.length.toString(36) + '-' + h.toString(16).padStart(8, '0');
    if (hash !== item.imageAltHash) return termAlt;
  }
  return item.imageAlt.trim();
}

        const isLanguageMode = mode === 'language';
        const cardStyle = `
            .card-container {
                position: relative;
                display: flex;
                border: 2px dashed #cbd5e1;
                margin-bottom: 20px;
                page-break-inside: avoid;
                min-height: 220px;
                height: auto;
                background: white;
            }
            .card-side {
                flex: 1 1 0;
                min-width: 0;
                overflow-wrap: anywhere;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                text-align: center;
                position: static;
                overflow: visible;
            }
            .card-picture { margin: 0 0 12px; max-width: 100%; }
            .card-picture img { display: block; max-width: 100%; width: auto; max-height: 160px; margin: auto; object-fit: contain; }
            .card-picture figcaption { margin-top: 4px; font-size: 0.5625rem; color: #475569; overflow-wrap: anywhere; }
            .front { border-inline-end: 2px dashed #cbd5e1; }
            .cut-guide {
                position: absolute;
                top: 4px; left: 50%;
                transform: translateX(-50%);
                font-size: 0.625rem; color: #475569;
                background: white; padding: 0 5px;
                font-weight: bold;
            }
            .lang-label {
                font-size: 0.75rem;
                text-transform: uppercase;
                color: #475569;
                margin-bottom: 2px;
                font-weight: bold;
            }
            .primary-text { font-size: 1.25rem; font-weight: bold; color: #1e293b; margin-bottom: 5px; }
            .secondary-text { font-size: 1rem; color: #4f46e5; font-weight: bold; margin-top: 5px; }
            .def-text { font-size: 0.8125rem; color: #475569; line-height: 1.4; }
            .def-trans { font-size: 0.8125rem; color: #475569; line-height: 1.4; margin-top: 10px; padding-top: 10px; border-top: 1px solid #e2e8f0; width: 100%; }
            .def-text, .def-trans { width: 100%; }
            .def-text[dir], .def-text > span[dir], .def-trans > span[dir] { display: block; text-align: start; white-space: pre-wrap; }
            .def-text > .lang-label, .def-trans > .lang-label { display: block; text-align: start; margin-bottom: 5px; }
            .etym-text { font-size: 0.6875rem; color: #4338ca; font-style: italic; line-height: 1.4; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #c7d2fe; width: 100%; }
            .etym-roots { margin-top: 6px; display: flex; flex-wrap: wrap; justify-content: center; gap: 4px; width: 100%; }
            .root-chip { font-size: 0.625rem; background: #eef2ff; border: 1px solid #c7d2fe; color: #3730a3; padding: 2px 6px; border-radius: 999px; font-style: normal; }
            .root-chip b { font-weight: 700; }
            .root-chip i { font-size: 0.5625rem; color: #6366f1; text-transform: uppercase; font-style: normal; letter-spacing: 0.03em; margin: 0 2px; }
            .set-header {
                background: #f1f5f9; color: #334155;
                padding: 15px; margin: 40px 0 20px 0;
                text-align: center; font-weight: bold; border-radius: 8px;
                border: 1px solid #e2e8f0;
                page-break-after: avoid;
            }
            @media screen {
                .card-container { border-style: solid; border-radius: 12px; box-shadow: 0 2px 8px rgba(15,23,42,.05); }
                .def-text, .def-trans { font-size: 0.9375rem; line-height: 1.55; }
                .lang-label { font-size: 0.75rem; letter-spacing: 0.04em; }
            }
            @media screen and (max-width: 560px) {
                body { padding: 12px; }
                .card-container { flex-direction: column; }
                .card-side { flex: auto; padding: 20px 16px; }
                .front { border-inline-end: 0; border-bottom: 2px dashed #cbd5e1; }
                .cut-guide { display: none; }
                .set-header { margin-top: 24px; }
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
            if (c.translations && typeof c.translations === 'object' && !Array.isArray(c.translations)) {
                Object.keys(c.translations).forEach(k => { if (_flashcardTranslation(c, k).usable) allLanguages.add(k); });
            }
        });
        const languagesList = Array.from(allLanguages);
        if (isLanguageMode && languagesList.length === 0) {
            const message = t('flashcards.no_translations') || 'No translated flashcards are available to export.';
            if (typeof addToast === 'function') addToast(message, 'error');
            else if (window.AlloFlowUX && typeof window.AlloFlowUX.toast === 'function') window.AlloFlowUX.toast(message, 'error');
            return;
        }
        const sets = (languagesList.length ? languagesList : [null]).map(lang => ({ lang,
            cards: isLanguageMode ? cards.filter(item => _flashcardTranslation(item, lang).usable) : cards }));
        const incompleteCards = isLanguageMode ? sets.reduce((count, set) => count + cards.length - set.cards.length, 0) : 0;
        // Prepared recordings ride along as data URIs, each written once, within a size cap.
        const audioIndex = _flashcardAudioIndex(generatedContent);
        const sideClips = (item, lang) => ({
            front: _flashcardClip(audioIndex, item, 'term', null, generatedContent),
            back: isLanguageMode ? _flashcardClip(audioIndex, item, 'translation', lang, generatedContent) : _flashcardClip(audioIndex, item, 'definition', null, generatedContent),
        });
        const availableClips = [];
        sets.forEach(set => set.cards.forEach(item => {
            const clips = sideClips(item, set.lang);
            [clips.front, clips.back].forEach(clip => { if (clip && !availableClips.includes(clip)) availableClips.push(clip); });
        }));
        const reader = _flashcardReader();
        if ((availableClips.length && audioOptions.includeAudio === undefined) || (reader && reader.differs && audioOptions.useReadingSettings === undefined)) {
            _flashcardAudioDialog(mode, availableClips, audioOptions.opener, reader);
            return;
        }
        const readerSettings = reader && audioOptions.useReadingSettings === true ? reader.settings : null;
        const audioIds = new Map();
        const audioData = {};
        let audioBytes = 0, audioSkipped = 0;
        if (audioOptions.includeAudio !== false) availableClips.forEach(clip => {
            if (audioBytes + clip.src.length > _FLASHCARD_AUDIO_CAP) { audioSkipped += 1; return; }
            audioBytes += clip.src.length;
            const id = 'a' + audioIds.size;
            audioIds.set(clip, id);
            audioData[id] = clip.src;
        });
        const audioButton = (clip, label) => clip && audioIds.has(clip)
            ? '<button type="button" class="card-audio no-print" data-card-audio="' + audioIds.get(clip) + '" aria-label="' + _escapeExportText(label) + '" title="' + _escapeExportText(label) + '"><span aria-hidden="true">🔊</span></button>'
            : '';
        // A short credit on each card; the full credit, with its licence and source
        // addresses, on a closing page (CC BY/BY-SA ask for both, and "edited").
        const pictureCredits = [];
        const imageIds = new Map();
        const cardCreditLine = credit => {
            const line = window.AlloModules?.AltText?.openImageCreditLine;
            return typeof line === 'function' ? line(credit)
                : [credit.set, credit.author, credit.license, credit.modified === true ? 'edited' : ''].filter(value => typeof value === 'string' && value.trim()).join(' · ');
        };
        const renderSet = (lang = null, setCards = cards) => {
            const sourceLabels = [...new Set(setCards.map(item => languageLabel(sourceLanguage(item, 'termLanguage'))))].join(' / ');
            const targetLabel = languageLabel(lang);
            const header = lang
                ? (isLanguageMode ? `${sourceLabels} ⟷ ${targetLabel}` : targetLabel)
                : sourceLabels;
            htmlBody += `<h2 class="set-header">${_escapeExportText(header)} ${_escapeExportText(t('flashcards.set_header'))}</h2>`;
            setCards.forEach(item => {
                let transTerm = "";
                let transDef = "";
                if (lang) {
                    const translation = _flashcardTranslation(item, lang);
                    transTerm = translation.term;
                    transDef = translation.definition;
                }
                let frontContent = "";
                let backContent = "";
                const termLanguage = sourceLanguage(item, 'termLanguage');
                const definitionLanguage = sourceLanguage(item, 'definitionLanguage');
                const termLabel = languageLabel(termLanguage), definitionLabel = languageLabel(definitionLanguage);
                const languageKey = value => _glossaryLanguageInfo(value).tag.toLowerCase() || value.trim().toLowerCase();
                const showDefinitionLanguage = !!_glossaryPlainText(item.def || item.definition).trim() && languageKey(definitionLanguage) !== languageKey(termLanguage);
                const termAttrs = sideLangAttrs(termLanguage), definitionAttrs = sideLangAttrs(definitionLanguage);
                const tr = sideLangAttrs(lang);
                if (isLanguageMode) {
                    frontContent = `
                        <div class="lang-label">${_escapeExportText(termLabel)}</div>
                        <div class="primary-text"${termAttrs}>${cleanText(item.term)}</div>
                        ${showDefinitionLanguage ? `<div class="lang-label">${_escapeExportText(definitionLabel)}</div>` : ''}
                        <div class="def-text"${definitionAttrs}>${cleanText(item.def || item.definition)}</div>
                    `;
                    backContent = `
                        <div class="lang-label">${_escapeExportText(targetLabel)}</div>
                        <div class="primary-text"${tr}>${cleanText(transTerm)}</div>
                        <div class="def-text"${tr}>${cleanText(transDef)}</div>
                    `;
                } else {
                    frontContent = `
                        <div class="cut-guide">${_escapeExportText(t('flashcards.fold_guide'))}</div>
                        <div class="lang-label">${_escapeExportText(termLabel)}</div>
                        <div class="primary-text"${termAttrs}>${cleanText(item.term)}</div>
                        ${transTerm ? `<div class="secondary-text"${tr}>${cleanText(transTerm)}</div><div class="lang-label" style="margin-top:2px;">${_escapeExportText(targetLabel)}</div>` : ''}
                    `;
                    backContent = `
                        <div class="def-text"><strong class="lang-label">${_escapeExportText(definitionLabel)}:</strong> <span${definitionAttrs}>${cleanText(item.def || item.definition)}</span></div>
                        ${transDef ? `<div class="def-trans"><strong class="lang-label">${_escapeExportText(targetLabel)}:</strong> <span${tr}>${cleanText(transDef)}</span></div>` : ''}${typeof item.contextSentence === 'string' && item.contextSentence.trim() ? `<div class="def-text" data-context-sentence style="margin-top:8px;"><strong>${_escapeExportText(_gxText('glossary.context_sentence_label', 'In the text:'))}</strong> <q${definitionAttrs}>${cleanText(item.contextSentence.trim())}</q></div>` : ''}
                        ${item.etymology ? `<div class="etym-text">📜 <strong>${_escapeExportText(t('glossary.etymology_label') || 'Roots')}:</strong> ${cleanText(item.etymology)}</div>` : ''}
                        ${Array.isArray(item.roots) && item.roots.length > 0 ? `<div class="etym-roots">${item.roots.map(r => `<span class="root-chip"><b>${cleanText(r.root || '')}</b>${r.lang ? ` <i>(${cleanText(r.lang)})</i>` : ''}${r.meaning ? ` = ${cleanText(r.meaning)}` : ''}</span>`).join(' ')}</div>${(() => { const seen = new Set(); const allRel = []; item.roots.forEach(r => { if (Array.isArray(r.related)) r.related.forEach(w => { const k = String(w || '').trim(); if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); allRel.push(k); } }); }); return allRel.length > 0 ? `<div class="etym-related"><strong>${_escapeExportText(t('export.related_words_label') || 'Related words:')}</strong> ${allRel.slice(0, 6).map(w => cleanText(w)).join(', ')}</div>` : ''; })()}` : ''}
                    `;
                }
                if (audioIds.size) {
                    const clips = sideClips(item, lang);
                    const term = String(item.term);
                    frontContent += audioButton(clips.front, _gxText('flashcards.play_term', 'Play {term}', { term }));
                    backContent = audioButton(clips.back, isLanguageMode
                        ? _gxText('flashcards.play_translation', 'Play {term} in {lang}', { term, lang: targetLabel })
                        : _gxText('flashcards.play_definition', 'Play the definition of {term}', { term })) + backContent;
                }
                const image = typeof item.image === 'string' && /^(?:https?:\/\/|data:image\/(?:png|jpe?g|gif|webp|avif|svg\+xml)(?:;|,))/i.test(item.image) ? item.image : '';
                if (image) {
                    const alt = flashcardExportImageAlt(item);
                    const credit = item.imageAttribution;
                    const creditText = credit && typeof credit === 'object' ? cardCreditLine(credit) : '';
                    if (creditText) pictureCredits.push(credit);
                    // Each picture's data is written once. The deck repeats per
                    // language, and 3 terms x 3 languages used to carry 9 copies
                    // (1.8 MB); later copies take the first one's src on load.
                    let imgSource;
                    if (imageIds.has(image)) imgSource = ' data-ci-src="' + imageIds.get(image) + '"';
                    else { const id = 'ci' + imageIds.size; imageIds.set(image, id); imgSource = ' src="' + _escapeExportText(image) + '" data-ci="' + id + '"'; }
                    frontContent = '<figure class="card-picture"><img' + imgSource + ' alt="' + _escapeExportText(alt) + '"' + (alt ? '' : ' role="presentation"') + '>' + (creditText ? '<figcaption>' + _escapeExportText(creditText) + '</figcaption>' : '') + '</figure>' + frontContent;
                }
                htmlBody += `
                    <div class="card-container">
                        <div class="card-side front">${frontContent}</div>
                        <div class="card-side back">${backContent}</div>
                    </div>
                `;
            });
        };
        sets.forEach((set, index) => {
            if (index > 0) htmlBody += `<div style="page-break-before: always;"></div>`;
            renderSet(set.lang, set.cards);
        });
        const listedCredits = new Set();
        const creditEntries = pictureCredits.map(credit => {
            const where = [];
            if (/^https:\/\//i.test(credit.licenseUrl || '')) where.push((t('flashcards.credit_license') || 'License') + ': ' + credit.licenseUrl);
            if (/^https?:\/\//i.test(credit.url || '')) where.push((t('flashcards.credit_source') || 'Source') + ': ' + credit.url);
            return cardCreditLine(credit) + (where.length ? ' (' + where.join('; ') + ')' : '');
        }).filter(line => line && !listedCredits.has(line) && listedCredits.add(line));
        if (creditEntries.length) {
            htmlBody += '<section class="picture-credits" data-picture-credits style="page-break-before: always;"><h2>' + _escapeExportText(t('flashcards.picture_credits') || 'Picture credits') + '</h2><ul>'
                + creditEntries.map(line => '<li>' + _escapeExportText(line) + '</li>').join('') + '</ul></section>';
        }
        const fullHtml = `
            <!DOCTYPE html>
            <html lang="${_escapeExportText(_exportLanguage())}" dir="${_exportDirection()}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${_escapeExportText(t(titleKey) || 'Flashcards')} - ${_escapeExportText(new Date().toLocaleDateString())}</title>
                <style>
                    body { font-family: system-ui, -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #1e293b; }
                    @page { margin: 12mm; }
                    * { box-sizing: border-box; }
                    @media print {
                        body { padding: 0; margin: 0; max-width: 100%; }
                        .no-print { display: none; }
                        .card-container { break-inside: avoid; }
                        .card-container, .front { border-color: #777 !important; }
                        .card-side * { color: #000 !important; }
                    }
                    ${cardStyle}${audioIds.size ? `
                    .card-audio { min-width: 44px; min-height: 44px; margin: 8px 0; border: 2px solid #4f46e5; border-radius: 999px; background: #fff; color: #3730a3; font-size: 1.25rem; cursor: pointer; }
                    .card-audio:focus-visible { outline: 3px solid #1e1b4b; outline-offset: 2px; }` : ''}
                </style>${readerSettings ? _FLASHCARD_READER_SLOT : ''}
            </head>
            <body>
                ${htmlBody}
                ${htmlBody.includes('data-ci-src=') ? `<script>(function(){var c=document.querySelectorAll('img[data-ci-src]');for(var i=0;i<c.length;i++){var s=document.querySelector('img[data-ci="'+c[i].getAttribute('data-ci-src')+'"]');if(s)c[i].setAttribute('src',s.getAttribute('src'));}})();</script>` : ''}${audioIds.size ? `
                <script type="application/json" id="card-audio-data">${_jsonForHtmlScript(audioData)}</script><script>(function(){var d=JSON.parse(document.getElementById('card-audio-data').textContent||'{}'),p=null;document.addEventListener('click',function(e){var b=e.target&&e.target.closest?e.target.closest('[data-card-audio]'):null,s=b&&d[b.getAttribute('data-card-audio')];if(!s)return;if(p)p.pause();p=new Audio(s);var r=p.play();if(r&&r.catch)r.catch(function(){});});})();</script>` : ''}
            </body>
            </html>
        `;
        const download = (html) => {
            const blob = new Blob([html], { type: 'text/html' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${t('export.filenames.flashcards')}-${mode}-${Date.now()}.html`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            // Revoking in the same tick can cancel the download in some browsers.
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            try { if (typeof window.alloAnnounce === 'function') window.alloAnnounce(t('flashcards.export_done') || 'Flashcards downloaded.'); } catch (_) {}
            if (audioOptions.includeAudio !== false && audioIndex.staleLanguageClips.size && typeof addToast === 'function') addToast(audioIndex.staleLanguageClips.size === 1
                ? _gxText('flashcards.audio_language_stale_one', '1 recording was left out because its saved language no longer matches the card. Refresh the audio to include it.')
                : _gxText('flashcards.audio_language_stale', '{count} recordings were left out because their saved language no longer matches the cards. Refresh the audio to include them.', { count: audioIndex.staleLanguageClips.size }), 'info');
            if (incompleteCards && typeof addToast === 'function') addToast(incompleteCards === 1
                ? _gxText('flashcards.translation_skipped_one', '1 card was skipped because its translation is missing.')
                : _gxText('flashcards.translation_skipped', '{count} cards were skipped because their translations are missing.', { count: incompleteCards }), 'info');
            if (audioSkipped && typeof addToast === 'function') addToast(audioSkipped === 1
                ? _gxText('flashcards.audio_capped_one', '1 recording was left out to keep the file under 20 MB.')
                : _gxText('flashcards.audio_capped', '{count} recordings were left out to keep the file under 20 MB.', { count: audioSkipped }), 'info');
        };
        if (!readerSettings) return download(fullHtml);
        // The font is fetched and embedded first, so the file keeps it offline.
        return _flashcardReaderFont(readerSettings.fontId)
            .then(font => download(fullHtml.replace(_FLASHCARD_READER_SLOT, () => _flashcardReaderHead(readerSettings, font))))
            .catch(error => { if (typeof warnLog === 'function') warnLog('Flash-card export failed', error); });
    };

    // ─── "Use my reading settings" for the flash-card file ───────────
    // The host bridge's font, text size and spacing; differs = not the defaults.
    const _FLASHCARD_READER_SLOT = '<!--allo-reader-settings-->';
    const _flashcardReader = () => {
        const lib = window.AlloModules && window.AlloModules.UIFontLibrary;
        let settings = null;
        try { if (lib && typeof lib.readerExportCss === 'function' && lib.readingSettingsAvailable()) settings = window.__alloReadingSettings.get(); } catch (_) { settings = null; }
        if (!settings || typeof settings !== 'object') return null;
        const differs = (settings.fontId || 'default') !== 'default' || Number(settings.baseFontSize) !== 16
            || Number(settings.lineHeight) !== 1.6 || Number(settings.letterSpacing) !== 0;
        return { settings, differs };
    };
    // Embedded font first (an offline file cannot fetch one), then a <link>, then the system font.
    const _flashcardReaderFont = (fontId) => {
        const none = { head: '', css: '' };
        const lib = window.AlloModules && window.AlloModules.UIFontLibrary;
        if (!lib || typeof lib.exportFontFaceCss !== 'function') return Promise.resolve(none);
        const usable = face => face && typeof face === 'object' && (face.head || face.css) ? face : null;
        let timer = null;
        const giveUp = new Promise(resolve => { timer = setTimeout(() => resolve(null), 10000); });
        return Promise.race([Promise.resolve().then(() => lib.exportFontFaceCss(fontId, { embed: true })), giveUp])
            .then(usable, () => null)
            .then(face => { clearTimeout(timer); return face; })
            .then(face => face || Promise.resolve().then(() => lib.exportFontFaceCss(fontId)).then(usable, () => null))
            .then(face => face || none);
    };
    // Larger text: the fold guide moves into the flow so it never covers a word,
    // and from 24 px the two sides stack (fold across the middle) to keep lines readable.
    const _flashcardReaderHead = (settings, font) => {
        const lib = window.AlloModules.UIFontLibrary;
        const stacked = Number(settings.baseFontSize) >= 24;
        const layout = 'body{overflow-wrap:break-word}.cut-guide{position:static;transform:none;align-self:center;order:-1;margin:0 0 8px}'
            + (stacked ? '.card-container{flex-direction:column}.front{border-inline-end:0;border-bottom:2px dashed #cbd5e1}' : '');
        return (font.head || '') + '<style data-reader-settings>' + (font.css || '') + '\n' + lib.readerExportCss(settings) + '\n' + layout + '</style>';
    };

    // ─── Prepared glossary audio for the flash-card file ─────────────
    // "Prepare audio" saves clips on the resource (karaokeAudio, per-entry v4),
    // keyed by segment id entry/<entryId>/<term|definition|translation/<lang>>.
    const _FLASHCARD_AUDIO_CAP = 20 * 1024 * 1024;
    const _flashcardAudioIndex = (resource) => {
        const raw = resource && resource.karaokeAudio;
        const index = new Map();
        index.staleLanguageClips = new Set();
        if (!raw || raw.version !== 4 || !raw.entries || typeof raw.entries !== 'object') return index;
        const store = window.AlloModules && window.AlloModules.KaraokeAudioStore;
        Object.keys(raw.entries).forEach(key => {
            const entry = raw.entries[key];
            const identity = entry && entry.identity;
            if (!identity || entry.quarantine || typeof entry.audio !== 'string') return;
            if ((identity.adapterId && identity.adapterId !== 'alloflow.glossary.read-aloud') || (identity.scopeId && identity.scopeId !== 'main')) return;
            let b64 = entry.audio.replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
            let mime = String(entry.mime || 'audio/mpeg').toLowerCase();
            if (store && typeof store.validateAudioPayload === 'function') {
                const checked = store.validateAudioPayload(entry.audio, entry.mime);
                if (!checked || !checked.ok) return;
                b64 = checked.clean; mime = checked.mime;
            } else if (!/^audio\/(?:mpeg|wav|webm|ogg|mp4|aac|flac)$/.test(mime) || !/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return;
            const segmentId = String(identity.segmentId || '');
            if (!index.has(segmentId)) index.set(segmentId, []);
            const profile = entry.synthesisProfile || entry.metadata || {};
            index.get(segmentId).push({ text: String(identity.spokenText || ''), language: typeof profile.language === 'string' ? profile.language.trim() : '', src: 'data:' + mime + ';base64,' + b64 });
        });
        return index;
    };
    // Only a clip recorded for the text the card shows now; an edited term's old clip stays out.
    const _flashcardClip = (index, item, field, language, resource) => {
        const entryId = String(item && item.entryId != null ? item.entryId : '').trim().slice(0, 160);
        if (!entryId || !index.size) return null;
        const spoken = value => String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
        const def = item.def != null ? item.def : item.definition;
        let suffix = field, texts = [item.term];
        if (field === 'definition') {
            const format = window.AlloModules && window.AlloModules.formatGlossaryDefinitionSpeech;
            texts = [typeof format === 'function' ? format(item.term, def) : '', def, spoken(item.term) + ': ' + spoken(def)];
        } else if (field === 'translation') {
            texts = [_flashcardTranslation(item, language).spoken];
            let key = 'und';
            try { key = encodeURIComponent(String(language || '').trim().normalize('NFKC').toLocaleLowerCase('en-US')) || 'und'; } catch (_) { key = encodeURIComponent(String(language || '').toLowerCase()) || 'und'; }
            suffix = 'translation/' + key;
        }
        const toSpoken = window.AlloModules && window.AlloModules.PhaseKHelpers && window.AlloModules.PhaseKHelpers.toSpokenText;
        const wanted = new Set();
        texts.map(spoken).filter(Boolean).forEach(text => {
            wanted.add(text);
            try { if (typeof toSpoken === 'function') wanted.add(spoken(toSpoken(text))); } catch (_) {}
        });
        const list = index.get('entry/' + encodeURIComponent(entryId) + '/' + suffix) || [];
        const expectedLanguage = field === 'translation' ? language : _glossarySourceLanguage(resource, item, field === 'definition' ? 'definitionLanguage' : 'termLanguage');
        const matching = list.filter(clip => wanted.has(clip.text));
        const current = matching.find(clip => clip.language && _glossaryAudioLanguageMatches(clip.language, expectedLanguage))
            || matching.find(clip => !clip.language);
        if (current) return current;
        matching.forEach(clip => index.staleLanguageClips.add(clip));
        return null;
    };
    // The options step: prepared audio (when there is some) and the reader's own
    // settings (on by default when they differ from the defaults).
    const _flashcardAudioDialog = (mode, clips, opener, reader) => {
        const bytes = clips.reduce((sum, clip) => sum + clip.src.length, 0);
        let size = (bytes / 1048576).toFixed(1);
        try { size = new Intl.NumberFormat(_exportLanguage(), { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(bytes / 1048576); } catch (_) {}
        _gxDialog(_gxText('flashcards.audio_dialog_title', 'Download flash cards'), opener, (ui) => {
            const option = (text, checked) => {
                const row = ui.el('label', 'agx-option', '', ui.dialog);
                const input = ui.el('input', '', '', row);
                input.type = 'checkbox';
                input.checked = checked;
                ui.el('span', '', text, row);
                return input;
            };
            const box = clips.length ? option(_gxText('flashcards.include_audio', 'Include prepared audio'), true) : null;
            if (box) {
                ui.el('p', 'agx-note', _gxText('flashcards.audio_summary', '{count} prepared recordings, about {size} MB.', { count: clips.length, size }), ui.dialog);
                if (bytes > _FLASHCARD_AUDIO_CAP) ui.el('p', 'agx-note', _gxText('flashcards.audio_cap_note', 'The file is kept under 20 MB, so some recordings will be left out.'), ui.dialog);
            }
            const mine = reader ? option(_gxText('reading_settings.use_mine', 'Use my reading settings'), reader.differs) : null;
            if (mine) {
                const help = ui.el('p', 'agx-note', _gxText('reading_settings.use_mine_help', 'Prints with your font, text size and spacing.'), ui.dialog);
                help.id = ui.uid + '-reader-help';
                mine.setAttribute('aria-describedby', help.id);
            }
            if (box || mine) (box || mine).setAttribute('data-agx-autofocus', '');
            const actions = ui.el('div', 'agx-actions', '', ui.dialog);
            ui.button(_gxText('common.download', 'Download'), () => {
                const includeAudio = box ? box.checked : undefined;
                const useReadingSettings = mine ? mine.checked : undefined;
                const returnTo = ui.returnTo;
                ui.close();
                handleExportFlashcards(mode, { includeAudio, useReadingSettings, opener: returnTo });
            }, true, actions);
            ui.button(_gxText('common.cancel', 'Cancel'), () => ui.close(), false, actions);
        });
    };

    // ─── handleExportGlossaryFile ─────────────────────────────────────
    // Word lists: a spreadsheet (CSV), Quizlet (paste-based import) and Anki
    // (text import). 'chooser' opens a small in-page dialog to pick one.
    const _gxText = (key, fallback, params) => {
        const { t } = liveRef.current || {};
        let value = '';
        try { value = typeof t === 'function' ? t(key) : ''; } catch (_) { value = ''; }
        let text = typeof value === 'string' && value && value !== key ? value : fallback;
        Object.keys(params || {}).forEach(name => { text = String(text).split('{' + name + '}').join(String(params[name] == null ? '' : params[name])); });
        return text;
    };
    const _gxPlain = value => _glossaryPlainText(value);
    const _gxOneLine = value => _gxPlain(value).replace(/\s+/g, ' ').trim();
    const _gxDefinition = item => (item.def != null ? item.def : item.definition);
    const _gxTranslation = (item, lang) => {
        const translation = _flashcardTranslation(item, lang);
        return translation.usable ? translation.spoken : '';
    };
    const _gxEntries = (scope = 'all') => {
        const { generatedContent, filteredGlossaryData, filteredGlossaryResource } = liveRef.current || {};
        if (!generatedContent || generatedContent.type !== 'glossary') return null;
        let list = generatedContent.data;
        if (typeof list === 'string') { try { list = JSON.parse(list); } catch (_) { list = []; } }
        list = Array.isArray(list) ? list : [];
        const entries = list.filter(item => item && typeof item === 'object' && _gxOneLine(item.term));
        if (scope === 'all') return entries;
        if (scope === 'selected') return entries.filter(item => item.isSelected !== false);
        // Filters belong to the source object used to compute the visible rows.
        // A missing or stale filter never falls back to the complete glossary.
        if (scope !== 'filtered' || filteredGlossaryResource !== generatedContent || !Array.isArray(filteredGlossaryData)) return [];
        const entrySet = new Set(entries), byId = new Map(), seen = new Set();
        const idOf = item => item && item.entryId != null && String(item.entryId).trim() ? String(item.entryId) : '';
        entries.forEach(item => { const id = idOf(item); if (id) byId.set(id, byId.has(id) ? null : item); });
        return filteredGlossaryData.map(row => {
            if (!row || typeof row !== 'object') return null;
            if (entrySet.has(row)) return row;
            const id = idOf(row);
            if (id) return byId.get(id) || null;
            const original = Number.isInteger(row._originalIdx) ? list[row._originalIdx] : null;
            return entrySet.has(original) && row.term === original.term && _gxDefinition(row) === _gxDefinition(original) ? original : null;
        }).filter(item => item && !seen.has(item) && seen.add(item));
    };
    const _gxScopeLabel = (scope, count) => scope === 'filtered'
        ? _gxText('export.word_list_scope_filtered', 'Filtered words ({count})', { count })
        : scope === 'selected' ? _gxText('export.word_list_scope_selected', 'Selected words ({count})', { count })
        : _gxText('export.word_list_scope_all', 'All words ({count})', { count });
    const _gxLanguages = entries => {
        const languages = [];
        entries.forEach(item => {
            if (!item.translations || typeof item.translations !== 'object' || Array.isArray(item.translations)) return;
            Object.keys(item.translations).forEach(lang => { if (_gxTranslation(item, lang).trim() && !languages.includes(lang)) languages.push(lang); });
        });
        return languages;
    };
    // RFC 4180 quoting, and a leading ' on anything a spreadsheet would run as a formula.
    const _gxCsvCell = value => {
        let text = _gxPlain(value);
        if (/^[=+\-@\t\r]/.test(text)) text = "'" + text;
        return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    };
    const _gxCsv = (entries, languages) => {
        const rows = [[_gxText('output.col_term', 'Term'), _gxText('output.col_def', 'Definition'), _gxText('export.word_list_col_tier', 'Tier')].concat(languages)];
        entries.forEach(item => rows.push([item.term, _gxDefinition(item), item.tier].concat(languages.map(lang => _gxTranslation(item, lang)))));
        return String.fromCharCode(0xFEFF) + rows.map(row => row.map(_gxCsvCell).join(',')).join('\r\n') + '\r\n';
    };
    const _gxPairs = (entries, back, resource = liveRef.current?.generatedContent) => entries.map(item => ({
        front: _gxOneLine(item.term),
        back: _gxOneLine(back === 'definition' ? _gxDefinition(item) : _gxTranslation(item, back)),
        tags: _gxOneLine(item.tier).replace(/\s+/g, '_'),
        frontLanguage: _glossarySourceLanguage(resource, item, 'termLanguage'),
        backLanguage: back === 'definition' ? _glossarySourceLanguage(resource, item, 'definitionLanguage') : back,
    })).filter(pair => pair.front && pair.back);
    const _gxQuizlet = pairs => pairs.map(pair => pair.front + '\t' + pair.back).join('\n');
    // Anki ignores raw # comment records. Quoting preserves valid #include or
    // #hashtag terms, in addition to escaping quotes already inside a field.
    const _gxAnkiField = text => (text.includes('"') || text.startsWith('#') ? '"' + text.replace(/"/g, '""') + '"' : text);
    const _gxAnki = pairs => '#separator:tab\n#html:false\n#columns:Front\tBack\tTags\n#tags column:3\n'
        + pairs.map(pair => [pair.front, pair.back, pair.tags].map(_gxAnkiField).join('\t')).join('\n') + '\n';
    const _gxFileName = (kind, extension) => {
        const { generatedContent } = liveRef.current || {};
        let title = '';
        try { title = String((generatedContent && generatedContent.title) || getDefaultTitle('glossary') || ''); } catch (_) { title = ''; }
        const base = title.normalize('NFC').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'glossary';
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        return base + '-' + kind + '-' + now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) + '.' + extension;
    };
    const _gxDownload = (text, mime, filename) => {
        const blob = new Blob([text], { type: mime });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1500);
    };
    const _GX_CSS = '.agx-overlay{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:flex-start;justify-content:center;padding:12px;overflow:auto;overscroll-behavior:contain;background:rgba(15,23,42,.6);color-scheme:light}'
        + '.agx-dialog{box-sizing:border-box;width:min(100%,34rem);max-height:calc(100vh - 24px);max-height:calc(100dvh - 24px);overflow:auto;overscroll-behavior:contain;padding:20px;border-radius:16px;background:#fff;color:#0f172a;font:0.9375rem/1.45 system-ui,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35)}'
        + '.agx-dialog h2{margin:0 0 10px;font-size:1.125rem}.agx-dialog h3{margin:16px 0 6px;font-size:1rem}.agx-dialog [hidden]{display:none!important}'
        + '.agx-dialog fieldset{margin:0 0 10px;padding:6px 12px;border:1px solid #94a3b8;border-radius:8px}.agx-dialog legend{padding:0 4px;font-weight:700}'
        + '.agx-option{display:flex;align-items:center;gap:8px;min-height:44px;cursor:pointer}.agx-option input{flex:none;width:1.25rem;height:1.25rem;margin:0}'
        + '.agx-format{box-sizing:border-box;padding:10px;margin:6px 0;border:2px solid transparent;border-radius:8px;overflow-wrap:anywhere}.agx-format[data-selected="true"]{border-color:#4338ca;background:#eef2ff;color:#312e81;font-weight:700}.agx-format input{accent-color:#4338ca}'
        + '.agx-label{display:block;margin:8px 0 4px;font-weight:700}'
        + '.agx-dialog select,.agx-dialog textarea{box-sizing:border-box;width:100%;max-width:100%;padding:8px;border:1px solid #64748b;border-radius:6px;background:#fff;color:#0f172a;font:inherit}'
        + '.agx-dialog select{min-height:44px}.agx-dialog textarea{font:0.8125rem/1.4 ui-monospace,monospace}'
        + '.agx-note{margin:6px 0 0;font-size:0.875rem;color:#334155}.agx-status{min-height:1.4em;margin:8px 0 0;font-size:0.875rem;color:#1e293b}'
        + '.agx-preview{padding:10px 12px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc;overflow-wrap:anywhere}.agx-preview[data-empty="true"]{border-color:#a16207;background:#fefce8;color:#713f12}'
        + '.agx-sample{max-height:18rem;overflow:auto;overscroll-behavior:contain;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.agx-sample dl{margin:0}.agx-sample dl>div{padding:12px}.agx-sample dl>div+div{border-top:1px solid #cbd5e1}.agx-sample dt{font-weight:700;overflow-wrap:anywhere}.agx-sample dd{margin:4px 0 0;color:#334155;overflow-wrap:anywhere}'
        + '.agx-raw{margin-top:12px}.agx-raw summary{min-height:44px;align-content:center;font-weight:700;cursor:pointer}.agx-raw textarea{resize:vertical;min-height:6rem;tab-size:4}'
        + '.agx-review{margin-top:8px}.agx-review summary{min-height:44px;align-content:center;font-weight:700;cursor:pointer;overflow-wrap:anywhere}.agx-review-words{max-height:12rem;overflow:auto;overscroll-behavior:contain;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc}.agx-review ul{margin:0;padding:10px 12px 10px 32px;padding-inline-start:32px;padding-inline-end:12px}.agx-review li{padding:4px 0;overflow-wrap:anywhere}'
        + '.agx-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}'
        + '.agx-btn{min-height:44px;padding:8px 14px;border:1px solid #64748b;border-radius:8px;background:#fff;color:#0f172a;font:inherit;font-weight:700;cursor:pointer}'
        + '.agx-btn-primary{border-color:#4338ca;background:#4338ca;color:#fff}'
        + '.agx-btn:disabled,.agx-btn[aria-disabled="true"]{border-color:#94a3b8;background:#e2e8f0;color:#475569;cursor:not-allowed}'
        + '.agx-dialog :focus-visible{outline:3px solid #4338ca;outline-offset:2px}'
        + '@media (forced-colors:active){.agx-format[data-selected="true"]{border-color:Highlight}.agx-btn:disabled{color:GrayText}.agx-dialog :focus-visible{outline-color:Highlight}}'
        + '@media (prefers-reduced-motion:reduce){.agx-overlay,.agx-overlay *{transition:none!important;animation:none!important}}';
    let _gxActive = null;
    // In-page dialog built here (Canvas blocks window.confirm): focus trap,
    // Escape closes, and focus goes back to the button that opened it.
    const _gxDialog = (title, opener, build) => {
        if (_gxActive) _gxActive.close(false);
        const doc = document;
        const returnTo = opener && typeof opener.focus === 'function' ? opener : doc.activeElement;
        if (!doc.getElementById('allo-gx-style')) {
            const style = doc.createElement('style');
            style.id = 'allo-gx-style';
            style.textContent = _GX_CSS;
            (doc.head || doc.body).appendChild(style);
        }
        const overlay = doc.createElement('div');
        overlay.className = 'agx-overlay';
        const dialog = doc.createElement('section');
        const uid = 'agx-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        dialog.className = 'agx-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', uid + '-title');
        overlay.appendChild(dialog);
        let closed = false;
        let detachObserver = null;
        const background = [];
        const scrollLocks = [];
        const releaseBackground = () => {
            if (detachObserver) detachObserver.disconnect();
            background.forEach(({ node, inert }) => {
                if (inert === null) node.removeAttribute('inert');
                else node.setAttribute('inert', inert);
            });
            scrollLocks.forEach(({ node, declarations }) => {
                ['overflow', 'overflow-x', 'overflow-y'].forEach(property => node.style.removeProperty(property));
                declarations.forEach(([property, value, priority]) => node.style.setProperty(property, value, priority));
            });
        };
        const ui = {
            dialog, returnTo, uid,
            el: (tag, className, text, parent) => {
                const node = doc.createElement(tag);
                if (className) node.className = className;
                if (text) node.textContent = text;
                if (parent) parent.appendChild(node);
                return node;
            },
            button: (label, onClick, primary, parent) => {
                const node = ui.el('button', 'agx-btn' + (primary ? ' agx-btn-primary' : ''), label, parent);
                node.type = 'button';
                node.addEventListener('click', onClick);
                return node;
            },
            close: (restore = true) => {
                if (closed) return;
                closed = true;
                overlay.remove();
                releaseBackground();
                if (_gxActive === ui) _gxActive = null;
                if (restore && returnTo && returnTo.isConnected && typeof returnTo.focus === 'function') returnTo.focus();
            },
        };
        ui.el('h2', '', title, dialog).id = uid + '-title';
        const focusable = () => {
            const nodes = Array.from(dialog.querySelectorAll('button,input,select,textarea,summary,a[href],[tabindex]:not([tabindex="-1"])')).filter(node => !node.disabled && !node.closest('[hidden]') && (!node.closest('details:not([open])') || node.tagName === 'SUMMARY'));
            // A radio group has one Tab stop: its checked choice. Match the
            // browser's order so Shift+Tab still wraps after changing format.
            return nodes.filter(node => node.type !== 'radio' || !node.name || node.checked || !nodes.some(other => other.type === 'radio' && other.name === node.name && other.checked));
        };
        overlay.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); ui.close(); return; }
            if (event.key !== 'Tab') return;
            event.stopPropagation();
            const list = focusable();
            if (!list.length) { event.preventDefault(); return; }
            const first = list[0], last = list[list.length - 1];
            if (event.shiftKey && (doc.activeElement === first || !dialog.contains(doc.activeElement))) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && (doc.activeElement === last || !dialog.contains(doc.activeElement))) { event.preventDefault(); first.focus(); }
        });
        overlay.addEventListener('mousedown', (event) => { if (event.target === overlay) ui.close(); });
        build(ui);
        doc.body.appendChild(overlay);
        // aria-modal alone does not prevent background focus or scrolling.
        // Keep exact prior state so exports opened from an existing host dialog
        // do not remove that dialog's inert regions or scroll lock on return.
        Array.from(doc.body.children).filter(node => node !== overlay).forEach(node => {
            background.push({ node, inert: node.getAttribute('inert') });
            node.setAttribute('inert', '');
        });
        [doc.documentElement, doc.body].forEach(node => {
            const declarations = Array.from(node.style).filter(property => /^overflow(?:-[xy])?$/.test(property))
                .map(property => [property, node.style.getPropertyValue(property), node.style.getPropertyPriority(property)]);
            scrollLocks.push({ node, declarations });
            node.style.setProperty('overflow', 'hidden', 'important');
        });
        // Host teardown may remove the overlay without going through Close.
        // Release its state without moving focus into a disappearing view.
        detachObserver = new MutationObserver(() => { if (!overlay.isConnected) ui.close(false); });
        detachObserver.observe(doc.body, { childList: true });
        _gxActive = ui;
        const start = dialog.querySelector('[data-agx-autofocus]') || focusable()[0];
        if (start) start.focus();
        return ui;
    };
    const _gxQuizletDialog = (text, count, opener, exportOptions = {}) => _gxDialog(_gxText('export.word_list_quizlet_title', 'Copy for Quizlet'), opener, (ui) => {
        ui.el('p', 'agx-note', _gxText('export.word_list_quizlet_help', 'In Quizlet, create a set, choose Import, and paste this text. Keep Tab between term and definition and New line between cards.'), ui.dialog);
        ui.el('p', 'agx-note', _gxText('export.word_list_scope', 'Words to export') + ': ' + _gxScopeLabel(exportOptions.scope, exportOptions.scopeCount), ui.dialog);
        const raw = ui.el('details', 'agx-raw', '', null);
        ui.el('summary', '', _gxText('export.word_list_show_import_text', 'View import text'), raw);
        const label = ui.el('label', 'agx-label', _gxText('export.word_list_quizlet_text', 'Text to paste into Quizlet'), raw);
        const area = ui.el('textarea', '', '', raw);
        label.htmlFor = area.id = ui.uid + '-text';
        area.readOnly = true;
        area.rows = 5;
        area.value = text;
        area.setAttribute('dir', 'auto');
        area.setAttribute('spellcheck', 'false');
        area.setAttribute('wrap', 'off');
        const status = ui.el('p', 'agx-status', count === 1
            ? _gxText('export.word_list_card_count_one', '1 card ready.')
            : _gxText('export.word_list_card_count', '{count} cards ready.', { count }), ui.dialog);
        status.setAttribute('role', 'status');
        status.setAttribute('aria-live', 'polite');
        status.setAttribute('aria-atomic', 'true');
        const actions = ui.el('div', 'agx-actions', '', ui.dialog);
        // Canvas blocks the Clipboard API: the host helper, then the API, then execCommand,
        // and last the selected text for the teacher to copy by hand.
        let copying = false;
        const copyButton = ui.button(_gxText('common.copy', 'Copy'), async () => {
            if (copying) return;
            copying = true;
            copyButton.setAttribute('aria-disabled', 'true');
            copyButton.setAttribute('aria-busy', 'true');
            status.textContent = _gxText('export.word_list_copying', 'Copying…');
            try {
                let ok = false;
                try { if (typeof window.alloCopyText === 'function') ok = !!(await window.alloCopyText(text)); } catch (_) { ok = false; }
                if (!ui.dialog.isConnected) return;
                if (!ok) { try { if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') { await navigator.clipboard.writeText(text); ok = true; } } catch (_) { ok = false; } }
                if (!ui.dialog.isConnected) return;
                if (!ok) { try { raw.open = true; area.focus(); area.select(); ok = document.execCommand('copy') === true; if (ok) copyButton.focus(); } catch (_) { ok = false; } }
                if (!ok) { raw.open = true; area.focus(); area.select(); }
                status.textContent = ok
                    ? _gxText('export.word_list_copied', 'Copied. Paste it into the Import box in Quizlet.')
                    : _gxText('export.word_list_copy_failed', 'Copying is blocked here. The text is selected: press Ctrl+C (or Cmd+C) to copy it.');
            } finally {
                copying = false;
                copyButton.removeAttribute('aria-disabled');
                copyButton.removeAttribute('aria-busy');
            }
        }, true, actions);
        copyButton.setAttribute('data-agx-autofocus', '');
        ui.button(_gxText('export.word_list_download_txt', 'Download .txt'), () => {
            _gxDownload(text, 'text/plain;charset=utf-8', exportOptions.filename);
            status.textContent = _gxText('export.word_list_downloaded', 'Word list downloaded.');
        }, false, actions);
        const previewTitle = ui.el('h3', '', _gxText('export.word_list_preview', 'Card preview'), ui.dialog);
        previewTitle.id = ui.uid + '-preview';
        const backLabel = exportOptions.back && exportOptions.back !== 'definition'
            ? _gxText('export.word_list_back_translation', '{lang} translation', { lang: _glossaryLanguageLabel(exportOptions.back) })
            : _gxText('export.word_list_back_definition', 'Definition');
        ui.el('p', 'agx-note', _gxText('export.word_list_back', 'Back of each card') + ': ' + backLabel, ui.dialog);
        if (count > 3) ui.el('p', 'agx-note', _gxText('export.word_list_preview_count', 'Showing {shown} of {total} cards.', { shown: 3, total: count }), ui.dialog);
        const preview = ui.el('div', 'agx-sample', '', ui.dialog);
        preview.tabIndex = 0;
        preview.setAttribute('role', 'region');
        preview.setAttribute('aria-labelledby', previewTitle.id);
        const list = ui.el('dl', '', '', preview);
        exportOptions.preview.forEach(pair => {
            const row = ui.el('div', '', '', list);
            const part = (tag, value, language) => {
                const node = ui.el(tag, '', value, row), info = _glossaryLanguageInfo(language);
                // An empty lang explicitly marks unknown text rather than
                // inheriting the interface language and mispronouncing it.
                node.setAttribute('lang', info.tag || '');
                node.setAttribute('dir', info.dir);
            };
            part('dt', pair.front, pair.frontLanguage);
            part('dd', pair.back, pair.backLanguage);
        });
        ui.dialog.appendChild(raw);
        const footer = ui.el('div', 'agx-actions', '', ui.dialog);
        ui.button(_gxText('export.word_list_change_options', 'Back to export options'), () => handleExportGlossaryFile('chooser', { format: 'quizlet', back: exportOptions.back, scope: exportOptions.scope, opener: ui.returnTo }), false, footer);
        ui.button(_gxText('common.close', 'Close'), () => ui.close(), false, footer);
    });
    const _gxChooser = (languages, opener, initial = {}) => _gxDialog(_gxText('export.word_list_title', 'Export word list'), opener, (ui) => {
        let format = ['csv', 'quizlet', 'anki'].includes(initial.format) ? initial.format : 'csv';
        const notes = {
            csv: _gxText('export.word_list_csv_note', 'Opens in Excel, Google Sheets or Numbers. Each language gets its own column.'),
            quizlet: _gxText('export.word_list_quizlet_note', 'Shows the text to copy into the Import box in Quizlet.'),
            anki: _gxText('export.word_list_anki_note', 'Downloads a text file for File > Import in Anki. The tier becomes a tag.'),
        };
        const fieldset = ui.el('fieldset', '', '', ui.dialog);
        ui.el('legend', '', _gxText('export.word_list_format', 'File format'), fieldset);
        const backWrap = ui.el('div', '', '', null);
        const note = ui.el('p', 'agx-note', '', null);
        const summary = ui.el('p', 'agx-status agx-preview', '', null);
        summary.setAttribute('role', 'status');
        summary.setAttribute('aria-live', 'polite');
        summary.setAttribute('aria-atomic', 'true');
        summary.id = ui.uid + '-summary';
        const sync = () => {
            backWrap.hidden = format === 'csv';
            note.textContent = notes[format];
            fieldset.querySelectorAll('input').forEach(input => { input.closest('label').dataset.selected = String(input.checked); });
            const scope = scopeSelect.value;
            Array.from(scopeSelect.options).forEach(option => { option.textContent = _gxScopeLabel(option.value, (_gxEntries(option.value) || []).length); });
            scopeHelp.textContent = scope === 'filtered'
                ? _gxText('export.word_list_scope_filtered_help', 'Exports the words currently shown, in their displayed order.')
                : scope === 'selected' ? _gxText('export.word_list_scope_selected_help', 'Uses the Include checkboxes in Edit mode, including selected words hidden by filters.')
                : _gxText('export.word_list_scope_all_help', 'Exports every glossary word, including words hidden by filters.');
            const entries = _gxEntries(scope) || [];
            const missingBacks = format === 'csv' ? [] : entries.filter(item => !_gxPairs([item], select.value).length);
            const skipped = missingBacks.length;
            const ready = entries.length - skipped;
            summary.textContent = !entries.length
                ? _gxText('export.word_list_scope_empty', 'No words in this scope. Choose another scope or change the filters or selection.')
                : format === 'csv'
                ? (ready === 1 ? _gxText('export.word_list_word_count_one', '1 word included.') : _gxText('export.word_list_word_count', '{count} words included.', { count: ready }))
                : !ready ? _gxText('export.word_list_no_cards', 'No words have text for the back of the card yet.')
                : ready === 1 ? _gxText('export.word_list_card_count_one', '1 card ready.')
                : _gxText('export.word_list_card_count', '{count} cards ready.', { count: ready });
            if (skipped) summary.textContent += ' ' + (skipped === 1
                ? _gxText('export.word_list_skip_preview_one', '1 word will be left out because its selected back is missing.')
                : _gxText('export.word_list_skip_preview', '{count} words will be left out because their selected backs are missing.', { count: skipped }));
            review.hidden = !skipped;
            reviewList.replaceChildren();
            missingBacks.forEach(item => {
                const row = ui.el('li', '', '', reviewList);
                ui.el('bdi', '', _gxOneLine(item.term), row).setAttribute('dir', 'auto');
            });
            summary.dataset.empty = String(!ready);
            exportButton.disabled = !ready;
            exportButton.textContent = format === 'quizlet'
                ? _gxText('export.word_list_continue_quizlet', 'Prepare Quizlet text')
                : format === 'anki' ? _gxText('export.word_list_download_anki', 'Download Anki file')
                : _gxText('export.word_list_download_csv', 'Download CSV');
        };
        [['csv', _gxText('export.word_list_csv', 'Spreadsheet (CSV)')], ['quizlet', _gxText('export.word_list_quizlet', 'Quizlet (copy and paste)')], ['anki', _gxText('export.word_list_anki', 'Anki (text file)')]].forEach(([value, text]) => {
            const row = ui.el('label', 'agx-option agx-format', '', fieldset);
            const input = ui.el('input', '', '', row);
            input.type = 'radio';
            input.name = ui.uid + '-format';
            input.value = value;
            input.checked = value === format;
            if (input.checked) input.setAttribute('data-agx-autofocus', '');
            input.addEventListener('change', () => { if (input.checked) { format = value; sync(); } });
            ui.el('span', '', text, row);
        });
        const scopeLabel = ui.el('label', 'agx-label', _gxText('export.word_list_scope', 'Words to export'), ui.dialog);
        const scopeSelect = ui.el('select', '', '', ui.dialog);
        scopeLabel.htmlFor = scopeSelect.id = ui.uid + '-scope';
        scopeSelect.setAttribute('data-agx-scope', '');
        ['all', 'filtered', 'selected'].forEach(scope => { ui.el('option', '', '', scopeSelect).value = scope; });
        scopeSelect.value = initial.scope || 'all';
        const scopeHelp = ui.el('p', 'agx-note', '', ui.dialog);
        scopeHelp.id = ui.uid + '-scope-help';
        scopeSelect.setAttribute('aria-describedby', scopeHelp.id + ' ' + summary.id);
        scopeSelect.addEventListener('change', sync);
        ui.dialog.appendChild(backWrap);
        const backLabel = ui.el('label', 'agx-label', _gxText('export.word_list_back', 'Back of each card'), backWrap);
        const select = ui.el('select', '', '', backWrap);
        select.setAttribute('data-agx-back', '');
        backLabel.htmlFor = select.id = ui.uid + '-back';
        select.setAttribute('aria-describedby', summary.id);
        select.addEventListener('change', sync);
        ui.el('option', '', _gxText('export.word_list_back_definition', 'Definition'), select).value = 'definition';
        languages.forEach(lang => { ui.el('option', '', _gxText('export.word_list_back_translation', '{lang} translation', { lang: _glossaryLanguageLabel(lang) }), select).value = lang; });
        if (typeof initial.back === 'string' && initial.back && initial.back !== 'definition' && !languages.includes(initial.back)) {
            ui.el('option', '', _gxText('export.word_list_back_translation', '{lang} translation', { lang: _glossaryLanguageLabel(initial.back) }), select).value = initial.back;
        }
        select.value = initial.back || 'definition';
        ui.dialog.appendChild(note);
        ui.dialog.appendChild(summary);
        const review = ui.el('details', 'agx-review', '', ui.dialog);
        const reviewHeading = ui.el('summary', '', _gxText('word_practice.review_words', 'Words to review'), review);
        reviewHeading.id = ui.uid + '-review';
        reviewHeading.setAttribute('aria-describedby', summary.id);
        const reviewWords = ui.el('div', 'agx-review-words', '', review);
        reviewWords.tabIndex = 0;
        reviewWords.setAttribute('role', 'region');
        reviewWords.setAttribute('aria-labelledby', reviewHeading.id);
        const reviewList = ui.el('ul', '', '', reviewWords);
        const actions = ui.el('div', 'agx-actions', '', ui.dialog);
        const exportButton = ui.button(_gxText('export.word_list_export', 'Export'), () => {
            const back = select.value;
            const returnTo = ui.returnTo;
            if (handleExportGlossaryFile(format, { back, scope: scopeSelect.value, opener: returnTo })) ui.close(format !== 'quizlet');
            else sync();
        }, true, actions);
        ui.button(_gxText('common.cancel', 'Cancel'), () => ui.close(), false, actions);
        sync();
    });
    const handleExportGlossaryFile = (format = 'chooser', options = {}) => {
        const { addToast } = liveRef.current || {};
        const opts = options && typeof options === 'object' ? options : {};
        const allEntries = _gxEntries();
        if (!allEntries) return false;
        if (!allEntries.length) {
            if (typeof addToast === 'function') addToast(_gxText('export.word_list_empty', 'Add glossary terms before exporting a word list.'), 'info');
            return false;
        }
        const scope = opts.scope === undefined ? 'all' : opts.scope;
        const isChooser = !['csv', 'anki', 'quizlet'].includes(format);
        const entries = _gxEntries(scope) || [];
        if (!['all', 'filtered', 'selected'].includes(scope) || (!isChooser && !entries.length)) {
            if (typeof addToast === 'function') addToast(_gxText('export.word_list_scope_empty', 'No words in this scope. Choose another scope or change the filters or selection.'), 'info');
            return false;
        }
        const languages = _gxLanguages(isChooser ? allEntries : entries);
        if ((format === 'anki' || format === 'quizlet') && typeof opts.back === 'string' && opts.back && opts.back !== 'definition' && !languages.includes(opts.back)) {
            if (typeof addToast === 'function') addToast(_gxText('export.word_list_missing_translation', 'No usable {language} translations are available. Choose a different card back.', { language: _glossaryLanguageLabel(opts.back) }), 'info');
            return false;
        }
        const back = languages.includes(opts.back) ? opts.back : 'definition';
        const pairs = format === 'quizlet' || format === 'anki' ? _gxPairs(entries, back) : [];
        const reportSkipped = () => {
            const count = entries.length - pairs.length;
            if (count && typeof addToast === 'function') addToast(count === 1
                ? _gxText('export.word_list_skipped_back_one', '1 card was skipped because its selected back is missing.')
                : _gxText('export.word_list_skipped_back', '{count} cards were skipped because their selected backs are missing.', { count }), 'info');
        };
        const downloaded = () => {
            const message = _gxText('export.word_list_downloaded', 'Word list downloaded.');
            if (typeof addToast === 'function') addToast(message, 'success');
            else { try { if (typeof window.alloAnnounce === 'function') window.alloAnnounce(message); } catch (_) {} }
        };
        if (format === 'csv') {
            _gxDownload(_gxCsv(entries, languages), 'text/csv;charset=utf-8', _gxFileName('word-list', 'csv'));
            downloaded();
            return true;
        }
        if ((format === 'quizlet' || format === 'anki') && !pairs.length) {
            if (typeof addToast === 'function') addToast(_gxText('export.word_list_no_cards', 'No words have text for the back of the card yet.'), 'info');
            return false;
        }
        if (format === 'anki') {
            _gxDownload(_gxAnki(pairs), 'text/plain;charset=utf-8', _gxFileName('anki', 'txt'));
            downloaded();
            reportSkipped();
            return true;
        }
        if (format === 'quizlet') {
            // Keep filename and preview provenance with the captured import
            // text even if another resource arrives while this dialog is open.
            _gxQuizletDialog(_gxQuizlet(pairs), pairs.length, opts.opener, { back, scope, scopeCount: entries.length,
                filename: _gxFileName('quizlet', 'txt'), preview: pairs.slice(0, 3) });
            reportSkipped();
            return true;
        }
        _gxChooser(languages, opts.opener, opts);
        return true;
    };

    return {
        handleExportResearchJSON,
        handleExportProfiles,
        handleExportQTI,
        handleExportIMS,
        handleExportH5P,
        handleExportSlides,
        handleExportStorybook,
        handleExportFlashcards,
        handleExportGlossaryFile,
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
