// misc_handlers_source.jsx - Phase H.3 of CDN modularization.
// handleFileUpload + handleLoadProject + detectClimaxArchetype
// extracted from AlloFlowANTI.txt 2026-04-25.

const _MISC_MIB = 1024 * 1024;
const _MISC_INLINE_LIMIT_BYTES = 15 * _MISC_MIB;
const _MISC_DOCUMENT_LIMIT_BYTES = 30 * _MISC_MIB;
const _MISC_MEDIA_LIMIT_BYTES = 300 * _MISC_MIB;
const _MISC_EXTENSIONS = Object.freeze({
    pdf: ['pdf'],
    docx: ['docx'],
    pptx: ['pptx'],
    spreadsheet: ['xlsx', 'xls', 'xlsb', 'ods'],
    transcript: ['md', 'markdown', 'csv', 'tsv'],
    text: ['txt', 'json', 'html', 'htm', 'xml', 'js', 'css', 'py'],
    audio: ['mp3', 'wav', 'ogg', 'oga', 'm4a', 'aac', 'flac', 'opus', 'weba'],
    video: ['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv', 'mpeg', 'mpg', 'ogv'],
    image: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'tif', 'tiff', 'heic', 'heif'],
});
const _MISC_DEFAULT_MIME = Object.freeze({
    pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    audio: 'audio/mpeg',
    video: 'video/mp4',
    image: 'image/jpeg',
});
const _MISC_EXTENSION_MIME = Object.freeze({
    pdf: 'application/pdf', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', flac: 'audio/flac', opus: 'audio/ogg', weba: 'audio/webm',
    mp4: 'video/mp4', webm: 'video/webm', mov: 'video/quicktime', m4v: 'video/mp4', avi: 'video/x-msvideo', mkv: 'video/x-matroska', mpeg: 'video/mpeg', mpg: 'video/mpeg', ogv: 'video/ogg',
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff', heic: 'image/heic', heif: 'image/heif',
});
const _miscUploadExtension = (file) => {
    const match = String(file && file.name || '').toLowerCase().match(/\.([a-z0-9]+)$/);
    return match ? match[1] : '';
};
const _classifyMiscUpload = (file) => {
    const mime = String(file && file.type || '').trim().toLowerCase();
    const ext = _miscUploadExtension(file);
    let kind = 'unknown';
    if (mime === 'application/pdf') kind = 'pdf';
    else if (mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') kind = 'docx';
    else if (mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation') kind = 'pptx';
    else if (mime.startsWith('audio/')) kind = 'audio';
    else if (mime.startsWith('video/')) kind = 'video';
    else if (mime.startsWith('image/')) kind = 'image';
    else {
        for (const candidate of Object.keys(_MISC_EXTENSIONS)) {
            if (_MISC_EXTENSIONS[candidate].includes(ext)) { kind = candidate; break; }
        }
        if (kind === 'unknown' && (mime.startsWith('text/') || mime === 'application/json' || mime === 'application/xml')) kind = 'text';
    }
    const originalMimeMatchesKind = (kind === 'audio' && mime.startsWith('audio/'))
        || (kind === 'video' && mime.startsWith('video/'))
        || (kind === 'image' && mime.startsWith('image/'))
        || kind === 'text' || kind === 'spreadsheet' || kind === 'transcript';
    return {
        kind,
        ext,
        mime: originalMimeMatchesKind ? mime : (_MISC_EXTENSION_MIME[ext] || _MISC_DEFAULT_MIME[kind] || mime || 'application/octet-stream'),
        size: Math.max(0, Number(file && file.size) || 0),
    };
};

// Copyable diagnostics must not retain filenames, document/model excerpts,
// custom instructions, or arbitrary Error.message bodies. Preserve only a
// bounded error identity, stable code/status, and coarse failure category.
const _miscDiagnosticErrorSummary = (error) => {
    const name = String(error && error.name || 'Error').replace(/[^a-z0-9_.-]/gi, '').slice(0, 48) || 'Error';
    const rawCode = error && (error.code != null ? error.code : error.status);
    const code = rawCode == null ? '' : String(rawCode).replace(/[^a-z0-9_.-]/gi, '').slice(0, 48);
    const message = String(error && error.message || error || '').toLowerCase();
    const category = /abort|cancel|stale/.test(message) ? 'cancelled-or-stale'
        : /timeout|timed out|etimedout/.test(message) ? 'timeout'
        : /429|quota|resource_exhausted|rate limit/.test(message) ? 'quota'
        : /401|403|auth|api key|permission/.test(message) ? 'auth'
        : /json|parse|syntax|malformed/.test(message) ? 'parse-or-format'
        : /read|filereader|encoding/.test(message) ? 'read'
        : /fetch|network|5\d\d/.test(message) ? 'network'
        : 'unexpected';
    return name + (code ? ' code=' + code : '') + ' category=' + category;
};

// FileReader events, workbook conversion, and vision extraction can all outlive
// the input event that started them. Retain every concrete resource under one
// generation owner so selecting B or invalidating the document actually aborts
// A's work instead of merely suppressing A's eventual React writes.
function _createFileIntakeOperationManager(controllerFactory) {
    let generation = 0;
    let active = null;
    const makeController = () => {
        if (typeof controllerFactory === 'function') return controllerFactory();
        if (typeof AbortController !== 'undefined') return new AbortController();
        const signal = { aborted: false };
        return { signal, abort: () => { signal.aborted = true; } };
    };
    const isCurrent = (owner) => !!(owner
        && active === owner
        && owner.generation === generation
        && !(owner.signal && owner.signal.aborted));
    const abortOwner = (owner) => {
        if (!owner) return;
        try { if (owner.controller && typeof owner.controller.abort === 'function') owner.controller.abort(); } catch (_) {}
        const readers = owner.readers ? Array.from(owner.readers) : [];
        if (owner.readers) owner.readers.clear();
        readers.forEach((reader) => {
            try {
                if (reader && typeof reader.abort === 'function'
                    && reader.readyState !== 2) reader.abort();
            } catch (_) {}
        });
    };
    const cancelActive = () => {
        const owner = active;
        if (!owner) return false;
        // Revoke publication before abort() synchronously emits onabort.
        active = null;
        generation += 1;
        abortOwner(owner);
        return true;
    };
    return {
        begin(documentEpoch) {
            cancelActive();
            const controller = makeController();
            const owner = {
                generation: ++generation,
                documentEpoch,
                controller,
                signal: controller && controller.signal ? controller.signal : null,
                readers: new Set(),
            };
            active = owner;
            return owner;
        },
        isCurrent,
        attachReader(owner, reader) {
            if (!isCurrent(owner)) {
                try { if (reader && typeof reader.abort === 'function') reader.abort(); } catch (_) {}
                return false;
            }
            owner.readers.add(reader);
            return true;
        },
        releaseReader(owner, reader) {
            if (!owner || !owner.readers) return false;
            return owner.readers.delete(reader);
        },
        finish(owner) {
            if (!isCurrent(owner)) return false;
            active = null;
            generation += 1;
            if (owner.readers) owner.readers.clear();
            return true;
        },
        cancel(owner) {
            if (owner && active !== owner) return false;
            return cancelActive();
        },
        getActive() { return active; },
    };
}

const _fileIntakeOperations = _createFileIntakeOperationManager();
const cancelFileIntakeOperations = () => _fileIntakeOperations.cancel(null);

const handleFileUpload = async (e, deps) => {
  const { callGeminiVision, convertXlsxToMarkdownTables, addToast, t, warnLog, setShowLargeFileModal, setPendingLargeFile, setError, setIsExtracting, setGenerationStep, setInputText, recordSourceProvenance, setPendingPdfBase64, setPendingPdfFile, setPdfAuditResult, setPdfAuditLoading = (() => {}), documentIntakeEpoch, isPdfDocumentIntakeCurrent } = deps;
  try { if (window._DEBUG_MISC_HANDLERS) console.log("[MiscHandlers] handleFileUpload fired"); } catch(_) {}
    const input = e && (e.currentTarget || e.target);
    const file = input && input.files && input.files[0];
    // Browsers suppress change when the same file is selected twice unless the
    // picker value is reset. Capture the File first because clearing the input
    // also clears its live FileList.
    try { if (input) input.value = ''; } catch (_) {}
    const intakeOwner = _fileIntakeOperations.begin(documentIntakeEpoch);
    const intakeSignal = intakeOwner.signal;
    const intakeIsCurrent = () => _fileIntakeOperations.isCurrent(intakeOwner)
        && (typeof isPdfDocumentIntakeCurrent !== 'function'
            || isPdfDocumentIntakeCurrent(documentIntakeEpoch));
    const ownReader = () => {
        const reader = new FileReader();
        _fileIntakeOperations.attachReader(intakeOwner, reader);
        return reader;
    };
    const releaseReader = (reader) => _fileIntakeOperations.releaseReader(intakeOwner, reader);
    const finishExtraction = () => {
        if (!intakeIsCurrent()) return false;
        setIsExtracting(false);
        setGenerationStep('');
        // The host turns this on before waiting for the lazy intake module. Keep
        // it on through the actual FileReader lifecycle so the remediation modal
        // cannot disappear between module handoff and the chooser result. Because
        // finishExtraction is epoch-owned, an old reader can never clear a newer
        // upload's loading state.
        setPdfAuditLoading(false);
        _fileIntakeOperations.finish(intakeOwner);
        return true;
    };
    const fileInfo = _classifyMiscUpload(file);
    if (!file) { finishExtraction(); return; }
    const readBase64 = (reader) => {
        const result = reader && reader.result;
        if (typeof result !== 'string') return '';
        const comma = result.indexOf(',');
        return comma >= 0 ? result.slice(comma + 1) : '';
    };
    const failRead = (message) => {
        if (!intakeIsCurrent()) return;
        setError(message || t('quick_start.error_read_file'));
        finishExtraction();
    };
    const rememberImportedSource = (text) => {
        if (!intakeIsCurrent()) return;
        if (typeof recordSourceProvenance === 'function') recordSourceProvenance({
            title: file.name || 'Imported file',
            locator: file.name || '',
            type: file.type || 'file',
            importMethod: 'file-upload'
        }, text);
    };
    // These guards deliberately do not depend on LargeFileModule. On a cold load its
    // host proxy reports needsChunking=false; consulting that proxy here used to let
    // an arbitrarily large file reach FileReader/base64 expansion before any limit ran.
    const isMedia = fileInfo.kind === 'audio' || fileInfo.kind === 'video';
    const hardLimit = isMedia ? _MISC_MEDIA_LIMIT_BYTES : _MISC_DOCUMENT_LIMIT_BYTES;
    if (fileInfo.size > hardLimit) {
        if (intakeIsCurrent()) {
            setError(isMedia
                ? 'Recording is too large (>300MB). Trim it or split it into smaller recordings.'
                : (t('toasts.file_large') || 'This file is too large (>30MB). Split it into smaller sections.'));
            finishExtraction();
        }
        return;
    }
    const needsChunking = fileInfo.size > _MISC_INLINE_LIMIT_BYTES;
    if (needsChunking) {
        const fileType = fileInfo.kind;
        if (fileType === 'audio' || fileType === 'video') {
            if (!intakeIsCurrent()) return;
            // Long recordings route to the PIPELINE triage too (2026-06-10):
            // the digestion card runs the existing LargeFileHandler chunked
            // transcription (speech mode — visual analysis needs ≤15MB).
            // No base64 stash: readAsDataURL on a 100MB file would bloat
            // memory; the File object rides pendingPdfFile instead.
            setPendingPdfFile(file);
            setPendingPdfBase64(null);
            setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size, _mediaPending: { mime: fileInfo.mime, isVideo: fileType === 'video', chunked: true } });
            finishExtraction();
            addToast(t('toasts.media_choose_digestion_long') || '🎙 Long recording loaded — it will be transcribed in segments (speech analysis). Start from the digestion card.', 'info');
            return;
        } else if (fileType === 'pdf') {
            addToast('Processing large PDF — this may take a moment...', 'info');
        } else {
            setError(t('toasts.file_large'));
            finishExtraction();
            return;
        }
    }
    setIsExtracting(true);
    setGenerationStep(t('status_steps.extracting_text'));
    setError(null);
    const textMimeTypes = [
        'text/plain', 'text/markdown', 'text/csv', 'text/html', 'application/json',
        'application/xml', 'text/javascript', 'text/css'
    ];
    // ── Markdown / CSV → the pipeline (2026-06-10) ──
    // .md (incl. NotebookLM exports — completing the round trip with our own
    // NotebookLM export) and .csv/.tsv route to the PIPELINE triage as the
    // transcript format: markdown headings + pipe-tables survive as real
    // structure (CSV becomes a scoped table → full /Headers + /IDTree in the
    // tagged PDF). 'Skip to Text Extraction' keeps the old source-box path.
    // .txt stays on the content path — it is the content tools' workhorse.
    // ── Spreadsheets (.xlsx/.xls/.xlsb/.ods) → pipeline (2026-06-11) ──
    // SheetJS (Lumen's lazy-CDN pattern) converts each sheet to a markdown
    // pipe-table; the transcript lane builds REAL scoped tables from them.
    if (fileInfo.kind === 'spreadsheet' && typeof convertXlsxToMarkdownTables === 'function') {
        setIsExtracting(true);
        const reader = ownReader();
        reader.onload = async () => {
            releaseReader(reader);
            if (!intakeIsCurrent()) return;
            try {
                const b64 = readBase64(reader);
                if (!b64) throw new Error('The workbook could not be read.');
                addToast(t('toasts.spreadsheet_converting') || '📊 Reading the workbook…', 'info');
                const conv = await convertXlsxToMarkdownTables(b64, { signal: intakeSignal });
                if (!intakeIsCurrent()) return;
                const text = '# ' + file.name.replace(/\.(xlsx|xls|xlsb|ods)$/i, '') + '\n\n' + conv.text
                    + (conv.truncatedRows ? ('\n\n*Note: ' + conv.truncatedRows + ' row(s) beyond the first 200 per sheet were not included.*') : '');
                const MAGIC = 'ALLOTRANSCRIPT:v1\n';
                const bytes = new TextEncoder().encode(MAGIC + text);
                let bin = '';
                for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
                setPendingPdfBase64(btoa(bin));
                setPendingPdfFile(file);
                setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size, _transcriptSource: true });
                finishExtraction();
                addToast('✅ ' + (conv.sheets > 1 ? conv.sheets + ' sheets' : '1 sheet') + (t('toasts.spreadsheet_ready') || ' loaded as accessible tables — Make Accessible for the full treatment (tagged PDF included).'), 'success');
            } catch (err) {
                if (!intakeIsCurrent()) return;
                warnLog('[Spreadsheet→Pipeline] failed:', _miscDiagnosticErrorSummary(err));
                setError((t('toasts.spreadsheet_failed') || 'Could not read the spreadsheet: ') + (err?.message || 'unknown') + ' — export it as CSV and try again.');
                finishExtraction();
            }
        };
        reader.onerror = () => { releaseReader(reader); failRead(t('quick_start.error_read_file')); };
        reader.onabort = () => { releaseReader(reader); if (intakeIsCurrent()) failRead(t('quick_start.error_read_file')); };
        try { reader.readAsDataURL(file); } catch (err) { failRead(err?.message || t('quick_start.error_read_file')); }
        return;
    }
    if (fileInfo.kind === 'transcript') {
        const reader = ownReader();
        reader.onload = (event) => {
            releaseReader(reader);
            if (!intakeIsCurrent()) return;
            let text = String(event.target.result || '');
            if (/\.(csv|tsv)$/i.test(file.name)) {
                // Minimal CSV/TSV → markdown pipe-table (quoted commas honored).
                const delim = /\.tsv$/i.test(file.name) ? '\t' : ',';
                const rows = text.split(/\r?\n/).filter((l) => l.trim()).map((line) => {
                    const cells = []; let cur = ''; let q = false;
                    for (let i = 0; i < line.length; i++) {
                        const ch = line[i];
                        if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
                        else if (ch === '"') q = true;
                        else if (ch === delim) { cells.push(cur); cur = ''; }
                        else cur += ch;
                    }
                    cells.push(cur);
                    return cells;
                });
                if (rows.length) {
                    text = '# ' + file.name.replace(/\.(csv|tsv)$/i, '') + '\n\n'
                        + rows.map((r, i) => '| ' + r.map((c) => c.replace(/\|/g, '/')).join(' | ') + ' |' + (i === 0 ? ('\n|' + r.map(() => ' --- ').join('|') + '|') : '')).join('\n');
                }
            }
            if (text.trim().length < 5) { setError(t('toasts.file_process_error')); finishExtraction(); return; }
            const MAGIC = 'ALLOTRANSCRIPT:v1\n';
            const bytes = new TextEncoder().encode(MAGIC + text.trim());
            let bin = '';
            for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
            setPendingPdfBase64(btoa(bin));
            setPendingPdfFile(file);
            setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size, _transcriptSource: true });
            finishExtraction();
            addToast(t('toasts.textdoc_pipeline_ready') || '📄 Loaded into the accessibility pipeline — Make Accessible for the full treatment, or Skip to Text Extraction to use as source material.', 'success');
        };
        reader.onerror = () => { releaseReader(reader); failRead(t('quick_start.error_read_file')); };
        reader.onabort = () => { releaseReader(reader); if (intakeIsCurrent()) failRead(t('quick_start.error_read_file')); };
        setIsExtracting(true);
        try { reader.readAsText(file); } catch (err) { failRead(err?.message || t('quick_start.error_read_file')); }
        return;
    }
    const isTextFile = fileInfo.kind === 'text' || textMimeTypes.includes(String(file.type || '').toLowerCase());
    if (isTextFile) {
        const reader = ownReader();
        reader.onload = (event) => {
            releaseReader(reader);
            if (!intakeIsCurrent()) return;
            setInputText(event.target.result);
            rememberImportedSource(event.target.result);
            finishExtraction();
        };
        reader.onerror = () => { releaseReader(reader); failRead(t('quick_start.error_read_file')); };
        reader.onabort = () => { releaseReader(reader); if (intakeIsCurrent()) failRead(t('quick_start.error_read_file')); };
        try { reader.readAsText(file); } catch (err) { failRead(err?.message || t('quick_start.error_read_file')); }
        return;
    }
    const isPdf = fileInfo.kind === 'pdf';
    const isDocx = fileInfo.kind === 'docx';
    const isPptx = fileInfo.kind === 'pptx';
    if (isPdf || isDocx || isPptx) {
        const auditReader = ownReader();
        auditReader.onload = () => {
            releaseReader(auditReader);
            if (!intakeIsCurrent()) return;
            const base64 = readBase64(auditReader);
            if (!base64) { failRead(t('quick_start.error_read_file')); return; }
            setPendingPdfBase64(base64);
            setPendingPdfFile(file);
            setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size });
            finishExtraction();
        };
        auditReader.onerror = () => { releaseReader(auditReader); failRead(t('quick_start.error_read_file')); };
        auditReader.onabort = () => { releaseReader(auditReader); if (intakeIsCurrent()) failRead(t('quick_start.error_read_file')); };
        try { auditReader.readAsDataURL(file); } catch (err) { failRead(err?.message || t('quick_start.error_read_file')); }
        return;
    }
    // ── Audio/video → the remediation pipeline (2026-06-10) ──
    // Recordings become a first-class pipeline input: transcribe, wrap in the
    // 'ALLOTRANSCRIPT' format (magic-prefixed base64 — flows through every
    // pipeline dispatcher like a document), open the triage. From there the
    // teacher gets the FULL export suite: structured remediation, typeset
    // tagged PDF, accessible Word, audio re-export. The triage's 'Skip to
    // Text Extraction' covers the old put-it-in-the-source-box behavior.
    // Files needing chunking (>15MB) keep the existing chunked-transcription
    // modal (content path) — they never reach this branch.
    if (isMedia && !needsChunking) {
        // Stash the RAW media and open the triage with a digestion card —
        // the teacher chooses HOW to digest (speech-only / visuals-only /
        // dual-track / synthesized narrative + custom instructions) BEFORE
        // any transcription runs. The view calls transcribeMediaToPayload
        // and swaps in the ALLOTRANSCRIPT payload.
        const reader = ownReader();
        reader.onload = () => {
            releaseReader(reader);
            if (!intakeIsCurrent()) return;
            const base64String = readBase64(reader);
            if (!base64String) { failRead(t('quick_start.error_read_file')); return; }
            setPendingPdfBase64(base64String);
            setPendingPdfFile(file);
            setPdfAuditResult({ _choosing: true, fileName: file.name, fileSize: file.size, _mediaPending: { mime: fileInfo.mime, isVideo: fileInfo.kind === 'video' } });
            finishExtraction();
            addToast(t('toasts.media_choose_digestion') || '🎙 Recording loaded — choose how to digest it (speech, visuals, both) before remediation.', 'info');
        };
        reader.onerror = () => { releaseReader(reader); failRead(t('quick_start.error_read_file')); };
        reader.onabort = () => { releaseReader(reader); if (intakeIsCurrent()) failRead(t('quick_start.error_read_file')); };
        try { reader.readAsDataURL(file); } catch (err) { failRead(err?.message || t('quick_start.error_read_file')); }
        return;
    }
    if (fileInfo.kind === 'image' || fileInfo.kind === 'video' || fileInfo.kind === 'audio') {
        try {
            if (false) { // PDF handling now goes through audit route above
                const pdfReader = ownReader();
                pdfReader.onloadend = async () => {
                    releaseReader(pdfReader);
                    if (!intakeIsCurrent()) return;
                    const base64Full = pdfReader.result.split(',')[1];
                    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
                    setGenerationStep(`Processing ${sizeMB}MB PDF in sections...`);
                    addToast(`Large PDF detected (${sizeMB}MB) — processing in sections for best results`, 'info');
                    try {
                        const sectionPrompts = [
                            `You are an OCR expert for educators. Extract all readable text from the FIRST HALF of this document. Preserve structure (headers, paragraphs) using markdown. If there are images, describe them briefly in [brackets]. If there are tables, preserve them as markdown tables. Return ONLY the extracted text.`,
                            `You are an OCR expert for educators. Extract all readable text from the SECOND HALF of this document (everything after the midpoint). Preserve structure using markdown. If there are images, describe them briefly in [brackets]. If there are tables, preserve them as markdown tables. Return ONLY the extracted text.`
                        ];
                        const chunks = [];
                        for (let i = 0; i < sectionPrompts.length; i++) {
                            setGenerationStep(`Extracting section ${i + 1} of ${sectionPrompts.length}...`);
                            try {
                                const chunkText = await callGeminiVision(sectionPrompts[i], base64Full, 'application/pdf', { signal: intakeSignal });
                                if (!intakeIsCurrent()) return;
                                if (chunkText && chunkText.trim().length > 20) chunks.push(chunkText);
                            } catch (chunkErr) {
                                warnLog(`[PDF Chunk ${i + 1}] Failed:`, _miscDiagnosticErrorSummary(chunkErr));
                                if (i === 0) throw chunkErr; // First chunk failing = total failure
                            }
                        }
                        const fullText = chunks.join('\n\n---\n\n');
                        if (fullText.trim().length < 50) throw new Error('PDF extraction returned insufficient text');
                        setInputText(fullText);
                        rememberImportedSource(fullText);
                        finishExtraction();
                        addToast(`PDF extracted successfully (${chunks.length} sections)`, 'success');
                    } catch (pdfErr) {
                        warnLog('[PDF Chunked] All extraction failed:', _miscDiagnosticErrorSummary(pdfErr));
                        setError('PDF extraction failed — the document may be too complex or image-heavy. Try copying and pasting the text directly.');
                        finishExtraction();
                    }
                };
                pdfReader.readAsDataURL(file);
                return;
            }
            const reader = ownReader();
            reader.onload = async () => {
                releaseReader(reader);
                if (!intakeIsCurrent()) return;
                try {
                const base64String = readBase64(reader);
                if (!base64String) throw new Error('The file could not be read.');
                const mimeType = fileInfo.mime;
                let prompt = "";
                if (mimeType.startsWith('image/') || mimeType === 'application/pdf') {
                    prompt = `
                        You are an Optical Character Recognition (OCR) expert for educators.
                        Extract all readable text from this educational document.
                        - Preserve the original structure (headers, paragraphs) where possible using markdown.
                        - If there are images, describe them briefly in [brackets].
                        - If there are tables, preserve them as markdown tables.
                        - Ignore irrelevant UI elements, page numbers, or watermarks if they disrupt the flow.
                        - If it is a worksheet, transcribe the questions clearly.
                        Return ONLY the extracted text.
                    `;
                } else if (mimeType.startsWith('video/')) {
                    prompt = `
                        You are an expert educational transcriber.
                        Watch this video file.
                        1. Provide a comprehensive transcript of the spoken content.
                        2. Describe any critical visual diagrams, text overlays, or demonstrations shown on screen that are necessary for understanding the topic.
                        Combine this into a coherent source text for a lesson.
                    `;
                } else if (mimeType.startsWith('audio/')) {
                    prompt = `
                        You are an expert educational transcriber.
                        Listen to this audio file.
                        Provide a comprehensive, accurate transcript of the spoken content.
                        Format it as clear text suitable for use as source material.
                    `;
                }
                const text = await callGeminiVision(prompt, base64String, mimeType, { signal: intakeSignal });
                if (!intakeIsCurrent()) return;
                setInputText(text);
                rememberImportedSource(text);
                finishExtraction();
                } catch (err) {
                    if (!intakeIsCurrent()) return;
                    warnLog('File extraction failed:', _miscDiagnosticErrorSummary(err));
                    failRead(t('toasts.file_process_error'));
                }
            };
            reader.onerror = () => { releaseReader(reader); failRead(t('quick_start.error_read_file')); };
            reader.onabort = () => { releaseReader(reader); if (intakeIsCurrent()) failRead(t('quick_start.error_read_file')); };
            try { reader.readAsDataURL(file); } catch (err) { failRead(err?.message || t('quick_start.error_read_file')); }
        } catch (err) {
            warnLog("Unhandled error:", _miscDiagnosticErrorSummary(err));
            setError(t('toasts.file_process_error'));
            finishExtraction();
        }
        return;
    }
    setError(t('toasts.unsupported_file_type'));
    finishExtraction();
};

