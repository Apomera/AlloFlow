const fs = require('fs');
const src = fs.readFileSync('prismflow-deploy/src/App.jsx', 'utf8');
const lines = src.split('\n');

// Extract WebSearchProvider + AIProvider (lines 1142-2731, 1-indexed)
const wsAndAi = lines.slice(1141, 2731).join('\n');

// Build the shim factory (rewritten to plain JS, no arrow functions / optional chaining)
const shimFactory = `    // ═══════════════════════════════════════════════════════════════════
    // SECTION 1: Firebase Shim Factory
    // ═══════════════════════════════════════════════════════════════════
    // Called from App.jsx: window._alloShimInit(fbFunctions, alloDataGetter)
    // Returns an object with all 15 shim functions.
    window._alloShimInit = function(fb, getAllo) {

        // Helper: is the DataProvider active and NOT using Firebase?
        var _useShim = function() {
            var ad = getAllo();
            return ad && ad.backend !== 'firebase' && ad.backend !== 'unknown';
        };

        // doc(db, ...segments) -> returns a Firebase ref OR a shim ref
        var doc = function() {
            var args = Array.prototype.slice.call(arguments);
            if (args[0] && args[0]._isShimDb) {
                return { _alloShim: true, _segments: args.slice(1) };
            }
            if (_useShim()) {
                return { _alloShim: true, _segments: args.slice(1) };
            }
            return fb.doc.apply(null, args);
        };

        // setDoc(ref, data, options?) -> shim or Firebase
        var setDoc = async function(ref, data, options) {
            if (ref && ref._alloShim) return getAllo().setDoc(ref._segments, data, options);
            return fb.setDoc(ref, data, options);
        };

        // updateDoc(ref, data) -> shim or Firebase
        var updateDoc = async function(ref, data) {
            if (ref && ref._alloShim) return getAllo().updateDoc(ref._segments, data);
            return fb.updateDoc(ref, data);
        };

        // getDoc(ref) -> shim (returns Firebase-compatible snapshot) or Firebase
        var getDoc = async function(ref) {
            if (ref && ref._alloShim) {
                var result = await getAllo().getDoc(ref._segments);
                return {
                    exists: function() { return result !== null && result !== undefined; },
                    data: function() {
                        if (!result) return undefined;
                        var copy = Object.assign({}, result);
                        delete copy.id;
                        return copy;
                    },
                    id: (result && result.id) || ref._segments[ref._segments.length - 1],
                };
            }
            return fb.getDoc(ref);
        };

        // deleteDoc(ref) -> shim or Firebase
        var deleteDoc = async function(ref) {
            if (ref && ref._alloShim) return getAllo().deleteDoc(ref._segments);
            return fb.deleteDoc(ref);
        };

        // deleteField() -> shim sentinel or Firebase sentinel
        var deleteField = function() {
            if (_useShim()) return { __op: 'deleteField' };
            return fb.deleteField();
        };

        // onSnapshot(ref, callback, errorCallback?) -> shim or Firebase
        var onSnapshot = function(ref, callback, errorCallback) {
            if (ref && ref._alloShim) {
                return getAllo().onSnapshot(ref._segments, function(result) {
                    if (Array.isArray(result)) {
                        var snap = {
                            docs: result.map(function(r) { return {
                                id: r.id,
                                data: function() { return r; },
                                exists: function() { return true; },
                                ref: { _alloShim: true, _segments: [] },
                            }; }),
                            forEach: function(fn) { snap.docs.forEach(fn); },
                            empty: result.length === 0,
                            size: result.length,
                        };
                        callback(snap);
                    } else {
                        callback({
                            exists: function() { return result !== null && result !== undefined; },
                            data: function() {
                                if (!result) return undefined;
                                var copy = Object.assign({}, result);
                                delete copy.id;
                                return copy;
                            },
                            id: (result && result.id) || 'unknown',
                        });
                    }
                });
            }
            return fb.onSnapshot(ref, callback, errorCallback);
        };

        // collection(db, ...segments) -> shim ref or Firebase ref
        var collection = function() {
            var args = Array.prototype.slice.call(arguments);
            if (_useShim()) {
                return { _alloShim: true, _isCollection: true, _segments: args.slice(1) };
            }
            return fb.collection.apply(null, args);
        };

        // getDocs(queryOrRef) -> shim or Firebase
        var getDocs = async function(queryOrRef) {
            if (queryOrRef && queryOrRef._alloShim) {
                var constraints = queryOrRef._constraints || [];
                var results = await getAllo().getDocs(queryOrRef._segments, constraints);
                return {
                    docs: (results || []).map(function(r) { return {
                        id: r.id,
                        data: function() { return r; },
                        exists: function() { return true; },
                        ref: { _alloShim: true, _segments: queryOrRef._segments.concat([r.id]) },
                    }; }),
                    forEach: function(fn) { this.docs.forEach(fn); },
                    empty: !results || results.length === 0,
                    size: (results && results.length) || 0,
                };
            }
            return fb.getDocs(queryOrRef);
        };

        // query(collectionRef, ...constraints) -> augmented ref or Firebase query
        var query = function(collectionRef) {
            var constraints = Array.prototype.slice.call(arguments, 1);
            if (collectionRef && collectionRef._alloShim) {
                return Object.assign({}, collectionRef, { _constraints: constraints.filter(Boolean) });
            }
            return fb.query.apply(null, arguments);
        };

        // where(field, op, value) -> shim constraint or Firebase
        var where = function(field, op, value) {
            if (_useShim()) return { type: 'where', field: field, op: op, value: value };
            return fb.where(field, op, value);
        };

        // limit(n) -> shim constraint or Firebase
        var limit = function(n) {
            if (_useShim()) return { type: 'limit', value: n };
            return fb.limit(n);
        };

        // writeBatch(db) -> shim batch or Firebase batch
        var writeBatch = function(dbArg) {
            if (_useShim()) {
                var _ops = [];
                return {
                    set: function(ref, data, opts) { _ops.push({ type: 'set', segments: (ref && ref._segments) || [], data: data, options: opts }); },
                    update: function(ref, data) { _ops.push({ type: 'update', segments: (ref && ref._segments) || [], data: data }); },
                    delete: function(ref) { _ops.push({ type: 'delete', segments: (ref && ref._segments) || [] }); },
                    commit: function() { return getAllo().writeBatch(_ops); },
                };
            }
            return fb.writeBatch(dbArg);
        };

        // signInAnonymously(auth) -> shim or Firebase
        var signInAnonymously = async function(authArg) {
            if (_useShim()) return getAllo().signInAnonymously();
            return fb.signInAnonymously(authArg);
        };

        // onAuthStateChanged(auth, callback) -> shim or Firebase
        var onAuthStateChanged = function(authArg, callback) {
            if (_useShim()) return getAllo().onAuthStateChanged(callback);
            return fb.onAuthStateChanged(authArg, callback);
        };

        return {
            doc: doc, setDoc: setDoc, updateDoc: updateDoc, getDoc: getDoc,
            deleteDoc: deleteDoc, deleteField: deleteField, onSnapshot: onSnapshot,
            collection: collection, getDocs: getDocs, query: query, where: where,
            limit: limit, writeBatch: writeBatch, signInAnonymously: signInAnonymously,
            onAuthStateChanged: onAuthStateChanged
        };
    };`;

const header = `/**
 * ai_backend_module.js — AlloFlow AI Backend (CDN Module)
 *
 * Contains: Firebase Shim Factory, WebSearchProvider, AIProvider
 * Loaded via <script> tag before the React bundle.
 *
 * Copyright (C) 2026 Aaron Pomeranz, PsyD
 * Licensed under GNU AGPL v3 (same as AlloFlow core)
 */
(function() {
    'use strict';

    // ─── Duplicate-load guard ─────────────────────────────────────────
    if (window.__aiBackendModuleLoaded) return;
    window.__aiBackendModuleLoaded = true;

`;

const footer = `

    console.log('[AI Backend Module] Loaded: WebSearchProvider + AIProvider + Firebase Shim Factory');
})();
`;

const module = header + shimFactory + '\n\n    // ═══════════════════════════════════════════════════════════════════\n    // SECTION 2: WebSearchProvider + SECTION 3: AIProvider\n    // ═══════════════════════════════════════════════════════════════════\n\n' + wsAndAi + footer;

fs.writeFileSync('ai_backend_module.js', module, 'utf8');
fs.writeFileSync('prismflow-deploy/public/ai_backend_module.js', module, 'utf8');
console.log('Created ai_backend_module.js (' + module.split('\n').length + ' lines)');
