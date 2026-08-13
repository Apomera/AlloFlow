'use strict';

const emptyDoc = Object.freeze({ exists: () => false, data: () => undefined, id: '', ref: null });
const emptyQuery = Object.freeze({
  docs: [],
  empty: true,
  size: 0,
  forEach: () => {},
});
const resolved = value => Promise.resolve(value);
const inertRef = (...segments) => {
  const path = segments.map(value => {
    if (typeof value === 'string') return value;
    return value && typeof value.path === 'string' ? value.path : '';
  }).filter(Boolean).join('/');
  const parts = path.split('/').filter(Boolean);
  return { path, id: parts[parts.length - 1] || '', parent: null };
};

exports.initializeApp = options => ({ name: '[DEFAULT]', options: options || {} });
exports.getAuth = app => ({ app, currentUser: null });
exports.signInAnonymously = () => resolved({ user: null });
exports.signInWithCustomToken = () => resolved({ user: null });
exports.onAuthStateChanged = (_auth, callback) => {
  queueMicrotask(() => callback(null));
  return () => {};
};
exports.initializeAppCheck = (app, options) => ({ app, options });
exports.ReCaptchaEnterpriseProvider = class ReCaptchaEnterpriseProvider {
  constructor(siteKey) { this.siteKey = siteKey; }
};
exports.getToken = () => resolved({ token: '', expireTimeMillis: Date.now() + 60000 });
exports.getFirestore = app => ({ app, type: 'firestore' });
exports.terminate = () => resolved();
exports.doc = (...segments) => inertRef(...segments);
exports.collection = (...segments) => inertRef(...segments);
exports.setDoc = () => resolved();
exports.updateDoc = () => resolved();
exports.deleteDoc = () => resolved();
exports.deleteField = () => ({ __alloflowE2EDeleteField: true });
exports.getDoc = () => resolved(emptyDoc);
exports.getDocs = () => resolved(emptyQuery);
exports.onSnapshot = (_ref, callback) => {
  queueMicrotask(() => callback(emptyDoc));
  return () => {};
};
exports.query = (ref, ...constraints) => ({ ref, constraints });
exports.where = (field, operator, value) => ({ type: 'where', field, operator, value });
exports.limit = count => ({ type: 'limit', count });
exports.writeBatch = () => {
  const batch = {
    set: () => batch,
    update: () => batch,
    delete: () => batch,
    commit: () => resolved(),
  };
  return batch;
};
exports.runTransaction = async (_db, callback) => callback({
  get: () => resolved(emptyDoc),
  set: () => {},
  update: () => {},
  delete: () => {},
});