// A file input and React loading flag cannot own an asynchronous project load:
// password prompts, authenticated decryption, and Builder-draft unpacking can
// all yield long enough for a newer file to take over. This manager gives the
// newest load exclusive generation ownership, aborts an unread FileReader, and
// completes a started host lifecycle exactly once when a newer load cancels it.
function _createProjectLoadOperationManager(controllerFactory) {
    let generation = 0;
    let active = null;
    const makeController = () => {
        if (typeof controllerFactory === 'function') return controllerFactory();
        if (typeof AbortController !== 'undefined') return new AbortController();
        const signal = { aborted: false };
        return { signal, abort: () => { signal.aborted = true; } };
    };
    const isCurrent = (owner) => !!(owner
        && active === owner
        && owner.generation === generation
        && !(owner.controller && owner.controller.signal && owner.controller.signal.aborted));
    const completeLifecycle = (owner, payload) => {
        if (!owner || !owner.lifecycleStarted || owner.lifecycleCompleted) return;
        owner.lifecycleCompleted = true;
        if (typeof owner.onComplete === 'function') {
            try { owner.onComplete(payload); } catch (_) {}
        }
    };
    const abortOwner = (owner, notifyLifecycle) => {
        if (!owner) return;
        try { if (owner.controller && typeof owner.controller.abort === 'function') owner.controller.abort(); } catch (_) {}
        try { if (owner.reader && typeof owner.reader.abort === 'function') owner.reader.abort(); } catch (_) {}
        if (notifyLifecycle !== false) completeLifecycle(owner, { success: false, cancelled: true });
    };
    const cancelActive = (options) => {
        const owner = active;
        if (!owner) return false;
        active = null;
        generation += 1;
        abortOwner(owner, !options || options.notifyLifecycle !== false);
        return true;
    };
    return {
        begin(options) {
            cancelActive({ notifyLifecycle: true });
            const opts = options || {};
            const controller = makeController();
            const owner = {
                generation: ++generation,
                controller,
                signal: controller && controller.signal ? controller.signal : null,
                reader: null,
                lifecycleStarted: false,
                lifecycleCompleted: false,
                onStart: opts.onStart,
                onComplete: opts.onComplete,
            };
            active = owner;
            return owner;
        },
        attachReader(owner, reader) {
            if (!isCurrent(owner)) {
                try { if (reader && typeof reader.abort === 'function') reader.abort(); } catch (_) {}
                return false;
            }
            owner.reader = reader;
            return true;
        },
        isCurrent,
        startLifecycle(owner, payload) {
            if (!isCurrent(owner)) return false;
            if (typeof owner.onStart === 'function') owner.onStart(payload);
            if (!isCurrent(owner)) return false;
            owner.lifecycleStarted = true;
            return true;
        },
        finish(owner, success) {
            if (!isCurrent(owner)) return false;
            active = null;
            generation += 1;
            completeLifecycle(owner, { success: success === true });
            return true;
        },
        cancel(owner, options) {
            if (owner && active !== owner) return false;
            return cancelActive(options || {});
        },
        getActive() {
            return active;
        },
    };
}

