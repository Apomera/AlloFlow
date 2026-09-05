/* Shared response boundary for Memory Aid and Applied Challenge. */
(function () {
  'use strict';
  const memoryFields = ['studentDraft', 'studentReasoning', 'feedback', 'coachHint', 'visualPrompt', 'visualAlt', 'visualImage', 'visualSource', 'visualCheck', 'visualReview'];
  const appliedFields = ['workspace', 'evidenceLedger', 'criteriaCheck', 'validationCycles', 'stressTest', 'feedback', 'coachHint'];
  const noteFields = ['title', 'author', 'pageRange', 'cues', 'notes', 'summary', 'question', 'hypothesis', 'materials', 'procedure', 'data', 'analysis', 'conclusion', 'favoriteLine', 'thinkings', 'connection', 'entries', 'blanks', 'notesExtra', 'pairs', 'connections', 'feedback', 'feedbackCount', 'prevFeedbackScore'];
  const anchorFields = ['studentAnswers', 'feedback', 'prevFeedbackScore'];
  const supports = type => ['memory-aid', 'applied-challenge', 'note-taking', 'anchor-chart'].includes(type);
  const same = (a,b) => JSON.stringify(a) === JSON.stringify(b);
  function anchorSections(data) {
    const seen = new Set();
    return (Array.isArray(data?.sections) ? data.sections : []).filter(Boolean).map((section, index) => {
      let id = String(section.id || 'section-' + index); if (seen.has(id)) id += '-' + index; seen.add(id);
      const bulletSeen = new Set();
      const bullets = Array.isArray(section.bullets) ? section.bullets : [];
      const bulletIds = bullets.map((_, i) => { let key = String(section.bulletIds?.[i] || id + '-bullet-' + i); if (bulletSeen.has(key)) key += '-' + i; bulletSeen.add(key); return key; });
      return { ...section, id, bullets, bulletIds };
    });
  }
  function anchorAnswers(data, value) {
    return Object.fromEntries(anchorSections(data).map(section => [section.id, Object.fromEntries(section.bulletIds.map((id, i) => [id, String(value?.[section.id]?.[id] ?? value?.[section.id]?.[i] ?? '').slice(0,12000)]))]));
  }
  function legacyNotes(data) {
    const base = pick(data, ['notes', 'summary', 'hypothesis', 'data', 'analysis', 'conclusion', 'thinkings', 'connection', 'notesExtra', 'connections', 'feedback', 'feedbackCount', 'prevFeedbackScore']);
    if (data.templateType === 'reading-response') Object.assign(base,pick(data,['favoriteLine','question','pageRange']));
    if (Array.isArray(data.entries)) base.entries = data.entries.map(row => ({ id: row.id, response: row.response || '' }));
    if (Array.isArray(data.blanks)) base.blanks = data.blanks.map((row, i) => ({ id: row.id || 'blank-' + i, studentAnswer: row.studentAnswer || '' }));
    return base;
  }
  function noteResponseField(key, value) {
    if (key === 'blanks') return (Array.isArray(value) ? value : []).map((row, i) => ({ id: row.id || 'blank-' + i, studentAnswer: String(row.studentAnswer || '') }));
    return value;
  }
  function mergeNoteRows(original, rows) {
    return (rows || []).map((row, i) => ({ ...(original || []).find((old, idx) => String(old.id || 'blank-' + idx) === String(row.id || 'blank-' + i)), ...row }));
  }
  function safeNoteTree(value, depth = 0) {
    if (depth > 5) return null;
    if (typeof value === 'string') return value.slice(0,12000);
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
    if (typeof value === 'boolean' || value === null) return value;
    if (Array.isArray(value)) return value.slice(0,100).map(v => safeNoteTree(v,depth+1));
    if (!value || typeof value !== 'object') return null;
    const keys = new Set(['id','text','type','question','answer','response','quote','studentAnswer','strength','growthNudge','sourceConnection','found','detail','sourceAlignment','message','completion','quality','alignment','rubric','completeness','accuracy','depth','elaboration','draftFingerprint','createdAt','xpAwarded','hadPriorXp']);
    return Object.fromEntries(Object.entries(value).filter(([key])=>keys.has(key)).map(([key,v])=>[key,safeNoteTree(v,depth+1)]));
  }
  function noteSubmission(resource, raw) {
    const original = resource.data || {}, out = { schemaVersion: 1, templateType: original.templateType || 'cornell-notes' };
    const learnerKeys = new Set(Object.keys(legacyNotes(original)));
    noteFields.forEach(key => {
      if (!(key in raw)) return;
      const value = raw[key];
      if (Array.isArray(value)) {
        const originalRows = Array.isArray(original[key]) ? original[key] : [];
        out[key] = value.slice(0,100).map((row,index) => {
          const before = originalRows.find((r,i)=>String(r.id || i)===String(row.id || index)) || {};
          const result = { id: String(row.id || key + '-' + index) };
          const fields = key === 'blanks' ? ['studentAnswer'] : key === 'entries' ? ['quote','response'] : key === 'pairs' ? ['question','answer'] : ['text'];
          fields.forEach(field => { if (key === 'notes' || field === 'studentAnswer' || (key === 'entries' && field === 'response') || !same(row[field], before[field])) { if (typeof row[field] === 'string') result[field] = row[field].slice(0,12000); } });
          return result;
        });
      } else if (learnerKeys.has(key) || !same(value,original[key])) out[key] = safeNoteTree(value);
    });
    return out;
  }
  const pick = (value, keys) => Object.fromEntries(keys.filter(key => Object.prototype.hasOwnProperty.call(value || {}, key)).map(key => [key, value[key]]));
  // Bound and allowlist text trees. Media, private practice, teacher source,
  // and unknown future fields must never enter a response submission.
  const allowed = new Set(('id studentDraft studentReasoning visualAlt feedback coachHint strength accuracyCheck nextStep question status lessonConnectionCheck evidenceOrConstraintCheck workingQuestion stakeholders assumptions tradeoffs possibilities plan response testReflection revision transferReflection claim evidence tradeoff rating note source family draftFingerprint contextFingerprint createdAt completedAt importedChallenge challenge whyItMatters disposition dispositionReason methodId testQuestion criterion expectedFinding changeThreshold evidenceMode observation decision action reasoning revisionSummary outcome').split(' '));
  function textTree(value, depth = 0) {
    if (depth > 8) return null;
    if (typeof value === 'string') return value.slice(0, 12000);
    if (typeof value === 'boolean' || typeof value === 'number' || value === null) return value;
    if (Array.isArray(value)) return value.slice(0, 24).map(item => textTree(item, depth + 1));
    if (!value || typeof value !== 'object') return null;
    return Object.fromEntries(Object.entries(value).filter(([key]) => allowed.has(key) || /^(criterion|constraint)-\d+$/.test(key)).map(([key, item]) => [key, textTree(item, depth + 1)]));
  }
  function memoryCards(data) {
    const normalize = window.AlloModules?.MemoryAid?._testing?.normalizeMemoryAidCards;
    return typeof normalize === 'function' ? normalize(data?.cards, data?.authorshipMode) : (Array.isArray(data?.cards) ? data.cards.slice(0, 8) : []);
  }
  function responseFromData(type, data) {
    if (type === 'anchor-chart') return { schemaVersion: 1, studentAnswers: anchorAnswers(data, data.studentAnswers), feedback: data.feedback || null, prevFeedbackScore: Number(data.prevFeedbackScore) || 0 };
    if (type === 'note-taking') return { schemaVersion: 1, ...legacyNotes(data || {}) };
    if (type === 'memory-aid') return { schemaVersion: 1, cards: memoryCards(data).map(card => ({ id: card.id, ...pick(card, memoryFields) })) };
    return { schemaVersion: 1, ...pick(data, appliedFields) };
  }
  function project(resource, response) {
    const data = resource.data || {};
    if (resource.type === 'anchor-chart') return { ...resource, data: { ...data, sections: anchorSections(data), ...pick(response, anchorFields), studentAnswers: anchorAnswers(data, response?.studentAnswers || data.studentAnswers) } };
    if (resource.type === 'note-taking') {
      const fields = pick(response, noteFields), merged = { ...data, ...fields };
      ['blanks', 'entries', 'cues', 'notes', 'pairs', 'materials', 'procedure'].forEach(key => { if (fields[key]) merged[key] = mergeNoteRows(data[key], fields[key]); });
      return { ...resource, data: merged };
    }
    if (!response) return resource.type === 'memory-aid' ? { ...resource, data: { ...data, cards: memoryCards(data) } } : resource;
    if (resource.type === 'memory-aid') {
      const cards = memoryCards(data).map(card => ({ ...card, ...pick((response.cards || []).find(item => item.id === card.id), memoryFields) }));
      return { ...resource, data: { ...data, cards } };
    }
    return { ...resource, data: { ...data, ...pick(response, appliedFields) } };
  }
  function toSubmission(resource, response) {
    const raw = response || responseFromData(resource.type, resource.data || {});
    if (resource.type === 'note-taking') return { id: resource.id, type: resource.type, title: String(resource.title || resource.data?.title || '').slice(0,300), data: noteSubmission(resource,raw) };
    if (resource.type === 'anchor-chart') {
      const answers = anchorAnswers(resource.data, raw.studentAnswers);
      const sections = anchorSections(resource.data).slice(0,100).map(section => ({ id: section.id, label: String(section.label || '').slice(0,300), bulletIds: section.bulletIds.slice(0,100), bullets: section.bulletIds.slice(0,100).map(id => answers[section.id][id]) }));
      return { id: resource.id, type: resource.type, title: String(resource.title || resource.data?.title || '').slice(0,300), data: { schemaVersion: 1, sections, studentAnswers: Object.fromEntries(sections.map(s=>[s.id,Object.fromEntries(s.bulletIds.map((id,i)=>[id,s.bullets[i]]))])), feedback: safeNoteTree(raw.feedback || null), prevFeedbackScore: Math.max(0,Math.min(120,Number(raw.prevFeedbackScore)||0)) } };
    }
    const data = resource.type === 'memory-aid'
      ? { schemaVersion: 1, cards: (raw.cards || []).slice(0, 8).map(card => textTree(pick(card, ['id', 'studentDraft', 'studentReasoning', 'visualAlt', 'feedback', 'coachHint']))) }
      : { schemaVersion: 1, ...Object.fromEntries(appliedFields.filter(key => key in raw).map(key => [key, textTree(raw[key])])) };
    return { id: resource.id, type: resource.type, title: String(resource.title || resource.data?.title || '').slice(0, 300), data };
  }
  function toResponseEntries(resource, response) {
    const data = toSubmission(resource, response).data;
    const entries = {};
    const prefix = resource.id + ({ 'applied-challenge': ':applied:', 'memory-aid': ':memory:', 'anchor-chart': ':anchor:', 'note-taking': ':notes:' }[resource.type]);
    function walk(value, key) {
      if (typeof value === 'string' && value.trim()) entries[prefix + key] = value;
      else if (value && typeof value === 'object') Object.entries(value).forEach(([name, item]) => walk(item, key ? key + '-' + name : name));
    }
    if (resource.type === 'note-taking') {
      const writing=(value,key)=> { if(typeof value==='string') walk(value,key); else if(value && typeof value==='object') Object.entries(value).filter(([name])=>name!=='id').forEach(([name,item])=>writing(item,key+'-'+name)); };
      Object.entries(data).filter(([key])=> !['schemaVersion','templateType','feedback','prevFeedbackScore','feedbackCount'].includes(key)).forEach(([key,value])=>writing(value,key));
    }
    else if (resource.type === 'anchor-chart') { Object.entries(data.studentAnswers).forEach(([section,answers])=>Object.entries(answers).forEach(([id,value])=>walk(value,section+'-'+id))); }
    else if (resource.type === 'applied-challenge') {
      walk(data.workspace, '');
      (data.evidenceLedger || []).forEach((row, index) => ['claim', 'evidence', 'tradeoff'].forEach(key => walk(row[key], 'ledger-' + index + '-' + key)));
      Object.entries(data.criteriaCheck || {}).forEach(([key, item]) => walk(item.note, 'selfcheck-' + key));
      walk(data.validationCycles, 'checks');
    } else (data.cards || []).forEach(card => { walk(card.studentDraft, card.id + '-draft'); walk(card.studentReasoning, card.id + '-reasoning'); walk(card.visualAlt, card.id + '-visual-description'); });
    return entries;
  }
  function projectForExport(resource, response) {
    const shown = project(resource,response);
    if (resource.type !== 'anchor-chart' || !resource.data?.interactive?.armed) return shown;
    const submitted = toSubmission(resource,response);
    return { ...shown, data: { ...shown.data, sections: shown.data.sections.map(section=>({ ...section, bullets: submitted.data.sections.find(row=>row.id===section.id)?.bullets || [] })), interactive: { armed: false }, feedback: submitted.data.feedback } };
  }
  function emptyResponse(resource) {
    if (resource.type === 'anchor-chart') return { schemaVersion: 1, studentAnswers: anchorAnswers(resource.data,{}), feedback: null, prevFeedbackScore: 0 };
    if (resource.type === 'note-taking') {
      const data = resource.data || {}, response = { schemaVersion:1, feedback:null, feedbackCount:0, prevFeedbackScore:0 };
      Object.entries(legacyNotes(data)).forEach(([key,value])=> { if (Array.isArray(value)) response[key] = value.map(row=>({ id:row.id, ...(key==='blanks'?{studentAnswer:''}:key==='entries'?{response:''}:{text:''}) })); else if (key==='connection') response[key]={type:'text-to-self',text:''}; else if (!['feedback','feedbackCount','prevFeedbackScore'].includes(key)) response[key]=''; });
      return response;
    }
    return resource.type === 'memory-aid' ? { schemaVersion: 1, cards: memoryCards(resource.data).map(card => ({ id: card.id, studentDraft: '', studentReasoning: '', coachHint: '', feedback: null })) } : { schemaVersion: 1, workspace: {}, evidenceLedger: [], criteriaCheck: {}, validationCycles: [], stressTest: null, feedback: null, coachHint: '' };
  }
  const maxBackupBytes = 2 * 1024 * 1024;
  const record = value => value && typeof value === 'object' && !Array.isArray(value);
  function backup(resource, response) {
    const item = toSubmission(resource, response);
    if (resource.type === 'applied-challenge' && !Object.prototype.hasOwnProperty.call(item.data, 'workspace')) item.data.workspace = {};
    return { format: 'alloflow-studio-response', version: 1, resourceId: resource.id, resourceType: resource.type, title: item.title, savedAt: new Date().toISOString(), studio: item.data };
  }
  function serializeBackup(resource, response) {
    const value = backup(resource, response);
    readBackup(resource, value);
    const serialized = JSON.stringify(value);
    if (new Blob([serialized]).size > maxBackupBytes) throw new RangeError('Text backup exceeds the restore limit');
    return serialized;
  }
  function readBackup(resource, value, previous) {
    if (!value || value.format !== 'alloflow-studio-response' || value.version !== 1 || value.resourceId !== resource.id || value.resourceType !== resource.type || !value.studio || typeof value.studio !== 'object' || Array.isArray(value.studio)) throw new Error('This backup belongs to another resource or is not supported.');
    const raw = value.studio;
    if (raw.schemaVersion !== 1) throw new Error('Unsupported response schema');
    if (resource.type === 'memory-aid') {
      const validIds = new Set(memoryCards(resource.data).map(card => card.id));
      const seen = new Set();
      if (!Array.isArray(raw.cards) || raw.cards.length !== validIds.size || raw.cards.some(card => {
        if (!record(card) || typeof card.id !== 'string' || !validIds.has(card.id) || seen.has(card.id)) return true;
        seen.add(card.id);
        return ['studentDraft', 'studentReasoning', 'visualAlt', 'coachHint'].some(key => key in card && typeof card[key] !== 'string') || ('feedback' in card && card.feedback !== null && !record(card.feedback));
      })) throw new Error('Invalid memory response');
    } else if (resource.type === 'anchor-chart') {
      if (!record(raw.studentAnswers) || Object.values(raw.studentAnswers).some(row=>!record(row) || Object.values(row).some(text=>typeof text!=='string'))) throw new Error('Invalid anchor answers');
    } else if (resource.type === 'note-taking') {
      if (raw.templateType !== (resource.data?.templateType || 'cornell-notes')) throw new Error('Different notes template');
      if (['cues','notes','entries','blanks','pairs','materials','procedure'].some(key=>key in raw && (!Array.isArray(raw[key]) || raw[key].some(row=>!record(row))))) throw new Error('Invalid note rows');
      for (const key of noteFields) {
        if (!(key in raw)) continue; const value=raw[key];
        if (['feedbackCount','prevFeedbackScore'].includes(key)) { if (typeof value!=='number' || !Number.isFinite(value)) throw new Error('Invalid feedback score'); }
        else if (key==='feedback') { if (value!==null && !record(value)) throw new Error('Invalid feedback'); }
        else if (key==='connection') { if (!record(value) || Object.values(value).some(v=>typeof v!=='string')) throw new Error('Invalid connection'); }
        else if (Array.isArray(value)) { if (value.some(row=>Object.values(row).some(v=>typeof v!=='string'))) throw new Error('Invalid note text'); }
        else if (typeof value!=='string') throw new Error('Invalid note text');
      }
    } else {
      if (!record(raw.workspace) || Object.values(raw.workspace).some(value => typeof value !== 'string')) throw new Error('Invalid challenge workspace');
      if (['evidenceLedger', 'validationCycles'].some(key => key in raw && (!Array.isArray(raw[key]) || raw[key].some(value => !record(value))))) throw new Error('Invalid response rows');
      if ('criteriaCheck' in raw && (!record(raw.criteriaCheck) || Object.values(raw.criteriaCheck).some(value => !record(value)))) throw new Error('Invalid self-checks');
      if ('coachHint' in raw && typeof raw.coachHint !== 'string') throw new Error('Invalid coach hint');
      if (['feedback', 'stressTest'].some(key => key in raw && raw[key] !== null && !record(raw[key]))) throw new Error('Invalid response feedback');
    }
    const restored = resource.type === 'note-taking' ? { schemaVersion:1, ...pick(noteSubmission(resource,raw),noteFields) } : toSubmission(resource, raw).data;
    if (resource.type === 'memory-aid' && previous) restored.cards = restored.cards.map(card => ({ ...pick((previous.cards || []).find(item => item.id === card.id), memoryFields), ...card }));
    return restored;
  }
  function Boundary(props) {
    const React = window.React;
    const { View, generatedContent: resource, studentResponses, onResponseChange, studentWorkStatus, isTeacherMode, ...viewProps } = props;
    const [preview, setPreview] = React.useState(!!props.startInPreview);
    const [previewResponse, setPreviewResponse] = React.useState(null);
    const [backupMessage, setBackupMessage] = React.useState('');
    const backupInput = React.useRef(null);
    const mounted = React.useRef(true);
    React.useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
    const previewOwner = React.useRef('');
    const scope = String(resource.id) + ':' + String(viewProps.activeProfileId || '');
    const response = isTeacherMode ? (preview ? ((previewOwner.current === scope ? previewResponse : null) || emptyResponse(resource)) : null) : studentResponses?.[resource.id]?.studio;
    const current = React.useRef(null);
    current.current = { resource, response, preview, isTeacherMode, onResponseChange };
    const identity = String(resource.id) + ':' + String(viewProps.activeProfileId || '') + ':' + isTeacherMode + ':' + preview;
    current.current.identity = identity;
    const tr = (key, fallback) => { const value = viewProps.t?.('studio_response.' + key); return value && value !== 'studio_response.' + key ? value : fallback; };
    const handleNoteUpdate = React.useCallback((key, change) => {
      const state = current.current;
      if (state.identity !== identity) return;
      const shown = project(state.resource, state.response);
      if (state.isTeacherMode && !state.preview) {
        // Teacher editing can update the template, never learner fields.
        if (state.resource.type === 'applied-challenge' && appliedFields.includes(key)) return;
        if (state.resource.type === 'memory-aid' && key === 'cards') {
          viewProps.handleNoteUpdate(key, old => {
            const next = typeof change === 'function' ? change(old) : change;
            return next.map(card => {
              const prior = (old || []).find(item => item.id === card.id);
              return { ...card, studentDraft: prior?.studentDraft || '', studentReasoning: prior?.studentReasoning || '', feedback: prior?.feedback || null, coachHint: prior?.coachHint || '' };
            });
          });
        } else viewProps.handleNoteUpdate(key, change);
        return;
      }
      if (!(state.resource.type === 'memory-aid' ? key === 'cards' : state.resource.type === 'anchor-chart' ? anchorFields.includes(key) : state.resource.type === 'note-taking' ? noteFields.includes(key) : appliedFields.includes(key))) return;
      const value = typeof change === 'function' ? change(shown.data?.[key]) : change;
      const next = state.resource.type === 'note-taking' ? { ...(state.response || responseFromData(state.resource.type, shown.data)), [key]: noteResponseField(key,value) } : responseFromData(state.resource.type, { ...shown.data, [key]: value });
      if (state.resource.type === 'note-taking' && !['feedback','feedbackCount','prevFeedbackScore'].includes(key)) next.feedback = null;
      // Update immediately so multiple functional writes in one event compose.
      current.current = { ...state, response: next };
      if (state.isTeacherMode) { previewOwner.current = scope; setPreviewResponse(next); }
      else state.onResponseChange(state.resource.id, next);
    }, [viewProps.handleNoteUpdate, identity, scope]);
    const shown = project(resource, response);
    const download = () => {
      try {
        const file = new Blob([serializeBackup(resource, response)], { type: 'application/json' });
        const url = URL.createObjectURL(file), link = document.createElement('a');
        link.href = url; link.download = 'alloflow-my-work.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        setBackupMessage(tr('backup_note', 'Text backup: writing and feedback only. Images and recordings are not included. This does not submit your work.'));
      } catch (_) { setBackupMessage(tr('backup_failed', 'The backup could not be downloaded. Keep this page open and try again.')); }
    };
    const restore = async event => {
      const file = event.target.files?.[0]; event.target.value = ''; if (!file) return;
      const startingResource = resource.id, startingResponse = current.current.response, startingIdentity = current.current.identity;
      try {
        if (file.size > maxBackupBytes) throw new Error('Backup too large');
        const data = readBackup(resource, JSON.parse(await file.text()), startingResponse);
        if (!mounted.current || current.current.identity !== startingIdentity || current.current.resource.id !== startingResource || current.current.isTeacherMode) return;
        if (current.current.response !== startingResponse) throw new Error('Work changed during restore');
        current.current.onResponseChange(startingResource, data);
        setBackupMessage(tr('backup_restored', 'Backup restored to this workspace. Check the save status before leaving.'));
      } catch (_) { if (mounted.current) setBackupMessage(tr('backup_invalid', 'Choose a text backup downloaded from this resource. Your current work has not changed.')); }
    };
    return React.createElement(React.Fragment, null,
      React.createElement('div', { className: 'mb-3 flex flex-wrap items-center gap-3', role: 'region', 'aria-label': tr('mode_label', 'Workspace mode'), 'aria-live': 'polite' },
        isTeacherMode && React.createElement('button', { type: 'button', className: 'min-h-11 rounded-xl border px-3 py-2 focus-visible:ring-2', 'aria-pressed': preview, onClick: () => { setPreview(!preview); setPreviewResponse(null); } }, preview ? tr('close_preview', 'Close student preview') : tr('preview', 'Preview as student')),
        preview && React.createElement('button', { type: 'button', className: 'min-h-11 rounded-xl border px-3 py-2 focus-visible:ring-2', onClick: () => setPreviewResponse(null) }, tr('reset_preview', 'Reset preview')),
        React.createElement('span', { role: 'status' }, preview ? tr('preview_private', 'Preview work is temporary and is never submitted.') : isTeacherMode ? tr('authoring', 'Teacher authoring') : tr(studentWorkStatus || 'idle', ({ saving: 'Saving…', saved: 'Saved on this device', error: 'Could not save on this device. Keep this page open and download your work.', idle: 'Learner workspace' })[studentWorkStatus] || 'Learner workspace'))),
      !isTeacherMode && React.createElement('div', { className: 'mb-4 flex flex-wrap items-center gap-2 studio-recovery' },
        studentWorkStatus === 'error' && typeof props.onRetrySave === 'function' && React.createElement('button', { type: 'button', className: 'min-h-11 rounded-xl border border-amber-700 px-3 py-2 focus-visible:ring-2', onClick: props.onRetrySave }, tr('retry_save', 'Retry save')),
        React.createElement('button', { type: 'button', className: 'min-h-11 rounded-xl border px-3 py-2 focus-visible:ring-2', onClick: download }, tr('download_work', 'Download my work')),
        React.createElement('button', { type: 'button', className: 'min-h-11 rounded-xl border px-3 py-2 focus-visible:ring-2', onClick: () => backupInput.current?.click() }, tr('restore_work', 'Restore text backup')),
        React.createElement('input', { ref: backupInput, type: 'file', accept: '.json,application/json', hidden: true, onChange: restore, 'aria-label': tr('restore_work', 'Restore text backup') }),
        React.createElement('p', { className: 'w-full text-xs text-slate-700' }, tr('local_not_submitted', 'Saving on this device does not submit your work to your teacher.')),
        React.createElement('p', { role: 'status', className: 'w-full text-xs text-slate-700' }, backupMessage || tr('backup_note', 'Text backup: writing and feedback only. Images and recordings are not included. This does not submit your work.'))),
      React.createElement(View, { ...viewProps, key: identity, generatedContent: shown, referenceResource: resource, isTeacherMode: isTeacherMode && !preview, learnerReadOnly: isTeacherMode && !preview, previewMode: preview, activeProfileId: viewProps.activeProfileId, handleNoteUpdate }));
  }
  window.AlloModules = window.AlloModules || {};
  window.AlloModules.StudioResponse = { supports, responseFromData, project, projectForExport, anchorSections, toSubmission, toResponseEntries, emptyResponse, maxBackupBytes, backup, serializeBackup, readBackup, Boundary };
  window.AlloModules.StudioResponseModule = true;
})();
