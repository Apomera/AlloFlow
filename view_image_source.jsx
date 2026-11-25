// Keep the displayed picture, exported picture and accessibility description on one artifact.
// chosen: a picked symbol or photo - { imageSource, altText, altSource, altHash, imageAttribution }.
// An upload has no known credit, so any earlier credit is dropped with the old picture.
function replaceSingleImage(item, imageUrl, chosen) {
  if (!item || typeof item !== 'object') return item;
  const data = (item.data && typeof item.data === 'object') ? item.data : {};
  const originalImage = data.originalImage || {
    imageUrl: data.imageUrl || '', altText: data.altText || '', altSource: data.altSource || '',
    altHash: data.altHash || '', decorative: data.decorative === true, imageSource: data.imageSource || '',
    imageAttribution: data.imageAttribution || null, imageCreditBand: Number(data.imageCreditBand) || 0
  };
  const next = { ...data, originalImage, imageUrl, imageSource: 'author-upload',
    altText: '', altSource: '', altHash: '', decorative: false };
  delete next.imageAttribution;
  delete next.imageCreditBand;
  // imageCreditBand: the height of the credit drawn under a picked picture (an AI edit redraws it).
  if (chosen) Object.assign(next, { imageSource: chosen.imageSource || 'author-upload', altText: chosen.altText || '',
    altSource: chosen.altSource || '', altHash: chosen.altHash || '', imageAttribution: chosen.imageAttribution || null,
    imageCreditBand: Number(chosen.imageCreditBand) || 0 });
  return { ...item, data: next };
}
function restoreSingleImage(item) {
  if (!item || typeof item !== 'object') return item;
  const data = (item.data && typeof item.data === 'object') ? item.data : {};
  if (!data.originalImage) return item;
  const next = { ...data, ...data.originalImage };
  // The original's credit (or none) comes back with it, never a later picture's.
  if (!data.originalImage.imageAttribution) delete next.imageAttribution;
  if (!data.originalImage.imageCreditBand) delete next.imageCreditBand;
  delete next.originalImage;
  return { ...item, data: next };
}