const _projectLoadOperations = _createProjectLoadOperationManager();
const cancelProjectLoad = (options) => _projectLoadOperations.cancel(null, options || {});
const _projectDiagnosticErrorSummary = typeof _miscDiagnosticErrorSummary === 'function'
    ? _miscDiagnosticErrorSummary
    : (error) => {
        const name = String(error && error.name || 'Error').replace(/[^a-z0-9_.-]/gi, '').slice(0, 48) || 'Error';
        const code = error && (error.code != null ? error.code : error.status);
        return name + (code == null ? '' : ' code=' + String(code).replace(/[^a-z0-9_.-]/gi, '').slice(0, 48));
    };

const handleLoadProject = (e, deps) => {
  const { setStudentProgressLog, setStudentProjectSettings, setIsIndependentMode, setIsTeacherMode, setIsParentMode, setIsStudentLinkMode, setAdventureDifficulty, setAdventureInputMode, setAdventureLanguageMode, setAdventureCustomInstructions, setAdventureChanceMode, setAdventureFreeResponseEnabled, setAdventureConsistentCharacters, setIsAdventureStoryMode, setIsSocialStoryMode, setSocialStoryFocus, setAdventureArtStyle, setAdventureCustomArtStyle, setUseLowQualityVisuals, setEnableFactionResources, setFactionResourceMode, setStudentNickname, setAdventureState, setHasSavedAdventure, setGameCompletions, setLabelChallengeResults, setSocraticMessages, setWordSoundsHistory, setWordSoundsFamilies, setWordSoundsAudioLibrary, setWordSoundsBadges, setPhonemeMastery, setWordSoundsDailyProgress, setWordSoundsConfusionPatterns, setFluencyAssessments, setFlashcardEngagement, setTimeOnTask, setGlobalPoints, setPointHistory, setCompletedActivities, setProbeHistory, setInterventionLogs, setSurveyResponses, setFidelityLog, setSessionCounter, setExternalCBMScores, setResearchMode, setHistory, setGeneratedContent, setActiveView, setIsMapLocked, setIsFullscreen, setLeftWidth, projectFileInputRef, t, addToast, warnLog, hydrateHistory, setStickers, setConceptMasteryLocal, bankImportedConceptMastery, onProjectLoadStart, onProjectLoadComplete } = deps;
  try { if (window._DEBUG_MISC_HANDLERS) console.log("[MiscHandlers] handleLoadProject fired"); } catch(_) {}
    const file = e.target.files[0];
    if (!file) return;
    const projectLoadOwner = _projectLoadOperations.begin({
        onStart: onProjectLoadStart,
        onComplete: onProjectLoadComplete,
    });
    const reader = new FileReader();
    _projectLoadOperations.attachReader(projectLoadOwner, reader);
    let projectLoadSucceeded = false;
    const projectLoadIsCurrent = () => _projectLoadOperations.isCurrent(projectLoadOwner);
    const finishCurrentProjectLoad = (success) => {
        const finished = _projectLoadOperations.finish(projectLoadOwner, success);
        if (finished && projectFileInputRef && projectFileInputRef.current) projectFileInputRef.current.value = '';
        return finished;
    };
    reader.onload = async (event) => {
        if (!projectLoadIsCurrent()) return;
        try {
            let rawData = JSON.parse(event.target.result);
            // Encrypted educator project: ask for the password and decrypt before anything else.
            // Without it the file is just ciphertext; a wrong password or tampering fails the
            // authenticated GCM check and we stop rather than load garbage.
            if (window.AlloModules && window.AlloModules.AlloCrypto && window.AlloModules.AlloCrypto.isEncryptedEnvelope(rawData)) {
                if (!(window.AlloFlowUX && typeof window.AlloFlowUX.prompt === 'function')) {
                    if (addToast) addToast(t('save.password_dialog_loading') || 'The password dialog is still loading. Please wait a moment and try again.', 'error');
                    return;
                }
                const _pw = await window.AlloFlowUX.prompt(
                    t('save.enter_password') || 'This project is password-protected. Enter the password to open it.',
                    '',
                    {
                        inputType: 'password',
                        title: t('save.encrypted_title') || 'Encrypted project',
                        confirmText: t('save.open_project') || 'Open project',
                        cancelText: t('common.cancel') || 'Cancel',
                        maxLength: 1024,
                    }
                );
                if (!projectLoadIsCurrent()) return;
                if (!_pw) { return; }
                try {
                    rawData = await window.AlloModules.AlloCrypto.decryptJSON(rawData, _pw);
                    if (!projectLoadIsCurrent()) return;
                } catch (_e) {
                    if (!projectLoadIsCurrent()) return;
                    if (addToast) addToast(t('save.decrypt_failed') || 'Wrong password, or the file is corrupt.', 'error');
                    return;
                }
            }
            if (!projectLoadIsCurrent()) return;
            const lifecycleHistory = Array.isArray(rawData) ? rawData : rawData?.history;
            if (!Array.isArray(lifecycleHistory)) throw new Error('Project JSON does not contain a history array.');
            if (!_projectLoadOperations.startLifecycle(projectLoadOwner, { rawData, history: lifecycleHistory })) return;
            if (rawData.progressLog && Array.isArray(rawData.progressLog)) {
                setStudentProgressLog(rawData.progressLog);
            }
            if (rawData.studentProgressSummary && typeof rawData.studentProgressSummary === 'object') {
                try {
                    window.__alloflowStudentProgressSummary = rawData.studentProgressSummary;
                    try { localStorage.setItem('alloflow_student_progress_summary', JSON.stringify(rawData.studentProgressSummary)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-student-progress-summary-restored'));
                } catch (e) { warnLog && warnLog('Student progress summary restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // Guided-tour resume: a teacher who saved mid-tutorial drops back in at their
            // step (Canvas has no cross-session storage, so progress rides the project file).
            // Hardened restore: (1) restore selectedIds UNCONDITIONALLY — null is the valid
            // "all steps" default that Array.isArray would wrongly skip, leaving the restored
            // step index applied against whatever tool set the session already had (lands the
            // teacher on the wrong tool / an out-of-range step); (2) clamp the step into range;
            // (3) gate on the saved schema version so a newer file doesn't restore garbage.
            const _gtp = rawData.guidedTourProgress;
            if (_gtp && typeof _gtp.guidedStep === 'number') {
                if (_gtp.version == null || _gtp.version === 1) {
                    const _validIds = Array.isArray(deps.guidedStepIds) ? deps.guidedStepIds : [];
                    const _validSet = new Set(_validIds);
                    const _cleanIds = (value) => Array.isArray(value) ? Array.from(new Set(value.filter(id => _validSet.has(id)))) : [];
                    const _sel = Array.isArray(_gtp.selectedIds) ? _cleanIds(_gtp.selectedIds) : null;
                    if (deps.setGuidedSelectedIds) deps.setGuidedSelectedIds(_sel);
                    const _activeIds = _sel ? _validIds.filter(id => id === 'source-input' || _sel.includes(id)) : _validIds;
                    const _step = Math.max(0, Math.min(_gtp.guidedStep, Math.max(0, _activeIds.length - 1)));
                    if (deps.setGuidedStep) deps.setGuidedStep(_step);
                    if (deps.setGuidedCompletedIds) deps.setGuidedCompletedIds(_cleanIds(_gtp.completedSteps));
                    if (deps.setGuidedSkippedIds) deps.setGuidedSkippedIds(_cleanIds(_gtp.skippedSteps));
                    if (deps.setGuidedCreatedHistoryIds) deps.setGuidedCreatedHistoryIds(Array.isArray(_gtp.createdHistoryIds) ? Array.from(new Set(_gtp.createdHistoryIds.filter(id => typeof id === 'string' && id))) : []);
                    if (deps.setGuidedDeliveryEvidence) {
                        const _evidenceKeys = ['directionsSaved', 'exportCreated', 'shareCreated', 'liveStarted', 'studentPreviewed'];
                        const _rawEvidence = _gtp.deliveryEvidence && typeof _gtp.deliveryEvidence === 'object' ? _gtp.deliveryEvidence : {};
                        deps.setGuidedDeliveryEvidence(_evidenceKeys.reduce((result, key) => { if (_rawEvidence[key] === true) result[key] = true; return result; }, {}));
                    }
                    if (deps.setGuidedMode) deps.setGuidedMode(true);
                    if (addToast) addToast(t('guided.resumed') || 'Resumed your guided tutorial.', 'success');
                } else if (addToast) {
                    addToast(t('guided.resume_version_skip') || 'This saved tutorial progress is from a newer version and was not restored.', 'info');
                }
            }
            let loadedHistory = [];
            let isStudentSave = false;
            if (Array.isArray(rawData)) {
                loadedHistory = rawData;
            } else if (rawData.history && Array.isArray(rawData.history)) {
                loadedHistory = rawData.history;
                if (rawData.mode === 'student') {
                    isStudentSave = true;
                } else if (rawData.mode === 'independent') {
                    setIsIndependentMode(true);
                    setIsTeacherMode(true);
                    setIsParentMode(false);
                    setIsStudentLinkMode(false);
                    addToast(t('toasts.independent_project_loaded'), "success");
                }
                if (rawData.settings) {
                    setStudentProjectSettings({
                        hideStudentAiFeatures: rawData.settings.hideStudentAiFeatures ?? false,
                        allowDictation: rawData.settings.allowDictation ?? true,
                        allowSocraticTutor: rawData.settings.allowSocraticTutor ?? true,
                        allowFreeResponse: rawData.settings.allowFreeResponse ?? true,
                        allowPersonaFreeResponse: rawData.settings.allowPersonaFreeResponse ?? true,
                        adventureMinXP: rawData.settings.adventureMinXP ?? 0,
                        adventureUnlockXP: rawData.settings.adventureUnlockXP ?? 0,
                        nickname: rawData.settings.nickname || '',
                        baseXP: rawData.settings.baseXP ?? 100,
                        adventurePermissions: {
                            allowCustomInstructions: rawData.settings.adventurePermissions?.allowCustomInstructions ?? false,
                            allowModeSwitch: rawData.settings.adventurePermissions?.allowModeSwitch ?? false,
                            allowDifficultySwitch: rawData.settings.adventurePermissions?.allowDifficultySwitch ?? true,
                            allowLanguageSwitch: rawData.settings.adventurePermissions?.allowLanguageSwitch ?? true,
                            allowVisualsToggle: rawData.settings.adventurePermissions?.allowVisualsToggle ?? true,
                            lockAllSettings: rawData.settings.adventurePermissions?.lockAllSettings ?? false
                        }
                    });
                    if (rawData.settings.defaultAdventureConfig) {
                        const defs = rawData.settings.defaultAdventureConfig;
                        if (defs.difficulty) setAdventureDifficulty(defs.difficulty);
                        if (defs.mode) setAdventureInputMode(defs.mode);
                        if (defs.language) setAdventureLanguageMode(defs.language);
                        if (defs.instructions) setAdventureCustomInstructions(defs.instructions);
                        if (defs.chanceMode !== undefined) setAdventureChanceMode(!!defs.chanceMode);
                        if (defs.freeResponse !== undefined) setAdventureFreeResponseEnabled(!!defs.freeResponse);
                        if (defs.consistentCharacters !== undefined) setAdventureConsistentCharacters(!!defs.consistentCharacters);
                        if (defs.storyMode !== undefined) setIsAdventureStoryMode(!!defs.storyMode);
                        if (defs.socialStoryMode !== undefined) setIsSocialStoryMode(!!defs.socialStoryMode);
                        if (defs.socialStoryFocus !== undefined) setSocialStoryFocus(defs.socialStoryFocus || '');
                        if (defs.artStyle) setAdventureArtStyle(defs.artStyle);
                        if (defs.customArtStyle !== undefined) setAdventureCustomArtStyle(defs.customArtStyle || '');
                        if (defs.lowQualityVisuals !== undefined) setUseLowQualityVisuals(!!defs.lowQualityVisuals);
                        if (defs.enableFactionResources !== undefined) setEnableFactionResources(!!defs.enableFactionResources);
                        if (defs.factionResourceMode) setFactionResourceMode(defs.factionResourceMode);
                    }
                } else {
                    setStudentProjectSettings({
                        hideStudentAiFeatures: false,
                        allowDictation: true,
                        allowSocraticTutor: true,
                        allowFreeResponse: true,
                        allowPersonaFreeResponse: true,
                        adventureMinXP: 0,
                        adventureUnlockXP: 0,
                        nickname: '',
                        baseXP: 100,
                        adventurePermissions: {
                            allowCustomInstructions: false,
                            allowModeSwitch: false,
                            allowDifficultySwitch: true,
                            allowLanguageSwitch: true,
                            allowVisualsToggle: true,
                            lockAllSettings: false
                        }
                    });
                }
                const savedNickname = rawData.studentNickname || rawData.settings?.nickname;
                if (savedNickname) {
                    setStudentNickname(savedNickname);
                    setStudentProjectSettings(prev => ({ ...prev, nickname: savedNickname }));
                    addToast(`Welcome back, ${savedNickname}!`, "success");
                }
                if (isStudentSave) {
                     if (rawData.adventureSnapshot && rawData.adventureSnapshot.turnCount > 0) {
                         const snapshot = rawData.adventureSnapshot;
                         setAdventureState(prev => ({
                             ...prev,
                             xp: snapshot.xp || 0,
                             gold: snapshot.gold || 0,
                             energy: snapshot.energy || 100,
                             level: snapshot.level || 1,
                             xpToNextLevel: snapshot.xpToNextLevel || 100,
                             inventory: snapshot.inventory || [],
                             narrativeLedger: snapshot.narrativeLedger || '',
                              assistedKnowledge: Array.isArray(snapshot.assistedKnowledge) ? snapshot.assistedKnowledge.filter(Boolean).slice(-12) : [],
                             stats: snapshot.stats || { successes: 0, failures: 0, decisions: 0, conceptsFound: [] },
                             currentScene: snapshot.currentScene,
                             history: snapshot.history || [],
                             turnCount: snapshot.turnCount || 0,
                             climax: snapshot.climax || { isActive: false, archetype: 'Auto', masteryScore: 0, attempts: 0 },
                             debateMomentum: snapshot.debateMomentum ?? 50,
                             missionReportDismissed: snapshot.missionReportDismissed || false,
                             isGameOver: false,
                             isLoading: false
                         }));
                         setHasSavedAdventure(true);
                         addToast(t('student.adventure_restored'), "success");
                     }
                     if (rawData.escapeRoomStats && rawData.escapeRoomStats.xpEarned > 0) {
                         addToast(t('escape_room.stats_restored', { xp: rawData.escapeRoomStats.xpEarned }), "info");
                     }
                     if (rawData.gameCompletions) setGameCompletions(rawData.gameCompletions);
                     if (rawData.labelChallengeResults) setLabelChallengeResults(rawData.labelChallengeResults);
                     if (rawData.socraticChatHistory?.messages) setSocraticMessages(rawData.socraticChatHistory.messages);
                     if (rawData.conceptMastery && rawData.conceptMastery.attempts) {
                         // Student re-loading their own work: restore device-local mastery.
                         if (typeof setConceptMasteryLocal === 'function') setConceptMasteryLocal({ attempts: rawData.conceptMastery.attempts });
                         // Teacher importing a submitted file: bank it (keyed by the
                         // student's uid when present) so the retention dashboard can
                         // read mastery from files instead of any cloud store.
                         if (typeof bankImportedConceptMastery === 'function') bankImportedConceptMastery(rawData.conceptMastery);
                     }
                     if (rawData.fluencyAssessments) setFluencyAssessments(rawData.fluencyAssessments);
                     if (rawData.flashcardEngagement) setFlashcardEngagement(rawData.flashcardEngagement);
                     if (rawData.timeOnTask) setTimeOnTask(rawData.timeOnTask);
                     if (rawData.globalPoints !== undefined) setGlobalPoints(rawData.globalPoints);
                     if (rawData.pointHistory) setPointHistory(rawData.pointHistory);
                     if (rawData.completedActivities) {
                          try {
                              setCompletedActivities(new Map(rawData.completedActivities));
                          } catch(e) { warnLog("Failed to restore completed activities", _projectDiagnosticErrorSummary(e)); }
                     }
                }
                // Word Sounds state restores for BOTH save modes (was inside the
                // isStudentSave guard, which silently dropped it from teacher-mode
                // projects — the common K-2 RTI setup where the interventionist
                // runs Word Sounds on the teacher device; the teacher save now
                // persists it too, see phase_k_helpers saveType === 'teacher').
                if (rawData.wordSoundsState) {
                    if (rawData.wordSoundsState.history) setWordSoundsHistory(rawData.wordSoundsState.history);
                    if (rawData.wordSoundsState.families) setWordSoundsFamilies(rawData.wordSoundsState.families);
                    if (rawData.wordSoundsState.audioLibrary) setWordSoundsAudioLibrary(rawData.wordSoundsState.audioLibrary);
                    if (rawData.wordSoundsState.badges) setWordSoundsBadges(rawData.wordSoundsState.badges);
                    if (rawData.wordSoundsState.phonemeMastery) setPhonemeMastery(rawData.wordSoundsState.phonemeMastery);
                    if (rawData.wordSoundsState.dailyProgress) setWordSoundsDailyProgress(rawData.wordSoundsState.dailyProgress);
                    if (rawData.wordSoundsState.confusionPatterns) setWordSoundsConfusionPatterns(rawData.wordSoundsState.confusionPatterns);
                }
                if (rawData.probeHistory) setProbeHistory(rawData.probeHistory);
                if (rawData.interventionLogs) setInterventionLogs(rawData.interventionLogs);
                if (rawData.surveyResponses) setSurveyResponses(rawData.surveyResponses);
                if (rawData.fidelityLog) setFidelityLog(rawData.fidelityLog);
                if (rawData.sessionCounter !== undefined) setSessionCounter(rawData.sessionCounter);
                if (rawData.externalCBMScores) setExternalCBMScores(rawData.externalCBMScores);
                if (rawData.settings?.researchMode) setResearchMode(rawData.settings.researchMode);
            }
            // SEL Hub engagement (streak, per-tool usage). The hub itself
            // listens for the custom event so a load mid-session refreshes
            // its UI without remount.
            if (rawData.selEngagement && typeof rawData.selEngagement === 'object') {
                try {
                    window.__alloflowSelEngagement = rawData.selEngagement;
                    if (rawData.selEngagement.streak) {
                        try { localStorage.setItem('alloflow_sel_streak', JSON.stringify(rawData.selEngagement.streak)); } catch (e) {}
                    }
                    if (rawData.selEngagement.toolUsage) {
                        try { localStorage.setItem('alloflow_sel_tool_usage', JSON.stringify(rawData.selEngagement.toolUsage)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-sel-engagement-restored'));
                } catch (e) { warnLog && warnLog('SEL engagement restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // BirdLab persistent state (life list, badges). Same pattern as
            // SEL engagement: write to window slot, mirror to localStorage,
            // dispatch event for live re-hydration of an open BirdLab tool.
            if (rawData.birdLab && typeof rawData.birdLab === 'object') {
                try {
                    window.__alloflowBirdLab = rawData.birdLab;
                    if (rawData.birdLab.lifeList) {
                        try { localStorage.setItem('birdLab.lifeList.v1', JSON.stringify(rawData.birdLab.lifeList)); } catch (e) {}
                    }
                    if (rawData.birdLab.badges) {
                        try { localStorage.setItem('birdLab.badges.v1', JSON.stringify(rawData.birdLab.badges)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-birdlab-restored'));
                } catch (e) { warnLog && warnLog('BirdLab restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // PetsLab persistent state (module visits, badges, decoder mastery).
            // Same Canvas-survival flow as SEL engagement and BirdLab above.
            if (rawData.petsLab && typeof rawData.petsLab === 'object') {
                try {
                    window.__alloflowPetsLab = rawData.petsLab;
                    try { localStorage.setItem('petsLab.state.v1', JSON.stringify(rawData.petsLab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-petslab-restored'));
                } catch (e) { warnLog && warnLog('PetsLab restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // OpticsLab AP-quiz concept mastery. Mirrors the rest of the
            // STEM Lab tool persistence chain.
            if (rawData.opticsLab && typeof rawData.opticsLab === 'object') {
                try {
                    window.__alloflowOpticsLab = rawData.opticsLab;
                    try { localStorage.setItem('opticsLab.state.v1', JSON.stringify(rawData.opticsLab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-opticslab-restored'));
                } catch (e) { warnLog && warnLog('OpticsLab restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // StatsLab AP-quiz concept mastery (AP Psych / AP Bio).
            if (rawData.statsLab && typeof rawData.statsLab === 'object') {
                try {
                    window.__alloflowStatsLab = rawData.statsLab;
                    try { localStorage.setItem('statsLab.state.v1', JSON.stringify(rawData.statsLab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-statslab-restored'));
                } catch (e) { warnLog && warnLog('StatsLab restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // WeldLab welder's defect catalog (cross-sample log) + badges.
            if (rawData.weldLab && typeof rawData.weldLab === 'object') {
                try {
                    window.__alloflowWeldLab = rawData.weldLab;
                    if (rawData.weldLab.defectCatalog) {
                        try { localStorage.setItem('weldLab.defectCatalog.v1', JSON.stringify(rawData.weldLab.defectCatalog)); } catch (e) {}
                    }
                    if (rawData.weldLab.badges) {
                        try { localStorage.setItem('weldLab.badges.v1', JSON.stringify(rawData.weldLab.badges)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-weldlab-restored'));
                } catch (e) { warnLog && warnLog('WeldLab restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // RenewablesLab energy-source mastery (badges + module visits + quiz mastery).
            if (rawData.renewablesLab && typeof rawData.renewablesLab === 'object') {
                try {
                    window.__alloflowRenewablesLab = rawData.renewablesLab;
                    try { localStorage.setItem('renewablesLab.state.v1', JSON.stringify(rawData.renewablesLab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-renewableslab-restored'));
                } catch (e) { warnLog && warnLog('RenewablesLab restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // FirstResponse Lab responder mastery (consent + module visits + faMastery).
            if (rawData.firstResponse && typeof rawData.firstResponse === 'object') {
                try {
                    window.__alloflowFirstResponse = rawData.firstResponse;
                    try { localStorage.setItem('firstResponse.state.v1', JSON.stringify(rawData.firstResponse)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-firstresponse-restored'));
                } catch (e) { warnLog && warnLog('FirstResponse restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // ThrowLab Pitch Locker (cross-session strike log per pitch type).
            if (rawData.throwlab && typeof rawData.throwlab === 'object') {
                try {
                    window.__alloflowThrowLab = rawData.throwlab;
                    try { localStorage.setItem('throwlab.state.v1', JSON.stringify(rawData.throwlab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-throwlab-restored'));
                } catch (e) { warnLog && warnLog('ThrowLab restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // PlayLab Play Catalog (cross-session log of plays/concepts run successfully).
            if (rawData.playlab && typeof rawData.playlab === 'object') {
                try {
                    window.__alloflowPlayLab = rawData.playlab;
                    try { localStorage.setItem('playlab.state.v1', JSON.stringify(rawData.playlab)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-playlab-restored'));
                } catch (e) { warnLog && warnLog('PlayLab restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // Assessment Literacy junk-science mastery (per-scenario first-correct).
            if (rawData.assessmentLiteracy && typeof rawData.assessmentLiteracy === 'object') {
                try {
                    window.__alloflowAssessmentLiteracy = rawData.assessmentLiteracy;
                    try { localStorage.setItem('assessmentLiteracy.state.v1', JSON.stringify(rawData.assessmentLiteracy)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-assessmentliteracy-restored'));
                } catch (e) { warnLog && warnLog('AssessmentLiteracy restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // RoadReady Permit Mastery (per-question first-correct log + per-category stats + parking best).
            if (rawData.roadReady && typeof rawData.roadReady === 'object') {
                try {
                    window.__alloflowRoadReady = rawData.roadReady;
                    if (rawData.roadReady.permitMastery) {
                        try { localStorage.setItem('roadReady.permitMastery.v1', JSON.stringify(rawData.roadReady.permitMastery)); } catch (e) {}
                    }
                    if (rawData.roadReady.permitStats) {
                        try { localStorage.setItem('roadReady.permitStats.v1', JSON.stringify(rawData.roadReady.permitStats)); } catch (e) {}
                    }
                    if (rawData.roadReady.parkingBest) {
                        try { localStorage.setItem('roadReady.parkingBest.v1', JSON.stringify(rawData.roadReady.parkingBest)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-roadready-restored'));
                } catch (e) { warnLog && warnLog('RoadReady restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // SEL Hub teacher-authored Stations (custom curated tool bundles
            // with quests). Mirror to window slot AND localStorage, then fire
            // a custom event so an open SEL Hub re-hydrates its savedStations
            // state from the window slot without remount.
            if (rawData.selStations && (Array.isArray(rawData.selStations) || typeof rawData.selStations === 'object')) {
                try {
                    window.__alloflowSelStations = rawData.selStations;
                    if (Array.isArray(rawData.selStations)) {
                        try { localStorage.setItem('alloflow_sel_stations', JSON.stringify(rawData.selStations)); } catch (e) {}
                    }
                    window.dispatchEvent(new CustomEvent('alloflow-sel-stations-restored'));
                } catch (e) { warnLog && warnLog('SEL stations restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // SEL Hub per-station quest progress (xpThreshold / timeSpent /
            // freeResponse / manualComplete tracking). Same restore flow.
            if (rawData.selProgress && typeof rawData.selProgress === 'object') {
                try {
                    window.__alloflowSelProgress = rawData.selProgress;
                    try { localStorage.setItem('alloflow_sel_station_progress', JSON.stringify(rawData.selProgress)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-sel-progress-restored'));
                } catch (e) { warnLog && warnLog('SEL progress restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // SEL Hub per-tool persistent state (Voice Detective confusion
            // matrix, Journal entries, etc.). The window slot is keyed by
            // toolId; individual tools listen for the custom event and pull
            // their own slice via window.SelToolDataManager.get(toolId).
            if (rawData.selToolData && typeof rawData.selToolData === 'object') {
                try {
                    window.__alloflowSelToolData = rawData.selToolData;
                    // Also mirror each tool's per-tool localStorage key so
                    // tools that read directly from localStorage on mount
                    // (instead of via the manager) pick up the restore.
                    Object.keys(rawData.selToolData || {}).forEach(function (toolId) {
                        try {
                            var slot = rawData.selToolData[toolId];
                            if (slot && typeof slot === 'object' && slot._lsKey && typeof slot._lsKey === 'string') {
                                localStorage.setItem(slot._lsKey, JSON.stringify(slot._lsValue !== undefined ? slot._lsValue : slot));
                            }
                        } catch (e) {}
                    });
                    window.dispatchEvent(new CustomEvent('alloflow-sel-tooldata-restored'));
                } catch (e) { warnLog && warnLog('SEL tool data restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            if (Array.isArray(rawData.selSnapshots)) {
                try {
                    window.__alloflowSelSnapshots = rawData.selSnapshots;
                    try { localStorage.setItem('alloflow_sel_snapshots', JSON.stringify(rawData.selSnapshots)); } catch (e) {}
                    window.dispatchEvent(new CustomEvent('alloflow-sel-snapshots-restored'));
                } catch (e) { warnLog && warnLog('SEL snapshots restore failed:', _projectDiagnosticErrorSummary(e)); }
            }
            // Student-authored permanent products (SEL Share Packets and future
            // module exports). AlloHaven renders these read-only, so clear the
            // slot on older files instead of showing stale artifacts from a
            // previous project.
            try {
                const restoredStudentArtifacts = Array.isArray(rawData.studentArtifacts) ? rawData.studentArtifacts : [];
                window.__alloflowStudentArtifacts = restoredStudentArtifacts;
                try { localStorage.setItem('alloflow_student_artifacts', JSON.stringify(restoredStudentArtifacts)); } catch (e) {}
                window.dispatchEvent(new CustomEvent('alloflow-student-artifacts-restored'));
            } catch (e) { warnLog && warnLog('Student artifacts restore failed:', _projectDiagnosticErrorSummary(e)); }
            // Rehydrate sticker overlays. Stickers are saved into the
            // project JSON by phase_k_helpers.executeSaveFile so a teacher's
            // feedback or a student's marks survive reload. Falls back to
            // empty array if the loaded file pre-dates the stickers field.
            if (typeof setStickers === 'function') {
                setStickers(Array.isArray(rawData.stickers) ? rawData.stickers : []);
            }
            if (Array.isArray(loadedHistory)) {
                const hydratedHistory = hydrateHistory(loadedHistory);
                setHistory(hydratedHistory);
                // Restore only after the loaded resource list is known. The
                // host validates the draft envelope against this exact history,
                // sanitizes imported HTML, and clears any previous-project draft.
                if (typeof deps.restoreBuilderDraft === 'function') {
                    await deps.restoreBuilderDraft(rawData && rawData.builderDraft, hydratedHistory, {
                        signal: projectLoadOwner.signal,
                        isCurrent: projectLoadIsCurrent,
                    });
                }
                if (!projectLoadIsCurrent()) return;
                if (isStudentSave) {
                    setIsStudentLinkMode(true);
                    setIsTeacherMode(false);
                    setIsFullscreen(true);
                    setLeftWidth(0);
                    if (!rawData.studentNickname) addToast(t('toasts.loaded_student_view'), "info");
                } else {
                     addToast(t('toasts.project_loaded'), "success");
                }
                if (loadedHistory.length > 0) {
                    const lastItem = loadedHistory[loadedHistory.length - 1];
                    setGeneratedContent({ type: lastItem.type, data: lastItem.data, id: lastItem.id });
                    setActiveView(lastItem.type);
                    setIsMapLocked(false);
                } else {
                    setGeneratedContent(null);
                    setActiveView('input');
                }
                projectLoadSucceeded = true;
            } else {
                addToast(t('errors.project_file_invalid') || t('toasts.invalid_project_file') || 'This project file is not valid.', 'error');

            }
        } catch (err) {
            if (!projectLoadIsCurrent()) return;
            warnLog("Failed to parse project file", _projectDiagnosticErrorSummary(err));
            addToast(t('errors.project_file_load_failed') || t('toasts.project_load_failed') || 'The project file could not be loaded.', 'error');

        } finally {
            finishCurrentProjectLoad(projectLoadSucceeded);
        }
    };
    reader.onerror = () => {
        if (!projectLoadIsCurrent()) return;
        if (warnLog) warnLog('Failed to read project file', _projectDiagnosticErrorSummary(reader.error || new Error('FileReader failed')));
        if (addToast) addToast(t('errors.project_file_load_failed') || t('toasts.project_load_failed') || 'The project file could not be loaded.', 'error');
        finishCurrentProjectLoad(false);
    };
    reader.onabort = () => {
        if (projectLoadIsCurrent()) finishCurrentProjectLoad(false);
    };
    try {
        reader.readAsText(file);
    } catch (err) {
        if (projectLoadIsCurrent()) {
            if (warnLog) warnLog('Failed to read project file', _projectDiagnosticErrorSummary(err));
            if (addToast) addToast(t('errors.project_file_load_failed') || t('toasts.project_load_failed') || 'The project file could not be loaded.', 'error');
            finishCurrentProjectLoad(false);
        }
    }
    return projectLoadOwner;
};

const detectClimaxArchetype = async (text, instructions, deps) => {
  const { callGemini, warnLog } = deps;
  try { if (window._DEBUG_MISC_HANDLERS) console.log("[MiscHandlers] detectClimaxArchetype fired"); } catch(_) {}
    try {
        const prompt = `
            Analyze the following educational content and categorize it into one of 4 Dramatic Climax Archetypes for a game.
            Source Text: "${text.substring(0, 1500)}..."
            ${instructions ? `Custom Instructions: ${instructions}` : ''}
            Archetypes:
            1. Antagonist: A specific villain, rival, or entity opposing the player (e.g. History wars, Biography of a leader, specific debates).
            2. Catastrophe: A natural disaster, system failure, or survival situation (e.g. Volcanoes, Climate Change, Engineering failure).
            3. Masterpiece: Creating art, building a structure, or solving a complex proof (e.g. Poetry, Geometry, Architecture).
            4. Discovery: Uncovering a secret, exploring the unknown, or scientific research (e.g. Space, Deep Sea, Archeology).
            Return ONLY the archetype name (Antagonist, Catastrophe, Masterpiece, or Discovery).
        `;
        const result = await callGemini(prompt);
        const clean = result.trim().replace(/['"]/g, '');
        if (['Antagonist', 'Catastrophe', 'Masterpiece', 'Discovery'].includes(clean)) {
            return clean;
        }
        if (clean.includes('Antagonist')) return 'Antagonist';
        if (clean.includes('Catastrophe')) return 'Catastrophe';
        if (clean.includes('Masterpiece')) return 'Masterpiece';
        if (clean.includes('Discovery')) return 'Discovery';
        return 'Catastrophe';
    } catch (e) {
        warnLog("Archetype detection failed", _miscDiagnosticErrorSummary(e));
        return 'Catastrophe';
    }
};

window.AlloModules = window.AlloModules || {};
window.AlloModules.MiscHandlers = { runAutoFixLoop,
  handleFileUpload,
  handleLoadProject,
  cancelProjectLoad,
  cancelFileIntakeOperations,
  detectClimaxArchetype,
};
// The script loader tracks this file as `MiscHandlersModule`, while legacy
// call sites use `MiscHandlers`. Register both names to the same object so a
// successful script execution is not misreported as a failed module load.
window.AlloModules.MiscHandlersModule = window.AlloModules.MiscHandlers;


// PDF auto-continue remediation loop — extracted to MiscHandlers (2026-07-20).
// Every host binding arrives via deps; the host wrapper is contract-gated.
async function runAutoFixLoop(maxRounds, deps) {
  const {
    pdfAutoContinueAbortCtrlRef, pdfAutoContinueAbortRef, pdfFixResultRef, pdfHtmlRevisionRef, setPdfAutoContinueRunning, setPdfFixLoading, setPdfFixResult, setPdfFixStep, pdfFixLoading, pdfTargetScore, pdfAutoFixPasses, autoFixAxeViolations, aiFixChunked, waitForGeminiCalm, runAxeAudit, runEqualAccessAudit, deriveVerificationState, createVerificationHtmlBinding, applyVerificationHtmlBinding, isLiveVerificationHtmlBound, enforceVerificationHtmlBinding, formatVerificationReason, auditOutputAccessibility, recomputeIssueResolution, recomputeContentFidelity, _docPipeline, sanitizeStyleForWCAG, attachVerificationHtmlProof, saveProjectToFile, addToast, pdfAutoSaveProject, t, warnLog,
  } = deps;

  // Some focused tests load only this function body. Keep a local fail-safe so
  // redaction remains effective even when the module-level helper is absent.
  const _safeDiagnosticError = typeof _miscDiagnosticErrorSummary === 'function'
    ? _miscDiagnosticErrorSummary
    : (error) => {
        const name = String(error && error.name || 'Error').replace(/[^a-z0-9_.-]/gi, '').slice(0, 48) || 'Error';
        const code = error && (error.code != null ? error.code : error.status);
        return name + (code == null ? '' : ' code=' + String(code).replace(/[^a-z0-9_.-]/gi, '').slice(0, 48));
      };

    // Re-entry guard (sweep 2026-06-11 [5]): a second concurrent loop's
    // rounds would interleave with the first and its finally would clobber
    // the first loop's flags.
    if (pdfAutoContinueAbortCtrlRef.current) { addToast(t('toasts.auto_continue_already_running') || 'Auto-continue is already running — use Stop first if you want to restart.', 'info'); return; }
    pdfAutoContinueAbortRef.current = false;
    const _abortCtrl = new AbortController();
    pdfAutoContinueAbortCtrlRef.current = _abortCtrl;
    // M11 (2026-07-13): save/restore the shared slot like the per-file controller does.
    // Batch + auto-continue overlap is explicitly supported; overwriting without saving
    // left the batch's per-call aborts dead for its remaining files once this loop
    // finished (the slot was nulled, never restored).
    const _prevAbortSlot = (typeof window !== 'undefined') ? window.__alloPdfAbortSignal : null;
    if (typeof window !== 'undefined') window.__alloPdfAbortSignal = _abortCtrl.signal;
    // Run-generation guard (acl-1, 2026-06-21): capture the gen at entry. The watchdog fire() bumps
    // window.__alloPdfRunGen when it invalidates a stalled run; if a NEW run then starts, this loop's
    // late rounds must NOT write stale results over the fresh state. fixAndVerifyPdf already has this
    // guard — runAutoFixLoop did not, so a post-watchdog round could stomp a teacher's next document.
    const _myRunGen = (typeof window !== 'undefined') ? (window.__alloPdfRunGen || 0) : 0;
    const _genStale = () => (typeof window !== 'undefined') && ((window.__alloPdfRunGen || 0) !== _myRunGen);
    // Shared stop flags are intentionally reset by a replacement run, so they cannot
    // prove that this async continuation still owns the UI. Publication requires both
    // the exact controller slot and the captured generation.
    const _ownsRunSlot = () => pdfAutoContinueAbortCtrlRef.current === _abortCtrl;
    const _canPublish = () => _ownsRunSlot() && !_genStale();
    const _canContinue = () => _canPublish()
      && !pdfAutoContinueAbortRef.current
      && !(_abortCtrl.signal && _abortCtrl.signal.aborted);
    const _setStepIfOwned = (step) => { if (_canPublish()) setPdfFixStep(step); };
    const _toastIfOwned = (...args) => {
      if (_canPublish() && typeof addToast === 'function') addToast(...args);
    };
    if (_canPublish()) setPdfAutoContinueRunning(true);
    let cur = pdfFixResultRef.current;
    const _aiIssuesOf = (c) => (c && c.verificationAudit && Array.isArray(c.verificationAudit.issues)) ? c.verificationAudit.issues : [];
    const _plainTextOf = (html) => { try { const d = new DOMParser().parseFromString(html || '', 'text/html'); return (d.body && d.body.textContent || '').trim(); } catch (_) { return null; } };
    const _isCanonicalComplete = (c) => !!(c && c.verificationState === 'complete' && c.afterScoreVerified === true && !c.requiresManualReview && isLiveVerificationHtmlBound(c, c.accessibleHtml));
    try {
      let lastViolations = Infinity;
      let lastScore = -1;
      let lastDet = -1;
      let lastIssues = Infinity;
      let stagnantRounds = 0;
      for (let round = 0; round < maxRounds; round++) {
        if (!_canContinue()) break;
        if (!cur || !cur.accessibleHtml) break;
        const _roundHtmlRevision = pdfHtmlRevisionRef.current;
        // A high score may stop accessibility work, but it is celebratory only
        // after the final review gate below confirms no expert/fidelity concern.
        if ((cur.afterScore || 0) >= pdfTargetScore && _isCanonicalComplete(cur)) break;
        const _vio = (cur.axeAudit && typeof cur.axeAudit.totalViolations === 'number') ? cur.axeAudit.totalViolations : 0;
        const _aiIssues = _aiIssuesOf(cur);
        // Sweep 2026-06-11 [0]: axe-clean used to END the loop even below
        // target — the AI-rubric half of the score had NO fixer. Now an
        // axe-clean round feeds the AI-flagged issues to aiFixChunked
        // (mirroring fixAndVerifyPdf's internal pass loop).
        // Finding 7 (ChatGPT review 2026-07-10): Equal Access GOVERNS the headline (min of the two
        // engines) but its CONFIRMED failures didn't participate in the stop condition — the loop
        // could declare itself done (axe clean + AI clean) while EA failures still held the score
        // below target. EA-clean now joins the stop gate WHEN EA ran (an unavailable EA must not
        // block — that state is already disclosed as verification-incomplete elsewhere), and the
        // confirmed failures feed the next round's fix instructions below. Bounded: EA fails flow
        // into _det = min(axe, EA), so a genuinely unfixable EA rule shows no det progress and the
        // existing two-stall guard ends the loop.
        const _eaFails = (cur.secondEngineAudit && typeof cur.secondEngineAudit.failViolations === 'number') ? cur.secondEngineAudit.failViolations : 0;
        if (_vio === 0 && _aiIssues.length === 0 && _eaFails === 0 && _isCanonicalComplete(cur)) break;
        // NOISE-AWARE PROGRESS (loop fix, 2026-06-15): the blended afterScore is half AI-rubric,
        // which is run-to-run NOISY (SD ~5). Score-only progress let that noise fake a stall in the
        // axe-clean phase (and oscillate the stall-counter). Count progress ONLY from reliable
        // signals — fewer axe violations, a MEANINGFULLY higher deterministic score (±1 tolerance),
        // or fewer AI-flagged issues; the noisy blend is deliberately NOT a progress signal. Two
        // stalls still stop. _curDet = the PRIOR round's deterministic component: prefer the exact
        // value stamped last round (_detScore), else min(axe, EqualAccess) from the audit OBJECTS that
        // actually exist on a fresh fix (cur.axeAudit.score — guarded above — NOT a top-level
        // cur.axeScore, which is undefined pre-loop → would fabricate 100 and revert every genuine
        // round). Fall back to whichever engine is present, never to a fabricated 100. (review F1/F2/F3/F6/F9)
        const _curAxe = (cur.axeAudit && typeof cur.axeAudit.score === 'number') ? cur.axeAudit.score : null;
        const _curEa = (cur.secondEngineAudit && typeof cur.secondEngineAudit.score === 'number') ? cur.secondEngineAudit.score : null;
        const _curDet = (typeof cur._detScore === 'number') ? cur._detScore
          : ((_curAxe !== null) ? (_curEa !== null ? Math.min(_curAxe, _curEa) : _curAxe) : _curEa); // null when NEITHER engine scored — never a fabricated 100 (review #3)
        // det progress only when the baseline is a real number; gate the AI-issue term to the axe-CLEAN
        // branch so noisy AI enumeration in the violation branch can't reset the stall counter (review #2).
        const _progressed = _vio < lastViolations || (typeof _curDet === 'number' && _curDet > (lastDet + 1)) || (_vio === 0 && _aiIssues.length < lastIssues);
        if (!_progressed) { stagnantRounds++; if (stagnantRounds >= 2) break; }
        else stagnantRounds = 0;
        lastViolations = _vio;
        lastScore = cur.afterScore || 0;
        lastDet = _curDet;
        lastIssues = _aiIssues.length;
        if (_canPublish()) setPdfFixLoading(true);
        // Storm-aware WAIT-not-stop (2026-07-05, maintainer): never fire a round into an active
        // Canvas rate-limit storm — on the 7/5 run those calls each failed after ~150s AND extended
        // the throttle window, until the 12-min dead-man switch killed the whole loop. Waiting is not
        // stopping: nothing is skipped and no target is abandoned — the round runs at full strength
        // once the storm passes (bounded, then it proceeds regardless, only ever slower). The ticking
        // status ALSO keeps the dead-man switch (a frozen-step detector) from false-firing meanwhile.
        try {
          await waitForGeminiCalm({ maxWaitMs: 240000, shouldAbort: () => !_canContinue(), onTick: (w) => {
            if (!_canContinue()) return;
            const _ws = Math.max(1, Math.ceil((((w && w.cooldownRemainingMs) || 5000)) / 1000));
            _setStepIfOwned(t('pdf_audit.storm_wait_round', { round: round + 1, max: maxRounds, s: _ws }) || ('Canvas is rate-limiting — pausing before round ' + (round + 1) + '/' + maxRounds + ' so calls are not wasted (rechecking in ~' + _ws + 's; nothing is skipped, the run just takes longer)'));
          } });
        } catch (_) {}
        // H3 (deep dive 2026-07-09): the storm wait can hold this spot for up to 4 minutes — a Stop
        // press or watchdog invalidation DURING it used to go unnoticed until AFTER the next full
        // round had fired into the storm (and the post-round check then discarded its work anyway).
        // Re-check before firing; shouldAbort above also exits the wait itself within seconds.
        if (!_canContinue()
            || pdfHtmlRevisionRef.current !== _roundHtmlRevision) {
          cur = pdfFixResultRef.current;
          break;
        }
        const _auditOnlyRefresh = _vio === 0 && _aiIssues.length === 0 && _eaFails === 0 && !_isCanonicalComplete(cur);
        // A3 (2026-07-13): when the ONLY thing between this doc and 'complete' is the
        // Equal Access engine and that engine is environmentally unavailable (Canvas
        // CSP blocks both CDN mirrors), the refresh's full AI audit is guaranteed
        // futile — it can never yield 'complete'. Skip the spend; the state is
        // already disclosed as partial with EA unavailable.
        if (_auditOnlyRefresh) {
          const _covA3 = cur.verificationCoverage || {};
          const _eaDead = !!(_docPipeline && typeof _docPipeline.equalAccessUnavailable === 'function' && _docPipeline.equalAccessUnavailable());
          if (_eaDead && _covA3.ai === 'complete' && _covA3.axe === 'complete' && _covA3.equalAccess !== 'complete') {
            warnLog('[AutoContinue] verification refresh skipped: the Equal Access engine cannot load in this environment, so a refresh cannot reach complete.');
            break;
          }
        }
        const _acDetail = _auditOnlyRefresh
          ? 'verification refresh (no content rewrite)'
          : (_vio > 0
            ? (t(_vio === 1 ? 'pdf_audit.violation_one' : 'pdf_audit.violation_other', { count: _vio }) || (_vio + ' violation' + (_vio !== 1 ? 's' : '')))
            : (t(_aiIssues.length === 1 ? 'pdf_audit.ai_issue_one' : 'pdf_audit.ai_issue_other', { count: _aiIssues.length }) || (_aiIssues.length + ' AI-flagged issue' + (_aiIssues.length !== 1 ? 's' : ''))));
        _setStepIfOwned(t('pdf_audit.auto_continue_round', { round: round + 1, max: maxRounds, detail: _acDetail, score: cur.afterScore || 0, target: pdfTargetScore }) || ('Auto-continue round ' + (round + 1) + '/' + maxRounds + ': ' + _acDetail + ', score ' + (cur.afterScore || 0) + '/100 (target ' + pdfTargetScore + ')...'));
        let result;
        if (_vio > 0) {
          result = await autoFixAxeViolations(cur.accessibleHtml, cur.axeAudit, pdfAutoFixPasses);
        } else if (_auditOnlyRefresh) {
          // No confirmed fixable issue remains. Refresh all verification evidence
          // once without sending clean content through an empty AI rewrite.
          let _refreshAxe = null;
          try { _refreshAxe = await runAxeAudit(cur.accessibleHtml); } catch (_) {}
          result = { html: cur.accessibleHtml, axe: _refreshAxe, passes: 0, _auditOnly: true };
        } else {
          // Finding 7 (2026-07-10): EA's CONFIRMED failures join the fix instructions — previously
          // the engine that governs the headline had no voice in what the fixer was told to fix.
          const _eaLines = ((cur.secondEngineAudit && Array.isArray(cur.secondEngineAudit.fails)) ? cur.secondEngineAudit.fails : []).slice(0, 15)
            .map((f) => 'EQUAL-ACCESS-CONFIRMED: ' + String((f && (f.message || f.ruleId || f.reasonId)) || JSON.stringify(f)).slice(0, 200));
          const _instr = _aiIssues.slice(0, 25).map((i) => 'AI-FLAGGED: ' + (typeof i === 'string' ? i : (i.issue || i.description || JSON.stringify(i)))).concat(_eaLines).join('\n');
          let _fixedHtml = await aiFixChunked(cur.accessibleHtml, _instr, 'auto-continue-ai-round-' + (round + 1));
          if (!_canContinue() || pdfHtmlRevisionRef.current !== _roundHtmlRevision) {
            cur = pdfFixResultRef.current;
            break;
          }
          // CONTRAST ROUTING (loop fix, 2026-06-15): a WCAG 1.4.3 contrast issue is a CSS/style
          // problem the generic chunk rewriter rarely fixes — route it to the deterministic,
          // background-aware contrast fixer (sanitizeStyleForWCAG -> fixContrastViolations) as the
          // last word, so the axe-clean phase actually CLEARS AI-flagged contrast instead of
          // spinning on it (axe couldn't compute it here, so autoFixAxeViolations never fired).
          const _hasContrast = _aiIssues.some((i) => { const _s = (typeof i === 'string') ? i : (((i.wcag || '') + ' ' + (i.issue || i.description || ''))); return /1\.4\.3|contrast/i.test(_s); });
          if (_hasContrast) { try { const _sr = sanitizeStyleForWCAG(_fixedHtml); if (_sr && _sr.html && _sr.fixCount > 0) _fixedHtml = _sr.html; } catch (_) {} }
          const _freshAxe = await runAxeAudit(_fixedHtml);
          result = { html: _fixedHtml, axe: _freshAxe, passes: 1 };
        }
        if (!_canContinue() || pdfHtmlRevisionRef.current !== _roundHtmlRevision) {
          cur = pdfFixResultRef.current;
          break;
        }
        const reVerify = await auditOutputAccessibility(result.html);
        if (!_canContinue() || pdfHtmlRevisionRef.current !== _roundHtmlRevision) {
          cur = pdfFixResultRef.current; break;
        }
        if (!reVerify) {
          warnLog('[AutoContinue] AI re-verification returned null; preserving prior state and stopping loop.');
          _toastIfOwned(t('toasts.accessibility_verification_unavailable_auto_contin'), 'warning');
          break;
        }
        // Sweep 2026-06-11 [1]: keep afterScore's SEMANTICS stable across rounds. fixAndVerifyPdf writes
        // the weakest-layer headline min(AI content, min(axe, EqualAccess)); rounds used to overwrite it
        // with a raw single AI score — the target check then compared apples to oranges and the consensus
        // panel showed stale engine results. Recompute the SAME governing-layer score (min, NOT a mean —
        // weakest-layer-governs, 2026-06-21; this loop had been left on the old /2 mean) with fresh
        // deterministic runs each round.
        let _ea = null;
        try { _ea = runEqualAccessAudit ? await runEqualAccessAudit(result.html) : null; } catch (_) {}
        if (!_canContinue() || pdfHtmlRevisionRef.current !== _roundHtmlRevision) {
          cur = pdfFixResultRef.current; break;
        }
        // #6-full (2026-07-16): ALL round-evidence assembly — scored-audit validity gating,
        // audit-only inheritance (C6), weakest-layer score, fidelity recompute-and-merge,
        // verification snapshot + SHA binding, expert-review base separation — now happens in
        // the engine's ONE canonical reducer (finalizeRemediationRound). The host keeps only
        // loop POLICY: the noise-aware revert, gen guards, proof attachment, and toasts. The
        // reducer returns the merged candidate; a reverted round simply discards it.
        const _finalizeRound = _docPipeline && _docPipeline.finalizeRemediationRound;
        if (typeof _finalizeRound !== 'function') {
          // Module older than this host build (mismatched deploy) — stop improving rather than
          // hand-merge with drift risk; the primary fixAndVerifyPdf result stands untouched.
          warnLog('[AutoContinue] finalizeRemediationRound unavailable (engine module predates this host) — stopping the loop; the primary result stands.');
          break;
        }
        // Recompute Issue-Resolution against THIS round's fresh audit so fixed issues drop off
        // the Newly-Introduced / Remaining lists (baseline rides on cur.issueResolution).
        let _roundIR = cur.issueResolution;
        try { const _r = recomputeIssueResolution(cur.issueResolution, reVerify); if (_r) _roundIR = _r; } catch (_) {}
        let _mergedRound = null;
        try {
          _mergedRound = await _finalizeRound(cur, {
            html: result.html, aiAudit: reVerify, axeAudit: result.axe, eaAudit: _ea,
            auditOnly: !!result._auditOnly, sourceText: cur.sourceText, issueResolution: _roundIR,
            plainText: _plainTextOf(result.html), passes: result.passes || 0,
            chunkState: result.chunkState, chunkWeightedScore: result.chunkWeightedScore,
          });
          if (!_canContinue() || pdfHtmlRevisionRef.current !== _roundHtmlRevision) {
            cur = pdfFixResultRef.current;
            break;
          }
        } catch (_finErr) {
          if (_canPublish()) warnLog('[AutoContinue] round merge failed (' + _safeDiagnosticError(_finErr) + ') — preserving prior state and stopping the loop.');
          break;
        }
        const _det = _mergedRound._detScore;
        const newScore = _mergedRound.afterScore;
        // NOISE-AWARE COMMIT-OR-REVERT (loop fix, 2026-06-15): the blended score is half AI-rubric
        // (noisy), so reverting whenever newScore < prior threw away genuinely-improved rounds on a
        // mere AI wobble and stalled the loop short of target. Revert ONLY on a REAL regression: the
        // DETERMINISTIC component (axe ∧ EqualAccess — reproducible) dropped, OR the AI flagged
        // strictly MORE issues than before. A blend dip with deterministic held and no new issues is
        // noise — keep the round. (Content loss is gated INSIDE aiFixChunked, not here.)
        const _detRegressed = (_det !== null) && (typeof _curDet === 'number') && _det < (_curDet - 1);
        // Gate AI-issue count ONLY in the axe-CLEAN (AI-fix) branch — in the axe-violation branch the
        // fix is deterministic, so AI-enumeration noise must not revert a legit axe fix (review F5).
        const _moreIssues = (_vio === 0) && ((reVerify.issues ? reVerify.issues.length : 0) > _aiIssues.length);
        if (!result._auditOnly && (_detRegressed || _moreIssues)) {
          warnLog('[AutoContinue] round ' + (round + 1) + ' REAL regression (det ' + _det + ' vs ' + _curDet + ', issues ' + (reVerify.issues ? reVerify.issues.length : 0) + ' vs ' + _aiIssues.length + ') — reverting this round.');
          // Do NOT increment stagnantRounds here — the revert leaves `cur` unchanged, so the next
          // round's top-of-loop no-progress check counts this stall exactly once (avoids the old
          // double-count that abandoned the loop on a single wobble).
          continue;
        }
        // Commit: the reducer already assembled the complete next result for this round.
        cur = _mergedRound;
        if (cur.verificationHtmlBinding && !attachVerificationHtmlProof(cur, result.html)) {
          cur = enforceVerificationHtmlBinding(cur, 'verification-html-binding-unavailable');
        }
        const snapshot = cur;
        // Gen guard (acl-1): a fresh run started while this round was in flight → discard this stale
        // round's writes instead of stomping the new run's state, and stop looping.
        if (!_canContinue() || pdfHtmlRevisionRef.current !== _roundHtmlRevision) {
          cur = pdfFixResultRef.current;
          break;
        }
        // Sweep 2026-06-11 [3]: sync the ref NOW — the finally-block
        // auto-save reads pdfFixResultRef and was one render behind,
        // silently missing the last round's improvements.
        setPdfFixResult(snapshot);
        // An audit-only refresh is deliberately single-shot. Whether it recovered
        // full evidence or remained partial, the final branch gives the honest result.
        if (result._auditOnly) break;
      }
      // Terminal outcomes belong only to the exact controller and generation.
      // A replacement run resets the shared abort flag, so that flag alone cannot
      // stop stale run A from announcing over run B.
      if (!_canPublish()) return;
      const _canonicalComplete = _isCanonicalComplete(cur);
      const _expertOrFidelityReview = !!(cur && (cur.needsExpertReview || cur.fidelityLimited));
      const _humanReviewRequired = !!(cur && (!_canonicalComplete || _expertOrFidelityReview));
      if (pdfAutoContinueAbortRef.current || (_abortCtrl.signal && _abortCtrl.signal.aborted)) {
        _toastIfOwned(t('toasts.auto_continue_stopped'), 'info');
      } else if (cur && (cur.afterScore || 0) >= pdfTargetScore && _canonicalComplete && !_expertOrFidelityReview) {
        if (cur.axeAudit && cur.axeAudit.totalViolations === 0) {
          _toastIfOwned(t('toasts.all_violations_resolved_score') + (cur.afterScore || 0) + ')', 'success');
        } else {
          _toastIfOwned(t('toasts.target_score_reached') + (cur.afterScore || 0) + '/100 (target ' + pdfTargetScore + ')', 'success');
        }
      } else if (cur && _humanReviewRequired) {
        const _reviewReasons = Array.isArray(cur.verificationReasons) ? cur.verificationReasons.filter(Boolean) : [];
        const _readableReasons = _reviewReasons.map(formatVerificationReason).filter(Boolean);
        if (_expertOrFidelityReview && !_readableReasons.some((reason) => /content|fidelity/i.test(reason))) {
          _readableReasons.push('Content fidelity or another expert-review concern still needs confirmation.');
        }
        const _reviewCount = Number.isFinite(cur.verificationReviewCount) ? cur.verificationReviewCount : 0;
        const _reviewDetail = _readableReasons.length
          ? ' ' + Array.from(new Set(_readableReasons)).slice(0, 3).join(' ')
          : ' Review the verification and fidelity details before distributing this document.';
        _toastIfOwned('Human review required at score ' + (cur.afterScore == null ? 'not available' : (cur.afterScore + '/100')) + (_reviewCount > 0 ? ' (' + _reviewCount + ' review item' + (_reviewCount === 1 ? '' : 's') + ').' : '.') + _reviewDetail, 'warning');
      } else if (cur) {
        const _axeClean = cur.axeAudit && cur.axeAudit.totalViolations === 0;
        _toastIfOwned('🔁 ' + (t('toasts.below_target_stop') || 'Stopped at ') + (cur.afterScore || 0) + '/' + pdfTargetScore + (_axeClean ? (t('toasts.below_target_axe_clean') || ' — automated checks are clean; the remaining gap is AI-rubric issues that likely need a human (see Remaining Issues).') : (t('toasts.below_target_stop2') || ' — recent rounds stopped improving (the remaining issues likely need a human: see Remaining Issues). You can run Fix again to retry, or review the issues list.')), 'info');
      }
    } catch (error) {
      const _wasCancelled = pdfAutoContinueAbortRef.current
        || (_abortCtrl.signal && _abortCtrl.signal.aborted)
        || (error && error.name === 'AbortError');
      if (!_canPublish()) {
        warnLog('[AutoContinue] Stale loop rejected after a newer document/run took ownership:', _safeDiagnosticError(error));
      } else if (_wasCancelled) {
        _toastIfOwned(t('toasts.auto_continue_stopped') || 'Auto-continue stopped.', 'info');
      } else {
        warnLog('[AutoContinue] Loop failed:', _safeDiagnosticError(error));
        _toastIfOwned((t('toasts.auto_continue_failed') || 'Auto-remediation stopped after an unexpected error: ') + String((error && error.message) || error || 'unknown error'), 'error');
      }
    } finally {
      const _staleAtExit = _genStale();
      const _ownsExit = pdfAutoContinueAbortCtrlRef.current === _abortCtrl;
      // M9 (deep dive 2026-07-09): guard the UI writes — a STALE loop's exit (watchdog invalidated
      // it, teacher already started run B) used to wipe B's spinner and status line mid-run, and
      // because the 8-min watchdog effect is gated on pdfFixLoading, B silently lost its watchdog
      // too. Only the exact controller may clear run state; a vacant shared slot
      // means invalidation already revoked this continuation's ownership.
      if (!_staleAtExit && _ownsExit) {
        setPdfFixLoading(false);
        setPdfFixStep('');
      } else if (_staleAtExit) {
        warnLog('[AutoContinue] Stale loop exiting (gen bump) — leaving the fresh run\'s UI untouched.');
      }
      if (_ownsExit) {
        setPdfAutoContinueRunning(false);
        pdfAutoContinueAbortCtrlRef.current = null;
      }
      if (typeof window !== 'undefined' && window.__alloPdfAbortSignal === _abortCtrl.signal) {
        window.__alloPdfAbortSignal = _prevAbortSlot || null; // M11: hand the slot back to the overlapping origin (an aborted prev correctly aborts its own remaining calls)
      }
      // A stale loop must never save whichever document now occupies the shared refs.
      if (pdfAutoSaveProject && !_staleAtExit && _ownsExit) {
        try {
          const _saveResult = saveProjectToFile(true);
          if (_saveResult && typeof _saveResult.catch === 'function') _saveResult.catch((error) => warnLog('[AutoContinue] Autosave failed:', _safeDiagnosticError(error)));
        } catch (error) { warnLog('[AutoContinue] Autosave failed:', _safeDiagnosticError(error)); }
      }
    }
}
