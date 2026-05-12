// view_submission_inbox_source.jsx — teacher batch upload + decrypt for offline HTML submissions.
// Phase 2 of the offline-HTML worksheet submission system (May 11 2026).
//
// Workflow:
//   1. Teacher opens this modal from the Roster panel.
//   2. Loads class-key.alloflow (the file downloaded at class setup).
//   3. Selects one or more <nickname>-<doc>-<date>.alloflow.html files
//      students submitted (typically pulled from their class Drive folder).
//   4. Clicks "Decrypt all" — each row's encrypted blob is unwrapped with
//      the loaded private key and the payload appears in the queue.
//   5. Roster cross-check badges known nicknames green, unknown yellow.
//   6. "Send to gradebook" is a placeholder — Phase 3 will wire it to AI
//      rubric grading + studentResponses IndexedDB writes.
//
// Dependencies: window.AlloModules.SubmissionCrypto.decryptSubmission
// (registered by submission_crypto_module.js).

function SubmissionInbox({ isOpen, onClose, rosterKey, t, addToast }) {
  if (!isOpen) return null;

  const [privateJwk, setPrivateJwk] = useState(null);
  const [classKeyMeta, setClassKeyMeta] = useState(null);
  const [queue, setQueue] = useState([]);
  const [decryptingAll, setDecryptingAll] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);
  // Phase 3 (May 11 2026): per-row rubric state + AI grading results.
  // rubrics[idx] = { rubric: string, context: string, exemplar: string }
  // grades[idx]  = { [responseKey]: { score, status, feedback } }
  const [rubrics, setRubrics] = useState({});
  const [grades, setGrades] = useState({});
  const [gradingRow, setGradingRow] = useState(null);
  // Multi-anchor few-shot calibration (May 11 2026, Phase 3 v2):
  // Each anchor is a teacher-scored exemplar of a student response that
  // the AI uses as a calibration sample when grading every other response.
  // Anchors are global across the inbox session (not per-row) so
  // teachers can build up a calibration set by anchoring real student
  // responses they've graded, then have the AI extend the scoring to
  // everything else.
  // shape: [{ studentResponse, teacherScore (0-100), teacherFeedback?, fromSubmissionIdx?, fromResponseKey? }]
  const [anchors, setAnchors] = useState([]);
  const [anchorsPanelOpen, setAnchorsPanelOpen] = useState(false);
  const [pendingAnchor, setPendingAnchor] = useState(null);  // {submissionIdx, responseKey, responseText}
  const keyInputRef = useRef(null);
  const subInputRef = useRef(null);

  const tx = t || ((k, fallback) => fallback || k);

  const handleKeyFile = async (e) => {
    const file = e.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (data.kind !== 'alloflow-class-key' || !data.privateJwk) {
        addToast && addToast('Not a valid AlloFlow class key file.', 'error');
        return;
      }
      setPrivateJwk(data.privateJwk);
      setClassKeyMeta({
        className: data.className || '',
        classId: data.classId,
        createdAt: data.createdAt
      });
      addToast && addToast('Class key loaded.', 'success');
    } catch (err) {
      addToast && addToast('Could not read key file: ' + err.message, 'error');
    }
    if (e.target) e.target.value = '';
  };

  const handleSubmissionFiles = async (e) => {
    const files = Array.prototype.slice.call(e.target?.files || []);
    if (files.length === 0) return;
    const newRows = [];
    for (let i = 0; i < files.length; i++) {
      const f = files[i];
      try {
        const text = await f.text();
        const match = text.match(/<script type="application\/json" id="alloflow-submission">([\s\S]*?)<\/script>/);
        if (!match) {
          newRows.push({
            fileName: f.name, nickname: '?', status: 'error',
            error: 'Not an AlloFlow submission file (no embedded blob).'
          });
          continue;
        }
        const json = match[1].replace(/\\u003c/g, '<');
        const blob = JSON.parse(json);
        newRows.push({
          fileName: f.name,
          nickname: blob.nickname || '?',
          docTitle: blob.docTitle || '',
          timestamp: blob.timestamp || null,
          encryptedBlob: blob,
          payload: null,
          status: 'pending',
          error: null
        });
      } catch (err) {
        newRows.push({ fileName: f.name, nickname: '?', status: 'error', error: err.message });
      }
    }
    setQueue(prev => [...prev, ...newRows]);
    if (e.target) e.target.value = '';
  };

  const handleDecryptAll = async () => {
    if (!privateJwk) {
      addToast && addToast('Load the class key file first.', 'warn');
      return;
    }
    const SC = window.AlloModules && window.AlloModules.SubmissionCrypto;
    if (!SC || typeof SC.decryptSubmission !== 'function') {
      addToast && addToast('SubmissionCrypto module not loaded yet. Try again in a moment.', 'error');
      return;
    }
    setDecryptingAll(true);
    let ok = 0, fail = 0;
    // Iterate by index so each row gets its own state update
    for (let i = 0; i < queue.length; i++) {
      const row = queue[i];
      if (row.status !== 'pending') continue;
      try {
        const payload = await SC.decryptSubmission(row.encryptedBlob, privateJwk);
        setQueue(prev => prev.map((r, idx) => idx === i ? { ...r, payload, status: 'decrypted' } : r));
        ok++;
      } catch (err) {
        setQueue(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'error', error: err.message } : r));
        fail++;
      }
    }
    setDecryptingAll(false);
    addToast && addToast(
      ok + ' decrypted' + (fail > 0 ? ', ' + fail + ' failed (wrong key?)' : ''),
      fail > 0 ? 'warn' : 'success'
    );
  };

  const removeRow = (idx) => setQueue(prev => prev.filter((_, i) => i !== idx));
  const clearQueue = () => { setQueue([]); setExpandedRow(null); };

  const rosterStudents = (rosterKey && rosterKey.students) || {};
  const rosterStudentKeys = Object.keys(rosterStudents).map(s => s.toLowerCase());
  const rosterStatus = (nickname) => {
    if (!nickname || nickname === '?') return 'unknown';
    return rosterStudentKeys.indexOf(String(nickname).toLowerCase()) >= 0 ? 'known' : 'unknown';
  };

  const counts = queue.reduce((acc, r) => {
    acc[r.status] = (acc[r.status] || 0) + 1;
    return acc;
  }, {});

  const statusBadge = (status) => {
    const styles = {
      pending: { bg: '#f1f5f9', color: '#475569', label: 'Pending' },
      decrypted: { bg: '#dcfce7', color: '#166534', label: '✓ Decrypted' },
      error: { bg: '#fee2e2', color: '#991b1b', label: '✗ Error' }
    };
    const s = styles[status] || styles.pending;
    return /*#__PURE__*/React.createElement('span', {
      style: {
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        background: s.bg, color: s.color, fontSize: '0.72rem', fontWeight: 700
      }
    }, s.label);
  };

  // ── Phase 3: AI grading helpers ───────────────────────────
  const updateRubric = (idx, patch) => {
    setRubrics(prev => ({ ...prev, [idx]: { ...(prev[idx] || { rubric: '', context: '', exemplar: '' }), ...patch } }));
  };
  const gradeRow = async (idx) => {
    const row = queue[idx];
    if (!row || row.status !== 'decrypted' || !row.payload) return;
    const r = rubrics[idx] || {};
    const rubricText = (r.rubric || '').trim();
    if (!rubricText) {
      addToast && addToast('Please describe what a good response should include before grading.', 'warn');
      return;
    }
    const QH = window.AlloModules && window.AlloModules.QuizAIHelpers;
    if (!QH || typeof QH.gradeFreeformAnswerWithCalibration !== 'function') {
      addToast && addToast('Grader module not loaded yet. Try again in a moment.', 'error');
      return;
    }
    const callGemini = window.callGemini;
    if (typeof callGemini !== 'function') {
      addToast && addToast('Gemini API not ready. Open a regular AlloFlow window first so the API key loads.', 'error');
      return;
    }
    // Build calibration set: combine global anchors (multi-anchor few-shot)
    // with the per-row exemplar if one was provided. Cap at 5 to keep the
    // prompt under control.
    const calibrationSamples = [];
    if (Array.isArray(anchors) && anchors.length > 0) {
      anchors.forEach(a => {
        calibrationSamples.push({
          studentResponse: a.studentResponse,
          teacherScore: a.teacherScore,
          teacherFeedback: a.teacherFeedback || ''
        });
      });
    }
    if (r.exemplar && r.exemplar.trim() && calibrationSamples.length < 5) {
      calibrationSamples.push({
        studentResponse: r.exemplar.trim(),
        teacherScore: 95,
        teacherFeedback: 'Teacher-provided exemplar — full credit anchor.'
      });
    }
    const cappedSamples = calibrationSamples.slice(0, 5);

    // Skip responses that are already anchored — they have teacher scores
    // already, no need to ask AI.
    const anchoredKeys = new Set();
    anchors.forEach(a => {
      if (a.fromSubmissionIdx === idx && a.fromResponseKey) anchoredKeys.add(a.fromResponseKey);
    });
    const responseEntries = Object.entries(row.payload.responses || {})
      .filter(([k, v]) => v && String(v).trim() && !anchoredKeys.has(k));
    if (responseEntries.length === 0) {
      addToast && addToast(
        anchoredKeys.size > 0
          ? 'All responses on this submission are already anchored.'
          : 'No responses to grade in this submission.',
        'warn'
      );
      return;
    }
    setGradingRow(idx);
    // Pre-populate anchored responses' grades so they show in the row
    setGrades(prev => {
      const rowGrades = { ...(prev[idx] || {}) };
      anchors.forEach(a => {
        if (a.fromSubmissionIdx === idx && a.fromResponseKey) {
          rowGrades[a.fromResponseKey] = {
            score: a.teacherScore,
            status: 'correct',
            feedback: '📌 Teacher-anchored: ' + (a.teacherFeedback || '(no note)')
          };
        }
      });
      return { ...prev, [idx]: rowGrades };
    });
    let ok = 0, fail = 0;
    for (let i = 0; i < responseEntries.length; i++) {
      const [key, value] = responseEntries[i];
      try {
        const result = await QH.gradeFreeformAnswerWithCalibration({
          rubric: rubricText,
          context: r.context || row.payload.docTitle || '',
          studentResponse: String(value),
          calibrationSamples: cappedSamples,
          callGemini: callGemini,
        });
        setGrades(prev => ({
          ...prev,
          [idx]: { ...(prev[idx] || {}), [key]: result }
        }));
        if (result.status !== 'error') ok++; else fail++;
      } catch (err) {
        setGrades(prev => ({
          ...prev,
          [idx]: { ...(prev[idx] || {}), [key]: { status: 'error', feedback: err.message || 'Grader failed', score: 0 } }
        }));
        fail++;
      }
    }
    setGradingRow(null);
    addToast && addToast(
      'Graded ' + ok + ' response' + (ok === 1 ? '' : 's') + (fail > 0 ? ', ' + fail + ' failed' : ''),
      fail > 0 ? 'warn' : 'success'
    );
  };
  // ── Anchor management (Phase 3 v2: multi-anchor few-shot) ──────
  const openAnchorForm = (submissionIdx, responseKey, responseText) => {
    setPendingAnchor({ submissionIdx, responseKey, responseText, score: 95, feedback: '' });
  };
  const cancelPendingAnchor = () => setPendingAnchor(null);
  const confirmPendingAnchor = () => {
    if (!pendingAnchor) return;
    const score = Math.max(0, Math.min(100, parseInt(pendingAnchor.score, 10) || 0));
    setAnchors(prev => [...prev, {
      studentResponse: pendingAnchor.responseText,
      teacherScore: score,
      teacherFeedback: pendingAnchor.feedback || '',
      fromSubmissionIdx: pendingAnchor.submissionIdx,
      fromResponseKey: pendingAnchor.responseKey,
    }]);
    setPendingAnchor(null);
    addToast && addToast('Anchor added (' + score + '/100). It will calibrate every future grading run.', 'success');
  };
  const removeAnchor = (i) => {
    setAnchors(prev => prev.filter((_, idx) => idx !== i));
  };
  const clearAnchors = () => {
    if (anchors.length === 0) return;
    setAnchors([]);
    addToast && addToast('Cleared ' + anchors.length + ' calibration anchor' + (anchors.length === 1 ? '' : 's') + '.', 'info');
  };
  const isResponseAnchored = (submissionIdx, responseKey) => {
    return anchors.some(a => a.fromSubmissionIdx === submissionIdx && a.fromResponseKey === responseKey);
  };
  const getAnchorScore = (submissionIdx, responseKey) => {
    const a = anchors.find(a2 => a2.fromSubmissionIdx === submissionIdx && a2.fromResponseKey === responseKey);
    return a ? a.teacherScore : null;
  };

  const saveRowToGradebook = (idx) => {
    const row = queue[idx];
    if (!row || row.status !== 'decrypted' || !row.payload) return;
    const rowGrades = grades[idx] || {};
    if (Object.keys(rowGrades).length === 0) {
      addToast && addToast('Grade the responses first.', 'warn');
      return;
    }
    try {
      const existing = JSON.parse(localStorage.getItem('alloflow_offline_grades') || '{}');
      const nickname = row.payload.nickname || 'unknown';
      const docTitle = row.payload.docTitle || 'untitled';
      const className = (classKeyMeta && classKeyMeta.className) || '';
      const submissionKey = nickname + '|' + docTitle + '|' + (row.payload.timestamp || '');
      existing[submissionKey] = {
        nickname: nickname,
        docTitle: docTitle,
        className: className,
        submittedAt: row.payload.timestamp,
        gradedAt: new Date().toISOString(),
        source: 'offline-html',
        responses: row.payload.responses,
        grades: rowGrades,
        rubric: (rubrics[idx] && rubrics[idx].rubric) || '',
      };
      localStorage.setItem('alloflow_offline_grades', JSON.stringify(existing));
      addToast && addToast('Saved ' + nickname + '\'s submission to local gradebook.', 'success');
    } catch (err) {
      addToast && addToast('Could not save: ' + err.message, 'error');
    }
  };
  const scoreColor = (score) => {
    if (typeof score !== 'number') return { bg: '#f1f5f9', color: '#475569' };
    if (score >= 85) return { bg: '#dcfce7', color: '#166534' };
    if (score >= 65) return { bg: '#fef3c7', color: '#92400e' };
    if (score >= 40) return { bg: '#fed7aa', color: '#9a3412' };
    return { bg: '#fee2e2', color: '#991b1b' };
  };

  const rosterBadge = (status) => {
    const styles = {
      known: { bg: '#dcfce7', color: '#166534', label: '✓ Roster match' },
      unknown: { bg: '#fef3c7', color: '#92400e', label: '⚠ Unknown name' }
    };
    const s = styles[status];
    return /*#__PURE__*/React.createElement('span', {
      style: {
        display: 'inline-block', padding: '2px 8px', borderRadius: 999,
        background: s.bg, color: s.color, fontSize: '0.7rem', fontWeight: 600
      }
    }, s.label);
  };

  // ── Render ──────────────────────────────────────────────────
  return /*#__PURE__*/React.createElement('div', {
    role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Submission inbox',
    style: {
      position: 'fixed', inset: 0, zIndex: 270,
      background: 'rgba(15,23,42,0.8)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
    }
  },
    /*#__PURE__*/React.createElement('div', {
      style: {
        background: 'white', borderRadius: 16, boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
        width: '100%', maxWidth: 980, maxHeight: '90vh', display: 'flex', flexDirection: 'column',
        border: '2px solid #c7d2fe', overflow: 'hidden', position: 'relative'
      }
    },
      // Header
      /*#__PURE__*/React.createElement('div', { style: { padding: '18px 22px', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } },
        /*#__PURE__*/React.createElement('div', null,
          /*#__PURE__*/React.createElement('h2', { style: { margin: 0, fontSize: '1.2rem', fontWeight: 900, color: '#1e293b', display: 'flex', alignItems: 'center', gap: 8 } },
            '📥 Import student submissions'
          ),
          /*#__PURE__*/React.createElement('p', { style: { margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b' } },
            'Load your class key, then drop in the encrypted .alloflow.html files students sent you.'
          )
        ),
        /*#__PURE__*/React.createElement('button', {
          type: 'button', onClick: onClose,
          style: { padding: '6px 10px', border: 'none', background: 'transparent', color: '#475569', cursor: 'pointer', fontSize: '1.4rem', lineHeight: 1, borderRadius: 6 },
          'aria-label': 'Close'
        }, '×')
      ),

      // Body
      /*#__PURE__*/React.createElement('div', { style: { flex: 1, overflowY: 'auto', padding: '18px 22px' } },
        // Step 1: class key
        /*#__PURE__*/React.createElement('div', { style: { background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: '14px 16px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('div', null,
              /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#1e3a8a', marginBottom: 2 } }, '1. Class key file'),
              privateJwk
                ? /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#1e40af' } },
                    '✓ Loaded',
                    classKeyMeta?.className ? ' for "' + classKeyMeta.className + '"' : '',
                    classKeyMeta?.createdAt ? ' (created ' + classKeyMeta.createdAt.slice(0, 10) + ')' : ''
                  )
                : /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#64748b' } },
                    'Pick the class-key_*.alloflow file you saved when setting up offline submissions.'
                  )
            ),
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: () => keyInputRef.current?.click(),
              style: { padding: '8px 16px', background: privateJwk ? '#f1f5f9' : '#2563eb', color: privateJwk ? '#475569' : 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }
            }, privateJwk ? '🔁 Load different key' : '🔑 Load class key')
          ),
          /*#__PURE__*/React.createElement('input', {
            ref: keyInputRef, type: 'file', accept: '.alloflow,application/json',
            onChange: handleKeyFile, style: { display: 'none' }, 'aria-label': 'Class key file'
          })
        ),

        // Step 2: submission files
        /*#__PURE__*/React.createElement('div', { style: { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', marginBottom: 14, opacity: privateJwk ? 1 : 0.55 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('div', null,
              /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#166534', marginBottom: 2 } }, '2. Student submission files'),
              /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#475569' } },
                queue.length === 0
                  ? 'Select one or more .alloflow.html files (the encrypted submissions students saved).'
                  : (queue.length + ' file' + (queue.length === 1 ? '' : 's') + ' loaded · ' +
                     (counts.decrypted || 0) + ' decrypted · ' +
                     (counts.pending || 0) + ' pending · ' +
                     (counts.error || 0) + ' error')
              )
            ),
            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8 } },
              /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: () => subInputRef.current?.click(), disabled: !privateJwk,
                style: { padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: privateJwk ? 'pointer' : 'not-allowed', fontSize: '0.88rem', opacity: privateJwk ? 1 : 0.5 }
              }, '＋ Add submissions'),
              queue.length > 0 && /*#__PURE__*/React.createElement('button', {
                type: 'button', onClick: clearQueue,
                style: { padding: '8px 12px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem' }
              }, 'Clear')
            )
          ),
          /*#__PURE__*/React.createElement('input', {
            ref: subInputRef, type: 'file', accept: '.html,.alloflow.html,text/html', multiple: true,
            onChange: handleSubmissionFiles, style: { display: 'none' }, 'aria-label': 'Submission files'
          })
        ),

        // Calibration anchors panel — visible whenever the queue has decrypted rows
        (counts.decrypted || 0) > 0 && /*#__PURE__*/React.createElement('div', { style: { background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: anchorsPanelOpen ? '12px 16px' : '8px 14px', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button',
              onClick: () => setAnchorsPanelOpen(!anchorsPanelOpen),
              style: { display: 'inline-flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, fontWeight: 700, color: '#92400e', fontSize: '0.9rem' }
            },
              '📌 Calibration anchors (' + anchors.length + ')',
              /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.75rem', fontWeight: 600, color: '#b45309' } }, anchorsPanelOpen ? '▾' : '▸')
            ),
            /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.78rem', color: '#92400e' } },
              anchors.length === 0
                ? 'Tap 📌 on any decrypted response to teach the AI your scoring direction.'
                : 'Each AI grading run will use these ' + anchors.length + ' anchor' + (anchors.length === 1 ? '' : 's') + ' as few-shot examples.'
            )
          ),
          anchorsPanelOpen && /*#__PURE__*/React.createElement('div', { style: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #fde68a' } },
            anchors.length === 0
              ? /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#92400e', fontStyle: 'italic' } },
                  'No anchors yet. Anchors are individual student responses you score by hand; the AI uses them as calibration examples when grading every other response. 3-5 anchors that span the score range usually gives the best results.'
                )
              : /*#__PURE__*/React.createElement('div', null,
                  anchors.map((a, i) => /*#__PURE__*/React.createElement('div', { key: i, style: { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', background: 'white', borderRadius: 6, marginBottom: 6, border: '1px solid #fde68a' } },
                    /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', minWidth: 48, padding: '2px 8px', borderRadius: 999, background: scoreColor(a.teacherScore).bg, color: scoreColor(a.teacherScore).color, fontWeight: 700, fontSize: '0.8rem', textAlign: 'center', flexShrink: 0 } }, a.teacherScore + '/100'),
                    /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                      /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.85rem', color: '#1e293b' } }, String(a.studentResponse).slice(0, 180) + (a.studentResponse.length > 180 ? '…' : '')),
                      a.teacherFeedback && /*#__PURE__*/React.createElement('div', { style: { marginTop: 4, fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic' } }, '"' + a.teacherFeedback + '"')
                    ),
                    /*#__PURE__*/React.createElement('button', {
                      type: 'button',
                      onClick: () => removeAnchor(i),
                      title: 'Remove this anchor',
                      style: { padding: '2px 8px', background: 'transparent', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer', flexShrink: 0 }
                    }, '✗')
                  )),
                  /*#__PURE__*/React.createElement('div', { style: { marginTop: 8, fontSize: '0.78rem', color: '#92400e' } },
                    /*#__PURE__*/React.createElement('button', {
                      type: 'button',
                      onClick: clearAnchors,
                      style: { padding: '4px 10px', background: 'transparent', color: '#92400e', border: '1px solid #fde68a', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', marginRight: 8 }
                    }, 'Clear all'),
                    /*#__PURE__*/React.createElement('span', { style: { color: '#b45309' } },
                      'Tip: anchor responses spanning the full score range (e.g. one 95, one 70, one 40) for the most accurate AI calibration.'
                    )
                  )
                )
          )
        ),

        // Step 3: decrypt action
        privateJwk && queue.length > 0 && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 } },
          /*#__PURE__*/React.createElement('button', {
            type: 'button', onClick: handleDecryptAll, disabled: decryptingAll || (counts.pending || 0) === 0,
            style: {
              padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 10,
              fontWeight: 700, fontSize: '0.95rem',
              cursor: (decryptingAll || (counts.pending || 0) === 0) ? 'not-allowed' : 'pointer',
              opacity: (decryptingAll || (counts.pending || 0) === 0) ? 0.6 : 1
            }
          }, decryptingAll ? 'Decrypting…' : '🔓 Decrypt all ' + (counts.pending ? '(' + counts.pending + ')' : '')),
          /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.85rem', color: '#64748b' } },
            'Each submission is decrypted in your browser. Nothing leaves this device.'
          )
        ),

        // Queue table
        queue.length === 0
          ? /*#__PURE__*/React.createElement('div', { style: { padding: '40px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '0.95rem', border: '2px dashed #e2e8f0', borderRadius: 12 } },
              'No submissions loaded yet. Load your class key, then add files.'
            )
          : /*#__PURE__*/React.createElement('div', { style: { border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' } },
              /*#__PURE__*/React.createElement('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' } },
                /*#__PURE__*/React.createElement('thead', null,
                  /*#__PURE__*/React.createElement('tr', { style: { background: '#f8fafc', borderBottom: '1px solid #e2e8f0' } },
                    /*#__PURE__*/React.createElement('th', { style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Nickname'),
                    /*#__PURE__*/React.createElement('th', { style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Document'),
                    /*#__PURE__*/React.createElement('th', { style: { textAlign: 'left', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, 'Status'),
                    /*#__PURE__*/React.createElement('th', { style: { textAlign: 'right', padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.05em' } }, '')
                  )
                ),
                /*#__PURE__*/React.createElement('tbody', null,
                  queue.map((row, idx) => /*#__PURE__*/React.createElement(React.Fragment, { key: idx },
                    /*#__PURE__*/React.createElement('tr', { style: { borderBottom: '1px solid #f1f5f9' } },
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px' } },
                        /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#1e293b' } }, row.nickname),
                        row.nickname !== '?' && rosterBadge(rosterStatus(row.nickname))
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px', color: '#475569' } },
                        /*#__PURE__*/React.createElement('div', null, row.docTitle || row.fileName),
                        row.timestamp && /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.75rem', color: '#94a3b8' } }, new Date(row.timestamp).toLocaleString())
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px' } },
                        statusBadge(row.status),
                        row.status === 'error' && /*#__PURE__*/React.createElement('div', { style: { marginTop: 4, fontSize: '0.75rem', color: '#991b1b' } }, row.error)
                      ),
                      /*#__PURE__*/React.createElement('td', { style: { padding: '10px 12px', textAlign: 'right' } },
                        row.status === 'decrypted' && /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: () => setExpandedRow(expandedRow === idx ? null : idx),
                          style: { marginRight: 6, padding: '4px 10px', background: '#eef2ff', color: '#3730a3', border: '1px solid #c7d2fe', borderRadius: 6, fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }
                        }, expandedRow === idx ? 'Hide' : 'View'),
                        /*#__PURE__*/React.createElement('button', {
                          type: 'button', onClick: () => removeRow(idx),
                          style: { padding: '4px 10px', background: 'transparent', color: '#94a3b8', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.78rem', cursor: 'pointer' }
                        }, 'Remove')
                      )
                    ),
                    expandedRow === idx && row.payload && /*#__PURE__*/React.createElement('tr', null,
                      /*#__PURE__*/React.createElement('td', { colSpan: 4, style: { padding: 0 } },
                        /*#__PURE__*/React.createElement('div', { style: { background: '#fafafa', padding: '12px 16px', borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0' } },
                          /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                            'Decrypted responses (' + Object.keys(row.payload.responses || {}).length + ')'
                          ),
                          Object.keys(row.payload.responses || {}).length === 0
                            ? /*#__PURE__*/React.createElement('div', { style: { fontStyle: 'italic', color: '#94a3b8', fontSize: '0.85rem' } }, 'No responses captured.')
                            : Object.entries(row.payload.responses).map(([k, v], i) => {
                                const g = (grades[idx] || {})[k];
                                const sc = g ? scoreColor(g.score) : null;
                                const isAnchored = isResponseAnchored(idx, k);
                                const anchorScore = getAnchorScore(idx, k);
                                return /*#__PURE__*/React.createElement('div', { key: i, style: { marginBottom: 8, padding: '6px 8px', borderRadius: 6, background: isAnchored ? '#fef3c7' : (g ? 'white' : 'transparent'), border: isAnchored ? '1.5px solid #f59e0b' : (g ? '1px solid #e2e8f0' : 'none') } },
                                  /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: '0.85rem', marginBottom: g || isAnchored ? 4 : 0 } },
                                    /*#__PURE__*/React.createElement('div', { style: { flex: 1, minWidth: 0 } },
                                      /*#__PURE__*/React.createElement('code', { style: { fontSize: '0.72rem', color: '#94a3b8', marginRight: 6 } }, k.length > 40 ? k.slice(0, 40) + '…' : k),
                                      /*#__PURE__*/React.createElement('span', { style: { color: '#1e293b' } }, String(v).slice(0, 300))
                                    ),
                                    String(v).trim() && (
                                      isAnchored
                                        ? /*#__PURE__*/React.createElement('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, background: '#fde68a', color: '#92400e', fontWeight: 700, fontSize: '0.72rem', flexShrink: 0 } },
                                            '📌 Anchor ' + anchorScore + '/100'
                                          )
                                        : /*#__PURE__*/React.createElement('button', {
                                            type: 'button',
                                            onClick: () => openAnchorForm(idx, k, String(v)),
                                            title: 'Mark this response as a calibration anchor. The AI will use it as an example to match your scoring.',
                                            style: { padding: '2px 8px', background: '#fffbeb', color: '#92400e', border: '1px solid #fcd34d', borderRadius: 999, fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }
                                          }, '📌 Anchor')
                                    )
                                  ),
                                  g && /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, fontSize: '0.78rem' } },
                                    /*#__PURE__*/React.createElement('span', { style: { display: 'inline-block', padding: '2px 8px', borderRadius: 999, background: sc.bg, color: sc.color, fontWeight: 700 } }, (typeof g.score === 'number' ? g.score : '–') + '/100'),
                                    /*#__PURE__*/React.createElement('span', { style: { color: '#475569', fontStyle: 'italic' } }, g.feedback || '')
                                  )
                                );
                              }),
                          // Rubric / Grade-with-AI section
                          Object.keys(row.payload.responses || {}).length > 0 && /*#__PURE__*/React.createElement('div', { style: { marginTop: 14, paddingTop: 12, borderTop: '1px dashed #cbd5e1' } },
                            /*#__PURE__*/React.createElement('div', { style: { fontWeight: 700, color: '#475569', fontSize: '0.8rem', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' } },
                              '🎯 AI Grade with rubric'
                            ),
                            /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } }, 'Rubric (what full credit looks like) *'),
                            /*#__PURE__*/React.createElement('textarea', {
                              value: (rubrics[idx] && rubrics[idx].rubric) || '',
                              onChange: e => updateRubric(idx, { rubric: e.target.value }),
                              placeholder: 'e.g., "Explains the main idea in their own words, cites at least one detail from the text, uses complete sentences."',
                              rows: 3,
                              style: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } }, 'Assignment context (optional)'),
                            /*#__PURE__*/React.createElement('input', {
                              type: 'text',
                              value: (rubrics[idx] && rubrics[idx].context) || '',
                              onChange: e => updateRubric(idx, { context: e.target.value }),
                              placeholder: 'e.g., "Reading response to chapter 3"',
                              style: { width: '100%', padding: '6px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.78rem', color: '#475569', fontWeight: 600, marginBottom: 4 } },
                              'Quick exemplar (optional) ',
                              /*#__PURE__*/React.createElement('span', { style: { fontWeight: 400, color: '#94a3b8', fontSize: '0.75rem' } },
                                anchors.length > 0
                                  ? '— ' + anchors.length + ' calibration anchor' + (anchors.length === 1 ? '' : 's') + ' active (📌 panel above). Anchors apply across all submissions; this exemplar adds one more locally.'
                                  : '— or tap 📌 on a real student response above to anchor it (multi-anchor calibration).'
                              )
                            ),
                            /*#__PURE__*/React.createElement('textarea', {
                              value: (rubrics[idx] && rubrics[idx].exemplar) || '',
                              onChange: e => updateRubric(idx, { exemplar: e.target.value }),
                              placeholder: 'Paste an example of a 95/100 response so the AI matches your scoring.',
                              rows: 2,
                              style: { width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 8 }
                            }),
                            /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, alignItems: 'center' } },
                              /*#__PURE__*/React.createElement('button', {
                                type: 'button',
                                onClick: () => gradeRow(idx),
                                disabled: gradingRow === idx,
                                style: { padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: gradingRow === idx ? 'wait' : 'pointer', opacity: gradingRow === idx ? 0.6 : 1 }
                              }, gradingRow === idx ? 'Grading…' : '🎯 Grade responses'),
                              Object.keys(grades[idx] || {}).length > 0 && /*#__PURE__*/React.createElement('button', {
                                type: 'button',
                                onClick: () => saveRowToGradebook(idx),
                                style: { padding: '8px 16px', background: '#16a34a', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }
                              }, '💾 Save to gradebook'),
                              Object.keys(grades[idx] || {}).length > 0 && /*#__PURE__*/React.createElement('span', { style: { fontSize: '0.78rem', color: '#64748b' } },
                                'Avg: ' + Math.round(Object.values(grades[idx]).reduce((s, g) => s + (g.score || 0), 0) / Object.values(grades[idx]).length) + '/100'
                              )
                            )
                          )
                        )
                      )
                    )
                  ))
                )
              )
            )
      ),

      // Footer
      /*#__PURE__*/React.createElement('div', { style: { padding: '14px 22px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 } },
        /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.8rem', color: '#64748b' } },
          (counts.decrypted || 0) > 0
            ? 'Click "View" on a row to grade it with an AI rubric and save the result to your local gradebook.'
            : 'Decrypt the queue to see student responses.'
        ),
        /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8 } },
          /*#__PURE__*/React.createElement('button', {
            type: 'button', onClick: onClose,
            style: { padding: '8px 18px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.9rem' }
          }, 'Close')
        )
      ),

      // Pending anchor inline form (nested overlay)
      pendingAnchor && /*#__PURE__*/React.createElement('div', {
        role: 'dialog', 'aria-modal': 'true', 'aria-label': 'Score this response as a calibration anchor',
        style: { position: 'absolute', inset: 0, background: 'rgba(15,23,42,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, zIndex: 10 }
      },
        /*#__PURE__*/React.createElement('div', { style: { background: 'white', borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.25)', maxWidth: 540, width: '100%', padding: '20px 24px', border: '2px solid #fde68a' } },
          /*#__PURE__*/React.createElement('h3', { style: { margin: '0 0 8px 0', fontSize: '1.05rem', fontWeight: 800, color: '#92400e' } }, '📌 Anchor this response'),
          /*#__PURE__*/React.createElement('p', { style: { margin: '0 0 12px 0', fontSize: '0.85rem', color: '#64748b' } },
            'Give this response a score. The AI will use it as a calibration example when grading every other response.'
          ),
          /*#__PURE__*/React.createElement('div', { style: { background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px', marginBottom: 14, fontSize: '0.85rem', color: '#1e293b', maxHeight: 120, overflowY: 'auto' } },
            /*#__PURE__*/React.createElement('div', { style: { fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', fontWeight: 700, marginBottom: 4 } }, 'Student response'),
            pendingAnchor.responseText
          ),
          /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 } }, 'Score (0-100)'),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 } },
            /*#__PURE__*/React.createElement('input', {
              type: 'range', min: 0, max: 100, step: 5,
              value: pendingAnchor.score,
              onChange: e => setPendingAnchor({ ...pendingAnchor, score: e.target.value }),
              style: { flex: 1 }
            }),
            /*#__PURE__*/React.createElement('input', {
              type: 'number', min: 0, max: 100,
              value: pendingAnchor.score,
              onChange: e => setPendingAnchor({ ...pendingAnchor, score: e.target.value }),
              style: { width: 70, padding: '4px 8px', border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.9rem', textAlign: 'center' }
            })
          ),
          /*#__PURE__*/React.createElement('label', { style: { display: 'block', fontSize: '0.8rem', fontWeight: 700, color: '#475569', marginBottom: 4 } }, 'Note (optional — tells the AI why this got that score)'),
          /*#__PURE__*/React.createElement('textarea', {
            value: pendingAnchor.feedback,
            onChange: e => setPendingAnchor({ ...pendingAnchor, feedback: e.target.value }),
            placeholder: 'e.g., "Clear evidence + reasoning, but missed the counter-argument."',
            rows: 2,
            style: { width: '100%', padding: 8, border: '1px solid #cbd5e1', borderRadius: 6, fontSize: '0.85rem', fontFamily: 'inherit', resize: 'vertical', marginBottom: 16 }
          }),
          /*#__PURE__*/React.createElement('div', { style: { display: 'flex', gap: 8, justifyContent: 'flex-end' } },
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: cancelPendingAnchor,
              style: { padding: '8px 16px', background: '#f1f5f9', color: '#475569', border: '1px solid #cbd5e1', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: '0.88rem' }
            }, 'Cancel'),
            /*#__PURE__*/React.createElement('button', {
              type: 'button', onClick: confirmPendingAnchor,
              style: { padding: '8px 16px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: '0.88rem' }
            }, '📌 Add anchor')
          )
        )
      )
    )
  );
}