// A learner never edits the teacher's annotations. The learner keeps only their own
// drawings and the labels they added; the teacher's labels, captions, replacements and
// challenge settings always come from the resource.
function _imgIsSafePanelKey(k) {
  return typeof k === 'string' && k !== '__proto__' && k !== 'constructor' && k !== 'prototype';
}
function _imgSafeImageUrl(raw) {
  if (typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  if (/^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(trimmed)) return trimmed;
  if (/^data:image\/svg\+xml/i.test(trimmed)) {
    try {
      const comma = trimmed.indexOf(',');
      if (comma < 0) return '';
      const decoded = /;base64/i.test(trimmed.slice(0, comma)) ? atob(trimmed.slice(comma + 1)) : decodeURIComponent(trimmed.slice(comma + 1));
      if (/<script\b|<foreignObject\b|<(?:iframe|object|embed|meta|base|link|animate|set)\b|<!ENTITY|&#|\bon[a-z]+\s*=|(?:xlink:)?href\s*=\s*["']?\s*(?:javascript:|data:)|javascript:|@import|expression\s*\(/i.test(decoded)) return '';
      return trimmed;
    } catch (_) { return ''; }
  }
  if (/^(?:https?:|blob:|\/|\.{1,2}\/)/i.test(trimmed)) return trimmed;
  return '';
}
function learnerOwnedAnnotations(annotations, teacher) {
  const a = (annotations && typeof annotations === 'object') ? annotations : {};
  const teacherLabels = (teacher && teacher.userLabels && typeof teacher.userLabels === 'object') ? teacher.userLabels : {};
  const srcUserLabels = (a.userLabels && typeof a.userLabels === 'object') ? a.userLabels : {};
  const userLabels = {};
  Object.keys(srcUserLabels).forEach(panel => {
    if (!_imgIsSafePanelKey(panel)) return;
    const tList = Object.prototype.hasOwnProperty.call(teacherLabels, panel) && Array.isArray(teacherLabels[panel]) ? teacherLabels[panel] : [];
    const uList = Array.isArray(srcUserLabels[panel]) ? srcUserLabels[panel] : [];
    const taken = new Set(tList.map(label => label && label.id));
    const own = uList.filter(label => label && !taken.has(label.id));
    if (own.length) userLabels[panel] = own;
  });
  return { drawings: a.drawings || {}, userLabels };
}
function learnerPanelAnnotations(teacher, learner) {
  const base = { ...(teacher && typeof teacher === 'object' ? teacher : {}) };
  const own = learner && typeof learner === 'object' ? learner : {};
  const baseLabels = (base.userLabels && typeof base.userLabels === 'object') ? base.userLabels : {};
  const ownLabels = (own.userLabels && typeof own.userLabels === 'object') ? own.userLabels : {};
  const userLabels = {};
  Object.keys(baseLabels).forEach(panel => {
    if (_imgIsSafePanelKey(panel) && Array.isArray(baseLabels[panel])) userLabels[panel] = baseLabels[panel].slice();
  });
  Object.keys(ownLabels).forEach(panel => {
    if (!_imgIsSafePanelKey(panel)) return;
    const prevList = Object.prototype.hasOwnProperty.call(userLabels, panel) && Array.isArray(userLabels[panel]) ? userLabels[panel] : [];
    const addList = Array.isArray(ownLabels[panel]) ? ownLabels[panel] : [];
    userLabels[panel] = [...prevList, ...addList];
  });
  return { ...base, userLabels, drawings: own.drawings || {} };
}

// Host "Needs AI setup" doorway for teacher AI actions; null on old hosts.
function _imageViewAiDoor(kind, t) {
  try {
    if (typeof window !== 'undefined') {
      if (window._alloQrBlocked === true || window.__alloStudentAiDisabled === true || window.__alloAiSecretsLocked === true) {
        return { disabled: true, title: (typeof t === 'function' && t('ai.setup_required')) || 'AI setup required' };
      }
      if (typeof window.__alloAiUsable === 'function' && !window.__alloAiUsable(kind || 'text')) {
        return { disabled: true, title: (typeof t === 'function' && t('ai.setup_required')) || 'AI setup required' };
      }
      if (typeof window.__alloAiSetupDoorway === 'function') return window.__alloAiSetupDoorway(kind, t);
    }
    return null;
  } catch (_) { return null; }
}
function _imageViewFnUsable(kind, fn) {
  if (typeof fn !== 'function' || fn._alloQrBlocked) return false;
  try {
    if (typeof window !== 'undefined' && (window._alloQrBlocked === true || window.__alloAiSecretsLocked === true || window.__alloStudentAiDisabled === true)) return false;
    if (typeof window !== 'undefined' && typeof window.__alloAiUsable === 'function') return !!window.__alloAiUsable(kind || 'text', fn);
  } catch (_) {}
  return true;
}
function ImageView(props) {
  var t = typeof props.t === 'function' ? props.t : () => '';
  var imageEditDoor = _imageViewAiDoor('imageEdit', t);
  const imageText = (key, fallback) => { const value = typeof t === 'function' ? t(key) : ''; return value && value !== key ? value : fallback; };
  const altFieldId = 'visual-alt-' + React.useId();
  const descriptionId = altFieldId + '-notice';
  const imageData = props.generatedContent?.data || {};
  const altTools = window.AlloModules && window.AlloModules.AltText;
  const descriptionStale = imageData.altSource === 'stale' || !!(imageData.altHash && imageData.imageUrl && typeof altTools?.hashImage === 'function' && altTools.hashImage(imageData.imageUrl) !== imageData.altHash);
  const descriptionMissing = typeof imageData.altText !== 'string' || !imageData.altText.trim();
  const descriptionNeedsAttention = imageData.decorative !== true && (descriptionMissing || descriptionStale);
  const imageDescription = imageData.decorative === true ? '' : descriptionStale
    ? imageText('visuals.description_review_alt', 'Image description needs review')
    : descriptionMissing ? imageText('visuals.description_missing_alt', 'Image description unavailable') : imageData.altText;
  var leveledTextLanguage = props.leveledTextLanguage;
  var fillInTheBlank = props.fillInTheBlank;
  var generatedContent = props.generatedContent;
  var isTeacherMode = props.isTeacherMode;
  var imageGenDoor = isTeacherMode ? _imageViewAiDoor('images', t) : null;
  var imageRefinementInput = typeof props.imageRefinementInput === 'string' ? props.imageRefinementInput : '';
  var isProcessing = props.isProcessing;
  var singleImageFileRef = props.singleImageFileRef;
  var setLabelChallengeResults = props.setLabelChallengeResults;
  var setHistory = props.setHistory;
  var setGeneratedContent = props.setGeneratedContent;
  var setImageRefinementInput = props.setImageRefinementInput;
  var handleUpdateVisualPanel = props.handleUpdateVisualPanel;
  const uploadRequestsRef = React.useRef(new Map());
  React.useEffect(() => () => {
    uploadRequestsRef.current.forEach(request => { try { request.reader.abort(); } catch (_) {} });
    uploadRequestsRef.current.clear();
  }, []);
  const [altRequest, setAltRequest] = React.useState(null);
  const altRequestRef = React.useRef(null);
  const currentImageRef = React.useRef(null);
  currentImageRef.current = { id: generatedContent?.id, imageUrl: generatedContent?.data?.imageUrl };
  const altBusy = !!altRequest && altRequest.id === generatedContent?.id && altRequest.imageUrl === generatedContent?.data?.imageUrl;
  React.useEffect(() => () => { altRequestRef.current = null; }, []);
  var handleRefinePanel = props.handleRefinePanel;
  var handleUpdateVisualLabel = props.handleUpdateVisualLabel;
  var handleSpeak = props.handleSpeak;
  var handleScoreUpdate = props.handleScoreUpdate;
  var handleRestoreImage = props.handleRestoreImage;
  var handleRefineImage = props.handleRefineImage;
  const imageRefinementComposingRef = React.useRef(false);
  React.useEffect(() => { imageRefinementComposingRef.current = false; }, [generatedContent?.id, generatedContent?._artifactInstanceId, generatedContent?.data?.imageUrl, isTeacherMode]);
  var handleDownloadImage = props.handleDownloadImage;
  var handleAnimatePanel = props.handleAnimatePanel;
  var handleRegeneratePanelFrame = props.handleRegeneratePanelFrame;
  var handleDeletePanelFrame = props.handleDeletePanelFrame;
  var handleDuplicatePanelFrame = props.handleDuplicatePanelFrame;
  var handleReorderPanelFrame = props.handleReorderPanelFrame;
  var handleSetPanelFps = props.handleSetPanelFps;
  var callGemini = props.callGemini;
  var addToast = props.addToast;
  var VisualPanelGrid = props.VisualPanelGrid;
  const updateImageResource = (updater) => {
    const id = generatedContent && generatedContent.id;
    const patch = item => item && item.id === id && item.type === 'image' ? updater(item) : item;
    if (typeof props.onUpdateResource === 'function') return props.onUpdateResource(id, patch);
    if (typeof setGeneratedContent === 'function') setGeneratedContent(patch);
    if (typeof setHistory === 'function') setHistory(items => Array.isArray(items) ? items.map(patch) : items);
  };
  // Picked Mulberry symbols and screened photos replace the picture like an
  // upload, but keep their description and carry their credit (drawn into the
  // image too, since downloads copy only the picture).
  const [findOpen, setFindOpen] = React.useState(false);
  // A populated single panel owns its picture, labels and caption just like a
  // larger plan. Prompt-only single plans still use the legacy top-level image.
  const visualPanels = generatedContent?.data?.visualPlan?.panels;
  const usesVisualPanelGrid = Array.isArray(visualPanels) && (visualPanels.length > 1 ||
    (visualPanels.length === 1 && typeof visualPanels[0]?.imageUrl === 'string' && visualPanels[0].imageUrl.trim().length > 0));
  // The picture picker belongs to the top-level image, never to panel artwork.
  React.useEffect(() => { setFindOpen(false); }, [generatedContent && generatedContent.id]);
  const latestImageRef = React.useRef(null);
  latestImageRef.current = generatedContent && generatedContent.data && generatedContent.data.imageUrl;
  const latestResourceIdRef = React.useRef(null);
  latestResourceIdRef.current = generatedContent && generatedContent.id;
  const imageViewMountedRef = React.useRef(true);
  React.useEffect(() => {
    imageViewMountedRef.current = true;
    return () => { imageViewMountedRef.current = false; };
  }, []);
  // Choosing or closing removes the focused control; return focus to the Find button that opened the panel.
  const findOpenerRef = React.useRef(null), refocusFind = React.useRef(false);
  const toggleFind = (event) => { findOpenerRef.current = event.currentTarget; setFindOpen(open => !open); };
  const closeFind = () => { refocusFind.current = true; setFindOpen(false); };
  React.useEffect(() => {
    if (!findOpen && refocusFind.current) {
      refocusFind.current = false;
      const opener = findOpenerRef.current;
      findOpenerRef.current = null;
      if (opener && typeof document !== 'undefined' && opener !== document.body && opener !== document.documentElement && opener.isConnected && typeof opener.focus === 'function') opener.focus();
    }
  }, [findOpen]);
  const [findBusy, setFindBusy] = React.useState(false);
  const chooseClassroomImage = async (choice) => {
    const A = window.AlloModules && window.AlloModules.AltText;
    const previousResourceId = generatedContent && generatedContent.id;
    const previousImageUrl = generatedContent && generatedContent.data && generatedContent.data.imageUrl;
    if (!A || !choice || findBusy) return;
    setFindBusy(true);
    try {
      const baked = await A.bakeCreditBand(choice.dataUrl, choice.creditLine, { kind: choice.source === 'mulberry' ? 'symbol' : 'photo', attribution: choice.attribution });
      if (!imageViewMountedRef.current) return;
      const imageUrl = baked.dataUrl;
      // The picture or active resource may have changed while this one was checked (a Regenerate, another item).
      const applied = latestResourceIdRef.current === previousResourceId && latestImageRef.current === previousImageUrl && updateImageResource(item => item.data && item.data.imageUrl === previousImageUrl ? replaceSingleImage(item, imageUrl, {
        imageSource: choice.source, altText: choice.alt || '', altSource: choice.alt ? choice.altSource : '',
        altHash: choice.alt ? A.hashImage(imageUrl) : '', imageAttribution: choice.attribution || null, imageCreditBand: baked.bandHeight,
      }) : item) !== false;
      if (!applied) {
        if (typeof addToast === 'function') addToast(t('visuals.picture_changed_meanwhile'), 'error');
        return;
      }
      closeFind();
      if (typeof addToast === 'function') addToast(t('visuals.picture_added'), 'success');
    } catch (_) {
      if (imageViewMountedRef.current && typeof addToast === 'function') addToast(t('visuals.picture_add_failed'), 'error');
    } finally {
      if (imageViewMountedRef.current) setFindBusy(false);
    }
  };
  const uploadImage = (event) => {
    const file = event.target.files && event.target.files[0];
    event.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|gif|webp|avif)$/i.test(file.type)) {
      if (typeof addToast === 'function') addToast(t('visuals.upload_format_error') || 'Choose a PNG, JPEG, GIF, WebP, or AVIF image.', 'warning');
      return;
    }
    if (file.size > 10 * 1024 * 1024) { if (typeof addToast === 'function') addToast(t('toasts.image_too_large_10mb_alt'), 'warning'); return; }
    const resourceId = generatedContent && generatedContent.id;
    const previousImageUrl = generatedContent && generatedContent.data && generatedContent.data.imageUrl;
    const previousRequest = uploadRequestsRef.current.get(resourceId);
    if (previousRequest) { try { previousRequest.reader.abort(); } catch (_) {} }
    const reader = new FileReader();
    const request = { reader };
    uploadRequestsRef.current.set(resourceId, request);
    reader.onerror = () => {
      if (uploadRequestsRef.current.get(resourceId) !== request) return;
      uploadRequestsRef.current.delete(resourceId);
      if (typeof addToast === 'function') addToast(t('visuals.upload_failed') || 'The image could not be read. Please try another file.', 'error');
    };
    reader.onload = event => {
      if (uploadRequestsRef.current.get(resourceId) !== request) return;
      uploadRequestsRef.current.delete(resourceId);
      const imageUrl = event.target && event.target.result;
      if (typeof imageUrl !== 'string' || !/^data:image\/(?:png|jpe?g|gif|webp|avif);base64,/i.test(imageUrl)) return;
      updateImageResource(item => item.data && item.data.imageUrl === previousImageUrl ? replaceSingleImage(item, imageUrl) : item);
    };
    reader.readAsDataURL(file);
  };
  const descPanelId = altFieldId + '-desc-panel';
  const [showDescription, setShowDescription] = React.useState(false);
  const [speakingDesc, setSpeakingDesc] = React.useState(false);
  const speakingDescRef = React.useRef(false);
  speakingDescRef.current = speakingDesc;
  const stopDescSpeech = () => {
    try { if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === 'function') window.AlloSpeechPlayer.stop(); } catch (_) {}
    try { if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel(); } catch (_) {}
    setSpeakingDesc(false);
  };
  React.useEffect(() => {
    setShowDescription(false);
    if (speakingDescRef.current) stopDescSpeech();
  }, [generatedContent?.id, generatedContent?.data?.imageUrl]);
  React.useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onSpeechState = (e) => {
      if (speakingDescRef.current && e && e.detail && e.detail.isPlaying === false) setSpeakingDesc(false);
    };
    window.addEventListener('allo-speech-state', onSpeechState);
    return () => {
      window.removeEventListener('allo-speech-state', onSpeechState);
      if (speakingDescRef.current) {
        try { if (window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.stop === 'function') window.AlloSpeechPlayer.stop(); } catch (_) {}
        try { if (window.speechSynthesis && typeof window.speechSynthesis.cancel === 'function') window.speechSynthesis.cancel(); } catch (_) {}
      }
    };
  }, []);
  const hasReadableDescription = !usesVisualPanelGrid && Boolean(generatedContent?.data?.imageUrl) && !descriptionNeedsAttention && generatedContent?.data?.decorative !== true && Boolean(String(imageDescription || '').trim());
  const canSpeakDescription = Boolean(
    typeof handleSpeak === 'function' ||
    (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') ||
    (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function')
  );
  const showVisualToolsBar = hasReadableDescription && (canSpeakDescription || !isTeacherMode);
  const toggleSpeakDescription = () => {
    const clean = String(imageDescription || '').trim();
    if (!clean) return;
    if (speakingDesc) {
      stopDescSpeech();
      return;
    }
    try {
      if (typeof window !== 'undefined' && (window.__alloMuted === true || window._alloGlobalMute === true || window._alloGlobalMuted === true || (typeof window.__alloIsGlobalMuted === 'function' && window.__alloIsGlobalMuted()))) {
        return;
      }
    } catch (_) {}
    try {
      if (typeof handleSpeak === 'function') {
        handleSpeak(clean, 'visual-desc-' + (generatedContent?.id || 'single'), 0, false, leveledTextLanguage || null);
        return;
      }
      if (typeof window !== 'undefined' && window.AlloSpeechPlayer && typeof window.AlloSpeechPlayer.speak === 'function') {
        setSpeakingDesc(true);
        Promise.resolve(window.AlloSpeechPlayer.speak(clean, { language: leveledTextLanguage || 'English' })).catch(() => { if (imageViewMountedRef.current) setSpeakingDesc(false); });
        return;
      }
      if (typeof window !== 'undefined' && window.speechSynthesis && typeof window.SpeechSynthesisUtterance === 'function') {
        window.speechSynthesis.cancel();
        const u = new window.SpeechSynthesisUtterance(clean);
        u.onend = () => { if (imageViewMountedRef.current) setSpeakingDesc(false); };
        u.onerror = () => { if (imageViewMountedRef.current) setSpeakingDesc(false); };
        setSpeakingDesc(true);
        window.speechSynthesis.speak(u);
      }
    } catch (_) {
      if (imageViewMountedRef.current) setSpeakingDesc(false);
    }
  };
  return (
                  <div className="space-y-3">
                    {isTeacherMode && <input type="file" accept="image/png,image/jpeg,image/gif,image/webp,image/avif" ref={singleImageFileRef} className="hidden" aria-label={t('common.upload_replacement_image') || 'Upload replacement image'} onChange={uploadImage} />}
                    {isTeacherMode && <div data-image-udl-goal className="bg-purple-50 p-3 rounded-lg border border-purple-100 mb-3">
                        <p className="text-sm text-purple-800"><strong>{imageText('visuals.udl_goal_label', 'UDL Goal:')}</strong> {imageText('visuals.udl_goal_body', 'Providing options for perception. Images and diagrams clarify abstract concepts and vocabulary for visual learners.')}<span className="block mt-1 font-semibold">{imageText('visuals.language_target', 'Language Target:')} {leveledTextLanguage} {fillInTheBlank ? imageText('visuals.worksheet_mode', '(Worksheet Mode)') : ""}</span></p>
                    </div>}
                    <div className="flex flex-col items-center">
                        <div className="w-full max-w-2xl bg-slate-100 rounded-lg border border-slate-400 shadow-md p-2 mb-4 relative overflow-hidden">
                            {usesVisualPanelGrid ? (
                                <VisualPanelGrid
                                    key={(generatedContent?.id || "default") + (isTeacherMode ? ':teacher' : ':learner')}
                                    visualPlan={generatedContent?.data?.visualPlan}
                                    onRefinePanel={isTeacherMode && !imageEditDoor?.disabled ? handleRefinePanel : undefined}
                                    onAnimatePanel={isTeacherMode && !imageEditDoor?.disabled ? handleAnimatePanel : undefined}
                                    onRegenerateFrame={isTeacherMode && !imageEditDoor?.disabled ? handleRegeneratePanelFrame : undefined}
                                    onDeleteFrame={isTeacherMode ? handleDeletePanelFrame : undefined}
                                    onDuplicateFrame={isTeacherMode ? handleDuplicatePanelFrame : undefined}
                                    onReorderFrame={isTeacherMode ? handleReorderPanelFrame : undefined}
                                    onSetPanelFps={isTeacherMode ? handleSetPanelFps : undefined}
                                    onUpdateLabel={isTeacherMode ? handleUpdateVisualLabel : undefined}
                                    onUpdatePanel={isTeacherMode && typeof handleUpdateVisualPanel === 'function' ? ((panelIdx, patch, expect) => handleUpdateVisualPanel(panelIdx, patch, { ...(expect || {}), resourceId: generatedContent?.id })) : undefined}
                                    language={leveledTextLanguage}
                                    onSpeak={handleSpeak}
                                    t={t}
                                    isTeacherMode={isTeacherMode}
                                    onChallengeSubmit={(result) => {
                                        if (typeof handleScoreUpdate === 'function') handleScoreUpdate(Math.round(((result && result.score) || 0) / 2), "Label Challenge", generatedContent?.id);
                                        if (typeof setLabelChallengeResults === 'function') setLabelChallengeResults(prev => [...(Array.isArray(prev) ? prev : []), {
                                            score: (result && result.score) || 0,
                                            totalCorrect: (result && result.totalCorrect) || 0,
                                            totalClose: (result && result.totalClose) || 0,
                                            totalExpected: (result && result.totalExpected) || 0,
                                            feedback: (result && result.feedback) || '',
                                            labelResults: (result && result.labelResults) || [],
                                            resourceId: generatedContent?.id,
                                            resourceTitle: generatedContent?.data?.visualPlan?.title || '',
                                            panelCount: generatedContent?.data?.visualPlan?.panels?.length || 0,
                                            challengeType: generatedContent?.data?.annotations?.challengeType || 'scratch',
                                            timestamp: new Date().toISOString()
                                        }]);
                                    }}
                                    callGemini={_imageViewFnUsable('text', callGemini) ? callGemini : null}
                                    initialAnnotations={isTeacherMode ? generatedContent?.data?.annotations : learnerPanelAnnotations(generatedContent?.data?.annotations, props.learnerAnnotations)}
                                    readOnlyDrawings={isTeacherMode ? undefined : generatedContent?.data?.annotations?.drawings}
                                    onRetryFailed={isTeacherMode && typeof handleRestoreImage === 'function' ? () => handleRestoreImage() : undefined}
                                    onAnnotationsChange={(annotations) => {
                                        // The teacher's annotations are the resource; a learner's marks go to their own work.
                                        if (isTeacherMode) updateImageResource(item => ({ ...item, data: { ...item.data, annotations } }));
                                        else if (typeof props.onLearnerAnnotationsChange === 'function') props.onLearnerAnnotationsChange(generatedContent?.id, learnerOwnedAnnotations(annotations, generatedContent?.data?.annotations));
                                    }}
                                />
                            ) : _imgSafeImageUrl(generatedContent?.data?.imageUrl) ? (
                                <div style={{position:'relative'}}>
                                <img src={_imgSafeImageUrl(generatedContent?.data?.imageUrl)} alt={imageDescription} aria-describedby={descriptionNeedsAttention ? descriptionId : undefined} role={generatedContent?.data?.decorative ? 'presentation' : undefined} className="w-full h-auto rounded" loading="lazy" decoding="async"/>
                                {/* Upload and Find live once, in the toolbar under the picture; only Restore is laid over it. */}
                                {isTeacherMode && generatedContent?.data?.originalImage && (
                                  <div data-image-overlay-actions style={{position:'absolute',top:'8px',right:'8px',display:'flex',flexWrap:'wrap',justifyContent:'flex-end',gap:'6px',maxWidth:'calc(100% - 16px)'}}>
                                      <button
                                        type="button"
                                        aria-label={t('visuals.restore_ai_image') || 'Restore AI image'}
                                        title={t('visuals.restore_ai_image') || 'Restore AI image'}
                                        onClick={() => updateImageResource(restoreSingleImage)}
                                        className="min-h-11 flex items-center gap-1 bg-white/90 backdrop-blur-sm border border-amber-400 rounded-lg px-3 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-50 transition-all motion-reduce:transition-none shadow-sm cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                                      ><span aria-hidden="true">↩️</span> {t('visuals.restore_original') || 'Restore'}</button>
                                  </div>
                                )}
                                {generatedContent?.data?.imageAttribution && window.AlloModules && window.AlloModules.AltText && (
                                  <p className="mt-1 text-xs text-slate-700" data-image-credit="">
                                    {window.AlloModules.AltText.openImageCreditLine(generatedContent.data.imageAttribution)}
                                    {/^https:\/\//i.test(generatedContent.data.imageAttribution.url || '') && <> · <a href={generatedContent.data.imageAttribution.url} target="_blank" rel="noopener noreferrer" className="underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600">{t('visuals.image_source_link') || 'Source'}</a></>}
                                  </p>
                                )}
                                {showVisualToolsBar && (
                                  <div data-visual-learner-tools className="mt-2.5 flex flex-wrap items-center gap-2 no-print">
                                    {canSpeakDescription && (
                                      <button
                                        type="button"
                                        data-visual-listen
                                        aria-pressed={speakingDesc}
                                        onClick={toggleSpeakDescription}
                                        className="min-h-11 inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-white px-3 py-1.5 text-xs font-bold text-indigo-800 hover:bg-indigo-50 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                      >
                                        <span aria-hidden="true">{speakingDesc ? '⏹' : '🔊'}</span>
                                        <span>{speakingDesc ? imageText('common.stop', 'Stop') : imageText('visuals.listen_description', 'Listen to description')}</span>
                                      </button>
                                    )}
                                    {!isTeacherMode && (
                                      <button
                                        type="button"
                                        data-visual-description-toggle
                                        aria-expanded={showDescription}
                                        aria-controls={descPanelId}
                                        onClick={() => setShowDescription(prev => !prev)}
                                        className="min-h-11 inline-flex items-center gap-1.5 rounded-lg border border-slate-400 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600"
                                      >
                                        <span aria-hidden="true">📝</span>
                                        <span>{showDescription ? imageText('visuals.hide_description', 'Hide description') : imageText('visuals.show_description', 'Show description')}</span>
                                      </button>
                                    )}
                                  </div>
                                )}
                                {hasReadableDescription && !isTeacherMode && showDescription && (
                                  <div id={descPanelId} data-visual-description-text className="mt-2 rounded-lg border border-slate-300 bg-white p-3 text-sm leading-relaxed text-slate-800 shadow-sm">
                                    {imageDescription}
                                  </div>
                                )}
                                {descriptionNeedsAttention && <div id={descriptionId} role="status" className="mt-3 rounded-xl border border-amber-400 bg-amber-50 p-3 text-sm text-amber-950">
                                  <p>{isTeacherMode
                                    ? descriptionStale ? imageText('visuals.description_review_teacher', 'The picture changed. Review its description before sharing.') : imageText('visuals.description_missing_teacher', 'This picture needs a description so everyone can use it. Add one below, or mark it decorative if it carries no information.')
                                    : imageText('visuals.description_missing_learner', 'An image description is not available for this picture. Ask your teacher for a description or an accessible version.')}</p>
                                  {isTeacherMode && <button type="button" onClick={() => document.getElementById(altFieldId)?.focus()} className="mt-2 min-h-11 rounded-lg border border-amber-700 px-3 py-2 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700">{imageText('visuals.description_edit', 'Edit image description')}</button>}
                                </div>}
                                {isTeacherMode && (() => {
                                    const A = window.AlloModules && window.AlloModules.AltText;
                                    const d = generatedContent?.data || {};
                                    const currentUrl = d.imageUrl;
                                    const stale = descriptionStale;
                                    const patch = (fields) => {
                                        updateImageResource(item => item && item.data && item.data.imageUrl === currentUrl
                                            ? { ...item, data: { ...item.data, ...fields } } : item);
                                    };
                                    const regenerate = async () => {
                                        const vision = _imageViewFnUsable('vision', typeof window !== 'undefined' ? window.callGeminiVision : null) ? window.callGeminiVision : null;
                                        if (!A || !vision || !currentUrl || altBusy) return;
                                        const request = { id: generatedContent?.id, imageUrl: currentUrl };
                                        altRequestRef.current = request;
                                        setAltRequest(request);
                                        try {
                                            const [r] = await A.draftAlts([{ id: 0, dataUrl: currentUrl, context: d.prompt }], { language: leveledTextLanguage, callGeminiVision: vision });
                                            if (r && altRequestRef.current === request) {
                                                // An AI draft must not replace a description or decorative
                                                // choice the author changed while the request was pending.
                                                updateImageResource(item => item && item.data && item.data.imageUrl === currentUrl
                                                    && ['altText', 'altSource', 'altHash', 'decorative', 'prompt'].every(key => item.data[key] === d[key])
                                                    ? { ...item, data: { ...item.data, altText: r.decorative ? '' : r.alt, altSource: r.source, decorative: r.decorative === true, altHash: A.hashImage(currentUrl) } }
                                                    : item);
                                            }
                                        } catch (_) {
                                            const active = currentImageRef.current;
                                            if (altRequestRef.current === request && active.id === request.id && active.imageUrl === request.imageUrl && typeof addToast === 'function') {
                                                const key = 'a11y.alt.regenerate_failed';
                                                const translated = typeof t === 'function' ? t(key) : '';
                                                addToast(translated && translated !== key ? translated : 'The image description could not be generated. Try again or write a description.', 'error');
                                            }
                                        } finally {
                                            if (altRequestRef.current === request) {
                                                altRequestRef.current = null;
                                                setAltRequest(null);
                                            }
                                        }
                                    };
                                    const changeDescription = value => patch({ altText: value, altSource: 'author', altHash: currentUrl && typeof A?.hashImage === 'function' ? A.hashImage(currentUrl) : '' });
                                    if (!window.AlloModules?.ImageAltField) return <div className="mt-3 rounded-xl border border-slate-300 p-3">
                                      <label htmlFor={altFieldId} className="block text-sm font-bold">{imageText('a11y.alt.field_label', 'Image description')}</label>
                                      {!d.decorative && <textarea id={altFieldId} value={d.altText || ''} maxLength={800} rows={3} onChange={event => changeDescription(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-400 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600" />}
                                      <label className="mt-2 flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" checked={d.decorative === true} onChange={event => patch({ decorative: event.target.checked })} className="rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600" />{imageText('a11y.alt.decorative_label', 'Decorative (screen readers skip it)')}</label>
                                    </div>;
                                    return React.createElement(window.AlloModules.ImageAltField, {
                                        id: altFieldId, t: t, value: d.altText || '',
                                        source: stale ? 'stale' : (d.altSource || (d.altText ? 'planning' : '')), decorative: d.decorative === true, busy: altBusy,
                                        onChange: changeDescription,
                                        onDecorativeChange: (flag) => patch({ decorative: flag }),
                                        onRegenerate: A && _imageViewFnUsable('vision', typeof window !== 'undefined' ? window.callGeminiVision : null) ? regenerate : undefined,
                                    });
                                })()}
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center p-8 text-slate-600 gap-4 w-full">
                                    <div className="bg-slate-200 p-4 rounded-full">
                                        <ImageIcon size={32} aria-hidden="true" className="opacity-50"/>
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-slate-600">{t('visuals.image_not_saved')}</p>
                                        <p className="text-xs">{t('visuals.image_stripped')}</p>
                                    </div>
                                    {isTeacherMode && <button
                                        type="button"
                                        onClick={handleRestoreImage}
                                        disabled={isProcessing || !!imageGenDoor?.disabled} aria-busy={isProcessing}
                                        title={imageGenDoor?.title || t('common.regenerate') || 'Regenerate'}
                                        data-help-key="visuals_regenerate"
                                        className="min-h-11 flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full font-bold hover:bg-indigo-700 transition-colors motion-reduce:transition-none shadow-sm disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"
                                    >
                                        {isProcessing ? <RefreshCw size={14} aria-hidden="true" className="animate-spin motion-reduce:animate-none"/> : <RefreshCw size={14} aria-hidden="true"/>}
                                        {t('visuals.regenerate_prompt')}
                                    </button>}
                                </div>
                            )}
                        </div>
                        {isTeacherMode && findOpen && !usesVisualPanelGrid && (
                          <section
                            className="w-full max-w-2xl mb-4"
                            aria-label={t('visuals.find_picture') || 'Find a symbol or photo'}
                            onKeyDown={(e) => {
                              if (e.key === 'Escape' && !e.isComposing && !e.nativeEvent?.isComposing && e.keyCode !== 229 && e.nativeEvent?.keyCode !== 229) {
                                e.stopPropagation();
                                closeFind();
                              }
                            }}
                          >
                            {window.AlloModules && window.AlloModules.ClassroomImagePicker
                              ? React.createElement(window.AlloModules.ClassroomImagePicker, {
                                idPrefix: 'visual-find-' + (generatedContent?.id || 'single'), language: leveledTextLanguage,
                                sources: ['symbols', 'photos'], t: t, onChoose: chooseClassroomImage,
                              })
                              : <p role="status" className="text-sm text-slate-700">{t('visuals.find_loading') || 'Picture search is still loading. Try again in a moment.'}</p>}
                            {findBusy && <p role="status" className="mt-2 text-sm text-slate-700">{t('visuals.find_adding') || 'Adding the picture...'}</p>}
                            <button type="button" onClick={closeFind} className="mt-2 min-h-11 rounded-lg border border-slate-400 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600">{t('common.close') || 'Close'}</button>
                          </section>
                        )}
                        {isTeacherMode && Boolean(String(generatedContent?.data?.prompt || '').trim()) && <div className="w-full max-w-2xl bg-white p-4 rounded-lg border border-slate-400 shadow-sm mb-6" data-help-key="visuals_prompt">
                            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wider mb-2">{t('visuals.prompt_label')}</h4>
                            <p className="text-slate-700 italic bg-slate-50 p-3 rounded border border-slate-100 text-sm">"{generatedContent?.data?.prompt}"</p>
                        </div>}
                        {isTeacherMode && (
                        <div className="w-full max-w-2xl bg-yellow-50 rounded-xl border border-yellow-200 p-4 shadow-sm mb-6" data-help-key="visuals_refiner">
                             <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 bg-yellow-200 rounded-full flex items-center justify-center text-lg" aria-hidden="true">🍌</div>
                                <div className="text-sm font-bold text-yellow-800">{t('visuals.refiner_title')}</div>
                             </div>
                             <div className="flex gap-2">
                                <input aria-label={t('common.visuals_refiner_placeholder')}
                                    type="text"
                                    value={imageRefinementInput}
                                    onChange={(e) => { if (typeof setImageRefinementInput === 'function') setImageRefinementInput(e.target.value); }}
                                    placeholder={t('visuals.refiner_placeholder')}
                                    className="min-w-0 min-h-11 flex-grow text-sm p-2 border border-yellow-600 rounded-md focus:ring-2 focus:ring-amber-700 focus:outline-none"
                                    onCompositionStart={() => { imageRefinementComposingRef.current = true; }}
                                    onCompositionEnd={() => { imageRefinementComposingRef.current = false; }}
                                    onBlur={() => { imageRefinementComposingRef.current = false; }}
                                    onKeyDown={(e) => {
                                      if (e.key !== 'Enter' || e.altKey || e.ctrlKey || e.metaKey || imageRefinementComposingRef.current || e.isComposing || e.nativeEvent?.isComposing || e.keyCode === 229 || e.nativeEvent?.keyCode === 229) return;
                                      e.preventDefault();
                                      if (!e.repeat && !isProcessing && !imageEditDoor?.disabled && String(imageRefinementInput || '').trim() && typeof handleRefineImage === 'function') handleRefineImage();
                                    }}
                                />
                                <button type="button"
                                    onClick={handleRefineImage}
                                    disabled={!imageRefinementInput.trim() || isProcessing || !!imageEditDoor?.disabled} aria-busy={isProcessing}
                                    className="min-h-11 min-w-11 shrink-0 bg-yellow-400 hover:bg-yellow-500 text-slate-950 font-bold p-2 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"
                                    title={imageEditDoor?.title || t('common.apply_nano_edit')}
                                    aria-label={t('common.apply_nano_edit')}
                                >
                                    {isProcessing ? <RefreshCw size={16} aria-hidden="true" className="animate-spin motion-reduce:animate-none"/> : <Send size={16} aria-hidden="true"/>}
                                </button>
                             </div>
                             {!imageEditDoor?.disabled && <span className="text-[11px] text-slate-600 italic mt-0.5 block">{t('visuals.nano_active_status')}</span>}
                             {imageEditDoor?.disabled && typeof window.AlloAiSetupNotice === 'function' && <div className="mt-2"><window.AlloAiSetupNotice t={t} kind="imageEdit" /></div>}
                        </div>
                        )}
                        {isTeacherMode && (
                        <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg text-sm text-red-800 mb-6">
                            <div>
                                <p className="font-bold mb-1">{t('visuals.warning.title')}</p>
                                {typeof window !== 'undefined' && typeof window.sanitizeHtml === 'function' ? (
                                  <>
                                    <p className="mb-2" dangerouslySetInnerHTML={{ __html: window.sanitizeHtml(t('visuals.warning.desc') || '') }}></p>
                                    <p dangerouslySetInnerHTML={{ __html: window.sanitizeHtml(t('visuals.warning.tip') || '') }}></p>
                                  </>
                                ) : (
                                  <>
                                    <p className="mb-2">{String(t('visuals.warning.desc') || '').replace(/<[^>]+>/g, '')}</p>
                                    <p>{String(t('visuals.warning.tip') || '').replace(/<[^>]+>/g, '')}</p>
                                  </>
                                )}
                            </div>
                        </div>
                        )}
                        {isTeacherMode && (
                        <div data-image-actions className="flex gap-3 w-full max-w-2xl pb-20" style={{flexWrap:'wrap'}}>
                            <button type="button" onClick={handleDownloadImage} data-help-key="visuals_download" style={{flexBasis:'16rem'}} className="min-w-0 min-h-11 flex-1 flex items-center justify-center gap-2 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors motion-reduce:transition-none font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2"><Download size={18} aria-hidden="true" /> {t('visuals.download')}</button>
                            <button
                              type="button"
                              aria-label={t('visuals.upload_image') || 'Upload your own image'}
                              title={t('visuals.upload_image') || 'Upload your own image'}
                              onClick={() => singleImageFileRef?.current?.click()}
                              className="min-h-11 min-w-11 flex-none flex items-center justify-center gap-2 bg-purple-50 text-purple-800 py-2 px-3 sm:px-4 rounded-lg hover:bg-purple-100 transition-colors motion-reduce:transition-none font-medium border border-purple-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-600"
                            ><span aria-hidden="true" style={{fontSize:'1.125rem'}}>📷</span> {t('visuals.replace_image') || 'Replace'}</button>
                            {!usesVisualPanelGrid && (
                            <button
                              type="button"
                              aria-label={t('visuals.find_picture') || 'Find a symbol or photo'}
                              title={t('visuals.find_picture') || 'Find a symbol or photo'}
                              aria-expanded={findOpen}
                              onClick={toggleFind}
                              className="min-h-11 min-w-11 flex-none flex items-center justify-center gap-2 bg-sky-50 text-sky-900 py-2 px-3 sm:px-4 rounded-lg hover:bg-sky-100 transition-colors motion-reduce:transition-none font-medium border border-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-600"
                            ><span aria-hidden="true" style={{fontSize:'1.125rem'}}>🔎</span> {imageText('visuals.find_short', 'Find')}</button>
                            )}
                            {/* A picture that was not saved already shows its own Regenerate button in the empty state above. */}
                            {(usesVisualPanelGrid || _imgSafeImageUrl(generatedContent?.data?.imageUrl)) && (
                            <button type="button" aria-label={t('common.regenerate')} onClick={handleRestoreImage} disabled={isProcessing || !!imageGenDoor?.disabled} aria-busy={isProcessing} title={imageGenDoor?.title || t('common.regenerate') || 'Regenerate'} data-help-key="visuals_regenerate" className="min-h-11 min-w-11 flex-none flex items-center justify-center gap-2 bg-amber-50 text-amber-800 py-2 px-3 sm:px-4 rounded-lg hover:bg-amber-100 transition-colors motion-reduce:transition-none font-medium border border-amber-600 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-700"><RefreshCw size={18} aria-hidden="true" /></button>
                            )}
                        </div>
                        )}
                    </div>
                  </div>
  );
}

ImageView.replaceSingleImage = replaceSingleImage;
ImageView.restoreSingleImage = restoreSingleImage;
ImageView.learnerPanelAnnotations = learnerPanelAnnotations;
ImageView.learnerOwnedAnnotations = learnerOwnedAnnotations;
