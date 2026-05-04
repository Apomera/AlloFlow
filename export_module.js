(function(){"use strict";
if(window.AlloModules&&window.AlloModules.Export){console.log("[CDN] Export already loaded, skipping"); return;}
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
            default: return t('common.resource') || 'Resource';
        }
    };

    const cleanTextForPptx = (text) => text ? String(text).replace(/\*\*/g, '').replace(/\*/g, '') : '';

    // exportLanguagePack NOT extracted — it stays inside useTranslation hook
    // because it closes over languagePack + targetLanguage state that aren't
    // accessible from AlloFlowContent's scope.

    // ─── handleExportResearchJSON ──────────────────────────────────────
    const handleExportResearchJSON = () => {
        const {
            probeHistory, surveyResponses, fidelityLog, sessionCounter,
            externalCBMScores, interventionLogs, addToast,
        } = liveRef.current;
        const researchBundle = {
            exportVersion: 1,
            exportDate: new Date().toISOString(),
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
    const handleExportQTI = async () => {
        const { generatedContent, sourceTopic, addToast, t } = liveRef.current;
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
        const title = escapeXml(generatedContent.title || t('export.qti_default_title'));
        const description = escapeXml(sourceTopic || t('export.qti_default_desc'));
        const manifestXml = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:lom="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2.xsd">
  <metadata>
    <schema>${t('common.ims_content') || 'IMS Content'}</schema>
    <schemaversion>1.1.3</schemaversion>
    <lom:lom>
      <lom:general>
        <lom:title>
          <lom:string language="en">${title}</lom:string>
        </lom:title>
        <lom:description>
          <lom:string language="en">${description}</lom:string>
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
        const questions = generatedContent?.data.questions || [];
        questions.forEach((q, i) => {
            const itemId = `Q_${i}_${generateUUID().slice(0,8)}`;
            const responseId = `RESPONSE_${i}`;
            const correctIndex = q.options.findIndex(opt => opt === q.correctAnswer);
            const correctIdent = correctIndex !== -1 ? `OPT_${correctIndex}` : "OPT_0";
            let choicesXml = "";
            q.options.forEach((opt, optIdx) => {
                choicesXml += `
        <response_label ident="OPT_${optIdx}">
          <material>
            <mattext texttype="text/plain">${escapeXml(opt)}</mattext>
          </material>
        </response_label>`;
            });
            itemsXml += `
    <item ident="${itemId}" title="${t('common.question_i_1') || 'Question'}">
      <presentation>
        <material>
          <mattext texttype="text/plain">${escapeXml(q.question)}</mattext>
        </material>
        <response_lid ident="${responseId}" rcardinality="Single">
          <render_choice>
            ${choicesXml}
          </render_choice>
        </response_lid>
      </presentation>
      <resprocessing>
        <outcomes>
          <decvar varname="SCORE" vartype="Integer" defaultval="0"/>
        </outcomes>
        <respcondition title="${t('common.correct') || 'Correct'}">
          <conditionvar>
            <varequal respident="${responseId}">${correctIdent}</varequal>
          </conditionvar>
          <setvar action="Set" varname="SCORE">1</setvar>
        </respcondition>
      </resprocessing>
    </item>`;
        });
        const reflections = generatedContent?.data.reflections || [];
        reflections.forEach((ref, i) => {
            const text = typeof ref === 'string' ? ref : ref.text;
            const itemId = `REF_${i}_${generateUUID().slice(0,8)}`;
            const responseId = `REF_RESP_${i}`;
            itemsXml += `
    <item ident="${itemId}" title="${t('common.reflection_i_1') || 'Reflection'}">
      <itemmetadata>
        <qtimetadata>
          <qtimetadatafield>
            <fieldlabel>question_type</fieldlabel>
            <fieldentry>essay_question</fieldentry>
          </qtimetadatafield>
        </qtimetadata>
      </itemmetadata>
      <presentation>
        <material>
          <mattext texttype="text/plain">${escapeXml(text)}</mattext>
        </material>
        <response_str ident="${responseId}" rcardinality="Single">
          <render_fib rows="5">
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
            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const link = document.createElement('a');
            link.href = url;
            link.download = `canvas-quiz-export.zip`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            addToast(t('export_status.qti_success'), "success");
        } catch (err) {
            warnLog("QTI Package generation failed", err);
            addToast(t('export_status.package_error'), "error");
        }
    };

    // ─── handleExportIMS ───────────────────────────────────────────────
    const handleExportIMS = async () => {
        const {
            history, sourceTopic, studentResponses,
            generateResourceHTML, addToast, t,
        } = liveRef.current;
        if (!window.JSZip) {
            addToast(t('export_status.lib_loading'), "error");
            return;
        }
        if (history.length === 0) {
            addToast(t('export_status.no_content'), "error");
            return;
        }
        addToast(t('export_status.packaging_ims'), "info");
        const zip = new window.JSZip();
        const manifestId = `MANIFEST-${Date.now()}`;
        const orgId = `ORG-${Date.now()}`;
        const defaultTitle = t('export.ims_resource_pack');
        const itemsToExport = history.filter(item => {
            const html = generateResourceHTML(item, false, studentResponses);
            return html && html.trim() !== '';
        });
        let resourcesXml = '';
        let itemsXml = '';
        itemsToExport.forEach((item, idx) => {
            const itemId = `ITEM-${item.id}`;
            const resId = `RES-${item.id}`;
            const filename = `resource_${idx}.html`;
            const title = item.title || getDefaultTitle(item.type);
            const contentHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="UTF-8">
                    <title>${title}</title>
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
                    ${generateResourceHTML(item, false, studentResponses)}
                </body>
                </html>
            `;
            zip.file(filename, contentHtml);
            itemsXml += `<item identifier="${itemId}" identifierref="${resId}"><title>${title}</title></item>`;
            resourcesXml += `<resource identifier="${resId}" type="webcontent" href="${filename}"><file href="${filename}"/></resource>`;
        });
        const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${manifestId}" xmlns="http://www.imsglobal.org/xsd/imscp_v1p1" xmlns:lom="http://www.imsglobal.org/xsd/imsmd_v1p2" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.imsglobal.org/xsd/imscp_v1p1 http://www.imsglobal.org/xsd/imscp_v1p1.xsd http://www.imsglobal.org/xsd/imsmd_v1p2 http://www.imsglobal.org/xsd/imsmd_v1p2.xsd">
  <metadata>
    <schema>${t('common.ims_content') || 'IMS Content'}</schema>
    <schemaversion>1.1</schemaversion>
    <lom:lom>
      <lom:general>
        <lom:title>
          <lom:string language="en">${sourceTopic || defaultTitle}</lom:string>
        </lom:title>
      </lom:general>
    </lom:lom>
  </metadata>
  <organizations default="${orgId}">
    <organization identifier="${orgId}">
      <title>${sourceTopic || defaultTitle}</title>
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
            URL.revokeObjectURL(url);
            addToast(t('export_status.ims_success'), "success");
        } catch (err) {
            warnLog("Package generation failed", err);
            addToast(t('export_status.package_error'), "error");
        }
    };

    // ─── handleExportSlides ───────────────────────────────────────────
    const handleExportSlides = () => {
        const { history, sourceTopic, gradeLevel, addToast, t } = liveRef.current;
        if (!window.PptxGenJS) {
            addToast(t('export_status.ppt_lib_loading'), "error");
            return;
        }
        if (history.length === 0) {
            addToast(t('export_status.no_content'), "error");
            return;
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
                    { rect: { x: 0, y: 5.25, w: "100%", h: 0.375, fill: { color: "E2E8F0" } } },
                    { text: { text: t('export.slides_master_footer'), options: { x: 0.5, y: 5.3, w: 4, h: 0.3, fontSize: 11, color: "64748B" } } },
                    { slideNumber: { x: 9.0, y: 5.3, fontSize: 11, color: "64748B" } }
                ]
            });
            pptx.title = sourceTopic || t('export.slides_title_default');
            pptx.subject = t('export.slides_subject');
            pptx.author = "AlloFlow";
            pptx.lang = 'en';
            const addA11yNotes = (slide, title, content) => { try { slide.addNotes(title + (content ? ': ' + content.substring(0, 500) : '')); } catch(e) {} };
            const titleSlide = pptx.addSlide();
            titleSlide.background = { color: themeColor };
            addA11yNotes(titleSlide, 'Title: ' + (sourceTopic || 'Lesson'), 'Grade level: ' + gradeLevel);
            titleSlide.addText(sourceTopic || t('export.slides_title_default'), {
                x: 0.5, y: 1.5, w: 9, h: 2,
                fontSize: 44, fontFace: 'Arial', color: lightText,
                bold: true, align: 'center', valign: 'middle'
            });
            titleSlide.addText(`${t('export.ppt_grade_level')}: ${gradeLevel} | ${t('export.ppt_generated')}: ${new Date().toLocaleDateString()}`, {
                x: 0.5, y: 3.5, w: 9, h: 0.5,
                fontSize: 18, fontFace: 'Arial', color: 'E0E7FF',
                align: 'center',
            });
            history.forEach(item => {
                const type = item.type;
                const itemTitle = item.title || getDefaultTitle(type);
                if (type === 'simplified') {
                    const textData = typeof item.data === 'string' ? item.data : '';
                    if (!textData) return;
                    const paragraphs = textData.split(/\n{2,}/);
                    let currentSlideObjects = [];
                    let currentSlideLen = 0;
                    const MAX_SLIDE_CHARS = 900;
                    paragraphs.forEach((para) => {
                        const rawText = para.replace(/\[(.*?)\]\(.*?\)/g, '$1').replace(/\*\*/g, '').replace(/\*/g, '');
                        if (currentSlideLen + rawText.length > MAX_SLIDE_CHARS && currentSlideObjects.length > 0) {
                            const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                            addA11yNotes(slide, itemTitle, rawText.substring(0, 300));
                            slide.addText(itemTitle, {
                                x: 0.5, y: 0.15, w: 9, h: 0.5,
                                fontSize: 20, bold: true, color: lightText
                            });
                            slide.addText(currentSlideObjects, {
                                x: 0.5, y: 1.0, w: 9, h: 4.0,
                                fontSize: 14, color: darkText, valign: 'top', align: 'left',
                                lineSpacing: 18
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
                        slide.addText(itemTitle, {
                            x: 0.5, y: 0.15, w: 9, h: 0.5,
                            fontSize: 20, bold: true, color: lightText
                        });
                        slide.addText(currentSlideObjects, {
                            x: 0.5, y: 1.0, w: 9, h: 4.0,
                            fontSize: 14, color: darkText, valign: 'top', align: 'left',
                            lineSpacing: 18
                        });
                    }
                } else if (type === 'glossary') {
                    const rows = [];
                    const hasTrans = item.data.some(d => d.translations && Object.keys(d.translations).length > 0);
                    if (hasTrans) {
                        rows.push([
                            { text: t('export.term_col'), options: { bold: true, fill: "F1F5F9", color: darkText } },
                            { text: t('export.def_col'), options: { bold: true, fill: "F1F5F9", color: darkText } },
                            { text: t('export.trans_col'), options: { bold: true, fill: "F1F5F9", color: darkText } }
                        ]);
                    } else {
                        rows.push([
                            { text: t('export.term_col'), options: { bold: true, fill: "F1F5F9", color: darkText } },
                            { text: t('export.def_col'), options: { bold: true, fill: "F1F5F9", color: darkText } }
                        ]);
                    }
                    item.data.forEach(g => {
                        const row = [g.term, g.def];
                        if (hasTrans) {
                            const transStr = g.translations ? Object.values(g.translations).join(' / ') : '';
                            row.push(transStr);
                        }
                        rows.push(row);
                    });
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    slide.addText(itemTitle, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                    addA11yNotes(slide, itemTitle, 'Glossary with ' + item.data.length + ' terms: ' + item.data.slice(0, 5).map(g => g.term).join(', '));
                    slide.addTable(rows, {
                        x: 0.5, y: 1.0, w: 9,
                        colW: hasTrans ? [2, 4.5, 2.5] : [2.5, 6.5],
                        border: { pt: 1, color: "E2E8F0" },
                        fill: { color: "FFFFFF" },
                        fontSize: 11,
                        color: darkText,
                        autoPage: true,
                        autoPageLineWeight: -0.4,
                        margin: 0.5,
                        master: "MASTER_SLIDE",
                    });
                } else if (type === 'quiz') {
                    const questions = item.data.questions || [];
                    questions.forEach((q, i) => {
                        const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        slide.addText(t('export.slides_question_title', { number: i + 1 }), {
                            x: 0.5, y: 0.15, w: 9, h: 0.5,
                            fontSize: 20, bold: true, color: lightText
                        });
                        slide.addText(q.question, {
                            x: 0.5, y: 1.0, w: 9, h: 1.2,
                            fontSize: 18, bold: true, color: darkText, valign: 'top',
                        });
                        q.options.forEach((opt, idx) => {
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
                            slide.addText(opt, {
                                x: 1.6, y: yPos, w: 7.2, h: 0.55,
                                fontSize: 14, color: darkText, valign: 'middle'
                            });
                        });
                        slide.addNotes(`${t('export.ppt_correct_note')}: ${q.correctAnswer}\n\n${q.factCheck || ''}`);
                    });
                    const ANSWERS_PER_SLIDE = 6;
                    for (let ak = 0; ak < questions.length; ak += ANSWERS_PER_SLIDE) {
                        const akChunk = questions.slice(ak, ak + ANSWERS_PER_SLIDE);
                        const akSlide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                        akSlide.addText(ak === 0 ? `${itemTitle} — ${t('export.answer_key_title') || 'Answer Key'}` : `${itemTitle} — ${t('export.answer_key_title') || 'Answer Key'} (${t('common.continued') || 'Cont.'})`, {
                            x: 0.5, y: 0.15, w: 9, h: 0.5,
                            fontSize: 20, bold: true, color: lightText
                        });
                        const akRichText = [];
                        akChunk.forEach((q, idx) => {
                            const qNum = ak + idx + 1;
                            const correctLetter = q.options ? String.fromCharCode(65 + q.options.indexOf(q.correctAnswer)) : '?';
                            akRichText.push({
                                text: `Q${qNum}: ${correctLetter}) ${q.correctAnswer || ''}`,
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
                        akSlide.addText(akRichText, { x: 0.5, y: 1.0, w: 9, h: 4.0, valign: 'top' });
                    }
                } else if (type === 'image' && item.data.imageUrl) {
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    slide.addText(itemTitle, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                    slide.addImage({
                        data: item.data.imageUrl,
                        x: 'center', y: 1.0,
                        w: 8, h: 3.5,
                        sizing: { type: 'contain', w: 9, h: 3.5 },
                        altText: item.data.prompt || item.title || 'Visual support image'
                    });
                    slide.addText(item.data.prompt, {
                        x: 0.5, y: 4.6, w: 9, h: 0.6,
                        fontSize: 10, color: "64748B", italic: true, align: 'center', valign: 'top',
                    });
                    addA11yNotes(slide, itemTitle, 'Image: ' + (item.data.prompt || ''));
                } else if (type === 'outline') {
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    slide.addText(item.data.main || itemTitle, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                    const richText = [];
                    const branches = Array.isArray(item.data.branches) ? item.data.branches : [];
                    branches.forEach(b => {
                        richText.push({
                            text: b.title,
                            options: { fontSize: 16, bold: true, breakLine: true, color: themeColor, bullet: { type: 'number', color: themeColor } }
                        });
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
                        valign: 'top',
                    });
                } else if (type === 'timeline') {
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    slide.addText(itemTitle, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                    const timelineItems = item.data || [];
                    addA11yNotes(slide, itemTitle, 'Timeline with ' + (item.data || []).length + ' events');
                    const ITEMS_PER_SLIDE = 5;
                    for (let i = 0; i < timelineItems.length; i += ITEMS_PER_SLIDE) {
                        const chunk = timelineItems.slice(i, i + ITEMS_PER_SLIDE);
                        const isContinuation = i > 0;
                        const currentSlide = isContinuation ? pptx.addSlide({ masterName: "MASTER_SLIDE" }) : slide;
                        if (isContinuation) {
                            currentSlide.addText(itemTitle + " (Cont.)", { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
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
                                fontSize: 12, color: darkText, valign: 'top',
                            });
                        });
                    }
                } else if (type === 'concept-sort') {
                    const slide = pptx.addSlide({ masterName: "MASTER_SLIDE" });
                    slide.addText(itemTitle, { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 20, bold: true, color: lightText });
                    const categories = item.data.categories || [];
                    const items = item.data.items || [];
                    const colWidth = 9 / categories.length;
                    categories.forEach((cat, cIdx) => {
                        const xPos = 0.5 + (cIdx * colWidth);
                        let headerColor = "E0E7FF";
                        if (cat.color) {
                            const colorName = cat.color.replace('bg-', '').replace('-500', '');
                            if (colorMap[colorName]) headerColor = colorMap[colorName];
                        }
                        slide.addShape(pptx.ShapeType.rect, {
                            x: xPos + 0.1, y: 1.0, w: colWidth - 0.2, h: 0.5,
                            fill: { color: headerColor },
                        });
                        slide.addText(cat.label, {
                            x: xPos + 0.1, y: 1.0, w: colWidth - 0.2, h: 0.5,
                            fontSize: 14, bold: true, color: darkText, align: 'center',
                        });
                        const catItems = items.filter(it => it.categoryId === cat.id);
                        let yOffset = 1.6;
                        catItems.forEach(it => {
                            slide.addText(it.content, {
                                x: xPos + 0.1, y: yOffset, w: colWidth - 0.2, h: 0.4,
                                fontSize: 11, color: "475569", align: 'center',
                                shape: pptx.ShapeType.rect, fill: { color: "FFFFFF" }, line: { color: "E2E8F0" }
                            });
                            yOffset += 0.5;
                        });
                    });
                }
            });
            const safeTopic = sourceTopic ? sourceTopic.replace(/[^a-z0-9]/gi, '_').substring(0, 20) : 'Lesson';
            pptx.writeFile({ fileName: `${t('export.filenames.slides_prefix')}-${safeTopic}.pptx` });
            addToast(t('export_status.ppt_success'), "success");
        } catch (e) {
            warnLog("PPTX Export Error", e);
            addToast(t('export_status.ppt_error'), "error");
        }
    };

    // ─── handleExportStorybook ────────────────────────────────────────
    const handleExportStorybook = async (includeImages = false) => {
        const {
            adventureState, sourceTopic,
            setShowStorybookExportModal, setIsProcessing,
            rehydrateHistoryWithImages, parseMarkdownToHTML,
            addToast, t,
        } = liveRef.current;
        if (adventureState.history.length === 0 && !adventureState.currentScene) return;
        setShowStorybookExportModal(false);
        setIsProcessing(true);
        addToast(t('adventure.storybook_toast_writing'), "info");
        try {
            const fullStory = await rehydrateHistoryWithImages(adventureState.history, adventureState.imageCache);
            if (adventureState.currentScene) {
                fullStory.push({
                    type: 'scene',
                    text: adventureState.currentScene.text,
                    image: adventureState.sceneImage
                });
            }
            const historyText = fullStory.map(h =>
                h.type === 'scene' ? `Scene: ${h.text}` :
                h.type === 'choice' ? `Student Action: ${h.text}` :
                `Outcome/Feedback: ${h.text}`
            ).join('\n\n');
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
            const summary = await window.callGemini(prompt);
            const title = sourceTopic || t('adventure.title');
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
            let storyHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                  <title>${strPageTitle}</title>
                  <style>
                      body { font-family: 'Georgia', serif; line-height: 1.8; color: #2c3e50; max-width: 800px; margin: 0 auto; padding: 40px; background: #fffdf5; }
                      .cover { text-align: center; padding: 60px 0; border-bottom: 4px double #d4af37; margin-bottom: 40px; }
                      h1 { font-size: 3em; margin-bottom: 10px; color: #2c3e50; font-family: sans-serif; }
                      .meta { font-style: italic; color: #7f8c8d; }
                      .summary-box { background: white; padding: 40px; border: 1px solid #e0e0e0; border-radius: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); margin-bottom: 50px; position: relative; }
                      .summary-box::before { content: "${strEpilogue}"; position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: #fffdf5; padding: 0 15px; color: #d4af37; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; font-size: 0.8em; }
                      .log-section { margin-top: 40px; }
                      .chapter { margin-bottom: 30px; page-break-inside: avoid; }
                      .scene { margin-bottom: 10px; text-align: justify; }
                      .scene-img { width: 100%; max-width: 600px; height: auto; display: block; margin: 0 auto 20px auto; border-radius: 4px; border: 4px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                      .choice { margin: 10px 0 10px 20px; padding-left: 15px; border-left: 3px solid #3498db; font-family: sans-serif; font-weight: bold; color: #2980b9; font-size: 0.95em; }
                      .feedback { margin: 10px 0 20px 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; color: #57606f; font-size: 0.9em; font-style: italic; border: 1px solid #ecf0f1; }
                      .print-btn { position: fixed; top: 20px; right: 20px; padding: 12px 24px; background: #2c3e50; color: white; border: none; border-radius: 50px; cursor: pointer; font-weight: bold; box-shadow: 0 4px 10px rgba(0,0,0,0.2); transition: transform 0.2s; }
                      .print-btn:hover { transform: scale(1.05); background: #34495e; }
                      @media print {
                          .print-btn { display: none; }
                          body { background: white; padding: 0; }
                          .summary-box { box-shadow: none; border: 1px solid #ccc; }
                      }
                  </style>
              </head>
              <body>
                  <button class="print-btn" onclick="window.print()">${strPrint}</button>
                  <div class="cover">
                      <h1>${title}</h1>
                      <p class="meta">${strSubtitle}</p>
                      <p class="meta">${strMeta}</p>
                  </div>
                  <div class="summary-box">
                      ${parseMarkdownToHTML(summary)}
                  </div>
                  <h3 style="text-align: center; text-transform: uppercase; letter-spacing: 2px; color: #bdc3c7; margin-bottom: 40px;">${strLogHeader}</h3>
                  <div class="log-section">
            `;
            let currentBlock = { scene: null, image: null, choice: null, feedback: null };
            fullStory.forEach((item) => {
                if (item.type === 'scene') {
                    if (currentBlock.scene) {
                        storyHtml += `
                          <div class="chapter">
                              ${includeImages && currentBlock.image ? `<img loading="lazy" src="${currentBlock.image}" class="scene-img" alt="Scene Visualization" />` : ''}
                              <div class="scene">${parseMarkdownToHTML(currentBlock.scene)}</div>
                              ${currentBlock.choice ? `<div class="choice">${strUser}: ${currentBlock.choice}</div>` : ''}
                              ${currentBlock.feedback ? `<div class="feedback">${currentBlock.feedback.replace(/\([+-]?\d+ XP\)/, '')}</div>` : ''}
                          </div>
                          <div style="text-align: center; color: #ecf0f1; margin: 20px 0;">${strSeparator}</div>
                        `;
                    }
                    currentBlock = { scene: item.text, image: item.image || null, choice: null, feedback: null };
                } else if (item.type === 'choice') {
                    currentBlock.choice = item.text;
                } else if (item.type === 'feedback') {
                    currentBlock.feedback = item.text;
                }
            });
            if (currentBlock.scene) {
                storyHtml += `
                  <div class="chapter">
                      ${includeImages && currentBlock.image ? `<img loading="lazy" src="${currentBlock.image}" class="scene-img" alt="Scene Visualization" />` : ''}
                      <div class="scene">${parseMarkdownToHTML(currentBlock.scene)}</div>
                      ${currentBlock.choice ? `<div class="choice">${strUser}: ${currentBlock.choice}</div>` : ''}
                      ${currentBlock.feedback ? `<div class="feedback">${currentBlock.feedback}</div>` : ''}
                  </div>
                `;
            }
            storyHtml += `
                  </div>
                  <div style="text-align: center; margin-top: 50px; color: #95a5a6; font-size: 0.8em;">${strFooter}</div>
              </body>
              </html>
            `;
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(storyHtml);
                printWindow.document.close();
            } else {
                addToast(t('adventure.storybook_toast_popup'), "error");
            }
        } catch (e) {
            warnLog("Storybook Export Error", e);
            addToast(t('adventure.storybook_toast_error'), "error");
        } finally {
            setIsProcessing(false);
        }
    };

    // ─── handleExportFlashcards ───────────────────────────────────────
    const handleExportFlashcards = (mode = 'standard') => {
        const { generatedContent, t } = liveRef.current;
        if (!generatedContent || generatedContent.type !== 'glossary') return;
        const cleanText = (text) => text ? text.replace(/\*\*/g, '').replace(/\*/g, '') : '';
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
                <h2 style="margin-top:0; color: #3730a3; font-family: sans-serif;">${t(titleKey)}</h2>
                <p style="color: #4338ca; font-family: sans-serif;">${t('flashcards.print_instructions')}</p>
                <button onclick="window.print()" style="background: #4f46e5; color: white; border: none; padding: 10px 20px; font-size: 16px; font-weight: bold; border-radius: 6px; cursor: pointer; margin-top: 10px; font-family: sans-serif;">${t('common.print')}</button>
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
            alert(t('flashcards.no_translations'));
            return;
        }
        const renderSet = (lang = null) => {
            const header = lang
                ? (isLanguageMode ? `${t('languages.english')} ⟷ ${lang}` : lang)
                : t('languages.english');
            htmlBody += `<div class="set-header">${header} ${t('flashcards.set_header')}</div>`;
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
                        <div class="lang-label">${t('languages.english')}</div>
                        <div class="primary-text">${cleanText(item.term)}</div>
                        <div class="def-text">${cleanText(item.def)}</div>
                    `;
                    backContent = `
                        <div class="lang-label">${lang}</div>
                        <div class="primary-text">${cleanText(transTerm)}</div>
                        <div class="def-text">${cleanText(transDef)}</div>
                    `;
                } else {
                    frontContent = `
                        <div class="cut-guide">${t('flashcards.fold_guide')}</div>
                        <div class="lang-label">${t('languages.english')}</div>
                        <div class="primary-text">${cleanText(item.term)}</div>
                        ${transTerm ? `<div class="secondary-text">${cleanText(transTerm)}</div><div class="lang-label" style="margin-top:2px;">${lang}</div>` : ''}
                    `;
                    backContent = `
                        <div class="def-text"><strong>${t('languages.english')}:</strong> ${cleanText(item.def)}</div>
                        ${transDef ? `<div class="def-trans"><strong>${lang}:</strong> ${cleanText(transDef)}</div>` : ''}
                        ${item.etymology ? `<div class="etym-text">📜 <strong>${t('glossary.etymology_label') || 'Roots'}:</strong> ${cleanText(item.etymology)}</div>` : ''}
                        ${Array.isArray(item.roots) && item.roots.length > 0 ? `<div class="etym-roots">${item.roots.map(r => `<span class="root-chip"><b>${cleanText(r.root || '')}</b>${r.lang ? ` <i>(${cleanText(r.lang)})</i>` : ''}${r.meaning ? ` = ${cleanText(r.meaning)}` : ''}</span>`).join(' ')}</div>${(() => { const seen = new Set(); const allRel = []; item.roots.forEach(r => { if (Array.isArray(r.related)) r.related.forEach(w => { const k = String(w || '').trim(); if (k && !seen.has(k.toLowerCase())) { seen.add(k.toLowerCase()); allRel.push(k); } }); }); return allRel.length > 0 ? `<div class="etym-related"><strong>Related words:</strong> ${allRel.slice(0, 6).map(w => cleanText(w)).join(', ')}</div>` : ''; })()}` : ''}
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
            <html>
            <head>
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
        const blob = new Blob([fullHtml], { type: 'text/html' });
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
        handleExportSlides,
        handleExportStorybook,
        handleExportFlashcards,
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
