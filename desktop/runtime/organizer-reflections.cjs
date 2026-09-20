'use strict';
// Private reflection data is attached to the runtime session entry, never entry.data.
// It expires/deletes with that session and is absent from session snapshots/SSE.
const crypto = require('node:crypto');
const MAX_SESSION_BYTES = 6 * 1024 * 1024;
const MAX_TOTAL_BYTES = 24 * 1024 * 1024;
const fail = (statusCode, message) => { const error = new Error(message); error.statusCode = statusCode; throw error; };
const text = (value, max) => typeof value === 'string' && value.length <= max;
const clone = value => JSON.parse(JSON.stringify(value));
const stringItem = item => typeof item === 'string' ? item : String(item?.text || item?.label || item?.name || '');
function fieldsOf(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 6) fail(400, 'A reflection needs one to six response fields.');
  const ids = new Set();
  const fields = value.map(field => {
    if (!field || Object.keys(field).some(key => !['id', 'label', 'text'].includes(key)) || !text(field.id, 40) || !/^[a-z][a-z0-9_-]*$/i.test(field.id) || ids.has(field.id) || !text(field.label, 120) || !text(field.text, 2000)) fail(400, 'A reflection field is invalid or too long.');
    ids.add(field.id); return { id: field.id, label: field.label, text: field.text.trim() };
  });
  if (!fields.some(field => field.text)) fail(400, 'Add your own response before submitting.');
  return fields;
}
function diagramOf(resource) {
  const data = resource?.data || {};
  return { id: String(resource.id), title: String(resource.title || data.main || 'Visual organizer').slice(0, 200), structureType: String(data.structureType || '').slice(0, 80), main: String(data.main || '').slice(0, 2000), branches: (Array.isArray(data.branches) ? data.branches : []).slice(0, 24).map(branch => ({ title: String(branch?.title || '').slice(0, 200), items: (Array.isArray(branch?.items) ? branch.items : []).slice(0, 24).map(item => stringItem(item).slice(0, 2000)) })) };
}
function publicRecord(record) { const { ownerToken, ...safe } = record; return clone(safe); }
function createOrganizerReflectionStore({ sessions, compact }) {
  function session(code) { compact(); const entry = sessions.get(code); if (!entry) fail(404, 'This class session has ended or expired.'); return entry; }
  function capacity(entry, next) {
    const bytes = Buffer.byteLength(JSON.stringify(next));
    if (next.length > 1000 || bytes > MAX_SESSION_BYTES) fail(413, 'The reflection inbox is full. Ask your teacher to export the work and start a new session.');
    let total = bytes;
    for (const other of sessions.values()) if (other !== entry) total += Buffer.byteLength(JSON.stringify(other.organizerReflections || []));
    if (total > MAX_TOTAL_BYTES) fail(413, 'The reflection inbox is full. Ask your teacher to export the work and end older sessions.');
  }
  return {
    captureLaunch(code) {
      const entry = session(code), active = entry.data?.interactiveOrganizer;
      if (active?.type !== 'reflection' || entry.organizerReflectionLaunch?.activityId === active.activityId) return;
      const resource = (Array.isArray(entry.data.resources) ? entry.data.resources : []).find(item => String(item?.id) === String(active.resourceId));
      entry.organizerReflectionLaunch = resource?.data ? { activityId: active.activityId, diagram: diagramOf(resource) } : null;
    },
    list(code, auth) {
      const entry = session(code);
      if (auth && !auth.uid) fail(403, 'Join the class roster before opening reflections.');
      return { reflections: (entry.organizerReflections || []).filter(record => !auth || (record.uid === auth.uid && record.ownerToken === auth.jti)).map(publicRecord), expiresAt: entry.expiresAt };
    },
    submit(code, auth, value) {
      const entry = session(code);
      if (!auth?.uid || !auth.jti || !entry.data?.roster?.[auth.uid]) fail(403, 'Join the class roster before submitting.');
      if (!value || Object.keys(value).some(key => !['version', 'resourceId', 'structureType', 'activityId', 'revision', 'submittedAt', 'fields'].includes(key)) || value.version !== 1 || !text(value.activityId, 160) || !text(value.resourceId, 160)) fail(400, 'The reflection submission is invalid.');
      const fields = fieldsOf(value.fields), records = entry.organizerReflections || [];
      // Tokens are bound by the existing LAN join. Written work additionally belongs
      // to that exact connection, so a fresh token claiming the same uid cannot read it.
      if (records.some(record => record.uid === auth.uid && record.ownerToken !== auth.jti)) fail(403, 'Return using your original class connection to revise this work.');
      const prior = records.filter(record => record.uid === auth.uid && record.activityId === value.activityId);
      const last = prior.at(-1);
      if (last && last.resourceId === value.resourceId && JSON.stringify(last.fields) === JSON.stringify(fields)) return { reflection: publicRecord(last), duplicate: true };
      const active = entry.data?.interactiveOrganizer;
      if (entry.data?.isActive === false || active?.type !== 'reflection' || active.activityId !== value.activityId || String(active.resourceId) !== value.resourceId) fail(409, 'This live reflection has ended or changed. Your draft is still saved.');
      const resource = (entry.data.resources || []).find(item => String(item?.id) === value.resourceId);
      if (!resource?.data) fail(409, 'The matching diagram is still being delivered. Try again shortly.');
      if (prior.length >= 20) fail(409, 'This activity already has 20 saved revisions. Ask your teacher to start a new reflection.');
      const record = { id: crypto.randomUUID(), uid: auth.uid, ownerToken: auth.jti, studentName: String(entry.data.roster[auth.uid].name || 'Learner').slice(0, 80), activityId: value.activityId, resourceId: value.resourceId, revision: (last?.revision || 0) + 1, submittedAt: Date.now(), fields, diagram: last?.diagram || (entry.organizerReflectionLaunch?.activityId === value.activityId ? entry.organizerReflectionLaunch.diagram : diagramOf(resource)), feedback: null };
      const next = records.concat(record); capacity(entry, next); entry.organizerReflections = next;
      return { reflection: publicRecord(record), duplicate: false };
    },
    feedback(code, value) {
      const entry = session(code);
      if (!value || Object.keys(value).some(key => !['id', 'text', 'expectedUpdatedAt'].includes(key)) || !text(value.id, 80) || !text(value.text, 2000) || !Number.isSafeInteger(value.expectedUpdatedAt) || value.expectedUpdatedAt < 0) fail(400, 'Feedback is invalid or too long.');
      const records = entry.organizerReflections || [], index = records.findIndex(record => record.id === value.id);
      if (index < 0) fail(404, 'That reflection is no longer available.');
      const current = records[index];
      if ((current.feedback?.updatedAt || 0) !== value.expectedUpdatedAt) fail(409, 'Feedback changed in another view. Refresh and review it before saving again.');
      const record = { ...current, feedback: { text: value.text.trim(), updatedAt: Math.max(Date.now(), (current.feedback?.updatedAt || 0) + 1) } };
      const next = records.slice(); next[index] = record; capacity(entry, next); entry.organizerReflections = next;
      return { reflection: publicRecord(record) };
    },
  };
}
module.exports = { createOrganizerReflectionStore };
